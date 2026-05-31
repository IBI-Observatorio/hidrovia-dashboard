"use client";

import React, { useState, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

// =====================================================================
// DESIGN TOKENS
// =====================================================================
const C = {
  navy: "#0A1A4A",
  navyDeep: "#050D26",
  navySoft: "#1E2D5C",
  green: "#00C04B",
  greenDeep: "#008F38",
  cream: "#FAFAF7",
  paper: "#FFFFFF",
  ink: "#0A0A0A",
  text: "#1A1A1A",
  muted: "#6B7280",
  mutedSoft: "#9CA3AF",
  rule: "#E5E7EB",
  ruleSoft: "#F3F4F6",
  warn: "#B45309",
  alert: "#991B1B",
} as const;

const fontStack = `'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif`;
const fontSerif = `'Crimson Pro', Georgia, serif`;

// =====================================================================
// MODEL — pure computation functions (mirrors the xlsx)
// =====================================================================

interface FerrograoParams {
  vol_2026: number;
  vol_2030: number;
  frete_pico: number;
  frete_entre: number;
  pct_pico: number;
  pct_entre: number;
  frete_pico_str: number;
  tarifa_ferr: number;
  ext_ferr: number;
  perna_km: number;
  perna_km_pess: number;
  frete_curto: number;
  captura: number;
  externalidades: number;
}

interface Scenario {
  base: number;
  estr: number;
  pess: number;
}

const FG_BASE: FerrograoParams = {
  vol_2026: 26.0,
  vol_2030: 33.5,
  frete_pico: 300,
  frete_entre: 220,
  pct_pico: 0.6,
  pct_entre: 0.4,
  frete_pico_str: 330,
  tarifa_ferr: 0.12,
  ext_ferr: 993,
  perna_km: 150,
  perna_km_pess: 200,
  frete_curto: 0.233,
  captura: 1.0,
  externalidades: 0,
};

function computeFerrograo(p: FerrograoParams) {
  const fretePondBase = p.frete_pico * p.pct_pico + p.frete_entre * p.pct_entre;
  const fretePondEstr = p.frete_pico_str * p.pct_pico + p.frete_entre * p.pct_entre;
  const custoFerrBase = p.tarifa_ferr * p.ext_ferr + p.frete_curto * p.perna_km;
  const custoFerrPess = p.tarifa_ferr * p.ext_ferr + p.frete_curto * p.perna_km_pess;

  const difBase = fretePondBase - custoFerrBase + p.externalidades;
  const difEstr = fretePondEstr - custoFerrBase + p.externalidades;
  const difPess = fretePondBase - custoFerrPess + p.externalidades;

  const calc = (vol: number, dif: number) => vol * 1e6 * dif * p.captura;

  return {
    fretePondBase,
    fretePondEstr,
    custoFerrBase,
    custoFerrPess,
    difBase,
    difEstr,
    difPess,
    sob_2026: { base: calc(p.vol_2026, difBase), estr: calc(p.vol_2026, difEstr), pess: calc(p.vol_2026, difPess) },
    sob_2030: { base: calc(p.vol_2030, difBase), estr: calc(p.vol_2030, difEstr), pess: calc(p.vol_2030, difPess) },
  };
}

interface EF118Params {
  vol_2026: number;
  vol_2040: number;
  vol_2050: number;
  frete_curto: number;
  captura: number;
  externalidades: number;
  mult_estr: number;
  mult_pess: number;
}

const EF_BASE: EF118Params = {
  vol_2026: 10.0,
  vol_2040: 20.0,
  vol_2050: 25.0,
  frete_curto: 0.233,
  captura: 1.0,
  externalidades: 0,
  mult_estr: 1.1,
  mult_pess: 2.0,
};

type EFSegmentTuple = [string, number, number, number, number, number, number];

const EF_SEGMENTS: EFSegmentTuple[] = [
  ["Granéis agrícolas + fertilizantes", 0.28, 1500, 0.15, 1000, 0.07, 300],
  ["Carga conteinerizada (SP-RJ-ES)", 0.12, 500, 0.18, 575, 0.08, 50],
  ["Carvão e coque (importação)", 0.1, 550, 0.17, 550, 0.06, 50],
  ["Combustíveis (granéis líquidos)", 0.08, 400, 0.2, 400, 0.07, 50],
  ["Minério de ferro (já via EFVM)", 0.05, 0, 0.0, 0, 0.0, 0],
  ["Ferro gusa (MG → portos)", 0.02, 600, 0.17, 600, 0.06, 80],
  ["HBI (porto-indústria Açu)", 0.33, 5, 0.3, 5, 0.0, 0],
  ["Outros (rocha, calcário)", 0.02, 400, 0.18, 400, 0.07, 80],
];

interface EFSegmentComputed {
  nome: string;
  pct: number;
  freteRod: number;
  custoFerr: number;
  difBase: number;
  difEstr: number;
  difPess: number;
}

type DiffKey = "difBase" | "difEstr" | "difPess";

function computeEF118(p: EF118Params) {
  const segments: EFSegmentComputed[] = EF_SEGMENTS.map(([nome, pct, drod, trod, dferr, tferr, perna]) => {
    const freteRod = drod * trod;
    const custoFerr = dferr * tferr + perna * p.frete_curto;
    const difBase = freteRod - custoFerr + p.externalidades;
    const difEstr = freteRod * p.mult_estr - custoFerr + p.externalidades;
    const difPess = freteRod - (dferr * tferr + perna * p.mult_pess * p.frete_curto) + p.externalidades;
    return { nome, pct, freteRod, custoFerr, difBase, difEstr, difPess };
  });

  const calcYear = (vol: number): Scenario => {
    const sob = (cen: DiffKey) => segments.reduce((acc, s) => acc + vol * s.pct * 1e6 * s[cen] * p.captura, 0);
    return { base: sob("difBase"), estr: sob("difEstr"), pess: sob("difPess") };
  };

  const sob_2026 = calcYear(p.vol_2026);
  const sob_2040 = calcYear(p.vol_2040);
  const sob_2050 = calcYear(p.vol_2050);

  const totalVol = segments.reduce((acc, s) => acc + s.pct, 0);
  const difPondBase = segments.reduce((acc, s) => acc + s.pct * s.difBase, 0) / totalVol;
  const difPondEstr = segments.reduce((acc, s) => acc + s.pct * s.difEstr, 0) / totalVol;
  const difPondPess = segments.reduce((acc, s) => acc + s.pct * s.difPess, 0) / totalVol;

  return { segments, sob_2026, sob_2040, sob_2050, difPondBase, difPondEstr, difPondPess };
}

// =====================================================================
// FORMAT HELPERS (Brazilian)
// =====================================================================
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRLBi = (v: number) => `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi`;
const fmtBRLMi = (v: number) => `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi`;
const fmtNum = (v: number, dec = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

function smartMoney(v: number) {
  if (Math.abs(v) >= 1e9) return fmtBRLBi(v);
  if (Math.abs(v) >= 1e6) return fmtBRLMi(v);
  return fmtBRL(v);
}

// =====================================================================
// PRIMITIVES
// =====================================================================

type NumberSize = "sm" | "md" | "lg" | "xl" | "xxl";

const Eyebrow = ({ children, color = C.green }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      fontFamily: fontStack,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color,
      marginBottom: 16,
    }}
  >
    {children}
  </div>
);

const NumberSpan = ({ children, size = "md", color = C.navy }: { children: ReactNode; size?: NumberSize; color?: string }) => {
  const sizes: Record<NumberSize, number> = { sm: 18, md: 28, lg: 44, xl: 64, xxl: 88 };
  return (
    <span
      style={{
        fontFamily: fontStack,
        fontWeight: 700,
        color,
        fontSize: sizes[size],
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
      }}
    >
      {children}
    </span>
  );
};

interface KeyMetricData {
  label: string;
  value: ReactNode;
  sublabel?: string;
  accent?: string;
}

const KeyMetric = ({ label, value, sublabel, accent }: KeyMetricData) => (
  <div
    style={{
      background: C.paper,
      border: `1px solid ${C.rule}`,
      padding: "24px 22px",
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${C.rule}`,
      borderRadius: 2,
      height: "100%",
    }}
  >
    <div
      style={{
        fontFamily: fontStack,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: 12,
      }}
    >
      {label}
    </div>
    <div style={{ marginBottom: sublabel ? 6 : 0 }}>
      <NumberSpan size="lg">{value}</NumberSpan>
    </div>
    {sublabel && <div style={{ fontFamily: fontStack, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{sublabel}</div>}
  </div>
);

// =====================================================================
// SLIDER
// =====================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hint?: string;
}

function Slider({ label, value, min, max, step, onChange, format, hint }: SliderProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: fontStack, fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: "0.01em" }}>{label}</div>
          {hint && <div style={{ fontFamily: fontStack, fontSize: 11, color: C.muted, marginTop: 3 }}>{hint}</div>}
        </div>
        <div
          style={{
            fontFamily: fontStack,
            fontWeight: 700,
            fontSize: 16,
            color: C.navy,
            fontVariantNumeric: "tabular-nums",
            minWidth: 90,
            textAlign: "right",
          }}
        >
          {format(value)}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%",
          height: 4,
          borderRadius: 0,
          appearance: "none",
          background: `linear-gradient(to right, ${C.navy} 0%, ${C.navy} ${((value - min) / (max - min)) * 100}%, ${C.rule} ${
            ((value - min) / (max - min)) * 100
          }%, ${C.rule} 100%)`,
          outline: "none",
          cursor: "pointer",
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; background: ${C.green};
          border: 2px solid ${C.navy}; border-radius: 50%; cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px; background: ${C.green};
          border: 2px solid ${C.navy}; border-radius: 50%; cursor: pointer; border-width: 2px;
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// CHARTS
// =====================================================================

interface ScenarioDatum {
  label: string;
  base: number;
  estr: number;
  pess: number;
}

function ScenarioChart({ data, height = 280 }: { data: ScenarioDatum[]; height?: number }) {
  const chartData = data.map((d) => ({
    cenário: d.label,
    Base: d.base / 1e9,
    Estressado: d.estr / 1e9,
    Pessimista: d.pess / 1e9,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={C.ruleSoft} vertical={false} />
        <XAxis dataKey="cenário" tick={{ fill: C.muted, fontSize: 12, fontFamily: fontStack }} axisLine={{ stroke: C.rule }} tickLine={false} />
        <YAxis
          tick={{ fill: C.muted, fontSize: 11, fontFamily: fontStack }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `R$ ${v.toFixed(1)} bi`}
        />
        <Tooltip
          contentStyle={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 2, fontFamily: fontStack, fontSize: 12 }}
          formatter={(v) => [`R$ ${Number(v).toFixed(2)} bi/ano`, ""]}
          labelStyle={{ color: C.navy, fontWeight: 700 }}
        />
        <Bar dataKey="Base" fill={C.navy} maxBarSize={48} />
        <Bar dataKey="Estressado" fill={C.alert} maxBarSize={48} />
        <Bar dataKey="Pessimista" fill={C.green} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SegmentChart({ segments, totalVol, captura }: { segments: EFSegmentComputed[]; totalVol: number; captura: number }) {
  const data = segments
    .map((s) => ({
      nome: s.nome.length > 22 ? s.nome.substring(0, 20) + "…" : s.nome,
      sobrecusto: (totalVol * s.pct * 1e6 * s.difBase * captura) / 1e6,
      pct: s.pct,
    }))
    .sort((a, b) => b.sobrecusto - a.sobrecusto);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={C.ruleSoft} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: C.muted, fontSize: 11, fontFamily: fontStack }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `R$ ${v.toFixed(0)} mi`}
        />
        <YAxis
          type="category"
          dataKey="nome"
          tick={{ fill: C.text, fontSize: 11, fontFamily: fontStack }}
          axisLine={{ stroke: C.rule }}
          tickLine={false}
          width={170}
        />
        <Tooltip
          contentStyle={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 2, fontFamily: fontStack, fontSize: 12 }}
          formatter={(v) => [`R$ ${Number(v).toFixed(0)} mi/ano`, "Sobrecusto"]}
          labelStyle={{ color: C.navy, fontWeight: 700 }}
        />
        <Bar dataKey="sobrecusto" fill={C.navy} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.sobrecusto > 200 ? C.navy : d.sobrecusto > 50 ? C.navySoft : C.mutedSoft} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// =====================================================================
// PREMISSA TABLE + COLLAPSIBLE
// =====================================================================

interface PremissaRow {
  section?: string;
  label?: string;
  value?: string;
  note?: string;
}

function PremissaTable({ rows }: { rows: PremissaRow[] }) {
  return (
    <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 2 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontStack, fontSize: 12 }}>
        <tbody>
          {rows.map((r, i) =>
            r.section ? (
              <tr key={i}>
                <td
                  colSpan={3}
                  style={{
                    padding: "14px 18px 6px",
                    background: C.paper,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: C.navy,
                    borderTop: i ? `1px solid ${C.rule}` : "none",
                  }}
                >
                  {r.section}
                </td>
              </tr>
            ) : (
              <tr key={i} style={{ borderTop: `1px solid ${C.ruleSoft}` }}>
                <td style={{ padding: "8px 18px", color: C.text, width: "55%" }}>{r.label}</td>
                <td style={{ padding: "8px 12px", color: C.navy, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{r.value}</td>
                <td style={{ padding: "8px 18px", color: C.muted, fontSize: 11, fontStyle: "italic" }}>{r.note}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "18px 0",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontFamily: fontStack,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.navy,
        }}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div style={{ paddingBottom: 24 }}>{children}</div>}
    </div>
  );
}

// =====================================================================
// LIVE COUNTER (safe for SSR: starts at 0, updates after mount)
// =====================================================================

function LiveCounter({ annualTotal }: { annualTotal: number }) {
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    const update = () => {
      const elapsed = (Date.now() - start.getTime()) / 1000;
      const yearSeconds = 365.25 * 24 * 3600;
      setNow((elapsed / yearSeconds) * annualTotal);
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [annualTotal]);

  const perSec = annualTotal / (365.25 * 24 * 3600);
  const year = mounted ? new Date().getFullYear() : 2026;

  return (
    <div>
      <div
        style={{
          fontFamily: fontStack,
          fontWeight: 700,
          color: C.cream,
          fontSize: "clamp(48px, 9vw, 128px)",
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {now.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
      </div>
      <div style={{ marginTop: 18, display: "flex", gap: 32, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              fontFamily: fontStack,
              fontSize: 11,
              color: C.green,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Acumulado em {year}
          </div>
          <div style={{ fontFamily: fontStack, fontSize: 13, color: "#B8C2DC", maxWidth: 460, lineHeight: 1.5 }}>
            Sobrecusto rodoviário consolidado — Ferrogrão (cenário base 2026) + EF-118 (cenário base 2026)
          </div>
        </div>
        <div style={{ borderLeft: `1px solid #2A3868`, paddingLeft: 28 }}>
          <div
            style={{
              fontFamily: fontStack,
              fontSize: 11,
              color: C.green,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Por segundo
          </div>
          <div style={{ fontFamily: fontStack, fontSize: 22, color: C.cream, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {perSec.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// CORREDOR BLOCKS
// =====================================================================

function CorredorFerrograo() {
  const [params, setParams] = useState<FerrograoParams>({ ...FG_BASE });
  const result = useMemo(() => computeFerrograo(params), [params]);
  const set = (k: keyof FerrograoParams) => (v: number) => setParams((p) => ({ ...p, [k]: v }));

  const chartData: ScenarioDatum[] = [
    { label: "2026", base: result.sob_2026.base, estr: result.sob_2026.estr, pess: result.sob_2026.pess },
    { label: "2030", base: result.sob_2030.base, estr: result.sob_2030.estr, pess: result.sob_2030.pess },
  ];

  const premissas: PremissaRow[] = [
    { section: "Volumes do corredor (MT → Arco Norte)" },
    { label: "Volume atual 2026 (Mt/ano)", value: `${fmtNum(params.vol_2026)} Mt`, note: "ESALQ/Pró-Logística + 3 Mt/ano desde 2024" },
    { label: "Volume projetado 2030 (Mt/ano)", value: `${fmtNum(params.vol_2030)} Mt`, note: "Caderno PPI / ANTT" },
    { label: "Capacidade nominal Ferrogrão", value: "66 Mt", note: "Min. Transportes (dez/2025)" },
    { section: "Frete rodoviário (BR-163)" },
    { label: "Frete pico de safra (R$/t)", value: fmtBRL(params.frete_pico), note: "Granel Inteligência (jan/2026)" },
    { label: "Frete entressafra (R$/t)", value: fmtBRL(params.frete_entre), note: "ESALQ-Log / Sifreca" },
    { label: "% volume em pico (5 meses)", value: fmtPct(params.pct_pico), note: "Soja Fev-Abr + milho Jul-Set" },
    { label: "Frete pico estressado (R$/t)", value: fmtBRL(params.frete_pico_str), note: "Pico observado jan/2026" },
    { section: "Frete ferroviário (Ferrogrão)" },
    { label: "Tarifa (R$/t.km)", value: `R$ ${fmtNum(params.tarifa_ferr, 3)}`, note: "Estimativa — Ferronorte + sobretaxa greenfield" },
    { label: "Extensão da ferrovia", value: `${params.ext_ferr} km`, note: "EF-170: Sinop → Miritituba" },
    { section: "Perna rodoviária residual (fazenda → terminal)" },
    { label: "Distância média base", value: `${params.perna_km} km`, note: "Terminais em Sinop, Matupá, Miritituba" },
    { label: "Distância pessimista", value: `${params.perna_km_pess} km`, note: "Hipótese conservadora" },
    { label: "Frete curto granel", value: `R$ ${fmtNum(params.frete_curto, 3)}/t.km`, note: "ESALQ-Log distâncias <300 km" },
    { section: "Captura modal" },
    { label: "Captura modal", value: fmtPct(params.captura), note: "100% = captura plena" },
    { label: "Externalidades evitadas", value: fmtBRL(params.externalidades) + "/t", note: "CO₂, acidentes, pavimento (não incluído por padrão)" },
  ];

  return (
    <CorredorBlock
      label="CORREDOR I"
      number="01"
      title="Ferrogrão"
      code="EF-170"
      route="Sinop (MT) → Miritituba (PA)"
      length="993 km"
      teaser="Corredor monocarga (soja + milho) substituindo a BR-163. O frete rodoviário é hoje a maior fonte de sobrecusto logístico do agronegócio brasileiro."
      keyMetrics={[
        { label: "Volume capturável 2026", value: `${fmtNum(params.vol_2026)} Mt`, sublabel: "do total da BR-163" },
        { label: "Sobrecusto anual base", value: smartMoney(result.sob_2026.base), sublabel: "ano de 2026", accent: C.green },
        { label: "Diferencial unitário", value: `R$ ${fmtNum(result.difBase, 0)}/t`, sublabel: "frete rod. − custo ferr." },
        { label: "Capacidade nominal", value: "66 Mt", sublabel: "em maturidade (2050)" },
      ]}
      sliders={
        <>
          <Slider label="Volume capturável 2026" value={params.vol_2026} min={10} max={50} step={0.5} onChange={set("vol_2026")} format={(v) => `${fmtNum(v)} Mt`} hint="Toda a carga MT → Arco Norte que poderia migrar" />
          <Slider label="Frete rodoviário em pico de safra" value={params.frete_pico} min={200} max={400} step={10} onChange={set("frete_pico")} format={(v) => fmtBRL(v) + "/t"} hint="Soja Fev-Abr + milho Jul-Set (60% do volume)" />
          <Slider label="Captura modal efetiva" value={params.captura} min={0.4} max={1.0} step={0.05} onChange={set("captura")} format={fmtPct} hint="% da carga que efetivamente migra para a ferrovia" />
          <Slider label="Perna rodoviária residual" value={params.perna_km} min={50} max={300} step={10} onChange={set("perna_km")} format={(v) => `${v} km`} hint="Distância fazenda → terminal ferroviário" />
        </>
      }
      chart={<ScenarioChart data={chartData} />}
      bottomNote="Os três cenários compartilham a mesma estrutura de premissas: o estressado eleva o frete em pico (R$ 330/t) e o pessimista dobra a perna residual (200 km)."
      premissas={<PremissaTable rows={premissas} />}
    />
  );
}

function CorredorEF118() {
  const [params, setParams] = useState<EF118Params>({ ...EF_BASE });
  const result = useMemo(() => computeEF118(params), [params]);
  const set = (k: keyof EF118Params) => (v: number) => setParams((p) => ({ ...p, [k]: v }));

  const chartData: ScenarioDatum[] = [
    { label: "2026", base: result.sob_2026.base, estr: result.sob_2026.estr, pess: result.sob_2026.pess },
    { label: "2040", base: result.sob_2040.base, estr: result.sob_2040.estr, pess: result.sob_2040.pess },
    { label: "2050", base: result.sob_2050.base, estr: result.sob_2050.estr, pess: result.sob_2050.pess },
  ];

  const premissas: PremissaRow[] = [
    { section: "Volumes totais do corredor" },
    { label: "Volume capturável 2026", value: `${fmtNum(params.vol_2026)} Mt`, note: "A&M (parte capturável já hoje)" },
    { label: "Volume regime 2040", value: `${fmtNum(params.vol_2040)} Mt`, note: "Trajetória A&M" },
    { label: "Volume maturidade 2050", value: `${fmtNum(params.vol_2050)} Mt`, note: "Alvarez & Marsal: 23-26 Mt" },
    { section: "Mix de carga (segmentos)" },
    ...EF_SEGMENTS.map(([nome, pct, drod]): PremissaRow => ({
      label: nome,
      value: fmtPct(pct),
      note: drod === 0 ? "sem ganho modal" : `dist. rod. ${drod} km`,
    })),
    { section: "Premissas globais" },
    { label: "Frete curto granel", value: `R$ ${fmtNum(params.frete_curto, 3)}/t.km`, note: "ESALQ-Log SE" },
    { label: "Captura modal", value: fmtPct(params.captura), note: "100% = captura plena" },
    { label: "Mult. estressado", value: `${fmtNum(params.mult_estr, 2)}x`, note: "frete rodoviário ×" },
    { label: "Mult. pessimista", value: `${fmtNum(params.mult_pess, 2)}x`, note: "perna residual ×" },
  ];

  return (
    <CorredorBlock
      label="CORREDOR II"
      number="02"
      title="EF-118"
      code="Anel Ferroviário do Sudeste"
      route="Vitória (ES) → Açu / Rio de Janeiro (RJ)"
      length="575 km"
      teaser="Corredor multicarga porto-a-porto. Ao contrário da Ferrogrão, depende do mix industrial do Sudeste — particularmente do projeto HBI da Ternium no Açu — e tem fragilidade estrutural na perna rodoviária residual."
      keyMetrics={[
        { label: "Volume capturável 2026", value: `${fmtNum(params.vol_2026)} Mt`, sublabel: "parte do mix industrial" },
        { label: "Sobrecusto anual base", value: smartMoney(result.sob_2026.base), sublabel: "ano de 2026", accent: C.green },
        { label: "Diferencial ponderado", value: `R$ ${fmtNum(result.difPondBase, 0)}/t`, sublabel: "volume-weighted" },
        { label: "Capacidade nominal", value: "24 Mt", sublabel: "em maturidade (2050)" },
      ]}
      sliders={
        <>
          <Slider label="Volume capturável 2026" value={params.vol_2026} min={5} max={25} step={0.5} onChange={set("vol_2026")} format={(v) => `${fmtNum(v)} Mt`} hint="Inclui agrícola, contêiner, carvão, HBI" />
          <Slider label="Captura modal efetiva" value={params.captura} min={0.4} max={1.0} step={0.05} onChange={set("captura")} format={fmtPct} hint="% do mix que efetivamente migra" />
          <Slider label="Multiplicador do frete rodoviário" value={params.mult_estr} min={1.0} max={1.5} step={0.05} onChange={set("mult_estr")} format={(v) => `${fmtNum(v, 2)}x`} hint="Cenário estressado: gargalo BR-101 ou alta combustível" />
          <Slider label="Multiplicador da perna residual" value={params.mult_pess} min={1.0} max={3.0} step={0.1} onChange={set("mult_pess")} format={(v) => `${fmtNum(v, 1)}x`} hint="Cenário pessimista: terminais limitados" />
        </>
      }
      chart={<ScenarioChart data={chartData} height={240} />}
      bottomNote={
        <>
          <strong style={{ color: C.alert }}>Achado crítico</strong>: o cenário pessimista revela que a EF-118 é estruturalmente sensível à perna rodoviária. Quando os terminais são insuficientes (perna 200 km), o diferencial colapsa para ~R$ 14/t — a tese da Findes/Coinfra (NT 001-2025) sobre o Ramal Anchieta encontra base quantitativa aqui.
        </>
      }
      premissas={
        <div>
          <PremissaTable rows={premissas} />
          <div style={{ marginTop: 24 }}>
            <Eyebrow>Decomposição por segmento — sobrecusto anual base</Eyebrow>
            <SegmentChart segments={result.segments} totalVol={params.vol_2026} captura={params.captura} />
            <div style={{ fontFamily: fontStack, fontSize: 12, color: C.muted, marginTop: 12, fontStyle: "italic", lineHeight: 1.6 }}>
              Granéis agrícolas concentram ~85% do sobrecusto evitável. HBI (33% do volume) e minério (5%) — somados, 38% do mix — contribuem com sobrecusto desprezível: o primeiro é fluxo porto-indústria interno, o segundo já viaja por ferrovia (EFVM).
            </div>
          </div>
        </div>
      }
    />
  );
}

interface CorredorBlockProps {
  label: string;
  number: string;
  title: string;
  code: string;
  route: string;
  length: string;
  teaser: string;
  keyMetrics: KeyMetricData[];
  sliders: ReactNode;
  chart: ReactNode;
  bottomNote: ReactNode;
  premissas: ReactNode;
}

function CorredorBlock({ label, number, title, code, route, length, teaser, keyMetrics, sliders, chart, bottomNote, premissas }: CorredorBlockProps) {
  return (
    <section style={{ padding: "88px 0", borderTop: `1px solid ${C.rule}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 32, marginBottom: 32, flexWrap: "wrap" }}>
          <div>
            <Eyebrow>{label}</Eyebrow>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
              <NumberSpan size="xl" color={C.navy}>
                {number}
              </NumberSpan>
              <div>
                <h2 style={{ fontFamily: fontStack, fontSize: 36, fontWeight: 800, color: C.navy, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{title}</h2>
                <div style={{ fontFamily: fontStack, fontSize: 14, color: C.muted, marginTop: 6, letterSpacing: "0.05em" }}>
                  {code} · {route} · {length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontFamily: fontSerif, fontSize: 22, lineHeight: 1.5, color: C.text, maxWidth: 820, marginBottom: 56, fontWeight: 400 }}>{teaser}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 64 }}>
          {keyMetrics.map((m, i) => (
            <KeyMetric key={i} {...m} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 64, marginBottom: 56 }}>
          <div>
            <Eyebrow>Painel interativo · ajuste as premissas</Eyebrow>
            {sliders}
          </div>
          <div>
            <Eyebrow>Sobrecusto anual por cenário</Eyebrow>
            <div style={{ background: C.paper, border: `1px solid ${C.rule}`, padding: "24px 16px 12px" }}>
              {chart}
              <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                {([["Base", C.navy], ["Estressado", C.alert], ["Pessimista", C.green]] as const).map(([l, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fontStack, fontSize: 11, color: C.muted, fontWeight: 500 }}>
                    <span style={{ width: 12, height: 12, background: c, display: "inline-block" }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: fontStack, fontSize: 12, color: C.muted, marginTop: 14, fontStyle: "italic", lineHeight: 1.6 }}>{bottomNote}</div>
          </div>
        </div>

        <Collapsible title="Tabela completa de premissas">{premissas}</Collapsible>
      </div>
    </section>
  );
}

// =====================================================================
// COMPARISON SECTION
// =====================================================================

function Comparacao() {
  const fg = computeFerrograo(FG_BASE);
  const ef = computeEF118(EF_BASE);

  const rows: [string, string, string][] = [
    ["Extensão (km)", "993 km", "575 km"],
    ["Capex projetado", "R$ 27,7 bi (ISA)", "R$ 6,6 bi"],
    ["Capacidade nominal", "66 Mt/ano", "24 Mt/ano"],
    ["Tipo de carga", "Monocarga (soja + milho)", "Multicarga (8 segmentos)"],
    ["Volume capturável 2026", "26 Mt", "10 Mt"],
    ["Diferencial unitário base", `R$ ${fmtNum(fg.difBase, 0)}/t`, `R$ ${fmtNum(ef.difPondBase, 0)}/t`],
    ["Sobrecusto 2026 base", smartMoney(fg.sob_2026.base), smartMoney(ef.sob_2026.base)],
    ["Sobrecusto 2026 estressado", smartMoney(fg.sob_2026.estr), smartMoney(ef.sob_2026.estr)],
    ["Sobrecusto 2026 pessimista", smartMoney(fg.sob_2026.pess), smartMoney(ef.sob_2026.pess)],
    ["Sensibilidade à perna residual", "Moderada (10% do diferencial)", "Alta (60% do diferencial)"],
    ["Status do leilão", "Set/2026, condicionado a STF", "Jun/2026, projeto no TCU"],
  ];

  return (
    <section style={{ padding: "88px 0", background: C.cream, borderTop: `1px solid ${C.rule}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <Eyebrow>Comparação metodológica</Eyebrow>
        <h2 style={{ fontFamily: fontStack, fontSize: 42, fontWeight: 800, color: C.navy, margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1 }}>
          Mesma régua, dois corredores
        </h2>
        <p style={{ fontFamily: fontSerif, fontSize: 20, lineHeight: 1.55, color: C.text, maxWidth: 820, marginBottom: 56 }}>
          A análise sob metodologia idêntica revela que os dois corredores entregam ordens de grandeza distintas de sobrecusto evitado. A Ferrogrão concentra ganho monetário; a EF-118 distribui ganhos menores entre múltiplos fluxos com perfis de risco também distintos.
        </p>

        <div style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontStack }}>
            <thead>
              <tr style={{ background: C.navy }}>
                <th style={{ padding: "18px 22px", textAlign: "left", color: C.cream, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", width: "34%" }}>Indicador</th>
                <th style={{ padding: "18px 22px", textAlign: "right", color: C.cream, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", width: "33%" }}>Ferrogrão (EF-170)</th>
                <th style={{ padding: "18px 22px", textAlign: "right", color: C.cream, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", width: "33%" }}>EF-118</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, a, b], i) => (
                <tr key={i} style={{ borderTop: i ? `1px solid ${C.ruleSoft}` : "none" }}>
                  <td style={{ padding: "14px 22px", color: C.text, fontSize: 13 }}>{k}</td>
                  <td style={{ padding: "14px 22px", color: C.navy, fontSize: 14, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{a}</td>
                  <td style={{ padding: "14px 22px", color: C.navy, fontSize: 14, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div style={{ borderTop: `3px solid ${C.green}`, paddingTop: 20 }}>
            <h4 style={{ fontFamily: fontStack, fontSize: 14, fontWeight: 700, color: C.navy, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>Implicação Ferrogrão</h4>
            <p style={{ fontFamily: fontStack, fontSize: 14, lineHeight: 1.65, color: C.text, margin: 0 }}>
              Sobrecusto anual concentrado, com sensibilidade moderada a premissas de captura. O caso econômico para a sociedade é robusto: até no pessimista, o sobrecusto evitável supera R$ 2 bi/ano. A controvérsia migra para o domínio socioambiental — não para o econômico-logístico.
            </p>
          </div>
          <div style={{ borderTop: `3px solid ${C.alert}`, paddingTop: 20 }}>
            <h4 style={{ fontFamily: fontStack, fontSize: 14, fontWeight: 700, color: C.navy, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>Implicação EF-118</h4>
            <p style={{ fontFamily: fontStack, fontSize: 14, lineHeight: 1.65, color: C.text, margin: 0 }}>
              Sobrecusto anual distribuído, com fragilidade estrutural à perna residual. A defesa pública não pode se sustentar exclusivamente em ganho de frete — o argumento decisivo é indução de investimento industrial e capacidade portuária. O Ramal Anchieta é variável crítica.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// MAIN COMPONENT — sem header nem footer próprios (usa os do site)
// =====================================================================

export default function SobrecustoDashboard() {
  // Carregar fontes apenas no cliente
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "observatorio-ibi-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600&family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const annualTotal = computeFerrograo(FG_BASE).sob_2026.base + computeEF118(EF_BASE).sob_2026.base;

  return (
    <div style={{ background: C.paper, color: C.text, fontFamily: fontStack }}>
      {/* HERO */}
      <section
        style={{
          background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
          padding: "96px 32px 112px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "40%",
            height: "100%",
            background: `radial-gradient(circle at 80% 30%, rgba(0,192,75,0.08) 0%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "rgba(250,250,247,0.6)",
              textDecoration: "none",
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={14} />
            Voltar
          </Link>
          <Eyebrow color={C.green}>Observatório IBI / Análise quantitativa</Eyebrow>
          <h1
            style={{
              fontFamily: fontStack,
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 800,
              color: C.cream,
              margin: "0 0 24px",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            O custo silencioso da rodovia
          </h1>
          <p
            style={{
              fontFamily: fontSerif,
              fontSize: "clamp(18px, 2vw, 24px)",
              lineHeight: 1.5,
              color: "#B8C2DC",
              margin: "0 0 64px",
              maxWidth: 760,
              fontWeight: 400,
            }}
          >
            Quanto o Brasil paga, todos os anos, por escoar carga em caminhão onde caberia ferrovia. Análise comparativa de dois corredores em concessão prevista para 2026.
          </p>
          <LiveCounter annualTotal={annualTotal} />
          <div
            style={{
              marginTop: 64,
              paddingTop: 24,
              borderTop: `1px solid #2A3868`,
              display: "flex",
              gap: 56,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ maxWidth: 320 }}>
              <div style={{ fontFamily: fontStack, fontSize: 11, color: C.green, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Metodologia</div>
              <p style={{ fontFamily: fontStack, fontSize: 13, lineHeight: 1.65, color: "#B8C2DC", margin: 0 }}>
                O sobrecusto rodoviário é a diferença entre o frete pago hoje em caminhão e o frete que seria pago em ferrovia, multiplicada pelo volume migrado. A análise considera sazonalidade, perna rodoviária residual e captura modal parcial.
              </p>
            </div>
            <div style={{ maxWidth: 320 }}>
              <div style={{ fontFamily: fontStack, fontSize: 11, color: C.green, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>O que esta análise não é</div>
              <p style={{ fontFamily: fontStack, fontSize: 13, lineHeight: 1.65, color: "#B8C2DC", margin: 0 }}>
                Não é um EVTEA. Não calcula TIR, VPL ou viabilidade financeira do empreendimento. Mede apenas o sobrecusto logístico pago pela sociedade enquanto a ferrovia não opera.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CorredorFerrograo />
      <CorredorEF118 />
      <Comparacao />
    </div>
  );
}
