import { describe, it, expect } from "vitest";
import {
  calculaIDN,
  calculaIDNSimples,
  calculaIDNFallback,
  classificaIDN,
  riscoDescasamento,
} from "@/lib/calcula-idn";
import { CALIBRACAO_IDN } from "@/lib/limiares-idn";

describe("classificaIDN", () => {
  it("classifica como Driver Norte quando IDN acima da fronteira calibrada", () => {
    const idn = CALIBRACAO_IDN.fronteiras[1] + 0.01;
    expect(classificaIDN(idn).regime).toBe("Driver Norte");
  });

  it("classifica como Driver Sul quando IDN abaixo da fronteira calibrada", () => {
    const idn = CALIBRACAO_IDN.fronteiras[0] - 0.01;
    expect(classificaIDN(idn).regime).toBe("Driver Sul");
  });

  it("classifica como Sincronizado dentro da banda neutra", () => {
    const meio = (CALIBRACAO_IDN.fronteiras[0] + CALIBRACAO_IDN.fronteiras[1]) / 2;
    expect(classificaIDN(meio).regime).toBe("Sincronizado");
  });

  it("o cenário 2026 (IDN ≈ +1,35) classifica como Driver Norte", () => {
    expect(classificaIDN(1.35).regime).toBe("Driver Norte");
  });

  it("o cenário mega-seca 2024 (IDN ≈ -0,5) classifica como Driver Sul", () => {
    expect(classificaIDN(-0.5).regime).toBe("Driver Sul");
  });
});

describe("calculaIDN — pipeline completa", () => {
  // Cota plausível de cheia (maio) para todas as estações
  const cotasEquilibradas = {
    SGC:        12.0,
    Curicuriari: 12.0,
    Serrinha:    9.5,
    Moura:      13.7,
    Caracarai:   3.5,
    Abuna:      19.0,
    PortoVelho: 13.0,
    Humaita:    20.0,
    Manicore:   20.0,
    Borba:      18.0,
    Labrea:     20.0,
  };

  it("retorna valor numérico finito com 11 estações", () => {
    const r = calculaIDN(cotasEquilibradas, "2026-05-11");
    expect(r.idn).toBeTypeOf("number");
    expect(Number.isFinite(r.idn)).toBe(true);
  });

  it("retorna lista de estações usadas em cada sub-bacia", () => {
    const r = calculaIDN(cotasEquilibradas, "2026-05-11");
    expect(r.estacoes_norte.length).toBe(5);
    expect(r.estacoes_sul.length).toBe(6);
  });

  it("falhas individuais (estação ausente) renormalizam os pesos", () => {
    const semSGC = { ...cotasEquilibradas, SGC: undefined };
    const r = calculaIDN(semSGC, "2026-05-11");
    expect(r.estacoes_norte.length).toBe(4);
    expect(Number.isFinite(r.idn)).toBe(true);
  });

  it("Negro colapsado + Madeira normal produz IDN positivo (Driver Norte)", () => {
    // SGC/Curicuriari muito baixos para maio (cheia esperada ~10-12 m)
    const negroBaixo = {
      ...cotasEquilibradas,
      SGC:         5.5,
      Curicuriari: 5.5,
      Serrinha:    7.0,
      Moura:      11.0,
      Caracarai:   1.5,
    };
    const r = calculaIDN(negroBaixo, "2026-05-11");
    expect(r.idn).toBeGreaterThan(0);
  });

  it("Madeira colapsado + Negro normal produz IDN negativo (Driver Sul)", () => {
    const madeiraBaixo = {
      ...cotasEquilibradas,
      Abuna:      14.0,
      PortoVelho:  9.0,
      Humaita:    14.0,
      Manicore:   14.0,
      Borba:      12.0,
      Labrea:     11.0,
    };
    const r = calculaIDN(madeiraBaixo, "2026-05-11");
    expect(r.idn).toBeLessThan(0);
  });
});

describe("calculaIDNSimples", () => {
  it("retorna apenas o número", () => {
    const cotas = { SGC: 10, Humaita: 18 };
    const v = calculaIDNSimples(cotas, "2026-05-11");
    expect(v).toBeTypeOf("number");
  });
});

describe("calculaIDNFallback (baseline anual)", () => {
  it("sinal correto: SGC seco + Humaita normal → IDN positivo (Norte)", () => {
    expect(calculaIDNFallback(5.5, 18)).toBeGreaterThan(0);
  });

  it("sinal correto: SGC normal + Humaita seco → IDN negativo (Sul)", () => {
    expect(calculaIDNFallback(9, 12)).toBeLessThan(0);
  });
});

describe("riscoDescasamento", () => {
  it("ELEVADO quando Manaus abaixo de 17,7 m", () => {
    expect(riscoDescasamento(17.5, 8, -10, -10).nivel).toBe("ELEVADO");
  });

  it("ELEVADO quando divergência > 80 cm", () => {
    expect(riscoDescasamento(20, 8, 0, -90).nivel).toBe("ELEVADO");
  });

  it("MODERADO quando divergência entre 40 e 80 cm", () => {
    expect(riscoDescasamento(20, 8, 0, -50).nivel).toBe("MODERADO");
  });

  it("NORMAL em situação equilibrada", () => {
    expect(riscoDescasamento(22, 8, 10, 10).nivel).toBe("NORMAL");
  });
});
