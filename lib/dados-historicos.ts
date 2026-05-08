// Dados hardcoded para o MVP do Sprint 1

// ---------------------------------------------------------------------------
// Curicuriari (Negro alto) — cotas em cm
// ---------------------------------------------------------------------------
export const CURICURIARI_2026: Record<string, number> = {
  "2026-01-06": 640, "2026-01-16": 890, "2026-01-27": 960,
  "2026-02-03": 950, "2026-02-10": 908, "2026-02-18": 808,
  "2026-02-25": 855, "2026-03-03": 797, "2026-03-04": 777,
  "2026-03-17": 620, "2026-03-23": 772, "2026-04-30": 550,
};
export const CURICURIARI_2025: Record<string, number> = {
  "2025-01-27": 731,  "2025-02-17": 1037, "2025-02-18": 1031,
  "2025-02-25": 1039, "2025-03-03": 1028, "2025-03-04": 1011,
  "2025-03-23": 925,  "2025-05-20": 1268,
};
export const CURICURIARI_2024: Record<string, number> = {
  "2024-02-20": 832,  "2024-02-21": 827,
  "2024-04-10": 996,  "2024-04-11": 1005, "2024-07-01": 1122,
};

// ---------------------------------------------------------------------------
// Humaitá (Madeira) — cotas em cm
// ---------------------------------------------------------------------------
export const HUMAITA_2026: Record<string, number> = {
  "2026-01-16": 1967, "2026-01-27": 2058, "2026-02-03": 2141,
  "2026-02-04": 2149, "2026-02-10": 2166, "2026-02-18": 2086,
  "2026-02-26": 2145, "2026-03-03": 2166, "2026-03-17": 1398,
  "2026-03-23": 2211, "2026-05-06": 1411,
};

// ---------------------------------------------------------------------------
// Manaus set-dez/2024 — cota em metros (lag timeline)
// ---------------------------------------------------------------------------
export const MANAUS_2024_ESTIAGEM: Record<string, number> = {
  "2024-09-09": 17.73, "2024-09-10": 17.47,
  "2024-09-15": 16.25, "2024-09-20": 15.08,
  "2024-09-25": 14.11, "2024-10-01": 13.05,
  "2024-10-05": 12.53, "2024-10-09": 12.11,
  "2024-10-15": 12.16, "2024-10-20": 12.37,
  "2024-10-25": 12.46, "2024-10-31": 12.71,
  "2024-11-05": 12.18, "2024-11-10": 12.43,
  "2024-11-15": 13.28, "2024-12-27": 17.54,
  "2024-12-28": 17.71,
};

// Itacoatiara 2024 — mínimas conhecidas (em metros)
export const ITACOATIARA_2024_MINIMAS: Record<string, number> = {
  "2024-10-13": -0.11,
  "2024-10-31": -0.17,
};

// ---------------------------------------------------------------------------
// Achado analítico do lag 2024
// ---------------------------------------------------------------------------
export const LAG_2024 = {
  manaus_minima:                { data: "2024-10-09", cota_m: 12.11 },
  itacoatiara_minima:           { data: "2024-10-31", cota_cm: -17 },
  lag_dias:                     22,
  manaus_cruzou_17_7_descida:   { data: "2024-09-10", cota_m: 17.47 },
  manaus_cruzou_17_7_subida:    { data: "2024-12-28", cota_m: 17.71 },
  periodo_abaixo_17_7_dias:     109,
};

// ---------------------------------------------------------------------------
// Dessincronização 17/03/2026 — snapshot
// ---------------------------------------------------------------------------
export const DESSINCRONIZACAO_2024_VS_2026 = {
  data:  "17/03/2026",
  fonte: "SGB/CPRM — 11° Boletim SAH Amazonas",
  estacoes: [
    { nome: "SGC — Negro alto",       cota_2026:  620, cota_2024: 1547, delta: -927 },
    { nome: "Porto Velho — Madeira",  cota_2026: 1398, cota_2024:  719, delta: +679 },
    { nome: "Manaus",                 cota_2026: 2482, cota_2024: 1962, delta: +520 },
    { nome: "Itacoatiara",            cota_2026: 1137, cota_2024:  884, delta: +253 },
  ],
};

// ---------------------------------------------------------------------------
// Previsão 2026 (SGB 18° boletim, 05/05/2026)
// ---------------------------------------------------------------------------
export const PREVISAO_2026 = {
  fonte:               "SGB/CPRM — 18° Boletim SAH Amazonas (05/05/2026)",
  manaus_pico_cheia:   { media: 28.23, ic80_min: 27.69, ic80_max: 28.76, prob_27_5: 0.96 },
  manacapuru_pico:     19.16,
  itacoatiara_pico:    13.73,
  enso:                "El Niño emergindo — 61% prob mai–jul/2026 (CPC/NOAA, abr/2026)",
};

// ---------------------------------------------------------------------------
// Dados atuais simulados para o MVP (mai/2026)
// Fonte: última leitura disponível dos boletins SEMA/SGB
// ---------------------------------------------------------------------------
export interface DadosEstacao {
  nome:          string;
  rio:           string;
  cota_m:        number;
  variacao_24h:  number; // cm
  delta_2025:    number; // cm
  delta_2024:    number; // cm
  ultima_atualizacao: string;
}

export const DADOS_ATUAIS: Record<string, DadosEstacao> = {
  Manaus: {
    nome: "Manaus", rio: "Rio Negro",
    cota_m: 27.02, variacao_24h: -8, delta_2025: -48, delta_2024: +520,
    ultima_atualizacao: "2026-05-07",
  },
  Itacoatiara: {
    nome: "Itacoatiara", rio: "Rio Amazonas",
    cota_m: 11.37, variacao_24h: -12, delta_2025: -91, delta_2024: +253,
    ultima_atualizacao: "2026-05-07",
  },
  Curicuriari: {
    nome: "Curicuriari (SGC)", rio: "Negro alto",
    cota_m: 5.50, variacao_24h: -5, delta_2025: -718, delta_2024: -572,
    ultima_atualizacao: "2026-04-30",
  },
  Humaita: {
    nome: "Humaitá", rio: "Rio Madeira",
    cota_m: 14.11, variacao_24h: -22, delta_2025: +42, delta_2024: +679,
    ultima_atualizacao: "2026-05-06",
  },
  Manacapuru: {
    nome: "Manacapuru", rio: "Rio Solimões",
    cota_m: 19.16, variacao_24h: -5, delta_2025: -30, delta_2024: +380,
    ultima_atualizacao: "2026-05-07",
  },
  PortoVelho: {
    nome: "Porto Velho", rio: "Rio Madeira",
    cota_m: 13.98, variacao_24h: -18, delta_2025: +60, delta_2024: +679,
    ultima_atualizacao: "2026-05-06",
  },
  Borba: {
    nome: "Borba", rio: "Rio Madeira",
    cota_m: 12.11, variacao_24h: -15, delta_2025: +35, delta_2024: +420,
    ultima_atualizacao: "2026-05-06",
  },
};

// ---------------------------------------------------------------------------
// Série IDN histórica para o gráfico (calculada off-line)
// ---------------------------------------------------------------------------
export const IDN_HISTORICO: { data: string; idn: number; ano: number }[] = [
  // 2024 — driver Sul (Madeira mais depleted, Curicuriari normal)
  { data: "2024-07-01", idn:  0.05, ano: 2024 },
  { data: "2024-08-01", idn: -0.12, ano: 2024 },
  { data: "2024-09-01", idn: -0.28, ano: 2024 },
  { data: "2024-10-01", idn: -0.45, ano: 2024 },
  { data: "2024-10-31", idn: -0.52, ano: 2024 },
  { data: "2024-12-01", idn: -0.15, ano: 2024 },
  // 2025 — regime neutro
  { data: "2025-01-01", idn:  0.02, ano: 2025 },
  { data: "2025-03-01", idn:  0.08, ano: 2025 },
  { data: "2025-05-20", idn:  0.05, ano: 2025 },
  { data: "2025-07-01", idn: -0.04, ano: 2025 },
  { data: "2025-10-01", idn: -0.10, ano: 2025 },
  { data: "2025-12-01", idn:  0.03, ano: 2025 },
  // 2026 — driver Norte (Negro alto muito depletado)
  { data: "2026-01-06", idn:  0.18, ano: 2026 },
  { data: "2026-01-27", idn:  0.22, ano: 2026 },
  { data: "2026-02-10", idn:  0.28, ano: 2026 },
  { data: "2026-03-03", idn:  0.31, ano: 2026 },
  { data: "2026-03-17", idn:  0.52, ano: 2026 },
  { data: "2026-03-23", idn:  0.38, ano: 2026 },
  { data: "2026-04-30", idn:  0.61, ano: 2026 },
  { data: "2026-05-06", idn:  0.58, ano: 2026 },
];
