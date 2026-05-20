// Testa rapidamente se um código tem dados via SOAP em 2020-2023.
const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

function soap(cod, tipo) {
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

async function teste(cod) {
  for (const tipo of [1, 3]) {
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://MRCS/HidroSerieHistorica" },
      body: soap(cod, tipo),
    });
    const xml = await resp.text();
    const blocos = (xml.match(/<SerieHistorica\b/g) ?? []).length;
    const ex = tipo === 1
      ? xml.match(/<Cota01>([^<]+)<\/Cota01>/)?.[1]
      : xml.match(/<Vazao01>([^<]+)<\/Vazao01>/)?.[1];
    const ult = xml.match(/<DataHora>([^<]+)<\/DataHora>/g)?.slice(-1)[0];
    console.log(`  ${cod} tipo=${tipo === 1 ? 'cota' : 'vazao'} blocos=${blocos.toString().padStart(3)}  exemplo=${ex ?? '—'}  primeiro=${ult ?? '—'}`);
  }
}

const codigos = process.argv.slice(2);
for (const c of codigos) {
  console.log(`\n=== ${c} ===`);
  await teste(c);
  await new Promise(r => setTimeout(r, 1000));
}
