// Módulo B2 "Aquaviário" — embed LEVE dos indicadores de risco hidrológico.
//
// Server component: recebe o snapshot já computado (getAquaviarioSnapshot).
// Ordem preditivo-first:
//   1. ETA  → indicador líder (data de cruzamento + faixa P10/P50/P90)
//   2. IDN  → contexto/regime, em versão COMPACTA (IDNCompacto: velocímetro +
//             número + regime). NÃO usa o DessincronizacaoGauge completo do
//             /monitor (~1770px) — esse fica só no /monitor.
//
// Sem header/footer de página (isso é da página pública). A banda de incerteza
// do ETA é sempre exibida (nunca só o central).

import IDNCompacto from "@/components/IDNCompacto";
import SeloProveniencia from "@/components/SeloProveniencia";
import { Calendar } from "lucide-react";
import { AQUAVIARIO_COPY, type AquaviarioSnapshot } from "@/lib/modulos/aquaviario";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function dataPtBR(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${MESES[parseInt(m, 10) - 1] ?? "?"}/${a}`;
}

// Urgência do ETA → token de cor (mesma escala do painel ETA do /monitor).
function corETA(dias: number | null) {
  const u =
    dias == null ? "white" : dias <= 30 ? "vermelho" : dias <= 90 ? "ouro" : dias <= 180 ? "verde" : "white";
  return {
    vermelho: { bg: "bg-vermelho/10 border-vermelho/40", texto: "text-vermelho" },
    ouro:     { bg: "bg-ouro/10 border-ouro/40",         texto: "text-ouro" },
    verde:    { bg: "bg-verde/10 border-verde/40",       texto: "text-verde" },
    white:    { bg: "bg-azul-marinho border-white/20",   texto: "text-white" },
  }[u];
}

function ETABloco({ eta }: { eta: AquaviarioSnapshot["eta"] }) {
  const cor = corETA(eta.dias);
  const indefinido = eta.datas.central == null;

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-verde" />
        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
          {AQUAVIARIO_COPY.indicadores.eta.titulo}{" "}
          <span className="text-gray-600 normal-case font-normal tracking-normal">
            · {AQUAVIARIO_COPY.indicadores.eta.rotulo}
          </span>
        </p>
      </div>

      {indefinido ? (
        <div className="bg-azul-marinho rounded-lg p-4 border border-white/20">
          <p className="text-white text-sm">
            <strong>Cruzamento não projetado no horizonte do modelo.</strong>
          </p>
          <p className="text-gray-500 text-[11px] mt-1">
            O CMR de Itacoatiara permanece acima do calado-alvo ({eta.alvo_calado_m.toFixed(1)} m)
            em todo o período coberto pelos análogos.
          </p>
        </div>
      ) : (
        <div className={`rounded-lg p-4 border ${cor.bg}`}>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`${cor.texto} font-extrabold text-3xl`}>
              {dataPtBR(eta.datas.central)}
            </span>
            {eta.dias != null && (
              <span className="text-gray-300 text-sm">
                em <strong>{eta.dias} dias</strong>
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider bg-verde/15 text-verde border border-verde/30 px-2 py-0.5 rounded-full font-bold">
              via análogos{eta.ano_gemeo != null ? ` · ano gêmeo ${eta.ano_gemeo}` : ""}
            </span>
          </div>
          <p className="text-gray-400 text-[11px] mt-1">
            CMR &lt; {eta.alvo_calado_m.toFixed(1)} m · probabilidade de cruzamento:{" "}
            <strong className="text-gray-300">{Math.round(eta.prob * 100)}%</strong>
          </p>

          {/* Banda empírica dos análogos — sempre exibida (precoce / central / tardia) */}
          <div className="grid grid-cols-3 gap-3 text-[11px] mt-4">
            <div className="bg-azul-medio/40 rounded p-2 border border-white/5">
              <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">P10 precoce</p>
              <p className="text-white font-semibold">{dataPtBR(eta.datas.precoce)}</p>
            </div>
            <div className="bg-verde/15 rounded p-2 border border-verde/30">
              <p className="text-verde uppercase tracking-wider text-[10px] mb-0.5">P50 mediana</p>
              <p className="text-white font-bold">{dataPtBR(eta.datas.central)}</p>
            </div>
            <div className="bg-azul-medio/40 rounded p-2 border border-white/5">
              <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">P90 tardia</p>
              <p className="text-white font-semibold">{dataPtBR(eta.datas.tardia)}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-gray-500 text-[11px] mt-3 leading-relaxed">
        {AQUAVIARIO_COPY.indicadores.eta.ajuda}
      </p>
    </div>
  );
}

export default function AquaviarioEmbed({ snapshot }: { snapshot: AquaviarioSnapshot }) {
  const { idn, eta, meta } = snapshot;

  return (
    <div className="flex flex-col gap-5">
      {/* ── ETA até a restrição de calado (indicador líder) ── */}
      <ETABloco eta={eta} />

      {/* ── IDN compacto (contexto/regime) ── */}
      <IDNCompacto idn={idn} />

      {/* ── Proveniência ── */}
      <div className="pt-1">
        <SeloProveniencia
          tipo={AQUAVIARIO_COPY.proveniencia.tipo}
          fonte={AQUAVIARIO_COPY.proveniencia.fonte}
        />
        <p className="text-gray-600 text-[10px] mt-2">
          {meta.fonteANA ? "Cotas ANA ao vivo" : "Cotas em fallback estático (ANA indisponível)"} ·
          ref. {dataPtBR(meta.dataReferencia)}
        </p>
      </div>
    </div>
  );
}
