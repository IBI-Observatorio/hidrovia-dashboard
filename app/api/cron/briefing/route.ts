// Endpoint chamado pelo cron do Railway toda quarta-feira às 09:00 UTC-3.
// Regenera o briefing semanal e salva snapshot em data/briefings/YYYY-WW.json.
// Proteção: header Authorization: Bearer ${CRON_SECRET}.
//
// Configuração no Railway:
//   - Variável de ambiente CRON_SECRET (gerar via openssl rand -hex 32)
//   - Service "Cron" com schedule "0 12 * * 3" (quarta 12:00 UTC = 09:00 Manaus)
//   - Comando: curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//              https://<dominio>/api/cron/briefing

import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import {
  fetchTodasEstacoes,
  fetchCotasIDN,
  fetchPrevisao2026,
  fetchSerieCaracarai,
} from "@/lib/fetch-dados";
import { geraBriefing, type SnapshotBriefing } from "@/lib/briefing-gerador";
import { IDN_RECENTE_DIARIO } from "@/lib/idn-historico-calculado";

const DATA_DIR     = process.env.DATA_DIR ?? join(process.cwd(), "data");
const BRIEFINGS_DIR = join(DATA_DIR, "briefings");
const MAX_BRIEFINGS = 52;       // mantém 1 ano de histórico

function semanaDoAno(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;  // sem secret configurado, recusa por segurança
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

// GET ou POST aceitos (alguns cron providers usam GET, outros POST)
async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
  const ano  = parseInt(hoje.slice(0, 4), 10);
  const sem  = semanaDoAno(hoje);

  try {
    const [dados, cotasIDN, previsao, serieCaracarai] = await Promise.all([
      fetchTodasEstacoes(),
      fetchCotasIDN(),
      fetchPrevisao2026(),
      fetchSerieCaracarai(14),
    ]);

    const snapshot: SnapshotBriefing = {
      dados,
      cotasIDN,
      previsao,
      data_ref:         hoje,
      serie_caracarai:  serieCaracarai,
      serie_idn:        IDN_RECENTE_DIARIO.slice(-30),
    };

    const briefing = geraBriefing(snapshot);

    // Persiste em data/briefings/YYYY-WW.json
    if (!existsSync(BRIEFINGS_DIR)) mkdirSync(BRIEFINGS_DIR, { recursive: true });
    const fname = `${ano}-${String(sem).padStart(2, "0")}.json`;
    writeFileSync(join(BRIEFINGS_DIR, fname), JSON.stringify(briefing, null, 2), "utf-8");

    // Limpa antigos (mantém últimos 52)
    const todos = readdirSync(BRIEFINGS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();
    if (todos.length > MAX_BRIEFINGS) {
      const removerN = todos.length - MAX_BRIEFINGS;
      for (let i = 0; i < removerN; i++) {
        try { unlinkSync(join(BRIEFINGS_DIR, todos[i])); } catch {}
      }
    }

    return NextResponse.json({
      ok:        true,
      mensagem:  `Briefing da semana ${sem}/${ano} regenerado: "${briefing.manchete.titulo}"`,
      arquivo:   fname,
      manchete:  briefing.manchete.titulo,
      alerta:    briefing.alerta_destaque?.rotulo ?? null,
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, erro: `Falha ao regenerar briefing: ${erro}` },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest)  { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
