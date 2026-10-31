// Batch add item photo holders
let batchAddObvFile = null;
let batchAddRevFile = null;

// Batch edit item photo holders
let batchEditObvFile = null;
let batchEditRevFile = null;

/**
 * NumisManager - Pembelian Single & Pembelian Batch Modules
 */

// Selected photo file holders for single purchase (Obverse & Reverse)
let singlePhotoObvFile = null;
let singlePhotoRevFile = null;

// Selected batch state
let currentBatchId = null;
let currentBatchData = null;

/**
 * =========================================================================
 * 1. PEMBELIAN SINGLE
 * =========================================================================
 */
async function loadPembelianSingle() {
  const contentArea = document.getElementById('contentArea');
  singlePurchasePhotoFile = null;

  contentArea.innerHTML = `
    <div class="pembelian-single-page">
      <div class="section-header" style="flex-wrap:wrap; gap:12px;">
        <div>
          <h3>Entri Pembelian Langsung (Single &amp; Paket Lot)</h3>
          <p class="input-hint">Pencatatan pembelian item satuan maupun paket lot (beberapa item dengan 1 harga gabungan) langsung ke koleksi</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <div style="display:inline-flex; background:var(--bg-card); border:1px solid var(--border-gold); border-radius:8px; padding:3px; gap:4px;">
            <button type="button" id="btnModeSingleItem" class="btn btn-sm btn-primary" onclick="switchSinglePurchaseMode('single')" style="border-radius:6px;">
              🪙 Mode Item Satuan
            </button>
            <button type="button" id="btnModeSingleLot" class="btn btn-sm btn-secondary" onclick="switchSinglePurchaseMode('lot')" style="border-radius:6px; border:none;">
              🎁 Mode Paket Lot (1 Harga Multi-Item)
            </button>
          </div>
          <button type="button" id="btnResetSingleTop" class="btn btn-secondary btn-sm" onclick="resetSingleForm()">Bersihkan Form</button>
        </div>
      </div>

      <div id="singleLotPurchaseSection" style="display:none;"></div>

      <form id="singlePurchaseForm" onsubmit="event.preventDefault(); submitSinglePurchase();">
        <div class="data-grid-2">
          <!-- Left Column: Data Item -->
          <div class="card">
            <h4 style="margin-bottom:18px; color:var(--gold-light); display:flex; align-items:center; gap:8px;">
              <span>📜 Identitas & Spesifikasi Item</span>
            </h4>

            <div class="data-grid-2">
              <div class="form-group">
                <label class="form-label">Nama Item / Deskripsi <span class="required">*</span></label>
                <input type="text" id="spNamaItem" class="form-control" placeholder="cth: 100 Rupiah Perahu Layar 1992 UNC" required>
              </div>
              <div class="form-group">
                <label class="form-label">Nomor Seri (Serial Number)</label>
                <input type="text" id="spNomorSeri" class="form-control" placeholder="cth: ABC123456 / No Seri Koin">
              </div>
            </div>

            <div class="data-grid-2">
              <div class="form-group">
                <label class="form-label">Negara Emisi</label>
                <input type="text" id="spNegara" class="form-control" value="Indonesia" placeholder="Indonesia">
              </div>
              <div class="form-group">
                <label class="form-label">Tahun Emisi</label>
                <input type="text" id="spTahun" class="form-control" placeholder="cth: 1952 atau 1999">
              </div>
            </div>

            <div class="data-grid-2">
              <div class="form-group">
                <label class="form-label">Nominal / Pecahan</label>
                <input type="text" id="spNominal" class="form-control" placeholder="cth: 500 Gulden, 100 Rb">
              </div>
              <div class="form-group">
                <label class="form-label">Jenis Item <span class="required">*</span></label>
                <select id="spJenis" class="form-select" required>
                  ${JENIS_OPTIONS.map(opt => `<option value="${opt}">${JENIS_LABELS[opt] || opt}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="data-grid-2">
              <div class="form-group">
                <label class="form-label">Kondisi / Grade <span class="required">*</span></label>
                <select id="spGrade" class="form-select" required>
                  ${GRADE_OPTIONS.map(opt => `<option value="${opt}" ${opt === 'UNC' ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Sertifikasi / Grading Co.</label>
                <input type="text" id="spSertifikasi" class="form-control" placeholder="cth: PMG 66 EPQ / PCGS MS65 / Raw">
              </div>
            </div>

            <div class="data-grid-3" style="background: rgba(212,175,55,0.05); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-gold); margin-bottom: 14px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px;">Lembaga Grading</label>
                <select id="spLembagaGrading" class="form-select">
                  <option value="">- Tanpa Grading Resmi -</option>
                  <option value="PMG">PMG</option>
                  <option value="PCGS">PCGS</option>
                  <option value="NGC">NGC</option>
                  <option value="NCS">NCS</option>
                  <option value="ANACS">ANACS</option>
                  <option value="ICG">ICG</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px;">No. Sertifikasi</label>
                <input type="text" id="spNomorSertifikasi" class="form-control" placeholder="cth: 2198371-002">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px;">Grade Numerik</label>
                <input type="text" id="spGradeNumerik" class="form-control" placeholder="cth: 66 EPQ / MS65">
              </div>
            </div>

            ${SmartPhotoManager.renderSection('sp', { showSupporting: true })}
          </div>

          <!-- Right Column: Biaya, Supplier, & Perhitungan HPP -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div class="card">
              <h4 style="margin-bottom:18px; color:var(--gold-light); display:flex; align-items:center; gap:8px;">
                <span>💰 Keuangan & Perhitungan HPP</span>
              </h4>

              <div class="data-grid-3">
                <div class="form-group">
                  <label class="form-label">Qty (Jumlah Pcs) <span class="required">*</span></label>
                  <input type="number" id="spQty" class="form-control" min="1" value="1" required oninput="calculateSingleHpp()">
                </div>
                <div class="form-group">
                  <label class="form-label">Harga Beli Total (Rp) <span class="required">*</span></label>
                  <input type="number" id="spHargaBeli" class="form-control" min="0" value="0" required oninput="calculateSingleHpp()">
                  <div id="spHargaBeliUnitHint" style="font-size:11.5px; color:var(--gold-light); font-weight:600; margin-top:4px;"></div>
                </div>
                <div class="form-group">
                  <label class="form-label">Ongkir / Alokasi (Rp)</label>
                  <input type="number" id="spOngkir" class="form-control" min="0" value="0" oninput="calculateSingleHpp()">
                </div>
              </div>

              <!-- Live Calculation Banner -->
              <div style="background:rgba(18,21,28,0.8); border:1px solid var(--border-gold); border-radius:var(--radius-md); padding:16px; margin-bottom:18px;">
                <div style="font-size:12px; color:var(--gold-light); font-weight:700; margin-bottom:8px; text-transform:uppercase;">
                  ⚡ Hasil Kalkulasi HPP Otomatis
                </div>
                <div class="data-grid-2">
                  <div>
                    <span style="font-size:11px; color:var(--text-muted);">Total HPP (Harga + Ongkir):</span>
                    <div id="spPreviewTotalHpp" style="font-size:16px; font-weight:800; color:var(--text-primary); margin-top:2px;">Rp 0</div>
                  </div>
                  <div>
                    <span style="font-size:11px; color:var(--text-muted);">HPP Modal per Pcs:</span>
                    <div id="spPreviewHppPcs" style="font-size:16px; font-weight:800; color:var(--gold-light); margin-top:2px;">Rp 0</div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
                <input type="number" id="spHargaJual" class="form-control" min="0" value="0" placeholder="Kosongkan atau isi perkiraan jual">
              </div>
            </div>

            <div class="card">
              <h4 style="margin-bottom:18px; color:var(--gold-light); display:flex; align-items:center; gap:8px;">
                <span>🤝 Supplier & Status Kepemilikan</span>
              </h4>

              <div class="data-grid-3">
                <div class="form-group">
                  <label class="form-label">Group Item</label>
                  <select id="spGroupItem" class="form-select">
                    <option value="">-- Tanpa Group --</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Supplier / Sumber</label>
                  <select id="spSupplier" class="form-select">
                    <option value="">-- Pilih Supplier --</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Metode Perolehan</label>
                  <select id="spPerolehan" class="form-select">
                    ${PEROLEHAN_OPTIONS.map(opt => `<option value="${opt}">${PEROLEHAN_LABELS[opt] || opt}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="data-grid-3">
                <div class="form-group">
                  <label class="form-label">Status Pengiriman</label>
                  <select id="spStatus" class="form-select">
                    ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === 'terima' ? 'selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tujuan Koleksi</label>
                  <select id="spStatusKoleksi" class="form-select">
                    ${STATUS_KOLEKSI_OPTIONS.map(opt => `<option value="${opt}" ${opt === 'stock_jual' ? 'selected' : ''}>${STATUS_KOLEKSI_LABELS[opt] || opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal Pembelian</label>
                  <input type="date" id="spTanggal" class="form-control">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">🔗 Link Pembelian / Tautan Lelang / Bukti Transaksi</label>
                <input type="text" id="spLinkPembelian" class="form-control" placeholder="cth: https://www.facebook.com/... atau link Tokopedia/Shopee/WA">
              </div>

              <div class="form-group">
                <label class="form-label">Keterangan / Catatan Item</label>
                <textarea id="spCatatan" class="form-control" style="min-height:60px;" placeholder="Keterangan kondisi, asal lelang, sertifikasi, dll."></textarea>
              </div>

              <div style="margin-top:10px;">
                <button type="submit" id="spSubmitBtn" class="btn btn-primary" style="width:100%; height:46px; font-size:15px;">
                  <span>💾 Simpan Item ke Koleksi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `;

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('spTanggal');
  if (dateInput) dateInput.value = today;

  // Load suppliers and group items into dropdowns
  loadSuppliersIntoDropdown('spSupplier');
  loadGroupItemsIntoDropdown('spGroupItem');

  // Setup SmartPhotoManager (Drag & Drop + Copy/Paste OBV, REV & Supporting)
  SmartPhotoManager.initContext('sp', { showSupporting: true });

  // Initial calculation
  calculateSingleHpp();
}

async function loadSuppliersIntoDropdown(dropdownId, selectedId = null) {
  const select = document.getElementById(dropdownId);
  if (!select) return;

  try {
    const suppliers = await API.get('/supplier');
    const list = Array.isArray(suppliers) ? suppliers : (suppliers.data || []);
    let html = '<option value="">-- Pilih Supplier --</option>';
    list.forEach(s => {
      const isSel = selectedId && Number(selectedId) === Number(s.id) ? 'selected' : '';
      html += `<option value="${s.id}" ${isSel}>${escapeHtml(s.nama)}</option>`;
    });
    select.innerHTML = html;
  } catch (err) {
    console.error('Failed to load suppliers dropdown:', err);
  }
}

function calculateSingleHpp() {
  const qty = Math.max(1, parseInt(document.getElementById('spQty')?.value || '1', 10));
  const hargaBeli = parseFloat(document.getElementById('spHargaBeli')?.value || '0');
  const ongkir = parseFloat(document.getElementById('spOngkir')?.value || '0');

  const totalHpp = hargaBeli + ongkir;
  const hppPerPcs = Math.round(totalHpp / qty);
  const hargaBeliPcs = Math.round(hargaBeli / qty);

  const previewTotal = document.getElementById('spPreviewTotalHpp');
  const previewPcs = document.getElementById('spPreviewHppPcs');
  const unitHint = document.getElementById('spHargaBeliUnitHint');

  if (previewTotal) previewTotal.textContent = formatRupiah(totalHpp);
  if (previewPcs) previewPcs.textContent = formatRupiah(hppPerPcs);
  if (unitHint) {
    unitHint.textContent = qty > 1 ? `@ Rp ${hargaBeliPcs.toLocaleString('id-ID')} / pcs` : '';
  }
}

function setupSinglePhotoZone() {
  const zone = document.getElementById('spPhotoZone');
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSinglePhotoFile(e.dataTransfer.files[0]);
    }
  });
}

function handleSingleObvSelect(e) {
  if (e.target.files && e.target.files[0]) {
    singlePhotoObvFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('spObvPreview');
      const prompt = document.getElementById('spObvPrompt');
      const zone = document.getElementById('spObvZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(singlePhotoObvFile);
  }
}

function handleSingleRevSelect(e) {
  if (e.target.files && e.target.files[0]) {
    singlePhotoRevFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('spRevPreview');
      const prompt = document.getElementById('spRevPrompt');
      const zone = document.getElementById('spRevZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(singlePhotoRevFile);
  }
}

function resetSingleForm() {
  const form = document.getElementById('singlePurchaseForm');
  if (form) form.reset();
  const ns = document.getElementById('spNomorSeri');
  if (ns) ns.value = '';
  singlePhotoObvFile = null;
  singlePhotoRevFile = null;

  SmartPhotoManager.clearSlot('sp', 'obv');
  SmartPhotoManager.clearSlot('sp', 'rev');
  const ctx = SmartPhotoManager.getContext('sp');
  ctx.supportingQueue = [];
  SmartPhotoManager.renderSupportingQueue('sp');
  SmartPhotoManager.setActiveTarget('sp', 'obv', true);

  calculateSingleHpp();
}

async function submitSinglePurchase() {
  const namaItem = document.getElementById('spNamaItem')?.value.trim();
  const nomorSeri = document.getElementById('spNomorSeri')?.value.trim() || null;
  const negara = document.getElementById('spNegara')?.value.trim() || 'Indonesia';
  const tahun = document.getElementById('spTahun')?.value.trim() || null;
  const nominal = document.getElementById('spNominal')?.value.trim() || null;
  const jenis = document.getElementById('spJenis')?.value;
  const grade = document.getElementById('spGrade')?.value;
  const sertifikasi = document.getElementById('spSertifikasi')?.value.trim() || null;
  const qty = parseInt(document.getElementById('spQty')?.value || '1', 10);
  const hargaBeli = parseFloat(document.getElementById('spHargaBeli')?.value || '0');
  const ongkir = parseFloat(document.getElementById('spOngkir')?.value || '0');
  const hargaJual = parseFloat(document.getElementById('spHargaJual')?.value || '0');
  const supplierId = document.getElementById('spSupplier')?.value || null;
  const groupId = document.getElementById('spGroupItem')?.value || null;
  const perolehan = document.getElementById('spPerolehan')?.value;
  const status = document.getElementById('spStatus')?.value;
  const statusKoleksi = document.getElementById('spStatusKoleksi')?.value;
  const lembagaGrading = document.getElementById('spLembagaGrading')?.value || null;
  const nomorSertifikasi = document.getElementById('spNomorSertifikasi')?.value.trim() || null;
  const gradeNumerik = document.getElementById('spGradeNumerik')?.value.trim() || null;
  const tanggal = document.getElementById('spTanggal')?.value || null;
  const linkPembelian = document.getElementById('spLinkPembelian')?.value.trim() || null;
  const catatan = document.getElementById('spCatatan')?.value.trim() || null;

  if (!namaItem) {
    showToast('Nama item wajib diisi.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('spSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  const payload = {
    nama_item: namaItem,
    nomor_seri: nomorSeri,
    negara,
    tahun,
    nominal,
    denominasi: nominal,
    jenis,
    grade,
    sertifikasi,
    detail: sertifikasi,
    lembaga_grading: lembagaGrading,
    nomor_sertifikasi: nomorSertifikasi,
    grade_numerik: gradeNumerik,
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    ongkir: ongkir,
    ongkir_alokasi: ongkir,
    harga_jual: hargaJual,
    supplier_id: supplierId ? parseInt(supplierId, 10) : null,
    group_id: groupId ? parseInt(groupId, 10) : null,
    perolehan: perolehan,
    metode_perolehan: perolehan,
    link_pembelian: linkPembelian,
    status,
    status_koleksi: statusKoleksi,
    tanggal_beli: tanggal,
    catatan_internal: catatan,
    catatan
  };

  try {
    const newItem = await API.post('/koleksi', payload);
    const itemId = newItem.id || newItem.item_id;

    if (itemId) {
      await SmartPhotoManager.uploadAllForKoleksi('sp', itemId);
    }

    showToast('Item berhasil ditambahkan ke inventaris koleksi!', 'success');
    resetSingleForm();
  } catch (err) {
    showToast('Gagal menyimpan item: ' + err.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * =========================================================================
 * 2. PEMBELIAN BATCH
 * =========================================================================
 */
// State multiple select untuk batch dan item
let selectedBatchIds = new Set();
let selectedBatchItemIds = new Set();
let currentBatchListCache = [];

let batchFilterState = {
  search: '',
  status: '',
  statusFinal: '',
  perolehan: '',
  isVisible: localStorage.getItem('numis_batch_filter_visible') === '1'
};

async function loadPembelianBatch() {
  currentBatchId = null;
  selectedBatchIds.clear();
  selectedBatchItemIds.clear();
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="pembelian-batch-page">
      <div class="section-header">
        <div>
          <h3>Manajemen Pembelian Batch / Lot</h3>
          <p class="input-hint">Pengadaan paket lelang koleksi dengan alokasi ongkir otomatis ke setiap item</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn btn-secondary btn-sm" id="btnToggleBatchFilter" onclick="toggleBatchFilterBar()" title="Tampilkan / Sembunyikan Filter Bar" style="${batchFilterState.isVisible ? 'border-color:var(--gold-primary); color:var(--gold-light); background:rgba(212,175,55,0.14);' : ''}">
            <span id="batchFilterIcon">${batchFilterState.isVisible ? '▲' : '🔍'}</span>
            <span id="batchFilterBtnText">${batchFilterState.isVisible ? 'Tutup Filter' : 'Filter Bar'}</span>
          </button>
          <button class="btn btn-primary" onclick="showCreateBatchModal()">
            <span>+ Buat Batch Baru</span>
          </button>
        </div>
      </div>

      <!-- Collapsible Filter Bar -->
      <div class="filter-bar" id="batchFilterBar" style="display:${batchFilterState.isVisible ? 'flex' : 'none'}; margin-bottom:16px;">
        <div class="search-input-wrapper" style="flex:1; min-width:220px;">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            id="batchFilterSearch" 
            class="form-control" 
            placeholder="Cari kode batch, nama lot, supplier..." 
            value="${escapeHtml(batchFilterState.search)}"
            oninput="handleLiveBatchFilter()"
            onkeydown="if(event.key==='Enter') applyBatchFilter()"
          >
        </div>

        <select id="batchFilterStatus" class="form-select" style="max-width:160px;" onchange="applyBatchFilter()">
          <option value="">Semua Status</option>
          <option value="pesan" ${batchFilterState.status === 'pesan' ? 'selected' : ''}>Pesan</option>
          <option value="dikirim" ${batchFilterState.status === 'dikirim' ? 'selected' : ''}>Dikirim</option>
          <option value="terima" ${batchFilterState.status === 'terima' ? 'selected' : ''}>Diterima</option>
        </select>

        <select id="batchFilterStatusFinal" class="form-select" style="max-width:235px;" onchange="applyBatchFilter()">
          <option value="">Semua Status Final</option>
          <option value="1" ${batchFilterState.statusFinal === '1' ? 'selected' : ''}>✅ Diterima - Final OK (Lengkap)</option>
          <option value="0" ${batchFilterState.statusFinal === '0' ? 'selected' : ''}>⚠️ Diterima - Kurang / Belum Lengkap</option>
          <option value="belum_terima" ${batchFilterState.statusFinal === 'belum_terima' ? 'selected' : ''}>⏳ Belum Diterima (Pesan / Dikirim)</option>
        </select>

        <select id="batchFilterPerolehan" class="form-select" style="max-width:175px;" onchange="applyBatchFilter()">
          <option value="">Semua Perolehan</option>
          ${PEROLEHAN_OPTIONS.map(opt => `<option value="${opt}" ${batchFilterState.perolehan === opt ? 'selected' : ''}>${PEROLEHAN_LABELS[opt] || opt}</option>`).join('')}
        </select>

        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="applyBatchFilter()">
            Cari
          </button>
          <button class="btn btn-secondary btn-sm" onclick="resetBatchFilter()" title="Reset semua filter">
            Reset
          </button>
          <button class="btn btn-secondary btn-sm" onclick="toggleBatchFilterBar(false)" title="Sembunyikan Filter Bar">
            ▲ Tutup
          </button>
        </div>
      </div>

      <div id="batchMainView">
        <div class="card">
          <div id="batchListTableContainer"></div>
        </div>
      </div>
    </div>
  `;

  renderLoading('batchListTableContainer', 'Memuat daftar batch pengadaan...');
  await refreshBatchList();
}

function toggleBatchFilterBar(forceShow) {
  if (typeof forceShow === 'boolean') {
    batchFilterState.isVisible = forceShow;
  } else {
    batchFilterState.isVisible = !batchFilterState.isVisible;
  }

  try {
    localStorage.setItem('numis_batch_filter_visible', batchFilterState.isVisible ? '1' : '0');
  } catch (e) {
    console.warn(e);
  }

  const bar = document.getElementById('batchFilterBar');
  const btn = document.getElementById('btnToggleBatchFilter');
  const icon = document.getElementById('batchFilterIcon');
  const text = document.getElementById('batchFilterBtnText');

  if (bar) {
    bar.style.display = batchFilterState.isVisible ? 'flex' : 'none';
  }
  if (btn) {
    if (batchFilterState.isVisible) {
      btn.style.borderColor = 'var(--gold-primary)';
      btn.style.color = 'var(--gold-light)';
      btn.style.background = 'rgba(212,175,55,0.14)';
    } else {
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  }
  if (icon) icon.textContent = batchFilterState.isVisible ? '▲' : '🔍';
  if (text) text.textContent = batchFilterState.isVisible ? 'Tutup Filter' : 'Filter Bar';
}

const handleLiveBatchFilter = debounce(() => {
  applyBatchFilter();
}, 280);

function applyBatchFilter() {
  const sInput = document.getElementById('batchFilterSearch');
  const stSelect = document.getElementById('batchFilterStatus');
  const sfSelect = document.getElementById('batchFilterStatusFinal');
  const pSelect = document.getElementById('batchFilterPerolehan');

  batchFilterState.search = sInput ? sInput.value.trim() : '';
  batchFilterState.status = stSelect ? stSelect.value : '';
  batchFilterState.statusFinal = sfSelect ? sfSelect.value : '';
  batchFilterState.perolehan = pSelect ? pSelect.value : '';

  renderLoading('batchListTableContainer', 'Memfilter daftar batch pengadaan...');
  refreshBatchList();
}

function resetBatchFilter() {
  batchFilterState.search = '';
  batchFilterState.status = '';
  batchFilterState.statusFinal = '';
  batchFilterState.perolehan = '';

  const sInput = document.getElementById('batchFilterSearch');
  const stSelect = document.getElementById('batchFilterStatus');
  const sfSelect = document.getElementById('batchFilterStatusFinal');
  const pSelect = document.getElementById('batchFilterPerolehan');

  if (sInput) sInput.value = '';
  if (stSelect) stSelect.value = '';
  if (sfSelect) sfSelect.value = '';
  if (pSelect) pSelect.value = '';

  renderLoading('batchListTableContainer', 'Memuat daftar batch pengadaan...');
  refreshBatchList();
}

async function refreshBatchList() {
  try {
    const params = new URLSearchParams();
    if (batchFilterState.search) params.append('search', batchFilterState.search);
    if (batchFilterState.status) params.append('status', batchFilterState.status);
    if (batchFilterState.statusFinal !== '') params.append('is_final_ok', batchFilterState.statusFinal);
    if (batchFilterState.perolehan) params.append('perolehan', batchFilterState.perolehan);
    params.append('limit', '100');

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await API.get('/batch' + queryStr);
    let batches = res.items || res.data || (Array.isArray(res) ? res : []);

    // Filter sisi klien juga sebagai proteksi ekstra
    if (batchFilterState.search) {
      const q = batchFilterState.search.toLowerCase();
      batches = batches.filter(b => 
        (b.kode_batch && b.kode_batch.toLowerCase().includes(q)) ||
        (b.nama_batch && b.nama_batch.toLowerCase().includes(q)) ||
        (b.supplier_nama && b.supplier_nama.toLowerCase().includes(q))
      );
    }
    if (batchFilterState.status) {
      batches = batches.filter(b => b.status === batchFilterState.status);
    }
    if (batchFilterState.statusFinal !== '') {
      if (batchFilterState.statusFinal === '1') {
        batches = batches.filter(b => b.status === 'terima' && Number(b.is_final_ok ? 1 : 0) === 1);
      } else if (batchFilterState.statusFinal === '0') {
        batches = batches.filter(b => b.status === 'terima' && Number(b.is_final_ok ? 1 : 0) === 0);
      } else if (batchFilterState.statusFinal === 'belum_terima') {
        batches = batches.filter(b => b.status !== 'terima');
      }
    }
    if (batchFilterState.perolehan) {
      batches = batches.filter(b => b.perolehan === batchFilterState.perolehan);
    }

    renderBatchList(batches);
  } catch (err) {
    const container = document.getElementById('batchListTableContainer');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" style="display:flex;">
          <span>Gagal memuat batch: ${escapeHtml(err.message)}</span>
        </div>
      `;
    }
  }
}

function renderBatchList(batches) {
  const container = document.getElementById('batchListTableContainer');
  if (!container) return;

  currentBatchListCache = batches || [];
  const validIds = new Set(currentBatchListCache.map(b => b.id));
  selectedBatchIds = new Set([...selectedBatchIds].filter(id => validIds.has(id)));

  if (!batches || batches.length === 0) {
    const hasActiveFilter = Boolean(batchFilterState.search || batchFilterState.status || batchFilterState.statusFinal !== '' || batchFilterState.perolehan);
    if (hasActiveFilter) {
      renderEmpty(
        'batchListTableContainer',
        'Tidak Ditemukan Batch Sesuai Filter',
        'Tidak ada batch pengadaan yang cocok dengan kriteria pencarian/filter saat ini.',
        '<button class="btn btn-secondary btn-sm" onclick="resetBatchFilter()">Reset Filter</button>'
      );
    } else {
      renderEmpty(
        'batchListTableContainer',
        'Belum Ada Batch Pengadaan',
        'Belum ada batch pembelian tersimpan. Buat batch baru untuk mulai mencatat pengadaan lot/lelang.',
        '<button class="btn btn-primary btn-sm" onclick="showCreateBatchModal()">+ Buat Batch Baru</button>'
      );
    }
    return;
  }

  let bulkBarHtml = '';
  if (selectedBatchIds.size > 0) {
    bulkBarHtml = `
      <div id="batchBulkActionBar" style="display:flex; align-items:center; justify-content:space-between; background:rgba(239,83,80,0.12); border:1px solid rgba(239,83,80,0.35); border-radius:8px; padding:10px 16px; margin-bottom:14px; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px;">☑</span>
          <span style="font-size:13px; font-weight:600; color:var(--text-primary);">
            Terpilih: <strong style="color:var(--danger); font-size:15px;">${selectedBatchIds.size}</strong> batch pengadaan
          </span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="clearSelectedBatches()">
            Batal Pilih
          </button>
          <button type="button" class="btn btn-danger btn-sm" id="btnBulkDeleteBatches" onclick="bulkDeleteSelectedBatches()">
            🗑️ Hapus (${selectedBatchIds.size}) Batch Terpilih
          </button>
        </div>
      </div>
    `;
  }

  let html = `
    ${bulkBarHtml}
    <div class="table-wrapper table-compact">
      <table>
        <thead>
          <tr>
            <th style="width:40px; text-align:center;">
              <input type="checkbox" id="batchSelectAllHeader"
                     ${batches.length > 0 && batches.every(b => selectedBatchIds.has(b.id)) ? 'checked' : ''}
                     onchange="toggleSelectAllBatches(this.checked)"
                     style="width:17px; height:17px; accent-color:var(--danger); cursor:pointer; vertical-align:middle;"
                     title="Pilih / Batalkan Semua Batch di Halaman Ini">
            </th>
            <th>Kode Batch</th>
            <th>Nama Batch / Lot</th>
            <th>Tanggal Beli</th>
            <th style="text-align:center;">Jumlah Item</th>
            <th>Total Ongkir Lot</th>
            <th>Status</th>
            <th style="text-align:center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  batches.forEach(b => {
    const batchTitle = b.nama_batch || b.nama || b.kode_batch || ('Batch #' + b.id);
    const itemCount = b.item_count ?? (b.items?.length ?? 0);
    const isReceived = (b.status === 'terima');
    const isFinalOk = isReceived && Boolean(b.is_final_ok);
    const isSelected = selectedBatchIds.has(b.id);

    let statusSymbolHtml = '';
    if (b.status === 'pesan') {
      statusSymbolHtml = '<span title="Status Pemesanan: Masih Dipesan (Belum Diterima)" style="font-size:14px; line-height:1; flex-shrink:0;">⏳</span>';
    } else if (b.status === 'dikirim') {
      statusSymbolHtml = '<span title="Status Pengiriman: Sedang Dikirim (Belum Diterima)" style="font-size:14px; line-height:1; flex-shrink:0;">🚚</span>';
    } else if (isFinalOk) {
      statusSymbolHtml = '<span title="Diterima Lengkap (Final OK)" style="font-size:14px; line-height:1; flex-shrink:0;">✅</span>';
    } else {
      statusSymbolHtml = '<span title="Diterima - Ada Item Kurang / Belum Lengkap" style="font-size:14px; line-height:1; flex-shrink:0;">⚠️</span>';
    }

    html += `
      <tr style="cursor:pointer; ${isSelected ? 'background: rgba(239,83,80,0.08);' : (isFinalOk ? 'background: rgba(46,125,50,0.06);' : '')}" onclick="selectBatch(${b.id})" title="Klik untuk membuka &amp; mengelola batch ini">
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <input type="checkbox" class="batch-select-checkbox" data-id="${b.id}"
                 ${isSelected ? 'checked' : ''}
                 onchange="toggleSelectBatch(${b.id}, this.checked)"
                 style="width:17px; height:17px; accent-color:var(--danger); cursor:pointer;"
                 title="Pilih batch ini untuk tindakan masal">
        </td>
        <td><strong style="color:var(--gold-light); font-family:monospace;">${escapeHtml(b.kode_batch || '#' + b.id)}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:7px;">
            ${statusSymbolHtml}
            <strong style="color:var(--text-primary); font-size:13px;">${escapeHtml(batchTitle)}</strong>
          </div>
        </td>
        <td>${formatDate(b.tanggal_beli || b.created_at)}</td>
        <td style="text-align:center;">
          <span class="badge" style="background:rgba(212,175,55,0.12); color:var(--gold-light); font-weight:600;">${itemCount} item</span>
          ${(isReceived && b.checked_item_count !== undefined && b.checked_item_count > 0) ? `<div style="font-size:11px; color:#4caf50; font-weight:600; margin-top:2px;" title="Jumlah item yang sudah dichecklist dari web">✓ ${b.checked_item_count}/${itemCount} dicek</div>` : ''}
        </td>
        <td style="color:var(--gold-light); font-weight:600;">${formatRupiah(b.total_ongkir || 0)}</td>
        <td>${formatStatus(b.status)}</td>
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <div class="td-actions" style="justify-content:center; gap:6px;">
            <button class="btn btn-secondary btn-icon" onclick="showCopyBatchModal(${b.id})" title="Copy &amp; Edit Batch (Duplikasi Batch Ini)">
              📋
            </button>
            <button class="btn btn-secondary btn-icon" onclick="showPrintBatchCrosscheckModal(${b.id})" title="Cetak / Ekspor PDF Lembar Crosscheck Batch">
              🖨️
            </button>
            <button class="btn btn-secondary btn-icon" onclick="showBatchDetailModal(${b.id})" title="Lihat Detail Lengkap Batch">
              👁️
            </button>
            <button class="btn btn-primary btn-sm" onclick="selectBatch(${b.id})" title="Buka &amp; Kelola Batch">
              📂 Buka &amp; Kelola
            </button>
            <button class="btn btn-danger btn-icon" onclick="deleteBatch(${b.id}, '${escapeHtml(batchTitle)}')" title="Hapus Batch">
              🗑️
            </button>
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

  const allCb = document.getElementById('batchSelectAllHeader');
  if (allCb && batches.length > 0) {
    const selectedCount = batches.filter(b => selectedBatchIds.has(b.id)).length;
    allCb.indeterminate = (selectedCount > 0 && selectedCount < batches.length);
  }
}

/**
 * Modal Tampilan Detail Lengkap Batch Pengadaan
 */
async function showBatchDetailModal(batchId) {
  try {
    const b = await API.get(`/batch/${batchId}`);
    if (!b) throw new Error('Data batch tidak ditemukan');

    const items = b.items || [];
    const totalBeli = items.reduce((sum, it) => sum + Number(it.harga || 0), 0);
    const totalOngkir = Number(b.total_ongkir || 0);
    const totalHpp = totalBeli + totalOngkir;
    const batchNama = b.nama_batch || b.kode_batch || `Batch #${b.id}`;

    const body = `
      <div class="batch-detail-modal-content" style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header Info Cards -->
        <div class="stat-cards-grid" style="grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:4px;">
          <div class="stat-card" style="padding:12px;">
            <div class="stat-label" style="font-size:11px;">Jumlah Item</div>
            <div class="stat-value" style="font-size:1.15rem; color:var(--gold-light);">${items.length} item</div>
          </div>
          <div class="stat-card" style="padding:12px;">
            <div class="stat-label" style="font-size:11px;">Total Beli</div>
            <div class="stat-value" style="font-size:1.15rem; color:var(--text-primary);">${formatRupiah(totalBeli)}</div>
          </div>
          <div class="stat-card" style="padding:12px;">
            <div class="stat-label" style="font-size:11px;">Total Ongkir Lot</div>
            <div class="stat-value" style="font-size:1.15rem; color:var(--info);">${formatRupiah(totalOngkir)}</div>
          </div>
          <div class="stat-card" style="padding:12px;">
            <div class="stat-label" style="font-size:11px;">Total HPP Lot</div>
            <div class="stat-value" style="font-size:1.15rem; color:var(--gold-primary);">${formatRupiah(totalHpp)}</div>
          </div>
        </div>

        <!-- Meta Details Grid -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
          <div class="data-grid-2" style="gap:12px;">
            <div>
              <div style="margin-bottom:8px;">
                <span style="font-size:11px; color:var(--text-secondary); display:block;">Kode Batch</span>
                <strong style="color:var(--gold-light); font-family:monospace; font-size:13px;">${escapeHtml(b.kode_batch || '#' + b.id)}</strong>
              </div>
              <div style="margin-bottom:8px;">
                <span style="font-size:11px; color:var(--text-secondary); display:block;">Supplier / Pelelang</span>
                <strong style="color:var(--text-primary); font-size:13px;">${escapeHtml(b.supplier_nama || '-')}</strong>
                ${b.supplier_no_hp ? `<span style="font-size:11px; color:var(--text-muted); display:block;">📞 ${escapeHtml(b.supplier_no_hp)}</span>` : ''}
              </div>
              <div>
                <span style="font-size:11px; color:var(--text-secondary); display:block;">Metode Perolehan</span>
                <span class="badge" style="background:rgba(212,175,55,0.12); color:var(--gold-light); font-size:11px;">
                  ${escapeHtml(PEROLEHAN_LABELS[b.perolehan] || b.perolehan || '-')}
                </span>
              </div>
            </div>

            <div>
              <div style="margin-bottom:8px;">
                <span style="font-size:11px; color:var(--text-secondary); display:block;">Tanggal Pembelian</span>
                <strong style="color:var(--text-primary); font-size:13px;">${formatDate(b.tanggal_beli || b.created_at)}</strong>
              </div>
              <div style="margin-bottom:8px;">
                <span style="font-size:11px; color:var(--text-secondary); display:block;">Status Batch</span>
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                  ${formatStatus(b.status)}
                  ${b.status !== 'terima'
                    ? `<span class="badge" style="background:rgba(91,156,240,0.14); color:var(--info); border:1px solid rgba(91,156,240,0.35); font-weight:600; font-size:11px;">${b.status === 'dikirim' ? '🚚 Sedang Dikirim (Checklist Nonaktif)' : '⏳ Masih Dipesan (Checklist Nonaktif)'}</span>`
                    : (b.is_final_ok
                        ? '<span class="badge" style="background:rgba(46,125,50,0.22); color:#4caf50; border:1px solid #4caf50; font-weight:700; font-size:11px;">✅ Final OK (Barang Lengkap)</span>'
                        : '<span class="badge" style="background:rgba(232,168,56,0.16); color:var(--warning); border:1px solid rgba(232,168,56,0.5); font-weight:700; font-size:11px;">⚠️ Kurang / Belum Lengkap</span>')}
                </div>
              </div>
              <div>
                <span style="font-size:11px; color:var(--text-secondary); display:block;">Tautan Bukti / Profil</span>
                ${b.link_pembelian ? `
                  <a href="${escapeHtml(b.link_pembelian)}" target="_blank" rel="noopener noreferrer" style="color:var(--info); font-size:12px; text-decoration:underline; word-break:break-all;">
                    🔗 Buka Link Pembelian
                  </a>
                ` : b.supplier_link ? `
                  <a href="${escapeHtml(b.supplier_link)}" target="_blank" rel="noopener noreferrer" style="color:var(--info); font-size:12px; text-decoration:underline; word-break:break-all;">
                    🔗 Profil Supplier
                  </a>
                ` : '<span style="font-size:12px; color:var(--text-muted);">-</span>'}
              </div>
            </div>
          </div>

          ${b.catatan ? `
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border);">
              <span style="font-size:11px; color:var(--text-secondary); display:block;">Catatan Internal</span>
              <p style="font-size:12px; color:var(--text-primary); margin:2px 0 0; white-space:pre-wrap;">${escapeHtml(b.catatan)}</p>
            </div>
          ` : ''}
        </div>

        <!-- Items Table Preview -->
        <div>
          <h5 style="font-size:13px; color:var(--text-primary); margin:0 0 8px; display:flex; justify-content:space-between; align-items:center;">
            <span>Daftar Item Koleksi dalam Batch (${items.length})</span>
          </h5>
          <div class="table-wrapper table-compact" style="max-height:260px; overflow-y:auto;">
            <table>
              <thead>
                <tr>
                  <th style="text-align:center; width:45px;">Cek</th>
                  <th>No</th>
                  <th>Kode Item</th>
                  <th>Nama Item</th>
                  <th>Grade</th>
                  <th>Jenis</th>
                  <th style="text-align:center;">Qty</th>
                  <th>Harga Beli</th>
                  <th>HPP/pcs</th>
                </tr>
              </thead>
              <tbody>
                ${items.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align:center; color:var(--text-muted); padding:16px;">
                      Belum ada item koleksi dalam batch ini
                    </td>
                  </tr>
                ` : items.map((it, idx) => `
                  <tr style="${it.is_checked ? 'background: rgba(46,125,50,0.08);' : ''}">
                    <td style="text-align:center;">${it.is_checked ? '<span style="color:#4caf50; font-weight:bold; font-size:14px;" title="Sudah dicek fisik">✓</span>' : '<span style="color:var(--text-muted);">-</span>'}</td>
                    <td>${idx + 1}</td>
                    <td><strong style="color:var(--gold-light); font-family:monospace; font-size:11px;">${escapeHtml(it.kode_item || '-')}</strong></td>
                    <td>
                      <strong>${escapeHtml(it.nama_item || '-')}</strong>
                      ${it.is_checked ? '<span style="color:#4caf50; font-size:11px; margin-left:4px;" title="Sudah dicek fisik">✓</span>' : ''}
                    </td>
                    <td>${formatGrade(it.grade)}</td>
                    <td>${formatJenis(it.jenis)}</td>
                    <td style="text-align:center;">${it.qty || 1}</td>
                    <td>${formatRupiah(it.harga || 0)}</td>
                    <td style="color:var(--gold-light); font-weight:600;">${formatRupiah(it.hpp_per_pcs || it.hpp || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal(); showCopyBatchModal(${b.id});" title="Copy &amp; Edit Batch">
            <span>📋 Copy &amp; Edit Batch</span>
          </button>
          <button type="button" class="btn btn-secondary" onclick="showPrintBatchCrosscheckModal(${b.id})">
            <span>🖨️ Cetak / Ekspor PDF</span>
          </button>
          <button type="button" class="btn btn-primary" onclick="closeModal(); selectBatch(${b.id});">
            <span>📂 Buka &amp; Kelola Batch Ini</span>
          </button>
        </div>
      </div>
    `;

    openModal({
      title: `📦 Detail Batch: ${escapeHtml(batchNama)}`,
      body: body,
      footer: footer,
      size: 'lg'
    });
  } catch (err) {
    showToast('Gagal memuat detail batch: ' + err.message, 'error');
  }
}

async function selectBatch(id) {
  currentBatchId = id;
  selectedBatchItemIds.clear();
  const mainView = document.getElementById('batchMainView');
  if (!mainView) return;
  renderLoading('batchMainView', 'Mengambil rincian item batch...');

  try {
    const batch = await API.get(`/batch/${id}`);
    currentBatchData = batch;
    renderBatchDetail(batch);
  } catch (err) {
    showToast('Gagal memuat batch: ' + err.message, 'error');
    loadPembelianBatch();
  }
}

function renderBatchDetail(b) {
  const mainView = document.getElementById('batchMainView');
  if (!mainView) return;

  const items = b.items || [];
  const totalBeli = items.reduce((sum, it) => sum + Number(it.harga || it.harga_beli || 0), 0);
  const totalOngkir = Number(b.total_ongkir || 0);
  const totalHpp = totalBeli + totalOngkir;

  const batchNama = b.nama_batch || b.nama || 'Batch';
  const isReceived = (b.status === 'terima');
  const isFinalOk = isReceived && Boolean(b.is_final_ok);

  let headerBadgeHtml = '';
  if (!isReceived) {
    headerBadgeHtml = `
      <span id="batchFinalStatusBadge" class="badge" style="background:rgba(91,156,240,0.14); color:var(--info); border:1px solid rgba(91,156,240,0.35); font-weight:700; font-size:11.5px; padding:3px 9px;">
        ${b.status === 'dikirim' ? '🚚 SEDANG DIKIRIM (BELUM DITERIMA)' : '⏳ MASIH DIPESAN (BELUM DITERIMA)'}
      </span>
    `;
  } else if (isFinalOk) {
    headerBadgeHtml = `
      <span id="batchFinalStatusBadge" class="badge" style="background:rgba(46,125,50,0.22); color:#4caf50; border:1px solid #4caf50; font-weight:700; font-size:11.5px; padding:3px 9px;">
        ✅ FINAL OK (BARANG LENGKAP)
      </span>
    `;
  } else {
    headerBadgeHtml = `
      <span id="batchFinalStatusBadge" class="badge" style="background:rgba(232,168,56,0.16); color:var(--warning); border:1px solid rgba(232,168,56,0.5); font-weight:700; font-size:11.5px; padding:3px 9px;">
        ⚠️ KURANG / BELUM LENGKAP
      </span>
    `;
  }

  mainView.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:18px;">
      <!-- Toolbar: Back button & Batch Actions -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="loadPembelianBatch()">
          <span>◀ Kembali ke Daftar Batch</span>
        </button>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="showCopyBatchModal(${b.id})" title="Copy &amp; Edit Batch ini menjadi batch baru">
            📋 Copy &amp; Edit Batch
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showPrintBatchCrosscheckModal(${b.id})" title="Cetak / Ekspor PDF Lembar Crosscheck Batch">
            🖨️ Cetak / Ekspor PDF Crosscheck
          </button>
          <button class="btn btn-secondary btn-sm" onclick="recalculateBatchOngkir(${b.id})" title="Alokasikan total ongkir ke seluruh item proporsional">
            ⚡ Hitung Ulang Ongkir
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteBatch(${b.id}, '${escapeHtml(batchNama)}')">
            Hapus Batch
          </button>
        </div>
      </div>

      <!-- Batch Header Edit Card -->
      <div class="card">
        <div class="section-header" style="margin-bottom:14px;">
          <h4 style="color:var(--gold-light); font-size:15px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0;">
            <span>📦 ${escapeHtml(batchNama)}</span>
            <span style="font-size:12px; color:var(--text-muted); font-weight:400;">(${escapeHtml(b.kode_batch || '#' + b.id)})</span>
            ${headerBadgeHtml}
            <label id="bhFinalOkLabel" for="bhIsFinalOk" style="display:inline-flex; flex-direction:row; align-items:center; gap:7px; padding:3px 10px; border-radius:6px; background:${isFinalOk ? 'rgba(46,125,50,0.12)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isFinalOk ? 'rgba(76,175,80,0.4)' : 'var(--border)'}; font-size:12px; font-weight:600; color:var(--text-primary); user-select:none; ${!isReceived ? 'opacity:0.45; cursor:not-allowed;' : 'cursor:pointer;'}" title="${!isReceived ? 'Fitur Final OK hanya aktif jika Status Batch adalah DITERIMA' : 'Centang jika seluruh isi lot telah diverifikasi fisik lengkap'}">
              <input type="checkbox" id="bhIsFinalOk" ${isFinalOk ? 'checked' : ''} ${!isReceived ? 'disabled' : ''}
                     onchange="toggleBatchFinalOk(${b.id}, this.checked ? 1 : 0)"
                     style="width:15px; height:15px; accent-color:#4caf50; margin:0; flex-shrink:0; ${!isReceived ? 'cursor:not-allowed;' : 'cursor:pointer;'}">
              <span>Tandai Final OK (Barang Lengkap)</span>
            </label>
          </h4>
        </div>

        <form id="editBatchHeaderForm" onsubmit="event.preventDefault(); saveBatchHeader(${b.id});">
          <div class="data-grid-3">
            <div class="form-group">
              <label class="form-label">Nama Batch</label>
              <input type="text" id="bhNama" class="form-control" value="${escapeHtml(batchNama)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Total Ongkir Lot (Rp)</label>
              <input type="number" id="bhOngkir" class="form-control" value="${b.total_ongkir || 0}" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Supplier</label>
              <select id="bhSupplier" class="form-select"></select>
            </div>
          </div>

          <div class="data-grid-3">
            <div class="form-group">
              <label class="form-label">Metode Perolehan</label>
              <select id="bhPerolehan" class="form-select">
                ${PEROLEHAN_OPTIONS.map(opt => `<option value="${opt}" ${opt === b.perolehan ? 'selected' : ''}>${PEROLEHAN_LABELS[opt] || opt}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status Batch</label>
              <select id="bhStatus" class="form-select">
                ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === b.status ? 'selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Beli</label>
              <input type="date" id="bhTanggal" class="form-control" value="${b.tanggal_beli ? b.tanggal_beli.split('T')[0] : ''}">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
              <span>🔗 Link Pembelian Batch / Lot</span>
              ${b.link_pembelian ? `<a href="${escapeHtml(b.link_pembelian)}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px; color:var(--info); text-decoration:underline;">🔗 Buka Link Batch ↗</a>` : ''}
            </label>
            <input type="text" id="bhLinkPembelian" class="form-control" value="${escapeHtml(b.link_pembelian || '')}" placeholder="cth: https://www.facebook.com/... atau link lelang lot">
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:4px;">
            <button type="submit" class="btn btn-primary btn-sm">Simpan Header Batch</button>
          </div>
        </form>
      </div>

      <!-- Batch Items Card -->
      <div class="card">
        <div class="section-header">
          <div>
            <h4 style="font-size:15px; color:var(--text-primary);">Item dalam Batch (${items.length})</h4>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              Total Beli: <strong>${formatRupiah(totalBeli)}</strong> | Total HPP: <strong style="color:var(--gold-light);">${formatRupiah(totalHpp)}</strong>
              ${!isReceived
                ? ' | <span style="color:var(--info);">🔒 Fitur checklist aktif saat Status Batch = Diterima</span>'
                : (items.length > 0 ? ` | Dicek: <strong style="color:#4caf50;">✓ ${items.filter(it => Number(it.is_checked) === 1).length}/${items.length}</strong>` : '')}
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            ${selectedBatchItemIds.size > 0 ? `
              <button type="button" class="btn btn-danger btn-sm" id="btnBulkDeleteBatchItems" onclick="bulkDeleteSelectedBatchItems(${b.id})" style="font-weight:700;">
                🗑️ Hapus (${selectedBatchItemIds.size}) Item Terpilih
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="clearSelectedBatchItems(${b.id})">
                Batal Pilih
              </button>
            ` : ''}
            <button type="button" class="btn btn-secondary btn-sm" onclick="showAddLotToBatchModal(${b.id})" style="border-color:var(--gold-primary); color:var(--gold-light); background:rgba(212,175,55,0.12); font-weight:700;" title="Tambahkan 1 Lot yang terdiri dari beberapa item dengan 1 harga beli gabungan">
              + 🎁 Tambah Paket Lot (1 Harga)
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="showAddItemToBatchModal(${b.id})">
              + Tambah Item Satuan
            </button>
          </div>
        </div>

        <div class="table-wrapper table-compact">
          <table>
            <thead>
              <tr>
                <th style="width:38px; text-align:center;" title="Pilih Semua Item untuk Hapus Masal">
                  <input type="checkbox" id="itemSelectAllHeader"
                         ${items.length > 0 && items.every(it => selectedBatchItemIds.has(it.id)) ? 'checked' : ''}
                         onchange="toggleSelectAllBatchItems(${b.id}, this.checked)"
                         style="width:16px; height:16px; accent-color:var(--danger); vertical-align:middle; cursor:pointer;"
                         title="Pilih / Batalkan Semua Item untuk Hapus">
                </th>
                <th style="width:45px; text-align:center;" title="${!isReceived ? 'Checklist item hanya aktif jika Status Batch adalah DITERIMA' : 'Checklist / Batal Cek Semua Item'}">
                  <input type="checkbox" id="batchCheckAllHeader"
                         ${isReceived && items.length > 0 && items.every(it => Number(it.is_checked) === 1) ? 'checked' : ''}
                         ${(!isReceived || items.length === 0) ? 'disabled' : ''}
                         onchange="checkAllBatchItems(${b.id}, this.checked ? 1 : 0)"
                         style="width:18px; height:18px; accent-color:#4caf50; vertical-align:middle; margin:0; ${(!isReceived || items.length === 0) ? 'opacity:0.35; cursor:not-allowed;' : 'cursor:pointer;'}"
                         title="${!isReceived ? 'Checklist item hanya aktif jika Status Batch adalah DITERIMA' : 'Centang untuk cek semua item / batalkan semua'}">
                </th>
                <th>Nama Item &amp; Seri</th>
                <th>Tgl Beli</th>
                <th>Grade</th>
                <th>Qty</th>
                <th>Harga Beli</th>
                <th>Alokasi Ongkir</th>
                <th>Total HPP</th>
                <th>HPP/pcs</th>
                <th style="text-align:center;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${renderBatchItemRows(items, b.id, isReceived)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  loadSuppliersIntoDropdown('bhSupplier', b.supplier_id);

  const headerCb = document.getElementById('batchCheckAllHeader');
  if (headerCb && isReceived && items.length > 0) {
    const checkedCnt = items.filter(it => Number(it.is_checked) === 1).length;
    headerCb.indeterminate = (checkedCnt > 0 && checkedCnt < items.length);
  }

  const itemAllCb = document.getElementById('itemSelectAllHeader');
  if (itemAllCb && items.length > 0) {
    const selectedItemCount = items.filter(it => selectedBatchItemIds.has(it.id)).length;
    itemAllCb.indeterminate = (selectedItemCount > 0 && selectedItemCount < items.length);
  }
}

function renderBatchItemRows(items, batchId, isReceived = true) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="11" style="text-align:center; padding:24px; color:var(--text-muted);">
          Belum ada item di dalam batch ini. Klik tombol "+ Tambah Item ke Batch".
        </td>
      </tr>
    `;
  }

  return items.map(it => {
    const rawHarga = Number(it.harga || it.harga_beli || 0);
    const itemQty = Math.max(1, Number(it.qty) || 1);
    const itemTotalBeli = rawHarga; // Harga input adalah sudah total
    const hargaPerPcs = Math.round(itemTotalBeli / itemQty);
    const itemTotalOngkir = Number(it.ongkir || it.ongkir_alokasi || 0);
    const itemHpp = it.hpp || (itemTotalBeli + itemTotalOngkir);
    const hppPcs = it.hpp_per_pcs || Math.round(itemHpp / itemQty);
    const tglDisplay = it.tanggal_beli ? formatDate(it.tanggal_beli) : '-';

    const fotoObv = it.foto_obv || it.foto_path;
    const fotoRev = it.foto_rev;
    const hasPhoto = Boolean(fotoObv || fotoRev);

    const itemChecked = isReceived && Boolean(it.is_checked);
    const isItemSelected = selectedBatchItemIds.has(it.id);

    return `
      <tr style="${isItemSelected ? 'background: rgba(239,83,80,0.08);' : (itemChecked ? 'background: rgba(46,125,50,0.07);' : '')}">
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <input type="checkbox" class="item-select-checkbox" data-id="${it.id}"
                 ${isItemSelected ? 'checked' : ''}
                 onchange="toggleSelectBatchItem(${it.id}, ${batchId}, this.checked)"
                 style="width:16px; height:16px; accent-color:var(--danger); cursor:pointer;"
                 title="Pilih item ini untuk hapus">
        </td>
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <input type="checkbox" class="batch-item-checkbox" ${itemChecked ? 'checked' : ''} ${!isReceived ? 'disabled' : ''}
                 onchange="handleToggleBatchItemCheck(${it.id}, ${batchId}, this.checked)"
                 style="width:18px; height:18px; accent-color:#4caf50; ${!isReceived ? 'opacity:0.35; cursor:not-allowed;' : 'cursor:pointer;'}"
                 title="${!isReceived ? 'Checklist item hanya aktif jika Status Batch adalah DITERIMA' : (itemChecked ? 'Sudah dicek (klik untuk batalkan)' : 'Klik untuk checklist item ini dari web')}">
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${getJenisIcon(it.jenis)}</span>
            <strong style="cursor:pointer;" onclick="showEditBatchItemModal(${it.id}, ${batchId})" title="Klik untuk edit">${escapeHtml(it.nama_item || '-')}</strong>
            ${itemChecked ? '<span title="Item sudah dicek fisik dari web" style="color:#4caf50; font-weight:bold; font-size:12px;">✓</span>' : ''}
            ${hasPhoto ? `<span class="photo-indicator" title="Lihat foto item" onclick="viewImageLightbox('${escapeHtml(fotoObv || fotoRev)}', '${escapeHtml(it.nama_item)}')">📷</span>` : ''}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
            ${it.lot_id ? `<span class="badge" onclick="event.stopPropagation(); showLotTraceModal(${it.lot_id})" style="background:rgba(212,175,55,0.16); color:var(--gold-light); border:1px solid var(--border-gold); font-size:10px; padding:1px 6px; cursor:pointer;" title="Bagian dari Paket Lot: ${escapeHtml(it.lot_nama || it.lot_kode || ('Lot #' + it.lot_id))} (Total 1 Lot: ${formatRupiah(it.lot_harga_total || 0)} untuk ${it.lot_item_count || 1} item). Klik untuk Trace &amp; Kelola Lot.">🎁 ${escapeHtml(it.lot_kode || ('LOT-' + it.lot_id))} (${it.lot_item_count || 1} item • Lot ${formatRupiah(it.lot_harga_total || 0)})</span>` : ''}
            ${it.nomor_seri ? `<span class="item-serial-compact" title="Nomor Seri">SN: ${escapeHtml(it.nomor_seri)}</span>` : ''}
            ${it.group_nama ? `<span class="badge badge-group" style="font-size:10px; padding:1px 5px;">🗂️ ${escapeHtml(it.group_nama)}</span>` : ''}
            ${it.negara ? `<span style="font-size:10px; color:var(--text-muted);">${escapeHtml(it.negara)}</span>` : ''}
            ${it.link_pembelian ? `<a href="${escapeHtml(it.link_pembelian)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="font-size:10.5px; color:var(--info); text-decoration:underline;" title="${escapeHtml(it.link_pembelian)}">🔗 Link Pembelian ↗</a>` : ''}
          </div>
          ${it.detail ? `<div style="font-size:10.5px; color:var(--text-secondary); margin-top:2px; font-style:italic;">"${escapeHtml(it.detail)}"</div>` : ''}
        </td>
        <td style="font-size:11.5px; color:var(--text-secondary);">${tglDisplay}</td>
        <td>${formatGrade(it.grade)}</td>
        <td><strong>${itemQty}</strong></td>
        <td>
          <div style="font-weight:600;">${formatRupiah(itemTotalBeli)}</div>
          ${itemQty > 1 ? `<div style="font-size:10.5px; color:var(--text-muted);">(@ ${formatRupiah(hargaPerPcs)}/pcs)</div>` : ''}
        </td>
        <td style="color:var(--gold-light);">${formatRupiah(itemTotalOngkir)}</td>
        <td>${formatRupiah(itemHpp)}</td>
        <td style="font-weight:700; color:var(--gold-primary);">${formatRupiah(hppPcs)}</td>
        <td style="text-align:center;">
          <div class="td-actions" style="justify-content:center;">
            <button class="btn btn-secondary btn-icon" onclick="showUploadFotoModal(${it.id}, '${escapeHtml(it.nama_item || 'Item Batch')}')" title="Kelola Foto OBV, REV &amp; Gambar Pendukung">
              📸
            </button>
            <button class="btn btn-secondary btn-icon" onclick="showCopyAndEditBatchItemModal(${it.id}, ${batchId})" title="Copy &amp; Edit Item (Salin data item ini untuk langsung diedit sebagian)">
              📋
            </button>
            <button class="btn btn-secondary btn-icon" onclick="showEditBatchItemModal(${it.id}, ${batchId})" title="Edit Item Batch">
              ✏️
            </button>
            <button class="btn btn-danger btn-icon" onclick="deleteItemFromBatch(${it.id}, ${batchId})" title="Hapus Item">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function showCreateBatchModal() {
  const body = `
    <form id="createBatchModalForm" onsubmit="event.preventDefault(); submitCreateBatch();">
      <div class="form-group">
        <label class="form-label">Nama Batch / Lot Pembelian <span class="required">*</span></label>
        <input type="text" id="nbNama" class="form-control" placeholder="cth: Lelang FB Grup Numismatik Lot A" required>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Supplier / Pelelang</label>
          <select id="nbSupplier" class="form-select"></select>
        </div>
        <div class="form-group">
          <label class="form-label">Total Ongkos Kirim Lot (Rp)</label>
          <input type="number" id="nbOngkir" class="form-control" value="0" min="0">
        </div>
      </div>

      <div class="data-grid-3">
        <div class="form-group">
          <label class="form-label">Metode Perolehan</label>
          <select id="nbPerolehan" class="form-select">
            ${PEROLEHAN_OPTIONS.map(opt => `<option value="${opt}">${PEROLEHAN_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status Pengiriman</label>
          <select id="nbStatus" class="form-select">
            ${STATUS_OPTIONS.map(opt => `<option value="${opt}">${STATUS_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Beli</label>
          <input type="date" id="nbTanggal" class="form-control" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">🔗 Link Pembelian Batch / Lot</label>
        <input type="text" id="nbLinkPembelian" class="form-control" placeholder="cth: https://www.facebook.com/... atau link lelang lot">
      </div>

      <div class="form-group">
        <label class="form-label">Catatan Batch</label>
        <textarea id="nbCatatan" class="form-control" placeholder="Keterangan tambahan lot atau catatan lelang"></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-primary" onclick="submitCreateBatch()">Buat Batch</button>
  `;

  openModal({
    title: '📦 Buat Batch Pengadaan Baru',
    body,
    footer,
    size: 'md'
  });

  loadSuppliersIntoDropdown('nbSupplier');
}

async function submitCreateBatch() {
  const nama = document.getElementById('nbNama')?.value.trim();
  const supplierId = document.getElementById('nbSupplier')?.value;
  const ongkir = parseFloat(document.getElementById('nbOngkir')?.value || '0');
  const perolehan = document.getElementById('nbPerolehan')?.value;
  const status = document.getElementById('nbStatus')?.value;
  const tanggal = document.getElementById('nbTanggal')?.value;
  const linkPembelian = document.getElementById('nbLinkPembelian')?.value.trim();
  const catatan = document.getElementById('nbCatatan')?.value.trim();

  if (!nama) {
    showToast('Nama batch wajib diisi.', 'warning');
    return;
  }

  const payload = {
    nama,
    nama_batch: nama,
    supplier_id: supplierId ? parseInt(supplierId, 10) : null,
    total_ongkir: ongkir,
    perolehan: perolehan,
    metode_perolehan: perolehan,
    status,
    link_pembelian: linkPembelian || null,
    tanggal_beli: tanggal || null,
    catatan: catatan || null
  };

  try {
    const res = await API.post('/batch', payload);
    showToast('Batch baru berhasil dibuat!', 'success');
    closeModal();
    if (res && res.id) {
      selectBatch(res.id);
    } else {
      loadPembelianBatch();
    }
  } catch (err) {
    showToast('Gagal membuat batch: ' + err.message, 'error');
  }
}

async function showCopyBatchModal(batchId) {
  try {
    const b = await API.get(`/batch/${batchId}`);
    if (!b) throw new Error('Data batch asal tidak ditemukan');

    const items = b.items || [];
    const sourceTitle = b.nama_batch || b.kode_batch || `Batch #${b.id}`;
    const defaultCopyName = b.nama_batch || b.kode_batch || 'Batch';
    const defaultDate = b.tanggal_beli ? b.tanggal_beli.split('T')[0] : new Date().toISOString().split('T')[0];
    const defaultStatus = b.status || 'pesan';

    const body = `
      <form id="copyBatchModalForm" onsubmit="event.preventDefault(); submitCopyBatch(${batchId});">
        <!-- Banner info batch asal -->
        <div style="margin-bottom:14px; background:rgba(212,175,55,0.08); border:1px solid var(--border-gold); padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:12.5px; color:var(--gold-light); font-weight:700;">
              📋 Duplikasi dari Batch: <span style="color:var(--text-primary);">${escapeHtml(sourceTitle)}</span>
              ${b.kode_batch ? `<code style="font-size:11px; color:var(--text-muted); margin-left:4px;">(${escapeHtml(b.kode_batch)})</code>` : ''}
            </div>
            <div style="font-size:11.5px; color:var(--text-secondary); margin-top:3px;">
              Membuat batch baru dengan menyalin konfigurasi dan opsi duplikasi seluruh <strong>${items.length} item</strong> koleksi di dalamnya.
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nama Batch Baru <span class="required">*</span></label>
          <input type="text" id="cpbNama" class="form-control" value="${escapeHtml(defaultCopyName)}" placeholder="cth: [Salinan] Nama Batch" required>
        </div>

        <div class="data-grid-2">
          <div class="form-group">
            <label class="form-label">Supplier / Pelelang</label>
            <select id="cpbSupplier" class="form-select"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Total Ongkos Kirim Lot Baru (Rp)</label>
            <input type="number" id="cpbOngkir" class="form-control" value="${b.total_ongkir || 0}" min="0">
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Metode Perolehan</label>
            <select id="cpbPerolehan" class="form-select">
              ${PEROLEHAN_OPTIONS.map(opt => `<option value="${opt}" ${opt === b.perolehan ? 'selected' : ''}>${PEROLEHAN_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status Pengiriman</label>
            <select id="cpbStatus" class="form-select">
              ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === defaultStatus ? 'selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Beli Baru</label>
            <input type="date" id="cpbTanggal" class="form-control" value="${defaultDate}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">🔗 Link Pembelian Batch Baru</label>
          <input type="text" id="cpbLinkPembelian" class="form-control" value="${escapeHtml(b.link_pembelian || '')}" placeholder="cth: https://www.facebook.com/... atau link lelang lot">
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Batch</label>
          <textarea id="cpbCatatan" class="form-control" rows="2" placeholder="Catatan atau keterangan batch baru">${escapeHtml(b.catatan || '')}</textarea>
        </div>

        <!-- Options Duplikasi Item & Foto -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-top:14px;">
          <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            ⚙️ Opsi Duplikasi Item
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
              <input type="checkbox" id="cpbCopyItems" ${items.length > 0 ? 'checked' : 'disabled'} onchange="document.getElementById('cpbSubOptions').style.display = this.checked ? 'flex' : 'none';" style="accent-color:var(--gold-primary); width:16px; height:16px;">
              <span><strong>Salin semua item koleksi (${items.length} item)</strong> ke batch baru</span>
            </label>
            <div id="cpbSubOptions" style="display:${items.length > 0 ? 'flex' : 'none'}; flex-direction:column; gap:6px; margin-left:24px; padding-left:10px; border-left:2px solid var(--border);">
              <label style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:var(--text-secondary); cursor:pointer;">
                <input type="checkbox" id="cpbCopyPhotos" checked style="accent-color:var(--gold-primary); width:15px; height:15px;">
                <span>Salin seluruh foto item (foto utama, tampak depan/belakang, dan galeri pendukung)</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:var(--text-secondary); cursor:pointer;">
                <input type="checkbox" id="cpbResetChecklist" checked style="accent-color:var(--gold-primary); width:15px; height:15px;">
                <span>Setel ulang verifikasi fisik (semua item berstatus belum dicek / Final OK baru)</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" id="btnSubmitCopyBatch" onclick="submitCopyBatch(${batchId})">
        📋 Duplikasi &amp; Buka Batch Baru
      </button>
    `;

    openModal({
      title: '📋 Copy &amp; Edit Batch Pembelian',
      body,
      footer,
      size: 'md'
    });

    loadSuppliersIntoDropdown('cpbSupplier', b.supplier_id);
  } catch (err) {
    showToast('Gagal memuat data batch untuk diduplikat: ' + err.message, 'error');
  }
}

async function submitCopyBatch(sourceBatchId) {
  const btn = document.getElementById('btnSubmitCopyBatch');
  const nama = document.getElementById('cpbNama')?.value.trim();
  const supplierId = document.getElementById('cpbSupplier')?.value;
  const ongkir = parseFloat(document.getElementById('cpbOngkir')?.value || '0');
  const perolehan = document.getElementById('cpbPerolehan')?.value;
  const status = document.getElementById('cpbStatus')?.value;
  const tanggal = document.getElementById('cpbTanggal')?.value;
  const linkPembelian = document.getElementById('cpbLinkPembelian')?.value.trim();
  const catatan = document.getElementById('cpbCatatan')?.value.trim();
  const copyItems = document.getElementById('cpbCopyItems')?.checked ?? false;
  const copyPhotos = document.getElementById('cpbCopyPhotos')?.checked ?? false;
  const resetChecklist = document.getElementById('cpbResetChecklist')?.checked ?? true;

  if (!nama) {
    showToast('Nama batch baru wajib diisi.', 'warning');
    return;
  }

  const payload = {
    nama_batch: nama,
    supplier_id: supplierId ? parseInt(supplierId, 10) : null,
    total_ongkir: ongkir,
    perolehan: perolehan,
    status: status || 'pesan',
    link_pembelian: linkPembelian || null,
    tanggal_beli: tanggal || null,
    catatan: catatan || null,
    copy_items: copyItems,
    copy_photos: copyPhotos,
    reset_checklist: resetChecklist
  };

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Menduplikasi...';
  }

  try {
    const res = await API.post(`/batch/${sourceBatchId}/copy`, payload);
    showToast(res.message || 'Batch berhasil diduplikat!', 'success');
    closeModal();
    if (res && res.new_batch_id) {
      await selectBatch(res.new_batch_id);
    } else {
      await loadPembelianBatch();
    }
  } catch (err) {
    showToast('Gagal menduplikat batch: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '📋 Duplikasi &amp; Buka Batch Baru';
    }
  }
}

async function saveBatchHeader(id) {
  const nama = document.getElementById('bhNama')?.value.trim();
  const ongkir = parseFloat(document.getElementById('bhOngkir')?.value || '0');
  const supplierId = document.getElementById('bhSupplier')?.value;
  const perolehan = document.getElementById('bhPerolehan')?.value;
  const status = document.getElementById('bhStatus')?.value;
  const tanggal = document.getElementById('bhTanggal')?.value;
  const linkPembelian = document.getElementById('bhLinkPembelian')?.value.trim() || null;

  if (!nama) {
    showToast('Nama batch wajib diisi.', 'warning');
    return;
  }

  const isFinalOk = document.getElementById('bhIsFinalOk')?.checked ? 1 : 0;

  const payload = {
    nama,
    nama_batch: nama,
    total_ongkir: ongkir,
    supplier_id: supplierId ? parseInt(supplierId, 10) : null,
    perolehan,
    metode_perolehan: perolehan,
    status,
    is_final_ok: isFinalOk,
    link_pembelian: linkPembelian,
    tanggal_beli: tanggal || null
  };

  try {
    await API.put(`/batch/${id}`, payload);
    showToast('Header batch berhasil diperbarui!', 'success');
    selectBatch(id);
  } catch (err) {
    showToast('Gagal memperbarui batch: ' + err.message, 'error');
  }
}

async function recalculateBatchOngkir(id) {
  try {
    await API.post(`/batch/${id}/recalculate`, {});
    showToast('Alokasi ongkir berhasil dihitung ulang!', 'success');
    selectBatch(id);
  } catch (err) {
    showToast('Gagal menghitung ulang ongkir: ' + err.message, 'error');
  }
}

async function deleteBatch(id, nama) {
  if (!confirm(`Hapus seluruh batch "${nama}"?\n\nPERINGATAN: Semua item dalam batch ini di Koleksi, Stok, serta slot pada Album Digital akan ikut dihapus secara permanen.`)) {
    return;
  }

  try {
    const res = await API.delete(`/batch/${id}`);
    showToast(res?.message || 'Batch dan seluruh item terkait berhasil dihapus.', 'success');
    currentBatchId = null;
    loadPembelianBatch();
  } catch (err) {
    showToast('Gagal menghapus batch: ' + err.message, 'error');
  }
}

function showAddItemToBatchModal(batchId) {
  batchAddObvFile = null;
  batchAddRevFile = null;

  const defaultTgl = currentBatchData?.tanggal_beli 
    ? currentBatchData.tanggal_beli.split('T')[0] 
    : new Date().toISOString().split('T')[0];

  const body = `
    <form id="addBatchItemForm" onsubmit="event.preventDefault(); submitItemToBatch(${batchId});">
      <div class="data-grid-3">
        <div class="form-group">
          <label class="form-label">Nama Item <span class="required">*</span></label>
          <input type="text" id="biNama" class="form-control" placeholder="cth: 50 Rupiah Komodo 1997 UNC" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nomor Seri</label>
          <input type="text" id="biNomorSeri" class="form-control" placeholder="cth: ABC123456 / No Seri">
        </div>
        <div class="form-group">
          <label class="form-label">Group Item</label>
          <select id="biGroupItem" class="form-select">
            <option value="">-- Tanpa Group --</option>
          </select>
        </div>
      </div>

      <div class="data-grid-4">
        <div class="form-group">
          <label class="form-label">Jenis</label>
          <select id="biJenis" class="form-select">
            ${JENIS_OPTIONS.map(opt => `<option value="${opt}">${JENIS_LABELS[opt] || opt}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Grade</label>
          <select id="biGrade" class="form-select">
            ${GRADE_OPTIONS.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tahun</label>
          <input type="text" id="biTahun" class="form-control" placeholder="cth: 1997">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Beli Item</label>
          <input type="date" id="biTanggalBeli" class="form-control" value="${defaultTgl}">
        </div>
      </div>

      <div class="data-grid-3">
        <div class="form-group">
          <label class="form-label">Negara Asal</label>
          <input type="text" id="biNegara" class="form-control" value="Indonesia" placeholder="Indonesia">
        </div>
        <div class="form-group">
          <label class="form-label">Qty (Jumlah Pcs) <span class="required">*</span></label>
          <input type="number" id="biQty" class="form-control" value="1" min="1" required oninput="calcBatchAddUnitHint()">
        </div>
        <div class="form-group">
          <label class="form-label">Harga Beli Total (Rp) <span class="required">*</span></label>
          <input type="number" id="biHarga" class="form-control" value="0" min="0" required oninput="calcBatchAddUnitHint()">
          <div id="biHargaHint" style="font-size:11.5px; color:var(--gold-light); font-weight:600; margin-top:4px;"></div>
        </div>
      </div>

      <div class="data-grid-3">
        <div class="form-group">
          <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
          <input type="number" id="biHargaJual" class="form-control" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">🔗 Link Pembelian Item</label>
          <input type="text" id="biLinkPembelian" class="form-control" value="${escapeHtml(currentBatchData?.link_pembelian || '')}" placeholder="cth: https://... (Link lelang/item)">
        </div>
        <div class="form-group">
          <label class="form-label">Keterangan / Catatan</label>
          <input type="text" id="biKeterangan" class="form-control" placeholder="Keterangan kondisi, sertifikasi, dll.">
        </div>
      </div>

      ${SmartPhotoManager.renderSection('bai', { showSupporting: true })}
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" id="btnSubmitAddBatchItem" class="btn btn-primary" onclick="submitItemToBatch(${batchId})">Tambah ke Batch</button>
  `;

  openModal({
    title: '➕ Tambah Item Baru ke Batch',
    body,
    footer,
    size: 'lg'
  });

  SmartPhotoManager.initContext('bai', { showSupporting: true });
  loadGroupItemsIntoDropdown('biGroupItem');
  calcBatchAddUnitHint();
}

function calcBatchAddUnitHint() {
  const qty = Math.max(1, parseInt(document.getElementById('biQty')?.value || '1', 10));
  const harga = parseFloat(document.getElementById('biHarga')?.value || '0');
  const hint = document.getElementById('biHargaHint');
  if (hint) {
    const pcs = Math.round(harga / qty);
    hint.textContent = qty > 1 ? `@ Rp ${pcs.toLocaleString('id-ID')} / pcs` : '';
  }
}

function handleBatchAddObvSelect(e) {
  if (e.target.files && e.target.files[0]) {
    batchAddObvFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('baiObvPreview');
      const prompt = document.getElementById('baiObvPrompt');
      const zone = document.getElementById('baiObvZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(batchAddObvFile);
  }
}

function handleBatchAddRevSelect(e) {
  if (e.target.files && e.target.files[0]) {
    batchAddRevFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('baiRevPreview');
      const prompt = document.getElementById('baiRevPrompt');
      const zone = document.getElementById('baiRevZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(batchAddRevFile);
  }
}

async function submitItemToBatch(batchId) {
  const btn = document.getElementById('btnSubmitAddBatchItem') || document.querySelector('.modal-footer .btn-primary');
  const nama = document.getElementById('biNama')?.value.trim();
  const nomorSeri = document.getElementById('biNomorSeri')?.value.trim() || null;
  const groupId = document.getElementById('biGroupItem')?.value || null;
  const jenis = document.getElementById('biJenis')?.value;
  const grade = document.getElementById('biGrade')?.value;
  const tahun = document.getElementById('biTahun')?.value.trim() || null;
  const tanggalBeli = document.getElementById('biTanggalBeli')?.value || (currentBatchData?.tanggal_beli ? currentBatchData.tanggal_beli.split('T')[0] : null);
  const negara = document.getElementById('biNegara')?.value.trim() || 'Indonesia';
  const linkPembelian = document.getElementById('biLinkPembelian')?.value.trim() || null;
  const keterangan = document.getElementById('biKeterangan')?.value.trim() || null;
  const qty = parseInt(document.getElementById('biQty')?.value || '1', 10);
  const hargaBeli = parseFloat(document.getElementById('biHarga')?.value || '0');
  const hargaJual = parseFloat(document.getElementById('biHargaJual')?.value || '0');

  if (!nama) {
    showToast('Nama item wajib diisi.', 'warning');
    return;
  }

  const payload = {
    batch_id: batchId,
    lot_id: null,
    nama_item: nama,
    nomor_seri: nomorSeri,
    group_id: groupId ? parseInt(groupId, 10) : null,
    jenis,
    grade,
    tahun,
    negara,
    detail: keterangan,
    catatan_internal: keterangan,
    link_pembelian: linkPembelian,
    tanggal_beli: tanggalBeli,
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    status_koleksi: 'stock_jual'
  };

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
  }

  try {
    const res = await API.post('/koleksi', payload);
    const newId = res.id || res.item_id;

    if (newId) {
      await SmartPhotoManager.uploadAllForKoleksi('bai', newId);
    }

    showToast('Item berhasil ditambahkan ke batch!', 'success');
    closeModal();
    await API.post(`/batch/${batchId}/recalculate`, {}).catch(() => {});
    selectBatch(batchId);
  } catch (err) {
    showToast('Gagal menambahkan item: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Tambah ke Batch';
    }
  }
}

async function deleteItemFromBatch(itemId, batchId) {
  if (!confirm('Hapus item ini dari batch?')) return;

  try {
    await API.delete(`/koleksi/${itemId}`);
    showToast('Item dihapus dari batch.', 'success');
    await API.post(`/batch/${batchId}/recalculate`, {}).catch(() => {});
    selectBatch(batchId);
  } catch (err) {
    showToast('Gagal menghapus item: ' + err.message, 'error');
  }
}


/**
 * Modal Edit Item di dalam Batch
 */
async function showEditBatchItemModal(itemId, batchId) {
  batchEditObvFile = null;
  batchEditRevFile = null;

  try {
    let item = await API.get(`/koleksi/${itemId}`);

    const defaultTgl = item.tanggal_beli 
      ? item.tanggal_beli.split('T')[0] 
      : (currentBatchData?.tanggal_beli ? currentBatchData.tanggal_beli.split('T')[0] : '');

    const fotoObv = item.foto_obv || item.foto_path;
    const fotoRev = item.foto_rev;

    const body = `
      <form id="editBatchItemForm" onsubmit="event.preventDefault(); submitUpdateBatchItem(${itemId}, ${batchId});">
        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Nama Item <span class="required">*</span></label>
            <input type="text" id="ebiNama" class="form-control" value="${escapeHtml(item.nama_item)}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Seri (Serial Number)</label>
            <input type="text" id="ebiNomorSeri" class="form-control" value="${escapeHtml(item.nomor_seri || '')}" placeholder="cth: ABC123456 / No Seri">
          </div>
          <div class="form-group">
            <label class="form-label">Group Item</label>
            <select id="ebiGroupItem" class="form-select">
              <option value="">-- Tanpa Group --</option>
            </select>
          </div>
        </div>

        <div class="data-grid-4">
          <div class="form-group">
            <label class="form-label">Jenis</label>
            <select id="ebiJenis" class="form-select">
              ${JENIS_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.jenis ? 'selected' : ''}>${JENIS_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Grade</label>
            <select id="ebiGrade" class="form-select">
              ${GRADE_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.grade ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tahun</label>
            <input type="text" id="ebiTahun" class="form-control" value="${escapeHtml(item.tahun || '')}" placeholder="cth: 1997">
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Beli Item</label>
            <input type="date" id="ebiTanggalBeli" class="form-control" value="${defaultTgl}">
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Negara Asal</label>
            <input type="text" id="ebiNegara" class="form-control" value="${escapeHtml(item.negara || 'Indonesia')}" placeholder="Indonesia">
          </div>
          <div class="form-group">
            <label class="form-label">Qty (Jumlah Pcs) <span class="required">*</span></label>
            <input type="number" id="ebiQty" class="form-control" value="${item.qty || 1}" min="1" required oninput="calcBatchEditUnitHint()">
          </div>
          <div class="form-group">
            <label class="form-label">Harga Beli Total (Rp) <span class="required">*</span></label>
            <input type="number" id="ebiHarga" class="form-control" value="${item.harga ?? (item.harga_beli ?? 0)}" min="0" required oninput="calcBatchEditUnitHint()">
            <div id="ebiHargaHint" style="font-size:11.5px; color:var(--gold-light); font-weight:600; margin-top:4px;"></div>
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
            <input type="number" id="ebiHargaJual" class="form-control" value="${item.harga_jual || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
              <span>🔗 Link Pembelian Item</span>
              ${item.link_pembelian ? `<a href="${escapeHtml(item.link_pembelian)}" target="_blank" rel="noopener noreferrer" style="font-size:11px; color:var(--info); text-decoration:underline;">Buka ↗</a>` : ''}
            </label>
            <input type="text" id="ebiLinkPembelian" class="form-control" value="${escapeHtml(item.link_pembelian || '')}" placeholder="cth: https://... (Link lelang/item)">
          </div>
          <div class="form-group">
            <label class="form-label">Keterangan / Catatan</label>
            <input type="text" id="ebiKeterangan" class="form-control" value="${escapeHtml(item.detail || item.catatan_internal || item.catatan || '')}" placeholder="Keterangan kondisi, sertifikasi, dll.">
          </div>
        </div>

        <label for="ebiIsChecked" style="display:flex; flex-direction:row; align-items:center; gap:10px; background:rgba(46,125,50,0.08); padding:9px 13px; border-radius:6px; border:1px solid rgba(76,175,80,0.25); margin-bottom:14px; user-select:none; ${currentBatchData?.status !== 'terima' ? 'opacity:0.45; cursor:not-allowed;' : 'cursor:pointer;'}" title="${currentBatchData?.status !== 'terima' ? 'Fitur checklist hanya aktif jika Status Batch adalah DITERIMA' : ''}">
          <input type="checkbox" id="ebiIsChecked" ${(currentBatchData?.status === 'terima' && item.is_checked) ? 'checked' : ''} ${currentBatchData?.status !== 'terima' ? 'disabled' : ''} style="width:17px; height:17px; accent-color:#4caf50; margin:0; flex-shrink:0; ${currentBatchData?.status !== 'terima' ? 'cursor:not-allowed;' : 'cursor:pointer;'}">
          <span style="font-size:12.5px; font-weight:600; color:var(--text-primary);">
            ${currentBatchData?.status !== 'terima' ? '🔒 Checklist Verifikasi (Aktif saat status pengiriman Batch = Diterima)' : '✓ Checklist Verifikasi (Item sudah diverifikasi fisik / ada di tangan)'}
          </span>
        </label>

        ${SmartPhotoManager.renderSection('bei', { initialObvUrl: fotoObv, initialRevUrl: fotoRev, showSupporting: true })}
      </form>
    `;

    const footer = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <button type="button" class="btn btn-secondary" onclick="showCopyAndEditBatchItemModal(${itemId}, ${batchId})" title="Salin data item ini sebagai item baru dan langsung edit">
          📋 Copy &amp; Edit Jadi Item Baru
        </button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="button" class="btn btn-primary" onclick="submitUpdateBatchItem(${itemId}, ${batchId})">Simpan Perubahan</button>
        </div>
      </div>
    `;

    openModal({
      title: `✏️ Edit Item Batch #${itemId}`,
      body,
      footer,
      size: 'lg'
    });

    SmartPhotoManager.initContext('bei', {
      koleksiId: itemId,
      initialObvUrl: fotoObv,
      initialRevUrl: fotoRev,
      existingGallery: item.gallery_fotos || [],
      showSupporting: true
    });
    loadGroupItemsIntoDropdown('ebiGroupItem', item.group_id);
    calcBatchEditUnitHint();
  } catch (err) {
    showToast('Gagal memuat item batch: ' + err.message, 'error');
  }
}

function calcBatchEditUnitHint() {
  const qty = Math.max(1, parseInt(document.getElementById('ebiQty')?.value || '1', 10));
  const harga = parseFloat(document.getElementById('ebiHarga')?.value || '0');
  const hint = document.getElementById('ebiHargaHint');
  if (hint) {
    const pcs = Math.round(harga / qty);
    hint.textContent = qty > 1 ? `@ Rp ${pcs.toLocaleString('id-ID')} / pcs` : '';
  }
}

function handleBatchEditObvSelect(e) {
  if (e.target.files && e.target.files[0]) {
    batchEditObvFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('beiObvPreview');
      const prompt = document.getElementById('beiObvPrompt');
      const zone = document.getElementById('beiObvZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(batchEditObvFile);
  }
}

function handleBatchEditRevSelect(e) {
  if (e.target.files && e.target.files[0]) {
    batchEditRevFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.getElementById('beiRevPreview');
      const prompt = document.getElementById('beiRevPrompt');
      const zone = document.getElementById('beiRevZone');
      if (img && prompt) {
        img.src = evt.target.result;
        img.style.display = 'block';
        prompt.style.display = 'none';
        if (zone) zone.classList.add('has-image');
      }
    };
    reader.readAsDataURL(batchEditRevFile);
  }
}

async function submitUpdateBatchItem(itemId, batchId) {
  const nama = document.getElementById('ebiNama')?.value.trim();
  const nomorSeri = document.getElementById('ebiNomorSeri')?.value.trim() || null;
  const groupId = document.getElementById('ebiGroupItem')?.value || null;
  const jenis = document.getElementById('ebiJenis')?.value;
  const grade = document.getElementById('ebiGrade')?.value;
  const tahun = document.getElementById('ebiTahun')?.value.trim() || null;
  const tanggalBeli = document.getElementById('ebiTanggalBeli')?.value || null;
  const negara = document.getElementById('ebiNegara')?.value.trim() || 'Indonesia';
  const linkPembelian = document.getElementById('ebiLinkPembelian') ? document.getElementById('ebiLinkPembelian').value.trim() : null;
  const keterangan = document.getElementById('ebiKeterangan')?.value.trim() || null;
  const qty = parseInt(document.getElementById('ebiQty')?.value || '1', 10);
  const hargaBeli = parseFloat(document.getElementById('ebiHarga')?.value || '0');
  const hargaJual = parseFloat(document.getElementById('ebiHargaJual')?.value || '0');

  if (!nama) {
    showToast('Nama item wajib diisi.', 'warning');
    return;
  }

  const payload = {
    nama_item: nama,
    nomor_seri: nomorSeri,
    group_id: groupId ? parseInt(groupId, 10) : 0,
    jenis,
    grade,
    tahun,
    negara,
    detail: keterangan,
    catatan_internal: keterangan,
    link_pembelian: linkPembelian,
    tanggal_beli: tanggalBeli,
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    is_checked: document.getElementById('ebiIsChecked')?.checked ? 1 : 0
  };

  try {
    await API.put(`/koleksi/${itemId}`, payload);
    await SmartPhotoManager.uploadAllForKoleksi('bei', itemId);

    showToast('Item batch berhasil diperbarui!', 'success');
    closeModal();
    // Recalculate batch HPP since harga/qty might have changed
    await API.post(`/batch/${batchId}/recalculate`, {}).catch(() => {});
    selectBatch(batchId);
  } catch (err) {
    showToast('Gagal memperbarui item batch: ' + err.message, 'error');
  }
}

/**
 * Modal Copy & Edit Item di dalam Batch
 * Mencopy seluruh data item sumber ke dalam form edit sehingga pengguna cukup mengubah sebagian data (misal Nomor Seri / Grade / Harga) lalu menyimpan sebagai item baru.
 */
async function showCopyAndEditBatchItemModal(itemId, batchId) {
  try {
    const item = await API.get(`/koleksi/${itemId}`);
    if (!item) throw new Error('Data item asal tidak ditemukan');

    const defaultTgl = item.tanggal_beli
      ? item.tanggal_beli.split('T')[0]
      : (currentBatchData?.tanggal_beli ? currentBatchData.tanggal_beli.split('T')[0] : new Date().toISOString().split('T')[0]);

    const fotoObv = item.foto_obv || item.foto_path || '';
    const fotoRev = item.foto_rev || '';
    const hasSourcePhotos = Boolean(fotoObv || fotoRev || (Array.isArray(item.gallery_fotos) && item.gallery_fotos.length > 0));

    window._copyBatchSourceItem = item;

    const body = `
      <form id="copyBatchItemForm" onsubmit="event.preventDefault(); submitCopyAndEditBatchItem(${itemId}, ${batchId}, false);">
        <div style="margin-bottom:14px; background:rgba(212,175,55,0.08); border:1px solid var(--border-gold); padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:12px; color:var(--gold-light); font-weight:700;">
              📋 Copy &amp; Edit dari Item: <span style="color:var(--text-primary);">${escapeHtml(item.nama_item || '-')}</span>
              ${item.kode_item ? `<code style="font-size:11px; color:var(--text-muted); margin-left:4px;">(${escapeHtml(item.kode_item)})</code>` : ''}
            </div>
            <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
              Seluruh atribut telah disalin dari item asal. Silakan sesuaikan bagian yang berbeda (misal: <strong>Nomor Seri</strong>, <strong>Grade</strong>, <strong>Harga</strong>, atau <strong>Foto</strong>) lalu simpan sebagai item baru di batch ini.
            </div>
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Nama Item <span class="required">*</span></label>
            <input type="text" id="cbiNama" class="form-control" value="${escapeHtml(item.nama_item || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Seri (Serial Number)</label>
            <input type="text" id="cbiNomorSeri" class="form-control" value="${escapeHtml(item.nomor_seri || '')}" placeholder="cth: ABC123456 / No Seri">
          </div>
          <div class="form-group">
            <label class="form-label">Group Item</label>
            <select id="cbiGroupItem" class="form-select">
              <option value="">-- Tanpa Group --</option>
            </select>
          </div>
        </div>

        <div class="data-grid-4">
          <div class="form-group">
            <label class="form-label">Jenis</label>
            <select id="cbiJenis" class="form-select">
              ${JENIS_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.jenis ? 'selected' : ''}>${JENIS_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Grade</label>
            <select id="cbiGrade" class="form-select">
              ${GRADE_OPTIONS.map(opt => `<option value="${opt}" ${opt === item.grade ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tahun</label>
            <input type="text" id="cbiTahun" class="form-control" value="${escapeHtml(item.tahun || '')}" placeholder="cth: 1997">
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Beli Item</label>
            <input type="date" id="cbiTanggalBeli" class="form-control" value="${defaultTgl}">
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Negara Asal</label>
            <input type="text" id="cbiNegara" class="form-control" value="${escapeHtml(item.negara || 'Indonesia')}" placeholder="Indonesia">
          </div>
          <div class="form-group">
            <label class="form-label">Qty (Jumlah Pcs) <span class="required">*</span></label>
            <input type="number" id="cbiQty" class="form-control" value="${item.qty || 1}" min="1" required oninput="calcBatchCopyUnitHint()">
          </div>
          <div class="form-group">
            <label class="form-label">Harga Beli Total (Rp) <span class="required">*</span></label>
            <input type="number" id="cbiHarga" class="form-control" value="${item.harga ?? (item.harga_beli ?? 0)}" min="0" required oninput="calcBatchCopyUnitHint()">
            <div id="cbiHargaHint" style="font-size:11.5px; color:var(--gold-light); font-weight:600; margin-top:4px;"></div>
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group">
            <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
            <input type="number" id="cbiHargaJual" class="form-control" value="${item.harga_jual || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
              <span>🔗 Link Pembelian Item</span>
              ${item.link_pembelian ? `<a href="${escapeHtml(item.link_pembelian)}" target="_blank" rel="noopener noreferrer" style="font-size:11px; color:var(--info); text-decoration:underline;">Buka ↗</a>` : ''}
            </label>
            <input type="text" id="cbiLinkPembelian" class="form-control" value="${escapeHtml(item.link_pembelian || '')}" placeholder="cth: https://... (Link lelang/item)">
          </div>
          <div class="form-group">
            <label class="form-label">Keterangan / Catatan</label>
            <input type="text" id="cbiKeterangan" class="form-control" value="${escapeHtml(item.detail || item.catatan_internal || item.catatan || '')}" placeholder="Keterangan kondisi, sertifikasi, dll.">
          </div>
        </div>

        ${hasSourcePhotos ? `
          <label for="cbiCopyPhotos" style="display:flex; flex-direction:row; align-items:center; gap:10px; background:rgba(212,175,55,0.08); padding:9px 13px; border-radius:6px; border:1px solid var(--border-gold); margin-bottom:14px; cursor:pointer; user-select:none;">
            <input type="checkbox" id="cbiCopyPhotos" checked style="width:17px; height:17px; accent-color:var(--gold-primary); margin:0; flex-shrink:0; cursor:pointer;">
            <span style="font-size:12.5px; font-weight:600; color:var(--text-primary);">
              🖼️ Ikut salin foto OBV, REV &amp; Galeri dari item asal <em>(jika Anda tidak mengunggah/paste foto baru di bawah)</em>
            </span>
          </label>
        ` : ''}

        ${SmartPhotoManager.renderSection('bci', { initialObvUrl: fotoObv, initialRevUrl: fotoRev, showSupporting: true })}
      </form>
    `;

    const footer = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary" id="btnCopyBatchSaveMore" onclick="submitCopyAndEditBatchItem(${itemId}, ${batchId}, true)" title="Simpan salinan ini dan tetap buka form untuk lanjut copy item berikutnya">
            📋 Simpan &amp; Copy Lagi
          </button>
          <button type="button" class="btn btn-primary" id="btnCopyBatchSaveClose" onclick="submitCopyAndEditBatchItem(${itemId}, ${batchId}, false)">
            💾 Simpan Salinan ke Batch
          </button>
        </div>
      </div>
    `;

    openModal({
      title: `📋 Copy &amp; Edit Item Batch (Dari #${itemId})`,
      body,
      footer,
      size: 'lg'
    });

    SmartPhotoManager.initContext('bci', {
      initialObvUrl: fotoObv,
      initialRevUrl: fotoRev,
      showSupporting: true
    });
    loadGroupItemsIntoDropdown('cbiGroupItem', item.group_id);
    calcBatchCopyUnitHint();

    setTimeout(() => {
      const snEl = document.getElementById('cbiNomorSeri');
      if (snEl) {
        snEl.focus();
        snEl.select();
      }
    }, 80);
  } catch (err) {
    showToast('Gagal memuat data item untuk dicopy: ' + err.message, 'error');
  }
}

function calcBatchCopyUnitHint() {
  const qty = Math.max(1, parseInt(document.getElementById('cbiQty')?.value || '1', 10));
  const harga = parseFloat(document.getElementById('cbiHarga')?.value || '0');
  const hint = document.getElementById('cbiHargaHint');
  if (hint) {
    const pcs = Math.round(harga / qty);
    hint.textContent = qty > 1 ? `@ Rp ${pcs.toLocaleString('id-ID')} / pcs` : '';
  }
}

async function submitCopyAndEditBatchItem(sourceItemId, batchId, keepOpen = false) {
  const src = window._copyBatchSourceItem || {};
  const nama = document.getElementById('cbiNama')?.value.trim();
  const nomorSeri = document.getElementById('cbiNomorSeri')?.value.trim() || null;
  const groupId = document.getElementById('cbiGroupItem')?.value || null;
  const jenis = document.getElementById('cbiJenis')?.value;
  const grade = document.getElementById('cbiGrade')?.value;
  const tahun = document.getElementById('cbiTahun')?.value.trim() || null;
  const tanggalBeli = document.getElementById('cbiTanggalBeli')?.value || null;
  const negara = document.getElementById('cbiNegara')?.value.trim() || 'Indonesia';
  const linkPembelian = document.getElementById('cbiLinkPembelian')?.value.trim() || null;
  const keterangan = document.getElementById('cbiKeterangan')?.value.trim() || null;
  const qty = parseInt(document.getElementById('cbiQty')?.value || '1', 10);
  const hargaBeli = parseFloat(document.getElementById('cbiHarga')?.value || '0');
  const hargaJual = parseFloat(document.getElementById('cbiHargaJual')?.value || '0');
  const copyPhotos = document.getElementById('cbiCopyPhotos') ? document.getElementById('cbiCopyPhotos').checked : false;

  if (!nama) {
    showToast('Nama item wajib diisi.', 'warning');
    return;
  }

  const btnClose = document.getElementById('btnCopyBatchSaveClose');
  const btnMore = document.getElementById('btnCopyBatchSaveMore');
  if (btnClose) btnClose.disabled = true;
  if (btnMore) btnMore.disabled = true;

  const ctx = SmartPhotoManager.getContext('bci');
  const hasNewObv = Boolean(ctx.obvFile);
  const hasNewRev = Boolean(ctx.revFile);
  const hasNewSup = Boolean(ctx.supportingQueue && ctx.supportingQueue.length > 0);

  const payload = {
    batch_id: batchId,
    nama_item: nama,
    nomor_seri: nomorSeri,
    group_id: groupId ? parseInt(groupId, 10) : null,
    jenis,
    grade,
    tahun,
    denominasi: src.denominasi || src.nominal || null,
    cetakan: src.cetakan || null,
    negara,
    bahan: src.bahan || null,
    warna_dominan: src.warna_dominan || null,
    dimensi: src.dimensi || null,
    kondisi_fisik: src.kondisi_fisik || null,
    lokasi_simpan: src.lokasi_simpan || null,
    detail: keterangan,
    catatan_internal: keterangan,
    lembaga_grading: src.lembaga_grading || '-',
    nomor_sertifikasi: src.nomor_sertifikasi || null,
    grade_numerik: src.grade_numerik || null,
    grading_url: src.grading_url || null,
    supplier_id: src.supplier_id || currentBatchData?.supplier_id || null,
    perolehan: src.perolehan || currentBatchData?.perolehan || null,
    link_pembelian: linkPembelian,
    tanggal_beli: tanggalBeli,
    status: src.status || currentBatchData?.status || 'pesan',
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    status_koleksi: src.status_koleksi || 'stock_jual',
    foto_obv: (!hasNewObv && copyPhotos) ? (src.foto_obv || src.foto_path || null) : null,
    foto_rev: (!hasNewRev && copyPhotos) ? (src.foto_rev || null) : null,
    foto_path: (!hasNewObv && copyPhotos) ? (src.foto_obv || src.foto_path || null) : null,
    copy_gallery_from_id: (!hasNewSup && copyPhotos) ? sourceItemId : null
  };

  try {
    const res = await API.post('/koleksi', payload);
    const newId = res.id || res.item_id;

    if (newId) {
      await SmartPhotoManager.uploadAllForKoleksi('bci', newId);
    }

    await API.post(`/batch/${batchId}/recalculate`, {}).catch(() => {});
    await selectBatch(batchId);

    if (keepOpen) {
      showToast('Salinan item berhasil ditambahkan ke batch! Silakan edit untuk item berikutnya.', 'success');
      if (btnClose) btnClose.disabled = false;
      if (btnMore) btnMore.disabled = false;
      const snEl = document.getElementById('cbiNomorSeri');
      if (snEl) {
        snEl.focus();
        snEl.select();
      }
    } else {
      showToast('Item hasil Copy & Edit berhasil ditambahkan ke batch!', 'success');
      closeModal();
    }
  } catch (err) {
    showToast('Gagal menyimpan salinan item: ' + err.message, 'error');
    if (btnClose) btnClose.disabled = false;
    if (btnMore) btnMore.disabled = false;
  }
}

/**
 * ==============================================================================
 * Fitur Cetak / Ekspor PDF Lembar Crosscheck Pembelian Batch
 * ==============================================================================
 */

const BATCH_PRINT_AVAILABLE_COLUMNS = [
  { id: 'checklist', label: 'Kotak Cek [ ✓ ]', default: true, desc: 'Kotak centang fisik untuk verifikasi fisik/unboxing' },
  { id: 'no', label: 'No. Urut', default: true, desc: 'Nomor urutan item dalam lot' },
  { id: 'foto', label: 'Thumbnail Foto', default: true, desc: 'Foto fisik item untuk identifikasi visual' },
  { id: 'kode', label: 'Kode Item', default: true, desc: 'Kode inventaris internal (ITM-xxx)' },
  { id: 'nama', label: 'Nama Item Koleksi', default: true, desc: 'Nama lengkap item numismatik' },
  { id: 'group', label: 'Group / Seri', default: true, desc: 'Kategori / Seri pengelompokan item' },
  { id: 'tahun', label: 'Tahun Emisi', default: true, desc: 'Tahun cetak atau emisi' },
  { id: 'nominal', label: 'Nominal / Denominasi', default: false, desc: 'Nilai nominal pecahan mata uang' },
  { id: 'jenis', label: 'Jenis Numismatik', default: true, desc: 'Uang Kertas, Koin, Polymer, dll.' },
  { id: 'grade', label: 'Grade & Slab', default: true, desc: 'Grade kondisi & sertifikasi grading (PMG/PCGS/dll)' },
  { id: 'nomor_seri', label: 'Nomor Seri', default: true, desc: 'Nomor seri uang kertas / sertifikat' },
  { id: 'qty', label: 'Kuantitas (Qty)', default: true, desc: 'Jumlah lembar/keping item' },
  { id: 'harga', label: 'Harga Beli Item', default: true, desc: 'Harga beli item satuan/alokasi' },
  { id: 'ongkir', label: 'Alokasi Ongkir', default: true, desc: 'Porsi ongkir lot per item' },
  { id: 'hpp', label: 'Total HPP Modal', default: true, desc: 'Total Harga Pokok Modal (HPP)' },
  { id: 'status', label: 'Status Pesanan', default: false, desc: 'Status pesanan (pesan/dikirim/terima)' },
  { id: 'kondisi', label: 'Kondisi / Lokasi Simpan', default: false, desc: 'Catatan kondisi fisik & lokasi simpan' },
  { id: 'catatan', label: 'Catatan & Ruang Crosscheck', default: true, desc: 'Keterangan internal & baris manual catatan crosscheck' }
];

async function showPrintBatchCrosscheckModal(batchId) {
  try {
    let b = currentBatchData && currentBatchData.id === batchId ? currentBatchData : null;
    if (!b) {
      b = await API.get(`/batch/${batchId}`);
    }
    if (!b) throw new Error('Data batch tidak ditemukan');

    const items = b.items || [];
    const totalBeli = items.reduce((sum, it) => sum + Number(it.harga || it.harga_beli || 0), 0);
    const totalOngkir = Number(b.total_ongkir || 0);
    const totalHpp = totalBeli + totalOngkir;
    const batchNama = b.nama_batch || b.kode_batch || `Batch #${b.id}`;

    // Ambil preferensi kolom yang tersimpan di localStorage (jika ada)
    let savedCols = null;
    try {
      const raw = localStorage.getItem('numis_batch_print_cols');
      if (raw) savedCols = JSON.parse(raw);
    } catch (_) {}

    const savedOrientation = localStorage.getItem('numis_batch_print_orientation') || 'landscape';
    const savedSummary = localStorage.getItem('numis_batch_print_summary') !== '0';
    const savedSign = localStorage.getItem('numis_batch_print_signature') !== '0';

    const body = `
      <div class="batch-print-modal-content" style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header Ringkasan Batch -->
        <div style="background:rgba(212,175,55,0.06); border:1px solid var(--border-gold); border-radius:8px; padding:12px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-weight:700; color:var(--gold-light); font-size:14.5px;">
                📦 ${escapeHtml(batchNama)}
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                Kode: <strong style="font-family:monospace; color:var(--text-primary);">${escapeHtml(b.kode_batch || '#' + b.id)}</strong>
                • Supplier: <strong style="color:var(--text-primary);">${escapeHtml(b.supplier_nama || '-')}</strong>
                • Tgl Beli: <strong style="color:var(--text-primary);">${formatDate(b.tanggal_beli || b.created_at)}</strong>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:rgba(212,175,55,0.15); color:var(--gold-light); font-size:12px; padding:4px 10px;">
                ${items.length} Item Koleksi
              </span>
              <div style="font-size:11.5px; color:var(--text-secondary); margin-top:3px;">
                Total Modal: <strong style="color:var(--gold-primary);">${formatRupiah(totalHpp)}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Toolbar Pemilih Cepat Preset Kolom -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label class="form-label" style="font-weight:700; color:var(--gold-light); margin:0;">
              📋 Pilih Kolom yang Masuk di Lembar Cetak / PDF:
            </label>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="setBatchPrintPreset('all')" style="font-size:11px; padding:3px 8px;">
                Pilih Semua
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="setBatchPrintPreset('standard')" style="font-size:11px; padding:3px 8px;">
                Standar Crosscheck
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="setBatchPrintPreset('physical')" style="font-size:11px; padding:3px 8px;">
                Hanya Info Fisik
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="setBatchPrintPreset('finance')" style="font-size:11px; padding:3px 8px;">
                Lengkap Finansial
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="setBatchPrintPreset('reset')" style="font-size:11px; padding:3px 8px;">
                Reset
              </button>
            </div>
          </div>

          <!-- Grid Pilihan Kolom -->
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap:8px; max-height:280px; overflow-y:auto; padding:4px 2px; border:1px solid var(--border); border-radius:8px; background:rgba(18,21,28,0.5);">
            ${BATCH_PRINT_AVAILABLE_COLUMNS.map(col => {
              const isChecked = Array.isArray(savedCols) ? savedCols.includes(col.id) : col.default;
              return `
                <label style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(26,30,40,0.85); border:1px solid var(--border); border-radius:6px; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.borderColor='var(--gold-primary)'" onmouseout="this.style.borderColor='var(--border)'">
                  <input type="checkbox" id="chkCol_${col.id}" value="${col.id}" class="batch-col-checkbox" ${isChecked ? 'checked' : ''} style="margin-top:2px; accent-color:var(--gold-primary); cursor:pointer;">
                  <div style="flex:1;">
                    <div style="font-size:12px; font-weight:700; color:var(--text-primary);">${escapeHtml(col.label)}</div>
                    <div style="font-size:10.5px; color:var(--text-muted); line-height:1.2; margin-top:2px;">${escapeHtml(col.desc)}</div>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Pengaturan Tata Letak Dokumen -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; color:var(--gold-light); margin-bottom:10px;">
            ⚙️ Pengaturan Kertas &amp; Dokumen:
          </div>
          <div class="data-grid-3" style="gap:14px; align-items:center;">
            <div>
              <label class="form-label" style="font-size:11.5px; margin-bottom:6px;">Orientasi Kertas Cetak / PDF</label>
              <div style="display:flex; gap:12px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                  <input type="radio" name="batchPrintOrientation" value="landscape" ${savedOrientation === 'landscape' ? 'checked' : ''} style="accent-color:var(--gold-primary);">
                  <span>Landscape (Mendatar) ⭐</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                  <input type="radio" name="batchPrintOrientation" value="portrait" ${savedOrientation === 'portrait' ? 'checked' : ''} style="accent-color:var(--gold-primary);">
                  <span>Portrait (Tegak)</span>
                </label>
              </div>
            </div>

            <div>
              <label class="form-label" style="font-size:11.5px; margin-bottom:6px;">Elemen Tambahan</label>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; cursor:pointer;">
                  <input type="checkbox" id="batchPrintShowSummary" ${savedSummary ? 'checked' : ''} style="accent-color:var(--gold-primary);">
                  <span>Tampilkan Ringkasan Header &amp; Biaya</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; cursor:pointer;">
                  <input type="checkbox" id="batchPrintShowSignature" ${savedSign ? 'checked' : ''} style="accent-color:var(--gold-primary);">
                  <span>Tampilkan Area Tanda Tangan &amp; Verifikasi</span>
                </label>
              </div>
            </div>

            <div style="background:rgba(212,175,55,0.08); border:1px dashed var(--border-gold); border-radius:6px; padding:8px 10px; font-size:11px; color:var(--text-secondary); line-height:1.35;">
              💡 <strong>Tips Cetak / PDF:</strong><br>
              Saat jendela dokumen terbuka, tekan tombol <strong>Cetak / Simpan PDF</strong> dan pilih printer fisik atau opsi <em>"Save as PDF"</em> di browser.
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="button" class="btn btn-primary" onclick="executeBatchCrosscheckPrint(${batchId})" style="display:flex; align-items:center; gap:6px;">
          <span>🖨️ Buka &amp; Cetak Dokumen PDF</span>
        </button>
      </div>
    `;

    openModal({
      title: `🖨️ Cetak / Ekspor PDF Crosscheck: ${escapeHtml(batchNama)}`,
      body: body,
      footer: footer,
      size: 'lg'
    });
  } catch (err) {
    showToast('Gagal memuat konfigurasi cetak batch: ' + err.message, 'error');
  }
}

function setBatchPrintPreset(preset) {
  const checkboxes = document.querySelectorAll('.batch-col-checkbox');
  if (!checkboxes || checkboxes.length === 0) return;

  const presetMap = {
    all: ['checklist', 'no', 'foto', 'kode', 'nama', 'group', 'tahun', 'nominal', 'jenis', 'grade', 'nomor_seri', 'qty', 'harga', 'ongkir', 'hpp', 'status', 'kondisi', 'catatan'],
    standard: ['checklist', 'no', 'foto', 'kode', 'nama', 'group', 'tahun', 'grade', 'qty', 'harga', 'ongkir', 'hpp', 'catatan'],
    physical: ['checklist', 'no', 'foto', 'kode', 'nama', 'group', 'tahun', 'nominal', 'jenis', 'grade', 'nomor_seri', 'qty', 'kondisi', 'catatan'],
    finance: ['checklist', 'no', 'kode', 'nama', 'group', 'grade', 'qty', 'harga', 'ongkir', 'hpp', 'catatan'],
    reset: ['checklist', 'no', 'foto', 'kode', 'nama', 'group', 'tahun', 'grade', 'nomor_seri', 'qty', 'harga', 'ongkir', 'hpp', 'catatan']
  };

  const targets = presetMap[preset] || presetMap.standard;
  checkboxes.forEach(chk => {
    chk.checked = targets.includes(chk.value);
  });
}

function executeBatchCrosscheckPrint(batchId) {
  const checkboxes = document.querySelectorAll('.batch-col-checkbox:checked');
  if (!checkboxes || checkboxes.length === 0) {
    showToast('Pilih minimal satu kolom untuk lembar cetak!', 'warning');
    return;
  }

  const selectedCols = Array.from(checkboxes).map(c => c.value);
  const orientationInput = document.querySelector('input[name="batchPrintOrientation"]:checked');
  const orientation = orientationInput ? orientationInput.value : 'landscape';
  const showSummary = document.getElementById('batchPrintShowSummary')?.checked ? '1' : '0';
  const showSignature = document.getElementById('batchPrintShowSignature')?.checked ? '1' : '0';

  // Simpan preferensi ke localStorage
  try {
    localStorage.setItem('numis_batch_print_cols', JSON.stringify(selectedCols));
    localStorage.setItem('numis_batch_print_orientation', orientation);
    localStorage.setItem('numis_batch_print_summary', showSummary);
    localStorage.setItem('numis_batch_print_signature', showSignature);
  } catch (_) {}

  const token = API.getToken() || '';
  const colsParam = encodeURIComponent(selectedCols.join(','));
  const url = `/api/batch/${batchId}/print-crosscheck?cols=${colsParam}&orientation=${orientation}&show_summary=${showSummary}&show_signature=${showSignature}&token=${encodeURIComponent(token)}`;

  const win = window.open(url, '_blank');
  if (!win) {
    showToast('Pop-up jendela cetak diblokir oleh browser. Harap izinkan pop-up.', 'warning');
  } else {
    closeModal();
  }
}

/**
 * Handler Interaktif Checklist Item Batch dari Web
 */
async function handleToggleBatchItemCheck(itemId, batchId, isChecked) {
  try {
    await API.post(`/batch/${batchId}/toggle-item-check/${itemId}`, { is_checked: isChecked ? 1 : 0 });
    showToast(isChecked ? 'Item ditandai sudah dicek ✓' : 'Checklist item dibatalkan', 'info', 1500);
    const updatedBatch = await API.get(`/batch/${batchId}`);
    currentBatchData = updatedBatch;
    renderBatchDetail(updatedBatch);
  } catch (err) {
    showToast('Gagal mengubah status cek item: ' + err.message, 'error');
    selectBatch(batchId);
  }
}

async function checkAllBatchItems(batchId, checkVal) {
  try {
    const res = await API.post(`/batch/${batchId}/check-all-items`, { check_all: checkVal, is_checked: checkVal });
    showToast(checkVal ? 'Seluruh item berhasil dichecklist ✓' : 'Seluruh checklist item dibatalkan', 'success');
    const updatedBatch = await API.get(`/batch/${batchId}`);
    currentBatchData = updatedBatch;
    renderBatchDetail(updatedBatch);
  } catch (err) {
    showToast('Gagal memproses bulk check: ' + err.message, 'error');
  }
}

async function toggleBatchFinalOk(batchId, isFinalOk) {
  try {
    const res = await API.post(`/batch/${batchId}/toggle-final-ok`, { is_final_ok: isFinalOk });
    showToast(res.is_final_ok ? 'Batch ditandai Final OK (Barang Lengkap) ✅' : 'Batch ditandai Kurang / Belum Lengkap ⚠️', 'success');
    const updatedBatch = await API.get(`/batch/${batchId}`);
    currentBatchData = updatedBatch;
    renderBatchDetail(updatedBatch);
  } catch (err) {
    showToast('Gagal mengubah status Final OK: ' + err.message, 'error');
  }
}



/**
 * =========================================================================
 * 3. ENGINE INPUT PAKET LOT (1 HARGA UNTUK BEBERAPA ITEM)
 *    Digunakan di Pembelian Single (Mode Paket Lot) & Pembelian Batch (Modal Lot)
 * =========================================================================
 */
let lotBuilderState = {
  single: { rows: [], nextRowId: 1, groupsCache: [] },
  batch: { rows: [], nextRowId: 1, groupsCache: [], batchId: null }
};

function switchSinglePurchaseMode(mode) {
  const singleForm = document.getElementById('singlePurchaseForm');
  const lotSection = document.getElementById('singleLotPurchaseSection');
  const btnSingle = document.getElementById('btnModeSingleItem');
  const btnLot = document.getElementById('btnModeSingleLot');
  const btnResetTop = document.getElementById('btnResetSingleTop');

  if (mode === 'lot') {
    if (singleForm) singleForm.style.display = 'none';
    if (lotSection) {
      lotSection.style.display = 'block';
      if (!lotSection.innerHTML.trim()) {
        renderSingleLotPurchaseForm();
      }
    }
    if (btnSingle) {
      btnSingle.className = 'btn btn-sm btn-secondary';
      btnSingle.style.border = 'none';
    }
    if (btnLot) {
      btnLot.className = 'btn btn-sm btn-primary';
    }
    if (btnResetTop) {
      btnResetTop.setAttribute('onclick', "renderSingleLotPurchaseForm()");
    }
  } else {
    if (singleForm) singleForm.style.display = 'block';
    if (lotSection) lotSection.style.display = 'none';
    if (btnSingle) {
      btnSingle.className = 'btn btn-sm btn-primary';
    }
    if (btnLot) {
      btnLot.className = 'btn btn-sm btn-secondary';
      btnLot.style.border = 'none';
    }
    if (btnResetTop) {
      btnResetTop.setAttribute('onclick', "resetSingleForm()");
    }
  }
}

async function ensureLotGroupsCache(ctxKey) {
  try {
    const res = await API.get('/group-item');
    const list = Array.isArray(res) ? res : (res.items || res.data || []);
    lotBuilderState[ctxKey].groupsCache = list;
  } catch (_) {
    lotBuilderState[ctxKey].groupsCache = [];
  }
}

function getLotCurrentDate(ctxKey) {
  const el = document.getElementById(`lot_${ctxKey}_tanggal`);
  if (el && el.value) return el.value;
  if (ctxKey === 'batch' && currentBatchData?.tanggal_beli) {
    return currentBatchData.tanggal_beli.split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function onLotDateChanged(ctxKey) {
  const newDate = document.getElementById(`lot_${ctxKey}_tanggal`)?.value;
  if (!newDate) return;
  const st = lotBuilderState[ctxKey];
  st.rows.forEach(r => {
    r.tanggal_beli = newDate;
    const itemDateEl = document.getElementById(`lotrow_${ctxKey}_${r.rowId}_tanggal_beli`);
    if (itemDateEl) {
      itemDateEl.value = newDate;
    }
  });
}

function createDefaultLotRow(ctxKey, sourceRow = null) {
  const st = lotBuilderState[ctxKey];
  const rowId = st.nextRowId++;
  const defaultTgl = getLotCurrentDate(ctxKey);
  const defaultLink = ctxKey === 'batch'
    ? (document.getElementById('lot_batch_link')?.value || currentBatchData?.link_pembelian || '')
    : (document.getElementById('lot_single_link')?.value || '');

  return {
    rowId,
    is_expanded: true,
    nama_item: sourceRow ? sourceRow.nama_item : '',
    nomor_seri: sourceRow ? sourceRow.nomor_seri : '',
    group_id: sourceRow ? sourceRow.group_id : '',
    jenis: sourceRow ? sourceRow.jenis : 'uang_kertas',
    grade: sourceRow ? sourceRow.grade : 'UNC',
    tahun: sourceRow ? sourceRow.tahun : '',
    tanggal_beli: sourceRow ? (sourceRow.tanggal_beli || defaultTgl) : defaultTgl,
    negara: sourceRow ? (sourceRow.negara || 'Indonesia') : 'Indonesia',
    qty: sourceRow ? (sourceRow.qty || 1) : 1,
    harga_alokasi: sourceRow ? (sourceRow.harga_alokasi || 0) : 0,
    manual_price: sourceRow ? (sourceRow.manual_price || false) : false,
    harga_jual: sourceRow ? (sourceRow.harga_jual || 0) : 0,
    link_pembelian: sourceRow ? (sourceRow.link_pembelian || defaultLink) : defaultLink,
    keterangan: sourceRow ? (sourceRow.keterangan || sourceRow.detail || '') : '',
    detail: sourceRow ? (sourceRow.keterangan || sourceRow.detail || '') : ''
  };
}

async function renderSingleLotPurchaseForm() {
  const container = document.getElementById('singleLotPurchaseSection');
  if (!container) return;

  await ensureLotGroupsCache('single');
  const today = new Date().toISOString().split('T')[0];
  const sRow1 = createDefaultLotRow('single');
  sRow1.is_expanded = true;
  sRow1.tanggal_beli = today;
  const sRow2 = createDefaultLotRow('single');
  sRow2.is_expanded = false;
  sRow2.tanggal_beli = today;
  lotBuilderState.single.rows = [sRow1, sRow2];

  container.innerHTML = `
    <form id="singleLotForm" onsubmit="event.preventDefault(); submitLotPurchase('single');">
      <!-- Card 1: Header & Harga Gabungan 1 Lot -->
      <div class="card" style="margin-bottom:18px; border:1px solid var(--border-gold);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
          <h4 style="margin:0; color:var(--gold-light); display:flex; align-items:center; gap:8px;">
            <span>🎁 Informasi &amp; Harga Gabungan Paket Lot (Single Purchase)</span>
          </h4>
          <span class="badge" style="background:rgba(212,175,55,0.15); color:var(--gold-light); border:1px solid var(--border-gold); font-size:11.5px;">
            Seluruh item tetap tampil per item di Koleksi &amp; dapat di-trace ke Lot ini
          </span>
        </div>

        <div class="data-grid-4">
          <div class="form-group">
            <label class="form-label">Nama / Judul Paket Lot <span class="required">*</span></label>
            <input type="text" id="lot_single_nama" class="form-control" placeholder="cth: Lot Paket 3 Lembar Seri Wayang" required>
          </div>
          <div class="form-group">
            <label class="form-label">Harga Beli Gabungan 1 Lot (Rp) <span class="required">*</span></label>
            <input type="number" id="lot_single_harga" class="form-control" min="0" value="0" required oninput="recalcLotBuilderAllocations('single')">
          </div>
          <div class="form-group">
            <label class="form-label">Ongkos Kirim Lot (Rp)</label>
            <input type="number" id="lot_single_ongkir" class="form-control" min="0" value="0" oninput="recalcLotBuilderAllocations('single')">
          </div>
          <div class="form-group">
            <label class="form-label">Metode Alokasi Harga ke Item</label>
            <select id="lot_single_metode" class="form-select" onchange="recalcLotBuilderAllocations('single', true)">
              <option value="proporsional_qty">⚡ Bagi Rata per Qty (+ Bisa Edit Manual)</option>
              <option value="bagi_rata_item">⚖️ Bagi Rata per Baris Item (+ Bisa Edit Manual)</option>
            </select>
          </div>
        </div>

        <div class="data-grid-4">
          <div class="form-group">
            <label class="form-label">Supplier / Sumber</label>
            <select id="lot_single_supplier" class="form-select">
              <option value="">-- Pilih Supplier --</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Metode Perolehan</label>
            <select id="lot_single_perolehan" class="form-select">
              ${PEROLEHAN_OPTIONS.map(opt => `<option value="${opt}">${PEROLEHAN_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status Pengiriman</label>
            <select id="lot_single_status" class="form-select">
              ${STATUS_OPTIONS.map(opt => `<option value="${opt}" ${opt === 'terima' ? 'selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tujuan Koleksi</label>
            <select id="lot_single_tujuan" class="form-select">
              ${STATUS_KOLEKSI_OPTIONS.map(opt => `<option value="${opt}" ${opt === 'stock_jual' ? 'selected' : ''}>${STATUS_KOLEKSI_LABELS[opt] || opt}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="data-grid-3">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Tanggal Pembelian Lot</label>
            <input type="date" id="lot_single_tanggal" class="form-control" value="${today}" onchange="onLotDateChanged('single')">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">🔗 Link Pembelian Lot</label>
            <input type="text" id="lot_single_link" class="form-control" placeholder="cth: https://www.facebook.com/... atau link lelang">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Catatan Paket Lot</label>
            <input type="text" id="lot_single_catatan" class="form-control" placeholder="Keterangan tambahan mengenai paket lot ini">
          </div>
        </div>
      </div>

      <!-- Card 2: Daftar Item di Dalam Lot -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
          <div>
            <h4 style="margin:0; color:var(--text-primary); font-size:15px; display:flex; align-items:center; gap:8px;">
              <span>📋 Daftar Item di Dalam Paket Lot (<span id="lot_single_count_label">2</span> Item)</span>
            </h4>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
              Hanya 1 item yang terbuka (panah ke bawah) untuk input; item lain otomatis disembunyikan (hide) agar rapi.
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="toggleAllLotRows('single', true)" style="font-size:11px; padding:3px 9px;">
              📂 Buka Semua
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="toggleAllLotRows('single', false)" style="font-size:11px; padding:3px 9px;">
              📁 Tutup Semua
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="addLotBuilderRow('single')" style="font-size:11px; padding:3px 10px;">
              ➕ Tambah Baris Item ke Lot
            </button>
          </div>
        </div>

        <div id="lot_single_rows_container" class="lot-items-window" style="display:flex; flex-direction:column; gap:12px; max-height:620px; overflow-y:auto; padding-right:6px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:8px 8px 24px 8px; background:rgba(12,15,20,0.5);"></div>

        <!-- Summary & Submit Bar -->
        <div style="margin-top:18px; background:rgba(18,21,28,0.9); border:1px solid var(--border-gold); border-radius:10px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div style="display:flex; gap:22px; flex-wrap:wrap; align-items:center;">
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Total Item / Qty</div>
              <div id="lot_single_sum_qty" style="font-size:14.5px; font-weight:700; color:var(--text-primary);">2 Item (2 pcs)</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Total Alokasi Harga Item</div>
              <div id="lot_single_sum_alloc" style="font-size:14.5px; font-weight:700; color:var(--gold-light);">Rp 0</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Total HPP Lot (Harga + Ongkir)</div>
              <div id="lot_single_sum_hpp" style="font-size:15.5px; font-weight:800; color:var(--gold-primary);">Rp 0</div>
            </div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button type="button" class="btn btn-secondary" onclick="addLotBuilderRow('single')">
              ➕ Tambah Baris Item
            </button>
            <button type="submit" id="lot_single_submit_btn" class="btn btn-primary" style="height:44px; padding:0 22px; font-size:14px; font-weight:700;">
              💾 Simpan Paket Lot ke Koleksi
            </button>
          </div>
        </div>
      </div>
    </form>
  `;

  loadSuppliersIntoDropdown('lot_single_supplier');
  renderLotBuilderRows('single');
  recalcLotBuilderAllocations('single');
}

async function showAddLotToBatchModal(batchId) {
  await ensureLotGroupsCache('batch');
  lotBuilderState.batch.batchId = batchId;
  const defaultTgl = currentBatchData?.tanggal_beli
    ? currentBatchData.tanggal_beli.split('T')[0]
    : new Date().toISOString().split('T')[0];
  const defaultLink = currentBatchData?.link_pembelian || '';

  const bRow1 = createDefaultLotRow('batch');
  bRow1.is_expanded = true;
  bRow1.tanggal_beli = defaultTgl;
  bRow1.link_pembelian = defaultLink;
  const bRow2 = createDefaultLotRow('batch');
  bRow2.is_expanded = false;
  bRow2.tanggal_beli = defaultTgl;
  bRow2.link_pembelian = defaultLink;
  lotBuilderState.batch.rows = [bRow1, bRow2];

  const batchBadgeName = escapeHtml(currentBatchData?.nama_batch || currentBatchData?.kode_batch || ('#' + batchId));

  const body = `
    <form id="batchLotForm" onsubmit="event.preventDefault(); submitLotPurchase('batch');" style="display:flex; flex:1 1 0%; min-height:0; height:100%; flex-direction:column; margin:0; overflow:hidden;">
      <div class="lot-split-container">
        
        <!-- PANEL KIRI: DATA PAKET LOT & RINGKASAN -->
        <div class="lot-split-left-pane">
          
          <!-- Box Input Data Lot -->
          <div class="lot-left-card">
            <div class="lot-left-card-header">
              <div style="font-size:13px; font-weight:700; color:var(--gold-light); display:flex; align-items:center; gap:6px;">
                <span>🎁</span> Data Paket Lot
              </div>
              <span class="badge" style="background:rgba(212,175,55,0.15); color:var(--gold-light); font-size:11px; font-weight:600; padding:2px 8px;">
                ${batchBadgeName}
              </span>
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11.5px; font-weight:600; margin-bottom:3px;">
                Nama / Judul Paket Lot <span class="required">*</span>
              </label>
              <input type="text" id="lot_batch_nama" class="form-control form-control-sm" placeholder="cth: Lot A - Paket 3 Koin Perak Belanda" required>
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11.5px; font-weight:600; margin-bottom:3px;">
                Harga Beli Gabungan 1 Lot (Rp) <span class="required">*</span>
              </label>
              <input type="number" id="lot_batch_harga" class="form-control form-control-sm" min="0" value="0" required oninput="recalcLotBuilderAllocations('batch')" style="border-color:var(--border-gold); color:var(--gold-light); font-weight:700; font-size:13.5px;">
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11.5px; font-weight:600; margin-bottom:3px;">Metode Alokasi Harga ke Item</label>
              <select id="lot_batch_metode" class="form-select form-select-sm" onchange="recalcLotBuilderAllocations('batch', true)">
                <option value="proporsional_qty">⚡ Bagi Rata per Qty (+ Edit Manual)</option>
                <option value="bagi_rata_item">⚖️ Bagi Rata per Baris (+ Edit Manual)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11.5px; font-weight:600; margin-bottom:3px;">Tanggal Beli Lot</label>
              <input type="date" id="lot_batch_tanggal" class="form-control form-control-sm" value="${defaultTgl}" onchange="onLotDateChanged('batch')">
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11.5px; font-weight:600; margin-bottom:3px;">🔗 Link Pembelian Lot</label>
              <input type="text" id="lot_batch_link" class="form-control form-control-sm" value="${escapeHtml(defaultLink)}" placeholder="cth: https://... (Link lot lelang)">
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11.5px; font-weight:600; margin-bottom:3px;">Catatan Lot</label>
              <input type="text" id="lot_batch_catatan" class="form-control form-control-sm" placeholder="Keterangan tambahan lot ini">
            </div>
          </div>

          <!-- Box Ringkasan Alokasi & Status Lot -->
          <div class="lot-left-card" style="background:rgba(18,21,28,0.95);">
            <div style="font-size:12.5px; font-weight:700; color:var(--gold-light); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span>📊</span> Ringkasan Alokasi Lot
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px;">
                <span style="color:var(--text-muted);">Total Item &amp; Qty:</span>
                <strong id="lot_batch_sum_qty" style="color:var(--text-primary); font-size:12.5px;">2 Item (2 pcs)</strong>
              </div>
              <div style="display:flex; flex-direction:column; gap:3px; font-size:12px;">
                <span style="color:var(--text-muted);">Total Alokasi Harga Item:</span>
                <div id="lot_batch_sum_alloc" style="color:var(--gold-light); font-weight:700; font-size:13px;">Rp 0</div>
              </div>
            </div>
            
            <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(212,175,55,0.25); display:flex; flex-direction:column; gap:8px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="addLotBuilderRow('batch')" style="width:100%; font-size:11.5px; font-weight:600; padding:6px 10px;">
                ➕ Tambah Baris Item ke Lot
              </button>
              <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4;">
                🏷️ Setiap item dalam lot otomatis ditandai dengan lencana <strong>Trace Lot</strong> pada tabel Batch &amp; Koleksi.
              </div>
            </div>
          </div>

        </div>

        <!-- PANEL KANAN: DAFTAR & FORM ITEM-ITEM LOT -->
        <div class="lot-split-right-pane">
          
          <!-- Toolbar Atas Panel Kanan -->
          <div class="lot-right-toolbar">
            <div style="font-size:13.5px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px; white-space:nowrap;">
              <span>📋</span> Daftar Item dalam Lot (<span id="lot_batch_count_label" style="color:var(--gold-light); font-weight:800;">2</span> Item)
              <span id="lot_batch_toolbar_info"></span>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:nowrap;">
              <button type="button" class="btn btn-secondary btn-sm" id="lot_batch_toggle_all_btn" onclick="toggleAllLotRows('batch', false)" style="font-size:11px; padding:4px 10px; white-space:nowrap;">
                📁 Tutup &amp; Lihat Semua Header
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="addLotBuilderRow('batch')" style="font-size:11.5px; padding:4px 14px; font-weight:700; white-space:nowrap;">
                ➕ Tambah Baris Item ke Lot
              </button>
            </div>
          </div>

          <!-- Container Kartu-kartu Item Lot -->
          <div id="lot_batch_rows_container" class="lot-items-window"></div>

        </div>

      </div>
    </form>
  `;

  const footer = `
    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;">
      <div style="font-size:11.5px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
        <span>💡 Pastikan alokasi harga tiap item sesuai dengan harga beli paket lot sebelum menyimpan.</span>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()" style="padding:6px 14px;">Batal</button>
        <button type="button" id="lot_batch_submit_btn" class="btn btn-primary btn-sm" onclick="submitLotPurchase('batch')" style="padding:6px 18px; font-weight:700;">
          💾 Simpan Paket Lot ke Batch
        </button>
      </div>
    </div>
  `;

  openModal({
    title: `🎁 Tambah Paket Lot ke Batch <span style="font-size:12px; font-weight:normal; color:var(--gold-light); margin-left:8px; padding:2px 8px; background:rgba(212,175,55,0.12); border-radius:4px; border:1px solid rgba(212,175,55,0.2);">${batchBadgeName}</span>`,
    body,
    footer,
    size: 'lot-split'
  });

  renderLotBuilderRows('batch');
  recalcLotBuilderAllocations('batch');
}

function syncLotBuilderDomToState(ctxKey) {
  const st = lotBuilderState[ctxKey];
  st.rows.forEach(r => {
    const pfx = `lotrow_${ctxKey}_${r.rowId}`;
    const elNama = document.getElementById(`${pfx}_nama`);
    if (!elNama) return;
    r.nama_item = elNama.value;
    r.nomor_seri = document.getElementById(`${pfx}_sn`)?.value || '';
    r.group_id = document.getElementById(`${pfx}_group`)?.value || '';
    r.jenis = document.getElementById(`${pfx}_jenis`)?.value || 'uang_kertas';
    r.grade = document.getElementById(`${pfx}_grade`)?.value || 'UNC';
    r.tahun = document.getElementById(`${pfx}_tahun`)?.value || '';
    r.tanggal_beli = document.getElementById(`${pfx}_tanggal_beli`)?.value || '';
    r.negara = document.getElementById(`${pfx}_negara`)?.value || 'Indonesia';
    r.qty = Math.max(1, parseInt(document.getElementById(`${pfx}_qty`)?.value || '1', 10));
    r.harga_alokasi = Math.max(0, parseFloat(document.getElementById(`${pfx}_harga`)?.value || '0'));
    r.harga_jual = Math.max(0, parseFloat(document.getElementById(`${pfx}_jual`)?.value || '0'));
    r.link_pembelian = document.getElementById(`${pfx}_link`)?.value || '';
    r.keterangan = document.getElementById(`${pfx}_keterangan`)?.value || '';
    r.detail = r.keterangan;
  });
}

function navigateLotItem(ctxKey, direction) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];
  const curIdx = st.rows.findIndex(r => r.is_expanded);
  if (curIdx === -1) return;
  const targetIdx = curIdx + direction;
  if (targetIdx < 0 || targetIdx >= st.rows.length) return;
  
  st.rows.forEach((r, idx) => {
    r.is_expanded = (idx === targetIdx);
  });
  renderLotBuilderRows(ctxKey);
}

function renderLotBuilderRows(ctxKey) {
  const st = lotBuilderState[ctxKey];
  const container = document.getElementById(`lot_${ctxKey}_rows_container`);
  const countLabel = document.getElementById(`lot_${ctxKey}_count_label`);
  const toolbarActiveInfo = document.getElementById(`lot_${ctxKey}_toolbar_info`);
  const btnToggleAll = document.getElementById(`lot_${ctxKey}_toggle_all_btn`);

  if (!container) return;
  if (countLabel) countLabel.textContent = String(st.rows.length);

  const groups = st.groupsCache || [];
  const defaultLotTgl = getLotCurrentDate(ctxKey);
  const defaultLotLink = (ctxKey === 'batch'
    ? (currentBatchData?.link_pembelian || '')
    : (document.getElementById('lot_single_link')?.value || ''));

  const anyExpanded = st.rows.some(r => r.is_expanded);
  const activeIdx = st.rows.findIndex(r => r.is_expanded);

  // Sync container class untuk mode fokus aktif
  if (container) {
    container.classList.toggle('has-active-item', anyExpanded);
  }

  if (toolbarActiveInfo) {
    if (anyExpanded && activeIdx !== -1) {
      toolbarActiveInfo.innerHTML = `<span style="font-size:12px; color:var(--gold-light); font-weight:700; margin-left:6px;">— ✏️ Edit Item #${activeIdx + 1} dari ${st.rows.length}</span>`;
    } else {
      toolbarActiveInfo.innerHTML = `<span style="font-size:11.5px; color:var(--text-muted); margin-left:6px;">— 📋 Klik item untuk edit</span>`;
    }
  }

  if (btnToggleAll) {
    if (anyExpanded) {
      btnToggleAll.innerHTML = '📁 Tutup &amp; Lihat Semua Header';
      btnToggleAll.setAttribute('onclick', `toggleAllLotRows('${ctxKey}', false)`);
      btnToggleAll.setAttribute('title', 'Tutup rincian item ini dan tampilkan seluruh header item di dalam lot');
    } else {
      btnToggleAll.innerHTML = '📂 Buka Item #1';
      btnToggleAll.setAttribute('onclick', `toggleAllLotRows('${ctxKey}', true)`);
      btnToggleAll.setAttribute('title', 'Buka dan edit rincian item pertama');
    }
  }

  container.innerHTML = st.rows.map((r, idx) => {
    const pfx = `lotrow_${ctxKey}_${r.rowId}`;
    const photoPrefix = `lot_${ctxKey}_${r.rowId}`;
    const isExpanded = r.is_expanded !== false;
    const itemTgl = r.tanggal_beli || defaultLotTgl;
    const itemLink = r.link_pembelian || defaultLotLink;

    // JIKA ADA ITEM YANG EXPANDED: HANYA TAMPILKAN ITEM YANG EXPANDED ITU SAJA.
    // HEADER ITEM LAIN DISEMBUNYIKAN AGAR RUANG INPUT LUAS & TIDAK TERHIMPIT!
    const isVisible = (!anyExpanded) || isExpanded;

    const groupOpts = `<option value="">-- Tanpa Group --</option>` + groups.map(g =>
      `<option value="${g.id}" ${String(r.group_id) === String(g.id) ? 'selected' : ''}>${escapeHtml(g.nama_group)}</option>`
    ).join('');

    return `
      <div class="lot-item-row-card ${isExpanded ? 'is-active-item' : 'is-collapsed-item'} ${!isVisible ? 'is-hidden-lot-item' : ''}" id="${pfx}_card" style="background:rgba(22,26,36,0.95); border:1px solid ${isExpanded ? 'var(--gold-primary)' : 'var(--border-gold)'}; border-radius:10px; overflow:hidden; box-shadow:0 3px 10px rgba(0,0,0,0.25); display:${isVisible ? (isExpanded ? 'flex' : 'block') : 'none'}; ${isExpanded ? 'flex-direction:column; height:100%; min-height:0;' : 'flex-shrink:0; min-height:48px; height:48px; box-sizing:border-box;'}">
        
        <!-- Accordion Header -->
        <div class="lot-item-accordion-header" style="background:${isExpanded ? 'rgba(26,32,46,0.98)' : 'rgba(30,35,48,0.95)'}; padding:${isExpanded ? '8px 14px' : '0 14px'}; height:${isExpanded ? 'auto' : '48px'}; min-height:${isExpanded ? '44px' : '48px'}; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:${isExpanded ? '1px solid rgba(212,175,55,0.3)' : 'none'}; flex-shrink:0; box-sizing:border-box;" onclick="toggleLotRowAccordion('${ctxKey}', ${r.rowId})">
          <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0; overflow:hidden;">
            <span id="${pfx}_arrow" style="font-size:12px; color:var(--gold-light); width:14px; display:inline-block;">
              ${isExpanded ? '▼' : '▶'}
            </span>
            <span class="badge" style="background:${isExpanded ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.18)'}; color:var(--gold-light); font-weight:800; font-size:${isExpanded ? '12px' : '11px'}; padding:3px 9px; flex-shrink:0;">
              ${isExpanded ? `Item #${idx + 1} dari ${st.rows.length}` : `Item #${idx + 1}`}
            </span>
            <div style="font-size:13px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" id="${pfx}_title_label">
              ${escapeHtml(r.nama_item || '(Belum diberi nama)')}
            </div>
            <div style="font-size:11.5px; color:var(--gold-light); font-weight:600; background:rgba(18,21,28,0.7); padding:2px 8px; border-radius:4px; border:1px solid rgba(212,175,55,0.2); flex-shrink:0;" id="${pfx}_meta_label">
              ${r.qty || 1} pcs • ${formatRupiah(r.harga_alokasi || 0)}
            </div>
            <span id="${pfx}_manual_badge" style="display:${r.manual_price ? 'inline-flex' : 'none'}; align-items:center; gap:4px; font-size:10px; color:var(--warning); background:rgba(232,168,56,0.14); padding:2px 7px; border-radius:99px; flex-shrink:0; cursor:pointer;" onclick="event.stopPropagation(); unlockLotRowPrice('${ctxKey}', ${r.rowId})" title="Alokasi harga diset manual. Klik untuk reset ke bagi rata otomatis">
              🔒 Manual (Klik Reset)
            </span>
          </div>

          <!-- Header Actions -->
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;" onclick="event.stopPropagation()">
            ${isExpanded && st.rows.length > 1 ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="navigateLotItem('${ctxKey}', -1)" style="font-size:11px; padding:3px 8px;" ${idx === 0 ? 'disabled' : ''} title="Edit Item Sebelumnya">
                ◀ Sblmnya
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="navigateLotItem('${ctxKey}', 1)" style="font-size:11px; padding:3px 8px;" ${idx === st.rows.length - 1 ? 'disabled' : ''} title="Edit Item Berikutnya">
                Brktnya ▶
              </button>
            ` : ''}
            <button type="button" class="btn ${isExpanded ? 'btn-secondary' : 'btn-primary'} btn-sm" id="${pfx}_toggle_btn" onclick="toggleLotRowAccordion('${ctxKey}', ${r.rowId})" style="font-size:11px; padding:3px ${isExpanded ? '10px' : '9px'}; font-weight:${isExpanded ? '700' : '600'}; ${isExpanded ? 'color:var(--gold-light); border-color:var(--border-gold);' : 'background:var(--gold-primary); color:#000; border:none;'}">
              ${isExpanded ? '▲ Tutup (Lihat Semua Item)' : '▼ Buka Detail'}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="copyLotBuilderRow('${ctxKey}', ${r.rowId})" style="font-size:11px; padding:3px 8px;" title="Duplikat baris item ini di dalam Lot">
              📋 Copy
            </button>
            ${st.rows.length > 1 ? `
              <button type="button" class="btn btn-danger btn-sm" onclick="removeLotBuilderRow('${ctxKey}', ${r.rowId})" style="font-size:11px; padding:3px 8px;" title="Hapus item ini dari Lot">
                🗑️ Hapus
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Accordion Body: Form rincian item dengan scroll penuh -->
        <div id="${pfx}_body" class="lot-item-body-scroll" style="display:${isExpanded ? 'block' : 'none'}; background:rgba(18,21,28,0.55); overflow-y:auto; overscroll-behavior:contain; border-top:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:11.5px; color:var(--gold-light); background:rgba(212,175,55,0.08); padding:5px 12px; border-radius:6px; border:1px dashed rgba(212,175,55,0.25);">
            <span>📝 <strong>Rincian Item #${idx + 1}</strong> (Semua data &amp; foto di bawah dapat diisi)</span>
            <span>↕️ Scroll ke bawah untuk Rencana Jual, Link &amp; Foto Lengkap</span>
          </div>
          <!-- Row 1: Grid 3 (Nama Item *, Nomor Seri, Group Item) -->
          <div class="data-grid-3">
            <div class="form-group">
              <label class="form-label">Nama Item <span class="required">*</span></label>
              <input type="text" id="${pfx}_nama" class="form-control" value="${escapeHtml(r.nama_item)}" placeholder="cth: 50 Rupiah Komodo 1997 UNC" required oninput="updateLotRowHeaderSummary('${ctxKey}', ${r.rowId})">
            </div>
            <div class="form-group">
              <label class="form-label">Nomor Seri</label>
              <input type="text" id="${pfx}_sn" class="form-control" value="${escapeHtml(r.nomor_seri)}" placeholder="cth: ABC123456 / No Seri">
            </div>
            <div class="form-group">
              <label class="form-label">Group Item</label>
              <select id="${pfx}_group" class="form-select">${groupOpts}</select>
            </div>
          </div>

          <!-- Row 2: Grid 4 (Jenis, Grade, Tahun, Tanggal Beli Item) -->
          <div class="data-grid-4">
            <div class="form-group">
              <label class="form-label">Jenis</label>
              <select id="${pfx}_jenis" class="form-select">
                ${JENIS_OPTIONS.map(opt => `<option value="${opt}" ${opt === r.jenis ? 'selected' : ''}>${JENIS_LABELS[opt] || opt}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Grade</label>
              <select id="${pfx}_grade" class="form-select">
                ${GRADE_OPTIONS.map(opt => `<option value="${opt}" ${opt === r.grade ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tahun</label>
              <input type="text" id="${pfx}_tahun" class="form-control" value="${escapeHtml(r.tahun)}" placeholder="cth: 1997">
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Beli Item</label>
              <input type="date" id="${pfx}_tanggal_beli" class="form-control" value="${itemTgl}">
            </div>
          </div>

          <!-- Row 3: Grid 3 (Negara Asal, Qty (Jumlah Pcs) *, Alokasi Harga Beli Item (Rp) *) -->
          <div class="data-grid-3">
            <div class="form-group">
              <label class="form-label">Negara Asal</label>
              <input type="text" id="${pfx}_negara" class="form-control" value="${escapeHtml(r.negara || 'Indonesia')}" placeholder="Indonesia">
            </div>
            <div class="form-group">
              <label class="form-label">Qty (Jumlah Pcs) <span class="required">*</span></label>
              <input type="number" id="${pfx}_qty" class="form-control" value="${r.qty || 1}" min="1" required oninput="onLotRowQtyInput('${ctxKey}', ${r.rowId})">
            </div>
            <div class="form-group">
              <label class="form-label">Alokasi Harga Beli Item (Rp) <span class="required">*</span></label>
              <input type="number" id="${pfx}_harga" class="form-control" value="${r.harga_alokasi || 0}" min="0" required oninput="onLotRowManualPriceInput('${ctxKey}', ${r.rowId})" style="border-color:var(--border-gold); color:var(--gold-light); font-weight:700;">
              <div id="${pfx}_unit_hint" style="font-size:11.5px; color:var(--gold-light); font-weight:600; margin-top:4px;"></div>
            </div>
          </div>

          <!-- Row 4: Grid 3 (Rencana Harga Jual / Pcs (Rp), 🔗 Link Pembelian Item, Keterangan / Catatan) -->
          <div class="data-grid-3">
            <div class="form-group">
              <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
              <input type="number" id="${pfx}_jual" class="form-control" value="${r.harga_jual || 0}" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">🔗 Link Pembelian Item</label>
              <input type="text" id="${pfx}_link" class="form-control" value="${escapeHtml(itemLink)}" placeholder="cth: https://... (Link lelang/item)">
            </div>
            <div class="form-group">
              <label class="form-label">Keterangan / Catatan</label>
              <input type="text" id="${pfx}_keterangan" class="form-control" value="${escapeHtml(r.keterangan || r.detail || '')}" placeholder="Keterangan kondisi, sertifikasi, dll.">
            </div>
          </div>

          <!-- Row 5: SmartPhotoManager Full Photo Section -->
          ${SmartPhotoManager.renderSection(photoPrefix, { showSupporting: true })}
        </div>
      </div>
    `;
  }).join('');

  // Initialize or restore SmartPhotoManager contexts for each row
  st.rows.forEach(r => {
    const photoPrefix = `lot_${ctxKey}_${r.rowId}`;
    restoreOrInitPhotoContext(photoPrefix);
  });
}

function restoreOrInitPhotoContext(prefix) {
  const existing = SmartPhotoManager.contexts[prefix];
  if (!existing) {
    SmartPhotoManager.initContext(prefix, { showSupporting: true });
    return;
  }
  const obvBlob = existing.obvFile ? URL.createObjectURL(existing.obvFile) : existing.initialObvUrl;
  const revBlob = existing.revFile ? URL.createObjectURL(existing.revFile) : existing.initialRevUrl;

  SmartPhotoManager.initContext(prefix, {
    koleksiId: existing.koleksiId,
    initialObvUrl: obvBlob,
    initialRevUrl: revBlob,
    existingGallery: existing.existingGallery,
    showSupporting: true
  });

  const newCtx = SmartPhotoManager.contexts[prefix];
  if (newCtx) {
    newCtx.obvFile = existing.obvFile;
    newCtx.revFile = existing.revFile;
    newCtx.supportingQueue = existing.supportingQueue || [];
    if (newCtx.obvFile) {
      const obvZone = document.getElementById(`${prefix}ObvZone`);
      const obvImg = document.getElementById(`${prefix}ObvPreview`);
      const obvPrompt = document.getElementById(`${prefix}ObvPrompt`);
      const obvClear = document.getElementById(`${prefix}ObvClearBtn`);
      if (obvZone) obvZone.classList.add('has-image');
      if (obvImg) { obvImg.src = obvBlob; obvImg.style.display = 'block'; }
      if (obvPrompt) obvPrompt.style.display = 'none';
      if (obvClear) obvClear.style.display = 'inline-flex';
    }
    if (newCtx.revFile) {
      const revZone = document.getElementById(`${prefix}RevZone`);
      const revImg = document.getElementById(`${prefix}RevPreview`);
      const revPrompt = document.getElementById(`${prefix}RevPrompt`);
      const revClear = document.getElementById(`${prefix}RevClearBtn`);
      if (revZone) revZone.classList.add('has-image');
      if (revImg) { revImg.src = revBlob; revImg.style.display = 'block'; }
      if (revPrompt) revPrompt.style.display = 'none';
      if (revClear) revClear.style.display = 'inline-flex';
    }
    SmartPhotoManager.renderSupportingQueue(prefix);
  }
}

function toggleLotRowAccordion(ctxKey, rowId) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];
  const targetRow = st.rows.find(x => x.rowId === rowId);
  if (!targetRow) return;

  const willBeExpanded = !targetRow.is_expanded;

  // Single-expanded accordion: Hanya 1 item yang show, yang lain otomatis hide untuk mengosongkan ruang input
  st.rows.forEach(r => {
    r.is_expanded = (r.rowId === rowId) ? willBeExpanded : false;
  });

  renderLotBuilderRows(ctxKey);
}

function toggleAllLotRows(ctxKey, expand) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];
  st.rows.forEach((r, idx) => {
    r.is_expanded = expand ? (idx === 0) : false;
  });
  renderLotBuilderRows(ctxKey);
}

function updateLotRowHeaderSummary(ctxKey, rowId) {
  const st = lotBuilderState[ctxKey];
  const r = st.rows.find(x => x.rowId === rowId);
  if (!r) return;
  const pfx = `lotrow_${ctxKey}_${rowId}`;
  const elNama = document.getElementById(`${pfx}_nama`);
  const elQty = document.getElementById(`${pfx}_qty`);
  const elHarga = document.getElementById(`${pfx}_harga`);

  const nama = (elNama ? elNama.value.trim() : r.nama_item) || '(Belum diberi nama)';
  const qty = elQty ? (parseInt(elQty.value, 10) || 1) : (r.qty || 1);
  const harga = elHarga ? (parseFloat(elHarga.value) || 0) : (r.harga_alokasi || 0);

  const titleEl = document.getElementById(`${pfx}_title_label`);
  if (titleEl) {
    titleEl.textContent = nama;
  }
  const metaEl = document.getElementById(`${pfx}_meta_label`);
  if (metaEl) {
    metaEl.textContent = `${qty} pcs • ${formatRupiah(harga)}`;
  }
}

function addLotBuilderRow(ctxKey) {
  syncLotBuilderDomToState(ctxKey);
  // Auto-hide semua item lain agar hanya item baru yang terbuka
  lotBuilderState[ctxKey].rows.forEach(r => r.is_expanded = false);
  const newRow = createDefaultLotRow(ctxKey);
  newRow.is_expanded = true;
  lotBuilderState[ctxKey].rows.push(newRow);
  renderLotBuilderRows(ctxKey);
  recalcLotBuilderAllocations(ctxKey);
  setTimeout(() => {
    const cardEl = document.getElementById(`lotrow_${ctxKey}_${newRow.rowId}_card`);
    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function copyLotBuilderRow(ctxKey, rowId) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];
  const idx = st.rows.findIndex(r => r.rowId === rowId);
  if (idx === -1) return;
  // Auto-hide semua item lain agar hanya item hasil copy yang terbuka
  st.rows.forEach(r => r.is_expanded = false);
  const cloned = createDefaultLotRow(ctxKey, st.rows[idx]);
  cloned.is_expanded = true;
  st.rows.splice(idx + 1, 0, cloned);
  renderLotBuilderRows(ctxKey);
  recalcLotBuilderAllocations(ctxKey);
  showToast('Baris item berhasil diduplikat di dalam Lot! Silakan edit rinciannya.', 'info', 1800);
  setTimeout(() => {
    const cardEl = document.getElementById(`lotrow_${ctxKey}_${cloned.rowId}_card`);
    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function removeLotBuilderRow(ctxKey, rowId) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];
  if (st.rows.length <= 1) return;
  const removedIdx = st.rows.findIndex(r => r.rowId === rowId);
  const wasExpanded = (removedIdx !== -1 && st.rows[removedIdx].is_expanded);
  st.rows = st.rows.filter(r => r.rowId !== rowId);
  if (wasExpanded && st.rows.length > 0) {
    const nextActiveIdx = Math.min(removedIdx, st.rows.length - 1);
    st.rows[nextActiveIdx].is_expanded = true;
  }
  renderLotBuilderRows(ctxKey);
  recalcLotBuilderAllocations(ctxKey);
}

function unlockLotRowPrice(ctxKey, rowId) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];
  const r = st.rows.find(x => x.rowId === rowId);
  if (r) r.manual_price = false;
  const badge = document.getElementById(`lotrow_${ctxKey}_${rowId}_manual_badge`);
  if (badge) badge.style.display = 'none';
  recalcLotBuilderAllocations(ctxKey);
}

function onLotRowQtyInput(ctxKey, rowId) {
  syncLotBuilderDomToState(ctxKey);
  recalcLotBuilderAllocations(ctxKey);
}

function onLotRowManualPriceInput(ctxKey, rowId) {
  const st = lotBuilderState[ctxKey];
  const r = st.rows.find(x => x.rowId === rowId);
  if (!r) return;
  const pfx = `lotrow_${ctxKey}_${rowId}`;
  r.manual_price = true;
  r.harga_alokasi = Math.max(0, parseFloat(document.getElementById(`${pfx}_harga`)?.value || '0'));
  const badge = document.getElementById(`${pfx}_manual_badge`);
  if (badge) badge.style.display = 'inline-flex';
  recalcLotBuilderAllocations(ctxKey, false, rowId);
}

function recalcLotBuilderAllocations(ctxKey, resetManual = false, activeManualRowId = null) {
  const st = lotBuilderState[ctxKey];
  const hargaLot = Math.max(0, parseFloat(document.getElementById(`lot_${ctxKey}_harga`)?.value || '0'));
  const ongkirLot = ctxKey === 'single' ? Math.max(0, parseFloat(document.getElementById(`lot_single_ongkir`)?.value || '0')) : 0;
  const metode = document.getElementById(`lot_${ctxKey}_metode`)?.value || 'proporsional_qty';

  st.rows.forEach(r => {
    const pfx = `lotrow_${ctxKey}_${r.rowId}`;
    const qEl = document.getElementById(`${pfx}_qty`);
    if (qEl) r.qty = Math.max(1, parseInt(qEl.value || '1', 10));
    if (resetManual) {
      r.manual_price = false;
      const bEl = document.getElementById(`${pfx}_manual_badge`);
      if (bEl) bEl.style.display = 'none';
    }
  });

  // Hitung porsi manual vs otomatis
  const manualRows = st.rows.filter(r => r.manual_price);
  const autoRows = st.rows.filter(r => !r.manual_price);
  const manualSum = manualRows.reduce((s, r) => s + (r.harga_alokasi || 0), 0);
  const remainingForAuto = Math.max(0, hargaLot - manualSum);

  if (autoRows.length > 0) {
    const autoTotalPcs = autoRows.reduce((s, r) => s + (r.qty || 1), 0);
    let runningAuto = 0;
    autoRows.forEach((r, idx) => {
      if (idx === autoRows.length - 1) {
        r.harga_alokasi = Math.max(0, Math.round(remainingForAuto - runningAuto));
      } else {
        if (metode === 'bagi_rata_item') {
          r.harga_alokasi = Math.round(remainingForAuto / autoRows.length);
        } else {
          r.harga_alokasi = Math.round((remainingForAuto * (r.qty || 1)) / Math.max(1, autoTotalPcs));
        }
        runningAuto += r.harga_alokasi;
      }
    });
  }

  // Update DOM inputs & hints
  let totalPcsAll = 0;
  let totalAllocAll = 0;
  st.rows.forEach(r => {
    const pfx = `lotrow_${ctxKey}_${r.rowId}`;
    totalPcsAll += (r.qty || 1);
    totalAllocAll += (r.harga_alokasi || 0);
    if (r.rowId !== activeManualRowId) {
      const hEl = document.getElementById(`${pfx}_harga`);
      if (hEl) hEl.value = r.harga_alokasi;
    }
    const hintEl = document.getElementById(`${pfx}_unit_hint`);
    if (hintEl) {
      const perPcs = Math.round((r.harga_alokasi || 0) / Math.max(1, r.qty || 1));
      hintEl.textContent = `@ ${formatRupiah(perPcs)} / pcs`;
    }
    updateLotRowHeaderSummary(ctxKey, r.rowId);
  });

  const sumQtyEl = document.getElementById(`lot_${ctxKey}_sum_qty`);
  const sumAllocEl = document.getElementById(`lot_${ctxKey}_sum_alloc`);
  const sumHppEl = document.getElementById(`lot_${ctxKey}_sum_hpp`);

  if (sumQtyEl) sumQtyEl.textContent = `${st.rows.length} Item (${totalPcsAll} pcs)`;
  if (sumAllocEl) {
    const diff = Math.round(totalAllocAll - hargaLot);
    if (diff === 0) {
      sumAllocEl.innerHTML = `${formatRupiah(totalAllocAll)} <span style="color:var(--success); font-size:11px;">(✓ Sesuai Harga Lot)</span>`;
    } else {
      sumAllocEl.innerHTML = `${formatRupiah(totalAllocAll)} <span style="color:var(--warning); font-size:11px;">(Selisih ${formatRupiah(Math.abs(diff))} dari Harga Lot ${formatRupiah(hargaLot)})</span>`;
    }
  }
  if (sumHppEl) {
    sumHppEl.textContent = formatRupiah(totalAllocAll + ongkirLot);
  }
}

async function submitLotPurchase(ctxKey) {
  syncLotBuilderDomToState(ctxKey);
  const st = lotBuilderState[ctxKey];

  const namaLot = document.getElementById(`lot_${ctxKey}_nama`)?.value.trim();
  const hargaLotTotal = parseFloat(document.getElementById(`lot_${ctxKey}_harga`)?.value || '0');
  const metode = document.getElementById(`lot_${ctxKey}_metode`)?.value || 'proporsional_qty';
  const tanggalBeli = document.getElementById(`lot_${ctxKey}_tanggal`)?.value || null;
  const linkPembelian = document.getElementById(`lot_${ctxKey}_link`)?.value.trim() || null;
  const catatan = document.getElementById(`lot_${ctxKey}_catatan`)?.value.trim() || null;

  if (!namaLot) {
    showToast('Nama / Judul Paket Lot wajib diisi.', 'warning');
    return;
  }

  for (let i = 0; i < st.rows.length; i++) {
    if (!st.rows[i].nama_item || !st.rows[i].nama_item.trim()) {
      showToast(`Nama Item pada Baris #${i + 1} wajib diisi.`, 'warning');
      return;
    }
  }

  const btn = document.getElementById(`lot_${ctxKey}_submit_btn`);
  if (btn) btn.disabled = true;

  const payload = {
    nama_lot: namaLot,
    harga_lot_total: hargaLotTotal,
    ongkir_lot: ctxKey === 'single' ? parseFloat(document.getElementById('lot_single_ongkir')?.value || '0') : 0,
    metode_alokasi: metode,
    batch_id: ctxKey === 'batch' ? st.batchId : null,
    supplier_id: ctxKey === 'single' ? (document.getElementById('lot_single_supplier')?.value ? parseInt(document.getElementById('lot_single_supplier').value, 10) : null) : (currentBatchData?.supplier_id || null),
    perolehan: ctxKey === 'single' ? document.getElementById('lot_single_perolehan')?.value : (currentBatchData?.perolehan || null),
    status: ctxKey === 'single' ? document.getElementById('lot_single_status')?.value : (currentBatchData?.status || 'pesan'),
    status_koleksi: ctxKey === 'single' ? document.getElementById('lot_single_tujuan')?.value : 'stock_jual',
    tanggal_beli: tanggalBeli,
    link_pembelian: linkPembelian,
    catatan: catatan,
    items: st.rows.map(r => ({
      nama_item: r.nama_item.trim(),
      nomor_seri: r.nomor_seri.trim() || null,
      group_id: r.group_id ? parseInt(r.group_id, 10) : null,
      jenis: r.jenis,
      grade: r.grade,
      tahun: r.tahun.trim() || null,
      tanggal_beli: r.tanggal_beli || tanggalBeli,
      link_pembelian: r.link_pembelian.trim() || linkPembelian,
      negara: r.negara.trim() || 'Indonesia',
      qty: r.qty,
      harga_alokasi: r.harga_alokasi,
      harga_jual: r.harga_jual,
      detail: r.keterangan ? r.keterangan.trim() : (r.detail ? r.detail.trim() : null),
      catatan_internal: r.keterangan ? r.keterangan.trim() : (r.detail ? r.detail.trim() : null)
    }))
  };

  try {
    const res = await API.post('/koleksi/lot', payload);
    const createdItems = res.items || [];

    // Upload per-item OBV, REV, and Supporting Photos using SmartPhotoManager
    for (let i = 0; i < createdItems.length; i++) {
      const cItem = createdItems[i];
      const rowState = st.rows[i];
      if (cItem && cItem.id && rowState) {
        const photoPrefix = `lot_${ctxKey}_${rowState.rowId}`;
        await SmartPhotoManager.uploadAllForKoleksi(photoPrefix, cItem.id).catch(err => {
          console.warn(`Gagal upload foto item #${i + 1}:`, err);
        });
      }
    }

    showToast(res.message || 'Paket Lot berhasil disimpan!', 'success');

    if (ctxKey === 'batch') {
      closeModal();
      await API.post(`/batch/${st.batchId}/recalculate`, {}).catch(() => {});
      selectBatch(st.batchId);
    } else {
      await renderSingleLotPurchaseForm();
    }
  } catch (err) {
    showToast('Gagal menyimpan Paket Lot: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}


// =========================================================================
// MULTIPLE SELECT & BULK DELETE HANDLERS UNTUK BATCH DAN ITEM
// =========================================================================

function toggleSelectBatch(batchId, isChecked) {
  if (isChecked) {
    selectedBatchIds.add(batchId);
  } else {
    selectedBatchIds.delete(batchId);
  }
  renderBatchList(currentBatchListCache);
}

function toggleSelectAllBatches(isChecked) {
  if (isChecked) {
    currentBatchListCache.forEach(b => selectedBatchIds.add(b.id));
  } else {
    selectedBatchIds.clear();
  }
  renderBatchList(currentBatchListCache);
}

function clearSelectedBatches() {
  selectedBatchIds.clear();
  renderBatchList(currentBatchListCache);
}

async function bulkDeleteSelectedBatches() {
  if (selectedBatchIds.size === 0) return;

  const count = selectedBatchIds.size;
  if (!confirm(`Hapus ${count} batch pembelian terpilih secara permanen?\n\nPERINGATAN: Seluruh item koleksi, pecahan stok, slot album digital, galeri foto, dan paket lot di dalam ${count} batch ini akan ikut terhapus secara permanen!`)) {
    return;
  }

  const btn = document.getElementById('btnBulkDeleteBatches');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Menghapus...';
  }

  try {
    const payload = { batch_ids: Array.from(selectedBatchIds) };
    const res = await API.post('/batch/bulk-delete', payload);
    showToast(res.message || `${count} batch berhasil dihapus.`, 'success');
    selectedBatchIds.clear();
    await loadPembelianBatch();
  } catch (err) {
    showToast('Gagal menghapus batch terpilih: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🗑️ Hapus (${count}) Batch Terpilih`;
    }
  }
}

function toggleSelectBatchItem(itemId, batchId, isChecked) {
  if (isChecked) {
    selectedBatchItemIds.add(itemId);
  } else {
    selectedBatchItemIds.delete(itemId);
  }
  if (currentBatchData) {
    renderBatchDetail(currentBatchData);
  }
}

function toggleSelectAllBatchItems(batchId, isChecked) {
  if (currentBatchData && currentBatchData.items) {
    if (isChecked) {
      currentBatchData.items.forEach(it => selectedBatchItemIds.add(it.id));
    } else {
      selectedBatchItemIds.clear();
    }
    renderBatchDetail(currentBatchData);
  }
}

function clearSelectedBatchItems(batchId) {
  selectedBatchItemIds.clear();
  if (currentBatchData) {
    renderBatchDetail(currentBatchData);
  }
}

async function bulkDeleteSelectedBatchItems(batchId) {
  if (selectedBatchItemIds.size === 0) return;

  const count = selectedBatchItemIds.size;
  if (!confirm(`Hapus ${count} item terpilih dari batch ini?\n\nItem yang dihapus akan dibersihkan dari koleksi, stok, dan album digital. Total ongkos kirim batch akan otomatis dialokasikan ulang secara proporsional ke item yang tersisa.`)) {
    return;
  }

  const btn = document.getElementById('btnBulkDeleteBatchItems');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Menghapus...';
  }

  try {
    const payload = { item_ids: Array.from(selectedBatchItemIds) };
    const res = await API.post(`/batch/${batchId}/items/bulk-delete`, payload);
    showToast(res.message || `${count} item berhasil dihapus dari batch.`, 'success');
    selectedBatchItemIds.clear();
    await selectBatch(batchId);
  } catch (err) {
    showToast('Gagal menghapus item terpilih: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🗑️ Hapus (${count}) Item Terpilih`;
    }
  }
}
