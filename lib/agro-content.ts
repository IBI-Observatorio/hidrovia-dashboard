// agro-content.ts
// DADOS da vertical AGRO (/agro).
//
// ESTADO POR PILAR (PASSO 3 + PASSO 4):
//   SANTOS:
//     S — DADO REAL  (Conab: Progresso de Safra semanal + Acompanhamento da
//         Safra/produção por UF; caches em data/conab/*.json, scrapers em
//         scripts/conab/). Citar Conab em todo card que exibir S.
//     T — CUSTO MODELADO IBI (engine lib/custeio-rodoviario.ts + premissas
//         declaradas em iee-params + diesel ANP em data/anp/diesel.json).
//         NUNCA rotular como frete de mercado/SIFRECA.
//     F — ILUSTRATIVO (line-up Santos é o PASSO 2, ainda não integrado).
//   PARANAGUÁ / ARCO NORTE: todos os pilares ilustrativos (PASSO 5).
//
// Regras duras mantidas:
//   - NENHUM score é calculado aqui: este módulo monta entradas e chama
//     percentilSazonal* / calculaIEE / calculaComponenteS / calculaComponenteT
//     de lib/iee.ts (e SÓ de lá).
//   - Percentis das séries reais são WALK-FORWARD: o percentil da semana w
//     usa apenas observações anteriores a w (sem lookahead).
//   - Calado SEMPRE via lib/recessao-modelo.ts.
//   - Denominador de S = CAPACIDADE_SEMANAL_SANTOS_MIL_T (iee-params) — o
//     MESMO lugar de onde o F lerá no PASSO 2 (não duplicar).
//
// TODO (próximos passos):
//   - F (line-up):  DIOPE Santos — PASSO 2 pendente → substituir geraSerie()
//   - S v1:         embarcado acumulado REAL da ANTAQ no lugar do proxy v0
//   - T v1:         pesos de rota por volume embarcado real por origem
//   - PASSO 5:      replicar F+S+T para Paranaguá; Arco Norte + H pós-SGB
//   - naviosEmEspera: contagem direta dos line-ups públicos

import { makeRng } from "./prng";
import {
  calculaIEE,
  calculaIEE_Mais3,
  calculaComponenteF,
  calculaComponenteS,
  calculaComponenteT,
  estimaEmbarcadoProxyV0,
  percentilSazonal,
  percentilSazonalDetalhado,
  projetaCenarioComponente,
  semanaISODeData,
  type CenarioComponente,
  type ComponenteIEE,
  type Corredor,
  type PontoSemanal,
  type NavioLineup,
  type ProducaoUF,
  type ProgressoSemana,
  type ResultadoIEE,
  type ResultadoIEEMais3,
} from "./iee";
import {
  CAPACIDADE_SEMANAL_MIL_T,
  COMPONENTES_POR_CORREDOR,
  CUSTO_DEMURRAGE_DIA_USD,
  HINTERLANDIA,
  PARAMETROS_CUSTEIO_V0,
  PERFIS_VEICULO,
  PERFIL_VEICULO_PADRAO,
  ROTAS_FRETE,
  ROTAS_T,
  type CulturaS,
} from "./iee-params";
import type { DecomposicaoCusto } from "./custeio-rodoviario";
import { projetaRecessao } from "./recessao-modelo";
import { cotaItaParaCMR } from "./cmr-itacoatiara";
import { calculaColisao, type PontoColisaoReal } from "./iee";

import progressoConab from "../data/conab/progresso-colheita.json";
import producaoConab from "../data/conab/producao-uf.json";
import dieselAnp from "../data/anp/diesel.json";
import lineupParanagua from "../data/lineup/paranagua.json";
import lineupArcoNorte from "../data/lineup/arco-norte.json";
import lineupSantos from "../data/lineup/santos.json";
import hArcoNorte from "../data/agro/h-arco-norte.json";
import capacidadeAntaq from "../data/antaq/capacidade-semanal.json";

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------

/** Sábado de fechamento da última semana Conab/ANP disponível. */
export const DATA_SEMANA_ATUAL =
  (progressoConab.semanas[progressoConab.semanas.length - 1]?.d as string) ?? "2026-06-05";

export const SEMANA_ATUAL_ISO = semanaISODeData(DATA_SEMANA_ATUAL);

/** Nº de semanas das séries exibidas. */
export const N_SEMANAS = 26;

/** Safras do histórico ilustrativo do percentil sazonal (pilares fake). */
const SAFRAS_HISTORICAS = ["2022/23", "2023/24", "2024/25"];

/** Pico ilustrativo do ciclo 2026 para o modelo de recessão.
 *  TODO: substituir pelo forecast SGB real (mesma fonte do /monitor). */
const PICO_ILUSTRATIVO = { cota_m: 27.6, data: "2026-06-20" };

/** Cota de Itacoatiara equivalente a CMR = 11 m — INVERSÃO da curva CMR
 *  isotônica calibrada com 187 observações da Capitania dos Portos/AM
 *  (lib/cmr-itacoatiara.ts, cotaItaParaCMR). Resolve o TODO do PASSO 1
 *  (valor ilustrativo 15,0 substituído pelo calculado). Usada SÓ no
 *  fallback ilustrativo do H; o H real vem de data/agro/h-arco-norte.json. */
const COTA_REF_CALADO_11M = cotaItaParaCMR(11.0);

// ---------------------------------------------------------------------------
// Tipos exportados (props serializáveis dos componentes)
// ---------------------------------------------------------------------------

/** Natureza do dado de cada pilar — a UI distingue visivelmente. */
export type StatusPilar = "real" | "modelado" | "ilustrativo" | "indisponivel";

export interface SerieComponenteAgro {
  componente: ComponenteIEE;
  corredor: Corredor;
  /** semanas ISO (até 26 posições, última = corrente) */
  semanas: number[];
  /** valores brutos na unidade do componente (direção de exibição) */
  valores: number[];
  /** percentis 0–100 (direção de estresse) */
  percentis: number[];
  valorAtual: number;
  percentilAtual: number;
  /** delta bruto vs semana anterior (na unidade do componente) */
  deltaSemanal: number;
  /** natureza do dado (real/modelado/ilustrativo/indisponivel) */
  status: StatusPilar;
  /** rótulo de fonte exibido no card (obrigatório p/ real e modelado) */
  fonte: string;
  /** true → rotular "calibração em construção" (z robusto, <3 safras) */
  calibracaoEmConstrucao?: boolean;
  /** decomposição do custo (só pilar T modelado), R$/t */
  decomposicaoCusto?: DecomposicaoCusto;
  /** só H: dias até o CMR cruzar 11 m (passthrough do cache; 0 = já abaixo) */
  diasAteCalado?: number;
  /** só H: urgência 0–100 do cache — define se a contagem regressiva está ativa */
  urgenciaCalado?: number;
  /** legado: true quando status === "ilustrativo" */
  ilustrativo: boolean;
  /** fonte-alvo (TODO) p/ pilares ilustrativos */
  fonteAlvo: string;
}

export interface CorredorAgroData {
  corredor: Corredor;
  rotas: string[];
  ieeAgora: ResultadoIEE;
  ieeSerie: number[];
  ieeMais3: ResultadoIEEMais3;
  componentes: SerieComponenteAgro[];
  naviosEmEspera: number;
  /** resumo por pilar p/ rodapé do card preditivo, ex.: "S real (Conab) · …" */
  rotuloPilares: string;
  /** true se TODOS os pilares são ilustrativos */
  ilustrativo: boolean;
}

export interface ColisaoData {
  pontos: PontoColisaoReal[];
  /** rótulos das semanas em zona de colisão (vazio = notícia boa) */
  zona: string[];
  /** datas/semanas com agenda publicada (a CDP divulga ~2 semanas) */
  semanasComAgenda: number;
  status: "ok" | "indisponivel";
  fonteRodape: true;
}

export interface AgroData {
  corredores: Record<Corredor, CorredorAgroData>;
  demurrage: {
    naviosTotal: number;
    custoDiaUSD: number;
    porCorredor: { corredor: Corredor; navios: number }[];
    ilustrativo: true;
  };
  colisao: ColisaoData;
  /** datas de referência das fontes reais (p/ rótulos) */
  fontes: { conabProgresso: string; conabProducao: string; anpDiesel: string; anpStatus: string };
}

// ---------------------------------------------------------------------------
// Capacidade semanal: ANTAQ REAL quando o cache está ok; senão o parâmetro
// declarado em iee-params (regra do PASSO 5: nunca duas verdades).
// ---------------------------------------------------------------------------

type CapAntaq = { status: string; corredores?: Record<string, { capacidadeSemanalMilT: number; dadosAte: string }> };

/** Denominador único de F, S e colisão. */
export function capacidadeSemanal(corredor: Corredor): number {
  const c = (capacidadeAntaq as CapAntaq);
  const real = c.status === "ok" ? c.corredores?.[corredor]?.capacidadeSemanalMilT : undefined;
  return real ?? CAPACIDADE_SEMANAL_MIL_T[corredor];
}

/** Rótulo da fonte do denominador (UI/metodologia). */
export function fonteCapacidade(corredor: Corredor): string {
  const c = (capacidadeAntaq as CapAntaq);
  const e = c.status === "ok" ? c.corredores?.[corredor] : undefined;
  return e ? `capacidade: ANTAQ EA (média 12m até ${e.dadosAte})` : "capacidade: parâmetro IBI declarado";
}

// ---------------------------------------------------------------------------
// SANTOS · pilar S — DADO REAL (Conab)
// ---------------------------------------------------------------------------

type CulturaCache = "S" | "M1" | "M2";
const CULTURA_DE_CACHE: Record<CulturaCache, CulturaS> = { S: "SOJA", M1: "MILHO1", M2: "MILHO2" };
const TIPO_DE_CULTURA: Record<CulturaS, string> = { SOJA: "U", MILHO1: "1", MILHO2: "2" };

/** Produção (mil t) por anoAgricola "AA/AA" → cultura → UF. */
function producaoPorSafra(): Record<string, ProducaoUF> {
  const out: Record<string, ProducaoUF> = {};
  if (producaoConab.status !== "ok") return out;
  for (const [ano, tipo, uf, cult, prod] of producaoConab.registros as [string, string, string, string, number][]) {
    const cultura: CulturaS | null =
      cult === "S" ? "SOJA" : tipo === "1" ? "MILHO1" : tipo === "2" ? "MILHO2" : null;
    if (!cultura || TIPO_DE_CULTURA[cultura] !== tipo) continue;
    ((out[ano] ??= {})[cultura] ??= {})[uf] = prod;
  }
  return out;
}

interface SemanaReal {
  d: string;
  semanaISO: number;
  progresso: ProgressoSemana;
  /** anoAgricola "AA/AA" da safra corrente de cada cultura */
  safraDe: Partial<Record<CulturaS, string>>;
}

/**
 * Linha do tempo semanal contínua a partir do cache Conab, com carry-forward:
 * colheita acumulada não regride; semana sem bloco (entressafra) herda o
 * último % conhecido da MESMA safra. Nada é interpolado além disso.
 */
function linhaDoTempoReal(): SemanaReal[] {
  if (progressoConab.status !== "ok" || !progressoConab.semanas.length) return [];
  const porData = new Map(progressoConab.semanas.map((w) => [w.d, w]));
  const ini = new Date(progressoConab.semanas[0].d + "T00:00:00Z");
  const fim = new Date(DATA_SEMANA_ATUAL + "T00:00:00Z");

  const out: SemanaReal[] = [];
  const ultimo: Partial<Record<CulturaS, { sf: string; u: Record<string, number> }>> = {};
  for (let t = ini.getTime(); t <= fim.getTime(); t += 7 * 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    const w = porData.get(d) as
      | ({ d: string } & Partial<Record<CulturaCache, { sf: string; u: Record<string, number[]> }>>)
      | undefined;
    if (w) {
      for (const k of ["S", "M1", "M2"] as CulturaCache[]) {
        const bloco = w[k];
        if (!bloco) continue;
        const cultura = CULTURA_DE_CACHE[k];
        const prev = ultimo[cultura];
        const novaSafra = !prev || prev.sf !== bloco.sf;
        const u: Record<string, number> = novaSafra ? {} : { ...prev.u };
        for (const [uf, vals] of Object.entries(bloco.u)) u[uf] = vals[0];
        ultimo[cultura] = { sf: bloco.sf, u };
      }
    }
    const progresso: ProgressoSemana = {};
    const safraDe: Partial<Record<CulturaS, string>> = {};
    for (const cultura of Object.keys(ultimo) as CulturaS[]) {
      progresso[cultura] = { ...ultimo[cultura]!.u };
      safraDe[cultura] = ultimo[cultura]!.sf.slice(2); // "2024/25" → "24/25"
    }
    out.push({ d, semanaISO: semanaISODeData(d), progresso, safraDe });
  }
  return out;
}

interface PontoS {
  d: string;
  semanaISO: number;
  bruto: number; // semanas de capacidade
  colhidoMilT: number;
  embarcadoProxyMilT: number;
  volumeAEscoarMilT: number;
}

/** Série semanal REAL do componente S do corredor (bruto, sem percentil). */
function serieSReal(corredor: Corredor = "santos"): PontoS[] {
  const hinterlandia = HINTERLANDIA[corredor];
  const timeline = linhaDoTempoReal();
  const producao = producaoPorSafra();
  if (!timeline.length || !Object.keys(producao).length) return [];

  // Início do escoamento do ciclo: 1ª semana com colhido > 2% da produção
  // da hinterlândia (reinicia quando a safra da SOJA vira).
  let cicloSafra = "";
  let idxInicioEscoamento = -1;

  const out: PontoS[] = [];
  for (let i = 0; i < timeline.length; i++) {
    const w = timeline[i];
    const producaoUF: ProducaoUF = {};
    let producaoTotal = 0;
    for (const cultura of Object.keys(w.progresso) as CulturaS[]) {
      const ano = w.safraDe[cultura];
      const porUF = ano ? producao[ano]?.[cultura] : undefined;
      if (!porUF) continue;
      producaoUF[cultura] = porUF;
      for (const uf of hinterlandia) producaoTotal += porUF[uf] ?? 0;
    }

    const safraSoja = w.safraDe.SOJA ?? cicloSafra;
    if (safraSoja !== cicloSafra) { cicloSafra = safraSoja; idxInicioEscoamento = -1; }

    // colhido bruto desta semana (mesma conta do calculaComponenteS, proxy 0)
    const semProxy = calculaComponenteS(
      { progresso: w.progresso, producaoUF, embarcadoAcumMilT: 0 },
      [], w.semanaISO, corredor,
    );
    if (idxInicioEscoamento < 0 && producaoTotal > 0 && semProxy.colhidoMilT > 0.02 * producaoTotal) {
      idxInicioEscoamento = i;
    }
    const semanasEscoando = idxInicioEscoamento >= 0 ? i - idxInicioEscoamento : 0;
    const r = calculaComponenteS(
      {
        progresso: w.progresso, producaoUF,
        embarcadoAcumMilT: estimaEmbarcadoProxyV0(semanasEscoando, capacidadeSemanal(corredor)),
        denominadorMilTSemana: capacidadeSemanal(corredor),
      },
      [], w.semanaISO, corredor,
    );
    out.push({
      d: w.d, semanaISO: w.semanaISO, bruto: r.semanasDeCapacidade,
      colhidoMilT: r.colhidoMilT, embarcadoProxyMilT: r.embarcadoProxyMilT,
      volumeAEscoarMilT: r.volumeAEscoarMilT,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// SANTOS · pilar T — CUSTO MODELADO (engine IBI + diesel ANP)
// ---------------------------------------------------------------------------

interface PontoT { d: string; semanaISO: number; custoPorT: number; decomposicao: DecomposicaoCusto }

/** Série semanal do custo rodoviário modelado do corredor (1 ponto por semana ANP). */
function serieTModelada(corredor: Corredor = "santos"): PontoT[] {
  if (dieselAnp.status !== "ok" && !dieselAnp.serie?.length) return [];
  const perfil = PERFIS_VEICULO[PERFIL_VEICULO_PADRAO[corredor]];
  const rotas = ROTAS_T[corredor];
  return (dieselAnp.serie as [string, number][]).map(([d, preco]) => {
    const r = calculaComponenteT(
      { rotas, perfil, parametros: { ...PARAMETROS_CUSTEIO_V0, precoDieselRS: preco } },
      [], semanaISODeData(d),
    );
    return { d, semanaISO: semanaISODeData(d), custoPorT: r.custoMedioPorT, decomposicao: r.decomposicao };
  });
}

/** Percentis walk-forward (sem lookahead) de uma série semanal real. */
function percentisWalkForward(pontos: { d: string; semanaISO: number; bruto: number }[]) {
  const hist: PontoSemanal[] = [];
  return pontos.map((p) => {
    const det = percentilSazonalDetalhado(hist, p.bruto, p.semanaISO);
    hist.push({ safra: p.d.slice(0, 4), semana: p.semanaISO, valor: p.bruto });
    return det;
  });
}

// ---------------------------------------------------------------------------
// Geradores ILUSTRATIVOS (pilares ainda não ligados — F, e demais corredores)
// ---------------------------------------------------------------------------

interface ParamSerie {
  base: number; amp: number; ruido: number; picoSemana: number; tendencia: number; decimais: number;
}

const PARAMS: Record<Corredor, Partial<Record<ComponenteIEE, ParamSerie>>> = {
  santos: {
    F: { base: 1.4, amp: 0.7, ruido: 0.12, picoSemana: 30, tendencia: 0.02, decimais: 2 },
  },
  paranagua: {
    // fallback se o cache do line-up estiver ausente
    F: { base: 1.6, amp: 0.8, ruido: 0.14, picoSemana: 33, tendencia: 0.03, decimais: 2 },
    T: { base: 312, amp: 48, ruido: 8, picoSemana: 31, tendencia: 1.6, decimais: 0 },
    S: { base: 78, amp: 13, ruido: 2.2, picoSemana: 31, tendencia: 0.7, decimais: 0 },
  },
  "arco-norte": {
    F: { base: 0.9, amp: 0.5, ruido: 0.1, picoSemana: 35, tendencia: 0.02, decimais: 2 },
    T: { base: 228, amp: 38, ruido: 7, picoSemana: 33, tendencia: 1.2, decimais: 0 },
    S: { base: 68, amp: 16, ruido: 2.8, picoSemana: 33, tendencia: 0.4, decimais: 0 },
  },
};

const FONTE_ALVO: Record<ComponenteIEE, string> = {
  F: "line-up DIOPE Santos / Tempo Real Paranaguá / EMAP Itaqui (PASSO 2)",
  T: "engine de custeio IBI + diesel ANP",
  S: "Conab — Progresso de Safra + Acompanhamento da Safra",
  H: "ANA/SGB via modelo de recessão do Observatório",
};

/** Navios em espera por corredor — ILUSTRATIVO.
 *  TODO: contagem direta dos line-ups públicos (DIOPE / APPA / EMAP). */
const NAVIOS_EM_ESPERA: Record<Corredor, number> = { santos: 21, paranagua: 12, "arco-norte": 5 };

const SEEDS: Record<Corredor, number> = { santos: 101, paranagua: 202, "arco-norte": 303 };
const SEED_COMP: Record<ComponenteIEE, number> = { F: 7, T: 11, S: 13, H: 17 };
const round = (v: number, d: number) => +v.toFixed(d);

function valorSazonal(p: ParamSerie, semanaISO: number): number {
  const fase = ((semanaISO - p.picoSemana) / 52) * 2 * Math.PI;
  return p.base + p.amp * Math.cos(fase);
}

function semanasJanela(): number[] {
  const out: number[] = [];
  for (let i = N_SEMANAS - 1; i >= 0; i--) out.push(((SEMANA_ATUAL_ISO - 1 - i + 52) % 52) + 1);
  return out;
}

function geraSerieCorrente(p: ParamSerie, corredor: Corredor, comp: ComponenteIEE): number[] {
  const rng = makeRng(SEEDS[corredor] * SEED_COMP[comp]);
  return semanasJanela().map((sem, i) => {
    const ramp = Math.max(0, i - (N_SEMANAS - 9)) * p.tendencia;
    return round(valorSazonal(p, sem) + ramp + (rng() - 0.5) * 2 * p.ruido, p.decimais);
  });
}

function geraHistorico(p: ParamSerie, corredor: Corredor, comp: ComponenteIEE): PontoSemanal[] {
  const rng = makeRng(SEEDS[corredor] * SEED_COMP[comp] + 1000);
  const out: PontoSemanal[] = [];
  for (const safra of SAFRAS_HISTORICAS) {
    const offsetSafra = (rng() - 0.5) * p.amp * 0.5;
    for (let sem = 1; sem <= 52; sem++) {
      out.push({ safra, semana: sem, valor: round(valorSazonal(p, sem) + offsetSafra + (rng() - 0.5) * 2 * p.ruido, p.decimais) });
    }
  }
  return out;
}

// --- Hidrologia (H, arco-norte) — via recessao-modelo, como no PASSO 1 -----

function diasEntre(deISO: string, ateISO: string): number {
  return Math.round((new Date(ateISO + "T00:00:00Z").getTime() - new Date(deISO + "T00:00:00Z").getTime()) / 86_400_000);
}
function dataDaSemana(idx: number): string {
  const dt = new Date(DATA_SEMANA_ATUAL + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - 7 * (N_SEMANAS - 1 - idx));
  return dt.toISOString().slice(0, 10);
}
const RECESSAO_2026 = projetaRecessao(PICO_ILUSTRATIVO.cota_m, PICO_ILUSTRATIVO.data, 200, COTA_REF_CALADO_11M);
function diasAteCalado11(dataISO: string): number {
  const cruz = RECESSAO_2026.data_cruzamento_central;
  return cruz ? Math.max(0, diasEntre(dataISO, cruz)) : 200;
}
function geraSerieH(): number[] { return semanasJanela().map((_, i) => diasAteCalado11(dataDaSemana(i))); }
function geraHistoricoH(): PontoSemanal[] {
  const rng = makeRng(SEEDS["arco-norte"] * SEED_COMP.H + 1000);
  const out: PontoSemanal[] = [];
  const semanas = semanasJanela();
  for (const safra of SAFRAS_HISTORICAS) {
    const desloc = Math.round((rng() - 0.5) * 30);
    for (let i = 0; i < semanas.length; i++) out.push({ safra, semana: semanas[i], valor: diasAteCalado11(dataDaSemana(i)) + desloc });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Montagem por corredor
// ---------------------------------------------------------------------------

const UNIDADE_DELTA_DEC: Partial<Record<ComponenteIEE, number>> = { F: 2, T: 0, S: 2 };

function montaComponenteIlustrativo(corredor: Corredor, comp: ComponenteIEE): SerieComponenteAgro {
  const semanas = semanasJanela();
  let valores: number[]; let historico: PontoSemanal[];
  if (comp === "H") { valores = geraSerieH(); historico = geraHistoricoH(); }
  else { const p = PARAMS[corredor][comp]!; valores = geraSerieCorrente(p, corredor, comp); historico = geraHistorico(p, corredor, comp); }

  const sinal = comp === "H" ? -1 : 1;
  const histStress = historico.map((pt) => ({ ...pt, valor: sinal * pt.valor }));
  const percentis = valores.map((v, i) => round(percentilSazonal(histStress, sinal * v, semanas[i]), 1));
  const n = valores.length;
  return {
    componente: comp, corredor, semanas, valores, percentis,
    valorAtual: valores[n - 1], percentilAtual: percentis[n - 1],
    deltaSemanal: round(valores[n - 1] - valores[n - 2], UNIDADE_DELTA_DEC[comp] ?? 0),
    status: "ilustrativo", ilustrativo: true,
    fonte: "série ilustrativa — a ligar à fonte oficial",
    fonteAlvo: FONTE_ALVO[comp],
  };
}

function ultimaDataAnp(): string {
  const s = dieselAnp.serie as [string, number][];
  return s.length ? s[s.length - 1][0] : "—";
}
const fmtBR = (iso: string) => (iso.includes("-") ? iso.split("-").reverse().slice(0, 2).join("/") : iso);

/** Pilar S REAL (Conab), com percentis walk-forward. */
function montaSReal(corredor: Corredor): SerieComponenteAgro | null {
  const serie = serieSReal(corredor);
  if (!serie.length) return null;
  const dets = percentisWalkForward(serie.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto })));
  const jan = serie.slice(-N_SEMANAS); const det = dets.slice(-N_SEMANAS);
  const n = jan.length;
  return {
    componente: "S", corredor,
    semanas: jan.map((p) => p.semanaISO),
    valores: jan.map((p) => p.bruto),
    percentis: det.map((d) => d.percentil),
    valorAtual: jan[n - 1].bruto, percentilAtual: det[n - 1].percentil,
    deltaSemanal: round(jan[n - 1].bruto - jan[n - 2].bruto, 2),
    status: progressoConab.status === "ok" ? "real" : "indisponivel",
    ilustrativo: false,
    fonte: `Fonte: Conab — Progresso de Safra / Acompanhamento da Safra (${fmtBR(DATA_SEMANA_ATUAL)})`,
    calibracaoEmConstrucao: det[n - 1].calibracaoEmConstrucao,
    fonteAlvo: FONTE_ALVO.S,
  };
}

/** Pilar T MODELADO (engine IBI + diesel ANP), walk-forward. */
function montaTModelado(corredor: Corredor): SerieComponenteAgro | null {
  const serie = serieTModelada(corredor);
  if (!serie.length) return null;
  const dets = percentisWalkForward(serie.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT })));
  const jan = serie.slice(-N_SEMANAS); const det = dets.slice(-N_SEMANAS);
  const n = jan.length;
  const anpOk = dieselAnp.status === "ok";
  return {
    componente: "T", corredor,
    semanas: jan.map((p) => p.semanaISO),
    valores: jan.map((p) => p.custoPorT),
    percentis: det.map((d) => d.percentil),
    valorAtual: jan[n - 1].custoPorT, percentilAtual: det[n - 1].percentil,
    deltaSemanal: round(jan[n - 1].custoPorT - jan[n - 2].custoPorT, 0),
    status: "modelado", ilustrativo: false,
    fonte: `custo rodoviário modelado — Observatório IBI · insumo: diesel ANP (${anpOk ? fmtBR(ultimaDataAnp()) : "último dado ANP de " + fmtBR(ultimaDataAnp())})`,
    calibracaoEmConstrucao: det[n - 1].calibracaoEmConstrucao,
    decomposicaoCusto: jan[n - 1].decomposicao,
    fonteAlvo: FONTE_ALVO.T,
  };
}

/** Pilar F REAL do line-up — snapshots acumulam o histórico.
 *  paranagua: APPA; arco-norte: agregado EMAP+CDP (Santarém indisponível →
 *  parcial, rotulado). Santos segue ilustrativo (PASSO 2). */
function montaFLineup(corredor: Corredor): SerieComponenteAgro | null {
  const cache =
    corredor === "paranagua" ? lineupParanagua :
    corredor === "arco-norte" ? (lineupArcoNorte as unknown as typeof lineupParanagua) :
    corredor === "santos" ? (lineupSantos as unknown as typeof lineupParanagua) :
    null;
  if (!cache?.snapshots?.length) return null;

  // 1 ponto por semana ISO (último snapshot da semana), walk-forward.
  const porSemana = new Map<string, { d: string; navios: NavioLineup[] }>();
  for (const sn of cache.snapshots) {
    porSemana.set(`${sn.dataColeta.slice(0, 4)}-${semanaISODeData(sn.dataColeta)}`, {
      d: sn.dataColeta, navios: sn.navios as NavioLineup[],
    });
  }
  const pontos = [...porSemana.values()].sort((a, b) => (a.d < b.d ? -1 : 1));
  const brutos = pontos.map((p) => ({
    d: p.d, semanaISO: semanaISODeData(p.d),
    r: calculaComponenteF(p.navios, corredor, [], semanaISODeData(p.d), capacidadeSemanal(corredor)),
  }));
  const dets = percentisWalkForward(brutos.map((b) => ({ d: b.d, semanaISO: b.semanaISO, bruto: b.r.semanasDeFila })));
  const jan = brutos.slice(-N_SEMANAS); const det = dets.slice(-N_SEMANAS);
  const n = jan.length;
  return {
    componente: "F", corredor,
    semanas: jan.map((b) => b.semanaISO),
    valores: jan.map((b) => b.r.semanasDeFila),
    percentis: det.map((d) => d.percentil),
    valorAtual: jan[n - 1].r.semanasDeFila,
    percentilAtual: det[n - 1].percentil,
    deltaSemanal: n > 1 ? round(jan[n - 1].r.semanasDeFila - jan[n - 2].r.semanasDeFila, 2) : 0,
    status: cache.status === "ok" ? "real" : "indisponivel",
    ilustrativo: false,
    fonte:
      corredor === "paranagua"
        ? `Fonte: Porto de Paranaguá (APPA) — line-up de ${fmtBR(cache.coletadoEm)} · ${jan[n - 1].r.naviosAguardando} graneleiros aguardando · ${fonteCapacidade(corredor)}`
        : corredor === "santos"
        ? `Fonte: Porto de Santos (APS/DIOPE) — esperados de ${fmtBR(cache.coletadoEm)} · ${jan[n - 1].r.naviosAguardando} graneleiros aguardando · ${fonteCapacidade(corredor)}`
        : `Fonte: line-ups EMAP (Itaqui) + CDP (Vila do Conde) de ${fmtBR(cache.coletadoEm)} · ${jan[n - 1].r.naviosAguardando} graneleiros aguardando · Miritituba/Santarém: indisponível (parcial) · ${fonteCapacidade(corredor)}`,
    calibracaoEmConstrucao: det[n - 1].calibracaoEmConstrucao,
    fonteAlvo: FONTE_ALVO.F,
  };
}

/** Pilar H — risco hidrológico do Tabocal (modelo IBI sobre dados reais).
 *  Série reconstruída por scripts/agro/gera-h-arco-norte.ts via lib/iee.ts
 *  (IRC-Tabocal v3.6 + urgência de calado). Percentis walk-forward. */
function montaHReal(corredor: Corredor): SerieComponenteAgro | null {
  if (corredor !== "arco-norte" || hArcoNorte.status !== "ok" || !hArcoNorte.semanas?.length) return null;
  const serie = hArcoNorte.semanas;
  const dets = percentisWalkForward(
    serie.map((w) => ({ d: w.d, semanaISO: semanaISODeData(w.d), bruto: w.ph })),
  );
  const jan = serie.slice(-N_SEMANAS); const det = dets.slice(-N_SEMANAS);
  const n = jan.length;
  return {
    componente: "H", corredor,
    semanas: jan.map((w) => semanaISODeData(w.d)),
    valores: jan.map((w) => w.ph),
    percentis: det.map((d) => d.percentil),
    valorAtual: jan[n - 1].ph, percentilAtual: det[n - 1].percentil,
    deltaSemanal: round(jan[n - 1].ph - jan[n - 2].ph, 1),
    diasAteCalado: jan[n - 1].dias,
    urgenciaCalado: jan[n - 1].urgencia,
    status: "modelado", ilustrativo: false,
    fonte: `hidrologia: modelo IBI (IRC-Tabocal v3.6 + recessão Itacoatiara) · CMR: Capitania dos Portos/AM · cota ITA de ${fmtBR(jan[n - 1].d)}`,
    calibracaoEmConstrucao: det[n - 1].calibracaoEmConstrucao,
    fonteAlvo: FONTE_ALVO.H,
  };
}

/** Pico móvel de Itacoatiara (26 semanas — ciclo corrente) do cache de H,
 *  p/ a colisão. Janela maior pegaria o pico da safra passada, cujo
 *  cruzamento já ocorreu (urgência falsa). */
function picoItaAtual(): { cota_m: number; dataISO: string } | null {
  if (hArcoNorte.status !== "ok" || !hArcoNorte.semanas?.length) return null;
  const ult = hArcoNorte.semanas.slice(-26);
  let melhor = ult[0];
  for (const w of ult) if (w.cotaIta > melhor.cotaIta) melhor = w;
  return { cota_m: melhor.cotaIta, dataISO: melhor.d };
}

const ROTULO_STATUS: Record<StatusPilar, string> = {
  real: "real", modelado: "modelado IBI", ilustrativo: "ilustrativo", indisponivel: "indisponível",
};

/** Corredores com pilares reais/modelados (PASSO 6: os três). */
const CORREDORES_REAIS: Corredor[] = ["santos", "paranagua", "arco-norte"];

function montaCorredor(corredor: Corredor): CorredorAgroData {
  const real = CORREDORES_REAIS.includes(corredor);
  const comps: SerieComponenteAgro[] = [];
  for (const c of COMPONENTES_POR_CORREDOR[corredor]) {
    let r: SerieComponenteAgro | null = null;
    if (real && c === "S") r = montaSReal(corredor);
    else if (real && c === "T") r = montaTModelado(corredor);
    else if (real && c === "F") r = montaFLineup(corredor); // santos incluso (PASSO 2)
    else if (real && c === "H") r = montaHReal(corredor);
    comps.push(r ?? montaComponenteIlustrativo(corredor, c));
  }

  // IEE-Agora e série — sempre via lib/iee.ts. Séries têm comprimentos
  // diferentes (F do line-up nasce curto): alinhar pela CAUDA e, em cada
  // semana, compor só com os pilares que têm dado (calculaIEE renormaliza).
  const len = Math.min(N_SEMANAS, Math.max(...comps.map((c) => c.percentis.length)));
  const ieeSerie: number[] = [];
  for (let k = len - 1; k >= 0; k--) {
    const perc: Partial<Record<ComponenteIEE, number>> = {};
    for (const c of comps) {
      const idx = c.percentis.length - 1 - k;
      if (idx >= 0) perc[c.componente] = c.percentis[idx];
    }
    if (Object.keys(perc).length) ieeSerie.push(round(calculaIEE(perc, corredor).valor, 1));
  }

  const percAtuais: Partial<Record<ComponenteIEE, number>> = {};
  for (const c of comps) percAtuais[c.componente] = c.percentilAtual;
  const ieeAgora = calculaIEE(percAtuais, corredor);

  const cenarios: Partial<Record<ComponenteIEE, CenarioComponente>> = {};
  for (const c of comps) cenarios[c.componente] = projetaCenarioComponente(c.percentis);
  const ieeMais3 = calculaIEE_Mais3(cenarios, corredor);

  const cacheLineup =
    corredor === "paranagua" ? lineupParanagua :
    corredor === "arco-norte" ? (lineupArcoNorte as unknown as typeof lineupParanagua) :
    corredor === "santos" ? (lineupSantos as unknown as typeof lineupParanagua) : null;
  const naviosReais =
    cacheLineup && cacheLineup.status === "ok"
      ? (cacheLineup.snapshots[cacheLineup.snapshots.length - 1].navios as NavioLineup[])
          .filter((nv) => ["ao_largo", "esperado", "programado"].includes(nv.status) && /exp/i.test(nv.sentido)).length
      : null;

  return {
    corredor,
    rotas: [...ROTAS_FRETE[corredor]],
    ieeAgora, ieeSerie, ieeMais3,
    componentes: comps,
    naviosEmEspera: naviosReais ?? NAVIOS_EM_ESPERA[corredor],
    rotuloPilares: comps.map((c) => `${c.componente} ${ROTULO_STATUS[c.status]}`).join(" · "),
    ilustrativo: comps.every((c) => c.status === "ilustrativo"),
  };
}

// ---------------------------------------------------------------------------
// Colisão Safra × Calado — REAL (PASSO 7): agenda CDP × recessão Tabocal.
// Cálculo em lib/iee.ts (calculaColisao); aqui só montagem de insumos.
// ---------------------------------------------------------------------------

function montaColisao(): ColisaoData {
  const pico = picoItaAtual();
  const agendaCache = ((lineupArcoNorte as unknown as { agendaSemanalMilT?: [string, number, number][] })
    .agendaSemanalMilT) ?? [];
  if (!pico || lineupArcoNorte.status !== "ok") {
    return { pontos: [], zona: [], semanasComAgenda: 0, status: "indisponivel", fonteRodape: true };
  }
  // agenda publicada → array indexado por semana à frente (null = sem dado)
  const agenda: (number | null)[] = Array.from({ length: 12 }, () => null);
  for (const [k, , milT] of agendaCache) {
    const i = parseInt(k.slice(1), 10);
    if (i >= 0 && i < 12) agenda[i] = milT;
  }
  const pontos = calculaColisao(
    agenda, pico, capacidadeSemanal("arco-norte"), SEMANA_ATUAL_ISO, 12,
  );
  return {
    pontos,
    zona: pontos.filter((p) => p.zonaColisao).map((p) => p.semana),
    semanasComAgenda: agenda.filter((a) => a != null).length,
    status: "ok",
    fonteRodape: true,
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

const CORREDORES: Corredor[] = ["santos", "paranagua", "arco-norte"];

/** Monta todos os dados da página /agro (determinístico — seguro p/ SSR). */
export function getAgroData(): AgroData {
  const corredores = Object.fromEntries(CORREDORES.map((c) => [c, montaCorredor(c)])) as Record<Corredor, CorredorAgroData>;
  const porCorredor = CORREDORES.map((c) => ({ corredor: c, navios: NAVIOS_EM_ESPERA[c] }));
  const naviosTotal = porCorredor.reduce((s, p) => s + p.navios, 0);
  return {
    corredores,
    demurrage: {
      naviosTotal,
      custoDiaUSD: naviosTotal * CUSTO_DEMURRAGE_DIA_USD,
      porCorredor,
      ilustrativo: true,
    },
    colisao: montaColisao(),
    fontes: {
      conabProgresso: progressoConab.coletadoEm,
      conabProducao: producaoConab.coletadoEm,
      anpDiesel: ultimaDataAnp(),
      anpStatus: dieselAnp.status,
    },
  };
}

/** Séries completas reais — consumidas pelo backtest (scripts/backtest). */
export const __backtest = { serieSReal, serieTModelada, percentisWalkForward };
