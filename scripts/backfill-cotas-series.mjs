// Backfill pontual: preenche data/ana-cotas-series.json com os últimos 30 dias
// de cota diária (m) por estação, direto da API ANA (HidroWebService).
//
// Motivo: a série acumulada só passa a registrar a partir do 1º acesso ao
// /monitor; o trecho recente (ex.: 09–28/mai/2026) nunca foi arquivado. Este
// script puxa essa janela uma vez e faz merge — sem sobrescrever pontos já
// existentes (a gravação diária do app tem prioridade igual: dedup por data).
//
// Uso: node scripts/backfill-cotas-series.mjs
// Requer: HIDRO_IDENTIFICADOR e HIDRO_SENHA em .env.local

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Estações que o cotagrama desenha (mesmas chaves do cache ANA diário).
const ESTACOES = {
  Manaus:      "14990000",
  Itacoatiara: "16030000",
  Humaita:     "15630000",
  Manacapuru:  "14100000",
  PortoVelho:  "15400000",
  Manicore:    "15700000",
  Labrea:      "13870000",
  Curicuriari: "14330000",
};

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

async function autenticaANA() {
  const id = process.env.HIDRO_IDENTIFICADOR;
  const senha = process.env.HIDRO_SENHA;
  if (!id || !senha) throw new Error("HIDRO_IDENTIFICADOR e/ou HIDRO_SENHA não definidos");
  const resp = await fetch(
    "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/OAUth/v1",
    { headers: { Identificador: id, Senha: senha } }
  );
  if (!resp.ok) throw new Error(`Auth ANA: ${resp.status} ${resp.statusText}`);
  const json = await resp.json();
  const token = json?.items?.tokenautenticacao ?? json?.tokenautenticacao;
  if (!token) throw new Error("Token ANA não encontrado na resposta");
  return token;
}

async function buscaSerie(token, codigos) {
  const url = new URL(
    "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v2"
  );
  url.searchParams.set("Codigos_Estacoes", codigos.join(","));
  url.searchParams.set("Tipo Filtro Data", "DATA_LEITURA");
  url.searchParams.set("Range Intervalo de busca", "DIAS_30");
  const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`ANA série: ${resp.status} ${resp.statusText}`);
  return await resp.json();
}

// Agrupa por estação e dia, filtra QC=0, devolve média diária em metros.
function processaResposta(json, mapaCodigoNome) {
  const porEstacao = new Map(); // nome -> Map<date, number[]>
  const itens = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);
  for (const item of itens) {
    const codigo = String(item?.codigoestacao ?? item?.Codigo_Estacao ?? item?.codigo_estacao ?? "").trim();
    const nome = mapaCodigoNome[codigo];
    if (!nome) continue;
    const status = String(item?.Cota_Adotada_Status ?? item?.status ?? "").trim();
    if (status !== "0") continue;
    const cotaCm = parseFloat(item?.Cota_Adotada ?? item?.cota_adotada);
    if (isNaN(cotaCm)) continue;
    const raw = item?.Data_Hora_Medicao ?? item?.data_hora_medicao ?? "";
    let iso;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) iso = raw.slice(0, 10);
    else if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) { const [d, m, y] = raw.slice(0, 10).split("/"); iso = `${y}-${m}-${d}`; }
    else continue;
    if (!porEstacao.has(nome)) porEstacao.set(nome, new Map());
    const dias = porEstacao.get(nome);
    if (!dias.has(iso)) dias.set(iso, []);
    dias.get(iso).push(cotaCm / 100);
  }
  const out = new Map();
  for (const [nome, dias] of porEstacao) {
    const medias = new Map();
    for (const [d, vals] of dias) medias.set(d, +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2));
    out.set(nome, medias);
  }
  return out;
}

async function main() {
  loadEnv();
  console.log("Autenticando na API ANA…");
  const token = await autenticaANA();

  const mapaCodigoNome = {};
  for (const [nome, cod] of Object.entries(ESTACOES)) mapaCodigoNome[cod] = nome;

  console.log(`Buscando série (30 dias) de ${Object.keys(ESTACOES).length} estações…`);
  const json = await buscaSerie(token, Object.values(ESTACOES));
  const dados = processaResposta(json, mapaCodigoNome);

  // Carrega série existente (seed de hoje já gravado pelo app/seed manual)
  const arquivo = join(ROOT, "data", "ana-cotas-series.json");
  let serie = { gerado_em: "", estacoes: {} };
  if (existsSync(arquivo)) serie = JSON.parse(readFileSync(arquivo, "utf-8"));

  let adicionados = 0;
  for (const [nome, medias] of dados) {
    const arr = (serie.estacoes[nome] ??= []);
    const datasExistentes = new Set(arr.map((p) => p.data));
    for (const [data, cota_m] of medias) {
      if (datasExistentes.has(data)) continue;
      arr.push({ data, cota_m });
      adicionados++;
    }
    arr.sort((a, b) => a.data.localeCompare(b.data));
  }

  serie.gerado_em = new Date().toISOString();
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, JSON.stringify(serie, null, 2), "utf-8");

  console.log(`Backfill concluído: ${adicionados} pontos adicionados.`);
  for (const [nome, arr] of Object.entries(serie.estacoes)) {
    console.log(`  ${nome}: ${arr.length} pontos (${arr[0]?.data} → ${arr.at(-1)?.data})`);
  }
}

main().catch((err) => { console.error("ERRO:", err.message); process.exit(1); });
