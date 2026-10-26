// Página de indicador ANTAQ. Confere o slug no manifest no servidor: indicador
// que não está publicado vira 404 de verdade (antes respondia 200 com a
// mensagem "Indicador não encontrado" montada no cliente).
import { notFound } from 'next/navigation';
import manifest from '@/public/data/antaq/manifest.json';
import IndicadorView from './IndicadorView';

export default async function IndicadorPage({ params }) {
  const { cluster, slug } = await params;
  const publicado = manifest.indicadores.some(
    (i) => i.cluster === cluster && i.slug === slug,
  );
  if (!publicado) notFound();
  return <IndicadorView />;
}
