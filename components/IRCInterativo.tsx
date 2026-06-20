"use client";

// Widget interativo do IRC-Tabocal com slider de calado-alvo parametrizável.
// O usuário define o calado-alvo da sua operação e o IRC se ajusta em tempo
// real. Persistência:
//   - localStorage: lembra entre visitas
//   - URL param `?calado=10.5`: deep link / citação em contratos

import { useState, useEffect, useMemo } from "react";
import {
  type SnapshotIRCTabocal,
} from "@/lib/irc-tabocal";
import {
  cotaItaParaCMR,
} from "@/lib/cmr-itacoatiara";
import { projetaETAporAnalogos } from "@/lib/recessao-analogos";
import { ITACOATIARA_HISTORICO_DIARIO } from "@/lib/itacoatiara-historico-diario";
import type { ResultadoIRC_Estendido } from "@/lib/irc";
import { Anchor, Calendar } from "lucide-react";

interface Props {
  snapshotBase: Omit<SnapshotIRCTabocal, "calado_alvo_m">;
  irc_manaus: number;             // IRC-Manaus já calculado pelo SSR
  irc_manaus_faixa: ResultadoIRC_Estendido["faixa"];
  // Tier (freemium):
  isAssinante: boolean;           // true → slider liberado; false → calado fixo 11m + CTA
  nomeAssinante?: string | null;  // ex: "Cargill" — para mostrar "Olá, Cargill"
  // Defaults parametrizáveis
  calado_min?: number;            // default 7
  calado_max?: number;            // default 13
  calado_passo?: number;          // default 0.5
}

const STORAGE_KEY = "irc:caladoAlvo";
const DEFAULT_CALADO = 11.0;

const PRESETS: { label: string; valor: number; descricao: string }[] = [
  { label: "Conservador",  valor:  8.0, descricao: "Comboios pequenos / regime de estiagem" },
  { label: "Moderado",     valor:  9.5, descricao: "Operação típica em vazante" },
  { label: "Padrão",       valor: 11.0, descricao: "Comboio carregado em cheia normal" },
  { label: "Carga máxima", valor: 12.0, descricao: "Comboio premium em cheia plena" },
];

export default function IRCInterativo({
  isAssinante,
  nomeAssinante,
  calado_min = 7.0,
  calado_max = 13.0,
  calado_passo = 0.5,
}: Props) {
  const [calado, setCalado] = useState<number>(DEFAULT_CALADO);
  const [carregouInicial, setCarregouInicial] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAssinante) {
      setCalado(DEFAULT_CALADO);
      setCarregouInicial(true);
      return;
    }
    const urlParam = new URL(window.location.href).searchParams.get("calado");
    const storage  = localStorage.getItem(STORAGE_KEY);
    let inicial = DEFAULT_CALADO;
    if (urlParam) {
      const n = parseFloat(urlParam);
      if (!isNaN(n) && n >= calado_min && n <= calado_max) inicial = n;
    } else if (storage) {
      const n = parseFloat(storage);
      if (!isNaN(n) && n >= calado_min && n <= calado_max) inicial = n;
    }
    setCalado(inicial);
    setCarregouInicial(true);
  }, [calado_min, calado_max, isAssinante]);

  useEffect(() => {
    if (!carregouInicial || typeof window === "undefined" || !isAssinante) return;
    localStorage.setItem(STORAGE_KEY, calado.toString());
  }, [calado, carregouInicial, isAssinante]);

  // ETA via análogos (calado-alvo → cruzamento projetado)
  const { cotaItaAlvo_m, eta_an } = useMemo(() => {
    // Cota ITA que produz CMR = calado (referência operacional)
    const cotaItaAlvo_m = cotaItaParaCMR(calado);
    // ETA via ANÁLOGOS HISTÓRICOS — empirical forecasting baseado em 2016-2025.
    const serie2026 = Object.entries(ITACOATIARA_HISTORICO_DIARIO[2026] ?? {})
      .map(([data, cota]) => ({ data, cota: cota as number }))
      .sort((a, b) => a.data.localeCompare(b.data));
    const eta_an = serie2026.length >= 30
      ? projetaETAporAnalogos(serie2026, calado, 60, 0.5, 300)
      : null;
    return { cotaItaAlvo_m, eta_an };
  }, [calado]);

  const copiarLink = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("calado", calado.toString());
    navigator.clipboard?.writeText(url.toString());
  };

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      {/* Cabeçalho com badge de tier */}
      <div className="flex items-center gap-2 mb-4">
        <Anchor size={16} className="text-verde" />
        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
          IRC · Índice de Risco de Calado <span className="text-gray-600">v3.3</span>
        </p>
        {isAssinante ? (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-verde/15 text-verde border border-verde/30 font-bold uppercase tracking-wider">
            Assinante {nomeAssinante ? `· ${nomeAssinante}` : ""}
          </span>
        ) : (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-bold uppercase tracking-wider">
            Gratuito · calado fixo 11m
          </span>
        )}
        {isAssinante && (
          <a
            href="/api/auth?logout=1"
            className="text-[10px] text-gray-600 hover:text-gray-400 ml-auto"
            title="Encerrar sessão de assinante"
          >
            Sair
          </a>
        )}
      </div>

      {/* ── BLOCO INTERATIVO (assinante) OU CTA (gratuito) ── */}
      {isAssinante ? (
        <div className="bg-azul-marinho rounded-lg p-4 border border-verde/20 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-verde text-[11px] font-bold uppercase tracking-wider">
                Calado-alvo da sua operação
              </p>
              <p className="text-gray-500 text-[10px] mt-0.5">
                Ajuste para refletir o calado máximo dos seus comboios. O IRC se ajusta em tempo real.
              </p>
            </div>
            <div className="text-right">
              <span className="text-verde text-3xl font-extrabold tabular-nums">{calado.toFixed(1)}</span>
              <span className="text-gray-400 text-sm"> m</span>
            </div>
          </div>

          <input
            type="range"
            min={calado_min}
            max={calado_max}
            step={calado_passo}
            value={calado}
            onChange={(e) => setCalado(parseFloat(e.target.value))}
            className="w-full accent-verde"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>{calado_min}m (estiagem)</span>
            <span>11m padrão</span>
            <span>{calado_max}m (cheia)</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {PRESETS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setCalado(p.valor)}
                title={p.descricao}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  Math.abs(calado - p.valor) < 0.05
                    ? "bg-verde/20 border-verde/50 text-verde"
                    : "bg-azul-medio/50 border-white/10 text-gray-400 hover:border-white/30"
                }`}
              >
                {p.label} · {p.valor}m
              </button>
            ))}
            <button
              onClick={copiarLink}
              className="text-[10px] px-2 py-1 rounded border bg-azul-medio/50 border-white/10 text-gray-400 hover:border-white/30 ml-auto"
              title="Copiar URL com seu calado-alvo (para compartilhar/citar)"
            >
              📋 Copiar link
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-azul-marinho rounded-lg p-4 border border-ouro/30 mb-5">
          <p className="text-ouro text-[11px] font-bold uppercase tracking-wider mb-1">
            🔒 Calado-alvo fixo em 11,0 m
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            A versão pública calcula o IRC com calado-alvo padrão. Assinantes parametrizam
            o calado da sua operação.
          </p>
        </div>
      )}

      {/* ── PAINEL ETA ── */}
      <DataETAPainel eta_an={eta_an} cotaItaAlvo_m={cotaItaAlvo_m} calado={calado} isAssinante={isAssinante} />

    </div>
  );
}

// ─── Painel de ETA do calado-alvo ───────────────────────────────────────────
interface DataETAPainelProps {
  eta_an: ReturnType<typeof projetaETAporAnalogos> | null;
  cotaItaAlvo_m: number;
  calado: number;
  isAssinante: boolean;
}

function formataDataLonga(iso: string | null): string {
  if (!iso) return "—";
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [a, m, d] = iso.split("-");
  return `${d}/${meses[parseInt(m, 10) - 1] ?? "?"}/${a}`;
}

function DataETAPainel({ eta_an, cotaItaAlvo_m, calado, isAssinante }: DataETAPainelProps) {
  if (eta_an == null || eta_an.dias_p50 == null) {
    return (
      <div className="bg-azul-marinho rounded-lg p-4 border border-verde/20 mb-5">
        <div className="flex items-start gap-3">
          <Calendar size={18} className="text-verde mt-0.5 shrink-0" />
          <div>
            <p className="text-verde text-[11px] font-bold uppercase tracking-wider mb-1">
              ETA · Quando o CMR cai abaixo do seu calado-alvo ({calado.toFixed(1)} m)
            </p>
            <p className="text-white text-sm">
              <strong>Não previsto no horizonte de 300 dias.</strong> Seu calado-alvo permanece atendido
              em todo o ciclo projetado.
            </p>
            <p className="text-gray-500 text-[11px] mt-1">
              Cota Itacoatiara permaneceria acima de {cotaItaAlvo_m.toFixed(2)} m durante todo o período.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // dias contados de HOJE até uma data ISO (não da data do último dado, que tem lag).
  // Usado tanto no headline quanto na banda P10/P50/P90 — senão a contagem "trava".
  const diasDeHoje = (dataISO: string | null, fallback: number | null): number | null => {
    if (!dataISO) return fallback;
    const ymd = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    const n = new Date();
    const [ay, am, ad] = dataISO.split("-").map(Number);
    return ymd(ay, am, ad) - ymd(n.getFullYear(), n.getMonth() + 1, n.getDate());
  };

  const data_headline = eta_an.data_p50;
  const dias_headline = diasDeHoje(data_headline, eta_an.dias_p50) ?? eta_an.dias_p50;
  const dias_p10 = diasDeHoje(eta_an.data_p10, eta_an.dias_p10);
  const dias_p50 = diasDeHoje(eta_an.data_p50, eta_an.dias_p50);
  const dias_p90 = diasDeHoje(eta_an.data_p90, eta_an.dias_p90);

  const urgencia = dias_headline <= 30 ? "vermelho"
                 : dias_headline <= 90 ? "ouro"
                 : dias_headline <= 180 ? "verde"
                 : "white";
  const corMap = {
    vermelho: { bg: "bg-vermelho/10 border-vermelho/40", texto: "text-vermelho" },
    ouro:     { bg: "bg-ouro/10 border-ouro/40",         texto: "text-ouro" },
    verde:    { bg: "bg-verde/10 border-verde/40",       texto: "text-verde" },
    white:    { bg: "bg-azul-marinho border-white/20",   texto: "text-white" },
  }[urgencia];

  return (
    <div className={`rounded-lg p-4 border mb-5 ${corMap.bg}`}>
      <div className="flex items-start gap-3 mb-3">
        <Calendar size={18} className={`${corMap.texto} mt-0.5 shrink-0`} />
        <div className="flex-1">
          <p className={`${corMap.texto} text-[11px] font-bold uppercase tracking-wider mb-1`}>
            ETA · CMR &lt; {calado.toFixed(1)} m (seu calado-alvo)
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`${corMap.texto} font-extrabold text-2xl`}>
              {formataDataLonga(data_headline)}
            </span>
            <span className="text-gray-300 text-sm">
              em <strong>{dias_headline} dias</strong>
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-verde/15 text-verde border border-verde/30 px-2 py-0.5 rounded-full font-bold">
              via análogos · ano gêmeo {eta_an.ano_top}
            </span>
          </div>
          <p className="text-gray-400 text-[11px] mt-1">
            Itacoatiara projetada em <strong className="text-gray-300">{cotaItaAlvo_m.toFixed(2)} m</strong> nessa data.
          </p>
        </div>
      </div>

      {/* ── Banda empírica análogos ── */}
      <div className="bg-verde/5 border border-verde/20 rounded p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-verde text-[10px] font-bold uppercase tracking-wider">
            Análogos históricos · banda empírica
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-[11px] mb-2">
          <div className="bg-azul-medio/40 rounded p-2 border border-white/5">
            <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">P10 precoce</p>
            <p className="text-white font-semibold">
              {formataDataLonga(eta_an.data_p10)}
              {dias_p10 != null && <span className="text-gray-400 ml-1">· {dias_p10}d</span>}
            </p>
          </div>
          <div className="bg-verde/15 rounded p-2 border border-verde/30">
            <p className="text-verde uppercase tracking-wider text-[10px] mb-0.5">P50 mediana</p>
            <p className="text-white font-bold">
              {formataDataLonga(eta_an.data_p50)}
              {dias_p50 != null && <span className="text-gray-300 ml-1">· {dias_p50}d</span>}
            </p>
          </div>
          <div className="bg-azul-medio/40 rounded p-2 border border-white/5">
            <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">P90 tardia</p>
            <p className="text-white font-semibold">
              {formataDataLonga(eta_an.data_p90)}
              {dias_p90 != null && <span className="text-gray-400 ml-1">· {dias_p90}d</span>}
            </p>
          </div>
        </div>
      </div>

      {!isAssinante && (
        <p className="text-gray-500 text-[10px] mt-2 leading-relaxed">
          Calado-alvo fixo em 11m (versão gratuita) — assinantes recalculam dinamicamente.
        </p>
      )}
    </div>
  );
}
