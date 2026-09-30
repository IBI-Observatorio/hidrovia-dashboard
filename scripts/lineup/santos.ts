// scripts/lineup/santos.ts — PASSO 2
// Line-up do Porto de Santos (APS/DIOPE) — pilar F do corredor Santos.
//
// Fonte (citar no card): Porto de Santos — Navios Esperados · Carga (DIOPE).
//   A lista é renderizada server-side em <tbody><tr>, mas o backend DIOPE
//   monta a página em ~20 s e FALHA INTERMITENTEMENTE (volta vazia) —
//   por isso: timeout longo + até 3 tentativas com pausa.
//   Navio pode ter MÚLTIPLAS cargas no mesmo <td>, separadas por <br>
//   (mercadoria/operação/peso pareados por posição) — soma só os pares
//   de grão com operação EMB.
//
// dwt = PESO DA CARGA programada (proxy declarado; mais fiel à fila de
// grão que o porte bruto). Fundeados/atracados ficam fora do F v0: a APS
// não expõe a mercadoria deles (a espera completa já entra pela métrica
// ANTAQ TEsperaAtracacao).
//
// Calado × IMO (estudo do calado perdido, IBI×NORA): a MESMA página traz
// "Com/Len · Cal/Draft" (td 2, comprimento<br>calado) e IMO (td 14) de TODOS os
// navios esperados. Cada escala (DUV) é arquivada uma vez em
// data/lineup/santos-escalas-calado.json, com o 1º e o último calado vistos.
// O que a APS chama de "Cal/Draft" (chegada? saída? máximo?) NÃO está
// documentado — tratar como "calado informado na programação".
//
// TLS: o servidor da APS não envia a CA intermediária (Sectigo OV R36). O
// Windows completa a cadeia sozinho; o Linux do GitHub Actions não ("fetch
// failed" diário desde 01/07/2026). A intermediária vai em certs/ e entra como
// CA extra só nesta requisição — a verificação TLS continua ligada.
//
// Healthcheck: < 10 graneleiros parseados ⇒ "indisponivel" (estado honesto,
// snapshots preservados). Agregação fila→score: calculaComponenteF (lib/iee).
//
// Execução: npx tsx scripts/lineup/santos.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { rootCertificates } from "node:tls";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RX_FERT, FILTRO_FERT, dedupeFert, acumulaFert, type NavioFert, type SnapshotFert } from "./fertilizante";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "lineup", "santos.json");
const ARQ_CALADO = join(RAIZ, "data", "lineup", "santos-escalas-calado.json");
const CA_APS = [...rootCertificates, readFileSync(join(RAIZ, "scripts", "lineup", "certs", "sectigo-ov-r36.pem"), "utf8")];
const URL_PAGINA =
  "https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/navegacao-e-movimento-de-navios/navios-esperados-carga/";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };
const RX_GRAO = /SOJA|MILHO|A[ÇC]UCAR|ACUCAR|FARELO|TRIGO|CEVADA|SORGO/i;
const MAX_SNAPSHOTS = 730;
const TENTATIVAS = 3;

interface Navio {
  navio: string; dwt: number; sentido: string; mercadoria: string; eta?: string; status: string;
  imo?: string; calado_m?: number; comprimento_m?: number;
}

/** Uma escala (DUV) na lista de esperados, com o calado informado pela APS. */
export interface EscalaCalado {
  duv: string; imo: string; navio: string; bandeira: string; secao: string;
  comprimento_m: number | null; calado_m: number | null; calado_primeiro_m: number | null;
  chegada?: string; operacoes: string[]; mercadorias: string[]; peso_t: number; terminal: string;
  visto_primeiro: string; visto_ultimo: string;
}
type EscalaLida = Omit<EscalaCalado, "calado_primeiro_m" | "visto_primeiro" | "visto_ultimo">;

const semTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/** divide um <td> por <br> em sub-valores pareáveis */
const porBR = (html: string) =>
  html.split(/<br\s*\/?>/i).map((x) => semTags(x)).filter(Boolean);
const num = (s: string | undefined) => { const v = parseFloat((s ?? "").replace(",", ".")); return Number.isFinite(v) ? v : null; };
const isoData = (dmy: string) => { const [d, m, a] = dmy.slice(0, 10).split("/"); return a && m && d ? `${a}-${m}-${d}` : undefined; };
/** td 2 = "comprimento<br>calado" */
const comCal = (td: string) => { const [c, k] = porBR(td); return { comprimento_m: num(c), calado_m: num(k) }; };

export function parseSantos(html: string): Navio[] {
  const out: Navio[] = [];
  for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const tds = [...tr[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 15) continue;
    const navio = semTags(tds[0]);
    const cheg = semTags(tds[4]).slice(0, 10); // dd/mm/aaaa
    const ops = porBR(tds[7]);
    const mercs = porBR(tds[8]);
    const pesos = porBR(tds[9]);
    let pesoGrao = 0;
    let mercGrao = "";
    for (let i = 0; i < mercs.length; i++) {
      const op = ops[i] ?? ops[0] ?? "";
      if (!RX_GRAO.test(mercs[i]) || /CONTEINER/i.test(mercs[i]) || !/EMB/.test(op)) continue;
      pesoGrao += +(pesos[i] ?? "0").replace(/\D/g, "");
      if (!mercGrao) mercGrao = mercs[i].slice(0, 30);
    }
    if (pesoGrao <= 0 || !navio) continue;
    const [d, m, a] = cheg.split("/");
    out.push({
      navio, dwt: pesoGrao, sentido: "Exp", mercadoria: mercGrao,
      eta: a && m && d ? `${a}-${m}-${d}` : undefined, status: "esperado",
      imo: semTags(tds[14]) || undefined,
      calado_m: comCal(tds[2]).calado_m ?? undefined,
      comprimento_m: comCal(tds[2]).comprimento_m ?? undefined,
    });
  }
  return out;
}

/** Fertilizante com operação DESC (série própria — ver ./fertilizante.ts).
 *  Mesmo pareamento por <br> de operação/mercadoria/peso usado no grão. */
export function parseFertSantos(html: string): NavioFert[] | null {
  const out: NavioFert[] = [];
  let lidas = 0;
  for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const tds = [...tr[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 15) continue;
    lidas++;
    const navio = semTags(tds[0]);
    const cheg = semTags(tds[4]).slice(0, 10);
    const ops = porBR(tds[7]);
    const mercs = porBR(tds[8]);
    const pesos = porBR(tds[9]);
    let peso = 0;
    let merc = "";
    for (let i = 0; i < mercs.length; i++) {
      const op = ops[i] ?? ops[0] ?? "";
      if (!RX_FERT.test(mercs[i]) || !/DESC/.test(op)) continue;
      peso += +(pesos[i] ?? "0").replace(/\D/g, "");
      if (!merc) merc = mercs[i].slice(0, 30);
    }
    if (peso <= 0 || !navio) continue;
    const [d, m, a] = cheg.split("/");
    out.push({ navio, toneladas: peso, mercadoria: merc, eta: a && m && d ? `${a}-${m}-${d}` : undefined, status: "esperado" });
  }
  return lidas > 0 ? dedupeFert(out) : null;
}

/** Todas as escalas da página (qualquer carga), com a seção (LIQUIDO A GRANEL, TRIGO…). */
export function parseEscalasCalado(html: string): EscalaLida[] {
  const out: EscalaLida[] = [];
  let secao = "";
  for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const titulo = tr[0].match(/<th[^>]*colspan[^>]*>([\s\S]*?)<\/th>/i);
    if (titulo) { secao = semTags(titulo[1]); continue; }
    const tds = [...tr[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 15) continue;
    const duv = semTags(tds[11]);
    if (!duv) continue;
    out.push({
      duv, imo: semTags(tds[14]), navio: semTags(tds[0]), bandeira: semTags(tds[1]), secao,
      ...comCal(tds[2]), chegada: isoData(semTags(tds[4])),
      operacoes: porBR(tds[7]), mercadorias: porBR(tds[8]),
      peso_t: porBR(tds[9]).reduce((s, p) => s + (+p.replace(/\D/g, "") || 0), 0),
      terminal: semTags(tds[13]),
    });
  }
  return out;
}

/** Arquiva cada DUV uma vez; atualiza os campos correntes e guarda o 1º calado visto. */
function acumulaEscalas(hoje: string, novas: EscalaLida[]): number {
  let base: EscalaCalado[] = [];
  try { base = JSON.parse(readFileSync(ARQ_CALADO, "utf8")).escalas ?? []; } catch { /* primeiro arquivo */ }
  const porDuv = new Map(base.map((e) => [e.duv, e]));
  for (const n of novas) {
    const ant = porDuv.get(n.duv);
    porDuv.set(n.duv, {
      ...n,
      calado_primeiro_m: ant ? ant.calado_primeiro_m : n.calado_m,
      visto_primeiro: ant?.visto_primeiro ?? hoje,
      visto_ultimo: hoje,
    });
  }
  const escalas = [...porDuv.values()].sort((a, b) => a.visto_primeiro.localeCompare(b.visto_primeiro) || a.duv.localeCompare(b.duv));
  const cab = {
    fonte: "Porto de Santos (APS/DIOPE) — Navios Esperados · Carga",
    url: URL_PAGINA,
    nota: "Uma linha por escala (DUV). calado_m = coluna 'Cal/Draft' da APS (significado não documentado: calado informado na programação); calado_primeiro_m = 1º valor visto, calado_m = último.",
    atualizadoEm: hoje, total: escalas.length,
  };
  // uma escala por linha: diff legível no git
  writeFileSync(ARQ_CALADO,
    JSON.stringify(cab, null, 1).replace(/\n}$/, ',\n "escalas": [\n') +
    escalas.map((e) => JSON.stringify(e)).join(",\n") + "\n]}\n");
  return escalas.length;
}

/** GET com a CA intermediária da APS somada às raízes padrão (ver cabeçalho). */
function baixa(url: string, timeoutMs: number): Promise<{ status: number; body: string }> {
  return new Promise((ok, falha) => {
    const req = httpsGet(url, { headers: UA, ca: CA_APS, timeout: timeoutMs }, (r) => {
      let body = "";
      r.setEncoding("utf8");
      r.on("data", (c) => (body += c));
      r.on("end", () => ok({ status: r.statusCode ?? 0, body }));
    });
    req.on("timeout", () => req.destroy(new Error(`timeout ${timeoutMs / 1000}s`)));
    req.on("error", falha);
  });
}

async function buscaComRetry(): Promise<string> {
  let ultimoErro = "";
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const r = await baixa(URL_PAGINA, 90_000);
      if (r.status !== 200) { ultimoErro = `HTTP ${r.status}`; continue; }
      const html = r.body;
      // página "vazia" intermitente: legenda presente mas sem linhas de navio
      if ((html.match(/<tr/gi) ?? []).length > 30) return html;
      ultimoErro = "lista vazia (backend DIOPE intermitente)";
    } catch (e) {
      const err = e as Error & { code?: string };
      ultimoErro = err.code ? `${err.code} — ${err.message}` : err.message; // causa real, não "fetch failed"
    }
    await new Promise((res) => setTimeout(res, 20_000));
  }
  throw new Error(`${TENTATIVAS} tentativas falharam — ${ultimoErro}`);
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  let anterior: { snapshots?: { dataColeta: string; navios: Navio[] }[]; snapshotsFertilizantes?: SnapshotFert[] } | null = null;
  try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }
  let fert: NavioFert[] | null = null;
  try {
    const html = await buscaComRetry();
    fert = parseFertSantos(html);
    const navios = parseSantos(html);
    const nEscalas = acumulaEscalas(hoje, parseEscalasCalado(html));
    // HEALTHCHECK: Santos sem 10 graneleiros de grão esperados é implausível.
    if (navios.length < 10) throw new Error(`só ${navios.length} graneleiros parseados — layout mudou?`);
    const snapshots = (anterior?.snapshots ?? []).filter((s) => s.dataColeta !== hoje);
    snapshots.push({ dataColeta: hoje, navios });
    while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      fonte: "Porto de Santos (APS/DIOPE) — Navios Esperados · Carga",
      url: URL_PAGINA, porto: "santos",
      filtro: "graneleiros EMB: soja, milho, açúcar, farelo, trigo, cevada, sorgo · campo dwt = PESO DA CARGA programada (proxy declarado, melhor que porte bruto)",
      coletadoEm: hoje, status: "ok" as const,
      observacao: "Fundeados/atracados da APS não expõem mercadoria — fila v0 usa só os esperados de carga (documentado). Servidor da APS monta a lista em ~20 s e falha intermitentemente: o scraper usa retry.",
      snapshots,
      filtroFertilizantes: FILTRO_FERT,
      statusFertilizantes: fert ? "ok" : "indisponivel",
      snapshotsFertilizantes: acumulaFert(anterior?.snapshotsFertilizantes, hoje, fert),
    }, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[lineup-santos] OK — ${navios.length} graneleiros · ${Math.round(navios.reduce((s, n) => s + n.dwt, 0) / 1000)} mil t · ${snapshots.length} snapshots · fertilizante: ${fert ? fert.length + " navios" : "indisponível"} · ${nEscalas} escalas c/ calado arquivadas`);
  } catch (e) {
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      ...((anterior as object) ?? { snapshots: [] }),
      url: URL_PAGINA, coletadoEm: hoje, status: "indisponivel" as const, erro: (e as Error).message,
      statusFertilizantes: fert ? "ok" : "indisponivel",
      snapshotsFertilizantes: acumulaFert(anterior?.snapshotsFertilizantes, hoje, fert),
    }, null, 1) + "\n");
    console.error(`[lineup-santos] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
main();
