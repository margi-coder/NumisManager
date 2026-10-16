from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3
from database.db import get_db
from database.models import SupplierCreate, SupplierUpdate, SupplierResponse
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/supplier", tags=["Supplier Management"])

@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(
    search: Optional[str] = Query(None, description="Pencarian nama, no hp, atau alamat"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mengambil daftar seluruh supplier dengan opsi pencarian."""
    cursor = conn.cursor()
    if search:
        search_param = f"%{search.strip()}%"
        cursor.execute(
            """
            SELECT id, nama, alamat, no_hp, link_profile, catatan, created_by, created_at, updated_at
            FROM supplier
            WHERE nama LIKE ? OR no_hp LIKE ? OR alamat LIKE ?
            ORDER BY nama ASC
            """,
            (search_param, search_param, search_param)
        )
    else:
        cursor.execute(
            """
            SELECT id, nama, alamat, no_hp, link_profile, catatan, created_by, created_at, updated_at
            FROM supplier
            ORDER BY nama ASC
            """
        )
    suppliers = cursor.fetchall()
    return [dict(s) for s in suppliers]

@router.post("/", response_model=SupplierResponse)
def create_supplier(
    payload: SupplierCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menambahkan data supplier baru."""
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO supplier (nama, alamat, no_hp, link_profile, catatan, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            payload.nama.strip(),
            payload.alamat,
            payload.no_hp,
            payload.link_profile,
            payload.catatan,
            current_user["id"]
        )
    )
    conn.commit()
    new_id = cursor.lastrowid

    cursor.execute(
        "SELECT id, nama, alamat, no_hp, link_profile, catatan, created_by, created_at, updated_at FROM supplier WHERE id = ?",
        (new_id,)
    )
    created_supplier = cursor.fetchone()
    return dict(created_supplier)

@router.get("/{supplier_id}")
def get_supplier_detail(
    supplier_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail supplier beserta riwayat pembelian item koleksi."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, nama, alamat, no_hp, link_profile, catatan, created_by, created_at, updated_at FROM supplier WHERE id = ?",
        (supplier_id,)
    )
    supplier = cursor.fetchone()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan"
        )

    supplier_data = dict(supplier)

    cursor.execute(
        """
        SELECT id, nama_item, nomor_seri, tahun, denominasi, grade, jenis, tanggal_beli,
               status, qty, qty_terjual, (qty - qty_terjual) as qty_tersisa,
               harga, ongkir, hpp, hpp_per_pcs, harga_jual, batch_id
        FROM koleksi
        WHERE supplier_id = ?
        ORDER BY id DESC
        """,
        (supplier_id,)
    )
    items = cursor.fetchall()
    supplier_data["koleksi"] = [dict(it) for it in items]

    return supplier_data

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Memperbarui informasi supplier."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM supplier WHERE id = ?", (supplier_id,))
    if not cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan"
        )

    updates = []
    params = []

    if payload.nama is not None:
        updates.append("nama = ?")
        params.append(payload.nama.strip())
    if payload.alamat is not None:
        updates.append("alamat = ?")
        params.append(payload.alamat)
    if payload.no_hp is not None:
        updates.append("no_hp = ?")
        params.append(payload.no_hp)
    if payload.link_profile is not None:
        updates.append("link_profile = ?")
        params.append(payload.link_profile)
    if payload.catatan is not None:
        updates.append("catatan = ?")
        params.append(payload.catatan)

    if updates:
        updates.append("updated_at = datetime('now','localtime')")
        params.append(supplier_id)
        sql = f"UPDATE supplier SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, tuple(params))
        conn.commit()

    cursor.execute(
        "SELECT id, nama, alamat, no_hp, link_profile, catatan, created_by, created_at, updated_at FROM supplier WHERE id = ?",
        (supplier_id,)
    )
    updated = cursor.fetchone()
    return dict(updated)

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghapus supplier jika tidak memiliki relasi item koleksi atau batch pembelian."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM supplier WHERE id = ?", (supplier_id,))
    if not cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan"
        )

    cursor.execute("SELECT COUNT(*) as cnt FROM koleksi WHERE supplier_id = ?", (supplier_id,))
    koleksi_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM batch_pembelian WHERE supplier_id = ?", (supplier_id,))
    batch_count = cursor.fetchone()["cnt"]

    if koleksi_count > 0 or batch_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier tidak dapat dihapus karena masih digunakan pada data koleksi atau batch pembelian"
        )

    cursor.execute("DELETE FROM supplier WHERE id = ?", (supplier_id,))
    conn.commit()
    return {"message": "Supplier berhasil dihapus"}
