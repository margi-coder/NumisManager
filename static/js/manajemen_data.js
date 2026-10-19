/**
 * NumisManager - Manajemen Data Module (Group Item & Supplier)
 */

let currentManajemenDataTab = 'group';
let groupItemsCache = [];
let supplierDataCache = [];

/**
 * Main Entry Point for Manajemen Data
 */
async function loadManajemenData(initialTab = 'group') {
  if (initialTab !== 'group' && initialTab !== 'supplier') {
    initialTab = 'group';
  }
  currentManajemenDataTab = initialTab;

  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="manajemen-data-page">
      <div class="tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${currentManajemenDataTab === 'group' ? 'active' : ''}" id="tabBtnGroupItem" onclick="switchManajemenDataTab('group')">
          <span>📦 Group Item</span>
        </button>
        <button class="tab-btn ${currentManajemenDataTab === 'supplier' ? 'active' : ''}" id="tabBtnSupplier" onclick="switchManajemenDataTab('supplier')">
          <span>👥 Supplier & Rekanan</span>
        </button>
      </div>

      <!-- Tab 1: Group Item -->
      <div id="tabContentGroupItem" class="tab-content" style="${currentManajemenDataTab === 'group' ? 'display: block;' : 'display: none;'}">
        <div class="section-header">
          <div>
            <h3>Master Group Item Koleksi</h3>
            <p class="input-hint">Kategori atau seri khusus pengelompokan koleksi (cth: Seri Wayang, Koin VOC, Seri Soekarno, Pahlawan)</p>
          </div>
          <button class="btn btn-primary" onclick="showAddGroupItemModal()">
            <span>+ Tambah Group Item</span>
          </button>
        </div>

        <div class="filter-bar">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="groupItemSearchInput" 
              class="form-control" 
              placeholder="Ketik untuk filter live nama group atau deskripsi..."
              oninput="handleLiveFilterGroupItem()"
            >
          </div>
          <button class="btn btn-secondary" onclick="resetGroupItemSearch()">Reset</button>
        </div>

        <div class="card">
          <div id="groupItemTableContainer"></div>
        </div>
      </div>

      <!-- Tab 2: Supplier & Rekanan -->
      <div id="tabContentSupplier" class="tab-content" style="${currentManajemenDataTab === 'supplier' ? 'display: block;' : 'display: none;'}">
        <div class="section-header">
          <div>
            <h3>Database Supplier & Rekanan Numismatik</h3>
            <p class="input-hint">Daftar pelelang, kolektor rekanan, dan toko tempat perolehan item koleksi</p>
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
              id="supplierLiveSearchInput" 
              class="form-control" 
              placeholder="Ketik untuk filter live nama supplier, HP, alamat..."
              oninput="handleLiveFilterSupplier()"
            >
          </div>
          <button class="btn btn-secondary" onclick="resetSupplierSearchInsideTab()">Reset</button>
        </div>

        <div class="card">
          <div id="supplierTableContainerInsideTab"></div>
        </div>
      </div>
    </div>
  `;

  // Muat data untuk tab yang aktif
  if (currentManajemenDataTab === 'group') {
    loadGroupItemsList();
  } else {
    loadSupplierListInsideTab();
  }
}

/**
 * Switch tabs within Manajemen Data
 */
function switchManajemenDataTab(tabName) {
  currentManajemenDataTab = tabName;
  const btnGroup = document.getElementById('tabBtnGroupItem');
  const btnSup = document.getElementById('tabBtnSupplier');
  const contentGroup = document.getElementById('tabContentGroupItem');
  const contentSup = document.getElementById('tabContentSupplier');

  if (tabName === 'group') {
    btnGroup?.classList.add('active');
    btnSup?.classList.remove('active');
    if (contentGroup) contentGroup.style.display = 'block';
    if (contentSup) contentSup.style.display = 'none';
    if (!groupItemsCache || groupItemsCache.length === 0) {
      loadGroupItemsList();
    }
  } else {
    btnSup?.classList.add('active');
    btnGroup?.classList.remove('active');
    if (contentSup) contentSup.style.display = 'block';
    if (contentGroup) contentGroup.style.display = 'none';
    if (!supplierDataCache || supplierDataCache.length === 0) {
      loadSupplierListInsideTab();
    }
  }
}

// =========================================================================
// TAB 1: GROUP ITEM FUNCTIONS
// =========================================================================

async function loadGroupItemsList(searchQuery = '') {
  renderLoading('groupItemTableContainer', 'Mengambil data group item...');
  try {
    const url = searchQuery ? `/group-item?search=${encodeURIComponent(searchQuery)}` : '/group-item';
    const groups = await API.get(url);
    groupItemsCache = Array.isArray(groups) ? groups : [];
    renderGroupItemTable(groupItemsCache);
  } catch (err) {
    console.error('Error fetching group items:', err);
    document.getElementById('groupItemTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat group item: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

const handleLiveFilterGroupItem = debounce(() => {
  const query = document.getElementById('groupItemSearchInput')?.value.trim() || '';
  loadGroupItemsList(query);
}, 260);

function resetGroupItemSearch() {
  const input = document.getElementById('groupItemSearchInput');
  if (input) input.value = '';
  loadGroupItemsList('');
}

function renderGroupItemTable(data) {
  const container = document.getElementById('groupItemTableContainer');
  if (!container) return;

  if (!data || data.length === 0) {
    renderEmpty(
      'groupItemTableContainer',
      'Belum Ada Group Item',
      'Belum ada data Group Item yang terdaftar. Tambahkan group baru untuk mengelompokkan koleksi Anda.',
      '<button class="btn btn-primary btn-sm" onclick="showAddGroupItemModal()">+ Tambah Group Item Sekarang</button>'
    );
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width: 60px;">No</th>
            <th>Nama Group Item</th>
            <th>Deskripsi / Catatan Seri</th>
            <th style="width: 140px; text-align: center;">Jumlah Item</th>
            <th style="width: 140px;">Dibuat Pada</th>
            <th style="width: 150px; text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach((g, idx) => {
    const itemCount = g.item_count || 0;
    const countBadge = itemCount > 0 
      ? `<button class="badge badge-group" style="cursor:pointer; border:none; background:rgba(168,85,247,0.2);" title="Lihat koleksi dalam group ini" onclick="filterKoleksiByGroup(${g.id})">📦 ${itemCount} Item</button>`
      : `<span class="badge badge-grade-default">0 Item</span>`;

    html += `
      <tr>
        <td style="color:var(--text-muted); font-size:12px;">${idx + 1}</td>
        <td>
          <strong style="color:var(--gold-light); font-size:14px;">${escapeHtml(g.nama_group)}</strong>
        </td>
        <td style="color:var(--text-secondary); max-width:320px;">
          ${escapeHtml(g.deskripsi || '-')}
        </td>
        <td style="text-align: center;">
          ${countBadge}
        </td>
        <td style="color:var(--text-muted); font-size:12px;">
          ${formatDate(g.created_at)}
        </td>
        <td style="text-align: center;">
          <div class="td-actions" style="justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="showEditGroupItemModal(${g.id})" title="Edit Group">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteGroupItem(${g.id}, '${escapeHtml(g.nama_group)}')" title="Hapus Group">🗑️ Hapus</button>
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

function showAddGroupItemModal() {
  const body = `
    <form id="groupItemForm" onsubmit="event.preventDefault(); saveGroupItem();">
      <div class="form-group">
        <label class="form-label">Nama Group Item <span class="required">*</span></label>
        <input type="text" id="groupNama" class="form-control" placeholder="cth: Seri Wayang, Koin Kuno VOC, Seri Soekarno" required autofocus>
        <span class="input-hint">Gunakan nama yang jelas untuk mengelompokkan koleksi yang sejenis atau satu seri.</span>
      </div>

      <div class="form-group">
        <label class="form-label">Deskripsi / Keterangan Tambahan</label>
        <textarea id="groupDeskripsi" class="form-control" rows="3" placeholder="Deskripsi ringkas mengenai latar belakang seri, masa edar, atau karakteristik grup koleksi ini..."></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button type="button" class="btn btn-primary" onclick="saveGroupItem()">Simpan Group</button>
  `;

  openModal({
    title: '📦 Tambah Group Item Baru',
    body,
    footer,
    size: 'md'
  });
}

async function showEditGroupItemModal(id) {
  try {
    let group = groupItemsCache.find(g => g.id === id);
    if (!group) {
      group = await API.get(`/group-item/${id}`);
    }

    const body = `
      <form id="editGroupItemForm" onsubmit="event.preventDefault(); saveGroupItem(${id});">
        <div class="form-group">
          <label class="form-label">Nama Group Item <span class="required">*</span></label>
          <input type="text" id="groupNama" class="form-control" value="${escapeHtml(group.nama_group)}" required autofocus>
        </div>

        <div class="form-group">
          <label class="form-label">Deskripsi / Keterangan Tambahan</label>
          <textarea id="groupDeskripsi" class="form-control" rows="3">${escapeHtml(group.deskripsi || '')}</textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="saveGroupItem(${id})">Simpan Perubahan</button>
    `;

    openModal({
      title: `✏️ Edit Group Item: ${escapeHtml(group.nama_group)}`,
      body,
      footer,
      size: 'md'
    });
  } catch (err) {
    showToast('Gagal memuat detail group item: ' + err.message, 'error');
  }
}

async function saveGroupItem(id = null) {
  const nama_group = document.getElementById('groupNama')?.value.trim();
  const deskripsi = document.getElementById('groupDeskripsi')?.value.trim();

  if (!nama_group) {
    showToast('Nama group item wajib diisi.', 'warning');
    return;
  }

  const payload = {
    nama_group,
    deskripsi: deskripsi || null
  };

  try {
    if (id) {
      await API.put(`/group-item/${id}`, payload);
      showToast('Group item berhasil diperbarui!', 'success');
    } else {
      await API.post('/group-item', payload);
      showToast('Group item baru berhasil ditambahkan!', 'success');
    }
    clearGroupItemCache();
    closeModal();
    const query = document.getElementById('groupItemSearchInput')?.value.trim() || '';
    loadGroupItemsList(query);
  } catch (err) {
    showToast('Gagal menyimpan group item: ' + err.message, 'error');
  }
}

async function deleteGroupItem(id, nama) {
  if (!confirm(`Hapus Group Item "${nama}"?`)) {
    return;
  }

  try {
    await API.delete(`/group-item/${id}`);
    showToast(`Group item "${nama}" berhasil dihapus.`, 'success');
    clearGroupItemCache();
    const query = document.getElementById('groupItemSearchInput')?.value.trim() || '';
    loadGroupItemsList(query);
  } catch (err) {
    showToast(err.message, 'error', 4500);
  }
}

function filterKoleksiByGroup(groupId) {
  window.location.hash = 'koleksi';
  window.router.navigate('koleksi');
  setTimeout(() => {
    const sel = document.getElementById('filterGroup');
    if (sel) {
      sel.value = String(groupId);
      if (typeof loadKoleksi === 'function') {
        if (window.koleksiState) window.koleksiState.page = 1;
        loadKoleksi();
      }
    }
  }, 200);
}

// =========================================================================
// TAB 2: SUPPLIER FUNCTIONS INSIDE TAB
// =========================================================================

async function loadSupplierListInsideTab(searchQuery = '') {
  renderLoading('supplierTableContainerInsideTab', 'Mengambil daftar supplier...');
  try {
    const url = searchQuery ? `/supplier?search=${encodeURIComponent(searchQuery)}` : '/supplier';
    const suppliers = await API.get(url);
    supplierDataCache = Array.isArray(suppliers) ? suppliers : (suppliers.data || []);
    suppliersCache = supplierDataCache; // sync with supplier.js global
    renderSupplierTableInsideTab(supplierDataCache);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    document.getElementById('supplierTableContainerInsideTab').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat supplier: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

const handleLiveFilterSupplier = debounce(() => {
  const query = document.getElementById('supplierLiveSearchInput')?.value.trim() || '';
  loadSupplierListInsideTab(query);
}, 260);

function resetSupplierSearchInsideTab() {
  const input = document.getElementById('supplierLiveSearchInput');
  if (input) input.value = '';
  loadSupplierListInsideTab('');
}

function renderSupplierTableInsideTab(data) {
  const container = document.getElementById('supplierTableContainerInsideTab');
  if (!container) return;

  if (!data || data.length === 0) {
    renderEmpty(
      'supplierTableContainerInsideTab',
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
            <th style="width: 50px;">ID</th>
            <th>Nama Supplier / Mitra</th>
            <th>No. Handphone / WA</th>
            <th>Alamat / Kota Asal</th>
            <th>Link Profil / Toko</th>
            <th>Catatan</th>
            <th style="width: 140px; text-align: center;">Aksi</th>
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
        <td style="color:var(--text-muted); font-size:12px;">#${s.id}</td>
        <td><strong style="color:var(--text-primary);">${escapeHtml(s.nama)}</strong></td>
        <td>${waLink}</td>
        <td>${escapeHtml(s.alamat || '-')}</td>
        <td>${linkDisplay}</td>
        <td style="max-width:200px; color:var(--text-secondary);">${escapeHtml(s.catatan || '-')}</td>
        <td style="text-align: center;">
          <div class="td-actions" style="justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="showEditSupplierModal(${s.id})" title="Edit Supplier">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id}, '${escapeHtml(s.nama)}')" title="Hapus Supplier">🗑️ Hapus</button>
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
