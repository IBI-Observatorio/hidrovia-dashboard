# SEMA — Arquivos mortos (mai/2026)

## Por que estão mortos

Em 27/05/2026 toda integração com a SEMA-AM foi removida do projeto. O Observatório passou a ter **apenas boletins SGB/CPRM** como fonte complementar de dados. A SEMA-AM não entrega mais boletins que o IBI possa consumir.

Junto com essa decisão ficou estabelecida a regra: **o nível de qualquer régua vem sempre do JSON gerado pela API da ANA** — nenhum boletim externo (SEMA, SGB ou outro) pode sobrescrever `cota_m` / `variacao_24h`. Boletins são referência informativa, não fonte de dados para indicadores.

## Arquivos que ficaram sem chamadores

| Arquivo | O que faz | Por que parou de ser chamado |
|---|---|---|
| `app/api/sema/route.ts` | API REST para upload e leitura de boletins SEMA em PDF | Nenhuma página ou script chama esse endpoint |
| `lib/sema-parser.ts` | Parser que extrai a tabela de cotas do PDF do boletim SEMA-AM | Só era usado por `app/api/sema/route.ts` |
| `app/admin/upload/page.tsx` | Interface de upload de PDFs SEMA para o admin | Apontava para `/api/sema`; sem boletins para subir, a página não tem utilidade |

O arquivo `data/boletins_sema_cache.json` permanece em disco (está vazio: `boletins: []`) e `data/boletins_sema_2026_consolidado.csv` também — ambos podem ser deletados sem impacto.

## O que foi removido do código ativo

- `fetchUltimoBoletimSEMA()` — removida de `lib/fetch-dados.ts`
- `aplicarBoletimSEMA()` — removida de `lib/fetch-dados.ts`
- `lerSEMAConsolidado()` — removida de `app/api/historico/route.ts` (SGC e Humaita 2026 usam só HidroWeb + telemetria ANA)
- Badge "Boletim SEMA ativo" — removido do Monitor
- Prop `fonteSEMA` — removida do `BannerDefasagem`
- Todas as menções a "SEMA-AM" em copy, fontes e links de navegação

## O que fazer com os arquivos mortos

Podem ser deletados a qualquer momento. Não há dependência de nenhum componente ativo. Se quiser limpar:

```
app/api/sema/route.ts
lib/sema-parser.ts
app/admin/upload/page.tsx
data/boletins_sema_cache.json
data/boletins_sema_2026_consolidado.csv
```
