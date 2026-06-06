@echo off
SETLOCAL

:: Check if PM2 is installed
call pm2 -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PM2 is not installed. Please install it first using: npm install pm2 -g
    pause
    exit /b 1
)

echo [INFO] Installing project dependencies...
call npm install --silent

echo [INFO] Starting OSR Dungeon Turn Tracker with PM2...
:: Use the ecosystem file to ensure all environment variables and limits are applied
call pm2 start ecosystem.config.js

echo [INFO] Setting up autostart...
:: PM2 Save stores the current list of processes to be resurrected on reboot
call pm2 save

echo.
echo ============================================================
echo  SUCCESS: The tracker is now running in PM2.
echo  It will automatically start when the system reboots.
echo ============================================================
echo.
echo Useful Commands:
echo  - View Status: pm2 status
echo  - View Logs:   pm2 logs osr-tracker
echo  - Stop App:    pm2 stop osr-tracker
echo.

pause
ENDLOCAL