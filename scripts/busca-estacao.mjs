// Busca estações no inventário ANA por nome (HidroInventario com nmEst).
// Uso: node scripts/busca-estacao.mjs "BARCELOS"

const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

function soap(nmEst) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroInventario xmlns="http://MRCS/">
      <codEstDE></codEstDE>
      <codEstATE></codEstATE>
      <tpEst>1</tpEst>
      <nmEst>${nmEst}</nmEst>
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

async function busca(nmEst) {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://MRCS/HidroInventario" },
    body: soap(nmEst),
  });
  const xml = await resp.text();

  // Cada estação vem em <Table>
  const blocos = xml.match(/<Table\b[^>]*>([\s\S]*?)<\/Table>/g) ?? [];
  return blocos.map((b) => ({
    codigo:    b.match(/<Codigo>([^<]+)<\/Codigo>/)?.[1] ?? "?",
    nome:      b.match(/<Nome>([^<]+)<\/Nome>/)?.[1] ?? "?",
    rio:       b.match(/<RioNome>([^<]+)<\/RioNome>/)?.[1] ?? "?",
    municipio: b.match(/<nmMunicipio>([^<]+)<\/nmMunicipio>/)?.[1]
            ?? b.match(/<MunicipioNome>([^<]+)<\/MunicipioNome>/)?.[1] ?? "?",
    operadora: b.match(/<Operadora>([^<]+)<\/Operadora>/)?.[1] ?? "?",
    bacia:     b.match(/<BaciaNome>([^<]+)<\/BaciaNome>/)?.[1] ?? "?",
    area:      b.match(/<AreaDrenagem>([^<]+)<\/AreaDrenagem>/)?.[1] ?? "?",
    inicio:    b.match(/<UltimaAtualizacao>([^<]+)<\/UltimaAtualizacao>/)?.[1] ?? "?",
  }));
}

const termos = process.argv.slice(2).length ? process.argv.slice(2)
  : ["BARCELOS", "MANICORE", "LABREA"];

for (const t of termos) {
  console.log(`\n=== "${t}" ===`);
  try {
    const lista = await busca(t);
    if (lista.length === 0) console.log("  (nenhum resultado)");
    for (const e of lista) {
      console.log(`  ${e.codigo}  ${e.nome.padEnd(30)}  ${e.rio.padEnd(20)}  ${e.municipio}`);
    }
  } catch (e) {
    console.log("  ERRO:", e.message);
  }
  await new Promise(r => setTimeout(r, 1200));
}
