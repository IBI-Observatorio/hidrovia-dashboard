// GATE DE INTEGRIDADE — o "auditor interno" do Relógio e do Livro-Razão.
//
// Reúne, num único lugar testável, as regras duras que NÃO podem ser violadas
// sem quebrar a confiança do produto. É complementar à validarFicha() do schema
// (que já derruba o build via throw na carga do registry): aqui as regras viram
// dados (lista de violações) para os testes unitários falharem o build de forma
// legível — e cobrem também o Relógio e a proibição de campo derivado armazenado.
//
// Regras cobertas:
//   (A) Ficha 'ativa' exige capex, custoInacaoDiario, piso ≥ 0, piso ≤ teto, e
//       fonte (do custo e do CAPEX) com URL pública.
//   (B) Nenhum módulo do Relógio soma sem `fonte` declarada.
//   (C) multiploUrgencia (e demais derivados) NUNCA armazenados na ficha — têm de
//       ser calculados. Um campo derivado presente no objeto é violação.

import { FICHAS } from "@/lib/livro-razao/registry";
import { type FichaProjeto } from "@/lib/livro-razao/schema";
import { decomposicao, type ComponenteRelogio } from "@/lib/relogio";

export type Violacao = { escopo: "ficha" | "relogio"; alvo: string; regra: string };

/** Campos que são DERIVADOS por função — se aparecerem gravados na ficha, é fraude. */
export const CAMPOS_DERIVADOS_PROIBIDOS = [
  "multiploUrgencia",
  "taxaPorSegundo",
  "valorAnualPiso",
] as const;

/** Violações de UMA ficha (regras A e C). */
export function violacoesFicha(f: FichaProjeto): Violacao[] {
  const v: Violacao[] = [];
  const reg = f as unknown as Record<string, unknown>;

  // (C) derivado não pode estar armazenado — vale para qualquer status.
  for (const campo of CAMPOS_DERIVADOS_PROIBIDOS) {
    if (campo in reg) {
      v.push({
        escopo: "ficha",
        alvo: f.slug,
        regra: `campo derivado "${campo}" foi armazenado na ficha — deve ser derivado por função`,
      });
    }
  }

  // Regra A dispara pelo STATUS DECLARADO 'ativa' — não por fichaAtiva(), que já
  // exige os campos e mascararia justamente a ficha ativa mas incompleta.
  if (f.status !== "ativa") return v; // em_validacao: não tem número a exigir.

  // (A) ativa exige número validado ponta a ponta.
  if (!f.capex) {
    v.push({ escopo: "ficha", alvo: f.slug, regra: "ficha 'ativa' sem capex" });
  } else if (!f.capex.fonte.url) {
    v.push({ escopo: "ficha", alvo: f.slug, regra: "ficha 'ativa' com fonte de CAPEX sem URL" });
  }

  const c = f.custoInacaoDiario;
  if (!c) {
    v.push({ escopo: "ficha", alvo: f.slug, regra: "ficha 'ativa' sem custoInacaoDiario" });
  } else {
    if (!(c.piso >= 0)) {
      v.push({ escopo: "ficha", alvo: f.slug, regra: "piso do custo de inação < 0" });
    }
    if (!(c.piso <= c.teto)) {
      v.push({ escopo: "ficha", alvo: f.slug, regra: `piso (${c.piso}) > teto (${c.teto})` });
    }
    if (!c.fonte.url) {
      v.push({ escopo: "ficha", alvo: f.slug, regra: "ficha 'ativa' com fonte do custo de inação sem URL" });
    }
  }

  return v;
}

/** Violações do conjunto de fichas (default: registry real). */
export function violacoesFichas(fichas: FichaProjeto[] = FICHAS): Violacao[] {
  return fichas.flatMap(violacoesFicha);
}

/** (B) Nenhum componente do Relógio pode somar sem fonte declarada. */
export function violacoesRelogio(
  componentes: ComponenteRelogio[] = decomposicao(),
): Violacao[] {
  return componentes
    .filter((c) => !c.fonte || c.fonte.trim() === "")
    .map((c) => ({
      escopo: "relogio" as const,
      alvo: c.modulo,
      regra: "módulo entra na soma do Relógio sem fonte declarada",
    }));
}

/** Todas as violações (vazio = íntegro). É o que o gate checa. */
export function checaIntegridade(): Violacao[] {
  return [...violacoesFichas(), ...violacoesRelogio()];
}
