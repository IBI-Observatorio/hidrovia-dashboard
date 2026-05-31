@echo off
REM Launcher do pipeline semanal - executado toda terca-feira pelo Task Scheduler
REM 1. Boletins SACE (Python)              -> data/boletins_sgb_cache.json (via /api/sgb)
REM 2. ENSO Diagnostic Discussion CPC/NOAA -> data/enso_cpc_cache.json (mensal, 2a quinta)
REM
REM JA MIGRADO PARA A NUVEM (GitHub Actions, nao roda mais aqui):
REM   - Insights AI  -> insights-semanal.yml (POST /api/cron/insights)
REM   - Serie IDN    -> idn-semanal.yml (commita data/ana-idn-series.json)

cd /d "C:\Users\bruno\Documents\Claude\Hidrovias\hidrovia-dashboard"

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\pipeline-sace.py >> logs\sace-pipeline.log 2>&1

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\scrape-enso-cpc.py >> logs\enso-pipeline.log 2>&1

exit /b %ERRORLEVEL%
