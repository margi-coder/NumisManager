/**
 * NumisManager - Supplier Management Module
 */

let suppliersCache = [];

async function loadSupplier(searchQuery = '') {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="supplier-page">
      <div class="section-header">
        <div>
          <h3>Database Supplier & Mitra Numismatik</h3>
          <p class="input-hint">Daftar pelelang, kolektor rekanan, dan toko tempat perolehan item</p>
        </div>
        <button class="btn btn-primary" onclick="showAddSupplierModal()">
          <span>+ Tambah Supplier</span>
        </button>
      </div>

      <div class="filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            id="supplierSearchInput" 
            class="form-control" 
            placeholder="Cari nama supplier, no HP, atau catatan..."
            value="${escapeHtml(searchQuery)}"
            onkeydown="if(event.key==='Enter') applySupplierSearch()"
          >
        </div>
        <button class="btn btn-secondary" onclick="applySupplierSearch()">Cari</button>
        <button class="btn btn-secondary" onclick="resetSupplierSearch()">Reset</button>
      </div>

      <div class="card">
        <div id="supplierTableContainer"></div>
      </div>
    </div>
  `;

  renderLoading('supplierTableContainer', 'Mengambil daftar supplier...');

  try {
    const url = searchQuery ? `/supplier?search=${encodeURIComponent(searchQuery)}` : '/supplier';
    const res = await API.get(url);
    const suppliers = Array.isArray(res) ? res : (res.data || []);
    suppliersCache = suppliers;
    renderSupplierTable(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    document.getElementById('supplierTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat supplier: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

function applySupplierSearch() {
  const query = document.getElementById('supplierSearchInput')?.value.trim() || '';
  loadSupplier(query);
}

function resetSupplierSearch() {
  loadSupplier('');
}

function renderSupplierTable(data) {
  const container = document.getElementById('supplierTableContainer');
  if (!container) return;

  if (!data || data.length === 0) {
    renderEmpty(
      'supplierTableContainer',
      'Belum Ada Supplier',
      'Belum ada data supplier yang terdaftar. Tambahkan supplier baru untuk memudahkan pencatatan sumber perolehan koleksi.',
      '<button class="btn btn-primary btn-sm" onclick="showAddSupplierModal()">+ Tambah Supplier Sekarang</button>'
    );
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Supplier</th>
            <th>No. Handphone / WA</th>
            <th>Alamat / Lokasi</th>
            <th>Link Profil / Toko</th>
            <th>Catatan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(s => {
    const linkDisplay = s.link_profile ? `
      <a href="${escapeHtml(s.link_profile)}" target="_blank" rel="noopener noreferrer" style="color:var(--gold-light); text-decoration:underline; display:inline-flex; align-items:center; gap:4px;">
        <span>Buka Link</span>
        <span style="font-size:10px;">↗</span>
      </a>
    ` : '-';

    const waLink = s.no_hp ? `
      <a href="https://wa.me/${escapeHtml(s.no_hp.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener noreferrer" style="color:var(--success); text-decoration:none;" title="Chat WhatsApp">
        📱 ${escapeHtml(s.no_hp)}
      </a>
    ` : '-';

    html += `
      <tr>
        <td>#${s.id}</td>
        <td><strong style="color:var(--text-primary);">${escapeHtml(s.nama)}</strong></td>
        <td>${waLink}</td>
        <td>${escapeHtml(s.alamat || '-')}</td>
        <td>${linkDisplay}</td>
        <td style="max-width:200px; color:var(--text-secondary);">${escapeHtml(s.catatan || '-')}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn-secondary btn-sm" onclick="showEditSupplierModal(${s.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id}, '${escapeHtml(s.nama)}')">Hapus</button>
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

function showAddSupplierModal() {
  const body = `
    <form id="supplierForm" onsubmit="event.preventDefault(); saveSupplier();">
      <div class="form-group">
        <label class="form-label">Nama Supplier / Pelelang <span class="required">*</span></label>
        <input type="text" id="supNama" class="form-control" placeholder="cth: Mas Hendra Numismatik Solo" required>
      </div>

      <div class="data-grid-2">
        <div class="form-group">
          <label class="form-label">Nomor WhatsApp / HP</label>
          <input type="text" id="supNoHp" class="form-control" placeholder="08123456789">
        </div>
        <div class="form-group">
          <label class="form-label">Link Profil (FB / Toko / IG)</label>
          <input type="url" id="supLink" class="form-control" placeholder="https://facebook.com/...">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Alamat / Kota Asal</label>
        <input type="text" id="supAlamat" class="form-control" placeholder="cth: Pasar Triwindu, Surakarta">
      </div>

      <div class="form-group">
        <label class="form-label">Catatan Tambahan</label>
        <textarea id="supCatatan" class="form-control" placeholder="Spesialisasi item uang kertas kuno era revolusi, dll."></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-primary" onclick="saveSupplier()">Simpan Supplier</button>
  `;

  openModal({
    title: '👥 Tambah Supplier / Rekanan Baru',
    body,
    footer,
    size: 'md'
  });
}

async function showEditSupplierModal(id) {
  try {
    let supplier = suppliersCache.find(s => s.id === id);
    if (!supplier) {
      supplier = await API.get(`/supplier/${id}`);
    }

    const body = `
      <form id="editSupplierForm" onsubmit="event.preventDefault(); saveSupplier(${id});">
        <div class="form-group">
          <label class="form-label">Nama Supplier / Pelelang <span class="required">*</span></label>
          <input type="text" id="supNama" class="form-control" value="${escapeHtml(supplier.nama)}" required>
        </div>

        <div class="data-grid-2">
          <div class="form-group">
            <label class="form-label">Nomor WhatsApp / HP</label>
            <input type="text" id="supNoHp" class="form-control" value="${escapeHtml(supplier.no_hp || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Link Profil (FB / Toko / IG)</label>
            <input type="url" id="supLink" class="form-control" value="${escapeHtml(supplier.link_profile || '')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Alamat / Kota Asal</label>
          <input type="text" id="supAlamat" class="form-control" value="${escapeHtml(supplier.alamat || '')}">
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Tambahan</label>
          <textarea id="supCatatan" class="form-control">${escapeHtml(supplier.catatan || '')}</textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="saveSupplier(${id})">Simpan Perubahan</button>
    `;

    openModal({
      title: `✏️ Edit Supplier: ${escapeHtml(supplier.nama)}`,
      body,
      footer,
      size: 'md'
    });
  } catch (err) {
    showToast('Gagal memuat detail supplier: ' + err.message, 'error');
  }
}

async function saveSupplier(id = null) {
  const nama = document.getElementById('supNama')?.value.trim();
  const no_hp = document.getElementById('supNoHp')?.value.trim();
  const link_profile = document.getElementById('supLink')?.value.trim();
  const alamat = document.getElementById('supAlamat')?.value.trim();
  const catatan = document.getElementById('supCatatan')?.value.trim();

  if (!nama) {
    showToast('Nama supplier wajib diisi.', 'warning');
    return;
  }

  const payload = {
    nama,
    no_hp: no_hp || null,
    link_profile: link_profile || null,
    alamat: alamat || null,
    catatan: catatan || null
  };

  try {
    if (id) {
      await API.put(`/supplier/${id}`, payload);
      showToast('Supplier berhasil diperbarui!', 'success');
    } else {
      await API.post('/supplier', payload);
      showToast('Supplier baru berhasil disimpan!', 'success');
    }
    closeModal();
    const query = document.getElementById('supplierSearchInput')?.value.trim() || '';
    loadSupplier(query);
  } catch (err) {
    showToast('Gagal menyimpan supplier: ' + err.message, 'error');
  }
}

async function deleteSupplier(id, nama) {
  if (!confirm(`Hapus supplier "${nama}"? Semua referensi koleksi terkait mungkin terpengaruh.`)) {
    return;
  }

  try {
    await API.delete(`/supplier/${id}`);
    showToast(`Supplier ${nama} berhasil dihapus.`, 'success');
    const query = document.getElementById('supplierSearchInput')?.value.trim() || '';
    loadSupplier(query);
  } catch (err) {
    showToast('Gagal menghapus supplier: ' + err.message, 'error');
  }
}
