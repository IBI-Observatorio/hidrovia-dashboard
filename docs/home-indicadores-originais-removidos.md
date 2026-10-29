# Seção "Indicadores Originais" removida da home

**Removida em:** 2026-05-26
**Arquivo afetado:** [app/(site)/page.tsx](../app/(site)/page.tsx)
**Dados ainda no repo:** `estudos` em [lib/home-content.ts](../lib/home-content.ts) (export mantido — pronto para reusar)

## O que era

Grid de 6 cards logo abaixo dos "Painéis ao vivo" (4 verticais), com kicker verde **INDICADORES ORIGINAIS** e título **"Análises que ninguém mais publica."**

Subtítulo:
> Construídos sobre a Estatística Aquaviária da ANTAQ e a base hidrológica da ANA — do antecedente do PIB ao risco de calado.

## Cards

| Card | Status | Destaque | Href |
|---|---|---|---|
| PortGDP | live | +0,77 · 2 meses à frente | `/portos/ineditas/portgdp` |
| IRC | live | atual 64 ↑ · faixa elevada | `/monitor` |
| IDN | novo | driver Norte (padrão 2026) | `/monitor` |
| Calendário LWS 2026 | live | cruzamento estimado · jun/26 | `/calendario-lws-2026` |
| Custo de Espera | breve | R$ 14 bi/ano | — (estudo não publicado; sem link) |
| Arco Norte | live | 30% → 35% · ANTAQ | `/agro` |

> **24/10/2026:** os links `/portos/eficiencia-operacional/custo-espera` e
> `/portos/agronegocio/arco-norte` nunca tiveram página (não estão no manifest
> ANTAQ). O antigo "35% → 44% · Itaqui 6×" não tinha fonte e não bate com a
> ANTAQ (`portos-series.json`): Arco Norte = 29,8% → 35,2% do granel sólido
> nacional (2012→2025); sem Ponta da Madeira, 13,4% → 18,5%; Itaqui 7,0 → 9,1 Mt.

## Como restaurar

1. No [app/(site)/page.tsx](../app/(site)/page.tsx), re-adicionar `estudos` ao import de `@/lib/home-content` e o componente `StudyCard`.
2. Reinserir a seção entre o divisor (`<div className="h-px bg-white/10" />`) e a seção "CAPTURA":

```tsx
<section className="mx-auto max-w-screen-xl px-6 py-20">
  <div className="mb-9">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-verde">
      Indicadores originais
    </p>
    <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
      Análises que ninguém mais publica.
    </h2>
    <p className="mt-3 max-w-xl leading-relaxed text-gray-400">
      Construídos sobre a Estatística Aquaviária da ANTAQ e a base hidrológica da ANA — do antecedente do PIB ao risco de calado.
    </p>
  </div>

  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {estudos.map((e) => (
      <StudyCard key={e.titulo} estudo={e} />
    ))}
  </div>
</section>
```
