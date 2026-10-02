"""T5 — Comex Stat: exportação mensal por UF de origem x URF de embarque x SH4, 2010 -> último mês.

API pública api-comexstat.mdic.gov.br (base por NCM; a base por município não traz URF).
Recorte: flow=export, via marítima (01) e fluvial (02), SH4 1201 soja, 1005 milho, 2304 farelo,
1701 açúcar, e o total de todas as mercadorias (sem filtro de SH4). Todas as URFs são baixadas;
o recorte por porto (Santos 0817800, Paranaguá, S. Francisco do Sul, Itajaí/Itapoá, Rio Grande,
Arco Norte) fica no mapa URF -> porto, para não perder nenhuma URF portuária.
Limite de requisições: pausa de 3 s entre chamadas e espera >= 10 s em HTTP 429.
"Total de carga em contêiner": o Comex Stat não tem indicador de contêiner -> lacuna registrada.

Saídas: raw/comex/*.json (bruto por SH4 x ano), processed/comex_export_uf_urf_sh4.parquet,
        processed/mapa_urf_porto.csv
"""
from __future__ import annotations

import json
import re
import unicodedata

import pandas as pd

from _comum import RAW, PROC, baixa

API = "https://api-comexstat.mdic.gov.br"
SH4 = {"1201": "soja", "1005": "milho", "2304": "farelo_soja", "1701": "acucar", "TOTAL": "total_todas_mercadorias"}
DIR = RAW / "comex"

PORTOS = [  # (regex sobre o nome da URF sem acento, porto, grupo)
    (r"PORTO DE SANTOS|^0817800", "Santos", "Santos"),
    (r"PARANAGUA", "Paranaguá", "Sul-Sudeste"),
    (r"SAO FRANCISCO DO SUL", "São Francisco do Sul", "Sul-Sudeste"),
    (r"ITAJAI", "Itajaí/Navegantes", "Sul-Sudeste"),
    (r"ITAPOA", "Itapoá", "Sul-Sudeste"),
    (r"IMBITUBA", "Imbituba", "Sul-Sudeste"),
    (r"RIO GRANDE", "Rio Grande", "Sul-Sudeste"),
    (r"VITORIA(?! DA CONQUISTA)|TUBARAO", "Vitória", "Sul-Sudeste"),
    (r"ITAGUAI|SEPETIBA", "Itaguaí", "Sul-Sudeste"),
    (r"PORTO DO RIO DE JANEIRO", "Rio de Janeiro", "Sul-Sudeste"),
    (r"SAO LUIS|ITAQUI", "São Luís/Itaqui", "Arco Norte"),
    (r"BARCARENA|VILA DO CONDE", "Barcarena/Vila do Conde", "Arco Norte"),
    (r"PORTO DE BELEM|^0210100|ALF - BELEM", "Belém (ALF Belém despacha também Barcarena/Vila do Conde)", "Arco Norte"),
    (r"SAO SEBASTIAO", "São Sebastião", "Sul-Sudeste"),
    (r"MACEIO", "Maceió", "Nordeste"),
    (r"SANTAREM", "Santarém", "Arco Norte"),
    (r"ITACOATIARA", "Itacoatiara", "Arco Norte"),
    (r"PORTO DE MANAUS|DRF MANAUS", "Manaus", "Arco Norte"),
    (r"SANTANA(?! DO LIVRAMENTO)|MACAPA", "Santana/Macapá", "Arco Norte"),
    (r"SALVADOR|ARATU", "Salvador/Aratu", "Nordeste"),
    (r"PECEM|FORTALEZA", "Pecém/Fortaleza", "Nordeste"),
    (r"SUAPE|RECIFE", "Suape/Recife", "Nordeste"),
]


def sem_acento(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()


def consulta(sh4, ano, ate):
    corpo = {"flow": "export", "monthDetail": True,
             "period": {"from": f"{ano}-01", "to": f"{ano}-{ate:02d}"},
             "filters": [{"filter": "via", "values": ["01", "02"]}],
             "details": ["state", "urf", "via"] + ([] if sh4 == "TOTAL" else ["heading"]),
             "metrics": ["metricFOB", "metricKG"]}
    if sh4 != "TOTAL":
        corpo["filters"].append({"filter": "heading", "values": [sh4]})
    dst = DIR / f"export_{sh4}_{ano}.json"
    return baixa(f"{API}/general", dst, "Comex Stat (MDIC) — API /general, exportação",
                 nota="POST " + json.dumps(corpo, ensure_ascii=False), pausa=3, espera_429=10, tentativas=6,
                 dados=json.dumps(corpo).encode(), headers={"Content-Type": "application/json"})


def main():
    DIR.mkdir(parents=True, exist_ok=True)
    upd = baixa(f"{API}/general/dates/updated", DIR / "dates_updated_20261002.json", "Comex Stat — data de atualização")
    u = json.loads(upd.read_text(encoding="utf-8"))["data"]
    ult_ano, ult_mes = int(u["year"]), int(u["monthNumber"])
    urf = baixa(f"{API}/tables/urf", DIR / "tabela_urf_20261002.json", "Comex Stat — tabela de URF")
    linhas = []
    for sh4, rot in SH4.items():
        for ano in range(2010, ult_ano + 1):
            p = consulta(sh4, ano, 12 if ano < ult_ano else ult_mes)
            if not p:
                print("FALHOU", sh4, ano)
                continue
            for r in json.loads(p.read_text(encoding="utf-8"))["data"]["list"]:
                linhas.append({"produto": rot, "sh4": None if sh4 == "TOTAL" else sh4, "ano": int(r["year"]),
                               "mes": int(r["monthNumber"]), "uf_origem": r["state"], "urf": r["urf"],
                               "urf_codigo": r["urf"].split(" - ")[0], "via": r.get("via"),
                               "fob_usd": float(r["metricFOB"]), "kg": float(r["metricKG"])})
        print(sh4, "ok")
    df = pd.DataFrame(linhas)
    # mapa URF -> porto
    tab = json.loads(urf.read_text(encoding="utf-8"))["data"]
    m = []
    for x in tab:
        nome = sem_acento(x["text"])
        porto = grupo = None
        for rx, p_, g_ in PORTOS:
            if re.search(rx, nome) or re.search(rx, x["id"]):
                porto, grupo = p_, g_
                break
        if "AEROPORTO" in nome:
            porto = grupo = None
        m.append({"urf_codigo": x["id"], "urf_nome": x["text"], "porto": porto, "grupo": grupo,
                  "regra": "regex sobre o nome da URF (ver PORTOS em 07_comex_stat.py); aeroportos excluídos"})
    M = pd.DataFrame(m)
    usadas = set(df.urf_codigo)
    M["aparece_na_extracao"] = M.urf_codigo.isin(usadas)
    M.to_csv(PROC / "mapa_urf_porto.csv", index=False, encoding="utf-8")
    df = df.merge(M[["urf_codigo", "porto", "grupo"]], on="urf_codigo", how="left")
    from _comum import salva
    salva(df, "comex_export_uf_urf_sh4")
    sem = df[df.porto.isna()].groupby("urf").kg.sum().sort_values(ascending=False).head(15)
    print("URFs sem porto (maior kg):\n", sem)


if __name__ == "__main__":
    main()
