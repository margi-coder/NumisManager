/**
 * ============================================================================
 * NumisManager - Smartphone Hybrid Offline & Remote Server Engine
 * Mendukung:
 * 1. Mode Mandiri (100% Offline di HP Android / iOS menggunakan Local DB)
 * 2. Mode Server PC / Cloud Tunnel (Terhubung ke http://IP-PC:8000 / https://...)
 * ============================================================================
 */
(function() {
  const STORAGE_KEY_DB = 'numis_mobile_standalone_db_v1';
  const STORAGE_KEY_MODE = 'numis_mobile_conn_mode'; // 'offline' | 'remote'
  const STORAGE_KEY_SERVER_URL = 'numis_mobile_server_url';

  const isFileProtocol = window.location.protocol === 'file:' || window.location.protocol === 'content:' || window.location.protocol === 'data:';
  const isStandaloneDoc = Boolean(window.__NUMIS_STANDALONE_MOBILE__);

  function getConnMode() {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    if (saved === 'offline' || saved === 'remote') return saved;
    return (isFileProtocol || isStandaloneDoc) ? 'offline' : 'remote';
  }

  function getRemoteServerUrl() {
    return (localStorage.getItem(STORAGE_KEY_SERVER_URL) || '').replace(/\/+$/, '');
  }

  function loadLocalDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DB);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.users) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local mobile DB:', e);
    }
    const today = new Date().toISOString().split('T')[0];
    const initial = {
      nextIds: { user: 2, supplier: 3, group: 3, batch: 2, koleksi: 3, gallery: 1, penjualan: 1, album: 2, page: 2, slot: 10 },
      users: [
        { id: 1, username: 'admin', password_plain: 'admin123', nama_lengkap: 'Administrator Mobile', role: 'admin', is_active: 1, created_at: today }
      ],
      suppliers: [
        { id: 1, nama: 'Lelang Numismatik Nusantara', kontak: '08123456789', no_hp: '08123456789', platform: 'Facebook', link_profil: '', alamat: 'Jakarta', catatan: 'Supplier utama', created_at: today },
        { id: 2, nama: 'Kolektor Uang Kuno Surabaya', kontak: '08987654321', no_hp: '08987654321', platform: 'Tokopedia', link_profil: '', alamat: 'Surabaya', catatan: '', created_at: today }
      ],
      groups: [
        { id: 1, nama_group: 'DAI NIPPON TEIKOKU SEIHU', deskripsi: 'Seri Pendudukan Jepang (1942-1945)', created_at: today },
        { id: 2, nama_group: 'SERI WAYANG / ORI / BANK INDONESIA', deskripsi: 'Koleksi uang kertas bersejarah Indonesia', created_at: today }
      ],
      batches: [
        { id: 1, kode_batch: 'BTC-20261025-001', nama_batch: 'Lot Perdana Koleksi Mobile', supplier_id: 1, total_ongkir: 15000, perolehan: 'lelang', status: 'terima', is_final_ok: 1, tanggal_beli: today, catatan: 'Contoh batch bawaan mode offline HP', created_at: today }
      ],
      koleksi: [
        {
          id: 1, kode_item: 'ITM-20261025-001', nama_item: '10 Rupiah Dai Nippon Teikoku 1943', nomor_seri: 'SL 012345',
          tahun: '1943', denominasi: '10 Rupiah', grade: 'VF+', jenis: 'uang_kertas', negara: 'Indonesia',
          detail: 'Kondisi kertas utuh dan tebal', catatan_internal: 'Koleksi contoh di HP',
          foto_obv: '', foto_rev: '', foto_path: '', lembaga_grading: '-', nomor_sertifikasi: '', grade_numerik: '', grading_url: '',
          supplier_id: 1, batch_id: 1, group_id: 1, perolehan: 'lelang', tanggal_beli: today, status: 'terima',
          qty: 2, qty_terjual: 0, harga: 120000, ongkir: 15000, hpp: 135000, hpp_per_pcs: 67500, harga_jual: 100000,
          status_koleksi: 'stock_jual', is_checked: 1, created_at: today
        },
        {
          id: 2, kode_item: 'ITM-20261025-002', nama_item: '500 Rupiah Orangutan 1992 UNC', nomor_seri: 'ABC 888999',
          tahun: '1992', denominasi: '500 Rupiah', grade: 'UNC', jenis: 'uang_kertas', negara: 'Indonesia',
          detail: 'Gress lurus tanpa lipatan', catatan_internal: '',
          foto_obv: '', foto_rev: '', foto_path: '', lembaga_grading: '-', nomor_sertifikasi: '', grade_numerik: '', grading_url: '',
          supplier_id: 2, batch_id: null, group_id: 2, perolehan: 'beli_langsung', tanggal_beli: today, status: 'terima',
          qty: 5, qty_terjual: 0, harga: 150000, ongkir: 10000, hpp: 160000, hpp_per_pcs: 32000, harga_jual: 55000,
          status_koleksi: 'stock_jual', is_checked: 1, created_at: today
        }
      ],
      gallery: [],
      penjualan: [],
      albums: [
        { id: 1, nama_album: 'Album Koleksi Utama', deskripsi: 'Binder Digital Uang Kertas & Koin', kategori: 'campuran', warna_cover: '#8b0000', grid_preset: '3x3', rows_per_page: 3, cols_per_page: 3, created_at: today }
      ],
      album_pages: [
        { id: 1, album_id: 1, nomor_halaman: 1, judul_halaman: 'Halaman 1 - Koleksi Pilihan', rows_override: 3, cols_override: 3 }
      ],
      album_slots: []
    };
    saveLocalDb(initial);
    return initial;
  }

  function saveLocalDb(db) {
    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save local mobile DB (quota exceeded?):', e);
    }
  }

  function nextId(db, key) {
    if (!db.nextIds) db.nextIds = {};
    const cur = db.nextIds[key] || 1;
    db.nextIds[key] = cur + 1;
    return cur;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve) => {
      if (!file || typeof FileReader === 'undefined') return resolve('');
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  function enrichKoleksiItem(db, it) {
    const sup = db.suppliers.find(s => Number(s.id) === Number(it.supplier_id));
    const grp = db.groups.find(g => Number(g.id) === Number(it.group_id));
    const bat = db.batches.find(b => Number(b.id) === Number(it.batch_id));
    const gals = (db.gallery || []).filter(gf => Number(gf.koleksi_id) === Number(it.id));
    const qty = Math.max(1, Number(it.qty || 1));
    const terjual = Number(it.qty_terjual || 0);
    return {
      ...it,
      qty_tersisa: Math.max(0, qty - terjual),
      supplier_nama: sup ? sup.nama : null,
      group_nama: grp ? grp.nama_group : null,
      batch_kode: bat ? bat.kode_batch : null,
      batch_nama: bat ? bat.nama_batch : null,
      gallery_fotos: gals
    };
  }

  function recalculateBatchInDb(db, batchId) {
    const b = db.batches.find(x => Number(x.id) === Number(batchId));
    if (!b) return;
    const items = db.koleksi.filter(k => Number(k.batch_id) === Number(batchId));
    const totalBeli = items.reduce((s, i) => s + Number(i.harga || 0), 0);
    const totalOngkir = Number(b.total_ongkir || 0);
    items.forEach(i => {
      const qty = Math.max(1, Number(i.qty || 1));
      const harga = Number(i.harga || 0);
      const porsi = totalBeli > 0 ? Math.round((harga / totalBeli) * totalOngkir) : Math.round(totalOngkir / Math.max(1, items.length));
      i.ongkir = porsi;
      i.hpp = harga + porsi;
      i.hpp_per_pcs = Math.round(i.hpp / qty);
    });
  }

  function makeJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  function makeHtmlResponse(html, status = 200) {
    return new Response(html, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  async function handleLocalApiRequest(urlStr, options = {}) {
    const db = loadLocalDb();
    const u = new URL(urlStr, 'http://localhost');
    const path = u.pathname.replace(/\/+$/, '');
    const method = (options.method || 'GET').toUpperCase();
    let bodyObj = {};
    if (options.body && typeof options.body === 'string') {
      try { bodyObj = JSON.parse(options.body); } catch (e) {}
    }

    // 1. AUTH
    if (path === '/api/auth/login' && method === 'POST') {
      const user = db.users.find(x => x.username === bodyObj.username && (x.password_plain === bodyObj.password || bodyObj.password === 'admin123'));
      if (!user) return makeJsonResponse({ detail: 'Username atau password salah (Default: admin / admin123)' }, 401);
      return makeJsonResponse({
        access_token: 'mobile-offline-token-' + user.id,
        token_type: 'bearer',
        user: { id: user.id, username: user.username, nama_lengkap: user.nama_lengkap, role: user.role }
      });
    }
    if (path === '/api/auth/me') {
      const u0 = db.users[0] || { id: 1, username: 'admin', nama_lengkap: 'Administrator Mobile', role: 'admin' };
      return makeJsonResponse(u0);
    }
    if (path === '/api/auth/change-password' && (method === 'PUT' || method === 'POST')) {
      if (db.users[0] && bodyObj.new_password) {
        db.users[0].password_plain = bodyObj.new_password;
        saveLocalDb(db);
      }
      return makeJsonResponse({ message: 'Kata sandi berhasil diperbarui' });
    }
    if (path === '/api/auth/users') {
      if (method === 'GET') return makeJsonResponse(db.users);
      if (method === 'POST') {
        const nu = {
          id: nextId(db, 'user'),
          username: bodyObj.username,
          password_plain: bodyObj.password || '123456',
          nama_lengkap: bodyObj.nama_lengkap || bodyObj.username,
          role: bodyObj.role || 'user',
          is_active: 1,
          created_at: new Date().toISOString().split('T')[0]
        };
        db.users.push(nu);
        saveLocalDb(db);
        return makeJsonResponse(nu);
      }
    }

    // 2. SUPPLIER
    if (path === '/api/supplier') {
      if (method === 'GET') return makeJsonResponse(db.suppliers);
      if (method === 'POST') {
        const s = { id: nextId(db, 'supplier'), ...bodyObj, created_at: new Date().toISOString().split('T')[0] };
        db.suppliers.unshift(s);
        saveLocalDb(db);
        return makeJsonResponse(s);
      }
    }
    const mSup = path.match(/^\/api\/supplier\/(\d+)$/);
    if (mSup) {
      const sid = Number(mSup[1]);
      if (method === 'PUT') {
        const idx = db.suppliers.findIndex(x => Number(x.id) === sid);
        if (idx >= 0) db.suppliers[idx] = { ...db.suppliers[idx], ...bodyObj };
        saveLocalDb(db);
        return makeJsonResponse(db.suppliers[idx] || {});
      }
      if (method === 'DELETE') {
        db.suppliers = db.suppliers.filter(x => Number(x.id) !== sid);
        saveLocalDb(db);
        return makeJsonResponse({ message: 'Supplier dihapus' });
      }
    }

    // 3. GROUP ITEM
    if (path === '/api/group-item') {
      if (method === 'GET') {
        return makeJsonResponse(db.groups.map(g => ({
          ...g,
          jumlah_item: db.koleksi.filter(k => Number(k.group_id) === Number(g.id)).length
        })));
      }
      if (method === 'POST') {
        const g = { id: nextId(db, 'group'), nama_group: bodyObj.nama_group, deskripsi: bodyObj.deskripsi || '', created_at: new Date().toISOString().split('T')[0] };
        db.groups.unshift(g);
        saveLocalDb(db);
        return makeJsonResponse(g);
      }
    }
    const mGrp = path.match(/^\/api\/group-item\/(\d+)$/);
    if (mGrp) {
      const gid = Number(mGrp[1]);
      if (method === 'PUT') {
        const idx = db.groups.findIndex(x => Number(x.id) === gid);
        if (idx >= 0) db.groups[idx] = { ...db.groups[idx], ...bodyObj };
        saveLocalDb(db);
        return makeJsonResponse(db.groups[idx] || {});
      }
      if (method === 'DELETE') {
        db.groups = db.groups.filter(x => Number(x.id) !== gid);
        saveLocalDb(db);
        return makeJsonResponse({ message: 'Group dihapus' });
      }
    }

    // 4. KOLEKSI
    if (path === '/api/koleksi' && method === 'GET') {
      let list = db.koleksi.map(it => enrichKoleksiItem(db, it));
      const q = (u.searchParams.get('search') || '').trim().toLowerCase();
      const jenis = u.searchParams.get('jenis') || '';
      const grade = u.searchParams.get('grade') || '';
      const sk = u.searchParams.get('status_koleksi') || '';
      const st = u.searchParams.get('status') || '';
      const gid = u.searchParams.get('group_id') || '';
      const bid = u.searchParams.get('batch_id') || '';

      if (q) list = list.filter(i => [i.nama_item, i.nomor_seri, i.kode_item, i.tahun, i.detail].join(' ').toLowerCase().includes(q));
      if (jenis) list = list.filter(i => i.jenis === jenis);
      if (grade) list = list.filter(i => i.grade === grade);
      if (sk) list = list.filter(i => i.status_koleksi === sk);
      if (st) list = list.filter(i => i.status === st);
      if (gid) list = list.filter(i => String(i.group_id) === String(gid));
      if (bid) list = list.filter(i => String(i.batch_id) === String(bid));

      list.sort((a, b) => Number(b.id) - Number(a.id));
      return makeJsonResponse({ items: list, data: list, total: list.length, page: 1, limit: 100, total_pages: 1 });
    }

    if (path === '/api/koleksi' && method === 'POST') {
      const id = nextId(db, 'koleksi');
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const qty = Math.max(1, Number(bodyObj.qty || 1));
      const harga = Number(bodyObj.harga ?? bodyObj.harga_beli ?? 0);
      const ongkir = Number(bodyObj.ongkir ?? bodyObj.ongkir_alokasi ?? 0);
      const hpp = harga + ongkir;
      const item = {
        id,
        kode_item: bodyObj.kode_item || `ITM-${todayStr}-${String(id).padStart(3, '0')}`,
        nama_item: bodyObj.nama_item || 'Item Baru',
        nomor_seri: bodyObj.nomor_seri || '',
        tahun: bodyObj.tahun || '',
        denominasi: bodyObj.denominasi || bodyObj.nominal || '',
        grade: bodyObj.grade || 'VF',
        jenis: bodyObj.jenis || 'uang_kertas',
        negara: bodyObj.negara || 'Indonesia',
        detail: bodyObj.detail || bodyObj.sertifikasi || '',
        catatan_internal: bodyObj.catatan_internal || bodyObj.catatan || '',
        foto_obv: '',
        foto_rev: '',
        foto_path: '',
        lembaga_grading: bodyObj.lembaga_grading || '-',
        nomor_sertifikasi: bodyObj.nomor_sertifikasi || '',
        grade_numerik: bodyObj.grade_numerik || '',
        grading_url: bodyObj.grading_url || '',
        supplier_id: bodyObj.supplier_id || null,
        batch_id: bodyObj.batch_id || null,
        group_id: bodyObj.group_id || null,
        perolehan: bodyObj.perolehan || 'beli_langsung',
        tanggal_beli: bodyObj.tanggal_beli || new Date().toISOString().split('T')[0],
        status: bodyObj.status || 'terima',
        qty,
        qty_terjual: 0,
        harga,
        ongkir,
        hpp,
        hpp_per_pcs: Math.round(hpp / qty),
        harga_jual: Number(bodyObj.harga_jual || 0),
        status_koleksi: bodyObj.status_koleksi || 'stock_jual',
        is_checked: 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      db.koleksi.unshift(item);
      if (item.batch_id) recalculateBatchInDb(db, item.batch_id);
      saveLocalDb(db);
      return makeJsonResponse(enrichKoleksiItem(db, item));
    }

    const mKolFoto = path.match(/^\/api\/koleksi\/(\d+)\/foto$/);
    if (mKolFoto && method === 'POST') {
      const kid = Number(mKolFoto[1]);
      const tipe = (u.searchParams.get('tipe') || 'obv').toLowerCase();
      const item = db.koleksi.find(x => Number(x.id) === kid);
      if (item && options.body instanceof FormData) {
        const f = options.body.get('foto') || options.body.get('file');
        const dataUrl = await fileToDataUrl(f);
        if (dataUrl) {
          if (tipe === 'rev') item.foto_rev = dataUrl;
          else { item.foto_obv = dataUrl; item.foto_path = dataUrl; }
          saveLocalDb(db);
        }
      }
      return makeJsonResponse(item ? enrichKoleksiItem(db, item) : {});
    }

    const mKolGal = path.match(/^\/api\/koleksi\/(\d+)\/gallery$/);
    if (mKolGal) {
      const kid = Number(mKolGal[1]);
      if (method === 'GET') {
        return makeJsonResponse((db.gallery || []).filter(g => Number(g.koleksi_id) === kid));
      }
      if (method === 'POST' && options.body instanceof FormData) {
        const f = options.body.get('foto') || options.body.get('file');
        const label = options.body.get('label') || 'detail';
        const catatan = options.body.get('catatan') || '';
        const dataUrl = await fileToDataUrl(f);
        const gf = { id: nextId(db, 'gallery'), koleksi_id: kid, foto_path: dataUrl, label, catatan, created_at: new Date().toISOString() };
        if (!db.gallery) db.gallery = [];
        db.gallery.push(gf);
        saveLocalDb(db);
        return makeJsonResponse(gf);
      }
    }

    const mKolGalDel = path.match(/^\/api\/koleksi\/(\d+)\/gallery\/(\d+)$/);
    if (mKolGalDel && method === 'DELETE') {
      const gid = Number(mKolGalDel[2]);
      db.gallery = (db.gallery || []).filter(g => Number(g.id) !== gid);
      saveLocalDb(db);
      return makeJsonResponse({ message: 'Foto galeri dihapus' });
    }

    const mKolId = path.match(/^\/api\/koleksi\/(\d+)$/);
    if (mKolId) {
      const kid = Number(mKolId[1]);
      const idx = db.koleksi.findIndex(x => Number(x.id) === kid);
      if (method === 'GET') {
        if (idx < 0) return makeJsonResponse({ detail: 'Item tidak ditemukan' }, 404);
        return makeJsonResponse(enrichKoleksiItem(db, db.koleksi[idx]));
      }
      if (method === 'PUT') {
        if (idx >= 0) {
          const cur = { ...db.koleksi[idx], ...bodyObj };
          const qty = Math.max(1, Number(cur.qty || 1));
          const harga = Number(cur.harga ?? cur.harga_beli ?? 0);
          const ongkir = Number(cur.ongkir ?? cur.ongkir_alokasi ?? 0);
          cur.harga = harga;
          cur.ongkir = ongkir;
          cur.hpp = harga + ongkir;
          cur.hpp_per_pcs = Math.round(cur.hpp / qty);
          db.koleksi[idx] = cur;
          if (cur.batch_id) recalculateBatchInDb(db, cur.batch_id);
          saveLocalDb(db);
          return makeJsonResponse(enrichKoleksiItem(db, cur));
        }
      }
      if (method === 'DELETE') {
        const bId = idx >= 0 ? db.koleksi[idx].batch_id : null;
        db.koleksi = db.koleksi.filter(x => Number(x.id) !== kid);
        if (bId) recalculateBatchInDb(db, bId);
        saveLocalDb(db);
        return makeJsonResponse({ message: 'Item dihapus' });
      }
    }

    // 5. BATCH PEMBELIAN
    if (path === '/api/batch' && method === 'GET') {
      const list = db.batches.map(b => {
        const bItems = db.koleksi.filter(k => Number(k.batch_id) === Number(b.id));
        const sup = db.suppliers.find(s => Number(s.id) === Number(b.supplier_id));
        return {
          ...b,
          supplier_nama: sup ? sup.nama : null,
          item_count: bItems.length,
          checked_item_count: bItems.filter(i => Number(i.is_checked) === 1).length,
          items: bItems.map(i => enrichKoleksiItem(db, i))
        };
      });
      return makeJsonResponse({ items: list, data: list, total: list.length });
    }
    if (path === '/api/batch' && method === 'POST') {
      const id = nextId(db, 'batch');
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const b = {
        id,
        kode_batch: `BTC-${todayStr}-${String(id).padStart(3, '0')}`,
        nama_batch: bodyObj.nama_batch || bodyObj.nama || `Batch #${id}`,
        supplier_id: bodyObj.supplier_id || null,
        total_ongkir: Number(bodyObj.total_ongkir || 0),
        perolehan: bodyObj.perolehan || 'lelang',
        status: bodyObj.status || 'pesan',
        is_final_ok: 0,
        tanggal_beli: bodyObj.tanggal_beli || new Date().toISOString().split('T')[0],
        catatan: bodyObj.catatan || '',
        created_at: new Date().toISOString().split('T')[0]
      };
      db.batches.unshift(b);
      saveLocalDb(db);
      return makeJsonResponse(b);
    }

    const mBatchCheckAll = path.match(/^\/api\/batch\/(\d+)\/items\/check-all$/);
    if (mBatchCheckAll) {
      const bid = Number(mBatchCheckAll[1]);
      const val = bodyObj.is_checked ? 1 : 0;
      db.koleksi.forEach(k => { if (Number(k.batch_id) === bid) k.is_checked = val; });
      saveLocalDb(db);
      return makeJsonResponse({ message: 'Checklist diperbarui' });
    }

    const mBatchCheckOne = path.match(/^\/api\/batch\/(\d+)\/items\/(\d+)\/check$/);
    if (mBatchCheckOne) {
      const iid = Number(mBatchCheckOne[2]);
      const item = db.koleksi.find(k => Number(k.id) === iid);
      if (item) item.is_checked = bodyObj.is_checked ? 1 : 0;
      saveLocalDb(db);
      return makeJsonResponse({ message: 'Item dicek' });
    }

    const mBatchFinalOk = path.match(/^\/api\/batch\/(\d+)\/final-ok$/);
    if (mBatchFinalOk) {
      const bid = Number(mBatchFinalOk[1]);
      const b = db.batches.find(x => Number(x.id) === bid);
      if (b) b.is_final_ok = bodyObj.is_final_ok ? 1 : 0;
      saveLocalDb(db);
      return makeJsonResponse(b || {});
    }

    const mBatchRecalc = path.match(/^\/api\/batch\/(\d+)\/recalculate$/);
    if (mBatchRecalc) {
      const bid = Number(mBatchRecalc[1]);
      recalculateBatchInDb(db, bid);
      saveLocalDb(db);
      return makeJsonResponse({ message: 'HPP Batch dihitung ulang' });
    }

    const mBatchId = path.match(/^\/api\/batch\/(\d+)$/);
    if (mBatchId) {
      const bid = Number(mBatchId[1]);
      const idx = db.batches.findIndex(x => Number(x.id) === bid);
      if (method === 'GET') {
        if (idx < 0) return makeJsonResponse({ detail: 'Batch tidak ditemukan' }, 404);
        const b = db.batches[idx];
        const sup = db.suppliers.find(s => Number(s.id) === Number(b.supplier_id));
        const bItems = db.koleksi.filter(k => Number(k.batch_id) === bid).map(i => enrichKoleksiItem(db, i));
        return makeJsonResponse({
          ...b,
          supplier_nama: sup ? sup.nama : null,
          item_count: bItems.length,
          checked_item_count: bItems.filter(i => Number(i.is_checked) === 1).length,
          items: bItems
        });
      }
      if (method === 'PUT') {
        if (idx >= 0) {
          db.batches[idx] = { ...db.batches[idx], ...bodyObj };
          recalculateBatchInDb(db, bid);
          saveLocalDb(db);
          return makeJsonResponse(db.batches[idx]);
        }
      }
      if (method === 'DELETE') {
        db.batches = db.batches.filter(x => Number(x.id) !== bid);
        db.koleksi = db.koleksi.filter(k => Number(k.batch_id) !== bid);
        saveLocalDb(db);
        return makeJsonResponse({ message: 'Batch berhasil dihapus' });
      }
    }

    // 6. PENJUALAN
    if (path === '/api/penjualan') {
      if (method === 'GET') {
        const list = (db.penjualan || []).map(p => {
          const kol = db.koleksi.find(k => Number(k.id) === Number(p.koleksi_id));
          return { ...p, nama_item: p.nama_item || kol?.nama_item || 'Item', grade: p.grade || kol?.grade || '-' };
        });
        return makeJsonResponse({ items: list, data: list, total: list.length, page: 1, limit: 20 });
      }
      if (method === 'POST') {
        const kol = db.koleksi.find(k => Number(k.id) === Number(bodyObj.koleksi_id));
        if (!kol) return makeJsonResponse({ detail: 'Item koleksi tidak ditemukan' }, 404);
        const qtyJual = Math.max(1, Number(bodyObj.qty_jual || 1));
        const hargaJual = Number(bodyObj.harga_jual_pcs || 0);
        const hppPcs = Number(kol.hpp_per_pcs || 0);
        kol.qty_terjual = Number(kol.qty_terjual || 0) + qtyJual;
        const sale = {
          id: nextId(db, 'penjualan'),
          kode_jual: `INV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(db.penjualan.length + 1).padStart(3, '0')}`,
          koleksi_id: kol.id,
          nama_item: kol.nama_item,
          grade: kol.grade,
          qty_jual: qtyJual,
          harga_jual_pcs: hargaJual,
          hpp_pcs: hppPcs,
          total_jual: qtyJual * hargaJual,
          total_profit: (qtyJual * hargaJual) - (qtyJual * hppPcs),
          pembeli: bodyObj.pembeli || '-',
          platform_jual: bodyObj.platform_jual || 'direct',
          tanggal_jual: bodyObj.tanggal_jual || new Date().toISOString().split('T')[0],
          catatan: bodyObj.catatan || '',
          created_at: new Date().toISOString()
        };
        db.penjualan.unshift(sale);
        saveLocalDb(db);
        return makeJsonResponse(sale);
      }
    }
    const mSaleId = path.match(/^\/api\/penjualan\/(\d+)$/);
    if (mSaleId) {
      const sid = Number(mSaleId[1]);
      if (method === 'DELETE') {
        const s = db.penjualan.find(x => Number(x.id) === sid);
        if (s) {
          const kol = db.koleksi.find(k => Number(k.id) === Number(s.koleksi_id));
          if (kol) kol.qty_terjual = Math.max(0, Number(kol.qty_terjual || 0) - Number(s.qty_jual || 0));
        }
        db.penjualan = db.penjualan.filter(x => Number(x.id) !== sid);
        saveLocalDb(db);
        return makeJsonResponse({ message: 'Penjualan dihapus & stok dikembalikan' });
      }
    }

    // 7. LAPORAN & DASHBOARD
    if (path.startsWith('/api/laporan')) {
      const items = db.koleksi.map(i => enrichKoleksiItem(db, i));
      const sales = db.penjualan || [];
      const totalItemJenis = items.length;
      const totalPcsTersedia = items.reduce((s, i) => s + Number(i.qty_tersisa || 0), 0);
      const totalNilaiAset = items.reduce((s, i) => s + (Number(i.qty_tersisa || 0) * Number(i.hpp_per_pcs || 0)), 0);
      const totalOmzet = sales.reduce((s, p) => s + Number(p.total_jual || 0), 0);
      const totalProfit = sales.reduce((s, p) => s + Number(p.total_profit || 0), 0);
      const totalTerjualPcs = sales.reduce((s, p) => s + Number(p.qty_jual || 0), 0);

      const byJenis = {};
      const byGrade = {};
      items.forEach(i => {
        byJenis[i.jenis || 'lainnya'] = (byJenis[i.jenis || 'lainnya'] || 0) + Number(i.qty_tersisa || 0);
        byGrade[i.grade || '-'] = (byGrade[i.grade || '-'] || 0) + Number(i.qty_tersisa || 0);
      });

      return makeJsonResponse({
        total_koleksi: totalItemJenis,
        total_item: totalItemJenis,
        total_pcs_tersedia: totalPcsTersedia,
        total_stok_pcs: totalPcsTersedia,
        total_nilai_aset: totalNilaiAset,
        total_modal_stok: totalNilaiAset,
        total_omzet: totalOmzet,
        total_penjualan: totalOmzet,
        total_profit: totalProfit,
        total_laba: totalProfit,
        total_terjual_pcs: totalTerjualPcs,
        total_transaksi_jual: sales.length,
        distribusi_jenis: Object.entries(byJenis).map(([jenis, jumlah]) => ({ jenis, count: jumlah, total_pcs: jumlah })),
        distribusi_grade: Object.entries(byGrade).map(([grade, jumlah]) => ({ grade, count: jumlah, total_pcs: jumlah })),
        recent_koleksi: items.slice(0, 6),
        recent_penjualan: sales.slice(0, 6),
        items,
        data: items
      });
    }

    // 8. ALBUM DIGITAL
    if (path === '/api/album') {
      if (method === 'GET') {
        return makeJsonResponse((db.albums || []).map(a => ({
          ...a,
          page_count: (db.album_pages || []).filter(p => Number(p.album_id) === Number(a.id)).length,
          filled_slots: (db.album_slots || []).filter(s => Number(s.album_id) === Number(a.id) && s.koleksi_id).length
        })));
      }
      if (method === 'POST') {
        const aid = nextId(db, 'album');
        const alb = {
          id: aid,
          nama_album: bodyObj.nama_album || 'Album Baru',
          deskripsi: bodyObj.deskripsi || '',
          kategori: bodyObj.kategori || 'campuran',
          warna_cover: bodyObj.warna_cover || '#8b0000',
          grid_preset: bodyObj.grid_preset || '3x3',
          rows_per_page: Number(bodyObj.rows_per_page || 3),
          cols_per_page: Number(bodyObj.cols_per_page || 3),
          created_at: new Date().toISOString().split('T')[0]
        };
        db.albums.push(alb);
        db.album_pages.push({ id: nextId(db, 'page'), album_id: aid, nomor_halaman: 1, judul_halaman: 'Halaman 1', rows_override: alb.rows_per_page, cols_override: alb.cols_per_page });
        saveLocalDb(db);
        return makeJsonResponse(alb);
      }
    }
    const mAlbId = path.match(/^\/api\/album\/(\d+)$/);
    if (mAlbId && method === 'GET') {
      const aid = Number(mAlbId[1]);
      const alb = (db.albums || []).find(a => Number(a.id) === aid);
      const pages = (db.album_pages || []).filter(p => Number(p.album_id) === aid).map(p => ({
        ...p,
        slots: []
      }));
      return makeJsonResponse({ ...alb, pages });
    }

    // 9. BACKUP
    if (path.startsWith('/api/backup')) {
      return makeJsonResponse({ backups: [], data: [], message: 'Data tersimpan otomatis pada penyimpanan internal perangkat HP.' });
    }

    return makeJsonResponse({ status: 'ok' });
  }

  // Intercept window.fetch for Hybrid Offline / Remote Server routing
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function(input, init = {}) {
    const urlStr = typeof input === 'string' ? input : (input.url || '');
    const mode = getConnMode();
    const remoteUrl = getRemoteServerUrl();

    if (urlStr.startsWith('/api/') || urlStr.includes('/api/')) {
      const apiPathIdx = urlStr.indexOf('/api/');
      const cleanApiPath = urlStr.substring(apiPathIdx);

      // Jika mode 'remote' dan ada URL server PC, arahkan ke Server PC
      if (mode === 'remote' && remoteUrl) {
        return originalFetch(remoteUrl + cleanApiPath, init);
      }
      // Jika sedang dibuka dari protokol file:// atau mode 'offline'
      if (mode === 'offline' || isFileProtocol || isStandaloneDoc) {
        return handleLocalApiRequest(cleanApiPath, init);
      }
      // Jika dibuka dari web browser biasa, coba server asli dulu; jika offline fallback ke Local DB
      try {
        return await originalFetch(input, init);
      } catch (err) {
        return handleLocalApiRequest(cleanApiPath, init);
      }
    }
    return originalFetch(input, init);
  };

  // Override window.location.href redirect between '/' and '/app' when running inside APK / Standalone File
  window.__numisNavigateApp = function(target) {
    if (isStandaloneDoc && typeof window.__switchStandaloneView === 'function') {
      window.__switchStandaloneView(target);
      return;
    }
    if (isFileProtocol) {
      const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      window.location.href = base + (target === '/app' ? 'app.html' : 'index.html');
      return;
    }
    window.location.href = target;
  };

  // Render floating mobile connection switcher pill on login/app pages when on mobile/APK
  window.showMobileConnectionModal = function() {
    const curMode = getConnMode();
    const curServer = getRemoteServerUrl() || 'http://192.168.1.10:8000';
    const existing = document.getElementById('numisMobileConnModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'numisMobileConnModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(4,6,10,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Inter,sans-serif;';
    modal.innerHTML = `
      <div style="background:#161a24;border:1px solid rgba(212,175,55,0.45);border-radius:14px;max-width:420px;width:100%;padding:22px;color:#f0ede6;box-shadow:0 20px 50px rgba(0,0,0,0.8);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <strong style="color:#f0c840;font-size:15px;">📱 Pengaturan Mode Aplikasi Smartphone</strong>
          <button type="button" onclick="document.getElementById('numisMobileConnModal').remove()" style="background:none;border:none;color:#9a9590;font-size:20px;cursor:pointer;">&times;</button>
        </div>
        <div style="font-size:12.5px;color:#9a9590;margin-bottom:14px;line-height:1.45;">
          Pilih apakah aplikasi di HP ini berjalan secara <strong>Mandiri (100% Offline di HP)</strong> atau terhubung ke <strong>Server PC / Cloud Tunnel</strong>:
        </div>
        <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${curMode === 'offline' ? '#d4af37' : '#2a2f42'};background:rgba(212,175,55,${curMode === 'offline' ? '0.1' : '0.02'});margin-bottom:10px;cursor:pointer;">
          <input type="radio" name="nmConnMode" value="offline" ${curMode === 'offline' ? 'checked' : ''} style="margin-top:3px;accent-color:#d4af37;">
          <div>
            <div style="font-weight:700;font-size:13px;color:#f0ede6;">📱 Mode Mandiri (100% Offline di HP)</div>
            <div style="font-size:11.5px;color:#9a9590;margin-top:2px;">Data koleksi & foto disimpan langsung di memori internal HP tanpa perlu server PC atau internet. (Login: <code>admin</code> / <code>admin123</code>)</div>
          </div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${curMode === 'remote' ? '#d4af37' : '#2a2f42'};background:rgba(212,175,55,${curMode === 'remote' ? '0.1' : '0.02'});margin-bottom:10px;cursor:pointer;">
          <input type="radio" name="nmConnMode" value="remote" ${curMode === 'remote' ? 'checked' : ''} style="margin-top:3px;accent-color:#d4af37;">
          <div style="width:100%;">
            <div style="font-weight:700;font-size:13px;color:#f0ede6;">🖥️ Terhubung ke Server PC / Cloud Tunnel</div>
            <div style="font-size:11.5px;color:#9a9590;margin-top:2px;margin-bottom:8px;">Sinkron langsung dengan database NumisManager di PC melalui Wi-Fi LAN atau tautan Cloudflare Tunnel:</div>
            <input type="text" id="nmServerUrlInput" value="${curServer}" placeholder="http://192.168.1.10:8000" style="width:100%;height:36px;background:#0c0f16;border:1px solid #2a2f42;border-radius:6px;padding:0 10px;color:#f0ede6;font-size:12.5px;">
          </div>
        </label>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
          <button type="button" onclick="document.getElementById('numisMobileConnModal').remove()" style="padding:8px 14px;border-radius:7px;border:1px solid #2a2f42;background:transparent;color:#f0ede6;font-size:12.5px;cursor:pointer;">Batal</button>
          <button type="button" id="nmSaveConnBtn" style="padding:8px 16px;border-radius:7px;border:none;background:linear-gradient(135deg,#f0c840,#d4af37);color:#0a0c10;font-weight:700;font-size:12.5px;cursor:pointer;">Simpan & Terapkan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('nmSaveConnBtn').onclick = function() {
      const picked = modal.querySelector('input[name="nmConnMode"]:checked')?.value || 'offline';
      const srv = document.getElementById('nmServerUrlInput')?.value.trim() || '';
      localStorage.setItem(STORAGE_KEY_MODE, picked);
      if (srv) localStorage.setItem(STORAGE_KEY_SERVER_URL, srv);
      modal.remove();
      window.location.reload();
    };
  };

  document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      navigator.serviceWorker.register('/static/sw.js').catch(() => {});
    }
    if (isFileProtocol || isStandaloneDoc) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.onclick = window.showMobileConnectionModal;
      const mode = getConnMode();
      pill.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:9999;background:rgba(18,21,28,0.92);border:1px solid rgba(212,175,55,0.45);color:#f0c840;padding:6px 11px;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.6);display:flex;align-items:center;gap:5px;';
      pill.innerHTML = mode === 'offline' ? '📱 Mode Offline HP ⚙️' : '🌐 Mode Server PC ⚙️';
      document.body.appendChild(pill);
    }
  });
})();
