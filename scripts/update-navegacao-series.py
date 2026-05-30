"""
Regenera public/data/antaq/dashboard/navegacao-series.json
a partir da API ANTAQ no Railway.

Uso:
    python scripts/update-navegacao-series.py
"""

import json
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://antaq-api-production.up.railway.app"
OUT  = Path(__file__).resolve().parent.parent / "public/data/antaq/dashboard/navegacao-series.json"

TIPOS = {
    "longo":     "Longo Curso",
    "cabotagem": "Cabotagem",
    "interior":  "Interior",
}

SPARK_N = 14  # pontos no sparkline


def fetch(path: str, params: dict) -> dict:
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}{path}?{qs}"
    print(f"  GET {url[:120]}", file=sys.stderr)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())


def build_series() -> dict:
    # 1 – saúde para saber o ultimo_mes disponível
    saude = fetch("/api/v1/saude", {})
    ultimo_mes = saude["ultimo_mes_dados"]
    print(f"API: ultimo_mes = {ultimo_mes}", file=sys.stderr)

    # 2 – série completa para cada tipo
    raw: dict[str, list] = {}
    for key, nav in TIPOS.items():
        print(f"Buscando {nav}…", file=sys.stderr)
        resp = fetch("/api/v1/series", {
            "metrica":            "toneladas",
            "freq":               "mensal",
            "data_inicio":        "2010-01",
            "data_fim":           ultimo_mes,
            "navegacao":          nav,
            "apenas_movimentacao": "true",
            "suavizacao":         "sum12",
        })
        raw[key] = resp["serie"]

    # 3 – alinhar pontos (intersection de datas presentes nos 3)
    datas_por_tipo = {k: {p["data"]: p for p in v} for k, v in raw.items()}
    todas_datas = sorted(
        set(datas_por_tipo["longo"]) &
        set(datas_por_tipo["cabotagem"]) &
        set(datas_por_tipo["interior"])
    )
    if not todas_datas:
        raise RuntimeError("Nenhuma data em comum entre os 3 tipos")

    # 4 – montar serie (Mt = tons / 1e6)
    serie = []
    for d in todas_datas:
        ponto = {"data": d}
        for key in TIPOS:
            val = datas_por_tipo[key][d]["sum12"]
            ponto[key] = round(val / 1e6, 2) if val is not None else None
        serie.append(ponto)

    # 5 – hero: último ponto (ultimo_mes ou o mais recente disponível)
    ultimo_ponto = serie[-1]
    data_ref = ultimo_ponto["data"]

    # ponto de 12 meses atrás para YoY
    idx_ultimo = len(serie) - 1
    idx_yoy = idx_ultimo - 12
    ponto_yoy = serie[idx_yoy] if idx_yoy >= 0 else None

    # spark: últimos SPARK_N pontos de sum12 Mt
    spark_pontos = serie[-SPARK_N:]

    total_12m = sum(
        ultimo_ponto[k] for k in TIPOS if ultimo_ponto[k] is not None
    )

    hero = {}
    for key in TIPOS:
        val = ultimo_ponto[key]
        val_ant = ponto_yoy[key] if ponto_yoy else None
        yoy = round((val - val_ant) / val_ant * 100, 1) if val and val_ant else None
        share = round(val / total_12m * 100, 1) if total_12m else None
        hero[key] = {
            "label":     TIPOS[key],
            "valor_12m": round(val, 1),
            "share_pct": share,
            "yoy_pct":   yoy,
            "spark":     [round(p[key], 1) for p in spark_pontos if p[key] is not None],
        }

    return {
        "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00",
        "fonte":     "ANTAQ — Estatística Aquaviária · soma móvel 12 meses (Mt)",
        "metrica":   "toneladas",
        "suavizacao":"sum12",
        "unidade":   "Mt",
        "ultimo_mes": data_ref,
        "n_pontos":   len(serie),
        "hero": {**hero, "total_12m": round(total_12m, 1)},
        "serie": serie,
    }


if __name__ == "__main__":
    print("=== update-navegacao-series.py ===", file=sys.stderr)
    result = build_series()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ Salvo em {OUT}", file=sys.stderr)
    print(f"  ultimo_mes : {result['ultimo_mes']}", file=sys.stderr)
    print(f"  n_pontos   : {result['n_pontos']}", file=sys.stderr)
    h = result["hero"]
    for k in TIPOS:
        print(f"  {k:10s}: {h[k]['valor_12m']:.1f} Mt | YoY {h[k]['yoy_pct']}% | share {h[k]['share_pct']}%", file=sys.stderr)
    print(f"  total_12m  : {h['total_12m']:.1f} Mt", file=sys.stderr)
