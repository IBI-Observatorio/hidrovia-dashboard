// Forecasting da ETA do CMR < calado_alvo por ANÁLOGOS HISTÓRICOS.
//
// Filosofia oposta ao Monte Carlo paramétrico:
//   - MC v3.4 propaga σ_pico, σ_data, MVN(k, h_min), banda CMR — incertezas
//     ASSUMIDAS via distribuições paramétricas.
//   - Análogos NÃO assumem distribuição. Comparam a trajetória ITA observada
//     contra cada ano histórico (2016-2025) e usam a distribuição empírica
//     dos cruzamentos passados, ponderada por similaridade.
//
// Vantagem: incerteza FECHA conforme mais dias de 2026 entram (cada ponto novo
// elimina análogos discordantes). MC tem incerteza constante.
//
// Algoritmo:
//   1. Toma os últimos N dias da série ITA 2026 (janela_match).
//   2. Para cada ano y ∈ {2016..2025}: extrai o mesmo intervalo DOY em y.
//   3. Calcula RMSE(2026, y) na janela.
//   4. Encontra t_y = dia em que cota_y cruzou cota_alvo (se cruzou).
//   5. Pondera por kernel exponencial w_y = exp(−RMSE / largura_kernel).
//   6. Retorna quantis ponderados P10/P50/P90 da distribuição de t_y.

import { ITACOATIARA_HISTORICO_DIARIO } from "./itacoatiara-historico-diario";
import { cotaItaParaCMR } from "./cmr-itacoatiara";

export interface PontoSerie {
  data: string;     // YYYY-MM-DD
  cota: number;     // metros
}

export interface AnalogoRanqueado {
  ano:           number;
  rmse_m:        number;
  peso:          number;
  /** Data em que cota_ano cruzou cota_alvo (null se nunca cruzou ou dado faltante) */
  eta_iso:       string | null;
  /** Dias entre fim-da-janela-de-match e cruzamento naquele ano */
  eta_offset_d:  number | null;
  /** Cota observada no mesmo DOY do "hoje" da série atual */
  cota_hoje_y:   number | null;
}

export interface ResultadoAnalogos {
  /** Lista ranqueada do mais similar ao menos similar */
  analogos:        AnalogoRanqueado[];
  /** Ano com menor RMSE */
  ano_top:         number | null;
  rmse_top:        number | null;
  /** Quantis ponderados das datas de ETA */
  data_p10:        string | null;
  data_p50:        string | null;
  data_p90:        string | null;
  dias_p10:        number | null;
  dias_p50:        number | null;
  dias_p90:        number | null;
  /** % do peso total que efetivamente cruzou cota_alvo */
  prob_cruzamento: number;
  /** Hoje (último ponto observado) */
  data_atual:      string;
  cota_atual_m:    number;
  cota_alvo_m:     number;
  cmr_alvo_m:      number;
  janela_dias:     number;
  n_analogos:      number;
  largura_kernel:  number;
}

function dayOfYear(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

function isoComAno(doy: number, ano: number): string {
  // Bissexto-safe: 1-jan + (doy-1) dias
  const d = new Date(Date.UTC(ano, 0, 1));
  d.setUTCDate(d.getUTCDate() + doy - 1);
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000,
  );
}

/**
 * Projeta ETA via análogos históricos.
 *
 * @param serieAtual    Série diária 2026 (jan até hoje). Cada {data, cota}.
 * @param calado_alvo   Calado mínimo desejado (default 11m → cota_alvo ≈ 6,30m).
 * @param janela_match  Quantos dias finais da serieAtual usar p/ matching (default 30).
 * @param largura_kernel  Largura do kernel exponencial em metros (default 0,5).
 * @param horizonte_eta   Quantos dias após "hoje" considerar para procurar cruzamento (default 300).
 */
export function projetaETAporAnalogos(
  serieAtual: PontoSerie[],
  calado_alvo = 11.0,
  janela_match = 30,
  largura_kernel = 0.5,
  horizonte_eta = 300,
): ResultadoAnalogos {
  const cota_alvo_m = cotaItaParaCMR(calado_alvo);
  const cmr_alvo_m  = calado_alvo;

  if (serieAtual.length === 0) {
    return {
      analogos: [], ano_top: null, rmse_top: null,
      data_p10: null, data_p50: null, data_p90: null,
      dias_p10: null, dias_p50: null, dias_p90: null,
      prob_cruzamento: 0,
      data_atual: "", cota_atual_m: 0, cota_alvo_m, cmr_alvo_m,
      janela_dias: janela_match, n_analogos: 0, largura_kernel,
    };
  }

  const hojeIdx = serieAtual.length - 1;
  const dataHoje = serieAtual[hojeIdx].data;
  const cotaHoje = serieAtual[hojeIdx].cota;
  const doyHoje  = dayOfYear(dataHoje);

  // Janela de matching: últimos `janela_match` pontos
  const janela = serieAtual.slice(Math.max(0, hojeIdx - janela_match + 1));
  const doysJanela = janela.map((p) => dayOfYear(p.data));

  // Anos históricos disponíveis (do artefato)
  const ANOS = Object.keys(ITACOATIARA_HISTORICO_DIARIO)
    .map((a) => parseInt(a, 10))
    .filter((a) => a >= 2016 && a <= 2025)
    .sort();

  const analogosBruto: AnalogoRanqueado[] = [];

  for (const y of ANOS) {
    const serieAno = ITACOATIARA_HISTORICO_DIARIO[y as keyof typeof ITACOATIARA_HISTORICO_DIARIO];
    if (!serieAno) continue;

    // Constrói pares (cota_2026, cota_y) alinhados por DOY
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < janela.length; i++) {
      const doy = doysJanela[i];
      const iso_y = isoComAno(doy, y);
      const c_y = (serieAno as Record<string, number>)[iso_y];
      if (c_y == null) continue;
      sumSq += (janela[i].cota - c_y) ** 2;
      n++;
    }
    if (n < Math.max(5, janela_match * 0.5)) continue;  // exige cobertura mínima
    const rmse = Math.sqrt(sumSq / n);

    // Cota do ano y no mesmo DOY de hoje
    const c_y_hoje = (serieAno as Record<string, number>)[isoComAno(doyHoje, y)] ?? null;

    // Procura cruzamento de cota_y abaixo de cota_alvo no horizonte
    let eta_iso: string | null = null;
    for (let off = 0; off <= horizonte_eta; off++) {
      const isoFwd = isoComAno(doyHoje + off, y);
      const c_fwd = (serieAno as Record<string, number>)[isoFwd];
      if (c_fwd != null && c_fwd < cota_alvo_m) {
        eta_iso = isoFwd;
        break;
      }
    }
    const eta_offset_d = eta_iso ? diasEntre(isoComAno(doyHoje, y), eta_iso) : null;

    analogosBruto.push({
      ano:           y,
      rmse_m:        +rmse.toFixed(3),
      peso:          Math.exp(-rmse / largura_kernel),
      eta_iso,
      eta_offset_d,
      cota_hoje_y:   c_y_hoje,
    });
  }

  // Ranking por RMSE
  analogosBruto.sort((a, b) => a.rmse_m - b.rmse_m);

  // Quantis ponderados sobre os análogos que cruzaram
  const cruzaram = analogosBruto.filter((a) => a.eta_offset_d != null);
  const pesoTotal = analogosBruto.reduce((s, a) => s + a.peso, 0);
  const pesoCruzaram = cruzaram.reduce((s, a) => s + a.peso, 0);
  const prob_cruzamento = pesoTotal > 0 ? +(pesoCruzaram / pesoTotal).toFixed(3) : 0;

  function quantilPond(q: number): number | null {
    if (cruzaram.length === 0) return null;
    const sorted = [...cruzaram].sort((a, b) => (a.eta_offset_d! - b.eta_offset_d!));
    const total = sorted.reduce((s, a) => s + a.peso, 0);
    let acc = 0;
    for (const a of sorted) {
      acc += a.peso;
      if (acc / total >= q) return a.eta_offset_d!;
    }
    return sorted[sorted.length - 1].eta_offset_d!;
  }

  const off_p10 = quantilPond(0.10);
  const off_p50 = quantilPond(0.50);
  const off_p90 = quantilPond(0.90);

  function offsetParaIso(off: number | null): string | null {
    if (off == null) return null;
    const d = new Date(dataHoje + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + off);
    return d.toISOString().slice(0, 10);
  }

  return {
    analogos:        analogosBruto,
    ano_top:         analogosBruto[0]?.ano ?? null,
    rmse_top:        analogosBruto[0]?.rmse_m ?? null,
    data_p10:        offsetParaIso(off_p10),
    data_p50:        offsetParaIso(off_p50),
    data_p90:        offsetParaIso(off_p90),
    dias_p10:        off_p10,
    dias_p50:        off_p50,
    dias_p90:        off_p90,
    prob_cruzamento,
    data_atual:      dataHoje,
    cota_atual_m:    cotaHoje,
    cota_alvo_m,
    cmr_alvo_m,
    janela_dias:     janela_match,
    n_analogos:      analogosBruto.length,
    largura_kernel,
  };
}
