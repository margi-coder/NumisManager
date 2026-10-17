#!/usr/bin/env bash
# ==============================================================================
# 🪙 NumisManager - Linux & macOS Cloudflare Tunnel Launcher
# ==============================================================================
set -e
cd "$(dirname "$0")"

if command -v python3 &>/dev/null; then
    exec python3 run.py --tunnel "$@"
elif command -v python &>/dev/null; then
    exec python run.py --tunnel "$@"
else
    echo "[ERROR] Python 3 tidak ditemukan di sistem Anda."
    exit 1
fi
