# 📦 Vendor Libraries (Frontend Offline Dependencies)

Direktori ini menampung pustaka JavaScript dan CSS pihak ketiga yang dibundel secara lokal agar aplikasi **NumisManager dapat beroperasi 100% secara offline** tanpa ketergantungan koneksi internet ke CDN publik.

---

## Pustaka Tersedia:

* **`chartjs/chart.umd.min.js`**:
  * Versi: Chart.js 4.4.1 (UMD minified)
  * Digunakan untuk grafik analitik penjualan bulanan dan proporsi jenis koleksi pada Dashboard.
  * Dilengkapi mekanisme *fallback* ganda: memuat berkas lokal terlebih dahulu, lalu otomatis mengambil dari CDN jika berkas lokal tidak terbaca.
