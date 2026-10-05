/**
 * MediCore HMS - App Bootstrap
 * Initializes the database, seeds data, sets up auth, routing, and event handlers
 */

const App = (() => {
  async function init() {
    try {
      // Initialize DB
      await DB.open();
      // Seed data if first run
      await Seeder.seed();
      // Load prescription item counts
      const allRx = await DB.getAll('prescriptions');
      for (const rx of allRx) {
        const items = await DB.getByIndex('prescription_items', 'prescription_id', rx.id);
        rx._itemCount = items.length;
      }

      // Register routes
      Router.register('dashboard', DashboardPage.render);
      Router.register('patients', PatientsPage.render);
      Router.register('doctors', DoctorsPage.render);
      Router.register('departments', DepartmentsPage.render);
      Router.register('appointments', AppointmentsPage.render);
      Router.register('medical_records', MedicalRecordsPage.render);
      Router.register('prescriptions', PrescriptionsPage.render);
      Router.register('billing', BillingPage.render);
      Router.register('users', UsersPage.render);

      // Setup event listeners
      setupAuth();
      setupSidebar();
      setupModals();
      setupGlobalSearch();

      // Fade out loading screen
      const loadingScreen = document.getElementById('loading-screen');
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          // Check if user is logged in
          if (Auth.isLoggedIn()) {
            showApp();
            Router.init();
          } else {
            showAuth();
          }
        }, 500);
      }, 1200);
    } catch (err) {
      console.error('App init error:', err);
      document.getElementById('loading-screen').innerHTML = `
        <div class="loading-content">
          <h1 style="color:var(--danger)">Initialization Error</h1>
          <p style="color:white">${err.message}</p>
          <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;border-radius:8px;background:var(--primary);color:white;border:none;cursor:pointer;font-size:0.875rem">Retry</button>
        </div>`;
    }
  }

  function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  }

  function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    // Update sidebar
    const session = Auth.getSession();
    if (session) {
      UI.buildNav(session.role);
      document.getElementById('sidebar-user-name').textContent = session.name;
      document.getElementById('sidebar-user-role').textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);
      document.getElementById('sidebar-avatar').textContent = UI.getInitials(session.name);
      document.getElementById('topnav-avatar').textContent = UI.getInitials(session.name);
    }
  }

  function setupAuth() {
    // Login form
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');
      const submitBtn = document.getElementById('login-submit-btn');

      // Validation
      let valid = true;
      document.getElementById('login-username-error').textContent = '';
      document.getElementById('login-password-error').textContent = '';
      if (!username) { document.getElementById('login-username-error').textContent = 'Username is required.'; valid = false; }
      if (!password) { document.getElementById('login-password-error').textContent = 'Password is required.'; valid = false; }
      if (!valid) return;

      UI.setLoading(submitBtn, true);
      errorDiv.classList.add('hidden');
      try {
        await Auth.login(username, password);
        showApp();
        Router.init();
        UI.toast(`Welcome back, ${Auth.getSession().name}!`, 'success', 'Signed In');
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
      } finally {
        UI.setLoading(submitBtn, false);
      }
    });

    // Demo account buttons
    document.querySelectorAll('.demo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('login-username').value = btn.dataset.username;
        document.getElementById('login-password').value = btn.dataset.password;
      });
    });

    // Password toggle
    document.getElementById('toggle-password').addEventListener('click', () => {
      const input = document.getElementById('login-password');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', async () => {
      const ok = await UI.confirm('Are you sure you want to sign out?', 'Sign Out', 'Sign Out', 'btn-primary');
      if (!ok) return;
      Auth.logout();
      showAuth();
      // Clear form
      document.getElementById('login-form').reset();
      document.getElementById('login-error').classList.add('hidden');
      UI.toast('You have been signed out.', 'info', 'Signed Out');
    });
  }

  function setupSidebar() {
    // Collapse toggle
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
    // Restore collapsed state
    if (localStorage.getItem('sidebar_collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileOverlay = document.getElementById('mobile-overlay');
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      mobileOverlay.classList.remove('hidden');
      mobileOverlay.classList.add('show');
    });
    const closeMobile = () => {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.add('hidden');
      mobileOverlay.classList.remove('show');
    };
    mobileOverlay.addEventListener('click', closeMobile);
    // Close mobile menu on nav click
    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      if (e.target.closest('.nav-item')) closeMobile();
    });
  }

  function setupModals() {
    // Modal close button
    document.getElementById('modal-close-btn').addEventListener('click', () => UI.closeModal());
    // Click outside modal to close
    document.getElementById('modal-container').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-container')) UI.closeModal();
    });
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('modal-container');
        if (!modal.classList.contains('hidden')) UI.closeModal();
        const confirm = document.getElementById('confirm-dialog');
        if (!confirm.classList.contains('hidden')) {
          confirm.classList.add('hidden');
          document.body.style.overflow = '';
        }
      }
    });
  }

  function setupGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    let debounce = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim();
        if (!q) return;
        // Navigate to the current page's search if on a searchable page
        const page = Router.getCurrentPage();
        if (page === 'patients') { PatientsPage.handleSearch(q); }
        else if (page === 'doctors') { DoctorsPage.handleSearch(q); }
        else if (page === 'appointments') { AppointmentsPage.handleSearch(q); }
        else if (page === 'billing') { BillingPage.handleSearch(q); }
        else if (page === 'prescriptions') { PrescriptionsPage.handleSearch(q); }
        else {
          // Default: search patients
          Router.navigate('patients');
          setTimeout(() => PatientsPage.handleSearch(q), 100);
        }
      }, 300);
    });
  }

  return { init, showAuth, showApp };
})();

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
