@echo off
REM ============================================================================
REM APOSENTADO — todo o pipeline migrou para a nuvem (GitHub Actions -> Railway).
REM Este .bat nao faz mais nada. A tarefa do Windows "SACEPipelineSemanal" pode
REM ser desabilitada/removida.
REM
REM   - Boletins SACE/SGB -> sgb-semanal.yml      (POST /api/cron/refresh-sgb)
REM   - Insights AI        -> insights-semanal.yml (POST /api/cron/insights)
REM   - Serie IDN          -> idn-semanal.yml      (commita data/ana-idn-series.json)
REM   - ENSO               -> enso-mensal.yml      (POST /api/cron/refresh-enso)
REM
REM Os scripts Python/Node continuam no repo para execucao manual, se preciso.
REM ============================================================================

echo Pipeline migrado para a nuvem. Nada a executar localmente.
exit /b 0
