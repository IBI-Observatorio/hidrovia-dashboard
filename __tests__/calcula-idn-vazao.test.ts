import { describe, it, expect } from "vitest";
import { calculaIDNVazao } from "@/lib/calcula-idn-vazao";

describe("calculaIDNVazao", () => {
  // Valores plausíveis para maio (cheia) — todos próximos da mediana
  const vazoesEquilibradas = {
    Curicuriari: 18000,
    Serrinha:   26000,
    Moura:      41000,
    Caracarai:   3500,
    PortoVelho: 27000,
    Humaita:    32000,
    Manicore:   38000,
    Labrea:     10000,
  };

  it("retorna estrutura completa", () => {
    const r = calculaIDNVazao(vazoesEquilibradas, "2026-05-11");
    expect(r).toHaveProperty("idn");
    expect(r).toHaveProperty("pos_norte");
    expect(r).toHaveProperty("pos_sul");
    expect(r).toHaveProperty("estacoes_norte");
    expect(r).toHaveProperty("estacoes_sul");
  });

  it("Norte com vazões muito baixas + Sul normal → IDN positivo", () => {
    // Norte abaixo do P10 sazonal de maio, Sul próximo da mediana
    const baixoNorte = {
      ...vazoesEquilibradas,
      Curicuriari:  9000,  // P10 maio ≈ 14.000
      Serrinha:    14000,  // P10 maio ≈ 20.600
      Moura:       25000,  // P10 maio ≈ 33.800
      Caracarai:     500,  // P10 maio ≈ 830
    };
    const r = calculaIDNVazao(baixoNorte, "2026-05-11");
    expect(r.idn).toBeGreaterThan(0);
  });

  it("falhas individuais em estações renormalizam", () => {
    const semCaracarai = { ...vazoesEquilibradas, Caracarai: undefined };
    const r = calculaIDNVazao(semCaracarai, "2026-05-11");
    expect(r.estacoes_norte.length).toBe(3);
    expect(Number.isFinite(r.idn)).toBe(true);
  });
});
