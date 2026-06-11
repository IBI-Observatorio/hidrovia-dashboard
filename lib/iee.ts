// iee.ts
// IEE — Índice de Estresse de Escoamento (vertical AGRO).
//
// ESTE É O ÚNICO LUGAR ONDE O IEE É CALCULADO. Componentes de UI nunca
// fabricam número: recebem resultados prontos de lib/agro-content.ts,
// que por sua vez só chama as funções daqui.
//
// Arquitetura (espelha lib/irc.ts):
//   1. Cada componente bruto (F, T, S, H) vira um PERCENTIL SAZONAL 0–100
//      contra as mesmas semanas das safras anteriores (w−2..w+2).
//   2. O IEE é a média ponderada dos percentis (pesos em iee-params.ts).
//   3. O IEE+3 projeta os percentis 3 semanas à frente e devolve uma
//      FAIXA DE CENÁRIOS {central, min, max} — não é intervalo de confiança.

import {
  COMPONENTES_POR_CORREDOR,
  FAIXAS_IEE,
  HORIZONTE_IEE_MAIS,
  JANELA_SAZONAL_SEMANAS,
  MIN_OBS_PERCENTIL,
  PESOS_IEE,
  type ComponenteIEE,
  type Corredor,
  type FaixaIEE,
} from "./iee-params";

export type { Corredor, ComponenteIEE, FaixaIEE };

/** Observação semanal histórica de um componente (para o percentil sazonal). */
export interface PontoSemanal {
  /** identificador da safra, ex.: "2023/24" */
  safra: string;
  /** semana ISO (1–52) */
  semana: number;
  /** valor bruto do componente na unidade dele */
  valor: number;
}

/** Percentis sazonais (0–100) dos componentes de um corredor. */
export type PercentisIEE = Partial<Record<ComponenteIEE, number>>;

/** Resultado do IEE-Agora. */
export interface ResultadoIEE {
  /** score 0–100 */
  valor: number;
  /** faixa de leitura (Fluido/Atenção/Pressão/Crítico) */
  faixa: FaixaIEE;
  /** percentis usados por componente */
  percentis: PercentisIEE;
  /** pesos efetivamente aplicados (renormalizados se faltar componente) */
  pesos: PercentisIEE;
}

/** Faixa de cenários de um componente projetado (percentis 0–100). */
export interface CenarioComponente {
  central: number;
  min: number;
  max: number;
}

/** Resultado do IEE+3 — faixa de CENÁRIOS, não intervalo de confiança. */
export interface ResultadoIEEMais3 {
  central: number;
  min: number;
  max: number;
  faixa: FaixaIEE;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Distância circular entre semanas ISO (calendário de 52 semanas). */
function distSemanaCircular(a: number, b: number): number {
  const d = Math.abs(a - b) % 52;
  return Math.min(d, 52 - d);
}

/** Φ(z) — CDF da normal padrão (aprox. Abramowitz & Stegun 26.2.17,
 *  erro < 7.5e-8). Usada só no fallback robusto. */
function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Percentil sazonal empírico de `valorAtual` contra o histórico das semanas
 * w−2..w+2 (janela circular) de safras anteriores.
 *
 * Matemática:
 *   P = 100 · (n_abaixo + 0,5 · n_iguais) / n        (midrank)
 *
 * Fallback ("calibração em construção"): com menos de MIN_OBS_PERCENTIL
 * observações na janela (mín. 3 safras × 5 semanas), usa o z robusto
 *   z = (x − mediana) / (1,4826 · MAD)
 * mapeado para 0–100 via Φ(z). O 1,4826 torna o MAD consistente com o
 * desvio-padrão sob normalidade.
 *
 * @param serie       histórico semanal do componente (safras anteriores)
 * @param valorAtual  valor bruto corrente do componente
 * @param semanaISO   semana ISO corrente (1–52)
 */
export function percentilSazonal(
  serie: PontoSemanal[],
  valorAtual: number,
  semanaISO: number,
): number {
  const janela = serie
    .filter((p) => distSemanaCircular(p.semana, semanaISO) <= JANELA_SAZONAL_SEMANAS)
    .map((p) => p.valor);

  if (janela.length >= MIN_OBS_PERCENTIL) {
    let abaixo = 0;
    let iguais = 0;
    for (const v of janela) {
      if (v < valorAtual) abaixo++;
      else if (v === valorAtual) iguais++;
    }
    return clamp((100 * (abaixo + 0.5 * iguais)) / janela.length);
  }

  // Histórico curto → z robusto mediana/MAD ("calibração em construção").
  if (janela.length === 0) return 50;
  const med = mediana(janela);
  const mad = mediana(janela.map((v) => Math.abs(v - med)));
  if (mad === 0) return valorAtual > med ? 75 : valorAtual < med ? 25 : 50;
  const z = (valorAtual - med) / (1.4826 * mad);
  return clamp(100 * phi(z));
}

/**
 * IEE-Agora: média ponderada dos percentis sazonais dos componentes.
 *
 *   IEE = Σ w_k · P_k   (w de iee-params; renormalizados se algum
 *                        componente do corredor estiver ausente)
 *
 * @param percentis  percentis 0–100 por componente (já na direção de
 *                   estresse: alto = mais estresse; H já invertido a montante)
 * @param corredor   corredor de exportação
 */
export function calculaIEE(percentis: PercentisIEE, corredor: Corredor): ResultadoIEE {
  const esperados = COMPONENTES_POR_CORREDOR[corredor];
  const pesosBase = PESOS_IEE[corredor];

  const presentes = esperados.filter((c) => percentis[c] !== undefined);
  const somaPesos = presentes.reduce((s, c) => s + (pesosBase[c] ?? 0), 0);

  let acc = 0;
  const pesosUsados: PercentisIEE = {};
  for (const c of presentes) {
    const w = (pesosBase[c] ?? 0) / (somaPesos || 1);
    pesosUsados[c] = +w.toFixed(4);
    acc += w * (percentis[c] as number);
  }

  const valor = clamp(acc);
  return { valor, faixa: faixaIEE(valor), percentis, pesos: pesosUsados };
}

/**
 * IEE+3: projeção do IEE a 3 semanas como FAIXA DE CENÁRIOS.
 *
 * Cada componente entra com {central, min, max} (percentis projetados sob
 * cenários alternativos — ver projetaCenarioComponente). O agregado aplica
 * a MESMA média ponderada do IEE-Agora a cada coluna de cenário:
 *
 *   IEE+3_central = Σ w_k · P_k^central   (idem para min e max)
 *
 * A faixa min–max é leitura de cenários ("se o frete acelerar / se a fila
 * ceder"), NÃO um intervalo de confiança estatístico.
 */
export function calculaIEE_Mais3(
  componentes: Partial<Record<ComponenteIEE, CenarioComponente>>,
  corredor: Corredor,
): ResultadoIEEMais3 {
  const central = calculaIEE(
    mapeiaCenario(componentes, "central"),
    corredor,
  ).valor;
  const min = calculaIEE(mapeiaCenario(componentes, "min"), corredor).valor;
  const max = calculaIEE(mapeiaCenario(componentes, "max"), corredor).valor;

  return {
    central,
    min: Math.min(min, max),
    max: Math.max(min, max),
    faixa: faixaIEE(central),
  };
}

function mapeiaCenario(
  componentes: Partial<Record<ComponenteIEE, CenarioComponente>>,
  chave: keyof CenarioComponente,
): PercentisIEE {
  const out: PercentisIEE = {};
  for (const [c, cen] of Object.entries(componentes) as [
    ComponenteIEE,
    CenarioComponente,
  ][]) {
    if (cen) out[c] = cen[chave];
  }
  return out;
}

/**
 * Projeta a faixa de cenários de UM componente a partir da série recente
 * de percentis sazonais dele.
 *
 * Matemática (deliberadamente simples e auditável — v0):
 *   drift    = inclinação média das últimas 4 variações semanais
 *   central  = P_t + drift · h          (persistência da tendência)
 *   spread   = 1,5 · desvio absoluto médio das variações · √h
 *   min/max  = central ∓ spread        (cenários "alivia" / "aperta")
 *
 * h = HORIZONTE_IEE_MAIS (3 semanas). Tudo clampado em [0, 100].
 *
 * @param percentilSerie  série semanal de percentis do componente
 *                        (ordem cronológica; último = semana corrente)
 */
export function projetaCenarioComponente(
  percentilSerie: number[],
  h = HORIZONTE_IEE_MAIS,
): CenarioComponente {
  const n = percentilSerie.length;
  const atual = n ? percentilSerie[n - 1] : 50;
  if (n < 2) return { central: atual, min: clamp(atual - 8), max: clamp(atual + 8) };

  const difs: number[] = [];
  for (let i = Math.max(1, n - 4); i < n; i++) {
    difs.push(percentilSerie[i] - percentilSerie[i - 1]);
  }
  const drift = difs.reduce((s, d) => s + d, 0) / difs.length;
  const dam = difs.reduce((s, d) => s + Math.abs(d), 0) / difs.length;

  const central = clamp(atual + drift * h);
  const spread = Math.max(4, 1.5 * dam * Math.sqrt(h));
  return { central, min: clamp(central - spread), max: clamp(central + spread) };
}

/**
 * Faixa de leitura do IEE (Fluido / Atenção / Pressão / Crítico).
 * Limites: [min, max), com 100 incluso na última faixa.
 */
export function faixaIEE(valor: number): FaixaIEE {
  const v = clamp(valor);
  return (
    FAIXAS_IEE.find((f) => v >= f.min && (v < f.max || (f.max === 100 && v <= 100))) ??
    FAIXAS_IEE[0]
  );
}

// ===========================================================================
// PASSO 3 — Componente S (pressão de safra) · DADO REAL (Conab)
// ===========================================================================

import {
  CAPACIDADE_SEMANAL_MIL_T,
  FATOR_UTILIZACAO_EMBARQUE_V0,
  HINTERLANDIA,
  type CulturaS,
} from "./iee-params";
import { calculaCustoRota, type DecomposicaoCusto } from "./custeio-rodoviario";
import type { ParametrosCusteio, PerfilVeiculo, RotaT } from "./iee-params";

/** Semana ISO-8601 (1–53) de uma data ISO "YYYY-MM-DD". */
export function semanaISODeData(dataISO: string): number {
  const d = new Date(dataISO + "T00:00:00Z");
  const dia = (d.getUTCDay() + 6) % 7; // seg=0
  d.setUTCDate(d.getUTCDate() - dia + 3); // quinta da semana
  const ano1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round((d.getTime() - ano1.getTime()) / 604800000 + ((ano1.getUTCDay() + 6) % 7 - 3) / 7);
}

/** Resultado de percentil com transparência de método (p/ rótulo na UI). */
export interface PercentilDetalhado {
  percentil: number;
  /** "percentil" = empírico ≥3 safras; "z-robusto" = mediana/MAD (histórico curto) */
  metodo: "percentil" | "z-robusto";
  /** true → exibir "calibração em construção" */
  calibracaoEmConstrucao: boolean;
  nObsJanela: number;
}

/** percentilSazonal + metadados do método (mesma matemática, com rótulo). */
export function percentilSazonalDetalhado(
  serie: PontoSemanal[],
  valorAtual: number,
  semanaISO: number,
): PercentilDetalhado {
  const nObs = serie.filter(
    (p) => distSemanaCircular(p.semana, semanaISO) <= JANELA_SAZONAL_SEMANAS,
  ).length;
  const percentil = +percentilSazonal(serie, valorAtual, semanaISO).toFixed(1);
  const empirico = nObs >= MIN_OBS_PERCENTIL;
  return {
    percentil,
    metodo: empirico ? "percentil" : "z-robusto",
    calibracaoEmConstrucao: !empirico,
    nObsJanela: nObs,
  };
}

/** % colhido na semana, por cultura e UF (frações 0–1) — vem da Conab. */
export type ProgressoSemana = Partial<Record<CulturaS, Partial<Record<string, number>>>>;
/** Produção por cultura e UF (mil t) — vem do Acompanhamento da Safra. */
export type ProducaoUF = Partial<Record<CulturaS, Partial<Record<string, number>>>>;

export interface ResultadoComponenteS {
  /** volume colhido acumulado na hinterlândia (mil t) */
  colhidoMilT: number;
  /** proxy de já embarcado (mil t) */
  embarcadoProxyMilT: number;
  /** volume a escoar = colhido − embarcado (mil t, ≥0) */
  volumeAEscoarMilT: number;
  /** volume a escoar ÷ capacidade semanal — "semanas de fila no campo" */
  semanasDeCapacidade: number;
  detalhe: PercentilDetalhado;
}

/**
 * Proxy v0 do embarcado acumulado (mil t) ENQUANTO não há o acumulado real
 * da ANTAQ (PASSO 2): capacidade semanal × semanas decorridas de escoamento
 * × fator de utilização declarado (FATOR_UTILIZACAO_EMBARQUE_V0).
 * SIMPLIFICAÇÃO DOCUMENTADA: assume embarque a ritmo constante desde o
 * início do escoamento da safra; o dado ANTAQ substitui isto na v1.
 */
export function estimaEmbarcadoProxyV0(
  semanasDesdeInicioEscoamento: number,
  capacidadeSemanalMilT: number = CAPACIDADE_SEMANAL_MIL_T.santos,
): number {
  return Math.max(0, semanasDesdeInicioEscoamento) * capacidadeSemanalMilT * FATOR_UTILIZACAO_EMBARQUE_V0;
}

/**
 * Componente S — pilar FORWARD do IEE: mede o "excedente de campo" que
 * ainda vai disputar a janela de embarque nas próximas semanas.
 *
 * Matemática (v0):
 *   colhido      = Σ_cultura Σ_UF∈hinterlândia pctColhido × produção
 *   embarcadoPxy = proxy ANTAQ (v0: estimaEmbarcadoProxyV0; v1: ANTAQ real)
 *   aEscoar      = max(0, colhido − embarcadoPxy)
 *   bruto        = aEscoar ÷ capacidade semanal  [semanas de capacidade]
 *   P_S          = percentilSazonal(série histórica de `bruto`)
 *
 * O denominador é o MESMO declarado para o F (CAPACIDADE_SEMANAL_SANTOS em
 * iee-params — provisório até o PASSO 2 ligar a capacidade ANTAQ; regra
 * dura: F e S leem do mesmo lugar, nunca duplicar).
 * Histórico < 3 safras → z robusto rotulado "calibração em construção".
 *
 * @param progresso     % colhido da semana corrente (Conab Progresso de Safra)
 * @param producaoUF    produção por UF (Conab Acompanhamento da Safra)
 * @param embarcadoAcumMilT  embarcado acumulado (proxy v0 ou ANTAQ real)
 * @param denominadorMilTSemana  capacidade semanal (iee-params, único lugar)
 * @param serieHistorica  série semanal de `semanasDeCapacidade` p/ percentil
 * @param semanaISO     semana ISO corrente
 * @param corredor      corredor (define hinterlândia e denominador default)
 * @param hinterlandia  override das UFs (default: HINTERLANDIA[corredor])
 */
export function calculaComponenteS(
  {
    progresso,
    producaoUF,
    embarcadoAcumMilT,
    denominadorMilTSemana,
  }: {
    progresso: ProgressoSemana;
    producaoUF: ProducaoUF;
    embarcadoAcumMilT: number;
    denominadorMilTSemana?: number;
  },
  serieHistorica: PontoSemanal[],
  semanaISO: number,
  corredor: Corredor = "santos",
  hinterlandia: readonly string[] = HINTERLANDIA[corredor],
): ResultadoComponenteS {
  const denominador = denominadorMilTSemana ?? CAPACIDADE_SEMANAL_MIL_T[corredor];
  let colhido = 0;
  for (const cultura of Object.keys(progresso) as CulturaS[]) {
    for (const uf of hinterlandia) {
      const pct = progresso[cultura]?.[uf];
      const prod = producaoUF[cultura]?.[uf];
      if (typeof pct === "number" && typeof prod === "number") colhido += pct * prod;
    }
  }
  const embarcado = Math.min(colhido, Math.max(0, embarcadoAcumMilT));
  const aEscoar = Math.max(0, colhido - embarcado);
  const bruto = aEscoar / denominador;

  return {
    colhidoMilT: +colhido.toFixed(0),
    embarcadoProxyMilT: +embarcado.toFixed(0),
    volumeAEscoarMilT: +aEscoar.toFixed(0),
    semanasDeCapacidade: +bruto.toFixed(2),
    detalhe: percentilSazonalDetalhado(serieHistorica, bruto, semanaISO),
  };
}

// ===========================================================================
// PASSO 4 — Componente T (custo rodoviário MODELADO) · engine própria IBI
// ===========================================================================

export interface ResultadoComponenteT {
  /** custo agregado do corredor (R$/t, média ponderada das rotas) */
  custoMedioPorT: number;
  porRota: { rota: string; custoPorT: number }[];
  /** decomposição média ponderada (R$/t) — p/ exibição no breakdown */
  decomposicao: DecomposicaoCusto;
  detalhe: PercentilDetalhado;
}

/**
 * Componente T — CUSTO operacional rodoviário modelado (R$/t), NÃO frete
 * de mercado: a engine (lib/custeio-rodoviario.ts) replica a estrutura das
 * metodologias públicas de custeio (fixo + variável + combustível + pedágio)
 * com premissas IBI declaradas em iee-params; único insumo externo é o
 * diesel ANP. Premissa do IEE: em pico de safra o custo sobe e o frete
 * acompanha — T captura a componente de CUSTO desse aperto.
 *
 * DECISÃO REGISTRADA (spec PASSO 4-c): NÃO deflacionar pelo diesel — aqui
 * T É custo e o diesel é insumo legítimo dele. A deflação por diesel fazia
 * sentido para separar capacidade × combustível num índice de FRETE DE
 * MERCADO; como T virou custo modelado, o diesel fica dentro do custo.
 *
 * Agregação v0: média PONDERADA por peso declarado de cada rota
 * (ROTAS_T[corredor].peso — relevância de volume; v1: pesos por volume
 * embarcado real por origem).
 *
 * @param rotas       rotas do corredor com distância e peso (iee-params)
 * @param perfil      perfil de veículo representativo do corredor
 * @param parametros  coeficientes de custeio com diesel ANP corrente
 * @param serieHistorica  série semanal do custo agregado p/ percentil
 * @param semanaISO   semana ISO corrente
 */
export function calculaComponenteT(
  {
    rotas,
    perfil,
    parametros,
  }: { rotas: RotaT[]; perfil: PerfilVeiculo; parametros: ParametrosCusteio },
  serieHistorica: PontoSemanal[],
  semanaISO: number,
): ResultadoComponenteT {
  const somaPesos = rotas.reduce((s, r) => s + r.peso, 0) || 1;
  let custo = 0;
  const dec: DecomposicaoCusto = { combustivel: 0, variavel: 0, fixo: 0, pedagio: 0 };
  const porRota: { rota: string; custoPorT: number }[] = [];

  for (const r of rotas) {
    const res = calculaCustoRota({ distanciaKm: r.distanciaKm, perfil, parametros });
    const w = r.peso / somaPesos;
    custo += w * res.custoPorT;
    dec.combustivel += w * res.decomposicao.combustivel;
    dec.variavel += w * res.decomposicao.variavel;
    dec.fixo += w * res.decomposicao.fixo;
    dec.pedagio += w * res.decomposicao.pedagio;
    porRota.push({ rota: r.rota, custoPorT: res.custoPorT });
  }

  return {
    custoMedioPorT: +custo.toFixed(2),
    porRota,
    decomposicao: {
      combustivel: +dec.combustivel.toFixed(2),
      variavel: +dec.variavel.toFixed(2),
      fixo: +dec.fixo.toFixed(2),
      pedagio: +dec.pedagio.toFixed(2),
    },
    detalhe: percentilSazonalDetalhado(serieHistorica, custo, semanaISO),
  };
}

// ===========================================================================
// PASSO 5 — Componente F (fila no porto / line-up) · POR CORREDOR
// ===========================================================================

/** Navio do line-up (schema dos scrapers scripts/lineup/*). */
export interface NavioLineup {
  navio: string;
  /** porte bruto (t) */
  dwt: number;
  /** "Exp" | "Imp" | "Imp/Exp" */
  sentido: string;
  /** atracado | programado | ao_largo | esperado */
  status: string;
}

export interface ResultadoComponenteF {
  /** navios graneleiros AGUARDANDO (ao largo + esperados + programados) */
  naviosAguardando: number;
  /** DWT agregado aguardando (mil t) */
  dwtAguardandoMilT: number;
  /** DWT aguardando ÷ capacidade semanal — "semanas de fila" */
  semanasDeFila: number;
  detalhe: PercentilDetalhado;
}

/**
 * Componente F — fila no porto, a partir do line-up público do corredor.
 *
 * Matemática (v0):
 *   aguardando = graneleiros de exportação com status ao_largo/esperado/
 *                programado (atracados já estão na janela, não na fila)
 *   bruto      = Σ DWT aguardando ÷ capacidade semanal  [semanas de fila]
 *   P_F        = percentilSazonal(série histórica de `bruto`)
 *
 * O denominador é o MESMO de S (CAPACIDADE_SEMANAL_MIL_T — único lugar).
 * A série histórica nasce VAZIA (snapshots acumulam a cada coleta do
 * scraper) → percentil cai no z robusto rotulado "calibração em construção"
 * até existirem 3 safras de fila — transparência acima de pressa.
 *
 * @param lineup     navios graneleiros do snapshot corrente
 * @param corredor   corredor (define a capacidade usada no denominador)
 * @param serieHistorica  série semanal de `semanasDeFila` (snapshots passados)
 * @param semanaISO  semana ISO corrente
 */
export function calculaComponenteF(
  lineup: NavioLineup[],
  corredor: Corredor,
  serieHistorica: PontoSemanal[],
  semanaISO: number,
): ResultadoComponenteF {
  const AGUARDANDO = new Set(["ao_largo", "esperado", "programado"]);
  const fila = lineup.filter(
    (n) => AGUARDANDO.has(n.status) && /exp/i.test(n.sentido),
  );
  const dwtMilT = fila.reduce((s, n) => s + n.dwt, 0) / 1000;
  const bruto = dwtMilT / CAPACIDADE_SEMANAL_MIL_T[corredor];

  return {
    naviosAguardando: fila.length,
    dwtAguardandoMilT: +dwtMilT.toFixed(1),
    semanasDeFila: +bruto.toFixed(2),
    detalhe: percentilSazonalDetalhado(serieHistorica, bruto, semanaISO),
  };
}

// ===========================================================================
// PASSO 6 — Componente H (hidrologia do canal Tabocal) · só arco-norte
// ===========================================================================

import {
  PESOS_H_INTERNO,
  THRESHOLD_COLISAO_PCT,
  URGENCIA_CALADO_DIAS_MAX,
} from "./iee-params";
import { calculaIRCTabocal, type SnapshotIRCTabocal } from "./irc-tabocal";
import { projetaCruzamentoCalado } from "./recessao-itacoatiara";

export interface ResultadoComponenteH {
  /** P_H bruto 0–100 antes do percentil sazonal */
  phBruto: number;
  /** IRC-Tabocal v3.6 (0–100, risco DIRETO: alto = pior) */
  ircTabocal: number;
  /** urgência 0–100 pela proximidade do cruzamento CMR < calado-alvo */
  urgenciaCalado: number;
  /** dias até CMR < calado-alvo (null = não cruza no horizonte) */
  diasAteCaladoCritico: number | null;
  detalhe: PercentilDetalhado;
}

/**
 * Componente H — risco hidrológico do canal Tabocal para o Arco Norte.
 * Retorna NULL para santos e paranagua (sem pilar hidrológico); calculaIEE
 * já renormaliza os pesos quando o componente não é informado.
 *
 * Sinais (ambos DIRETOS — alto = mais estresse):
 *  - ircTabocal: calculaIRCTabocal (lib/irc-tabocal.ts, v3.6 OPERACIONAL,
 *    pesos calibrados contra 20 eventos rotulados, Spearman 0,62; com piso
 *    dominador de calado). Score de RISCO 0–100, usado direto — sem inversão.
 *  - urgenciaCalado: dias até o CMR do canal cair abaixo do calado-alvo
 *    (projetaCruzamentoCalado de lib/recessao-itacoatiara.ts — recessão
 *    exponencial calibrada + curva CMR isotônica da Capitania; NUNCA
 *    recalculada aqui). urgência = clamp(1 − dias/URGENCIA_CALADO_DIAS_MAX)
 *    × 100; dias=null (já cruzou ou cruzamento iminente não projetável)
 *    conta como dias=0 → urgência máxima quando o CMR atual já está abaixo
 *    do alvo, senão urgência 0 quando não cruza no horizonte.
 *
 *   P_H = 0,60·ircTabocal + 0,40·urgenciaCalado   (PESOS_H_INTERNO,
 *         julgamento v0 declarado em iee-params)
 *
 * O percentil sazonal final (mesma régua dos demais pilares) é aplicado
 * sobre a série histórica de P_H; histórico < 3 safras → z robusto
 * rotulado "calibração em construção".
 *
 * @param snap      snapshot do IRC-Tabocal (cotas, IDN, onda, ETA)
 * @param corredor  só "arco-norte" produz resultado
 * @param pico      pico de Itacoatiara {cota_m, dataISO} p/ a projeção de calado
 * @param serieHistorica  série semanal de P_H p/ percentil
 * @param semanaISO semana ISO corrente
 * @param dataReferenciaISO  data "hoje" do cálculo (default: data corrente).
 *        Essencial no backtest: os dias até o cruzamento são contados a
 *        partir DESTA data, não do relógio do servidor.
 */
export function calculaComponenteH(
  snap: SnapshotIRCTabocal,
  corredor: Corredor,
  pico: { cota_m: number; dataISO: string },
  serieHistorica: PontoSemanal[],
  semanaISO: number,
  dataReferenciaISO?: string,
): ResultadoComponenteH | null {
  if (corredor !== "arco-norte") return null;

  const irc = calculaIRCTabocal(snap).irc;

  const cruz = projetaCruzamentoCalado(pico.cota_m, pico.dataISO);
  let dias: number | null;
  if (cruz.data_central != null && dataReferenciaISO != null) {
    // dias relativos à data de referência (walk-forward seguro)
    dias = Math.max(
      0,
      Math.round(
        (new Date(cruz.data_central + "T00:00:00Z").getTime() -
          new Date(dataReferenciaISO + "T00:00:00Z").getTime()) / 86_400_000,
      ),
    );
  } else {
    dias = cruz.dias_central;
  }
  if (dias == null) {
    // já cruzou (CMR atual < alvo) → urgência máxima; senão não cruza no
    // horizonte → urgência zero.
    dias = cruz.cmr_atual < (snap.calado_alvo_m ?? 11.0) ? 0 : SENTINELA_NAO_CRUZA_DIAS;
  }
  const urgencia = Math.max(0, Math.min(1, 1 - dias / URGENCIA_CALADO_DIAS_MAX)) * 100;

  const ph = PESOS_H_INTERNO.ircTabocal * irc + PESOS_H_INTERNO.urgenciaCalado * urgencia;

  return {
    phBruto: +ph.toFixed(1),
    ircTabocal: irc,
    urgenciaCalado: +urgencia.toFixed(1),
    diasAteCaladoCritico: dias >= SENTINELA_NAO_CRUZA_DIAS && cruz.data_central == null ? null : dias,
    detalhe: percentilSazonalDetalhado(serieHistorica, ph, semanaISO),
  };
}

/** Sentinela interna: "não cruza no horizonte" ⇒ urgência 0. */
const SENTINELA_NAO_CRUZA_DIAS = URGENCIA_CALADO_DIAS_MAX;

// ===========================================================================
// PASSO 7 — Colisão Safra × Calado · só arco-norte
// ===========================================================================

export interface PontoColisaoReal {
  /** rótulo "S24" (semana ISO) */
  semana: string;
  /** embarque programado agregado dos line-ups (mil t); null = sem
   *  programação publicada para a semana (lacuna honesta, não zero) */
  embarqueProgramadoMilT: number | null;
  /** dias até CMR < calado-alvo no início da semana (≥0; null = não cruza) */
  diasAteCaladoCritico: number | null;
  zonaColisao: boolean;
}

/**
 * Colisão Safra × Calado: cruza o embarque programado dos line-ups do
 * corredor com a contagem regressiva do calado crítico do canal Tabocal.
 *
 *   zonaColisao = embarque > THRESHOLD_COLISAO_PCT × capacidadeSemanal
 *                 E diasAteCaladoCritico < 30
 *
 * Calado SEMPRE via projetaCruzamentoCalado (recessao-itacoatiara.ts).
 * Se a zona nunca dispara no horizonte, o array volta sem zona — notícia
 * boa, exibida como tal (não é erro).
 *
 * @param agendaSemanalMilT  embarque programado por semana à frente
 *                           (índice 0 = semana corrente; null = sem dado)
 * @param pico               pico de Itacoatiara p/ a projeção de calado
 * @param capacidadeSemanalMilT  denominador do corredor (iee-params)
 * @param semanaISOInicial   semana ISO corrente
 * @param horizonteSemanas   default 12
 */
export function calculaColisao(
  agendaSemanalMilT: (number | null)[],
  pico: { cota_m: number; dataISO: string },
  capacidadeSemanalMilT: number,
  semanaISOInicial: number,
  horizonteSemanas = 12,
): PontoColisaoReal[] {
  const cruz = projetaCruzamentoCalado(pico.cota_m, pico.dataISO);
  const out: PontoColisaoReal[] = [];
  for (let k = 0; k < horizonteSemanas; k++) {
    const semISO = ((semanaISOInicial - 1 + k) % 52) + 1;
    const embarque = agendaSemanalMilT[k] ?? null;
    const dias = cruz.dias_central == null ? null : Math.max(0, cruz.dias_central - 7 * k);
    out.push({
      semana: `S${semISO}`,
      embarqueProgramadoMilT: embarque,
      diasAteCaladoCritico: dias,
      zonaColisao:
        embarque != null && dias != null &&
        embarque > THRESHOLD_COLISAO_PCT * capacidadeSemanalMilT && dias < 30,
    });
  }
  return out;
}
