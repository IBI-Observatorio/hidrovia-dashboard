# Novos produtos de dados para a logística do agro (CNA): ideias fora do backlog do Observatório

> Pesquisa de 22/10/2026. Os testes de acesso foram chamadas reais (curl e Python) feitas nesta data. Os arquivos baixados ficaram fora do repositório, em `%TEMP%\cnat\dl`.
> **Lido antes:** `docs/parceria-cna/ideias-novas.md` (F1–F15, lista bruta de 58 ideias, apostas). Quando uma ideia daqui encosta em algo de lá, isso está marcado.
> **Convenções:** os trechos entre aspas são literais e têm menos de 15 palavras. "Via resumo de busca" quer dizer que o fato veio do resumo do buscador e o trecho literal não foi conferido na página. "Não conferi" quer dizer que não verifiquei. Nenhum número foi estimado.
> **Fora do escopo:** frete marítimo e armador. Nenhuma ficha trata lacuna de dado oficial como defeito. Lacuna aparece como oportunidade de produto ou de parceria.
> **Bloqueios de acesso nesta sessão:**
> - `dados.antt.gov.br` derrubou a conexão ("Connection was reset") nas três tentativas. O backlog o testou com sucesso em 25/09/2026.
> - `portaldeinformacoes.conab.gov.br` deu erro de certificado TLS no curl.
> - Nos dois casos: não conferi hoje.

## Visão geral: quais ideias novas e como se comparam?

### Takeaway
São 20 fichas novas (N1–N20), cada uma com fonte aberta e, na maioria, acesso testado hoje.
- **Mais fortes pelo ineditismo somado à facilidade:**
  - N6, crédito para armazém por município (SICOR, testado);
  - N9, demografia do caminhoneiro (Senatran e CAGED, testados);
  - N10, capacidade ferroviária ociosa declarada (Declaração de Rede 2025, testada);
  - N11, radar das ferrovias autorizadas (com janela de incidência aberta até 19/11/2026);
  - N12, ficha da nova legislatura (TSE 2026, arquivo de 21/10/2026).
- **Antecipação de verdade:** só N3, o alerta INMET nos corredores (1 a 3 dias), e N9, a tendência demográfica (anos). As demais medem.

### Cited Findings
Tabela-resumo. **Antec.** = antecipa (A) ou mede (M). **Esforço:** P (até 3 semanas), M (1 a 2 meses), G (mais de 2 meses). **Teste** = resultado do acesso feito em 22/10/2026.

| # | Ideia | Fonte principal | Teste | Usuário | Antec. | Esforço | Risco principal | Relação com o backlog |
|---|---|---|---|---|---|---|---|---|
| N1 | Monitor de transitabilidade das vicinais na chuva | OSM Overpass + INMET + S2iD + PAM | OSM 200; INMET 200; S2iD página 200 (exportação n/c) | federação, produtor, CNA | A (curto) / M | M | dado OSM desigual entre municípios | complementa o estudo CNA/ESALQ-LOG de 2025; D8 da lista bruta ("fazer com a CNA") |
| N2 | Mapa de "estrada de terra por tonelada" por município | OSM + PAM | OSM 200 (Sorriso: 1.631 vias) | federação, Congresso | M | P | OSM não mede condição | nova |
| N3 | Alerta de tempo severo nos corredores de escoamento | INMET avisos (API) + malha SNV | 200 (2 avisos hoje, 5 futuros) | produtor, transportador, imprensa | A (1–3 dias) | P | alerta é meteorológico, não rodoviário | nova |
| N4 | Sinistralidade dos corredores de grão por safra | PRF BAT 2026 | 200 (zip 2,5 MB; até 31/08/2026) | CNA, Executivo, imprensa | M | P | causalidade com a safra | nova |
| N5 | Radar de fiscalização de excesso de peso nos corredores | PRF multas 2026 | 200 (zip 194 MB; 7 meses) | Executivo, Congresso, concessionárias | M | P | tema sensível ao transportador | nova |
| N6 | Termômetro do crédito para armazém por município | BCB SICOR, API OData | 200 (2025: 19.796 registros) | CNA, Congresso (Plano Safra), federação | M | P | o item mistura silo com galpão e estufa | conversa com F3 (silo × safra) sem repeti-la |
| N7 | Mapa do investimento logístico financiado (BNDES/Finame) | BNDES dados abertos | 206 (cabeçalho com `municipio_codigo`) | Congresso, BNDES, CNA | M | M | CPF/CNPJ mascarado | nova |
| N8 | Idade e composição da frota de caminhões por município | Senatran, frota (set/2026) | 200 (17,5 MB e 8 MB) | Congresso, Executivo | M | P | frota registrada ≠ frota rodando no município | nova |
| N9 | Termômetro do motorista: envelhecimento e oferta regional | Senatran, habilitados (set/2026) + Novo CAGED | 200; FTP do CAGED até 202608 | CNA, Executivo, Congresso | A (estrutural) | M | número "histórico" pode incluir CNH vencida | nova |
| N10 | Capacidade ferroviária ociosa declarada perto do agro | ANTT, Declaração de Rede 2025 | 200 (RMN: 35 segmentos) | CNA, Executivo, usuários dependentes | M / A | M | dado declaratório da concessionária | nova (A10 e B18 da lista bruta medem serviço, não capacidade) |
| N11 | Radar das ferrovias autorizadas (Lei 14.273) e o agro | página da ANTT + painéis | 200 (agregados; lista só em Power BI) | CNA, Congresso, Executivo | M | M | estágio dos projetos muda rápido | nova |
| N12 | Ficha logística da nova legislatura (2027–2030) | TSE 2026, votação por município | HEAD 200 (455 MB; 21/10/2026) | CNA, Congresso | M | M | soar partidário | **extensão de F6/A13** com dado novo |
| N13 | Conectividade no corredor e na fazenda | Anatel dados abertos + Censo Agro 2017 | página 200 (cobertura por trecho n/c) | Executivo, Anatel, CNA | M | M | dado de cobertura por rodovia não localizado | nova |
| N14 | Energia rural para silo, secador e irrigação | ANEEL DEC/FEC + interrupções + subsídios | 200 (pacote e zip 2020–2029 listados) | CNA, ANEEL, Congresso | M | M | conjunto elétrico ≠ município | nova |
| N15 | Carbono por rota e valor da mudança modal (ESG, CPR Verde) | CIOT/Comex + fatores publicados | fatores via busca; CIOT n/c hoje | CNA, finanças verdes, Executivo | M (cenário) | M | fator de emissão contestável | **C9 da lista bruta, sem ficha** |
| N16 | Onde a exportação é registrada × onde é produzida | Comex Stat `/cities` | 200 (soja 2025: 307 municípios) | federação, Congresso, imprensa | M | P | município = domicílio fiscal | nova (F6 cita Comex municipal como não testado) |
| N17 | Painel de pontos de parada e descanso nos corredores | ANTT/MT, lista de PPDs | n/c | Congresso, Executivo | M | P | não achei a base | nova |
| N18 | Proposta de dado: condição (ICM) por trecho em formato aberto | DNIT ICM + SNV | SNV: página 200 com acervo; ICM aberto n/c | Executivo, CNA | M | P | depende do DNIT | nova (padrão F8) |
| N19 | Contribuição da CNA à Tomada de Subsídios ANTT 6/2026 | DOU / ANTT | notícia de 19/10/2026 | CNA | — (janela) | P | prazo de 19/11/2026 | nova, oportunidade imediata |
| N20 | Tombamento e perda de carga nas BRs de escoamento | PRF BAT (por pessoa: tipo de veículo) | 200 (arquivo de ocorrência testado) | seguradoras, CNA, imprensa | M | P | o BAT não traz o tipo de carga | nova |

### Inferences
- **Três frentes cobrem a maior parte das ideias e cabem numa equipe de analistas sem parceria:**
  - "Rodovia como risco": N3, N4, N5, N20.
  - "Investimento no campo": N6, N7, N8, N14.
  - "Ferrovia": N10, N11, N19.
- **N12 e N19 são de incidência e têm prazo:**
  - a nova legislatura toma posse em fev/2027;
  - a Tomada de Subsídios fecha em 19/11/2026.

### Gaps
- `dados.antt.gov.br` (RNTRC, SAFF, CIOT) e o portal da Conab não responderam nesta sessão. As fichas que dependem deles estão marcadas "n/c hoje".
- Não conferi nenhuma das ideias contra o repositório do Observatório. Só conferi contra `ideias-novas.md`.

---

## 1. Estradas vicinais, clima e acesso municipal

### Takeaway
A CNA já tem um retrato estrutural das vicinais (out/2025). O que falta, e é novo, é o **recorte recorrente**: quais municípios produtores ficam sob risco de intransitabilidade nesta estação chuvosa, e quando.
- OSM e INMET estão acessíveis por API, testados hoje.
- O S2iD tem série histórica, mas a exportação não foi conferida.

### Cited Findings
- **O estudo da CNA já existe e é estrutural.**
  - Release de 08/10/2025: "O Brasil possui cerca de 2,2 milhões de km de estradas vicinais"; custos de "R$ 16,2 bilhões anuais" — [CNA](https://cnabrasil.org.br/noticias/estudo-inedito-da-cna-traca-panorama-da-situacao-atual-das-vicinais-propoe-solucoes-e-calcula-investimentos-para-melhorar-vias).
  - Método: bases públicas, incluindo a "plataforma colaborativa OpenStreetMap (OSM)", e visitas a "oito microrregiões". O release não fala em monitoramento recorrente nem em sazonalidade de chuva (WebFetch da mesma página).
- **Teste OSM (Overpass API, HTTP 200).** No município de Sorriso (código IBGE 5107925) há 1.631 vias do tipo `highway=track|unclassified`. A base OSM consultada é de 22/10/2026, 04:18 UTC — [overpass-api.de](https://overpass-api.de/api/interpreter).
  - Observação: sem User-Agent, a API devolveu 406.
- **Teste INMET (HTTP 200).** `apiprevmet3.inmet.gov.br/avisos/ativos` devolveu 2 avisos para hoje (Baixa Umidade, Tempestade) e 5 futuros. Cada aviso traz polígono, `geocodes`, `municipios`, `microrregioes`, `severidade`, `riscos` e `instrucoes` — [INMET API](https://apiprevmet3.inmet.gov.br/avisos/ativos).
- **S2iD (HTTP 200).** A página tem o menu "Série Histórica" — [s2id.mi.gov.br/paginas/series](https://s2id.mi.gov.br/paginas/series/). Via resumo de busca, a série cobre os reconhecimentos de emergência e calamidade desde 2013. Não conferi se exporta CSV.
- **Base para o filtro de onde há produção (do backlog):** IBGE PAM e cadastro de armazéns da Conab, já testados em 25/09/2026 (`ideias-novas.md`, F3).

### Inferences
- **N1 · Monitor de transitabilidade das vicinais na estação chuvosa**
  - **O quê:** por município produtor, um semáforo semanal de risco de atoleiro na janela da colheita (soja de jan a mar; milho safrinha de jun a ago). Combina:
    1. km de vias rurais não pavimentadas (OSM);
    2. chuva prevista ou avisos INMET sobre o município;
    3. histórico de decretos de emergência por chuva (S2iD);
    4. produção a escoar (PAM e progresso de colheita).
  - **Pergunta:** "em quais municípios a chuva desta semana pode travar a saída da colheita?"
  - **Usuários:** produtor, sindicato rural, federação, prefeitura e Defesa Civil.
  - **Antecipa?** Sim, de 1 a 7 dias, pela previsão.
  - **Esforço:** M.
  - **Risco:** a cobertura do OSM varia entre municípios. Sem validação de campo, o semáforo é de exposição, não de condição.
    - Mitigação: calibrar com as 8 microrregiões visitadas no estudo CNA/ESALQ-LOG.
    - Fazer **junto** com a equipe do estudo de 2025, não em paralelo, conforme a recomendação D8 de `ideias-novas.md`.
- **N2 · "Estrada de terra por tonelada"**
  - **O quê:** um indicador estático por município, em km de via rural não pavimentada por mil toneladas produzidas e por armazém.
  - **Uso:** priorizar emendas e convênios de pavimentação ou manutenção.
  - **Usuários:** Congresso e federação. Mede. Esforço P.
  - **Risco:** o OSM não diz a condição da via; apresentar como exposição.

### Gaps
- Não achei dado aberto de condição das vicinais municipais nem de interdição de estrada municipal.
- Não conferi o formato de exportação do S2iD.
- Não testei previsão de chuva por município (a API do INMET tem outros endpoints, não conferidos).

---

## 2. Segurança viária e fiscalização de peso nos corredores

### Takeaway
A PRF publica, todo mês, acidentes e autos de infração com BR, km e município. Os dois foram testados hoje e estão completos até ago e jul de 2026. Isso permite dois produtos novos e baratos:
- sinistralidade dos corredores de grão na safra;
- mapa de fiscalização de excesso de peso.

### Cited Findings
- **Estrutura da página da PRF:**
  - Acidentes (BAT) de 2007 a 2026, com "Frequência de atualização: Mensal".
  - Multas de 2007 a 2026, um arquivo por ano.
  - Fonte: [PRF, Dados Abertos](https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-da-prf), via WebFetch.
- **Teste BAT 2026 (Google Drive da PRF, HTTP 200):**
  - O zip de 2,5 MB traz `datatran2026.csv` (14,2 MB), com 48.712 linhas de ocorrência e data máxima de 31/08/2026.
  - Colunas: `br`, `km`, `municipio`, `causa_acidente`, `tipo_acidente`, `condicao_metereologica`, `mortos`, `latitude`, `longitude` e outras.
  - **Amostra:** no MT, na BR-163, foram 600 ocorrências e 54 mortos de jan a ago/2026 (contagem minha no arquivo).
- **Teste das multas 2026 (HTTP 200):**
  - O zip de 194 MB traz 7 CSVs mensais, de jan a jul/2026, entre 190 e 235 MB cada.
  - Colunas: BR, km, município, tipo de veículo, enquadramento, "Excesso Verificado".
  - **Amostra de mar/2026:** 844.162 autos no total. Destes, 1.707 por "Transitar com o veículo com excesso de peso PBT/PBTC".
    - Maiores BRs: SC/BR-101 com 95; CE/BR-222 com 84; PR/BR-376 com 73; MT/BR-364 com 69.
    - Por veículo: 1.215 caminhões-trator e 475 caminhões.
- **Contexto de pesagem (via resumo de busca, matérias antigas):** o DNIT tinha "73 Postos de Pesagem Veicular" e planejava 35 PIAFs. Um artigo do LabTrans cita excesso de peso de 9% a 12% em veículos pesados — [mundologistica](https://mundologistica.com.br/noticias/tecnologia-de-pesagem-de-carga-sera-aplicada-nas-rodovias-brasileiras-em-2017); [LabTrans/UFSC](https://www.labtrans.ufsc.br/wp-content/uploads/2022/02/Artigo_Projeto-e-dimensionamento-de-um-pavimento-asfaltico-espesso-para-implantacao-de-sistemas-de-pesagem-WIM..pdf). Não conferi a situação atual.

### Inferences
- **N4 · Sinistralidade dos corredores de grão por safra**
  - **O quê:** acidentes e mortes por trecho das BRs de escoamento (163, 364, 158, 070, 242, 135, 153), mês a mês, contra a curva de colheita e o fluxo do CIOT. Com custo social estimado por um coeficiente oficial publicado (não conferi qual).
  - **Pergunta:** "o pico da safra mata mais nas BRs do grão? Onde?"
  - **Usuários:** CNA (pauta de duplicação), Executivo (DNIT/PRF), imprensa.
  - Mede. Esforço P.
  - **Risco:** confundir correlação com causa. Controlar pelo tráfego do pedágio (F2) onde houver.
- **N5 · Radar de fiscalização de excesso de peso**
  - **O quê:** autos de excesso de peso por BR, km e mês nos corredores agro, contra o fluxo de caminhões. O enquadramento é **proteção do pavimento**: onde a pesagem preserva o investimento público.
  - **Pergunta:** "onde a fiscalização de peso acompanha o fluxo da safra?"
  - **Usuários:** Executivo, Congresso, concessionárias.
  - Mede. Esforço P.
  - **Risco:** é tema sensível para transportador e produtor. Publicar só agregados e nunca como ranking de infratores.
  - Os autos do DNIT e da ANTT ficam fora (não testados).
- **N20 · Tombamento nas BRs de escoamento**
  - **O quê:** tombamentos e capotamentos de caminhão por trecho e safra. O arquivo "por pessoa" traz o tipo de veículo; não testei esse arquivo hoje.
  - **Usuários:** seguradoras, imprensa, CNA (perda de carga).
  - **Risco:** o BAT não informa o tipo de carga.

### Gaps
- Não testei o arquivo BAT "por pessoa" (tipo de veículo) nem os dados de pesagem do DNIT e da ANTT.
- Não achei estatística atual e aberta de excesso de peso por posto.
- Não conferi um coeficiente oficial de custo social por acidente.

---

## 3. Ferrovia: capacidade ociosa e ferrovias autorizadas

### Takeaway
A ANTT publica, por segmento entre pátios, a capacidade **instalada, vinculada e ociosa** de cada concessionária (Declaração de Rede 2025, testada). Também informa agregados das autorizações da Lei 14.273: 45 contratos em vigor e cerca de 12 mil km.
- Isso permite medir onde há trilho com folga perto do grão, e quais autorizações servem o agro.
- Há uma consulta pública aberta agora, até 19/11/2026.

### Cited Findings
- **Declaração de Rede:**
  - Edições de 2013 a 2025.
  - A capacidade ociosa é "a diferença entre a capacidade instalada e a capacidade vinculada".
  - Fonte: [ANTT, Declaração de Rede](https://www.gov.br/antt/pt-br/assuntos/ferrovias/declaracao-de-rede), via WebFetch.
- **Teste da Declaração de Rede 2025 (HTTP 200):**
  - A página lista xlsx por concessionária: EFC, EFPO, EFVM, FCA, FNSTN, FTC, FTL, MRS, RMC, RMN, RMO, RMP, RMS. Também traz o shapefile "Malha Ferroviária Federal" de mar/2026 — [DR 2025](https://www.gov.br/antt/pt-br/assuntos/ferrovias/declaracao-de-rede/declaracao-de-rede-2025).
  - O xlsx da RMN (Rumo Malha Norte) baixou com 35 segmentos. As colunas incluem "Capacidade Instalada Calculada", "Vinculada Considerada" e "Ociosa Considerada".
  - **Exemplos:**
    - Marco Inicial → Rio Paraná: instalada 32,0; vinculada 10,21; ociosa 21,8.
    - São Francisco → Rondonópolis: 47,2; 9,03; 38,1.
  - Não conferi a unidade no dicionário; provavelmente é trens por dia.
- **Autorizações ferroviárias (página da ANTT):**
  - "108 (cento e oito) requerimentos"; "72 (setenta e dois) pedidos em vigor"; "45 (quarenta e cinco) contratos de adesão"; "cerca de 12 mil quilômetros de novas ferrovias"; cerca de R$ 241 bilhões projetados.
  - Os dados por projeto ficam só em três painéis Power BI — [ANTT, Autorizações Ferroviárias](https://www.gov.br/antt/pt-br/assuntos/ferrovias/autorizacoes-ferroviarias-1).
- **Regras novas:**
  - A Resolução ANTT 6.088/2026 (ROF 1) entra em vigor em 05/10/2026 e revoga as Resoluções 5.987/2022 e 6.058/2024 — [Lefosse](https://lefosse.com/noticias/antt-aprova-novo-regulamento-de-outorgas-ferroviarias-aplicavel-a-concessoes-e-autorizacoes/) (via resumo de busca).
  - A Tomada de Subsídios 6/2026, que revisa a Portaria Sufer 6/2023 (acompanhamento das autorizações), "ficará aberta de 21 de outubro a 19 de novembro" — [Diário do Transporte, 19/10/2026](https://diariodotransporte.com.br/2026/10/19/antt-prepara-revisao-das-regras-de-acompanhamento-de-ferrovias-privadas-autorizadas-no-brasil/).
- **Outras páginas da ANTT (HTTP 200, não abertas):** "Usuários Dependentes", "Relatório de Tarifas e Preços", "Anuário do Setor Ferroviário" — [ANTT, Ferrovias](https://www.gov.br/antt/pt-br/assuntos/ferrovias).
- **SAFF:** é usado pela ANTT para estatísticas mensais (via resumo de busca, [Agência iNFRA](https://agenciainfra.com/blog/ferrovias-antt-tera-de-criar-plano-para-melhorar-sistema-de-dados/)). O dado aberto em `dados.antt.gov.br` não respondeu hoje.

### Inferences
- **N10 · Capacidade ociosa declarada perto do agro**
  - **O quê:** para cada segmento das malhas com grão (RMN, RMP, RMO, FCA, FNSTN, MRS, FTL), cruzar:
    1. a capacidade ociosa declarada;
    2. a distância a polos produtores (PAM) e a armazéns (Conab);
    3. os fluxos rodoviários paralelos (CIOT, F1).
  - **Pergunta:** "onde há trilho com folga e soja na rodovia ao lado?" Embasa pleitos de usuário dependente, de direito de passagem e de terminal novo.
  - **Usuários:** CNA, federações, Executivo (ANTT, Ministério).
  - Mede, com série 2013–2025 para tendência.
  - **Esforço:** M (13 planilhas por ano mais o shapefile).
  - **Risco:** o dado é declaratório da concessionária. Apresentar como "capacidade declarada", sem juízo.
- **N11 · Radar das ferrovias autorizadas e o agro**
  - **O quê:** uma tabela aberta dos 45 contratos (traçado, km, estágio), extraída dos painéis e do DOU, com sobreposição a produção, silos e corredores.
  - **Pergunta:** "quais das ferrovias autorizadas servem o grão, e em que estágio estão?"
  - **Usuários:** Congresso, Executivo, CNA, imprensa.
  - Mede, e acompanha marcos dos projetos. Esforço M.
  - **Risco:** extrair de Power BI é trabalhoso; o estágio muda.
- **N19 · Contribuição da CNA à Tomada de Subsídios ANTT 6/2026**
  - **O quê:** uma nota técnica que propõe quais indicadores de acompanhamento das autorizações deveriam ser publicados em dados abertos (marcos físicos, capacidade, cargas previstas).
  - **Usuário:** a CNA. Esforço P.
  - **Prazo duro:** 19/11/2026.

### Gaps
- Não abri as planilhas das outras 12 concessionárias nem o dicionário (unidade da capacidade).
- Não extraí a lista dos 45 contratos.
- Não testei o SAFF por fluxo e mercadoria.

---

## 4. Crédito e investimento no campo (armazém, frota, máquinas)

### Takeaway
O SICOR (Banco Central) tem API aberta com **investimento rural por município e por item financiado**. O item "Armazém, depósito, silo…" somou R$ 8,58 bilhões em 2025, em 19.796 registros (testado hoje).
- O BNDES publica operações indiretas automáticas (Finame) com código IBGE de município.
- Isso permite mapear onde o investimento em logística de fazenda está indo.

### Cited Findings
- **API SICOR (HTTP 200):** `olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata/` lista, entre outros, `InvestMunicipioProduto`, `CusteioMunicipioProduto` e `ProgramaSubprogramaRegiaoUF` — [BCB Olinda](https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata/); documentação no [dataset MDCR](https://dadosabertos.bcb.gov.br/zh_Hant_TW/dataset/matrizdadoscreditorural/resource/4fc1ebee-7fba-4e58-84c4-2fee839bda0d).
  - Sem filtro, a API devolveu 500 ("Erro desconhecido").
- **Teste filtrado (HTTP 200, 7,5 MB):** `InvestMunicipioProduto` com `AnoEmissao eq '2025'` e `cdProduto eq '3180'`.
  - O nome literal do item é "ARMAZÉM, DEPÓSITO, SILO, GALPÃO, PAIOL, ESTUFA E INSTALAÇÕES CONGÊNERES".
  - 19.796 registros, somando R$ 8.582.199.796.
  - **Maiores municípios (R$ milhões):** Ponta Grossa 156,0; Pato Branco 132,4; Toledo 125,5; Acreúna 97,7; Santa Helena de Goiás 93,7; Palmeiras de Goiás 92,4; Sorriso 90,8.
  - Os campos incluem `cdPrograma`, `cdSubPrograma`, `cdFonteRecurso` e `cdModalidade`.
  - O código de estado é interno do SICOR, não IBGE. O de maior valor é o "19", com R$ 1.703,5 milhões. Não conferi o mapeamento.
- **BNDES (CKAN, HTTP 200):** o dataset `operacoes-financiamento` tem os CSVs de "Operações indiretas automáticas" e "não automáticas".
  - Teste de 3 KB por range (HTTP 206). As colunas incluem `municipio_codigo`, `produto`, `instrumento_financeiro`, `subsetor_cnae_nome` e `porte_do_cliente`. O CPF/CNPJ vem mascarado.
  - Fonte: [BNDES dados abertos](https://dadosabertos.bndes.gov.br/dataset/operacoes-financiamento).
- **Ponte com o backlog:** o déficit de silo por microrregião já foi calculado em F3 (`ideias-novas.md`, seção 3.4; exemplo: Norte Araguaia/MT, cobertura 0,37).

### Inferences
- **N6 · Termômetro do crédito para armazém, por município**
  - **O quê:** série anual e mensal do investimento SICOR no item 3180, por município e por programa (PCA, Moderagro, Pronamp etc. via `cdPrograma`), contra o déficit de silo da F3.
  - **Pergunta:** "o dinheiro do armazém vai para onde falta silo?" Serve à negociação do Plano Safra e à defesa do PCA no Congresso.
  - **Usuários:** CNA, Congresso, federações, Mapa.
  - Mede, com publicação mensal. Esforço P.
  - **Risco:** o item mistura silo com galpão e estufa.
    - Mitigação: filtrar por programa (PCA) e por porte, e declarar a mistura.
  - É extensão analítica da F3, não repetição.
- **N7 · Mapa do investimento logístico financiado (BNDES/Finame)**
  - **O quê:** caminhões, implementos rodoviários e armazéns financiados por município, segundo o produto e o CNAE.
  - **Pergunta:** "onde a frota e a armazenagem estão sendo renovadas com crédito público?"
  - **Usuários:** Congresso, BNDES, CNA. Mede. Esforço M.
  - **Risco:** a classificação de produto pode não separar armazém. Não testei o filtro.

### Gaps
- Não baixei o CSV completo do BNDES.
- Não mapeei os códigos de programa do SICOR (PCA) nem os de estado.
- Não conferi se o município do SICOR é o do empreendimento ou o da agência.

---

## 5. Frota e motoristas

### Takeaway
A Senatran publica todo mês a frota por município, com ano de fabricação e com tipo, espécie e eixos, e os habilitados por UF, faixa etária e categoria. Os dois foram testados hoje (set/2026).
- **Achado:** 44% dos habilitados nas categorias E e AE (carreta) têm 51 anos ou mais, e só 4,8% têm até 30.
- O Novo CAGED (FTP) vai até ago/2026.

### Cited Findings
- **Senatran, habilitados (HTTP 200).** CSV de set/2026 em UTF-16, com 774 KB. Colunas: região, UF, sexo, faixa etária, categoria, "Qt. Condutor Histórico" — [Ministério dos Transportes](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/estatisticas-quantidade-de-habilitados-denatran).
  - **Contagem minha, E + AE:**
    - Brasil: 2.433.457.
    - Faixas: 18–30 anos, 117.685 (4,8%); 31–50, 1.242.908; 51 ou mais, 1.072.864 (44,1%).
    - MT: 112.315.
  - **Ressalva:** "Histórico" pode incluir CNH vencida (não conferi).
- **Senatran, frota (HTTP 200).** Arquivos de set/2026: "Frota por Município e Tipo", "Quantidade de Veículos por UF Município Ano de Fabricação Modelo" (17,5 MB) e "…Tipo Espécie e Eixos" (8,0 MB) — [Frota 2026](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/frota-de-veiculos-2026).
  - O arquivo de eixos tem as colunas UF, Município, Tipo Veículo, Espécie Veículo, Eixos e Qtd. Veículos.
- **Novo CAGED (FTP, código 226).** `ftp.mtps.gov.br/pdet/microdados/NOVO CAGED/2026/` lista as pastas de 202601 a 202608.
- **Estimativas de déficit divergem (via resumo de busca, não conferi):** CNT com cerca de 250 mil e CNT/FITRANS com mais de 120 mil motoristas — [CNN Brasil](https://www.cnnbrasil.com.br/blogs/jenifer-ribeiro/infra/escassez-de-caminhoneiros-pode-elevar-fretes-e-pressionar-logistica/); [Portal do Trânsito](https://www.portaldotransito.com.br/noticias/falta-de-condutores-qualificados-deixa-10-da-frota-fora-da-estrada/).

### Inferences
- **N8 · Idade e composição da frota de caminhões por município**
  - **O quê:** caminhões e caminhões-trator por município, com idade mediana e participação de veículos de 9 eixos ou mais nos polos agro.
  - **Pergunta:** "onde a frota que escoa a safra é mais velha?" Embasa programas de renovação e conversa com segurança (N4).
  - **Usuários:** Congresso, Executivo. Mede. Esforço P.
  - **Risco:** o município de registro não é o de operação.
- **N9 · Termômetro do motorista**
  - **O quê:** envelhecimento dos habilitados em E e AE por UF; entrada de jovens; admissões e desligamentos de motoristas de caminhão no CAGED (CBO 7825) por município agro; salário de admissão.
  - **Pergunta:** "vai faltar motorista nas próximas safras, e onde?"
  - **Antecipa?** Sim, no estrutural: a pirâmide etária projeta saídas.
  - **Usuários:** CNA, Executivo (Senatran, SEST SENAT), Congresso. Esforço M.
  - **Risco:** os números de "déficit" na imprensa divergem. Publicar só o que o dado mostra, sem estimar déficit.

### Gaps
- Não processei os arquivos de frota por idade nem os microdados do CAGED (CBO 7825-10, não conferido).
- Não conferi a definição de "Qt. Condutor Histórico".

---

## 6. Energia, conectividade e emissões

### Takeaway
O ANEEL tem continuidade (DEC/FEC), interrupções e subsídios tarifários em CKAN aberto (testado). A Anatel lista acessos por município, mas a cobertura por trecho de rodovia não foi localizada como dado aberto.
- As emissões por rota já aparecem na lista bruta do backlog (C9) sem ficha. Aqui ganham ficha.

### Cited Findings
- **ANEEL CKAN (HTTP 200).** Os pacotes incluem `indicadores-coletivos-de-continuidade-dec-e-fec`, `interrupcoes-de-energia-eletrica-nas-redes-de-distribuicao`, `subsidios-tarifarios` e `indqual-municipio`.
  - O pacote DEC/FEC traz `indicadores-continuidade-coletivos-2020-2029.zip` e Parquet de 2010–2019 — [ANEEL dados abertos](https://dadosabertos.aneel.gov.br/dataset/indicadores-coletivos-de-continuidade-dec-e-fec).
- **Censo Agro 2017 (via resumo de busca, não conferi no SIDRA):** cerca de 83% dos estabelecimentos tinham energia elétrica, e cerca de 1,43 milhão declararam internet — [IBGE Atlas Rural](https://www.ibge.gov.br/apps/atlasrural/pdfs/06_00_Texto.pdf).
  - A consulta à API de descrição do SIDRA deu 403 nesta sessão.
- **Anatel (página, HTTP 200).** Lista conjuntos no dados.gov.br, como "Quantitativo de Acessos em operação das prestadoras do Serviço Móvel Pessoal" e acessos de banda larga fixa — [Anatel dados abertos](https://www.gov.br/anatel/pt-br/dados/dados-abertos).
- **4G em rodovias:**
  - A Anatel afirmou que "não havia qualquer obrigação de cobertura de estradas e rodovias vigente".
  - A ANTT determinou às concessionárias "garantia da rede 4G no percurso administrado por elas".
  - Fonte: [Mobile Time, 15/04/2025](https://www.mobiletime.com.br/noticias/15/04/2025/4g-em-rodovias-antt/).
- **Fatores de emissão (via resumo de busca, não conferi):** a COPPE estima cerca de 8 gCO2e/t·km para a ferrovia de carga — [PET/COPPE](https://www.pet.coppe.ufrj.br/images/noticias/Transicao_Energetica_Ferrovia_Ago_2022.pdf). Há estudo da ESALQ-LOG sobre CO2 na exportação de soja do MT pelo Arco Norte — [ESALQ-LOG](https://esalqlog.esalq.usp.br/upload/kceditor/files/2017/11/EMISS%C3%83O%20DE%20CO2%20NA%20LOG%C3%8DSTICA%20DE%20EXPORTA%C3%87%C3%83O%20DE%20SOJA%20DO%20MATO%20GROSSO%20O%20CASO%20DAS%20EXPORTA%C3%87%C3%95ES%20PELO%20ARCO%20NORTE.pdf); e estudo na Gestão & Produção sobre multimodalidade na Norte-Sul — [SciELO](https://www.scielo.br/j/gp/a/xsq7Mhb33RCvzqvrtYgVXCL/?lang=en).

### Inferences
- **N14 · Energia rural para silo, secador e irrigação**
  - **O quê:** DEC/FEC e interrupções por conjunto elétrico sobrepostos a armazéns (Conab) e áreas irrigadas, e subsídio de irrigação por distribuidora.
  - **Pergunta:** "onde a energia limita armazenar e secar na fazenda?" Isso conecta a pauta de silo (F3, N6) à pauta elétrica.
  - **Usuários:** CNA, ANEEL, Congresso. Mede. Esforço M.
  - **Risco:** o conjunto elétrico não coincide com o município. Exige tabela de correspondência (BDGD, não testada).
- **N13 · Conectividade no corredor e na fazenda**
  - **O quê:** acessos móveis por município agro; Censo Agro 2017 como linha de base; trechos das BRs de escoamento sem cobertura (se a Anatel ou a ANTT fornecerem).
  - **Pergunta:** "onde o caminhão e a fazenda ficam sem sinal?" Relevante porque documentos de transporte eletrônicos (CIOT, MDF-e) pressupõem conexão.
  - **Usuários:** Executivo, Anatel, CNA. Mede. Esforço M.
  - **Risco:** não localizei a cobertura por trecho como dado aberto. Pode virar pedido de dado, no padrão da F8.
- **N15 · Carbono por rota e valor da mudança modal**
  - **O quê:** tCO2e por tonelada para cada rota origem→porto (rodovia contra rodovia + trem ou barcaça), com fatores publicados e metodologia GLEC/ISO 14083. Inclui o "carbono evitado" de cada obra em cenário.
  - **Pergunta:** "quanto carbono a soja de cada município economiza se mudar de modal?" Serve a CPR Verde, títulos verdes, Fundo Clima e relatórios ESG de cooperativas.
  - **Usuários:** CNA, bancos, Executivo.
  - Mede, e serve de cenário. Esforço M.
  - **Risco:** a escolha do fator muda o resultado. Publicar faixas e citar a fonte de cada fator.
  - **Relação com o backlog:** é a C9 da lista bruta, que não tinha ficha.

### Gaps
- Não testei o download do zip de DEC/FEC, a BDGD nem o dataset de subsídio de irrigação.
- Não conferi no SIDRA as tabelas do Censo Agro sobre energia e internet.
- Não testei os dados de cobertura móvel por setor da Anatel.

---

## 7. Fiscal e comércio exterior por município

### Takeaway
A API do Comex Stat aceita detalhe por município (testada hoje). O município é o **domicílio fiscal do exportador**, o que, por si só, vira produto: comparar onde a soja é produzida (PAM) com onde a exportação é registrada.

### Cited Findings
- **Teste `POST api-comexstat.mdic.gov.br/cities` (HTTP 200):** exportação de SH4 1201 (soja) em 2025, com detalhe de município.
  - 307 municípios.
  - **Maiores em quilos:**
    - Paranaguá–PR: 8,58 bilhões de kg, US$ 3,51 bilhões FOB;
    - Rio Verde–GO: 6,14 bilhões de kg;
    - Sorriso–MT: 4,25 bilhões de kg;
    - Balsas–MA: 3,98 bilhões de kg;
    - Maringá–PR: 3,70 bilhões de kg;
    - Luís Eduardo Magalhães–BA: 3,28 bilhões de kg.
  - Fonte: [Comex Stat API](https://api-comexstat.mdic.gov.br/cities).
  - Com os filtros `state` e `heading` juntos, a API devolveu lista vazia; só com `heading` funcionou.
- **Base de produção:** a PAM municipal foi testada no backlog (`ideias-novas.md`, F3).

### Inferences
- **N16 · Onde a exportação é registrada × onde é produzida**
  - **O quê:** por município, a razão entre exportação registrada (Comex, domicílio fiscal) e produção (PAM). Mostra polos de originação (como Paranaguá e Maringá) e municípios que produzem muito e registram pouco.
  - **Pergunta:** "quem produz e quem aparece como exportador?" Apoia discussões sobre a distribuição de receitas ligadas à exportação (não conferi os critérios atuais de rateio), sobre a localização de tradings e sobre a ficha municipal (F7).
  - **Usuários:** federações, Congresso, imprensa. Mede. Esforço P.
  - **Risco:** ler domicílio fiscal como origem física. Declarar sempre a natureza do dado.

### Gaps
- Não achei, nem testei, dado aberto de NF-e agregado de SEFAZ estadual. O backlog trata disso como aposta (convênio com SEFAZ-MT).
- Não conferi os critérios de rateio de compensações ligadas à Lei Kandir.

---

## 8. Produtos para incidência: nova legislatura, pontos de parada, condição das rodovias

### Takeaway
O TSE já publicou a votação nominal de 2026 por município e zona (arquivo de 21/10/2026). Isso permite renovar a lógica "o que está em jogo na base" (F6) para os eleitos que tomam posse em 2027, com peso pelos votos.
- Duas ideias ficam como pedido de dado ou de parceria: PPDs e ICM por trecho.

### Cited Findings
- **TSE CKAN (HTTP 200).** O pacote `resultados-2026` foi atualizado em 08/10/2026 e traz o recurso "Votação nominal por município e zona".
  - HEAD de `cdn.tse.jus.br/.../votacao_candidato_munzona_2026.zip`: HTTP 200, 454.658.023 bytes, Last-Modified 21/10/2026 — [TSE dados abertos](https://dadosabertos.tse.jus.br/dataset/resultados-2026).
  - Não baixei o arquivo.
- **Base de 2022 para comparação:** o pacote `resultados-2022` tem o mesmo recurso — [TSE](https://dadosabertos.tse.jus.br/dataset/resultados-2022).
- **DNIT SNV (HTTP 200):** a página tem link para "Acervo PNV e SNV (Download de Arquivos)" e a planilha "Hidrovias SNV" — [DNIT, PNV e SNV](https://www.gov.br/dnit/pt-br/assuntos/atlas-e-mapas/pnv-e-snv).
- **ICM do DNIT:** a busca não achou download aberto. Via resumo de busca, uma matéria da Agência Gov de nov/2024 cita 75,1% de trechos "bons" — [Agência Gov](https://agenciagov.ebc.com.br/noticias/202411/qualidade-das-estradas-brasileiras-chega-ao-indice-mais-alto-da-historia).
- **Pontos de parada e descanso (PPD):** não busquei nem testei a base. Não conferi.

### Inferences
- **N12 · Ficha logística da nova legislatura (2027–2030)**
  - **O quê:** para cada deputado federal eleito, a parcela dos votos em cada município, multiplicada pelos indicadores logísticos do município: silo (F3), dependência de corredor (F6), vicinais (N1/N2), acidentes (N4) e crédito de armazém (N6). O resultado é um "índice de exposição logística da base".
  - **Pergunta:** "quais gargalos pesam na base de cada novo parlamentar?"
  - **Usuários:** CNA (relações institucionais), Congresso. Mede. Esforço M.
  - **Risco político:** soar partidário. Usar o mesmo método para todos e publicar tudo.
  - **Relação com o backlog:** extensão de F6/A13, com dado novo.
- **N17 · PPDs nos corredores contra o fluxo do CIOT**
  - **Pergunta:** "há onde parar entre Sorriso e Miritituba?" Conecta descanso do motorista (N9) e segurança (N4).
  - **Usuários:** Congresso, Executivo. Esforço P, se a lista de PPDs existir.
- **N18 · Proposta de dado aberto: ICM por trecho do SNV**
  - **O quê:** no padrão da F8, a CNA propõe ao DNIT publicar o ICM por trecho e por ano em formato aberto, para ser cruzado com os corredores de escoamento. O enquadramento é de transparência e cooperação.
  - **Usuários:** Executivo, CNA. Esforço P.

### Gaps
- Não processei os votos de 2026 (455 MB).
- Não verifiquei se o ICM por trecho já está publicado em algum formato.
- Não localizei a lista oficial de PPDs.
