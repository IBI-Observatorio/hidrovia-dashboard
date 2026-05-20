// Busca dados reais da ANA e mescla com dados estáticos (deltas históricos)
// Usado pelo server component page.tsx
import { DADOS_ATUAIS, type DadosEstacao } from "./dados-historicos";
import { ultimasLeituras, resumeLeituras, type EstacaoKey } from "./ana-client";
import type { EstacaoComDOY } from "./sub-bacias";
import type { EstacaoVazao } from "./sub-bacias-vazao";

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

// Busca dados de todas as 7 estações de painel em paralelo
export async function fetchTodasEstacoes(): Promise<Record<string, DadosEstacao>> {
  const estacoes: EstacaoKey[] = [
    "Manaus", "Itacoatiara", "SGC",
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
    const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
    const caminho = join(dataDir, "boletins_sema_cache.json");
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

// Suavização trailing MA(N) — mesma usada no gerador de percentis.
// Para comparações coerentes, o valor "atual" precisa estar no mesmo regime
// de suavização que os percentis históricos.
const SUAVIZACAO_DIAS = 7;

// Agrega leituras telemétricas em uma cota diária (média do dia) e devolve
// a média móvel das últimas N entradas com dia contínuo. Retorna null se
// não houver janela completa.
function mediaTrailing7(
  leituras: { data: string; cota_cm: number }[]
): { cota_m: number; ultima_atualizacao: string } | null {
  // Agrega múltiplas leituras do mesmo dia tomando a média
  const porDia = new Map<string, number[]>();
  for (const l of leituras) {
    if (!porDia.has(l.data)) porDia.set(l.data, []);
    porDia.get(l.data)!.push(l.cota_cm);
  }
  const diarios = [...porDia.entries()]
    .map(([data, vs]) => ({ data, cota_cm: vs.reduce((s,x)=>s+x,0) / vs.length }))
    .sort((a, b) => a.data.localeCompare(b.data));
  if (diarios.length < SUAVIZACAO_DIAS) return null;

  // Pega últimos SUAVIZACAO_DIAS pontos. Não força contiguidade estrita —
  // se a API teve um buraco de 1 dia mas trouxe 7 dias úteis, aceitamos.
  const ultimos = diarios.slice(-SUAVIZACAO_DIAS);
  const media_cm = ultimos.reduce((s, x) => s + x.cota_cm, 0) / ultimos.length;
  return {
    cota_m: +(media_cm / 100).toFixed(2),
    ultima_atualizacao: ultimos[ultimos.length - 1].data,
  };
}

// Busca cotas atuais das 11 estações que compõem o IDN (4 dos painéis + 7 IDN-only).
// Retorna média móvel 7d para coerência com os percentis suavizados.
// Falhas individuais não quebram o resultado — estações sem janela 7d
// simplesmente não entram no IDN (pesos renormalizam).
export type CotaIDN = { cota_m: number; ultima_atualizacao: string };

export async function fetchCotasIDN(): Promise<Partial<Record<EstacaoComDOY, CotaIDN>>> {
  const estacoes: EstacaoComDOY[] = [
    "SGC", "Curicuriari", "Serrinha", "Moura", "Caracarai",
    "Abuna", "PortoVelho", "Humaita", "Manicore", "Borba", "Labrea",
  ];

  const resultados = await Promise.allSettled(
    estacoes.map(async (e) => {
      // Pega mais dias que SUAVIZACAO_DIAS para ter folga contra gaps na telemetria
      const leituras = await ultimasLeituras(e as EstacaoKey, SUAVIZACAO_DIAS + 3);
      return mediaTrailing7(leituras);
    })
  );

  const mapa: Partial<Record<EstacaoComDOY, CotaIDN>> = {};
  estacoes.forEach((e, i) => {
    const r = resultados[i];
    if (r.status === "fulfilled" && r.value) mapa[e] = r.value;
  });
  return mapa;
}

// Busca vazões (m³/s) recentes das 8 estações que entram no IDN técnico (vazão).
// Como a API SOAP retorna mensal, lemos o último mês disponível e pegamos a
// vazão mais recente do mês. Estações sem vazão pública não retornam.
const ENDPOINT_SOAP = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

const ESTACOES_VAZAO: Record<EstacaoVazao, string> = {
  Curicuriari: "14330000",
  Serrinha:    "14420000",
  Moura:       "14840000",
  Caracarai:   "14710000",
  PortoVelho:  "15400000",
  Humaita:     "15630000",
  Manicore:    "15700000",
  Labrea:      "13870000",
};

function soapVazao(cod: string, dataInicio: string, dataFim: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroSerieHistorica xmlns="http://MRCS/">
      <codEstacao>${cod}</codEstacao>
      <dataInicio>${dataInicio}</dataInicio>
      <dataFim>${dataFim}</dataFim>
      <tipoDados>3</tipoDados>
      <nivelConsistencia></nivelConsistencia>
    </HidroSerieHistorica>
  </soap:Body>
</soap:Envelope>`;
}

export type VazaoIDN = { vazao_m3s: number; ultima_atualizacao: string };

async function fetchVazaoUma(cod: string): Promise<VazaoIDN | null> {
  // Últimos 3 meses — folga para garantir janela 7d mesmo com lag de consolidação
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setMonth(hoje.getMonth() - 3);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

  const resp = await fetch(ENDPOINT_SOAP, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://MRCS/HidroSerieHistorica" },
    body: soapVazao(cod, fmt(inicio), fmt(hoje)),
    next: { revalidate: 21600 },
  });
  if (!resp.ok) return null;
  const xml = await resp.text();
  const blocos = xml.match(/<SerieHistorica\b[^>]*>([\s\S]*?)<\/SerieHistorica>/g) ?? [];

  // Coleta todos os pontos diários, priorizando nivel=2 (consistido) sobre 1.
  const porDia = new Map<string, { q: number; nivel: number }>();
  for (const bloco of blocos) {
    const dataHora = bloco.match(/<DataHora>([^<]+)<\/DataHora>/)?.[1]?.trim();
    const nivel = +(bloco.match(/<NivelConsistencia>([^<]+)<\/NivelConsistencia>/)?.[1] ?? 1);
    if (!dataHora) continue;
    const [ano, mes] = dataHora.slice(0, 7).split("-").map(Number);
    if (!ano || !mes) continue;
    for (let dia = 1; dia <= 31; dia++) {
      const tag = `Vazao${String(dia).padStart(2, "0")}`;
      const raw = bloco.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim();
      if (!raw) continue;
      const q = parseFloat(raw);
      if (isNaN(q)) continue;
      const dt = new Date(`${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}T00:00:00Z`);
      if (dt.getUTCMonth() + 1 !== mes) continue;
      const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      const ex = porDia.get(iso);
      if (!ex || nivel > ex.nivel) porDia.set(iso, { q, nivel });
    }
  }
  const diarios = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (diarios.length < SUAVIZACAO_DIAS) return null;

  // Média móvel trailing dos últimos 7 dias com dado
  const ultimos = diarios.slice(-SUAVIZACAO_DIAS);
  const media = ultimos.reduce((s, [, v]) => s + v.q, 0) / ultimos.length;
  return {
    vazao_m3s: +media.toFixed(2),
    ultima_atualizacao: ultimos[ultimos.length - 1][0],
  };
}

export async function fetchVazoesIDN(): Promise<Partial<Record<EstacaoVazao, VazaoIDN>>> {
  const entries = Object.entries(ESTACOES_VAZAO) as [EstacaoVazao, string][];
  const resultados = await Promise.allSettled(
    entries.map(([, cod]) => fetchVazaoUma(cod))
  );
  const mapa: Partial<Record<EstacaoVazao, VazaoIDN>> = {};
  entries.forEach(([est], i) => {
    const r = resultados[i];
    if (r.status === "fulfilled" && r.value) mapa[est] = r.value;
  });
  return mapa;
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
