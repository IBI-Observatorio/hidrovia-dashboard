"""Utilidades comuns da coleta do estudo "Custo do calado perdido em Santos" (IBI x NORA).

Regras (ver docs/parceria-nora/santos-calado/PROMPT-coleta-dados.md):
- todo bruto registra origem/URL, data-hora da coleta e SHA-256 em manifest.json;
- o bruto nunca é editado; derivados vão para interim/ e processed/;
- nada é estimado nem interpolado nesta etapa.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BASE = RAIZ / "data" / "estudo-santos-calado"
RAW = BASE / "raw"
INTERIM = BASE / "interim"
PROC = BASE / "processed"
MANIFEST = BASE / "manifest.json"
ANTAQ_PARQUET = Path(os.environ.get("ANTAQ_PARQUET_DIR", r"C:\Dev\Github\ANTAQ\parquet"))

UA = "IBI-Observatorio/estudo-santos-calado (pesquisa; contato observatorio@ibinfraestrutura.org.br)"

for d in (RAW, INTERIM, PROC):
    d.mkdir(parents=True, exist_ok=True)


def agora() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def _ler_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"estudo": "Custo do calado perdido no Porto de Santos (IBI x NORA)",
            "regra": "Bruto nunca editado. Cada entrada: arquivo, origem/url, coletado_em (UTC), sha256, bytes.",
            "arquivos": []}


class _Trava:
    """Trava simples por arquivo para escrita concorrente do manifest."""
    def __init__(self):
        self.p = MANIFEST.with_suffix(".lock")

    def __enter__(self):
        for _ in range(600):
            try:
                self.fd = os.open(self.p, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                return self
            except FileExistsError:
                time.sleep(0.1)
        raise TimeoutError("manifest travado")

    def __exit__(self, *a):
        os.close(self.fd)
        os.remove(self.p)


def registra(arquivo: Path, origem: str, url: str | None = None, nota: str | None = None,
             coletado_em: str | None = None, externo: bool = False) -> dict:
    """Registra (ou atualiza, se o caminho já existe) um arquivo bruto no manifest."""
    with _Trava():
        return _registra(arquivo, origem, url, nota, coletado_em, externo)


def _registra(arquivo, origem, url, nota, coletado_em, externo):
    m = _ler_manifest()
    rel = str(arquivo.relative_to(RAIZ)).replace("\\", "/") if not externo else str(arquivo)
    ent = {"arquivo": rel, "origem": origem, "url": url,
           "coletado_em": coletado_em or agora(), "sha256": sha256(arquivo),
           "bytes": arquivo.stat().st_size, "externo_ao_repo": externo}
    if nota:
        ent["nota"] = nota
    m["arquivos"] = [e for e in m["arquivos"] if e["arquivo"] != rel] + [ent]
    m["arquivos"].sort(key=lambda e: e["arquivo"])
    m["atualizado_em"] = agora()
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
    return ent


def ja_registrado(arquivo: Path) -> bool:
    rel = str(arquivo.relative_to(RAIZ)).replace("\\", "/")
    return any(e["arquivo"] == rel for e in _ler_manifest()["arquivos"])


def baixa(url: str, destino: Path, origem: str, nota: str | None = None, pausa: float = 1.0,
          tentativas: int = 4, espera_429: float = 10.0, dados: bytes | None = None,
          headers: dict | None = None, refazer: bool = False) -> Path | None:
    """Baixa url -> destino (bruto) e registra no manifest. Não sobrescreve bruto já registrado."""
    if destino.exists() and ja_registrado(destino) and not refazer:
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    for t in range(tentativas):
        try:
            req = urllib.request.Request(url, data=dados, headers=h)
            with urllib.request.urlopen(req, timeout=120) as r:
                conteudo = r.read()
            destino.write_bytes(conteudo)
            registra(destino, origem, url, nota)
            time.sleep(pausa)
            return destino
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(espera_429 * (t + 1))
                continue
            if e.code in (500, 502, 503, 504):
                time.sleep(5 * (t + 1))
                continue
            print(f"  HTTP {e.code} em {url}")
            return None
        except Exception as e:  # rede
            print(f"  erro {type(e).__name__} em {url}: {e}")
            time.sleep(5 * (t + 1))
    return None


def salva(df, nome: str, pasta: Path = PROC, amostra: int = 500):
    """Salva parquet + amostra CSV (primeiras `amostra` linhas) em processed/."""
    p = pasta / f"{nome}.parquet"
    df.to_parquet(p, index=False)
    df.head(amostra).to_csv(pasta / f"{nome}_amostra.csv", index=False, encoding="utf-8")
    print(f"  {p.name}: {len(df):,} linhas, {p.stat().st_size/1e6:.1f} MB")
    return p
