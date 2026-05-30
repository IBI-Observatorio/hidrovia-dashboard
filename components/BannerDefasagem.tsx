// Banner de aviso quando os dados estão defasados (sem atualização recente
// via API ANA). Server-component — recebe a última data do fetch e calcula
// o atraso em dias.

import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  ultimaAtualizacao: string; // "YYYY-MM-DD"
  fonteANA: boolean;
}

const LIMITE_DIAS_NORMAL = 2;       // <=2d: tudo OK
const LIMITE_DIAS_ATRASO = 7;       // 3-7d: atenção
                                    // >7d:  alerta

function diferencaDias(iso: string): number {
  const hoje = new Date();
  const dt = new Date(iso + "T00:00:00");
  const diff = Math.floor((hoje.getTime() - dt.getTime()) / 86400000);
  return Math.max(0, diff);
}

// "YYYY-MM-DD" → "DD/MM/YYYY" (padrão brasileiro). Reformata a string direto,
// sem `new Date`, para não correr risco de deslocamento de fuso.
function isoParaBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default function BannerDefasagem({ ultimaAtualizacao, fonteANA }: Props) {
  if (!ultimaAtualizacao || ultimaAtualizacao === "—") return null;
  const dias = diferencaDias(ultimaAtualizacao);

  if (dias <= LIMITE_DIAS_NORMAL) {
    return (
      <div className="bg-verde/10 border border-verde/40 rounded p-2 flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-4 h-4 text-verde flex-shrink-0" />
        <span className="text-gray-300">
          Dados <strong className="text-verde">atualizados</strong> — última leitura em {isoParaBR(ultimaAtualizacao)}
          {fonteANA && " (API ANA)"}
        </span>
      </div>
    );
  }

  const cor = dias <= LIMITE_DIAS_ATRASO ? "ouro" : "vermelho";
  const nivel = dias <= LIMITE_DIAS_ATRASO ? "ATENÇÃO" : "ALERTA";
  const corMap: Record<string, string> = {
    ouro:     "bg-ouro/10 border-ouro/50 text-ouro",
    vermelho: "bg-vermelho/10 border-vermelho/50 text-vermelho",
  };

  return (
    <div className={`${corMap[cor]} border rounded p-3 flex items-start gap-2 text-sm`}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">
          {nivel} — Dados defasados há {dias} dias
        </p>
        <p className="text-gray-300 text-xs mt-1">
          Última leitura consolidada: <strong>{isoParaBR(ultimaAtualizacao)}</strong>.
          {dias > LIMITE_DIAS_ATRASO ? (
            <> Possíveis causas: indisponibilidade da API ANA (descontinuação prevista em 30/jun/2026),
            falha telemétrica nas estações, ou rotina de atualização de CSVs em atraso.
            Os valores exibidos podem não refletir o estado hidrológico atual da bacia.</>
          ) : (
            <> Atualização normal pode levar 1-3 dias úteis (consolidação e cache da API ANA).</>
          )}
        </p>
      </div>
    </div>
  );
}
