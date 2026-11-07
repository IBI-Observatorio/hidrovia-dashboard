# Benchmark Austrália / Nova Zelândia: monitoramento de cadeias agro e priorização de infraestrutura de frete

> Notas de pesquisa para o Observatório de Infraestrutura do IBI (proposta à CNA). Pesquisa feita em 22/10/2026.
> Convenção: **[aberto]** = página/documento aberto por mim, com citação literal curta. **[não conferi]** = só vi o trecho no resultado de busca, sem abrir a página; usar apenas como pista.
> Limitação técnica: os sites infrastructureaustralia.gov.au, infrastructure.gov.au, accc.gov.au, nff.org.au e graincentral deram timeout ou 403 em várias tentativas, o que limitou a checagem de PDFs da IA e da NFF.
> Por exclusão do escopo, não trato de desempenho de armadores ou frete marítimo.

## 1. CSIRO TraNSIT: o que modela, casos concretos, quem financia e usa, ferramentas análogas

### Takeaway
O TraNSIT é um modelo espacial de custo de transporte "da porteira ao mercado". A CSIRO o criou em 2012 para gado no norte do país e, com financiamento federal, o estendeu a 98% do transporte agrícola. Foi usado para ranquear propostas do Beef Roads Program (60 propostas, 18 financiadas) e para quantificar a economia do Inland Rail (até A$213 mi/ano). Hoje sustenta um painel público de benchmarking de custo por commodity e tem versões aplicadas na Indonésia e no Vietnã. O equivalente brasileiro mais próximo seria um modelo de custo logístico por rota e por produto, com propostas de obra ranqueadas pela economia de frete.

### Cited Findings
- **[aberto]** O que modela: para cada caminho de cadeia, escolhe a rota de menor custo considerando distância, tempo, configuração do veículo, condição da via, regras de fadiga e desacoplamento. Trecho: "select the most cost-effective route that accounts for travel distance" — [CSIRO, brochura TraNSIT, fev/2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[aberto]** Escala: "over 185 commodities, representing more than 25 million vehicle trips" por ano, mais 200 mil viagens ferroviárias, e dados de mais de 400 órgãos e organizações — [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[aberto]** Financiamento: em 2015 o Agricultural Competitiveness White Paper, do governo federal, "funds the expansion of TraNSIT to 98% of Australia's agricultural transport" — [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[aberto]** Origem: em 2012-13 "federal and state governments commissioned CSIRO" para modelar a cadeia de gado do norte. A versão de 2018 cobria "98 per cent of all agricultural and horticultural supply chains", com cerca de 250 mil empresas, quase 500 mil caminhos e 170 mil segmentos de estrada. Mais de 100 associações e órgãos de governo trabalharam com a ferramenta — [CSIRO, jul/2018](https://www.csiro.au/en/news/all/articles/2018/july/faster-delivery-lower-costs-the-answers-in-transit)
- **[aberto] Caso Beef Roads (2016)**, com quatro pontos:
  - **Programa:** A$100 mi. O governo pediu propostas a indústria, estados e municípios: "More than 60 submissions were received, with a total construction cost exceeding $3 billion".
  - **Ranqueamento:** o TraNSIT avaliou a economia de frete de cada proposta.
  - **Resultado:** em out/2016 foram financiados 18 projetos, com economia estimada de "an annual transport cost saving of $957,616".
  - **Primeiro projeto:** pavimentação de 16,9 km da Clermont–Alpha Road, por A$8 mi.

  Fonte: [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[aberto] Caso Inland Rail, estudo CSIRO/governo de 2018-2020** ("Saving $213 million in transport costs"):
  - **Base analisada:** 175 mil movimentos anuais de 140 commodities, cerca de 5 mil empresas e 11 mil cadeias. Dessas commodities, 94 podiam usar a ferrovia.
  - **Economia potencial:** "potential total annual transport cost reduction of $213 million, for 22 million tonnes".
  - **Composição:** A$34,5 mi/ano para usuários ferroviários existentes e A$178,5 mi/ano para 2,28 Mt que sairiam da rodovia.
  - **Andamento:** relatório final em mar/2022 e Fase 3 de mai/2022 a dez/2023.

  Fonte: [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[aberto]** Estudo piloto do Inland Rail (2019):
  - **Economia:** cerca de A$70 mi/ano para 923 mil t de hortícolas e alimentos processados, de A$64 a A$94/t conforme o retorno de carga.
  - **Números da NFF:** A$76/t em média para hortícolas e 63 mil viagens de caminhão a menos por ano na Newell Highway.

  Fonte: [Food Processing, 25/03/2019](https://www.foodprocessing.com.au/content/materials-handling-storage-and-supply-chain/news/road-to-rail-ag-industry-could-save-millions-2284087)
- **[aberto]** Caso de grãos no norte de NSW e sul de QLD: "savings of up to $10 per tonne in moving from 42- to 76-wagon bulk trains", com carregamento em 5 h, mais ganhos com obras rodoviárias. Participaram 8 municípios de NSW e Goondiwindi (QLD) — [CSIRO, jul/2018](https://www.csiro.au/en/news/all/articles/2018/july/faster-delivery-lower-costs-the-answers-in-transit)
- **[aberto]** Painel derivado: em 2021 a CSIRO lançou o "Supply Chain Benchmarking Dashboard", ferramenta online construída sobre o TraNSIT para governo e indústria terem "a shared understanding of supply chain performance" — [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[não conferi]** Segundo o resultado de busca, o painel cobria 130 commodities no lançamento e chegou a cerca de 150 depois. O guia de hortícolas citaria custo médio de A$154,89 por tonelada útil — [freightaustralia.gov.au, guia do dashboard](https://www.freightaustralia.gov.au/sites/default/files/documents/Dashboard%E2%80%94Task-specific-user-guide.pdf)
- **[aberto]** Outros usos:
  - **Emergências:** apoio à NEMA, a agência federal de emergências, no verão de chuvas de 2021/22, via Australian Climate Service, para achar corredores afetados e rotas alternativas.
  - **Exterior:** Indonésia, com o arroz ("64.4 million tonnes of national annual rice production"), e Vietnã, com mandioca, açúcar, café e milho.

  Fonte: [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)

### Inferences
- O valor do TraNSIT não está só no modelo. O ganho veio de amarrá-lo a um programa de financiamento com chamada pública de propostas, como no Beef Roads: a ferramenta virou o critério de ranqueamento.
- A economia anual estimada do Beef Roads (cerca de A$0,96 mi/ano sobre um programa de A$100 mi) parece pequena. A própria CSIRO diz que segurança, bem-estar animal e desgaste de veículos ficaram fora do cálculo, o que sugere que o modelo mede só uma parte do benefício.

### Gaps
- Não achei avaliação independente (ex post) do acerto das estimativas do TraNSIT.
- Não confirmei o custo de manutenção do modelo nem quem o financia em 2026.
- Ferramentas análogas fora da Austrália, além das aplicações da própria CSIRO na Indonésia e no Vietnã: não conferi.

## 2. Infrastructure Australia: Priority List, Assessment Framework e entrada de propostas

### Takeaway
A IPL 2026 (PDF datado de ago/2026) é a lista independente da Infrastructure Australia de propostas prioritárias para os próximos 10 anos. Cada proposta precisa se alinhar a 5 prioridades de investimento, entre elas "High Productivity Freight Networks" e "Ports Capacity and Connectivity". Proponentes (estados, municípios, setor privado) levam suas propostas pelo Assessment Framework em 4 estágios. Esse framework está sendo revisto após emenda à lei da IA.

### Cited Findings
- **[aberto]** A IPL é "independent, evidence-based advice to the Australian Government" sobre propostas a considerar "over the next 10 years". Ela é exigida pela Infrastructure Australia Act 2008 e alinhada a 5 prioridades do Annual Budget Statement de 2025 — [IA, 2026 IPL](https://www.infrastructureaustralia.gov.au/2026-infrastructure-priority-list)
- **[aberto]** A prioridade "High Productivity Freight Networks" pede investimento coordenado em corredores e terminais intermodais, "encouraging a shift from road to rail". A prioridade de portos inclui conexões de "last mile freight and intermodal" — [IA, 2026 IPL](https://www.infrastructureaustralia.gov.au/2026-infrastructure-priority-list)
- **[aberto]** A página de frete da IPL tem subseções de ferrovia, rodovia e "Summary: Infrastructure response and investment priorities". O PDF da lista fica em /sites/default/files/2026-08/2026_Infrastructure-Priority-List.pdf — [IA, HPFN](https://www.infrastructureaustralia.gov.au/ipl/high-productivity-freight-networks)
- **[aberto]** O Assessment Framework tem 4 estágios: Stage 1 "Defining problems and opportunities", Stage 2 "Identifying and analysing options", Stage 3 "Developing a business case" e Stage 4 "Post-completion reviews". Há também guias técnicos, uma página de recursos para governos locais e para as agências regionais de desenvolvimento (RDAs) e um "Post Completion Evaluation Framework" — [IA, Assessment Framework Overview](https://www.infrastructureaustralia.gov.au/Assessment-Framework-overview)
- **[aberto]** "The Assessment Framework is changing in line with amendments to the Infrastructure Australia Act" — [IA, Assessment Framework Overview](https://www.infrastructureaustralia.gov.au/Assessment-Framework-overview)
- **[aberto]** A IA publica um "Section 5DA Report" sobre projetos de relevância nacional "committed without prior evaluation" pela própria IA, uma prestação de contas sobre obras que pularam a avaliação — [IA, menu de relatórios](https://www.infrastructureaustralia.gov.au/Assessment-Framework-overview)

### Inferences
- O desenho combina duas portas de entrada: problemas definidos de cima para baixo pela IA e propostas de baixo para cima, vindas dos proponentes. Os recursos específicos para governos locais e RDAs indicam que municípios rurais conseguem entrar no funil.

### Gaps
- **Não conferi** os nomes das propostas de frete regional e agrícola na IPL 2026, nem a contagem total. O PDF e a busca da IPL não carregaram, por timeout.
- **Não conferi** os critérios detalhados de cada estágio, o limiar de custo (proposta acima de A$250 mi?) nem os parâmetros de ACB (como a taxa de desconto de 7%).

## 3. Inland Rail: como se quantificou o benefício agrícola e como foi revisto

### Takeaway
O benefício agrícola do Inland Rail foi quantificado depois, e por fora do business case original: a CSIRO, a pedido do governo, estimou de A$70 a 213 mi/ano em 2019-2022. A revisão independente de 2023 manteve o projeto como importante, mas apontou "significant deficiencies" de governança e gestão. As 19 recomendações foram aceitas.

### Cited Findings
- **[aberto]** Em 06/04/2023 o governo divulgou a revisão independente e aceitou "the 19 recommendations in full or in principle". A revisão confirmou o projeto como importante e achou "significant deficiencies in the governance and management of Inland Rail" — [DITRDCSA, 06/04/2023](https://www.infrastructure.gov.au/department/media/news/independent-review-inland-rail-released)
- **[aberto]** Quantificação agrícola via TraNSIT: ver Seção 1 (A$213 mi/ano para 22 Mt, e A$70 mi/ano no piloto de hortícolas e processados) — [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf); [Food Processing, 2019](https://www.foodprocessing.com.au/content/materials-handling-storage-and-supply-chain/news/road-to-rail-ag-industry-could-save-millions-2284087)
- **[não conferi]** A avaliação da IA de 2016 teria registrado BCR de 1,1 a 7% de desconto, com custo de capital P50, e alerta de que estouros de custo "could materially erode its economic case" — [IA, Project Evaluation Summary](https://www.infrastructureaustralia.gov.au/sites/default/files/2019-06/Final_Inland_Rail_Project_Evaluation_Summary.pdf)
- **[não conferi]** Submissões públicas à revisão citam o business case de 2015 com BCR de 2,62 a 4% e de 1,02 a 7%. Um think tank independente chamou o índice de "the skinniest of benefit-cost ratios" — [Grattan Institute](https://grattan.edu.au/news/why-the-inland-rail-project-will-never-add-up)
- **[não conferi]** Coberturas de imprensa atribuem à revisão um custo de A$31,4 bi, contra A$16,4 bi em 2020 — [Railway Gazette](https://railwaygazette.com/infrastructure/independent-review-criticises-delivery-of-inland-rail-scheme/63955.article)

### Inferences
- Lição central: um BCR marginal (cerca de 1,0 a 1,1 a 7%), estimado antes de qualquer mapeamento fino das cadeias agrícolas, deixou o projeto vulnerável. A quantificação agrícola granular veio anos depois, para sustentar a narrativa do projeto, e não para escolhê-lo.

### Gaps
- Não abri o texto da revisão (2023) nem documentos de 2024-2026 sobre o reescopo (corte em Narromine/Parkes?). Status atual: não conferi.

## 4. National Freight Data Hub, Estratégia Nacional de Frete, ACCC (grãos), ABARES e advocacy das entidades agrícolas

### Takeaway
A Austrália tem uma camada federal de dados de frete: o National Freight Data Hub, criado pela Estratégia Nacional de Frete e Cadeias de Suprimento de 2019, com catálogo que inclui dados agrícolas do DAFF e um painel de benchmarking de custo. Tem também um regulador concorrencial que monitora o acesso a portos graneleiros (ACCC). As entidades agrícolas (NFF, GrainGrowers, CBH em WA) usam números do TraNSIT e do governo para defender obras ferroviárias e rodoviárias. Quase tudo neste bloco **não foi conferido em página aberta**, por bloqueio de acesso.

### Cited Findings
- **[aberto]** O catálogo do National Freight Data Hub tem o grupo "Agricultural commodities and trade data", com o DAFF como fonte e licença "not specified" — [catalogue.data.infrastructure.gov.au](https://catalogue.data.infrastructure.gov.au/dataset/groups/agricultural-commodities-and-trade-data)
- **[não conferi]** A Estratégia Nacional de Frete e Cadeias de Suprimento, endossada em ago/2019, tem 4 áreas prioritárias, uma delas dados. O compromisso federal com o Hub incluiria coleta, proteção, disseminação e hospedagem — [infrastructure.gov.au](https://www.infrastructure.gov.au/infrastructure-transport-vehicles/transport-strategy-policy/freight-supply-chains/national-freight-supply-chain-strategy)
- **[não conferi]** Catálogo de estudos por commodity, como trigo com foco em "risks associated with road freight activity" e cultivos como trigo, cevada, caroço de algodão e açúcar — [catálogo NFDH](https://catalogue.data.infrastructure.gov.au/dataset/?page=2)
- **[não conferi]** A ACCC publica relatórios de monitoramento de portos graneleiros sob o Port Terminal Access (Bulk Wheat) Code. Três operadores dominam: CBH, Viterra e GrainCorp. Há queixas sobre acesso "upcountry", isto é, no interior. O relatório mais recente que encontrei é de 2018-19 — [ACCC](https://www.accc.gov.au/by-industry/rail-shipping-and-ports/bulk-grain-ports-monitoring)
- **[não conferi]** Posição da GrainGrowers: o frete de grãos deve ir por ferrovia e, onde ela não for viável, as estradas devem ser melhoradas. Exemplo: a Merredin–Narembeen Road, com mais de 10 mil viagens de caminhão de grãos por ano. Houve em WA um pacote de A$352 mi (Grain Freight Network) e depois A$200 mi do Agricultural Supply Chain Improvement program, com A$22 mi para extensões de desvios da CBH — [Farm Weekly](https://www.farmweekly.com.au/story/3782593/grain-freight-money-finally-gets-delivered/); [Roads Online](https://roadsonline.com.au/was-regional-rail-freight-network-to-receive-200m-boost/)
- **[não conferi]** NFF:
  - Usou a estimativa da CSIRO de A$76/t e 63 mil caminhões a menos para defender o Inland Rail.
  - Pediu conexões com linhas regionais de 25 t/eixo.
  - Diz que a logística pode chegar a 48,5% do custo da porteira em alguns setores.

  Fontes: [NFF](https://www.nff.org.au/read/6355/inland-rail-on-track-deliver-for.html); [NFF, submissão ao Senado, 2019](https://nff.org.au/wp-content/uploads/2020/03/2019.11.29_NFF-Submission-Senate-Inquiry-into-Inland-Rail.pdf)
- **[aberto]** A própria NFF foi a porta-voz dos números da CSIRO: "horticulture growers could save an average of $76 per tonne" (paráfrase da matéria) — [Food Processing, 2019](https://www.foodprocessing.com.au/content/materials-handling-storage-and-supply-chain/news/road-to-rail-ag-industry-could-save-millions-2284087)

### Inferences
- A influência das entidades agrícolas parece vir de três caminhos:
  - (a) adotar números produzidos por instituição pública neutra (CSIRO) em vez de estudos próprios;
  - (b) responder a chamadas públicas de propostas (Beef Roads);
  - (c) coalizões com operadores de armazenagem (CBH) em pacotes estaduais e federais.

### Gaps
- ABARES: não pesquisei produtos específicos de logística. Não conferi.
- Posições de 2025-2026 da NFF e da GrainGrowers: não conferi.
- Relatórios ACCC posteriores a 2018-19: não conferi.
- Produtos atuais do National Freight Data Hub, como o painel de 2026: não conferi.

## 5. Nova Zelândia: Te Waihanga (pipeline, Infrastructure Priorities Programme e Plano Nacional)

### Takeaway
A Nova Zelândia combina três peças:
- (1) um **Pipeline** público trimestral de cerca de 12 mil iniciativas, que somam NZ$267-275 bi, alimentado por 129 organizações;
- (2) um **Infrastructure Priorities Programme (IPP)** aberto a qualquer proponente, com avaliação padronizada e revisão por painel independente: 47 propostas endorsadas de cerca de 150 até jun/2026, e o programa foi encerrado para dar lugar a um novo processo de "investment assurance";
- (3) o primeiro **National Infrastructure Plan** de 30 anos (fev/2026), cujas 16 recomendações o governo apoiou em jun/2026.

### Cited Findings
- **[aberto]** O pipeline de set/2025 somava "nearly 12,000 initiatives worth $275 billion", dos quais NZ$193 bi ainda não estavam totalmente financiados. 44 megaprojetos respondem por 52% do valor — [Te Waihanga, NIP cap. 2](https://tewaihanga.govt.nz/national-infrastructure-plan-online/2-lots-of-projects-not-enough-money)
- **[aberto]** O plano diz que "Long-term infrastructure planning requires more than lists of projects" e defende "applying consistent assurance to prioritise the right projects" — [Te Waihanga, NIP cap. 2](https://tewaihanga.govt.nz/national-infrastructure-plan-online/2-lots-of-projects-not-enough-money)
- **[aberto]** Atualização trimestral de set/2025: NZ$181 bi com financiamento total, parcial ou confirmado, NZ$56 bi a mais que em junho. Contribuíram 129 organizações, "up 37% on 12 months ago" — [Te Waihanga, set/2025](https://tewaihanga.govt.nz/news-events/september-2025-pipeline)
- **[aberto]** Resultado da 3ª rodada do IPP, em 16/06/2026: 5 novas propostas endorsadas, nos estágios 1 (problema prioritário) ou 2 (lista de soluções). O total desde 2024 é de "nearly 150 proposals submitted", com 47 endorsadas. O IPP não aceita mais inscrições e será substituído por processo de investment assurance com o Tesouro, com lançamento previsto para 1º de novembro — [Te Waihanga, 16/06/2026](https://tewaihanga.govt.nz/news-events/latest-infrastructure-endorsements-published)
- **[aberto]** O governo apoia "or supporting in principle all 16 of the Commission's recommendations" do plano lançado em fev/2026 — [Bell Gully, 19/06/2026](https://www.bellgully.com/insights/new-zealand-s-first-national-infrastructure-plan-backed-by-government/)
- **[não conferi]** O valor do pipeline caiu para NZ$267,7 bi em dez/2025 — [Te Waihanga, pipeline snapshot](https://tewaihanga.govt.nz/the-pipeline/pipeline-snapshot)

### Inferences
- O modelo neozelandês é útil ao Brasil mais pela transparência (o pipeline mostra o que está e o que não está financiado) e pelo endosso por estágio (permite endossar um "problema" antes de existir projeto) do que pelo volume.

### Gaps
- Não encontrei propostas de frete agrícola ou rural entre as 47 endorsadas. A página não as menciona.
- Se o novo processo de assurance foi de fato lançado em 1º/11/2026: não conferi, pois a data é posterior a esta pesquisa ou não foi verificada.

## 6. Como as entidades agrícolas influenciaram o financiamento

### Takeaway
A evidência que achei aponta para um padrão: o governo financia um modelo neutro (CSIRO), abre uma chamada pública de propostas, e indústria e municípios submetem obras que são ranqueadas pelo modelo. As entidades amplificam os números nas campanhas (NFF no Inland Rail; GrainGrowers e CBH nos pacotes de WA). Não achei uma avaliação formal dessa influência.

### Cited Findings
- **[aberto]** No Beef Roads, o governo pediu propostas "stakeholders in the beef and transport industries, as well as state, territory and local governments" e usou o TraNSIT para avaliar cada uma — [CSIRO, brochura 2023](https://www.csiro.au/-/media/LWF/Files/22-00704_ENV_BROCHURE_TraNSIT.pdf)
- **[aberto]** A CSIRO trabalhou com mais de 100 associações setoriais e órgãos de governo desde 2012 — [CSIRO, 2018](https://www.csiro.au/en/news/all/articles/2018/july/faster-delivery-lower-costs-the-answers-in-transit)
- **[aberto]** Estudo regional de grãos financiado e conduzido com 8 municípios de NSW e Goondiwindi (QLD), uma coalizão local que encomenda evidência — [CSIRO, 2018](https://www.csiro.au/en/news/all/articles/2018/july/faster-delivery-lower-costs-the-answers-in-transit)
- **[não conferi]** Pacotes de WA (A$352 mi; A$200 mi) com a CBH (cooperativa de grãos) beneficiada por extensões de desvios — [Roads Online](https://roadsonline.com.au/was-regional-rail-freight-network-to-receive-200m-boost/)

### Inferences
- Para a CNA, o caminho mais replicável é financiar ou coproduzir com instituição técnica neutra (Embrapa, EPL/Infra S.A., universidades) uma base de custo por rota. Com ela, a CNA pode levar propostas ranqueadas a programas federais (Novo PAC, PPI) em vez de listas de pleitos.

### Gaps
- Não achei estudo acadêmico ou de auditoria que meça o efeito causal do lobby agrícola na seleção de obras.

---

## O que o Brasil pode adaptar

1. **"TraNSIT brasileiro" para o agro.** Modelo de custo de frete porteira→armazém→porto para cerca de 10 cadeias (soja, milho, algodão, café, açúcar/etanol, carnes, celulose, fertilizantes no retorno). Seria construído com bases públicas: ANTT/RNTRC, ANTAQ, Infra S.A./ONTL, IBGE PAM/PPM, Conab armazéns. A escolha de rota consideraria condição da via, tipo de veículo (rodotrem, bitrem) e sazonalidade de chuvas. Precedente: o TraNSIT nasceu de um pedido conjunto federal e estadual e foi ampliado com verba federal.
2. **Chamada pública "Estradas do Agro" ranqueada por economia de frete.** Replicar o Beef Roads: CNA, federações e municípios submetem trechos (pavimentação, pontes, acessos a terminais), e o modelo do item 1 calcula a economia em R$/t e R$/ano. A lista é publicada em ordem. O programa australiano teve 60 propostas para 18 vagas, e o filtro era técnico.
3. **Painel público de benchmarking de custo logístico por commodity.** Equivalente ao Supply Chain Benchmarking Dashboard: R$/t e R$/t·km por produto, modo e corredor, atualizado anualmente. O Observatório do IBI hospeda, e a CNA usa nas negociações.
4. **Lista Prioritária de Infraestrutura do Agro, com estágios (modelo IA e Te Waihanga).** Endossar por estágio: (1) problema reconhecido, (2) opções analisadas, (3) business case com ACB. Isso permite à CNA pautar gargalos antes de existir projeto executivo. Publicar critérios e taxa de desconto, como faz a IA.
5. **Pipeline transparente de obras logísticas do agro.** Inspirado no pipeline trimestral da Nova Zelândia (cerca de 12 mil iniciativas, mostrando o que tem e o que não tem financiamento). O painel cruzaria o Novo PAC, concessões da ANTT/ANTAQ, PPI e obras estaduais em corredores agrícolas, com o status do funding.
6. **Relatório "obras sem avaliação prévia".** Análogo ao relatório "Section 5DA" da IA. O Observatório publicaria anualmente quais grandes obras logísticas receberam recursos sem ACB pública, um instrumento de accountability que fortalece a credibilidade da CNA.
7. **Lição do Inland Rail: quantificar o benefício agrícola antes de defender o megaprojeto.** Para Ferrogrão, FICO/FIOL e hidrovias, exigir que a estimativa de cargas agrícolas captáveis seja feita por cadeia e por origem, com sensibilidade a 7%. Isso evita BCR marginal (cerca de 1,0 a 1,1) defendido só por narrativa.
8. **Monitoramento concorrencial do acesso a terminais de grãos no interior e nos portos.** Inspirado no monitoramento da ACCC sob o código de acesso a portos de trigo: indicadores de concentração e de queixas de acesso a transbordos e terminais ferroviários de grãos. Fica fora o desempenho de armadores, excluído do escopo.
9. **Uso do modelo para resiliência climática.** Como o TraNSIT com a NEMA e o Australian Climate Service: mapear corredores agrícolas vulneráveis a cheias e secas (BR-163, hidrovias do Norte) e priorizar elevação de pontes, desvios e drenagem.
10. **Coalizões locais encomendando evidência.** Replicar o arranjo de "8 municípios + 1 vizinho" do estudo de grãos de NSW e QLD: consórcios intermunicipais e sindicatos rurais cofinanciam estudos de corredor que alimentam a lista do item 4.
