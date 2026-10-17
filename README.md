# 🪙 NumisManager - Numismatic Asset Management & 3D Digital Binder

Aplikasi web komprehensif berbasis **Python FastAPI** dan **Vanilla JavaScript SPA** untuk manajemen inventaris, pencatatan transaksi, evaluasi laba rugi, serta visualisasi buku album katalog digital uang kuno dan koin berstandar archival.

---

## 🌟 Fitur Unggulan

* **🏠 Dashboard Finansial & Inventaris**: Ringkasan metrik total koleksi, sisa stok, nilai aset HPP, omzet penjualan, total profit, serta grafik proporsi jenis dan tren bulanan (Chart.js).
* **🛍️ Pembelian Single & Batch (Lot Lelang)**: Dukungan pembelian item tunggal maupun pembelian lot lelang multi-item dengan kalkulasi otomatis pembagian rata ongkir (*equal split*) untuk menghasilkan HPP per keping yang akurat.
* **📋 Katalog Koleksi & Stok**: Filter multi-kriteria lanjutan (HPP min/max, rentang tahun, negara, nomor seri, grade, kode batch), tata letak baris tabel bersih, pratinjau instan foto dua sisi (OBV & REV) dengan **Tooltip Cerdas Anti-Terpotong** (`tooltip-down` untuk 3 baris teratas), dan fitur pecah stok (*stock splitting*).
* **📖 Album Digital Binder 3D Realistis**: Pengalaman membolak-balik lembaran mika (*refill sleeves*) layaknya binder fisik asli dengan interaksi *drag-and-flip* 2 arah (jatuh ke kiri atau kanan), susunan slot per lembar fleksibel, penunjuk posisi **"Lembar X/Y"**, modal detail item ultra-lebar 2 kolom tanpa scroll, modal pemilih koleksi dengan filter pencarian & kategori, serta **14 tema warna sampul mewah** (Gold, Silver, Copper, Rose Gold, White Gold, Emerald, Navy, Burgundy, Purple, Violet, Yellow, Desert Sand, Vintage Leather, Onyx Black) dengan *live preview box* dan tombol ganti tema instan di toolbar.
* **💰 Manajemen Penjualan**: Kalkulator laba & margin langsung saat memilih item, auto-pengurangan sisa stok koleksi, dan riwayat transaksi penjualan.
* **🧾 Generator Nota Bukti Transaksi Resmi**: Cetak bukti kwitansi transaksi penjualan langsung dalam format cetak/PDF A5 siap print dengan rincian item, nomor seri, grade, tanda tangan kasir/pembeli.
* **🏷️ Generator Label Holder Koin/Kertas**: Generator label stiker 2x2 inci (50x50 mm) siap print untuk holder/album dengan lencana grading, asal negara, tahun, denominasi, dan nomor seri.
* **🏛️ Sertifikasi Grading Pihak Ketiga (TPG)**: Kolom khusus grading resmi (PMG, PCGS, NGC, NCS, ANACS, ICG) dengan nomor sertifikasi, grade numerik, dan URL verifikasi keabsahan.
* **📸 Galeri Multi-Foto per Item**: Dukungan upload multi-foto tambahan per koleksi untuk mendokumentasikan tanda air (*watermark*), benang pengaman, holder slab, atau variasi cetakan.
* **🛡️ Pencadangan Database Hot / Online**: Fitur pencadangan atomik SQLite (`utils/backup_db.py`) via API online backup terkompresi ZIP dengan verifikasi checksum SHA-256 dan antarmuka manajemen cadangan di web UI.
* **🔄 Runner Migrasi Skema Otomatis**: Pelari migrasi skema database terkelola (`database/migration_runner.py`) dengan tabel audit `schema_migrations`.
* **👥 Database Supplier & Sumber Lelang**: Manajemen data rekanan pelelang, toko numismatik, dan kontak WhatsApp/Facebook.
* **📊 Laporan & Ekspor Excel**: Rekapitulasi stok, penjualan, dan laba rugi dengan fitur ekspor lembar kerja `.xlsx` bergaya emas profesional (OpenPyXL).
* **🌐 Akses Jarak Jauh & Pengujian Mobile**: Terintegrasi dengan **Cloudflare Quick Tunnel** (`tunnel.bat`) untuk pengujian langsung dari perangkat seluler (HP/tablet) via internet publik.
* **🔐 Sistem Keamanan & Multi-User**: Autentikasi JWT Bearer dengan kunci rahasia dinamis `.env`, fitur ganti kata sandi admin/staf di UI, enkripsi password Bcrypt, dan kontrol hak akses berbasis peran (Admin & User).

---

## 🛠️ Tech Stack & Arsitektur

* **Backend**: Python 3.10+ • FastAPI (ASGI) • Uvicorn • Pydantic v2 • Passlib (Bcrypt) • Python-JOSE (JWT)
* **Database**: SQLite3 dengan mode WAL (*Write-Ahead Logging*) & *Foreign Key Constraints* (Serverless & Portabel)
* **Frontend**: Pure Vanilla JavaScript (ES6+) Single Page Application (SPA) • Semantic HTML5 • Responsive CSS3 Variables (Dark Mode & Gold Accents)
* **Aset & Library Tambahan**: OpenPyXL (Excel Generator) • Chart.js (Grafik Analitik) • Cloudflare Tunnel (Akses Remote)

---

## 📂 Struktur Direktori Proyek

```text
DashboardCollection/
├── database/                   # Modul Database SQLite & Model
│   ├── db.py                   # Koneksi SQLite (WAL mode, PRAGMA) & default seeder
│   ├── migration_runner.py     # Runner migrasi skema database terkelola
│   ├── models.py               # DDL Skema tabel relasional & Skema validasi Pydantic
│   └── numismatik.db           # Berkas database SQLite lokal
├── routers/                    # Endpoints REST API (FastAPI Router)
│   ├── album.py                # CRUD Album Digital & penataan slot lembaran
│   ├── auth.py                 # Autentikasi JWT & manajemen pengguna (ubah password)
│   ├── backup.py               # API Hot Backup SQLite & download arsip ZIP
│   ├── batch.py                # Manajemen batch lelang & recalculate HPP
│   ├── koleksi.py              # Inventaris koleksi, label holder, galeri & pecah stok
│   ├── laporan.py              # Laporan analitik & streaming download Excel
│   ├── penjualan.py            # Pencatatan transaksi jual, laba, & cetak nota resmi
│   └── supplier.py             # Database pelelang & toko numismatik
├── utils/                      # Fungsi Utilitas & Helper
│   ├── auth_utils.py           # Enkripsi Bcrypt & JWT token validator (.env support)
│   ├── backup_db.py            # Utilitas online backup SQLite atomik & rotasi arsip
│   ├── calculations.py         # Formula HPP (single/batch) & kalkulasi profit
│   └── export_excel.py         # Styler & generator laporan spreadsheet Excel
├── backups/                    # Direktori penyimpanan arsip cadangan SQLite (.zip)
├── steering/                   # Tata Kelola & Dokumen Strategis (Governance)
│   ├── STEERING.md             # Single Source of Truth arsitektur & aturan domain
│   └── GEMINI.md               # Aturan operasional untuk Antigravity / AI Agents
├── dependencies/               # Manajemen Dependensi & Pustaka
│   ├── wheels/                 # Paket binary offline (.whl) untuk Windows & Linux
│   ├── requirements.txt        # Salinan manifest dependensi
│   └── README.md               # Dokumentasi stack & panduan instalasi offline
├── tools/                      # Utilitas & Binary Pembantu Eksternal
│   ├── bin/                    # Tempat penyimpanan binary (misal: cloudflared)
│   └── README.md               # Dokumentasi utilitas binary multi-OS
├── static/                     # Aset Statis Web
│   ├── css/                    # Stylesheet (style.css, components.css, album.css)
│   ├── js/                     # Skrip SPA frontend (api.js, album.js, koleksi.js, dll.)
│   ├── vendor/                 # Pustaka offline lokal (Chart.js UMD minified)
│   ├── img/                    # Logo biner & aset visual
│   └── uploads/                # Berkas gambar koleksi yang diunggah (OBV & REV)
├── templates/                  # Templat Tampilan HTML
│   ├── app.html                # Cangkang utama SPA NumisManager (?v=14)
│   └── login.html              # Halaman gerbang login pengguna
├── docs/                       # Dokumentasi Proyek Resmi & Terperinci
│   ├── implementation_steps.md # 12 Tahapan implementasi dari awal hingga siap rilis
│   ├── panduan_deploy.md       # Panduan deploy lokal, WiFi, Cloudflare Tunnel, VPS & PaaS
│   └── report_line_of_code.md  # Laporan statistik & metrik baris kode (LOC)
├── .gitignore                  # Konfigurasi pengecualian version control
├── main.py                     # Entry point server aplikasi FastAPI
├── requirements.txt            # Manifest utama dependensi library Python
├── run.py                      # Smart Cross-Platform Runner & Environment Orchestrator
├── run.bat                     # Peluncur 1-klik Windows (routes to run.py)
├── tunnel.bat                  # Peluncur 1-klik Cloudflare Tunnel Windows
├── run.sh                      # Peluncur 1-klik Linux & macOS
├── tunnel.sh                   # Peluncur 1-klik Cloudflare Tunnel Linux & macOS
└── README.md                   # Berkas panduan utama proyek
```

---

## 🚀 Panduan Memulai Cepat (Cross-Platform Smart Quick Start)

NumisManager kini dilengkapi dengan **Smart Runner (`run.py`)** yang secara cerdas mendeteksi sistem operasi Anda, otomatis membuat & mengaktifkan `.venv`, menginstal seluruh dependensi jika belum ada, dan menyiapkan utilitas jaringan.

### 1. Windows (1-Klik via Explorer atau Terminal)
* **Jalankan Server Lokal**: Dobel-klik **`run.bat`** (atau ketik `python run.py`). Server otomatis aktif di port `8000`.
* **Akses dari HP / Internet**: Dobel-klik **`tunnel.bat`** (atau ketik `python run.py --tunnel`). Salin tautan HTTPS publik yang muncul.

### 2. Linux & macOS (1-Klik via Terminal)
```bash
# Berikan hak eksekusi sekali saja
chmod +x run.sh tunnel.sh run.py

# Jalankan server lokal
./run.sh
# Atau akses internet/HP via tunnel
./tunnel.sh
```

### 3. Opsi Perintah Lengkap (Smart CLI)
```bash
python run.py               # Menjalankan server lokal (default: port 8000)
python run.py --tunnel      # Menjalankan server + Cloudflare Tunnel
python run.py --port 8080   # Menjalankan pada port tertentu
python run.py --check       # Memeriksa diagnostik & kesehatan lingkungan
python run.py --install     # Hanya menginstal/memperbarui dependensi
```

### 4. Akses Aplikasi & Kredensial Bawaan
* Buka peramban (*browser*) dan arahkan ke: **`http://localhost:8000`**
* Akun Pengguna Bawaan (*Default Administrator*):
  * **Username**: `admin`
  * **Password**: `admin123`

---

## 📚 Dokumentasi Terperinci

Seluruh panduan teknis dan laporan proyek telah dirapikan ke dalam folder **`docs/`**:

1. [📖 **Panduan Deployment Lengkap** (`docs/panduan_deploy.md`)](docs/panduan_deploy.md)  
   Panduan langkah demi langkah menjalankan di komputer lokal, akses via HP dalam satu WiFi, remote akses via Cloudflare Tunnel (`tunnel.bat`), deploy di VPS Ubuntu (Nginx + Systemd), PaaS (Render / Railway), hingga Docker.
2. [🚀 **Catatan Tahapan Implementasi** (`docs/implementation_steps.md`)](docs/implementation_steps.md)  
   Rincian lengkap 12 tahapan pengembangan proyek dari analisis kebutuhan, database, logika HPP, frontend, inovasi 3D album digital, 14 tema sampul mewah, hingga smart tooltip dan dev tooling.
3. [📊 **Laporan Statistik Baris Kode** (`docs/report_line_of_code.md`)](docs/report_line_of_code.md)  
   Audit mendalam metrik baris kode (*Source Lines of Code*), distribusi modul, dan rasio arsitektur sistem.

---
*Dikembangkan dengan dedikasi untuk melestarikan dan mendokumentasikan warisan sejarah numismatik.*
