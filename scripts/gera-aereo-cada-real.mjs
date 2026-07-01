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
 *     Aéreas Domésticas). Sem CSV, usa âncoras ILUSTRATIVAS (marcadas como tal).
 *
 * Uso:
 *   node scripts/gera-aereo-cada-real.mjs                 # seed ilustrativo
 *   node scripts/gera-aereo-cada-real.mjs --anac <csv>    # tarifa real da ANAC
 *   node scripts/gera-aereo-cada-real.mjs --ref 2026-05   # rótulo de referência
 *
 * CSV da ANAC (Tarifas Aéreas Domésticas, microdados): 1 linha por
 * empresa×origem×destino×faixa, separador ';', decimal com vírgula, colunas
 * ANO;MES;EMPRESA;ORIGEM;DESTINO;TARIFA;ASSENTOS. A tarifa média por rota é a
 * média PONDERADA por assentos: Σ(TARIFA·ASSENTOS)/Σ(ASSENTOS). Baixe o arquivo do
 * ano/mês em https://sas.anac.gov.br/sas/downloads (tema Tarifas Aéreas
 * Domésticas) — a rotina de download fica em scripts/tarifa_antecipada_eda.py.
 *
 * Idempotente. Ver docs/RUNBOOK-DADOS.md (seção Aéreo).
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(aqui, "../public/data/aereo/cada-real.json");

// ── args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const csvAnac = opt("--anac");
const referencia = opt("--ref") ?? "2026-05";
const hoje = new Date().toISOString().slice(0, 10);

// ── anatomia estrutural (curada, com fonte) ─────────────────────────────────────
// Soma = 100. Combustível + tributos = 53% ("mais da metade" — headline da página).
// FONTES: CNT/ABEAR (QAV ~36% dos custos em 2024, ~45% no pico de 2026, global ~31%);
// ABEAR/IATA (estrutura de custos); resultado do setor estreito/negativo no Brasil.
const AJUSTE_NORTE_COMBUSTIVEL_PP = 6;

const DECOMPOSICAO = [
  {
    id: "combustivel",
    label: "Combustível (QAV)",
    percentual: 38,
    cor: "#D4922A",
    descricaoCurta:
      "Querosene de aviação — o maior item de custo da operação aérea no Brasil.",
    insight:
      "O QAV respondeu por ~36% dos custos operacionais do setor em 2024 (CNT/ABEAR) e chegou perto de 45% no pico de 2026 — contra ~31% da média global. Segue a paridade internacional do petróleo e o câmbio; em rotas amazônicas, a logística de distribuição eleva ainda mais esse peso, por isso a fatia é maior nas rotas do Norte.",
  },
  {
    id: "tributos",
    label: "Tributos",
    percentual: 15,
    cor: "#A0153E",
    descricaoCurta:
      "PIS/Cofins, ISS e demais encargos — além do ICMS sobre o QAV, já embutido no combustível.",
    insight:
      "Parte do peso tributário já vem dentro do preço do combustível (o ICMS estadual sobre o QAV, que varia de estado para estado). Esta camada capta os tributos que incidem sobre a operação e a venda, por cima disso. Reduções de alíquota de ICMS vêm sendo usadas como instrumento para atrair frequências e novas rotas.",
  },
  {
    id: "tarifasAeroportuariasENavegacao",
    label: "Tarifas aeroportuárias e navegação",
    percentual: 12,
    cor: "#0099D8",
    descricaoCurta:
      "Tarifas de embarque, pouso e permanência, além da navegação aérea (DECEA).",
    insight:
      "São tarifas reguladas, que remuneram a infraestrutura aeroportuária e o controle do espaço aéreo. A 'tarifa média' que a ANAC divulga NÃO inclui essas taxas — por isso elas aparecem aqui como camada à parte do preço total pago. Entram no bilhete de toda passagem, independentemente da companhia que opera o voo.",
  },
  {
    id: "pessoalEOperacao",
    label: "Pessoal, vendas e operação",
    percentual: 16,
    cor: "#00A652",
    descricaoCurta:
      "Tripulação, equipes de solo, distribuição/vendas e demais custos operacionais.",
    insight:
      "Inclui salários e treinamento de tripulações e equipes de aeroporto, além dos custos de distribuição e venda do bilhete. É a parcela mais sensível à escala: rotas mais densas diluem melhor esse custo por passageiro.",
  },
  {
    id: "leasingEManutencao",
    label: "Leasing e manutenção",
    percentual: 15,
    cor: "#2c2c2c",
    descricaoCurta:
      "Arrendamento das aeronaves e manutenção — custos majoritariamente dolarizados.",
    insight:
      "A maior parte da frota comercial brasileira é arrendada e os contratos são em dólar, assim como peças e motores. O câmbio afeta a passagem mesmo sem o avião sair do país.",
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

// Código IATA por rota → par de aeroportos ANAC (para casar com o CSV).
const OD_POR_ROTA = {
  "gru-sdu": ["GRU", "SDU"],
  "gru-mao": ["GRU", "MAO"],
  "bsb-bel": ["BSB", "BEL"],
  "mao-tbt": ["MAO", "TBT"],
  "gru-rec": ["GRU", "REC"],
  "poa-gru": ["POA", "GRU"],
};

// ── agregação ANAC (média ponderada por assentos, ida+volta do par) ─────────────
function mediaPorRotaANAC(csvPath) {
  const txt = readFileSync(csvPath, "latin1").replace(/^﻿/, "");
  const linhas = txt.split(/\r?\n/).filter((l) => l.trim());
  const header = linhas.shift().split(";").map((h) => h.trim().toUpperCase());
  const idx = (nome) => header.findIndex((h) => h === nome);
  const iOri = idx("ORIGEM"), iDes = idx("DESTINO"), iTar = idx("TARIFA"), iAss = idx("ASSENTOS");
  if (iOri < 0 || iDes < 0 || iTar < 0) {
    throw new Error(`CSV da ANAC sem colunas esperadas (ORIGEM;DESTINO;TARIFA;ASSENTOS). Header: ${header.join(";")}`);
  }
  const num = (s) => Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  // acumula soma(tarifa*assentos) e soma(assentos) por par não-direcionado
  const acc = {}; // "GRU|SDU" (ordenado) → { sw, w }
  for (const linha of linhas) {
    const c = linha.split(";");
    const o = (c[iOri] ?? "").trim().toUpperCase();
    const d = (c[iDes] ?? "").trim().toUpperCase();
    const tarifa = num(c[iTar]);
    const assentos = iAss >= 0 ? num(c[iAss]) : 1;
    if (!o || !d || !isFinite(tarifa) || tarifa <= 0 || !isFinite(assentos) || assentos <= 0) continue;
    const par = [o, d].sort().join("|");
    (acc[par] ??= { sw: 0, w: 0 });
    acc[par].sw += tarifa * assentos;
    acc[par].w += assentos;
  }
  const media = {}; // rotaId → { tarifaMedia, amostra }
  for (const [rotaId, [a, b]] of Object.entries(OD_POR_ROTA)) {
    const par = [a.toUpperCase(), b.toUpperCase()].sort().join("|");
    const e = acc[par];
    if (e && e.w > 0) media[rotaId] = { tarifaMedia: Math.round(e.sw / e.w), amostra: Math.round(e.w) };
  }
  return media;
}

// ── monta e grava ───────────────────────────────────────────────────────────────
let rotas = ROTAS_ILUSTRATIVAS.map((r) => ({ ...r }));
let tarifasOrigem = "ilustrativo";
let dadosIlustrativos = true;

if (csvAnac) {
  const media = mediaPorRotaANAC(csvAnac);
  let casadas = 0;
  rotas = rotas.map((r) => {
    const m = media[r.id];
    if (m) { casadas++; return { ...r, tarifaMedia: m.tarifaMedia, amostra: m.amostra }; }
    console.warn(`⚠ rota ${r.id} (${r.label}) sem par no CSV — mantém tarifa ilustrativa`);
    return r;
  });
  if (casadas === 0) throw new Error("Nenhuma rota casou com o CSV da ANAC — confira o arquivo/mês.");
  tarifasOrigem = "ANAC — Tarifas Aéreas Domésticas (microdados)";
  dadosIlustrativos = casadas < rotas.length; // ainda ilustrativo se sobrou rota sem dado
  console.log(`✓ ${casadas}/${rotas.length} rotas com tarifa real da ANAC`);
}

const soma = DECOMPOSICAO.reduce((s, c) => s + c.percentual, 0);
if (soma !== 100) throw new Error(`Decomposição soma ${soma}, deveria ser 100.`);

const out = {
  referencia,
  geradoEm: hoje,
  fonte:
    "CNT/ABEAR (peso do QAV nos custos) · ANAC Tarifas Aéreas Domésticas (tarifa média por rota) · ABEAR/IATA (demais camadas)",
  tarifas: {
    origem: tarifasOrigem,
    dadosIlustrativos,
    nota: "A 'tarifa média' da ANAC exclui taxas aeroportuárias — elas entram na página como camada à parte do preço total pago.",
  },
  ajusteNorteCombustivelPP: AJUSTE_NORTE_COMBUSTIVEL_PP,
  rotas,
  decomposicao: DECOMPOSICAO,
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`✓ ${path.relative(path.resolve(aqui, ".."), outPath)} — ref ${referencia}, tarifas: ${tarifasOrigem}${dadosIlustrativos ? " (ilustrativo)" : ""}`);
