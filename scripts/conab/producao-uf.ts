// scripts/conab/producao-uf.ts
// Extrai a PRODUÇÃO (mil t) de SOJA e MILHO por UF do último Acompanhamento
// da Safra Brasileira de Grãos da Conab (cadência MENSAL, por levantamento).
//
// Fonte: Conab — Acompanhamento da Safra Brasileira de Grãos.
//   Em vez de raspar o e-book PDF, usamos a série aberta equivalente do
//   Portal de Informações (LevantamentoGraos.txt), que publica EXATAMENTE
//   os números do boletim, por levantamento — mesma origem, formato estável.
//   PDF do boletim: gov.br/conab/.../boletim-da-safra-de-graos (versão editorial)
// Licença: reprodução sem fins lucrativos autorizada com citação da fonte.
//
// Saída: data/conab/producao-uf.json (cache mensal)
//   registros: [anoAgricola "AA/AA", safraTipo "1"|"2"|"3"|"U", uf, "M"|"S", producaoMilT]
//
// HEALTHCHECK isolado: valida o cabeçalho do arquivo; se a estrutura mudar,
// marca status "indisponivel" preservando o último cache bom (sem interpolar).
//
// Execução: node --experimental-strip-types scripts/conab/producao-uf.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "conab", "producao-uf.json");

const URL_TXT = "https://portaldeinformacoes.conab.gov.br/downloads/arquivos/LevantamentoGraos.txt";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };

const CABECALHO_ESPERADO =
  "ano_agricola;safra;uf;produto;id_produto;id_levantamento;dsc_levantamento;area_plantada_mil_ha;producao_mil_t";

/** União das hinterlândias dos corredores (Santos, Paranaguá, Arco Norte). */
const UFS = ["SP", "MG", "GO", "MS", "MT", "PR", "SC", "PA", "TO", "RO", "MA"];

/** Anos agrícolas mantidos no cache (histórico p/ percentil + corrente). */
const ANOS = ["2022/23", "2023/24", "2024/25", "2025/26"];

function cacheAnterior(): unknown | null {
  try { return JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { return null; }
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(URL_TXT, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status} no LevantamentoGraos.txt`);
    // Conab serve em latin1 — decodificar explicitamente.
    const texto = new TextDecoder("latin1").decode(await r.arrayBuffer());
    const linhas = texto.split("\n");

    // HEALTHCHECK: cabeçalho precisa bater com o layout conhecido.
    if (!linhas[0]?.trim().startsWith(CABECALHO_ESPERADO)) {
      throw new Error(`cabeçalho inesperado: "${linhas[0]?.slice(0, 90)}" — layout mudou?`);
    }

    // 1º passe: maior levantamento por ano agrícola (soja/milho).
    const maxLev: Record<string, number> = {};
    interface Linha { ano: string; saf: string; uf: string; p: string; lev: number; prod: number }
    const brutas: Linha[] = [];
    for (const ln of linhas.slice(1)) {
      const c = ln.split(";");
      if (c.length < 9) continue;
      const ano = c[0].trim(), p = c[3].trim();
      if (!ANOS.includes(ano) || (p !== "SOJA" && p !== "MILHO")) continue;
      const lev = parseInt(c[5], 10);
      if (!Number.isFinite(lev)) continue;
      if (!maxLev[ano] || lev > maxLev[ano]) maxLev[ano] = lev;
      brutas.push({ ano, saf: c[1].trim(), uf: c[2].trim(), p, lev, prod: parseFloat(c[8]) });
    }
    if (brutas.length === 0) throw new Error("nenhuma linha de SOJA/MILHO encontrada — layout mudou?");

    // 2º passe: só o último levantamento de cada ano; UFs das hinterlândias.
    const registros: (string | number)[][] = [];
    const totaisBR: Record<string, Record<string, number>> = {};
    for (const b of brutas) {
      if (b.lev !== maxLev[b.ano]) continue;
      (totaisBR[b.ano] ??= {})[b.p] = +(((totaisBR[b.ano]?.[b.p] ?? 0) + b.prod)).toFixed(1);
      if (!UFS.includes(b.uf) || b.prod <= 0) continue;
      const tipo = /^1/.test(b.saf) ? "1" : /^2/.test(b.saf) ? "2" : /^3/.test(b.saf) ? "3" : "U";
      registros.push([b.ano.slice(2), tipo, b.uf, b.p === "MILHO" ? "M" : "S", +b.prod.toFixed(1)]);
    }

    const cache = {
      fonte: "Conab — Acompanhamento da Safra Brasileira de Grãos (série Estimativa Grãos / LevantamentoGraos, Portal de Informações Agropecuárias)",
      url: URL_TXT,
      licenca: "Reprodução sem fins lucrativos autorizada com citação da fonte (Portal de Informações Conab)",
      coletadoEm: hoje,
      status: "ok" as const,
      unidade: "mil t",
      levantamentoUsado: Object.fromEntries(ANOS.filter((a) => maxLev[a]).map((a) => [a, maxLev[a]])),
      formato: "[anoAgricola, safraTipo (1|2|3|U), uf, cultura (M=milho, S=soja), producaoMilT]",
      observacao: "Último levantamento disponível por ano agrícola. UFs = união das hinterlândias dos corredores (Santos, Paranaguá, Arco Norte). O e-book PDF do boletim é a versão editorial do mesmo levantamento.",
      totaisBR,
      registros,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[producao-uf] OK — ${registros.length} registros · levantamentos ${JSON.stringify(cache.levantamentoUsado)}`);
  } catch (e) {
    const anterior = cacheAnterior();
    const cache = {
      ...((anterior as object) ?? { registros: [] }),
      url: URL_TXT,
      coletadoEm: hoje,
      status: "indisponivel" as const,
      erro: (e as Error).message,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1) + "\n");
    console.error(`[producao-uf] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

main();
