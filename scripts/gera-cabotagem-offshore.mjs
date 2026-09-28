/**
 * Gera public/data/antaq/dashboard/cabotagem-offshore.json
 * Cabotagem total vs. doméstica pura (offshore expurgado), soma móvel 12m, em Mt.
 * Alimenta o indicador 32 (/portos/cabotagem-hidrovias/cabotagem-offshore).
 * Roda no atualiza-portos.yml (dia 16) ou à mão:
 *   node scripts/gera-cabotagem-offshore.mjs
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const BASE = process.env.ANTAQ_API_URL ?? 'https://antaq-api-production.up.railway.app';

async function fetchSerie(expurgarOffshore) {
  const qs = new URLSearchParams({
    navegacao:           'Cabotagem',
    metrica:             'toneladas',
    freq:                'mensal',
    suavizacao:          'sum12',
    expurgar_offshore:   String(expurgarOffshore),
    apenas_movimentacao: 'true',
  });
  const url = `${BASE}/api/v1/series?${qs}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  const json = await r.json();
  return json.serie ?? [];
}

const [totalSerie, domSerie] = await Promise.all([fetchSerie(false), fetchSerie(true)]);
const domByDate = Object.fromEntries(domSerie.map(pt => [pt.data, pt.sum12]));

// offshore = total − doméstica; descarta meses sem soma 12m completa
const serie = totalSerie
  .filter(pt => pt.sum12 != null && domByDate[pt.data] != null)
  .map(pt => {
    const total = pt.sum12 / 1e6;
    const dom   = domByDate[pt.data] / 1e6;
    return { data: pt.data, domestica: +dom.toFixed(4), offshore: +Math.max(0, total - dom).toFixed(4) };
  })
  .sort((a, b) => a.data.localeCompare(b.data));

if (serie.length === 0) throw new Error('Série vazia — API não retornou pontos com sum12');

const out = { gerado_em: new Date().toISOString(), unidade: 'Mt (soma móvel 12m)', serie };

const destino = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/data/antaq/dashboard/cabotagem-offshore.json',
);
writeFileSync(destino, JSON.stringify(out, null, 2));
console.log(`${serie.length} pontos (${serie.at(0).data} → ${serie.at(-1).data}) · salvo em ${destino}`);
