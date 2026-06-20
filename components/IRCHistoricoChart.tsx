"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { IRC_HISTORICO_CALCULADO } from "@/lib/irc-historico-calculado";

const MESES_ABREV = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
// "YYYY-MM-DD" → "mês/AA" (eixo) — padrão brasileiro.
const fmtEixoMes = (iso: string) => { const [a, m] = iso.split("-"); return `${MESES_ABREV[parseInt(m, 10) - 1] ?? "?"}/${a.slice(2)}`; };
// "YYYY-MM-DD" → "DD/MM/AAAA" (tooltip) — padrão brasileiro.
const fmtDataBR = (iso: string) => { const [a, m, d] = String(iso).split("-"); return `${d}/${m}/${a}`; };

// Gráfico de linha do IRC histórico com bandas de faixa.
export default function IRCHistoricoChart() {
  // Decima para no máximo ~200 pontos para legibilidade
  const todos = IRC_HISTORICO_CALCULADO;
  const passo = Math.ceil(todos.length / 200);
  const dados = todos.filter((_, i) => i % passo === 0);

  return (
    <div className="bg-azul-medio rounded-lg p-4 border border-white/10">
      <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">
        IRC histórico · {todos.length} dias · 2016-2025
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B3A6B" />
          <XAxis
            dataKey="data"
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            tickFormatter={fmtEixoMes}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            ticks={[0, 25, 50, 75, 100]}
          />
          {/* Faixas de fundo */}
          <ReferenceArea y1={0}  y2={25}  fill="#00C04B" fillOpacity={0.05} />
          <ReferenceArea y1={25} y2={50}  fill="#D4922A" fillOpacity={0.05} />
          <ReferenceArea y1={50} y2={75}  fill="#f97316" fillOpacity={0.05} />
          <ReferenceArea y1={75} y2={100} fill="#A0153E" fillOpacity={0.05} />
          {/* Linhas de referência */}
          <ReferenceLine y={75} stroke="#A0153E" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={50} stroke="#f97316" strokeDasharray="3 3" strokeWidth={0.5} />
          <ReferenceLine y={25} stroke="#00C04B" strokeDasharray="3 3" strokeWidth={0.5} />
          <Tooltip
            contentStyle={{ background: "#0A1A4A", border: "1px solid #1B3A6B", fontSize: 12 }}
            labelStyle={{ color: "#94a3b8" }}
            labelFormatter={(l) => fmtDataBR(String(l))}
          />
          <Line
            type="monotone"
            dataKey="irc"
            stroke="#00C04B"
            strokeWidth={1.5}
            dot={false}
            name="IRC"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-gray-500 text-[11px] mt-2 leading-relaxed">
        Componentes Onda Branco e Anomalia de Precipitação fixados em 0 nesta série retroativa (dados
        históricos consolidados ausentes). Os picos refletem o componente LWS + HMM extremo.
      </p>
    </div>
  );
}
