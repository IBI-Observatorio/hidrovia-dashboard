/**
 * Gera public/data/antaq/dashboard/series-tendencia.json
 * Busca as 4 séries de MA12 mensal da API ANTAQ e salva em Mt.
 * Rodar mensalmente após a ANTAQ publicar novos dados:
 *   node scripts/gera-series-tendencia.mjs
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const BASE = process.env.ANTAQ_API_URL ?? 'https://antaq-api-production.up.railway.app';

const NATUREZAS = {
  granel_solido:  'Granel Sólido',
  granel_liquido: 'Granel Líquido e Gasoso',
  carga_geral:    'Carga Geral',
  conteinerizada: 'Carga Conteinerizada',
};

async function fetchSerie(naturezaLabel) {
  const qs = new URLSearchParams({
    natureza:             naturezaLabel,
    metrica:              'toneladas',
    freq:                 'mensal',
    suavizacao:           'ma12',
    apenas_movimentacao:  'true',
  });
  const url = `${BASE}/api/v1/series?${qs}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  const json = await r.json();
  return json.serie ?? [];
}

const out = { gerado_em: new Date().toISOString(), series: {} };

for (const [key, label] of Object.entries(NATUREZAS)) {
  process.stdout.write(`Baixando ${label}… `);
  const serie = await fetchSerie(label);
  out.series[key] = serie
    .filter(pt => pt.ma12 != null)
    .map(pt => ({ data: pt.data, ma12_mt: +(pt.ma12 / 1e6).toFixed(4) }));
  console.log(`${out.series[key].length} pontos (${out.series[key].at(0)?.data} → ${out.series[key].at(-1)?.data})`);
}

const destino = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/data/antaq/dashboard/series-tendencia.json',
);
writeFileSync(destino, JSON.stringify(out, null, 2));
console.log(`\nSalvo em ${destino}`);
