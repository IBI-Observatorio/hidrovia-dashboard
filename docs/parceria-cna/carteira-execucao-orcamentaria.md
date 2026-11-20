# Execução orçamentária das obras da Carteira: teste A15 (27/09/2026)

> Pergunta testada: dá para montar, só com dado aberto, uma série longa de execução orçamentária (dotação, empenho, pagamento) das obras do Livro-Razão?
> Série: `testes-rapidos/a15_serie_obras_livro_razao.csv`. Valores nominais em R$, sem correção pela inflação.

## Veredito

**Sim, a partir de 2014 e por ação orçamentária, para 8 das 14 obras da Carteira.** O Tecon Santos 10 já foi excluído da Carteira.

| Obra | Como é financiada | Série aberta | Cobertura |
|---|---|---|---|
| BR-319 | Orçamento da União (OGU) | ações 1248, 7I84 e 7XS4 | 2014–2026 |
| Pedral do Lourenço | OGU | ação 123M ("Hidrovia do Tocantins", mais ampla que o Pedral) | 2014–2026 |
| FIOL 2 e 3 | OGU. A FIOL 1 foi subconcedida | 124G (FIOL 2), 15ZY (FIOL 3, só dotação), 11ZE (FIOL 1) | 2014–2026 |
| Transnordestina | Misto: OGU + fundos FDNE/FNDE + CSN | 11ZT, 10MK, 00Q4, 161K (só a parte do OGU) | 2014–2026 |
| BR-163 / Miritituba | Misto: OGU até a concessão de 2022 | 1490, 111D, 7U25 | 2014–2026 (privada depois de 2022) |
| FICO | Quase toda privada (investimento cruzado da Vale) | 15V3 (parte da Infra S.A.) | 2021–2026 |
| Hidrovia do Madeira | OGU; concessão prevista para 2027 | 12HL | **só 2014–2018** |
| Hidrovia Paraguai-Paraná | OGU; concessão prevista para 2027 | 110S | **só 2014–2018** |
| Canal de Paranaguá | OGU até a concessão (leilão em 22/10/2025, não conferi) | 122O | 2014–2021 |
| EF-118, Ferroanel SP, Ferrogrão, Malha Sul | Concessão, investimento cruzado ou sem modelo definido | não se aplica | — |
| Túnel Santos–Guarujá | PPP com aporte da União e do estado | nenhuma ação federal encontrada | não conferi o caminho do aporte da União |

## Fontes (testadas)

- **Portal da Transparência, download anual do orçamento da despesa.** HTTP 200, sem chave. Traz dotação inicial e atualizada, empenhado e "realizado" por ação.
  - Começa em 2014; os anos de 2010 a 2013 deram 403.
  - Não tem localizador nem UF.
  - Não conferi no dicionário de dados se "realizado" é liquidado ou pago.
  - A API do Portal exige chave; não foi criada.
- **Tesouro Transparente, conjunto "investimento-publico".** HTTP 200, de 2014 a 2026 (2026 até maio). Traz o **pago, incluindo restos a pagar**, por mês, ação, UF e município, só para investimentos e inversões financeiras (GND 4 e 5).
- **ObrasGov.** Serve só de complemento:
  - HTTP 429 constante;
  - execução financeira por contrato, a partir de 2021, só com empenhos;
  - a busca pelo DNIT no PA voltou vazia;
  - a dragagem do Madeira não tem dado financeiro.
- **SIOP.** Painel só interativo. É a única fonte com localizador e com anos antes de 2014, mas a extração não foi testada.
- **DNIT (dados abertos).** Contratos e andamento de obras de 2021 a 2025, sem execução orçamentária.

## Exemplos (R$ milhões, nominais)

| Ação | Ano | Dotação inicial | Dotação atualizada | Empenhado | Pago (Tesouro, com restos a pagar) |
|---|---|---|---|---|---|
| BR-319 (1248) | 2023 | 84,8 | 10,1 | 10,1 | 9,3 |
| BR-319 (1248) | 2025 | 18,2 | 81,8 | 72,2 | 19,0 |
| Tocantins/Pedral (123M) | 2023 | 336,0 | 28,7 | 28,7 | 0,5 |
| Tocantins/Pedral (123M) | 2025 | 570,0 | 139,4 | 7,8 | 12,6 |
| FIOL 2 (124G) | 2021 | — | — | 392 | 361 |
| FIOL 2 (124G) | 2025 | — | — | 30 | 135 |

A dotação inicial de 2025 da ação 1248 (R$ 18,2 mi) confere com a reportagem da Rondônia Dinâmica sobre a auditoria do TCU (DNIT/TCU): *"Ação 1248 … dotação inicial de R$ 18,24 milhões"*.

## Limites que definem o critério A8

1. **Ação orçamentária não é o mesmo que obra.** A 123M cobre toda a Hidrovia do Tocantins. A partir de 2019–2020, as hidrovias passaram para ações genéricas (4349, 20LO, 219Z, 21I6), que não isolam cada rio. O rótulo correto é "execução da ação X", não "execução da obra".
2. **A série começa em 2014.** Anos anteriores dependem do SIOP.
3. **Obras em concessão ou com investimento privado saem do critério.** O acompanhamento delas vem da ANTT/ANTAQ: cronograma contratual e investimento realizado. Isso é outra série, ainda não testada.
4. **Enquadramento:** a execução é **situação da obra**, não juízo sobre o órgão executor. Diferença entre dotação e execução tem causas legais e técnicas (licenciamento, contingenciamento, remanejamento) que a série não observa.
