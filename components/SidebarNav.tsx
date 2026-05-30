"use client";

import { useEffect, useState } from "react";

// Sections specific to /monitor — no external copy dependency.
const SECTIONS = [
  { id: "reguas-atuais",           label: "Réguas atuais" },
  { id: "indice-dessincronizacao", label: "Dessincronização N–S" },
  { id: "manaus-itacoatiara",      label: "Manaus × Itacoatiara" },
  { id: "cotagramas",              label: "Comparação histórica" },
  { id: "previsao-alertas",        label: "Previsão e alertas" },
  { id: "faq",                     label: "Perguntas frequentes" },
  { id: "glossario",               label: "Glossário" },
] as const;

export default function SidebarNav() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });

    return () => obs.disconnect();
  }, []);

  return (
    <nav className="sticky top-14 z-30 bg-azul-marinho/95 backdrop-blur border-b border-white/5">
      <div className="max-w-screen-xl mx-auto px-4">
        <ul className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          <li className="shrink-0">
            <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest pr-3 border-r border-white/10 mr-1">
              Nesta página
            </span>
          </li>
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className={`block px-3 py-1 rounded-full text-xs transition-colors whitespace-nowrap ${
                  active === s.id
                    ? "bg-verde/10 text-verde font-semibold border border-verde/30"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
