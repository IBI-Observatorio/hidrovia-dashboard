// AUTO-GERADO por scripts/calibra-conversao-economica.mjs em 2026-05-22T15:55:51.065Z
// SEED: 42 · GIT: b77f6a4 (dirty)
//
// Camada de conversão IRC → anomalia % de tonelagem esperada (gap #1 completo).
// Regressão polinomial grau 2 calibrada em 112 eventos rotulados contra dados
// ANTAQ. R² = 0.099.
//
// Uso operacional:
//   import { caladoEconomico } from "./conversao-economica";
//   const r = caladoEconomico(IRC=65, volume_ton_mes=250_000, frete_R$ton=180);
//   // → { anomalia_pct: +18.5, ton_em_risco: 46_250, R$_em_risco: 8.3M, IC80: [...] }

export interface CurvaPontoConversao {
  irc: number;
  anomalia_pct_central: number;
  anomalia_pct_p10: number;
  anomalia_pct_p90: number;
}

export const CURVA_CONVERSAO_IRC_ANOMALIA: CurvaPontoConversao[] = [
  {
    "irc": 0,
    "anomalia_pct_central": -0.87,
    "anomalia_pct_p10": -7.33,
    "anomalia_pct_p90": 5.58
  },
  {
    "irc": 10,
    "anomalia_pct_central": -1.21,
    "anomalia_pct_p10": -4.36,
    "anomalia_pct_p90": 2.13
  },
  {
    "irc": 20,
    "anomalia_pct_central": -0.33,
    "anomalia_pct_p10": -1.58,
    "anomalia_pct_p90": 1.12
  },
  {
    "irc": 30,
    "anomalia_pct_central": 1.78,
    "anomalia_pct_p10": 0.08,
    "anomalia_pct_p90": 3.5
  },
  {
    "irc": 40,
    "anomalia_pct_central": 5.12,
    "anomalia_pct_p10": 2.52,
    "anomalia_pct_p90": 7.35
  },
  {
    "irc": 50,
    "anomalia_pct_central": 9.67,
    "anomalia_pct_p10": 5.79,
    "anomalia_pct_p90": 12.7
  },
  {
    "irc": 60,
    "anomalia_pct_central": 15.45,
    "anomalia_pct_p10": 8.52,
    "anomalia_pct_p90": 19.84
  },
  {
    "irc": 70,
    "anomalia_pct_central": 22.46,
    "anomalia_pct_p10": 11.39,
    "anomalia_pct_p90": 28.72
  },
  {
    "irc": 80,
    "anomalia_pct_central": 30.69,
    "anomalia_pct_p10": 15.02,
    "anomalia_pct_p90": 40.65
  },
  {
    "irc": 90,
    "anomalia_pct_central": 40.15,
    "anomalia_pct_p10": 18.11,
    "anomalia_pct_p90": 55.34
  },
  {
    "irc": 100,
    "anomalia_pct_central": 50.83,
    "anomalia_pct_p10": 22.06,
    "anomalia_pct_p90": 72.46
  }
];

export const CONVERSAO_ECONOMICA_META = {
  metodologia:  "Polinomial grau 2 IRC → anomalia % vs tonelagem mensal esperada (ANTAQ 2010-2025, 4 portos)",
  coeficientes: { a0: -0.866440, a1: -0.095421, a2: 6.123974e-3 },
  r2:           0.0985,
  n_eventos:    112,
  n_bootstrap:  500,
  seed:         42,
  gerado_em:    "2026-05-22T15:55:51.067Z",
  git_sha:      "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:    true,
} as const;

/**
 * Converte IRC em estimativa de impacto econômico.
 *
 * @param irc                IRC atual (0-100)
 * @param volume_mensal_ton  Tonelagem mensal típica do operador
 * @param frete_R$_por_ton   Frete médio em R$/ton (default 180)
 */
export function caladoEconomico(
  irc: number,
  volume_mensal_ton: number,
  frete_R$_por_ton = 180,
) {
  const { a0, a1, a2 } = CONVERSAO_ECONOMICA_META.coeficientes;
  const anomalia = a0 + a1 * irc + a2 * irc * irc;  // %
  // Interpola IC80 da tabela
  const curva = CURVA_CONVERSAO_IRC_ANOMALIA;
  let lo = 0, hi = curva.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (curva[m].irc <= irc) lo = m; else hi = m;
  }
  const t = (irc - curva[lo].irc) / (curva[hi].irc - curva[lo].irc || 1);
  const p10 = curva[lo].anomalia_pct_p10 + t * (curva[hi].anomalia_pct_p10 - curva[lo].anomalia_pct_p10);
  const p90 = curva[lo].anomalia_pct_p90 + t * (curva[hi].anomalia_pct_p90 - curva[lo].anomalia_pct_p90);

  const ton_em_risco_central = +(volume_mensal_ton * Math.max(0, anomalia) / 100).toFixed(0);
  const ton_em_risco_p10     = +(volume_mensal_ton * Math.max(0, p10) / 100).toFixed(0);
  const ton_em_risco_p90     = +(volume_mensal_ton * Math.max(0, p90) / 100).toFixed(0);

  return {
    irc,
    anomalia_pct_central: +anomalia.toFixed(2),
    anomalia_pct_p10:     +p10.toFixed(2),
    anomalia_pct_p90:     +p90.toFixed(2),
    ton_em_risco_central,
    ton_em_risco_p10,
    ton_em_risco_p90,
    valor_em_risco_R$:    Math.round(ton_em_risco_central * frete_R$_por_ton),
    valor_p10_R$:         Math.round(ton_em_risco_p10 * frete_R$_por_ton),
    valor_p90_R$:         Math.round(ton_em_risco_p90 * frete_R$_por_ton),
  };
}
