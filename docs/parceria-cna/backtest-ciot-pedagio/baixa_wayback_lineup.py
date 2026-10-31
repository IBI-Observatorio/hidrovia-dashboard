# Baixa as capturas do line-up APPA arquivadas no Wayback (lista em cdx.json) para snaps/.
# Gerar cdx.json: https://web.archive.org/cdx/search/cdx?url=appaweb.appa.pr.gov.br/appaweb/pesquisa.aspx*&output=json&fl=timestamp,original,statuscode,length&limit=5000
import json,urllib.request,time,os
os.makedirs('snaps',exist_ok=True)
for ts,orig,st,ln in json.load(open('cdx.json'))[1:]:
    if 'lineup' not in orig.lower() or st!='200' or os.path.exists(f'snaps/{ts}.html'): continue
    b=urllib.request.urlopen(urllib.request.Request(f'https://web.archive.org/web/{ts}id_/{orig}',headers={'User-Agent':'Mozilla/5.0'}),timeout=90).read()
    open(f'snaps/{ts}.html','wb').write(b); time.sleep(2)
