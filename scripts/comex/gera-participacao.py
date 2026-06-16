#!/usr/bin/env python3
# scripts/comex/gera-participacao.py
# Gera data/comex/participacao-porto.json — matriz de PARTICIPACAO origem->porto
# do escoamento de graos (soja+milho), por UF de origem x corredor de saida.
#
#   Corrige o no estrutural do pilar S (IEE): antes o `colhido` somava a
#   producao INTEIRA de cada UF da hinterlandia (MT contado em Santos E Arco
#   Norte = dupla contagem). Agora cada UF entra escalada pela fracao do seu
#   grao que de fato sai por aquele corredor.
#
# FONTE: Comex Stat / MDIC (api-comexstat.mdic.gov.br), exportacao 2023-2024,
#   NCM 12019000 (soja) + 10059010 (milho), detalhe state x urf, metrica FOB.
#   Respostas brutas commitadas em data/comex/exp-*-uf-urf-2023-2024.json.
#   (FOB ~ proxy de tonelagem para uma unica commodity — preco ~ uniforme.)
#
# SAIDA: { fonte, metodo, geradoEm, status:'ok',
#          participacao: { santos:{MT:0.43,...}, paranagua:{...}, arco-norte:{...} } }

import os, sys, json, datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
DADOS = os.path.join(AQUI, "..", "..", "data", "comex")
ARQ = {"soja": "exp-soja-uf-urf-2023-2024.json", "milho": "exp-milho-uf-urf-2023-2024.json"}

UF = {"São Paulo": "SP", "Minas Gerais": "MG", "Goiás": "GO", "Mato Grosso do Sul": "MS",
      "Mato Grosso": "MT", "Paraná": "PR", "Santa Catarina": "SC", "Tocantins": "TO",
      "Pará": "PA", "Maranhão": "MA", "Piauí": "PI", "Rondônia": "RO"}

# hinterlandia de cada corredor (igual a HINTERLANDIA em lib/iee-params.ts)
HINT = {"santos": ["SP", "MG", "GO", "MS", "MT"], "paranagua": ["PR", "SC"],
        "arco-norte": ["MT", "PA", "TO", "MA", "PI", "RO"]}


def corredor_do_porto(urf: str):
    u = urf.upper()
    if "SANTOS" in u: return "santos"
    if "PARANAGUA" in u: return "paranagua"
    if any(k in u for k in ["SAO LUIS", "ITAQUI", "BELEM", "BELÉM", "SANTAREM",
                            "MANAUS", "SANTANA", "ITACOATIARA", "VILA DO CONDE", "BARCARENA"]):
        return "arco-norte"
    return "outro"


def main():
    # UF -> corredor -> FOB (soja + milho agregados)
    agg = {}
    for f in ARQ.values():
        p = os.path.join(DADOS, f)
        if not os.path.exists(p):
            sys.stderr.write(f"[participacao] ausente: {p}\n"); return 1
        for r in json.load(open(p, encoding="utf-8"))["data"]["list"]:
            uf = UF.get(r["state"])
            if not uf: continue
            c = corredor_do_porto(r["urf"])
            agg.setdefault(uf, {}).setdefault(c, 0)
            agg[uf][c] += int(r["metricFOB"])

    # participacao[corredor][uf] = fracao do grao da UF que sai por aquele corredor
    part = {}
    for corr, ufs in HINT.items():
        part[corr] = {}
        for uf in ufs:
            d = agg.get(uf, {}); tot = sum(d.values())
            part[corr][uf] = round(d.get(corr, 0) / tot, 2) if tot else 0.0

    out = {
        "fonte": "Comex Stat / MDIC — exportação 2023-2024, NCM 12019000 (soja) + 10059010 (milho), state × urf, FOB",
        "metodo": "participacao[corredor][UF] = FOB do grão da UF que sai pelos portos do corredor ÷ FOB total do grão da UF (todos os portos). Portos: Santos; Paranaguá; Arco Norte = São Luís/Itaqui + Belém/Barcarena + Santarém + Manaus + Santana.",
        "geradoEm": datetime.date.today().isoformat(),
        "status": "ok",
        "participacao": part,
    }
    os.makedirs(DADOS, exist_ok=True)
    with open(os.path.join(DADOS, "participacao-porto.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print("[participacao] OK")
    for corr, m in part.items():
        print(f"  {corr}: " + " ".join(f"{k}={v}" for k, v in m.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
