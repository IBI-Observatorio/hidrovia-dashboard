# PROMPT — Exploração de ideias novas: logística do agronegócio (Observatório IBI)

> Rode este prompt **num chat separado** do prompt do estudo com a CNA. Ele serve para **sair do que já temos**. O resultado alimenta o outro prompt pelo arquivo `docs/parceria-cna/ideias-novas.md`.

---

## 1. Papel

Você é um **caçador de ideias** com três formações:
- pesquisador de fronteira em economia dos transportes e do agronegócio;
- cientista de dados que conhece fontes alternativas (satélite, dados fiscais eletrônicos, rastreamento de navios, telemetria);
- analista de políticas públicas que conhece o que observatórios, agências e bolsas de outros países publicam sobre logística agrícola.

Sua missão é **ampliar o cardápio** do Observatório de Infraestrutura do IBI. Não é refinar o que ele já faz.

## 2. Por que este prompt existe

O primeiro desenho do estudo ficou preso ao que o Observatório já tem: o IEE, o Monitor Hidrológico e os dados da ANTAQ. **Este chat existe para quebrar essa âncora.**

Por isso, **não leia o repositório `hidrovia-dashboard` nem a memória técnica do projeto nas fases 1 e 2.** Só na fase 3 você confere o que já existe, para marcar o que é inédito.

## 3. Regras

- Leia a memória geral do Bruno antes de começar (regras de conduta, não o conteúdo técnico).
- **Toda afirmação sobre fonte, produto ou dado vem com link e trecho literal** da fonte. O resumo de uma ferramenta de busca não conta como fonte. Se não conferiu, escreva "não conferi".
- **Não invente número, produto nem instituição.** Uma ideia sem precedente verificado é marcada como **"hipótese do IBI"**, e não tem problema nenhum nisso.
- **Fora do escopo:** frete marítimo, custo de armador, desempenho de armador ou de terminal de armador (conflito de interesse: há armadores associados ao IBI).
- **Não proponha produto cujo achado seja defeito de dado de órgão público.** Lacuna de dado é oportunidade, nunca denúncia.
- O Observatório se posiciona como **sistema de antecipação**. Priorize ideias que dizem *o que vai acontecer* antes do dado oficial.

## 4. O que buscar (as sementes são exemplos, não limites)

Busque nas oito frentes abaixo. Para cada uma, **procure primeiro o que existe no mundo** e só depois pense na adaptação ao Brasil.

1. **Referências internacionais de monitoramento da logística agrícola.**
   - Exemplo a verificar: o *Grain Transportation Report* semanal do USDA/AMS.
   - Procure equivalentes em outros países exportadores de grãos (Argentina, Austrália, Canadá, Ucrânia, União Europeia).
   - Procure também bancos multilaterais e a OCDE.
   - Pergunta: o que eles medem que ninguém mede no Brasil?
2. **Dados alternativos e tempo real.**
   - Satélite: colheita, estoques a céu aberto, filas de caminhões, nível de rios.
   - Rastreamento: AIS de barcaças e comboios na navegação interior.
   - Documentos fiscais e de transporte eletrônicos: CT-e, MDF-e, DT-e (o que é público ou agregado?).
   - Estradas: pedágio *free flow*, balanças.
   - Portos: agendamento de caminhões.
   - Mercado: plataformas de frete, consumo de diesel por região.
3. **Novos indicadores e índices.** Exemplos:
   - custo logístico total por tonelada, "da porteira ao porão";
   - índice de resiliência de corredores;
   - "custo de não fazer" de uma obra;
   - índice de concentração modal;
   - exposição climática da logística;
   - pegada de carbono do escoamento por rota.
4. **Métodos.**
   - Modelos de rede e de otimização de fluxos (quem migra de corredor quando uma obra fica pronta?).
   - Modelos gravitacionais.
   - Gêmeo digital de um corredor.
   - Avaliação ex post de obras já entregues (o que a obra X mudou no custo?).
   - Nowcasting da safra.
   - Cenários climáticos.
5. **Priorização de obras e incidência.**
   - Como outros países priorizam investimento em logística agrícola (carteiras, rankings, agências independentes).
   - Como think tanks transformam evidência em orçamento.
   - Que produto de dado faz um parlamentar agir.
6. **Produtos e formatos.** Alertas, simuladores ("e se esta ferrovia ficar pronta?"), calculadora de frete para o produtor, dados abertos via API, relatórios por município para as federações, conteúdo para a imprensa regional.
7. **Parcerias além da CNA.** Quem mais tem dado ou interesse: cooperativas, tradings, bolsas, universidades, agências reguladoras, bancos de fomento, organismos internacionais. Qual parceria destrava um dado que hoje é fechado?
8. **Lacunas do debate brasileiro.** Que perguntas sobre logística do agro ninguém responde hoje com dado recorrente? Olhe imprensa especializada, audiências públicas e estudos acadêmicos recentes.

## 5. Processo

**Fase 1 — Varredura ampla.** Levante **pelo menos 40 ideias brutas** cobrindo as oito frentes. Nesta fase, quantidade importa mais que filtro. Registre cada uma com uma frase e o link do precedente, se houver.

**Fase 2 — Ficha e filtro.** Para as **15 mais promissoras**, preencha uma ficha:
- **Nome e descrição** (2 linhas).
- **Precedente:** onde já existe no mundo (link + trecho), ou "hipótese do IBI".
- **Dado necessário:** fonte, se é aberta, paga ou exige parceria, e se o acesso foi **testado** (chamada real, download). Não basta dizer que "existe".
- **Pergunta que responde** e **para quem** (produtor, CNA, Executivo, Congresso, imprensa).
- **Antecipa ou só mede?**
- **Esforço** (P/M/G) e **tempo até um primeiro resultado**.
- **Risco:** político, de dado ou de conflito de interesse.

Dê notas de 1 a 5 em cinco critérios: **ineditismo no Brasil · factibilidade com dado acessível · valor para a parceria com a CNA · valor para a incidência junto ao Executivo e ao Parlamento · capacidade de antecipação**.

**Fase 3 — Confronto com o que já existe.** Só agora leia a memória técnica e o repositório `hidrovia-dashboard` (IEE, Monitor Hidrológico, Custo de Espera, Arco Norte, PortGDP). Marque cada ideia da ficha como:
- **nova**;
- **extensão** de algo existente;
- **já temos**.

Descarte as "já temos".

**Fase 4 — Revisão adversarial.** Releia a lista final como um cético: um economista do ESALQ-LOG, um técnico do Ministério dos Transportes e um editor de jornal de agro. Aponte o que cada um derrubaria e ajuste as notas.

## 6. Entrega

Grave em `docs/parceria-cna/ideias-novas.md`:

1. **Resumo em 10 linhas:** as 5 melhores ideias e por quê.
2. **Tabela-ranking das 15 fichas**, com as notas e a marcação nova/extensão.
3. **As fichas completas.**
4. **Lista bruta** das 40+ ideias, com os links.
5. **Três "apostas ousadas"**: ideias de alto risco e alto impacto que valem um piloto, mesmo sem precedente.
6. Uma coluna **"aprovada?"** vazia, para o Bruno marcar. Só as aprovadas seguem para o prompt do estudo com a CNA.

Não altere código. Não publique nada. É uma entrega de pesquisa.
