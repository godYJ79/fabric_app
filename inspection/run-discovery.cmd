@echo off
rem Runs the read-only schema discovery queries against a connected semantic model
rem and saves each result under inspection\results\ (that folder is not committed).
rem Usage:  inspection\run-discovery.cmd [connector-alias]      (default alias: salesmodel)
setlocal
set ALIAS=%~1
if "%ALIAS%"=="" set ALIAS=salesmodel
if not exist inspection\results mkdir inspection\results
for %%F in (01-scope 02-tables 03-measures 04-columns 05-relationships) do (
  echo.
  echo === %%F ===
  call npx rayfin connector invoke %ALIAS% executeQuery --file inspection\%%F.query.json --output-file inspection\results\%%F.json
)
echo.
echo Done. Results are in inspection\results\
