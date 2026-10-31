# Backtest line-up de fertilizante (APPA via Wayback) x importacao cap.31 em Paranagua (Comex).
# Hipoteses fixadas antes de rodar:
#  Q_firme = saldo atracados + programados + ao largo (navio ja chegou/tem berco); Q_total = Q_firme + esperados.
#  Alvos: importacao do mes da captura (M) e do mes seguinte (M+1).
#  Na data da captura ja se conhece o Comex ate M-1. Base: sazonal com tendencia
#  B(t) = I(t-12) * soma(I, M-12..M-1)/soma(I, M-24..M-13).
#  Validacao: leave-one-year-out (evita vazamento entre capturas do mesmo ano).
import json, math, numpy as np
from math import erf, sqrt
I=json.load(open('comex_fert_paranagua.json'))
snaps={}
for o in json.load(open('lineup_fert_hist.json')): snaps[o['data']]=o   # dedup por data
def sh(m,k):
    y,mm=map(int,m.split('-')); mm+=k
    while mm>12: y+=1; mm-=12
    while mm<1: y-=1; mm+=12
    return f'{y}-{mm:02d}'
def base(t,M):
    num=sum(I.get(sh(M,-k),0) for k in range(1,13)); den=sum(I.get(sh(M,-k),0) for k in range(13,25))
    return I[sh(t,-12)]*num/den if den else None
rows=[]
for d,o in sorted(snaps.items()):
    M=d[:7]
    for h in (0,1):
        t=sh(M,h)
        if t not in I or sh(M,-24) not in I: continue
        firme=o['ATRACADOS']+o['PROGRAMADOS']+o['AO LARGO']; total=firme+o['ESPERADOS']
        rows.append(dict(d=d,h=h,ano=d[:4],y=math.log(I[t]),b=math.log(base(t,M)),qf=math.log(firme),qt=math.log(total),real=I[t],B=base(t,M)))
res={}
for h in (0,1):
    R=[r for r in rows if r['h']==h]
    out={'n':len(R),'anos':sorted({r['ano'] for r in R})}
    for q in ('qf','qt'):
        dev=[r['y']-r['b'] for r in R]; qq=[r[q] for r in R]
        out[f'corr({q}, log(real/base))']=round(float(np.corrcoef(qq,dev)[0,1]),2)
        out[f'corr({q}, log real)']=round(float(np.corrcoef(qq,[r['y'] for r in R])[0,1]),2)
        eb,ea,en=[],[],[]
        for ano in out['anos']:
            tr=[r for r in R if r['ano']!=ano]; te=[r for r in R if r['ano']==ano]
            A=np.array([[1,r['b']] for r in tr]); Bm=np.array([[1,r['b'],r[q]] for r in tr]); z=np.array([r['y'] for r in tr])
            ba=np.linalg.lstsq(A,z,rcond=None)[0]; bb=np.linalg.lstsq(Bm,z,rcond=None)[0]
            for r in te:
                eb.append(r['y']-ba@[1,r['b']]); ea.append(r['y']-bb@[1,r['b'],r[q]]); en.append(r['y']-r['b'])
        rm=lambda e: sqrt(np.mean(np.square(e)))
        dd=np.square(ea)-np.square(eb); z_=dd.mean()/(dd.std(ddof=1)/sqrt(len(dd)))
        out[q]={'rmse_base_pura':round(rm(en),3),'rmse_base_ajustada':round(rm(eb),3),'rmse_com_lineup':round(rm(ea),3),
                'razao':round(rm(ea)/rm(eb),3),'DM_z':round(float(z_),2),'p_unilateral':round(0.5*(1+erf(z_/sqrt(2))),3),
                'coef_lineup_amostra_toda':round(float(np.linalg.lstsq(np.array([[1,r['b'],r[q]] for r in R]),np.array([r['y'] for r in R]),rcond=None)[0][2]),2)}
    res[f'h{h}']=out
print(json.dumps(res,indent=1,ensure_ascii=False))
json.dump(res,open('resultado_lineup_fert.json','w'),indent=1,ensure_ascii=False)
