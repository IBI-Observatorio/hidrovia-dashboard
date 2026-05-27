@echo off
REM Launcher do pipeline SACE - executado toda terca-feira pelo Task Scheduler
REM Navega para o projeto e chama o Python correto

cd /d "C:\Users\bruno\Documents\Claude\Hidrovias\hidrovia-dashboard"

"C:\Users\bruno\AppData\Local\Python\pythoncore-3.14-64\python.exe" ^
  scripts\pipeline-sace.py >> logs\sace-pipeline.log 2>&1

exit /b %ERRORLEVEL%
