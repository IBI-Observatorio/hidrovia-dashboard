# F9: (1) o frete IMEA Sorriso->Santos (semanal, R$/t) reproduz o custo rodoviario do USDA (trimestral, US$/t)?
#     (2) porteira-ao-porto das 3 rotas de Sorriso no ultimo trimestre USDA, por trecho, e quais trechos tem fonte BR aberta.
import json,collections,statistics as st,numpy as np,datetime
w=json.load(open('wc.json',encoding='utf-8'))
R=collections.defaultdict(dict)
for x in w: R[x['route']][x['year_quarter']]=float(x['rate'])*float(x['distance_miles'])/100   # US$/t
px=collections.defaultdict(list)
for r in json.load(open('ptax.json')):
    d,m,a=r['data'].split('/'); px[f"{a}Q{(int(m)-1)//3+1}"].append(float(r['valor']))
px={k:np.mean(v) for k,v in px.items()}
im=collections.defaultdict(list)
for d,v in json.load(open('C:/Dev/Claude/Hidrovias/hidrovia-dashboard/data/imea/frete-semanal.json',encoding='utf-8'))['corredores']['santos']:
    im[f"{d[:4]}Q{(int(d[5:7])-1)//3+1}"].append(v)
im={k:np.mean(v) for k,v in im.items() if len(v)>=8}
us=R['North MT (Sorriso) - Santos']
qs=[q for q in sorted(us) if q in im and q in px]
a=np.array([us[q]*px[q] for q in qs]); b=np.array([im[q] for q in qs])
print('trimestres em comum:',qs[0],'..',qs[-1],len(qs))
for q in qs: print(f'  {q}: USDA {us[q]:.1f} US$/t x {px[q]:.2f} = R$ {us[q]*px[q]:.0f}/t | IMEA R$ {im[q]:.0f}/t | razao {im[q]/(us[q]*px[q]):.2f}')
print(f'correlacao nivel {np.corrcoef(a,b)[0,1]:.2f} | variacao trimestral {np.corrcoef(np.diff(a),np.diff(b))[0,1]:.2f} | razao media IMEA/USDA {np.mean(b/a):.2f}')
print('IMEA ja disponivel para trimestres que o USDA ainda nao publicou:',[q for q in sorted(im) if q not in us])
# porteira-ao-porto, ultimo trimestre
q='2025Q3'; c=px[q]
rotas={'Sorriso -> Santos (caminhao)':['North MT (Sorriso) - Santos'],
       'Sorriso -> Rondonopolis -> Santos (caminhao + trem)':['North MT (Sorriso) - Rondonópolis (Rail terminal)','Rondonópolis MT (Rail terminal) - Santos'],
       'Sorriso -> Itaituba -> Santarem (caminhao + barcaca)':['North MT (Sorriso) - Itaituba','Itaituba PA (Barge terminal) - Santarém'],
       'Sorriso -> Itaituba -> Barcarena (caminhao + barcaca)':['North MT (Sorriso) - Itaituba','Itaituba PA (Barge terminal) - Barcarena'],
       'Sorriso -> Paranagua (caminhao)':['North MT (Sorriso) - Paranaguá']}
print(f'\nPorteira-ao-porto, {q} (PTAX media {c:.2f}):')
for n,legs in rotas.items():
    tot=sum(R[l][q] for l in legs)
    print(f"  {n:55s} US$ {tot:5.1f}/t = R$ {tot*c:4.0f}/t   trechos: "+' + '.join(f'{R[l][q]:.1f}' for l in legs))
