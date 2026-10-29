# Fase 0 — Inventário e viabilidade de dados
## Custo do calado perdido em Santos (IBI × NORA)

**Data dos testes:** 30/09/2026. Nenhuma estimativa foi rodada.
Cada linha diz se o acesso foi **testado de fato** ou está **não conferido**.
Amostras brutas: scratchpad da sessão, em `fase0/`. Ainda não foram copiadas para o repo.

---

## 1. Resumo para a call

1. **Não há fonte pública com o calado real de cada navio e com histórico.** A ANTAQ
   não tem campo de calado. A APS publica calado e IMO por navio só na lista do dia
   ("navios esperados"). O calado de entrada e de saída que o agente informa na
   nomeação (NAP SUPOP.OPR.021.2026, art. 36) **existe na APS, mas não é publicado.**
   Esse é o dado a pedir.
2. **Dá para começar sem esse dado.** A ANTAQ traz IMO (~99% preenchido em Santos),
   peso por atracação, berço e tempos, de 2010 a fev/2026. Com o DWT de cada IMO, dá
   para medir o **fator de carga (t embarcadas / DWT) do mesmo navio em Santos e em
   portos mais fundos**. É uma comparação dentro do navio, com efeito fixo de navio.
   Não depende de AIS.
3. **O calado máximo autorizado tem histórico reconstruível.** A tabela da APS está na
   Rev. 271, de 30/04/2026, e o Wayback Machine tem 21 capturas de jan/2021 a jun/2026.
   Exemplo: o Trecho IV estava em 12,70/13,70 m em jan/2021 e hoje está em 13,50/14,50 m.
   Isso permite um event study em torno de cada mudança.
4. **A monetização é viável com dado aberto.** O Comex Stat (URF 0817800) e o USDA
   GTR trazem frete de soja Santos→China/Hamburgo trimestral de 2005 a 2025. Os índices
   Baltic e Clarksons são pagos.

**Caminho crítico:** conseguir os dados de nomeação da APS (calado de entrada e de
saída por navio) e o DWT/TPC por IMO. Todo o resto já está acessível.

---

## 2. Tabela de fontes

| # | Fonte | Variáveis relevantes | Granularidade / período | Acesso | Testado? | Bloqueio |
|---|---|---|---|---|---|---|
| 1 | **ANTAQ EA — cópia local em parquet** (`C:\Dev\Github\ANTAQ\parquet\`) | IDAtracacao, **Nº IMO**, berço, terminal, datas (chegada → desatracação), tipo de operação e navegação; carga (SH2/SH4, natureza, sentido, TEU, peso bruto); tempos (espera p/ atracar, operação, estadia); paralisações | Atracação × carga, 2010 → 28/02/2026. Santos: 81.241 atracações; 2025: 5.078, das quais 5.037 com IMO | Local | **Sim** | **Sem calado.** O download público está fora do ar (redireciona para a página "painel indisponível", que dá 404). Sem mar/2026 em diante até a ANTAQ voltar. O cruzamento com paralisações de Santos 2025 veio vazio (investigar). |
| 2 | **APS — Navios esperados/carga** | Navio, bandeira, comprimento, **calado**, chegada, agência, operação, mercadoria, peso, DUV, terminal, **IMO** | Só o dia (293 navios em 30/09) | Pública | **Sim** | Sem histórico no site. Wayback não conferido. **Não se sabe se o calado é o de chegada, o de saída ou o máximo** (confirmar com a APS). Nosso scraper (`scripts/lineup/santos.ts`) lê essa página, mas **não guarda calado nem IMO** e está em estado "indisponível" desde 01/07/2026 ("fetch failed"). |
| 3 | **APS — Fundeados** | Comprimento, calado | Só o dia | Pública | Sim | Lista com linhas de 2024 (aparentemente desatualizada). |
| 4 | **APS — Atracações programadas / Atracados** | Navio, IMO, carga, evento, DUV | Só o dia | Pública | Sim | Não traz calado. Não existe página de despachados. |
| 5 | **APS — Calados operacionais dos berços** | Por berço: profundidade de projeto, calado na baixa-mar e na preamar, trecho, levantamento hidrográfico. Por trecho do canal: calado máximo, regra de preamar (maré ≥1,00 m), limites por DWT | Rev. 271 (30/04/2026); Wayback com 21 capturas de 2021 a 2026 | Pública | **Sim** | Histórico anterior a 2021 e meses sem captura: pedir o arquivo de revisões à APS. |
| 6 | **APS — Dados de nomeação** (calado de entrada e de saída, art. 36 da NAP OPR.021.2026) | Calado declarado na chegada e na saída, por escala | Escala; período a pedir | **Pedido (LAI ou convênio)** | Não publicado | **Dado indispensável.** Ver o pedido na seção 4. |
| 7 | **Praticagem SP** (`sppilots.com.br`) | Condições de manobra (folga sob a quilha, NBR 13246/PIANC) | — | Pública; área restrita com login | Sim (parcial) | Sem tabela nem histórico de janelas de maré. A área com login não foi acessada. **Via NORA** (leitura dos atores). |
| 8 | **Capitania SP — NPCP** (Portaria CPSP 113/2026 e edição de 2016) | Metodologia do calado máximo recomendado (fator de segurança, squat, ondas). Remete à APS para os valores | Norma | Pública (PDF) | **Sim** | — |
| 9 | **CHM — Tábua de marés de Santos** | Preamar/baixa-mar | Horária/diária | Pública | Não conferido | Necessária para ligar cada escala à janela de maré. |
| 10 | **AIS com calado declarado** | Draught por IMO e posição | Minutos; histórico variável | GFW: token não comercial. Spire/Datalastic: pago. UN Global Platform: comunidade estatística | Endpoints responderam 401/403 | Draught no GFW não conferido. Preço do Spire não publicado (terceiros falam em US$ 2–8 mil/mês, não conferido). AISHub exige estação própria. |
| 11 | **Características do navio** (DWT, calado de projeto, TPC) | Por IMO | — | Equasis: cadastro gratuito, sem download em massa. Sea-web/Clarksons: pagos | Não (exige cadastro) | **Sem tabela pública confiável de TPC por classe.** Alternativa: TPC ≈ área do plano de flutuação × densidade da água, estimada por classe a partir de comprimento e boca. |
| 12 | **Comex Stat** (API) | Exportação/importação por **URF 0817800 – Porto de Santos** × NCM × mês × via: kg e US$ FOB | Mensal, 1997 → hoje | Pública | **Sim**. Soja 2024: 27,96 Mt e US$ 12,05 bi FOB | Limita consultas seguidas (HTTP 429, esperar ~10 s). |
| 13 | **USDA GTR** (Socrata `j6ns-hzra`, `xtb3-iudz`) | Frete marítimo de soja US$/t: Santos, Paranaguá, Rio Grande, São Luís, Santarém, Barcarena → Xangai/Hamburgo; custo total MT→Santos→China | Trimestral, 2005Q1–2025Q3 | Pública | **Sim** | Não separa por classe de navio. |
| 14 | **Baltic Exchange / Clarksons SIN / UNCTAD RMT** | Frete e afretamento por classe (BPI, BSI…) | Diário | Pago | 403 / anti-bot | Necessário para a curva de escala (custo/t × DWT). |
| 15 | **Calado de portos concorrentes** | Paranaguá 13,30 m (APPA); Rio Grande 14,20 m (Portos RS, normativa 259); Itaqui e Vila do Conde não localizados | Estado atual | Pública | Parcial | Faltam os históricos. Os 12,2/12,8 m de Vila do Conde não foram conferidos. |

---

## 3. Classificação

### Indispensável
| Dado | Quem detém | Como obter |
|---|---|---|
| Calado de chegada e de saída por escala (nomeação) | **APS** (SUPOP/DIOPE) | Pedido LAI ou convênio (texto abaixo) |
| DWT e calado de projeto por IMO (e TPC, se houver) | Registros de classe / IHS / Clarksons; Equasis parcial | Equasis manual para a amostra de IMOs de Santos (~alguns milhares). Se não bastar, cotar Clarksons/S&P. **Pergunta ao NORA: algum parceiro tem licença?** |
| Atracações com IMO, peso e tempos | ANTAQ | ✅ Já temos (parquet local até fev/2026) |
| Histórico do calado máximo autorizado por trecho e berço | APS | ✅ Wayback 2021–2026. O restante vai no mesmo pedido à APS |
| Tábua de marés | Marinha/CHM | Pública, falta baixar |

### Desejável
- AIS com draught (para validar o calado declarado na nomeação e cobrir os portos
  concorrentes). Opções: GFW com token não comercial ou cotação Spire/Datalastic.
- Frete por classe de navio (Baltic/Clarksons) para a curva de escala. Sem ele, usar o
  USDA GTR, que é agregado.
- Históricos de calado de Paranaguá, Rio Grande e Itaqui (para o contrafactual de desvio).
- Registros de espera por janela de maré (Praticagem, via NORA).

### Dispensável
- NOAA MarineCadastre (só EUA), AISHub (exige estação), UNCTAD RMT (contexto apenas).

---

## 4. Pedido à APS (texto pronto — LAI ou ofício)

> Com fundamento na Lei nº 12.527/2011, solicito à Autoridade Portuária de Santos,
> em formato aberto (CSV ou XLSX), para o período de **01/01/2015 até a data mais
> recente disponível**, a relação de todas as escalas de navios no Porto Organizado de
> Santos, contendo, para cada escala: (i) nome do navio e número IMO; (ii) número da
> DUV; (iii) berço/terminal; (iv) datas e horas de chegada à barra, atracação,
> desatracação e saída da barra; (v) **calado de entrada e calado de saída informados
> na nomeação**, conforme o art. 36 da NAP SUPOP.OPR.021.2026 e as normas anteriores
> equivalentes; (vi) calado efetivamente praticado na manobra de saída, se registrado;
> (vii) DWT e comprimento declarados; (viii) mercadoria e peso movimentado.
> Solicito também o histórico completo das revisões da tabela "Calados Operacionais
> dos Berços de Atracação e do Canal de Navegação", com a data de vigência de cada
> revisão. Esses dados não contêm informação pessoal nem sigilo comercial por item,
> pois se referem a parâmetros operacionais de navios. Se houver partes restritas,
> solicito o fornecimento do restante, nos termos do art. 7º, §2º, da LAI.

**Duas vias em paralelo:** (a) LAI pelo Fala.BR, com prazo legal de 20 + 10 dias;
(b) ofício IBI+NORA à Diretoria de Operações da APS propondo cooperação técnica. A
concessão do canal pode motivar a própria APS.

---

## 5. Estratégia que o inventário viabiliza (ajuste à Fase 1)

- **Plano A, com o dado de nomeação da APS:** bunching do calado de saída abaixo do
  calado máximo autorizado, como previsto no PROMPT.
- **Plano B, só com dado aberto, e pode começar já:** fator de carga por IMO.
  - Fator de carga = peso embarcado (ANTAQ) ÷ DWT (Equasis), no mesmo navio.
  - Comparação dentro do navio: Santos × portos mais fundos em que o navio também
    carregou, com efeito fixo de IMO, controle de mês e produto, e as escalas de
    complementação de carga em outro porto somadas por viagem.
  - Event study nas mudanças de calado do canal reconstruídas pelo Wayback.
  - O resultado é um limite inferior da carga não embarcada.
- **Coleta prospectiva, para o indicador permanente:** gravar diariamente, a partir de
  agora, o calado e o IMO da lista "navios esperados". Depende de consertar o
  `scripts/lineup/santos.ts`, que falha desde 01/07.

---

## 6. Cronograma (a partir do dado mais lento)

| Semana | Entrega |
|---|---|
| S0 (esta) | Call IBI×NORA. Protocolar a LAI e o ofício à APS. Pedir token GFW e cadastro Equasis. |
| S1–S2 | Reconstruir o histórico de calado (Wayback). Montar a base ANTAQ Santos + portos comparáveis. Casar IMO com DWT. Reativar o scraper com calado. |
| S3 | Pré-registro da metodologia com hash (Plano B, e Plano A condicionado à chegada dos dados). |
| S3–S5 | Estimativas do Plano B e monetização (Comex Stat + GTR). |
| S5–S7 | Resposta da APS (prazo legal de até 30 dias) e estimativas do Plano A. |
| S8 | Nota técnica conjunta e proposta de indicador permanente. |

---

## 7. Base compartilhada com o estudo 01 (custo regulatório do tempo da carga)

Servem aos dois estudos sem retrabalho:
- ANTAQ TemposAtracacao (espera para atracar, operação, estadia) e TemposAtracacaoParalisacao.
- A escala com IMO e DUV pedida à APS, que traz os horários de barra → atracação → saída.
- A coleta diária do line-up da APS.
- O casamento IMO → DWT/classe, que serve para valorar o navio-dia por classe.

---

## 8. Pendências não conferidas
- Qual calado a lista "navios esperados" da APS mostra (chegada, saída ou máximo).
- Se há capturas históricas dessa lista no Wayback.
- Se o GFW traz o campo draught.
- Por que o cruzamento de paralisações com atracações de Santos 2025 veio vazio.
- Calado máximo de Itaqui e de Vila do Conde.
