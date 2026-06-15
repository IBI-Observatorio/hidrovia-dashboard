// Envia o PDF do boletim de cabotagem por e-mail via Resend.
// Sem dependências (fetch nativo do Node 18+). Lê o PDF, anexa em base64 e
// dispara para a lista de destinatários.
//
//   node scripts/envia-boletim-email.mjs [caminho-do-pdf]
//     default: out/relatorio-cabotagem.pdf
//
// Variáveis de ambiente:
//   RESEND_API_KEY       (obrigatória p/ enviar) — secret do GitHub
//   RESEND_FROM          remetente verificado, ex. "Observatório IBI <boletim@dominio.org>"
//   BOLETIM_RECIPIENTS   destinatários separados por vírgula
//
// Comportamento: se RESEND_API_KEY ou BOLETIM_RECIPIENTS faltarem, faz SKIP
// (exit 0) — assim o pipeline roda na fase "sem e-mail" sem quebrar. Erro de
// envio com tudo configurado → exit 1.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PDF = process.argv[2] ?? join(ROOT, "out/relatorio-cabotagem.pdf");

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM ?? "Observatório IBI <onboarding@resend.dev>";
const RECIPIENTS = (process.env.BOLETIM_RECIPIENTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

if (!API_KEY || RECIPIENTS.length === 0) {
  console.log(`[e-mail] SKIP — ${!API_KEY ? "RESEND_API_KEY ausente" : "BOLETIM_RECIPIENTS vazio"}. Pipeline segue sem enviar.`);
  process.exit(0);
}
if (!existsSync(PDF)) {
  console.error(`[e-mail] ERRO — PDF não encontrado em ${PDF}`);
  process.exit(1);
}

// Data de referência (p/ assunto) — última entrada da série, com fallback à data de hoje.
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function dataRef() {
  try {
    const s = JSON.parse(readFileSync(join(ROOT, "data/boletim-cabotagem-series.json"), "utf8")).serie;
    const iso = s.at(-1)?.data_referencia;
    if (iso) { const [, m, d] = iso.split("-"); return `${d}/${MESES[+m - 1]}`; }
  } catch { /* fallback abaixo */ }
  const d = new Date();
  return `${String(d.getUTCDate()).padStart(2, "0")}/${MESES[d.getUTCMonth()]}`;
}
const ref = dataRef();
const assunto = `Boletim Cabotagem Amazônia — Perspectiva 2026 (atualização ${ref})`;
const corpoHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a2230;line-height:1.5">
  <p>Prezado(a),</p>
  <p>Segue em anexo o <strong>Boletim de Cabotagem Conteinerizada na Amazônia — Perspectiva 2026</strong>,
  com a leitura atualizada de ${ref}: estado do rio, projeção do calado (CMR) e movimentação esperada.</p>
  <p style="color:#5b6676;font-size:12px">Observatório de Infraestrutura de Transportes · IBI —
  <a href="https://ibi-observatorio.org/" style="color:#0099D8">ibi-observatorio.org</a></p>
</div>`;

const pdfB64 = readFileSync(PDF).toString("base64");
const payload = {
  from: FROM,
  to: RECIPIENTS,
  subject: assunto,
  html: corpoHtml,
  attachments: [{ filename: `boletim-cabotagem-${ref.replace("/", "-")}.pdf`, content: pdfB64 }],
};

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const txt = await res.text();
if (!res.ok) {
  console.error(`[e-mail] ERRO Resend ${res.status}: ${txt}`);
  process.exit(1);
}
console.log(`[e-mail] enviado para ${RECIPIENTS.length} destinatário(s) — ${basename(PDF)} (${assunto}). id=${(() => { try { return JSON.parse(txt).id; } catch { return "?"; } })()}`);
