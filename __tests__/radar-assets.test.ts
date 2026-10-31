import { describe, it, expect } from "vitest";
import { RADAR_ASSETS, getRadarAsset, fullAsset, normalizaMaturacao } from "@/lib/radar/assets";
import { ESTAGIOS, classificaRegime } from "@/lib/radar/maturation";

describe("registro único de ativos", () => {
  it("tem os 4 ativos, só o EF-170 completo", () => {
    expect(RADAR_ASSETS).toHaveLength(4);
    expect(RADAR_ASSETS.filter((a) => a.completo).map((a) => a.id)).toEqual(["ef-170"]);
  });

  it("getRadarAsset resolve por id e undefined p/ inexistente", () => {
    expect(getRadarAsset("ef-170")?.name).toContain("Ferrogrão");
    expect(getRadarAsset("inexistente")).toBeUndefined();
  });

  it("fullAsset devolve Asset só p/ completo, null p/ parcial", () => {
    expect(fullAsset(getRadarAsset("ef-170")!)).not.toBeNull();
    expect(fullAsset(getRadarAsset("fico-fiol")!)).toBeNull();
  });

  it("todos os seeds têm estagioAtual dentro da faixa válida", () => {
    for (const a of RADAR_ASSETS) {
      if (a.maturacao) {
        expect(a.maturacao.estagioAtual).toBeGreaterThanOrEqual(0);
        expect(a.maturacao.estagioAtual).toBeLessThan(ESTAGIOS.length);
      }
    }
  });

  // Curadoria de 14/10/2026: nenhum dos 4 ativos tem edital publicado. "Iminente"
  // exige estágio ≥ Edital; se um seed voltar a marcar Edital sem edital no ar,
  // este teste avisa. Quando um edital sair de fato, atualize a lista abaixo.
  it("nenhum ativo aparece 'Iminente' sem edital publicado", () => {
    const comEditalPublicado: string[] = [];
    for (const a of RADAR_ASSETS) {
      if (!a.maturacao || comEditalPublicado.includes(a.id)) continue;
      expect(a.maturacao.estagioAtual, a.id).toBeLessThan(ESTAGIOS.indexOf("Edital"));
      expect(classificaRegime(a.maturacao), a.id).not.toBe("iminente");
    }
  });
});

describe("normalizaMaturacao — validação defensiva", () => {
  it("clampa estagioAtual fora da faixa", () => {
    expect(normalizaMaturacao({ estagioAtual: 99, gateRisk: "alto" })!.estagioAtual).toBe(
      ESTAGIOS.length - 1,
    );
    expect(normalizaMaturacao({ estagioAtual: -3, gateRisk: "alto" })!.estagioAtual).toBe(0);
  });

  it("cai p/ 'medio' quando gateRisk é inválido", () => {
    expect(normalizaMaturacao({ estagioAtual: 1, gateRisk: "xpto" })!.gateRisk).toBe("medio");
  });

  it("leilaoAnunciado inválido/null vira null", () => {
    expect(normalizaMaturacao({ estagioAtual: 1, leilaoAnunciado: "abc" })!.leilaoAnunciado).toBeNull();
    expect(normalizaMaturacao({ estagioAtual: 1 })!.leilaoAnunciado).toBeNull();
  });

  it("undefined/não-objeto → undefined", () => {
    expect(normalizaMaturacao(undefined)).toBeUndefined();
    expect(normalizaMaturacao("x")).toBeUndefined();
  });
});
