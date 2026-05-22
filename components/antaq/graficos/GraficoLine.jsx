"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const fmtBR = (v, casas = 1) => {
  if (v == null || isNaN(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(casas) + ' bi';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(casas) + ' M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(casas) + ' k';
  return v.toFixed(casas);
};

/**
 * Múltiplas linhas no mesmo eixo Y (ex: #27 sazonalidade T1).
 *
 * spec: { tipo:'line', x:'mes_n', label_x, label_y,
 *         series: [{y:'T1_norm', label:'T1', cor:'#c1322f'},
 *                  {y:'ocup_norm', label:'Ocupação', cor:'#3a64a8'}] }
 */
export default function GraficoLine({ dados, spec }) {
  const dataPlot = [...dados].filter((r) => r[spec.x] != null);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataPlot} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={spec.x}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: spec.label_x, position: 'insideBottom', offset: -4,
                     fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => fmtBR(v, 0)}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: spec.label_y, angle: -90, position: 'insideLeft',
                     fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151',
                            borderRadius: 8, color: '#e5e7eb' }}
            formatter={(v, n) => [fmtBR(v, 2), n]}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          {spec.series.map((s) => (
            <Line
              key={s.y}
              type="monotone"
              dataKey={s.y}
              name={s.label}
              stroke={s.cor || '#0099D8'}
              strokeWidth={2.2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
