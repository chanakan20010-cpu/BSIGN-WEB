@echo off
setlocal
cd /d "%~dp0"
start "BSIGN TECH Preview" wscript.exe "%~dp0OPEN-PREVIEW.vbs"
exit /b 0
