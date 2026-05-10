"use client";

import React, { useState, useEffect } from "react";
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

// ---------------------------------------------------------------------------
// Helpers para gráficos de dados hardcoded (Curicuriari / Humaitá)
// ---------------------------------------------------------------------------

function normalizaData(iso: string): string {
  return iso.slice(5); // "MM-DD"
}

function buildSerie(dados: Record<string, number>, ano: number) {
  return Object.entries(dados).map(([dt, cm]) => ({
    md: normalizaData(dt),
    [`${ano}`]: +(cm / 100).toFixed(2),
  }));
}

function mesclaHardcoded(...series: ReturnType<typeof buildSerie>[]) {
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

// ---------------------------------------------------------------------------
// Helpers para dados vindos da API (séries diárias 2016-2026)
// ---------------------------------------------------------------------------

type PontoAPI = { md: string; cota_m: number };
type SeriesAPI = Record<string, PontoAPI[]>;

function mesclaAPI(series: SeriesAPI): Record<string, unknown>[] {
  const map: Record<string, Record<string, unknown>> = {};
  for (const [ano, pontos] of Object.entries(series)) {
    for (const p of pontos) {
      if (!map[p.md]) map[p.md] = { md: p.md };
      map[p.md][ano] = p.cota_m;
    }
  }
  return Object.values(map).sort((a, b) =>
    String(a.md).localeCompare(String(b.md))
  );
}

// ---------------------------------------------------------------------------
// Hook para buscar série histórica da API
// ---------------------------------------------------------------------------

function useSerieHistorica(estacao: string | null) {
  const [dados, setDados] = useState<SeriesAPI | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!estacao) return;
    setLoading(true);
    setDados(null);
    fetch(`/api/historico?estacao=${estacao}&anos=2024,2025,2026`)
      .then((r) => r.json())
      .then((d) => { setDados(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [estacao]);

  return { dados, loading };
}

// ---------------------------------------------------------------------------
// Gráficos hardcoded (Curicuriari e Humaitá)
// ---------------------------------------------------------------------------

function ChartCuricuriari() {
  const dados = mesclaHardcoded(
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

// ---------------------------------------------------------------------------
// Gráfico para estações com série histórica completa (Manaus / Itacoatiara)
// ---------------------------------------------------------------------------

interface ChartHistoricoProps {
  estacao: "Manaus" | "Itacoatiara" | "Curicuriari" | "Humaita" | "Borba" | "Manacapuru" | "PortoVelho";
  domain: [number, number];
  gatilho_lws?: number;
  p10: number;
  p90: number;
  mediana: number;
  fallback?: React.ReactNode;
}

function ChartHistorico({ estacao, domain, gatilho_lws, p10, p90, mediana, fallback }: ChartHistoricoProps) {
  const { dados, loading } = useSerieHistorica(estacao);

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
        Carregando série histórica…
      </div>
    );
  }

  // Sem dados ou todos os anos vazios → usa fallback (gráfico hardcoded)
  const temDados = dados && Object.values(dados).some((a) => a.length > 0);
  if (!temDados) {
    return fallback ? <>{fallback}</> : (
      <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
        Execute <code className="bg-azul-marinho px-1 rounded">npx tsx scripts/fetch-historico.ts</code> para carregar dados históricos.
      </div>
    );
  }

  const serie = mesclaAPI(dados) as Record<string, unknown>[];

  const totais = Object.entries(dados).map(([ano, pts]) => `${ano}: ${pts.length} leituras`).join(" · ");

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B3A6B" />
          <XAxis
            dataKey="md"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            interval={Math.floor(serie.length / 10)}
          />
          <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} unit=" m" domain={domain} />
          <Tooltip
            contentStyle={{ backgroundColor: "#0A1A4A", border: "1px solid #1B3A6B", color: "#fff" }}
            formatter={(v: unknown) => [`${v} m`, ""]}
            labelFormatter={(l) => `Dia ${l}`}
          />
          <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
          <ReferenceArea y1={p10} y2={p90} fill="#1B3A6B" fillOpacity={0.5} />
          <ReferenceLine y={p10}    stroke="#A0153E" strokeDasharray="4 2" label={{ value: "P10", fill: "#A0153E", fontSize: 10 }} />
          <ReferenceLine y={mediana} stroke="#9CA3AF" strokeDasharray="4 2" label={{ value: "Mediana", fill: "#9CA3AF", fontSize: 10 }} />
          <ReferenceLine y={p90}    stroke="#00C04B" strokeDasharray="4 2" label={{ value: "P90", fill: "#00C04B", fontSize: 10 }} />
          {gatilho_lws && (
            <ReferenceLine y={gatilho_lws} stroke="#D4922A" strokeDasharray="6 3"
              label={{ value: "Ref. 17,7 m", fill: "#D4922A", fontSize: 10 }} />
          )}
          <Line dataKey="2024" stroke="#A0153E" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="2024 (mega-seca)" connectNulls={false} />
          <Line dataKey="2025" stroke="#00C04B" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="2025" connectNulls={false} />
          <Line dataKey="2026" stroke="#60A5FA" strokeWidth={2.5} dot={false} name="2026" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-gray-500 text-xs mt-1">{totais}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opções do dropdown
// ---------------------------------------------------------------------------

const OPCOES = [
  { id: "duplo",         label: "Duplo: Curicuriari × Humaitá (IDN)" },
  { id: "curicuriari",   label: "Curicuriari — Negro alto" },
  { id: "humaita",       label: "Humaitá — Rio Madeira" },
  { id: "duplo_mao_ita", label: "Duplo: Manaus × Itacoatiara (lag 22 dias)" },
  { id: "manaus",        label: "Manaus — Rio Negro (2016–2026)" },
  { id: "itacoatiara",   label: "Itacoatiara — Rio Amazonas (2016–2026)" },
  { id: "borba",         label: "Borba — Rio Madeira (2016–2026)" },
  { id: "manacapuru",    label: "Manacapuru — Rio Solimões (2016–2026)" },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

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

      {opcao === "duplo" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-verde text-sm font-semibold mb-2">
              Curicuriari — Negro alto
              <span className="ml-2 text-vermelho font-normal text-xs">⚠ Colapso 2026</span>
            </p>
            <ChartHistorico
              estacao="Curicuriari"
              domain={[4, 14]}
              p10={LIMIARES.Curicuriari.p10}
              p90={LIMIARES.Curicuriari.p90}
              mediana={LIMIARES.Curicuriari.mediana}
              fallback={<ChartCuricuriari />}
            />
          </div>
          <div>
            <p className="text-ouro text-sm font-semibold mb-2">
              Humaitá — Rio Madeira
              <span className="ml-2 text-verde font-normal text-xs">✓ Acima da média</span>
            </p>
            <ChartHistorico
              estacao="Humaita"
              domain={[8, 25]}
              p10={LIMIARES.Humaita.p10}
              p90={LIMIARES.Humaita.p90}
              mediana={LIMIARES.Humaita.mediana}
              fallback={<ChartHumaita />}
            />
          </div>
        </div>
      )}

      {opcao === "curicuriari" && (
        <div>
          <p className="text-verde text-sm font-semibold mb-2">
            Curicuriari — Negro alto
            <span className="ml-2 text-vermelho font-normal text-xs">⚠ Colapso 2026</span>
          </p>
          <ChartHistorico
            estacao="Curicuriari"
            domain={[4, 14]}
            p10={LIMIARES.Curicuriari.p10}
            p90={LIMIARES.Curicuriari.p90}
            mediana={LIMIARES.Curicuriari.mediana}
            fallback={<ChartCuricuriari />}
          />
        </div>
      )}

      {opcao === "humaita" && (
        <div>
          <p className="text-ouro text-sm font-semibold mb-2">Humaitá — Rio Madeira</p>
          <ChartHistorico
            estacao="Humaita"
            domain={[8, 25]}
            p10={LIMIARES.Humaita.p10}
            p90={LIMIARES.Humaita.p90}
            mediana={LIMIARES.Humaita.mediana}
            fallback={<ChartHumaita />}
          />
        </div>
      )}

      {opcao === "manaus" && (
        <div>
          <p className="text-blue-300 text-sm font-semibold mb-2">
            Manaus — Rio Negro
            <span className="ml-2 text-ouro font-normal text-xs">Referência histórica: 17,7 m</span>
          </p>
          <ChartHistorico
            estacao="Manaus"
            domain={[10, 31]}
            gatilho_lws={17.7}
            p10={LIMIARES.Manaus.p10}
            p90={LIMIARES.Manaus.p90}
            mediana={LIMIARES.Manaus.mediana}
          />
        </div>
      )}

      {opcao === "itacoatiara" && (
        <div>
          <p className="text-blue-300 text-sm font-semibold mb-2">
            Itacoatiara — Rio Amazonas
            <span className="ml-2 text-vermelho font-normal text-xs">Mínima histórica −0,17 m em out/2024</span>
          </p>
          <ChartHistorico
            estacao="Itacoatiara"
            domain={[-2, 15]}
            p10={LIMIARES.Itacoatiara.p10}
            p90={LIMIARES.Itacoatiara.p90}
            mediana={LIMIARES.Itacoatiara.mediana}
          />
        </div>
      )}

      {opcao === "duplo_mao_ita" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-2">
              Manaus
              <span className="ml-2 text-ouro font-normal text-xs">Referência histórica: 17,7 m</span>
            </p>
            <ChartHistorico
              estacao="Manaus"
              domain={[10, 31]}
              gatilho_lws={17.7}
              p10={LIMIARES.Manaus.p10}
              p90={LIMIARES.Manaus.p90}
              mediana={LIMIARES.Manaus.mediana}
            />
          </div>
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-2">
              Itacoatiara
              <span className="ml-2 text-vermelho font-normal text-xs">Lag de 22 dias vs Manaus em 2024</span>
            </p>
            <ChartHistorico
              estacao="Itacoatiara"
              domain={[-2, 15]}
              p10={LIMIARES.Itacoatiara.p10}
              p90={LIMIARES.Itacoatiara.p90}
              mediana={LIMIARES.Itacoatiara.mediana}
            />
          </div>
        </div>
      )}

      {opcao === "borba" && (
        <div>
          <p className="text-blue-300 text-sm font-semibold mb-2">Borba — Rio Madeira (proxy Madeira médio)</p>
          <ChartHistorico
            estacao="Borba"
            domain={[2, 22]}
            p10={LIMIARES.Borba.p10}
            p90={LIMIARES.Borba.p90}
            mediana={LIMIARES.Borba.mediana}
          />
        </div>
      )}

      {opcao === "manacapuru" && (
        <div>
          <p className="text-blue-300 text-sm font-semibold mb-2">Manacapuru — Rio Solimões (barômetro da cheia)</p>
          <ChartHistorico
            estacao="Manacapuru"
            domain={[5, 22]}
            p10={LIMIARES.Manacapuru.p10}
            p90={LIMIARES.Manacapuru.p90}
            mediana={LIMIARES.Manacapuru.mediana}
          />
        </div>
      )}

      <p className="text-gray-500 text-xs mt-3">
        Faixa sombreada = P10–P90 histórico. Linhas tracejadas = referências percentílicas.
        {(opcao === "manaus" || opcao === "itacoatiara" || opcao === "duplo_mao_ita") &&
          " Série diária 2016–2026 via CSV ANA/SEMA."
        }
      </p>
    </div>
  );
}
