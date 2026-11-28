# F11 (2): Arco Norte agregado (Tapajos + Itaqui) e sensibilidade da escolha ao custo relativo.
# Trimestral: log(share Tapajos / share Santos+Paranagua) na exportacao MT ~ diferenca de custo (USDA) + tendencia + trimestre.
import json,collections,numpy as np,math
exec(open('f10b/rodada2.py').read().split("pv=json.load")[0])
anual=collections.defaultdict(collections.Counter); tri=collections.defaultdict(collections.Counter)
for (uf,g),Z in EXPUF.items():
    if uf!='MT': continue
    for m,v in Z.items():
        anual[int(m[:4])][g]+=v; tri[f"{m[:4]}Q{(int(m[5:])-1)//3+1}"][g]+=v
print('Arco Norte norte (Tapajos+Itaqui) na exportacao MT:',{a:f"{(anual[a]['stm']+anual[a]['bel']+anual[a]['slz'])/sum(anual[a].values()):.1%}" for a in range(2015,2026)})
w=json.load(open('f9/wc.json',encoding='utf-8'))
R=collections.defaultdict(dict)
for x in w: R[x['route']][x['year_quarter']]=float(x['rate'])*float(x['distance_miles'])/100
tap=lambda q: R['North MT (Sorriso) - Itaituba'].get(q,np.nan)+R['Itaituba PA (Barge terminal) - Santarém'].get(q,np.nan)
sul=lambda q: R['North MT (Sorriso) - Santos'].get(q,np.nan)
rows=[]
for q in sorted(tri):
    t=tri[q]; ntap=t['stm']+t['bel']; nsul=t['sts']+t['pgu']
    if ntap>0 and nsul>0 and not np.isnan(tap(q)) and not np.isnan(sul(q)):
        rows.append((q,math.log(ntap/nsul),sul(q)-tap(q),int(q[:4])))
print('trimestres com custo USDA dos dois lados:',len(rows),rows[0][0],'..',rows[-1][0])
y=np.array([r[1] for r in rows]); X=np.array([[1,r[2],r[3]-2015]+[1.0*(r[0][-1]==k) for k in '234'] for r in rows])
c,*_=np.linalg.lstsq(X,y,rcond=None); e=y-X@c; s2=e@e/(len(y)-X.shape[1]); se=np.sqrt(np.diag(s2*np.linalg.inv(X.T@X)))
print(f'coef da vantagem de custo do Tapajos (US$/t): {c[1]:+.4f} (ep {se[1]:.4f}); tendencia {c[2]:+.3f}/ano (ep {se[2]:.3f})')
print('vantagem de custo Tapajos (US$/t) por ano:',{a:round(np.mean([r[2] for r in rows if r[3]==a]),1) for a in sorted({r[3] for r in rows})})
