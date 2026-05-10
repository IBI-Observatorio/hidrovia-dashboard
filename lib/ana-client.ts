export const ESTACOES = {
  Manaus:      "14990000",
  Itacoatiara: "16030000",
  Curicuriari: "14320001",
  Humaita:     "15630000",
  Manacapuru:  "14100000",
  PortoVelho:  "15400000",
  Borba:       "15900000",
} as const;

export type EstacaoKey = keyof typeof ESTACOES;

export interface LeituraANA {
  data: string;   // ISO: YYYY-MM-DD
  hora: string;   // HH:MM
  cota_cm: number;
}

function buildSoap(codEstacao: string, dataInicio: string, dataFim: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <DadosHidrometeorologicos xmlns="http://MRCS/">
      <codEstacao>${codEstacao}</codEstacao>
      <dataInicio>${dataInicio}</dataInicio>
      <dataFim>${dataFim}</dataFim>
    </DadosHidrometeorologicos>
  </soap:Body>
</soap:Envelope>`;
}

// Extrai leituras do XML retornado pela API ANA (DataSet DiffGram)
function parseANAXML(xml: string): LeituraANA[] {
  const resultados: LeituraANA[] = [];

  // A API retorna blocos <DadosHidrometereologicos> com <DataHora> e <Nivel>
  const blocos = xml.match(/<DadosHidrometere[^>]*>([\s\S]*?)<\/DadosHidrometere[^>]*>/g) ?? [];

  for (const bloco of blocos) {
    const nivel = bloco.match(/<Nivel>([\d.]+)<\/Nivel>/)?.[1];
    if (!nivel) continue;

    // DataHora: "2026-05-07 08:00:00 "
    const dataHora = bloco.match(/<DataHora>([^<]+)<\/DataHora>/)?.[1]?.trim() ?? "";
    const dataPart = dataHora.slice(0, 10); // "YYYY-MM-DD"
    const horaPart = dataHora.slice(11, 16) || "00:00"; // "HH:MM"

    if (!dataPart || dataPart.length < 10) continue;

    resultados.push({
      data:    dataPart,
      hora:    horaPart,
      cota_cm: parseFloat(nivel),
    });
  }

  // Ordena por data/hora crescente
  return resultados.sort((a, b) =>
    `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`)
  );
}

function toDD_MM_YYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function buscaCotaANA(
  codEstacao: string,
  dataInicio: string, // YYYY-MM-DD
  dataFim: string     // YYYY-MM-DD
): Promise<LeituraANA[]> {
  const soap = buildSoap(
    codEstacao,
    toDD_MM_YYYY(dataInicio),
    toDD_MM_YYYY(dataFim)
  );

  const resp = await fetch("https://telemetriaws1.ana.gov.br/ServiceANA.asmx", {
    method:  "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction":   "http://MRCS/DadosHidrometeorologicos",
    },
    body: soap,
    // Cache 6h no servidor — não sobrecarrega a API
    next: { revalidate: 21600 },
  });

  if (!resp.ok) throw new Error(`ANA HTTP ${resp.status}`);

  const xml = await resp.text();
  return parseANAXML(xml);
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
