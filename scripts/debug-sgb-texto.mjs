// Dump do texto da Seção 6 e do parágrafo de variações
import { readFileSync } from "node:fs";
const buf = readFileSync(process.argv[2] ?? "C:/Users/bruno/Downloads/20260519_17-20260519 - 174421.pdf");
const { PDFParse } = await import("pdf-parse");
const p = new PDFParse({ data: new Uint8Array(buf) });
const r = await p.getText();
await p.destroy();
const t = r.text;

console.log("\n══════ SEÇÃO 6 PREVISÕES ═══════");
const idx6 = t.search(/6\.\s*Previs/i);
console.log(t.slice(idx6, idx6 + 3000));

console.log("\n══════ COMPORTAMENTO DAS ESTAÇÕES ═══════");
const idxC = t.search(/Comportamento das esta/i);
console.log(t.slice(idxC, idxC + 2500));
