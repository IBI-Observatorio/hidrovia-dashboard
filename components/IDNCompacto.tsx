// IDN compacto — versão enxuta para o embed Aquaviário.
//
// Renderiza SÓ o essencial do IDN: velocímetro + número + regime. NÃO usa o
// DessincronizacaoGauge completo do /monitor (que embute série histórica, HMM,
// vazão e PCA, ~1770px). O /monitor segue com o painel completo — este é um
// componente separado, server-only, sem recharts.
//
// Recebe o escalar IDN já computado pela fonte (getAquaviarioSnapshot) — não
// recalcula nem serializa séries pesadas no payload do embed.

import { CALIBRACAO_IDN } from "@/lib/limiares-idn";
import type { AquaviarioSnapshot } from "@/lib/modulos/aquaviario";

// Mesmo velocímetro do DessincronizacaoGauge — zonas pelas fronteiras GMM.
function Velocimetro({ idn, cor }: { idn: number; cor: string }) {
  const idnVis = Number.isFinite(idn) ? Math.max(-1, Math.min(1, idn)) : 0;
  const cx = 100, cy = 90, rArc = 90, rPtr = 70;

  function pt(v: number, r: number) {
    const theta = ((90 - v * 90) * Math.PI) / 180;
    return {
      x: +(cx + r * Math.cos(theta)).toFixed(2),
      y: +(cy - r * Math.sin(theta)).toFixed(2),
    };
  }

  const fSul = CALIBRACAO_IDN.fronteiras[0];
  const fNorte = CALIBRACAO_IDN.fronteiras[1];
  const pSul = pt(fSul, rArc);
  const pNorte = pt(fNorte, rArc);
  const ptr = pt(idnVis, rPtr);

  return (
    <svg viewBox="-4 -8 208 124" className="w-full max-w-[200px] mx-auto">
      <path d="M 10 90 A 90 90 0 0 1 190 90" fill="none" stroke="#2c2c2c" strokeWidth="18" strokeLinecap="round" />
      <path d={`M 10 90 A 90 90 0 0 1 ${pSul.x} ${pSul.y}`}
            fill="none" stroke="#A0153E" strokeWidth="18" strokeLinecap="round" opacity={0.75} />
      <path d={`M ${pSul.x} ${pSul.y} A 90 90 0 0 1 ${pNorte.x} ${pNorte.y}`}
            fill="none" stroke="#00C04B" strokeWidth="18" strokeLinecap="round" opacity={0.75} />
      <path d={`M ${pNorte.x} ${pNorte.y} A 90 90 0 0 1 190 90`}
            fill="none" stroke="#D4922A" strokeWidth="18" strokeLinecap="round" opacity={0.75} />

      <line x1={cx} y1={cy} x2={ptr.x} y2={ptr.y} stroke={cor} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={cor} />

      <text x="2"   y="108" fill="#6B7280" fontSize="9" textAnchor="start">−1</text>
      <text x="100" y="108" fill="#6B7280" fontSize="9" textAnchor="middle">0</text>
      <text x="198" y="108" fill="#6B7280" fontSize="9" textAnchor="end">+1</text>
    </svg>
  );
}

export default function IDNCompacto({ idn }: { idn: AquaviarioSnapshot["idn"] }) {
  const fSul = CALIBRACAO_IDN.fronteiras[0].toFixed(2).replace(".", ",");
  const fNorte = CALIBRACAO_IDN.fronteiras[1].toFixed(2).replace(".", ",");

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-3">
        IDN · Índice de Dessincronização Norte–Sul
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <Velocimetro idn={idn.valor} cor={idn.cor} />
        <div className="text-center sm:text-left">
          <p className="text-4xl font-extrabold tabular-nums" style={{ color: idn.cor }}>
            {idn.valor > 0 ? "+" : ""}{idn.valor.toFixed(2)}
          </p>
          <p className="font-bold text-lg mt-0.5" style={{ color: idn.cor }}>
            {idn.regime}
          </p>
          <p className="text-gray-400 text-sm">{idn.descricao}</p>
          <p className="text-gray-600 text-[10px] mt-2 tracking-wide">
            Fronteiras GMM:{" "}
            <span className="text-vermelho/80">≤ {fSul}</span>
            {" · "}<span className="text-verde/80">neutro</span>
            {" · "}<span className="text-ouro/80">≥ +{fNorte}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
