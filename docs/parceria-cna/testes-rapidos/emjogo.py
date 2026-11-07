# F6: producao (e valor) de soja+milho por municipio x participacao das rotas de saida (CIOT 2025)
import csv,json,collections,unicodedata
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper().replace("'",'').replace('-',' ').strip()
mun=json.load(open('f3/mun.json',encoding='utf-8'))
cod={}
for m in mun:
    try: uf=m['microrregiao']['mesorregiao']['UF']['sigla']
    except: continue
    cod[(norm(m['nome']),uf)]=str(m['id'])
UFde={str(m['id']):(m['microrregiao']['mesorregiao']['UF']['sigla'] if m.get('microrregiao') else '?') for m in mun}
NOME={str(m['id']):m['nome'] for m in mun}
def pam(f):
    d=collections.Counter()
    for r in json.load(open(f,encoding='utf-8'))[1:]:
        v=r['V']
        if v and v.replace('.','').isdigit(): d[r['D1C']]+=float(v)
    return d
prod=pam('f3/pam2024.json'); valor=pam('f6/pam_valor2024.json')  # t ; mil R$
ROTA={('ITAITUBA','PA'):'Tapajós (Miritituba)',('SANTAREM','PA'):'Tapajós (Miritituba)',('PORTO VELHO','RO'):'Madeira (Porto Velho)',
      ('BARCARENA','PA'):'Pará (Barcarena, rodoviário)',('SAO LUIS','MA'):'Itaqui (rod./ferro FNS)',('PORTO NACIONAL','TO'):'Itaqui (rod./ferro FNS)',
      ('PALMEIRANTE','TO'):'Itaqui (rod./ferro FNS)',('PORTO FRANCO','MA'):'Itaqui (rod./ferro FNS)',
      ('RONDONOPOLIS','MT'):'Ferrovia Rumo (Rondonópolis)',('ALTO ARAGUAIA','MT'):'Ferrovia Rumo (Rondonópolis)',('ALTO TAQUARI','MT'):'Ferrovia Rumo (Rondonópolis)',
      ('SANTOS','SP'):'Santos (rodoviário)',('GUARUJA','SP'):'Santos (rodoviário)',('PARANAGUA','PR'):'Paranaguá (rodoviário)'}
cnt=collections.defaultdict(collections.Counter); tot=collections.Counter(); nomatch=0
for r in csv.DictReader(open('bt/ciot_filtrado.csv',encoding='utf-8')):
    if not r['mes'].startswith('2025') or r['ncm'].replace('.','')[:4] not in('1201','1005') or not r['mun_o']: continue
    o=cod.get((norm(r['mun_o']),r['uf_o']))
    if not o: nomatch+=int(float(r['ciots'])); continue
    c=int(float(r['ciots'])); tot[o]+=c
    cnt[o][ROTA.get((norm(r['mun_d']),r['uf_d']),'outros destinos')]+=c
print('CIOTs sem casamento de nome:',nomatch)
res=collections.defaultdict(lambda: collections.Counter())
cobertura=0
for o,p in prod.items():
    if tot[o]<30: continue   # municipio com poucos CIOTs: participacao nao confiavel
    cobertura+=p
    for rota,c in cnt[o].items():
        s=c/tot[o]; res[rota]['t']+=p*s; res[rota]['R$']+=valor[o]*1e3*s
        if s>=0.5: res[rota]['mun50']+=1
P=sum(prod.values())
print(f'producao coberta (municipios com >=30 CIOTs em 2025): {cobertura/1e6:.1f} Mt de {P/1e6:.1f} Mt ({cobertura/P:.0%})')
for rota,v in sorted(res.items(),key=lambda x:-x[1]['t']):
    print(f"  {rota:32s} {v['t']/1e6:6.1f} Mt  R$ {v['R$']/1e9:6.1f} bi  municipios c/ >=50% dos CIOTs na rota: {v['mun50']}")
# Tapajos: quem depende
dep=[(NOME[o],UFde[o],prod[o],cnt[o]['Tapajós (Miritituba)']/tot[o]) for o in prod if tot[o]>=30 and cnt[o]['Tapajós (Miritituba)']/tot[o]>=0.3]
dep.sort(key=lambda x:-x[2]*x[3])
print('\nMunicipios mais expostos ao Tapajós (>=30% dos CIOTs de grao):')
for n,u,p,s in dep[:12]: print(f'  {n}/{u}: prod {p/1e6:.2f} Mt, {s:.0%} dos CIOTs para Miritituba')
print('UFs:',collections.Counter(u for _,u,_,_ in dep))
