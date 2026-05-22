// Modelo de recessão pós-pico de Manaus para projeção do ciclo 2026 forward.
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
//   t      = dias desde o pico
//   h_pico = cota no dia do pico (vem do forecast SGB)
//   k      = constante de recessão (calibrada de 2016-2023)
//   h_min  = assíntota (estimada pela média histórica + range)
//
// Calibração offline em scripts/calibra-recessao.mjs.
// O RMSE médio (~2.6m) é alto por usar exponencial pura em 184 dias, mas é
// suficiente para projetar a DATA de cruzamento de um gatilho específico
// (ex: 17,7m na descida) — que é o objetivo no Calendário LWS 2026.
//
// Banda IC80: cenários com k ± 1.28σ e h_min ± σ_h, propagados como mín/máx.

import { RECESSAO_CALIBRADA } from "./recessao-calibrada";

const Z80 = 1.2816;  // quantil de N(0,1) para 80% (banda ±1.28σ)

export interface PontoRecessao {
  data:           string;   // YYYY-MM-DD
  t_dias:         number;
  cota_central:   number;   // m
  cota_ic80_min:  number;   // m (cenário lento — descida mais devagar)
  cota_ic80_max:  number;   // m (cenário rápido — descida mais acelerada)
}

export interface ResultadoRecessao {
  pontos:                  PontoRecessao[];
  data_cruzamento_central: string | null;   // data que cota_central cruza gatilho
  data_cruzamento_min:     string | null;   // banda otimista (cruzamento tardio)
  data_cruzamento_max:     string | null;   // banda pessimista (cruzamento precoce)
  k_usado:                 number;
  h_min_usado:             number;
}

function diaMaisN(iso: string, n: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Projeta a recessão pós-pico de Manaus.
 *
 * @param picoCota_m  Cota do pico em metros (ex: 28.23 do SGB 18°)
 * @param picoData    Data do pico em ISO (ex: "2026-06-15")
 * @param horizonte   Dias a projetar (default 184 = ~6 meses)
 * @param gatilho_m   Cota gatilho para detecção de cruzamento (default 17.7 = LWS)
 */
export function projetaRecessao(
  picoCota_m: number,
  picoData: string,
  horizonte = 184,
  gatilho_m = 17.70,
): ResultadoRecessao {
  const { k_medio, k_sigma, h_min_medio, k_min, k_max } = RECESSAO_CALIBRADA;

  // Para IC80: cenário "rápido" usa k alto + h_min baixo; "lento" usa o oposto.
  // Sigma de h_min nos ajustes históricos (calculada a partir dos 8 anos)
  const h_mins = RECESSAO_CALIBRADA.ajustes_por_ano.map((a) => a.h_min);
  const mean = h_mins.reduce((a, b) => a + b, 0) / h_mins.length;
  const sigma = Math.sqrt(h_mins.reduce((a, b) => a + (b - mean) ** 2, 0) / h_mins.length);

  const k_rapido = Math.min(k_max, k_medio + Z80 * k_sigma);
  const k_lento  = Math.max(k_min, k_medio - Z80 * k_sigma);
  const hmin_baixo = mean - Z80 * sigma;  // cenário pessimista (mínima mais funda)
  const hmin_alto  = mean + Z80 * sigma;  // cenário otimista (mínima mais alta)

  const pontos: PontoRecessao[] = [];
  let cruz_central: string | null = null;
  let cruz_min:     string | null = null;   // banda lenta (h_max)
  let cruz_max:     string | null = null;   // banda rápida (h_min)

  for (let t = 0; t <= horizonte; t++) {
    const data = diaMaisN(picoData, t);

    const central = h_min_medio  + (picoCota_m - h_min_medio)  * Math.exp(-k_medio * t);
    const cota_alta = hmin_alto  + (picoCota_m - hmin_alto)    * Math.exp(-k_lento  * t);
    const cota_baixa = hmin_baixo + (picoCota_m - hmin_baixo)  * Math.exp(-k_rapido * t);

    pontos.push({
      data,
      t_dias:         t,
      cota_central:   +central.toFixed(2),
      cota_ic80_min:  +cota_baixa.toFixed(2),
      cota_ic80_max:  +cota_alta.toFixed(2),
    });

    // Detecta primeira data em que a curva cai ABAIXO do gatilho (descida)
    if (cruz_central == null && central < gatilho_m) cruz_central = data;
    if (cruz_min     == null && cota_alta < gatilho_m) cruz_min = data;   // tardio
    if (cruz_max     == null && cota_baixa < gatilho_m) cruz_max = data;  // precoce
  }

  return {
    pontos,
    data_cruzamento_central: cruz_central,
    data_cruzamento_min:     cruz_min,
    data_cruzamento_max:     cruz_max,
    k_usado:                 k_medio,
    h_min_usado:             h_min_medio,
  };
}

/**
 * Versão simplificada: só retorna a data central de cruzamento. Útil para
 * widgets que mostram só o número.
 */
export function projetaDataCruzamento17_7(
  picoCota_m: number,
  picoData: string,
): { central: string | null; min: string | null; max: string | null } {
  const r = projetaRecessao(picoCota_m, picoData, 250, 17.70);
  return {
    central: r.data_cruzamento_central,
    min:     r.data_cruzamento_min,
    max:     r.data_cruzamento_max,
  };
}
