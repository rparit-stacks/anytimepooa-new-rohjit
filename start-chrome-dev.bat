@echo off
echo ========================================
echo Starting Chrome Browser (Dev Mode)
echo ========================================
echo.
echo Enabling camera/mic for: http://192.168.1.11:3000
echo.

REM Try common Chrome installation paths
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
    echo ERROR: Chrome browser not found!
    echo.
    echo Please install Chrome from: https://www.google.com/chrome/
    echo Or manually enable the flag:
    echo 1. Open Chrome
    echo 2. Go to: chrome://flags/#unsafely-treat-insecure-origin-as-secure
    echo 3. Enable and add: http://192.168.1.11:3000
    echo 4. Relaunch Chrome
    pause
    exit
)

echo Found Chrome at: %CHROME_PATH%
echo.
echo Starting Chrome with insecure origins enabled...
echo.

start "" %CHROME_PATH% --unsafely-treat-insecure-origin-as-secure="http://192.168.1.11:3000" --user-data-dir="%TEMP%\chrome-dev-profile" http://192.168.1.11:3000

echo.
echo ✅ Chrome started!
echo.
echo Camera/Microphone should now work on:
echo http://192.168.1.11:3000
echo.
echo Press any key to close this window...
pause > nul

