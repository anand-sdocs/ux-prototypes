// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentStep = 1;
let variation = 1; // 1 | 2 | 3
let docIdSeq = 1;
let recipientIdSeq = 2;
let fieldIdSeq = 2;

let documents = [];

let recipients = [
  { id: 1, name: 'Anand Narasimhan', email: 'anarasimhan@sdocs.com', verification: 'none' }
];

let placedFields = [
  { id: 1, type: 'signature', label: 'Sign Here', required: true, x: 60, y: 60 }
];

const FIELD_TYPES = [
  { type: 'signature', label: 'Signature', icon: 'M4 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 21h18' },
  { type: 'initials', label: 'Initials', icon: 'M4 20V4l8 8 8-8v16' },
  { type: 'text', label: 'Text', icon: 'M5 4h14M12 4v16' },
  { type: 'date', label: 'Date', icon: 'M3 4h18v18H3zM3 9h18M8 2v4M16 2v4' },
  { type: 'number', label: 'Number', icon: 'M5 3v18M15 3v18M4 8h16M4 16h16' },
  { type: 'email', label: 'Email', icon: 'M3 5h18v14H3zM3 6l9 7 9-7' },
  { type: 'phone', label: 'Phone', icon: 'M6 2h6l2 5-3 2c1 3 3 5 6 6l2-3 5 2v6c-10 0-18-8-18-18z' },
  { type: 'checkbox', label: 'Checkbox', icon: 'M4 4h16v16H4zM8 12l3 3 5-6' },
  { type: 'picklist', label: 'Picklist', icon: 'M4 6h16M4 12h16M4 18h10' }
];

const TEMPLATE_DOCUMENT = { name: 'Identity Verification Template.pdf', size: '24.6 KB', pages: 2 };

const VERIFICATION_LABELS = { none: 'None', email: 'Email', 'okta-cac': 'Okta-CAC' };

const VARIATION_HINTS = {
  1: 'Ad hoc envelope, only "Email" verification is available for this sender, so a simple on/off toggle is shown.',
  2: 'Ad hoc envelope, "Email" and "Okta-CAC" are both available, so recipients choose from a dropdown (None / Email / Okta-CAC).',
  3: 'Sent from a template that requires "Email" and "Okta-CAC" verification. The dropdown is shown but locked — recipients cannot change it.'
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const variationSelect = document.getElementById('variation-select');
const variationHint = document.getElementById('variation-hint');

const btnBack = document.getElementById('btn-back');
const btnNext = document.getElementById('btn-next');
const stepperEl = document.getElementById('stepper');

const fileInput = document.getElementById('file-input');
const btnAddDocument = document.getElementById('btn-add-document');
const docListEl = document.getElementById('doc-list');
const docEmptyEl = document.getElementById('doc-empty');

const signersBody = document.getElementById('signers-body');
const btnAddSigner = document.getElementById('btn-add-signer');

const fieldsTabbar = document.getElementById('fields-tabbar');
const paletteList = document.getElementById('palette-list');
const fieldsCanvas = document.getElementById('fields-canvas');

const reviewTo = document.getElementById('review-to');
const reviewDocList = document.getElementById('review-doc-list');
const reviewRecipientList = document.getElementById('review-recipient-list');
const docCountBadge = document.getElementById('doc-count-badge');
const recipientCountBadge = document.getElementById('recipient-count-badge');
const btnRequestSignature = document.getElementById('btn-request-signature');

const successModal = document.getElementById('success-modal');
const successCopy = document.getElementById('success-copy');

const tourWidget = document.getElementById('tour-widget');
const tourHeader = document.getElementById('tour-header');
const tourMinimizeBtn = document.getElementById('tour-minimize-btn');
const tourStepTitle = document.getElementById('tour-step-title');
const tourStepDesc = document.getElementById('tour-step-desc');
const tourProgress = document.getElementById('tour-progress');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourNextBtn = document.getElementById('tour-next-btn');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bytesToSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(2) + ' KB';
  return (kb / 1024).toFixed(2) + ' MB';
}

function iconSvg(pathD, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathD}"/></svg>`;
}

function firstDocName() {
  return documents.length ? documents[0].name : 'No document added';
}

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------
function showStep(step) {
  currentStep = step;
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + step).classList.add('active');

  document.querySelectorAll('.step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.remove('current', 'completed');
    if (s < step) el.classList.add('completed');
    else if (s === step) el.classList.add('current');
  });

  btnBack.disabled = step === 1;
  btnNext.textContent = step === 4 ? 'Request signature' : 'Next';

  if (step === 2) renderSigners();
  if (step === 3) renderFieldsStep();
  if (step === 4) renderReview();
}

function validateStep(step) {
  if (step === 1 && documents.length === 0) {
    alert('Add at least one document before continuing.');
    return false;
  }
  if (step === 2) {
    const incomplete = recipients.some(r => !r.name.trim() || !r.email.trim());
    if (recipients.length === 0 || incomplete) {
      alert('Add at least one signer with a name and email before continuing.');
      return false;
    }
  }
  return true;
}

btnNext.addEventListener('click', () => {
  if (currentStep === 4) {
    sendRequest();
    return;
  }
  if (!validateStep(currentStep)) return;
  showStep(currentStep + 1);
});

btnBack.addEventListener('click', () => {
  if (currentStep > 1) showStep(currentStep - 1);
});

stepperEl.querySelectorAll('.step').forEach(el => {
  el.addEventListener('click', () => {
    const target = parseInt(el.dataset.step, 10);
    if (target < currentStep) showStep(target);
  });
  el.style.cursor = 'pointer';
});

document.querySelectorAll('.edit-link').forEach(btn => {
  btn.addEventListener('click', () => showStep(parseInt(btn.dataset.goto, 10)));
});

// ---------------------------------------------------------------------------
// Step 1: Documents
// ---------------------------------------------------------------------------
btnAddDocument.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  Array.from(fileInput.files).forEach(file => {
    documents.push({
      id: docIdSeq++,
      name: file.name,
      size: bytesToSize(file.size),
      pages: 1
    });
  });
  fileInput.value = '';
  renderDocuments();
});

function renderDocuments() {
  docListEl.innerHTML = '';
  docEmptyEl.classList.toggle('show', documents.length === 0);

  documents.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'doc-row';
    row.innerHTML = `
      <span class="drag-handle">&#8942;&#8942;</span>
      <span class="doc-icon">PDF</span>
      <div class="doc-info">
        <div class="doc-name">${escapeHtml(doc.name)}</div>
        <div class="doc-meta">${doc.pages} page &middot; ${doc.size} &middot; ${recipients.length} Signer${recipients.length === 1 ? '' : 's'}${doc.fromTemplate ? ' &middot; <span class="readonly-tag">From Template</span>' : ''}</div>
      </div>
      <div class="doc-actions">
        <button title="Edit">${iconSvg('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 15)}</button>
        <button class="delete-btn" title="Remove" data-id="${doc.id}">${iconSvg('M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', 15)}</button>
      </div>
    `;
    docListEl.appendChild(row);
  });

  docListEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      documents = documents.filter(d => d.id !== parseInt(btn.dataset.id, 10));
      renderDocuments();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Step 2: Signers / identity verification
// ---------------------------------------------------------------------------
function defaultVerificationForVariation() {
  if (variation === 3) return 'okta-cac';
  return 'none';
}

function remapRecipientsForVariation() {
  recipients.forEach(r => {
    if (variation === 1) {
      r.verification = r.verification === 'none' ? 'none' : 'email';
    } else if (variation === 3) {
      r.verification = 'okta-cac';
    }
    // variation 2 keeps whatever value the recipient already has
  });
}

function renderSigners() {
  signersBody.innerHTML = '';

  recipients.forEach(r => {
    const row = document.createElement('div');
    row.className = 'signers-row signers-body-row';

    let verifyControlHtml = '';
    if (variation === 1) {
      const isOn = r.verification !== 'none';
      verifyControlHtml = `
        <div class="verify-toggle-wrap">
          <button class="verify-toggle ${isOn ? 'on' : ''}" data-id="${r.id}" aria-label="Toggle email verification"></button>
          <span class="verify-toggle-label ${isOn ? 'active' : ''}">${isOn ? 'Email' : 'None'}</span>
        </div>`;
    } else {
      const disabled = variation === 3 ? 'disabled' : '';
      verifyControlHtml = `
        <select class="verify-select" data-id="${r.id}" ${disabled}>
          <option value="none" ${r.verification === 'none' ? 'selected' : ''}>None</option>
          <option value="email" ${r.verification === 'email' ? 'selected' : ''}>Email</option>
          <option value="okta-cac" ${r.verification === 'okta-cac' ? 'selected' : ''}>Okta-CAC</option>
        </select>
        ${variation === 3 ? '<span class="readonly-tag">Template</span>' : ''}`;
    }

    row.innerHTML = `
      <div class="col-doc">${escapeHtml(firstDocName())}</div>
      <div class="col-signer">
        <input class="signer-input" type="text" placeholder="Full name" value="${escapeHtml(r.name)}" data-field="name" data-id="${r.id}">
        <input class="signer-input" type="email" placeholder="Email address" value="${escapeHtml(r.email)}" data-field="email" data-id="${r.id}">
      </div>
      <div class="col-verify">${verifyControlHtml}</div>
      <div class="col-actions">
        <button class="row-menu" data-id="${r.id}" title="Remove signer">${iconSvg('M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', 15)}</button>
      </div>
    `;
    signersBody.appendChild(row);
  });

  signersBody.querySelectorAll('input.signer-input').forEach(input => {
    input.addEventListener('input', () => {
      const r = recipients.find(rr => rr.id === parseInt(input.dataset.id, 10));
      r[input.dataset.field] = input.value;
    });
  });

  signersBody.querySelectorAll('.verify-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = recipients.find(rr => rr.id === parseInt(btn.dataset.id, 10));
      r.verification = r.verification === 'none' ? 'email' : 'none';
      renderSigners();
    });
  });

  signersBody.querySelectorAll('select.verify-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const r = recipients.find(rr => rr.id === parseInt(sel.dataset.id, 10));
      r.verification = sel.value;
    });
  });

  signersBody.querySelectorAll('.row-menu').forEach(btn => {
    btn.addEventListener('click', () => {
      if (recipients.length === 1) {
        alert('At least one signer is required.');
        return;
      }
      recipients = recipients.filter(r => r.id !== parseInt(btn.dataset.id, 10));
      renderSigners();
    });
  });
}

btnAddSigner.addEventListener('click', () => {
  recipients.push({
    id: recipientIdSeq++,
    name: '',
    email: '',
    verification: defaultVerificationForVariation()
  });
  renderSigners();
});

function seedDocumentsForVariation(previousVariation) {
  const wasTemplate = previousVariation === 3;
  const isTemplate = variation === 3;

  if (isTemplate && !wasTemplate) {
    // Templates already have their document attached — no upload step needed.
    documents = [{ id: docIdSeq++, ...TEMPLATE_DOCUMENT, fromTemplate: true }];
  } else if (!isTemplate && wasTemplate) {
    // Ad hoc envelopes start empty so the Documents step demonstrates the upload flow.
    documents = [];
  }
  renderDocuments();
}

variationSelect.addEventListener('change', () => {
  const previousVariation = variation;
  variation = parseInt(variationSelect.value, 10);
  variationHint.textContent = VARIATION_HINTS[variation];
  seedDocumentsForVariation(previousVariation);
  remapRecipientsForVariation();
  renderSigners();
  if (currentStep === 4) renderReview();
});

// ---------------------------------------------------------------------------
// Step 3: Fields & Data
// ---------------------------------------------------------------------------
function renderFieldsStep() {
  fieldsTabbar.innerHTML = `<span class="fields-tab">${escapeHtml(firstDocName())}</span>`;
  renderPalette();
  renderCanvas();
}

function renderPalette() {
  paletteList.innerHTML = '';
  FIELD_TYPES.forEach(f => {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.dataset.type = f.type;
    item.innerHTML = `
      <span class="icon-label">${iconSvg(f.icon, 16)} ${f.label}</span>
      <span class="drag-dots">&#8942;&#8942;</span>
    `;
    item.addEventListener('click', () => addField(f.type, f.label));
    paletteList.appendChild(item);
  });
}

function addField(type, label) {
  const count = placedFields.length;
  placedFields.push({
    id: fieldIdSeq++,
    type,
    label: type === 'signature' ? 'Sign Here' : label,
    required: type === 'signature' || type === 'initials',
    x: 60 + (count % 5) * 24,
    y: 60 + (count % 5) * 46
  });
  renderCanvas();
}

function renderCanvas() {
  fieldsCanvas.innerHTML = '';
  placedFields.forEach(field => {
    const el = document.createElement('div');
    el.className = 'placed-field';
    el.style.left = field.x + 'px';
    el.style.top = field.y + 'px';
    el.innerHTML = `
      <span>${escapeHtml(field.label)}${field.required ? '<span class="req-star">*</span>' : ''}</span>
      <button class="remove-field" data-id="${field.id}" title="Remove field">&times;</button>
    `;
    fieldsCanvas.appendChild(el);
  });

  const hint = document.createElement('div');
  hint.className = 'canvas-hint';
  hint.textContent = placedFields.length ? '' : 'Click a field type on the left to place it on the document.';
  fieldsCanvas.appendChild(hint);

  fieldsCanvas.querySelectorAll('.remove-field').forEach(btn => {
    btn.addEventListener('click', () => {
      placedFields = placedFields.filter(f => f.id !== parseInt(btn.dataset.id, 10));
      renderCanvas();
    });
  });
}

// ---------------------------------------------------------------------------
// Step 4: Review & Send
// ---------------------------------------------------------------------------
function renderReview() {
  reviewTo.textContent = recipients.map(r => r.email).filter(Boolean).join(', ') || '—';

  docCountBadge.textContent = documents.length;
  recipientCountBadge.textContent = recipients.length;

  reviewDocList.innerHTML = documents.map(doc => `
    <div class="review-doc-row">
      <span class="doc-icon">PDF</span>
      <div>
        <div class="doc-name">${escapeHtml(doc.name)}</div>
        <div class="doc-meta">${doc.size}</div>
      </div>
    </div>
  `).join('') || '<p class="panel-sub">No documents added.</p>';

  reviewRecipientList.innerHTML = recipients.map(r => `
    <div class="review-recipient-row">
      <div class="review-recipient-name">${escapeHtml(r.name || 'Unnamed signer')}</div>
      <div class="review-recipient-email">${escapeHtml(r.email || '—')}</div>
      <span class="verify-badge method-${r.verification}">
        <span class="status-dot"></span>
        Verification: ${VERIFICATION_LABELS[r.verification]}
      </span>
    </div>
  `).join('');
}

function sendRequest() {
  successCopy.textContent = `Your signature request has been sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`;
  successModal.classList.add('show');
}

document.getElementById('btn-success-close').addEventListener('click', () => {
  successModal.classList.remove('show');
});

btnRequestSignature.addEventListener('click', sendRequest);

// ---------------------------------------------------------------------------
// Title edit
// ---------------------------------------------------------------------------
document.getElementById('btn-edit-title').addEventListener('click', () => {
  const title = document.getElementById('doc-title');
  title.focus();
  document.getSelection().selectAllChildren(title);
});

// ---------------------------------------------------------------------------
// Developer Guide (persistent floating widget) — explains the business logic
// behind each screen, aimed at engineers picking up this prototype.
// ---------------------------------------------------------------------------
const DEV_GUIDE_STEPS = [
  {
    title: 'Scenario switcher & state model',
    wizardStep: null,
    highlight: ['#variation-select'],
    desc: `The yellow bar is prototype-only. <code>variation</code> (1/2/3) is the single source of truth that drives three things: which document(s) the envelope starts with (<code>seedDocumentsForVariation()</code>), which control renders in the Signers step (<code>renderSigners()</code>), and how existing recipients' verification values get remapped when you switch (<code>remapRecipientsForVariation()</code>).
      <span class="dev-note">Try switching scenarios now and watch the Documents and Signers steps update.</span>`
  },
  {
    title: 'Documents — ad hoc vs. template',
    wizardStep: 1,
    highlight: ['#btn-add-document', '#doc-list', '#doc-empty'],
    desc: `<code>documents[]</code> starts empty for <strong>Variation 1 &amp; 2</strong> (ad hoc envelopes) so the upload step is actually exercised. For <strong>Variation 3</strong> (sent from a template), a document is pre-seeded with <code>fromTemplate: true</code> and tagged "From Template" — templates already have their document attached, so there's nothing to upload.
      <span class="dev-note">Docs only reset when you cross the ad hoc &harr; template boundary — switching between Variation 1 and 2 leaves whatever you've uploaded untouched.</span>`
  },
  {
    title: 'Signers — identity verification control',
    wizardStep: 2,
    highlight: ['#signers-table'],
    desc: `Each recipient has a single <code>verification</code> field: <code>'none' | 'email' | 'okta-cac'</code>. The <em>control</em> shown for it depends only on <code>variation</code>, not on the recipient: Variation 1 renders a toggle (only None/Email are possible), Variation 2 renders an enabled dropdown with all three options, Variation 3 renders the same dropdown but <code>disabled</code> and forced to <code>'okta-cac'</code> — a template's required verification method can't be overridden by the sender.`
  },
  {
    title: 'Fields & Data — simulated placement',
    wizardStep: 3,
    highlight: ['.fields-palette'],
    desc: `This step is intentionally <strong>click-to-place</strong>, not real HTML5 drag-and-drop — clicking a palette item pushes a <code>{type, label, required, x, y}</code> object into <code>placedFields[]</code> at a cascading offset. <code>signature</code> and <code>initials</code> default to <code>required: true</code>, matching the "Sign Here*" field seeded on load.`
  },
  {
    title: 'Review & Send — derived, not duplicated',
    wizardStep: 4,
    highlight: ['#review-recipient-list', '#btn-request-signature'],
    desc: `This screen holds no separate state — <code>renderReview()</code> reads straight from <code>documents[]</code> and <code>recipients[]</code>. Each badge's label and color class come from looking up <code>r.verification</code> in <code>VERIFICATION_LABELS</code>. "Request signature" is prototype-only: it shows a success modal rather than making a network call.`
  }
];

let devGuideStep = 1;

function clearTourHighlights() {
  document.querySelectorAll('.tour-pulse-highlight').forEach(el => el.classList.remove('tour-pulse-highlight'));
}

function renderDevGuideStep() {
  const step = DEV_GUIDE_STEPS[devGuideStep - 1];
  tourStepTitle.textContent = `Step ${devGuideStep}: ${step.title}`;
  tourStepDesc.innerHTML = step.desc;

  tourProgress.querySelectorAll('.step-dot').forEach(dot => {
    dot.classList.toggle('active', parseInt(dot.dataset.step, 10) === devGuideStep);
  });
  tourPrevBtn.disabled = devGuideStep === 1;
  tourNextBtn.textContent = devGuideStep === DEV_GUIDE_STEPS.length ? 'Restart' : 'Next';

  clearTourHighlights();
  if (step.wizardStep) showStep(step.wizardStep);
  step.highlight.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.classList.add('tour-pulse-highlight');
  });
}

tourNextBtn.addEventListener('click', () => {
  devGuideStep = devGuideStep === DEV_GUIDE_STEPS.length ? 1 : devGuideStep + 1;
  renderDevGuideStep();
});
tourPrevBtn.addEventListener('click', () => {
  if (devGuideStep > 1) { devGuideStep--; renderDevGuideStep(); }
});
tourProgress.querySelectorAll('.step-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    devGuideStep = parseInt(dot.dataset.step, 10);
    renderDevGuideStep();
  });
});
tourHeader.addEventListener('click', () => tourWidget.classList.toggle('minimized'));

document.getElementById('btn-tour').addEventListener('click', () => {
  tourWidget.classList.remove('minimized');
  devGuideStep = 1;
  renderDevGuideStep();
});
document.getElementById('btn-help').addEventListener('click', () => {
  alert('This prototype demonstrates the sender-side flow for creating a signature request, including per-recipient identity verification options. See the Developer Guide (bottom-right) for the business logic behind each screen.');
});

successModal.addEventListener('click', e => {
  if (e.target === successModal) successModal.classList.remove('show');
});

renderDevGuideStep();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
variationHint.textContent = VARIATION_HINTS[variation];
renderDocuments();
renderSigners();
showStep(1);
