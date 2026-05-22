// Roda o forecasting da ETA por análogos com a série 2026 disponível.
// Saída: tabela ranqueada dos anos mais similares + ETA P10/P50/P90.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Leitura inline (evita import TS no node)
const linhas = readFileSync(join(ROOT, "data", "itacoatiara_hidroweb.csv"), "utf-8").trim().split("\n");
const cotas = new Map();
for (let i = 1; i < linhas.length; i++) {
  const [data, cota] = linhas[i].split(",");
  const v = parseFloat(cota);
  if (data && isFinite(v)) cotas.set(data, v);
}

// Série atual 2026
const serie2026 = [];
for (const [data, cota] of cotas) {
  if (data.startsWith("2026-")) serie2026.push({ data, cota });
}
serie2026.sort((a, b) => a.data.localeCompare(b.data));
console.log(`Série 2026: ${serie2026.length} dias (${serie2026[0].data} → ${serie2026[serie2026.length-1].data})`);

// Histórico por ano
const porAno = {};
for (let y = 2016; y <= 2025; y++) {
  porAno[y] = {};
  for (const [data, cota] of cotas) {
    if (data.startsWith(`${y}-`)) porAno[y][data] = cota;
  }
}

// Parâmetros
const CALADO_ALVO = 11.0;
const COTA_ALVO   = 6.30;  // CMR(6.30) = 11.0 (curva isotônica)
const JANELA      = 60;
const KERNEL      = 0.5;   // largura kernel em metros
const HORIZONTE   = 300;

const dayOfYear = (iso) => {
  const d = new Date(iso + "T00:00:00Z");
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
};
const isoComAno = (doy, ano) => {
  const d = new Date(Date.UTC(ano, 0, 1));
  d.setUTCDate(d.getUTCDate() + doy - 1);
  return d.toISOString().slice(0, 10);
};

const hoje      = serie2026[serie2026.length - 1];
const doyHoje   = dayOfYear(hoje.data);
const janela    = serie2026.slice(-JANELA);

console.log(`\nMatch: últimos ${janela.length} dias (${janela[0].data} → ${hoje.data}, cota atual ${hoje.cota}m)`);
console.log(`Alvo: cota_ITA < ${COTA_ALVO}m  (= CMR < ${CALADO_ALVO}m)`);
console.log("");

const analogos = [];
for (let y = 2016; y <= 2025; y++) {
  const serieY = porAno[y];
  let sumSq = 0, n = 0;
  for (const p of janela) {
    const doy = dayOfYear(p.data);
    const c_y = serieY[isoComAno(doy, y)];
    if (c_y == null) continue;
    sumSq += (p.cota - c_y) ** 2;
    n++;
  }
  if (n < janela.length * 0.5) continue;
  const rmse = Math.sqrt(sumSq / n);

  // ETA: data em que cota_y caiu abaixo de COTA_ALVO depois do DOY de hoje
  let eta_iso = null;
  for (let off = 0; off <= HORIZONTE; off++) {
    const iso = isoComAno(doyHoje + off, y);
    const c = serieY[iso];
    if (c != null && c < COTA_ALVO) { eta_iso = iso; break; }
  }
  const eta_offset = eta_iso ? Math.round(
    (new Date(eta_iso) - new Date(isoComAno(doyHoje, y))) / 86400000
  ) : null;

  analogos.push({
    ano:          y,
    rmse_m:       +rmse.toFixed(3),
    peso:         Math.exp(-rmse / KERNEL),
    eta_iso,
    eta_offset_d: eta_offset,
    cota_y_hoje:  serieY[isoComAno(doyHoje, y)] ?? null,
    pico_y:       Math.max(...Object.values(serieY)),
  });
}
analogos.sort((a, b) => a.rmse_m - b.rmse_m);

// Quantis ponderados sobre análogos que cruzaram
const cruzaram = analogos.filter((a) => a.eta_offset_d != null);
const pesoTotal = analogos.reduce((s, a) => s + a.peso, 0);
const pesoCruz  = cruzaram.reduce((s, a) => s + a.peso, 0);
const probCruz  = pesoCruz / pesoTotal;

function quantilPond(q) {
  if (!cruzaram.length) return null;
  const sorted = [...cruzaram].sort((a, b) => a.eta_offset_d - b.eta_offset_d);
  const total = sorted.reduce((s, a) => s + a.peso, 0);
  let acc = 0;
  for (const a of sorted) {
    acc += a.peso;
    if (acc / total >= q) return a.eta_offset_d;
  }
  return sorted[sorted.length - 1].eta_offset_d;
}

const p10 = quantilPond(0.10);
const p50 = quantilPond(0.50);
const p90 = quantilPond(0.90);

const ofs2iso = (off) => {
  if (off == null) return "—";
  const d = new Date(hoje.data + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + off);
  return d.toISOString().slice(0, 10);
};

// Impressão
console.log("Ranking de análogos (mais similar primeiro):");
console.log("  Ano  | RMSE (m) | peso  | cota_y hoje | pico_y | ETA ano    | offset");
console.log("  ─────┼──────────┼───────┼─────────────┼────────┼────────────┼──────");
for (const a of analogos) {
  const peso_norm = (a.peso / pesoTotal * 100).toFixed(1).padStart(5);
  console.log(
    `  ${a.ano} |   ${a.rmse_m.toFixed(2).padStart(5)}  | ${peso_norm}% |   ${(a.cota_y_hoje ?? "?").toFixed?.(2).padStart(5) ?? "  n/d"}m  | ${a.pico_y.toFixed(2)}m | ${a.eta_iso ?? "      n/d   "} | ${a.eta_offset_d != null ? (a.eta_offset_d + "d").padStart(5) : " n/d"}`
  );
}
console.log("");
console.log(`══════════════════════════════════════════════════════`);
console.log(`ETA via análogos (kernel σ=${KERNEL}m, janela=${JANELA}d)`);
console.log(`══════════════════════════════════════════════════════`);
console.log(`Prob de cruzamento (peso ponderado): ${(probCruz*100).toFixed(0)}%`);
console.log(`  P10 (precoce): ${ofs2iso(p10)}  (em ${p10}d)`);
console.log(`  P50 (mediana): ${ofs2iso(p50)}  (em ${p50}d)`);
console.log(`  P90 (tardia):  ${ofs2iso(p90)}  (em ${p90}d)`);
console.log(`  Largura IC80:  ${p10 != null && p90 != null ? (p90 - p10) : "n/d"} dias`);
console.log(`  Ano top:       ${analogos[0].ano} (RMSE ${analogos[0].rmse_m}m)`);
console.log("");
console.log("Comparação com MC v3.4 (banda assumida paramétrica):");
console.log(`  MC P10: 2026-08-25 (95d), P50: 2026-10-04 (135d), P90: 2026-12-27 (219d)`);

// Salva snapshot
const out = {
  data_atual: hoje.data,
  cota_atual_m: hoje.cota,
  calado_alvo_m: CALADO_ALVO,
  cota_alvo_m: COTA_ALVO,
  janela_dias: JANELA,
  largura_kernel_m: KERNEL,
  prob_cruzamento: +probCruz.toFixed(3),
  data_p10: ofs2iso(p10),
  data_p50: ofs2iso(p50),
  data_p90: ofs2iso(p90),
  dias_p10: p10,
  dias_p50: p50,
  dias_p90: p90,
  analogos,
  gerado_em: new Date().toISOString(),
};
writeFileSync(join(ROOT, "data", "eta-analogos-snapshot.json"), JSON.stringify(out, null, 2));
console.log(`✓ Snapshot: data/eta-analogos-snapshot.json`);
