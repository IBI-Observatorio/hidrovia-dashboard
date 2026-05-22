// Modelo de recessão pós-pico de Itacoatiara (16030000) — ponto de controle
// real do calado operacional no Tabocal.
//
// Análogo ao lib/recessao-modelo.ts (Manaus) mas calibrado para Itacoatiara.
// Diferenças:
//   - k médio 0.0122 (vs 0.0183 Manaus) → recessão MAIS LENTA
//   - h_min médio 3.81m (vs 16.82m) → zero da régua local, pode ser negativo
//   - Gatilho operacional: −0,10m (referência mínima histórica)

import { RECESSAO_ITACOATIARA_CALIBRADA } from "./recessao-itacoatiara-calibrada";
import { cmrDeItacoatiara } from "./cmr-itacoatiara";

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
