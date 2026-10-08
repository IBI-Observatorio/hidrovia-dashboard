import csv,io,json,collections
# capacidade estatica granel solido por municipio (Conab)
cap=collections.Counter()
for r in csv.DictReader(io.StringIO(open('arm.txt','rb').read().decode('latin1')),delimiter=';'):
    if r['dsc_especie_armazem'].strip()!='GRANEL SÓLIDO': continue
    cap[r['cod_ibge'].strip()[:7]]+=float((r['qtd_capacidade_estatica(t)'] or '0').replace(',','.'))
# producao soja+milho 2024 (PAM 1612)
prod=collections.Counter()
for r in json.load(open('f3/pam2024.json',encoding='utf-8'))[1:]:
    v=r['V']
    if v and v.replace('.','').isdigit(): prod[r['D1C']]+=float(v)
mun={str(m['id']):m for m in json.load(open('f3/mun.json',encoding='utf-8'))}
def uf(c): return mun[c]['microrregiao']['mesorregiao']['UF']['sigla'] if c in mun and mun[c].get('microrregiao') else '?'
def micro(c): return mun[c]['microrregiao']['nome']+'/'+uf(c) if c in mun and mun[c].get('microrregiao') else '?'
P=sum(prod.values()); C=sum(cap.values())
print(f'Brasil: producao soja+milho 2024 {P/1e6:.1f} Mt | capacidade granel {C/1e6:.1f} Mt | cobertura {C/P:.2f}')
# UF
pu=collections.Counter(); cu=collections.Counter()
for k,v in prod.items(): pu[uf(k)]+=v
for k,v in cap.items(): cu[uf(k)]+=v
print('\nUF (top produtoras): prod Mt | cap Mt | cobertura')
for u,v in pu.most_common(14): print(f'  {u}: {v/1e6:6.1f} | {cu[u]/1e6:6.1f} | {cu[u]/v:.2f}')
# distribuicao municipal
ms=[(k,prod[k],cap.get(k,0)) for k in prod if prod[k]>0]
for lim in (0.1,0.25,0.5):
    sub=[m for m in ms if m[2]/m[1]<lim]
    print(f'\nproducao em municipios com cobertura < {lim:.0%}: {sum(m[1] for m in sub)/P:.1%} da producao ({len(sub)} municipios, {sum(m[1] for m in sub)/1e6:.1f} Mt)')
sem=[m for m in ms if m[2]==0 and m[1]>=100000]
print(f'municipios com >=100 mil t e ZERO capacidade cadastrada: {len(sem)} ({sum(m[1] for m in sem)/1e6:.1f} Mt)')
# microrregiao
pm=collections.Counter(); cm=collections.Counter()
for k,v in prod.items(): pm[micro(k)]+=v
for k,v in cap.items(): cm[micro(k)]+=v
print('\nMaiores deficits absolutos por MICRORREGIAO (prod - cap), Mt:')
for m_,d in sorted(((m,pm[m]-cm[m]) for m in pm),key=lambda x:-x[1])[:12]:
    print(f'  {m_}: prod {pm[m_]/1e6:.1f} cap {cm[m_]/1e6:.1f} deficit {d/1e6:.1f} cobertura {cm[m_]/pm[m_]:.2f}')
tot_def=sum(max(0,pm[m]-cm[m]) for m in pm)
print(f'\nsoma dos deficits microrregionais: {tot_def/1e6:.1f} Mt (vs deficit nacional liquido {(P-C)/1e6:.1f} Mt)')
json.dump({'P':P,'C':C},open('f3/res.json','w'))
