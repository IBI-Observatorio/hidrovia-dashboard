// AUTO-GERADO por scripts/otimiza-pesos-irc.mjs em 2026-05-21T23:02:59.712Z
// Pesos do IRC otimizados por busca em grade contra 20 eventos
// rotulados (lib/eventos-rotulados.ts). Critério: maximizar Spearman(IRC, severidade).
//
// Comparação:
//   Pesos heurísticos v2: lws=0.40, hmm=0.25, onda=0.20, pp=0.15 → rho=0.538
//   Pesos otimizados v3:  lws=0.55, hmm=0.10, onda=0.05, pp=0.30 → rho=0.629
//
// Bootstrap n=200 IC80 dos pesos otimizados:
//   LWS:  0.20–0.50
//   HMM:  0.10–0.30
//   Onda: 0.05–0.35
//   PP:   0.25–0.35

export const PESOS_IRC_OTIMIZADOS = {
  lws:         0.55,
  hmm_extremo: 0.1,
  onda_branco: 0.05,
  anomalia_pp: 0.3,
} as const;

export const PESOS_IRC_BOOTSTRAP = {
  n_amostras:    200,
  rho_atual:     0.5383,
  rho_otimizado: 0.6286,
  ic80: {
    lws:         [0.2,  0.5],
    hmm_extremo: [0.1,  0.3],
    onda_branco: [0.05, 0.35],
    anomalia_pp: [0.25,   0.35],
  },
} as const;
