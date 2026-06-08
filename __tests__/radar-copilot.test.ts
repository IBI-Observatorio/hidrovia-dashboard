import { describe, it, expect } from "vitest";
import {
  extrairJSON,
  validarLevers,
  rotuloCenario,
  resolverFontes,
  numerosSemLastro,
  montarContextoExplicador,
  LEVER_RANGES,
  SISTEMA_EXPLICADOR,
} from "@/lib/radar/copilot";
import { LEVERS_NEUTROS, type SourceTag } from "@/lib/dcf";
import { analisarAtivo, avaliarCenario } from "@/lib/dcf";
import { getRadarAsset, fullAsset } from "@/lib/radar/assets";
import { alertasDoAtivo } from "@/lib/radar/alerts";
import { lerNotas, notasDoAtivo } from "@/lib/radar/notes";

// ───────────────────────── (1) tradução de 5 frases → Levers ─────────────────────────
// A tradução em si é feita pela IA (não-determinística, não chamada em teste). Aqui
// testamos o CONTRATO determinístico que cerca a IA: dado o JSON que o roteador é
// instruído a emitir para cada frase, o pipeline parse+valida produz as Levers certas.
describe("copiloto · tradução de frases → Levers (pipeline determinístico)", () => {
  const casos: { frase: string; jsonIA: string; esperado: Partial<typeof LEVERS_NEUTROS> }[] = [
    { frase: "e se o CAPEX estourar 60% e o leilão atrasar 3 anos?", jsonIA: '{"capexUplift":1.6,"slipAnos":3}', esperado: { capexUplift: 1.6, slipAnos: 3 } },
    { frase: "e se a demanda vier 20% abaixo?", jsonIA: '{"demandaHaircut":0.8}', esperado: { demandaHaircut: 0.8 } },
    { frase: "e se a tarifa subir 10%?", jsonIA: "```json\n{\"tarifaMult\":1.1}\n```", esperado: { tarifaMult: 1.1 } },
    { frase: "e se o O&M piorar 5 pontos de receita?", jsonIA: '{"omAdjPp":0.05}', esperado: { omAdjPp: 0.05 } },
    { frase: "CAPEX dobra, demanda 30% abaixo e 2 anos de atraso", jsonIA: '{"capexUplift":2.0,"demandaHaircut":0.7,"slipAnos":2}', esperado: { capexUplift: 2.0, demandaHaircut: 0.7, slipAnos: 2 } },
  ];

  for (const c of casos) {
    it(`"${c.frase}" → ${JSON.stringify(c.esperado)}`, () => {
      const parsed = extrairJSON(c.jsonIA);
      const { levers, aplicadas, invalido, clamps } = validarLevers(parsed);
      expect(invalido).toBeNull();
      expect(clamps).toHaveLength(0); // valores são todos dentro da faixa sã
      // campos esperados batem
      for (const [k, v] of Object.entries(c.esperado)) {
        expect(levers[k as keyof typeof levers]).toBeCloseTo(v as number, 6);
        expect(aplicadas).toContain(k);
      }
      // demais campos ficam NEUTROS (a IA só emite o que a frase cita)
      for (const k of Object.keys(LEVERS_NEUTROS) as (keyof typeof LEVERS_NEUTROS)[]) {
        if (!(k in c.esperado)) expect(levers[k]).toBe(LEVERS_NEUTROS[k]);
      }
    });
  }
});

// ───────────────────────── (2) validador clampa fora-de-faixa ─────────────────────────
describe("copiloto · validador clampa e rejeita não-numérico", () => {
  it("clampa cada alavanca para a faixa sã e avisa", () => {
    const fora = validarLevers({ capexUplift: 9, slipAnos: 99, demandaHaircut: 0.1, tarifaMult: 5, omAdjPp: 0.9 });
    expect(fora.invalido).toBeNull();
    expect(fora.levers.capexUplift).toBe(LEVER_RANGES.capexUplift.max);   // 9 → 5
    expect(fora.levers.slipAnos).toBe(LEVER_RANGES.slipAnos.max);         // 99 → 15
    expect(fora.levers.demandaHaircut).toBe(LEVER_RANGES.demandaHaircut.min); // 0.1 → 0.3
    expect(fora.levers.tarifaMult).toBe(LEVER_RANGES.tarifaMult.max);     // 5 → 2
    expect(fora.levers.omAdjPp).toBe(LEVER_RANGES.omAdjPp.max);           // 0.9 → 0.2
    expect(fora.clamps.length).toBe(5); // um aviso por alavanca clampada
  });

  it("slipAnos é arredondado para inteiro dentro da faixa (sem clamp)", () => {
    const v = validarLevers({ slipAnos: 2.5 });
    expect(v.levers.slipAnos).toBe(3);
    expect(v.clamps).toHaveLength(0);
  });

  it("campo NÃO-numérico ⇒ invalido (não chama o motor)", () => {
    const v = validarLevers({ slipAnos: "muito" });
    expect(v.invalido).not.toBeNull();
    expect(v.aplicadas).toHaveLength(0);
  });

  it("objeto vazio ⇒ nenhuma alavanca aplicada (rota pede reformular)", () => {
    const v = validarLevers({});
    expect(v.invalido).toBeNull();
    expect(v.aplicadas).toHaveLength(0);
  });

  it("JSON inválido ⇒ extrairJSON devolve null", () => {
    expect(extrairJSON("desculpa, não consigo")).toBeNull();
  });
});

// ───────────── (3) integridade: IA não inventa fonte nem número, e diz "sem base" ─────────────
describe("copiloto · integridade de fontes e ausência de base", () => {
  it("resolverFontes só devolve fontes REAIS (descarta índice fabricado/duplicado)", () => {
    const fontes: SourceTag[] = [{ label: "A" }, { label: "B" }];
    // índices: 1 (ok) · 5 (inexistente) · -1 (inválido) · 0 (ok) · 0 (dup) · 1.5 (não-inteiro)
    const out = resolverFontes([1, 5, -1, 0, 0, 1.5], fontes);
    expect(out).toEqual([{ label: "B" }, { label: "A" }]);
  });

  it("resolverFontes com entrada não-array ⇒ vazio", () => {
    expect(resolverFontes("0,1", [{ label: "A" }])).toEqual([]);
  });

  it("o prompt do explicador EXIGE dizer 'sem base' e proíbe inventar número/fonte", () => {
    expect(SISTEMA_EXPLICADOR).toMatch(/não há base|sem base|não.*base/i);
    expect(SISTEMA_EXPLICADOR).toMatch(/NUNCA invente número/i);
    expect(SISTEMA_EXPLICADOR).toMatch(/literalmente nos DADOS/i);
  });

  it("contexto do EF-170 traz números SÓ dos dados (déficit 1,41) e fontes reais numeradas", () => {
    const entry = getRadarAsset("ef-170")!;
    const full = fullAsset(entry);
    const analise = full ? analisarAtivo(full, { mcN: 1000, seed: 42 }) : null;
    const { contexto, fontes } = montarContextoExplicador({
      entry,
      full,
      analise,
      alertas: alertasDoAtivo("ef-170"),
      notas: notasDoAtivo(lerNotas(), "ef-170"),
    });
    expect(contexto).toContain("1,41");                 // déficit do seed (TCU)
    expect(contexto).toContain("VALORES-BASE DO MOTOR"); // origem (b) determinística
    expect(fontes.length).toBeGreaterThan(0);
    // toda fonte numerada tem um label não-vazio (nada anônimo/inventado)
    for (const f of fontes) expect(f.label.length).toBeGreaterThan(0);
  });

  it("ativo PARCIAL (sem motor) não injeta números de motor — não fabrica base", () => {
    const entry = getRadarAsset("ef-118")!;
    const full = fullAsset(entry); // null
    const { contexto } = montarContextoExplicador({
      entry,
      full,
      analise: null,
      alertas: alertasDoAtivo("ef-118"),
      notas: notasDoAtivo(lerNotas(), "ef-118"),
    });
    expect(full).toBeNull();
    expect(contexto).toContain("dados parciais");
    expect(contexto).not.toContain("VALORES-BASE DO MOTOR"); // sem motor ⇒ sem TIR
  });
});

// ───────── blindagem do explicador: todo número da prosa tem de ter lastro ─────────
describe("copiloto · blindagem do explicador (numerosSemLastro)", () => {
  const ctx = "Déficit de funding: 1,41 R$ bi. TIR oficial 11,04% | TIR realista 1,60%. ADI 6553, Lei 13.452/2017. Maio de 2026.";

  it("texto cujos números TODOS aparecem nos dados ⇒ nenhum suspeito", () => {
    const texto = "O déficit é de R$ 1,41 bi e a TIR oficial é 11,04%, contra 1,60% no realista.";
    expect(numerosSemLastro(texto, ctx)).toEqual([]);
  });

  it("número DECIMAL fabricado (não está nos dados) ⇒ flag", () => {
    const texto = "A TIR realista seria de 7,77%.";
    expect(numerosSemLastro(texto, ctx)).toContain("7,77%");
  });

  it("arredondamento de memória (1,4 vs 1,41) ⇒ flag (não casa por substring)", () => {
    expect(numerosSemLastro("O déficit é R$ 1,4 bi.", ctx)).toContain("1,4");
  });

  it("normaliza ponto decimal estilo US (11.04% casa com 11,04%) ⇒ sem flag", () => {
    expect(numerosSemLastro("A TIR é 11.04%.", ctx)).toEqual([]);
  });

  it("inteiros curtos (contagens) são ignorados — não geram falso-positivo", () => {
    expect(numerosSemLastro("São 3 motivos e 5 etapas, com 6 votos no STF.", "sem esses números aqui")).toEqual([]);
  });

  it("data/ano inventado (≥4 díg.) é pego; ano real passa", () => {
    expect(numerosSemLastro("O leilão sai em 2099.", ctx)).toContain("2099");
    expect(numerosSemLastro("Decisão de 2026.", ctx)).toEqual([]);
  });

  it("nº de lei e de ADI com lastro nos dados passam", () => {
    expect(numerosSemLastro("A Lei 13.452/2017 e a ADI 6553.", ctx)).toEqual([]);
  });

  it("contra o contexto REAL do EF-170: sourçado passa, fabricado é retido", () => {
    const entry = getRadarAsset("ef-170")!;
    const full = fullAsset(entry);
    const analise = full ? analisarAtivo(full, { mcN: 1000, seed: 42 }) : null;
    const { contexto } = montarContextoExplicador({
      entry, full, analise,
      alertas: alertasDoAtivo("ef-170"),
      notas: notasDoAtivo(lerNotas(), "ef-170"),
    });
    expect(numerosSemLastro("O déficit é de R$ 1,41 bi.", contexto)).toEqual([]);
    expect(numerosSemLastro("A TIR cairia para 9,99%.", contexto)).toContain("9,99%");
  });
});

// ───── cenário extremo: motor pode não ter TIR ⇒ a rota deve marcar "sem TIR" ─────
describe("copiloto · cenário sem TIR não vira número falso", () => {
  it("cenário extremo (CAPEX ×5 + slip 15) não tem TIR finita no motor", () => {
    const entry = getRadarAsset("ef-170")!;
    const full = fullAsset(entry)!;
    const r = avaliarCenario(full, "custom", "extremo", { ...LEVERS_NEUTROS, capexUplift: 5, slipAnos: 15 });
    // O motor não acha TIR (capital não retorna) — a rota detecta isso (semTir) e a
    // tela mostra "sem TIR", nunca um 0% fabricado. O VPL, esse, segue finito.
    expect(Number.isFinite(r.tir)).toBe(false);
    expect(Number.isFinite(r.vpl)).toBe(true);
  });
});

// ───────────────────────── rótulo do cenário ─────────────────────────
describe("copiloto · rótulo legível das alavancas", () => {
  it("descreve só as alavancas não-neutras", () => {
    expect(rotuloCenario({ ...LEVERS_NEUTROS, capexUplift: 1.6, slipAnos: 3 })).toBe("CAPEX +60%, atraso 3a");
    expect(rotuloCenario({ ...LEVERS_NEUTROS, demandaHaircut: 0.8 })).toBe("demanda −20%");
    expect(rotuloCenario({ ...LEVERS_NEUTROS })).toBe("cenário neutro");
  });
});
