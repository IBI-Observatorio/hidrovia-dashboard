// Formatadores pt-BR compartilhados do Radar (vírgula decimal).
// Fonte única — antes duplicados em StressDCF, MaturationRail e na página índice.

/** Número com `d` casas decimais e vírgula (ex.: num(11.04,1) → "11,0"). */
export const num = (x: number, d = 1): string => x.toFixed(d).replace(".", ",");

/** Percentual (ex.: pct(0.1104,2) → "11,04%"). */
export const pct = (x: number, d = 2): string =>
  `${(x * 100).toFixed(d).replace(".", ",")}%`;

/** Percentual com sinal explícito (− tipográfico) (ex.: sign(-0.027) → "−2,70%"). */
export const sign = (x: number, d = 2): string =>
  (x >= 0 ? "+" : "−") + pct(Math.abs(x), d);

/**
 * Formata data ISO de precisão variável:
 *   "2026-05-21" → "21/05/2026" · "2025-11" → "11/2025" · "2020" → "2020".
 */
export const fmtData = (iso: string): string => {
  const [a, m, d] = iso.split("-");
  if (d) return `${d}/${m}/${a}`;
  if (m) return `${m}/${a}`;
  return a;
};
