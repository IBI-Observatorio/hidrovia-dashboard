import { describe, it, expect } from "vitest";
import {
  basePNL,
  coberturaFragil,
  eixosBanco,
  eixosMeta,
  orfaos,
  totaisCenarioMeta,
} from "@/lib/pnl2050/dados";

// A base extraída precisa reproduzir os totais que o próprio PNL 2050 declara.
describe("PNL 2050 — base extraída bate com o relatório", () => {
  const base = basePNL();

  it("112 objetivos, com a contagem declarada por categoria", () => {
    expect(base.objetivos).toHaveLength(112);
    for (const [cat, { quantidade }] of Object.entries(base.categorias)) {
      expect(base.objetivos.filter((o) => o.categoria === cat)).toHaveLength(quantidade);
    }
  });

  it("31 eixos no cenário-meta (12 R · 8 F · 4 A · 7 I) e 11 no banco", () => {
    expect(eixosMeta(base)).toHaveLength(31);
    expect(eixosBanco(base)).toHaveLength(11);
    expect(totaisCenarioMeta(base).porTipo).toEqual({
      aquaviario: 4,
      ferroviario: 8,
      rodoviario: 12,
      intermodal: 7,
    });
  });

  it("cada ficha reproduz a Qtd. declarada, salvo a divergência documentada do R007", () => {
    for (const e of base.eixos) {
      if (e.codigo === "R007") {
        expect([e.qtd_declarada, e.qtd_extraida]).toEqual([24, 25]);
      } else {
        expect(e.qtd_extraida, e.codigo).toBe(e.qtd_declarada);
      }
    }
  });

  it("todo nível de contribuição aponta para um objetivo existente", () => {
    const chaves = new Set(base.objetivos.map((o) => o.chave));
    for (const e of base.eixos) for (const c of e.objetivos) expect(chaves.has(c.chave), `${e.codigo} ${c.chave}`).toBe(true);
  });
});

describe("PNL 2050 — órfãos (conferidos à mão contra o PDF em 27/09/2026)", () => {
  it("8 objetivos sem nenhum eixo, nem no banco de projetos", () => {
    const todos = [...eixosMeta(), ...eixosBanco()];
    expect(orfaos(todos).map((o) => o.chave).sort()).toEqual(
      ["ABR-17", "ABR-4", "ABR-9", "DOM-15", "EXP-18", "EXP-9", "PEXC-2", "PEXC-3"].sort(),
    );
  });

  it("cobertura frágil no cenário-meta: açúcar de AL (R006) e combustíveis do PR (I005)", () => {
    expect(coberturaFragil(eixosMeta()).map((f) => `${f.objetivo.chave}:${f.codigo}`).sort()).toEqual(
      ["DOM-11:I005", "EXP-13:R006"],
    );
  });
});

// Fichas conferidas item a item contra a imagem do PDF (28/09/2026).
describe("PNL 2050 — fichas conferidas contra o PDF", () => {
  const niveis = (codigo: string) =>
    Object.fromEntries(basePNL().eixos.find((e) => e.codigo === codigo)!.objetivos.map((o) => [o.chave, o.nivel]));

  it("A002 (págs. 358–359): 16 contribuições com os níveis da ficha", () => {
    expect(niveis("A002")).toEqual({
      "EXP-1": "Muito alto", "EXP-2": "Muito alto", "EXP-5": "Muito alto", "EXP-14": "Muito alto",
      "ABA-1": "Muito alto", "ABA-4": "Muito alto",
      "DEM-8": "Médio", "DEM-11": "Médio", "DEM-12": "Médio",
      "ABR-1": "Muito alto", "ABR-2": "Alto", "ABR-3": "Alto", "ABR-6": "Muito alto",
      "ABR-10": "Alto", "ABR-11": "Alto", "ABR-16": "Muito alto",
    });
  });

  it("A004: itens 13 e 15 do bloco de oportunidades (erro do PDF) contam como ABR-13 e ABR-15", () => {
    const a004 = niveis("A004");
    expect(a004["ABR-13"]).toBe("Muito alto");
    expect(a004["ABR-15"]).toBe("Muito alto");
  });

  it("cabeçalhos de passageiros com grafia variante não perdem itens (F005, I001)", () => {
    expect(niveis("F005")).toMatchObject({ "PSAT-1": "Alto", "PSAT-2": "Muito alto" });
    expect(niveis("I001")).toMatchObject({ "PEXC-1": "Muito alto", "PEXC-4": "Muito alto", "PEXC-5": "Muito alto" });
  });
});
