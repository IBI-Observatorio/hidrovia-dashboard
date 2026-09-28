import { describe, it, expect } from "vitest";
import { dataCruzamentoObservado } from "@/lib/recessao-analogos";

const s = (pares: [string, number][]) => pares.map(([data, cota]) => ({ data, cota }));

describe("dataCruzamentoObservado", () => {
  it("devolve null quando a cota atual ainda está acima do limiar", () => {
    expect(dataCruzamentoObservado(s([["2026-09-24", 6.5], ["2026-09-25", 6.35]]), 6.29)).toBeNull();
  });

  it("devolve o primeiro dia abaixo do limiar na descida atual (caso 26/09/2026)", () => {
    const serie = s([
      ["2026-09-24", 6.5], ["2026-09-25", 6.35], ["2026-09-26", 6.17],
      ["2026-09-27", 6.0], ["2026-09-28", 5.85],
    ]);
    expect(dataCruzamentoObservado(serie, 6.29)).toBe("2026-09-26");
  });

  it("ignora cruzamentos anteriores a um repique acima do limiar", () => {
    const serie = s([
      ["2026-09-01", 6.0], ["2026-09-02", 6.4], ["2026-09-03", 6.2], ["2026-09-04", 6.1],
    ]);
    expect(dataCruzamentoObservado(serie, 6.29)).toBe("2026-09-03");
  });

  it("devolve null quando a série inteira está abaixo (sem cruzamento observado)", () => {
    expect(dataCruzamentoObservado(s([["2026-01-01", 5], ["2026-01-02", 4.9]]), 6.29)).toBeNull();
  });
});
