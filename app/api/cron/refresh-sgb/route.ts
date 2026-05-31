// Endpoint de cron para atualizar o boletim SGB/CPRM (SAH Amazonas).
//
// Porta o caminho critico do scripts/pipeline-sace.py para o servidor (Railway):
// raspa a listagem de boletins do Amazonas no sgb.gov.br, baixa o PDF mais
// recente do mes, parseia com parseBoletimSGB (o MESMO parser do /api/sgb) e
// grava boletins_sgb_cache.json no volume DATA_DIR — de onde fetchPrevisao2026 le.
//
// Rodar aqui (e nao no CI) faz o fetch do sgb.gov.br sair do Railway, que ja
// acessa fontes externas (ANA, NOAA). O GitHub Actions so dispara.
//
// Dedup por numero+data (mantem 30). Protegido por Bearer ${CRON_SECRET}.

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { parseBoletimSGB, type BoletimSGB } from "@/lib/sgb-parser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const CACHE_PATH = join(DATA_DIR, "boletins_sgb_cache.json");
const BASE = "https://www.sgb.gov.br/sace";
const LISTA_AMAZONAS = `${BASE}/amazonas_boletins.php`;
const UA = "Mozilla/5.0 (compatible; IBI-Observatorio/1.0; +https://hidrovias.up.railway.app)";

interface CacheSGB {
  boletins: BoletimSGB[];
  ultimo_upload: string | null;
  total: number;
}

function lerCache(): CacheSGB {
  if (!existsSync(CACHE_PATH)) return { boletins: [], ultimo_upload: null, total: 0 };
  try { return JSON.parse(readFileSync(CACHE_PATH, "utf-8")); }
  catch { return { boletins: [], ultimo_upload: null, total: 0 }; }
}

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Prefixos YYYYMM do mes atual e anterior (fuso Manaus) — cobre virada de mes.
function mesesPrefixos(): string[] {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" }); // YYYY-MM-DD
  const [y, m] = hoje.split("-").map(Number);
  const atual = `${y}${String(m).padStart(2, "0")}`;
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const anterior = `${py}${String(pm).padStart(2, "0")}`;
  return [atual, anterior];
}

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  // 1. Raspa a listagem do Amazonas e extrai hrefs de PDF.
  let listaHtml: string;
  try {
    const resp = await fetch(LISTA_AMAZONAS, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    listaHtml = await resp.text();
  } catch (e) {
    return NextResponse.json({ ok: false, erro: `Falha ao baixar listagem SGB: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const hrefRe = /href=['"](?:\.\/|\/)?(boletins\/[^'"]+\.pdf)['"]/gi;
  const hrefs = new Set<string>();
  let mm: RegExpExecArray | null;
  while ((mm = hrefRe.exec(listaHtml)) !== null) hrefs.add(mm[1]);

  // Filtra pelos meses atual/anterior e pega o PDF mais recente (nome YYYYMMDD...).
  const prefixos = mesesPrefixos();
  const candidatos = [...hrefs].filter((h) => {
    const nome = h.split("/").pop() ?? "";
    return prefixos.some((p) => nome.startsWith(p));
  });
  if (candidatos.length === 0) {
    return NextResponse.json({ ok: true, mudou: false, mensagem: `Nenhum boletim do Amazonas para ${prefixos.join("/")} na listagem`, total: lerCache().total });
  }
  candidatos.sort((a, b) => (a.split("/").pop() ?? "").localeCompare(b.split("/").pop() ?? ""));
  const escolhido = candidatos[candidatos.length - 1];

  // 2. Baixa o PDF (Railway egress).
  const urlPdf = `${BASE}/${escolhido.split("/").map(encodeURIComponent).join("/")}`;
  let buffer: Buffer;
  try {
    const resp = await fetch(urlPdf, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    buffer = Buffer.from(await resp.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ ok: false, erro: `Falha ao baixar PDF ${urlPdf}: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  // 3. Parseia com o MESMO parser do /api/sgb.
  let boletim: BoletimSGB;
  try {
    boletim = await parseBoletimSGB(buffer);
  } catch (e) {
    return NextResponse.json({ ok: false, erro: `Falha ao parsear PDF: ${e instanceof Error ? e.message : String(e)}`, pdf: escolhido }, { status: 502 });
  }

  // 4. Cache: dedup por numero+data (mantem 30) — mesma logica do /api/sgb.
  const cache = lerCache();
  const dup = cache.boletins.findIndex((b) => b.numero === boletim.numero && b.data === boletim.data);
  const jaExistia = dup >= 0;
  if (dup >= 0) cache.boletins[dup] = boletim;
  else cache.boletins.push(boletim);
  if (cache.boletins.length > 30) cache.boletins = cache.boletins.slice(-30);
  cache.ultimo_upload = new Date().toISOString();
  cache.total = cache.boletins.length;

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");

  return NextResponse.json({
    ok: true,
    mudou: !jaExistia,
    mensagem: `Boletim ${boletim.numero ?? "?"} (${boletim.data}): ${boletim.estacoes.length} estações, ${boletim.previsoes.length}/4 previsões${jaExistia ? " (ja existia — atualizado)" : ""}`,
    pdf: escolhido,
    numero: boletim.numero ?? null,
    data: boletim.data,
    previsoes: boletim.previsoes.length,
    total: cache.total,
  });
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
