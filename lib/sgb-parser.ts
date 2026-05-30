// Extração de boletins SGB/CPRM — Sistema de Alerta Hidrológico (SAH) Amazonas
//
// O boletim SGB tem múltiplas tabelas com layouts desalinhados quando
// extraídas via pdftotext.
// Por isso o parser foca em PADRÕES TEXTUAIS ROBUSTOS que sobrevivem à
// extração, ignorando estrutura de coluna:
//
//   A) Resumo executivo (3-4 cotas no parágrafo de abertura)
//   B) Texto narrativo "Comportamento das estações" (variações semanais por
//      estação)
//   C) Seção 6 — Previsões 2° Alerta de Cheias (Manaus, Manacapuru, Itacoatiara,
//      Parintins com IC80 + probabilidade de inundação)
//
// As Tabelas 01-03 e 04-05 são IGNORADAS — confiabilidade baixa em texto.
// Para captura completa de cotas em tempo real, o pipeline já usa a REST ANA
// (lib/ana-client.ts). O parser SGB serve para: (1) capturar a previsão de pico
// (campo PREVISAO_2026) e (2) detectar narrativas relevantes (Onda Branco, etc).

export interface EstacaoCotaSGB {
  estacao:               string;  // chave canônica
  rio:                   string;
  cota_cm:               number;
  variacao_semanal_cm?:  number;
  fonte:                 "resumo" | "narrativa";
}

export interface PrevisaoSGB {
  estacao:                  string;
  cota_prevista_m:          number;
  ic80_min_m:               number;
  ic80_max_m:               number;
  cota_inundacao_m?:        number;
  prob_inundacao?:          number;  // 0..1
  cota_inundacao_severa_m?: number;
  prob_inundacao_severa?:   number;
}

export interface BoletimSGB {
  numero:           number | null;
  data:             string;            // YYYY-MM-DD
  estacoes:         EstacaoCotaSGB[];
  previsoes:        PrevisaoSGB[];
  anomalias_pp:     AnomaliaPPSGB[];   // bacia → categoria (-3..+3) — Sprint v2
  texto_bruto:      string;            // primeiros 3000 chars
  erro?:            string;
  confiabilidade: {
    estacoes_resumo:    number;
    narrativa_variacao: number;
    previsoes:          number;
    anomalias_pp:       number;        // 0..1
  };
}

export interface AnomaliaPPSGB {
  bacia:      string;        // "Negro", "Madeira", etc.
  categoria: -3 | -2 | -1 | 0 | 1 | 2 | 3;
  rotulo:    string;         // "muito seco", "normal", "chuvoso", etc.
}

// Aliases nome-no-boletim → chave canônica do dashboard
// Cobertura: as 4 estações de previsão + as 3 do resumo + as principais narradas
const ALIASES_SGB: Record<string, string> = {
  // chaves de painel
  "manaus":                        "Manaus",
  "itacoatiara":                   "Itacoatiara",
  "manacapuru":                    "Manacapuru",
  "humaitá":                       "Humaita",
  "humaita":                       "Humaita",
  "porto velho":                   "PortoVelho",
  "borba":                         "Borba",
  "são gabriel da cachoeira":      "SGC",
  "sao gabriel da cachoeira":      "SGC",
  "s.g.c.":                        "SGC",
  "sgc":                           "SGC",
  // adicionais relevantes para narrativa
  "parintins":                     "Parintins",
  "óbidos":                        "Obidos",
  "obidos":                        "Obidos",
  "boa vista":                     "BoaVista",
  "caracaraí":                     "Caracarai",
  "caracarai":                     "Caracarai",
  "tabatinga":                     "Tabatinga",
  "fonte boa":                     "FonteBoa",
  "barcelos":                      "Barcelos",
  "santa isabel do rio negro":     "Tapuruquara",
  "tapuruquara":                   "Tapuruquara",
  "santarém":                      "Santarem",
  "santarem":                      "Santarem",
  "rio branco":                    "RioBrancoAC",  // AC, não confundir com rio
  "careiro":                       "Careiro",
  "beruri":                        "Beruri",
};

const RIOS_SGB: Record<string, string> = {
  "Manaus":      "Rio Negro",
  "Itacoatiara": "Rio Amazonas",
  "Manacapuru":  "Rio Solimões",
  "Humaita":     "Rio Madeira",
  "PortoVelho":  "Rio Madeira",
  "Borba":       "Rio Madeira",
  "SGC":         "Rio Negro (alto)",
  "Parintins":   "Rio Amazonas",
  "Obidos":      "Rio Amazonas",
  "BoaVista":    "Rio Branco",
  "Caracarai":   "Rio Branco",
  "Tabatinga":   "Rio Solimões",
  "FonteBoa":    "Rio Solimões",
  "Barcelos":    "Rio Negro",
  "Tapuruquara": "Rio Negro",
  "Santarem":    "Rio Amazonas",
  "RioBrancoAC": "Rio Acre",
  "Careiro":     "Paraná do Careiro",
  "Beruri":      "Rio Purus",
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

function parsePtNum(s: string | undefined | null): number | null {
  if (s == null) return null;
  const limpo = s.trim().replace(/\./g, "").replace(",", ".");
  if (!limpo || limpo === "-" || limpo.toLowerCase() === "n/d") return null;
  const n = parseFloat(limpo);
  return isNaN(n) ? null : n;
}

/** Normaliza um trecho do PDF (espaços múltiplos, quebras inconsistentes) */
function normaliza(t: string): string {
  return t.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── Cabeçalho ───────────────────────────────────────────────────────────────

export function extraiDataSGB(texto: string): string {
  // "Manaus, 19 de maio de 2026." — padrão preferido (escrito por extenso)
  const meses: Record<string, string> = {
    janeiro: "01", fevereiro: "02", "março": "03", marco: "03",
    abril: "04", maio: "05", junho: "06", julho: "07",
    agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
  };
  const mExt = texto.match(/(\d{1,2})\s+de\s+([a-zçãéí]+)\s+de\s+(\d{4})/i);
  if (mExt) {
    const mes = meses[mExt[2].toLowerCase()];
    if (mes) return `${mExt[3]}-${mes}-${mExt[1].padStart(2, "0")}`;
  }
  // Fallback: primeira data DD/MM/YYYY
  const mNum = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (mNum) return `${mNum[3]}-${mNum[2]}-${mNum[1]}`;
  return new Date().toISOString().split("T")[0];
}

export function extraiNumeroSGB(texto: string): number | null {
  // "20° BOLETIM" ou "20º BOLETIM" — variantes de ordinal
  const m = texto.match(/(\d+)\s*[°ºoO]\s*BOLETIM/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── A) Resumo executivo ─────────────────────────────────────────────────────

/**
 * Captura cotas do parágrafo de abertura.
 * Padrão típico (boletim 20°):
 *   "Em Manaus, o nível atual do rio Negro, é de 2744 cm."
 *   "Em Boa Vista, o nível atual do rio Branco, é de 417 cm."
 *   "Em Porto Velho, o nível atual do rio Madeira, é de 1323 cm."
 *
 * O parser tolera vírgulas variantes e múltiplas estações no resumo.
 */
export function extraiResumo(texto: string): EstacaoCotaSGB[] {
  const out: EstacaoCotaSGB[] = [];
  // Captura cidade + cota numérica em "Em CIDADE, [...] é de NNN cm"
  const re = /Em\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s\.]{2,40}?)\s*,[^\.]{0,80}?é\s+de\s+(-?\d{1,5})\s*cm/g;
  let m: RegExpExecArray | null;
  const visto = new Set<string>();
  while ((m = re.exec(texto)) !== null) {
    const cidade = m[1].trim().toLowerCase().replace(/\.+$/, "");
    const chave = ALIASES_SGB[cidade];
    if (!chave || visto.has(chave)) continue;
    const cota = parsePtNum(m[2]);
    if (cota == null) continue;
    visto.add(chave);
    out.push({
      estacao: chave,
      rio:     RIOS_SGB[chave] ?? "",
      cota_cm: cota,
      fonte:   "resumo",
    });
  }
  return out;
}

// ─── B) Narrativa "Comportamento das estações" ──────────────────────────────

/**
 * Recorta a seção narrativa do boletim entre "Comportamento das estações" e
 * o início da Tabela 02. Restringe o escopo das regex para reduzir falsos
 * positivos vindos da Seção 6 (que tem cotas em metros tipo "28,23 m").
 */
function recortaSecaoNarrativa(texto: string): string {
  const inicio = texto.search(/Comportamento das esta[çc][oõ]es/i);
  if (inicio < 0) return "";
  // Termina no início da Tabela 02 ou nos "Salientamos" (parágrafo de cauda)
  let fim = texto.indexOf("Tabela 02", inicio);
  if (fim < 0) fim = texto.indexOf("tabela 02", inicio);
  if (fim < 0) fim = texto.indexOf("Salientamos", inicio);
  if (fim < 0) fim = Math.min(texto.length, inicio + 4000);
  return texto.slice(inicio, fim);
}

/**
 * Captura variações semanais (em cm ou m) das estações citadas na narrativa.
 * Padrões típicos suportados:
 *   "Em São Gabriel da Cachoeira, a subida foi na ordem de 80 cm"
 *   "em Manaus [...] elevação de 18 cm"
 *   "Em Tabatinga, o acumulado da semana foi de 12 cm"
 *   "elevação na ordem de 2 metros em Boa Vista-RR"
 *   "2,5 m em Caracaraí-RR"
 *   "descida [...] de 1,82 m" (em Rio Branco-AC)
 *
 * Sinal: subida/elevação/acréscimo = positivo. Descida/vazante/queda = negativo.
 */
export function extraiVariacoes(texto: string): Map<string, number> {
  const variacoes = new Map<string, number>();
  const narrativa = recortaSecaoNarrativa(texto);
  if (!narrativa) return variacoes;

  // Estratégia: percorre cada match de "em CIDADE" e procura o PRÓXIMO valor
  // numérico com unidade cm/m dentro de uma janela de até 200 chars, sem cruzar
  // ponto final ou outra ocorrência de "em CIDADE2". Defesas:
  //   - valor_cm > 500 é descartado (variação semanal absurda; provavelmente é cota)
  //   - sinal por contexto: descid/vazant/queda/recu → negativo

  const reCidade = /\b(?:em|Em)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\.\s]{2,40}?)(?=\s*[,\(]|\s+e\s+\w)/g;
  let mC: RegExpExecArray | null;
  while ((mC = reCidade.exec(narrativa)) !== null) {
    const cidade = mC[1].trim().toLowerCase().replace(/-[a-z]{2}$/i, "").replace(/\.+$/, "").trim();
    const chave = ALIASES_SGB[cidade];
    if (!chave || variacoes.has(chave)) continue;

    // Janela: do fim do nome até próximo ponto OU próximo "em CIDADE2" OU 250 chars
    const startBusca = mC.index + mC[0].length;
    const proximoPonto = narrativa.indexOf(".", startBusca);
    // Próxima ocorrência de "em CIDADE2"
    const restante = narrativa.slice(startBusca);
    const mProx = restante.match(/\b(?:em|Em)\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/);
    const idxProx = mProx ? startBusca + (mProx.index ?? 0) : -1;
    const fimJanela = Math.min(
      proximoPonto > 0 ? proximoPonto : narrativa.length,
      idxProx > 0 ? idxProx : narrativa.length,
      startBusca + 250,
    );
    const janela = narrativa.slice(startBusca, fimJanela);

    // Procura primeiro número com unidade — preferir formato "NN cm" ou "N,NN m"
    const mNum = janela.match(/(\d{1,3}(?:,\d{1,2})?)\s*(cm|metros|m)\b/i);
    if (!mNum) continue;
    const valor_num = parsePtNum(mNum[1]);
    if (valor_num == null) continue;
    const unidade = mNum[2].toLowerCase();
    let valor_cm = unidade === "cm" ? Math.round(valor_num) : Math.round(valor_num * 100);

    if (Math.abs(valor_cm) > 500) continue;  // variação semanal > 5m é improvável
    // Sinal: olhar a janela inteira por palavras de movimento
    if (/\b(descid|vazant|queda|recuou|recuo|decres)/i.test(janela)) {
      valor_cm = -Math.abs(valor_cm);
    }
    variacoes.set(chave, valor_cm);
  }

  // Forma invertida "NN m em CIDADE" — comum para Branco/Acre
  const re2 = /(\d{1,2}(?:,\d{1,2})?)\s*(m|metros)\s+em\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]{2,35})/gi;
  let m: RegExpExecArray | null;
  while ((m = re2.exec(narrativa)) !== null) {
    const cidade = m[3].trim().toLowerCase().replace(/-[a-z]{2}$/i, "").replace(/\.+$/, "").trim();
    const chave = ALIASES_SGB[cidade];
    if (!chave || variacoes.has(chave)) continue;
    const valor_num = parsePtNum(m[1]);
    if (valor_num == null) continue;
    let valor_cm = Math.round(valor_num * 100);
    if (Math.abs(valor_cm) > 500) continue;
    const idx = m.index;
    const contexto = narrativa.slice(Math.max(0, idx - 80), idx + m[0].length);
    if (/\b(descid|vazant|queda|recu)/i.test(contexto)) valor_cm = -Math.abs(valor_cm);
    variacoes.set(chave, valor_cm);
  }

  return variacoes;
}

// ─── D) Anomalias de precipitação (Tabela 04/05, parágrafo narrativo) ───────
//
// O parágrafo de "Análise da Precipitação" do SGB classifica cada bacia em
// uma das 7 categorias da técnica de quantis MERGE/GPM:
//   −3 extremamente seco · −2 muito seco · −1 seco · 0 normal
//   +1 chuvoso · +2 muito chuvoso · +3 extremamente chuvoso
//
// O texto usa rótulos tipo: "caracterizada em condição de muito seco",
// "consideradas em condição de normalidade", "tendência a muito seco", etc.
// Extraímos por padrão "bacia + rótulo de categoria + valor anomalia".

const ROTULOS_ANOMALIA: { regex: RegExp; categoria: -3|-2|-1|0|1|2|3; rotulo: string }[] = [
  { regex: /extremamente\s+seco/i,        categoria: -3, rotulo: "extremamente seco" },
  { regex: /tend[eê]ncia\s+a\s+muito\s+seco/i, categoria: -2, rotulo: "tendência a muito seco" },
  { regex: /muito\s+seco/i,               categoria: -2, rotulo: "muito seco" },
  { regex: /tend[eê]ncia\s+a\s+seco/i,    categoria: -1, rotulo: "tendência a seco" },
  { regex: /\bseco\b/i,                   categoria: -1, rotulo: "seco" },
  { regex: /normalidade/i,                categoria:  0, rotulo: "normal" },
  { regex: /\bnormal\b/i,                 categoria:  0, rotulo: "normal" },
  { regex: /chuvoso/i,                    categoria:  1, rotulo: "chuvoso" },
  { regex: /muito\s+chuvoso/i,            categoria:  2, rotulo: "muito chuvoso" },
  { regex: /extremamente\s+chuvoso/i,     categoria:  3, rotulo: "extremamente chuvoso" },
];

// Bacias monitoradas pelo SGB (lista oficial)
const BACIAS_SGB = [
  "Aripuanã", "Aripuana", "Beni", "Branco", "Coari", "Guaporé", "Guapore",
  "Içá", "Ica", "Japurá", "Japura", "Javari", "Ji-Paraná", "Ji-Parana",
  "Juruá", "Jurua", "Jutaí", "Jutai", "Madeira", "Mamoré", "Mamore",
  "Marañon", "Maranon", "Napo", "Negro", "Purus", "Solimões", "Solimoes",
  "Tefé", "Tefe", "Ucayali",
];

export function extraiAnomaliasPP(texto: string): AnomaliaPPSGB[] {
  const out: AnomaliaPPSGB[] = [];
  // Recorta seção "Dados Climatológicos" / "Análise da Precipitação"
  const inicio = texto.search(/An[áa]lise\s+da\s+Precipita[çc][ãa]o/i);
  if (inicio < 0) return out;
  const fim = texto.indexOf("Cotagramas", inicio);
  const sec = texto.slice(inicio, fim > 0 ? fim : Math.min(texto.length, inicio + 8000));

  // Padrão: "bacia(s) ... NomeBacia ... NomeBacia ... categorizada em condição de ROTULO"
  // Como o texto SGB encadeia múltiplas bacias antes de UM rótulo, processamos
  // por SEGMENTOS terminados em rótulo.
  const segmentos = sec.split(/(?=\bcaracterizad[ao]s?\s+em\s+condi[çc][ãa]o\s+de|consideradas?\s+em\s+condi[çc][ãa]o\s+de)/i);

  for (const seg of segmentos) {
    let categoria: -3|-2|-1|0|1|2|3 | null = null;
    let rotuloEncontrado = "";
    // Encontra o rótulo (mais específico primeiro — array ordenado do mais ao menos específico)
    for (const r of ROTULOS_ANOMALIA) {
      if (r.regex.test(seg)) {
        categoria = r.categoria;
        rotuloEncontrado = r.rotulo;
        break;
      }
    }
    if (categoria == null) continue;

    // Identifica as bacias mencionadas neste segmento
    const baciasSegm = new Set<string>();
    for (const bacia of BACIAS_SGB) {
      const re = new RegExp(`\\b${bacia.replace(/[ç]/g, "[çc]").replace(/[ãa]/g, "[ãa]")}\\b`, "i");
      if (re.test(seg)) {
        // Normaliza o nome (sem acento)
        const normal = bacia
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "");
        baciasSegm.add(normal);
      }
    }

    for (const bacia of baciasSegm) {
      if (out.find((a) => a.bacia === bacia)) continue;  // dedupe
      out.push({ bacia, categoria, rotulo: rotuloEncontrado });
    }
  }

  return out;
}

// ─── C) Seção 6 — Previsões 2° Alerta de Cheias ─────────────────────────────

/**
 * Captura as 4 previsões da Seção 6.
 *
 * Estratégia: corta a Seção 6, depois quebra em blocos por estação (cada
 * bloco começa com "Para CIDADE," ou "Em CIDADE," e vai até o próximo).
 * Cada bloco é processado individualmente com regex mais simples.
 *
 * Variantes a tolerar:
 *   - "Para Manaus" / "Em Parintins"  (prefixo)
 *   - "de aproximadamente 28,23 m" / "aproximado de 13,73 m"  (valor central)
 *   - "variando entre X e Y" / "de X a Y"  (faixa IC80)
 *   - "atingir a cota de inundação em CIDADE (de NN,NN m) é de NN,N%"
 *   - "atingir a cota de inundação (de 14,00 m) é de 17%"  (sem cidade entre)
 */
export function extraiPrevisoes(texto: string): PrevisaoSGB[] {
  const out: PrevisaoSGB[] = [];

  // (1) Recorta Seção 6
  const idx6 = texto.search(/6\.\s*Previs[oõ]es/i);
  if (idx6 < 0) return out;
  const sec6 = texto.slice(idx6, idx6 + 6000);

  // (2) Identifica todos os pontos de início de bloco "Para CIDADE," / "Em CIDADE,"
  // Captura também o nome da cidade.
  const reInicio = /(?:Para|Em)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]{2,30}?)\s*,\s+a\s+(?:primeira\s+)?previs[ãa]o/g;

  type Inicio = { idx: number; chave: string };
  const inicios: Inicio[] = [];
  let m: RegExpExecArray | null;
  while ((m = reInicio.exec(sec6)) !== null) {
    const cidade = m[1].trim().toLowerCase();
    const chave = ALIASES_SGB[cidade];
    if (!chave) continue;
    inicios.push({ idx: m.index, chave });
  }

  // (3) Para cada início, fatia até o próximo (ou fim) e processa
  for (let i = 0; i < inicios.length; i++) {
    const ini = inicios[i];
    const fim = i + 1 < inicios.length ? inicios[i + 1].idx : sec6.length;
    const bloco = sec6.slice(ini.idx, fim);

    // Valor central: "aproximadamente NN,NN m" OU "aproximado de NN,NN m"
    const mCentral = bloco.match(/aproximad[ao](?:mente|s?\s+de)\s+(\d{1,2},\d{1,2})\s*m/i);
    if (!mCentral) continue;
    const central = parsePtNum(mCentral[1]);
    if (central == null) continue;

    // IC80: "entre X e Y" OU "de X a Y" — busca após "intervalo"
    let ic80_min: number | null = null;
    let ic80_max: number | null = null;
    const mIntervalo = bloco.match(/intervalo[^.]{0,80}?\b(?:entre|de)\s+(\d{1,2},\d{1,2})\s+(?:e|a)\s+(\d{1,2},\d{1,2})\s*m/i);
    if (mIntervalo) {
      ic80_min = parsePtNum(mIntervalo[1]);
      ic80_max = parsePtNum(mIntervalo[2]);
    }
    if (ic80_min == null || ic80_max == null) continue;

    // Cota inundação + probabilidade
    let cota_inundacao_m: number | undefined;
    let prob_inundacao: number | undefined;
    const mInund = bloco.match(/cota\s+de\s+inunda[çc][aã]o(?:\s+em\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)?\s*\((?:de\s+)?(\d{1,2},\d{1,2})\s*m\)[^.]{0,40}?(\d{1,3}(?:,\d{1,2})?)\s*%/i);
    if (mInund) {
      cota_inundacao_m = parsePtNum(mInund[1]) ?? undefined;
      const prob = parsePtNum(mInund[2]);
      if (prob != null) prob_inundacao = prob / 100;
    }

    // Cota severa + probabilidade
    let cota_inundacao_severa_m: number | undefined;
    let prob_inundacao_severa: number | undefined;
    const mSev = bloco.match(/inunda[çc][aã]o\s+severa\s*\((?:de\s+)?(\d{1,2},\d{1,2})\s*m\)[^.]{0,60}?(\d{1,3}(?:,\d{1,2})?)\s*%/i);
    if (mSev) {
      cota_inundacao_severa_m = parsePtNum(mSev[1]) ?? undefined;
      const prob = parsePtNum(mSev[2]);
      if (prob != null) prob_inundacao_severa = prob / 100;
    }

    out.push({
      estacao:                 ini.chave,
      cota_prevista_m:         central,
      ic80_min_m:              ic80_min,
      ic80_max_m:              ic80_max,
      cota_inundacao_m,
      prob_inundacao,
      cota_inundacao_severa_m,
      prob_inundacao_severa,
    });
  }
  return out;
}

// ─── Orquestrador ────────────────────────────────────────────────────────────

export async function parseBoletimSGB(buffer: Buffer): Promise<BoletimSGB> {
  // pdf-parse v2 usa classe PDFParse (não mais função default).
  const { PDFParse } = await import("pdf-parse");

  let texto = "";
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    texto = normaliza(result.text ?? "");
  } catch (e) {
    return {
      numero:      null,
      data:        new Date().toISOString().split("T")[0],
      estacoes:    [],
      previsoes:   [],
      anomalias_pp: [],
      texto_bruto: "",
      erro:        `Falha ao ler PDF: ${e instanceof Error ? e.message : String(e)}`,
      confiabilidade: { estacoes_resumo: 0, narrativa_variacao: 0, previsoes: 0, anomalias_pp: 0 },
    };
  }

  const dataBol     = extraiDataSGB(texto);
  const numeroBol   = extraiNumeroSGB(texto);

  const resumo      = extraiResumo(texto);
  const variacoes   = extraiVariacoes(texto);
  const previsoes   = extraiPrevisoes(texto);
  const anomaliasPP = extraiAnomaliasPP(texto);

  // Mescla: resumo é fonte primária; variações enriquecem com variação_semanal
  // (e estações não cobertas pelo resumo entram como `fonte: "narrativa"`).
  const porEstacao = new Map<string, EstacaoCotaSGB>();
  for (const e of resumo) porEstacao.set(e.estacao, e);
  for (const [chave, dv] of variacoes) {
    if (porEstacao.has(chave)) {
      porEstacao.get(chave)!.variacao_semanal_cm = dv;
    } else {
      // Estação só narrada, sem cota no resumo
      porEstacao.set(chave, {
        estacao:              chave,
        rio:                  RIOS_SGB[chave] ?? "",
        cota_cm:              NaN, // marcador — cota não veio no boletim
        variacao_semanal_cm:  dv,
        fonte:                "narrativa",
      });
    }
  }

  const estacoes = [...porEstacao.values()];

  // Confiabilidade: razões observadas vs expectativas típicas
  const confiabilidade = {
    estacoes_resumo:    Math.min(1, resumo.length / 3),    // boletim típico tem 3 no resumo
    narrativa_variacao: Math.min(1, variacoes.size / 6),   // ~6 estações narradas
    previsoes:          Math.min(1, previsoes.length / 4), // sempre 4 previsões na Seção 6
    anomalias_pp:       Math.min(1, anomaliasPP.length / 15), // ~15 bacias por boletim
  };

  return {
    numero:      numeroBol,
    data:        dataBol,
    estacoes,
    previsoes,
    anomalias_pp: anomaliasPP,
    texto_bruto: texto.slice(0, 3000),
    erro:        previsoes.length === 0
      ? "Nenhuma previsão extraída — verificar formato do PDF (Seção 6)"
      : undefined,
    confiabilidade,
  };
}
