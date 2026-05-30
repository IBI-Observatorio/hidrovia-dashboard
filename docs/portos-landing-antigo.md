# Landing antiga de /portos — desativada

## Status

Substituída em mai/2026 por uma landing simples de 3 cards (`app/(site)/portos/page.tsx`),
no mesmo padrão visual de `/hidrovia`. O arquivo antigo foi renomeado para
`app/(site)/portos/_page-antigo.jsx` — o underscore faz o Next.js ignorar o
arquivo para roteamento, então a página fica preservada no repo mas não responde
em nenhuma URL.

## Por quê

A landing antiga era construída em volta de um manifest dinâmico (`manifest.json`)
com a promessa de "3 achados em destaque" + grade de clusters temáticos. Na
prática, só 3 indicadores estão publicados de fato — os três que agora têm
card próprio na nova landing:

- `/portos/movimentacao` (página standalone)
- `/portos/ineditas/tendencia-cargas` (id 31)
- `/portos/ineditas/portgdp` (id 30)

Manter um hub baseado em manifest, com clusters majoritariamente vazios, dava
impressão de catálogo grande quando o conteúdo real é pequeno. A nova landing
expõe exatamente o que existe.

## O que tem na página antiga que vale recuperar quando o catálogo crescer

- Componente `<AchadoDestaque>` (em `components/antaq/AchadoDestaque.tsx`) —
  card visual rico com número-âncora + punchline.
- Lógica de leitura do manifest (`manifest.json`) com agrupamento por cluster
  e cores por cluster (`CORES_CLUSTER` em `components/antaq/cores.ts`).
- Redirect automático quando só há 1 indicador publicado.
- Hero com gradient `from-ibi-blue to-ibi-green` + Framer Motion no fade-in.

## Arquivos envolvidos

- `app/(site)/portos/page.tsx` — landing nova (3 cards estáticos).
- `app/(site)/portos/_page-antigo.jsx` — landing antiga (manifest-driven), inerte.
- `app/(site)/portos/_landing.jsx` — outro fragmento antigo já desativado de
  antes; não confundir com o atual.

## Como reativar a versão antiga

1. Renomear `_page-antigo.jsx` → `page.jsx` (e mover ou deletar o `page.tsx` novo).
2. Conferir se `manifest.json` lista todos os indicadores que se quer expor.
3. Conferir se `ACHADOS_DESTAQUE` (no topo do arquivo) ainda aponta para IDs
   válidos do manifest.

## Quando faz sentido voltar

Quando publicar pelo menos uns 6–8 indicadores de fato, distribuídos em mais
de um cluster — aí o hub manifest-driven volta a fazer sentido. Enquanto for
"3 análises", a landing simples ganha.
