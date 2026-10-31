# Carteira v1 - Coluna C (medidas regulatorias). Pre-registro v1 congelado (pesos R1 .35, R2 .25, R3 .25, R4 .15).
# R1 (Mt/ano do modo alcancado):
#   rodoviario = producao soja+milho 2024 (IBGE PAM, 259,2 Mt) + importacao de fertilizantes 2025 (Comex cap.31, 45,5 Mt) = 304,7
#   ferroviario = TU 2025 de soja, milho, farelo e fertilizantes (ANTT SIADE) = 68,3
#   hidroviario = producao exposta a Tapajos + Madeira + Paraguai (metodo A2/CIOT) = 26,7
#   free flow = sem dado (carga nas concessoes com free flow nao mensuravel com o dado aberto usado)
# R3: so conta o que foi CONFERIDO; "nao conferido" = 0 (hipotese), conforme a definicao.
import json
SD=None
M={
 '1 Publicar valor do frete do CIOT (ANTT)':     dict(R1=304.7,R2=3,R3=2,R4=3,R5='não iniciada'),
 '2 DT-e (documento eletrônico de transporte)':  dict(R1=304.7,R2=2,R3=0,R4=1,R5='aprovada sem implementação'),
 '3 Peso por eixo e tolerâncias':                dict(R1=304.7,R2=1,R3=0,R4=2,R5='em tramitação (Veto 43/2026; PL 2217/2025)'),
 '4 Ferrovias por autorização':                  dict(R1=68.3, R2=3,R3=0,R4=1,R5='aprovada, implementada parcialmente'),
 '5 Licenciamento de dragagem/derrocamento':     dict(R1=26.7, R2=3,R3=0,R4=3,R5='aprovada, implementada parcialmente (dragagem dispensada por lei; derrocamento não)'),
 '6 Pedágio free flow':                          dict(R1=SD,   R2=3,R3=2,R4=2,R5='aprovada, implementada parcialmente'),
}
W={'R1':.35,'R2':.25,'R3':.25,'R4':.15}
def pct(c):
    v={k:x[c] for k,x in M.items() if x[c] is not SD}; s=sorted(v.values()); n=len(s)
    return {k:(sum(1 for y in s if y<x)+(sum(1 for y in s if y==x)+1)/2-0.5)/n for k,x in v.items()}
P={c:pct(c) for c in W}
def nota(W):
    out={}
    for k,x in M.items():
        wa=sum(W.values()); wc=sum(w for c,w in W.items() if x[c] is not SD)
        out[k]=(sum(w*P[c][k] for c,w in W.items() if x[c] is not SD)/wc, wc/wa)
    return out
base=nota(W); iguais=nota({c:.25 for c in W})
rk=lambda r:[k for k,_ in sorted(((k,v[0]) for k,v in r.items() if v[1]>=.6),key=lambda z:-z[1])]
rb,ri=rk(base),rk(iguais)
for k in rb: print(f"{rb.index(k)+1} ({ri.index(k)+1} c/ pesos iguais) | {k} | nota {base[k][0]:.3f} | cobertura {base[k][1]:.0%} | R1 {M[k]['R1']} R2 {M[k]['R2']} R3 {M[k]['R3']} R4 {M[k]['R4']} | {M[k]['R5']}")
mud=max(abs(rb.index(k)-ri.index(k)) for k in rb[:5]); print('maior mudanca no top-5:',mud,'-> FAIXAS' if mud>2 else '-> ordem numerica permitida')
# sensibilidade extra (nao pre-registrada, so informativa): item 3 com R2=3 (via Contran)
M['3 Peso por eixo e tolerâncias']['R2']=3; P={c:pct(c) for c in W}; alt=rk(nota(W)); print('informativo - item 3 via Contran (R2=3):',alt)
json.dump({'M':M,'rank_base':rb,'rank_iguais':ri},open('carteira/resultado_colC_v1.json','w'),ensure_ascii=False,indent=1)
