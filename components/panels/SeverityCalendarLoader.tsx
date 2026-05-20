"use client";

import dynamic from "next/dynamic";

const SeverityCalendarPanel = dynamic(
  () => import("@/components/panels/SeverityCalendarPanel"),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-white/5 rounded-lg" /> }
);

export default function SeverityCalendarLoader() {
  return <SeverityCalendarPanel />;
}
