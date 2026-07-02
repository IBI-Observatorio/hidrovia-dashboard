// API pública — LIVRO-RAZÃO (índice das fichas de projetos estruturantes).
//
// GET /api/livro-razao → { ativas, total, fichas: [{ slug, nome, modal,
//                          status, multiploUrgencia|null }], proveniencia }
//
// Read-only, sem autenticação, CORS liberado, cache curto. TUDO deriva do
// registry: `total` = FICHAS.length, `ativas` = contagemFichasAtivas(),
// `multiploUrgencia` é DERIVADO (nunca armazenado; null em em_validacao).

import { jsonRead, preflightRead } from "@/lib/api-headers";
import {
  FICHAS,
  componenteLivroRazao,
  contagemFichasAtivas,
  fichasOrdenadas,
} from "@/lib/livro-razao/registry";
import { multiploUrgencia } from "@/lib/livro-razao/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const comp = componenteLivroRazao();

  return jsonRead({
    ativas: contagemFichasAtivas(),
    total: FICHAS.length,
    fichas: fichasOrdenadas().map((f) => ({
      slug: f.slug,
      nome: f.nome,
      modal: f.modal,
      status: f.status,
      // Derivado do piso ÷ CAPEX; null quando em_validacao (sem número).
      multiploUrgencia: multiploUrgencia(f),
    })),
    // Bloco de proveniência do agregado (null quando não há ficha ativa).
    proveniencia: comp
      ? { fonte: comp.fonte, metodologia: comp.metodologia, tipo: comp.tipoProveniencia }
      : {
          fonte: "Observatório IBI — carteira de projetos estruturantes (estudos públicos)",
          metodologia:
            "Cada ficha converte estudo público em fluxo (custo diário de inação, pelo piso). Sem ficha ativa, nada entra na soma nacional.",
          tipo: "estimativa-ibi" as const,
        },
    atualizadoEm: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return preflightRead();
}
