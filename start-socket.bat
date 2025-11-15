@echo off
echo.
echo ========================================
echo   Starting Socket.IO Server
echo ========================================
echo.
echo Checking environment variables...
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo ERROR: .env.local file not found!
    echo.
    echo Please create .env.local with:
    echo   NEXT_PUBLIC_SUPABASE_URL=your_url
    echo   SUPABASE_SERVICE_ROLE_KEY=your_key
    echo   NEXT_PUBLIC_APP_URL=http://localhost:3000
    echo   SOCKET_PORT=3001
    echo.
    pause
    exit /b 1
)

echo .env.local found!
echo Starting Socket.IO server on port 3001...
echo.

node socket-server.js

