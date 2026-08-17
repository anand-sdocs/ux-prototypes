// Industry agent templates — browse prebuilt agents by industry, and (with
// the right access) run a short activation wizard: connect the specific
// data sources a template needs, confirm downstream Notify/Save targets,
// then activate. Everything is in-memory for this session only — no
// backend, and no state is shared with the other prototypes.

let accessLevel = 'standard'; // 'standard' | 'admin'
let activeIndustry = 'all';
const connectedConnectors = {}; // connector id -> true, session-only

let activatedAgents = SEEDED_ACTIVATED.map(a => ({ ...a }));

let wizardTemplate = null;
let wizardStep = 0; // 0 overview, 1 connect, 2 downstream, 3 review, 4 success
let wizardDownstream = {}; // taskIndex -> { recipient, platform }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function industryFor(id) {
  return INDUSTRIES.find(i => i.id === id);
}

// ---------------------------------------------------------------
// Access banner + scenario toggle
// ---------------------------------------------------------------

function renderAccessBanner() {
  const el = document.getElementById('access-banner');
  el.className = `access-banner ${accessLevel === 'admin' ? 'admin' : ''}`;
  el.innerHTML = accessLevel === 'admin'
    ? `<div class="access-text"><strong>Admin / creator access</strong>You can activate a template — connect its data sources and confirm where results go.</div>`
    : `<div class="access-text"><strong>Standard user</strong>You can browse every template and see exactly what it does. Activating one requires Agent Building access from your admin.</div>`;
}

document.getElementById('access-select').addEventListener('change', (e) => {
  accessLevel = e.target.value;
  renderAccessBanner();
  renderTemplateGrid();
});

// ---------------------------------------------------------------
// Industry tabs
// ---------------------------------------------------------------

function renderIndustryTabs() {
  const tabs = [{ id: 'all', name: 'All industries', color: '#5e6670' }, ...INDUSTRIES];
  document.getElementById('industry-tabs').innerHTML = tabs.map(t => `
    <button class="industry-tab ${activeIndustry === t.id ? 'active' : ''}" data-industry="${t.id}">
      <span class="itab-dot" style="background:${t.color}"></span>${escapeHtml(t.name)}
    </button>
  `).join('');
  document.querySelectorAll('.industry-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeIndustry = btn.dataset.industry;
      renderIndustryTabs();
      renderTemplateGrid();
    });
  });
}

// ---------------------------------------------------------------
// Template grid
// ---------------------------------------------------------------

function renderTemplateGrid() {
  const list = activeIndustry === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.industry === activeIndustry);
  document.getElementById('template-grid').innerHTML = list.map(templateCardHtml).join('');

  document.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', () => openWizard(btn.dataset.activate, true));
  });
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => openWizard(btn.dataset.view, false));
  });
}

function templateCardHtml(t) {
  const ind = industryFor(t.industry);
  const isActivated = activatedAgents.some(a => a.templateId === t.id);
  return `
    <div class="template-card">
      <div class="template-card-head">
        <span class="industry-badge" style="color:${ind.color};background:${ind.color}1a;">${escapeHtml(ind.name)}</span>
        ${isActivated ? `<span class="status-pill">Active</span>` : ''}
      </div>
      <h3>${escapeHtml(t.name)}</h3>
      <p class="tagline">${escapeHtml(t.tagline)}</p>
      <div class="compliance-tags">${t.complianceTags.map(c => `<span class="compliance-tag">${escapeHtml(c)}</span>`).join('')}</div>
      <div class="task-chip-row">${t.tasks.map(task => `<span class="task-chip ${task.type}">${TASK_TYPE_META[task.type].label}</span>`).join('')}</div>
      <div class="template-card-foot">
        ${accessLevel === 'admin'
          ? `<button class="btn btn-primary" data-activate="${t.id}">${isActivated ? 'Reconfigure' : 'Activate'}</button>`
          : `<button class="btn btn-outline" data-view="${t.id}">View details</button>`}
      </div>
      ${accessLevel !== 'admin' ? `<div class="locked-hint" style="margin-top:8px;">Activating needs Agent Building access</div>` : ''}
    </div>
  `;
}

// ---------------------------------------------------------------
// Activated list
// ---------------------------------------------------------------

function renderActivatedList() {
  document.getElementById('activated-count').textContent = `${activatedAgents.length} agent${activatedAgents.length === 1 ? '' : 's'}`;
  const list = document.getElementById('activated-list');
  if (!activatedAgents.length) {
    list.innerHTML = `<div class="empty-state">Nothing activated yet. Turn on a template above to see it here.</div>`;
    return;
  }
  list.innerHTML = activatedAgents.map(a => {
    const t = TEMPLATES.find(tt => tt.id === a.templateId);
    const ind = industryFor(t.industry);
    return `
      <div class="list-row">
        <span class="industry-badge" style="color:${ind.color};background:${ind.color}1a;">${escapeHtml(ind.name)}</span>
        <div class="list-main">
          <div class="list-title">${escapeHtml(t.name)}</div>
          <div class="list-sub">Activated by ${escapeHtml(a.activatedBy)} &middot; ${escapeHtml(a.activatedAt)}</div>
        </div>
        <span class="status-pill">Active</span>
      </div>
    `;
  }).join('');
}

// ---------------------------------------------------------------
// Activation wizard
// ---------------------------------------------------------------

function openWizard(templateId, canActivate) {
  wizardTemplate = TEMPLATES.find(t => t.id === templateId);
  wizardStep = 0;
  wizardDownstream = {};
  wizardTemplate.tasks.forEach((task, i) => {
    if (task.editable) wizardDownstream[i] = { ...task.editable };
  });
  renderWizard(canActivate);
  document.getElementById('wizard-overlay').classList.add('show');
}

function closeWizard() {
  document.getElementById('wizard-overlay').classList.remove('show');
  wizardTemplate = null;
}

function renderWizard(canActivate) {
  const panel = document.getElementById('wizard-panel');
  if (!canActivate) {
    panel.innerHTML = wizardOverviewHtml(true);
    bindWizardClose();
    document.getElementById('wiz-request')?.addEventListener('click', () => {
      showToast('Activation request sent to your admin.');
      closeWizard();
    });
    return;
  }
  if (wizardStep === 0) panel.innerHTML = wizardOverviewHtml(false);
  else if (wizardStep === 1) panel.innerHTML = wizardConnectHtml();
  else if (wizardStep === 2) panel.innerHTML = wizardDownstreamHtml();
  else if (wizardStep === 3) panel.innerHTML = wizardReviewHtml();
  else panel.innerHTML = wizardSuccessHtml();
  bindWizardClose();
  bindWizardStepEvents(canActivate);
}

function bindWizardClose() {
  document.getElementById('wiz-close')?.addEventListener('click', closeWizard);
}

function miniStepper(activeIndex) {
  const steps = ['Overview', 'Connect sources', 'Downstream actions', 'Review & activate'];
  return `
    <div class="subflow-mini-stepper">${steps.map((s, i) => `<div class="subflow-mini-step ${i < activeIndex ? 'done' : ''} ${i === activeIndex ? 'active' : ''}"></div>`).join('')}</div>
    <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:16px;">${escapeHtml(steps[activeIndex])}</div>
  `;
}

function wizardOverviewHtml(readOnly) {
  const t = wizardTemplate;
  const ind = industryFor(t.industry);
  return `
    <div class="subflow-header">
      <h3>${escapeHtml(t.name)}</h3>
      <button class="icon-btn" id="wiz-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      ${!readOnly ? miniStepper(0) : ''}
      <span class="industry-badge" style="color:${ind.color};background:${ind.color}1a;">${escapeHtml(ind.name)}</span>
      <p class="field-hint" style="margin:10px 0 16px;">${escapeHtml(t.tagline)}</p>
      <div class="compliance-tags">${t.complianceTags.map(c => `<span class="compliance-tag">${escapeHtml(c)}</span>`).join('')}</div>
      <div class="wizard-task-list">
        ${t.tasks.map(task => `
          <div class="wizard-task-row">
            <span class="task-chip ${task.type}">${TASK_TYPE_META[task.type].label}</span>
            <span class="wt-summary">${task.summary}</span>
          </div>
        `).join('')}
      </div>
      ${t.skillName ? `<div class="skill-link-note">Analyze step uses <strong>${escapeHtml(t.skillName)}</strong> (${t.skillCategories.join(', ')}) &mdash; <a href="../sdocs-agent-builder/skills.html" target="_blank" rel="noopener">preview it in the Skills library &rarr;</a></div>` : ''}
      <div class="field-hint" style="margin-top:14px;">Suggested trigger: <strong>${TRIGGER_META[t.suggestedTrigger].label}</strong></div>
    </div>
    <div class="subflow-footer">
      ${readOnly
        ? `<span></span><button class="btn btn-primary" id="wiz-request">Request activation from admin</button>`
        : `<button class="btn btn-outline" id="wiz-cancel">Cancel</button><button class="btn btn-primary" id="wiz-next">Next</button>`}
    </div>
  `;
}

function wizardConnectHtml() {
  const t = wizardTemplate;
  const allConnected = t.connectorsNeeded.every(id => connectedConnectors[id]);
  return `
    <div class="subflow-header">
      <h3>${escapeHtml(t.name)}</h3>
      <button class="icon-btn" id="wiz-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      ${miniStepper(1)}
      <p class="field-hint" style="margin-bottom:6px;">This template needs access to the systems below. Connect as yourself &mdash; only systems your admin has allowed will let you continue.</p>
      <div class="connector-need-list" id="connector-need-list">
        ${t.connectorsNeeded.map(id => connectorRowHtml(id)).join('')}
      </div>
    </div>
    <div class="subflow-footer">
      <button class="btn btn-outline" id="wiz-back">Back</button>
      <button class="btn btn-primary" id="wiz-next" ${allConnected ? '' : 'disabled'}>Next</button>
    </div>
  `;
}

function connectorRowHtml(id) {
  const c = CONNECTOR_META[id];
  const connected = !!connectedConnectors[id];
  return `
    <div class="connector-need-row" data-connector-row="${id}">
      <span class="connector-icon-sm" style="background:${c.color}">${c.initials}</span>
      <span class="connector-need-name">${escapeHtml(c.name)}</span>
      ${connected
        ? `<span class="connector-connected-badge">&#10003; Connected as you</span>`
        : `<button class="btn btn-outline btn-sm" data-connect="${id}">Connect</button>`}
    </div>
  `;
}

function wizardDownstreamHtml() {
  const t = wizardTemplate;
  const rows = t.tasks.map((task, i) => {
    if (!task.editable) return '';
    if (task.type === 'notify') {
      return `
        <div class="downstream-row">
          <label>Notify &mdash; ${escapeHtml(task.editable.platform === 'slack' ? 'Slack channel' : 'Email recipient')}</label>
          <input type="text" class="text-input" data-downstream="${i}" data-field="recipient" value="${escapeHtml(wizardDownstream[i].recipient)}">
        </div>
      `;
    }
    return `
      <div class="downstream-row">
        <label>Save &mdash; destination</label>
        <select class="text-input" data-downstream="${i}" data-field="platform">
          ${Object.keys(CONNECTOR_META).filter(id => ['salesforce', 'servicenow', 'sheets', 'gdrive'].includes(id)).map(id => `<option value="${id}" ${wizardDownstream[i].platform === id ? 'selected' : ''}>${CONNECTOR_META[id].name}</option>`).join('')}
        </select>
      </div>
    `;
  }).join('');
  return `
    <div class="subflow-header">
      <h3>${escapeHtml(t.name)}</h3>
      <button class="icon-btn" id="wiz-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      ${miniStepper(2)}
      <p class="field-hint" style="margin-bottom:16px;">Confirm where this agent notifies and saves results. Defaults are pre-filled &mdash; edit anything before activating.</p>
      ${rows || '<p class="field-hint">This template has no downstream Notify or Save targets to configure.</p>'}
    </div>
    <div class="subflow-footer">
      <button class="btn btn-outline" id="wiz-back">Back</button>
      <button class="btn btn-primary" id="wiz-next">Next</button>
    </div>
  `;
}

function wizardReviewHtml() {
  const t = wizardTemplate;
  const ind = industryFor(t.industry);
  return `
    <div class="subflow-header">
      <h3>${escapeHtml(t.name)}</h3>
      <button class="icon-btn" id="wiz-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      ${miniStepper(3)}
      <div class="review-summary-line"><span>Industry</span><span>${escapeHtml(ind.name)}</span></div>
      <div class="review-summary-line"><span>Trigger</span><span>${TRIGGER_META[t.suggestedTrigger].label}</span></div>
      <div class="review-summary-line"><span>Connected systems</span><span>${t.connectorsNeeded.map(id => CONNECTOR_META[id].name).join(', ')}</span></div>
      ${t.tasks.map((task, i) => task.editable ? `
        <div class="review-summary-line"><span>${TASK_TYPE_META[task.type].label}</span><span>${task.type === 'notify' ? escapeHtml(wizardDownstream[i].recipient) : CONNECTOR_META[wizardDownstream[i].platform].name}</span></div>
      ` : '').join('')}
      <p class="field-hint" style="margin-top:16px;">Activating creates this agent in an Active state, ready to run on its trigger &mdash; nothing here calls a real system.</p>
    </div>
    <div class="subflow-footer">
      <button class="btn btn-outline" id="wiz-back">Back</button>
      <button class="btn btn-primary" id="wiz-activate">Activate agent</button>
    </div>
  `;
}

function wizardSuccessHtml() {
  const t = wizardTemplate;
  return `
    <div class="subflow-header">
      <h3>${escapeHtml(t.name)}</h3>
      <button class="icon-btn" id="wiz-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      <div class="activation-success">
        <div class="activation-success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h4>${escapeHtml(t.name)} is now active</h4>
        <p>It will run on its suggested trigger (${TRIGGER_META[t.suggestedTrigger].label}) and show up in your agent list, same as any manually built agent.</p>
      </div>
    </div>
    <div class="subflow-footer">
      <span></span>
      <button class="btn btn-primary" id="wiz-done">Done</button>
    </div>
  `;
}

function bindWizardStepEvents(canActivate) {
  if (!canActivate) return;
  document.getElementById('wiz-cancel')?.addEventListener('click', closeWizard);
  document.getElementById('wiz-back')?.addEventListener('click', () => { wizardStep -= 1; renderWizard(true); });
  document.getElementById('wiz-next')?.addEventListener('click', () => {
    if (wizardStep === 2) readDownstreamFromDom();
    wizardStep += 1;
    renderWizard(true);
  });
  document.getElementById('wiz-done')?.addEventListener('click', closeWizard);

  document.querySelectorAll('[data-connect]').forEach(btn => {
    btn.addEventListener('click', () => openConnectorModal(btn.dataset.connect));
  });

  document.getElementById('wiz-activate')?.addEventListener('click', () => {
    activatedAgents = activatedAgents.filter(a => a.templateId !== wizardTemplate.id);
    activatedAgents.push({ templateId: wizardTemplate.id, activatedBy: 'You', activatedAt: 'Just now' });
    renderTemplateGrid();
    renderActivatedList();
    wizardStep = 4;
    renderWizard(true);
  });
}

function readDownstreamFromDom() {
  document.querySelectorAll('[data-downstream]').forEach(input => {
    const i = Number(input.dataset.downstream);
    const field = input.dataset.field;
    wizardDownstream[i][field] = input.value;
  });
}

// ---------------------------------------------------------------
// Connector connect modal
// ---------------------------------------------------------------

let pendingConnectorId = null;

function openConnectorModal(id) {
  const c = CONNECTOR_META[id];
  pendingConnectorId = id;
  document.getElementById('connector-modal-icon').style.background = c.color;
  document.getElementById('connector-modal-icon').textContent = c.initials;
  document.getElementById('connector-modal-title').textContent = `Connect to ${c.name}`;
  document.getElementById('connector-modal-name').textContent = c.name;
  document.getElementById('connector-modal').classList.add('show');
}
document.getElementById('connector-modal-cancel').addEventListener('click', () => {
  document.getElementById('connector-modal').classList.remove('show');
  pendingConnectorId = null;
});
document.getElementById('connector-modal-confirm').addEventListener('click', () => {
  if (pendingConnectorId) connectedConnectors[pendingConnectorId] = true;
  document.getElementById('connector-modal').classList.remove('show');
  pendingConnectorId = null;
  renderWizard(true);
});

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------

const requestedIndustry = new URLSearchParams(window.location.search).get('industry');
if (requestedIndustry && INDUSTRIES.some(i => i.id === requestedIndustry)) {
  activeIndustry = requestedIndustry;
}

document.getElementById('access-select').value = accessLevel;
renderAccessBanner();
renderIndustryTabs();
renderTemplateGrid();
renderActivatedList();
