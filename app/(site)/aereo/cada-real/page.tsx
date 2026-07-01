import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import CadaRealClient from "@/components/aereo/CadaRealClient";
import type { CadaRealData } from "@/lib/aereo-cada-real";

export const metadata: Metadata = {
  title: "Onde vai cada real da sua passagem — Observatório IBI",
  description:
    "A decomposição do preço de uma passagem aérea doméstica em seis camadas de custo — combustível, tributos, tarifas, operação, leasing e margem. Primeira página da vertical Setor Aéreo do Observatório IBI.",
  openGraph: {
    title: "Onde vai cada real da sua passagem — Observatório IBI",
    description:
      "Combustível e tributos somam mais da metade do preço de voar no Brasil. Veja a composição, rota a rota.",
  },
};

// Dados versionados em public/data/aereo/cada-real.json (gerado por
// scripts/gera-aereo-cada-real.mjs). Lidos no servidor e passados ao client.
async function lerDados(): Promise<CadaRealData> {
  const p = path.join(process.cwd(), "public", "data", "aereo", "cada-real.json");
  return JSON.parse(await readFile(p, "utf8")) as CadaRealData;
}

export default async function CadaRealPage() {
  const dados = await lerDados();
  return <CadaRealClient dados={dados} />;
}
