import { describe, it, expect } from "vitest";
import { npv, irr, bisectIrr, solve } from "@/lib/dcf/irr";

describe("npv", () => {
  it("a taxa 0 é a soma dos fluxos", () => {
    expect(npv(0, [-100, 50, 50, 50])).toBeCloseTo(50, 10);
  });
  it("desconta períodos futuros (t = 0,1,2,...)", () => {
    // 121 no t=2 a 10% vale 100 hoje
    expect(npv(0.1, [0, 0, 121])).toBeCloseTo(100, 6);
  });
});

describe("irr — casos conhecidos", () => {
  it("[-100, 110] → 10%", () => {
    expect(irr([-100, 110])).toBeCloseTo(0.1, 6);
  });
  it("[-100, 0, 121] → 10%", () => {
    expect(irr([-100, 0, 121])).toBeCloseTo(0.1, 6);
  });
  it("[-1000, 500, 500, 500] → ≈ 23,375%", () => {
    expect(irr([-1000, 500, 500, 500])).toBeCloseTo(0.23375, 4);
  });
  it("anuidade simples [-1000, +110 ×30] → ≈ 10,03%", () => {
    const cf = [-1000, ...Array(30).fill(110)];
    const r = irr(cf);
    expect(npv(r, cf)).toBeCloseTo(0, 5);
  });
  it("VPL no IRR é zero", () => {
    const cf = [-500, 100, 200, 300, 200];
    expect(npv(irr(cf), cf)).toBeCloseTo(0, 6);
  });
  it("bisseção concorda com Newton-Raphson", () => {
    const cf = [-1000, 500, 500, 500];
    expect(bisectIrr(cf, -0.9, 10)).toBeCloseTo(irr(cf), 5);
  });
});

describe("solve — calibração monótona", () => {
  it("acha x tal que f(x) = target", () => {
    const x = solve((v) => v * v, 9, 0, 100); // raiz de 9 = 3
    expect(x).toBeCloseTo(3, 5);
  });
  it("retorna NaN quando o alvo está fora do intervalo", () => {
    expect(solve((v) => v, 100, 0, 10)).toBeNaN();
  });
});
