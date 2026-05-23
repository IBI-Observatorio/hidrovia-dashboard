"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { CORES_CLUSTER, DATA_BASE } from './cores';

/**
 * Card de indicador baseado em PNG (matplotlib).
 * Usado pelos 23 indicadores não-destaque.
 *
 * Props:
 *   indicador: registro do manifest.json (id, slug, titulo, cluster,
 *              destaque, granularidade, imagem)
 *   compact:   versão reduzida (sem PNG, só título + selo) para listas densas
 */
export default function IndicadorCardPNG({ indicador, compact = false }) {
  const corCluster = CORES_CLUSTER[indicador.cluster] || '#0099D8';
  const href = `/portos/${indicador.cluster}/${indicador.slug}`;

  if (compact) {
    return (
      <Link
        href={href}
        className="group block rounded-xl border border-gray-700 bg-gray-900/50
                   p-4 transition-all hover:border-ibi-blue hover:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
              <span style={{ color: corCluster }}>#{indicador.id}</span>
              {indicador.destaque && <Star className="h-3 w-3 text-yellow-400" fill="currentColor" />}
            </div>
            <h4 className="text-sm font-medium text-white group-hover:text-ibi-blue">
              {indicador.titulo}
            </h4>
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-ibi-blue" />
        </div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-700
                 bg-gray-900/60 transition-all hover:border-ibi-blue hover:shadow-xl
                 hover:shadow-ibi-blue/10"
    >
      <Link href={href} className="flex flex-col h-full">
        {indicador.imagem && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-white">
            <img
              src={`${DATA_BASE}/${indicador.imagem}`}
              alt={indicador.titulo}
              className="h-full w-full object-contain transition-transform duration-300
                         group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="rounded-full px-2 py-0.5 font-mono"
              style={{ backgroundColor: `${corCluster}25`, color: corCluster }}
            >
              #{indicador.id}
            </span>
            {indicador.destaque && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-yellow-400">
                <Star className="h-3 w-3" fill="currentColor" /> Inédito IBI
              </span>
            )}
            <span className="ml-auto text-gray-500 capitalize">
              {indicador.granularidade}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-ibi-blue
                          transition-colors">
            {indicador.titulo}
          </h3>
          <div className="mt-auto flex items-center justify-end text-sm
                          text-ibi-blue opacity-0 group-hover:opacity-100 transition-opacity">
            Ver detalhes <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
