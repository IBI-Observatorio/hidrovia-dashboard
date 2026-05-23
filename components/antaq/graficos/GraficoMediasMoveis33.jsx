"use client";
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Label,
} from 'recharts';
import { useDashboardData } from '../useDashboardData';

const FILES = ['portos.json'];

const NATUREZAS = [
  { key: 'granel_solido',  label: 'Granel sólido (soja, milho, minério…)' },
  { key: 'granel_liquido', label: 'Granel líquido (petróleo, combustível…)' },
  { key: 'carga_geral',    label: 'Carga geral (pallets, fardos, máquinas…)' },
  { key: 'conteinerizada', label: 'Carga conteinerizada' },
];

function fmtNum(v, d = 1) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const tickStyle = { fill: '#d1d5db', fontSize: 10 };
const gridProps = { stroke: '#374151', strokeDasharray: '3 3' };
const tooltipStyle = { backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 12 };

function CustomLabel({ viewBox, value }) {
  const { x, y } = viewBox || {};
  return (
    <g>
      <rect x={x - 2} y={(y || 0) - 20} width={String(value).length * 7 + 16} height={18}
            rx={4} fill="#2c2c2c" stroke="#D4922A" strokeWidth={1} />
      <text x={x + 6} y={(y || 0) - 7} fill="#D4922A" fontSize={11} fontWeight={600}>{value}</text>
    </g>
  );
}

export default function GraficoMediasMoveis33() {
  const { data, loading, erro } = useDashboardData(FILES);
  const [natKey, setNatKey] = useState('granel_solido');

  const chartData = useMemo(() => {
    if (!data) return null;
    const portos = data['portos'];
    const nat = portos?.naturezas?.[natKey];
    if (!nat) return null;

    const gan = [...(nat.ganhadores || [])].slice(0, 8);
    const per = [...(nat.perdedores || [])].slice(0, 8).reverse();
    const all = [...per, ...gan];
    return {
      rows: all.map(p => ({
        nome: p.porto.slice(0, 26) + (p.porto.length > 26 ? '…' : '') + ` (${p.uf})`,
        cagr: p.cagr_pct,
        volume: p.volume_mt,
        ganhou: p.cagr_pct >= nat.cagr_natureza_pct,
      })),
      natCagr: nat.cagr_natureza_pct,
      periodo: nat.periodo,
      natLabel: nat.natureza_label,
    };
  }, [data, natKey]);

  if (loading) return <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Carregando…</div>;
  if (erro)    return <div className="h-80 flex items-center justify-center text-red-400 text-sm">Erro: {erro}</div>;
  if (!chartData) return null;

  const { rows, natCagr, periodo, natLabel } = chartData;

  return (
    <div className="space-y-4">
      {/* Seletor de carga */}
      <div className="flex flex-wrap gap-2">
        {NATUREZAS.map(({ key, label }) => (
          <button key={key} onClick={() => setNatKey(key)}
                  className="px-3 py-1.5 text-xs rounded-md transition-colors"
                  style={{
                    background: natKey === key ? '#D4922A' : '#374151',
                    color: natKey === key ? '#fff' : '#d1d5db',
                    border: '1px solid ' + (natKey === key ? '#D4922A' : '#4b5563'),
                  }}>
            {label}
          </button>
        ))}
      </div>

      {/* Headline */}
      <p className="text-sm text-gray-200">
        <strong>{natLabel}</strong> no Brasil cresceu{' '}
        <strong style={{ color: '#D4922A' }}>
          {natCagr >= 0 ? '+' : ''}{fmtNum(natCagr, 1)}% ao ano
        </strong>{' '}
        entre {periodo}. Portos acima da linha dourada ganharam espaço; abaixo, perderam.
      </p>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={Math.max(480, rows.length * 36)}>
        <BarChart data={rows} layout="vertical"
                  margin={{ top: 20, right: 140, bottom: 24, left: 220 }}>
          <CartesianGrid {...gridProps} horizontal={false} />
          <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }}
                 tickFormatter={v => (v >= 0 ? '+' : '') + fmtNum(v, 0) + '%'}>
            <Label value="Crescimento médio anual do porto (%)" position="insideBottom"
                   fill="#9ca3af" fontSize={11} dy={14} />
          </XAxis>
          <YAxis type="category" dataKey="nome" tick={tickStyle} width={215} />
          <Tooltip contentStyle={tooltipStyle}
                   formatter={(v, _n, props) => {
                     const d = props.payload;
                     return [
                       (v >= 0 ? '+' : '') + fmtNum(v, 1) + '%/ano · ' + fmtNum(d.volume, 1) + ' Mt',
                       d.ganhou ? 'Ganhou espaço' : 'Perdeu espaço',
                     ];
                   }}
                   labelFormatter={v => v} />
          <ReferenceLine x={natCagr} stroke="#D4922A" strokeWidth={2} strokeDasharray="6 3"
                         label={<CustomLabel value={`Média nacional: ${natCagr >= 0 ? '+' : ''}${fmtNum(natCagr, 1)}%`} />} />
          <Bar dataKey="cagr" radius={[0, 4, 4, 0]}
               label={{ position: 'right', fontSize: 10, fill: '#d1d5db',
                        formatter: (v) => (v >= 0 ? '+' : '') + fmtNum(v, 1) + '%' }}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.ganhou ? '#00A652' : '#c1322f'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500">
        Linha dourada = crescimento médio nacional da carga selecionada ·
        verde = porto cresceu acima da média (ganhou espaço de mercado) ·
        vermelho = cresceu abaixo (perdeu espaço) ·
        rótulo = CAGR do porto + volume no último ano
      </p>
    </div>
  );
}
