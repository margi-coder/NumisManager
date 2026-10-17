let isAdvFilterOpen = false;
/**
 * NumisManager - Koleksi & Stock Inventory Management Module
 */

let koleksiCurrentPage = 1;
const KOLEKSI_PAGE_LIMIT = 20;
let koleksiItemsCache = [];

async function loadKoleksi(page = 1) {
  koleksiCurrentPage = page;
  const contentArea = document.getElementById('contentArea');
  const tableContainer = document.getElementById('koleksiTableContainer');

  // Maintain filter values if already rendered, else empty
  let currentSearch = document.getElementById('filterSearch')?.value || '';
  let currentJenis = document.getElementById('filterJenis')?.value || '';
  let currentGrade = document.getElementById('filterGrade')?.value || '';
  let currentStatusKoleksi = document.getElementById('filterStatusKoleksi')?.value || '';
  let currentStatus = document.getElementById('filterStatus')?.value || '';

  // Only render the wrapper if not yet present in DOM
  if (!tableContainer) {
    contentArea.innerHTML = `
      <div class="koleksi-page">
        <div class="section-header">
          <div>
            <h3>Katalog Koleksi & Stok Numismatik</h3>
            <p class="input-hint">Inventaris lengkap koin, uang kertas kuno, nomor seri, grading, dan HPP</p>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-secondary" onclick="window.router.navigate('pembelian-single')">
              <span>+ Entri Item Baru</span>
            </button>
            <button class="btn btn-primary" onclick="window.router.navigate('penjualan')">
              <span>💰 Input Penjualan</span>
            </button>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="filter-bar" id="koleksiFilterBar">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="filterSearch" 
              class="form-control" 
              placeholder="Cari nama item, kode item, tahun, nomor seri..."
              value="${escapeHtml(currentSearch)}"
              onkeydown="if(event.key==='Enter') loadKoleksi(1)"
            >
          </div>

          <select id="filterJenis" class="form-select" style="max-width:170px;" onchange="loadKoleksi(1)">
            <option value="">Semua Jenis</option>
            ${JENIS_OPTIONS.map(opt => `<option value="${opt}" ${opt === currentJenis ? 'selected' : ''}>${JENIS_LABELS[opt] || opt}</option>`).join('')}
          </select>

          <select id="filterGrade" class="form-select" style="max-width:140px;" onchange="loadKoleksi(1)">
            <option value="">Semua Grade</option>
            ${GRADE_OPTIONS.map(opt => `<option value="${opt}" ${opt === currentGrade ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>

          <select id="filterStatusKoleksi" class="form-select" style="max-width:170px;" onchange="loadKoleksi(1)">
            <option value="">Semua Tujuan</option>
            ${STATUS_KOLEKSI_OPTIONS.map(opt => `<option value="${opt}" ${opt === currentStatusKoleksi ? 'selected' : ''}>${STATUS_KOLEKSI_LABELS[opt] || opt}</option>`).join('')}
          </select>

          <select id="filterStatus" class="form-select" style="max-width:150px;" onchange="loadKoleksi(1)">
            <option value="">Semua Status</option>
            ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
          </select>

          <button class="btn btn-secondary btn-sm" onclick="loadKoleksi(1)">Filter</button>
          <button class="btn btn-secondary btn-sm" onclick="resetKoleksiFilters()">Reset</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btnToggleAdvFilter" onclick="toggleAdvancedFilter()" style="display:flex; align-items:center; gap:6px;">
            <span>⚙️ Filter Lanjutan</span> <span id="advFilterArrow">▼</span>
          </button>
        </div>

        <!-- Advanced Filter Collapsible Panel -->
        <div id="advancedFilterPanel" class="card" style="display:none; margin-bottom:18px; background:rgba(22, 26, 36, 0.95); border:1px solid var(--border-gold); padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h4 style="margin:0; font-size:14.5px; color:var(--gold-light); display:flex; align-items:center; gap:8px;">
                <span>⚙️ Filter Lanjutan (Multi-Kriteria)</span>
              </h4>
              <p style="font-size:12px; color:var(--text-muted); margin:3px 0 0;">Filter spesifik rentang harga HPP, tahun, nomor seri, asal negara, hingga catatan item</p>
            </div>
          </div>

          <div class="data-grid-4">
            <div class="form-group">
              <label class="form-label">HPP Modal Min (Rp)</label>
              <input type="number" id="advHppMin" class="form-control" placeholder="cth: 5000" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">HPP Modal Max (Rp)</label>
              <input type="number" id="advHppMax" class="form-control" placeholder="cth: 500000" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Tahun Emisi Dari</label>
              <input type="text" id="advTahunDari" class="form-control" placeholder="cth: 1945">
            </div>
            <div class="form-group">
              <label class="form-label">Tahun Emisi Sampai</label>
              <input type="text" id="advTahunSampai" class="form-control" placeholder="cth: 1999">
            </div>
          </div>

          <div class="data-grid-4">
            <div class="form-group">
              <label class="form-label">Asal Negara</label>
              <input type="text" id="advNegara" class="form-control" placeholder="cth: Indonesia">
            </div>
            <div class="form-group">
              <label class="form-label">Nomor Seri (Spesifik)</label>
              <input type="text" id="advNomorSeri" class="form-control" placeholder="cth: ABC / 888888">
            </div>
            <div class="form-group">
              <label class="form-label">Kode Item</label>
              <input type="text" id="advKodeItem" class="form-control" placeholder="cth: ITM-20261014-001">
            </div>
            <div class="form-group">
              <label class="form-label">Batch Pembelian</label>
              <select id="advBatchId" class="form-select">
                <option value="">Semua Batch</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Pencarian di Catatan / Keterangan / Sertifikasi</label>
            <input type="text" id="advCatatan" class="form-control" placeholder="cth: PMG, lelang, lipatan, utuh, dll...">
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="resetAllKoleksiFilters()">🔄 Reset Semua Filter</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="loadKoleksi(1)">🔍 Terapkan Filter Lanjutan</button>
          </div>
        </div>

        <!-- Main Collection Card -->
        <div class="card" style="overflow: visible;">
          <div id="koleksiTableContainer"></div>
          <div id="koleksiPaginationContainer"></div>
        </div>
      </div>
    `;
  }

  renderLoading('koleksiTableContainer', 'Memuat katalog koleksi...');

  // Advanced filter inputs
  const advHppMin = document.getElementById('advHppMin')?.value;
  const advHppMax = document.getElementById('advHppMax')?.value;
  const advTahunDari = document.getElementById('advTahunDari')?.value?.trim();
  const advTahunSampai = document.getElementById('advTahunSampai')?.value?.trim();
  const advNegara = document.getElementById('advNegara')?.value?.trim();
  const advNomorSeri = document.getElementById('advNomorSeri')?.value?.trim();
  const advKodeItem = document.getElementById('advKodeItem')?.value?.trim();
  const advBatchId = document.getElementById('advBatchId')?.value;
  const advCatatan = document.getElementById('advCatatan')?.value?.trim();

  // Build query string
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', KOLEKSI_PAGE_LIMIT);
  if (currentSearch) params.append('search', currentSearch);
  if (currentJenis) params.append('jenis', currentJenis);
  if (currentGrade) params.append('grade', currentGrade);
  if (currentStatusKoleksi) params.append('status_koleksi', currentStatusKoleksi);
  if (currentStatus) params.append('status', currentStatus);

  if (advHppMin) params.append('hpp_min', advHppMin);
  if (advHppMax) params.append('hpp_max', advHppMax);
  if (advTahunDari) params.append('tahun_dari', advTahunDari);
  if (advTahunSampai) params.append('tahun_sampai', advTahunSampai);
  if (advNegara) params.append('negara', advNegara);
  if (advNomorSeri) params.append('nomor_seri', advNomorSeri);
  if (advKodeItem) params.append('kode_item', advKodeItem);
  if (advBatchId) params.append('batch_id', advBatchId);
  if (advCatatan) params.append('catatan', advCatatan);

  try {
    const res = await API.get(`/koleksi?${params.toString()}`);
    const items = res.items || res.data || (Array.isArray(res) ? res : []);
    const total = res.total ?? items.length;
    koleksiItemsCache = items;
    renderKoleksiTable(items, total, page);
  } catch (err) {
    console.error('Error fetching koleksi:', err);
    document.getElementById('koleksiTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat koleksi: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}


function toggleAdvancedFilter() {
  const panel = document.getElementById('advancedFilterPanel');
  const arrow = document.getElementById('advFilterArrow');
  if (!panel) return;
  isAdvFilterOpen = !isAdvFilterOpen;
  panel.style.display = isAdvFilterOpen ? 'block' : 'none';
  if (arrow) arrow.textContent = isAdvFilterOpen ? '▲' : '▼';
  if (isAdvFilterOpen) {
    loadBatchesIntoAdvFilter();
  }
}

async function loadBatchesIntoAdvFilter() {
  const select = document.getElementById('advBatchId');
  if (!select || select.dataset.loaded === 'true') return;
  try {
    const res = await API.get('/batch?limit=100');
    const batches = res.items || res.data || [];
    let html = '<option value="">Semua Batch</option>';
    batches.forEach(b => {
      const title = b.nama_batch || b.nama || b.kode_batch || ('Batch #' + b.id);
      html += `<option value="${b.id}">${escapeHtml(b.kode_batch || '#' + b.id)} - ${escapeHtml(title)}</option>`;
    });
    select.innerHTML = html;
    select.dataset.loaded = 'true';
  } catch (err) {
    console.error('Failed to load batches for filter:', err);
  }
}

function resetAllKoleksiFilters() {
  resetKoleksiFilters();
  const elHppMin = document.getElementById('advHppMin'); if (elHppMin) elHppMin.value = '';
  const elHppMax = document.getElementById('advHppMax'); if (elHppMax) elHppMax.value = '';
  const elTahunDari = document.getElementById('advTahunDari'); if (elTahunDari) elTahunDari.value = '';
  const elTahunSampai = document.getElementById('advTahunSampai'); if (elTahunSampai) elTahunSampai.value = '';
  const elNegara = document.getElementById('advNegara'); if (elNegara) elNegara.value = '';
  const elNomorSeri = document.getElementById('advNomorSeri'); if (elNomorSeri) elNomorSeri.value = '';
  const elKodeItem = document.getElementById('advKodeItem'); if (elKodeItem) elKodeItem.value = '';
  const elBatchId = document.getElementById('advBatchId'); if (elBatchId) elBatchId.value = '';
  const elCatatan = document.getElementById('advCatatan'); if (elCatatan) elCatatan.value = '';
  loadKoleksi(1);
}

function resetKoleksiFilters() {
  const s = document.getElementById('filterSearch'); if (s) s.value = '';
  const j = document.getElementById('filterJenis'); if (j) j.value = '';
  const g = document.getElementById('filterGrade'); if (g) g.value = '';
  const sk = document.getElementById('filterStatusKoleksi'); if (sk) sk.value = '';
  const st = document.getElementById('filterStatus'); if (st) st.value = '';
  loadKoleksi(1);
}

function renderKoleksiTable(data, total, page) {
  const container = document.getElementById('koleksiTableContainer');
  if (!container) return;

  if (!data || data.length === 0) {
    renderEmpty(
      'koleksiTableContainer',
      'Tidak Ada Item Ditemukan',
      'Tidak ada data koleksi yang cocok dengan filter pencarian.',
      '<button class="btn btn-primary btn-sm" onclick="window.router.navigate(\'pembelian-single\')">+ Tambah Koleksi Baru</button>'
    );
    document.getElementById('koleksiPaginationContainer').innerHTML = '';
    return;
  }

  let html = `
    <div class="table-wrapper table-compact">
      <table>
        <thead>
          <tr>
            <th>Nama Item</th>
            <th>Nomor Seri</th>
            <th>Tahun</th>
            <th>Grade</th>
            <th>HPP/pcs</th>
            <th style="text-align:center;">Tujuan</th>
            <th style="text-align:center;">Status</th>
            <th style="text-align:center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v12M15 9.5a3.5 3.5 0 0 0-5 0c0 2 5 2 5 4.5a3.5 3.5 0 0 1-5 0'/%3E%3C/svg%3E`;

  data.forEach((item, index) => {
    const fotoObv = item.foto_obv || item.foto_path || item.foto_url || item.foto;
    const fotoRev = item.foto_rev;
    const hasPhoto = Boolean(fotoObv || fotoRev);

    const qtyTersisa = item.qty_tersisa !== undefined ? item.qty_tersisa : (item.qty - (item.qty_terjual || 0));
    const isHabis = qtyTersisa <= 0;

    const jenisIco = typeof getJenisIcon === 'function' ? getJenisIcon(item.jenis) : '📄';

    const isTopRow = index < 3;
    const tooltipClass = isTopRow ? 'photo-hover-tooltip tooltip-down' : 'photo-hover-tooltip';
    const tooltipStyle = isTopRow ? 'top: calc(100% + 8px); bottom: auto;' : '';

    let photoTooltipHtml = '';
    if (hasPhoto) {
      photoTooltipHtml = `
        <div class="${tooltipClass}" ${tooltipStyle ? `style="${tooltipStyle}"` : ''}>
          <div class="photo-hover-tooltip-dual">
            ${fotoObv ? `
              <div class="photo-hover-item">
                <img src="${escapeHtml(fotoObv)}" alt="OBV" onerror="this.onerror=null; this.src='/static/img/logo.png';">
                <div class="photo-hover-tag">OBV (Muka)</div>
              </div>
            ` : ''}
            ${fotoRev ? `
              <div class="photo-hover-item">
                <img src="${escapeHtml(fotoRev)}" alt="REV" onerror="this.onerror=null; this.src='/static/img/logo.png';">
                <div class="photo-hover-tag">REV (Belakang)</div>
              </div>
            ` : ''}
          </div>
          <div class="tooltip-caption">${escapeHtml(item.nama_item)}</div>
        </div>
      `;
    }

    const tujuanIconBadge = typeof formatTujuanIconOnly === 'function' 
      ? formatTujuanIconOnly(item.status_koleksi) 
      : formatStatusKoleksi(item.status_koleksi);

    const statusIconBadge = typeof formatStatusIconOnly === 'function'
      ? formatStatusIconOnly(item.status)
      : formatStatus(item.status);

    html += `
      <tr>
        <td class="item-name-hover">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="jenis-inline-icon" title="${escapeHtml(JENIS_LABELS[item.jenis] || item.jenis || '')}">${jenisIco}</span>
            <span style="font-weight:600; color:var(--text-primary); cursor:pointer;" onclick="showViewItemModal(${item.id})" title="Klik untuk lihat rincian">${escapeHtml(item.nama_item)}</span>
            ${hasPhoto ? `<span class="photo-indicator" title="Arahkan kursor untuk melihat foto depan/belakang" onclick="showViewItemModal(${item.id})">📷</span>` : ''}
          </div>
          ${photoTooltipHtml}
        </td>
        <td>
          ${item.nomor_seri ? `<code style="font-weight:600; color:var(--gold-light);">${escapeHtml(item.nomor_seri)}</code>` : '<span style="color:var(--text-muted);">-</span>'}
          ${item.kode_item ? `<div style="font-size:10px; color:var(--text-muted); font-family:monospace; margin-top:2px;">${escapeHtml(item.kode_item)}</div>` : ''}
        </td>
        <td>${escapeHtml(item.tahun || '-')}</td>
        <td>${formatGrade(item.grade)}</td>
        <td style="font-weight:600;">${formatRupiah(item.hpp_per_pcs)}</td>
        <td style="text-align:center;">${tujuanIconBadge}</td>
        <td style="text-align:center;">${statusIconBadge}</td>
        <td>
          <div class="td-actions" style="justify-content:center;">
            <button class="btn btn-secondary btn-icon" title="Lihat Rincian &amp; Galeri Foto Lengkap" onclick="showViewItemModal(${item.id})">👁️</button>
            <button class="btn btn-secondary btn-icon" title="Edit Koleksi" onclick="showEditKoleksiModal(${item.id})">✏️</button>
            <button class="btn btn-secondary btn-icon" title="Cetak Label Holder (2x2 inci)" onclick="printHolderLabel(${item.id})">🏷️</button>
            <button class="btn btn-secondary btn-icon" title="Kelola Foto &amp; Galeri Multi-Foto (OBV/REV, Watermark, Slab, dll.)" onclick="showUploadFotoModal(${item.id}, '${escapeHtml(item.nama_item)}')">📸</button>
            <button class="btn btn-secondary btn-icon" title="Pecah Stok Jadi Item Baru" onclick="showPecahStokModal(${item.id}, ${qtyTersisa})" ${isHabis ? 'disabled' : ''}>✂️</button>
            <button class="btn btn-success btn-icon" title="Quick Sale / Jual Item" onclick="showQuickSaleModal(${item.id})" ${isHabis ? 'disabled' : ''}>💰</button>
            <button class="btn btn-danger btn-icon" title="Hapus Koleksi" onclick="deleteKoleksi(${item.id}, '${escapeHtml(item.nama_item)}')">🗑️</button>
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

  // Pagination
  renderPagination('koleksiPaginationContainer', page, total, KOLEKSI_PAGE_LIMIT, 'loadKoleksi');
}

/**
 * Image Lightbox Preview
 */
function viewImageLightbox(url, title) {
  openGlobalLightbox(url, title);
}

/**
 * Membuka jendela pracetak label stiker holder koin/uang kertas (2x2 inci / 5x5 cm)
 */
function printHolderLabel(id) {
  const token = API.getToken();
  const url = `/api/koleksi/${id}/label-html?token=${encodeURIComponent(token || '')}`;
  window.open(url, '_blank', 'width=520,height=560');
}


/**
 * Modal View Detail Item Koleksi
 */
async function showViewItemModal(id) {
  try {
    let item = await API.get(`/koleksi/${id}`);

    const fotoObv = item.foto_obv || item.foto_path || item.foto_url || item.foto;
    const fotoRev = item.foto_rev;
    const qtyTersisa = item.qty_tersisa !== undefined ? item.qty_tersisa : (item.qty - (item.qty_terjual || 0));
    const isHabis = qtyTersisa <= 0;
    const jenisIco = typeof getJenisIcon === 'function' ? getJenisIcon(item.jenis) : '📄';

    const safeTitleObv = escapeHtml((item.nama_item || 'Koleksi') + ' - Obverse');
    const safeTitleRev = escapeHtml((item.nama_item || 'Koleksi') + ' - Reverse');

    const body = `
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Header Info & Photos -->
        <div style="display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap;">
          
          <!-- Dual Photos (OBV & REV) -->
          <div style="display:flex; gap:14px; flex-shrink:0;">
            <!-- Obverse Card -->
            <div style="width:180px; text-align:center;">
              <div style="width:180px; height:105px; border-radius:10px; background:#0a0c10; border:1px solid var(--border-gold); overflow:hidden; display:flex; align-items:center; justify-content:center; padding:4px; box-shadow: inset 0 0 14px rgba(0,0,0,0.8);">
                ${fotoObv ? `
                  <img src="${escapeHtml(fotoObv)}" style="max-width:100%; max-height:100%; object-fit:contain; cursor:zoom-in; border-radius:4px;" onclick="openGlobalLightbox('${escapeHtml(fotoObv)}', '${safeTitleObv}')" title="Tampak Depan (Klik untuk memperbesar)" onerror="this.onerror=null; this.src='/static/img/logo.png';">
                ` : `
                  <div style="text-align:center; color:var(--text-muted); font-size:11px;">
                    <div style="font-size:26px; margin-bottom:2px;">🪙</div>
                    Tanpa OBV
                  </div>
                `}
              </div>
              <div style="font-size:11px; color:var(--gold-light); font-weight:700; margin-top:6px;">📸 OBV (Tampak Depan)</div>
            </div>

            <!-- Reverse Card -->
            <div style="width:180px; text-align:center;">
              <div style="width:180px; height:105px; border-radius:10px; background:#0a0c10; border:1px solid var(--border-gold); overflow:hidden; display:flex; align-items:center; justify-content:center; padding:4px; box-shadow: inset 0 0 14px rgba(0,0,0,0.8);">
                ${fotoRev ? `
                  <img src="${escapeHtml(fotoRev)}" style="max-width:100%; max-height:100%; object-fit:contain; cursor:zoom-in; border-radius:4px;" onclick="openGlobalLightbox('${escapeHtml(fotoRev)}', '${safeTitleRev}')" title="Tampak Belakang (Klik untuk memperbesar)" onerror="this.onerror=null; this.src='/static/img/logo.png';">
                ` : `
                  <div style="text-align:center; color:var(--text-muted); font-size:11px;">
                    <div style="font-size:26px; margin-bottom:2px;">🪙</div>
                    Tanpa REV
                  </div>
                `}
              </div>
              <div style="font-size:11px; color:var(--gold-light); font-weight:700; margin-top:6px;">📸 REV (Tampak Belakang)</div>
            </div>
          </div>

          <!-- Metadata Header -->
          <div style="flex-grow:1; min-width:240px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span style="font-size:22px;">${jenisIco}</span>
              <h3 style="margin:0; font-size:18px; color:var(--text-primary); font-weight:700;">${escapeHtml(item.nama_item)}</h3>
            </div>

            <!-- Badges Bar: Kode Item & Kode Batch -->
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center;">
              <span class="badge" style="background:rgba(212,175,55,0.15); color:var(--gold-light); border:1px solid var(--border-gold); font-size:11.5px; font-family:monospace;">
                Kode: ${escapeHtml(item.kode_item || ('ITM-' + item.id))}
              </span>
              ${item.batch_kode ? `
                <span class="badge" style="background:rgba(91,156,240,0.15); color:var(--info); border:1px solid rgba(91,156,240,0.3); font-size:11.5px; font-family:monospace;">
                  Batch: ${escapeHtml(item.batch_kode)} ${item.batch_nama ? `(${escapeHtml(item.batch_nama)})` : ''}
                </span>
              ` : `
                <span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted); font-size:11px;">
                  Single (Non-Batch)
                </span>
              `}
              ${formatGrade(item.grade)}
              ${formatJenis(item.jenis)}
              ${formatStatusKoleksi(item.status_koleksi)}
              ${formatStatus(item.status)}
            </div>

            ${item.nomor_seri ? `<div style="font-size:13.5px; color:var(--gold-light); margin-bottom:6px;"><strong>Nomor Seri:</strong> <code>${escapeHtml(item.nomor_seri)}</code></div>` : ''}
            ${item.lembaga_grading && item.lembaga_grading !== '-' ? `
              <div style="margin: 8px 0; display: inline-flex; align-items: center; gap: 8px; background: rgba(212, 175, 55, 0.1); border: 1px solid var(--border-gold); padding: 5px 10px; border-radius: 6px;">
                <span style="font-size: 14px;">🏛️</span>
                <span style="font-size: 12.5px; font-weight: 800; color: var(--gold-light);">
                  ${escapeHtml(item.lembaga_grading)} ${escapeHtml(item.grade_numerik || item.grade || '')}
                </span>
                ${item.nomor_sertifikasi ? `<span style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">#${escapeHtml(item.nomor_sertifikasi)}</span>` : ''}
                ${item.grading_url ? `<a href="${escapeHtml(item.grading_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--info); text-decoration: underline; margin-left: 4px;">Verifikasi ↗</a>` : ''}
              </div>
            ` : ''}
            ${(item.detail || item.sertifikasi) ? `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;"><strong>Detail / Sertifikasi:</strong> ${escapeHtml(item.detail || item.sertifikasi)}</div>` : ''}
            ${item.catatan_internal || item.catatan ? `<div style="font-size:12px; color:var(--text-muted); font-style:italic; margin-top:4px;">"${escapeHtml(item.catatan_internal || item.catatan)}"</div>` : ''}
          </div>
        </div>

        <!-- Multi-Photo Gallery Preview Strip -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 10px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--gold-light); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
              <span>📸 Galeri Multi-Foto (Watermark, Slab, &amp; Detail)</span>
              <span class="badge" style="background: rgba(212,175,55,0.15); color: var(--gold-light); font-size: 10.5px; padding: 2px 7px;">
                ${(item.gallery_fotos || []).length} Foto
              </span>
            </div>
            <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 10px;" onclick="closeModal(); showUploadFotoModal(${item.id}, '${escapeHtml(item.nama_item)}')">
              ⚙️ Kelola / Tambah Foto Galeri
            </button>
          </div>

          ${Array.isArray(item.gallery_fotos) && item.gallery_fotos.length > 0 ? `
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              ${item.gallery_fotos.map(gf => `
                <div style="text-align: center; width: 105px;">
                  <div style="width: 105px; height: 75px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-gold); background: #000; display: flex; align-items: center; justify-content: center;">
                    <img src="${escapeHtml(gf.foto_path)}" style="max-width: 100%; max-height: 100%; object-fit: cover; cursor: zoom-in;" onclick="openGlobalLightbox('${escapeHtml(gf.foto_path)}', '${escapeHtml(item.nama_item + ' - ' + (gf.label || 'Detail'))}')" title="Klik untuk memperbesar">
                  </div>
                  <div style="font-size: 10.5px; color: var(--gold-light); margin-top: 4px; text-transform: capitalize; font-weight: 700;">
                    ${escapeHtml(gf.label || 'detail')}
                  </div>
                  ${gf.catatan ? `<div style="font-size: 9.5px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(gf.catatan)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 12px 14px; border-radius: 6px; border: 1px dashed var(--border);">
              <div style="font-size: 12px; color: var(--text-muted);">
                Belum ada foto galeri pendukung (tanda air/watermark, segel grading slab, benang pengaman, atau variasi cetak).
              </div>
              <button class="btn btn-primary btn-sm" style="font-size: 11px;" onclick="closeModal(); showUploadFotoModal(${item.id}, '${escapeHtml(item.nama_item)}')">
                + Tambah Foto Sekarang
              </button>
            </div>
          `}
        </div>

        <!-- Specifications & Stock Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:12px; background:rgba(255,255,255,0.02); padding:16px; border-radius:10px; border:1px solid var(--border);">
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Kode Item</div>
            <div style="font-weight:700; color:var(--gold-light); font-size:13px; font-family:monospace;">${escapeHtml(item.kode_item || '-')}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Batch Pembelian</div>
            <div style="font-weight:600; color:var(--text-primary); font-size:13px;">${escapeHtml(item.batch_kode || 'Pembelian Single')}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Negara &amp; Tahun</div>
            <div style="font-weight:600; color:var(--text-primary); font-size:13px;">${escapeHtml(item.negara || 'Indonesia')} ${item.tahun ? `(${escapeHtml(item.tahun)})` : ''}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Denominasi / Nominal</div>
            <div style="font-weight:600; color:var(--text-primary); font-size:13px;">${escapeHtml(item.denominasi || item.nominal || '-')}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Sisa Stok / Total</div>
            <div style="font-weight:700; font-size:13.5px; color:${isHabis ? 'var(--danger)' : 'var(--success)'};">${qtyTersisa} / ${item.qty} pcs ${isHabis ? '(HABIS)' : ''}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Qty Terjual</div>
            <div style="font-weight:600; font-size:13px; color:var(--text-primary);">${item.qty_terjual || 0} pcs</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">HPP Modal per Pcs</div>
            <div style="font-weight:700; color:var(--gold-light); font-size:13.5px;">${formatRupiah(item.hpp_per_pcs)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Harga Beli Total / Ongkir</div>
            <div style="font-weight:600; color:var(--text-secondary); font-size:12.5px;">${formatRupiah(item.harga)} / ${formatRupiah(item.ongkir)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Harga Jual Target</div>
            <div style="font-weight:700; color:var(--success); font-size:13.5px;">${formatRupiah(item.harga_jual || 0)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Supplier &amp; Tanggal Beli</div>
            <div style="font-weight:600; color:var(--text-primary); font-size:12.5px;">${escapeHtml(item.supplier_nama || item.perolehan || '-')} ${item.tanggal_beli ? `• ${formatDate(item.tanggal_beli)}` : ''}</div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
      <button type="button" class="btn btn-secondary" onclick="printHolderLabel(${item.id})">🏷️ Cetak Label (2x2")</button>
      <button type="button" class="btn btn-secondary" onclick="closeModal(); showUploadFotoModal(${item.id}, '${escapeHtml(item.nama_item)}')">📸 Unggah Foto (OBV/REV)</button>
      <button type="button" class="btn btn-secondary" onclick="closeModal(); showEditKoleksiModal(${item.id})">✏️ Edit Data</button>
      <button type="button" class="btn btn-success" onclick="closeModal(); showQuickSaleModal(${item.id})" ${isHabis ? 'disabled' : ''}>💰 Jual Item</button>
    `;

    openModal({
      title: `👁️ Rincian Lengkap Item: ${escapeHtml(item.nama_item)}`,
      body,
      footer,
      size: 'lg'
    });
  } catch (err) {
    showToast('Gagal memuat detail item: ' + err.message, 'error');
  }
}

/**
 * Modal Edit Koleksi
 */
async function showEditKoleksiModal(id) {
  try {
    let item = koleksiItemsCache.find(it => it.id === id);
    if (!item) {
      item = await API.get(`/koleksi/${id}`);
    }

    const detailText = item.detail || item.sertifikasi || '';
    const nominalText = item.denominasi || item.nominal || '';
    const hargaBeli = item.harga ?? (item.harga_beli ?? 0);
    const ongkirVal = item.ongkir ?? (item.ongkir_alokasi ?? 0);
    const catatanVal = item.catatan_internal || item.catatan || '';

    const body = `
      <form id="editKoleksiForm" onsubmit="event.preventDefault(); submitUpdateKoleksi(${id});">
        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Kode Item</label>
            <input type="text" id="ekKodeItem" class="form-control" value="${escapeHtml(item.kode_item || '')}" readonly style="background:rgba(255,255,255,0.03); color:var(--gold-light); font-family:monospace;">
          </div>
          <div class="form-group">
            <label class="form-label">Nama Item <span class="required">*</span></label>
            <input type="text" id="ekNama" class="form-control" value="${escapeHtml(item.nama_item)}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Seri (Serial Number)</label>
            <input type="text" id="ekNomorSeri" class="form-control" value="${escapeHtml(item.nomor_seri || '')}" placeholder="cth: ABC123456 / Solid 888888">
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Negara</label>
            <input type="text" id="ekNegara" class="form-control" value="${escapeHtml(item.negara || 'Indonesia')}">
          </div>
          <div class="form-group">
            <label class="form-label">Tahun</label>
            <input type="text" id="ekTahun" class="form-control" value="${escapeHtml(item.tahun || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Nominal</label>
            <input type="text" id="ekNominal" class="form-control" value="${escapeHtml(nominalText)}">
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Jenis</label>
            <select id="ekJenis" class="form-select">
              ${JENIS_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.jenis ? 'selected' : ''}>${JENIS_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Grade</label>
            <select id="ekGrade" class="form-select">
              ${GRADE_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.grade ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sertifikasi / Slab</label>
            <input type="text" id="ekSertifikasi" class="form-control" value="${escapeHtml(detailText)}">
          </div>
        </div>

        <!-- Official Grading Certification Section -->
        <div style="background: rgba(212, 175, 55, 0.05); border: 1px solid var(--border-gold); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--gold-light); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>🏛️ Sertifikasi Lembaga Grading Resmi (Third-Party Grading)</span>
          </div>
          <div class="data-grid-4">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Lembaga Grading</label>
              <select id="ekLembagaGrading" class="form-select">
                <option value="">- Tanpa Grading Resmi -</option>
                <option value="PMG" ${item.lembaga_grading === 'PMG' ? 'selected' : ''}>PMG</option>
                <option value="PCGS" ${item.lembaga_grading === 'PCGS' ? 'selected' : ''}>PCGS</option>
                <option value="NGC" ${item.lembaga_grading === 'NGC' ? 'selected' : ''}>NGC</option>
                <option value="NCS" ${item.lembaga_grading === 'NCS' ? 'selected' : ''}>NCS</option>
                <option value="ANACS" ${item.lembaga_grading === 'ANACS' ? 'selected' : ''}>ANACS</option>
                <option value="ICG" ${item.lembaga_grading === 'ICG' ? 'selected' : ''}>ICG</option>
                <option value="Lainnya" ${item.lembaga_grading === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">No. Sertifikasi</label>
              <input type="text" id="ekNomorSertifikasi" class="form-control" value="${escapeHtml(item.nomor_sertifikasi || '')}" placeholder="cth: 2198371-002">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Grade Numerik / Label</label>
              <input type="text" id="ekGradeNumerik" class="form-control" value="${escapeHtml(item.grade_numerik || '')}" placeholder="cth: 66 EPQ / MS65">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">URL Verifikasi</label>
              <input type="url" id="ekGradingUrl" class="form-control" value="${escapeHtml(item.grading_url || '')}" placeholder="https://www.pmgnotes.com/certlookup/...">
            </div>
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Qty Total</label>
            <input type="number" id="ekQty" class="form-control" value="${item.qty || 1}" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Harga Beli Total (Rp)</label>
            <input type="number" id="ekHargaBeli" class="form-control" value="${hargaBeli}" min="0" oninput="calcEditUnitHint()">
            <div id="ekHargaBeliUnitHint" style="font-size:11.5px; color:var(--gold-light); font-weight:600; margin-top:4px;"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Alokasi Ongkir (Rp)</label>
            <input type="number" id="ekOngkir" class="form-control" value="${ongkirVal}" min="0">
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Harga Jual / Pcs (Rp)</label>
            <input type="number" id="ekHargaJual" class="form-control" value="${item.harga_jual || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Tujuan Koleksi</label>
            <select id="ekStatusKoleksi" class="form-select">
              ${STATUS_KOLEKSI_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.status_koleksi ? 'selected' : ''}>${STATUS_KOLEKSI_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status Pengiriman</label>
            <select id="ekStatus" class="form-select">
              ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.status ? 'selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Keterangan / Catatan Item</label>
          <textarea id="ekCatatan" class="form-control" placeholder="Keterangan kondisi, sertifikasi, dll.">${escapeHtml(catatanVal)}</textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="submitUpdateKoleksi(${id})">Simpan Perubahan</button>
    `;

    openModal({
      title: `✏️ Edit Item Koleksi #${id}`,
      body,
      footer,
      size: 'lg'
    });
  } catch (err) {
    showToast('Gagal memuat item: ' + err.message, 'error');
  }
}

async function submitUpdateKoleksi(id) {
  const nominalVal = document.getElementById('ekNominal')?.value.trim() || null;
  const certVal = document.getElementById('ekSertifikasi')?.value.trim() || null;
  const hargaBeli = parseFloat(document.getElementById('ekHargaBeli')?.value || '0');
  const ongkirVal = parseFloat(document.getElementById('ekOngkir')?.value || '0');
  const catatanVal = document.getElementById('ekCatatan')?.value.trim() || null;

  const payload = {
    nama_item: document.getElementById('ekNama')?.value.trim(),
    nomor_seri: document.getElementById('ekNomorSeri')?.value.trim() || null,
    negara: document.getElementById('ekNegara')?.value.trim(),
    tahun: document.getElementById('ekTahun')?.value.trim() || null,
    nominal: nominalVal,
    denominasi: nominalVal,
    jenis: document.getElementById('ekJenis')?.value,
    grade: document.getElementById('ekGrade')?.value,
    sertifikasi: certVal,
    detail: certVal,
    qty: parseInt(document.getElementById('ekQty')?.value || '1', 10),
    harga: hargaBeli,
    harga_beli: hargaBeli,
    ongkir: ongkirVal,
    ongkir_alokasi: ongkirVal,
    harga_jual: parseFloat(document.getElementById('ekHargaJual')?.value || '0'),
    status_koleksi: document.getElementById('ekStatusKoleksi')?.value,
    status: document.getElementById('ekStatus')?.value,
    lembaga_grading: document.getElementById('ekLembagaGrading')?.value.trim() || null,
    nomor_sertifikasi: document.getElementById('ekNomorSertifikasi')?.value.trim() || null,
    grade_numerik: document.getElementById('ekGradeNumerik')?.value.trim() || null,
    grading_url: document.getElementById('ekGradingUrl')?.value.trim() || null,
    catatan_internal: catatanVal,
    catatan: catatanVal
  };

  if (!payload.nama_item) {
    showToast('Nama item wajib diisi.', 'warning');
    return;
  }

  try {
    await API.put(`/koleksi/${id}`, payload);
    showToast('Data koleksi berhasil diperbarui!', 'success');
    closeModal();
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal memperbarui item: ' + err.message, 'error');
  }
}

/**
 * Modal Upload Foto (Obverse & Reverse)
 */
let uploadObvFileHolder = null;
let uploadRevFileHolder = null;
let uploadGalleryFileHolder = null;
let currentUploadModalKoleksiId = null;

async function showUploadFotoModal(id, namaItem, activeTab = 'tab-gallery') {
  currentUploadModalKoleksiId = id;
  uploadObvFileHolder = null;
  uploadRevFileHolder = null;
  uploadGalleryFileHolder = null;

  try {
    const [item, gallery] = await Promise.all([
      API.get(`/koleksi/${id}`),
      API.get(`/koleksi/${id}/gallery`)
    ]);

    const fotoObv = item.foto_obv || item.foto_path || item.foto_url || item.foto;
    const fotoRev = item.foto_rev;
    const galleryItems = Array.isArray(gallery) ? gallery : [];

    const body = `
      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(212,175,55,0.08); border:1px solid var(--border-gold); padding:10px 14px; border-radius:8px; margin-bottom:14px;">
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Item Koleksi:</div>
            <div style="font-weight:700; color:var(--gold-light); font-size:14px;">${escapeHtml(item.nama_item)}</div>
            <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">SN: ${escapeHtml(item.nomor_seri || '-')} • Grade: ${escapeHtml(item.grade || '-')}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge" style="background:rgba(212,175,55,0.15); color:var(--gold-light); font-size:11px; border:1px solid var(--border-gold);">
              ${galleryItems.length} Foto Galeri Tersimpan
            </span>
          </div>
        </div>

        <!-- Tab Switcher -->
        <div style="display:flex; gap:8px; border-bottom:1px solid var(--border); padding-bottom:10px; margin-bottom:16px;">
          <button type="button" class="btn btn-sm ${activeTab === 'tab-main' ? 'btn-primary' : 'btn-secondary'}" id="btnTabMainPhotos" onclick="switchUploadPhotoTab('tab-main')">
            🪙 Foto Utama (OBV &amp; REV)
          </button>
          <button type="button" class="btn btn-sm ${activeTab === 'tab-gallery' ? 'btn-primary' : 'btn-secondary'}" id="btnTabGalleryPhotos" onclick="switchUploadPhotoTab('tab-gallery')">
            📸 Galeri Multi-Foto (${galleryItems.length})
          </button>
        </div>

        <!-- TAB 1: Foto Utama (OBV & REV) -->
        <div id="sectionTabMain" style="display:${activeTab === 'tab-main' ? 'block' : 'none'};">
          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
            Unggah atau perbarui foto tampak depan (Obverse) dan tampak belakang (Reverse):
          </div>

          <div class="dual-photo-grid">
            <!-- Obverse Card -->
            <div class="photo-box-card ${fotoObv ? 'has-image' : ''}" id="modalObvZone" onclick="document.getElementById('modalObvInput').click()">
              <input type="file" id="modalObvInput" accept="image/*" style="display:none" onchange="handleModalObvSelect(event)">
              <div id="modalObvPrompt" style="${fotoObv ? 'display:none;' : ''}">
                <div style="font-size:32px; margin-bottom:4px;">🪙</div>
                <div style="font-weight:600; font-size:13px; color:var(--text-primary);">Tampak Depan (OBV)</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Klik untuk pilih foto baru</div>
              </div>
              <img id="modalObvPreview" class="photo-box-preview" src="${fotoObv ? escapeHtml(fotoObv) : ''}" style="${fotoObv ? 'display:block;' : 'display:none;'}" alt="Preview Obverse">
              <div class="photo-box-label">📸 Obverse (Muka)</div>
            </div>

            <!-- Reverse Card -->
            <div class="photo-box-card ${fotoRev ? 'has-image' : ''}" id="modalRevZone" onclick="document.getElementById('modalRevInput').click()">
              <input type="file" id="modalRevInput" accept="image/*" style="display:none" onchange="handleModalRevSelect(event)">
              <div id="modalRevPrompt" style="${fotoRev ? 'display:none;' : ''}">
                <div style="font-size:32px; margin-bottom:4px;">🪙</div>
                <div style="font-weight:600; font-size:13px; color:var(--text-primary);">Tampak Belakang (REV)</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Klik untuk pilih foto baru</div>
              </div>
              <img id="modalRevPreview" class="photo-box-preview" src="${fotoRev ? escapeHtml(fotoRev) : ''}" style="${fotoRev ? 'display:block;' : 'display:none;'}" alt="Preview Reverse">
              <div class="photo-box-label">📸 Reverse (Belakang)</div>
            </div>
          </div>

          <div style="margin-top:16px; text-align:right;">
            <button type="button" class="btn btn-primary" onclick="submitUploadFoto(${id})">
              💾 Simpan Foto Utama (OBV/REV)
            </button>
          </div>
        </div>

        <!-- TAB 2: Galeri Multi-Foto (Watermark, Slab, Detail, dll.) -->
        <div id="sectionTabGallery" style="display:${activeTab === 'tab-gallery' ? 'block' : 'none'};">
          <!-- Form Upload Foto Galeri Baru -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-gold); border-radius:8px; padding:14px; margin-bottom:18px;">
            <div style="font-size:13px; font-weight:700; color:var(--gold-light); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
              <span>+ Tambah Foto Dokumentasi ke Galeri (Multi-Photo)</span>
            </div>
            
            <form id="addGalleryPhotoForm" onsubmit="event.preventDefault(); submitUploadGalleryPhoto(${id}, '${escapeHtml(namaItem)}');">
              <div class="data-grid-3">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Pilih Berkas Foto <span class="required">*</span></label>
                  <input type="file" id="galFileInput" class="form-control" accept="image/*" required onchange="handleGalleryFileSelect(event)">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Label / Kategori Foto <span class="required">*</span></label>
                  <select id="galLabelSelect" class="form-select" required>
                    <option value="watermark">💧 Tanda Air (Watermark)</option>
                    <option value="slab">🏛️ Slab / Segel Grading PMG/PCGS</option>
                    <option value="benang_pengaman">🧵 Benang Pengaman / Security Thread</option>
                    <option value="detail" selected>🔍 Detail Fitur &amp; Cetakan</option>
                    <option value="cacat_variasi">⚠️ Cacat Cetak / Variasi Error</option>
                    <option value="sertifikat">📄 Sertifikat / Faktur Keaslian</option>
                    <option value="lainnya">📸 Dokumentasi Tambahan Lainnya</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Keterangan / Catatan Foto</label>
                  <input type="text" id="galCatatanInput" class="form-control" placeholder="cth: Tampak serat fluoresensi di bawah UV">
                </div>
              </div>

              <!-- Live File Preview Box -->
              <div id="galPreviewContainer" style="display:none; margin-top:10px; align-items:center; gap:12px; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px; border:1px solid var(--border);">
                <img id="galPreviewImg" style="width:55px; height:42px; object-fit:cover; border-radius:4px; border:1px solid var(--border-gold);">
                <div>
                  <div style="font-size:11.5px; font-weight:600; color:var(--text-primary);" id="galPreviewFilename"></div>
                  <div style="font-size:10.5px; color:var(--text-muted);" id="galPreviewFilesize"></div>
                </div>
              </div>

              <div style="margin-top:12px; text-align:right;">
                <button type="submit" class="btn btn-primary btn-sm" id="btnSubmitGallery">
                  ⬆️ Unggah Foto ke Galeri
                </button>
              </div>
            </form>
          </div>

          <!-- Existing Gallery Photos Grid -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div style="font-size:13px; font-weight:700; color:var(--text-primary);">
                Daftar Foto Galeri Koleksi Ini (${galleryItems.length})
              </div>
              <div style="font-size:11px; color:var(--text-muted);">
                Klik gambar untuk memperbesar resolusi penuh (Lightbox)
              </div>
            </div>

            ${galleryItems.length === 0 ? `
              <div style="text-align:center; padding:28px 16px; background:rgba(255,255,255,0.015); border:1px dashed var(--border); border-radius:8px; color:var(--text-muted); font-size:12px;">
                <div style="font-size:24px; margin-bottom:6px;">📸</div>
                Belum ada foto dokumentasi tambahan untuk item ini.<br>
                Gunakan form di atas untuk mengunggah foto watermark, holder slab grading, atau detail koin.
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:12px;">
                ${galleryItems.map(gf => `
                  <div style="background:rgba(18,21,28,0.95); border:1px solid var(--border); border-radius:8px; padding:8px; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                      <div style="width:100%; height:90px; border-radius:5px; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center; cursor:zoom-in; border:1px solid rgba(212,175,55,0.2);" onclick="openGlobalLightbox('${escapeHtml(gf.foto_path)}', '${escapeHtml(item.nama_item + ' - ' + gf.label)}')">
                        <img src="${escapeHtml(gf.foto_path)}" style="max-width:100%; max-height:100%; object-fit:cover;" title="Klik untuk memperbesar">
                      </div>
                      <div style="font-size:10px; font-weight:700; color:var(--gold-light); text-transform:uppercase; margin-top:6px; letter-spacing:0.5px;">
                        ${escapeHtml(gf.label || 'detail')}
                      </div>
                      ${gf.catatan ? `<div style="font-size:9.5px; color:var(--text-secondary); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(gf.catatan)}">${escapeHtml(gf.catatan)}</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-top:8px; font-size:10.5px; padding:3px 8px; width:100%;" onclick="deleteGalleryPhoto(${id}, ${gf.id}, '${escapeHtml(namaItem)}')">
                      🗑️ Hapus Foto
                    </button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Selesai &amp; Tutup</button>
    `;

    openModal({
      title: `📸 Manajer Foto &amp; Galeri: ${escapeHtml(namaItem)}`,
      body,
      footer,
      size: 'lg'
    });
  } catch (err) {
    showToast('Gagal memuat manajer foto: ' + err.message, 'error');
  }
}

function switchUploadPhotoTab(tabId) {
  const secMain = document.getElementById('sectionTabMain');
  const secGal = document.getElementById('sectionTabGallery');
  const btnMain = document.getElementById('btnTabMainPhotos');
  const btnGal = document.getElementById('btnTabGalleryPhotos');

  if (secMain && secGal && btnMain && btnGal) {
    secMain.style.display = tabId === 'tab-main' ? 'block' : 'none';
    secGal.style.display = tabId === 'tab-gallery' ? 'block' : 'none';

    btnMain.className = `btn btn-sm ${tabId === 'tab-main' ? 'btn-primary' : 'btn-secondary'}`;
    btnGal.className = `btn btn-sm ${tabId === 'tab-gallery' ? 'btn-primary' : 'btn-secondary'}`;
  }
}

function handleGalleryFileSelect(e) {
  if (e.target.files && e.target.files[0]) {
    uploadGalleryFileHolder = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('galPreviewImg');
      const box = document.getElementById('galPreviewContainer');
      const name = document.getElementById('galPreviewFilename');
      const size = document.getElementById('galPreviewFilesize');
      if (img && box) {
        img.src = evt.target.result;
        if (name) name.textContent = uploadGalleryFileHolder.name;
        if (size) size.textContent = `${(uploadGalleryFileHolder.size / 1024).toFixed(1)} KB`;
        box.style.display = 'flex';
      }
    };
    reader.readAsDataURL(uploadGalleryFileHolder);
  }
}

async function submitUploadGalleryPhoto(koleksiId, namaItem) {
  const fileInput = document.getElementById('galFileInput');
  const label = document.getElementById('galLabelSelect')?.value || 'detail';
  const catatan = document.getElementById('galCatatanInput')?.value.trim() || '';

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast('Pilih berkas foto terlebih dahulu.', 'warning');
    return;
  }

  const btnSubmit = document.getElementById('btnSubmitGallery');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Mengunggah...';
  }

  const fd = new FormData();
  fd.append('foto', fileInput.files[0]);
  fd.append('label', label);
  if (catatan) fd.append('catatan', catatan);

  try {
    await API.upload(`/koleksi/${koleksiId}/gallery`, fd);
    showToast('Foto berhasil ditambahkan ke galeri koleksi!', 'success');
    await showUploadFotoModal(koleksiId, namaItem, 'tab-gallery');
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal mengunggah foto galeri: ' + err.message, 'error');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '⬆️ Unggah Foto ke Galeri';
    }
  }
}

async function deleteGalleryPhoto(koleksiId, fotoId, namaItem) {
  if (!confirm('Hapus foto ini dari galeri koleksi?')) return;

  try {
    await API.delete(`/koleksi/${koleksiId}/gallery/${fotoId}`);
    showToast('Foto galeri berhasil dihapus.', 'success');
    await showUploadFotoModal(koleksiId, namaItem, 'tab-gallery');
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal menghapus foto galeri: ' + err.message, 'error');
  }
}

function handleModalObvSelect(e) {
  if (e.target.files && e.target.files[0]) {
    uploadObvFileHolder = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('modalObvPreview');
      const prompt = document.getElementById('modalObvPrompt');
      const zone = document.getElementById('modalObvZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(uploadObvFileHolder);
  }
}

function handleModalRevSelect(e) {
  if (e.target.files && e.target.files[0]) {
    uploadRevFileHolder = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('modalRevPreview');
      const prompt = document.getElementById('modalRevPrompt');
      const zone = document.getElementById('modalRevZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(uploadRevFileHolder);
  }
}

async function submitUploadFoto(id) {
  if (!uploadObvFileHolder && !uploadRevFileHolder) {
    showToast('Pilih setidaknya satu foto (Obverse atau Reverse) terlebih dahulu.', 'warning');
    return;
  }

  try {
    if (uploadObvFileHolder) {
      const fd = new FormData();
      fd.append('file', uploadObvFileHolder);
      fd.append('foto', uploadObvFileHolder);
      await API.upload(`/koleksi/${id}/foto?tipe=obv`, fd);
    }
    if (uploadRevFileHolder) {
      const fd = new FormData();
      fd.append('file', uploadRevFileHolder);
      fd.append('foto', uploadRevFileHolder);
      await API.upload(`/koleksi/${id}/foto?tipe=rev`, fd);
    }
    showToast('Foto utama koleksi berhasil disimpan!', 'success');
    closeModal();
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal mengunggah foto: ' + err.message, 'error');
  }
}

/**
 * Modal Pecah Stok
 */
function showPecahStokModal(id, currentSisa) {
  const item = koleksiItemsCache.find(it => it.id === id);

  const body = `
    <form id="pecahStokForm" onsubmit="event.preventDefault(); submitPecahStok(${id});">
      <div style="margin-bottom:14px; background:rgba(212,175,55,0.08); border:1px solid var(--border-gold); padding:12px; border-radius:var(--radius-md);">
        <div style="font-size:12px; color:var(--text-muted);">Item Asal:</div>
        <div style="font-weight:700; color:var(--gold-light); font-size:14px;">${escapeHtml(item?.nama_item || 'Item #' + id)}</div>
        <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">Sisa stok saat ini: <strong>${currentSisa} pcs</strong></div>
      </div>

      <div class="form-group">
        <label class="form-label">Jumlah Qty yang Akan Dipecah <span class="required">*</span></label>
        <input type="number" id="psQty" class="form-control" min="1" max="${currentSisa}" value="1" required>
        <span class="input-hint">Qty ini akan dipisahkan menjadi entri item koleksi baru yang independen</span>
      </div>

      <div class="form-group">
        <label class="form-label">Nama Item Baru (Opsional)</label>
        <input type="text" id="psNama" class="form-control" placeholder="Kosongkan untuk otomatis menambahkan akhiran [Pecahan]">
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Harga Jual / Pcs Baru (Rp)</label>
          <input type="number" id="psHargaJual" class="form-control" value="${item?.harga_jual || 0}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Tujuan Koleksi Baru</label>
          <select id="psStatusKoleksi" class="form-select">
            ${STATUS_KOLEKSI_OPTIONS.map(opt => `<option value="${opt}">${STATUS_KOLEKSI_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-primary" onclick="submitPecahStok(${id})">Pecah Stok Sekarang</button>
  `;

  openModal({
    title: '✂️ Pecah Stok Koleksi',
    body,
    footer,
    size: 'md'
  });
}

async function submitPecahStok(id) {
  const qtyPecahan = parseInt(document.getElementById('psQty')?.value || '1', 10);
  const namaItem = document.getElementById('psNama')?.value.trim() || undefined;
  const hargaJual = parseFloat(document.getElementById('psHargaJual')?.value || '0');
  const statusKoleksi = document.getElementById('psStatusKoleksi')?.value;

  if (qtyPecahan <= 0) {
    showToast('Qty pecahan harus lebih dari 0.', 'warning');
    return;
  }

  const payload = {
    qty_pecahan: qtyPecahan,
    nama_item: namaItem,
    harga_jual_pcs: hargaJual,
    status_koleksi: statusKoleksi
  };

  try {
    await API.post(`/koleksi/${id}/pecah`, payload);
    showToast('Stok berhasil dipecah menjadi item baru!', 'success');
    closeModal();
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal memecah stok: ' + err.message, 'error');
  }
}

/**
 * Modal Quick Sale
 */
function showQuickSaleModal(id) {
  const item = koleksiItemsCache.find(it => it.id === id);
  const sisa = item ? (item.qty_tersisa !== undefined ? item.qty_tersisa : (item.qty - (item.qty_terjual || 0))) : 1;
  const hppPcs = item?.hpp_per_pcs || 0;
  const hargaJualDefault = item?.harga_jual || hppPcs;

  const body = `
    <form id="quickSaleForm" onsubmit="event.preventDefault(); submitQuickSale(${id}, ${hppPcs});">
      <div style="margin-bottom:16px; background:rgba(212,175,55,0.08); border:1px solid var(--border-gold); padding:12px 16px; border-radius:var(--radius-md);">
        <div style="font-size:12px; color:var(--text-muted);">Item yang dijual:</div>
        <div style="font-weight:700; color:var(--gold-light); font-size:15px;">${escapeHtml(item?.nama_item || 'Item')}</div>
        <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
          Sisa Stok: <strong>${sisa} pcs</strong> | HPP/pcs: <strong>${formatRupiah(hppPcs)}</strong>
        </div>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Qty Dijual <span class="required">*</span></label>
          <input type="number" id="qsQty" class="form-control" value="1" min="1" max="${sisa}" required oninput="calcQuickSaleProfit(${hppPcs})">
        </div>
        <div class="form-group">
          <label class="form-label">Harga Jual / Pcs (Rp) <span class="required">*</span></label>
          <input type="number" id="qsHarga" class="form-control" value="${hargaJualDefault}" min="0" required oninput="calcQuickSaleProfit(${hppPcs})">
        </div>
      </div>

      <!-- Live Profit Box -->
      <div style="background:rgba(18,21,28,0.9); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; margin-bottom:16px;">
        <div class="data-grid-3">
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Total Jual</div>
            <div id="qsPreviewTotal" style="font-size:15px; font-weight:700; color:var(--text-primary); margin-top:2px;">Rp 0</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Laba Bersih</div>
            <div id="qsPreviewProfit" style="font-size:15px; font-weight:700; color:var(--success); margin-top:2px;">Rp 0</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Margin Laba</div>
            <div id="qsPreviewMargin" style="font-size:15px; font-weight:700; color:var(--gold-light); margin-top:2px;">0%</div>
          </div>
        </div>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Nama Pembeli</label>
          <input type="text" id="qsPembeli" class="form-control" placeholder="cth: Pak Budi (Kolektor Surabaya)">
        </div>
        <div class="form-group">
          <label class="form-label">Platform Penjualan</label>
          <select id="qsPlatform" class="form-select">
            ${PLATFORM_JUAL_OPTIONS.map(opt => `<option value="${opt}">${PLATFORM_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Tanggal Transaksi</label>
          <input type="date" id="qsTanggal" class="form-control" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Catatan</label>
          <input type="text" id="qsCatatan" class="form-control" placeholder="Keterangan transaksi">
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-success" onclick="submitQuickSale(${id}, ${hppPcs})">Konfirmasi Penjualan</button>
  `;

  openModal({
    title: '💰 Quick Sale - Jual Item Ini',
    body,
    footer,
    size: 'md'
  });

  calcQuickSaleProfit(hppPcs);
}

function calcQuickSaleProfit(hppPcs) {
  const qty = parseInt(document.getElementById('qsQty')?.value || '1', 10);
  const harga = parseFloat(document.getElementById('qsHarga')?.value || '0');

  const totalJual = qty * harga;
  const totalHpp = qty * hppPcs;
  const totalProfit = totalJual - totalHpp;
  const marginPct = totalJual > 0 ? ((totalProfit / totalJual) * 100).toFixed(1) : 0;

  const pTotal = document.getElementById('qsPreviewTotal');
  const pProfit = document.getElementById('qsPreviewProfit');
  const pMargin = document.getElementById('qsPreviewMargin');

  if (pTotal) pTotal.textContent = formatRupiah(totalJual);
  if (pProfit) {
    pProfit.textContent = formatRupiah(totalProfit);
    pProfit.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (pMargin) pMargin.textContent = `${marginPct}%`;
}

async function submitQuickSale(koleksiId, hppPcs) {
  const qty = parseInt(document.getElementById('qsQty')?.value || '1', 10);
  const harga = parseFloat(document.getElementById('qsHarga')?.value || '0');
  const pembeli = document.getElementById('qsPembeli')?.value.trim() || null;
  const platform = document.getElementById('qsPlatform')?.value || 'direct';
  const tanggal = document.getElementById('qsTanggal')?.value || null;
  const catatan = document.getElementById('qsCatatan')?.value.trim() || null;

  if (qty <= 0) {
    showToast('Qty jual harus lebih dari 0.', 'warning');
    return;
  }

  const payload = {
    koleksi_id: koleksiId,
    qty_jual: qty,
    harga_jual_pcs: harga,
    pembeli,
    platform_jual: platform,
    tanggal_jual: tanggal,
    catatan
  };

  try {
    await API.post('/penjualan', payload);
    showToast('Penjualan berhasil dicatat!', 'success');
    closeModal();
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal mencatat penjualan: ' + err.message, 'error');
  }
}

async function deleteKoleksi(id, nama) {
  if (!confirm(`Hapus koleksi "${nama}"? Semua riwayat stok item ini akan dihapus.`)) {
    return;
  }

  try {
    await API.delete(`/koleksi/${id}`);
    showToast(`Item "${nama}" berhasil dihapus.`, 'success');
    loadKoleksi(koleksiCurrentPage);
  } catch (err) {
    showToast('Gagal menghapus item: ' + err.message, 'error');
  }
}


function calcEditUnitHint() {
  const qty = Math.max(1, parseInt(document.getElementById('ekQty')?.value || '1', 10));
  const harga = parseFloat(document.getElementById('ekHargaBeli')?.value || '0');
  const hint = document.getElementById('ekHargaBeliUnitHint');
  if (hint) {
    const pcs = Math.round(harga / qty);
    hint.textContent = qty > 1 ? `@ Rp ${pcs.toLocaleString('id-ID')} / pcs` : '';
  }
}
