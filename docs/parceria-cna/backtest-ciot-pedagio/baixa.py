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

# ---- CIOT: guarda soja(1201), milho(1005), fertilizante(31xx) com origem ou destino
ciot_out = open(os.path.join(OUT,'ciot_filtrado.csv'),'w',newline='',encoding='utf-8')
w = csv.writer(ciot_out); w.writerow(['mes','mun_o','uf_o','mun_d','uf_d','ncm','ciots','trc','contratantes'])
for url in open(os.path.join(OUT,'urls_ciot.txt')).read().split():
    m = re.search(r'/(\d\d)_(\d{4})_ciots\.csv$', url)
    if not m: continue
    mes = f'{m.group(2)}-{m.group(1)}'
    txt = stream(url); n=0
    rd = csv.reader(io.StringIO(txt), delimiter=';')
    hdr = next(rd)
    for row in rd:
        if len(row) < 8: continue
        ncm = row[4].strip().replace('.','')
        if ncm.startswith('1201') or ncm.startswith('1005') or ncm.startswith('31'):
            w.writerow([mes]+[c.strip() for c in row[:8]]); n+=1
    print('ciot', mes, 'hdr', hdr[:5], 'linhas', n, flush=True)
ciot_out.close()

# ---- Pedagio: concessionarias do corredor BR-163
ALVO = re.compile(r'ROTA DO OESTE|VIA BRASIL', re.I)
ped_out = open(os.path.join(OUT,'pedagio_filtrado.csv'),'w',newline='',encoding='utf-8')
w = csv.writer(ped_out); w.writerow(['arquivo','concessionaria','data','sentido','praca','tipo_cobranca','categoria','tipo_veiculo','volume'])
for url in open(os.path.join(OUT,'urls_volume-trafego-praca-pedagio.txt')).read().split():
    f = url.split('/')[-1]
    ano = re.search(r'-(\d{4})', f).group(1)
    if int(ano) < 2015: continue
    if ano in ('2024','2025','2026') and 'mensal_consolidado' not in f and 'diario' not in f: continue
    txt = stream(url); n=0
    rd = csv.reader(io.StringIO(txt), delimiter=';'); next(rd)
    for row in rd:
        if len(row) >= 8 and ALVO.search(row[0]):
            w.writerow([f]+row[:8]); n+=1
    print('pedagio', f, n, flush=True)
ped_out.close()
print('FIM')
