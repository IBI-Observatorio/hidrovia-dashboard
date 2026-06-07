import { describe, it, expect } from "vitest";
import {
  ESTAGIOS,
  anoCentralLeilao,
  pLeilaoPorAno,
  medianaCruzamento,
  classificaRegime,
  type MaturacaoSeed,
} from "@/lib/radar/maturation";

const anos = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

const ef170: MaturacaoSeed = { estagioAtual: 2, leilaoAnunciado: null, gateRisk: "alto" };
const ef118: MaturacaoSeed = { estagioAtual: 3, leilaoAnunciado: 2026, gateRisk: "medio" };
const ef151: MaturacaoSeed = { estagioAtual: 1, leilaoAnunciado: 2027, gateRisk: "medio" };

describe("esteira de estágios", () => {
  it("tem 5 estágios terminando em Leilão", () => {
    expect(ESTAGIOS).toHaveLength(5);
    expect(ESTAGIOS[ESTAGIOS.length - 1]).toBe("Leilão");
  });
});

describe("P(leilão por ano)", () => {
  it("é cumulativa monótona não-decrescente em pOcorre", () => {
    const pts = pLeilaoPorAno(ef118, anos, 2026);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].pOcorre).toBeGreaterThanOrEqual(pts[i - 1].pOcorre);
    }
  });

  it("ativo mais maduro (EF-118) tem leilão mais cedo que o menos maduro (EF-151)", () => {
    const c118 = anoCentralLeilao(ef118, 2026);
    const c151 = anoCentralLeilao(ef151, 2026);
    expect(c118).toBeLessThan(c151);
  });

  it("sem DCF, pAtrativo = pOcorre (estrutura assumida = 1)", () => {
    const pts = pLeilaoPorAno(ef118, anos, 2026);
    pts.forEach((p) => expect(p.pAtrativo).toBeCloseTo(p.pOcorre, 10));
  });

  it("com estrutura que quase nunca fecha, pAtrativo nunca cruza 0,5 (mediana null)", () => {
    const pts = pLeilaoPorAno(ef170, anos, 2026, 0.01); // P(spread<0)≈99%
    expect(medianaCruzamento(pts, "pAtrativo")).toBeNull();
  });

  it("pAtrativo escala por P(estrutura fechar)", () => {
    const cheia = pLeilaoPorAno(ef118, anos, 2026, 1);
    const meia = pLeilaoPorAno(ef118, anos, 2026, 0.5);
    expect(meia[3].pAtrativo).toBeCloseTo(cheia[3].pAtrativo * 0.5, 6);
  });
});

describe("regime", () => {
  it("EF-170 (estrutura não fecha) → travado", () => {
    expect(classificaRegime(ef170, 0.01)).toBe("travado");
  });
  it("EF-118 (estágio Edital, risco médio) → iminente", () => {
    expect(classificaRegime(ef118, 1)).toBe("iminente");
  });
  it("EF-151 (estudos, risco médio) → maturando", () => {
    expect(classificaRegime(ef151, 1)).toBe("maturando");
  });
});
