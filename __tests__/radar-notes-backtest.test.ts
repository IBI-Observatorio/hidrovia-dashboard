import { describe, it, expect } from "vitest";
import {
  lerNotas,
  notasDoAtivo,
  parseBlocos,
  segmentosInline,
} from "@/lib/radar/notes";
import { alertasDoAtivo, ALERTAS } from "@/lib/radar/alerts";
import {
  previsoesDoAtivo,
  statusPrevisao,
  taxaAcerto,
  type Previsao,
} from "@/lib/radar/backtest";

import { fmtData } from "@/lib/radar/format";

describe("fmtData — precisão variável de data", () => {
  it("AAAA-MM-DD → dd/mm/aaaa", () => {
    expect(fmtData("2026-05-21")).toBe("21/05/2026");
  });
  it("AAAA-MM → mm/aaaa", () => {
    expect(fmtData("2025-11")).toBe("11/2025");
  });
  it("AAAA (só ano) → AAAA, sem 'undefined'", () => {
    expect(fmtData("2020")).toBe("2020");
    expect(fmtData("2020")).not.toContain("undefined");
  });
});

describe("notas (boletins md)", () => {
  it("lê os boletins de content/notes e ordena por data desc", () => {
    const notas = lerNotas();
    expect(notas.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < notas.length; i++) {
      expect(notas[i - 1].date >= notas[i].date).toBe(true);
    }
    expect(notas.every((n) => n.title && n.date)).toBe(true);
  });

  it("filtra por ativo (id marcado ou global 'all')", () => {
    const notas = lerNotas();
    const doEf170 = notasDoAtivo(notas, "ef-170");
    expect(doEf170.some((n) => n.assets.includes("ef-170"))).toBe(true);
    // o boletim 'all' (pipeline) aparece p/ qualquer ativo
    expect(notasDoAtivo(notas, "ef-118").some((n) => n.assets.includes("all"))).toBe(true);
  });

  it("parseBlocos separa heading, lista e parágrafo", () => {
    const blocos = parseBlocos("## Título\n\nUm parágrafo.\n\n- a\n- b");
    expect(blocos[0]).toEqual({ tipo: "h2", texto: "Título" });
    expect(blocos[1].tipo).toBe("p");
    expect(blocos[2]).toEqual({ tipo: "ul", itens: ["a", "b"] });
  });

  it("segmentosInline marca **negrito**", () => {
    const segs = segmentosInline("normal **forte** fim");
    expect(segs).toContainEqual({ b: true, t: "forte" });
    expect(segs.filter((s) => !s.b).length).toBeGreaterThan(0);
  });
});

describe("alertas", () => {
  it("alertasDoAtivo filtra e ordena por data desc", () => {
    const a = alertasDoAtivo("ef-170");
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((x) => x.asset === "ef-170")).toBe(true);
    for (let i = 1; i < a.length; i++) expect(a[i - 1].date >= a[i].date).toBe(true);
  });
  it("todo alerta tem kind válido", () => {
    expect(ALERTAS.every((a) => ["regime", "estagio", "gate"].includes(a.kind))).toBe(true);
  });
});

describe("backtest (track record auditável)", () => {
  it("previsão sem veredito = pendente; com veredito = o veredito", () => {
    expect(statusPrevisao({ veredito: undefined } as Previsao)).toBe("pendente");
    expect(statusPrevisao({ veredito: "erro" } as Previsao)).toBe("erro");
  });

  it("taxaAcerto: parcial conta meio ponto, pendentes não entram", () => {
    const ps: Previsao[] = [
      { date: "2025", asset: "x", metric: "pleilao", autor: "Oficial", veredito: "acerto", texto: "" },
      { date: "2025", asset: "x", metric: "pleilao", autor: "Oficial", veredito: "parcial", texto: "" },
      { date: "2025", asset: "x", metric: "pleilao", autor: "Oficial", veredito: "erro", texto: "" },
      { date: "2026", asset: "x", metric: "tir", autor: "Observatório", texto: "" }, // pendente
    ];
    const t = taxaAcerto(ps);
    expect(t.resolvidas).toBe(3);
    expect(t.pendentes).toBe(1);
    expect(t.taxa).toBeCloseTo((1 + 0.5) / 3, 6); // 50%
  });

  it("calls do Observatório ficam em aberto (sem veredito = não infla acerto)", () => {
    const obs = previsoesDoAtivo("ef-170").filter((p) => p.autor === "Observatório");
    expect(obs.length).toBeGreaterThan(0);
    expect(obs.every((p) => statusPrevisao(p) === "pendente")).toBe(true);
  });

  it("previsões oficiais do EF-170 estão resolvidas e sourçadas", () => {
    const of = previsoesDoAtivo("ef-170").filter((p) => p.autor === "Oficial");
    expect(of.length).toBeGreaterThan(0);
    expect(of.every((p) => p.veredito && p.fonte)).toBe(true);
  });
});
