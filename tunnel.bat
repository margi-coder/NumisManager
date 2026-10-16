@echo off
title NumisManager - Cloudflare Tunnel (Remote / Mobile Access)
echo.
echo  ======================================================
echo    NumisManager - Cloudflare Tunnel Launcher
echo  ======================================================
echo.
echo  Membuka akses internet publik ke server lokal (port 8000)...
echo  Pastikan server NumisManager (run.bat) sudah berjalan terlebih dahulu.
echo.
echo  Tekan CTRL+C untuk menutup akses tunnel.
echo.
if exist ".\cloudflared.exe" (
    .\cloudflared.exe tunnel --url http://localhost:8000
) else (
    echo [ERROR] Berkas cloudflared.exe tidak ditemukan di folder ini.
    pause
)
