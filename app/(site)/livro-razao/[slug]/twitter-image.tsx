import { cartaoFicha, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/cartoes";
import { FICHAS } from "@/lib/livro-razao/registry";

export const alt = "Ficha de projeto · Livro-Razão da Infraestrutura | Observatório IBI";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return FICHAS.map((f) => ({ slug: f.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return cartaoFicha(slug);
}
