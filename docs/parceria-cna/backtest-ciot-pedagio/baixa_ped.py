# Baixa CIOT (jan/2024-ago/2026) e pedagio (2015-2026), filtrando em streaming.
import csv, io, re, sys, urllib.request, os, time
OUT = os.path.dirname(os.path.abspath(__file__))
def stream(url):
    for t in range(4):
        try:
            r = urllib.request.urlopen(url, timeout=300)
            raw = r.read()
            try: txt = raw.decode('utf-8')
            except UnicodeDecodeError: txt = raw.decode('latin1')
            return txt
        except Exception as e:
            print('retry', url, e, flush=True); time.sleep(10)
    raise SystemExit('falhou '+url)


ALVO = re.compile(r'^(CRO|.*ROTA DO OESTE.*|.*VIA BRASIL.*|MSVIA)$', re.I)
ped_out = open(os.path.join(OUT,'pedagio_filtrado.csv'),'w',newline='',encoding='utf-8')
w = csv.writer(ped_out); w.writerow(['arquivo','concessionaria','data','sentido','praca','tipo_cobranca','categoria','tipo_veiculo','volume'])
for url in open(os.path.join(OUT,'urls_volume-trafego-praca-pedagio.txt')).read().split():
    f = url.split('/')[-1]
    ano = int(re.search(r'-(\d{4})', f).group(1))
    if ano < 2015: continue
    if ano >= 2024 and 'mensal_consolidado' not in f: continue
    txt = stream(url); n=0
    rd = csv.reader(io.StringIO(txt), delimiter=';'); next(rd)
    for row in rd:
        if len(row) >= 8 and ALVO.search(row[0].strip()):
            w.writerow([f]+row[:8]); n+=1
    print('pedagio', f, n, flush=True)
ped_out.close()
print('FIM')
