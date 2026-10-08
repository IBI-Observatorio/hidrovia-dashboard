# F7 - prototipo da ficha logistica municipal com dado real. Mede cobertura, casamento de bases e diferenciacao.
import csv,io,json,collections,unicodedata,statistics as st,openpyxl,warnings; warnings.filterwarnings('ignore')
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',str(s)) if not unicodedata.combining(c)).upper().replace("'",'').replace('-',' ').strip()
mun=json.load(open('f3/mun.json',encoding='utf-8'))
INFO={}; COD={}
UFN={}
for m in mun:
    if not m.get('microrregiao'): continue
    uf=m['microrregiao']['mesorregiao']['UF']; c=str(m['id'])
    INFO[c]=dict(nome=m['nome'],uf=uf['sigla'],micro=m['microrregiao']['nome']); COD[(norm(m['nome']),uf['sigla'])]=c; UFN[norm(uf['nome'])]=uf['sigla']
def pam(f):
    d=collections.Counter()
    for r in json.load(open(f,encoding='utf-8'))[1:]:
        v=r['V']
        if v and v.replace('.','').isdigit(): d[r['D1C']]+=float(v)
    return d
prod=pam('f3/pam2024.json'); valor=pam('f6/pam_valor2024.json')
# silo
cap=collections.Counter()
for r in csv.DictReader(io.StringIO(open('arm.txt','rb').read().decode('latin1')),delimiter=';'):
    if r['dsc_especie_armazem'].strip()=='GRANEL SÓLIDO': cap[r['cod_ibge'].strip()[:7]]+=float((r['qtd_capacidade_estatica(t)'] or '0').replace(',','.'))
pm=collections.Counter(); cm=collections.Counter()
for c,v in prod.items(): pm[INFO.get(c,{}).get('micro')]+=v
for c,v in cap.items(): cm[INFO.get(c,{}).get('micro')]+=v
# diesel S10 ANP semana 13-19/09/2026 (postos -> mediana por municipio)
ws=openpyxl.load_workbook('anp.xlsx',read_only=True,data_only=True).worksheets[0]
dz=collections.defaultdict(list); rows=list(ws.iter_rows(values_only=True))
hi=next(i for i,r in enumerate(rows) if r and r[0]=='CNPJ')
nao=0
for r in rows[hi+1:]:
    if r and r[11]=='DIESEL S10' and r[13]:
        c=COD.get((norm(r[8]),UFN.get(norm(r[9]),'?')))
        if c: dz[c].append(float(r[13]))
        else: nao+=1
dmun={c:st.median(v) for c,v in dz.items()}
dmic=collections.defaultdict(list); duf=collections.defaultdict(list)
for c,v in dmun.items(): dmic[INFO[c]['micro']].append(v); duf[INFO[c]['uf']].append(v)
def diesel(c):
    if c in dmun: return dmun[c],'município'
    m=INFO[c]['micro']
    if dmic.get(m): return st.median(dmic[m]),'microrregião'
    return (st.median(duf[INFO[c]['uf']]),'UF') if duf.get(INFO[c]['uf']) else (None,'-')
# rotas CIOT 2025
ROTA={('ITAITUBA','PA'):'Tapajós (Miritituba)',('SANTAREM','PA'):'Tapajós (Miritituba)',('PORTO VELHO','RO'):'Madeira (Porto Velho)',('BARCARENA','PA'):'Barcarena',('SAO LUIS','MA'):'Itaqui',('PORTO NACIONAL','TO'):'Itaqui (Ferrovia Norte-Sul)',('PALMEIRANTE','TO'):'Itaqui (Ferrovia Norte-Sul)',('PORTO FRANCO','MA'):'Itaqui (Ferrovia Norte-Sul)',('RONDONOPOLIS','MT'):'Rumo (Rondonópolis)',('ALTO ARAGUAIA','MT'):'Rumo (Rondonópolis)',('ALTO TAQUARI','MT'):'Rumo (Rondonópolis)',('SANTOS','SP'):'Santos',('GUARUJA','SP'):'Santos',('PARANAGUA','PR'):'Paranaguá',('RIO GRANDE','RS'):'Rio Grande',('SAO FRANCISCO DO SUL','SC'):'São Francisco do Sul'}
dest=collections.defaultdict(collections.Counter); tot=collections.Counter()
for r in csv.DictReader(open('bt/ciot_filtrado.csv',encoding='utf-8')):
    if not r['mes'].startswith('2025') or r['ncm'].replace('.','')[:4] not in('1201','1005') or not r['mun_o']: continue
    o=COD.get((norm(r['mun_o']),r['uf_o']))
    if not o: continue
    n=int(float(r['ciots'])); tot[o]+=n
    dest[o][ROTA.get((norm(r['mun_d']),r['uf_d'])) or ('local/regional' if r['uf_d']==r['uf_o'] else 'outros')]+=n
# ---- montagem
P=sum(prod.values()); top=[c for c,_ in prod.most_common(500)]
fichas={}
for c in top:
    d,nivel=diesel(c)
    fichas[c]=dict(municipio=INFO[c]['nome'],uf=INFO[c]['uf'],microrregiao=INFO[c]['micro'],prod_mil_t=round(prod[c]/1e3),valor_mi_R=round(valor[c]/1e3),
        silo_mil_t=round(cap.get(c,0)/1e3),cobertura_mun=round(cap.get(c,0)/prod[c],2),cobertura_micro=round(cm[INFO[c]['micro']]/pm[INFO[c]['micro']],2),
        ciots_2025=tot[c],rotas={k:round(v/tot[c],2) for k,v in dest[c].most_common(4)} if tot[c]>=30 else None,
        diesel_s10=round(d,2) if d else None,diesel_nivel=nivel)
cov=lambda f: sum(prod[c] for c in top if f(fichas[c]))/sum(prod[c] for c in top)
print(f'top 500 municipios = {sum(prod[c] for c in top)/P:.0%} da producao soja+milho 2024')
print(f"  com silo cadastrado: {cov(lambda x:x['silo_mil_t']>0):.0%} | com rotas CIOT (>=30): {cov(lambda x:x['rotas'] is not None):.0%}")
print('  diesel por nivel:',collections.Counter(fichas[c]['diesel_nivel'] for c in top),'| postos S10 sem casamento de municipio:',nao)
print(f"  fichas completas (silo, rotas e diesel em qualquer nivel): {sum(1 for c in top if fichas[c]['silo_mil_t']>0 and fichas[c]['rotas'] and fichas[c]['diesel_s10'])}")
# diferenciacao
cob=[fichas[c]['cobertura_mun'] for c in top]; ds=[fichas[c]['diesel_s10'] for c in top if fichas[c]['diesel_s10']]
q=lambda v,p: sorted(v)[int(p*(len(v)-1))]
print(f'  cobertura municipal p10/p50/p90: {q(cob,.1)}/{q(cob,.5)}/{q(cob,.9)} | diesel S10 p10/p50/p90: {q(ds,.1)}/{q(ds,.5)}/{q(ds,.9)}')
rp=collections.Counter(max(fichas[c]['rotas'],key=fichas[c]['rotas'].get) for c in top if fichas[c]['rotas']); print('  rota principal:',rp.most_common(8))
json.dump(fichas,open('f7/fichas_top500.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
for nome,uf in [('Sorriso','MT'),('Marcelândia','MT'),('Rio Verde','GO'),('Luís Eduardo Magalhães','BA'),('Paragominas','PA'),('Cascavel','PR')]:
    c=COD[(norm(nome),uf)]; print(json.dumps(fichas.get(c,'fora do top 500'),ensure_ascii=False))
