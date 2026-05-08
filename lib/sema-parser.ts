// Extração de tabela de cotas dos Boletins Diários SEMA-AM (PDF)
// Tabela-alvo: Rio | Localização | Cota atual (cm) | Variação (cm/dia) | Δ vs ano anterior (cm)
// 9 estações: Manaus, Curicuriari, Tabatinga, Tefé, Manacapuru,
//             Itacoatiara, Humaitá, Lábrea, Eirunepé

export interface LeituraBoletim {
  estacao:        string;
  rio:            string;
  cota_cm:        number;
  variacao_cm:    number;
  delta_ano_cm:   number;
}

export interface BoletimSEMA {
  numero:         number | null;
  data:           string; // YYYY-MM-DD
  estacoes:       LeituraBoletim[];
  texto_bruto:    string;
  erro?:          string;
}

// Mapa de variações de nome nos boletins SEMA
const ALIASES: Record<string, string> = {
  "manaus":       "Manaus",
  "curicuriari":  "Curicuriari",
  "curicuriarí":  "Curicuriari",
  "sgc":          "Curicuriari",
  "tabatinga":    "Tabatinga",
  "tefé":         "Tefé",
  "tefe":         "Tefé",
  "manacapuru":   "Manacapuru",
  "itacoatiara":  "Itacoatiara",
  "humaitá":      "Humaitá",
  "humaita":      "Humaitá",
  "lábrea":       "Lábrea",
  "labrea":       "Lábrea",
  "eirunepé":     "Eirunepé",
  "eirunepe":     "Eirunepé",
};

const RIOS: Record<string, string> = {
  "Manaus":      "Rio Negro",
  "Curicuriari": "Negro alto",
  "Tabatinga":   "Rio Solimões",
  "Tefé":        "Rio Solimões",
  "Manacapuru":  "Rio Solimões",
  "Itacoatiara": "Rio Amazonas",
  "Humaitá":     "Rio Madeira",
  "Lábrea":      "Rio Purus",
  "Eirunepé":    "Rio Juruá",
};

// Extrai número (inteiro ou decimal com vírgula/ponto) ou null
function extraiNum(s: string): number | null {
  if (!s) return null;
  const limpo = s.trim().replace(",", ".");
  if (limpo === "-" || limpo === "" || limpo.toLowerCase() === "n/d") return null;
  const n = parseFloat(limpo);
  return isNaN(n) ? null : n;
}

// Tenta extrair a data do boletim a partir do texto
function extraiData(texto: string): string {
  // Padrões: "08/05/2026", "8 de maio de 2026"
  const m1 = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  const meses: Record<string, string> = {
    janeiro:"01", fevereiro:"02", março:"03", abril:"04",
    maio:"05", junho:"06", julho:"07", agosto:"08",
    setembro:"09", outubro:"10", novembro:"11", dezembro:"12",
  };
  const m2 = texto.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (m2) {
    const mes = meses[m2[2].toLowerCase()];
    if (mes) return `${m2[3]}-${mes}-${m2[1].padStart(2, "0")}`;
  }

  return new Date().toISOString().split("T")[0];
}

// Extrai número do boletim
function extraiNumeroBoletim(texto: string): number | null {
  const m = texto.match(/boletim\s+(?:n[°º.]?\s*)?(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

// Estratégia 1: linhas que começam com nome de estação conhecida seguido de números
function parseEstrategia1(linhas: string[]): LeituraBoletim[] {
  const resultados: LeituraBoletim[] = [];

  for (const linha of linhas) {
    const partes = linha.trim().split(/\s{2,}|\t/);
    if (partes.length < 3) continue;

    const chave = partes[0].toLowerCase().trim();
    const nome  = ALIASES[chave];
    if (!nome) continue;

    // Tenta as últimas 3 colunas numéricas como: cota, variacao, delta
    const nums = partes.slice(1).map(extraiNum).filter((n): n is number => n !== null);
    if (nums.length < 1) continue;

    resultados.push({
      estacao:      nome,
      rio:          RIOS[nome] ?? "",
      cota_cm:      nums[0] ?? 0,
      variacao_cm:  nums[1] ?? 0,
      delta_ano_cm: nums[2] ?? 0,
    });
  }
  return resultados;
}

// Estratégia 2: busca linha com nome da estação e captura números nas vizinhas
function parseEstrategia2(texto: string): LeituraBoletim[] {
  const resultados: LeituraBoletim[] = [];

  for (const [alias, nome] of Object.entries(ALIASES)) {
    // Regex: nome seguido de "|", espaços ou tabs, e grupos de números
    const re = new RegExp(
      `${alias}[^\\n]{0,60}?([+-]?\\d{1,5})\\s*[|\\t]\\s*([+-]?\\d{1,4})\\s*[|\\t]\\s*([+-]?\\d{1,5})`,
      "i"
    );
    const m = texto.match(re);
    if (!m) continue;

    if (resultados.find((r) => r.estacao === nome)) continue; // já encontrou

    const cota      = extraiNum(m[1]);
    const variacao  = extraiNum(m[2]);
    const delta_ano = extraiNum(m[3]);
    if (cota === null) continue;

    resultados.push({
      estacao:      nome,
      rio:          RIOS[nome] ?? "",
      cota_cm:      cota,
      variacao_cm:  variacao ?? 0,
      delta_ano_cm: delta_ano ?? 0,
    });
  }
  return resultados;
}

export async function parseBoletimSEMA(buffer: Buffer): Promise<BoletimSEMA> {
  // Importação dinâmica para evitar problemas de SSR
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import("pdf-parse") as any;
  const pdfParse = mod.default ?? mod;

  let texto = "";
  try {
    const data = await pdfParse(buffer);
    texto = data.text;
  } catch (e) {
    return {
      numero:      null,
      data:        new Date().toISOString().split("T")[0],
      estacoes:    [],
      texto_bruto: "",
      erro:        `Falha ao ler PDF: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const dataBol    = extraiData(texto);
  const numeroBol  = extraiNumeroBoletim(texto);
  const linhas     = texto.split("\n");

  let estacoes = parseEstrategia1(linhas);
  if (estacoes.length < 3) {
    estacoes = parseEstrategia2(texto);
  }

  return {
    numero:      numeroBol,
    data:        dataBol,
    estacoes,
    texto_bruto: texto.slice(0, 3000), // guarda trecho para debug
    erro:        estacoes.length < 3
      ? `Apenas ${estacoes.length} estações encontradas — verificar formato do PDF`
      : undefined,
  };
}
