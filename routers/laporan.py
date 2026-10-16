from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
import sqlite3
from database.db import get_db
from utils.auth_utils import get_current_user
from utils.export_excel import export_stok, export_penjualan, export_profit

router = APIRouter(prefix="/api/laporan", tags=["Laporan & Statistik Dashboard"])

@router.get("/dashboard")
def get_dashboard_summary(
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Menyediakan data ringkasan KPI untuk halaman utama/dashboard:
    - total_item
    - total_stok
    - total_nilai_hpp
    - total_penjualan
    - total_profit
    - stok_per_jenis
    - penjualan_per_bulan (12 bulan terakhir)
    - pending_items (status pesan atau dikirim)
    - item_terbaru (10 item terbaru)
    """
    cursor = conn.cursor()

    # 1. Total Distinct Items
    cursor.execute("SELECT COUNT(*) as cnt FROM koleksi")
    total_item = cursor.fetchone()["cnt"]

    # 2. Total Stok Tersisa
    cursor.execute("SELECT COALESCE(SUM(qty - qty_terjual), 0) as total FROM koleksi")
    total_stok = cursor.fetchone()["total"]

    # 3. Total Nilai HPP Koleksi
    cursor.execute("SELECT COALESCE(SUM(hpp), 0) as total FROM koleksi")
    total_nilai_hpp = cursor.fetchone()["total"]

    # 4. Total Omzet Penjualan
    cursor.execute("SELECT COALESCE(SUM(qty_jual * harga_jual_pcs), 0) as total FROM penjualan")
    total_penjualan = cursor.fetchone()["total"]

    # 5. Total Profit Penjualan
    cursor.execute("SELECT COALESCE(SUM(qty_jual * (harga_jual_pcs - hpp_pcs)), 0) as total FROM penjualan")
    total_profit = cursor.fetchone()["total"]

    # 6. Stok per Jenis
    cursor.execute(
        """
        SELECT COALESCE(NULLIF(jenis, ''), 'Lainnya') as jenis,
               COUNT(*) as count,
               COALESCE(SUM(hpp), 0) as nilai_hpp
        FROM koleksi
        GROUP BY jenis
        ORDER BY count DESC
        """
    )
    stok_per_jenis = [dict(r) for r in cursor.fetchall()]

    # 7. Penjualan per Bulan (12 Bulan Terakhir)
    cursor.execute(
        """
        SELECT strftime('%Y-%m', tanggal_jual) as bulan,
               COALESCE(SUM(qty_jual * harga_jual_pcs), 0) as total,
               COALESCE(SUM(qty_jual * (harga_jual_pcs - hpp_pcs)), 0) as profit
        FROM penjualan
        WHERE tanggal_jual >= date('now', '-12 months')
        GROUP BY bulan
        ORDER BY bulan ASC
        """
    )
    penjualan_per_bulan = [dict(r) for r in cursor.fetchall()]

    # 8. Pending Items (status = 'pesan' atau 'dikirim')
    cursor.execute(
        """
        SELECT k.id, k.nama_item, k.status, k.tanggal_beli, s.nama as supplier_nama
        FROM koleksi k
        LEFT JOIN supplier s ON k.supplier_id = s.id
        WHERE k.status IN ('pesan', 'dikirim')
        ORDER BY k.id DESC
        LIMIT 20
        """
    )
    pending_items = [dict(r) for r in cursor.fetchall()]

    # 9. Item Terbaru (10 item terakhir)
    cursor.execute(
        """
        SELECT id, kode_item, nama_item, jenis, grade, tahun, negara, nomor_seri, harga_jual, hpp_per_pcs, foto_path, foto_obv, foto_rev, created_at
        FROM koleksi
        ORDER BY id DESC
        LIMIT 10
        """
    )
    item_terbaru = [dict(r) for r in cursor.fetchall()]

    return {
        "total_item": total_item,
        "total_stok": total_stok,
        "total_nilai_hpp": round(total_nilai_hpp, 2),
        "total_penjualan": round(total_penjualan, 2),
        "total_profit": round(total_profit, 2),
        "stok_per_jenis": stok_per_jenis,
        "penjualan_per_bulan": penjualan_per_bulan,
        "pending_items": pending_items,
        "item_terbaru": item_terbaru
    }

def _get_stok_data(conn: sqlite3.Connection, jenis: Optional[str], status_koleksi: Optional[str], negara: Optional[str]):
    cursor = conn.cursor()
    where = []
    params = []
    if jenis:
        where.append("k.jenis = ?")
        params.append(jenis)
    if status_koleksi:
        where.append("k.status_koleksi = ?")
        params.append(status_koleksi)
    if negara:
        where.append("k.negara = ?")
        params.append(negara)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    query = f"""
        SELECT k.id, k.nama_item, k.tahun, k.grade, k.jenis, k.negara,
               k.qty, k.qty_terjual, (k.qty - k.qty_terjual) as qty_tersisa,
               k.hpp, k.hpp_per_pcs, k.harga_jual,
               ((k.qty - k.qty_terjual) * k.hpp_per_pcs) as nilai_stok
        FROM koleksi k
        {where_sql}
        ORDER BY k.id DESC
    """
    cursor.execute(query, tuple(params))
    items = [dict(r) for r in cursor.fetchall()]

    total_item = len(items)
    total_qty = sum(item["qty_tersisa"] for item in items)
    total_nilai_hpp = round(sum(item["hpp"] for item in items), 2)
    total_nilai_stok = round(sum(item["nilai_stok"] for item in items), 2)

    summary = {
        "total_item": total_item,
        "total_qty": total_qty,
        "total_nilai_hpp": total_nilai_hpp,
        "total_nilai_stok": total_nilai_stok
    }
    return items, summary

@router.get("/stok")
def get_laporan_stok(
    jenis: Optional[str] = Query(None),
    status_koleksi: Optional[str] = Query(None),
    negara: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Laporan komprehensif stok koleksi numismatik beserta ringkasan nilai modal."""
    items, summary = _get_stok_data(conn, jenis, status_koleksi, negara)
    return {"items": items, "summary": summary}

def _get_penjualan_data(conn: sqlite3.Connection, tanggal_dari: Optional[str], tanggal_sampai: Optional[str], platform_jual: Optional[str]):
    cursor = conn.cursor()
    where = []
    params = []
    if tanggal_dari:
        where.append("p.tanggal_jual >= ?")
        params.append(tanggal_dari)
    if tanggal_sampai:
        where.append("p.tanggal_jual <= ?")
        params.append(tanggal_sampai)
    if platform_jual:
        where.append("p.platform_jual = ?")
        params.append(platform_jual)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    query = f"""
        SELECT p.kode_jual, p.tanggal_jual, k.nama_item, p.qty_jual,
               p.harga_jual_pcs, p.hpp_pcs,
               (p.qty_jual * p.harga_jual_pcs) as total_jual,
               (p.harga_jual_pcs - p.hpp_pcs) as profit_pcs,
               (p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) as total_profit,
               CASE
                   WHEN p.harga_jual_pcs > 0 THEN ROUND(((p.harga_jual_pcs - p.hpp_pcs) / p.harga_jual_pcs) * 100, 2)
                   ELSE 0.0
               END as margin_pct,
               p.pembeli, p.platform_jual
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        {where_sql}
        ORDER BY p.tanggal_jual DESC, p.id DESC
    """
    cursor.execute(query, tuple(params))
    items = [dict(r) for r in cursor.fetchall()]

    total_transaksi = len(items)
    total_qty = sum(item["qty_jual"] for item in items)
    total_jual = round(sum(item["total_jual"] for item in items), 2)
    total_hpp = round(sum(item["qty_jual"] * item["hpp_pcs"] for item in items), 2)
    total_profit = round(sum(item["total_profit"] for item in items), 2)
    avg_margin = round((total_profit / total_jual * 100), 2) if total_jual > 0 else 0.0

    summary = {
        "total_transaksi": total_transaksi,
        "total_qty": total_qty,
        "total_jual": total_jual,
        "total_hpp": total_hpp,
        "total_profit": total_profit,
        "avg_margin": avg_margin
    }
    return items, summary

@router.get("/penjualan")
def get_laporan_penjualan(
    tanggal_dari: Optional[str] = Query(None),
    tanggal_sampai: Optional[str] = Query(None),
    platform_jual: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Laporan riwayat penjualan dengan rincian profit dan margin."""
    items, summary = _get_penjualan_data(conn, tanggal_dari, tanggal_sampai, platform_jual)
    return {"items": items, "summary": summary}

def _get_profit_data(conn: sqlite3.Connection, tanggal_dari: Optional[str], tanggal_sampai: Optional[str]):
    cursor = conn.cursor()
    where = []
    params = []
    if tanggal_dari:
        where.append("p.tanggal_jual >= ?")
        params.append(tanggal_dari)
    if tanggal_sampai:
        where.append("p.tanggal_jual <= ?")
        params.append(tanggal_sampai)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    query = f"""
        SELECT p.koleksi_id, k.nama_item,
               SUM(p.qty_jual) as total_qty_jual,
               SUM(p.qty_jual * p.harga_jual_pcs) as total_jual,
               SUM(p.qty_jual * p.hpp_pcs) as total_hpp_cost,
               SUM(p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) as total_profit,
               CASE
                   WHEN SUM(p.qty_jual * p.harga_jual_pcs) > 0 THEN
                       ROUND((SUM(p.qty_jual * (p.harga_jual_pcs - p.hpp_pcs)) / SUM(p.qty_jual * p.harga_jual_pcs)) * 100, 2)
                   ELSE 0.0
               END as margin_pct
        FROM penjualan p
        JOIN koleksi k ON p.koleksi_id = k.id
        {where_sql}
        GROUP BY p.koleksi_id, k.nama_item
        ORDER BY total_profit DESC
    """
    cursor.execute(query, tuple(params))
    items = [dict(r) for r in cursor.fetchall()]

    total_item_terjual = len(items)
    total_qty = sum(item["total_qty_jual"] for item in items)
    total_jual = round(sum(item["total_jual"] for item in items), 2)
    total_hpp_cost = round(sum(item["total_hpp_cost"] for item in items), 2)
    total_profit = round(sum(item["total_profit"] for item in items), 2)
    avg_margin = round((total_profit / total_jual * 100), 2) if total_jual > 0 else 0.0

    summary = {
        "total_item_terjual": total_item_terjual,
        "total_qty": total_qty,
        "total_jual": total_jual,
        "total_hpp_cost": total_hpp_cost,
        "total_profit": total_profit,
        "avg_margin": avg_margin
    }
    return items, summary

@router.get("/profit")
def get_laporan_profit(
    tanggal_dari: Optional[str] = Query(None),
    tanggal_sampai: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Laporan profit dan loss dikelompokkan per item koleksi."""
    items, summary = _get_profit_data(conn, tanggal_dari, tanggal_sampai)
    return {"items": items, "summary": summary}

@router.get("/export/stok")
def export_laporan_stok(
    jenis: Optional[str] = Query(None),
    status_koleksi: Optional[str] = Query(None),
    negara: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Ekspor laporan stok ke file spreadsheet Excel (.xlsx)."""
    items, _ = _get_stok_data(conn, jenis, status_koleksi, negara)
    stream = export_stok(items)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=laporan_stok.xlsx"}
    )

@router.get("/export/penjualan")
def export_laporan_penjualan(
    tanggal_dari: Optional[str] = Query(None),
    tanggal_sampai: Optional[str] = Query(None),
    platform_jual: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Ekspor riwayat transaksi penjualan ke spreadsheet Excel (.xlsx)."""
    items, _ = _get_penjualan_data(conn, tanggal_dari, tanggal_sampai, platform_jual)
    stream = export_penjualan(items)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=laporan_penjualan.xlsx"}
    )

@router.get("/export/profit")
def export_laporan_profit(
    tanggal_dari: Optional[str] = Query(None),
    tanggal_sampai: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Ekspor laporan profit/loss per item ke spreadsheet Excel (.xlsx)."""
    items, summary = _get_profit_data(conn, tanggal_dari, tanggal_sampai)
    stream = export_profit(items, summary)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=laporan_profit.xlsx"}
    )
