// Logo SVG do IBI — Institut Brasileiro de Infraestrutura
// Baseado na identidade visual: azul-marinho + verde IBI
export default function LogoIBI({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IBI — Instituto Brasileiro de Infraestrutura"
    >
      {/* Barra verde lateral */}
      <rect x="0" y="0" width="4" height="40" fill="#00C04B" rx="2" />
      {/* Texto IBI */}
      <text x="10" y="16" fill="#FFFFFF" fontSize="14" fontWeight="800" fontFamily="Inter, Arial, sans-serif">
        IBI
      </text>
      {/* Linha divisória */}
      <line x1="10" y1="20" x2="116" y2="20" stroke="#00C04B" strokeWidth="0.5" opacity="0.4" />
      {/* Subtexto */}
      <text x="10" y="30" fill="#9CA3AF" fontSize="5.5" fontFamily="Inter, Arial, sans-serif" letterSpacing="0.5">
        INFRAESTRUTURA
      </text>
      <text x="10" y="37" fill="#9CA3AF" fontSize="5" fontFamily="Inter, Arial, sans-serif" letterSpacing="0.3">
        OBSERVATÓRIO DE TRANSPORTES
      </text>
    </svg>
  );
}

export function LogoFPPA({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FPPA — Frente Parlamentar"
    >
      <rect x="0" y="0" width="3" height="32" fill="#00C04B" rx="1.5" />
      <text x="8" y="13" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="Inter, Arial, sans-serif">
        FPPA
      </text>
      <line x1="8" y1="16" x2="96" y2="16" stroke="#00C04B" strokeWidth="0.5" opacity="0.4" />
      <text x="8" y="24" fill="#9CA3AF" fontSize="5" fontFamily="Inter, Arial, sans-serif" letterSpacing="0.3">
        FRENTE PARLAMENTAR
      </text>
      <text x="8" y="30" fill="#9CA3AF" fontSize="4.5" fontFamily="Inter, Arial, sans-serif" letterSpacing="0.2">
        DO PORTO AMARELO
      </text>
    </svg>
  );
}
