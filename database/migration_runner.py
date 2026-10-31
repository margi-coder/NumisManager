import sqlite3
from typing import List, Tuple, Callable
import datetime

def init_migration_table(conn: sqlite3.Connection):
    """Membuat tabel tracking migrasi skema jika belum ada."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT UNIQUE NOT NULL,
            description TEXT,
            applied_at TEXT DEFAULT (datetime('now','localtime'))
        )
        """
    )
    conn.commit()

def migration_001_baseline(conn: sqlite3.Connection):
    """Pencatatan baseline skema v1.0."""
    pass  # Baseline skema telah dibuat oleh init_db dasar

def migration_002_add_certification_and_photos(conn: sqlite3.Connection):
    """Menambahkan kolom sertifikasi grading (PMG/PCGS/NGC) dan tabel galeri foto."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(koleksi)")
    cols = [row["name"] for row in cursor.fetchall()]

    new_columns = [
        ("lembaga_grading", "TEXT DEFAULT '-'"),
        ("nomor_sertifikasi", "TEXT"),
        ("grade_numerik", "TEXT"),
        ("grading_url", "TEXT"),
        ("foto_detail", "TEXT")
    ]

    for col_name, col_type in new_columns:
        if col_name not in cols:
            cursor.execute(f"ALTER TABLE koleksi ADD COLUMN {col_name} {col_type}")

    # Buat tabel koleksi_foto untuk multi-image gallery
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS koleksi_foto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            koleksi_id INTEGER NOT NULL REFERENCES koleksi(id) ON DELETE CASCADE,
            label TEXT DEFAULT 'detail',
            foto_path TEXT NOT NULL,
            catatan TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
        """
    )
    conn.commit()

def migration_003_add_group_item(conn: sqlite3.Connection):
    """Menambahkan tabel group_item dan relasi group_id pada tabel koleksi."""
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS group_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama_group TEXT UNIQUE NOT NULL,
            deskripsi TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        )
        """
    )
    cursor.execute("PRAGMA table_info(koleksi)")
    cols = [row["name"] for row in cursor.fetchall()]
    if "group_id" not in cols:
        cursor.execute("ALTER TABLE koleksi ADD COLUMN group_id INTEGER REFERENCES group_item(id)")
    conn.commit()

def migration_004_batch_checklist_and_final_ok(conn: sqlite3.Connection):
    """Menambahkan kolom is_final_ok pada batch_pembelian dan is_checked pada koleksi."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(batch_pembelian)")
    batch_cols = [row["name"] for row in cursor.fetchall()]
    if "is_final_ok" not in batch_cols:
        cursor.execute("ALTER TABLE batch_pembelian ADD COLUMN is_final_ok INTEGER DEFAULT 0")

    cursor.execute("PRAGMA table_info(koleksi)")
    koleksi_cols = [row["name"] for row in cursor.fetchall()]
    if "is_checked" not in koleksi_cols:
        cursor.execute("ALTER TABLE koleksi ADD COLUMN is_checked INTEGER DEFAULT 0")
    conn.commit()


def migration_005_add_lot_pembelian(conn: sqlite3.Connection):
    """Menambahkan tabel lot_pembelian dan kolom lot_id pada tabel koleksi."""
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

MIGRATIONS: List[Tuple[str, str, Callable[[sqlite3.Connection], None]]] = [
    ("001_baseline", "Baseline schema tracking", migration_001_baseline),
    ("002_certification_and_photos", "Add grading certification fields and photo gallery table", migration_002_add_certification_and_photos),
    ("003_add_group_item", "Add group_item master table and group_id relation in koleksi", migration_003_add_group_item),
    ("004_batch_checklist_and_final_ok", "Add is_final_ok in batch_pembelian and is_checked in koleksi", migration_004_batch_checklist_and_final_ok),
    ("005_add_lot_pembelian", "Add lot_pembelian table and lot_id column in koleksi", migration_005_add_lot_pembelian),
]

def run_migrations(conn: sqlite3.Connection):
    """Menjalankan seluruh migrasi yang belum terpasang secara berurutan."""
    init_migration_table(conn)
    cursor = conn.cursor()

    cursor.execute("SELECT version FROM schema_migrations")
    applied_versions = {row[0] for row in cursor.fetchall()}

    for version, desc, migration_fn in MIGRATIONS:
        if version not in applied_versions:
            print(f"[MIGRATION] Menjalankan migrasi: {version} - {desc}...")
            try:
                migration_fn(conn)
                cursor.execute(
                    "INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
                    (version, desc)
                )
                conn.commit()
                print(f"[MIGRATION] Sukses: {version}")
            except Exception as e:
                conn.rollback()
                print(f"[MIGRATION ERROR] Gagal menjalankan {version}: {e}")
                raise e
