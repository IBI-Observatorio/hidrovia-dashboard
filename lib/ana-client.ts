/**
 * Cliente para a API HidroWebService da ANA (REST + OAuth Bearer)
 * Base URL: https://www.ana.gov.br/hidrowebservice
 * Docs:     https://www.ana.gov.br/hidrowebservice/swagger-ui/index.html
 * Spec:     https://www.ana.gov.br/hidrowebservice/api-docs
 *
 * ─── Autenticação ────────────────────────────────────────────
 *   GET /EstacoesTelemetricas/OAUth/v1
 *   Headers: Identificador (CPF/CNPJ) + Senha
 *   Retorna token válido por 60 min → cacheado por 55 min em memória.
 *
 * ─── Telemetria (séries de cota + chuva + vazão) ─────────────
 *   v1 → /HidroinfoanaSerieTelemetricaAdotada/v1  (1 estação por chamada)
 *   v2 → /HidroinfoanaSerieTelemetricaAdotada/v2  (até 10 estações por chamada)
 *
 *   Usamos v2 por padrão (`buscaSerieBatch`). v1 sobrevive como atalho via
 *   `buscaCotaANA` para callers legados.
 *
 *   Headers:  Authorization: Bearer <token>
 *   Params:   Codigos_Estacoes (CSV até 10), Tipo Filtro Data, Range Intervalo de busca
 *
 * ─── Inventário (metadata por estação) ───────────────────────
 *   GET /EstacoesTelemetricas/HidroInventarioEstacoes/v1
 *   Retorna área de drenagem, lat/lon, altitude, operadora, status operacional, etc.
 *
 * ATENÇÃO: a API ANA usa nomes de parâmetros com acentos e espaços
 * ("Código da Estação", "Range Intervalo de busca"). URLSearchParams faz o
 * encoding correto. Não trocar para nomes "limpos" — quebra o backend.
 */

const BASE_URL      = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas";
const TOKEN_TTL_MS  = 55 * 60 * 1000;        // 55min (token expira em 60)
const INVENT_TTL_S  = 86_400;                // 24h de cache no fetch da Next.js
const TELEM_TTL_S   = 21_600;                // 6h
const BATCH_LIMIT   = 10;                    // v2 aceita no máximo 10 códigos por chamada

export const ESTACOES = {
  // Estações de painel (cards visuais no dashboard)
  Manaus:      "14990000",
  Itacoatiara: "16030000",
  SGC:         "14320001", // São Gabriel da Cachoeira (Negro alto). Display: "SGC (Negro alto)"
  Humaita:     "15630000",
  Manacapuru:  "14100000",
  PortoVelho:  "15400000",
  Borba:       "15900000",
  // Estações adicionais usadas apenas pelo IDN (sub-bacias)
  Curicuriari: "14330000", // Rio Negro/Curicuriari
  Caracarai:   "14710000", // Rio Branco
  Serrinha:    "14420000", // Negro médio
  Moura:       "14840000", // Negro médio-baixo (município de Barcelos)
  Manicore:    "15700000", // Madeira médio
  Labrea:      "13870000", // Purus
  Abuna:       "15320002", // Madeira upstream (fronteira BOL)
} as const;

export type EstacaoKey = keyof typeof ESTACOES;

// Inverso de ESTACOES: codigo → chave. Útil para des-mapear respostas batch.
const CODIGO_PARA_CHAVE: Record<string, EstacaoKey> = Object.fromEntries(
  Object.entries(ESTACOES).map(([k, v]) => [v, k as EstacaoKey])
);

// Enum aceito pela API para o param "Range Intervalo de busca"
export type RangeIntervalo =
  | "MINUTO_5" | "MINUTO_10" | "MINUTO_15" | "MINUTO_30"
  | "HORA_1"  | "HORA_2"  | "HORA_3"  | "HORA_6" | "HORA_12" | "HORA_24"
  | "DIAS_2"  | "DIAS_7"  | "DIAS_14" | "DIAS_21" | "DIAS_30";

export interface LeituraANA {
  data:    string;            // ISO: YYYY-MM-DD
  hora:    string;            // HH:MM
  cota_cm: number;
  // Novos campos (v2): retornados pela mesma chamada — antes ignorados
  vazao_m3s:  number | null;  // null se Vazao_Adotada_Status != "0" ou ausente
  chuva_mm:   number | null;  // null se Chuva_Adotada_Status != "0" ou ausente
}

// ─── Cache de token em memória (escopo de módulo) ────────────────────────────
let _cachedToken:   string | null = null;
let _tokenExpiraEm: number = 0;

interface TokenResponse {
  status: string;
  code:   number;
  items:  {
    tokenautenticacao?: string;
    sucesso?:           string;
    retorno?:           string;
  };
}

async function fetchToken(identificador: string, senha: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/OAUth/v1`, {
    method:  "GET",
    headers: {
      "Identificador": identificador,
      "Senha":         senha,
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`ANA OAuth HTTP ${resp.status}`);
  }

  const json: TokenResponse = await resp.json();
  const token = json?.items?.tokenautenticacao;
  if (!token) {
    throw new Error(`ANA OAuth: token ausente. Resposta: ${JSON.stringify(json)}`);
  }
  return token;
}

async function obterToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiraEm) {
    return _cachedToken;
  }

  const identificador = process.env.HIDRO_IDENTIFICADOR;
  const senha         = process.env.HIDRO_SENHA;
  if (!identificador || !senha) {
    throw new Error(
      "Credenciais ANA ausentes. Configure HIDRO_IDENTIFICADOR e HIDRO_SENHA no .env.local"
    );
  }

  // Tenta até 2 vezes — erros 4xx transientes ocorrem na API ANA
  let lastErr: Error = new Error("Falha desconhecida");
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const token = await fetchToken(identificador, senha);
      _cachedToken   = token;
      _tokenExpiraEm = Date.now() + TOKEN_TTL_MS;
      return token;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (tentativa < 2) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

// ─── Resposta da API de série telemétrica ────────────────────────────────────
interface ItemTelemetrico {
  Cota_Adotada:        string;   // cm, ex: "781.00"
  Cota_Adotada_Status: string;   // "0" = ok, "1" = suspeito, "2" = ruim
  Vazao_Adotada:       string;   // m³/s
  Vazao_Adotada_Status:string;
  Chuva_Adotada:       string;   // mm acumulada no intervalo
  Chuva_Adotada_Status:string;
  Data_Hora_Medicao:   string;   // "YYYY-MM-DD HH:mm:ss.S"
  Data_Atualizacao:    string;
  codigoestacao:       string;
}

interface SerieResponse {
  status: string;
  code:   number;
  items:  ItemTelemetrico[];
}

// ─── Helpers internos ────────────────────────────────────────────────────────

// Mapeia número de dias para o enum aceito pela API (param de janela)
function diasParaRange(dias: number): RangeIntervalo {
  if (dias <= 2)  return "DIAS_2";
  if (dias <= 7)  return "DIAS_7";
  if (dias <= 14) return "DIAS_14";
  if (dias <= 21) return "DIAS_21";
  return "DIAS_30";
}

// Parseia um item bruto em LeituraANA. Aplica QC por variável: cota OK é
// requisito (mantém compat com filtro anterior); chuva e vazão entram como
// null se QC ≠ 0 ou ausentes.
function parseItem(it: ItemTelemetrico): LeituraANA | null {
  if (!it.Cota_Adotada || it.Cota_Adotada_Status !== "0") return null;
  const cota_cm = parseFloat(it.Cota_Adotada);
  if (isNaN(cota_cm)) return null;

  const dt        = it.Data_Hora_Medicao ?? "";
  const datePart  = dt.slice(0, 10);
  const timePart  = dt.slice(11, 16) || "00:00";
  if (datePart.length !== 10) return null;

  const vazao_m3s = it.Vazao_Adotada && it.Vazao_Adotada_Status === "0"
    ? (parseFloat(it.Vazao_Adotada) || null)
    : null;
  const chuva_mm = it.Chuva_Adotada && it.Chuva_Adotada_Status === "0"
    ? (parseFloat(it.Chuva_Adotada) || null)
    : null;

  return { data: datePart, hora: timePart, cota_cm, vazao_m3s, chuva_mm };
}

// Quebra um array em pedaços de tamanho `n`.
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ─── Funções públicas: telemetria ────────────────────────────────────────────

/**
 * Busca séries telemétricas (cota + chuva + vazão) para 1..N estações em
 * lotes de até 10 (limite da v2). Retorna um Map codigo → LeituraANA[]
 * ordenado cronologicamente.
 *
 * Esta é a função primária — todas as outras (`buscaCotaANA`, `ultimasLeituras`,
 * `ultimasLeiturasBatch`) chamam esta por baixo.
 */
export async function buscaSerieBatch(
  codigos: string[],
  range: RangeIntervalo = "DIAS_2"
): Promise<Map<string, LeituraANA[]>> {
  if (codigos.length === 0) return new Map();
  const token = await obterToken();
  const resultado = new Map<string, LeituraANA[]>();
  for (const cod of codigos) resultado.set(cod, []); // garante chaves vazias para "não veio"

  for (const grupo of chunk(codigos, BATCH_LIMIT)) {
    const url = new URL(`${BASE_URL}/HidroinfoanaSerieTelemetricaAdotada/v2`);
    url.searchParams.set("Codigos_Estacoes",          grupo.join(","));
    url.searchParams.set("Tipo Filtro Data",          "DATA_LEITURA");
    url.searchParams.set("Range Intervalo de busca",  range);

    const resp = await fetch(url.toString(), {
      method:  "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept":        "application/json",
      },
      next: { revalidate: TELEM_TTL_S },
    });

    if (resp.status === 401) {
      // Token expirou antes do TTL — limpa e propaga para caller retentar
      _cachedToken = null; _tokenExpiraEm = 0;
      throw new Error("ANA: token expirado (401). Renovar e retentar.");
    }
    if (!resp.ok) {
      throw new Error(`ANA HTTP ${resp.status} no batch [${grupo.join(",")}]`);
    }

    const json: SerieResponse = await resp.json();
    if (!json.items?.length) continue;

    for (const it of json.items) {
      const parsed = parseItem(it);
      if (!parsed) continue;
      const arr = resultado.get(it.codigoestacao) ?? [];
      arr.push(parsed);
      resultado.set(it.codigoestacao, arr);
    }
  }

  // Ordena cada série cronologicamente
  for (const [cod, arr] of resultado) {
    arr.sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
    resultado.set(cod, arr);
  }
  return resultado;
}

/**
 * LEGACY: busca série de UMA estação. Mantida para compat com callers
 * existentes (`app/api/ana/route.ts`, etc).
 *
 * O parâmetro de datas é mantido na assinatura por compat, mas a v2 da API
 * usa janelas relativas — convertemos `dataFim - dataInicio` no enum mais
 * próximo. Para janelas custom, use `buscaSerieBatch` diretamente.
 */
export async function buscaCotaANA(
  codEstacao: string,
  dataInicio: string,  // YYYY-MM-DD
  dataFim:    string   // YYYY-MM-DD
): Promise<LeituraANA[]> {
  const msInicio = new Date(dataInicio).getTime();
  const msFim    = new Date(dataFim).getTime();
  const dias     = Math.ceil((msFim - msInicio) / 86_400_000) + 1;
  const range    = diasParaRange(Math.min(dias, 30));
  const mapa     = await buscaSerieBatch([codEstacao], range);
  return mapa.get(codEstacao) ?? [];
}

/** Retorna as últimas N leituras de UMA estação (default 2d, suficiente para variação 24h). */
export async function ultimasLeituras(
  estacao: EstacaoKey,
  diasAtras = 2
): Promise<LeituraANA[]> {
  const mapa = await buscaSerieBatch([ESTACOES[estacao]], diasParaRange(diasAtras));
  return mapa.get(ESTACOES[estacao]) ?? [];
}

/** Versão em lote: busca várias estações com 1 chamada (ou 2 se >10). */
export async function ultimasLeiturasBatch(
  estacoes: EstacaoKey[],
  diasAtras = 2
): Promise<Map<EstacaoKey, LeituraANA[]>> {
  const codigos = estacoes.map((e) => ESTACOES[e]);
  const porCodigo = await buscaSerieBatch(codigos, diasParaRange(diasAtras));
  const porEstacao = new Map<EstacaoKey, LeituraANA[]>();
  for (const e of estacoes) {
    porEstacao.set(e, porCodigo.get(ESTACOES[e]) ?? []);
  }
  return porEstacao;
}

/** Retorna a leitura mais próxima de 09:00 para uma dada data, ou null. */
function leituraMaisProxima09h(leituras: LeituraANA[], data: string): LeituraANA | null {
  const dodia = leituras.filter((l) => l.data === data);
  if (dodia.length === 0) return null;
  const alvo = 9 * 60;
  return dodia.reduce((melhor, l) => {
    const [lh, lm] = l.hora.split(":").map(Number);
    const [mh, mm] = melhor.hora.split(":").map(Number);
    return Math.abs(lh * 60 + lm - alvo) < Math.abs(mh * 60 + mm - alvo) ? l : melhor;
  });
}

/**
 * Calcula resumo de uma série: cota atual (m), variação 24h (cm), chuva
 * acumulada 24h (mm) e vazão atual (m³/s). Retorna null se a série estiver
 * vazia. Os campos chuva/vazão são opcionais — pode vir undefined se a
 * estação não publica essas variáveis.
 *
 * Referência de horário: usa sempre a leitura mais próxima de 09:00 do dia
 * mais recente e compara com a leitura mais próxima de 09:00 do dia anterior,
 * garantindo comparação no mesmo horário.
 */
export function resumeLeituras(leituras: LeituraANA[]): {
  cota_m:                 number;
  variacao_24h:           number;
  ultima_data:            string;
  ultima_hora:            string;
  hora_anterior?:         string; // HH:MM da leitura ≈09:00 do dia anterior
  chuva_mm_acum_24h?:     number;
  vazao_m3s_atual?:       number | null;
} | null {
  if (leituras.length === 0) return null;

  const ultimaData = leituras[leituras.length - 1].data;

  // Leitura de referência: mais próxima de 09:00 no dia mais recente
  const leitura9h = leituraMaisProxima09h(leituras, ultimaData);
  if (!leitura9h) return null;

  const cota_m = +(leitura9h.cota_cm / 100).toFixed(2);

  // Leitura de comparação: mais próxima de 09:00 no dia anterior
  const dtAnterior = new Date(`${ultimaData}T12:00:00Z`);
  dtAnterior.setUTCDate(dtAnterior.getUTCDate() - 1);
  const prefixo = dtAnterior.toISOString().split("T")[0];

  const leituraAntes = leituraMaisProxima09h(leituras, prefixo);
  const variacao_24h = leituraAntes
    ? +(leitura9h.cota_cm - leituraAntes.cota_cm).toFixed(0)
    : 0;

  // Chuva acumulada 24h: soma das leituras válidas com data === ultimaData
  // (cada item já é uma chuva instantânea/acumulada no intervalo de leitura)
  let chuva_mm_acum_24h: number | undefined;
  const chuvasUlt24 = leituras
    .filter((l) => l.data === ultimaData && l.chuva_mm != null)
    .map((l) => l.chuva_mm as number);
  if (chuvasUlt24.length > 0) {
    chuva_mm_acum_24h = +chuvasUlt24.reduce((s, x) => s + x, 0).toFixed(1);
  }

  // Vazão atual: última leitura com vazão válida
  let vazao_m3s_atual: number | null | undefined;
  for (let i = leituras.length - 1; i >= 0; i--) {
    if (leituras[i].vazao_m3s != null) { vazao_m3s_atual = leituras[i].vazao_m3s; break; }
  }

  return { cota_m, variacao_24h, ultima_data: ultimaData, ultima_hora: leitura9h.hora, hora_anterior: leituraAntes?.hora, chuva_mm_acum_24h, vazao_m3s_atual };
}

// ─── Funções públicas: inventário ────────────────────────────────────────────

export interface EstacaoInventario {
  codigo:             string;
  nome:               string;
  bacia_codigo:       string;
  bacia_nome:         string;
  latitude:           number;
  longitude:          number;
  altitude_m:         number | null;
  area_drenagem_km2:  number | null;
  uf:                 string;
  municipio:          string;
  operadora_sigla:    string;
  responsavel_sigla:  string;
  tipo:               string;     // "Fluviometrica" | "Pluviometrica" | ...
  operando:           boolean;
  inicio_telemetrica: string | null;
  ultima_atualizacao: string | null;
}

interface ItemInventario {
  Altitude?:                              string;
  Area_Drenagem?:                         string;
  Bacia_Nome?:                            string;
  Data_Periodo_Telemetrica_Inicio?:       string;
  Data_Ultima_Atualizacao?:               string;
  Estacao_Nome?:                          string;
  Latitude?:                              string;
  Longitude?:                             string;
  Municipio_Nome?:                        string;
  Operadora_Sigla?:                       string;
  Responsavel_Sigla?:                     string;
  UF_Estacao?:                            string;
  codigobacia?:                           string;
  codigoestacao?:                         string;
  Operando?:                              string;
  Tipo_Estacao?:                          string;
}
interface InventarioResponse {
  status: string;
  code:   number;
  items:  ItemInventario[];
}

function parseInventario(it: ItemInventario): EstacaoInventario | null {
  if (!it.codigoestacao) return null;
  const lat = parseFloat(it.Latitude ?? "");
  const lon = parseFloat(it.Longitude ?? "");
  return {
    codigo:             String(it.codigoestacao),
    nome:               it.Estacao_Nome?.trim() ?? "",
    bacia_codigo:       String(it.codigobacia ?? ""),
    bacia_nome:         it.Bacia_Nome?.trim() ?? "",
    latitude:           isNaN(lat) ? 0 : lat,
    longitude:          isNaN(lon) ? 0 : lon,
    altitude_m:         it.Altitude != null && it.Altitude !== "" ? parseFloat(it.Altitude) : null,
    area_drenagem_km2:  it.Area_Drenagem != null && it.Area_Drenagem !== "" ? parseFloat(it.Area_Drenagem) : null,
    uf:                 it.UF_Estacao?.trim() ?? "",
    municipio:          it.Municipio_Nome?.trim() ?? "",
    operadora_sigla:    it.Operadora_Sigla?.trim() ?? "",
    responsavel_sigla:  it.Responsavel_Sigla?.trim() ?? "",
    tipo:               it.Tipo_Estacao?.trim() ?? "",
    operando:           String(it.Operando ?? "") === "1",
    inicio_telemetrica: it.Data_Periodo_Telemetrica_Inicio ?? null,
    ultima_atualizacao: it.Data_Ultima_Atualizacao ?? null,
  };
}

// Cache em memória do inventário (sobrevive entre requests dentro do mesmo
// processo Next.js; o Next também cacheia a chamada fetch por 24h).
let _inventCache: { items: EstacaoInventario[]; expiraEm: number } | null = null;
const INVENT_MEM_TTL_MS = 60 * 60 * 1000; // 1h em memória; o fetch revalida 24h

/**
 * Busca o inventário completo de estações. A API exige ao menos um filtro
 * (Código da Estação, Código da Bacia ou UF) — passe `codigoBacia: 1` para
 * a Bacia Amazônica Ocidental, ou `codigoEstacao` para uma estação específica.
 *
 * Default: Bacia 1 (Amazonas). Resultado cacheado em memória 1h e no fetch 24h.
 */
export async function buscaInventario(opts: {
  codigoBacia?:   number;
  codigoEstacao?: number;
  uf?:            string;
} = {}): Promise<EstacaoInventario[]> {
  const isDefault = !opts.codigoEstacao && !opts.uf && (opts.codigoBacia == null || opts.codigoBacia === 1);
  if (isDefault && _inventCache && Date.now() < _inventCache.expiraEm) {
    return _inventCache.items;
  }

  const token = await obterToken();
  const url = new URL(`${BASE_URL}/HidroInventarioEstacoes/v1`);
  if (opts.codigoEstacao != null) {
    url.searchParams.set("Código da Estação", String(opts.codigoEstacao));
  } else if (opts.uf) {
    url.searchParams.set("Unidade Federativa", opts.uf);
  } else {
    url.searchParams.set("Código da Bacia", String(opts.codigoBacia ?? 1));
  }

  const resp = await fetch(url.toString(), {
    method:  "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept":        "application/json",
    },
    next: { revalidate: INVENT_TTL_S },
  });

  if (resp.status === 401) {
    _cachedToken = null; _tokenExpiraEm = 0;
    throw new Error("ANA Inventário: token expirado (401).");
  }
  if (!resp.ok) throw new Error(`ANA Inventário HTTP ${resp.status}`);

  const json: InventarioResponse = await resp.json();
  const items = (json.items ?? [])
    .map(parseInventario)
    .filter((x): x is EstacaoInventario => x !== null);

  if (isDefault) {
    _inventCache = { items, expiraEm: Date.now() + INVENT_MEM_TTL_MS };
  }
  return items;
}

/**
 * Busca o inventário das estações listadas, retornando um Map codigo →
 * metadados. Tenta primeiro o inventário da Bacia Amazonas (que cobre a
 * maioria das nossas) e, para as que não vieram (ex: estações na Bacia do
 * Branco), faz fallback por código individual.
 */
export async function buscaInventarioEstacoes(
  codigos: string[]
): Promise<Map<string, EstacaoInventario>> {
  const inv = await buscaInventario({ codigoBacia: 1 });
  const wanted = new Set(codigos);
  const mapa = new Map<string, EstacaoInventario>();
  for (const e of inv) if (wanted.has(e.codigo)) mapa.set(e.codigo, e);

  // Fallback individual para o que não veio na bacia 1
  for (const cod of codigos) {
    if (mapa.has(cod)) continue;
    try {
      const lista = await buscaInventario({ codigoEstacao: +cod });
      if (lista[0]) mapa.set(cod, lista[0]);
    } catch { /* ignora — estação simplesmente fica sem metadata */ }
  }
  return mapa;
}

// Helper: mapeia chaves do dashboard para metadata da estação
export async function buscaInventarioPorChave(
  chaves: EstacaoKey[]
): Promise<Partial<Record<EstacaoKey, EstacaoInventario>>> {
  const codigos = chaves.map((c) => ESTACOES[c]);
  const porCodigo = await buscaInventarioEstacoes(codigos);
  const out: Partial<Record<EstacaoKey, EstacaoInventario>> = {};
  for (const c of chaves) {
    const inv = porCodigo.get(ESTACOES[c]);
    if (inv) out[c] = inv;
  }
  return out;
}

// Re-export do mapa codigo→chave para uso externo (debug/admin)
export { CODIGO_PARA_CHAVE };
