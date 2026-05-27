"""
Pipeline SACE — executa toda terça-feira via schedule.

Fonte de verdade dos níveis: ANA API (lib/fetch-dados.ts).
O SACE é suplementar: alertas, síntese textual, chuva, tendência/previsão.

Etapas:
  1. Detecta mês corrente (e mês anterior se estivermos antes do dia 7)
  2. Baixa boletins das bacias amazônicas (Amazonas, Madeira, Acre, Branco, Xingu)
  3. Parseia PDFs → JSON estruturado por estação
  4. Gera public/data/sace/boletins/latest.json  (última leitura por estação)
  5. Gera public/data/sace/boletins/dados.json   (todos os boletins do mês)

NÃO modifica lib/dados-historicos.ts — cota_m e variacao_24h vêm da ANA.

Uso:
  python scripts/pipeline-sace.py              # mês atual
  python scripts/pipeline-sace.py --mes 202604 # mês específico
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import quote

import pdfplumber
import requests

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

BASE    = "https://www.sgb.gov.br/sace"
UA      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
ROOT    = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "data" / "sace" / "boletins"

BACIAS = {
    "Amazonas": f"{BASE}/amazonas_boletins.php",
    "Madeira":  f"{BASE}/madeira_boletins.php",
    "Acre":     f"{BASE}/boletins.php?idbacia=6",
    "Branco":   f"{BASE}/boletins.php?idbacia=11",
    "Xingu":    f"{BASE}/boletins.php?idbacia=12",
}

LOG_PATH = ROOT / "public" / "data" / "sace" / "pipeline.log"

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class Estacao:
    rio:               str | None
    estacao:           str
    municipio:         str | None    = None
    nivel_cm:          int | None    = None
    variacao_cm:       int | None    = None
    variacao_periodo:  str | None    = None
    data_medicao:      str | None    = None
    hora_medicao:      str | None    = None
    cota_inundacao_cm: int | None    = None
    cota_mediana_cm:   int | None    = None
    chuva_24h_mm:      float | None  = None
    chuva_96h_mm:      float | None  = None
    previsao:          str | None    = None
    observacoes:       str | None    = None


@dataclass
class BoletimParsed:
    bacia:    str
    data:     str
    numero:   str | None
    titulo:   str | None
    pdf_path: str
    sintese:  str | None
    estacoes: list[Estacao] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def to_int(s: str | None) -> int | None:
    if not s: return None
    s = s.strip().replace(",", ".")
    if s in {"-", "#", "*", "///"}: return None
    try: return int(float(s))
    except ValueError: return None


def to_float(s: str | None) -> float | None:
    if not s: return None
    s = s.strip().replace(",", ".")
    if s in {"-", "#", "*", "///"}: return None
    try: return float(s)
    except ValueError: return None


def clean(s: str | None) -> str | None:
    return (s.replace("\n", " ").strip() or None) if s else None


def parse_data_hora_br(s: str | None) -> tuple[str | None, str | None]:
    if not s: return None, None
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?", s)
    if not m: return None, None
    d, mo, y = m.group(1), m.group(2), m.group(3)
    hora = f"{int(m.group(4)):02d}:{m.group(5)}" if m.group(4) else None
    return f"{y}-{mo}-{d}", hora


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Step 1: Scrape — baixa PDFs do mês
# ---------------------------------------------------------------------------

PDF_HREF_RE = re.compile(r"href=['\"](?:\./|/)?(boletins/[^'\"]+\.pdf)['\"]", re.IGNORECASE)
TITULO_RE   = re.compile(r"(\d+[ºo°]\s*BOLETIM[^\n<]*)", re.IGNORECASE)


def pdf_hrefs_do_mes(url: str, mes_prefix: str) -> list[str]:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    hrefs = PDF_HREF_RE.findall(r.text)
    return [h for h in hrefs if Path(h).name.startswith(mes_prefix)]


def baixar_pdf(href: str, destino: Path) -> int:
    encoded = "/".join(quote(p) for p in href.split("/"))
    url = f"{BASE}/{encoded}"
    r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(r.content)
    return len(r.content)


def scrape(mes_prefix: str) -> list[dict]:
    """Baixa boletins do mês. Retorna lista de metadados."""
    log(f"== SCRAPE {mes_prefix[:4]}-{mes_prefix[4:]} ==")
    index: list[dict] = []
    total_bytes = 0

    for bacia, url in BACIAS.items():
        try:
            hrefs = pdf_hrefs_do_mes(url, mes_prefix)
        except Exception as e:
            log(f"  ERRO listagem {bacia}: {e}")
            continue
        log(f"  {bacia}: {len(hrefs)} boletins")

        for href in hrefs:
            fname       = Path(href).name
            data_yyyymm = fname[:8]
            data_iso    = f"{data_yyyymm[:4]}-{data_yyyymm[4:6]}-{data_yyyymm[6:8]}"
            bacia_dir   = OUT_DIR / bacia.lower()
            pdf_out     = bacia_dir / f"{data_yyyymm}.pdf"
            txt_out     = bacia_dir / f"{data_yyyymm}.txt"

            if pdf_out.exists():
                size = pdf_out.stat().st_size
                log(f"    [cache] {bacia} {data_iso} ({size//1024} KB)")
            else:
                try:
                    size = baixar_pdf(href, pdf_out)
                    log(f"    baixado {bacia} {data_iso} ({size//1024} KB)")
                    time.sleep(0.4)
                except Exception as e:
                    log(f"    ERRO download {bacia} {data_iso}: {e}")
                    continue

            # Extrai texto
            if not txt_out.exists():
                try:
                    with pdfplumber.open(pdf_out) as pdf:
                        paginas = len(pdf.pages)
                        texto = "\n\n--- PAG ---\n\n".join(
                            (p.extract_text() or "") for p in pdf.pages
                        )
                    txt_out.write_text(texto, encoding="utf-8")
                except Exception as e:
                    log(f"    ERRO texto {bacia} {data_iso}: {e}")
                    paginas, texto = 0, ""
            else:
                texto   = txt_out.read_text(encoding="utf-8")
                paginas = texto.count("--- PAG ---") + 1

            # Título
            m = TITULO_RE.search(texto)
            titulo = clean(m.group(1)) if m else None
            num_m  = re.match(r"(\d+[ºo°])", titulo) if titulo else None
            numero = num_m.group(1) if num_m else None

            # URL pública
            encoded_href = "/".join(quote(p) for p in href.split("/"))
            pdf_url = f"{BASE}/{encoded_href}"

            entry = dict(
                bacia=bacia, data=data_iso, numero=numero, titulo=titulo,
                pdf_url=pdf_url,
                pdf_path=str(pdf_out.relative_to(ROOT)).replace("\\", "/"),
                txt_path=str(txt_out.relative_to(ROOT)).replace("\\", "/"),
                paginas=paginas, bytes=size,
            )
            index.append(entry)
            total_bytes += size

    index.sort(key=lambda b: (b["bacia"], b["data"]))
    idx_path = OUT_DIR / "index.json"
    existing: list[dict] = []
    if idx_path.exists():
        try:
            existing = json.loads(idx_path.read_text(encoding="utf-8")).get("boletins", [])
        except Exception:
            pass
    # Merge: mantém entradas de outros meses
    outro_mes = [e for e in existing if not e["data"].startswith(mes_prefix[:4] + "-" + mes_prefix[4:])]
    merged = sorted(outro_mes + index, key=lambda b: (b["bacia"], b["data"]))
    idx_path.write_text(
        json.dumps({"mes_atual": f"{mes_prefix[:4]}-{mes_prefix[4:]}",
                    "total": len(merged),
                    "bytes_total": total_bytes,
                    "boletins": merged},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"  -> {len(index)} boletins de {mes_prefix[:4]}-{mes_prefix[4:]} | {total_bytes/1024/1024:.1f} MB")
    return index


# ---------------------------------------------------------------------------
# Step 2: Parse — extrai dados estruturados dos PDFs
# ---------------------------------------------------------------------------

def parse_amazonas(pdf_path: Path) -> list[Estacao]:
    estacoes: list[Estacao] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 2: continue
                header = " ".join((c or "") for c in table[0]).lower()
                if "rio" not in header: continue
                for row in table[1:]:
                    if len(row) < 5: continue
                    rio, est = clean(row[0]), clean(row[1])
                    nivel, var24h = to_int(row[2]), to_int(row[3])
                    data, _ = parse_data_hora_br(row[4])
                    if not est or nivel is None: continue
                    estacoes.append(Estacao(rio=rio, estacao=est, nivel_cm=nivel,
                                            variacao_cm=var24h, variacao_periodo="24h",
                                            data_medicao=data))
    return estacoes


def parse_madeira(pdf_path: Path) -> list[Estacao]:
    estacoes: list[Estacao] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 3: continue
                if "esta" not in " ".join((c or "") for c in table[0]).lower(): continue
                for row in table[1:]:
                    if not row or all(c is None or not str(c).strip() for c in row): continue
                    nome = clean(row[0])
                    if not nome or nome.lower().startswith(("nome", "cota", "(cm)")): continue
                    if len(row) < 7: continue
                    rio, municipio = clean(row[1]), clean(row[2])
                    data, hora = parse_data_hora_br(row[3])
                    nivel, var7d = to_int(row[4]), to_int(row[5])
                    mediana = to_int(row[6])
                    previsao = clean(row[7]) if len(row) > 7 else None
                    if nivel is None: continue
                    estacoes.append(Estacao(rio=rio, estacao=nome, municipio=municipio,
                                            nivel_cm=nivel, variacao_cm=var7d,
                                            variacao_periodo="7d",
                                            data_medicao=data, hora_medicao=hora,
                                            cota_mediana_cm=mediana, previsao=previsao))
    return estacoes


def parse_branco(pdf_path: Path) -> list[Estacao]:
    estacoes: list[Estacao] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 3: continue
                if "esta" not in " ".join((c or "") for c in table[0]).lower(): continue
                for row in table[1:]:
                    if not row or all(c is None or not str(c).strip() for c in row): continue
                    nome = clean(row[0])
                    if not nome or nome.lower().startswith(("nome", "(cm)")): continue
                    if len(row) < 6: continue
                    rio, municipio = clean(row[1]), clean(row[2])
                    data, hora = parse_data_hora_br(row[3])
                    nivel, var24h = to_int(row[4]), to_int(row[5])
                    obs = clean(row[6]) if len(row) > 6 else None
                    cota_inund = None
                    if obs:
                        mi = re.search(r"inunda[çc][ãa]o\s*[:=]?\s*(\d+)", obs, re.I)
                        if mi: cota_inund = int(mi.group(1))
                    if nivel is None: continue
                    estacoes.append(Estacao(rio=rio, estacao=nome, municipio=municipio,
                                            nivel_cm=nivel, variacao_cm=var24h,
                                            variacao_periodo="24h",
                                            data_medicao=data, hora_medicao=hora,
                                            cota_inundacao_cm=cota_inund, observacoes=obs))
    return estacoes


ESTACOES_ACRE = [
    ("ASSIS BRASIL",               "ASSIS BRASIL"),
    ("BRASILÉIA / EPITACIOLÂNDIA", "BRASILÉIA"),
    ("XAPURI",                     "XAPURI"),
    ("RIO BRANCO",                 "RIO BRANCO"),
]
RE_ACRE_LINHA = re.compile(
    r"(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})\s+"
    r"([\d,]+|\*)\s+([\d,]+|\*)\s+"
    r"(-?\d+|\*|#)\s+(-?\d+|\*|#)\s+(\d+|\*|#)"
)

def parse_acre(pdf_path: Path, txt_path: Path) -> list[Estacao]:
    if not txt_path.exists(): return []
    texto = txt_path.read_text(encoding="utf-8")
    prefixo_para = {
        "ASSIS BRASIL ASSIS BRASIL":    ("ASSIS BRASIL",               "ASSIS BRASIL"),
        "BRASILÉIA":                    ("BRASILÉIA / EPITACIOLÂNDIA", "BRASILÉIA"),
        "XAPURI XAPURI":                ("XAPURI",                     "XAPURI"),
        "RIO BRANCO RIO BRANCO":        ("RIO BRANCO",                 "RIO BRANCO"),
    }
    RE_LINHA = re.compile(
        r"^(.+?)\s+(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})\s+"
        r"([\d,]+|\*)\s+([\d,]+|\*)\s+(-?\d+|\*|#)\s+(-?\d+|\*|#)\s+(\d+|\*|#)\s*$",
        re.MULTILINE,
    )
    estacoes: list[Estacao] = []
    for m in RE_LINHA.finditer(texto):
        prefix_raw, data, hora, ch24, ch96, nivel, var, ci = m.groups()
        prefix = " ".join(prefix_raw.upper().split())
        if prefix not in prefixo_para: continue
        est, mun = prefixo_para[prefix]
        data_iso, _ = parse_data_hora_br(f"{data} {hora}")
        estacoes.append(Estacao(rio="Acre", estacao=est, municipio=mun,
                                data_medicao=data_iso, hora_medicao=hora,
                                chuva_24h_mm=to_float(ch24), chuva_96h_mm=to_float(ch96),
                                nivel_cm=to_int(nivel), variacao_cm=to_int(var),
                                variacao_periodo="24h", cota_inundacao_cm=to_int(ci)))
    return estacoes


def parse_xingu(pdf_path: Path, txt_path: Path) -> list[Estacao]:
    if not txt_path.exists(): return []
    texto = txt_path.read_text(encoding="utf-8")
    patterns = [
        ("Xingu",  "Altamira",      "Altamira",
         r"esta[çc][ãa]o de Altamira[\s\S]*?(ELEVOU|REDUZ|redu[çc][ãa]o)[\s\S]{0,80}?(\d+)\s*cm"),
        ("Iriri",  "Pedra do Ó",    None,
         r"Pedra do Ó[\s\S]{0,300}?(redu[çc][ãa]o|eleva[çc][ãa]o)[\s\S]{0,30}?de\s+(\d+)\s*cm"),
        ("Fresco", "Boa Esperança", None,
         r"Boa Esperan[çc]a[\s\S]{0,300}?(redu[çc][ãa]o|eleva[çc][ãa]o)[\s\S]{0,30}?de\s+(\d+)\s*cm"),
        ("Xingu",  "Boa Sorte",     "São Félix do Xingu",
         r"Boa Sorte[\s\S]{0,300}?(reduziu|elevou)\s+(\d+)\s*cm"),
    ]
    estacoes: list[Estacao] = []
    for rio, est, mun, pat in patterns:
        m = re.search(pat, texto, re.IGNORECASE)
        if not m: continue
        verbo, valor = m.group(1).lower(), int(m.group(2))
        sinal = -1 if "redu" in verbo else 1
        estacoes.append(Estacao(rio=rio, estacao=est, municipio=mun,
                                variacao_cm=sinal * valor, variacao_periodo="7d",
                                observacoes="Variação da síntese textual (tabela não estruturada no PDF)."))
    return estacoes


def extrair_sintese(txt_path: Path) -> str | None:
    if not txt_path.exists(): return None
    texto = txt_path.read_text(encoding="utf-8")
    for marker in ("SÍNTESE DO BOLETIM", "Resumo:", "1. Resumo"):
        idx = texto.find(marker)
        if idx >= 0:
            trecho = texto[idx + len(marker): idx + len(marker) + 1200]
            trecho = re.split(r"\n(?:--- PAG ---|Tabela|Figura|Legenda)", trecho)[0]
            return re.sub(r"\s+", " ", trecho).strip(" :\n\t") or None
    return None


PARSERS_BACIA = {
    "amazonas": parse_amazonas,
    "madeira":  parse_madeira,
    "branco":   parse_branco,
}


def parse_todos(index: list[dict]) -> list[BoletimParsed]:
    log("== PARSE ==")
    resultados: list[BoletimParsed] = []
    for b in index:
        bacia_l  = b["bacia"].lower()
        pdf_path = ROOT / b["pdf_path"]
        txt_path = ROOT / b["txt_path"]

        if bacia_l in PARSERS_BACIA:
            estacoes = PARSERS_BACIA[bacia_l](pdf_path)
        elif bacia_l == "acre":
            estacoes = parse_acre(pdf_path, txt_path)
        elif bacia_l == "xingu":
            estacoes = parse_xingu(pdf_path, txt_path)
        else:
            estacoes = []

        parsed = BoletimParsed(
            bacia=b["bacia"], data=b["data"], numero=b.get("numero"),
            titulo=b.get("titulo"), pdf_path=b["pdf_path"],
            sintese=extrair_sintese(txt_path), estacoes=estacoes,
        )
        resultados.append(parsed)
        # Salva JSON por boletim
        per_bol = OUT_DIR / bacia_l / f"{b['data'].replace('-','')}.json"
        per_bol.write_text(
            json.dumps(asdict(parsed), ensure_ascii=False, indent=2), encoding="utf-8"
        )
        log(f"  {b['bacia']:10} {b['data']}  {len(estacoes):>2} estacoes")

    return resultados


def asdict(obj) -> dict:
    from dataclasses import asdict as _asdict
    return _asdict(obj)


# ---------------------------------------------------------------------------
# Step 3: latest.json — última leitura por estação
# ---------------------------------------------------------------------------

def build_latest(resultados: list[BoletimParsed]) -> dict[str, dict]:
    """Mantém a leitura mais recente por (bacia, estacao)."""
    latest: dict[str, dict] = {}
    for bol in sorted(resultados, key=lambda b: b.data):  # do mais antigo ao mais novo
        for e in bol.estacoes:
            if not e.nivel_cm and not e.variacao_cm: continue
            key = f"{bol.bacia}|{e.estacao}"
            latest[key] = {
                "bacia":             bol.bacia,
                "data_boletim":      bol.data,
                "rio":               e.rio,
                "estacao":           e.estacao,
                "municipio":         e.municipio,
                "nivel_cm":          e.nivel_cm,
                "nivel_m":           round(e.nivel_cm / 100, 2) if e.nivel_cm else None,
                "variacao_cm":       e.variacao_cm,
                "variacao_periodo":  e.variacao_periodo,
                "cota_inundacao_cm": e.cota_inundacao_cm,
                "cota_mediana_cm":   e.cota_mediana_cm,
                "chuva_24h_mm":      e.chuva_24h_mm,
                "previsao":          e.previsao,
            }

    out = {
        "gerado_em":       datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_estacoes":  len(latest),
        "estacoes":        dict(sorted(latest.items())),
    }
    latest_path = OUT_DIR / "latest.json"
    latest_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"  -> latest.json: {len(latest)} estacoes")
    return latest


# ---------------------------------------------------------------------------
# Step 4: dados.json consolidado
# ---------------------------------------------------------------------------

def salvar_consolidado(resultados: list[BoletimParsed], mes: str) -> None:
    total_est = sum(len(r.estacoes) for r in resultados)
    out = {
        "mes":              mes,
        "gerado_em":        datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_boletins":   len(resultados),
        "total_estacoes":   total_est,
        "boletins":         [asdict(r) for r in resultados],
    }
    p = OUT_DIR / "dados.json"
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"  dados.json: {total_est} medicoes em {len(resultados)} boletins")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def meses_para_scrape(mes_arg: str | None) -> list[str]:
    """Retorna lista de prefixos YYYYMM a scraper.
    Se estivermos nos primeiros 6 dias do mês, inclui o mês anterior também."""
    if mes_arg:
        return [mes_arg]
    hoje = date.today()
    atual = hoje.strftime("%Y%m")
    meses = [atual]
    if hoje.day <= 6:
        # inclui mês anterior
        if hoje.month == 1:
            anterior = f"{hoje.year - 1}12"
        else:
            anterior = f"{hoje.year}{hoje.month - 1:02d}"
        meses.insert(0, anterior)
    return meses


def main() -> int:
    ap = argparse.ArgumentParser(description="Pipeline SACE semanal")
    ap.add_argument("--mes", help="Mês no formato YYYYMM (padrão: mês atual)")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    log("=" * 60)
    log("Pipeline SACE iniciado")

    meses = meses_para_scrape(args.mes)
    todos_index: list[dict] = []

    for mes in meses:
        todos_index += scrape(mes)

    if not todos_index:
        log("AVISO: nenhum boletim encontrado. Encerrando.")
        return 0

    resultados = parse_todos(todos_index)

    mes_label = f"{meses[-1][:4]}-{meses[-1][4:]}"
    salvar_consolidado(resultados, mes_label)

    build_latest(resultados)

    log("Pipeline concluido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
