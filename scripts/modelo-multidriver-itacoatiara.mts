// Modelo MULTI-DRIVER da vazante de Itacoatiara → CMR.
// Itacoatiara é a confluência de Solimões (Manacapuru), Negro (Manaus) e
// Madeira (Humaitá/Borba). Em vez de recessão univariada, projetamos por um
// ENSEMBLE DE ANÁLOGOS ponderado pela semelhança do ESTADO CONJUNTO das réguas
// (z-score por régua no dia de hoje), nos 10 anos de série diária do projeto.
//   node --import tsx scripts/modelo-multidriver-itacoatiara.mts
// Estado dos formadores: AO VIVO via API de produção (com fallback ao snapshot).
import { cmrDeItacoatiara } from "../lib/cmr-itacoatiara";
import { readFileSync, writeFileSync } from "node:fs";

const API = process.env.DASH_API ?? "https://hidrovia-dashboard-production.up.railway.app";
const GAUGES = ["MAO", "BOR", "MNC", "ITA"] as const;  // Negro, Madeira, Solimões, confluência
const PESO = { MAO: 0.20, BOR: 0.30, MNC: 0.30, ITA: 0.20 };  // Madeira+Solimões lideram
const ALVO = 11.0;

// ── Estado AO VIVO (fallback: snapshot 8/jun/2026) ────────────────────────
const FALLBACK = { data: "2026-06-08", MAO: 28.24, MNC: 18.92, ITA: 13.71, Z_MADEIRA: -0.37 };
async function ana(est: string): Promise<{ cota: number; data: string } | null> {
  for (let t = 0; t < 3; t++) {
    try {
      const j: any = await (await fetch(`${API}/api/ana?estacao=${est}&dias=5`, { signal: AbortSignal.timeout(25000) })).json();
      if (j?.resumo?.cota_m != null) return { cota: j.resumo.cota_m, data: j.resumo.ultima_data };
    } catch { /* retry */ }
  }
  return null;
}
// z sazonal a partir dos percentis-doy (sd ≈ (p90−p10)/2.5631)
const PCT = JSON.parse(readFileSync("public/data/percentis-doy.json", "utf8")).estacoes;
const doyDe = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5); };
function zSazonal(est: string, cota: number, doy: number): number | null {
  const e = PCT[est]; if (!e) return null;
  const i = doy - 1, med = e.mediana?.[i], p10 = e.p10?.[i], p90 = e.p90?.[i];
  if (med == null || p10 == null || p90 == null) return null;
  const sd = ((p90 - p10) / 2.5631) || 1;
  return (cota - med) / sd;
}
const live: Record<string, { cota: number; data: string } | null> = {};
for (const est of ["Manaus", "Manacapuru", "Itacoatiara", "Humaita", "PortoVelho", "Borba", "Manicore"]) live[est] = await ana(est);
const DATA_REF = live.Manaus?.data ?? live.Itacoatiara?.data ?? FALLBACK.data;
const MMDD_HOJE = DATA_REF.slice(5);
const DOY_REF = doyDe(DATA_REF);
// Madeira: média dos z sazonais das réguas vivas (Humaitá, PV, Borba, Manicoré)
const zMad = ["Humaita", "PortoVelho", "Borba", "Manicore"]
  .map((est) => live[est] ? zSazonal(est, live[est]!.cota, DOY_REF) : null)
  .filter((z): z is number => z != null);
const VIVO_2026 = {
  MAO: live.Manaus?.cota ?? FALLBACK.MAO,
  MNC: live.Manacapuru?.cota ?? FALLBACK.MNC,
  ITA: live.Itacoatiara?.cota ?? FALLBACK.ITA,
};
const Z_MADEIRA_2026 = zMad.length ? zMad.reduce((s, z) => s + z, 0) / zMad.length : FALLBACK.Z_MADEIRA;
const AO_VIVO = !!live.Manaus;
console.log(`Estado ${AO_VIVO ? "AO VIVO" : "FALLBACK"} (${DATA_REF}): MAO ${VIVO_2026.MAO} MNC ${VIVO_2026.MNC} ITA ${VIVO_2026.ITA} | z_Madeira ${Z_MADEIRA_2026.toFixed(2)} (n=${zMad.length})`);

// 1) Série diária → coluna por gauge, indexada por ano e "MM-DD"
const linhas = readFileSync("data/4estacoes_2016_2025.csv", "utf8").trim().split(/\r?\n/);
linhas.shift();
const COL = { MAO: 1, ITA: 2, BOR: 3, MNC: 4 };
const dados: Record<string, Record<number, Record<string, number>>> = {};
for (const g of GAUGES) dados[g] = {};
const anos = new Set<number>();
for (const l of linhas) {
  const c = l.split(","); const [Y, M, D] = c[0].split("-"); const ano = +Y, mmdd = `${M}-${D}`;
  anos.add(ano);
  for (const g of GAUGES) { const v = parseFloat(c[COL[g]]); if (!Number.isNaN(v)) (dados[g][ano] ??= {})[mmdd] = v; }
}
const ANOS = [...anos].filter(a => a <= 2024);  // 2025 trunca em jul → fora do match e do mínimo

// 2) Climatologia (média, desvio) por gauge no MM-DD de hoje
function clim(g: string, mmdd: string) {
  const vs = ANOS.map(a => dados[g][a]?.[mmdd]).filter((v): v is number => v != null);
  const m = vs.reduce((s, v) => s + v, 0) / vs.length;
  const sd = Math.sqrt(vs.reduce((s, v) => s + (v - m) ** 2, 0) / vs.length);
  return { m, sd: sd || 1 };
}
const z = (g: string, v: number, mmdd = MMDD_HOJE) => { const { m, sd } = clim(g, mmdd); return (v - m) / sd; };

// 3) z do estado de hoje por ano (histórico) e de 2026
const zHoje2026 = { MAO: z("MAO", VIVO_2026.MAO), MNC: z("MNC", VIVO_2026.MNC), ITA: z("ITA", VIVO_2026.ITA), BOR: Z_MADEIRA_2026 };
const zHist: Record<number, Record<string, number>> = {};
for (const a of ANOS) { zHist[a] = {}; for (const g of GAUGES) { const v = dados[g][a]?.[MMDD_HOJE]; zHist[a][g] = v != null ? z(g, v) : 0; } }

// 4) Distância no espaço dos drivers + pesos por análogo (kernel gaussiano adaptativo)
const dist = (a: number) => Math.sqrt(GAUGES.reduce((s, g) => s + PESO[g] * (zHoje2026[g] - zHist[a][g]) ** 2, 0));
const dById = ANOS.map(a => ({ a, d: dist(a) }));
const h = [...dById].sort((x, y) => x.d - y.d)[Math.floor(dById.length / 2)].d || 1;  // bandwidth = mediana
const wRaw = dById.map(({ a, d }) => ({ a, w: Math.exp(-(d * d) / (2 * h * h)) }));
const sw = wRaw.reduce((s, x) => s + x.w, 0);
const W = wRaw.map(x => ({ a: x.a, w: x.w / sw })).sort((x, y) => y.w - x.w);

// 5) Trajetória de Itacoatiara projetada = média ponderada dos análogos por MM-DD
function* datasVazante() { const meses = [[6,30],[7,31],[8,31],[9,30],[10,31],[11,30],[12,31]] as const; for (const [m, dd] of meses) for (let d = 1; d <= dd; d++) { const mmdd = `${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; if (mmdd >= MMDD_HOJE) yield mmdd; } }
const Z80t = 1.2816;
const serieCMR: { data: string; central: number; lo: number; hi: number }[] = [];
for (const mmdd of datasVazante()) {
  const pares = W.map(({ a, w }) => ({ w, v: dados.ITA[a]?.[mmdd] })).filter((x): x is {w:number,v:number} => x.v != null);
  const den = pares.reduce((s, x) => s + x.w, 0);
  if (den <= 0) continue;
  const mean = pares.reduce((s, x) => s + x.w * x.v, 0) / den;
  const sd = Math.sqrt(pares.reduce((s, x) => s + x.w * (x.v - mean) ** 2, 0) / den);
  serieCMR.push({ data: `2026-${mmdd}`,
    central: +cmrDeItacoatiara(mean).toFixed(2),
    lo: +cmrDeItacoatiara(mean - Z80t * sd).toFixed(2),
    hi: +cmrDeItacoatiara(mean + Z80t * sd).toFixed(2) });
}
// 6) Mínimo de Itacoatiara por ano (vazante) → distribuição ponderada → CMR
const minItaAno = (a: number) => { let mn = Infinity; for (const mmdd of datasVazante()) { const v = dados.ITA[a]?.[mmdd]; if (v != null) mn = Math.min(mn, v); } return mn; };
const mins = W.map(({ a, w }) => ({ a, w, min: minItaAno(a) })).filter(x => isFinite(x.min));
const meanMin = mins.reduce((s, x) => s + x.w * x.min, 0) / mins.reduce((s, x) => s + x.w, 0);
const sdMin = Math.sqrt(mins.reduce((s, x) => s + x.w * (x.min - meanMin) ** 2, 0) / mins.reduce((s, x) => s + x.w, 0));
const Z80 = 1.2816;
const itaMinCentral = meanMin, itaMinLo = meanMin - Z80 * sdMin, itaMinHi = meanMin + Z80 * sdMin;
const cmr2 = (x: number) => +cmrDeItacoatiara(x).toFixed(2);
const proj = { central: cmr2(itaMinCentral), pessimista: cmr2(itaMinLo), otimista: cmr2(itaMinHi), ita_central: +itaMinCentral.toFixed(2) };

// Reescala a forma da trajetória para terminar no mínimo PROJETADO (a média-por-
// data borra o fundo porque as mínimas dos análogos caem em datas diferentes).
function rescala(key: "central" | "lo" | "hi", alvo: number) {
  const s0 = serieCMR[0][key];
  const smin = Math.min(...serieCMR.map(p => p[key]));
  const f = (s0 - alvo) / ((s0 - smin) || 1);
  for (const p of serieCMR) p[key] = +(s0 + (p[key] - s0) * f).toFixed(2);
}
rescala("central", proj.central); rescala("lo", proj.pessimista); rescala("hi", proj.otimista);

// 7) Cruzamento CMR<11 (data) — por ano-análogo, média ponderada
function cruzaAno(a: number): string | null { for (const mmdd of datasVazante()) { const v = dados.ITA[a]?.[mmdd]; if (v != null && cmrDeItacoatiara(v) < ALVO) return mmdd; } return null; }
const toDoy = (mmdd: string) => { const [m, d] = mmdd.split("-").map(Number); return Math.floor((Date.UTC(2026, m - 1, d) - Date.UTC(2026, 0, 0)) / 864e5); };
const cruz = W.map(({ a, w }) => ({ a, w, c: cruzaAno(a) })).filter(x => x.c);
const meanDoy = cruz.reduce((s, x) => s + x.w * toDoy(x.c!), 0) / cruz.reduce((s, x) => s + x.w, 0);
const sdDoy = Math.sqrt(cruz.reduce((s, x) => s + x.w * (toDoy(x.c!) - meanDoy) ** 2, 0) / cruz.reduce((s, x) => s + x.w, 0));
const doy2iso = (doy: number) => { const d = new Date(Date.UTC(2026, 0, doy)); return d.toISOString().slice(0, 10); };
const cross = { central: doy2iso(Math.round(meanDoy)), cedo: doy2iso(Math.round(meanDoy - Z80 * sdDoy)), tarde: doy2iso(Math.round(meanDoy + Z80 * sdDoy)) };

const out = {
  metodo: "ensemble de análogos multi-driver (Negro+Madeira+Solimões+Itacoatiara), kernel gaussiano sobre z-scores do estado de montante",
  data_referencia: DATA_REF, ao_vivo: AO_VIVO, vivo_2026: { ...VIVO_2026, z_madeira: +Z_MADEIRA_2026.toFixed(2) },
  pesos_driver: PESO, z_2026: Object.fromEntries(GAUGES.map(g => [g, +zHoje2026[g].toFixed(2)])),
  analogos_top: W.slice(0, 4).map(x => ({ ano: x.a, peso: +x.w.toFixed(3), z: Object.fromEntries(GAUGES.map(g => [g, +zHist[x.a][g].toFixed(2)])) })),
  projecao_cmr_2026: proj, ita_min_central: +itaMinCentral.toFixed(2),
  cruzamento_cmr11: cross,
  serie_cmr: serieCMR,
};
writeFileSync("data/projecao-multidriver-itacoatiara.json", JSON.stringify(out, null, 2), "utf8");

console.log("z 2026 (anomalia por driver):", JSON.stringify(out.z_2026), "  (negativo = seco)");
console.log("Top análogos:", W.slice(0, 4).map(x => `${x.a} (${(x.w * 100).toFixed(0)}%)`).join(", "));
console.log("CMR mínimo 2026 (multi-driver): central", proj.central, "| pess", proj.pessimista, "| otim", proj.otimista);
console.log("CMR<11m: central", cross.central, "| faixa", cross.cedo, "→", cross.tarde);
console.log("(univariado dava: análogo 2020, CMR central 9,86, restrição ~26/set)");
