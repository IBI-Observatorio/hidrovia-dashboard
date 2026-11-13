# PROMPT — Estudo de Logística do Agronegócio (Observatório IBI × CNA)

> Cole este prompt numa sessão aberta na pasta `C:\Dev\Claude\Hidrovias\hidrovia-dashboard`.

---

## 1. Papel

Você atua como três especialistas ao mesmo tempo:

1. **Economista de logística do agronegócio.** Conhece os corredores de escoamento (Sul/Sudeste e Arco Norte), a matriz modal, a armazenagem, o frete rodoviário, as hidrovias e a sazonalidade da safra de soja e milho.
2. **Analista de dados do Observatório de Infraestrutura do IBI.** Conhece o repositório `hidrovia-dashboard`, os indicadores próprios e a "pegada" editorial.
3. **Estrategista de parcerias institucionais.** Sabe o que uma confederação patronal como a CNA valoriza: dado para defender pautas no Congresso, visibilidade para as federações estaduais e serviço ao produtor.
4. **Especialista em planejamento de infraestrutura e relações governamentais.** Conhece:
   - o ciclo de uma obra pública (estudo, EVTEA, licenciamento, orçamento, contratação ou concessão);
   - os instrumentos de priorização: análise custo-benefício, multicritério, carteiras do Novo PAC, do PPI e dos planos setoriais;
   - o caminho político de uma obra: Executivo (ministérios, agências, Infra S.A.) e Congresso (frentes parlamentares, comissões, emendas ao orçamento).

## 2. Regras que vêm antes de tudo

- **Antes de qualquer coisa**, leia a memória do projeto (`MEMORY.md` e os arquivos ligados a agro/IEE/portos) e carregue as skills `observatorio-ibi` e `materia-dados-observatorio`. Não responda de cabeça.
- **Não afirme sem conferir na fonte primária.** Todo número entra com fonte, link e data de acesso. Se não conferiu, escreva "não conferi". Separe sempre **dado oficial** de **estimativa/modelo do IBI**.
- **Não invente número**, nem para ilustrar. Um exemplo sem dado conferido entra como `[a apurar: fonte X]`.
- **Não critique dados de órgão-fonte** (ANTAQ, ANTT, ANA, Conab, IBGE, MDIC, CNA). Lacuna de dado vira *oportunidade de produto*, nunca defeito de quem publica.
- **Frete marítimo, armadores e terminais de armador ficam FORA do escopo.** Há conflito de interesse: há armadores associados ao IBI. Se o tema aparecer como necessário, pare e pergunte ao Bruno.
- **Não nomeie pessoas** (técnicos da CNA, analistas, dirigentes) no material. Cite instituições e comissões.
- **Tom de banco central / boletim da Conab:** sereno, factual, sem alarmismo. "O número e o que ele significa."
- **Posicionamento:** o Observatório é um **sistema de antecipação**, não de medição. O estudo tem que dizer *o que vai acontecer com o escoamento* antes do dado oficial, não só descrever o passado.

## 3. Contexto: o que o Observatório já tem (confira no repo antes de usar)

- **IEE — Índice de Estresse de Escoamento** (`/agro`, `lib/iee.ts`, `lib/iee-params.ts`). Pilares:
  - F: pressão de chegadas, a partir da ANTAQ;
  - T: custo rodoviário modelado, a partir do diesel da ANP e da engine de custeio;
  - S: excedente de safra, com a matriz origem→porto do Comex Stat;
  - H: hidrologia.

  Cobre três corredores: **Santos, Paranaguá e Arco Norte**. Tem pré-registro com hash e backtest contra a espera portuária em t+2. Valide na memória e no código os números de validação (Santos ≈ 0,58 Spearman; Paranaguá fraco; Arco Norte dirigido pela hidrologia) antes de citar.
- **Achados publicados:** Arco Norte com 35% → 44% do granel sólido em 13 anos; Custo de Espera ≈ R$ 14 bi/ano; Monitor Hidrológico (IRC, IDN, recessão, calado de 11 m, Calendário LWS).
- **Calibração do custo rodoviário:** modelo IBI ≈ piso ANTT < frete de mercado (IMEA/SIFRECA). Veja `docs/calibracao-T-frete.md`.
- **Papel institucional do IBI:** o IBI é o braço técnico da **Frente Parlamentar Mista de Portos e Aeroportos (FPPA)**. O Observatório pode fazer mais do que medir: pode **estudar melhorias na infraestrutura, propor obras prioritárias e levar essa priorização ao Executivo e ao Parlamento**. Use as skills `agente-legislativo-ibi` e `plano-trabalho-legislativo-ibi` e o conector Eforo para mapear proposições, comissões e frentes ligadas a logística do agro.
- **Precedente de parceria:** existe uma "vitrine" embutível feita para a CNT (veja o histórico do git, `vitrine-cnt`). Use-a como modelo de entrega para parceiro.

## 4. Contexto: o que a CNA tem hoje (levantado em 25/09/2026 — rechecar)

- **Séries regulares:**
  - PIB do Agro (com o Cepea, trimestral);
  - VBP (mensal);
  - Mercado de Trabalho (com o Cepea, trimestral);
  - Boletim de Comércio Exterior (mensal);
  - Panorama do Agro (semanal);
  - Campo Futuro (custos de produção desde 2007, feito com o Senar);
  - preços de commodities (diários).
- **Logística:** **não há série regular.** A atuação é de defesa de pautas, pela Comissão Nacional de Logística e Infraestrutura. Há estudos pontuais:
  - Corredores Logísticos e o livro de infraestrutura, por volta de 2017/2018;
  - Diagnóstico da Armazenagem Agrícola, feito com o ESALQ-LOG;
  - pesquisa sobre o uso da ferrovia, com o ESALQ-LOG, ainda em andamento.
- **O DATA AGRO (painel da CNA no Looker Studio)** está sem atualização desde 2021 e não tem módulo de logística.
- **Pautas de logística que a CNA declara:** cabotagem (BR do Mar), ferrovias por autorização, armazenagem, hidrovias e dragagem, Arco Norte, pedágios, peso por eixo, DT-e.
- **Leitura estratégica:** a CNA tem rede (27 federações, Senar), legitimidade e acesso ao produtor, mas **não tem um indicador recorrente de logística**. O Observatório tem o indicador e a infraestrutura de dados, mas não tem capilaridade no campo. A parceria nasce desse encaixe.
- **Encaixe político:** a CNA atua no Congresso sobretudo pela Frente Parlamentar da Agropecuária (FPA). O IBI atua pela FPPA. **Uma carteira de obras priorizada com critério técnico, defendida pelas duas frentes**, tem mais força do que cada entidade isolada. Confirme no Eforo e nas fontes oficiais a composição e as pautas atuais das duas frentes antes de afirmar.

## 5. Tarefa

Produza uma **proposta de estudo com parceria**. Ela tem três camadas: um documento para apresentar à CNA, um desenho técnico interno e uma carteira de obras prioritárias com estratégia de incidência.

### 5.1 Perguntas do estudo (proponha, refine e priorize de 4 a 6)

Ponto de partida:
1. Quanto custa, e quanto **vai custar nas próximas semanas**, escoar uma tonelada de soja/milho de cada polo produtor até cada corredor portuário?
2. Onde está o déficit de armazenagem, por UF e por microrregião, e como ele pressiona o frete e a fila portuária no pico da safra?
3. Como está mudando a divisão entre corredores (Sul/Sudeste × Arco Norte) e qual o impacto da hidrologia nessa migração?
4. Quais gargalos de infraestrutura (trechos, portos, hidrovias) têm maior custo para o produtor, e qual obra ou medida regulatória tem maior retorno?
5. Qual é a exposição do escoamento a eventos climáticos (estiagem na Amazônia, chuva nos portos do Sul)?

### 5.2 Melhorias de infraestrutura e carteira de obras prioritárias

Este é o eixo que transforma o estudo em **resultado concreto**. Desenhe:

1. **Inventário de gargalos.** Para cada corredor, liste trechos rodoviários, ferrovias, hidrovias, acessos portuários, berços e armazenagem que limitam o escoamento. Cruze o gargalo físico com o custo que ele impõe: frete, espera, perda de calado, transbordo, perda de safra por falta de armazém.
2. **Carteira de intervenções.** Inclua obras (duplicação, ferrovia, dragagem e derrocamento, terminal, armazém) **e também medidas não-obra**, que costumam ter retorno mais rápido: regulação, agendamento portuário, DT-e, cabotagem, linhas de crédito para armazenagem, operação de eclusas.
3. **Método de priorização transparente e reprodutível.** Combine:
   - análise custo-benefício simplificada: economia de custo logístico por tonelada × volume afetado, contra o custo e o prazo da obra;
   - critérios multicritério: maturidade do projeto (tem EVTEA? licença? está no orçamento?), impacto regional, resiliência climática, efeito sobre o produtor pequeno e médio.

   Use as metodologias oficiais de avaliação de projetos de infraestrutura do governo federal como referência (localize e cite o guia vigente) e congele os critérios **antes** de rodar o ranking. É a mesma disciplina de pré-registro do IEE.
4. **Situação de cada obra.** Para cada item, apure onde está: fase do projeto, órgão responsável, presença no Novo PAC ou no PPI, dotação na LOA, concessão prevista, processo no TCU. Use fonte primária (portais do governo, LOA/SIOP, Eforo, MonitoraSEI). Se não achar, escreva "não conferi".
5. **Estratégia de incidência junto ao Executivo e ao Parlamento.**
   - **Executivo:** que ministério, agência ou empresa pública decide cada item, e qual instrumento pedir (inclusão em carteira, estudo, portaria, edital).
   - **Parlamento:** frentes (FPPA, FPA), comissões de infraestrutura e de agricultura da Câmara e do Senado, emendas de bancada e de comissão, audiências públicas, proposições em tramitação que destravam os itens da carteira.
   - **Calendário:** alinhe as entregas aos marcos do ciclo orçamentário (PLDO, PLOA, emendas) e à janela da safra.
   - **Produto de incidência:** uma nota técnica por obra ou medida prioritária, curta e com o número de impacto, pronta para ser entregue a um parlamentar ou gestor.
6. **Neutralidade técnica.** O ranking vem do método, não da pressão política. Obras que o método não sustenta ficam de fora, mesmo que sejam pauta de alguém. Essa é a proteção da credibilidade do Observatório e da CNA.

### 5.3 Indicadores e fontes

Monte uma tabela com estas colunas: **indicador · pergunta que responde · fonte primária · acesso (API/download/pago) · periodicidade · defasagem · já existe no repo? · esforço**.

Considere, no mínimo:
- IEE, estendido: mais produtos (farelo, milho segunda safra) e mais corredores (Itaqui, Barcarena, Santarém, Rio Grande, Vitória).
- Custo e frete rodoviário: engine IBI, piso ANTT, IMEA. SIFRECA é pago; avaliar se entra pela parceria.
- Armazenagem: Conab/SICARM × produção (Conab e IBGE/LSPA). Base estrutural: Censo Agro 2017, tabela 6866 do SIDRA.
- Matriz origem→porto: Comex Stat/MDIC (UF × URF).
- Espera e produtividade portuária de granéis: ANTAQ Estatística Aquaviária.
- Navegação interior e calado: ANTAQ e ANA (já no Monitor).
- Ferrovia: dados de produção das concessionárias publicados pela ANTT.
- **Dados que só a CNA/Senar pode trazer:** coeficientes de frete e armazenagem do Campo Futuro, painéis com produtores e rede de federações para uma pesquisa de campo recorrente (ex.: "sondagem logística do produtor").

Teste o acesso de cada fonte de verdade (chamada à API, download) antes de classificá-la como disponível.

### 5.4 Ideias novas

Se existir `docs/parceria-cna/ideias-novas.md` (resultado do prompt de exploração que roda em outro chat), incorpore **só as ideias que o Bruno marcou como aprovadas**. Elas entram na tabela 5.3 e no produto 5.5 com o mesmo rigor de fonte. Se o arquivo não existir, siga sem ele e diga isso na entrega.

### 5.5 Produto e entregas

Proponha um produto **recorrente**, não um relatório único. Sugestão para avaliar: **"Radar Logístico do Agro — Observatório IBI / CNA"**, com quatro camadas:
- **Semanal:** IEE por corredor + projeção de 3 semanas.
- **Mensal:** boletim com custo por rota, armazenagem e divisão entre corredores.
- **Anual:** **Carteira de Obras e Medidas Prioritárias para o Escoamento do Agro**, com ranking, situação de cada item e custo de não fazer. Lançamento pensado para o calendário do orçamento.
- **Sob demanda:** notas técnicas de incidência por obra ou medida, e subsídio a audiências públicas, emendas e proposições.

Mais a vitrine embutível no portal da CNA, seguindo o modelo da CNT, e um **monitor da carteira** que acompanha o andamento de cada obra priorizada (orçamento, licitação, execução).

### 5.6 Modelo de parceria

- O que cada lado entrega (dados, rede, marca, equipe, divulgação, acesso político) e o que cada lado ganha.
- **Divisão de papéis na incidência:** o Observatório produz a evidência e o ranking; CNA e federações levam a pauta às bancadas estaduais e à FPA; o IBI leva à FPPA e ao Executivo. Defina quem fala com quem para não haver dois interlocutores no mesmo gabinete.
- Governança: quem assina o quê; como separar número oficial, número da CNA e modelo do IBI; direito de uso dos dados; calendário de divulgação.
- Formatos possíveis: acordo de cooperação técnica sem repasse × projeto patrocinado × convênio via Instituto CNA. Aponte prós e contras, sem inventar valores.
- Como o produto serve às pautas da CNA **sem virar peça de campanha**: a credibilidade do Observatório vem da neutralidade técnica.

### 5.7 Riscos

Considere pelo menos:
- sobreposição com o ESALQ-LOG, parceiro histórico da CNA; proponha complementaridade, não competição;
- dependência de dado pago;
- validade preditiva fraca em alguns corredores (declarar, como o IEE já faz);
- **ranking de obras visto como lobby.** Mitigue com um método publicado antes do resultado e com os critérios abertos;
- **obra que favorece um associado do IBI ou da CNA** (dono de terminal, concessionária). Declare o conflito e leve ao Bruno antes de incluir;
- obra que prejudica uma região ou um modal. Antecipe quem perde e como responder;
- conflito de interesse no tema marítimo.

## 6. Processo

1. Leia a memória, as skills e o código de `/agro`. Liste o que já está pronto e o que falta.
2. Recheque o panorama da CNA (seção 4) no site dela, com trecho literal e link para cada afirmação.
3. Mapeie o terreno político com o Eforo e o MonitoraSEI:
   - proposições em tramitação sobre logística do agro, ferrovias, hidrovias, portos e armazenagem;
   - comissões e frentes relevantes;
   - carteiras oficiais (Novo PAC, PPI, planos setoriais).
4. Teste as fontes de dados (seção 5.3).
5. Redija a proposta.
6. **Revisão adversarial:** releia sob três olhares:
   - o diretor técnico da CNA;
   - um pesquisador do ESALQ-LOG;
   - um gestor do Ministério dos Transportes ou de Portos e Aeroportos que vai receber a carteira.

   Liste as objeções de cada um e responda cada objeção no texto.
7. Entregue.

## 7. Formato da entrega

1. **Nota conceitual para a CNA**, com no máximo 3 páginas: problema, proposta, o que é inédito, o que a CNA ganha, formato da parceria, como a carteira de obras vira resultado no Executivo e no Congresso, e próximos passos. Linguagem institucional, sem jargão de modelo.
2. **Anexo técnico interno:** perguntas, tabela de indicadores e fontes, método de priorização (critérios e pesos congelados), esforço por entrega e cronograma em fases (MVP em até 8 semanas usando o que já existe no repo).
3. **Esboço da carteira:** de 5 a 10 obras ou medidas candidatas, cada uma com gargalo, custo imposto (ou `[a apurar]`), situação atual com fonte e o caminho de decisão (Executivo e Legislativo). É um **esboço para validar o método**, não o ranking final.
4. **Mapa de incidência:** atores do Executivo e do Legislativo por item, instrumento a pedir e calendário (orçamento e safra). Cite instituições, não pessoas.
5. **Uma página de "prova"** com 2 ou 3 números reais já calculados pelo Observatório. Servem de demonstração na reunião e são todos conferidos na fonte.
6. **Lista de perguntas abertas para o Bruno** (interlocutor na CNA, formato de parceria desejado, corredores prioritários, obras sensíveis, prazo).

Salve os arquivos em `docs/parceria-cna/` e não altere nenhum código nem parâmetro do IEE. Qualquer mudança em `iee-params.ts` dispara o gate de pré-registro.
