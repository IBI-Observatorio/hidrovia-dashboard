"use client";

import { useMemo } from 'react';
import { CATEGORICA } from '../cores';

/**
 * Heatmap categórico — usado em #25 (fingerprint operacional).
 * Cada célula é (porto × ano) colorida pelo cluster KMeans.
 *
 * spec: { tipo:'heatmap', x:'Ano', y:'porto', valor:'cluster', label_x, label_y }
 */
export default function GraficoHeatmap({ dados, spec }) {
  const grid = useMemo(() => {
    const xs = [...new Set(dados.map((r) => r[spec.x]))].sort((a, b) => a - b);
    const ys = [...new Set(dados.map((r) => r[spec.y]))].sort();
    const valoresUnicos = [...new Set(dados.map((r) => r[spec.valor]))]
      .filter((v) => v != null)
      .sort((a, b) => a - b);
    const corPor = Object.fromEntries(
      valoresUnicos.map((v, i) => [v, CATEGORICA[i % CATEGORICA.length]])
    );
    const mapa = new Map();
    dados.forEach((r) => {
      mapa.set(`${r[spec.x]}|${r[spec.y]}`, r[spec.valor]);
    });
    return { xs, ys, valoresUnicos, corPor, mapa };
  }, [dados, spec.x, spec.y, spec.valor]);

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse text-xs"
             style={{ minWidth: Math.max(640, grid.xs.length * 36 + 220) }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-900 px-2 py-1 text-left
                            text-gray-400 font-normal">
              {spec.label_y}
            </th>
            {grid.xs.map((x) => (
              <th key={x} className="px-1 py-1 text-gray-400 font-normal">{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.ys.map((y) => (
            <tr key={y}>
              <td className="sticky left-0 z-10 max-w-[220px] truncate
                              bg-gray-900 px-2 py-1 text-gray-200" title={y}>
                {y}
              </td>
              {grid.xs.map((x) => {
                const v = grid.mapa.get(`${x}|${y}`);
                const cor = v != null ? grid.corPor[v] : 'transparent';
                return (
                  <td key={`${x}-${y}`}
                      className="h-7 w-8 border border-gray-800"
                      style={{ background: cor }}
                      title={`${y} · ${x}: cluster ${v ?? '—'}`}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span>Cluster:</span>
        {grid.valoresUnicos.map((v) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: grid.corPor[v] }} />
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
