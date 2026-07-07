// API pública — LIVRO-RAZÃO, ficha individual.
//
// GET /api/livro-razao/[slug] → ficha completa (só campos públicos).
//   • ficha 'ativa'       → capex, custoInacaoDiario (piso/teto/memória),
//                           taxaPorSegundo, valorAnualPiso, multiploUrgencia
//                           (todos DERIVADOS do schema), + fontes.
//   • ficha 'em_validacao' → SEM números: capex/custoInacaoDiario/derivados null.
//   • slug inexistente     → 404.
//
// Read-only, CORS liberado, cache curto. Nada hardcoded: tudo vem do registry.

import { jsonRead, preflightRead } from "@/lib/api-headers";
import { getFicha } from "@/lib/livro-razao/registry";
import {
  fichaAtiva,
  multiploUrgencia,
  taxaPorSegundoFicha,
  valorAnualPiso,
} from "@/lib/livro-razao/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const f = getFicha(slug);

  if (!f) {
    return jsonRead({ erro: "ficha não encontrada", slug }, 404);
  }

  // Campos comuns (públicos em qualquer estado).
  const base = {
    slug: f.slug,
    nome: f.nome,
    modal: f.modal,
    uf: f.uf,
    status: f.status,
    contexto: f.contexto,
    fontes: f.fontes,
    atualizadoEm: new Date().toISOString(),
  };

  // em_validacao NUNCA expõe número — a integridade depende disso.
  if (!fichaAtiva(f)) {
    return jsonRead({
      ...base,
      capex: null,
      custoInacaoDiario: null,
      multiploUrgencia: null,
      taxaPorSegundo: null,
      valorAnualPiso: null,
    });
  }

  return jsonRead({
    ...base,
    capex: f.capex,
    custoInacaoDiario: f.custoInacaoDiario,
    // Todos DERIVADOS do schema — nunca armazenados na ficha.
    multiploUrgencia: multiploUrgencia(f),
    taxaPorSegundo: taxaPorSegundoFicha(f),
    valorAnualPiso: valorAnualPiso(f),
  });
}

export async function OPTIONS() {
  return preflightRead();
}
