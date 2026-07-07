// Deck "Últimas notícias" da home (AnticipationRibbon).
//
// Antes: o array `antecipacoes` era hardcoded em lib/home-content.ts e congelava
// (notícia velha) porque não tinha nenhum mecanismo de atualização. Agora as
// notícias vêm de um cache no volume DATA_DIR, gerado 1×/semana pela rota
// /api/cron/refresh-noticias (Claude + web search, com URLs REAIS validadas
// contra os resultados de busca). Mesmo padrão do insights_ai_cache.
//
// Uso exclusivo em Server Components / route handlers (usa `fs`). Se o cache não
// existir ou estiver corrompido, cai para as `antecipacoes` hardcoded (seed).
// Ver docs/RUNBOOK-DADOS.md.

import * as fs from "fs";
import * as path from "path";
import { antecipacoes, type Antecipacao } from "./home-content";

const DATA_DIR   = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const CACHE_PATH = path.join(DATA_DIR, "noticias_home_cache.json");

export interface NoticiaHome {
  tag: string;            // rótulo curto, ex: "Contêiner", "Soja", "Minério"
  texto: string;          // uma frase; pode conter <b> para um número-chave. Sem <a>.
  url?: string;           // URL da fonte (validada contra os resultados de busca)
  fonte?: string;         // publicação, ex: "Reuters", "Valor"
  data?: string;          // data de publicação, se conhecida (ISO ou texto curto)
}

export interface NoticiasHomeCache {
  gerado_em: string;      // ISO 8601
  modelo:    string;      // ex: "claude-opus-4-8"
  noticias:  NoticiaHome[];
}

// Seed de fallback: as `antecipacoes` hardcoded (que já trazem links inline no
// texto). Nunca deixa o deck vazio, mesmo sem cache.
const FALLBACK: NoticiaHome[] = (antecipacoes as Antecipacao[]).map((a) => ({
  tag: a.tag,
  texto: a.texto,
}));

/** Lê o cache; se ausente/inválido/vazio, devolve o seed hardcoded. */
export function lerNoticiasHome(): NoticiaHome[] {
  try {
    if (!fs.existsSync(CACHE_PATH)) return FALLBACK;
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) as NoticiasHomeCache;
    if (Array.isArray(cache.noticias) && cache.noticias.length > 0) return cache.noticias;
    return FALLBACK;
  } catch {
    return FALLBACK;
  }
}
