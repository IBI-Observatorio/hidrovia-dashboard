import { describe, it, expect } from "vitest";
import {
  checaIntegridade,
  violacoesFicha,
  violacoesFichas,
  violacoesRelogio,
} from "@/lib/integridade";
import { decomposicao } from "@/lib/relogio";
import type { FichaProjeto } from "@/lib/livro-razao/schema";
import type { ComponenteRelogio } from "@/lib/relogio";

// ── O registry real está íntegro (o gate fica verde) ─────────────────────────
describe("gate de integridade — estado real do produto", () => {
  it("não há nenhuma violação no registry atual", () => {
    expect(checaIntegridade()).toEqual([]);
  });

  it("todo componente do Relógio soma com fonte declarada", () => {
    for (const c of decomposicao()) {
      expect(c.fonte.trim().length).toBeGreaterThan(0);
    }
    expect(violacoesRelogio()).toEqual([]);
  });
});

// Ficha ativa válida de referência (para mutar em cada caso negativo).
const fonteOk = { titulo: "Estudo X", orgao: "Órgão Y", ano: 2024, url: "https://exemplo.gov.br/x" };
function fichaAtivaValida(): FichaProjeto {
  return {
    slug: "teste-ativa",
    nome: "Ficha de teste",
    modal: "ferrovia",
    uf: ["MT"],
    status: "ativa",
    capex: { valor: 1_000_000_000, ano_base: 2024, fonte: fonteOk },
    custoInacaoDiario: {
      piso: 1_000_000,
      teto: 3_000_000,
      ano_base: 2024,
      fonte: fonteOk,
      memoria: "conta por extenso",
    },
    fontes: [fonteOk],
    contexto: "contexto",
  };
}

// ── Regra A — ficha 'ativa' precisa de dado validado ponta a ponta ───────────
describe("regra A — ficha 'ativa' incompleta falha o gate", () => {
  it("a referência válida não gera violação", () => {
    expect(violacoesFicha(fichaAtivaValida())).toEqual([]);
  });

  it("ativa sem capex", () => {
    const f = { ...fichaAtivaValida(), capex: null };
    expect(violacoesFicha(f).some((v) => v.regra.includes("sem capex"))).toBe(true);
  });

  it("ativa sem custoInacaoDiario", () => {
    const f = { ...fichaAtivaValida(), custoInacaoDiario: null };
    expect(violacoesFicha(f).some((v) => v.regra.includes("sem custoInacaoDiario"))).toBe(true);
  });

  it("piso > teto", () => {
    const base = fichaAtivaValida();
    const f = { ...base, custoInacaoDiario: { ...base.custoInacaoDiario!, piso: 5_000_000, teto: 1_000_000 } };
    expect(violacoesFicha(f).some((v) => v.regra.includes("> teto"))).toBe(true);
  });

  it("fonte do custo sem URL", () => {
    const base = fichaAtivaValida();
    const f = {
      ...base,
      custoInacaoDiario: { ...base.custoInacaoDiario!, fonte: { ...fonteOk, url: null } },
    };
    expect(violacoesFicha(f).some((v) => v.regra.includes("custo de inação sem URL"))).toBe(true);
  });

  it("fonte do CAPEX sem URL", () => {
    const base = fichaAtivaValida();
    const f = { ...base, capex: { ...base.capex!, fonte: { ...fonteOk, url: null } } };
    expect(violacoesFicha(f).some((v) => v.regra.includes("CAPEX sem URL"))).toBe(true);
  });
});

// ── Regra C — derivado armazenado é violação ─────────────────────────────────
describe("regra C — multiploUrgencia (derivado) não pode ser armazenado", () => {
  it("ficha com multiploUrgencia gravado falha o gate", () => {
    const f = { ...fichaAtivaValida(), multiploUrgencia: 3.4 } as unknown as FichaProjeto;
    expect(violacoesFicha(f).some((v) => v.regra.includes("multiploUrgencia"))).toBe(true);
  });

  it("nenhuma ficha REAL armazena campos derivados", () => {
    expect(violacoesFichas().filter((v) => v.regra.includes("derivado"))).toEqual([]);
  });
});

// ── Regra B — módulo do Relógio sem fonte falha o gate ───────────────────────
describe("regra B — módulo do Relógio sem fonte declarada", () => {
  it("componente com fonte vazia é violação", () => {
    const falso: ComponenteRelogio = {
      modulo: "fantasma",
      nome: "Módulo sem fonte",
      rota: "/fantasma",
      taxa: 100,
      participacao: 10,
      fonte: "",
      metodologia: "—",
      tipoProveniencia: "estimativa-ibi",
    };
    const v = violacoesRelogio([falso]);
    expect(v.length).toBe(1);
    expect(v[0].escopo).toBe("relogio");
  });
});
