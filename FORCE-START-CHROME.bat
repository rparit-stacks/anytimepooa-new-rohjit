@echo off
color 0A
echo ========================================
echo    FORCE START CHROME WITH FLAGS
echo ========================================
echo.

REM Kill all Chrome processes first
echo Step 1: Closing all Chrome windows...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

REM Find Chrome
set CHROME_PATH=""
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if %CHROME_PATH%=="" (
    color 0C
    echo.
    echo ERROR: Chrome not found!
    echo.
    echo Install from: https://www.google.com/chrome/
    echo.
    pause
    exit
)

echo Step 2: Starting Chrome with special flags...
echo.
echo Enabling camera/mic for: http://192.168.1.11:3000
echo.

REM Start Chrome with flags
start "" %CHROME_PATH% ^
    --unsafely-treat-insecure-origin-as-secure="http://192.168.1.11:3000" ^
    --user-data-dir="%TEMP%\chrome-dev-agora" ^
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
echo Chrome started with:
echo  - Camera/Mic enabled for 192.168.1.11:3000
echo  - Test page opened
echo.
echo Test the camera on the page that opened.
echo If it works, go to your app!
echo.
echo Press any key to close this window...
pause >nul



