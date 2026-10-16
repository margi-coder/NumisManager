from datetime import datetime
import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3
from database.db import get_db
from database.models import PenjualanCreate, PenjualanUpdate, PenjualanResponse
from utils.auth_utils import get_current_user
from utils.calculations import calculate_profit

router = APIRouter(prefix="/api/penjualan", tags=["Transaksi Penjualan"])

def generate_kode_jual(conn: sqlite3.Connection) -> str:
    """Menghasilkan kode transaksi penjualan unik format JUAL-YYYYMMDD-NNN."""
    today_str = datetime.now().strftime("%Y%m%d")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as cnt FROM penjualan WHERE kode_jual LIKE ?",
        (f"JUAL-{today_str}-%",)
    )
    count = cursor.fetchone()["cnt"]
    seq = count + 1
    while True:
        kode = f"JUAL-{today_str}-{seq:03d}"
        cursor.execute("SELECT id FROM penjualan WHERE kode_jual = ?", (kode,))
        if not cursor.fetchone():
            return kode
        seq += 1

@router.get("/")
def list_penjualan(
    page: int = Query(1, ge=1, description="Nomor halaman"),
    limit: int = Query(20, ge=1, le=100, description="Limit data per halaman"),
    koleksi_id: Optional[int] = Query(None, description="Filter berdasarkan ID koleksi"),
    tanggal_dari: Optional[str] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    tanggal_sampai: Optional[str] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    platform_jual: Optional[str] = Query(None, description="Filter platform marketplace/penjualan"),
    search: Optional[str] = Query(None, description="Pencarian kode jual, pembeli, atau catatan"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan daftar riwayat penjualan dengan perhitungan profit dan paginasi."""
    cursor = conn.cursor()
    where_clauses = []
    params = []

    if koleksi_id is not None:
        where_clauses.append("p.koleksi_id = ?")
        params.append(koleksi_id)
    if tanggal_dari:
        where_clauses.append("p.tanggal_jual >= ?")
        params.append(tanggal_dari)
    if tanggal_sampai:
        where_clauses.append("p.tanggal_jual <= ?")
        params.append(tanggal_sampai)
    if platform_jual:
        where_clauses.append("p.platform_jual = ?")
        params.append(platform_jual)
    if search:
        s_param = f"%{search.strip()}%"
        where_clauses.append("(p.kode_jual LIKE ? OR p.pembeli LIKE ? OR p.catatan LIKE ? OR k.nama_item LIKE ?)")
        params.extend([s_param, s_param, s_param, s_param])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Total Count
    count_sql = f"""
        SELECT COUNT(*) as total
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        {where_sql}
    """
    cursor.execute(count_sql, tuple(params))
    total_records = cursor.fetchone()["total"]

    offset = (page - 1) * limit
    data_sql = f"""
        SELECT p.*, k.nama_item,
               (p.qty_jual * p.harga_jual_pcs) as total_jual,
               (p.harga_jual_pcs - p.hpp_pcs) as profit_pcs,
               (p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) as total_profit,
               CASE
                   WHEN p.harga_jual_pcs > 0 THEN ROUND(((p.harga_jual_pcs - p.hpp_pcs) / p.harga_jual_pcs) * 100, 2)
                   ELSE 0.0
               END as margin_pct
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        {where_sql}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
    """
    cursor.execute(data_sql, tuple(params + [limit, offset]))
    rows = cursor.fetchall()

    items_list = [dict(r) for r in rows]
    return {
        "items": items_list,
        "data": items_list,
        "total": total_records,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total_records / limit) if total_records > 0 else 1
    }

@router.post("/", response_model=Dict[str, Any])
def create_penjualan(
    payload: PenjualanCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Mencatat transaksi penjualan koleksi.
    - Memverifikasi kecukupan stok (qty - qty_terjual >= qty_jual)
    - Mengambil HPP per pcs dari item koleksi
    - Menambah qty_terjual pada item koleksi
    """
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM koleksi WHERE id = ?", (payload.koleksi_id,))
    koleksi = cursor.fetchone()
    if not koleksi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi tidak ditemukan"
        )

    koleksi_dict = dict(koleksi)
    sisa_stok = koleksi_dict["qty"] - koleksi_dict["qty_terjual"]

    if payload.qty_jual <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jumlah penjualan harus minimal 1 pcs"
        )

    if sisa_stok < payload.qty_jual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stok tidak mencukupi. Sisa stok tersedia: {sisa_stok}"
        )

    hpp_pcs = float(koleksi_dict["hpp_per_pcs"] or 0.0)
    kode_jual = generate_kode_jual(conn)
    tanggal_jual = payload.tanggal_jual or datetime.now().strftime("%Y-%m-%d")

    # Insert Penjualan
    cursor.execute(
        """
        INSERT INTO penjualan (
            kode_jual, koleksi_id, qty_jual, harga_jual_pcs, hpp_pcs,
            pembeli, platform_jual, catatan, tanggal_jual, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            kode_jual,
            payload.koleksi_id,
            payload.qty_jual,
            payload.harga_jual_pcs,
            hpp_pcs,
            payload.pembeli,
            payload.platform_jual,
            payload.catatan,
            tanggal_jual,
            current_user["id"]
        )
    )

    # Update koleksi qty_terjual
    cursor.execute(
        """
        UPDATE koleksi
        SET qty_terjual = qty_terjual + ?, updated_at = datetime('now','localtime')
        WHERE id = ?
        """,
        (payload.qty_jual, payload.koleksi_id)
    )

    conn.commit()
    new_id = cursor.lastrowid

    # Retrieve created record with calculations
    cursor.execute(
        """
        SELECT p.*, k.nama_item,
               (p.qty_jual * p.harga_jual_pcs) as total_jual,
               (p.harga_jual_pcs - p.hpp_pcs) as profit_pcs,
               (p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) as total_profit,
               CASE
                   WHEN p.harga_jual_pcs > 0 THEN ROUND(((p.harga_jual_pcs - p.hpp_pcs) / p.harga_jual_pcs) * 100, 2)
                   ELSE 0.0
               END as margin_pct
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        WHERE p.id = ?
        """,
        (new_id,)
    )
    result = dict(cursor.fetchone())
    return result

@router.get("/{penjualan_id}")
def get_penjualan_detail(
    penjualan_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail transaksi penjualan tertentu."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT p.*, k.nama_item,
               (p.qty_jual * p.harga_jual_pcs) as total_jual,
               (p.harga_jual_pcs - p.hpp_pcs) as profit_pcs,
               (p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) as total_profit,
               CASE
                   WHEN p.harga_jual_pcs > 0 THEN ROUND(((p.harga_jual_pcs - p.hpp_pcs) / p.harga_jual_pcs) * 100, 2)
                   ELSE 0.0
               END as margin_pct
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        WHERE p.id = ?
        """,
        (penjualan_id,)
    )
    sale = cursor.fetchone()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi penjualan tidak ditemukan"
        )
    return dict(sale)

@router.put("/{penjualan_id}")
def update_penjualan(
    penjualan_id: int,
    payload: PenjualanUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Memperbarui transaksi penjualan.
    Jika kuantitas berubah, stok terjual di item koleksi akan disesuaikan.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM penjualan WHERE id = ?", (penjualan_id,))
    sale = cursor.fetchone()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi penjualan tidak ditemukan"
        )
    sale_dict = dict(sale)

    target_koleksi_id = payload.koleksi_id if payload.koleksi_id is not None else sale_dict["koleksi_id"]
    cursor.execute("SELECT * FROM koleksi WHERE id = ?", (target_koleksi_id,))
    koleksi = cursor.fetchone()
    if not koleksi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi tidak ditemukan"
        )
    koleksi_dict = dict(koleksi)

    # Penyesuaian kuantitas
    if payload.qty_jual is not None and payload.qty_jual != sale_dict["qty_jual"]:
        diff = payload.qty_jual - sale_dict["qty_jual"]
        sisa_stok = koleksi_dict["qty"] - koleksi_dict["qty_terjual"]
        if diff > sisa_stok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Penambahan kuantitas melebihi stok yang tersedia ({sisa_stok})"
            )
        cursor.execute(
            "UPDATE koleksi SET qty_terjual = qty_terjual + ?, updated_at = datetime('now','localtime') WHERE id = ?",
            (diff, target_koleksi_id)
        )

    updates = []
    params = []

    if payload.koleksi_id is not None:
        updates.append("koleksi_id = ?")
        params.append(payload.koleksi_id)
    if payload.qty_jual is not None:
        updates.append("qty_jual = ?")
        params.append(payload.qty_jual)
    if payload.harga_jual_pcs is not None:
        updates.append("harga_jual_pcs = ?")
        params.append(payload.harga_jual_pcs)
    if payload.pembeli is not None:
        updates.append("pembeli = ?")
        params.append(payload.pembeli)
    if payload.platform_jual is not None:
        updates.append("platform_jual = ?")
        params.append(payload.platform_jual)
    if payload.catatan is not None:
        updates.append("catatan = ?")
        params.append(payload.catatan)
    if payload.tanggal_jual is not None:
        updates.append("tanggal_jual = ?")
        params.append(payload.tanggal_jual)

    if updates:
        params.append(penjualan_id)
        cursor.execute(f"UPDATE penjualan SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()

    cursor.execute(
        """
        SELECT p.*, k.nama_item,
               (p.qty_jual * p.harga_jual_pcs) as total_jual,
               (p.harga_jual_pcs - p.hpp_pcs) as profit_pcs,
               (p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) as total_profit,
               CASE
                   WHEN p.harga_jual_pcs > 0 THEN ROUND(((p.harga_jual_pcs - p.hpp_pcs) / p.harga_jual_pcs) * 100, 2)
                   ELSE 0.0
               END as margin_pct
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        WHERE p.id = ?
        """,
        (penjualan_id,)
    )
    updated_sale = dict(cursor.fetchone())
    return updated_sale

@router.delete("/{penjualan_id}")
def delete_penjualan(
    penjualan_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghapus transaksi penjualan dan mengembalikan stok koleksi."""
    cursor = conn.cursor()
    cursor.execute("SELECT koleksi_id, qty_jual FROM penjualan WHERE id = ?", (penjualan_id,))
    sale = cursor.fetchone()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi penjualan tidak ditemukan"
        )

    # Kembalikan stok
    cursor.execute(
        """
        UPDATE koleksi
        SET qty_terjual = MAX(0, qty_terjual - ?), updated_at = datetime('now','localtime')
        WHERE id = ?
        """,
        (sale["qty_jual"], sale["koleksi_id"])
    )

    # Hapus penjualan
    cursor.execute("DELETE FROM penjualan WHERE id = ?", (penjualan_id,))
    conn.commit()

    return {"message": "Transaksi penjualan berhasil dihapus dan stok telah dikembalikan"}
