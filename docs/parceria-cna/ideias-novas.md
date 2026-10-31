# Ideias novas para o Observatório: logística do agro (parceria CNA)

> Entrega de pesquisa do prompt `prompt-exploracao-ideias-novas-logistica-agro.md`. Data: 25/09/2026.
> Não altera código e não foi publicada. **Só as linhas marcadas como aprovadas na coluna "Aprovada?" (tabela da seção 2) seguem para o prompt do estudo com a CNA.**

**Como foi feito e o que foi conferido**
- **Fases 1 e 2.** Quatro pesquisadores varreram as oito frentes em paralelo, sem acesso ao repositório nem à memória técnica.
  - Cada link citado foi aberto por eles em 25/09/2026, com curl ou WebFetch, e o trecho literal foi copiado da página.
  - Os trechos têm no máximo 15 palavras. Os em inglês têm tradução livre entre colchetes.
  - Eu não reabri os links um a um. Quando o pesquisador não conseguiu abrir a página, está escrito "não conferi".
  - Os testes de acesso aos dados são chamadas reais feitas na mesma data. Os arquivos baixados ficaram no scratchpad da sessão, fora do repositório.
- **Fase 3.** Só então li a memória técnica e o repositório (páginas em `app/(site)`, scripts em `scripts/`, `docs/RUNBOOK-DADOS.md` e o prompt do estudo CNA) para marcar cada ideia como nova, extensão ou já temos.
  - Uma ressalva de transparência: o índice `MEMORY.md` é carregado automaticamente em toda sessão. Por isso eu já via os títulos das memórias desde o início, mas não abri os arquivos antes da fase 3.
- **Fora do escopo, como pedido:** frete marítimo, armadores e terminais de armador. Line-up de navio aparece só como tonelagem programada. Tempo de espera de navio foi descartado, por ser vizinho de custo de armador e por já estar coberto pelo Custo de Espera.

---

## 1. Resumo em 10 linhas

1. **Radar CIOT de rotas (F1).** A ANTT publica todo mês, em dados abertos, contagens de contratos de frete (CIOT) por município de origem, município de destino e mercadoria (NCM de 4 dígitos). O arquivo de ago/2026 tem 692 mil linhas e foi testado. Ninguém transforma isso em mapa de para onde a soja, o milho e o adubo estão indo. É a base mais inédita e barata do cardápio.
2. **Silo contra safra, por município (F3).** O cadastro de armazéns da Conab (18.914 unidades, com código IBGE) e a produção municipal do IBGE estão abertos e testados. Hoje o "déficit de armazenagem" circula só em número nacional, e com números divergentes. A versão municipal é o produto natural para as 27 federações da CNA.
3. **Termômetro do fertilizante (F5).** Junta navios de adubo programados, importação por porto e fluxo porto→interior no CIOT. Olha o custo de entrada da fazenda e antecipa o plantio, sem tocar em frete marítimo.
4. **Alerta de pico de escoamento (F4).** Cruza o ritmo semanal da colheita (Conab) com o silo livre (F3). É antecipação pura, alinhada ao posicionamento do Observatório, mas exige validação em safras passadas.
5. **Contador de carretas nos pedágios (F2).** A ANTT publica o tráfego diário por praça e por eixo, também testado. Tem precedente oficial na Alemanha e na Argentina e é o único sinal diário do grão rodando no corredor.

**Ressalva que vale para 1, 2 e 5:** na data de publicação, esses dados não saem antes do Comex Stat. A antecipação vem da ordem física (o caminhão roda antes do navio sair) e precisa de teste retroativo antes de virar promessa.

---

## 2. Tabela-ranking das 15 fichas

Notas de 1 a 5. **In** = ineditismo no Brasil · **Fa** = factibilidade com dado acessível · **CNA** = valor para a parceria · **Inc** = valor para a incidência junto ao Executivo e ao Parlamento · **Ant** = capacidade de antecipação.
As notas já estão ajustadas pela revisão adversarial (seção 3.2) e pelo backtest de 25/09/2026 (`backtest-ciot-pedagio.md`): F1 subiu de 3 para 4 em antecipação, F2 caiu de 3 para 2, e F5 caiu de 4 para 2 (o CIOT de fertilizante não antecipa as entregas da ANDA; o line-up de fertilizante de Paranaguá não mostrou ganho com 45 capturas do Wayback, teste limitado; preço não testado). Os testes rápidos de 26/09/2026 (seção 3.4) baixaram a antecipação de F10 de 4 para 3 (efeito de limiar, um só evento) e mantiveram F3 e F6. O teste de F4 baixou a antecipação de 5 para 2 (a colheita pesa no frete na mesma semana, não antes). O protótipo de F7 subiu a factibilidade de 4 para 5. O teste de F9 subiu a antecipação de 2 para 3 (o trecho rodoviário sai com cerca de 3 trimestres de vantagem sobre o USDA). A 2ª rodada de F10 baixou a antecipação de 3 para 2 (o método de evento é ruidoso demais). O protótipo de F14 baixou a factibilidade de 5 para 4 (só 4 de 10 indicadores são semanais e automáticos hoje). O teste de F8 subiu a factibilidade de 2 para 3 (CIOT universal desde 24/05/2026 e precedente da ANAC). O teste de F15 redesenhou a ficha (o ONTL já tem o mandato; o Pró-Logística é a coalizão natural): ineditismo 5→3, factibilidade 2→3, CNA 3→4. As notas originais estão em cada ficha.

| # | Ideia | In | Fa | CNA | Inc | Ant | Total | Fase 3 | Aprovada? |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Radar CIOT de rotas de escoamento | 5 | 4 | 4 | 4 | 4 | **21** | nova | |
| F3 | Silo contra safra por município | 3 | 5 | 5 | 4 | 3 | **20** | nova no código (já citada como insumo no prompt do estudo CNA) | |
| F5 | Termômetro do fertilizante: do porto à fazenda | 5 | 4 | 5 | 3 | 2 | **19** | extensão | |
| F6 | "O que está em jogo" por corredor e município | 4 | 4 | 4 | 5 | 2 | **19** | nova | |
| F7 | Ficha logística municipal para federações e imprensa regional | 4 | 5 | 5 | 4 | 1 | **19** | nova | |
| F8 | Pedido à ANTT: valor de frete CIOT agregado | 5 | 3 | 5 | 4 | 2 | **19** | nova | |
| F14 | Boletim semanal de transporte do agro | 3 | 4 | 4 | 3 | 3 | **17** | extensão | |
| F10 | Custo econômico da água baixa no Arco Norte | 4 | 4 | 3 | 4 | 2 | **17** | extensão | |
| F4 | Alerta de pico de escoamento (safra/safrinha) | 4 | 3 | 5 | 3 | 2 | **17** | extensão | |
| F15 | Monitor com mandato / coalizão de embarcadores | 3 | 3 | 4 | 5 | 2 | **17** | nova | |
| F13 | Rede AIS própria nos rios Tapajós, Madeira e Amazonas | 5 | 2 | 2 | 3 | 5 | **17** | nova | |
| F9 | Custo porteira-ao-porão por rota | 2 | 3 | 5 | 4 | 3 | **17** | extensão | |
| F2 | Contador de carretas nos pedágios por corredor | 4 | 4 | 3 | 3 | 2 | **16** | nova | |
| F12 | Índice de criticidade de corredores | 3 | 2 | 3 | 5 | 3 | **16** | nova | |
| F11 | Modelo de rede "quem migra" calibrado por avaliação ex post | 2 | 2 | 4 | 5 | 3 | **16** | nova | |

**Descartadas na fase 3 por "já temos".** Elas estavam entre as favoritas da fase 1 e foram substituídas por F8, F12 e F15:
- **Spread porto–interior da soja (A2/C5):** já é o pilar BASIS da v3 do IEE (`scripts/cepea/gera-basis.py`, CEPEA Paranaguá × IMEA MT).
- **Line-up de grão como nowcast de embarque (A5/B5):** já é o pilar F do IEE (`scripts/lineup/*`: Paranaguá, Santos, Itaqui, Vila do Conde, Santarém).
- **Índice de pressão de escoamento (C14):** é, na essência, o IEE (pressão ÷ capacidade semanal, `scripts/antaq/capacidade-semanal.ts`).
- **Previsão probabilística de restrição de calado (C4):** já coberta pelo Monitor (IRC, recessão, "ETA · restrição de calado", Calendário LWS).
- **Custo da inação de obras (C8):** já existe no Relógio e no Livro-Razão (`/relogio`, `/livro-razao`, 15 fichas de obra).
- **Diesel ANP (B15):** já alimenta o pilar T (`scripts/anp/diesel.ts`).
- **Tempo de espera de graneleiros (A6):** já coberto pelo Custo de Espera e pelo backtest do IEE; também fica perto de custo de armador.

---

## 3. Fichas completas

### F1 · Radar CIOT de rotas de escoamento
**O quê:** mapa e série mensal de para onde vão os caminhões de soja (NCM 1201), milho (1005) e fertilizante (31xx), de município para município. Inclui alerta quando o fluxo migra entre Arco Norte e Sul/Sudeste (por exemplo, MT→Itaituba contra MT→Rondonópolis ou Paranaguá).

**Precedente**
- Índia: a guia eletrônica de transporte (e-way bill) é usada como termômetro de atividade: "recognised as a key indicator of economic activity, consumption, and trade" [reconhecida como indicador-chave de atividade econômica] — blog.saginfotech.com/e-way-bill-generation-records-7-7-yoy-august-2026.
  - É um blog; a fonte primária do GSTN não foi conferida.
- Usar o CIOT para o agro: hipótese do IBI.

**Dado:** ANTT, dataset `ciot` em dados.antt.gov.br. Aberto.
- **Teste de acesso:** `…/download/08_2026_ciots.csv` respondeu HTTP 200. É um CSV de 36 MB, separado por `;`.
  - Colunas: município e UF de origem, município e UF de destino, `ncm_carga`, `quantidade_ciots`, `quantidade_trc`, `quantidade_contratantes`.
  - A série começa em jan/2024. Agosto de 2026 foi publicado em 10/09.
- **Amostra, ago/2026:**
  - Soja saindo de MT: 681 pares de municípios e 26.721 CIOTs.
  - Maiores fluxos: Sinop→Itaituba 1.103, Sorriso→Porto Velho 856, Alta Floresta→Itaituba 776.
- **Limitações:**
  - O dado conta contratos, não toneladas.
  - Os nomes de município vêm sem acento e sem código IBGE, então o cruzamento é feito por nome.
  - Parte dos registros vem sem origem. Os pesquisadores mediram de formas diferentes: 1.479 linhas por um critério, cerca de 25% dos CIOTs pelo outro. É preciso conferir antes de usar.
  - A cobertura depende da regra do CIOT (sobretudo transportador autônomo e equiparados). Não conferi a abrangência exata.

**Pergunta que responde:** "a seca do Norte está desviando carga para o Sul? Por onde o adubo está subindo?" Serve à CNA, ao Executivo e à imprensa.

**Antecipa ou só mede?** Mede, mas mostra a mudança de rota antes das estatísticas portuárias consolidadas. Na data de publicação, não sai antes do Comex Stat.

**Esforço e prazo:** P/M. Primeiro resultado em 2 a 3 semanas: parser, tabela de nomes para código IBGE e mapa.

**Riscos**
- De dado: cobertura parcial e contagem em vez de tonelada.
- Político: baixo.
- Conflito de interesse: nenhum.

**Notas originais:** 5·5·4·4·3.

---

### F2 · Contador de carretas nos pedágios por corredor
**O quê:** índice diário de veículos comerciais de 6 eixos ou mais nas praças dos corredores de grão, com ajuste sazonal e separado por sentido.
- Praças: Nova Rota do Oeste (BR-163/MT), Via Brasil (BR-163/PA, praça de Trairão a caminho de Miritituba), Rota Verde (GO) e concessões rumo a Paranaguá.

**Precedentes**
- Destatis, índice de quilometragem de caminhões pedagiados: "results provide a very up-to-date picture of mileage" [um retrato muito atualizado da quilometragem] — destatis.de/EN/Service/EXSTAT/Datensaetze/truck-toll-mileage.html.
- Bolsa de Comercio de Rosario: "58.587 camiones a puertos" — bcr.com.ar (informe Panorama de Mercados).
- ABCR/Tendências: "O índice que mede o fluxo pedagiado de veículos nas estradas" — melhoresrodovias.org.br/indice-abcr_2/.
  - É nacional e não é voltado ao agro.

**Dado:** ANTT, dataset `volume-trafego-praca-pedagio`. Aberto.
- **Teste de acesso:** o CSV diário de 2026 respondeu HTTP 200.
  - 247 MB, cerca de 2,6 milhões de linhas, 34 concessionárias.
  - Colunas: praça, sentido, categoria de eixo e tipo de veículo.
  - Os dados vão até 31/08/2026 e foram publicados em 08/09.
- **Amostra:** em Trairão, no sentido decrescente, veículos com 6 eixos ou mais somaram 12.410 em janeiro e 30.623 em março.
- **Limitações:**
  - Cada concessionária tem uma data de corte diferente (Via Brasil até 03/08; Ecosul até 04/03).
  - Só cobre rodovia federal concedida. As estaduais de MT ficam de fora.
  - Caminhão não quer dizer grão. Resolve-se cruzando com F1.

**Pergunta que responde:** "o grão está rodando mais ou menos que no ano passado, por corredor?" Serve à imprensa e à CNA.

**Antecipa ou só mede?** O dado é diário, mas sai em lote mensal, cerca de 25 dias depois. A vantagem é o recorte por corredor, que nenhum dado oficial tem, e a ordem física em relação ao embarque.

**Esforço e prazo:** M. Primeiro resultado em 3 semanas.

**Riscos**
- De dado: atrasos diferentes entre concessionárias; troca de concessão ou de praça quebra a série.

**Notas originais:** 4·5·3·3·4.

---

### F3 · Silo contra safra, por município
**O quê:** capacidade estática de armazenagem contra produção e previsão de safra, por município e microrregião. O resultado é o déficit de silo local e as regiões em que o produtor é obrigado a vender na colheita.

**Precedente e lacuna**
- O debate só usa números nacionais, e eles divergem:
  - CNA: "existe um déficit em 2024 de 118,7 milhões de toneladas" (cnabrasil.org.br).
  - Canal Rural, 17/03/2026, citando a HN Agro: "déficit de armazenagem de grãos acima de 130 milhões de toneladas".
- A versão municipal e recorrente é hipótese do IBI. Não conferi se há estudo acadêmico municipal.

**Dado:** Conab e IBGE. Aberto.
- **Testes de acesso:**
  - `portaldeinformacoes.conab.gov.br/downloads/arquivos/ArmazensCadastrados.txt` respondeu HTTP 200: 18.914 armazéns com código IBGE, capacidade e coordenadas. Soma de 231,2 Mt no Brasil, 59,9 Mt em MT e 6,57 Mt em Sorriso.
  - IBGE PAM, tabela 1612, respondeu HTTP 200. Sorriso produziu 2.084.520 t de soja em 2024.
  - LSPA, tabela 6588, respondeu HTTP 200 e serve para a previsão.
  - Base estrutural: Censo Agro 2017, tabela 6866 do SIDRA, já citada no prompt do estudo CNA.

**Pergunta que responde:** "onde falta silo e quanto?" Serve às federações, à CNA e ao Congresso (crédito do PCA, o programa de armazenagem).

**Antecipa ou só mede?** Antecipa quando usa a previsão da safra corrente.

**Esforço e prazo:** P. Primeiro resultado em 2 semanas.

**Riscos**
- De dado: o cadastro é declaratório; a capacidade é dividida entre culturas; um mesmo silo atende a produção de vários municípios. A metodologia precisa ser explícita.
- Político: baixo, porque o tema é bandeira da própria CNA.

**Notas originais:** 4·5·5·4·3.

---

### F4 · Alerta de pico de escoamento (safra e safrinha)
**O quê:** por UF ou microrregião, um alerta de "semanas de pressão" sobre caminhão e silo, com 2 a 6 semanas de antecedência.
- A conta: colheita semanal da Conab, mais uma estimativa por satélite quando houver, menos o silo livre de F3, dá o volume que precisa sair.

**Precedentes**
- FEWS NET, no formato de alerta: "the leading provider of early warning and analysis on acute food insecurity" — fews.net.
- GEOGLAM Crop Monitor: "open, timely, science-driven information on crop conditions in support of market transparency" — cropmonitor.org/about-us.
- Artigo sobre previsão de soja no Brasil: "soybean forecasting information in southern Brazil is derived at the end of April" — pmc.ncbi.nlm.nih.gov/articles/PMC11041643/.
- Converter colheita em demanda de caminhão é hipótese do IBI.

**Dado:**
- Progresso de safra da Conab, semanal por UF. A edição de 14 a 20/09/2026 foi atualizada em 21/09.
- Sentinel-2 pelo catálogo do Copernicus. **Teste:** a busca STAC na área de Miritituba respondeu HTTP 200, com 34 cenas entre 01/08 e 25/09/2026.

**Pergunta que responde:** "quando e onde vai faltar caminhão ou silo nesta safrinha?" Serve ao produtor, à CNA e ao Executivo.

**Antecipa ou só mede?** Antecipa.

**Esforço e prazo:** M. Sem satélite, primeiro resultado em 4 a 6 semanas. Com satélite, G.

**Riscos**
- Previsão errada em público. Exige backtest em pelo menos 3 safras antes de publicar.
- A nuvem de janeiro a março atrapalha o satélite.

**Notas originais:** 4·4·5·3·5.

---

### F5 · Termômetro do fertilizante: do porto à fazenda
**O quê:** um indicador mensal, com componente semanal, formado por quatro peças:
1. Toneladas de ureia, KCl e MAP programadas nos line-ups.
2. Importação do capítulo 31 por porto e por UF (Comex Stat).
3. Fluxo porto→interior no CIOT (NCM 31).
4. Diferença entre o preço pago pelo produtor na UF (Conab) e o valor de chegada ao porto.

Responde se o adubo chega a tempo para o plantio, e a que custo interno. Não entra frete marítimo.

**Precedentes**
- USDA: "upbound barge shipments of fertilizer commodities in the last month" — agtransport.usda.gov/d/2h58-ze4m.
- USDA: "The price spread (Cornbelt minus New Orleans) can reflect transportation costs" — agtransport.usda.gov/d/u8i9-uebx.

**Dado:** aberto.
- **Testes de acesso:**
  - Line-up da APPA (`appaweb.appa.pr.gov.br/…WCI=relLineUpRetroativo`) respondeu HTTP 200, com linha "UREIA 14.000,000 Tons.".
  - Comex Stat, `POST /general` com o capítulo 31: HTTP 200 depois de três respostas 429 (limite de requisições). Ago/2026: 527.485 t para MT. Santos: 896 mil t no mês.
  - CIOT ago/2026: 3.392 pares NCM 31 saindo de Paranaguá, Rio Grande e São Luís (ex.: Rio Grande→Cruz Alta, 490).
  - Conab `PrecosSemanalUF.txt` respondeu HTTP 200 (90.331 linhas, nível "PREÇO PAGO PELO PROD").
- **Atenção:** no Comex Stat, o município é o domicílio fiscal do importador, não a fazenda.

**Pergunta que responde:** "o adubo da próxima safra vai chegar a tempo, e a que custo até a fazenda?" Serve ao produtor e à CNA.

**Antecipa ou só mede?** Antecipa. Estimo 2 a 6 semanas de antecedência (hipótese do IBI).

**Esforço e prazo:** M. Os raspadores de line-up já existem. Primeiro resultado em 3 a 4 semanas.

**Riscos**
- Escopo: tratar só tonelada e trecho interno.
- De dado: é preciso casar o NCM com a fórmula do fertilizante.

**Fase 3:** extensão. Os raspadores `scripts/lineup/*` já leem os line-ups, mas só usam grão (pilar F do IEE). Fertilizante aparece hoje apenas como categoria em `/sobrecusto-rodoviario`.

**Notas originais:** 5·4·5·3·4.

---

### F6 · "O que está em jogo" por corredor e por município
**O quê:** para cada corredor (BR-163, Tapajós, Madeira, Malha Norte, Ferrogrão como cenário), quantificar produção, valor exportado, emprego e renda que dependem dele, recortado por município e UF. Cada parlamentar vê a própria base.

**Precedente:** USDA, "quantifies some of the U.S. inland waterways' contributions by measuring the economic impact" — agtransport.usda.gov/d/nuc7-ab93. Há também datasets de impacto regional por estado.

**Dado:**
- Testados: PAM (IBGE, HTTP 200), CIOT (F1) e API da Câmara (`dadosabertos.camara.leg.br/api/v2/proposicoes`, HTTP 200).
- Não testados: exportação por município (Comex Stat) e emprego (RAIS/CAGED).

**Pergunta que responde:** "quanto da economia do meu estado ou município passa por este corredor?" Serve ao Congresso e às federações.

**Antecipa ou só mede?** Mede a exposição. Com cenários de interrupção, vira antecipação de impacto.

**Esforço e prazo:** M. Primeiro resultado em 4 semanas, se reaproveitar F1.

**Riscos**
- Político: o recorte por base eleitoral pode soar partidário. Mitigação: mesmo método para todos os municípios e publicação integral.

**Notas originais:** 4·4·4·5·2.

---

### F7 · Ficha logística municipal (federações e imprensa regional)
**O quê:** uma página por município produtor com silo contra safra (F3), rotas de saída (F1), diesel da semana, piso ANTT de referência e exposição a corredor (F6). Funciona como kit de dados para jornal local, sindicato rural e federação.

**Precedente:** USAFacts: "USAFacts exists to make government data easier to access and understand." — usafacts.org/about-usafacts/. O Centre for Cities não foi conferido (erro de certificado).

**Dado:** o mesmo de F1, F3 e F6. A calculadora oficial da ANTT (`calculadorafrete.antt.gov.br`, HTTP 200, "Calcular Piso Mínimo de Frete") serve de referência para o campo de piso.

**Pergunta que responde:** "e na minha cidade?" Serve à imprensa regional, às federações e aos prefeitos.

**Antecipa ou só mede?** Mede.

**Esforço e prazo:** M. Depende de F1 e F3. Primeiro resultado em cerca de 6 semanas.

**Riscos**
- Manutenção: milhares de páginas. Começar pelos cerca de 500 maiores municípios produtores.
- Piso de frete é tema judicializado. Apresentar como referência, nunca como recomendação.

**Notas originais:** 4·4·5·4·1.

---

### F8 · Pedido à ANTT: valor de frete CIOT agregado
**O quê:** proposta institucional, via CNA, para que a ANTT publique a mediana de R$/t·km por par de municípios, por NCM e por mês. É um agregado que protege o sigilo comercial.

**Precedente:** a própria ANTT informa que o CIOT registra "origem, destino, valor do frete, tipo da operação e veículos utilizados" — gov.br/antt/pt-br/assuntos/cargas/ciot-para-todos-1. Isso mostra que o dado já é coletado.

**Dado:** fechado hoje. A parte aberta (contagens) está testada em F1.

**Pergunta que responde:** "quanto custa de fato tirar a soja de cada município?" Serve ao Executivo, à CNA e ao Congresso.

**Antecipa ou só mede?** Mede, com cerca de 10 dias de defasagem após o fim do mês.

**Esforço e prazo:** P para o pedido; o prazo depende da ANTT.

**Riscos**
- Enquadrar como oportunidade de dados abertos, nunca como crítica à ANTT.
- Sigilo comercial.
- Não há conflito de interesse.

**Notas originais:** 5·2·5·4·2.

---

### F9 · Custo porteira-ao-porão por rota
**O quê:** custo total em R$/t por rota: fazenda → rodovia → transbordo → barcaça ou trem → elevação no porto, sem trecho marítimo. Tem nowcast semanal pelo diesel e pelo frete spot. É a versão brasileira de algo que o USDA hoje mede sobre o Brasil.

**Precedentes**
- USDA: "analyzes the major developments related to the total cost of shipping soybeans from Brazil" — ams.usda.gov/services/transportation-analysis/brazil.
- **Teste de acesso:** a API do dataset `i4ty-m7hq` respondeu HTTP 200, com série mensal de 2003-01 a 2025-09 e nada depois.

**Dado:**
- SIFRECA/ESALQ-LOG: indicador mensal na página pública (HTTP 200); a série histórica é paga.
- IMEA: frete já usado no repositório.
- ANP: já usado.
- Tarifas de transbordo e ferrovia: acesso não testado.

**Pergunta que responde:** "quanto custa levar a soja do município X ao porto Y, por cada rota?" Serve ao produtor, à CNA e ao Congresso.

**Antecipa ou só mede?** Mede. Antecipa só a parte que vem do diesel.

**Esforço e prazo:** M. Primeiro resultado em 4 semanas.

**Riscos**
- O ESALQ-LOG já mede o frete (ver 3.2). Parcerias possíveis: SIFRECA e o Campo Futuro da CNA.

**Fase 3:** extensão. O pilar T do IEE já é custo rodoviário modelado (`lib/custeio-rodoviario.ts`), calibrado contra IMEA/SIFRECA em `docs/calibracao-T-frete.md`. Falta estender aos trechos multimodais.

**Notas originais:** 3·3·5·4·2.

---

### F10 · Custo econômico da água baixa no Arco Norte
**O quê:** estimar, com série histórica, quanto cada dia abaixo do limiar operacional em Itacoatiara, Porto Velho e no Tapajós reduz os embarques do Arco Norte e abre o basis regional. Transforma cota em R$ e tonelada.

**Precedentes**
- Instituto Kiel (Kiel Working Paper 2155), sobre o Reno: com 30 dias de água baixa, "industrial production in Germany declines by about 1 percent" [a produção industrial alemã cai cerca de 1%]. A URL completa não foi registrada pelo pesquisador.
- farmdoc daily, sobre o Mississippi em 2022: "The St. Louis barge spot rate hit a record $106 per ton".

**Dado:**
- **Teste de acesso:** SOAP da telemetria da ANA respondeu HTTP 200 (Manaus, dado até 02/09/2026).
- Embarques: a Estatística Aquaviária da ANTAQ não respondeu nos testes desta sessão (timeout e DNS). No repositório ela já é lida por `scripts/antaq/*` e pela antaq-api.

**Pergunta que responde:** "quanto custa um mês de seca a mais no Arco Norte?" Serve ao Executivo (dragagem) e à imprensa.

**Antecipa ou só mede?** Antecipa quando combinada com a previsão de cota que o Monitor já tem.

**Esforço e prazo:** M. Primeiro resultado em 4 semanas.

**Riscos**
- Separar o efeito da água do câmbio e de Chicago.

**Fase 3:** extensão. O Monitor já cobre a hidrologia (IRC, IDN, recessão, ETA de calado, Calendário LWS) e o "Custo de Espera" já monetiza a fila. O que falta é a elasticidade entre água e volume/basis.

**Notas originais:** 4·4·3·4·4.

---

### F11 · Modelo de rede "quem migra quando a obra fica pronta"
**O quê:** alocação de fluxos origem→porto pelo menor custo, com capacidades, para rodar cenários como Ferrogrão, FICO e duplicações. É calibrado por uma avaliação ex post da pavimentação da BR-163 no Pará, concluída em 2019, com event study ou diferenças em diferenças sobre preço, área e exportação por município.

**Precedentes**
- Donaldson, AER 2018: "railroads: (1) decreased trade costs and interregional price gaps".
- Morten & Oliveira, AEJ Applied 2024: "We find the highway system increased welfare by 2.8 percent".
- CPI/PUC-Rio sobre a Ferrogrão: "The projections were made using a novel market access approach".
- Não achei, nem conferi, um estudo de diferenças em diferenças específico da BR-163.

**Dado:** PAM (HTTP 200), Comex Stat (HTTP 200), CIOT (F1) para calibrar os fluxos. Custos por modo: SIFRECA (pago).

**Pergunta que responde:** "se a ferrovia X ficar pronta, quanto de carga muda de porto, e quanto cai o custo em cada município?" Serve ao Congresso e ao Executivo.

**Antecipa ou só mede?** Antecipa, como cenário.

**Esforço e prazo:** G. Primeiro resultado em 3 a 4 meses.

**Riscos**
- Político alto, porque há obras em disputa.
- A Infra S.A. já tem modelo de rede e simulador (ver 3.2).

**Fase 3:** nova. O `/radar` tem DCF e maturação da Ferrogrão, mas não tem alocação de fluxos.

**Notas originais:** 4·2·4·5·3.

---

### F12 · Índice de criticidade de corredores
**O quê:** retirar um arco da rede (a BR-163 interrompida, o Madeira seco, a Malha Norte parada) e medir quanto sobe o custo total e quantas toneladas ficam sem alternativa. Serve para ranquear onde a redundância vale mais.

**Precedentes**
- Banco Mundial, "Understanding Transport Resilience": "(3) analyze system-level criticality and network effects".
- Colon et al., Nature Sustainability 2020: "a disaster affects the economy: the transport–supply chain nexus".

**Dado:** depende do modelo de F11. O portal ONTL/Infra S.A. respondeu HTTP 200.

**Pergunta que responde:** "qual interrupção custaria mais ao agro, e onde uma alternativa vale mais?" Serve ao Executivo, ao Congresso e ao BNDES.

**Antecipa ou só mede?** Mede a exposição e antecipa o impacto de eventos.

**Esforço e prazo:** G. Vem depois de F11.

**Riscos**
- Sobreposição com a Infra S.A.

**Notas originais:** 4·2·3·5·3.

---

### F13 · Rede AIS própria nos rios Tapajós, Madeira e Amazonas
**O quê:** instalar receptores de AIS em pontos de controle (Itacoatiara/Tabocal, Óbidos, Miritituba, Porto Velho) e publicar trânsitos diários de empurradores, velocidade e tempo de viagem. Seria tempo real exclusivo da navegação interior.

**Precedentes**
- EUA, sistema de monitoramento das eclusas (LPMS): "daily and half hourly snapshots of data on U.S. flag vessels" — cisa.gov/mts-resilience-resources/lock-performance-monitoring-system-lpms.
- Limite reconhecido na literatura: o AIS "does not monitor the presence or number of barges transported" — arxiv.org/abs/2501.00615.

**Dado:**
- O sinal existe: a norma da Capitania Fluvial de Santarém exige AIS "Para embarcações propulsadas com AB maior ou igual a 100 e empurradores de comboios".
- **Teste de acesso a dados de terceiros:** falhou. O Global Fishing Watch devolveu 401. O AISHub exige compartilhar um feed próprio.
- Custo do hardware: não cotei.

**Pergunta que responde:** "quantos comboios desceram esta semana, e em quanto tempo?" Serve ao Executivo, à imprensa e ao Monitor Hidrológico.

**Antecipa ou só mede?** Antecipa. O empurrador sai dias antes da descarga.

**Esforço e prazo:** G. Primeiro resultado em cerca de 3 meses (instalação).

**Riscos**
- AIS desligado e cobertura de sinal.
- Sensibilidade dos operadores. Publicar só agregados, sem identificar empresas.

**Notas originais:** 5·2·2·3·5.

---

### F14 · Boletim semanal de transporte do agro
**O quê:** um PDF ou página semanal que junta rodovia (F2), rotas (F1), fertilizante (F5), hidrologia e IEE, sempre comparando com a mesma semana do ano anterior. É o formato que dá ritmo ao Observatório e à parceria.

**Precedente:** USDA Grain Transportation Report: "reports on the latest volume and price data for barges, railroads, trucks" — ams.usda.gov/services/transportation-analysis/gtr. A edição mais recente é de 24/09/2026.

**Dado:** a soma das fichas acima.

**Pergunta que responde:** "como está o escoamento nesta semana?" Serve à CNA, à imprensa e ao produtor.

**Antecipa ou só mede?** Depende dos indicadores que carrega.

**Esforço e prazo:** P, porque o motor de briefing já existe. Primeiro resultado em 2 semanas, com os indicadores que já estão prontos.

**Riscos**
- Operação semanal.

**Fase 3:** extensão. O `/briefing-semanal` (cron de quarta-feira, `lib/briefing-gerador.ts`) hoje é focado na bacia do Amazonas. O prompt do estudo CNA já propõe uma camada semanal do "Radar Logístico".

**Notas originais:** 3·5·4·3·3.

---

### F15 · Monitor com mandato / coalizão de embarcadores
**O quê:** propor em PL ou em regulamento um monitor independente do sistema de escoamento, com relatórios semanais, mensais e anuais. Alternativa: uma coalizão de cooperativas e associações de produtores que financia a medição, com o IBI como executor técnico e metodologia pública.

**Precedentes**
- Canadá: "appoint an independent third party to monitor the overall efficiency" — grainmonitor.ca/about_us.html.
- Ag Transport Coalition: "jointly fund a 5-year Growing Forward 2 initiative" — agtransportcoalition.com/about/.

**Dado:** para acompanhar os PLs, a API da Câmara (testada, HTTP 200). Os dados privados dos membros dependem de acordo.

**Pergunta que responde:** "quem mede a eficiência do escoamento de forma independente e contínua?" Serve ao Congresso e à CNA.

**Antecipa ou só mede?** É um arranjo institucional. Dá mandato para antecipar.

**Esforço e prazo:** G, porque é um processo político.

**Riscos**
- O IBI pode parecer parte interessada ao se propor como executor. Exige governança independente.
- Conflito: excluir dado de terminal de armador.

**Notas originais:** 5·3·3·5·2.

---

### 3.1 Resumo da fase 3 (o que o repositório já tem e onde cada ficha se encaixa)
- **Pilares do IEE:**
  - F: line-ups de grão.
  - T: custo rodoviário e diesel.
  - S: Comex origem→porto.
  - H: hidrologia.
  - v3: BASIS (CEPEA/IMEA) e APERTO (frete IMEA).
  - Também há progresso de colheita da Conab (`scripts/conab/`), capacidade semanal da ANTAQ e pré-registro com backtest.
- **Monitor Hidrológico:** IRC, IDN, recessão, ETA de calado, Calendário LWS.
- **Obras e cobertura setorial:** Relógio e Livro-Razão (custo da inação e 15 fichas de obra), `/radar` (maturação da Ferrogrão), `/sobrecusto-rodoviario`, `/pavimento`, `/corredores/paranagua` e API pública do Relógio.
- **O que não aparece em nenhum lugar do código:** CIOT, tráfego de pedágio, cadastro de armazéns da Conab, AIS, satélite, modelo de rede, ObrasGov, carbono (só uma nota "não incluído por padrão" em `/sobrecusto-rodoviario`).

### 3.2 Revisão adversarial (fase 4)

**Economista do ESALQ-LOG**
- *"CIOT conta contrato, não tonelada, e o autônomo pesa mais que a frota própria. Vocês vão ler mudança de composição como mudança de rota."*
  - Procede. F1 caiu de 5 para 4 em factibilidade. Publicar sempre como participação relativa, com a cobertura declarada, e calibrar contra o Comex por UF.
- *"Frete por rota nós já medimos há 20 anos (SIFRECA)."*
  - Procede. F9 caiu de 3 para 2 em ineditismo. O caminho é parceria, não concorrência.
- *"A Infra S.A. tem modelo de rede do PNL e simulador de custo."*
  - Procede. Os pesquisadores conferiram: o ONTL tem "Simulador de Custo de Transporte". F11 caiu de 4 para 2 e F12 de 4 para 3 em ineditismo. O diferencial do IBI seria a calibração ex post e a publicação aberta dos cenários.

**Técnico do Ministério dos Transportes**
- *"O pedágio só cobre concessão federal. MT tem malha estadual enorme, e caminhão de 6 eixos não é só grão."*
  - F2 caiu de 5 para 4 em factibilidade e de 4 para 3 em antecipação, porque sai com cerca de 25 dias de defasagem, como o Comex. Sempre cruzar com F1.
- *"Um monitor com mandato legal é competência do Estado. Um instituto associativo propondo a si mesmo é conflito."*
  - F15 caiu de 3 para 2 em factibilidade. Reformular como apoio a um monitor público, com o IBI entre os candidatos a executar, não como executor designado.
- *"O cadastro de armazéns é declaratório."*
  - Mantido, mas F3 caiu de 4 para 3 em ineditismo: o déficit de silo já é pauta conhecida e o novo é só o recorte municipal recorrente.

**Editor de jornal de agro**
- *"Qual é a manchete de toda semana?"*
  - F14 só vale se trouxer um número novo por semana. Com F1, F2 e F5 ele tem. Sem eles, é só um briefing.
- *"Ficha por município e 'o que está em jogo' eu uso na hora."*
  - F6 e F7 mantidos.
- *"Alerta de pico que erra queima o observatório."*
  - F4 caiu de 4 para 3 em factibilidade. Só publicar depois do backtest.
- *"AIS e satélite são bonitos, mas quando dão pauta?"*
  - F13 mantido baixo em CNA (2). Fica como aposta de médio prazo.

**Ponto dos três céticos em comum:** os dados rodoviários (F1, F2) não são antecipação por data de publicação, só por ordem física. **Próximo passo mínimo antes de aprovar F1 e F2:** backtest CIOT MT→Itaituba e pedágio de Trairão contra a exportação do Arco Norte, com defasagem de 0 a 8 semanas. **Rodado em 25/09/2026, ver `backtest-ciot-pedagio.md`:** o CIOT antecipa a exportação do Arco Norte em cerca de 1 mês (erro 28% menor fora da amostra, p = 0,03). O pedágio não antecipa.

### 3.4 Testes rápidos com dado real (26/09/2026)

O objetivo foi ver se o resultado de cada ficha **é interessante**, não construir o produto. Os scripts estão em `testes-rapidos/`.

**F3 · Silo contra safra: interessante, com um achado novo.**
- **Brasil em 2024:**
  - produção de soja + milho de 259,2 Mt (IBGE PAM);
  - capacidade estática de granel sólido de 206,6 Mt (cadastro Conab: graneleiros, baterias de silos, silos e chapéus chineses; armazéns convencionais ficam fora);
  - cobertura de 0,80.
- **Cobertura por UF:** RO 0,32 · PA 0,48 · PI 0,51 · TO 0,56 · GO 0,59 · BA 0,63 · MA 0,64 · MG 0,67 · MT 0,68 · MS 0,78 · PR 0,96 · SC 1,33 · RS 1,38 · SP 1,70.
- **Achado:** o déficit nacional líquido é de 52,5 Mt, mas a soma dos déficits de cada microrregião chega a **88,2 Mt**. O silo que sobra no Sul e em SP não serve ao Centro-Norte, então **o déficit que o produtor sente é cerca de 70% maior que o número nacional**.
- **Maiores déficits por microrregião:** Sudoeste de Goiás (5,4 Mt), Norte Araguaia/MT (5,1 Mt; cobertura 0,37), Arinos/MT (4,3 Mt; 0,39), Alto Teles Pires/MT (2,9 Mt), Canarana/MT (2,9 Mt), Barreiras/BA (2,8 Mt), Entorno de Brasília/GO (2,7 Mt; 0,36), Paragominas/PA (1,6 Mt; 0,30).
- **Concentração:** 44% da produção está em municípios com cobertura abaixo de 50%. Há 21 municípios com mais de 100 mil t produzidas e nenhum silo cadastrado.
- **Ressalvas:**
  - Capacidade estática não é giro: o mesmo silo recebe soja e depois milho safrinha. A cobertura abaixo de 1 não é, sozinha, falta de silo.
  - O número não é comparável aos 118,7 Mt da CNA, que usam outro método (não conferi qual). É um indicador complementar, não uma correção.
- **Notas:** mantidas.

**F6 · "O que está em jogo": interessante, mas o número é um piso.**
- **Método:** a produção 2024 de cada município (IBGE, t e R$) foi repartida pela participação de cada destino nos CIOTs de grão com origem ali em 2025. Entram só municípios com pelo menos 30 CIOTs, que somam 93% da produção.
- **Produção atribuída a cada rota:**
  - ferrovia Rumo (Rondonópolis): 25,5 Mt / R$ 28,0 bi;
  - Itaqui (rodovia e ferrovia Norte-Sul): 17,2 Mt / R$ 26,2 bi;
  - **Tapajós (Miritituba): 15,3 Mt / R$ 16,1 bi**;
  - Paranaguá direto: 13,5 Mt;
  - Santos direto: 12,5 Mt;
  - **Madeira (Porto Velho): 11,1 Mt / R$ 12,9 bi**;
  - Barcarena direto: 4,1 Mt.
- **Quem depende do Tapajós:** 28 municípios mandam pelo menos 30% dos CIOTs de grão para Miritituba (25 em MT, 3 no PA). Alguns exemplos:

  | Município | Produção 2024 | CIOTs para Miritituba |
  |---|---|---|
  | Tabaporã | 2,2 Mt | 50% |
  | Sinop | 1,7 Mt | 60% |
  | Marcelândia | 1,0 Mt | 92% |
  | Cláudia | 1,1 Mt | 67% |
  | Peixoto de Azevedo | 0,6 Mt | 94% |
  | Novo Mundo | 0,6 Mt | 86% |
  | Alta Floresta | 0,6 Mt | 85% |
  | Matupá | 0,6 Mt | 77% |

  É exatamente o formato "e na minha base?" que a ficha propunha.
- **Ressalva:** 142 Mt caem em "outros destinos", porque o CIOT registra muito o primeiro trecho (fazenda → armazém ou esmagadora local). Os valores por rota são um **piso**. Para virar produto, é preciso combinar com a matriz UF→porto do Comex, que já está no pilar S do IEE.
- **Notas:** mantidas.

**F10 · Custo da água baixa: o efeito existe, mas é de limiar, e o modelo linear não capta.**
- **Especificação fixada antes (linear).** Log da exportação de soja + milho pela URF Manaus (Itacoatiara, rota do Madeira), com efeito de mês e de ano, contra a anomalia da cota média mensal em Porto Velho. Resultado: +15,7% de exportação por metro de anomalia em ago–nov (erro-padrão por ano; p ≈ 0,13). **Não é significativo.**
- **Estimativa por evento (exploratória).** O esperado de ago–nov vem de jan–jul do mesmo ano × a razão mediana ago–nov/jan–jul dos anos em que a cota de set–out em Porto Velho ficou acima de 2 m.
  - **2024** (cota média de set–out de 0,61 m): Itacoatiara **−856 mil t (−56%)** e Santarém −335 mil t (−13%). Em set, out e nov/2024, Itacoatiara embarcou 104, 112 e 38 mil t.
  - **2023** (1,57 m): **nenhuma perda**; ficou até acima do esperado.
- **Leitura:** o efeito aparece perto de 1 m em Porto Velho, não metro a metro. Com um único evento de ruptura em 10 anos, dá para contar a história de 2024, não para estimar uma elasticidade.
- **"Deixou de sair por ali" não é perda para a economia:** parte da carga foi para outros portos. Não monetizei.
- **Notas:** antecipação de 4 para 3 (total 18). O produto viável é o **alerta de limiar** acoplado ao Monitor, não uma elasticidade.

**F4 · Alerta de pico de escoamento: não antecipa. A pressão aparece no frete na mesma semana, não antes.**
- **Dado:**
  - % colhido semanal em MT (soja e milho 2ª), de 2022 a 2026. Vem dos zips históricos públicos da Conab (2022–2024, "acompanhamento das lavouras 2020 a 2024") e do cache do repositório (2025–2026).
  - Multiplicado pela produção de MT da Conab em cada safra, dá toneladas colhidas por semana. Conferência: 96,8 Mt colhidas em 2023 contra 97,6 Mt de produção.
  - Alvos: frete IMEA Sorriso→Santos e basis da soja em MT (CEPEA Paranaguá − IMEA), semanais, de jan/2023 a jun/2026.
- **Desenho (fixado antes de rodar):**
  - Sinal: toneladas colhidas nas últimas 4 semanas.
  - Alvo 0, 2 e 4 semanas à frente.
  - Controles: efeito de mês e de ano.
  - Validação: deixa um ano de fora; erro-padrão robusto a autocorrelação (HAC).
- **Resultado:**
  - **Frete na mesma semana:** +0,27% para cada Mt colhida no último mês (t = 4,5). No pico, com cerca de 30 Mt em 4 semanas, o frete fica uns 8% acima do normal do mês. O ganho de previsão, porém, é pequeno (erro 1,6% menor), porque o calendário já explica quase tudo.
  - **Frete 2 e 4 semanas à frente:** sem efeito (t = 1,1 e −0,6; razão de erro de 1,00 e 1,01).
  - **Basis:** sem efeito em nenhum horizonte (|t| ≤ 1,3).
- **Leitura:** o aperto da colheita se reflete no frete **na mesma semana**, e o mercado já precifica o calendário. Um alerta feito com o progresso da Conab chegaria junto com o frete, não antes.
- **Para antecipar de verdade**, seria preciso prever o ritmo da colheita semanas antes (pela semeadura ou por satélite). Mesmo assim, o teto do ganho é o 1,6% do efeito contemporâneo.
- **O que se aproveita:**
  - "Semanas de pico" funciona como informação descritiva, útil para o produtor e o boletim.
  - Os zips históricos da Conab (2020–2024) são um achado de dado útil.
- **Notas:** antecipação de 5 para 2 (total 17).

**F7 · Ficha logística municipal: viável e diferenciada. Dois campos precisam de ajuste.**
- **Protótipo:** fichas dos 500 maiores produtores de soja + milho, que somam **80% da produção de 2024**. Cada ficha traz:
  - produção e valor (IBGE PAM);
  - silo e cobertura, no município e na microrregião (Conab);
  - rotas de saída (CIOT 2025);
  - diesel S10 (ANP, semana de 13 a 19/09/2026).
- **Cobertura:**
  - silo e rotas estão presentes em 99% dos municípios;
  - **473 de 500 fichas saem completas**;
  - os nomes de município casaram em 100% entre ANP, CIOT e IBGE, depois de normalizar acentos.
- **As fichas se diferenciam bem entre si.** A cobertura de silo no município vai de 0,10 (p10) a 1,38 (p90). A rota principal também varia: Paranaguá 40 municípios, Rondonópolis 32, Norte-Sul 32, Santos 25, Tapajós 24, Madeira 21. Exemplos:

  | Município | Rotas (CIOT 2025) | Silo (cobertura) |
  |---|---|---|
  | Marcelândia/MT | 92% para Miritituba | 0,35 no município |
  | Paragominas/PA | 56% para Barcarena | 0,30 na microrregião |
  | Sorriso/MT | dividida: 40% local, 29% Rondonópolis, 27% Miritituba | 1,11 |
  | Cascavel/PR | 30% Paranaguá | 1,99 |

- **Campo fraco: diesel.** A ANP coleta preço em poucos municípios: só 57 dos 500 têm preço próprio, 208 usam a mediana da microrregião e 235 a da UF. A dispersão também é pequena (R$ 6,89 a 7,57, p10–p90). Na ficha, basta mostrar o diesel da UF ou da microrregião, ou tirar o campo.
- **Campo a ajustar: rotas.** Em 213 municípios, a "rota principal" é local ou regional, porque o CIOT registra o primeiro trecho (fazenda → armazém). A ficha deve mostrar a **principal rota de exportação entre as identificadas** e usar a matriz UF→porto do Comex como apoio (ver F6).
- **Não testado:** o piso ANTT por município, que exige os coeficientes da tabela ANTT e a distância até o porto.
- **Manutenção:** CIOT mensal, PAM e cadastro Conab anuais, diesel semanal. Nenhuma fonte exige raspagem frágil.
- **Notas:** factibilidade de 4 para 5 (total 19). A antecipação continua 1: é produto de medida, não de antecipação.

**F9 · Custo porteira-ao-porão: o trecho rodoviário dá para antecipar; os trechos de trem e barcaça dependem de parceria.**
- **Referência:** o USDA publica o custo trimestral de cada trecho por rota brasileira (dataset `wcku-8yrp`), em US$/t. O último trimestre publicado é **2025T3**; em set/2026, isso é cerca de 1 ano de defasagem. Há trechos de caminhão, de trem (Rondonópolis→Santos) e de barcaça (Itaituba→Santarém/Barcarena).
- **Trecho rodoviário (teste):**
  - Converti o custo USDA Sorriso→Santos para R$/t pela PTAX (BCB) e comparei com o frete semanal IMEA na mesma rota, que já está no repositório. Foram 11 trimestres em comum (2023T1 a 2025T3).
  - O IMEA fica em média a **0,95** do USDA; entre 2023T4 e 2024T4, 1,00. A correlação é de 0,64, tanto em nível quanto em variação.
  - **O IMEA já cobre 2025T4, 2026T1 e 2026T2**, que o USDA ainda não publicou. É cerca de 3 trimestres de vantagem.
- **Porteira-ao-porto das rotas de Sorriso em 2025T3** (US$/t do USDA × PTAX de 5,45; só frete, sem tarifas de transbordo e elevação):

  | Rota | R$/t | Trechos (US$/t) |
  |---|---|---|
  | Caminhão até Santos | 502 | 92,1 |
  | Caminhão até Paranaguá | 497 | 91,2 |
  | Caminhão + trem via Rondonópolis | 452 | 32,7 + 50,3 |
  | Caminhão + barcaça via Itaituba até Barcarena | 432 | 55,0 + 24,2 |
  | **Caminhão + barcaça via Itaituba até Santarém** | **358** | 55,0 + 10,8 |

  A rota do Tapajós sai **cerca de R$ 144/t (29%) mais barata** que o caminhão direto a Santos.
- **O que falta:** trem, barcaça e as tarifas de transbordo e elevação não têm fonte brasileira aberta testada. Hoje só dá para usar o USDA, com defasagem, ou fazer parceria (SIFRECA/ESALQ-LOG, Campo Futuro da CNA, operadores). A tabela ANTT de tarifas ferroviárias não foi testada.
- **Ineditismo:** continua 2. O USDA faz isso; o IBI acrescentaria frequência semanal no trecho rodoviário, mais rotas e as tarifas portuárias.
- **Notas:** antecipação de 2 para 3 (total 17).

**F10, 2ª rodada (26/09/2026): corrige a 1ª. A perda de 2024 em Itacoatiara não se separa do ruído normal.**

**(1) Série longa, 1997–2025**
- Dados: cota da ANA (HidroSerieHistorica) em Porto Velho (15400000) e Itaituba (17730000); Comex por URF desde 1997, com o NCM antigo da soja (12010090) até 2011.
- **Achado descritivo:** de 1997 a 2022, a cota média de set–out em Porto Velho nunca ficou abaixo de 2,30 m; a menor foi 2,40 m em 2005. **2023 (1,56 m) e 2024 (0,62 m) não têm precedente em 28 anos.** Por isso a série longa não traz outros eventos abaixo de 2 m para estimar limiar.
- **O método de evento é ruidoso demais para Itacoatiara.** Nos 23 anos com cota ≥ 2,5 m, o desvio de ago–nov contra o esperado vai de **−47% a +136%** (p10–p90). Em 2010, com 2,94 m, o desvio foi −61%, igual ao de 2024 (−62%). **O "−56% em 2024" da 1ª rodada não se distingue do ruído** e não deve ser citado como efeito da água.

**(2) Tapajós (Santarém + Belém/Barcarena, desde 2015, com Miritituba operando)**
- 2024 teve a menor cota de Itaituba da série: **1,26 m, desvio de −29%**. 2020, com 1,96 m, teve −10%.
- Nos anos normais de 2018 a 2025, o desvio fica entre −11% e +10%. Ficam fora dessa faixa 2016 (−82%, início da operação) e 2021 (−50%, com água normal, compatível com a quebra da safrinha de 2021, que não conferi).
- É um sinal consistente com efeito da água, mas **de novo com um só evento forte**.
- O CIOT com destino Itaituba em ago–nov é ruidoso: −45% em 2024, mas também −32% em 2023 e −57% em 2021, ambos com água normal.

**(3) 2024: desvio ou perda? Exportação de soja + milho com origem MT, ago–nov, por porto**
- Portos do norte caíram **3,2 Mt**: Itacoatiara −0,6, Santarém −0,7, Barcarena −1,8, Santana −0,1.
- Houve alta em **São Luís (+0,4 Mt) e Santos (+0,6 Mt)**, com São Francisco do Sul +0,1. **Cerca de 1,1 Mt, um terço da queda, parece ter sido desviado.**
- O total MT + RO ficou **−2,5 Mt (−12%)**, e **não houve recuperação em dez–fev**: a razão dez–fev/jan–jul foi 0,24, contra 0,27–0,43 nos outros anos.
- Não dá para atribuir esse −12% só à água. A safrinha de 2024 em MT foi menor (48,2 Mt contra 50,7 Mt em 2023, Conab), e a demanda interna de milho pode ter pesado; não conferi.

**Leitura final da F10**
- A história de 2024 é forte como **descrição**: seca sem precedente, um terço da carga desviada para São Luís e Santos, queda do norte de 3,2 Mt.
- Não há base estatística para uma **elasticidade** nem para um limiar calibrado.
- O produto viável é descritivo: um "monitor de desvio de carga" em secas, usando o Comex por porto e origem. Um alerta calibrado não tem base.
- **Notas:** antecipação de 3 para 2 (total 17).

**F12 · Índice de criticidade de corredores: a versão mínima falha, e a falha mostra por quê.**
- **Teste:**
  - Polo Norte de MT (microrregiões Alto Teles Pires, Sinop, Arinos e Parecis): 45,4 Mt de soja + milho em 2024.
  - Volume por rota, pelo CIOT 2025: ferrovia Rumo 21,1 Mt, Tapajós 16,9 Mt, Madeira 6,9 Mt, caminhão até Santos ou Paranaguá 0,6 Mt.
  - Custo por rota: trechos do USDA em 2025T3, em R$/t. Tapajós 358, Rumo 452, caminhão até Santos 502, caminhão até Paranaguá 497.
  - Método: fecha um arco por vez e manda a carga para a rota aberta mais barata, sem limite de capacidade.
- **Resultado:**
  - Fechar a BR-163 Norte ou a hidrovia do Tapajós custaria **cerca de R$ 1,6 bi/ano**, com 16,9 Mt indo para a ferrovia. É um piso, porque supõe que a ferrovia tem folga de 17 Mt.
  - Fechar a ferrovia daria **custo negativo (−R$ 2,0 bi/ano)**: a carga iria para o Tapajós, que é mais barato. É um absurdo.
- **O que a falha revela:** 21 Mt escolhem a ferrovia pagando cerca de **R$ 94/t a mais** de frete que o Tapajós. O frete não explica a escolha de rota. Ficam fora da conta:
  - capacidade (os terminais de Miritituba e as barcaças não absorvem tudo);
  - tarifas de transbordo e elevação;
  - contratos e ativos das tradings (quem é dono de qual terminal);
  - sazonalidade da água.
- **Conclusão:** a F12 só é viável com o modelo de rede da F11, calibrado com capacidades e custos completos. Isso reforça que a F11 é pré-requisito, e que ela precisa de parceria (SIFRECA, Infra S.A./ONTL, operadores). O "custo revelado" de cerca de R$ 94/t, a diferença entre o frete e a escolha observada, é um achado aproveitável para a F9 e a F11.
- **Notas:** mantidas (factibilidade 2).

**F14 · Boletim semanal: viável, mas só 4 de 10 indicadores têm número novo toda semana.**
- **Teste:** montei a edição de 21 a 27/09/2026 só com dados públicos disponíveis no dia, em `testes-rapidos/boletim-prototipo-2026-09-27.md`.
- **Semanais e automáticos (4):**
  - diesel S10 da ANP;
  - line-up de Paranaguá (grão e fertilizante);
  - progresso de plantio e colheita da Conab, com cerca de 1 semana de atraso;
  - cotas da ANA.
- **Houve manchete nesta semana:** diesel S10 +2,8% em uma semana (R$ 7,13 → 7,33/L). Também há fila de 26 graneleiros ao largo de Paranaguá (1,56 Mt).
- **Mensais (3):** CIOT, com o nowcast da F1; Comex; pedágio. Rendem uma manchete forte por mês, não toda semana.
- **Semanais na fonte, mas hoje fora do alcance automático (2):**
  - frete IMEA: a planilha do repositório é manual e para em jun/2026;
  - basis CEPEA: o site devolveu HTTP 403 ao script.
  Sem esses dois, o boletim perde o indicador de preço de logística mais lido.
- **Outras dependências:**
  - os line-ups de Santos, Itaqui e Vila do Conde estão indisponíveis em produção; a tarefa de conserto está em andamento;
  - a página do boletim semanal da Secex (MDIC) devolveu 404, e não testei outra URL.
- **Leitura do editor de agro:** há manchete na maioria das semanas (diesel, fila, rios), mas a manchete **exclusiva** do Observatório (o nowcast do CIOT) é **mensal**. O formato que se sustenta é: **boletim semanal curto, com uma edição "grande" mensal no dia ~10**, quando sai o CIOT.
- **Notas:** factibilidade de 5 para 4 (total 17).

**F8 · Pedido à ANTT (valor de frete do CIOT agregado): o caso ficou mais forte. Nada foi enviado.**
- **O valor não é publicado hoje (conferido):**
  - O catálogo de dados abertos da ANTT tem 106 datasets. O `ciot` traz só contagens ("Quantidade mensal dos CIOTs emitidos.").
  - O painel Power BI do transporte rodoviário de cargas, linkado no dataset `transporte-rodoviario-de-cargas`, mostra só o cadastro RNTRC (2 páginas; 908.162 transportadores ativos).
- **Novo fato: desde 24/05/2026, a ANTT tem o valor do frete de praticamente todo o mercado.**
  - Notícia da ANTT de 24/04/2026 ([link](https://www.gov.br/antt/pt-br/assuntos/ultimas-noticias/frete-irregular-e-barrado-antes-de-existir-antt-transforma-ciot-em-filtro-obrigatorio-e-reforca-o-cumprimento-do-piso-minimo)). Trechos conferidos no HTML:
    - *"A obrigatoriedade do CIOT é ampliada para todas as operações de transporte rodoviário remunerado"*, incluindo frota própria;
    - *"se o valor do frete estiver abaixo do piso mínimo, o sistema bloqueia o registro"*.
  - Base legal citada: Resolução ANTT nº 6.078/2026 e MP nº 1.343/2026. Vigência: 24/05/2026.
  - **Isso explica a quebra de cobertura do CIOT a partir de mai/2026**, vista no backtest da F1 (total +40% e registros sem origem/destino).
- **Precedente brasileiro direto: ANAC.** A ANAC publica os microdados das tarifas aéreas comercializadas, por rota e mês, desde 2002. Trecho conferido ([link](https://www.gov.br/anac/pt-br/assuntos/dados-e-estatisticas/microdados-de-tarifas-aereas-comercializadas)): *"microdados do registro das tarifas aéreas domésticas e internacionais comercializadas passam a ser disponibilizados"*, com base na Resolução ANAC nº 437/2017. É um regulador de transporte publicando preço de transação por rota, exatamente o que a F8 pediria.
- **Pedido de LAI anterior sobre valor do CIOT:** não achei na busca web; não pesquisei no Fala.BR / Busca LAI da CGU.
- **Desenho do pedido (sugestão, não enviado):**
  - mediana e quartis de R$/t·km por par de municípios (ou microrregiões) × NCM de 4 dígitos × mês;
  - supressão de células com poucas operações ou poucos contratantes, para proteger o sigilo comercial;
  - enquadramento de **dados abertos**, no molde da ANAC.
  - Com o piso aplicado como filtro, os valores ficam, por construção, acima do piso. O dado mostraria o **prêmio de mercado sobre o piso**, não descumprimento, o que evita o tom de denúncia.
- **Consequência para a F1:** com o CIOT universal, a contagem de agora em diante representa o mercado todo, mas a série tem uma quebra em mai/2026. O nowcast precisa ser reestimado ou tratado como participação.
- **Notas:** factibilidade de 2 para 3 (total 19). O dado agora existe para todo o mercado e há precedente regulatório. A decisão ainda é da ANTT.

**F15 · Monitor com mandato / coalizão: o mandato já existe no ONTL e a coalizão já existe em MT. A ficha muda de "criar" para "conectar".**
- **Mandato:** o Brasil já tem um órgão público com atribuição de monitorar a logística. O ONTL, da Infra S.A., diz, em trecho conferido no HTML de [ontl.infrasa.gov.br/o-observatorio](https://ontl.infrasa.gov.br/o-observatorio/): *"atribuições regimentais da Infra S.A., sobretudo no tocante ao monitoramento dos sistemas logísticos"*.
  - Propor um novo monitor com mandato em lei soaria como duplicação.
  - O diferencial do modelo canadense (Grain Monitoring Program) é ser **independente, específico do grão e periódico** (semanal, mensal e anual). É isso que falta, não o mandato.
- **Projetos de lei na Câmara** (API de dados abertos; PL/PLP desde 2019; palavras-chave escoamento, logística, observatório, hidrovias e frete, até 500 resultados cada, filtrando ementas com monitoramento ou indicador + logística):
  - **não achei proposta de monitor independente do escoamento agrícola**;
  - os mais próximos são o PL 4458/2026 ("Política Nacional de Transparência dos Custos Logísticos em Regiões de Difícil Acesso", voltado ao consumidor na Amazônia), o PL 4617/2026 (REICON Norte, com indicadores de competitividade) e o PL 7058/2025 (confiabilidade logística em rodovias do Norte, com gestão por desempenho).
  - O Senado não foi pesquisado.
- **Coalizão:** o equivalente brasileiro da Ag Transport Coalition já existe em MT, o **Movimento Pró-Logística**. Reúne Aprosoja, Famato, OCB/MT, FIEMT, Ampa, Acrimat e outros, com presidência da Aprosoja, e financia estudos (EVTEA de hidrovias). A Revista Cultivar, em 02/10/2014, o descreve como *"o mais organizado fórum de mobilização da sociedade civil organizada"* na logística de MT. A **CNA já atua com ele**: *"CNA, Aprosoja e Movimento Pró-Logística percorrem BR-163"* (título conferido em cnabrasil.org.br).
- **Ficha redesenhada:**
  - **(a)** o IBI oferece ao ONTL a produção de uma série independente do escoamento de grãos (F1, F3, F6), como parceiro técnico, sem pedir mandato novo;
  - **(b)** o Pró-Logística e as federações da CNA entram como coalizão financiadora e fonte de dados privados, como pedidos de frete e filas, no molde canadense;
  - **(c)** um PL só se (a) e (b) não andarem, e para dar periodicidade obrigatória ao que o ONTL já pode fazer.
- **Riscos:** o IBI parecer parte interessada (a governança precisa ser independente e a metodologia pública); sobreposição com o ONTL (por isso a proposta é parceria, não concorrência).
- **Notas:** ineditismo 5→3 (o mandato já existe); factibilidade 2→3 (há coalizão e órgão para conectar); CNA 3→4 (já trabalha com o Pró-Logística). Total 17.

**F11 · Modelo de rede "quem migra": a pergunta certa não é custo, é capacidade.**

**(1) Avaliação ex post da BR-163/PA (pavimentação concluída em nov/2019)**
- Medida: participação do Arco Norte (Tapajós + Itaqui) na exportação de soja + milho com origem MT, no Comex.
- Tapajós e Itaqui vão somados porque em 2018–2019 Itaqui aparece com 0% enquanto o Tapajós salta, o que indica mudança na atribuição de portos (URF), não carga real.

  | Ano | Participação do Arco Norte na exportação de MT |
  |---|---|
  | 2015 | 13,2% |
  | 2016 | 12,8% |
  | 2017 | 15,3% |
  | 2018 | 23,9% |
  | 2019 | 30,8% |
  | **2020** | **44,6%** |
  | 2021 | 43,1% |
  | 2022 | 43,2% |
  | 2023 | 44,1% |
  | 2024 | 45,8% |
  | 2025 | 42,2% |

- **Degrau de 14 p.p. em 2020**, no ano seguinte ao fim da pavimentação, seguido de **platô** em 42–46%. Só com a série do Tapajós, o modelo com quebra dá: degrau de +13,6 p.p. em 2020 (erro-padrão 5,8), tendência que zera depois de 2020, sem efeito da cota de Itaituba.
- **Ressalva:** no mesmo período entraram terminais em Miritituba e Barcarena. Com uma série só, não dá para separar a obra da capacidade portuária. É **evidência descritiva compatível** com efeito da obra, não um efeito causal identificado.

**(2) Sensibilidade da escolha de rota ao custo (USDA trimestral, 2019T1–2025T3, 27 trimestres)**
- Regressão: log(Tapajós / Santos + Paranaguá) na exportação de MT contra a vantagem de custo do Tapajós (Sorriso → Itaituba → Santarém contra caminhão até Santos), com tendência e efeito de trimestre.
- Resultado: coeficiente de +0,003 por US$/t (erro-padrão 0,005). **Nulo.**
- A vantagem de custo do Tapajós subiu de cerca de US$ 20/t (2019–2021) para US$ 36–38/t (2022–2023), e **a participação não se mexeu**.

**Leitura**
- Desde 2020, a divisão entre corredores é **limitada pela capacidade** (terminais de transbordo, barcaças, janelas de navio), não pelo preço do frete.
- Isso explica o "custo revelado" de cerca de R$ 94/t da F12 e o platô da série.
- **Para a Ferrogrão, a pergunta relevante é quanta capacidade de embarque no Norte ela e os terminais acrescentam, não a tarifa.**
- Um modelo de rede só com custo erraria. O modelo útil é de **alocação com restrição de capacidade**, e a capacidade dos terminais e da frota de barcaças exige a ANTAQ e parceria com operadores e com a Infra S.A.

**Notas:** mantidas (ineditismo 2, factibilidade 2).

---

## 4. Lista bruta (58 ideias)

**Legenda da coluna "Fase 3":** N = nova · E = extensão · J = já temos · F# = virou ficha.
Links abertos pelos pesquisadores em 25/09/2026. "n/c" = não conferi.

### Frente 1: referências internacionais
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| A1/D1 | Boletim semanal de transporte do agro | ams.usda.gov/services/transportation-analysis/gtr | E → F14 |
| A2/C5 | Spread porto–interior da soja | agtransport.usda.gov/d/an4w-mnp7 | J (BASIS v3) |
| A3 | Spread de fertilizante: preço no interior × chegada ao porto | agtransport.usda.gov/d/u8i9-uebx | E → F5 |
| A4/B2/C2 | Carretas de 6 eixos ou mais nos pedágios por corredor | destatis.de (truck-toll-mileage); bcr.com.ar; melhoresrodovias.org.br/indice-abcr_2/ | N → F2 |
| A5/B5 | Line-up programado como nowcast de embarque | bcr.com.ar; accc.gov.au/business/industry-codes/wheat-port-code-of-conduct | J (pilar F) |
| A6 | Tempo de espera de graneleiros | grainmonitor.ca (relatório semanal) | J, e perto de armador |
| A7/B3 | Termômetro de contratação de frete pelo vale-pedágio (VPO) | agtransport.usda.gov/d/k574-exej | N (fraco: só agregado nacional) |
| A8 | Fluxo reverso de fertilizante pelo Arco Norte | agtransport.usda.gov/d/2h58-ze4m; /d/cjz9-jsej | E → F5 |
| A9 | Divisão por modo da chegada aos portos | bcr.com.ar (informativo semanal "camiones") | E (`/corredores/paranagua`) |
| A10 | Métrica semanal de serviço ferroviário (vagões parados há mais de 48 h) | agtransport.usda.gov/d/fta3-xryx; apk-inform.com/en/consulting/logistic | N |

### Frente 2: dados alternativos e tempo real
| ID | Ideia | Precedente / dado | Fase 3 |
|---|---|---|---|
| B1/D5 | Radar CIOT origem-destino por NCM | e-way bill Índia (blog.saginfotech.com); dados.antt.gov.br `ciot` | N → F1 |
| B4 | Line-up de fertilizante (Paranaguá, Santos) | USDA GTR; appaweb.appa.pr.gov.br | E → F5 |
| B6 | Agendamento de caminhões no porto (Carga Online) | hipótese do IBI; portosenavios.com.br (507.915 caminhões em 2025) | N (depende de parceria) |
| B7 | Caminhões em movimento detectados pelo Sentinel-2 | esa.int (Truck_detection_using_data_from_Copernicus_Sentinel-2) | N → aposta 2 |
| B8 | Contagem de barcaças por satélite em Miritituba e Santarém | arxiv.org/abs/2510.11449 | N → aposta 2 |
| B9 | Rede AIS própria | cisa.gov (LPMS); arxiv.org/abs/2501.00615 | N → F13 |
| B10 | Nível do rio por satélite (SWOT) em trechos sem régua | github.com/podaac/hydrocron | E (Monitor) |
| B11 | Área de banco de areia exposta por Sentinel-2 | hipótese do IBI | E (Monitor) → aposta 2 |
| B12/C13 | Colheita por satélite convertida em onda de caminhões | cropmonitor.org; PMC11041643 | E → F4 |
| B13 | Silo-bolsa e estoque a céu aberto por satélite | Dymaxion Labs (n/c, página deu 403) | N (precedente não verificado) |
| B14 | Pressão de frete: preço das plataformas × volume do CIOT | opovo.com.br (índice Edenred/Repom); tecnologistica.com.br (Frete.com) | N (depende de parceria privada) |
| B15 | Diesel ANP semanal por município e vendas por UF | ANP (testado) | J (pilar T) |
| B16 | Telemetria de frota e Waze para filas nos acessos portuários | truckingresearch.org (ATRI top 100 gargalos 2026); waze.com/wazeforcities | N |
| B17 | NF-e, CT-e e MDF-e agregados por convênio com SEFAZ | e-way bill Índia; sped.rfb.gov.br (CT-e só anual e por UF) | N → aposta 1 |
| B18 | Ferrovia: vagões de grão por semana | aar.org/data-center/rail-traffic-data/; ANTT SIADE (vai só até 2025) | N |

### Frente 3: indicadores e índices
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| C1 | Custo porteira-ao-porão por rota | ams.usda.gov/services/transportation-analysis/brazil | E → F9 |
| C3 | Custo econômico da água baixa (padrão Kaub, rio Reno) | Kiel WP 2155 (URL completa não registrada); farmdocdaily.illinois.edu | E → F10 |
| C6 | Índice de criticidade de corredores | Banco Mundial, *Understanding Transport Resilience*; Colon et al. 2020 | N → F12 |
| C7 | HHI modal e portuário por UF de origem | DOJ (definição do HHI); uso em corredor é hipótese do IBI | E (Comex `gera-participacao.py`) |
| C8 | Custo da inação calibrado por rede | ASCE, *Failure to Act* | J (Relógio) |
| C9 | Pegada de carbono por rota (GLEC/ISO 14083) | Smart Freight Centre, GLEC v3 | N |
| C14 | Índice de pressão de escoamento | hipótese do IBI | J (IEE) |
| C16 | Frete de retorno puxado pelo fertilizante | farmdoc (precedente fraco) | E → F5 |
| D2 | Índice aberto de frete rodoviário de grãos | USDA dataset `i4ty-m7hq` (parado em set/2025) | E (frete IMEA no IEE v3) |

### Frente 4: métodos
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| C4 | Previsão probabilística de calado para 2 a 6 semanas | bafg.de (conferido em parte); PEGELONLINE | J (IRC/ETA) |
| C10 | Modelo de rede / equilíbrio espacial | CPI/PUC-Rio (Ferrogrão); artigo em Environ. Monit. Assess. 2024 | N → F11 |
| C11 | Avaliação ex post da BR-163 | Donaldson AER 2018; Morten & Oliveira 2024; CARD/Iowa State | N → F11 |
| C12 | Gravidade estrutural origem→porto | Anderson & van Wincoop, AER 2003 | N |
| C15 | Cenários CMIP6 de estiagem nas hidrovias | Chaudhari & Pokhrel (IOPscience; trecho só via WebFetch) | N → aposta 3 |
| C17 | Gêmeo digital do corredor BR-163 → Tapajós | arxiv.org/abs/2212.07722 (só o título) | N |

### Frente 5: priorização de obras e incidência
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| A11 | Monitor independente com mandato legal | grainmonitor.ca/about_us.html | N → F15 |
| A12 | Coalizão de embarcadores que financia a medição | agtransportcoalition.com/about/ | N → F15 |
| A13 | "O que está em jogo" por corredor e base eleitoral | agtransport.usda.gov/d/nuc7-ab93 | N → F6 |
| A14 | Lista de prioridades com estágio de maturidade | Infrastructure Australia (via treasury.act.gov.au); tc.canada.ca (National Trade Corridors Fund) | E (Livro-Razão; Carteira no estudo CNA) |
| A15 | Execução orçamentária de obras do escoamento, série longa | infraestructurapublica.cl (Reporte n.º 11); gao.gov/products/gao-21-240r | E (Livro-Razão) |
| D16 | Painel das obras de escoamento para a subcomissão da CAPADR | olhardireto.com.br (07/05/2025); ObrasGov API (HTTP 200) | E (Livro-Razão) |

### Frente 6: produtos e formatos
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| D3 | Calculadora de frete de referência para o produtor | calculadorafrete.antt.gov.br | E (engine `custeio-rodoviario.ts`) |
| D7 | Ficha logística municipal | usafacts.org/about-usafacts/ | N → F7 |
| D13 | API aberta do Observatório | agtransport.usda.gov (plataforma aberta, 454 datasets) | E (API pública do Relógio) |
| D14 | Simulador "e se esta ferrovia ficar pronta?" por município | ONTL/Infra S.A., Simulador de Custo de Transporte | E (`/radar`) + F11 |

### Frente 7: parcerias
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| D4 | ANTT: valor de frete CIOT agregado | gov.br/antt (CIOT para todos) | N → F8 |
| D11 | Autoridades portuárias publicarem caminhões por dia | bcr.com.ar ("Ingreso de camiones a zona portuaria de Rosario") | N |
| D12 | Perdas no transporte medidas por balanças de cooperativas | maissoja.com.br (estimativas divergentes) | N |
| D15 | Parceria com o ESALQ-LOG (SIFRECA) | esalqlog.esalq.usp.br/sifreca | E (já citado em `calibracao-T-frete.md`) |

### Frente 8: lacunas do debate
| ID | Ideia | Precedente | Fase 3 |
|---|---|---|---|
| D6 | Balanço de silo por município | cnabrasil.org.br (118,7 Mt); Canal Rural (>130 Mt) | N → F3 |
| D8 | Monitor recorrente das estradas vicinais | estudo CNA + ESALQ-LOG de 09/10/2025 (via cenariomt.com.br) | N (fazer com a CNA, não em paralelo) |
| D9 | Rota do fertilizante do porto à fazenda | Comex Stat, APPA, CIOT (testados) | E → F5 |
| D10 | Alerta de pico de escoamento da safrinha | fews.net | E → F4 |

**Contagem:** frente 1: 10 · frente 2: 15 · frente 3: 9 · frente 4: 6 · frente 5: 6 · frente 6: 4 · frente 7: 4 · frente 8: 4. **Total: 58 ideias únicas**, depois de fundir as duplicatas entre pesquisadores. A base bruta tinha cerca de 66.

---

## 5. Três apostas ousadas (alto risco, alto impacto, valem um piloto)

**Aposta 1. O e-way bill brasileiro: manifesto de carga diário por convênio com a SEFAZ-MT**
- **A ideia:** um convênio para receber, com defasagem de dias, o agregado do MDF-e (o manifesto eletrônico que acompanha toda carga interestadual) por município de origem, UF de destino e NCM. Seria o sinal mais rápido e completo do escoamento que existe no país.
- **Precedente:** a Índia usa o e-way bill como indicador de atividade (link em F1).
- **Situação hoje:** o dado público testado é inútil para isso. O CT-e só sai anual e por UF, em sped.rfb.gov.br, e o DT-e da ANTT ainda não publica nada.
- **Riscos:** sigilo fiscal, negociação longa e risco político.
- **Por que tentar:** o piloto é uma carta da CNA à SEFAZ-MT pedindo um agregado anonimizado, que custa pouco.

**Aposta 2. O olho no satélite em Miritituba e no Tabocal**
- **A ideia:** usar o Sentinel-2, que é aberto e tem passagem a cada 2 a 5 dias, para três contagens:
  - caminhões em movimento na BR-163 (método da ESA);
  - comboios fundeados nas áreas de espera de Miritituba e Santarém;
  - área de banco de areia exposta no Tabocal.
- **Acesso testado:** 34 cenas entre 01/08 e 25/09/2026, com a última de 22/09.
- **Riscos:**
  - 10 m de resolução pode não separar balsas individuais; o precedente do Mississippi usa imagem de alta resolução, que é paga.
  - Há nuvem na época de colheita.
- **Por que tentar:** é o único sinal independente de qualquer órgão, com cerca de 3 dias de defasagem. Casa com o Monitor Hidrológico.

**Aposta 3. O valor de opção climático: quantas "secas de 2024" teremos em 2040 e 2060?**
- **A ideia:** usar cenários CMIP6 e GloFAS de vazão mínima para estimar a frequência de anos com restrição severa no Madeira e no Amazonas. Traduzir isso no valor de ter uma alternativa ferroviária ou rodoviária.
- **Precedente:** Chaudhari & Pokhrel projetam "a ∼20% decrease in the long-term averaged low flow". Esse trecho veio via WebFetch e não foi conferido no HTML.
- **Riscos:**
  - O dado do GloFAS/CDS exige conta, e não testei o acesso.
  - A incerteza dos modelos climáticos é alta, com risco de alarmismo.
- **Por que tentar:** muda a conversa sobre obra de "custo hoje" para "seguro contra o clima", uma pauta com orçamento internacional (BID, Banco Mundial).
