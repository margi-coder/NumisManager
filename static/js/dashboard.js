/**
 * NumisManager - Dashboard Overview & Chart Analytics
 */

let chartPenjualanInstance = null;
let chartJenisInstance = null;

async function loadDashboard() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="page-dashboard">
      <div class="stat-cards-grid" id="dashboardStats">
        <!-- Injected via renderStatCards -->
      </div>

      <div class="charts-grid">
        <div class="card chart-card">
          <div class="card-header">
            <span class="card-title">📈 Penjualan per Bulan</span>
            <span class="input-hint">Omzet 12 Bulan Terakhir</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="chartPenjualan"></canvas>
          </div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <span class="card-title">🪙 Distribusi Stok per Jenis</span>
            <span class="input-hint">Kategori Koleksi</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="chartJenis"></canvas>
          </div>
        </div>
      </div>

      <div class="tables-grid">
        <div class="card">
          <div class="section-header">
            <h3>⏳ Pending Items (Pesan & Dikirim)</h3>
            <span class="badge badge-status-pesan" id="pendingCountBadge">0 Item</span>
          </div>
          <div id="pendingTable"></div>
        </div>

        <div class="card" style="overflow: visible;">
          <div class="section-header">
            <h3>✨ Item Koleksi Terbaru</h3>
            <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('koleksi')">Lihat Semua</button>
          </div>
          <div id="recentItems"></div>
        </div>
      </div>
    </div>
  `;

  // Render initial loading placeholders
  renderLoading('dashboardStats', 'Memuat statistik inventaris...');
  renderLoading('pendingTable', 'Memuat pesanan pending...');
  renderLoading('recentItems', 'Memuat item terbaru...');

  try {
    const data = await API.get('/laporan/dashboard');
    renderDashboardStats(data);
    renderDashboardCharts(data);
    renderPendingTable(data.pending_items || []);
    renderRecentItems(data.item_terbaru || []);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    showToast('Gagal memuat data dashboard: ' + err.message, 'error');
    document.getElementById('dashboardStats').innerHTML = `
      <div class="alert alert-danger" style="display:flex; grid-column: 1 / -1;">
        <span>Terjadi kesalahan saat memuat data dashboard. ${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

/**
 * Render 5 Stat Cards
 */
function renderDashboardStats(data) {
  const container = document.getElementById('dashboardStats');
  if (!container) return;

  const totalItem = data.total_item ?? 0;
  const totalStok = data.total_stok ?? 0;
  const totalHpp = data.total_nilai_hpp ?? 0;
  const totalPenjualan = data.total_penjualan ?? 0;
  const totalProfit = data.total_profit ?? 0;

  const profitClass = totalProfit >= 0 ? 'stat-card-green' : 'stat-card-gold';

  container.innerHTML = `
    <!-- Card 1: Total Item -->
    <div class="stat-card stat-card-gold">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Judul Item</span>
        <div class="stat-card-icon">🗂️</div>
      </div>
      <div class="stat-card-value">${Number(totalItem).toLocaleString('id-ID')}</div>
      <div class="stat-card-subtext">Item katalog terdaftar</div>
    </div>

    <!-- Card 2: Total Stok -->
    <div class="stat-card stat-card-blue">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Qty Stok</span>
        <div class="stat-card-icon">🪙</div>
      </div>
      <div class="stat-card-value">${Number(totalStok).toLocaleString('id-ID')} <span style="font-size:14px;font-weight:400;color:var(--text-muted)">pcs</span></div>
      <div class="stat-card-subtext">Jumlah fisik tersedia</div>
    </div>

    <!-- Card 3: Nilai HPP Inventaris -->
    <div class="stat-card stat-card-gold">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Nilai HPP</span>
        <div class="stat-card-icon">💼</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalHpp)}</div>
      <div class="stat-card-subtext">Total modal terkunci</div>
    </div>

    <!-- Card 4: Total Penjualan -->
    <div class="stat-card stat-card-green">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Penjualan</span>
        <div class="stat-card-icon">💰</div>
      </div>
      <div class="stat-card-value">${formatRupiah(totalPenjualan)}</div>
      <div class="stat-card-subtext">Akumulasi omzet penjualan</div>
    </div>

    <!-- Card 5: Total Profit -->
    <div class="stat-card ${profitClass}">
      <div class="stat-card-header">
        <span class="stat-card-label">Total Profit Bersih</span>
        <div class="stat-card-icon">💹</div>
      </div>
      <div class="stat-card-value" style="color: ${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${formatRupiah(totalProfit)}
      </div>
      <div class="stat-card-subtext">Laba terealisasi</div>
    </div>
  `;
}

/**
 * Render Chart.js Analytics
 */
function renderDashboardCharts(data) {
  // Chart 1: Penjualan per Bulan
  const ctxPenjualan = document.getElementById('chartPenjualan');
  if (ctxPenjualan) {
    if (chartPenjualanInstance) chartPenjualanInstance.destroy();

    const monthlyData = data.penjualan_per_bulan || [];
    let labels = [];
    let amounts = [];

    if (Array.isArray(monthlyData) && monthlyData.length > 0) {
      labels = monthlyData.map(m => m.bulan || m.month || 'Bulan');
      amounts = monthlyData.map(m => m.total || m.amount || 0);
    } else {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      amounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    const ctx = ctxPenjualan.getContext('2d');
    const goldGradient = ctx.createLinearGradient(0, 0, 0, 240);
    goldGradient.addColorStop(0, 'rgba(212, 175, 55, 0.85)');
    goldGradient.addColorStop(1, 'rgba(212, 175, 55, 0.15)');

    chartPenjualanInstance = new Chart(ctxPenjualan, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Penjualan',
          data: amounts,
          backgroundColor: goldGradient,
          borderColor: '#d4af37',
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: '#f0c840'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1e28',
            titleColor: '#f0ede6',
            bodyColor: '#d4af37',
            borderColor: 'rgba(212,175,55,0.4)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => 'Penjualan: ' + formatRupiah(context.raw)
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(42, 47, 66, 0.4)' },
            ticks: { color: '#9a9590', font: { family: 'Inter', size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(42, 47, 66, 0.4)' },
            ticks: {
              color: '#9a9590',
              font: { family: 'Inter', size: 11 },
              callback: (val) => 'Rp ' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val.toLocaleString('id-ID'))
            }
          }
        }
      }
    });
  }

  // Chart 2: Stok per Jenis
  const ctxJenis = document.getElementById('chartJenis');
  if (ctxJenis) {
    if (chartJenisInstance) chartJenisInstance.destroy();

    const jenisData = data.stok_per_jenis || {};
    let labels = [];
    let counts = [];

    if (Array.isArray(jenisData)) {
      labels = jenisData.map(j => JENIS_LABELS[j.jenis] || j.jenis || 'Lainnya');
      counts = jenisData.map(j => j.total || j.count || 0);
    } else if (typeof jenisData === 'object' && jenisData !== null) {
      Object.keys(jenisData).forEach(key => {
        labels.push(JENIS_LABELS[key] || key);
        counts.push(jenisData[key]);
      });
    }

    if (labels.length === 0) {
      labels = ['Uang Kertas', 'Koin', 'Polymer'];
      counts = [0, 0, 0];
    }

    const palette = [
      '#d4af37', // Gold
      '#4caf87', // Emerald
      '#5b9cf0', // Sapphire
      '#e8a838', // Amber
      '#9333ea', // Purple
      '#64748b'  // Slate
    ];

    chartJenisInstance = new Chart(ctxJenis, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: '#12151c',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#9a9590',
              padding: 14,
              font: { family: 'Inter', size: 11 },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#1a1e28',
            borderColor: 'rgba(212,175,55,0.4)',
            borderWidth: 1,
            callbacks: {
              label: (context) => ` ${context.label}: ${context.raw} pcs`
            }
          }
        }
      }
    });
  }
}

/**
 * Render Pending Items Table
 */
function renderPendingTable(items) {
  const container = document.getElementById('pendingTable');
  const countBadge = document.getElementById('pendingCountBadge');
  if (countBadge) countBadge.textContent = `${items.length} Item`;

  if (!items || items.length === 0) {
    renderEmpty('pendingTable', 'Tidak Ada Order Pending', 'Semua item pesanan telah diterima dengan baik.');
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Grade</th>
            <th>Status</th>
            <th>HPP/pcs</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.slice(0, 6).forEach(item => {
    html += `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(item.nama_item || item.nama || '-')}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(item.negara || 'Indonesia')} ${item.tahun ? `(${item.tahun})` : ''}</div>
        </td>
        <td>${formatGrade(item.grade)}</td>
        <td>${formatStatus(item.status)}</td>
        <td>${formatRupiah(item.hpp_per_pcs || item.harga_beli)}</td>
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
 * Render Recent Items List
 */
function renderRecentItems(items) {
  const container = document.getElementById('recentItems');
  if (!items || items.length === 0) {
    renderEmpty('recentItems', 'Belum Ada Item', 'Silakan input pembelian atau lot baru.');
    return;
  }

  let html = '<div style="display:flex; flex-direction:column; gap:12px;">';

  items.slice(0, 5).forEach((item, idx) => {
    const fotoObv = item.foto_obv || item.foto_path;
    const fotoRev = item.foto_rev;
    const hasPhoto = Boolean(fotoObv || fotoRev);
    const jenisIco = typeof getJenisIcon === 'function' ? getJenisIcon(item.jenis) : '🪙';

    let photoTooltipHtml = '';
    if (hasPhoto) {
      photoTooltipHtml = `
        <div class="photo-hover-tooltip" style="left: 0; ${idx < 2 ? 'top: calc(100% + 8px); bottom: auto;' : 'bottom: calc(100% + 8px);'}">
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
          <div class="photo-hover-tooltip-title">${escapeHtml(item.nama_item || 'Item')}</div>
        </div>
      `;
    }

    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:rgba(18,21,28,0.6); border:1px solid var(--border); border-radius:var(--radius-md); transition:border-color 0.2s; position:relative;" onmouseover="this.style.borderColor='var(--border-gold)'" onmouseout="this.style.borderColor='var(--border)'">
        <div class="item-name-hover" style="position:relative; flex:1; min-width:0; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="jenis-inline-icon" style="font-size:18px; flex-shrink:0;" title="Jenis: ${escapeHtml(JENIS_LABELS[item.jenis] || item.jenis || '')}">${jenisIco}</span>
            <span style="font-weight:600; color:var(--text-primary); font-size:13.5px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" onclick="showViewItemModal(${item.id})" title="Klik untuk lihat rincian">${escapeHtml(item.nama_item || item.nama || 'Item')}</span>
            ${hasPhoto ? `<span class="photo-indicator" title="Arahkan kursor untuk melihat foto depan/belakang" onclick="showViewItemModal(${item.id})">📷</span>` : ''}
            ${item.kode_item ? `<span class="badge" style="font-size:10px; padding:2px 5px; font-family:monospace; flex-shrink:0;">${escapeHtml(item.kode_item)}</span>` : ''}
          </div>
          <div style="font-size:11.5px; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-top:4px; padding-left:26px;">
            <span>${formatGrade(item.grade)}</span>
            <span>•</span>
            <span>${formatJenis(item.jenis)}</span>
            ${item.tahun ? `<span>• ${escapeHtml(item.tahun)}</span>` : ''}
            ${item.nomor_seri ? `<span style="font-family:monospace; color:var(--gold-light);">• SN: ${escapeHtml(item.nomor_seri)}</span>` : ''}
          </div>
          ${photoTooltipHtml}
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-weight:700; color:var(--gold-light); font-size:13.5px;">${formatRupiah(item.harga_jual || item.hpp_per_pcs)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">HPP: ${formatRupiah(item.hpp_per_pcs)}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
