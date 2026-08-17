document.addEventListener('DOMContentLoaded', () => {

  // ---------- State ----------
  let methods = [
    // Example pre-existing method so the list isn't empty on first load.
    {
      id: 'm1',
      apiName: 'Okta_SSO',
      name: 'Okta SSO',
      loginUrl: 'https://sdocs-demo.okta.com/oauth2/default/v1/authorize',
      clientId: '0oa1a2b3c4d5e6f7g8h9',
      scopes: ['profile', 'email', 'openid'],
      attributes: [
        { sdocsAttr: 'Certificate Serial Number', oktaAttr: 'certSerialNumber', fixed: true, key: 'certificateSerialNumber' },
        { sdocsAttr: 'Full Name', oktaAttr: 'name', fixed: true, key: 'fullName' }
      ],
      enabled: true
    }
  ];

  let editingMethodId = null;
  let currentStep = 1;
  let scopeChips = [];
  let attrRows = [];

  // ---------- Elements ----------
  const requireToggle = document.getElementById('require-verification-toggle');
  const methodsPanel = document.getElementById('verify-methods-panel');
  const methodsList = document.getElementById('methods-list');
  const btnAddMethod = document.getElementById('btn-add-method');

  const modal = document.getElementById('method-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalStepLabel = document.getElementById('modal-step-label');
  const stepSelectType = document.getElementById('step-select-type');
  const stepConfigure = document.getElementById('step-configure');
  const tileOidc = document.getElementById('tile-oidc');

  const inputName = document.getElementById('input-name');
  const inputApiName = document.getElementById('input-api-name');
  const inputLoginUrl = document.getElementById('input-login-url');
  const inputClientId = document.getElementById('input-client-id');
  const scopeChipWrap = document.getElementById('scope-chip-wrap');
  const scopeInput = document.getElementById('scope-input');
  const attrTable = document.getElementById('attr-table');
  const btnAddAttr = document.getElementById('btn-add-attr');

  const btnBack = document.getElementById('btn-modal-back');
  const btnTest = document.getElementById('btn-modal-test');
  const btnCancel = document.getElementById('btn-modal-cancel');
  const btnNext = document.getElementById('btn-modal-next');
  const btnSave = document.getElementById('btn-modal-save');

  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  // ---------- Require Identity Verification toggle ----------
  requireToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    requireToggle.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    methodsPanel.style.display = btn.dataset.value === 'yes' ? 'block' : 'none';
  });

  // ---------- Render methods list ----------
  function renderMethods() {
    methodsList.querySelectorAll('[data-method-row]').forEach(el => el.remove());

    methods.forEach(method => {
      const row = document.createElement('div');
      row.className = 'method-row';
      row.dataset.methodRow = method.id;
      row.innerHTML = `
        <div class="method-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <div class="method-info">
          <div class="method-name">${escapeHtml(method.name)} <span class="method-badge">OpenID Connect</span></div>
          <div class="method-sub">${escapeHtml(method.loginUrl)}</div>
        </div>
        <div class="method-actions">
          <label class="switch">
            <input type="checkbox" ${method.enabled ? 'checked' : ''} data-toggle-method="${method.id}">
            <span class="switch-track"></span>
          </label>
          <button type="button" class="icon-btn" data-edit-method="${method.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
          </button>
          <button type="button" class="icon-btn danger" data-delete-method="${method.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          </button>
        </div>
      `;
      methodsList.appendChild(row);
    });
  }

  methodsList.addEventListener('change', (e) => {
    const id = e.target.dataset.toggleMethod;
    if (!id) return;
    const method = methods.find(m => m.id === id);
    if (method) method.enabled = e.target.checked;
  });

  methodsList.addEventListener('click', (e) => {
    const editId = e.target.closest('[data-edit-method]')?.dataset.editMethod;
    const deleteId = e.target.closest('[data-delete-method]')?.dataset.deleteMethod;
    if (editId) openModal(editId);
    if (deleteId) {
      methods = methods.filter(m => m.id !== deleteId);
      renderMethods();
      showToast('Verification method removed');
    }
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Modal open/close ----------
  btnAddMethod.addEventListener('click', () => openModal(null));

  function openModal(methodId) {
    editingMethodId = methodId;
    const method = methodId ? methods.find(m => m.id === methodId) : null;

    modalTitle.textContent = method ? 'Edit Verification Method' : 'Add Verification Method';

    if (method) {
      inputName.value = method.name;
      inputApiName.value = method.apiName;
      inputLoginUrl.value = method.loginUrl;
      inputClientId.value = method.clientId;
      scopeChips = [...method.scopes];
      attrRows = method.attributes.map(a => ({ ...a }));
    } else {
      inputName.value = '';
      inputApiName.value = '';
      inputLoginUrl.value = '';
      inputClientId.value = '';
      scopeChips = ['profile', 'email', 'openid'];
      attrRows = [
        { sdocsAttr: 'Certificate Serial Number', oktaAttr: '', fixed: true, key: 'certificateSerialNumber' },
        { sdocsAttr: 'Full Name', oktaAttr: '', fixed: true, key: 'fullName' }
      ];
    }

    clearFieldErrors();
    renderScopeChips();
    renderAttrTable();
    goToStep(1);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    editingMethodId = null;
  }

  btnCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ---------- Step navigation ----------
  function goToStep(step) {
    currentStep = step;
    stepSelectType.classList.toggle('active', step === 1);
    stepConfigure.classList.toggle('active', step === 2);

    if (step === 1) {
      modalStepLabel.textContent = 'Step 1 of 2 · Select a verification type';
      btnBack.style.display = 'none';
      btnTest.style.display = 'none';
      btnNext.style.display = 'inline-block';
      btnSave.style.display = 'none';
    } else {
      modalStepLabel.textContent = 'Step 2 of 2 · Configure OpenID Connect';
      btnBack.style.display = 'inline-block';
      btnTest.style.display = 'inline-block';
      btnNext.style.display = 'none';
      btnSave.style.display = 'inline-block';
    }
  }

  tileOidc.addEventListener('click', () => tileOidc.classList.add('selected'));
  btnNext.addEventListener('click', () => goToStep(2));
  btnBack.addEventListener('click', () => goToStep(1));

  // ---------- API name generation ----------
  inputName.addEventListener('input', () => {
    inputApiName.value = generateApiName(inputName.value);
  });

  function generateApiName(name) {
    return name
      .trim()
      .replace(/[^a-zA-Z]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // ---------- Scope chips ----------
  function renderScopeChips() {
    scopeChipWrap.querySelectorAll('.chip').forEach(el => el.remove());
    scopeChips.forEach((scope, index) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `${escapeHtml(scope)} <button type="button" data-remove-scope="${index}" title="Remove scope"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
      scopeChipWrap.insertBefore(chip, scopeInput);
    });
  }

  scopeChipWrap.addEventListener('click', (e) => {
    const idx = e.target.closest('[data-remove-scope]')?.dataset.removeScope;
    if (idx === undefined) return;
    scopeChips.splice(Number(idx), 1);
    renderScopeChips();
  });

  scopeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = scopeInput.value.trim().replace(/,$/, '');
      if (value && !scopeChips.includes(value)) {
        scopeChips.push(value);
        renderScopeChips();
      }
      scopeInput.value = '';
    } else if (e.key === 'Backspace' && !scopeInput.value && scopeChips.length) {
      scopeChips.pop();
      renderScopeChips();
    }
  });

  // ---------- Attribute mapping table ----------
  function renderAttrTable() {
    attrTable.innerHTML = '';
    attrRows.forEach((row, index) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'attr-row';
      const sdocsCell = row.fixed
        ? `<div class="attr-fixed-label">${escapeHtml(row.sdocsAttr)}</div>`
        : `<input type="text" value="${escapeHtml(row.sdocsAttr)}" data-attr-field="sdocsAttr" data-attr-index="${index}" placeholder="S-Docs attribute name">`;
      rowEl.innerHTML = `
        ${sdocsCell}
        <input type="text" value="${escapeHtml(row.oktaAttr)}" data-attr-field="oktaAttr" data-attr-index="${index}" placeholder="Okta attribute name">
        <button type="button" class="icon-btn danger" data-remove-attr="${index}" title="Delete attribute">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
        </button>
      `;
      attrTable.appendChild(rowEl);
    });
  }

  attrTable.addEventListener('input', (e) => {
    const field = e.target.dataset.attrField;
    const index = e.target.dataset.attrIndex;
    if (!field || index === undefined) return;
    attrRows[index][field] = e.target.value;
  });

  attrTable.addEventListener('click', (e) => {
    const idx = e.target.closest('[data-remove-attr]')?.dataset.removeAttr;
    if (idx === undefined) return;
    attrRows.splice(Number(idx), 1);
    renderAttrTable();
  });

  btnAddAttr.addEventListener('click', () => {
    attrRows.push({ sdocsAttr: '', oktaAttr: '', fixed: false });
    renderAttrTable();
  });

  // ---------- Validation ----------
  function clearFieldErrors() {
    document.querySelectorAll('.field-group.invalid').forEach(el => el.classList.remove('invalid'));
  }

  function validateConfig() {
    clearFieldErrors();
    let valid = true;

    if (!inputName.value.trim()) {
      document.getElementById('field-name').classList.add('invalid');
      valid = false;
    }
    if (!/^https:\/\/.+/i.test(inputLoginUrl.value.trim())) {
      document.getElementById('field-login-url').classList.add('invalid');
      valid = false;
    }
    if (!inputClientId.value.trim()) {
      document.getElementById('field-client-id').classList.add('invalid');
      valid = false;
    }
    return valid;
  }

  // ---------- Save ----------
  btnSave.addEventListener('click', () => {
    if (!validateConfig()) return;

    const data = {
      id: editingMethodId || 'm' + Date.now(),
      name: inputName.value.trim(),
      apiName: inputApiName.value.trim(),
      loginUrl: inputLoginUrl.value.trim(),
      clientId: inputClientId.value.trim(),
      scopes: [...scopeChips],
      attributes: attrRows.map(r => ({ ...r })),
      enabled: editingMethodId ? methods.find(m => m.id === editingMethodId).enabled : true
    };

    if (editingMethodId) {
      methods = methods.map(m => m.id === editingMethodId ? data : m);
    } else {
      methods.push(data);
    }

    renderMethods();
    closeModal();
    showToast(editingMethodId ? 'Verification method updated' : 'Verification method added');
  });

  // ---------- Test Connection ----------
  btnTest.addEventListener('click', () => {
    if (!validateConfig()) return;

    const params = new URLSearchParams({
      app: inputName.value.trim() || 'S-Docs E-Signature',
      clientId: inputClientId.value.trim(),
      loginUrl: inputLoginUrl.value.trim(),
      scopes: scopeChips.join(' '),
      attrs: JSON.stringify(attrRows.map(r => ({ label: r.sdocsAttr, claim: r.oktaAttr })))
    });

    window.open(`okta-login.html?${params.toString()}`, '_blank');
  });

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ---------- Init ----------
  renderMethods();
});
