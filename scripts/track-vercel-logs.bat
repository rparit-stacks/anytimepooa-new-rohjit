@echo off
REM Vercel Live Logs Tracker for Windows

echo 🔍 Starting Vercel Logs Tracker...
echo.

REM Check if vercel CLI is installed
where vercel >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI not found!
    echo Installing Vercel CLI...
    call npm install -g vercel
    echo ✅ Vercel CLI installed!
    echo.
)

REM Check if logged in to Vercel
echo Checking Vercel authentication...
vercel whoami >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Not logged in to Vercel!
    echo Please run: vercel login
    echo Or run: vercel login --github
    exit /b 1
)

echo ✅ Logged in to Vercel
echo.

REM Project name
set PROJECT_NAME=anytimepooa-new-rohjit
echo 📦 Project: %PROJECT_NAME%
echo.

echo 🔴 Filtering for:
echo   - [Middleware]
echo   - [getCurrentUser]
echo   - [v0]
echo   - [Dashboard]
echo   - Cookie
echo   - Session
echo.

echo 📡 Streaming live logs (Press Ctrl+C to stop)...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Stream logs
vercel logs --follow %PROJECT_NAME%

