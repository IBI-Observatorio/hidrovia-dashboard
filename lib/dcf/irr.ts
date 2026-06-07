// Núcleo numérico: VPL, TIR (Newton-Raphson com fallback de bisseção) e um
// solver genérico de calibração (bisseção em função monótona). Sem dependências.

/** Valor presente líquido de uma série de fluxos (t = 0,1,2,...) a uma taxa. */
export function npv(rate: number, cashflows: readonly number[]): number {
  let acc = 0;
  for (let t = 0; t < cashflows.length; t++) {
    acc += cashflows[t] / Math.pow(1 + rate, t);
  }
  return acc;
}

/** Derivada do VPL em relação à taxa (para Newton-Raphson). */
function dNpv(rate: number, cashflows: readonly number[]): number {
  let acc = 0;
  for (let t = 1; t < cashflows.length; t++) {
    acc += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
  }
  return acc;
}

/**
 * TIR (taxa onde VPL = 0) por Newton-Raphson, com fallback robusto de bisseção
 * caso a iteração saia do domínio ou não convirja.
 *
 * @returns a taxa, ou NaN se não houver raiz no intervalo de busca.
 */
export function irr(
  cashflows: readonly number[],
  guess = 0.1,
  tol = 1e-7,
  maxIter = 100,
): number {
  // Newton-Raphson
  let r = guess;
  for (let i = 0; i < maxIter; i++) {
    const f = npv(r, cashflows);
    if (Math.abs(f) < tol) return r;
    const d = dNpv(r, cashflows);
    if (!isFinite(d) || Math.abs(d) < 1e-12) break;
    const next = r - f / d;
    if (!isFinite(next) || next <= -0.999) break; // saiu do domínio → bisseção
    if (Math.abs(next - r) < tol) return next;
    r = next;
  }

  // Fallback: bisseção num intervalo amplo onde o VPL troca de sinal.
  return bisectIrr(cashflows, -0.9, 10, tol, 200);
}

/** Bisseção do VPL em [lo, hi] para achar a TIR. NaN se não houver troca de sinal. */
export function bisectIrr(
  cashflows: readonly number[],
  lo: number,
  hi: number,
  tol = 1e-7,
  maxIter = 200,
): number {
  let fLo = npv(lo, cashflows);
  let fHi = npv(hi, cashflows);
  if (isNaN(fLo) || isNaN(fHi) || fLo * fHi > 0) return NaN;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashflows);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Solver de calibração: acha x em [lo, hi] tal que f(x) = target, assumindo
 * f monótona no intervalo. Bisseção pura (robusta para calibrar tarifa/O&M/haircut).
 *
 * @returns x calibrado, ou NaN se o alvo não estiver no intervalo coberto.
 */
export function solve(
  f: (x: number) => number,
  target: number,
  lo: number,
  hi: number,
  tol = 1e-6,
  maxIter = 200,
): number {
  const g = (x: number) => f(x) - target;
  let gLo = g(lo);
  let gHi = g(hi);
  if (isNaN(gLo) || isNaN(gHi)) return NaN;
  if (gLo * gHi > 0) return NaN; // alvo fora do intervalo
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const gMid = g(mid);
    if (Math.abs(gMid) < tol || (hi - lo) / 2 < tol) return mid;
    if (gLo * gMid < 0) {
      hi = mid;
      gHi = gMid;
    } else {
      lo = mid;
      gLo = gMid;
    }
  }
  return (lo + hi) / 2;
}
