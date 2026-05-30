/**
 * Gera public/data/antaq/dashboard/portos-series.json — DATASET CANÔNICO de
 * movimentação portuária real (porto × natureza × mês), direto da API ANTAQ.
 *
 * Substitui a modelagem por CAGR + sazonal: aqui é tonelagem OBSERVADA, mês a mês,
 * até o último mês publicado pela ANTAQ (hoje fev/2026).
 *
 * Consumido por: app/(site)/portos/movimentacao/page.tsx (dataset canônico).
 *
 * Rodar mensalmente após a ANTAQ publicar novos dados:
 *   node scripts/gera-portos-series.mjs
 *
 * Variáveis de ambiente:
 *   ANTAQ_API_URL   — base da API (default: produção no Railway)
 *   TOP_N           — nº de portos a incluir por volume 12m (default: 50)
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const BASE  = process.env.ANTAQ_API_URL ?? 'https://antaq-api-production.up.railway.app';
const TOP_N = Number(process.env.TOP_N ?? 50);
// A API roda numa instância única (DuckDB, 1 conexão). Sob rajada ela pode
// reiniciar (container Railway, start-period ~15s) e devolver 500 por dezenas de
// segundos. Concorrência baixa + backoff longo (cobre um restart completo) + pausa
// entre fases mantém o job estável.
const CONCURRENCIA = 2;
const RETRIES = 8;          // backoff acumulado ~90s, cobre restart do container
const PAUSA_ENTRE_FASES = 15000;
// Sempre passar janela: sem ela, a query porto×natureza varre o histórico inteiro
// (desde 2005) e a borda do Railway derruba com 500 "Application failed to respond".
const DATA_INICIO = process.env.DATA_INICIO ?? '2010-01';
let REFERENCIA = '2026-02'; // sobrescrito em main() pelo /saude (último mês ANTAQ)

// chave interna → string exata da natureza na API
const NATUREZAS = {
  granel_solido:  'Granel Sólido',
  granel_liquido: 'Granel Líquido e Gasoso',
  carga_geral:    'Carga Geral',
  conteinerizada: 'Carga Conteinerizada',
};

// ── helpers de fetch ────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(pathname, params) {
  const qs = params ? '?' + new URLSearchParams(params) : '';
  const url = `${BASE}${pathname}${qs}`;
  let ultimoErro;
  for (let tentativa = 1; tentativa <= RETRIES; tentativa++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
      // 5xx = sobrecarga transitória da instância → vale retry com backoff
      if (r.status >= 500 && tentativa < RETRIES) {
        ultimoErro = new Error(`HTTP ${r.status}`);
        await sleep(2500 * tentativa);   // backoff: 2.5s, 5s, 7.5s, … (~90s total)
        continue;
      }
      throw new Error(`HTTP ${r.status} — ${url}`);
    } catch (e) {
      ultimoErro = e;
      if (tentativa < RETRIES) { await sleep(2500 * tentativa); continue; }
      throw new Error(`${e.message} — ${url}`);
    }
  }
  throw ultimoErro;
}

/** Série mensal bruta (toneladas) para um conjunto de filtros. Retorna [{data, mt}]. */
async function serieMensal(filtros) {
  const json = await api('/api/v1/series', {
    metrica: 'toneladas',
    freq: 'mensal',
    suavizacao: 'bruto',
    apenas_movimentacao: 'true',
    data_inicio: DATA_INICIO,
    data_fim: REFERENCIA,
    ...filtros,
  });
  return (json.serie ?? [])
    .filter(pt => pt.valor != null)
    .map(pt => ({ data: pt.data, mt: +(pt.valor / 1e6).toFixed(4) }));
}

/** Executa tarefas (thunks) com limite de concorrência, preservando a ordem. */
async function comLimite(tarefas, limite) {
  const resultados = new Array(tarefas.length);
  let proximo = 0;
  async function worker() {
    while (proximo < tarefas.length) {
      const i = proximo++;
      resultados[i] = await tarefas[i]();
    }
  }
  await Promise.all(Array.from({ length: limite }, worker));
  return resultados;
}

// ── pipeline ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`API: ${BASE}`);

  // 1) saúde + último mês
  const saude = await api('/api/v1/saude');
  const referencia = saude.ultimo_mes_dados;
  REFERENCIA = referencia;
  console.log(`Último mês ANTAQ: ${referencia} · ${saude.linhas_carga?.toLocaleString('pt-BR')} linhas`);

  // 2) lista de portos
  const meta = await api('/api/v1/metadados');
  const portosMeta = meta.portos;
  console.log(`Portos no catálogo: ${portosMeta.length}. Rankeando por volume 12m…`);

  // 3) ranking por volume 12m (sum12, último ponto) — 1 chamada por porto.
  //    Janela curta (~24m): sum12 só precisa dos últimos 12 meses; varrer o
  //    histórico inteiro para 253 portos sobrecarrega a instância.
  const rankIni = `${Number(referencia.slice(0, 4)) - 2}-01`;
  let feitos = 0;
  const ranking = await comLimite(
    portosMeta.map(p => async () => {
      try {
        const json = await api('/api/v1/series', {
          metrica: 'toneladas', freq: 'mensal', suavizacao: 'sum12',
          apenas_movimentacao: 'true', porto: p.nome,
          data_inicio: rankIni, data_fim: referencia,
        });
        const ultimo = (json.serie ?? []).at(-1);
        return { ...p, vol12m: ultimo?.sum12 ? ultimo.sum12 / 1e6 : 0 };
      } catch {
        return { ...p, vol12m: 0 };
      } finally {
        if (++feitos % 50 === 0) process.stdout.write(`  …${feitos}/${portosMeta.length}\n`);
      }
    }),
    CONCURRENCIA,
  );

  const top = ranking
    .filter(p => p.vol12m > 0)
    .sort((a, b) => b.vol12m - a.vol12m)
    .slice(0, TOP_N);

  console.log(`Top ${top.length}: ${top.slice(0, 5).map(p => `${p.nome} (${p.vol12m.toFixed(1)} Mt)`).join(', ')}…`);

  // Deixa a instância respirar após a rajada do ranking antes da próxima fase.
  console.log(`Pausa de ${PAUSA_ENTRE_FASES / 1000}s para a API recuperar…`);
  await sleep(PAUSA_ENTRE_FASES);

  // 4) série mensal por porto × natureza (top N × 4)
  const pares = [];
  for (const p of top)
    for (const [key, nat] of Object.entries(NATUREZAS))
      pares.push({ porto: p, key, nat });

  console.log(`Baixando ${pares.length} séries porto×natureza…`);
  let baixados = 0;
  const series = await comLimite(
    pares.map(({ porto, key, nat }) => async () => {
      const serie = await serieMensal({ porto: porto.nome, natureza: nat });
      if (++baixados % 40 === 0) process.stdout.write(`  …${baixados}/${pares.length}\n`);
      return { portoNome: porto.nome, key, serie };
    }),
    CONCURRENCIA,
  );

  // 5) agregado nacional por natureza (4 chamadas)
  console.log('Baixando agregados nacionais por natureza…');
  const nacional = {};
  for (const [key, nat] of Object.entries(NATUREZAS))
    nacional[key] = await serieMensal({ natureza: nat });

  // 6) montar saída
  const porPorto = new Map();
  for (const p of top) porPorto.set(p.nome, { porto: p.nome, uf: p.uf, regiao: p.regiao, vol12m_mt: +p.vol12m.toFixed(2), naturezas: {} });
  for (const { portoNome, key, serie } of series) porPorto.get(portoNome).naturezas[key] = serie;

  const out = {
    gerado_em: new Date().toISOString(),
    referencia,
    fonte: 'ANTAQ — Estatística Aquaviária (via antaq-api)',
    metrica: 'toneladas (Mt)',
    top_n: top.length,
    portos: [...porPorto.values()],
    nacional_por_natureza: nacional,
  };

  const destino = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../public/data/antaq/dashboard/portos-series.json',
  );
  writeFileSync(destino, JSON.stringify(out));
  console.log(`\n✓ Salvo: ${destino}`);
  console.log(`  ${out.portos.length} portos · ref ${referencia} · ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
}

main().catch(e => { console.error('FALHOU:', e); process.exit(1); });
