// scripts/anp/diesel.ts
// Coleta o preço médio semanal do OLEO DIESEL S10 (revenda, Brasil) da
// série histórica pública da ANP — Levantamento de Preços de Combustíveis.
// Única fonte externa do componente T (custo rodoviário modelado do IEE).
//
// Fonte (citar no card): ANP — Levantamento de Preços de Combustíveis.
//   Página: gov.br/anp/.../serie-historica-do-levantamento-de-precos
//   Arquivo: semanal-brasil-desde-2013.xlsx (sheet única, header na linha 18)
//
// Saída: data/anp/diesel.json  { ..., status, serie: [[dataFinalISO, R$/L]] }
//
// HEALTHCHECK isolado: se a página, o XLSX ou o layout mudarem, marca
// status "indisponivel" e PRESERVA a última série boa — a UI rotula
// "diesel: último dado ANP de dd/mm" (nunca interpola).
//
// Execução: node --experimental-strip-types scripts/anp/diesel.ts

import { inflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "anp", "diesel.json");

const URL_PAGINA =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/serie-historica-do-levantamento-de-precos";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };

/** Início da janela mantida no cache (histórico p/ percentil + backtest). */
const DESDE_SERIAL = 45658; // 2025-01-01 em serial Excel

// --- mini-leitor XLSX (ZIP + XML), igual ao padrão dos scrapers Conab -----
function lerZip(buf: Buffer): { nome: string; dados: Buffer }[] {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP sem EOCD");
  const n = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out: { nome: string; dados: Buffer }[] = [];
  for (let e = 0; e < n; e++) {
    const metodo = buf.readUInt16LE(off + 10);
    const tamComp = buf.readUInt32LE(off + 20);
    const tamNome = buf.readUInt16LE(off + 28);
    const tamExtra = buf.readUInt16LE(off + 30);
    const tamComent = buf.readUInt16LE(off + 32);
    const offLocal = buf.readUInt32LE(off + 42);
    const nome = buf.toString("utf8", off + 46, off + 46 + tamNome);
    const lNome = buf.readUInt16LE(offLocal + 26);
    const lExtra = buf.readUInt16LE(offLocal + 28);
    const ini = offLocal + 30 + lNome + lExtra;
    const comp = buf.subarray(ini, ini + tamComp);
    out.push({ nome, dados: metodo === 8 ? inflateRawSync(comp) : Buffer.from(comp) });
    off += 46 + tamNome + tamExtra + tamComent;
  }
  return out;
}

function celulas(xml: string): Map<string, string | number> {
  const m = new Map<string, string | number>();
  for (const c of xml.matchAll(/<c r="([A-Z]+\d+)"(?:[^>]*t="([^"]*)")?[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const v = (c[3] ?? "").match(/<v>([\s\S]*?)<\/v>/);
    if (v) m.set(c[1], c[2] === "s" ? `s:${v[1]}` : parseFloat(v[1]));
  }
  return m;
}

const serialParaISO = (s: number) =>
  new Date(Math.round((s - 25569) * 86400000)).toISOString().slice(0, 10);

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    const pg = await fetch(URL_PAGINA, { headers: UA });
    if (!pg.ok) throw new Error(`HTTP ${pg.status} na página da série histórica`);
    const html = await pg.text();
    const mUrl = html.match(/href="([^"]*semanal-brasil-desde-2013[^"]*\.xlsx[^"]*)"/i);
    if (!mUrl) throw new Error("link semanal-brasil-desde-2013.xlsx não encontrado — página mudou?");

    const r = await fetch(mUrl[1], { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status} no XLSX`);
    const entradas = lerZip(Buffer.from(await r.arrayBuffer()));

    const ss = entradas.find((e) => e.nome === "xl/sharedStrings.xml");
    const shared: string[] = [];
    if (ss) for (const m of ss.dados.toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
    }
    const ws = entradas.find((e) => /^xl\/worksheets\/sheet1\.xml$/.test(e.nome));
    if (!ws) throw new Error("worksheet ausente");
    const cel = celulas(ws.dados.toString("utf8"));

    // Linhas: A=data inicial (serial), B=data final, C=produto (shared), F=preço médio revenda
    const serie: [string, number][] = [];
    for (const [ref, val] of cel) {
      if (!ref.startsWith("C")) continue;
      const linha = ref.slice(1);
      const prod = typeof val === "string" && val.startsWith("s:") ? shared[+val.slice(2)] : val;
      if (prod !== "OLEO DIESEL S10") continue;
      const ini = cel.get(`A${linha}`);
      const fim = cel.get(`B${linha}`);
      const preco = cel.get(`F${linha}`);
      if (typeof ini === "number" && ini >= DESDE_SERIAL && typeof fim === "number" && typeof preco === "number") {
        serie.push([serialParaISO(fim), +preco.toFixed(3)]);
      }
    }
    // HEALTHCHECK: série recente precisa existir e ser plausível (R$ 3–15/L).
    if (serie.length < 10 || serie.some(([, p]) => p < 3 || p > 15)) {
      throw new Error(`série implausível (${serie.length} pontos) — layout mudou?`);
    }
    serie.sort((a, b) => (a[0] < b[0] ? -1 : 1));

    const cache = {
      fonte: "ANP — Levantamento de Preços de Combustíveis (série histórica semanal, Brasil)",
      url: URL_PAGINA,
      produto: "OLEO DIESEL S10",
      metrica: "preço médio de revenda, Brasil, R$/litro",
      coletadoEm: hoje,
      status: "ok" as const,
      formato: "[dataFinalSemana ISO, precoRSporLitro]",
      serie,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[anp-diesel] OK — ${serie.length} semanas (${serie[0][0]} → ${serie[serie.length - 1][0]})`);
  } catch (e) {
    let anterior: object | null = null;
    try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }
    const cache = {
      ...((anterior as object) ?? { serie: [] }),
      coletadoEm: hoje,
      status: "indisponivel" as const,
      erro: (e as Error).message,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1) + "\n");
    console.error(`[anp-diesel] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

main();
