"use client";

// Painel do Copiloto do Radar (aba "Copiloto"). Tom de banco central: sóbrio, sem
// emoji, cores só por token. A IA NUNCA emite número aqui — os números de cenário
// vêm do motor (renderizados abaixo a partir do ScenarioResult devolvido pela rota)
// e os do explicador vêm dos dados (com a fonte anexada). Sem localStorage.

import { useState } from "react";
import { Send, AlertTriangle, Info, CheckCircle2, RotateCcw } from "lucide-react";
import { pct, sign, num } from "@/lib/radar/format";

type Fonte = { label: string; url?: string; date?: string };
type Levers = { tarifaMult: number; capexUplift: number; demandaHaircut: number; slipAnos: number; omAdjPp: number };

type Parte =
  | { tipo: "explicacao"; texto: string; fontes: Fonte[] }
  | { tipo: "cenario"; tir: number | null; spread: number | null; vpl: number; wacc: number; semTir: boolean; rotulo: string; leversAplicadas: Levers; clamps: string[]; narrativa: string }
  | { tipo: "confirmar"; interpretacao: string; leversPropostas: Levers; clamps: string[] }
  | { tipo: "reformular"; texto: string }
  | { tipo: "cenario-indisponivel"; texto: string }
  | { tipo: "erro"; texto: string };

interface Turno { pergunta: string; partes: Parte[] }

const EXEMPLOS = [
  "Por que a concessão travou?",
  "Qual é o déficit de funding?",
  "E se o CAPEX estourar 60% e o leilão atrasar 3 anos?",
  "E se a demanda vier 20% abaixo?",
];

export default function RadarCopilot({ assetId, assetName }: { assetId: string; assetName: string }) {
  const [pergunta, setPergunta] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function consultar(texto: string, leversConfirmadas?: Levers) {
    const q = texto.trim();
    if (!q || carregando) return;
    setCarregando(true);
    // Confirmação re-roda o MESMO turno; pergunta nova abre um turno.
    if (!leversConfirmadas) setTurnos((t) => [...t, { pergunta: q, partes: [] }]);
    try {
      const resp = await fetch("/api/radar/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, pergunta: q, ...(leversConfirmadas ? { leversConfirmadas } : {}) }),
      });
      const data = await resp.json().catch(() => null);
      const partes: Parte[] = resp.ok && data?.partes ? data.partes : [{ tipo: "erro", texto: data?.erro ?? "Falha ao consultar o copiloto." }];
      setTurnos((t) => {
        const novo = [...t];
        const alvo = novo.length - 1; // confirmação substitui o turno corrente; pergunta nova já empurrou um vazio
        novo[alvo] = { pergunta: novo[alvo]?.pergunta ?? q, partes };
        return novo;
      });
    } catch {
      setTurnos((t) => {
        const novo = [...t];
        novo[novo.length - 1] = { pergunta: q, partes: [{ tipo: "erro", texto: "Sem conexão com o copiloto." }] };
        return novo;
      });
    } finally {
      setCarregando(false);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const q = pergunta;
    setPergunta("");
    consultar(q);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Copiloto — {assetName}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Pergunte sobre o que já existe (maturação, risco, funding, alertas) ou simule um cenário
            (&quot;e se o CAPEX estourar 60%?&quot;). Os números das explicações vêm dos dados com fonte; os de
            cenário, do motor DCF. A IA não estima números.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-ouro/30 bg-ouro/10 px-2 py-0.5 text-[10px] font-medium text-ouro">
          <Info className="h-3 w-3" /> nada é chute · tudo tem fonte
        </span>
      </header>

      {/* histórico */}
      {turnos.length > 0 && (
        <div className="space-y-5">
          {turnos.map((t, i) => (
            <div key={i} className="space-y-3">
              <p className="text-sm font-medium text-gray-300">
                <span className="text-gray-500">›</span> {t.pergunta}
              </p>
              {t.partes.length === 0 && carregando && i === turnos.length - 1 ? (
                <p className="text-xs text-gray-500">Consultando os dados e o motor…</p>
              ) : (
                t.partes.map((p, j) => <ParteView key={j} parte={p} onConfirmar={(lv) => consultar(t.pergunta, lv)} carregando={carregando} />)
              )}
            </div>
          ))}
        </div>
      )}

      {/* exemplos (só antes da 1ª pergunta) */}
      {turnos.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXEMPLOS.map((ex) => (
            <button
              key={ex}
              onClick={() => consultar(ex)}
              className="rounded-full border border-white/10 bg-azul-medio px-3 py-1.5 text-xs text-gray-300 transition hover:border-ibi-blue/40 hover:text-white"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* entrada */}
      <form onSubmit={enviar} className="flex items-center gap-2">
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunte ao copiloto…"
          className="flex-1 rounded-xl border border-white/10 bg-azul-medio px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-ibi-blue/50"
        />
        <button
          type="submit"
          disabled={carregando || !pergunta.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ibi-green px-4 py-2.5 text-sm font-medium text-azul-marinho transition disabled:opacity-40"
        >
          <Send className="h-4 w-4" /> Enviar
        </button>
      </form>
    </div>
  );
}

// ───────────────────────── render de cada parte ─────────────────────────
function ParteView({ parte, onConfirmar, carregando }: { parte: Parte; onConfirmar: (lv: Levers) => void; carregando: boolean }) {
  switch (parte.tipo) {
    case "explicacao":
      return (
        <div className="rounded-2xl border border-white/10 bg-azul-medio p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-200">{parte.texto}</p>
          {parte.fontes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
              {parte.fontes.map((f, i) => (
                <span key={i} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-500" title={f.url ?? f.label}>
                  {f.label}{f.date ? ` · ${f.date}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case "cenario": {
      // semTir = capital não retorna no horizonte: NUNCA mostrar número falso (0%).
      const negativo = parte.semTir || (parte.spread != null && parte.spread < 0);
      const cor = negativo ? "text-vermelho" : "text-ibi-green";
      return (
        <div className={`rounded-2xl border ${negativo ? "border-vermelho/40" : "border-ibi-green/40"} bg-azul-medio p-5`}>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Cenário hipotético · motor DCF</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${negativo ? "bg-vermelho/10 text-vermelho" : "bg-ibi-green/10 text-ibi-green"}`}>
              {parte.semTir ? "sem TIR" : `spread ${sign(parte.spread!)}`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Metrica rotulo="TIR" valor={parte.semTir ? "sem TIR" : pct(parte.tir!)} cor={cor} />
            <Metrica rotulo={`vs WACC ${pct(parte.wacc, 1)}`} valor={parte.spread == null ? "—" : sign(parte.spread)} cor={cor} />
            <Metrica rotulo="VPL ao WACC" valor={`${num(parte.vpl, 1)} bi`} cor="text-white" />
          </div>
          {parte.semTir && (
            <p className="mt-2 text-[11px] text-vermelho">
              Capital não retorna no horizonte da concessão — não há TIR; o VPL ao WACC permanece negativo.
            </p>
          )}
          <p className="mt-3 text-[11px] text-gray-500">
            Alavancas aplicadas: <span className="text-gray-300">{parte.rotulo}</span>
          </p>
          {parte.clamps.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-ouro">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{parte.clamps.join("; ")}.</span>
            </div>
          )}
          {parte.narrativa && <p className="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-gray-300">{parte.narrativa}</p>}
        </div>
      );
    }

    case "confirmar":
      return (
        <div className="rounded-2xl border border-ouro/30 bg-ouro/5 p-4">
          <p className="text-sm text-gray-200">
            Entendi como: <span className="font-medium text-ouro">{parte.interpretacao}</span>. Confirma para calcular?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onConfirmar(parte.leversPropostas)}
              disabled={carregando}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ibi-green px-3 py-1.5 text-xs font-medium text-azul-marinho disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <RotateCcw className="h-3 w-3" /> ou reformule com números explícitos
            </span>
          </div>
        </div>
      );

    case "reformular":
    case "cenario-indisponivel":
      return (
        <div className="rounded-2xl border border-white/10 bg-azul-medio p-4">
          <p className="text-sm text-gray-300">{parte.texto}</p>
        </div>
      );

    case "erro":
      return (
        <div className="flex items-start gap-2 rounded-2xl border border-vermelho/30 bg-vermelho/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-vermelho" />
          <p className="text-sm text-gray-300">{parte.texto}</p>
        </div>
      );
  }
}

function Metrica({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-azul-marinho/40 p-3">
      <p className="text-[10px] text-gray-500">{rotulo}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}
