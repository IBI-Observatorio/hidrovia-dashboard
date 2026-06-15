// Supervisor do modelo do boletim de cabotagem.
// Compara as DUAS últimas entradas de data/boletim-cabotagem-series.json e
// decide se o modelo da semana passada ainda se sustenta ou se houve uma
// "guinada" (mudança de regime que invalida a leitura anterior).
//
// Arquitetura (decidida com o Bruno):
//   - Esta ROTA só computa o diff + veredito e DEVOLVE JSON. Nunca muda o modelo.
//   - O WORKFLOW (supervisor-boletim-semanal.yml) lê esse JSON e, se houver
//     guinada, abre uma Issue/PR propondo a mudança — o humano aprova.
//   - Para semanas estáveis NÃO chama a IA (gate por threshold) → custo zero.
//
// As duas entradas chegam no corpo do POST (o workflow as lê do repo após
// checkout, matando a corrida de timing com o deploy). Fallback: lê do disco.
//
// Proteção: header Authorization: Bearer ${CRON_SECRET} (mesma chave do insights).
// Requer ANTHROPIC_API_KEY no Railway (já existe, usada pelo insights).

import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const SERIE_REPO = join(process.cwd(), "data", "boletim-cabotagem-series.json");
const CACHE_OUT = join(DATA_DIR, "supervisor-boletim-cache.json");
const MODELO = "claude-haiku-4-5-20251001";

// Thresholds que caracterizam candidato a guinada (rascunho — calibrar com o tempo).
const TH = { proj_min_m: 0.75, crossing_dias: 10, churn: 2, prob: 0.25 };

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

const diaDe = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 864e5);
};
const deltaDias = (a?: string | null, b?: string | null): number | null => {
  const da = diaDe(a), db = diaDe(b);
  if (da == null || db == null) return null;
  return da - db;
};

type Entrada = Record<string, any>;

function calculaSinais(prev: Entrada, cur: Entrada) {
  const pc = (e: Entrada) => e.projecao_cmr_2026 ?? {};
  const proj_min_delta_m = {
    central: round(pc(cur).central - pc(prev).central),
    pessimista: round(pc(cur).pessimista - pc(prev).pessimista),
    otimista: round(pc(cur).otimista - pc(prev).otimista),
  };
  const crossing_delta_days = deltaDias(cur.cruzamento_cmr11?.central, prev.cruzamento_cmr11?.central);
  const crossing_apareceu_ou_sumiu =
    (!!cur.cruzamento_cmr11?.central) !== (!!prev.cruzamento_cmr11?.central);

  const anos = (e: Entrada) => (e.analogos_top ?? []).slice(0, 3).map((a: any) => a.ano);
  const anosCur = anos(cur), anosPrev = anos(prev);
  const analog_churn = anosCur.filter((a: number) => !anosPrev.includes(a)).length;

  const restricao_prob_delta = round((cur.restricao?.prob ?? 0) - (prev.restricao?.prob ?? 0));
  const restricao_p50_delta_days = deltaDias(cur.restricao?.p50, prev.restricao?.p50);

  const z_shift = (() => {
    const zc = cur.z_2026 ?? {}, zp = prev.z_2026 ?? {};
    const gs = ["MAO", "BOR", "MNC", "ITA"];
    let mx = 0, drv = "";
    for (const g of gs) {
      const d = Math.abs((zc[g] ?? 0) - (zp[g] ?? 0));
      if (d > mx) { mx = d; drv = g; }
    }
    return { max: round(mx), driver: drv };
  })();

  const enso_changed = (cur.contexto?.enso_status ?? null) !== (prev.contexto?.enso_status ?? null);

  return {
    de: prev.data_referencia, para: cur.data_referencia,
    proj_min_delta_m, crossing_delta_days, crossing_apareceu_ou_sumiu,
    analog_churn, analogos_prev: anosPrev, analogos_cur: anosCur,
    restricao_prob_delta, restricao_p50_delta_days,
    z_shift,
    enso_changed, enso_prev: prev.contexto?.enso_status ?? null, enso_cur: cur.contexto?.enso_status ?? null,
    sgb_prev: prev.contexto?.sgb_numero ?? null, sgb_cur: cur.contexto?.sgb_numero ?? null,
  };
}

function round(x: number, n = 2): number | null {
  if (x == null || Number.isNaN(x)) return null;
  return +Number(x).toFixed(n);
}

function disparou(s: ReturnType<typeof calculaSinais>): boolean {
  return (
    Math.abs(s.proj_min_delta_m.central ?? 0) >= TH.proj_min_m ||
    (s.crossing_delta_days != null && Math.abs(s.crossing_delta_days) >= TH.crossing_dias) ||
    s.crossing_apareceu_ou_sumiu ||
    s.analog_churn >= TH.churn ||
    Math.abs(s.restricao_prob_delta ?? 0) >= TH.prob ||
    s.enso_changed
  );
}

const SISTEMA = `Você é o supervisor do modelo do Observatório de Infraestrutura de Transportes do IBI.
O modelo projeta o calado (CMR) de Itacoatiara e a cabotagem conteinerizada da Amazônia por um ensemble de análogos multi-driver (Negro, Madeira, Solimões, Itacoatiara).
Sua função NÃO é refazer o modelo. É julgar, a partir do diff entre a leitura desta semana e a da semana passada, se o modelo AINDA SE SUSTENTA ou se houve uma GUINADA de regime que exige revisão.
Seja sóbrio e quantitativo. "guinada" só quando o estado realmente virou (ex.: troca do conjunto de anos-análogos, salto no calado projetado, antecipação grande da restrição, mudança de fase ENSO). Caso contrário, "sustains".
Distinga "o rio mudou" (esperado, o modelo acompanha) de "o modelo deixou de descrever o rio" (guinada/diverges).`;

function montaPrompt(sinais: object, prev: Entrada, cur: Entrada): string {
  return `Diff entre as duas últimas leituras semanais do boletim.

SEMANA ANTERIOR (${prev.data_referencia}):
${JSON.stringify({ z: prev.z_2026, analogos: (prev.analogos_top ?? []).map((a: any) => a.ano), cmr: prev.projecao_cmr_2026, restricao: prev.restricao, enso: prev.contexto?.enso_status }, null, 1)}

SEMANA ATUAL (${cur.data_referencia}):
${JSON.stringify({ z: cur.z_2026, analogos: (cur.analogos_top ?? []).map((a: any) => a.ano), cmr: cur.projecao_cmr_2026, restricao: cur.restricao, enso: cur.contexto?.enso_status }, null, 1)}

SINAIS DETERMINÍSTICOS (já calculados):
${JSON.stringify(sinais, null, 1)}

Responda EXCLUSIVAMENTE com um objeto JSON com exatamente estes campos:
- "verdict": "sustains" | "guinada" | "diverges"
- "because": string curta (1-2 frases) explicando o veredito citando os números
- "narrative_tone": string curta — se o tom do boletim deve mudar (ex.: "manter", "subir alerta: restrição antecipou", "aliviar: rio recuperou")
- "human_review": boolean — true se o Bruno deve revisar o modelo antes do próximo envio
- "proposed_change": string — se guinada/diverges, o que propor (ex.: "repesar análogos para incluir 2024"); senão ""

Não inclua markdown, código ou texto fora do JSON.`;
}

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  // 1) Duas últimas entradas: corpo do POST (preferido) ou disco (fallback).
  let prev: Entrada | undefined, cur: Entrada | undefined;
  try {
    const body = await request.json().catch(() => null);
    if (body?.prev && body?.cur) { prev = body.prev; cur = body.cur; }
  } catch { /* sem corpo */ }
  if (!prev || !cur) {
    try {
      const path = existsSync(SERIE_REPO) ? SERIE_REPO : join(DATA_DIR, "boletim-cabotagem-series.json");
      const serie = JSON.parse(readFileSync(path, "utf8")).serie ?? [];
      if (serie.length >= 2) { prev = serie.at(-2); cur = serie.at(-1); }
    } catch { /* sem série */ }
  }
  if (!prev || !cur) {
    return NextResponse.json({ ok: true, verdict: "sustains", because: "série insuficiente (< 2 semanas)", human_review: false, proposed_change: "" });
  }

  // 2) Sinais determinísticos + gate por threshold.
  const sinais = calculaSinais(prev, cur);
  if (!disparou(sinais)) {
    const out = { ok: true, verdict: "sustains" as const, because: "nenhum threshold disparou — leitura estável", narrative_tone: "manter", human_review: false, proposed_change: "", sinais, ai: false };
    persiste(out);
    return NextResponse.json(out);
  }

  // 3) Só aqui chama a IA (algum threshold disparou).
  if (!process.env.ANTHROPIC_API_KEY) {
    // Sem chave: devolve candidato a guinada pelos sinais, marca p/ revisão humana.
    const out = { ok: true, verdict: "guinada" as const, because: "thresholds dispararam; IA indisponível (sem ANTHROPIC_API_KEY) — revisar manualmente", narrative_tone: "rever", human_review: true, proposed_change: "revisar diff manualmente", sinais, ai: false };
    persiste(out);
    return NextResponse.json(out);
  }
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODELO,
      max_tokens: 1024,
      system: SISTEMA,
      messages: [{ role: "user", content: montaPrompt(sinais, prev, cur) }],
    });
    const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\{[\s\S]*\})/);
    const parsed = JSON.parse(m ? m[1] : raw.trim());
    const verdict = ["sustains", "guinada", "diverges"].includes(parsed.verdict) ? parsed.verdict : "guinada";
    const out = {
      ok: true,
      verdict,
      because: String(parsed.because ?? "").slice(0, 600),
      narrative_tone: String(parsed.narrative_tone ?? "").slice(0, 200),
      human_review: !!parsed.human_review || verdict !== "sustains",
      proposed_change: String(parsed.proposed_change ?? "").slice(0, 600),
      sinais, ai: true, modelo: MODELO,
    };
    persiste(out);
    return NextResponse.json(out);
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    const out = { ok: true, verdict: "guinada" as const, because: `thresholds dispararam; falha na IA (${erro}) — revisar manualmente`, narrative_tone: "rever", human_review: true, proposed_change: "revisar diff manualmente", sinais, ai: false };
    persiste(out);
    return NextResponse.json(out);
  }
}

function persiste(out: object) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(CACHE_OUT, JSON.stringify({ gerado_em: new Date().toISOString(), ...out }, null, 2), "utf-8");
  } catch { /* auditoria é best-effort */ }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
