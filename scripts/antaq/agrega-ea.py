#!/usr/bin/env python3
# scripts/antaq/agrega-ea.py
# Agrega o espelho parquet da Estatística Aquaviária (ANTAQ) em dois caches:
#
#   data/antaq/capacidade-semanal.json — DENOMINADOR REAL do IEE:
#     granel sólido vegetal EMBARCADO (mi t/mês) por corredor, com média
#     móvel de 12 meses ÷ 4,345 → capacidade semanal efetiva (mil t/sem).
#
#   data/antaq/espera-semanal.json — MÉTRICA-ALVO do pré-registro:
#     TEsperaAtracacao média (horas) por semana × corredor, apenas
#     atracações que embarcaram grão — série 2016→último mês disponível.
#
# Espelho parquet: gerado pelo projeto GitHub/ANTAQ do IBI (dump da EA).
#   Caminho via env ANTAQ_PARQUET_DIR (default: pasta local do projeto).
#   Cadência: manual, junto do refresh do espelho — o JSON registra
#   "dadosAte" e o leitor TS avisa quando a base envelhecer.
#
# DECISÕES DOCUMENTADAS:
#   - Grão = CDMercadoria (SH4) ∈ {1201 soja, 1005 milho, 1701 açúcar,
#     2304/2302 farelos, 1001 trigo, 1003 cevada, 1007 sorgo},
#     Natureza 'Granel Sólido', Sentido 'Embarcados'.
#   - Corredor = EMBARQUE MARÍTIMO (saída): ETCs fluviais de Miritituba/
#     Porto Velho ficam FORA do arco-norte para não dupla-contar o grão
#     que transborda na entrada da calha e embarca de novo na saída.
#   - Complexo de Santos inclui TIPLAM e Cutrale (instalações do complexo).

import duckdb, json, os, datetime, sys

PARQUET = os.environ.get("ANTAQ_PARQUET_DIR", "/sessions/pensive-great-feynman/mnt/parquet")
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SAIDA = os.path.join(RAIZ, "data", "antaq")

SH4_GRAO = "('1201','1005','1701','2304','2302','1001','1003','1007')"
CORREDORES = {
    "santos": ["Santos", "Terminal Integrador Portuário Luiz Antonio Mesquita - TIPLAM", "Sucocítrico Cutrale", "DP World Santos"],
    "paranagua": ["Paranaguá"],
    "arco-norte": ["Itaqui", "Terminal Vila do Conde", "Terminal Portuário Graneleiro de Barcarena", "Santarém", "Terminal Graneleiro Hermasa"],
}
ANOS = list(range(2016, 2027))
SEM_POR_MES = 4.345
MESES = {m: i+1 for i, m in enumerate(["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"])}

def main():
    con = duckdb.connect()
    carga = " UNION ALL ".join(f"SELECT * FROM '{PARQUET}/Carga/{a}.parquet'" for a in ANOS)
    atrac = " UNION ALL ".join(f"SELECT * FROM '{PARQUET}/Atracacao/{a}.parquet'" for a in ANOS)
    tempos = " UNION ALL ".join(f"SELECT * FROM '{PARQUET}/TemposAtracacao/{a}.parquet'" for a in ANOS)
    portos_map = ", ".join(f"('{p}','{c}')" for c, ps in CORREDORES.items() for p in ps)

    base = f"""
    WITH carga AS ({carga}), atrac AS ({atrac}), tempos AS ({tempos}),
    mapa(porto, corredor) AS (VALUES {portos_map}),
    grao AS (
      SELECT c.IDAtracacao, c.VLPesoCargaBruta, m.corredor, a.Ano, a.Mes,
             a."Data Chegada" AS chegada
      FROM carga c
      JOIN atrac a USING (IDAtracacao)
      JOIN mapa m ON a."Porto Atracação" = m.porto
      WHERE c.Sentido = 'Embarcados' AND c."Natureza da Carga" = 'Granel Sólido'
        AND c.CDMercadoria IN {SH4_GRAO}
    )
    """

    # --- capacidade mensal por corredor -----------------------------------
    mensal = con.execute(base + """
    SELECT corredor, Ano, Mes, round(sum(VLPesoCargaBruta)/1e3, 1) AS mil_t
    FROM grao GROUP BY 1,2,3 ORDER BY 1,2,3
    """).fetchall()

    series = {}
    for corredor, ano, mes, mil_t in mensal:
        mnum = MESES.get(str(mes).strip().lower()[:3], None)
        if mnum is None: continue
        series.setdefault(corredor, []).append((int(ano), mnum, float(mil_t)))

    hoje = datetime.date.today().isoformat()
    capacidade = {"fonte": "ANTAQ — Estatística Aquaviária (espelho parquet IBI, projeto GitHub/ANTAQ)",
                  "metodo": "granel sólido vegetal embarcado (SH4 grão) por corredor; média móvel 12 meses ÷ 4,345 semanas/mês",
                  "decisoes": "embarque MARÍTIMO apenas (ETCs fluviais de Miritituba/Porto Velho excluídos do arco-norte para evitar dupla contagem); complexo Santos inclui TIPLAM e Cutrale",
                  "geradoEm": hoje, "status": "ok", "corredores": {}}
    for corredor, pts in series.items():
        pts.sort()
        ult12 = pts[-12:]
        media_sem = round(sum(p[2] for p in ult12) / len(ult12) / SEM_POR_MES, 0)
        capacidade["corredores"][corredor] = {
            "capacidadeSemanalMilT": media_sem,
            "dadosAte": f"{ult12[-1][0]}-{ult12[-1][1]:02d}",
            "mediaMovel12mMilTMes": round(sum(p[2] for p in ult12) / len(ult12), 0),
            "serieMensalMilT": [[f"{a}-{m:02d}", v] for a, m, v in pts if a >= 2016],
        }
    os.makedirs(SAIDA, exist_ok=True)
    with open(os.path.join(SAIDA, "capacidade-semanal.json"), "w", encoding="utf-8") as f:
        json.dump(capacidade, f, ensure_ascii=False, indent=1)
    print("[capacidade]", {k: v["capacidadeSemanalMilT"] for k, v in capacidade["corredores"].items()},
          "dadosAte:", {k: v["dadosAte"] for k, v in capacidade["corredores"].items()})

    # --- espera semanal por corredor (métrica-alvo) ------------------------
    espera = con.execute(base + """
    , atracoes_grao AS (SELECT DISTINCT IDAtracacao, corredor, chegada FROM grao)
    SELECT g.corredor,
           strftime(date_trunc('week', CAST(g.chegada AS TIMESTAMP)), '%Y-%m-%d') AS semana,
           round(avg(TRY_CAST(replace(t.TEsperaAtracacao, ',', '.') AS DOUBLE)), 1) AS espera_h,
           count(*) AS n
    FROM atracoes_grao g JOIN tempos t USING (IDAtracacao)
    WHERE TRY_CAST(replace(t.TEsperaAtracacao, ',', '.') AS DOUBLE) BETWEEN 0 AND 2000
    GROUP BY 1,2 ORDER BY 1,2
    """).fetchall()

    esperas = {}
    for corredor, semana, h, n in espera:
        if semana and semana >= "2016-01-01":
            esperas.setdefault(corredor, []).append([semana, float(h), int(n)])
    saida2 = {"fonte": "ANTAQ — Estatística Aquaviária, TemposAtracacao (espelho parquet IBI)",
              "metrica": "média de TEsperaAtracacao (horas entre chegada e atracação) das atracações com grão embarcado, por semana de CHEGADA",
              "formato": "[segunda da semana ISO, espera média h, nº atracações]",
              "geradoEm": hoje, "status": "ok", "corredores": esperas}
    with open(os.path.join(SAIDA, "espera-semanal.json"), "w", encoding="utf-8") as f:
        json.dump(saida2, f, ensure_ascii=False, separators=(",", ":"))
    for c, s in esperas.items():
        print(f"[espera] {c}: {len(s)} semanas ({s[0][0]} → {s[-1][0]})")

if __name__ == "__main__":
    sys.exit(main())
