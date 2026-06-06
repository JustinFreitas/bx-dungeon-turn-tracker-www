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

echo [INFO] Performing full PM2 cleanup to ensure mode changes apply...
:: Delete both possible names to be thorough
call pm2 delete bx-dungeon-turn >nul 2>&1
call pm2 delete osr-tracker >nul 2>&1

echo [INFO] Starting B/X Dungeon Turn Tracker in Fork Mode...
:: Use the ecosystem file to ensure all environment variables and limits are applied
call pm2 start ecosystem.config.js

echo [INFO] Setting up autostart...
:: PM2 Save stores the current list of processes to be resurrected on reboot
call pm2 save

echo.
echo ============================================================
echo  SUCCESS: The tracker is now running in FORK mode.
echo  It will automatically start when the system reboots.
echo ============================================================
echo.
echo Useful Commands:
echo  - View Status: pm2 status
echo  - View Logs:   pm2 logs bx-dungeon-turn
echo  - Stop App:    pm2 stop bx-dungeon-turn
echo.

pause
ENDLOCAL