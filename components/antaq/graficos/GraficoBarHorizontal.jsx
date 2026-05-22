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
 * Barras horizontais (top-N) — usado em #26 (custo por tonelada) e #28 (centralidade).
 *
 * spec: { tipo:'bar_horizontal', x:'custo_brl_por_ton', y:'porto',
 *         label_x, label_y, cor, top_n?, filtro? }
 *  - filtro: string "campo == 'valor'" aplicada ao DataFrame antes de ranquear
 */
export default function GraficoBarHorizontal({ dados, spec }) {
  let dataPlot = [...dados].filter((r) => r[spec.x] != null && r[spec.y] != null);

  if (spec.filtro) {
    const m = spec.filtro.match(/^(\w+)\s*==\s*['"](.+)['"]$/);
    if (m) {
      const [, campo, valor] = m;
      dataPlot = dataPlot.filter((r) => r[campo] === valor);
    }
  }

  dataPlot.sort((a, b) => (b[spec.x] ?? 0) - (a[spec.x] ?? 0));
  if (spec.top_n) dataPlot = dataPlot.slice(0, spec.top_n);
  dataPlot.reverse(); // maior em cima quando vira horizontal

  const altura = Math.max(320, dataPlot.length * 28);

  return (
    <div className="w-full" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dataPlot}
          layout="vertical"
          margin={{ top: 12, right: 24, bottom: 16, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            type="number"
            tickFormatter={(v) => fmtBR(v, 1)}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: spec.label_x, position: 'insideBottom', offset: -4,
                     fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey={spec.y}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={180}
            interval={0}
            tickFormatter={(v) => (typeof v === 'string' && v.length > 26 ? v.slice(0, 25) + '…' : v)}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151',
                            borderRadius: 8, color: '#e5e7eb' }}
            formatter={(v) => [fmtBR(v, 2), spec.label_x]}
          />
          <Bar dataKey={spec.x} fill={spec.cor || '#0099D8'} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
