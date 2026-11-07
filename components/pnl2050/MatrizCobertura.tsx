"use client";

import { useMemo, useState } from "react";
import type { CategoriaObjetivo, Nivel } from "@/lib/pnl2050/dados";
import { CATEGORIA_CURTA, NIVEL_CLASSE, PNL_COPY } from "@/lib/pnl2050/copy";

export type ObjetivoMatriz = { chave: string; categoria: CategoriaObjetivo; enunciado: string };
export type EixoMatriz = {
  codigo: string;
  nome: string;
  banco: boolean;
  niveis: Record<string, Nivel>;
};

// Matriz 112 objetivos × eixos. Linhas sem nenhum eixo sobem para o topo; o
// toggle acrescenta as colunas do banco de projetos.
export default function MatrizCobertura({
  objetivos,
  eixos,
}: {
  objetivos: ObjetivoMatriz[];
  eixos: EixoMatriz[];
}) {
  const [comBanco, setComBanco] = useState(false);
  const colunas = useMemo(() => eixos.filter((e) => comBanco || !e.banco), [eixos, comBanco]);

  const linhas = useMemo(() => {
    const comContagem = objetivos.map((o, ordem) => ({
      o,
      ordem,
      n: colunas.filter((e) => e.niveis[o.chave]).length,
    }));
    // vazias primeiro; depois a ordem do plano
    return comContagem.sort((a, b) => (a.n === 0 ? 0 : 1) - (b.n === 0 ? 0 : 1) || a.ordem - b.ordem);
  }, [objetivos, colunas]);

  const vazias = linhas.filter((l) => l.n === 0).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-white">{vazias}</span> de {objetivos.length} objetivos sem eixo
          {comBanco ? " (cenário-meta + banco de projetos)" : " (cenário-meta)"}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={comBanco}
            onChange={(e) => setComBanco(e.target.checked)}
            className="h-4 w-4 accent-ibi-green"
          />
          {PNL_COPY.orfaos.toggleBanco}
        </label>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
        {(["Muito alto", "Alto", "Médio"] as Nivel[]).map((n) => (
          <span key={n} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm ${NIVEL_CLASSE[n]}`} /> {n}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-white/10" /> sem contribuição
        </span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-white/10">
        <table className="border-separate border-spacing-0 text-[11px]">
          <thead className="sticky top-0 z-20 bg-azul-marinho">
            <tr>
              <th className="sticky left-0 z-30 bg-azul-marinho px-3 py-2 text-left font-semibold text-gray-400">
                Objetivo
              </th>
              {colunas.map((e) => (
                <th
                  key={e.codigo}
                  title={e.nome}
                  className={`h-16 w-5 min-w-5 align-bottom px-0 pb-2 font-mono font-medium ${
                    e.banco ? "text-ouro" : "text-gray-400"
                  }`}
                >
                  <span className="inline-block -rotate-90 whitespace-nowrap">{e.codigo}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ o, n }) => (
              <tr key={o.chave} className={n === 0 ? "bg-vermelho/10" : ""}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 max-w-[16rem] sm:max-w-md truncate border-t border-white/5 px-3 py-1 text-left font-normal ${
                    n === 0 ? "bg-azul-marinho text-white shadow-[inset_3px_0_0_var(--color-vermelho)]" : "bg-azul-marinho text-gray-300"
                  }`}
                  title={`${CATEGORIA_CURTA[o.categoria]} · ${o.enunciado}`}
                >
                  <span className="font-mono text-gray-500">{o.chave}</span> {o.enunciado}
                </th>
                {colunas.map((e) => {
                  const nivel = e.niveis[o.chave];
                  return (
                    <td key={e.codigo} className="border-t border-white/5 p-0.5">
                      <span
                        title={nivel ? `${e.codigo} · ${nivel}` : undefined}
                        className={`block h-3.5 w-3.5 rounded-[3px] ${nivel ? NIVEL_CLASSE[nivel] : ""}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
