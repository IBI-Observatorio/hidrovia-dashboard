/**
 * gera-home-cards-porto.mjs — recalcula a seção `porto` do public/data/antaq/home-cards.json
 * (os 5 cards: Total + 4 naturezas) a partir do dataset canônico portos-series.json.
 *
 * Cada card: valor = tonelagem do mês de referência (Mt); delta = variação a/a do mês
 * (vs mesmo mês do ano anterior); serie = 14 meses; share = % do total no mês.
 * Contêiner traz o TEU do mês no share (de nacional_conteiner_teu).
 *
 * NÃO mexe na seção `navegacao` (cabotagem — fonte/cadência própria) nem em `porto.insight`
 * (texto editorial; passe --insight "..." para trocar, senão é preservado).
 *
 *   node scripts/gera-home-cards-porto.mjs [AAAA-MM] [--insight "texto"] [--preliminar]
 *   ex.: node scripts/gera-home-cards-porto.mjs 2026-04 --preliminar
 *
 * Sem AAAA-MM usa portos-series.referencia. --preliminar marca o período como
 * estimativa IBI (quando o mês ainda não é oficial da ANTAQ).
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const seriesPath = path.resolve(aqui, '../public/data/antaq/dashboard/portos-series.json');
const cardsPath = path.resolve(aqui, '../public/data/antaq/home-cards.json');

const args = process.argv.slice(2);
const ref = args.find(a => /^\d{4}-\d{2}$/.test(a));
const preliminar = args.includes('--preliminar');
const insightArg = (() => { const i = args.indexOf('--insight'); return i >= 0 ? args[i + 1] : null; })();

const MESES_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const MES_ABREV = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const NAT = [
  { label: 'Granel Sólido', key: 'granel_solido', dec: 1 },
  { label: 'Granel Líquido', key: 'granel_liquido', dec: 1 },
  { label: 'Carga Geral', key: 'carga_geral', dec: 1 },
  { label: 'Contêiner', key: 'conteinerizada', dec: 1 },
];

const series = JSON.parse(readFileSync(seriesPath, 'utf8'));
const cards = JSON.parse(readFileSync(cardsPath, 'utf8'));
const N = series.nacional_por_natureza;
const REF = ref ?? series.referencia;

const mtMes = (key, ym) => N[key].find(p => p.data === ym)?.mt ?? 0;
const totalMes = ym => NAT.reduce((s, n) => s + mtMes(n.key, ym), 0);
// mesmo mês do ANO ANTERIOR (base do a/a)
const mesAnoAnterior = ym => { const [y, m] = ym.split('-').map(Number); return `${y - 1}-${String(m).padStart(2, '0')}`; };
function serie14(fn) {
  const todas = N.granel_solido.map(p => p.data).filter(d => d <= REF);
  return todas.slice(-14).map(ym => +fn(ym).toFixed(2));
}
function fmtDelta(yoy) {
  if (yoy == null) return { delta: '—', tendencia: 'flat' };
  const up = yoy >= 0;
  return { delta: `${up ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1).replace('.', ',')}%`, tendencia: up ? 'up' : 'down' };
}
function yoy(valorAtual, valorAnterior) {
  return valorAnterior > 0 ? (valorAtual / valorAnterior - 1) * 100 : null;
}

const refTotal = totalMes(REF);
const modos = [];

// Total
{
  const v = refTotal, prev = totalMes(mesAnoAnterior(REF));
  modos.push({
    label: 'Total', valor: +v.toFixed(0), decimais: 0, ...fmtDelta(yoy(v, prev)),
    share: '100% — todas as naturezas', serie: serie14(totalMes),
  });
}
// naturezas
for (const n of NAT) {
  const v = mtMes(n.key, REF), prev = mtMes(n.key, mesAnoAnterior(REF));
  let share = `${(refTotal > 0 ? v / refTotal * 100 : 0).toFixed(1).replace('.', ',')}% do total`;
  if (n.key === 'conteinerizada') {
    const teu = series.nacional_conteiner_teu?.find(p => p.data === REF)?.teu;
    if (teu) share += ` · ≈${(teu / 1e6).toFixed(2).replace('.', ',')} mi TEU`;
  }
  modos.push({
    label: n.label, valor: +v.toFixed(n.dec), decimais: n.dec, ...fmtDelta(yoy(v, prev)),
    share, serie: serie14(ym => mtMes(n.key, ym)),
  });
}

const [y, m] = REF.split('-').map(Number);
cards.porto.modos = modos;
cards.porto.periodo = `${MESES_PT[m - 1]} ${y} · vs ${MES_ABREV[m - 1]} ${y - 1} · ANTAQ${preliminar ? ' (preliminar)' : ''}`;
cards.porto.ultimaAtualizacao = REF;
if (insightArg != null) cards.porto.insight = insightArg;

writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + '\n');
console.log(`✓ home-cards porto → ${REF}${preliminar ? ' (preliminar)' : ''}`);
for (const mo of modos) console.log(`  ${mo.label.padEnd(15)} ${String(mo.valor).padStart(6)} ${mo.delta}  ${mo.share}`);
console.log(`  insight: ${insightArg != null ? '(atualizado)' : '(preservado)'}`);
