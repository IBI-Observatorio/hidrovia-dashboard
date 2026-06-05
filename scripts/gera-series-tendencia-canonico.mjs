/**
 * gera-series-tendencia-canonico.mjs — regenera as 4 séries principais (MA12) do
 * public/data/antaq/dashboard/series-tendencia.json A PARTIR do portos-series.json
 * (canônico), em vez da antaq-api. Assim o gráfico das 4 cargas no rodapé do
 * /portos/ineditas/tendencia-cargas acompanha os meses manuais (mar/abr) junto com
 * o resto. Preserva as sub-séries de cabotagem/longo curso (vêm de outra fonte).
 *
 *   node scripts/gera-series-tendencia-canonico.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const seriesPath = path.resolve(aqui, '../public/data/antaq/dashboard/portos-series.json');
const outPath = path.resolve(aqui, '../public/data/antaq/dashboard/series-tendencia.json');

const NAT = ['granel_solido', 'granel_liquido', 'carga_geral', 'conteinerizada'];

const canon = JSON.parse(readFileSync(seriesPath, 'utf8'));
const atual = JSON.parse(readFileSync(outPath, 'utf8'));

/** MA12 (média móvel de 12 meses) da série mensal de uma natureza. */
function ma12(serie) {
  const ord = [...serie].sort((a, b) => (a.data < b.data ? -1 : 1));
  const out = [];
  for (let i = 11; i < ord.length; i++) {
    let s = 0;
    for (let k = i - 11; k <= i; k++) s += ord[k].mt;
    out.push({ data: ord[i].data, ma12_mt: +(s / 12).toFixed(4) });
  }
  return out;
}

const series = { ...atual.series };           // preserva cabotagem/longo curso
for (const k of NAT) series[k] = ma12(canon.nacional_por_natureza[k] ?? []);

const out = { gerado_em: atual.gerado_em, series };
writeFileSync(outPath, JSON.stringify(out));

const ult = series.granel_solido.at(-1)?.data;
console.log(`✓ series-tendencia (4 cargas) → último mês ${ult}` +
  ` · cabotagem/longo curso preservados (${['conteinerizada_cabotagem', 'conteinerizada_longo_curso'].filter(k => series[k]).length}/2)`);
