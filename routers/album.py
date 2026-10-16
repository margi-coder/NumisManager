from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3

from database.db import get_db
from database.models import AlbumCreate, AlbumUpdate, AlbumItemAdd, AlbumItemMove, AlbumItemBulkAdd, AlbumLembarUpdate, AlbumLembarCreate
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/album", tags=["Album Digital"])

@router.get("/")
def list_albums(
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("""
        SELECT 
            a.*,
            COUNT(ai.id) as item_count,
            COALESCE(MAX(ai.lembar_ke), (SELECT MAX(lembar_ke) FROM album_lembar WHERE album_id = a.id), 1) as max_lembar,
            u.full_name as author_name
        FROM album a
        LEFT JOIN album_item ai ON a.id = ai.album_id
        LEFT JOIN users u ON a.created_by = u.id
        GROUP BY a.id
        ORDER BY a.created_at DESC
    """)
    rows = cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        total_lembar = max(1, d.get("max_lembar") or 1)
        d["total_lembar"] = total_lembar
        d["total_halaman"] = total_lembar * 2
        result.append(d)
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_album(
    payload: AlbumCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO album (nama_album, deskripsi, slot_per_halaman, tema_warna, catatan, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        payload.nama_album.strip(),
        payload.deskripsi,
        payload.slot_per_halaman or 3,
        payload.tema_warna or "dark_burgundy",
        payload.catatan,
        current_user["id"]
    ))
    db.commit()
    new_id = cursor.lastrowid
    
    # Initialize sheet 1 & sheet 2 with the default slot count
    init_slots = payload.slot_per_halaman or 3
    cursor.execute("INSERT INTO album_lembar (album_id, lembar_ke, slot_count) VALUES (?, 1, ?)", (new_id, init_slots))
    cursor.execute("INSERT INTO album_lembar (album_id, lembar_ke, slot_count) VALUES (?, 2, ?)", (new_id, init_slots))
    db.commit()

    cursor.execute("SELECT * FROM album WHERE id = ?", (new_id,))
    album = dict(cursor.fetchone())
    album["item_count"] = 0
    album["total_lembar"] = 2
    album["total_halaman"] = 4
    return album


@router.get("/{album_id}")
def get_album(
    album_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("""
        SELECT a.*, u.full_name as author_name
        FROM album a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.id = ?
    """, (album_id,))
    album_row = cursor.fetchone()
    if not album_row:
        raise HTTPException(status_code=404, detail="Album tidak ditemukan")
    
    album_data = dict(album_row)
    default_slots = album_data.get("slot_per_halaman") or 3

    # 1. Fetch custom sheet configurations from album_lembar
    cursor.execute("""
        SELECT lembar_ke, slot_count, catatan_lembar
        FROM album_lembar
        WHERE album_id = ?
        ORDER BY lembar_ke ASC
    """, (album_id,))
    lembar_configs = {r["lembar_ke"]: dict(r) for r in cursor.fetchall()}

    # 2. Fetch all placed items in this album
    cursor.execute("""
        SELECT 
            ai.id as album_item_id,
            ai.album_id,
            COALESCE(ai.lembar_ke, MAX(1, CAST((ai.halaman + 1)/2 AS INTEGER))) as lembar_ke,
            ai.halaman,
            ai.slot_index,
            ai.keterangan_slot,
            ai.created_at as slot_created_at,
            k.id as koleksi_id,
            k.kode_item,
            k.nama_item,
            k.nomor_seri,
            k.tahun,
            k.denominasi,
            k.cetakan,
            k.grade,
            k.jenis,
            k.negara,
            k.bahan,
            k.warna_dominan,
            k.dimensi,
            k.kondisi_fisik,
            k.lokasi_simpan,
            k.detail,
            k.catatan_internal,
            k.foto_path,
            k.foto_obv,
            k.foto_rev,
            k.harga,
            k.ongkir,
            k.hpp,
            k.hpp_per_pcs,
            k.harga_jual,
            k.status_koleksi,
            k.status,
            k.qty,
            k.qty_terjual,
            (k.qty - k.qty_terjual) as qty_tersisa,
            s.nama as supplier_nama,
            b.kode_batch
        FROM album_item ai
        JOIN koleksi k ON ai.koleksi_id = k.id
        LEFT JOIN supplier s ON k.supplier_id = s.id
        LEFT JOIN batch_pembelian b ON k.batch_id = b.id
        WHERE ai.album_id = ?
        ORDER BY ai.lembar_ke ASC, ai.slot_index ASC
    """, (album_id,))
    items = [dict(r) for r in cursor.fetchall()]

    # 3. Determine max sheet
    max_lembar = 2
    if lembar_configs:
        max_lembar = max(max_lembar, max(lembar_configs.keys()))
    if items:
        max_lembar = max(max_lembar, max(it["lembar_ke"] for it in items))

    # 4. Assemble sheets (lembaran)
    lembaran = []
    for lk in range(1, max_lembar + 1):
        sheet_conf = lembar_configs.get(lk, {})
        slot_count = sheet_conf.get("slot_count") or default_slots
        catatan_lembar = sheet_conf.get("catatan_lembar") or ""
        
        sheet_items = [it for it in items if it["lembar_ke"] == lk]
        
        lembaran.append({
            "lembar_ke": lk,
            "slot_count": slot_count,
            "catatan_lembar": catatan_lembar,
            "hal_depan": (lk * 2) - 1,
            "hal_belakang": lk * 2,
            "items": sheet_items
        })

    album_data["item_count"] = len(items)
    album_data["total_lembar"] = max_lembar
    album_data["total_halaman"] = max_lembar * 2

    return {
        "album": album_data,
        "lembaran": lembaran,
        "items": items,
        "total_lembar": max_lembar,
        "total_halaman": max_lembar * 2
    }


@router.put("/{album_id}")
def update_album(
    album_id: int,
    payload: AlbumUpdate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM album WHERE id = ?", (album_id,))
    existing = cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Album tidak ditemukan")
    
    current = dict(existing)
    nama = payload.nama_album.strip() if payload.nama_album is not None else current["nama_album"]
    deskripsi = payload.deskripsi if payload.deskripsi is not None else current["deskripsi"]
    slot_per_halaman = payload.slot_per_halaman if payload.slot_per_halaman is not None else current["slot_per_halaman"]
    tema = payload.tema_warna if payload.tema_warna is not None else current["tema_warna"]
    catatan = payload.catatan if payload.catatan is not None else current["catatan"]

    cursor.execute("""
        UPDATE album
        SET nama_album = ?, deskripsi = ?, slot_per_halaman = ?, tema_warna = ?, catatan = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
    """, (nama, deskripsi, slot_per_halaman, tema, catatan, album_id))
    db.commit()

    return {"message": "Album berhasil diperbarui", "id": album_id}


@router.delete("/{album_id}")
def delete_album(
    album_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM album WHERE id = ?", (album_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Album tidak ditemukan")
    
    cursor.execute("DELETE FROM album_item WHERE album_id = ?", (album_id,))
    cursor.execute("DELETE FROM album_lembar WHERE album_id = ?", (album_id,))
    cursor.execute("DELETE FROM album WHERE id = ?", (album_id,))
    db.commit()
    return {"message": "Album berhasil dihapus"}


# --- SHEET (LEMBAR) MANAGEMENT ---

@router.put("/{album_id}/lembar/{lembar_ke}")
def update_sheet_config(
    album_id: int,
    lembar_ke: int,
    payload: AlbumLembarUpdate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM album WHERE id = ?", (album_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Album tidak ditemukan")

    cursor.execute("""
        INSERT INTO album_lembar (album_id, lembar_ke, slot_count, catatan_lembar)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(album_id, lembar_ke)
        DO UPDATE SET slot_count = excluded.slot_count, catatan_lembar = excluded.catatan_lembar
    """, (album_id, lembar_ke, payload.slot_count, payload.catatan_lembar))
    db.commit()

    return {
        "message": f"Konfigurasi Lembar ke-{lembar_ke} berhasil diperbarui menjadi {payload.slot_count} slot",
        "lembar_ke": lembar_ke,
        "slot_count": payload.slot_count
    }


@router.post("/{album_id}/lembar")
def add_new_sheet(
    album_id: int,
    payload: AlbumLembarCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("SELECT slot_per_halaman FROM album WHERE id = ?", (album_id,))
    album_row = cursor.fetchone()
    if not album_row:
        raise HTTPException(status_code=404, detail="Album tidak ditemukan")

    # Find highest sheet number
    cursor.execute("""
        SELECT MAX(m) FROM (
            SELECT MAX(lembar_ke) as m FROM album_lembar WHERE album_id = ?
            UNION ALL
            SELECT MAX(lembar_ke) as m FROM album_item WHERE album_id = ?
        )
    """, (album_id, album_id))
    max_row = cursor.fetchone()
    next_lembar = (max_row[0] or 0) + 1

    slot_count = payload.slot_count or album_row["slot_per_halaman"] or 3
    cursor.execute("""
        INSERT INTO album_lembar (album_id, lembar_ke, slot_count, catatan_lembar)
        VALUES (?, ?, ?, ?)
    """, (album_id, next_lembar, slot_count, payload.catatan_lembar))
    db.commit()

    return {
        "message": f"Lembar ke-{next_lembar} berhasil ditambahkan",
        "lembar_ke": next_lembar,
        "slot_count": slot_count
    }


@router.delete("/{album_id}/lembar/{lembar_ke}")
def delete_sheet(
    album_id: int,
    lembar_ke: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM album_item WHERE album_id = ? AND lembar_ke = ?", (album_id, lembar_ke))
    cursor.execute("DELETE FROM album_lembar WHERE album_id = ? AND lembar_ke = ?", (album_id, lembar_ke))
    db.commit()
    return {"message": f"Lembar ke-{lembar_ke} berhasil dihapus"}


# --- ITEM SLOT MANAGEMENT ---

@router.post("/{album_id}/items")
def add_or_update_slot(
    album_id: int,
    payload: AlbumItemAdd,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM album WHERE id = ?", (album_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Album tidak ditemukan")
    
    cursor.execute("SELECT id, nama_item FROM koleksi WHERE id = ?", (payload.koleksi_id,))
    koleksi = cursor.fetchone()
    if not koleksi:
        raise HTTPException(status_code=404, detail="Item koleksi tidak ditemukan")

    # Determine lembar_ke
    lembar_ke = payload.lembar_ke
    if not lembar_ke:
        lembar_ke = max(1, (payload.halaman + 1) // 2) if payload.halaman else 1

    front_page = (lembar_ke * 2) - 1

    # Check existing occupant in this sheet & slot
    cursor.execute("""
        SELECT id FROM album_item 
        WHERE album_id = ? AND lembar_ke = ? AND slot_index = ?
    """, (album_id, lembar_ke, payload.slot_index))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE album_item
            SET koleksi_id = ?, keterangan_slot = ?, halaman = ?
            WHERE id = ?
        """, (payload.koleksi_id, payload.keterangan_slot, front_page, existing["id"]))
    else:
        cursor.execute("""
            INSERT INTO album_item (album_id, koleksi_id, lembar_ke, halaman, slot_index, keterangan_slot)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (album_id, payload.koleksi_id, lembar_ke, front_page, payload.slot_index, payload.keterangan_slot))
    
    db.commit()

    return {
        "message": f"Item '{koleksi['nama_item']}' berhasil dipasang pada Lembar {lembar_ke} Slot {payload.slot_index}",
        "album_id": album_id,
        "lembar_ke": lembar_ke,
        "hal_depan": front_page,
        "hal_belakang": front_page + 1,
        "slot_index": payload.slot_index
    }


@router.delete("/{album_id}/items/{album_item_id}")
def remove_item_from_slot(
    album_id: int,
    album_item_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM album_item WHERE id = ? AND album_id = ?", (album_item_id, album_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Slot item tidak ditemukan")
    
    cursor.execute("DELETE FROM album_item WHERE id = ? AND album_id = ?", (album_item_id, album_id))
    db.commit()
    return {"message": "Item berhasil dikeluarkan dari slot album"}
