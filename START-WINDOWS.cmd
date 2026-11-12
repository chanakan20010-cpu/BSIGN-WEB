@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS from https://nodejs.org/
  pause
  exit /b 1
)
node -e "if(process.versions.node.split('.')[0]!=='24') process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 LTS is required.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
call npm ci
if errorlevel 1 goto error
call npm run build
if errorlevel 1 goto error
echo Website: http://localhost:3000
echo Admin: http://localhost:3000/admin
echo Create an admin in another terminal using: npm run admin:create
call npm start
exit /b %errorlevel%
:error
 echo Setup failed. Your .data and .env have been preserved.
 pause
 exit /b 1
