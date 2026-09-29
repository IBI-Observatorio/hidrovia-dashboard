// Engine puro de "custo evitável em tempo real" — núcleo reutilizável do Bloco A.
//
// Dado um custo ANUAL (informado direto OU como volume × diferencial unitário) e
// uma ÂNCORA temporal, devolve a taxa por segundo e o valor acumulado da âncora
// até um instante. É o contrato que todos os módulos futuros (pavimento, etc.)
// vão consumir — via CustoMeter / registry de embed.
//
// Fórmula:
//   valorAnual      = volumeAnual × diferencialUnitario   (ou valor informado direto)
//   taxaPorSegundo  = valorAnual / SEGUNDOS_ANO
//   acumulado(ts)   = max(0, (ts − ancora) / 1000) × taxaPorSegundo
//
// Sem React, sem efeito colateral, sem timezone externa: usa Date local (a âncora
// "meia-noite"/"inicio-ano" é calculada no fuso da máquina que renderiza).

/** Segundos em um ano civil de 365 dias (365 × 24 × 3600). */
export const SEGUNDOS_ANO = 31_536_000;

/**
 * Âncora de onde o acumulado começa a contar.
 *  - 'meia-noite': 00:00 de hoje (local)
 *  - 'inicio-ano': 01/jan 00:00 do ano corrente (local)
 *  - 'data':       instante explícito (exige `data`)
 */
export type Janela = { tipo: "meia-noite" | "inicio-ano" | "data"; data?: Date };

/** Custo: ou o valor anual direto, ou volume anual × diferencial unitário. */
export type CustoInput =
  | { valorAnual: number; janela: Janela }
  | { volumeAnual: number; diferencialUnitario: number; janela: Janela };

/** Origem do número — usada pelo SeloProveniencia. Oficial e estimativa nunca se confundem. */
export type Proveniencia = { tipo: "oficial" | "estimativa-ibi"; fonte: string };

/** Premissa ajustável por slider: o valor do slider redefine o CustoInput (recalcula a taxa). */
export type Premissa = {
  label: string;
  min: number;
  max: number;
  step: number;
  base: number;
  /** Formata o valor do slider para exibição (ex.: v => `R$ ${v.toFixed(0)}/t`). */
  formatar: (v: number) => string;
  /** Converte o valor do slider no CustoInput do engine. */
  calcular: (v: number) => CustoInput;
};

/** Resolve as duas formas de CustoInput num valor anual (R$/ano). */
export function valorAnualDe(input: CustoInput): number {
  return "valorAnual" in input
    ? input.valorAnual
    : input.volumeAnual * input.diferencialUnitario;
}

/** Timestamp (ms) da âncora da janela. */
export function ancoraDe(janela: Janela): number {
  const agora = new Date();
  switch (janela.tipo) {
    case "meia-noite":
      return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
    case "inicio-ano":
      return new Date(agora.getFullYear(), 0, 1).getTime();
    case "data":
      if (!janela.data) throw new Error("Janela tipo 'data' exige o campo `data`.");
      return janela.data.getTime();
  }
}

/** Taxa de acúmulo em R$/segundo. */
export function taxaPorSegundo(input: CustoInput): number {
  return valorAnualDe(input) / SEGUNDOS_ANO;
}

/** Valor acumulado (R$) da âncora até `tsMs`. Zero antes da âncora. */
export function acumuladoEm(input: CustoInput, tsMs: number): number {
  const decorridoS = (tsMs - ancoraDe(input.janela)) / 1000;
  if (decorridoS <= 0) return 0;
  return decorridoS * taxaPorSegundo(input);
}
