import { describe, it, expect } from "vitest";
import {
  parseBoletimSEMA,
  extraiData,
  extraiNumeroBoletim,
  parseEstrategia2,
} from "@/lib/sema-parser";

describe("parseBoletimSEMA — função pública", () => {
  it("é função assíncrona exportada", () => {
    expect(parseBoletimSEMA).toBeTypeOf("function");
  });
});

describe("extraiData", () => {
  it("reconhece DD/MM/YYYY", () => {
    expect(extraiData("Boletim emitido em 08/05/2026 às 09h")).toBe("2026-05-08");
  });

  it("reconhece DD de MÊS de YYYY", () => {
    expect(extraiData("Boletim de 8 de maio de 2026")).toBe("2026-05-08");
  });

  it("retorna data de hoje quando não encontra padrão", () => {
    const hoje = new Date().toISOString().split("T")[0];
    expect(extraiData("texto sem data")).toBe(hoje);
  });
});

describe("extraiNumeroBoletim", () => {
  it("reconhece 'Boletim 15/2026'", () => {
    expect(extraiNumeroBoletim("Boletim 15/2026")).toBe(15);
  });

  it("reconhece 'Boletim nº 23'", () => {
    expect(extraiNumeroBoletim("Boletim nº 23 de 2026")).toBe(23);
  });

  it("retorna null quando não encontra", () => {
    expect(extraiNumeroBoletim("texto sem número")).toBeNull();
  });
});

describe("parseEstrategia2 — extração por regex", () => {
  // Texto sintético no formato típico do boletim SEMA
  const textoFake = `
    Boletim SEMA — 08/05/2026

    Rio       | Localização | Cota (cm) | Variação (cm) | Δ ano (cm)
    Negro     | Manaus      | 2702      | -8            | -48
    Negro     | Curicuriari | 550       | -5            | -718
    Solimões  | Manacapuru  | 1916      | -5            | -30
    Amazonas  | Itacoatiara | 1137      | -12           | -91
    Madeira   | Humaitá     | 1411      | -22           | +42
    Purus     | Lábrea      | 1492      | -8            | -150
  `;

  it("encontra múltiplas estações", () => {
    const r = parseEstrategia2(textoFake);
    expect(r.length).toBeGreaterThanOrEqual(3);
  });

  it("mapeia 'Curicuriari' para chave SGC (alias)", () => {
    const r = parseEstrategia2(textoFake);
    const sgc = r.find((e) => e.estacao === "SGC");
    expect(sgc).toBeDefined();
    expect(sgc?.cota_cm).toBe(550);
  });

  it("preserva sinal negativo na variação", () => {
    const r = parseEstrategia2(textoFake);
    const manaus = r.find((e) => e.estacao === "Manaus");
    expect(manaus?.variacao_cm).toBe(-8);
  });

  it("preserva sinal positivo no delta_ano", () => {
    const r = parseEstrategia2(textoFake);
    const humaita = r.find((e) => e.estacao === "Humaitá");
    expect(humaita?.delta_ano_cm).toBe(42);
  });

  it("associa rio corretamente via tabela RIOS", () => {
    const r = parseEstrategia2(textoFake);
    const itacoa = r.find((e) => e.estacao === "Itacoatiara");
    expect(itacoa?.rio).toBe("Rio Amazonas");
  });

  it("ignora linhas sem o padrão numérico esperado", () => {
    const ruido = `
      Manaus tem clima quente
      Curicuriari é uma região do Negro
    `;
    const r = parseEstrategia2(ruido);
    expect(r.length).toBe(0);
  });
});
