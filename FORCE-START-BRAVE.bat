@echo off
color 0A
echo ========================================
echo    FORCE START BRAVE WITH FLAGS
echo ========================================
echo.

REM Kill all Brave processes first
echo Step 1: Closing all Brave windows...
taskkill /F /IM brave.exe 2>nul
timeout /t 2 /nobreak >nul

REM Find Brave
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
    color 0C
    echo.
    echo ERROR: Brave not found!
    echo.
    echo Install from: https://brave.com/download/
    echo.
    pause
    exit
)

echo Step 2: Starting Brave with special flags...
echo.
echo Enabling camera/mic for: http://192.168.1.11:3000
echo.

REM Start Brave with flags
start "" %BRAVE_PATH% ^
    --unsafely-treat-insecure-origin-as-secure="http://192.168.1.11:3000" ^
    --user-data-dir="%TEMP%\brave-dev-agora" ^
    --enable-features=WebRTC-H264WithOpenH264FFmpeg ^
    --disable-web-security ^
    --allow-insecure-localhost ^
    "http://192.168.1.11:3000/TEST_CAMERA.html"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    SUCCESS!
echo ========================================
echo.
echo Brave started with:
echo  - Camera/Mic enabled for 192.168.1.11:3000
echo  - Test page opened
echo.
echo Test the camera on the page that opened.
echo If it works, go to your app!
echo.
echo Press any key to close this window...
pause >nul

