#!/usr/bin/env bash
# ==============================================================================
# 🪙 NumisManager - Linux & macOS Smart Runner
# ==============================================================================
set -e
cd "$(dirname "$0")"

if command -v python3 &>/dev/null; then
    exec python3 run.py "$@"
elif command -v python &>/dev/null; then
    exec python run.py "$@"
else
    echo "[ERROR] Python 3 tidak ditemukan di sistem Anda."
    echo "Silakan instal Python 3 via package manager (apt, dnf, pacman, brew)."
    exit 1
fi
