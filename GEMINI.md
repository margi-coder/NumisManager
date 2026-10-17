# NumisManager - Antigravity Agent Guidelines & Operational Rules

Dokumen ini dibaca secara otomatis oleh Antigravity dan agen AI lainnya sebagai **panduan operasional langsung** saat bekerja di repositori ini. Untuk tata kelola strategis lengkap, rujuk [STEERING.md](file:///g:/AntigravityWorkspace/DashboardCollection/STEERING.md).

---

## 🎯 Prinsip Kerja Utama

1. **Integritas Dokumen & Kode Asal**:
   * Jangan mengubah atau memodifikasi file di `docs/` atau kode inti kecuali secara eksplisit diminta oleh pengguna.
   * Jaga keutuhan komentar dan docstrings yang ada.
2. **Kalkulasi Finansial Mutlak**:
   * **Ongkir Batch**: Selalu gunakan pembagian rata (*equal split*) per item, bukan proporsional nilai beli! Formula: `ongkir_per_item = total_ongkir / jumlah_item`.
   * **Pecah Stok**: Item anak (*child item*) mewarisi `hpp_per_pcs` dari item induk (*parent item*) dengan `ongkir = 0` dan flag `is_pecahan = 1`.
   * **Penjualan**: Validasi sisa stok `(qty - qty_terjual) >= qty_jual`, salin `hpp_pcs` dari `koleksi.hpp_per_pcs`, dan hitung laba bersih secara real-time.
3. **Konvensi Antarmuka & Visual (Album & Katalog)**:
   * **Tema Warna Album**: Mendukung 14 preset tema warna (Gold, Silver, Copper, Rose Gold, White Gold, Emerald, Navy, Burgundy, Purple, Violet, Yellow, Desert Sand, Vintage Leather, Onyx Black).
   * **Penomoran Lembar**: Gunakan format `Lembar X/Y` untuk halaman kiri dan kanan.
   * **Tooltip Cerdas**: Baris teratas tabel koleksi/stok wajib menggunakan kelas `tooltip-down` agar pratinjau foto tidak terpotong oleh batas layar atas.
   * **Modal Detail**: Harus berorientasi melebar (*ultra-wide*) 2 kolom tanpa scroll berlebih.
4. **Keamanan & Version Control**:
   * Jangan pernah meng-stage atau meng-commit file biner besar `cloudflared.exe` (55 MB+) atau folder `.venv/` / `__pycache__/`.
   * Jaga repository git lokal tetap tersinkronisasi bersih dengan remote `https://github.com/margi-coder/NumisManager.git`.
5. **Format Data**:
   * Mata uang: Gunakan `formatRupiah(value)` untuk tampilan IDR.
   * Tanggal: Gunakan `formatDate(value)` untuk format Indonesia yang konsisten.
