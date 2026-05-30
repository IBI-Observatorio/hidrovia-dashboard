"""
Scraper dos Boletins Hidrológicos do SACE/SGB para bacias amazônicas.

Baixa PDFs de maio/2026 e extrai texto + dados estruturados (cotas,
tendências, alertas) para uso no Observatório de Infraestrutura.

Bacias: Amazonas, Madeira, Acre, Branco, Xingu.
Saída : public/data/sace/boletins/{bacia}/{YYYYMMDD}.pdf
        public/data/sace/boletins/{bacia}/{YYYYMMDD}.txt
        public/data/sace/boletins/index.json
"""
from __future__ import annotations

import json
import re
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from urllib.parse import quote

import requests
import pdfplumber

BASE = "https://www.sgb.gov.br/sace"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MES_ALVO = "202605"  # maio/2026

BACIAS = {
    "Amazonas": f"{BASE}/amazonas_boletins.php",
    "Madeira":  f"{BASE}/madeira_boletins.php",
    "Acre":     f"{BASE}/boletins.php?idbacia=6",
    "Branco":   f"{BASE}/boletins.php?idbacia=11",
    "Xingu":    f"{BASE}/boletins.php?idbacia=12",
}

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "data" / "sace" / "boletins"

PDF_HREF_RE = re.compile(r"href=['\"](boletins/[^'\"]+\.pdf)['\"]", re.IGNORECASE)
TITULO_RE = re.compile(r"(\d+[ºo°]\s*BOLETIM[^<\n]*)", re.IGNORECASE)


@dataclass
class Boletim:
    bacia: str
    data: str           # YYYY-MM-DD
    numero: str | None  # "18°", etc
    titulo: str | None
    pdf_url: str
    pdf_path: str
    txt_path: str
    paginas: int
    bytes: int


def fetch_listing(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text


def extrair_pdfs_do_mes(html: str, mes_prefix: str) -> list[str]:
    hrefs = PDF_HREF_RE.findall(html)
    return [h for h in hrefs if Path(h).name.startswith(mes_prefix)]


def baixar_pdf(href: str, destino: Path) -> int:
    # href vem com espaços não-encoded — precisa montar URL com quote no path
    rel = href.lstrip("./")
    encoded = "/".join(quote(p) for p in rel.split("/"))
    url = f"{BASE}/{encoded}"
    r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(r.content)
    return len(r.content)


def extrair_texto(pdf_path: Path) -> tuple[str, int]:
    with pdfplumber.open(pdf_path) as pdf:
        paginas = len(pdf.pages)
        texto = "\n\n--- PAG ---\n\n".join(
            (p.extract_text() or "") for p in pdf.pages
        )
    return texto, paginas


def parse_titulo(texto: str) -> tuple[str | None, str | None]:
    m = TITULO_RE.search(texto)
    if not m:
        return None, None
    titulo = m.group(1).strip()
    num_m = re.match(r"(\d+[ºo°])", titulo)
    return (num_m.group(1) if num_m else None), titulo


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    indice: list[Boletim] = []
    total_bytes = 0

    for bacia, url in BACIAS.items():
        print(f"\n=== {bacia} ===")
        try:
            html = fetch_listing(url)
        except Exception as e:
            print(f"  ERRO listagem: {e}")
            continue

        hrefs = extrair_pdfs_do_mes(html, MES_ALVO)
        print(f"  {len(hrefs)} boletins em {MES_ALVO[:4]}-{MES_ALVO[4:]}")

        for href in hrefs:
            fname = Path(href).name              # e.g. "20260526_16-20260526 - 163258.pdf"
            data_yyyymmdd = fname[:8]
            data_iso = f"{data_yyyymmdd[:4]}-{data_yyyymmdd[4:6]}-{data_yyyymmdd[6:8]}"

            bacia_dir = OUT_DIR / bacia.lower()
            pdf_out = bacia_dir / f"{data_yyyymmdd}.pdf"
            txt_out = bacia_dir / f"{data_yyyymmdd}.txt"

            if pdf_out.exists():
                size = pdf_out.stat().st_size
                print(f"  [cache] {data_iso} ({size//1024} KB)")
            else:
                try:
                    size = baixar_pdf(href, pdf_out)
                    print(f"  baixado {data_iso} ({size//1024} KB)")
                    time.sleep(0.5)
                except Exception as e:
                    print(f"  ERRO download {data_iso}: {e}")
                    continue

            try:
                texto, paginas = extrair_texto(pdf_out)
                txt_out.write_text(texto, encoding="utf-8")
                numero, titulo = parse_titulo(texto)
            except Exception as e:
                print(f"  ERRO extração {data_iso}: {e}")
                texto, paginas, numero, titulo = "", 0, None, None

            indice.append(Boletim(
                bacia=bacia,
                data=data_iso,
                numero=numero,
                titulo=titulo,
                pdf_url=f"{BASE}/{quote(href.lstrip('./').split('/')[0])}/" + "/".join(quote(p) for p in href.lstrip('./').split('/')[1:]),
                pdf_path=str(pdf_out.relative_to(ROOT)).replace("\\", "/"),
                txt_path=str(txt_out.relative_to(ROOT)).replace("\\", "/"),
                paginas=paginas,
                bytes=size,
            ))
            total_bytes += size

    # Ordena por bacia + data desc
    indice.sort(key=lambda b: (b.bacia, b.data), reverse=False)

    indice_path = OUT_DIR / "index.json"
    indice_path.write_text(
        json.dumps(
            {
                "mes": f"{MES_ALVO[:4]}-{MES_ALVO[4:]}",
                "total": len(indice),
                "bytes_total": total_bytes,
                "boletins": [asdict(b) for b in indice],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n-> {len(indice)} boletins | {total_bytes/1024/1024:.1f} MB")
    print(f"-> indice: {indice_path.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
