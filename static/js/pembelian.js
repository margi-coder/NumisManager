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
      <div class="section-header">
        <div>
          <h3>Entri Pembelian Item Tunggal</h3>
          <p class="input-hint">Pencatatan pembelian koin atau uang kertas individu secara langsung ke koleksi</p>
        </div>
        <button type="button" class="btn btn-secondary" onclick="resetSingleForm()">Bersihkan Form</button>
      </div>

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

            <div class="form-group">
              <label class="form-label">Foto Item (Obverse / Depan &amp; Reverse / Belakang)</label>
              <div class="dual-photo-grid">
                <!-- Obverse Photo -->
                <div class="photo-box-card" id="spObvZone" onclick="document.getElementById('spObvFileInput').click()">
                  <input type="file" id="spObvFileInput" accept="image/*" style="display:none" onchange="handleSingleObvSelect(event)">
                  <div id="spObvPrompt">
                    <div style="font-size:28px; margin-bottom:4px;">🪙</div>
                    <div style="font-weight:600; font-size:12.5px; color:var(--text-primary);">Tampak Depan (OBV)</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Klik untuk pilih foto</div>
                  </div>
                  <img id="spObvPreview" class="photo-box-preview" style="display:none;" alt="Preview Obverse">
                  <div class="photo-box-label">📸 Obverse (Muka)</div>
                </div>

                <!-- Reverse Photo -->
                <div class="photo-box-card" id="spRevZone" onclick="document.getElementById('spRevFileInput').click()">
                  <input type="file" id="spRevFileInput" accept="image/*" style="display:none" onchange="handleSingleRevSelect(event)">
                  <div id="spRevPrompt">
                    <div style="font-size:28px; margin-bottom:4px;">🪙</div>
                    <div style="font-weight:600; font-size:12.5px; color:var(--text-primary);">Tampak Belakang (REV)</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Klik untuk pilih foto</div>
                  </div>
                  <img id="spRevPreview" class="photo-box-preview" style="display:none;" alt="Preview Reverse">
                  <div class="photo-box-label">📸 Reverse (Belakang)</div>
                </div>
              </div>
            </div>
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

              <div class="data-grid-2">
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

  // Load suppliers into dropdown
  loadSuppliersIntoDropdown('spSupplier');

  // Drag and drop photo zone setup

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

  const obvImg = document.getElementById('spObvPreview');
  const obvPrompt = document.getElementById('spObvPrompt');
  const obvZone = document.getElementById('spObvZone');
  if (obvImg && obvPrompt) {
    obvImg.style.display = 'none';
    obvPrompt.style.display = 'block';
    if (obvZone) obvZone.classList.remove('has-image');
  }

  const revImg = document.getElementById('spRevPreview');
  const revPrompt = document.getElementById('spRevPrompt');
  const revZone = document.getElementById('spRevZone');
  if (revImg && revPrompt) {
    revImg.style.display = 'none';
    revPrompt.style.display = 'block';
    if (revZone) revZone.classList.remove('has-image');
  }

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
  const perolehan = document.getElementById('spPerolehan')?.value;
  const status = document.getElementById('spStatus')?.value;
  const statusKoleksi = document.getElementById('spStatusKoleksi')?.value;
  const tanggal = document.getElementById('spTanggal')?.value || null;
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
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    ongkir: ongkir,
    ongkir_alokasi: ongkir,
    harga_jual: hargaJual,
    supplier_id: supplierId ? parseInt(supplierId, 10) : null,
    perolehan: perolehan,
    metode_perolehan: perolehan,
    status,
    status_koleksi: statusKoleksi,
    tanggal_beli: tanggal,
    catatan_internal: catatan,
    catatan
  };

  try {
    const newItem = await API.post('/koleksi', payload);
    const itemId = newItem.id || newItem.item_id;

    // Upload Obverse photo if chosen
    if (singlePhotoObvFile && itemId) {
      const formData = new FormData();
      formData.append('file', singlePhotoObvFile);
      formData.append('foto', singlePhotoObvFile);
      await API.upload(`/koleksi/${itemId}/foto?tipe=obv`, formData).catch(err => {
        console.warn('Gagal mengunggah foto obverse:', err);
      });
    }

    // Upload Reverse photo if chosen
    if (singlePhotoRevFile && itemId) {
      const formData = new FormData();
      formData.append('file', singlePhotoRevFile);
      formData.append('foto', singlePhotoRevFile);
      await API.upload(`/koleksi/${itemId}/foto?tipe=rev`, formData).catch(err => {
        console.warn('Gagal mengunggah foto reverse:', err);
      });
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
async function loadPembelianBatch() {
  currentBatchId = null;
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="pembelian-batch-page">
      <div class="section-header">
        <div>
          <h3>Manajemen Pembelian Batch / Lot</h3>
          <p class="input-hint">Pengadaan paket lelang koleksi dengan alokasi ongkir otomatis ke setiap item</p>
        </div>
        <button class="btn btn-primary" onclick="showCreateBatchModal()">
          <span>+ Buat Batch Baru</span>
        </button>
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

async function refreshBatchList() {
  try {
    const res = await API.get('/batch');
    const batches = res.items || res.data || (Array.isArray(res) ? res : []);
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

  if (!batches || batches.length === 0) {
    renderEmpty(
      'batchListTableContainer',
      'Belum Ada Batch Pengadaan',
      'Belum ada batch pembelian tersimpan. Buat batch baru untuk mulai mencatat pengadaan lot/lelang.',
      '<button class="btn btn-primary btn-sm" onclick="showCreateBatchModal()">+ Buat Batch Baru</button>'
    );
    return;
  }

  let html = `
    <div class="table-wrapper table-compact">
      <table>
        <thead>
          <tr>
            <th>Kode Batch</th>
            <th>Nama Batch / Lot</th>
            <th>Supplier</th>
            <th>Perolehan</th>
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

    html += `
      <tr style="cursor:pointer;" onclick="selectBatch(${b.id})" title="Klik untuk membuka & mengelola batch ini">
        <td><strong style="color:var(--gold-light); font-family:monospace;">${escapeHtml(b.kode_batch || '#' + b.id)}</strong></td>
        <td><strong style="color:var(--text-primary); font-size:13px;">${escapeHtml(batchTitle)}</strong></td>
        <td>${escapeHtml(b.supplier_nama || b.supplier?.nama || '-')}</td>
        <td><span style="font-size:11px; color:var(--text-secondary);">${PEROLEHAN_LABELS[b.perolehan] || b.perolehan || '-'}</span></td>
        <td>${formatDate(b.tanggal_beli || b.created_at)}</td>
        <td style="text-align:center;"><span class="badge" style="background:rgba(212,175,55,0.12); color:var(--gold-light);">${itemCount} item</span></td>
        <td style="color:var(--gold-light); font-weight:600;">${formatRupiah(b.total_ongkir || 0)}</td>
        <td>${formatStatus(b.status)}</td>
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <div class="td-actions" style="justify-content:center;">
            <button class="btn btn-primary btn-sm" onclick="selectBatch(${b.id})" title="Buka & Kelola Batch">
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
}

async function selectBatch(id) {
  currentBatchId = id;
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

  mainView.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:18px;">
      <!-- Toolbar: Back button & Batch Actions -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="loadPembelianBatch()">
          <span>◀ Kembali ke Daftar Batch</span>
        </button>
        <div style="display:flex; gap:8px;">
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
          <h4 style="color:var(--gold-light); font-size:15px; display:flex; align-items:center; gap:8px;">
            <span>📦 ${escapeHtml(batchNama)}</span>
            <span style="font-size:12px; color:var(--text-muted); font-weight:400;">(${escapeHtml(b.kode_batch || '#' + b.id)})</span>
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

          <div style="display:flex; justify-content:flex-end;">
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
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showAddItemToBatchModal(${b.id})">
            + Tambah Item ke Batch
          </button>
        </div>

        <div class="table-wrapper table-compact">
          <table>
            <thead>
              <tr>
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
              ${renderBatchItemRows(items, b.id)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  loadSuppliersIntoDropdown('bhSupplier', b.supplier_id);
}

function renderBatchItemRows(items, batchId) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">
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

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${getJenisIcon(it.jenis)}</span>
            <strong style="cursor:pointer;" onclick="showEditBatchItemModal(${it.id}, ${batchId})" title="Klik untuk edit">${escapeHtml(it.nama_item || '-')}</strong>
            ${hasPhoto ? `<span class="photo-indicator" title="Lihat foto item" onclick="viewImageLightbox('${escapeHtml(fotoObv || fotoRev)}', '${escapeHtml(it.nama_item)}')">📷</span>` : ''}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
            ${it.nomor_seri ? `<span class="item-serial-compact" title="Nomor Seri">SN: ${escapeHtml(it.nomor_seri)}</span>` : ''}
            ${it.negara ? `<span style="font-size:10px; color:var(--text-muted);">${escapeHtml(it.negara)}</span>` : ''}
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

async function saveBatchHeader(id) {
  const nama = document.getElementById('bhNama')?.value.trim();
  const ongkir = parseFloat(document.getElementById('bhOngkir')?.value || '0');
  const supplierId = document.getElementById('bhSupplier')?.value;
  const perolehan = document.getElementById('bhPerolehan')?.value;
  const status = document.getElementById('bhStatus')?.value;
  const tanggal = document.getElementById('bhTanggal')?.value;

  if (!nama) {
    showToast('Nama batch wajib diisi.', 'warning');
    return;
  }

  const payload = {
    nama,
    nama_batch: nama,
    total_ongkir: ongkir,
    supplier_id: supplierId ? parseInt(supplierId, 10) : null,
    perolehan,
    metode_perolehan: perolehan,
    status,
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
  if (!confirm(`Hapus seluruh batch "${nama}"? Semua item dalam batch ini akan ikut terhapus.`)) {
    return;
  }

  try {
    await API.delete(`/batch/${id}`);
    showToast('Batch berhasil dihapus.', 'success');
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
      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Nama Item <span class="required">*</span></label>
          <input type="text" id="biNama" class="form-control" placeholder="cth: 50 Rupiah Komodo 1997 UNC" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nomor Seri</label>
          <input type="text" id="biNomorSeri" class="form-control" placeholder="cth: ABC123456 / No Seri">
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

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
          <input type="number" id="biHargaJual" class="form-control" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Keterangan / Catatan</label>
          <input type="text" id="biKeterangan" class="form-control" placeholder="Keterangan kondisi, sertifikasi, dll.">
        </div>
      </div>

      <!-- Upload Foto OBV & REV -->
      <div class="form-group">
        <label class="form-label">Foto Item (Obverse &amp; Reverse)</label>
        <div class="dual-photo-grid">
          <div class="photo-box-card" id="baiObvZone" onclick="document.getElementById('baiObvInput').click()">
            <input type="file" id="baiObvInput" accept="image/*" style="display:none" onchange="handleBatchAddObvSelect(event)">
            <div id="baiObvPrompt">
              <div style="font-size:26px; margin-bottom:4px;">🪙</div>
              <div style="font-weight:600; font-size:12px; color:var(--text-primary);">Tampak Depan (OBV)</div>
              <div style="font-size:11px; color:var(--text-muted);">Pilih foto depan</div>
            </div>
            <img id="baiObvPreview" class="photo-box-preview" style="display:none;" alt="OBV">
            <div class="photo-box-label">📸 Obverse (Muka)</div>
          </div>

          <div class="photo-box-card" id="baiRevZone" onclick="document.getElementById('baiRevInput').click()">
            <input type="file" id="baiRevInput" accept="image/*" style="display:none" onchange="handleBatchAddRevSelect(event)">
            <div id="baiRevPrompt">
              <div style="font-size:26px; margin-bottom:4px;">🪙</div>
              <div style="font-weight:600; font-size:12px; color:var(--text-primary);">Tampak Belakang (REV)</div>
              <div style="font-size:11px; color:var(--text-muted);">Pilih foto belakang</div>
            </div>
            <img id="baiRevPreview" class="photo-box-preview" style="display:none;" alt="REV">
            <div class="photo-box-label">📸 Reverse (Belakang)</div>
          </div>
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-primary" onclick="submitItemToBatch(${batchId})">Tambah ke Batch</button>
  `;

  openModal({
    title: '➕ Tambah Item Baru ke Batch',
    body,
    footer,
    size: 'lg'
  });

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
  const nama = document.getElementById('biNama')?.value.trim();
  const nomorSeri = document.getElementById('biNomorSeri')?.value.trim() || null;
  const jenis = document.getElementById('biJenis')?.value;
  const grade = document.getElementById('biGrade')?.value;
  const tahun = document.getElementById('biTahun')?.value.trim() || null;
  const tanggalBeli = document.getElementById('biTanggalBeli')?.value || (currentBatchData?.tanggal_beli ? currentBatchData.tanggal_beli.split('T')[0] : null);
  const negara = document.getElementById('biNegara')?.value.trim() || 'Indonesia';
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
    nama_item: nama,
    nomor_seri: nomorSeri,
    jenis,
    grade,
    tahun,
    negara,
    detail: keterangan,
    catatan_internal: keterangan,
    tanggal_beli: tanggalBeli,
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    status_koleksi: 'stock_jual'
  };

  try {
    const res = await API.post('/koleksi', payload);
    const newId = res.id || res.item_id;

    if (newId && batchAddObvFile) {
      const fd = new FormData();
      fd.append('file', batchAddObvFile);
      fd.append('foto', batchAddObvFile);
      await API.upload(`/koleksi/${newId}/foto?tipe=obv`, fd).catch(() => {});
    }
    if (newId && batchAddRevFile) {
      const fd = new FormData();
      fd.append('file', batchAddRevFile);
      fd.append('foto', batchAddRevFile);
      await API.upload(`/koleksi/${newId}/foto?tipe=rev`, fd).catch(() => {});
    }

    showToast('Item berhasil ditambahkan ke batch!', 'success');
    closeModal();
    await API.post(`/batch/${batchId}/recalculate`, {}).catch(() => {});
    selectBatch(batchId);
  } catch (err) {
    showToast('Gagal menambahkan item: ' + err.message, 'error');
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
        <div class="data-grid-2">
          <div class="form-group">
            <label class="form-label">Nama Item <span class="required">*</span></label>
            <input type="text" id="ebiNama" class="form-control" value="${escapeHtml(item.nama_item)}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Seri (Serial Number)</label>
            <input type="text" id="ebiNomorSeri" class="form-control" value="${escapeHtml(item.nomor_seri || '')}" placeholder="cth: ABC123456 / No Seri">
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

        <div class="data-grid-2">
          <div class="form-group">
            <label class="form-label">Rencana Harga Jual / Pcs (Rp)</label>
            <input type="number" id="ebiHargaJual" class="form-control" value="${item.harga_jual || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Keterangan / Catatan</label>
            <input type="text" id="ebiKeterangan" class="form-control" value="${escapeHtml(item.detail || item.catatan_internal || item.catatan || '')}" placeholder="Keterangan kondisi, sertifikasi, dll.">
          </div>
        </div>

        <!-- Upload Foto OBV & REV -->
        <div class="form-group">
          <label class="form-label">Foto Item (Obverse / Depan &amp; Reverse / Belakang)</label>
          <div class="dual-photo-grid">
            <div class="photo-box-card ${fotoObv ? 'has-image' : ''}" id="beiObvZone" onclick="document.getElementById('beiObvInput').click()">
              <input type="file" id="beiObvInput" accept="image/*" style="display:none" onchange="handleBatchEditObvSelect(event)">
              <div id="beiObvPrompt" style="${fotoObv ? 'display:none;' : ''}">
                <div style="font-size:26px; margin-bottom:4px;">🪙</div>
                <div style="font-weight:600; font-size:12px; color:var(--text-primary);">Tampak Depan (OBV)</div>
                <div style="font-size:11px; color:var(--text-muted);">Pilih foto depan</div>
              </div>
              <img id="beiObvPreview" class="photo-box-preview" src="${fotoObv ? escapeHtml(fotoObv) : ''}" style="${fotoObv ? 'display:block;' : 'display:none;'}" alt="OBV">
              <div class="photo-box-label">📸 Obverse (Muka)</div>
            </div>

            <div class="photo-box-card ${fotoRev ? 'has-image' : ''}" id="beiRevZone" onclick="document.getElementById('beiRevInput').click()">
              <input type="file" id="beiRevInput" accept="image/*" style="display:none" onchange="handleBatchEditRevSelect(event)">
              <div id="beiRevPrompt" style="${fotoRev ? 'display:none;' : ''}">
                <div style="font-size:26px; margin-bottom:4px;">🪙</div>
                <div style="font-weight:600; font-size:12px; color:var(--text-primary);">Tampak Belakang (REV)</div>
                <div style="font-size:11px; color:var(--text-muted);">Pilih foto belakang</div>
              </div>
              <img id="beiRevPreview" class="photo-box-preview" src="${fotoRev ? escapeHtml(fotoRev) : ''}" style="${fotoRev ? 'display:block;' : 'display:none;'}" alt="REV">
              <div class="photo-box-label">📸 Reverse (Belakang)</div>
            </div>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="submitUpdateBatchItem(${itemId}, ${batchId})">Simpan Perubahan</button>
    `;

    openModal({
      title: `✏️ Edit Item Batch #${itemId}`,
      body,
      footer,
      size: 'lg'
    });

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
  const jenis = document.getElementById('ebiJenis')?.value;
  const grade = document.getElementById('ebiGrade')?.value;
  const tahun = document.getElementById('ebiTahun')?.value.trim() || null;
  const tanggalBeli = document.getElementById('ebiTanggalBeli')?.value || null;
  const negara = document.getElementById('ebiNegara')?.value.trim() || 'Indonesia';
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
    jenis,
    grade,
    tahun,
    negara,
    detail: keterangan,
    catatan_internal: keterangan,
    tanggal_beli: tanggalBeli,
    qty,
    harga: hargaBeli,
    harga_beli: hargaBeli,
    harga_jual: hargaJual
  };

  try {
    await API.put(`/koleksi/${itemId}`, payload);

    if (batchEditObvFile) {
      const fd = new FormData();
      fd.append('file', batchEditObvFile);
      fd.append('foto', batchEditObvFile);
      await API.upload(`/koleksi/${itemId}/foto?tipe=obv`, fd).catch(() => {});
    }
    if (batchEditRevFile) {
      const fd = new FormData();
      fd.append('file', batchEditRevFile);
      fd.append('foto', batchEditRevFile);
      await API.upload(`/koleksi/${itemId}/foto?tipe=rev`, fd).catch(() => {});
    }

    showToast('Item batch berhasil diperbarui!', 'success');
    closeModal();
    // Recalculate batch HPP since harga/qty might have changed
    await API.post(`/batch/${batchId}/recalculate`, {}).catch(() => {});
    selectBatch(batchId);
  } catch (err) {
    showToast('Gagal memperbarui item batch: ' + err.message, 'error');
  }
}
