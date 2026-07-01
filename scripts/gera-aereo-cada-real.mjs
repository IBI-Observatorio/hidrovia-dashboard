/**
 * gera-aereo-cada-real.mjs — gera o JSON da página "Onde vai cada real da sua
 * passagem" (/aereo/cada-real), a estreia da vertical Setor Aéreo.
 *
 * Saída: public/data/aereo/cada-real.json — { referencia, fonte, geradoEm,
 *   tarifas, ajusteNorteCombustivelPP, rotas[], decomposicao[] }
 *
 * DUAS METADES:
 *  1. DECOMPOSICAO (curada, com fonte) — a anatomia estrutural de custo de voar
 *     no Brasil. NÃO vem de feed: é calibrada em ordens de grandeza públicas
 *     (CNT/ABEAR para o QAV; ABEAR/IATA para as demais). Editada aqui, no script.
 *  2. ROTAS (tarifa média por OD) — pode vir dos Microdados da ANAC (Tarifas
 *     Aéreas Domésticas). Sem dado real, usa âncoras ILUSTRATIVAS (marcadas).
 *
 * Uso:
 *   node scripts/gera-aereo-cada-real.mjs                       # seed ilustrativo
 *   node scripts/gera-aereo-cada-real.mjs --baixar --ref 2026-05 --meses 3
 *                                                # baixa da ANAC e agrega (real)
 *   node scripts/gera-aereo-cada-real.mjs --anac <csv>          # CSV local
 *
 * Flags:
 *   --baixar        baixa os microdados da ANAC sozinho (portal SAS, ASP.NET)
 *   --ref YYYY-MM   mês de referência / rótulo (default 2026-05)
 *   --meses N       nº de meses (terminando em --ref) a agrupar na média (default 3)
 *   --anac <csv>    usa um CSV local em vez de baixar
 *
 * FONTE ANAC (--baixar): portal SAS, formulário ASP.NET, tema=14 (doméstico) —
 *   https://sas.anac.gov.br/sas/downloads/view/frmDownload.aspx?tema=14
 *   Arquivos YYYYMM.CSV (sep ';', latin-1; colunas nr_ano_referencia;
 *   nr_mes_referencia;sg_empresa_icao;sg_icao_origem;sg_icao_destino;nr_tarifa;
 *   nr_assentos — códigos ICAO). Download = 2 postbacks ("Buscar Arquivos" + "Baixar
 *   Marcados") na mesma sessão; resposta CSV ou ZIP. Cache em .cache/anac/
 *   (compartilhado com scripts/tarifa_antecipada_eda.py). Tarifa média por rota =
 *   Σ(TARIFA·ASSENTOS)/Σ(ASSENTOS), par OD não-direcionado.
 *
 * Idempotente. Ver docs/RUNBOOK-DADOS.md (seção Aéreo).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { fileURLToPath } from "url";
import zlib from "zlib";
import path from "path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const outPath = path.resolve(raiz, "public/data/aereo/cada-real.json");

// ── args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const opt = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const baixar = has("--baixar");
const csvAnac = opt("--anac");
const referencia = opt("--ref", "2026-05");
const meses = Math.max(1, parseInt(opt("--meses", "3"), 10) || 3);
const hoje = new Date().toISOString().slice(0, 10);

// ── anatomia estrutural (curada, com fonte) ─────────────────────────────────────
// Soma = 100. Calibrada na ESTRUTURA DE CUSTOS oficial da ABEAR (Panorama 2024,
// dados 2023): combustível 36%, arrend.+seg.+manut. 14% + depreciação 7% = 21%,
// pessoal 12% + handling/assist. 4% + despesas operacionais 16% + outros 5% = 37%,
// tarifas de navegação 4% + aeroportuárias 2% = 6%. Sobre isso: a carga tributária
// do bilhete doméstico é ~10% do preço (Maran Gehlen 2026), quase toda EMBUTIDA no
// ICMS do QAV (regional: 3% Norte / 7% maioria / 10% SP — CONFAZ 188/17) — o STF
// derrubou o ICMS sobre o bilhete (ADI 1600) e o PIS/Cofins da venda está zerado
// (Lei 14.592/2023). Aqui os Tributos aparecem como fatia própria (retirada, sem
// dupla contagem, sobretudo do combustível); o QAV fica líquido do ICMS.
const AJUSTE_NORTE_COMBUSTIVEL_PP = 6;

const DECOMPOSICAO = [
  {
    id: "combustivel",
    label: "Combustível (QAV)",
    percentual: 32,
    cor: "#D4922A",
    descricaoCurta:
      "Querosene de aviação, já líquido do ICMS — o maior item isolado do preço.",
    insight:
      "O QAV é ~36% dos custos operacionais do setor (CNT/ABEAR, 2024) e passou de 45% no pico de 2026 — contra ~31% da média global. Aqui aparece líquido do ICMS (que está na fatia de Tributos). Segue a paridade internacional do petróleo e o câmbio; em rotas amazônicas, a logística de distribuição pesa mais, por isso a fatia é maior no Norte.",
  },
  {
    id: "tributos",
    label: "Tributos (embutidos)",
    percentual: 10,
    cor: "#A0153E",
    descricaoCurta:
      "O imposto que você paga vem embutido nos insumos — quase todo ICMS sobre o querosene.",
    insight:
      "Não há ICMS sobre o bilhete doméstico (o STF derrubou — ADI 1600) nem PIS/Cofins sobre a venda (zerado até 2026). O tributo que resta — ~10% do preço — está embutido nos insumos, sobretudo o ICMS do QAV, que é regional: 3% no Norte, 7% na maioria dos estados, 10% em SP. A reforma tributária (IBS/CBS, ~26% a partir de 2027) muda esse quadro.",
  },
  {
    id: "pessoalEOperacao",
    label: "Pessoal, vendas e operação",
    percentual: 28,
    cor: "#00A652",
    descricaoCurta:
      "Tripulação, equipes de solo e handling, mais vendas, gestão e demais despesas operacionais.",
    insight:
      "Somadas, pessoal e as despesas de operação, vendas e administração pesam quase tanto quanto o combustível (ABEAR). É a parcela mais sensível à escala: rotas mais densas diluem melhor esse custo por passageiro.",
  },
  {
    id: "leasingEManutencao",
    label: "Leasing, manutenção e depreciação",
    percentual: 20,
    cor: "#2c2c2c",
    descricaoCurta:
      "Arrendamento, manutenção e depreciação das aeronaves — custos majoritariamente dolarizados.",
    insight:
      "A maior parte da frota comercial brasileira é arrendada e os contratos são em dólar, assim como peças e motores. Cerca de 57% dos custos do setor são dolarizados (ABEAR) — o câmbio afeta a passagem mesmo sem o avião sair do país.",
  },
  {
    id: "tarifasAeroportuariasENavegacao",
    label: "Tarifas aeroportuárias e navegação",
    percentual: 6,
    cor: "#0099D8",
    descricaoCurta:
      "Tarifas de embarque, pouso e permanência, além da navegação aérea (DECEA).",
    insight:
      "Tarifas reguladas que remuneram a infraestrutura aeroportuária e o controle do espaço aéreo — cerca de 6% dos custos (ABEAR). A 'tarifa média' que a ANAC divulga NÃO inclui essas taxas — por isso elas aparecem aqui como camada à parte do preço total pago.",
  },
  {
    id: "margemCia",
    label: "Resultado da companhia",
    percentual: 4,
    cor: "#00A652",
    descricaoCurta:
      "O que resta à companhia aérea depois de todos os custos — quando resta.",
    insight:
      "A margem das companhias aéreas é estreita no mundo todo (~3% líquida em anos bons) e historicamente pressionada no Brasil, onde em vários anos foi zero ou negativa — GOL entrou em recuperação (Chapter 11) em 2024; LATAM, entre 2020 e 2022. De cada real pago, a menor parte — quando há — permanece com quem opera o voo.",
    destaque: "menor fatia",
  },
];

// ── rotas-âncora (tarifa ILUSTRATIVA até ligar aos Microdados da ANAC) ───────────
// tarifaMedia em R$; regiao ∈ {norte,nordeste,sudeste,sul}. A média doméstica
// divulgada pela ANAC foi R$ 632,53 em mai/2026 — as âncoras respeitam essa ordem.
const ROTAS_ILUSTRATIVAS = [
  { id: "gru-sdu", label: "GRU → SDU", origem: "São Paulo (GRU)", destino: "Rio de Janeiro (SDU)", tarifaMedia: 689, regiao: "sudeste" },
  { id: "gru-mao", label: "GRU → MAO", origem: "São Paulo (GRU)", destino: "Manaus (MAO)", tarifaMedia: 1420, regiao: "norte" },
  { id: "bsb-bel", label: "BSB → BEL", origem: "Brasília (BSB)", destino: "Belém (BEL)", tarifaMedia: 1180, regiao: "norte" },
  { id: "mao-tbt", label: "MAO → TBT", origem: "Manaus (MAO)", destino: "Tabatinga (TBT)", tarifaMedia: 1690, regiao: "norte" },
  { id: "gru-rec", label: "GRU → REC", origem: "São Paulo (GRU)", destino: "Recife (REC)", tarifaMedia: 870, regiao: "nordeste" },
  { id: "poa-gru", label: "POA → GRU", origem: "Porto Alegre (POA)", destino: "São Paulo (GRU)", tarifaMedia: 640, regiao: "sul" },
];

// Par ICAO por rota (a ANAC usa sg_icao_origem/sg_icao_destino, não IATA):
//   GRU=SBGR · SDU=SBRJ · MAO=SBEG · BSB=SBBR · BEL=SBBE · TBT=SBTT · REC=SBRF · POA=SBPA
const OD_POR_ROTA = {
  "gru-sdu": ["SBGR", "SBRJ"],
  "gru-mao": ["SBGR", "SBEG"],
  "bsb-bel": ["SBBR", "SBBE"],
  "mao-tbt": ["SBEG", "SBTT"],
  "gru-rec": ["SBGR", "SBRF"],
  "poa-gru": ["SBPA", "SBGR"],
};

// ── agregação (média ponderada por assentos, par OD não-direcionado) ─────────────
// Acumula sobre um ou mais CSVs (vários meses → média mais estável em rotas finas).
function acumulaCsv(buf, acc) {
  const txt = buf.toString("latin1").replace(/^﻿/, "");
  const linhas = txt.split(/\r?\n/);
  const header = (linhas.shift() ?? "").split(";").map((h) => h.trim().toUpperCase());
  const col = (sub) => header.findIndex((h) => h.includes(sub));
  const iOri = col("ORIGEM"), iDes = col("DESTINO"), iTar = col("TARIFA"), iAss = col("ASSENTO");
  if (iOri < 0 || iDes < 0 || iTar < 0) {
    throw new Error(`CSV da ANAC sem colunas esperadas (ORIGEM;DESTINO;TARIFA;ASSENTOS). Header: ${header.join(";")}`);
  }
  const num = (s) => Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  for (const linha of linhas) {
    if (!linha) continue;
    const c = linha.split(";");
    const o = (c[iOri] ?? "").trim().toUpperCase();
    const d = (c[iDes] ?? "").trim().toUpperCase();
    const tarifa = num(c[iTar]);
    const assentos = iAss >= 0 ? num(c[iAss]) : 1;
    if (!o || !d || !(tarifa > 0) || !(assentos > 0)) continue;
    const par = [o, d].sort().join("|");
    (acc[par] ??= { sw: 0, w: 0 });
    acc[par].sw += tarifa * assentos;
    acc[par].w += assentos;
  }
  return acc;
}

function mediaPorRota(acc) {
  const media = {}; // rotaId → { tarifaMedia, amostra }
  for (const [rotaId, [a, b]] of Object.entries(OD_POR_ROTA)) {
    const par = [a.toUpperCase(), b.toUpperCase()].sort().join("|");
    const e = acc[par];
    if (e && e.w > 0) media[rotaId] = { tarifaMedia: Math.round(e.sw / e.w), amostra: Math.round(e.w) };
  }
  return media;
}

// ── download ANAC (portal SAS, ASP.NET) — só com --baixar ───────────────────────
const ANAC_SAS_URL = "https://sas.anac.gov.br/sas/downloads/view/frmDownload.aspx?tema=14";
const CACHE_DIR = path.resolve(raiz, ".cache/anac");
const UA = "ObservatorioIBI/1.0 (+dashboard aereo cada-real)";
const jar = {}; // cookie jar mínimo (sessão ASP.NET)

function guardaCookies(res) {
  const sc = res.headers.getSetCookie?.() ?? [];
  for (const c of sc) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
}
function headers(extra = {}) {
  const h = { "User-Agent": UA, ...extra };
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookie) h.Cookie = cookie;
  return h;
}
async function httpGet(url) {
  const res = await fetch(url, { headers: headers() });
  guardaCookies(res);
  if (!res.ok) throw new Error(`HTTP ${res.status} em GET`);
  return res.text();
}
async function httpPost(url, campos) {
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ "Content-Type": "application/x-www-form-urlencoded" }),
    body: new URLSearchParams(campos).toString(),
  });
  guardaCookies(res);
  if (!res.ok) throw new Error(`HTTP ${res.status} em POST`);
  return res;
}
function camposOcultos(html) {
  const campos = { __EVENTTARGET: "", __EVENTARGUMENT: "" };
  for (const nome of ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]) {
    const m = html.match(new RegExp(`id="${nome}" value="([^"]*)"`));
    if (m) campos[nome] = m[1];
  }
  return campos;
}
async function buscaAno(ano) {
  const html0 = await httpGet(ANAC_SAS_URL);
  const campos = camposOcultos(html0);
  campos["ctl00$MainContent$listAno"] = String(ano);
  campos["ctl00$MainContent$btnListaArquivos"] = "Buscar Arquivos";
  const r1 = await httpPost(ANAC_SAS_URL, campos);
  const html1 = await r1.text();
  const arquivos = {};
  const pat = /name="(ctl00\$MainContent\$gridArquivos\$ctl\d+\$chkDownload)"[^>]*\/?>\s*<\/td><td[^>]*>([^<]+?\.CSV)<\/td>/gi;
  let m;
  while ((m = pat.exec(html1))) arquivos[m[2].trim().toUpperCase()] = m[1];
  return { campos: camposOcultos(html1), arquivos };
}
function unzipPrimeiroCsv(buf) {
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const metodo = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const nameStart = off + 30;
    const nome = buf.toString("latin1", nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    if (compSize === 0) throw new Error("ZIP com data-descriptor (streaming) — use --anac <csv>");
    const comp = buf.subarray(dataStart, dataStart + compSize);
    if (nome.toUpperCase().endsWith(".CSV")) {
      return metodo === 0 ? comp : zlib.inflateRawSync(comp);
    }
    off = dataStart + compSize;
  }
  throw new Error("ZIP sem CSV / formato inesperado");
}
async function baixaArquivo(campos, ano, chkName) {
  const body = { ...campos, "ctl00$MainContent$listAno": String(ano), [chkName]: "on", "ctl00$MainContent$btnBaixar": "Baixar Marcados" };
  const res = await httpPost(ANAC_SAS_URL, body);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b) return unzipPrimeiroCsv(buf); // "PK" → ZIP
  if (buf.subarray(0, 64).toString("latin1").trimStart().startsWith("<")) {
    throw new Error("portal devolveu HTML em vez de CSV");
  }
  return buf;
}
async function baixaMes(ano, mes, listagens) {
  const nome = `${ano}${String(mes).padStart(2, "0")}.CSV`;
  const cache = path.join(CACHE_DIR, nome);
  if (existsSync(cache) && statSync(cache).size > 0) return readFileSync(cache);
  for (const tentativa of [1, 2]) {
    try {
      if (!listagens[ano] || tentativa === 2) listagens[ano] = await buscaAno(ano);
      const { campos, arquivos } = listagens[ano];
      if (!(nome in arquivos)) {
        console.warn(`  [aviso] ${nome} não listado no portal — pulando`);
        return null;
      }
      const buf = await baixaArquivo(campos, ano, arquivos[nome]);
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cache, buf);
      console.log(`  ✓ baixado ${nome} (${(buf.length / 1e6).toFixed(1)} MB)`);
      return buf;
    } catch (e) {
      if (tentativa === 2) {
        console.warn(`  [aviso] falha ao baixar ${nome}: ${e.message}`);
        return null;
      }
    }
  }
  return null;
}
function ultimosMeses(refYYYYMM, n) {
  const [y, m] = refYYYYMM.split("-").map(Number);
  const out = [];
  for (let k = 0; k < n; k++) {
    const d = new Date(Date.UTC(y, m - 1 - k, 1));
    out.push({ ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 });
  }
  return out.reverse();
}

// ── monta rotas (ilustrativo → real, se houver dado) ────────────────────────────
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function labelPeriodo(usados) {
  // usados: [{ano,mes}] ordenado asc; devolve "abr/2026" ou "mar–abr/2026".
  if (usados.length === 0) return null;
  const f = (u) => `${MESES_ABREV[u.mes - 1]}/${u.ano}`;
  const a = usados[0], b = usados[usados.length - 1];
  if (usados.length === 1) return f(a);
  return a.ano === b.ano ? `${MESES_ABREV[a.mes - 1]}–${f(b)}` : `${f(a)}–${f(b)}`;
}

let rotas = ROTAS_ILUSTRATIVAS.map((r) => ({ ...r }));
let tarifasOrigem = "ilustrativo";
let tarifasPeriodo = null;
let dadosIlustrativos = true;

function aplicaMedia(media, origem) {
  let casadas = 0;
  rotas = rotas.map((r) => {
    const m = media[r.id];
    if (m) { casadas++; return { ...r, tarifaMedia: m.tarifaMedia, amostra: m.amostra }; }
    console.warn(`⚠ rota ${r.id} (${r.label}) sem par no dado — mantém tarifa ilustrativa`);
    return r;
  });
  if (casadas === 0) { console.warn("⚠ nenhuma rota casou com o dado — mantém tudo ilustrativo"); return; }
  tarifasOrigem = origem;
  dadosIlustrativos = casadas < rotas.length; // ainda ilustrativo se sobrou rota sem dado
  console.log(`✓ ${casadas}/${rotas.length} rotas com tarifa real`);
}

if (csvAnac) {
  const acc = acumulaCsv(readFileSync(csvAnac), {});
  aplicaMedia(mediaPorRota(acc), "ANAC — Tarifas Aéreas Domésticas (microdados)");
} else if (baixar) {
  const periodos = ultimosMeses(referencia, meses);
  console.log(`↓ ANAC: baixando ${periodos.length} mês(es) até ${referencia}…`);
  const acc = {};
  const listagens = {};
  const usados = [];
  for (const { ano, mes } of periodos) {
    const buf = await baixaMes(ano, mes, listagens);
    if (!buf) continue;
    try { acumulaCsv(buf, acc); usados.push({ ano, mes }); }
    catch (e) { console.warn(`  [aviso] parsing ${ano}${String(mes).padStart(2, "0")}: ${e.message}`); }
  }
  if (usados.length === 0) console.warn("⚠ nenhum mês da ANAC utilizável — mantém tarifas ilustrativas");
  else {
    tarifasPeriodo = labelPeriodo(usados);
    aplicaMedia(mediaPorRota(acc), "ANAC — Tarifas Aéreas Domésticas (microdados)");
  }
}

// ── grava ───────────────────────────────────────────────────────────────────────
const soma = DECOMPOSICAO.reduce((s, c) => s + c.percentual, 0);
if (soma !== 100) throw new Error(`Decomposição soma ${soma}, deveria ser 100.`);

const out = {
  referencia,
  geradoEm: hoje,
  fonte:
    "CNT/ABEAR (peso do QAV nos custos) · ANAC Tarifas Aéreas Domésticas (tarifa média por rota) · ABEAR/IATA (demais camadas)",
  tarifas: {
    origem: tarifasOrigem,
    periodo: tarifasPeriodo,
    dadosIlustrativos,
    nota: "A 'tarifa média' da ANAC exclui taxas aeroportuárias — elas entram na página como camada à parte do preço total pago.",
  },
  ajusteNorteCombustivelPP: AJUSTE_NORTE_COMBUSTIVEL_PP,
  rotas,
  decomposicao: DECOMPOSICAO,
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`✓ ${path.relative(raiz, outPath)} — ref ${referencia}, tarifas: ${tarifasOrigem}${dadosIlustrativos ? " (ilustrativo)" : ""}`);
