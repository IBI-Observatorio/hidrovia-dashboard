@echo off
REM Launcher do pipeline semanal - executado toda terca-feira pelo Task Scheduler
REM 1. Boletins SACE (Python) -> data/boletins_sgb_cache.json (via /api/sgb)
REM
REM JA MIGRADO PARA A NUVEM (GitHub Actions, nao roda mais aqui):
REM   - Insights AI  -> insights-semanal.yml (POST /api/cron/insights)
REM   - Serie IDN    -> idn-semanal.yml (commita data/ana-idn-series.json)
REM   - ENSO         -> enso-mensal.yml (POST /api/cron/refresh-enso)

cd /d "C:\Users\bruno\Documents\Claude\Hidrovias\hidrovia-dashboard"

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\pipeline-sace.py >> logs\sace-pipeline.log 2>&1

exit /b %ERRORLEVEL%
