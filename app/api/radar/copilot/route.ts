// Rota do Copiloto do Radar — orquestra os dois modos com a SEGURANÇA em código.
//
// A IA só (1) classifica+traduz a pergunta em JSON e (2) narra/explica em texto.
// QUEM calcula é o motor DCF determinístico do repo; QUEM valida/clampa as alavancas
// e resolve as fontes é este código. A IA nunca emite um número econômico exibido:
// os números de cenário vêm do ScenarioResult do motor; os do explicador, dos dados.
//
// Acesso: reusa o guard do Radar (clienteRadarAtual) — endpoint fechado p/ a Vale.
// Chave: ANTHROPIC_API_KEY é injetada pelo ambiente (Railway); nunca vai ao client.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { avaliarCenario, analisarAtivo, paramsFromAsset, type Levers, type Asset } from "@/lib/dcf";
import { clienteRadarAtual } from "@/lib/radar/acesso";
import { getRadarAsset, fullAsset, type RadarAssetEntry } from "@/lib/radar/assets";
import { alertasDoAtivo } from "@/lib/radar/alerts";
import { lerNotas, notasDoAtivo } from "@/lib/radar/notes";
import { processosDoAtivo } from "@/lib/radar/processos";
import {
  validarLevers,
  rotuloCenario,
  resolverFontes,
  numerosSemLastro,
  montarContextoExplicador,
  extrairJSON,
  SISTEMA_ROTEADOR,
  SISTEMA_EXPLICADOR,
  SISTEMA_NARRADOR,
} from "@/lib/radar/copilot";

const MODELO = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1000;
const MAX_PERGUNTA = 600;

// ── partes da resposta (o client renderiza cada uma) ──
type Parte =
  | { tipo: "explicacao"; texto: string; fontes: { label: string; url?: string; date?: string }[] }
  | { tipo: "bloqueada"; numeros: string[] }
  | { tipo: "cenario"; tir: number | null; spread: number | null; vpl: number; wacc: number; semTir: boolean; rotulo: string; leversAplicadas: Levers; clamps: string[]; narrativa: string }
  | { tipo: "confirmar"; interpretacao: string; leversPropostas: Levers; clamps: string[] }
  | { tipo: "reformular"; texto: string }
  | { tipo: "cenario-indisponivel"; texto: string }
  | { tipo: "erro"; texto: string };

async function chamarIA(client: Anthropic, system: string, user: string): Promise<string> {
  const msg = await client.messages.create({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });
  return msg.content[0]?.type === "text" ? msg.content[0].text : "";
}

export async function POST(request: NextRequest) {
  // 1) Acesso fechado (mesmo guard server-side do Radar).
  if (!(await clienteRadarAtual())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ partes: [{ tipo: "erro", texto: "Copiloto indisponível (sem credencial de IA configurada)." }] });
  }

  let body: { assetId?: string; pergunta?: string; leversConfirmadas?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });
  }

  const assetId = String(body.assetId ?? "").trim();
  const pergunta = String(body.pergunta ?? "").trim();
  if (!assetId) return NextResponse.json({ erro: "assetId ausente" }, { status: 400 });

  const entry = getRadarAsset(assetId);
  if (!entry) return NextResponse.json({ erro: "Ativo não encontrado" }, { status: 404 });
  const full = fullAsset(entry);

  const client = new Anthropic();

  // ── Caminho de CONFIRMAÇÃO: o usuário confirmou uma interpretação ambígua.
  // Pula a tradução (determinismo) e vai direto ao motor com as levers propostas.
  if (body.leversConfirmadas !== undefined) {
    const parte = await rodarCenario(client, full, body.leversConfirmadas, pergunta || rotuloCenario(validarLevers(body.leversConfirmadas).levers));
    return NextResponse.json({ partes: [parte] });
  }

  if (!pergunta) return NextResponse.json({ erro: "pergunta ausente" }, { status: 400 });
  if (pergunta.length > MAX_PERGUNTA) {
    return NextResponse.json({ partes: [{ tipo: "reformular", texto: "Pergunta muito longa — resuma em uma frase." }] });
  }

  // 2) Classificação + tradução (IA → JSON puro). Falha de parse ⇒ pede reformular.
  let rota: "explicador" | "cenario" | "ambos" = "explicador";
  let leversBrutas: unknown = null;
  let ambiguo = false;
  let interpretacao: string | null = null;
  try {
    const raw = await chamarIA(client, SISTEMA_ROTEADOR, pergunta);
    const j = extrairJSON(raw) as Record<string, unknown> | null;
    if (!j) {
      return NextResponse.json({ partes: [{ tipo: "reformular", texto: "Não entendi a pergunta. Pode reformular?" }] });
    }
    if (j.rota === "cenario" || j.rota === "ambos") rota = j.rota;
    else rota = "explicador";
    leversBrutas = j.levers ?? null;
    ambiguo = j.ambiguo === true;
    interpretacao = typeof j.interpretacao === "string" ? j.interpretacao : null;
  } catch (e) {
    return NextResponse.json({ partes: [{ tipo: "erro", texto: `Falha ao consultar o copiloto: ${e instanceof Error ? e.message : String(e)}` }] });
  }

  const partes: Parte[] = [];

  // 3) Parte EXPLICADOR (read-only sobre os dados do ativo).
  if (rota === "explicador" || rota === "ambos") {
    partes.push(await rodarExplicador(client, entry, full, pergunta));
  }

  // 4) Parte CENÁRIO (tradução → validação em código → motor → narração).
  if (rota === "cenario" || rota === "ambos") {
    const v = validarLevers(leversBrutas);
    if (!full) {
      // Ativo parcial: sem motor não há base p/ calcular — degrada com honestidade.
      partes.push({ tipo: "cenario-indisponivel", texto: "Este ativo ainda não tem estrutura econômico-financeira modelada no motor DCF (dados parciais), então não há base para calcular o cenário. O modo explicativo segue disponível." });
    } else if (v.invalido || v.aplicadas.length === 0) {
      partes.push({ tipo: "reformular", texto: "Não consegui extrair premissas quantitativas. Tente algo como \"e se o CAPEX estourar 60% e o leilão atrasar 3 anos?\"." });
    } else if (ambiguo) {
      partes.push({ tipo: "confirmar", interpretacao: interpretacao ?? rotuloCenario(v.levers), leversPropostas: v.levers, clamps: v.clamps });
    } else {
      partes.push(await rodarCenario(client, full, leversBrutas, pergunta));
    }
  }

  return NextResponse.json({ partes });
}

// ───────────────────────── modo explicador ─────────────────────────
async function rodarExplicador(
  client: Anthropic,
  entry: RadarAssetEntry,
  full: Asset | null,
  pergunta: string,
): Promise<Parte> {
  const analise = full ? analisarAtivo(full, { mcN: 4000, seed: 42 }) : null;
  const alertas = alertasDoAtivo(entry.id);
  const notas = notasDoAtivo(lerNotas(), entry.id);
  const processos = processosDoAtivo(entry.id);
  const { contexto, fontes } = montarContextoExplicador({ entry, full, analise, alertas, notas, processos });

  try {
    const raw = await chamarIA(
      client,
      SISTEMA_EXPLICADOR,
      `DADOS DO ATIVO:\n${contexto}\n\n────────\nPERGUNTA: ${pergunta}`,
    );
    const j = extrairJSON(raw) as Record<string, unknown> | null;
    if (!j || typeof j.texto !== "string") {
      return { tipo: "erro", texto: "Não consegui formular a explicação. Pode reformular?" };
    }
    // BLINDAGEM: todo número da resposta tem de existir nos dados injetados. Se a IA
    // citar um número sem lastro (arredondado de memória, fabricado, data inventada),
    // a resposta é RETIDA — melhor não responder do que arriscar um dado incorreto.
    const semLastro = numerosSemLastro(j.texto, contexto);
    if (semLastro.length > 0) {
      return { tipo: "bloqueada", numeros: semLastro };
    }
    return { tipo: "explicacao", texto: j.texto, fontes: resolverFontes(j.fontes, fontes) };
  } catch (e) {
    return { tipo: "erro", texto: `Falha no explicador: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ───────────────────────── modo cenário ─────────────────────────
async function rodarCenario(
  client: Anthropic,
  full: Asset | null,
  leversBrutas: unknown,
  pergunta: string,
): Promise<Parte> {
  const v = validarLevers(leversBrutas);
  if (v.invalido || v.aplicadas.length === 0) {
    return { tipo: "reformular", texto: "Não consegui extrair premissas quantitativas válidas. Reformule com números explícitos." };
  }
  // Ativo parcial (sem motor DCF): degrada com honestidade, não inventa número.
  if (!full) {
    return { tipo: "cenario-indisponivel", texto: "Este ativo ainda não tem estrutura econômico-financeira modelada no motor DCF (dados parciais), então não há base para calcular o cenário. O modo explicativo segue disponível." };
  }

  const rotulo = rotuloCenario(v.levers);
  const r = avaliarCenario(full, "custom", rotulo, v.levers);
  const wacc = paramsFromAsset(full).wacc; // sempre finito (vem dos params, não do solver)
  // Em cenários extremos o capital pode nunca retornar ⇒ NÃO há TIR (NaN). Nunca
  // exibimos um número falso: marcamos semTir e a tela mostra "sem TIR" + o VPL.
  const semTir = !Number.isFinite(r.tir);
  const spreadFinito = Number.isFinite(r.spread);

  // Narração QUALITATIVA (sem números — eles vêm do motor, renderizados pela tela).
  let narrativa = "";
  const sinal = semTir
    ? "Não há TIR: o capital não retorna no horizonte da concessão (VPL ao WACC negativo)."
    : `Spread ${spreadFinito && r.spread >= 0 ? "positivo (TIR ≥ WACC)" : "negativo (TIR < WACC)"}.`;
  try {
    const raw = await chamarIA(
      client,
      SISTEMA_NARRADOR,
      `${sinal} Alavancas aplicadas: ${rotulo}. Pergunta original: "${pergunta}".`,
    );
    const j = extrairJSON(raw) as Record<string, unknown> | null;
    if (j && typeof j.texto === "string") narrativa = j.texto;
  } catch {
    narrativa = ""; // narração é opcional; os números do motor já bastam
  }

  return {
    tipo: "cenario",
    tir: semTir ? null : r.tir,
    spread: spreadFinito ? r.spread : null,
    vpl: r.vpl,
    wacc,
    semTir,
    rotulo,
    leversAplicadas: v.levers,
    clamps: v.clamps,
    narrativa,
  };
}
