// Testa se a API ANA retorna série de vazão (tipoDados=3) para nossas estações.

const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

const ESTACOES = {
  SGC:         "14320001",
  Curicuriari: "14330000",
  Serrinha:    "14420000",
  Moura:       "14840000",
  Caracarai:   "14710000",
  Abuna:       "15320002",
  PortoVelho:  "15400000",
  Humaita:     "15630000",
  Manicore:    "15700000",
  Borba:       "15900000",
  Labrea:      "13870000",
};

function buildSoap(cod, tipo) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroSerieHistorica xmlns="http://MRCS/">
      <codEstacao>${cod}</codEstacao>
      <dataInicio>01/01/2020</dataInicio>
      <dataFim>31/12/2023</dataFim>
      <tipoDados>${tipo}</tipoDados>
      <nivelConsistencia></nivelConsistencia>
    </HidroSerieHistorica>
  </soap:Body>
</soap:Envelope>`;
}

async function teste(nome, cod) {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://MRCS/HidroSerieHistorica" },
    body: buildSoap(cod, 3), // 3 = vazão
  });
  const xml = await resp.text();
  // O esquema usa tags Vazao01..Vazao31
  const blocos = (xml.match(/<SerieHistorica\b/g) ?? []).length;
  const amostraVazao = xml.match(/<Vazao01>([^<]+)<\/Vazao01>/);
  const amostraCota  = xml.match(/<Cota01>([^<]+)<\/Cota01>/);
  console.log(
    `  ${nome.padEnd(13)} blocos=${blocos.toString().padStart(4)}  ` +
    `Vazao01? ${amostraVazao ? amostraVazao[1].padStart(8) : "—"}  ` +
    `Cota01? ${amostraCota ? amostraCota[1].padStart(6) : "—"}`
  );
}

console.log("Testando tipoDados=3 (vazão) em 2020–2023:\n");
for (const [n, c] of Object.entries(ESTACOES)) {
  await teste(n, c);
  await new Promise(r => setTimeout(r, 1000));
}
