// Computa os dados do card Monitor de Hidrologia para a home page.
//
// Fontes de dados:
//   • Calado: número OFICIAL da Capitania (CFAOC), public/data/calado-capitania.json
//     (scripts/gera-calado-capitania.py). Sem modelo cota→calado e sem projeção.
//   • IRC: calculaIRCTabocal v3.6 (inalterado — ainda usa cota ITA + análogos)

import { ITACOATIARA_HISTORICO_DIARIO } from "./itacoatiara-historico-diario";
import { projetaETAporAnalogos, type PontoSerie } from "./recessao-analogos";
import {
  CURICURIARI_2026,
  HUMAITA_2026,
  DADOS_ATUAIS,
} from "./dados-historicos";
import { calculaIDNFallback } from "./calcula-idn";
import { calculaIRCTabocal } from "./irc-tabocal";
import caladoCapitania from "@/public/data/calado-capitania.json";

export interface HidrologiaDashboard {
  caladoOficial_m:   number;       // CMR demais cargas — Capitania (CFAOC)
  caladoPetroleo_m:  number;       // CMR petróleo e gás — Capitania (CFAOC)
  dataBoletim:       string;       // YYYY-MM-DD do último dia publicado
  variacao24h_m:     number | null;
  previsaoCapitania: { data: string; demais: number } | null; // último dia previsto pela Capitania
  irc:               number;       // IRC-Tabocal v3.6
  ircFaixa:          string;       // "verde" | "amarelo" | "laranja" | "vermelho"
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

  // ── 2. Análogos: só alimentam o IRC (não são exibidos no card) ───────────
  const serieAtual: PontoSerie[] = datas.map((d) => ({ data: d, cota: s2026[d] }));
  const analogos = projetaETAporAnalogos(serieAtual, 11.0);

  // ── 3. IDN — fallback anual (SGC + Humaitá, últimas entradas disponíveis) ─
  const sgcCm     = lastValue(CURICURIARI_2026) ?? 550;
  const humaitaCm = lastValue(HUMAITA_2026) ?? 1411;
  const idn       = calculaIDNFallback(sgcCm / 100, humaitaCm / 100);

  // ── 4. IRC-Tabocal v3.6 ──────────────────────────────────────────────────
  const ircResult = calculaIRCTabocal({
    cotaItacoatiara_m:           cotaIta,
    cotaManaus_m:                DADOS_ATUAIS.Manaus.cota_m,
    idn,
    severidade_onda:             "nenhuma",
    var_onda_m:                  0,
    eta_dias_cruzamento_tabocal: analogos.dias_p50,
    calado_alvo_m:               11.0,
  });

  // ── 5. Calado oficial da Capitania + insight ─────────────────────────────
  const u = caladoCapitania.ultimo;
  const prev = caladoCapitania.previsao_capitania.at(-1) ?? null;
  const calado_alvo = 11.0;
  const m = (v: number) => v.toFixed(2).replace(".", ",");

  const status = u.demais < calado_alvo
    ? `<b>abaixo de ${calado_alvo} m</b> — navios maiores já operam com restrição de carga`
    : `acima de ${calado_alvo} m`;
  const ritmo = u.variacao_24h_m != null
    ? ` Variação em 24h: <b>${u.variacao_24h_m > 0 ? "+" : ""}${m(u.variacao_24h_m)} m</b>.`
    : "";
  const previsao = prev
    ? ` A Capitania prevê <b>${m(prev.demais)} m</b> em ${formatarDataCurta(prev.data)}.`
    : "";

  const insight =
    `Calado oficial em Itacoatiara/Tabocal (Capitania, ${formatarDataCurta(u.data)}): ` +
    `<b>${m(u.demais)} m</b> para demais cargas, ${status}.` + ritmo + previsao;

  return {
    caladoOficial_m:   u.demais,
    caladoPetroleo_m:  u.petroleo,
    dataBoletim:       u.data,
    variacao24h_m:     u.variacao_24h_m,
    previsaoCapitania: prev ? { data: prev.data, demais: prev.demais } : null,
    irc:               Math.round(ircResult.irc),
    ircFaixa:          ircResult.faixa,
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
