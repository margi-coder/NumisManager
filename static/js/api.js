/**
 * NumisManager - API Client, Utilities, & UI Helpers
 */

// Dropdown & Option Constants
const GRADE_OPTIONS = ['UNC', 'AUNC', 'XF+', 'XF', 'XF-', 'AXF', 'VF+', 'VF', 'VF-', 'AVF', 'F', 'VG', 'G', 'AG', 'POOR', '-'];
const JENIS_OPTIONS = ['uang_kertas', 'uang_polymer', 'uang_hybrid', 'koin', 'dokumen', 'perlengkapan'];
const PEROLEHAN_OPTIONS = ['lelang_fb', 'lelang_platform', 'jual_pribadi', 'marketplace'];
const STATUS_OPTIONS = ['pesan', 'dikirim', 'terima'];
const STATUS_KOLEKSI_OPTIONS = ['koleksi_pribadi', 'stock_jual'];
const PLATFORM_JUAL_OPTIONS = ['tokopedia', 'shopee', 'facebook', 'whatsapp', 'instagram', 'tatacoin', 'direct', 'other'];

// Human-friendly label dictionaries
const JENIS_LABELS = {
  'uang_kertas': 'Uang Kertas',
  'uang_polymer': 'Uang Polymer',
  'uang_hybrid': 'Uang Hybrid',
  'koin': 'Koin',
  'dokumen': 'Dokumen',
  'perlengkapan': 'Perlengkapan'
};

const STATUS_LABELS = {
  'pesan': 'Pesan',
  'dikirim': 'Dikirim',
  'terima': 'Diterima'
};

const STATUS_KOLEKSI_LABELS = {
  'koleksi_pribadi': 'Koleksi Pribadi',
  'stock_jual': 'Stock Jual'
};

const JENIS_ICONS = {
  'uang_kertas': '💵',
  'uang_polymer': '💳',
  'uang_hybrid': '📑',
  'koin': '🪙',
  'dokumen': '📜',
  'perlengkapan': '🧰'
};

const STATUS_ICONS = {
  'pesan': '⏳',
  'dikirim': '🚚',
  'terima': '✅'
};

const STATUS_KOLEKSI_ICONS = {
  'koleksi_pribadi': '🔒',
  'stock_jual': '💰'
};

function getJenisIcon(jenis) {
  return JENIS_ICONS[jenis] || '🪙';
}

const PEROLEHAN_LABELS = {
  'lelang_fb': 'Lelang Facebook',
  'lelang_platform': 'Lelang Platform',
  'jual_pribadi': 'Jual Pribadi',
  'marketplace': 'Marketplace'
};

const PLATFORM_LABELS = {
  'tokopedia': 'Tokopedia',
  'shopee': 'Shopee',
  'facebook': 'Facebook',
  'whatsapp': 'WhatsApp',
  'instagram': 'Instagram',
  'tatacoin': 'TataCoin',
  'direct': 'Direct / Langsung',
  'other': 'Lainnya'
};

// API Helper
const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('numis_token');
  },

  setToken(t) {
    localStorage.setItem('numis_token', t);
  },

  removeToken() {
    localStorage.removeItem('numis_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('numis_user') || 'null');
    } catch (e) {
      return null;
    }
  },

  setUser(u) {
    localStorage.setItem('numis_user', JSON.stringify(u));
  },

  removeUser() {
    localStorage.removeItem('numis_user');
  },

  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers };
    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(this.baseUrl + path, options);
      if (res.status === 401) {
        this.logout();
        return;
      }

      // Handle 204 No Content
      if (res.status === 204) {
        return { success: true };
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = data.detail || (Array.isArray(data) && data[0]?.msg) || 'Terjadi kesalahan sistem';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        throw new Error('Koneksi ke server gagal. Pastikan backend aktif.');
      }
      throw err;
    }
  },

  get(path) {
    return this.request('GET', path);
  },

  post(path, body) {
    return this.request('POST', path, body);
  },

  put(path, body) {
    return this.request('PUT', path, body);
  },

  delete(path) {
    return this.request('DELETE', path);
  },

  upload(path, formData) {
    return this.request('POST', path, formData, true);
  },

  logout() {
    this.removeToken();
    this.removeUser();
    window.location.href = '/';
  },

  async download(path, filename) {
    const token = this.getToken();
    showToast('Menyiapkan berkas unduhan...', 'info', 2000);
    try {
      const res = await fetch(this.baseUrl + path, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        this.logout();
        return;
      }
      if (!res.ok) {
        throw new Error('Gagal mengunduh file.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'numismatik-export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Unduhan berhasil!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh: ' + err.message, 'error');
    }
  }
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 15);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Currency & Date Formatters
 */
function formatRupiah(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
  return 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID');
}

function formatDate(d) {
  if (!d) return '-';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return String(d);
  }
}

function formatDateTime(d) {
  if (!d) return '-';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return String(d);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Badges Generators
 */
function formatGrade(grade) {
  if (!grade || grade === '-') {
    return `<span class="badge badge-grade-default">-</span>`;
  }
  const clean = String(grade).toUpperCase().trim();
  const classMap = {
    'UNC': 'badge-grade-unc',
    'AUNC': 'badge-grade-aunc',
    'XF+': 'badge-grade-xf-plus',
    'XF': 'badge-grade-xf',
    'XF-': 'badge-grade-xf-minus',
    'AXF': 'badge-grade-axf',
    'VF+': 'badge-grade-vf-plus',
    'VF': 'badge-grade-vf',
    'VF-': 'badge-grade-vf-minus',
    'AVF': 'badge-grade-avf',
    'F': 'badge-grade-f',
    'VG': 'badge-grade-vg',
    'G': 'badge-grade-g',
    'AG': 'badge-grade-ag',
    'POOR': 'badge-grade-poor'
  };
  const cls = classMap[clean] || 'badge-grade-default';
  return `<span class="badge ${cls}">${clean}</span>`;
}

function formatGroupItem(groupName) {
  if (!groupName) return `<span class="badge badge-grade-default">-</span>`;
  return `<span class="badge badge-group">🗂️ ${escapeHtml(groupName)}</span>`;
}

function formatStatus(status) {
  if (!status) return `<span class="badge badge-grade-default">-</span>`;
  const clean = String(status).toLowerCase();
  const cls = `badge-status-${clean}`;
  const label = STATUS_LABELS[clean] || clean;
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatJenis(jenis) {
  if (!jenis) return `<span class="badge badge-grade-default">-</span>`;
  const clean = String(jenis).toLowerCase();
  const cls = `badge-jenis-${clean}`;
  const label = JENIS_LABELS[clean] || clean;
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatStatusKoleksi(status) {
  if (!status) return `<span class="badge badge-grade-default">-</span>`;
  const clean = String(status).toLowerCase();
  const cls = `badge-koleksi-${clean}`;
  const label = STATUS_KOLEKSI_LABELS[clean] || clean;
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatStatusIconOnly(status) {
  const clean = String(status || 'pesan').toLowerCase();
  const icon = STATUS_ICONS[clean] || '⏳';
  const label = STATUS_LABELS[clean] || clean;
  return `<span class="badge-icon-only badge-status-${clean}" title="Status: ${label}">${icon}</span>`;
}

function formatTujuanIconOnly(statusKoleksi) {
  const clean = String(statusKoleksi || 'stock_jual').toLowerCase();
  const icon = STATUS_KOLEKSI_ICONS[clean] || '💰';
  const label = STATUS_KOLEKSI_LABELS[clean] || clean;
  return `<span class="badge-icon-only badge-koleksi-${clean}" title="Tujuan: ${label}">${icon}</span>`;
}

/**
 * Modal Dialog Helper
 */
function openModal({ title, body, footer = '', size = 'md' }) {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');

  container.className = `modal-container modal-${size}`;
  container.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button type="button" class="modal-close-btn" onclick="closeModal()" title="Tutup">&times;</button>
    </div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  `;

  overlay.classList.remove('hidden');

  // Handle ESC key
  window.addEventListener('keydown', handleModalEsc);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    const container = document.getElementById('modalContainer');
    if (container) {
      container.innerHTML = '';
      container.className = 'modal-container';
    }
  }
  window.removeEventListener('keydown', handleModalEsc);
}

function handleModalEsc(e) {
  if (e.key === 'Escape') {
    const lightbox = document.getElementById('globalImageLightbox');
    if (lightbox && lightbox.classList.contains('active')) {
      closeGlobalLightbox();
      return;
    }
    closeModal();
  }
}

// Close when clicking modal backdrop
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }
});

/**
 * Pagination Renderer Helper
 */
function renderPagination(containerId, currentPage, total, limit, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const totalPages = Math.ceil(total / limit) || 1;
  if (totalPages <= 1) {
    container.innerHTML = `<div class="pagination"><span class="page-info">Total: ${total} data</span></div>`;
    return;
  }

  let html = '<div class="pagination">';
  html += `<button type="button" onclick="${onPageChange}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹ Prev</button>`;

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }

  for (let i = start; i <= end; i++) {
    html += `<button type="button" class="${i === currentPage ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
  }

  html += `<button type="button" onclick="${onPageChange}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next ›</button>`;
  html += `<span class="page-info">Halaman ${currentPage} dari ${totalPages} (${total} total)</span>`;
  html += '</div>';

  container.innerHTML = html;
}

/**
 * Loading & Empty State Helpers
 */
function renderLoading(containerId, message = 'Memuat data...') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="spinner-container">
      <div class="loading-spinner"></div>
      <span class="spinner-text">${escapeHtml(message)}</span>
    </div>
  `;
}

function renderEmpty(containerId, title = 'Tidak Ada Data', desc = 'Belum ada data yang tersimpan.', actionBtn = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🪙</div>
      <div class="empty-state-title">${escapeHtml(title)}</div>
      <div class="empty-state-desc">${escapeHtml(desc)}</div>
      ${actionBtn}
    </div>
  `;
}

/**
 * Global Image Lightbox (Overlay on top of any modal without destroying modal state)
 */
function openGlobalLightbox(url, title = 'Preview Gambar') {
  if (!url) return;
  let lightbox = document.getElementById('globalImageLightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'globalImageLightbox';
    lightbox.className = 'global-image-lightbox';
    document.body.appendChild(lightbox);
  }

  lightbox.innerHTML = `
    <div class="lightbox-backdrop" onclick="closeGlobalLightbox()"></div>
    <div class="lightbox-content">
      <div class="lightbox-header">
        <div class="lightbox-title">🔍 ${escapeHtml(title)}</div>
        <button type="button" class="lightbox-close-btn" onclick="closeGlobalLightbox()" title="Tutup Preview (Esc)">&times;</button>
      </div>
      <div class="lightbox-image-wrap">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" class="lightbox-img" onerror="this.onerror=null; this.src='/static/img/logo.png';">
      </div>
    </div>
  `;
  lightbox.classList.add('active');
  window.addEventListener('keydown', handleModalEsc);
}

function closeGlobalLightbox() {
  const lightbox = document.getElementById('globalImageLightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    lightbox.innerHTML = '';
  }
}

// Global fallback alias for viewImageLightbox
function viewImageLightbox(url, title = 'Preview Item') {
  openGlobalLightbox(url, title);
}

/**
 * Debounce helper for live search and live filtering
 */
function debounce(fn, delay = 280) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Group Item Master Data Cache and Helper
 */
let _groupItemCache = null;

async function getGroupItemOptions(forceRefresh = false) {
  if (!_groupItemCache || forceRefresh) {
    try {
      _groupItemCache = await API.get('/group-item');
    } catch (e) {
      console.error('Failed to load group items:', e);
      _groupItemCache = [];
    }
  }
  return _groupItemCache;
}

function clearGroupItemCache() {
  _groupItemCache = null;
}

async function loadGroupItemsIntoDropdown(dropdownId, selectedId = null, defaultLabel = '-- Tanpa Group --') {
  const select = document.getElementById(dropdownId);
  if (!select) return;

  try {
    const list = await getGroupItemOptions();
    let html = `<option value="">${escapeHtml(defaultLabel)}</option>`;
    list.forEach(g => {
      const isSel = selectedId && Number(selectedId) === Number(g.id) ? 'selected' : '';
      html += `<option value="${g.id}" ${isSel}>${escapeHtml(g.nama_group)}</option>`;
    });
    select.innerHTML = html;
  } catch (err) {
    console.error('Failed to load group items into dropdown:', err);
  }
}



