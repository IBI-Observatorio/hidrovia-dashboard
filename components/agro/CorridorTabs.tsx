"use client";

// CorridorTabs — seletor de corredor (tabs simples, controlado).
// O estado vive em quem renderiza (ComponentBreakdown); aqui só UI.

import { agroCopy } from "@/lib/agro-copy";
import type { Corredor } from "@/lib/iee";

const ORDEM: Corredor[] = ["santos", "paranagua", "arco-norte"];

export default function CorridorTabs({
  value,
  onChange,
}: {
  value: Corredor;
  onChange: (c: Corredor) => void;
}) {
  return (
    <div role="tablist" aria-label="Corredor de exportação" className="flex flex-wrap gap-2">
      {ORDEM.map((c) => {
        const ativo = c === value;
        return (
          <button
            key={c}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
              ativo
                ? "border-ibi-green/40 bg-ibi-green/10 text-white"
                : "border-white/10 bg-transparent text-gray-400 hover:text-white"
            }`}
          >
            {agroCopy.corredores[c].nome}
          </button>
        );
      })}
    </div>
  );
}
