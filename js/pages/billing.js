/**
 * MediCore HMS - Billing Page
 */

const BillingPage = (() => {
  let allBills = [];
  let allPatients = [];
  let allDoctors = [];
  let currentPage = 1;
  let searchQuery = '';
  let filterStatus = '';

  async function render(params) {
    const content = document.getElementById('page-content');
    content.innerHTML = `<div style="padding:32px;text-align:center">Loading billing...</div>`;
    try {
      [allBills, allPatients, allDoctors] = await Promise.all([
        DB.getAll('bills'), DB.getAll('patients'), DB.getAll('doctors')
      ]);
      const role = Auth.getRole();
      const userId = Auth.getUserId();
      if (role === 'patient') {
        const myPat = allPatients.find(p => p.user_id === userId);
        allBills = myPat ? allBills.filter(b => b.patient_id === myPat.id) : [];
      }
      // Compute totals
      for (const bill of allBills) {
        const items = await DB.getByIndex('bill_items', 'bill_id', bill.id);
        bill._items = items;
        bill._subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
        bill._discount = bill.discount || 0;
        bill._tax = ((bill._subtotal - bill._discount) * (bill.tax_rate || 0)) / 100;
        bill._total = bill._subtotal - bill._discount + bill._tax;
      }
      renderList();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
  }

  function patientName(id) { return allPatients.find(p => p.id === id)?.name || '—'; }
  function doctorName(id) { return allDoctors.find(d => d.id === id)?.name || '—'; }

  function renderList() {
    const content = document.getElementById('page-content');
    const role = Auth.getRole();
    let filtered = [...allBills];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        patientName(b.patient_id).toLowerCase().includes(q) ||
        (b.bill_number || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus) filtered = filtered.filter(b => b.status === filterStatus);
    filtered.sort((a, b) => (b.bill_date || '').localeCompare(a.bill_date || ''));
    const paged = UI.paginate(filtered, currentPage, 10);
    const canCreate = Auth.can('create', 'billing');

    const totalRevenue = allBills.filter(b => b.status === 'paid').reduce((s, b) => s + (b._total || 0), 0);
    const totalPending = allBills.filter(b => b.status === 'unpaid').reduce((s, b) => s + (b._total || 0), 0);

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h1>${role === 'patient' ? 'My Bills' : 'Billing'}</h1><p>${allBills.length} total bills</p></div>
        <div class="page-header-actions">
          ${canCreate ? `<button class="btn btn-primary" onclick="BillingPage.openAddModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Generate Bill
          </button>` : ''}
        </div>
      </div>
      ${role !== 'patient' ? `
      <div class="stats-grid" style="margin-bottom:var(--space-lg)">
        <div class="stat-card stat-green"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-card-value">${UI.formatCurrency(totalRevenue)}</div><div class="stat-card-label">Total Revenue (Paid)</div></div>
        <div class="stat-card stat-red"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-card-value">${UI.formatCurrency(totalPending)}</div><div class="stat-card-label">Pending Payments</div></div>
        <div class="stat-card stat-blue"><div class="stat-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="stat-card-value">${allBills.length}</div><div class="stat-card-label">Total Bills</div></div>
      </div>` : ''}
      <div class="card">
        <div class="toolbar">
          <div class="toolbar-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Search bill number, patient..." value="${searchQuery}" oninput="BillingPage.handleSearch(this.value)" />
          </div>
          <div class="toolbar-filters">
            <select onchange="BillingPage.handleStatusFilter(this.value)">
              <option value="">All Status</option>
              <option value="paid" ${filterStatus === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="unpaid" ${filterStatus === 'unpaid' ? 'selected' : ''}>Unpaid</option>
              <option value="partial" ${filterStatus === 'partial' ? 'selected' : ''}>Partial</option>
            </select>
          </div>
          <span style="color:var(--text-muted);font-size:0.8125rem;margin-left:auto">${filtered.length} results</span>
        </div>
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead><tr><th>Bill #</th>${role !== 'patient' ? '<th>Patient</th>' : ''}<th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${paged.items.length === 0 ? `<tr><td colspan="6">${UI.emptyState('No bills found')}</td></tr>` :
              paged.items.map(b => `
                <tr>
                  <td><span style="font-weight:600;font-family:var(--font-display)">${b.bill_number || '—'}</span></td>
                  ${role !== 'patient' ? `<td style="font-weight:500">${patientName(b.patient_id)}</td>` : ''}
                  <td>${UI.formatDate(b.bill_date)}</td>
                  <td style="font-weight:700;color:var(--text-primary)">${UI.formatCurrency(b._total)}</td>
                  <td>${UI.statusBadge(b.status)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-icon-sm btn-ghost" title="View / Print" onclick="BillingPage.viewBill(${b.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      ${canCreate ? `<button class="btn btn-icon-sm btn-ghost" title="Edit" onclick="BillingPage.openEditModal(${b.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>` : ''}
                      ${canCreate && b.status === 'unpaid' ? `<button class="btn btn-icon-sm btn-ghost" title="Mark Paid" style="color:var(--success)" onclick="BillingPage.markPaid(${b.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${UI.renderPagination(paged, 'function(p){BillingPage.goPage(p)}')}
      </div>`;
  }

  let _billItems = [];

  function billForm(bill = null, existingItems = []) {
    const today = new Date().toISOString().split('T')[0];
    _billItems = existingItems.map(i => ({ ...i }));
    return `
      <form id="bill-form" novalidate>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="bf-patient_id">Patient *</label>
            <select id="bf-patient_id" name="patient_id">
              <option value="">Select patient</option>
              ${allPatients.map(p => `<option value="${p.id}" ${bill?.patient_id == p.id ? 'selected' : ''}>${p.name} (${p.patient_id})</option>`).join('')}
            </select>
            <span class="field-error" id="bf-patient_id-error"></span>
          </div>
          <div class="form-group">
            <label for="bf-doctor_id">Doctor</label>
            <select id="bf-doctor_id" name="doctor_id">
              <option value="">Select doctor</option>
              ${allDoctors.map(d => `<option value="${d.id}" ${bill?.doctor_id == d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="bf-bill_date">Bill Date</label>
            <input type="date" id="bf-bill_date" name="bill_date" value="${bill?.bill_date || today}" />
          </div>
          <div class="form-group">
            <label for="bf-due_date">Due Date</label>
            <input type="date" id="bf-due_date" name="due_date" value="${bill?.due_date || ''}" />
          </div>
        </div>
        <div class="form-section-title" style="margin-top:8px">
          Bill Items
          <button type="button" class="btn btn-sm btn-outline" style="float:right;margin-top:-4px" onclick="BillingPage.addBillItem()">+ Add Item</button>
        </div>
        <div id="bill-items-list"></div>
        <div class="bill-summary" id="bill-summary" style="margin-top:12px"></div>
        <div class="form-row cols-3" style="margin-top:12px">
          <div class="form-group">
            <label for="bf-discount">Discount ($)</label>
            <input type="number" id="bf-discount" name="discount" value="${bill?.discount || 0}" min="0" step="0.01" onchange="BillingPage.updateSummary()" />
          </div>
          <div class="form-group">
            <label for="bf-tax_rate">Tax Rate (%)</label>
            <input type="number" id="bf-tax_rate" name="tax_rate" value="${bill?.tax_rate ?? 5}" min="0" max="100" step="0.1" onchange="BillingPage.updateSummary()" />
          </div>
          <div class="form-group">
            <label for="bf-status">Status</label>
            <select id="bf-status" name="status">
              <option value="unpaid" ${(!bill || bill?.status === 'unpaid') ? 'selected' : ''}>Unpaid</option>
              <option value="paid" ${bill?.status === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="partial" ${bill?.status === 'partial' ? 'selected' : ''}>Partial</option>
            </select>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="bf-payment_method">Payment Method</label>
            <select id="bf-payment_method" name="payment_method">
              <option value="">Select method</option>
              ${['Cash', 'Credit Card', 'Debit Card', 'Insurance', 'Bank Transfer', 'Check'].map(m => `<option value="${m}" ${bill?.payment_method === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="bf-payment_date">Payment Date</label>
            <input type="date" id="bf-payment_date" name="payment_date" value="${bill?.payment_date || ''}" />
          </div>
        </div>
        <div class="form-group">
          <label for="bf-notes">Notes</label>
          <textarea id="bf-notes" name="notes" rows="2">${bill?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary"><span class="btn-text">${bill ? 'Update Bill' : 'Generate Bill'}</span><span class="btn-spinner hidden"></span></button>
        </div>
      </form>`;
  }

  function renderBillItems() {
    const container = document.getElementById('bill-items-list');
    if (!container) return;
    if (_billItems.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.875rem;border:1px dashed var(--border);border-radius:var(--radius-sm)">No items. Click "+ Add Item".</div>`;
    } else {
      container.innerHTML = `<table class="bill-table"><thead><tr><th>Description</th><th>Category</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th></tr></thead><tbody>
        ${_billItems.map((item, i) => `<tr>
          <td>${item.description}</td>
          <td><span style="text-transform:capitalize;font-size:0.8125rem">${item.category || '—'}</span></td>
          <td>${item.quantity || 1}</td>
          <td>${UI.formatCurrency(item.unit_price)}</td>
          <td style="font-weight:600">${UI.formatCurrency(item.amount)}</td>
          <td><button type="button" class="btn btn-icon-sm btn-ghost" style="color:var(--danger)" onclick="BillingPage.removeBillItem(${i})">✕</button></td>
        </tr>`).join('')}
      </tbody></table>`;
    }
    updateSummary();
  }

  function updateSummary() {
    const el = document.getElementById('bill-summary');
    if (!el) return;
    const subtotal = _billItems.reduce((s, i) => s + (i.amount || 0), 0);
    const disc = parseFloat(document.getElementById('bf-discount')?.value || 0);
    const taxRate = parseFloat(document.getElementById('bf-tax_rate')?.value || 0);
    const tax = ((subtotal - disc) * taxRate) / 100;
    const total = subtotal - disc + tax;
    el.innerHTML = `
      <div class="bill-summary-row"><span>Subtotal</span><span>${UI.formatCurrency(subtotal)}</span></div>
      ${disc > 0 ? `<div class="bill-summary-row discount"><span>Discount</span><span>-${UI.formatCurrency(disc)}</span></div>` : ''}
      ${taxRate > 0 ? `<div class="bill-summary-row"><span>Tax (${taxRate}%)</span><span>${UI.formatCurrency(tax)}</span></div>` : ''}
      <div class="bill-summary-row total"><span>Total</span><span>${UI.formatCurrency(total)}</span></div>`;
  }

  function addBillItem() {
    const html = `
      <form id="bill-item-form" novalidate>
        <div class="form-group"><label>Description *</label><input type="text" name="description" placeholder="e.g. Consultation Fee" /><span class="field-error" id="bi-description-error"></span></div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Category</label>
            <select name="category"><option value="consultation">Consultation</option><option value="lab">Lab / Test</option><option value="medicine">Medicine</option><option value="procedure">Procedure</option><option value="other">Other</option></select>
          </div>
          <div class="form-group"><label>Quantity</label><input type="number" name="quantity" value="1" min="1" onchange="document.querySelector('[name=amount]').value=(this.value*document.querySelector('[name=unit_price]').value).toFixed(2)" /></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Unit Price ($) *</label><input type="number" name="unit_price" step="0.01" min="0" placeholder="0.00" onchange="document.querySelector('[name=amount]').value=(this.value*document.querySelector('[name=quantity]').value).toFixed(2)" /><span class="field-error" id="bi-unit_price-error"></span></div>
          <div class="form-group"><label>Amount ($)</label><input type="number" name="amount" step="0.01" min="0" placeholder="0.00" /></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Item</button>
        </div>
      </form>`;
    const mainBody = document.getElementById('modal-body').innerHTML;
    const mainTitle = document.getElementById('modal-title').textContent;
    document.getElementById('modal-title').textContent = 'Add Bill Item';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('bill-item-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      if (!fd.description?.trim()) { document.getElementById('bi-description-error').textContent = 'Required'; return; }
      fd.quantity = parseInt(fd.quantity) || 1;
      fd.unit_price = parseFloat(fd.unit_price) || 0;
      fd.amount = parseFloat(fd.amount) || fd.quantity * fd.unit_price;
      _billItems.push(fd);
      document.getElementById('modal-title').textContent = mainTitle;
      document.getElementById('modal-body').innerHTML = mainBody;
      renderBillItems();
    });
  }

  function removeBillItem(idx) {
    _billItems.splice(idx, 1);
    renderBillItems();
  }

  async function openAddModal() {
    _billItems = [];
    const existingBills = await DB.getAll('bills');
    const billNumber = generateBillNumber(existingBills.length);
    await UI.openModal('Generate New Bill', billForm(null, []), { size: 'lg' });
    renderBillItems();
    setupBillFormSubmit(null, billNumber);
  }

  async function openEditModal(id) {
    const bill = await DB.getById('bills', id);
    if (!bill) return;
    const items = await DB.getByIndex('bill_items', 'bill_id', id);
    _billItems = items.map(i => ({ description: i.description, category: i.category, quantity: i.quantity, unit_price: i.unit_price, amount: i.amount }));
    await UI.openModal('Edit Bill', billForm(bill, _billItems), { size: 'lg' });
    renderBillItems();
    setupBillFormSubmit(bill, bill.bill_number);
  }

  function setupBillFormSubmit(existingBill, billNumber) {
    const form = document.getElementById('bill-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const data = {
        patient_id: parseInt(fd.patient_id),
        doctor_id: parseInt(fd.doctor_id) || null,
        bill_number: existingBill?.bill_number || billNumber,
        bill_date: fd.bill_date,
        due_date: fd.due_date,
        discount: parseFloat(fd.discount) || 0,
        tax_rate: parseFloat(fd.tax_rate) || 0,
        status: fd.status,
        payment_method: fd.payment_method,
        payment_date: fd.payment_date || null,
        notes: fd.notes,
      };
      if (!data.patient_id) { UI.showFieldErrors({ patient_id: 'Select a patient.' }, 'bf-'); return; }
      if (_billItems.length === 0) { UI.toast('Add at least one bill item.', 'warning'); return; }
      const btn = e.target.querySelector('[type=submit]');
      UI.setLoading(btn, true);
      try {
        let billId;
        if (existingBill) {
          await DB.update('bills', { ...existingBill, ...data });
          billId = existingBill.id;
          const oldItems = await DB.getByIndex('bill_items', 'bill_id', billId);
          for (const oi of oldItems) await DB.remove('bill_items', oi.id);
        } else {
          const saved = await DB.add('bills', data);
          billId = saved.id;
        }
        for (const item of _billItems) {
          await DB.add('bill_items', { ...item, bill_id: billId });
        }
        await reloadBills();
        UI.closeModal();
        renderList();
        UI.toast(existingBill ? 'Bill updated!' : 'Bill generated!', 'success');
      } catch (err) { UI.toast(err.message, 'danger'); UI.setLoading(btn, false); }
    });
  }

  async function markPaid(id) {
    const ok = await UI.confirm('Mark this bill as paid?', 'Confirm Payment', 'Mark Paid', 'btn-success');
    if (!ok) return;
    const bill = await DB.getById('bills', id);
    await DB.update('bills', { ...bill, status: 'paid', payment_date: new Date().toISOString().split('T')[0] });
    await reloadBills();
    renderList();
    UI.toast('Bill marked as paid.', 'success');
  }

  async function viewBill(id) {
    const bill = await DB.getById('bills', id);
    if (!bill) return;
    const items = await DB.getByIndex('bill_items', 'bill_id', id);
    const patient = allPatients.find(p => p.id === bill.patient_id);
    const doctor = allDoctors.find(d => d.id === bill.doctor_id);
    const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    const disc = bill.discount || 0;
    const tax = ((subtotal - disc) * (bill.tax_rate || 0)) / 100;
    const total = subtotal - disc + tax;

    const body = `
      <div class="bill-print-card" style="margin:-24px;min-width:0">
        <div class="bill-header" style="border-radius:0">
          <div class="bill-print-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary)"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <div><h2>MediCore HMS</h2><p>Hospital Management System</p></div>
          </div>
          <div class="bill-number">${bill.bill_number || 'Invoice'}</div>
          <div class="bill-meta">Date: ${UI.formatDate(bill.bill_date)} | Due: ${UI.formatDate(bill.due_date)}</div>
        </div>
        <div class="bill-status-banner ${bill.status === 'paid' ? 'bill-status-paid' : 'bill-status-unpaid'}">${bill.status.toUpperCase()}</div>
        <div style="padding:var(--space-lg)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-lg)">
            <div><div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Bill To</div>
              <div style="font-weight:600">${patient?.name || '—'}</div>
              <div style="font-size:0.8125rem;color:var(--text-secondary)">${patient?.patient_id || ''}</div>
              <div style="font-size:0.8125rem;color:var(--text-secondary)">${patient?.phone || ''}</div>
            </div>
            <div><div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Attending Doctor</div>
              <div style="font-weight:600">${doctor?.name || '—'}</div>
              <div style="font-size:0.8125rem;color:var(--text-secondary)">${doctor?.specialization || ''}</div>
            </div>
          </div>
          <table class="bill-table">
            <thead><tr><th>#</th><th>Description</th><th>Category</th><th>Qty</th><th>Rate</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              ${items.map((item, i) => `<tr>
                <td>${i + 1}</td>
                <td>${item.description}</td>
                <td style="text-transform:capitalize">${item.category || '—'}</td>
                <td>${item.quantity || 1}</td>
                <td>${UI.formatCurrency(item.unit_price)}</td>
                <td style="text-align:right;font-weight:600">${UI.formatCurrency(item.amount)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="bill-summary" style="max-width:280px;margin-left:auto;margin-top:var(--space-md)">
            <div class="bill-summary-row"><span>Subtotal</span><span>${UI.formatCurrency(subtotal)}</span></div>
            ${disc > 0 ? `<div class="bill-summary-row discount"><span>Discount</span><span>-${UI.formatCurrency(disc)}</span></div>` : ''}
            ${bill.tax_rate ? `<div class="bill-summary-row"><span>Tax (${bill.tax_rate}%)</span><span>${UI.formatCurrency(tax)}</span></div>` : ''}
            <div class="bill-summary-row total"><span>Total</span><span>${UI.formatCurrency(total)}</span></div>
          </div>
          ${bill.payment_method ? `<div style="margin-top:var(--space-md);font-size:0.8125rem;color:var(--text-secondary)">Payment: ${bill.payment_method}${bill.payment_date ? ' on ' + UI.formatDate(bill.payment_date) : ''}</div>` : ''}
          ${bill.notes ? `<div style="margin-top:var(--space-sm);font-size:0.8125rem;color:var(--text-secondary)">Notes: ${bill.notes}</div>` : ''}
          <div style="margin-top:var(--space-lg);text-align:center">
            <button class="btn btn-outline" onclick="window.print()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Bill
            </button>
          </div>
        </div>
      </div>`;
    await UI.openModal('Bill Details', body, { size: 'lg' });
  }

  async function reloadBills() {
    allBills = await DB.getAll('bills');
    const role = Auth.getRole();
    if (role === 'patient') {
      const userId = Auth.getUserId();
      const myPat = allPatients.find(p => p.user_id === userId);
      allBills = myPat ? allBills.filter(b => b.patient_id === myPat.id) : [];
    }
    for (const bill of allBills) {
      const items = await DB.getByIndex('bill_items', 'bill_id', bill.id);
      bill._items = items;
      bill._subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
      bill._discount = bill.discount || 0;
      bill._tax = ((bill._subtotal - bill._discount) * (bill.tax_rate || 0)) / 100;
      bill._total = bill._subtotal - bill._discount + bill._tax;
    }
  }

  function handleSearch(val) { searchQuery = val; currentPage = 1; renderList(); }
  function handleStatusFilter(val) { filterStatus = val; currentPage = 1; renderList(); }
  function goPage(p) { currentPage = p; renderList(); }

  return { render, openAddModal, openEditModal, viewBill, markPaid, addBillItem, removeBillItem, renderBillItems, updateSummary, handleSearch, handleStatusFilter, goPage };
})();
