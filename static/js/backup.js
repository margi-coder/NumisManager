/**
 * NumisManager - Database Backup & Snapshot Management Module
 */

async function loadBackup() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="backup-page">
      <div class="section-header">
        <div>
          <h3>Cadangan Database &amp; Snapshot Data</h3>
          <p class="input-hint">Pencadangan instan atomik berstempel waktu dengan verifikasi checksum SHA-256</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="triggerManualBackup()">
            <span>⚡ Buat Cadangan Sekarang</span>
          </button>
        </div>
      </div>

      <!-- Info Banner -->
      <div class="card" style="margin-bottom: 20px; background: rgba(212, 175, 55, 0.05); border: 1px solid var(--border-gold);">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="font-size: 32px; line-height: 1;">🛡️</div>
          <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
            <strong style="color: var(--gold-light);">Pencadangan Aman (Hot / Online Backup):</strong>
            NumisManager menggunakan SQLite Online Backup API yang menyalin halaman database secara atomik langsung saat server aktif tanpa risiko data corrupt atau penguncian tabel. Setiap arsip dikompresi ke format ZIP dengan integritas hash SHA-256 dan sistem otomatis menyimpan 15 cadangan terbaru.
          </div>
        </div>
      </div>

      <!-- Backups Table Card -->
      <div class="card">
        <div class="section-header" style="margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 15px; color: var(--text-primary);">Riwayat Berkas Cadangan Tersimpan</h4>
          <button class="btn btn-secondary btn-sm" onclick="fetchAndRenderBackups()">🔄 Segarkan</button>
        </div>
        <div id="backupTableContainer"></div>
      </div>
    </div>
  `;

  await fetchAndRenderBackups();
}

async function fetchAndRenderBackups() {
  renderLoading('backupTableContainer', 'Mengambil daftar cadangan...');

  try {
    const backups = await API.get('/backup/list');
    renderBackupTable(Array.isArray(backups) ? backups : []);
  } catch (err) {
    document.getElementById('backupTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat daftar cadangan: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

function renderBackupTable(backups) {
  const container = document.getElementById('backupTableContainer');
  if (!container) return;

  if (!backups || backups.length === 0) {
    renderEmpty(
      'backupTableContainer',
      'Belum Ada Berkas Cadangan',
      'Klik tombol "Buat Cadangan Sekarang" untuk membuat salinan snapshot database pertama Anda.',
      '<button class="btn btn-primary btn-sm" onclick="triggerManualBackup()">⚡ Buat Cadangan Sekarang</button>'
    );
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nama Berkas</th>
            <th>Ukuran</th>
            <th>Waktu Pembuatan</th>
            <th>Catatan</th>
            <th>Integritas (SHA-256)</th>
            <th style="text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  backups.forEach(b => {
    const sizeKb = (b.size_bytes / 1024).toFixed(1);
    const shortHash = b.sha256 ? `${b.sha256.substring(0, 10)}...${b.sha256.substring(b.sha256.length - 6)}` : '-';

    html += `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-family: monospace; font-size: 12.5px;">
            📦 ${escapeHtml(b.filename)}
          </div>
        </td>
        <td><span class="badge" style="background: rgba(255,255,255,0.06); font-family: monospace;">${sizeKb} KB</span></td>
        <td style="color: var(--text-secondary); font-size: 12px;">${escapeHtml(b.created_at || '-')}</td>
        <td style="font-size: 12px; color: var(--text-muted);">${escapeHtml(b.note || '-')}</td>
        <td>
          <code title="${escapeHtml(b.sha256 || '')}" style="cursor: pointer; color: var(--gold-light); font-size: 11px;" onclick="navigator.clipboard.writeText('${escapeHtml(b.sha256 || '')}'); showToast('SHA-256 disalin ke clipboard!', 'info');">
            ${shortHash} 📋
          </code>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="downloadBackupFile('${escapeHtml(b.filename)}')">
            ⬇️ Unduh ZIP
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

async function triggerManualBackup() {
  const note = prompt('Masukkan catatan cadangan (opsional):', 'Cadangan Manual dari UI Web');
  if (note === null) return; // cancelled

  showToast('Memproses snapshot database...', 'info', 2000);

  try {
    const res = await API.post('/backup/create', { catatan: note || 'Cadangan Manual' });
    showToast(`Cadangan berhasil dibuat: ${res.filename} (${(res.size_bytes / 1024).toFixed(1)} KB)`, 'success', 4000);
    await fetchAndRenderBackups();
  } catch (err) {
    showToast('Gagal membuat cadangan: ' + err.message, 'error');
  }
}

function downloadBackupFile(filename) {
  const token = API.getToken();
  const url = `/api/backup/download/${encodeURIComponent(filename)}?token=${encodeURIComponent(token || '')}`;
  window.open(url, '_blank');
}
