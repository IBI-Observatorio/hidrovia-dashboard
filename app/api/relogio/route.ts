// API pública — RELÓGIO DA INFRAESTRUTURA (o motor como produto).
//
// GET /api/relogio → { taxaPorSegundo, equivalenteDiario, decomposicao[],
//                      atualizadoEm, fontes[] }
//
// Read-only, sem autenticação, CORS liberado, cache curto. TUDO deriva de
// lib/relogio.ts (que por sua vez deriva do registry): nada de número
// hardcoded aqui. Cada componente carrega seu bloco de proveniência
// (fonte + tipo), e o topo agrega a lista de fontes (deduplicada).

import { jsonRead, preflightRead } from "@/lib/api-headers";
import {
  decomposicao,
  equivalenteDiario,
  taxaNacional,
  type ComponenteRelogio,
} from "@/lib/relogio";

// Deriva do registry a cada request; o cache curto fica no cabeçalho de borda.
export const dynamic = "force-dynamic";

export async function GET() {
  const componentes = decomposicao();

  // Bloco de proveniência agregado: uma linha por fonte declarada pelos módulos
  // (deduplicada). Não inventamos órgão/URL onde o módulo só declara `fonte`.
  const fontes = Array.from(
    new Map(
      componentes.map((c: ComponenteRelogio) => [
        c.fonte,
        { modulo: c.modulo, fonte: c.fonte, tipo: c.tipoProveniencia },
      ]),
    ).values(),
  );

  return jsonRead({
    taxaPorSegundo: taxaNacional(),
    equivalenteDiario: equivalenteDiario(),
    decomposicao: componentes.map((c) => ({
      modulo: c.modulo,
      nome: c.nome,
      rota: c.rota,
      taxaPorSegundo: c.taxa,
      participacao: c.participacao,
      // proveniência do componente
      fonte: c.fonte,
      metodologia: c.metodologia,
      tipoProveniencia: c.tipoProveniencia,
    })),
    fontes,
    atualizadoEm: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return preflightRead();
}
