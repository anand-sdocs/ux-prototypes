/* =========================================================
   Template Migration — Import / Export S-Docs Templates
   UX prototype. All data and timings are mocked.
   ========================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------------------------------------------------------
   MOCK DATA — SDoc Template records
   --------------------------------------------------------- */
const EXT_ID_FIELDS = [
  'SDOC__Migration_Key__c',
  'SDOC__External_Template_Id__c',
  'Legacy_Template_Id__c'
];

const TEMPLATES = [
  { id:'a0T1', name:'Master Services Agreement',   format:'HTML',       status:'Active',   esign:'SSIGN',    by:'Anand Narasimhan', date:'8/29/2026 4:12 PM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'MSA-CORE-001', 'SDOC__External_Template_Id__c':'ext-8841', 'Legacy_Template_Id__c':'' } },
  { id:'a0T2', name:'Invoice Template',            format:'PDF-UPLOAD', status:'Active',   esign:null,       by:'Dana Whitfield',   date:'8/27/2026 10:03 AM', views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'INV-STD-014',  'SDOC__External_Template_Id__c':'ext-8842', 'Legacy_Template_Id__c':'LEG-221' } },
  { id:'a0T3', name:'NDA — Mutual',                format:'HTML',       status:'Active',   esign:'SSIGN',    by:'Anand Narasimhan', date:'8/26/2026 6:44 PM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'NDA-MUT-002',  'SDOC__External_Template_Id__c':'ext-8843', 'Legacy_Template_Id__c':'LEG-118' } },
  { id:'a0T4', name:'Quote Summary',               format:'HTML',       status:'Active',   esign:null,       by:'Priya Raman',      date:'8/22/2026 9:15 AM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'',             'SDOC__External_Template_Id__c':'ext-8844', 'Legacy_Template_Id__c':'' } },
  { id:'a0T5', name:'Onboarding Welcome Packet',   format:'DOCX',       status:'Active',   esign:'DOCUSIGN', by:'Dana Whitfield',   date:'8/19/2026 2:38 PM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'ONB-PKT-007',  'SDOC__External_Template_Id__c':'ext-8845', 'Legacy_Template_Id__c':'LEG-402' } },
  { id:'a0T6', name:'Statement of Work',           format:'HTML',       status:'Active',   esign:'SSIGN',    by:'Marco Ellis',      date:'8/18/2026 11:52 AM', views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'SOW-STD-003',  'SDOC__External_Template_Id__c':'ext-8846', 'Legacy_Template_Id__c':'LEG-090' } },
  { id:'a0T7', name:'Field Key Analysis',          format:'PDF-UPLOAD', status:'Active',   esign:'SSIGN',    by:'Anand Narasimhan', date:'8/14/2026 5:20 PM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'FKA-DBG-099',  'SDOC__External_Template_Id__c':'',        'Legacy_Template_Id__c':'' } },
  { id:'a0TC', name:'Annual Renewal Summary',      format:'PDF',        status:'Active',   esign:'SSIGN',    by:'Priya Raman',      date:'8/28/2026 1:05 PM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'RNW-SUM-018', 'SDOC__External_Template_Id__c':'ext-884C', 'Legacy_Template_Id__c':'' } },
  { id:'a0TD', name:'Quarterly Business Review Deck', format:'PPTX',     status:'Active',   esign:null,       by:'Marco Ellis',      date:'8/25/2026 4:47 PM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'QBR-DECK-006','SDOC__External_Template_Id__c':'ext-884D', 'Legacy_Template_Id__c':'LEG-512' } },
  { id:'a0TE', name:'Commission Statement',        format:'XLSX',       status:'Active',   esign:null,       by:'Dana Whitfield',   date:'8/21/2026 8:58 AM',  views:['recent','active','all'],
    ext:{ 'SDOC__Migration_Key__c':'CMS-STMT-012','SDOC__External_Template_Id__c':'ext-884E', 'Legacy_Template_Id__c':'LEG-644' } },
  { id:'a0T8', name:'Renewal Notice (2024)',       format:'HTML',       status:'Inactive', esign:null,       by:'Priya Raman',      date:'6/02/2026 8:41 AM',  views:['inactive','all'],
    ext:{ 'SDOC__Migration_Key__c':'RNW-2024-011', 'SDOC__External_Template_Id__c':'ext-8848', 'Legacy_Template_Id__c':'LEG-333' } },
  { id:'a0T9', name:'Legacy Purchase Order',       format:'XLSX',      status:'Inactive', esign:null,       by:'Marco Ellis',      date:'4/11/2026 1:07 PM',  views:['inactive','all'],
    ext:{ 'SDOC__Migration_Key__c':'',             'SDOC__External_Template_Id__c':'',        'Legacy_Template_Id__c':'LEG-005' } },
  { id:'a0TA', name:'Benefits Enrollment 2023',    format:'HTML',       status:'Archived', esign:'SSIGN',    by:'Dana Whitfield',   date:'11/30/2025 3:29 PM', views:['archived','all'],
    ext:{ 'SDOC__Migration_Key__c':'BEN-2023-001', 'SDOC__External_Template_Id__c':'ext-884A', 'Legacy_Template_Id__c':'LEG-777' } },
  { id:'a0TB', name:'Vendor Agreement (Deprecated)', format:'HTML',     status:'Archived', esign:null,       by:'Marco Ellis',      date:'9/08/2025 7:16 AM',  views:['archived','all'],
    ext:{ 'SDOC__Migration_Key__c':'VEN-DEP-004',  'SDOC__External_Template_Id__c':'ext-884B', 'Legacy_Template_Id__c':'' } }
];

const LIST_VIEW_LABEL = {
  recent:'Recently Viewed', active:'All Active Templates',
  inactive:'All Inactive Templates', archived:'Archived Templates', all:'All Templates'
};

/* ---------------------------------------------------------
   MOCK DATA — archive contents + import scenarios
   --------------------------------------------------------- */
const ARCHIVE = [
  { name:'Master Services Agreement', format:'HTML',       esign:'SSIGN',    existing:true,  ext:'MSA-CORE-001' },
  { name:'Invoice Template',          format:'PDF-UPLOAD', esign:null,       existing:true,  ext:'INV-STD-014'  },
  { name:'NDA — Mutual',              format:'HTML',       esign:'SSIGN',    existing:false, ext:'NDA-MUT-002'  },
  { name:'Quote Summary',             format:'HTML',       esign:null,       existing:true,  ext:'QTE-SUM-021'  },
  { name:'Onboarding Welcome Packet', format:'DOCX',       esign:'DOCUSIGN', existing:false, ext:'ONB-PKT-007'  }
];

const MISSING_FIELDS = {
  'Quote Summary'            : ['Opportunity.Renewal_Term__c','Opportunity.Discount_Tier__c','Account.Segment__c'],
  'Onboarding Welcome Packet': ['Contact.Preferred_Name__c','Account.CSM_Owner__r.Name'],
  'NDA — Mutual'             : ['Account.Legal_Entity_Name__c'],
  'Invoice Template'         : ['Account.Billing_Contact__r.Email','Opportunity.PO_Number__c'],
  'Master Services Agreement': ['Account.Legal_Entity_Name__c','Opportunity.Governing_Law__c']
};
const missingFields = name => MISSING_FIELDS[name] || ['Account.Segment__c','Opportunity.Renewal_Term__c'];

const ERR_TRANSIENT = {
  msg:'Could not save the template — the record was locked by another process.',
  code:'UNABLE_TO_LOCK_ROW', retryable:true
};
const ERR_HARD = {
  msg:'Template references a component that does not exist in this org: SDOC__Snippet__c "Legal Footer EU". Create the snippet, then re-export.',
  code:'INVALID_CROSS_REFERENCE_KEY', retryable:false
};
const ERR_HARD_2 = {
  msg:'The source org runs S-Docs 5.2. This org runs 4.9 — the template format is not backward compatible.',
  code:'PACKAGE_VERSION_MISMATCH', retryable:false
};

/* outcome: ok | warn | transient | hard */
const SCENARIOS = {
  clean:     { label:'All clean',      outcomes:['ok','ok','ok','ok','ok'] },
  warnings:  { label:'Field warnings', outcomes:['ok','ok','warn','warn','warn'] },
  transient: { label:'Transient + retry', outcomes:['ok','transient','ok','ok','transient'] },
  hard:      { label:'Hard error',     outcomes:['ok','ok','hard','ok','ok'] },
  mixed:     { label:'Mixed',          outcomes:['ok','warn','transient','hard2','warn'] }
};

/* ---------------------------------------------------------
   STATE
   --------------------------------------------------------- */
const state = {
  listView:'recent',
  extIdExport:'',
  selected:new Set(),
  speed:1,
  scenario:'mixed',
  archiveExtId:'SDOC__Migration_Key__c',
  importFile:null,
  matchMode:'name',
  extIdImport:'SDOC__Migration_Key__c',
  rows:[],
  busy:null,
  exportAbort:false,
  lastBlobUrl:null
};

const wait = ms => new Promise(r => setTimeout(r, ms * state.speed));

/* =========================================================
   SHELL — tab dropdown navigation
   ========================================================= */
function openDropdown(open){
  $('#nav-dropdown').hidden = !open;
  $('#nav-scrim').hidden = !open;
  $('#tab-caret').classList.toggle('open', open);
}
$('#tab-caret').addEventListener('click', e => {
  e.stopPropagation();
  openDropdown($('#nav-dropdown').hidden);
});
$('#nav-scrim').addEventListener('click', () => openDropdown(false));
$$('.nd-item').forEach(li => li.addEventListener('click', () => {
  if (li.dataset.nav === 'migration') gotoMigration();
  openDropdown(false);
}));

function gotoMigration(){
  $('#active-tab-label').textContent = 'Template Migration';
  $('#page-settings').hidden = true;
  $('#page-migration').hidden = false;
  $('.nd-item.is-current')?.classList.remove('is-current');
  $('#nd-migration').classList.add('is-current');
  window.scrollTo({ top:0 });
}

/* open the dropdown on load so the entry point is the first thing shown */
setTimeout(() => openDropdown(true), 350);

/* =========================================================
   BUSY LOCK — while a run is in flight, the page is read-only
   ========================================================= */
function setBusy(kind){
  state.busy = kind || null;
  const on = !!state.busy;

  $$('.tab').forEach(t => t.classList.toggle('is-disabled', on));

  /* export side */
  $('#listview').disabled = on;
  $('#extid-export').disabled = on;
  $('#check-all').disabled = on;
  $$('#export-tbody input[type=checkbox]').forEach(c => c.disabled = on);

  /* import side */
  $('#btn-new-import').disabled = on;
  $('#dropzone').classList.toggle('is-disabled', on);
  $$('input[name=matchmode]').forEach(r => r.disabled = on);
  $('#extid-import').disabled = on;
  $('#btn-import').disabled = on || !state.importFile;
  $$('#import-tbody [data-retry]').forEach(b => b.disabled = on);

  syncSelection();
}

/* =========================================================
   TABS
   ========================================================= */
$$('.tab').forEach(t => t.addEventListener('click', () => {
  if (state.busy) return;
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.tab-panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#panel-' + t.dataset.tab).classList.add('active');
}));

/* =========================================================
   EXPORT
   ========================================================= */
const esignCell = v => v
  ? `<span class="esign-yes" title="E-Signature enabled — ${v === 'DOCUSIGN' ? 'DocuSign' : 'S-Sign'}" aria-label="E-Signature enabled">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
         <polyline points="20 6 9 17 4 12"/>
       </svg></span>`
  : `<span class="esign-no">&mdash;</span>`;

const statusCell = s =>
  `<span class="badge badge-${s.toLowerCase()}">${s}</span>`;

function visibleTemplates(){
  return TEMPLATES
    .filter(t => t.views.includes(state.listView))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

function renderExportTable(){
  const rows = visibleTemplates();
  const tb = $('#export-tbody');
  const showExt = !!state.extIdExport;

  tb.innerHTML = rows.map(t => {
    const extVal = showExt ? (t.ext[state.extIdExport] || '') : null;
    const extTd = showExt
      ? `<td>${extVal
            ? `<span class="mono-sm">${extVal}</span>`
            : `<span class="mono-sm missing">Not set</span>`}</td>`
      : '';
    return `
    <tr data-id="${t.id}" class="${state.selected.has(t.id) ? 'selected' : ''}">
      <td class="col-check"><input type="checkbox" data-id="${t.id}" ${state.selected.has(t.id) ? 'checked' : ''} ${state.busy ? 'disabled' : ''}></td>
      <td><span class="tpl-name">${t.name}</span></td>
      <td><span class="badge badge-format">${t.format}</span></td>
      <td>${statusCell(t.status)}</td>
      <td>${esignCell(t.esign)}</td>
      ${extTd}
      <td>${t.by}</td>
      <td>${t.date}</td>
    </tr>`;
  }).join('');

  /* external Id column header, added/removed with the picker */
  const head = $('#export-table thead tr');
  const existing = head.querySelector('.th-extid');
  if (showExt && !existing){
    const th = document.createElement('th');
    th.className = 'th-extid col-extid';
    th.textContent = 'External Id';
    head.insertBefore(th, head.children[5]);
  } else if (showExt && existing){
    existing.textContent = 'External Id';
  } else if (!showExt && existing){
    existing.remove();
  }

  $('#export-empty').hidden = rows.length > 0;
  $('#lv-meta').textContent = `${rows.length} item${rows.length === 1 ? '' : 's'} · ${LIST_VIEW_LABEL[state.listView]}`;

  tb.querySelectorAll('input[type=checkbox]').forEach(cb =>
    cb.addEventListener('change', () => {
      cb.checked ? state.selected.add(cb.dataset.id) : state.selected.delete(cb.dataset.id);
      cb.closest('tr').classList.toggle('selected', cb.checked);
      syncSelection();
    }));

  syncSelection();
}

function syncSelection(){
  const rows = visibleTemplates();
  const n = rows.filter(t => state.selected.has(t.id)).length;
  $('#sel-count').textContent = `${n} item${n === 1 ? '' : 's'} selected`;
  $('#btn-export').disabled = n === 0 || !!state.busy;
  const all = $('#check-all');
  all.checked = n > 0 && n === rows.length;
  all.indeterminate = n > 0 && n < rows.length;
  renderExportBanners();
}

function renderExportBanners(){
  const box = $('#export-banners');
  box.innerHTML = '';
  if (!state.extIdExport) return;

  const chosen = visibleTemplates().filter(t => state.selected.has(t.id));
  const blanks = chosen.filter(t => !t.ext[state.extIdExport]);
  if (blanks.length){
    box.innerHTML = banner('warn',
      `<b>${blanks.length} selected template${blanks.length === 1 ? ' has' : 's have'} no value for ${state.extIdExport}.</b>
       They will still be exported, but the target org cannot upsert on that field &mdash; they will be matched by name instead.
       <ul>${blanks.map(t => `<li>${t.name}</li>`).join('')}</ul>`);
  }
}

function banner(kind, html){
  const ico = {
    info:'<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r=".6" fill="currentColor"/>',
    warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
    error:'<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    success:'<circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 16 9.5"/>'
  }[kind];
  return `<div class="banner banner-${kind}">
    <svg class="banner-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ico}</svg>
    <div class="banner-body">${html}</div></div>`;
}

$('#listview').addEventListener('change', e => {
  state.listView = e.target.value;
  state.selected.clear();
  renderExportTable();
});
$('#extid-export').addEventListener('change', e => {
  state.extIdExport = e.target.value;
  renderExportTable();
});
$('#check-all').addEventListener('change', e => {
  const rows = visibleTemplates();
  rows.forEach(t => e.target.checked ? state.selected.add(t.id) : state.selected.delete(t.id));
  renderExportTable();
});

/* ---------------- export run ---------------- */
$('#btn-export').addEventListener('click', runExport);
$('#btn-cancel-export').addEventListener('click', () => { state.exportAbort = true; });

async function runExport(){
  const chosen = visibleTemplates().filter(t => state.selected.has(t.id));
  state.exportAbort = false;
  setBusy('export');

  $('#export-result').hidden = true;
  $('#export-result').classList.remove('out');
  $('#export-log').innerHTML = '';
  setProgress(0, 'Preparing archive…');
  $('#exp-modal-sub').textContent =
    `Packaging ${chosen.length} template${chosen.length === 1 ? '' : 's'}` +
    (state.extIdExport ? ` with External Id ${state.extIdExport}.` : '.');
  $('#btn-cancel-export').disabled = false;
  $('#export-modal').hidden = false;

  await wait(500);
  logExport(`Creating archive manifest${state.extIdExport ? ` (external Id: ${state.extIdExport})` : ''}`, 'done');

  const total = chosen.length + 2;
  let step = 1;
  setProgress(step / total * 100, 'Packaging templates…');

  for (const t of chosen){
    if (state.exportAbort) return abortExport();
    setProgress(step / total * 100, `Packaging ${t.name}…`);
    await wait(560);
    const extNote = state.extIdExport
      ? (t.ext[state.extIdExport] ? ` · ${t.ext[state.extIdExport]}` : ' · no external Id')
      : '';
    logExport(`<b>${t.name}.zip</b> &nbsp;${t.format}${t.esign ? ' · e-signature' : ''}${extNote}`, 'done');
    step++;
  }

  if (state.exportAbort) return abortExport();
  setProgress(step / total * 100, 'Compressing archive…');
  await wait(700);
  step++;

  setProgress(step / total * 100, 'Uploading to Salesforce Files…');
  logExport('Compressed 1 archive of ' + chosen.length + ' inner ZIPs', 'done');
  await wait(850);

  setProgress(100, 'Done');
  logExport('Uploaded to Salesforce Files', 'done');
  await wait(400);

  $('#export-modal').hidden = true;
  finishExport(chosen);
}

function abortExport(){
  setBusy(null);
  $('#export-modal').hidden = true;
  toast('warn', 'Export cancelled', 'No archive was created.');
}

function setProgress(pct, label){
  $('#progress-fill').style.width = pct + '%';
  $('#progress-pct').textContent = Math.round(pct) + '%';
  $('#progress-label').innerHTML = pct >= 100
    ? `<span class="dot dot-success"></span> ${label}`
    : `<span class="spinner sm"></span> ${label}`;
}

function logExport(html, kind){
  const li = document.createElement('li');
  li.innerHTML = `<span class="dot dot-${kind === 'done' ? 'success' : 'pending'}"></span> ${html}`;
  $('#export-log').append(li);
  $('#export-log').scrollTop = $('#export-log').scrollHeight;
}

function finishExport(chosen){
  setBusy(null);
  const stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const fname = `SDocs_Templates_Export_${stamp}.zip`;
  const kb = (chosen.length * 148 + 96);

  $('#file-name').textContent = fname;
  $('#file-sub').textContent =
    `Uploaded to Salesforce Files · ZIP · ${kb} KB · ${chosen.length} inner archive${chosen.length === 1 ? '' : 's'}` +
    (state.extIdExport ? ` · External Id: ${state.extIdExport}` : ' · matched by name');
  $('#files-path-name').textContent = fname;
  $('#result-sub').textContent =
    `${chosen.length} template${chosen.length === 1 ? '' : 's'} packaged. The download has started, and a copy is in Salesforce Files.`;
  $('#export-result').hidden = false;

  downloadArchive(fname, chosen);
}

function downloadArchive(fname, chosen){
  const manifest =
`S-DOCS TEMPLATE EXPORT (prototype placeholder — not a real ZIP)
Generated: ${new Date().toString()}
External Id: ${state.extIdExport || '(none — target org will match by name)'}
List view: ${LIST_VIEW_LABEL[state.listView]}

Archive contents — one inner ZIP per template:
${chosen.map(t => `  /${t.name}.zip   ${t.format}${t.esign ? '  [e-signature: ' + t.esign + ']' : ''}${state.extIdExport ? '   ' + state.extIdExport + '=' + (t.ext[state.extIdExport] || '(blank)') : ''}`).join('\n')}
`;
  const blob = new Blob([manifest], { type:'application/zip' });
  if (state.lastBlobUrl) URL.revokeObjectURL(state.lastBlobUrl);
  state.lastBlobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = state.lastBlobUrl; a.download = fname;
  document.body.append(a); a.click(); a.remove();
}

$('#btn-result-close').addEventListener('click', () => {
  const el = $('#export-result');
  el.classList.add('out');
  setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 250);
});
$('#btn-download-again').addEventListener('click', () => {
  const chosen = visibleTemplates().filter(t => state.selected.has(t.id));
  downloadArchive($('#file-name').textContent, chosen);
});
$('#btn-copy-link').addEventListener('click', e => {
  const url = 'https://nosoftware-fun-8221-dev-ed.lightning.force.com/lightning/r/ContentDocument/069Hs00000K4mQz/view';
  navigator.clipboard?.writeText(url);
  const b = e.currentTarget;
  const html = b.innerHTML;
  b.textContent = 'Link copied';
  setTimeout(() => { b.innerHTML = html; }, 1600);
});

/* =========================================================
   IMPORT
   ========================================================= */
const dz = $('#dropzone');

$('#btn-browse').addEventListener('click', e => { e.stopPropagation(); $('#file-input').click(); });
dz.addEventListener('click', () => $('#file-input').click());
dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') $('#file-input').click(); });
['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => {
  e.preventDefault(); dz.classList.add('dragover');
}));
['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => {
  e.preventDefault(); dz.classList.remove('dragover');
}));
dz.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (f) acceptFile(f);
});
$('#file-input').addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) acceptFile(f);
});

function acceptFile(f){
  if (state.busy) return;
  state.importFile = { name:f.name, size:f.size };
  $('#chip-name').textContent = f.name;
  $('#chip-size').textContent =
    `${(f.size / 1024).toFixed(0)} KB · ZIP · ${ARCHIVE.length} inner archives` +
    (state.archiveExtId ? ` · exported with ${state.archiveExtId}` : ' · exported without an External Id');
  $('#file-chip').hidden = false;
  dz.classList.add('has-file');
  $('#btn-import').disabled = false;
  clearImportRun();
}

$('#chip-remove').addEventListener('click', resetImport);
$('#btn-new-import').addEventListener('click', () => {
  if (state.busy) return;
  resetImport();
  $('#panel-import').scrollIntoView({ behavior:'smooth', block:'start' });
});

function resetImport(){
  state.importFile = null;
  $('#file-chip').hidden = true;
  dz.classList.remove('has-file');
  $('#file-input').value = '';
  $('#btn-import').disabled = true;
  clearImportRun();
}
function clearImportRun(){
  collapseUpload(false);
  $('#identify-card').hidden = true;
  $('#import-results').hidden = true;
  $('#import-banners').innerHTML = '';
  $('#import-tbody').innerHTML = '';
  ['1','2','3'].forEach(n => $('#step-' + n).className = 'step');
  state.rows = [];
}

/* match-mode radios */
$$('input[name=matchmode]').forEach(r => r.addEventListener('change', () => {
  state.matchMode = r.value;
  $('#extid-import-wrap').hidden = state.matchMode !== 'extid';
}));
$('#extid-import').addEventListener('change', e => { state.extIdImport = e.target.value; });

/* ---------------- import run ---------------- */
$('#btn-import').addEventListener('click', runImport);

async function runImport(){
  clearImportRun();
  setBusy('import');
  collapseUpload(true);
  $('#identify-card').hidden = false;

  /* --- step 1: read archive --- */
  setStep(1, 'active');
  await wait(700);
  setStep(1, 'done');

  /* --- step 2: identify templates — rows appear as each inner ZIP is found --- */
  setStep(2, 'active');
  const outcomes = SCENARIOS[state.scenario].outcomes;
  state.rows = [];
  $('#import-results').hidden = false;
  setResultsSub(`Reading ${state.importFile.name}…`);
  await wait(300);

  for (let i = 0; i < ARCHIVE.length; i++){
    state.rows.push({ ...ARCHIVE[i], outcome:outcomes[i % outcomes.length], status:'found' });
    renderImportRows();
    await wait(230);
  }
  await wait(250);

  /* --- external Id validation: fail fast --- */
  if (state.matchMode === 'extid' && state.archiveExtId !== state.extIdImport){
    setStep(2, 'failed');
    state.rows.forEach(r => r.status = 'blocked');
    renderImportRows();
    const detail = state.archiveExtId
      ? `This archive was exported with <b>${state.archiveExtId}</b>.`
      : `This archive was exported <b>without an External Id</b>.`;
    $('#import-banners').innerHTML = banner('error',
      `<b>Import failed — the archive does not contain ${state.extIdImport}.</b><br>
       ${detail} An upsert cannot run without that field on every record.<br>
       Re-export from the source org with ${state.extIdImport} selected, or switch this import to
       <b>Match by Name</b>. <span class="err-code">EXTERNAL_ID_NOT_IN_ARCHIVE</span>`);
    setResultsSub(`${state.rows.length} templates found · nothing imported`);
    setBusy(null);
    toast('error', 'Import failed', `The archive does not contain ${state.extIdImport}. Nothing was imported.`);
    return;
  }
  setStep(2, 'done');

  /* --- step 3: import each template --- */
  setStep(3, 'active');
  setResultsSub(`${state.rows.length} templates found in ${state.importFile.name}` +
    (state.matchMode === 'extid' ? ` · upserting on ${state.extIdImport}` : ' · matching by name'));
  state.rows.forEach(r => r.status = 'pending');
  renderImportRows();

  for (let i = 0; i < state.rows.length; i++){
    state.rows[i].status = 'working';
    renderImportRows();
    await wait(700 + i * 90);
    state.rows[i].status = state.rows[i].outcome;
    if (state.rows[i].outcome === 'ok' || state.rows[i].outcome === 'warn'){
      state.rows[i].recordId = 'a0T' + (700 + i) + 'HsQAM';
    }
    renderImportRows();
    await wait(160);
  }

  const failed = state.rows.some(r => ['transient','hard','hard2'].includes(r.status));
  setStep(3, failed ? 'failed' : 'done');
  setBusy(null);
  renderImportSummary();
}

function setResultsSub(text){ $('#import-results-sub').textContent = text; }

function collapseUpload(collapse){
  $('#upload-body').hidden = collapse;
  $('#upload-summary').hidden = !collapse;
  if (collapse && state.importFile){
    $('#summary-name').textContent = state.importFile.name;
    $('#summary-sub').textContent =
      `${(state.importFile.size / 1024).toFixed(0)} KB · ${ARCHIVE.length} inner archives · ` +
      (state.matchMode === 'extid'
        ? `upsert on ${state.extIdImport}`
        : 'match by name (overwrite)');
  }
}

function setStep(n, cls){ $('#step-' + n).className = 'step ' + cls; }
function renderImportRows(){
  $('#import-tbody').innerHTML = state.rows.map((r, i) => {
    const linked = (r.status === 'ok' || r.status === 'warn');
    const nameCell = linked
      ? `<a class="tpl-name" href="#" onclick="return false" title="Open template record ${r.recordId}">${r.name}</a>`
      : `<span class="tpl-name plain">${r.name}</span>`;

    const extCell = state.matchMode === 'extid'
      ? `<span class="mono-sm">${r.ext}</span>` : '<span class="esign-no">&mdash;</span>';

    let status = '';
    switch (r.status){
      case 'found':
        status = '<span class="row-status st-pending"><span class="dot dot-pending"></span>Found in archive</span>'; break;
      case 'blocked':
        status = '<span class="row-status st-pending"><span class="dot dot-pending"></span>Not imported</span>'; break;
      case 'pending':
        status = '<span class="row-status st-pending"><span class="dot dot-pending"></span>Queued</span>'; break;
      case 'working':
        status = '<span class="row-status st-working"><span class="spinner"></span>Importing…</span>'; break;
      case 'ok':
        status = `<span class="row-status st-success"><span class="dot dot-success"></span>${verb(r)}</span>`; break;
      case 'warn': {
        const mf = missingFields(r.name);
        status = reasonCell('warn', `${verb(r)} with warnings`,
          `<b>References ${mf.length} field${mf.length === 1 ? '' : 's'} that don't exist in this org.</b>
           The template was imported; these merge fields render blank until the fields are created.
           <div class="field-list">${mf.map(f => `<span class="field-tag">${f}</span>`).join('')}</div>`);
        break;
      }
      case 'transient':
        status = reasonCell('error', 'Failed',
          `<b>${ERR_TRANSIENT.msg}</b><br>This usually clears on its own — retry the template.
           <div class="err-code">${ERR_TRANSIENT.code}</div>`);
        break;
      case 'hard':
      case 'hard2': {
        const e = r.status === 'hard' ? ERR_HARD : ERR_HARD_2;
        status = reasonCell('error', 'Failed',
          `<b>${e.msg}</b><div class="err-code">${e.code}</div>`);
        break;
      }
    }

    const action = (r.status === 'transient')
      ? `<button class="btn btn-neutral btn-xs" data-retry="${i}">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/></svg>
           Retry</button>`
      : linked ? `<a class="link-btn" href="#" onclick="return false">View</a>` : '';

    return `<tr>
        <td>${nameCell}</td>
        <td><span class="badge badge-format">${r.format}</span></td>
        <td>${esignCell(r.esign)}</td>
        <td class="col-extid">${extCell}</td>
        <td class="status-cell">${status}</td>
        <td class="col-action">${action}</td>
      </tr>`;
  }).join('');

  $$('#import-tbody [data-retry]').forEach(b =>
    b.addEventListener('click', () => retryRow(+b.dataset.retry)));

  $$('#import-tbody .reason-btn').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const wrap = b.closest('.reason-wrap');
      const wasOpen = wrap.classList.contains('pinned');
      $$('#import-tbody .reason-wrap.pinned').forEach(w => w.classList.remove('pinned'));
      wrap.classList.toggle('pinned', !wasOpen);
    }));
}

/* status cell with an icon that reveals the reason on hover or click */
function reasonCell(kind, label, html){
  const ico = kind === 'warn'
    ? '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="17" r=".7" fill="currentColor"/>'
    : '<circle cx="12" cy="12" r="9.2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
  return `<span class="reason-wrap">
      <button class="reason-btn reason-${kind}" aria-label="Show reason" aria-haspopup="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ico}</svg>
      </button>
      <span class="row-status st-${kind === 'warn' ? 'warn' : 'error'}">${label}</span>
      <span class="reason-pop reason-pop-${kind}">${html}</span>
    </span>`;
}

const verb = r => state.matchMode === 'extid'
  ? (r.existing ? 'Updated (upsert)' : 'Inserted (upsert)')
  : (r.existing ? 'Overwritten' : 'Created');

async function retryRow(i){
  setBusy('import');
  state.rows[i].status = 'working';
  renderImportRows();
  await wait(1100);
  state.rows[i].status = 'ok';
  state.rows[i].recordId = 'a0T' + (700 + i) + 'HsQAM';
  renderImportRows();
  const stillFailing = state.rows.some(r => ['transient','hard','hard2'].includes(r.status));
  setStep(3, stillFailing ? 'failed' : 'done');
  setBusy(null);
  renderImportSummary();
  toast('success', 'Retry succeeded', `${state.rows[i].name} imported.`);
}

function renderImportSummary(){
  const ok        = state.rows.filter(r => r.status === 'ok').length;
  const warned    = state.rows.filter(r => r.status === 'warn');
  const failed    = state.rows.filter(r => ['transient','hard','hard2'].includes(r.status));
  const retryable = state.rows.filter(r => r.status === 'transient').length;
  const changed   = state.rows.filter(r => (r.status === 'ok' || r.status === 'warn') && r.existing);
  const imported  = ok + warned.length;
  const fieldCount = new Set(warned.flatMap(r => missingFields(r.name))).size;

  const notes = [];
  if (changed.length) notes.push(
    `${changed.length} existing template${changed.length === 1 ? ' was' : 's were'} ` +
    `${state.matchMode === 'extid' ? `updated in place (matched on ${state.extIdImport})` : 'overwritten (matched by name)'} — previous versions are kept in version history.`);
  if (warned.length) notes.push(
    `${fieldCount} referenced field${fieldCount === 1 ? '' : 's'} do not exist in this org.`);
  if (failed.length) notes.push(
    retryable ? `${retryable} failure${retryable === 1 ? ' looks' : 's look'} transient and can be retried.`
              : `Failures need a change in the source or target org before re-importing.`);
  if (warned.length || failed.length) notes.push('Hover a status icon for the reason.');

  const headline = failed.length === 0
    ? `Import complete — ${imported} of ${state.rows.length} templates imported${warned.length ? `, ${warned.length} with warnings` : ''}.`
    : `Import finished — ${imported} of ${state.rows.length} imported, ${failed.length} failed.`;

  const kind = failed.length ? 'error' : warned.length ? 'warn' : 'success';
  $('#import-banners').innerHTML = banner(kind, `<b>${headline}</b> ${notes.join(' ')}`);

  if (failed.length === 0)
    toast('success', 'Import complete',
      `${imported} template${imported === 1 ? '' : 's'} imported${warned.length ? `, ${warned.length} with warnings` : ''}.`);
  else if (imported > 0)
    toast('warn', 'Import finished with errors', `${imported} imported, ${failed.length} failed.`);
  else
    toast('error', 'Import failed', 'No templates were imported.');
}

/* =========================================================
   TOASTS
   ========================================================= */
function toast(kind, title, body){
  const theme = kind === 'success' ? 'success' : kind === 'warn' ? 'warning' : 'error';
  const ico = kind === 'success'
    ? '<polyline points="20 6 9 17 4 12"/>'
    : kind === 'warn'
      ? '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="17" r=".7" fill="currentColor"/>'
      : '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';

  const el = document.createElement('div');
  el.className = 'toast toast-' + theme;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <svg class="toast-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${ico}</svg>
    <p class="toast-body"><b>${title}</b> ${body}</p>
    <button class="toast-close" aria-label="Close">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
    </button>`;
  const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
  el.querySelector('.toast-close').addEventListener('click', dismiss);
  $('#toast-region').append(el);
  setTimeout(dismiss, 6000);
}

/* =========================================================
   DEMO CONTROLS
   ========================================================= */
$('#scenario-options').innerHTML = Object.entries(SCENARIOS)
  .map(([k, v]) => `<button class="demo-chip ${k === state.scenario ? 'active' : ''}" data-scenario="${k}">${v.label}</button>`)
  .join('');

$('#demo-bar').addEventListener('click', e => {
  const chip = e.target.closest('.demo-chip');
  if (!chip) return;
  const group = chip.parentElement;
  group.querySelectorAll('.demo-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  if (chip.dataset.scenario) state.scenario = chip.dataset.scenario;
  if (chip.dataset.speed) state.speed = +chip.dataset.speed;
  if (chip.dataset.archiveExtid !== undefined){
    state.archiveExtId = chip.dataset.archiveExtid;
    if (state.importFile){
      $('#chip-size').textContent =
        `${(state.importFile.size / 1024).toFixed(0)} KB · ZIP · ${ARCHIVE.length} inner archives` +
        (state.archiveExtId ? ` · exported with ${state.archiveExtId}` : ' · exported without an External Id');
    }
  }
});
$('#demo-toggle').addEventListener('click', () => $('#demo-bar').classList.toggle('collapsed'));
$('#demo-reset').addEventListener('click', () => location.reload());

/* =========================================================
   INIT
   ========================================================= */
renderExportTable();
