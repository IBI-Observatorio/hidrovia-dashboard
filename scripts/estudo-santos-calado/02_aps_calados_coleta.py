"""T2 (coleta) — Tabela de calados da APS: página atual + todas as capturas do Wayback Machine.

Páginas da APS que publicaram a tabela de calados ao longo do tempo (descobertas via CDX):
  1998–2003  /calado.html, /authority/infra/calado.html
  2009–2018  /calado.php
  2018–2020  /outros-links/calado-maximo-operacional/
  2021–hoje  /informacoes-operacionais/operacoes-portuarias/calados-operacionais-dos-bercos-de-atracacao/

Para cada página: lista as capturas pela API CDX (status 200), baixa uma por digest distinto em
modo "id_" (HTML original, sem a barra do Wayback) e registra no manifest.
A data da captura NÃO é data de vigência — a vigência só vem do que estiver impresso no documento.
"""
from __future__ import annotations

import json
import urllib.parse

from _comum import RAW, baixa, registra, agora

PAGINAS = {
    "calado_html_1998": "www.portodesantos.com.br/calado.html",
    "authority_infra_2000": "www.portodesantos.com.br/authority/infra/calado.html",
    "calado_php_2009": "www.portodesantos.com.br/calado.php",
    "calado_maximo_operacional_2018": "www.portodesantos.com.br/outros-links/calado-maximo-operacional/",
    "calados_operacionais_2021": "www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/calados-operacionais-dos-bercos-de-atracacao/",
}
ATUAL = "https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/calados-operacionais-dos-bercos-de-atracacao/"

DIR = RAW / "aps_calados"


def main():
    DIR.mkdir(parents=True, exist_ok=True)
    # página atual (captura própria)
    hoje = agora()[:10].replace("-", "")
    baixa(ATUAL, DIR / "atual" / f"{hoje}_calados_operacionais.html",
          "APS — Calados Operacionais dos Berços de Atracação (página atual)")

    for slug, url in PAGINAS.items():
        q = urllib.parse.urlencode({"url": url, "output": "json", "filter": "statuscode:200",
                                    "fl": "timestamp,original,statuscode,digest,length,mimetype"})
        cdx_url = f"https://web.archive.org/cdx/search/cdx?{q}"
        cdx_arq = DIR / "cdx" / f"{slug}_{hoje}.json"
        p = baixa(cdx_url, cdx_arq, "Internet Archive — API CDX (lista de capturas)", pausa=2)
        if not p:
            print("CDX falhou:", slug)
            continue
        linhas = json.loads(p.read_text(encoding="utf-8") or "[]")
        if not linhas:
            continue
        cab, regs = linhas[0], [dict(zip(linhas[0], r)) for r in linhas[1:]]
        vistos = set()
        for r in regs:
            if r["digest"] in vistos:
                continue
            vistos.add(r["digest"])
            arq = DIR / "wayback" / slug / f"{r['timestamp']}.html"
            wb = f"https://web.archive.org/web/{r['timestamp']}id_/{r['original']}"
            ok = baixa(wb, arq, "Internet Archive — Wayback Machine (captura da página da APS)",
                       nota=f"captura {r['timestamp']} de {r['original']}; digest {r['digest']}; "
                            "data da captura não é data de vigência", pausa=1.5)
            print(slug, r["timestamp"], "ok" if ok else "FALHOU")


if __name__ == "__main__":
    main()
