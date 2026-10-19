from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3
from database.db import get_db
from database.models import GroupItemCreate, GroupItemUpdate, GroupItemResponse
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/group-item", tags=["Group Item Management"])

@router.get("/", response_model=List[GroupItemResponse])
def list_group_items(
    search: Optional[str] = Query(None, description="Pencarian nama group atau deskripsi"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mengambil daftar seluruh group item beserta jumlah item koleksi yang terhubung."""
    cursor = conn.cursor()
    if search:
        search_param = f"%{search.strip()}%"
        cursor.execute(
            """
            SELECT g.id, g.nama_group, g.deskripsi, g.created_by, g.created_at, g.updated_at,
                   COUNT(k.id) as item_count
            FROM group_item g
            LEFT JOIN koleksi k ON g.id = k.group_id
            WHERE g.nama_group LIKE ? OR g.deskripsi LIKE ?
            GROUP BY g.id
            ORDER BY g.nama_group ASC
            """,
            (search_param, search_param)
        )
    else:
        cursor.execute(
            """
            SELECT g.id, g.nama_group, g.deskripsi, g.created_by, g.created_at, g.updated_at,
                   COUNT(k.id) as item_count
            FROM group_item g
            LEFT JOIN koleksi k ON g.id = k.group_id
            GROUP BY g.id
            ORDER BY g.nama_group ASC
            """
        )
    groups = cursor.fetchall()
    return [dict(g) for g in groups]

@router.post("/", response_model=GroupItemResponse)
def create_group_item(
    payload: GroupItemCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menambahkan master group item baru."""
    nama = payload.nama_group.strip()
    if not nama:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama group tidak boleh kosong"
        )

    cursor = conn.cursor()
    cursor.execute("SELECT id FROM group_item WHERE LOWER(nama_group) = LOWER(?)", (nama,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Group dengan nama '{nama}' sudah ada"
        )

    cursor.execute(
        """
        INSERT INTO group_item (nama_group, deskripsi, created_by)
        VALUES (?, ?, ?)
        """,
        (nama, payload.deskripsi, current_user["id"])
    )
    conn.commit()
    new_id = cursor.lastrowid

    cursor.execute(
        """
        SELECT g.id, g.nama_group, g.deskripsi, g.created_by, g.created_at, g.updated_at, 0 as item_count
        FROM group_item g
        WHERE g.id = ?
        """,
        (new_id,)
    )
    created = cursor.fetchone()
    return dict(created)

@router.get("/{group_id}")
def get_group_item_detail(
    group_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Mendapatkan detail group item beserta daftar item koleksi di dalamnya."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT g.id, g.nama_group, g.deskripsi, g.created_by, g.created_at, g.updated_at,
               COUNT(k.id) as item_count
        FROM group_item g
        LEFT JOIN koleksi k ON g.id = k.group_id
        WHERE g.id = ?
        GROUP BY g.id
        """,
        (group_id,)
    )
    group = cursor.fetchone()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group item tidak ditemukan"
        )

    group_data = dict(group)

    cursor.execute(
        """
        SELECT id, kode_item, nama_item, nomor_seri, tahun, denominasi, grade, jenis,
               status, qty, qty_terjual, (qty - qty_terjual) as qty_tersisa,
               hpp_per_pcs, harga_jual, status_koleksi, foto_obv, foto_path
        FROM koleksi
        WHERE group_id = ?
        ORDER BY nama_item ASC
        """,
        (group_id,)
    )
    group_data["items"] = [dict(it) for it in cursor.fetchall()]
    return group_data

@router.put("/{group_id}", response_model=GroupItemResponse)
def update_group_item(
    group_id: int,
    payload: GroupItemUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Memperbarui informasi nama group atau deskripsi."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, nama_group FROM group_item WHERE id = ?", (group_id,))
    current = cursor.fetchone()
    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group item tidak ditemukan"
        )

    updates = []
    params = []

    if payload.nama_group is not None:
        new_name = payload.nama_group.strip()
        if not new_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nama group tidak boleh kosong"
            )
        # Check duplicate name on other group
        cursor.execute(
            "SELECT id FROM group_item WHERE LOWER(nama_group) = LOWER(?) AND id != ?",
            (new_name, group_id)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Group dengan nama '{new_name}' sudah ada"
            )
        updates.append("nama_group = ?")
        params.append(new_name)

    if payload.deskripsi is not None:
        updates.append("deskripsi = ?")
        params.append(payload.deskripsi)

    if updates:
        updates.append("updated_at = datetime('now','localtime')")
        params.append(group_id)
        cursor.execute(f"UPDATE group_item SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()

    cursor.execute(
        """
        SELECT g.id, g.nama_group, g.deskripsi, g.created_by, g.created_at, g.updated_at,
               COUNT(k.id) as item_count
        FROM group_item g
        LEFT JOIN koleksi k ON g.id = k.group_id
        WHERE g.id = ?
        GROUP BY g.id
        """,
        (group_id,)
    )
    updated = cursor.fetchone()
    return dict(updated)

@router.delete("/{group_id}")
def delete_group_item(
    group_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Menghapus group item jika tidak sedang digunakan oleh koleksi."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, nama_group FROM group_item WHERE id = ?", (group_id,))
    group = cursor.fetchone()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group item tidak ditemukan"
        )

    cursor.execute("SELECT COUNT(*) as cnt FROM koleksi WHERE group_id = ?", (group_id,))
    item_count = cursor.fetchone()["cnt"]

    if item_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Group Item tidak dapat dihapus karena masih digunakan oleh {item_count} item koleksi. Silakan pindahkan atau ubah group item koleksi tersebut terlebih dahulu."
        )

    cursor.execute("DELETE FROM group_item WHERE id = ?", (group_id,))
    conn.commit()
    return {"message": "Group item berhasil dihapus"}
