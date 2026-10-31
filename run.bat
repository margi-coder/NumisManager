@echo off
setlocal
title NumisManager - Smart Runner
cd /d "%~dp0"

if exist "%~dp0runtime\python\python.exe" (
    "%~dp0runtime\python\python.exe" run.py %*
    goto :end
)

if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" run.py %*
    goto :end
)

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python run.py %*
    goto :end
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py run.py %*
    goto :end
)

echo [ERROR] Python tidak ditemukan di sistem Anda!
echo Silakan unduh dan instal Python dari https://www.python.org/
pause

:end
endlocal
