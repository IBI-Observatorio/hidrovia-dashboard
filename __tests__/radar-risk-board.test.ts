import { describe, it, expect } from "vitest";
import type { RiskVector } from "@/lib/dcf/types";
import { GATES, posturaRisco, GATE_PESO, normalizaGate } from "@/lib/radar/risk";
import { getRadarAsset } from "@/lib/radar/assets";
import { getTabuleiro, normalizaExposicao } from "@/lib/radar/board";

const ef170Risk = getRadarAsset("ef-170")!.raw.risk as RiskVector;

describe("risco institucional", () => {
  it("tem os 5 vetores de gate", () => {
    expect(GATES.map((g) => g.key)).toEqual([
      "stf", "tcu", "ambiental", "concessionaria", "modelagem",
    ]);
  });

  it("EF-170 (ambiental=risco, 3× atenção) → postura alta", () => {
    expect(posturaRisco(ef170Risk)).toBe("alto");
  });

  it("vetor todo resolvido/na → postura baixa", () => {
    const limpo: RiskVector = {
      stf: "resolvido", tcu: "resolvido", ambiental: "na",
      concessionaria: "na", modelagem: "resolvido", notes: {},
    };
    expect(posturaRisco(limpo)).toBe("baixo");
  });

  it("severidade: risco > atencao > em-curso > resolvido = na", () => {
    expect(GATE_PESO.risco).toBeGreaterThan(GATE_PESO.atencao);
    expect(GATE_PESO.atencao).toBeGreaterThan(GATE_PESO["em-curso"]);
    expect(GATE_PESO.resolvido).toBe(GATE_PESO.na);
  });
});

describe("tabuleiro (cliente configurável)", () => {
  it("EF-170 tem papel da Vale mapeado (público)", () => {
    const t = getTabuleiro(getRadarAsset("ef-170")!, "Vale");
    expect(t.mapeado).toBe(true);
    expect(t.entry.papel).toContain("EFVM");
  });

  it("EF-118 → Vale com exposição alta (desistiu da obra)", () => {
    const t = getTabuleiro(getRadarAsset("ef-118")!, "Vale");
    expect(t.mapeado).toBe(true);
    expect(t.entry.exposicao).toBe("alta");
  });

  it("FICO-FIOL sem papel mapeado → fallback neutro, sem invenção", () => {
    const t = getTabuleiro(getRadarAsset("fico-fiol")!, "Vale");
    expect(t.mapeado).toBe(false);
    expect(t.entry.exposicao).toBe("nenhuma");
  });

  it("cliente não mapeado → fallback (não vaza posição de terceiros)", () => {
    const t = getTabuleiro(getRadarAsset("ef-170")!, "OutroCliente");
    expect(t.mapeado).toBe(false);
    expect(t.entry.exposicao).toBe("nenhuma");
  });
});

describe("normalização defensiva (boundary, estilo F2)", () => {
  it("gate inválido / com acento → 'na' (não crasha o lookup)", () => {
    expect(normalizaGate("atenção")).toBe("na"); // acento → inválido
    expect(normalizaGate("xpto")).toBe("na");
    expect(normalizaGate(undefined)).toBe("na");
    expect(normalizaGate("risco")).toBe("risco"); // válido preservado
  });

  it("exposição inválida / com acento → 'nenhuma'", () => {
    expect(normalizaExposicao("média")).toBe("nenhuma"); // acento → inválido
    expect(normalizaExposicao("ALTA")).toBe("nenhuma");
    expect(normalizaExposicao("alta")).toBe("alta"); // válido preservado
  });

  it("posturaRisco é resiliente a valores inválidos (não vira NaN)", () => {
    const sujo = {
      stf: "atenção", tcu: "risco", ambiental: "xpto",
      concessionaria: "na", modelagem: "risco", notes: {},
    } as unknown as RiskVector;
    const p = posturaRisco(sujo);
    expect(["alto", "medio", "baixo"]).toContain(p); // nunca NaN
  });

  it("o EF-170 expõe risk/tabuleiro normalizados no entry", () => {
    const e = getRadarAsset("ef-170")!;
    expect(e.risk?.ambiental).toBe("risco");
    expect(e.tabuleiro?.Vale.exposicao).toBe("media");
  });
});
