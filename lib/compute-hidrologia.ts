// Computa os dados do card Monitor de Hidrologia para a home page.
//
// Fontes de dados:
//   • Cota ITA: série HidroWeb (ITACOATIARA_HISTORICO_DIARIO), lag ~14 dias.
//     Para tempo real, substituir por: buscaCotaANA(ESTACOES.Itacoatiara, hoje, hoje)
//   • Modelo: projetaETAporAnalogos — mesma engine do /monitor (analogos 2016–2025)
//   • IRC: calculaIRCTabocal v3.6 (onda + pp renormalizados quando ausentes)

import { ITACOATIARA_HISTORICO_DIARIO } from "./itacoatiara-historico-diario";
import { cmrDeItacoatiara, CMR_OBSERVADO } from "./cmr-itacoatiara";
import { projetaETAporAnalogos, type PontoSerie } from "./recessao-analogos";
import {
  CURICURIARI_2026,
  HUMAITA_2026,
  DADOS_ATUAIS,
} from "./dados-historicos";
import { calculaIDNFallback } from "./calcula-idn";
import { calculaIRCTabocal } from "./irc-tabocal";

export interface HidrologiaDashboard {
  cotaItaAtual_m:    number;       // última cota HidroWeb disponível
  dataUltimaLeitura: string;       // YYYY-MM-DD
  cmrAtual_m:        number;       // CMR oficial (curva isotônica Capitania)
  cmrExtrapolado:    boolean;      // true quando ITA > topo do dataset observado
  diasParaLimiar:    number;       // Análogos P50 — ETA para CMR < 11 m
  dataLimiar:        string | null;// data ISO do P50 (ex: "2026-10-13")
  janelaIC80:        string;       // e.g. "18 set – 13 out 2026"
  irc:               number;       // IRC-Tabocal v3.6
  ircFaixa:          string;       // "verde" | "amarelo" | "laranja" | "vermelho"
  probCruzamento:    number;       // 0–1 — probabilidade de CMR cruzar 11 m
  insight:           string;       // HTML para o card
}

export function computeHidrologiaDashboard(): HidrologiaDashboard {
  // ── 1. Cota mais recente de Itacoatiara (HidroWeb/ANA) ──────────────────
  const s2026 = (
    ITACOATIARA_HISTORICO_DIARIO as unknown as Record<string, Record<string, number>>
  )["2026"];
  const datas       = Object.keys(s2026).sort();
  const dataRecente = datas[datas.length - 1];
  const cotaIta     = s2026[dataRecente];

  // ── 2. CMR atual (Calado Máximo Recomendado — curva isotônica Capitania) ─
  const cmrAtual = cmrDeItacoatiara(cotaIta);

  // ── 3. Análogos históricos: ETA para CMR < 11 m ─────────────────────────
  const serieAtual: PontoSerie[] = datas.map((d) => ({ data: d, cota: s2026[d] }));
  const analogos = projetaETAporAnalogos(serieAtual, 11.0);

  // ── 4. IDN — fallback anual (SGC + Humaitá, últimas entradas disponíveis) ─
  const sgcCm     = lastValue(CURICURIARI_2026) ?? 550;
  const humaitaCm = lastValue(HUMAITA_2026) ?? 1411;
  const idn       = calculaIDNFallback(sgcCm / 100, humaitaCm / 100);

  // ── 5. IRC-Tabocal v3.6 ──────────────────────────────────────────────────
  const ircResult = calculaIRCTabocal({
    cotaItacoatiara_m:           cotaIta,
    cotaManaus_m:                DADOS_ATUAIS.Manaus.cota_m,
    idn,
    severidade_onda:             "nenhuma",
    var_onda_m:                  0,
    eta_dias_cruzamento_tabocal: analogos.dias_p50,
    calado_alvo_m:               11.0,
  });

  // ── 6. Montagem do insight ───────────────────────────────────────────────
  const cmrFmt  = cmrAtual.toFixed(1).replace(".", ",");
  const cotaFmt = cotaIta.toFixed(2).replace(".", ",");
  const dataFmt = formatarDataCurta(dataRecente);
  const probPct = Math.round(analogos.prob_cruzamento * 100);
  const janelaIC80 = formatarJanela(analogos.data_p10, analogos.data_p90);

  // CMR extrapolado? ITA acima do topo do dataset observado da Capitania (7,90 m)
  const cmrExtrapolado = cotaIta > CMR_OBSERVADO.ita_max;
  const calado_alvo = 11.0;
  const margem = cmrAtual - calado_alvo;

  // Status dinâmico baseado na margem real
  const statusCmr = cmrAtual < calado_alvo
    ? `<b>restrições ativas</b> — CMR abaixo de ${calado_alvo} m`
    : margem < 1.5
    ? `margem operacional estreita (${margem.toFixed(1).replace(".", ",")} m acima do limiar)`
    : `sem restrições operacionais`;

  const insight =
    `Nível de Itacoatiara: <b>${cotaFmt} m</b> (HidroWeb · ${dataFmt}). ` +
    `Calado ${cmrExtrapolado ? "estimado" : "disponível"}: <b>~${cmrFmt} m</b>` +
    (cmrExtrapolado ? ` (extrapolação — ITA acima do dataset da Capitania)` : ``) +
    ` — ${statusCmr}. ` +
    `Modelo por análogos projeta CMR < <b>${calado_alvo} m</b> em <b>~${analogos.dias_p50 ?? "?"} dias</b> ` +
    `(IC80: ${janelaIC80}), probabilidade de cruzamento: ${probPct}%.`;

  return {
    cotaItaAtual_m:    cotaIta,
    dataUltimaLeitura: dataRecente,
    cmrAtual_m:        +cmrAtual.toFixed(1),
    cmrExtrapolado,
    diasParaLimiar:    analogos.dias_p50 ?? 0,
    dataLimiar:        analogos.data_p50,
    janelaIC80,
    irc:               Math.round(ircResult.irc),
    ircFaixa:          ircResult.faixa,
    probCruzamento:    analogos.prob_cruzamento,
    insight,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function lastValue(obj: Record<string, number>): number | undefined {
  const keys = Object.keys(obj).sort();
  const last  = keys[keys.length - 1];
  return last !== undefined ? obj[last] : undefined;
}

function formatarDataCurta(isoDate: string): string {
  const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const [, m, d] = isoDate.split("-");
  return `${parseInt(d)}/${MESES[parseInt(m) - 1]}`;
}

function formatarJanela(p10: string | null, p90: string | null): string {
  if (!p10 || !p90) return "indeterminado";
  const M = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const parse = (iso: string) => {
    const [ano, m, d] = iso.split("-");
    return { ano, mes: parseInt(m), dia: parseInt(d) };
  };
  const a = parse(p10), b = parse(p90);
  const fmt = (x: typeof a) => `${x.dia} ${M[x.mes - 1]}`;
  if (a.mes === b.mes && a.ano === b.ano) return `${a.dia}–${b.dia} ${M[a.mes - 1]} ${a.ano}`;
  if (a.ano === b.ano)                    return `${fmt(a)} – ${fmt(b)} ${a.ano}`;
  return `${fmt(a)} ${a.ano} – ${fmt(b)} ${b.ano}`;
}
