# PNL 2050 — Monitor de Aderência + Órfãos do PNL

> Spec aprovada por Bruno em 27/09/2026. Fonte primária: *Plano Nacional de
> Logística 2050 — Relatório Completo, 1ª edição, agosto/2026* (Ministério dos
> Transportes / MPor / Infra S.A.), 576 páginas.

## 1. A pergunta da página

**"O PNL 2050 escolheu 31 eixos. Quantos estão saindo do papel?"**

O PNL diz *o que* o Estado quer até 2050. O Observatório mede se isso anda —
empreendimento por empreendimento — e antecipa onde vai travar.

## 2. Estrutura do PNL que a página usa

| Nível | Quantidade | Onde está no PDF |
|---|---|---|
| Objetivos de atuação | 112 | Parte 1 (índices nas págs. 27–28, 100–101, 172, 215, 243, 306) |
| Eixos do cenário-meta | 31 (12 R · 8 F · 4 A · 7 I) | Parte 2, págs. 351–492 |
| Intervenções estruturantes | soma do "Qtd." de cada ficha | fichas de eixo |
| Banco de projetos | 11 eixos (BP001–BP011) | págs. 493–537 |

Categorias de objetivo (chave usada no código):

| Chave | Categoria | Qtd. |
|---|---|---|
| EXP | Problemas de cargas para exportação | 18 |
| DOM | Problemas de cargas para o mercado doméstico | 23 |
| ABA | Problemas de cargas para abastecimento interno | 13 |
| PSAT | Passageiros — saturação de eixos consolidados | 3 |
| PEXC | Passageiros — exclusão e acessibilidade | 5 |
| ABR | Problemas abrangentes do transporte | 17 |
| DEM | Demandas emergentes | 12 |
| OPP | Oportunidades — produções regionais específicas | 8 |
| OPR | Oportunidades — crescimento econômico regional | 13 |

IDs de empreendimento: `1xxx` rodovia · `2xxx` ferrovia · `3xxx` hidrovia · `4xxx` porto.

Fato editorial conferido: **o relatório não contém nenhum valor em R$** (busca
por "R$" no texto integral: 0 ocorrências).

## 3. Escada de aderência (unidade = empreendimento, ID do PNL)

| Degrau | Significado | Fonte da evidência |
|---|---|---|
| 0 | No cenário-meta do PNL 2050 | o PDF (automático) |
| 1 | No Plano Setorial do modo | Planos Setoriais do PIT |
| 2 | No Plano Geral / PPA / LOA | PPA 2028–31, LOA, SIOP |
| 3 | Estudo (EVTEA, projeto, modelagem PPI) | DNIT, Infra S.A., PPI |
| 4 | Licença prévia ou de instalação | IBAMA / órgão estadual |
| 5 | Contrato ou leilão assinado | ANTT, ANTAQ, DNIT, PPI |
| 6 | Obra em execução ou em operação | medições, ANTT/ANTAQ |

**Integridade (mesma regra do Livro-Razão):**
- Degrau só é marcado com evidência pública **com URL**; sem URL = "sem evidência pública" (cinza).
- Ausência de evidência **nunca** é exibida como "parado".
- Violação derruba o build (validação no estilo de `validarFicha`).

## 4. Página `/pnl-2050`

1. **Topo (antecipação primeiro):** faixa de próximos marcos do PIT (Planos Setoriais → Planos Gerais → PPA 2028–31) + acórdãos TCU (1.472/2022, 1.832/2026, 1.497/2026).
2. **Funil nacional:** intervenções por degrau (barras horizontais).
3. **31 eixos como "linhas de metrô":** 7 estações por eixo, filtro por modo/UF/tipo de objetivo. Mobile = lista ordenada.
4. **Ficha do eixo** `/pnl-2050/eixo/[codigo]`: objetivos (chips por intensidade), empreendimentos com degrau e evidência, sensibilidade socioambiental (TI, quilombola, caverna, UC sem plano de manejo, FPND — presente/ausente), risco climático, link para ficha do Livro-Razão quando houver (+ `RelogioCompacto` se `ativa`). URL própria + cartão OG.
5. **Os órfãos do PNL:** matriz 112 objetivos × 31 eixos (cor = intensidade); linhas vazias no topo; toggle "incluir banco de projetos". Abaixo, **cobertura frágil**: objetivos atendidos por um único eixo, só em nível "Médio".
6. **Metodologia**, ligada ao gate de integridade.

## 5. Dados (regra do AGENTS.md)

- `scripts/pnl2050/extrai_pnl2050.py` lê o PDF e gera `public/data/pnl2050/pnl2050.json`
  (objetivos, eixos, empreendimentos, objetivos por eixo, hash do PDF). Registrado em `docs/RUNBOOK-DADOS.md`.
- O script **falha** se: contagem por categoria ≠ tabela acima; unique IDs de um eixo ≠ "Qtd." declarada (a menos que listado em exceções conferidas à mão).
- Aderência (fase 2): `lib/pnl2050/aderencia/*.ts`, validada em build.
- Fichas do Livro-Razão ganham `pnlIds: number[]` (fase 2).

## 6. Camada de antecipação (fase 3, com pré-registro)

Hipótese: a sensibilidade socioambiental que o próprio PNL mapeou prevê travamento
entre os degraus 3→4. Critérios congelados com hash **antes** de ver o resultado;
backtest em projetos com desfecho conhecido (Ferrogrão, BR-319, Pedral do Lourenço).
Se não passar, não vai ao ar.

## 7. Fases

| Fase | Entrega | Dependência externa |
|---|---|---|
| **1** | Extração + fichas dos 31 eixos (degrau 0) + seção Órfãos | nenhuma |
| **2** | Escada preenchida: aquaviário + Arco Norte (A001–A004, I001, I003, I004) + 15 fichas do Livro-Razão | PPA/LOA, licenciamento, PPI |
| **3** | Escore de risco de travar (pré-registrado + backtest) | fase 2 |

## 8. Achados preliminares (a conferir à mão antes de publicar)

Objetivos sem nenhum eixo — nem no cenário-meta, nem no banco de projetos
(extração automática de 27/09/2026):

- EXP 9 / DOM 15 — óleo bruto do RJ (provável escolha deliberada: duto/offshore; o plano não explicita)
- EXP 18 — madeira e carvão do Amapá
- PEXC 2 / PEXC 3 — concentração aeroportuária; integração regional aérea
- ABR 4 — estradas vicinais (o PNL cita o *Panorama das Estradas Vicinais* da CNA)
- ABR 9 / ABR 17 — mão de obra; licenciamento (não-infraestrutura, esperado)
