// AUTO-GERADO por scripts/calibra-onda-branco-doy.mjs em 2026-05-21T22:40:05.572Z
// Percentis MENSAIS de variação 7d positiva em Caracaraí (Rio Branco) 2016-2025.
// P85 e P95 por mês [1..12]. Substitui limiares globais (que sobreestimavam
// risco em mai-jul, quando o ciclo natural é subida, e subestimavam em
// nov-jan quando subidas são raras e indicam evento atípico).

export const ONDA_BRANCO_PERCENTIS_MES = {
  // Variação 7d em metros — só positivos (subidas)
  p85: [null,0.93,0.78,1.24,1.46,2.18,1.64,1.36,1.07,1,1.14,1.95,1.12],
  p95: [null,1.29,1.32,1.85,2.97,3.16,2.06,1.8,1.53,1.33,1.37,2.12,1.52],
  // Globais (para fallback quando série mensal insuficiente)
  p85_global: 1.40,
  p95_global: 2.09,
} as const;
