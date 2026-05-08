import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBoletimSEMA, type BoletimSEMA } from "@/lib/sema-parser";

// Em produção Vercel o filesystem é read-only exceto /tmp (mas efêmero entre invocações).
// Para produção real, substituir por Vercel KV ou outro storage persistente.
function getCachePath(): string {
  const localPath = join(process.cwd(), "data", "boletins_sema_cache.json");
  if (existsSync(join(process.cwd(), "data"))) return localPath;
  return "/tmp/boletins_sema_cache.json";
}
const CACHE_PATH = getCachePath();

function lerCache(): { boletins: BoletimSEMA[]; ultimo_upload: string | null; total: number } {
  if (!existsSync(CACHE_PATH))
    return { boletins: [], ultimo_upload: null, total: 0 };
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return { boletins: [], ultimo_upload: null, total: 0 };
  }
}

function salvarCache(cache: ReturnType<typeof lerCache>) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

// GET /api/sema — retorna o boletim mais recente (ou todos)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const todos = searchParams.get("todos") === "1";

  const cache = lerCache();
  if (todos) return NextResponse.json(cache);

  const ultimo = cache.boletins[cache.boletins.length - 1] ?? null;
  return NextResponse.json({ boletim: ultimo, total: cache.total });
}

// POST /api/sema — recebe PDF, processa e salva no cache
export async function POST(request: NextRequest) {
  // Autenticação simples por header
  const senhaEnv  = process.env.ADMIN_PASSWORD ?? "ibi2026";
  const senhaReq  = request.headers.get("x-admin-password");
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
    return NextResponse.json({ erro: "Campo 'arquivo' não encontrado ou inválido" }, { status: 400 });
  }

  if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ erro: "Apenas arquivos PDF são aceitos" }, { status: 400 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const boletim = await parseBoletimSEMA(buffer);

  // Salva no cache (mantém os últimos 30 boletins)
  const cache = lerCache();
  cache.boletins.push(boletim);
  if (cache.boletins.length > 30) cache.boletins = cache.boletins.slice(-30);
  cache.ultimo_upload = new Date().toISOString();
  cache.total = cache.boletins.length;
  salvarCache(cache);

  return NextResponse.json({
    ok:       true,
    boletim,
    mensagem: boletim.erro
      ? `Processado com avisos: ${boletim.erro}`
      : `Boletim ${boletim.numero ?? "?"} de ${boletim.data} processado com sucesso — ${boletim.estacoes.length} estações extraídas`,
  });
}
