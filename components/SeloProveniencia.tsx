import { ShieldCheck, FlaskConical } from "lucide-react";
import type { Proveniencia } from "@/lib/custo-evitavel";

// Marca a origem de um número. Regra da casa: dado oficial e estimativa IBI
// nunca se confundem — dois estados visualmente distintos (azul × ouro).
// Componente estático (sem interatividade), logo server component.
export default function SeloProveniencia({ tipo, fonte }: Proveniencia) {
  const oficial = tipo === "oficial";
  const estilo = oficial
    ? "border-ibi-blue/40 bg-ibi-blue/10 text-ibi-blue"
    : "border-ouro/40 bg-ouro/10 text-ouro";
  const Icone = oficial ? ShieldCheck : FlaskConical;
  const rotulo = oficial ? "Dado oficial" : "Estimativa IBI";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold uppercase tracking-wide ${estilo}`}
      >
        <Icone size={13} aria-hidden />
        {rotulo}
      </span>
      <span className="text-gray-500">{fonte}</span>
    </div>
  );
}
