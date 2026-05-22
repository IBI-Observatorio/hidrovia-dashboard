// Calendário LWS 2026 — projeta a recessão pós-pico de Manaus e identifica
// a data esperada (com banda IC80) de cruzamento do gatilho regulatório
// LWS/ANTAQ de 17,7m na descida.
//
// Diferença vs SeverityCalendarPanel:
//   - Calendar de Severidade é HISTÓRICO (passado, percentis observados)
//   - Calendário LWS é FORWARD (projeção 2026 com IC, baseado em modelo próprio)
//
// Dados de entrada:
//   - Previsão de pico do SGB (cota + data) — via fetchPrevisao2026
//   - Modelo de recessão calibrado em scripts/calibra-recessao.mjs
//
// Saída para o componente:
//   - Lista de dias (jun-dez/2026) com cota central + faixa IC80
//   - Datas marcantes (cruzamentos do gatilho 17,7m)
//   - Distância em dias entre pico e cruzamento

import { projetaRecessao, type PontoRecessao } from "./recessao-modelo";
import type { Previsao2026 } from "./fetch-dados";

const GATILHO_LWS_M = 17.70;        // Manaus — parâmetro ANTAQ
const HORIZONTE_DIAS = 220;          // ~7 meses pós-pico cobre até janeiro do próximo ano

// Heurística: data do pico esperada. O SGB dá a COTA prevista mas não a data
// (ela aparece nos gráficos de cotagrama). Usamos como aproximação o "centro"
// estatístico — 73% dos picos históricos ocorrem em junho. Default 15/jun.
const DATA_PICO_DEFAULT = "06-15";   // "MM-DD" — sobrescrito quando temos data real

export interface DiaCalendarioLWS {
  data:            string;     // YYYY-MM-DD
  mes:             number;     // 1..12
  dia:             number;     // 1..31
  t_dias:          number;     // dias desde o pico
  cota_central:    number;
  cota_ic80_min:   number;
  cota_ic80_max:   number;
  banda_central:   "azul" | "verde" | "amarela" | "vermelha";  // faixa visual
  cruzou_central:  boolean;    // dia em que cota_central cai abaixo do gatilho
  pico:            boolean;
}

export interface CalendarioLWS {
  ano:                       number;
  pico_cota_m:               number;
  pico_data:                 string;
  gatilho_m:                 number;
  dias:                      DiaCalendarioLWS[];
  data_cruzamento_central:   string | null;
  data_cruzamento_otimista:  string | null;   // descida mais lenta
  data_cruzamento_pessimista: string | null;  // descida mais rápida
  dias_acima_gatilho:        number;          // central
  fonte_pico:                string;          // herdada do Previsao2026
  fonte_pico_dinamica:       boolean;
}

function classificaBanda(cota_m: number): DiaCalendarioLWS["banda_central"] {
  // P10-P90 do histórico Manaus: 17.38 (P10) / 28.50 (P90). Gatilho 17.7m.
  if (cota_m >= 25.0)        return "azul";       // bem acima da mediana
  if (cota_m >= 20.0)        return "verde";      // faixa normal
  if (cota_m >= GATILHO_LWS_M) return "amarela";  // atenção (P10 + zona de gatilho)
  return "vermelha";                              // abaixo do gatilho LWS
}

/**
 * Gera o Calendário LWS 2026 a partir da previsão de pico do SGB.
 * Se previsao.parintins_pico não vier (fallback), usa heurística "MM-DD".
 */
export function geraCalendarioLWS(previsao: Previsao2026, ano = 2026): CalendarioLWS {
  // Data do pico: por enquanto fixa em 15/jun do ano corrente.
  // (TODO: extrair do PDF SGB quando aparecer "pico previsto para [data]")
  const picoData = `${ano}-${DATA_PICO_DEFAULT}`;
  const picoCota = previsao.manaus_pico_cheia.media;

  const resultado = projetaRecessao(picoCota, picoData, HORIZONTE_DIAS, GATILHO_LWS_M);

  const dias: DiaCalendarioLWS[] = resultado.pontos.map((p: PontoRecessao) => {
    const d = new Date(p.data + "T00:00:00Z");
    return {
      data:            p.data,
      mes:             d.getUTCMonth() + 1,
      dia:             d.getUTCDate(),
      t_dias:          p.t_dias,
      cota_central:    p.cota_central,
      cota_ic80_min:   p.cota_ic80_min,
      cota_ic80_max:   p.cota_ic80_max,
      banda_central:   classificaBanda(p.cota_central),
      cruzou_central:  p.data === resultado.data_cruzamento_central,
      pico:            p.t_dias === 0,
    };
  });

  const dias_acima_gatilho = dias.filter((d) => d.cota_central >= GATILHO_LWS_M).length;

  return {
    ano,
    pico_cota_m:               picoCota,
    pico_data:                 picoData,
    gatilho_m:                 GATILHO_LWS_M,
    dias,
    data_cruzamento_central:    resultado.data_cruzamento_central,
    data_cruzamento_otimista:   resultado.data_cruzamento_min,
    data_cruzamento_pessimista: resultado.data_cruzamento_max,
    dias_acima_gatilho,
    fonte_pico:                previsao.fonte,
    fonte_pico_dinamica:       previsao.fonte_dinamica,
  };
}

/**
 * Agrupa os dias por mês para layout de calendário visual.
 */
export function diasPorMes(calendario: CalendarioLWS): Map<number, DiaCalendarioLWS[]> {
  const out = new Map<number, DiaCalendarioLWS[]>();
  for (const d of calendario.dias) {
    if (!out.has(d.mes)) out.set(d.mes, []);
    out.get(d.mes)!.push(d);
  }
  return out;
}

/** Formata data ISO como "DD/MMM" em PT-BR (ex: "02/nov"). */
export function formataDataCurta(iso: string | null): string {
  if (!iso) return "—";
  const [, mes, dia] = iso.split("-");
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${dia}/${meses[parseInt(mes, 10) - 1] ?? "?"}`;
}
