def num(s):
    s=s.strip();neg=s.startswith('(') or s.startswith('-')
    s=s.strip('()-').replace('.','').replace(',','.')
    try: v=float(s)
    except: return None
    return -v if neg else v
