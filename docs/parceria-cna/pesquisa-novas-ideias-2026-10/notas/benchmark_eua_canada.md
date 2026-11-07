# Benchmark EUA e Canadá: monitoramento e planejamento da logística de grãos e do agro

Data da pesquisa: 22/10/2026. Convenção usada em todo o arquivo:
- **[aberto]**: a página foi aberta. A citação literal (<15 palavras) vem dela.
- **[não conferi]**: o dado veio só de trecho de buscador, ou a página bloqueou o acesso (HTTP 403 ou fora do ar). Precisa ser checado antes de ir para o texto final.
- **Limitação geral:** o site da USDA AMS (ams.usda.gov) e o da BTS (bts.gov/ports) devolveram HTTP 403 a todas as tentativas. O site da Statistics Canada estava fora do ar. Por isso o bloco AMS e o bloco do BTS Port Performance têm baixa verificação primária.

---

## 1. USDA AMS: Grain Transportation Report, Ag Refrigerated Truck Quarterly, AgTransport e estudos da Transportation Services Division

### Takeaway
A AMS (Agricultural Marketing Service) mantém um "boletim semanal da logística de grãos", o Grain Transportation Report (GTR), que reúne em poucas páginas indicadores de caminhão, ferrovia, barcaça e exportação. Junto com ele há um trimestral de caminhão refrigerado e uma plataforma de dados abertos, a AgTransport. A AMS também encomenda estudos de impacto econômico, como o de fechamento de eclusas, que depois servem de munição para entidades de produtores no Congresso. Este foi o bloco com menos verificação primária: o site da AMS bloqueou o acesso.

### Cited Findings
- **GTR, periodicidade e escopo [não conferi]:** publicação semanal da AMS. Os destaques são organizados por setor: vendas para exportação, caminhão, ferrovia, barcaça e oceano. Edições de 2019–2023 aparecem no arquivo da AMS (ex.: GTR de 18/05/2023). O PDF devolveu 403. — [GTR 18/05/2023 (PDF)](https://www.ams.usda.gov/sites/default/files/media/GTR05182023.pdf); [página do GTR](https://www.ams.usda.gov/services/transportation-analysis/gtr) (403)
- **Indicadores do GTR, segundo os trechos de busca [não conferi]:**
  - ferrovia: carregamentos semanais de grãos das ferrovias Classe I, comparados com o ano anterior e a média de 3 anos; lances e ofertas do mercado secundário de vagões *shuttle* frente à tarifa (exemplo: 21.910 vagões de grãos na semana até 14/05/2022);
  - barcaça: tonelagem de grãos transportada, barcaças descendo o rio e barcaças descarregadas em Nova Orleans;
  - inspeções de exportação de milho, trigo e soja por região;
  - tabela de custo de transporte: caminhão, ferrovia (*unit train* e *shuttle*), barcaça e oceano. — [GTR 26/05/2022](https://www.ams.usda.gov/sites/default/files/media/GTR05262022.pdf); [GTR 17/12/2020](https://www.ams.usda.gov/sites/default/files/media/GTR12172020.pdf)
- **Agricultural Refrigerated Truck Quarterly (AgRTQ) [não conferi]:**
  - traz um panorama nacional e regional de volume, frete e disponibilidade de caminhão refrigerado;
  - o frete é a média ponderada trimestral de 9 mercados regionais, com rotas para 10 mercados terminais, por milha e por carga;
  - a disponibilidade vai numa escala de 1 ("Surplus") a 5 ("Shortage");
  - a base é o Fruit and Vegetable Truck Rate Report e o Movement Report da AMS;
  - a edição mais recente encontrada é a do 2º trimestre de 2024. — [RTQ 2º tri 2024](https://www.ams.usda.gov/sites/default/files/media/RTQ2ndQuarter2024.pdf); [dados](https://www.ams.usda.gov/node/21104)
- **AgTransport, a plataforma de dados abertos [aberto]:** a página se apresenta como "Welcome to USDA's Agricultural Transportation Open Data Platform!". É hospedada por terceiro: "USDA is providing this open data visualization platform from a 3rd party vendor". Oferece visualizações salvas, integração com Tableau e Excel e documentação de API. A página não lista os conjuntos de dados nem diz a frequência de atualização. — [agtransport.usda.gov](https://agtransport.usda.gov/)
- **Estudo da AMS sobre fechamento de eclusas (2016) [não conferi]:**
  - foi encomendado pela USDA e feito pela University of Tennessee, com modelo IMPLAN, eclusa por eclusa;
  - fechar a eclusa de LaGrange (rio Illinois) durante um ano-safra inteiro custaria cerca de 5.500 empregos, US$ 900 milhões em renda do trabalho e US$ 1,8 bilhão de atividade econômica por ano;
  - a perda de excedente do setor de milho e soja chegaria a US$ 549 milhões por ano. — [Resumo do estudo (PDF, 403)](https://www.ams.usda.gov/sites/default/files/media/EconomicImpactsAnalysisInlandWaterwaysSummary.pdf); [nota da ASA](https://soygrowers.com/news-releases/usda-sponsored-report-examines-impacts-of-potential-lock-and-dam-closures)

### Inferences
- O modelo da AMS combina três camadas que vale copiar: um boletim curto e periódico com o mesmo formato toda semana, dados brutos abertos (AgTransport) e estudos ocasionais de "quanto custa a falha". Essa última camada é a que entidades de produtores usam no Congresso.
- A AMS é um órgão do Ministério da Agricultura, não do Ministério dos Transportes. No Brasil, o equivalente institucional seria MAPA/Conab, e não ANTT/ANTAQ.

### Gaps
- Não consegui confirmar, na fonte, a defasagem do GTR, o dia de publicação, a lista atual de indicadores em 2026, nem se o AgRTQ continua sendo publicado depois de 2024. O site da AMS deu 403.
- A base legal e o orçamento da Transportation Services Division não foram verificados.

---

## 2. USACE e hidrovias: LPMS, NESP e evidências produzidas por entidades do agro

### Takeaway
O Corpo de Engenheiros do Exército dos EUA (USACE) mantém o Lock Performance Monitoring System (LPMS), um registro operacional de eclusas com filas, interdições, atrasos e tonelagem. Parte é pública e parte só sai via FOIA, a lei de acesso à informação americana. O argumento econômico para modernizar as eclusas do alto Mississippi (NESP) foi construído com estudos de "custo da interdição". Esses estudos foram encomendados por fundações setoriais e pela USDA e feitos por universidades. Entidades como a Waterways Council e a Soy Transportation Coalition os levaram ao Congresso.

### Cited Findings
- **LPMS [aberto]:**
  - é do USACE e cobre embarcações que passam por eclusas do Corpo. Funciona como "planning tool for vessel operators";
  - os produtos públicos incluem relatórios de fila e de status das eclusas, tonelagem mensal e relatórios de interdição e atraso;
  - há restrição: "Only accessible on USACE ACE-IT Machines". Usuários de fora do USACE precisam de FOIA para os dados não públicos;
  - os dados vêm em "daily and half-hourly snapshots";
  - portal: ndc.ops.usace.army.mil. — [CISA – LPMS](https://www.cisa.gov/mts-resilience-resources/lock-performance-monitoring-system-lpms)
- **Uso analítico do LPMS [não conferi]:** um relatório das National Academies usou dados do LPMS para medir atraso e indisponibilidade de eclusas entre 2000 e 2013. — [NASEM, cap. 13](https://nap.nationalacademies.org/read/21763/chapter/13)
- **Estudo "The Impacts of Unscheduled Lock Outages" (2017) [aberto]:**
  - patrocinado pela National Waterways Foundation e pela MARAD, a administração marítima dos EUA; feito por grupos da University of Tennessee e da Vanderbilt;
  - analisou 4 eclusas: LaGrange, Markland, Calcasieu e Lock & Dam 25;
  - a interdição não planejada de LaGrange atingiria 135 condados em 18 estados, somaria US$ 1,7 bilhão em custo de transporte e tiraria US$ 2,1 bilhões da renda ligada à agropecuária;
  - LaGrange e L&D 25 juntas gerariam cerca de 500 mil viagens extras de caminhão carregado por ano.
  — [WorkBoat, 02/11/2017](https://www.workboat.com/coastal-inland-waterways/study-finds-lock-breakdowns-drain-billions-from-economy)
- **NESP, base legal e argumentos [não conferi]:**
  - foi autorizado no Título VIII do WRDA 2007 (a lei de recursos hídricos) e prevê modernizar 7 eclusas no alto Mississippi e no Illinois;
  - foi incluído na Capital Investment Strategy de 20 anos para hidrovias (dez/2020);
  - uma carta bipartidária de dez/2021 pediu recursos da IIJA, a lei de infraestrutura, observando que a lei dá prioridade a projetos que constam da Capital Investment Strategy;
  - defensores citam um estudo da USDA de 2019 que projetaria +US$ 72 bilhões no PIB. Não conferi esse estudo.
  — [Carta 09/12/2021 (Senado)](https://www.durbin.senate.gov/imo/media/doc/12.9.21%20NESP%20Workplan%20Letter%20FINAL.pdf); [Feedstuffs](https://www.feedstuffs.com/news/corps-urged-fund-program-upper-mississippi-river-locks)
- **NESP no orçamento de 2027 [não conferi]:** em 2026, gabinetes da Câmara relataram US$ 75 milhões para eclusas no projeto de lei de Energy & Water. Isso depende de aprovação nas duas casas, e o resultado final não foi confirmado. Abri um pedido de FY27 (PDF), mas o texto não estava legível. — [Câmara, release](https://budzinski.house.gov/posts/budzinski-helps-secure-75-million-for-lock-dam-upgrades-in-house-energy-water-appropriations-bill); [pedido FY27 (PDF)](https://sorensen.house.gov/sites/evo-subsites/sorensen.house.gov/files/evo-media-document/fy27-fednex_e-w-nesp.pdf)
- **Waterways Council [aberto]:**
  - a pauta central é que "the aging lock and dam infrastructure on our inland waterways needs to be addressed";
  - sobre a verba de operação e manutenção, diz que "had remained flat for decades";
  - lista o NESP ("Upper Miss System") na seção Get Involved, foca o WRDA 2026 e marca o simpósio anual para 10–11/11/2026;
  - a página não traz valores. — [waterwayscouncil.org](https://waterwayscouncil.org/)
- **Soy Transportation Coalition (STC) [aberto]:**
  - foi "established by thirteen state soybean boards", com a American Soybean Association e o United Soybean Board, ou seja, financiamento do próprio produtor;
  - produtos de evidência listados no site: *Farm to Market: A Soybean's Journey* (com perfis de 26 estados), *Railroad Report Card* (2016), *Top 20 Innovations for Rural Bridge Replacement and Repair* (2021), *Containerized Shipping on Inland Waterways* e uma calculadora de melhor opção de venda.
  — [soytransportation.org](https://soytransportation.org/)
- **STC e eclusas [não conferi]:** não encontrei um estudo de falha de eclusa assinado pela STC. O material do United Soybean Board atribui à STC a tese de que o produtor ganha contratos de exportação por causa do frete baixo. — [USB – Locked out](https://unitedsoybean.org/hopper/locked-out/)

### Inferences
- O caminho do argumento nos EUA foi este: dado operacional público (LPMS) → estudo independente de "custo da falha", feito por universidade e pago por fundação setorial ou pela USDA → inclusão numa lista oficial de prioridades (Capital Investment Strategy) → a lei de financiamento (IIJA) passa a priorizar quem está na lista → dotação anual no orçamento.
- O agro não fez a engenharia do projeto. Produziu números de impacto por estado e por condado, que é o formato que funciona com parlamentares.

### Gaps
- Não abri a análise econômica oficial do USACE para o NESP (o estudo de viabilidade da UMR-IWW). Não tenho a relação benefício/custo oficial.
- Não abri a Capital Investment Strategy de 2020 nem confirmei a posição atual do NESP no orçamento de 2026–27.
- A atuação específica da American Farm Bureau Federation não foi verificada.

---

## 3. USDOT: Freight Analysis Framework, BTS e Port Performance

### Takeaway
O Freight Analysis Framework (FAF) é a matriz oficial de origem e destino de cargas dos EUA, por produto e por modal, com projeções. A versão mais recente é a FAF6, com base em dados de 2022. O Port Performance Freight Statistics Program, da BTS, é exigido por lei, mas não pude verificá-lo, porque o site devolveu 403.

### Cited Findings
- **FAF [aberto]:**
  - é produzido em conjunto por BTS e FHWA a partir do Commodity Flow Survey, somado a dados de comércio exterior;
  - informa "tonnage and value by regions of origin and destination, commodity type, and mode";
  - a FAF5 dá projeções até 2050 em 3 cenários: "forecasts provide a range of future freight demands at five-year increments";
  - a FAF6 é a "new benchmark of estimated U.S. commodity flows based on 2022 data".
  — [FHWA – FAF](https://ops.fhwa.dot.gov/freight/freight_analysis/faf/)
- **Port Performance (BTS) [não conferi]:** página com 403. A base legal (FAST Act), os indicadores e o relatório anual ao Congresso não foram verificados. — [bts.gov/ports](https://www.bts.gov/ports)

### Inferences
- O FAF é a peça que permite dizer quantas toneladas de soja de um estado passam por um corredor. É o equivalente do que faltaria no Brasil: uma matriz O/D pública e recorrente para o agro, hoje parcial no PNL/EPL.

### Gaps
- Não encontrei, nesta rodada, casos documentados de estados agrícolas usando o FAF em seus planos estaduais de carga.

---

## 4. Canadá: GMP/Quorum, Ag Transport Coalition, dados ferroviários obrigatórios, CTA e NTCF

### Takeaway
O Canadá tem o sistema mais institucionalizado dos dois países. Ele combina:
- um monitor independente contratado pelo governo, o Grain Monitoring Program, operado pela Quorum Corporation;
- dados ferroviários semanais que a lei obriga as ferrovias a entregar desde 2018;
- um teto regulado de receita ferroviária para grãos, calculado pela Canadian Transportation Agency (CTA);
- um painel diário e semanal financiado pelos próprios produtores, a Ag Transport Coalition;
- um fundo competitivo de corredores, o NTCF, que o Auditor-Geral criticou por falta de transparência na priorização.

### Cited Findings
- **Grain Monitoring Program [aberto]:**
  - a base são dados da própria indústria: "The GMP's foundation remains the data received from industry stakeholders";
  - publica relatórios mensais ("began publishing monthly reports in January 2015") e anuais, estes cobrindo as safras 2000-01 a 2024-25;
  - o trimestral acabou em 2014: "Production of Quarterly Reports has been discontinued";
  - há um Performance Update semanal, "a snapshot of some current operational measures for the Western GHTS", cobrindo "stock levels, rail car allocation plans, port unloads, port shipments and vessel lineups";
  - o GMODS, sistema de dados abertos em CSV, existe desde maio de 2019;
  - os títulos de estudos tratam de desempenho ferroviário, tempo de navio no porto, frete ferroviário, *interswitching* e *producer netback*.
  — [grainmonitor.ca](https://grainmonitor.ca/); [relatórios](https://grainmonitor.ca/reports.html)
- **Mandato do GMP [não conferi]:** o site lista o "Grain Monitoring Program Mandate (rev 2020)", mas o PDF deu 404. O site não cita a Transport Canada, então o vínculo contratual com o governo federal não ficou confirmado nas páginas abertas.
- **Ag Transport Coalition [aberto]:**
  - coalizão de associações de produtores (logos de Alberta Wheat, Manitoba Pulse, Canadian Canola Growers, Saskatchewan Wheat, Inland Terminal Association, Pulse Canada etc.), cofinanciada por um programa federal-provincial (Growing Forward 2);
  - publica o "Daily Network Status Report" e relatórios semanais por "Grain Week" na seção Performance Measurement;
  - a página não detalha os indicadores, como pedidos de vagão atendidos.
  — [agtransportcoalition.com](https://www.agtransportcoalition.com/)
- **Dados ferroviários obrigatórios [não conferi]:**
  - a Transportation Modernization Act de 2018 obriga as ferrovias Classe I a reportar indicadores semanais públicos e dados confidenciais de *waybill*;
  - os indicadores incluem velocidade, tempo de permanência em terminal, vagões em linha e atendimento de pedidos de vagão para grãos;
  - a Statistics Canada publica as tabelas 23-10-0274 a 0277 desde 30/11/2018, com expansão em 2023;
  - em 2022 houve proposta de regulamento permanente (Canada Gazette). O status final não foi verificado e a página da StatCan estava fora do ar.
  — [Canada Gazette, 07/05/2022](https://canadagazette.gc.ca/rp-pr/p1/2022/2022-05-07/html/reg3-eng.html); [StatCan](https://www150.statcan.gc.ca/n1/en/surveys/5284)
- **CTA e o teto de receita (MRE) [aberto]:**
  - em 30/04/2026, a CTA fixou o índice de preços VRCPI da safra 2026–27 em 1,9864 para a CN (+0,66%) e 1,9474 para a CPKC (+0,65%);
  - "The VRCPI is an inflation factor"; "The Maximum Revenue Entitlement limits the overall revenue" das ferrovias com grão do oeste;
  - a determinação do teto sai até 31/12/2027.
  — [CTA, 30/04/2026](https://www.canada.ca/en/transportation-agency/news/2026/04/cta-announces-volume-related-composite-price-indices-for-crop-year-20262027-for-cn-and-cpkc.html)
- **Base legal do MRE [não conferi]:** o art. 150 da Canada Transportation Act manda a ferrovia devolver o que receber acima do teto. — [CTA s.150](https://laws-lois.justice.gc.ca/eng/acts/C-10.4/section-150.html)
- **NTCF, a auditoria de 2024 [aberto]:**
  - "$3.8 billion to fund 181 transportation projects", nas chamadas 1 a 6 até ago/2023;
  - houve evidência na origem: o órgão "gathered and used evidence on the status and performance of trade corridors";
  - mas "could not demonstrate on what basis it prioritized some meritorious projects over others";
  - quanto ao impacto, "was unclear whether projects were having the intended impact";
  - numa amostra de 54 projetos, 44% tinham estratégia completa de medição de desempenho, 50% incompleta e 6% nenhuma;
  - a chamada 7 previa "Advancing supply chain digitalization";
  - a auditoria não cita grãos.
  — [OAG, Relatório 4, 2024](https://www.canada.ca/en/auditor-general/our-work/audit-reports/parl-oag-202403-04-e.html)
- **Critérios do NTCF [não conferi]:**
  - chamadas avaliadas por fluidez e desempenho do sistema, ganho de capacidade e eliminação de gargalos perto de portos e corredores;
  - a chamada de comércio interno incluía "improve producers' access to markets";
  - os pesos dos critérios não foram verificados.
  — [Guia do candidato (PDF)](https://tc.canada.ca/sites/default/files/2023-06/applicants-guide-en-ntcf-digital-call.pdf)

### Inferences
- No Canadá, o dado de desempenho logístico do grão é obrigação legal e é regulado, porque existe um teto de receita ferroviária. A pressão dos produtores, materializada na Ag Transport Coalition, criou um painel paralelo que audita as ferrovias.
- A auditoria do NTCF é um alerta útil para a proposta à CNA: ter evidência sobre gargalos não basta. É preciso documentar o critério de priorização e medir o resultado depois da obra.

### Gaps
- Não confirmei o contrato Transport Canada–Quorum (valor, vigência) nem a base legal do GMP.
- Não abri um relatório semanal da Ag Transport Coalition para listar os indicadores exatos.
- Não verifiquei casos concretos do NTCF com projetos de grão (ex.: terminais em Vancouver ou Prince Rupert) nem seus valores.

---

## 5. Institucionalização e influência sobre investimento (síntese)

### Takeaway
Há três formas de sustentação:
1. **Dado estatal recorrente**, com lei ou mandato: GTR/AMS, FAF, LPMS, dados ferroviários do Canadá e o teto de receita da CTA.
2. **Monitor independente contratado pelo governo**: GMP/Quorum.
3. **Evidência paga pelo próprio produtor**: STC (bancada pelos *soybean boards*), Ag Transport Coalition e National Waterways Foundation.

O caso com números mais claro de influência é o das eclusas: os estudos de "custo da interdição" (US$ 1,7 bilhão por ano em LaGrange) alimentaram a pauta do NESP. Mesmo assim, o NESP segue dependendo de dotação anual, e não confirmei os valores atuais.

### Cited Findings
- Financiamento pelos produtores: a STC foi "established by thirteen state soybean boards". — [STC](https://soytransportation.org/)
- Estudos financiados por fundação setorial com o governo (MARAD), com números por estado. — [WorkBoat 2017](https://www.workboat.com/coastal-inland-waterways/study-finds-lock-breakdowns-drain-billions-from-economy)
- Risco de priorização opaca num fundo público ("could not demonstrate on what basis..."). — [OAG 2024](https://www.canada.ca/en/auditor-general/our-work/audit-reports/parl-oag-202403-04-e.html)

### Inferences
- Para um produto da CNA e do IBI, o que tem mais chance de pegar é a combinação de um painel recorrente com estudos de "custo da falha" por município ou estado. Isso replica o circuito STC/WCI → lista oficial → orçamento.

### Gaps
- Não encontrei, com fonte aberta, uma avaliação *ex post* de que um produto específico (o GTR, por exemplo) mudou uma decisão de investimento.

---

## O que o Brasil pode adaptar

Exclusão deliberada: nenhuma das ideias abaixo usa frete marítimo nem o desempenho de armadores.

1. **Boletim Semanal de Transporte de Grãos (modelo GTR/AMS).** Um PDF curto, com formato fixo, toda semana: rodoviário (frete e diesel), ferroviário (vagões carregados de grãos por ferrovia contra o ano anterior e a média de 3 anos), hidroviário (tonelagem no Arco Norte e calado) e porto (fila, espera e embarque de grãos). Os dados existiriam em ANTT, ANTAQ, ANP, Conab e MDIC. Patrocínio CNA, execução IBI.
2. **Painel aberto e API (modelo AgTransport e GMODS).** Publicar as séries do boletim em CSV e API, com dicionário de dados. Isso dá credibilidade técnica e permite reuso por federações estaduais.
3. **Monitor independente da cadeia de grãos (modelo GMP/Quorum).** Propor ao MAPA ou ao MPor um contrato plurianual com um monitor independente. O mandato seria publicado e medido por elos: armazém → ferrovia/rodovia → porto, com tempo total de sistema e *netback* ao produtor. O IBI poderia ser o operador ou o desenhista.
4. **Obrigação de dados ferroviários semanais (modelo Transportation Modernization Act/StatCan).** Defender, via ANTT, que as concessionárias publiquem toda semana a taxa de atendimento de pedidos de vagão de grãos, o tempo em terminal e a velocidade média. Hoje parte disso só existe em relatório anual.
5. **Painel diário dos produtores (modelo Ag Transport Coalition).** As federações estaduais e a CNA cofinanciam um painel diário e semanal de "status da rede" na safra. Ele mostraria o pedido de vagões contra o atendido e a fila de caminhões nos terminais do interior e do porto, com dados das próprias tradings e cooperativas.
6. **Estudos de "custo da falha" (modelo de LaGrange 2017/UT).** Estimar por município e por estado quanto custa interromper uma ligação crítica: BR-163 no Pará, uma eclusa de Tucuruí ou do Tietê, a seca no Madeira ou no Tapajós, ou um trecho ferroviário. Métricas: custo logístico extra, viagens extras de caminhão e renda agropecuária perdida. É o formato que mobiliza o Congresso.
7. **Lista de prioridades com critérios publicados (modelo Capital Investment Strategy, com a lição do OAG/NTCF).** Montar um estudo de priorização da infraestrutura do agro com pesos explícitos (volume afetado, redução de custo, resiliência, prazo), uma justificativa documentada para cada posição e indicadores *ex post*. Isso evita a crítica do Auditor-Geral do Canadá.
8. **Matriz origem-destino do agro (modelo FAF).** Uma matriz pública e periódica de toneladas por produto, origem municipal, porto e modal, com projeções em 3 cenários. Seria a base técnica comum para os itens 6 e 7.
9. **Indicador de cativeiro tarifário ferroviário (inspirado no MRE e VRCPI da CTA).** Sem propor um teto de receita, publicar todo ano um índice de frete ferroviário de grãos contra um índice de custos (diesel, mão de obra, capital) por concessionária, como subsídio à regulação da ANTT.
10. **Trimestral do caminhão do agro (modelo AgRTQ).** Volume, frete por faixa de distância e uma escala de disponibilidade de caminhões de 1 a 5 por praça. Seria útil para hortifrúti e proteína refrigerada, segmentos fora do radar dos grãos.
