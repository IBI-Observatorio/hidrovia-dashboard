"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";

// → ajuste o alias se seu tsconfig não usar "@/": troque por "../lib/..." etc.
import {
  calculaITC_Agora,
  calculaITC_Integracao,
  freteEquivalente,
  faixaITC,
  ITC_HISTORICO_CALCULADO,
  PESOS_ITC,
} from "@/lib/itc";
import {
  MOVIMENTACAO_MI_T,
  MOVIMENTACAO_YOY_2025,
  FRETE_CASCAVEL_PARANAGUA,
  FRETE_ROD_REF,
  FRETE_FER_DESCONTO,
  FRETE_SORRISO_PARANAGUA,
  SPLIT_FERROVIARIO_PARANAGUA,
  SPLIT_FERROVIARIO_BENCHMARK,
  SPLIT_META_INTEGRACAO,
  ESPERA_LONGO_CURSO_H,
  CUSTO_ESPERA_BI_ANO,
  VAGOES_DIA_ANTES,
  VAGOES_DIA_MOEGAO,
  MOEGAO_INVESTIMENTO_MI,
  ultimoAnual,
} from "@/lib/series-corredor";

/**
 * Painel: Corredor Paranaguá — Porto × Ferrovia × Frete × Espera.
 * Observatório de Infraestrutura de Transportes — IBI/FPPA.
 *
 * Dados e índice vêm INTEGRALMENTE de lib/series-corredor.ts e lib/itc.ts.
 * Este arquivo é só apresentação. Quando o ETL entrar, trocar os imports estáticos
 * por loadSeriesCorredor() num useEffect — o resto do componente não muda.
 */

// ------------------------------------------------------------------
// Tokens de UI (chrome). Faixas/cores do índice vêm de lib/itc.ts.
// ------------------------------------------------------------------
const C = {
  bg: "#111827",
  text: "#e5e7eb",
  muted: "#9ca3af",
  faint: "#6b7280",
  green: "#00a652",
  blue: "#0099d8",
  ouro: "#D4922A",
  vermelho: "#A0153E",
  alerta: "#c1322f",
  road: "#3a4150",
} as const;
const GRAD = "linear-gradient(90deg,#00a652,#0099d8)";
const FONT = '"Geist","Inter",system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

const card: React.CSSProperties = {
  background: "linear-gradient(180deg,#2c2c2c 0%,#161b26 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "20px 22px",
  position: "relative",
  overflow: "hidden",
};
const topbar: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: GRAD };
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, fontWeight: 600 };

// ------------------------------------------------------------------
// Hooks / helpers de UI
// ------------------------------------------------------------------
function useCountUp(target: number, decimals = 0, duration = 1100): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return Number(val.toFixed(decimals));
}

type SparkPoint = number | { valor: number };

function Spark({ data, gid, h = 38 }: { data: SparkPoint[]; gid: string; h?: number }) {
  const w = 120;
  const vals = data.map((d) => (typeof d === "number" ? d : d.valor));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const xs = vals.map((_, i) => (i / (vals.length - 1)) * w);
  const ys = vals.map((v) => h - 5 - ((v - min) / (max - min || 1)) * (h - 10));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0%" stopColor="#00a652" />
          <stop offset="100%" stopColor="#0099d8" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.8" fill="#0099d8" stroke="#111827" strokeWidth="1.5" />
    </svg>
  );
}

function Gauge({ value }: { value: number }) {
  const v = useCountUp(value, 0, 1000);
  const len = Math.PI * 100;
  const dash = (value / 100) * len;
  const f = faixaITC(value);
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 220 128" style={{ width: "100%", maxWidth: 250 }}>
        <defs>
          <linearGradient id="gtens" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00a652" />
            <stop offset="50%" stopColor="#D4922A" />
            <stop offset="100%" stopColor="#A0153E" />
          </linearGradient>
        </defs>
        <path d="M10,114 A100,100 0 0 1 210,114" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M10,114 A100,100 0 0 1 210,114"
          fill="none"
          stroke="url(#gtens)"
          strokeWidth="14"
          strokeLinecap="round"
          style={{ strokeDasharray: `${dash} 1000`, transition: "stroke-dasharray .9s ease" }}
        />
        <text x="110" y="90" textAnchor="middle" fill={C.text} fontSize="42" fontWeight="700" fontFamily={FONT}>{v}</text>
        <text x="110" y="112" textAnchor="middle" fill={C.muted} fontSize="11" fontFamily={FONT}>ITC · de 100</text>
      </svg>
      <div style={{ fontSize: 14, color: C.text, marginTop: 2 }}>
        Tensão do corredor: <strong style={{ color: f.cor }}>{f.nome}</strong>
      </div>
    </div>
  );
}

function CompBar({ label, value, weight, color }: { label: string; value: number; weight: number; color: string }) {
  const v = useCountUp(value, 0, 900);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: C.text }}>
          {label} <span style={{ color: C.faint }}>· peso {Math.round(weight * 100)}%</span>
        </span>
        <span style={{ color, fontWeight: 700 }}>{v}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, transition: "width .8s ease" }} />
      </div>
    </div>
  );
}

function SplitBar({ rail, label, note, highlight }: { rail: number; label: string; note: string; highlight?: boolean }) {
  const r = Math.round(rail);
  const road = 100 - r;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: C.text, fontWeight: 600 }}>{label}</span>
        <span style={{ color: C.muted }}>{note}</span>
      </div>
      <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${r}%`, background: highlight ? GRAD : C.green, transition: "width .8s ease", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0b1220", minWidth: 30 }}>{r}%</div>
        <div style={{ width: `${road}%`, background: C.road, transition: "width .8s ease", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{road}%</div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  tag: string;
  tagColor: string;
  value: string;
  unit: string;
  delta?: string;
  sub: string;
  insight: string;
  spark?: ReactNode;
  sparkCaption?: string;
  children?: ReactNode;
}
function MetricCard({ tag, tagColor, value, unit, delta, sub, insight, spark, sparkCaption, children }: MetricCardProps) {
  return (
    <div style={{ ...card, flex: "1 1 230px", minWidth: 220 }}>
      <div style={topbar} />
      <div style={{ ...eyebrow, color: tagColor }}>{tag}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 14, color: C.muted }}>{unit}</span>
        {delta && <span style={{ fontSize: 12, color: C.green, marginLeft: 2 }}>{delta}</span>}
      </div>
      {spark && (
        <div style={{ marginTop: 10 }}>
          {spark}
          <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{sparkCaption}</div>
        </div>
      )}
      {children}
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10 }}>{sub}</div>
      <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 9 }}>{insight}</div>
    </div>
  );
}

function Step({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const h = Math.max(8, (value / max) * 110);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ height: 110, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ width: 54, height: h, background: color, borderRadius: "6px 6px 0 0", transition: "height .8s ease" }} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.muted }}>{label}</div>
    </div>
  );
}

function TimelineChip({ date, label, color, crit }: { date: string; label: string; color: string; crit?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 128, flex: "1 1 128px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, boxShadow: crit ? `0 0 0 4px ${color}22` : "none" }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: crit ? color : C.text }}>{date}</span>
      </div>
      <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

// ------------------------------------------------------------------
// Componente
// ------------------------------------------------------------------
export default function PainelCorredorParanagua() {
  const [cenario, setCenario] = useState<"hoje" | "integracao">("hoje");
  const railShare = cenario === "hoje" ? SPLIT_FERROVIARIO_PARANAGUA : SPLIT_META_INTEGRACAO;

  const itc = cenario === "hoje" ? calculaITC_Agora() : calculaITC_Integracao();

  const freteCorredor = freteEquivalente(railShare);
  const baseline = freteEquivalente(SPLIT_FERROVIARIO_PARANAGUA);
  const reducao = ((baseline - freteCorredor) / baseline) * 100;

  const railPct = useCountUp(railShare * 100, 0, 900);
  const blendVal = useCountUp(freteCorredor, 0, 900);

  const movAtual = ultimoAnual(MOVIMENTACAO_MI_T).valor;
  const ferEstimado = Math.round(FRETE_ROD_REF * (1 - FRETE_FER_DESCONTO));
  const histMax = Math.max(...ITC_HISTORICO_CALCULADO.map((d) => d.valor));

  const btn = (id: "hoje" | "integracao", txt: string) => (
    <button
      onClick={() => setCenario(id)}
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        border: cenario === id ? "1px solid transparent" : "1px solid rgba(255,255,255,0.15)",
        background: cenario === id ? GRAD : "transparent",
        color: cenario === id ? "#0b1220" : C.muted,
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: FONT,
      }}
    >
      {txt}
    </button>
  );

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: FONT, padding: "28px 20px", minHeight: "100%" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* topo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 26, height: 4, background: GRAD, borderRadius: 2 }} />
              <span style={eyebrow}>Observatório de Infraestrutura de Transportes · IBI/FPPA</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: "12px 0 4px" }}>Corredor Paranaguá — Porto × Ferrovia × Frete × Espera</h1>
            <p style={{ fontSize: 14.5, color: C.muted, margin: 0, maxWidth: 700, lineHeight: 1.5 }}>
              A capacidade que o porto cria, a malha que precisa entregá-la, o custo que sobra para a estrada e o tempo que o navio perde parado — em um índice só.
            </p>
          </div>
          <span style={{ fontSize: 11, color: C.ouro, border: `1px solid ${C.ouro}55`, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>Séries oficiais + composto IBI</span>
        </div>

        {/* toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: C.faint }}>Cenário:</span>
          {btn("hoje", "Hoje (80/20)")}
          {btn("integracao", "Com integração ferroviária (meta 50/50)")}
        </div>

        {/* hero: ITC */}
        <div style={{ ...card, marginTop: 16, display: "flex", gap: 26, flexWrap: "wrap" }}>
          <div style={topbar} />
          <div style={{ flex: "0 0 240px", maxWidth: 280 }}>
            <Gauge value={itc.total} />
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 6 }}>Trajetória reconstruída do ITC</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                {ITC_HISTORICO_CALCULADO.map((d) => (
                  <div key={d.ano} style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ height: 40, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <div style={{ width: "70%", height: `${(d.valor / histMax) * 40}px`, background: d.faixa.cor, borderRadius: "4px 4px 0 0" }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.text, fontWeight: 600, marginTop: 5, lineHeight: 1.2 }}>{d.valor}</div>
                    <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.2 }}>{d.ano}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ flex: "1 1 360px" }}>
            <div style={eyebrow}>Composição do índice</div>
            <div style={{ marginTop: 12 }}>
              <CompBar label="Lacuna ferroviária" value={itc.comp.ferrovia} weight={PESOS_ITC.ferrovia} color={C.ouro} />
              <CompBar label="Pressão de frete" value={itc.comp.frete} weight={PESOS_ITC.frete} color={C.alerta} />
              <CompBar label="Pressão portuária" value={itc.comp.porto} weight={PESOS_ITC.porto} color={C.green} />
              <CompBar label="Custo de espera" value={itc.comp.espera} weight={PESOS_ITC.espera} color={C.blue} />
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#dbe2ea", marginTop: 12 }}>
              {cenario === "hoje" ? (
                <>
                  O porto avança à frente do plano ({movAtual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} Mi t, +{Math.round(MOVIMENTACAO_YOY_2025)}%), mas o trilho responde por <strong style={{ color: C.alerta }}>1 de cada 5 cargas</strong> e a concessão da malha vence em fev/2027. A lacuna ferroviária domina o índice.
                </>
              ) : (
                <>
                  Levando o trilho a <strong style={{ color: C.blue }}>metade do split</strong>, a lacuna ferroviária e a pressão de frete recuam — o índice migra de <strong style={{ color: C.alerta }}>Elevada</strong> para <strong style={{ color: C.ouro }}>Moderada</strong>. O porto deixa de empurrar contra um gargalo.
                </>
              )}
            </p>
          </div>
        </div>

        {/* cruzamento — 4 vértices */}
        <div style={{ ...eyebrow, marginTop: 26, marginBottom: 10 }}>Os quatro vértices</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <MetricCard
            tag="Porto · o empurrão"
            tagColor={C.green}
            value={movAtual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
            unit="Mi t (2025)"
            delta={`▲ +${Math.round(MOVIMENTACAO_YOY_2025)}%`}
            spark={<Spark data={MOVIMENTACAO_MI_T} gid="sp_mov" />}
            sparkCaption="Movimentação Portos do Paraná, 2022→2025"
            sub={`Descarga ferroviária ${VAGOES_DIA_ANTES} → ${VAGOES_DIA_MOEGAO} vagões/dia (Moegão, ~95%). Calado 12,8 m; canal +35%.`}
            insight="Capacidade desenhada para o trilho — só vira ganho se a malha entregar."
          />
          <MetricCard
            tag="Ferrovia · o elo frágil"
            tagColor={C.ouro}
            value={`${railPct}%`}
            unit="do escoamento"
            sub={`Participação do trilho em Paranaguá ${cenario === "hoje" ? "(hoje)" : "(cenário)"}, sobre o total de cargas. Benchmark: São Francisco do Sul ~${Math.round(SPLIT_FERROVIARIO_BENCHMARK * 100)}% — mas sobre grãos (Gazeta do Povo, mar/2026).`}
            insight="Cascavel→Paranaguá: ~7 dias por trem vs. 12 h por caminhão. Concessão da Malha Sul vence fev/2027."
          />
          <MetricCard
            tag="Frete · a conta"
            tagColor={C.alerta}
            value={`R$ ${FRETE_ROD_REF}`}
            unit="/t · 2025"
            spark={<Spark data={FRETE_CASCAVEL_PARANAGUA} gid="sp_frete" />}
            sparkCaption="Cascavel→Paranaguá — Safras & Mercado. Pico R$ 200/t (ago/2023); recente R$ 135–165/t."
            sub="+24% no custo operacional pela condição do pavimento (CNT 2025)."
            insight="Sobrecusto Brasil × Illinois (EUA) à China: +US$ 62,50/t — rota Mato Grosso→Santos (ANEC, mar/2024); referência nacional, não do corredor Cascavel–Paranaguá."
          />
          <MetricCard
            tag="Espera · o gargalo a jusante"
            tagColor={C.blue}
            value={`${Math.round(ESPERA_LONGO_CURSO_H)}`}
            unit="h (longo curso)"
            sub={`Só a fila de atracação já passa de ${Math.round(ESPERA_LONGO_CURSO_H)}h — ANTAQ, jan–nov/2025. Demurrage/sobre-estadia nacional estimado em ~R$ ${CUSTO_ESPERA_BI_ANO} bi/ano (derivado de Bain & Company, 2024) — não é o custo econômico total da espera.`}
            insight="Paranaguá é dos mais eficientes do país, mas o recorde de carga pressiona a fila de berço."
          />
        </div>

        {/* matriz modal */}
        <div style={{ ...card, marginTop: 14 }}>
          <div style={topbar} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div style={eyebrow}>Matriz modal do escoamento</div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.muted }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.green, borderRadius: 2, marginRight: 5 }} />Ferroviário</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.road, borderRadius: 2, marginRight: 5 }} />Rodoviário</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <SplitBar rail={railShare * 100} label="Porto de Paranaguá" note={cenario === "hoje" ? "situação atual" : "cenário com integração"} highlight />
            <SplitBar rail={SPLIT_FERROVIARIO_BENCHMARK * 100} label="Porto de São Francisco do Sul" note="benchmark — grãos" />
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            O Corredor Paraná–Santa Catarina concentra 78% da movimentação ferroviária da Malha Sul e ~80% de suas cargas vão à exportação — mas o aproveitamento do trilho em Paranaguá ainda é metade do vizinho catarinense.
          </div>
        </div>

        {/* capacidade + timeline */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
          <div style={{ ...card, flex: "1 1 280px" }}>
            <div style={topbar} />
            <div style={eyebrow}>Capacidade de descarga ferroviária</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: 18, gap: 12 }}>
              <Step label="vagões/dia (antes)" value={VAGOES_DIA_ANTES} max={VAGOES_DIA_MOEGAO} color={C.road} />
              <div style={{ alignSelf: "center", fontSize: 22, color: C.green }}>→</div>
              <Step label="vagões/dia (Moegão)" value={VAGOES_DIA_MOEGAO} max={VAGOES_DIA_MOEGAO} color={C.green} />
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12.5, color: C.green, border: `1px solid ${C.green}40`, background: `${C.green}14`, borderRadius: 999, padding: "4px 12px" }}>▲ +63% · R$ {MOEGAO_INVESTIMENTO_MI} mi (BNDES)</span>
            </div>
          </div>

          <div style={{ ...card, flex: "1 1 380px" }}>
            <div style={topbar} />
            <div style={{ ...eyebrow, color: C.ouro }}>Linha do tempo da transição</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <TimelineChip date="out/2025" label="Leilão do canal de acesso (concluído)" color={C.green} />
              <TimelineChip date="fev/2026" label="Conclusão do Moegão (descarga ferroviária)" color={C.green} />
              <TimelineChip date="dez/2026" label="Edital da nova concessão da Malha Sul (ao TCU no 2º sem.)" color={C.blue} />
              <TimelineChip date="27/fev/2027" label="Fim da concessão da Rumo — prazo crítico" color={C.alerta} crit />
              <TimelineChip date="mar–abr/2027" label="Leilão da nova Malha Sul (operador novo)" color={C.ouro} />
            </div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 14, lineHeight: 1.5 }}>
              O leilão da nova concessão (mar–abr/2027) cai <strong style={{ color: C.muted }}>depois</strong> do vencimento da Rumo (fev/2027): o corredor cruza a virada sem operador novo definido. Fechar essa janela depende de a integração Ferroeste–Malha Sul entrar já no edital de dezembro/2026. Fontes: Min. dos Transportes/ANTT; Portos do Paraná.
            </div>
          </div>
        </div>

        {/* frete-equivalente */}
        <div style={{ ...card, marginTop: 14, borderColor: cenario === "integracao" ? `${C.green}55` : "rgba(255,255,255,0.08)" }}>
          <div style={topbar} />
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <div>
              <div style={eyebrow}>Frete-equivalente do corredor</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 700 }}>R$ {blendVal}</span>
                <span style={{ fontSize: 14, color: C.muted }}>/tonelada</span>
                {cenario === "integracao" && <span style={{ fontSize: 13, color: C.green, marginLeft: 6 }}>↓ ~{reducao.toFixed(0)}% vs. hoje</span>}
              </div>
              <div style={{ fontSize: 12, color: C.faint, marginTop: 6, maxWidth: 470, lineHeight: 1.5 }}>
                Blend ilustrativo rodoviário (R$ {FRETE_ROD_REF}/t) × ferroviário (~{Math.round(FRETE_FER_DESCONTO * 100)}% mais barato), ponderado pelo split do cenário.
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
              <div>Rodoviário base · <strong style={{ color: C.text }}>R$ {FRETE_ROD_REF}/t</strong></div>
              <div>Ferroviário est. · <strong style={{ color: C.green }}>R$ {ferEstimado}/t</strong></div>
              <div>Sorriso→Paranaguá · <strong style={{ color: C.text }}>R$ {FRETE_SORRISO_PARANAGUA}/t</strong></div>
            </div>
          </div>
        </div>

        {/* rodapé / metodologia */}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11.5, color: C.faint, lineHeight: 1.6 }}>
          <strong style={{ color: C.muted }}>Metodologia.</strong> O <strong>ITC</strong> é um índice <em>construído</em> (não um ajuste econométrico): 4 sub-índices normalizados min–max, pesos explícitos (ferrovia {Math.round(PESOS_ITC.ferrovia * 100)} · frete {Math.round(PESOS_ITC.frete * 100)} · porto {Math.round(PESOS_ITC.porto * 100)} · espera {Math.round(PESOS_ITC.espera * 100)}) e faixas com cor — definido em <code>lib/itc.ts</code>. Séries de movimentação e frete são <strong>oficiais</strong> (Portos do Paraná; Safras & Mercado), em <code>lib/series-corredor.ts</code>; pontos faltantes estão rotulados. A trajetória do ITC é reconstruída dos movimentos observados, com componentes estruturais em nível de época.
          <br />
          Fontes: Portos do Paraná / Comex Stat · ANTAQ (Est. Aquaviário) · CNT (Rodovias 2025) · Safras & Mercado · ANEC · Bain & Company (2024) · Gazeta do Povo · Ministério de Portos e Aeroportos · Ministério dos Transportes / ANTT.
        </div>
      </div>
    </div>
  );
}
