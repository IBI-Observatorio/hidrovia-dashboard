# Carteira de Obras e Medidas Prioritárias para o Escoamento do Agro: critérios · PRÉ-REGISTRO v1

> **Aprovado pelo Bruno em 27/09/2026** (pesos, universo, coluna C, redefinição de A1 e ponderação agro). **Congelado com hash SHA-256** (ver `carteira-criterios-preregistro.sha256`). **Nada foi ranqueado.** Qualquer mudança exige a v2. É a mesma disciplina do pré-registro do IEE (`scripts/agro/gera-pre-registro.ts`).
> Base empírica: os testes de `ideias-novas.md`, seção 3.4.
> Referência de execução orçamentária: `carteira-execucao-orcamentaria.md` (teste A15, concluído em 27/09/2026).

## 1. Referência metodológica oficial

- **Guia ACB:** *Guia Geral de Análise Socioeconômica de Custo-Benefício de Projetos de Investimento em Infraestrutura*, Ministério da Economia/SEPEC/SDI, **versão 2, outubro de 2021** ([PDF na Casa Civil](https://www.gov.br/casacivil/pt-br/assuntos/governanca/comite-interministerial-de-governanca/arquivos/guia-de-analise-socioeconomica-de-custo-beneficio-de-projetos-de-investimento-em-infraestrutura-guia-acb.pdf)). Trechos conferidos no PDF:
  - objetivo: critérios que orientem *"de forma sistemática a seleção e a priorização de projetos de infraestrutura"*;
  - taxa social de desconto: *"Atualmente, a TSD para o Brasil é de 8,5%."* Não conferi se houve atualização depois de 2021.
- **Como a Carteira se posiciona diante do Guia.** O Guia prevê um funil: planejamento → ACB preliminar → ACB completa → avaliação ex post. A Carteira do Observatório é uma **triagem multicritério anterior à ACB**, feita com dado público recorrente.
  - Ela **não substitui a ACB**. Indica quais projetos merecem ACB completa ou prioridade de execução.
  - Onde houver ACB oficial publicada, o VSPL/TRE entra como informação complementar, com fonte, nunca recalculado pelo IBI.

## 2. Universo

**Coluna A · Obras de infraestrutura:** as fichas do Livro-Razão (`lib/livro-razao/fichas/`) que afetam o escoamento de grãos e fertilizantes:
- rodovias: BR-163/Miritituba, BR-319;
- ferrovias: EF-118, Ferrogrão, FICO, FIOL 2-3, Malha Sul, Transnordestina;
- hidrovias: Madeira, Paraguai-Paraná, Pedral do Lourenço;
- porto: canal de Paranaguá.

Total: **12 obras**.

**Excluídos (aprovado em 27/09/2026):**
- **Tecon Santos 10:** terminal de contêiner, sem relação direta com o escoamento de grãos, e na zona de conflito de interesse com armadores associados ao IBI.
- **Túnel Santos–Guarujá:** sem relação direta com o escoamento agro, segundo a própria fonte oficial ("não limita o desenvolvimento e a expansão do porto de Santos").
- **Ferroanel SP:** obra geral e urbana; os números de carga são só de imprensa.

**Coluna B · Medidas de armazenagem**, por microrregião. As candidatas são as microrregiões com déficit de silo contra safra (F3), por exemplo Norte Araguaia/MT, Arinos/MT, Sudoeste de GO, Paragominas/PA e Entorno de Brasília/GO. **A lista final sai da regra do critério B1, e não desta enumeração.**

**Inclusão de novos itens:** só por ficha nova no Livro-Razão, com fonte, **antes** do congelamento. Depois do congelamento, qualquer inclusão exige novo pré-registro.

## 3. Critérios da Coluna A (obras)

Cada critério traz definição, fonte, direção e **situação do dado**, conforme os testes de 25–27/09/2026.

| # | Critério | Definição operacional | Fonte | Direção | Situação do dado |
|---|---|---|---|---|---|
| A1 | **Carga projetada pelo estudo oficial, ponderada pela parcela agro** | Mt/ano de carga projetada no estudo oficial da obra, no ano de **início de operação** (ou no mais próximo dele), com o horizonte registrado. Se houver % oficial de grãos + fertilizantes, o valor é multiplicado por esse %; se não houver, entra cheio com a marca "parcela agro não informada". Ganho de calado e tráfego em eixos **não** são convertidos em toneladas pelo IBI: nesses casos, "sem dado" | Só fonte oficial (ANTT, ANTAQ, Infra S.A., ministério, TCU). **Número de imprensa não entra** | maior = melhor | **Levantado (`carteira-capacidade-maturidade.md`).** Com número oficial: Ferrogrão, FICO/FIOL, EF-118, Madeira, Paraguai, Pedral (2016), Malha Sul (operação de 2019). Sem dado: Transnordestina, BR-163, BR-319, Paranaguá |
| A2 | **Volume exposto ao corredor** | Mt e R$ de soja + milho (IBGE PAM × participação por rota no CIOT) que dependem do corredor que a obra atende | CIOT (ANTT), PAM (IBGE) | maior = melhor | **Testado (F6).** Tapajós 15,3 Mt; Madeira 11,1 Mt; Rumo 25,5 Mt; Itaqui/FNS 17,2 Mt. É piso, porque o CIOT registra o primeiro trecho. |
| A3 | **Corredor limitado por capacidade** | Indicador 0/1: a participação do corredor ficou estável mesmo com vantagem de custo crescente (sensibilidade ao custo ≈ 0) | Comex por porto e origem; custos USDA | 1 = prioridade para capacidade | **Testado só para o Arco Norte via Tapajós (F11):** platô de 42–46% desde 2020 com a vantagem de custo quase dobrando. |
| A4 | **Criticidade** | R$/ano de custo extra se o corredor parar (piso: carga realocada na rota aberta mais barata) | custos USDA + volumes CIOT | maior = melhor | **Parcial (F12).** Tapajós ≥ R$ 1,6 bi/ano. Os demais exigem modelo com capacidade (F11). |
| A5 | **Risco hídrico** (só hidrovias) | Anos, no período 1997–2025, com cota média de set–out abaixo do limiar operacional na estação de referência | ANA (HidroSerieHistorica) | maior risco = maior prioridade para obra que o mitigue | **Testado (F10).** Porto Velho < 2,3 m só em 2023 e 2024. Itaituba < 2,0 m em 2005, 2010, 2020 e 2024. |
| A6 | **Custo de inação** | Piso de R$/dia da ficha do Livro-Razão | Livro-Razão / Relógio | maior = melhor | **Só para fichas "ativas".** As "em validação" entram como "sem dado". |
| A7 | **Maturidade** | Estágio: 1 problema identificado · 2 alternativas estudadas (EVTEA) · 3 licenciamento/modelagem · 4 pronta para leilão ou execução · 5 em execução | documentos públicos (EVTEA, licença, edital, ObrasGov) | informativo; **não soma na nota**, ordena dentro do mesmo nível | **Levantado** (`carteira-capacidade-maturidade.md`); o estágio é julgamento documentado, não classificação oficial |
| A8 | **Execução orçamentária** (só obras com orçamento federal) | Por **ação orçamentária** vinculada à obra, de 2014 em diante: pago (Tesouro, com restos a pagar) acumulado ÷ dotação atualizada acumulada (Portal), e nº de anos com dotação > 0 e empenho = 0. Rótulo obrigatório: "execução da ação X" | Portal da Transparência (download anual) + Tesouro Transparente "investimento-publico" | informativo; **não soma na nota** | **Testado (A15):** viável para 8 das 12 obras; Madeira e Paraguai só até 2018 (depois, ações genéricas); concessões fora (ver `carteira-execucao-orcamentaria.md`) |

## 4. Critérios da Coluna B (armazenagem)

| # | Critério | Definição | Fonte | Situação |
|---|---|---|---|---|
| B1 | **Déficit microrregional** | produção de soja + milho − capacidade estática de granel sólido da microrregião (Mt); entra na Coluna B se o déficit for ≥ 1 Mt **e** a cobertura for < 0,6 | Conab (cadastro de armazéns), IBGE PAM | **Testado (F3).** Soma dos déficits microrregionais 88,2 Mt, contra 52,5 Mt de déficit nacional líquido |
| B2 | **Crescimento esperado da safra** | variação da produção prevista (Conab/LSPA) contra a média de 3 anos | Conab, IBGE LSPA | acesso testado |
| B3 | **Exposição a corredor limitado** | participação da produção da microrregião escoada por corredor com A3 = 1 | CIOT | acesso testado (F6/F7) |

## 4-B. Coluna C: medidas regulatórias e de dados (decisão 1B; critérios, pesos e lista APROVADOS em 27/09/2026)

**Universo:** medidas federais que **não exigem obra** e afetam o escoamento de grãos e fertilizantes. Cada medida precisa ter **instrumento identificável** (resolução, portaria, decreto, projeto de lei ou publicação de dado) e **órgão responsável**.

**Lista inicial**, tirada das pautas de logística que a CNA declara (prompt do estudo) e dos testes. Só entram as que cumprirem a regra acima:
- publicação do valor do frete registrado no CIOT (ANTT; F8);
- DT-e, o documento eletrônico de transporte (ANTT/Ministério dos Transportes);
- peso por eixo e tolerâncias (Contran/ANTT);
- ferrovias por autorização (Lei 14.273/2021; ANTT/MT);
- licenciamento de dragagem e derrocamento em hidrovias (Ibama);
- pedágio e free flow (ANTT).

**Exclusões:**
- **Cabotagem / BR do Mar:** conflito de interesse com armadores associados ao IBI (mesma regra do Tecon 10).
- **Medidas sobre preço regulado em disputa judicial**, como o piso mínimo de frete: neutralidade.

| # | Critério | Definição | Fonte | Direção | Peso |
|---|---|---|---|---|---|
| R1 | **Carga afetada** | Mt/ano de soja, milho e fertilizantes que passam pelo modo ou corredor alcançado pela medida | CIOT, Comex, ANTAQ (dado testado) | maior = melhor | 0,35 |
| R2 | **Simplicidade de implementação** | 3 = ato de um só órgão (resolução, portaria, publicação de dado) · 2 = decreto ou vários órgãos · 1 = exige lei | texto do instrumento | maior = melhor | 0,25 |
| R3 | **Evidência de efeito** | 2 = precedente brasileiro ou estudo com efeito medido · 1 = precedente internacional · 0 = hipótese | fonte com link e trecho | maior = melhor | 0,25 |
| R4 | **Prazo até efeito** | 3 = até 6 meses · 2 = 6 a 24 meses · 1 = mais de 24 meses | instrumento e cronograma oficial | maior = melhor | 0,15 |
| R5 | **Estágio** | não iniciada · em consulta pública · em tramitação · aprovada sem implementação | ANTT, Câmara, DOU | informativo (não soma) | — |

- **Agregação:** mesmas regras da seção 5 (percentil, dado ausente não imputado, sensibilidade obrigatória, publicação em faixas se o ranking for instável).
- **A coluna C é ranqueada separadamente.** Não se compara nota de regra com nota de obra.
- **Salvaguarda contra "agenda de lobby":** a coluna C descreve o efeito esperado e a evidência de cada medida. O Observatório **não toma posição de mérito político** sobre ela, e o texto de cada item cita o instrumento e o órgão, sem adjetivo.

## 5. Regras de agregação (congelar antes de rodar)

1. **Normalização:** percentil dentro da coluna (0–1). Nenhum critério em unidade bruta entra na soma.
2. **Pesos (APROVADOS em 27/09/2026):** A1 0,30 · A2 0,25 · A4 0,20 · A5 0,10 · A6 0,15. A3 funciona como **modificador**: dobra o peso de A1 no corredor limitado por capacidade. A7 e A8 são informativos.
3. **Dado ausente:** o critério sem dado **não é imputado**. A nota é recalculada com os pesos restantes e a ficha é marcada "cobertura parcial". Obra com menos de 60% do peso coberto fica fora do ranking e entra na lista "a instruir".
4. **Sensibilidade obrigatória:** o ranking é publicado junto com duas variantes (pesos iguais; sem A6). **Se o top-5 mudar em mais de 2 posições entre as variantes, publica-se em faixas** (alta, média, a instruir), sem ordem numérica.
5. **Congelamento:** este arquivo, depois de aprovado, recebe hash SHA-256 registrado no commit. Qualquer mudança de critério, peso ou universo exige nova versão do pré-registro, com justificativa, **antes** de rodar de novo.

## 6. Salvaguardas editoriais

- **Lacuna de dado é oportunidade, não denúncia.** Nenhum critério mede desempenho de órgão público. A8 (execução) é apresentado como situação da obra, não como juízo sobre a gestão.
- **Neutralidade:** a Carteira não recomenda modelo de contratação (público, concessão, PPP) nem obra específica fora da regra.
- **Conflito de interesse:** terminais de armador ficam fora (ver a exclusão do Tecon 10).
- **Separação de números:** dado oficial, estimativa do IBI e número da CNA sempre rotulados à parte.

## 7. Decisões do Bruno

1. ~~Pesos da seção 5.2~~: aprovados em 27/09/2026.
2. ~~Exclusão do Tecon Santos 10~~: aprovada em 27/09/2026.
3. ~~Medidas regulatórias~~: **1B** (27/09/2026). Coluna C ranqueada à parte (seção 4-B); critérios, pesos, lista e exclusões aprovados em 27/09/2026.
4. ~~Quem levanta A1/A7~~: **2A** (27/09/2026). Levantamento concluído em `carteira-capacidade-maturidade.md`.
5. ~~Redefinição de A1~~ (carga projetada oficial), ~~ponderação pela parcela agro~~ e ~~exclusão do túnel Santos–Guarujá e do Ferroanel~~: aprovadas em 27/09/2026.

**Congelamento:** v1 congelada em 27/09/2026. O hash SHA-256 deste arquivo está em `carteira-criterios-preregistro.sha256`. O **valor** dos dados (A1, A7) pode ser atualizado sem nova versão, desde que siga as definições acima. Definições, pesos e universo, não.
