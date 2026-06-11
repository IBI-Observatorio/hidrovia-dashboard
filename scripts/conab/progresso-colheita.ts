// scripts/conab/progresso-colheita.ts
// Coleta o PROGRESSO DE SAFRA da Conab (semanal): % COLHIDO de SOJA e MILHO
// (1ª e 2ª safra) por UF, a partir dos XLSX "Plantio e Colheita" publicados
// no portal gov.br/conab (listing Plone, URL não previsível → crawl).
//
// Fonte: Conab — Progresso de Safra / Acompanhamento das Lavouras
//   https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/progresso-de-safra
// Licença: CC Atribuição-SemDerivações 3.0 / uso sem fins lucrativos com
// citação — TODO card que exibir o componente S precisa citar a fonte.
//
// Saída: data/conab/progresso-colheita.json
//   { fonte, url, coletadoEm, status: "ok"|"indisponivel", ufs, semanas: [
//       { d: "YYYY-MM-DD" (fim da semana), S|M1|M2: { sf: "2025/26",
//         u: { UF: [pctAtual, media5Anos, anoAnterior] } } } ] }
//   Frações 0–1. Semana sem bloco de Colheita (entressafra) não entra —
//   ausência é dado honesto; NUNCA interpolar.
//
// HEALTHCHECK (isolado): se o listing, o XLSX ou a estrutura da planilha
// mudarem, o script marca status "indisponivel" SEM apagar as semanas da
// última coleta boa — o card de S cai para o estado honesto na UI.
//
// Particularidades da fonte (descobertas na engenharia do scraper):
//   - HEAD retorna 403 (Plone); usar GET direto.
//   - O título "Trigo - Safra 2025" NÃO tem o formato AAAA/AA — a fronteira
//     de blocos precisa aceitar "- Safra 20xx" genérico, senão a colheita
//     do trigo contamina o bloco da soja (bug real, ver PASSO 3).
//   - Valores são frações 0–1; coluna 4 = semana atual, 5 = média 5 anos,
//     2 = mesma semana do ano anterior (índices da linha do XLSX).
//
// Execução: node --experimental-strip-types scripts/conab/progresso-colheita.ts
// (Node >= 22.6; em Node 23+ o strip-types é default)

import { inflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "conab", "progresso-colheita.json");

const URL_LISTING =
  "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/progresso-de-safra";

const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };

/** UFs coletadas (hinterlândias dos corredores; Santos usa SP MG GO MS MT). */
const UFS_COLETA = ["SP", "MG", "GO", "MS", "MT"] as const;

const NOME_UF: Record<string, string> = {
  "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Goiás": "GO", "Goias": "GO",
  "São Paulo": "SP", "Sao Paulo": "SP", "Minas Gerais": "MG",
};

// ---------------------------------------------------------------------------
// Mini-leitor de XLSX (sem dependências): XLSX = ZIP (deflate-raw) + XML.
// Lê apenas o necessário: sharedStrings.xml + primeira worksheet.
// ---------------------------------------------------------------------------

interface EntradaZip { nome: string; dados: Buffer }

function lerZip(buf: Buffer): EntradaZip[] {
  // Localiza o End Of Central Directory (assinatura 0x06054b50).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP sem EOCD — não é XLSX válido");
  const nEntradas = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out: EntradaZip[] = [];
  for (let e = 0; e < nEntradas; e++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("central directory corrompido");
    const metodo = buf.readUInt16LE(off + 10);
    const tamComp = buf.readUInt32LE(off + 20);
    const tamNome = buf.readUInt16LE(off + 28);
    const tamExtra = buf.readUInt16LE(off + 30);
    const tamComent = buf.readUInt16LE(off + 32);
    const offLocal = buf.readUInt32LE(off + 42);
    const nome = buf.toString("utf8", off + 46, off + 46 + tamNome);
    // cabeçalho local: tamanhos próprios de nome/extra
    const lNome = buf.readUInt16LE(offLocal + 26);
    const lExtra = buf.readUInt16LE(offLocal + 28);
    const ini = offLocal + 30 + lNome + lExtra;
    const comp = buf.subarray(ini, ini + tamComp);
    out.push({ nome, dados: metodo === 8 ? inflateRawSync(comp) : Buffer.from(comp) });
    off += 46 + tamNome + tamExtra + tamComent;
  }
  return out;
}

const desXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
   .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
   .replace(/&amp;/g, "&");

/** Worksheet XML → linhas como arrays indexados por coluna (A=0, B=1…). */
function planilhaParaLinhas(xml: string, shared: string[]): (string | number | null)[][] {
  const linhas: (string | number | null)[][] = [];
  for (const mRow of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const r = parseInt(mRow[1], 10) - 1;
    const linha: (string | number | null)[] = [];
    for (const mC of mRow[2].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*t="([^"]*)")?[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = mC[1].split("").reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const tipo = mC[2]; const corpo = mC[3] ?? "";
      const mV = corpo.match(/<v>([\s\S]*?)<\/v>/);
      const mIs = corpo.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
      let val: string | number | null = null;
      if (tipo === "s" && mV) val = shared[+mV[1]] ?? null;
      else if (tipo === "inlineStr" && mIs) val = desXml(mIs[1]);
      else if (mV) val = parseFloat(mV[1]);
      linha[col] = val;
    }
    linhas[r] = linha;
  }
  return linhas;
}

function lerXlsx(buf: Buffer): (string | number | null)[][] {
  const entradas = lerZip(buf);
  const ss = entradas.find((e) => e.nome === "xl/sharedStrings.xml");
  const shared: string[] = [];
  if (ss) for (const m of ss.dados.toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(desXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  }
  const ws = entradas.find((e) => /^xl\/worksheets\/sheet1\.xml$/.test(e.nome))
    ?? entradas.find((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.nome));
  if (!ws) throw new Error("worksheet não encontrada no XLSX");
  return planilhaParaLinhas(ws.dados.toString("utf8"), shared);
}

// ---------------------------------------------------------------------------
// Parser do layout Conab (mesma lógica validada no PASSO 3)
// ---------------------------------------------------------------------------

type Cultura = "S" | "M1" | "M2";
interface BlocoColheita { sf: string; serial: number | null; u: Record<string, number[]> }

function extraiBlocos(linhas: (string | number | null)[][]): Partial<Record<Cultura, BlocoColheita>> {
  const titulos: number[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const t = String(linhas[i]?.[1] ?? "");
    if (/ - Safra 20\d\d/.test(t)) titulos.push(i); // genérico: pega "Trigo - Safra 2025" como fronteira
  }
  titulos.push(linhas.length);
  const out: Partial<Record<Cultura, BlocoColheita>> = {};
  for (let ti = 0; ti < titulos.length - 1; ti++) {
    const i = titulos[ti];
    const m = String(linhas[i][1]).match(/^(Soja|Milho 1ª|Milho 2ª) - Safra (\d{4}\/\d{2})/);
    if (!m) continue;
    const key: Cultura = m[1] === "Soja" ? "S" : m[1] === "Milho 1ª" ? "M1" : "M2";
    const fim = titulos[ti + 1];
    for (let j = i + 1; j < fim; j++) {
      if (!/^Colheita/.test(String(linhas[j]?.[1] ?? ""))) continue;
      const serRow = linhas[j + 3];
      const serial = typeof serRow?.[4] === "number" && (serRow[4] as number) > 40000 ? (serRow[4] as number) : null;
      const u: Record<string, number[]> = {};
      for (let k = j + 4; k < fim; k++) {
        const nome = String(linhas[k]?.[1] ?? "").trim();
        if (!nome || /estados/.test(nome)) break;
        const uf = NOME_UF[nome];
        const r = linhas[k];
        if (uf && (UFS_COLETA as readonly string[]).includes(uf) && typeof r[4] === "number") {
          u[uf] = [
            +(r[4] as number).toFixed(3),
            typeof r[5] === "number" ? +(r[5] as number).toFixed(3) : (null as unknown as number),
            typeof r[2] === "number" ? +(r[2] as number).toFixed(3) : (null as unknown as number),
          ];
        }
      }
      if (Object.keys(u).length) out[key] = { sf: m[2], serial, u };
      break;
    }
  }
  return out;
}

const serialParaISO = (s: number) =>
  new Date(Math.round((s - 25569) * 86400000)).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Crawl + coleta
// ---------------------------------------------------------------------------

async function coletaUrls(): Promise<string[]> {
  const urls = new Set<string>();
  for (let b = 0; b <= 600; b += 20) {
    const r = await fetch(`${URL_LISTING}?b_start:int=${b}`, { headers: UA });
    if (!r.ok) break;
    const html = await r.text();
    const novas = [...html.matchAll(/href="([^"]*plantio-e-colheita[^"]*)"/g)].map((m) => m[1]);
    if (novas.length === 0) break;
    novas.forEach((u) => urls.add(u));
  }
  return [...urls];
}

interface Cache {
  fonte: string; url: string; licenca: string; coletadoEm: string;
  status: "ok" | "indisponivel"; erro?: string; ufs: string[];
  culturas: Record<string, string>; formatoUF: string; observacao: string;
  semanas: ({ d: string } & Partial<Record<Cultura, { sf: string; u: Record<string, number[]> }>>)[];
}

function cacheAnterior(): Cache | null {
  try { return JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { return null; }
}

async function main() {
  const anterior = cacheAnterior();
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    const urls = await coletaUrls();
    if (urls.length === 0) throw new Error("listing sem links 'plantio-e-colheita' — estrutura mudou?");

    const porData = new Map<string, ReturnType<typeof extraiBlocos>>();
    let falhas = 0;
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: UA });
        if (!r.ok) { falhas++; continue; }
        const blocos = extraiBlocos(lerXlsx(Buffer.from(await r.arrayBuffer())));
        const serial = blocos.S?.serial ?? blocos.M2?.serial ?? blocos.M1?.serial;
        if (!serial) continue; // arquivo só de semeadura (entressafra) — ausência honesta
        porData.set(serialParaISO(serial), blocos);
      } catch { falhas++; }
    }
    // HEALTHCHECK: precisa ter parseado a maioria dos arquivos e ≥1 semana.
    if (porData.size === 0 || falhas > urls.length / 2) {
      throw new Error(`parse falhou em ${falhas}/${urls.length} arquivos — layout do XLSX mudou?`);
    }

    const semanas = [...porData.entries()]
      .map(([d, b]) => {
        const w: Cache["semanas"][number] = { d };
        for (const k of ["S", "M1", "M2"] as Cultura[]) {
          if (b[k] && Object.keys(b[k]!.u).length) w[k] = { sf: b[k]!.sf, u: b[k]!.u };
        }
        return w;
      })
      .filter((w) => w.S || w.M1 || w.M2)
      .sort((a, z) => (a.d < z.d ? -1 : 1));

    const cache: Cache = {
      fonte: "Conab — Progresso de Safra / Acompanhamento das Lavouras",
      url: URL_LISTING,
      licenca: "Creative Commons Atribuição-SemDerivações 3.0 — uso sem fins lucrativos com citação da fonte",
      coletadoEm: hoje, status: "ok",
      ufs: [...UFS_COLETA],
      culturas: { S: "Soja", M1: "Milho 1ª safra", M2: "Milho 2ª safra" },
      formatoUF: "[pctColhido semana atual, média 5 anos mesma semana, ano anterior mesma semana] — frações 0–1",
      observacao: "Semanas sem bloco de Colheita no XLSX da Conab (entressafra) não aparecem — ausência é dado honesto, não interpolar.",
      semanas,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[progresso-colheita] OK — ${semanas.length} semanas (${semanas[0].d} → ${semanas[semanas.length - 1].d})`);
  } catch (e) {
    // Estado honesto: preserva últimas semanas boas, marca indisponível.
    const cache = {
      ...(anterior ?? { semanas: [] as Cache["semanas"], ufs: [...UFS_COLETA] }),
      fonte: "Conab — Progresso de Safra / Acompanhamento das Lavouras",
      url: URL_LISTING,
      coletadoEm: hoje,
      status: "indisponivel" as const,
      erro: (e as Error).message,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1) + "\n");
    console.error(`[progresso-colheita] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

main();
