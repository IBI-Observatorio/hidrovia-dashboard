// Testa o parser SGB usando o módulo TS via tsx.
// Uso: node --import tsx scripts/testa-sgb-parser.mjs [caminho.pdf]
//
// Alternativa (mais portável): replicar inline. Aqui replicamos chamando o
// próprio módulo via dynamic import com tsx loader — Node 24+ aceita .ts
// nativamente via --experimental-strip-types em algumas builds; aqui usamos
// um wrapper que importa o arquivo .ts compilado mentalmente. Para simplicidade,
// duplicamos as funções principais aqui.
import { readFileSync } from "node:fs";

const PDF = process.argv[2] ?? "C:/Users/bruno/Downloads/20260519_17-20260519 - 174421.pdf";
console.log(`Lendo: ${PDF}`);

const buf = readFileSync(PDF);
const { PDFParse } = await import("pdf-parse");
const parser = new PDFParse({ data: new Uint8Array(buf) });
const result = await parser.getText();
await parser.destroy();
const text = (result.text ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

console.log(`Texto extraído: ${text.length} chars\n`);

// ─── Aliases ───────────────────────────────────────────────────────────────
const ALIASES = {
  "manaus": "Manaus", "itacoatiara": "Itacoatiara", "manacapuru": "Manacapuru",
  "humaitá": "Humaita", "humaita": "Humaita", "porto velho": "PortoVelho",
  "borba": "Borba", "são gabriel da cachoeira": "SGC",
  "sao gabriel da cachoeira": "SGC", "s.g.c.": "SGC", "sgc": "SGC",
  "parintins": "Parintins", "óbidos": "Obidos", "obidos": "Obidos",
  "boa vista": "BoaVista", "caracaraí": "Caracarai", "caracarai": "Caracarai",
  "tabatinga": "Tabatinga", "fonte boa": "FonteBoa", "barcelos": "Barcelos",
  "santa isabel do rio negro": "Tapuruquara", "tapuruquara": "Tapuruquara",
  "santarém": "Santarem", "santarem": "Santarem",
  "rio branco": "RioBrancoAC", "careiro": "Careiro", "beruri": "Beruri",
};

function pt(s) {
  if (s == null) return null;
  const x = String(s).trim().replace(/\./g, "").replace(",", ".");
  if (!x) return null;
  const n = parseFloat(x);
  return isNaN(n) ? null : n;
}

// ─── A) Resumo ─────────────────────────────────────────────────────────────
function resumo(t) {
  const out = [];
  const re = /Em\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s\.]{2,40}?)\s*,[^\.]{0,80}?é\s+de\s+(-?\d{1,5})\s*cm/g;
  const visto = new Set();
  let m;
  while ((m = re.exec(t)) !== null) {
    const c = m[1].trim().toLowerCase().replace(/\.+$/, "");
    const k = ALIASES[c];
    if (!k || visto.has(k)) continue;
    visto.add(k);
    out.push({ estacao: k, cota_cm: pt(m[2]) });
  }
  return out;
}

// ─── B) Variações ──────────────────────────────────────────────────────────
function variacoes(t) {
  const v = new Map();
  const ini = t.search(/Comportamento das esta[çc][oõ]es/i);
  if (ini < 0) return v;
  let fim = t.indexOf("Tabela 02", ini);
  if (fim < 0) fim = t.indexOf("Salientamos", ini);
  if (fim < 0) fim = ini + 4000;
  const sec = t.slice(ini, fim);

  const reCidade = /\b(?:em|Em)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\.\s]{2,40}?)(?=\s*[,\(]|\s+e\s+\w)/g;
  let mC;
  while ((mC = reCidade.exec(sec)) !== null) {
    const c = mC[1].trim().toLowerCase().replace(/-[a-z]{2}$/i, "").replace(/\.+$/, "").trim();
    const k = ALIASES[c];
    if (!k || v.has(k)) continue;
    const start = mC.index + mC[0].length;
    const proxPonto = sec.indexOf(".", start);
    const resto = sec.slice(start);
    const mProx = resto.match(/\b(?:em|Em)\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/);
    const idxProx = mProx ? start + (mProx.index ?? 0) : -1;
    const fim = Math.min(proxPonto > 0 ? proxPonto : sec.length,
                          idxProx > 0 ? idxProx : sec.length,
                          start + 250);
    const janela = sec.slice(start, fim);
    const mN = janela.match(/(\d{1,3}(?:,\d{1,2})?)\s*(cm|metros|m)\b/i);
    if (!mN) continue;
    const vn = pt(mN[1]); if (vn == null) continue;
    const u = mN[2].toLowerCase();
    let cm = u === "cm" ? Math.round(vn) : Math.round(vn * 100);
    if (Math.abs(cm) > 500) continue;
    if (/\b(descid|vazant|queda|recu)/i.test(janela)) cm = -Math.abs(cm);
    v.set(k, cm);
  }

  const re2 = /(\d{1,2}(?:,\d{1,2})?)\s*(m|metros)\s+em\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]{2,35})/gi;
  let m;
  while ((m = re2.exec(sec)) !== null) {
    const c = m[3].trim().toLowerCase().replace(/-[a-z]{2}$/i, "").replace(/\.+$/, "").trim();
    const k = ALIASES[c]; if (!k || v.has(k)) continue;
    const vn = pt(m[1]); if (vn == null) continue;
    let cm = Math.round(vn * 100);
    if (Math.abs(cm) > 500) continue;
    const ctx = sec.slice(Math.max(0, m.index - 80), m.index + m[0].length);
    if (/\b(descid|vazant|queda|recu)/i.test(ctx)) cm = -Math.abs(cm);
    v.set(k, cm);
  }
  return v;
}

// ─── C) Previsões ──────────────────────────────────────────────────────────
function previsoes(t) {
  const out = [];
  const i6 = t.search(/6\.\s*Previs[oõ]es/i);
  if (i6 < 0) return out;
  const sec = t.slice(i6, i6 + 6000);

  const reIni = /(?:Para|Em)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]{2,30}?)\s*,\s+a\s+(?:primeira\s+)?previs[ãa]o/g;
  const inicios = [];
  let m;
  while ((m = reIni.exec(sec)) !== null) {
    const c = m[1].trim().toLowerCase();
    const k = ALIASES[c];
    if (!k) continue;
    inicios.push({ idx: m.index, chave: k });
  }

  for (let i = 0; i < inicios.length; i++) {
    const ini = inicios[i];
    const fim = i + 1 < inicios.length ? inicios[i + 1].idx : sec.length;
    const bloco = sec.slice(ini.idx, fim);

    const mC = bloco.match(/aproximad[ao](?:mente|s?\s+de)\s+(\d{1,2},\d{1,2})\s*m/i);
    if (!mC) continue;
    const central = pt(mC[1]); if (central == null) continue;

    let icMin = null, icMax = null;
    const mI = bloco.match(/intervalo[^.]{0,80}?\b(?:entre|de)\s+(\d{1,2},\d{1,2})\s+(?:e|a)\s+(\d{1,2},\d{1,2})\s*m/i);
    if (mI) { icMin = pt(mI[1]); icMax = pt(mI[2]); }
    if (icMin == null || icMax == null) continue;

    let cotaInund, probInund;
    const mInund = bloco.match(/cota\s+de\s+inunda[çc][aã]o(?:\s+em\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)?\s*\((?:de\s+)?(\d{1,2},\d{1,2})\s*m\)[^.]{0,40}?(\d{1,3}(?:,\d{1,2})?)\s*%/i);
    if (mInund) { cotaInund = pt(mInund[1]); probInund = pt(mInund[2]); }

    out.push({
      estacao: ini.chave,
      cota_prevista_m: central,
      ic80_min_m: icMin,
      ic80_max_m: icMax,
      cota_inundacao_m: cotaInund,
      prob_inundacao_pct: probInund,
    });
  }
  return out;
}

// ─── Cabeçalho ─────────────────────────────────────────────────────────────
const meses = { janeiro:"01", fevereiro:"02", "março":"03", marco:"03", abril:"04",
                maio:"05", junho:"06", julho:"07", agosto:"08", setembro:"09",
                outubro:"10", novembro:"11", dezembro:"12" };

function data(t) {
  const mE = t.match(/(\d{1,2})\s+de\s+([a-zçãéí]+)\s+de\s+(\d{4})/i);
  if (mE && meses[mE[2].toLowerCase()]) {
    return `${mE[3]}-${meses[mE[2].toLowerCase()]}-${mE[1].padStart(2,"0")}`;
  }
  const mN = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (mN) return `${mN[3]}-${mN[2]}-${mN[1]}`;
  return "?";
}

function numero(t) {
  const m = t.match(/(\d+)\s*[°ºoO]\s*BOLETIM/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Resultado ─────────────────────────────────────────────────────────────
const num = numero(text);
const dt  = data(text);
const r   = resumo(text);
const v   = variacoes(text);
const p   = previsoes(text);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📋 Boletim Nº ${num ?? "?"} — ${dt}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

console.log(`\n(A) RESUMO EXECUTIVO — ${r.length} estação(ões)`);
for (const e of r) console.log(`     ${e.estacao.padEnd(15)} → ${e.cota_cm} cm`);

console.log(`\n(B) VARIAÇÕES NARRADAS — ${v.size} estação(ões)`);
for (const [k, cm] of v) {
  const s = cm >= 0 ? "+" : "";
  console.log(`     ${k.padEnd(15)} → ${s}${cm} cm`);
}

console.log(`\n(C) PREVISÕES SEÇÃO 6 — ${p.length} estação(ões)`);
for (const x of p) {
  console.log(`     ${x.estacao.padEnd(12)}  ${x.cota_prevista_m} m  (IC80 ${x.ic80_min_m}–${x.ic80_max_m})  inund=${x.cota_inundacao_m ?? "?"}m@${x.prob_inundacao_pct ?? "?"}%`);
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("ESPERADO:");
console.log("  Resumo: Manaus=2744, BoaVista=417, PortoVelho=1323");
console.log("  Variações: SGC≈+80, Manaus≈+18, Tabatinga≈+12, BoaVista≈+200, Caracarai≈+250,");
console.log("              FonteBoa≈+9, Manacapuru≈+13, Beruri≈+13, Humaita≈+12, PortoVelho≈-56");
console.log("  Previsões: Manaus 28.23m@96%, Manacapuru 19.16m@99.2%,");
console.log("              Itacoatiara 13.73m@17%, Parintins 8.07m@4%");
