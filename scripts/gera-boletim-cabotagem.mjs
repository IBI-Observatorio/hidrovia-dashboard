// ---------------------------------------------------------------------------
// Orquestrador do boletim "Cabotagem conteinerizada na Amazônia".
// Roda a cadeia inteira em UM comando — ponto de entrada do agente semanal:
//   1. modelo multi-driver (formadores AO VIVO → projeção de CMR)
//   2. calibração calado→carga (CMR → cabotagem)
//   3. monta o HTML na identidade IBI
//   4. renderiza o PDF (Chrome headless)
//
//   node scripts/gera-boletim-cabotagem.mjs
//     -> out/relatorio-cabotagem.pdf
//
// Variáveis de ambiente opcionais:
//   DASH_API       base da API de produção (default Railway)
//   CHROME_BIN     caminho do Chrome/Edge (se o autodetect falhar)
//   BOLETIM_OUT    caminho de saída do PDF (default out/relatorio-cabotagem.pdf)
// ---------------------------------------------------------------------------

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => { console.log("· " + cmd); execSync(cmd, { cwd: ROOT, stdio: "inherit" }); };

function achaChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const cands = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  return cands.find((p) => existsSync(p)) ?? null;
}

console.log("\n=== Boletim Cabotagem — pipeline ===\n");
run("npx --yes tsx scripts/modelo-multidriver-itacoatiara.mts");
run("npx --yes tsx scripts/calibra-cmr-cabotagem.mts");
run("node scripts/gera-relatorio-cabotagem.mjs");
run("node scripts/atualiza-boletim-series.mjs");   // memória semanal (antes do PDF: Chrome falhar não perde o snapshot)

const htmlAbs = join(ROOT, "out/relatorio-cabotagem.html").replace(/\\/g, "/");
const pdfOut = process.env.BOLETIM_OUT ?? join(ROOT, "out/relatorio-cabotagem.pdf");
const chrome = achaChrome();
if (!chrome) {
  console.log("\n⚠ Chrome/Edge não encontrado — HTML pronto em out/relatorio-cabotagem.html; defina CHROME_BIN para gerar o PDF.");
  process.exit(0);
}
run(`"${chrome}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfOut}" "file:///${htmlAbs}"`);
console.log(`\n✓ Boletim pronto: ${pdfOut}\n`);
