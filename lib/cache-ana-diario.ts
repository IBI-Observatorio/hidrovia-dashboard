// Cache em disco (1 chamada por dia) para os 4 fetchs ANA do /monitor.
//
// Motivação (mai/2026): a página estava renderizando lenta porque cada hit
// disparava 4 chamadas em paralelo à API ANA (HidroWebService). O Next.js já
// cacheia o fetch interno (TELEM_TTL_S = 6h), mas no boot do dev / após
// revalidação a chamada acontece síncrona ao primeiro request, e o ANA
// responde devagar.
//
// Solução: gravamos um snapshot diário em `data/ana-diario-cache.json`. A
// chave de dia é o calendário em America/Manaus (fuso da bacia), então o
// cache "vira" à meia-noite de Manaus, não à meia-noite UTC.
//
// Estratégia de fallback:
//   1. Cache de hoje existe → usa.
//   2. Cache vencido (outro dia) → tenta ANA; se falhar, devolve o cache antigo.
//   3. Sem cache → tenta ANA; se falhar, devolve estrutura vazia (a página
//      tem seus próprios fallbacks: DADOS_ATUAIS para o painel, banda 0 para o IDN).
//
// Só grava o cache de hoje se pelo menos uma estação trouxer dado de hoje —
// evita "congelar" um fallback estático como se fosse leitura do dia.

import {
  fetchTodasEstacoes,
  fetchCotasIDN,
  fetchVazoesIDN,
  fetchSerieCaracarai,
  type CotaIDN,
  type VazaoIDN,
} from "./fetch-dados";
import type { DadosEstacao } from "./dados-historicos";
import type { EstacaoComDOY } from "./sub-bacias";
import type { EstacaoVazao } from "./sub-bacias-vazao";
import { calculaIDN } from "./calcula-idn";
import { anexaCotasSerie } from "./ana-cotas-series";

export interface DadosDiariosANA {
  dados:          Record<string, DadosEstacao>;
  cotasIDN:       Partial<Record<EstacaoComDOY, CotaIDN>>;
  vazoesIDN:      Partial<Record<EstacaoVazao,  VazaoIDN>>;
  serieCaracarai: { data: string; cota_m: number }[];
  idn_atual?:     number;   // IDN calculado de cotasIDN — mesma fonte do gauge
}

interface CacheArquivo extends DadosDiariosANA {
  data:       string; // YYYY-MM-DD em America/Manaus
  fetched_em: string; // ISO timestamp UTC
  // idn_atual herdado de DadosDiariosANA
}

function hojeManaus(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
}

async function caminhoCache(): Promise<string> {
  const { join } = await import("path");
  const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
  return join(dataDir, "ana-diario-cache.json");
}

async function carregaCache(): Promise<CacheArquivo | null> {
  try {
    const { readFileSync, existsSync } = await import("fs");
    const p = await caminhoCache();
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as CacheArquivo;
  } catch {
    return null;
  }
}

async function gravaCache(c: CacheArquivo): Promise<void> {
  try {
    const { writeFileSync, mkdirSync } = await import("fs");
    const { dirname } = await import("path");
    const p = await caminhoCache();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(c, null, 2), "utf-8");
  } catch {
    /* sem permissão de escrita (ex: filesystem somente leitura) — ignora */
  }
}

function snapshotDe(cache: CacheArquivo): DadosDiariosANA {
  return {
    dados:          cache.dados,
    cotasIDN:       cache.cotasIDN,
    vazoesIDN:      cache.vazoesIDN,
    serieCaracarai: cache.serieCaracarai,
    idn_atual:      cache.idn_atual,
  };
}

/**
 * Devolve as 4 séries ANA do dia (painel + IDN cota + IDN vazão + série
 * Caracaraí). Lê do cache em disco quando o cache é de hoje (America/Manaus);
 * caso contrário busca na ANA, grava o cache e retorna.
 */
export async function obterDadosDiariosANA(): Promise<DadosDiariosANA> {
  const hoje  = hojeManaus();
  const cache = await carregaCache();
  if (cache && cache.data === hoje) {
    // Mesmo servindo do cache, mantém a série diária acumulada em dia
    // (idempotente: só grava se ainda não tiver o ponto de hoje).
    anexaCotasSerie(cache.dados);
    return snapshotDe(cache);
  }

  let dados:          Record<string, DadosEstacao>             = {};
  let cotasIDN:       Partial<Record<EstacaoComDOY, CotaIDN>>  = {};
  let vazoesIDN:      Partial<Record<EstacaoVazao,  VazaoIDN>> = {};
  let serieCaracarai: { data: string; cota_m: number }[]       = [];

  try {
    [dados, cotasIDN, vazoesIDN, serieCaracarai] = await Promise.all([
      fetchTodasEstacoes(),
      fetchCotasIDN(),
      fetchVazoesIDN(),
      fetchSerieCaracarai(14),
    ]);
  } catch {
    // Falha total na ANA → devolve cache antigo se existir, senão estruturas vazias
    if (cache) return snapshotDe(cache);
    return { dados, cotasIDN, vazoesIDN, serieCaracarai };
  }

  // Computa IDN com os cotasIDN ao vivo — mesma lógica do gauge na UI
  const dataRef =
    Object.values(cotasIDN)
      .map((v) => v?.ultima_atualizacao ?? "")
      .filter(Boolean).sort().reverse()[0] ?? hoje;
  const idnResult = calculaIDN(
    Object.fromEntries(
      Object.entries(cotasIDN).map(([k, v]) => [k, v?.cota_m])
    ) as Parameters<typeof calculaIDN>[0],
    dataRef
  );
  const idn_atual = idnResult.idn;

  const algumaViva = Object.values(dados).some(
    (d) => d.ultima_atualizacao >= hoje
  );
  if (algumaViva) {
    await gravaCache({
      data:           hoje,
      fetched_em:     new Date().toISOString(),
      dados,
      cotasIDN,
      vazoesIDN,
      serieCaracarai,
      idn_atual,
    });
    // Acumula a leitura do dia na série histórica de cota por estação.
    anexaCotasSerie(dados);
  }

  return { dados, cotasIDN, vazoesIDN, serieCaracarai, idn_atual };
}
