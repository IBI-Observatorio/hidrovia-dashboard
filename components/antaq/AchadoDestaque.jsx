"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { CORES_CLUSTER, DATA_BASE } from './cores';

/**
 * Card editorial grande para os 3 achados em destaque na landing /portos.
 *
 * Props:
 *   indicador      — registro do manifest.json
 *   numero         — string com o número-âncora (ex: "R$ 14 bi", "+0,77")
 *   numeroLabel    — descrição curta sob o número (ex: "por ano em navio parado")
 *   punchline      — frase editorial logo acima do CTA
 *   clusterNome    — nome humano do cluster (ex: "Eficiência Operacional")
 *   delay          — atraso da animação de entrada
 */
export default function AchadoDestaque({
  indicador,
  numero,
  numeroLabel,
  punchline,
  clusterNome,
  delay = 0,
}) {
  const cor = CORES_CLUSTER[indicador.cluster] || '#0099D8';
  const href = `/portos/${indicador.cluster}/${indicador.slug}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group flex flex-col overflow-hidden rounded-3xl
                 border border-gray-700 bg-gray-900/70 backdrop-blur
                 transition-all hover:border-ibi-blue/60
                 hover:shadow-2xl hover:shadow-ibi-blue/10"
    >
      {/* faixa de cor do cluster */}
      <div className="h-1.5 w-full" style={{ backgroundColor: cor }} />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
        {/* metadados topo */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className="rounded-full px-2.5 py-1 font-medium"
            style={{ backgroundColor: `${cor}20`, color: cor }}
          >
            {clusterNome}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full
                            bg-yellow-400/10 px-2.5 py-1 text-yellow-400">
            <Star className="h-3 w-3" fill="currentColor" /> Inédito IBI
          </span>
          <span className="ml-auto font-mono text-gray-500">
            #{indicador.id}
          </span>
        </div>

        {/* número-âncora gigante */}
        <div>
          <div className="text-5xl font-bold leading-none tracking-tight"
               style={{ color: cor }}>
            {numero}
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {numeroLabel}
          </div>
        </div>

        {/* preview da figura */}
        {indicador.imagem && (
          <div className="overflow-hidden rounded-xl bg-white">
            <img
              src={`${DATA_BASE}/${indicador.imagem}`}
              alt={indicador.titulo}
              className="h-48 w-full object-contain transition-transform
                          duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        )}

        {/* punchline editorial */}
        <p className="text-base leading-relaxed text-gray-200">
          {punchline}
        </p>

        {/* título + CTA */}
        <div className="mt-auto flex items-end justify-between gap-4 pt-2">
          <h3 className="text-lg font-semibold leading-tight text-white">
            {indicador.titulo}
          </h3>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg
                        border border-gray-700 px-3 py-2 text-sm
                        text-gray-200 transition-all
                        group-hover:border-ibi-blue group-hover:bg-ibi-blue
                        group-hover:text-white"
          >
            Ler análise <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
