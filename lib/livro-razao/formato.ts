// Formatação compartilhada do Livro-Razão (rótulos de modal, reais, múltiplo).
import type { Modal } from "./schema";

export const MODAL_LABEL: Record<Modal, string> = {
  ferrovia: "Ferrovia",
  rodovia: "Rodovia",
  hidrovia: "Hidrovia",
  porto: "Porto",
};

/** "R$ 1,2 bi" / "R$ 340 mi" — aproximação legível para CAPEX e faixas. */
export function reaisAprox(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(0)} mi`;
  if (v >= 1e3) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

/** "3,4×" — múltiplo de urgência formatado. */
export function multiploFmt(m: number): string {
  return `${m.toFixed(1).replace(".", ",")}×`;
}
