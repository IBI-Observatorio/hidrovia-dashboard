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
    <nav className="text-xs">
      <p className="text-gray-500 font-semibold uppercase tracking-widest mb-4 text-[10px]">
        Nesta página
      </p>
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`block py-1.5 px-2 rounded transition-colors leading-snug ${
                active === s.id
                  ? "text-verde bg-verde/5 font-medium"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
