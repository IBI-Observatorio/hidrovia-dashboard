// Leitor server-side da série IDN gerada pelo pipeline ANA.
// Lê data/ana-idn-series.json de forma síncrona (chamado de Server Components).
// Produzido por: node scripts/seed-idn-series.mjs (seed inicial)
//                node scripts/atualiza-idn-series.mjs (atualização semanal)

import { readFileSync } from "fs";
import { join } from "path";

export interface PontoIDN {
  data: string;
  idn: number;
  fonte: "hidroweb" | "boletim" | "ana_api";
}

export interface SerieIDN {
  gerado_em: string;
  serie: PontoIDN[];
}

export function lerSerieIDN(): SerieIDN {
  try {
    const caminho = join(process.cwd(), "data", "ana-idn-series.json");
    const raw = readFileSync(caminho, "utf-8");
    return JSON.parse(raw) as SerieIDN;
  } catch {
    // Arquivo não existe ainda (antes do primeiro seed) — retorna série vazia
    return { gerado_em: new Date().toISOString(), serie: [] };
  }
}
