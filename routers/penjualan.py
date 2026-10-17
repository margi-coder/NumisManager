from datetime import datetime
import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
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

# ==============================================================================
# Cetak Nota Bukti Transaksi Penjualan (HTML / Print / PDF Ready)
# ==============================================================================

@router.get("/{penjualan_id}/nota-html", response_class=HTMLResponse)
def print_nota_penjualan_html(
    penjualan_id: int,
    auto_print: int = Query(0, description="1 untuk langsung memicu window.print()"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghasilkan nota bukti transaksi penjualan resmi yang siap dicetak atau disimpan sebagai PDF."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT p.*, k.nama_item, k.nomor_seri, k.tahun, k.denominasi, k.grade,
               k.lembaga_grading, k.nomor_sertifikasi, k.grade_numerik, k.negara, k.jenis
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        WHERE p.id = ?
        """,
        (penjualan_id,)
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi penjualan tidak ditemukan"
        )

    data = dict(row)
    kode_jual = data.get("kode_jual") or f"NOTA-{penjualan_id:04d}"
    tanggal_jual = data.get("tanggal_jual") or datetime.now().strftime("%Y-%m-%d")
    pembeli = data.get("pembeli") or "Pelanggan Terhormat"
    platform = (data.get("platform_jual") or "Langsung / Direct").upper()
    catatan = data.get("catatan") or "Terima kasih atas pembelian koleksi numismatik."

    nama_item = data.get("nama_item") or "Item Koleksi"
    nomor_seri = data.get("nomor_seri") or "-"
    tahun = data.get("tahun") or "-"
    denominasi = data.get("denominasi") or "-"
    grade = data.get("grade") or "-"
    lembaga = data.get("lembaga_grading")
    grade_num = data.get("grade_numerik")
    no_sertif = data.get("nomor_sertifikasi")

    grade_display = grade
    if lembaga and lembaga != "-":
        grade_display = f"{lembaga} {grade_num or grade}"
        if no_sertif:
            grade_display += f" (Cert #{no_sertif})"

    qty = int(data.get("qty_jual") or 1)
    harga_pcs = float(data.get("harga_jual_pcs") or 0.0)
    total_jual = qty * harga_pcs

    def format_idr(val: float) -> str:
        return f"Rp {int(val):,}".replace(",", ".")

    auto_print_script = "window.onload = function() { window.print(); };" if auto_print == 1 else ""

    html = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nota Transaksi - {kode_jual}</title>
<style>
  @page {{
    size: A5 portrait;
    margin: 10mm;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  }}
  body {{
    background: #f1f3f6;
    color: #2c3e50;
    display: flex;
    justify-content: center;
    padding: 24px;
    min-height: 100vh;
  }}
  .nota-container {{
    width: 148mm;
    min-height: 200mm;
    background: #ffffff;
    border-radius: 8px;
    padding: 14mm 12mm;
    box-shadow: 0 4px 18px rgba(0,0,0,0.08);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #d4af37;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }}
  .brand-title {{
    font-size: 20px;
    font-weight: 800;
    color: #1a202c;
    letter-spacing: 0.5px;
  }}
  .brand-title span {{
    color: #b8860b;
  }}
  .brand-sub {{
    font-size: 10.5px;
    color: #718096;
    margin-top: 2px;
  }}
  .nota-badge {{
    text-align: right;
  }}
  .nota-badge .title {{
    font-size: 13px;
    font-weight: 800;
    color: #b8860b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }}
  .nota-badge .number {{
    font-size: 12px;
    font-weight: 700;
    color: #2d3748;
    margin-top: 3px;
  }}
  .info-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 11px;
    background: #fafafc;
    border: 1px solid #edf2f7;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 18px;
  }}
  .info-item span.label {{
    color: #718096;
    display: inline-block;
    width: 80px;
  }}
  .info-item span.value {{
    font-weight: 600;
    color: #2d3748;
  }}
  table.items-table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18px;
    font-size: 11px;
  }}
  table.items-table th {{
    background: #2d3748;
    color: #fff;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }}
  table.items-table td {{
    padding: 10px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }}
  .item-name {{
    font-weight: 700;
    color: #1a202c;
    font-size: 11.5px;
    margin-bottom: 3px;
  }}
  .item-meta {{
    font-size: 10px;
    color: #718096;
  }}
  .item-grade {{
    display: inline-block;
    background: #fdf5e6;
    color: #8b6508;
    border: 0.5px solid #d4af37;
    border-radius: 3px;
    padding: 1px 5px;
    font-weight: 700;
    font-size: 9.5px;
    margin-top: 3px;
  }}
  .text-right {{
    text-align: right;
  }}
  .text-center {{
    text-align: center;
  }}
  .summary-section {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }}
  .notes-box {{
    width: 55%;
    font-size: 10px;
    color: #4a5568;
    background: #f7fafc;
    border-left: 3px solid #d4af37;
    padding: 8px 10px;
    border-radius: 0 4px 4px 0;
  }}
  .total-box {{
    width: 40%;
    text-align: right;
  }}
  .total-row {{
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #4a5568;
    margin-bottom: 4px;
  }}
  .total-row.grand {{
    border-top: 1.5px solid #2d3748;
    padding-top: 6px;
    margin-top: 6px;
    font-size: 13px;
    font-weight: 800;
    color: #b8860b;
  }}
  .paid-badge {{
    display: inline-block;
    margin-top: 8px;
    padding: 3px 12px;
    background: #e6fffa;
    color: #234e52;
    border: 1px solid #38b2ac;
    font-weight: 800;
    font-size: 11px;
    border-radius: 4px;
    letter-spacing: 1px;
  }}
  .signatures {{
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 10px;
  }}
  .sign-col {{
    text-align: center;
    width: 40%;
    font-size: 10.5px;
    color: #4a5568;
  }}
  .sign-line {{
    margin-top: 50px;
    border-bottom: 1px dashed #a0aec0;
    width: 100%;
  }}
  .sign-name {{
    margin-top: 4px;
    font-weight: 700;
    color: #2d3748;
  }}
  .footer-legal {{
    text-align: center;
    font-size: 9px;
    color: #a0aec0;
    margin-top: 20px;
    border-top: 1px solid #edf2f7;
    padding-top: 8px;
  }}
  .action-bar {{
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    gap: 10px;
  }}
  .action-btn {{
    background: #d4af37;
    color: #1a202c;
    border: none;
    font-weight: 700;
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }}
  .action-btn.secondary {{
    background: #4a5568;
    color: #fff;
  }}
  @media print {{
    body {{
      background: #fff;
      padding: 0;
    }}
    .action-bar {{
      display: none;
    }}
    .nota-container {{
      width: 100%;
      min-height: auto;
      box-shadow: none;
      padding: 0;
    }}
  }}
</style>
</head>
<body>
<div class="action-bar">
  <button class="action-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  <button class="action-btn secondary" onclick="window.close()">❌ Tutup</button>
</div>

<div class="nota-container">
  <div>
    <div class="header">
      <div>
        <div class="brand-title">🪙 Numis<span>Manager</span></div>
        <div class="brand-sub">Sistem Manajemen & Galeri Koleksi Numismatik</div>
      </div>
      <div class="nota-badge">
        <div class="title">Nota Penjualan</div>
        <div class="number">{kode_jual}</div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="info-item"><span class="label">Tanggal:</span> <span class="value">{tanggal_jual}</span></div>
        <div class="info-item"><span class="label">Platform:</span> <span class="value">{platform}</span></div>
      </div>
      <div>
        <div class="info-item"><span class="label">Pembeli:</span> <span class="value">{pembeli}</span></div>
        <div class="info-item"><span class="label">Kasir/Staf:</span> <span class="value">{current_user.get("full_name") or current_user.get("username")}</span></div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 45%;">Rincian Koleksi</th>
          <th class="text-center" style="width: 15%;">Qty</th>
          <th class="text-right" style="width: 20%;">Harga Satuan</th>
          <th class="text-right" style="width: 20%;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-name">{nama_item}</div>
            <div class="item-meta">Tahun: {tahun} | Denominasi: {denominasi} | SN: {nomor_seri}</div>
            <div class="item-grade">Grade: {grade_display}</div>
          </td>
          <td class="text-center" style="font-weight: 700;">{qty} pcs</td>
          <td class="text-right">{format_idr(harga_pcs)}</td>
          <td class="text-right" style="font-weight: 700;">{format_idr(total_jual)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-section">
      <div class="notes-box">
        <strong>Catatan Transaksi:</strong><br>
        {catatan}
      </div>
      <div class="total-box">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>{format_idr(total_jual)}</span>
        </div>
        <div class="total-row grand">
          <span>TOTAL:</span>
          <span>{format_idr(total_jual)}</span>
        </div>
        <div class="paid-badge">LUNAS</div>
      </div>
    </div>
  </div>

  <div>
    <div class="signatures">
      <div class="sign-col">
        <div>Diterima oleh,</div>
        <div class="sign-line"></div>
        <div class="sign-name">{pembeli}</div>
      </div>
      <div class="sign-col">
        <div>Hormat Kami,</div>
        <div class="sign-line"></div>
        <div class="sign-name">NumisManager Gallery</div>
      </div>
    </div>

    <div class="footer-legal">
      Dokumen ini sah sebagai tanda terima transaksi jual-beli koleksi uang kuno & numismatik resmi NumisManager.
    </div>
  </div>
</div>

<script>
{auto_print_script}
</script>
</body>
</html>
"""
    return HTMLResponse(content=html)

