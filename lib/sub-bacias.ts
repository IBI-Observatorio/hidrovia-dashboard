// Definição das sub-bacias para o IDN agregado.
//
// Pesos representam contribuição relativa de cada estação ao "sinal" da
// sub-bacia. Critério: estações upstream (mais cedo no fluxo, captam sinal
// climático antes) recebem peso maior; estações médias e jusante recebem
// peso menor (já integram efeitos a montante).
//
// Para expandir: adicionar estações com série ≥ 5 anos no período de
// referência (2016–2023) e regenerar lib/percentis-doy.ts.

import type { PercentisDOY } from "./percentis-doy";

export type EstacaoComDOY =
  | "SGC"         | "Curicuriari" | "Serrinha" | "Moura" | "Caracarai"
  | "Abuna"       | "PortoVelho"  | "Humaita"  | "Manicore"
  | "Labrea";

export interface DefinicaoSubBacia {
  nome: string;
  membros: { estacao: EstacaoComDOY; peso: number }[];
  papel: "Norte" | "Sul";
}

export const SUB_BACIAS: Record<"Norte" | "Sul", DefinicaoSubBacia> = {
  Norte: {
    nome:  "Negro + Branco / drenagem norte",
    papel: "Norte",
    membros: [
      // Rio Negro: do alto curso à foz no Solimões
      { estacao: "SGC",         peso: 0.30 }, // São Gabriel da Cachoeira (Negro alto)
      { estacao: "Curicuriari", peso: 0.20 }, // Negro alto-médio
      { estacao: "Serrinha",    peso: 0.20 }, // Negro médio
      // Moura tem climatologia parcial (vazão começa 2022; cota completa).
      // Peso reduzido para 5% — entra como sinal complementar, não estrutural.
      { estacao: "Moura",       peso: 0.05 },
      // Rio Branco: maior tributário do Negro
      { estacao: "Caracarai",   peso: 0.25 }, // Rio Branco (Roraima)
    ],
  },
  Sul: {
    nome:  "Madeira + Purus / drenagem sul",
    papel: "Sul",
    membros: [
      // Rio Madeira: do upstream andino à foz
      { estacao: "Abuna",      peso: 0.15 }, // upstream PVH, fronteira BOL
      { estacao: "PortoVelho", peso: 0.20 }, // sinal andino consolidado
      { estacao: "Humaita",    peso: 0.15 }, // médio
      { estacao: "Manicore",   peso: 0.20 }, // médio-inferior (peso aumentado após remoção de Borba)
      // Rio Purus: drenagem sul independente do Madeira
      { estacao: "Labrea",     peso: 0.30 }, // Purus (única estação Purus)
    ],
  },
};

// Calcula posição relativa média ponderada de uma sub-bacia.
// `cotasPorEstacao`: mapa estação → cota_m. Estações ausentes do mapa
// têm peso descartado e o resto é renormalizado.
export function posicaoSubBacia(
  papel: "Norte" | "Sul",
  cotasPorEstacao: Partial<Record<EstacaoComDOY, number>>,
  dataISO: string,
  percentis: Record<string, PercentisDOY>,
  diaDoAno: (d: string) => number
): { valor: number; estacoesUsadas: EstacaoComDOY[] } {
  const sub = SUB_BACIAS[papel];
  const doy = diaDoAno(dataISO);
  let somaPesos = 0;
  let somaValores = 0;
  const usadas: EstacaoComDOY[] = [];

  for (const { estacao, peso } of sub.membros) {
    const cota = cotasPorEstacao[estacao];
    const p = percentis[estacao];
    if (cota == null || !p) continue;
    const p10 = p.p10[doy];
    const p90 = p.p90[doy];
    const med = p.mediana[doy];
    // Normalização centrada na mediana: IDN = 0 quando ambas as sub-bacias estão
    // nos seus valores medianos históricos. Elimina o viés estrutural de +0.12
    // que existia com a fórmula (cota − p10)/(p90 − p10).
    if (p10 == null || p90 == null || med == null) continue;
    const pos = (cota - med) / (p90 - p10);
    somaValores += pos * peso;
    somaPesos += peso;
    usadas.push(estacao);
  }

  return {
    valor: somaPesos > 0 ? somaValores / somaPesos : NaN,
    estacoesUsadas: usadas,
  };
}
