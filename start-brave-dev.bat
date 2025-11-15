@echo off
echo ========================================
echo Starting Brave Browser (Dev Mode)
echo ========================================
echo.
echo Enabling camera/mic for: http://192.168.1.11:3000
echo.

REM Try common Brave installation paths
set BRAVE_PATH=""

if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE_PATH="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
)

if exist "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE_PATH="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
)

if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE_PATH="%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

if %BRAVE_PATH%=="" (
    echo ERROR: Brave browser not found!
    echo.
    echo Please install Brave from: https://brave.com/download/
    echo Or manually enable the flag:
    echo 1. Open Brave
    echo 2. Go to: brave://flags/#unsafely-treat-insecure-origin-as-secure
    echo 3. Enable and add: http://192.168.1.11:3000
    echo 4. Relaunch Brave
    pause
    exit
)

echo Found Brave at: %BRAVE_PATH%
echo.
echo Starting Brave with insecure origins enabled...
echo.

start "" %BRAVE_PATH% --unsafely-treat-insecure-origin-as-secure="http://192.168.1.11:3000" --user-data-dir="%TEMP%\brave-dev-profile" http://192.168.1.11:3000

echo.
echo ✅ Brave started!
echo.
echo Camera/Microphone should now work on:
echo http://192.168.1.11:3000
echo.
echo Press any key to close this window...
pause > nul

