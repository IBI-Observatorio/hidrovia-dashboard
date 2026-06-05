/**
 * gera-conteiner-teu.mjs — adiciona ao portos-series.json as séries de
 * contêiner em TEU, usadas quando a unidade selecionada para Conteinerizada é TEU:
 *   • data.nacional_conteiner_teu        — série nacional (KPIs + bloco acumulado)
 *   • data.portos[i].teu_conteiner       — série por porto (ranking)
 *
 * Fonte:
 *   • histórico: antaq-api (metrica=teu, natureza=Carga Conteinerizada)
 *   • meses ainda não publicados pela ANTAQ (carga manual): nacional vem da linha
 *     NACIONAL do CSV de TEU; por porto é DERIVADO da tonelagem de contêiner do
 *     próprio porto × (TEU nacional / tonelada nacional) do mês — todos est:true.
 *
 *   node scripts/gera-conteiner-teu.mjs <caminho-csv-teu>
 *   ex.: node scripts/gera-conteiner-teu.mjs ../../scrapers/data/portos_teus_2026.csv
 *
 * Idempotente. ⚠️ Sobrescrito quando gera-portos-series.mjs regenera o JSON —
 * re-rode este depois (ver RUNBOOK).
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const BASE = process.env.ANTAQ_API_URL ?? 'https://antaq-api-production.up.railway.app';
// ⚠️ CONCORRÊNCIA 1 obrigatória: a API roda DuckDB com 1 conexão; em paralelo as
// respostas se CRUZAM (porto A volta com dados do porto B). Sequencial é correto.
const CONCURRENCIA = 1;
const RETRIES = 6;
const aqui = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(aqui, '../public/data/antaq/dashboard/portos-series.json');
const csvArg = process.argv[2];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(params) {
  const qs = new URLSearchParams(params);
  for (let t = 1; t <= RETRIES; t++) {
    try {
      const r = await fetch(`${BASE}/api/v1/series?${qs}`);
      if (r.ok) return r.json();
      if (r.status >= 500 && t < RETRIES) { await sleep(2000 * t); continue; }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (t < RETRIES) { await sleep(2000 * t); continue; } throw e; }
  }
}

async function serieTeu(filtros, dataFim) {
  const j = await api({
    metrica: 'teu', freq: 'mensal', suavizacao: 'bruto', apenas_movimentacao: 'true',
    natureza: 'Carga Conteinerizada', data_inicio: '2010-01', data_fim: dataFim, ...filtros,
  });
  return (j.serie ?? []).filter(p => p.valor != null).map(p => ({ data: p.data, teu: Math.round(p.valor) }));
}

async function comLimite(tarefas, limite) {
  const res = new Array(tarefas.length); let i = 0;
  async function w() { while (i < tarefas.length) { const k = i++; res[k] = await tarefas[k](); } }
  await Promise.all(Array.from({ length: limite }, w));
  return res;
}

/** Linha NACIONAL do CSV de TEU manual → { 'AAAA-MM': teu }. */
function nacionalManual(csvPath) {
  const linhas = readFileSync(csvPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const header = linhas.shift().split(',');
  const MES = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  const cols = header.map((h, i) => {
    const m = h.match(/teus?_([a-z]{3})(\d{4})/i);
    return m ? { i, ym: `${m[2]}-${MES[m[1].toLowerCase()]}` } : null;
  }).filter(Boolean);
  const out = {};
  for (const l of linhas) {
    const c = l.split(',');
    if (c[0]?.trim().toUpperCase() !== 'NACIONAL') continue;
    for (const { i, ym } of cols) { const v = Number(c[i]); if (Number.isFinite(v) && v > 0) out[ym] = v; }
  }
  return out;
}

// Nome do CSV de TEU → nome canônico no portos-series.json. Combos vão para o porto
// de contêiner principal; não-canônicos/residual ficam de fora (null).
const ALIAS_TEU = {
  'Santos (sem DPW)': 'Santos',
  'DP World Santos': 'DP World Santos',
  'Itapoá': 'Porto Itapoá Terminais Portuários',
  'Paranaguá': 'Paranaguá',
  'Portonave': 'Portonave - Terminais Portuários de Navegantes',
  'Rio Grande': 'Rio Grande',
  'Chibatão': 'Porto Chibatão',
  'Suape': 'Suape',
  'Salvador': 'Salvador',
  'Rio de Janeiro + Itaguaí': 'Rio de Janeiro',
  'Pecém': 'Terminal Portuário do Pecém',
  'Vila do Conde': 'Vila do Conde',
  'São Francisco do Sul': 'São Francisco do Sul',
  'Itaqui': 'Itaqui',
  // fora dos 48 canônicos (descartados): Super Terminais, Itajaí (APMI), Fortaleza, Demais portos
};

/**
 * Linhas PORTO do CSV de TEU → Map<portoCanônico, { 'AAAA-MM': {teu, est} }>.
 * Parse ancorado na direita (o nome do porto pode ter vírgulas). REAL só quando a
 * origem começa com "primário"; o resto é estimativa (est:true).
 */
function teusPorPortoManual(csvPath) {
  const linhas = readFileSync(csvPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const header = linhas.shift().split(',');
  const MES = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  // meses (na ordem das colunas teus_*), p/ casar com os valores ancorados à direita
  const meses = header.map(h => { const m = h.match(/teus?_([a-z]{3})(\d{4})/i); return m ? `${m[2]}-${MES[m[1].toLowerCase()]}` : null; }).filter(Boolean);
  const nMeses = meses.length;
  const out = new Map();
  const naoMapeados = new Set();
  for (const l of linhas) {
    const c = l.split(',');
    if (c[0]?.trim().toUpperCase() !== 'PORTO') continue;
    const origem = (c[c.length - 1] ?? '').trim();
    const nome = c.slice(1, c.length - (nMeses + 2)).join(',').trim();   // entre 'uf' e os valores
    const canon = ALIAS_TEU[nome];
    if (!canon) { naoMapeados.add(nome); continue; }
    const est = !/^\s*prim[aá]rio/i.test(origem);
    // valores: ancorados à direita, antes de 'origem' (mesma ordem de `meses`)
    const vals = c.slice(c.length - (nMeses + 1), c.length - 1).map(Number);
    const rec = out.get(canon) ?? {};
    meses.forEach((ym, i) => { const v = vals[i]; if (Number.isFinite(v) && v > 0) rec[ym] = { teu: Math.round(v), est }; });
    out.set(canon, rec);
  }
  return { porPorto: out, naoMapeados: [...naoMapeados] };
}

async function main() {
  const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const refApi = '2026-02'; // último mês oficial conhecido da API (saude.ultimo_mes_dados)

  // ── 1) nacional ──────────────────────────────────────────────────────────
  const nac = await serieTeu({}, refApi);
  const ultimoApi = nac.at(-1)?.data ?? refApi;
  const manuais = csvArg ? nacionalManual(path.resolve(aqui, csvArg)) : {};
  const mesesManuais = Object.keys(manuais).filter(m => m > ultimoApi).sort();
  const nacMap = new Map(nac.map(p => [p.data, { data: p.data, teu: p.teu }]));
  for (const ym of mesesManuais) nacMap.set(ym, { data: ym, teu: manuais[ym], est: true });
  const nacSerie = [...nacMap.values()].sort((a, b) => (a.data < b.data ? -1 : 1));
  data.nacional_conteiner_teu = nacSerie;
  console.log(`Nacional TEU: ${nacSerie.length} pts (até ${ultimoApi} oficial; manual: ${mesesManuais.join(', ') || '—'})`);

  // ── 2) por porto (API) — REBUILD LIMPO, SEQUENCIAL ────────────────────────
  // Snapshot só para fallback em FALHA de rede (≠ resposta vazia, que é autoritativa:
  // porto sem contêiner). Sequencial garante que a resposta casa com o request.
  const prevOficial = new Map(
    data.portos.filter(p => p.teu_conteiner)
      .map(p => [p.porto, p.teu_conteiner.filter(x => !x.est).map(x => ({ data: x.data, teu: x.teu }))]),
  );
  const oficialPorPorto = new Map();
  console.log(`Puxando TEU de ${data.portos.length} portos (sequencial)…`);
  let feitos = 0, falhas = 0;
  for (const p of data.portos) {
    let serie = null;
    try { serie = await serieTeu({ porto: p.porto }, refApi); }
    catch { serie = null; }
    if (serie === null) {                         // falha de rede → preserva anterior se houver
      falhas++;
      const prev = prevOficial.get(p.porto);
      if (prev?.length) oficialPorPorto.set(p.porto, prev);
    } else if (serie.length) {                    // sucesso com contêiner
      oficialPorPorto.set(p.porto, serie);
    }                                             // sucesso vazio → porto sem contêiner (não grava)
    if (++feitos % 10 === 0) process.stdout.write(`  …${feitos}/${data.portos.length}\n`);
  }
  console.log(`Cobertura: ${oficialPorPorto.size} portos com TEU` + (falhas ? ` · ${falhas} falhas de rede` : ''));

  // ── 3) meses manuais por porto ─────────────────────────────────────────────
  //  PREFERE o TEU por porto do CSV (dado real do IBI, mapeado ao nome canônico).
  //  Onde o CSV não tem o porto, cai no fallback: participação no TEU nacional dos
  //  últimos 3 meses oficiais × nacional manual do mês.
  const { porPorto: teuCsv, naoMapeados } = csvArg
    ? teusPorPortoManual(path.resolve(aqui, csvArg))
    : { porPorto: new Map(), naoMapeados: [] };
  if (teuCsv.size) console.log(`TEU por porto do CSV: ${teuCsv.size} portos mapeados` + (naoMapeados.length ? ` · fora dos canônicos (ignorados): ${naoMapeados.join('; ')}` : ''));

  const ultimos3 = nac.slice(-3).map(p => p.data);          // últimos 3 meses oficiais
  const nacUlt3 = ultimos3.reduce((s, ym) => s + (nacMap.get(ym)?.teu ?? 0), 0);
  let comTeu = 0, doCsv = 0, doShare = 0;
  for (const p of data.portos) {
    delete p.teu_conteiner;
    const serie = oficialPorPorto.get(p.porto) ?? [];
    const map = new Map(serie.map(x => [x.data, { data: x.data, teu: x.teu }]));
    const portoUlt3 = ultimos3.reduce((s, ym) => s + (map.get(ym)?.teu ?? 0), 0);
    const share = nacUlt3 > 0 ? portoUlt3 / nacUlt3 : 0;
    const rec = teuCsv.get(p.porto);
    for (const ym of mesesManuais) {
      if (rec?.[ym] != null) {                                   // 1º: valor real do CSV
        map.set(ym, rec[ym].est ? { data: ym, teu: rec[ym].teu, est: true } : { data: ym, teu: rec[ym].teu });
        doCsv++;
      } else if (share > 0 && manuais[ym] > 0) {                 // 2º: fallback por participação
        map.set(ym, { data: ym, teu: Math.round(share * manuais[ym]), est: true });
        doShare++;
      }
    }
    const finalSerie = [...map.values()].sort((a, b) => (a.data < b.data ? -1 : 1));
    if (finalSerie.length) { p.teu_conteiner = finalSerie; comTeu++; }
  }
  console.log(`Por porto: ${comTeu} portos com TEU · meses manuais: ${doCsv} do CSV, ${doShare} por participação`);

  writeFileSync(jsonPath, JSON.stringify(data));
  const prelim = nacSerie.filter(p => p.est).map(p => p.data);
  console.log(`✓ salvo · nacional ${nacSerie.length} pts · ${comTeu} portos` + (prelim.length ? ` · preliminares: ${prelim.join(', ')}` : ''));
}

main().catch(e => { console.error('FALHOU:', e); process.exit(1); });
