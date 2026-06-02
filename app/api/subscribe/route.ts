// Inscrição no boletim mensal de movimentação portuária.
//
// POST /api/subscribe  body: { email: string }
//
// Cada inscrição é gravada como uma nova LINHA numa planilha do Google Sheets,
// via um Web App do Google Apps Script (não precisa de credenciais GCP).
//
// Variáveis de ambiente (configurar no Railway e no .env.local):
//   - SHEETS_WEBHOOK_URL  (obrigatória)  URL /exec do Web App do Apps Script
//   - SHEETS_SECRET       (opcional)     token compartilhado; se definido aqui,
//                                        precisa bater com o do script (anti-spam)
//
// Setup da planilha: ver instruções em docs/RUNBOOK-DADOS.md (seção Inscritos).

import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL;
const SECRET = process.env.SHEETS_SECRET ?? "";

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let email = "";
  let website = "";        // honeypot
  let elapsedMs = NaN;     // tempo entre carregar o form e enviar
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    website = String(body?.website ?? "").trim();
    elapsedMs = Number(body?.elapsedMs);
  } catch {
    return NextResponse.json({ ok: false, erro: "Corpo inválido." }, { status: 400 });
  }

  if (!emailValido(email)) {
    return NextResponse.json({ ok: false, erro: "E-mail inválido." }, { status: 400 });
  }

  // Anti-robô (silencioso): finge sucesso para não ensinar o bot, mas NÃO grava.
  // 1) Honeypot preenchido = robô (humano nunca vê esse campo).
  // 2) Envio rápido demais (< 1,5s) = robô (humano leva alguns segundos para digitar).
  if (website) {
    console.warn("[subscribe] honeypot acionado — descartado:", email);
    return NextResponse.json({ ok: true });
  }
  if (Number.isFinite(elapsedMs) && elapsedMs < 1500) {
    console.warn("[subscribe] envio rápido demais (", elapsedMs, "ms) — descartado:", email);
    return NextResponse.json({ ok: true });
  }

  if (!WEBHOOK_URL) {
    console.error("[subscribe] SHEETS_WEBHOOK_URL não configurada — inscrição não gravada:", email);
    return NextResponse.json(
      { ok: false, erro: "Serviço de inscrição temporariamente indisponível." },
      { status: 503 },
    );
  }

  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, quando, origem: "home (#receber)", secret: SECRET }),
    });

    // Apps Script responde 200 com { ok: true } quando grava com sucesso.
    let payload: { ok?: boolean } = {};
    try { payload = await resp.json(); } catch { /* corpo não-JSON */ }

    if (!resp.ok || payload.ok !== true) {
      const detalhe = await resp.text().catch(() => "");
      console.error("[subscribe] Sheets webhook falhou:", resp.status, detalhe);
      return NextResponse.json(
        { ok: false, erro: "Não foi possível registrar a inscrição agora." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.error("[subscribe] erro inesperado:", erro);
    return NextResponse.json(
      { ok: false, erro: "Não foi possível registrar a inscrição agora." },
      { status: 500 },
    );
  }
}
