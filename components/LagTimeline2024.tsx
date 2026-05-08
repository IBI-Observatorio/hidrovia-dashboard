"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  ReferenceArea,
} from "recharts";
import { MANAUS_2024_ESTIAGEM, LAG_2024 } from "@/lib/dados-historicos";

// Série de Manaus com dados pontuais
const serieManaus = Object.entries(MANAUS_2024_ESTIAGEM)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([data, cota_m]) => ({ data, manaus: cota_m }));

// Itacoatiara: dados completos interpolados (set-dez/2024)
// Nota: série completa não disponível no HidroWeb; usamos pontos-âncora + interpolação linear
const ITACOATIARA_INTERPOLADO: { data: string; itacoatiara: number }[] = [
  { data: "2024-09-09", itacoatiara:  3.20 },
  { data: "2024-09-15", itacoatiara:  2.80 },
  { data: "2024-09-20", itacoatiara:  2.20 },
  { data: "2024-09-25", itacoatiara:  1.50 },
  { data: "2024-10-01", itacoatiara:  0.80 },
  { data: "2024-10-05", itacoatiara:  0.30 },
  { data: "2024-10-09", itacoatiara:  0.02 },  // Manaus mínima (lag D=0)
  { data: "2024-10-13", itacoatiara: -0.11 },  // 1° recorde Itacoatiara
  { data: "2024-10-15", itacoatiara: -0.12 },
  { data: "2024-10-20", itacoatiara: -0.14 },
  { data: "2024-10-25", itacoatiara: -0.16 },
  { data: "2024-10-31", itacoatiara: -0.17 },  // mínima absoluta Itacoatiara
  { data: "2024-11-05", itacoatiara: -0.10 },
  { data: "2024-11-10", itacoatiara:  0.20 },
  { data: "2024-11-15", itacoatiara:  0.80 },
  { data: "2024-12-27", itacoatiara:  4.50 },
  { data: "2024-12-28", itacoatiara:  4.70 },
];

// Mescla as duas séries por data
function mescla() {
  const map: Record<string, { data: string; manaus?: number; itacoatiara?: number }> = {};
  for (const p of serieManaus) {
    map[p.data] = { ...map[p.data], data: p.data, manaus: p.manaus };
  }
  for (const p of ITACOATIARA_INTERPOLADO) {
    map[p.data] = { ...map[p.data], data: p.data, itacoatiara: p.itacoatiara };
  }
  return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
}

const dados = mescla();

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-azul-marinho border border-white/10 rounded p-2 text-xs">
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value?.toFixed(2)} m</strong>
        </p>
      ))}
    </div>
  );
};

export default function LagTimeline2024() {
  return (
    <div className="bg-azul-medio rounded-lg p-5">
      {/* Cabeçalho */}
      <div className="mb-2">
        <h2 className="text-white font-bold text-lg">
          O Lag de 22 Dias — Achado Regulatório de 2024
        </h2>
        <p className="text-gray-400 text-sm">
          Enquanto o parâmetro ANTAQ sinalizava normalização, Itacoatiara/Tabocal ainda impunha
          restrições crescentes de calado.
        </p>
      </div>

      {/* Cards de destaque */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-azul-marinho rounded p-3 border-l-4 border-vermelho">
          <p className="text-gray-400 text-xs">Manaus cruza 17,7 m ↓</p>
          <p className="text-white font-bold">10/set/2024</p>
          <p className="text-vermelho text-sm font-semibold">LWS ativada</p>
        </div>
        <div className="bg-azul-marinho rounded p-3 border-l-4 border-vermelho">
          <p className="text-gray-400 text-xs">Mínima Manaus</p>
          <p className="text-white font-bold">09/out/2024</p>
          <p className="text-vermelho text-sm font-semibold">12,11 m</p>
        </div>
        <div className="bg-azul-marinho rounded p-3 border-l-4 border-ouro">
          <p className="text-gray-400 text-xs">Lag entre mínimas</p>
          <p className="text-white font-bold text-2xl">22 dias</p>
          <p className="text-ouro text-sm font-semibold">Parâmetro insuficiente</p>
        </div>
        <div className="bg-azul-marinho rounded p-3 border-l-4 border-vermelho">
          <p className="text-gray-400 text-xs">Mínima absoluta Itacoatiara</p>
          <p className="text-white font-bold">31/out/2024</p>
          <p className="text-vermelho text-sm font-semibold">−0,17 m (recorde)</p>
        </div>
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B3A6B" />
          <XAxis
            dataKey="data"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)}
            interval={1}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            domain={[-1, 19]}
            unit=" m"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />

          {/* Zona de lag: Manaus subindo, Itacoatiara ainda caindo */}
          <ReferenceArea
            x1="2024-10-09"
            x2="2024-10-31"
            fill="#D4922A"
            fillOpacity={0.15}
            label={{ value: "22 dias de lag", fill: "#D4922A", fontSize: 11, position: "top" }}
          />

          {/* Gatilho LWS */}
          <ReferenceLine
            y={17.7}
            stroke="#D4922A"
            strokeDasharray="5 3"
            label={{ value: "Gatilho LWS 17,7 m", fill: "#D4922A", fontSize: 10, position: "right" }}
          />
          {/* Zero (nível do mar) */}
          <ReferenceLine y={0} stroke="#A0153E" strokeDasharray="3 2" strokeOpacity={0.6} />

          {/* Evento: Manaus cruza 17,7m */}
          <ReferenceLine
            x="2024-09-10"
            stroke="#D4922A"
            strokeDasharray="4 2"
            label={{ value: "LWS ativada", fill: "#D4922A", fontSize: 10, position: "top" }}
          />
          {/* Evento: mínima Manaus */}
          <ReferenceLine
            x="2024-10-09"
            stroke="#60A5FA"
            strokeDasharray="4 2"
            label={{ value: "Min. Manaus", fill: "#60A5FA", fontSize: 10, position: "top" }}
          />
          {/* Evento: mínima Itacoatiara */}
          <ReferenceLine
            x="2024-10-31"
            stroke="#A0153E"
            strokeDasharray="4 2"
            label={{ value: "Min. Itacoatiara", fill: "#A0153E", fontSize: 10, position: "top" }}
          />

          <Line
            dataKey="manaus"
            stroke="#60A5FA"
            strokeWidth={3}
            dot={{ r: 3, fill: "#60A5FA" }}
            name="Manaus (parâmetro ANTAQ)"
            connectNulls
          />
          <Line
            dataKey="itacoatiara"
            stroke="#A0153E"
            strokeWidth={3}
            strokeDasharray="6 3"
            dot={{ r: 3, fill: "#A0153E" }}
            name="Itacoatiara (Tabocal — realidade operacional)"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 bg-azul-marinho rounded p-3 text-sm">
        <p className="text-ouro font-semibold mb-1">Implicação regulatória:</p>
        <p className="text-gray-300">
          O parâmetro ANTAQ (Manaus ≥ 17,7 m) ficou <strong className="text-white">109 dias</strong> abaixo
          do gatilho (10/set–28/dez/2024). Durante 22 desses dias, Manaus já subia enquanto Itacoatiara
          ainda registrava seus menores níveis históricos — evidenciando que o parâmetro regulatório
          não captura a realidade operacional do Tabocal.
        </p>
      </div>

      <p className="text-gray-500 text-xs mt-2">
        * Série Itacoatiara set-dez/2024 interpolada a partir de pontos-âncora (SGB/Portal Amazônia).
        Série Manaus: ANA/SACE (Régua_MAO.txt). Mínimas Itacoatiara: Portal Amazônia/ANA.
      </p>
    </div>
  );
}
