"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import IndicadorCardPNG from '@/components/antaq/IndicadorCardPNG';
import { CORES_CLUSTER, DATA_BASE } from '@/components/antaq/cores';

export default function ClusterPage() {
  const { cluster: slugCluster } = useParams();
  const [manifest, setManifest] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch(`${DATA_BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(setManifest)
      .catch((e) => setErro(String(e)));
  }, []);

  if (erro) return <Estado msg={`Falha: ${erro}`} cor="text-red-400" />;
  if (!manifest) return <Estado msg="Carregando…" />;

  // Pré-lançamento: se o cluster só tem 1 indicador publicado, vai
  // direto para a página dele em vez de mostrar grid de 1 card só.
  const indsCluster = manifest.indicadores.filter(
    (i) => i.cluster === slugCluster,
  );
  if (indsCluster.length === 1) {
    return (
      redirect(`/portos/${slugCluster}/${indsCluster[0].slug}`)
    );
  }

  const cluster = manifest.clusters.find((c) => c.slug === slugCluster);
  if (!cluster) {
    return (
      <div className="min-h-screen bg-gray-900 pt-40 text-center">
        <p className="text-red-400">Cluster não encontrado: {slugCluster}</p>
        <Link href="/portos" className="mt-4 inline-flex items-center gap-2 text-ibi-blue">
          <ArrowLeft className="h-4 w-4" /> voltar
        </Link>
      </div>
    );
  }

  const indicadores = manifest.indicadores.filter((i) => i.cluster === slugCluster);
  const cor = CORES_CLUSTER[slugCluster] || '#0099D8';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <section className="border-b border-gray-800 bg-gradient-to-br
                          from-gray-900 via-ibi-dark to-gray-900 pt-32 pb-12">
        <div className="container mx-auto px-6">
          <Link href="/portos"
                className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400
                            hover:text-ibi-blue transition-colors">
            <ArrowLeft className="h-4 w-4" /> Todos os indicadores
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-lg px-3 py-1 text-sm font-mono"
                  style={{ backgroundColor: `${cor}25`, color: cor }}>
              Cluster {String(cluster.ordem).padStart(2, '0')}
            </span>
            <span className="text-sm text-gray-500">
              {indicadores.length} indicadores
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {cluster.nome}
          </h1>
          <p className="mt-3 max-w-3xl text-gray-400">{cluster.descricao}</p>
        </div>
      </section>

      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {indicadores.map((ind) => (
            <IndicadorCardPNG key={ind.id} indicador={ind} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Estado({ msg, cor = 'text-gray-400' }) {
  return (
    <div className="min-h-screen bg-gray-900 pt-40 text-center">
      <p className={cor}>{msg}</p>
    </div>
  );
}
