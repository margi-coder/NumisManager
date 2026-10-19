/**
 * NumisManager - Sales & Profit Tracking Module
 */

let penjualanCurrentPage = 1;
const PENJUALAN_PAGE_LIMIT = 20;
let penjualanKoleksiItems = [];
let selectedPenjualanKoleksi = null;
let penjualanListCache = [];

async function loadPenjualan(page = 1) {
  penjualanCurrentPage = page;
  const contentArea = document.getElementById('contentArea');

  // Preserve filter values if already filled
  const fDari = document.getElementById('filterPenjualanDari')?.value || '';
  const fSampai = document.getElementById('filterPenjualanSampai')?.value || '';

  contentArea.innerHTML = `
    <div class="penjualan-page">
      <div class="section-header">
        <div>
          <h3>Pencatatan & Riwayat Penjualan</h3>
          <p class="input-hint">Catat transaksi penjualan item, kalkulasi otomatis margin laba, dan pantau omzet</p>
        </div>
      </div>

      <!-- Top Section: Form Input Penjualan Baru -->
      <div class="card" style="margin-bottom:28px;">
        <h4 style="margin-bottom:18px; color:var(--gold-light); display:flex; align-items:center; gap:8px;">
          <span>💰 Input Transaksi Penjualan Baru</span>
        </h4>

        <form id="newSaleForm" onsubmit="event.preventDefault(); submitNewSale();">
          <div class="data-grid-2">
            <!-- Left Sub-Form: Item & Harga -->
            <div>
              <div class="form-group">
                <label class="form-label">Pilih Item Koleksi dari Stok <span class="required">*</span></label>
                <select id="nsKoleksiSelect" class="form-select" onchange="handleSaleKoleksiChange()" required>
                  <option value="">-- Memuat daftar stok item... --</option>
                </select>
              </div>

              <div class="data-grid-2">
                <div class="form-group">
                  <label class="form-label">Qty Dijual (Pcs) <span class="required">*</span></label>
                  <input type="number" id="nsQty" class="form-control" min="1" value="1" required oninput="calculateSaleProfit()">
                  <span id="nsStokHint" class="input-hint">Sisa stok: -</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Harga Jual / Pcs (Rp) <span class="required">*</span></label>
                  <input type="number" id="nsHarga" class="form-control" min="0" value="0" required oninput="calculateSaleProfit()">
                  <span id="nsHppHint" class="input-hint">HPP/pcs: -</span>
                </div>
              </div>

              <!-- Live Profit Analysis Card -->
              <div style="background:rgba(18,21,28,0.85); border:1px solid var(--border-gold); border-radius:var(--radius-md); padding:16px; margin-top:8px;">
                <div style="font-size:12px; color:var(--gold-light); font-weight:700; text-transform:uppercase; margin-bottom:10px;">
                  ⚡ Analisis Margin & Profit Real-Time
                </div>
                <div class="data-grid-3">
                  <div>
                    <span style="font-size:11px; color:var(--text-muted);">Total Omzet Jual:</span>
                    <div id="nsPreviewOmzet" style="font-size:16px; font-weight:800; color:var(--text-primary); margin-top:2px;">Rp 0</div>
                  </div>
                  <div>
                    <span style="font-size:11px; color:var(--text-muted);">Total Laba Bersih:</span>
                    <div id="nsPreviewProfit" style="font-size:16px; font-weight:800; color:var(--success); margin-top:2px;">Rp 0</div>
                  </div>
                  <div>
                    <span style="font-size:11px; color:var(--text-muted);">Persentase Margin:</span>
                    <div id="nsPreviewMargin" style="font-size:16px; font-weight:800; color:var(--gold-light); margin-top:2px;">0%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Sub-Form: Pembeli & Platform -->
            <div>
              <div class="data-grid-2">
                <div class="form-group">
                  <label class="form-label">Nama Pembeli</label>
                  <input type="text" id="nsPembeli" class="form-control" placeholder="cth: Kolektor Pak Gunawan">
                </div>
                <div class="form-group">
                  <label class="form-label">Platform Penjualan</label>
                  <select id="nsPlatform" class="form-select">
                    ${PLATFORM_JUAL_OPTIONS.map(opt => `<option value="${opt}">${PLATFORM_LABELS[opt] || opt}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="data-grid-2">
                <div class="form-group">
                  <label class="form-label">Tanggal Transaksi</label>
                  <input type="date" id="nsTanggal" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                  <label class="form-label">Catatan Transaksi</label>
                  <input type="text" id="nsCatatan" class="form-control" placeholder="No. resi atau metode pembayaran">
                </div>
              </div>

              <div style="margin-top:24px;">
                <button type="submit" id="nsSubmitBtn" class="btn btn-primary" style="width:100%; height:48px; font-size:15px;">
                  <span>💾 Simpan & Rekam Transaksi Penjualan</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Bottom Section: Sales History & Metrics -->
      <div class="section-header">
        <h4>📋 Riwayat Transaksi Penjualan</h4>
      </div>

      <!-- Filters Bar with Live Filtering -->
      <div class="filter-bar" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
        <div style="flex:1; min-width:200px;">
          <input type="text" id="filterPenjualanSearch" class="form-control" placeholder="🔍 Cari item, kode jual, pembeli..." oninput="handleLivePenjualanFilter()">
        </div>

        <div style="width:170px;">
          <select id="filterPenjualanPlatform" class="form-select" onchange="fetchPenjualanHistory(1)">
            <option value="">Semua Platform</option>
            ${PLATFORM_JUAL_OPTIONS.map(opt => `<option value="${opt}">${PLATFORM_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:12px; color:var(--text-secondary);">Dari:</label>
          <input type="date" id="filterPenjualanDari" class="form-control" style="width:145px;" value="${escapeHtml(fDari)}" onchange="fetchPenjualanHistory(1)">
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:12px; color:var(--text-secondary);">Sampai:</label>
          <input type="date" id="filterPenjualanSampai" class="form-control" style="width:145px;" value="${escapeHtml(fSampai)}" onchange="fetchPenjualanHistory(1)">
        </div>

        <button class="btn btn-secondary btn-sm" onclick="resetPenjualanFilter()">Reset</button>
      </div>

      <div class="card">
        <div id="penjualanTableContainer"></div>
        <div id="penjualanPaginationContainer"></div>
      </div>
    </div>
  `;

  // Fetch available collections for sale select
  await loadKoleksiForSale();

  // Load sales history table
  await fetchPenjualanHistory(page);
}

const handleLivePenjualanFilter = typeof debounce === 'function'
  ? debounce(() => fetchPenjualanHistory(1), 300)
  : () => fetchPenjualanHistory(1);

function resetPenjualanFilter() {
  const q = document.getElementById('filterPenjualanSearch'); if (q) q.value = '';
  const p = document.getElementById('filterPenjualanPlatform'); if (p) p.value = '';
  const d = document.getElementById('filterPenjualanDari'); if (d) d.value = '';
  const s = document.getElementById('filterPenjualanSampai'); if (s) s.value = '';
  fetchPenjualanHistory(1);
}

async function loadKoleksiForSale() {
  const select = document.getElementById('nsKoleksiSelect');
  if (!select) return;

  try {
    const res = await API.get('/koleksi?limit=100&status_koleksi=stock_jual');
    const items = res.items || res.data || (Array.isArray(res) ? res : []);
    penjualanKoleksiItems = items;

    let html = '<option value="">-- Pilih Item Koleksi --</option>';
    items.forEach(it => {
      const sisa = it.qty_tersisa !== undefined ? it.qty_tersisa : (it.qty - (it.qty_terjual || 0));
      if (sisa > 0) {
        html += `<option value="${it.id}">
          ${escapeHtml(it.nama_item)} | Grade: ${it.grade || '-'} | Sisa: ${sisa} pcs | HPP: ${formatRupiah(it.hpp_per_pcs)}
        </option>`;
      }
    });

    select.innerHTML = html;
  } catch (err) {
    console.error('Failed to load koleksi for sales:', err);
    select.innerHTML = '<option value="">Gagal memuat item koleksi</option>';
  }
}

function handleSaleKoleksiChange() {
  const select = document.getElementById('nsKoleksiSelect');
  const id = parseInt(select.value, 10);
  selectedPenjualanKoleksi = penjualanKoleksiItems.find(it => it.id === id) || null;

  const stokHint = document.getElementById('nsStokHint');
  const hppHint = document.getElementById('nsHppHint');
  const qtyInput = document.getElementById('nsQty');
  const hargaInput = document.getElementById('nsHarga');

  if (selectedPenjualanKoleksi) {
    const sisa = selectedPenjualanKoleksi.qty_tersisa !== undefined
      ? selectedPenjualanKoleksi.qty_tersisa
      : (selectedPenjualanKoleksi.qty - (selectedPenjualanKoleksi.qty_terjual || 0));

    stokHint.textContent = `Sisa stok tersedia: ${sisa} pcs`;
    hppHint.textContent = `HPP modal per pcs: ${formatRupiah(selectedPenjualanKoleksi.hpp_per_pcs)}`;

    qtyInput.max = sisa;
    qtyInput.value = 1;
    hargaInput.value = selectedPenjualanKoleksi.harga_jual || selectedPenjualanKoleksi.hpp_per_pcs;
  } else {
    stokHint.textContent = 'Sisa stok: -';
    hppHint.textContent = 'HPP/pcs: -';
    qtyInput.value = 1;
    hargaInput.value = 0;
  }

  calculateSaleProfit();
}

function calculateSaleProfit() {
  const qty = parseInt(document.getElementById('nsQty')?.value || '1', 10);
  const hargaJual = parseFloat(document.getElementById('nsHarga')?.value || '0');
  const hppPcs = selectedPenjualanKoleksi ? (selectedPenjualanKoleksi.hpp_per_pcs || 0) : 0;

  const totalOmzet = qty * hargaJual;
  const totalHpp = qty * hppPcs;
  const totalProfit = totalOmzet - totalHpp;
  const marginPct = totalOmzet > 0 ? ((totalProfit / totalOmzet) * 100).toFixed(1) : 0;

  const previewOmzet = document.getElementById('nsPreviewOmzet');
  const previewProfit = document.getElementById('nsPreviewProfit');
  const previewMargin = document.getElementById('nsPreviewMargin');

  if (previewOmzet) previewOmzet.textContent = formatRupiah(totalOmzet);
  if (previewProfit) {
    previewProfit.textContent = formatRupiah(totalProfit);
    previewProfit.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (previewMargin) previewMargin.textContent = `${marginPct}%`;
}

async function submitNewSale() {
  const koleksiId = document.getElementById('nsKoleksiSelect')?.value;
  const qty = parseInt(document.getElementById('nsQty')?.value || '1', 10);
  const harga = parseFloat(document.getElementById('nsHarga')?.value || '0');
  const pembeli = document.getElementById('nsPembeli')?.value.trim() || null;
  const platform = document.getElementById('nsPlatform')?.value || 'direct';
  const tanggal = document.getElementById('nsTanggal')?.value || null;
  const catatan = document.getElementById('nsCatatan')?.value.trim() || null;

  if (!koleksiId) {
    showToast('Pilih item koleksi yang akan dijual terlebih dahulu.', 'warning');
    return;
  }

  if (qty <= 0) {
    showToast('Qty penjualan minimal 1 pcs.', 'warning');
    return;
  }

  const payload = {
    koleksi_id: parseInt(koleksiId, 10),
    qty_jual: qty,
    harga_jual_pcs: harga,
    pembeli,
    platform_jual: platform,
    tanggal_jual: tanggal,
    catatan
  };

  const btn = document.getElementById('nsSubmitBtn');
  if (btn) btn.disabled = true;

  try {
    await API.post('/penjualan', payload);
    showToast('Transaksi penjualan berhasil disimpan!', 'success');
    
    // Refresh page
    loadPenjualan(1);
  } catch (err) {
    showToast('Gagal mencatat penjualan: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function fetchPenjualanHistory(page = 1) {
  renderLoading('penjualanTableContainer', 'Memuat riwayat transaksi penjualan...');

  const fSearch = document.getElementById('filterPenjualanSearch')?.value.trim() || '';
  const fPlatform = document.getElementById('filterPenjualanPlatform')?.value || '';
  const fDari = document.getElementById('filterPenjualanDari')?.value || '';
  const fSampai = document.getElementById('filterPenjualanSampai')?.value || '';

  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', PENJUALAN_PAGE_LIMIT);
  if (fSearch) params.append('search', fSearch);
  if (fPlatform) params.append('platform_jual', fPlatform);
  if (fDari) params.append('tanggal_dari', fDari);
  if (fSampai) params.append('tanggal_sampai', fSampai);

  try {
    const res = await API.get(`/penjualan?${params.toString()}`);
    const list = res.items || res.data || (Array.isArray(res) ? res : []);
    const total = res.total ?? list.length;
    penjualanListCache = list;
    renderPenjualanTable(list, total, page);
  } catch (err) {
    console.error('Failed to load penjualan history:', err);
    document.getElementById('penjualanTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat riwayat penjualan: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

function renderPenjualanTable(data, total, page) {
  const container = document.getElementById('penjualanTableContainer');
  if (!container) return;

  if (!data || data.length === 0) {
    renderEmpty(
      'penjualanTableContainer',
      'Belum Ada Transaksi Penjualan',
      'Catat penjualan pertama Anda menggunakan form input di atas.'
    );
    document.getElementById('penjualanPaginationContainer').innerHTML = '';
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tanggal</th>
            <th>Item Koleksi</th>
            <th>Qty</th>
            <th>Harga/pcs</th>
            <th>HPP/pcs</th>
            <th>Total Jual</th>
            <th>Laba / Profit</th>
            <th>Margin</th>
            <th>Pembeli</th>
            <th>Platform</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(sale => {
    const totalJual = sale.total_jual !== undefined
      ? sale.total_jual
      : (Number(sale.qty_jual) * Number(sale.harga_jual_pcs));

    const hppPcs = sale.koleksi?.hpp_per_pcs ?? (sale.hpp_pcs ?? (sale.hpp_per_pcs ?? 0));
    const totalProfit = sale.total_profit !== undefined
      ? sale.total_profit
      : (totalJual - (Number(sale.qty_jual) * Number(hppPcs)));

    const marginPct = totalJual > 0 ? ((totalProfit / totalJual) * 100).toFixed(1) : 0;
    const profitCls = totalProfit >= 0 ? 'positive' : 'negative';

    html += `
      <tr>
        <td>${escapeHtml(sale.kode_jual || '#' + sale.id)}</td>
        <td>${formatDate(sale.tanggal_jual || sale.created_at)}</td>
        <td>
          <strong style="color:var(--text-primary); font-size:13.5px;">${escapeHtml(sale.nama_item || sale.koleksi?.nama_item || 'Item #' + (sale.koleksi_id || ''))}</strong>
          ${sale.grade || sale.koleksi?.grade ? `<div style="font-size:11px; margin-top:2px;">Grade: ${formatGrade(sale.grade || sale.koleksi?.grade)}</div>` : ''}
        </td>
        <td><strong>${sale.qty_jual}</strong> pcs</td>
        <td>${formatRupiah(sale.harga_jual_pcs)}</td>
        <td style="color:var(--text-secondary);">${formatRupiah(hppPcs)}</td>
        <td style="font-weight:700; color:var(--text-primary);">${formatRupiah(totalJual)}</td>
        <td>
          <span class="profit-badge ${profitCls}">
            ${totalProfit >= 0 ? '+' : ''}${formatRupiah(totalProfit)}
          </span>
        </td>
        <td style="font-weight:600; color:var(--gold-light);">${marginPct}%</td>
        <td>${escapeHtml(sale.pembeli || '-')}</td>
        <td><span class="badge" style="background:rgba(255,255,255,0.06); border:1px solid var(--border);">${PLATFORM_LABELS[sale.platform_jual] || sale.platform_jual || 'Direct'}</span></td>
        <td>
          <div class="td-actions">
            <button class="btn btn-secondary btn-sm" title="Cetak Nota Bukti Transaksi Resmi" onclick="printNotaPenjualan(${sale.id})">🧾 Nota</button>
            <button class="btn btn-secondary btn-sm" onclick="showEditPenjualanModal(${sale.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deletePenjualan(${sale.id})">Hapus</button>
          </div>
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
  renderPagination('penjualanPaginationContainer', page, total, PENJUALAN_PAGE_LIMIT, 'fetchPenjualanHistory');
}

/**
 * Modal Edit Penjualan
 */
function showEditPenjualanModal(id) {
  const sale = penjualanListCache.find(s => s.id === id);
  if (!sale) {
    showToast('Data penjualan tidak ditemukan.', 'error');
    return;
  }

  const body = `
    <form id="editSaleForm" onsubmit="event.preventDefault(); submitEditSale(${id});">
      <div style="margin-bottom:14px; background:rgba(212,175,55,0.08); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-gold);">
        <div style="font-size:12px; color:var(--text-muted);">Item Transaksi:</div>
        <div style="font-weight:700; color:var(--gold-light); font-size:14.5px;">${escapeHtml(sale.nama_item || sale.koleksi?.nama_item || 'Item #' + sale.koleksi_id)}</div>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Qty Terjual <span class="required">*</span></label>
          <input type="number" id="esQty" class="form-control" value="${sale.qty_jual}" min="1" required>
        </div>
        <div class="form-group">
          <label class="form-label">Harga Jual / Pcs (Rp) <span class="required">*</span></label>
          <input type="number" id="esHarga" class="form-control" value="${sale.harga_jual_pcs}" min="0" required>
        </div>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Nama Pembeli</label>
          <input type="text" id="esPembeli" class="form-control" value="${escapeHtml(sale.pembeli || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Platform</label>
          <select id="esPlatform" class="form-select">
            ${PLATFORM_JUAL_OPTIONS.map(opt => `<option value="${opt}" ${opt === sale.platform_jual ? 'selected' : ''}>${PLATFORM_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Tanggal Penjualan</label>
          <input type="date" id="esTanggal" class="form-control" value="${sale.tanggal_jual ? sale.tanggal_jual.split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Catatan</label>
          <input type="text" id="esCatatan" class="form-control" value="${escapeHtml(sale.catatan || '')}">
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-primary" onclick="submitEditSale(${id})">Simpan Perubahan</button>
  `;

  openModal({
    title: `✏️ Edit Transaksi Penjualan #${id}`,
    body,
    footer,
    size: 'md'
  });
}

async function submitEditSale(id) {
  const qty = parseInt(document.getElementById('esQty')?.value || '1', 10);
  const harga = parseFloat(document.getElementById('esHarga')?.value || '0');
  const pembeli = document.getElementById('esPembeli')?.value.trim() || null;
  const platform = document.getElementById('esPlatform')?.value;
  const tanggal = document.getElementById('esTanggal')?.value || null;
  const catatan = document.getElementById('esCatatan')?.value.trim() || null;

  const payload = {
    qty_jual: qty,
    harga_jual_pcs: harga,
    pembeli,
    platform_jual: platform,
    tanggal_jual: tanggal,
    catatan
  };

  try {
    await API.put(`/penjualan/${id}`, payload);
    showToast('Transaksi penjualan diperbarui!', 'success');
    closeModal();
    fetchPenjualanHistory(penjualanCurrentPage);
  } catch (err) {
    showToast('Gagal memperbarui transaksi: ' + err.message, 'error');
  }
}

async function deletePenjualan(id) {
  if (!confirm(`Hapus data penjualan #${id}? Stok item koleksi akan dikembalikan (restock).`)) {
    return;
  }

  try {
    await API.delete(`/penjualan/${id}`);
    showToast(`Transaksi #${id} telah dihapus dan stok dikembalikan.`, 'success');
    fetchPenjualanHistory(penjualanCurrentPage);
  } catch (err) {
    showToast('Gagal menghapus transaksi: ' + err.message, 'error');
  }
}

/**
 * Membuka jendela pracetak nota penjualan resmi
 */
function printNotaPenjualan(id) {
  const token = API.getToken();
  const url = `/api/penjualan/${id}/nota-html?token=${encodeURIComponent(token || '')}`;
  window.open(url, '_blank', 'width=780,height=850');
}
