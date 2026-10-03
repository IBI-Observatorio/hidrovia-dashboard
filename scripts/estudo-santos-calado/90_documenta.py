"""90 — Gera processed/DICIONARIO.md e processed/QUALIDADE.md a partir das tabelas processadas.

Roda por último. Só descreve e conta; não estima nada.
"""
from __future__ import annotations

import json

import duckdb
import pandas as pd

from _comum import PROC, MANIFEST, agora

ANTAQ = "ANTAQ Estatístico Aquaviário (parquet local)"
APS = "APS — tabela de calados (página atual + Wayback)"
D = {
    "escalas_santos": (ANTAQ, "1 linha por atracação no complexo de Santos (Complexo Portuário = 'Santos').", {
        "id_atracacao": ("int", "-", "IDAtracacao da ANTAQ (chave)"),
        "imo": ("str(7)", "-", "Nº do IMO com zeros à esquerda; nulo se ausente ou <= 0"),
        "imo_valido": ("bool", "-", "dígito verificador do IMO confere"),
        "instalacao / tipo_instalacao / cdtup": ("str", "-", "Porto Atracação, Tipo da Autoridade Portuária, CDTUP"),
        "id_berco / berco / terminal / apelido_instalacao / municipio": ("str", "-", "campos da ANTAQ sem alteração"),
        "data_chegada ... data_desatracacao": ("timestamp", "hora local", "datas da ANTAQ (chegada, atracação, início/fim de operação, desatracação)"),
        "ano_antaq / mes_antaq": ("int/str", "-", "ano/mês de referência da ANTAQ (= desatracação)"),
        "tipo_operacao_atracacao / tipo_navegacao_atracacao": ("str", "-", "campos da ANTAQ"),
        "n_linhas_carga": ("int", "-", "nº de linhas na tabela Carga"),
        "t_emb_total / t_desemb_total": ("float", "t", "soma de VLPesoCargaBruta por Sentido"),
        "t_sentido_nao_informado": ("float", "t", "linhas com Sentido 'Não Informado' (sobretudo Safamento)"),
        "t_{emb,desemb}_{granel_solido,granel_liquido,carga_geral,conteiner_bruto}": ("float", "t", "por Natureza da Carga; contêiner = peso bruto com tara"),
        "t_{emb,desemb}_longo_curso": ("float", "t", "Tipo Navegação = Longo Curso"),
        "t_baldeacao": ("float", "t", "Tipo Operação da Carga contém 'Baldeação' (ambos os sentidos)"),
        "teu_{cheio,vazio}_{emb,desemb}": ("float", "TEU", "TEU por ConteinerEstado e Sentido"),
        "t_bruta_cheio_{emb,desemb}": ("float", "t", "peso bruto (com tara) dos contêineres cheios"),
        "t_por_teu_cheio_{emb,desemb}": ("float", "t/TEU", "t_bruta_cheio / teu_cheio; nulo se teu_cheio = 0"),
        "t_emb_{soja_1201,milho_1005,farelo_2304,acucar_1701}": ("float", "t", "granel sólido embarcado por SH4 (CDMercadoria)"),
        "sh4_principal_{emb,desemb}": ("str", "-", "SH4 de maior peso no sentido"),
        "h_espera_atracacao ... h_estadia": ("float", "h", "TemposAtracacao (vírgula decimal convertida)"),
    }),
    "escalas_santos_carga": (ANTAQ, "atracação × sentido × natureza × operação × navegação × estado/tamanho do contêiner × SH4 × origem × destino.", {
        "id_atracacao": ("int", "-", "chave para escalas_santos"),
        "sentido, natureza, tipo_operacao_carga, tipo_navegacao_carga": ("str", "-", "campos da Carga"),
        "conteiner_estado, conteiner_tamanho": ("str", "-", "Cheio/Vazio; 20/40"),
        "sh2, sh4": ("str", "-", "CDMercadoria (SH4) e seus 2 primeiros dígitos"),
        "grupo_mercadoria_antaq": ("str", "-", "cadastro Mercadoria da ANTAQ via SH2"),
        "origem, destino": ("str", "-", "códigos de porto de origem/destino da ANTAQ (rota)"),
        "n_linhas, t_bruta, teu, qt": ("int/float", "-, t, TEU, un", "somas das linhas agrupadas"),
    }),
    "escalas_santos_conteiner_sh4": (ANTAQ, "conteúdo dos contêineres (CargaConteinerizada) por atracação × sentido × SH4.", {
        "id_atracacao, sentido": ("int, str", "-", "chaves"),
        "sh4_conteudo": ("str", "-", "CDMercadoriaConteinerizada"),
        "t_liquida_conteudo": ("float", "t", "VLPesoCargaConteinerizada (peso da mercadoria, sem tara)"),
    }),
    "escalas_brasil_mesmos_imo": (ANTAQ, "todas as atracações no Brasil dos IMOs vistos em Santos (topping-off, mesmo navio em vários portos).", {
        "id_atracacao, imo, instalacao, complexo, tipo_instalacao, cdtup, id_berco, berco, uf": ("-", "-", "campos da ANTAQ"),
        "data_chegada, data_atracacao, data_desatracacao": ("timestamp", "-", "datas da ANTAQ"),
        "em_santos": ("bool", "-", "Complexo Portuário = 'Santos'"),
        "t_emb_total, t_desemb_total, t_emb_granel_solido, t_emb_longo_curso": ("float", "t", "como em escalas_santos"),
        "teu_cheio_emb/desemb, t_bruta_cheio_emb": ("float", "TEU, t", "como em escalas_santos"),
        "seq_imo": ("int", "-", "ordem da atracação na história do IMO (por data de atracação)"),
    }),
    "calado_permitido_painel": (APS, "item (trecho do canal, berço ou regra especial) × período de valores constantes.", {
        "tipo": ("str", "-", "trecho | berco | berco_regra_especial"),
        "item": ("str", "-", "trecho canônico (I, II, III, IV, IV-B, III+IV) ou berço como impresso pela APS"),
        "descricao": ("str", "-", "texto impresso do item na última captura do período"),
        "calado_bm": ("float", "m", "calado máximo na baixa-mar / Zero DHN, impresso"),
        "calado_pm": ("float", "m", "calado máximo na preamar (maré ≥ 1,00 m), impresso"),
        "calado_pm_fonte": ("str", "-", "impresso_tabela_canal | impresso_coluna_trecho_tabela_bercos"),
        "calado_pm_regra": ("float", "m", "só formato B: Zero DHN + 1,0 m pela regra impressa na mesma página; NÃO é valor impresso"),
        "calado_unico_impresso": ("float", "m", "quando a APS imprime um só valor (formatos A e B; canal em 2018–2021)"),
        "data_vigencia_impressa": ("date", "-", "só quando o texto diz 'entrou em vigor no dia'"),
        "carta_vigencia, data_carta": ("str, date", "-", "carta da Autoridade Portuária citada na frase de vigência"),
        "documento_homologacao, data_homologacao": ("str, date", "-", "coluna Homologação (formato C recente)"),
        "levantamento": ("str", "-", "data/mês do levantamento hidrográfico impresso (não é vigência)"),
        "revisoes, data_revisao_impressa_min": ("str, date", "-", "nº e data impressos da revisão da tabela"),
        "primeira_captura, ultima_captura": ("str AAAAMMDDhhmmss", "-", "datas das capturas (Wayback/própria) — NÃO são vigência"),
        "ultima_captura_periodo_anterior, primeira_captura_periodo_seguinte": ("str", "-", "janela em que a mudança ocorreu"),
        "n_capturas, formato, arquivos": ("-", "-", "proveniência"),
    }),
    "comex_export_uf_urf_sh4": ("Comex Stat (MDIC), API /general", "exportação mensal por UF de origem × URF × via × SH4, 2010 → ago/2026.", {
        "produto, sh4": ("str", "-", "soja 1201, milho 1005, farelo_soja 2304, acucar 1701, total_todas_mercadorias (sem filtro de SH4; sh4 nulo)"),
        "ano, mes": ("int", "-", "período Comex Stat"),
        "uf_origem": ("str", "-", "UF do produto declarada (distorções conhecidas; conferir contra produção — TR §5.3)"),
        "urf, urf_codigo": ("str", "-", "URF de embarque"),
        "via": ("str", "-", "MARITIMA ou FLUVIAL (filtro vias 01 e 02)"),
        "fob_usd, kg": ("float", "US$, kg", "metricFOB, metricKG"),
        "porto, grupo": ("str", "-", "via mapa_urf_porto.csv; nulo = URF não portuária ou fora do recorte"),
    }),
    "gtr_frete_maritimo_soja_brasil": ("USDA AMS GTR, Socrata j6ns-hzra", "frete marítimo de soja por porto brasileiro → Alemanha/China, trimestral.", {
        "quarter_ending_date, year, quarter, year_quarter": ("str", "-", "trimestre"),
        "port, destination": ("str", "-", "porto de origem e destino"), "rate": ("str→num", "US$/t", "frete"),
    }),
    "gtr_custo_transporte_soja_brasil_china": ("USDA AMS GTR, Socrata j7xv-dz9h (tabela de origem da visualização xtb3-iudz)", "custo de transporte e landed cost por rota, trimestral.", {
        "port": ("str", "-", "rota origem–porto (ex.: North MT - Santos)"), "destination": ("str", "-", "destino"),
        "truck, rail, barge, ocean, total_transportation_costs, farm_value, landed_cost": ("str→num", "US$/t", "componentes do custo"),
    }),
    "conab_levantamentos_graos": ("CONAB, LevantamentoGraos.txt", "estimativas de cada levantamento mensal por UF × produto × safra (2017 → 2025/26). Não é produção mensal.", {
        "ano_agricola, safra, uf, produto, id_levantamento, dsc_levantamento": ("str", "-", "campos da CONAB"),
        "area_plantada_mil_ha, producao_mil_t, produtividade_mil_ha_mil_t": ("float", "mil ha, mil t", "como publicado"),
    }),
    "conab_serie_historica_graos": ("CONAB, SerieHistoricaGraos.txt", "série histórica (1976 → 2025/26), último levantamento de cada safra, UF × produto.", {
        "ano_agricola, dsc_safra_previsao, uf, produto": ("str", "-", "campos da CONAB"),
        "area_plantada_mil_ha, producao_mil_t, produtividade_mil_ha_mil_t": ("str", "mil ha, mil t", "como publicado (texto)"),
    }),
    "precos_internacionais_mensal": ("FRED / FMI Primary Commodity Prices", "preço mensal US$/t.", {
        "serie": ("str", "-", "PSOYBUSDM (soja: futuro de Chicago, 1º vencimento) | PMAIZMTUSDM (milho: FOB Golfo, NÃO é CBOT)"),
        "data, usd_t": ("date, float", "US$/t", "como publicado"),
    }),
    "calado_concorrentes_painel": ("páginas/documentos de calado das autoridades portuárias + Wayback", "valor de calado impresso e contexto, por porto × captura (extração automática, revisado = False).", {
        "porto, autoridade, url, captura_ts, tipo_captura, arquivo": ("str", "-", "proveniência; captura_ts não é vigência"),
        "calado_m": ("float", "m", "número 'NN,NN m' até 160 caracteres após 'calado'"),
        "contexto": ("str", "-", "texto em volta do valor, para identificar trecho/berço"),
        "datas_vigencia_impressas": ("str", "-", "datas após 'vigência/em vigor/a partir de' na mesma captura"),
        "regra_extracao": ("str", "-", "generica | canal_paranagua"),
        "revisado, classe, local, nota_revisao": ("bool, str", "-", "revisão manual via data/estudo-santos-calado/revisao_calado_concorrentes.csv; classe = canal_acesso | canal_interno | canal_secundario | porto_operacional | fundeio | manobra | berco_terminal | outro"),
    }),
    "eventos_revisao_calado": (APS, "mudanças de calado por trecho do canal entre períodos consecutivos.", {
        "item, descricao": ("str", "-", "trecho canônico e descrição impressa"),
        "de_bm, de_pm, para_bm, para_pm": ("float", "m", "valores impressos antes/depois"),
        "delta_m": ("float", "m", "para − de no mesmo referencial; nulo na troca preamar→Zero DHN"),
        "sentido": ("str", "-", "aumento | redução | só PM | mudança de referencial (não comparável)"),
        "data_vigencia_impressa, vigencia_lida_na_captura, carta_vigencia": ("date, str", "-", "vigência só quando impressa; pode ter sido lida em captura posterior com os mesmos valores"),
        "documento_homologacao": ("str", "-", "coluna Homologação (formato recente)"),
        "janela_inicio_captura, janela_fim_captura": ("str", "-", "última captura com o valor antigo e primeira com o novo"),
        "obra_cais_simultanea, causa_impressa": ("-", "-", "vazios: não constam da fonte"),
    }),
    "caminho_berco": (APS + " + NPCP-SP Anexo 1-B", "berço da APS ou terminal autorizado → trecho em que está situado → trechos percorridos desde a barra.", {
        "berco_aps / instalacao": ("str", "-", "berço como impresso pela APS; para terminais autorizados, a instalação da ANTAQ"),
        "trecho_impresso, trecho_situado": ("str", "-", "rótulo da coluna 'Calado máximo por trecho' (rowspan) e trecho canônico resolvido pelos valores"),
        "trechos_percorridos": ("str", "-", "trechos de I até o trecho situado (ordem das descrições impressas)"),
        "trecho_adicional_fora_tabela_aps": ("str", "-", "'Canal de Piaçaguera' para TIPLAM/TMPC (calado por Portaria CPSP não coletada)"),
        "metodo": ("str", "-", "impresso_tabela_aps | inferido_por_endereco_npcp (A CONFERIR) | npcp_canal_piacaguera"),
        "regra": ("str", "-", "fonte e regra de atribuição"),
    }),
    "berco_antaq_aps": (ANTAQ + " × " + APS, "casamento de cada IDBerco da ANTAQ com o(s) berço(s) da APS ou com o caminho do terminal autorizado.", {
        "instalacao, id_berco, berco, terminal, n_atracacoes, ano_min, ano_max": ("-", "-", "da ANTAQ"),
        "berco_aps": ("str", "-", "berço(s) da APS separados por ';' (berço composto aponta para todos)"),
        "instalacao_caminho": ("str", "-", "terminal autorizado cujo caminho está em caminho_berco (inclui TUPs do cadastro antigo da ANTAQ)"),
        "metodo": ("str", "-", "nome_normalizado | manual | tup_cadastro_antigo | terminal_autorizado"),
        "observacao": ("str", "-", "motivo quando não casado"),
    }),
    "aps_limites_dwt": (APS, "tabela de calado mínimo a vante, trim máximo a ré e imersão mínima do propulsor por faixa de DWT, por captura.", {
        "porte, calado_min_vante, trim_max_re, imersao_min_propulsor": ("str", "-", "como impresso"),
        "arquivo, captura_ts": ("str", "-", "proveniência"),
    }),
    "escalas_calado_aps": ("APS — Navios Esperados · Carga (coleta própria diária)", "1 linha por DUV, versão mais recente do arquivo acumulado.", {
        "duv, imo, navio, bandeira, secao, terminal": ("str", "-", "como na lista da APS (IMO normalizado a 7 dígitos)"),
        "comprimento_m, calado_m, calado_primeiro_m": ("float", "m", "coluna 'Cal/Draft' (significado não documentado pela APS); último e primeiro valor vistos"),
        "chegada, visto_primeiro, visto_ultimo, snapshot_data": ("date", "-", "datas da lista e da coleta"),
        "operacoes, mercadorias, peso_t": ("str, float", "-, t", "como na lista"),
    }),
    "npcp_regras": ("Capitania dos Portos de SP — NPCP-SP", "passagens das edições 2016 e 3ª Rev. 2026 por tema.", {
        "edicao, pagina_pdf": ("str, int", "-", "edição e página do PDF"),
        "tema": ("str", "-", "calado_maximo | folga_quilha | mare | cruzamento_ultrapassagem | dimensoes | portaria_especifica | piacaguera"),
        "trecho": ("str", "-", "texto em volta da palavra-chave"),
    }),
}


def md_tabela(df: pd.DataFrame) -> str:
    df = df.copy()
    cols = list(df.columns)
    lin = ["| " + " | ".join(map(str, cols)) + " |", "|" + "---|" * len(cols)]
    for _, r in df.iterrows():
        lin.append("| " + " | ".join("" if pd.isna(v) else (str(int(v)) if isinstance(v, float) and float(v).is_integer() else f"{v:.2f}" if isinstance(v, float) else str(v)) for v in r) + " |")
    return "\n".join(lin)


def dicionario():
    out = ["# Dicionário de dados — estudo Custo do calado perdido em Santos (IBI × NORA)", "",
           f"Gerado por `scripts/estudo-santos-calado/90_documenta.py` em {agora()}. Proveniência dos brutos em `../manifest.json`.", ""]
    for nome, (fonte, desc, cols) in D.items():
        p = PROC / f"{nome}.parquet"
        if not p.exists():
            continue
        n = duckdb.sql(f"select count(*) from '{p.as_posix()}'").fetchone()[0]
        out += [f"## `{nome}.parquet` ({n:,} linhas)", "", f"Fonte: {fonte}. {desc}", "",
                "| coluna | tipo | unidade | regra de construção |", "|---|---|---|---|"]
        out += [f"| `{c}` | {t} | {u} | {r} |" for c, (t, u, r) in cols.items()]
        out.append("")
    out += ["## Arquivos auxiliares (CSV/JSON/MD)", "",
            "| arquivo | conteúdo |", "|---|---|",
            "| `universo_terminais.csv` | instalações do complexo incluídas, nº de atracações e critério |",
            "| `casamento_lineup_antaq.json` | T3: taxa de casamento da lista de esperados da APS com a T1 |",
            "| `imos_santos.csv` | T4: IMOs únicos de Santos, nº de escalas, perfil de carga ANTAQ (não é tipo de navio), primeiro/último ano |",
            "| `amostra_validacao_equasis.csv` | T4: 150 IMOs para consulta MANUAL no Equasis (colunas `*_equasis` vazias para preencher) |",
            "| `parametros_ned.json` | T4: regressões da Figure H-8 do NED Manual (a, b, R², erro-padrão) |",
            "| `mapa_urf_porto.csv` | T5: URF → porto/grupo (regex sobre o nome; aeroportos excluídos) |",
            "| `custo_terrestre_referencias.json` | T7: onde estão o piso ANTT vigente e o modelo de custo rodoviário do IBI; lacuna da série histórica |",
            "| `calado_concorrentes_fontes.csv` | T6: URLs consultadas, capturas no CDX e baixadas |",
            "| `../revisao_calado_concorrentes.csv` | T6: regras da revisão manual (porto, valor, trecho do contexto, classe, local, nota) |",
            "| `chm_mares_fontes.csv` | T8: tábuas de maré de Santos obtidas via Wayback, com completude |",
            "| `RASCUNHO_pedido_APS.md` | T9: pedido à APS — NÃO enviado |",
            "| `checagens_t1.json` | reprodução das checagens pedidas (81.241 atracações; 13,41 t/TEU; IMO 99%) |", ""]
    (PROC / "DICIONARIO.md").write_text("\n".join(out), encoding="utf-8")


def qualidade():
    c = duckdb.connect()
    e = (PROC / "escalas_santos.parquet").as_posix()
    chk = json.loads((PROC / "checagens_t1.json").read_text(encoding="utf-8"))
    cob = c.sql(f"""select ano_antaq as ano, count(*) as atracacoes, sum((tipo_instalacao='Porto Organizado')::int) as atr_po,
        round(100*avg((imo is not null)::int),1) as pct_imo, round(100*avg(coalesce(imo_valido,false)::int),1) as pct_imo_valido,
        round(sum(t_emb_total)/1e6,1) as mt_emb, round(sum(t_desemb_total)/1e6,1) as mt_desemb,
        round(sum(teu_cheio_emb+teu_cheio_desemb+teu_vazio_emb+teu_vazio_desemb)/1e6,2) as mteu,
        round(sum(t_bruta_cheio_emb+t_bruta_cheio_desemb)/nullif(sum(teu_cheio_emb+teu_cheio_desemb),0),2) as t_por_teu_cheio,
        round(100*avg((h_estadia is not null)::int),1) as pct_tempos, sum((n_linhas_carga=0)::int) as atr_sem_carga
        from '{e}' group by 1 order by 1""").df()
    out_ = c.sql(f"""select
        sum((data_atracacao < data_chegada)::int) as atracacao_antes_chegada,
        sum((data_desatracacao < data_atracacao)::int) as desatracacao_antes_atracacao,
        sum((h_estadia < 0)::int) as estadia_negativa, sum((h_estadia > 24*60)::int) as estadia_maior_60d,
        sum((t_por_teu_cheio_emb > 35)::int) as t_por_teu_emb_maior_35, sum((t_por_teu_cheio_emb < 2)::int) as t_por_teu_emb_menor_2,
        sum((imo is not null and not imo_valido)::int) as imo_digito_invalido
        from '{e}'""").df()
    dup_imo_dia = c.sql(f"""select count(*) from (select imo, data_atracacao, berco, count(*) n from '{e}' where imo is not null
        group by all having n > 1)""").fetchone()[0]
    out = ["# Relatório de qualidade — base do estudo Custo do calado perdido em Santos", "",
           f"Gerado em {agora()} por `90_documenta.py`. Só contagens; nenhuma estimativa.", "",
           "## T1 — Escalas ANTAQ do complexo de Santos", "",
           f"- Atracações no Porto Organizado, 2010–fev/2026: **{chk['atracacoes_porto_organizado_2010_fev2026']:,}** (esperado ~81 mil: confere).",
           f"- Complexo (PO + 7 terminais autorizados): {chk['atracacoes_complexo_2010_fev2026']:,}.",
           f"- Peso bruto por TEU cheio, 2025: **{chk['t_por_teu_cheio_2025_complexo']:.2f} t/TEU no complexo** (confere com 13,41); "
           f"{chk['t_por_teu_cheio_2025_porto_organizado']:.2f} só no Porto Organizado. O 13,41 do TR é do complexo (inclui DP World).",
           f"- IMO preenchido em 2025: {100*chk['imo_preenchido_2025_porto_organizado']:.1f}% no PO; {100*chk['imo_preenchido_2025_complexo']:.1f}% no complexo (confere ~99%).",
           f"- IMO com dígito verificador válido (todas as escalas com IMO): {100*chk['imo_com_digito_verificador_valido_complexo']:.2f}%.",
           f"- Duplicatas: IDAtracacao duplicado = {chk['id_atracacao_duplicado']}; tempos duplicados = {chk['tempos_duplicados_por_atracacao']}; "
           f"mesmo IMO + mesma data/hora de atracação + mesmo berço = {dup_imo_dia}.", "",
           "### Cobertura por ano (ano de referência ANTAQ = desatracação)", "", md_tabela(cob), "",
           "### Inconsistências e outliers (contagem, não corrigidos)", "", md_tabela(out_), "",
           "Notas: 2026 cobre só jan–fev. 'Sentido Não Informado' (~5 Mt/ano) são linhas de Safamento. "
           "O peso bruto da ANTAQ inclui a tara do contêiner.", ""]
    # T2
    pain = PROC / "calado_permitido_painel.parquet"
    if pain.exists():
        P = pd.read_parquet(pain)
        E = pd.read_parquet(PROC / "eventos_revisao_calado.parquet")
        from _comum import INTERIM
        M = pd.read_parquet(INTERIM / "aps_calados_capturas_meta.parquet")
        M["ano"] = M.captura_ts.str[:4]
        cap = M.groupby(["ano", "pagina", "formato"]).size().reset_index(name="capturas")
        tr = P[P.tipo == "trecho"][["item", "calado_bm", "calado_pm", "calado_pm_regra", "calado_unico_impresso",
                                    "data_vigencia_impressa", "primeira_captura", "ultima_captura", "n_capturas"]]
        BA = pd.read_parquet(PROC / "berco_antaq_aps.parquet")
        CB = pd.read_parquet(PROC / "caminho_berco.parquet")
        po = BA[BA.instalacao == "Santos"]
        out += ["## T2 — Calado permitido (APS)", "",
                f"- Capturas usadas: {len(M)} (Wayback + captura própria em {agora()[:10]}); {int((M.n_itens == 0).sum())} sem tabela de calado "
                "(páginas de 1998–2000 só com profundidades, e stubs de redirecionamento de 288 bytes).",
                f"- Períodos de trecho do canal: {int((P.tipo == 'trecho').sum())}; de berço: {int((P.tipo == 'berco').sum())}.",
                f"- Eventos de revisão por trecho: {len(E)}, dos quais {int(E.vigencia_impressa_disponivel.sum())} com data de vigência impressa.",
                f"- Berços ANTAQ do Porto Organizado casados com a tabela da APS ou com o caminho de um terminal autorizado: "
                f"{(po.berco_aps.notna() | po.instalacao_caminho.notna()).sum()}/{len(po)} "
                f"({po[po.berco_aps.notna() | po.instalacao_caminho.notna()].n_atracacoes.sum() / po.n_atracacoes.sum():.1%} das atracações do PO; "
                f"{BA[BA.berco_aps.notna() | BA.instalacao_caminho.notna()].n_atracacoes.sum() / BA.n_atracacoes.sum():.1%} do complexo). "
                "Não casados: " + ", ".join(f"{b} ({n})" for b, n in po[po.berco_aps.isna() & po.instalacao_caminho.isna()]
                                                .sort_values("n_atracacoes", ascending=False)[["berco", "n_atracacoes"]].values) + ".",
                f"- Terminais autorizados: trecho **inferido pelo endereço** da NPCP-SP (Anexo 1-B), a conferir — "
                + "; ".join(f"{r.instalacao}: {r.trecho_situado}" + (f" + {r.trecho_adicional_fora_tabela_aps}" if isinstance(r.trecho_adicional_fora_tabela_aps, str) else "")
                            for r in CB[CB.berco_aps.isna()].itertuples()) + ". O calado do Canal de Piaçaguera (Portaria CPSP) não foi coletado.", "",
                "### Capturas por ano e formato", "", md_tabela(cap), "",
                "### Períodos por trecho do canal", "", md_tabela(tr), "",
                "### Ressalvas", "",
                "- Formato A (até 2013): um só valor, impresso como calado na preamar com maré ≥ 1,00 m; a partir de 2014 o valor impresso é o Zero DHN "
                "(baixa-mar) com 'acréscimo de até 1,0 m na preamar'. A troca de referencial não é variação de calado — os eventos marcam isso.",
                "- Antes de 2014 a página trata 'Torre Grande até Alamoa' como um trecho só (III+IV).",
                "- O trecho além da Alamoa/BTP muda de descrição ao longo do tempo ('BTP até Alamoa', 'Alamoa 02 até final trecho IV', "
                "'Terminal Alamoa até o final trecho IV' = IV-b): tratado como IV-B, mas a equivalência física não foi conferida.",
                "- Datas de captura do Wayback nunca entram como vigência. Sem data impressa, a mudança fica numa janela entre capturas.",
                "- Tabela de berços só existe a partir da Rev. 221 (16/07/2019, captura de out/2019); antes disso, o calado por berço não tem histórico público (lacuna).", ""]
    # T3–T8
    def lj(n):
        p = PROC / n
        return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    cl = lj("casamento_lineup_antaq.json")
    if cl:
        out += ["## T3 — Calado × IMO da lista de esperados (coleta própria)", "",
                f"- Coleta diária rodando no GitHub Actions (workflow agro-dados): snapshots {', '.join(cl['datas_snapshot'])}.",
                f"- {cl['escalas_duv']} escalas (DUV), {cl['com_imo']} com IMO, {cl['com_calado']} com calado; "
                f"{cl['duv_com_calado_alterado_entre_snapshots']} com calado alterado entre snapshots.",
                f"- Casamento com a T1 por IMO + data (±3 dias): **{cl['casadas_imo_e_data_T1']}** — zero por construção: a ANTAQ vai até "
                f"{cl['fim_da_T1_antaq'][:10]} e a coleta começa em 30/09/2026. IMO já visto em Santos na T1: {100*cl['taxa_imo_ja_visto_na_T1']:.1f}%.", ""]
    im = PROC / "imos_santos.csv"
    if im.exists():
        I_ = pd.read_csv(im)
        A_ = pd.read_csv(PROC / "amostra_validacao_equasis.csv")
        out += ["## T4 — Cadastro de navios", "",
                f"- {len(I_):,} IMOs únicos; perfil de carga (ANTAQ): " + ", ".join(f"{k} {v:,}" for k, v in I_.perfil_carga_antaq.value_counts().items()) + ".",
                "- A ANTAQ não traz tipo, DWT nem calado de projeto: **lacuna** até a consulta manual (Equasis) ou a base licenciada.",
                f"- Amostra de validação: {len(A_)} IMOs em {A_.estrato.nunique()} estratos (perfil × tercil de t/escala, PPS por nº de escalas, semente fixa).",
                "- `parametros_ned.json`: conferido contra o PDF do Apêndice H baixado da USACE Digital Library (não estava em `referencias/`).", ""]
    cx = PROC / "comex_export_uf_urf_sh4.parquet"
    if cx.exists():
        C_ = pd.read_parquet(cx)
        cobx = C_.groupby("produto").agg(inicio=("ano", "min"), fim=("ano", "max"), linhas=("kg", "size"),
                                         mt=("kg", lambda x: round(x.sum() / 1e9, 1))).reset_index()
        sj = C_[(C_.produto == "soja") & (C_.ano == 2024) & (C_.urf_codigo == "0817800")].kg.sum() / 1e9
        out += ["## T5 — Comex Stat", "", md_tabela(cobx), "",
                f"- Peso casado a um porto do mapa: {100 * C_[C_.porto.notna()].kg.sum() / C_.kg.sum():.1f}% (resto: URFs de petróleo/fronteira fora do recorte).",
                f"- Conferência: soja por Santos (URF 0817800) em 2024 = {sj:.2f} Mt (Fase 0: 27,96 Mt).",
                "- **Lacuna**: 'total de carga em contêiner' — o Comex Stat não tem indicador de contêiner; usar ANTAQ (T1) para contêiner.",
                "- ALF Belém despacha também Barcarena/Vila do Conde: não separável por URF.", ""]
    cc = PROC / "calado_concorrentes_fontes.csv"
    if cc.exists():
        out += ["## T6 — Calado dos concorrentes", "", md_tabela(pd.read_csv(cc)), "",
                "- Paranaguá: extrator específico do canal (`regra_extracao = canal_paranagua`): 12,50 m (Canal da Galheta, 2019–jun/2023) → 12,80 (ago/2023) → 13,10 (mar/2025) → 13,30 (fev/2026), datas = capturas, não vigência.", "- Demais portos: só documento atual/Fase 0, extração genérica (número após 'calado') **revisada manualmente** "
                "(regras em `revisao_calado_concorrentes.csv`). Calado de canal identificado: Rio Grande canal externo 14,20 m, "
                "canal interno I 14,20, canal interno II 13,00, Porto Novo 9,45, S. José do Norte 7,20 (normativa 259, água doce); "
                "Itaqui canal de acesso 22,3 m; S. Francisco do Sul 12,8 m 'calado máximo operacional' do porto (sem separar canal e berço). "
                "Os demais valores são fundeio, manobra ou berço. Vila do Conde: o PDF da Fase 0 não trouxe valor com a regra. "
                "Sem histórico no Wayback para Rio Grande e Itaqui; histórico com data de vigência: lacuna.", ""]
    out += ["## T7 — Controles", "",
            "- USDA GTR: j6ns-hzra (frete marítimo) e j7xv-dz9h (custos; `xtb3-iudz` é só uma visualização sobre essa tabela).",
            "- CONAB: levantamentos 2017→2025/26 e série histórica 1976→2025/26 por UF; **não há produção mensal** (só estimativas por levantamento).",
            "- Preço: soja = FMI/FRED PSOYBUSDM (futuro de Chicago); milho = PMAIZMTUSDM (FOB Golfo) — sem série CBOT de milho de fonte pública baixável (lacuna).",
            "- ANTT: sem série histórica de pisos em dados abertos (lacuna); piso vigente e modelo IBI já documentados no repo.", "",
            "## T8 — NPCP-SP e marés", "",
            "- **Nenhuma das edições da NPCP-SP (2016 e 3ª Rev. 2026) fixa valor numérico de folga sob a quilha para Santos**: "
            "o calado máximo de operação é delegado à APS; o 'fator de segurança' é descrito só qualitativamente. Portarias específicas "
            "(canal de Piaçaguera, navios de 340–370 m, TRSP) não foram coletadas (lacuna).",
            "- CHM: site atrás de desafio anti-robô (não contornado). Tábuas de Santos (previsão) só via Wayback, ver `chm_mares_fontes.csv`; "
            "duas cópias vieram truncadas (1 MiB). Sem série observada de maré (lacuna).", ""]
    out += ["## Lacunas registradas (não preenchidas)", "",
            "- Calado de entrada/saída por escala (nomeação APS): não público — rascunho de pedido em `RASCUNHO_pedido_APS.md` (T9).",
            "- Histórico de calado por berço antes da Rev. 221 (jul/2019) e vigência das revisões sem frase de vigência: pedir à APS.",
            "- Obra de cais simultânea a cada revisão: não consta da tabela da APS.",
            "- DWT, calado de projeto, TEU nominal por IMO: base licenciada (S&P/Clarksons) ou Equasis manual.",
            "- Serviços de contêiner e navios por rota (estudo 5.2): Alphaliner (licenciado).",
            "- Calado medido nas manobras: Praticagem de São Paulo (via NORA).", ""]
    (PROC / "QUALIDADE.md").write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    dicionario()
    qualidade()
    print("DICIONARIO.md e QUALIDADE.md gerados")
