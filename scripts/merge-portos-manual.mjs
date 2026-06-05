/**
 * merge-portos-manual.mjs — injeta UM mês de movimentação portuária à mão no
 * dataset canônico public/data/antaq/dashboard/portos-series.json.
 *
 * Use quando a antaq-api ainda não publicou o mês mais recente e você precisa
 * carregar os números manualmente (coleta direta + estimativas IBI). NÃO substitui
 * o gera-portos-series.mjs: quando a API alcançar o mês, o cron do dia 16 regenera
 * o JSON inteiro e SOBRESCREVE este mês com o oficial (comportamento esperado).
 *
 * Entrada: um CSV com cabeçalho
 *   escopo,porto,uf,natureza_key,natureza_label,toneladas_<mes>,origem
 * onde escopo ∈ {PORTO, NACIONAL}, natureza_key ∈ {granel_solido, granel_liquido,
 * carga_geral, conteinerizada}, toneladas em toneladas cruas, origem ∈
 * {primário, extrapolado}. Linhas em branco ou começando com # são ignoradas.
 *
 * Saída: anexa/atualiza o ponto {data:'<AAAA-MM>', mt} em cada série porto×natureza
 * e no nacional_por_natureza. Pontos com origem=extrapolado recebem est:true.
 * O mês entra em meses_preliminares (a página usa isso para o aviso "preliminar").
 * Idempotente: rodar de novo substitui o ponto do mês, não duplica.
 *
 *   node scripts/merge-portos-manual.mjs <caminho-do-csv> <AAAA-MM>
 *   ex.: node scripts/merge-portos-manual.mjs ../scrapers/data/portos_mar2026.csv 2026-03
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const NAT_KEYS = ['granel_solido', 'granel_liquido', 'carga_geral', 'conteinerizada'];

const [, , csvArg, mesArg] = process.argv;
if (!csvArg || !/^\d{4}-\d{2}$/.test(mesArg ?? '')) {
  console.error('uso: node scripts/merge-portos-manual.mjs <caminho-csv> <AAAA-MM>');
  process.exit(1);
}

const aqui = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(aqui, csvArg);
const jsonPath = path.resolve(aqui, '../public/data/antaq/dashboard/portos-series.json');

// ── parse CSV (simples: sem vírgula dentro de campo, como no template) ──────────
function parseCSV(txt) {
  const linhas = txt.replace(/^﻿/, '').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const header = linhas.shift().split(',').map(s => s.trim());
  const iTon = header.findIndex(h => /^toneladas/i.test(h));
  const idx = {
    escopo: header.indexOf('escopo'), porto: header.indexOf('porto'),
    key: header.indexOf('natureza_key'), ton: iTon, origem: header.indexOf('origem'),
  };
  return linhas.map(l => {
    const c = l.split(',');
    return {
      escopo: c[idx.escopo]?.trim(),
      porto: c[idx.porto]?.trim(),
      key: c[idx.key]?.trim(),
      ton: Number(c[idx.ton]),
      origem: (c[idx.origem]?.trim() || 'primário').toLowerCase(),
    };
  });
}

const rows = parseCSV(readFileSync(csvPath, 'utf8'));
const data = JSON.parse(readFileSync(jsonPath, 'utf8'));

const portoIndex = new Map(data.portos.map(p => [p.porto, p]));

/** Insere/atualiza o ponto do mês numa série, mantendo ordem cronológica. */
function upsert(serie, mt, est) {
  const ponto = est ? { data: mesArg, mt, est: true } : { data: mesArg, mt };
  const i = serie.findIndex(p => p.data === mesArg);
  if (i >= 0) serie[i] = ponto; else serie.push(ponto);
  serie.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

const stats = { portos: 0, nacional: 0, prim: 0, est: 0, naoMapeados: new Set(), chaveInvalida: new Set() };

for (const r of rows) {
  if (!r.key || !NAT_KEYS.includes(r.key)) { if (r.key) stats.chaveInvalida.add(r.key); continue; }
  if (!Number.isFinite(r.ton)) continue;
  const mt = +(r.ton / 1e6).toFixed(4);
  // REAL apenas quando a origem começa com "primário"; tudo o mais (extrapolado,
  // claude-estimado, estimado, …) é estimativa → est:true. (Robusto p/ tags futuras.)
  const est = !/^\s*prim[aá]rio/i.test(r.origem ?? '');

  if (r.escopo === 'NACIONAL') {
    (data.nacional_por_natureza[r.key] ??= []);
    upsert(data.nacional_por_natureza[r.key], mt, est);
    stats.nacional++;
  } else {
    const p = portoIndex.get(r.porto);
    if (!p) { stats.naoMapeados.add(r.porto); continue; }
    (p.naturezas[r.key] ??= []);
    upsert(p.naturezas[r.key], mt, est);
    stats.portos++;
  }
  if (est) stats.est++; else stats.prim++;
}

// ── metadados ───────────────────────────────────────────────────────────────
data.referencia = mesArg;
data.gerado_em = data.gerado_em; // preservado; carga manual não regera tudo
data.meses_preliminares = [...new Set([...(data.meses_preliminares ?? []), mesArg])].sort();
data.carga_manual = {
  ...(data.carga_manual ?? {}),
  [mesArg]: {
    fonte: 'IBI — coleta manual + estimativas (antaq-api ainda sem o mês)',
    arquivo: path.basename(csvPath),
    pontos: stats.portos + stats.nacional,
    estimados: stats.est,
  },
};

writeFileSync(jsonPath, JSON.stringify(data));

// ── relatório ─────────────────────────────────────────────────────────────────
console.log(`✓ ${mesArg} mesclado em ${path.relative(process.cwd(), jsonPath)}`);
console.log(`  portos: ${stats.portos} pontos · nacional: ${stats.nacional} pontos`);
console.log(`  origem: ${stats.prim} primário · ${stats.est} estimado`);
console.log(`  referencia → ${data.referencia} · meses_preliminares: ${data.meses_preliminares.join(', ')}`);
if (stats.naoMapeados.size)
  console.warn(`  ⚠ portos NÃO encontrados no JSON (ignorados): ${[...stats.naoMapeados].join('; ')}`);
if (stats.chaveInvalida.size)
  console.warn(`  ⚠ natureza_key inválida (ignorada): ${[...stats.chaveInvalida].join('; ')}`);
