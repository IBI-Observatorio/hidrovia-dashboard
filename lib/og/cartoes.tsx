// Cartões sociais (OG image) do Observatório IBI — Relógio e fichas do Livro-Razão.
//
// Registro SÓBRIO, paleta/tokens do site. O número de cada cartão vem da MESMA
// fonte da página (lib/relogio.ts e lib/livro-razao) — nada duplicado nem
// hardcodado. Ficha 'em_validacao' usa o cartão neutro (sem número), preservando
// a regra de integridade.

import { ImageResponse } from "next/og";
import { equivalenteDiario, formataReaisAprox } from "@/lib/relogio";
import { getFicha } from "@/lib/livro-razao/registry";
import {
  fichaAtiva,
  multiploUrgencia,
  type FichaProjeto,
} from "@/lib/livro-razao/schema";
import { MODAL_LABEL, multiploFmt, reaisAprox } from "@/lib/livro-razao/formato";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Tokens institucionais (hex fixos porque o ImageResponse usa estilo inline).
const COR = {
  fundo: "#111827", // azul-marinho (body)
  card: "#2c2c2c", // azul-medio
  verde: "#00a652", // ibi-green
  ouro: "#D4922A",
  branco: "#FFFFFF",
  cinza: "#9aa3b2",
  borda: "rgba(255,255,255,0.10)",
};

/** Selo do Observatório IBI — marca verde + wordmark sóbrio. Reutilizado nos cartões. */
function Selo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 26,
          height: 26,
          background: COR.verde,
          borderRadius: 5,
          display: "flex",
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 3,
          color: COR.branco,
          textTransform: "uppercase",
        }}
      >
        Observatório IBI
      </div>
    </div>
  );
}

/** Moldura comum: fundo, respiro, faixa de topo colorida. */
function Moldura({
  children,
  acento,
}: {
  children: React.ReactNode;
  acento: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: COR.fundo,
        padding: "64px 72px",
        position: "relative",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 10,
          background: acento,
          display: "flex",
        }}
      />
      {children}
    </div>
  );
}

/** Cartão do Relógio: número do dia (equivalente diário) + rótulo + selo. */
export function cartaoRelogio(): ImageResponse {
  const numero = formataReaisAprox(equivalenteDiario());
  return new ImageResponse(
    (
      <Moldura acento={COR.ouro}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Selo />
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              color: COR.ouro,
              textTransform: "uppercase",
            }}
          >
            Relógio da Infraestrutura
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: COR.cinza,
              marginBottom: 8,
            }}
          >
            O Brasil paga, por dia,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              fontWeight: 800,
              color: COR.branco,
              lineHeight: 1,
            }}
          >
            {numero}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: COR.cinza,
            lineHeight: 1.35,
            maxWidth: 980,
          }}
        >
          pelo custo da infraestrutura que não saiu do papel.
        </div>
      </Moldura>
    ),
    OG_SIZE,
  );
}

/** Cartão neutro (padrão): sem número. Usado por fichas em_validacao. */
export function cartaoNeutro(titulo: string, subtitulo: string): ImageResponse {
  return new ImageResponse(
    (
      <Moldura acento={COR.verde}>
        <Selo />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              color: COR.branco,
              lineHeight: 1.1,
              maxWidth: 1010,
            }}
          >
            {titulo}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: COR.cinza,
              maxWidth: 980,
              lineHeight: 1.35,
            }}
          >
            {subtitulo}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            color: COR.ouro,
            textTransform: "uppercase",
          }}
        >
          Livro-Razão da Infraestrutura
        </div>
      </Moldura>
    ),
    OG_SIZE,
  );
}

/** Bloco métrica (rótulo pequeno + valor grande). */
function Metrica({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: COR.cinza,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {rotulo}
      </div>
      <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: cor, lineHeight: 1 }}>
        {valor}
      </div>
    </div>
  );
}

/**
 * Cartão de ficha. Só fichas ATIVAS mostram custo diário (piso) + múltiplo;
 * ficha inexistente ou 'em_validacao' cai no cartão neutro (sem número).
 */
export function cartaoFicha(slug: string): ImageResponse {
  const f = getFicha(slug);
  if (!f) {
    return cartaoNeutro(
      "Livro-Razão da Infraestrutura",
      "Cada ficha converte estudo público em custo diário de inação — pelo piso, conservador.",
    );
  }
  if (!fichaAtiva(f) || !f.custoInacaoDiario) {
    return cartaoFichaEmValidacao(f);
  }

  const custoDia = reaisAprox(f.custoInacaoDiario.piso);
  const mult = multiploUrgencia(f);

  return new ImageResponse(
    (
      <Moldura acento={COR.verde}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Selo />
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              color: COR.cinza,
              textTransform: "uppercase",
            }}
          >
            {MODAL_LABEL[f.modal]} · {f.uf.join(" ")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 34 }}>
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
              color: COR.branco,
              lineHeight: 1.08,
              maxWidth: 1050,
            }}
          >
            {f.nome}
          </div>
          <div style={{ display: "flex", gap: 90 }}>
            <Metrica rotulo="Custo diário de inação (piso)" valor={custoDia} cor={COR.branco} />
            {mult != null ? (
              <Metrica rotulo="Múltiplo de urgência" valor={multiploFmt(mult)} cor={COR.verde} />
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            color: COR.ouro,
            textTransform: "uppercase",
          }}
        >
          Livro-Razão da Infraestrutura
        </div>
      </Moldura>
    ),
    OG_SIZE,
  );
}

/** Cartão neutro específico da ficha em validação (mostra o nome, sem número). */
function cartaoFichaEmValidacao(f: FichaProjeto): ImageResponse {
  return cartaoNeutro(
    f.nome,
    `${MODAL_LABEL[f.modal]} · ${f.uf.join(" ")} — ficha em validação. Números publicados quando a fonte estiver auditável ponta a ponta.`,
  );
}
