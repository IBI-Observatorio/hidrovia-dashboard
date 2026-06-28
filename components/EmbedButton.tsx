"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Botão discreto "Copiar embed". Monta o <iframe> apontando para a origin atual
// (sem hardcode de domínio) e copia para a área de transferência.
export default function EmbedButton({
  modulo,
  altura = 600,
}: {
  modulo: string;
  altura?: number;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const origin = window.location.origin;
    const code = `<iframe src="${origin}/embed/${modulo}" width="100%" height="${altura}" frameborder="0" style="border:0;border-radius:12px"></iframe>`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (contexto não seguro / permissão negada) — silencioso
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
    >
      {copiado ? <Check size={14} className="text-ibi-green" /> : <Copy size={14} />}
      {copiado ? "Copiado!" : "Copiar embed"}
    </button>
  );
}
