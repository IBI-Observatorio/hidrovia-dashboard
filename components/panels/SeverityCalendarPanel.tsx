"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SeverityStation, SeverityStationData } from "@/lib/severity-calendar-precomputed";
import { ChevronDown } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types (mirrors severity-calendar-precomputed, but loaded via fetch)
// ─────────────────────────────────────────────────────────────

interface SeverityCalendarJSON {
  periods: { inicio: number; fim: number };
  stations: Record<string, SeverityStationData>;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STATION_OPTIONS: { key: SeverityStation; label: string; sub: string; group: string }[] = [
  { key: "Itacoatiara", label: "Itacoatiara", sub: "Rio Amazonas",   group: "Calha Principal" },
  { key: "Curicuriari", label: "Curicuriari", sub: "Rio Negro alto", group: "Afluentes Norte" },
  { key: "Labrea",      label: "Lábrea",      sub: "Rio Purus",      group: "Afluentes Sul"   },
  { key: "Manicore",    label: "Manicoré",    sub: "Rio Madeira",    group: "Afluentes Sul"   },
  { key: "Humaita",     label: "Humaitá",     sub: "Rio Madeira",    group: "Afluentes Sul"   },
  { key: "PortoVelho",  label: "Porto Velho", sub: "Rio Madeira",    group: "Afluentes Sul"   },
  { key: "Borba",       label: "Borba",       sub: "Rio Madeira",    group: "Afluentes Sul"   },
  // SGC, Serrinha, Moura, Caracarai, Abuna desativadas — sem feed live ANA
];

const BUCKETS: { max: number; color: string; label: string }[] = [
  { max: 0.08,       color: "#7f1d1d", label: "Muito seco" },
  { max: 0.18,       color: "#b91c1c", label: "Seco" },
  { max: 0.30,       color: "#ea580c", label: "Abaixo do normal" },
  { max: 0.42,       color: "#fbbf24", label: "Levemente seco" },
  { max: 0.58,       color: "#e7e5e4", label: "Normal" },
  { max: 0.72,       color: "#93c5fd", label: "Levemente cheio" },
  { max: 0.85,       color: "#2563eb", label: "Acima do normal" },
  { max: Infinity,   color: "#1e3a8a", label: "Muito cheio" },
];

function bucketColor(pos: number | null): string {
  if (pos === null) return "#1f2937";
  for (const b of BUCKETS) {
    if (pos < b.max) return b.color;
  }
  return BUCKETS[BUCKETS.length - 1].color;
}

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTH_DOY_START = [1,32,60,91,121,152,182,213,244,274,305,335];
const DROUGHT_WINDOW_DOY = { start: 244, end: 334 };
const FLOOD_WINDOW_DOY   = { start: 32, end: 181 };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function doyToWeek(doy: number): number { return Math.min(51, Math.floor((doy - 1) / 7)); }
function doyToDecend(doy: number): number { return Math.min(35, Math.floor((doy - 1) / 10)); }

function getCell(
  data: SeverityStationData,
  yearIdx: number,
  periodIdx: number,
  resolution: "weekly" | "decendial"
): { pos: number | null; cota_m: number | null } {
  const nP = resolution === "weekly" ? 52 : 36;
  const i  = (yearIdx * nP + periodIdx) * 2;
  const arr = resolution === "weekly" ? data.weekly : data.decendial;
  const pos    = arr[i]     ?? null;
  const cota_m = arr[i + 1] ?? null;
  return {
    pos:    (pos    === null || typeof pos    === "number") ? pos    : null,
    cota_m: (cota_m === null || typeof cota_m === "number") ? cota_m : null,
  };
}

function doyMidOfPeriod(idx: number, resolution: "weekly" | "decendial"): number {
  if (resolution === "weekly") return (idx * 7) + 4;
  return (idx * 10) + 5;
}

function computeExtremes(
  data: SeverityStationData,
  resolution: "weekly" | "decendial"
): { droughts: { year: number; minPos: number }[]; floods: { year: number; maxPos: number }[] } {
  const toIdx = resolution === "weekly" ? doyToWeek : doyToDecend;
  const drWin = [toIdx(DROUGHT_WINDOW_DOY.start), toIdx(DROUGHT_WINDOW_DOY.end)];
  const flWin = [toIdx(FLOOD_WINDOW_DOY.start),   toIdx(FLOOD_WINDOW_DOY.end)];

  const droughts: { year: number; minPos: number }[] = [];
  const floods:   { year: number; maxPos: number }[] = [];

  for (let yi = 0; yi < data.numYears; yi++) {
    const year = data.anoMin + yi;
    let minDr = Infinity, maxFl = -Infinity;
    for (let pi = drWin[0]; pi <= drWin[1]; pi++) {
      const { pos } = getCell(data, yi, pi, resolution);
      if (pos !== null && pos < minDr) minDr = pos;
    }
    for (let pi = flWin[0]; pi <= flWin[1]; pi++) {
      const { pos } = getCell(data, yi, pi, resolution);
      if (pos !== null && pos > maxFl) maxFl = pos;
    }
    if (minDr < 0.10) droughts.push({ year, minPos: minDr });
    if (maxFl > 0.90) floods.push({ year, maxPos: maxFl });
  }

  droughts.sort((a, b) => a.minPos - b.minPos);
  floods.sort((a, b) => b.maxPos - a.maxPos);

  return { droughts: droughts.slice(0, 8), floods: floods.slice(0, 8) };
}

function rankCell(
  data: SeverityStationData,
  yearIdx: number,
  periodIdx: number,
  resolution: "weekly" | "decendial"
): { rank: number; total: number; dir: "seco" | "cheio" } | null {
  const target = getCell(data, yearIdx, periodIdx, resolution);
  if (target.pos === null) return null;

  const vals: number[] = [];
  for (let yi = 0; yi < data.numYears; yi++) {
    const { pos } = getCell(data, yi, periodIdx, resolution);
    if (pos !== null) vals.push(pos);
  }
  vals.sort((a, b) => a - b);
  const rankDry  = vals.findIndex((v) => v >= target.pos!) + 1;
  const rankWet  = vals.length - vals.findIndex((v) => v >= target.pos!);
  const dir: "seco" | "cheio" = target.pos < 0.5 ? "seco" : "cheio";
  return { rank: dir === "seco" ? rankDry : rankWet, total: vals.length, dir };
}

function isoFromDOY(year: number, doy: number): string {
  const dt = new Date(Date.UTC(year, 0, 1));
  dt.setUTCDate(dt.getUTCDate() + doy - 1);
  return dt.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
// Drawing
// ─────────────────────────────────────────────────────────────

interface DrawOptions {
  data:        SeverityStationData;
  resolution:  "weekly" | "decendial";
  containerW:  number;
  isMobile:    boolean;
  forExport?:  boolean;
  periods:     { inicio: number; fim: number };
}

function computeLayout(opts: DrawOptions) {
  const { data, resolution, containerW, isMobile, forExport } = opts;
  const nP = resolution === "weekly" ? 52 : 36;
  const scaleF = forExport ? 2 : 1;

  // Cell height scales with number of years: roomy for 10–20 years, compact for 50+
  const cellHBase = Math.min(30, Math.max(12, Math.floor(480 / data.numYears)));
  const CELL_H   = cellHBase * scaleF;

  // Font and margins scale slightly with cell size
  const FONT_SZ = Math.min(12, Math.max(9, cellHBase * 0.7)) * scaleF;
  const LEFT_M  = (cellHBase >= 20 ? 52 : 44) * scaleF;
  const RIGHT_M = isMobile ? 0 : (cellHBase >= 20 ? 80 : 128) * scaleF;
  const TOP_M   = 28 * scaleF;
  const LEGEND_H= 46 * scaleF;

  const width     = Math.max(containerW, forExport ? 960 : 0);
  const gridW     = width - LEFT_M - RIGHT_M;
  const cellW     = gridW / nP;
  const cellH     = CELL_H;
  const gridH     = data.numYears * cellH;
  const totalH    = TOP_M + gridH + LEGEND_H;

  return { LEFT_M, RIGHT_M, TOP_M, LEGEND_H, FONT_SZ, width, gridW, cellW, cellH, gridH, totalH, nP, scaleF };
}

function drawCalendar(
  canvas: HTMLCanvasElement,
  opts: DrawOptions,
  extremes: ReturnType<typeof computeExtremes>
) {
  const { data, resolution, isMobile, periods } = opts;
  const L = computeLayout(opts);
  const { LEFT_M, RIGHT_M, TOP_M, FONT_SZ, width, cellW, cellH, gridH, totalH, nP } = L;

  const dpr = opts.forExport ? 1 : (window.devicePixelRatio || 1);
  canvas.width  = width * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width  = `${width}px`;
  canvas.style.height = `${totalH}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, totalH);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, totalH);

  // ── Grid cells ──
  for (let yi = 0; yi < data.numYears; yi++) {
    for (let pi = 0; pi < nP; pi++) {
      const { pos } = getCell(data, yi, pi, resolution);
      ctx.fillStyle = bucketColor(pos);
      ctx.fillRect(
        LEFT_M + pi * cellW,
        TOP_M  + yi * cellH,
        Math.max(1, cellW - 0.5),
        Math.max(1, cellH - 0.5)
      );
    }
  }

  // ── Horizontal year separators (only when cells are tall enough) ──
  if (cellH >= 14) {
    ctx.save();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth   = 1;
    ctx.globalAlpha = 0.8;
    for (let yi = 1; yi < data.numYears; yi++) {
      const y = TOP_M + yi * cellH;
      ctx.beginPath();
      ctx.moveTo(LEFT_M, y);
      ctx.lineTo(LEFT_M + nP * cellW, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Sep–Nov drought window ──
  const toIdx = resolution === "weekly" ? doyToWeek : doyToDecend;
  const drStartPi = toIdx(DROUGHT_WINDOW_DOY.start);
  const drEndPi   = toIdx(DROUGHT_WINDOW_DOY.end) + 1;
  ctx.save();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 3]);
  ctx.globalAlpha = 0.6;
  const x1 = LEFT_M + drStartPi * cellW;
  const x2 = LEFT_M + drEndPi   * cellW;
  ctx.strokeRect(x1, TOP_M, x2 - x1, gridH);
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Month labels ──
  ctx.fillStyle = "#94a3b8";
  ctx.font      = `${FONT_SZ}px sans-serif`;
  ctx.textAlign = "center";
  for (let m = 0; m < 12; m++) {
    const doyMid = MONTH_DOY_START[m] + (m < 11 ? (MONTH_DOY_START[m + 1] - MONTH_DOY_START[m]) / 2 : 15);
    const pi   = resolution === "weekly"
      ? doyToWeek(Math.round(doyMid))
      : doyToDecend(Math.round(doyMid));
    const x = LEFT_M + (pi + 0.5) * cellW;
    ctx.fillText(MONTH_LABELS[m], x, TOP_M - 6);
  }

  // ── Year labels — every year when rows are tall, every 5 or 10 when compact ──
  const yearStep = cellH >= 18 ? 1 : cellH >= 10 ? 5 : 10;
  ctx.fillStyle  = "#94a3b8";
  ctx.font       = `${FONT_SZ}px sans-serif`;
  ctx.textAlign  = "right";
  for (let yi = 0; yi < data.numYears; yi++) {
    const year = data.anoMin + yi;
    if (year % yearStep === 0) {
      const y = TOP_M + yi * cellH + cellH / 2 + 3;
      ctx.fillText(String(year), LEFT_M - 4, y);
    }
  }

  // ── Annotations (right side) ──
  if (!isMobile && RIGHT_M > 0) {
    const annoX = LEFT_M + nP * cellW + 6;
    ctx.font      = `${FONT_SZ * 0.9}px sans-serif`;
    ctx.textAlign = "left";

    const drawn = new Set<number>();
    const MIN_DISTANCE = cellH * 8;

    const allAnnos: { year: number; color: string; label: string }[] = [
      ...extremes.droughts.map((d) => ({ year: d.year, color: "#ef4444", label: "seco" })),
      ...extremes.floods.map((f)   => ({ year: f.year, color: "#60a5fa", label: "cheio" })),
    ];

    for (const anno of allAnnos) {
      const yi = anno.year - data.anoMin;
      if (yi < 0 || yi >= data.numYears) continue;
      const y = TOP_M + yi * cellH + cellH / 2 + 3;
      let tooClose = false;
      for (const dy of drawn) { if (Math.abs(dy - y) < MIN_DISTANCE) { tooClose = true; break; } }
      if (tooClose) continue;
      drawn.add(y);
      ctx.fillStyle = anno.color;
      ctx.fillText(`${anno.year}`, annoX, y);
    }
  }

  // ── Legend ──
  const legY    = TOP_M + gridH + 10;
  const legX0   = LEFT_M;
  const legW    = nP * cellW;                 // same width as the grid
  const rampH   = Math.round(cellH * 0.55);  // ramp height proportional to cell
  const rampH2  = Math.max(8, Math.min(16, rampH));

  // Draw color ramp (one rect per bucket, evenly spaced across full grid width)
  const bCount = BUCKETS.length;
  const bW2    = legW / bCount;
  for (let i = 0; i < bCount; i++) {
    ctx.fillStyle = BUCKETS[i].color;
    ctx.fillRect(legX0 + i * bW2, legY, Math.ceil(bW2) + 1, rampH2);
  }

  // Three anchor labels: left, centre, right
  const labelY = legY + rampH2 + FONT_SZ + 2;
  ctx.font = `${FONT_SZ}px sans-serif`;

  ctx.fillStyle = "#ef4444";
  ctx.textAlign = "left";
  ctx.fillText("← muito seco", legX0, labelY);

  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("normal", legX0 + legW / 2, labelY);

  ctx.fillStyle = "#60a5fa";
  ctx.textAlign = "right";
  ctx.fillText("muito cheio →", legX0 + legW, labelY);

  // Reference note
  ctx.textAlign = "left";
  ctx.fillStyle = "#475569";
  ctx.font = `${Math.round(FONT_SZ * 0.82)}px sans-serif`;
  ctx.fillText(
    `Referência P10–P90: ${periods.inicio}–${periods.fim} · MA-7d · janela ±15 dias`,
    legX0, labelY + FONT_SZ + 4
  );
}

// ─────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────

interface TooltipState {
  x: number; y: number;
  year: number; period: number;
  pos: number | null; cota_m: number | null;
  ranking: ReturnType<typeof rankCell>;
  doyMid: number;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function SeverityCalendarPanel() {
  const [calendarData, setCalendarData] = useState<SeverityCalendarJSON | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [station,      setStation]      = useState<SeverityStation>("Labrea");
  const [resolution,   setResolution]   = useState<"weekly" | "decendial">("weekly");
  const [tooltip,      setTooltip]      = useState<TooltipState | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Busca da rota on-demand /api/severity-calendar, que recalcula com o feed
  // live (volume) sempre que o cache de 6h expira — nunca fica stale.
  // Fallback: JSON estático do build, caso a rota falhe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let r = await fetch("/api/severity-calendar");
        if (!r.ok) r = await fetch("/data/severity-calendar.json"); // fallback estático
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as SeverityCalendarJSON;
        if (!cancelled) setCalendarData(json);
      } catch (e) {
        if (!cancelled) setLoadError(String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const data    = calendarData?.stations[station] ?? null;
  const periods = calendarData?.periods ?? { inicio: 2016, fim: 2023 };
  const extremes = data ? computeExtremes(data, resolution) : { droughts: [], floods: [] };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data) return;
    drawCalendar(canvas, {
      data, resolution,
      containerW: container.clientWidth,
      isMobile,
      periods,
    }, extremes);
  }, [data, resolution, isMobile, extremes, periods]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      setIsMobile(container.clientWidth < 768);
      redraw();
    });
    ro.observe(container);
    setIsMobile(container.clientWidth < 768);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data) return;

    const rect  = canvas.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;
    const L     = computeLayout({ data, resolution, containerW: container.clientWidth, isMobile, periods });

    const pi = Math.floor((mx - L.LEFT_M) / L.cellW);
    const yi = Math.floor((my - L.TOP_M)  / L.cellH);

    if (pi < 0 || pi >= L.nP || yi < 0 || yi >= data.numYears) {
      setTooltip(null);
      return;
    }

    const { pos, cota_m } = getCell(data, yi, pi, resolution);
    const year    = data.anoMin + yi;
    const doyMid  = doyMidOfPeriod(pi, resolution);
    const ranking = pos !== null ? rankCell(data, yi, pi, resolution) : null;

    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      year, period: pi + 1, pos, cota_m, ranking, doyMid,
    });
  }, [data, resolution, isMobile, periods]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleExport = useCallback(() => {
    const container = containerRef.current;
    if (!container || !data) return;
    const offscreen = document.createElement("canvas");
    drawCalendar(offscreen, {
      data, resolution,
      containerW: Math.max(container.clientWidth, 960),
      isMobile: false,
      forExport: true,
      periods,
    }, extremes);
    const url = offscreen.toDataURL("image/png");
    const a   = document.createElement("a");
    a.href = url;
    a.download = `calendário-severidade-${station.toLowerCase()}-${resolution}.png`;
    a.click();
  }, [data, resolution, station, extremes, periods]);

  function tooltipDate(year: number, doyMid: number): string {
    const iso  = isoFromDOY(year, doyMid);
    const dt   = new Date(`${iso}T00:00:00Z`);
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  }

  const stationInfo = STATION_OPTIONS.find((s) => s.key === station)!;

  // ── Loading / error states ──
  if (loadError) {
    return (
      <div className="bg-azul-medio/30 border border-white/10 rounded-lg p-6 text-center">
        <p className="text-red-400 text-sm">Erro ao carregar dados: {loadError}</p>
      </div>
    );
  }

  if (!calendarData || !data) {
    return (
      <div className="bg-azul-medio/30 border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-4 h-4 border-2 border-verde border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Carregando série histórica…</span>
        </div>
        <div className="h-64 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <section className="bg-azul-medio/30 border border-white/10 rounded-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-verde text-[10px] font-bold uppercase tracking-widest mb-0.5">
            Série histórica
          </p>
          <h2 className="text-white font-bold text-base leading-tight">
            Calendário de Severidade Hidrológica
          </h2>
          <p className="text-gray-400 text-xs mt-0.5 leading-snug">
            {stationInfo.label} · {stationInfo.sub} · {data.anoMin}–{data.anoMax}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Station select */}
          <div className="relative">
            <select
              value={station}
              onChange={(e) => setStation(e.target.value as SeverityStation)}
              className="appearance-none bg-azul-marinho border border-white/20 rounded-md text-xs text-white pl-3 pr-7 py-1.5 cursor-pointer hover:border-white/40 transition-colors focus:outline-none focus:ring-1 focus:ring-verde/50"
            >
              {Array.from(new Set(STATION_OPTIONS.map((s) => s.group))).map((group) => (
                <optgroup key={group} label={group}>
                  {STATION_OPTIONS.filter((s) => s.group === group).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} — {s.sub}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>

          {/* Resolution toggle */}
          <div className="flex rounded-md overflow-hidden border border-white/20 text-xs">
            {(["weekly", "decendial"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={`px-3 py-1.5 transition-colors ${
                  resolution === r
                    ? "bg-white/15 text-white font-medium"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {r === "weekly" ? "Semanal" : "Decendial"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 text-xs border border-white/20 rounded-md text-gray-300 hover:text-white transition-colors"
          >
            Como ler
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs border border-white/20 rounded-md text-gray-300 hover:text-white transition-colors"
          >
            Exportar PNG
          </button>
        </div>
      </div>

      {/* ── Station sub-label ── */}
      <div className="px-4 py-1.5 border-b border-white/5 text-xs text-gray-500">
        {STATION_OPTIONS.find((s) => s.key === station)?.sub} · {data.anoMin}–{data.anoMax}
        {station === "Borba" && (
          <span className="ml-2 text-gray-600">· percentis calculados sobre 2016–2023</span>
        )}
      </div>

      {/* ── Canvas ── */}
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair block"
          style={{ maxWidth: "100%", imageRendering: "pixelated" }}
        />

        {/* ── Tooltip ── */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 bg-gray-900/95 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl"
            style={{
              left:      Math.min(tooltip.x + 12, 9999),
              top:       tooltip.y - 10,
              transform: tooltip.x > 500 ? "translateX(-110%)" : undefined,
              minWidth:  "180px",
            }}
          >
            <p className="font-semibold text-white mb-1">
              {tooltip.year} · {resolution === "weekly" ? `Semana ${tooltip.period}` : `Decêndio ${tooltip.period}`}
            </p>
            <p className="text-gray-400 text-[10px] mb-1">
              {tooltipDate(tooltip.year, tooltip.doyMid)}
            </p>
            {tooltip.cota_m !== null ? (
              <>
                <p className="text-gray-200">
                  Cota: <span className="font-mono text-white">{tooltip.cota_m.toFixed(2)} m</span>
                </p>
                <p className="text-gray-200">
                  Pos. rel.:{" "}
                  <span
                    className="font-mono"
                    style={{ color: bucketColor(tooltip.pos) === "#e7e5e4" ? "#d4d4d4" : bucketColor(tooltip.pos) }}
                  >
                    {tooltip.pos !== null ? tooltip.pos.toFixed(3) : "—"}
                  </span>
                </p>
                {tooltip.ranking && (
                  <p className="text-gray-400 text-[10px] mt-1">
                    {tooltip.ranking.rank}º mais {tooltip.ranking.dir} neste período
                    {" "}(de {tooltip.ranking.total} anos)
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500 italic">Sem dados</p>
            )}
          </div>
        )}
      </div>

      {/* ── How to read modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-azul-medio border border-white/20 rounded-xl max-w-lg w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-white font-bold text-base">Como ler o Calendário de Severidade</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="text-gray-300 text-sm space-y-3">
              <p>
                Cada célula representa uma semana (ou decêndio) de um ano específico. A cor indica
                quão seca ou cheia foi aquela semana em relação à climatologia de referência ({periods.inicio}–{periods.fim}).
              </p>
              <p>
                <strong className="text-white">Posição relativa (pos):</strong> calculada como{" "}
                <code className="bg-white/10 px-1 rounded text-xs">(cota − P10) / (P90 − P10)</code>.
                Valores negativos indicam cotas abaixo do P10 histórico; valores acima de 1 indicam acima do P90.
              </p>
              <p>
                <strong className="text-white">Janela Set–Nov:</strong> a moldura amarela tracejada marca a
                janela sazonal de estiagem. Anos com células escuras nessa janela indicam seca severa.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-5 w-full py-2 bg-verde/20 hover:bg-verde/30 text-verde text-sm rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
