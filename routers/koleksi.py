from datetime import datetime
import base64
import math
import urllib.request
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse, HTMLResponse, Response
import aiofiles
import sqlite3
from database.db import get_db
from database.models import (
    KoleksiCreate,
    KoleksiUpdate,
    PecahStokRequest,
    KoleksiResponse,
    LotCreateRequest,
    LotUpdateRequest
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

def ensure_lot_schema(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS lot_pembelian (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kode_lot TEXT UNIQUE NOT NULL,
            nama_lot TEXT NOT NULL,
            harga_lot_total REAL DEFAULT 0,
            ongkir_lot REAL DEFAULT 0,
            metode_alokasi TEXT DEFAULT 'proporsional_qty',
            batch_id INTEGER REFERENCES batch_pembelian(id) ON DELETE SET NULL,
            supplier_id INTEGER REFERENCES supplier(id),
            perolehan TEXT,
            link_pembelian TEXT,
            tanggal_beli TEXT,
            status TEXT DEFAULT 'pesan',
            catatan TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        )
        """
    )
    cursor.execute("PRAGMA table_info(koleksi)")
    cols = [row["name"] for row in cursor.fetchall()]
    if "lot_id" not in cols:
        cursor.execute("ALTER TABLE koleksi ADD COLUMN lot_id INTEGER REFERENCES lot_pembelian(id) ON DELETE SET NULL")
        conn.commit()

def generate_kode_lot(conn: sqlite3.Connection) -> str:
    today_str = datetime.now().strftime("%Y%m%d")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as cnt FROM lot_pembelian WHERE kode_lot LIKE ?",
        (f"LOT-{today_str}-%",)
    )
    count = cursor.fetchone()["cnt"]
    seq = count + 1
    while True:
        kode = f"LOT-{today_str}-{seq:03d}"
        cursor.execute("SELECT id FROM lot_pembelian WHERE kode_lot = ?", (kode,))
        if not cursor.fetchone():
            return kode
        seq += 1


@router.get("/")
def list_koleksi(
    page: int = Query(1, ge=1, description="Halaman"),
    limit: int = Query(20, ge=1, le=2000, description="Limit per halaman"),
    search: Optional[str] = Query(None, description="Pencarian nama, nomor seri, tahun, denominasi"),
    jenis: Optional[str] = Query(None, description="Filter jenis (koin, uang_kertas, medali, token)"),
    grade: Optional[str] = Query(None, description="Filter grade"),
    status_koleksi: Optional[str] = Query(None, description="Filter status_koleksi (stock_jual, koleksi_pribadi, dll)"),
    status: Optional[str] = Query(None, description="Filter status pengiriman/pesanan (pesan, dikirim, diterima)"),
    negara: Optional[str] = Query(None, description="Filter negara asal"),
    batch_id: Optional[int] = Query(None, description="Filter berdasarkan ID batch"),
    lot_id: Optional[int] = Query(None, description="Filter berdasarkan ID paket lot"),
    hpp_min: Optional[float] = Query(None, description="Filter batas bawah HPP/pcs"),
    hpp_max: Optional[float] = Query(None, description="Filter batas atas HPP/pcs"),
    tahun_dari: Optional[str] = Query(None, description="Filter tahun mulai"),
    tahun_sampai: Optional[str] = Query(None, description="Filter tahun akhir"),
    catatan: Optional[str] = Query(None, description="Pencarian di catatan atau detail"),
    nomor_seri: Optional[str] = Query(None, description="Filter spesifik nomor seri"),
    kode_item: Optional[str] = Query(None, description="Filter spesifik kode item"),
    group_id: Optional[int] = Query(None, description="Filter spesifik ID Group Item"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan daftar koleksi numismatik dengan beragam filter dan paginasi."""
    ensure_lot_schema(conn)
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
    if lot_id is not None:
        where_clauses.append("k.lot_id = ?")
        params.append(lot_id)
    if group_id is not None:
        where_clauses.append("k.group_id = ?")
        params.append(group_id)
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
               b.kode_batch as batch_kode,
               g.nama_group as group_nama,
               l.kode_lot as lot_kode,
               l.nama_lot as lot_nama,
               l.harga_lot_total as lot_harga_total,
               (SELECT COUNT(*) FROM koleksi k2 WHERE k2.lot_id = k.lot_id) as lot_item_count
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        LEFT JOIN group_item g ON k.group_id = g.id
        LEFT JOIN lot_pembelian l ON k.lot_id = l.id
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

    if payload.group_id:
        cursor.execute("SELECT id FROM group_item WHERE id = ?", (payload.group_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group item tidak ditemukan")

    qty = max(1, payload.qty)
    hpp_calc = calculate_hpp_single(payload.harga, payload.ongkir, qty)
    hpp = hpp_calc["hpp"]
    hpp_per_pcs = hpp_calc["hpp_per_pcs"]
    tanggal_beli = payload.tanggal_beli or datetime.now().strftime("%Y-%m-%d")

    kode_item = payload.kode_item or generate_kode_item(conn)
    foto_obv = payload.foto_obv or payload.foto_path
    foto_rev = payload.foto_rev
    foto_detail = payload.foto_detail
    foto_path = payload.foto_path or foto_obv
    lembaga_grading = payload.lembaga_grading or "-"
    nomor_sertifikasi = payload.nomor_sertifikasi
    grade_numerik = payload.grade_numerik
    grading_url = payload.grading_url

    cursor.execute(
        """
        INSERT INTO koleksi (
            kode_item, nama_item, nomor_seri, tahun, denominasi, cetakan, grade, jenis, negara,
            bahan, warna_dominan, dimensi, kondisi_fisik, lokasi_simpan, detail,
            catatan_internal, foto_path, foto_obv, foto_rev, foto_detail,
            lembaga_grading, nomor_sertifikasi, grade_numerik, grading_url,
            supplier_id, batch_id, lot_id, group_id, perolehan, link_pembelian, tanggal_beli, status,
            qty, qty_terjual, harga, ongkir, hpp, hpp_per_pcs, harga_jual, status_koleksi,
            is_pecahan, parent_id, created_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, 0, ?, ?, ?, ?, ?, ?,
            0, NULL, ?
        )
        """,
        (
            kode_item, payload.nama_item.strip(), payload.nomor_seri, payload.tahun, payload.denominasi,
            payload.cetakan, payload.grade, payload.jenis, payload.negara,
            payload.bahan, payload.warna_dominan, payload.dimensi, payload.kondisi_fisik,
            payload.lokasi_simpan, payload.detail, payload.catatan_internal,
            foto_path, foto_obv, foto_rev, foto_detail,
            lembaga_grading, nomor_sertifikasi, grade_numerik, grading_url,
            payload.supplier_id, payload.batch_id, payload.lot_id, payload.group_id, payload.perolehan, payload.link_pembelian,
            tanggal_beli, payload.status or "pesan", qty, payload.harga, payload.ongkir,
            hpp, hpp_per_pcs, payload.harga_jual, payload.status_koleksi or "stock_jual",
            current_user["id"]
        )
    )
    conn.commit()
    new_id = cursor.lastrowid

    if payload.copy_gallery_from_id:
        cursor.execute(
            "SELECT foto_path, label, catatan FROM koleksi_foto WHERE koleksi_id = ? ORDER BY id ASC",
            (payload.copy_gallery_from_id,)
        )
        src_fotos = cursor.fetchall()
        for sf in src_fotos:
            cursor.execute(
                "INSERT INTO koleksi_foto (koleksi_id, foto_path, label, catatan) VALUES (?, ?, ?, ?)",
                (new_id, sf["foto_path"], sf["label"], sf["catatan"])
            )
        if src_fotos:
            conn.commit()

    cursor.execute(
        """
        SELECT k.*, (k.qty - k.qty_terjual) as qty_tersisa,
               s.nama as supplier_nama,
               b.kode_batch as batch_kode,
               g.nama_group as group_nama,
               l.kode_lot as lot_kode,
               l.nama_lot as lot_nama,
               l.harga_lot_total as lot_harga_total,
               (SELECT COUNT(*) FROM koleksi k2 WHERE k2.lot_id = k.lot_id) as lot_item_count
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        LEFT JOIN group_item g ON k.group_id = g.id
        LEFT JOIN lot_pembelian l ON k.lot_id = l.id
        WHERE k.id = ?
        """,
        (new_id,)
    )
    created_item = dict(cursor.fetchone())
    return created_item


@router.get("/lots/list")
def list_lots(
    batch_id: Optional[int] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan daftar seluruh Paket Lot Pembelian untuk filter dan pelacakan."""
    ensure_lot_schema(conn)
    cursor = conn.cursor()
    where_sql = "WHERE l.batch_id = ?" if batch_id is not None else ""
    params = (batch_id,) if batch_id is not None else ()
    cursor.execute(
        f"""
        SELECT l.*,
               b.kode_batch as batch_kode, b.nama_batch as batch_nama,
               s.nama as supplier_nama,
               COUNT(k.id) as item_count,
               COALESCE(SUM(k.qty), 0) as total_pcs
        FROM lot_pembelian l
        LEFT JOIN batch_pembelian b ON l.batch_id = b.id
        LEFT JOIN supplier s ON l.supplier_id = s.id
        LEFT JOIN koleksi k ON l.id = k.lot_id
        {where_sql}
        GROUP BY l.id
        ORDER BY l.id DESC
        """,
        params
    )
    lots = [dict(r) for r in cursor.fetchall()]
    return {"items": lots, "data": lots}


@router.post("/lot")
def create_lot_pembelian(
    payload: LotCreateRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Membuat Paket Lot (1 harga gabungan untuk beberapa item) pada Pembelian Single maupun Batch."""
    ensure_lot_schema(conn)
    if not payload.items or len(payload.items) == 0:
        raise HTTPException(status_code=400, detail="Paket Lot harus memiliki minimal 1 item.")

    cursor = conn.cursor()
    kode_lot = generate_kode_lot(conn)
    tanggal_beli = payload.tanggal_beli or datetime.now().strftime("%Y-%m-%d")

    # Jika di dalam batch, ambil info default dari batch jika belum diisi
    supplier_id = payload.supplier_id
    perolehan = payload.perolehan
    status_pengiriman = payload.status or "terima"
    link_pembelian = payload.link_pembelian

    if payload.batch_id:
        cursor.execute("SELECT * FROM batch_pembelian WHERE id = ?", (payload.batch_id,))
        batch_row = cursor.fetchone()
        if not batch_row:
            raise HTTPException(status_code=404, detail="Batch pembelian tidak ditemukan")
        if not supplier_id:
            supplier_id = batch_row["supplier_id"]
        if not perolehan:
            perolehan = batch_row["perolehan"]
        if not payload.status:
            status_pengiriman = batch_row["status"]
        if not link_pembelian:
            link_pembelian = batch_row["link_pembelian"]
        if not payload.tanggal_beli and batch_row["tanggal_beli"]:
            tanggal_beli = batch_row["tanggal_beli"]

    cursor.execute(
        """
        INSERT INTO lot_pembelian (
            kode_lot, nama_lot, harga_lot_total, ongkir_lot, metode_alokasi,
            batch_id, supplier_id, perolehan, link_pembelian, tanggal_beli,
            status, catatan, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            kode_lot,
            payload.nama_lot.strip(),
            payload.harga_lot_total,
            payload.ongkir_lot,
            payload.metode_alokasi or "proporsional_qty",
            payload.batch_id,
            supplier_id,
            perolehan,
            link_pembelian,
            tanggal_beli,
            status_pengiriman,
            payload.catatan,
            current_user["id"]
        )
    )
    lot_id = cursor.lastrowid

    # Hitung alokasi harga per item dan ongkir lot (jika Single Lot)
    n_items = len(payload.items)
    total_pcs = sum(max(1, it.qty) for it in payload.items)
    harga_lot = max(0.0, float(payload.harga_lot_total or 0.0))
    ongkir_lot = max(0.0, float(payload.ongkir_lot or 0.0)) if not payload.batch_id else 0.0

    # Cek apakah item sudah memiliki harga_alokasi dari frontend
    provided_allocs = [it.harga_alokasi for it in payload.items]
    use_provided = all(a is not None and a >= 0 for a in provided_allocs)

    allocated_prices = []
    if use_provided:
        allocated_prices = [round(float(a), 2) for a in provided_allocs]
    else:
        running_sum = 0.0
        for idx, it in enumerate(payload.items):
            if idx == n_items - 1:
                alloc = max(0.0, round(harga_lot - running_sum, 2))
            else:
                if payload.metode_alokasi == "bagi_rata_item":
                    alloc = round(harga_lot / n_items, 2)
                else:
                    qty_it = max(1, it.qty)
                    alloc = round((harga_lot * qty_it) / max(1, total_pcs), 2)
                running_sum += alloc
            allocated_prices.append(alloc)

    # Alokasi ongkir lot untuk Single Purchase
    allocated_ongkir = []
    running_ongkir = 0.0
    for idx, it in enumerate(payload.items):
        if ongkir_lot <= 0:
            allocated_ongkir.append(0.0)
        elif idx == n_items - 1:
            allocated_ongkir.append(max(0.0, round(ongkir_lot - running_ongkir, 2)))
        else:
            qty_it = max(1, it.qty)
            o_alloc = round((ongkir_lot * qty_it) / max(1, total_pcs), 2)
            running_ongkir += o_alloc
            allocated_ongkir.append(o_alloc)

    created_items = []
    for idx, it in enumerate(payload.items):
        qty = max(1, it.qty)
        item_harga = allocated_prices[idx]
        item_ongkir = allocated_ongkir[idx]
        hpp_calc = calculate_hpp_single(item_harga, item_ongkir, qty)
        kode_item = generate_kode_item(conn)
        denom = it.denominasi or it.nominal
        detail_val = it.detail or it.catatan_internal

        cursor.execute(
            """
            INSERT INTO koleksi (
                kode_item, nama_item, nomor_seri, tahun, denominasi, grade, jenis, negara,
                detail, catatan_internal, lembaga_grading, nomor_sertifikasi, grade_numerik, grading_url,
                supplier_id, batch_id, lot_id, group_id, perolehan, link_pembelian, tanggal_beli, status,
                qty, qty_terjual, harga, ongkir, hpp, hpp_per_pcs, harga_jual, status_koleksi,
                is_pecahan, parent_id, created_by
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, 0, ?, ?, ?, ?, ?, ?,
                0, NULL, ?
            )
            """,
            (
                kode_item,
                it.nama_item.strip(),
                it.nomor_seri,
                it.tahun,
                denom,
                it.grade or "UNC",
                it.jenis or "uang_kertas",
                it.negara or "Indonesia",
                detail_val,
                detail_val,
                it.lembaga_grading or "-",
                it.nomor_sertifikasi,
                it.grade_numerik,
                it.grading_url,
                supplier_id,
                payload.batch_id,
                lot_id,
                it.group_id if (it.group_id and it.group_id > 0) else None,
                perolehan,
                it.link_pembelian if it.link_pembelian else link_pembelian,
                it.tanggal_beli if it.tanggal_beli else tanggal_beli,
                status_pengiriman,
                qty,
                item_harga,
                item_ongkir,
                hpp_calc["hpp"],
                hpp_calc["hpp_per_pcs"],
                it.harga_jual or 0.0,
                payload.status_koleksi or "stock_jual",
                current_user["id"]
            )
        )
        new_item_id = cursor.lastrowid
        created_items.append({"id": new_item_id, "kode_item": kode_item, "nama_item": it.nama_item})

    conn.commit()

    # Jika bagian dari Batch, hitung ulang alokasi ongkir Batch secara proporsional/rata
    if payload.batch_id:
        from utils.calculations import calculate_hpp_batch
        cursor.execute("SELECT total_ongkir FROM batch_pembelian WHERE id = ?", (payload.batch_id,))
        b_row = cursor.fetchone()
        if b_row:
            cursor.execute("SELECT id, harga, qty FROM koleksi WHERE batch_id = ? ORDER BY id ASC", (payload.batch_id,))
            b_items = [dict(r) for r in cursor.fetchall()]
            if b_items:
                recalc = calculate_hpp_batch(b_items, float(b_row["total_ongkir"] or 0.0))
                for r_it in recalc:
                    cursor.execute(
                        "UPDATE koleksi SET ongkir = ?, hpp = ?, hpp_per_pcs = ? WHERE id = ?",
                        (r_it["ongkir"], r_it["hpp"], r_it["hpp_per_pcs"], r_it["id"])
                    )
                conn.commit()

    cursor.execute("SELECT * FROM lot_pembelian WHERE id = ?", (lot_id,))
    lot_dict = dict(cursor.fetchone())
    return {
        "lot": lot_dict,
        "items": created_items,
        "message": f"Paket Lot {kode_lot} berisi {len(created_items)} item berhasil disimpan!"
    }


@router.get("/lot/{lot_id}")
def get_lot_trace_detail(
    lot_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail Traceability Paket Lot beserta seluruh item anggota dan analisis ROI / Balik Modal Lot."""
    ensure_lot_schema(conn)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT l.*,
               b.kode_batch as batch_kode, b.nama_batch as batch_nama,
               s.nama as supplier_nama, s.no_hp as supplier_no_hp
        FROM lot_pembelian l
        LEFT JOIN batch_pembelian b ON l.batch_id = b.id
        LEFT JOIN supplier s ON l.supplier_id = s.id
        WHERE l.id = ?
        """,
        (lot_id,)
    )
    lot_row = cursor.fetchone()
    if not lot_row:
        raise HTTPException(status_code=404, detail="Data Paket Lot tidak ditemukan")
    lot_dict = dict(lot_row)

    cursor.execute(
        """
        SELECT k.*, (k.qty - k.qty_terjual) as qty_tersisa,
               g.nama_group as group_nama,
               COALESCE((SELECT SUM(p.qty_jual * p.harga_jual_pcs) FROM penjualan p WHERE p.koleksi_id = k.id), 0) as omzet_terjual,
               COALESCE((SELECT SUM(p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) FROM penjualan p WHERE p.koleksi_id = k.id), 0) as profit_terjual
        FROM koleksi k
        LEFT JOIN group_item g ON k.group_id = g.id
        WHERE k.lot_id = ?
        ORDER BY k.id ASC
        """,
        (lot_id,)
    )
    items = [dict(r) for r in cursor.fetchall()]

    total_items = len(items)
    total_pcs = sum(int(it.get("qty") or 1) for it in items)
    total_pcs_terjual = sum(int(it.get("qty_terjual") or 0) for it in items)
    total_pcs_tersisa = sum(int(it.get("qty_tersisa") or 0) for it in items)
    total_harga_alokasi = sum(float(it.get("harga") or 0) for it in items)
    total_ongkir_alokasi = sum(float(it.get("ongkir") or 0) for it in items)
    harga_lot_total = float(lot_dict.get("harga_lot_total") or total_harga_alokasi)
    total_hpp_lot = total_harga_alokasi + total_ongkir_alokasi
    total_omzet_terjual = sum(float(it.get("omzet_terjual") or 0) for it in items)
    total_estimasi_sisa = sum(float(it.get("harga_jual") or 0) * int(it.get("qty_tersisa") or 0) for it in items)
    selisih_balik_modal = total_omzet_terjual - total_hpp_lot
    pct_balik_modal = round((total_omzet_terjual / total_hpp_lot) * 100, 1) if total_hpp_lot > 0 else 100.0

    return {
        "lot": lot_dict,
        "items": items,
        "summary": {
            "total_items": total_items,
            "total_pcs": total_pcs,
            "total_pcs_terjual": total_pcs_terjual,
            "total_pcs_tersisa": total_pcs_tersisa,
            "harga_lot_total": harga_lot_total,
            "total_harga_alokasi": total_harga_alokasi,
            "total_ongkir_alokasi": total_ongkir_alokasi,
            "total_hpp_lot": total_hpp_lot,
            "total_omzet_terjual": total_omzet_terjual,
            "total_estimasi_sisa": total_estimasi_sisa,
            "selisih_balik_modal": selisih_balik_modal,
            "pct_balik_modal": pct_balik_modal,
            "is_balik_modal": selisih_balik_modal >= 0
        }
    }


@router.put("/lot/{lot_id}")
def update_lot_pembelian(
    lot_id: int,
    payload: LotUpdateRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Memperbarui informasi Paket Lot dan alokasi harga beli per item di dalam Lot."""
    ensure_lot_schema(conn)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lot_pembelian WHERE id = ?", (lot_id,))
    lot_row = cursor.fetchone()
    if not lot_row:
        raise HTTPException(status_code=404, detail="Paket Lot tidak ditemukan")

    nama_lot = payload.nama_lot.strip() if payload.nama_lot else lot_row["nama_lot"]
    harga_lot_total = payload.harga_lot_total if payload.harga_lot_total is not None else lot_row["harga_lot_total"]
    ongkir_lot = payload.ongkir_lot if payload.ongkir_lot is not None else lot_row["ongkir_lot"]
    metode_alokasi = payload.metode_alokasi or lot_row["metode_alokasi"]
    link_pembelian = payload.link_pembelian if payload.link_pembelian is not None else lot_row["link_pembelian"]
    tanggal_beli = payload.tanggal_beli or lot_row["tanggal_beli"]
    catatan = payload.catatan if payload.catatan is not None else lot_row["catatan"]

    cursor.execute(
        """
        UPDATE lot_pembelian
        SET nama_lot = ?, harga_lot_total = ?, ongkir_lot = ?, metode_alokasi = ?,
            link_pembelian = ?, tanggal_beli = ?, catatan = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
        """,
        (nama_lot, harga_lot_total, ongkir_lot, metode_alokasi, link_pembelian, tanggal_beli, catatan, lot_id)
    )

    cursor.execute("SELECT id, qty, ongkir FROM koleksi WHERE lot_id = ? ORDER BY id ASC", (lot_id,))
    lot_items = [dict(r) for r in cursor.fetchall()]
    total_pcs = sum(max(1, int(it["qty"] or 1)) for it in lot_items)

    alloc_map = {}
    if payload.item_allocations:
        for ia in payload.item_allocations:
            alloc_map[ia.koleksi_id] = max(0.0, float(ia.harga))

    running_ongkir = 0.0
    for idx, it in enumerate(lot_items):
        kid = it["id"]
        qty = max(1, int(it["qty"] or 1))
        new_harga = alloc_map.get(kid)
        if new_harga is None:
            new_harga = round((float(harga_lot_total) * qty) / max(1, total_pcs), 2)

        if not lot_row["batch_id"]:
            if idx == len(lot_items) - 1:
                new_ongkir = max(0.0, round(float(ongkir_lot) - running_ongkir, 2))
            else:
                new_ongkir = round((float(ongkir_lot) * qty) / max(1, total_pcs), 2)
                running_ongkir += new_ongkir
        else:
            new_ongkir = float(it["ongkir"] or 0.0)

        hpp_calc = calculate_hpp_single(new_harga, new_ongkir, qty)
        cursor.execute(
            "UPDATE koleksi SET harga = ?, ongkir = ?, hpp = ?, hpp_per_pcs = ?, link_pembelian = COALESCE(?, link_pembelian), updated_at = datetime('now','localtime') WHERE id = ?",
            (new_harga, new_ongkir, hpp_calc["hpp"], hpp_calc["hpp_per_pcs"], link_pembelian, kid)
        )

    conn.commit()

    if lot_row["batch_id"]:
        from utils.calculations import calculate_hpp_batch
        cursor.execute("SELECT total_ongkir FROM batch_pembelian WHERE id = ?", (lot_row["batch_id"],))
        b_row = cursor.fetchone()
        if b_row:
            cursor.execute("SELECT id, harga, qty FROM koleksi WHERE batch_id = ? ORDER BY id ASC", (lot_row["batch_id"],))
            b_items = [dict(r) for r in cursor.fetchall()]
            if b_items:
                recalc = calculate_hpp_batch(b_items, float(b_row["total_ongkir"] or 0.0))
                for r_it in recalc:
                    cursor.execute(
                        "UPDATE koleksi SET ongkir = ?, hpp = ?, hpp_per_pcs = ? WHERE id = ?",
                        (r_it["ongkir"], r_it["hpp"], r_it["hpp_per_pcs"], r_it["id"])
                    )
                conn.commit()

    return get_lot_trace_detail(lot_id, conn, current_user)


@router.get("/{koleksi_id}")
def get_koleksi_detail(
    koleksi_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail item koleksi lengkap dengan data supplier, batch, group, dan galeri foto."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT k.*, (k.qty - k.qty_terjual) as qty_tersisa,
               s.nama as supplier_nama, s.no_hp as supplier_no_hp,
               b.kode_batch as batch_kode, b.nama_batch as batch_nama, b.link_pembelian as batch_link_pembelian,
               g.nama_group as group_nama,
               l.kode_lot as lot_kode,
               l.nama_lot as lot_nama,
               l.harga_lot_total as lot_harga_total,
               (SELECT COUNT(*) FROM koleksi k2 WHERE k2.lot_id = k.lot_id) as lot_item_count
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        LEFT JOIN group_item g ON k.group_id = g.id
        LEFT JOIN lot_pembelian l ON k.lot_id = l.id
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
    item_dict = dict(item)

    # Ambil galeri foto pendukung
    cursor.execute(
        "SELECT id, koleksi_id, label, foto_path, catatan, created_at FROM koleksi_foto WHERE koleksi_id = ? ORDER BY id ASC",
        (koleksi_id,)
    )
    item_dict["gallery_fotos"] = [dict(r) for r in cursor.fetchall()]

    return item_dict

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
        ("foto_detail", payload.foto_detail),
        ("lembaga_grading", payload.lembaga_grading),
        ("nomor_sertifikasi", payload.nomor_sertifikasi),
        ("grade_numerik", payload.grade_numerik),
        ("grading_url", payload.grading_url),
        ("supplier_id", payload.supplier_id),
        ("batch_id", payload.batch_id),
        ("group_id", (payload.group_id if payload.group_id > 0 else None) if payload.group_id is not None else None),
        ("perolehan", payload.perolehan),
        ("link_pembelian", (payload.link_pembelian.strip() or None) if payload.link_pembelian is not None else None),
        ("tanggal_beli", payload.tanggal_beli),
        ("status", payload.status),
        ("harga_jual", payload.harga_jual),
        ("status_koleksi", payload.status_koleksi),
        ("is_checked", payload.is_checked),
    ]

    if payload.group_id is not None and payload.group_id > 0:
        cursor.execute("SELECT id FROM group_item WHERE id = ?", (payload.group_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group item tidak ditemukan")

    for col, val in field_mappings:
        if val is not None or (col == "group_id" and payload.group_id is not None) or (col == "link_pembelian" and payload.link_pembelian is not None):
            updates.append(f"{col} = ?")
            params.append(val)

    if updates:
        updates.append("updated_at = datetime('now','localtime')")
        params.append(koleksi_id)
        cursor.execute(f"UPDATE koleksi SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()

    cursor.execute(
        """
        SELECT k.*, (k.qty - k.qty_terjual) as qty_tersisa,
               s.nama as supplier_nama,
               b.kode_batch as batch_kode,
               g.nama_group as group_nama,
               l.kode_lot as lot_kode,
               l.nama_lot as lot_nama,
               l.harga_lot_total as lot_harga_total,
               (SELECT COUNT(*) FROM koleksi k2 WHERE k2.lot_id = k.lot_id) as lot_item_count
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        LEFT JOIN group_item g ON k.group_id = g.id
        LEFT JOIN lot_pembelian l ON k.lot_id = l.id
        WHERE k.id = ?
        """,
        (koleksi_id,)
    )
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

    # Hapus keterkaitan pada album digital dan galeri foto
    cursor.execute("DELETE FROM album_item WHERE koleksi_id = ?", (koleksi_id,))
    cursor.execute("DELETE FROM koleksi_foto WHERE koleksi_id = ?", (koleksi_id,))

    cursor.execute("DELETE FROM koleksi WHERE id = ?", (koleksi_id,))
    conn.commit()
    return {"message": "Item koleksi berhasil dihapus"}

@router.post("/fetch-remote-image")
def fetch_remote_image(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mengunduh gambar dari URL eksternal (proxy anti-CORS untuk copy-paste / drag dari website lain)."""
    url = str(payload.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL gambar kosong")

    if url.startswith("data:image/"):
        try:
            header, b64_data = url.split(",", 1)
            mime_type = header.split(";")[0].replace("data:", "") or "image/png"
            raw_bytes = base64.b64decode(b64_data)
            return Response(content=raw_bytes, media_type=mime_type)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Data URI tidak valid: {e}")

    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL harus diawali http:// atau https://")

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Referer": url
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip().lower()
            raw_bytes = resp.read(20 * 1024 * 1024)  # batas aman 20 MB
            if not content_type.startswith("image/"):
                content_type = "image/jpeg"
            return Response(content=raw_bytes, media_type=content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal mengambil gambar dari URL tersebut: {str(e)}"
        )

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
    if ext == ".jfif":
        ext = ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".avif"]:
        ctype = (file.content_type or "").lower()
        if "png" in ctype:
            ext = ".png"
        elif "webp" in ctype:
            ext = ".webp"
        elif "gif" in ctype:
            ext = ".gif"
        else:
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
            catatan_internal, foto_path, foto_obv, foto_rev, supplier_id, batch_id, group_id, perolehan,
            link_pembelian, tanggal_beli, status, qty, qty_terjual, harga, ongkir,
            hpp, hpp_per_pcs, harga_jual, status_koleksi, is_pecahan, parent_id, created_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
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
            parent_dict["supplier_id"], parent_dict["batch_id"], parent_dict.get("group_id"), parent_dict["perolehan"], parent_dict["link_pembelian"],
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

# ==============================================================================
# Multi-Foto Galeri (Obverse, Reverse, Detail Watermark/Slab)
# ==============================================================================

@router.post("/{koleksi_id}/gallery")
async def upload_gallery_foto(
    koleksi_id: int,
    foto: UploadFile = File(...),
    label: str = Form("detail"),
    catatan: Optional[str] = Form(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mengunggah foto tambahan ke galeri item koleksi (detail watermark, slab, obv, rev)."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM koleksi WHERE id = ?", (koleksi_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item koleksi tidak ditemukan")

    STATIC_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(foto.filename or "").suffix.lower()
    if ext == ".jfif":
        ext = ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".bmp", ".avif"]:
        ctype = (foto.content_type or "").lower()
        if "png" in ctype:
            ext = ".png"
        elif "webp" in ctype:
            ext = ".webp"
        elif "gif" in ctype:
            ext = ".gif"
        elif "svg" in ctype:
            ext = ".svg"
        else:
            ext = ".jpg"

    unique_filename = f"gal_{koleksi_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = STATIC_UPLOADS_DIR / unique_filename

    async with aiofiles.open(file_path, "wb") as out_file:
        content = await foto.read()
        await out_file.write(content)

    foto_path = f"/static/uploads/{unique_filename}"
    cursor.execute(
        """
        INSERT INTO koleksi_foto (koleksi_id, label, foto_path, catatan)
        VALUES (?, ?, ?, ?)
        """,
        (koleksi_id, label.strip(), foto_path, catatan)
    )
    conn.commit()
    foto_id = cursor.lastrowid

    return {
        "status": "success",
        "id": foto_id,
        "koleksi_id": koleksi_id,
        "label": label,
        "foto_path": foto_path,
        "catatan": catatan
    }

@router.get("/{koleksi_id}/gallery")
def list_gallery_foto(
    koleksi_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan seluruh foto galeri untuk item tertentu."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, koleksi_id, label, foto_path, catatan, created_at FROM koleksi_foto WHERE koleksi_id = ? ORDER BY id ASC",
        (koleksi_id,)
    )
    return [dict(r) for r in cursor.fetchall()]

@router.delete("/{koleksi_id}/gallery/{foto_id}")
def delete_gallery_foto(
    koleksi_id: int,
    foto_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghapus salah satu foto dari galeri koleksi."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT foto_path FROM koleksi_foto WHERE id = ? AND koleksi_id = ?",
        (foto_id, koleksi_id)
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto galeri tidak ditemukan")

    file_to_del = Path(__file__).resolve().parent.parent / row["foto_path"].lstrip("/")
    if file_to_del.exists():
        try:
            file_to_del.unlink()
        except Exception:
            pass

    cursor.execute("DELETE FROM koleksi_foto WHERE id = ?", (foto_id,))
    conn.commit()
    return {"status": "success", "message": "Foto galeri berhasil dihapus"}

# ==============================================================================
# Cetak Label Holder Koin / Uang Kertas (Stiker 2x2 inch / 5x5 cm)
# ==============================================================================

@router.get("/{koleksi_id}/label-html", response_class=HTMLResponse)
def print_holder_label_html(
    koleksi_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghasilkan tampilan siap cetak label holder koin/koleksi (ukuran 2x2 inch / 5x5 cm)."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM koleksi WHERE id = ?", (koleksi_id,))
    item = cursor.fetchone()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item tidak ditemukan")

    it = dict(item)
    nama = it.get("nama_item", "Koleksi Numismatik")
    negara = (it.get("negara") or "INDONESIA").upper()
    tahun = it.get("tahun") or "-"
    denominasi = it.get("denominasi") or "-"
    nomor_seri = it.get("nomor_seri") or "-"
    grade = it.get("grade") or "UNC"
    lembaga = it.get("lembaga_grading") or "-"
    no_sertif = it.get("nomor_sertifikasi") or ""
    kode_item = it.get("kode_item") or f"ITM-{koleksi_id}"

    grading_text = f"{lembaga} {it.get('grade_numerik') or grade}" if lembaga and lembaga != "-" else grade
    if no_sertif:
        grading_text += f"<br><small style='font-size:8px;color:#555;'>#{no_sertif}</small>"

    html = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Label Holder - {kode_item}</title>
<style>
  @page {{
    size: 50mm 50mm;
    margin: 0;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
  }}
  body {{
    background: #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }}
  .label-container {{
    width: 50mm;
    height: 50mm;
    background: #fff;
    border: 1px dashed #bbb;
    padding: 3mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
    position: relative;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }}
  .label-header {{
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #b8860b;
    border-bottom: 0.5px solid #d4af37;
    padding-bottom: 1mm;
    text-transform: uppercase;
  }}
  .country-year {{
    font-size: 8.5px;
    font-weight: 700;
    color: #222;
    margin-top: 1mm;
  }}
  .denom {{
    font-size: 11px;
    font-weight: 900;
    color: #111;
    margin: 1mm 0;
  }}
  .item-title {{
    font-size: 7.5px;
    color: #444;
    line-height: 1.1;
    max-height: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
  }}
  .grade-badge {{
    display: inline-block;
    background: #fdf5e6;
    border: 0.8px solid #d4af37;
    color: #8b6508;
    font-size: 9px;
    font-weight: 800;
    padding: 1.5px 4px;
    border-radius: 3px;
    margin: 1.5mm auto 1mm auto;
  }}
  .serial-no {{
    font-size: 7.5px;
    font-family: monospace;
    color: #333;
    letter-spacing: 0.5px;
  }}
  .barcode-box {{
    margin-top: 1mm;
    font-size: 7px;
    color: #666;
    border-top: 0.5px dashed #ccc;
    padding-top: 1mm;
  }}
  .btn-print {{
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d4af37;
    color: #000;
    font-weight: bold;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }}
  @media print {{
    body {{
      background: none;
    }}
    .btn-print {{
      display: none;
    }}
    .label-container {{
      border: 0.5px solid #ccc;
      box-shadow: none;
      page-break-after: always;
    }}
  }}
</style>
</head>
<body>
<button class="btn-print" onclick="window.print()">🖨️ Cetak Label</button>
<div class="label-container">
  <div class="label-header">NumisManager Archive</div>
  <div class="country-year">{negara} • {tahun}</div>
  <div class="denom">{denominasi}</div>
  <div class="item-title">{nama}</div>
  <div>
    <div class="grade-badge">{grading_text}</div>
  </div>
  <div class="serial-no">SN: {nomor_seri}</div>
  <div class="barcode-box">
    <strong>{kode_item}</strong>
  </div>
</div>
<script>
  // Auto trigger print dialog on query param ?print=1
  if (window.location.search.includes('print=1')) {{
    window.onload = function() {{ window.print(); }}
  }}
</script>
</body>
</html>"""
    return HTMLResponse(content=html)
