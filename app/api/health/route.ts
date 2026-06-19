// Endpoint de saúde do sistema — usado pelo "sistema imunológico" (watchdog).
// Reporta a FRESCURA REAL dos dados em produção, lendo os caches do volume
// DATA_DIR. Pega a falha silenciosa: quando o cron "passou verde" mas o dado
// não atualizou. Público e read-only (só expõe metadados de data/idade).
//
// `ok` = true só se os checks de cadência frequente (réguas diário, insights
// semanal) estão dentro do prazo. Portos é informativo (mensal, com lag ANTAQ).

import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");

function hojeManaus(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lerJSON(p: string): any | null {
  try {
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : null;
  } catch {
    return null;
  }
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export async function GET() {
  const hoje = hojeManaus();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checks: Record<string, any> = {};

  // ── Réguas: cache diário (esperado: hoje, fuso Manaus) ──────────────────────
  const ana = lerJSON(join(DATA_DIR, "ana-diario-cache.json"));
  if (!ana?.data) {
    checks.reguas = { ok: false, detalhe: "cache ana-diario ausente" };
  } else {
    const dias = diasDesde(ana.data + "T12:00:00-04:00");
    const ok = ana.data >= hoje || dias <= 1;
    checks.reguas = {
      ok,
      cache_date: ana.data,
      hoje,
      dias,
      vivas: ana.dados ? Object.values(ana.dados).filter((d: unknown) => (d as { ultima_atualizacao?: string })?.ultima_atualizacao && (d as { ultima_atualizacao: string }).ultima_atualizacao >= hoje).length : null,
      detalhe: ok ? (ana.data >= hoje ? "atualizado hoje" : "cache de ontem") : `cache vencido (${ana.data})`,
    };
  }

  // ── Insights AI: semanal (esperado: ≤ 9 dias) ───────────────────────────────
  const ins = lerJSON(join(DATA_DIR, "insights_ai_cache.json"));
  if (!ins?.gerado_em) {
    checks.insights = { ok: false, detalhe: "cache de insights ausente" };
  } else {
    const dias = diasDesde(ins.gerado_em);
    checks.insights = {
      ok: dias <= 9,
      gerado_em: ins.gerado_em,
      modelo: ins.modelo ?? null,
      dias,
      limite_dias: 9,
      detalhe: `gerado há ${dias} dia(s)`,
    };
  }

  // ── ENSO: mensal (CPC publica na 2a quinta; tolera ate ~40 dias) ────────────
  const enso = lerJSON(join(DATA_DIR, "enso_cpc_cache.json"));
  if (!enso?.data_emissao) {
    checks.enso = { ok: false, detalhe: "cache ENSO ausente" };
  } else {
    const dias = diasDesde(enso.data_emissao + "T12:00:00Z");
    checks.enso = {
      ok: dias <= 40,
      status: enso.status ?? null,
      data_emissao: enso.data_emissao,
      dias,
      limite_dias: 40,
      detalhe: `discussion de ${enso.data_emissao}`,
    };
  }

  // ── SGB/SACE: semanal (boletim publica terça, às vezes só à noite/quarta) ────
  // O refresh roda de hora em hora terça-tarde → quarta. Toleramos até 8 dias de
  // idade (cobre uma terça + a janela de atraso até quarta). Acima disso, uma
  // terça foi perdida de verdade → marca ok:false para o watchdog avisar.
  const sgb = lerJSON(join(DATA_DIR, "boletins_sgb_cache.json"));
  const ultimoSgb = sgb?.boletins?.[sgb.boletins.length - 1];
  if (!ultimoSgb?.data) {
    checks.sgb = { ok: false, presente: false, detalhe: "sem cache SGB — previsão usando fallback" };
  } else {
    const dias = diasDesde(ultimoSgb.data + "T00:00:00Z");
    const ok = dias <= 8;
    checks.sgb = {
      ok,
      numero: ultimoSgb.numero ?? null,
      data: ultimoSgb.data,
      total: sgb.total ?? sgb.boletins.length,
      dias,
      limite_dias: 8,
      detalhe: ok
        ? `boletim ${ultimoSgb.numero ?? "?"} de ${ultimoSgb.data} (há ${dias} dia(s))`
        : `boletim ${ultimoSgb.numero ?? "?"} de ${ultimoSgb.data} ATRASADO — há ${dias} dias (limite 8); refresh terça→quarta não achou boletim novo`,
    };
  }

  // ── Portos: informativo (mensal, com lag ANTAQ — não derruba o ok) ──────────
  const portos = lerJSON(join(process.cwd(), "public", "data", "antaq", "dashboard", "portos-series.json"));
  checks.portos = {
    ok: true,
    presente: !!portos,
    referencia: portos?.referencia ?? null,
    detalhe: portos ? `referência ${portos.referencia}` : "arquivo ausente",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = Object.values(checks).every((c: any) => c.ok);
  return NextResponse.json({ ok, hoje, gerado_em: new Date().toISOString(), checks });
}
