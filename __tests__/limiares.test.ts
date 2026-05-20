import { describe, it, expect } from "vitest";
import { posicaoRelativa, posicaoRelativaRaw, semaforo, LIMIARES } from "@/lib/limiares";

describe("posicaoRelativa (clampada [0,1])", () => {
  it("retorna 0 quando cota = P10", () => {
    expect(posicaoRelativa(LIMIARES.SGC.p10, "SGC")).toBeCloseTo(0);
  });

  it("retorna 1 quando cota = P90", () => {
    expect(posicaoRelativa(LIMIARES.SGC.p90, "SGC")).toBeCloseTo(1);
  });

  it("clampa em 0 quando abaixo do P10", () => {
    expect(posicaoRelativa(0, "SGC")).toBe(0);
  });

  it("clampa em 1 quando acima do P90", () => {
    expect(posicaoRelativa(100, "SGC")).toBe(1);
  });
});

describe("posicaoRelativaRaw (sem clamp)", () => {
  it("preserva valores extremos negativos", () => {
    const r = posicaoRelativaRaw(0, "SGC");
    expect(r).toBeLessThan(0);
  });

  it("preserva valores extremos positivos", () => {
    const r = posicaoRelativaRaw(100, "SGC");
    expect(r).toBeGreaterThan(1);
  });
});

describe("semaforo", () => {
  it("crítico quando Manaus abaixo do gatilho LWS (17,7)", () => {
    expect(semaforo(17.0, "Manaus")).toBe("critico");
  });

  it("crítico quando abaixo do P10", () => {
    expect(semaforo(LIMIARES.SGC.p10 - 0.1, "SGC")).toBe("critico");
  });

  it("normal próximo da mediana", () => {
    expect(semaforo(LIMIARES.Manaus.mediana, "Manaus")).toBe("normal");
  });
});
