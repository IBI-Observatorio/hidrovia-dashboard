// Busca dados reais da ANA (HidroWebService REST v2) e mescla com dados
// estáticos (deltas históricos). Usado pelo server component page.tsx.
//
// Mudanças Sprint Dados v1 (21/05/2026):
// - Trocadas 14+ chamadas paralelas v1 por 2 chamadas batch v2
// - Removido o consumo SOAP residual de vazão (descontinuado em 30/06/2026)
// - Vazão agora vem do mesmo batch de telemetria REST (campo Vazao_Adotada)
// - Chuva 24h também é puxada no batch (campo Chuva_Adotada) — usada nos
//   novos painéis "Chuva × Cota" (Sprint Dados v2)
import { DADOS_ATUAIS, type DadosEstacao } from "./dados-historicos";
import {
  ultimasLeiturasBatch,
  resumeLeituras,
  ESTACOES,
  type EstacaoKey,
  type LeituraANA,
} from "./ana-client";
import type { EstacaoComDOY } from "./sub-bacias";
import type { EstacaoVazao } from "./sub-bacias-vazao";

// ─── Painel principal (7 estações) ───────────────────────────────────────────

// SGC removido do painel em mai/2026: a estação 14320001 não tem telemetria
// ANA ao vivo (a "última leitura" da API costuma ter semanas de defasagem).
// Snapshot histórico ainda aparece via DADOS_ATUAIS.SGC + card analítico no
// painel 1 (referência ao 11° Boletim SAH). Ver docs/monitor-cache-ana.md.
const ESTACOES_PAINEL: EstacaoKey[] = [
  "Manaus", "Itacoatiara",
  "Humaita", "Manacapuru", "PortoVelho",
  "Manicore", "Labrea", "Curicuriari",
];

// Busca cota/chuva/vazão das 7 estações em 1 chamada batch (≤10 estações).
// Em caso de falha, mantém os dados estáticos do Sprint 1 como fallback.
export async function fetchTodasEstacoes(): Promise<Record<string, DadosEstacao>> {
  let porEstacao: Map<EstacaoKey, LeituraANA[]>;
  try {
    porEstacao = await ultimasLeiturasBatch(ESTACOES_PAINEL, 2);
  } catch {
    // Toda a chamada falhou → devolve só os estáticos
    return { ...DADOS_ATUAIS };
  }

  const merged: Record<string, DadosEstacao> = {};
  for (const e of ESTACOES_PAINEL) {
    const base = DADOS_ATUAIS[e];
    const leituras = porEstacao.get(e) ?? [];
    const resumo = resumeLeituras(leituras);
    if (!resumo) {
      merged[e] = base;
      continue;
    }
    merged[e] = {
      ...base,
      cota_m:             resumo.cota_m,
      variacao_24h:       resumo.variacao_24h,
      ultima_atualizacao: resumo.ultima_data,
      // Campos novos (opcionais em DadosEstacao) — só populados se vierem
      chuva_mm_24h:       resumo.chuva_mm_acum_24h,
      vazao_m3s:          resumo.vazao_m3s_atual ?? undefined,
    };
  }
  return merged;
}

// ─── IDN: cotas em 11 estações ──────────────────────────────────────────────
// Suavização trailing MA(N) — mesma do gerador de percentis. Para
// comparações coerentes, o "atual" precisa estar no mesmo regime de
// suavização que os percentis históricos.
const SUAVIZACAO_DIAS = 7;

function mediaTrailing7Cota(
  leituras: { data: string; cota_cm: number }[]
): { cota_m: number; ultima_atualizacao: string } | null {
  const porDia = new Map<string, number[]>();
  for (const l of leituras) {
    if (!porDia.has(l.data)) porDia.set(l.data, []);
    porDia.get(l.data)!.push(l.cota_cm);
  }
  const diarios = [...porDia.entries()]
    .map(([data, vs]) => ({ data, cota_cm: vs.reduce((s, x) => s + x, 0) / vs.length }))
    .sort((a, b) => a.data.localeCompare(b.data));
  if (diarios.length === 0) return null;

  // Tolera gaps de até 2 dias: filtra os dias dentro dos últimos 7 dias calendário.
  // Requer mínimo de 5 dias com dados (era 7/7, causava exclusão total da estação
  // com 1 dia de falha de telemetria — exatamente quando o sinal seria mais crítico).
  const ultimaData = diarios[diarios.length - 1].data;
  const ultDt = new Date(ultimaData + "T00:00:00Z");
  const naJanela = diarios.filter((d) => {
    const dt = new Date(d.data + "T00:00:00Z");
    return (ultDt.getTime() - dt.getTime()) / 86400000 < SUAVIZACAO_DIAS;
  });
  const MIN_DIAS = 5;
  if (naJanela.length < MIN_DIAS) return null;

  const media_cm = naJanela.reduce((s, x) => s + x.cota_cm, 0) / naJanela.length;
  return {
    cota_m: +(media_cm / 100).toFixed(2),
    ultima_atualizacao: ultimaData,
  };
}

// SGC removido em mai/2026 — sem telemetria ANA viva.
// `posicaoSubBacia()` em sub-bacias.ts já renormaliza os pesos quando a estação
// está ausente, então o IDN segue válido com 10 estações.
const ESTACOES_IDN_COTA: EstacaoComDOY[] = [
  "Curicuriari", "Serrinha", "Moura", "Caracarai",
  "Abuna", "PortoVelho", "Humaita", "Manicore", "Labrea",
];

export type CotaIDN = { cota_m: number; ultima_atualizacao: string };

export async function fetchCotasIDN(): Promise<Partial<Record<EstacaoComDOY, CotaIDN>>> {
  let porEstacao: Map<EstacaoKey, LeituraANA[]>;
  try {
    // 11 estações > BATCH_LIMIT (10) — o cliente quebra em 2 chamadas
    porEstacao = await ultimasLeiturasBatch(
      ESTACOES_IDN_COTA as unknown as EstacaoKey[],
      SUAVIZACAO_DIAS + 3
    );
  } catch {
    return {};
  }

  const mapa: Partial<Record<EstacaoComDOY, CotaIDN>> = {};
  for (const e of ESTACOES_IDN_COTA) {
    const leituras = porEstacao.get(e as unknown as EstacaoKey) ?? [];
    const m = mediaTrailing7Cota(leituras);
    if (m) mapa[e] = m;
  }
  return mapa;
}

// ─── IDN: vazões em 8 estações (REST nativo, não mais SOAP) ─────────────────
//
// A SOAP descontinuada em 30/06/2026 já não é mais necessária: a v2 da REST
// retorna Vazao_Adotada no mesmo payload da cota. A vazão telemétrica vem
// a cada 15min — agregamos por dia (média) e tiramos média trailing 7d para
// coerência com os percentis suavizados.
//
// Nota: a SOAP retornava vazão consolidada (nível=2) com até meses de lag.
// A telemetria é quase-real (~horas), mas pode ter ruído maior. Tradeoff:
// frescor por consolidação. Para o IDN-vazão isso é OK — o sinal de regime
// não depende de precisão centesimal.
const ESTACOES_IDN_VAZAO: EstacaoVazao[] = [
  "Curicuriari", "Serrinha", "Moura", "Caracarai",
  "PortoVelho", "Humaita", "Manicore", "Labrea",
];

function mediaTrailing7Vazao(
  leituras: { data: string; vazao_m3s: number | null }[]
): { vazao_m3s: number; ultima_atualizacao: string } | null {
  const porDia = new Map<string, number[]>();
  for (const l of leituras) {
    if (l.vazao_m3s == null) continue;
    if (!porDia.has(l.data)) porDia.set(l.data, []);
    porDia.get(l.data)!.push(l.vazao_m3s);
  }
  const diarios = [...porDia.entries()]
    .map(([data, vs]) => ({ data, q: vs.reduce((s, x) => s + x, 0) / vs.length }))
    .sort((a, b) => a.data.localeCompare(b.data));
  if (diarios.length < SUAVIZACAO_DIAS) return null;

  const ultimos = diarios.slice(-SUAVIZACAO_DIAS);
  const media = ultimos.reduce((s, x) => s + x.q, 0) / ultimos.length;
  return {
    vazao_m3s: +media.toFixed(2),
    ultima_atualizacao: ultimos[ultimos.length - 1].data,
  };
}

export type VazaoIDN = { vazao_m3s: number; ultima_atualizacao: string };

export async function fetchVazoesIDN(): Promise<Partial<Record<EstacaoVazao, VazaoIDN>>> {
  let porEstacao: Map<EstacaoKey, LeituraANA[]>;
  try {
    // Pega 30 dias (DIAS_30 é o range máximo) — folga ampla para 7d trailing
    porEstacao = await ultimasLeiturasBatch(
      ESTACOES_IDN_VAZAO as unknown as EstacaoKey[],
      30
    );
  } catch {
    return {};
  }

  const mapa: Partial<Record<EstacaoVazao, VazaoIDN>> = {};
  for (const e of ESTACOES_IDN_VAZAO) {
    const leituras = porEstacao.get(e as unknown as EstacaoKey) ?? [];
    const m = mediaTrailing7Vazao(leituras);
    if (m) mapa[e] = m;
  }
  return mapa;
}

// ─── Série diária recente de Caracaraí (para detector Onda Branco) ─────────
//
// O detector precisa da série temporal de Caracaraí dos últimos ~10 dias para
// calcular variação 7d. Usamos `ultimasLeiturasBatch` (já importado do topo
// do arquivo) com DIAS_14 e agregamos por dia (média de todas leituras
// telemétricas do dia).

export async function fetchSerieCaracarai(
  diasAtras = 14,
): Promise<{ data: string; cota_m: number }[]> {
  try {
    const mapa = await ultimasLeiturasBatch(["Caracarai"], diasAtras);
    const leituras = mapa.get("Caracarai") ?? [];
    if (leituras.length === 0) return [];

    // Agrega por dia (média)
    const porDia = new Map<string, number[]>();
    for (const l of leituras) {
      if (!porDia.has(l.data)) porDia.set(l.data, []);
      porDia.get(l.data)!.push(l.cota_cm);
    }
    const serie = [...porDia.entries()]
      .map(([data, valores]) => ({
        data,
        cota_m: +(valores.reduce((a, b) => a + b, 0) / valores.length / 100).toFixed(2),
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
    return serie;
  } catch {
    return [];
  }
}

// ─── Previsão 2026 dinâmica (cache SGB > fallback hardcoded) ───────────────
//
// Sprint Tese Regulatória v1 (21/05/2026): lê o último boletim SGB parseado
// (cache em `data/boletins_sgb_cache.json`, alimentado por `app/api/sgb`) e
// devolve a previsão de pico Manaus/Manacapuru/Itacoatiara + fonte. Quando
// não houver cache, devolve `PREVISAO_2026` hardcoded com a fonte marcada
// como "fallback". O cron semanal (scripts/pipeline-sace.py) faz POST no
// /api/sgb com os PDFs novos — então o cache se mantém sozinho.
import { PREVISAO_2026 } from "./dados-historicos";
import { lerENSOAdvisory } from "./enso-cpc";

export interface Previsao2026 {
  fonte:               string;
  fonte_dinamica:      boolean;            // true se veio do parser SGB
  numero_boletim?:     number;             // ex: 21 (do parser SGB)
  data_boletim?:       string;             // ex: "2026-05-26" (ISO, do parser SGB)
  manaus_pico_cheia:   {
    media:     number;
    ic80_min:  number;
    ic80_max:  number;
    prob_27_5: number;                     // 0..1
  };
  manacapuru_pico:     number;
  itacoatiara_pico:    number;
  parintins_pico?:     number;             // só vem do cache, não do hardcoded
  enso:                string;             // texto sintético em PT, ex: "El Niño Watch — 82% mai–jul/26..."
  enso_data_emissao?:  string;             // ISO yyyy-mm-dd da última discussion CPC
  enso_status?:        string;             // "El Niño Watch" | "La Niña Advisory" | "Not Active" | ...
  // Anomalia de precipitação por bacia (categoria −3..+3) — vem do parser SGB v2
  anomalia_pp_negro?:    number;           // bacia do Negro (driver do colapso 2026)
  anomalia_pp_madeira?:  number;           // bacia do Madeira (driver 2024)
}

export async function fetchPrevisao2026(): Promise<Previsao2026> {
  // ENSO: tenta cache dinâmico (scrape mensal CPC) antes do fallback.
  const ensoCache = lerENSOAdvisory();
  const ensoTexto       = ensoCache?.sintese_pt        ?? PREVISAO_2026.enso;
  const ensoDataEmissao = ensoCache?.data_emissao      ?? PREVISAO_2026.enso_data_emissao;
  const ensoStatus      = ensoCache?.status;

  try {
    const { readFileSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
    const caminho = join(dataDir, "boletins_sgb_cache.json");
    if (!existsSync(caminho)) throw new Error("sem cache SGB");

    const cache = JSON.parse(readFileSync(caminho, "utf-8"));
    const ultimo = cache.boletins?.[cache.boletins.length - 1];
    if (!ultimo || !ultimo.previsoes?.length) throw new Error("cache vazio");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const find = (chave: string): any =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ultimo.previsoes.find((p: any) => p.estacao === chave);

    const manaus      = find("Manaus");
    const manacapuru  = find("Manacapuru");
    const itacoatiara = find("Itacoatiara");
    const parintins   = find("Parintins");

    // Precisa pelo menos da previsão de Manaus para considerar dinâmico
    if (!manaus) throw new Error("previsão Manaus ausente no boletim");

    const fonteLabel = `SGB/CPRM — ${ultimo.numero ?? "?"}° Boletim SAH Amazonas (${ultimo.data})`;

    // Extrai anomalias de PP por bacia (Sprint v2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findPP = (bacia: string): number | undefined => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = (ultimo.anomalias_pp ?? []).find((x: any) =>
        x.bacia?.toLowerCase().includes(bacia.toLowerCase())
      );
      return a?.categoria;
    };

    return {
      fonte:           fonteLabel,
      fonte_dinamica:  true,
      numero_boletim:  typeof ultimo.numero === "number" ? ultimo.numero : undefined,
      data_boletim:    typeof ultimo.data === "string" ? ultimo.data : undefined,
      manaus_pico_cheia: {
        media:     manaus.cota_prevista_m,
        ic80_min:  manaus.ic80_min_m,
        ic80_max:  manaus.ic80_max_m,
        prob_27_5: manaus.prob_inundacao ?? PREVISAO_2026.manaus_pico_cheia.prob_27_5,
      },
      manacapuru_pico:  manacapuru?.cota_prevista_m  ?? PREVISAO_2026.manacapuru_pico,
      itacoatiara_pico: itacoatiara?.cota_prevista_m ?? PREVISAO_2026.itacoatiara_pico,
      parintins_pico:   parintins?.cota_prevista_m,
      enso:                ensoTexto,
      enso_data_emissao:   ensoDataEmissao,
      enso_status:         ensoStatus,
      anomalia_pp_negro:   findPP("Negro"),
      anomalia_pp_madeira: findPP("Madeira"),
    };
  } catch {
    return {
      ...PREVISAO_2026,
      enso:                ensoTexto,
      enso_data_emissao:   ensoDataEmissao,
      enso_status:         ensoStatus,
      fonte:               PREVISAO_2026.fonte + " (fallback)",
      fonte_dinamica:      false,
    };
  }
}

