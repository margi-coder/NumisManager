# 📦 Panduan Instalasi Single Offline Installer NumisManager (Windows, Linux, & macOS)

Folder **`Installer/`** ini berisi paket **Single Offline Installer** yang telah memuat seluruh kebutuhan aplikasi **NumisManager** secara mandiri (*self-contained*), sehingga Anda dapat menginstal dan menjalankan aplikasi di komputer target **100% tanpa koneksi internet**.

---

## 📁 Daftar Berkas di Folder `Installer/`

1. **`NumisManager-Single-Offline-Installer-Windows.exe`** *(Khusus Windows 10 / 11 64-bit)*
   - **Isi Paket**:
     - Kode sumber lengkap aplikasi **NumisManager**
     - **Portable Python 3.14 Runtime (64-bit)** terintegrasi (`runtime/python/python.exe`) — **Komputer target TIDAK perlu menginstal Python terlebih dahulu!**
     - Seluruh pustaka Python (*FastAPI, Uvicorn, Pydantic, Python-Jose, Passlib, Bcrypt, Cryptography, OpenPyXL, Aiofiles, dll.*) yang sudah terpasang siap pakai di dalam runtime portable
     - 60 berkas paket *Offline Wheels* (`.whl`) cadangan di `dependencies/wheels/`
     - Pustaka grafik `Chart.js` lokal (`static/vendor/chartjs/chart.umd.min.js`)
     - Skema database SQLite otomatis (`database/schema.sql`)
2. **`NumisManager-Single-Offline-Installer-Linux-macOS.run`** *(Khusus Linux & macOS)*
   - **Isi Paket**:
     - Kode sumber lengkap aplikasi **NumisManager**
     - 60 berkas paket *Offline Python Wheels* (`.whl`) multi-platform (`manylinux2014_x86_64` & `py3-none-any`) di dalam `dependencies/wheels/`
     - Pustaka grafik `Chart.js` lokal (`static/vendor/chartjs/chart.umd.min.js`)
     - Skrip penginstal otomatis *Virtual Environment* (`.venv`) secara 100% offline (`pip install --no-index --find-links=dependencies/wheels`)
3. **`smart_phone/`** *(Subfolder Installer Smartphone Android & iOS)*
   - Berisi aplikasi `.apk` untuk Android serta paket `.mobileconfig`, `.ipa`, dan `.html` mandiri untuk iOS (iPhone/iPad). Lihat panduan lengkap di `smart_phone/PANDUAN_INSTALASI_ANDROID_IOS.md`.

---

## 🪟 1. Panduan Instalasi di Windows (100% Offline & Tanpa Perlu Instal Python)

### Langkah-langkah Instalasi (GUI):
1. Salin berkas **`NumisManager-Single-Offline-Installer-Windows.exe`** ke komputer Windows tujuan (misalnya lewat Flashdisk / Harddisk Eksternal).
2. Klik ganda (*double-click*) pada **`NumisManager-Single-Offline-Installer-Windows.exe`**.
   > **Catatan Windows SmartScreen**: Jika muncul jendela biru *"Windows protected your PC"*, klik **"More info"** lalu klik tombol **"Run anyway"**.
3. Pada jendela **NumisManager - Single Offline Installer**:
   - Pilih lokasi folder instalasi (bawaan: `C:\Users\<NamaUser>\AppData\Local\NumisManager` atau ubah ke lokasi pilihan Anda seperti `D:\NumisManager`).
   - Centang **"Buat Pintasan (Shortcut) NumisManager di Desktop"**.
   - Centang **"Jalankan Server NumisManager setelah instalasi selesai"**.
4. Klik tombol **"Instal Sekarang (Offline)"** dan tunggu hingga bilah progres mencapai **100%**.
5. Setelah selesai, browser akan otomatis membuka **`http://localhost:8000`**.

### Instalasi Tanpa Tampilan / Silent Mode (Opsional via Command Prompt / PowerShell):
```powershell
.\NumisManager-Single-Offline-Installer-Windows.exe --silent --dir="C:\NumisManager"
```

### Cara Menjalankan Aplikasi Sehari-hari di Windows:
- Klik ganda pintasan **`NumisManager`** di Desktop Anda, **ATAU**
- Buka folder instalasi lalu klik ganda **`Start-NumisManager.bat`** (atau **`run.bat`**).

---

## 🐧 2. Panduan Instalasi di Linux (Ubuntu, Debian, Fedora, Arch, Mint, dll.)

### Prasyarat Sistem Linux:
Pastikan paket dasar `python3` dan `python3-venv` bawaan distro Linux sudah aktif. Seluruh paket pustaka aplikasi (*FastAPI, Uvicorn, OpenPyXL, dll.*) **sudah dibundel di dalam file `.run`** dan akan diinstal tanpa internet.

### Langkah-langkah Instalasi:
1. Salin berkas **`NumisManager-Single-Offline-Installer-Linux-macOS.run`** ke komputer Linux.
2. Buka **Terminal** di folder tempat berkas tersebut berada, lalu jalankan perintah berikut:
   ```bash
   chmod +x NumisManager-Single-Offline-Installer-Linux-macOS.run
   ./NumisManager-Single-Offline-Installer-Linux-macOS.run
   ```
   *(Opsional: Untuk memilih lokasi folder instalasi khusus, gunakan flag `--dir=/lokasi/tujuan`, contoh: `./NumisManager-Single-Offline-Installer-Linux-macOS.run --dir=$HOME/Aplikasi/NumisManager`)*
3. Installer akan secara otomatis:
   - Mengekstrak seluruh berkas ke `~/NumisManager`
   - Membuat *Virtual Environment* (`.venv`)
   - Menginstal seluruh 60 paket `.whl` dari `dependencies/wheels/` secara **100% offline** (`--no-index`)
   - Membuat ikon peluncur aplikasi **NumisManager** di menu aplikasi Desktop Linux (`~/.local/share/applications/numismanager.desktop`).

### Cara Menjalankan Aplikasi di Linux:
```bash
cd ~/NumisManager
./run.sh
```
Lalu buka browser ke alamat **`http://localhost:8000`**.

---

## 🍎 3. Panduan Instalasi di macOS (Intel & Apple Silicon M1/M2/M3/M4)

### Langkah-langkah Instalasi:
1. Salin berkas **`NumisManager-Single-Offline-Installer-Linux-macOS.run`** ke Mac Anda.
2. Buka aplikasi **Terminal**, arahkan ke folder tempat berkas berada, lalu jalankan:
   ```bash
   chmod +x NumisManager-Single-Offline-Installer-Linux-macOS.run
   ./NumisManager-Single-Offline-Installer-Linux-macOS.run
   ```
3. Installer akan mengekstrak aplikasi ke `/Users/<NamaAnda>/NumisManager`, membuat `.venv`, dan memasang semua pustaka Python secara **offline** dari bundel roda paket yang disertakan.

### Cara Menjalankan Aplikasi di macOS:
- **Melalui Finder (Klik Ganda)**: Buka folder `~/NumisManager` di Finder, lalu klik ganda berkas **`Start-NumisManager.command`**.
- **Melalui Terminal**:
  ```bash
  cd ~/NumisManager
  ./run.sh
  ```
Lalu buka Safari / Chrome ke alamat **`http://localhost:8000`**.

---

## 🔑 Informasi Akun Login Bawaan

Saat pertama kali membuka **`http://localhost:8000`**, gunakan akun administrator bawaan berikut:
- **Username**: `admin`
- **Password**: `admin123`

> Anda dapat mengubah password atau menambahkan pengguna baru kapan saja melalui menu **Manajemen Data & Pengguna** di dalam aplikasi.
