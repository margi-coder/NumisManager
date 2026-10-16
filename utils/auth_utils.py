from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import sqlite3
from database.db import get_db_connection

SECRET_KEY = "numismatik-secret-2024-XxYyZz"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain: str, hashed: str) -> bool:
    """Verifikasi kecocokan password teks biasa dengan hash tersimpan."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        try:
            return pwd_context.verify(plain, hashed)
        except Exception:
            return False

def get_password_hash(password: str) -> str:
    """Menghasilkan hash bcrypt untuk password baru."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Membuat token JWT dengan masa kedaluwarsa."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Mengambil informasi pengguna aktif berdasarkan token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autentikasi gagal atau sesi telah berakhir",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, username, email, full_name, role, is_active, created_at, updated_at
            FROM users WHERE username = ?
            """,
            (username,)
        )
        user = cursor.fetchone()
        if user is None:
            raise credentials_exception
        user_dict = dict(user)
        if not user_dict.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun pengguna telah dinonaktifkan"
            )
        return user_dict
    finally:
        conn.close()

def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Dependency untuk memverifikasi hak akses administrator."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya admin yang diizinkan melakukan tindakan ini"
        )
    return current_user
