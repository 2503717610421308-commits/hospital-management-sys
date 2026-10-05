/**
 * MediCore HMS - Prescriptions Page
 */

const PrescriptionsPage = (() => {
  let allPrescriptions = [];
  let allPatients = [];
  let allDoctors = [];
  let currentPage = 1;
  let searchQuery = '';

  async function render(params) {
    const content = document.getElementById('page-content');
    content.innerHTML = `<div style="padding:32px;text-align:center">Loading prescriptions...</div>`;
    try {
      [allPrescriptions, allPatients, allDoctors] = await Promise.all([
        DB.getAll('prescriptions'), DB.getAll('patients'), DB.getAll('doctors')
      ]);
      const role = Auth.getRole();
      const userId = Auth.getUserId();
      if (role === 'patient') {
        const myPat = allPatients.find(p => p.user_id === userId);
        allPrescriptions = myPat ? allPrescriptions.filter(r => r.patient_id === myPat.id) : [];
      }
      if (role === 'doctor') {
        const myDoc = allDoctors.find(d => d.user_id === userId);
        if (myDoc) allPrescriptions = allPrescriptions.filter(r => r.doctor_id === myDoc.id);
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
    let filtered = [...allPrescriptions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        patientName(r.patient_id).toLowerCase().includes(q) ||
        doctorName(r.doctor_id).toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => (b.prescription_date || b.created_at || '').localeCompare(a.prescription_date || a.created_at || ''));
    const paged = UI.paginate(filtered, currentPage, 10);
    const canCreate = Auth.can('create', 'prescriptions');

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h1>${role === 'patient' ? 'My Prescriptions' : 'Prescriptions'}</h1><p>${allPrescriptions.length} prescriptions total</p></div>
        <div class="page-header-actions">
          ${canCreate ? `<button class="btn btn-primary" onclick="PrescriptionsPage.openAddModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Prescription
          </button>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="toolbar">
          <div class="toolbar-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Search patient, doctor, notes..." value="${searchQuery}" oninput="PrescriptionsPage.handleSearch(this.value)" />
          </div>
          <span style="color:var(--text-muted);font-size:0.8125rem;margin-left:auto">${filtered.length} results</span>
        </div>
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead>
              <tr>
                ${role !== 'patient' ? '<th>Patient</th>' : ''}
                <th>Doctor</th>
                <th>Date</th>
                <th>Medicines</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paged.items.length === 0 ? `<tr><td colspan="6">${UI.emptyState('No prescriptions found')}</td></tr>` :
              paged.items.map(rx => `
                <tr>
                  ${role !== 'patient' ? `<td style="font-weight:600">${patientName(rx.patient_id)}</td>` : ''}
                  <td>${doctorName(rx.doctor_id)}</td>
                  <td>${UI.formatDate(rx.prescription_date)}</td>
                  <td><span class="badge badge-active">${rx._itemCount || '—'} items</span></td>
                  <td style="max-width:200px" class="truncate">${rx.notes || '—'}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-icon-sm btn-ghost" title="View" onclick="PrescriptionsPage.viewPrescription(${rx.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      ${canCreate ? `<button class="btn btn-icon-sm btn-ghost" title="Edit" onclick="PrescriptionsPage.openEditModal(${rx.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${UI.renderPagination(paged, 'function(p){PrescriptionsPage.goPage(p)}')}
      </div>`;
  }

  async function loadItemCounts() {
    for (const rx of allPrescriptions) {
      const items = await DB.getByIndex('prescription_items', 'prescription_id', rx.id);
      rx._itemCount = items.length;
    }
  }

  function prescriptionForm(rx = null, existingItems = []) {
    const role = Auth.getRole();
    const userId = Auth.getUserId();
    let doctorDefaultId = rx?.doctor_id || '';
    if (role === 'doctor') {
      const myDoc = allDoctors.find(d => d.user_id === userId);
      if (myDoc) doctorDefaultId = myDoc.id;
    }
    const today = new Date().toISOString().split('T')[0];
    const itemsJson = JSON.stringify(existingItems);
    return `
      <form id="rx-form" novalidate>
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="rxf-patient_id">Patient *</label>
            <select id="rxf-patient_id" name="patient_id">
              <option value="">Select patient</option>
              ${allPatients.map(p => `<option value="${p.id}" ${rx?.patient_id == p.id ? 'selected' : ''}>${p.name} (${p.patient_id})</option>`).join('')}
            </select>
            <span class="field-error" id="rxf-patient_id-error"></span>
          </div>
          <div class="form-group">
            <label for="rxf-doctor_id">Doctor *</label>
            <select id="rxf-doctor_id" name="doctor_id" ${role === 'doctor' ? 'disabled' : ''}>
              <option value="">Select doctor</option>
              ${allDoctors.map(d => `<option value="${d.id}" ${(rx?.doctor_id || doctorDefaultId) == d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
            <span class="field-error" id="rxf-doctor_id-error"></span>
          </div>
        </div>
        <div class="form-group">
          <label for="rxf-prescription_date">Date *</label>
          <input type="date" id="rxf-prescription_date" name="prescription_date" value="${rx?.prescription_date || today}" max="${today}" />
          <span class="field-error" id="rxf-prescription_date-error"></span>
        </div>
        <div class="form-section-title" style="margin-top:8px">
          Medicines
          <button type="button" class="btn btn-sm btn-outline" style="float:right;margin-top:-4px" onclick="PrescriptionsPage.addMedicineRow()">+ Add Medicine</button>
        </div>
        <div id="medicine-list" class="rx-list"></div>
        <div class="form-group" style="margin-top:12px">
          <label for="rxf-notes">Instructions / Notes</label>
          <textarea id="rxf-notes" name="notes" rows="2" placeholder="General prescription notes...">${rx?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary"><span class="btn-text">${rx ? 'Update Prescription' : 'Save Prescription'}</span><span class="btn-spinner hidden"></span></button>
        </div>
      </form>
      <script>
        PrescriptionsPage._pendingItems = ${itemsJson};
        PrescriptionsPage.renderMedicineRows();
      </script>`;
  }

  let _pendingItems = [];

  function renderMedicineRows() {
    const container = document.getElementById('medicine-list');
    if (!container) return;
    if (_pendingItems.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.875rem;border:1px dashed var(--border);border-radius:var(--radius-sm)">No medicines added yet. Click "+ Add Medicine" to start.</div>`;
      return;
    }
    container.innerHTML = _pendingItems.map((item, i) => `
      <div class="rx-item">
        <div>
          <div class="rx-medicine">${item.medicine_name || 'Unnamed'}</div>
          <div class="rx-details">${item.dosage || ''} • ${item.frequency || ''} • ${item.duration || ''}</div>
          ${item.instructions ? `<div class="rx-details" style="font-style:italic">${item.instructions}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;align-self:center">
          <button type="button" class="btn btn-icon-sm btn-ghost" title="Edit" onclick="PrescriptionsPage.editMedicineRow(${i})">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="rx-remove btn btn-icon-sm btn-ghost" title="Remove" onclick="PrescriptionsPage.removeMedicineRow(${i})">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>`).join('');
  }

  function addMedicineRow() {
    const html = `
      <form id="med-item-form" novalidate>
        <div class="form-group"><label>Medicine Name *</label><input type="text" name="medicine_name" placeholder="e.g. Amoxicillin" /><span class="field-error" id="med-medicine_name-error"></span></div>
        <div class="form-row cols-3">
          <div class="form-group"><label>Dosage *</label><input type="text" name="dosage" placeholder="500mg" /><span class="field-error" id="med-dosage-error"></span></div>
          <div class="form-group"><label>Frequency *</label><input type="text" name="frequency" placeholder="Twice daily" /></div>
          <div class="form-group"><label>Duration *</label><input type="text" name="duration" placeholder="7 days" /></div>
        </div>
        <div class="form-group"><label>Instructions</label><input type="text" name="instructions" placeholder="Take after meals" /></div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Medicine</button>
        </div>
      </form>`;
    // Use a nested prompt approach by temporarily storing main modal content
    const mainBody = document.getElementById('modal-body').innerHTML;
    const mainTitle = document.getElementById('modal-title').textContent;
    document.getElementById('modal-title').textContent = 'Add Medicine';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('med-item-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      if (!fd.medicine_name?.trim()) {
        const err = document.getElementById('med-medicine_name-error');
        if (err) err.textContent = 'Medicine name is required';
        return;
      }
      _pendingItems.push(fd);
      document.getElementById('modal-title').textContent = mainTitle;
      document.getElementById('modal-body').innerHTML = mainBody;
      renderMedicineRows();
    });
  }

  function editMedicineRow(idx) {
    const item = _pendingItems[idx];
    if (!item) return;
    const mainBody = document.getElementById('modal-body').innerHTML;
    const mainTitle = document.getElementById('modal-title').textContent;
    const html = `
      <form id="med-item-form" novalidate>
        <div class="form-group"><label>Medicine Name *</label><input type="text" name="medicine_name" value="${item.medicine_name || ''}" /><span class="field-error" id="med-medicine_name-error"></span></div>
        <div class="form-row cols-3">
          <div class="form-group"><label>Dosage *</label><input type="text" name="dosage" value="${item.dosage || ''}" /></div>
          <div class="form-group"><label>Frequency</label><input type="text" name="frequency" value="${item.frequency || ''}" /></div>
          <div class="form-group"><label>Duration</label><input type="text" name="duration" value="${item.duration || ''}" /></div>
        </div>
        <div class="form-group"><label>Instructions</label><input type="text" name="instructions" value="${item.instructions || ''}" /></div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-title').textContent='${mainTitle}';document.getElementById('modal-body').innerHTML=PrescriptionsPage._savedBody;PrescriptionsPage.renderMedicineRows()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Medicine</button>
        </div>
      </form>`;
    _savedBody = mainBody;
    document.getElementById('modal-title').textContent = 'Edit Medicine';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('med-item-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      if (!fd.medicine_name?.trim()) { document.getElementById('med-medicine_name-error').textContent = 'Required'; return; }
      _pendingItems[idx] = fd;
      document.getElementById('modal-title').textContent = mainTitle;
      document.getElementById('modal-body').innerHTML = mainBody;
      renderMedicineRows();
    });
  }

  let _savedBody = '';

  function removeMedicineRow(idx) {
    _pendingItems.splice(idx, 1);
    renderMedicineRows();
  }

  async function openAddModal() {
    _pendingItems = [];
    await UI.openModal('New Prescription', prescriptionForm(null, []), { size: 'lg' });
    renderMedicineRows();
    setupFormSubmit(null);
  }

  async function openEditModal(id) {
    const rx = await DB.getById('prescriptions', id);
    if (!rx) return;
    const items = await DB.getByIndex('prescription_items', 'prescription_id', id);
    _pendingItems = items.map(i => ({ medicine_name: i.medicine_name, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions }));
    await UI.openModal('Edit Prescription', prescriptionForm(rx, _pendingItems), { size: 'lg' });
    renderMedicineRows();
    setupFormSubmit(rx);
  }

  function setupFormSubmit(existingRx) {
    const form = document.getElementById('rx-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const raw = Object.fromEntries(fd);
      const docSelect = e.target.querySelector('[name=doctor_id]');
      if (docSelect) raw.doctor_id = docSelect.value;
      const data = {
        patient_id: parseInt(raw.patient_id),
        doctor_id: parseInt(raw.doctor_id),
        prescription_date: raw.prescription_date,
        notes: raw.notes
      };
      const errors = UI.validateForm(data, {
        patient_id: { required: true, requiredMsg: 'Select a patient.' },
        doctor_id: { required: true, requiredMsg: 'Select a doctor.' },
        prescription_date: { required: true, label: 'Date' },
      });
      if (Object.keys(errors).length) { UI.showFieldErrors(errors, 'rxf-'); return; }
      if (_pendingItems.length === 0) { UI.toast('Add at least one medicine.', 'warning'); return; }
      const btn = e.target.querySelector('[type=submit]');
      UI.setLoading(btn, true);
      try {
        let rxId;
        if (existingRx) {
          await DB.update('prescriptions', { ...existingRx, ...data });
          rxId = existingRx.id;
          // Remove old items
          const oldItems = await DB.getByIndex('prescription_items', 'prescription_id', rxId);
          for (const oi of oldItems) await DB.remove('prescription_items', oi.id);
        } else {
          const saved = await DB.add('prescriptions', data);
          rxId = saved.id;
        }
        // Add items
        for (const item of _pendingItems) {
          await DB.add('prescription_items', { ...item, prescription_id: rxId });
        }
        allPrescriptions = await DB.getAll('prescriptions');
        await loadItemCounts();
        UI.closeModal();
        renderList();
        UI.toast(existingRx ? 'Prescription updated!' : 'Prescription saved!', 'success');
      } catch (err) { UI.toast(err.message, 'danger'); UI.setLoading(btn, false); }
    });
  }

  async function viewPrescription(id) {
    const rx = await DB.getById('prescriptions', id);
    if (!rx) return;
    const items = await DB.getByIndex('prescription_items', 'prescription_id', id);
    const patient = allPatients.find(p => p.id === rx.patient_id);
    const doctor = allDoctors.find(d => d.id === rx.doctor_id);
    const body = `
      <div class="rx-header" style="margin:-24px -24px 24px;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="rx-symbol">℞</div>
            <h3 style="color:white;margin-top:4px">${doctor?.name || '—'}</h3>
            <div style="color:rgba(255,255,255,0.7);font-size:0.8125rem">${doctor?.specialization || 'Doctor'}</div>
          </div>
          <div style="text-align:right;color:rgba(255,255,255,0.8);font-size:0.8125rem">
            <div>Date: ${UI.formatDate(rx.prescription_date)}</div>
            <div style="margin-top:4px">Patient: <strong style="color:white">${patient?.name || '—'}</strong></div>
            ${patient?.patient_id ? `<div>${patient.patient_id}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="form-section-title">Prescribed Medicines (${items.length})</div>
      ${items.length === 0 ? UI.emptyState('No medicines in this prescription') :
      items.map(item => `
        <div class="rx-medicine-card">
          <div class="rx-medicine-name">${item.medicine_name}</div>
          <div class="rx-medicine-details">
            ${item.dosage ? `<span class="rx-medicine-detail"><strong>Dosage:</strong> ${item.dosage}</span>` : ''}
            ${item.frequency ? `<span class="rx-medicine-detail"><strong>Frequency:</strong> ${item.frequency}</span>` : ''}
            ${item.duration ? `<span class="rx-medicine-detail"><strong>Duration:</strong> ${item.duration}</span>` : ''}
          </div>
          ${item.instructions ? `<div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:4px;font-style:italic">📝 ${item.instructions}</div>` : ''}
        </div>`).join('')}
      ${rx.notes ? `<div style="margin-top:var(--space-md)"><div class="form-section-title">Notes</div><p style="font-size:0.875rem;color:var(--text-secondary)">${rx.notes}</p></div>` : ''}`;
    await UI.openModal('Prescription Details', body, { size: 'lg' });
  }

  function handleSearch(val) { searchQuery = val; currentPage = 1; renderList(); }
  function goPage(p) { currentPage = p; renderList(); }

  return { render, openAddModal, openEditModal, viewPrescription, addMedicineRow, editMedicineRow, removeMedicineRow, renderMedicineRows, handleSearch, goPage, _pendingItems, _savedBody, loadItemCounts };
})();
