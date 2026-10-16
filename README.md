# 🪙 NumisManager - Numismatic Asset Management & 3D Digital Binder

Aplikasi web komprehensif berbasis **Python FastAPI** dan **Vanilla JavaScript SPA** untuk manajemen inventaris, pencatatan transaksi, evaluasi laba rugi, serta visualisasi buku album katalog digital uang kuno dan koin berstandar archival.

---

## 🌟 Fitur Unggulan

* **🏠 Dashboard Finansial & Inventaris**: Ringkasan metrik total koleksi, sisa stok, nilai aset HPP, omzet penjualan, total profit, serta grafik proporsi jenis dan tren bulanan (Chart.js).
* **🛍️ Pembelian Single & Batch (Lot Lelang)**: Dukungan pembelian item tunggal maupun pembelian lot lelang multi-item dengan kalkulasi otomatis pembagian rata ongkir (*equal split*) untuk menghasilkan HPP per keping yang akurat.
* **📋 Katalog Koleksi & Stok**: Filter multi-kriteria lanjutan (HPP min/max, rentang tahun, negara, nomor seri, grade, kode batch), tata letak baris tabel bersih, pratinjau instan foto dua sisi (OBV & REV) dengan **Tooltip Cerdas Anti-Terpotong** (`tooltip-down` untuk 3 baris teratas), dan fitur pecah stok (*stock splitting*).
* **📖 Album Digital Binder 3D Realistis**: Pengalaman membolak-balik lembaran mika (*refill sleeves*) layaknya binder fisik asli dengan interaksi *drag-and-flip* 2 arah (jatuh ke kiri atau kanan), susunan slot per lembar fleksibel, penunjuk posisi **"Lembar X/Y"**, modal detail item ultra-lebar 2 kolom tanpa scroll, modal pemilih koleksi dengan filter pencarian & kategori, serta **14 tema warna sampul mewah** (Gold, Silver, Copper, Rose Gold, White Gold, Emerald, Navy, Burgundy, Purple, Violet, Yellow, Desert Sand, Vintage Leather, Onyx Black) dengan *live preview box* dan tombol ganti tema instan di toolbar.
* **💰 Manajemen Penjualan**: Kalkulator laba & margin langsung saat memilih item, auto-pengurangan sisa stok koleksi, dan riwayat transaksi penjualan.
* **👥 Database Supplier & Sumber Lelang**: Manajemen data rekanan pelelang, toko numismatik, dan kontak WhatsApp/Facebook.
* **📊 Laporan & Ekspor Excel**: Rekapitulasi stok, penjualan, dan laba rugi dengan fitur ekspor lembar kerja `.xlsx` bergaya emas profesional (OpenPyXL).
* **🌐 Akses Jarak Jauh & Pengujian Mobile**: Terintegrasi dengan **Cloudflare Quick Tunnel** (`tunnel.bat`) untuk pengujian langsung dari perangkat seluler (HP/tablet) via internet publik.
* **🔐 Sistem Keamanan & Multi-User**: Autentikasi JWT Bearer, enkripsi password Bcrypt, dan kontrol hak akses berbasis peran (Admin & User).

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
│   ├── models.py               # DDL Skema tabel relasional & Skema validasi Pydantic
│   └── numismatik.db           # Berkas database SQLite lokal
├── routers/                    # Endpoints REST API (FastAPI Router)
│   ├── album.py                # CRUD Album Digital & penataan slot lembaran
│   ├── auth.py                 # Autentikasi JWT & manajemen pengguna
│   ├── batch.py                # Manajemen batch lelang & recalculate HPP
│   ├── koleksi.py              # Inventaris koleksi, upload foto & pecah stok
│   ├── laporan.py              # Laporan analitik & streaming download Excel
│   ├── penjualan.py            # Pencatatan transaksi jual & evaluasi laba
│   └── supplier.py             # Database pelelang & toko numismatik
├── utils/                      # Fungsi Utilitas & Helper
│   ├── auth_utils.py           # Enkripsi Bcrypt & JWT token validator
│   ├── calculations.py         # Formula HPP (single/batch) & kalkulasi profit
│   └── export_excel.py         # Styler & generator laporan spreadsheet Excel
├── static/                     # Aset Statis Web
│   ├── css/                    # Stylesheet (style.css, components.css, album.css)
│   ├── js/                     # Skrip SPA frontend (api.js, album.js, koleksi.js, dll.)
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
├── requirements.txt            # Daftar dependensi library Python
├── run.bat                     # Skrip peluncur server lokal 1-klik (Port 8000)
├── tunnel.bat                  # Skrip peluncur Cloudflare Tunnel 1-klik (Akses HP/Publik)
├── cloudflared.exe             # Utilitas binary Cloudflare Tunnel
└── README.md                   # Berkas panduan utama proyek
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Menjalankan Server Lokal di Windows (1-Klik)
Cukup klik dua kali berkas **`run.bat`** di folder proyek. Server akan otomatis aktif pada port `8000`.

### 2. Mengakses dari Ponsel / Perangkat Luar (1-Klik)
Klik dua kali berkas **`tunnel.bat`**. Salin alamat HTTPS publik yang tampil untuk langsung menguji aplikasi dari ponsel atau laptop lain.

### 3. Menjalankan Manual via Terminal / PowerShell
```powershell
# 1. Pindah ke direktori proyek
cd g:\AntigravityWorkspace\DashboardCollection

# 2. Buat & aktifkan virtual environment (opsional namun disarankan)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Instal dependensi
pip install -r requirements.txt

# 4. Jalankan aplikasi
python main.py
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
