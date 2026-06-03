// Atribuição de fonte para os dados de movimentação portuária.
// Os meses carregados à mão (IBI) vêm de portos-series.meses_preliminares; quando a
// ANTAQ publica um mês, ele sai dessa lista e a atribuição muda SOZINHA. Mesma lógica
// (e mesmo formato) do scripts/gera-fonte-indicadores.mjs — manter em sincronia.

const MES_ABREV = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

/** "fev. 2026" a partir de "2026-02". */
export function mesAnoAbrev(ym: string): string {
  return `${MES_ABREV[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
}

/** Lista os meses IBI como "mar. e abr. 2026" (ano uma vez se todos do mesmo ano). */
export function listaMesesIBI(meses: string[]): string {
  if (!meses.length) return "";
  const arr = [...meses].sort();
  const umAno = new Set(arr.map((m) => m.slice(0, 4))).size === 1;
  const partes = umAno ? arr.map((m) => MES_ABREV[+m.slice(5, 7) - 1]) : arr.map(mesAnoAbrev);
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
  return umAno ? `${lista} ${arr[0].slice(0, 4)}` : lista;
}

/**
 * "ANTAQ — Estatística Aquaviária (2010 – fev. 2026) - IBI (mar. e abr. 2026)".
 * Sem meses preliminares, retorna só o trecho ANTAQ.
 */
export function fonteAntaqIbi(mesesTodos: string[], preliminares: string[]): string {
  if (!mesesTodos.length) return "ANTAQ — Estatística Aquaviária";
  const ordenados = [...mesesTodos].sort();
  const prelim = new Set(preliminares);
  const oficiais = ordenados.filter((m) => !prelim.has(m));
  const anoIni = ordenados[0].slice(0, 4);
  const ultOf = oficiais.at(-1) ?? ordenados.at(-1)!;
  const base = `ANTAQ — Estatística Aquaviária (${anoIni} – ${mesAnoAbrev(ultOf)})`;
  return preliminares.length ? `${base} - IBI (${listaMesesIBI(preliminares)})` : base;
}
