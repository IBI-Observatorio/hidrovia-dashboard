# Geografia da safra, tendências agronômicas e demanda logística (visão agrônomo + analista de dados) — notas para IBI/CNA

Notas de pesquisa levantadas em 22/10/2026. Cada achado tem link e citação literal curta (<15 palavras) de página ou PDF que foi aberto. "Não conferi" = não verificado na fonte primária. Lacunas de dado aparecem como oportunidade de produto, e não como crítica às fontes oficiais.

**Fonte-base principal:** MAPA/SPA + Embrapa Solos, *Projeções do Agronegócio 2024/2025 a 2034/2035*. É a edição mais recente listada na página oficial, que não traz nenhuma edição 2025/26–2035/36 ([página de publicações MAPA](https://www.gov.br/agricultura/pt-br/assuntos/politica-agricola/todas-publicacoes-de-politica-agricola/projecoes-do-agronegocio)). O texto completo foi extraído do PDF do repositório do MAPA ([PDF repositório](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)). O nome do arquivo contém "defeso" e a metadata é de 31/08/2026. A versão em gov.br/agricultura não abriu (ECONNRESET), então os números abaixo vêm do arquivo do repositório. Os números de página citados são os da paginação impressa do relatório.

---

## 1. Para onde cresce a produção em 10 anos (MAPA 2024/25–2034/35), por produto e região

### Takeaway
Em 10 anos, o MAPA projeta +66 Mt de grãos (de 339,6 para 405,9 Mt, +19,5%) e +13,7 Mha de área de grãos (+16,8%). A produção cresce mais que a área, mas a área ainda pesa bastante: soja +11,8 Mha (+24,7%), milho 2ª safra +4,1 Mha sobre terra liberada pela soja, cana +1,4 Mha. Carnes ganham +6,5 Mt (+20,6%), lideradas por suíno e frango (~+25%). O epicentro continua sendo MT, que concentra 37,6% do milho, 29,5% da soja, 69,1% do algodão, 69% do etanol de milho e 18% do abate bovino. PA e RO já somam 17% do abate bovino.

### Cited Findings
**Grãos (total)**
- Grãos: 339.649 mil t (2024/25) → 405.892 mil t (2034/35), +19,5%. Área: 81.809 → 95.531 mil ha. Citação: "Acréscimo de 66,2 milhões de toneladas de grãos e 13,7 milhões de hectares" (Tabela 22, p. 53–54) — [MAPA Projeções 2024/25–2034/35](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Produtividade × área: "o crescimento da produção será superior ao da área cultivada" (p. 54) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

**Soja**
- Produção 168,3 Mt → 206,5 Mt (+22,7%). Exportação 106,0 → 137,2 Mt (+29,5%). Consumo interno 57,1 → 67,2 Mt (Tabela 7, p. 26). Citação: "soja a ser produzida em 2034/35 está projetada em 206,5 milhões" — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Área de soja: "passando de 47,6 milhões de hectares para 59,4 milhões" (p. 27). Na década anterior, a área subiu 48,4% e a produtividade 16,9% (p. 26) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Participação dos estados em 2025: "Mato Grosso, com 29,5% da quantidade nacional; Paraná, com 12,8%". GO tem 12,1%, RS 8,5% e MS 8% (p. 25) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

**Milho / safrinha**
- Produção 126,9 Mt → 155,6 Mt (+22,6%). Exportação 34,0 → 43,8 Mt (+29%). Consumo interno 89,3 → 106,7 Mt (Tabela 5, p. 20). A série projetada de exportação oscila entre 36 e 51 Mt de um ano para o outro — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- 2ª safra: "passando de 17 milhões de hectares para 21,1 milhões" (p. 21). Ela responde hoje por 66% a 75% da produção total de milho — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Onde cresce: "as áreas de soja liberam a maior parte daquelas requeridas pelo milho" (p. 21). A safrinha é intensificação sobre a mesma terra — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Distribuição em 2024/25: "Mato Grosso (37,6%), Paraná (15,2%), Goiás (9,5%), Mato Grosso do Sul (9,3%)" (p. 19) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

**Algodão**
- Pluma: 3,9 Mt → 4,95 Mt (+26,9%). Exportação 3 → 4 Mt. Concentração: "Mato Grosso tem a liderança com 69,1% do total nacional". BA tem 21,4% (p. 30) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Logística citada no relatório: "novos portos para exportação, em especial no Arco Norte" (p. 31) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

**Cana, açúcar e etanol de cana**
- Área colhida de cana: 8.696 → 10.085 mil ha (+1.389 mil ha) (Tabela 23, p. 55). Açúcar: 43,7 → 53,5 Mt. Exportação de açúcar: "projetado em 43 milhões de toneladas" (p. 41) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Não conferi a projeção de produção de cana em toneladas, nem a de etanol de cana, na edição 2024/25–2034/35.

**Café**
- O café perde área: 1.855 → 1.700 mil ha (Tabela 23). Gargalo logístico citado no relatório: "o porto de Santos opera próximo do seu limite" (p. 33–34) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- O robusta (ES/RO) aparece como alternativa resiliente: produção "crescendo 37,2% em 2025" — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Não conferi a cifra final de produção de café em 2034/35: a tabela extraída do PDF ficou ambígua quanto às colunas. Na edição anterior (2023/24–2033/34), o café ia a "72 milhões de sacas" ([Diário do Comércio, out/2024](https://diariodocomercio.com.br/agronegocio/producao-graos-pais-toneladas/)).

**Carnes e leite**
- Frango: 15.660 → 19.582 mil t (+25,0%). Bovina: 10.372 → 11.535 mil t (+11,2%). Suína: 5.533 → 6.938 mil t (+25,4%). Total: "Acréscimo de 6,5 milhões de toneladas de carnes" (Tabela 22) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Exportação de carnes: 10,5 → 13,4 Mt (+27,4%). Frango +29,8%, bovina +28,9%, suína +13,6% (p. 47) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Geografia do abate bovino (IBGE 2024, citado pelo MAPA): "Mato Grosso (18%), São Paulo (10,4%), Goiás (10,1%)". PA tem 8,8% e RO 8,2% (p. 43) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Frango (abate 2024): "Paraná (34,2%), Santa Catarina (13,8%) e Rio Grande do Sul (11,4%)". Suínos: SC 29,1%, PR 21,5%, RS 17,1% (p. 44) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- O frango cresce com "melhorias na infraestrutura logística e de produção, sobretudo no Centro-Oeste" (p. 46) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Leite: "37,3 bilhões de litros em 2025 para 44,4 bilhões" (p. 49) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

**Área total das lavouras**
- Todas as lavouras: "expansão dos atuais 94 milhões de hectares para 108,1 milhões" (p. 54). Perdem área: feijão (−33%), laranja (−23%), arroz (−18%) e café (−8%) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

**Recorte estadual MT (Imea Outlook 2034, out/2024)**
- Soja em MT: "16,6 milhões de hectares de plantio". Produção de 64,5 Mt, milho 80 Mt e algodão 4 Mt. Estimativa de que ao menos 16 Mha de pasto fiquem disponíveis para lavoura até 2034 (paráfrase, sem citação literal) — [BrasilAgro/Imea, 10/10/2024](https://www.brasilagro.com.br/conteudo/mato-grosso-produzira-149-milhoes-de-toneladas-de-graos-em-2034.html)

### Inferences
- Em ordem de grandeza, a nova carga de exportação até 2034/35 é de cerca de +31 Mt de soja e +10 Mt de milho por ano (diferenças entre as tabelas do MAPA), mais +1 Mt de algodão e +3 Mt de carnes. A maior parte nasce em MT e no eixo GO/MS. Grande parte da logística de saída nova é soja do Centro-Norte (BR-163/Arco Norte, FICO/FIOL, Ferrogrão), mas isso é inferência, não dado projetado.
- A exportação de milho projetada oscila entre 36 e 51 Mt de um ano para o outro. Para a logística, o risco é de capacidade de pico, não de média.
- O relatório traz projeção nacional, sem quebra por UF (só a base 2024/25 por estado). Projetar a demanda por corredor exige um modelo próprio de desagregação, e isso é uma oportunidade de produto.

### Gaps
- O relatório não traz recorte de MATOPIBA: a busca no texto extraído não retornou o termo. Não conferi números Conab/IBGE (PAM/LSPA) por UF para MATOPIBA, PA e RO.
- Não conferi a projeção de etanol de cana nem a de cana em toneladas na edição atual.
- Não encontrei edição MAPA 2025/26–2035/36 publicada até 22/10/2026.

---

## 2. Etanol de milho em MT/GO/MS e DDG: o milho que deixa de ser exportado

### Takeaway
O MAPA projeta que o etanol de milho "pode mais que dobrar", chegando a ~21,7 bilhões de litros em 2034/35 e a até 28% do consumo nacional de milho. MT moeu 12,5 Mt de milho em 2024/25 e gerou 2,72 Mt de DDG. Ou seja, uma fatia crescente da safrinha do Centro-Oeste vira etanol (que vai ao mercado interno por rodovia/duto) e ração (DDG) em vez de seguir como grão para o porto.

### Cited Findings
- "podendo mais que dobrar e alcançar cerca de 21,7 bilhões de litros" ao final do período, "responsável por até 28% do consumo nacional de milho" (p. 21) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Base: 7,8 bilhões de litros em 2024/25 e 8,7 bilhões previstos para 2025/26 (Conab, abr/2025). Por UF em 2025/26: MT 5.805 mi L, MS 2.046 mi L, GO 822 mi L (Tabela 6, p. 22–23) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- MT: "respondendo por 69% do total em 2024/2025" — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- MT 2024/25: "A moagem do grão subiu de 10,11 para 12,50 milhões de toneladas". DDG/DDGS "somando 2,72 milhões de toneladas". Projeção 2025/26: "moagem estimada em 13,3 milhões de toneladas" (Bioind-MT/Imea, 06/05/2025) — [Revista Cultivar](https://revistacultivar.com.br/noticias/mato-grosso-consolida-lideranca-na-producao-de-etanol-com-base-no-milho)
- UNEM, 2025/26 (mai/2025): nacional "estimada em 9,9 bilhões de litros", sendo MT 5,98 bi L, MS 2,07 bi L e GO 831 mi L — [NovaCana/Reuters](https://www.novacana.com/noticias/producao-etanol-milho-brasil-crescer-20-2025-26-unem-060525)
- Divergência entre fontes: para 2025/26, a Conab (via MAPA) estima 8,7 bi L e a UNEM 9,9 bi L. A diferença é de metodologia/data, não um erro de nenhuma das duas.
- Nota de busca: um título da CNN de 16/10/2026 diz que o etanol "deverá demandar 34 milhões de toneladas" de milho. Não abri a matéria, então não conferi.

### Inferences
- Ordem de grandeza: 12,5 Mt moídas em MT, frente a ~47,7 Mt de milho em MT (37,6% × 126,9 Mt). Isso dá ~1/4 do milho mato-grossense processado localmente. É um cálculo nosso, não um dado publicado.
- Efeitos logísticos: (a) menos milho rumo a Miritituba/Santos/Itaqui; (b) novos fluxos de etanol MT→Sudeste/Norte, de DDG para confinamentos e granjas, e às vezes de exportação de DDG; (c) cavaco/biomassa de eucalipto como insumo energético das usinas, um fluxo inbound pouco mapeado; (d) estoques de milho para a usina rodando o ano todo, o que muda a demanda de armazém.

### Gaps
- Não conferi a lista oficial de usinas em operação ou construção por município, nem a capacidade de moagem instalada (UNEM).
- Não conferi o destino do DDG (mercado interno × exportação) nem o modal de saída do etanol de MT.

---

## 3. Logística de entrada: fertilizantes, combustíveis e insumos

### Takeaway
O MAPA estima que "entre 85% e 90%" dos fertilizantes sejam importados e que ~84% do volume importado siga por caminhão. O PNF (2022) mira 45–50% de produção nacional até 2050. As entregas em 2025 rodaram ~45 Mt até novembro, e Paranaguá recebeu ~25% das importações. O fluxo de retorno (frete de retorno porto→interior) é a outra metade da conta do corredor.

### Cited Findings
- "entre 85% e 90% dos fertilizantes consumidos no Brasil sejam importados" (p. 58). Meta do PNF: "entre 45% e 50% da demanda até 2050" — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Peso no custo: fertilizantes respondem por "mais de 40% do custo total de produção" — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Modal: "cerca de 84% do volume é escoado por caminhões". Rodovia = 65% do transporte agro; exportação de grãos por rodovia = 44,7% do milho e 54,2% da soja (p. 59) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Dependência geopolítica: o país importa "sobretudo da Rússia e da China" (p. 56) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- 2025 (ANDA via imprensa): entregas de 45,27 Mt e importação de 39,7 Mt até novembro, com Paranaguá respondendo por ~25,1% — vi só o resumo da busca; a página [Acionista](https://acionista.com.br/fertilizantes-crescimento-recorde-impulsiona-mercado-e-desafia-dependencia-de-importacoes/) devolveu 403. **Não conferi.**
- Gargalo no porto (2022): para autoridade do MAPA, a falta de armazéns ao redor dos portos é o principal entrave, mais que a fila de navios. Vi só o resumo da busca, sem abrir a página — [Notícias Agrícolas](https://www.noticiasagricolas.com.br/noticia/324322). **Não conferi literalmente.**

### Inferences
- Agronomicamente, a janela de entrega de fertilizante é concentrada (jul–out para a soja do Centro-Oeste) e é contrassazonal à exportação de soja (fev–mai). Isso cria oportunidade de frete de retorno nos corredores Norte (Miritituba/Itaqui→MT) que hoje rodam vazios num sentido. É inferência, e o volume não foi conferido.
- Fertilizante menos concentrado e expansão de área implicam mais toneladas por hectare movidas até o interior. O crescimento de +13,7 Mha de grãos amplia a demanda de entrada.

### Gaps
- Não conferi o dado ANDA por UF de destino nem o calendário mensal de entregas de 2025/26.
- Não conferi combustível (diesel) para o interior nem o fluxo de calcário/gesso. O calcário é volume grande, de curta distância e crítico para a conversão de pastagens.

---

## 4. Perecíveis e proteína (cadeia do frio, frutas, leite)

### Takeaway
A expansão de carnes (+6,5 Mt de produção e +2,9 Mt de exportação em 10 anos) é ancorada no Sul (frango e suíno: PR, SC, RS) e migra para o Centro-Oeste. A carne bovina tem peso crescente no Norte (PA, RO). Isso exige cadeia do frio, contêiner reefer e energia confiável no interior, demandas que estudos centrados em grãos não capturam.

### Cited Findings
- Projeções de carnes e exportações: ver seção 1 — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Market share: o Brasil tem no frango "participação próxima de 60% do comércio mundial" (p. 47) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Exportação de frango por UF em 2025 (ABPA/Deral, via imprensa): PR ~40,8% do volume e Paranaguá com ~44% dos embarques. Vi só o resumo da busca; **não conferi literalmente** — [Notícias Agrícolas](https://www.noticiasagricolas.com.br/noticia/417403)
- Frutas: mango, melão e uva ganham área (Tabela 23: manga +6 mil ha, melão +7, uva +9). Os volumes são pequenos, mas de alto valor e perecíveis — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Leite +7,1 bilhões de litros (37,3 → 44,4 bi L) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

### Inferences
- O leite exige coleta diária em estradas vicinais (tráfego permanente, baixa tonelagem). Uma estrada vicinal intransitável na chuva significa perda imediata, um tipo de criticidade diferente do grão.
- O frango e o suíno do Centro-Oeste dependem de milho e farelo locais, que o etanol de milho e o DDG reforçam. Esse cluster integrado (grão → ração → proteína → reefer) desloca a carga de grão para carga refrigerada de maior valor.

### Gaps
- Não conferi dados de contêineres reefer por porto ou UF de origem (ANTAQ/Comex), a capacidade de câmaras frias (Conab/SIF) nem os fluxos de fruta do Vale do São Francisco ou do RN/CE.

---

## 5. Armazenagem, perdas e crédito (PCA)

### Takeaway
A capacidade estática é de ~217–225 Mt (Conab 2025–2026) para uma safra de ~350 Mt, ou seja, cerca de 59–65% de cobertura. Nos EUA a capacidade é de ~150% da safra. No Brasil, só ~16,5–17% da capacidade fica na fazenda. MT tem a maior capacidade (57,9 Mt). No MS, o déficit é de 12,7 Mt, segundo o critério FAO (produção + 20%). O PCA 2026/27 tem juros de até 8% a.a. para unidades de até 12 mil t.

### Cited Findings
- "a capacidade estática de armazéns no Brasil chegou a 217 milhões de toneladas em 2025". Déficit "na casa de 120 milhões de tonelada". "Estados Unidos... capacidade de armazenar cerca de 150% da colheita". "cerca de 80% da capacidade instalada no Brasil encontra-se fora das propriedades" (p. 60) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- Painel Conab 2026 (via imprensa): "Em 2026, o país alcança 225,26 milhões de toneladas". "O país conta ainda com 12.116 unidades armazenadoras". "Apenas cerca de 59% dessa produção conta com capacidade adequada". MT tem 57,9 Mt, PR 35,9 Mt e RS 33,4 Mt; a fatia na fazenda é de 16,54% — [Itatiaia](https://www.itatiaia.com.br/economia/negocios/eloos/saiba-mais-sobre-a-capacidade-de-armazenagem-de-graos-no-brasil/)
- Na fazenda (Anuário Agrologístico Conab 2025, 05/06/2025): "35,64 milhões de toneladas", "apenas 16,8% da capacidade estática nacional", "um crescimento de 72,13% no período" (2010–2025) — [Revista Cultivar](https://revistacultivar.com.br/noticias/armazenagem-nas-fazendas-cresce-72-em-15-anos)
- MS (estudo SEMADESC, out/2025, dados SIGA-MS/Aprosoja): capacidade "passando de 9,01 milhões de toneladas em 2014 para 16,39 milhões" (2025). O déficit "atingiu 12,72 milhões de toneladas", com 73 de 78 municípios deficitários — [SEMADESC-MS](https://www.semadesc.ms.gov.br/wp-content/uploads/2025/10/Estudo-Capacidade-de-Armazenamento-1.pdf)
- PCA 2026/27 (BNDES): "taxa prefixada de até 8% ao ano" para até 12 mil t. Limite de R$ 50 mi por produtor e R$ 200 mi por cooperativa, prazo de 10 anos com 2 de carência. A abertura "ainda será comunicada às instituições financeiras" — [Agrolink](https://www.agrolink.com.br/noticias/pca-2026-27-preve-juros-de-ate-8--ao-ano-para-armazens-de-graos--veja-limites--prazo--carencia-e-quando-o-credito-podera-ser-solicitado-_517837.html)
- PCA 2025/26: as fontes divergem quanto à alocação (R$ 4,5 bi × R$ 3,7 bi) e quanto aos juros (8,5% × 10%). Vi só os resumos da busca: **não conferi**. Também **não conferi** a execução ou uptake do PCA (valor contratado), nem nos boletins de crédito rural do MAPA.

### Inferences
- A divergência entre 217 e 225 Mt reflete datas diferentes do painel Conab, não erro. Vale padronizar a data-base em qualquer produto.
- O déficit está concentrado no Centro-Oeste e em MATOPIBA. Isso força a venda e o embarque na colheita e alimenta o pico de fretes. A safrinha (jun–ago) compete com a soja ainda estocada, o que gera o "aperto de julho".

### Gaps
- Não conferi a comparação da fatia na fazenda com a Argentina (silo-bolsa).
- Não conferi perdas pós-colheita quantificadas (Embrapa/Conab).
- Não conferi o uptake do PCA por UF.

---

## 6. Clima, calendários e janelas de pico logístico

### Takeaway
Calendário regulado: o vazio sanitário em MT vai de 8/jun a 6/set/2026, com semeadura liberada de 7/set/2026 a 7/jan/2027. O plantio efetivo depende da chuva. A janela da safrinha depende da data da soja, o que define o pico de exportação de milho (jul–set) e sua sobreposição com a seca dos rios do Norte (ago–nov). Em 2024 a seca parou barcaças no Madeira e no Tapajós de agosto/outubro até novembro.

### Cited Findings
- MT, safra 2026/27: "Em Mato Grosso, o vazio vai de 8 de junho a 6 de setembro de 2026". Vi só o resumo da busca, com base na Portaria SDA nº 1.579; **não conferi literalmente** — [Compre Rural](https://comprerural.com/com-fim-do-vazio-sanitario-plantio-da-safra-2026-27-e-permitido-no-estado/); [Revista Cultivar](https://revistacultivar.com.br/noticias/ministerio-da-agricultura-define-vazio-sanitario-da-soja-2026-27)
- MS: a Aprosoja/Famasul propõe semear a partir de 1º/set para melhorar a janela do milho 2ª safra. É proposta, não regra. Vi só o resumo da busca — [Revista Cultivar](https://revistacultivar.com.br/noticias/entidades-propoem-novo-calendario-da-soja-em-ms)
- Seca 2024: em Porto Velho, o Madeira estava em 1,95 m. As empresas "reduziram em 40% o volume carregado nas barcaças". A Abani estimou ~800 barcaças paradas, com retomada "apenas em novembro" e ~2 Mt de grãos sem transporte (29/08/2024) — [AgFeed](https://agfeed.com.br/economia/seca-na-regiao-norte-ja-afeta-transporte-de-graos-por-hidrovias)
- Tapajós, out/2024 (Amport via Reuters): navegação de comboios interrompida em 4/out/2024. Vi só o resumo da busca — [Notícias Agrícolas](https://www.noticiasagricolas.com.br/noticia/386617)
- Risco climático reconhecido pelo MAPA: "irregularidades nas chuvas e ocorrência de eventos extremos" em MS, RS e no Sul (p. 27). Sementes tolerantes e "manejo adaptado a janelas de plantio menores" (p. 25) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- O MAPA reconhece que as projeções "não incorporam plenamente" os efeitos das mudanças climáticas (p. 56) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

### Inferences
- Esta é a cadeia agronômica que define o pico logístico: chuva de set/out → semeadura da soja → colheita jan–mar (pico de soja fev–abr) → semeadura da safrinha até ~fim de fev → colheita jun–ago (pico de milho jul–set). Esse pico coincide com a vazante amazônica (ago–nov). Com El Niño, o atraso da chuva empurra tudo para frente e espreme a safrinha. Com La Niña, cresce o risco de seca no Sul (RS). As datas são agronômicas gerais, não conferidas em fonte aberta nesta pesquisa.
- A expansão da 2ª safra (+4,1 Mha) aumenta justamente a carga que cai na janela de rio baixo do Arco Norte.

### Gaps
- Não conferi o ZARC por município nem séries de data de semeadura (Imea/Conab).
- Não conferi o impacto de 2023 nem dados de 2025/2026 de nível do Madeira e do Tapajós.

---

## 7. Pastagens degradadas (Caminho Verde Brasil) e novos volumes

### Takeaway
O programa (Decreto 11.815/2023) mira até 40 Mha em 10 anos. A 1ª fase (Eco Invest, 2º leilão) homologou ~R$ 30,2 bi e ~1,38 Mha, e o MAPA fala em até 3 Mha. A Embrapa estima ~28 Mha de pastagens degradadas com bom ou muito bom potencial agrícola. Pastos convertidos em soja e milho viram nova carga no meio do Cerrado e da Amazônia Legal, frequentemente longe da rede atual.

### Cited Findings
- "Programa Nacional de Conversão de Pastagens Degradadas... pelo Decreto nº 11.815". Meta de "recuperação de 40 milhões de hectares de áreas degradadas em 10 anos". Pastagens: ~177 Mha, dos quais ~110 Mha (60%) com degradação. A Embrapa estima "cerca de 28 milhões de hectares" com bom potencial agrícola (p. 54) — [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
- 1ª fase: "aproximadamente R$ 30,2 bilhões em investimentos", "cerca de 1,38 milhão de hectares". O MAPA estima "até 3 milhões de hectares". O brief cita ~82 Mha com algum grau de degradação, uma base distinta da do MAPA. Data: julho/2026 — [Insper Agro, Policy Brief Caminho Verde Brasil](https://agro.insper.edu.br/storage/papers/July2026/Policy%20Brief%20-%20Caminho%20Verde%20Brasil.pdf)
- Divergência de base: 177 Mha / 110 Mha degradados (LAPIG, via MAPA) × 165 Mha / 82 Mha (Insper). São metodologias diferentes, e as duas fontes estão citadas acima.

### Inferences
- Ilustração, não projeção: 1,38 Mha convertidos para soja a ~3,5–4 t/ha dariam ~5 Mt/ano de soja, mais milho safrinha. 28 Mha aptos seriam um teto de ordem de 100 Mt. Esses são cálculos nossos. Toda conversão também gera fluxo de entrada de calcário, gesso e fertilizante na fase de correção do solo (anos 1–3), antes de gerar carga de saída.

### Gaps
- Não conferi a localização (UF/município) dos hectares contratados na 1ª fase.
- Não conferi a fração destinada a lavoura × intensificação pecuária.

---

## 8. Propostas de NOVOS produtos de dados/estudos (fora do backlog existente)

### Takeaway
Seguem 11 ideias ancoradas em agronomia. Nenhuma repete o backlog (radar CIOT, planilha silo×safra, termômetro de fertilizante, alerta de pico, contagem em pedágios, custo porteira-navio, índice de criticidade, modelo de migração de rede, rede AIS de barcaças).

### Cited Findings (fundamento de cada ideia)
1. **Projeção de carga por corredor (downscaling MAPA→município).** O MAPA projeta só no nível nacional; o produto distribui por município usando a participação PAM/LSPA e a aptidão. Base: Tabelas 5, 7 e 22 do [MAPA](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
2. **Mapa de "carga latente" do Caminho Verde.** Cruza pastagem degradada apta (Embrapa, 28 Mha) com distância a terminal e armazém, e estima toneladas futuras e calcário de entrada por município. Base: [MAPA p. 54](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf); [Insper](https://agro.insper.edu.br/storage/papers/July2026/Policy%20Brief%20-%20Caminho%20Verde%20Brasil.pdf)
3. **Balanço "milho que fica" (etanol + ração).** Para cada polo de usina (MT/MS/GO), estima milho moído, DDG e etanol, e o saldo exportável, ou seja, quanto sai dos corredores de exportação. Base: [Revista Cultivar/Imea](https://revistacultivar.com.br/noticias/mato-grosso-consolida-lideranca-na-producao-de-etanol-com-base-no-milho); [MAPA Tabela 6](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
4. **Calendário fenológico-logístico.** Data de semeadura estimada por sensoriamento remoto (NDVI) + ZARC + vazio sanitário projetam semanas de colheita por microrregião, e daí a curva de oferta semanal de soja e milho. Difere do "alerta de pico" porque é modelo agronômico de antecipação de 60–120 dias. Base: vazio sanitário MT ([Compre Rural](https://comprerural.com/com-fim-do-vazio-sanitario-plantio-da-safra-2026-27-e-permitido-no-estado/))
5. **Índice de sobreposição safrinha × vazante amazônica.** Estima a probabilidade de que o pico de milho caia com calado restrito no Madeira e no Tapajós, condicionada a El Niño/La Niña. Base: [AgFeed 2024](https://agfeed.com.br/economia/seca-na-regiao-norte-ja-afeta-transporte-de-graos-por-hidrovias); [MAPA p. 25](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
6. **Monitor de frete de retorno (backhaul) fertilizante×grão.** Casa a sazonalidade de entrega de fertilizante (jul–out) com a de escoamento (fev–ago) por par porto–polo, e indica corredores com capacidade ociosa num sentido. Base: 84% do fertilizante por caminhão ([MAPA p. 59](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf))
7. **Atlas da cadeia do frio no interior.** Frigoríficos SIF, câmaras frias, laticínios e energia, cruzados com a projeção de carnes (+6,5 Mt) e leite (+7,1 bi L), e o tempo até o porto reefer. Base: [MAPA Tabelas 16 e 19](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)
8. **Índice de estradas vicinais críticas para leite e proteína.** Municípios com coleta diária de leite ou granjas integradas, vicinais de terra e chuva intensa. É uma criticidade diária, distinta da do grão. Base: o MAPA cita a necessidade de melhorar "principalmente os vicinais" ([p. 60](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf))
9. **Painel de execução do PCA e da armazenagem na fazenda.** Contratos do PCA por município (BNDES/SICOR) × incremento SICARM × déficit FAO, medindo onde o crédito vira capacidade. Base: [Agrolink PCA 2026/27](https://www.agrolink.com.br/noticias/pca-2026-27-preve-juros-de-ate-8--ao-ano-para-armazens-de-graos--veja-limites--prazo--carencia-e-quando-o-credito-podera-ser-solicitado-_517837.html); [SEMADESC-MS](https://www.semadesc.ms.gov.br/wp-content/uploads/2025/10/Estudo-Capacidade-de-Armazenamento-1.pdf)
10. **Estudo de perdas pós-colheita por gargalo.** Quantifica a perda (quebra, umidade, fila) associada a dias de espera e armazenagem a céu aberto ou em silo-bolsa no pico, ligando perdas agronômicas a infraestrutura. Base: o déficit de ~120 Mt ([MAPA p. 60](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)). Não conferi números de perdas.
11. **Radar de novas fronteiras de pecuária e soja no Norte (PA/RO).** O abate em PA (8,8%) e RO (8,2%) cresce e a soja avança. O produto acompanha o abate SIF, a área de soja e a saída por Porto Velho/Santarém. Base: [MAPA p. 43](https://repositorio-dspace.agricultura.gov.br/bitstream/1/6224/1/defeso%20proje%c3%a7%c3%a3o%20do%20agronegocio%2025.35.pdf)

### Inferences
- As ideias 1, 3 e 4 juntas formam um "modelo de oferta" que alimenta os produtos já existentes no backlog (custo por rota, criticidade), em vez de substituí-los.
- As ideias 2 e 7–8 diferenciam a parceria com a CNA porque cobrem o pecuarista e o produtor de leite, não só o sojicultor.

### Gaps
- A viabilidade de dados não foi conferida para: SICOR/BNDES (granularidade municipal do PCA), localização do SIF e das câmaras frias, e ZARC em formato aberto.
