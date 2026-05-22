// Testa o gerador de briefing em 3 cenários históricos.
// Como o módulo é TypeScript, replicamos a lógica essencial aqui em ESM/JS
// (compromisso similar ao testa-sgb-parser.mjs) para evitar dependência de
// build. Para a validação real "viva" da API, usar curl/SSR após `npm run dev`.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Lê os percentis IDN DOY do TS gerado (reuso do detector 1.2)
const tsPerc = readFileSync(join(ROOT, "lib", "percentis-idn-doy.ts"), "utf-8");
const p85 = JSON.parse(tsPerc.match(/p85:\s*(\[[^\]]+\])/)[1]);
const p95 = JSON.parse(tsPerc.match(/p95:\s*(\[[^\]]+\])/)[1]);

// ─── Mini-implementação dos detectores (espelha lib/*) ─────────────────────
function doy(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d - start) / 86400000) + 1;
}

const LIM_ONDA_P85 = 1.40, LIM_ONDA_P95 = 2.09, LAG = 30;

function detectaOnda(serie, janela = 7) {
  if (!serie || serie.length < janela + 1) return { disparado: false, severidade: "nenhuma" };
  const ultima = serie[serie.length - 1];
  const primeira = serie[Math.max(0, serie.length - 1 - janela)];
  const dias = Math.round((new Date(ultima.data) - new Date(primeira.data)) / 86400000);
  const v = ultima.cota_m - primeira.cota_m;
  let sev = "nenhuma";
  if (v >= LIM_ONDA_P95) sev = "extrema";
  else if (v >= LIM_ONDA_P85) sev = "alta";
  else if (v >= LIM_ONDA_P85 * 0.7) sev = "moderada";
  const eta = new Date(ultima.data + "T00:00:00Z");
  eta.setUTCDate(eta.getUTCDate() + LAG);
  return {
    disparado: sev === "alta" || sev === "extrema",
    severidade: sev,
    var_total_m: +v.toFixed(2),
    taxa_cm_dia: +(v * 100 / dias).toFixed(1),
    janela_dias: dias,
    percentil_historico: v >= LIM_ONDA_P95 ? 0.95 : v >= LIM_ONDA_P85 ? 0.85 : 0.5,
    eta_manaus_dias: LAG,
    eta_manaus_data: eta.toISOString().slice(0, 10),
  };
}

function detectaDessinc(idn, data) {
  const d = doy(data);
  const abs = Math.abs(idn);
  const P85 = p85[d];
  const P95 = p95[d];
  let sev = "normal";
  if (P95 && abs >= P95) sev = "extrema";
  else if (P85 && abs >= P85) sev = "alta";
  else if (P85 && abs >= P85 * 0.85) sev = "elevada";
  return {
    excede: sev === "alta" || sev === "extrema",
    severidade: sev,
    idn_atual: idn,
    p85_doy: P85,
    p95_doy: P95,
    direcao: idn > 0.05 ? "norte" : idn < -0.05 ? "sul" : "neutro",
    motivo: P85 && abs >= P85 ? `|IDN|=${abs.toFixed(2)} excede P85 DOY (${P85.toFixed(2)})` : "dentro da banda",
  };
}

// Recessão simplificada — k=0.018, h_min=16.82
function projetaCruzamento(pico, picoData, gatilho = 17.7) {
  const k = 0.01834;
  const h_min = 16.82;
  for (let t = 0; t <= 250; t++) {
    const h = h_min + (pico - h_min) * Math.exp(-k * t);
    if (h < gatilho) {
      const d = new Date(picoData + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + t);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function semanaDoAno(iso) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function formataData(iso) {
  if (!iso) return "—";
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const [a, m, dia] = iso.split("-");
  return `${dia}/${meses[parseInt(m, 10) - 1]}/${a}`;
}

function diasEntre(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ─── Composer (espelha geraBriefing simplificado) ──────────────────────────
function geraBriefing(snap) {
  const sem = semanaDoAno(snap.data_ref);
  const ano = parseInt(snap.data_ref.slice(0, 4), 10);

  const onda = snap.serie_caracarai ? detectaOnda(snap.serie_caracarai, 7) : null;
  const dessinc = detectaDessinc(snap.idn_atual, snap.data_ref);
  const cruz = projetaCruzamento(snap.previsao.manaus_pico, snap.previsao.pico_data);
  const diasCruz = cruz ? diasEntre(snap.data_ref, cruz) : null;

  let manchete;
  if (onda?.disparado) {
    manchete = {
      eyebrow: `ALERTA — Onda Branco · ${onda.severidade.toUpperCase()}`,
      titulo: `Subida atípica em Caracaraí deve chegar em Manaus por ${formataData(onda.eta_manaus_data)}`,
      lead: `Caracaraí registrou +${onda.var_total_m.toFixed(2)}m em ${onda.janela_dias}d (taxa ${onda.taxa_cm_dia} cm/dia) — onda chega em Manaus em ~${onda.eta_manaus_dias}d.`,
    };
  } else if (dessinc.excede) {
    manchete = {
      eyebrow: `DESSINCRONIZAÇÃO — DRIVER ${dessinc.direcao.toUpperCase()} · ${dessinc.severidade.toUpperCase()}`,
      titulo: `Sistema fluvial em regime ${dessinc.direcao} extremo: IDN = ${dessinc.idn_atual >= 0 ? "+" : ""}${dessinc.idn_atual.toFixed(2)}`,
      lead: `${dessinc.motivo}. Padrão similar ao observado em ciclos anteriores.`,
    };
  } else if (diasCruz != null && diasCruz >= 0 && diasCruz <= 60) {
    manchete = {
      eyebrow: `CALENDÁRIO LWS — ${diasCruz}d`,
      titulo: `Manaus deve cruzar 17,7 m em ${formataData(cruz)} (modelo IBI)`,
      lead: `Projeção forward indica ~${diasCruz}d até o gatilho regulatório.`,
    };
  } else if (snap.dados.Manaus?.cota_m < 17.7) {
    manchete = {
      eyebrow: "ALERTA CRÍTICO — Manaus",
      titulo: `Manaus em ${snap.dados.Manaus.cota_m.toFixed(2)} m — abaixo do gatilho LWS`,
      lead: `Manaus opera abaixo do parâmetro ANTAQ de 17,7m. Em 2024 ficou 109 dias nessa condição. Monitorar Itacoatiara: lag de 22d na mínima.`,
    };
  } else if (snap.dados.SGC && snap.dados.SGC.cota_m < 7.96) {
    // Insight crítico vindo de geraInsights: colapso do Negro alto
    manchete = {
      eyebrow: "ALERTA CRÍTICO — Negro alto",
      titulo: `Colapso histórico em São Gabriel da Cachoeira: ${snap.dados.SGC.cota_m.toFixed(2)} m`,
      lead: `SGC abaixo do P10 histórico (7,96m). Em 17/mar/2026 atingiu 6,20m — 9,27m abaixo de 2024 na mesma data. Padrão sem precedente.`,
    };
  } else {
    const v24 = snap.dados.Manaus?.variacao_24h ?? 0;
    manchete = {
      eyebrow: "Status semanal · sistema dentro da banda",
      titulo: `Manaus em ${snap.dados.Manaus?.cota_m.toFixed(2)} m, sem dispersões extremas`,
      lead: `Nenhum gatilho disparou. Manaus ${v24 >= 0 ? "+" : ""}${v24} cm/24h. Pico previsto: ${snap.previsao.manaus_pico.toFixed(2)}m.`,
    };
  }

  let alerta = null;
  if (onda?.disparado) alerta = { rotulo: "Onda Branco a caminho", texto: `Caracaraí +${onda.var_total_m}m em ${onda.janela_dias}d. ETA: ${formataData(onda.eta_manaus_data)}.` };
  else if (dessinc.excede) alerta = { rotulo: `Driver ${dessinc.direcao}`, texto: dessinc.motivo };
  else if (diasCruz != null && diasCruz >= 0 && diasCruz <= 60) alerta = { rotulo: "Janela LWS", texto: `Cruzamento 17,7m em ~${diasCruz}d.` };

  return {
    numero_semana: sem,
    data_publicacao: snap.data_ref,
    manchete,
    alerta,
  };
}

// ─── Cenários ───────────────────────────────────────────────────────────────
function rodaCenario(nome, snap) {
  console.log(`\n${"═".repeat(64)}`);
  console.log(`▸ CENÁRIO: ${nome}`);
  console.log(`${"═".repeat(64)}`);
  const b = geraBriefing(snap);
  console.log(`\n[${b.manchete.eyebrow}]`);
  console.log(`${b.manchete.titulo}`);
  console.log(`\n${b.manchete.lead}`);
  if (b.alerta) {
    console.log(`\n⚠ ${b.alerta.rotulo}: ${b.alerta.texto}`);
  }
  // Verifica placeholders órfãos
  const tudo = JSON.stringify(b);
  const orf = tudo.match(/\{[a-z_]+\}/g);
  if (orf) console.log(`\n❌ PLACEHOLDERS ÓRFÃOS: ${orf.join(", ")}`);
  else console.log(`\n✓ sem placeholders órfãos`);
}

// 1) set/2024 — Mega-seca em curso
rodaCenario("set/2024 — mega-seca, Manaus já abaixo de 17,7m", {
  data_ref: "2024-09-12",
  idn_atual: -0.45,                  // driver Sul moderado
  dados: {
    Manaus:      { cota_m: 16.25, variacao_24h: -25, delta_2025: 0, delta_2024: 0, ultima_atualizacao: "2024-09-12" },
    SGC:         { cota_m:  8.50, variacao_24h: -10, delta_2025: 0, delta_2024: 0, ultima_atualizacao: "2024-09-12" },
    Humaita:     { cota_m: 11.50, variacao_24h: -20, delta_2025: 0, delta_2024: 0, ultima_atualizacao: "2024-09-12" },
    Itacoatiara: { cota_m:  4.20, variacao_24h: -15, delta_2025: 0, delta_2024: 0, ultima_atualizacao: "2024-09-12" },
    PortoVelho:  { cota_m:  6.50, variacao_24h: -20, delta_2025: 0, delta_2024: 0, ultima_atualizacao: "2024-09-12" },
  },
  previsao: { manaus_pico: 24.0, pico_data: "2024-06-15" },
  serie_caracarai: null,
});

// 2) mar/2026 — Driver Norte extremo (SGC colapsa, Madeira acima da média)
rodaCenario("mar/2026 — dessincronização Driver Norte extremo", {
  data_ref: "2026-03-17",
  idn_atual: +0.52,
  dados: {
    Manaus:      { cota_m: 24.82, variacao_24h: +5,  delta_2025: 100, delta_2024: 520, ultima_atualizacao: "2026-03-17" },
    SGC:         { cota_m:  6.20, variacao_24h: -25, delta_2025: -500, delta_2024: -927, ultima_atualizacao: "2026-03-17" },
    Humaita:     { cota_m: 13.98, variacao_24h: -10, delta_2025: +50, delta_2024: 679, ultima_atualizacao: "2026-03-17" },
    Itacoatiara: { cota_m: 11.37, variacao_24h: +8,  delta_2025: -50, delta_2024: 253, ultima_atualizacao: "2026-03-17" },
    PortoVelho:  { cota_m: 13.98, variacao_24h: -8,  delta_2025: +60, delta_2024: 679, ultima_atualizacao: "2026-03-17" },
  },
  previsao: { manaus_pico: 28.23, pico_data: "2026-06-15" },
  serie_caracarai: null,
});

// 3) mai/2026 — Onda Branco do boletim 20°
rodaCenario("mai/2026 — Onda Branco detectada (boletim 20°)", {
  data_ref: "2026-05-21",
  idn_atual: +0.35,
  dados: {
    Manaus:      { cota_m: 27.44, variacao_24h: +18, delta_2025: -48, delta_2024: 520, ultima_atualizacao: "2026-05-19" },
    SGC:         { cota_m:  9.92, variacao_24h: +80, delta_2025: -300, delta_2024: -200, ultima_atualizacao: "2026-05-19" },
    Humaita:     { cota_m: 21.54, variacao_24h: -12, delta_2025: +42, delta_2024: 679, ultima_atualizacao: "2026-05-19" },
    Itacoatiara: { cota_m: 13.40, variacao_24h: +14, delta_2025: -91, delta_2024: 253, ultima_atualizacao: "2026-05-19" },
    PortoVelho:  { cota_m: 13.23, variacao_24h: -56, delta_2025: +60, delta_2024: 679, ultima_atualizacao: "2026-05-19" },
  },
  previsao: { manaus_pico: 28.23, pico_data: "2026-06-15" },
  serie_caracarai: [
    { data: "2026-05-12", cota_m: 2.50 },
    { data: "2026-05-13", cota_m: 2.85 },
    { data: "2026-05-14", cota_m: 3.20 },
    { data: "2026-05-15", cota_m: 3.55 },
    { data: "2026-05-16", cota_m: 3.90 },
    { data: "2026-05-17", cota_m: 4.30 },
    { data: "2026-05-18", cota_m: 4.70 },
    { data: "2026-05-19", cota_m: 5.00 },
  ],
});

console.log("\n");
