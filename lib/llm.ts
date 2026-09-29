// Cliente único de LLM do servidor — DeepSeek (API compatível com OpenAI).
//
// Usado pelas rotas de IA: /api/cron/insights, /api/cron/refresh-noticias,
// /api/cron/supervisor-boletim e /api/radar/copilot. Migrado da Anthropic em
// 29/09/2026 (a ANTHROPIC_API_KEY do Railway estava inválida desde jul/2026).
//
// Chave: DEEPSEEK_API_KEY, injetada pelo ambiente (Railway); nunca vai ao client.
// Sem SDK: um POST em /chat/completions basta.

export const LLM_MODELO = "deepseek-chat";
const ENDPOINT = "https://api.deepseek.com/chat/completions";

export function llmDisponivel(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

export async function chatLLM({
  system,
  user,
  maxTokens = 2048,
  temperature = 0.3,
  timeoutMs = 120_000,
}: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY ausente");

  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: LLM_MODELO,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new Error(`DeepSeek HTTP ${resp.status}: ${corpo.slice(0, 300)}`);
  }
  const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
