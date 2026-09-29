// Formata um delta em cm ("+12 cm", "−5 cm") ou "—" quando não há dado do
// mesmo dia no ano de referência (ver lib/deltas-anuais.ts). Sem `fs`: pode
// ser usado em client components.
export function fmtDeltaCm(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v >= 0 ? "+" : ""}${v} cm`;
}
