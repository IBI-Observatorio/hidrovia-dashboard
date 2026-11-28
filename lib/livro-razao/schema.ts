// LIVRO-RAZÃO DA INFRAESTRUTURA — schema da ficha de projeto.
//
// Cada ficha converte ESTUDOS PÚBLICOS em fluxo (custo diário de o projeto não
// existir). O Observatório não produz estimativa primária: só transporta o que
// fontes públicas já publicaram.
//
// REGRA SUPREMA DE INTEGRIDADE (codificada aqui, validada em build):
//   • Nenhum valor econômico é inventado, estimado ou "aproximado".
//   • Ficha sem dado validado nasce 'em_validacao': sem número e FORA da soma.
//   • Só ficha 'ativa' expõe taxaPorSegundo() e entra no Relógio nacional.
//   • O relógio da ficha é calculado do PISO do intervalo — conservador por design.
//
// O engine de custo (lib/custo-evitavel.ts) trabalha com valor ANUAL; o custo de
// inação é declarado por DIA (piso/teto). A ponte é sempre piso × 365 / segundos.

import { SEGUNDOS_ANO } from "@/lib/custo-evitavel";

/** Modal do projeto estruturante. */
export type Modal = "ferrovia" | "rodovia" | "hidrovia" | "porto";

/** Estado da ficha. 'ativa' exige dado validado ponta a ponta; 'em_validacao' não. */
export type StatusFicha = "ativa" | "em_validacao";

/**
 * Fonte apontada. `url` pode ser `null` enquanto pendente (TODO de link).
 * Ficha 'ativa' EXIGE que a fonte do custo de inação tenha `url` (ver validação).
 */
export type Fonte = {
  titulo: string;
  orgao: string;
  ano: number;
  /** URL pública. `null` = pendente (marcada como TODO na ficha). */
  url: string | null;
};

/** CAPEX do projeto (investimento para destravá-lo), com fonte. */
export type Capex = {
  /** R$ (nominais do ano-base). */
  valor: number;
  ano_base: number;
  fonte: Fonte;
};

/**
 * Custo diário de o projeto NÃO existir, como intervalo piso–teto (R$/dia).
 * `memoria` é a conta por extenso, auditável — como se chega ao piso e ao teto.
 */
export type CustoInacaoDiario = {
  /** R$/dia — extremo conservador. É deste valor que sai o relógio. */
  piso: number;
  /** R$/dia — extremo superior. Só exibido como faixa, nunca entra na soma. */
  teto: number;
  ano_base: number;
  fonte: Fonte;
  /** A conta por extenso: de onde vêm piso e teto. */
  memoria: string;
};

/** Ficha de um projeto estruturante no Livro-Razão. */
export type FichaProjeto = {
  slug: string;
  nome: string;
  modal: Modal;
  uf: string[];
  status: StatusFicha;
  capex: Capex | null;
  custoInacaoDiario: CustoInacaoDiario | null;
  /** Fontes apontadas da ficha (o custo/CAPEX têm as suas próprias em cada bloco). */
  fontes: Fonte[];
  /** O que o projeto destrava, em uma frase — qualitativo, sem número inventado. */
  contexto: string;
};

const SEGUNDOS_DIA = 86_400;
const DIAS_ANO = 365;

/**
 * Valida a ficha. Regras duras — `throw` derruba o build se violadas:
 *   1. 'ativa' exige capex ≠ null E custoInacaoDiario ≠ null, com piso ≤ teto,
 *      piso ≥ 0 e a fonte do custo de inação com URL pública.
 *   2. 'em_validacao' não pode carregar número: capex e custoInacaoDiario nulos.
 */
export function validarFicha(f: FichaProjeto): void {
  const erro = (msg: string) => {
    throw new Error(`Ficha "${f.slug}" inválida: ${msg}`);
  };

  if (f.status === "ativa") {
    if (!f.capex) erro("status 'ativa' exige capex ≠ null.");
    if (!f.custoInacaoDiario) erro("status 'ativa' exige custoInacaoDiario ≠ null.");
    const c = f.custoInacaoDiario!;
    if (!(c.piso >= 0)) erro("piso do custo de inação deve ser ≥ 0.");
    if (!(c.piso <= c.teto)) erro(`piso (${c.piso}) deve ser ≤ teto (${c.teto}).`);
    if (!c.fonte.url) erro("status 'ativa' exige fonte do custo de inação com URL.");
    if (!f.capex!.fonte.url) erro("status 'ativa' exige fonte do CAPEX com URL.");
  } else {
    // 'em_validacao' NUNCA expõe número — a integridade depende disso.
    if (f.capex || f.custoInacaoDiario)
      erro("status 'em_validacao' não pode ter capex nem custoInacaoDiario.");
  }
}

/** Ficha está ativa E consistente (guard reutilizável). */
export function fichaAtiva(f: FichaProjeto): boolean {
  return f.status === "ativa" && f.capex != null && f.custoInacaoDiario != null;
}

/**
 * Múltiplo de urgência — DERIVADO, nunca armazenado. Quantas vezes o custo ANUAL
 * de inação (pelo PISO, conservador) "paga" o CAPEX em um ano. Só existe se ambos
 * existirem. Retorna `null` caso contrário.
 */
export function multiploUrgencia(f: FichaProjeto): number | null {
  if (!fichaAtiva(f)) return null;
  const capex = f.capex!.valor;
  if (!(capex > 0)) return null;
  const custoAnualPiso = f.custoInacaoDiario!.piso * DIAS_ANO;
  return custoAnualPiso / capex;
}

/**
 * Taxa própria da ficha (R$/segundo), calculada do PISO. Só ficha ativa a expõe;
 * caso contrário `null` (e ela fica fora da soma nacional, sem exceção).
 */
export function taxaPorSegundoFicha(f: FichaProjeto): number | null {
  if (!fichaAtiva(f)) return null;
  return f.custoInacaoDiario!.piso / SEGUNDOS_DIA;
}

/** Valor anual (R$) equivalente ao piso — ponte para o engine (valorAnual). */
export function valorAnualPiso(f: FichaProjeto): number | null {
  if (!fichaAtiva(f)) return null;
  return f.custoInacaoDiario!.piso * DIAS_ANO;
}

// Reexporta para consumidores que só importam o schema.
export { SEGUNDOS_ANO, SEGUNDOS_DIA, DIAS_ANO };
