// Verifica nome real de cada estação na ANA via HidroInventario
const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

const CODIGOS = {
  Curicuriari_old:  "14320001",
  Curicuriari_new:  "14330000",
  Manaus:           "14990000",
  Itacoatiara:      "16030000",
  Humaita:          "15630000",
  Manacapuru:       "14100000",
  PortoVelho:       "15400000",
  Borba:            "15900000",
  Caracarai:        "14710000",
  Serrinha:         "14420000",
  Barcelos:         "14495000",
  Manicore:         "15860000",
  Labrea:           "13880000",
  Abuna:            "15320002",
};

function soap(cod) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroInventario xmlns="http://MRCS/">
      <codEstDE>${cod}</codEstDE>
      <codEstATE>${cod}</codEstATE>
      <tpEst></tpEst>
      <nmEst></nmEst>
      <nmRio></nmRio>
      <codSubBacia></codSubBacia>
      <codBacia></codBacia>
      <nmMunicipio></nmMunicipio>
      <nmEstado></nmEstado>
      <sgResp></sgResp>
      <sgOper></sgOper>
      <telemetrica></telemetrica>
    </HidroInventario>
  </soap:Body>
</soap:Envelope>`;
}

async function inv(cod) {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://MRCS/HidroInventario" },
    body: soap(cod),
  });
  const xml = await resp.text();
  const nome = xml.match(/<Nome>([^<]+)<\/Nome>/)?.[1] ?? "(?)";
  const rio  = xml.match(/<RioNome>([^<]+)<\/RioNome>/)?.[1] ?? "(?)";
  const mun  = xml.match(/<MunicipioNome>([^<]+)<\/MunicipioNome>/)?.[1] ?? "(?)";
  return { nome, rio, municipio: mun };
}

console.log("Conferindo códigos contra inventário ANA:\n");
for (const [rotulo, cod] of Object.entries(CODIGOS)) {
  try {
    const info = await inv(cod);
    console.log(`  ${rotulo.padEnd(18)} ${cod}  → ${info.nome.padEnd(28)} | ${info.rio.padEnd(20)} | ${info.municipio}`);
  } catch (e) {
    console.log(`  ${rotulo.padEnd(18)} ${cod}  → ERRO ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 1000));
}
