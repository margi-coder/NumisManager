/**
 * ============================================================================
 * ALBUM DIGITAL NUMISMATIK - REALISTIC 3D BINDER SLEEVE ENGINE (LEMBAR & HALAMAN)
 * ============================================================================
 */

let albumState = {
  albums: [],
  currentAlbum: null,
  lembaran: [],        // Array of sheet objects from API
  spreadIndex: 0,      // 0: Inside Front Cover on Left, Lembar 1 (OBS) on Right
                       // 1: Lembar 1 (REV) on Left, Lembar 2 (OBS) on Right
                       // 2: Lembar 2 (REV) on Left, Lembar 3 (OBS) on Right
                       // ...
                       // totalLembar: Lembar N (REV) on Left, Inside Back Cover on Right
  selectedSlot: null,  // { lembar_ke, slot_index }
  koleksiList: [],     // Cached collection items for selector modal
  searchQuery: '',
  filterJenis: '',
  isDragging: false,
  dragStartX: 0,
  dragDirection: null, // 'next' or 'prev'
  dragProgress: 0,
  viewMode: localStorage.getItem('numis_album_view_mode') || 'standard',
  isToolbarHidden: false
};

// ============================================================================
// THEME SYSTEM (14 RICH LUXURY THEMES)
// ============================================================================
const ALBUM_THEMES = [
  { value: 'gold', label: 'Emas Mewah (Gold)', icon: '🟡', preview: '#d4af37' },
  { value: 'silver', label: 'Perak Murni (Silver)', icon: '⚪', preview: '#c0c5cc' },
  { value: 'copper', label: 'Tembaga Antik (Copper / Cupper)', icon: '🟤', preview: '#b85d38' },
  { value: 'rose_gold', label: 'Rose Gold Premium', icon: '🌸', preview: '#d49a9e' },
  { value: 'white_gold', label: 'White Gold / Platinum', icon: '❄️', preview: '#d5dde6' },
  { value: 'emerald', label: 'Hijau Zamrud Klasik (Emerald)', icon: '🟢', preview: '#175e40' },
  { value: 'navy', label: 'Biru Tua (Royal Navy)', icon: '🔵', preview: '#152b47' },
  { value: 'burgundy', label: 'Merah Marun (Burgundy)', icon: '🔴', preview: '#5e151e' },
  { value: 'purple', label: 'Ungu Kerajaan (Purple / Purpple)', icon: '🟣', preview: '#46195c' },
  { value: 'violet', label: 'Deep Violet (Lembayung)', icon: '🌌', preview: '#311c60' },
  { value: 'yellow', label: 'Kuning Amber (Yellow)', icon: '⭐', preview: '#c79612' },
  { value: 'desert', label: 'Desert Sand Leather (Gurun / Dessert)', icon: '🏜️', preview: '#6d4e2f' },
  { value: 'vintage_leather', label: 'Kulit Cokelat Vintage', icon: '📜', preview: '#4a2816' },
  { value: 'onyx_black', label: 'Hitam Onyx Elegan', icon: '🖤', preview: '#1e2024' }
];

function getAlbumThemeClass(tema) {
  if (!tema) return 'album-cover-burgundy';
  const clean = String(tema).toLowerCase().trim().replace(/_/g, '-');

  // Normalisasi aliases & multilingual terms
  if (clean === 'dark-burgundy' || clean === 'merah' || clean === 'burgundy') return 'album-cover-burgundy';
  if (clean === 'classic-navy' || clean === 'biru' || clean === 'navy') return 'album-cover-navy';
  if (clean === 'royal-emerald' || clean === 'hijau' || clean === 'emerald') return 'album-cover-emerald';
  if (clean === 'onyx-black' || clean === 'hitam' || clean === 'onyx') return 'album-cover-onyx';
  if (clean === 'vintage-leather' || clean === 'leather' || clean === 'kulit') return 'album-cover-leather';
  if (clean === 'cupper' || clean === 'copper' || clean === 'tembaga') return 'album-cover-copper';
  if (clean === 'dessert' || clean === 'desert' || clean === 'gurun') return 'album-cover-desert';
  if (clean === 'purpple' || clean === 'purple' || clean === 'ungu') return 'album-cover-purple';
  if (clean === 'rose-gold' || clean === 'rosegold') return 'album-cover-rose-gold';
  if (clean === 'white-gold' || clean === 'whitegold' || clean === 'platinum') return 'album-cover-white-gold';
  if (clean === 'yellow' || clean === 'kuning') return 'album-cover-yellow';
  if (clean === 'gold' || clean === 'emas') return 'album-cover-gold';
  if (clean === 'silver' || clean === 'perak') return 'album-cover-silver';
  if (clean === 'violet' || clean === 'lembayung') return 'album-cover-violet';

  return `album-cover-${clean}`;
}

function renderThemeOptions(selectedTheme) {
  const norm = (selectedTheme || 'burgundy').toLowerCase().trim().replace(/-/g, '_');
  return ALBUM_THEMES.map(t => {
    let isSelected = (norm === t.value);
    if (!isSelected) {
      if (t.value === 'burgundy' && (norm === 'dark_burgundy' || norm === 'merah')) isSelected = true;
      else if (t.value === 'navy' && (norm === 'classic_navy' || norm === 'biru')) isSelected = true;
      else if (t.value === 'emerald' && (norm === 'royal_emerald' || norm === 'hijau')) isSelected = true;
      else if (t.value === 'onyx_black' && (norm === 'onyx' || norm === 'hitam')) isSelected = true;
      else if (t.value === 'vintage_leather' && (norm === 'leather' || norm === 'kulit')) isSelected = true;
      else if (t.value === 'copper' && (norm === 'cupper' || norm === 'tembaga')) isSelected = true;
      else if (t.value === 'desert' && (norm === 'dessert' || norm === 'gurun')) isSelected = true;
      else if (t.value === 'purple' && (norm === 'purpple' || norm === 'ungu')) isSelected = true;
      else if (t.value === 'rose_gold' && norm === 'rosegold') isSelected = true;
      else if (t.value === 'white_gold' && (norm === 'whitegold' || norm === 'platinum')) isSelected = true;
      else if (t.value === 'yellow' && norm === 'kuning') isSelected = true;
      else if (t.value === 'gold' && norm === 'emas') isSelected = true;
      else if (t.value === 'silver' && norm === 'perak') isSelected = true;
      else if (t.value === 'violet' && norm === 'lembayung') isSelected = true;
    }
    return `<option value="${t.value}" ${isSelected ? 'selected' : ''}>${t.icon} ${t.label}</option>`;
  }).join('');
}

function previewSelectedTheme(themeValue) {
  const box = document.getElementById('themePreviewBox');
  if (!box) return;
  const themeClass = getAlbumThemeClass(themeValue);
  box.className = `album-card-cover ${themeClass}`;
}

// ----------------------------------------------------------------------------
// 1. MAIN ENTRY POINT - LOAD ALBUM SHELF
// ----------------------------------------------------------------------------
async function loadAlbum() {
  document.body.classList.remove('album-fit-active');
  albumState.isToolbarHidden = false;
  const content = document.getElementById('contentArea');
  content.innerHTML = `
    <div class="empty-state" style="padding: 60px 20px;">
      <div class="loading-spinner"></div>
      <p style="margin-top: 16px; color: var(--text-secondary);">Memuat rak koleksi album digital...</p>
    </div>
  `;

  try {
    const albums = await API.get('/album/');
    albumState.albums = albums || [];
    renderAlbumShelf();
  } catch (err) {
    console.error('Error loading albums:', err);
    content.innerHTML = `
      <div class="card empty-state" style="padding: 40px 20px;">
        <span style="font-size: 2.5rem;">⚠️</span>
        <h3 style="margin-top: 12px; color: var(--danger);">Gagal Memuat Album</h3>
        <p style="color: var(--text-secondary);">${err.message}</p>
        <button class="btn btn-primary" onclick="loadAlbum()" style="margin-top: 16px;">Coba Lagi</button>
      </div>
    `;
  }
}

// ----------------------------------------------------------------------------
// 2. RENDER ALBUM SHELF (DAFTAR SEMUA ALBUM)
// ----------------------------------------------------------------------------
function renderAlbumShelf() {
  const content = document.getElementById('contentArea');

  let albumsHtml = '';
  if (albumState.albums.length === 0) {
    albumsHtml = `
      <div class="card empty-state" style="grid-column: 1 / -1; padding: 60px 20px; text-align: center;">
        <span style="font-size: 3.2rem;">📖</span>
        <h3 style="margin-top: 16px; color: var(--text-primary);">Belum Ada Album Digital</h3>
        <p style="color: var(--text-secondary); max-width: 520px; margin: 8px auto 20px;">
          Buat album binder digital pertama Anda untuk menata dan memamerkan koleksi uang kuno dalam lembaran mika bening katalog layaknya album fisik aslinya.
        </p>
        <button class="btn btn-primary" onclick="showCreateAlbumModal()">
          <span>✨</span> Buat Album Baru Sekarang
        </button>
      </div>
    `;
  } else {
    albumsHtml = albumState.albums.map(a => {
      const themeClass = getAlbumThemeClass(a.tema_warna);
      return `
        <div class="album-card" onclick="openAlbum(${a.id})">
          <div class="album-card-cover ${themeClass}">
            <div class="album-cover-spine-edge"></div>
            <div class="album-cover-emboss-box">
              <div class="album-cover-title">${escapeHtml(a.nama_album)}</div>
              <div class="album-cover-sub">${a.total_lembar || 2} Lembar Refill • ${a.total_halaman || 4} Halaman</div>
            </div>
          </div>
          <div class="album-card-body">
            <div class="album-card-desc">${escapeHtml(a.deskripsi || 'Tidak ada deskripsi album.')}</div>
            <div class="album-card-stats">
              <div class="album-card-stat-item">
                <span>Terisi:</span>
                <strong>${a.item_count || 0} Uang</strong>
              </div>
              <div class="album-card-stat-item">
                <span>Lembaran:</span>
                <strong>${a.total_lembar || 2} Lembar</strong>
              </div>
            </div>
            <div class="album-card-actions" onclick="event.stopPropagation();">
              <button class="btn btn-primary btn-sm" onclick="openAlbum(${a.id})">
                <span>📖</span> Buka Buku Album
              </button>
              <button class="btn btn-secondary btn-sm" onclick="showEditAlbumModal(${a.id})" title="Edit Pengaturan Album">
                <span>✏️</span>
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteAlbum(${a.id}, '${escapeHtml(a.nama_album)}')" title="Hapus Album">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  content.innerHTML = `
    <div class="album-shelf-container">
      <div class="album-shelf-header">
        <div class="album-shelf-title">
          <span style="font-size: 2.2rem;">📚</span>
          <div>
            <h2>Katalog Album Digital</h2>
            <p>Binder koleksi uang kuno dengan lembaran bening mika (Tampak Depan OBS &amp; Tampak Belakang REV)</p>
          </div>
        </div>
        <div>
          <button class="btn btn-primary" onclick="showCreateAlbumModal()">
            <span>➕</span> Buat Album Baru
          </button>
        </div>
      </div>

      <div class="album-grid">
        ${albumsHtml}
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 3. OPEN & DISPLAY DIGITAL ALBUM BOOK
// ----------------------------------------------------------------------------
async function openAlbum(albumId) {
  albumState.isToolbarHidden = false;
  const content = document.getElementById('contentArea');
  content.innerHTML = `
    <div class="empty-state" style="padding: 60px 20px;">
      <div class="loading-spinner"></div>
      <p style="margin-top: 16px; color: var(--text-secondary);">Membuka album binder digital...</p>
    </div>
  `;

  try {
    const data = await API.get(`/album/${albumId}`);
    albumState.currentAlbum = data.album;
    albumState.lembaran = data.lembaran || [];
    albumState.spreadIndex = 0; // Mulai dari sampul dalam kiri + Halaman 1 di kanan
    renderAlbumBookView();
  } catch (err) {
    showToast('Gagal membuka album: ' + err.message, 'error');
    loadAlbum();
  }
}

function renderAlbumBookView() {
  const content = document.getElementById('contentArea');
  const album = albumState.currentAlbum;
  if (!album) return;

  const totalLembar = albumState.lembaran.length;
  const spreadIndex = albumState.spreadIndex; // 0 sampai totalLembar

  const themeClass = getAlbumThemeClass(album.tema_warna);

  // Tentukan konten panel Kiri dan panel Kanan sesuai posisi buka album
  let leftPanelHtml = '';
  let rightPanelHtml = '';
  let spreadTitle = '';

  if (spreadIndex === 0) {
    // COVER DALAM PERTAMA (Buku pertama dibuka)
    // Kiri: Sampul Dalam Kosong
    // Kanan: Halaman 1 (Sisi Depan / OBS Lembar 1)
    leftPanelHtml = renderInsideFrontCover(album);
    rightPanelHtml = renderSheetPanel(albumState.lembaran[0], 'OBS', 1);
    spreadTitle = 'Sampul Depan Dalam • Halaman 1 (Lembar 1 - Sisi Depan OBS)';
  } else if (spreadIndex >= totalLembar) {
    // COVER BELAKANG DALAM (Semua lembar sudah dibalik)
    // Kiri: Halaman Terakhir (Sisi Belakang / REV Lembar Terakhir)
    // Kanan: Sampul Belakang Kosong
    const lastSheet = albumState.lembaran[totalLembar - 1];
    leftPanelHtml = renderSheetPanel(lastSheet, 'REV', totalLembar * 2);
    rightPanelHtml = renderInsideBackCover(album);
    spreadTitle = `Halaman ${totalLembar * 2} (Lembar ${totalLembar} - Sisi Belakang REV) • Sampul Belakang`;
  } else {
    // SPREAD TENGAH:
    // Kiri: Halaman 2*spreadIndex (Sisi Belakang / REV dari Lembar ke-spreadIndex)
    // Kanan: Halaman 2*spreadIndex + 1 (Sisi Depan / OBS dari Lembar ke-spreadIndex + 1)
    const leftSheet = albumState.lembaran[spreadIndex - 1];
    const rightSheet = albumState.lembaran[spreadIndex];
    leftPanelHtml = renderSheetPanel(leftSheet, 'REV', spreadIndex * 2);
    rightPanelHtml = renderSheetPanel(rightSheet, 'OBS', (spreadIndex * 2) + 1);
    spreadTitle = `Halaman ${spreadIndex * 2} (Lembar ${spreadIndex} REV) • Halaman ${(spreadIndex * 2) + 1} (Lembar ${spreadIndex + 1} OBS)`;
  }

  // JIKA BINDER SUDAH ADA DI DOM: Lakukan in-place update (mencegah flickering, jump size, dan browser keluar fullscreen)
  const existingBinder = document.getElementById('binderBookElement');
  const leftSlot = document.getElementById('albumLeftSlot');
  const rightSlot = document.getElementById('albumRightSlot');

  if (existingBinder && leftSlot && rightSlot) {
    existingBinder.className = `album-binder-book ${themeClass}`;
    leftSlot.innerHTML = leftPanelHtml;
    rightSlot.innerHTML = rightPanelHtml;

    // Reset turn layer
    const turnLayer = document.getElementById('interactiveTurnLayer');
    if (turnLayer) {
      turnLayer.style.display = 'none';
      turnLayer.className = 'interactive-turn-layer';
      turnLayer.style.transform = '';
      turnLayer.style.transition = 'none';
    }
    const shadow = document.getElementById('turnShadowOverlay');
    if (shadow) shadow.style.opacity = '0';

    // Update grab cues
    existingBinder.querySelectorAll('.page-edge-grab-cue').forEach(el => el.remove());
    if (spreadIndex > 0) {
      const cueLeft = document.createElement('div');
      cueLeft.className = 'page-edge-grab-cue grab-cue-left';
      cueLeft.onclick = flipSpreadPrev;
      cueLeft.title = 'Tarik / Klik untuk membalik ke kiri';
      cueLeft.innerHTML = '❮';
      existingBinder.appendChild(cueLeft);
    }
    if (spreadIndex < totalLembar) {
      const cueRight = document.createElement('div');
      cueRight.className = 'page-edge-grab-cue grab-cue-right';
      cueRight.onclick = flipSpreadNext;
      cueRight.title = 'Tarik / Klik untuk membalik ke kanan';
      cueRight.innerHTML = '❯';
      existingBinder.appendChild(cueRight);
    }

    // Update page indicator pill
    const pageIndicator = document.querySelector('.page-indicator-pill');
    if (pageIndicator) {
      const label = spreadIndex === 0 ? 'Sampul & Hal 1' : spreadIndex >= totalLembar ? `Hal ${totalLembar*2} & Akhir` : `Hal ${spreadIndex*2} & ${(spreadIndex*2)+1}`;
      pageIndicator.innerHTML = `<span>${label}</span><span style="opacity: 0.6;">(${spreadIndex}/${totalLembar} Lembar)</span>`;
    }

    const btnPrev = document.querySelector('button[title*="Balik Lembar ke Sebelumnya"]');
    if (btnPrev) btnPrev.disabled = (spreadIndex === 0);

    const btnNext = document.querySelector('button[title*="Balik Lembar ke Berikutnya"]');
    if (btnNext) btnNext.disabled = (spreadIndex >= totalLembar);

    setupDragToFlip();
    applyAlbumToolbarVisibility();
    if (albumState.viewMode === 'fit' || document.fullscreenElement) {
      updateAlbumFitDimensions();
    }
    return;
  }

  content.innerHTML = `
    <div class="album-viewer-container ${albumState.viewMode === 'fit' ? 'view-mode-fit' : ''} ${albumState.isToolbarHidden ? 'toolbar-hidden' : ''}">
      <!-- Floating Button to Restore Toolbar when Hidden (Panah Biru ke Bawah tanpa tulisan) -->
      <button type="button" 
              id="btnShowAlbumToolbar" 
              class="floating-toolbar-trigger" 
              onclick="toggleAlbumToolbar(true)" 
              title="Tampilkan Bar Kontrol (atau tekan huruf H)"
              style="display: ${albumState.isToolbarHidden ? 'inline-flex' : 'none'};">
        <svg class="arrow-blue-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Top Navigation Toolbar -->
      <div class="album-viewer-toolbar" style="display: ${albumState.isToolbarHidden ? 'none' : 'flex'};">
        <div class="album-toolbar-left">
          <button class="btn btn-secondary btn-sm" onclick="loadAlbum()">
            <span>←</span> Rak Album
          </button>
          <div class="album-toolbar-info">
            <h3><span>📖</span> ${escapeHtml(album.nama_album)}</h3>
            <span>${totalLembar} Lembar Refill • ${totalLembar * 2} Halaman • ${album.item_count || 0} Uang</span>
          </div>
        </div>

        <div class="album-toolbar-center">
          <div class="drag-hint-pill">
            <span>👆</span> Klik &amp; Geser (Drag) lembar ke kiri/kanan untuk membalik
          </div>
        </div>

        <div class="album-toolbar-right">
          <button class="btn btn-secondary btn-sm" onclick="showEditAlbumModal(${album.id})" title="Ganti Tema Warna &amp; Pengaturan Album">
            <span>🎨</span> Tema &amp; Pengaturan
          </button>
          <button class="btn btn-secondary btn-sm" onclick="addNewSheetModal()" title="Tambah Lembaran Refill Baru ke Album">
            <span>➕</span> Tambah Lembar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="flipSpreadPrev()" ${spreadIndex === 0 ? 'disabled' : ''} title="Balik Lembar ke Sebelumnya">
            ❮ Balik ke Kiri
          </button>
          <div class="page-indicator-pill">
            <span>${spreadIndex === 0 ? 'Sampul & Hal 1' : spreadIndex >= totalLembar ? `Hal ${totalLembar*2} & Akhir` : `Hal ${spreadIndex*2} & ${(spreadIndex*2)+1}`}</span>
            <span style="opacity: 0.6;">(${spreadIndex}/${totalLembar} Lembar)</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="flipSpreadNext()" ${spreadIndex >= totalLembar ? 'disabled' : ''} title="Balik Lembar ke Berikutnya">
            Balik ke Kanan ❯
          </button>

          <!-- Pilihan View Size di Lingkaran Merah -->
          <div class="album-viewsize-control" id="albumViewSizeControl" title="Pilihan Ukuran Tampilan Album">
            <button type="button" class="viewsize-btn ${albumState.viewMode === 'standard' ? 'active' : ''}" id="btnViewStandard" onclick="setAlbumViewMode('standard')" title="Ukuran Standar (Ukuran asli dengan scroll halaman)">
              <span class="viewsize-btn-icon">📏</span>
              <span>Standar</span>
            </button>
            <button type="button" class="viewsize-btn ${albumState.viewMode === 'fit' ? 'active' : ''}" id="btnViewFit" onclick="setAlbumViewMode('fit')" title="Pas Layar Cerdas (Menyesuaikan seluruh bentuk album agar utuh di layar tanpa terpotong)">
              <span class="viewsize-btn-icon">📐</span>
              <span>Pas Layar</span>
            </button>
            <button type="button" class="viewsize-btn" id="btnViewFullscreen" onclick="toggleAlbumFullscreen()" title="Layar Penuh (Immersif Fullscreen)">
              <span class="viewsize-btn-icon">⛶</span>
            </button>
          </div>

          <!-- Tombol Sembunyikan Toolbar (Panah Biru ke Atas tanpa tulisan) -->
          <button type="button" class="btn-toggle-toolbar" onclick="toggleAlbumToolbar(false)" title="Sembunyikan Bar Kontrol (atau tekan huruf H)">
            <svg class="arrow-blue-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Realistic 2-Page Binder Book Spread -->
      <div class="album-book-wrapper" id="bookStageWrapper">
        <!-- Interactive 3D Drag Leaf Overlay -->
        <div class="interactive-turn-layer" id="interactiveTurnLayer">
          <div class="turn-page-face turn-face-front" id="turnFaceFront"></div>
          <div class="turn-page-face turn-face-back" id="turnFaceBack"></div>
          <div class="turn-shadow-overlay" id="turnShadowOverlay"></div>
        </div>

        <div class="album-binder-book ${themeClass}" id="binderBookElement">
          <!-- SLOT PANEL KIRI -->
          <div id="albumLeftSlot" class="album-page-slot">
            ${leftPanelHtml}
          </div>

          <!-- BINDER SPINE & 4 METALLIC RINGS -->
          <div class="binder-spine">
            <div class="binder-ring">
              <div class="binder-ring-hole-left"></div>
              <div class="binder-ring-hole-right"></div>
            </div>
            <div class="binder-ring">
              <div class="binder-ring-hole-left"></div>
              <div class="binder-ring-hole-right"></div>
            </div>
            <div class="binder-ring">
              <div class="binder-ring-hole-left"></div>
              <div class="binder-ring-hole-right"></div>
            </div>
            <div class="binder-ring">
              <div class="binder-ring-hole-left"></div>
              <div class="binder-ring-hole-right"></div>
            </div>
          </div>

          <!-- SLOT PANEL KANAN -->
          <div id="albumRightSlot" class="album-page-slot">
            ${rightPanelHtml}
          </div>

          <!-- Visual edge peel cues for drag interaction -->
          ${spreadIndex > 0 ? `<div class="page-edge-grab-cue grab-cue-left" onclick="flipSpreadPrev()" title="Tarik / Klik untuk membalik ke kiri">❮</div>` : ''}
          ${spreadIndex < totalLembar ? `<div class="page-edge-grab-cue grab-cue-right" onclick="flipSpreadNext()" title="Tarik / Klik untuk membalik ke kanan">❯</div>` : ''}
        </div>
      </div>
    </div>
  `;

  // Attach interactive Pointer Events for click-drag page turning
  setupDragToFlip();
  applyAlbumViewMode(albumState.viewMode);
}

// ----------------------------------------------------------------------------
// 4. RENDER INSIDE COVERS (EMPTY WHEN ALBUM FIRST OPENED)
// ----------------------------------------------------------------------------
function renderInsideFrontCover(album) {
  return `
    <div class="album-inside-cover album-page-left">
      <div class="inside-cover-box">
        <div class="inside-cover-emblem">🪙</div>
        <div class="inside-cover-title">${escapeHtml(album.nama_album)}</div>
        <div class="inside-cover-sub">${escapeHtml(album.deskripsi || 'Koleksi numismatik terpilih dalam album binder mika berstandar archival.')}</div>
        <div class="inside-cover-prompt">
          <span>👉</span> Buka lembar pertama di sebelah kanan
        </div>
      </div>
    </div>
  `;
}

function renderInsideBackCover(album) {
  return `
    <div class="album-inside-cover album-page-right">
      <div class="inside-cover-box">
        <div class="inside-cover-emblem">🏛️</div>
        <div class="inside-cover-title">Akhir Lembaran Album</div>
        <div class="inside-cover-sub">Semua lembaran koleksi uang kuno telah dibuka. Anda dapat menambah lembar baru atau membalik kembali ke awal.</div>
        <button class="btn btn-primary" onclick="addNewSheetModal()" style="margin-top: 8px;">
          <span>➕</span> Tambah Lembar Refill Baru
        </button>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 5. RENDER REFILL SHEET SIDE (OBS or REV)
// ----------------------------------------------------------------------------
function renderSheetPanel(sheet, side, pageNumber) {
  if (!sheet) return '';

  const totalLembar = (albumState.lembaran && albumState.lembaran.length) || (albumState.currentAlbum && albumState.currentAlbum.total_lembar) || 1;
  const slotCount = sheet.slot_count || 3;
  const isLeft = side === 'REV';
  const pageClass = isLeft ? 'album-page-left' : 'album-page-right';
  const sideBadgeClass = side === 'OBS' ? 'side-obs' : 'side-rev';
  const sideLabel = side === 'OBS' ? 'OBS (Tampak Depan)' : 'REV (Tampak Belakang)';

  return `
    <div class="album-page ${pageClass}" id="${isLeft ? 'leftPagePanel' : 'rightPagePanel'}">
      <div class="refill-sheet-overlay"></div>
      
      <!-- Page Header: Page number, side, sheet indicator, and per-sheet slot layout selector -->
      <div class="album-page-header">
        <div class="album-page-number-pill">
          <span>📄 Hal. ${pageNumber}</span>
          <span class="album-page-side-badge ${sideBadgeClass}">${sideLabel}</span>
        </div>

        <!-- Sheet Indicator Pill (Lembar X/Y) in center -->
        <div class="sheet-indicator-pill" title="Lembar ke-${sheet.lembar_ke} dari ${totalLembar} lembar">
          <span>Lembar ${sheet.lembar_ke}/${totalLembar}</span>
        </div>

        <!-- Per-sheet layout selector: allows 1, 2, 3, 4, 6 slots on THIS sheet -->
        <div class="sheet-slot-configurator" onclick="event.stopPropagation();">
          <span>Lembar ${sheet.lembar_ke}:</span>
          <button class="sheet-slot-btn ${slotCount === 1 ? 'active' : ''}" onclick="changeSheetSlotLayout(${sheet.lembar_ke}, 1)" title="1 Uang per Lembar (Besar)">1</button>
          <button class="sheet-slot-btn ${slotCount === 2 ? 'active' : ''}" onclick="changeSheetSlotLayout(${sheet.lembar_ke}, 2)" title="2 Uang per Lembar">2</button>
          <button class="sheet-slot-btn ${slotCount === 3 ? 'active' : ''}" onclick="changeSheetSlotLayout(${sheet.lembar_ke}, 3)" title="3 Uang per Lembar (Standar)">3</button>
          <button class="sheet-slot-btn ${slotCount === 4 ? 'active' : ''}" onclick="changeSheetSlotLayout(${sheet.lembar_ke}, 4)" title="4 Uang per Lembar (Grid)">4</button>
          <button class="sheet-slot-btn ${slotCount === 6 ? 'active' : ''}" onclick="changeSheetSlotLayout(${sheet.lembar_ke}, 6)" title="6 Uang / Koin per Lembar">6</button>
        </div>
      </div>

      <!-- Pockets container -->
      <div class="album-pockets-container slots-${slotCount}">
        ${renderSheetPockets(sheet, side, slotCount)}
      </div>
    </div>
  `;
}

function renderSheetPockets(sheet, side, totalSlots) {
  let html = '';
  const items = sheet.items || [];

  for (let slot = 1; slot <= totalSlots; slot++) {
    const item = items.find(it => it.slot_index === slot);

    if (item) {
      // Photo based on side: OBS or REV
      let photoSrc = '';
      let isFallbackRev = false;

      if (side === 'OBS') {
        photoSrc = item.foto_obv || item.foto_path || '';
      } else {
        photoSrc = item.foto_rev || '';
        if (!photoSrc) {
          // If no separate reverse photo, fallback to obv
          photoSrc = item.foto_obv || item.foto_path || '';
          isFallbackRev = true;
        }
      }

      html += `
        <div class="refill-pocket has-banknote">
          <div class="banknote-slot-content">
            <!-- Floating Quick Actions -->
            <div class="pocket-hover-actions">
              <button class="pocket-btn" onclick="showItemDetailModal(${item.koleksi_id})" title="Lihat Detail Koleksi Lengkap">
                👁️
              </button>
              <button class="pocket-btn btn-remove" onclick="removeSlotItem(${item.album_item_id}, '${escapeHtml(item.nama_item)}')" title="Keluarkan dari Lembar ${sheet.lembar_ke} Slot ${slot}">
                ✕
              </button>
            </div>

            <!-- Banknote Display Stage -->
            <div class="banknote-display-stage" onclick="showItemDetailModal(${item.koleksi_id})" style="cursor: pointer;">
              <span class="banknote-side-indicator badge ${side === 'OBS' ? 'badge-primary' : 'badge-info'}">
                ${side === 'OBS' ? 'DEPAN' : isFallbackRev ? 'BELAKANG (OBV Ref)' : 'BELAKANG'}
              </span>

              ${photoSrc ? `
                <img src="${photoSrc}" class="banknote-photo" alt="${escapeHtml(item.nama_item)}" loading="lazy" onerror="this.onerror=null; this.src='/static/img/logo.png';">
              ` : `
                <div class="banknote-placeholder">
                  <span style="font-size: 2rem;">${getJenisIcon(item.jenis)}</span>
                  <strong style="font-size: 0.82rem; text-align: center;">${escapeHtml(item.nama_item)}</strong>
                  <span style="font-size: 0.7rem; color: var(--text-muted);">${side === 'OBS' ? 'Foto Obverse Kosong' : 'Foto Reverse Kosong'}</span>
                </div>
              `}
            </div>

            <!-- Archival Metadata Strip -->
            <div class="banknote-label-strip">
              <span class="label-title" title="${escapeHtml(item.nama_item)}">${escapeHtml(item.nama_item)}</span>
              <div class="label-meta-tags">
                <span class="label-grade-badge badge badge-grade-${(item.grade||'unc').toLowerCase()}">${escapeHtml(item.grade || '-')}</span>
                <span class="label-year">${escapeHtml(item.tahun || '')}</span>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showItemDetailModal(${item.koleksi_id})" style="padding: 1px 6px; font-size: 0.66rem; margin-left: 2px;">
                  Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Slot kosong
      html += `
        <div class="refill-pocket empty-pocket" onclick="openItemSelectorModal(${sheet.lembar_ke}, ${slot})">
          <div class="empty-pocket-state">
            <span class="empty-pocket-icon">➕</span>
            <span class="empty-pocket-text">Pasang Uang Koleksi</span>
            <span class="empty-pocket-slot-num">Lembar ${sheet.lembar_ke} • Slot ${slot}</span>
          </div>
        </div>
      `;
    }
  }
  return html;
}

// ----------------------------------------------------------------------------
// 6. INTERACTIVE DRAG-TO-FLIP & PROGRAMMATIC 3D SHEET ANIMATION
// ----------------------------------------------------------------------------
function setupDragToFlip() {
  const wrapper = document.getElementById('bookStageWrapper');
  const turnLayer = document.getElementById('interactiveTurnLayer');
  const turnFront = document.getElementById('turnFaceFront');
  const turnBack = document.getElementById('turnFaceBack');
  const shadow = document.getElementById('turnShadowOverlay');

  if (!wrapper || !turnLayer) return;

  let isPointerDown = false;
  let startX = 0;
  let activeDirection = null; // 'next' (grab right, drag left) or 'prev' (grab left, drag right)
  let halfWidth = 0;
  let isAnimating = false;

  wrapper.onpointerdown = (e) => {
    if (isAnimating) return;

    // Abaikan jika target adalah tombol, input, dropdown, atau slot selector
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || 
        e.target.closest('.empty-pocket-state') || e.target.closest('.sheet-slot-configurator') ||
        e.target.closest('.pocket-btn')) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    halfWidth = rect.width / 2;

    const rightSlot = document.getElementById('albumRightSlot');
    const leftSlot = document.getElementById('albumLeftSlot');

    if (clickX > halfWidth && albumState.spreadIndex < albumState.lembaran.length) {
      // Membuka halaman kanan -> drag ke kiri (buka lembar dari kanan ke kiri, jatuh di sebelah kiri)
      isPointerDown = true;
      startX = e.clientX;
      activeDirection = 'next';

      // 1. Salin konten halaman kanan ke muka depan lembar putar
      if (rightSlot) {
        turnFront.innerHTML = rightSlot.innerHTML;
      }

      // 2. Siapkan muka belakang lembar (sisi REV dari lembar yang sedang dibalik)
      const turningSheet = albumState.lembaran[albumState.spreadIndex];
      if (turningSheet) {
        turnBack.innerHTML = renderSheetPanel(turningSheet, 'REV', (albumState.spreadIndex + 1) * 2);
      }

      // 3. Pre-render halaman bawah di sisi kanan (lembar berikutnya atau sampul belakang)
      const nextSheet = albumState.lembaran[albumState.spreadIndex + 1];
      if (rightSlot) {
        rightSlot.innerHTML = nextSheet ? renderSheetPanel(nextSheet, 'OBS', (albumState.spreadIndex + 1) * 2 + 1) : renderInsideBackCover(albumState.currentAlbum);
      }

      turnLayer.className = 'interactive-turn-layer turning-forward';
      turnLayer.style.display = 'block';
      turnLayer.style.transition = 'none';
      turnLayer.style.transform = 'rotateY(0deg)';
      if (shadow) shadow.style.opacity = '0';
      wrapper.setPointerCapture(e.pointerId);

    } else if (clickX <= halfWidth && albumState.spreadIndex > 0) {
      // Membuka halaman kiri -> drag ke kanan (buka lembar dari kiri ke kanan, jatuh di sebelah kanan)
      isPointerDown = true;
      startX = e.clientX;
      activeDirection = 'prev';

      // 1. Salin konten halaman kiri ke muka depan lembar putar
      if (leftSlot) {
        turnFront.innerHTML = leftSlot.innerHTML;
      }

      // 2. Siapkan muka belakang lembar (sisi OBS dari lembar yang dibalik kembali)
      const prevSheet = albumState.lembaran[albumState.spreadIndex - 1];
      if (prevSheet) {
        turnBack.innerHTML = renderSheetPanel(prevSheet, 'OBS', (albumState.spreadIndex * 2) - 1);
      }

      // 3. Pre-render halaman bawah di sisi kiri (lembar sebelumnya atau sampul depan)
      const underSheet = albumState.spreadIndex > 1 ? albumState.lembaran[albumState.spreadIndex - 2] : null;
      if (leftSlot) {
        leftSlot.innerHTML = underSheet ? renderSheetPanel(underSheet, 'REV', (albumState.spreadIndex - 1) * 2) : renderInsideFrontCover(albumState.currentAlbum);
      }

      turnLayer.className = 'interactive-turn-layer turning-backward';
      turnLayer.style.display = 'block';
      turnLayer.style.transition = 'none';
      turnLayer.style.transform = 'rotateY(0deg)';
      if (shadow) shadow.style.opacity = '0';
      wrapper.setPointerCapture(e.pointerId);
    }
  };

  wrapper.onpointermove = (e) => {
    if (!isPointerDown) return;

    const deltaX = e.clientX - startX;
    if (activeDirection === 'next') {
      // Drag halaman kanan ke kiri: deltaX bernilai negatif
      // Sudut rotasi: 0deg s/d -180deg (membuka ke kiri dan jatuh di sebelah kiri)
      const ratio = Math.min(1, Math.max(0, -deltaX / (halfWidth * 0.85)));
      const angle = -(ratio * 180);
      turnLayer.style.transform = `rotateY(${angle}deg)`;
      if (shadow) shadow.style.opacity = Math.sin(ratio * Math.PI) * 0.7;
    } else if (activeDirection === 'prev') {
      // Drag halaman kiri ke kanan: deltaX bernilai positif
      // Sudut rotasi: 0deg s/d +180deg (membuka ke kanan dan jatuh di sebelah kanan)
      const ratio = Math.min(1, Math.max(0, deltaX / (halfWidth * 0.85)));
      const angle = +(ratio * 180);
      turnLayer.style.transform = `rotateY(${angle}deg)`;
      if (shadow) shadow.style.opacity = Math.sin(ratio * Math.PI) * 0.7;
    }
  };

  const endDrag = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    isAnimating = true;
    const deltaX = e.clientX - startX;

    if (activeDirection === 'next') {
      if (-deltaX > halfWidth * 0.2) {
        // Balik lembar tuntas ke kiri (jatuh di halaman sebelah kiri pada -180deg)
        turnLayer.style.transition = 'transform 0.38s cubic-bezier(0.25, 1, 0.5, 1)';
        turnLayer.style.transform = 'rotateY(-180deg)';
        if (shadow) shadow.style.opacity = '0';
        setTimeout(() => {
          albumState.spreadIndex += 1;
          renderAlbumBookView();
          isAnimating = false;
        }, 360);
      } else {
        // Batal balik (kembali jatuh ke halaman sebelah kanan pada 0deg)
        turnLayer.style.transition = 'transform 0.26s ease-out';
        turnLayer.style.transform = 'rotateY(0deg)';
        if (shadow) shadow.style.opacity = '0';
        setTimeout(() => {
          renderAlbumBookView();
          isAnimating = false;
        }, 250);
      }
    } else if (activeDirection === 'prev') {
      if (deltaX > halfWidth * 0.2) {
        // Balik lembar tuntas ke kanan (jatuh di halaman sebelah kanan pada +180deg)
        turnLayer.style.transition = 'transform 0.38s cubic-bezier(0.25, 1, 0.5, 1)';
        turnLayer.style.transform = 'rotateY(180deg)';
        if (shadow) shadow.style.opacity = '0';
        setTimeout(() => {
          albumState.spreadIndex -= 1;
          renderAlbumBookView();
          isAnimating = false;
        }, 360);
      } else {
        // Batal balik (kembali jatuh ke halaman sebelah kiri pada 0deg)
        turnLayer.style.transition = 'transform 0.26s ease-out';
        turnLayer.style.transform = 'rotateY(0deg)';
        if (shadow) shadow.style.opacity = '0';
        setTimeout(() => {
          renderAlbumBookView();
          isAnimating = false;
        }, 250);
      }
    } else {
      isAnimating = false;
    }
    activeDirection = null;
  };

  wrapper.onpointerup = endDrag;
  wrapper.onpointercancel = endDrag;
}

// Programmatic Flip Button Handlers
function flipSpreadNext() {
  if (albumState.spreadIndex >= albumState.lembaran.length) return;
  const turnLayer = document.getElementById('interactiveTurnLayer');
  const turnFront = document.getElementById('turnFaceFront');
  const turnBack = document.getElementById('turnFaceBack');
  const rightSlot = document.getElementById('albumRightSlot');

  if (turnLayer && rightSlot) {
    turnFront.innerHTML = rightSlot.innerHTML;
    const turningSheet = albumState.lembaran[albumState.spreadIndex];
    if (turningSheet) {
      turnBack.innerHTML = renderSheetPanel(turningSheet, 'REV', (albumState.spreadIndex + 1) * 2);
    }

    // Pre-render lembar berikutnya di halaman kanan
    const nextSheet = albumState.lembaran[albumState.spreadIndex + 1];
    rightSlot.innerHTML = nextSheet ? renderSheetPanel(nextSheet, 'OBS', (albumState.spreadIndex + 1) * 2 + 1) : renderInsideBackCover(albumState.currentAlbum);

    turnLayer.className = 'interactive-turn-layer turning-forward';
    turnLayer.style.display = 'block';
    turnLayer.style.transition = 'none';
    turnLayer.style.transform = 'rotateY(0deg)';
    void turnLayer.offsetHeight; // force reflow

    // Buka lembar dari kanan ke kiri hingga jatuh di halaman kiri (-180deg)
    turnLayer.style.transition = 'transform 0.44s cubic-bezier(0.25, 1, 0.5, 1)';
    turnLayer.style.transform = 'rotateY(-180deg)';

    setTimeout(() => {
      albumState.spreadIndex += 1;
      renderAlbumBookView();
    }, 420);
  } else {
    albumState.spreadIndex += 1;
    renderAlbumBookView();
  }
}

function flipSpreadPrev() {
  if (albumState.spreadIndex <= 0) return;
  const turnLayer = document.getElementById('interactiveTurnLayer');
  const turnFront = document.getElementById('turnFaceFront');
  const turnBack = document.getElementById('turnFaceBack');
  const leftSlot = document.getElementById('albumLeftSlot');

  if (turnLayer && leftSlot) {
    turnFront.innerHTML = leftSlot.innerHTML;
    const prevSheet = albumState.lembaran[albumState.spreadIndex - 1];
    if (prevSheet) {
      turnBack.innerHTML = renderSheetPanel(prevSheet, 'OBS', (albumState.spreadIndex * 2) - 1);
    }

    // Pre-render lembar sebelumnya di halaman kiri
    const underSheet = albumState.spreadIndex > 1 ? albumState.lembaran[albumState.spreadIndex - 2] : null;
    leftSlot.innerHTML = underSheet ? renderSheetPanel(underSheet, 'REV', (albumState.spreadIndex - 1) * 2) : renderInsideFrontCover(albumState.currentAlbum);

    turnLayer.className = 'interactive-turn-layer turning-backward';
    turnLayer.style.display = 'block';
    turnLayer.style.transition = 'none';
    turnLayer.style.transform = 'rotateY(0deg)';
    void turnLayer.offsetHeight; // force reflow

    // Buka lembar dari kiri ke kanan hingga jatuh di halaman kanan (+180deg)
    turnLayer.style.transition = 'transform 0.44s cubic-bezier(0.25, 1, 0.5, 1)';
    turnLayer.style.transform = 'rotateY(180deg)';

    setTimeout(() => {
      albumState.spreadIndex -= 1;
      renderAlbumBookView();
    }, 420);
  } else {
    albumState.spreadIndex -= 1;
    renderAlbumBookView();
  }
}

// ----------------------------------------------------------------------------
// 6B. VIEW SIZE MODES (STANDAR vs PAS LAYAR CERDAS / SMART FIT)
// ----------------------------------------------------------------------------

/**
 * Mengubah mode ukuran tampilan album digital (Standar vs Pas Layar)
 */
function setAlbumViewMode(mode) {
  albumState.viewMode = mode;
  try {
    localStorage.setItem('numis_album_view_mode', mode);
  } catch (e) {
    console.warn(e);
  }
  applyAlbumViewMode(mode);
}

/**
 * Menerapkan tata letak sesuai mode tampilan yang dipilih
 */
function applyAlbumViewMode(mode) {
  const container = document.querySelector('.album-viewer-container');
  const wrapper = document.getElementById('bookStageWrapper');
  const btnStandard = document.getElementById('btnViewStandard');
  const btnFit = document.getElementById('btnViewFit');
  const btnFullscreen = document.getElementById('btnViewFullscreen');

  if (!container || !wrapper) return;

  if (btnStandard) btnStandard.classList.toggle('active', mode === 'standard');
  if (btnFit) btnFit.classList.toggle('active', mode === 'fit');
  if (btnFullscreen) btnFullscreen.classList.toggle('active', document.fullscreenElement !== null);

  if (mode === 'fit') {
    container.classList.add('view-mode-fit');
    document.body.classList.add('album-fit-active');
    updateAlbumFitDimensions();
  } else {
    container.classList.remove('view-mode-fit');
    document.body.classList.remove('album-fit-active');
    wrapper.style.height = '';
    wrapper.style.maxHeight = '';
    wrapper.style.maxWidth = '';
  }
}

/**
 * Toggle visibilitas Toolbar Navigasi atas (Hide / Show)
 * Dapat dipanggil dari tombol toolbar, floating restore trigger, atau shortcut keyboard H
 */
function toggleAlbumToolbar(forceShow) {
  if (typeof forceShow === 'boolean') {
    albumState.isToolbarHidden = !forceShow;
  } else {
    albumState.isToolbarHidden = !albumState.isToolbarHidden;
  }
  applyAlbumToolbarVisibility();
}

/**
 * Menerapkan status visibilitas toolbar ke elemen DOM
 */
function applyAlbumToolbarVisibility() {
  const container = document.querySelector('.album-viewer-container');
  const toolbar = document.querySelector('.album-viewer-toolbar');
  const triggerBtn = document.getElementById('btnShowAlbumToolbar');

  if (!container) return;

  if (albumState.isToolbarHidden) {
    container.classList.add('toolbar-hidden');
    if (toolbar) toolbar.style.display = 'none';
    if (triggerBtn) triggerBtn.style.display = 'inline-flex';
  } else {
    container.classList.remove('toolbar-hidden');
    if (toolbar) toolbar.style.display = 'flex';
    if (triggerBtn) triggerBtn.style.display = 'none';
  }

  // Hitung ulang dimensi Pas Layar / Fullscreen bila aktif
  if (albumState.viewMode === 'fit' || document.fullscreenElement) {
    updateAlbumFitDimensions();
  }
}

/**
 * Menghitung ruang layar yang tersedia secara presisi agar seluruh buku album pas di layar
 */
function updateAlbumFitDimensions() {
  const isFs = document.fullscreenElement !== null;
  if (albumState.viewMode !== 'fit' && !isFs) return;
  const wrapper = document.getElementById('bookStageWrapper');
  const toolbar = document.querySelector('.album-viewer-toolbar');
  if (!wrapper) return;

  const bottomGap = isFs ? 10 : 14;
  let availHeight;

  if (toolbar && !albumState.isToolbarHidden) {
    const toolbarRect = toolbar.getBoundingClientRect();
    availHeight = Math.max(380, window.innerHeight - toolbarRect.bottom - bottomGap);
  } else {
    // Saat toolbar disembunyikan: gunakan seluruh ruang vertikal
    const topGap = isFs ? 14 : ((document.querySelector('.top-header')?.offsetHeight || 64) + 14);
    availHeight = Math.max(380, window.innerHeight - topGap - bottomGap);
  }
  
  // Proporsi binder 2-halaman (aspek rasio sekitar 1.68 - 1.74)
  const contentArea = document.getElementById('contentArea');
  const availWidth = Math.min(1500, (contentArea ? contentArea.clientWidth : window.innerWidth) - 20);
  const maxW = Math.min(availWidth, availHeight * 1.72);

  wrapper.style.height = `${availHeight}px`;
  wrapper.style.maxHeight = `${availHeight}px`;
  wrapper.style.maxWidth = `${maxW}px`;
}

/**
 * Mode Layar Penuh (Immersif Fullscreen)
 */
async function toggleAlbumFullscreen() {
  try {
    if (!document.fullscreenElement) {
      const container = document.documentElement;
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        await container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        await container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('Fullscreen error:', err);
    showToast('Mode fullscreen tidak didukung atau dibatasi oleh browser', 'info');
  }
}

// Global window event listeners for smart fit and fullscreen
if (!window._albumViewEventsBound) {
  window.addEventListener('resize', () => {
    if (albumState.viewMode === 'fit' || document.fullscreenElement) {
      updateAlbumFitDimensions();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFs = document.fullscreenElement !== null;
    const btnFs = document.getElementById('btnViewFullscreen');
    if (btnFs) btnFs.classList.toggle('active', isFs);
    if (albumState.viewMode === 'fit' || isFs) {
      setTimeout(updateAlbumFitDimensions, 100);
    }
  });

  window._albumViewEventsBound = true;
}

// ----------------------------------------------------------------------------
// 7. PER-SHEET CONFIGURATION & ADDING SHEETS
// ----------------------------------------------------------------------------
async function changeSheetSlotLayout(lembarKe, slots) {
  if (!albumState.currentAlbum) return;

  try {
    await API.put(`/album/${albumState.currentAlbum.id}/lembar/${lembarKe}`, {
      slot_count: slots
    });

    // Update local sheet object
    const sheet = albumState.lembaran.find(s => s.lembar_ke === lembarKe);
    if (sheet) {
      sheet.slot_count = slots;
    }

    renderAlbumBookView();
    showToast(`Lembar ke-${lembarKe} diubah menjadi ${slots} slot uang`, 'info', 1800);
  } catch (err) {
    showToast('Gagal mengubah layout lembar: ' + err.message, 'error');
  }
}

async function addNewSheetModal() {
  if (!albumState.currentAlbum) return;
  const nextSheetNum = albumState.lembaran.length + 1;

  try {
    await API.post(`/album/${albumState.currentAlbum.id}/lembar`, {
      slot_count: albumState.currentAlbum.slot_per_halaman || 3
    });

    showToast(`Lembar ke-${nextSheetNum} berhasil ditambahkan!`, 'success');
    
    // Refresh album
    const data = await API.get(`/album/${albumState.currentAlbum.id}`);
    albumState.currentAlbum = data.album;
    albumState.lembaran = data.lembaran || [];
    renderAlbumBookView();
  } catch (err) {
    showToast('Gagal menambah lembar: ' + err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// 8. ITEM SELECTOR MODAL (MEMASANG ITEM KE LEMBAR & SLOT)
// ----------------------------------------------------------------------------
async function openItemSelectorModal(lembarKe, slotIndex) {
  albumState.selectedSlot = { lembar_ke: lembarKe, slot_index: slotIndex };
  albumState.picker = {
    showSearch: true,
    showFilter: false,
    search: '',
    jenis: '',
    grade: '',
    negara: '',
    tahun: ''
  };

  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');

  container.className = 'modal-container modal-picker-wide';
  container.innerHTML = `
    <div class="modal-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:1.3rem;">📖</span>
        <div>
          <h3 style="margin:0; font-size:1.1rem; color:var(--text-primary);">Pilih Koleksi untuk Lembar ${lembarKe} • Slot ${slotIndex}</h3>
          <span style="font-size:0.75rem; color:var(--text-muted);">Pilih uang dari daftar koleksi untuk dimasukkan ke dalam refill sleeve</span>
        </div>
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="padding: 16px 20px;">
      <!-- Toolbar with Search & Filter Toggle Buttons -->
      <div class="album-picker-toolbar">
        <div class="album-picker-actions">
          <!-- Toggle Search Button (Icon Kaca Pembesar) -->
          <button type="button" class="picker-toggle-btn active" id="btnTogglePickerSearch" onclick="togglePickerSearch()" title="Tampilkan / Sembunyikan Pencarian">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Cari</span>
          </button>

          <!-- Toggle Filter Button (Icon Corong) -->
          <button type="button" class="picker-toggle-btn" id="btnTogglePickerFilter" onclick="togglePickerFilter()" title="Tampilkan / Sembunyikan Filter Kategori">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filter</span>
            <span id="pickerFilterBadge" class="badge" style="display:none; font-size:10px; padding:1px 5px; background:var(--gold-primary); color:#0a0c10; font-weight:700;"></span>
          </button>

          <!-- Reset Button -->
          <button type="button" class="btn btn-secondary btn-sm" id="btnResetPicker" onclick="resetPickerFilters()" style="display:none; padding:4px 10px; font-size:11.5px;">
            🔄 Reset
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span id="pickerResultCount" style="font-size:12px; color:var(--text-secondary); font-weight:500;">Memuat koleksi...</span>
        </div>
      </div>

      <!-- Collapsible Search Bar (Show/Hide) -->
      <div id="pickerSearchPanel" class="picker-panel-collapsible show">
        <div class="picker-search-wrapper">
          <span class="picker-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input 
            type="text" 
            id="albumPickerSearch" 
            class="form-control picker-search-input" 
            placeholder="Cari berdasarkan nama uang, nomor seri, kode, tahun, grade, negara..." 
            oninput="handlePickerSearch(this.value)"
            autocomplete="off"
          >
          <button type="button" id="btnClearSearch" onclick="clearPickerSearch()" style="position:absolute; right:10px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; display:none;">✕</button>
        </div>
      </div>

      <!-- Collapsible Filter Panel (Show/Hide via Corong) -->
      <div id="pickerFilterPanel" class="picker-panel-collapsible">
        <div class="picker-filter-grid">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px; margin-bottom:3px; color:var(--text-muted);">Jenis Item</label>
            <select id="pickerFilterJenis" class="form-select form-select-sm" onchange="handlePickerFilterChange()">
              <option value="">Semua Jenis</option>
              <option value="uang_kertas">💵 Uang Kertas</option>
              <option value="uang_polymer">💎 Uang Polymer</option>
              <option value="uang_hybrid">📜 Uang Hybrid</option>
              <option value="koin">🪙 Koin</option>
              <option value="dokumen">📑 Dokumen</option>
            </select>
          </div>

          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px; margin-bottom:3px; color:var(--text-muted);">Grade / Kondisi</label>
            <select id="pickerFilterGrade" class="form-select form-select-sm" onchange="handlePickerFilterChange()">
              <option value="">Semua Grade</option>
              <option value="UNC">UNC</option>
              <option value="AUNC">AUNC</option>
              <option value="XF">XF</option>
              <option value="AXF">AXF</option>
              <option value="VF">VF</option>
              <option value="AVF">AVF</option>
              <option value="F">F</option>
              <option value="VG">VG</option>
              <option value="G">G</option>
            </select>
          </div>

          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px; margin-bottom:3px; color:var(--text-muted);">Negara</label>
            <select id="pickerFilterNegara" class="form-select form-select-sm" onchange="handlePickerFilterChange()">
              <option value="">Semua Negara</option>
            </select>
          </div>

          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px; margin-bottom:3px; color:var(--text-muted);">Tahun Emisi</label>
            <input type="text" id="pickerFilterTahun" class="form-control form-control-sm" placeholder="Contoh: 1975" oninput="handlePickerFilterChange()">
          </div>
        </div>
      </div>

      <!-- Container for Items List -->
      <div id="albumPickerContainer">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  overlay.classList.remove('hidden');

  try {
    const res = await API.get('/koleksi?page=1&limit=200');
    albumState.koleksiList = (res && res.data) ? res.data : [];
    populatePickerNegaraOptions();
    renderPickerCards();
  } catch (err) {
    document.getElementById('albumPickerContainer').innerHTML = `
      <p style="color: var(--danger); text-align: center; padding: 20px;">Gagal memuat data koleksi: ${err.message}</p>
    `;
  }
}

function togglePickerSearch() {
  if (!albumState.picker) return;
  albumState.picker.showSearch = !albumState.picker.showSearch;
  const panel = document.getElementById('pickerSearchPanel');
  const btn = document.getElementById('btnTogglePickerSearch');
  if (panel) {
    panel.classList.toggle('show', albumState.picker.showSearch);
    if (albumState.picker.showSearch) {
      setTimeout(() => document.getElementById('albumPickerSearch')?.focus(), 50);
    }
  }
  if (btn) btn.classList.toggle('active', albumState.picker.showSearch);
}

function togglePickerFilter() {
  if (!albumState.picker) return;
  albumState.picker.showFilter = !albumState.picker.showFilter;
  const panel = document.getElementById('pickerFilterPanel');
  const btn = document.getElementById('btnTogglePickerFilter');
  if (panel) panel.classList.toggle('show', albumState.picker.showFilter);
  if (btn) btn.classList.toggle('active', albumState.picker.showFilter);
}

function clearPickerSearch() {
  const input = document.getElementById('albumPickerSearch');
  if (input) input.value = '';
  handlePickerSearch('');
}

function handlePickerSearch(val) {
  if (!albumState.picker) return;
  albumState.picker.search = (val || '').toLowerCase().trim();
  const clearBtn = document.getElementById('btnClearSearch');
  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
  renderPickerCards();
}

function handlePickerFilterChange() {
  if (!albumState.picker) return;
  albumState.picker.jenis = document.getElementById('pickerFilterJenis')?.value || '';
  albumState.picker.grade = document.getElementById('pickerFilterGrade')?.value || '';
  albumState.picker.negara = document.getElementById('pickerFilterNegara')?.value || '';
  albumState.picker.tahun = (document.getElementById('pickerFilterTahun')?.value || '').trim();
  renderPickerCards();
}

function resetPickerFilters() {
  if (!albumState.picker) return;
  albumState.picker.search = '';
  albumState.picker.jenis = '';
  albumState.picker.grade = '';
  albumState.picker.negara = '';
  albumState.picker.tahun = '';

  const sInput = document.getElementById('albumPickerSearch'); if (sInput) sInput.value = '';
  const clearBtn = document.getElementById('btnClearSearch'); if (clearBtn) clearBtn.style.display = 'none';
  const jSelect = document.getElementById('pickerFilterJenis'); if (jSelect) jSelect.value = '';
  const gSelect = document.getElementById('pickerFilterGrade'); if (gSelect) gSelect.value = '';
  const nSelect = document.getElementById('pickerFilterNegara'); if (nSelect) nSelect.value = '';
  const tInput = document.getElementById('pickerFilterTahun'); if (tInput) tInput.value = '';

  renderPickerCards();
}

function populatePickerNegaraOptions() {
  const select = document.getElementById('pickerFilterNegara');
  if (!select || !albumState.koleksiList) return;
  const countries = Array.from(new Set(albumState.koleksiList.map(it => it.negara || 'Indonesia'))).filter(Boolean).sort();
  select.innerHTML = '<option value="">Semua Negara</option>' + countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function renderPickerCards() {
  const container = document.getElementById('albumPickerContainer');
  if (!container) return;

  const p = albumState.picker || {};
  const query = p.search || '';
  const jenis = p.jenis || '';
  const grade = p.grade || '';
  const negara = p.negara || '';
  const tahun = p.tahun || '';

  // Calculate active filter count
  let filterCount = 0;
  if (jenis) filterCount++;
  if (grade) filterCount++;
  if (negara) filterCount++;
  if (tahun) filterCount++;

  const badgeEl = document.getElementById('pickerFilterBadge');
  if (badgeEl) {
    if (filterCount > 0) {
      badgeEl.textContent = filterCount;
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  const resetBtn = document.getElementById('btnResetPicker');
  if (resetBtn) {
    resetBtn.style.display = (query || filterCount > 0) ? 'inline-flex' : 'none';
  }

  const filtered = (albumState.koleksiList || []).filter(item => {
    if (jenis && item.jenis !== jenis) return false;
    if (grade && item.grade !== grade) return false;
    if (negara && (item.negara || 'Indonesia') !== negara) return false;
    if (tahun && !(item.tahun || '').includes(tahun)) return false;
    if (query) {
      const match = (item.nama_item || '').toLowerCase().includes(query) ||
                    (item.nomor_seri || '').toLowerCase().includes(query) ||
                    (item.kode_item || '').toLowerCase().includes(query) ||
                    (item.tahun || '').toLowerCase().includes(query) ||
                    (item.grade || '').toLowerCase().includes(query) ||
                    (item.negara || '').toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  const countEl = document.getElementById('pickerResultCount');
  if (countEl) {
    countEl.textContent = `Menampilkan ${filtered.length} dari ${albumState.koleksiList.length} koleksi`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 35px 20px;">
        <span style="font-size: 2rem;">🔍</span>
        <p style="margin-top: 8px; color: var(--text-secondary); font-size: 0.9rem;">Tidak ada koleksi yang cocok dengan kata kunci atau filter.</p>
        <button class="btn btn-secondary btn-sm" onclick="resetPickerFilters()" style="margin-top: 10px;">Reset Pencarian & Filter</button>
      </div>
    `;
    return;
  }

  const html = `
    <div class="album-picker-list">
      ${filtered.map(it => {
        const thumb = it.foto_obv || it.foto_path || '';
        return `
          <div class="album-picker-card" onclick="assignItemToSlot(${it.id})" title="Klik untuk pasang ${escapeHtml(it.nama_item)} ke slot ini">
            <div class="album-picker-thumb">
              ${thumb ? `
                <img src="${thumb}" alt="${escapeHtml(it.nama_item)}" loading="lazy" onerror="this.onerror=null; this.src='/static/img/logo.png';">
              ` : `
                <span style="font-size: 1.6rem;">${getJenisIcon(it.jenis)}</span>
              `}
            </div>
            <div class="album-picker-meta">
              <div class="title" title="${escapeHtml(it.nama_item)}">${escapeHtml(it.nama_item)}</div>
              <div class="sub">
                <span class="badge badge-grade-${(it.grade||'unc').toLowerCase()}" style="font-size: 0.65rem; padding: 1px 5px;">${escapeHtml(it.grade || '-')}</span>
                <span>${escapeHtml(it.tahun || '-')}</span>
                <span>• ${escapeHtml(it.negara || 'Indonesia')}</span>
              </div>
              <div class="serial-text">
                ${it.nomor_seri ? `SN: ${escapeHtml(it.nomor_seri)}` : (it.kode_item ? escapeHtml(it.kode_item) : '-')}
              </div>
            </div>
            <button class="btn btn-primary btn-sm album-picker-btn" onclick="event.stopPropagation(); assignItemToSlot(${it.id})">
              + Pilih
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.innerHTML = html;
}

// Assign item to target slot
async function assignItemToSlot(koleksiId) {
  if (!albumState.currentAlbum || !albumState.selectedSlot) return;

  const { lembar_ke, slot_index } = albumState.selectedSlot;
  try {
    await API.post(`/album/${albumState.currentAlbum.id}/items`, {
      koleksi_id: koleksiId,
      lembar_ke,
      slot_index
    });

    closeModal();
    showToast(`Uang berhasil dipasang di Lembar ${lembar_ke} Slot ${slot_index}!`, 'success');
    
    // Refresh album
    const updated = await API.get(`/album/${albumState.currentAlbum.id}`);
    albumState.currentAlbum = updated.album;
    albumState.lembaran = updated.lembaran || [];
    renderAlbumBookView();
  } catch (err) {
    showToast('Gagal memasang item: ' + err.message, 'error');
  }
}

// Remove item from slot
async function removeSlotItem(albumItemId, itemName) {
  if (!confirm(`Keluarkan koleksi "${itemName}" dari slot lembar ini?`)) return;

  try {
    await API.delete(`/album/${albumState.currentAlbum.id}/items/${albumItemId}`);
    showToast('Item berhasil dikeluarkan dari slot', 'info');
    
    // Refresh album
    const updated = await API.get(`/album/${albumState.currentAlbum.id}`);
    albumState.currentAlbum = updated.album;
    albumState.lembaran = updated.lembaran || [];
    renderAlbumBookView();
  } catch (err) {
    showToast('Gagal mengeluarkan item: ' + err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// 9. ITEM INSPECTOR MODAL (DETAIL LENGKAP KOLEKSI)
// ----------------------------------------------------------------------------
async function showItemDetailModal(koleksiId) {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');

  container.className = 'modal-container modal-detail-wide';
  container.innerHTML = `
    <div class="modal-header">
      <h3>Memuat Detail Koleksi...</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="padding: 40px; text-align: center;">
      <div class="loading-spinner"></div>
    </div>
  `;
  overlay.classList.remove('hidden');

  try {
    const item = await API.get(`/koleksi/${koleksiId}`);
    if (!item) throw new Error('Data tidak ditemukan');

    const photoObv = item.foto_obv || item.foto_path || '';
    const photoRev = item.foto_rev || '';

    container.className = 'modal-container modal-detail-wide';
    container.innerHTML = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.8rem;">${getJenisIcon(item.jenis)}</span>
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-primary); font-weight: 700;">${escapeHtml(item.nama_item)}</h3>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px;">
              <span style="font-size: 0.8rem; color: var(--gold-light); font-weight: 600; font-family: monospace;">${escapeHtml(item.kode_item || ('ITM-' + item.id))}</span>
              ${item.nomor_seri ? `<span style="font-size: 0.78rem; color: var(--text-secondary); font-family: monospace;">• SN: ${escapeHtml(item.nomor_seri)}</span>` : ''}
              <span class="badge badge-grade-${(item.grade||'unc').toLowerCase()}" style="font-size: 0.65rem; padding: 1px 6px;">${escapeHtml(item.grade || '-')}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">• ${escapeHtml(item.negara || 'Indonesia')}</span>
            </div>
          </div>
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div class="modal-body" style="padding: 16px 22px;">
        <div class="album-detail-modal-body">
          <!-- Left: High-Res Dual Photos (Obverse & Reverse) -->
          <div class="album-detail-photos">
            <div class="album-detail-photo-box">
              <span class="album-detail-photo-tag">TAMPAK DEPAN (OBVERSE)</span>
              ${photoObv ? `
                <img src="${photoObv}" alt="Obverse" onclick="openGlobalLightbox('${photoObv}', '${escapeHtml(item.nama_item)} - Obverse')" style="cursor: zoom-in;" title="Klik untuk memperbesar gambar" onerror="this.onerror=null; this.src='/static/img/logo.png';">
              ` : `
                <div style="color: var(--text-muted); font-size: 0.82rem; padding: 25px 0;">Foto Obverse belum tersedia</div>
              `}
            </div>

            <div class="album-detail-photo-box">
              <span class="album-detail-photo-tag">TAMPAK BELAKANG (REVERSE)</span>
              ${photoRev ? `
                <img src="${photoRev}" alt="Reverse" onclick="openGlobalLightbox('${photoRev}', '${escapeHtml(item.nama_item)} - Reverse')" style="cursor: zoom-in;" title="Klik untuk memperbesar gambar" onerror="this.onerror=null; this.src='/static/img/logo.png';">
              ` : `
                <div style="color: var(--text-muted); font-size: 0.82rem; padding: 25px 0;">Foto Reverse belum tersedia</div>
              `}
            </div>
          </div>

          <!-- Right: Complete Specifications Grid -->
          <div class="album-detail-info">
            <div class="album-detail-info-grid">
              <div class="album-detail-cell">
                <div class="label">Nomor Seri (SN)</div>
                <div class="value" style="color: var(--gold-light); font-family: monospace;">${escapeHtml(item.nomor_seri || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Grade / Kondisi</div>
                <div class="value">
                  <span class="badge badge-grade-${(item.grade||'unc').toLowerCase()}" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(item.grade || '-')}</span>
                </div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Tahun Emisi</div>
                <div class="value">${escapeHtml(item.tahun || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Denominasi</div>
                <div class="value">${escapeHtml(item.denominasi || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Jenis Koleksi</div>
                <div class="value">${formatJenis(item.jenis)}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Asal Negara</div>
                <div class="value">${escapeHtml(item.negara || 'Indonesia')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Percetakan / Emisi</div>
                <div class="value">${escapeHtml(item.cetakan || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Bahan / Material</div>
                <div class="value">${escapeHtml(item.bahan || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Dimensi / Ukuran</div>
                <div class="value">${escapeHtml(item.dimensi || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Kondisi Fisik</div>
                <div class="value">${escapeHtml(item.kondisi_fisik || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Lokasi Simpan</div>
                <div class="value">${escapeHtml(item.lokasi_simpan || '-')}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Status Koleksi</div>
                <div class="value">
                  <span class="badge ${item.status_koleksi === 'koleksi_pribadi' ? 'badge-primary' : 'badge-success'}" style="font-size: 0.68rem;">
                    ${item.status_koleksi === 'koleksi_pribadi' ? '⭐ Koleksi Pribadi' : '🏷️ Stok Jual'}
                  </span>
                </div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Nilai HPP / Pcs</div>
                <div class="value" style="color: var(--success);">${formatRupiah(item.hpp_per_pcs || item.hpp)}</div>
              </div>
              <div class="album-detail-cell">
                <div class="label">Harga Penawaran</div>
                <div class="value" style="color: var(--gold-light);">${item.harga_jual ? formatRupiah(item.harga_jual) : '-'}</div>
              </div>
            </div>

            ${item.detail || item.catatan_internal ? `
              <div style="background: rgba(18, 22, 30, 0.7); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px;">
                <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Keterangan &amp; Catatan Khusus</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; white-space: pre-wrap;">${escapeHtml(item.detail || item.catatan_internal)}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 22px; justify-content: space-between;">
        <span style="font-size: 0.76rem; color: var(--text-muted);">
          🔍 Klik foto untuk membuka zoom resolusi penuh (Lightbox)
        </span>
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Tutup</button>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="modal-header">
        <h3>Terjadi Kesalahan</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body" style="padding: 24px; color: var(--danger);">
        ${err.message}
      </div>
    `;
  }
}

// ----------------------------------------------------------------------------
// 10. CREATE, EDIT, AND DELETE ALBUM
// ----------------------------------------------------------------------------
function showCreateAlbumModal() {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');

  container.innerHTML = `
    <div class="modal-header">
      <h3>✨ Buat Album Binder Baru</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <form id="createAlbumForm" onsubmit="handleCreateAlbum(event)">
        <div class="form-group">
          <label class="form-label">Nama Album *</label>
          <input type="text" id="albumNama" class="form-control" placeholder="Contoh: Seri Uang Kertas Soekarno 1960" required>
        </div>

        <div class="form-group">
          <label class="form-label">Deskripsi / Tema Koleksi</label>
          <textarea id="albumDeskripsi" class="form-control" rows="2" placeholder="Catatan singkat mengenai koleksi dalam album ini..."></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Slot Bawaan per Lembar</label>
            <select id="albumSlotPerHalaman" class="form-select">
              <option value="1">1 Uang per Lembar (Besar)</option>
              <option value="2">2 Uang per Lembar</option>
              <option value="3" selected>3 Uang per Lembar (Standar Refill)</option>
              <option value="4">4 Uang per Lembar (Grid 2x2)</option>
              <option value="6">6 Uang / Koin per Lembar</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Tema Warna Sampul</label>
            <select id="albumTemaWarna" class="form-select" onchange="previewSelectedTheme(this.value)">
              ${renderThemeOptions('gold')}
            </select>
            <div id="themePreviewBox" class="album-card-cover album-cover-gold" style="margin-top: 10px; height: 38px; border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.8); color: #fff;">
              Pratinjau Tekstur &amp; Warna Sampul
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan &amp; Buka Album</button>
        </div>
      </form>
    </div>
  `;
  overlay.classList.remove('hidden');
}

async function handleCreateAlbum(e) {
  e.preventDefault();
  const nama = document.getElementById('albumNama').value.trim();
  const deskripsi = document.getElementById('albumDeskripsi').value.trim();
  const slot_per_halaman = parseInt(document.getElementById('albumSlotPerHalaman').value) || 3;
  const tema_warna = document.getElementById('albumTemaWarna').value;

  if (!nama) {
    showToast('Nama album wajib diisi', 'warning');
    return;
  }

  try {
    const res = await API.post('/album/', {
      nama_album: nama,
      deskripsi,
      slot_per_halaman,
      tema_warna
    });

    closeModal();
    showToast('Album berhasil dibuat!', 'success');
    openAlbum(res.id);
  } catch (err) {
    showToast('Gagal membuat album: ' + err.message, 'error');
  }
}

async function showEditAlbumModal(albumId) {
  let album = albumState.albums ? albumState.albums.find(a => a.id === albumId) : null;
  if (!album && albumState.currentAlbum && albumState.currentAlbum.id === albumId) {
    album = albumState.currentAlbum;
  }
  if (!album) {
    try {
      album = await API.get(`/album/${albumId}`);
    } catch (err) {
      showToast('Gagal memuat album: ' + err.message, 'error');
      return;
    }
  }

  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  const currentTheme = album.tema_warna || 'burgundy';
  const initialThemeClass = getAlbumThemeClass(currentTheme);

  container.innerHTML = `
    <div class="modal-header">
      <h3>🎨 Pengaturan &amp; Tema Sampul Album</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <form id="editAlbumForm" onsubmit="handleEditAlbum(event, ${albumId})">
        <div class="form-group">
          <label class="form-label">Nama Album *</label>
          <input type="text" id="editAlbumNama" class="form-control" value="${escapeHtml(album.nama_album)}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Deskripsi / Tema Koleksi</label>
          <textarea id="editAlbumDeskripsi" class="form-control" rows="2">${escapeHtml(album.deskripsi || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tema Warna Sampul Binder</label>
          <select id="editAlbumTemaWarna" class="form-select" onchange="previewSelectedTheme(this.value)">
            ${renderThemeOptions(currentTheme)}
          </select>
          <div id="themePreviewBox" class="album-card-cover ${initialThemeClass}" style="margin-top: 10px; height: 38px; border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.8); color: #fff;">
            Pratinjau Tekstur &amp; Warna Sampul
          </div>
        </div>

        <div class="modal-footer" style="padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan &amp; Terapkan Tema</button>
        </div>
      </form>
    </div>
  `;
  overlay.classList.remove('hidden');
}

async function handleEditAlbum(e, albumId) {
  e.preventDefault();
  const nama = document.getElementById('editAlbumNama').value.trim();
  const deskripsi = document.getElementById('editAlbumDeskripsi').value.trim();
  const tema_warna = document.getElementById('editAlbumTemaWarna').value;

  try {
    await API.put(`/album/${albumId}`, {
      nama_album: nama,
      deskripsi,
      tema_warna
    });

    closeModal();
    showToast('Tema dan pengaturan album berhasil diperbarui!', 'success');

    // Update in-memory album list if exists
    if (albumState.albums) {
      const it = albumState.albums.find(a => a.id === albumId);
      if (it) {
        it.nama_album = nama;
        it.deskripsi = deskripsi;
        it.tema_warna = tema_warna;
      }
    }

    // Jika user sedang berada di dalam tampilan buku album yang diedit:
    if (albumState.currentAlbum && albumState.currentAlbum.id === albumId) {
      albumState.currentAlbum.nama_album = nama;
      albumState.currentAlbum.deskripsi = deskripsi;
      albumState.currentAlbum.tema_warna = tema_warna;

      // Update langsung elemen DOM buku jika ada
      const bookEl = document.getElementById('binderBookElement');
      if (bookEl) {
        ALBUM_THEMES.forEach(t => {
          bookEl.classList.remove(getAlbumThemeClass(t.value));
        });
        bookEl.classList.remove('album-cover-burgundy', 'album-cover-navy', 'album-cover-leather', 'album-cover-emerald', 'album-cover-onyx');
        bookEl.classList.add(getAlbumThemeClass(tema_warna));
      }
      renderAlbumBookView();
    } else {
      loadAlbum();
    }
  } catch (err) {
    showToast('Gagal memperbarui album: ' + err.message, 'error');
  }
}

async function deleteAlbum(albumId, albumName) {
  if (!confirm(`Hapus album "${albumName}" beserta seluruh susunan halamannya?\n(Koleksi uang Anda tidak akan terhapus dari sistem)`)) {
    return;
  }

  try {
    await API.delete(`/album/${albumId}`);
    showToast('Album berhasil dihapus', 'info');
    loadAlbum();
  } catch (err) {
    showToast('Gagal menghapus album: ' + err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// HELPER UTILITIES
// ----------------------------------------------------------------------------
function getJenisIcon(jenis) {
  const map = {
    uang_kertas: '💵',
    uang_polymer: '💶',
    uang_hybrid: '💷',
    koin: '🪙',
    dokumen: '📜',
    perlengkapan: '🗃️'
  };
  return map[jenis] || '🪙';
}

function formatJenis(jenis) {
  const map = {
    uang_kertas: 'Uang Kertas',
    uang_polymer: 'Uang Polymer',
    uang_hybrid: 'Uang Hybrid',
    koin: 'Koin',
    dokumen: 'Dokumen / Sertifikat',
    perlengkapan: 'Perlengkapan'
  };
  return map[jenis] || jenis || '-';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global keyboard navigation: ArrowLeft / ArrowRight to flip pages, H to toggle toolbar, F for fullscreen
document.addEventListener('keydown', (e) => {
  if (albumState.currentAlbum && document.getElementById('bookStageWrapper')) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight') {
      flipSpreadNext();
    } else if (e.key === 'ArrowLeft') {
      flipSpreadPrev();
    } else if (e.key === 'h' || e.key === 'H') {
      toggleAlbumToolbar();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleAlbumFullscreen();
    }
  }
});
