import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "numismatik.db"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    from database.models import CREATE_TABLES_SQL
    from utils.auth_utils import get_password_hash

    conn = get_db_connection()
    try:
        for sql in CREATE_TABLES_SQL:
            conn.execute(sql)
        conn.commit()

        # Run column migrations for koleksi if needed
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(koleksi)")
        existing_cols = [row["name"] for row in cursor.fetchall()]

        if "kode_item" not in existing_cols:
            cursor.execute("ALTER TABLE koleksi ADD COLUMN kode_item TEXT")
            print("Migration: Added column kode_item to koleksi")
        if "foto_obv" not in existing_cols:
            cursor.execute("ALTER TABLE koleksi ADD COLUMN foto_obv TEXT")
            print("Migration: Added column foto_obv to koleksi")
        if "foto_rev" not in existing_cols:
            cursor.execute("ALTER TABLE koleksi ADD COLUMN foto_rev TEXT")
            print("Migration: Added column foto_rev to koleksi")
        conn.commit()

        # Backfill existing koleksi without kode_item
        cursor.execute("SELECT id, tanggal_beli, foto_path, foto_obv FROM koleksi WHERE kode_item IS NULL OR kode_item = ''")
        null_items = cursor.fetchall()
        for idx, row in enumerate(null_items, start=1):
            tgl = (row["tanggal_beli"] or "2026-10-14").replace("-", "")[:8]
            gen_kode = f"ITM-{tgl}-{idx:03d}"
            obv_val = row["foto_obv"] or row["foto_path"]
            cursor.execute(
                "UPDATE koleksi SET kode_item = ?, foto_obv = COALESCE(foto_obv, ?) WHERE id = ?",
                (gen_kode, obv_val, row["id"])
            )
        if null_items:
            conn.commit()
            print(f"Migration: Backfilled kode_item for {len(null_items)} items")

        # Run migration for album_item (lembar_ke)
        cursor.execute("PRAGMA table_info(album_item)")
        ai_cols = [row["name"] for row in cursor.fetchall()]
        if "lembar_ke" not in ai_cols:
            cursor.execute("ALTER TABLE album_item ADD COLUMN lembar_ke INTEGER DEFAULT 1")
            cursor.execute("UPDATE album_item SET lembar_ke = MAX(1, CAST((halaman + 1)/2 AS INTEGER))")
            conn.commit()
            print("Migration: Added column lembar_ke to album_item")

        try:
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_album_item_lembar_slot ON album_item(album_id, lembar_ke, slot_index)")
            conn.commit()
        except Exception:
            pass

        # Cek ketersediaan akun admin default
        cursor.execute("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
        admin = cursor.fetchone()
        if not admin:
            admin_pwd = get_password_hash("admin123")
            cursor.execute(
                """
                INSERT INTO users (username, email, full_name, hashed_password, role, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
                """,
                ("admin", "admin@numismanager.local", "Administrator", admin_pwd, "admin")
            )
            conn.commit()
            print("Default admin created: admin / admin123")
        print(f"Database initialized at {DB_PATH}")
    finally:
        conn.close()
