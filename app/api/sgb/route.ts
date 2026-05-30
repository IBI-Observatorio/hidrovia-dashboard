// Rota de upload/leitura de boletins SGB/CPRM (SAH Amazonas).
//
// POST /api/sgb     — admin: recebe PDF, parseia, cacheia (até 30 mantidos)
// GET  /api/sgb     — público: retorna o último boletim parseado
// GET  /api/sgb?todos=1  — retorna o cache inteiro (uso interno/debug)
//
// O cache também é consumido por `lib/fetch-dados.ts → fetchPrevisao2026()`
// para devolver a previsão dinâmica usada na home, /monitor e briefing
// semanal (fallback: PREVISAO_2026 hardcoded em lib/dados-historicos.ts).

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBoletimSGB, type BoletimSGB } from "@/lib/sgb-parser";

const DATA_DIR   = process.env.DATA_DIR ?? join(process.cwd(), "data");
const CACHE_PATH = join(DATA_DIR, "boletins_sgb_cache.json");

interface CacheSGB {
  boletins:        BoletimSGB[];
  ultimo_upload:   string | null;
  total:           number;
}

function lerCache(): CacheSGB {
  if (!existsSync(CACHE_PATH)) {
    return { boletins: [], ultimo_upload: null, total: 0 };
  }
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return { boletins: [], ultimo_upload: null, total: 0 };
  }
}

function salvarCache(cache: CacheSGB) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

// GET — retorna último boletim (ou cache inteiro com ?todos=1)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const todos = searchParams.get("todos") === "1";

  const cache = lerCache();
  if (todos) return NextResponse.json(cache);

  const ultimo = cache.boletins[cache.boletins.length - 1] ?? null;
  return NextResponse.json({ boletim: ultimo, total: cache.total });
}

// POST — upload protegido por header x-admin-password
export async function POST(request: NextRequest) {
  const senhaEnv = process.env.ADMIN_PASSWORD ?? "ibi2026";
  const senhaReq = request.headers.get("x-admin-password");
  if (senhaReq !== senhaEnv) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ erro: "Body deve ser multipart/form-data" }, { status: 400 });
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Campo 'arquivo' não encontrado" }, { status: 400 });
  }
  if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ erro: "Apenas PDF aceito" }, { status: 400 });
  }

  const buffer  = Buffer.from(await arquivo.arrayBuffer());
  const boletim = await parseBoletimSGB(buffer);

  const cache = lerCache();
  // Evita duplicar: se já temos boletim com mesmo número+data, substitui
  const dup = cache.boletins.findIndex(
    (b) => b.numero === boletim.numero && b.data === boletim.data
  );
  if (dup >= 0) cache.boletins[dup] = boletim;
  else cache.boletins.push(boletim);

  if (cache.boletins.length > 30) cache.boletins = cache.boletins.slice(-30);
  cache.ultimo_upload = new Date().toISOString();
  cache.total         = cache.boletins.length;
  salvarCache(cache);

  // Conta itens "úteis" do boletim para mensagem informativa
  const c = boletim.confiabilidade;
  return NextResponse.json({
    ok: true,
    boletim,
    mensagem: boletim.erro
      ? `Processado com avisos: ${boletim.erro}`
      : `Boletim ${boletim.numero ?? "?"} (${boletim.data}): ${boletim.estacoes.length} estações,` +
        ` ${boletim.previsoes.length}/4 previsões` +
        ` (confiabilidade: resumo ${(c.estacoes_resumo*100).toFixed(0)}%,` +
        ` variações ${(c.narrativa_variacao*100).toFixed(0)}%,` +
        ` previsões ${(c.previsoes*100).toFixed(0)}%)`,
  });
}
