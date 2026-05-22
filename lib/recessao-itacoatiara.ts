// Modelo de recessão pós-pico de Itacoatiara (16030000) — ponto de controle
// real do calado operacional no Tabocal.
//
// Análogo ao lib/recessao-modelo.ts (Manaus) mas calibrado para Itacoatiara.
// Diferenças:
//   - k médio 0.0122 (vs 0.0183 Manaus) → recessão MAIS LENTA
//   - h_min médio 3.81m (vs 16.82m) → zero da régua local, pode ser negativo
//   - Gatilho operacional: −0,10m (referência mínima histórica)

import { RECESSAO_ITACOATIARA_CALIBRADA } from "./recessao-itacoatiara-calibrada";
import { cmrDeItacoatiara, cmrAmostraIC, cotaItaParaCMR } from "./cmr-itacoatiara";
import { makeRng, randn, randMvn2 } from "./prng";

// Bias correction da validação LOO (scripts/valida-recessao-loo.mjs):
//   o modelo prevê ETA do alvo 6,30m em média 12,1 dias ANTES da observação.
//   RMSE 18,6 dias. Aplicamos +12d como bias correction no MC.
const BIAS_DIAS_ETA = 12;
const RMSE_DIAS_ETA = 18.6;

const Z80 = 1.2816;

// Gatilho operacional do Tabocal — derivado da mínima histórica recente
// (2024-10-31 = -0.17m). Calibração comercial: abaixo de -0.10m a operação
// no canal de Tabocal entra em restrição crítica.
export const GATILHO_TABOCAL_M = -0.10;

export interface PontoRecessaoItacoatiara {
  data:           string;
  t_dias:         number;
  cota_central:   number;
  cota_ic80_min:  number;
  cota_ic80_max:  number;
}

export interface ResultadoRecessaoItacoatiara {
  pontos:                  PontoRecessaoItacoatiara[];
  data_cruzamento_central: string | null;
  data_cruzamento_min:     string | null;
  data_cruzamento_max:     string | null;
  k_usado:                 number;
  h_min_usado:             number;
}

function diaMaisN(iso: string, n: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Projeta a recessão pós-pico de Itacoatiara.
 *
 * @param picoCota_m  Cota do pico em metros
 * @param picoData    Data ISO do pico
 * @param horizonte   Dias a projetar (default 220 = ~7 meses)
 * @param gatilho_m   Cota gatilho operacional (default -0.10m)
 */
export function projetaRecessaoItacoatiara(
  picoCota_m: number,
  picoData: string,
  horizonte = 220,
  gatilho_m = GATILHO_TABOCAL_M,
): ResultadoRecessaoItacoatiara {
  const { k_medio, k_sigma, h_min_medio, k_min, k_max } = RECESSAO_ITACOATIARA_CALIBRADA;

  const h_mins = RECESSAO_ITACOATIARA_CALIBRADA.ajustes_por_ano.map((a) => a.h_min);
  const mean = h_mins.reduce((a, b) => a + b, 0) / h_mins.length;
  const sigma = Math.sqrt(h_mins.reduce((a, b) => a + (b - mean) ** 2, 0) / h_mins.length);

  const k_rapido   = Math.min(k_max, k_medio + Z80 * k_sigma);
  const k_lento    = Math.max(k_min, k_medio - Z80 * k_sigma);
  const hmin_baixo = mean - Z80 * sigma;   // cenário pessimista (mínima mais funda)
  const hmin_alto  = mean + Z80 * sigma;   // cenário otimista (mínima mais alta)

  const pontos: PontoRecessaoItacoatiara[] = [];
  let cruz_central: string | null = null;
  let cruz_min:     string | null = null;
  let cruz_max:     string | null = null;

  for (let t = 0; t <= horizonte; t++) {
    const data = diaMaisN(picoData, t);
    const central     = h_min_medio  + (picoCota_m - h_min_medio)  * Math.exp(-k_medio * t);
    const cota_alta   = hmin_alto    + (picoCota_m - hmin_alto)    * Math.exp(-k_lento  * t);
    const cota_baixa  = hmin_baixo   + (picoCota_m - hmin_baixo)   * Math.exp(-k_rapido * t);

    pontos.push({
      data,
      t_dias:        t,
      cota_central:  +central.toFixed(2),
      cota_ic80_min: +cota_baixa.toFixed(2),
      cota_ic80_max: +cota_alta.toFixed(2),
    });

    if (cruz_central == null && central < gatilho_m) cruz_central = data;
    if (cruz_min     == null && cota_alta < gatilho_m) cruz_min = data;
    if (cruz_max     == null && cota_baixa < gatilho_m) cruz_max = data;
  }

  return {
    pontos,
    data_cruzamento_central: cruz_central,
    data_cruzamento_min:     cruz_min,
    data_cruzamento_max:     cruz_max,
    k_usado:                 k_medio,
    h_min_usado:             h_min_medio,
  };
}

/**
 * Versão simplificada — só a data central + banda IC80 de cruzamento.
 */
export function projetaCruzamentoTabocal(
  picoCota_m: number,
  picoData: string,
): { central: string | null; min: string | null; max: string | null } {
  const r = projetaRecessaoItacoatiara(picoCota_m, picoData, 300, GATILHO_TABOCAL_M);
  return {
    central: r.data_cruzamento_central,
    min:     r.data_cruzamento_min,
    max:     r.data_cruzamento_max,
  };
}

// ─── ETA de queda do CMR abaixo do calado-alvo ────────────────────────────────
//
// Projeta a recessão de Itacoatiara dia-a-dia e, para CADA dia, converte cota →
// CMR via curva oficial da Capitania. Retorna a primeira data em que
// CMR < calado_alvo (com banda IC80 dos cenários k_min/k_max).
//
// Esse é o sinal mais comercialmente valioso do IRC:
//   - "Para seu calado-alvo de 11m, a Capitania deve publicar CMR < 11m em
//      DD/MMM/AAAA, ou seja, em N dias."
//   - Permite planejamento de embarque com 30-180 dias de antecedência.

export interface ResultadoCruzamentoCalado {
  data_central:        string | null;       // YYYY-MM-DD ou null se não cruza no horizonte
  data_otimista:       string | null;       // cenário descida lenta (cruzamento mais tarde)
  data_pessimista:     string | null;       // cenário descida rápida (cruzamento mais cedo)
  dias_central:        number | null;       // dias desde hoje (server) até cruzamento
  dias_otimista:       number | null;
  dias_pessimista:     number | null;
  calado_alvo_m:       number;
  cota_ita_no_alvo_m:  number;              // cota ITA que produz CMR = calado_alvo (referência)
  cmr_atual:           number;              // CMR HOJE na cota mais recente projetada (t=0)
}

/**
 * Projeta a data em que o CMR cairá abaixo do calado-alvo.
 *
 * @param picoCota_m   Cota de pico de Itacoatiara (do forecast SGB)
 * @param picoData     Data ISO do pico (ex: "2026-06-15")
 * @param calado_alvo  Calado mínimo desejado pelo operador (default 11m)
 * @param horizonte    Horizonte máximo de projeção em dias (default 300 = ~10 meses)
 */
export function projetaCruzamentoCalado(
  picoCota_m: number,
  picoData: string,
  calado_alvo = 11.0,
  horizonte = 300,
): ResultadoCruzamentoCalado {
  // Reusa o modelo de recessão de cota ITA — para cada dia, converte para CMR
  const recessao = projetaRecessaoItacoatiara(picoCota_m, picoData, horizonte, -10);
  //                                                                          ^ gatilho não-aplicável aqui

  let centralDate: string | null = null;
  let otimDate:    string | null = null;
  let pessimDate:  string | null = null;

  for (const pt of recessao.pontos) {
    const cmrCentral  = cmrDeItacoatiara(pt.cota_central);
    const cmrAlta     = cmrDeItacoatiara(pt.cota_ic80_max);   // descida LENTA → cota mais alta → CMR maior
    const cmrBaixa    = cmrDeItacoatiara(pt.cota_ic80_min);   // descida RÁPIDA → cota mais baixa → CMR menor

    if (centralDate === null && cmrCentral < calado_alvo) centralDate = pt.data;
    if (otimDate    === null && cmrAlta   < calado_alvo) otimDate    = pt.data;   // tardia
    if (pessimDate  === null && cmrBaixa  < calado_alvo) pessimDate  = pt.data;   // precoce
  }

  // Inverte a banda: pessimista=precoce, otimista=tardia
  const data_pessimista = pessimDate;
  const data_otimista   = otimDate;

  // Estima cota ITA que daria CMR = calado_alvo (busca inversa na curva)
  // Para calado_alvo=11 → cota_ita ≈ 5m. Para alvo=8 → ≈ 2m.
  let cota_ref = NaN;
  for (let c = 8.0; c >= -0.2; c -= 0.05) {
    if (cmrDeItacoatiara(c) <= calado_alvo) {
      cota_ref = +c.toFixed(2);
      break;
    }
  }

  // Calcula dias desde hoje
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const dias = (iso: string | null): number | null => {
    if (!iso) return null;
    const dt = new Date(iso + "T00:00:00Z");
    return Math.round((dt.getTime() - hoje.getTime()) / 86400000);
  };

  return {
    data_central:       centralDate,
    data_otimista:      data_otimista,
    data_pessimista:    data_pessimista,
    dias_central:       dias(centralDate),
    dias_otimista:      dias(data_otimista),
    dias_pessimista:    dias(data_pessimista),
    calado_alvo_m:      calado_alvo,
    cota_ita_no_alvo_m: cota_ref,
    cmr_atual:          recessao.pontos[0] ? cmrDeItacoatiara(recessao.pontos[0].cota_central) : 0,
  };
}

// ─── MONTE CARLO END-TO-END (v3.4) ────────────────────────────────────────
//
// Auditoria estatística apontou: a banda IC80 anterior cobria apenas k e h_min
// (parcialmente). Faltavam:
//   • σ_pico (SGB publica IC80 do pico de cheia)
//   • σ_data_pico (data do pico é heurística, σ ~10 dias)
//   • σ_curva CMR (P10/P90 por bin)
//   • covariância (k, h_min) — auditor mostrou ρ ≠ 0
//   • bias correction da validação LOO
//
// Esta versão propaga TODAS as incertezas via Monte Carlo (n=10000) com seed
// fixa para reprodutibilidade.

export interface ResultadoCruzamentoCaladoMC {
  /** Banda IC80 honesta — quantis empíricos do MC */
  data_p10:           string | null;       // cruzamento precoce (10%)
  data_p50:           string | null;       // mediana
  data_p90:           string | null;       // cruzamento tardio (90%)
  dias_p10:           number | null;
  dias_p50:           number | null;
  dias_p90:           number | null;

  /** Probabilidade de cruzamento dentro do horizonte */
  prob_cruzamento:    number;

  /** Estatísticas agregadas (em dias desde hoje) */
  mediana_dias:       number | null;
  media_dias:         number | null;
  desvio_dias:        number | null;
  ic80_largura_dias:  number | null;       // p90 - p10

  /** Inputs do MC para auditoria */
  calado_alvo_m:      number;
  cota_ita_no_alvo_m: number;
  n_amostras:         number;
  n_cruzaram:         number;
  seed:               number;

  /** Banda backward-compat (mesmos nomes do ResultadoCruzamentoCalado) */
  data_central:       string | null;
  data_pessimista:    string | null;
  data_otimista:      string | null;
  dias_central:       number | null;
  dias_pessimista:    number | null;
  dias_otimista:      number | null;
  cmr_atual:          number;
}

export interface InputIncertezaMC {
  /** Cota de pico (do SGB) */
  picoCota_m:         number;
  /** σ do pico (default 0,7m — IC80 do SGB ≈ ±0,9m ÷ 1,28) */
  picoCota_sigma_m?:  number;
  /** Data ISO do pico (heurística) */
  picoData:           string;
  /** σ da data do pico em dias (default 10) */
  picoData_sigma_d?:  number;
  /** Calado-alvo */
  calado_alvo?:       number;
  /** Horizonte máximo de projeção */
  horizonte?:         number;
  /** Número de amostras MC (default 10000) */
  n_amostras?:        number;
  /** Seed PRNG (default 42) */
  seed?:              number;
  /** Aplicar bias correction da LOO? (default true) */
  aplicar_bias?:      boolean;
}

function diasDesdeHoje(iso: string | null): number | null {
  if (!iso) return null;
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const dt = new Date(iso + "T00:00:00Z");
  return Math.round((dt.getTime() - hoje.getTime()) / 86400000);
}

function dataISOemTdias(picoData: string, t: number): string {
  const d = new Date(picoData + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.round(t));
  return d.toISOString().slice(0, 10);
}

/**
 * Projeta a ETA do CMR < calado_alvo via Monte Carlo end-to-end.
 *
 * Propaga TODAS as fontes de incerteza identificadas pela auditoria:
 *   1. σ_pico (default 0,7m) — IC80 do SGB
 *   2. σ_data_pico (default 10 dias) — heurística
 *   3. (k, h_min) ~ MVN(μ, Σ) — usa Cholesky da calibração
 *   4. CMR ~ U(P10, P90) por bin — bandas observadas da Capitania
 *   5. Bias correction (+12 dias) da validação LOO
 *
 * Retorna quantis empíricos (P10, P50, P90) em vez de cenários determinísticos.
 */
export function projetaCruzamentoCaladoMC(
  input: InputIncertezaMC,
): ResultadoCruzamentoCaladoMC {
  const {
    picoCota_m,
    picoCota_sigma_m = 0.7,
    picoData,
    picoData_sigma_d = 10,
    calado_alvo = 11.0,
    horizonte = 300,
    n_amostras = 10000,
    seed = 42,
    aplicar_bias = true,
  } = input;

  const rng = makeRng(seed);
  const { k_medio, h_min_medio, cholesky_L } = RECESSAO_ITACOATIARA_CALIBRADA;
  const L = cholesky_L as [number, number, number];

  const diasCruzamento: number[] = [];
  let n_cruzaram = 0;

  for (let i = 0; i < n_amostras; i++) {
    // 1. Amostra pico ~ N(picoCota_m, σ²)
    const pico_s = picoCota_m + picoCota_sigma_m * randn(rng);

    // 2. Amostra data do pico ~ N(picoData, σ²)
    const offset_dias = Math.round(picoData_sigma_d * randn(rng));
    const picoData_s = dataISOemTdias(picoData, offset_dias);

    // 3. Amostra (k, h_min) ~ MVN(μ, Σ) via Cholesky
    const [k_s, h_min_s] = randMvn2(rng, [k_medio, h_min_medio], L);
    // proteção contra k negativo (geraria explosão)
    const k_safe = Math.max(k_s, 0.001);

    // 4. Projeta dia-a-dia, com perturbação da curva CMR por amostra (u fixo
    // por trajetória — assumimos que o erro da curva é sistemático no curto
    // prazo, não independente dia-a-dia)
    const u_cmr = rng();

    let t_cruzou: number | null = null;
    for (let t = 0; t <= horizonte; t++) {
      const cota = h_min_s + (pico_s - h_min_s) * Math.exp(-k_safe * t);
      const cmr = cmrAmostraIC(cota, u_cmr);
      if (cmr < calado_alvo) { t_cruzou = t; break; }
    }
    if (t_cruzou == null) continue;

    // 5. Bias correction da LOO (modelo adianta ETA em ~12d)
    if (aplicar_bias) t_cruzou += BIAS_DIAS_ETA;

    // Converte t (dias desde pico amostrado) para data ISO real
    const dataCruz = dataISOemTdias(picoData_s, t_cruzou);
    const diasHoje = diasDesdeHoje(dataCruz);
    if (diasHoje != null) {
      diasCruzamento.push(diasHoje);
      n_cruzaram++;
    }
  }

  if (diasCruzamento.length === 0) {
    return {
      data_p10: null, data_p50: null, data_p90: null,
      dias_p10: null, dias_p50: null, dias_p90: null,
      prob_cruzamento: 0,
      mediana_dias: null, media_dias: null, desvio_dias: null,
      ic80_largura_dias: null,
      calado_alvo_m: calado_alvo,
      cota_ita_no_alvo_m: cotaItaParaCMR(calado_alvo),
      n_amostras, n_cruzaram: 0, seed,
      data_central: null, data_pessimista: null, data_otimista: null,
      dias_central: null, dias_pessimista: null, dias_otimista: null,
      cmr_atual: 0,
    };
  }

  diasCruzamento.sort((a, b) => a - b);
  const quantil = (q: number): number => {
    const i = (diasCruzamento.length - 1) * q;
    const lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi
      ? diasCruzamento[lo]
      : diasCruzamento[lo] + (i - lo) * (diasCruzamento[hi] - diasCruzamento[lo]);
  };

  const dias_p10 = Math.round(quantil(0.10));
  const dias_p50 = Math.round(quantil(0.50));
  const dias_p90 = Math.round(quantil(0.90));
  const media = diasCruzamento.reduce((a, b) => a + b, 0) / diasCruzamento.length;
  const desvio = Math.sqrt(
    diasCruzamento.reduce((a, b) => a + (b - media) ** 2, 0) / diasCruzamento.length,
  );

  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const dataDeDias = (d: number): string => {
    const dt = new Date(hoje.getTime() + d * 86400000);
    return dt.toISOString().slice(0, 10);
  };

  // CMR atual: usa cota_pico (proxy do "hoje" no rastro do MC ainda no pico)
  // mas para semântica de UI, usa o pico médio como referência
  const cmr_atual = cmrDeItacoatiara(picoCota_m);

  return {
    data_p10:           dataDeDias(dias_p10),
    data_p50:           dataDeDias(dias_p50),
    data_p90:           dataDeDias(dias_p90),
    dias_p10,
    dias_p50,
    dias_p90,
    prob_cruzamento:    +(n_cruzaram / n_amostras).toFixed(3),
    mediana_dias:       dias_p50,
    media_dias:         +media.toFixed(1),
    desvio_dias:        +desvio.toFixed(1),
    ic80_largura_dias:  dias_p90 - dias_p10,
    calado_alvo_m:      calado_alvo,
    cota_ita_no_alvo_m: cotaItaParaCMR(calado_alvo),
    n_amostras,
    n_cruzaram,
    seed,
    // Backward-compat: mapeia P50→central, P10→pessimista, P90→otimista
    data_central:       dataDeDias(dias_p50),
    data_pessimista:    dataDeDias(dias_p10),
    data_otimista:      dataDeDias(dias_p90),
    dias_central:       dias_p50,
    dias_pessimista:    dias_p10,
    dias_otimista:      dias_p90,
    cmr_atual,
  };
}
