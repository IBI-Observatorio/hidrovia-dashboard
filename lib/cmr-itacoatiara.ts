// CMR — Calado Máximo Recomendado pela Capitania dos Portos (Amazônia Ocidental)
// em função da cota de Itacoatiara.
//
// Fonte: Capitania dos Portos da Amazônia Ocidental — publicação diária do
//        Calado Máximo Recomendado no Canal de Tabocal e adjacências.
// Dataset: data/cmr_itacoatiara.xlsx (187 observações, 08/set/2024 a 15/dez/2025).
//
// IMPORTÂNCIA:
//   - Este é o ÚNICO valor REGULATORIAMENTE OFICIAL que mede calado disponível
//     no canal. Quando o IRC do IBI cita CMR, ele cita LITERALMENTE a métrica
//     que armadores usam para decidir embarque.
//   - Substitui a abstração "distância para gatilho de cota" por um número
//     em METROS DE LÂMINA D'ÁGUA RECOMENDADA — diretamente conversível em
//     toneladas de carga (cada metro de calado ≈ 1.500-2.000 ton/balsa).
//
// Limites observados:
//   CMR_min:  5,63 m (set/2024, durante mega-seca)
//   CMR_max: 12,50 m (cheia, jun-jul 2025)
//   Em cota Itacoatiara = 0,00 m → CMR ≈ 5,72 m (mínimo operacional do canal)
//
// PADRÃO INTERESSANTE: a curva NÃO é linear. Tem um patamar em ITA ∈ [−0,2; +0,1]
// com CMR ~5,72m (operação restrita mínima). Acima de ITA ~1,5m, CMR cresce
// quase linearmente até ~12,5m.

// Curva oficial: pontos (cota_ITA_m, CMR_m) — mediana por bin de 0,10m
// derivada das publicações diárias da Capitania entre 08/set/2024 e 15/dez/2025.
// Suavizada por mediana de ~187 observações em ~75 bins. Ordenada por cota.
const CURVA_OFICIAL: ReadonlyArray<readonly [number, number]> = [
  [-0.20,  5.73], [-0.10,  5.76], [ 0.00,  5.72], [ 0.10,  5.80], [ 0.20,  5.96],
  [ 0.30,  5.98], [ 0.40,  6.16], [ 0.50,  6.12], [ 0.60,  6.34], [ 0.70,  6.52],
  [ 0.80,  6.47], [ 0.90,  6.61], [ 1.00,  6.70], [ 1.10,  6.65], [ 1.20,  6.76],
  [ 1.40,  6.85], [ 1.50,  7.19], [ 1.60,  7.46], [ 1.70,  7.99], [ 1.80,  7.99],
  [ 1.90,  8.08], [ 2.00,  8.12], [ 2.10,  7.99], [ 2.20,  8.35], [ 2.30,  8.23],
  [ 2.40,  8.31], [ 2.50,  8.71], [ 2.60,  8.48], [ 2.70,  8.88], [ 2.80,  8.66],
  [ 2.90,  8.77], [ 3.00,  9.15], [ 3.20,  8.98], [ 3.30,  9.38], [ 3.40,  9.20],
  [ 3.60,  9.27], [ 3.70,  9.78], [ 3.80,  9.53], [ 4.00, 10.01], [ 4.10,  9.76],
  [ 4.20, 10.27], [ 4.30,  9.60], [ 4.40, 10.41], [ 4.50, 10.14], [ 4.60, 10.64],
  [ 4.70, 10.36], [ 4.90, 10.52], [ 5.00, 11.05], [ 5.20, 11.21], [ 5.40, 11.37],
  [ 5.50, 10.13], [ 5.60, 10.40], [ 5.70, 10.52], [ 5.80, 10.58], [ 5.90, 10.62],
  [ 6.00, 10.80], [ 6.10, 10.76], [ 6.20, 10.94], [ 6.30, 11.00], [ 6.40, 11.12],
  [ 6.50, 11.25], [ 6.60, 11.43], [ 6.70, 11.50], [ 6.80, 11.63], [ 6.90, 11.74],
  [ 7.00, 11.81], [ 7.10, 11.88], [ 7.20, 11.96], [ 7.30, 12.07], [ 7.40, 12.14],
  [ 7.50, 12.21], [ 7.60, 12.28], [ 7.70, 12.37], [ 7.80, 12.46], [ 7.90, 12.50],
];

export const CMR_OBSERVADO = {
  cmr_min:    5.63,         // mínimo absoluto registrado (set/2024)
  cmr_max:   12.50,         // máximo registrado (cheia 2025)
  ita_min:   -0.18,         // cota Itacoatiara correspondente ao CMR mínimo
  ita_max:    7.93,         // cota correspondente ao CMR máximo
  n_obs:     187,
  fonte:     "Capitania dos Portos da Amazônia Ocidental — publicações diárias",
  periodo:   { inicio: "2024-09-08", fim: "2025-12-15" },
} as const;

/**
 * Calcula o CMR (Calado Máximo Recomendado) em metros para uma dada cota de
 * Itacoatiara, por interpolação linear na curva oficial.
 *
 * Para extrapolar fora do range observado (-0.18m a 7.93m):
 *   - Abaixo do mínimo: retorna CMR_min observado (saturação)
 *   - Acima do máximo: estende linearmente (raramente acionado — corresponde a
 *     condição de cheia muito acima do que foi observado em 2024-2025)
 */
export function cmrDeItacoatiara(cota_ita_m: number): number {
  // Saturação no piso (mínimo histórico)
  if (cota_ita_m <= CURVA_OFICIAL[0][0]) return CMR_OBSERVADO.cmr_min;

  // Extrapolação no topo: limita ao CMR_max histórico + pequeno excedente
  // (acima do range observado, a relação cota↔CMR perde estrutura previsível)
  const ultimo = CURVA_OFICIAL[CURVA_OFICIAL.length - 1];
  if (cota_ita_m >= ultimo[0]) {
    // Suave até ITA = 10m, cap em CMR = 13.5m (1m acima do max observado)
    const extra = Math.min(2.0, cota_ita_m - ultimo[0]);
    return +Math.min(13.5, ultimo[1] + extra * 0.4).toFixed(2);
  }

  // Interpolação linear
  for (let i = 0; i < CURVA_OFICIAL.length - 1; i++) {
    const [x1, y1] = CURVA_OFICIAL[i];
    const [x2, y2] = CURVA_OFICIAL[i + 1];
    if (cota_ita_m >= x1 && cota_ita_m <= x2) {
      const t = (cota_ita_m - x1) / (x2 - x1 || 1);
      return +(y1 + t * (y2 - y1)).toFixed(2);
    }
  }
  return CMR_OBSERVADO.cmr_min;  // fallback defensivo
}

/**
 * Déficit de calado: diferença entre o CALADO ALVO desejado (default 11,0m,
 * típico de comboio carregado em cheia normal) e o CMR atual.
 *
 * Resultado em METROS — sinal positivo significa restrição operacional.
 *   - Déficit = 0   → calado suficiente para qualquer operação
 *   - Déficit = 3   → comboios precisam aliviar carga (~25% redução)
 *   - Déficit = 5+  → restrição operacional severa (50%+ redução)
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
 * Mapeia déficit de calado para escala de risco operacional:
 *   - Déficit = 0       → 0  (calado suficiente)
 *   - Déficit = 1m      → 25
 *   - Déficit = 2,5m    → 50
 *   - Déficit = 4m      → 75
 *   - Déficit = 5,5m+   → 100 (extrapola — déficit máximo observado ~5,4m em 2024)
 *
 * Função: aproximadamente linear até déficit 5m, satura acima.
 */
export function scoreCMR(cota_ita_m: number, calado_alvo_m = 11.0): number {
  const def = deficitCalado(cota_ita_m, calado_alvo_m);
  if (def <= 0)      return 0;
  if (def >= 5.5)    return 100;
  // Função em 2 segmentos para refletir não-linearidade percebida:
  //   0-2.5m: linear 0→50 (toleração inicial)
  //   2.5-5.5m: linear 50→100 (restrição severa)
  if (def <= 2.5) return +(def * 20).toFixed(1);            // 20 pts/m
  return +(50 + (def - 2.5) * (50 / 3)).toFixed(1);          // 16.7 pts/m
}
