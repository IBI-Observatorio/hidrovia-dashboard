// Sub-bacias para o IDN_VAZÃO — versão técnica do índice usando descarga (m³/s).
// Pesos renormalizados sobre as 8 estações com vazão pública na API ANA
// (SGC, Abuna e Borba ficam de fora — só publicam cota).

import type { PercentisVazaoDOY } from "./percentis-vazao-doy";

export type EstacaoVazao =
  | "Curicuriari" | "Serrinha" | "Moura" | "Caracarai"
  | "PortoVelho"  | "Humaita"  | "Manicore" | "Labrea";

export interface DefinicaoSubBaciaVazao {
  nome: string;
  membros: { estacao: EstacaoVazao; peso: number }[];
  papel: "Norte" | "Sul";
}

export const SUB_BACIAS_VAZAO: Record<"Norte" | "Sul", DefinicaoSubBaciaVazao> = {
  Norte: {
    nome:  "Negro + Branco (vazão)",
    papel: "Norte",
    membros: [
      { estacao: "Curicuriari", peso: 0.30 }, // Negro alto-médio
      { estacao: "Serrinha",    peso: 0.25 }, // Negro médio
      // Moura: vazão pública só a partir de 2022 (climatologia parcial).
      // Peso reduzido — entra como reforço, não como âncora.
      { estacao: "Moura",       peso: 0.05 },
      { estacao: "Caracarai",   peso: 0.40 }, // Branco — maior tributário
    ],
  },
  Sul: {
    nome:  "Madeira + Purus (vazão)",
    papel: "Sul",
    membros: [
      { estacao: "PortoVelho", peso: 0.30 }, // sinal andino consolidado
      { estacao: "Humaita",    peso: 0.25 }, // Madeira médio
      { estacao: "Manicore",   peso: 0.15 }, // Madeira médio
      { estacao: "Labrea",     peso: 0.30 }, // Purus
    ],
  },
};

function diaDoAno(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

export function posicaoSubBaciaVazao(
  papel: "Norte" | "Sul",
  vazoesPorEstacao: Partial<Record<EstacaoVazao, number>>,
  dataISO: string,
  percentis: Record<string, PercentisVazaoDOY>
): { valor: number; estacoesUsadas: EstacaoVazao[] } {
  const sub = SUB_BACIAS_VAZAO[papel];
  const doy = diaDoAno(dataISO);
  let somaPesos = 0;
  let somaValores = 0;
  const usadas: EstacaoVazao[] = [];

  for (const { estacao, peso } of sub.membros) {
    const q = vazoesPorEstacao[estacao];
    const p = percentis[estacao];
    if (q == null || !p) continue;
    const p10 = p.p10[doy];
    const p90 = p.p90[doy];
    if (p10 == null || p90 == null) continue;
    const pos = (q - p10) / (p90 - p10);
    somaValores += pos * peso;
    somaPesos += peso;
    usadas.push(estacao);
  }

  return {
    valor: somaPesos > 0 ? somaValores / somaPesos : NaN,
    estacoesUsadas: usadas,
  };
}
