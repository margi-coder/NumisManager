# 🧭 Steering Document: NumisManager
> **Status**: Active & Authoritative  
> **Target Audience**: Human Developers & AI Agents (Antigravity, Cursor, Gemini, Copilot)  
> **Repository**: [https://github.com/margi-coder/NumisManager](https://github.com/margi-coder/NumisManager)  
> **Version**: 1.0.0

Dokumen Steering ini merupakan **panduan tata kelola strategis (*Single Source of Truth*)** untuk seluruh pengembang dan agen AI yang berinteraksi dengan repositori **NumisManager**. Setiap keputusan arsitektural, modifikasi kode, dan penambahan fitur baru **wajib tunduk pada pedoman di dalam dokumen ini**.

---

## 1. Visi & Filosofi Produk (Product Vision)

NumisManager dibangun khusus untuk komunitas kolektor dan pedagang numismatik (uang kertas kuno, koin, spesimen, dan medali). Tujuannya adalah menggabungkan:
1. **Presisi Finansial**: Perhitungan HPP (*Harga Pokok Penjualan*), alokasi ongkir, dan margin laba bersih yang akurat hingga per keping.
2. **Pengalaman Visual & Taktil**: Buku album digital 3D interaktif yang menyajikan sensasi membolak-balik lembaran mika (*refill sleeves*) binder fisik secara nyata.
3. **Arsitektur Ringan & Cepat**: Mengedepankan eksekusi instan tanpa dependensi berlebih, tanpa kompilasi build yang lambat, dan portabel untuk dijalankan di laptop maupun diakses via perangkat seluler.

---

## 2. Arsitektur Teknis & Tech Stack

### A. Backend (Python 3.10+)
* **Framework**: FastAPI (ASGI Asinkron) dijalankan dengan Uvicorn server.
* **Database**: SQLite3 lokal (`database/numismatik.db`).
  * Wajib mengaktifkan `PRAGMA foreign_keys = ON;` untuk integritas relasi.
  * Wajib mengaktifkan `PRAGMA journal_mode = WAL;` (*Write-Ahead Logging*) untuk konkurensi pembacaan & penulisan yang tinggi.
* **Validasi & Serialisasi**: Pydantic v2 schemas (`database/models.py`).
* **Keamanan & Autentikasi**: Passlib (Bcrypt) untuk hashing kata sandi dan Python-JOSE untuk JWT Bearer token authentication.
* **Ekspor Dokumen**: OpenPyXL dengan *gold numismatic styling* pada header sel.

### B. Frontend (Modular Vanilla JavaScript SPA)
* **Filosofi UI**: Vanilla ES6+ tanpa framework berat (No React/Vue/Angular), menjaga beban awal (*initial load*) seringan mungkin (<100ms).
* **Desain & Tema**: Dark Luxury Aesthetic dengan aksen emas (`--gold-primary: #d4af37`), glassmorphism card, dan tipografi Google Fonts Inter.
* **Komponen & Visual**:
  * Chart.js untuk visualisasi grafik analitik dashboard.
  * Custom Turn / Canvas CSS 3D binder flip engine untuk Album Digital.
  * Smart Dynamic Tooltip preview gambar OBV & REV anti-terpotong (`tooltip-down` pada baris atas).

### C. Jaringan & Aksesibilitas
* **Lokal**: Port default `8000` via `run.bat` (`python main.py`).
* **Remote / Mobile Testing**: Cloudflare Quick Tunnel via `tunnel.bat` atau `run.py --tunnel` (`tools/bin/cloudflared.exe tunnel --url http://localhost:8000`).

---

## 3. Aturan Bisnis & Logika Domain Mutlak (Inviolable Domain Rules)

### 📌 Aturan 1: Pembagian Ongkir Rata (*Equal Split*) pada Pembelian Batch
* **Kaidah**: Pada pembelian lot/batch multi-item (misal: menang lelang FB/platform dengan ongkos kirim gabungan), **total ongkir HARUS dibagi RATA secara merata kepada semua item dalam batch**, **BUKAN** secara proporsional berdasarkan harga beli per item.
* **Formula**:
  $$\text{ongkir\_per\_item} = \frac{\text{total\_ongkir}}{\text{jumlah\_item\_dalam\_batch}}$$
  $$\text{HPP\_item} = \text{harga\_beli\_item} + \text{ongkir\_per\_item}$$
  $$\text{HPP\_per\_pcs} = \frac{\text{HPP\_item}}{\text{qty}}$$
* **Rasional Domain**: Dalam dunia lelang numismatik, ongkir adalah beban per paket kiriman fisik. Setiap keping item yang didapat membebani biaya logistik yang setara untuk sampai ke tangan kolektor.

### 📌 Aturan 2: Mekanisme Pecah Stok (*Stock Splitting*)
* Ketika kolektor membeli 1 bundel/lot berisi beberapa keping (misal: 10 keping) lalu ingin memecah 2 keping untuk dijual terpisah:
  1. Validasi: `qty_pecahan <= (parent.qty - parent.qty_terjual)`.
  2. Parent item: `qty` dikurangi sebesar `qty_pecahan`, HPP disesuaikan ulang.
  3. Child item: Dibuat sebagai record baru dengan flag `is_pecahan = 1`, `parent_id = parent.id`, dan **mewarisi `hpp_per_pcs` dari parent**, dengan `ongkir = 0` dan `harga = hpp_per_pcs * qty_pecahan`.

### 📌 Aturan 3: Validasi Stok & Perhitungan Laba Penjualan
* Validasi transaksi jual: Sisa stok (`qty - qty_terjual`) harus $\ge$ `qty_jual`.
* `hpp_pcs` pada tabel penjualan disalin langsung dari `koleksi.hpp_per_pcs` pada saat transaksi terjadi (mengunci historis biaya).
* Formula profit:
  $$\text{profit\_pcs} = \text{harga\_jual\_pcs} - \text{hpp\_pcs}$$
  $$\text{total\_profit} = \text{profit\_pcs} \times \text{qty\_jual}$$
  $$\text{margin} = \left(\frac{\text{total\_profit}}{\text{total\_jual}}\right) \times 100\%$$

### 📌 Aturan 4: Tata Kelola Album Digital 3D
* **Penomoran Lembar**: Menampilkan indikator halaman nyata, yaitu **"Lembar X/Y"** (halaman kiri) dan **"Lembar (X+1)/Y"** (halaman kanan).
* **Tema Sampul**: Mendukung 14 preset tema warna (Gold, Silver, Copper, Rose Gold, White Gold, Emerald, Navy, Burgundy, Purple, Violet, Yellow, Desert Sand, Vintage Leather, Onyx Black) dengan preview warna yang sinkron secara instan.
* **Modal Detail Koleksi**: Wajib berupa tampilan 2 kolom melebar (*ultra-wide*) agar seluruh detail numismatik dan foto OBV/REV langsung terlihat tanpa scroll berlebih.

---

## 4. Standar Kode & Konvensi Pengembangan

1. **Backend Routing**:
   * Seluruh API berada di bawah prefix `/api/`.
   * Penamaan router modular terpisah: `auth.py`, `koleksi.py`, `batch.py`, `penjualan.py`, `supplier.py`, `album.py`, `laporan.py`.
   * Selalu gunakan dependency injection `Depends(get_db)` dan `Depends(get_current_user)`.
2. **Frontend Scripting**:
   * Semua pemanggilan API wajib melalui wrapper `API.request()` di [`static/js/api.js`](file:///g:/AntigravityWorkspace/DashboardCollection/static/js/api.js) untuk menjamin penanganan token JWT dan auto-redirect 401.
   * Format moneter wajib menggunakan helper `formatRupiah(value)`.
   * Format tanggal wajib menggunakan helper `formatDate(isoString)`.
3. **Penyimpanan Berkas Statis**:
   * Foto item numismatik disimpan di `static/uploads/` dengan format nama UUID unik.

---

## 5. Batasan Lingkungan & Keamanan (Guardrails)

* ⛔ **Dilarang Keras Mengunggah (*Do Not Commit*)**:
  * Direktori virtual environment: `.venv/`
  * Direktori cache Python: `__pycache__/`, `*.pyc`
  * Binary Cloudflare executable: `tools/bin/cloudflared.exe` (55 MB+) atau binary di `tools/bin/`
  * Berkas database lokal jika mengandung informasi rahasia / credential privat.
* 🛡️ **Integritas Dokumentasi**:
  * Jangan menghapus atau mengubah dokumentasi historis di folder `docs/` tanpa alasan spesifik.
  * Setiap penambahan fitur utama wajib dicatat pada `docs/implementation_steps.md` dan `README.md`.
* 🔒 **Protokol Version Control & Git Push**:
  * **Tahan Git Push Otomatis**: Semua perubahan kode atau dokumen hanya di-commit di repositori Git lokal (`git commit`). Agen DILARANG melakukan `git push` ke remote GitHub secara mandiri tanpa instruksi / konfirmasi eksplisit dari pengguna.
  * **Pengingat / Konfirmasi Push**: Setiap kali selesai melakukan commit perubahan lokal, agen wajib memberikan pengingat dan meminta konfirmasi kepada pengguna apakah ingin melakukan `git push origin main`.
  * **Hanya Eksekusi Saat Diminta**: Perintah `git push` hanya dijalankan saat pengguna secara spesifik memerintahkan atau mengonfirmasikannya.

---

## 6. Runbook Operasional Cepat

| Perintah / Tindakan | Cara Eksekusi | Keterangan |
| :--- | :--- | :--- |
| **Menjalankan Server** | Dobel klik `run.bat` atau `python main.py` | Berjalan di `http://localhost:8000` |
| **Mengaktifkan Tunnel HP** | Dobel klik `tunnel.bat` | Menghasilkan tautan HTTPS publik |
| **Kredensial Bawaan** | `admin` / `admin123` | Default superuser saat database pertama diinisialisasi |
| **Commit Lokal** | `git commit -m "..."` | Komit perubahan ke repositori lokal |
| **Sinkronisasi Git Remote** | `git push origin main` | **Hanya dijalankan atas konfirmasi/perintah pengguna** |
