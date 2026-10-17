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

## ⚡ Manajemen Otomatis oleh `run.py`

Anda tidak perlu menginstal dependensi ini secara manual. Skrip peluncur **`run.py`** akan secara otomatis:
1. Mendeteksi apakah virtual environment (`.venv/`) sudah ada. Jika belum, `.venv/` akan otomatis dibuat sesuai OS Anda (`.venv\Scripts\` di Windows atau `.venv/bin/` di Linux/macOS).
2. Memeriksa kecukupan pustaka yang terpasang di `.venv`.
3. Menjalankan `pip install -r requirements.txt` secara otomatis jika ada pustaka yang belum terpasang.
