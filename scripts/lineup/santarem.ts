// scripts/lineup/santarem.ts
// Line-up de Santarém / Miritituba — pilar F do Arco Norte (PARCIAL).
//
// SITUAÇÃO HONESTA: os terminais graneleiros de Santarém (Cargill) e
// Miritituba (Hidrovias do Brasil e outros) são PRIVADOS e não publicam
// programação de navios aberta e confiável. REGRA DURA: NÃO inventar dado.
// Este script existe para manter o schema e marcar a lacuna explicitamente:
// escreve status "indisponivel" e o agregador do corredor calcula o F com
// os portos disponíveis (EMAP + CDP), rotulando "parcial" na UI.
//
// TODO (destravar Santarém):
//   1. Line-up consolidado da praticagem ZP-01/Fazendinha (verificar acesso);
//   2. Pedido formal de dados à Cargill/HBSA (convênio IBI);
//   3. AIS comercial como proxy de fila (exige licença — avaliar custo).
//
// Execução: npx tsx scripts/lineup/santarem.ts

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "lineup", "santarem.json");

function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
  writeFileSync(ARQ_SAIDA, JSON.stringify({
    fonte: "Santarém / Miritituba — terminais privados (Cargill, Hidrovias do Brasil)",
    url: null, porto: "santarem", coletadoEm: hoje,
    status: "indisponivel" as const,
    erro: "Sem programação de navios pública confiável: os terminais privados de Santarém (Cargill) e Miritituba não publicam line-up aberto. NÃO inventar dado.",
    todo: "Avaliar: (1) line-up consolidado de praticagem da ZP-01/Fazendinha; (2) pedido formal de acesso à Cargill/HBSA; (3) AIS comercial como proxy (licença). Até lá, F do Arco Norte agrega só EMAP + CDP, rotulado parcial na UI.",
    snapshots: [],
  }, null, 1) + "\n");
  console.log("[lineup-santarem] INDISPONÍVEL (esperado) — lacuna documentada, F do corredor fica parcial");
}
main();
