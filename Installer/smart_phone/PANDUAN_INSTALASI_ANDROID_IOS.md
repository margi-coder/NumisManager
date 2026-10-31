# 📱 Panduan Instalasi NumisManager untuk Smartphone (Android & iOS)

Subfolder **`Installer/smart_phone/`** ini berisi paket instalasi aplikasi **NumisManager** untuk perangkat **Android** dan **iOS (iPhone / iPad)**.

Aplikasi versi smartphone ini dilengkapi teknologi **Dual-Mode Engine**:
1. **📱 Mode Mandiri (100% Offline di HP)**:
   - Aplikasi berjalan langsung di dalam HP Anda **tanpa memerlukan server PC dan tanpa koneksi internet**.
   - Seluruh fitur (Dashboard, Entri Pembelian Tunggal & Batch/Lot, Katalog Koleksi & Stok, Kamera/Upload Foto OBV/REV/Pendukung, Album 3D Digital, Pencatatan Penjualan, Laporan, serta Backup/Restore JSON) tersimpan aman di memori internal perangkat HP Anda.
2. **🖥️ Mode Terhubung ke Server PC / Cloud Tunnel**:
   - Aplikasi di HP juga dapat dihubungkan langsung ke database Server NumisManager di PC Anda melalui jaringan **Wi-Fi LAN lokal** (contoh: `http://192.168.1.10:8000`) maupun tautan **Cloudflare Tunnel**.
   - Anda dapat berpindah mode kapan saja melalui tombol **`📱 Mode Offline HP ⚙️`** di pojok kiri bawah layar aplikasi.

---

## 📁 Daftar Berkas di Folder `Installer/smart_phone/`

| Nama Berkas | Platform Target | Fungsi Utama |
| :--- | :--- | :--- |
| **`NumisManager-Android-v1.0.0.apk`** | **Android** (HP & Tablet Android 5.0+) | Installer aplikasi Android native (`.apk`) yang sudah ditandatangani (*signed*). Langsung diinstal di HP Android tanpa internet. |
| **`NumisManager-iOS-v1.0.0.mobileconfig`** | **iOS / iPadOS** (iPhone & iPad) | Profil Konfigurasi Apple (*WebClip Application Profile*) yang menginstal ikon & aplikasi **NumisManager** layar penuh (*Full-Screen*) langsung ke Home Screen iPhone/iPad tanpa jailbreak dan tanpa komputer. |
| **`NumisManager-iOS-v1.0.0.ipa`** | **iOS / iPadOS** (Sideloading) | Paket arsip aplikasi iOS standar (`.ipa`) untuk instalasi menggunakan *AltStore*, *Sideloadly*, atau *TrollStore*. |
| **`NumisManager-Mobile-Offline-Standalone.html`** | **Universal (iOS & Android)** | Aplikasi *Single-File Portable* yang memuat seluruh antarmuka, mesin database offline, ikon, dan grafik dalam 1 berkas mandiri. Dapat langsung dibuka di aplikasi **Files** (iPhone/iPad) atau browser apa pun secara offline. |

---

## 🤖 A. Cara Instalasi di HP Android (`NumisManager-Android-v1.0.0.apk`)

1. Kirim atau salin berkas **`NumisManager-Android-v1.0.0.apk`** ke HP Android Anda (melalui kabel data USB, Bluetooth, WhatsApp, atau Flashdisk OTG).
2. Buka berkas **`NumisManager-Android-v1.0.0.apk`** melalui aplikasi **File Manager** di HP Android Anda.
3. Jika muncul peringatan keamanan *"Install unknown apps / Instal aplikasi tidak dikenal"*, ketuk **Settings (Pengaturan)** lalu aktifkan **"Allow from this source (Izinkan dari sumber ini)"**.
4. Ketuk tombol **Install (Instal)** dan tunggu beberapa detik hingga selesai.
5. Ketuk **Open (Buka)** atau buka aplikasi **NumisManager** dari layar utama HP Anda.
6. Login menggunakan akun bawaan:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## 🍎 B. Cara Instalasi di iPhone & iPad (iOS / iPadOS)

Apple iOS memiliki aturan keamanan khusus, sehingga kami menyediakan **3 metode instalasi** yang dapat Anda pilih sesuai kenyamanan Anda:

### Metode 1: Instal ke Home Screen via Profil `.mobileconfig` (Paling Mudah & Tanpa Komputer)
1. Kirim berkas **`NumisManager-iOS-v1.0.0.mobileconfig`** ke iPhone/iPad Anda (melalui AirDrop, iCloud Drive, kabel USB, atau buka melalui aplikasi **Files** lalu bagikan ke **Safari**).
2. Saat muncul notifikasi *"Profile Downloaded / Profil Diunduh"*, buka aplikasi **Settings (Pengaturan)** di iPhone/iPad Anda.
3. Ketuk menu **"Profile Downloaded" (Profil Diunduh)** di bagian atas Pengaturan (atau masuk ke *Settings -> General -> VPN & Device Management*).
4. Ketuk profil **NumisManager Mobile (Offline & Cloud Suite)**, lalu ketuk **Install (Instal)** di pojok kanan atas dan masukkan kode kunci layar iPhone Anda.
5. Aplikasi **NumisManager** kini terpasang di **Home Screen** iPhone/iPad Anda dengan ikon emas resmi dan berjalan dalam mode layar penuh (*Full-Screen App*).

### Metode 2: Langsung Buka Berkas Mandiri `NumisManager-Mobile-Offline-Standalone.html` (100% Offline)
1. Simpan berkas **`NumisManager-Mobile-Offline-Standalone.html`** ke dalam aplikasi **Files (File)** di iPhone/iPad (di folder *On My iPhone / Di iPhone Saya*).
2. Ketuk berkas tersebut untuk langsung menjalankan **NumisManager** secara offline, atau buka di **Safari** lalu ketuk tombol **Share (Bagikan)** -> **"Add to Home Screen (Tambahkan ke Layar Utama)"**.

### Metode 3: Instalasi Berkas `NumisManager-iOS-v1.0.0.ipa` (Via Sideloadly / AltStore / TrollStore)
Jika Anda terbiasa melakukan *sideload* aplikasi `.ipa` di iOS:
1. Hubungkan iPhone/iPad ke PC/Mac yang memiliki aplikasi **Sideloadly** atau **AltServer**, atau buka langsung melalui **TrollStore** di perangkat iOS.
2. Pilih berkas **`NumisManager-iOS-v1.0.0.ipa`** lalu klik **Start / Install**.
3. Setelah terpasang, percayai sertifikat pengembang di *Settings -> General -> VPN & Device Management*.

---

## 🔄 Cara Sinkronisasi Data antara HP dan PC (Tanpa Internet maupun Dengan Wi-Fi)

### 1. Sinkronisasi via File Backup JSON (100% Offline Tanpa Jaringan)
- Di PC atau di HP, buka menu **Backup & Restore Database**.
- Klik **"Unduh Backup Lengkap (.json)"**.
- Pindahkan berkas `.json` tersebut dari PC ke HP (atau sebaliknya), lalu pilih **"Pulihkan (Restore) dari File Backup"** di perangkat tujuan. Seluruh data koleksi, pembelian, penjualan, dan supplier akan langsung tersinkron!

### 2. Sinkronisasi Langsung ke Server PC via Wi-Fi LAN / Cloudflare Tunnel
1. Jalankan NumisManager di PC Anda (`Start-NumisManager.bat` atau `run.sh`).
2. Di aplikasi HP, ketuk tombol **`📱 Mode Offline HP ⚙️`** di pojok kiri bawah layar.
3. Pilih opsi **`🖥️ Terhubung ke Server PC / Cloud Tunnel`**.
4. Masukkan alamat IP lokal PC Anda (misalnya `http://192.168.1.10:8000`) atau URL Cloudflare Tunnel, lalu ketuk **Simpan & Terapkan**.
