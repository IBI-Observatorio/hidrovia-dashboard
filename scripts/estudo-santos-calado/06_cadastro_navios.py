"""T4 — Lista de navios (IMO), amostra para validação manual no Equasis e parâmetros do NED Manual.

A ANTAQ não traz tipo nem porte do navio. Por isso:
- `perfil_carga_antaq` = natureza de carga predominante (em t) nas escalas do IMO em Santos — é
  perfil de carga, NÃO tipo de navio;
- `faixa_t_por_escala` = tercil da mediana de t movimentadas por escala — usado SÓ para estratificar
  a amostra de validação. Não define classe de porte em nenhuma estimativa (o TR proíbe classe
  derivada da variável dependente).
O Equasis NÃO é raspado: a amostra é para consulta manual (termos de uso proíbem extração em massa).

Saídas (processed/): imos_santos.csv, amostra_validacao_equasis.csv, parametros_ned.json
"""
from __future__ import annotations

import json

import duckdb
import numpy as np
import pandas as pd

from _comum import PROC, INTERIM, RAW, agora, registra

SEMENTE = 20261002
N_AMOSTRA = 150


def lista_imos():
    e = (PROC / "escalas_santos.parquet").as_posix()
    df = duckdb.sql(f"""
    select imo, count(*) n_escalas, min(ano_antaq) primeiro_ano, max(ano_antaq) ultimo_ano,
      sum(t_emb_granel_solido + t_desemb_granel_solido) t_gs, sum(t_emb_granel_liquido + t_desemb_granel_liquido) t_gl,
      sum(t_emb_carga_geral + t_desemb_carga_geral) t_cg, sum(t_emb_conteiner_bruto + t_desemb_conteiner_bruto) t_ct,
      sum(teu_cheio_emb + teu_cheio_desemb + teu_vazio_emb + teu_vazio_desemb) teu_total,
      median(t_emb_total + t_desemb_total) t_mediana_por_escala,
      max(t_emb_total + t_desemb_total) t_max_por_escala,
      string_agg(distinct instalacao, '; ') instalacoes, bool_and(imo_valido) imo_valido
    from '{e}' where imo is not null group by imo""").df()
    nat = df[["t_gs", "t_gl", "t_cg", "t_ct"]].fillna(0)
    rot = {"t_gs": "granel_solido", "t_gl": "granel_liquido", "t_cg": "carga_geral", "t_ct": "conteiner"}
    df["perfil_carga_antaq"] = np.where(nat.sum(axis=1) > 0, nat.idxmax(axis=1).map(rot), "sem_carga")
    # comprimento informado pela APS na lista de esperados (quando o IMO apareceu lá)
    lu = INTERIM / "escalas_calado_aps.parquet"
    if lu.exists():
        l = pd.read_parquet(lu)[["imo", "comprimento_m", "calado_m", "secao"]]
        l = l.groupby("imo").agg(comprimento_aps_m=("comprimento_m", "max"), calado_max_aps_m=("calado_m", "max"),
                                 secao_aps=("secao", "last")).reset_index()
        df = df.merge(l, on="imo", how="left")
    df = df.drop(columns=["t_gs", "t_gl", "t_cg", "t_ct"]).sort_values("n_escalas", ascending=False)
    df.to_csv(PROC / "imos_santos.csv", index=False, encoding="utf-8")
    print(f"  imos_santos.csv: {len(df):,} IMOs")
    return df


def amostra(df: pd.DataFrame):
    """Estratos perfil x tercil de t/escala; alocação proporcional à soma de escalas do estrato (mín. 3);
    dentro do estrato, sorteio com probabilidade proporcional ao nº de escalas, sem reposição."""
    rng = np.random.default_rng(SEMENTE)
    d = df[(df.perfil_carga_antaq != "sem_carga") & df.imo_valido].copy()
    d["faixa_t_por_escala"] = d.groupby("perfil_carga_antaq").t_mediana_por_escala.transform(
        lambda s: pd.qcut(s.rank(method="first"), 3, labels=["T1_baixo", "T2_medio", "T3_alto"]))
    d["estrato"] = d.perfil_carga_antaq + "|" + d.faixa_t_por_escala.astype(str)
    pesos = d.groupby("estrato").n_escalas.sum()
    aloc = np.maximum(3, np.round(N_AMOSTRA * pesos / pesos.sum())).astype(int)
    while aloc.sum() > N_AMOSTRA:
        aloc[aloc.idxmax()] -= 1
    sel = []
    for est, k in aloc.items():
        g = d[d.estrato == est]
        k = min(k, len(g))
        p = g.n_escalas / g.n_escalas.sum()
        idx = rng.choice(g.index, size=k, replace=False, p=p)
        s = g.loc[idx].copy()
        s["n_estrato_populacao"] = len(g)
        s["escalas_estrato"] = int(g.n_escalas.sum())
        s["prob_inclusao_aprox"] = np.minimum(1, k * g.loc[idx].n_escalas / g.n_escalas.sum())
        sel.append(s)
    A = pd.concat(sel)
    for c in ["dwt_equasis", "calado_verao_m_equasis", "loa_m_equasis", "boca_m_equasis", "teu_nominal",
              "tipo_navio_equasis", "consultado_em", "consultado_por"]:
        A[c] = None  # preenchimento MANUAL no Equasis
    A = A[["imo", "estrato", "perfil_carga_antaq", "faixa_t_por_escala", "n_escalas", "primeiro_ano", "ultimo_ano",
           "t_mediana_por_escala", "teu_total", "prob_inclusao_aprox", "n_estrato_populacao", "escalas_estrato",
           "dwt_equasis", "calado_verao_m_equasis", "loa_m_equasis", "boca_m_equasis", "teu_nominal",
           "tipo_navio_equasis", "consultado_em", "consultado_por"]].sort_values(["estrato", "n_escalas"], ascending=[True, False])
    A.to_csv(PROC / "amostra_validacao_equasis.csv", index=False, encoding="utf-8")
    print(f"  amostra_validacao_equasis.csv: {len(A)} IMOs em {A.estrato.nunique()} estratos (semente {SEMENTE})")


def parametros_ned():
    pdf = RAW / "referencias" / "NED_Manual_Deep_Draft_Appendix_H.pdf"
    fonte = {"documento": "USACE/IWR — NED Manual for Deep Draft Navigation, Appendix H: Vessel Operating Costs Guide",
             "figura": "Figure H-8: Vessel Characteristic Equations (p. H-17/H-18 do PDF, págs. 17–18)",
             "base": "especificações de navios 2010 (Maritime Strategies International), Figure H-7",
             "arquivo": "data/estudo-santos-calado/raw/referencias/NED_Manual_Deep_Draft_Appendix_H.pdf",
             "url": "https://usace.contentdm.oclc.org/digital/api/collection/p16021coll2/id/3839/download",
             "conferido_em": agora(),
             "unidades": "metros e t/cm; na figura, o fator *39.37 converte o calado para polegadas e *2.5 o TPC para tpi — não aplicados aqui"}
    eq = {
        "graneleiro": {
            "tpc_t_por_cm": {"a": 0.063512, "b": 0.623346, "forma": "TPC = a*DWT^b", "r2": 0.91, "erro_padrao": 0.12336},
            "calado_projeto_m": {"a": 0.398082, "b": 0.315559, "forma": "calado = a*DWT^b", "r2": 0.93, "erro_padrao": 0.11011},
            "boca_m": {"a": 1.291376, "b": 0.291742, "r2": 0.97, "erro_padrao": 0.06508},
            "loa_m": {"a": 7.945414, "b": 0.300942, "r2": 0.95, "erro_padrao": 0.08869}},
        "porta_conteiner": {
            "tpc_t_por_cm": {"a": 0.036395, "b": 0.696855, "forma": "TPC = a*DWT^b", "r2": 0.98, "erro_padrao": 0.18181},
            "calado_projeto_m": {"a": 0.390122, "b": 0.320449, "forma": "calado = a*DWT^b", "r2": 0.92, "erro_padrao": 0.83500},
            "boca_m": {"a": 1.529934, "b": 0.285778, "r2": 0.92, "erro_padrao": 0.07294},
            "loa_m": {"a": 4.089324, "b": 0.380157, "r2": 0.95, "erro_padrao": 0.08208}},
    }
    obs = ["Valores transcritos da Figure H-8 e conferidos contra o texto extraído do PDF baixado (SHA-256 no manifest).",
           "O TR v5 cita TPC graneleiro/porta-contêiner e calado de graneleiro: conferem com a figura.",
           "Erro-padrão como impresso na coluna 'Standard Error' (a figura não diz se está em log; aparenta ser em log natural nas equações de potência).",
           "Erro-padrão do calado de porta-contêiner impresso como 0.83500 — destoa das demais (~0,1); mantido como impresso, conferir na fonte antes do P1."]
    (PROC / "parametros_ned.json").write_text(json.dumps({"fonte": fonte, "equacoes": eq, "observacoes": obs},
                                                         ensure_ascii=False, indent=1), encoding="utf-8")
    print("  parametros_ned.json")


if __name__ == "__main__":
    df = lista_imos()
    amostra(df)
    parametros_ned()
