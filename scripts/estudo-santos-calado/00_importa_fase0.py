"""00 — Importa para raw/ os brutos já baixados na Fase 0 (30/09/2026, sessão 31658e4b).

Os arquivos são copiados sem alteração. A data da coleta registrada é o mtime do arquivo
original (a Fase 0 não guardou a hora exata do download). Quando a URL de origem não foi
anotada na Fase 0, o manifest diz isso — não é reconstruída de memória.
Uso: python 00_importa_fase0.py [pasta_fase0]
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from _comum import RAW, registra

FASE0 = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\bruno\AppData\Local\Temp\claude\C--Dev-Claude-Hidrovias-hidrovia-dashboard"
    r"\31658e4b-059e-4b66-9c15-417f2073a23e\scratchpad\fase0")

SEM_URL = "URL de origem não anotada na Fase 0"
ARQS = {
    # arquivo fase0: (destino em raw/, origem, url)
    "cpsp_2026-04_merged.pdf": ("npcp/portaria_cpsp_113_2026_npcp_sp_rev3_mod1.pdf",
                                "Capitania dos Portos de SP — Portaria CPSP/ComOpNav/MB nº 113/2026 + NPCP-SP 3ª Revisão Mod. 1", SEM_URL),
    "cpsp_NPCP_CPSP.pdf": ("npcp/npcp_sp_2016_rev1.pdf", "Capitania dos Portos de SP — NPCP-SP 1ª Revisão (2016)", SEM_URL),
    "aps_NAP_OPR021_2026_atracacao.pdf": ("aps_normas/nap_supop_opr_021_2026.pdf",
                                          "APS — NAP SUPOP.OPR.021.2026 (atracação; art. 36 = calado na nomeação)", SEM_URL),
    "aps_calados_bercos.html": ("aps_calados/fase0/20260930_calados_operacionais.html",
                                "APS — Calados Operacionais dos Berços (Rev. 271), captura da Fase 0",
                                "https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/calados-operacionais-dos-bercos-de-atracacao/"),
    "aps_wp_pages_calado.json": ("aps_calados/fase0/20260930_wp_pages_calado.json", "APS — API WordPress (wp-json/wp/v2/pages, busca 'calado')", SEM_URL),
    "aps_calados_revisions.json": ("aps_calados/fase0/20260930_wp_revisions.json", "APS — API WordPress (consulta de revisões da página)", SEM_URL),
    "aps_esperados_carga_20260930.csv": ("aps_lineup/fase0/20260930_navios_esperados_carga.csv",
                                         "APS — Navios Esperados · Carga (extração da Fase 0)",
                                         "https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/navegacao-e-movimento-de-navios/navios-esperados-carga/"),
    "pgua_calado.html": ("concorrentes/fase0/20260930_paranagua_calado.html", "APPA — página de calado de Paranaguá", SEM_URL),
    "rg_calado.html": ("concorrentes/fase0/20260930_riogrande_calado.html", "Portos RS — página de calado de Rio Grande", SEM_URL),
    "riogrande_259.pdf": ("concorrentes/fase0/riogrande_normativa_259.pdf", "Portos RS — normativa 259 (calado)", SEM_URL),
    "itaqui_manual.pdf": ("concorrentes/fase0/itaqui_manual.pdf", "EMAP — manual do Porto do Itaqui", SEM_URL),
    "vdc_rep.pdf": ("concorrentes/fase0/vila_do_conde_rep.pdf", "CDP — documento de Vila do Conde", SEM_URL),
    "gtr_brazil_ocean_quarterly.csv": ("usda_gtr/fase0/gtr_brazil_ocean_quarterly.csv", "USDA AMS — Grain Transportation Report (Socrata)", SEM_URL),
    "comex_urf.json": ("comex/fase0/comex_urf.json", "Comex Stat — tabela de URF (API)", SEM_URL),
}


def main():
    if not FASE0.exists():
        print("pasta da Fase 0 não encontrada:", FASE0)
        return
    for nome, (dest, origem, url) in ARQS.items():
        src = FASE0 / nome
        if not src.exists():
            print("  ausente na Fase 0:", nome)
            continue
        dst = RAW / dest
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        mt = datetime.fromtimestamp(src.stat().st_mtime, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        registra(dst, origem, url, nota=f"copiado sem alteração de fase0/{nome}; coletado_em = mtime do arquivo original",
                 coletado_em=mt)
        print("  ok", dest)


if __name__ == "__main__":
    main()
