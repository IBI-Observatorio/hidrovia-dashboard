import { NextRequest, NextResponse } from "next/server";

// Relay de estado da apresentação CTLOG — self-hosted no próprio app (mesma origem
// que o deck/controle no Railway). Sem dependência externa, sem limite de taxa.
// O celular faz POST de ações; o telão faz polling do GET. Estado em memória,
// keyed por "canal" (a sala) — processo único no Railway, então persiste na sessão.
export const dynamic = "force-dynamic"; // nunca cachear o polling no edge
export const runtime = "nodejs";

type Modo = "slides" | "feature" | "blackout";
type Estado = {
  rev: number;
  mode: Modo;
  slide: number;
  feature: string | null;
  scrollSeq: number; // contador de passos de rolagem (idempotente)
  scrollDir: number; // direção do último passo (1 desce, -1 sobe)
};

function inicial(): Estado {
  return { rev: 0, mode: "slides", slide: 0, feature: null, scrollSeq: 0, scrollDir: 1 };
}

// estado por sala (canal). Sobrevive entre requests no mesmo processo.
const salas = new Map<string, Estado>();
function getSala(canal: string): Estado {
  let e = salas.get(canal);
  if (!e) { e = inicial(); salas.set(canal, e); }
  return e;
}

const semCache = { "Cache-Control": "no-store, max-age=0" };

export async function GET(req: NextRequest) {
  const canal = req.nextUrl.searchParams.get("canal") || "default";
  return NextResponse.json(getSala(canal), { headers: semCache });
}

export async function POST(req: NextRequest) {
  const canal = req.nextUrl.searchParams.get("canal") || "default";
  const e = getSala(canal);
  const { action, slide, feature, total, dir } = await req.json().catch(() => ({}));

  switch (action) {
    case "next":
      e.mode = "slides"; e.feature = null;
      e.slide = Math.min((total ?? 99) - 1, e.slide + 1);
      break;
    case "prev":
      e.mode = "slides"; e.feature = null;
      e.slide = Math.max(0, e.slide - 1);
      break;
    case "goto":
      e.mode = "slides"; e.feature = null;
      e.slide = Math.max(0, slide ?? 0);
      break;
    case "feature":
      e.mode = "feature"; e.feature = feature ?? null;
      break;
    case "slides":
      e.mode = "slides"; e.feature = null;
      break;
    case "blackout":
      e.mode = e.mode === "blackout" ? "slides" : "blackout";
      break;
    case "scroll": // um passo de rolagem (toque no controle)
      e.scrollSeq++; e.scrollDir = dir === "up" ? -1 : 1;
      break;
    case "reset":
      Object.assign(e, inicial());
      break;
    default:
      return NextResponse.json({ erro: "action" }, { status: 400, headers: semCache });
  }

  e.rev++;
  return NextResponse.json(e, { headers: semCache });
}
