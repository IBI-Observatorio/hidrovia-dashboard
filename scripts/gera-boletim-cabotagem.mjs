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
//   DASH_API       base da API de produção (default dados.ibi-observatorio.org)
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

// /api/ana repassa direto ao SOAP da ANA, que oscila por minutos (falhas de
// 02/09 e 07/10/2026: todas as estações deram timeout e o relatório abortou).
// Antes de rodar a cadeia, espera a API responder com cota de Manaus — com
// backoff (~15 min no total). Se não voltar, falha com mensagem clara.
const API = process.env.DASH_API ?? "https://dados.ibi-observatorio.org";
async function aguardaAPI() {
  const esperas = [0, 30, 60, 120, 240, 420];   // segundos antes de cada tentativa
  for (const [i, s] of esperas.entries()) {
    if (s) { console.log(`  aguardando ${s}s antes da tentativa ${i + 1}/${esperas.length}...`); await new Promise((ok) => setTimeout(ok, s * 1000)); }
    try {
      const j = await (await fetch(`${API}/api/ana?estacao=Manaus&dias=2`, { signal: AbortSignal.timeout(45000) })).json();
      if (j?.resumo?.cota_m != null) { console.log(`API ANA ok (Manaus ${j.resumo.cota_m} m em ${j.resumo.ultima_data}).`); return; }
      console.warn(`  [API ANA] resposta sem cota: ${JSON.stringify(j).slice(0, 200)}`);
    } catch (e) { console.warn(`  [API ANA] tentativa ${i + 1} falhou: ${e.message}`); }
  }
  throw new Error(`API ANA (${API}/api/ana) indisponível após ${esperas.length} tentativas — boletim não gerado.`);
}
await aguardaAPI();
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
// --no-sandbox: o Chrome aborta no init do zygote ao rodar como root no CI
//   (ZygoteHostImpl::Init → "Aborted"); sem sandbox o headless sobe normal.
// --disable-dev-shm-usage: /dev/shm é minúsculo nos containers do Actions e
//   estoura em páginas maiores. Ambas as flags são inócuas no Windows/local.
run(`"${chrome}" --headless --no-sandbox --disable-dev-shm-usage --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfOut}" "file:///${htmlAbs}"`);
console.log(`\n✓ Boletim pronto: ${pdfOut}\n`);
