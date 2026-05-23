"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const fmtBR = (v, casas = 1) => {
  if (v == null || isNaN(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(casas) + ' bi';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(casas) + ' M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(casas) + ' k';
  return v.toFixed(casas);
};

/**
 * Gráfico de barras simples para indicadores anuais (ex: #03 Custo Brasil).
 * spec: { tipo:'bar', x:'Ano', y:'custo_brl', transform_y?, label_x, label_y, cor }
 */
export default function GraficoBar({ dados, spec }) {
  const transform = spec.transform_y === 'div_1e9' ? (v) => v / 1e9
                  : spec.transform_y === 'div_1e6' ? (v) => v / 1e6
                  : (v) => v;

  const dataPlot = dados
    .filter((r) => r[spec.x] != null && r[spec.y] != null)
    .map((r) => ({ ...r, _y: transform(r[spec.y]) }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dataPlot} margin={{ top: 12, right: 16, bottom: 16, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={spec.x}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: spec.label_x, position: 'insideBottom', offset: -4,
                     fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => fmtBR(v)}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: spec.label_y, angle: -90, position: 'insideLeft',
                     fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151',
                            borderRadius: 8, color: '#e5e7eb' }}
            formatter={(v) => [fmtBR(v, 2), spec.label_y]}
            labelFormatter={(l) => `${spec.label_x}: ${l}`}
          />
          <Bar dataKey="_y" fill={spec.cor || '#0099D8'} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
