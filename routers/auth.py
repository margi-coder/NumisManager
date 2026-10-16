from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from database.db import get_db
from database.models import UserCreate, UserUpdate, LoginRequest, UserResponse
from utils.auth_utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_admin
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])

@router.post("/login")
def login(payload: LoginRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Otentikasi pengguna dan mengembalikan token JWT."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, username, email, full_name, hashed_password, role, is_active, created_at, updated_at
        FROM users WHERE username = ?
        """,
        (payload.username,)
    )
    user = cursor.fetchone()
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah"
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun pengguna telah dinonaktifkan. Hubungi administrator."
        )

    token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    user_dict = dict(user)
    user_dict.pop("hashed_password", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.post("/register", response_model=UserResponse)
def register_user(
    payload: UserCreate,
    current_user: Dict[str, Any] = Depends(require_admin),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Mendaftarkan pengguna baru (Khusus Admin)."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (payload.username,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username sudah terdaftar"
        )

    hashed_pw = get_password_hash(payload.password)
    role = payload.role if payload.role in ["admin", "user"] else "user"

    cursor.execute(
        """
        INSERT INTO users (username, email, full_name, hashed_password, role, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        """,
        (payload.username, payload.email, payload.full_name, hashed_pw, role)
    )
    conn.commit()
    new_id = cursor.lastrowid

    cursor.execute(
        "SELECT id, username, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = ?",
        (new_id,)
    )
    created_user = cursor.fetchone()
    return dict(created_user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Mendapatkan profil pengguna saat ini."""
    return current_user

@router.get("/users", response_model=List[UserResponse])
def list_users(
    current_user: Dict[str, Any] = Depends(require_admin),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Melihat daftar seluruh pengguna (Khusus Admin)."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, username, email, full_name, role, is_active, created_at, updated_at
        FROM users ORDER BY id ASC
        """
    )
    users = cursor.fetchall()
    return [dict(u) for u in users]

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: Dict[str, Any] = Depends(require_admin),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Memperbarui informasi atau kredensial pengguna (Khusus Admin)."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    target_user = cursor.fetchone()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengguna tidak ditemukan"
        )

    updates = []
    params = []

    if payload.email is not None:
        updates.append("email = ?")
        params.append(payload.email)
    if payload.full_name is not None:
        updates.append("full_name = ?")
        params.append(payload.full_name)
    if payload.role is not None:
        updates.append("role = ?")
        params.append(payload.role)
    if payload.is_active is not None:
        updates.append("is_active = ?")
        params.append(payload.is_active)
    if payload.password:
        updates.append("hashed_password = ?")
        params.append(get_password_hash(payload.password))

    if updates:
        updates.append("updated_at = datetime('now','localtime')")
        params.append(user_id)
        sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, tuple(params))
        conn.commit()

    cursor.execute(
        "SELECT id, username, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = ?",
        (user_id,)
    )
    updated_user = cursor.fetchone()
    return dict(updated_user)

@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: int,
    current_user: Dict[str, Any] = Depends(require_admin),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Menonaktifkan pengguna (Khusus Admin)."""
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat menonaktifkan akun Anda sendiri"
        )

    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengguna tidak ditemukan"
        )

    cursor.execute(
        "UPDATE users SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?",
        (user_id,)
    )
    conn.commit()
    return {"message": "Pengguna berhasil dinonaktifkan"}
