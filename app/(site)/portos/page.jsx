"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { motion } from 'framer-motion';
import { Anchor, ArrowRight, ChevronDown, TrendingUp } from 'lucide-react';
import AchadoDestaque from '@/components/antaq/AchadoDestaque';
import { CORES_CLUSTER, DATA_BASE } from '@/components/antaq/cores';

// IDs dos 3 achados em destaque na chamada do observatório.
// A ordem aqui é a ordem em que aparecem na landing.
const ACHADOS_DESTAQUE = [
  {
    id: '31',
    numero: '+11%',
    numeroLabel: 'ao ano — granel líquido lidera com o pré-sal',
    punchline:
      'Cada carga tem um ritmo diferente. Granel líquido (+11% a/a) acelera com o pré-sal, granel sólido cresce +7% com a safra recorde, e carga geral cai 3% enquanto o contêiner avança. Um modelo OLS projeta o ritmo do contêiner para os próximos 5 meses.',
  },
  {
    id: '32',
    numero: '~47%',
    numeroLabel: 'da "cabotagem" brasileira é petróleo offshore, não carga entre portos',
    punchline:
      'Quando a ANTAQ fala em cabotagem, junta duas coisas muito diferentes: cargas indo de um porto a outro e petróleo bombeado de plataformas do pré-sal (FPSO/ZEE). Separamos as duas — e a história muda completamente.',
  },
  {
    id: '33',
    numero: '+29%',
    numeroLabel: 'ao ano — Porto do Açu cresceu quase o dobro com o pré-sal',
    punchline:
      'Nem todos os portos crescem igual. Comparamos o CAGR de cada porto com a média nacional de cada carga: quem cresceu acima ganhou mercado, quem ficou abaixo perdeu espaço. A geografia portuária está se redesenhando.',
  },
];

export default function PortosLanding() {
  const [manifest, setManifest] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch(`${DATA_BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(setManifest)
      .catch((e) => setErro(String(e)));
  }, []);

  if (erro) return <Erro mensagem={erro} />;
  if (!manifest) return <Carregando />;

  // Pré-lançamento: se só 1 indicador publicado, redireciona direto
  // para a página dele (evita landing vazia).
  if (manifest.total_indicadores === 1 && manifest.indicadores[0]) {
    const unico = manifest.indicadores[0];
    return redirect(`/portos/${unico.cluster}/${unico.slug}`);
  }

  const indPorId = Object.fromEntries(manifest.indicadores.map((i) => [i.id, i]));
  const clustersPorSlug = Object.fromEntries(manifest.clusters.map((c) => [c.slug, c]));
  const achadosResolvidos = ACHADOS_DESTAQUE
    .map((a) => ({
      ...a,
      indicador: indPorId[a.id],
      clusterNome: indPorId[a.id]
        ? clustersPorSlug[indPorId[a.id].cluster]?.nome
        : null,
    }))
    .filter((a) => a.indicador);

  const idsDestaque = new Set(ACHADOS_DESTAQUE.map((a) => a.id));
  const restantes = manifest.indicadores.filter((i) => !idsDestaque.has(i.id));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* ────── HERO ────── */}
      <section className="relative overflow-hidden border-b border-gray-800
                          bg-gradient-to-br from-gray-900 via-ibi-dark to-gray-900
                          pt-32 pb-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full
                            border border-ibi-blue/40 bg-ibi-blue/10 px-3 py-1
                            text-sm text-ibi-blue">
              <Anchor className="h-4 w-4" />
              Observatório de Portos
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold
                            tracking-tight leading-[1.05]">
              Três achados que <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-ibi-blue to-ibi-green
                                 bg-clip-text text-transparent">
                redefinem o que sabemos
              </span>{' '}
              sobre os portos brasileiros.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-gray-300 leading-relaxed">
              Análises construídas a partir da base estatística da ANTAQ
              (2010–{manifest.cobertura?.fim || '2025'}) cruzadas com séries
              macroeconômicas do BCB. Atualizadas automaticamente a cada mês.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2
                              text-sm text-gray-500">
              <span>{manifest.total_indicadores} indicadores em 7 clusters temáticos</span>
              <span className="hidden md:inline">·</span>
              <span>Fonte: ANTAQ + BCB SGS</span>
              <span className="hidden md:inline">·</span>
              <span>
                Última atualização:{' '}
                <span className="text-gray-300">
                  {new Date(manifest.gerado_em).toLocaleDateString('pt-BR')}
                </span>
              </span>
            </div>
            <a href="#achados"
               className="mt-10 inline-flex items-center gap-2 text-sm
                          text-gray-400 hover:text-white transition-colors">
              Os três achados <ChevronDown className="h-4 w-4 animate-bounce" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ────── 3 ACHADOS EM DESTAQUE ────── */}
      <section id="achados" className="container mx-auto px-6 py-20">
        <div className="mb-10 max-w-3xl">
          <div className="text-sm font-medium text-ibi-green">
            Os três achados em destaque
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            Macro, narrativa e geografia
          </h2>
          <p className="mt-3 text-gray-400">
            Cada achado responde a uma pergunta diferente: o que os portos
            preveem? Quanto custa a ineficiência? E como a geografia do Brasil
            agroexportador se transformou.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {achadosResolvidos.map((a, i) => (
            <AchadoDestaque
              key={a.id}
              indicador={a.indicador}
              numero={a.numero}
              numeroLabel={a.numeroLabel}
              punchline={a.punchline}
              clusterNome={a.clusterNome}
              delay={i * 0.08}
            />
          ))}
        </div>
      </section>

      {/* ────── DEMAIS INDICADORES — POR CLUSTER ────── */}
      <section className="border-t border-gray-800 bg-gray-900/40">
        <div className="container mx-auto px-6 py-20">
          <div className="mb-10 max-w-3xl">
            <div className="text-sm font-medium text-ibi-blue">
              Os outros {restantes.length} indicadores
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Explore por cluster temático
            </h2>
            <p className="mt-3 text-gray-400">
              Eficiência operacional, contêineres, cabotagem, geopolítica,
              infraestrutura, agronegócio e análises inéditas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {manifest.clusters.map((c) => (
              <ClusterCard
                key={c.slug}
                cluster={c}
                excluindoIds={idsDestaque}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ClusterCard({ cluster, excluindoIds }) {
  const cor = CORES_CLUSTER[cluster.slug] || '#0099D8';
  const total = cluster.indicadores.filter((id) => !excluindoIds.has(id)).length;
  const totalOriginal = cluster.indicadores.length;
  return (
    <Link
      href={`/portos/${cluster.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-700
                  bg-gray-900/60 p-5 transition-all
                  hover:border-ibi-blue hover:bg-gray-900"
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="rounded-md px-2 py-1 text-xs font-mono"
          style={{ backgroundColor: `${cor}25`, color: cor }}
        >
          {String(cluster.ordem).padStart(2, '0')}
        </span>
        <span className="text-xs text-gray-500">
          {totalOriginal} indicadores
          {total !== totalOriginal && ` (${totalOriginal - total} em destaque)`}
        </span>
        <TrendingUp className="ml-auto h-4 w-4 text-gray-500
                                 group-hover:text-ibi-blue" />
      </div>
      <h3 className="text-lg font-semibold text-white">{cluster.nome}</h3>
      <p className="mt-2 flex-1 text-sm text-gray-400">{cluster.descricao}</p>
      <div className="mt-4 flex items-center justify-end text-sm text-ibi-blue
                       opacity-70 group-hover:opacity-100 transition-opacity">
        Explorar <ArrowRight className="ml-1 h-4 w-4" />
      </div>
    </Link>
  );
}

function Carregando() {
  return (
    <div className="min-h-screen bg-gray-900 pt-40 text-center text-gray-400">
      Carregando indicadores…
    </div>
  );
}

function Erro({ mensagem }) {
  return (
    <div className="min-h-screen bg-gray-900 pt-40 text-center">
      <p className="text-red-400">Falha ao carregar manifest dos indicadores.</p>
      <p className="text-sm text-gray-500 mt-2">{mensagem}</p>
    </div>
  );
}
