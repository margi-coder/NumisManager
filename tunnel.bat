@echo off
setlocal
title NumisManager - Cloudflare Tunnel Launcher
cd /d "%~dp0"

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python run.py --tunnel %*
    goto :end
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py run.py --tunnel %*
    goto :end
)

echo [ERROR] Python tidak ditemukan di sistem Anda!
pause

:end
endlocal
