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
  granel_solido:  { natureza: 'Granel Sólido' },
  granel_liquido: { natureza: 'Granel Líquido e Gasoso' },
  carga_geral:    { natureza: 'Carga Geral' },
  conteinerizada: { natureza: 'Carga Conteinerizada' },
  // Contêiner segmentado por tipo de navegação (mercados com drivers distintos)
  conteinerizada_cabotagem:   { natureza: 'Carga Conteinerizada', navegacao: 'Cabotagem' },
  conteinerizada_longo_curso: { natureza: 'Carga Conteinerizada', navegacao: 'Longo Curso' },
};

async function fetchSerie(filtros) {
  const qs = new URLSearchParams({
    metrica:              'toneladas',
    freq:                 'mensal',
    suavizacao:           'ma12',
    apenas_movimentacao:  'true',
    ...filtros,
  });
  const url = `${BASE}/api/v1/series?${qs}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  const json = await r.json();
  return json.serie ?? [];
}

const out = { gerado_em: new Date().toISOString(), series: {} };

for (const [key, filtros] of Object.entries(NATUREZAS)) {
  const label = filtros.navegacao ? `${filtros.natureza} (${filtros.navegacao})` : filtros.natureza;
  process.stdout.write(`Baixando ${label}… `);
  const serie = await fetchSerie(filtros);
  // Descarta pontos anteriores a jan/2011 (warm-up incompleto da MA12 — valores espúrios)
  out.series[key] = serie
    .filter(pt => pt.ma12 != null && pt.data >= '2011-01')
    .map(pt => ({ data: pt.data, ma12_mt: +(pt.ma12 / 1e6).toFixed(4) }));
  console.log(`${out.series[key].length} pontos (${out.series[key].at(0)?.data} → ${out.series[key].at(-1)?.data})`);
}

const destino = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/data/antaq/dashboard/series-tendencia.json',
);
writeFileSync(destino, JSON.stringify(out, null, 2));
console.log(`\nSalvo em ${destino}`);
