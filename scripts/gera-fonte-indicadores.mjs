/**
 * gera-fonte-indicadores.mjs — mantém AUTOMÁTICO o rótulo de Fonte/Atualização dos
 * indicadores de porto, derivando do canônico portos-series.json.
 *
 * Fonte fica: "ANTAQ — Estatística Aquaviária (2010 – <último mês OFICIAL>)" e,
 * se houver meses carregados à mão (meses_preliminares), acrescenta
 * " - IBI (<meses preliminares>)". Quando a ANTAQ publica um mês (ele sai de
 * meses_preliminares), o intervalo ANTAQ avança e o trecho IBI encolhe sozinho.
 *
 * Ex.: oficial até fev/2026 + IBI mar,abr →
 *   "ANTAQ — Estatística Aquaviária (2010 – fev. 2026) - IBI (mar. e abr. 2026)"
 *
 *   node scripts/gera-fonte-indicadores.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const seriesPath = path.resolve(aqui, '../public/data/antaq/dashboard/portos-series.json');
// indicadores que usam a base de movimentação de porto (ANTAQ Estatística Aquaviária)
const alvos = ['31-tendencia-cargas.json'];

const MES_ABREV = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const fmtMesAno = (ym) => `${MES_ABREV[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;   // "fev. 2026"

const ps = JSON.parse(readFileSync(seriesPath, 'utf8'));
const meses = (ps.nacional_por_natureza.granel_solido ?? []).map((p) => p.data).sort();
const anoInicial = meses[0]?.slice(0, 4) ?? '2010';
const prelimSet = new Set(ps.meses_preliminares ?? []);
const oficiais = meses.filter((m) => !prelimSet.has(m));
const ultimoOficial = oficiais.at(-1) ?? meses.at(-1);
const prelim = [...prelimSet].sort();

// "mar. e abr. 2026" (ano uma vez se todos do mesmo ano; senão lista cada mês com ano)
function fmtPreliminares(arr) {
  const umAno = new Set(arr.map((m) => m.slice(0, 4))).size === 1;
  const partes = umAno
    ? arr.map((m) => MES_ABREV[+m.slice(5, 7) - 1])
    : arr.map(fmtMesAno);
  const lista = partes.length === 1 ? partes[0]
    : `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
  return umAno ? `${lista} ${arr[0].slice(0, 4)}` : lista;
}

const fonte = `ANTAQ — Estatística Aquaviária (${anoInicial} – ${fmtMesAno(ultimoOficial)})`
  + (prelim.length ? ` - IBI (${fmtPreliminares(prelim)})` : '');

// "Última geração" = mês de referência (sem o ponto, no padrão "mmm/aaaa")
const ref = ps.referencia;
const ultimaAtualizacao = `${MES_ABREV[+ref.slice(5, 7) - 1].replace('.', '')}/${ref.slice(0, 4)}`;

for (const arq of alvos) {
  const p = path.resolve(aqui, '../public/data/antaq/indicadores', arq);
  const ind = JSON.parse(readFileSync(p, 'utf8'));
  ind.fonte = fonte;
  ind.ultima_atualizacao = ultimaAtualizacao;
  writeFileSync(p, JSON.stringify(ind, null, 2) + '\n');
  console.log(`✓ ${arq}`);
}
console.log(`  fonte: ${fonte}`);
console.log(`  ultima_atualizacao: ${ultimaAtualizacao}`);
