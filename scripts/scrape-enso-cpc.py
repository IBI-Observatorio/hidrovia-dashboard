"""
Scrape do ENSO Diagnostic Discussion (CPC/NOAA).

Fonte: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml
       (URL estável — sempre serve a última discussion mensal)

Cadência: mensal, sempre na 2ª quinta-feira (UTC). A página declara a data
da próxima atualização no corpo (campo "next ENSO Diagnostics Discussion
is scheduled for ...").

Saída: data/enso_cpc_cache.json
       Consumido por lib/enso-cpc.ts → fetchPrevisao2026() → /monitor.

Idempotente: se a data_emissao do scrape for igual à cacheada, não regrava
arquivo (preserva mtime).

Uso:
    python scripts/scrape-enso-cpc.py
"""
from __future__ import annotations

import html as html_lib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT       = Path(__file__).resolve().parent.parent
CACHE_PATH = ROOT / "data" / "enso_cpc_cache.json"
URL        = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml"
UA         = "Mozilla/5.0 (compatible; IBI-Observatorio/1.0; +https://hidrovias.up.railway.app)"

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

# Captura "El Niño Watch", "La Niña Advisory", "Not Active", etc. dentro do
# bloco "ENSO Alert System Status:"
STATUS_RE = re.compile(
    r"ENSO Alert System Status:.*?<span[^>]*>(.*?)</span>",
    re.IGNORECASE | re.DOTALL,
)

# Captura data tipo "14 May 2026" no cabeçalho
DATA_RE = re.compile(
    r"(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})"
)

# Captura "next ENSO Diagnostics Discussion is scheduled for 11 June 2026"
PROXIMA_RE = re.compile(
    r"next\s+ENSO\s+Diagnostics?\s+Discussion[^.]*scheduled\s+for\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})",
    re.IGNORECASE,
)

# Captura a síntese — última frase com "X% chance" (rodar APÓS decodificar entities)
SINTESE_RE = re.compile(
    r"(?:El\s+Ni[ñn]o|La\s+Ni[ñn]a|ENSO[^.]*?neutral)[^.]*?\d{1,3}\s*%\s*chance[^.]*\.",
    re.IGNORECASE,
)

MESES_EN_NUM = {
    "January":1, "February":2, "March":3, "April":4, "May":5, "June":6,
    "July":7, "August":8, "September":9, "October":10, "November":11, "December":12,
}
MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]


def limpa_html(s: str) -> str:
    """Remove tags HTML simples e decodifica entidades comuns."""
    s = re.sub(r"<[^>]+>", "", s)
    s = (s.replace("&amp;", "&")
          .replace("&nbsp;", " ")
          .replace("&ntilde;", "ñ")
          .replace("&#37;", "%")
          .replace("&iacute;", "í"))
    return re.sub(r"\s+", " ", s).strip()


def data_iso(dia: str, mes_en: str, ano: str) -> str:
    return f"{ano}-{MESES_EN_NUM[mes_en]:02d}-{int(dia):02d}"


def data_pt_curta(iso: str) -> str:
    """'2026-05-14' → '14/mai/2026'."""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", iso)
    if not m:
        return iso
    y, mo, d = m.groups()
    return f"{int(d):02d}/{MESES_PT[int(mo) - 1]}/{y}"


def parse_html(html: str) -> dict | None:
    status_m = STATUS_RE.search(html)
    data_m   = DATA_RE.search(html)
    if not (status_m and data_m):
        print("ERRO: não encontrei status/data na página", file=sys.stderr)
        return None

    status   = limpa_html(status_m.group(1))
    data_em  = data_iso(*data_m.groups())

    prox_m = PROXIMA_RE.search(html)
    prox   = data_iso(*prox_m.groups()) if prox_m else None

    # Decodifica entities e remove tags ANTES do parse de síntese — caso
    # contrário "(82&#37; chance" não casa com r"\d+\s*%\s*chance".
    texto = html_lib.unescape(re.sub(r"<[^>]+>", " ", html))
    texto = re.sub(r"\s+", " ", texto)

    sint_m  = SINTESE_RE.search(texto)
    sint_en = sint_m.group(0).strip() if sint_m else ""

    # Sintetiza texto PT pra UI: extrai % das duas janelas mais citadas.
    # Padrão típico: "82% chance in May-July 2026" e "96% chance in December 2026-February 2027"
    pcts = re.findall(
        r"(\d{1,3})\s*%\s*chance\s+in\s+([A-Za-z]+)(?:-([A-Za-z]+))?\s+(\d{4})(?:-([A-Za-z]+\s+\d{4}))?",
        sint_en,
    )
    janelas_pt: list[str] = []
    for pct, m1, m2, ano1, ano2_full in pcts[:2]:
        ini = MESES_EN_NUM.get(m1)
        fim = MESES_EN_NUM.get(m2) if m2 else ini
        if ini is None:
            continue
        rotulo = f"{MESES_PT[ini-1]}–{MESES_PT[fim-1]}/{ano1[-2:]}"
        if ano2_full:
            # janela cruza ano (ex: "December 2026-February 2027")
            m2b = re.match(r"([A-Za-z]+)\s+(\d{4})", ano2_full)
            if m2b:
                fim2 = MESES_EN_NUM.get(m2b.group(1))
                ano_fim = m2b.group(2)
                if fim2 is not None:
                    rotulo = f"{MESES_PT[ini-1]}/{ano1[-2:]}–{MESES_PT[fim2-1]}/{ano_fim[-2:]}"
        janelas_pt.append(f"{pct}% {rotulo}")

    if janelas_pt:
        sint_pt = f"{status} — {'; '.join(janelas_pt)} (CPC/NOAA, {data_pt_curta(data_em)})"
    else:
        sint_pt = f"{status} (CPC/NOAA, {data_pt_curta(data_em)})"

    return {
        "status":              status,
        "data_emissao":        data_em,
        "sintese_pt":          sint_pt,
        "sintese_en":          sint_en,
        "proxima_atualizacao": prox,
        "url":                 URL,
        "atualizado_em":       datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    try:
        r = requests.get(URL, headers={"User-Agent": UA}, timeout=20)
        r.raise_for_status()
    except Exception as e:
        print(f"ERRO ao baixar {URL}: {e}", file=sys.stderr)
        return 2

    novo = parse_html(r.text)
    if novo is None:
        return 3

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Idempotência: se data_emissao igual, não regrava (só atualiza
    # `atualizado_em` se quisermos ver que o cron passou — opcional).
    if CACHE_PATH.exists():
        try:
            atual = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            if atual.get("data_emissao") == novo["data_emissao"]:
                print(f"ENSO sem novidade: {novo['status']} ({novo['data_emissao']})")
                return 0
        except Exception:
            pass

    CACHE_PATH.write_text(
        json.dumps(novo, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"ENSO atualizado: {novo['status']} ({novo['data_emissao']})")
    print(f"  proxima: {novo['proxima_atualizacao']}")
    print(f"  sintese: {novo['sintese_pt']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
