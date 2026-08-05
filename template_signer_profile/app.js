// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let signerIdSeq = 2;
let activeSignerId = null;

const SIGNER_COLORS = ['#f5a623', '#3aa0ff', '#3ecf8e', '#9b6bd9', '#ff6b57'];

let signers = [
  { id: 1, name: 'Default Signer', requirePin: false, verificationMethod: 'email', prefill: false, color: SIGNER_COLORS[0] }
];

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const btnKebab = document.getElementById('btn-kebab');
const kebabMenu = document.getElementById('kebab-menu');

const settingsPanel = document.getElementById('settings-panel');
const btnCloseSettings = document.getElementById('btn-close-settings');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

const btnAddSigner = document.getElementById('btn-add-signer');
const signersList = document.getElementById('signers-list');

const signerPopover = document.getElementById('signer-popover');
const btnClosePopover = document.getElementById('btn-close-popover');
const signerNameInput = document.getElementById('signer-name-input');
const identificationToggle = document.getElementById('identification-toggle');
const verificationMethodRow = document.getElementById('verification-method-row');
const verificationMethodSelect = document.getElementById('verification-method-select');
const prefillCheckbox = document.getElementById('prefill-checkbox');
const btnDeleteSigner = document.getElementById('btn-delete-signer');

const signHereField = document.getElementById('sign-here-field');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getSigner(id) {
  return signers.find(s => s.id === id);
}

// ---------------------------------------------------------------------------
// Kebab menu
// ---------------------------------------------------------------------------
btnKebab.addEventListener('click', (e) => {
  e.stopPropagation();
  kebabMenu.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!kebabMenu.contains(e.target) && e.target !== btnKebab) {
    kebabMenu.classList.remove('open');
  }
});

kebabMenu.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    kebabMenu.classList.remove('open');
    openSettingsPanel(btn.dataset.panel);
  });
});

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------
function openSettingsPanel(tab) {
  settingsPanel.classList.add('open');
  setActiveTab(tab);
}

function setActiveTab(tab) {
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  tabPanels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab));
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

btnCloseSettings.addEventListener('click', () => {
  settingsPanel.classList.remove('open');
  closePopover();
});

// ---------------------------------------------------------------------------
// Signers list
// ---------------------------------------------------------------------------
function renderSignersList() {
  signersList.innerHTML = signers.map(s => `
    <div class="signer-row ${s.id === activeSignerId ? 'active' : ''}" data-id="${s.id}">
      <span class="signer-dot" style="background:${s.color}"></span>
      <span>${escapeHtml(s.name || 'Untitled Signer')}</span>
    </div>
  `).join('');

  signersList.querySelectorAll('.signer-row').forEach(row => {
    row.addEventListener('click', () => openPopover(parseInt(row.dataset.id, 10)));
  });
}

btnAddSigner.addEventListener('click', () => {
  const signer = {
    id: signerIdSeq++,
    name: `Signer ${signers.length + 1}`,
    requirePin: false,
    verificationMethod: 'email',
    prefill: false,
    color: SIGNER_COLORS[signers.length % SIGNER_COLORS.length]
  };
  signers.push(signer);
  renderSignersList();
  openPopover(signer.id);
});

// ---------------------------------------------------------------------------
// Signer popover
// ---------------------------------------------------------------------------
function openPopover(id) {
  activeSignerId = id;
  const signer = getSigner(id);
  if (!signer) return;

  signerNameInput.value = signer.name;
  setIdentification(signer.requirePin, false);
  verificationMethodSelect.value = signer.verificationMethod;
  prefillCheckbox.checked = signer.prefill;

  signerPopover.classList.add('open');
  renderSignersList();
}

function closePopover() {
  activeSignerId = null;
  signerPopover.classList.remove('open');
  renderSignersList();
}

function setIdentification(requirePin, persist = true) {
  identificationToggle.querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('selected', (btn.dataset.value === 'yes') === requirePin);
  });
  verificationMethodRow.hidden = !requirePin;

  if (persist && activeSignerId != null) {
    const signer = getSigner(activeSignerId);
    if (signer) signer.requirePin = requirePin;
  }
}

identificationToggle.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => setIdentification(btn.dataset.value === 'yes'));
});

verificationMethodSelect.addEventListener('change', () => {
  const signer = getSigner(activeSignerId);
  if (signer) signer.verificationMethod = verificationMethodSelect.value;
});

signerNameInput.addEventListener('input', () => {
  const signer = getSigner(activeSignerId);
  if (signer) {
    signer.name = signerNameInput.value;
    renderSignersList();
  }
});

prefillCheckbox.addEventListener('change', () => {
  const signer = getSigner(activeSignerId);
  if (signer) signer.prefill = prefillCheckbox.checked;
});

btnClosePopover.addEventListener('click', closePopover);

btnDeleteSigner.addEventListener('click', () => {
  signers = signers.filter(s => s.id !== activeSignerId);
  closePopover();
});

// Clicking the "Sign Here" field on the canvas opens the Signers panel + the
// default signer's popover, mirroring how a real field-to-signer relationship
// would be surfaced.
signHereField.addEventListener('click', () => {
  openSettingsPanel('signers');
  if (signers.length) openPopover(signers[0].id);
});

// ---------------------------------------------------------------------------
// Title edit
// ---------------------------------------------------------------------------
document.getElementById('btn-edit-title').addEventListener('click', () => {
  const title = document.getElementById('doc-title');
  title.focus();
  document.getSelection().selectAllChildren(title);
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
renderSignersList();
