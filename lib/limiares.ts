export type Estacao =
  | "Manaus"
  | "Itacoatiara"
  | "Curicuriari"
  | "Humaita"
  | "Manacapuru"
  | "PortoVelho"
  | "Borba";

export interface LimiarEstacao {
  p10: number;
  mediana: number;
  p90: number;
  gatilho_lws?: number;
  unidade: "m" | "cm";
}

export const LIMIARES: Record<Estacao, LimiarEstacao> = {
  Manaus:      { p10: 17.38, mediana: 24.00, p90: 28.50, gatilho_lws: 17.70, unidade: "m" },
  Itacoatiara: { p10:  3.77, mediana:  9.00, p90: 13.00, unidade: "m" },
  Curicuriari: { p10:  7.96, mediana:  9.29, p90: 10.53, unidade: "m" }, // cm/100
  Humaita:     { p10: 11.68, mediana: 19.00, p90: 22.00, unidade: "m" },
  Manacapuru:  { p10: 10.15, mediana: 16.50, p90: 19.60, unidade: "m" },
  PortoVelho:  { p10:  7.00, mediana: 13.00, p90: 17.00, unidade: "m" },
  Borba:       { p10:  5.00, mediana: 14.00, p90: 20.00, unidade: "m" },
};

export const NOMES_DISPLAY: Record<Estacao, string> = {
  Manaus:      "Manaus",
  Itacoatiara: "Itacoatiara",
  Curicuriari: "Curicuriari (SGC)",
  Humaita:     "Humaitá",
  Manacapuru:  "Manacapuru",
  PortoVelho:  "Porto Velho",
  Borba:       "Borba",
};

export const RIO_DISPLAY: Record<Estacao, string> = {
  Manaus:      "Rio Negro",
  Itacoatiara: "Rio Amazonas",
  Curicuriari: "Negro alto",
  Humaita:     "Rio Madeira",
  Manacapuru:  "Rio Solimões",
  PortoVelho:  "Rio Madeira",
  Borba:       "Rio Madeira",
};

export function posicaoRelativa(cota_m: number, estacao: Estacao): number {
  const { p10, p90 } = LIMIARES[estacao];
  return Math.max(0, Math.min(1, (cota_m - p10) / (p90 - p10)));
}

export type Semaforo = "normal" | "atencao" | "critico";

export function semaforo(cota_m: number, estacao: Estacao): Semaforo {
  const { p10, gatilho_lws } = LIMIARES[estacao];
  if (gatilho_lws && cota_m < gatilho_lws) return "critico";
  if (cota_m < p10) return "critico";
  if (posicaoRelativa(cota_m, estacao) < 0.2) return "atencao";
  return "normal";
}
