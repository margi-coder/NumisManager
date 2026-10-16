from datetime import datetime
import math
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
import aiofiles
import sqlite3
from database.db import get_db
from database.models import (
    KoleksiCreate,
    KoleksiUpdate,
    PecahStokRequest,
    KoleksiResponse
)
from utils.auth_utils import get_current_user
from utils.calculations import calculate_hpp_single

router = APIRouter(prefix="/api/koleksi", tags=["Koleksi Numismatik"])

STATIC_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"

def generate_kode_item(conn: sqlite3.Connection) -> str:
    """Menghasilkan kode item otomatis dengan format ITM-YYYYMMDD-NNN."""
    today_str = datetime.now().strftime("%Y%m%d")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as cnt FROM koleksi WHERE kode_item LIKE ?",
        (f"ITM-{today_str}-%",)
    )
    count = cursor.fetchone()["cnt"]
    seq = count + 1
    while True:
        kode = f"ITM-{today_str}-{seq:03d}"
        cursor.execute("SELECT id FROM koleksi WHERE kode_item = ?", (kode,))
        if not cursor.fetchone():
            return kode
        seq += 1

STATIC_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/")
def list_koleksi(
    page: int = Query(1, ge=1, description="Halaman"),
    limit: int = Query(20, ge=1, le=500, description="Limit per halaman"),
    search: Optional[str] = Query(None, description="Pencarian nama, nomor seri, tahun, denominasi"),
    jenis: Optional[str] = Query(None, description="Filter jenis (koin, uang_kertas, medali, token)"),
    grade: Optional[str] = Query(None, description="Filter grade"),
    status_koleksi: Optional[str] = Query(None, description="Filter status_koleksi (stock_jual, koleksi_pribadi, dll)"),
    status: Optional[str] = Query(None, description="Filter status pengiriman/pesanan (pesan, dikirim, diterima)"),
    negara: Optional[str] = Query(None, description="Filter negara asal"),
    batch_id: Optional[int] = Query(None, description="Filter berdasarkan ID batch"),
    hpp_min: Optional[float] = Query(None, description="Filter batas bawah HPP/pcs"),
    hpp_max: Optional[float] = Query(None, description="Filter batas atas HPP/pcs"),
    tahun_dari: Optional[str] = Query(None, description="Filter tahun mulai"),
    tahun_sampai: Optional[str] = Query(None, description="Filter tahun akhir"),
    catatan: Optional[str] = Query(None, description="Pencarian di catatan atau detail"),
    nomor_seri: Optional[str] = Query(None, description="Filter spesifik nomor seri"),
    kode_item: Optional[str] = Query(None, description="Filter spesifik kode item"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan daftar koleksi numismatik dengan beragam filter dan paginasi."""
    cursor = conn.cursor()
    where_clauses = []
    params = []

    if search:
        search_param = f"%{search.strip()}%"
        where_clauses.append(
            "(k.nama_item LIKE ? OR k.nomor_seri LIKE ? OR k.tahun LIKE ? OR k.denominasi LIKE ? OR k.detail LIKE ? OR k.kode_item LIKE ?)"
        )
        params.extend([search_param, search_param, search_param, search_param, search_param, search_param])
    if jenis:
        where_clauses.append("k.jenis = ?")
        params.append(jenis)
    if grade:
        where_clauses.append("k.grade = ?")
        params.append(grade)
    if status_koleksi:
        where_clauses.append("k.status_koleksi = ?")
        params.append(status_koleksi)
    if status:
        where_clauses.append("k.status = ?")
        params.append(status)
    if negara:
        where_clauses.append("k.negara LIKE ?")
        params.append(f"%{negara.strip()}%")
    if batch_id is not None:
        where_clauses.append("k.batch_id = ?")
        params.append(batch_id)
    if hpp_min is not None:
        where_clauses.append("k.hpp_per_pcs >= ?")
        params.append(hpp_min)
    if hpp_max is not None:
        where_clauses.append("k.hpp_per_pcs <= ?")
        params.append(hpp_max)
    if tahun_dari:
        where_clauses.append("k.tahun >= ?")
        params.append(tahun_dari.strip())
    if tahun_sampai:
        where_clauses.append("k.tahun <= ?")
        params.append(tahun_sampai.strip())
    if catatan:
        where_clauses.append("(k.catatan_internal LIKE ? OR k.detail LIKE ?)")
        params.extend([f"%{catatan.strip()}%", f"%{catatan.strip()}%"])
    if nomor_seri:
        where_clauses.append("k.nomor_seri LIKE ?")
        params.append(f"%{nomor_seri.strip()}%")
    if kode_item:
        where_clauses.append("k.kode_item LIKE ?")
        params.append(f"%{kode_item.strip()}%")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Total records count
    count_sql = f"SELECT COUNT(*) as total FROM koleksi k {where_sql}"
    cursor.execute(count_sql, tuple(params))
    total_records = cursor.fetchone()["total"]

    offset = (page - 1) * limit
    data_sql = f"""
        SELECT k.*, (k.qty - k.qty_terjual) as qty_tersisa,
               s.nama as supplier_nama,
               b.kode_batch as batch_kode
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        {where_sql}
        ORDER BY k.id DESC
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
def create_koleksi(
    payload: KoleksiCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menambahkan item koleksi baru dan menghitung HPP otomatis."""
    cursor = conn.cursor()

    if payload.supplier_id:
        cursor.execute("SELECT id FROM supplier WHERE id = ?", (payload.supplier_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier tidak ditemukan")

    if payload.batch_id:
        cursor.execute("SELECT id FROM batch_pembelian WHERE id = ?", (payload.batch_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch tidak ditemukan")

    qty = max(1, payload.qty)
    hpp_calc = calculate_hpp_single(payload.harga, payload.ongkir, qty)
    hpp = hpp_calc["hpp"]
    hpp_per_pcs = hpp_calc["hpp_per_pcs"]
    tanggal_beli = payload.tanggal_beli or datetime.now().strftime("%Y-%m-%d")

    kode_item = payload.kode_item or generate_kode_item(conn)
    foto_obv = payload.foto_obv or payload.foto_path
    foto_rev = payload.foto_rev
    foto_path = payload.foto_path or foto_obv

    cursor.execute(
        """
        INSERT INTO koleksi (
            kode_item, nama_item, nomor_seri, tahun, denominasi, cetakan, grade, jenis, negara,
            bahan, warna_dominan, dimensi, kondisi_fisik, lokasi_simpan, detail,
            catatan_internal, foto_path, foto_obv, foto_rev, supplier_id, batch_id, perolehan,
            link_pembelian, tanggal_beli, status, qty, qty_terjual, harga, ongkir,
            hpp, hpp_per_pcs, harga_jual, status_koleksi, is_pecahan, parent_id, created_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, 0, ?, ?,
            ?, ?, ?, ?, 0, NULL, ?
        )
        """,
        (
            kode_item, payload.nama_item.strip(), payload.nomor_seri, payload.tahun, payload.denominasi,
            payload.cetakan, payload.grade, payload.jenis, payload.negara,
            payload.bahan, payload.warna_dominan, payload.dimensi, payload.kondisi_fisik,
            payload.lokasi_simpan, payload.detail, payload.catatan_internal,
            foto_path, foto_obv, foto_rev,
            payload.supplier_id, payload.batch_id, payload.perolehan, payload.link_pembelian,
            tanggal_beli, payload.status or "pesan", qty, payload.harga, payload.ongkir,
            hpp, hpp_per_pcs, payload.harga_jual, payload.status_koleksi or "stock_jual",
            current_user["id"]
        )
    )
    conn.commit()
    new_id = cursor.lastrowid

    cursor.execute("SELECT *, (qty - qty_terjual) as qty_tersisa FROM koleksi WHERE id = ?", (new_id,))
    created_item = dict(cursor.fetchone())
    return created_item

@router.get("/{koleksi_id}")
def get_koleksi_detail(
    koleksi_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail item koleksi lengkap dengan data supplier dan batch."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT k.*, (k.qty - k.qty_terjual) as qty_tersisa,
               s.nama as supplier_nama, s.no_hp as supplier_no_hp,
               b.kode_batch as batch_kode, b.nama_batch as batch_nama
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        WHERE k.id = ?
        """,
        (koleksi_id,)
    )
    item = cursor.fetchone()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi tidak ditemukan"
        )
    return dict(item)

@router.put("/{koleksi_id}")
def update_koleksi(
    koleksi_id: int,
    payload: KoleksiUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Memperbarui informasi item koleksi dan menghitung ulang HPP jika harga/ongkir/qty berubah."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM koleksi WHERE id = ?", (koleksi_id,))
    item = cursor.fetchone()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi tidak ditemukan"
        )

    updates = []
    params = []

    # Cek perubahan biaya/qty untuk HPP
    harga = payload.harga if payload.harga is not None else item["harga"]
    ongkir = payload.ongkir if payload.ongkir is not None else item["ongkir"]
    qty = payload.qty if payload.qty is not None else item["qty"]

    if payload.qty is not None and payload.qty < item["qty_terjual"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kuantitas tidak boleh kurang dari jumlah yang sudah terjual ({item['qty_terjual']})"
        )

    if payload.harga is not None or payload.ongkir is not None or payload.qty is not None:
        calc = calculate_hpp_single(harga, ongkir, qty)
        updates.extend(["harga = ?", "ongkir = ?", "qty = ?", "hpp = ?", "hpp_per_pcs = ?"])
        params.extend([harga, ongkir, qty, calc["hpp"], calc["hpp_per_pcs"]])

    # Field-field lainnya
    field_mappings = [
        ("kode_item", payload.kode_item),
        ("nama_item", payload.nama_item),
        ("nomor_seri", payload.nomor_seri),
        ("tahun", payload.tahun),
        ("denominasi", payload.denominasi),
        ("cetakan", payload.cetakan),
        ("grade", payload.grade),
        ("jenis", payload.jenis),
        ("negara", payload.negara),
        ("bahan", payload.bahan),
        ("warna_dominan", payload.warna_dominan),
        ("dimensi", payload.dimensi),
        ("kondisi_fisik", payload.kondisi_fisik),
        ("lokasi_simpan", payload.lokasi_simpan),
        ("detail", payload.detail),
        ("catatan_internal", payload.catatan_internal),
        ("foto_path", payload.foto_path),
        ("foto_obv", payload.foto_obv),
        ("foto_rev", payload.foto_rev),
        ("supplier_id", payload.supplier_id),
        ("batch_id", payload.batch_id),
        ("perolehan", payload.perolehan),
        ("link_pembelian", payload.link_pembelian),
        ("tanggal_beli", payload.tanggal_beli),
        ("status", payload.status),
        ("harga_jual", payload.harga_jual),
        ("status_koleksi", payload.status_koleksi),
    ]

    for col, val in field_mappings:
        if val is not None:
            updates.append(f"{col} = ?")
            params.append(val)

    if updates:
        updates.append("updated_at = datetime('now','localtime')")
        params.append(koleksi_id)
        cursor.execute(f"UPDATE koleksi SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()

    cursor.execute("SELECT *, (qty - qty_terjual) as qty_tersisa FROM koleksi WHERE id = ?", (koleksi_id,))
    updated_item = dict(cursor.fetchone())
    return updated_item

@router.delete("/{koleksi_id}")
def delete_koleksi(
    koleksi_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghapus item koleksi (hanya jika belum ada penjualan dan tidak memiliki pecahan stok)."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, qty_terjual FROM koleksi WHERE id = ?", (koleksi_id,))
    item = cursor.fetchone()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi tidak ditemukan"
        )

    if item["qty_terjual"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item tidak dapat dihapus karena sudah memiliki transaksi penjualan"
        )

    cursor.execute("SELECT COUNT(*) as cnt FROM koleksi WHERE parent_id = ?", (koleksi_id,))
    if cursor.fetchone()["cnt"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item tidak dapat dihapus karena memiliki item pecahan stok"
        )

    cursor.execute("DELETE FROM koleksi WHERE id = ?", (koleksi_id,))
    conn.commit()
    return {"message": "Item koleksi berhasil dihapus"}

@router.post("/{koleksi_id}/foto")
async def upload_foto_koleksi(
    koleksi_id: int,
    tipe: str = Query("obv", description="obv (obverse/depan) atau rev (reverse/belakang)"),
    file: UploadFile = File(...),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mengunggah foto koleksi (obv/rev) dan memperbarui item."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, foto_path, foto_obv, foto_rev FROM koleksi WHERE id = ?", (koleksi_id,))
    existing_item = cursor.fetchone()
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi tidak ditemukan"
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

    tipe_clean = "rev" if tipe.lower().strip() == "rev" else "obv"
    unique_filename = f"{uuid.uuid4().hex}_{tipe_clean}{ext}"
    dest_path = STATIC_UPLOADS_DIR / unique_filename

    content = await file.read()
    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    foto_url = f"/static/uploads/{unique_filename}"
    if tipe_clean == "rev":
        cursor.execute(
            "UPDATE koleksi SET foto_rev = ?, updated_at = datetime('now','localtime') WHERE id = ?",
            (foto_url, koleksi_id)
        )
    else:
        cursor.execute(
            "UPDATE koleksi SET foto_obv = ?, foto_path = ?, updated_at = datetime('now','localtime') WHERE id = ?",
            (foto_url, foto_url, koleksi_id)
        )
    conn.commit()

    return {
        "foto_path": foto_url,
        "foto_url": foto_url,
        "tipe": tipe_clean,
        "message": f"Foto {'Reverse (Belakang)' if tipe_clean == 'rev' else 'Obverse (Depan)'} berhasil diunggah"
    }

@router.get("/foto/{filename}")
def serve_foto(filename: str):
    """Melayani file foto dari folder static uploads."""
    file_path = STATIC_UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File foto tidak ditemukan"
        )
    return FileResponse(file_path)

@router.post("/{koleksi_id}/pecah")
def pecah_stok_koleksi(
    koleksi_id: int,
    payload: PecahStokRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Memecah stok item koleksi menjadi item pecahan baru.
    - Mengurangi qty item induk
    - Menghitung ulang HPP item induk
    - Membuat item turunan baru dengan mewarisi HPP per pcs dari induk
    """
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM koleksi WHERE id = ?", (koleksi_id,))
    parent = cursor.fetchone()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item koleksi induk tidak ditemukan"
        )

    parent_dict = dict(parent)
    sisa_stok = parent_dict["qty"] - parent_dict["qty_terjual"]

    if payload.qty_pecahan <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Qty pecahan harus lebih besar dari 0"
        )

    if payload.qty_pecahan > sisa_stok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Qty pecahan ({payload.qty_pecahan}) melebihi stok yang tersedia ({sisa_stok})"
        )

    new_parent_qty = parent_dict["qty"] - payload.qty_pecahan
    hpp_per_pcs = parent_dict["hpp_per_pcs"]

    # Perbarui item induk
    new_parent_hpp = round(hpp_per_pcs * new_parent_qty, 2)
    new_parent_harga = round(new_parent_hpp, 2)

    cursor.execute(
        """
        UPDATE koleksi
        SET qty = ?, hpp = ?, harga = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
        """,
        (new_parent_qty, new_parent_hpp, new_parent_harga, koleksi_id)
    )

    # Buat item pecahan baru
    child_nama = payload.nama_item.strip() if payload.nama_item else parent_dict["nama_item"]
    child_hpp = round(hpp_per_pcs * payload.qty_pecahan, 2)
    child_harga = child_hpp
    child_ongkir = 0.0

    cursor.execute(
        """
        INSERT INTO koleksi (
            kode_item, nama_item, nomor_seri, tahun, denominasi, cetakan, grade, jenis, negara,
            bahan, warna_dominan, dimensi, kondisi_fisik, lokasi_simpan, detail,
            catatan_internal, foto_path, foto_obv, foto_rev, supplier_id, batch_id, perolehan,
            link_pembelian, tanggal_beli, status, qty, qty_terjual, harga, ongkir,
            hpp, hpp_per_pcs, harga_jual, status_koleksi, is_pecahan, parent_id, created_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, 0, ?, ?,
            ?, ?, ?, ?, 1, ?, ?
        )
        """,
        (
            generate_kode_item(conn), child_nama, parent_dict["nomor_seri"], parent_dict["tahun"], parent_dict["denominasi"],
            parent_dict["cetakan"], parent_dict["grade"], parent_dict["jenis"], parent_dict["negara"],
            parent_dict["bahan"], parent_dict["warna_dominan"], parent_dict["dimensi"], parent_dict["kondisi_fisik"],
            parent_dict["lokasi_simpan"], parent_dict["detail"], parent_dict["catatan_internal"],
            parent_dict["foto_path"], parent_dict.get("foto_obv"), parent_dict.get("foto_rev"),
            parent_dict["supplier_id"], parent_dict["batch_id"], parent_dict["perolehan"], parent_dict["link_pembelian"],
            parent_dict["tanggal_beli"], parent_dict["status"], payload.qty_pecahan, child_harga, child_ongkir,
            child_hpp, hpp_per_pcs, payload.harga_jual_pcs, payload.status_koleksi or "stock_jual",
            koleksi_id, current_user["id"]
        )
    )
    conn.commit()
    child_id = cursor.lastrowid

    cursor.execute("SELECT *, (qty - qty_terjual) as qty_tersisa FROM koleksi WHERE id = ?", (child_id,))
    child_item = dict(cursor.fetchone())

    return {
        "message": "Stok berhasil dipecah",
        "parent_id": koleksi_id,
        "parent_sisa_qty": new_parent_qty,
        "pecahan_item": child_item
    }
