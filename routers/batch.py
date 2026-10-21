from datetime import datetime
import html
import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
import sqlite3
from database.db import get_db
from database.models import BatchCreate, BatchUpdate, BatchResponse
from utils.auth_utils import get_current_user, get_optional_user
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
    limit: int = Query(100, ge=1, le=500, description="Jumlah data per halaman"),
    status: Optional[str] = Query(None, description="Filter status batch (pesan/dikirim/terima)"),
    perolehan: Optional[str] = Query(None, description="Filter metode perolehan"),
    search: Optional[str] = Query(None, description="Pencarian nama batch, kode batch, atau supplier"),
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
    if perolehan:
        where_clauses.append("b.perolehan = ?")
        params.append(perolehan)
    if search:
        search_param = f"%{search.strip()}%"
        where_clauses.append("(b.kode_batch LIKE ? OR b.nama_batch LIKE ? OR s.nama LIKE ?)")
        params.extend([search_param, search_param, search_param])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Count total
    count_sql = f"""
        SELECT COUNT(DISTINCT b.id) as total 
        FROM batch_pembelian b 
        LEFT JOIN supplier s ON b.supplier_id = s.id 
        {where_sql}
    """
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
        SELECT k.id, k.kode_item, k.nama_item, k.nomor_seri, k.tahun, k.denominasi, k.grade, k.jenis, k.negara,
               k.status, k.qty, k.qty_terjual, (k.qty - k.qty_terjual) as qty_tersisa,
               k.harga, k.ongkir, k.hpp, k.hpp_per_pcs, k.harga_jual, k.status_koleksi, k.foto_path, k.foto_obv, k.foto_rev,
               k.tanggal_beli, k.detail, k.catatan_internal, k.kondisi_fisik, k.lokasi_simpan,
               k.lembaga_grading, k.nomor_sertifikasi, k.grade_numerik,
               k.group_id, g.nama_group as group_nama
        FROM koleksi k
        LEFT JOIN group_item g ON k.group_id = g.id
        WHERE k.batch_id = ?
        ORDER BY k.id ASC
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

# ==============================================================================
# Cetak / Ekspor PDF Lembar Crosscheck Batch Pengadaan
# ==============================================================================

PEROLEHAN_LABELS = {
    "lelang_fb": "Lelang Facebook",
    "lelang_platform": "Lelang Platform Online",
    "jual_pribadi": "Jual Pribadi / Direct",
    "marketplace": "Marketplace / Toko",
}

JENIS_LABELS = {
    "uang_kertas": "Uang Kertas",
    "uang_polymer": "Uang Polymer",
    "uang_hybrid": "Uang Hybrid",
    "koin": "Koin",
    "dokumen": "Dokumen",
    "perlengkapan": "Perlengkapan",
}

STATUS_LABELS = {
    "pesan": "Dipesan (Pending)",
    "dikirim": "Sedang Dikirim",
    "terima": "Diterima (Selesai)",
}

def _fmt_idr(val: Any) -> str:
    try:
        n = float(val or 0)
        return f"Rp {n:,.0f}".replace(",", ".")
    except Exception:
        return "Rp 0"

def _fmt_date_id(d_str: Optional[str]) -> str:
    if not d_str:
        return "-"
    try:
        clean = d_str.replace("T", " ").split(".")[0].strip()
        dt = datetime.fromisoformat(clean)
        months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
        return f"{dt.day:02d} {months[dt.month - 1]} {dt.year}"
    except Exception:
        return str(d_str)[:10]

@router.get("/{batch_id}/print-crosscheck", response_class=HTMLResponse)
def print_batch_crosscheck_html(
    batch_id: int,
    cols: Optional[str] = Query(None, description="Kolom yang dipilih dipisahkan koma"),
    orientation: str = Query("landscape", description="Orientasi halaman (landscape / portrait)"),
    show_summary: int = Query(1, description="Tampilkan ringkasan keuangan"),
    show_signature: int = Query(1, description="Tampilkan form tanda tangan & verifikasi"),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Menghasilkan lembar siap cetak / ekspor ke PDF untuk crosscheck verifikasi fisik item batch."""
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch pembelian tidak ditemukan")

    b_data = dict(batch)

    cursor.execute(
        """
        SELECT k.id, k.kode_item, k.nama_item, k.nomor_seri, k.tahun, k.denominasi, k.grade, k.jenis, k.negara,
               k.status, k.qty, k.qty_terjual, (k.qty - k.qty_terjual) as qty_tersisa,
               k.harga, k.ongkir, k.hpp, k.hpp_per_pcs, k.harga_jual, k.status_koleksi, k.foto_path, k.foto_obv, k.foto_rev,
               k.tanggal_beli, k.detail, k.catatan_internal, k.kondisi_fisik, k.lokasi_simpan,
               k.lembaga_grading, k.nomor_sertifikasi, k.grade_numerik,
               k.group_id, g.nama_group as group_nama
        FROM koleksi k
        LEFT JOIN group_item g ON k.group_id = g.id
        WHERE k.batch_id = ?
        ORDER BY k.id ASC
        """,
        (batch_id,)
    )
    items = [dict(r) for r in cursor.fetchall()]

    # Definitions of all available columns
    ALL_COLS_CONFIG = {
        "checklist": {"label": "Cek", "align": "center", "width": "36px"},
        "no": {"label": "No", "align": "center", "width": "30px"},
        "foto": {"label": "Foto", "align": "center", "width": "50px"},
        "kode": {"label": "Kode Item", "align": "center", "width": "90px"},
        "nama": {"label": "Nama Item Koleksi", "align": "left", "width": "auto"},
        "group": {"label": "Group / Seri", "align": "left", "width": "95px"},
        "tahun": {"label": "Tahun", "align": "center", "width": "48px"},
        "nominal": {"label": "Nominal", "align": "center", "width": "75px"},
        "jenis": {"label": "Jenis", "align": "center", "width": "75px"},
        "grade": {"label": "Grade & Slab", "align": "center", "width": "90px"},
        "nomor_seri": {"label": "No. Seri", "align": "center", "width": "85px"},
        "qty": {"label": "Qty", "align": "center", "width": "42px"},
        "harga": {"label": "Harga Beli", "align": "right", "width": "85px"},
        "ongkir": {"label": "Alokasi Ongkir", "align": "right", "width": "80px"},
        "hpp": {"label": "Total HPP", "align": "right", "width": "85px"},
        "status": {"label": "Status", "align": "center", "width": "65px"},
        "kondisi": {"label": "Kondisi / Simpan", "align": "left", "width": "95px"},
        "catatan": {"label": "Catatan & Ruang Crosscheck", "align": "left", "width": "120px"},
    }

    if cols:
        requested = [c.strip().lower() for c in cols.split(",") if c.strip()]
        active_cols = [c for c in requested if c in ALL_COLS_CONFIG]
    else:
        active_cols = []

    if not active_cols:
        active_cols = ["checklist", "no", "foto", "kode", "nama", "group", "tahun", "grade", "qty", "harga", "ongkir", "hpp", "catatan"]

    is_landscape = (orientation.lower() != "portrait")
    page_orientation_css = "landscape" if is_landscape else "portrait"
    doc_max_width = "1120px" if is_landscape else "820px"

    # Aggregates
    total_qty = sum(int(it.get("qty") or 1) for it in items)
    total_harga = sum(float(it.get("harga") or 0) for it in items)
    total_ongkir = float(b_data.get("total_ongkir") or 0)
    total_hpp = total_harga + total_ongkir
    total_items = len(items)

    batch_kode = html.escape(b_data.get("kode_batch") or f"BATCH-{batch_id}")
    batch_nama = html.escape(b_data.get("nama_batch") or "Batch Pengadaan")
    supplier_nama = html.escape(b_data.get("supplier_nama") or "-")
    supplier_no_hp = html.escape(b_data.get("supplier_no_hp") or "")
    perolehan_text = html.escape(PEROLEHAN_LABELS.get(b_data.get("perolehan"), b_data.get("perolehan") or "-"))
    status_text = html.escape(STATUS_LABELS.get(b_data.get("status"), b_data.get("status") or "-"))
    tanggal_beli_text = _fmt_date_id(b_data.get("tanggal_beli"))
    print_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M WIB")

    # Generate Table Header
    th_cells = []
    for c in active_cols:
        cfg = ALL_COLS_CONFIG[c]
        width_attr = f" style='width:{cfg['width']}; text-align:{cfg['align']};'"
        th_cells.append(f"<th{width_attr}>{html.escape(cfg['label'])}</th>")
    thead_html = f"<tr>{''.join(th_cells)}</tr>"

    # Generate Table Body
    tr_rows = []
    for idx, it in enumerate(items):
        td_cells = []
        for c in active_cols:
            cfg = ALL_COLS_CONFIG[c]
            align = cfg["align"]
            style = f"text-align:{align};"

            if c == "checklist":
                td_cells.append(f"<td style='{style}'><div class='chk-box'></div></td>")
            elif c == "no":
                td_cells.append(f"<td style='{style} font-weight:600; color:#555;'>{idx + 1}</td>")
            elif c == "foto":
                f_url = it.get("foto_obv") or it.get("foto_path") or ""
                if f_url:
                    td_cells.append(f"<td style='{style}'><img src='{html.escape(f_url)}' class='thumb-img' alt='Foto' onerror=\"this.style.display='none'\"></td>")
                else:
                    td_cells.append(f"<td style='{style}'><span class='no-photo'>-</span></td>")
            elif c == "kode":
                td_cells.append(f"<td style='{style}'><span class='mono-code'>{html.escape(it.get('kode_item') or '-')}</span></td>")
            elif c == "nama":
                sub_denom = f"<div class='sub-info'>Denom: {html.escape(it.get('denominasi'))}</div>" if it.get("denominasi") and "nominal" not in active_cols else ""
                td_cells.append(f"<td style='{style}'><strong>{html.escape(it.get('nama_item') or '-')}</strong>{sub_denom}</td>")
            elif c == "group":
                td_cells.append(f"<td style='{style}'>{html.escape(it.get('group_nama') or '-')}</td>")
            elif c == "tahun":
                td_cells.append(f"<td style='{style}'>{html.escape(it.get('tahun') or '-')}</td>")
            elif c == "nominal":
                td_cells.append(f"<td style='{style}'>{html.escape(it.get('denominasi') or '-')}</td>")
            elif c == "jenis":
                j_txt = JENIS_LABELS.get(it.get("jenis"), it.get("jenis") or "-")
                td_cells.append(f"<td style='{style}'>{html.escape(j_txt)}</td>")
            elif c == "grade":
                gr = html.escape(it.get("grade") or "-")
                lembaga = it.get("lembaga_grading")
                if lembaga and lembaga != "-":
                    gr_num = html.escape(it.get("grade_numerik") or "")
                    slab_html = f"<div class='slab-info'>{html.escape(lembaga)} {gr_num}</div>"
                else:
                    slab_html = ""
                td_cells.append(f"<td style='{style}'><span class='grade-badge'>{gr}</span>{slab_html}</td>")
            elif c == "nomor_seri":
                td_cells.append(f"<td style='{style}'><span class='mono-code'>{html.escape(it.get('nomor_seri') or '-')}</span></td>")
            elif c == "qty":
                td_cells.append(f"<td style='{style}'><strong>{it.get('qty', 1)}</strong></td>")
            elif c == "harga":
                td_cells.append(f"<td style='{style}'>{_fmt_idr(it.get('harga', 0))}</td>")
            elif c == "ongkir":
                td_cells.append(f"<td style='{style}'>{_fmt_idr(it.get('ongkir', 0))}</td>")
            elif c == "hpp":
                sub_unit = f"<div class='sub-info'>@{_fmt_idr(it.get('hpp_per_pcs', 0))}/pcs</div>" if (it.get("qty", 1) > 1) else ""
                td_cells.append(f"<td style='{style} font-weight:600;'>{_fmt_idr(it.get('hpp', 0))}{sub_unit}</td>")
            elif c == "status":
                st_label = STATUS_LABELS.get(it.get("status"), it.get("status") or "-")
                td_cells.append(f"<td style='{style}'><span class='status-pill'>{html.escape(st_label)}</span></td>")
            elif c == "kondisi":
                kond = html.escape(it.get("kondisi_fisik") or it.get("lokasi_simpan") or "-")
                td_cells.append(f"<td style='{style}'>{kond}</td>")
            elif c == "catatan":
                cat = html.escape(it.get("catatan_internal") or it.get("detail") or "")
                cat_block = f"<div class='note-text'>{cat}</div>" if cat else ""
                td_cells.append(f"<td style='{style}'>{cat_block}<div class='check-blank-line'></div></td>")

        tr_rows.append(f"<tr>{''.join(td_cells)}</tr>")

    tbody_html = "".join(tr_rows)

    # Generate Table Footer
    tfoot_cells = []
    has_total_label = False
    for c in active_cols:
        cfg = ALL_COLS_CONFIG[c]
        align = cfg["align"]
        style = f"text-align:{align}; font-weight:700;"

        if not has_total_label and c in ["no", "checklist", "kode", "nama"]:
            tfoot_cells.append(f"<td style='{style}'>TOTAL</td>")
            has_total_label = True
        elif c == "qty":
            tfoot_cells.append(f"<td style='{style}'>{total_qty} pcs</td>")
        elif c == "harga":
            tfoot_cells.append(f"<td style='{style}'>{_fmt_idr(total_harga)}</td>")
        elif c == "ongkir":
            tfoot_cells.append(f"<td style='{style}'>{_fmt_idr(total_ongkir)}</td>")
        elif c == "hpp":
            tfoot_cells.append(f"<td style='{style} color:#7a5a04;'>{_fmt_idr(total_hpp)}</td>")
        else:
            tfoot_cells.append("<td></td>")
    tfoot_html = f"<tr>{''.join(tfoot_cells)}</tr>"

    summary_html = ""
    if show_summary:
        summary_html = f"""
        <div class="batch-summary-grid">
          <div class="summary-col">
            <div class="summary-item"><span class="s-label">Kode Batch:</span> <strong class="s-val mono">{batch_kode}</strong></div>
            <div class="summary-item"><span class="s-label">Nama Batch:</span> <strong class="s-val">{batch_nama}</strong></div>
            <div class="summary-item"><span class="s-label">Supplier / Sumber:</span> <span class="s-val">{supplier_nama} {f'({supplier_no_hp})' if supplier_no_hp else ''}</span></div>
          </div>
          <div class="summary-col">
            <div class="summary-item"><span class="s-label">Metode Perolehan:</span> <span class="s-val">{perolehan_text}</span></div>
            <div class="summary-item"><span class="s-label">Status Batch:</span> <span class="s-val">{status_text}</span></div>
            <div class="summary-item"><span class="s-label">Tanggal Beli:</span> <span class="s-val">{tanggal_beli_text}</span></div>
          </div>
          <div class="summary-col summary-col-finance">
            <div class="summary-item"><span class="s-label">Total Item / Qty:</span> <strong class="s-val">{total_items} item ({total_qty} pcs)</strong></div>
            <div class="summary-item"><span class="s-label">Total Harga Beli:</span> <span class="s-val">{_fmt_idr(total_harga)}</span></div>
            <div class="summary-item"><span class="s-label">Total Ongkir Lot:</span> <span class="s-val">{_fmt_idr(total_ongkir)}</span></div>
            <div class="summary-item highlight"><span class="s-label">Total HPP Lot:</span> <strong class="s-val gold">{_fmt_idr(total_hpp)}</strong></div>
          </div>
        </div>
        """

    verif_html = ""
    if show_signature:
        verif_html = f"""
        <div class="verif-container">
          <div class="verif-box verif-status">
            <div class="verif-title">Status Pemeriksaan Fisik:</div>
            <div class="verif-row"><span class="chk-box-sm"></span> Barang Diterima Lengkap & Sesuai Deskripsi</div>
            <div class="verif-row"><span class="chk-box-sm"></span> Terdapat Cacat / Kerusakan Tidak Sesuai</div>
            <div class="verif-row"><span class="chk-box-sm"></span> Selisih Jumlah Keping / Lembar (Qty)</div>
            <div class="verif-row"><span class="chk-box-sm"></span> Ajukan Retur / Komplain ke Penjual</div>
          </div>
          <div class="verif-box verif-notes">
            <div class="verif-title">Catatan Hasil Pemeriksaan / Crosscheck:</div>
            <div class="blank-write-line"></div>
            <div class="blank-write-line"></div>
            <div class="blank-write-line"></div>
          </div>
          <div class="verif-box verif-sign">
            <div class="verif-title">Pemeriksa / Verifikator:</div>
            <div class="sign-space"></div>
            <div class="sign-line">( ________________________________ )</div>
            <div class="sign-date">Tgl Crosscheck: _____ / _____ / 20___</div>
          </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Crosscheck Batch - {batch_kode}</title>
<style>
  @page {{
    size: A4 {page_orientation_css};
    margin: 8mm 8mm 8mm 8mm;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1a1a1a;
    background: #eef1f5;
    font-size: 11px;
    line-height: 1.35;
  }}
  .no-print-bar {{
    background: #11141c;
    color: #f0ede6;
    padding: 10px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 1000;
    border-bottom: 2px solid #d4af37;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }}
  .no-print-bar .title-group {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .no-print-bar h1 {{
    font-size: 14px;
    font-weight: 700;
    color: #f0c840;
    margin: 0;
  }}
  .no-print-bar .hint {{
    font-size: 11.5px;
    color: #a0aec0;
  }}
  .no-print-bar .actions {{
    display: flex;
    gap: 8px;
    align-items: center;
  }}
  .btn-print {{
    background: linear-gradient(135deg, #d4af37 0%, #b89628 100%);
    color: #0b0c10;
    font-weight: 700;
    border: none;
    border-radius: 6px;
    padding: 7px 16px;
    font-size: 12.5px;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(212,175,55,0.4);
    display: flex;
    align-items: center;
    gap: 6px;
  }}
  .btn-print:hover {{
    filter: brightness(1.1);
  }}
  .btn-close {{
    background: #2a2f42;
    color: #e2e8f0;
    border: 1px solid #4a5568;
    border-radius: 6px;
    padding: 7px 14px;
    font-size: 12px;
    cursor: pointer;
  }}
  .btn-close:hover {{
    background: #374151;
  }}
  .page-container {{
    max-width: {doc_max_width};
    margin: 20px auto;
    padding: 24px;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    border-radius: 8px;
  }}
  .doc-header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 2px solid #2d3748;
    margin-bottom: 12px;
  }}
  .doc-header .logo-area {{
    display: flex;
    align-items: center;
    gap: 10px;
  }}
  .doc-header .logo-badge {{
    width: 38px;
    height: 38px;
    background: #0f131a;
    border: 2px solid #d4af37;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #d4af37;
  }}
  .doc-header .app-title {{
    font-size: 14px;
    font-weight: 800;
    color: #0f131a;
    letter-spacing: 0.5px;
  }}
  .doc-header .app-sub {{
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }}
  .doc-header .doc-title-group {{
    text-align: right;
  }}
  .doc-header .doc-title {{
    font-size: 16px;
    font-weight: 800;
    color: #0f131a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  .doc-header .doc-subtitle {{
    font-size: 10.5px;
    color: #475569;
    margin-top: 2px;
  }}
  .doc-header .print-meta {{
    font-size: 9.5px;
    color: #64748b;
    margin-top: 3px;
    font-family: monospace;
  }}
  .batch-summary-grid {{
    display: grid;
    grid-template-columns: 1.1fr 1fr 1.1fr;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 10.5px;
  }}
  .summary-col {{
    display: flex;
    flex-direction: column;
    gap: 3px;
  }}
  .summary-col-finance {{
    border-left: 1px dashed #cbd5e1;
    padding-left: 12px;
  }}
  .summary-item {{
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }}
  .summary-item.highlight {{
    margin-top: 3px;
    padding-top: 3px;
    border-top: 1px solid #cbd5e1;
  }}
  .s-label {{
    color: #475569;
  }}
  .s-val {{
    color: #0f172a;
    text-align: right;
  }}
  .s-val.mono {{
    font-family: monospace;
    font-weight: 700;
  }}
  .s-val.gold {{
    color: #854d0e;
    font-size: 11.5px;
  }}
  table.crosscheck-table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 10px;
  }}
  table.crosscheck-table th, table.crosscheck-table td {{
    border: 1px solid #475569;
    padding: 5px 6px;
    vertical-align: middle;
  }}
  table.crosscheck-table th {{
    background: #e2e8f0;
    color: #0f172a;
    font-weight: 700;
    font-size: 10px;
  }}
  table.crosscheck-table tbody tr:nth-child(even) {{
    background: #f8fafc;
  }}
  table.crosscheck-table tfoot td {{
    background: #e2e8f0;
    font-weight: 700;
    border-top: 2px solid #1e293b;
    border-bottom: 2px solid #1e293b;
  }}
  .chk-box {{
    width: 17px;
    height: 17px;
    border: 1.8px solid #0f172a;
    border-radius: 3px;
    background: #ffffff;
    margin: 0 auto;
  }}
  .thumb-img {{
    width: 44px;
    height: 38px;
    object-fit: contain;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    background: #fff;
    display: block;
    margin: 0 auto;
  }}
  .no-photo {{
    color: #94a3b8;
    font-size: 11px;
  }}
  .mono-code {{
    font-family: monospace;
    font-size: 9.5px;
    font-weight: 600;
    color: #1e293b;
  }}
  .sub-info {{
    font-size: 8.5px;
    color: #64748b;
    margin-top: 1px;
  }}
  .grade-badge {{
    display: inline-block;
    padding: 1px 4px;
    border: 1px solid #94a3b8;
    border-radius: 3px;
    font-weight: 700;
    font-size: 9px;
    background: #f1f5f9;
  }}
  .slab-info {{
    font-size: 8px;
    color: #475569;
    font-weight: 600;
    margin-top: 1px;
  }}
  .status-pill {{
    display: inline-block;
    padding: 1px 4px;
    font-size: 8.5px;
    border-radius: 3px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
  }}
  .note-text {{
    font-size: 9px;
    color: #334155;
    line-height: 1.25;
    margin-bottom: 3px;
  }}
  .check-blank-line {{
    border-bottom: 1px dotted #94a3b8;
    height: 10px;
    margin-top: 2px;
  }}
  .verif-container {{
    display: grid;
    grid-template-columns: 1.2fr 1.3fr 1fr;
    gap: 12px;
    border: 1px solid #94a3b8;
    border-radius: 6px;
    padding: 10px 14px;
    background: #f8fafc;
    page-break-inside: avoid;
    font-size: 10px;
  }}
  .verif-title {{
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 6px;
    font-size: 10.5px;
  }}
  .verif-row {{
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 5px;
    color: #334155;
  }}
  .chk-box-sm {{
    width: 13px;
    height: 13px;
    border: 1.5px solid #0f172a;
    border-radius: 2px;
    background: #ffffff;
    display: inline-block;
    flex-shrink: 0;
  }}
  .blank-write-line {{
    border-bottom: 1px dotted #64748b;
    height: 16px;
    margin-bottom: 4px;
  }}
  .verif-sign {{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .sign-space {{
    height: 38px;
  }}
  .sign-line {{
    font-weight: 600;
    color: #0f172a;
    text-align: center;
  }}
  .sign-date {{
    font-size: 9.5px;
    color: #475569;
    text-align: center;
    margin-top: 3px;
  }}
  @media print {{
    .no-print-bar {{
      display: none !important;
    }}
    body {{
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
    }}
    .page-container {{
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }}
    table.crosscheck-table {{
      page-break-inside: auto;
    }}
    table.crosscheck-table tr {{
      page-break-inside: avoid;
      page-break-after: auto;
    }}
    table.crosscheck-table thead {{
      display: table-header-group;
    }}
    table.crosscheck-table tfoot {{
      display: table-footer-group;
    }}
    .verif-container {{
      page-break-inside: avoid;
    }}
  }}
</style>
</head>
<body>

<div class="no-print-bar">
  <div class="title-group">
    <div style="font-size:18px;">📄</div>
    <div>
      <h1>Pratinjau Lembar Crosscheck Batch #{batch_id}</h1>
      <div class="hint">Orientasi: <strong>{page_orientation_css.capitalize()}</strong> • Kolom Terpilih: <strong>{len(active_cols)} Kolom</strong> • Item: <strong>{total_items}</strong></div>
    </div>
  </div>
  <div class="actions">
    <button class="btn-print" onclick="window.print()">
      <span>🖨️ Cetak / Simpan PDF (Ctrl+P)</span>
    </button>
    <button class="btn-close" onclick="window.close()">✕ Tutup</button>
  </div>
</div>

<div class="page-container">
  <div class="doc-header">
    <div class="logo-area">
      <div class="logo-badge">🪙</div>
      <div>
        <div class="app-title">NUMISMANAGER</div>
        <div class="app-sub">Sistem Manajemen Koleksi &amp; Portofolio Numismatik</div>
      </div>
    </div>
    <div class="doc-title-group">
      <div class="doc-title">Lembar Crosscheck Pembelian Batch</div>
      <div class="doc-subtitle">Verifikasi Fisik &amp; Rekapitulasi Alokasi Modal Lot</div>
      <div class="print-meta">Dicetak: {print_timestamp}</div>
    </div>
  </div>

  {summary_html}

  <table class="crosscheck-table">
    <thead>
      {thead_html}
    </thead>
    <tbody>
      {tbody_html}
    </tbody>
    <tfoot>
      {tfoot_html}
    </tfoot>
  </table>

  {verif_html}
</div>

</body>
</html>
"""
    return HTMLResponse(content=html_content)

