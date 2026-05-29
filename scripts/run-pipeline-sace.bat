@echo off
REM Launcher do pipeline semanal - executado toda terca-feira pelo Task Scheduler
REM 1. Boletins SACE (Python)              -> data/boletins_sgb_cache.json (via /api/sgb)
REM 2. Série IDN via API ANA (Node.js)     -> data/ana-idn-series.json
REM 3. ENSO Diagnostic Discussion CPC/NOAA -> data/enso_cpc_cache.json (mensal, 2a quinta)
REM 4. Insights AI via Claude API (Node.js) -> data/insights_ai_cache.json

cd /d "C:\Users\bruno\Documents\Claude\Hidrovias\hidrovia-dashboard"

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\pipeline-sace.py >> logs\sace-pipeline.log 2>&1

node scripts\atualiza-idn-series.mjs >> logs\idn-pipeline.log 2>&1

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\scrape-enso-cpc.py >> logs\enso-pipeline.log 2>&1

node scripts\gera-insights-ai.mjs >> logs\insights-ai.log 2>&1

exit /b %ERRORLEVEL%
