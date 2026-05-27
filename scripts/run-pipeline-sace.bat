@echo off
REM Launcher do pipeline semanal - executado toda terca-feira pelo Task Scheduler
REM 1. Boletins SACE (Python)
REM 2. Série IDN via API ANA (Node.js)

cd /d "C:\Users\bruno\Documents\Claude\Hidrovias\hidrovia-dashboard"

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\pipeline-sace.py >> logs\sace-pipeline.log 2>&1

node scripts\atualiza-idn-series.mjs >> logs\idn-pipeline.log 2>&1

exit /b %ERRORLEVEL%
