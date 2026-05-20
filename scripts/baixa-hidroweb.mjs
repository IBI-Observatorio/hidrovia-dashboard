// Baixa série histórica diária de estações fluviométricas via API ANA
// (método HidroSerieHistorica). Salva em data/<nome>_hidroweb.csv no
// formato (data,cota_m) compatível com gera-percentis-doy.mjs.
//
// Uso:
//   node scripts/baixa-hidroweb.mjs              → baixa todas configuradas
//   node scripts/baixa-hidroweb.mjs Caracarai    → baixa só uma

import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

// Estações da Bacia Amazônica usadas pelo IDN (códigos oficiais ANA).
// Para baixar uma específica: node scripts/baixa-hidroweb.mjs Moura
const ESTACOES_NOVAS = {
  // Norte (Negro + Branco)
  SGC:         { codigo: "14320001", rio: "Negro alto",   arquivo: "sgc_hidroweb.csv" },
  Curicuriari: { codigo: "14330000", rio: "Negro",        arquivo: "curicuriari_hidroweb.csv" },
  Serrinha:    { codigo: "14420000", rio: "Negro médio",  arquivo: "serrinha_hidroweb.csv" },
  Moura:       { codigo: "14840000", rio: "Negro médio",  arquivo: "moura_hidroweb.csv" },
  Caracarai:   { codigo: "14710000", rio: "Branco",       arquivo: "caracarai_hidroweb.csv" },
  // Sul (Madeira + Purus)
  Abuna:       { codigo: "15320002", rio: "Madeira upstr.", arquivo: "abuna_hidroweb.csv" },
  PortoVelho:  { codigo: "15400000", rio: "Madeira",      arquivo: "portovelho_hidroweb.csv" },
  Humaita:     { codigo: "15630000", rio: "Madeira",      arquivo: "humaita_hidroweb.csv" },
  Manicore:    { codigo: "15700000", rio: "Madeira",      arquivo: "manicore_hidroweb.csv" },
  Borba:       { codigo: "15900000", rio: "Madeira",      arquivo: "borba_hidroweb.csv" },
  Labrea:      { codigo: "13870000", rio: "Purus",        arquivo: "labrea_hidroweb.csv" },
};

const DATA_INICIO = "01/01/2016";
const DATA_FIM    = "31/12/2025";

function buildSoap(codEstacao, dataInicio, dataFim) {
  // HidroSerieHistorica:
  //   tipoDados=1 (cota), nivelConsistencia=2 (consistido, fallback 1 se vazio)
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroSerieHistorica xmlns="http://MRCS/">
      <codEstacao>${codEstacao}</codEstacao>
      <dataInicio>${dataInicio}</dataInicio>
      <dataFim>${dataFim}</dataFim>
      <tipoDados>1</tipoDados>
      <nivelConsistencia></nivelConsistencia>
    </HidroSerieHistorica>
  </soap:Body>
</soap:Envelope>`;
}

async function chamaANA(codEstacao) {
  const soap = buildSoap(codEstacao, DATA_INICIO, DATA_FIM);
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction":   "http://MRCS/HidroSerieHistorica",
    },
    body: soap,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

// HidroSerieHistorica retorna blocos <SerieHistorica> contendo DataHora,
// Cota01..Cota31 (valores diários do mês) ou um campo único por leitura.
// Aqui parseamos o formato mais comum: blocos com MesAno e Cota01..Cota31.
function parseSerie(xml) {
  const observacoes = []; // { data: "YYYY-MM-DD", cota_m: number }

  // Cada bloco mensal
  const blocos = xml.match(/<SerieHistorica\b[^>]*>([\s\S]*?)<\/SerieHistorica>/g) ?? [];

  for (const bloco of blocos) {
    // Data referência (primeiro dia do mês) — campo "DataHora"
    const dataHora = bloco.match(/<DataHora>([^<]+)<\/DataHora>/)?.[1]?.trim();
    if (!dataHora) continue;
    const [ano, mes] = dataHora.slice(0, 7).split("-").map(Number);
    if (!ano || !mes) continue;

    for (let dia = 1; dia <= 31; dia++) {
      const tag = `Cota${String(dia).padStart(2, "0")}`;
      const raw = bloco.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim();
      if (!raw) continue;
      const cm = parseFloat(raw);
      if (isNaN(cm)) continue;
      // Verifica que o dia é válido para esse mês
      const dataISO = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      const d = new Date(`${dataISO}T00:00:00Z`);
      if (d.getUTCMonth() + 1 !== mes) continue; // ex: 31/abr não existe
      observacoes.push({ data: dataISO, cota_m: +(cm / 100).toFixed(2) });
    }
  }

  // Ordena cronologicamente e remove duplicatas (mantém última)
  observacoes.sort((a, b) => a.data.localeCompare(b.data));
  const dedup = new Map();
  for (const o of observacoes) dedup.set(o.data, o.cota_m);
  return Array.from(dedup, ([data, cota_m]) => ({ data, cota_m }));
}

async function baixaUma(nome, info) {
  const destino = join(ROOT, "data", info.arquivo);
  if (existsSync(destino)) {
    console.log(`  ↻ ${nome}: ${info.arquivo} já existe (use --force para sobrescrever)`);
    return { nome, status: "ja_existe" };
  }
  process.stdout.write(`  ↓ ${nome} (${info.codigo}, ${info.rio})... `);
  try {
    const xml = await chamaANA(info.codigo);
    const obs = parseSerie(xml);
    if (obs.length === 0) {
      console.log("VAZIO (0 leituras)");
      // Debug: salva XML para inspeção manual
      writeFileSync(join(ROOT, `tmp_${nome}_debug.xml`), xml);
      return { nome, status: "vazio", debug: `tmp_${nome}_debug.xml` };
    }
    const csv = "data,cota_m\n" + obs.map(o => `${o.data},${o.cota_m}`).join("\n");
    writeFileSync(destino, csv);
    const primeira = obs[0].data;
    const ultima   = obs[obs.length - 1].data;
    console.log(`OK (${obs.length} obs, ${primeira} → ${ultima})`);
    return { nome, status: "ok", n: obs.length, primeira, ultima };
  } catch (e) {
    console.log(`ERRO: ${e.message}`);
    return { nome, status: "erro", erro: e.message };
  }
}

async function main() {
  const arg = process.argv[2];
  const lista = arg
    ? { [arg]: ESTACOES_NOVAS[arg] }
    : ESTACOES_NOVAS;

  if (arg && !ESTACOES_NOVAS[arg]) {
    console.error(`Estação desconhecida: ${arg}`);
    console.error(`Disponíveis: ${Object.keys(ESTACOES_NOVAS).join(", ")}`);
    process.exit(1);
  }

  console.log(`Baixando ${Object.keys(lista).length} estação(ões) — janela ${DATA_INICIO} a ${DATA_FIM}`);
  const resultados = [];
  for (const [nome, info] of Object.entries(lista)) {
    resultados.push(await baixaUma(nome, info));
    // pausa amistosa para não martelar o servidor da ANA
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\n=== Resumo ===");
  for (const r of resultados) {
    console.log(`  ${r.nome.padEnd(13)} → ${r.status}${r.n ? ` (${r.n} obs)` : ""}${r.erro ? ` [${r.erro}]` : ""}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
