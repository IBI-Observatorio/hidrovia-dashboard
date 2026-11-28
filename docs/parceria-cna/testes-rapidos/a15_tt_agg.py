import csv,collections,re,sys
f=sys.argv[1]
agg=collections.defaultdict(float)
for r in csv.reader(open(f,encoding='utf-8',errors='replace'),delimiter=';'):
    if len(r)<27 or not r[4].startswith('39'): continue
    try:v=float(r[26].strip().replace('.','').replace(',','.'))
    except: continue
    agg[(r[7][:25],r[20],r[21][:60],r[23])]+=v
kw=re.compile(r'319|LOUREN|TOCANTINS|OESTE-LESTE|FIOL|CENTRO-OESTE|FICO|TRANSNORD|MADEIRA|PARAGUAI|BR-163|FERROANEL|FERROGR|PARANAGUA|SANTOS|GUARUJA|118|DRAGAGEM|HIDROVI|DERROC|MIRITITUBA',re.I)
for k,v in sorted(agg.items(),key=lambda x:-x[1]):
    if kw.search(k[2]): print(f"{v/1e6:9.1f} Mi | {k}")
