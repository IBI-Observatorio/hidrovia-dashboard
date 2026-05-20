/**
 * Cliente para a API HidroWebService da ANA (REST + OAuth Bearer)
 * Base URL: https://www.ana.gov.br/hidrowebservice
 * Docs: https://www.ana.gov.br/hidrowebservice/swagger-ui/index.html
 *
 * Autenticação: GET /EstacoesTelemetricas/OAUth/v1
 *   Headers: Identificador (CPF/CNPJ) + Senha
 *   Retorna token válido por 60 min → cacheado por 55 min
 *
 * Dados: GET /EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1
 *   Headers: Authorization: Bearer <token>
 *   Params:  CodigoDaEstacao, TipoFiltroData, RangeIntervaloDeBusca
 */

const BASE_URL = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas";
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutos (token expira em 60)

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

export interface LeituraANA {
  data: string;   // ISO: YYYY-MM-DD
  hora: string;   // HH:MM
  cota_cm: number;
}

// ─── Cache de token em memória (escopo de módulo) ────────────────────────────
let _cachedToken: string | null = null;
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
  // Reutiliza token em cache se ainda válido
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

  // Tenta até 2 vezes (erros 4xx transientes são comuns na API ANA)
  let lastErr: Error = new Error("Falha desconhecida");
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const token = await fetchToken(identificador, senha);
      _cachedToken   = token;
      _tokenExpiraEm = Date.now() + TOKEN_TTL_MS;
      return token;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (tentativa < 2) {
        // Aguarda 1s antes de tentar novamente
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  throw lastErr;
}

// ─── Resposta da API de série telimétrica ─────────────────────────────────────
interface ItemTelemetrico {
  Cota_Adotada:        string;   // cm, ex: "781.00"
  Cota_Adotada_Status: string;   // "0" = ok, "1" = suspeito, "2" = ruim
  Vazao_Adotada:       string;
  Data_Hora_Medicao:   string;   // "YYYY-MM-DD HH:mm:ss.S"
  Data_Atualizacao:    string;
  codigoestacao:       string;
}

interface SerieResponse {
  status: string;
  code:   number;
  items:  ItemTelemetrico[];
}

// ─── Funções públicas ─────────────────────────────────────────────────────────

// Mapeia número de dias para o enum aceito pela API
// Valores válidos: DIAS_2, DIAS_7, DIAS_14, DIAS_21, DIAS_30
function diasParaEnum(dias: number): string {
  if (dias <= 2)  return "DIAS_2";
  if (dias <= 7)  return "DIAS_7";
  if (dias <= 14) return "DIAS_14";
  if (dias <= 21) return "DIAS_21";
  return "DIAS_30";
}

export async function buscaCotaANA(
  codEstacao: string,
  dataInicio: string, // YYYY-MM-DD (usado para calcular range — API usa enum de dias)
  dataFim:    string  // YYYY-MM-DD
): Promise<LeituraANA[]> {
  const token = await obterToken();

  const msInicio = new Date(dataInicio).getTime();
  const msFim    = new Date(dataFim).getTime();
  const dias     = Math.ceil((msFim - msInicio) / 86400000) + 1;
  const range    = diasParaEnum(Math.min(dias, 30));

  // ATENÇÃO: a API usa nomes de parâmetros com acentos e espaços.
  // URLSearchParams faz o encoding correto (ex: "Código da Estação" → "C%C3%B3digo+da+Esta%C3%A7%C3%A3o")
  const url = new URL(`${BASE_URL}/HidroinfoanaSerieTelemetricaAdotada/v1`);
  url.searchParams.set("Código da Estação",      codEstacao);
  url.searchParams.set("Tipo Filtro Data",        "DATA_LEITURA");
  url.searchParams.set("Range Intervalo de busca", range);

  const resp = await fetch(url.toString(), {
    method:  "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept":        "application/json",
    },
    // Cache de 6h no servidor Next.js — não sobrecarrega a API
    next: { revalidate: 21600 },
  });

  if (resp.status === 401) {
    // Token expirou antes do esperado — limpa cache e lança para o caller retentar
    _cachedToken   = null;
    _tokenExpiraEm = 0;
    throw new Error("ANA: token expirado (401). Tentando renovar na próxima chamada.");
  }

  if (!resp.ok) throw new Error(`ANA HTTP ${resp.status} para estação ${codEstacao}`);

  const json: SerieResponse = await resp.json();

  if (!json.items || json.items.length === 0) return [];

  return json.items
    .filter((it) => it.Cota_Adotada && it.Cota_Adotada_Status === "0") // só leituras OK
    .map((it) => {
      const dt      = it.Data_Hora_Medicao ?? "";
      const datePart = dt.slice(0, 10);           // "YYYY-MM-DD"
      const timePart = dt.slice(11, 16) || "00:00"; // "HH:MM"
      return {
        data:    datePart,
        hora:    timePart,
        cota_cm: parseFloat(it.Cota_Adotada),
      };
    })
    .filter((l) => l.data.length === 10 && !isNaN(l.cota_cm))
    .sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
}

// Retorna as últimas N leituras de uma estação (padrão: 2 dias para obter variação 24h)
export async function ultimasLeituras(
  estacao: EstacaoKey,
  diasAtras = 2
): Promise<LeituraANA[]> {
  const hoje  = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diasAtras);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return buscaCotaANA(ESTACOES[estacao], fmt(inicio), fmt(hoje));
}

// Calcula cota atual (m) e variação 24h (cm) a partir das leituras
export function resumeLeituras(leituras: LeituraANA[]): {
  cota_m:       number;
  variacao_24h: number;
  ultima_data:  string;
} | null {
  if (leituras.length === 0) return null;

  const ultima  = leituras[leituras.length - 1];
  const cota_m  = +(ultima.cota_cm / 100).toFixed(2);

  // Tenta encontrar leitura ~24h antes (mesmo horário, dia anterior)
  const dataAnterior = new Date(`${ultima.data}T12:00:00`);
  dataAnterior.setDate(dataAnterior.getDate() - 1);
  const prefixo = dataAnterior.toISOString().split("T")[0];

  const leituraAntes = leituras.filter((l) => l.data === prefixo).pop()
    ?? leituras[0];

  const variacao_24h = +(ultima.cota_cm - leituraAntes.cota_cm).toFixed(0);

  return { cota_m, variacao_24h, ultima_data: ultima.data };
}
