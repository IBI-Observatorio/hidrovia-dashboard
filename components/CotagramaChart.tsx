"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  CURICURIARI_2024, CURICURIARI_2025, CURICURIARI_2026,
  HUMAITA_2026,
} from "@/lib/dados-historicos";
import { LIMIARES } from "@/lib/limiares";

// Normaliza os dados por mês-dia para sobreposição de anos
function normalizaData(iso: string): string {
  return iso.slice(5); // "MM-DD"
}

function buildSerie(dados: Record<string, number>, ano: number) {
  return Object.entries(dados).map(([dt, cm]) => ({
    md: normalizaData(dt),
    data: dt,
    [`${ano}`]: +(cm / 100).toFixed(2),
  }));
}

// Mescla séries pelo campo "md"
function mescla(...series: ReturnType<typeof buildSerie>[]) {
  const map: Record<string, Record<string, unknown>> = {};
  for (const serie of series) {
    for (const ponto of serie) {
      if (!map[ponto.md]) map[ponto.md] = { md: ponto.md };
      Object.assign(map[ponto.md], ponto);
    }
  }
  return Object.values(map).sort((a, b) =>
    String(a.md).localeCompare(String(b.md))
  );
}

const OPCOES = [
  { id: "curicuriari", label: "Curicuriari — Negro alto" },
  { id: "humaita",     label: "Humaitá — Rio Madeira"   },
  { id: "duplo",       label: "Duplo: Curicuriari × Humaitá" },
];

function ChartCuricuriari() {
  const dados = mescla(
    buildSerie(CURICURIARI_2024, 2024),
    buildSerie(CURICURIARI_2025, 2025),
    buildSerie(CURICURIARI_2026, 2026),
  ) as Record<string, unknown>[];

  const { p10, p90, mediana } = LIMIARES.Curicuriari;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1B3A6B" />
        <XAxis dataKey="md" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} unit=" m" domain={[4, 14]} />
        <Tooltip
          contentStyle={{ backgroundColor: "#0A1A4A", border: "1px solid #1B3A6B", color: "#fff" }}
          formatter={(v: unknown) => [`${v} m`, ""]}
        />
        <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
        <ReferenceArea y1={p10} y2={p90} fill="#1B3A6B" fillOpacity={0.5} />
        <ReferenceLine y={p10}    stroke="#A0153E" strokeDasharray="4 2" label={{ value: "P10", fill: "#A0153E", fontSize: 10 }} />
        <ReferenceLine y={mediana} stroke="#9CA3AF" strokeDasharray="4 2" label={{ value: "Mediana", fill: "#9CA3AF", fontSize: 10 }} />
        <ReferenceLine y={p90}    stroke="#00C04B" strokeDasharray="4 2" label={{ value: "P90", fill: "#00C04B", fontSize: 10 }} />
        <Line dataKey="2024" stroke="#A0153E" strokeWidth={2} strokeDasharray="5 3" dot={false} name="2024 (mega-seca)" />
        <Line dataKey="2025" stroke="#00C04B" strokeWidth={2} strokeDasharray="5 3" dot={false} name="2025" />
        <Line dataKey="2026" stroke="#60A5FA" strokeWidth={3} dot={{ r: 3, fill: "#60A5FA" }} name="2026" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartHumaita() {
  const dados = buildSerie(HUMAITA_2026, 2026).map((d) => ({
    md: d.md,
    "2026": d["2026"],
  }));
  const { p10, p90, mediana } = LIMIARES.Humaita;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1B3A6B" />
        <XAxis dataKey="md" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} unit=" m" domain={[8, 25]} />
        <Tooltip
          contentStyle={{ backgroundColor: "#0A1A4A", border: "1px solid #1B3A6B", color: "#fff" }}
          formatter={(v: unknown) => [`${v} m`, ""]}
        />
        <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
        <ReferenceArea y1={p10} y2={p90} fill="#1B3A6B" fillOpacity={0.5} />
        <ReferenceLine y={p10}    stroke="#A0153E" strokeDasharray="4 2" label={{ value: "P10", fill: "#A0153E", fontSize: 10 }} />
        <ReferenceLine y={mediana} stroke="#9CA3AF" strokeDasharray="4 2" label={{ value: "Mediana", fill: "#9CA3AF", fontSize: 10 }} />
        <ReferenceLine y={p90}    stroke="#00C04B" strokeDasharray="4 2" label={{ value: "P90", fill: "#00C04B", fontSize: 10 }} />
        <Line dataKey="2026" stroke="#D4922A" strokeWidth={3} dot={{ r: 3, fill: "#D4922A" }} name="2026 (Madeira — driver Sul)" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function CotagramaChart() {
  const [opcao, setOpcao] = useState<string>("duplo");

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white font-bold text-lg">Comparação Histórica</h2>
          <p className="text-gray-400 text-sm">Cotagramas 2024 × 2025 × 2026 + faixa P10–P90</p>
        </div>
        <select
          value={opcao}
          onChange={(e) => setOpcao(e.target.value)}
          className="bg-azul-marinho text-white text-sm rounded px-3 py-1.5 border border-white/10"
        >
          {OPCOES.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      {opcao === "duplo" ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-verde text-sm font-semibold mb-2">
              Curicuriari — Negro alto
              <span className="ml-2 text-vermelho font-normal text-xs">⚠ Colapso 2026</span>
            </p>
            <ChartCuricuriari />
          </div>
          <div>
            <p className="text-ouro text-sm font-semibold mb-2">
              Humaitá — Rio Madeira
              <span className="ml-2 text-verde font-normal text-xs">✓ Acima da média</span>
            </p>
            <ChartHumaita />
          </div>
        </div>
      ) : opcao === "curicuriari" ? (
        <div>
          <p className="text-verde text-sm font-semibold mb-2">Curicuriari — Negro alto</p>
          <ChartCuricuriari />
        </div>
      ) : (
        <div>
          <p className="text-ouro text-sm font-semibold mb-2">Humaitá — Rio Madeira</p>
          <ChartHumaita />
        </div>
      )}

      <p className="text-gray-500 text-xs mt-3">
        Faixa sombreada = P10–P90 histórico. Linhas tracejadas = referências percentílicas.
      </p>
    </div>
  );
}
