// Regenera o deck "Últimas notícias" da home (AnticipationRibbon) e grava o cache
// no volume DATA_DIR. Disparada 1×/semana pelo GitHub Actions (noticias-semanal.yml).
//
// Como funciona: o Claude (opus-4-8) usa a ferramenta de WEB SEARCH server-side
// para achar 3 notícias recentes das verticais do Observatório (porto, navegação,
// hidrologia, agro-escoamento, minério) e devolve um JSON. As URLs de cada item
// são VALIDADAS contra os resultados reais de busca — item cujo link não bate com
// nenhuma fonte encontrada é descartado (anti-alucinação de link; ver memória
// "NÃO inventar número/link"). Se sobrarem <2 itens válidos, NÃO sobrescreve o
// cache (mantém o último bom) e retorna erro para o watchdog avisar.
//
// Proteção: header Authorization: Bearer ${CRON_SECRET} (mesma chave do insights).
// Configuração no Railway: ANTHROPIC_API_KEY e CRON_SECRET no service web.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { NoticiaHome } from "@/lib/noticias-home";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATA_DIR  = process.env.DATA_DIR ?? join(process.cwd(), "data");
const CACHE_OUT = join(DATA_DIR, "noticias_home_cache.json");
const MODELO    = "claude-opus-4-8";

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem secret configurado, recusa por segurança
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Normaliza uma URL para comparação (origin + path, sem query/hash/barra final).
function normalizaURL(u: string): string | null {
  try {
    const x = new URL(u);
    if (x.protocol !== "http:" && x.protocol !== "https:") return null;
    return (x.origin + x.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return null;
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

Como trabalhar:
- Faça algumas buscas (web_search) para encontrar fatos reais e recentes (idealmente dos últimos 14 dias). Você tem buscas suficientes; assim que tiver 3 boas notícias, PARE de buscar e escreva o array.
- Prefira fontes reputadas (Reuters, Valor, Broadcast/Estadão, ANTAQ, agências setoriais, imprensa econômica).
- Cite números concretos quando houver (volume, %, US$, cotas). Um único número-chave por notícia pode vir entre <b></b>.
- Use como 'url' a URL exata de um dos resultados de busca que você recebeu. Não invente números, fontes nem URLs.
- Se alguma busca falhar ou o limite for atingido, trabalhe com os resultados que JÁ obteve — eles são suficientes. Não recuse a tarefa por causa de uma busca que falhou.`;

const USUARIO_BASE = (dataRef: string) => `Data de referência: ${dataRef}.

Busque e selecione 3 notícias recentes conforme as regras. Depois responda EXCLUSIVAMENTE com um array JSON (sem markdown, sem comentários), onde cada elemento tem exatamente:
- "tag": rótulo curto de 1 palavra em português (ex: "Contêiner", "Soja", "Minério", "Porto", "Hidrovia")
- "texto": UMA frase em português do Brasil, factual e direta, com no máximo um trecho entre <b></b>. NÃO use links, markdown ou aspas dentro do texto.
- "url": a URL exata do resultado de busca que embasa a notícia
- "fonte": nome curto da publicação (ex: "Reuters", "Valor", "ANTAQ")
- "data": data de publicação no formato AAAA-MM-DD, se souber (senão omita)

Responda apenas com o array JSON.`;

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, erro: "ANTHROPIC_API_KEY ausente" }, { status: 500 });
  }

  const dataRef = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  try {
    const client = new Anthropic();

    // Acumula o conjunto de URLs reais retornadas pela busca ao longo das rodadas.
    const urlsReais = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [{ role: "user", content: USUARIO_BASE(dataRef) }];
    let parsed: unknown[] | null = null;

    // O web_search_20260209 usa dynamic filtering (várias buscas + code exec),
    // intercalando vários blocos de texto. A resposta final costuma estar no
    // ÚLTIMO bloco de texto. Se o turno acabar sem JSON, cutuca pedindo só o array.
    for (let i = 0; i < 6 && !parsed; i++) {
      const msg = await client.messages.create({
        model: MODELO,
        max_tokens: 4096,
        system: SISTEMA,
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: 12,
            user_location: { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
        messages,
      });

      // Coleta URLs reais dos blocos de resultado de busca desta resposta.
      const textBlocks: string[] = [];
      for (const b of msg.content) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bloco = b as any;
        if (bloco.type === "text") textBlocks.push(bloco.text as string);
        if (bloco.type === "web_search_tool_result" && Array.isArray(bloco.content)) {
          for (const r of bloco.content) {
            if (r?.type === "web_search_result" && typeof r.url === "string") {
              const n = normalizaURL(r.url);
              if (n) urlsReais.add(n);
            }
          }
        }
      }

      messages.push({ role: "assistant", content: msg.content });

      // Tenta extrair o array do fim para o começo (a resposta final vem por último).
      for (const t of [...textBlocks].reverse()) {
        const m = t.match(/```json\s*([\s\S]*?)\s*```/) ?? t.match(/(\[[\s\S]*\])/);
        if (!m) continue;
        try {
          const p = JSON.parse(m[1]);
          if (Array.isArray(p) && p.length) { parsed = p; break; }
        } catch { /* tenta o próximo bloco */ }
      }
      if (parsed) break;

      if (msg.stop_reason === "pause_turn") continue; // busca server-side ainda rodando
      // Encerrou o turno sem JSON: cutuca pedindo só o array.
      messages.push({ role: "user", content: "Agora responda APENAS com o array JSON pedido, sem mais buscas nem texto." });
    }

    if (!parsed) {
      return NextResponse.json({ ok: false, erro: "IA não retornou um array JSON após várias rodadas", urls_busca: urlsReais.size }, { status: 502 });
    }

    // Valida cada item: campos obrigatórios + URL bate com um resultado real de busca.
    const noticias: NoticiaHome[] = [];
    let descartadas = 0;
    for (const item of parsed as Record<string, unknown>[]) {
      const tag = typeof item.tag === "string" ? item.tag.trim() : "";
      const texto = typeof item.texto === "string" ? item.texto.trim() : "";
      const url = typeof item.url === "string" ? item.url.trim() : "";
      const fonte = typeof item.fonte === "string" ? item.fonte.trim() : undefined;
      const data = typeof item.data === "string" ? item.data.trim() : undefined;
      const norm = normalizaURL(url);
      if (!tag || !texto || !norm || !urlsReais.has(norm)) {
        descartadas++;
        continue;
      }
      noticias.push({ tag, texto, url, fonte, data });
    }

    // Anti-alucinação: se sobrou pouca coisa confiável, NÃO sobrescreve o cache
    // (mantém o último bom). O workflow falha e o watchdog avisa.
    if (noticias.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          erro: `Só ${noticias.length} notícia(s) com URL validada (${descartadas} descartadas). Cache preservado.`,
          urls_busca: urlsReais.size,
        },
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
      mensagem: `${cache.noticias.length} notícia(s) regeneradas (${MODELO}); ${descartadas} descartadas por URL não validada`,
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
