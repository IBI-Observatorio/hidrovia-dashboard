"use client";

// Widget interativo do IRC-Tabocal com slider de calado-alvo parametrizável.
// O usuário define o calado-alvo da sua operação e o IRC se ajusta em tempo
// real. Persistência:
//   - localStorage: lembra entre visitas
//   - URL param `?calado=10.5`: deep link / citação em contratos

import { useState, useEffect } from "react";
import {
  type SnapshotIRCTabocal,
} from "@/lib/irc-tabocal";
import caladoCapitania from "@/public/data/calado-capitania.json";
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
                Ajuste para refletir o calado máximo dos seus comboios e compare com o calado oficial.
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

      {/* ── Calado-alvo × calado oficial da Capitania (sem projeção própria) ── */}
      <CaladoAlvoPainel calado={calado} isAssinante={isAssinante} />

    </div>
  );
}

// ─── Calado-alvo × calado oficial da Capitania ──────────────────────────────
// Só números publicados pela Capitania (CFAOC): o calado de hoje e a previsão
// de poucos dias que ela mesma divulga. Nenhuma projeção de modelo do IBI.

const fmtM = (v: number) => v.toFixed(2).replace(".", ",");
const fmtDM = (iso: string) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };

function CaladoAlvoPainel({ calado, isAssinante }: { calado: number; isAssinante: boolean }) {
  const u = caladoCapitania.ultimo;
  const prev = caladoCapitania.previsao_capitania;
  const margem = u.demais - calado;
  const abaixo = margem < 0;
  const cruza = abaixo ? null : prev.find((p) => p.demais < calado) ?? null;
  const fimPrevisao = prev.at(-1)?.data ?? null;

  const cor = abaixo ? "vermelho" : cruza ? "ouro" : "verde";
  const corMap = {
    vermelho: { bg: "bg-vermelho/10 border-vermelho/40", texto: "text-vermelho" },
    ouro:     { bg: "bg-ouro/10 border-ouro/40",         texto: "text-ouro" },
    verde:    { bg: "bg-verde/10 border-verde/40",       texto: "text-verde" },
  }[cor];

  return (
    <div className={`rounded-lg p-4 border mb-5 ${corMap.bg}`}>
      <div className="flex items-start gap-3">
        <Calendar size={18} className={`${corMap.texto} mt-0.5 shrink-0`} />
        <div className="flex-1">
          <p className={`${corMap.texto} text-[11px] font-bold uppercase tracking-wider mb-1`}>
            Seu calado-alvo ({calado.toFixed(1)} m) × calado oficial da Capitania
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`${corMap.texto} font-extrabold text-2xl`}>
              {margem > 0 ? "+" : ""}{fmtM(margem)} m
            </span>
            <span className="text-gray-300 text-sm">
              de margem · oficial em {fmtDM(u.data)}: <strong>{fmtM(u.demais)} m</strong> (demais cargas)
            </span>
          </div>
          <p className="text-gray-400 text-[11px] mt-1">
            {abaixo
              ? "O calado oficial já está abaixo do seu alvo."
              : cruza
              ? <>Pela previsão da própria Capitania, cai abaixo do seu alvo em <strong className="text-gray-200">{fmtDM(cruza.data)}</strong> ({fmtM(cruza.demais)} m).</>
              : fimPrevisao
              ? <>A previsão da Capitania não mostra o calado abaixo do seu alvo até {fmtDM(fimPrevisao)}.</>
              : "A Capitania não publicou previsão para os próximos dias."}
            {" "}Petróleo e gás: {fmtM(u.petroleo)} m.
          </p>
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
