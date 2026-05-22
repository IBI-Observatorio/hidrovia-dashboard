// EXPANDE o dataset de eventos rotulados via amostragem mensal sistemática.
//
// Crítica da auditoria: n=21 eventos é insuficiente para calibrar 4 g.l. Com
// label leakage removido (rotulagem externa por P_DOY de MAO+HUM+CUR),
// ρ_test=−0,11 — sub-determinado.
//
// SOLUÇÃO: rotular 1 evento por mês entre 2016-2025 (~120 eventos), todos com
// severidade externa derivada de variáveis NÃO-ITA. Hold-out temporal:
// treino ≤2022 (~84 eventos), teste 2023-2025 (~36 eventos).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let GIT_SHA = "unknown", GIT_DIRTY = false;
try {
  GIT_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  GIT_DIRTY = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf-8" }).trim().length > 0;
} catch {}

// ─── Lê séries diárias ────────────────────────────────────────────────────
function leSerie(path, col) {
  const linhas = readFileSync(join(ROOT, path), "utf-8")
    .trim().replace(/^﻿/, "").split("\n");
  const cab = linhas[0].split(",");
  const idx = typeof col === "string" ? cab.indexOf(col) : col;
  const m = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const partes = linhas[i].split(",");
    const v = parseFloat(partes[idx]);
    if (partes[0] && isFinite(v)) m.set(partes[0], v);
  }
  return m;
}

const sMAO = leSerie("data/4estacoes_2016_2025.csv", "MAO");
const sITA = leSerie("data/4estacoes_2016_2025.csv", "ITA");
const sBOR = leSerie("data/4estacoes_2016_2025.csv", "BOR");
const sMNC = leSerie("data/4estacoes_2016_2025.csv", "MNC");
const sHUM = leSerie("data/humaita_hidroweb.csv", "cota_m");
const sCUR = leSerie("data/curicuriari_hidroweb.csv", "cota_m");

console.log(`Séries: MAO=${sMAO.size}, ITA=${sITA.size}, BOR=${sBOR.size}, MNC=${sMNC.size}, HUM=${sHUM.size}, CUR=${sCUR.size}`);

// ─── Calcula percentil DOY (janela ±7d) ───────────────────────────────────
function dayOfYear(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
}

function percentilDOY(serie, dataAlvo, janela = 7) {
  const cotaObs = serie.get(dataAlvo);
  if (cotaObs == null) return null;
  const doyAlvo = dayOfYear(dataAlvo);
  const amostras = [];
  for (const [data, cota] of serie) {
    if (data === dataAlvo) continue;
    const doy = dayOfYear(data);
    const dist = Math.min(Math.abs(doy - doyAlvo), Math.abs(doy - doyAlvo + 366), Math.abs(doy - doyAlvo - 366));
    if (dist <= janela) amostras.push(cota);
  }
  if (amostras.length < 10) return null;
  amostras.sort((a, b) => a - b);
  let i = 0;
  while (i < amostras.length && amostras[i] < cotaObs) i++;
  return i / amostras.length;
}

// ─── IDN (cálculo simplificado) ───────────────────────────────────────────
// IDN = posição_relativa(Curicuriari) − posição_relativa(Humaita)
// limites: P10 e P90 históricos (uso valores conhecidos como aproximação)
const P10_CUR = 7.96, P90_CUR = 10.53;
const P10_HUM = 11.68, P90_HUM = 22.00;

function calculaIDNSimples(cotaCUR, cotaHUM) {
  if (cotaCUR == null || cotaHUM == null) return null;
  const posC = (cotaCUR - P10_CUR) / (P90_CUR - P10_CUR);
  const posH = (cotaHUM - P10_HUM) / (P90_HUM - P10_HUM);
  return +(posC - posH).toFixed(2);
}

// ─── Itera por mês ────────────────────────────────────────────────────────
const eventos = [];

for (let ano = 2016; ano <= 2025; ano++) {
  for (let mes = 1; mes <= 12; mes++) {
    // Tenta dia 15. Se faltar dado, tenta 10, 20, 5, 25.
    for (const dia of [15, 10, 20, 5, 25]) {
      const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      const mao = sMAO.get(iso);
      const ita = sITA.get(iso);
      const hum = sHUM.get(iso);
      const cur = sCUR.get(iso);

      // Exigir 4 estações principais para o evento entrar no dataset
      if (mao == null || ita == null || hum == null || cur == null) continue;

      const pMao = percentilDOY(sMAO, iso);
      const pHum = percentilDOY(sHUM, iso);
      const pCur = percentilDOY(sCUR, iso);
      const ps = [pMao, pHum, pCur].filter((p) => p != null);
      if (ps.length < 2) continue;

      ps.sort((a, b) => a - b);
      const pMed = ps[Math.floor(ps.length / 2)];
      // sev_ext: 1 = saudável (P alto), 5 = mínima histórica (P baixo)
      const sevExt = Math.min(5, Math.max(1, Math.ceil((1 - pMed) * 5)));

      const idn = calculaIDNSimples(cur, hum);

      eventos.push({
        data:    iso,
        ano,
        mes,
        sevExt,
        p_mediano: +pMed.toFixed(3),
        ita,
        mao,
        idn:    idn ?? 0,
        // onda branco e anomalia_pp não disponíveis na série diária — usa 0
        // mas isso significa que NESSES eventos calibramos os pesos sem esses
        // sinais. O CALIBRADOR deve ter cuidado de não penalizar baseando-se
        // em eventos onda/pp ausentes.
        onda:   0,
        pp:     0,
        eta:    null,
      });
      break;
    }
  }
}

console.log(`\nEventos expandidos: ${eventos.length}`);

const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const e of eventos) dist[e.sevExt]++;
console.log(`Distribuição sev_ext: 1=${dist[1]}, 2=${dist[2]}, 3=${dist[3]}, 4=${dist[4]}, 5=${dist[5]}`);

const treino = eventos.filter((e) => e.ano <= 2022);
const teste  = eventos.filter((e) => e.ano >= 2023);
console.log(`Treino (≤2022): ${treino.length}`);
console.log(`Teste (≥2023):  ${teste.length}`);

// Salva
const out = `// AUTO-GERADO por scripts/expande-eventos-tabocal.mjs em ${new Date().toISOString()}
// GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Dataset expandido de eventos âncora para calibração rigorosa do IRC v3.5.
// Amostragem: 1 ponto por mês (dia 15 ou próximo) entre 2016-2025 onde MAO,
// ITA, HUM e CUR estão disponíveis. Severidade externa derivada de P_DOY
// mediano de MAO+HUM+CUR — independente de cota_ITA.

export interface EventoTabocalExpandido {
  data:      string;
  ano:       number;
  mes:       number;
  sevExt:    number;          // severidade 1-5 (P_DOY mediano invertido)
  p_mediano: number;
  ita:       number;
  mao:       number;
  idn:       number;
  onda:      number;          // 0 (não disponível na série diária)
  pp:        number;          // 0 (não disponível na série diária)
  eta:       number | null;   // null (não calculado retrospectivamente)
}

export const EVENTOS_TABOCAL_EXPANDIDOS: EventoTabocalExpandido[] = ${JSON.stringify(eventos, null, 2)};

export const EVENTOS_EXPANDIDOS_META = {
  n_total:        ${eventos.length},
  n_treino:       ${treino.length},
  n_teste:        ${teste.length},
  distribuicao:   ${JSON.stringify(dist)},
  janela_anos:    [2016, 2025],
  metodologia:    "Amostragem mensal · severidade externa via P_DOY(MAO+HUM+CUR)",
  gerado_em:      "${new Date().toISOString()}",
  git_sha:        "${GIT_SHA}",
  git_dirty:      ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "eventos-tabocal-expandidos.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
