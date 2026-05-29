// Série diária ACUMULADA de cota por estação (em metros), alimentada pelo
// cache diário da ANA (obterDadosDiariosANA → fetchTodasEstacoes).
//
// Diferença crucial para os outros dois arquivos:
//   • ana-diario-cache.json  → snapshot de 1 dia, SOBRESCRITO todo dia (cache).
//   • ana-idn-series.json    → acumula, mas guarda só o IDN composto, não a cota.
//   • ana-cotas-series.json  → acumula a cota POR ESTAÇÃO — é o histórico diário
//                              que alimenta a linha de 2026 do cotagrama.
//
// Cresce um ponto por estação por dia. Gravação é idempotente: só anexa quando
// a data da leitura é mais nova que o último ponto já registrado da estação.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface PontoCota {
  data: string;   // "YYYY-MM-DD"
  cota_m: number;
}

export interface SerieCotas {
  gerado_em: string;
  estacoes: Record<string, PontoCota[]>;
}

function caminho(): string {
  const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
  return join(dataDir, "ana-cotas-series.json");
}

export function lerSerieCotas(): SerieCotas {
  try {
    const raw = readFileSync(caminho(), "utf-8");
    return JSON.parse(raw) as SerieCotas;
  } catch {
    // Arquivo ainda não existe (antes do primeiro /monitor) — série vazia.
    return { gerado_em: new Date().toISOString(), estacoes: {} };
  }
}

/**
 * Faz upsert da leitura diária de cada estação. Recebe o mapa `dados` do cache
 * ANA (chave = nome da estação). Só grava se algo mudou; em filesystem
 * somente-leitura (ex.: Railway) falha silenciosamente.
 */
export function anexaCotasSerie(
  dados: Record<string, { cota_m?: number; ultima_atualizacao?: string }>,
): void {
  try {
    const serie = lerSerieCotas();
    let mudou = false;

    for (const [nome, d] of Object.entries(dados)) {
      if (typeof d.cota_m !== "number" || !d.ultima_atualizacao) continue;
      const arr = (serie.estacoes[nome] ??= []);
      const ultimo = arr[arr.length - 1];
      // Já temos esse dia (ou mais novo) registrado → nada a fazer.
      if (ultimo && ultimo.data >= d.ultima_atualizacao) continue;
      arr.push({ data: d.ultima_atualizacao, cota_m: +d.cota_m.toFixed(2) });
      mudou = true;
    }

    if (!mudou) return;
    serie.gerado_em = new Date().toISOString();

    const p = caminho();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(serie, null, 2), "utf-8");
  } catch {
    /* filesystem somente leitura — ignora */
  }
}
