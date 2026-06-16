#!/usr/bin/env python3
# scripts/agro/calibra-utilizacao-embarque.py
# Calibra o FATOR de utilizacao do nowcast de embarcado do pilar S, por corredor.
#
#   embarcado_acum(w) = semanas_escoando(w) x vazao_semanal x FATOR
#
# O FATOR (antes 0,70 chutado) e a utilizacao MEDIA dos portos durante a janela
# de escoamento (fev-jul), medida na Estatistica Aquaviaria da ANTAQ:
#   FATOR = media_(mes in fev..jul) [ embarcado_mensal(mes) / media_movel_12m ]
# Le data/antaq/capacidade-semanal.json (serieMensalMilT), nao chama rede.
#
# SAIDA: data/antaq/utilizacao-embarque.json (auditoria) + valores no stdout.
#   Os numeros entram declarados em lib/iee-params.ts (FATOR_UTILIZACAO_EMBARQUE).

import os, sys, json, datetime
from collections import defaultdict

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SRC = os.path.join(RAIZ, "data", "antaq", "capacidade-semanal.json")
JANELA = range(2, 8)  # fev..jul (escoamento da safra de soja+milho)


def main():
    d = json.load(open(SRC, encoding="utf-8"))["corredores"]
    out = {}
    for corr, c in d.items():
        mm = c["mediaMovel12mMilTMes"]
        porMes = defaultdict(list)
        for ym, v in c["serieMensalMilT"]:
            a, m = ym.split("-")
            if int(a) >= 2017:
                porMes[int(m)].append(v / mm)
        perfil = {m: sum(r) / len(r) for m, r in porMes.items()}
        jan = [perfil[m] for m in JANELA if m in perfil]
        out[corr] = round(sum(jan) / len(jan), 2) if jan else 0.7

    res = {
        "fonte": "ANTAQ — Estatística Aquaviária (espelho parquet IBI), via data/antaq/capacidade-semanal.json",
        "metodo": "FATOR = média (meses fev..jul, 2017→) de embarcado_mensal / média móvel 12m, por corredor. Utilização realizada dos portos na janela de escoamento.",
        "geradoEm": datetime.date.today().isoformat(),
        "status": "ok",
        "fatorUtilizacaoEmbarque": out,
    }
    with open(os.path.join(RAIZ, "data", "antaq", "utilizacao-embarque.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, ensure_ascii=False, indent=1)
    print("[utilizacao] FATOR por corredor (era 0,70 chutado):", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
