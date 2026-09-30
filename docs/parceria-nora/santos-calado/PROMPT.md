# Projeto: Custo do calado perdido no Porto de Santos (IBI × NORA)

> Prompt-mestre do estudo. Criado em 30/09/2026 a partir da proposta da Fernanda (NORA).

## Papel
Aja como economista aplicado com especialização em econometria de transportes e
economia portuária. Rigor de banco central: toda estimativa vem com intervalo de
confiança, hipótese explícita e fonte primária. Não invente número. Se não conferiu
na fonte, escreva "não conferido".

## Contexto
O IBI (Observatório de Infraestrutura) e o NORA farão um estudo conjunto sobre o custo
da restrição de calado em Santos. O momento é a discussão da concessão do canal e do
aprofundamento. O NORA analisa as decisões dos atores (armadores, terminais, praticagem,
dragagem e poder público). **A parte do IBI é quantificar três coisas:**
1. **Carga não embarcada**: toneladas que deixaram de sair porque o navio partiu
   abaixo do seu calado de projeto.
2. **Perda de escala**: navios menores do que o ótimo e mais escalas por tonelada.
   Mede o custo unitário a mais em frete por tonelada.
3. **Valor não capturado**: tradução monetária dos itens 1 e 2, em frete adicional,
   espera por janela de maré, carga desviada para outros portos e receita/FOB,
   **sem contar o mesmo efeito duas vezes**.

## Pergunta final (proposta, a validar na call)
"Quanto custa por ano, em toneladas e em R$/US$, cada metro de calado que Santos não
oferece? Qual é o benefício marginal de ir de X m para X+1 m e X+2 m?"

## FASE 0 — Inventário e viabilidade de dados (ENTREGAR ANTES DA CALL)
Não estime nada ainda. Produza `docs/parceria-nora/santos-calado/00-inventario-dados.md`
com uma tabela por fonte: variável, granularidade (navio×viagem? mês?), período,
forma de acesso (pública, pedido LAI, convênio, paga), custo, se você **testou o
acesso de fato** e o que bloqueia.

Fontes a testar, no mínimo:
- **ANTAQ Estatístico Aquaviário** (atracação + carga): TEsperaAtracacao, peso por
  atracação, berço/terminal, navio (IMO). Verifique se há calado de chegada/saída.
  Os Parquet estão no volume da antaq-api, hoje desligada; ver memória
  `project_fonte_dados_antaq_api`.
- **APS/DIOPE**: navios esperados, atracados e despachados (já temos parser em
  `scripts/lineup/santos.ts`), mais o histórico do **calado máximo autorizado** por
  trecho, berço e maré, com a regra vigente em cada data.
- **Praticagem de SP**: calado operacional, janelas de maré e restrições por evento.
- **AIS** (calado declarado na saída, por IMO): Global Fishing Watch, UN Global
  Platform, Spire/MarineTraffic (pago). Anote o custo.
- **Características do navio** por IMO: DWT, calado de projeto e TPC (toneladas por cm
  de imersão). Fontes: IHS/Clarksons (pago), Equasis (gratuito, parcial). Se não houver
  TPC, use aproximação por classe (Handymax/Panamax/Kamsarmax/Post-Panamax/Capesize).
- **Fretes e afretamento** por classe: Baltic Indices, Clarksons e relatórios
  públicos. Servem para a curva custo/tonelada × tamanho do navio.
- **Comex Stat**: valor FOB por NCM/porto/mês, para monetizar e medir desvio entre portos.
- **Portos concorrentes** (Paranaguá, Itaqui, Vila do Conde, Rio Grande): calado
  autorizado e movimentação, para o contrafactual de desvio.

Termine a Fase 0 com três listas: **indispensável**, **desejável** e **dispensável**.
Para cada dado indispensável, diga quem o detém e qual pedido fazer (texto pronto para
ofício ou LAI). Proponha também um cronograma realista que parta do dado mais lento.

## FASE 1 — Estratégia de identificação (só depois de aprovar a Fase 0)
Escreva a metodologia em `01-metodologia.md` e **congele-a com pré-registro + hash
SHA-256** antes de rodar qualquer estimativa, como fizemos na Carteira e em
Itacoatiara. Mudar um critério depois exige v2.

**1. Carga não embarcada (unidade: navio×saída)**
- Toneladas perdidas do navio i = max(0, calado_projeto_i − calado_saída_i) × TPC_i
  × 100, **somente para navios em que a restrição foi a limitante**.
- Identificação: **bunching**. Navios limitados se acumulam logo abaixo do calado
  máximo autorizado. Estime a distribuição contrafactual (polinomial fora da janela,
  como em Kleven) e obtenha a massa em excesso. Navios que saíram abaixo do limite
  por falta de carga ou por serem pequenos **não contam**.
- Robustez: mudanças no calado autorizado ao longo do tempo (dragagens,
  assoreamento, novas regras) como experimento natural, em diferenças-em-diferenças
  com berços/trechos não afetados como controle, ou em event study em torno de cada
  mudança.
- Separe por natureza de carga: granel sólido agrícola, contêiner (TEU e peso por TEU)
  e demais.

**2. Perda de escala**
- Curva de custo: estime log(custo por tonelada) = α + β·log(DWT) + controles de rota,
  ano e combustível. O β é a elasticidade de escala e deve sair negativo.
- Contrafactual: com +1 m e +2 m de calado, qual seria a distribuição de tamanhos de
  navio? Use o calado de projeto dos navios que já escalam hoje (limite inferior) e a
  frota que escala em portos comparáveis mais profundos (limite superior).
- Custo = (custo/t observado − custo/t contrafactual) × toneladas.

**3. Valor não capturado — sem dupla contagem**
- Parcelas: (a) frete adicional, vindo do item 2; (b) espera por janela de maré em
  navio-dia × taxa diária de afretamento por classe; (c) desvio de carga para outros
  portos. Para (c), use escolha discreta (logit condicional porto × origem) com calado
  como atributo, ou gravidade.
- Declare explicitamente como (a), (b) e (c) se sobrepõem e **some só o que não se
  sobrepõe**. Não use FOB da carga desviada como perda: carga que saiu por outro porto
  continua sendo exportação. Nesse caso a perda está no custo logístico adicional.
- Entregue US$/ano e R$/ano com IC 90%. Faça sensibilidade ao câmbio, ao frete
  (ano alto × ano baixo) e ao TPC.

## Regras de integridade
- Separe **dado oficial** de **estimativa IBI** em todas as tabelas e gráficos.
- Todo número rastreável ao script e à fonte, com scripts em
  `scripts/estudo-santos-calado/`.
- Faça validação fora da amostra sempre que possível. Reporte também o que não deu
  significativo.
- Aponte as limitações: TPC aproximado, calado AIS autodeclarado, amostra de navios
  com IMO casado.

## Formato da entrega (a decidir com o NORA; prepare as duas opções)
- Nota técnica conjunta (modelo IBI, até 3 laudas) com os números principais.
- Proposta de **indicador permanente** no Observatório: "toneladas não embarcadas por
  restrição de calado — Santos", atualizado mensalmente com AIS + APS. Diga se é
  viável com dado público.

## Ganho de escopo para o estudo 01 (custo regulatório do tempo da carga)
Liste quais tabelas da Fase 0 servem também para o estudo 01, principalmente espera
por atracação da ANTAQ, line-up e navio-dia. O objetivo é montar a base uma vez só.

Comece pela Fase 0. Não rode nenhuma estimativa antes da aprovação do Bruno.
