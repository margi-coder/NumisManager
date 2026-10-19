/**
 * NumisManager - Laporan & Analitik (Stok, Penjualan, Profit & Loss)
 */

let activeLaporanTab = 'stok';

async function loadLaporan() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="laporan-page">
      <div class="section-header">
        <div>
          <h3>Laporan & Pembukuan Numismatik</h3>
          <p class="input-hint">Rekapitulasi nilai stok, audit transaksi penjualan, dan evaluasi laba rugi</p>
        </div>
      </div>

      <!-- Laporan Tabs Navigation -->
      <div class="tabs">
        <button class="tab-btn active" id="tabBtnStok" onclick="switchLaporanTab('stok')">
          📋 Laporan Stok & Inventaris
        </button>
        <button class="tab-btn" id="tabBtnPenjualan" onclick="switchLaporanTab('penjualan')">
          💰 Laporan Penjualan
        </button>
        <button class="tab-btn" id="tabBtnProfit" onclick="switchLaporanTab('profit')">
          💹 Laporan Laba Rugi (P&L)
        </button>
      </div>

      <!-- Tab Content 1: STOK -->
      <div class="tab-content active" id="tabContentStok">
        <div class="filter-bar">
          <select id="lapStokJenis" class="form-select" style="max-width:180px;" onchange="loadLaporanStok()">
            <option value="">Semua Jenis</option>
            ${JENIS_OPTIONS.map(opt => `<option value="${opt}">${JENIS_LABELS[opt] || opt}</option>`).join('')}
          </select>

          <select id="lapStokStatusKoleksi" class="form-select" style="max-width:180px;" onchange="loadLaporanStok()">
            <option value="">Semua Tujuan</option>
            ${STATUS_KOLEKSI_OPTIONS.map(opt => `<option value="${opt}">${STATUS_KOLEKSI_LABELS[opt] || opt}</option>`).join('')}
          </select>

          <button class="btn btn-secondary btn-sm" onclick="loadLaporanStok()">Filter</button>
          <div style="flex:1;"></div>
          <button class="btn btn-primary btn-sm" onclick="exportStok()">
            📥 Export Excel Stok
          </button>
        </div>

        <div id="lapStokSummaryCards" class="stat-cards-grid"></div>

        <div class="card">
          <div id="lapStokTableContainer"></div>
        </div>
      </div>

      <!-- Tab Content 2: PENJUALAN -->
      <div class="tab-content" id="tabContentPenjualan">
        <div class="filter-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:12px; color:var(--text-secondary);">Dari:</label>
            <input type="date" id="lapJualDari" class="form-control" style="width:160px;" onchange="loadLaporanPenjualan()">
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:12px; color:var(--text-secondary);">Sampai:</label>
            <input type="date" id="lapJualSampai" class="form-control" style="width:160px;" onchange="loadLaporanPenjualan()">
          </div>

          <select id="lapJualPlatform" class="form-select" style="max-width:170px;" onchange="loadLaporanPenjualan()">
            <option value="">Semua Platform</option>
            ${PLATFORM_JUAL_OPTIONS.map(opt => `<option value="${opt}">${PLATFORM_LABELS[opt] || opt}</option>`).join('')}
          </select>

          <button class="btn btn-secondary btn-sm" onclick="loadLaporanPenjualan()">Terapkan</button>
          <div style="flex:1;"></div>
          <button class="btn btn-primary btn-sm" onclick="exportPenjualan()">
            📥 Export Excel Penjualan
          </button>
        </div>

        <div id="lapJualSummaryCards" class="stat-cards-grid"></div>

        <div class="card">
          <div id="lapJualTableContainer"></div>
        </div>
      </div>

      <!-- Tab Content 3: PROFIT & LOSS -->
      <div class="tab-content" id="tabContentProfit">
        <div class="filter-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:12px; color:var(--text-secondary);">Periode Dari:</label>
            <input type="date" id="lapProfitDari" class="form-control" style="width:160px;" onchange="loadLaporanProfit()">
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:12px; color:var(--text-secondary);">Sampai:</label>
            <input type="date" id="lapProfitSampai" class="form-control" style="width:160px;" onchange="loadLaporanProfit()">
          </div>

          <button class="btn btn-secondary btn-sm" onclick="loadLaporanProfit()">Tampilkan</button>
          <div style="flex:1;"></div>
          <button class="btn btn-primary btn-sm" onclick="exportProfit()">
            📥 Export Excel Laba Rugi
          </button>
        </div>

        <div id="lapProfitSummaryCards" class="stat-cards-grid"></div>

        <div class="card">
          <div id="lapProfitTableContainer"></div>
        </div>
      </div>
    </div>
  `;

  // Default dates: first of current month to today
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const jd = document.getElementById('lapJualDari'); if (jd) jd.value = firstDay;
  const js = document.getElementById('lapJualSampai'); if (js) js.value = today;
  const pd = document.getElementById('lapProfitDari'); if (pd) pd.value = firstDay;
  const ps = document.getElementById('lapProfitSampai'); if (ps) ps.value = today;

  // Initial load on active tab
  switchLaporanTab('stok');
}

function switchLaporanTab(tabKey) {
  activeLaporanTab = tabKey;

  // Toggle button classes
  document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  if (tabKey === 'stok') {
    document.getElementById('tabBtnStok')?.classList.add('active');
    document.getElementById('tabContentStok')?.classList.add('active');
    loadLaporanStok();
  } else if (tabKey === 'penjualan') {
    document.getElementById('tabBtnPenjualan')?.classList.add('active');
    document.getElementById('tabContentPenjualan')?.classList.add('active');
    loadLaporanPenjualan();
  } else if (tabKey === 'profit') {
    document.getElementById('tabBtnProfit')?.classList.add('active');
    document.getElementById('tabContentProfit')?.classList.add('active');
    loadLaporanProfit();
  }
}

/**
 * =========================================================================
 * 1. LAPORAN STOK
 * =========================================================================
 */
async function loadLaporanStok() {
  const jenis = document.getElementById('lapStokJenis')?.value || '';
  const statusKoleksi = document.getElementById('lapStokStatusKoleksi')?.value || '';

  renderLoading('lapStokSummaryCards', 'Menghitung nilai stok...');
  renderLoading('lapStokTableContainer', 'Mengambil inventaris stok...');

  const params = new URLSearchParams();
  if (jenis) params.append('jenis', jenis);
  if (statusKoleksi) params.append('status_koleksi', statusKoleksi);

  try {
    const res = await API.get(`/laporan/stok?${params.toString()}`);
    const items = res.items || res.data || (Array.isArray(res) ? res : []);
    const summary = res.summary || {};

    renderLaporanStokSummary(summary, items);
    renderLaporanStokTable(items);
  } catch (err) {
    document.getElementById('lapStokTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat laporan stok: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

function renderLaporanStokSummary(summary, items) {
  const container = document.getElementById('lapStokSummaryCards');
  if (!container) return;

  const totalItem = summary.total_item ?? items.length;
  const totalQty = summary.total_qty ?? summary.total_stok ?? items.reduce((sum, it) => sum + (it.qty_tersisa ?? (it.qty - (it.qty_terjual || 0))), 0);
  const totalNilaiHpp = summary.total_nilai_hpp ?? items.reduce((sum, it) => sum + (it.hpp ?? ((it.qty_tersisa ?? (it.qty - (it.qty_terjual || 0))) * (it.hpp_per_pcs || 0))), 0);
  const totalNilaiStok = summary.total_nilai_stok ?? summary.total_potensi_omzet ?? items.reduce((sum, it) => sum + (it.nilai_stok ?? ((it.qty_tersisa ?? (it.qty - (it.qty_terjual || 0))) * (it.hpp_per_pcs || 0))), 0);

  container.innerHTML = `
    <div class="stat-card stat-card-gold">
      <div class="stat-card-header">
        <span class="stat-card-label">Judul Koleksi</span>
        <div class="stat-card-icon">🗃️</div>
      </div>
      <div class="stat-card-value">${totalItem}</div>
      <div class="stat-card-subtext">Total varian dalam stok</div>
    </div>

    <div class="stat-card stat-card-blue">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Unit Fisik</span>
        <div class="stat-card-icon">🪙</div>
      </div>
      <div class="stat-card-value">${totalQty} <span style="font-size:14px; font-weight:400; color:var(--text-muted);">pcs</span></div>
      <div class="stat-card-subtext">Akumulasi sisa stok siap dijual</div>
    </div>

    <div class="stat-card stat-card-gold">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Nilai HPP Awal</span>
        <div class="stat-card-icon">💼</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalNilaiHpp)}</div>
      <div class="stat-card-subtext">Modal pengadaan awal</div>
    </div>

    <div class="stat-card stat-card-green">
      <div class="stat-card-header">
        <span class="stat-card-label">Nilai Aset Stok Tersisa</span>
        <div class="stat-card-icon">📈</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalNilaiStok)}</div>
      <div class="stat-card-subtext">Modal fisik yang belum terjual</div>
    </div>
  `;
}

function renderLaporanStokTable(items) {
  const container = document.getElementById('lapStokTableContainer');
  if (!container) return;

  if (!items || items.length === 0) {
    renderEmpty('lapStokTableContainer', 'Tidak Ada Stok', 'Tidak ada item stok yang memenuhi filter.');
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nama Item</th>
            <th>Jenis</th>
            <th>Grade</th>
            <th>Tujuan</th>
            <th>Sisa Stok</th>
            <th>HPP/pcs</th>
            <th>Harga Jual/pcs</th>
            <th>Nilai Modal Tersisa</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(it => {
    const sisa = it.qty_tersisa ?? (it.qty - (it.qty_terjual || 0));
    const hppPcs = it.hpp_per_pcs || 0;
    const nilaiStok = it.nilai_stok ?? (sisa * hppPcs);
    const hargaJual = it.harga_jual || hppPcs;

    html += `
      <tr>
        <td>
          <strong style="color:var(--text-primary); font-size:13.5px;">${escapeHtml(it.nama_item)}</strong>
          ${it.tahun ? `<div style="font-size:11px; color:var(--text-muted);">${escapeHtml(it.negara || 'Indonesia')} (${escapeHtml(it.tahun)})</div>` : ''}
        </td>
        <td>${formatJenis(it.jenis)}</td>
        <td>${formatGrade(it.grade)}</td>
        <td>${formatStatusKoleksi(it.status_koleksi)}</td>
        <td><strong style="color:var(--success);">${sisa}</strong> / ${it.qty || sisa} pcs</td>
        <td>${formatRupiah(hppPcs)}</td>
        <td>${formatRupiah(hargaJual)}</td>
        <td style="font-weight:700; color:var(--gold-light);">${formatRupiah(nilaiStok)}</td>
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

/**
 * =========================================================================
 * 2. LAPORAN PENJUALAN
 * =========================================================================
 */
async function loadLaporanPenjualan() {
  const dari = document.getElementById('lapJualDari')?.value || '';
  const sampai = document.getElementById('lapJualSampai')?.value || '';
  const platform = document.getElementById('lapJualPlatform')?.value || '';

  renderLoading('lapJualSummaryCards', 'Menghitung metrik omzet...');
  renderLoading('lapJualTableContainer', 'Mengambil transaksi penjualan...');

  const params = new URLSearchParams();
  if (dari) params.append('tanggal_dari', dari);
  if (sampai) params.append('tanggal_sampai', sampai);
  if (platform) params.append('platform_jual', platform);

  try {
    const res = await API.get(`/laporan/penjualan?${params.toString()}`);
    const items = res.items || res.data || (Array.isArray(res) ? res : []);
    const summary = res.summary || {};

    renderLaporanPenjualanSummary(summary, items);
    renderLaporanPenjualanTable(items);
  } catch (err) {
    document.getElementById('lapJualTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat laporan penjualan: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

function renderLaporanPenjualanSummary(summary, items) {
  const container = document.getElementById('lapJualSummaryCards');
  if (!container) return;

  const totalTransaksi = summary.total_transaksi ?? items.length;
  const totalItemTerjual = summary.total_qty ?? summary.total_item_terjual ?? items.reduce((sum, it) => sum + Number(it.qty_jual || 0), 0);
  const totalOmzet = summary.total_jual ?? summary.total_penjualan ?? items.reduce((sum, it) => sum + (it.total_jual ?? (Number(it.qty_jual) * Number(it.harga_jual_pcs))), 0);
  const totalProfit = summary.total_profit ?? items.reduce((sum, it) => sum + (it.total_profit ?? 0), 0);

  container.innerHTML = `
    <div class="stat-card stat-card-blue">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Transaksi</span>
        <div class="stat-card-icon">🧾</div>
      </div>
      <div class="stat-card-value">${totalTransaksi}</div>
      <div class="stat-card-subtext">Nota transaksi penjualan</div>
    </div>

    <div class="stat-card stat-card-gold">
      <div class="stat-card-header">
        <span class="stat-card-label">Qty Item Terjual</span>
        <div class="stat-card-icon">🪙</div>
      </div>
      <div class="stat-card-value">${totalItemTerjual} <span style="font-size:14px; font-weight:400; color:var(--text-muted);">pcs</span></div>
      <div class="stat-card-subtext">Unit koin/uang yang terdistribusi</div>
    </div>

    <div class="stat-card stat-card-green">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Omzet Penjualan</span>
        <div class="stat-card-icon">💰</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalOmzet)}</div>
      <div class="stat-card-subtext">Penerimaan kotor penjualan</div>
    </div>

    <div class="stat-card stat-card-green">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Laba Penjualan</span>
        <div class="stat-card-icon">💹</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalProfit)}</div>
      <div class="stat-card-subtext">Keuntungan kotor terealisasi</div>
    </div>
  `;
}

function renderLaporanPenjualanTable(items) {
  const container = document.getElementById('lapJualTableContainer');
  if (!container) return;

  if (!items || items.length === 0) {
    renderEmpty('lapJualTableContainer', 'Tidak Ada Penjualan', 'Belum ada transaksi pada rentang tanggal yang dipilih.');
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Kode / Tanggal</th>
            <th>Item Koleksi</th>
            <th>Qty</th>
            <th>Harga Jual/pcs</th>
            <th>HPP/pcs</th>
            <th>Total Omzet</th>
            <th>Profit</th>
            <th>Pembeli</th>
            <th>Platform</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(sale => {
    const totalJual = sale.total_jual !== undefined
      ? sale.total_jual
      : (Number(sale.qty_jual) * Number(sale.harga_jual_pcs));

    const totalProfit = sale.total_profit !== undefined
      ? sale.total_profit
      : (totalJual - (Number(sale.qty_jual) * Number(sale.hpp_pcs || 0)));

    const profitCls = totalProfit >= 0 ? 'positive' : 'negative';

    html += `
      <tr>
        <td>
          <div style="font-weight:700;">${escapeHtml(sale.kode_jual || ('#' + sale.id))}</div>
          <div style="font-size:11px; color:var(--text-muted);">${formatDate(sale.tanggal_jual || sale.created_at)}</div>
        </td>
        <td>
          <strong style="color:var(--text-primary); font-size:13.5px;">${escapeHtml(sale.nama_item || sale.koleksi?.nama_item || 'Item')}</strong>
        </td>
        <td><strong>${sale.qty_jual}</strong> pcs</td>
        <td>${formatRupiah(sale.harga_jual_pcs)}</td>
        <td style="color:var(--text-secondary);">${formatRupiah(sale.hpp_pcs || 0)}</td>
        <td style="font-weight:700; color:var(--text-primary);">${formatRupiah(totalJual)}</td>
        <td>
          <span class="profit-badge ${profitCls}">
            ${totalProfit >= 0 ? '+' : ''}${formatRupiah(totalProfit)}
          </span>
        </td>
        <td>${escapeHtml(sale.pembeli || '-')}</td>
        <td><span class="badge" style="background:rgba(255,255,255,0.06); border:1px solid var(--border);">${PLATFORM_LABELS[sale.platform_jual] || sale.platform_jual || 'Direct'}</span></td>
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

/**
 * =========================================================================
 * 3. LAPORAN PROFIT & LOSS
 * =========================================================================
 */
async function loadLaporanProfit() {
  const dari = document.getElementById('lapProfitDari')?.value || '';
  const sampai = document.getElementById('lapProfitSampai')?.value || '';

  renderLoading('lapProfitSummaryCards', 'Mengkalkulasi laba rugi bersih...');
  renderLoading('lapProfitTableContainer', 'Menyusun buku besar profit...');

  const params = new URLSearchParams();
  if (dari) params.append('tanggal_dari', dari);
  if (sampai) params.append('tanggal_sampai', sampai);

  try {
    const res = await API.get(`/laporan/profit?${params.toString()}`);
    const items = res.items || res.data || (Array.isArray(res) ? res : []);
    const summary = res.summary || {};

    renderLaporanProfitSummary(summary, items);
    renderLaporanProfitTable(items);
  } catch (err) {
    document.getElementById('lapProfitTableContainer').innerHTML = `
      <div class="alert alert-danger" style="display:flex;">
        <span>Gagal memuat laporan laba rugi: ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

function renderLaporanProfitSummary(summary, items) {
  const container = document.getElementById('lapProfitSummaryCards');
  if (!container) return;

  const totalOmzet = summary.total_jual ?? summary.total_penjualan ?? items.reduce((sum, it) => sum + (it.total_jual ?? 0), 0);
  const totalHpp = summary.total_hpp_cost ?? summary.total_hpp ?? items.reduce((sum, it) => sum + (it.total_hpp_cost ?? 0), 0);
  const totalProfit = summary.total_profit ?? (totalOmzet - totalHpp);
  const marginPct = summary.avg_margin ?? (totalOmzet > 0 ? ((totalProfit / totalOmzet) * 100).toFixed(1) : 0);
  const roiPct = totalHpp > 0 ? ((totalProfit / totalHpp) * 100).toFixed(1) : 0;

  const profitCls = totalProfit >= 0 ? 'stat-card-green' : 'stat-card-gold';

  container.innerHTML = `
    <div class="stat-card stat-card-gold">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Pendapatan (Omzet)</span>
        <div class="stat-card-icon">💰</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalOmzet)}</div>
      <div class="stat-card-subtext">Nilai bruto penjualan periode ini</div>
    </div>

    <div class="stat-card stat-card-blue">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Beban Pokok (HPP)</span>
        <div class="stat-card-icon">💼</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalHpp)}</div>
      <div class="stat-card-subtext">Modal item yang telah terjual</div>
    </div>

    <div class="stat-card ${profitCls}">
      <div class="stat-card-header">
        <span class="stat-card-label">Laba Bersih Terealisasi</span>
        <div class="stat-card-icon">💹</div>
      </div>
      <div class="stat-card-value" style="color: ${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${formatRupiah(totalProfit)}
      </div>
      <div class="stat-card-subtext">Laba kotor setelah HPP & ongkir</div>
    </div>

    <div class="stat-card stat-card-green">
      <div class="stat-card-header">
        <span class="stat-card-label">Margin Laba & ROI</span>
        <div class="stat-card-icon">📊</div>
      </div>
      <div class="stat-card-value">${marginPct}% <span style="font-size:13px; font-weight:500; color:var(--text-muted);">Margin</span></div>
      <div class="stat-card-subtext">Return on Investment (ROI): <strong>${roiPct}%</strong></div>
    </div>
  `;
}

function renderLaporanProfitTable(items) {
  const container = document.getElementById('lapProfitTableContainer');
  if (!container) return;

  if (!items || items.length === 0) {
    renderEmpty('lapProfitTableContainer', 'Tidak Ada Data Profit', 'Tidak ada data laba rugi pada filter tanggal ini.');
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Item Koleksi</th>
            <th>Qty Terjual</th>
            <th>Total Omzet</th>
            <th>Total Beban HPP</th>
            <th>Laba / (Rugi) Bersih</th>
            <th>Margin %</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(it => {
    const qty = it.total_qty_jual ?? it.qty_jual ?? 1;
    const totalJual = it.total_jual ?? 0;
    const totalHpp = it.total_hpp_cost ?? it.total_hpp ?? 0;
    const totalProfit = it.total_profit ?? (totalJual - totalHpp);
    const marginPct = it.margin_pct ?? (totalJual > 0 ? ((totalProfit / totalJual) * 100).toFixed(1) : 0);
    const profitCls = totalProfit >= 0 ? 'positive' : 'negative';

    html += `
      <tr>
        <td>
          <strong style="color:var(--text-primary); font-size:13.5px;">${escapeHtml(it.nama_item || 'Item #' + (it.koleksi_id || ''))}</strong>
        </td>
        <td><strong>${qty}</strong> pcs</td>
        <td style="font-weight:600;">${formatRupiah(totalJual)}</td>
        <td style="color:var(--text-secondary);">${formatRupiah(totalHpp)}</td>
        <td>
          <span class="profit-badge ${profitCls}">
            ${totalProfit >= 0 ? '+' : ''}${formatRupiah(totalProfit)}
          </span>
        </td>
        <td style="font-weight:700; color:var(--gold-light);">${marginPct}%</td>
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

/**
 * =========================================================================
 * 4. EXPORT EXCEL HANDLERS
 * =========================================================================
 */
function exportStok() {
  API.download('/laporan/export/stok', 'laporan-stok-numismatik.xlsx');
}

function exportPenjualan() {
  const dari = document.getElementById('lapJualDari')?.value || '';
  const sampai = document.getElementById('lapJualSampai')?.value || '';
  const params = new URLSearchParams();
  if (dari) params.append('tanggal_dari', dari);
  if (sampai) params.append('tanggal_sampai', sampai);

  const url = `/laporan/export/penjualan?${params.toString()}`;
  API.download(url, `laporan-penjualan-${dari || 'all'}-${sampai || 'now'}.xlsx`);
}

function exportProfit() {
  const dari = document.getElementById('lapProfitDari')?.value || '';
  const sampai = document.getElementById('lapProfitSampai')?.value || '';
  const params = new URLSearchParams();
  if (dari) params.append('tanggal_dari', dari);
  if (sampai) params.append('tanggal_sampai', sampai);

  const url = `/laporan/export/profit?${params.toString()}`;
  API.download(url, `laporan-profit-rugi-${dari || 'all'}-${sampai || 'now'}.xlsx`);
}
