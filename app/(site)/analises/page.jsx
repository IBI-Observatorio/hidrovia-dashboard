"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ExternalLink, ArrowRight, TrendingDown, Anchor, Waves } from 'lucide-react';
import BackLink from '@/components/BackLink';

const analises = [
  {
    eyebrow: 'Logística rodoviária',
    title: 'Sobrecusto Rodoviário',
    description:
      'Estimativa do custo adicional imposto pela baixa qualidade das rodovias brasileiras sobre o transporte de cargas — por estado, produto e modal.',
    status: 'Disponível',
    statusColor: 'text-ibi-green border-ibi-green/30 bg-ibi-green/10',
    icon: TrendingDown,
    iconColor: 'text-ibi-green',
    href: '/sobrecusto-rodoviario',
    isExternal: false,
  },
  {
    eyebrow: 'Infraestrutura portuária',
    title: 'Portos',
    description:
      'Indicadores de desempenho dos principais complexos portuários brasileiros, com análise por cluster e movimentação de cargas.',
    status: 'Disponível',
    statusColor: 'text-ibi-blue border-ibi-blue/30 bg-ibi-blue/10',
    icon: Anchor,
    iconColor: 'text-ibi-blue',
    href: '/portos',
    isExternal: false,
  },
  {
    eyebrow: 'Hidrovias',
    title: 'Hidrologia Amazônica',
    description:
      'Monitor em tempo real de 8 estações fluviométricas da bacia do Amazonas, com índice de dessincronização Norte–Sul e estudo de caso da estiagem histórica de 2024.',
    status: 'Ao vivo',
    statusColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    icon: Waves,
    iconColor: 'text-emerald-400',
    href: '/hidrovia',
    isExternal: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function AnalisesPage() {
  const router = useRouter();

  const handleClick = (item) => {
    if (item.isExternal) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    } else {
      router.push(item.href);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <BackLink />
          <p className="text-ibi-green text-xs font-bold uppercase tracking-widest mb-3 mt-2">
            Observatório de Infraestrutura de Transportes · IBI
          </p>
          <h1 className="text-white text-4xl font-bold mb-4">Análises</h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            Estudos e dashboards sobre infraestrutura de transportes no Brasil,
            construídos com dados públicos oficiais.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {analises.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                onClick={() => handleClick(item)}
                className="group relative bg-gray-800 border border-white/10 rounded-2xl p-6 cursor-pointer
                           hover:border-white/20 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center ${item.iconColor}`}>
                  <Icon size={20} />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">
                    {item.eyebrow}
                  </p>
                  <h2 className="text-white font-bold text-lg mb-2 group-hover:text-ibi-green transition-colors duration-200">
                    {item.title}
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <span className="text-gray-500 group-hover:text-white transition-colors duration-200">
                    {item.isExternal
                      ? <ExternalLink size={16} />
                      : <ArrowRight size={16} />
                    }
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </div>
  );
}
