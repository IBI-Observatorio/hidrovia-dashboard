// Orquestrador de atualização periódica dos dados do projeto.
//
// Executa em sequência (idempotente):
//   1. Baixa/atualiza CSVs de cota (11 estações)        — scripts/baixa-hidroweb.mjs
//   2. Baixa/atualiza CSVs de vazão (8 estações)        — scripts/baixa-vazao.mjs
//   3. Regenera percentis DOY de cota                   — scripts/gera-percentis-doy.mjs
//   4. Regenera percentis DOY de vazão                  — scripts/gera-percentis-vazao-doy.mjs
//   5. Recalibra fronteiras GMM                         — scripts/calibra-limiares-idn.mjs
//   6. Recalibra HMM                                    — scripts/calibra-hmm.mjs
//   7. Re-roda bootstrap de incerteza                   — scripts/bootstrap-incerteza.mjs
//   8. Regenera série histórica de IDN                  — scripts/gera-idn-historico.mjs
//   9. Regenera Calendário de Severidade (usa CSVs      — scripts/gera-severity-calendar.mjs
//      atualizados + feed live data/ana-cotas-series.json)
//  10. PCA de validação (opcional)                      — scripts/pca-validacao-pesos.mjs
//
// Fonte única de verdade: CSVs HidroWeb (passos 1-2) + ana-cotas-series.json (feed live).
// Todos os dashboards derivam desses dois — nenhum passo manual extra necessário.
//
// Por padrão, NÃO sobrescreve CSVs existentes (idempotente). Use --force para rebaixar.
//
// Uso:
//   node scripts/atualiza-dados.mjs                  # rota normal
//   node scripts/atualiza-dados.mjs --force          # apaga e rebaixa tudo
//   node scripts/atualiza-dados.mjs --skip-download  # só recalcula derivados
//
// Cadência recomendada: 1× por mês (dia 5 de cada mês).
// Após rodar: git diff lib/ → confirmar → npm test → npm run build → commit + push.

import { spawnSync, execSync } from "node:child_process";
import { existsSync, unlinkSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const flags = new Set(process.argv.slice(2));
const FORCE = flags.has("--force");
const SKIP_DOWNLOAD = flags.has("--skip-download");

function step(nome, comando) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`▶ ${nome}`);
  console.log("=".repeat(60));
  const partes = comando.split(/\s+/);
  const r = spawnSync(partes[0], partes.slice(1), { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\n✗ Passo "${nome}" falhou com código ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

const tempoInicio = Date.now();
console.log(`\nAtualização de dados — início: ${new Date().toISOString()}`);
console.log(`Flags: FORCE=${FORCE} SKIP_DOWNLOAD=${SKIP_DOWNLOAD}\n`);

if (!SKIP_DOWNLOAD) {
  if (FORCE) {
    console.log("⚠ --force: apagando CSVs existentes antes de rebaixar...");
    for (const arq of readdirSync(join(ROOT, "data"))) {
      if (arq.endsWith("_hidroweb.csv") || arq.endsWith("_vazao.csv")) {
        unlinkSync(join(ROOT, "data", arq));
      }
    }
  }
  step(" 1/9 Baixar cotas (HidroSerieHistorica tipoDados=1)",  "node scripts/baixa-hidroweb.mjs");
  step(" 2/9 Baixar vazões (HidroSerieHistorica tipoDados=3)", "node scripts/baixa-vazao.mjs");
} else {
  console.log("⏭ --skip-download: pulando passos 1 e 2");
}

step(" 3/9 Regenerar percentis DOY de cota",         "node scripts/gera-percentis-doy.mjs");
step(" 4/9 Regenerar percentis DOY de vazão",        "node scripts/gera-percentis-vazao-doy.mjs");
step(" 5/9 Recalibrar fronteiras GMM",               "node scripts/calibra-limiares-idn.mjs");
step(" 6/9 Recalibrar HMM",                          "node scripts/calibra-hmm.mjs");
step(" 7/9 Bootstrap de incerteza (N=200)",          "node scripts/bootstrap-incerteza.mjs 200");
step(" 8/9 Regenerar série histórica do IDN",        "node scripts/gera-idn-historico.mjs");
// Passo 9: regenera o ARTEFATO ESTÁTICO do calendário (fallback + tipos).
// Em produção o calendário é servido pela rota /api/severity-calendar, que já
// recalcula sozinha com o feed live. Este passo só atualiza o fallback do build.
step(" 9/9 Regenerar Calendário de Severidade (estático/fallback)", "node scripts/gera-severity-calendar.mjs");

// PCA opcional — só para validação interna
step("Bônus: PCA de validação de pesos", "node scripts/pca-validacao-pesos.mjs");

const segundos = Math.round((Date.now() - tempoInicio) / 1000);
console.log(`\n${"=".repeat(60)}`);
console.log(`✓ Atualização concluída em ${segundos}s`);
console.log("=".repeat(60));
console.log("\nPróximos passos:");
console.log("  1. git diff lib/   → confirmar que percentis/fronteiras fazem sentido");
console.log("  2. npm test        → sanity check");
console.log("  3. npm run build   → confirmar build de produção");
console.log("  4. commit + push   → Railway redeploy atualiza todos os dashboards\n");
console.log("  Calendário de Severidade: já regenerado no passo 9 acima.");
console.log("  Nenhum passo manual adicional necessário.\n");
console.log("Lembrete: API ANA SOAP descontinua em 30/jun/2026.\n");
