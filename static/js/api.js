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
let _lightboxGalleryState = {
  items: [],
  currentIndex: 0,
  isFullscreen: false
};

function openGlobalLightbox(url, title = 'Preview Gambar', galleryItems = null, startIndex = 0, autoFullscreen = false) {
  if (!url && (!galleryItems || !galleryItems.length)) return;
  let lightbox = document.getElementById('globalImageLightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'globalImageLightbox';
    lightbox.className = 'global-image-lightbox';
    document.body.appendChild(lightbox);
  }

  if (Array.isArray(galleryItems) && galleryItems.length > 0) {
    _lightboxGalleryState.items = galleryItems;
    _lightboxGalleryState.currentIndex = Math.max(0, Math.min(startIndex, galleryItems.length - 1));
  } else {
    _lightboxGalleryState.items = [{ url, title, tag: title }];
    _lightboxGalleryState.currentIndex = 0;
  }

  _lightboxGalleryState.isFullscreen = Boolean(autoFullscreen);
  lightbox.classList.toggle('is-fullscreen', _lightboxGalleryState.isFullscreen);

  renderGlobalLightboxContent();
  lightbox.classList.add('active');
  window.addEventListener('keydown', handleModalEsc);
  window.addEventListener('keydown', handleLightboxKeyNav);

  if (autoFullscreen && lightbox.requestFullscreen && !document.fullscreenElement) {
    lightbox.requestFullscreen().catch(() => {});
  }
}

function renderGlobalLightboxContent() {
  const lightbox = document.getElementById('globalImageLightbox');
  if (!lightbox) return;
  const items = _lightboxGalleryState.items || [];
  if (!items.length) return;
  const idx = _lightboxGalleryState.currentIndex;
  const current = items[idx] || items[0];
  const hasMultiple = items.length > 1;
  const isFs = _lightboxGalleryState.isFullscreen || Boolean(document.fullscreenElement);

  lightbox.innerHTML = `
    <div class="lightbox-backdrop" onclick="closeGlobalLightbox()"></div>
    <div class="lightbox-content">
      <div class="lightbox-header" style="gap:12px;">
        <div class="lightbox-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span>🔍 ${escapeHtml(current.title || 'Preview Gambar')}</span>
          ${hasMultiple ? `<span class="badge" style="background:rgba(212,175,55,0.2); color:var(--gold-light); border:1px solid var(--border-gold); font-size:11px;">Foto ${idx + 1} / ${items.length} (Gunakan tombol ◀ ▶ atau Panah Keyboard)</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <button type="button" class="photo-mini-btn" onclick="event.stopPropagation(); toggleLightboxFullscreen()" title="Tampilan Layar Penuh / Fullscreen (Tombol F)">
            ${isFs ? '🗗 Keluar Fullscreen' : '⛶ Fullscreen'}
          </button>
          <button type="button" class="lightbox-close-btn" onclick="closeGlobalLightbox()" title="Tutup Preview (Esc)">&times;</button>
        </div>
      </div>
      <div class="lightbox-image-wrap">
        ${hasMultiple ? `
          <button type="button" class="lightbox-nav-btn prev" onclick="event.stopPropagation(); navigateGlobalLightbox(-1)" title="Foto Sebelumnya (Panah Kiri ←)">&#10094;</button>
        ` : ''}
        <img src="${escapeHtml(current.url)}" alt="${escapeHtml(current.title || '')}" class="lightbox-img" ondblclick="toggleLightboxFullscreen()" title="Klik ganda (Double-click) untuk Fullscreen" onerror="this.onerror=null; this.src='/static/img/logo.png';">
        ${hasMultiple ? `
          <button type="button" class="lightbox-nav-btn next" onclick="event.stopPropagation(); navigateGlobalLightbox(1)" title="Foto Berikutnya (Panah Kanan →)">&#10095;</button>
        ` : ''}
      </div>
      ${hasMultiple ? `
        <div class="lightbox-footer-thumbs">
          <div class="lightbox-thumb-strip">
            ${items.map((it, i) => `
              <div class="lightbox-thumb-item ${i === idx ? 'active' : ''}" onclick="event.stopPropagation(); selectGlobalLightboxIndex(${i})" title="${escapeHtml(it.tag || it.title || ('Foto ' + (i + 1)))}">
                <img src="${escapeHtml(it.url)}" alt="${escapeHtml(it.tag || '')}" onerror="this.onerror=null; this.src='/static/img/logo.png';">
                <div class="lightbox-thumb-label">${escapeHtml(it.tag || ('Foto ' + (i + 1)))}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function toggleLightboxFullscreen() {
  const lightbox = document.getElementById('globalImageLightbox');
  if (!lightbox) return;
  const nextFs = !(_lightboxGalleryState.isFullscreen || Boolean(document.fullscreenElement));
  _lightboxGalleryState.isFullscreen = nextFs;
  lightbox.classList.toggle('is-fullscreen', nextFs);

  if (nextFs) {
    if (lightbox.requestFullscreen && !document.fullscreenElement) {
      lightbox.requestFullscreen().catch(() => {});
    }
  } else {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
  renderGlobalLightboxContent();
}

document.addEventListener('fullscreenchange', () => {
  const lightbox = document.getElementById('globalImageLightbox');
  if (!lightbox || !lightbox.classList.contains('active')) return;
  const isBrowserFs = Boolean(document.fullscreenElement);
  if (!isBrowserFs && _lightboxGalleryState.isFullscreen) {
    _lightboxGalleryState.isFullscreen = false;
    lightbox.classList.remove('is-fullscreen');
    renderGlobalLightboxContent();
  }
});

function navigateGlobalLightbox(step) {
  const items = _lightboxGalleryState.items || [];
  if (items.length <= 1) return;
  _lightboxGalleryState.currentIndex = (_lightboxGalleryState.currentIndex + step + items.length) % items.length;
  renderGlobalLightboxContent();
  if (typeof window._syncDetailPhotoFromLightbox === 'function') {
    window._syncDetailPhotoFromLightbox(_lightboxGalleryState.currentIndex);
  }
}

function selectGlobalLightboxIndex(index) {
  const items = _lightboxGalleryState.items || [];
  if (index < 0 || index >= items.length) return;
  _lightboxGalleryState.currentIndex = index;
  renderGlobalLightboxContent();
  if (typeof window._syncDetailPhotoFromLightbox === 'function') {
    window._syncDetailPhotoFromLightbox(index);
  }
}

function handleLightboxKeyNav(e) {
  const lightbox = document.getElementById('globalImageLightbox');
  if (!lightbox || !lightbox.classList.contains('active')) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    e.stopPropagation();
    navigateGlobalLightbox(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    navigateGlobalLightbox(1);
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    e.stopPropagation();
    toggleLightboxFullscreen();
  }
}

function closeGlobalLightbox() {
  const lightbox = document.getElementById('globalImageLightbox');
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  _lightboxGalleryState.isFullscreen = false;
  if (lightbox) {
    lightbox.classList.remove('active', 'is-fullscreen');
    lightbox.innerHTML = '';
  }
  window.removeEventListener('keydown', handleLightboxKeyNav);
}

// Global fallback alias for viewImageLightbox
function viewImageLightbox(url, title = 'Preview Item', galleryItems = null, startIndex = 0, autoFullscreen = false) {
  openGlobalLightbox(url, title, galleryItems, startIndex, autoFullscreen);
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




/**
 * =========================================================================
 * SMART PHOTO MANAGER (OBV, REV, & GAMBAR PENDUKUNG)
 * Mendukung:
 * 1. Drag & Drop dari Windows Explorer (1 atau banyak file)
 * 2. Drag & Drop gambar langsung dari website lain
 * 3. Copy-Paste (Ctrl+V / Tombol Paste) dari:
 *    - Klik kanan "Copy image" di Browser (Facebook, Tokopedia, Google, dll.)
 *    - Windows Snipping Tool (Win+Shift+S)
 *    - Aplikasi MS Paint / Editor Gambar
 *    - Copy file gambar dari Windows Explorer (Ctrl+C -> Ctrl+V)
 *    - Copy alamat URL gambar (Copy image address)
 * =========================================================================
 */
const SUPPORTING_PHOTO_LABELS = [
  { value: 'detail', label: '🔍 Detail Fitur / Cetakan' },
  { value: 'watermark', label: '💧 Tanda Air (Watermark)' },
  { value: 'slab', label: '🏛️ Slab / Holder Grading' },
  { value: 'benang_pengaman', label: '🧵 Benang Pengaman' },
  { value: 'cacat_variasi', label: '⚠️ Variasi / Error' },
  { value: 'sertifikat', label: '📄 Sertifikat / Bukti' },
  { value: 'lainnya', label: '📸 Gambar Pendukung Lainnya' }
];

const SmartPhotoManager = {
  contexts: {},
  activeTarget: null, // { prefix, slot: 'obv' | 'rev' | 'support' }
  _uidCounter: 1,

  createEmptyContext(prefix, opts = {}) {
    this.contexts[prefix] = {
      prefix,
      koleksiId: opts.koleksiId || null,
      obvFile: null,
      revFile: null,
      initialObvUrl: opts.initialObvUrl || '',
      initialRevUrl: opts.initialRevUrl || '',
      existingGallery: Array.isArray(opts.existingGallery) ? [...opts.existingGallery] : [],
      supportingQueue: [], // [{ uid, file, previewUrl, label, catatan }]
      onSingleChange: opts.onSingleChange || null,
      onSupportChange: opts.onSupportChange || null
    };
    return this.contexts[prefix];
  },

  getContext(prefix) {
    if (!this.contexts[prefix]) {
      this.createEmptyContext(prefix);
    }
    return this.contexts[prefix];
  },

  getObvFile(prefix) {
    return this.contexts[prefix]?.obvFile || null;
  },

  getRevFile(prefix) {
    return this.contexts[prefix]?.revFile || null;
  },

  getSupportingQueue(prefix) {
    return this.contexts[prefix]?.supportingQueue || [];
  },

  renderSection(prefix, opts = {}) {
    const obvUrl = opts.initialObvUrl || '';
    const revUrl = opts.initialRevUrl || '';
    const showSupporting = opts.showSupporting !== false;

    return `
      <div class="smart-photo-section" id="${prefix}SmartPhotoSection" data-photo-prefix="${prefix}">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
          <label class="form-label" style="margin-bottom:0;">
            📸 Foto Item (Obverse, Reverse${showSupporting ? ' &amp; Gambar Pendukung' : ''})
          </label>
          <span style="font-size:11px; color:var(--gold-light); background:rgba(212,175,55,0.1); border:1px solid var(--border-gold); padding:2px 8px; border-radius:99px;">
            💡 Bisa Drag &amp; Drop Explorer, atau Copy-Paste (Ctrl+V) dari Browser / Snipping Tool / Paint / Explorer
          </span>
        </div>

        <div class="dual-photo-grid" style="margin-bottom:${showSupporting ? '12px' : '4px'};">
          <!-- OBVERSE BOX -->
          <div class="photo-box-card ${obvUrl ? 'has-image' : ''}" id="${prefix}ObvZone" tabindex="0"
               onclick="SmartPhotoManager.setActiveTarget('${prefix}', 'obv')"
               ondblclick="document.getElementById('${prefix}ObvInput').click()"
               onmouseenter="SmartPhotoManager.setActiveTarget('${prefix}', 'obv', true)"
               title="Klik untuk mengaktifkan target Ctrl+V, atau Drag & Drop gambar ke sini">
            <span class="photo-paste-badge" id="${prefix}ObvBadge">Ctrl+V / Drop</span>
            <input type="file" id="${prefix}ObvInput" accept="image/*" style="display:none"
                   onchange="SmartPhotoManager.handleInputSelect('${prefix}', 'obv', event)">
            <div id="${prefix}ObvPrompt" style="${obvUrl ? 'display:none;' : ''}">
              <div style="font-size:26px; margin-bottom:3px;">🪙</div>
              <div style="font-weight:700; font-size:12.5px; color:var(--text-primary);">Tampak Depan (OBV)</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Drag &amp; Drop atau tekan <strong>Ctrl+V</strong></div>
            </div>
            <img id="${prefix}ObvPreview" class="photo-box-preview" src="${obvUrl ? escapeHtml(obvUrl) : ''}"
                 style="${obvUrl ? 'display:block;' : 'display:none;'}" alt="Preview Obverse">
            <div class="photo-box-label">📸 Obverse (Muka)</div>
            <div class="photo-box-actions" onclick="event.stopPropagation()">
              <button type="button" class="photo-mini-btn" onclick="document.getElementById('${prefix}ObvInput').click()" title="Pilih file gambar dari komputer">
                📁 Pilih File
              </button>
              <button type="button" class="photo-mini-btn" onclick="SmartPhotoManager.pasteFromClipboardButton('${prefix}', 'obv')" title="Tempel (Paste) gambar dari Clipboard (Browser / Snipping Tool / Paint)">
                📋 Paste
              </button>
              <button type="button" class="photo-mini-btn btn-clear-photo" id="${prefix}ObvClearBtn"
                      style="${obvUrl ? 'display:inline-flex;' : 'display:none;'}"
                      onclick="SmartPhotoManager.clearSlot('${prefix}', 'obv')" title="Reset / Hapus pilihan foto OBV">
                🗑️
              </button>
            </div>
          </div>

          <!-- REVERSE BOX -->
          <div class="photo-box-card ${revUrl ? 'has-image' : ''}" id="${prefix}RevZone" tabindex="0"
               onclick="SmartPhotoManager.setActiveTarget('${prefix}', 'rev')"
               ondblclick="document.getElementById('${prefix}RevInput').click()"
               onmouseenter="SmartPhotoManager.setActiveTarget('${prefix}', 'rev', true)"
               title="Klik untuk mengaktifkan target Ctrl+V, atau Drag & Drop gambar ke sini">
            <span class="photo-paste-badge" id="${prefix}RevBadge">Ctrl+V / Drop</span>
            <input type="file" id="${prefix}RevInput" accept="image/*" style="display:none"
                   onchange="SmartPhotoManager.handleInputSelect('${prefix}', 'rev', event)">
            <div id="${prefix}RevPrompt" style="${revUrl ? 'display:none;' : ''}">
              <div style="font-size:26px; margin-bottom:3px;">🪙</div>
              <div style="font-weight:700; font-size:12.5px; color:var(--text-primary);">Tampak Belakang (REV)</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Drag &amp; Drop atau tekan <strong>Ctrl+V</strong></div>
            </div>
            <img id="${prefix}RevPreview" class="photo-box-preview" src="${revUrl ? escapeHtml(revUrl) : ''}"
                 style="${revUrl ? 'display:none;' : 'display:none;'}" alt="Preview Reverse">
            <div class="photo-box-label">📸 Reverse (Belakang)</div>
            <div class="photo-box-actions" onclick="event.stopPropagation()">
              <button type="button" class="photo-mini-btn" onclick="document.getElementById('${prefix}RevInput').click()" title="Pilih file gambar dari komputer">
                📁 Pilih File
              </button>
              <button type="button" class="photo-mini-btn" onclick="SmartPhotoManager.pasteFromClipboardButton('${prefix}', 'rev')" title="Tempel (Paste) gambar dari Clipboard (Browser / Snipping Tool / Paint)">
                📋 Paste
              </button>
              <button type="button" class="photo-mini-btn btn-clear-photo" id="${prefix}RevClearBtn"
                      style="${revUrl ? 'display:inline-flex;' : 'display:none;'}"
                      onclick="SmartPhotoManager.clearSlot('${prefix}', 'rev')" title="Reset / Hapus pilihan foto REV">
                🗑️
              </button>
            </div>
          </div>
        </div>

        ${showSupporting ? `
          <!-- SUPPORTING / GALLERY PHOTOS DROPZONE -->
          <div class="supporting-drop-zone" id="${prefix}SupportZone" tabindex="0"
               onclick="SmartPhotoManager.setActiveTarget('${prefix}', 'support')"
               ondblclick="document.getElementById('${prefix}SupportInput').click()"
               onmouseenter="SmartPhotoManager.setActiveTarget('${prefix}', 'support', true)"
               title="Tarik & lepas (Drag & Drop) gambar pendukung ke sini, atau tekan Ctrl+V">
            <span class="photo-paste-badge" id="${prefix}SupportBadge">Ctrl+V / Drop Multi</span>
            <input type="file" id="${prefix}SupportInput" accept="image/*" multiple style="display:none"
                   onchange="SmartPhotoManager.handleInputSelect('${prefix}', 'support', event)">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                <span style="font-size:24px;">🖼️</span>
                <div>
                  <div style="font-weight:700; font-size:12.5px; color:var(--gold-light);">
                    Gambar Pendukung / Dokumentasi Tambahan (Multi-Foto)
                  </div>
                  <div style="font-size:11px; color:var(--text-muted);">
                    Drag &amp; Drop gambar dari Explorer / Website, atau tekan <strong>Ctrl+V</strong> untuk menambah gambar pendukung (Watermark, Slab, Detail, dll.)
                  </div>
                </div>
              </div>
              <div class="photo-box-actions" style="margin-top:0;" onclick="event.stopPropagation()">
                <button type="button" class="photo-mini-btn" onclick="document.getElementById('${prefix}SupportInput').click()">
                  📁 + Pilih Gambar
                </button>
                <button type="button" class="photo-mini-btn" onclick="SmartPhotoManager.pasteFromClipboardButton('${prefix}', 'support')">
                  📋 + Paste Gambar
                </button>
              </div>
            </div>
          </div>

          <!-- Existing Saved Supporting Photos (for Edit Modals) -->
          <div id="${prefix}ExistingSupportContainer" style="display:none; margin-top:10px;"></div>

          <!-- Newly Queued Supporting Photos -->
          <div id="${prefix}SupportQueueContainer" style="display:none; margin-top:10px;"></div>
        ` : ''}
      </div>
    `;
  },

  initContext(prefix, opts = {}) {
    const ctx = this.createEmptyContext(prefix, opts);

    // Fix initial REV preview display if initialRevUrl exists
    const revPrev = document.getElementById(`${prefix}RevPreview`);
    if (revPrev && ctx.initialRevUrl) {
      revPrev.style.display = 'block';
    }

    // Bind drag & drop events to OBV, REV, and SUPPORT zones
    ['obv', 'rev', 'support'].forEach(slot => {
      const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
      const zone = document.getElementById(`${prefix}${cap}Zone`);
      if (!zone) return;

      zone.addEventListener('dragenter', e => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
        this.setActiveTarget(prefix, slot);
      });

      zone.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
        }
      });

      zone.addEventListener('drop', async e => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
        this.setActiveTarget(prefix, slot);
        await this.processEventDataTransfer(prefix, slot, e.dataTransfer);
      });
    });

    this.renderExistingGallery(prefix);
    this.renderSupportingQueue(prefix);

    // Default active target to OBV if empty, else REV if empty, else support
    if (!ctx.initialObvUrl) {
      this.setActiveTarget(prefix, 'obv', true);
    } else if (!ctx.initialRevUrl) {
      this.setActiveTarget(prefix, 'rev', true);
    } else {
      this.setActiveTarget(prefix, 'support', true);
    }
  },

  setActiveTarget(prefix, slot, silent = false) {
    this.activeTarget = { prefix, slot };

    // Update visual highlights across all zones
    document.querySelectorAll('.photo-box-card, .supporting-drop-zone').forEach(el => {
      el.classList.remove('paste-target-active');
    });
    document.querySelectorAll('.photo-paste-badge').forEach(b => {
      b.textContent = b.id.endsWith('SupportBadge') ? 'Ctrl+V / Drop Multi' : 'Ctrl+V / Drop';
    });

    const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
    const zone = document.getElementById(`${prefix}${cap}Zone`);
    const badge = document.getElementById(`${prefix}${cap}Badge`);
    if (zone) zone.classList.add('paste-target-active');
    if (badge) badge.textContent = '✨ Siap Ctrl+V';
  },

  handleInputSelect(prefix, slot, event) {
    const files = event.target?.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      this.applyFilesToSlot(prefix, slot, files);
    }
    if (event.target) event.target.value = '';
  },

  applyFilesToSlot(prefix, slot, files) {
    const ctx = this.getContext(prefix);
    if (!files || files.length === 0) return;

    if (slot === 'obv') {
      this.setSingleSlotFile(prefix, 'obv', files[0]);
      // Jika pengguna drop/paste lebih dari 1 file sekaligus ke OBV:
      // file ke-2 otomatis masuk ke REV (bila REV kosong), sisanya ke Gambar Pendukung!
      if (files.length >= 2) {
        if (!ctx.revFile && !ctx.initialRevUrl) {
          this.setSingleSlotFile(prefix, 'rev', files[1]);
          if (files.length > 2) {
            this.addFilesToSupporting(prefix, files.slice(2));
          }
        } else {
          this.addFilesToSupporting(prefix, files.slice(1));
        }
      } else {
        // Pindahkan target aktif otomatis ke slot berikutnya yang masih kosong
        if (!ctx.revFile && !ctx.initialRevUrl) {
          this.setActiveTarget(prefix, 'rev', true);
        } else if (document.getElementById(`${prefix}SupportZone`)) {
          this.setActiveTarget(prefix, 'support', true);
        }
      }
    } else if (slot === 'rev') {
      this.setSingleSlotFile(prefix, 'rev', files[0]);
      if (files.length > 1) {
        this.addFilesToSupporting(prefix, files.slice(1));
      } else if (document.getElementById(`${prefix}SupportZone`)) {
        this.setActiveTarget(prefix, 'support', true);
      }
    } else {
      this.addFilesToSupporting(prefix, files);
    }
  },

  setSingleSlotFile(prefix, slot, file) {
    const ctx = this.getContext(prefix);
    const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
    if (slot === 'obv') {
      ctx.obvFile = file;
      // Sinkronkan juga ke variabel global lama agar kompatibel penuh
      if (prefix === 'sp' && typeof window !== 'undefined') window.singlePhotoObvFile = file;
      if (prefix === 'bai' && typeof window !== 'undefined') window.batchAddObvFile = file;
      if (prefix === 'bei' && typeof window !== 'undefined') window.batchEditObvFile = file;
      if (prefix === 'modal' && typeof window !== 'undefined') window.uploadObvFileHolder = file;
    } else {
      ctx.revFile = file;
      if (prefix === 'sp' && typeof window !== 'undefined') window.singlePhotoRevFile = file;
      if (prefix === 'bai' && typeof window !== 'undefined') window.batchAddRevFile = file;
      if (prefix === 'bei' && typeof window !== 'undefined') window.batchEditRevFile = file;
      if (prefix === 'modal' && typeof window !== 'undefined') window.uploadRevFileHolder = file;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      const img = document.getElementById(`${prefix}${cap}Preview`);
      const prompt = document.getElementById(`${prefix}${cap}Prompt`);
      const zone = document.getElementById(`${prefix}${cap}Zone`);
      const clearBtn = document.getElementById(`${prefix}${cap}ClearBtn`);
      if (img) {
        img.src = evt.target.result;
        img.style.display = 'block';
      }
      if (prompt) prompt.style.display = 'none';
      if (zone) zone.classList.add('has-image');
      if (clearBtn) clearBtn.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);

    showToast(`Foto ${slot === 'obv' ? 'Obverse (Depan)' : 'Reverse (Belakang)'} berhasil dimuat ✓`, 'info', 1800);
    if (typeof ctx.onSingleChange === 'function') {
      ctx.onSingleChange(slot, file);
    }
  },

  clearSlot(prefix, slot) {
    const ctx = this.getContext(prefix);
    const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
    if (slot === 'obv') {
      ctx.obvFile = null;
      ctx.initialObvUrl = '';
      if (prefix === 'sp') window.singlePhotoObvFile = null;
      if (prefix === 'bai') window.batchAddObvFile = null;
      if (prefix === 'bei') window.batchEditObvFile = null;
      if (prefix === 'modal') window.uploadObvFileHolder = null;
    } else {
      ctx.revFile = null;
      ctx.initialRevUrl = '';
      if (prefix === 'sp') window.singlePhotoRevFile = null;
      if (prefix === 'bai') window.batchAddRevFile = null;
      if (prefix === 'bei') window.batchEditRevFile = null;
      if (prefix === 'modal') window.uploadRevFileHolder = null;
    }

    const img = document.getElementById(`${prefix}${cap}Preview`);
    const prompt = document.getElementById(`${prefix}${cap}Prompt`);
    const zone = document.getElementById(`${prefix}${cap}Zone`);
    const clearBtn = document.getElementById(`${prefix}${cap}ClearBtn`);
    const input = document.getElementById(`${prefix}${cap}Input`);

    if (img) {
      img.src = '';
      img.style.display = 'none';
    }
    if (prompt) prompt.style.display = 'block';
    if (zone) zone.classList.remove('has-image');
    if (clearBtn) clearBtn.style.display = 'none';
    if (input) input.value = '';
    this.setActiveTarget(prefix, slot, true);
  },

  addFilesToSupporting(prefix, files) {
    const ctx = this.getContext(prefix);
    if (!files || files.length === 0) return;

    files.forEach(file => {
      const uid = 'sup_' + (this._uidCounter++);
      const entry = {
        uid,
        file,
        previewUrl: '',
        label: 'detail',
        catatan: ''
      };
      ctx.supportingQueue.push(entry);

      const reader = new FileReader();
      reader.onload = evt => {
        entry.previewUrl = evt.target.result;
        this.renderSupportingQueue(prefix);
      };
      reader.readAsDataURL(file);
    });

    showToast(`${files.length} gambar pendukung ditambahkan ✓`, 'info', 1800);
    if (typeof ctx.onSupportChange === 'function') {
      ctx.onSupportChange(ctx.supportingQueue);
    }
  },

  removeQueuedSupporting(prefix, uid) {
    const ctx = this.getContext(prefix);
    ctx.supportingQueue = ctx.supportingQueue.filter(item => item.uid !== uid);
    this.renderSupportingQueue(prefix);
  },

  updateQueuedSupportingMeta(prefix, uid, field, value) {
    const ctx = this.getContext(prefix);
    const entry = ctx.supportingQueue.find(item => item.uid === uid);
    if (entry) {
      entry[field] = value;
    }
  },

  renderExistingGallery(prefix) {
    const ctx = this.getContext(prefix);
    const container = document.getElementById(`${prefix}ExistingSupportContainer`);
    if (!container) return;

    if (!ctx.existingGallery || ctx.existingGallery.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div style="font-size:11.5px; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">
        📌 Gambar Pendukung Tersimpan (${ctx.existingGallery.length}):
      </div>
      <div class="supporting-queue-grid">
        ${ctx.existingGallery.map(gf => `
          <div class="supporting-queue-card">
            <img src="${escapeHtml(gf.foto_path)}" class="supporting-queue-thumb"
                 onclick="openGlobalLightbox('${escapeHtml(gf.foto_path)}', 'Gambar Pendukung - ${escapeHtml(gf.label || 'detail')}')"
                 title="Klik untuk memperbesar">
            <div style="flex:1; min-width:0;">
              <div style="font-size:11px; font-weight:700; color:var(--gold-light); text-transform:uppercase;">
                ${escapeHtml(gf.label || 'detail')}
              </div>
              <div style="font-size:10.5px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${escapeHtml(gf.catatan || 'Tersimpan di galeri')}
              </div>
            </div>
            ${ctx.koleksiId ? `
              <button type="button" class="photo-mini-btn btn-clear-photo" style="padding:4px 7px;"
                      onclick="SmartPhotoManager.deleteExistingGallery('${prefix}', ${ctx.koleksiId}, ${gf.id})"
                      title="Hapus gambar pendukung ini">
                🗑️
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  },

  async deleteExistingGallery(prefix, koleksiId, fotoId) {
    if (!confirm('Hapus gambar pendukung ini dari item?')) return;
    try {
      await API.delete(`/koleksi/${koleksiId}/gallery/${fotoId}`);
      const ctx = this.getContext(prefix);
      ctx.existingGallery = ctx.existingGallery.filter(g => g.id !== fotoId);
      this.renderExistingGallery(prefix);
      showToast('Gambar pendukung berhasil dihapus.', 'success');
    } catch (err) {
      showToast('Gagal menghapus gambar pendukung: ' + err.message, 'error');
    }
  },

  renderSupportingQueue(prefix) {
    const ctx = this.getContext(prefix);
    const container = document.getElementById(`${prefix}SupportQueueContainer`);
    if (!container) return;

    if (!ctx.supportingQueue || ctx.supportingQueue.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div style="font-size:11.5px; font-weight:700; color:#4caf50; margin-bottom:6px;">
        ➕ Antrean Gambar Pendukung Baru (${ctx.supportingQueue.length} siap disimpan):
      </div>
      <div class="supporting-queue-grid">
        ${ctx.supportingQueue.map(item => `
          <div class="supporting-queue-card">
            <img src="${item.previewUrl || ''}" class="supporting-queue-thumb"
                 onclick="if(this.src) openGlobalLightbox(this.src, 'Preview Gambar Pendukung')"
                 title="Klik untuk memperbesar">
            <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
              <select class="form-select" style="font-size:11px; padding:3px 6px; height:auto;"
                      onchange="SmartPhotoManager.updateQueuedSupportingMeta('${prefix}', '${item.uid}', 'label', this.value)">
                ${SUPPORTING_PHOTO_LABELS.map(opt => `<option value="${opt.value}" ${opt.value === item.label ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
              <input type="text" class="form-control" style="font-size:11px; padding:3px 6px; height:auto;"
                     placeholder="Catatan singkat (opsional)..."
                     value="${escapeHtml(item.catatan || '')}"
                     oninput="SmartPhotoManager.updateQueuedSupportingMeta('${prefix}', '${item.uid}', 'catatan', this.value)">
            </div>
            <button type="button" class="photo-mini-btn btn-clear-photo" style="padding:4px 7px;"
                    onclick="SmartPhotoManager.removeQueuedSupporting('${prefix}', '${item.uid}')"
                    title="Batalkan gambar ini">
              ✕
            </button>
          </div>
        `).join('')}
      </div>
    `;
  },

  async uploadAllForKoleksi(prefix, koleksiId) {
    const ctx = this.getContext(prefix);
    if (!koleksiId) return;

    if (ctx.obvFile) {
      const fd = new FormData();
      fd.append('file', ctx.obvFile);
      fd.append('foto', ctx.obvFile);
      await API.upload(`/koleksi/${koleksiId}/foto?tipe=obv`, fd).catch(err => {
        console.warn('Gagal unggah OBV:', err);
      });
    }

    if (ctx.revFile) {
      const fd = new FormData();
      fd.append('file', ctx.revFile);
      fd.append('foto', ctx.revFile);
      await API.upload(`/koleksi/${koleksiId}/foto?tipe=rev`, fd).catch(err => {
        console.warn('Gagal unggah REV:', err);
      });
    }

    if (ctx.supportingQueue && ctx.supportingQueue.length > 0) {
      for (const sup of ctx.supportingQueue) {
        const fd = new FormData();
        fd.append('foto', sup.file);
        fd.append('label', sup.label || 'detail');
        if (sup.catatan) fd.append('catatan', sup.catatan);
        await API.upload(`/koleksi/${koleksiId}/gallery`, fd).catch(err => {
          console.warn('Gagal unggah gambar pendukung:', err);
        });
      }
    }
  },

  isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    if (file.name && /\.(jpe?g|png|webp|gif|bmp|svg|jfif|avif)$/i.test(file.name)) return true;
    return false;
  },

  normalizeFile(file, idx = 0) {
    const extMatch = (file.name || '').match(/\.([a-zA-Z0-9]+)$/);
    let ext = extMatch ? extMatch[1].toLowerCase() : '';
    if (!ext) {
      const ct = (file.type || '').toLowerCase();
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
      else if (ct.includes('gif')) ext = 'gif';
      else ext = 'jpg';
    }
    const cleanName = (!file.name || file.name === 'image.png' || file.name === 'blob')
      ? `clipboard_${Date.now()}_${idx}.${ext}`
      : file.name;
    return new File([file], cleanName, { type: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  },

  async fetchRemoteUrlAsFile(url) {
    if (!url) return null;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/')) {
      return null;
    }

    try {
      // 1. Coba fetch langsung dari browser jika diizinkan CORS / data:image
      if (cleanUrl.startsWith('data:image/')) {
        const res = await fetch(cleanUrl);
        const blob = await res.blob();
        return this.normalizeFile(blob, 0);
      }

      // 2. Gunakan proxy backend anti-CORS (/api/koleksi/fetch-remote-image)
      const token = API.getToken();
      const res = await fetch('/api/koleksi/fetch-remote-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url: cleanUrl })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Gagal mengunduh gambar dari URL eksternal');
      }

      const blob = await res.blob();
      return this.normalizeFile(blob, 0);
    } catch (err) {
      showToast('Gagal mengambil gambar dari website: ' + err.message, 'warning');
      return null;
    }
  },

  async processEventDataTransfer(prefix, slot, dt) {
    if (!dt) return false;

    // Ekstrak secara sinkron sebelum await apa pun!
    const directFiles = [];
    if (dt.files && dt.files.length > 0) {
      for (let i = 0; i < dt.files.length; i++) {
        if (this.isImageFile(dt.files[i])) {
          directFiles.push(this.normalizeFile(dt.files[i], i));
        }
      }
    }

    if (directFiles.length === 0 && dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        if (item.kind === 'file' && (!item.type || item.type.startsWith('image/'))) {
          const f = item.getAsFile();
          if (f && this.isImageFile(f)) {
            directFiles.push(this.normalizeFile(f, i));
          }
        }
      }
    }

    let htmlData = '';
    let uriData = '';
    let textData = '';
    try { htmlData = dt.getData('text/html') || ''; } catch (_) {}
    try { uriData = dt.getData('text/uri-list') || ''; } catch (_) {}
    try { textData = dt.getData('text/plain') || ''; } catch (_) {}

    if (directFiles.length > 0) {
      this.applyFilesToSlot(prefix, slot, directFiles);
      return true;
    }

    // Cek apabila pengguna drag/copy elemen <img> dari website lain
    let extractedUrl = '';
    if (htmlData && htmlData.includes('<img')) {
      try {
        const doc = new DOMParser().parseFromString(htmlData, 'text/html');
        const imgEl = doc.querySelector('img');
        if (imgEl && imgEl.src) {
          extractedUrl = imgEl.src;
        }
      } catch (_) {}
    }

    if (!extractedUrl && uriData) {
      const firstUri = uriData.split(/\r?\n/).find(line => line && !line.startsWith('#'));
      if (firstUri) extractedUrl = firstUri.trim();
    }

    if (!extractedUrl && textData) {
      const trimmed = textData.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
        extractedUrl = trimmed;
      }
    }

    if (extractedUrl) {
      showToast('Mengambil gambar dari website...', 'info', 1500);
      const remoteFile = await this.fetchRemoteUrlAsFile(extractedUrl);
      if (remoteFile) {
        this.applyFilesToSlot(prefix, slot, [remoteFile]);
        return true;
      }
    }

    return false;
  },

  async pasteFromClipboardButton(prefix, slot) {
    this.setActiveTarget(prefix, slot);
    const files = [];

    if (navigator.clipboard && navigator.clipboard.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (let i = 0; i < clipboardItems.length; i++) {
          const clipItem = clipboardItems[i];
          const imgType = clipItem.types.find(t => t.startsWith('image/'));
          if (imgType) {
            const blob = await clipItem.getType(imgType);
            files.push(this.normalizeFile(blob, i));
          } else if (clipItem.types.includes('text/html')) {
            const htmlBlob = await clipItem.getType('text/html');
            const htmlText = await htmlBlob.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const imgEl = doc.querySelector('img');
            if (imgEl && imgEl.src) {
              const f = await this.fetchRemoteUrlAsFile(imgEl.src);
              if (f) files.push(f);
            }
          }
        }
      } catch (_) {
        // Izin clipboard.read mungkin tidak tersedia atau clipboard berisi file OS Explorer
      }
    }

    if (files.length === 0 && navigator.clipboard && navigator.clipboard.readText) {
      try {
        const txt = (await navigator.clipboard.readText() || '').trim();
        if (txt.startsWith('http://') || txt.startsWith('https://') || txt.startsWith('data:image/')) {
          const f = await this.fetchRemoteUrlAsFile(txt);
          if (f) files.push(f);
        }
      } catch (_) {}
    }

    if (files.length > 0) {
      this.applyFilesToSlot(prefix, slot, files);
    } else {
      const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
      const zone = document.getElementById(`${prefix}${cap}Zone`);
      if (zone) zone.focus();
      showToast('Kotak aktif! Tekan Ctrl+V pada keyboard untuk menempelkan gambar dari Explorer / Clipboard.', 'info', 2800);
    }
  },

  findBestTargetForGlobalPaste() {
    // 1. Jika activeTarget masih terlihat di DOM, gunakan itu
    if (this.activeTarget) {
      const { prefix, slot } = this.activeTarget;
      const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
      const zone = document.getElementById(`${prefix}${cap}Zone`);
      if (zone && zone.offsetParent !== null) {
        return { prefix, slot };
      }
    }

    // 2. Cari section foto yang sedang aktif (prioritaskan di dalam modal yang sedang terbuka)
    const modalOverlay = document.getElementById('modalOverlay');
    let section = null;
    if (modalOverlay && modalOverlay.classList.contains('show')) {
      section = modalOverlay.querySelector('.smart-photo-section');
    }
    if (!section) {
      section = document.querySelector('.smart-photo-section');
    }
    if (!section) return null;

    const prefix = section.getAttribute('data-photo-prefix');
    const ctx = this.getContext(prefix);

    if (!ctx.obvFile && !ctx.initialObvUrl && document.getElementById(`${prefix}ObvZone`)?.offsetParent !== null) {
      return { prefix, slot: 'obv' };
    }
    if (!ctx.revFile && !ctx.initialRevUrl && document.getElementById(`${prefix}RevZone`)?.offsetParent !== null) {
      return { prefix, slot: 'rev' };
    }
    if (document.getElementById(`${prefix}SupportZone`)?.offsetParent !== null) {
      return { prefix, slot: 'support' };
    }
    return { prefix, slot: 'obv' };
  }
};

// Global Ctrl+V Listener untuk menangkap Paste Gambar di mana saja pada halaman/modal aktif
document.addEventListener('paste', async e => {
  const dt = e.clipboardData;
  if (!dt) return;

  // Cek apakah ada file gambar langsung di clipboard (Copy Image browser, Snipping Tool, Paint, atau Copy File dari Explorer)
  let hasDirectImage = false;
  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      if (SmartPhotoManager.isImageFile(dt.files[i])) {
        hasDirectImage = true;
        break;
      }
    }
  }
  if (!hasDirectImage && dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (it.kind === 'file' && (!it.type || it.type.startsWith('image/'))) {
        hasDirectImage = true;
        break;
      }
    }
  }

  const activeEl = document.activeElement;
  const isTypingInInput = activeEl && (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.isContentEditable
  );

  // Jika pengguna sedang mengetik di input teks dan clipboard TIDAK berisi file gambar, biarkan paste teks biasa
  if (isTypingInInput && !hasDirectImage) {
    return;
  }

  const target = SmartPhotoManager.findBestTargetForGlobalPaste();
  if (!target) return;

  if (hasDirectImage || !isTypingInInput) {
    const handled = await SmartPhotoManager.processEventDataTransfer(target.prefix, target.slot, dt);
    if (handled) {
      e.preventDefault();
    }
  }
});
