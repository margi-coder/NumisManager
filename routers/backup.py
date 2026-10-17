from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from utils.auth_utils import get_current_user
from utils.backup_db import (
    create_database_backup,
    list_backups,
    get_backup_file_path
)

router = APIRouter(prefix="/api/backup", tags=["Database Backup & Snapshot"])

class BackupCreateRequest(BaseModel):
    catatan: Optional[str] = "Manual Backup dari UI"

@router.post("/create")
def trigger_backup(
    payload: Optional[BackupCreateRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Memicu pencadangan snapshot database secara langsung."""
    note = payload.catatan if payload else "Manual Backup dari UI"
    try:
        result = create_database_backup(note=note)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal membuat cadangan database: {str(e)}"
        )

@router.get("/list")
def get_backups(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Mendapatkan daftar seluruh arsip cadangan yang tersimpan."""
    return list_backups()

@router.get("/download/{filename}")
def download_backup(
    filename: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mengunduh berkas cadangan database dalam format ZIP."""
    target_path = get_backup_file_path(filename)
    if not target_path or not target_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Berkas cadangan tidak ditemukan"
        )

    return FileResponse(
        path=str(target_path),
        filename=target_path.name,
        media_type="application/zip"
    )
