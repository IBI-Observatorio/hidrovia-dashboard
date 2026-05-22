// Calibra percentis MENSAIS de variação 7d positiva em Caracaraí.
// Substitui o limiar global P85=1.40m por uma curva sazonal P85[mes] e P95[mes].
//
// Saída: lib/onda-branco-percentis.ts

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const linhas = readFileSync(join(ROOT, "data", "caracarai_hidroweb.csv"), "utf-8").trim().split("\n");
const serie = linhas.slice(1).map((l) => {
  const [data, cota] = l.split(",");
  return { data, cota_m: parseFloat(cota) };
}).filter((p) => !isNaN(p.cota_m));

console.log(`Série Caracaraí: ${serie.length} obs`);

// Variação 7d ao longo da série
const variacoes = [];
for (let i = 7; i < serie.length; i++) {
  const dt = new Date(serie[i].data + "T00:00:00Z");
  const v = serie[i].cota_m - serie[i - 7].cota_m;
  variacoes.push({ data: serie[i].data, mes: dt.getUTCMonth() + 1, var_m: v });
}

// Agrupa por mês — só variações POSITIVAS (subidas)
const porMes = Array.from({ length: 13 }, () => []);
for (const v of variacoes) {
  if (v.var_m > 0) porMes[v.mes].push(v.var_m);
}

function quantil(arr, q) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
}

// P85 e P95 por mês (índices 1..12)
const p85 = [null];
const p95 = [null];
for (let m = 1; m <= 12; m++) {
  const g = porMes[m];
  p85.push(g.length > 10 ? +quantil(g, 0.85).toFixed(2) : null);
  p95.push(g.length > 10 ? +quantil(g, 0.95).toFixed(2) : null);
}

const MES_NOME = ["", "jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
console.log("\nMês | P85 (m/7d) | P95 (m/7d) | n positivos");
for (let m = 1; m <= 12; m++) {
  console.log(`  ${MES_NOME[m]} |    ${p85[m] ?? "—"}    |    ${p95[m] ?? "—"}    | ${porMes[m].length}`);
}

const ts = `// AUTO-GERADO por scripts/calibra-onda-branco-doy.mjs em ${new Date().toISOString()}
// Percentis MENSAIS de variação 7d positiva em Caracaraí (Rio Branco) 2016-2025.
// P85 e P95 por mês [1..12]. Substitui limiares globais (que sobreestimavam
// risco em mai-jul, quando o ciclo natural é subida, e subestimavam em
// nov-jan quando subidas são raras e indicam evento atípico).

export const ONDA_BRANCO_PERCENTIS_MES = {
  // Variação 7d em metros — só positivos (subidas)
  p85: ${JSON.stringify(p85)},
  p95: ${JSON.stringify(p95)},
  // Globais (para fallback quando série mensal insuficiente)
  p85_global: 1.40,
  p95_global: 2.09,
} as const;
`;

writeFileSync(join(ROOT, "lib", "onda-branco-percentis.ts"), ts, "utf-8");
console.log(`\n✓ Gerado lib/onda-branco-percentis.ts`);
