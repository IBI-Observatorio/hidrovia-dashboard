// Regenera o deck "Últimas notícias" da home (AnticipationRibbon) e grava o cache
// no volume DATA_DIR. Disparada 1×/semana pelo GitHub Actions (noticias-semanal.yml).
//
// Como funciona (desde 29/09/2026, DeepSeek — lib/llm.ts):
//   1. Busca as manchetes recentes nos RSS PÚBLICOS das próprias fontes do setor
//      (Portos e Navios, Agência Brasil, Canal Rural, Brasil Mineral) — ver FEEDS.
//   2. Passa a lista NUMERADA à IA, que só ESCOLHE 3 itens e redige a frase.
//   3. URL, fonte e data saem do RSS pelo índice escolhido — a IA nunca escreve
//      link (anti-alucinação de link; ver memória "NÃO inventar número/link").
// Se sobrarem <2 itens válidos, NÃO sobrescreve o cache (mantém o último bom) e
// retorna erro para o watchdog avisar.
//
// Proteção: header Authorization: Bearer ${CRON_SECRET} (mesma chave do insights).
// Configuração no Railway: DEEPSEEK_API_KEY e CRON_SECRET no service web.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { chatLLM, llmDisponivel, LLM_MODELO } from "@/lib/llm";
import type { NoticiaHome } from "@/lib/noticias-home";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATA_DIR    = process.env.DATA_DIR ?? join(process.cwd(), "data");
const CACHE_OUT   = join(DATA_DIR, "noticias_home_cache.json");
const MODELO      = LLM_MODELO;
const UA          = "Mozilla/5.0 (compatible; IBI-Observatorio/1.0)";
const JANELA_DIAS = 14;
const POR_FEED    = 10;

// RSS públicos das fontes (conferidos em 29/09/2026). `fonte` é o nome exibido.
const FEEDS: { url: string; fonte: string }[] = [
  { url: "https://www.portosenavios.com.br/noticias/portos-e-logistica?format=feed&type=rss",  fonte: "Portos e Navios" },
  { url: "https://www.portosenavios.com.br/noticias/navegacao-e-marinha?format=feed&type=rss", fonte: "Portos e Navios" },
  { url: "https://www.portosenavios.com.br/noticias/geral?format=feed&type=rss",               fonte: "Portos e Navios" },
  { url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml",                              fonte: "Agência Brasil" },
  { url: "https://www.canalrural.com.br/feed/",                                                 fonte: "Canal Rural" },
  { url: "https://www.brasilmineral.com.br/feed",                                               fonte: "Brasil Mineral" },
];

interface Manchete { titulo: string; resumo: string; url: string; fonte: string; data?: string }

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem secret configurado, recusa por segurança
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function limpa(t: string): string {
  return t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function campo(item: string, nome: string): string {
  const m = item.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, "i"));
  // 2 passadas: alguns feeds (Agência Brasil) mandam o HTML do resumo escapado
  // (&lt;p&gt;…), que só vira tag — e é removido — depois da 1ª decodificação.
  return m ? limpa(limpa(m[1])) : "";
}

async function lerFeed(f: { url: string; fonte: string }, desde: number): Promise<Manchete[]> {
  try {
    const resp = await fetch(f.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const itens = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    const out: Manchete[] = [];
    for (const it of itens) {
      const titulo = campo(it, "title");
      const url = campo(it, "link");
      const pub = Date.parse(campo(it, "pubDate"));
      if (!titulo || !/^https?:\/\//.test(url)) continue;
      if (!isNaN(pub) && pub < desde) continue;
      out.push({
        titulo,
        resumo: campo(it, "description").slice(0, 280),
        url,
        fonte: f.fonte,
        data: isNaN(pub) ? undefined : new Date(pub).toISOString().slice(0, 10),
      });
    }
    // Teto por feed: sem isso um feed volumoso (Brasil Mineral, 40 itens) domina a lista.
    return out.slice(0, POR_FEED);
  } catch {
    return []; // feed fora do ar não derruba os demais
  }
}

const SISTEMA = `Você é o editor do Observatório de Infraestrutura de Transportes do IBI (Instituto Brasileiro de Infraestrutura).
Sua tarefa é montar o deck "Últimas notícias" da home: 3 fatos RECENTES e relevantes para o setor de transporte e logística de cargas no Brasil.

Verticais de interesse (escolha 3 fatos, de preferência de verticais diferentes):
- Porto / movimentação portuária (ANTAQ, terminais, granéis, contêiner)
- Navegação / frete marítimo e de cabotagem (tarifas, rotas, armadores)
- Hidrologia / hidrovias amazônicas (cotas, seca, calado, escoamento fluvial)
- Agro-escoamento (safra de soja/milho, exportação, corredores logísticos)
- Minério / mineração (produção, exportação, ferrovias e portos associados)

Regras:
- Você recebe uma lista NUMERADA de manchetes reais (título + resumo). Escolha SOMENTE entre elas, pelo número.
- Ignore itens fora do tema (política, crime, clima sem efeito logístico, eventos sociais, agenda institucional sem fato).
- A frase deve se apoiar APENAS no título e no resumo do item escolhido. Não invente números, nomes nem datas; se citar um número, ele precisa estar no título ou no resumo.`;

const USUARIO_BASE = (dataRef: string, lista: string) => `Data de referência: ${dataRef}.

Manchetes disponíveis:
${lista}

Escolha 3 itens conforme as regras e responda EXCLUSIVAMENTE com um array JSON (sem markdown, sem comentários), onde cada elemento tem exatamente:
- "idx": o número do item escolhido na lista
- "tag": rótulo curto de 1 palavra em português (ex: "Contêiner", "Soja", "Minério", "Porto", "Hidrovia")
- "texto": UMA frase em português do Brasil, factual e direta, com no máximo um trecho entre <b></b>. NÃO use links, markdown ou aspas dentro do texto.

Responda apenas com o array JSON.`;

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (!llmDisponivel()) {
    return NextResponse.json({ ok: false, erro: "DEEPSEEK_API_KEY ausente" }, { status: 500 });
  }

  const dataRef = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  try {
    // 1. Manchetes dos RSS (dedup por URL), mais recentes primeiro, até 60.
    const desde = Date.now() - JANELA_DIAS * 86_400_000;
    const porUrl = new Map<string, Manchete>();
    for (const lote of await Promise.all(FEEDS.map((f) => lerFeed(f, desde)))) {
      for (const m of lote) if (!porUrl.has(m.url)) porUrl.set(m.url, m);
    }
    const manchetes = [...porUrl.values()]
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
      .slice(0, 60);
    if (manchetes.length < 3) {
      return NextResponse.json({ ok: false, erro: `Só ${manchetes.length} manchete(s) nos RSS. Cache preservado.` }, { status: 502 });
    }

    const lista = manchetes
      .map((m, i) => `${i + 1}. [${m.fonte}${m.data ? `, ${m.data}` : ""}] ${m.titulo}${m.resumo ? ` — ${m.resumo}` : ""}`)
      .join("\n");

    // 2. IA escolhe e redige.
    const raw = await chatLLM({ system: SISTEMA, user: USUARIO_BASE(dataRef, lista), maxTokens: 1500 });
    const jm = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\[[\s\S]*\])/);
    let parsed: unknown;
    try { parsed = JSON.parse(jm ? jm[1] : raw.trim()); } catch { parsed = null; }
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, erro: "IA não retornou um array JSON", manchetes: manchetes.length }, { status: 502 });
    }

    // 3. Valida: índice existe, sem repetição; URL/fonte/data vêm do RSS.
    const noticias: NoticiaHome[] = [];
    const usados = new Set<number>();
    let descartadas = 0;
    for (const item of parsed as Record<string, unknown>[]) {
      const idx = Number(item.idx);
      const tag = typeof item.tag === "string" ? item.tag.trim() : "";
      const texto = typeof item.texto === "string" ? item.texto.trim() : "";
      const m = Number.isInteger(idx) ? manchetes[idx - 1] : undefined;
      if (!m || usados.has(idx) || !tag || !texto) {
        descartadas++;
        continue;
      }
      usados.add(idx);
      noticias.push({ tag, texto, url: m.url, fonte: m.fonte, data: m.data });
    }

    // Anti-alucinação: se sobrou pouca coisa confiável, NÃO sobrescreve o cache
    // (mantém o último bom). O workflow falha e o watchdog avisa.
    if (noticias.length < 2) {
      return NextResponse.json(
        { ok: false, erro: `Só ${noticias.length} notícia(s) válida(s) (${descartadas} descartadas). Cache preservado.` },
        { status: 502 },
      );
    }

    const cache = {
      gerado_em: new Date().toISOString(),
      modelo: MODELO,
      noticias: noticias.slice(0, 3),
    };
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(CACHE_OUT, JSON.stringify(cache, null, 2), "utf-8");

    // A home é ISR (revalidate=3600). Sem isto, o deck só trocaria até 1h após o
    // cron. Força a regeneração da home agora, para refletir as notícias na hora.
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      mensagem: `${cache.noticias.length} notícia(s) regeneradas (${MODELO}) de ${manchetes.length} manchetes; ${descartadas} descartadas`,
      data_ref: dataRef,
      total: cache.noticias.length,
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: `Falha ao regenerar notícias: ${erro}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
