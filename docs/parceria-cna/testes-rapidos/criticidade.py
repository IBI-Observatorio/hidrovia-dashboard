# F12 - versao minima: polo Norte de MT (microrregioes Alto Teles Pires, Sinop, Arinos, Parecis).
# Volume por rota = producao 2024 x participacao dos CIOTs de grao 2025 (so rotas de exportacao identificadas, renormalizadas).
# Custo por rota = soma dos trechos USDA (wcku-8yrp) no ultimo trimestre, US$/t -> R$ pela PTAX. Madeira sem custo de barcaca publico: fora.
# Fechar um arco: a carga que usava rotas que passam por ele vai para a rota aberta mais barata. Sem restricao de capacidade.
import json,csv,collections,unicodedata,numpy as np
exec(open('f9/custo_rotas.py').read().split('im=collections')[0].replace("'wc.json'","'f9/wc.json'").replace("'ptax.json'","'f9/ptax.json'"))  # R (trechos), px
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper().replace("'",'').replace('-',' ').strip()
mun=json.load(open('f3/mun.json',encoding='utf-8')); INFO={}; COD={}
for m in mun:
    if m.get('microrregiao'):
        uf=m['microrregiao']['mesorregiao']['UF']['sigla']; INFO[str(m['id'])]=(m['microrregiao']['nome'],uf); COD[(norm(m['nome']),uf)]=str(m['id'])
POLO={'Alto Teles Pires','Sinop','Arinos','Parecis'}
prod=collections.Counter()
for r in json.load(open('f3/pam2024.json',encoding='utf-8'))[1:]:
    if r['V'] and r['V'].replace('.','').isdigit(): prod[r['D1C']]+=float(r['V'])
ROTA={('ITAITUBA','PA'):'tapajos',('SANTAREM','PA'):'tapajos',('RONDONOPOLIS','MT'):'rumo',('ALTO ARAGUAIA','MT'):'rumo',('ALTO TAQUARI','MT'):'rumo',
      ('SANTOS','SP'):'santos_rod',('GUARUJA','SP'):'santos_rod',('PARANAGUA','PR'):'pgua_rod',('PORTO VELHO','RO'):'madeira'}
cnt=collections.defaultdict(collections.Counter)
for r in csv.DictReader(open('bt/ciot_filtrado.csv',encoding='utf-8')):
    if not r['mes'].startswith('2025') or r['ncm'].replace('.','')[:4] not in('1201','1005') or not r['mun_o']: continue
    o=COD.get((norm(r['mun_o']),r['uf_o']))
    if o and INFO[o][0] in POLO and INFO[o][1]=='MT':
        k=ROTA.get((norm(r['mun_d']),r['uf_d']))
        if k: cnt[o][k]+=int(float(r['ciots']))
vol=collections.Counter()
for o,c in cnt.items():
    t=sum(c.values())
    for k,v in c.items(): vol[k]+=prod[o]*v/t
P=sum(prod[o] for o in prod if o in INFO and INFO[o][0] in POLO and INFO[o][1]=='MT')
q='2025Q3'; fx=px[q]
leg=lambda n: R[n][q]
CUSTO={'tapajos':leg('North MT (Sorriso) - Itaituba')+leg('Itaituba PA (Barge terminal) - Santarém'),
       'rumo':leg('North MT (Sorriso) - Rondonópolis (Rail terminal)')+leg('Rondonópolis MT (Rail terminal) - Santos'),
       'santos_rod':leg('North MT (Sorriso) - Santos'),'pgua_rod':leg('North MT (Sorriso) - Paranaguá')}
ARCOS={'BR-163 Norte (Sinop-Miritituba)':{'tapajos'},'Hidrovia do Tapajós':{'tapajos'},'Ferrovia Rumo (Rondonópolis-Santos)':{'rumo'},
       'BR-163/364 Sul (Sorriso-Rondonópolis e além)':{'rumo','santos_rod','pgua_rod'}}
print(f'Polo Norte MT: producao soja+milho 2024 {P/1e6:.1f} Mt; volume em rotas de exportacao identificadas (CIOT): '+', '.join(f'{k} {v/1e6:.1f} Mt' for k,v in vol.most_common()))
print('custo R$/t por rota ('+q+'):',{k:round(v*fx) for k,v in CUSTO.items()})
print('\nFechar o arco -> custo extra (R$/ano) e para onde vai a carga:')
res=[]
for arco,fech in ARCOS.items():
    abertas={k:v for k,v in CUSTO.items() if k not in fech}
    extra=0; destino={}
    for k in fech:
        if k not in CUSTO or not vol[k]: continue
        if not abertas: continue
        alt=min(abertas,key=abertas.get); extra+=vol[k]*(abertas[alt]-CUSTO[k])*fx; destino[k]=(alt,round(vol[k]/1e6,1))
    res.append((arco,extra,destino))
for arco,extra,dest in sorted(res,key=lambda x:-x[1]):
    print(f'  {arco:45s} R$ {extra/1e9:5.2f} bi/ano  {dest}')
print(f"\n(o volume do Madeira, {vol['madeira']/1e6:.1f} Mt, fica fora: nao ha custo de barcaca Porto Velho publico no USDA)")
