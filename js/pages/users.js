/**
 * MediCore HMS - Users & Staff Page (Admin only)
 */

const UsersPage = (() => {
  let allUsers = [];
  let currentPage = 1;
  let searchQuery = '';
  let filterRole = '';

  async function render(params) {
    const content = document.getElementById('page-content');
    if (Auth.getRole() !== 'admin') {
      content.innerHTML = `<div class="empty-state" style="margin-top:80px"><h3>Access Denied</h3><p>Only administrators can manage users.</p></div>`;
      return;
    }
    content.innerHTML = `<div style="padding:32px;text-align:center">Loading users...</div>`;
    try {
      allUsers = await DB.getAll('users');
      renderList();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
  }

  function renderList() {
    const content = document.getElementById('page-content');
    let filtered = [...allUsers];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (filterRole) filtered = filtered.filter(u => u.role === filterRole);
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const paged = UI.paginate(filtered, currentPage, 10);
    const roleCounts = { admin: 0, doctor: 0, receptionist: 0, patient: 0 };
    allUsers.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h1>Users & Staff</h1><p>${allUsers.length} total users</p></div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="UsersPage.openAddModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add User
          </button>
        </div>
      </div>
      <div class="stats-grid" style="margin-bottom:var(--space-lg)">
        <div class="stat-card stat-purple"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="stat-card-value">${roleCounts.admin}</div><div class="stat-card-label">Admins</div></div>
        <div class="stat-card stat-blue"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg></div><div class="stat-card-value">${roleCounts.doctor}</div><div class="stat-card-label">Doctors</div></div>
        <div class="stat-card stat-teal"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="stat-card-value">${roleCounts.receptionist}</div><div class="stat-card-label">Receptionists</div></div>
        <div class="stat-card stat-green"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div class="stat-card-value">${roleCounts.patient}</div><div class="stat-card-label">Patients</div></div>
      </div>
      <div class="card">
        <div class="toolbar">
          <div class="toolbar-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Search name, username, email..." value="${searchQuery}" oninput="UsersPage.handleSearch(this.value)" />
          </div>
          <div class="toolbar-filters">
            <select onchange="UsersPage.handleRoleFilter(this.value)">
              <option value="">All Roles</option>
              ${['admin', 'doctor', 'receptionist', 'patient'].map(r => `<option value="${r}" ${filterRole === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
            </select>
          </div>
          <span style="color:var(--text-muted);font-size:0.8125rem;margin-left:auto">${filtered.length} results</span>
        </div>
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead><tr><th>User</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              ${paged.items.length === 0 ? `<tr><td colspan="7">${UI.emptyState('No users found')}</td></tr>` :
              paged.items.map(u => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.8125rem;flex-shrink:0">${UI.getInitials(u.name)}</div>
                      <span style="font-weight:600">${u.name || '—'}</span>
                    </div>
                  </td>
                  <td><code style="font-size:0.8125rem;background:var(--gray-100);padding:2px 6px;border-radius:3px">${u.username}</code></td>
                  <td style="font-size:0.8125rem">${u.email || '—'}</td>
                  <td>${UI.roleBadge(u.role)}</td>
                  <td>${UI.statusBadge(u.status || 'active')}</td>
                  <td style="font-size:0.8125rem">${UI.formatDate(u.created_at)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-icon-sm btn-ghost" title="Edit" onclick="UsersPage.openEditModal(${u.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      ${u.id !== Auth.getUserId() ? `<button class="btn btn-icon-sm btn-ghost" title="${u.status === 'active' ? 'Deactivate' : 'Activate'}" style="color:${u.status === 'active' ? 'var(--danger)' : 'var(--success)'}" onclick="UsersPage.toggleStatus(${u.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${u.status === 'active' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : '<polyline points="20 6 9 17 4 12"/>'}</svg>
                      </button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${UI.renderPagination(paged, 'function(p){UsersPage.goPage(p)}')}
      </div>`;
  }

  function userForm(user = null) {
    return `
      <form id="user-form" novalidate>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="uf-name">Full Name *</label>
            <input type="text" id="uf-name" name="name" value="${user?.name || ''}" placeholder="Full name" />
            <span class="field-error" id="uf-name-error"></span>
          </div>
          <div class="form-group">
            <label for="uf-username">Username *</label>
            <input type="text" id="uf-username" name="username" value="${user?.username || ''}" placeholder="username" ${user ? 'disabled' : ''} />
            <span class="field-error" id="uf-username-error"></span>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="uf-email">Email *</label>
            <input type="email" id="uf-email" name="email" value="${user?.email || ''}" placeholder="user@example.com" />
            <span class="field-error" id="uf-email-error"></span>
          </div>
          <div class="form-group">
            <label for="uf-phone">Phone</label>
            <input type="tel" id="uf-phone" name="phone" value="${user?.phone || ''}" placeholder="+1-555-0100" />
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="uf-role">Role *</label>
            <select id="uf-role" name="role">
              ${['admin', 'doctor', 'receptionist', 'patient'].map(r => `<option value="${r}" ${user?.role === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="uf-status">Status</label>
            <select id="uf-status" name="status">
              <option value="active" ${(!user || user?.status === 'active') ? 'selected' : ''}>Active</option>
              <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
        ${!user ? `
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="uf-password">Password *</label>
            <input type="password" id="uf-password" name="password" placeholder="Min 6 characters" />
            <span class="field-error" id="uf-password-error"></span>
          </div>
          <div class="form-group">
            <label for="uf-confirm_password">Confirm Password *</label>
            <input type="password" id="uf-confirm_password" name="confirm_password" placeholder="Repeat password" />
            <span class="field-error" id="uf-confirm_password-error"></span>
          </div>
        </div>` : `
        <div class="form-group">
          <label for="uf-new_password">New Password <span style="font-weight:400;color:var(--text-muted)">(leave blank to keep current)</span></label>
          <input type="password" id="uf-new_password" name="new_password" placeholder="Min 6 characters" />
        </div>`}
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary"><span class="btn-text">${user ? 'Update User' : 'Create User'}</span><span class="btn-spinner hidden"></span></button>
        </div>
      </form>`;
  }

  async function openAddModal() {
    await UI.openModal('Create New User', userForm());
    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const errors = UI.validateForm(fd, {
        name: { required: true, label: 'Name' },
        username: { required: true, label: 'Username', minLength: 3 },
        email: { required: true, email: true },
        password: { required: true, label: 'Password', minLength: 6 },
      });
      if (fd.password !== fd.confirm_password) errors.confirm_password = 'Passwords do not match.';
      if (Object.keys(errors).length) { UI.showFieldErrors(errors, 'uf-'); return; }
      // Check for duplicate username
      const existing = allUsers.find(u => u.username === fd.username);
      if (existing) { UI.showFieldErrors({ username: 'Username already taken.' }, 'uf-'); return; }
      const btn = e.target.querySelector('[type=submit]');
      UI.setLoading(btn, true);
      try {
        await DB.add('users', {
          name: fd.name, username: fd.username, email: fd.email,
          phone: fd.phone, role: fd.role, status: fd.status,
          password: Auth.hashPassword(fd.password)
        });
        allUsers = await DB.getAll('users');
        UI.closeModal(); renderList();
        UI.toast('User created!', 'success');
      } catch (err) { UI.toast(err.message, 'danger'); UI.setLoading(btn, false); }
    });
  }

  async function openEditModal(id) {
    const user = await DB.getById('users', id);
    if (!user) return;
    await UI.openModal('Edit User', userForm(user));
    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const errors = UI.validateForm(fd, {
        name: { required: true, label: 'Name' },
        email: { required: true, email: true },
      });
      if (Object.keys(errors).length) { UI.showFieldErrors(errors, 'uf-'); return; }
      const btn = e.target.querySelector('[type=submit]');
      UI.setLoading(btn, true);
      try {
        const updated = { ...user, name: fd.name, email: fd.email, phone: fd.phone, role: fd.role, status: fd.status };
        if (fd.new_password && fd.new_password.length >= 6) {
          updated.password = Auth.hashPassword(fd.new_password);
        }
        await DB.update('users', updated);
        allUsers = await DB.getAll('users');
        UI.closeModal(); renderList();
        UI.toast('User updated!', 'success');
      } catch (err) { UI.toast(err.message, 'danger'); UI.setLoading(btn, false); }
    });
  }

  async function toggleStatus(id) {
    const user = await DB.getById('users', id);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const ok = await UI.confirm(
      `${newStatus === 'inactive' ? 'Deactivate' : 'Activate'} user "${user.name}"?`,
      'Confirm',
      newStatus === 'inactive' ? 'Deactivate' : 'Activate',
      newStatus === 'inactive' ? 'btn-danger' : 'btn-success'
    );
    if (!ok) return;
    await DB.update('users', { ...user, status: newStatus });
    allUsers = await DB.getAll('users');
    renderList();
    UI.toast(`User ${newStatus === 'inactive' ? 'deactivated' : 'activated'}.`, 'success');
  }

  function handleSearch(val) { searchQuery = val; currentPage = 1; renderList(); }
  function handleRoleFilter(val) { filterRole = val; currentPage = 1; renderList(); }
  function goPage(p) { currentPage = p; renderList(); }

  return { render, openAddModal, openEditModal, toggleStatus, handleSearch, handleRoleFilter, goPage };
})();
