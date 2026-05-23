"use client";

import { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState(false);

  async function submit() {
    if (!email.includes("@")) {
      setErro(true);
      return;
    }
    setErro(false);
    // FASE 4: ligar ao backend — POST /api/subscribe (mesmo padrão de /api/auth).
    // try { await fetch("/api/subscribe", { method: "POST", body: JSON.stringify({ email }) }); } catch {}
    setOk(true);
  }

  if (ok) {
    return (
      <div className="flex min-h-[52px] items-center justify-center gap-2.5 text-lg font-semibold text-ibi-green">
        ✓ Pronto! Você receberá os dados do próximo fechamento.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[460px] flex-wrap gap-2.5">
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErro(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="seu@email.com"
        className={`min-w-[220px] flex-1 rounded-full border bg-black/35 px-5 py-3.5 text-sm text-white outline-none transition-colors placeholder:text-gray-500 ${
          erro ? "border-vermelho" : "border-white/15 focus:border-ibi-blue"
        }`}
      />
      <button
        onClick={submit}
        className="rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Quero receber
      </button>
    </div>
  );
}
