# Carteira v1 - Coluna A (12 obras). Pre-registro congelado em 27/09/2026 (sha256 28ec73f0...).
# Regras de aplicacao (mecanicas, documentadas no resultado):
#  A2 = producao soja+milho 2024 (PAM) x participacao dos CIOTs de grao 2025 com destino nos terminais/portos do corredor
#       que a obra atende HOJE (Tapajos: Itaituba, Santarem | Madeira: Porto Velho | Paranagua | Malha Sul: Paranagua,
#       Sao Francisco do Sul, Rio Grande | Paraguai: Corumba, Ladario, Porto Murtinho | Transnordestina: Sao Goncalo do Amarante/CE).
#       Obra cujo corredor ainda nao existe (FICO, FIOL, EF-118, Pedral, BR-319) = sem dado.
#  Normalizacao: percentil por midrank, (rank-0,5)/n, entre as obras com dado no criterio.
#  "Nao se aplica" (A5 fora de hidrovia) sai do peso e da cobertura; "sem dado" sai do peso mas conta como nao coberto.
import csv,json,collections,unicodedata,math
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper().replace("'",'').replace('-',' ').strip()
mun=json.load(open('f3/mun.json',encoding='utf-8')); COD={}
for m in mun:
    if m.get('microrregiao'): COD[(norm(m['nome']),m['microrregiao']['mesorregiao']['UF']['sigla'])]=str(m['id'])
prod=collections.Counter()
for r in json.load(open('f3/pam2024.json',encoding='utf-8'))[1:]:
    if r['V'] and r['V'].replace('.','').isdigit(): prod[r['D1C']]+=float(r['V'])
DEST={'tapajos':{('ITAITUBA','PA'),('SANTAREM','PA')},'madeira':{('PORTO VELHO','RO')},'paranagua':{('PARANAGUA','PR')},
      'malhasul':{('PARANAGUA','PR'),('SAO FRANCISCO DO SUL','SC'),('RIO GRANDE','RS')},
      'paraguai':{('CORUMBA','MS'),('LADARIO','MS'),('PORTO MURTINHO','MS')},'pecem':{('SAO GONCALO DO AMARANTE','CE')}}
cnt=collections.defaultdict(collections.Counter); tot=collections.Counter()
for r in csv.DictReader(open('bt/ciot_filtrado.csv',encoding='utf-8')):
    if not r['mes'].startswith('2025') or r['ncm'].replace('.','')[:4] not in('1201','1005') or not r['mun_o']: continue
    o=COD.get((norm(r['mun_o']),r['uf_o']))
    if not o: continue
    n=int(float(r['ciots'])); tot[o]+=n; d=(norm(r['mun_d']),r['uf_d'])
    for k,S in DEST.items():
        if d in S: cnt[o][k]+=n
vol={k:sum(prod[o]*cnt[o][k]/tot[o] for o in cnt if tot[o]>=30)/1e6 for k in DEST}
print('A2 por corredor (Mt):',{k:round(v,2) for k,v in vol.items()})
SD=None; NA='n/a'
O={ # A1 (Mt, ponderado agro), A2 corredor, A3, A4 (R$ bi/ano), A5 (anos), A6
 'BR-163/Miritituba':  dict(A1=SD,  A2='tapajos',  A3=1,A4=1.6,A5=NA,A6=SD),
 'Ferrogrão':          dict(A1=23.41,A2='tapajos', A3=1,A4=1.6,A5=NA,A6=SD),
 'FICO':               dict(A1=13*0.96,A2=SD,      A3=0,A4=SD, A5=NA,A6=SD),
 'FIOL 2-3':           dict(A1=4.0, A2=SD,         A3=0,A4=SD, A5=NA,A6=SD),
 'EF-118':             dict(A1=40.0,A2=SD,         A3=0,A4=SD, A5=NA,A6=SD),
 'Malha Sul':          dict(A1=SD,  A2='malhasul', A3=0,A4=SD, A5=NA,A6=SD),
 'Transnordestina':    dict(A1=SD,  A2='pecem',    A3=0,A4=SD, A5=NA,A6=SD),
 'BR-319':             dict(A1=SD,  A2=SD,         A3=0,A4=SD, A5=NA,A6=SD),
 'Hidrovia do Madeira':dict(A1=13*(0.48+0.27+600/11824.26),A2='madeira',A3=0,A4=SD,A5=2,A6=SD),
 'Hidrovia do Paraguai':dict(A1=9.0,A2='paraguai', A3=0,A4=SD, A5=SD,A6=SD),
 'Pedral do Lourenço': dict(A1=20.0,A2=SD,         A3=0,A4=SD, A5=SD,A6=SD),
 'Canal de Paranaguá': dict(A1=SD,  A2='paranagua',A3=0,A4=SD, A5=NA,A6=SD),
}
for o in O.values():
    if isinstance(o['A2'],str) and o['A2']!=NA: o['A2']=round(vol[o['A2']],2)
W={'A1':0.30,'A2':0.25,'A4':0.20,'A5':0.10,'A6':0.15}
def pct(c):
    vals={k:v[c] for k,v in O.items() if v[c] not in (SD,NA)}
    s=sorted(vals.values()); n=len(s); out={}
    for k,v in vals.items():
        lo=sum(1 for x in s if x<v); eq=sum(1 for x in s if x==v); out[k]=(lo+ (eq+1)/2 -0.5)/n
    return out
P={c:pct(c) for c in W}
def nota(W,mod=True):
    res={}
    for k,v in O.items():
        wa=0;wc=0;sc=0
        for c,w in W.items():
            if v[c]==NA: continue
            ww=w*(2 if (c=='A1' and mod and v['A3']==1) else 1)
            wa+=ww
            if v[c]!=SD: wc+=ww; sc+=ww*P[c][k]
        res[k]=(sc/wc if wc else None, wc/wa)
    return res
base=nota(W); iguais=nota({c:0.2 for c in W},mod=False); semA6=nota({c:w for c,w in W.items() if c!='A6'})
def rank(res):
    ok=[(k,v[0]) for k,v in res.items() if v[1]>=0.6 and v[0] is not None]
    return [k for k,_ in sorted(ok,key=lambda x:-x[1])]
rb,ri,rs=rank(base),rank(iguais),rank(semA6)
print('\nobra | A1 | A2 | A3 | A4 | A5 | cobertura | nota base | posicao base / pesos iguais / sem A6')
for k in sorted(O,key=lambda k:(-(base[k][0] or -1) if base[k][1]>=0.6 else 9, k)):
    v=O[k]; f=lambda x: 'sem dado' if x is SD else ('n/a' if x==NA else (f'{x:.2f}' if isinstance(x,float) else str(x)))
    print(f"{k:22s}| {f(v['A1'])} | {f(v['A2'])} | {v['A3']} | {f(v['A4'])} | {f(v['A5'])} | {base[k][1]:.0%} | {'' if base[k][1]<0.6 else round(base[k][0],3)} | "
          f"{(rb.index(k)+1) if k in rb else 'a instruir'} / {(ri.index(k)+1) if k in ri else 'a instruir'} / {(rs.index(k)+1) if k in rs else 'a instruir'}")
mud=max(abs(rb.index(k)-ri.index(k)) for k in rb[:5] if k in ri) if rb else 0
print('\nmaior mudanca de posicao no top-5 (base x pesos iguais):',mud,'-> publicar em FAIXAS' if mud>2 else '-> ordem numerica permitida')
json.dump({'O':O,'base':base,'iguais':iguais,'semA6':semA6,'rank_base':rb,'rank_iguais':ri,'vol':vol},open('carteira/resultado_v1.json','w'),ensure_ascii=False,indent=1,default=str)
