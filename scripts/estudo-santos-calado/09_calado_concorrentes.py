"""T6 — Calado histórico dos portos concorrentes (página atual + capturas do Wayback).

Para cada porto, as páginas oficiais em que a autoridade portuária publica o calado. Lista as capturas
pela API CDX, baixa uma por digest distinto (no máximo uma por mês, para não sobrecarregar o Wayback)
e extrai os valores de calado com regra genérica: toda ocorrência de "calado" seguida, em até 160
caracteres, de um número "NN,NN m". O trecho/berço a que o valor se refere fica no texto de contexto.
A extração é AUTOMÁTICA e genérica (formatos variam muito entre portos): `calado_concorrentes_painel`
traz o valor impresso + contexto para revisão; nada é inferido. Mesma regra de vigência da T2: só a
data impressa vale; a data da captura não é vigência.

Saídas: raw/concorrentes/<porto>/..., processed/calado_concorrentes_painel.parquet,
        processed/calado_concorrentes_fontes.csv
"""
from __future__ import annotations

import io
import json
import re
import urllib.parse

import pandas as pd

from _comum import RAW, PROC, baixa, salva, agora

FONTES = [  # só URLs confirmadas (link canônico da Fase 0 ou busca em 02/10/2026)
    ("Paranaguá", "APPA / Portos do Paraná", "www.portosdoparana.pr.gov.br/Operacional/Pagina/Calados"),
    ("Rio Grande", "Portos RS", "www.portosrs.com.br/site/public/uploads/site/normativas/259.pdf"),
    ("São Francisco do Sul", "SCPar / APSFS", "portosaofrancisco.com.br/caracteristicas/"),
    ("Itaqui", "EMAP", "www.portodoitaqui.com.br/porto-do-itaqui/infraestrutura"),
    ("Itaqui", "EMAP", "www.portodoitaqui.com.br/_files/arquivos/manual-porto-do-itaqui.pdf"),
]
DIR = RAW / "concorrentes"
HOJE = agora()[:10].replace("-", "")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:60]


def texto_de(p):
    b = p.read_bytes()
    if b[:4] == b"%PDF":
        try:
            import pypdf
            return "\n".join((pg.extract_text() or "") for pg in pypdf.PdfReader(io.BytesIO(b)).pages)
        except Exception as e:
            return f"[pdf ilegível: {e}]"
    try:
        s = b.decode("utf-8")
    except UnicodeDecodeError:
        s = b.decode("latin-1")
    s = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", " ", s, flags=re.S | re.I)
    import html as H
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", s)))


def extrai(txt):
    out = []
    for m in re.finditer(r"calado", txt, flags=re.I):
        janela = txt[m.start(): m.start() + 160]
        for n in re.finditer(r"(\d{1,2})[,\.](\d{1,2})\s?m\b", janela):
            v = float(f"{n.group(1)}.{n.group(2)}")
            if 5 <= v <= 25:
                out.append({"calado_m": v, "contexto": txt[max(0, m.start() - 120): m.start() + 160].strip()})
    vig = re.findall(r"(?:vig[eê]ncia|em vigor|a partir de)[^.]{0,60}?(\d{1,2}/\d{1,2}/\d{4})", txt, flags=re.I)
    return out, vig


def extrai_canal_paranagua(txt):
    """Paranaguá: calado máximo do canal de acesso principal, como impresso (2 formatos de página)."""
    out = []
    for rx, local in [(r"Canal da Galheta\s+(\d{1,2},\d{1,2})", "Canal da Galheta"),
                      (r"PRINCIPAL\s+Entre as boias(?:(?!ALTERNATIVO).)*?\s(\d{1,2},\d{1,2})\b", "Canal principal (boias 28A–31)"),
                      (r"ALTERNATIVO SUL \(SURDINHO\)[^0-9]+?218\.\s*(\d{1,2},\d{1,2})", "Canal alternativo Sul (Surdinho)")]:
        for m in re.finditer(rx, txt):
            out.append({"calado_m": float(m.group(1).replace(",", ".")), "local": local,
                        "contexto": txt[max(0, m.start() - 60): m.end() + 40].strip()})
    return out


def main():
    linhas, fontes = [], []
    for porto, autoridade, url in FONTES:
        d = DIR / slug(porto) / slug(url.split("/", 1)[-1] or url)
        atual = baixa("https://" + url, d / f"atual_{HOJE}" , f"{autoridade} — página/documento de calado (atual)")
        q = urllib.parse.urlencode({"url": url, "output": "json", "filter": "statuscode:200",
                                    "fl": "timestamp,original,digest,mimetype"})
        cdx = baixa(f"https://web.archive.org/cdx/search/cdx?{q}", d / f"cdx_{HOJE}.json",
                    "Internet Archive — API CDX", pausa=2)
        regs = []
        if cdx:
            try:
                L = json.loads(cdx.read_text(encoding="utf-8") or "[]")
                regs = [dict(zip(L[0], r)) for r in L[1:]] if L else []
            except json.JSONDecodeError:
                regs = []
        vistos, meses = set(), set()
        caps = []
        for r in regs:
            if r["digest"] in vistos or r["timestamp"][:6] in meses:
                continue
            vistos.add(r["digest"]); meses.add(r["timestamp"][:6])
            p = baixa(f"https://web.archive.org/web/{r['timestamp']}id_/{r['original']}", d / "wayback" / r["timestamp"],
                      "Internet Archive — Wayback Machine", nota=f"captura {r['timestamp']} de {r['original']}; não é vigência",
                      pausa=1.5)
            if p:
                caps.append((r["timestamp"], p, "wayback"))
        if atual:
            caps.append((HOJE + "000000", atual, "atual"))
        fontes.append({"porto": porto, "autoridade": autoridade, "url": url, "capturas_cdx": len(regs),
                       "baixadas": len(caps), "atual_ok": bool(atual)})
        for ts, p, tipo in caps:
            tx = texto_de(p)
            vals, vig = extrai(tx)
            vals = [{**v, "local": None, "regra_extracao": "generica"} for v in vals]
            if porto == "Paranaguá":
                vals += [{**v, "regra_extracao": "canal_paranagua"} for v in extrai_canal_paranagua(tx)]
            for v in vals:
                linhas.append({"porto": porto, "autoridade": autoridade, "url": url, "captura_ts": ts, "tipo_captura": tipo,
                               "arquivo": p.relative_to(DIR).as_posix(), **v,
                               "datas_vigencia_impressas": "; ".join(vig) or None})
        print(porto, url, len(regs), "capturas CDX,", len(caps), "baixadas")
    # brutos da Fase 0 (30/09/2026) já em raw/concorrentes/fase0/
    F0 = {"20260930_paranagua_calado.html": "Paranaguá", "riogrande_normativa_259.pdf": "Rio Grande",
          "itaqui_manual.pdf": "Itaqui", "vila_do_conde_rep.pdf": "Vila do Conde/Belém"}
    for nome, porto in F0.items():
        p = DIR / "fase0" / nome
        if p.exists():
            vals, vig = extrai(texto_de(p))
            for v in vals:
                linhas.append({"porto": porto, "autoridade": None, "url": None, "captura_ts": "20260930000000",
                               "tipo_captura": "fase0", "arquivo": p.relative_to(DIR).as_posix(), **v,
                               "datas_vigencia_impressas": "; ".join(vig) or None})
    F = pd.DataFrame(fontes)
    F.to_csv(PROC / "calado_concorrentes_fontes.csv", index=False, encoding="utf-8")
    P = pd.DataFrame(linhas)
    if len(P):
        P = P.drop_duplicates(["porto", "url", "captura_ts", "calado_m", "contexto"])
        P["revisado"] = False
    salva(P, "calado_concorrentes_painel")


if __name__ == "__main__":
    main()
