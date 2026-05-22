// PRNG determinístico (Mulberry32) para reprodutibilidade de bootstraps
// e Monte Carlo. Seed fixa garante que rodar 2× produz exatamente o mesmo
// resultado — auditoria estatística pediu isso.
//
// Math.random() do V8 não é seedeable. Mulberry32 é state-of-the-art para
// simulações estatísticas leves (passa Big Crush em 32 bits, suficiente
// para n < 10^7 amostras).

/**
 * Cria um gerador uniforme(0,1) determinístico a partir de uma seed.
 * @param seed inteiro 32-bit (default 42)
 */
export function makeRng(seed = 42): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Amostra normal padrão N(0,1) via Box-Muller.
 * Aceita um rng uniforme (de makeRng).
 */
export function randn(rng: () => number): number {
  // Box-Muller — não usa cache para manter estado puro
  let u1 = rng();
  let u2 = rng();
  // proteção contra log(0)
  if (u1 < 1e-300) u1 = 1e-300;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Amostra de uma normal bivariada N(μ, Σ) via fator de Cholesky L (2×2).
 * Σ = L · L^T. Retorna [x1, x2].
 *
 * @param rng    gerador uniforme
 * @param mu     [μ1, μ2]
 * @param L      Cholesky 2×2 em formato [L00, L10, L11] (L01=0)
 */
export function randMvn2(
  rng: () => number,
  mu: readonly [number, number],
  L: readonly [number, number, number],
): [number, number] {
  const z1 = randn(rng);
  const z2 = randn(rng);
  return [
    mu[0] + L[0] * z1,
    mu[1] + L[1] * z1 + L[2] * z2,
  ];
}

/**
 * Calcula fator de Cholesky de uma matriz 2×2 SPD.
 * Retorna [L00, L10, L11] tal que L · L^T = Σ.
 */
export function cholesky2(
  s11: number,
  s12: number,
  s22: number,
): [number, number, number] {
  const L00 = Math.sqrt(Math.max(s11, 1e-12));
  const L10 = s12 / L00;
  const L11sq = s22 - L10 * L10;
  const L11 = Math.sqrt(Math.max(L11sq, 1e-12));
  return [L00, L10, L11];
}
