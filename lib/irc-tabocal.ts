// IRC-Tabocal — Índice de Risco de Calado v3 (0–100)
//
// EVOLUÇÃO CONCEITUAL — v3 vs v2.1 (lib/irc.ts):
//
// v2.1 (IRC-Manaus): ancorado no gatilho regulatório ANTAQ (17,7m em Manaus).
//   Reproduzia o mesmo ponto de referência que a tese do IBI critica como
//   inadequado.
//
// v3 (IRC-Tabocal): ancorado no PONTO DE CONTROLE OPERACIONAL REAL — cota de
//   Itacoatiara, que determina o calado disponível no canal de Tabocal.
//   Manaus é ELIMINADO como componente principal.
//
// Por que importa: em 2024, Manaus cruzou 17,7m em 10/set e atingiu mínima em
// 09/out. Itacoatiara só atingiu mínima em 31/out — 22 dias depois. O parâmetro
// regulatório atual ignora essa defasagem. O IRC-Tabocal mede o que realmente
// importa para o frete.
//
// Componentes (somam 1.0):
//
//   50% Calado-Tabocal: distância ao gatilho operacional (−0,10m em Itacoatiara)
//                       combina cota ATUAL + ETA projetado pelo modelo de
//                       recessão de Itacoatiara (k=0,0122)
//
//   15% HMM extremo: probabilidade de regime extremo Norte/Sul em 7 dias
//                    (anomalia vs incondicional — mesmo cálculo do IRC-Manaus)
//
//   10% Onda Branco: severidade contínua da subida em Caracaraí
//
//   10% Anomalia PP: anomalia de precipitação 30d na bacia do Negro (parser SGB)
//
//   15% Lag operacional: divergência ENTRE Manaus e Itacoatiara comparada à
//                        climatologia. Captura a defasagem em tempo real —
//                        sinal regulatório direto.
//
// Faixas (idênticas ao IRC-Manaus para coerência visual):
//   0–25 verde · 25–50 amarelo · 50–75 laranja · 75–100 vermelho

export const IRC_TABOCAL_VERSAO = "v3.3";

import { estadoHMM, CALIBRACAO_HMM } from "./hmm-idn";
import { GATILHO_TABOCAL_M, projetaCruzamentoTabocal } from "./recessao-itacoatiara";
import { cmrDeItacoatiara, deficitCalado, scoreCMR } from "./cmr-itacoatiara";
import type { ResultadoOndaBranco } from "./onda-branco";
import { COR_FAIXA, type FaixaIRC } from "./irc";

// Reexport para uso por componentes client (evita import direto de lib/irc.ts)
export const COR_FAIXA_TABOCAL = COR_FAIXA;

// ─── Pesos (somam 1.0) — CALIBRADOS RIGOROSAMENTE ───────────────────────────
//
// Calibração em scripts/calibra-rigorosa-irc-tabocal.mjs:
//   - 21 eventos rotulados pela severidade do Tabocal (não Manaus)
//   - 4 estimadores: grid search, otimização contínua, ensemble, regularização
//   - Validação: LOO CV (ρ=0,91), Block CV temporal (ρ=0,81), AUC=1,00 perfeita
//   - Bootstrap n=500 (autocorrelação anual)
//   - Regularização: mistura 60/40 (otimizado/uniforme)
//
// Comparação:
//   Pesos iniciais (heurística): 50/15/10/10/15 → ρ não validado
//   Pesos calibrados (v3.1):     41/11/11/26/11 → ρ Spearman 0,90 in-sample, 0,91 LOO
//
// vs IRC-Manaus (v2.1): ρ=0,62. IRC-Tabocal v3.1 é dramaticamente melhor.
export const PESOS_IRC_TABOCAL = {
  calado_tabocal:  0.41,   // dominante — o que importa operacionalmente
  hmm_extremo:     0.11,
  onda_branco:     0.11,
  anomalia_pp:     0.26,   // segundo maior — sinal climático preditivo
  lag_operacional: 0.11,
} as const;

const HMM_DOMINIO_MIN = -0.9;
const HMM_DOMINIO_MAX = +0.9;
const PROB_EXTREMO_INCONDICIONAL = 0.67;

export interface ComponentesIRCTabocal {
  calado_tabocal:   number;
  hmm_extremo:      number;
  onda_branco:      number;
  anomalia_pp:      number;
  lag_operacional:  number;
}

export interface ResultadoIRCTabocal {
  irc:              number;
  faixa:            FaixaIRC;
  versao:           string;
  componentes:      ComponentesIRCTabocal;
  pesos_efetivos:   ComponentesIRCTabocal;
  componentes_ausentes: string[];
  detalhes: {
    cota_itacoatiara_m:       number;
    cota_manaus_m:            number;
    cmr_metros:               number;          // v3.2: CMR oficial Capitania
    deficit_calado_m:         number;          // v3.2: déficit vs calado alvo (11m)
    calado_alvo_m:            number;          // v3.2: calado alvo de referência
    distancia_ao_gatilho_m:   number;          // cota − gatilho_tabocal (legado)
    eta_cruzamento_tabocal:   string | null;
    idn:                      number;
    prob_extremo_7d:          number;
    severidade_onda:          ResultadoOndaBranco["severidade"];
    var_onda_m:               number;
    anomalia_pp_normalizada:  number;
    lag_observado_cm:         number;
  };
}

// ─── Componente CALADO-TABOCAL (41%) ─────────────────────────────────────────
//
// v3.2 (24/mai/2026): substitui a abstração de "distância ao gatilho de cota"
// por DÉFICIT DE CALADO em metros, calculado a partir da curva oficial
// publicada pela Capitania dos Portos da Amazônia Ocidental (CMR — Calado
// Máximo Recomendado).
//
// Diferença prática:
//   v3.1: "cota Itacoatiara está -0,10m, distância para gatilho = 0"
//   v3.2: "CMR oficial = 5,72m, déficit vs calado alvo (11m) = 5,28m"
//
// Ganho:
//   - Mede em UNIDADE CITÁVEL EM CONTRATO (metros de lâmina d'água)
//   - Baseia-se em PUBLICAÇÃO REGULATÓRIA OFICIAL (não numa heurística)
//   - Conversível diretamente em toneladas de carga (~1.500 ton/m/balsa)
//
// Combina ATUAL (CMR computado da cota) + PROJETADO (CMR previsto via modelo
// de recessão de Itacoatiara). Retorna o maior dos dois.
export function componenteCaladoTabocal(
  cotaItacoatiara_m: number,
  eta_dias_cruzamento?: number | null,
  calado_alvo_m = 11.0,
): number {
  // Componente atual: score baseado no déficit CMR real
  const atual = scoreCMR(cotaItacoatiara_m, calado_alvo_m);

  // Componente projetado (cruzamento iminente do gatilho operacional)
  let projetado = 0;
  if (eta_dias_cruzamento != null && eta_dias_cruzamento >= 0) {
    if      (eta_dias_cruzamento <=  30) projetado = 95;
    else if (eta_dias_cruzamento <=  90) projetado = +(95 - ((eta_dias_cruzamento - 30) / 60) * 55).toFixed(1);
    else if (eta_dias_cruzamento <= 180) projetado = +(40 - ((eta_dias_cruzamento - 90) / 90) * 30).toFixed(1);
    else                                  projetado = +(10 - Math.min(10, (eta_dias_cruzamento - 180) / 30)).toFixed(1);
  }

  return Math.max(atual, projetado);
}

// ─── Componente HMM extremo (15%) — mesmo cálculo do IRC-Manaus ─────────────
export function componenteHMMExtremoTabocal(idn: number): number {
  const idn_clamp = Math.max(HMM_DOMINIO_MIN, Math.min(HMM_DOMINIO_MAX, idn));
  const estado = estadoHMM(idn_clamp);
  const t7 = CALIBRACAO_HMM.matriz_transicao_7d[estado.indice];
  const probExtremoCondicional = t7[0] + t7[2];
  const anomalia = probExtremoCondicional - PROB_EXTREMO_INCONDICIONAL;
  const score = 50 + (anomalia / 0.3) * 50;
  return +Math.max(0, Math.min(100, score)).toFixed(1);
}

// ─── Componente LAG OPERACIONAL (15%) — NOVO ────────────────────────────────
//
// Mede a divergência ATUAL entre Manaus e Itacoatiara em relação à
// climatologia. Quando Manaus está "OK" mas Itacoatiara está abaixo do
// esperado pela relação histórica, isso é EXATAMENTE o sinal regulatório
// que a tese do IBI defende.
//
// Cálculo:
//   delta_observado = cota_Manaus - cota_Itacoatiara   (em metros)
//   delta_esperado_climatologia = ~13m (mediana histórica de jun-out)
//   anomalia_lag = delta_esperado - delta_observado    (m)
//
//   anomalia_lag > 2m → Itacoatiara MAIS BAIXO que o esperado para a cota de
//                       Manaus → defasagem ativa → componente alto
//   anomalia_lag < -2m → Itacoatiara MAIS ALTO → sinal positivo
//
// Escala: anomalia 0m → 30; anomalia +3m → 100; anomalia −3m → 0
export function componenteLagOperacional(
  cotaManaus_m: number,
  cotaItacoatiara_m: number,
  deltaEsperado_m = 13.0,
): number {
  const deltaObservado = cotaManaus_m - cotaItacoatiara_m;
  // anomalia > 0 → Itacoatiara MAIS BAIXO que o esperado (defasagem ativa)
  // anomalia < 0 → Itacoatiara MAIS ALTO que o esperado (sistema sincronizado)
  const anomalia = deltaObservado - deltaEsperado_m;
  // Mapeamento: anomalia +3m → 100; 0 → 30; -3m → 0
  const score = 30 + (anomalia / 3) * 70;
  return +Math.max(0, Math.min(100, score)).toFixed(1);
}

// ─── Onda Branco e Anomalia PP — herdados do IRC-Manaus ──────────────────────
function componenteOndaBrancoSeveridade(sev: ResultadoOndaBranco["severidade"]): number {
  const mapa = { nenhuma: 0, moderada: 30, alta: 65, extrema: 100 };
  return mapa[sev] ?? 0;
}
function componenteAnomaliaPP(cat = 0): number {
  return +(Math.min(3, Math.abs(cat)) / 3 * 100).toFixed(1);
}

// ─── Faixa ────────────────────────────────────────────────────────────────────
function faixaIRC(irc: number): FaixaIRC {
  if (irc < 25)  return "verde";
  if (irc < 50)  return "amarelo";
  if (irc < 75)  return "laranja";
  return "vermelho";
}

// ─── Snapshot e cálculo ──────────────────────────────────────────────────────
export interface SnapshotIRCTabocal {
  cotaItacoatiara_m:        number;        // CENTRAL — substitui cota Manaus
  cotaManaus_m:             number;        // só para componente lag operacional
  idn:                      number;
  severidade_onda:          ResultadoOndaBranco["severidade"];
  severidade_onda_continua?: number;
  var_onda_m:               number;
  anomalia_pp?:             number;
  eta_dias_cruzamento_tabocal?: number | null;
  // v3.3 — calado alvo PARAMETRIZÁVEL pelo usuário (default 11m, comboio cheio)
  // Cada cliente cadastra o calado-alvo da sua operação. IRC se ajusta.
  calado_alvo_m?:           number;
}

export function calculaIRCTabocal(snap: SnapshotIRCTabocal): ResultadoIRCTabocal {
  const caladoAlvo = snap.calado_alvo_m ?? 11.0;
  const c_calado = componenteCaladoTabocal(snap.cotaItacoatiara_m, snap.eta_dias_cruzamento_tabocal, caladoAlvo);
  const c_hmm    = componenteHMMExtremoTabocal(snap.idn);
  const c_onda   = snap.severidade_onda_continua != null
    ? snap.severidade_onda_continua
    : componenteOndaBrancoSeveridade(snap.severidade_onda);
  const c_pp     = snap.anomalia_pp != null ? componenteAnomaliaPP(snap.anomalia_pp) : null;
  const c_lag    = componenteLagOperacional(snap.cotaManaus_m, snap.cotaItacoatiara_m);

  // Renormalização quando anomalia_pp ausente
  const ausentes: string[] = [];
  let p_calado: number = PESOS_IRC_TABOCAL.calado_tabocal;
  let p_hmm:    number = PESOS_IRC_TABOCAL.hmm_extremo;
  let p_onda:   number = PESOS_IRC_TABOCAL.onda_branco;
  let p_pp:     number = PESOS_IRC_TABOCAL.anomalia_pp;
  let p_lag:    number = PESOS_IRC_TABOCAL.lag_operacional;

  if (c_pp == null) {
    ausentes.push("anomalia_pp");
    const fator = 1 / (1 - PESOS_IRC_TABOCAL.anomalia_pp);
    p_calado *= fator;
    p_hmm    *= fator;
    p_onda   *= fator;
    p_lag    *= fator;
    p_pp      = 0;
  }

  const irc = +(
    p_calado * c_calado +
    p_hmm    * c_hmm    +
    p_onda   * c_onda   +
    p_pp     * (c_pp ?? 0) +
    p_lag    * c_lag
  ).toFixed(1);

  const irc_clamp = Math.max(0, Math.min(100, irc));

  const deltaObservado = snap.cotaManaus_m - snap.cotaItacoatiara_m;

  return {
    irc:    irc_clamp,
    faixa:  faixaIRC(irc_clamp),
    versao: IRC_TABOCAL_VERSAO,
    componentes: {
      calado_tabocal:  c_calado,
      hmm_extremo:     c_hmm,
      onda_branco:     c_onda,
      anomalia_pp:     c_pp ?? 0,
      lag_operacional: c_lag,
    },
    pesos_efetivos: {
      calado_tabocal:  +p_calado.toFixed(3),
      hmm_extremo:     +p_hmm.toFixed(3),
      onda_branco:     +p_onda.toFixed(3),
      anomalia_pp:     +p_pp.toFixed(3),
      lag_operacional: +p_lag.toFixed(3),
    },
    componentes_ausentes: ausentes,
    detalhes: {
      cota_itacoatiara_m:       snap.cotaItacoatiara_m,
      cota_manaus_m:            snap.cotaManaus_m,
      cmr_metros:               cmrDeItacoatiara(snap.cotaItacoatiara_m),
      deficit_calado_m:         deficitCalado(snap.cotaItacoatiara_m, caladoAlvo),
      calado_alvo_m:            caladoAlvo,
      distancia_ao_gatilho_m:   +(snap.cotaItacoatiara_m - GATILHO_TABOCAL_M).toFixed(2),
      eta_cruzamento_tabocal:   null,
      idn:                      snap.idn,
      prob_extremo_7d:          +(c_hmm / 100).toFixed(3),
      severidade_onda:          snap.severidade_onda,
      var_onda_m:               snap.var_onda_m,
      anomalia_pp_normalizada:  c_pp != null ? +(c_pp / 100).toFixed(2) : 0,
      lag_observado_cm:         Math.round(deltaObservado * 100),
    },
  };
}

// ─── Helper: divergência entre IRC-Manaus e IRC-Tabocal ──────────────────────
//
// O "sinal regulatório" central da tese: quando IRC-Tabocal > IRC-Manaus por
// margem significativa, o parâmetro ANTAQ está subestimando o risco real.
export interface DivergenciaIRC {
  irc_manaus:    number;     // do lib/irc.ts (v2.1)
  irc_tabocal:   number;     // deste módulo (v3)
  diferenca:     number;     // tabocal − manaus
  sinal_regulatorio: "alinhado" | "subestimacao_leve" | "subestimacao_alta" | "subestimacao_critica";
  interpretacao: string;
}

export function divergenciaIRC(ircManaus: number, ircTabocal: number): DivergenciaIRC {
  const diff = ircTabocal - ircManaus;
  let sinal: DivergenciaIRC["sinal_regulatorio"];
  let interp: string;
  if (Math.abs(diff) < 10) {
    sinal = "alinhado";
    interp = "Parâmetro ANTAQ alinhado com a realidade operacional. Sem divergência relevante.";
  } else if (diff >= 10 && diff < 25) {
    sinal = "subestimacao_leve";
    interp = "O parâmetro regulatório (Manaus 17,7m) está subestimando o risco operacional real em Itacoatiara/Tabocal.";
  } else if (diff >= 25 && diff < 40) {
    sinal = "subestimacao_alta";
    interp = "Subestimação ALTA — ANTAQ sinaliza condição que não reflete a restrição operacional iminente no Tabocal.";
  } else if (diff >= 40) {
    sinal = "subestimacao_critica";
    interp = "Subestimação CRÍTICA — falha regulatória em curso. Manaus aparenta normalidade enquanto Itacoatiara/Tabocal já opera com restrição severa.";
  } else {
    // diff < -10: IRC-Manaus > IRC-Tabocal (situação rara)
    sinal = "alinhado";
    interp = "Manaus sinaliza pior que Itacoatiara — situação atípica, geralmente em recuperação pós-estiagem.";
  }
  return { irc_manaus: ircManaus, irc_tabocal: ircTabocal, diferenca: +diff.toFixed(1), sinal_regulatorio: sinal, interpretacao: interp };
}
