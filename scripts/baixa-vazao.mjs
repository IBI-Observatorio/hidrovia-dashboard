// Baixa série histórica DIÁRIA de VAZÃO (m³/s) das 8 estações com publicação
// consolidada na API ANA. Janela 2016–2025, formato (data,vazao_m3s).
//
// Uso: node scripts/baixa-vazao.mjs [Estacao]

import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

// 8 estações com vazão pública na SOAP
const ESTACOES = {
  // Norte
  Curicuriari: { codigo: "14330000", rio: "Negro",      arquivo: "curicuriari_vazao.csv" },
  Serrinha:    { codigo: "14420000", rio: "Negro méd.", arquivo: "serrinha_vazao.csv" },
  Moura:       { codigo: "14840000", rio: "Negro méd.", arquivo: "moura_vazao.csv" },
  Caracarai:   { codigo: "14710000", rio: "Branco",     arquivo: "caracarai_vazao.csv" },
  // Sul
  PortoVelho:  { codigo: "15400000", rio: "Madeira",    arquivo: "portovelho_vazao.csv" },
  Humaita:     { codigo: "15630000", rio: "Madeira",    arquivo: "humaita_vazao.csv" },
  Manicore:    { codigo: "15700000", rio: "Madeira",    arquivo: "manicore_vazao.csv" },
  Labrea:      { codigo: "13870000", rio: "Purus",      arquivo: "labrea_vazao.csv" },
};

const DATA_INICIO = "01/01/2016";
const DATA_FIM    = "31/12/2025";

function soap(cod) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroSerieHistorica xmlns="http://MRCS/">
      <codEstacao>${cod}</codEstacao>
      <dataInicio>${DATA_INICIO}</dataInicio>
      <dataFim>${DATA_FIM}</dataFim>
      <tipoDados>3</tipoDados>
      <nivelConsistencia></nivelConsistencia>
    </HidroSerieHistorica>
  </soap:Body>
</soap:Envelope>`;
}

async function chamaANA(cod) {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction":   "http://MRCS/HidroSerieHistorica",
    },
    body: soap(cod),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

// Parser: cada <SerieHistorica> mensal tem <Vazao01>..<Vazao31> (m³/s).
// Onde há nível 2 (consistido) e 1 (bruto), priorizamos 2.
function parseSerie(xml) {
  const blocos = xml.match(/<SerieHistorica\b[^>]*>([\s\S]*?)<\/SerieHistorica>/g) ?? [];
  const porDia = new Map(); // iso → { nivel, vazao }

  for (const bloco of blocos) {
    const dataHora = bloco.match(/<DataHora>([^<]+)<\/DataHora>/)?.[1]?.trim();
    const nivel    = +(bloco.match(/<NivelConsistencia>([^<]+)<\/NivelConsistencia>/)?.[1] ?? 1);
    if (!dataHora) continue;
    const [ano, mes] = dataHora.slice(0, 7).split("-").map(Number);
    if (!ano || !mes) continue;

    for (let dia = 1; dia <= 31; dia++) {
      const tag = `Vazao${String(dia).padStart(2, "0")}`;
      const raw = bloco.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim();
      if (!raw) continue;
      const q = parseFloat(raw);
      if (isNaN(q)) continue;
      const dt = new Date(`${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}T00:00:00Z`);
      if (dt.getUTCMonth() + 1 !== mes) continue;
      const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      const existente = porDia.get(iso);
      if (!existente || nivel > existente.nivel) {
        porDia.set(iso, { nivel, vazao: q });
      }
    }
  }

  return [...porDia.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iso, { vazao }]) => ({ data: iso, vazao_m3s: +vazao.toFixed(2) }));
}

async function baixaUma(nome, info) {
  const destino = join(ROOT, "data", info.arquivo);
  if (existsSync(destino)) {
    console.log(`  ↻ ${nome}: já existe`);
    return;
  }
  process.stdout.write(`  ↓ ${nome} (${info.codigo}, ${info.rio})... `);
  try {
    const xml = await chamaANA(info.codigo);
    const obs = parseSerie(xml);
    if (obs.length === 0) { console.log("VAZIO"); return; }
    const csv = "data,vazao_m3s\n" + obs.map(o => `${o.data},${o.vazao_m3s}`).join("\n");
    writeFileSync(destino, csv);
    console.log(`OK (${obs.length} obs, ${obs[0].data} → ${obs.at(-1).data})`);
  } catch (e) {
    console.log(`ERRO: ${e.message}`);
  }
}

async function main() {
  const arg = process.argv[2];
  const lista = arg ? { [arg]: ESTACOES[arg] } : ESTACOES;
  if (arg && !ESTACOES[arg]) {
    console.error(`Estação desconhecida. Use: ${Object.keys(ESTACOES).join(", ")}`);
    process.exit(1);
  }
  console.log(`Baixando vazão diária ${DATA_INICIO} → ${DATA_FIM} (${Object.keys(lista).length} estações)\n`);
  for (const [n, info] of Object.entries(lista)) {
    await baixaUma(n, info);
    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
