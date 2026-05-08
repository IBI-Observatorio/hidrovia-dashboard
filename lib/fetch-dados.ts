// Busca dados reais da ANA e mescla com dados estáticos (deltas históricos)
// Usado pelo server component page.tsx
import { DADOS_ATUAIS, type DadosEstacao } from "./dados-historicos";
import { ultimasLeituras, resumeLeituras, type EstacaoKey } from "./ana-client";

// Tenta buscar a cota atual e variação 24h da API ANA.
// Em caso de falha, retorna os dados estáticos do Sprint 1.
async function fetchCotaReal(estacao: EstacaoKey): Promise<Partial<DadosEstacao>> {
  try {
    const leituras = await ultimasLeituras(estacao, 2);
    const resumo   = resumeLeituras(leituras);
    if (!resumo) return {};
    return {
      cota_m:             resumo.cota_m,
      variacao_24h:       resumo.variacao_24h,
      ultima_atualizacao: resumo.ultima_data,
    };
  } catch {
    return {}; // silencia — usa fallback estático
  }
}

// Mescla dado real (ANA) com dado estático (deltas históricos do Sprint 1)
function mescla(base: DadosEstacao, real: Partial<DadosEstacao>): DadosEstacao {
  return { ...base, ...real };
}

// Busca dados de todas as 7 estações em paralelo
export async function fetchTodasEstacoes(): Promise<Record<string, DadosEstacao>> {
  const estacoes: EstacaoKey[] = [
    "Manaus", "Itacoatiara", "Curicuriari",
    "Humaita", "Manacapuru", "PortoVelho", "Borba",
  ];

  const resultados = await Promise.allSettled(
    estacoes.map((e) => fetchCotaReal(e))
  );

  const merged: Record<string, DadosEstacao> = {};
  estacoes.forEach((e, i) => {
    const real = resultados[i].status === "fulfilled" ? resultados[i].value : {};
    merged[e] = mescla(DADOS_ATUAIS[e], real);
  });

  return merged;
}

// Lê o boletim SEMA mais recente do cache (server-side, lê arquivo diretamente)
export async function fetchUltimoBoletimSEMA(): Promise<{
  data: string | null;
  estacoes: Record<string, { cota_cm: number; variacao_cm: number }>;
} | null> {
  try {
    const { readFileSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const caminho = join(process.cwd(), "data", "boletins_sema_cache.json");
    if (!existsSync(caminho)) return null;

    const cache = JSON.parse(readFileSync(caminho, "utf-8"));
    const ultimo = cache.boletins?.[cache.boletins.length - 1];
    if (!ultimo || !ultimo.estacoes?.length) return null;

    const mapa: Record<string, { cota_cm: number; variacao_cm: number }> = {};
    for (const est of ultimo.estacoes) {
      mapa[est.estacao] = { cota_cm: est.cota_cm, variacao_cm: est.variacao_cm };
    }
    return { data: ultimo.data, estacoes: mapa };
  } catch {
    return null;
  }
}

// Aplica dados SEMA sobre os dados das estações (override de cota e variação)
export function aplicarBoletimSEMA(
  dados: Record<string, DadosEstacao>,
  boletim: Awaited<ReturnType<typeof fetchUltimoBoletimSEMA>>
): Record<string, DadosEstacao> {
  if (!boletim) return dados;

  const resultado = { ...dados };
  for (const [nome, sema] of Object.entries(boletim.estacoes)) {
    // Mapeia nomes SEMA para chaves das estações
    const chave = nome === "Humaitá" ? "Humaita" : nome;
    if (resultado[chave]) {
      resultado[chave] = {
        ...resultado[chave],
        cota_m:             +(sema.cota_cm / 100).toFixed(2),
        variacao_24h:       sema.variacao_cm,
        ultima_atualizacao: boletim.data ?? resultado[chave].ultima_atualizacao,
      };
    }
  }
  return resultado;
}
