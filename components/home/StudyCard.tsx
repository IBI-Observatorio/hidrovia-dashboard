import Link from "next/link";
import type { Estudo } from "@/lib/home-content";

const iconBoxCls: Record<Estudo["iconCor"], string> = {
  blue: "bg-ibi-blue/12 text-ibi-blue",
  green: "bg-ibi-green/12 text-ibi-green",
  ouro: "bg-ouro/15 text-ouro",
};

const destaqueCls: Record<Estudo["iconCor"], string> = {
  blue: "text-ibi-blue",
  green: "text-ibi-green",
  ouro: "text-ouro",
};

const hoverBorder: Record<Estudo["iconCor"], string> = {
  blue: "hover:border-ibi-blue",
  green: "hover:border-ibi-green",
  ouro: "hover:border-ouro",
};

const badgeCls: Record<Estudo["status"], { txt: string; cls: string }> = {
  novo: { txt: "Novo", cls: "bg-ibi-blue/15 text-ibi-blue" },
  live: { txt: "No ar", cls: "bg-ibi-green/15 text-ibi-green" },
  breve: { txt: "Em breve", cls: "bg-white/5 text-gray-500" },
};

export default function StudyCard({ estudo }: { estudo: Estudo }) {
  const Icon = estudo.icon;
  const badge = badgeCls[estudo.status];
  return (
    <Link
      href={estudo.href}
      className={`group flex min-h-[200px] flex-col gap-3.5 rounded-2xl border border-white/10 bg-azul-medio p-6 transition-all hover:-translate-y-1 ${hoverBorder[estudo.iconCor]}`}
    >
      <div
        className={`flex h-[46px] w-[46px] items-center justify-center rounded-xl ${iconBoxCls[estudo.iconCor]}`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h3 className="flex items-center gap-2.5 text-[1.12rem] font-bold">
        {estudo.titulo}
        <span
          className={`rounded px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.06em] ${badge.cls}`}
        >
          {badge.txt}
        </span>
      </h3>
      <p className="text-[0.86rem] leading-[1.5] text-gray-400">{estudo.descricao}</p>
      <div className="mt-auto flex items-center justify-between text-[0.8rem] font-bold">
        <span className={destaqueCls[estudo.iconCor]}>{estudo.destaque}</span>
        <span className="text-gray-300 transition-transform group-hover:translate-x-1">abrir →</span>
      </div>
    </Link>
  );
}
