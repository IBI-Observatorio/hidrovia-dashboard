export type Estacao =
  | "Manaus"
  | "Itacoatiara"
  | "SGC"
  | "Humaita"
  | "Manacapuru"
  | "PortoVelho"
  | "Borba"
  | "Manicore"
  | "Labrea"
  | "Curicuriari";

export interface LimiarEstacao {
  p10: number;
  mediana: number;
  p90: number;
  gatilho_lws?: number;
  unidade: "m" | "cm";
  // Sprint Dados v1 (21/05/2026): metadata vinda de HidroInventarioEstacoes.
  // Estes campos são opcionais e podem ser preenchidos em tempo de build
  // (script) ou hidratados em runtime via `buscaInventarioPorChave`. Quando
  // disponíveis, habilitam: vazão específica (q = Q/area_drenagem_km2),
  // mapa geo-referenciado, e análise hipsométrica.
  area_drenagem_km2?: number;
  latitude?:          number;
  longitude?:         number;
  altitude_m?:        number;
}

// Sprint Dados v1 (21/05/2026): campos geo hidratados via scripts/hidrate-limiares.mjs
// Fonte: HidroInventarioEstacoes/v1 da API ANA (consultado 21/05/2026)
export const LIMIARES: Record<Estacao, LimiarEstacao> = {
  Manaus:      { p10: 17.38, mediana: 24.00, p90: 28.50, gatilho_lws: 17.70, unidade: "m", area_drenagem_km2:  712_000, latitude:  -3.1383, longitude: -60.0272 },
  Itacoatiara: { p10:  3.77, mediana:  9.00, p90: 13.00,                      unidade: "m", area_drenagem_km2: 4_350_000, latitude:  -3.1539, longitude: -58.4114 },
  SGC:         { p10:  7.96, mediana:  9.29, p90: 10.53,                      unidade: "m", area_drenagem_km2:  193_000, latitude:  -0.1367, longitude: -67.0856 }, // São Gabriel da Cachoeira (Negro alto)
  Humaita:     { p10: 11.68, mediana: 19.00, p90: 22.00,                      unidade: "m", area_drenagem_km2: 1_090_000, latitude:  -7.5028, longitude: -63.0183 },
  Manacapuru:  { p10: 10.15, mediana: 16.50, p90: 19.60,                      unidade: "m", area_drenagem_km2: 2_200_000, latitude:  -3.3106, longitude: -60.6094 },
  PortoVelho:  { p10:  7.00, mediana: 13.00, p90: 17.00,                      unidade: "m", area_drenagem_km2:  976_000, latitude:  -8.7483, longitude: -63.9169, altitude_m: 42.88 },
  Borba:       { p10:  5.00, mediana: 14.00, p90: 20.00,                      unidade: "m", area_drenagem_km2: 1_310_000, latitude:  -4.3892, longitude: -59.5986 },
  // P10/P50/P90 calibrados — série histórica HidroWeb 2016–2023 (n≈2922 obs cada)
  Manicore:    { p10: 12.60, mediana: 19.10, p90: 25.41,                      unidade: "m", area_drenagem_km2: 1_200_000, latitude:  -5.8219, longitude: -61.2983 },
  Labrea:      { p10:  4.83, mediana: 12.59, p90: 20.56,                      unidade: "m", area_drenagem_km2:   370_000, latitude:  -7.2578, longitude: -64.7997 },
  Curicuriari: { p10:  7.75, mediana: 10.37, p90: 13.66,                      unidade: "m", area_drenagem_km2:    28_000, latitude:  -0.1700, longitude: -66.8000 },
};

export const NOMES_DISPLAY: Record<Estacao, string> = {
  Manaus:      "Manaus",
  Itacoatiara: "Itacoatiara",
  SGC:         "São Gabriel da Cachoeira",
  Humaita:     "Humaitá",
  Manacapuru:  "Manacapuru",
  PortoVelho:  "Porto Velho",
  Borba:       "Borba",
  Manicore:    "Manicoré",
  Labrea:      "Lábrea",
  Curicuriari: "Curicuriari",
};

export const RIO_DISPLAY: Record<Estacao, string> = {
  Manaus:      "Rio Negro",
  Itacoatiara: "Rio Amazonas",
  SGC:         "Rio Negro (alto)",
  Humaita:     "Rio Madeira",
  Manacapuru:  "Rio Solimões",
  PortoVelho:  "Rio Madeira",
  Borba:       "Rio Madeira",
  Manicore:    "Rio Madeira",
  Labrea:      "Rio Purus",
  Curicuriari: "Rio Negro",
};

export function posicaoRelativa(cota_m: number, estacao: Estacao): number {
  const { p10, p90 } = LIMIARES[estacao];
  return Math.max(0, Math.min(1, (cota_m - p10) / (p90 - p10)));
}

// Versão sem clamp — preserva extremos para o IDN distinguir
// "abaixo do P10" de "colapso histórico inédito".
export function posicaoRelativaRaw(cota_m: number, estacao: Estacao): number {
  const { p10, p90 } = LIMIARES[estacao];
  return (cota_m - p10) / (p90 - p10);
}

export type Semaforo = "normal" | "atencao" | "critico";

export function semaforo(cota_m: number, estacao: Estacao): Semaforo {
  const { p10, gatilho_lws } = LIMIARES[estacao];
  if (gatilho_lws && cota_m < gatilho_lws) return "critico";
  if (cota_m < p10) return "critico";
  if (posicaoRelativa(cota_m, estacao) < 0.2) return "atencao";
  return "normal";
}
