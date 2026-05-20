// Baixa curvas-chave (cota↔vazão) das estações fluviométricas via API ANA.
//
// Cada estação tem N "segmentos" de curva-chave, válidos para diferentes
// faixas de cota. Cada segmento é:
//
//   Q(h) = a * (h - h0)^n            ←  fórmula clássica
//
// Onde:
//   Q  = vazão (m³/s)
//   h  = cota (m)
//   h0 = cota zero da curva (m)
//   a, n = coeficientes ajustados
//
// Uso: node scripts/baixa-curva-chave.mjs [Estacao]

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENDPOINT = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx";

const ESTACOES = {
  Curicuriari: "14320001",
  Humaita:     "15630000",
  PortoVelho:  "15400000",
  Borba:       "15900000",
  Caracarai:   "14710000",
  Serrinha:    "14420000",
  Tapuruquara: "14330000",
  Barcelos:    "14495000",
  Manicore:    "15860000",
  Labrea:      "13880000",
  Abuna:       "15320002",
};

function buildSoap(codEstacao) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HidroCurvaDescarga xmlns="http://MRCS/">
      <codEstacao>${codEstacao}</codEstacao>
      <tipoCurva>1</tipoCurva>
    </HidroCurvaDescarga>
  </soap:Body>
</soap:Envelope>`;
}

async function chamaANA(codEstacao) {
  const soap = buildSoap(codEstacao);
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction":   "http://MRCS/HidroCurvaDescarga",
    },
    body: soap,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

async function main() {
  const alvo = process.argv[2];
  const lista = alvo ? { [alvo]: ESTACOES[alvo] } : ESTACOES;

  const tmpDir = join(ROOT, "tmp_curvas");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir);

  for (const [nome, codigo] of Object.entries(lista)) {
    process.stdout.write(`  ↓ ${nome} (${codigo})... `);
    try {
      const xml = await chamaANA(codigo);
      writeFileSync(join(tmpDir, `${nome}.xml`), xml);
      const segmentos = (xml.match(/<CurvaDescarga\b/g) ?? []).length;
      console.log(`${xml.length} bytes, ${segmentos} segmentos detectados`);
    } catch (e) {
      console.log(`ERRO ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
