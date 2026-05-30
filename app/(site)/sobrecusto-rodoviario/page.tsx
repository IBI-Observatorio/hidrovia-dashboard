import type { Metadata } from "next";
import SobrecustoDashboard from "./SobrecustoDashboard";

export const metadata: Metadata = {
  title: "O custo silencioso da rodovia | Observatório IBI",
  description:
    "Análise quantitativa do sobrecusto rodoviário nos corredores Ferrogrão (EF-170) e EF-118. Quanto o Brasil paga por ano em frete evitável.",
  openGraph: {
    title: "O custo silencioso da rodovia | Observatório IBI",
    description:
      "Análise quantitativa do sobrecusto rodoviário nos corredores Ferrogrão (EF-170) e EF-118.",
    type: "article",
  },
};

export default function Page() {
  return <SobrecustoDashboard />;
}
