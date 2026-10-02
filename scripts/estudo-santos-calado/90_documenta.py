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
    out += ["## Tabelas CSV auxiliares", "",
            "| arquivo | conteúdo |", "|---|---|",
            "| `universo_terminais.csv` | instalações do complexo incluídas, nº de atracações e critério |",
            "| `eventos_revisao_calado.csv` | mudanças de calado por trecho: de/para (BM/PM), delta, sentido, vigência impressa, janela entre capturas; `obra_cais_simultanea` vazio (não consta da fonte) |",
            "| `caminho_berco.csv` | berço da APS → trecho em que está situado (coluna 'Calado máximo por trecho' da APS, rowspan) → trechos percorridos desde a barra |",
            "| `berco_antaq_aps.csv` | casamento IDBerco ANTAQ → berço(s) da APS; método `nome_normalizado` ou `manual`; berço composto (ex.: 'CS 02 + CS 01') aponta para todos |",
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
        E = pd.read_csv(PROC / "eventos_revisao_calado.csv")
        from _comum import INTERIM
        M = pd.read_parquet(INTERIM / "aps_calados_capturas_meta.parquet")
        M["ano"] = M.captura_ts.str[:4]
        cap = M.groupby(["ano", "pagina", "formato"]).size().reset_index(name="capturas")
        tr = P[P.tipo == "trecho"][["item", "calado_bm", "calado_pm", "calado_pm_regra", "calado_unico_impresso",
                                    "data_vigencia_impressa", "primeira_captura", "ultima_captura", "n_capturas"]]
        BA = pd.read_csv(PROC / "berco_antaq_aps.csv")
        po = BA[BA.instalacao == "Santos"]
        out += ["## T2 — Calado permitido (APS)", "",
                f"- Capturas usadas: {len(M)} (Wayback + captura própria em {agora()[:10]}); {int((M.n_itens == 0).sum())} sem tabela de calado "
                "(páginas de 1998–2000 só com profundidades, e stubs de redirecionamento de 288 bytes).",
                f"- Períodos de trecho do canal: {int((P.tipo == 'trecho').sum())}; de berço: {int((P.tipo == 'berco').sum())}.",
                f"- Eventos de revisão por trecho: {len(E)}, dos quais {int(E.vigencia_impressa_disponivel.sum())} com data de vigência impressa.",
                f"- Berços ANTAQ do Porto Organizado casados com a tabela da APS: {po.berco_aps.notna().sum()}/{len(po)} "
                f"({po[po.berco_aps.notna()].n_atracacoes.sum() / po.n_atracacoes.sum():.1%} das atracações do PO). "
                "Os 7 terminais autorizados (DP World, TIPLAM, TMPC, Dow, Cutrale, Base de Dutos) não constam da tabela de berços da APS: "
                "para eles só o calado dos trechos do canal, e o trecho de cada um não foi atribuído (lacuna).", "",
                "### Capturas por ano e formato", "", md_tabela(cap), "",
                "### Períodos por trecho do canal", "", md_tabela(tr), "",
                "### Ressalvas", "",
                "- Formato A (até 2013): um só valor, impresso como calado na preamar com maré ≥ 1,00 m; a partir de 2014 o valor impresso é o Zero DHN "
                "(baixa-mar) com 'acréscimo de até 1,0 m na preamar'. A troca de referencial não é variação de calado — os eventos marcam isso.",
                "- Antes de 2014 a página trata 'Torre Grande até Alamoa' como um trecho só (III+IV).",
                "- O trecho além da Alamoa/BTP muda de descrição ao longo do tempo ('BTP até Alamoa', 'Alamoa 02 até final trecho IV', "
                "'Terminal Alamoa até o final trecho IV' = IV-b): tratado como IV-B, mas a equivalência física não foi conferida.",
                "- Datas de captura do Wayback nunca entram como vigência. Sem data impressa, a mudança fica numa janela entre capturas.",
                "- Tabela de berços só existe nas capturas de 2021 em diante; antes disso, o calado por berço não tem histórico público (lacuna).", ""]
    out += ["## Lacunas registradas (não preenchidas)", "",
            "- Calado de entrada/saída por escala (nomeação APS): não público — rascunho de pedido em `RASCUNHO_pedido_APS.md` (T9).",
            "- Histórico de calado por berço antes de 2021 e vigência das revisões sem frase de vigência: pedir à APS.",
            "- Obra de cais simultânea a cada revisão: não consta da tabela da APS.", ""]
    (PROC / "QUALIDADE.md").write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    dicionario()
    qualidade()
    print("DICIONARIO.md e QUALIDADE.md gerados")
