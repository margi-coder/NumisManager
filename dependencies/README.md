# 📦 Dependencies Directory (Manajemen Dependensi & Pustaka)

Direktori ini mengelola seluruh dependensi pustaka Python yang dibutuhkan oleh sistem NumisManager di berbagai sistem operasi (Windows, Linux, macOS).

---

## Daftar Dependensi Inti:

| Pustaka | Versi | Fungsi |
| :--- | :--- | :--- |
| **`fastapi`** | `0.111.0` | Framework web ASGI performa tinggi untuk membangun REST API |
| **`uvicorn[standard]`** | `0.29.0` | Server HTTP ASGI cepat berbasis uvloop dan httptools |
| **`python-jose[cryptography]`** | `3.3.0` | Pembuatan & validasi JSON Web Token (JWT) untuk keamanan autentikasi |
| **`passlib[bcrypt]`** | `1.7.4` | Algoritma hashing kata sandi Bcrypt yang aman |
| **`python-multipart`** | `0.0.9` | Parser form-data untuk pengunggahan foto item koleksi |
| **`openpyxl`** | `3.1.2` | Pustaka manipulasi & ekspor laporan format spreadsheet Excel (.xlsx) |
| **`aiofiles`** | `23.2.1` | Penanganan I/O berkas asinkron untuk kinerja optimal server |

---

## ⚡ Manajemen Otomatis & Instalasi Offline (Tanpa Internet)

Direktori ini dilengkapi dengan folder **`dependencies/wheels/`** berisi 60 paket wheel biner offline (~20.2 MB) yang mendukung:
* **Windows**: Windows 11, 10, 8, 7 (64-bit AMD64/x86_64)
* **Linux**: Ubuntu, Debian, RedHat, CentOS, Fedora, Rocky Linux (manylinux 64-bit)
* **Semua OS**: Pustaka murni Python (*pure Python wheels*) yang bekerja lintas platform.

Skrip peluncur pintar **`run.py`** secara otomatis akan:
1. Mendeteksi folder `dependencies/wheels/`.
2. Menginstal seluruh paket menggunakan perintah offline:
   ```bash
   pip install --no-index --find-links=dependencies/wheels -r requirements.txt
   ```
3. Jika dijalankan di komputer yang **sama sekali tidak terhubung ke internet**, seluruh dependensi akan tetap terpasang dengan sukses dalam hitungan detik.
