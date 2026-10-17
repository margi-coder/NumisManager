from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

CREATE_TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        full_name TEXT,
        hashed_password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS supplier (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        alamat TEXT,
        no_hp TEXT,
        link_profile TEXT,
        catatan TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS batch_pembelian (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kode_batch TEXT UNIQUE,
        nama_batch TEXT,
        supplier_id INTEGER REFERENCES supplier(id),
        total_ongkir REAL DEFAULT 0,
        perolehan TEXT,
        link_pembelian TEXT,
        tanggal_beli TEXT,
        status TEXT DEFAULT 'pesan',
        catatan TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS koleksi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kode_item TEXT UNIQUE,
        nama_item TEXT NOT NULL,
        nomor_seri TEXT,
        tahun TEXT,
        denominasi TEXT,
        cetakan TEXT,
        grade TEXT,
        jenis TEXT,
        negara TEXT,
        bahan TEXT,
        warna_dominan TEXT,
        dimensi TEXT,
        kondisi_fisik TEXT,
        lokasi_simpan TEXT,
        detail TEXT,
        catatan_internal TEXT,
        foto_path TEXT,
        foto_obv TEXT,
        foto_rev TEXT,
        supplier_id INTEGER REFERENCES supplier(id),
        batch_id INTEGER REFERENCES batch_pembelian(id),
        perolehan TEXT,
        link_pembelian TEXT,
        tanggal_beli TEXT,
        status TEXT DEFAULT 'pesan',
        qty INTEGER DEFAULT 1,
        qty_terjual INTEGER DEFAULT 0,
        harga REAL DEFAULT 0,
        ongkir REAL DEFAULT 0,
        hpp REAL DEFAULT 0,
        hpp_per_pcs REAL DEFAULT 0,
        harga_jual REAL DEFAULT 0,
        status_koleksi TEXT DEFAULT 'stock_jual',
        is_pecahan INTEGER DEFAULT 0,
        parent_id INTEGER REFERENCES koleksi(id),
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS penjualan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kode_jual TEXT UNIQUE,
        koleksi_id INTEGER NOT NULL REFERENCES koleksi(id),
        qty_jual INTEGER DEFAULT 1,
        harga_jual_pcs REAL NOT NULL,
        hpp_pcs REAL DEFAULT 0,
        pembeli TEXT,
        platform_jual TEXT,
        catatan TEXT,
        tanggal_jual TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS album (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_album TEXT NOT NULL,
        deskripsi TEXT,
        slot_per_halaman INTEGER DEFAULT 3,
        tema_warna TEXT DEFAULT 'dark_burgundy',
        catatan TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS album_lembar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL REFERENCES album(id) ON DELETE CASCADE,
        lembar_ke INTEGER NOT NULL,
        slot_count INTEGER DEFAULT 3,
        catatan_lembar TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(album_id, lembar_ke)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS album_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL REFERENCES album(id) ON DELETE CASCADE,
        koleksi_id INTEGER NOT NULL REFERENCES koleksi(id) ON DELETE CASCADE,
        lembar_ke INTEGER NOT NULL DEFAULT 1,
        halaman INTEGER NOT NULL DEFAULT 1,
        slot_index INTEGER NOT NULL DEFAULT 1,
        keterangan_slot TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(album_id, lembar_ke, slot_index)
    )
    """
]

# --- Pydantic Models ---

# User Models
class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: str
    role: Optional[str] = "user"

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Supplier Models
class SupplierCreate(BaseModel):
    nama: str
    alamat: Optional[str] = None
    no_hp: Optional[str] = None
    link_profile: Optional[str] = None
    catatan: Optional[str] = None

class SupplierUpdate(BaseModel):
    nama: Optional[str] = None
    alamat: Optional[str] = None
    no_hp: Optional[str] = None
    link_profile: Optional[str] = None
    catatan: Optional[str] = None

class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    alamat: Optional[str] = None
    no_hp: Optional[str] = None
    link_profile: Optional[str] = None
    catatan: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Batch Models
class BatchCreate(BaseModel):
    nama_batch: Optional[str] = None
    supplier_id: Optional[int] = None
    total_ongkir: float = 0.0
    perolehan: Optional[str] = None
    link_pembelian: Optional[str] = None
    tanggal_beli: Optional[str] = None
    status: Optional[str] = "pesan"
    catatan: Optional[str] = None

class BatchUpdate(BaseModel):
    nama_batch: Optional[str] = None
    supplier_id: Optional[int] = None
    total_ongkir: Optional[float] = None
    perolehan: Optional[str] = None
    link_pembelian: Optional[str] = None
    tanggal_beli: Optional[str] = None
    status: Optional[str] = None
    catatan: Optional[str] = None

class BatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kode_batch: Optional[str] = None
    nama_batch: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_nama: Optional[str] = None
    total_ongkir: float = 0.0
    perolehan: Optional[str] = None
    link_pembelian: Optional[str] = None
    tanggal_beli: Optional[str] = None
    status: str
    catatan: Optional[str] = None
    item_count: Optional[int] = 0
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Koleksi Models
class KoleksiCreate(BaseModel):
    kode_item: Optional[str] = None
    nama_item: str
    nomor_seri: Optional[str] = None
    tahun: Optional[str] = None
    denominasi: Optional[str] = None
    cetakan: Optional[str] = None
    grade: Optional[str] = None
    jenis: Optional[str] = None
    negara: Optional[str] = None
    bahan: Optional[str] = None
    warna_dominan: Optional[str] = None
    dimensi: Optional[str] = None
    kondisi_fisik: Optional[str] = None
    lokasi_simpan: Optional[str] = None
    detail: Optional[str] = None
    catatan_internal: Optional[str] = None
    foto_path: Optional[str] = None
    foto_obv: Optional[str] = None
    foto_rev: Optional[str] = None
    foto_detail: Optional[str] = None
    lembaga_grading: Optional[str] = "-"
    nomor_sertifikasi: Optional[str] = None
    grade_numerik: Optional[str] = None
    grading_url: Optional[str] = None
    supplier_id: Optional[int] = None
    batch_id: Optional[int] = None
    perolehan: Optional[str] = None
    link_pembelian: Optional[str] = None
    tanggal_beli: Optional[str] = None
    status: Optional[str] = "pesan"
    qty: int = 1
    harga: float = 0.0
    ongkir: float = 0.0
    harga_jual: float = 0.0
    status_koleksi: Optional[str] = "stock_jual"

class KoleksiUpdate(BaseModel):
    kode_item: Optional[str] = None
    nama_item: Optional[str] = None
    nomor_seri: Optional[str] = None
    tahun: Optional[str] = None
    denominasi: Optional[str] = None
    cetakan: Optional[str] = None
    grade: Optional[str] = None
    jenis: Optional[str] = None
    negara: Optional[str] = None
    bahan: Optional[str] = None
    warna_dominan: Optional[str] = None
    dimensi: Optional[str] = None
    kondisi_fisik: Optional[str] = None
    lokasi_simpan: Optional[str] = None
    detail: Optional[str] = None
    catatan_internal: Optional[str] = None
    foto_path: Optional[str] = None
    foto_obv: Optional[str] = None
    foto_rev: Optional[str] = None
    foto_detail: Optional[str] = None
    lembaga_grading: Optional[str] = None
    nomor_sertifikasi: Optional[str] = None
    grade_numerik: Optional[str] = None
    grading_url: Optional[str] = None
    supplier_id: Optional[int] = None
    batch_id: Optional[int] = None
    perolehan: Optional[str] = None
    link_pembelian: Optional[str] = None
    tanggal_beli: Optional[str] = None
    status: Optional[str] = None
    qty: Optional[int] = None
    harga: Optional[float] = None
    ongkir: Optional[float] = None
    harga_jual: Optional[float] = None
    status_koleksi: Optional[str] = None

class PecahStokRequest(BaseModel):
    qty_pecahan: int
    harga_jual_pcs: float = 0.0
    nama_item: Optional[str] = None
    status_koleksi: str = "stock_jual"

class KoleksiFotoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    koleksi_id: int
    label: str = "detail"
    foto_path: str
    catatan: Optional[str] = None
    created_at: Optional[str] = None

class KoleksiResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kode_item: Optional[str] = None
    nama_item: str
    nomor_seri: Optional[str] = None
    tahun: Optional[str] = None
    denominasi: Optional[str] = None
    cetakan: Optional[str] = None
    grade: Optional[str] = None
    jenis: Optional[str] = None
    negara: Optional[str] = None
    bahan: Optional[str] = None
    warna_dominan: Optional[str] = None
    dimensi: Optional[str] = None
    kondisi_fisik: Optional[str] = None
    lokasi_simpan: Optional[str] = None
    detail: Optional[str] = None
    catatan_internal: Optional[str] = None
    foto_path: Optional[str] = None
    foto_obv: Optional[str] = None
    foto_rev: Optional[str] = None
    foto_detail: Optional[str] = None
    lembaga_grading: Optional[str] = "-"
    nomor_sertifikasi: Optional[str] = None
    grade_numerik: Optional[str] = None
    grading_url: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_nama: Optional[str] = None
    batch_id: Optional[int] = None
    batch_kode: Optional[str] = None
    perolehan: Optional[str] = None
    link_pembelian: Optional[str] = None
    tanggal_beli: Optional[str] = None
    status: str
    qty: int
    qty_terjual: int
    qty_tersisa: Optional[int] = None
    harga: float
    ongkir: float
    hpp: float
    hpp_per_pcs: float
    harga_jual: float
    status_koleksi: str
    is_pecahan: int
    parent_id: Optional[int] = None
    gallery_fotos: Optional[List[Dict[str, Any]]] = None
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Penjualan Models
class PenjualanCreate(BaseModel):
    koleksi_id: int
    qty_jual: int = 1
    harga_jual_pcs: float
    pembeli: Optional[str] = None
    platform_jual: Optional[str] = None
    catatan: Optional[str] = None
    tanggal_jual: Optional[str] = None

class PenjualanUpdate(BaseModel):
    koleksi_id: Optional[int] = None
    qty_jual: Optional[int] = None
    harga_jual_pcs: Optional[float] = None
    pembeli: Optional[str] = None
    platform_jual: Optional[str] = None
    catatan: Optional[str] = None
    tanggal_jual: Optional[str] = None

class PenjualanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kode_jual: Optional[str] = None
    koleksi_id: int
    nama_item: Optional[str] = None
    qty_jual: int
    harga_jual_pcs: float
    hpp_pcs: float
    total_jual: Optional[float] = None
    profit_pcs: Optional[float] = None
    total_profit: Optional[float] = None
    margin_pct: Optional[float] = None
    pembeli: Optional[str] = None
    platform_jual: Optional[str] = None
    catatan: Optional[str] = None
    tanggal_jual: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[str] = None

# Album Models
class AlbumCreate(BaseModel):
    nama_album: str
    deskripsi: Optional[str] = None
    slot_per_halaman: Optional[int] = 3
    tema_warna: Optional[str] = "dark_burgundy"
    catatan: Optional[str] = None

class AlbumUpdate(BaseModel):
    nama_album: Optional[str] = None
    deskripsi: Optional[str] = None
    slot_per_halaman: Optional[int] = None
    tema_warna: Optional[str] = None
    catatan: Optional[str] = None

class AlbumResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama_album: str
    deskripsi: Optional[str] = None
    slot_per_halaman: int = 3
    tema_warna: str = "dark_burgundy"
    catatan: Optional[str] = None
    item_count: Optional[int] = 0
    total_halaman: Optional[int] = 1
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AlbumLembarCreate(BaseModel):
    slot_count: int = 3
    catatan_lembar: Optional[str] = None

class AlbumLembarUpdate(BaseModel):
    slot_count: int
    catatan_lembar: Optional[str] = None

class AlbumItemAdd(BaseModel):
    koleksi_id: int
    lembar_ke: Optional[int] = None
    halaman: Optional[int] = 1
    slot_index: int = 1
    keterangan_slot: Optional[str] = None

class AlbumItemMove(BaseModel):
    lembar_ke: Optional[int] = None
    halaman: Optional[int] = 1
    slot_index: int

class AlbumItemBulkAdd(BaseModel):
    koleksi_ids: List[int]
    start_lembar: Optional[int] = 1
    start_halaman: Optional[int] = 1


