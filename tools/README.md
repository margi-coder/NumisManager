# 🛠️ Tools Directory (Utilitas & Binary Pembantu)

Direktori ini menampung berkas biner dan utilitas pendukung eksekusi aplikasi NumisManager.

---

## Isi Direktori:

* **`tools/bin/`**:
  * Folder penyimpanan binary pihak ketiga seperti **`cloudflared`** untuk membuat Cloudflare Quick Tunnel.
  * *Windows*: `tools/bin/cloudflared.exe`
  * *Linux*: `tools/bin/cloudflared` (ELF executable)
  * *macOS*: `tools/bin/cloudflared` (Mach-O executable)

---

## ⚡ Unduh Otomatis Multi-OS (Auto-Download)

Skrip peluncur pintar **`run.py`** secara otomatis akan:
1. Memeriksa keberadaan binary `cloudflared` di folder `tools/bin/` sesuai sistem operasi saat ini.
2. Jika belum tersedia dan opsi tunnel (`--tunnel` atau `tunnel.bat`) dijalankan, `run.py` akan langsung mengunduh binary resmi versi terbaru dari repositori Cloudflare GitHub release yang sesuai dengan arsitektur mesin Anda (Windows amd64, Linux amd64/arm64, macOS arm64/amd64).

> **Catatan Git**: Berkas binary besar di dalam `tools/bin/` otomatis diabaikan oleh `.gitignore` sehingga tidak membebani repositori Git Anda.
