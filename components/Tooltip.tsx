"use client";

import { Info } from "lucide-react";

interface TooltipProps {
  conteudo: string;
  children?: React.ReactNode;
  posicao?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({ conteudo, children, posicao = "top" }: TooltipProps) {
  const posClasses = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span className="relative group inline-flex items-center">
      {children ?? <Info size={13} className="text-gray-500 group-hover:text-gray-300 cursor-help transition-colors" />}
      <span
        className={`absolute ${posClasses[posicao]} z-50 w-56 px-2.5 py-1.5
                    bg-azul-marinho border border-white/20 rounded-lg shadow-xl
                    text-xs text-gray-300 leading-relaxed
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-150`}
        role="tooltip"
      >
        {conteudo}
        {/* Seta */}
        {posicao === "top" && (
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-azul-marinho" />
        )}
        {posicao === "bottom" && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-azul-marinho" />
        )}
      </span>
    </span>
  );
}
