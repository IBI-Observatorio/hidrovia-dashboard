// Gera a versão .docx do boletim de cabotagem (mesma narrativa do PDF v18).
// Lê data/calibracao-cmr-cabotagem.json (números do modelo) + ENSO/IDN locais +
// cota de Manaus ao vivo, e embute o gráfico §3 (out/chart-cmr.png) e os logos.
//
//   node scripts/gera-relatorio-cabotagem-docx.mjs [saida.docx]
//
// Requer: o gráfico já renderizado em out/chart-cmr.png e `docx` instalado.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, ExternalHyperlink,
} from "docx";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => join(ROOT, p);
const lerJSON = (p) => JSON.parse(readFileSync(r(p), "utf8"));
const OUT = process.argv[2] ?? r("out/relatorio-cabotagem.docx");

// ── Dados ──────────────────────────────────────────────────────────────────
const cmr = lerJSON("data/calibracao-cmr-cabotagem.json");
const enso = (() => { try { return lerJSON("data/enso_cpc_cache.json"); } catch { return {}; } })();
const idnVal = (() => {
  try { const s = lerJSON("data/ana-idn-series.json").serie; return s.at(-1)?.idn ?? 0.29; } catch { return 0.29; }
})();
const man = await (async () => {
  try {
    const j = await (await fetch("https://hidrovia-dashboard-production.up.railway.app/api/ana?estacao=Manaus&dias=7", { signal: AbortSignal.timeout(20000) })).json();
    if (j?.resumo?.cota_m != null) return { cota: j.resumo.cota_m, v24: j.resumo.variacao_24h ?? 0, data: j.resumo.ultima_data };
  } catch { /* fallback */ }
  return { cota: 28.22, v24: 4, data: "2026-06-08" };
})();

// ── Helpers de formatação (espelham o gerador HTML) ─────────────────────────
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const fmtData = (iso) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${MESES[+m - 1]}`; };
const m1 = (x) => x == null ? "—" : x.toFixed(1).replace(".", ",");
const m2 = (x) => x == null ? "—" : x.toFixed(2).replace(".", ",");
const milTEU = (n) => "~" + Math.round(n / 1000) + " mil";
const onMil = (n) => "~" + Math.round(n / 1000);
const dPct = (x) => Math.abs(x) < 0.01 ? "≈ estável" : (x < 0 ? "−" : "+") + Math.abs(x * 100).toFixed(0) + "%";
const probTxt = (p) => p == null ? "cauda" : p >= 0.97 ? ">95%" : Math.round(p * 100) + "%";
const zTxt = (z) => (z < 0 ? "−" : "+") + Math.abs(z).toFixed(2).replace(".", ",");

const CEN = Object.fromEntries(cmr.cenarios_2026.map((c) => [c.nome.startsWith("Cauda") ? "cauda" : c.nome.toLowerCase(), c]));
const EV = cmr.esperanca_ponderada;
const REST = cmr.restricao_calado;
const ALVO = cmr.calado_alvo_m;
const BASE = cmr.base_2025_teu;
const DRV = cmr.drivers;
const zVals = [DRV.z_2026.MNC, DRV.z_2026.BOR, DRV.z_2026.MAO];
const zLo = Math.min(...zVals), zHi = Math.max(...zVals);
const HOJE_FMT = (() => { const [a, m, d] = man.data.split("-"); return `${d} de ${MESES_LONGO[+m - 1]} de ${a}`; })();

// ── Cores / estilo ───────────────────────────────────────────────────────────
const C = { marinho: "111827", verde: "00A652", azul: "0099D8", ouro: "B0741F", vermelho: "A0153E", tinta: "1A2230", cinza: "5B6676", linha: "E6E9EE", suave: "F6F8FA", verdeBg: "F2FAF5" };
const CW = 9746;                       // largura útil (A4, margens 1080 DXA)
const png = (p) => new Uint8Array(readFileSync(r(p)));

// runs helpers
const T = (text, o = {}) => new TextRun({ text, font: "Arial", ...o });
const P = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...o });
const space = (after = 120, before = 0) => ({ spacing: { after, before } });

// Caixa colorida (1 célula, borda esquerda grossa) — para veredito/recado/callouts
function caixa(borderColor, fill, paras) {
  const ld = { style: BorderStyle.SINGLE, color: C.linha, size: 2 };
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      borders: { top: ld, bottom: ld, right: ld, left: { style: BorderStyle.SINGLE, color: borderColor, size: 18 } },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 160 },
      children: paras,
    })] })],
  });
}

// Tabela de dados genérica (cabeçalho marinho, zebra)
function tabela(head, rows, widths) {
  const ld = { style: BorderStyle.SINGLE, color: C.linha, size: 1 };
  const borders = { top: ld, bottom: ld, left: ld, right: ld };
  const headRow = new TableRow({ tableHeader: true, children: head.map((h, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: { fill: C.marinho, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [P(T(h, { bold: true, color: "FFFFFF", size: 16 }))],
  })) });
  const bodyRows = rows.map((row, ri) => new TableRow({ children: row.map((c, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: { fill: ri % 2 ? C.suave : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    children: [P(T(String(c), { size: 16, color: i === 0 ? C.marinho : C.tinta, bold: i === 0 }))],
  })) }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: [headRow, ...bodyRows] });
}

function secao(n, titulo) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 },
    children: [T(n + "  ", { bold: true, color: C.azul, size: 24 }), T(titulo, { bold: true, color: C.marinho, size: 24 })] });
}

// Imagem proporcional por largura-alvo (px)
function img(p, wpx, arOuH) {
  const ar = typeof arOuH === "number" ? arOuH : 1;
  const height = Math.round(wpx / ar);
  return new ImageRun({ type: "png", data: png(p), transformation: { width: wpx, height },
    altText: { title: "img", description: "img", name: "img" } });
}

// ── Conteúdo ─────────────────────────────────────────────────────────────────
const kids = [];

// Logos institucionais (Observatório + IBI)
kids.push(new Paragraph({ spacing: { after: 60 }, children: [
  img("public/sponsors/observatorio-logo.png", 46, 0.80), T("    "),
  img("public/sponsors/ibi-logo.png", 70, 1.00),
] }));

// Kicker + título
kids.push(P(T("OBSERVATÓRIO DE INFRAESTRUTURA DE TRANSPORTES · IBI · BOLETIM DE ANTECIPAÇÃO", { bold: true, color: C.azul, size: 14 }), space(40)));
kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 20 }, children: [T("Cabotagem conteinerizada na Amazônia", { bold: true, color: C.marinho, size: 40 })] }));
kids.push(P(T("Perspectiva 2026 — rio, clima e movimentação esperada", { color: C.cinza, size: 24 }), space(60)));
kids.push(P(T(`Data de referência: ${HOJE_FMT}  ·  Fontes: Capitania dos Portos (CMR) · ANA/HidroWeb · SGB/CPRM · NOAA/CPC · ANTAQ  ·  Modelos próprios: projeção multi-driver de Itacoatiara, curva CMR, IRC-Tabocal`, { color: C.cinza, size: 14 }), space(160)));

// Veredito
kids.push(caixa(C.ouro, C.suave, [
  P(T("VEREDITO ANTECIPADO", { bold: true, color: C.ouro, size: 14 }), space(40)),
  P(T("A seca interfere na cabotagem pelo calado — e a restrição de 2026 é praticamente certa.", { bold: true, color: C.marinho, size: 22 }), space(80)),
  P([
    T("O canal de Itacoatiara está "), T("folgado hoje — sem restrição de calado", { bold: true }),
    T(` (régua em ${m1(REST.cota_ita_atual)} m, bem acima do nível de aperto), mas o modelo de análogos do Observatório dá `),
    T(`${probTxt(REST.prob)} de probabilidade`, { bold: true }),
    T(` de o calado cair abaixo do alvo de carga cheia (${m1(ALVO)} m) por volta de `),
    T(`${fmtData(REST.p50)}`, { bold: true }),
    T(` (faixa ${fmtData(REST.p10)}–${fmtData(REST.p90)}; ano-análogo ${REST.ano_analogo}). A dúvida não é se, é quão fundo. No cenário central o calado cai para `),
    T(`~${m1(CEN.central.cmr_min)} m`, { bold: true }), T(" (aperto leve) e a carga fica "),
    T(`${dPct(CEN.central.delta_pct_2025)}`, { bold: true }),
    T(` ante o recorde de 2025 (${milTEU(BASE)} TEU), com o golpe concentrado em out–nov. Vira queda relevante no aperto severo: na banda pessimista o calado cai a `),
    T(`~${m1(CEN.pessimista.cmr_min)} m`, { bold: true }),
    T(` (carga ${dPct(CEN.pessimista.delta_pct_2025)}, out+nov ${onMil(CEN.pessimista.outnov)} mil TEU) e, num repeteco de 2023, a ~${m1(CEN.cauda.cmr_min)} m (${dPct(CEN.cauda.delta_pct_2025)}).`),
  ]),
]));
kids.push(P(T(""), space(120)));

// KPIs (tabela 4 colunas)
const kpiCell = (lab, val, valColor, note) => new TableCell({
  width: { size: CW / 4, type: WidthType.DXA },
  borders: { top: { style: BorderStyle.SINGLE, color: C.azul, size: 8 }, bottom: { style: BorderStyle.SINGLE, color: C.linha, size: 2 }, left: { style: BorderStyle.SINGLE, color: C.linha, size: 2 }, right: { style: BorderStyle.SINGLE, color: C.linha, size: 2 } },
  margins: { top: 80, bottom: 80, left: 110, right: 110 },
  children: [
    P(T(lab.toUpperCase(), { color: C.cinza, size: 12, bold: true }), space(40)),
    P(T(val, { bold: true, color: valColor, size: 30 }), space(40)),
    P(T(note, { color: C.cinza, size: 12 })),
  ],
});
kids.push(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW / 4, CW / 4, CW / 4, CW / 4], rows: [new TableRow({ children: [
  kpiCell("Restrição de calado projetada", fmtData(REST.p50), C.ouro, `prob. ${probTxt(REST.prob)} · faixa ${fmtData(REST.p10)}–${fmtData(REST.p90)}`),
  kpiCell("Canal hoje (Itacoatiara)", `${m1(REST.cota_ita_atual)} m`, C.marinho, `folgado · sem restrição · alvo ${m1(ALVO)} m`),
  kpiCell("Calado na seca 2026 — central", `~${m1(CEN.central.cmr_min)} m`, C.vermelho, `pessimista ~${m1(CEN.pessimista.cmr_min)} m · piso 2024: 5,7 m`),
  kpiCell("Carga 2026 — central", dPct(CEN.central.delta_pct_2025), C.ouro, `${milTEU(CEN.central.teu)} TEU · cauda: ${dPct(CEN.cauda.delta_pct_2025)}`),
] })] }));
kids.push(P(T(""), space(80)));

// §1
kids.push(secao("1.", "Onde o rio está hoje"));
kids.push(P([
  T("O Rio Negro marcava "), T(`${m2(man.cota)} m em Manaus`, { bold: true }),
  T(` na leitura de ${fmtData(man.data)} (ANA/HidroWeb, telemetria ao vivo), com variação de ${man.v24 >= 0 ? "+" : ""}${man.v24} cm/24h. A cheia está cravando o pico agora. É um pico `),
  T("baixo", { bold: true }),
  T(": fica abaixo dos anos de cheia plena de 2021–2022 e confirma a classificação de cheia de baixa magnitude — a vazante de 2026 começa com pouco buffer."),
]));
kids.push(tabela(
  ["Ano", "Cota em ~início jun", "Pico de cheia", "Pico em", "Vazante (mín.)"],
  [
    ["2021", "~28,5 m", "30,02 m (recorde)", "16/jun", "19,44 m"],
    ["2022", "~28,0 m", "~29,75 m", "jun", "16,19 m"],
    ["2023", "~26,5 m", "~28,0 m", "jul", "12,70 m"],
    ["2024", "~24,5 m", "~26,0 m", "mai (precoce)", "12,11 m"],
    ["2025", "~26,8 m", "~28,0 m", "jun", "~18,4 m"],
    ["2026", `${m2(man.cota)} m (${fmtData(man.data)})`, "prev. SGB", "jun", "?"],
  ],
  [1400, 2400, 2400, 1746, 1800],
));
kids.push(P([
  T("Diagnóstico: ", { bold: true, size: 16 }),
  T(`o teto baixo de 2026 é o que a operação sente na vazante — não em Manaus, mas no calado de Itacoatiara (régua de ${m1(REST.cota_ita_atual)} m hoje), que é onde a cabotagem realmente aperta. É para lá que olhamos a partir daqui.`, { size: 16, color: C.cinza }),
], space(120, 60)));

// §2
kids.push(secao("2.", "O driver climático do segundo semestre"));
kids.push(P([
  T(`${enso.status ?? "El Niño Watch"} (CPC/NOAA${enso.data_emissao ? `, ${fmtData(enso.data_emissao)}` : ""}): `, { bold: true }),
  T(`${enso.sintese_pt ?? "alerta de El Niño em desenvolvimento."} A janela de emergência do El Niño coincide exatamente com a vazante — set/out/nov.`),
]));
kids.push(P([
  T("El Niño no norte da Amazônia significa "), T("menos chuva nas cabeceiras, vazante mais rápida e mínima mais profunda", { bold: true }),
  T(". Foi o motor do colapso de 2023. O sinal já aparece no "), T("IDN", { bold: true }),
  T(` (Índice de Dessincronização Norte–Sul), em ${zTxt(idnVal).replace(/^[+]/, "+")}, em regime Driver Norte — Negro e Branco mais depletados que a bacia sul, padrão típico de anos de El Niño.`),
]));

// §3
kids.push(secao("3.", "Projeção do calado (CMR) para 2026"));
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, before: 40 }, children: [img("out/chart-cmr.png", 620, 2.07)] }));
kids.push(P([
  T("Leitura. ", { bold: true }),
  T(`Hoje o canal está folgado, sem restrição (Itacoatiara em ${m1(REST.cota_ita_atual)} m). Conforme a vazante avança, o calado cruza o alvo de ${m1(ALVO)} m por volta de `),
  T(`${fmtData(REST.p50)}`, { bold: true }),
  T(` (faixa ${fmtData(REST.p10)}–${fmtData(REST.p90)}), com probabilidade ${probTxt(REST.prob)} — haverá restrição este ano; a questão é a severidade. No cenário `),
  T("central", { bold: true }), T(` o calado cai para `), T(`~${m1(CEN.central.cmr_min)} m`, { bold: true }),
  T(` — mais fundo que a leitura univariada de Itacoatiara (~9,9 m), porque os formadores já vêm um pouco abaixo do normal. Na banda pessimista cai a ~${m1(CEN.pessimista.cmr_min)} m, perto do piso de 2023/24 (5,7–6,1 m).`),
]));

// §4
kids.push(secao("4.", "Cenários para 2026 — pelo calado"));
kids.push(tabela(
  ["Cenário", "Calado seca (CMR)", "Chance", "Margem vs alvo", "Carga 2026", "Δ% vs 2025", "out+nov"],
  cmr.cenarios_2026.map((c) => [
    c.nome, `${m1(c.cmr_min)} m`, probTxt(c.prob), `${c.margem_calado > 0 ? "+" : ""}${m1(c.margem_calado)} m`,
    milTEU(c.teu) + " TEU", dPct(c.delta_pct_2025), onMil(c.outnov) + " mil",
  ]),
  [1900, 1500, 1100, 1400, 1500, 1200, 1146],
));
kids.push(P([
  T(`Esperança ponderada: ${dPct(EV.delta_pct_2025)} ante o recorde de 2025 (${milTEU(EV.teu)} TEU). `, { bold: true, size: 16 }),
  T("O volume do ano fica perto de 2025 — o que separa os cenários é a profundidade do calado e, com ela, o golpe em out–nov. Como em 2024 (calado no piso, ano quase intacto), a perda é de calendário: concentra no 4º trimestre, não no total.", { size: 16, color: C.cinza }),
], space(120, 40)));

// §5
kids.push(secao("5.", "Fatores estruturais que torcem o resultado"));
const colLista = (titulo, cor, itens) => new TableCell({
  width: { size: CW / 2, type: WidthType.DXA },
  borders: { top: { style: BorderStyle.SINGLE, color: cor, size: 8 }, bottom: { style: BorderStyle.SINGLE, color: C.linha, size: 2 }, left: { style: BorderStyle.SINGLE, color: C.linha, size: 2 }, right: { style: BorderStyle.SINGLE, color: C.linha, size: 2 } },
  margins: { top: 90, bottom: 90, left: 140, right: 140 },
  children: [P(T(titulo, { bold: true, color: C.marinho, size: 17 }), space(60)),
    ...itens.map((it) => new Paragraph({ numbering: { reference: "fav", level: 0 }, spacing: { after: 50 }, children: it }))],
});
kids.push(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW / 2, CW / 2], rows: [new TableRow({ children: [
  colLista("A favor — mitigam o choque", C.verde, [
    [T("Tendência de fundo positiva: ", { bold: true, size: 16 }), T(`2025 foi recorde real (${milTEU(BASE)} TEU, +21% sobre 2024); demanda do polo de Manaus firme e interior em expansão de dois dígitos a/a.`, { size: 16 })],
    [T("Adaptação acumulada: ", { bold: true, size: 16 }), T("dois anos de trauma (2023–24) deixaram baldeação em Itacoatiara, barcaças menores e cronogramas alternativos rodando.", { size: 16 })],
    [T("Front-loading provável: ", { bold: true, size: 16 }), T("ago/2026 deve repetir 2024 — armadores antecipam carga em jul–ago se a vazante começa rápido.", { size: 16 })],
  ]),
  colLista("Contra — agravam o choque", C.vermelho, [
    [T("Tendência hidrológica de longo prazo: ", { bold: true, size: 16 }), T("o SGB documenta queda de ~4,3 cm/ano na mínima desde 1970 — o piso fica mais baixo a cada década.", { size: 16 })],
    [T("Cheia modesta = menos buffer: ", { bold: true, size: 16 }), T("um dos menores picos da janela 2021–2026.", { size: 16 })],
    [T("Complacência pós-2025: ", { bold: true, size: 16 }), T("um ano normal pode ter desativado parte da prontidão de contingência.", { size: 16 })],
    [T("Solo em recuperação: ", { bold: true, size: 16 }), T("dois anos de seca e só um de cheia normal; lençol freático não totalmente reposto.", { size: 16 })],
  ]),
] })] }));

// §6
kids.push(secao("6.", "O que pode mover a data — e para onde olhamos"));
[
  [T("ENSO update CPC", { bold: true }), T(" — se o El Niño firmar antes de set, a restrição antecipa e o piso aprofunda.")],
  [T("Velocidade da vazante de Itacoatiara em jul–ago", { bold: true }), T(` — descida rápida puxa o cruzamento dos ${m1(ALVO)} m para a borda inicial da faixa (${fmtData(REST.p10)}).`)],
  [T("Próximo pico real da cheia", { bold: true }), T(" — acima do previsto abre folga; abaixo, encurta a janela até a restrição.")],
].forEach((it) => kids.push(new Paragraph({ numbering: { reference: "sinais", level: 0 }, spacing: { after: 50 }, children: it })));

// O recado
kids.push(P(T(""), space(80)));
kids.push(caixa(C.verde, C.verdeBg, [
  P(T("O recado", { bold: true, color: C.marinho, size: 22 }), space(80)),
  P([
    T(`A janela de restrição de calado (CMR abaixo de ${m1(ALVO)} m) abre entre `),
    T(`${fmtData(REST.p10)} e ${fmtData(REST.p90)}`, { bold: true }),
    T(` — central ${fmtData(REST.p50)}, probabilidade ${probTxt(REST.prob)}. Calado na seca projetado: `),
    T(`~${m1(CEN.central.cmr_min)} m`, { bold: true }), T(" (central) · "),
    T(`~${m1(CEN.pessimista.cmr_min)} m`, { bold: true }), T(" (pessimista) · "),
    T(`~${m1(CEN.cauda.cmr_min)} m`, { bold: true }), T(" num repeteco de 2023."),
  ], space(80)),
  P([
    T("O volume do ano fecha perto de 2025; a perda mora em "), T("out–nov", { bold: true }),
    T(` — de ~86 para ${onMil(CEN.pessimista.outnov)} mil TEU na banda pessimista, ${onMil(CEN.cauda.outnov)} mil na cauda. O risco é `),
    T("assimétrico para baixo", { bold: true }),
    T(`: os formadores hoje estão só um pouco abaixo do normal (z entre ${zTxt(zLo)} e ${zTxt(zHi)}) — daí o central ser um aperto leve; mas, se o El Niño firmar na vazante, eles secam rápido e empurram o calado para a banda funda. Essa é a cauda, não o cenário central.`),
  ]),
]));

// Fontes + metodologia
kids.push(P(T(""), space(80)));
kids.push(P([
  T("Fontes oficiais. ", { bold: true, size: 14, color: C.marinho }),
  T(`Capitania dos Portos da Amazônia Ocidental — CMR diário no canal de Tabocal/Itacoatiara. ANA/HidroWeb — cotas de Itacoatiara e Manaus, leitura de ${fmtData(man.data)}. SGB/CPRM — Boletim de Alerta Hidrológico da Bacia do Amazonas. NOAA/CPC — ENSO Diagnostic Discussion. ANTAQ — Estatística Aquaviária: cabotagem conteinerizada do AM em TEU.`, { size: 14, color: C.cinza }),
]));
kids.push(P([
  T("Nota metodológica. ", { bold: true, italics: true, size: 13, color: C.cinza }),
  T(`A projeção de Itacoatiara é multi-driver — um ensemble de análogos (10 anos) ponderado pela semelhança do estado conjunto dos formadores (Solimões, Negro, Madeira) via z-score, passado pela curva oficial cota→CMR da Capitania (187 obs). A função de transferência pareia o calado mínimo do ano com a cabotagem conteinerizada real do AM (proxy de Manaus), 2018–2025; base = recorde de 2025 (${milTEU(BASE)} TEU). Amostra curta (n≈8–10) e poucas observações na faixa de calado 6–9 m — ordem de grandeza, não precisão. Boletim de antecipação, revisto a cada novo dado.`, { italics: true, size: 13, color: C.cinza }),
], space(160)));

// Patrocínio
kids.push(P(T("OFERECIMENTO", { bold: true, color: C.cinza, size: 13 }), { alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 }, border: { top: { style: BorderStyle.SINGLE, color: C.marinho, size: 12, space: 8 } } }));
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
  img("public/sponsors/apm-terminals-logo.png", 120, 4.18), T("        "),
  img("public/sponsors/maersk-logo.png", 120, 4.50),
] }));
kids.push(P([
  T("Este boletim é um oferecimento de "), T("APM Terminals", { bold: true }), T(" e "), T("Maersk", { bold: true }),
  T(". As simulações, projeções e dados são de responsabilidade exclusiva do "),
  T("Observatório de Infraestrutura de Transportes do IBI", { bold: true }),
  T(", que mantém total independência editorial e metodológica — e não refletem, necessariamente, a posição dos patrocinadores."),
], { alignment: AlignmentType.CENTER, spacing: { after: 120 }, ...{ } }));
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, color: C.linha, size: 2, space: 6 } }, spacing: { before: 80 }, children: [
  T("Conheça mais o trabalho do Observatório em ", { size: 15, color: C.cinza }),
  new ExternalHyperlink({ link: "https://ibi-observatorio.org/", children: [new TextRun({ text: "ibi-observatorio.org", style: "Hyperlink", font: "Arial", size: 15 })] }),
] }));

// ── Documento ────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 19, color: C.tinta } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 40, bold: true, font: "Arial", color: C.marinho }, paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: C.marinho }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "fav", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] },
    { reference: "sinais", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    children: kids,
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log("OK ->", OUT, `(${(buffer.length / 1024).toFixed(0)} KB)`);
