/**
 * Hidrata lib/limiares.ts com area_drenagem_km2, latitude, longitude, altitude_m
 * vindos da API HidroInventarioEstacoes da ANA.
 *
 * Uso:
 *   node scripts/hidrate-limiares.mjs
 *
 * Pré-requisito: HIDRO_IDENTIFICADOR e HIDRO_SENHA em .env.local
 *
 * Saída: bloco TypeScript pronto para substituir o objeto LIMIARES em lib/limiares.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Lê .env.local ───────────────────────────────────────────────────────────
function lerEnv() {
  const caminho = join(ROOT, ".env.local");
  if (!existsSync(caminho)) {
    console.error("✗ .env.local não encontrado em", caminho);
    process.exit(1);
  }
  const linhas = readFileSync(caminho, "utf-8").split("\n");
  const env = {};
  for (const l of linhas) {
    const m = l.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = lerEnv();
const IDENTIFICADOR = env.HIDRO_IDENTIFICADOR;
const SENHA         = env.HIDRO_SENHA;

if (!IDENTIFICADOR || !SENHA) {
  console.error("✗ HIDRO_IDENTIFICADOR e/ou HIDRO_SENHA ausentes no .env.local");
  process.exit(1);
}

const BASE_URL = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas";

// ─── Estações do painel principal ────────────────────────────────────────────
const ESTACOES_PAINEL = {
  Manaus:      "14990000",
  Itacoatiara: "16030000",
  SGC:         "14320001",
  Humaita:     "15630000",
  Manacapuru:  "14100000",
  PortoVelho:  "15400000",
  Borba:       "15900000",
};

// ─── OAuth ────────────────────────────────────────────────────────────────────
async function fetchToken() {
  const resp = await fetch(`${BASE_URL}/OAUth/v1`, {
    method:  "GET",
    headers: { "Identificador": IDENTIFICADOR, "Senha": SENHA },
  });
  if (!resp.ok) throw new Error(`OAuth HTTP ${resp.status}`);
  const json = await resp.json();
  const token = json?.items?.tokenautenticacao;
  if (!token) throw new Error(`Token ausente: ${JSON.stringify(json)}`);
  return token;
}

// ─── Inventário ───────────────────────────────────────────────────────────────
async function fetchInventarioBacia(token, codigoBacia = 1) {
  const url = new URL(`${BASE_URL}/HidroInventarioEstacoes/v1`);
  url.searchParams.set("Código da Bacia", String(codigoBacia));

  const resp = await fetch(url.toString(), {
    method:  "GET",
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
  });
  if (!resp.ok) throw new Error(`Inventário HTTP ${resp.status}`);
  const json = await resp.json();
  return json.items ?? [];
}

async function fetchInventarioEstacao(token, codigoEstacao) {
  const url = new URL(`${BASE_URL}/HidroInventarioEstacoes/v1`);
  url.searchParams.set("Código da Estação", String(codigoEstacao));

  const resp = await fetch(url.toString(), {
    method:  "GET",
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
  });
  if (!resp.ok) throw new Error(`Inventário estação ${codigoEstacao} HTTP ${resp.status}`);
  const json = await resp.json();
  return json.items ?? [];
}

function parseItem(it) {
  return {
    codigo:            String(it.codigoestacao ?? ""),
    nome:              (it.Estacao_Nome ?? "").trim(),
    latitude:          parseFloat(it.Latitude  ?? "NaN"),
    longitude:         parseFloat(it.Longitude ?? "NaN"),
    altitude_m:        it.Altitude    != null && it.Altitude    !== "" ? parseFloat(it.Altitude)    : null,
    area_drenagem_km2: it.Area_Drenagem != null && it.Area_Drenagem !== "" ? parseFloat(it.Area_Drenagem) : null,
    uf:                (it.UF_Estacao ?? "").trim(),
    municipio:         (it.Municipio_Nome ?? "").trim(),
    operando:          String(it.Operando ?? "") === "1",
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log("🔑 Autenticando na API ANA…");
const token = await fetchToken();
console.log("✓ Token obtido.\n");

console.log("📦 Buscando inventário (Bacia Amazônica = 1)…");
const itensBrutos = await fetchInventarioBacia(token, 1);
console.log(`   ${itensBrutos.length} estações retornadas da bacia.\n`);

const codigosWanted = new Set(Object.values(ESTACOES_PAINEL));
const encontradas = new Map();

for (const it of itensBrutos) {
  const cod = String(it.codigoestacao ?? "");
  if (codigosWanted.has(cod)) {
    encontradas.set(cod, parseItem(it));
  }
}

// Fallback individual para estações não encontradas na bacia 1
for (const [chave, cod] of Object.entries(ESTACOES_PAINEL)) {
  if (!encontradas.has(cod)) {
    console.log(`   ⚠️  ${chave} (${cod}) não veio na bacia — tentando consulta individual…`);
    try {
      const lista = await fetchInventarioEstacao(token, cod);
      if (lista[0]) {
        encontradas.set(cod, parseItem(lista[0]));
        console.log(`   ✓ ${chave} encontrada individualmente.`);
      } else {
        console.log(`   ✗ ${chave} não encontrada.`);
      }
    } catch (e) {
      console.log(`   ✗ ${chave}: ${e.message}`);
    }
    // Pequena pausa para não bater muito rápido
    await new Promise(r => setTimeout(r, 600));
  }
}

// ─── Relatório ────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(70));
console.log("INVENTÁRIO — Estações do Painel Principal");
console.log("─".repeat(70));

const resultados = {};
for (const [chave, cod] of Object.entries(ESTACOES_PAINEL)) {
  const inv = encontradas.get(cod);
  if (!inv) {
    console.log(`❌ ${chave.padEnd(14)} (${cod}) — NÃO ENCONTRADA`);
    resultados[chave] = null;
    continue;
  }
  console.log(
    `✓ ${chave.padEnd(14)} (${cod})  ` +
    `lat=${inv.latitude?.toFixed(4) ?? "?"}  ` +
    `lon=${inv.longitude?.toFixed(4) ?? "?"}  ` +
    `alt=${inv.altitude_m ?? "?"}m  ` +
    `area=${inv.area_drenagem_km2 != null ? inv.area_drenagem_km2.toLocaleString("pt-BR") + " km²" : "?"}  ` +
    `(${inv.municipio}, ${inv.uf})`
  );
  resultados[chave] = inv;
}

// ─── Bloco pronto para colar em lib/limiares.ts ───────────────────────────────
console.log("\n" + "═".repeat(70));
console.log("BLOCO PRONTO PARA COLAR em lib/limiares.ts");
console.log("(substitua o objeto LIMIARES existente)");
console.log("═".repeat(70) + "\n");

// Limiares P10/mediana/P90 atuais (não alterar — só adicionar campos de inventário)
const LIMIARES_ATUAIS = {
  Manaus:      { p10: 17.38, mediana: 24.00, p90: 28.50, gatilho_lws: 17.70 },
  Itacoatiara: { p10:  3.77, mediana:  9.00, p90: 13.00 },
  SGC:         { p10:  7.96, mediana:  9.29, p90: 10.53 },
  Humaita:     { p10: 11.68, mediana: 19.00, p90: 22.00 },
  Manacapuru:  { p10: 10.15, mediana: 16.50, p90: 19.60 },
  PortoVelho:  { p10:  7.00, mediana: 13.00, p90: 17.00 },
  Borba:       { p10:  5.00, mediana: 14.00, p90: 20.00 },
};

const COMENTARIOS = {
  SGC: "// São Gabriel da Cachoeira (Negro alto)",
};

let bloco = "export const LIMIARES: Record<Estacao, LimiarEstacao> = {\n";

for (const [chave, lim] of Object.entries(LIMIARES_ATUAIS)) {
  const inv = resultados[chave];

  const campos = [];
  campos.push(`p10: ${lim.p10.toFixed(2)}`);
  campos.push(`mediana: ${lim.mediana.toFixed(2)}`);
  campos.push(`p90: ${lim.p90.toFixed(2)}`);
  if (lim.gatilho_lws != null) campos.push(`gatilho_lws: ${lim.gatilho_lws.toFixed(2)}`);
  campos.push(`unidade: "m"`);

  if (inv) {
    if (inv.area_drenagem_km2 != null) campos.push(`area_drenagem_km2: ${inv.area_drenagem_km2}`);
    if (!isNaN(inv.latitude)  && inv.latitude  !== 0) campos.push(`latitude: ${inv.latitude}`);
    if (!isNaN(inv.longitude) && inv.longitude !== 0) campos.push(`longitude: ${inv.longitude}`);
    if (inv.altitude_m != null) campos.push(`altitude_m: ${inv.altitude_m}`);
  } else {
    campos.push(`// ⚠️ inventário não disponível — preencher manualmente`);
  }

  const pad  = " ".repeat(Math.max(0, 12 - chave.length));
  const coment = COMENTARIOS[chave] ? ` ${COMENTARIOS[chave]}` : "";
  bloco += `  ${chave}:${pad}{ ${campos.join(", ")} },${coment}\n`;
}
bloco += "};";

console.log(bloco);

console.log("\n" + "─".repeat(70));
console.log("Copie o bloco acima e cole em lib/limiares.ts, substituindo o LIMIARES existente.");
console.log("Campos geo (area_drenagem_km2, latitude, longitude, altitude_m) foram adicionados.");
