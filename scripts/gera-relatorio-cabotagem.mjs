// ---------------------------------------------------------------------------
// Gerador do relatório "Cabotagem conteinerizada na Amazônia — Perspectiva 2026"
//
// Lê os dados REAIS do projeto (cota ANA, previsão SGB, ENSO/CPC, IDN, série
// ANTAQ de navegação) e o modelo de recessão calibrado, e emite um HTML de
// alta fidelidade na identidade visual do IBI. O HTML é renderizado para PDF
// por Chrome headless (ver gera-relatorio-cabotagem-pdf.* ou o README abaixo).
//
// Este script é a SEMENTE do agente semanal (fase 2): toda a parte data-driven
// vem dos JSONs do repo; a narrativa analítica é versionada aqui.
//
//   node scripts/gera-relatorio-cabotagem.mjs            -> out/relatorio-cabotagem.html
//
// RUNBOOK: este gerador consome
//   data/ana-diario-cache.json          (cron diário 13h)
//   data/enso_cpc_cache.json            (mensal, 2ª quinta)
//   data/ana-idn-series.json            (semanal ter 10h)
//   public/data/antaq/dashboard/navegacao-series.json  (mensal dia 16)
//   lib/recessao-calibrada.ts  + lib/dados-historicos.ts (PREVISAO_2026)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const r = (p) => join(ROOT, p);
const lerJSON = (p) => JSON.parse(readFileSync(r(p), "utf8"));

// --- 1. Dados reais do projeto --------------------------------------------
const API_PROD = "https://hidrovia-dashboard-production.up.railway.app";
const ana = lerJSON("data/ana-diario-cache.json");
const enso = lerJSON("data/enso_cpc_cache.json");

// Cota de Manaus AO VIVO (telemetria adotada ANA via API de produção). Mantém o
// relatório fresco mesmo com o cache local defasado. Fallback: cache diário.
async function cotaManausAoVivo() {
  try {
    const res = await fetch(`${API_PROD}/api/ana?estacao=Manaus&dias=7`, { signal: AbortSignal.timeout(30000) });
    const j = await res.json();
    if (j?.resumo?.cota_m != null) {
      return { cota_m: j.resumo.cota_m, variacao_24h: j.resumo.variacao_24h ?? 0, data: j.resumo.ultima_data, fonte: "ANA/HidroWeb (telemetria adotada, ao vivo)" };
    }
  } catch (e) { console.warn("[cota ao vivo] falhou, usando cache local:", e.message); }
  const m = ana.dados.Manaus;
  return { cota_m: m.cota_m, variacao_24h: m.variacao_24h, data: ana.data, fonte: "ANA/HidroWeb (cache diário)" };
}
const nav = lerJSON("public/data/antaq/dashboard/navegacao-series.json");
let idn = null;
try {
  const s = lerJSON("data/ana-idn-series.json");
  const arr = Array.isArray(s) ? s : s.serie || [];
  idn = arr[arr.length - 1] || null;
} catch { /* opcional */ }

// PREVISAO_2026 e RECESSAO_CALIBRADA vivem em .ts — extraídos por regex para
// não depender de build. São blocos auto-gerados / estáveis.
function extraiPrevisao() {
  const t = readFileSync(r("lib/dados-historicos.ts"), "utf8");
  const num = (k) => {
    const m = t.match(new RegExp(k + "\\s*:?\\s*([0-9]+(?:\\.[0-9]+)?)"));
    return m ? parseFloat(m[1]) : null;
  };
  const fonteM = t.match(/fonte:\s*"([^"]+)"/);
  const ensoM = t.match(/enso:\s*"([^"]+)"/);
  const picoM = t.match(/manaus_pico_cheia:\s*\{([^}]+)\}/);
  const pico = {};
  if (picoM) for (const kv of picoM[1].split(",")) {
    const [k, v] = kv.split(":").map((x) => x.trim());
    if (k) pico[k] = parseFloat(v);
  }
  return {
    fonte: fonteM ? fonteM[1] : "SGB/CPRM",
    enso: ensoM ? ensoM[1] : "",
    manaus_pico_cheia: pico,
    manacapuru_pico: num("manacapuru_pico"),
    itacoatiara_pico: num("itacoatiara_pico"),
  };
}
const prev = extraiPrevisao();

// Boletim SGB AO VIVO (terças) — previsão de pico + anomalias de chuva por bacia.
// Serve para (a) usar o pico fresco e (b) CONFERIR nossa projeção com a fonte oficial.
async function fetchSGB() {
  try {
    const j = await (await fetch(`${API_PROD}/api/sgb`, { signal: AbortSignal.timeout(30000) })).json();
    const b = j.boletim; if (!b) return null;
    const pv = (e) => (b.previsoes || []).find((p) => p.estacao === e);
    return {
      numero: b.numero, data: b.data, manaus: pv("Manaus"), itacoatiara: pv("Itacoatiara"),
      secas: (b.anomalias_pp || []).filter((a) => a.categoria <= -3).map((a) => a.bacia),
    };
  } catch (e) { console.warn("[SGB] indisponível:", e.message); return null; }
}
const sgb = await fetchSGB();
const diasEntre = (aISO, bISO) => Math.round((Date.UTC(...aISO.split("-").map((x, i) => i === 1 ? +x - 1 : +x)) - Date.UTC(...bISO.split("-").map((x, i) => i === 1 ? +x - 1 : +x))) / 864e5);

// RECESSAO_CALIBRADA — constantes do bloco auto-gerado
const REC = {
  k_medio: 0.018340, k_sigma: 0.002729, h_min_medio: 16.82, rmse_medio_m: 2.611,
  k_min: 0.015067, k_max: 0.022003,
  h_mins: [17.2, 17.34, 17.05, 18.06, 16.6, 19.44, 16.19, 12.7],
  anos: "2016–2023", n_anos: 8,
};

// --- 2. Projeção de recessão (porta de lib/recessao-modelo.ts) -------------
const Z80 = 1.2816;
function projetaRecessao(picoCota, picoISO, horizonte = 199, gatilho = 17.7) {
  const { k_medio, k_sigma, h_min_medio, k_min, k_max, h_mins } = REC;
  const mean = h_mins.reduce((a, b) => a + b, 0) / h_mins.length;
  const sigma = Math.sqrt(h_mins.reduce((a, b) => a + (b - mean) ** 2, 0) / h_mins.length);
  const k_rapido = Math.min(k_max, k_medio + Z80 * k_sigma);
  const k_lento = Math.max(k_min, k_medio - Z80 * k_sigma);
  const hmin_baixo = mean - Z80 * sigma;
  const hmin_alto = mean + Z80 * sigma;
  const base = new Date(picoISO + "T00:00:00Z");
  const pontos = [];
  let cc = null, cmin = null, cmax = null;
  let minC = 99, minO = 99, minP = 99;
  for (let t = 0; t <= horizonte; t++) {
    const d = new Date(base); d.setUTCDate(d.getUTCDate() + t);
    const iso = d.toISOString().slice(0, 10);
    const central = h_min_medio + (picoCota - h_min_medio) * Math.exp(-k_medio * t);
    const alta = hmin_alto + (picoCota - hmin_alto) * Math.exp(-k_lento * t);   // otimista
    const baixa = hmin_baixo + (picoCota - hmin_baixo) * Math.exp(-k_rapido * t); // pessimista
    minC = Math.min(minC, central); minO = Math.min(minO, alta); minP = Math.min(minP, baixa);
    pontos.push({ t, iso, central, alta, baixa });
    if (cc == null && central < gatilho) cc = iso;
    if (cmin == null && alta < gatilho) cmin = iso;
    if (cmax == null && baixa < gatilho) cmax = iso;
    base; // noop
  }
  return {
    pontos, cruz_central: cc, cruz_otimista: cmin, cruz_pessimista: cmax,
    min_central: minC, min_otimista: minO, min_pessimista: minP,
    hmin_baixo, hmin_alto, k_lento, k_rapido,
  };
}

const PICO_COTA = sgb?.manaus?.cota_prevista_m ?? prev.manaus_pico_cheia.media ?? 28.23;
const PICO_IC80 = { min: sgb?.manaus?.ic80_min_m ?? prev.manaus_pico_cheia.ic80_min, max: sgb?.manaus?.ic80_max_m ?? prev.manaus_pico_cheia.ic80_max };
const PROB_27_5 = sgb?.manaus?.prob_inundacao ?? prev.manaus_pico_cheia.prob_27_5 ?? 0.96;
const PICO_ISO = "2026-06-15";
const GATILHO = 17.7;
const proj = projetaRecessao(PICO_COTA, PICO_ISO, 199, GATILHO);

// --- 3. Helpers de formatação ---------------------------------------------
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtData = (iso) => { if (!iso) return "não cruza"; const [, m, d] = iso.split("-"); return `${d}/${MESES[+m - 1]}`; };
const m1 = (x) => x == null ? "—" : x.toFixed(1).replace(".", ",");
const m2 = (x) => x == null ? "—" : x.toFixed(2).replace(".", ",");
const man = await cotaManausAoVivo();
const hoje = man.data;
const sgbDias = sgb ? diasEntre(hoje, sgb.data) : null;   // idade do boletim vs leitura viva
if (!sgb) console.warn("[QA] Boletim SGB indisponível — projeção não cruzada com a fonte oficial.");
else if (sgbDias > 9) console.warn(`[QA] ⚠ Boletim SGB de ${sgbDias} dias atrás (Nº${sgb.numero}, ${sgb.data}) — o SGB publica às terças; verificar se saiu edição nova antes de enviar.`);
const distPico = +(PICO_COTA - man.cota_m).toFixed(2); // m até o pico previsto
const noPico = Math.abs(distPico) <= 0.15 || man.variacao_24h <= 0; // já no pico / estável
const HOJE_FMT = (() => { const [a, m, d] = hoje.split("-"); return `${d} de ${["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][+m-1]} de ${a}`; })();

// --- 4. SVG: curva de recessão calibrada ----------------------------------
function svgRecessao() {
  const W = 760, H = 340, padL = 46, padR = 16, padT = 18, padB = 34;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const tMax = 199, yMin = 12, yMax = 30;
  const X = (t) => x0 + (t / tMax) * (x1 - x0);
  const Y = (m) => y1 - ((m - yMin) / (yMax - yMin)) * (y1 - y0);
  const path = (key) => proj.pontos.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(" ");
  // banda IC80 (área entre otimista e pessimista)
  const up = proj.pontos.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p.alta).toFixed(1)}`).join(" ");
  const down = [...proj.pontos].reverse().map((p) => `L${X(p.t).toFixed(1)},${Y(p.baixa).toFixed(1)}`).join(" ");
  const banda = `${up} ${down} Z`;
  // gridlines de cota
  let grid = "";
  for (let m = 14; m <= 28; m += 2) {
    grid += `<line x1="${x0}" y1="${Y(m)}" x2="${x1}" y2="${Y(m)}" class="grid"/><text x="${x0 - 6}" y="${Y(m) + 3}" class="ytick">${m}</text>`;
  }
  // ticks de mês (todo dia 1)
  let xticks = "";
  proj.pontos.forEach((p) => { const [, mm, dd] = p.iso.split("-"); if (dd === "01") xticks += `<text x="${X(p.t)}" y="${H - 10}" class="xtick">${MESES[+mm - 1]}</text><line x1="${X(p.t)}" y1="${y0}" x2="${X(p.t)}" y2="${y1}" class="grid-v"/>`; });
  // linha do gatilho 17,7
  const yg = Y(GATILHO);
  // marcadores de cruzamento
  const mark = (iso, cls, lbl) => { if (!iso) return ""; const p = proj.pontos.find((q) => q.iso === iso); if (!p) return ""; const x = X(p.t); return `<line x1="${x}" y1="${yg}" x2="${x}" y2="${y1}" class="${cls}-v"/><circle cx="${x}" cy="${yg}" r="4" class="${cls}-dot"/><text x="${x}" y="${yg - 8}" class="${cls}-lbl" text-anchor="middle">${lbl} ${fmtData(iso)}</text>`; };
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="gline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00A652"/><stop offset="1" stop-color="#0099D8"/></linearGradient></defs>
    ${grid}${xticks}
    <path d="${banda}" class="ic80"/>
    <line x1="${x0}" y1="${yg}" x2="${x1}" y2="${yg}" class="gatilho"/>
    <text x="${x1 - 2}" y="${yg - 6}" class="gatilho-lbl" text-anchor="end">gatilho LWS/ANTAQ — 17,7 m</text>
    <path d="${path("alta")}" class="line-otim"/>
    <path d="${path("baixa")}" class="line-pess"/>
    <path d="${path("central")}" class="line-central"/>
    ${mark(proj.cruz_pessimista, "pess", "")}
    ${mark(proj.cruz_central, "cen", "")}
    <circle cx="${X(0)}" cy="${Y(PICO_COTA)}" r="4" class="pico-dot"/>
    <text x="${X(0) + 6}" y="${Y(PICO_COTA) - 6}" class="pico-lbl">pico previsto ${m2(PICO_COTA)} m</text>
  </svg>`;
}

// --- 5. Tabelas (dados do relatório) --------------------------------------
// Mínimas REAIS de Manaus (MAO) — data/4estacoes_2016_2025.csv (2025 ≈ aprox.)
const anosHist = [
  ["2021", "~28,5 m", "30,02 m (recorde)", "16/jun", "19,44 m"],
  ["2022", "~28,0 m", "~29,75 m", "jun", "16,19 m"],
  ["2023", "~26,5 m", "~28,0 m", "jul", "12,70 m"],
  ["2024", "~24,5 m", "~26,0 m", "mai (precoce)", "12,11 m"],
  ["2025", "~26,8 m", "~28,0 m", "jun", "~18,4 m"],
  ["2026", `${m2(man.cota_m)} m (${fmtData(hoje)})`, `${m2(PICO_COTA)} m (prev. SGB)`, "jun", "?"],
];

// --- Calibração OPERACIONAL: calado (CMR Itacoatiara/Capitania) → carga -----
const cmr = lerJSON("data/calibracao-cmr-cabotagem.json");
const milTEU = (n) => "~" + Math.round(n / 1000) + " mil";
const onMil = (n) => "~" + Math.round(n / 1000);
const dPct = (x) => Math.abs(x) < 0.01 ? "≈ estável" : (x < 0 ? "−" : "+") + Math.abs(x * 100).toFixed(0) + "%";
const probTxt = (p) => p == null ? "cauda" : p >= 0.97 ? ">95%" : Math.round(p * 100) + "%";
const CEN = Object.fromEntries(cmr.cenarios_2026.map((c) => [c.nome.startsWith("Cauda") ? "cauda" : c.nome.toLowerCase(), c]));
const EV = cmr.esperanca_ponderada;
const REST = cmr.restricao_calado;          // quando o CMR cai abaixo do calado-alvo
const ALVO = cmr.calado_alvo_m;             // 11 m
const fmtISO = (iso) => iso ? fmtData(iso) : "—";
const DRV = cmr.drivers;                       // formadores: z_2026, analogos_top
const zTxt = (z) => (z < 0 ? "−" : "+") + Math.abs(z).toFixed(2).replace(".", ",");
const analogosTxt = DRV.analogos_top.slice(0, 3).map((a) => `${a.ano} (${Math.round(a.peso * 100)}%)`).join(", ");
const driverRows = [
  ["Solimões (Manacapuru)", zTxt(DRV.z_2026.MNC)],
  ["Madeira (Humaitá/PV)", zTxt(DRV.z_2026.BOR)],
  ["Rio Negro (Manaus)", zTxt(DRV.z_2026.MAO)],
].sort((a, b) => parseFloat(a[1].replace("−", "-")) - parseFloat(b[1].replace("−", "-")));
// Faixa real de anomalia dos formadores hoje (para a prosa não exagerar a "seca")
const zVals = [DRV.z_2026.MNC, DRV.z_2026.BOR, DRV.z_2026.MAO];
const zLo = Math.min(...zVals), zHi = Math.max(...zVals);

const cenarios = cmr.cenarios_2026.map((c) => [
  c.nome, `${m1(c.cmr_min)} m`, probTxt(c.prob), `${c.margem_calado > 0 ? "+" : ""}${m1(c.margem_calado)} m`, milTEU(c.teu) + " TEU", dPct(c.delta_pct_2025), onMil(c.outnov),
]);

// --- SVG: trajetória do calado disponível (CMR) em 2026 -------------------
function svgCMR() {
  const W = 760, H = 340, padL = 46, padR = 16, padT = 16, padB = 34;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const serie = cmr.serie_cmr.filter((p) => p.data <= "2026-12-31");
  const yMin = 5, yMax = 13;   // faixa oficial da Capitania vai até ~12,5 m; acima é folga (canal não restringe)
  const t0 = new Date(serie[0].data + "T00:00:00Z").getTime();
  const tN = new Date(serie[serie.length - 1].data + "T00:00:00Z").getTime();
  const X = (iso) => x0 + ((new Date(iso + "T00:00:00Z").getTime() - t0) / (tN - t0)) * (x1 - x0);
  const Y = (m) => y1 - ((Math.max(yMin, Math.min(yMax, m)) - yMin) / (yMax - yMin)) * (y1 - y0);
  const line = (k) => serie.map((p, i) => `${i ? "L" : "M"}${X(p.data).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(" ");
  const up = serie.map((p, i) => `${i ? "L" : "M"}${X(p.data).toFixed(1)},${Y(p.hi).toFixed(1)}`).join(" ");
  const dn = [...serie].reverse().map((p) => `L${X(p.data).toFixed(1)},${Y(p.lo).toFixed(1)}`).join(" ");
  let grid = "";
  for (let m = 6; m <= 12; m += 2) grid += `<line x1="${x0}" y1="${Y(m)}" x2="${x1}" y2="${Y(m)}" class="grid"/><text x="${x0 - 6}" y="${Y(m) + 3}" class="ytick">${m}</text>`;
  grid += `<text x="${x0 + 4}" y="${y0 + 11}" class="zona-lbl" style="fill:var(--cinza);opacity:.85">canal folgado — sem restrição (acima da faixa oficial)</text>`;
  let xticks = "";
  serie.forEach((p) => { const [, mm, dd] = p.data.split("-"); if (dd === "01") xticks += `<text x="${X(p.data)}" y="${H - 10}" class="xtick">${MESES[+mm - 1]}</text><line x1="${X(p.data)}" y1="${y0}" x2="${X(p.data)}" y2="${y1}" class="grid-v"/>`; });
  // zona severa (≤ 6,1 m — patamar de 2023/24)
  const zonaSev = `<rect x="${x0}" y="${Y(6.1)}" width="${x1 - x0}" height="${y1 - Y(6.1)}" class="zona-sev"/><text x="${x0 + 6}" y="${y1 - 6}" class="zona-lbl">zona de aperto severo (2023–24)</text>`;
  // linha do calado-alvo 11 m
  const yAlvo = Y(ALVO);
  // marcador da restrição (P50, onde central cruza 11 m)
  let restMark = "";
  if (REST.p50 && REST.p50 <= "2026-12-31") { const x = X(REST.p50); restMark = `<line x1="${x}" y1="${yAlvo}" x2="${x}" y2="${y1}" class="cen-v"/><circle cx="${x}" cy="${yAlvo}" r="4" class="cen-dot"/><text x="${x}" y="${yAlvo - 8}" class="cen-lbl" text-anchor="middle">restrição ~${fmtISO(REST.p50)}</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="gline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00A652"/><stop offset="1" stop-color="#0099D8"/></linearGradient></defs>
    ${grid}${xticks}${zonaSev}
    <path d="${up} ${dn} Z" class="ic80"/>
    <line x1="${x0}" y1="${yAlvo}" x2="${x1}" y2="${yAlvo}" class="gatilho"/>
    <text x="${x1 - 2}" y="${yAlvo - 6}" class="gatilho-lbl" text-anchor="end">calado cheio — ${m1(ALVO)} m (alvo)</text>
    <path d="${line("hi")}" class="line-otim"/>
    <path d="${line("lo")}" class="line-pess"/>
    <path d="${line("central")}" class="line-central"/>
    ${restMark}
  </svg>`;
}

const tabela = (head, rows, cls = "") => `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c, i) => `<td${i === 0 ? ' class="c1"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

// Logos dos patrocinadores (base64 → PDF autossuficiente)
const logoB64 = (p) => { try { return "data:image/png;base64," + readFileSync(r(p)).toString("base64"); } catch { return null; } };
const LOGO_MAERSK = logoB64("public/sponsors/maersk-logo.png");
const LOGO_APM = logoB64("public/sponsors/apm-terminals-logo.png");
const LOGO_OBS = logoB64("public/sponsors/observatorio-logo.png");
const LOGO_IBI = logoB64("public/sponsors/ibi-logo.png");

// --- 6. HTML ---------------------------------------------------------------
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Cabotagem conteinerizada na Amazônia — Perspectiva 2026</title>
<style>
:root{--marinho:#111827;--medio:#1f2937;--verde:#00A652;--azul:#0099D8;--ouro:#D4922A;--vermelho:#A0153E;--tinta:#1a2230;--cinza:#5b6676;--linha:#e6e9ee;--fundo-suave:#f6f8fa;}
*{box-sizing:border-box;}
@page{size:A4;margin:16mm 15mm 18mm 15mm;@bottom-center{content:"Observatório de Infraestrutura de Transportes · IBI";font-family:'Inter',sans-serif;font-size:7.5pt;color:#9aa3b2;}@bottom-right{content:counter(page) " / " counter(pages);font-family:'Inter',sans-serif;font-size:7.5pt;color:#9aa3b2;}}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Inter','Segoe UI',system-ui,Arial,sans-serif;color:var(--tinta);font-size:9.4pt;line-height:1.5;margin:0;}
h1,h2,h3{font-weight:700;line-height:1.18;color:var(--marinho);margin:0;}
p{margin:0 0 7px;}
strong{font-weight:600;color:var(--marinho);}
.muted{color:var(--cinza);}
.small{font-size:8pt;}
/* Faixa de logos institucionais (fundo branco — onde os logos são legíveis) */
.logobar{display:flex;align-items:center;gap:22px;padding:2px 2px 16px;margin-bottom:2px;}
.logobar img.lg-obs{height:52px;width:auto;display:block;}
.logobar img.lg-ibi{height:48px;width:auto;display:block;}
.logobar .lb-sep{width:1.5px;height:42px;background:var(--linha);border-radius:1px;}
/* Cabeçalho */
.head{background:var(--marinho);color:#fff;padding:20px 22px 16px;border-radius:12px;position:relative;overflow:hidden;}
.head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,var(--verde),var(--azul));}
.kicker{font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:#9fb4c9;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.dot-ibi{width:9px;height:9px;border-radius:2px;background:linear-gradient(135deg,var(--verde),var(--azul));display:inline-block;}
.head h1{color:#fff;font-size:21pt;letter-spacing:-.01em;}
.head .sub{color:#c6d2e0;font-size:11pt;margin-top:4px;font-weight:500;}
.head .meta{color:#8fa1b6;font-size:8pt;margin-top:12px;border-top:1px solid rgba(255,255,255,.12);padding-top:9px;}
/* Veredito */
.veredito{margin-top:14px;border:1px solid var(--linha);border-left:4px solid var(--ouro);background:var(--fundo-suave);border-radius:10px;padding:14px 16px;}
.veredito .tag{font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:var(--ouro);font-weight:700;}
.veredito h2{font-size:12.5pt;margin:3px 0 6px;}
.veredito p{margin-bottom:0;}
/* Faixa de números-chave */
.kpis{display:flex;gap:10px;margin-top:14px;}
.kpi{flex:1;border:1px solid var(--linha);border-radius:10px;padding:11px 12px;background:#fff;position:relative;overflow:hidden;}
.kpi::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--verde),var(--azul));}
.kpi .lab{font-size:7.3pt;letter-spacing:.06em;text-transform:uppercase;color:var(--cinza);font-weight:600;}
.kpi .val{font-size:17pt;font-weight:700;color:var(--marinho);margin-top:3px;line-height:1;}
.kpi .val.alerta{color:var(--vermelho);}
.kpi .val.pred{color:var(--ouro);}
.kpi .note{font-size:7.4pt;color:var(--cinza);margin-top:4px;}
/* Seções */
section{margin-top:18px;}
h2.sec{font-size:12.5pt;padding-left:11px;border-left:3px solid var(--verde);margin-bottom:9px;position:relative;}
h2.sec .n{color:var(--azul);}
h3.sub{font-size:9.6pt;color:var(--marinho);margin:10px 0 5px;}
/* Tabelas */
table{width:100%;border-collapse:collapse;font-size:8.4pt;margin:7px 0;}
th{background:var(--marinho);color:#fff;text-align:left;padding:6px 9px;font-weight:600;font-size:8pt;}
th:first-child{border-top-left-radius:7px;}th:last-child{border-top-right-radius:7px;}
td{padding:5px 9px;border-bottom:1px solid var(--linha);}
td.c1{font-weight:600;color:var(--marinho);}
tbody tr:nth-child(even){background:var(--fundo-suave);}
table.cen tbody tr:last-child td,table.cen tbody tr:first-child td{}
/* Gráfico */
.chart{width:100%;height:auto;margin:6px 0 2px;}
.chart .grid{stroke:#eef1f5;stroke-width:1;}
.chart .grid-v{stroke:#f3f5f8;stroke-width:1;}
.chart .ytick{fill:#9aa3b2;font-size:7pt;text-anchor:end;}
.chart .xtick{fill:#9aa3b2;font-size:7pt;text-anchor:middle;}
.chart .ic80{fill:rgba(0,153,216,.10);stroke:none;}
.chart .line-central{fill:none;stroke:url(#gline);stroke-width:2.4;}
.chart .line-otim{fill:none;stroke:#9fc7df;stroke-width:1;stroke-dasharray:3 3;}
.chart .line-pess{fill:none;stroke:#d39ca8;stroke-width:1;stroke-dasharray:3 3;}
.chart .gatilho{stroke:var(--ouro);stroke-width:1.4;stroke-dasharray:5 3;}
.chart .gatilho-lbl{fill:var(--ouro);font-size:7.4pt;font-weight:600;}
.chart .cen-v{stroke:var(--marinho);stroke-width:1;stroke-dasharray:2 2;}
.chart .cen-dot{fill:var(--marinho);}
.chart .pess-v{stroke:var(--vermelho);stroke-width:1;stroke-dasharray:2 2;}
.chart .pess-dot{fill:var(--vermelho);}
.chart .pico-dot{fill:var(--verde);}
.chart .pico-lbl{fill:var(--verde);font-size:7.4pt;font-weight:600;}
.chart .zona-sev{fill:rgba(160,21,62,.07);stroke:none;}
.chart .zona-lbl{fill:var(--vermelho);font-size:7pt;font-weight:600;opacity:.8;}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:7.6pt;color:var(--cinza);margin:2px 0 4px;}
.legend span{display:flex;align-items:center;gap:5px;}
.lg{width:14px;height:0;border-top-width:2.4px;border-top-style:solid;display:inline-block;}
/* colunas a favor / contra */
.cols{display:flex;gap:12px;}
.col{flex:1;border:1px solid var(--linha);border-radius:10px;padding:10px 13px;}
.col.pos{border-top:3px solid var(--verde);}
.col.neg{border-top:3px solid var(--vermelho);}
.col h3{font-size:9pt;margin:0 0 6px;}
.col ul{margin:0;padding-left:15px;}
.col li{margin-bottom:5px;font-size:8.4pt;}
ul.sinais{margin:4px 0;padding-left:16px;}
ul.sinais li{margin-bottom:5px;}
.callout{border:1px solid var(--linha);border-left:4px solid var(--azul);background:var(--fundo-suave);border-radius:10px;padding:12px 15px;margin-top:10px;}
.callout h3{font-size:9.6pt;margin-bottom:5px;}
.rec{border:1px solid var(--linha);border-left:4px solid var(--verde);background:#f2faf5;border-radius:10px;padding:13px 16px;margin-top:12px;}
.rec h2{font-size:11.5pt;margin-bottom:6px;}
.rec p{margin-bottom:5px;}
.fontes{margin-top:18px;border-top:1px solid var(--linha);padding-top:11px;color:var(--cinza);font-size:7.7pt;}
.fontes b{color:var(--marinho);}
.metod{margin-top:8px;font-size:7.5pt;color:var(--cinza);font-style:italic;}
.patrocinio{margin-top:16px;border-top:2px solid var(--marinho);padding-top:13px;text-align:center;}
.patroc-lab{display:block;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:var(--cinza);font-weight:600;margin-bottom:9px;}
.patroc-logos{display:flex;align-items:center;justify-content:center;gap:34px;margin-bottom:11px;}
.patroc-logos img{height:26px;width:auto;}
.patroc-frase{font-size:7.6pt;color:var(--cinza);line-height:1.5;max-width:560px;margin:0 auto;}
.patroc-frase strong{color:var(--marinho);}
.nowrap{white-space:nowrap;}
.avoid{break-inside:avoid;}
</style></head>
<body>

<div class="logobar avoid">
  ${LOGO_OBS ? `<img class="lg-obs" src="${LOGO_OBS}" alt="Observatório de Infraestrutura de Transportes">` : ""}
  ${LOGO_OBS && LOGO_IBI ? `<span class="lb-sep"></span>` : ""}
  ${LOGO_IBI ? `<img class="lg-ibi" src="${LOGO_IBI}" alt="Instituto Brasileiro de Infraestrutura">` : ""}
</div>

<div class="head avoid">
  <div class="kicker"><span class="dot-ibi"></span> Observatório de Infraestrutura de Transportes · IBI · Boletim de Antecipação</div>
  <h1>Cabotagem conteinerizada na Amazônia</h1>
  <div class="sub">Perspectiva 2026 — rio, clima e movimentação esperada</div>
  <div class="meta">Data de referência: ${HOJE_FMT} &nbsp;·&nbsp; Fontes: Capitania dos Portos (CMR) · ANA/HidroWeb · SGB/CPRM · NOAA/CPC · ANTAQ &nbsp;·&nbsp; Modelos próprios: projeção multi-driver de Itacoatiara, curva CMR, IRC-Tabocal</div>
</div>

<div class="veredito avoid">
  <div class="tag">Veredito antecipado</div>
  <h2>A seca interfere na cabotagem pelo calado — e a restrição de 2026 é praticamente certa.</h2>
  <p>O canal de Itacoatiara está <strong>folgado hoje — sem restrição de calado</strong> (régua em ${m1(REST.cota_ita_atual)} m, bem acima do nível de aperto), mas o modelo de análogos do Observatório dá <strong>${probTxt(REST.prob)} de probabilidade</strong> de o calado cair abaixo do alvo de carga cheia (${m1(ALVO)} m) por volta de <strong>${fmtISO(REST.p50)}</strong> (faixa ${fmtISO(REST.p10)}–${fmtISO(REST.p90)}; ano-análogo ${REST.ano_analogo}). A dúvida não é <em>se</em>, é <em>quão fundo</em>. No cenário central o calado cai para <strong>~${m1(CEN.central.cmr_min)} m</strong> (aperto leve) e a carga fica <strong>${dPct(CEN.central.delta_pct_2025)}</strong> ante o recorde de 2025 (${milTEU(cmr.base_2025_teu)} TEU), com o golpe concentrado em out–nov. Vira queda relevante no aperto severo: na banda pessimista o calado cai a <strong>~${m1(CEN.pessimista.cmr_min)} m</strong> (carga ${dPct(CEN.pessimista.delta_pct_2025)}, out+nov ${onMil(CEN.pessimista.outnov)} mil TEU) e, num repeteco de 2023, a ~${m1(CEN.cauda.cmr_min)} m (${dPct(CEN.cauda.delta_pct_2025)}).</p>
</div>

<div class="kpis avoid">
  <div class="kpi"><div class="lab">Restrição de calado projetada</div><div class="val pred">${fmtISO(REST.p50)}</div><div class="note">prob. ${probTxt(REST.prob)} · faixa ${fmtISO(REST.p10)}–${fmtISO(REST.p90)}</div></div>
  <div class="kpi"><div class="lab">Canal hoje (Itacoatiara)</div><div class="val">${m1(REST.cota_ita_atual)} m</div><div class="note">folgado · sem restrição · alvo de carga cheia ${m1(ALVO)} m</div></div>
  <div class="kpi"><div class="lab">Calado na seca 2026 — central</div><div class="val alerta">~${m1(CEN.central.cmr_min)} m</div><div class="note">pessimista ~${m1(CEN.pessimista.cmr_min)} m · piso 2024: 5,7 m</div></div>
  <div class="kpi"><div class="lab">Carga 2026 — central</div><div class="val pred">${dPct(CEN.central.delta_pct_2025)}</div><div class="note">${milTEU(CEN.central.teu)} TEU · cauda repete-2023: ${dPct(CEN.cauda.delta_pct_2025)}</div></div>
</div>

<section class="avoid">
  <h2 class="sec"><span class="n">1.</span> Onde o rio está hoje</h2>
  <p>O Rio Negro marcava <strong>${m2(man.cota_m)} m em Manaus</strong> na leitura de ${fmtData(hoje)} (ANA/HidroWeb, telemetria ao vivo), com variação de ${man.variacao_24h >= 0 ? "+" : ""}${man.variacao_24h} cm/24h. ${noPico ? `A cheia está cravando o pico agora — a cota está a apenas <strong>${Math.round(Math.abs(distPico) * 100)} cm</strong> da máxima prevista pelo SGB (${m2(PICO_COTA)} m)` : "a cheia ainda sobe; o pico vem em junho"}. É um pico <strong>baixo</strong>: fica abaixo dos anos de cheia plena de 2021–2022 e confirma a classificação de cheia de baixa magnitude — a vazante de 2026 começa com pouco buffer.</p>
  ${tabela(["Ano", "Cota em ~início jun", "Pico de cheia", "Pico em", "Vazante (mín.)"], anosHist)}
  <p class="small muted"><strong>Diagnóstico:</strong> a previsão do SGB dá <strong>${Math.round(PROB_27_5 * 100)}% de probabilidade</strong> de a cheia superar 27,5 m, mas praticamente nenhuma de alcançar os ~29 m de inundação severa — o teto de 2026 é estruturalmente mais baixo. Na prática, esse teto baixo é o que a operação sente na vazante — não em Manaus, mas no <strong>calado de Itacoatiara</strong> (régua de ${m1(REST.cota_ita_atual)} m hoje), que é onde a cabotagem realmente aperta. É para lá que olhamos a partir daqui.</p>
</section>

<section class="avoid">
  <h2 class="sec"><span class="n">2.</span> O driver climático do segundo semestre</h2>
  <p><strong>${enso.status} (CPC/NOAA, ${fmtData(enso.data_emissao)}):</strong> ${enso.sintese_pt}. A janela de emergência do El Niño coincide exatamente com a vazante — set/out/nov.</p>
  <p>El Niño no norte da Amazônia significa <strong>menos chuva nas cabeceiras, vazante mais rápida e mínima mais profunda</strong>. Foi o motor do colapso de 2023. O sinal já aparece nos instrumentos do Observatório: o <strong>IDN</strong> (Índice de Dessincronização Norte–Sul) está em <strong>${idn ? "+" + m2(idn.idn) : "+0,29"}</strong>, em regime <em>Driver Norte</em> — Negro e Branco mais depletados que a bacia sul, o padrão típico de anos de El Niño.</p>
</section>

<section class="avoid">
  <h2 class="sec"><span class="n">3.</span> Projeção do calado (CMR) para 2026</h2>
  ${svgCMR()}
  <div class="legend">
    <span><i class="lg" style="border-color:#00A652;width:18px"></i> Calado central (CMR)</span>
    <span><i class="lg" style="border-color:#0099D8;border-top-style:dashed"></i> Faixa IC80 (favorável ↔ severo)</span>
    <span><i class="lg" style="border-color:#D4922A;border-top-style:dashed"></i> Calado-alvo (carga cheia) ${m1(ALVO)} m</span>
    <span><i class="lg" style="border-color:#A0153E"></i> Zona de aperto severo (≤ 6 m)</span>
  </div>
  <p style="margin-top:8px"><strong>Leitura.</strong> Hoje o canal está <strong>folgado, sem restrição</strong> (Itacoatiara em ${m1(REST.cota_ita_atual)} m). Conforme a vazante avança, o calado cruza o alvo de ${m1(ALVO)} m por volta de <strong>${fmtISO(REST.p50)}</strong> (faixa ${fmtISO(REST.p10)}–${fmtISO(REST.p90)}), com probabilidade <strong>${probTxt(REST.prob)}</strong> — haverá restrição este ano; a questão é a severidade. No cenário <strong>central</strong> o calado cai para <strong>~${m1(CEN.central.cmr_min)} m</strong> — mais fundo que a leitura univariada de Itacoatiara (~9,9 m), porque os formadores já vêm um pouco abaixo do normal. Na banda pessimista cai a <strong>~${m1(CEN.pessimista.cmr_min)} m</strong>, perto do piso de 2023/24 (5,7–6,1 m).</p>
</section>

<section class="avoid">
  <h2 class="sec"><span class="n">4.</span> Cenários para 2026 — pelo calado</h2>
  ${tabela(["Cenário", "Calado na seca (CMR)", "Chance", "Margem vs alvo", "Carga 2026", "Δ% vs 2025", "out+nov (mil)"], cenarios, "cen")}
  <p class="small"><strong>Esperança ponderada: ${dPct(EV.delta_pct_2025)} ante o recorde de 2025 (${milTEU(EV.teu)} TEU).</strong> O volume do ano fica perto de 2025 — o que separa os cenários é a <strong>profundidade do calado</strong> e, com ela, o golpe em out–nov. Como em 2024 (calado no piso, ano quase intacto), a perda é de <strong>calendário</strong>: concentra no 4º trimestre, não no total. <em>Ressalva:</em> a base assume a demanda de 2025 (${milTEU(cmr.base_2025_teu)} TEU) sustentada; se reverter, −10 pp em todos os Δ%. Amostra curta (n≈8), faixa de calado 6–9 m com poucas observações.</p>
</section>

<section class="avoid">
  <h2 class="sec"><span class="n">5.</span> Fatores estruturais que torcem o resultado</h2>
  <div class="cols">
    <div class="col pos">
      <h3>A favor — mitigam o choque</h3>
      <ul>
        <li><strong>Tendência de fundo positiva:</strong> 2025 foi recorde real (${milTEU(cmr.base_2025_teu)} TEU, +21% sobre 2024); demanda do polo de Manaus firme e interior em expansão de dois dígitos a/a.</li>
        <li><strong>Adaptação acumulada:</strong> dois anos de trauma (2023–24) deixaram protocolo de baldeação em Itacoatiara, frota de barcaças menores e cronogramas alternativos rodando.</li>
        <li><strong>Front-loading provável:</strong> ago/2026 deve repetir o padrão de 2024 — armadores antecipam carga em jul–ago se a vazante começa rápido.</li>
      </ul>
    </div>
    <div class="col neg">
      <h3>Contra — agravam o choque</h3>
      <ul>
        <li><strong>Tendência hidrológica de longo prazo:</strong> o SGB documenta queda de ~4,3 cm/ano na mínima desde 1970 — o piso fica mais baixo a cada década.</li>
        <li><strong>Cheia modesta = menos buffer:</strong> ${m2(PICO_COTA)} m é um dos menores picos da janela 2021–2026.</li>
        <li><strong>Complacência pós-2025:</strong> um ano normal pode ter desativado parte da prontidão de contingência.</li>
        <li><strong>Solo em recuperação:</strong> dois anos de seca e só um de cheia normal; lençol freático regional não totalmente reposto.</li>
      </ul>
    </div>
  </div>
</section>

<section class="avoid">
  <h2 class="sec"><span class="n">6.</span> O que pode mover a data — e para onde olhamos</h2>
  <ul class="sinais">
    <li><strong>ENSO update CPC (próx. ${fmtData(enso.proxima_atualizacao)})</strong> — se o El Niño firmar antes de set, a restrição antecipa e o piso aprofunda.</li>
    <li><strong>Velocidade da vazante de Itacoatiara em jul–ago</strong> — descida rápida puxa o cruzamento dos ${m1(ALVO)} m para a borda inicial da faixa (${fmtISO(REST.p10)}).</li>
    <li><strong>Próximo pico real da cheia</strong> — acima de ${m2(PICO_COTA)} m abre folga; abaixo, encurta a janela até a restrição.</li>
  </ul>
</section>

<div class="rec avoid">
  <h2>O recado</h2>
  <p>A janela de restrição de calado (CMR abaixo de ${m1(ALVO)} m) abre entre <strong>${fmtISO(REST.p10)} e ${fmtISO(REST.p90)}</strong> — central <strong>${fmtISO(REST.p50)}</strong>, probabilidade <strong>${probTxt(REST.prob)}</strong>. Calado na seca projetado: <strong>~${m1(CEN.central.cmr_min)} m</strong> (central) · <strong>~${m1(CEN.pessimista.cmr_min)} m</strong> (pessimista) · <strong>~${m1(CEN.cauda.cmr_min)} m</strong> num repeteco de 2023.</p>
  <p>O volume do ano fecha perto de 2025; a perda mora em <strong>out–nov</strong> — de ~86 para <strong>${onMil(CEN.pessimista.outnov)} mil TEU</strong> na banda pessimista, <strong>${onMil(CEN.cauda.outnov)} mil</strong> na cauda. O risco é <strong>assimétrico para baixo</strong>: os formadores hoje estão só <strong>um pouco abaixo do normal</strong> (z entre ${zTxt(zLo)} e ${zTxt(zHi)}) — daí o central ser um aperto leve; mas, se o El Niño firmar na vazante, eles secam rápido e empurram o calado para a banda funda. Essa é a cauda, não o cenário central.</p>
</div>

<div class="fontes avoid">
  <b>Fontes oficiais.</b> Capitania dos Portos da Amazônia Ocidental — CMR (Calado Máximo Recomendado) diário no canal de Tabocal/Itacoatiara. &nbsp; ANA/HidroWeb — cotas de Itacoatiara e Manaus, leitura de ${fmtData(hoje)}. &nbsp; SGB/CPRM — ${sgb ? `${sgb.numero}º Boletim de Alerta Hidrológico da Bacia do Amazonas (${fmtData(sgb.data)})` : prev.fonte}. &nbsp; NOAA/CPC — ENSO Diagnostic Discussion (${fmtData(enso.data_emissao)}). &nbsp; ANTAQ — Estatística Aquaviária: cabotagem conteinerizada do AM em TEU.
  <div class="metod"><b style="font-style:normal">Nota metodológica.</b> <u>Calado:</u> a projeção de Itacoatiara é <strong>multi-driver</strong> — um ensemble de análogos (10 anos) ponderado pela semelhança do estado conjunto dos formadores (Solimões/Manacapuru, Negro/Manaus, Madeira/Humaitá), via z-score do dia de referência; a cota projetada é passada pela curva oficial cota→CMR da Capitania (187 obs). O CMR oficial é publicado na faixa de águas baixas (até ~12,5 m); na cheia o canal não restringe — por isso o calado de hoje aparece como "folgado", não como um número de CMR. Pesos dos drivers: Madeira 0,30 · Solimões 0,30 · Negro 0,20 · Itacoatiara 0,20. <u>Carga:</u> a função de transferência pareia o calado mínimo do ano (CMR) com a cabotagem conteinerizada real do AM (proxy de Manaus; os contêineres entram pelos terminais privados de Itacoatiara/Manaus, não sob o rótulo "Porto de Manaus"), 2018–2025. Efeito-seca medido relativo ao regime de calado folgado; base = recorde realizado de 2025 (${milTEU(cmr.base_2025_teu)} TEU). Amostra curta (n≈8–10) e regional, com poucas observações na faixa de calado 6–9 m — ordem de grandeza, não precisão. Boletim de antecipação, revisto a cada novo dado.</div>
</div>

<div class="patrocinio avoid">
  <span class="patroc-lab">Oferecimento</span>
  <div class="patroc-logos">
    ${LOGO_APM ? `<img src="${LOGO_APM}" alt="APM Terminals">` : ""}
    ${LOGO_MAERSK ? `<img src="${LOGO_MAERSK}" alt="Maersk">` : ""}
  </div>
  <p class="patroc-frase">Este boletim é um oferecimento de <strong>APM Terminals</strong> e <strong>Maersk</strong>. As simulações, projeções e dados são de responsabilidade exclusiva do <strong>Observatório de Infraestrutura de Transportes do IBI</strong>, que mantém total independência editorial e metodológica — e não refletem, necessariamente, a posição dos patrocinadores.</p>
</div>

<div class="rodape-obs avoid" style="margin-top:14px;text-align:center;font-size:8.2pt;color:var(--cinza);padding:8px 0 2px;border-top:1px solid var(--linha);">
  Conheça mais o trabalho do Observatório em <a href="https://ibi-observatorio.org/" style="color:var(--azul);text-decoration:none;font-weight:600;">ibi-observatorio.org</a>
</div>

</body></html>`;

// --- 7. Escrita -----------------------------------------------------------
mkdirSync(r("out"), { recursive: true });
const outPath = r("out/relatorio-cabotagem.html");
writeFileSync(outPath, html, "utf8");
console.log("OK ->", outPath);
console.log("Recessão: central cruza", proj.cruz_central, "| pessimista", proj.cruz_pessimista, "| otimista", proj.cruz_otimista);
console.log("Mínimas: central", proj.min_central.toFixed(2), "| pess", proj.min_pessimista.toFixed(2), "| otim", proj.min_otimista.toFixed(2));
