// LIVRO-RAZÃO — registro central das fichas.
//
// Reúne as 15 fichas, valida CADA uma na carga do módulo (validarFicha faz throw
// → derruba o build se alguma violar a regra de integridade) e expõe os helpers
// que o Relógio nacional e as páginas consomem.
//
// Puro TS, client-safe: sem React, sem I/O, sem import server/async. Pode ser
// importado pelo lib/relogio.ts (que também é client-safe) sem quebrar o bundle.

import type { Proveniencia } from "@/lib/custo-evitavel";
import {
  fichaAtiva,
  multiploUrgencia,
  taxaPorSegundoFicha,
  validarFicha,
  type FichaProjeto,
} from "./schema";

import { ferrograo } from "./fichas/ferrograo";
import { fico } from "./fichas/fico";
import { fiol23 } from "./fichas/fiol-2-3";
import { ef118 } from "./fichas/ef-118";
import { transnordestina } from "./fichas/transnordestina";
import { ferroanelSp } from "./fichas/ferroanel-sp";
import { malhaSul } from "./fichas/malha-sul";
import { br319 } from "./fichas/br-319";
import { br163Miritituba } from "./fichas/br-163-miritituba";
import { pedralLourenco } from "./fichas/pedral-lourenco";
import { hidroviaMadeira } from "./fichas/hidrovia-madeira";
import { hidroviaParaguaiParana } from "./fichas/hidrovia-paraguai-parana";
import { teconSantos10 } from "./fichas/tecon-santos-10";
import { tunelSantosGuaruja } from "./fichas/tunel-santos-guaruja";
import { canalParanagua } from "./fichas/canal-paranagua";

/** As 15 fichas do Livro-Razão. */
export const FICHAS: FichaProjeto[] = [
  ferrograo,
  fico,
  fiol23,
  ef118,
  transnordestina,
  ferroanelSp,
  malhaSul,
  br319,
  br163Miritituba,
  pedralLourenco,
  hidroviaMadeira,
  hidroviaParaguaiParana,
  teconSantos10,
  tunelSantosGuaruja,
  canalParanagua,
];

// ── Validação em build: throw se qualquer ficha violar a integridade. ────────
// Também garante slugs únicos (a rota /livro-razao/[slug] depende disso).
(() => {
  const vistos = new Set<string>();
  for (const f of FICHAS) {
    if (vistos.has(f.slug)) throw new Error(`Livro-Razão: slug duplicado "${f.slug}".`);
    vistos.add(f.slug);
    validarFicha(f);
  }
})();

/** Ficha por slug (ou undefined). */
export function getFicha(slug: string): FichaProjeto | undefined {
  return FICHAS.find((f) => f.slug === slug);
}

/** Fichas ativas (dado validado ponta a ponta). */
export function fichasAtivas(): FichaProjeto[] {
  return FICHAS.filter(fichaAtiva);
}

/** Quantas fichas ativas — usado na barra de estado e na decomposição do Relógio. */
export function contagemFichasAtivas(): number {
  return fichasAtivas().length;
}

/**
 * Ordem de exibição na grade: ativas primeiro (por múltiplo de urgência desc),
 * depois em_validacao (ordem estável de declaração).
 */
export function fichasOrdenadas(): FichaProjeto[] {
  const ativas = fichasAtivas().sort(
    (a, b) => (multiploUrgencia(b) ?? 0) - (multiploUrgencia(a) ?? 0),
  );
  const emValidacao = FICHAS.filter((f) => !fichaAtiva(f));
  return [...ativas, ...emValidacao];
}

// ── Integração com o Relógio da Infraestrutura ───────────────────────────────

/** Taxa total (R$/segundo) do Livro-Razão = soma do PISO das fichas ativas. */
export function taxaLivroRazao(): number {
  return fichasAtivas().reduce((s, f) => s + (taxaPorSegundoFicha(f) ?? 0), 0);
}

/**
 * Componente AGREGADO do Livro-Razão para a decomposição do Relógio.
 * Retorna null quando não há ficha ativa (a linha é ocultada, como pede o design).
 * O Relógio soma as fichas individualmente via taxaLivroRazao(); na decomposição
 * elas aparecem como UMA linha "Livro-Razão: N projetos ativos".
 */
export function componenteLivroRazao(): {
  modulo: string;
  nome: string;
  rota: string;
  taxa: number;
  fonte: string;
  metodologia: string;
  tipoProveniencia: Proveniencia["tipo"];
} | null {
  const n = contagemFichasAtivas();
  if (n < 1) return null;
  return {
    modulo: "livro-razao",
    nome: `Livro-Razão: ${n} ${n === 1 ? "projeto ativo" : "projetos ativos"}`,
    rota: "/livro-razao",
    taxa: taxaLivroRazao(),
    fonte: "Observatório IBI — carteira de projetos estruturantes (estudos públicos)",
    metodologia:
      "Soma do PISO do custo diário de inação das fichas ativas do Livro-Razão, convertido em taxa contínua. Cada ficha tem CAPEX, memória de cálculo e fontes próprias, auditáveis em /livro-razao.",
    tipoProveniencia: "estimativa-ibi",
  };
}
