from datetime import datetime
import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3
from database.db import get_db
from database.models import BatchCreate, BatchUpdate, BatchResponse
from utils.auth_utils import get_current_user
from utils.calculations import calculate_hpp_batch

router = APIRouter(prefix="/api/batch", tags=["Batch Pembelian"])

def generate_kode_batch(conn: sqlite3.Connection) -> str:
    """Menghasilkan kode batch otomatis dengan format BATCH-YYYYMMDD-NNN."""
    today_str = datetime.now().strftime("%Y%m%d")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as cnt FROM batch_pembelian WHERE kode_batch LIKE ?",
        (f"BATCH-{today_str}-%",)
    )
    count = cursor.fetchone()["cnt"]
    seq = count + 1
    while True:
        kode = f"BATCH-{today_str}-{seq:03d}"
        cursor.execute("SELECT id FROM batch_pembelian WHERE kode_batch = ?", (kode,))
        if not cursor.fetchone():
            return kode
        seq += 1

@router.get("/")
def list_batches(
    page: int = Query(1, ge=1, description="Nomor halaman"),
    limit: int = Query(20, ge=1, le=100, description="Jumlah data per halaman"),
    status: Optional[str] = Query(None, description="Filter status batch (pesan/dikirim/selesai)"),
    search: Optional[str] = Query(None, description="Pencarian nama batch atau kode batch"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan daftar batch pembelian dengan paginasi dan filter."""
    cursor = conn.cursor()
    where_clauses = []
    params = []

    if status:
        where_clauses.append("b.status = ?")
        params.append(status)
    if search:
        search_param = f"%{search.strip()}%"
        where_clauses.append("(b.kode_batch LIKE ? OR b.nama_batch LIKE ?)")
        params.extend([search_param, search_param])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Count total
    count_sql = f"SELECT COUNT(*) as total FROM batch_pembelian b {where_sql}"
    cursor.execute(count_sql, tuple(params))
    total_records = cursor.fetchone()["total"]

    offset = (page - 1) * limit
    data_sql = f"""
        SELECT b.id, b.kode_batch, b.nama_batch, b.supplier_id, s.nama as supplier_nama,
               b.total_ongkir, b.perolehan, b.link_pembelian, b.tanggal_beli,
               b.status, b.catatan, b.created_by, b.created_at, b.updated_at,
               COUNT(k.id) as item_count,
               COALESCE(SUM(k.harga), 0) as total_harga_items,
               COALESCE(SUM(k.hpp), 0) as total_hpp_items
        FROM batch_pembelian b
        LEFT JOIN supplier s ON b.supplier_id = s.id
        LEFT JOIN koleksi k ON b.id = k.batch_id
        {where_sql}
        GROUP BY b.id
        ORDER BY b.id DESC
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
def create_batch(
    payload: BatchCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Membuat batch pembelian baru dengan kode batch otomatis."""
    kode_batch = generate_kode_batch(conn)
    cursor = conn.cursor()

    if payload.supplier_id:
        cursor.execute("SELECT id FROM supplier WHERE id = ?", (payload.supplier_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier tidak ditemukan"
            )

    tanggal_beli = payload.tanggal_beli or datetime.now().strftime("%Y-%m-%d")

    cursor.execute(
        """
        INSERT INTO batch_pembelian (
            kode_batch, nama_batch, supplier_id, total_ongkir, perolehan,
            link_pembelian, tanggal_beli, status, catatan, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            kode_batch,
            payload.nama_batch or f"Batch {kode_batch}",
            payload.supplier_id,
            payload.total_ongkir,
            payload.perolehan,
            payload.link_pembelian,
            tanggal_beli,
            payload.status or "pesan",
            payload.catatan,
            current_user["id"]
        )
    )
    conn.commit()
    new_id = cursor.lastrowid

    cursor.execute("SELECT * FROM batch_pembelian WHERE id = ?", (new_id,))
    created_batch = dict(cursor.fetchone())
    return created_batch

@router.get("/{batch_id}")
def get_batch_detail(
    batch_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail batch pembelian, supplier, dan seluruh item koleksi terkait."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT b.*, s.nama as supplier_nama, s.no_hp as supplier_no_hp, s.link_profile as supplier_link
        FROM batch_pembelian b
        LEFT JOIN supplier s ON b.supplier_id = s.id
        WHERE b.id = ?
        """,
        (batch_id,)
    )
    batch = cursor.fetchone()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch pembelian tidak ditemukan"
        )

    batch_data = dict(batch)

    cursor.execute(
        """
        SELECT id, kode_item, nama_item, nomor_seri, tahun, denominasi, grade, jenis, negara,
               status, qty, qty_terjual, (qty - qty_terjual) as qty_tersisa,
               harga, ongkir, hpp, hpp_per_pcs, harga_jual, status_koleksi, foto_path, foto_obv, foto_rev,
               tanggal_beli, detail
        FROM koleksi
        WHERE batch_id = ?
        ORDER BY id ASC
        """,
        (batch_id,)
    )
    items = cursor.fetchall()
    batch_data["items"] = [dict(it) for it in items]
    batch_data["item_count"] = len(items)

    return batch_data

@router.put("/{batch_id}")
def update_batch(
    batch_id: int,
    payload: BatchUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Memperbarui header batch pembelian.
    Jika total_ongkir berubah, otomatis menghitung ulang HPP semua item dalam batch (bagi rata).
    """
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM batch_pembelian WHERE id = ?", (batch_id,))
    batch = cursor.fetchone()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch pembelian tidak ditemukan"
        )

    updates = []
    params = []
    ongkir_changed = False
    new_ongkir = batch["total_ongkir"]

    if payload.nama_batch is not None:
        updates.append("nama_batch = ?")
        params.append(payload.nama_batch)
    if payload.supplier_id is not None:
        updates.append("supplier_id = ?")
        params.append(payload.supplier_id)
    if payload.total_ongkir is not None:
        if float(payload.total_ongkir) != float(batch["total_ongkir"]):
            ongkir_changed = True
            new_ongkir = float(payload.total_ongkir)
        updates.append("total_ongkir = ?")
        params.append(payload.total_ongkir)
    if payload.perolehan is not None:
        updates.append("perolehan = ?")
        params.append(payload.perolehan)
    if payload.link_pembelian is not None:
        updates.append("link_pembelian = ?")
        params.append(payload.link_pembelian)
    if payload.tanggal_beli is not None:
        updates.append("tanggal_beli = ?")
        params.append(payload.tanggal_beli)
    if payload.status is not None:
        updates.append("status = ?")
        params.append(payload.status)
    if payload.catatan is not None:
        updates.append("catatan = ?")
        params.append(payload.catatan)

    if updates:
        updates.append("updated_at = datetime('now','localtime')")
        params.append(batch_id)
        cursor.execute(f"UPDATE batch_pembelian SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()

    # Jika ongkir berubah, hitung ulang HPP semua item dalam batch
    if ongkir_changed:
        cursor.execute("SELECT id, harga, qty FROM koleksi WHERE batch_id = ?", (batch_id,))
        raw_items = [dict(it) for it in cursor.fetchall()]
        if raw_items:
            recalculated = calculate_hpp_batch(raw_items, new_ongkir)
            for item in recalculated:
                cursor.execute(
                    """
                    UPDATE koleksi
                    SET ongkir = ?, hpp = ?, hpp_per_pcs = ?, updated_at = datetime('now','localtime')
                    WHERE id = ?
                    """,
                    (item["ongkir"], item["hpp"], item["hpp_per_pcs"], item["id"])
                )
            conn.commit()

    cursor.execute("SELECT * FROM batch_pembelian WHERE id = ?", (batch_id,))
    updated_batch = dict(cursor.fetchone())
    return updated_batch

@router.delete("/{batch_id}")
def delete_batch(
    batch_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Menghapus batch pembelian secara permanen.
    Sesuai aturan bisnis: Seluruh item dalam batch pada koleksi & stok beserta
    keterkaitan di album digital (album_item), multi-foto galeri (koleksi_foto),
    dan transaksi penjualan akan ikut dihapus tuntas.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT id, nama_batch FROM batch_pembelian WHERE id = ?", (batch_id,))
    batch = cursor.fetchone()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch pembelian tidak ditemukan"
        )

    # 1. Ambil semua ID item koleksi/stok yang langsung terhubung ke batch ini
    cursor.execute("SELECT id FROM koleksi WHERE batch_id = ?", (batch_id,))
    batch_items = cursor.fetchall()
    item_ids = [row["id"] for row in batch_items]

    # 2. Ambil semua ID item turunan (pecahan stok) yang berasal dari item dalam batch ini
    child_item_ids = []
    if item_ids:
        placeholders_parent = ",".join("?" for _ in item_ids)
        cursor.execute(
            f"SELECT id FROM koleksi WHERE parent_id IN ({placeholders_parent})",
            tuple(item_ids)
        )
        child_item_ids = [row["id"] for row in cursor.fetchall()]

    all_item_ids = list(set(item_ids + child_item_ids))

    if all_item_ids:
        placeholders_all = ",".join("?" for _ in all_item_ids)

        # 3. Hapus slot penempatan item di seluruh Album Digital (album_item)
        cursor.execute(
            f"DELETE FROM album_item WHERE koleksi_id IN ({placeholders_all})",
            tuple(all_item_ids)
        )

        # 4. Hapus entri multi-foto galeri tambahan (koleksi_foto)
        cursor.execute(
            f"DELETE FROM koleksi_foto WHERE koleksi_id IN ({placeholders_all})",
            tuple(all_item_ids)
        )

        # 5. Hapus riwayat penjualan jika ada item yang tercatat (penjualan)
        cursor.execute(
            f"DELETE FROM penjualan WHERE koleksi_id IN ({placeholders_all})",
            tuple(all_item_ids)
        )

        # 6. Hapus item turunan pecahan stok terlebih dahulu (menjaga foreign key parent_id)
        if child_item_ids:
            placeholders_child = ",".join("?" for _ in child_item_ids)
            cursor.execute(
                f"DELETE FROM koleksi WHERE id IN ({placeholders_child})",
                tuple(child_item_ids)
            )

        # 7. Hapus seluruh item koleksi & stok dalam batch
        cursor.execute("DELETE FROM koleksi WHERE batch_id = ?", (batch_id,))

    # 8. Hapus header batch pembelian
    cursor.execute("DELETE FROM batch_pembelian WHERE id = ?", (batch_id,))
    conn.commit()

    deleted_count = len(all_item_ids)
    batch_name = batch["nama_batch"] or f"Batch #{batch_id}"
    return {
        "message": f"Batch '{batch_name}' beserta {deleted_count} item koleksi/stok dan slot album digital berhasil dihapus.",
        "deleted_items_count": deleted_count
    }

@router.post("/{batch_id}/recalculate")
def recalculate_batch_hpp(
    batch_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghitung ulang HPP untuk seluruh item dalam batch dengan pembagian rata total ongkir."""
    cursor = conn.cursor()
    cursor.execute("SELECT total_ongkir FROM batch_pembelian WHERE id = ?", (batch_id,))
    batch = cursor.fetchone()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch pembelian tidak ditemukan"
        )

    cursor.execute("SELECT id, harga, qty FROM koleksi WHERE batch_id = ?", (batch_id,))
    items = [dict(it) for it in cursor.fetchall()]

    if not items:
        return {"message": "Tidak ada item dalam batch ini untuk dihitung ulang", "items_updated": 0}

    recalculated = calculate_hpp_batch(items, batch["total_ongkir"])
    for item in recalculated:
        cursor.execute(
            """
            UPDATE koleksi
            SET ongkir = ?, hpp = ?, hpp_per_pcs = ?, updated_at = datetime('now','localtime')
            WHERE id = ?
            """,
            (item["ongkir"], item["hpp"], item["hpp_per_pcs"], item["id"])
        )
    conn.commit()

    return {
        "message": "HPP seluruh item dalam batch berhasil dihitung ulang",
        "items_updated": len(recalculated)
    }
