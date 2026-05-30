// Endpoint chamado pelo cron do Railway (mesmo service da terça) para regenerar
// os Insights Automáticos via Claude e gravar o cache no volume persistente.
// Substitui o passo `gera-insights-ai.mjs` do run-pipeline-sace.bat — que rodava
// só na máquina do Bruno e nunca chegava à produção (ver docs/RUNBOOK-DADOS.md).
//
// Diferença para o script: busca os níveis e o IDN AO VIVO (fetchTodasEstacoes /
// série IDN calculada) em vez de ler caches locais. ENSO e o último boletim SGB
// vêm de fetchPrevisao2026 (que já é DATA_DIR-aware e degrada para fallback).
//
// Proteção: header Authorization: Bearer ${CRON_SECRET} (mesma chave do briefing).
//
// Configuração no Railway:
//   - Variáveis ANTHROPIC_API_KEY e CRON_SECRET no service web
//   - Cron service com schedule "0 11 * * 2" (terça 08:00 Manaus = 11:00 UTC)
//   - Comando: curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
//              "https://$RAILWAY_PUBLIC_DOMAIN/api/cron/insights"

import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTodasEstacoes, fetchPrevisao2026 } from "@/lib/fetch-dados";
import { IDN_RECENTE_DIARIO } from "@/lib/idn-historico-calculado";
import type { InsightData } from "@/lib/gera-insights";

const DATA_DIR  = process.env.DATA_DIR ?? join(process.cwd(), "data");
const CACHE_OUT = join(DATA_DIR, "insights_ai_cache.json");
const MODELO    = "claude-haiku-4-5-20251001";

const TIPOS_VALIDOS: InsightData["tipo"][] = ["critico", "alerta", "info", "positivo"];

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem secret configurado, recusa por segurança
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

const SISTEMA = `Você é o analista hidrológico sênior do Observatório de Infraestrutura de Transportes do IBI (Instituto Brasileiro de Infraestrutura).
Sua missão é produzir insights analíticos semanais sobre a situação das hidrovias amazônicas para operadores logísticos, gestores portuários e analistas de mercado.

Diretrizes editoriais:
- Linguagem direta, técnica e calibrada. Sem alarmismo, sem eufemismo.
- Cite sempre os números concretos. Compare com 2024 e 2025 quando relevante.
- O IDN (Índice de Dessincronização Norte-Sul) mede a divergência entre sub-bacias Norte (Negro/Branco) e Sul (Madeira/Purus). IDN > +0,56 = Driver Norte; IDN < −0,15 = Driver Sul; entre = Sincronizado.
- Fronteiras GMM calibradas (2016–2023): Sul ≤ −0,15; Norte ≥ +0,56.
- Nível 17,7 m em Manaus é a referência regulatória de Baixas Águas (ANTAQ/LWS).
- Priorize o que é acionável para o setor de transporte fluvial.`;

function montaPromptUsuario(opts: {
  dataRef: string;
  linhasEstacoes: string;
  idnAtual: number;
  tendIDN: number;
  idnMin: string;
  idnMax: string;
  boletimStr: string;
  ensoStr: string;
}): string {
  const { dataRef, linhasEstacoes, idnAtual, tendIDN, idnMin, idnMax, boletimStr, ensoStr } = opts;
  return `Data de referência: ${dataRef}

NÍVEIS DAS ESTAÇÕES (ANA/SNIRH, ao vivo):
${linhasEstacoes}

IDN ATUAL: ${idnAtual >= 0 ? "+" : ""}${idnAtual} | Tendência 30d: ${tendIDN >= 0 ? "+" : ""}${tendIDN} | Faixa 30d: [${idnMin}; ${idnMax}]
${boletimStr}
${ensoStr}

Com base nesses dados, gere entre 3 e 6 insights para o painel do Observatório IBI.

Responda EXCLUSIVAMENTE com um array JSON. Cada elemento deve ter exatamente estes campos:
- "tipo": um de "critico" | "alerta" | "info" | "positivo"
- "titulo": string curta (máx 90 caracteres), título do insight
- "texto": string de 1-3 frases com o contexto analítico
- "estacao": (opcional) nome da estação mais relevante

Não inclua markdown, código, comentários ou qualquer texto fora do JSON.`;
}

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, erro: "ANTHROPIC_API_KEY ausente" }, { status: 500 });
  }

  const dataRef = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });

  try {
    const [dados, previsao] = await Promise.all([fetchTodasEstacoes(), fetchPrevisao2026()]);

    // ── Linhas por estação (mesma formatação do gera-insights-ai.mjs) ──────────
    const sinal = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
    const linhasEstacoes = [
      "Manaus", "Itacoatiara", "Manacapuru",
      "PortoVelho", "Humaita", "Manicore",
      "Labrea", "Curicuriari",
    ]
      .map((nome) => {
        const d = dados[nome];
        if (!d) return null;
        return `${nome}: ${d.cota_m.toFixed(2)} m (Δ24h ${sinal(d.variacao_24h)} cm | vs 2025: ${sinal(d.delta_2025)} cm | vs 2024: ${sinal(d.delta_2024)} cm)`;
      })
      .filter(Boolean)
      .join("\n");

    // ── IDN: série diária calculada (mesma fonte do gauge histórico) ───────────
    const serie30 = IDN_RECENTE_DIARIO.slice(-30);
    const idnAtual = +(serie30.at(-1)?.idn ?? 0).toFixed(3);
    const idnD30   = serie30.at(0)?.idn ?? idnAtual;
    const tendIDN  = +(idnAtual - idnD30).toFixed(3);
    const idnsArr  = serie30.map((p) => p.idn);
    const idnMin   = Math.min(...idnsArr).toFixed(3);
    const idnMax   = Math.max(...idnsArr).toFixed(3);

    // ── Contexto SGB + ENSO (via fetchPrevisao2026, DATA_DIR-aware) ────────────
    const boletimStr = previsao.numero_boletim
      ? `Último boletim SGB: nº ${previsao.numero_boletim}${previsao.data_boletim ? ` de ${previsao.data_boletim}` : ""}.`
      : "";
    const ensoStr = previsao.enso
      ? `ENSO — ${previsao.enso_status ?? ""} (CPC/NOAA${previsao.enso_data_emissao ? `, ${previsao.enso_data_emissao}` : ""}): ${previsao.enso}`.replace(/\s+\(/, " (")
      : "";

    const USUARIO = montaPromptUsuario({ dataRef, linhasEstacoes, idnAtual, tendIDN, idnMin, idnMax, boletimStr, ensoStr });

    // ── Chamada à API ──────────────────────────────────────────────────────────
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODELO,
      max_tokens: 2048,
      system: SISTEMA,
      messages: [{ role: "user", content: USUARIO }],
    });

    const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\[[\s\S]*\])/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw.trim();

    let insights: InsightData[];
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) throw new Error("resposta não é um array");
      insights = parsed;
    } catch (e) {
      return NextResponse.json(
        { ok: false, erro: `Falha ao parsear JSON da IA: ${e instanceof Error ? e.message : String(e)}`, raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    // Valida campos obrigatórios (mesma regra do script)
    insights = insights.filter(
      (ins) => TIPOS_VALIDOS.includes(ins.tipo) && !!ins.titulo && !!ins.texto,
    );

    if (insights.length === 0) {
      return NextResponse.json({ ok: false, erro: "Nenhum insight válido retornado pela IA" }, { status: 502 });
    }

    // ── Persiste no volume (mesmo formato que lerInsightsAI espera) ─────────────
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const cache = {
      gerado_em: new Date().toISOString(),
      modelo: MODELO,
      data_ref: dataRef,
      insights,
    };
    writeFileSync(CACHE_OUT, JSON.stringify(cache, null, 2), "utf-8");

    return NextResponse.json({
      ok: true,
      mensagem: `${insights.length} insights regenerados (${MODELO}) para ${dataRef}`,
      modelo: MODELO,
      data_ref: dataRef,
      total: insights.length,
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: `Falha ao regenerar insights: ${erro}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
