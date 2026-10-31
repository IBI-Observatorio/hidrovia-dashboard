# F10: exportacao soja+milho pela URF Manaus (Itacoatiara, rota do Madeira) x nivel do Madeira em Porto Velho.
# Pre-fixado: variavel = anomalia da cota media mensal em Porto Velho vs mediana do mes (2016-2025), em metros.
# Modelo: log(exp) = efeito-mes + efeito-ano + b*anomalia + c*anomalia*seca(ago-nov). Erros por ano (cluster) aproximados.
import csv,json,math,collections,numpy as np
D='C:/Dev/Claude/Hidrovias/hidrovia-dashboard/data/'
def serie(f):
    s=collections.defaultdict(list)
    for r in csv.DictReader(open(D+f,encoding='utf-8-sig')):
        try: s[r['data'][:7]].append(float(r['cota_m']))
        except: pass
    return {m:np.mean(v) for m,v in s.items() if len(v)>=20}
pv=serie('portovelho_hidroweb.csv')
med={mm:np.median([v for m,v in pv.items() if m[5:]==mm and '2016'<=m[:4]<='2025']) for mm in [f'{i:02d}' for i in range(1,13)]}
cx=json.load(open('bt/comex_urf_uf.json'))
Y=collections.Counter()
for a,rows in cx.items():
    for r in rows:
        if 'MANAUS' in r['urf'].upper(): Y[f"{r['year']}-{int(r['monthNumber']):02d}"]+=int(r['metricKG'])/1e6  # mil t
ms=sorted(m for m in pv if m in Y and Y[m]>0 and '2016'<=m[:4])
anos=sorted({m[:4] for m in ms}); meses=[f'{i:02d}' for i in range(1,13)]
def X(m,inter=True):
    a=pv[m]-med[m[5:]]; seca=1 if m[5:] in('08','09','10','11') else 0
    row=[1]+[1.0*(m[5:]==mm) for mm in meses[1:]]+[1.0*(m[:4]==aa) for aa in anos[1:]]+[a]+([a*seca] if inter else [])
    return row
A=np.array([X(m) for m in ms]); y=np.array([math.log(Y[m]) for m in ms])
b,res,*_=np.linalg.lstsq(A,y,rcond=None)
e=y-A@b; n,k=A.shape
# erro-padrao cluster por ano
XtXi=np.linalg.inv(A.T@A); meat=np.zeros((k,k))
for aa in anos:
    idx=[i for i,m in enumerate(ms) if m[:4]==aa]; s=A[idx].T@e[idx]; meat+=np.outer(s,s)
V=XtXi@meat@XtXi; se=np.sqrt(np.diag(V))
ba,bi=b[-2],b[-1]; sa,si=se[-2],se[-1]
seca_eff=ba+bi; seca_se=math.sqrt(V[-2,-2]+V[-1,-1]+2*V[-2,-1])
print(f'n={n} meses ({ms[0]}..{ms[-1]})')
print(f'efeito por metro de anomalia, fora da seca: {ba:+.3f} (ep {sa:.3f})')
print(f'efeito por metro de anomalia, ago-nov:      {seca_eff:+.3f} (ep {seca_se:.3f}) -> {100*(math.exp(seca_eff)-1):+.1f}% de exportacao por metro')
# contrafactual 2023 e 2024: anomalia zerada em ago-nov
for ano in ('2023','2024','2025'):
    perda=0; det=[]
    for mm in ('08','09','10','11'):
        m=f'{ano}-{mm}'
        if m not in pv or m not in Y: continue
        an=pv[m]-med[mm]; cf=Y[m]*math.exp(-(seca_eff)*an)  # exportacao se a anomalia fosse zero
        perda+=cf-Y[m]; det.append(f'{mm}: cota {pv[m]:.2f} m (anom {an:+.2f}) exp {Y[m]:.0f} mil t')
    print(ano,'| perda estimada ago-nov: %.0f mil t'%perda,'|',' ; '.join(det))
