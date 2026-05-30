// Lê o cache de insights gerados por IA (Claude) — atualizado 1×/semana pelo script
// scripts/gera-insights-ai.mjs. Retorna null se o arquivo não existir.
// Uso exclusivo em Server Components / route handlers (usa `fs`).

import * as fs from "fs";
import * as path from "path";
import type { InsightData } from "./gera-insights";

// Lê do volume persistente em produção (mesmo DATA_DIR onde /api/cron/insights
// grava). Em dev cai para ./data. Antes lia só de cwd/data, então o cache
// gerado pelo cron nunca aparecia no Railway.
const DATA_DIR   = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const CACHE_PATH = path.join(DATA_DIR, "insights_ai_cache.json");

export interface InsightsAICache {
  gerado_em:   string;   // ISO 8601
  modelo:      string;   // ex: "claude-sonnet-4-5"
  insights:    InsightData[];
}

export function lerInsightsAI(): InsightsAICache | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    return JSON.parse(raw) as InsightsAICache;
  } catch {
    return null;
  }
}
