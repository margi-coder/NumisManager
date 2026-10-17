/**
 * NumisManager - Authentication, User Profile & User Management
 */

const Auth = {
  currentUser: null,
  clockInterval: null,

  async init() {
    this.currentUser = API.getUser();

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
          API.logout();
        }
      });
    }

    // Start live clock
    this.startClock();

    // Fetch latest user profile from server
    await this.fetchMe();

    // Render user profile to sidebar
    this.renderUserProfile();
  },

  async fetchMe() {
    try {
      const user = await API.get('/auth/me');
      if (user) {
        this.currentUser = user;
        API.setUser(user);
      }
    } catch (err) {
      console.warn('Gagal memperbarui profil pengguna dari server:', err.message);
      // Fallback to local stored user
      this.currentUser = API.getUser();
    }
  },

  renderUserProfile() {
    const user = this.currentUser || { username: 'Pengguna', role: 'staff' };
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userFullName');
    const roleEl = document.getElementById('userRole');

    const displayName = user.full_name || user.username || 'Pengguna';
    const firstLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

    if (avatarEl) avatarEl.textContent = firstLetter;
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = user.role ? user.role.toUpperCase() : 'USER';

    // Show or hide admin links
    const isAdmin = (user.role || '').toLowerCase() === 'admin';
    document.querySelectorAll('.nav-admin-only').forEach(el => {
      el.style.display = isAdmin ? 'flex' : 'none';
    });
  },

  startClock() {
    const clockEl = document.getElementById('currentDateTime');
    if (!clockEl) return;

    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      
      const dayName = days[now.getDay()];
      const day = String(now.getDate()).padStart(2, '0');
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');

      clockEl.textContent = `${dayName}, ${day} ${month} ${year} ${hours}:${mins}:${secs}`;
    };

    updateTime();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(updateTime, 1000);
  },

  /**
   * Admin: User Management Page
   */
  async loadUsers() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
      <div class="users-page">
        <div class="section-header">
          <div>
            <h3>Daftar Pengguna Sistem</h3>
            <p class="input-hint">Kelola akun staf dan hak akses administrator</p>
          </div>
          <button class="btn btn-primary" onclick="Auth.showAddUserModal()">
            <span>+ Tambah Pengguna</span>
          </button>
        </div>

        <div class="card">
          <div id="usersTableContainer"></div>
        </div>
      </div>
    `;

    renderLoading('usersTableContainer', 'Mengambil data pengguna...');

    try {
      const users = await API.get('/auth/users');
      this.renderUsersTable(Array.isArray(users) ? users : (users.data || []));
    } catch (err) {
      document.getElementById('usersTableContainer').innerHTML = `
        <div class="alert alert-danger" style="display:flex;">
          <span>Gagal memuat pengguna: ${escapeHtml(err.message)}</span>
        </div>
      `;
    }
  },

  renderUsersTable(users) {
    const container = document.getElementById('usersTableContainer');
    if (!users || users.length === 0) {
      renderEmpty('usersTableContainer', 'Belum Ada Pengguna', 'Tambahkan pengguna baru untuk memberikan akses.', `
        <button class="btn btn-primary btn-sm" onclick="Auth.showAddUserModal()">+ Tambah Pengguna</button>
      `);
      return;
    }

    let html = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Nama Lengkap</th>
              <th>Email</th>
              <th>Role</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
    `;

    users.forEach(u => {
      const roleBadge = u.role === 'admin'
        ? `<span class="badge" style="background:rgba(212,175,55,0.2);color:var(--gold-light);border:1px solid var(--border-gold);">ADMIN</span>`
        : `<span class="badge" style="background:rgba(255,255,255,0.06);color:var(--text-secondary);border:1px solid var(--border);">USER</span>`;

      html += `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${escapeHtml(u.username)}</strong></td>
          <td>${escapeHtml(u.full_name || '-')}</td>
          <td>${escapeHtml(u.email || '-')}</td>
          <td>${roleBadge}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-secondary btn-sm" onclick="Auth.showEditUserModal(${u.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="Auth.deleteUser(${u.id}, '${escapeHtml(u.username)}')">Hapus</button>
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
  },

  showAddUserModal() {
    const body = `
      <form id="addUserForm" onsubmit="event.preventDefault(); Auth.saveNewUser();">
        <div class="form-group">
          <label class="form-label">Username <span class="required">*</span></label>
          <input type="text" id="addUsername" class="form-control" placeholder="cth: staf_numis" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nama Lengkap</label>
          <input type="text" id="addFullName" class="form-control" placeholder="Nama lengkap petugas">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="addEmail" class="form-control" placeholder="email@contoh.com">
        </div>
        <div class="data-grid-2">
          <div class="form-group">
            <label class="form-label">Password <span class="required">*</span></label>
            <input type="password" id="addPassword" class="form-control" placeholder="Minimal 6 karakter" required>
          </div>
          <div class="form-group">
            <label class="form-label">Role Akses</label>
            <select id="addRole" class="form-select">
              <option value="user">User / Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="Auth.saveNewUser()">Simpan Pengguna</button>
    `;

    openModal({
      title: '👤 Tambah Pengguna Baru',
      body,
      footer,
      size: 'md'
    });
  },

  async saveNewUser() {
    const username = document.getElementById('addUsername')?.value.trim();
    const password = document.getElementById('addPassword')?.value;
    const full_name = document.getElementById('addFullName')?.value.trim();
    const email = document.getElementById('addEmail')?.value.trim();
    const role = document.getElementById('addRole')?.value || 'user';

    if (!username || !password) {
      showToast('Username dan kata sandi wajib diisi.', 'warning');
      return;
    }

    try {
      await API.post('/auth/register', {
        username,
        password,
        full_name,
        email,
        role
      });
      showToast('Pengguna berhasil ditambahkan!', 'success');
      closeModal();
      this.loadUsers();
    } catch (err) {
      showToast('Gagal menambah pengguna: ' + err.message, 'error');
    }
  },

  async showEditUserModal(id) {
    try {
      const users = await API.get('/auth/users');
      const list = Array.isArray(users) ? users : (users.data || []);
      const user = list.find(u => u.id === id);

      if (!user) {
        showToast('Data pengguna tidak ditemukan.', 'error');
        return;
      }

      const body = `
        <form id="editUserForm" onsubmit="event.preventDefault(); Auth.updateUser(${id});">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="editUsername" class="form-control" value="${escapeHtml(user.username)}" disabled>
            <span class="input-hint">Username tidak dapat diubah</span>
          </div>
          <div class="form-group">
            <label class="form-label">Nama Lengkap</label>
            <input type="text" id="editFullName" class="form-control" value="${escapeHtml(user.full_name || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="editEmail" class="form-control" value="${escapeHtml(user.email || '')}">
          </div>
          <div class="data-grid-2">
            <div class="form-group">
              <label class="form-label">Password Baru (Opsional)</label>
              <input type="password" id="editPassword" class="form-control" placeholder="Kosongkan jika tidak diubah">
            </div>
            <div class="form-group">
              <label class="form-label">Role Akses</label>
              <select id="editRole" class="form-select">
                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User / Staff</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
              </select>
            </div>
          </div>
        </form>
      `;

      const footer = `
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="button" class="btn btn-primary" onclick="Auth.updateUser(${id})">Simpan Perubahan</button>
      `;

      openModal({
        title: `✏️ Edit Pengguna: ${escapeHtml(user.username)}`,
        body,
        footer,
        size: 'md'
      });
    } catch (err) {
      showToast('Gagal memuat detail pengguna: ' + err.message, 'error');
    }
  },

  async updateUser(id) {
    const full_name = document.getElementById('editFullName')?.value.trim();
    const email = document.getElementById('editEmail')?.value.trim();
    const password = document.getElementById('editPassword')?.value;
    const role = document.getElementById('editRole')?.value;

    const payload = {
      full_name,
      email,
      role
    };

    if (password && password.trim().length > 0) {
      payload.password = password;
    }

    try {
      await API.put(`/auth/users/${id}`, payload);
      showToast('Data pengguna berhasil diperbarui!', 'success');
      closeModal();
      this.loadUsers();
    } catch (err) {
      showToast('Gagal memperbarui pengguna: ' + err.message, 'error');
    }
  },

  async deleteUser(id, username) {
    if (this.currentUser && this.currentUser.id === id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri saat sedang masuk.', 'warning');
      return;
    }

    if (!confirm(`Hapus akun pengguna "${username}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await API.delete(`/auth/users/${id}`);
      showToast(`Pengguna ${username} telah dihapus.`, 'success');
      this.loadUsers();
    } catch (err) {
      showToast('Gagal menghapus pengguna: ' + err.message, 'error');
    }
  },

  showChangePasswordModal() {
    const user = this.currentUser || { username: 'Pengguna' };
    const body = `
      <form id="changePasswordForm" onsubmit="event.preventDefault(); Auth.submitChangePassword();">
        <div style="margin-bottom:14px; background:rgba(212,175,55,0.08); border:1px solid var(--border-gold); padding:12px; border-radius:var(--radius-md);">
          <div style="font-size:12px; color:var(--text-muted);">Akun Aktif:</div>
          <div style="font-weight:700; color:var(--gold-light); font-size:14px;">${escapeHtml(user.username)} (${escapeHtml(user.full_name || user.role || 'User')})</div>
          <div style="font-size:11px; color:var(--text-secondary); margin-top:3px;">
            Disarankan mengganti kata sandi bawaan demi keamanan database koleksi Anda.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Kata Sandi Saat Ini <span class="required">*</span></label>
          <input type="password" id="cpOldPassword" class="form-control" placeholder="Masukkan kata sandi lama Anda" required autocomplete="current-password">
        </div>

        <div class="form-group">
          <label class="form-label">Kata Sandi Baru <span class="required">*</span></label>
          <input type="password" id="cpNewPassword" class="form-control" placeholder="Minimal 6 karakter" required minlength="6" autocomplete="new-password">
        </div>

        <div class="form-group">
          <label class="form-label">Ulangi Kata Sandi Baru <span class="required">*</span></label>
          <input type="password" id="cpConfirmPassword" class="form-control" placeholder="Ketik ulang kata sandi baru" required minlength="6" autocomplete="new-password">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="Auth.submitChangePassword()">Simpan Kata Sandi</button>
    `;

    openModal({
      title: '🔐 Ubah Kata Sandi Akun',
      body,
      footer,
      size: 'sm'
    });
  },

  async submitChangePassword() {
    const oldPassword = document.getElementById('cpOldPassword')?.value;
    const newPassword = document.getElementById('cpNewPassword')?.value;
    const confirmPassword = document.getElementById('cpConfirmPassword')?.value;

    if (!oldPassword || !newPassword) {
      showToast('Kata sandi lama dan baru wajib diisi.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
      return;
    }

    try {
      await API.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      showToast('Kata sandi berhasil diubah! Silakan gunakan kata sandi baru pada login berikutnya.', 'success', 4000);
      closeModal();
    } catch (err) {
      showToast('Gagal mengubah kata sandi: ' + err.message, 'error');
    }
  }
};
