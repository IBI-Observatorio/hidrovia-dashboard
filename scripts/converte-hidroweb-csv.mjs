// Converte CSV mensal do HidroWeb (Cotas) para formato simples (data,cota_m).
// Prioriza nível 2 (consistido) sobre 1 (bruto) quando ambos existem.
//
// Uso: node scripts/converte-hidroweb-csv.mjs entrada.csv saida.csv

import { readFileSync, writeFileSync } from "node:fs";

const [, , entrada, saida] = process.argv;
if (!entrada || !saida) {
  console.error("Uso: node converte-hidroweb-csv.mjs <entrada.csv> <saida.csv>");
  process.exit(1);
}

const txt = readFileSync(entrada, "latin1"); // HidroWeb usa Latin-1
const linhas = txt.split(/\r?\n/);

// Acha a linha do cabeçalho (começa com "EstacaoCodigo;")
const idxHeader = linhas.findIndex(l => l.startsWith("EstacaoCodigo;"));
if (idxHeader < 0) {
  console.error("Cabeçalho não encontrado");
  process.exit(2);
}

const colunas = linhas[idxHeader].split(";");
const idx = (n) => colunas.indexOf(n);
const iNivel = idx("NivelConsistencia");
const iData  = idx("Data");
const idxCota = [];
for (let d = 1; d <= 31; d++) idxCota.push(idx(`Cota${String(d).padStart(2,"0")}`));

// Acumula por data: { "YYYY-MM-DD": { nivel: 1|2, cota_cm: n } }
// Para cada (ano,mes,dia), prioriza nivel=2.
const dados = new Map();

for (let i = idxHeader + 1; i < linhas.length; i++) {
  const cols = linhas[i].split(";");
  if (cols.length < idxCota[30] + 1) continue;
  const nivel = +cols[iNivel];
  const dataRaw = cols[iData]; // "DD/MM/YYYY"
  const [dd, mm, yyyy] = dataRaw.split("/");
  if (!yyyy) continue;
  const ano  = +yyyy;
  const mes  = +mm;
  if (!ano || !mes) continue;

  for (let dia = 1; dia <= 31; dia++) {
    const raw = cols[idxCota[dia - 1]];
    if (!raw || raw === "") continue;
    const cota_cm = parseFloat(raw.replace(",", "."));
    if (isNaN(cota_cm)) continue;
    const dt = new Date(Date.UTC(ano, mes - 1, dia));
    if (dt.getUTCMonth() + 1 !== mes) continue; // dia inválido (31/abr etc.)
    const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

    const existente = dados.get(iso);
    if (!existente || nivel > existente.nivel) {
      dados.set(iso, { nivel, cota_cm });
    }
  }
}

const ordenado = [...dados.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const out = "data,cota_m\n" + ordenado.map(
  ([iso, { cota_cm }]) => `${iso},${(cota_cm / 100).toFixed(2)}`
).join("\n");

writeFileSync(saida, out);
console.log(`✓ ${saida}: ${ordenado.length} obs (${ordenado[0]?.[0]} → ${ordenado.at(-1)?.[0]})`);
