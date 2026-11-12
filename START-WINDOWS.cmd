@echo off
setlocal
cd /d "%~dp0"
title BSIGN TECH - Website Preview
powershell.exe -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0scripts\windows\console.ps1" %*
set "BSIGN_PREVIEW_EXIT=%ERRORLEVEL%"
if not "%BSIGN_PREVIEW_EXIT%"=="0" (
  echo.
  echo Preview could not start. See the message above or START-HERE.html.
  if /i not "%~1"=="-SmokeTest" pause
)
exit /b %BSIGN_PREVIEW_EXIT%
