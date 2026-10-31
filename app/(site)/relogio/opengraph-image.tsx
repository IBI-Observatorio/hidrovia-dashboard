import { cartaoRelogio, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/cartoes";

export const alt = "Relógio da Infraestrutura — o custo do que não saiu do papel | Observatório IBI";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return cartaoRelogio();
}
