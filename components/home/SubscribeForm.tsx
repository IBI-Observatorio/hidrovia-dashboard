"use client";

import { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function submit() {
    if (!email.includes("@")) {
      setErro(true);
      return;
    }
    setErro(false);
    setEnviando(true);
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error("falha");
      setOk(true);
    } catch {
      setErro(true);
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div className="flex min-h-[52px] items-center justify-center gap-2.5 text-lg font-semibold text-ibi-green">
        ✓ Pronto! Você receberá os dados do próximo fechamento.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[460px]">
      <div className="flex flex-wrap gap-2.5">
        <input
          type="email"
          value={email}
          disabled={enviando}
          onChange={(e) => {
            setEmail(e.target.value);
            setErro(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && !enviando && submit()}
          placeholder="seu@email.com"
          className={`min-w-[220px] flex-1 rounded-full border bg-black/35 px-5 py-3.5 text-sm text-white outline-none transition-colors placeholder:text-gray-500 disabled:opacity-60 ${
            erro ? "border-vermelho" : "border-white/15 focus:border-ibi-blue"
          }`}
        />
        <button
          onClick={submit}
          disabled={enviando}
          className="rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Quero receber"}
        </button>
      </div>
      {erro && (
        <p className="mt-2.5 text-center text-sm text-vermelho">
          Não foi possível inscrever esse e-mail. Verifique o endereço e tente de novo.
        </p>
      )}
    </div>
  );
}
