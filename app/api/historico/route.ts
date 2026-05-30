import { NextRequest } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { lerSerieCotas } from "@/lib/ana-cotas-series";

export const revalidate = 86400;

const PROJECT_DATA = join(process.cwd(), "data");

type Ponto = { md: string; cota_m: number };

// ---------------------------------------------------------------------------
// Leitores de CSV
// ---------------------------------------------------------------------------

// 4estacoes_2016_2025.csv — colunas MAO/ITA/BOR/MNC em metros
function lerCSV4Estacoes(col: "MAO" | "ITA" | "BOR" | "MNC", anos: Set<number>): Map<number, Ponto[]> {
  const caminho = join(PROJECT_DATA, "4estacoes_2016_2025.csv");
  if (!existsSync(caminho)) return new Map();
  const linhas = readFileSync(caminho, "utf-8").split("\n");
  const cab = linhas[0].split(",");
  const idx = cab.indexOf(col);
  if (idx < 0) return new Map();
  const res = new Map<number, Ponto[]>();
  anos.forEach((a) => res.set(a, []));
  for (let i = 1; i < linhas.length; i++) {
    const p = linhas[i].trim().split(",");
    if (p.length <= idx) continue;
    const data = p[0];
    if (!data || data.length < 10) continue;
    const ano = parseInt(data.slice(0, 4));
    if (!anos.has(ano)) continue;
    const v = parseFloat(p[idx]);
    if (isNaN(v)) continue;
    res.get(ano)!.push({ md: data.slice(5), cota_m: v });
  }
  return res;
}

// todas_estacoes_2026_completo.csv — valores em cm, divide por 100
function lerTodasEstacoes2026(col: string): Ponto[] {
  const caminho = join(PROJECT_DATA, "todas_estacoes_2026_completo.csv");
  if (!existsSync(caminho)) return [];
  const linhas = readFileSync(caminho, "utf-8").split("\n");
  const cab = linhas[0].split(",");
  const idx = cab.indexOf(col);
  if (idx < 0) return [];
  const res: Ponto[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const p = linhas[i].trim().split(",");
    if (p.length <= idx) continue;
    const data = p[0];
    if (!data?.startsWith("2026")) continue;
    const v = parseFloat(p[idx]);
    if (isNaN(v)) continue;
    res.push({ md: data.slice(5), cota_m: +(v / 100).toFixed(2) });
  }
  return res;
}

// manaus_porto_nov2025_abr2026.csv — valores em metros
function lerManausPorto(anos: Set<number>): Map<number, Ponto[]> {
  const caminho = join(PROJECT_DATA, "manaus_porto_nov2025_abr2026.csv");
  if (!existsSync(caminho)) return new Map();
  const linhas = readFileSync(caminho, "utf-8").split("\n");
  const res = new Map<number, Ponto[]>();
  anos.forEach((a) => res.set(a, []));
  for (let i = 1; i < linhas.length; i++) {
    const p = linhas[i].trim().split(",");
    if (p.length < 2) continue;
    const data = p[0];
    if (!data || data.length < 10) continue;
    const ano = parseInt(data.slice(0, 4));
    if (!anos.has(ano)) continue;
    const v = parseFloat(p[1]);
    if (isNaN(v)) continue;
    res.get(ano)!.push({ md: data.slice(5), cota_m: v });
  }
  return res;
}

// CSV simples data,cota_m gerado pelo script fetch-historico.ts
function lerCSVSimples(arquivo: string, anos?: Set<number>): Map<number, Ponto[]> | Ponto[] {
  const caminho = join(PROJECT_DATA, arquivo);
  if (!existsSync(caminho)) return anos ? new Map() : [];
  const linhas = readFileSync(caminho, "utf-8").split("\n");

  if (anos) {
    const res = new Map<number, Ponto[]>();
    anos.forEach((a) => res.set(a, []));
    for (let i = 1; i < linhas.length; i++) {
      const p = linhas[i].trim().split(",");
      if (p.length < 2) continue;
      const data = p[0];
      if (!data || data.length < 10) continue;
      const ano = parseInt(data.slice(0, 4));
      if (!anos.has(ano)) continue;
      const v = parseFloat(p[1]);
      if (isNaN(v)) continue;
      res.get(ano)!.push({ md: data.slice(5), cota_m: v });
    }
    return res;
  } else {
    const res: Ponto[] = [];
    for (let i = 1; i < linhas.length; i++) {
      const p = linhas[i].trim().split(",");
      if (p.length < 2) continue;
      const data = p[0];
      if (!data || data.length < 10) continue;
      const v = parseFloat(p[1]);
      if (isNaN(v)) continue;
      res.push({ md: data.slice(5), cota_m: v });
    }
    return res;
  }
}


// Série diária acumulada de cota (ana-cotas-series.json) → pontos de 2026.
// É o histórico que cresce 1 ponto/dia a partir do cache ANA, dando densidade
// diária à linha de 2026 sem depender do CSV semanal. Valores em metros.
function lerCotasSeries2026(estacao: string): Ponto[] {
  const serie = lerSerieCotas();
  const arr = serie.estacoes[estacao] ?? [];
  return arr
    .filter((p) => p.data.startsWith("2026"))
    .map((p) => ({ md: p.data.slice(5), cota_m: p.cota_m }));
}

// Leitura ANA ao vivo (cache diário do /monitor) → ponto "hoje" de 2026.
// Fallback usado só enquanto a série acumulada ainda não tem ponto da estação
// (ex.: deploy novo antes do primeiro acesso ao /monitor). Valores em metros.
function lerLiveDiario(estacao: string): Ponto | null {
  try {
    const p = join(PROJECT_DATA, "ana-diario-cache.json");
    if (!existsSync(p)) return null;
    const cache = JSON.parse(readFileSync(p, "utf-8")) as {
      data?: string;
      dados?: Record<string, { cota_m?: number; ultima_atualizacao?: string }>;
    };
    const d = cache.dados?.[estacao];
    if (!d || typeof d.cota_m !== "number") return null;
    const data = d.ultima_atualizacao ?? cache.data;
    if (!data?.startsWith("2026")) return null;
    return { md: data.slice(5), cota_m: +d.cota_m.toFixed(2) };
  } catch {
    return null;
  }
}

// Mescla sem duplicar md — extra complementa base
function merge(base: Ponto[], extra: Ponto[]): Ponto[] {
  const mds = new Set(base.map((p) => p.md));
  const resultado = [...base];
  for (const p of extra) {
    if (!mds.has(p.md)) resultado.push(p);
  }
  return resultado.sort((a, b) => a.md.localeCompare(b.md));
}

function mapToArray(m: Map<number, Ponto[]> | Ponto[]): Map<number, Ponto[]> {
  return m instanceof Map ? m : new Map();
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const estacao = searchParams.get("estacao") ?? "Manaus";
  const anosStr = searchParams.get("anos") ?? "2024,2025,2026";
  const anos = new Set(anosStr.split(",").map(Number).filter(Boolean));
  const resultado: Record<string, Ponto[]> = {};

  if (estacao === "Manaus") {
    const historico  = lerCSV4Estacoes("MAO", anos);
    const porto      = lerManausPorto(anos);
    const gap2025    = mapToArray(lerCSVSimples("manaus_gap_2025.csv", anos));
    const gap2023    = mapToArray(lerCSVSimples("manaus_2023_gap.csv", anos));
    const todas2026  = anos.has(2026) ? lerTodasEstacoes2026("MAO") : [];
    for (const ano of anos) {
      let pts = historico.get(ano) ?? [];
      if (porto.has(ano))   pts = merge(pts, porto.get(ano)!);
      if (gap2025.has(ano)) pts = merge(pts, gap2025.get(ano)!);
      if (gap2023.has(ano)) pts = merge(pts, gap2023.get(ano)!);
      if (ano === 2026)     pts = merge(pts, todas2026);
      resultado[ano] = pts;
    }
  } else if (estacao === "Itacoatiara") {
    const historico  = lerCSV4Estacoes("ITA", anos);
    const extra      = mapToArray(lerCSVSimples("itacoatiara_historico.csv", anos));
    const gap2023    = mapToArray(lerCSVSimples("itacoatiara_2023_gap.csv", anos));
    const todas2026  = anos.has(2026) ? lerTodasEstacoes2026("ITA") : [];
    for (const ano of anos) {
      let pts = historico.get(ano) ?? [];
      if (extra.has(ano))   pts = merge(pts, extra.get(ano)!);
      if (gap2023.has(ano)) pts = merge(pts, gap2023.get(ano)!);
      if (ano === 2026)     pts = merge(pts, todas2026);
      resultado[ano] = pts;
    }
  } else if (estacao === "SGC") {
    // HidroWeb cobre 2016–out/2025 (consistido); sem telemetria disponível
    const hidroweb  = mapToArray(lerCSVSimples("sgc_hidroweb.csv", anos));
    const todas2026 = anos.has(2026) ? lerTodasEstacoes2026("CUR") : [];
    for (const ano of anos) {
      let pts = hidroweb.get(ano) ?? [];
      if (ano === 2026) pts = merge(pts, todas2026);
      resultado[ano] = pts;
    }
  } else if (estacao === "Humaita") {
    // HidroWeb cobre 2016–dez/2025; telemetria complementa 2024–2025
    const hidroweb   = mapToArray(lerCSVSimples("humaita_hidroweb.csv", anos));
    const telemetria = mapToArray(lerCSVSimples("humaita_historico.csv", anos));
    for (const ano of anos) {
      let pts = hidroweb.get(ano) ?? [];
      if (telemetria.has(ano)) pts = merge(pts, telemetria.get(ano)!);
      resultado[ano] = pts;
    }
  } else if (estacao === "Borba") {
    // HidroWeb cobre 2016–dez/2025; 4estacoes também; sem telemetria 2026
    const hidroweb  = mapToArray(lerCSVSimples("borba_hidroweb.csv", anos));
    const historico = lerCSV4Estacoes("BOR", anos);
    for (const ano of anos) {
      let pts = hidroweb.get(ano) ?? [];
      if (historico.has(ano)) pts = merge(pts, historico.get(ano)!);
      resultado[ano] = pts;
    }
  } else if (estacao === "Manacapuru") {
    const historico = lerCSV4Estacoes("MNC", anos);
    const extra     = mapToArray(lerCSVSimples("manacapuru_historico.csv", anos));
    const gap2023   = mapToArray(lerCSVSimples("manacapuru_2023_gap.csv", anos));
    const todas2026 = anos.has(2026) ? lerTodasEstacoes2026("MNC") : [];
    for (const ano of anos) {
      let pts = historico.get(ano) ?? [];
      if (extra.has(ano))   pts = merge(pts, extra.get(ano)!);
      if (gap2023.has(ano)) pts = merge(pts, gap2023.get(ano)!);
      if (ano === 2026)     pts = merge(pts, todas2026);
      resultado[ano] = pts;
    }
  } else if (estacao === "PortoVelho") {
    // HidroWeb cobre 2016–fev/2026; telemetria complementa; todas_estacoes para mai/2026
    const hidroweb   = mapToArray(lerCSVSimples("portovelho_hidroweb.csv", anos));
    const telemetria = mapToArray(lerCSVSimples("portovelho_historico.csv", anos));
    const todas2026  = anos.has(2026) ? lerTodasEstacoes2026("PVH") : [];
    for (const ano of anos) {
      let pts = hidroweb.get(ano) ?? [];
      if (telemetria.has(ano)) pts = merge(pts, telemetria.get(ano)!);
      if (ano === 2026) pts = merge(pts, todas2026);
      resultado[ano] = pts;
    }
  }

  // Estende a linha de 2026 com a série diária acumulada (ou, na ausência dela,
  // ao menos o ponto de hoje), para não "parar" na última data do CSV estático.
  if (anos.has(2026) && resultado["2026"]) {
    let live2026 = lerCotasSeries2026(estacao);
    if (live2026.length === 0) {
      const p = lerLiveDiario(estacao);
      if (p) live2026 = [p];
    }
    if (live2026.length) resultado["2026"] = merge(resultado["2026"], live2026);
  }

  return Response.json(resultado, {
    headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate" },
  });
}
