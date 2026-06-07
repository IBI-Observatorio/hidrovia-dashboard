// Card de estado-vazio compartilhado do Radar (antes repetido em NotesFeed,
// Alerts, Backtest e no EmBreve da página de deep-dive).

import type { ReactNode } from "react";

export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-azul-medio/50 p-8 text-center text-sm text-gray-400">
      {children}
    </div>
  );
}
