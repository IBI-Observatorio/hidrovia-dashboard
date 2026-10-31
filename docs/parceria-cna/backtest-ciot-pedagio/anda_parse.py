import pypdf, re, json
MES=['Janeiro','Fevereiro','Mar','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
ent={}
for y in (2020,2021,2022,2023,2024,2025,2026):  # vintages mais novas sobrescrevem
    t=pypdf.PdfReader(f'anda/Principais_Indicadores_{y}.pdf').pages[0].extract_text()
    lines=t.split('Total do Ano')[0].split('\n')
    hdr=next(l for l in lines if re.match(r'\s*\d{4} \d{4}',l)); anos=[int(a) for a in re.findall(r'\b(20\d\d)\b',hdr)][:4]
    for l in lines:
        s=l.strip()
        if s.startswith('Janeiro a'): continue
        for i,m in enumerate(MES):
            if s.startswith(m):
                nums=re.findall(r'\d{1,3}(?:\.\d{3})+',s)
                for a,v in zip(anos,nums): ent[f'{a}-{i+1:02d}']=int(v.replace('.',''))
json.dump(ent,open('anda_entregas.json','w'),indent=0)
print(len(ent),{k:ent[k] for k in ['2021-01','2024-01','2026-01','2026-06']})
