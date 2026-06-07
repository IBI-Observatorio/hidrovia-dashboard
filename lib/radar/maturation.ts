// Módulo 1 do Radar — Maturação ferroviária (Build Brief §3, §4.4).
//
// Esteira de 5 estágios do pipeline de concessão brasileiro e a P(leilão por ano).
// A P(leilão) é SAÍDA DE MODELO (ilustrativa): combina (a) a probabilidade de os
// gates institucionais liberarem até cada ano com (b) a P(estrutura fechar) vinda
// do Monte Carlo do motor DCF — "leilão atrativo só quando a estrutura fecha E os
// gates liberam" (Build Brief §4.4). O ESTÁGIO atual de cada ativo é dado público
// (sourced no seed); a curva de probabilidade é modelada.

export const ESTAGIOS = [
  "Estudos (EVTEA)",
  "Consulta Pública",
  "TCU",
  "Edital",
  "Leilão",
] as const;

export type GateRisk = "baixo" | "medio" | "alto";
export type Regime = "travado" | "maturando" | "iminente";

/** Rótulo + classes de cor por regime (fonte única p/ componente e índice). */
export const REGIME_INFO: Record<Regime, { label: string; txt: string; bg: string }> = {
  travado: { label: "Travado", txt: "text-vermelho", bg: "bg-vermelho/10 border-vermelho/30" },
  maturando: { label: "Maturando", txt: "text-ouro", bg: "bg-ouro/10 border-ouro/30" },
  iminente: { label: "Iminente", txt: "text-ibi-green", bg: "bg-ibi-green/10 border-ibi-green/30" },
};

export interface MaturacaoSeed {
  estagioAtual: number;          // índice 0..4 em ESTAGIOS (dado público)
  leilaoAnunciado: number | null; // ano anunciado oficialmente (ou null)
  gateRisk: GateRisk;            // risco institucional agregado
  drivers?: string[];            // bullets sourced (o que trava/destrava)
}

export interface PLeilaoPonto {
  ano: number;
  pOcorre: number;   // P(leilão acontecer até o ano) — cumulativa
  pAtrativo: number; // P(leilão atrativo até o ano) = pOcorre × P(estrutura fecha)
}

const SLIP: Record<GateRisk, number> = { baixo: 0.3, medio: 1.0, alto: 2.5 };
const ANOS_POR_ESTAGIO: Record<GateRisk, number> = { baixo: 0.6, medio: 1.0, alto: 1.8 };
const SIGMA: Record<GateRisk, number> = { baixo: 0.6, medio: 1.2, alto: 2.2 };

/** Ano central esperado do leilão a partir do estágio e do risco de gates. */
export function anoCentralLeilao(seed: MaturacaoSeed, anoBase: number): number {
  const restantes = Math.max(0, ESTAGIOS.length - 1 - seed.estagioAtual);
  const porEstagio = anoBase + restantes * ANOS_POR_ESTAGIO[seed.gateRisk];
  const centro =
    seed.leilaoAnunciado != null
      ? Math.max(seed.leilaoAnunciado + SLIP[seed.gateRisk], porEstagio - 0.5)
      : porEstagio;
  return centro;
}

/** Logística cumulativa de "gates liberados até o ano Y". */
function cdfGates(ano: number, centro: number, sigma: number): number {
  return 1 / (1 + Math.exp(-(ano - centro) / sigma));
}

/**
 * P(leilão por ano). `pEstruturaFecha` = 1 − P(spread<0) do Monte Carlo (módulo 2);
 * se indefinido (ativo sem DCF), assume 1 (só a dimensão institucional é modelada,
 * a econômica fica em aberto — rotular como parcial na UI).
 */
export function pLeilaoPorAno(
  seed: MaturacaoSeed,
  anos: number[],
  anoBase: number,
  pEstruturaFecha = 1,
): PLeilaoPonto[] {
  const centro = anoCentralLeilao(seed, anoBase);
  const sigma = SIGMA[seed.gateRisk];
  return anos.map((ano) => {
    const pOcorre = cdfGates(ano, centro, sigma);
    return { ano, pOcorre, pAtrativo: pOcorre * pEstruturaFecha };
  });
}

/** Primeiro ano em que a curva (cumulativa) cruza 0,5; null se nunca cruza. */
export function medianaCruzamento(
  pontos: PLeilaoPonto[],
  campo: "pOcorre" | "pAtrativo" = "pAtrativo",
): number | null {
  for (const p of pontos) if (p[campo] >= 0.5) return p.ano;
  return null;
}

/** Classifica o regime de maturação a partir do estágio e do risco. */
export function classificaRegime(seed: MaturacaoSeed, pEstruturaFecha = 1): Regime {
  // Estrutura econômica não fecha (ou gate alto cedo no funil) → travado.
  if (pEstruturaFecha < 0.1) return "travado";
  if (seed.estagioAtual >= 3 && seed.gateRisk !== "alto") return "iminente";
  if (seed.gateRisk === "alto" && seed.estagioAtual <= 2) return "travado";
  return "maturando";
}
