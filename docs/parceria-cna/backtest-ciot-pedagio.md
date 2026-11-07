# Backtest: CIOT e pedágio antecipam a exportação do Arco Norte?

> Rodado em 25/09/2026. Serve às fichas F1 (Radar CIOT) e F2 (contador de carretas) de `ideias-novas.md`.
> Scripts e resultado bruto estão em `backtest-ciot-pedagio/`.
> Ordem de execução: `baixa.py`, que só usa a parte do CIOT; `baixa_ped.py`, que substitui a parte do pedágio de `baixa.py`; `comex.py`; `backtest.py`; `robustez.py`.
> Não altera código do dashboard.

## Veredito

| Sinal | Antecipa? | Evidência |
|---|---|---|
| **CIOT soja + milho com destino Itaituba (Miritituba)** | **Sim, cerca de 1 mês.** | Prevê a exportação de Santarém + Belém do mês seguinte com erro 28% menor que o modelo sem ele (36% menor que o ingênuo). Diebold-Mariano p = 0,03. Ganho em todos os anos de 2023 a 2026. |
| **CIOT com destino em todos os transbordos do Arco Norte** | **Sim, cerca de 1 mês.** | Erro 28% menor no Arco Norte agregado. Diebold-Mariano p = 0,03. |
| CIOT com destino Porto Velho | Não. | Correlação existe (0,64 com 1 mês de defasagem), mas não melhora a previsão fora da amostra (razão 1,05). |
| **Pedágio de pesados na BR-163/MT (CRO/Nova Rota do Oeste, 2015–2026)** | **Não.** | Correlação fraca (0,37 em variação anual, sem defasagem) e piora a previsão (razão 1,08). |
| Pedágio da Via Brasil (BR-163/PA) e da praça de Trairão | Não, e a amostra é curta. | Só 30 meses de dado; fora da amostra é pior que o modelo sem ele e que o ingênuo. |

**Na prática:** o CIOT de agosto sai por volta do dia 10 de setembro. O Comex de setembro sai no começo de outubro. **O CIOT dá cerca de 3 semanas de vantagem real sobre o dado oficial**, e essa vantagem se confirma fora da amostra. O pedágio não dá: sai quase junto com o Comex e não acrescenta informação.

## Desenho (fixado antes de rodar)

- **Alvo (Comex Stat).** Exportação mensal de soja (12019000) e milho (10059010) em toneladas, por porto de saída (URF), de 2015 a ago/2026.
  - "Norte" = Santarém + Belém (Barcarena), portos que recebem as barcaças de Miritituba.
  - "Arco Norte" = São Luís + Belém + Santarém + Manaus + Santana.
  - "MT" = UF de origem Mato Grosso, qualquer porto.
- **Sinais**
  - **CIOT:** número de contratos com NCM 1201/1005 por município de destino. Pares testados:
    - Itaituba → Norte.
    - Porto Velho → Manaus + Santarém.
    - Transbordos do Arco Norte (Itaituba, Porto Velho, São Luís, Barcarena, Santarém, Porto Nacional, Palmeirante, Porto Franco) → Arco Norte.
  - **Pedágio:** veículos comerciais com 5 eixos ou mais, somando as praças da CRO/Nova Rota do Oeste (BR-163/MT, set/2015 em diante) e da Via Brasil (BR-163/PA, fev/2023 em diante, também Trairão sozinha).
- **Métrica.** Variação sobre o mesmo mês do ano anterior, em log, para tirar a sazonalidade da safra. A correlação em nível, que é inflada pela sazonalidade, está no JSON só como referência.
- **Teste fora da amostra.** Janela expansiva. Em cada mês t, com o que já está publicado (exportação de t e sinal de t), prevê-se a variação anual da exportação em t+1 e t+2. São comparados três modelos:
  - modelo-base, que usa só a variação anual da exportação;
  - modelo com o sinal;
  - ingênuo (a variação anual se repete).
- **Janelas.** CIOT: treino desde 2020, avaliação fora da amostra de jan/2023 a abr/2026, 39 meses. Pedágio da CRO: avaliação de jan/2019 a jul/2026, 90 meses.

## Resultados (h = previsão com 1 ou 2 meses de antecedência)

| Par | r variação anual, def. 0 | def. 1 | def. 2 | h=1: erro com sinal ÷ base | h=1: ÷ ingênuo | h=2: ÷ base |
|---|---|---|---|---|---|---|
| CIOT Itaituba → Norte | 0,72 | **0,87** | 0,59 | **0,72** | **0,64** | 0,93 |
| CIOT transbordos → Arco Norte | 0,82 | **0,84** | 0,58 | **0,72** | **0,65** | 0,94 |
| CIOT Porto Velho → Manaus + Santarém | 0,48 | 0,64 | 0,56 | 1,05 | 1,01 | 0,93 |
| Pedágio CRO → exportação MT | 0,37 | 0,29 | 0,03 | 1,08 | 1,00 | 1,12 |
| Pedágio CRO → Arco Norte | 0,31 | 0,15 | −0,01 | 1,01 | 0,90 | 1,11 |
| Pedágio Via Brasil → Norte | 0,35 | 0,21 | −0,12 | 1,16 | 1,34 | 0,89 |

- **Razão de erro:** menor que 1 quer dizer que o sinal ajuda.
- **Pico de correlação:** no CIOT de Itaituba ocorre com 1 mês de defasagem (0,87 contra 0,72 sem defasagem). É a assinatura física da carga: caminhão, depois barcaça, depois navio.
- **Resolução:** as séries são mensais, então as defasagens "0 a 8 semanas" do plano viraram 0, 1 e 2 meses. O pedágio diário existe, mas o alvo (Comex) é mensal.
- **Modelo estimado:** variação anual da exportação Norte em t+1 ≈ **0,64 × variação anual do CIOT Itaituba em t**. O coeficiente da própria exportação é cerca de 0.

**Robustez do CIOT Itaituba → Norte (razão de erro por ano, fora da amostra):**

| Ano | Razão de erro |
|---|---|
| 2023 | 0,80 |
| 2024 | 0,56 |
| 2025 | 0,87 |
| 2026 (4 meses) | 0,61 |

## Ressalva: quebra de cobertura no CIOT a partir de mai/2026

- A partir de mai/2026, de 21% a 30% dos CIOTs de soja e milho vêm **sem origem e sem destino**.
- O total de CIOTs sobe cerca de 40% em relação ao ano anterior (jun–ago/2026). **Causa conferida em 27/09/2026:** desde 24/05/2026, o CIOT passou a ser obrigatório para todo transporte rodoviário remunerado, inclusive frota própria (Resolução ANTT 6.078/2026 e MP 1.343/2026; notícia da ANTT de 24/04/2026).
- A janela principal termina em abr/2026. Os contratos sem destino ficam fora dos sinais por destino, mas a expansão de cobertura pode inflar a contagem daqui para frente.
- **Solução para produção:** usar a participação de cada destino no total com destino, ou reestimar o coeficiente com a série nova quando houver 12 meses dela.

**Meses após a quebra (modelo treinado até abr/2026):**

| Informação de | Mês previsto | Previsão com CIOT | Modelo-base | Realizado |
|---|---|---|---|---|
| abr/26 | mai/26 | +18% | +13% | +33% |
| mai/26 | jun/26 | +11% | +23% | +20% |
| jun/26 | jul/26 | +3% | +15% | +18% |
| jul/26 | **ago/26** | **−10%** | +14% | **−8%** |
| ago/26 | **set/26** | **−12% (≈ 2,57 Mt)** | −2% | a sair no começo de out/2026 |

O CIOT pegou a virada de agosto, que o modelo-base não viu. **A previsão de setembro/2026 fica registrada aqui:** Santarém + Belém, soja + milho, −12% sobre set/2025, cerca de 2,57 Mt. É um teste vivo.

## O que isso muda em `ideias-novas.md`

- **F1 (Radar CIOT):** a nota de antecipação sobe de 3 para 4. Agora há evidência fora da amostra de cerca de 1 mês de antecedência, ou 3 semanas sobre a publicação oficial.
  - O produto natural é um **nowcast mensal da exportação do Arco Norte**, publicado por volta do dia 10.
  - Antes de publicar: tratar a quebra de mai/2026 e esperar o Comex de setembro.
- **F2 (pedágio):** a nota de antecipação cai de 3 para 2.
  - O pedágio não antecipa a exportação.
  - Continua útil como termômetro descritivo do corredor, por exemplo na F14 (boletim) e em "movimento na BR-163", mas **não como indicador antecedente**.
- **Não testado:** ferrovia (Rondonópolis e Palmeirante).

---

## Adendo (25/09/2026): CIOT de fertilizante contra as entregas da ANDA

**Veredito: não antecipa.** O CIOT de fertilizante não serve para prever as entregas ao mercado. O componente CIOT da ficha F5 cai.

**Por que valia testar.** A ANDA publica as entregas mensais com cerca de 2 a 3 meses de atraso: janeiro/2026 saiu em 06/04/2026 (Forbes Agro, citando a ANDA), e o xlsx de junho/2026 foi enviado ao site em set/2026. O CIOT do mês sai por volta do dia 10 do mês seguinte. Um nowcast que funcionasse daria cerca de 2 meses de vantagem.

**Desenho (fixado antes de rodar)**
- **Alvo:** entregas de fertilizantes ao mercado, total Brasil, em toneladas. Fonte: PDFs "Principais Indicadores" 2020 a 2026 em anda.org.br/recursos. Vale sempre a edição mais recente; a série vai de jan/2017 a jun/2026.
- **Sinais (CIOT com NCM 31xx)**
  - `fert_total`: todos os contratos com destino informado.
  - `fert_portos`: contratos com origem em município portuário (Paranaguá, Rio Grande, Santos, Cubatão, Guarujá, São Luís, Barcarena, São Francisco do Sul, Candeias, Vitória, Imbituba).
  - `fert_mt`: contratos com destino MT.
- **Nowcast no dia 10 de t+1, com o que já está publicado:** CIOT de t, importação Comex do capítulo 31 em t, ANDA até t−2. São comparados:
  - modelo só com a ANDA de t−2;
  - o mesmo mais o Comex;
  - o mesmo mais Comex e CIOT.
- **Janela:** avaliação fora da amostra de jan/2023 a abr/2026 (40 meses), antes da quebra de cobertura.

**Resultados**

| Sinal | r variação anual sem defasagem | Nowcast (h=0): erro com CIOT ÷ sem CIOT (já com Comex) | Diebold-Mariano p |
|---|---|---|---|
| fert_total | 0,08 | 0,96 | 0,21 |
| fert_portos | 0,04 | 0,94 | 0,09 |
| fert_mt | −0,07 | 0,95 | 0,23 |

- Nenhum sinal é significativo. O melhor (p = 0,09) é um entre seis testes, então cai no acaso.
- Sem o Comex, somar o CIOT ao modelo só com a ANDA **piora** a previsão (razão de 1,06 a 1,07).
- Com 1 mês de antecedência (h=1), o quadro é o mesmo.

**Por que falha.** A contagem de CIOT de fertilizante tem saltos de cobertura que não têm relação com o mercado:
- 2021: CIOT +137%, ANDA +13%;
- 2023: CIOT −38%, ANDA +11,6%.

O CIOT de adubo mede o regime de contratação (autônomo contra frota própria ou transportadora), não o volume. O fluxo porto→misturadora também não é a mesma coisa que entrega ao mercado.

Depois da quebra de mai/2026, o CIOT de fertilizante mais que dobra (jun–ago/2026), o que reforça que a contagem não é volume.

**Implicação para F5.** O termômetro do fertilizante continua possível com line-up + Comex + preço Conab, que não foram testados. **Não usar o CIOT de NCM 31 como indicador.**

Scripts: `anda_parse.py`, `comex_fert.py`, `backtest_fert.py`. Resultado bruto: `resultado_fert.json`.

---

## Adendo 2 (25/09/2026): line-up de fertilizante de Paranaguá contra a importação

**Veredito: nenhum ganho demonstrado.** O teste é limitado pelo dado disponível, então o resultado é "não comprovado", e não "comprovadamente inútil".

**Dado**
- **Histórico de line-up.** A APPA não tem consulta por data. O `relLineUpRetroativo` só mostra o momento atual, e o scraper do repositório só guarda grão, desde jun/2026. A saída foi usar o Wayback Machine:
  - 97 capturas com status 200, de 2015 a 2026. Descontando duplicatas e a variante paginada "Corex", sobram **45 capturas úteis entre 2017 e 2026, de 1 a 7 por ano**.
  - Por captura, somei as toneladas de navios de **importação** com mercadoria de fertilizante: ureia, KCl, sulfato de amônio, nitratos, fosfatos/MAP/DAP, superfosfatos, "FERTILIZ.MINER.QUIM…". Nos atracados vale o saldo; nas demais seções, o previsto. Cada navio conta uma vez por seção.
  - Descartei 17 registros com mais de 100 mil t por navio, que são erros de digitação (valores de milhões de toneladas).
- **Alvo.** Importação do capítulo 31 no Comex Stat com URF Porto de Paranaguá (0917800), mensal. A soma anual confere com a ordem de grandeza conhecida: cerca de 10,9 Mt em 2025.

**Desenho (fixado antes de rodar)**
- **Sinais.** "Q firme" = atracados + programados + ao largo. "Q total" = Q firme + esperados.
- **Alvos.** Importação do mês da captura (M) e do mês seguinte (M+1).
- **Base.** Mesmo mês do ano anterior × tendência de 12 meses, só com o Comex publicado até M−1.
- **Validação.** Deixa um ano inteiro de fora por vez, para não vazar informação entre capturas do mesmo ano.

**Resultados**

| Alvo | Sinal | Correlação com o desvio sobre a base | Erro com line-up ÷ sem | Diebold-Mariano p |
|---|---|---|---|---|
| mês M | Q firme | 0,14 | 1,00 | 0,47 |
| mês M | Q total | 0,22 | 0,98 | 0,23 |
| mês M+1 | Q firme | 0,11 | 1,03 | 0,84 |
| mês M+1 | Q total | 0,11 | 1,02 | 0,70 |
| M + M+1, exploratório (não pré-registrado) | Q total | 0,23 | 0,96 | não calculado |

**Por que o teste é fraco**
1. **Só 45 capturas, espalhadas.** Não dá para montar série mensal nem medir variação anual.
2. **O alvo é ruidoso.** O mês de registro no Comex por URF oscila muito: por exemplo, cerca de 180 mil t num mês, contra 2,5 Mt no mesmo mês de outro ano. O erro da base chega a ±50–65% ao mês, e isso afoga o sinal. Um alvo físico (atracações/descarga da ANTAQ por dia) seria o certo, mas o servidor da ANTAQ não respondeu nesta sessão.

**Implicação para F5.** O CIOT de fertilizante falhou e o line-up não mostrou ganho. A nota de antecipação cai de 4 para 2. Para reabrir com dado bom:
- (a) passar a guardar snapshots diários de fertilizante nos scrapers de line-up que já existem (hoje o filtro `RX_GRAO` descarta fertilizante; mudar isso é mudança de código, **não feita**);
- (b) repetir o teste depois de 12 a 18 meses de coleta, ou antes disso contra a descarga diária da ANTAQ, quando o servidor estiver acessível.

Scripts:
- `baixa_wayback_lineup.py`: baixa as capturas listadas em `cdx.json`.
- `parse_lu.py`: gera `lineup_fert_hist.json`.
- `comex_fert_paranagua.py`: gera `comex_fert_paranagua.json`.
- `backtest_lineup_fert.py`: backtest principal, gera `resultado_lineup_fert.json`.
- `lineup_fert_exploratorio.py`: teste exploratório.
