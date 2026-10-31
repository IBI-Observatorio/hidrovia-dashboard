// PNL 2050 — leitura e cruzamentos da base extraída do relatório oficial.
//
// Fonte: public/data/pnl2050/pnl2050.json, gerado por
// scripts/pnl2050/extrai_pnl2050.py a partir do PDF do PNL 2050 (ver
// docs/pnl2050-spec.md e docs/RUNBOOK-DADOS.md). Nada aqui produz número novo:
// só conta e cruza o que o próprio plano publicou.

import { readFileSync } from "fs";
import path from "path";

export type Nivel = "Baixo" | "Médio" | "Alto" | "Muito alto";

export type CategoriaObjetivo =
  | "EXP" | "DOM" | "ABA" | "PSAT" | "PEXC" | "ABR" | "DEM" | "OPP" | "OPR";

export type Objetivo = {
  chave: string; // ex.: "EXP-9"
  categoria: CategoriaObjetivo;
  id: number;
  enunciado: string;
  pagina_pdf: number;
};

export type ModalEmpreendimento = "rodovia" | "ferrovia" | "hidrovia" | "porto" | "aeroporto";

export type Empreendimento = {
  id: number;
  modal: ModalEmpreendimento;
  detalhe: string | null;
  tipo: string | null;
};

export type Intervencao = {
  nome: string;
  jurisdicao: string;
  modal: ModalEmpreendimento | "misto";
  empreendimentos: Empreendimento[];
};

export type Contribuicao = { chave: string; nivel: Nivel; descricao: string };

export type TipoEixo = "aquaviario" | "ferroviario" | "rodoviario" | "intermodal" | "banco";

export type Eixo = {
  codigo: string;
  nome: string;
  cenario: "meta" | "banco";
  tipo: TipoEixo;
  qtd_declarada: number;
  qtd_extraida: number;
  pagina_pdf: number;
  intervencoes: Intervencao[];
  objetivos: Contribuicao[];
};

export type BasePNL = {
  fonte: { titulo: string; orgao: string; data: string; arquivo: string; sha256: string };
  gerado_em: string;
  categorias: Record<CategoriaObjetivo, { rotulo: string; quantidade: number }>;
  objetivos: Objetivo[];
  eixos: Eixo[];
};

let cache: BasePNL | null = null;

export function basePNL(): BasePNL {
  if (!cache) {
    const p = path.join(process.cwd(), "public", "data", "pnl2050", "pnl2050.json");
    cache = JSON.parse(readFileSync(p, "utf8")) as BasePNL;
  }
  return cache;
}

export const ORDEM_NIVEL: Nivel[] = ["Baixo", "Médio", "Alto", "Muito alto"];

export function eixosMeta(b = basePNL()): Eixo[] {
  return b.eixos.filter((e) => e.cenario === "meta");
}

export function eixosBanco(b = basePNL()): Eixo[] {
  return b.eixos.filter((e) => e.cenario === "banco");
}

export function getEixo(codigo: string, b = basePNL()): Eixo | undefined {
  return b.eixos.find((e) => e.codigo.toLowerCase() === codigo.toLowerCase());
}

/** Quais eixos atendem cada objetivo, e em que nível. */
export function coberturaPorObjetivo(
  eixos: Eixo[],
): Map<string, { codigo: string; nivel: Nivel }[]> {
  const m = new Map<string, { codigo: string; nivel: Nivel }[]>();
  for (const e of eixos) {
    for (const c of e.objetivos) {
      const lista = m.get(c.chave) ?? [];
      lista.push({ codigo: e.codigo, nivel: c.nivel });
      m.set(c.chave, lista);
    }
  }
  return m;
}

/** Objetivos que nenhum eixo do conjunto atende. */
export function orfaos(eixos: Eixo[], b = basePNL()): Objetivo[] {
  const cob = coberturaPorObjetivo(eixos);
  return b.objetivos.filter((o) => !cob.has(o.chave));
}

/** Cobertura frágil: um único eixo, e só em nível Médio ou Baixo. */
export function coberturaFragil(eixos: Eixo[], b = basePNL()): { objetivo: Objetivo; codigo: string; nivel: Nivel }[] {
  const cob = coberturaPorObjetivo(eixos);
  const saida: { objetivo: Objetivo; codigo: string; nivel: Nivel }[] = [];
  for (const o of b.objetivos) {
    const l = cob.get(o.chave);
    if (l && l.length === 1 && ORDEM_NIVEL.indexOf(l[0].nivel) <= ORDEM_NIVEL.indexOf("Médio")) {
      saida.push({ objetivo: o, codigo: l[0].codigo, nivel: l[0].nivel });
    }
  }
  return saida;
}

export function totaisCenarioMeta(b = basePNL()) {
  const meta = eixosMeta(b);
  const porTipo: Record<string, number> = {};
  for (const e of meta) porTipo[e.tipo] = (porTipo[e.tipo] ?? 0) + 1;
  return {
    objetivos: b.objetivos.length,
    eixos: meta.length,
    eixosBanco: eixosBanco(b).length,
    intervencoes: meta.reduce((s, e) => s + e.qtd_extraida, 0),
    porTipo,
  };
}
