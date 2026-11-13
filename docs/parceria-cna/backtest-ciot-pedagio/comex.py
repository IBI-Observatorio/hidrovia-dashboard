import json, time, urllib.request, sys
out = {}
for ano in range(2015, 2027):
    fim = '2026-08' if ano == 2026 else f'{ano}-12'
    body = {"flow":"export","monthDetail":True,"period":{"from":f"{ano}-01","to":fim},
            "filters":[{"filter":"ncm","values":["12019000","10059010"]}],
            "details":["urf","state","ncm"],"metrics":["metricKG"]}
    for t in range(12):
        req = urllib.request.Request("https://api-comexstat.mdic.gov.br/general",
              data=json.dumps(body).encode(), headers={"Content-Type":"application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=120)); break
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(15); continue
            raise
    rows = d['data']['list']
    out[ano] = rows
    print(ano, len(rows), rows[0] if ano==2015 else '', flush=True)
    time.sleep(12)
json.dump(out, open('comex_urf_uf.json','w'))
