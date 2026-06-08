// Núcleo PURO do Copiloto do Radar (sem fs, sem Anthropic, sem Next — testável).
//
// PRINCÍPIO INEGOCIÁVEL: a IA NUNCA produz um número econômico. Todo número exibido
// vem (a) de um dado já presente no ativo (com a fonte que já existe) ou (b) do motor
// DCF determinístico. Este módulo é a camada de SEGURANÇA em código que cerca a IA:
//   • valida/clampa as alavancas que a IA traduz, ANTES de tocar o motor;
//   • resolve fontes só por ÍNDICE numa lista real (a IA não consegue fabricar fonte);
//   • monta o contexto read-only do explicador a partir dos dados já existentes.
// As chamadas à API e o motor ficam na rota; aqui só lógica determinística + prompts.

import {
  type Levers,
  type Asset,
  type SourceTag,
  type Num,
  type AnaliseAtivo,
  LEVERS_NEUTROS,
  numVal,
} from "@/lib/dcf";
import { ESTAGIOS } from "@/lib/radar/maturation";
import type { RadarAssetEntry } from "@/lib/radar/assets";
import type { Alert } from "@/lib/radar/alerts";
import type { Nota } from "@/lib/radar/notes";
import { num, pct } from "@/lib/radar/format";

// ───────────────────────── parse defensivo de JSON da IA ─────────────────────────

/** Extrai o primeiro objeto/array JSON de uma resposta da IA, tolerando cercas ```json. */
export function extrairJSON(raw: string): unknown | null {
  if (!raw) return null;
  const fenced =
    raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/```\s*([\s\S]*?)\s*```/);
  const candidato = fenced
    ? fenced[1]
    : (raw.match(/\{[\s\S]*\}/)?.[0] ?? raw.match(/\[[\s\S]*\]/)?.[0] ?? raw.trim());
  try {
    return JSON.parse(candidato);
  } catch {
    return null;
  }
}

// ───────────────────────────── alavancas (Levers) ─────────────────────────────

/** Faixas sãs por alavanca (clamp em código, NUNCA na IA). */
export const LEVER_RANGES = {
  tarifaMult: { min: 0.5, max: 2 },
  capexUplift: { min: 0.5, max: 5 },
  demandaHaircut: { min: 0.3, max: 1.2 },
  slipAnos: { min: 0, max: 15 },
  omAdjPp: { min: -0.1, max: 0.2 },
} as const;

export type LeverKey = keyof typeof LEVER_RANGES;
const LEVER_KEYS = Object.keys(LEVER_RANGES) as LeverKey[];

export interface ValidacaoLevers {
  levers: Levers;          // sempre completo (campos ausentes = neutro)
  aplicadas: LeverKey[];   // campos que a IA efetivamente setou (numéricos)
  clamps: string[];        // avisos legíveis de clamp (pt-BR)
  invalido: string | null; // se ≠ null: NÃO chamar o motor (campo não-numérico)
}

function rotuloClamp(k: LeverKey, v: number): string {
  switch (k) {
    case "slipAnos":
      return `limitei o atraso a ${v} ano${v === 1 ? "" : "s"} (teto do modelo)`;
    case "capexUplift":
      return `limitei o multiplicador de CAPEX a ×${num(v, 2)} (faixa sã do modelo)`;
    case "demandaHaircut":
      return `limitei o fator de demanda a ×${num(v, 2)} (faixa sã do modelo)`;
    case "tarifaMult":
      return `limitei o multiplicador de tarifa a ×${num(v, 2)} (faixa sã do modelo)`;
    case "omAdjPp":
      return `limitei o ajuste de O&M a ${num(v * 100, 1)} pontos (faixa sã do modelo)`;
  }
}

/**
 * Valida e clampa um objeto de alavancas (vindo da tradução da IA). Determinístico:
 * mesmo input ⇒ mesmas levers. Campos ausentes ficam neutros. Campo presente mas
 * NÃO-numérico ⇒ `invalido` (a rota deve pedir reformulação, não chamar o motor).
 */
export function validarLevers(parsed: unknown): ValidacaoLevers {
  const levers: Levers = { ...LEVERS_NEUTROS };
  const aplicadas: LeverKey[] = [];
  const clamps: string[] = [];

  if (!parsed || typeof parsed !== "object") {
    return { levers, aplicadas, clamps, invalido: "tradução vazia ou não-objeto" };
  }
  const obj = parsed as Record<string, unknown>;

  for (const k of LEVER_KEYS) {
    if (!(k in obj) || obj[k] === null || obj[k] === undefined) continue;
    const v = obj[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { levers, aplicadas, clamps, invalido: `campo "${k}" não-numérico` };
    }
    const { min, max } = LEVER_RANGES[k];
    let val = k === "slipAnos" ? Math.round(v) : v;
    if (val < min || val > max) {
      val = Math.min(max, Math.max(min, val));
      clamps.push(rotuloClamp(k, val));
    }
    levers[k] = val;
    aplicadas.push(k);
  }

  return { levers, aplicadas, clamps, invalido: null };
}

/** Rótulo humano das alavancas não-neutras (para o cabeçalho do cenário). */
export function rotuloCenario(levers: Levers): string {
  const partes: string[] = [];
  if (levers.capexUplift !== 1)
    partes.push(`CAPEX ${levers.capexUplift >= 1 ? "+" : "−"}${num(Math.abs(levers.capexUplift - 1) * 100, 0)}%`);
  if (levers.demandaHaircut !== 1)
    partes.push(`demanda ${levers.demandaHaircut >= 1 ? "+" : "−"}${num(Math.abs(levers.demandaHaircut - 1) * 100, 0)}%`);
  if (levers.tarifaMult !== 1)
    partes.push(`tarifa ${levers.tarifaMult >= 1 ? "+" : "−"}${num(Math.abs(levers.tarifaMult - 1) * 100, 0)}%`);
  if (levers.slipAnos > 0)
    partes.push(`atraso ${num(levers.slipAnos, 0)}a`);
  if (levers.omAdjPp !== 0)
    partes.push(`O&M ${levers.omAdjPp >= 0 ? "+" : "−"}${num(Math.abs(levers.omAdjPp) * 100, 1)}pp`);
  return partes.length ? partes.join(", ") : "cenário neutro";
}

// ───────────────────────── fontes (integridade) ─────────────────────────

/**
 * Resolve fontes citadas pela IA SÓ por índice numa lista real. Índices inválidos
 * (fora da faixa, não-inteiros, duplicados) são descartados — a IA não consegue
 * fabricar uma fonte, só apontar para uma que existe.
 */
export function resolverFontes(indices: unknown, fontes: SourceTag[]): SourceTag[] {
  if (!Array.isArray(indices)) return [];
  const vistos = new Set<number>();
  const out: SourceTag[] = [];
  for (const i of indices) {
    if (typeof i !== "number" || !Number.isInteger(i)) continue;
    if (i < 0 || i >= fontes.length || vistos.has(i)) continue;
    vistos.add(i);
    out.push(fontes[i]);
  }
  return out;
}

// ───────────────────── contexto do explicador (read-only) ─────────────────────

export interface ContextoExplicador {
  contexto: string;   // texto injetado no prompt (referencia [fonte #N])
  fontes: SourceTag[]; // lista numerada (índice = posição)
}

interface FundingSeed {
  aporteNecessario?: Num;
  coberturaCruzada?: { fonte: string; valor: Num }[];
  deficit?: Num;
}

/**
 * Monta o contexto recuperável do ativo a partir dos dados JÁ existentes (seed de
 * maturação/risco/funding/tabuleiro, alertas datados, notas e — se houver motor —
 * os valores-base determinísticos). NÃO inventa nada: só serializa o que existe e
 * numera as fontes reais para a IA citar por índice.
 */
export function montarContextoExplicador(input: {
  entry: RadarAssetEntry;
  full: Asset | null;
  analise: AnaliseAtivo | null;
  alertas: Alert[];
  notas: Nota[];
}): ContextoExplicador {
  const { entry, full, analise, alertas, notas } = input;
  const fontes: SourceTag[] = [];
  const linhas: string[] = [];

  const ref = (s?: SourceTag): string => {
    if (!s) return "";
    fontes.push(s);
    return ` [fonte #${fontes.length - 1}]`;
  };

  linhas.push(`== ATIVO ==`);
  linhas.push(`Nome: ${entry.name}${entry.sub ? ` — ${entry.sub}` : ""}`);
  if (entry.route) linhas.push(`Rota: ${entry.route}`);
  linhas.push(`Estrutura econômica modelada no motor DCF: ${entry.completo ? "sim" : "não (dados parciais)"}`);

  // Maturação
  const m = entry.maturacao;
  if (m) {
    linhas.push(`\n== MATURAÇÃO ==`);
    const estagio = ESTAGIOS[m.estagioAtual] ?? `estágio ${m.estagioAtual}`;
    linhas.push(`Estágio atual: ${estagio} (${m.estagioAtual + 1} de ${ESTAGIOS.length})`);
    linhas.push(`Risco de gates institucionais: ${m.gateRisk}`);
    linhas.push(`Leilão anunciado oficialmente: ${m.leilaoAnunciado ?? "nenhum"}`);
    if (m.drivers?.length) {
      linhas.push(`Drivers (o que trava/destrava):`);
      for (const d of m.drivers) linhas.push(`- ${d}`);
    }
    const tag = ref(m.fonte);
    if (tag) linhas.push(`Fonte da maturação:${tag}`);
  }

  // Risco (as notas de risco já trazem a atribuição embutida no próprio texto)
  if (entry.risk) {
    linhas.push(`\n== RISCO (vetor de gates; a atribuição vem embutida em cada nota) ==`);
    for (const [gate, status] of Object.entries(entry.risk)) {
      if (gate === "notes") continue;
      const nota = entry.risk.notes?.[gate];
      linhas.push(`${gate.toUpperCase()}: ${status}${nota ? ` — ${nota}` : ""}`);
    }
  }

  // Funding (cada número carrega a sua fonte estruturada)
  const funding = (entry.raw as Record<string, unknown>).funding as FundingSeed | undefined;
  if (funding) {
    linhas.push(`\n== FUNDING ==`);
    if (funding.aporteNecessario)
      linhas.push(`Aporte necessário: ${num(numVal(funding.aporteNecessario), 2)} ${funding.aporteNecessario.unit}${ref(funding.aporteNecessario.source)}`);
    for (const c of funding.coberturaCruzada ?? [])
      linhas.push(`Cobertura cruzada — ${c.fonte}: ${num(numVal(c.valor), 2)} ${c.valor.unit}${ref(c.valor.source)}`);
    if (funding.deficit)
      linhas.push(`Déficit de funding: ${num(numVal(funding.deficit), 2)} ${funding.deficit.unit}${ref(funding.deficit.source)}`);
  }

  // Tabuleiro (papel dos clientes — fato público sourçado)
  if (entry.tabuleiro) {
    linhas.push(`\n== TABULEIRO (papel por cliente) ==`);
    for (const [cliente, t] of Object.entries(entry.tabuleiro)) {
      linhas.push(`${cliente}: ${t.papel}${t.moveNaMalha && t.moveNaMalha !== "—" ? ` — ${t.moveNaMalha}` : ""} (exposição ${t.exposicao})${ref(t.fonte)}`);
    }
  }

  // Alertas datados
  if (alertas.length) {
    linhas.push(`\n== ALERTAS (datados) ==`);
    for (const a of alertas)
      linhas.push(`${a.date} [${a.kind}]: ${a.text}${ref(a.fonte)}`);
  }

  // Notas (boletins IBI — a própria nota é a fonte)
  if (notas.length) {
    linhas.push(`\n== NOTAS (boletins do Observatório IBI) ==`);
    for (const n of notas) {
      const fonteNota: SourceTag = { label: `Boletim IBI — ${n.title}`, date: n.date };
      linhas.push(`${n.date} — ${n.title}${ref(fonteNota)}`);
      if (n.body) linhas.push(n.body.trim());
    }
  }

  // Valores-base do motor (origem (b): determinístico, não-IA)
  if (full && analise) {
    linhas.push(`\n== VALORES-BASE DO MOTOR DCF (determinístico, NÃO recalcular) ==`);
    const fonteMotor: SourceTag = {
      label: "Motor DCF do Radar (parâmetros ANTT/Frischtak; ver aba Estresse RCF)",
    };
    linhas.push(
      `TIR oficial: ${pct(analise.oficial.tir, 2)} | TIR realista: ${pct(analise.realista.tir, 2)} | ` +
      `WACC: ${pct(analise.wacc, 2)} | P(spread<0) Monte Carlo: ${pct(analise.monteCarlo.pSpreadNeg, 1)}${ref(fonteMotor)}`,
    );
    linhas.push(`(Para QUALQUER outro número que exija cálculo novo, isso é "modo cenário" — não responda aqui.)`);
  }

  return { contexto: linhas.join("\n"), fontes };
}

// ───────────────────────────── prompts de sistema ─────────────────────────────

export const SISTEMA_ROTEADOR = `Você é o roteador do copiloto do Radar de Maturação Ferroviária (Observatório IBI). Recebe UMA pergunta em português e decide a rota; se for cenário, traduz a frase para as alavancas do motor DCF.

ROTAS:
- "explicador": pergunta sobre o que JÁ existe nos dados do ativo (por que travou, qual o déficit, o que mudou na semana). NÃO exige cálculo novo.
- "cenario": pergunta que exige CALCULAR um resultado novo variando premissas ("e se o CAPEX estourar 60%?", "e se atrasar 3 anos?", "e se a demanda vier 20% abaixo?").
- "ambos": a pergunta tem as duas partes.

TRADUÇÃO (só quando a rota inclui cenário) — emita SOMENTE os campos citados na pergunta; o resto fica neutro:
- tarifaMult: multiplicador de tarifa (1 = neutro)
- capexUplift: multiplicador de CAPEX (1 = neutro; "estourar 60%" ⇒ 1.6)
- demandaHaircut: multiplicador de demanda (1 = sem corte; "20% abaixo" ⇒ 0.8)
- slipAnos: atraso em anos no início da operação ("atrasar 3 anos" ⇒ 3)
- omAdjPp: ajuste aditivo de O&M em pontos da fração de receita

REGRAS DURAS:
- NUNCA invente número. Só emita um campo se a pergunta o QUANTIFICA explicitamente.
- Se a quantidade for vaga ("atrasar bastante", "custo muito maior"), NÃO chute: marque "ambiguo": true e descreva sua interpretação proposta em "interpretacao" (ex.: "atraso de ~3 anos e CAPEX +50%") para o usuário confirmar — ainda assim preencha "levers" com essa interpretação proposta.
- Não escreva nada fora do JSON.

Responda EXCLUSIVAMENTE com UM objeto JSON, sem markdown:
{"rota":"explicador"|"cenario"|"ambos","levers":{...}|null,"ambiguo":true|false,"interpretacao":null|"texto curto"}`;

export const SISTEMA_EXPLICADOR = `Você é o copiloto analítico do Radar de Maturação Ferroviária (Observatório IBI). Tom de banco central: sóbrio, técnico, direto, sem emoji, sem floreio, sem "assistente animado".

Responda à pergunta do usuário USANDO EXCLUSIVAMENTE os DADOS DO ATIVO fornecidos abaixo.

REGRAS INEGOCIÁVEIS (uma TIR alucinada destrói o produto):
- NUNCA invente número, fonte, órgão ou data. Use apenas o que está literalmente nos DADOS.
- Todo número que você citar DEVE aparecer literalmente nos DADOS. Não calcule, não estime, não arredonde de memória.
- Se a pergunta pede algo que NÃO está nos DADOS, ou que exigiria um cálculo novo, diga claramente que não há base nos dados do ativo para responder — não preencha, não especule.
- Cite as fontes APENAS pelos índices [fonte #N] que aparecem nos DADOS. Se uma afirmação não tem fonte numerada, não invente uma.

Responda EXCLUSIVAMENTE com UM objeto JSON, sem markdown:
{"texto":"sua resposta em português","fontes":[índices N das fontes que você usou]}`;

export const SISTEMA_NARRADOR = `Você é o copiloto do Radar (Observatório IBI), tom de banco central. O MOTOR DCF já calculou um cenário hipotético e os NÚMEROS JÁ ESTÃO NA TELA do usuário.

Escreva 1 a 3 frases explicando QUALITATIVAMENTE o significado do resultado, a partir do sinal do spread e das alavancas aplicadas que serão informadas (ex.: spread negativo ⇒ a TIR fica abaixo do custo de capital, o que indica destruição de valor / leilão pouco atrativo).

REGRAS DURAS:
- NÃO repita nem invente NENHUM número — os números são responsabilidade da tela, não sua.
- NÃO recalcule nada. Apenas interprete o sinal (spread positivo/negativo) e o efeito das alavancas.
- Sóbrio, sem emoji.

Responda EXCLUSIVAMENTE com UM objeto JSON, sem markdown: {"texto":"..."}`;
