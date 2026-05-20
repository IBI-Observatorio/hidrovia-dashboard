// Orquestrador de atualização periódica dos dados do projeto.
//
// Executa em sequência (idempotente):
//   1. Baixa/atualiza CSVs de cota (11 estações)     — scripts/baixa-hidroweb.mjs
//   2. Baixa/atualiza CSVs de vazão (8 estações)     — scripts/baixa-vazao.mjs
//   3. Regenera percentis DOY de cota e vazão        — scripts/gera-percentis-*.mjs
//   4. Recalibra fronteiras GMM                      — scripts/calibra-limiares-idn.mjs
//   5. Recalibra HMM                                 — scripts/calibra-hmm.mjs
//   6. Re-roda bootstrap de incerteza                — scripts/bootstrap-incerteza.mjs
//   7. Regenera série histórica de IDN               — scripts/gera-idn-historico.mjs
//   8. Re-roda PCA                                   — scripts/pca-validacao-pesos.mjs
//
// Por padrão, NÃO sobrescreve CSVs existentes (idempotente, apenas adiciona
// estações novas se houver). Use --force para forçar redownload.
//
// Uso:
//   node scripts/atualiza-dados.mjs              # rota normal
//   node scripts/atualiza-dados.mjs --force      # apaga e rebaixa tudo
//   node scripts/atualiza-dados.mjs --skip-download  # só recalcula derivados
//
// Cadência recomendada: 1× por mês até a API ANA SOAP descontinuar (30/jun/2026).
// Sugestão de calendário:
//   - Dia 5 de cada mês: rodar este script
//   - Validar saída (todos os passos OK)
//   - git diff em lib/ — checar se as fronteiras/percentis estão consistentes
//   - Commit + push se OK

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
  step("1/8 Baixar cotas (HidroSerieHistorica tipoDados=1)",  "node scripts/baixa-hidroweb.mjs");
  step("2/8 Baixar vazões (HidroSerieHistorica tipoDados=3)", "node scripts/baixa-vazao.mjs");
} else {
  console.log("⏭ --skip-download: pulando passos 1 e 2");
}

step("3/8 Regenerar percentis DOY de cota",   "node scripts/gera-percentis-doy.mjs");
step("4/8 Regenerar percentis DOY de vazão",  "node scripts/gera-percentis-vazao-doy.mjs");
step("5/8 Recalibrar fronteiras GMM",         "node scripts/calibra-limiares-idn.mjs");
step("6/8 Recalibrar HMM",                    "node scripts/calibra-hmm.mjs");
step("7/8 Bootstrap de incerteza (N=200)",    "node scripts/bootstrap-incerteza.mjs 200");
step("8/8 Regenerar série histórica do IDN",  "node scripts/gera-idn-historico.mjs");

// PCA opcional — só para validação interna
step("Bônus: PCA de validação de pesos", "node scripts/pca-validacao-pesos.mjs");

const segundos = Math.round((Date.now() - tempoInicio) / 1000);
console.log(`\n${"=".repeat(60)}`);
console.log(`✓ Atualização concluída em ${segundos}s`);
console.log("=".repeat(60));
console.log("\nPróximos passos manuais:");
console.log("  1. Verificar git diff em lib/ — confirmar que mudanças fazem sentido");
console.log("  2. Rodar npm test para sanity check");
console.log("  3. Rodar npm run build para confirmar produção");
console.log("  4. Commit + push se tudo OK");
console.log("\nLembrete: API ANA SOAP descontinua em 30/jun/2026.\n");
