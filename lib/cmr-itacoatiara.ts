// CMR — Calado Máximo Recomendado pela Capitania dos Portos (Amazônia Ocidental)
// em função da cota de Itacoatiara.
//
// Fonte: Capitania dos Portos da Amazônia Ocidental — publicação diária do
//        Calado Máximo Recomendado no Canal de Tabocal e adjacências.
// Dataset: data/cmr_itacoatiara.csv (187 observações, 08/set/2024 a 15/dez/2025).
//
// IMPORTÂNCIA:
//   - Este é o ÚNICO valor REGULATORIAMENTE OFICIAL que mede calado disponível
//     no canal. Quando o IRC do IBI cita CMR, ele cita LITERALMENTE a métrica
//     que armadores usam para decidir embarque.
//
// CORREÇÕES DA AUDITORIA ESTATÍSTICA (v3.4):
//   1. Curva agora é ISOTÔNICA — PAV eliminou 17 inversões locais que existiam
//      nos bins esparsos da versão anterior.
//   2. Extrapolação no topo usa slope Theil-Sen calibrado (0,80 m/m com IC80
//      [0,74; 0,82]) em vez de slope estimado em 2 pontos (0,77).
//   3. Curva publica P10/P90 por bin para banda de incerteza no MC.
//
// PADRÃO HIDROLÓGICO: a curva NÃO é uma reta. Há um patamar em ITA ∈ [−0,2; +0,4]
// com CMR ~5,7-6,1m (canal restrito mínimo). Acima de ITA ~1,5m, CMR cresce
// quase linearmente. Acima de ITA ~7,9m (range observado), extrapolação linear
// com slope 0,80 — reflete que o leito do canal é fixo e cada metro extra de
// cota em ITA equivale a ~0,8m extra de CMR.

import { CURVA_CMR_CALIBRADA, CMR_CURVA_META } from "./cmr-itacoatiara-calibrada";

export const CMR_OBSERVADO = {
  cmr_min:    CMR_CURVA_META.cmr_min,
  cmr_max:    CMR_CURVA_META.cmr_max,
  ita_min:    CMR_CURVA_META.ita_min,
  ita_max:    CMR_CURVA_META.ita_max,
  n_obs:      CMR_CURVA_META.n_observacoes,
  fonte:      CMR_CURVA_META.fonte,
  periodo:    CMR_CURVA_META.periodo,
  slope_topo: CMR_CURVA_META.slope_topo,
  slope_ic80: [CMR_CURVA_META.slope_topo_p10, CMR_CURVA_META.slope_topo_p90] as const,
} as const;

/**
 * Calcula o CMR (Calado Máximo Recomendado) em metros para uma dada cota de
 * Itacoatiara, por interpolação linear na curva isotônica oficial.
 *
 * Extrapolação:
 *   - Abaixo do mínimo observado: retorna CMR_min (saturação no piso histórico)
 *   - Acima do máximo observado: extrapolação linear com slope Theil-Sen
 *     calibrado (~0,80 m CMR por m ITA) — fisicamente justificado pelo offset
 *     fixo do leito de Tabocal abaixo do zero da régua.
 */
export function cmrDeItacoatiara(cota_ita_m: number): number {
  const curva = CURVA_CMR_CALIBRADA;

  // Saturação no piso (mínimo histórico)
  if (cota_ita_m <= curva[0][0]) return CMR_OBSERVADO.cmr_min;

  // Extrapolação no topo via slope calibrado
  const ultimo = curva[curva.length - 1];
  if (cota_ita_m >= ultimo[0]) {
    const slope = CMR_OBSERVADO.slope_topo;
    return +(ultimo[1] + (cota_ita_m - ultimo[0]) * slope).toFixed(2);
  }

  // Interpolação linear na curva isotônica (busca binária)
  let lo = 0, hi = curva.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curva[mid][0] <= cota_ita_m) lo = mid;
    else hi = mid;
  }
  const x1 = curva[lo][0], y1 = curva[lo][1];
  const x2 = curva[hi][0], y2 = curva[hi][1];
  const t = (cota_ita_m - x1) / (x2 - x1 || 1);
  return +(y1 + t * (y2 - y1)).toFixed(2);
}

/**
 * Versão "amostrada" do CMR — para uso em Monte Carlo.
 * Devolve um valor entre P10 e P90 do bin, perturbado linearmente por uma
 * variável uniforme `u ∈ [0,1]`. Útil para propagar incerteza da curva CMR
 * no end-to-end MC.
 */
export function cmrAmostraIC(cota_ita_m: number, u: number): number {
  const curva = CURVA_CMR_CALIBRADA;
  if (cota_ita_m <= curva[0][0] || cota_ita_m >= curva[curva.length - 1][0]) {
    return cmrDeItacoatiara(cota_ita_m);
  }
  let lo = 0, hi = curva.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curva[mid][0] <= cota_ita_m) lo = mid;
    else hi = mid;
  }
  const x1 = curva[lo][0], y10_1 = curva[lo][2], y90_1 = curva[lo][3];
  const x2 = curva[hi][0], y10_2 = curva[hi][2], y90_2 = curva[hi][3];
  const t = (cota_ita_m - x1) / (x2 - x1 || 1);
  const p10 = y10_1 + t * (y10_2 - y10_1);
  const p90 = y90_1 + t * (y90_2 - y90_1);
  // u ∈ [0,1] mapeia P10→P90 linearmente. Não é exatamente o quantil exato,
  // mas é monotônico em u e cobre a banda observada.
  return +(p10 + u * (p90 - p10)).toFixed(2);
}

/**
 * Inversão da curva: dado um CMR alvo, devolve a cota_ita correspondente.
 * Como a curva é monotônica (PAV), a inversa é única.
 */
export function cotaItaParaCMR(cmr_alvo: number): number {
  const curva = CURVA_CMR_CALIBRADA;
  // Se alvo está acima do topo observado, extrapola pela inversa do slope
  const ultimo = curva[curva.length - 1];
  if (cmr_alvo >= ultimo[1]) {
    return +(ultimo[0] + (cmr_alvo - ultimo[1]) / CMR_OBSERVADO.slope_topo).toFixed(2);
  }
  if (cmr_alvo <= curva[0][1]) return curva[0][0];

  // Busca binária na curva isotônica
  let lo = 0, hi = curva.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curva[mid][1] <= cmr_alvo) lo = mid;
    else hi = mid;
  }
  const x1 = curva[lo][0], y1 = curva[lo][1];
  const x2 = curva[hi][0], y2 = curva[hi][1];
  if (y2 === y1) return x1;
  const t = (cmr_alvo - y1) / (y2 - y1);
  return +(x1 + t * (x2 - x1)).toFixed(2);
}

/**
 * Déficit de calado: diferença entre o CALADO ALVO desejado e o CMR atual.
 */
export function deficitCalado(cota_ita_m: number, calado_alvo_m = 11.0): number {
  const cmr = cmrDeItacoatiara(cota_ita_m);
  return +Math.max(0, calado_alvo_m - cmr).toFixed(2);
}

/**
 * Converte déficit de calado em estimativa de redução de carga.
 * Heurística: cada 1m de calado a menos ≈ 1.500 ton/balsa.
 * Para um comboio de 24 balsas (típico hidrovia Amazonas): 36.000 ton por metro.
 */
export function reducaoCargaToneladas(
  cota_ita_m: number,
  calado_alvo_m = 11.0,
  ton_por_metro_balsa = 1500,
  balsas_por_comboio = 24,
): number {
  const def = deficitCalado(cota_ita_m, calado_alvo_m);
  return Math.round(def * ton_por_metro_balsa * balsas_por_comboio);
}

/**
 * Score 0-100 do componente CMR para o IRC.
 */
export function scoreCMR(cota_ita_m: number, calado_alvo_m = 11.0): number {
  const def = deficitCalado(cota_ita_m, calado_alvo_m);
  if (def <= 0)      return 0;
  if (def >= 5.5)    return 100;
  if (def <= 2.5) return +(def * 20).toFixed(1);
  return +(50 + (def - 2.5) * (50 / 3)).toFixed(1);
}
