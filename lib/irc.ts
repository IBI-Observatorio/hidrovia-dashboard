// IRC — Índice de Risco de Calado (0–100) · v2.1
//
// O IRC é o número proprietário do Observatório IBI: um único score 0–100 que
// quantifica o risco para a navegação na bacia do Amazonas, combinando 4
// sinais já calculados pelo dashboard:
//
//   40% Distância projetada ao gatilho 17,7m em Manaus (vem do Calendário LWS)
//   25% Probabilidade HMM de regime extremo Norte ou Sul em 7 dias
//   20% Severidade da Onda Branco (Caracaraí — detector antecipado)
//   15% |Anomalia| de precipitação 30d (placeholder até 2.6 estar pronto)
//
// Faixas:
//   0  – 25 → VERDE      (sistema saudável)
//   25 – 50 → AMARELO    (atenção)
//   50 – 75 → LARANJA    (alto risco operacional)
//   75 – 100 → VERMELHO  (risco extremo)
//
// CHANGELOG:
//   v1 (mai/2026): heurística inicial — pesos 40/25/20/15, severidade Onda
//                  discreta, HMM tautológico, lag fixo 30d.
//   v2 (mai/2026): severidade Onda contínua + DOY; HMM com anomalia vs
//                  incondicional; AGORA vs PROJETADO; Monte Carlo IC80.
//   v2.1 (mai/2026): pesos calibrados contra 20 eventos rotulados (40/15/15/30);
//                    lag Caracaraí→Manaus calibrado por correlação anti-sazonal;
//                    sazonalidade do LWS (subida vs descida); IDN clampeado
//                    para domínio do HMM.
export const IRC_VERSAO = "v2.1";
//
// IMPORTANTE — os pesos são uma calibração inicial baseada em:
//   - 40% para LWS porque é o gatilho regulatório direto (impacto comercial)
//   - 25% para HMM porque incorpora sazonalidade e persistência multi-dia
//   - 20% para Onda Branco porque é sinal antecipado (lead time)
//   - 15% para precipitação porque é "input" climático upstream
//
// Calibração de validação cruzada (testes 3.6):
//   set/2024 (mega-seca, Manaus abaixo 17,7) → IRC ≥ 80
//   abr/2025 (cheia normal, sistema saudável) → IRC ≤ 30
//   out/2023 (estiagem moderada)              → IRC ≥ 70
//   mar/2026 (dessincronização Norte extrema) → IRC ≥ 75

import { estadoHMM, CALIBRACAO_HMM } from "./hmm-idn";
import type { ResultadoOndaBranco } from "./onda-branco";

export type FaixaIRC = "verde" | "amarelo" | "laranja" | "vermelho";

// ─── Pesos (somam 1.0) ───────────────────────────────────────────────────────
//
// v2.1 — Pesos calibrados por busca em grade contra 20 eventos rotulados
// (lib/eventos-rotulados.ts), regularizados como mistura 70/30 (otimizado/
// heurístico) para reduzir overfitting com amostra pequena. Calibração em
// `scripts/otimiza-pesos-irc.mjs`.
//
// Comparativo:
//   v2 (heurístico):   lws=0.40, hmm=0.25, onda=0.20, pp=0.15 → Spearman 0.54
//   v2.1 (regularizado): lws=0.40, hmm=0.15, onda=0.15, pp=0.30 → Spearman 0.62
//
// Mudança principal: peso da anomalia PP subiu de 0.15 → 0.30 (sinal mais
// preditivo de severidade observada). Peso do HMM baixou de 0.25 → 0.15
// (HMM tem alta volatilidade em regime extremo, ruidoso para o agregado).
export const PESOS_IRC = {
  lws:           0.40,
  hmm_extremo:   0.15,
  onda_branco:   0.15,
  anomalia_pp:   0.30,
} as const;

export interface ComponentesIRC {
  lws:           number;   // 0..100 — contribuição parcial
  hmm_extremo:   number;
  onda_branco:   number;
  anomalia_pp:   number;
}

export interface ResultadoIRC {
  irc:           number;        // 0..100
  faixa:         FaixaIRC;
  componentes:   ComponentesIRC;
  // Detalhamento para tooltip/breakdown:
  detalhes: {
    cota_manaus_m:          number;
    distancia_ao_gatilho_m: number;   // pode ser negativo (já abaixo)
    idn:                    number;
    prob_extremo_7d:        number;   // 0..1
    severidade_onda:        ResultadoOndaBranco["severidade"];
    var_onda_m:             number;
    anomalia_pp_normalizada: number;  // 0..1
  };
}

// ─── Componentes individuais ─────────────────────────────────────────────────

/**
 * Componente LWS: 100 quando Manaus já está abaixo de 17,7m; 0 quando está
 * acima de 22m. Escala linear entre os dois.
 *
 * v2.1: aceita `fase_ciclo` ("subida" | "descida" | "topo") para modular o
 * componente atual. Mesma cota a 19m tem significado oposto na subida
 * (próximo do pico anual) vs descida (caminho para o gatilho).
 *
 * Quando `eta_dias_cruzamento` é fornecido (vem do Calendário LWS), usa-se a
 * PROJEÇÃO em vez da cota atual: mesmo com Manaus em cheia, se o modelo prevê
 * cruzamento iminente, o componente sobe. Combina-se o maior dos dois valores.
 *
 * @param cotaManaus_m         Cota atual em metros
 * @param eta_dias_cruzamento  Dias até cruzar 17,7m segundo modelo (opcional)
 * @param fase_ciclo           "subida" | "descida" | "topo" (opcional)
 */
export function componenteLWS(
  cotaManaus_m: number,
  eta_dias_cruzamento?: number | null,
  fase_ciclo?: "subida" | "descida" | "topo",
): number {
  const TETO = 22.0;
  const PISO = 17.7;

  // (1) Componente "atual" — distância do gatilho HOJE
  let atual: number;
  if (cotaManaus_m >= TETO) atual = 0;
  else if (cotaManaus_m <= PISO) {
    const extra = PISO - cotaManaus_m;
    atual = 100 + extra * 15;
  } else {
    atual = +(((TETO - cotaManaus_m) / (TETO - PISO)) * 100).toFixed(1);
  }

  // (1b) Modulação por fase do ciclo:
  //   - Subida: cota baixa preocupa MENOS (caminho natural é subir)
  //   - Descida: cota baixa preocupa MAIS (caminho natural é descer)
  //   - Topo: neutra
  if (fase_ciclo === "subida")  atual *= 0.6;   // amortece em 40%
  if (fase_ciclo === "descida") atual *= 1.2;   // amplifica em 20% (cap em ~100)
  atual = Math.min(150, atual);                 // hard cap

  // (2) Componente "projetado"
  let projetado = 0;
  if (eta_dias_cruzamento != null && eta_dias_cruzamento >= 0) {
    if      (eta_dias_cruzamento <=  30) projetado = 90;
    else if (eta_dias_cruzamento <=  90) projetado = +(90 - ((eta_dias_cruzamento - 30) / 60) * 50).toFixed(1);
    else if (eta_dias_cruzamento <= 180) projetado = +(40 - ((eta_dias_cruzamento - 90) / 90) * 30).toFixed(1);
    else                                  projetado = +(10 - Math.min(10, (eta_dias_cruzamento - 180) / 30)).toFixed(1);
  }

  return Math.max(atual, projetado);
}

/**
 * Detecta fase do ciclo hidrológico de Manaus a partir do mês corrente.
 * Heurística baseada na sazonalidade típica (pico em jun, mínima em out-nov).
 */
export function detectaFaseCiclo(dataISO: string): "subida" | "descida" | "topo" {
  const mes = parseInt(dataISO.slice(5, 7), 10);
  if (mes >= 1 && mes <= 5)  return "subida";   // jan-mai: subida da cheia
  if (mes === 6)             return "topo";     // jun: pico
  if (mes >= 7 && mes <= 12) return "descida";  // jul-dez: vazante
  return "topo";
}

/**
 * Componente HMM extremo (v2 — corrigido): mede ANOMALIA da probabilidade
 * de estar em estado extremo (Sul ou Norte) em 7d, comparado à probabilidade
 * INCONDICIONAL desses estados.
 *
 * v1 (deprecada): retornava P(Sul ou Norte | estado atual) — tautológico
 * quando o estado atual já era extremo (sempre alto por persistência).
 *
 * v2: P(extremo | estado) − P(extremo) normalizado para escala 0-100.
 * Quando o sistema já está em estado extremo, contribuição é a PERSISTÊNCIA
 * em relação à média de longo prazo. Quando está em sincronizado, contribuição
 * é o RISCO DE TRANSIÇÃO para extremo.
 */

// Probabilidades estacionárias dos 3 estados (calculadas da matriz A^∞)
// Aproximação: usar as proporções dos componentes calibrados (n_observacoes
// dividido entre Sul, Sinc, Norte aproximadamente reflete π estacionário).
// Para K=3 HMM gaussiano calibrado em 2916 dias, o π estacionário derivado
// numericamente da matriz é ≈ [0.34, 0.33, 0.33] (matriz quase-uniforme).
// Logo P(extremo) incondicional ≈ 0.34 + 0.33 = 0.67.
const PROB_EXTREMO_INCONDICIONAL = 0.67;

// Domínio de calibração do HMM: IDN ∈ [-0.9, +0.9] (estatísticas dos 2916
// dias de treino). Valores fora extrapolam — clampeamos para evitar
// classificação de estado em região não-amostrada.
const HMM_DOMINIO_MIN = -0.9;
const HMM_DOMINIO_MAX = +0.9;

export function componenteHMMExtremo(idn: number): number {
  // Clamp para domínio de calibração do HMM (preserva IDN original em outros
  // componentes; só o classificador HMM recebe valor saturado).
  const idn_clamp = Math.max(HMM_DOMINIO_MIN, Math.min(HMM_DOMINIO_MAX, idn));
  const estado = estadoHMM(idn_clamp);
  const t7 = CALIBRACAO_HMM.matriz_transicao_7d[estado.indice];
  const probExtremoCondicional = t7[0] + t7[2];   // Sul + Norte

  // Anomalia: quanto P(extremo | estado) está acima/abaixo do esperado por
  // chance. Centrada em 0, escalada para -1..+1.
  const anomalia = probExtremoCondicional - PROB_EXTREMO_INCONDICIONAL;

  // Mapeia anomalia para escala 0-100:
  //   anomalia = 0     → 50  (linha base)
  //   anomalia = +0.3  → 100 (sistema persistirá extremo)
  //   anomalia = -0.3  → 0   (sistema migrando para sincronizado)
  const score = 50 + (anomalia / 0.3) * 50;
  return +Math.max(0, Math.min(100, score)).toFixed(1);
}

/**
 * Componente Onda Branco: mapeia severidade discreta para escala numérica.
 *   nenhuma  → 0
 *   moderada → 30
 *   alta     → 65
 *   extrema  → 100
 */
export function componenteOndaBranco(
  severidade: ResultadoOndaBranco["severidade"],
): number {
  const mapa = { nenhuma: 0, moderada: 30, alta: 65, extrema: 100 };
  return mapa[severidade] ?? 0;
}

/**
 * Componente Anomalia Precipitação: mapeia a magnitude do desvio (categorizado
 * pelo SGB de -3 a +3 onde 0 = normal) em 0..100. Por padrão usa 0 (neutro)
 * quando o sinal não está disponível.
 *
 * @param anomaliaCategoria  Categoria -3..+3 (SGB Tabela 04)
 */
export function componenteAnomaliaPP(anomaliaCategoria = 0): number {
  // Mapa: 0 = 0; ±1 = 30; ±2 = 60; ±3 = 100. Quanto mais extremo, maior.
  const abs = Math.min(3, Math.abs(anomaliaCategoria));
  return +(abs / 3 * 100).toFixed(1);
}

// ─── Faixa do IRC ────────────────────────────────────────────────────────────

export function faixaIRC(irc: number): FaixaIRC {
  if (irc < 25)  return "verde";
  if (irc < 50)  return "amarelo";
  if (irc < 75)  return "laranja";
  return "vermelho";
}

// ─── Cor de UI por faixa ─────────────────────────────────────────────────────
export const COR_FAIXA: Record<FaixaIRC, { texto: string; bg: string; border: string }> = {
  verde:    { texto: "text-verde",     bg: "bg-verde/10",     border: "border-verde/40" },
  amarelo:  { texto: "text-ouro",      bg: "bg-ouro/10",      border: "border-ouro/40" },
  laranja:  { texto: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/40" },
  vermelho: { texto: "text-vermelho",  bg: "bg-vermelho/10",  border: "border-vermelho/40" },
};

// ─── Entrada do cálculo ──────────────────────────────────────────────────────

export interface SnapshotIRC {
  cotaManaus_m:           number;
  idn:                    number;
  severidade_onda:        ResultadoOndaBranco["severidade"];
  severidade_onda_continua?: number;     // 0..100 (v2 — opcional; usa label se ausente)
  var_onda_m:             number;
  anomalia_pp?:           number;        // categoria -3..+3 (undefined = ausente)
  eta_dias_cruzamento?:   number | null; // dias até cruzar 17,7m (do Calendário LWS)
  fase_ciclo?:            "subida" | "descida" | "topo";  // v2.1 — sazonalidade LWS
}

export interface ResultadoIRC_Estendido extends ResultadoIRC {
  pesos_efetivos:       ComponentesIRC;  // pesos após renormalização
  componentes_ausentes: string[];        // ["anomalia_pp"] etc.
}

/**
 * IRC_AGORA — risco operacional IMEDIATO (cota Manaus + anomalia HMM atual).
 * Ignora componentes prospectivos (ETA projetado, Onda Branco em trânsito).
 * Útil para "quão crítico é o sistema HOJE?".
 */
export function calculaIRC_Agora(snap: SnapshotIRC): ResultadoIRC_Estendido {
  return calculaIRC({
    ...snap,
    severidade_onda:          "nenhuma",
    severidade_onda_continua: 0,
    var_onda_m:               0,
    eta_dias_cruzamento:      null,         // só componente atual do LWS
  });
}

/**
 * IRC_PROJETADO — risco projetado em ~30-90 dias considerando todos os
 * sinais antecipados (Onda Branco, ETA cruzamento). É o IRC "completo".
 */
export function calculaIRC_Projetado(snap: SnapshotIRC): ResultadoIRC_Estendido {
  return calculaIRC(snap);
}

/**
 * Calcula o IRC a partir de um snapshot do sistema.
 *
 * v2: renormaliza pesos quando componente está ausente (anomalia_pp undefined).
 *     Usa severidade_onda_continua se fornecida (v2), senão cai no mapeamento
 *     discreto (v1).
 */
export function calculaIRC(snap: SnapshotIRC): ResultadoIRC_Estendido {
  const c_lws  = componenteLWS(snap.cotaManaus_m, snap.eta_dias_cruzamento, snap.fase_ciclo);
  const c_hmm  = componenteHMMExtremo(snap.idn);
  const c_onda = snap.severidade_onda_continua != null
    ? snap.severidade_onda_continua                    // v2 contínuo
    : componenteOndaBranco(snap.severidade_onda);     // v1 fallback
  const c_pp   = snap.anomalia_pp != null
    ? componenteAnomaliaPP(snap.anomalia_pp)
    : null;                                            // ausente

  // Renormalização: se anomalia_pp ausente, redistribui o peso (0.15) entre
  // os demais proporcionalmente. Pesos efetivos somam sempre 1.0.
  const ausentes: string[] = [];
  let p_lws:  number = PESOS_IRC.lws;
  let p_hmm:  number = PESOS_IRC.hmm_extremo;
  let p_onda: number = PESOS_IRC.onda_branco;
  let p_pp:   number = PESOS_IRC.anomalia_pp;

  if (c_pp == null) {
    ausentes.push("anomalia_pp");
    // v2.1: peso PP = 0.30 → fator = 1/0.70 ≈ 1.429 (era 1.176 na v2)
    const fator = 1 / (1 - PESOS_IRC.anomalia_pp);
    p_lws  *= fator;
    p_hmm  *= fator;
    p_onda *= fator;
    p_pp    = 0;
  }

  const irc = +(
    p_lws  * c_lws  +
    p_hmm  * c_hmm  +
    p_onda * c_onda +
    p_pp   * (c_pp ?? 0)
  ).toFixed(1);

  const irc_clamp = Math.max(0, Math.min(100, irc));

  return {
    irc:        irc_clamp,
    faixa:      faixaIRC(irc_clamp),
    componentes: {
      lws:         c_lws,
      hmm_extremo: c_hmm,
      onda_branco: c_onda,
      anomalia_pp: c_pp ?? 0,
    },
    pesos_efetivos: {
      lws:         +p_lws.toFixed(3),
      hmm_extremo: +p_hmm.toFixed(3),
      onda_branco: +p_onda.toFixed(3),
      anomalia_pp: +p_pp.toFixed(3),
    },
    componentes_ausentes: ausentes,
    detalhes: {
      cota_manaus_m:           snap.cotaManaus_m,
      distancia_ao_gatilho_m:  +(snap.cotaManaus_m - 17.70).toFixed(2),
      idn:                     snap.idn,
      prob_extremo_7d:         +(c_hmm / 100).toFixed(3),
      severidade_onda:         snap.severidade_onda,
      var_onda_m:              snap.var_onda_m,
      anomalia_pp_normalizada: c_pp != null ? +(c_pp / 100).toFixed(2) : 0,
    },
  };
}
