"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { calculaIDN, classificaIDN } from "@/lib/calcula-idn";
import { calculaIDNVazao } from "@/lib/calcula-idn-vazao";
import { SUB_BACIAS, type EstacaoComDOY } from "@/lib/sub-bacias";
import { SUB_BACIAS_VAZAO, type EstacaoVazao } from "@/lib/sub-bacias-vazao";
import { CALIBRACAO_IDN } from "@/lib/limiares-idn";
import { INCERTEZA_IDN } from "@/lib/incerteza-idn";
import { PCA_VALIDACAO } from "@/lib/pca-validacao";
import HMMTransicaoRegime from "./HMMTransicaoRegime";
import type { CotaIDN, VazaoIDN } from "@/lib/fetch-dados";
import { DADOS_ATUAIS, type DadosEstacao } from "@/lib/dados-historicos";
import type { PontoIDN } from "@/lib/ana-idn-series";

// Velocímetro SVG. As zonas coloridas seguem `CALIBRACAO_IDN.fronteiras`
// (GMM-3comp, série 2016–2023) — mesma fonte de verdade da `classificaIDN`.
function Velocimetro({ idn }: { idn: number }) {
  const idnVis = Number.isFinite(idn) ? Math.max(-1, Math.min(1, idn)) : 0;
  const cx = 100, cy = 90, rArc = 90, rPtr = 70;

  function pt(v: number, r: number) {
    const theta = ((90 - v * 90) * Math.PI) / 180;
    return {
      x: +(cx + r * Math.cos(theta)).toFixed(2),
      y: +(cy - r * Math.sin(theta)).toFixed(2),
    };
  }

  const fSul   = CALIBRACAO_IDN.fronteiras[0];        // ≈ −0,15
  const fNorte = CALIBRACAO_IDN.fronteiras[1];        // ≈ +0,56
  const pSul   = pt(fSul, rArc);
  const pNorte = pt(fNorte, rArc);
  const ptr    = pt(idnVis, rPtr);

  const cor = idn > fNorte ? "#D4922A" : idn < fSul ? "#A0153E" : "#00C04B";

  return (
    <svg viewBox="-4 -8 208 124" className="w-full max-w-[240px] mx-auto">
      <path d="M 10 90 A 90 90 0 0 1 190 90" fill="none" stroke="#2c2c2c" strokeWidth="18" strokeLinecap="round" />
      <path d={`M 10 90 A 90 90 0 0 1 ${pSul.x} ${pSul.y}`}
            fill="none" stroke="#A0153E" strokeWidth="18" strokeLinecap="round" opacity={0.75} />
      <path d={`M ${pSul.x} ${pSul.y} A 90 90 0 0 1 ${pNorte.x} ${pNorte.y}`}
            fill="none" stroke="#00C04B" strokeWidth="18" strokeLinecap="round" opacity={0.75} />
      <path d={`M ${pNorte.x} ${pNorte.y} A 90 90 0 0 1 190 90`}
            fill="none" stroke="#D4922A" strokeWidth="18" strokeLinecap="round" opacity={0.75} />

      <line x1={cx} y1={cy} x2={ptr.x} y2={ptr.y} stroke={cor} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={cor} />

      <text x="2"   y="108" fill="#6B7280" fontSize="9" textAnchor="start">−1</text>
      <text x="100" y="108" fill="#6B7280" fontSize="9" textAnchor="middle">0</text>
      <text x="198" y="108" fill="#6B7280" fontSize="9" textAnchor="end">+1</text>
    </svg>
  );
}

export default function DessincronizacaoGauge({
  dados = DADOS_ATUAIS,
  cotasIDN,
  vazoesIDN,
  serieIDN = [],
}: {
  dados?: Record<string, DadosEstacao>;
  cotasIDN?: Partial<Record<EstacaoComDOY, CotaIDN>>;
  vazoesIDN?: Partial<Record<EstacaoVazao, VazaoIDN>>;
  serieIDN?: PontoIDN[];
}) {
  // Monta o mapa de cotas: prioriza cotasIDN (API ANA), cai para dados do painel.
  // SGC removido em mai/2026 — sem telemetria ANA viva; posicaoSubBacia()
  // renormaliza automaticamente os pesos quando a estação está ausente.
  const cotasParaIDN: Partial<Record<EstacaoComDOY, number>> = {
    Humaita:     cotasIDN?.Humaita?.cota_m     ?? dados.Humaita?.cota_m,
    PortoVelho:  cotasIDN?.PortoVelho?.cota_m  ?? dados.PortoVelho?.cota_m,
    Manicore:    cotasIDN?.Manicore?.cota_m,
    Curicuriari: cotasIDN?.Curicuriari?.cota_m,
    Caracarai:   cotasIDN?.Caracarai?.cota_m,
    Serrinha:    cotasIDN?.Serrinha?.cota_m,
    Moura:       cotasIDN?.Moura?.cota_m,
    Labrea:      cotasIDN?.Labrea?.cota_m,
    Abuna:       cotasIDN?.Abuna?.cota_m,
  };

  // dataRef: data mais recente disponível entre as estações IDN.
  const dataRef =
    Object.values(cotasIDN ?? {})
      .map((v) => v?.ultima_atualizacao ?? "")
      .filter(Boolean)
      .sort()
      .reverse()[0] ??
    new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });

  const resultadoIDN = calculaIDN(cotasParaIDN, dataRef);
  const idnAtual = resultadoIDN.idn;
  const classAtual = classificaIDN(idnAtual);
  const nNorte = resultadoIDN.estacoes_norte.length;
  const nSul   = resultadoIDN.estacoes_sul.length;

  // IDN técnico em vazão (m³/s) — só calcula se vazoesIDN foi passado
  const temVazao = vazoesIDN && Object.keys(vazoesIDN).length > 0;
  const resultadoVazao = temVazao
    ? calculaIDNVazao(
        Object.fromEntries(
          Object.entries(vazoesIDN).map(([k, v]) => [k, v?.vazao_m3s])
        ) as Partial<Record<EstacaoVazao, number>>,
        dataRef
      )
    : null;

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="mb-4">
        <p className="text-gray-400 text-sm">
          Negro/Norte: <strong className="text-white">{resultadoIDN.pos_norte.toFixed(2)}</strong>
          {" · "}
          Madeira-Purus/Sul: <strong className="text-white">{resultadoIDN.pos_sul.toFixed(2)}</strong>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Norte: {SUB_BACIAS.Norte.membros.map(m => m.estacao).join(", ")} ·{" "}
          Sul: {SUB_BACIAS.Sul.membros.map(m => m.estacao).join(", ")}
        </p>
      </div>

      {/* Gauge + gráfico */}
      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Velocímetro */}
        <div className="flex flex-col items-center gap-2">
          <Velocimetro idn={idnAtual} />
          <div className="text-center">
            <p className="text-4xl font-extrabold" style={{ color: classAtual.cor }}>
              {idnAtual > 0 ? "+" : ""}{idnAtual.toFixed(2)}
            </p>
            <p className="font-bold text-lg mt-1" style={{ color: classAtual.cor }}>
              {classAtual.regime}
            </p>
            <p className="text-gray-400 text-sm">{classAtual.descricao}</p>
            <p className="text-gray-600 text-[10px] mt-2 tracking-wide">
              Fronteiras GMM:{" "}
              <span className="text-vermelho/80">≤ {CALIBRACAO_IDN.fronteiras[0].toFixed(2).replace(".", ",")}</span>
              {" · "}
              <span className="text-verde/80">neutro</span>
              {" · "}
              <span className="text-ouro/80">≥ +{CALIBRACAO_IDN.fronteiras[1].toFixed(2).replace(".", ",")}</span>
            </p>
          </div>
        </div>

        {/* Série histórica */}
        <div>
          <p className="text-gray-300 text-sm font-semibold mb-2">Evolução histórica do IDN (2016–2025)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={serieIDN} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
              <XAxis
                dataKey="data"
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(0, 4)}
                interval={65}
              />
              <YAxis
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                domain={[-1.2, 1.2]}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #2c2c2c", color: "#fff", fontSize: 12 }}
                formatter={(v: unknown) => [String(v), "IDN"]}
                labelFormatter={(l) => { const [a, m, d] = String(l).split("-"); return d ? `${d}/${m}/${a}` : String(l); }}
              />
              <ReferenceArea y1={CALIBRACAO_IDN.fronteiras[1]} y2={1.2} fill="#D4922A" fillOpacity={0.15} />
              <ReferenceArea y1={CALIBRACAO_IDN.fronteiras[0]} y2={CALIBRACAO_IDN.fronteiras[1]} fill="#00C04B" fillOpacity={0.10} />
              <ReferenceArea y1={-1.2} y2={CALIBRACAO_IDN.fronteiras[0]} fill="#A0153E" fillOpacity={0.15} />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="4 2" />
              <ReferenceLine y={CALIBRACAO_IDN.fronteiras[1]} stroke="#D4922A" strokeDasharray="3 2" strokeOpacity={0.6} />
              <ReferenceLine y={CALIBRACAO_IDN.fronteiras[0]} stroke="#A0153E" strokeDasharray="3 2" strokeOpacity={0.6} />
              <Line dataKey="idn" stroke="#60A5FA" strokeWidth={1.5} dot={false} name="IDN" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legenda de regimes */}
      <div className="grid grid-cols-3 gap-2 text-xs mt-5">
        <div className="bg-azul-marinho rounded p-2 text-center border border-vermelho/40">
          <span className="text-vermelho font-bold block">Driver Sul</span>
          <span className="text-gray-500 block">{(CALIBRACAO_IDN.componentes[0].pi*100).toFixed(0)}% do tempo historicamente</span>
        </div>
        <div className="bg-azul-marinho rounded p-2 text-center border border-verde/40">
          <span className="text-verde font-bold block">Sincronizado</span>
          <span className="text-gray-500 block">{(CALIBRACAO_IDN.componentes[1].pi*100).toFixed(0)}% do tempo historicamente</span>
        </div>
        <div className="bg-azul-marinho rounded p-2 text-center border border-ouro/40">
          <span className="text-ouro font-bold block">Driver Norte</span>
          <span className="text-gray-500 block">{(CALIBRACAO_IDN.componentes[2].pi*100).toFixed(0)}% do tempo historicamente</span>
        </div>
      </div>

      {/* Previsão de regime via HMM */}
      <div className="mt-4">
        <HMMTransicaoRegime idnAtual={idnAtual} />
      </div>
    </div>
  );
}
