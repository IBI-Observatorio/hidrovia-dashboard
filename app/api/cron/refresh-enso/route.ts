// Endpoint de cron para atualizar o advisory ENSO (CPC/NOAA).
//
// Porta a lógica do scripts/scrape-enso-cpc.py para rodar NO SERVIDOR (Railway):
// busca a ENSO Diagnostic Discussion, parseia status/data/síntese e grava
// data/enso_cpc_cache.json no volume DATA_DIR — exatamente de onde
// lerENSOAdvisory() (lib/enso-cpc.ts) lê em produção.
//
// Vantagem de rodar aqui (e não no CI): o fetch da NOAA sai do Railway, que ja
// acessa fontes externas (ANA) sem problema. O GitHub Actions so dispara.
//
// Idempotente: se a data_emissao nao mudou, nao regrava. Mensal (CPC publica na
// 2a quinta). Protegido por Authorization: Bearer ${CRON_SECRET}.

import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const CACHE_PATH = join(DATA_DIR, "enso_cpc_cache.json");
const URL_CPC = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml";
const UA = "Mozilla/5.0 (compatible; IBI-Observatorio/1.0; +https://hidrovias.up.railway.app)";

const MESES_EN_NUM: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};
const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function unescapeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&iacute;/g, "í")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function limpaHtml(s: string): string {
  return unescapeHtml(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function dataIso(dia: string, mesEn: string, ano: string): string {
  return `${ano}-${String(MESES_EN_NUM[mesEn]).padStart(2, "0")}-${String(parseInt(dia, 10)).padStart(2, "0")}`;
}

function dataPtCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${String(parseInt(d, 10)).padStart(2, "0")}/${MESES_PT[parseInt(mo, 10) - 1]}/${y}`;
}

interface ENSOAdvisory {
  status: string;
  data_emissao: string;
  sintese_pt: string;
  sintese_en: string;
  proxima_atualizacao: string | null;
  url: string;
  atualizado_em: string;
}

function parseHtml(html: string): ENSOAdvisory | null {
  const statusM = html.match(/ENSO Alert System Status:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
  const dataM = html.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/);
  if (!statusM || !dataM) return null;

  const status = limpaHtml(statusM[1]);
  const dataEm = dataIso(dataM[1], dataM[2], dataM[3]);

  const proxM = html.match(/next\s+ENSO\s+Diagnostics?\s+Discussion[^.]*scheduled\s+for\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  const prox = proxM ? dataIso(proxM[1], proxM[2], proxM[3]) : null;

  // Decodifica entities + remove tags antes do parse de síntese.
  const texto = unescapeHtml(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const sintM = texto.match(/(?:El\s+Ni[ñn]o|La\s+Ni[ñn]a|ENSO[^.]*?neutral)[^.]*?\d{1,3}\s*%\s*chance[^.]*\./i);
  const sintEn = sintM ? sintM[0].trim() : "";

  // Extrai as duas janelas de "% chance in <mes>-<mes> <ano>" mais citadas.
  const pctRe = /(\d{1,3})\s*%\s*chance\s+in\s+([A-Za-z]+)(?:-([A-Za-z]+))?\s+(\d{4})(?:-([A-Za-z]+\s+\d{4}))?/g;
  const janelas: string[] = [];
  let mm: RegExpExecArray | null;
  let count = 0;
  while ((mm = pctRe.exec(sintEn)) !== null && count < 2) {
    count++;
    const [, pct, m1, m2, ano1, ano2Full] = mm;
    const ini = MESES_EN_NUM[m1];
    const fim = m2 ? MESES_EN_NUM[m2] : ini;
    if (ini == null) continue;
    let rotulo = `${MESES_PT[ini - 1]}–${MESES_PT[fim - 1]}/${ano1.slice(-2)}`;
    if (ano2Full) {
      const m2b = ano2Full.match(/([A-Za-z]+)\s+(\d{4})/);
      if (m2b) {
        const fim2 = MESES_EN_NUM[m2b[1]];
        const anoFim = m2b[2];
        if (fim2 != null) rotulo = `${MESES_PT[ini - 1]}/${ano1.slice(-2)}–${MESES_PT[fim2 - 1]}/${anoFim.slice(-2)}`;
      }
    }
    janelas.push(`${pct}% ${rotulo}`);
  }

  const sintPt = janelas.length
    ? `${status} — ${janelas.join("; ")} (CPC/NOAA, ${dataPtCurta(dataEm)})`
    : `${status} (CPC/NOAA, ${dataPtCurta(dataEm)})`;

  return {
    status,
    data_emissao: dataEm,
    sintese_pt: sintPt,
    sintese_en: sintEn,
    proxima_atualizacao: prox,
    url: URL_CPC,
    atualizado_em: new Date().toISOString(),
  };
}

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let html: string;
  try {
    const resp = await fetch(URL_CPC, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (e) {
    return NextResponse.json({ ok: false, erro: `Falha ao baixar CPC/NOAA: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const novo = parseHtml(html);
  if (!novo) {
    return NextResponse.json({ ok: false, erro: "Não encontrei status/data na página da CPC" }, { status: 502 });
  }

  // Idempotência: mesma data_emissao → não regrava.
  if (existsSync(CACHE_PATH)) {
    try {
      const atual = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
      if (atual?.data_emissao === novo.data_emissao) {
        return NextResponse.json({ ok: true, mudou: false, mensagem: `ENSO sem novidade: ${novo.status} (${novo.data_emissao})`, ...novo });
      }
    } catch { /* cache corrompido — regrava */ }
  }

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(novo, null, 2), "utf-8");

  return NextResponse.json({ ok: true, mudou: true, mensagem: `ENSO atualizado: ${novo.status} (${novo.data_emissao})`, ...novo });
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
