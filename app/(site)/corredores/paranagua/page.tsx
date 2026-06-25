import type { Metadata } from "next";
import PainelCorredorParanagua from "@/components/PainelCorredorParanagua";

// → ajuste o alias/caminho se o componente não estiver em "@/components".

export const metadata: Metadata = {
  title: "Corredor Paranaguá — Porto × Ferrovia × Frete × Espera | Observatório IBI",
  description:
    "Leitura preditiva do corredor de Paranaguá: a capacidade que o porto cria, a malha que precisa entregá-la, o frete que sobra para a estrada e o tempo de navio parado — no Índice de Tensão do Corredor (ITC).",
};

export default function PaginaCorredorParanagua() {
  return <PainelCorredorParanagua />;
}
