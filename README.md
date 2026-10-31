# 🪙 NumisManager - Numismatic Asset Management & 3D Digital Binder

Aplikasi manajemen aset numismatik komprehensif berbasis **Python FastAPI** dan **Vanilla JavaScript SPA** untuk pengelolaan inventaris uang kuno & koin, pencatatan transaksi pembelian tunggal maupun lot lelang (*batch*), evaluasi laba rugi, serta visualisasi buku album katalog digital 3D berstandar archival. Kini hadir lengkap dengan **Single Offline Installer** untuk Desktop (**Windows, Linux, macOS**) serta paket aplikasi **Smartphone (Android `.apk` & iOS `.mobileconfig` / `.ipa`)**.

---

## 🌟 Fitur Unggulan

* **🏠 Dashboard Finansial & Inventaris**: Ringkasan metrik total koleksi, sisa stok, nilai aset HPP, omzet penjualan, total profit, serta grafik proporsi jenis dan tren bulanan (`Chart.js` offline-ready).
* **🛍️ Pembelian Single & Batch (Lot Lelang)**: Dukungan pembelian item tunggal maupun pembelian lot lelang multi-item dengan kalkulasi otomatis pembagian rata ongkir (*equal split*) untuk menghasilkan HPP per keping yang akurat, serta fitur **📋 Copy & Edit Item** pada kolom Aksi untuk menduplikasi item yang memiliki banyak kemiripan data dan langsung mengedit sebagian datanya (dilengkapi tombol **Simpan & Copy Lagi** untuk input beruntun).
* **🖼️ Smart Photo Manager (Drag & Drop + Multi-Source Copy-Paste)**:
  * Tersedia di seluruh menu **Entri Pembelian Item Tunggal**, **Manajemen Pembelian Batch / Lot**, dan **Katalog Koleksi & Stok Numismatik** untuk unggah foto **OBV (Depan)**, **REV (Belakang)**, maupun **Gambar Pendukung (Multi-Foto)**.
  * Mendukung **Drag & Drop** langsung dari Windows Explorer / File Manager atau gambar dari browser lain.
  * Mendukung **Copy & Paste (`Ctrl+V` atau tombol `📋 Paste`)** langsung dari:
    * File gambar yang disalin dari Windows Explorer
    * Klik kanan **"Copy image" (Salin gambar)** dari website/browser lain (dilengkapi ekstraktor HTML `<img>` & proxy backend `/api/koleksi/fetch-remote-image` bebas kendala CORS)
    * Hasil tangkapan layar **Windows Snipping Tool** (`Win + Shift + S`)
    * Aplikasi editor gambar seperti **MS Paint**, Photoshop, dll.
* **📋 Katalog Koleksi & Stok Kompak**:
  * Filter multi-kriteria lanjutan (HPP min/max, rentang tahun, negara, nomor seri, grade, kode batch).
  * **Tata Letak Tabel Kompak (`.koleksi-compact-table`)** dengan jarak antar kolom yang presisi dan penambahan kolom **`Qty`** tepat setelah kolom **`Grade`**.
  * Pratinjau instan foto dua sisi (OBV & REV) dengan **Tooltip Cerdas Anti-Terpotong** (`tooltip-down` untuk 3 baris teratas) serta fitur pecah stok (*stock splitting*).
* **🔍 Penampil Foto Detail Melingkar (Circular Navigation) & Mode Layar Penuh (Fullscreen)**:
  * Navigasi geser foto **Kiri (`❮`)** dan **Kanan (`❯`)** serta dukungan tombol keyboard **`←` (`ArrowLeft`)** dan **`→` (`ArrowRight`)** yang berputar secara melingkar (*circular loop*: `OBV → REV → Foto Pendukung 1..N → kembali ke OBV`) baik di **Modal View Detail Item** maupun **Global Lightbox**.
  * **Fitur Fullscreen (`⛶ Fullscreen`)**: Tombol layar penuh di modal detail & header lightbox, klik ganda (*double-click*) pada gambar, atau pintasan tombol **`F`** di keyboard.
  * **Anti-Overflow Lightbox Container**: Sistem penguncian proporsi gambar otomatis di dalam `.lightbox-image-wrap` agar foto beresolusi tinggi atau berorientasi vertikal tidak pernah meluber keluar kotak atau menutupi judul dan strip thumbnail.
* **💰 Manajemen Penjualan dengan Searchable Combobox**:
  * Pemilih **Pilih Item Koleksi dari Stok** dilengkapi komponen **Searchable Select Combobox (`#nsKoleksiCombobox`)** yang mendukung pemilihan via *dropdown* sekaligus **pencarian ketik langsung (*live typing search*)** berdasarkan nama koleksi, tahun, nomor seri, negara, kode batch, grade, maupun HPP.
  * Kalkulator laba & margin langsung saat memilih item, auto-pengurangan sisa stok koleksi, dan riwayat transaksi penjualan.
* **📖 Album Digital Binder 3D Realistis**: Pengalaman membolak-balik lembaran mika (*refill sleeves*) layaknya binder fisik asli dengan interaksi *drag-and-flip* 2 arah (jatuh ke kiri atau kanan), susunan slot per lembar fleksibel, penunjuk posisi **"Lembar X/Y"**, modal detail item ultra-lebar 2 kolom, modal pemilih koleksi dengan filter pencarian & kategori, serta **14 tema warna sampul mewah** (Gold, Silver, Copper, Rose Gold, White Gold, Emerald, Navy, Burgundy, Purple, Violet, Yellow, Desert Sand, Vintage Leather, Onyx Black).
* **🧾 Generator Nota Bukti Transaksi Resmi**: Cetak bukti kwitansi transaksi penjualan langsung dalam format cetak/PDF A5 siap print dengan rincian item, nomor seri, grade, tanda tangan kasir/pembeli.
* **🏷️ Generator Label Holder Koin/Kertas**: Generator label stiker 2x2 inci (50x50 mm) siap print untuk holder/album dengan lencana grading, asal negara, tahun, denominasi, dan nomor seri.
* **🏛️ Sertifikasi Grading Pihak Ketiga (TPG)**: Kolom khusus grading resmi (PMG, PCGS, NGC, NCS, ANACS, ICG) dengan nomor sertifikasi, grade numerik, dan URL verifikasi keabsahan.
* **🛡️ Pencadangan Database Hot / Online & Ekspor JSON**: Fitur pencadangan atomik SQLite (`utils/backup_db.py`) via API online backup terkompresi ZIP dengan verifikasi checksum SHA-256 serta ekspor/impor cadangan database.
* **📊 Laporan & Ekspor Excel**: Rekapitulasi stok, penjualan, dan laba rugi dengan fitur ekspor lembar kerja `.xlsx` bergaya emas profesional (`OpenPyXL`).
* **📦 Single Offline Installer (Windows, Linux, macOS) & Aplikasi Smartphone (Android & iOS)**:
  * Installer tunggal desktop 100% offline di folder `Installer/` (termasuk **Portable Python 3.14 Runtime** untuk Windows sehingga PC target tidak perlu menginstal Python atau terhubung ke internet).
  * Paket aplikasi smartphone di `Installer/smart_phone/` (`.apk` untuk Android serta `.mobileconfig`, `.ipa`, dan `.html` mandiri untuk iOS) dengan **Dual-Mode Engine** (dapat berjalan **100% Offline Mandiri di HP** maupun **Terhubung ke Server PC / Cloud Tunnel**).

---

## 🛠️ Tech Stack & Arsitektur

* **Backend**: Python 3.10+ (Bundled Portable Python 3.14 pada Offline Installer Windows) • FastAPI (ASGI) • Uvicorn • Pydantic v2 • Passlib (Bcrypt) • Python-JOSE (JWT)
* **Database**: SQLite3 dengan mode WAL (*Write-Ahead Logging*) & *Foreign Key Constraints* (Serverless & Portabel) + *Mobile Offline Storage Engine* (`localStorage` / Indexed state) untuk mode mandiri di HP
* **Frontend**: Pure Vanilla JavaScript (ES6+) Single Page Application (SPA) • Semantic HTML5 • Responsive CSS3 Variables (Dark Mode & Gold Accents) • Progressive Web App (`manifest.json` & Service Worker `sw.js`)
* **Aset & Library Tambahan**: OpenPyXL (Excel Generator) • Chart.js (Grafik Analitik Offline) • Cloudflare Tunnel (Akses Remote)

---

## 📂 Struktur Direktori Proyek

```text
DashboardCollection/
├── Installer/                  # Paket Single Offline Installer Desktop & Smartphone
│   ├── NumisManager-Single-Offline-Installer-Windows.exe     # Single Offline Installer Windows 64-bit (Bundled Python 3.14 + Wheels)
│   ├── NumisManager-Single-Offline-Installer-Linux-macOS.run # Self-Extracting Offline Installer Linux & macOS
│   ├── PANDUAN_OFFLINE_INSTALLER.md                          # Panduan instalasi offline Windows, Linux, & macOS
│   └── smart_phone/            # Paket Instalasi Smartphone Android & iOS
│       ├── NumisManager-Android-v1.0.0.apk                   # Aplikasi Android native (.apk signed)
│       ├── NumisManager-iOS-v1.0.0.mobileconfig              # Profil WebClip Fullscreen App untuk iPhone & iPad
│       ├── NumisManager-iOS-v1.0.0.ipa                       # Paket arsip aplikasi iOS (.ipa) untuk sideloading
│       ├── NumisManager-Mobile-Offline-Standalone.html       # Aplikasi portable 1-file universal (iOS & Android)
│       └── PANDUAN_INSTALASI_ANDROID_IOS.md                  # Panduan instalasi & sinkronisasi Android & iOS
├── database/                   # Modul Database SQLite & Model
│   ├── db.py                   # Koneksi SQLite (WAL mode, PRAGMA) & default seeder
│   ├── migration_runner.py     # Runner migrasi skema database terkelola
│   ├── models.py               # DDL Skema tabel relasional & Skema validasi Pydantic
│   ├── schema.sql              # Skema deklaratif tabel database
│   └── numismatik.db           # Berkas database SQLite lokal
├── routers/                    # Endpoints REST API (FastAPI Router)
│   ├── album.py                # CRUD Album Digital & penataan slot lembaran
│   ├── auth.py                 # Autentikasi JWT & manajemen pengguna (ubah password)
│   ├── backup.py               # API Hot Backup SQLite & download arsip ZIP
│   ├── batch.py                # Manajemen batch lelang & recalculate HPP
│   ├── koleksi.py              # Inventaris koleksi, proxy gambar remote, label holder, galeri & pecah stok
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
├── dependencies/               # Manajemen Dependensi & Pustaka Offline
│   ├── wheels/                 # 60 paket binary offline (.whl) untuk Windows, Linux & macOS
│   ├── requirements.txt        # Salinan manifest dependensi
│   └── README.md               # Dokumentasi stack & panduan instalasi offline
├── tools/                      # Utilitas & Binary Pembantu Eksternal
│   ├── bin/                    # Tempat penyimpanan binary (cloudflared)
│   └── README.md               # Dokumentasi utilitas binary multi-OS
├── static/                     # Aset Statis Web & PWA
│   ├── css/                    # Stylesheet (style.css, components.css, album.css)
│   ├── js/                     # Skrip SPA frontend (api.js, koleksi.js, penjualan.js, mobile_offline_engine.js, dll.)
│   ├── vendor/                 # Pustaka offline lokal (Chart.js UMD minified)
│   ├── img/                    # Logo aplikasi & aset visual
│   ├── uploads/                # Berkas gambar koleksi yang diunggah (OBV, REV & Pendukung)
│   ├── manifest.json           # Web App Manifest untuk instalasi PWA
│   └── sw.js                   # Service Worker untuk caching aset offline
├── templates/                  # Templat Tampilan HTML
│   ├── app.html                # Cangkang utama SPA NumisManager (?v=23)
│   └── login.html              # Halaman gerbang login pengguna
├── docs/                       # Dokumentasi Proyek Resmi & Terperinci
│   ├── implementation_steps.md # Tahapan implementasi dari awal hingga siap rilis
│   ├── panduan_deploy.md       # Panduan deploy lokal, WiFi, Cloudflare Tunnel, VPS & PaaS
│   └── report_line_of_code.md  # Laporan statistik & metrik baris kode (LOC)
├── main.py                     # Entry point server aplikasi FastAPI
├── requirements.txt            # Manifest utama dependensi library Python
├── run.py                      # Smart Cross-Platform Runner (Auto-detect Embedded Python / .venv / Offline Wheels)
├── run.bat                     # Peluncur 1-klik Windows (mendukung runtime portable & .venv)
├── tunnel.bat                  # Peluncur 1-klik Cloudflare Tunnel Windows
├── run.sh                      # Peluncur 1-klik Linux & macOS
├── tunnel.sh                   # Peluncur 1-klik Cloudflare Tunnel Linux & macOS
└── README.md                   # Berkas panduan utama proyek
```

---

## 💿 Instalasi Mandiri Tanpa Internet (Single Offline Installer & Smartphone)

### 1. Desktop (Windows, Linux, dan macOS) — 100% Offline
* **Windows 10/11 (64-bit)**:
  * Jalankan **`Installer/NumisManager-Single-Offline-Installer-Windows.exe`**.
  * Tidak memerlukan koneksi internet dan **tidak perlu menginstal Python** karena sudah membundel *Portable Python 3.14 Runtime* beserta seluruh pustaka.
* **Linux & macOS**:
  * Jalankan perintah berikut di Terminal:
    ```bash
    chmod +x Installer/NumisManager-Single-Offline-Installer-Linux-macOS.run
    ./Installer/NumisManager-Single-Offline-Installer-Linux-macOS.run
    ```
* Panduan selengkapnya dapat dibaca di: [**`Installer/PANDUAN_OFFLINE_INSTALLER.md`**](Installer/PANDUAN_OFFLINE_INSTALLER.md).

### 2. Smartphone (Android & iOS / iPhone / iPad)
* **Android**: Instal berkas **`Installer/smart_phone/NumisManager-Android-v1.0.0.apk`** langsung di HP/Tablet Android Anda.
* **iOS (iPhone / iPad)**:
  * Gunakan **`Installer/smart_phone/NumisManager-iOS-v1.0.0.mobileconfig`** untuk memasang ikon aplikasi layar penuh (*Full-Screen WebClip*) langsung di *Home Screen* iPhone/iPad tanpa komputer/jailbreak, **ATAU**
  * Buka langsung **`Installer/smart_phone/NumisManager-Mobile-Offline-Standalone.html`** di aplikasi **Files** / Safari, **ATAU**
  * Gunakan **`Installer/smart_phone/NumisManager-iOS-v1.0.0.ipa`** melalui *Sideloadly / AltStore / TrollStore*.
* Panduan selengkapnya dapat dibaca di: [**`Installer/smart_phone/PANDUAN_INSTALASI_ANDROID_IOS.md`**](Installer/smart_phone/PANDUAN_INSTALASI_ANDROID_IOS.md).

---

## 🚀 Panduan Memulai Cepat dari Kode Sumber (Smart Quick Start)

NumisManager dilengkapi dengan **Smart Runner (`run.py`)** yang secara otomatis mendeteksi sistem operasi Anda, memeriksa ketersediaan *Portable Python Runtime* (`runtime/python/`) atau membuat `.venv`, menginstal seluruh dependensi secara offline dari `dependencies/wheels/` jika belum ada, dan menjalankan server.

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
python run.py --install     # Hanya menginstal/memperbarui dependensi (mendukung offline wheels)
```

### 4. Akses Aplikasi & Kredensial Bawaan
* Buka peramban (*browser*) dan arahkan ke: **`http://localhost:8000`**
* Akun Pengguna Bawaan (*Default Administrator*):
  * **Username**: `admin`
  * **Password**: `admin123`

---

## 🛠️ Riwayat Pembaruan & Perbaikan Bug Terbaru (Changelog)

* **v1.5 — Fitur Paket Lot Multi-Item (1 Harga Gabungan) & Traceability Lot (`🎁`)**:
  * **Input Paket Lot di Pembelian Single & Batch**: Menambahkan **🎁 Mode Paket Lot (1 Harga Multi-Item)** pada menu *Entri Pembelian Item Tunggal* serta tombol **`+ 🎁 Tambah Paket Lot (1 Harga)`** pada menu *Manajemen Pembelian Batch / Lot*.
  * **Alokasi Harga Cerdas (Otomatis & Manual)**: Mendukung pembagian harga 1 lot secara otomatis berdasarkan *Qty* atau baris item, sekaligus mengizinkan penyesuaian porsi harga manual per item (`🔒 Porsi Manual`) dengan kalkulasi sisa otomatis.
  * **Tampilan Per Item & Lencana Trace Lot (`🎁 LOT-...`)**: Seluruh item di dalam Lot tetap ditampilkan per item di tabel *Batch* maupun *Katalog Koleksi & Stok*, dilengkapi lencana interaktif **`🎁 LOT-YYYYMMDD-NNN`** dan filter khusus Paket Lot.
  * **Modal Traceability & Evaluasi Balik Modal (ROI) Lot**: Klik lencana Lot untuk melihat rincian induk Lot, daftar seluruh item saudara (*sibling items*) yang dibeli bersama dalam lot tersebut, editor alokasi harga, serta *Break-Even / ROI Progress Tracker* untuk memantau apakah penjualan sebagian item sudah menutup modal 1 Lot.
* **v1.4 — Fitur Copy & Edit Item (`📋`) & Input/Edit Link Pembelian (`🔗`)**:
  * Menambahkan tombol **📋 Copy & Edit** pada kolom **Aksi** di tabel **Item dalam Batch** (`static/js/pembelian.js`) maupun tabel **Katalog Koleksi & Stok** (`static/js/koleksi.js`), lengkap dengan tombol **📋 Simpan & Copy Lagi**.
  * Menambahkan kolom input dan edit **🔗 Link Pembelian / Tautan Lelang** pada form **Entri Pembelian Item Tunggal**, **Buat/Edit Header Batch**, **Tambah/Edit/Copy Item dalam Batch**, serta **Detail & Edit/Copy Item di Katalog Koleksi & Stok** (lengkap dengan pintasan klik **Buka Link Pembelian ↗**).
* **v1.3 — Single Offline Installer & Paket Aplikasi Smartphone (Android & iOS)**:
  * Pembuatan `NumisManager-Single-Offline-Installer-Windows.exe` dengan bundel *Portable Python 3.14* dan pustaka offline penuh.
  * Pembuatan `NumisManager-Single-Offline-Installer-Linux-macOS.run` dengan bundel 60 *Offline Wheels* multi-platform.
  * Pembuatan aplikasi Android (`NumisManager-Android-v1.0.0.apk`), profil konfigurasi iOS (`NumisManager-iOS-v1.0.0.mobileconfig`), arsip iOS (`NumisManager-iOS-v1.0.0.ipa`), serta aplikasi mandiri 1-berkas (`NumisManager-Mobile-Offline-Standalone.html`) yang dilengkapi `mobile_offline_engine.js` (*Dual-Mode: 100% Offline di HP & Sinkron Server PC*).
* **v1.2 — Perbaikan Bug Overflow Gambar Lightbox & Fitur Fullscreen**:
  * **Fix Bug**: Memperbaiki masalah gambar beresolusi besar/vertikal yang meluber melebihi kotak pada tampilan detail foto item dengan mengunci dimensi `.lightbox-image-wrap` dan `.lightbox-img` (`object-fit: contain`).
  * **Update**: Menambahkan fitur **Fullscreen (`⛶ Fullscreen`)** pada tampilan detail foto item dan *Global Lightbox* (mendukung klik tombol, *double-click* gambar, dan tombol keyboard `F`).
* **v1.1 — Tabel Koleksi Kompak, Kolom `Qty`, Navigasi Foto Melingkar & Searchable Combobox Penjualan**:
  * Merapatkan jarak antar kolom pada tabel **Koleksi & Stok** dan menambahkan kolom **`Qty`** setelah kolom **`Grade`**.
  * Menambahkan tombol navigasi kanan/kiri (`❮` / `❯`) dan dukungan tombol panah keyboard (`←` / `→`) untuk menggeser foto dari `OBV` → `REV` → `Foto Pendukung lainnya` → kembali ke `OBV`.
  * Mengubah pemilih item stok di menu **Pencatatan & Riwayat Penjualan** menjadi **Searchable Combobox** yang mendukung ketik pencarian langsung (*live typing search*) selain *dropdown*.
* **v1.0 — Smart Photo Manager (Drag & Drop + Multi-Source Copy-Paste)**:
  * Menambahkan dukungan *Drag & Drop* dan *Copy-Paste* (`Ctrl+V` / tombol `📋 Paste`) untuk foto **OBV**, **REV**, dan **Gambar Pendukung** di menu **Entri Pembelian Item Tunggal**, **Manajemen Pembelian Batch / Lot**, dan **Katalog Koleksi & Stok** (mendukung *copy-paste* dari Windows Explorer, klik kanan *Copy image* dari browser/website lain, Windows Snipping Tool, MS Paint, dll.).

---

## 📚 Dokumentasi Terperinci

Seluruh panduan teknis, instalasi offline, dan laporan proyek tersedia di lokasi berikut:

1. [📦 **Panduan Single Offline Installer Desktop** (`Installer/PANDUAN_OFFLINE_INSTALLER.md`)](Installer/PANDUAN_OFFLINE_INSTALLER.md)  
   Panduan instalasi 100% offline untuk Windows (`.exe`), Linux (`.run`), dan macOS (`.run`).
2. [📱 **Panduan Instalasi Smartphone Android & iOS** (`Installer/smart_phone/PANDUAN_INSTALASI_ANDROID_IOS.md`)](Installer/smart_phone/PANDUAN_INSTALASI_ANDROID_IOS.md)  
   Panduan instalasi aplikasi Android (`.apk`) dan iPhone/iPad (`.mobileconfig`, `.ipa`, `.html`) beserta cara sinkronisasi data offline/online.
3. [📖 **Panduan Deployment Lengkap** (`docs/panduan_deploy.md`)](docs/panduan_deploy.md)  
   Panduan langkah demi langkah menjalankan di komputer lokal, akses via HP dalam satu WiFi, remote akses via Cloudflare Tunnel (`tunnel.bat`), deploy di VPS Ubuntu (Nginx + Systemd), PaaS (Render / Railway), hingga Docker.
4. [🚀 **Catatan Tahapan Implementasi** (`docs/implementation_steps.md`)](docs/implementation_steps.md)  
   Rincian lengkap tahapan pengembangan proyek dari analisis kebutuhan, database, logika HPP, frontend, inovasi 3D album digital, 14 tema sampul mewah, hingga smart tooltip dan dev tooling.
5. [📊 **Laporan Statistik Baris Kode** (`docs/report_line_of_code.md`)](docs/report_line_of_code.md)  
   Audit mendalam metrik baris kode (*Source Lines of Code*), distribusi modul, dan rasio arsitektur sistem.

---
*Dikembangkan dengan dedikasi untuk melestarikan dan mendokumentasikan warisan sejarah numismatik.*
