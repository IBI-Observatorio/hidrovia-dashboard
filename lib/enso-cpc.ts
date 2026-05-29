// Leitor do cache de ENSO advisory (CPC/NOAA).
//
// O cache em `data/enso_cpc_cache.json` é alimentado mensalmente pelo
// `scripts/scrape-enso-cpc.py` (chamado pelo `run-pipeline-sace.bat`).
// A CPC publica a Diagnostic Discussion toda 2ª quinta-feira do mês na URL
// estável https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml
//
// Quando o cache existir, sobrescreve `previsao.enso` em `fetchPrevisao2026()`.

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface ENSOAdvisory {
  status:               string;     // "El Niño Watch", "La Niña Advisory", "Not Active", etc.
  data_emissao:         string;     // ISO yyyy-mm-dd
  sintese_pt:           string;     // texto formatado para uso direto na UI
  sintese_en:           string;     // texto original em inglês
  proxima_atualizacao?: string;     // ISO yyyy-mm-dd
  url:                  string;
  atualizado_em:        string;     // ISO datetime do último scrape
}

export function lerENSOAdvisory(): ENSOAdvisory | null {
  try {
    const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
    const caminho = join(dataDir, "enso_cpc_cache.json");
    if (!existsSync(caminho)) return null;
    return JSON.parse(readFileSync(caminho, "utf-8")) as ENSOAdvisory;
  } catch {
    return null;
  }
}
