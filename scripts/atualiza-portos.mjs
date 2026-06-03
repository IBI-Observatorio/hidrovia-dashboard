/**
 * atualiza-portos.mjs — PIPELINE ÚNICO de portos. Carregou dado novo? Roda UM comando
 * e TODOS os painéis atualizam, sempre derivados do mesmo canônico (portos-series.json).
 *
 * Faz, em ordem:
 *   1. (opcional) merge dos CSVs de mês passados em --merge
 *   2. (opcional) TEU do contêiner (--teu <csv>)  — nacional + por porto
 *   3. forecast do contêiner (ARIMA, Python)      — lib/forecast-conteiner.json
 *   4. cards de porto da home                      — public/data/antaq/home-cards.json
 *   5. séries das 4 cargas (rodapé do tendência)   — series-tendencia.json
 *
 * Os meses preliminares são detectados sozinhos de portos-series.meses_preliminares
 * (não precisa passar). O texto editorial (home.insight) é preservado.
 *
 * Exemplos:
 *   # carregar mar+abr + TEU e atualizar tudo:
 *   node scripts/atualiza-portos.mjs \
 *     --merge ../../scrapers/data/portos_mar2026.csv=2026-03 \
 *     --merge ../../scrapers/data/portos_abr2026.csv=2026-04 \
 *     --teu ../../scrapers/data/portos_teus_2026.csv
 *
 *   # só re-derivar tudo do canônico (sem carregar dado novo):
 *   node scripts/atualiza-portos.mjs
 *
 * Páginas que leem o canônico AO VIVO (/portos/movimentacao) não precisam de nada —
 * já refletem na hora. Este pipeline cuida dos derivados que precisam de cálculo.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const seriesPath = path.resolve(raiz, 'public/data/antaq/dashboard/portos-series.json');

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const merges = [];
let teuCsv = null, skipForecast = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--merge') { const [csv, mes] = argv[++i].split('='); merges.push({ csv, mes }); }
  else if (argv[i] === '--teu') { teuCsv = argv[++i]; }
  else if (argv[i] === '--skip-forecast') { skipForecast = true; }
}

const run = (cmd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { cwd: raiz, stdio: 'inherit' }); };
const passo = (n, t) => console.log(`\n━━━ ${n}. ${t} ━━━`);

// ── 1) merges ─────────────────────────────────────────────────────────────────
if (merges.length) {
  passo(1, `Merge de ${merges.length} mês(es) manual(is)`);
  for (const { csv, mes } of merges) run(`node scripts/merge-portos-manual.mjs "${csv}" ${mes}`);
} else {
  console.log('\n(sem --merge: re-derivando do canônico atual)');
}

// estado canônico depois dos merges
const canon = JSON.parse(readFileSync(seriesPath, 'utf8'));
const prelim = canon.meses_preliminares ?? [];
const ref = canon.referencia;
const refPrelim = prelim.includes(ref);
console.log(`\nCanônico: referencia=${ref} · preliminares=[${prelim.join(', ') || '—'}]`);

// ── 2) TEU ─────────────────────────────────────────────────────────────────────
if (teuCsv) {
  passo(2, 'TEU do contêiner (nacional + por porto) — sequencial, ~1-2 min');
  run(`node scripts/gera-conteiner-teu.mjs "${teuCsv}"`);
} else {
  console.log('\n(sem --teu: mantém séries de TEU como estão)');
}

// ── 3) forecast do contêiner ───────────────────────────────────────────────────
if (!skipForecast) {
  passo(3, 'Forecast do contêiner (ARIMA)');
  const s = canon.nacional_por_natureza.conteinerizada ?? [];
  const payload = { series: s.map(p => ({ serie: 'natureza:conteinerizada', data: p.data, mensal_mt: p.mt })) };
  const payloadPath = path.resolve(raiz, 'scripts/_payload_forecast.json');
  writeFileSync(payloadPath, JSON.stringify(payload));
  const flag = prelim.length ? ` --preliminar ${prelim.join(',')}` : '';
  try {
    run(`python scripts/forecast_conteiner.py --payload scripts/_payload_forecast.json --out lib/forecast-conteiner.json${flag}`);
  } finally { try { unlinkSync(payloadPath); } catch {} }
}

// ── 4) home cards (porto) ──────────────────────────────────────────────────────
passo(4, `Cards de porto da home (ref ${ref})`);
run(`node scripts/gera-home-cards-porto.mjs ${ref}${refPrelim ? ' --preliminar' : ''}`);

// ── 5) séries das 4 cargas (rodapé tendência) ──────────────────────────────────
passo(5, 'Séries das 4 cargas (MA12) do rodapé do /tendencia-cargas');
run('node scripts/gera-series-tendencia-canonico.mjs');

console.log(`\n✓ Pipeline concluído. Todos os derivados em ${ref}${refPrelim ? ' (preliminar)' : ''}.`);
console.log('  Lembrete: o texto editorial (home.insight) é preservado — revise à mão se quiser.');
console.log('  Fora do pipeline: navegação/cabotagem (dataset próprio) e o cron do dia 16 (oficial).');
