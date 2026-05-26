# Logo IBI no footer — pendente

## Status

Logo desativado no footer (`components/GlobalFooter.tsx`) em mai/2026. Voltar quando tiver um arquivo apropriado.

## Por quê

- O SVG original em `components/LogoIBI.tsx` era um placeholder feito à mão (apenas "IBI" + tagline genérica "INFRAESTRUTURA / OBSERVATÓRIO DE TRANSPORTES") — não correspondia à marca oficial.
- Substituí pelo `public/logo.png` (logo oficial: 1352×595, RGBA com fundo transparente), mas as letras "IBI" do PNG são cinza-escuro (~#4A5560) e ficam quase invisíveis sobre o fundo `azul-medio` do footer. Só os acentos colorido (I verde, I azul, ícone circular) ficam visíveis em tamanho pequeno (h-8 = 32px).
- Captura do problema: o "IBI" aparece como um borrão cinza sobre cinza.

## O que falta

Pelo menos uma destas opções:

1. **Versão light/branca do logo** — pedir/produzir um PNG ou SVG com as letras em branco (mantendo os acentos verde/azul). Esse é o caminho limpo.
2. **Filtro CSS** no `LogoIBI` atual — algo como `filter: brightness(0) invert(1)` zera tudo e deixa branco, mas perde os acentos coloridos da marca. Aceitável só como paliativo.
3. **Mudar o fundo do footer** — não vale, quebra o design system.

## Arquivos envolvidos

- `components/LogoIBI.tsx` — componente que renderiza `<Image src="/logo.png">`. Mantido no repo, só não está sendo importado.
- `components/GlobalFooter.tsx` — import e uso removidos. Há um comentário apontando para este doc.
- `public/logo.png` — logo oficial (cinza-escuro sobre transparente).

## Como reativar

1. Colocar a versão light em `public/logo-light.png` (ou apropriado).
2. Atualizar `LogoIBI.tsx` para usar o novo caminho.
3. Restaurar o import e o `<LogoIBI className="h-8 w-auto mb-3 opacity-80" />` em `GlobalFooter.tsx`.
