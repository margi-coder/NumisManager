"""
================================================================================
NumisManager - SQLite Database Automated Backup Utility
================================================================================
Melakukan pencadangan SQLite (online backup) yang konsisten secara atomik,
mengompresi hasilnya ke format ZIP berstempel waktu, dan mengelola rotasi file.
"""

import os
import sqlite3
import zipfile
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "database" / "numismatik.db"
BACKUP_DIR = ROOT_DIR / "backups"
MAX_BACKUP_RETENTION = 15


def ensure_backup_dir() -> Path:
    """Memastikan direktori backups/ tersedia."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    gitkeep = BACKUP_DIR / ".gitkeep"
    if not gitkeep.exists():
        gitkeep.touch()
    return BACKUP_DIR


def format_bytes(size: int) -> str:
    """Format ukuran berkas menjadi satuan yang mudah dibaca."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"


def create_database_backup(note: Optional[str] = None) -> Dict[str, Any]:
    """
    Membuat snapshot cadangan database SQLite secara aman (online backup)
    dan mengompresinya menjadi berkas .zip berstempel waktu.
    """
    ensure_backup_dir()

    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database tidak ditemukan di {DB_PATH}")

    now = datetime.now()
    timestamp_str = now.strftime("%Y%m%d_%H%M%S")
    temp_db_name = f"temp_numismatik_{timestamp_str}.db"
    temp_db_path = BACKUP_DIR / temp_db_name
    zip_filename = f"numismatik_backup_{timestamp_str}.zip"
    zip_path = BACKUP_DIR / zip_filename

    # 1. Jalankan SQLite Online Backup API (Aman dijalankan saat server aktif)
    source_conn = sqlite3.connect(str(DB_PATH))
    dest_conn = sqlite3.connect(str(temp_db_path))
    try:
        source_conn.backup(dest_conn, pages=100)
    finally:
        dest_conn.close()
        source_conn.close()

    # 2. Kompresi berkas DB ke dalam ZIP dengan kompresi DEFLATED
    sha256 = hashlib.sha256()
    with open(temp_db_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    checksum = sha256.hexdigest()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(temp_db_path, arcname="numismatik.db")

    # 3. Hapus berkas DB sementara
    if temp_db_path.exists():
        temp_db_path.unlink()

    zip_size = zip_path.stat().st_size

    # 4. Rotasi cadangan lama (hanya simpan MAX_BACKUP_RETENTION terakhir)
    cleanup_old_backups(keep_count=MAX_BACKUP_RETENTION)

    return {
        "status": "success",
        "filename": zip_filename,
        "path": str(zip_path),
        "size_bytes": zip_size,
        "size_formatted": format_bytes(zip_size),
        "checksum_sha256": checksum,
        "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "note": note or "Manual/Automated Snapshot"
    }


def list_backups() -> List[Dict[str, Any]]:
    """Mendaftar seluruh arsip cadangan yang tersimpan di folder backups/."""
    ensure_backup_dir()
    backups = []

    for f in BACKUP_DIR.glob("numismatik_backup_*.zip"):
        st = f.stat()
        mtime = datetime.fromtimestamp(st.st_mtime)
        backups.append({
            "filename": f.name,
            "size_bytes": st.st_size,
            "size_formatted": format_bytes(st.st_size),
            "created_at": mtime.strftime("%Y-%m-%d %H:%M:%S"),
            "mtime_epoch": st.st_mtime
        })

    # Urutkan dari yang paling baru
    backups.sort(key=lambda x: x["mtime_epoch"], reverse=True)
    return backups


def cleanup_old_backups(keep_count: int = 15):
    """Menghapus cadangan lama yang melebihi batas retensi."""
    backups = list_backups()
    if len(backups) > keep_count:
        for old in backups[keep_count:]:
            p = BACKUP_DIR / old["filename"]
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass


def get_backup_file_path(filename: str) -> Optional[Path]:
    """Mencegah path traversal saat mengunduh berkas cadangan."""
    safe_name = os.path.basename(filename)
    if not safe_name.startswith("numismatik_backup_") or not safe_name.endswith(".zip"):
        return None
    target = BACKUP_DIR / safe_name
    return target if target.exists() else None


if __name__ == "__main__":
    print("[BACKUP] Memulai proses pencadangan database...")
    result = create_database_backup("CLI Execution")
    print(f"[OK] Berkas cadangan berhasil dibuat: {result['filename']} ({result['size_formatted']})")
