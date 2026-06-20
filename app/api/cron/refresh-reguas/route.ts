// Endpoint de cron para forçar o refresh diário dos níveis das réguas do /monitor.
//
// A página /monitor lê obterDadosDiariosANA() — um cache diário gravado em
// DATA_DIR (volume). Sem tráfego, esse cache só "vira" quando alguém abre a
// página. Como /monitor é ISR (revalidate 6h), até um curl na página pode
// devolver o HTML em cache sem disparar o fetch da ANA. Este endpoint é
// force-dynamic e chama obterDadosDiariosANA() diretamente, garantindo o
// fetch ANA + gravação do cache todo dia, independente de visitas.
//
// Disparado pelo workflow .github/workflows/reguas-diario.yml (diário, manhã).
// Protegido por Authorization: Bearer ${CRON_SECRET} (mesma chave dos outros crons).

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { obterDadosDiariosANA } from "@/lib/cache-ana-diario";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem secret configurado, recusa por segurança
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handler(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const d = await obterDadosDiariosANA();
    const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
    const estacoes = Object.values(d.dados);
    const vivas = estacoes.filter((e) => e.ultima_atualizacao >= hoje).length;
    const ultima = estacoes.map((e) => e.ultima_atualizacao).sort().reverse()[0] ?? "—";

    // Invalida o HTML ISR do /monitor (revalidate 6h). Sem isto, o cache de
    // rota persiste no volume e sobrevive a deploys — servindo dados e código
    // antigos até a janela de 6h. Faz o refresh diário de fato aparecer.
    revalidatePath("/monitor");

    return NextResponse.json({
      ok: true,
      mensagem: `Réguas atualizadas: ${vivas}/${estacoes.length} estações com leitura de hoje`,
      data_ref: hoje,
      estacoes: estacoes.length,
      estacoes_vivas: vivas,
      ultima_atualizacao: ultima,
      idn_atual: d.idn_atual ?? null,
      revalidated: "/monitor",
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: `Falha ao atualizar réguas: ${erro}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
