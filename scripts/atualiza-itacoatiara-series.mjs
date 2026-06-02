// Pipeline semanal: busca os últimos 30 dias de cota da estação Itacoatiara
// (16030000) na API ANA, faz merge na série histórica `data/itacoatiara_hidroweb.csv`
// e regenera o artefato `lib/itacoatiara-historico-diario.ts`.
//
// POR QUE EXISTE: o forecasting por ANÁLOGOS (lib/recessao-analogos.ts) — que
// alimenta o ETA do topo da página IRC ("Itacoatiara projetada em X m em
// DD/mmm") — faz matching sobre os ÚLTIMOS 30 dias da série 2026. Sem este
// script, a série 2026 ficava congelada na última vez que alguém rodou o
// gerador à mão (estava parada em 08/mai/2026 enquanto os cards de cota já
// liam a ANA ao vivo). Resultado: a projeção ancorava num "hoje" defasado e a
// contagem de dias saía inflada. Este script fecha esse gap, no mesmo padrão
// do atualiza-idn-series.mjs.
//
// Uso: node scripts/atualiza-itacoatiara-series.mjs
// Requer: HIDRO_IDENTIFICADOR e HIDRO_SENHA (em .env.local ou no ambiente).
//
// Só usa builtins do Node (fs/path/url/child_process) — roda no CI sem npm install.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ESTACAO_ITACOATIARA = "16030000";
const CSV_PATH = join(ROOT, "data", "itacoatiara_hidroweb.csv");

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
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

// ─── Autenticação ANA (mesma rota do atualiza-idn-series.mjs) ────────────────
async function autenticaANA() {
  const id    = process.env.HIDRO_IDENTIFICADOR;
  const senha = process.env.HIDRO_SENHA;
  if (!id || !senha) throw new Error("HIDRO_IDENTIFICADOR e/ou HIDRO_SENHA não definidos");

  const resp = await fetch(
    "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/OAUth/v1",
    { headers: { Identificador: id, Senha: senha } }
  );
  if (!resp.ok) throw new Error(`Auth ANA: ${resp.status} ${resp.statusText}`);
  const json = await resp.json();
  const token = json?.items?.tokenautenticacao ?? json?.tokenautenticacao;
  if (!token) throw new Error(`Token ANA não encontrado: ${JSON.stringify(json).slice(0, 200)}`);
  return token;
}

async function buscaSerie(token, codigo) {
  const url = new URL(
    "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v2"
  );
  url.searchParams.set("Codigos_Estacoes",         codigo);
  url.searchParams.set("Tipo Filtro Data",          "DATA_LEITURA");
  url.searchParams.set("Range Intervalo de busca",  "DIAS_30");

  const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`ANA série: ${resp.status} ${resp.statusText}`);
  return await resp.json();
}

// Agrupa leituras por dia (QC=0) e devolve Map<"YYYY-MM-DD", cota_m> com média diária.
function processaResposta(json) {
  const itens = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);
  const porDia = new Map(); // date -> number[]

  for (const item of itens) {
    const codigo = String(item?.codigoestacao ?? item?.Codigo_Estacao ?? "").trim();
    if (codigo && codigo !== ESTACAO_ITACOATIARA) continue;

    const status = String(item?.Cota_Adotada_Status ?? item?.status ?? "").trim();
    if (status !== "0") continue; // só leitura boa

    const cota_cm = parseFloat(item?.Cota_Adotada ?? item?.cota_adotada);
    if (isNaN(cota_cm)) continue;
    const cota_m = cota_cm / 100;

    const raw = item?.Data_Hora_Medicao ?? item?.data_hora_medicao ?? "";
    let iso;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      iso = raw.slice(0, 10);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
      const [d, m, y] = raw.slice(0, 10).split("/");
      iso = `${y}-${m}-${d}`;
    } else {
      continue;
    }

    if (!porDia.has(iso)) porDia.set(iso, []);
    porDia.get(iso).push(cota_m);
  }

  const medias = new Map();
  for (const [iso, vals] of porDia) {
    medias.set(iso, +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2));
  }
  return medias;
}

// ─── CSV (data,cota_m) — histórico desde 1927 ────────────────────────────────
function leCSV() {
  const txt = readFileSync(CSV_PATH, "utf-8").replace(/^﻿/, "");
  const linhas = txt.trim().split(/\r?\n/);
  const mapa = new Map(); // date -> cota_m
  for (let i = 1; i < linhas.length; i++) {
    const [data, cota] = linhas[i].split(",");
    const v = parseFloat(cota);
    if (data && isFinite(v)) mapa.set(data, +v.toFixed(2));
  }
  return mapa;
}

function escreveCSV(mapa) {
  const datas = Array.from(mapa.keys()).sort();
  // Formato mínimo (sem zeros à direita), idêntico ao histórico: 0.5 / 1 / 13.62.
  // Valores já estão arredondados a 2 casas; String() preserva o estilo original
  // e mantém o diff restrito às linhas realmente alteradas.
  const linhas = ["data,cota_m", ...datas.map((d) => `${d},${String(mapa.get(d))}`)];
  writeFileSync(CSV_PATH, linhas.join("\n") + "\n", "utf-8");
}

async function main() {
  loadEnv();
  log("=== atualiza-itacoatiara-series: início ===");

  const csv = leCSV();
  const ultimaAntes = Array.from(csv.keys()).sort().at(-1);
  log(`CSV existente: ${csv.size} dias — último ${ultimaAntes} (${csv.get(ultimaAntes)} m)`);

  log("Autenticando na API ANA...");
  const token = await autenticaANA();
  log("Token obtido.");

  log(`Buscando série Itacoatiara (${ESTACAO_ITACOATIARA}), últimos 30 dias...`);
  const json = await buscaSerie(token, ESTACAO_ITACOATIARA);
  const frescos = processaResposta(json);
  if (frescos.size === 0) {
    log("ERRO: nenhuma leitura válida (QC=0) retornada pela ANA. Abortando sem alterar arquivos.");
    process.exit(1);
  }
  const datasFrescas = Array.from(frescos.keys()).sort();
  log(`ANA: ${datasFrescas.length} dias — ${datasFrescas.at(0)} → ${datasFrescas.at(-1)}`);

  // Merge: API tem prioridade sobre o histórico nos dias sobrepostos.
  let adicionados = 0, atualizados = 0;
  for (const [d, v] of frescos) {
    if (!csv.has(d)) adicionados++;
    else if (csv.get(d) !== v) atualizados++;
    csv.set(d, v);
  }
  log(`Merge: ${adicionados} dias novos, ${atualizados} revisados.`);

  if (adicionados === 0 && atualizados === 0) {
    log("Série já estava em dia — nada a fazer.");
    log("=== atualiza-itacoatiara-series: fim ===");
    return;
  }

  escreveCSV(csv);
  const ultimaDepois = Array.from(csv.keys()).sort().at(-1);
  log(`CSV atualizado: último agora ${ultimaDepois} (${csv.get(ultimaDepois)} m).`);

  // Regenera o artefato TS (fonte única da lógica de indexação por ano).
  log("Regenerando lib/itacoatiara-historico-diario.ts...");
  execSync("node scripts/gera-itacoatiara-historico-diario.mjs", { cwd: ROOT, stdio: "inherit" });

  log("=== atualiza-itacoatiara-series: fim ===");
}

main().catch((err) => {
  log(`ERRO fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
