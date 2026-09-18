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

  // ===========================================================
  // Digital Signature section
  // ===========================================================

  const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let signers = [
    { id: 's1', firstName: 'Priya', lastName: 'Natarajan', email: 'priya.natarajan@sdocs.com', digitalId: 'DC-9F31-77A2-0C4E', active: true },
    { id: 's2', firstName: 'Marcus', lastName: 'Webb', email: 'marcus.webb@sdocs.com', digitalId: 'DC-1B08-EE45-9AD1', active: true }
  ];
  let accountValidated = false;
  let deactivateTargetId = null;

  const digitalSigToggle = document.getElementById('digital-sig-toggle');
  const digitalSigPanel = document.getElementById('digital-sig-panel');
  const inputAccountId = document.getElementById('input-account-identifier');
  const fieldAccountId = document.getElementById('field-account-identifier');
  const btnValidateAccount = document.getElementById('btn-validate-account');
  const accountStatus = document.getElementById('account-status');
  const signersPanel = document.getElementById('signers-panel');
  const signersRows = document.getElementById('signers-rows');
  const addSignerRow = document.getElementById('add-signer-row');
  const btnAddSigner = document.getElementById('btn-add-signer');
  const btnSaveSigner = document.getElementById('btn-save-signer');
  const btnCancelSigner = document.getElementById('btn-cancel-signer');
  const newSignerFirst = document.getElementById('new-signer-first');
  const newSignerLast = document.getElementById('new-signer-last');
  const newSignerEmail = document.getElementById('new-signer-email');

  const deactivateModal = document.getElementById('deactivate-modal');
  const deactivateModalText = document.getElementById('deactivate-modal-text');
  const btnDeactivateCancel = document.getElementById('btn-deactivate-cancel');
  const btnDeactivateConfirm = document.getElementById('btn-deactivate-confirm');

  // ---------- Digital Signature Enabled toggle ----------
  digitalSigToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    digitalSigToggle.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    digitalSigPanel.style.display = btn.dataset.value === 'yes' ? 'block' : 'none';
  });

  // ---------- Account Identifier validation ----------
  function setAccountStatus(state, message) {
    accountStatus.className = 'account-status show ' + state;
    if (state === 'pending') {
      accountStatus.innerHTML = `<span class="spinner"></span> ${message}`;
    } else if (state === 'valid') {
      accountStatus.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> ${message}`;
    } else if (state === 'invalid') {
      accountStatus.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> ${message}`;
    }
  }

  btnValidateAccount.addEventListener('click', () => {
    const value = inputAccountId.value.trim();
    fieldAccountId.classList.remove('invalid');
    accountValidated = false;
    signersPanel.style.display = 'none';

    if (!GUID_RE.test(value)) {
      fieldAccountId.classList.add('invalid');
      accountStatus.className = 'account-status';
      return;
    }

    setAccountStatus('pending', 'Validating with DigiCert…');
    btnValidateAccount.disabled = true;

    setTimeout(() => {
      btnValidateAccount.disabled = false;
      accountValidated = true;
      setAccountStatus('valid', 'Account Identifier validated with DigiCert.');
      signersPanel.style.display = 'block';
      renderSigners();
    }, 900);
  });

  inputAccountId.addEventListener('input', () => {
    if (accountValidated) {
      accountValidated = false;
      signersPanel.style.display = 'none';
      accountStatus.className = 'account-status';
    }
  });

  // ---------- Signers table ----------
  function renderSigners() {
    signersRows.innerHTML = '';
    signers.forEach(signer => {
      const row = document.createElement('div');
      row.className = 'signer-row' + (signer.active ? '' : ' deactivated');
      row.innerHTML = `
        <div>${escapeHtml(signer.firstName)}</div>
        <div>${escapeHtml(signer.lastName)}</div>
        <div>${escapeHtml(signer.email)}</div>
        <div class="signer-cell-muted">${escapeHtml(signer.digitalId)}</div>
        <div><span class="status-pill ${signer.active ? 'active' : 'deactivated'}">${signer.active ? 'Active' : 'Deactivated'}</span></div>
        <div class="row-actions">
          ${signer.active ? `<button type="button" class="deactivate-link" data-deactivate-signer="${signer.id}">Deactivate</button>` : ''}
        </div>
      `;
      signersRows.appendChild(row);
    });
  }

  signersRows.addEventListener('click', (e) => {
    const id = e.target.closest('[data-deactivate-signer]')?.dataset.deactivateSigner;
    if (!id) return;
    const signer = signers.find(s => s.id === id);
    if (!signer) return;
    deactivateTargetId = id;
    deactivateModalText.textContent = `${signer.firstName} ${signer.lastName} (${signer.email}) will no longer be able to apply a digital signature. This can be reversed by re-enrolling the user.`;
    deactivateModal.classList.add('open');
  });

  btnDeactivateCancel.addEventListener('click', () => {
    deactivateModal.classList.remove('open');
    deactivateTargetId = null;
  });
  deactivateModal.addEventListener('click', (e) => {
    if (e.target === deactivateModal) {
      deactivateModal.classList.remove('open');
      deactivateTargetId = null;
    }
  });

  btnDeactivateConfirm.addEventListener('click', () => {
    const signer = signers.find(s => s.id === deactivateTargetId);
    if (signer) signer.active = false;
    deactivateModal.classList.remove('open');
    deactivateTargetId = null;
    renderSigners();
    showToast('User deactivated from digital signature');
  });

  // ---------- Add user (inline row) ----------
  btnAddSigner.addEventListener('click', () => {
    addSignerRow.style.display = 'grid';
    btnAddSigner.style.display = 'none';
    newSignerFirst.value = '';
    newSignerLast.value = '';
    newSignerEmail.value = '';
    newSignerFirst.focus();
  });

  function closeAddSignerRow() {
    addSignerRow.style.display = 'none';
    btnAddSigner.style.display = 'inline-flex';
  }

  btnCancelSigner.addEventListener('click', closeAddSignerRow);

  btnSaveSigner.addEventListener('click', () => {
    const firstName = newSignerFirst.value.trim();
    const lastName = newSignerLast.value.trim();
    const email = newSignerEmail.value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    [newSignerFirst, newSignerLast, newSignerEmail].forEach(el => el.style.borderColor = '');
    let valid = true;
    if (!firstName) { newSignerFirst.style.borderColor = 'var(--danger-color)'; valid = false; }
    if (!lastName) { newSignerLast.style.borderColor = 'var(--danger-color)'; valid = false; }
    if (!emailValid) { newSignerEmail.style.borderColor = 'var(--danger-color)'; valid = false; }
    if (!valid) return;

    signers.push({
      id: 's' + Date.now(),
      firstName,
      lastName,
      email,
      digitalId: 'DC-' + Math.random().toString(16).slice(2, 6).toUpperCase() + '-' + Math.random().toString(16).slice(2, 6).toUpperCase() + '-' + Math.random().toString(16).slice(2, 6).toUpperCase(),
      active: true
    });

    renderSigners();
    closeAddSignerRow();
    showToast('User added to digital signature');
  });
});
