/**
 * Busca dados históricos da API ANA para estações com lacunas e salva em CSV.
 * Roda uma vez: npx tsx scripts/fetch-historico.ts
 *
 * Saída em data/:
 *   curicuriari_historico.csv   — 2024-01-01 a 2025-12-31
 *   humaita_historico.csv       — 2024-01-01 a 2025-12-31
 *   portovelho_historico.csv    — 2024-01-01 a 2025-12-31
 *   borba_historico.csv         — 2025-08-01 a hoje
 *   manaus_gap_2025.csv         — 2025-08-01 a 2025-10-31
 *   itacoatiara_historico.csv   — 2025-08-01 a hoje
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const ANA_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";
const DATA_DIR = join(process.cwd(), "data");
const HOJE = new Date().toISOString().split("T")[0];

// ---------------------------------------------------------------------------
// Tarefas: cada entrada define o que buscar e onde salvar
// ---------------------------------------------------------------------------
// Curicuriari (14320001) e Borba (15900000) não têm telemetria disponível para os
// períodos faltantes — removidos da lista. Dados de Curicuriari vêm do SEMA consolidado.
// Gap abr-jun/2023 ausente no 4estacoes_2016_2025.csv
const TAREFAS = [
  { nome: "Manaus 2023 gap",      cod: "14990000", de: "2023-04-01", ate: "2023-06-30", arquivo: "manaus_2023_gap.csv"      },
  { nome: "Itacoatiara 2023 gap", cod: "16030000", de: "2023-04-01", ate: "2023-06-30", arquivo: "itacoatiara_2023_gap.csv" },
  { nome: "Manacapuru 2023 gap",  cod: "14100000", de: "2023-04-01", ate: "2023-06-30", arquivo: "manacapuru_2023_gap.csv"  },
  { nome: "Borba 2023 gap",       cod: "15900000", de: "2023-04-01", ate: "2023-06-30", arquivo: "borba_2023_gap.csv"       },
];

// ---------------------------------------------------------------------------
// SOAP + parse
// ---------------------------------------------------------------------------
function buildSoap(cod: string, de: string, ate: string): string {
  const fmt = (iso: string) => { const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DadosHidrometeorologicos xmlns="http://MRCS/">
      <codEstacao>${cod}</codEstacao>
      <dataInicio>${fmt(de)}</dataInicio>
      <dataFim>${fmt(ate)}</dataFim>
    </DadosHidrometeorologicos>
  </soap:Body>
</soap:Envelope>`;
}

interface Leitura { data: string; cota_cm: number }

function parseXML(xml: string): Leitura[] {
  // A API usa <DadosHidrometereologicos> (note a grafia) com <DataHora> e <Nivel>
  const blocos = xml.match(/<DadosHidrometere[^>]*>([\s\S]*?)<\/DadosHidrometere[^>]*>/g) ?? [];
  const res: Leitura[] = [];
  for (const b of blocos) {
    const nivel = b.match(/<Nivel>([\d.]+)<\/Nivel>/)?.[1];
    if (!nivel) continue;
    // DataHora: "2025-08-15 08:00:00 " — pega só a data
    const dataHora = b.match(/<DataHora>([^<]+)<\/DataHora>/)?.[1]?.trim() ?? "";
    const data = dataHora.slice(0, 10); // "YYYY-MM-DD"
    if (!data || data.length < 10) continue;
    res.push({ data, cota_cm: parseFloat(nivel) });
  }
  return res.sort((a, b) => a.data.localeCompare(b.data));
}

// Uma leitura por dia: última do dia (sort garante isso)
function agregaDiario(leituras: Leitura[]): { data: string; cota_m: number }[] {
  const map = new Map<string, number>();
  for (const l of leituras) map.set(l.data, l.cota_cm); // last wins
  return Array.from(map.entries())
    .map(([data, cm]) => ({ data, cota_m: +(cm / 100).toFixed(2) }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// ---------------------------------------------------------------------------
// Fetch com batches trimestrais (evita timeout / resposta muito grande)
// ---------------------------------------------------------------------------
function geraTrimestrais(de: string, ate: string): { inicio: string; fim: string }[] {
  const batches: { inicio: string; fim: string }[] = [];
  let cur = new Date(de);
  const end = new Date(ate);
  while (cur <= end) {
    const proximo = new Date(cur);
    proximo.setMonth(proximo.getMonth() + 3);
    proximo.setDate(proximo.getDate() - 1);
    batches.push({
      inicio: cur.toISOString().split("T")[0],
      fim:    (proximo > end ? end : proximo).toISOString().split("T")[0],
    });
    cur = new Date(proximo);
    cur.setDate(cur.getDate() + 1);
  }
  return batches;
}

async function fetchTrimestre(cod: string, de: string, ate: string): Promise<Leitura[]> {
  const soap = buildSoap(cod, de, ate);
  const resp = await fetch(ANA_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://MRCS/DadosHidrometeorologicos" },
    body: soap,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const xml = await resp.text();
  if (xml.includes("faultstring") || xml.includes("<Nivel></Nivel>")) return [];
  return parseXML(xml);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Merge com CSV existente (se já existir, não duplica)
// ---------------------------------------------------------------------------
function lerCSVExistente(arquivo: string): Set<string> {
  const caminho = join(DATA_DIR, arquivo);
  if (!existsSync(caminho)) return new Set();
  const linhas = readFileSync(caminho, "utf-8").split("\n").slice(1);
  const datas = new Set<string>();
  for (const l of linhas) {
    const d = l.split(",")[0];
    if (d) datas.add(d);
  }
  return datas;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🚀 Iniciando fetch ANA — ${HOJE}\n`);

  for (const tarefa of TAREFAS) {
    console.log(`📡 ${tarefa.nome} (${tarefa.cod})  ${tarefa.de} → ${tarefa.ate}`);
    const batches = geraTrimestrais(tarefa.de, tarefa.ate);
    const datasExistentes = lerCSVExistente(tarefa.arquivo);
    const todasLeituras: Leitura[] = [];
    let totalNovos = 0;

    for (const batch of batches) {
      process.stdout.write(`   ${batch.inicio} → ${batch.fim} ... `);
      try {
        const leituras = await fetchTrimestre(tarefa.cod, batch.inicio, batch.fim);
        todasLeituras.push(...leituras);
        const novos = leituras.filter(l => !datasExistentes.has(l.data)).length;
        totalNovos += novos;
        console.log(`${leituras.length} leituras (${novos} novas)`);
      } catch (e) {
        console.log(`⚠️  ERRO: ${e}`);
      }
      await sleep(500); // respeita rate limit
    }

    if (todasLeituras.length === 0) {
      console.log(`   ⚠️  Nenhuma leitura retornada — API pode não ter dados para esta estação/período\n`);
      continue;
    }

    // Agrega diário e mescla com existente
    const novos = agregaDiario(todasLeituras);
    const caminho = join(DATA_DIR, tarefa.arquivo);

    // Lê arquivo existente e mescla
    let existentes: { data: string; cota_m: number }[] = [];
    if (existsSync(caminho)) {
      const linhas = readFileSync(caminho, "utf-8").split("\n").slice(1);
      existentes = linhas
        .filter(l => l.trim())
        .map(l => { const [data, cm] = l.split(","); return { data, cota_m: parseFloat(cm) }; })
        .filter(l => !isNaN(l.cota_m));
    }

    // Merge: novos sobrescrevem existentes por data
    const mapa = new Map(existentes.map(l => [l.data, l.cota_m]));
    for (const l of novos) mapa.set(l.data, l.cota_m);
    const final = Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, cota_m]) => ({ data, cota_m }));

    const csv = "data,cota_m\n" + final.map(l => `${l.data},${l.cota_m}`).join("\n");
    writeFileSync(caminho, csv, "utf-8");
    console.log(`   ✅ ${final.length} dias salvos em data/${tarefa.arquivo}\n`);
  }

  console.log("✅ Concluído. Reinicie o servidor Next.js para carregar os novos dados.\n");
}

main().catch(err => { console.error("Erro fatal:", err); process.exit(1); });
