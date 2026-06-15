#!/usr/bin/env python3
# scripts/cepea/gera-basis.py
# Gera data/cepea/basis-semanal.json — insumo do pilar BASIS da v3 (H1).
#
#   BASIS = preço porto - preço interior (soja), R$/saca, por corredor/semana.
#   Quando o grão não consegue escoar, o interior cai vs o porto -> basis ABRE.
#   É o sinal de aperto de escoamento REVELADO por mercado (alta frequência,
#   forward-looking), candidato a prever a espera EA em t+2 (ver pré-registro
#   docs/pre-registro-iee-v3-desenho.md).
#
# FONTES (públicas — preencher SERIES abaixo com o endpoint/arquivo de cada uma):
#   - Porto:    CEPEA/ESALQ - Indicador da Soja Paranagua (e/ou Santos).
#               https://www.cepea.esalq.usp.br/br/indicador/soja.aspx (consulta
#               de serie historica -> CSV).
#   - Interior: CEPEA/ESALQ - Soja Mato Grosso  E/OU  IMEA - preco soja MT
#               (boletim semanal). Casar a praca de origem com o corredor.
#   Mapa corredor -> (praca_porto, praca_interior):
#       santos     -> (Paranagua/Santos, Sorriso-MT ou Rondonopolis-MT)
#       paranagua  -> (Paranagua,        Cascavel-PR)
#       arco-norte -> (Miritituba/Itaqui, Sorriso-MT)
#
# CONVERSAO: alinhar unidades (R$/sc 60kg). Reamostrar para semana ISO (segunda)
#   pela media das cotacoes da semana. Basis_semana = porto_semana - interior_semana.
#
# SAIDA (schema que o backtest le, scripts/backtest/iee-v3-basis-aperto.ts):
#   { "fonte": "...", "metodo": "...", "geradoEm": "YYYY-MM-DD", "status": "ok",
#     "corredores": { "santos": [["2016-01-04", 8.40], ...], ... } }   # [segunda ISO, basis R$/sc]
#
# INTEGRIDADE: este script NAO inventa dado. Sem as series configuradas ele sai
#   com erro e instrucoes — ausencia de dado nunca vira numero fabricado.

import json, os, sys, datetime

SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "cepea")

# Preencher cada entrada com o caminho/endpoint da serie historica baixada
# (CSV CEPEA / planilha IMEA). Ex.: {"porto": "cepea_soja_pgua.csv",
# "interior": "cepea_soja_mt.csv"} por corredor. Enquanto vazio -> aborta.
SERIES: dict[str, dict[str, str]] = {
    # "santos":     {"porto": "...", "interior": "..."},
    # "paranagua":  {"porto": "...", "interior": "..."},
    # "arco-norte": {"porto": "...", "interior": "..."},
}


def main() -> int:
    if not SERIES:
        sys.stderr.write(
            "[basis] SERIES nao configurado.\n"
            "  Baixe as series historicas de preco (CEPEA porto + CEPEA/IMEA interior),\n"
            "  preencha o dict SERIES com os caminhos e rode de novo.\n"
            "  Ver docs/pre-registro-iee-v3-desenho.md (fontes declaradas).\n"
            "  NAO ha fallback fabricado — sem dado, sem cache (regra do pre-registro).\n"
        )
        return 1

    # TODO (quando SERIES preenchido): ler cada CSV, reamostrar por semana ISO
    # (media), casar porto-interior, basis = porto - interior, montar corredores.
    # Mantido fora do escopo deste commit ate haver acesso as series.
    raise NotImplementedError(
        "Leitura das series CEPEA/IMEA a implementar quando os arquivos estiverem disponiveis."
    )


if __name__ == "__main__":
    sys.exit(main())
