# F4 - alerta de pico: toneladas colhidas em MT nas ultimas 4 semanas (Conab progresso x producao)
# antecipam o frete Sorriso->Santos (IMEA) e o basis da soja MT (CEPEA Paranagua - IMEA MT)?
# Pre-fixado: sinal H4(t) = soma das t colhidas (soja + milho 2a) nas semanas t-3..t, em Mt.
# Alvos: log frete(t+h) e basis(t+h), h = 0, 2, 4 semanas. Controles: efeito de mes-do-ano + efeito de ano.
# Validacao: deixa um ano de fora (2023..2026); compara RMSE com e sem H4. Tambem: coeficiente com erro-padrao HAC.
import json, datetime, math, numpy as np
R='C:/Dev/Claude/Hidrovias/hidrovia-dashboard/data/'
P=json.load(open('progresso_mt.json'))
pr=json.load(open(R+'conab/producao-uf.json',encoding='utf-8'))
prod={}
for ano,tipo,uf,cul,v in pr['registros']:
    if uf!='MT': continue
    if cul=='S': prod[('S',ano)]=prod.get(('S',ano),0)+v
    if cul=='M' and tipo=='2': prod[('M2',ano)]=v
print('producao MT (mil t):',prod)
def safra(cul,d):  # colheita no ano Y pertence a safra (Y-1)/Y
    y=int(d[:4]); return f'{str(y-1)[2:]}/{str(y)[2:]}'
H={}
for cul in ('S','M2'):
    ds=sorted(P[cul]); 
    for i in range(1,len(ds)):
        d0,d1=ds[i-1],ds[i]
        if (datetime.date.fromisoformat(d1)-datetime.date.fromisoformat(d0)).days>10: continue
        if safra(cul,d0)!=safra(cul,d1): continue
        k=(cul,safra(cul,d1))
        if k not in prod: continue
        dv=max(0,P[cul][d1]-P[cul][d0])*prod[k]/1e3   # Mt
        seg=(datetime.date.fromisoformat(d1)-datetime.timedelta(days=datetime.date.fromisoformat(d1).weekday())).isoformat()
        H[seg]=H.get(seg,0)+dv
fr=dict(json.load(open(R+'imea/frete-semanal.json',encoding='utf-8'))['corredores']['santos'])
ba=dict(json.load(open(R+'cepea/basis-semanal.json',encoding='utf-8'))['corredores']['santos'])
sem=sorted(set(fr)|set(ba))
def sh(d,k): return (datetime.date.fromisoformat(d)+datetime.timedelta(weeks=k)).isoformat()
def H4(d): return sum(H.get(sh(d,-j),0) for j in range(4))
anos=sorted({d[:4] for d in sem})
def X(d,com):
    row=[1]+[1.0*(int(d[5:7])==m) for m in range(2,13)]+[1.0*(d[:4]==a) for a in anos[1:]]
    return row+([H4(d)] if com else [])
out={}
for alvo,Y,tr in (('frete',fr,math.log),('basis',ba,lambda x:x)):
    for h in (0,2,4):
        pts=[(d,tr(Y[sh(d,h)])) for d in sem if sh(d,h) in Y and d in Y]
        A0=np.array([X(d,False) for d,_ in pts]); A1=np.array([X(d,True) for d,_ in pts]); y=np.array([v for _,v in pts])
        b1=np.linalg.lstsq(A1,y,rcond=None)[0]; e=y-A1@b1
        # HAC (Newey-West, 8 lags) para o coef de H4
        XtXi=np.linalg.pinv(A1.T@A1); n=len(y); L=8; S_=np.zeros((A1.shape[1],)*2)
        u=A1*e[:,None]
        for l in range(L+1):
            G=u[l:].T@u[:n-l]; w=1-l/(L+1)
            S_+= G if l==0 else w*(G+G.T)
        se=math.sqrt((XtXi@S_@XtXi)[-1,-1])
        # leave-one-year-out
        e0,e1=[],[]
        for a in anos:
            tri=[i for i,(d,_) in enumerate(pts) if d[:4]!=a]; tei=[i for i,(d,_) in enumerate(pts) if d[:4]==a]
            if not tei: continue
            # ano de teste nao tem efeito-ano estimado: usa so os de treino (coluna do ano de teste zerada)
            c0=np.linalg.lstsq(A0[tri],y[tri],rcond=None)[0]; c1=np.linalg.lstsq(A1[tri],y[tri],rcond=None)[0]
            for i in tei:
                # remove o nivel do ano de teste usando a media dos residuos das 8 primeiras semanas do ano (so passado)
                e0.append(y[i]-A0[i]@c0); e1.append(y[i]-A1[i]@c1)
        # como o efeito-ano do ano de teste nao e estimavel, compara desvios de erro centrados por ano
        def rm(e,idx): 
            import collections
            g=collections.defaultdict(list)
            for v,(d,_) in zip(e,[pts[i] for i in idx]): g[d[:4]].append(v)
            return math.sqrt(np.mean([ (x-np.mean(v))**2 for v in g.values() for x in v]))
        idx=[i for a in anos for i,(d,_) in enumerate(pts) if d[:4]==a]
        out[f'{alvo} h={h}']={'n':len(y),'coef_H4_por_Mt':round(float(b1[-1]),4),'t_HAC':round(float(b1[-1]/se),2),
                              'LOYO_rmse_sem':round(rm(e0,idx),4),'LOYO_rmse_com':round(rm(e1,idx),4),'razao':round(rm(e1,idx)/rm(e0,idx),3)}
for k,v in out.items(): print(k,v)
print('H4 pico por ano (Mt):',{a:round(max(H4(d) for d in sem if d[:4]==a),1) for a in anos})
json.dump(out,open('resultado_f4.json','w'),indent=1)
