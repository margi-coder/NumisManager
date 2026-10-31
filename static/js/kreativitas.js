/**
 * static/js/kreativitas.js
 * Studio Kreativitas Numismatik:
 * 1. Collage Maker (Kolase foto item koleksi manual / filter / filter + manual)
 * 2. Slide Show Maker (Video slideshow animasi dengan aneka transisi, player langsung, musik latar bervariasi melodi, dan aneka format ekspor MP4/WebM/MKV)
 */

window.KreativitasState = {
  activeTab: 'collage', // 'collage' | 'slideshow'
  selectedItems: [], // array of { uid, koleksi_id, nama_item, kode_item, tahun, grade, denominasi, negara, jenis, sisi, foto_url, imgObj }
  groupItemsList: [],
  batchesList: [],

  // Collage Config
  collageConfig: {
    ratio: '1:1',        // '1:1', '4:5', '9:16', '16:9', '4:3', 'A4'
    layout: 'auto',      // 'auto', '1-col', '2-col', '3-col', '4-col', 'side-by-side', 'hero'
    gap: 16,             // px
    padding: 24,         // px
    radius: 12,          // px
    bgType: 'dark-luxury', // 'dark-luxury', 'gold-dark', 'black', 'white', 'royal-blue', 'custom'
    customBgColor: '#0f172a',
    shadow: true,
    fitMode: 'cover',    // 'cover', 'contain'
    watermarkText: 'NumisManager Collection',
    watermarkPos: 'header', // 'header', 'footer', 'bottom-right', 'none'
    showBadges: true,
    qualityScale: 1.0
  },

  // Slideshow Config
  slideshowConfig: {
    ratio: '16:9',       // '16:9', '9:16', '1:1'
    duration: 3,         // seconds per slide
    transition: 'crossfade', // 'crossfade', 'slide-left', 'slide-up', 'zoom', 'fade-black', 'coin-flip', 'cut'
    transitionDuration: 0.8, // seconds
    showInfoOverlay: true,
    bgColor: '#0a0c10',
    // Audio options with rich melodic themes
    audioTheme: 'museum', // 'museum', 'royal', 'lofi', 'chimes', 'nusantara', 'custom', 'none'
    audioVolume: 0.8,
    customAudioFile: null,
    customAudioUrl: null,
    customAudioName: '',
    // Video Export Format options
    exportFormat: 'mp4',  // 'mp4', 'webm', 'mkv'
    exportResolution: '1080p', // '1080p', '720p'
    exportBitrate: 5000000     // 5 Mbps
  },

  // Slideshow Player State
  player: {
    isPlaying: false,
    currentTime: 0,      // in seconds
    animFrameId: null,
    lastFrameTime: null,
    recorder: null,
    isRecording: false,
    recordedChunks: []
  },

  // Image preloading cache
  imageCache: new Map()
};

/**
 * Advanced Web Audio Melodic Synthesizer Engine
 * Menghasilkan alunan melodi, tangga nada, progresi akor, dan ritme yang bervariasi
 * sesuai dengan tema yang dipilih, bukan sekadar variasi tone/alat musik saja.
 */
const NumisAudioEngine = {
  ctx: null,
  masterGain: null,
  streamDest: null,
  customAudio: null,
  customAudioSource: null,
  activeNodes: [],
  melodyTimeouts: [],
  intervalId: null,
  isPlaying: false,
  isPreviewingTest: false,

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = window.KreativitasState.slideshowConfig.audioVolume || 0.8;
        this.streamDest = this.ctx.createMediaStreamDestination();

        // Connect masterGain to both speakers and streamDest for video recording
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.connect(this.streamDest);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  setVolume(val) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(val, this.ctx ? this.ctx.currentTime : 0);
    }
    if (this.customAudio) {
      this.customAudio.volume = val;
    }
  },

  getAudioTrack() {
    this.init();
    if (this.streamDest && this.streamDest.stream) {
      const tracks = this.streamDest.stream.getAudioTracks();
      if (tracks.length > 0) return tracks[0];
    }
    return null;
  },

  play(timeOffset = 0) {
    this.init();
    if (!this.ctx) return;
    this.stopSynth();
    this.isPlaying = true;

    const audioTheme = window.KreativitasState.slideshowConfig.audioTheme || 'museum';
    if (audioTheme === 'none') return;

    if (audioTheme === 'custom') {
      if (window.KreativitasState.slideshowConfig.customAudioUrl) {
        if (!this.customAudio) {
          this.customAudio = new Audio(window.KreativitasState.slideshowConfig.customAudioUrl);
          this.customAudio.loop = true;
          this.customAudio.crossOrigin = 'anonymous';
          try {
            this.customAudioSource = this.ctx.createMediaElementSource(this.customAudio);
            this.customAudioSource.connect(this.masterGain);
          } catch (e) {}
        }
        if (this.customAudio.duration) {
          this.customAudio.currentTime = timeOffset % this.customAudio.duration;
        }
        this.customAudio.play().catch(() => {});
      }
      return;
    }

    this.startMelodicTheme(audioTheme, timeOffset);
  },

  pause() {
    this.isPlaying = false;
    if (this.customAudio) {
      this.customAudio.pause();
    }
    this.stopSynth();
  },

  seek(timeSec) {
    if (this.customAudio && this.customAudio.duration) {
      this.customAudio.currentTime = timeSec % this.customAudio.duration;
    }
  },

  stop() {
    this.isPlaying = false;
    this.isPreviewingTest = false;
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio.currentTime = 0;
    }
    this.stopSynth();
    const btnTest = document.getElementById('btnTestAudioPreview');
    if (btnTest) btnTest.textContent = '🔊 Tes Audio';
  },

  stopSynth() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.melodyTimeouts.forEach(t => clearTimeout(t));
    this.melodyTimeouts = [];

    this.activeNodes.forEach(node => {
      try { node.stop(); } catch (e) {}
      try { node.disconnect(); } catch (e) {}
    });
    this.activeNodes = [];
  },

  /**
   * Main melodic synthesizer with distinct melodic progression, scales, rhythm, and chords per theme
   */
  startMelodicTheme(theme, offsetSec = 0) {
    this.stopSynth();
    if (!this.ctx) return;

    const playTone = (freq, startTime, duration, type = 'sine', peakGain = 0.15, filterFreq = 1200, isPluck = false) => {
      if (!this.isPlaying || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, startTime);
      if (isPluck) {
        filter.frequency.exponentialRampToValueAtTime(180, startTime + duration);
      }

      gain.gain.setValueAtTime(0.0001, startTime);
      if (isPluck) {
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      } else {
        gain.gain.linearRampToValueAtTime(peakGain, startTime + duration * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
      this.activeNodes.push(osc);
    };

    // -------------------------------------------------------------------------
    // TEMA 1: MUSEUM HERITAGE (Klasik Kontemplatif, Megah & Harmoni D Minor Dorian)
    // -------------------------------------------------------------------------
    if (theme === 'museum') {
      const loopDuration = 9.6; // 4 bars x 2.4s
      const runCycle = () => {
        if (!this.isPlaying) return;
        const now = this.ctx.currentTime;

        // Chords Progression: Dm9 -> G7 -> Bbmaj7 -> A7
        const pads = [
          { t: 0.0, bass: 73.42, notes: [174.61, 220.00, 261.63, 329.63] }, // D2, F3, A3, C4, E4
          { t: 2.4, bass: 98.00, notes: [196.00, 246.94, 293.66, 349.23] }, // G2, G3, B3, D4, F4
          { t: 4.8, bass: 116.54, notes: [174.61, 233.08, 293.66, 349.23] }, // Bb2, F3, Bb3, D4, F4
          { t: 7.2, bass: 110.00, notes: [164.81, 220.00, 277.18, 329.63] }  // A2, E3, A3, C#4, E4
        ];

        pads.forEach(p => {
          playTone(p.bass, now + p.t, 2.3, 'triangle', 0.16, 400);
          p.notes.forEach(f => playTone(f, now + p.t, 2.3, 'sine', 0.08, 750));
        });

        // Solo Melody (Alunan biola/flute klasik yang menyanyi dan bervariasi)
        const melody = [
          { t: 0.0, f: 293.66, d: 0.8 }, // D4
          { t: 0.8, f: 349.23, d: 0.6 }, // F4
          { t: 1.4, f: 440.00, d: 0.9 }, // A4
          { t: 2.4, f: 587.33, d: 1.1 }, // D5
          { t: 3.5, f: 523.25, d: 0.8 }, // C5
          { t: 4.8, f: 466.16, d: 0.9 }, // Bb4
          { t: 5.7, f: 587.33, d: 0.8 }, // D5
          { t: 6.5, f: 659.25, d: 0.6 }, // E5
          { t: 7.2, f: 554.37, d: 1.1 }, // C#5
          { t: 8.3, f: 440.00, d: 1.2 }  // A4 -> D4
        ];
        melody.forEach(m => playTone(m.f, now + m.t, m.d, 'sine', 0.18, 1400));
      };

      runCycle();
      this.intervalId = setInterval(runCycle, loopDuration * 1000);
      return;
    }

    // -------------------------------------------------------------------------
    // TEMA 2: ROYAL ACOUSTIC (Petikan Dawai Harpa Kerajaan & Arpeggio Anggun Cepat)
    // -------------------------------------------------------------------------
    if (theme === 'royal') {
      const loopDuration = 8.0; // 4 akor x 2.0s
      const runCycle = () => {
        if (!this.isPlaying) return;
        const now = this.ctx.currentTime;

        // Arpeggios 8 nada mengalir per akor: Em9 -> Cmaj7 -> Dadd9 -> Bm7
        const arps = [
          // Em: E3, B3, G4, B4, D5, E5, G5, E5 (0.0s - 2.0s)
          { t: 0.0, notes: [164.81, 246.94, 392.00, 493.88, 587.33, 659.25, 783.99, 659.25] },
          // Cmaj7: C3, G3, E4, G4, B4, C5, E5, C5 (2.0s - 4.0s)
          { t: 2.0, notes: [130.81, 196.00, 329.63, 392.00, 493.88, 523.25, 659.25, 523.25] },
          // Dadd9: D3, A3, F#4, A4, E5, D5, F#5, D5 (4.0s - 6.0s)
          { t: 4.0, notes: [146.83, 220.00, 369.99, 440.00, 659.25, 587.33, 739.99, 587.33] },
          // Bm7: B2, F#3, D4, F#4, A4, B4, D5, B4 (6.0s - 8.0s)
          { t: 6.0, notes: [123.47, 185.00, 293.66, 369.99, 440.00, 493.88, 587.33, 493.88] }
        ];

        arps.forEach(a => {
          a.notes.forEach((freq, idx) => {
            const noteTime = now + a.t + (idx * 0.24);
            playTone(freq, noteTime, 0.48, 'triangle', 0.16, 1600, true);
          });
        });
      };

      runCycle();
      this.intervalId = setInterval(runCycle, loopDuration * 1000);
      return;
    }

    // -------------------------------------------------------------------------
    // TEMA 3: LOFI RELAXED (Jazz Kafe Santai, Akor 9th Syncopated & Rhodes Piano)
    // -------------------------------------------------------------------------
    if (theme === 'lofi') {
      const loopDuration = 8.0;
      const runCycle = () => {
        if (!this.isPlaying) return;
        const now = this.ctx.currentTime;

        // Akor Jazzy: Ebmaj9 -> Cm11 -> Fm9 -> Bb13
        const chords = [
          { t: 0.0, bass: 77.78, mid: [311.13, 392.00, 466.16, 587.33] }, // Eb2 + Eb4, G4, Bb4, D5
          { t: 2.0, bass: 65.41, mid: [261.63, 311.13, 392.00, 466.16] }, // C2 + C4, Eb4, G4, Bb4
          { t: 4.0, bass: 87.31, mid: [349.23, 415.30, 523.25, 622.25] }, // F2 + F4, Ab4, C5, Eb5
          { t: 6.0, bass: 58.27, mid: [233.08, 369.99, 440.00, 587.33] }  // Bb1 + Bb3, F#4, A4, D5
        ];

        chords.forEach(c => {
          // Warm soft bass
          playTone(c.bass, now + c.t, 1.8, 'sine', 0.22, 280);
          // Syncopated warm Rhodes electric piano
          c.mid.forEach(f => {
            playTone(f, now + c.t, 0.9, 'sine', 0.09, 680);
            playTone(f, now + c.t + 0.6, 0.7, 'sine', 0.07, 680);
          });
        });

        // Jazzy melody line
        const lofiMelody = [
          { t: 0.3, f: 587.33, d: 0.4 }, // D5
          { t: 0.8, f: 523.25, d: 0.5 }, // C5
          { t: 1.4, f: 466.16, d: 0.6 }, // Bb4
          { t: 2.3, f: 622.25, d: 0.4 }, // Eb5
          { t: 2.8, f: 587.33, d: 0.4 }, // D5
          { t: 3.4, f: 466.16, d: 0.6 }, // Bb4
          { t: 4.3, f: 698.46, d: 0.5 }, // F5
          { t: 5.0, f: 622.25, d: 0.4 }, // Eb5
          { t: 6.3, f: 587.33, d: 0.6 }, // D5
          { t: 7.0, f: 523.25, d: 0.8 }  // C5
        ];
        lofiMelody.forEach(m => playTone(m.f, now + m.t, m.d, 'sine', 0.14, 850));
      };

      runCycle();
      this.intervalId = setInterval(runCycle, loopDuration * 1000);
      return;
    }

    // -------------------------------------------------------------------------
    // TEMA 4: GOLD COIN CHIMES (Kilau Kristal & Resonansi Gemerincing Koin Emas)
    // -------------------------------------------------------------------------
    if (theme === 'chimes') {
      const loopDuration = 6.4;
      const runCycle = () => {
        if (!this.isPlaying) return;
        const now = this.ctx.currentTime;

        // Ambient pad in background
        playTone(130.81, now, 6.0, 'sine', 0.12, 350); // C3
        playTone(196.00, now, 6.0, 'sine', 0.08, 450); // G3
        playTone(261.63, now, 6.0, 'sine', 0.08, 550); // C4

        // Shimmering cascade of bell notes (Pentatonic C, E, G, A, C6, E6)
        const chimeNotes = [
          { t: 0.0, f: 523.25 }, // C5
          { t: 0.2, f: 659.25 }, // E5
          { t: 0.4, f: 783.99 }, // G5
          { t: 0.7, f: 880.00 }, // A5
          { t: 1.1, f: 1046.50 }, // C6
          { t: 1.5, f: 1318.51 }, // E6
          { t: 2.0, f: 1174.66 }, // D6
          { t: 2.4, f: 783.99 },  // G5

          { t: 3.2, f: 880.00 },  // A5
          { t: 3.5, f: 783.99 },  // G5
          { t: 3.8, f: 659.25 },  // E5
          { t: 4.2, f: 587.33 },  // D5
          { t: 4.6, f: 659.25 },  // E5
          { t: 5.0, f: 783.99 },  // G5
          { t: 5.4, f: 1046.50 }  // C6
        ];

        chimeNotes.forEach(c => {
          playTone(c.f, now + c.t, 1.2, 'sine', 0.14, 2800, true);
          // Soft harmonic overtone echo
          playTone(c.f * 1.5, now + c.t + 0.03, 0.6, 'sine', 0.05, 3400, true);
        });
      };

      runCycle();
      this.intervalId = setInterval(runCycle, loopDuration * 1000);
      return;
    }

    // -------------------------------------------------------------------------
    // TEMA 5: NUSANTARA HERITAGE (Gamelan Slendro Kuno & Genta Keraton)
    // -------------------------------------------------------------------------
    if (theme === 'nusantara') {
      const loopDuration = 8.0;
      const runCycle = () => {
        if (!this.isPlaying) return;
        const now = this.ctx.currentTime;

        // Deep Gong Resonance at bar start (C2 & G2)
        playTone(65.41, now, 3.8, 'sine', 0.25, 220, true);
        playTone(98.00, now + 4.0, 3.8, 'sine', 0.22, 260, true);

        // Slendro Scale: Ji(1)-261.6, Ro(2)-293.7, Lu(3)-329.6, Ma(5)-392.0, Nem(6)-440.0
        const gamelanNotes = [
          { t: 0.2, f: 293.66 }, // Ro
          { t: 0.7, f: 329.63 }, // Lu
          { t: 1.2, f: 392.00 }, // Ma
          { t: 1.8, f: 440.00 }, // Nem
          { t: 2.3, f: 392.00 }, // Ma
          { t: 2.8, f: 329.63 }, // Lu
          { t: 3.4, f: 293.66 }, // Ro

          { t: 4.2, f: 329.63 }, // Lu
          { t: 4.8, f: 392.00 }, // Ma
          { t: 5.3, f: 440.00 }, // Nem
          { t: 5.9, f: 523.25 }, // Ji Tinggi
          { t: 6.4, f: 440.00 }, // Nem
          { t: 7.0, f: 392.00 }  // Ma
        ];

        gamelanNotes.forEach(n => {
          // Bronze bell chime sound
          playTone(n.f, now + n.t, 1.4, 'triangle', 0.18, 1100, true);
          playTone(n.f * 2.76, now + n.t, 0.4, 'sine', 0.04, 2200, true);
        });
      };

      runCycle();
      this.intervalId = setInterval(runCycle, loopDuration * 1000);
    }
  },

  togglePreviewTest() {
    if (this.isPreviewingTest) {
      this.stop();
      this.isPreviewingTest = false;
      const btnTest = document.getElementById('btnTestAudioPreview');
      if (btnTest) btnTest.textContent = '🔊 Tes Audio';
    } else {
      this.play(0);
      this.isPreviewingTest = true;
      const btnTest = document.getElementById('btnTestAudioPreview');
      if (btnTest) btnTest.textContent = '⏹️ Hentikan';
    }
  }
};

/**
 * Preload group-item and batch metadata
 */
async function loadFilterMetadata() {
  if (!window.KreativitasState.groupItemsList || window.KreativitasState.groupItemsList.length === 0) {
    try {
      const res = await API.get('/group-item');
      window.KreativitasState.groupItemsList = Array.isArray(res) ? res : (res.data || res.items || []);
    } catch (e) {
      console.warn('Gagal memuat group-item:', e);
    }
  }

  if (!window.KreativitasState.batchesList || window.KreativitasState.batchesList.length === 0) {
    try {
      const res = await API.get('/batch?limit=100');
      window.KreativitasState.batchesList = res.items || res.data || [];
    } catch (e) {
      console.warn('Gagal memuat batch list:', e);
    }
  }
}

/**
 * Helper to safely extract photo URLs from a koleksi item record
 */
function getItemPhotos(item) {
  if (!item) return { obv: '', rev: '', main: '' };
  const obv = item.foto_obv || item.foto_path || item.foto_depan || '';
  const rev = item.foto_rev || item.foto_belakang || '';
  const main = obv || rev || item.foto_path || item.foto_detail || '';
  return { obv, rev, main };
}

/**
 * Preload an image URL into HTMLImageElement
 */
function preloadImage(url) {
  if (!url) return Promise.resolve(null);
  if (window.KreativitasState.imageCache.has(url)) {
    const cached = window.KreativitasState.imageCache.get(url);
    if (cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      window.KreativitasState.imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn('Gagal memuat gambar:', url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Helper: format seconds to MM:SS
 */
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * Entry point to render the Studio Kreativitas page
 */
async function loadKreativitas(initialTab = 'collage') {
  if (initialTab) window.KreativitasState.activeTab = initialTab;

  // Background fetch group-item and batch metadata for instant filtering
  loadFilterMetadata();

  const content = document.getElementById('contentArea');
  content.innerHTML = `
    <div class="kreativitas-container">
      <!-- Studio Header Bar with Main Tabs -->
      <div class="studio-header card" style="margin-bottom: 20px; padding: 18px 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="margin: 0; font-size: 1.45rem; font-weight: 700; color: var(--gold-light); display: flex; align-items: center; gap: 10px;">
              <span>✨</span> Studio Kreativitas Numismatik
            </h2>
            <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem;">
              Buat kolase gambar profesional dan video animasi slide show dari koleksi uang kuno &amp; koin Anda.
            </p>
          </div>
          
          <!-- Mode Tabs (Collage Maker vs Slide Show Maker) -->
          <div class="studio-main-tab-bar">
            <button id="btnTabCollage" class="studio-tab-pill ${window.KreativitasState.activeTab === 'collage' ? 'active' : ''}" onclick="switchKreativitasTab('collage')">
              <span class="tab-icon">🖼️</span>
              <div class="tab-text-group">
                <span class="tab-title">Collage Maker</span>
                <span class="tab-desc">Kolase Gambar</span>
              </div>
            </button>
            <button id="btnTabSlideshow" class="studio-tab-pill ${window.KreativitasState.activeTab === 'slideshow' ? 'active' : ''}" onclick="switchKreativitasTab('slideshow')">
              <span class="tab-icon">🎬</span>
              <div class="tab-text-group">
                <span class="tab-title">Slide Show Maker</span>
                <span class="tab-desc">Video Animasi</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Studio Workspace Grid -->
      <div class="studio-workspace-grid">
        
        <!-- Left Column: Media Basket & Controls Panel -->
        <div class="studio-sidebar-panel">
          
          <!-- Basket Item Terpilih -->
          <div class="card basket-card" style="margin-bottom: 18px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <h4 style="margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                  <span>🧺</span> Item Terpilih
                  <span id="basketCountBadge" class="badge" style="background: var(--gold-glow); color: var(--gold-light); font-size: 0.8rem; border: 1px solid var(--gold-primary);">
                    ${window.KreativitasState.selectedItems.length} Foto
                  </span>
                </h4>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" onclick="openItemSelectorModal()" title="Pilih Item Koleksi dari Katalog">
                  <span>➕</span> Tambah Item
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="clearBasketItems()" title="Kosongkan semua item" ${window.KreativitasState.selectedItems.length === 0 ? 'disabled' : ''}>
                  <span>🗑️</span>
                </button>
              </div>
            </div>

            <!-- Basket Thumbnails Strip -->
            <div id="basketItemsList" class="basket-items-scroll">
              <!-- Rendered via JS -->
            </div>
          </div>

          <!-- Tab-Specific Controls -->
          <div id="studioControlsContainer">
            <!-- Dynamic Controls for Collage or Slideshow -->
          </div>

        </div>

        <!-- Right Column: Canvas Preview & Interactive Stage -->
        <div class="studio-preview-panel">
          <div class="card preview-card" style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
            
            <!-- Preview Stage Top Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span id="previewStageTitle" style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">
                  ${window.KreativitasState.activeTab === 'collage' ? '🎨 Pratinjau Kolase' : '🎬 Pratinjau Video Slide Show'}
                </span>
                <span id="canvasDimensionBadge" class="badge badge-secondary" style="font-size: 0.78rem; opacity: 0.85;">
                  1600 × 1600 px
                </span>
              </div>
              <div id="previewHeaderActions" style="display: flex; gap: 8px;">
                <!-- Action buttons rendered dynamically -->
              </div>
            </div>

            <!-- The Canvas Stage Container -->
            <div class="canvas-viewport-wrapper" id="canvasViewportWrapper">
              <canvas id="studioMainCanvas"></canvas>
              
              <!-- Empty State Overlay when no items selected -->
              <div id="canvasEmptyState" class="canvas-empty-overlay ${window.KreativitasState.selectedItems.length > 0 ? 'hidden' : ''}">
                <div style="text-align: center; max-width: 380px; padding: 24px;">
                  <div style="font-size: 3.2rem; margin-bottom: 12px;">🪙</div>
                  <h3 style="color: var(--text-primary); margin: 0 0 8px;">Belum Ada Foto Koleksi</h3>
                  <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 18px;">
                    Pilih koin atau uang kertas kuno dari koleksi Anda untuk memulai pembuatan ${window.KreativitasState.activeTab === 'collage' ? 'kolase foto' : 'video slide show'}.
                  </p>
                  <button class="btn btn-primary" onclick="openItemSelectorModal()">
                    <span>🔍</span> Buka Pemilih Koleksi
                  </button>
                </div>
              </div>
            </div>

            <!-- Slideshow Player Control Bar (Visible only in slideshow mode) -->
            <div id="slideshowPlayerBar" class="slideshow-player-bar" style="${window.KreativitasState.activeTab === 'slideshow' ? 'display: flex;' : 'display: none;'}">
              <div class="player-controls-left">
                <button id="btnPlayerPlayPause" class="btn-player-circle" onclick="toggleSlideshowPlayback()" title="Putar / Jeda">
                  <span id="playerPlayIcon">▶️</span>
                </button>
                <button class="btn-player-icon" onclick="prevSlide()" title="Slide Sebelumnya">⏮️</button>
                <button class="btn-player-icon" onclick="nextSlide()" title="Slide Selanjutnya">⏭️</button>
                <button class="btn-player-icon" onclick="restartSlideshow()" title="Mulai dari Awal">🔄</button>
              </div>

              <!-- Scrubber Timeline -->
              <div class="player-timeline-container">
                <input type="range" id="slideshowTimeline" min="0" max="100" value="0" step="0.1" class="player-timeline-slider" oninput="onTimelineScrub(this.value)">
                <div class="player-timeline-labels">
                  <span id="playerCurrentTimeText">00:00</span>
                  <span id="playerSlideInfoText">Slide 1 / 1</span>
                  <span id="playerTotalTimeText">00:00</span>
                </div>
              </div>

              <!-- Export Button in Bar -->
              <div class="player-controls-right">
                <button id="btnExportVideo" class="btn btn-warning btn-sm" onclick="exportSlideshowVideo()" style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
                  <span>🔴</span> Rekam &amp; Ekspor Video
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;

  renderBasketThumbnails();
  renderStudioControls();
  initCanvasStage();

  if (window.KreativitasState.selectedItems.length > 0) {
    if (window.KreativitasState.activeTab === 'collage') {
      renderCollage();
    } else {
      initSlideshowPlayer();
    }
  } else {
    tryAutoPopulateDemoItems();
  }
}

/**
 * Switch tabs between Collage Maker and Slide Show Maker
 */
function switchKreativitasTab(tab) {
  window.KreativitasState.activeTab = tab;
  
  pauseSlideshow();
  NumisAudioEngine.stop();

  document.querySelectorAll('.studio-tab-pill').forEach(btn => btn.classList.remove('active'));
  if (tab === 'collage') {
    document.getElementById('btnTabCollage')?.classList.add('active');
    document.getElementById('previewStageTitle').textContent = '🎨 Pratinjau Kolase';
    document.getElementById('slideshowPlayerBar').style.display = 'none';
  } else {
    document.getElementById('btnTabSlideshow')?.classList.add('active');
    document.getElementById('previewStageTitle').textContent = '🎬 Pratinjau Video Slide Show';
    document.getElementById('slideshowPlayerBar').style.display = 'flex';
  }

  renderStudioControls();
  
  if (tab === 'collage') {
    renderCollage();
  } else {
    initSlideshowPlayer();
  }
}

/**
 * Render basket thumbnails in the left panel
 */
function renderBasketThumbnails() {
  const container = document.getElementById('basketItemsList');
  if (!container) return;

  const items = window.KreativitasState.selectedItems;
  const countBadge = document.getElementById('basketCountBadge');
  if (countBadge) countBadge.textContent = `${items.length} Foto`;

  const emptyOverlay = document.getElementById('canvasEmptyState');
  if (emptyOverlay) {
    emptyOverlay.classList.toggle('hidden', items.length > 0);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">
        Keranjang masih kosong.<br>Klik <strong>"+ Tambah Item"</strong> untuk memilih dari katalog.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="basket-chips-grid">
      ${items.map((it, idx) => `
        <div class="basket-item-chip" title="${it.nama_item} (${it.sisi.toUpperCase()})">
          <div class="chip-thumb-wrap">
            <img src="${it.foto_url}" alt="${it.nama_item}" onerror="this.onerror=null; this.src='/static/img/logo.png';">
            <span class="chip-side-badge ${it.sisi}">${it.sisi === 'obverse' ? 'Depan' : it.sisi === 'reverse' ? 'Blkg' : 'Foto'}</span>
          </div>
          <div class="chip-info">
            <div class="chip-title">${it.nama_item}</div>
            <div class="chip-sub">${it.tahun || '-'} • ${it.grade || 'Raw'}</div>
          </div>
          <div class="chip-actions">
            <button class="btn-chip-action" onclick="toggleItemSide(${idx})" title="Ganti Sisi Depan/Belakang">🔄</button>
            <button class="btn-chip-action chip-remove" onclick="removeBasketItem(${idx})" title="Hapus foto ini">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function removeBasketItem(index) {
  window.KreativitasState.selectedItems.splice(index, 1);
  renderBasketThumbnails();
  if (window.KreativitasState.activeTab === 'collage') {
    renderCollage();
  } else {
    initSlideshowPlayer();
  }
}

function clearBasketItems() {
  if (window.KreativitasState.selectedItems.length === 0) return;
  if (!confirm('Kosongkan semua item yang sudah dipilih di keranjang?')) return;
  window.KreativitasState.selectedItems = [];
  renderBasketThumbnails();
  if (window.KreativitasState.activeTab === 'collage') {
    renderCollage();
  } else {
    pauseSlideshow();
    initSlideshowPlayer();
  }
}

async function toggleItemSide(index) {
  const item = window.KreativitasState.selectedItems[index];
  if (!item) return;

  try {
    const res = await API.get(`/koleksi/${item.koleksi_id}`);
    const detail = res.data || res;
    const photos = getItemPhotos(detail);
    
    let nextSide = 'obverse';
    let nextUrl = photos.obv || photos.main;

    if (item.sisi === 'obverse') {
      if (photos.rev) {
        nextSide = 'reverse';
        nextUrl = photos.rev;
      }
    } else if (item.sisi === 'reverse') {
      if (photos.obv) {
        nextSide = 'obverse';
        nextUrl = photos.obv;
      } else if (photos.main) {
        nextSide = 'utama';
        nextUrl = photos.main;
      }
    } else {
      if (photos.obv) {
        nextSide = 'obverse';
        nextUrl = photos.obv;
      }
    }

    item.sisi = nextSide;
    item.foto_url = nextUrl;
    item.imgObj = await preloadImage(nextUrl);

    renderBasketThumbnails();
    if (window.KreativitasState.activeTab === 'collage') {
      renderCollage();
    } else {
      initSlideshowPlayer();
    }
  } catch (err) {
    console.error('Gagal mengganti sisi foto item:', err);
  }
}

/**
 * Render Studio Controls (Collage vs Slideshow)
 */
function renderStudioControls() {
  const container = document.getElementById('studioControlsContainer');
  const headerActions = document.getElementById('previewHeaderActions');
  if (!container) return;

  if (window.KreativitasState.activeTab === 'collage') {
    if (headerActions) {
      headerActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="copyCollageToClipboard()" title="Salin gambar ke papan klip">
          <span>📋</span> Salin
        </button>
        <button class="btn btn-outline-gold btn-sm" onclick="downloadCollage('jpeg')" title="Unduh format JPEG">
          <span>🖼️</span> JPEG
        </button>
        <button class="btn btn-primary btn-sm" onclick="downloadCollage('png')" title="Unduh gambar resolusi tinggi PNG">
          <span>📥</span> Unduh PNG
        </button>
      `;
    }

    const cfg = window.KreativitasState.collageConfig;
    container.innerHTML = `
      <div class="card" style="padding: 18px; margin-bottom: 18px;">
        <h4 style="margin: 0 0 14px; font-size: 1rem; color: var(--gold-light); display: flex; align-items: center; gap: 8px;">
          <span>⚙️</span> Pengaturan Kolase
        </h4>

        <!-- Aspect Ratio -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem;">Aspek Rasio Kanvas</label>
          <div class="ratio-pill-group">
            ${[
              { id: '1:1', label: '1:1 Persegi (IG/WA)' },
              { id: '4:5', label: '4:5 Feed Portrait' },
              { id: '9:16', label: '9:16 Story/Reels' },
              { id: '16:9', label: '16:9 Landscape' },
              { id: '4:3', label: '4:3 Standar' },
              { id: 'A4', label: 'A4 Cetak Dokumen' }
            ].map(r => `
              <button type="button" class="btn-ratio-pill ${cfg.ratio === r.id ? 'active' : ''}" onclick="updateCollageConfig('ratio', '${r.id}')">
                ${r.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Layout Grid Mode -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem;">Tata Letak (Layout)</label>
          <select class="form-control form-control-sm" onchange="updateCollageConfig('layout', this.value)">
            <option value="auto" ${cfg.layout === 'auto' ? 'selected' : ''}>Auto Grid (Otomatis seimbang)</option>
            <option value="side-by-side" ${cfg.layout === 'side-by-side' ? 'selected' : ''}>Side-by-Side (Banding Depan &amp; Belakang)</option>
            <option value="hero" ${cfg.layout === 'hero' ? 'selected' : ''}>Hero Showcase (1 Utama Besar + Thumbnail)</option>
            <option value="1-col" ${cfg.layout === '1-col' ? 'selected' : ''}>1 Kolom Vertikal</option>
            <option value="2-col" ${cfg.layout === '2-col' ? 'selected' : ''}>2 Kolom Sejajar</option>
            <option value="3-col" ${cfg.layout === '3-col' ? 'selected' : ''}>3 Kolom Grid</option>
            <option value="4-col" ${cfg.layout === '4-col' ? 'selected' : ''}>4 Kolom Grid</option>
          </select>
        </div>

        <!-- Background Style -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem;">Gaya Latar Belakang</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${[
              { id: 'dark-luxury', label: 'Dark Velvet', color: '#0f172a' },
              { id: 'gold-dark', label: 'Gold Luxury', color: '#1a180e' },
              { id: 'black', label: 'Hitam Pekat', color: '#000000' },
              { id: 'white', label: 'Putih Bersih', color: '#ffffff' },
              { id: 'royal-blue', label: 'Royal Blue', color: '#0c1b33' }
            ].map(b => `
              <button type="button" class="btn-color-swatch ${cfg.bgType === b.id ? 'active' : ''}" style="background: ${b.color};" onclick="updateCollageConfig('bgType', '${b.id}')" title="${b.label}"></button>
            `).join('')}
          </div>
        </div>

        <!-- Sliders: Gap, Padding, Radius -->
        <div class="form-group" style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
            <span>Jarak Antar Foto (Gap)</span>
            <span id="labelGap">${cfg.gap}px</span>
          </div>
          <input type="range" class="form-range" min="0" max="40" value="${cfg.gap}" oninput="updateCollageConfig('gap', parseInt(this.value)); document.getElementById('labelGap').textContent = this.value + 'px';">
        </div>

        <div class="form-group" style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
            <span>Padding Tepi Kanvas</span>
            <span id="labelPad">${cfg.padding}px</span>
          </div>
          <input type="range" class="form-range" min="0" max="60" value="${cfg.padding}" oninput="updateCollageConfig('padding', parseInt(this.value)); document.getElementById('labelPad').textContent = this.value + 'px';">
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
            <span>Kelengkungan Sudut (Radius)</span>
            <span id="labelRad">${cfg.radius}px</span>
          </div>
          <input type="range" class="form-range" min="0" max="40" value="${cfg.radius}" oninput="updateCollageConfig('radius', parseInt(this.value)); document.getElementById('labelRad').textContent = this.value + 'px';">
        </div>

        <!-- Watermark / Title -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem;">Judul Koleksi / Watermark</label>
          <input type="text" class="form-control form-control-sm" value="${cfg.watermarkText}" placeholder="Contoh: Koleksi Koin Hindia Belanda" onchange="updateCollageConfig('watermarkText', this.value)">
        </div>

        <!-- Toggles: Badges, Shadow, Fit -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
          <label class="form-check-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
            <input type="checkbox" ${cfg.showBadges ? 'checked' : ''} onchange="updateCollageConfig('showBadges', this.checked)">
            <span>Tampilkan Badge Info Item (Nama &amp; Grade)</span>
          </label>
          <label class="form-check-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
            <input type="checkbox" ${cfg.shadow ? 'checked' : ''} onchange="updateCollageConfig('shadow', this.checked)">
            <span>Efek Bayangan Foto (Drop Shadow)</span>
          </label>
          <label class="form-check-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
            <input type="checkbox" ${cfg.fitMode === 'contain' ? 'checked' : ''} onchange="updateCollageConfig('fitMode', this.checked ? 'contain' : 'cover')">
            <span>Muat Foto Utuh Tanpa Terpotong (Contain Mode)</span>
          </label>
        </div>

      </div>
    `;
  } else {
    // Header actions for Slideshow
    if (headerActions) {
      headerActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="restartSlideshow()" title="Mulai ulang video">
          <span>🔄</span> Reset
        </button>
        <button class="btn btn-warning btn-sm" onclick="exportSlideshowVideo()" style="font-weight: 600;">
          <span>🔴</span> Ekspor Video
        </button>
      `;
    }

    const scfg = window.KreativitasState.slideshowConfig;
    container.innerHTML = `
      <div class="card" style="padding: 18px; margin-bottom: 18px;">
        <h4 style="margin: 0 0 14px; font-size: 1rem; color: var(--gold-light); display: flex; align-items: center; gap: 8px;">
          <span>⚙️</span> Pengaturan Slide Show
        </h4>

        <!-- Video Aspect Ratio -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem;">Aspek Rasio Video</label>
          <div class="ratio-pill-group">
            ${[
              { id: '16:9', label: '16:9 Landscape (Monitor/YT)' },
              { id: '9:16', label: '9:16 Shorts/Reels/TikTok' },
              { id: '1:1', label: '1:1 Persegi Feed' }
            ].map(r => `
              <button type="button" class="btn-ratio-pill ${scfg.ratio === r.id ? 'active' : ''}" onclick="updateSlideshowConfig('ratio', '${r.id}')">
                ${r.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Duration per Slide -->
        <div class="form-group" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>Durasi per Item Foto</span>
            <span id="labelSlideDuration" style="font-weight: 600; color: var(--gold-light);">${scfg.duration} Detik</span>
          </div>
          <input type="range" class="form-range" min="1" max="10" step="0.5" value="${scfg.duration}" oninput="updateSlideshowConfig('duration', parseFloat(this.value)); document.getElementById('labelSlideDuration').textContent = this.value + ' Detik';">
        </div>

        <!-- Transition Style -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem;">Pilihan Efek Transisi</label>
          <select class="form-control form-control-sm" onchange="updateSlideshowConfig('transition', this.value)">
            <option value="crossfade" ${scfg.transition === 'crossfade' ? 'selected' : ''}>Crossfade (Halus / Dissolve)</option>
            <option value="zoom" ${scfg.transition === 'zoom' ? 'selected' : ''}>Zoom In Sinematik (Ken Burns)</option>
            <option value="coin-flip" ${scfg.transition === 'coin-flip' ? 'selected' : ''}>3D Coin Flip (Putar Depan-Belakang)</option>
            <option value="slide-left" ${scfg.transition === 'slide-left' ? 'selected' : ''}>Slide Kiri (Geser Horizontal)</option>
            <option value="slide-up" ${scfg.transition === 'slide-up' ? 'selected' : ''}>Slide Atas (Geser Vertikal)</option>
            <option value="fade-black" ${scfg.transition === 'fade-black' ? 'selected' : ''}>Fade to Black (Pameran Klasik)</option>
            <option value="cut" ${scfg.transition === 'cut' ? 'selected' : ''}>Instant Cut (Tanpa Transisi)</option>
          </select>
        </div>

        <!-- Transition Duration -->
        <div class="form-group" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>Kecepatan Transisi</span>
            <span id="labelTransDuration" style="font-weight: 600; color: var(--gold-light);">${scfg.transitionDuration}s</span>
          </div>
          <input type="range" class="form-range" min="0.3" max="2.0" step="0.1" value="${scfg.transitionDuration}" oninput="updateSlideshowConfig('transitionDuration', parseFloat(this.value)); document.getElementById('labelTransDuration').textContent = this.value + 's';">
        </div>

        <!-- AUDIO & MUSIK LATAR BERVARIASI NADA -->
        <div class="audio-card-box" style="margin-top: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label class="form-label" style="font-size: 0.85rem; margin: 0; color: var(--gold-light); font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <span>🎵</span> Musik Latar (Melodi Khusus Tema)
            </label>
            <button id="btnTestAudioPreview" class="btn btn-xs btn-outline-gold" onclick="NumisAudioEngine.togglePreviewTest()" title="Dengarkan melodi tema ini">
              🔊 Tes Audio
            </button>
          </div>

          <select id="selectAudioTheme" class="form-control form-control-sm" onchange="onAudioThemeChanged(this.value)" style="margin-bottom: 8px;">
            <option value="museum" ${scfg.audioTheme === 'museum' ? 'selected' : ''}>🏛️ Museum Heritage (Melodi Klasik Megah)</option>
            <option value="royal" ${scfg.audioTheme === 'royal' ? 'selected' : ''}>🎻 Royal Acoustic (Petikan Harpa Kerajaan)</option>
            <option value="lofi" ${scfg.audioTheme === 'lofi' ? 'selected' : ''}>🎷 Lofi Relaxed (Jazz Kafe Kolektor Santai)</option>
            <option value="chimes" ${scfg.audioTheme === 'chimes' ? 'selected' : ''}>🪙 Gold Coin Chimes (Kilau Emas &amp; Shimmer)</option>
            <option value="nusantara" ${scfg.audioTheme === 'nusantara' ? 'selected' : ''}>🌴 Nusantara Heritage (Gamelan Slendro Kuno)</option>
            <option value="custom" ${scfg.audioTheme === 'custom' ? 'selected' : ''}>📂 Unggah File Audio Sendiri (MP3/WAV)...</option>
            <option value="none" ${scfg.audioTheme === 'none' ? 'selected' : ''}>🔇 Tanpa Musik (Hening)</option>
          </select>

          <!-- Upload Container (Visible if custom selected) -->
          <div id="customAudioUploadContainer" style="${scfg.audioTheme === 'custom' ? 'display: block;' : 'display: none;'} margin-top: 6px;">
            <input type="file" id="customAudioFileInput" accept="audio/*" style="display: none;" onchange="onCustomAudioFileSelected(this)">
            <button type="button" class="btn btn-secondary btn-sm w-100" onclick="document.getElementById('customAudioFileInput').click()">
              <span>📁</span> Pilih File Audio dari Komputer
            </button>
            ${scfg.customAudioName ? `
              <div class="audio-file-pill">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">🎵 ${scfg.customAudioName}</span>
                <button type="button" onclick="clearCustomAudio()" class="btn-chip-action chip-remove" title="Hapus file audio">✕</button>
              </div>
            ` : ''}
          </div>

          <!-- Volume Slider -->
          <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 2px;">
              <span>Volume Suara</span>
              <span id="labelAudioVolume">${Math.round((scfg.audioVolume || 0.8) * 100)}%</span>
            </div>
            <input type="range" class="form-range" min="0" max="1" step="0.05" value="${scfg.audioVolume || 0.8}" oninput="updateAudioVolume(parseFloat(this.value))">
          </div>
        </div>

        <!-- FORMAT EKSPOR VIDEO -->
        <div class="form-group" style="margin-top: 12px; margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.85rem; color: var(--gold-light); font-weight: 600;">
            Format Simpan / Ekspor Video
          </label>
          <div class="export-format-selector">
            ${[
              { id: 'mp4', label: 'MP4 Universal' },
              { id: 'webm', label: 'WebM HQ' },
              { id: 'mkv', label: 'MKV Video' }
            ].map(f => `
              <button type="button" class="btn-export-format-pill ${scfg.exportFormat === f.id ? 'active' : ''}" onclick="updateSlideshowConfig('exportFormat', '${f.id}')">
                ${f.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Overlays -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
          <label class="form-check-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
            <input type="checkbox" ${scfg.showInfoOverlay ? 'checked' : ''} onchange="updateSlideshowConfig('showInfoOverlay', this.checked)">
            <span>Tampilkan Keterangan Teks Koleksi di Video</span>
          </label>
        </div>

      </div>
    `;
  }
}

function onAudioThemeChanged(theme) {
  NumisAudioEngine.stop();
  window.KreativitasState.slideshowConfig.audioTheme = theme;
  const uploadContainer = document.getElementById('customAudioUploadContainer');
  if (uploadContainer) {
    uploadContainer.style.display = theme === 'custom' ? 'block' : 'none';
  }
}

function onCustomAudioFileSelected(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const url = URL.createObjectURL(file);

  window.KreativitasState.slideshowConfig.audioTheme = 'custom';
  window.KreativitasState.slideshowConfig.customAudioFile = file;
  window.KreativitasState.slideshowConfig.customAudioUrl = url;
  window.KreativitasState.slideshowConfig.customAudioName = file.name;

  if (NumisAudioEngine.customAudio) {
    NumisAudioEngine.customAudio.pause();
    NumisAudioEngine.customAudio = null;
  }

  showToast(`File audio "${file.name}" berhasil dimuat!`, 'success');
  renderStudioControls();
}

function clearCustomAudio() {
  NumisAudioEngine.stop();
  window.KreativitasState.slideshowConfig.customAudioFile = null;
  window.KreativitasState.slideshowConfig.customAudioUrl = null;
  window.KreativitasState.slideshowConfig.customAudioName = '';
  window.KreativitasState.slideshowConfig.audioTheme = 'museum';
  renderStudioControls();
}

function updateAudioVolume(vol) {
  window.KreativitasState.slideshowConfig.audioVolume = vol;
  NumisAudioEngine.setVolume(vol);
  const lbl = document.getElementById('labelAudioVolume');
  if (lbl) lbl.textContent = `${Math.round(vol * 100)}%`;
}

function updateCollageConfig(key, value) {
  window.KreativitasState.collageConfig[key] = value;
  renderStudioControls();
  renderCollage();
}

function updateSlideshowConfig(key, value) {
  window.KreativitasState.slideshowConfig[key] = value;
  renderStudioControls();
  initSlideshowPlayer();
}

function initCanvasStage() {
  const canvas = document.getElementById('studioMainCanvas');
  if (!canvas) return;
}

function getCanvasDimensions(ratio, isVideo = false) {
  if (isVideo) {
    switch (ratio) {
      case '9:16': return { width: 1080, height: 1920 };
      case '1:1':  return { width: 1080, height: 1080 };
      case '16:9':
      default:     return { width: 1920, height: 1080 };
    }
  }

  switch (ratio) {
    case '4:5':  return { width: 1280, height: 1600 };
    case '9:16': return { width: 1080, height: 1920 };
    case '16:9': return { width: 1920, height: 1080 };
    case '4:3':  return { width: 1600, height: 1200 };
    case 'A4':   return { width: 1654, height: 2339 };
    case '1:1':
    default:     return { width: 1600, height: 1600 };
  }
}

async function tryAutoPopulateDemoItems() {
  if (window.KreativitasState.selectedItems.length > 0) return;
  try {
    const res = await API.get('/koleksi?page=1&limit=8');
    const items = res.data || res.items || [];
    const validItems = items.filter(it => {
      const p = getItemPhotos(it);
      return p.obv || p.rev || p.main;
    });

    if (validItems.length > 0) {
      const initialPicks = validItems.slice(0, 4);
      for (const item of initialPicks) {
        const p = getItemPhotos(item);
        if (p.obv) {
          addItemToBasket(item, 'obverse', p.obv, false);
        } else if (p.rev) {
          addItemToBasket(item, 'reverse', p.rev, false);
        } else if (p.main) {
          addItemToBasket(item, 'utama', p.main, false);
        }
      }
      renderBasketThumbnails();
      if (window.KreativitasState.activeTab === 'collage') {
        renderCollage();
      } else {
        initSlideshowPlayer();
      }
    }
  } catch (err) {
    console.log('Auto demo items note:', err.message);
  }
}

function addItemToBasket(item, side, fotoUrl, triggerRender = true) {
  if (!fotoUrl) return;
  const uid = `${item.id}_${side}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  
  const basketItem = {
    uid,
    koleksi_id: item.id,
    nama_item: item.nama_item || 'Koleksi Numismatik',
    kode_item: item.kode_item || '',
    tahun: item.tahun || '',
    grade: item.grade || '',
    denominasi: item.denominasi || '',
    negara: item.negara || '',
    jenis: item.jenis || '',
    sisi: side,
    foto_url: fotoUrl,
    imgObj: null
  };

  window.KreativitasState.selectedItems.push(basketItem);

  preloadImage(fotoUrl).then(img => {
    basketItem.imgObj = img;
    if (triggerRender) {
      if (window.KreativitasState.activeTab === 'collage') {
        renderCollage();
      } else {
        initSlideshowPlayer();
      }
    }
  });

  if (triggerRender) {
    renderBasketThumbnails();
  }
}

// =============================================================================
// COLLAGE MAKER RENDERING ENGINE
// =============================================================================

async function renderCollage() {
  const canvas = document.getElementById('studioMainCanvas');
  if (!canvas) return;

  const items = window.KreativitasState.selectedItems;
  const cfg = window.KreativitasState.collageConfig;

  const { width: W, height: H } = getCanvasDimensions(cfg.ratio, false);
  canvas.width = W;
  canvas.height = H;

  const dimBadge = document.getElementById('canvasDimensionBadge');
  if (dimBadge) dimBadge.textContent = `${W} × ${H} px`;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  drawCollageBackground(ctx, W, H, cfg);

  if (items.length === 0) return;

  const promises = items.map(async it => {
    if (!it.imgObj || !it.imgObj.complete) {
      it.imgObj = await preloadImage(it.foto_url);
    }
    return it;
  });
  await Promise.all(promises);

  const headerHeight = (cfg.watermarkPos === 'header' && cfg.watermarkText) ? 100 : 0;
  const footerHeight = (cfg.watermarkPos === 'footer' && cfg.watermarkText) ? 80 : 0;

  const contentArea = {
    x: cfg.padding,
    y: cfg.padding + headerHeight,
    w: W - (cfg.padding * 2),
    h: H - (cfg.padding * 2) - headerHeight - footerHeight
  };

  const cells = computeCollageGrid(items.length, cfg.layout, contentArea, cfg.gap);

  for (let i = 0; i < cells.length && i < items.length; i++) {
    const cell = cells[i];
    const item = items[i];
    drawCollageCell(ctx, cell, item, cfg);
  }

  drawCollageWatermark(ctx, W, H, cfg);
}

function drawCollageBackground(ctx, W, H, cfg) {
  if (cfg.bgType === 'dark-luxury') {
    const grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, '#1c2230');
    grad.addColorStop(1, '#0a0d14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, W - 24, H - 24);
  } else if (cfg.bgType === 'gold-dark') {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1c1912');
    grad.addColorStop(1, '#0c0b08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, W - 32, H - 32);
  } else if (cfg.bgType === 'black') {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
  } else if (cfg.bgType === 'white') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);
  } else if (cfg.bgType === 'royal-blue') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = cfg.customBgColor || '#0f172a';
    ctx.fillRect(0, 0, W, H);
  }
}

function computeCollageGrid(count, layout, area, gap) {
  const cells = [];
  if (count <= 0) return cells;

  if (layout === 'side-by-side' && count === 2) {
    const cellW = (area.w - gap) / 2;
    cells.push({ x: area.x, y: area.y, w: cellW, h: area.h });
    cells.push({ x: area.x + cellW + gap, y: area.y, w: cellW, h: area.h });
    return cells;
  }

  if (layout === 'hero' && count >= 2) {
    const heroW = (area.w - gap) * 0.58;
    const rightW = area.w - gap - heroW;
    cells.push({ x: area.x, y: area.y, w: heroW, h: area.h });

    const remainingCount = count - 1;
    const subH = (area.h - (gap * (remainingCount - 1))) / remainingCount;
    for (let i = 0; i < remainingCount; i++) {
      cells.push({
        x: area.x + heroW + gap,
        y: area.y + i * (subH + gap),
        w: rightW,
        h: subH
      });
    }
    return cells;
  }

  let cols = 1;
  if (layout === '1-col') cols = 1;
  else if (layout === '2-col') cols = 2;
  else if (layout === '3-col') cols = 3;
  else if (layout === '4-col') cols = 4;
  else {
    if (count === 1) cols = 1;
    else if (count <= 2) cols = (area.w > area.h) ? 2 : 1;
    else if (count <= 4) cols = 2;
    else if (count <= 6) cols = 3;
    else if (count <= 9) cols = 3;
    else if (count <= 12) cols = 4;
    else cols = Math.ceil(Math.sqrt(count));
  }

  const rows = Math.ceil(count / cols);
  const cellW = (area.w - (gap * (cols - 1))) / cols;
  const cellH = (area.h - (gap * (rows - 1))) / rows;

  for (let i = 0; i < count; i++) {
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);

    const itemsInThisRow = (rowIdx === rows - 1) ? (count - rowIdx * cols) : cols;
    let offsetX = 0;
    if (itemsInThisRow < cols) {
      const rowContentW = itemsInThisRow * cellW + (itemsInThisRow - 1) * gap;
      offsetX = (area.w - rowContentW) / 2 - (colIdx * (cellW + gap));
    }

    cells.push({
      x: area.x + colIdx * (cellW + gap) + (itemsInThisRow < cols ? offsetX : 0),
      y: area.y + rowIdx * (cellH + gap),
      w: cellW,
      h: cellH
    });
  }

  return cells;
}

function drawCollageCell(ctx, cell, item, cfg) {
  ctx.save();

  if (cfg.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
  }

  ctx.fillStyle = 'rgba(26, 30, 40, 0.85)';
  roundRect(ctx, cell.x, cell.y, cell.w, cell.h, cfg.radius);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.save();
  roundRect(ctx, cell.x, cell.y, cell.w, cell.h, cfg.radius);
  ctx.clip();

  if (item.imgObj && item.imgObj.complete && item.imgObj.naturalWidth > 0) {
    drawImageFit(ctx, item.imgObj, cell.x, cell.y, cell.w, cell.h, cfg.fitMode);
  } else {
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Foto tidak tersedia', cell.x + cell.w / 2, cell.y + cell.h / 2);
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, cell.x, cell.y, cell.w, cell.h, cfg.radius);
  ctx.stroke();

  const sideBadgeText = item.sisi === 'obverse' ? 'OBVERSE' : item.sisi === 'reverse' ? 'REVERSE' : 'UTAMA';
  const badgeW = 74;
  const badgeH = 24;
  const badgeX = cell.x + 12;
  const badgeY = cell.y + 12;

  ctx.fillStyle = 'rgba(10, 12, 16, 0.75)';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.lineWidth = 1;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
  ctx.stroke();

  ctx.fillStyle = '#f0c840';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sideBadgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

  if (cfg.showBadges) {
    const infoH = Math.min(54, cell.h * 0.3);
    const infoY = cell.y + cell.h - infoH;

    const infoGrad = ctx.createLinearGradient(0, infoY - 10, 0, cell.y + cell.h);
    infoGrad.addColorStop(0, 'rgba(10, 12, 16, 0)');
    infoGrad.addColorStop(0.3, 'rgba(10, 12, 16, 0.75)');
    infoGrad.addColorStop(1, 'rgba(10, 12, 16, 0.95)');

    ctx.save();
    roundRect(ctx, cell.x, cell.y, cell.w, cell.h, cfg.radius);
    ctx.clip();

    ctx.fillStyle = infoGrad;
    ctx.fillRect(cell.x, infoY - 10, cell.w, infoH + 10);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Inter, sans-serif';
    const maxTitleW = cell.w - 32;
    const truncatedTitle = truncateText(ctx, item.nama_item, maxTitleW);
    ctx.fillText(truncatedTitle, cell.x + 16, infoY + 20);

    ctx.fillStyle = '#d4af37';
    ctx.font = '12px Inter, sans-serif';
    const subParts = [];
    if (item.tahun) subParts.push(item.tahun);
    if (item.denominasi) subParts.push(item.denominasi);
    if (item.grade) subParts.push(`Grade: ${item.grade}`);
    const subText = subParts.join(' • ') || 'Numismatik';
    ctx.fillText(truncateText(ctx, subText, maxTitleW), cell.x + 16, infoY + 38);

    ctx.restore();
  }

  ctx.restore();
}

function drawCollageWatermark(ctx, W, H, cfg) {
  if (cfg.watermarkPos === 'none' || !cfg.watermarkText) return;

  ctx.save();
  if (cfg.watermarkPos === 'header') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#f0c840';
    ctx.font = 'bold 28px "Cinzel", "Times New Roman", serif, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(cfg.watermarkText.toUpperCase(), W / 2, cfg.padding + 36);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, cfg.padding + 60);
    ctx.lineTo(W / 2 + 120, cfg.padding + 60);
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(W / 2, cfg.padding + 60, 4, 0, Math.PI * 2);
    ctx.fill();

  } else if (cfg.watermarkPos === 'footer') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240, 200, 64, 0.85)';
    ctx.font = 'bold 18px "Cinzel", serif, sans-serif';
    ctx.fillText(cfg.watermarkText, W / 2, H - cfg.padding - 20);

  } else if (cfg.watermarkPos === 'bottom-right') {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(cfg.watermarkText, W - cfg.padding - 14, H - cfg.padding - 14);
  }
  ctx.restore();
}

function drawImageFit(ctx, img, x, y, w, h, mode = 'cover') {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const imgRatio = iw / ih;
  const targetRatio = w / h;

  let dw, dh, dx, dy;

  if (mode === 'contain') {
    if (imgRatio > targetRatio) {
      dw = w;
      dh = w / imgRatio;
      dx = x;
      dy = y + (h - dh) / 2;
    } else {
      dh = h;
      dw = h * imgRatio;
      dx = x + (w - dw) / 2;
      dy = y;
    }
    ctx.fillStyle = 'rgba(10, 12, 16, 0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    let sx, sy, sw, sh;
    if (imgRatio > targetRatio) {
      sh = ih;
      sw = ih * targetRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = iw / targetRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
}

function truncateText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
    str = str.substring(0, str.length - 1);
  }
  return str + '...';
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'undefined') r = 0;
  if (typeof r === 'number') {
    r = { tl: r, tr: r, br: r, bl: r };
  }
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function downloadCollage(format = 'png') {
  const canvas = document.getElementById('studioMainCanvas');
  if (!canvas) return;

  if (window.KreativitasState.selectedItems.length === 0) {
    showToast('Pilih setidaknya 1 item koleksi terlebih dahulu!', 'warning');
    return;
  }

  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const filename = `NumisManager_Collage_${Date.now()}.${ext}`;

  canvas.toBlob((blob) => {
    if (!blob) {
      showToast('Gagal memproses gambar kolase', 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Kolase berhasil diunduh (${filename})`, 'success');
  }, mime, 0.95);
}

async function copyCollageToClipboard() {
  const canvas = document.getElementById('studioMainCanvas');
  if (!canvas) return;

  if (window.KreativitasState.selectedItems.length === 0) {
    showToast('Pilih setidaknya 1 item koleksi terlebih dahulu!', 'warning');
    return;
  }

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Blob konversi gagal');
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('Kolase berhasil disalin ke clipboard! Siap dipaste ke WA/Sosmed.', 'success');
    }, 'image/png');
  } catch (err) {
    console.error('Clipboard copy error:', err);
    showToast('Gagal menyalin gambar ke clipboard: ' + err.message, 'error');
  }
}

// =============================================================================
// SLIDE SHOW MAKER ENGINE & VIDEO RECORDER
// =============================================================================

function getTotalSlideshowDuration() {
  const items = window.KreativitasState.selectedItems;
  const duration = window.KreativitasState.slideshowConfig.duration;
  return items.length * duration;
}

async function initSlideshowPlayer() {
  const canvas = document.getElementById('studioMainCanvas');
  if (!canvas) return;

  const items = window.KreativitasState.selectedItems;
  const cfg = window.KreativitasState.slideshowConfig;

  const { width: W, height: H } = getCanvasDimensions(cfg.ratio, true);
  canvas.width = W;
  canvas.height = H;

  const dimBadge = document.getElementById('canvasDimensionBadge');
  if (dimBadge) dimBadge.textContent = `${W} × ${H} px (Video)`;

  for (const it of items) {
    if (!it.imgObj || !it.imgObj.complete) {
      it.imgObj = await preloadImage(it.foto_url);
    }
  }

  const totalSec = getTotalSlideshowDuration();
  const timeline = document.getElementById('slideshowTimeline');
  if (timeline) {
    timeline.max = totalSec > 0 ? totalSec : 1;
    timeline.value = 0;
  }

  const totalTimeText = document.getElementById('playerTotalTimeText');
  if (totalTimeText) totalTimeText.textContent = formatTime(totalSec);

  window.KreativitasState.player.currentTime = 0;
  updateSlideshowDisplay(0);
}

function renderSlideshowAtTime(timeSec) {
  const canvas = document.getElementById('studioMainCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const items = window.KreativitasState.selectedItems;
  const cfg = window.KreativitasState.slideshowConfig;
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = cfg.bgColor || '#0a0c10';
  ctx.fillRect(0, 0, W, H);

  if (items.length === 0) return;

  const slideDuration = cfg.duration;
  const transDuration = Math.min(cfg.transitionDuration, slideDuration * 0.4);
  const totalSec = items.length * slideDuration;

  const t = Math.max(0, Math.min(timeSec, totalSec));
  const currentIdx = Math.min(items.length - 1, Math.floor(t / slideDuration));
  const timeIntoSlide = t - (currentIdx * slideDuration);

  const currentItem = items[currentIdx];
  const nextIdx = (currentIdx + 1) % items.length;
  const nextItem = items[nextIdx];

  const inTransition = (timeIntoSlide >= slideDuration - transDuration) && (items.length > 1);
  const transProgress = inTransition ? ((timeIntoSlide - (slideDuration - transDuration)) / transDuration) : 0;

  drawSlideTransition(ctx, W, H, currentItem, nextItem, transProgress, inTransition, cfg.transition, timeIntoSlide, slideDuration);

  // Top Cinematic Bar
  ctx.fillStyle = 'rgba(10, 12, 16, 0.4)';
  ctx.fillRect(0, 0, W, 40);

  ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.font = 'bold 16px "Cinzel", serif, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('NUMISMANAGER SHOWCASE', 24, 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Slide ${currentIdx + 1} dari ${items.length}`, W - 24, 20);

  if (cfg.showInfoOverlay && currentItem) {
    drawSlideInfoOverlay(ctx, W, H, currentItem, inTransition ? (1 - transProgress) : 1);
  }
}

function drawSlideTransition(ctx, W, H, itemA, itemB, t, inTransition, type, timeInSlide, slideDuration) {
  if (!inTransition || type === 'cut' || !itemB) {
    let zoomScale = 1.0;
    if (type === 'zoom') {
      zoomScale = 1.0 + (timeInSlide / slideDuration) * 0.08;
    }
    drawSingleSlideImage(ctx, W, H, itemA, 1.0, 0, 0, zoomScale);
    return;
  }

  const easeT = t * t * (3 - 2 * t);

  switch (type) {
    case 'slide-left':
      drawSingleSlideImage(ctx, W, H, itemA, 1.0, -W * easeT, 0);
      drawSingleSlideImage(ctx, W, H, itemB, 1.0, W * (1 - easeT), 0);
      break;

    case 'slide-up':
      drawSingleSlideImage(ctx, W, H, itemA, 1.0, 0, -H * easeT);
      drawSingleSlideImage(ctx, W, H, itemB, 1.0, 0, H * (1 - easeT));
      break;

    case 'fade-black':
      if (t < 0.5) {
        const alpha = 1 - (t * 2);
        drawSingleSlideImage(ctx, W, H, itemA, alpha, 0, 0);
      } else {
        const alpha = (t - 0.5) * 2;
        drawSingleSlideImage(ctx, W, H, itemB, alpha, 0, 0);
      }
      break;

    case 'coin-flip':
      ctx.save();
      ctx.translate(W / 2, H / 2);
      const angle = easeT * Math.PI;
      const cosA = Math.cos(angle);
      ctx.scale(Math.abs(cosA), 1);
      ctx.translate(-W / 2, -H / 2);

      if (cosA >= 0) {
        drawSingleSlideImage(ctx, W, H, itemA, 1.0, 0, 0);
      } else {
        drawSingleSlideImage(ctx, W, H, itemB, 1.0, 0, 0);
      }
      ctx.restore();
      break;

    case 'zoom':
      const scaleA = 1.08 + easeT * 0.15;
      drawSingleSlideImage(ctx, W, H, itemA, 1 - easeT, 0, 0, scaleA);
      const scaleB = 1.2 - (1 - easeT) * 0.15;
      drawSingleSlideImage(ctx, W, H, itemB, easeT, 0, 0, scaleB);
      break;

    case 'crossfade':
    default:
      drawSingleSlideImage(ctx, W, H, itemA, 1.0, 0, 0);
      drawSingleSlideImage(ctx, W, H, itemB, easeT, 0, 0);
      break;
  }
}

function drawSingleSlideImage(ctx, W, H, item, alpha = 1.0, offsetX = 0, offsetY = 0, scale = 1.0) {
  if (!item) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  if (scale !== 1.0) {
    ctx.translate(W / 2 + offsetX, H / 2 + offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-(W / 2 + offsetX), -(H / 2 + offsetY));
  }

  const pad = 60;
  const drawW = W - pad * 2;
  const drawH = H - pad * 2 - 40;
  const drawX = pad + offsetX;
  const drawY = pad + offsetY;

  if (item.imgObj && item.imgObj.complete && item.imgObj.naturalWidth > 0) {
    drawImageFit(ctx, item.imgObj, drawX, drawY, drawW, drawH, 'contain');
  }

  ctx.restore();
}

function drawSlideInfoOverlay(ctx, W, H, item, opacity = 1.0) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

  const barH = 110;
  const barY = H - barH;

  const grad = ctx.createLinearGradient(0, barY, 0, H);
  grad.addColorStop(0, 'rgba(10, 12, 16, 0)');
  grad.addColorStop(0.3, 'rgba(10, 12, 16, 0.85)');
  grad.addColorStop(1, 'rgba(10, 12, 16, 0.98)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, barY, W, barH);

  ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
  ctx.fillRect(36, barY + 30, 4, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(item.nama_item, 50, barY + 30);

  ctx.fillStyle = '#d4af37';
  ctx.font = '15px Inter, sans-serif';
  const parts = [];
  if (item.tahun) parts.push(`Tahun: ${item.tahun}`);
  if (item.denominasi) parts.push(`Denominasi: ${item.denominasi}`);
  if (item.grade) parts.push(`Grade: ${item.grade}`);
  if (item.negara) parts.push(item.negara);
  parts.push(item.sisi === 'obverse' ? 'Sisi Depan (Obverse)' : item.sisi === 'reverse' ? 'Sisi Belakang (Reverse)' : 'Foto Utama');

  ctx.fillText(parts.join('  •  '), 50, barY + 58);

  ctx.restore();
}

function updateSlideshowDisplay(t) {
  renderSlideshowAtTime(t);

  const timeline = document.getElementById('slideshowTimeline');
  if (timeline && !window.KreativitasState.player.isScrubbing) {
    timeline.value = t;
  }

  const curText = document.getElementById('playerCurrentTimeText');
  if (curText) curText.textContent = formatTime(t);

  const items = window.KreativitasState.selectedItems;
  const currentIdx = Math.min(items.length, Math.floor(t / (window.KreativitasState.slideshowConfig.duration || 1)) + 1);
  const slideInfo = document.getElementById('playerSlideInfoText');
  if (slideInfo) slideInfo.textContent = `Slide ${currentIdx} / ${items.length || 1}`;
}

function toggleSlideshowPlayback() {
  if (window.KreativitasState.player.isPlaying) {
    pauseSlideshow();
  } else {
    playSlideshow();
  }
}

function playSlideshow() {
  const items = window.KreativitasState.selectedItems;
  if (items.length === 0) {
    showToast('Pilih foto item koleksi terlebih dahulu!', 'warning');
    return;
  }

  const totalSec = getTotalSlideshowDuration();
  if (window.KreativitasState.player.currentTime >= totalSec) {
    window.KreativitasState.player.currentTime = 0;
  }

  window.KreativitasState.player.isPlaying = true;
  window.KreativitasState.player.lastFrameTime = performance.now();

  const playIcon = document.getElementById('playerPlayIcon');
  if (playIcon) playIcon.textContent = '⏸️';

  // Start background music
  NumisAudioEngine.play(window.KreativitasState.player.currentTime);

  function loop(now) {
    if (!window.KreativitasState.player.isPlaying) return;

    const deltaSec = (now - window.KreativitasState.player.lastFrameTime) / 1000;
    window.KreativitasState.player.lastFrameTime = now;

    window.KreativitasState.player.currentTime += deltaSec;
    const total = getTotalSlideshowDuration();

    if (window.KreativitasState.player.currentTime >= total) {
      window.KreativitasState.player.currentTime = 0;
      NumisAudioEngine.seek(0);
    }

    updateSlideshowDisplay(window.KreativitasState.player.currentTime);
    window.KreativitasState.player.animFrameId = requestAnimationFrame(loop);
  }

  window.KreativitasState.player.animFrameId = requestAnimationFrame(loop);
}

function pauseSlideshow() {
  window.KreativitasState.player.isPlaying = false;
  if (window.KreativitasState.player.animFrameId) {
    cancelAnimationFrame(window.KreativitasState.player.animFrameId);
    window.KreativitasState.player.animFrameId = null;
  }
  const playIcon = document.getElementById('playerPlayIcon');
  if (playIcon) playIcon.textContent = '▶️';

  NumisAudioEngine.pause();
}

function restartSlideshow() {
  pauseSlideshow();
  window.KreativitasState.player.currentTime = 0;
  NumisAudioEngine.stop();
  updateSlideshowDisplay(0);
}

function nextSlide() {
  const duration = window.KreativitasState.slideshowConfig.duration;
  const total = getTotalSlideshowDuration();
  let nextT = Math.floor(window.KreativitasState.player.currentTime / duration + 1) * duration;
  if (nextT >= total) nextT = 0;
  window.KreativitasState.player.currentTime = nextT;
  NumisAudioEngine.seek(nextT);
  updateSlideshowDisplay(nextT);
}

function prevSlide() {
  const duration = window.KreativitasState.slideshowConfig.duration;
  let prevT = Math.floor((window.KreativitasState.player.currentTime - 0.1) / duration) * duration;
  if (prevT < 0) prevT = 0;
  window.KreativitasState.player.currentTime = prevT;
  NumisAudioEngine.seek(prevT);
  updateSlideshowDisplay(prevT);
}

function onTimelineScrub(val) {
  const t = parseFloat(val);
  window.KreativitasState.player.currentTime = t;
  NumisAudioEngine.seek(t);
  updateSlideshowDisplay(t);
}

/**
 * Export Slideshow as Video (Supports MP4, WebM, MKV and combined Audio)
 */
async function exportSlideshowVideo() {
  const items = window.KreativitasState.selectedItems;
  if (items.length === 0) {
    showToast('Pilih setidaknya 1 item koleksi untuk diekspor ke video!', 'warning');
    return;
  }

  if (!window.MediaRecorder) {
    showToast('Browser Anda tidak mendukung MediaRecorder untuk ekspor video langsung.', 'error');
    return;
  }

  pauseSlideshow();
  NumisAudioEngine.stop();

  const canvas = document.getElementById('studioMainCanvas');
  const totalDuration = getTotalSlideshowDuration();
  const requestedFormat = (window.KreativitasState.slideshowConfig.exportFormat || 'mp4').toLowerCase();

  const preferredMimes = requestedFormat === 'mp4' ? [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm'
  ] : requestedFormat === 'mkv' ? [
    'video/x-matroska;codecs=avc1',
    'video/x-matroska',
    'video/webm;codecs=vp9,opus',
    'video/webm'
  ] : [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ];

  let selectedMime = '';
  for (const m of preferredMimes) {
    if (MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  if (!selectedMime) {
    selectedMime = 'video/webm';
  }

  showExportProgressModal(totalDuration, requestedFormat);

  const canvasStream = canvas.captureStream(30);

  // Play audio to route into recorder stream
  NumisAudioEngine.play(0);
  const audioTrack = NumisAudioEngine.getAudioTrack();

  const combinedTracks = [...canvasStream.getVideoTracks()];
  if (audioTrack && window.KreativitasState.slideshowConfig.audioTheme !== 'none') {
    combinedTracks.push(audioTrack);
  }
  const combinedStream = new MediaStream(combinedTracks);

  const recordedChunks = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: window.KreativitasState.slideshowConfig.exportBitrate || 5000000
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.onstop = () => {
    NumisAudioEngine.stop();
    const videoBlob = new Blob(recordedChunks, { type: selectedMime });
    const videoUrl = URL.createObjectURL(videoBlob);
    showVideoPreviewModal(videoUrl, videoBlob, requestedFormat);
  };

  recorder.start(100);

  const fps = 30;
  const frameIntervalMs = 1000 / fps;
  const totalFrames = Math.ceil(totalDuration * fps);
  let currentFrame = 0;

  function recordNextFrame() {
    const t = currentFrame / fps;
    renderSlideshowAtTime(t);

    currentFrame++;
    const progressPercent = Math.min(100, Math.floor((currentFrame / totalFrames) * 100));
    updateExportProgress(progressPercent, t, totalDuration);

    if (currentFrame <= totalFrames) {
      setTimeout(recordNextFrame, frameIntervalMs);
    } else {
      setTimeout(() => {
        try { recorder.stop(); } catch (err) {}
      }, 200);
    }
  }

  recordNextFrame();
}

function showExportProgressModal(totalSec, formatExt) {
  const modalContainer = document.getElementById('modalContainer');
  const modalOverlay = document.getElementById('modalOverlay');

  modalContainer.innerHTML = `
    <div class="modal-card" style="max-width: 500px; text-align: center; padding: 28px;">
      <div style="font-size: 2.8rem; margin-bottom: 12px; animation: pulse 1.5s infinite;">🎬</div>
      <h3 style="margin: 0 0 6px; color: var(--gold-light);">Merekam Video (${formatExt.toUpperCase()})</h3>
      <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 20px;">
        Merender frame visual dan menggabungkan audio musik latar...
      </p>

      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; height: 14px; overflow: hidden; margin-bottom: 10px;">
        <div id="exportProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold-light)); transition: width 0.1s linear;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
        <span id="exportProgressPercent">0%</span>
        <span id="exportProgressTime">00:00 / ${formatTime(totalSec)}</span>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');
}

function updateExportProgress(percent, curSec, totalSec) {
  const bar = document.getElementById('exportProgressBar');
  const pct = document.getElementById('exportProgressPercent');
  const time = document.getElementById('exportProgressTime');

  if (bar) bar.style.width = `${percent}%`;
  if (pct) pct.textContent = `${percent}%`;
  if (time) time.textContent = `${formatTime(curSec)} / ${formatTime(totalSec)}`;
}

function showVideoPreviewModal(videoUrl, videoBlob, formatExt) {
  const modalContainer = document.getElementById('modalContainer');
  const modalOverlay = document.getElementById('modalOverlay');
  const filename = `NumisManager_SlideShow_${Date.now()}.${formatExt}`;

  modalContainer.innerHTML = `
    <div class="modal-card" style="max-width: 760px; padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: var(--gold-light); font-size: 1.25rem; display: flex; align-items: center; gap: 8px;">
          <span>🎉</span> Video Berhasil Dirender!
        </h3>
        <button class="btn-close-modal" onclick="closeStudioModal()">✕</button>
      </div>

      <div style="background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <video src="${videoUrl}" controls autoplay loop style="width: 100%; max-height: 440px; display: block; object-fit: contain;"></video>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Ukuran File: ${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB • Format: <strong style="color: var(--gold-light);">${formatExt.toUpperCase()}</strong>
        </span>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-secondary" onclick="closeStudioModal()">Tutup</button>
          <a id="btnDownloadVideoLink" href="${videoUrl}" download="${filename}" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
            <span>📥</span> Unduh Video (.${formatExt.toUpperCase()})
          </a>
        </div>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');
}

function closeStudioModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContainer = document.getElementById('modalContainer');
  if (modalOverlay) modalOverlay.classList.add('hidden');
  if (modalContainer) modalContainer.classList.remove('modal-kreativitas-wide');
}

// =============================================================================
// MODAL PEMILIH ITEM CERDAS & LUAS DENGAN FILTER GROUP LENGKAP (WIDE 2-COLUMN SPLIT)
// =============================================================================

window.ItemSelectorState = {
  search: '',
  group_id: '',
  jenis: '',
  grade: '',
  batch_id: '',
  status_koleksi: '',
  negara: '',
  tahun_dari: '',
  tahun_sampai: '',
  items: [],
  page: 1,
  limit: 120,
  totalPages: 1,
  defaultSideMode: 'both' // 'both' | 'obverse' | 'reverse'
};

/**
 * Open Item Selector Modal (Wide 2-Column Split Layout dengan Filter Group Lengkap)
 */
async function openItemSelectorModal() {
  const modalContainer = document.getElementById('modalContainer');
  const modalOverlay = document.getElementById('modalOverlay');

  modalContainer.classList.add('modal-kreativitas-wide');

  // Load group and batch metadata if not cached yet
  await loadFilterMetadata();

  modalContainer.innerHTML = `
    <div class="item-selector-modal-wide">
      
      <!-- Modal Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
        <div>
          <h3 style="margin: 0; color: var(--gold-light); font-size: 1.3rem; display: flex; align-items: center; gap: 8px;">
            <span>🔍</span> Pilih Item Koleksi untuk Kreativitas
          </h3>
          <p style="margin: 2px 0 0; color: var(--text-secondary); font-size: 0.85rem;">
            Filter berdasarkan Group Seri, Jenis, Grade, Batch, dll. di panel kiri, lalu pilih item dari katalog di kanan.
          </p>
        </div>
        <button class="btn-close-modal" onclick="closeStudioModal()">✕</button>
      </div>

      <!-- Modal Body Split into 2 Columns: Filter Sidebar + Catalog Grid -->
      <div class="selector-modal-body-split">
        
        <!-- Left Column: Filter Sidebar Panel (lebar 320px) -->
        <div class="selector-filter-sidebar">
          <div style="font-size: 0.92rem; font-weight: 700; color: var(--gold-light); display: flex; align-items: center; gap: 6px;">
            <span>⚡</span> Filter &amp; Pencarian
          </div>

          <!-- Input Search -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">Pencarian (Nama/Kode/Tahun/Seri)</label>
            <input type="text" id="modalFilterSearch" class="form-control form-control-sm" placeholder="Ketik kata kunci..." value="${window.ItemSelectorState.search}" oninput="debounceFilterItems()">
          </div>

          <!-- GROUP ITEM / KATEGORI SERI -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem; color: var(--gold-light); font-weight: 600;">
              🏷️ Group Item / Kategori Seri
            </label>
            <select id="modalFilterGroup" class="form-control form-control-sm" onchange="applyItemSelectorFilters()">
              <option value="">Semua Group Koleksi</option>
              ${(window.KreativitasState.groupItemsList || []).map(g => `
                <option value="${g.id}" ${window.ItemSelectorState.group_id == g.id ? 'selected' : ''}>
                  ${g.nama_group}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Jenis Koleksi -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">Jenis Koleksi</label>
            <select id="modalFilterJenis" class="form-control form-control-sm" onchange="applyItemSelectorFilters()">
              <option value="">Semua Jenis</option>
              <option value="koin" ${window.ItemSelectorState.jenis === 'koin' ? 'selected' : ''}>Koin</option>
              <option value="uang_kertas" ${window.ItemSelectorState.jenis === 'uang_kertas' ? 'selected' : ''}>Uang Kertas</option>
              <option value="medali" ${window.ItemSelectorState.jenis === 'medali' ? 'selected' : ''}>Medali</option>
              <option value="token" ${window.ItemSelectorState.jenis === 'token' ? 'selected' : ''}>Token</option>
            </select>
          </div>

          <!-- Grade -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">Grade Numismatik</label>
            <select id="modalFilterGrade" class="form-control form-control-sm" onchange="applyItemSelectorFilters()">
              <option value="">Semua Grade</option>
              <option value="UNC" ${window.ItemSelectorState.grade === 'UNC' ? 'selected' : ''}>UNC</option>
              <option value="AU" ${window.ItemSelectorState.grade === 'AU' ? 'selected' : ''}>AU</option>
              <option value="XF" ${window.ItemSelectorState.grade === 'XF' ? 'selected' : ''}>XF</option>
              <option value="VF" ${window.ItemSelectorState.grade === 'VF' ? 'selected' : ''}>VF</option>
              <option value="F" ${window.ItemSelectorState.grade === 'F' ? 'selected' : ''}>F</option>
              <option value="Raw" ${window.ItemSelectorState.grade === 'Raw' ? 'selected' : ''}>Raw / Ungraded</option>
            </select>
          </div>

          <!-- BATCH PEMBELIAN -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">📦 Batch Pembelian</label>
            <select id="modalFilterBatch" class="form-control form-control-sm" onchange="applyItemSelectorFilters()">
              <option value="">Semua Batch</option>
              ${(window.KreativitasState.batchesList || []).map(b => `
                <option value="${b.id}" ${window.ItemSelectorState.batch_id == b.id ? 'selected' : ''}>
                  ${b.kode_batch} - ${b.nama_batch || 'Lot'}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Status Koleksi -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">Status Koleksi</label>
            <select id="modalFilterStatus" class="form-control form-control-sm" onchange="applyItemSelectorFilters()">
              <option value="">Semua Status</option>
              <option value="koleksi_pribadi" ${window.ItemSelectorState.status_koleksi === 'koleksi_pribadi' ? 'selected' : ''}>Koleksi Pribadi</option>
              <option value="stock_jual" ${window.ItemSelectorState.status_koleksi === 'stock_jual' ? 'selected' : ''}>Stock Jual</option>
              <option value="terjual" ${window.ItemSelectorState.status_koleksi === 'terjual' ? 'selected' : ''}>Terjual</option>
            </select>
          </div>

          <!-- Negara Asal -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">Negara Asal</label>
            <input type="text" id="modalFilterNegara" class="form-control form-control-sm" placeholder="Contoh: Indonesia, Philippines..." value="${window.ItemSelectorState.negara}" oninput="debounceFilterItems()">
          </div>

          <!-- Mode Sisi Tambah Cepat -->
          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
            <label class="form-label" style="font-size: 0.78rem; margin-bottom: 6px;">Mode Sisi Saat Tambah Cepat:</label>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.82rem;">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <input type="radio" name="sideChoiceMode" value="both" ${window.ItemSelectorState.defaultSideMode === 'both' ? 'checked' : ''} onchange="window.ItemSelectorState.defaultSideMode = this.value">
                <span>Depan &amp; Belakang</span>
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <input type="radio" name="sideChoiceMode" value="obverse" ${window.ItemSelectorState.defaultSideMode === 'obverse' ? 'checked' : ''} onchange="window.ItemSelectorState.defaultSideMode = this.value">
                <span>Depan Saja</span>
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <input type="radio" name="sideChoiceMode" value="reverse" ${window.ItemSelectorState.defaultSideMode === 'reverse' ? 'checked' : ''} onchange="window.ItemSelectorState.defaultSideMode = this.value">
                <span>Belakang Saja</span>
              </label>
            </div>
          </div>

          <!-- Tombol Aksi Massal -->
          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-outline-gold btn-sm w-100" onclick="selectAllFilteredItems()">
              <span>☑️</span> Pilih Semua Hasil Ini
            </button>
            <button class="btn btn-secondary btn-sm w-100" onclick="resetItemSelectorFilters()">
              <span>🔄</span> Reset Filter
            </button>
          </div>

          <div id="modalFilterMatchCount" style="font-size: 0.78rem; color: var(--text-muted); text-align: center; margin-top: auto; padding-top: 8px;">
            Memuat data...
          </div>
        </div>

        <!-- Right Column: Wide Catalog Area (flex-1) -->
        <div class="selector-catalog-area">
          <div id="modalItemsScrollGrid" style="flex: 1; overflow-y: auto; max-height: calc(92vh - 160px); padding-right: 4px;">
            <div style="text-align: center; padding: 60px; color: var(--text-muted);">
              Memuat katalog koleksi...
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
        <div style="font-size: 0.92rem; color: var(--text-secondary);">
          Total di Keranjang: <strong id="modalBasketTotalCount" style="color: var(--gold-light); font-size: 1.05rem;">${window.KreativitasState.selectedItems.length} foto</strong>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline-danger btn-sm" onclick="clearBasketItems(); updateModalCounters(); renderModalItemsGrid(window.ItemSelectorState.items);">
            <span>🗑️</span> Kosongkan Keranjang
          </button>
          <button class="btn btn-secondary" onclick="closeStudioModal()">Tutup</button>
          <button class="btn btn-primary" onclick="confirmItemSelection()">
            <span>✅</span> Gunakan Foto Terpilih
          </button>
        </div>
      </div>

    </div>
  `;

  modalOverlay.classList.remove('hidden');
  await fetchModalItems();
}

let filterDebounceTimer = null;
function debounceFilterItems() {
  clearTimeout(filterDebounceTimer);
  filterDebounceTimer = setTimeout(() => {
    applyItemSelectorFilters();
  }, 300);
}

function applyItemSelectorFilters() {
  window.ItemSelectorState.search = document.getElementById('modalFilterSearch')?.value || '';
  window.ItemSelectorState.group_id = document.getElementById('modalFilterGroup')?.value || '';
  window.ItemSelectorState.jenis = document.getElementById('modalFilterJenis')?.value || '';
  window.ItemSelectorState.grade = document.getElementById('modalFilterGrade')?.value || '';
  window.ItemSelectorState.batch_id = document.getElementById('modalFilterBatch')?.value || '';
  window.ItemSelectorState.status_koleksi = document.getElementById('modalFilterStatus')?.value || '';
  window.ItemSelectorState.negara = document.getElementById('modalFilterNegara')?.value || '';
  window.ItemSelectorState.page = 1;
  fetchModalItems();
}

function resetItemSelectorFilters() {
  window.ItemSelectorState.search = '';
  window.ItemSelectorState.group_id = '';
  window.ItemSelectorState.jenis = '';
  window.ItemSelectorState.grade = '';
  window.ItemSelectorState.batch_id = '';
  window.ItemSelectorState.status_koleksi = '';
  window.ItemSelectorState.negara = '';

  const sInput = document.getElementById('modalFilterSearch');
  const grpInput = document.getElementById('modalFilterGroup');
  const jInput = document.getElementById('modalFilterJenis');
  const gInput = document.getElementById('modalFilterGrade');
  const bInput = document.getElementById('modalFilterBatch');
  const stInput = document.getElementById('modalFilterStatus');
  const nInput = document.getElementById('modalFilterNegara');

  if (sInput) sInput.value = '';
  if (grpInput) grpInput.value = '';
  if (jInput) jInput.value = '';
  if (gInput) gInput.value = '';
  if (bInput) bInput.value = '';
  if (stInput) stInput.value = '';
  if (nInput) nInput.value = '';

  applyItemSelectorFilters();
}

async function fetchModalItems() {
  const container = document.getElementById('modalItemsScrollGrid');
  const matchCountLbl = document.getElementById('modalFilterMatchCount');
  if (!container) return;

  const st = window.ItemSelectorState;
  const params = new URLSearchParams();
  params.append('page', st.page);
  params.append('limit', st.limit);
  if (st.search) params.append('search', st.search);
  if (st.group_id) params.append('group_id', st.group_id);
  if (st.jenis) params.append('jenis', st.jenis);
  if (st.grade) params.append('grade', st.grade);
  if (st.batch_id) params.append('batch_id', st.batch_id);
  if (st.status_koleksi) params.append('status_koleksi', st.status_koleksi);
  if (st.negara) params.append('negara', st.negara);

  try {
    const res = await API.get(`/koleksi/?${params.toString()}`);
    const items = res.data || res.items || [];
    st.items = items;
    st.totalPages = res.total_pages || 1;

    if (matchCountLbl) {
      matchCountLbl.textContent = `Menampilkan ${items.length} dari ${res.total || items.length} koleksi`;
    }

    renderModalItemsGrid(items);
  } catch (err) {
    console.error('Gagal mengambil data katalog koleksi:', err);
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #ef4444;">
        Gagal memuat katalog: ${err.message}
      </div>
    `;
  }
}

/**
 * Render items in selector modal grid (wide view)
 */
function renderModalItemsGrid(items) {
  const container = document.getElementById('modalItemsScrollGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🪙</div>
        Tidak ditemukan item koleksi yang sesuai kriteria pencarian.<br>
        <button class="btn btn-outline-gold btn-sm" style="margin-top: 12px;" onclick="resetItemSelectorFilters()">Reset Filter</button>
      </div>
    `;
    return;
  }

  const selectedList = window.KreativitasState.selectedItems;

  container.innerHTML = `
    <div class="modal-catalog-grid-wide">
      ${items.map(item => {
        const photos = getItemPhotos(item);
        const hasObverse = !!photos.obv;
        const hasReverse = !!photos.rev;
        const hasMain = !!photos.main;
        const primaryThumb = photos.obv || photos.rev || photos.main || '/static/img/logo.png';

        const isObvSelected = isSideInBasket(item.id, 'obverse');
        const isRevSelected = isSideInBasket(item.id, 'reverse');
        const isMainSelected = isSideInBasket(item.id, 'utama');
        const countInBasket = selectedList.filter(s => s.koleksi_id === item.id).length;

        return `
          <div class="modal-item-card ${countInBasket > 0 ? 'selected-in-basket' : ''}" id="modalCard_${item.id}" onclick="onItemCardQuickClick(event, ${item.id})">
            <div class="modal-card-thumb-wrap">
              <img src="${primaryThumb}" alt="${item.nama_item}" onerror="this.onerror=null; this.src='/static/img/logo.png';">
              <div class="modal-card-badges">
                ${item.grade ? `<span class="badge badge-gold" style="font-size: 0.72rem;">${item.grade}</span>` : ''}
                ${item.jenis ? `<span class="badge badge-secondary" style="font-size: 0.72rem;">${item.jenis}</span>` : ''}
              </div>
              ${countInBasket > 0 ? `
                <div class="modal-selected-badge" title="${countInBasket} foto ada di keranjang">
                  ✓ ${countInBasket} Terpilih
                </div>
              ` : ''}
            </div>

            <div class="modal-card-body">
              <div class="modal-card-title" title="${item.nama_item}">${item.nama_item}</div>
              <div class="modal-card-meta">
                <span>${item.tahun || '-'}</span>
                <span>${item.negara || ''}</span>
                <span>${item.denominasi || ''}</span>
              </div>

              <!-- Quick Action Buttons for adding sides -->
              <div class="modal-card-side-actions">
                ${hasObverse ? `
                  <button type="button" class="btn btn-xs ${isObvSelected ? 'btn-gold-active' : 'btn-outline-gold'}" onclick="event.stopPropagation(); toggleModalItemSide(${item.id}, 'obverse')">
                    ${isObvSelected ? '✓ Depan' : '+ Depan'}
                  </button>
                ` : ''}
                ${hasReverse ? `
                  <button type="button" class="btn btn-xs ${isRevSelected ? 'btn-gold-active' : 'btn-outline-gold'}" onclick="event.stopPropagation(); toggleModalItemSide(${item.id}, 'reverse')">
                    ${isRevSelected ? '✓ Belakang' : '+ Belakang'}
                  </button>
                ` : ''}
                ${(!hasObverse && !hasReverse && hasMain) ? `
                  <button type="button" class="btn btn-xs ${isMainSelected ? 'btn-gold-active' : 'btn-outline-gold'}" onclick="event.stopPropagation(); toggleModalItemSide(${item.id}, 'utama')">
                    ${isMainSelected ? '✓ Foto' : '+ Foto'}
                  </button>
                ` : ''}
                ${(hasObverse && hasReverse) ? `
                  <button type="button" class="btn btn-xs ${isObvSelected && isRevSelected ? 'btn-gold-active' : 'btn-outline-light'}" onclick="event.stopPropagation(); addBothSides(${item.id})" title="Tambahkan Depan & Belakang Sekaligus">
                    ${isObvSelected && isRevSelected ? '✓ Keduanya' : '+ Keduanya'}
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function isSideInBasket(koleksiId, side) {
  return window.KreativitasState.selectedItems.some(s => s.koleksi_id === koleksiId && s.sisi === side);
}

function onItemCardQuickClick(event, koleksiId) {
  if (event.target.closest('button') || event.target.closest('input')) {
    return;
  }

  const item = window.ItemSelectorState.items.find(it => it.id === koleksiId);
  if (!item) return;

  const countInBasket = window.KreativitasState.selectedItems.filter(s => s.koleksi_id === koleksiId).length;
  if (countInBasket > 0) {
    window.KreativitasState.selectedItems = window.KreativitasState.selectedItems.filter(s => s.koleksi_id !== koleksiId);
  } else {
    const mode = window.ItemSelectorState.defaultSideMode;
    const photos = getItemPhotos(item);

    if (mode === 'both') {
      if (photos.obv) addItemToBasket(item, 'obverse', photos.obv, false);
      if (photos.rev) addItemToBasket(item, 'reverse', photos.rev, false);
      if (!photos.obv && !photos.rev && photos.main) addItemToBasket(item, 'utama', photos.main, false);
    } else if (mode === 'obverse') {
      const url = photos.obv || photos.main;
      if (url) addItemToBasket(item, 'obverse', url, false);
    } else if (mode === 'reverse') {
      const url = photos.rev || photos.main;
      if (url) addItemToBasket(item, 'reverse', url, false);
    }
  }

  updateModalCounters();
  renderModalItemsGrid(window.ItemSelectorState.items);
}

function toggleModalItemSide(koleksiId, side) {
  const item = window.ItemSelectorState.items.find(it => it.id === koleksiId);
  if (!item) return;

  const existingIdx = window.KreativitasState.selectedItems.findIndex(s => s.koleksi_id === koleksiId && s.sisi === side);
  if (existingIdx >= 0) {
    window.KreativitasState.selectedItems.splice(existingIdx, 1);
  } else {
    const photos = getItemPhotos(item);
    let fotoUrl = '';
    if (side === 'obverse') fotoUrl = photos.obv || photos.main;
    else if (side === 'reverse') fotoUrl = photos.rev || photos.main;
    else fotoUrl = photos.main || photos.obv;

    if (fotoUrl) {
      addItemToBasket(item, side, fotoUrl, false);
    } else {
      showToast('Item ini tidak memiliki foto untuk sisi tersebut', 'warning');
      return;
    }
  }

  updateModalCounters();
  renderModalItemsGrid(window.ItemSelectorState.items);
}

function addBothSides(koleksiId) {
  const item = window.ItemSelectorState.items.find(it => it.id === koleksiId);
  if (!item) return;

  const photos = getItemPhotos(item);
  const obvIn = isSideInBasket(koleksiId, 'obverse');
  const revIn = isSideInBasket(koleksiId, 'reverse');

  if (obvIn && revIn) {
    window.KreativitasState.selectedItems = window.KreativitasState.selectedItems.filter(s => s.koleksi_id !== koleksiId);
  } else {
    if (photos.obv && !obvIn) {
      addItemToBasket(item, 'obverse', photos.obv, false);
    }
    if (photos.rev && !revIn) {
      addItemToBasket(item, 'reverse', photos.rev, false);
    }
    if (!photos.obv && !photos.rev && photos.main && !isSideInBasket(koleksiId, 'utama')) {
      addItemToBasket(item, 'utama', photos.main, false);
    }
  }

  updateModalCounters();
  renderModalItemsGrid(window.ItemSelectorState.items);
}

function selectAllFilteredItems() {
  const items = window.ItemSelectorState.items;
  const mode = window.ItemSelectorState.defaultSideMode;
  let addedCount = 0;

  for (const item of items) {
    const photos = getItemPhotos(item);
    if (mode === 'both') {
      if (photos.obv && !isSideInBasket(item.id, 'obverse')) {
        addItemToBasket(item, 'obverse', photos.obv, false);
        addedCount++;
      }
      if (photos.rev && !isSideInBasket(item.id, 'reverse')) {
        addItemToBasket(item, 'reverse', photos.rev, false);
        addedCount++;
      }
      if (!photos.obv && !photos.rev && photos.main && !isSideInBasket(item.id, 'utama')) {
        addItemToBasket(item, 'utama', photos.main, false);
        addedCount++;
      }
    } else if (mode === 'obverse') {
      const url = photos.obv || photos.main;
      if (url && !isSideInBasket(item.id, 'obverse')) {
        addItemToBasket(item, 'obverse', url, false);
        addedCount++;
      }
    } else if (mode === 'reverse') {
      const url = photos.rev || photos.main;
      if (url && !isSideInBasket(item.id, 'reverse')) {
        addItemToBasket(item, 'reverse', url, false);
        addedCount++;
      }
    }
  }

  updateModalCounters();
  renderModalItemsGrid(items);
  showToast(`${addedCount} foto koleksi ditambahkan ke keranjang`, 'success');
}

function updateModalCounters() {
  const countSpan = document.getElementById('modalBasketTotalCount');
  if (countSpan) countSpan.textContent = `${window.KreativitasState.selectedItems.length} foto`;
}

function confirmItemSelection() {
  closeStudioModal();
  renderBasketThumbnails();
  if (window.KreativitasState.activeTab === 'collage') {
    renderCollage();
  } else {
    initSlideshowPlayer();
  }
}
