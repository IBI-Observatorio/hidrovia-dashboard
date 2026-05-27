// Pipeline semanal: busca últimos 30 dias na API ANA e recalcula IDN.
// Usa lib/percentis-doy.ts para contextualizar cada leitura via DOY.
//
// Uso: node scripts/atualiza-idn-series.mjs
// Requer: HIDRO_IDENTIFICADOR e HIDRO_SENHA em .env.local

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Constantes de domínio ──────────────────────────────────────────────────

const ESTACOES_NORTE = {
  SGC:         "14320001",
  Curicuriari: "14330000",
  Serrinha:    "14420000",
  Moura:       "14840000",
  Caracarai:   "14710000",
};
const ESTACOES_SUL = {
  Abuna:       "15320002",
  PortoVelho:  "15400000",
  Humaita:     "15630000",
  Manicore:    "15700000",
  Labrea:      "13870000",
};
const PESOS_NORTE = { SGC: 0.30, Curicuriari: 0.20, Serrinha: 0.20, Moura: 0.05, Caracarai: 0.25 };
const PESOS_SUL   = { Abuna: 0.15, PortoVelho: 0.20, Humaita: 0.15, Manicore: 0.20, Labrea: 0.30 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function diaDoAno(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) {
    console.warn("[aviso] .env.local não encontrado — esperando vars de ambiente já definidas");
    return;
  }
  const src = readFileSync(path, "utf-8");
  for (const line of src.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

function log(msg) {
  const linha = `[${new Date().toISOString()}] ${msg}`;
  console.log(linha);
  try {
    mkdirSync(join(ROOT, "logs"), { recursive: true });
    appendFileSync(join(ROOT, "logs/idn-pipeline.log"), linha + "\n", "utf-8");
  } catch {
    // log file write failure is non-fatal
  }
}

// ─── Carrega percentis DOY ───────────────────────────────────────────────────

function carregaPercentisDOY() {
  const src = readFileSync(join(ROOT, "lib/percentis-doy.ts"), "utf-8");
  const m = src.match(/PERCENTIS_DOY[^=]*=\s*({[\s\S]*?});/);
  if (!m) throw new Error("PERCENTIS_DOY não encontrado em lib/percentis-doy.ts");
  // eval: arquivo é auto-gerado, sem código arbitrário. Suporta trailing commas e null.
  // eslint-disable-next-line no-eval
  return eval(`(${m[1]})`);
}

// ─── Autenticação ANA ────────────────────────────────────────────────────────

async function autenticaANA() {
  const id   = process.env.HIDRO_IDENTIFICADOR;
  const senha = process.env.HIDRO_SENHA;
  if (!id || !senha) throw new Error("HIDRO_IDENTIFICADOR e/ou HIDRO_SENHA não definidos");

  const resp = await fetch(
    "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/OAUth/v1",
    { headers: { Identificador: id, Senha: senha } }
  );
  if (!resp.ok) throw new Error(`Auth ANA: ${resp.status} ${resp.statusText}`);
  const json = await resp.json();
  const token = json?.items?.tokenautenticacao ?? json?.tokenautenticacao;
  if (!token) throw new Error(`Token ANA não encontrado na resposta: ${JSON.stringify(json).slice(0, 200)}`);
  return token;
}

// ─── Busca série telemetrada ANA ─────────────────────────────────────────────

async function buscaSerie(token, codigos) {
  const url = new URL(
    "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v2"
  );
  url.searchParams.set("Codigos_Estacoes",         codigos.join(","));
  url.searchParams.set("Tipo Filtro Data",          "DATA_LEITURA");
  url.searchParams.set("Range Intervalo de busca",  "DIAS_30");

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`ANA série: ${resp.status} ${resp.statusText}`);
  return await resp.json();
}

// ─── Processa resposta da API ─────────────────────────────────────────────────

// Agrupa readings por estação e dia, filtrando QC=0.
// Retorna: Map<nomeEstacao, Map<"YYYY-MM-DD", number_cota_m>>
function processaResposta(json, mapa_codigo_nome) {
  const por_estacao = new Map(); // nome -> Map<date, cota_m>

  const itens = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);
  for (const item of itens) {
    const codigo = String(item?.codigoestacao ?? item?.Codigo_Estacao ?? item?.codigo_estacao ?? "").trim();
    const nome   = mapa_codigo_nome[codigo];
    if (!nome) continue;

    // Filtro QC: apenas status "0" (bom)
    const status = String(item?.Cota_Adotada_Status ?? item?.status ?? "").trim();
    if (status !== "0") continue;

    const cota_cm = parseFloat(item?.Cota_Adotada ?? item?.cota_adotada);
    if (isNaN(cota_cm)) continue;
    const cota_m = cota_cm / 100;

    // Data: "YYYY-MM-DDTHH:MM:SS" ou "DD/MM/YYYY HH:MM:SS"
    let raw_data = item?.Data_Hora_Medicao ?? item?.data_hora_medicao ?? "";
    let iso_data;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw_data)) {
      iso_data = raw_data.slice(0, 10);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(raw_data)) {
      const [d, m, y] = raw_data.slice(0, 10).split("/");
      iso_data = `${y}-${m}-${d}`;
    } else {
      continue;
    }

    if (!por_estacao.has(nome)) por_estacao.set(nome, new Map());
    const leituras = por_estacao.get(nome);
    // Acumula para depois calcular média diária
    if (!leituras.has(iso_data)) leituras.set(iso_data, []);
    leituras.get(iso_data).push(cota_m);
  }

  // Converte listas → média diária
  const resultado = new Map();
  for (const [nome, leituras] of por_estacao) {
    const medias = new Map();
    for (const [data, vals] of leituras) {
      medias.set(data, vals.reduce((s, v) => s + v, 0) / vals.length);
    }
    resultado.set(nome, medias);
  }
  return resultado;
}

// ─── Calcula MA-7d ───────────────────────────────────────────────────────────

// Recebe Map<date, cota_m> (pode incluir dados históricos para seed)
// Retorna Map<date, ma7>
function calculaMA7(series_dia) {
  const datas = Array.from(series_dia.keys()).sort();
  const ma7 = new Map();
  for (const iso of datas) {
    const dt = new Date(iso + "T00:00:00Z");
    const vals = [];
    for (let k = 0; k < 7; k++) {
      const dp = new Date(dt);
      dp.setUTCDate(dp.getUTCDate() - k);
      const v = series_dia.get(isoDate(dp));
      if (v == null) break; // gap — não consegue calcular MA7 completa
      vals.push(v);
    }
    if (vals.length === 7) {
      ma7.set(iso, vals.reduce((s, v) => s + v, 0) / vals.length);
    }
  }
  return ma7;
}

// ─── Calcula posição relativa (DOY) ──────────────────────────────────────────

function posicaoRelativa(cota_m, nome_estacao, iso_data, PERCENTIS_DOY) {
  const doy = diaDoAno(iso_data);
  const p = PERCENTIS_DOY[nome_estacao];
  if (!p) return null;
  const p10 = p.p10[doy];
  const p90 = p.p90[doy];
  const med = p.mediana[doy];
  if (p10 == null || p90 == null || med == null) return null;
  const span = p90 - p10;
  if (span <= 0) return null;
  return (cota_m - med) / span;
}

// ─── Calcula IDN ponderado ────────────────────────────────────────────────────

function calculaIDN(posNorte, posSul) {
  let sumN = 0, wN = 0;
  for (const [nome, pos] of Object.entries(posNorte)) {
    if (pos == null) continue;
    const w = PESOS_NORTE[nome] ?? 0;
    sumN += pos * w;
    wN   += w;
  }
  let sumS = 0, wS = 0;
  for (const [nome, pos] of Object.entries(posSul)) {
    if (pos == null) continue;
    const w = PESOS_SUL[nome] ?? 0;
    sumS += pos * w;
    wS   += w;
  }
  const nNorte = Object.values(posNorte).filter(v => v != null).length;
  const nSul   = Object.values(posSul).filter(v => v != null).length;
  if (nNorte < 2 || nSul < 2) return null; // dados insuficientes
  const posN = wN > 0 ? sumN / wN : 0;
  const posS = wS > 0 ? sumS / wS : 0;
  return +(posS - posN).toFixed(3);
}

// ─── Principal ───────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  log("=== atualiza-idn-series: início ===");

  // Carrega percentis
  const PERCENTIS_DOY = carregaPercentisDOY();
  log(`Percentis carregados para estações: ${Object.keys(PERCENTIS_DOY).join(", ")}`);

  // Carrega série existente
  const serieFile = join(ROOT, "data/ana-idn-series.json");
  let serieExistente = { gerado_em: "", serie: [] };
  if (existsSync(serieFile)) {
    serieExistente = JSON.parse(readFileSync(serieFile, "utf-8"));
    log(`Série existente: ${serieExistente.serie.length} pontos`);
  } else {
    log("Série não encontrada — iniciando do zero. Rode seed-idn-series.mjs primeiro.");
  }

  // Cria mapa com dados históricos por estação para seed do MA-7d.
  // Carrega CSVs HidroWeb (data,cota_cm) como base de dados de leitura diária.
  const ARQUIVOS_HISTORICO = {
    SGC:         "sgc_hidroweb.csv",
    Curicuriari: "curicuriari_hidroweb.csv",
    Serrinha:    "serrinha_hidroweb.csv",
    Moura:       "moura_hidroweb.csv",
    Caracarai:   "caracarai_hidroweb.csv",
    Abuna:       "abuna_hidroweb.csv",
    PortoVelho:  "portovelho_hidroweb.csv",
    Humaita:     "humaita_hidroweb.csv",
    Manicore:    "manicore_hidroweb.csv",
    Labrea:      "labrea_hidroweb.csv",
  };
  const seriesCsvDia = {}; // nome -> Map<date, cota_m>
  for (const [nome, arq] of Object.entries(ARQUIVOS_HISTORICO)) {
    const caminho = join(ROOT, "data", arq);
    if (!existsSync(caminho)) {
      seriesCsvDia[nome] = new Map();
      continue;
    }
    const txt = readFileSync(caminho, "utf-8").replace(/^﻿/, "");
    const map = new Map();
    for (const linha of txt.trim().split(/\r?\n/).slice(1)) {
      const [d, c] = linha.split(",");
      if (d && c) map.set(d, parseFloat(c) / 100); // cm → m
    }
    seriesCsvDia[nome] = map;
  }

  // ─── Autenticação ──────────────────────────────────────────────────────────
  log("Autenticando na API ANA...");
  let token;
  try {
    token = await autenticaANA();
    log("Token obtido com sucesso");
  } catch (err) {
    log(`ERRO na autenticação: ${err.message}`);
    process.exit(1);
  }

  // ─── Busca dados ───────────────────────────────────────────────────────────
  const mapa_codigo_nome = {};
  for (const [nome, cod] of Object.entries(ESTACOES_NORTE)) mapa_codigo_nome[cod] = nome;
  for (const [nome, cod] of Object.entries(ESTACOES_SUL))   mapa_codigo_nome[cod] = nome;

  let dadosNorte = new Map();
  let dadosSul   = new Map();

  // Batch 1: Norte (5 estações)
  log(`Buscando série Norte: ${Object.values(ESTACOES_NORTE).join(",")}`);
  try {
    const jsonNorte = await buscaSerie(token, Object.values(ESTACOES_NORTE));
    dadosNorte = processaResposta(jsonNorte, mapa_codigo_nome);
    log(`Norte: ${[...dadosNorte.keys()].join(", ")} — ${[...dadosNorte.values()].reduce((s,m)=>s+m.size,0)} leituras-dia`);
  } catch (err) {
    log(`ERRO busca Norte: ${err.message}`);
  }

  // Batch 2: Sul (5 estações)
  log(`Buscando série Sul: ${Object.values(ESTACOES_SUL).join(",")}`);
  try {
    const jsonSul = await buscaSerie(token, Object.values(ESTACOES_SUL));
    dadosSul = processaResposta(jsonSul, mapa_codigo_nome);
    log(`Sul: ${[...dadosSul.keys()].join(", ")} — ${[...dadosSul.values()].reduce((s,m)=>s+m.size,0)} leituras-dia`);
  } catch (err) {
    log(`ERRO busca Sul: ${err.message}`);
  }

  // Coleta todas as datas disponíveis nos dados frescos
  const todasDatas = new Set();
  for (const m of [...dadosNorte.values(), ...dadosSul.values()]) {
    for (const d of m.keys()) todasDatas.add(d);
  }
  const datasOrdenadas = Array.from(todasDatas).sort();
  log(`Datas com dados API: ${datasOrdenadas.at(0)} → ${datasOrdenadas.at(-1)} (${datasOrdenadas.length} dias)`);

  // ─── Monta séries diárias + MA-7d + IDN ───────────────────────────────────
  // Para cada estação: merge CSV histórico + dados API, calcula MA-7d.
  const todasEstacoes = { ...ESTACOES_NORTE, ...ESTACOES_SUL };
  const ma7PorEstacao = {};

  for (const nome of Object.keys(todasEstacoes)) {
    const dadosAPI = dadosNorte.get(nome) ?? dadosSul.get(nome) ?? new Map();
    const dadosCSV = seriesCsvDia[nome] ?? new Map();

    // Merge: API tem prioridade sobre CSV
    const merged = new Map(dadosCSV);
    for (const [d, v] of dadosAPI) merged.set(d, v);

    ma7PorEstacao[nome] = calculaMA7(merged);
  }

  // ─── Calcula IDN por dia ───────────────────────────────────────────────────
  const novos = [];
  for (const iso of datasOrdenadas) {
    const posNorte = {};
    for (const nome of Object.keys(ESTACOES_NORTE)) {
      const ma7 = ma7PorEstacao[nome]?.get(iso);
      posNorte[nome] = ma7 != null ? posicaoRelativa(ma7, nome, iso, PERCENTIS_DOY) : null;
    }
    const posSul = {};
    for (const nome of Object.keys(ESTACOES_SUL)) {
      const ma7 = ma7PorEstacao[nome]?.get(iso);
      posSul[nome] = ma7 != null ? posicaoRelativa(ma7, nome, iso, PERCENTIS_DOY) : null;
    }
    const idn = calculaIDN(posNorte, posSul);
    if (idn == null) {
      log(`  ${iso}: IDN não calculado (dados insuficientes)`);
      continue;
    }
    novos.push({ data: iso, idn, fonte: "ana_api" });
  }
  log(`IDN calculado para ${novos.length} dias`);

  // ─── Merge com série existente ─────────────────────────────────────────────
  const mapaExistente = new Map(serieExistente.serie.map(p => [p.data, p]));

  let atualizados = 0;
  let adicionados = 0;
  let ignorados   = 0;

  for (const novo of novos) {
    const existente = mapaExistente.get(novo.data);
    if (!existente) {
      mapaExistente.set(novo.data, novo);
      adicionados++;
    } else if (existente.fonte === "ana_api") {
      // Já tem dado API — pula (policy: não reprocessar)
      ignorados++;
    } else {
      // Sobrescreve se fonte era hidroweb ou boletim
      mapaExistente.set(novo.data, novo);
      atualizados++;
    }
  }

  log(`Merge: ${adicionados} adicionados, ${atualizados} atualizados, ${ignorados} ignorados`);

  // ─── Escreve resultado ─────────────────────────────────────────────────────
  const serieFinal = Array.from(mapaExistente.values()).sort((a, b) => a.data.localeCompare(b.data));
  const saida = {
    gerado_em: new Date().toISOString(),
    serie: serieFinal,
  };

  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(serieFile, JSON.stringify(saida, null, 2), "utf-8");

  const countFontes = serieFinal.reduce((acc, p) => {
    acc[p.fonte] = (acc[p.fonte] ?? 0) + 1;
    return acc;
  }, {});

  log(`Série final: ${serieFinal.length} pontos — ${JSON.stringify(countFontes)}`);
  log(`Último ponto: ${serieFinal.at(-1)?.data} IDN=${serieFinal.at(-1)?.idn}`);
  log("=== atualiza-idn-series: fim ===");
}

main().catch((err) => {
  log(`ERRO fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
