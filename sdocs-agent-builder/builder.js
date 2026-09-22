// Agent-builder wizard — NL-led or manual, 6 steps + review. Everything is simulated/mock.

function defaultTriggers() {
  return {
    manual: { enabled: true },
    slack: { enabled: false, channelPattern: '', invocationPhrase: '' },
    email: { enabled: false, inboxAddress: '', filterType: 'subject_contains', filterValue: '' },
    webhook: { enabled: false, url: '' },
    schedule: { enabled: false, frequency: 'Weekly', day: 'Monday', time: '09:00' },
  };
}

const state = {
  fromPrompt: false,
  name: 'Quarterly Portfolio Review Agent',
  role: "Drafts quarterly investment portfolio reviews for wealth-management clients — pulls holdings, fees, and performance from the portfolio system and custodian feed, then generates a chart-rich review document.",
  tone: 'Professional',
  voice: 'First person (I/we)',
  caution: 1,
  guardrailNotes: '',
  model: LLM_MODELS.find(m => m.default)?.id || LLM_MODELS[0].id,
  connectors: {}, // id -> true
  customConnectors: [], // [{ id, name, apiUrl }] — "Custom data source" entries added from the Data sources step
  triggers: defaultTriggers(),
  tasks: [], // { id, type, summary, config }
};

let currentStep = 0; // 0 = NL entry, 1-6 = wizard steps
let editingTaskId = null;
let taskIdCounter = 1;

// Readable by other scripts on the page (the canvas builder reads connections).
window.wizardState = state;

function slugify(name) {
  return (name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
}

const CAUTION_LABELS = ['Autonomous', 'Balanced', 'Cautious'];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function connectorIconInner(c) {
  return c.logo ? `<img src="${c.logo}" alt="" class="connector-logo-img">` : escapeHtml(c.initials);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------

function goToStep(step) {
  if (!document.getElementById(`panel-${step}`)) return; // no wizard chrome on this page (e.g. the AI conversational builder)
  currentStep = step;
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${step}`).classList.add('active');

  document.querySelectorAll('.step').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.remove('current', 'completed');
    if (s < step) el.classList.add('completed');
    if (s === step) el.classList.add('current');
  });

  const stepper = document.getElementById('stepper');
  const backBtn = document.getElementById('btn-back');
  const nextBtn = document.getElementById('btn-next');

  if (step === 0) {
    stepper.style.visibility = 'hidden';
    backBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  } else {
    stepper.style.visibility = 'visible';
    backBtn.style.display = 'inline-flex';
    nextBtn.style.display = 'inline-flex';
    backBtn.disabled = false;
    nextBtn.textContent = step === 7 ? 'Create agent' : 'Next';
  }

  if (step === 1) renderStep1();
  if (step === 2) renderStep2();
  if (step === 3) renderModelStep();
  if (step === 4) renderConnectors();
  if (step === 5) renderTriggers();
  if (step === 6) renderTaskList();
  if (step === 7) renderReview();
}

document.getElementById('btn-back')?.addEventListener('click', () => {
  if (currentStep > 1) goToStep(currentStep - 1);
});
document.getElementById('btn-next')?.addEventListener('click', () => {
  if (currentStep === 1) { state.name = document.getElementById('agent-name').value.trim(); state.role = document.getElementById('agent-role').value.trim(); }
  if (currentStep === 2) { state.guardrailNotes = document.getElementById('guardrail-notes').value.trim(); }
  if (currentStep === 7) { createAgent(); return; }
  goToStep(currentStep + 1);
});
document.getElementById('btn-exit')?.addEventListener('click', () => { window.location.href = 'index.html'; });

function createAgent() {
  showToast(`"${state.name || 'New agent'}" created. It will appear on your home page.`);
  setTimeout(() => { window.location.href = 'index.html'; }, 1400);
}

function aiPrefillBanner(step) {
  const el = document.getElementById(`ai-prefill-banner-${step}`);
  if (!el) return;
  el.innerHTML = state.fromPrompt
    ? `<div class="ai-prefill-banner">✨ <span><strong>Drafted from your description.</strong> Review and edit anything below.</span></div>`
    : '';
}

// ---------------------------------------------------------------
// NL entry (step 0)
// ---------------------------------------------------------------

document.querySelectorAll('.nl-example-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('nl-prompt').value = chip.textContent;
  });
});

document.getElementById('btn-nl-skip')?.addEventListener('click', () => {
  state.fromPrompt = false;
  goToStep(1);
});

document.getElementById('btn-nl-generate')?.addEventListener('click', () => {
  const prompt = document.getElementById('nl-prompt').value.trim();
  if (!prompt) { showToast('Describe the agent first, or build it manually.'); return; }
  document.getElementById('nl-generating').style.display = 'flex';
  document.getElementById('btn-nl-generate').disabled = true;
  setTimeout(() => {
    draftFromPrompt(prompt);
    document.getElementById('nl-generating').style.display = 'none';
    document.getElementById('btn-nl-generate').disabled = false;
    state.fromPrompt = true;
    goToStep(1);
  }, 900);
});

function draftFromPrompt(prompt) {
  const p = prompt.toLowerCase();

  const words = prompt.replace(/[.,]/g, '').split(' ').filter(Boolean);
  state.name = words.slice(0, 4).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') + ' Agent';
  state.role = prompt;
  state.tone = 'Professional';
  state.voice = 'First person (I/we)';
  state.caution = 1;
  state.guardrailNotes = '';
  state.connectors = {};
  state.triggers = defaultTriggers();
  state.tasks = [];

  const connectorMap = {
    slack: 'slack', gmail: 'email', email: 'email', outlook: 'email',
    salesforce: 'salesforce', hubspot: 'hubspot', servicenow: 'servicenow',
    drive: 'gdrive', sheets: 'sheets', sharepoint: 'sharepoint', crm: 'salesforce',
  };
  Object.keys(connectorMap).forEach(kw => {
    if (p.includes(kw)) state.connectors[connectorMap[kw]] = true;
  });

  if (p.includes('extract')) {
    state.tasks.push(makeTask('extract', { schema: EXTRACT_SAMPLE_SCHEMA.slice(0, 4), fileName: 'sample_document.pdf' }));
  }
  if (p.includes('generate') || p.includes('draft') || p.includes('proposal') || p.includes('scorecard') || p.includes('summary') || p.includes('statement of work') || p.includes('immigration')) {
    const templateKeywords = { proposal: 'sales_proposal', scorecard: 'scorecard', investment: 'investment_summary', 'statement of work': 'sow', sow: 'sow', immigration: 'i140', 'i-140': 'i140' };
    const matchedId = Object.keys(templateKeywords).find(kw => p.includes(kw));
    const template = DOCUMENT_TEMPLATES.find(t => t.id === (templateKeywords[matchedId])) || DOCUMENT_TEMPLATES[0];
    const dataElements = {};
    template.dataElements.forEach(el => { dataElements[el.key] = { included: true, prompt: el.suggestedPrompt }; });
    state.tasks.push(makeTask('generate', { templateId: template.id, dataElements, sourcePriority: computeDefaultSourcePriority() }));
  }
  if (p.includes('playbook') || p.includes('threshold') || p.includes('check') || p.includes('flag') || p.includes('review') || p.includes('criteria')) {
    state.tasks.push(makeTask('analyze', { mode: 'playbook', playbook: [], skillIds: [] }));
  }
  if (p.includes('save') || p.includes('file') || p.includes('crm') || p.includes('salesforce') || p.includes('sheet') || p.includes('spreadsheet')) {
    const platform = DESTINATION_PLATFORMS.find(pl => p.includes(pl.id)) || DESTINATION_PLATFORMS[0];
    state.tasks.push(makeTask('save', { platformId: platform.id, mappings: {} }));
  }
  if (p.includes('notify') || p.includes('post') || p.includes('alert') || p.includes('slack') || p.includes('send')) {
    const channelId = p.includes('slack') ? 'slack' : (p.includes('email') ? 'email' : 'slack');
    state.tasks.push(makeTask('notify', { channelId, recipient: NOTIFY_RECIPIENTS[channelId][0], message: '' }));
  }

  if (state.tasks.length === 0) {
    state.tasks.push(makeTask('extract', { schema: EXTRACT_SAMPLE_SCHEMA.slice(0, 4), fileName: 'sample_document.pdf' }));
  }

  // Manual is always on; infer any additional triggers from the same prompt.
  if (p.includes('monitor slack') || p.includes('watch slack') || p.includes('from slack')) {
    state.triggers.slack.enabled = true;
    ensureTriggerDefaults('slack');
  }
  if ((p.includes('email') || p.includes('inbox')) && (p.includes('incoming') || p.includes('receiv'))) {
    state.triggers.email.enabled = true;
    ensureTriggerDefaults('email');
  }
  if (p.includes('webhook')) {
    state.triggers.webhook.enabled = true;
    ensureTriggerDefaults('webhook');
  }
  const weekdayMatch = WEEKDAYS.find(d => p.includes(d.toLowerCase()));
  if (p.includes('daily') || p.includes('every day')) {
    state.triggers.schedule.enabled = true;
    state.triggers.schedule.frequency = 'Daily';
  } else if (weekdayMatch || p.includes('weekly') || p.includes('every week')) {
    state.triggers.schedule.enabled = true;
    state.triggers.schedule.frequency = 'Weekly';
    state.triggers.schedule.day = weekdayMatch || 'Monday';
  } else if (p.includes('monthly') || p.includes('every month')) {
    state.triggers.schedule.enabled = true;
    state.triggers.schedule.frequency = 'Monthly';
  }
}

// ---------------------------------------------------------------
// Step 1: Name & role
// ---------------------------------------------------------------

function renderStep1() {
  aiPrefillBanner(1);
  document.getElementById('agent-name').value = state.name;
  document.getElementById('agent-role').value = state.role;
}
document.getElementById('agent-name')?.addEventListener('input', e => state.name = e.target.value);
document.getElementById('agent-role')?.addEventListener('input', e => state.role = e.target.value);

// ---------------------------------------------------------------
// Step 2: Guardrails
// ---------------------------------------------------------------

function renderStep2() {
  aiPrefillBanner(2);
  document.querySelectorAll('#tone-select .chip-option').forEach(c => c.classList.toggle('selected', c.dataset.value === state.tone));
  document.querySelectorAll('#voice-select .chip-option').forEach(c => c.classList.toggle('selected', c.dataset.value === state.voice));
  document.getElementById('caution-slider').value = state.caution;
  document.getElementById('caution-value').textContent = CAUTION_LABELS[state.caution];
  document.getElementById('guardrail-notes').value = state.guardrailNotes;
}
document.querySelectorAll('#tone-select .chip-option').forEach(chip => {
  chip.addEventListener('click', () => { state.tone = chip.dataset.value; renderStep2(); });
});
document.querySelectorAll('#voice-select .chip-option').forEach(chip => {
  chip.addEventListener('click', () => { state.voice = chip.dataset.value; renderStep2(); });
});
document.getElementById('caution-slider')?.addEventListener('input', e => {
  state.caution = Number(e.target.value);
  document.getElementById('caution-value').textContent = CAUTION_LABELS[state.caution];
});
document.getElementById('guardrail-notes')?.addEventListener('input', e => state.guardrailNotes = e.target.value);

// ---------------------------------------------------------------
// Step 3: Model
// ---------------------------------------------------------------

function renderModelStep() {
  if (!document.getElementById('model-list')) return;
  aiPrefillBanner(3);
  const providers = [...new Set(LLM_MODELS.map(m => m.provider))];
  document.getElementById('model-list').innerHTML = providers.map(provider => `
    ${LLM_MODELS.filter(m => m.provider === provider).map(m => `
      <div class="template-option ${state.model === m.id ? 'selected' : ''} ${m.enabled ? '' : 'model-option-disabled'}" ${m.enabled ? `data-model="${m.id}"` : 'title="Disabled by your admin"'}>
        <span class="template-radio"></span>
        <div>
          <div class="ct-title">${escapeHtml(m.name)}${m.default ? ' <span class="default-model-tag">Default</span>' : ''}</div>
          <div class="ct-desc">${escapeHtml(m.description)}</div>
        </div>
      </div>
    `).join('')}
  `).join('');
  document.querySelectorAll('#model-list [data-model]').forEach(card => {
    card.addEventListener('click', () => { state.model = card.dataset.model; renderModelStep(); });
  });
}

// ---------------------------------------------------------------
// Step 4: Data sources / connectors
// ---------------------------------------------------------------

let pendingConnectorId = null;
// Set by callers that need to refresh themselves once a connection lands
// (e.g. the Generate source-priority step, which lists connection status).
let connectorModalOnDone = null;

function renderConnectors() {
  if (!document.getElementById('connector-grid')) return; // no connector grid on this page (e.g. the AI conversational builder)
  aiPrefillBanner(4);
  const allConnectors = [...CONNECTORS, ...state.customConnectors];
  document.getElementById('connector-grid').innerHTML = allConnectors.map(c => {
    const connected = !!state.connectors[c.id];
    const isCustom = !c.category;
    return `
      <div class="connector-tile ${connected ? 'connected' : ''}" data-connector="${c.id}">
        <div class="connector-icon ${c.logo ? 'has-logo' : ''}" style="background:${c.color || '#5e6670'}">${connectorIconInner(c)}</div>
        <div class="connector-name">${escapeHtml(c.name)}</div>
        <div class="connector-category">${isCustom ? escapeHtml(c.apiUrl) : escapeHtml(c.category)}</div>
        ${connected
          ? `<span class="connector-status">✓ Connected as you</span>`
          : `<button class="btn btn-outline connector-connect-btn">Connect</button>`}
      </div>
    `;
  }).join('') + `
    <div class="connector-tile connector-tile-add" id="add-custom-connector-tile">
      <div class="connector-icon connector-icon-add">+</div>
      <div class="connector-name">Custom data source</div>
      <div class="connector-category">Connect anything with an API</div>
    </div>
  `;

  document.querySelectorAll('.connector-tile[data-connector]').forEach(tile => {
    tile.addEventListener('click', () => {
      const id = tile.dataset.connector;
      if (state.connectors[id]) {
        delete state.connectors[id];
        renderConnectors();
      } else if (CONNECTORS.find(x => x.id === id)) {
        openConnectorModal(id);
      } else {
        state.connectors[id] = true;
        renderConnectors();
      }
    });
  });
  document.getElementById('add-custom-connector-tile')?.addEventListener('click', openCustomConnectorModal);
}

function openConnectorModal(id, onDone) {
  const c = CONNECTORS.find(x => x.id === id);
  pendingConnectorId = id;
  connectorModalOnDone = onDone || null;
  document.getElementById('connector-modal-icon').style.background = c.color;
  document.getElementById('connector-modal-icon').classList.toggle('has-logo', !!c.logo);
  document.getElementById('connector-modal-icon').innerHTML = connectorIconInner(c);
  document.getElementById('connector-modal-title').textContent = `Connect to ${c.name}`;
  document.getElementById('connector-modal-name').textContent = c.name;
  document.getElementById('connector-modal').classList.add('show');
}
document.getElementById('connector-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('connector-modal').classList.remove('show');
  pendingConnectorId = null;
  connectorModalOnDone = null;
});
document.getElementById('connector-modal-confirm')?.addEventListener('click', () => {
  if (pendingConnectorId) state.connectors[pendingConnectorId] = true;
  document.getElementById('connector-modal').classList.remove('show');
  pendingConnectorId = null;
  renderConnectors();
  const done = connectorModalOnDone;
  connectorModalOnDone = null;
  if (done) done();
});

// "Custom data source" — a lightweight named entry (name + API base URL)
// rather than the fake-login flow above, to show off "connect anything with
// an API" without pretending there's an OAuth handshake behind it.
let customConnectorCounter = 1;

function openCustomConnectorModal() {
  document.getElementById('custom-connector-name').value = 'Orion Portfolio Manager';
  document.getElementById('custom-connector-url').value = 'https://api.orionadvisor.com/v2';
  document.getElementById('custom-connector-modal').classList.add('show');
  document.getElementById('custom-connector-name').focus();
  document.getElementById('custom-connector-name').select();
}
document.getElementById('custom-connector-cancel')?.addEventListener('click', () => {
  document.getElementById('custom-connector-modal').classList.remove('show');
});
document.getElementById('custom-connector-confirm')?.addEventListener('click', () => {
  const name = document.getElementById('custom-connector-name').value.trim();
  const apiUrl = document.getElementById('custom-connector-url').value.trim();
  if (!name || !apiUrl) return;
  const id = `custom-${customConnectorCounter++}`;
  state.customConnectors.push({ id, name, apiUrl, initials: name.slice(0, 2).toUpperCase(), color: '#5e6670' });
  state.connectors[id] = true;
  document.getElementById('custom-connector-modal').classList.remove('show');
  renderConnectors();
});

// ---------------------------------------------------------------
// Step 5: Triggers
// ---------------------------------------------------------------

const TRIGGER_ORDER = ['manual', 'slack', 'email', 'webhook', 'schedule'];

function activeTriggerKeys() {
  return TRIGGER_ORDER.filter(key => state.triggers[key].enabled);
}

function ensureTriggerDefaults(key) {
  const cfg = state.triggers[key];
  const slug = slugify(state.name);
  if (key === 'slack' && !cfg.invocationPhrase) {
    cfg.channelPattern = cfg.channelPattern || '#deal-approvals';
    cfg.invocationPhrase = `@${state.name || 'Agent'}`;
  }
  if (key === 'email' && !cfg.inboxAddress) {
    cfg.inboxAddress = `${slug}@intake.sdocs.com`;
    cfg.filterValue = cfg.filterValue || 'claim';
  }
  if (key === 'webhook' && !cfg.url) {
    cfg.url = `https://hooks.sdocs.com/agents/${slug}/webhook`;
  }
}

function renderTriggers() {
  aiPrefillBanner(5);
  document.getElementById('trigger-list').innerHTML = TRIGGER_ORDER.map(key => {
    const t = TRIGGER_TYPES[key];
    const cfg = state.triggers[key];
    return `
      <div class="trigger-card ${cfg.enabled ? 'enabled' : ''}">
        <div class="trigger-card-head">
          <div class="trigger-icon" style="background:${t.color}">${t.letter}</div>
          <div class="trigger-card-title">
            <div class="trigger-name">${t.label}</div>
            <div class="trigger-desc">${escapeHtml(t.description)}</div>
          </div>
          ${key === 'manual'
            ? `<span class="trigger-always-on">Always on</span>`
            : `<button class="trigger-toggle ${cfg.enabled ? 'on' : ''}" data-trigger="${key}" role="switch" aria-checked="${cfg.enabled}"></button>`}
        </div>
        ${cfg.enabled && key !== 'manual' ? renderTriggerConfig(key, cfg) : ''}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.trigger-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.trigger;
      state.triggers[key].enabled = !state.triggers[key].enabled;
      if (state.triggers[key].enabled) ensureTriggerDefaults(key);
      renderTriggers();
    });
  });

  bindTriggerConfigInputs();
}

function renderTriggerConfig(key, cfg) {
  if (key === 'slack') {
    return `
      <div class="trigger-card-body">
        <div class="field-group">
          <label>Channel or DM</label>
          <input type="text" class="text-input" data-trigger-field="slack.channelPattern" value="${escapeHtml(cfg.channelPattern)}" placeholder="#deal-approvals">
        </div>
        <div class="field-group">
          <label>Invocation phrase</label>
          <div class="field-hint">What someone types or @-mentions to invoke this agent.</div>
          <input type="text" class="text-input" data-trigger-field="slack.invocationPhrase" value="${escapeHtml(cfg.invocationPhrase)}" placeholder="@Claims Intake Agent">
        </div>
      </div>
    `;
  }
  if (key === 'email') {
    return `
      <div class="trigger-card-body">
        <div class="field-group">
          <label>Inbox address</label>
          <div class="field-hint">Emails sent here are checked against the filter below.</div>
          <input type="text" class="text-input" value="${escapeHtml(cfg.inboxAddress)}" disabled>
        </div>
        <div class="trigger-field-row">
          <select class="text-input" data-trigger-field="email.filterType" style="max-width:200px;">
            ${EMAIL_FILTER_TYPES.map(f => `<option value="${f.id}" ${cfg.filterType === f.id ? 'selected' : ''}>${f.label}</option>`).join('')}
          </select>
          <input type="text" class="text-input" data-trigger-field="email.filterValue" value="${escapeHtml(cfg.filterValue)}" placeholder="e.g. claim">
        </div>
      </div>
    `;
  }
  if (key === 'webhook') {
    return `
      <div class="trigger-card-body">
        <div class="field-group">
          <label>Webhook URL</label>
          <div class="webhook-url-row">
            <input type="text" class="text-input" id="webhook-url-input" value="${escapeHtml(cfg.url)}" readonly>
            <button class="btn btn-outline btn-sm" id="webhook-copy-btn">Copy</button>
          </div>
        </div>
        <div class="field-group">
          <label>Sample payload</label>
          <pre class="payload-preview">${escapeHtml(MOCK_WEBHOOK_PAYLOAD)}</pre>
        </div>
      </div>
    `;
  }
  if (key === 'schedule') {
    return `
      <div class="trigger-card-body">
        <div class="trigger-field-row">
          <select class="text-input" data-trigger-field="schedule.frequency" style="max-width:140px;">
            ${SCHEDULE_FREQUENCIES.map(f => `<option value="${f}" ${cfg.frequency === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
          ${cfg.frequency === 'Weekly' ? `
            <select class="text-input" data-trigger-field="schedule.day" style="max-width:160px;">
              ${WEEKDAYS.map(d => `<option value="${d}" ${cfg.day === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          ` : ''}
          ${cfg.frequency === 'Monthly' ? `
            <input type="number" class="text-input" data-trigger-field="schedule.day" min="1" max="28" style="max-width:100px;" value="${escapeHtml(cfg.day && !isNaN(cfg.day) ? cfg.day : '1')}">
          ` : ''}
          <input type="time" class="text-input" data-trigger-field="schedule.time" value="${escapeHtml(cfg.time)}" style="max-width:140px;">
        </div>
      </div>
    `;
  }
  return '';
}

function bindTriggerConfigInputs() {
  document.querySelectorAll('[data-trigger-field]').forEach(input => {
    const [triggerKey, field] = input.dataset.triggerField.split('.');
    input.addEventListener('change', () => {
      state.triggers[triggerKey][field] = input.value;
      if (triggerKey === 'schedule' && field === 'frequency') renderTriggers();
    });
  });
  const copyBtn = document.getElementById('webhook-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const input = document.getElementById('webhook-url-input');
      input.select();
      showToast('Webhook URL copied.');
    });
  }
}

// ---------------------------------------------------------------
// Step 6: Tasks
// ---------------------------------------------------------------

function computeDefaultSourcePriority() {
  const all = [...DEFAULT_SOURCE_PRIORITY, ...state.customConnectors.map(c => c.id)];
  return all.sort((a, b) => Number(!state.connectors[a]) - Number(!state.connectors[b]));
}

// Looks up a connector by id across the built-in CONNECTORS list and any
// "Custom data source" entries the builder added from the Data sources step.
function findConnector(id) {
  return CONNECTORS.find(c => c.id === id) || state.customConnectors.find(c => c.id === id);
}

// Resolves a Generate task's document template by id across the 6 built-in
// DOCUMENT_TEMPLATES, the searchable OPS_TEMPLATE_LIBRARY ("Something else"
// search results), and the "Start from scratch" case — where the template
// is assembled live from the config's own custom arrays so edits to labels,
// prompts, and chart types persist without any extra copying.
function getTemplateForConfig(config) {
  if (config.templateId === 'custom') {
    return {
      id: 'custom',
      label: config.customLabel || 'Custom document',
      description: 'A custom document defined from scratch.',
      dataElements: config.customDataElements || [],
      visualizations: config.customVisualizations || [],
    };
  }
  return DOCUMENT_TEMPLATES.find(t => t.id === config.templateId) || OPS_TEMPLATE_LIBRARY.find(t => t.id === config.templateId) || null;
}

// Clears every piece of per-template state a Generate task config carries,
// so switching between a built-in template, an ops-library template, and
// "start from scratch" never leaves stale rows behind.
function resetGenerateTemplateState(config) {
  config.dataElements = {};
  config.visualizations = {};
  config.customDataElements = [];
  config.customVisualizations = [];
  config.customLabel = '';
}

let customItemCounter = 1;

function addCustomDataElement(config) {
  const key = `custom_el_${customItemCounter++}`;
  config.customDataElements.push({ key, label: '', suggestedPrompt: '' });
  config.dataElements[key] = { included: true, prompt: '' };
}

function removeCustomDataElement(config, key) {
  config.customDataElements = config.customDataElements.filter(el => el.key !== key);
  delete config.dataElements[key];
}

function addCustomVisualization(config) {
  const key = `custom_viz_${customItemCounter++}`;
  config.customVisualizations.push({ key, label: '', type: 'table', suggestedPrompt: '' });
  config.visualizations[key] = { included: true, prompt: '' };
}

function removeCustomVisualization(config, key) {
  config.customVisualizations = config.customVisualizations.filter(v => v.key !== key);
  delete config.visualizations[key];
}

function makeTask(type, config) {
  return { id: `t${taskIdCounter++}`, type, config };
}

function taskSummary(task) {
  const cfg = task.config;
  switch (task.type) {
    case 'extract': {
      const fields = (cfg.schema || []).map(f => f.name).join(', ');
      return `From "${cfg.fileName || 'a sample document'}" &mdash; ${fields || 'no fields defined yet'}${skillTag(cfg)}`;
    }
    case 'generate': {
      const template = cfg.templateId ? getTemplateForConfig(cfg) : null;
      if (!template) return 'Document type not set';
      const n = Object.values(cfg.dataElements || {}).filter(el => el.included).length;
      const vn = Object.values(cfg.visualizations || {}).filter(v => v.included).length;
      return `${template.label} &mdash; ${n} data element${n === 1 ? '' : 's'}${vn ? `, ${vn} chart${vn === 1 ? '' : 's'}` : ''}${skillTag(cfg)}`;
    }
    case 'analyze': {
      const categories = cfg.playbook || [];
      if (!categories.length) return 'Playbook has no categories yet';
      const questionCount = categories.reduce((sum, c) => sum + c.questions.length, 0);
      return `Playbook &mdash; ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}, ${questionCount} question${questionCount === 1 ? '' : 's'}${skillTag(cfg)}`;
    }
    case 'save': {
      const platform = DESTINATION_PLATFORMS.find(p => p.id === cfg.platformId);
      return platform ? `To ${platform.name}` : 'No destination selected';
    }
    case 'notify': {
      const channel = NOTIFY_CHANNELS.find(c => c.id === cfg.channelId);
      if (!channel) return 'No channel selected';
      return `Via ${channel.name}${cfg.recipient ? ' to ' + cfg.recipient : ''}${cfg.condition ? ` &mdash; only if ${cfg.condition}` : ''}`;
    }
    default: return '';
  }
}

// Visual orchestration canvas — a vertical chain of connected nodes
// (Start -> task -> task -> ...), Salesforce Flow / Workato-recipe style.
// A "+" on each connector opens an inline picker to insert a task at that point.

let openGapIndex = null; // which connector's insert-menu is expanded, or null

const FLOW_TRIGGER_NODE_WIDTH = 130;
const FLOW_TRIGGER_NODE_GAP = 18;

function renderTriggerFlowSection() {
  const keys = activeTriggerKeys();
  const nodesHtml = keys.map(key => {
    const t = TRIGGER_TYPES[key];
    return `
      <div class="flow-trigger-node" style="width:${FLOW_TRIGGER_NODE_WIDTH}px;">
        <div class="flow-node-icon" style="background:${t.color}">${t.letter}</div>
        <div class="flow-trigger-node-label">${t.label}</div>
      </div>
    `;
  }).join('');

  const mergeLineWidth = (keys.length - 1) * (FLOW_TRIGGER_NODE_WIDTH + FLOW_TRIGGER_NODE_GAP);

  return `
    <div class="flow-trigger-section" id="flow-trigger-section">
      <div class="flow-trigger-row" style="gap:${FLOW_TRIGGER_NODE_GAP}px;">${nodesHtml}</div>
      ${keys.length > 1 ? `<div class="flow-trigger-merge-bar" style="width:${mergeLineWidth}px;"></div>` : ''}
      <div class="flow-trigger-down-line"></div>
    </div>
  `;
}

function renderTaskList() {
  aiPrefillBanner(6);
  openGapIndex = null;
  renderFlowCanvas();
}

function renderFlowCanvas() {
  const canvas = document.getElementById('flow-canvas');

  let html = renderTriggerFlowSection();
  html += renderGap(0);

  state.tasks.forEach((task, i) => {
    const t = TASK_TYPES[task.type];
    html += `
      <div class="flow-node" data-task-id="${task.id}" data-index="${i}">
        <div class="flow-node-icon" style="background:${t.color}">${t.label[0]}</div>
        <div class="flow-node-body">
          <div class="flow-node-title">${t.label}</div>
          <div class="flow-node-desc">${taskSummary(task)}</div>
        </div>
        <div class="flow-node-actions">
          <button class="move-up" title="Move up" ${i === 0 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="move-down" title="Move down" ${i === state.tasks.length - 1 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="remove-task" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;
    html += renderGap(i + 1);
  });

  canvas.innerHTML = html;

  const triggerSection = document.getElementById('flow-trigger-section');
  if (triggerSection) triggerSection.addEventListener('click', () => goToStep(4));

  canvas.querySelectorAll('.flow-node[data-task-id]').forEach(node => {
    node.addEventListener('click', (e) => {
      if (e.target.closest('.flow-node-actions')) return;
      const i = Number(node.dataset.index);
      openSubflow(state.tasks[i].type, state.tasks[i].id);
    });
  });
  canvas.querySelectorAll('.move-up').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveTask(Number(btn.closest('.flow-node').dataset.index), -1);
  }));
  canvas.querySelectorAll('.move-down').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveTask(Number(btn.closest('.flow-node').dataset.index), 1);
  }));
  canvas.querySelectorAll('.remove-task').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const i = Number(btn.closest('.flow-node').dataset.index);
    state.tasks.splice(i, 1);
    renderFlowCanvas();
  }));
  canvas.querySelectorAll('.flow-add-btn').forEach(btn => btn.addEventListener('click', () => {
    openGapIndex = Number(btn.dataset.gap);
    renderFlowCanvas();
  }));
  canvas.querySelectorAll('.flow-add-menu-close').forEach(btn => btn.addEventListener('click', () => {
    openGapIndex = null;
    renderFlowCanvas();
  }));
  canvas.querySelectorAll('.flow-add-menu-option').forEach(btn => btn.addEventListener('click', () => {
    openSubflow(btn.dataset.type, null, Number(btn.dataset.gap));
  }));

  if (typeof onFlowCanvasUpdate === 'function') onFlowCanvasUpdate();
}

// Optional hook another page (e.g. the AI conversational builder) can set to
// react whenever the canvas re-renders — task added/removed/reordered, or a
// subflow modal saved/cancelled.
let onFlowCanvasUpdate = null;

function renderGap(index) {
  if (openGapIndex === index) {
    return `
      <div class="flow-gap open">
        <div class="flow-add-menu">
          <div class="flow-add-menu-head">
            <span>Add a task here</span>
            <button class="flow-add-menu-close" title="Cancel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="flow-add-menu-grid">
            ${Object.values(TASK_TYPES).map(t => `
              <div class="flow-add-menu-option" data-type="${t.key}" data-gap="${index}">
                <div class="flow-node-icon" style="background:${t.color}">${t.label[0]}</div>
                ${t.label}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  return `<div class="flow-gap"><button class="flow-add-btn" data-gap="${index}" title="Add a task">+</button></div>`;
}

function moveTask(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.tasks.length) return;
  [state.tasks[i], state.tasks[j]] = [state.tasks[j], state.tasks[i]];
  renderFlowCanvas();
}

// ---------------------------------------------------------------
// Task sub-flows
// ---------------------------------------------------------------

let pendingInsertIndex = null;

function openSubflow(type, taskId, insertIndex) {
  editingTaskId = taskId;
  pendingInsertIndex = insertIndex != null ? insertIndex : null;
  openGapIndex = null;
  const existing = taskId ? state.tasks.find(t => t.id === taskId) : null;
  const config = existing ? JSON.parse(JSON.stringify(existing.config)) : defaultConfigFor(type);
  renderSubflow(type, config, 0);
  document.getElementById('subflow-overlay').classList.add('show');
}

function closeSubflow() {
  document.getElementById('subflow-overlay').classList.remove('show');
  editingTaskId = null;
  pendingInsertIndex = null;
  renderFlowCanvas();
}

function defaultConfigFor(type) {
  switch (type) {
    case 'extract': return { fileName: '', schema: [], skillIds: [] };
    case 'generate': return { templateId: null, dataElements: {}, visualizations: {}, customDataElements: [], customVisualizations: [], customLabel: '', pickerMode: 'list', pickerSearch: '', sourcePriority: computeDefaultSourcePriority(), skillIds: [] };
    case 'analyze': return { mode: 'playbook', playbook: [], skillIds: [] };
    case 'save': return { platformId: null, objectId: null, mappings: {} };
    case 'notify': return { channelId: null, recipient: '', message: '', condition: '' };
    default: return {};
  }
}

function skillsFor(taskType) {
  return SKILLS.filter(s => s.taskType === taskType);
}

function skillTag(config) {
  const ids = config.skillIds || [];
  if (!ids.length) return '';
  const names = ids.map(id => SKILLS.find(s => s.id === id)).filter(Boolean).map(s => s.name);
  if (!names.length) return '';
  return ` &mdash; via ${names.join(' + ')}`;
}

function saveTaskConfig(type, config) {
  if (editingTaskId) {
    const task = state.tasks.find(t => t.id === editingTaskId);
    task.config = config;
  } else if (pendingInsertIndex != null) {
    state.tasks.splice(pendingInsertIndex, 0, makeTask(type, config));
  } else {
    state.tasks.push(makeTask(type, config));
  }
  closeSubflow();
}

// -- EXTRACT sub-flow (Upload -> Describe -> Schema confirm) --
function renderSubflow(type, config, subStep) {
  const panel = document.getElementById('subflow-panel');
  const renderers = { extract: renderExtractSubflow, generate: renderGenerateSubflow, analyze: renderAnalyzeSubflow, save: renderSaveSubflow, notify: renderNotifySubflow };
  renderers[type](panel, config, subStep);
}

function subflowShell(title, miniSteps, activeIndex, bodyHtml, footerHtml) {
  return `
    <div class="subflow-header">
      <h3>${title}</h3>
      <button class="icon-btn" id="subflow-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      ${miniSteps ? `<div class="subflow-mini-stepper">${miniSteps.map((s, i) => `<div class="subflow-mini-step ${i < activeIndex ? 'done' : ''} ${i === activeIndex ? 'active' : ''}"></div>`).join('')}</div>
      <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:18px;">${escapeHtml(miniSteps[activeIndex])}</div>` : ''}
      ${bodyHtml}
    </div>
    <div class="subflow-footer">${footerHtml}</div>
  `;
}

function bindSubflowClose() {
  document.getElementById('subflow-close')?.addEventListener('click', closeSubflow);
}

// EXTRACT
function renderExtractSubflow(panel, config, subStep) {
  const steps = ['Upload document', 'Describe what to extract', 'Confirm schema'];
  if (subStep === 0) {
    const extractSkills = skillsFor('extract');
    panel.innerHTML = subflowShell('Extract', steps, 0, `
      <div class="dropzone ${config.fileName ? 'uploaded' : ''}" id="dropzone">
        ${config.fileName
          ? `<div class="upload-file-row"><div class="upload-file-icon">PDF</div><div><strong>${escapeHtml(config.fileName)}</strong><div style="color:var(--text-muted);font-size:12px;">2.4 MB &middot; uploaded</div></div></div>`
          : `Click to simulate uploading a sample document (e.g. a contract, claim form, or invoice).`}
      </div>
      ${extractSkills.length ? `
        <p class="field-hint" style="margin:14px 0 8px;">Or start from an existing skill &mdash; skips straight to a ready-made schema:</p>
        <div class="skill-picker-list">
          ${extractSkills.map(s => `
            <div class="skill-picker-row ${(config.skillIds || []).includes(s.id) ? 'selected' : ''}" data-use-skill="${s.id}">
              <div class="skill-picker-icon" style="background:${s.color}">${s.name[0]}</div>
              <div class="skill-picker-body">
                <div class="skill-picker-name">${escapeHtml(s.name)}</div>
                <div class="skill-picker-desc">${escapeHtml(s.description)}</div>
              </div>
              <span class="skill-picker-use-btn">Use</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `, `
      <button class="btn btn-outline" id="sf-cancel">Cancel</button>
      <button class="btn btn-primary" id="sf-next" ${config.fileName ? '' : 'disabled'}>Next</button>
    `);
    bindSubflowClose();
    document.getElementById('dropzone')?.addEventListener('click', () => {
      config.fileName = 'sample_document.pdf';
      renderSubflow('extract', config, 0);
    });
    panel.querySelectorAll('[data-use-skill]').forEach(row => {
      row.addEventListener('click', () => {
        const skill = SKILLS.find(s => s.id === row.dataset.useSkill);
        config.fileName = config.fileName || 'sample_document.pdf';
        config.schema = skill.payload.schema.map(f => ({ ...f }));
        config.skillIds = [skill.id];
        renderSubflow('extract', config, 2);
      });
    });
    document.getElementById('sf-cancel')?.addEventListener('click', closeSubflow);
    document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('extract', config, 1));
  } else if (subStep === 1) {
    panel.innerHTML = subflowShell('Extract', steps, 1, `
      <div class="field-group">
        <label>Describe what you want to extract</label>
        <div class="field-hint">Plain language is fine &mdash; e.g. "Insurance claim form with claimant name, policy number, claim amount, and incident description."</div>
        <textarea class="textarea-large" id="extract-description" placeholder="Describe the document and the fields you want pulled out of it&hellip;">${escapeHtml(config.description || '')}</textarea>
      </div>
    `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-next">Generate schema</button>
    `);
    bindSubflowClose();
    document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('extract', config, 0));
    document.getElementById('sf-next')?.addEventListener('click', () => {
      config.description = document.getElementById('extract-description').value;
      config.schema = config.schema && config.schema.length ? config.schema : EXTRACT_SAMPLE_SCHEMA.map(f => ({ ...f }));
      renderSubflow('extract', config, 2);
    });
  } else {
    panel.innerHTML = subflowShell('Extract', steps, 2, `
      <p class="field-hint" style="margin-bottom:12px;">Auto-generated from your description. Edit types or requirements if needed.</p>
      <table class="schema-table">
        <thead><tr><th>Field</th><th>Type</th><th>Requirement</th></tr></thead>
        <tbody>
          ${config.schema.map(f => `
            <tr>
              <td>${escapeHtml(f.name)}</td>
              <td><span class="type-tag">${f.type}</span></td>
              <td><span class="req-tag ${f.required ? 'required' : 'optional'}">${f.required ? 'Required' : 'Optional'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-save">Confirm schema</button>
    `);
    bindSubflowClose();
    document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('extract', config, 1));
    document.getElementById('sf-save')?.addEventListener('click', () => saveTaskConfig('extract', config));
  }
}

// GENERATE, step 0 (default view) — the 6 built-in templates, any skills
// that already target one, and a "Something else" entry into the
// org-published template search below.
function renderDocTypeListStep(panel, config, steps) {
  const generateSkills = skillsFor('generate');
  panel.innerHTML = subflowShell('Generate', steps, 0, `
    <p class="field-hint" style="margin-bottom:12px;">Pick the S-Docs template this task should produce, or start from a skill that already targets one.</p>
    ${generateSkills.length ? `
      <div class="skill-picker-list" style="margin-bottom:14px;">
        ${generateSkills.map(s => `
          <div class="skill-picker-row ${(config.skillIds || []).includes(s.id) ? 'selected' : ''}" data-use-skill="${s.id}">
            <div class="skill-picker-icon" style="background:${s.color}">${s.name[0]}</div>
            <div class="skill-picker-body">
              <div class="skill-picker-name">${escapeHtml(s.name)}</div>
              <div class="skill-picker-desc">${escapeHtml(s.description)}</div>
            </div>
            <span class="skill-picker-use-btn">Use</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
    <div class="template-list">
      ${DOCUMENT_TEMPLATES.map(t => `
        <div class="template-option ${config.templateId === t.id ? 'selected' : ''}" data-template="${t.id}">
          <span class="template-radio"></span>
          <div>
            <div class="ct-title">${escapeHtml(t.label)}</div>
            <div class="ct-desc">${escapeHtml(t.description)}</div>
          </div>
        </div>
      `).join('')}
      <div class="template-option something-else-tile" id="something-else-tile">
        <span class="template-radio dashed"></span>
        <div>
          <div class="ct-title">Something else</div>
          <div class="ct-desc">Search templates your operations teams have already published, or start one from scratch.</div>
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-outline" id="sf-cancel">Cancel</button>
    <button class="btn btn-primary" id="sf-next" ${config.templateId ? '' : 'disabled'}>Next</button>
  `);
  bindSubflowClose();
  panel.querySelectorAll('.template-option[data-template]').forEach(card => {
    card.addEventListener('click', () => {
      if (config.templateId !== card.dataset.template) {
        resetGenerateTemplateState(config);
        config.templateId = card.dataset.template;
        config.skillIds = [];
      }
      renderSubflow('generate', config, 0);
    });
  });
  panel.querySelectorAll('[data-use-skill]').forEach(row => {
    row.addEventListener('click', () => {
      const skill = SKILLS.find(s => s.id === row.dataset.useSkill);
      resetGenerateTemplateState(config);
      config.templateId = skill.payload.templateId;
      config.skillIds = [skill.id];
      renderSubflow('generate', config, 0);
    });
  });
  document.getElementById('something-else-tile')?.addEventListener('click', () => {
    config.pickerMode = 'search';
    renderSubflow('generate', config, 0);
  });
  document.getElementById('sf-cancel')?.addEventListener('click', closeSubflow);
  document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('generate', config, 0.5));
}

// GENERATE, step 0 (search view) — search OPS_TEMPLATE_LIBRARY by name,
// description, or publishing team; "Start from scratch" is always pinned
// at the top of the results regardless of the search text.
function renderDocTypeSearchStep(panel, config, steps) {
  panel.innerHTML = subflowShell('Generate', steps, 0, `
    <button class="link-back-btn" id="back-to-templates">&larr; Back to standard templates</button>
    <p class="field-hint" style="margin:12px 0 10px;">Search templates your operations teams have already published, or start from scratch.</p>
    <input type="text" class="text-input" id="ops-template-search" placeholder="Search by name, description, or team&hellip;" value="${escapeHtml(config.pickerSearch || '')}">
    <div class="template-list" id="ops-template-results" style="margin-top:14px;"></div>
  `, `
    <button class="btn btn-outline" id="sf-cancel">Cancel</button>
    <button class="btn btn-primary" id="sf-next" ${config.templateId ? '' : 'disabled'}>Next</button>
  `);
  bindSubflowClose();
  renderOpsTemplateResults(panel, config);
  document.getElementById('back-to-templates')?.addEventListener('click', () => {
    config.pickerMode = 'list';
    renderSubflow('generate', config, 0);
  });
  document.getElementById('ops-template-search')?.addEventListener('input', e => {
    config.pickerSearch = e.target.value;
    renderOpsTemplateResults(panel, config);
  });
  document.getElementById('sf-cancel')?.addEventListener('click', closeSubflow);
  document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('generate', config, 0.5));
}

function renderOpsTemplateResults(panel, config) {
  const q = (config.pickerSearch || '').trim().toLowerCase();
  const matches = OPS_TEMPLATE_LIBRARY.filter(t =>
    !q || t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.team.toLowerCase().includes(q)
  );
  const list = panel.querySelector('#ops-template-results');
  list.innerHTML = `
    <div class="template-option scratch-option ${config.templateId === 'custom' ? 'selected' : ''}" data-template="custom">
      <span class="template-radio dashed"></span>
      <div>
        <div class="ct-title">Start from scratch</div>
        <div class="ct-desc">Define your own data elements and charts to collect — nothing pre-filled.</div>
      </div>
    </div>
    ${matches.map(t => `
      <div class="template-option ${config.templateId === t.id ? 'selected' : ''}" data-template="${t.id}">
        <span class="template-radio"></span>
        <div>
          <div class="ct-title">${escapeHtml(t.label)}</div>
          <div class="ct-desc">${escapeHtml(t.description)}</div>
          <div class="ct-provenance">Published by ${escapeHtml(t.team)} &middot; used by ${t.usedByCount} agent${t.usedByCount === 1 ? '' : 's'}</div>
        </div>
      </div>
    `).join('')}
    ${matches.length === 0 ? `<p class="field-hint" style="margin-top:6px;">No published templates match &ldquo;${escapeHtml(config.pickerSearch)}&rdquo;.</p>` : ''}
  `;
  list.querySelectorAll('.template-option[data-template]').forEach(card => {
    card.addEventListener('click', () => {
      if (config.templateId !== card.dataset.template) {
        resetGenerateTemplateState(config);
        config.templateId = card.dataset.template;
        config.skillIds = [];
        if (config.templateId === 'custom') config.customLabel = 'Custom document';
      }
      renderOpsTemplateResults(panel, config);
      const nextBtn = panel.querySelector('#sf-next');
      if (nextBtn) nextBtn.disabled = !config.templateId;
    });
  });
}

// GENERATE — always produces a document from an S-Docs template.
function renderGenerateSubflow(panel, config, subStep) {
  const steps = ['Choose document type', 'Select template', 'Confirm data elements', 'Prioritize data sources', 'Preview'];
  if (subStep === 0) {
    if (config.pickerMode === 'search') {
      renderDocTypeSearchStep(panel, config, steps);
    } else {
      renderDocTypeListStep(panel, config, steps);
    }
  } else if (subStep === 0.5) {
    renderTemplatePickStep(panel, config, steps);
  } else if (subStep === 1) {
    const isCustom = config.templateId === 'custom';
    const template = getTemplateForConfig(config);
    // The chosen S-Docs template's merge fields are what must be collected;
    // the curated suggestions for this document type ride along as optional
    // extras, off by default so the template stays the source of truth.
    const required = isCustom ? [] : templateMergeElements(config);
    const requiredKeys = new Set(required.map(el => el.key));
    const extras = template.dataElements.filter(el => !requiredKeys.has(el.key));
    const elements = required.concat(extras);
    elements.forEach(el => {
      if (!config.dataElements[el.key]) {
        config.dataElements[el.key] = {
          included: el.required ? true : !required.length,
          prompt: el.suggestedPrompt,
        };
      }
      if (el.required) config.dataElements[el.key].included = true;
    });
    const hasViz = isCustom || !!(template.visualizations && template.visualizations.length);
    if (hasViz) {
      config.visualizations = config.visualizations || {};
      template.visualizations.forEach(v => {
        if (!config.visualizations[v.key]) config.visualizations[v.key] = { included: v.included !== false, prompt: v.suggestedPrompt };
      });
    }
    panel.innerHTML = subflowShell('Generate', steps, 2, `
      ${isCustom ? `
        <div class="field-group">
          <label for="custom-doc-label">What should this document be called?</label>
          <input type="text" class="text-input" id="custom-doc-label" value="${escapeHtml(config.customLabel || '')}" placeholder="e.g. Vendor Risk Summary">
        </div>
        <p class="field-hint" style="margin-bottom:14px;">Add the things you want this document to collect. Each one gets a prompt S-Docs uses to go find it.</p>
      ` : `
        <p class="field-hint" style="margin-bottom:14px;">${
          required.length
            ? `The <strong>${escapeHtml((SDOCS_TEMPLATES.find(t => t.id === config.sdocsTemplateId) || {}).name || '')}</strong> template needs the fields marked required. Anything else is optional \u2014 tick it to collect it too.`
            : `S-Docs knows "${escapeHtml(template.label)}" needs these data elements. Confirm them and adjust the prompt used to go find each one.`
        }</p>
      `}
      ${elements.map(el => {
        const cfg = config.dataElements[el.key];
        return `
          <div class="data-element-row${el.required ? ' required-by-template' : ''}">
            <div class="data-element-head">
              <input type="checkbox" data-el-include="${el.key}" ${cfg.included ? 'checked' : ''} ${el.required ? 'disabled' : ''}>
              ${isCustom
                ? `<input type="text" class="inline-label-input" data-el-label="${el.key}" value="${escapeHtml(el.label)}" placeholder="e.g. Deal value">`
                : `<label>${escapeHtml(el.label)}</label>`}
              ${el.required ? '<span class="el-required-tag">Required by template</span>' : ''}
              ${isCustom ? `<button class="row-delete-btn" data-el-remove="${el.key}" title="Remove">&times;</button>` : ''}
            </div>
            <textarea class="data-element-prompt" data-el-prompt="${el.key}" placeholder="${isCustom ? 'Describe what to look for and where, e.g. “Pull the vendor’s annual contract value from the signed order form.”' : ''}" ${cfg.included ? '' : 'disabled'}>${escapeHtml(cfg.prompt)}</textarea>
          </div>
        `;
      }).join('')}
      ${isCustom ? `<button class="btn btn-outline btn-sm add-row-btn" id="add-data-element-btn">+ Add item to collect</button>` : ''}
      ${hasViz ? `
        <p class="field-hint" style="margin:18px 0 14px;">Charts &amp; visualizations to include in the generated document.</p>
        ${template.visualizations.map(v => {
          const cfg = config.visualizations[v.key];
          const vt = VISUALIZATION_TYPES[v.type];
          return `
            <div class="data-element-row viz-row">
              <div class="data-element-head">
                <input type="checkbox" data-viz-include="${v.key}" ${cfg.included ? 'checked' : ''}>
                ${isCustom ? '' : `<span class="viz-glyph">${vt.glyph}</span>`}
                ${isCustom
                  ? `<input type="text" class="inline-label-input" data-viz-label="${v.key}" value="${escapeHtml(v.label)}" placeholder="e.g. Cost comparison chart">`
                  : `<label>${escapeHtml(v.label)}</label>`}
                ${isCustom
                  ? `<select class="viz-type-select" data-viz-type="${v.key}">${Object.values(VISUALIZATION_TYPES).map(t => `<option value="${t.key}" ${v.type === t.key ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('')}</select>`
                  : `<span class="viz-type-tag">${escapeHtml(vt.label)}</span>`}
                ${isCustom ? `<button class="row-delete-btn" data-viz-remove="${v.key}" title="Remove">&times;</button>` : ''}
              </div>
              <textarea class="data-element-prompt" data-viz-prompt="${v.key}" placeholder="${isCustom ? 'Describe what this chart should show, e.g. “Chart each fund’s total cost side by side.”' : ''}" ${cfg.included ? '' : 'disabled'}>${escapeHtml(cfg.prompt)}</textarea>
            </div>
          `;
        }).join('')}
        ${isCustom ? `<button class="btn btn-outline btn-sm add-row-btn" id="add-viz-btn">+ Add chart</button>` : ''}
      ` : ''}
    `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-next" ${isCustom && !config.customDataElements.length ? 'disabled' : ''}>Next</button>
    `);
    bindSubflowClose();
    const syncFieldsIntoConfig = () => {
      panel.querySelectorAll('[data-el-prompt]').forEach(ta => { config.dataElements[ta.dataset.elPrompt].prompt = ta.value; });
      panel.querySelectorAll('[data-viz-prompt]').forEach(ta => { config.visualizations[ta.dataset.vizPrompt].prompt = ta.value; });
      if (isCustom) {
        panel.querySelectorAll('[data-el-label]').forEach(inp => {
          const item = config.customDataElements.find(el => el.key === inp.dataset.elLabel);
          if (item) item.label = inp.value;
        });
        panel.querySelectorAll('[data-viz-label]').forEach(inp => {
          const item = config.customVisualizations.find(v => v.key === inp.dataset.vizLabel);
          if (item) item.label = inp.value;
        });
        config.customLabel = document.getElementById('custom-doc-label')?.value || '';
      }
    };
    panel.querySelectorAll('[data-el-include]').forEach(cb => {
      cb.addEventListener('change', () => {
        config.dataElements[cb.dataset.elInclude].included = cb.checked;
        panel.querySelector(`[data-el-prompt="${cb.dataset.elInclude}"]`).disabled = !cb.checked;
      });
    });
    panel.querySelectorAll('[data-viz-include]').forEach(cb => {
      cb.addEventListener('change', () => {
        config.visualizations[cb.dataset.vizInclude].included = cb.checked;
        panel.querySelector(`[data-viz-prompt="${cb.dataset.vizInclude}"]`).disabled = !cb.checked;
      });
    });
    panel.querySelectorAll('[data-viz-type]').forEach(sel => {
      sel.addEventListener('change', () => {
        const item = config.customVisualizations.find(v => v.key === sel.dataset.vizType);
        if (item) item.type = sel.value;
      });
    });
    panel.querySelectorAll('[data-el-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        syncFieldsIntoConfig();
        removeCustomDataElement(config, btn.dataset.elRemove);
        renderSubflow('generate', config, 1);
      });
    });
    panel.querySelectorAll('[data-viz-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        syncFieldsIntoConfig();
        removeCustomVisualization(config, btn.dataset.vizRemove);
        renderSubflow('generate', config, 1);
      });
    });
    document.getElementById('add-data-element-btn')?.addEventListener('click', () => {
      syncFieldsIntoConfig();
      addCustomDataElement(config);
      renderSubflow('generate', config, 1);
    });
    document.getElementById('add-viz-btn')?.addEventListener('click', () => {
      syncFieldsIntoConfig();
      addCustomVisualization(config);
      renderSubflow('generate', config, 1);
    });
    document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('generate', config, 0.5));
    document.getElementById('sf-next')?.addEventListener('click', () => {
      syncFieldsIntoConfig();
      if (!config.sourcePriority || !config.sourcePriority.length) config.sourcePriority = computeDefaultSourcePriority();
      renderSubflow('generate', config, 2);
    });
  } else if (subStep === 2) {
    renderSourcePriorityStep(panel, config, steps);
  } else {
    const template = getTemplateForConfig(config);
    const preview = mockGeneratedDocument(template, config.dataElements, config.sourcePriority);
    const topSources = config.sourcePriority.slice(0, 2).map(id => findConnector(id).name).join(', then ');
    const includedViz = (template.visualizations || []).filter(v => config.visualizations && config.visualizations[v.key] && config.visualizations[v.key].included);
    panel.innerHTML = subflowShell('Generate', steps, 4, `
      <div class="preview-source-note">Sourced primarily from ${escapeHtml(topSources)}.</div>
      <div class="generated-preview">${escapeHtml(preview)}</div>
      ${includedViz.length ? `
        <p class="field-hint" style="margin:14px 0 10px;">Charts this document will include:</p>
        <div class="viz-preview-grid">
          ${includedViz.map(v => `
            <div class="viz-preview-tile">
              <span class="viz-preview-glyph">${VISUALIZATION_TYPES[v.type].glyph}</span>
              <div class="viz-preview-label">${escapeHtml(v.label)}</div>
              <div class="viz-preview-type">${escapeHtml(VISUALIZATION_TYPES[v.type].label)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-save">Save task</button>
    `);
    bindSubflowClose();
    document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('generate', config, 2));
    document.getElementById('sf-save')?.addEventListener('click', () => saveTaskConfig('generate', config));
  }
}

// A document type says what you want; an S-Docs template is the artifact that
// renders it. The template's merge fields are what the agent must actually go
// and find, so this step sits between the two and drives the next one.
function renderTemplatePickStep(panel, config, steps) {
  const docTypeId = config.templateId === 'custom' ? null : config.templateId;
  const available = docTypeId ? sdocsTemplatesFor(docTypeId) : [];
  const docLabel = config.templateId === 'custom'
    ? (config.customLabel || 'your custom document')
    : ((getTemplateForConfig(config) || {}).label || 'this document');

  if (!config.sdocsTemplateId && available.length) {
    config.sdocsTemplateId = available[0].id; // the org default
  }

  panel.innerHTML = subflowShell('Generate', steps, 1, `
    ${available.length ? `
      <p class="field-hint" style="margin-bottom:14px;">
        Which S-Docs template should render ${escapeHtml(docLabel)}? Its merge fields become the
        inputs this step has to collect.
      </p>
      <div class="sdocs-template-list">
        ${available.map(t => `
          <div class="sdocs-template-row ${config.sdocsTemplateId === t.id ? 'selected' : ''}" data-sdocs-template="${t.id}">
            <span class="sdocs-template-radio"></span>
            <div class="sdocs-template-body">
              <div class="sdocs-template-name">
                ${escapeHtml(t.name)}
                ${t.isDefault ? '<span class="sdocs-template-default">Org default</span>' : ''}
              </div>
              <div class="sdocs-template-meta">
                ${t.format} &middot; ${escapeHtml(t.owner)} &middot; updated ${escapeHtml(t.updated)} &middot; used by ${t.usedBy} agents
              </div>
              <div class="sdocs-template-fields">
                ${t.mergeFields.length} merge field${t.mergeFields.length === 1 ? '' : 's'}:
                ${t.mergeFields.map(f => `<code>${escapeHtml(f.key)}</code>`).join(' ')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <p class="field-hint" style="margin-bottom:14px;">
        No published S-Docs template targets ${escapeHtml(docLabel)} yet. You can still define the
        data elements to collect, and map them onto a template later.
      </p>
      <div class="dropzone" style="padding:26px 20px;">Nothing to pick &mdash; continue and define the inputs yourself.</div>
    `}
  `, `
    <button class="btn btn-outline" id="sf-back">Back</button>
    <button class="btn btn-primary" id="sf-next">Next</button>
  `);
  bindSubflowClose();

  panel.querySelectorAll('[data-sdocs-template]').forEach(row => {
    row.addEventListener('click', () => {
      config.sdocsTemplateId = row.dataset.sdocsTemplate;
      // the template defines the required inputs, so a change invalidates them
      config.dataElements = {};
      renderSubflow('generate', config, 0.5);
    });
  });
  document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('generate', config, 0));
  document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('generate', config, 1));
}

// The merge fields of the chosen template, as data elements.
function templateMergeElements(config) {
  const t = SDOCS_TEMPLATES.find(x => x.id === config.sdocsTemplateId);
  if (!t) return [];
  return t.mergeFields.map(f => ({
    key: f.key,
    label: f.label,
    required: true,
    suggestedPrompt: 'Find ' + f.label.toLowerCase() + ' for this record.',
  }));
}

function renderSourcePriorityStep(panel, config, steps) {
  panel.innerHTML = subflowShell('Generate', steps, 3, `
    <p class="field-hint" style="margin-bottom:12px;">Set the order S-Docs should check when looking for each data element. Connected sources are checked first by default.</p>
    <div class="source-priority-list" id="source-priority-list"></div>
  `, `
    <button class="btn btn-outline" id="sf-back">Back</button>
    <button class="btn btn-primary" id="sf-next">Generate preview</button>
  `);
  bindSubflowClose();
  renderSourcePriorityList(config);
  document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('generate', config, 1));
  document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('generate', config, 3));
}

function renderSourcePriorityList(config) {
  const list = document.getElementById('source-priority-list');
  list.innerHTML = config.sourcePriority.map((id, i) => {
    const c = findConnector(id);
    const connected = !!state.connectors[id];
    return `
      <div class="source-priority-row">
        <span class="priority-rank">${i + 1}</span>
        <span class="connector-icon-sm ${c.logo ? 'has-logo' : ''}" style="background:${c.color}">${connectorIconInner(c)}</span>
        <span class="source-name">${escapeHtml(c.name)}</span>
        ${connected
          ? `<span class="source-connected-badge">&#9679; Connected</span>`
          : `<button class="source-connect-btn" data-connect-source="${id}">Connect</button>`}
        <div class="priority-controls">
          <button class="priority-up" ${i === 0 ? 'disabled' : ''} title="Move up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="priority-down" ${i === config.sourcePriority.length - 1 ? 'disabled' : ''} title="Move down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  // Sources can be connected right here. The wizard had a separate Data
  // sources step earlier in the flow, but the canvas builder has no such
  // step — and even in the wizard you may have skipped one you now need.
  list.querySelectorAll('[data-connect-source]').forEach(btn => {
    btn.addEventListener('click', () => {
      openConnectorModal(btn.dataset.connectSource, () => renderSourcePriorityList(config));
    });
  });
  list.querySelectorAll('.priority-up').forEach((btn, i) => btn.addEventListener('click', () => moveSourcePriority(config, i, -1)));
  list.querySelectorAll('.priority-down').forEach((btn, i) => btn.addEventListener('click', () => moveSourcePriority(config, i, 1)));
}

function moveSourcePriority(config, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= config.sourcePriority.length) return;
  [config.sourcePriority[i], config.sourcePriority[j]] = [config.sourcePriority[j], config.sourcePriority[i]];
  renderSourcePriorityList(config);
}

function mockGeneratedDocument(template, dataElements, sourcePriority) {
  const included = template.dataElements.filter(el => dataElements[el.key] && dataElements[el.key].included);
  const lines = [template.label.toUpperCase(), ''];
  included.forEach(el => { lines.push(`${el.label || '(untitled item)'}: ${el.sampleValue || '(value to be filled in when this task runs)'}`); });
  const connectedCount = sourcePriority.filter(id => state.connectors[id]).length;
  lines.push('', `Generated from ${included.length} data element${included.length === 1 ? '' : 's'}, checked in priority order across ${connectedCount} connected data source${connectedCount === 1 ? '' : 's'}.`);
  return lines.join('\n');
}

// ANALYZE — choose a mode first: threshold conditions on structured data,
// or a weighted playbook of yes/no questions against a document (e.g. a
// contract). See contract-analyze for what running a playbook looks like.

let pbOpenAddQuestionFor = null; // which category's inline "add question" form is open

// Analyze reviews a document against a playbook — the qualitative judgement
// an agent is actually for. Comparing a number against a threshold used to
// live here too, but that is what "Evaluate criteria" does on the canvas, and
// one way to express a threshold is better than two.
const ANALYZE_STEPS = ['Build the playbook', 'What to do with the score'];

function renderAnalyzeSubflow(panel, config, subStep) {
  config.mode = 'playbook';
  if (subStep >= 2) renderPlaybookSuggestionsStep(panel, config);
  else renderPlaybookBuilderStep(panel, config);
}

function renderPlaybookBuilderStep(panel, config) {
  const analyzeSkills = skillsFor('analyze');
  const usedSkillIds = config.skillIds || [];
  panel.innerHTML = subflowShell('Analyze \u2014 playbook', ANALYZE_STEPS, 0, `
      <p class="field-hint">Group your checks into categories (e.g. "IP Protection," "Termination for Convenience"). Each one asks whether a clause or phrase is present and how it reads, and is weighted into an overall risk score \u2014 which a later step can act on to approve, reject or escalate.</p>
      <p class="field-hint" style="margin-bottom:14px;"><a href="../contract-analyze/index.html" target="_blank" rel="noopener">Preview what this looks like against a sample contract &rarr;</a></p>
      ${analyzeSkills.length ? `
        <p class="field-hint" style="margin-bottom:8px;"><strong>Add from a skill</strong> &mdash; brings in that skill's categories and questions. You can add more than one.</p>
        <div class="skill-picker-list" style="margin-bottom:16px;">
          ${analyzeSkills.map(s => `
            <div class="skill-picker-row ${usedSkillIds.includes(s.id) ? 'added' : ''}" data-add-skill="${s.id}">
              <div class="skill-picker-icon" style="background:${s.color}">${s.name[0]}</div>
              <div class="skill-picker-body">
                <div class="skill-picker-name">${escapeHtml(s.name)}</div>
                <div class="skill-picker-desc">${escapeHtml(s.description)}</div>
              </div>
              <span class="skill-picker-use-btn">${usedSkillIds.includes(s.id) ? 'Added ✓' : 'Add'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div id="pb-category-list"></div>
      <div class="add-task-row" style="margin-top:10px;">
        <input type="text" class="text-input" id="pb-new-category-name" placeholder="e.g. Data Privacy &amp; Security" style="flex:1;">
        <button class="btn btn-outline btn-sm" id="pb-add-category-btn">Add category</button>
      </div>
  `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-next">Next</button>
  `);
  bindSubflowClose();
  document.getElementById('sf-back')?.addEventListener('click', () => { pbOpenAddQuestionFor = null; renderSubflow('analyze', config, 0); });
  document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('analyze', config, 2));
  document.getElementById('pb-add-category-btn')?.addEventListener('click', () => {
    const name = document.getElementById('pb-new-category-name').value.trim();
    if (!name) return;
    config.playbook.push({ id: `cat-${Date.now()}`, name, questions: [] });
    renderPlaybookCategories(config);
  });
  panel.querySelectorAll('[data-add-skill]').forEach(row => {
    row.addEventListener('click', () => {
      const skill = SKILLS.find(s => s.id === row.dataset.addSkill);
      if (!config.skillIds) config.skillIds = [];
      if (config.skillIds.includes(skill.id)) { showToast(`${skill.name} is already added.`); return; }
      config.skillIds.push(skill.id);
      skill.payload.playbook.forEach(cat => {
        config.playbook.push({
          id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: cat.name,
          questions: cat.questions.map(q => ({ ...q, id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
        });
      });
      renderPlaybookBuilderStep(panel, config);
      showToast(`${skill.name} added.`);
    });
  });
  renderPlaybookCategories(config);
}

function renderPlaybookCategories(config) {
  const container = document.getElementById('pb-category-list');
  container.innerHTML = config.playbook.map(cat => `
    <div class="pb-category-card">
      <div class="pb-category-head">
        <span class="pb-category-name">${escapeHtml(cat.name)}</span>
        <span class="pb-category-count">${cat.questions.length} question${cat.questions.length === 1 ? '' : 's'}</span>
        <button class="icon-btn" data-remove-category="${cat.id}" title="Remove category">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      ${cat.questions.map(q => `
        <div class="pb-question-row">
          <span class="pb-question-text">${escapeHtml(q.text)}</span>
          <span class="pb-tag">${q.weight} weight</span>
          <span class="pb-tag">Wants: ${q.desiredAnswer}</span>
          <button class="icon-btn" data-remove-question="${cat.id}::${q.id}" title="Remove question">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('')}
      ${pbOpenAddQuestionFor === cat.id ? `
        <div class="pb-add-question-form">
          <textarea class="text-input" id="pb-new-question-text" rows="2" placeholder="e.g. Does the agreement cap liability at 12 months of fees?"></textarea>
          <div class="field-row" style="margin-top:8px;">
            <div class="field-group"><select class="text-input" id="pb-new-question-desired">${DESIRED_ANSWERS.map(a => `<option value="${a}">${a}</option>`).join('')}</select></div>
            <div class="field-group"><select class="text-input" id="pb-new-question-weight">${PLAYBOOK_WEIGHTS.map(w => `<option value="${w}" ${w === 'Medium' ? 'selected' : ''}>${w}</option>`).join('')}</select></div>
            <button class="btn btn-primary btn-sm" data-save-question="${cat.id}">Add</button>
            <button class="btn btn-outline btn-sm" data-cancel-question="${cat.id}">Cancel</button>
          </div>
        </div>
      ` : `<button class="add-question-link" data-open-question="${cat.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add question
      </button>`}
    </div>
  `).join('');

  container.querySelectorAll('[data-remove-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      config.playbook = config.playbook.filter(c => c.id !== btn.dataset.removeCategory);
      renderPlaybookCategories(config);
    });
  });
  container.querySelectorAll('[data-remove-question]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [catId, qId] = btn.dataset.removeQuestion.split('::');
      const cat = config.playbook.find(c => c.id === catId);
      cat.questions = cat.questions.filter(q => q.id !== qId);
      renderPlaybookCategories(config);
    });
  });
  container.querySelectorAll('[data-open-question]').forEach(btn => {
    btn.addEventListener('click', () => { pbOpenAddQuestionFor = btn.dataset.openQuestion; renderPlaybookCategories(config); });
  });
  container.querySelectorAll('[data-cancel-question]').forEach(btn => {
    btn.addEventListener('click', () => { pbOpenAddQuestionFor = null; renderPlaybookCategories(config); });
  });
  container.querySelectorAll('[data-save-question]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = document.getElementById('pb-new-question-text').value.trim();
      if (!text) return;
      const cat = config.playbook.find(c => c.id === btn.dataset.saveQuestion);
      cat.questions.push({
        id: `q-${Date.now()}`,
        text,
        desiredAnswer: document.getElementById('pb-new-question-desired').value,
        weight: document.getElementById('pb-new-question-weight').value,
      });
      pbOpenAddQuestionFor = null;
      renderPlaybookCategories(config);
    });
  });
}

function renderPlaybookSuggestionsStep(panel, config) {
  panel.innerHTML = subflowShell('Analyze \u2014 playbook', ANALYZE_STEPS, 1, `
      <p class="field-hint" style="margin-bottom:14px;">Since this agent now scores a risk level, want to wire up what happens with that score?</p>
      <div class="data-element-row">
        <div class="data-element-head">
          <input type="checkbox" id="pb-suggest-notify" checked>
          <label>Notify #legal-review in Slack, only if overall risk is High</label>
        </div>
      </div>
      <div class="data-element-row">
        <div class="data-element-head">
          <input type="checkbox" id="pb-suggest-save" checked>
          <label>Save the risk score and flagged answers to Salesforce</label>
        </div>
      </div>
      <p class="field-hint">Both are added as separate tasks right after this one &mdash; you can edit or remove them afterward.</p>
  `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-finish">Finish</button>
  `);
  bindSubflowClose();
  document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('analyze', config, 1));
  document.getElementById('sf-finish')?.addEventListener('click', () => {
    finishPlaybookAnalyze(config, {
      notify: document.getElementById('pb-suggest-notify').checked,
      save: document.getElementById('pb-suggest-save').checked,
    });
  });
}

function finishPlaybookAnalyze(config, suggestions) {
  let analyzeTask;
  if (editingTaskId) {
    analyzeTask = state.tasks.find(t => t.id === editingTaskId);
    analyzeTask.config = config;
  } else if (pendingInsertIndex != null) {
    analyzeTask = makeTask('analyze', config);
    state.tasks.splice(pendingInsertIndex, 0, analyzeTask);
  } else {
    analyzeTask = makeTask('analyze', config);
    state.tasks.push(analyzeTask);
  }

  let insertAt = state.tasks.findIndex(t => t.id === analyzeTask.id) + 1;
  if (suggestions.notify) {
    state.tasks.splice(insertAt++, 0, makeTask('notify', { channelId: 'slack', recipient: '#legal-review', message: '', condition: 'overall risk is High' }));
  }
  if (suggestions.save) {
    state.tasks.splice(insertAt++, 0, makeTask('save', { platformId: 'salesforce', mappings: {} }));
  }

  editingTaskId = null;
  pendingInsertIndex = null;
  pbOpenAddQuestionFor = null;
  document.getElementById('subflow-overlay').classList.remove('show');
  renderFlowCanvas();
  showToast('Analyze task saved' + ((suggestions.notify || suggestions.save) ? ' — downstream tasks added.' : '.'));
}

// SAVE (destination + field mapping)
// Which fields a Save step can read: whatever an upstream Extract produced.
// The canvas passes them on the config; the wizard looks at its task list;
// otherwise fall back to the sample schema so the step is never empty.
function saveSourceFields(config) {
  if (config.sourceFields && config.sourceFields.length) return config.sourceFields.slice();
  if (typeof state !== 'undefined' && state.tasks) {
    const extract = state.tasks.filter(function (t) { return t.type === 'extract'; }).pop();
    if (extract && extract.config.schema && extract.config.schema.length) {
      return extract.config.schema.map(function (f) { return f.name; });
    }
  }
  return EXTRACT_SAMPLE_SCHEMA.map(function (f) { return f.name; });
}

function renderSaveSubflow(panel, config, subStep) {
  const steps = ['Choose destination', 'Select object', 'Map fields'];

  if (subStep === 0) {
    panel.innerHTML = subflowShell('Save', steps, 0, `
      <div class="platform-grid">
        ${DESTINATION_PLATFORMS.map(p => `
          <div class="platform-tile ${config.platformId === p.id ? 'selected' : ''}" data-platform="${p.id}">
            <div class="platform-icon" style="background:${p.color}">${p.initials}</div>
            <div class="platform-name">${escapeHtml(p.name)}</div>
            <div class="${p.connected ? 'platform-connected' : 'platform-disconnected'}">${p.connected ? '● Connected' : '○ Not connected'}</div>
          </div>
        `).join('')}
      </div>
    `, `
      <button class="btn btn-outline" id="sf-cancel">Cancel</button>
      <button class="btn btn-primary" id="sf-next" ${config.platformId ? '' : 'disabled'}>Next</button>
    `);
    bindSubflowClose();
    document.querySelectorAll('.platform-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        if (config.platformId !== tile.dataset.platform) {
          // a different platform means a different object and field list
          config.platformId = tile.dataset.platform;
          config.objectId = null;
          config.mappings = {};
        }
        renderSubflow('save', config, 0);
      });
    });
    document.getElementById('sf-cancel')?.addEventListener('click', closeSubflow);
    document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('save', config, 1));

  } else if (subStep === 1) {
    const platform = DESTINATION_PLATFORMS.find(p => p.id === config.platformId);
    const objects = destinationObjectsFor(config.platformId);
    panel.innerHTML = subflowShell('Save', steps, 1, `
      <p class="field-hint" style="margin-bottom:14px;">
        Which ${escapeHtml(platform ? platform.name : '')} record should this write to? The object decides
        which fields are available to map.
      </p>
      <div class="sdocs-template-list">
        ${objects.map(o => `
          <div class="sdocs-template-row ${config.objectId === o.id ? 'selected' : ''}" data-object="${o.id}">
            <span class="sdocs-template-radio"></span>
            <div class="sdocs-template-body">
              <div class="sdocs-template-name">${escapeHtml(o.name)}</div>
              <div class="sdocs-template-meta">${escapeHtml(o.description)}</div>
              <div class="sdocs-template-fields">
                ${o.fields.length} fields: ${o.fields.slice(0, 5).map(f => `<code>${escapeHtml(f)}</code>`).join(' ')}${o.fields.length > 5 ? ' &hellip;' : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-next" ${config.objectId ? '' : 'disabled'}>Next</button>
    `);
    bindSubflowClose();
    panel.querySelectorAll('[data-object]').forEach(row => {
      row.addEventListener('click', () => {
        if (config.objectId !== row.dataset.object) {
          config.objectId = row.dataset.object;
          config.mappings = {}; // re-map against the new object's fields
        }
        renderSubflow('save', config, 1);
      });
    });
    document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('save', config, 0));
    document.getElementById('sf-next')?.addEventListener('click', () => renderSubflow('save', config, 2));

  } else {
    const obj = findDestinationObject(config.platformId, config.objectId);
    const destFields = obj ? obj.fields : [];
    const fields = saveSourceFields(config);
    config.mappings = config.mappings || {};
    if (!Object.keys(config.mappings).length) {
      config.mappings = autoMapFields(fields, destFields);
    }
    const unmapped = fields.filter(f => !config.mappings[f]).length;
    panel.innerHTML = subflowShell('Save', steps, 2, `
      <p class="field-hint" style="margin-bottom:8px;">
        Mapping the extracted fields onto <strong>${escapeHtml(obj ? obj.name : 'the destination')}</strong>.
        ${unmapped ? `${unmapped} field${unmapped === 1 ? '' : 's'} still need${unmapped === 1 ? 's' : ''} a destination.` : 'Everything is mapped.'}
      </p>
      ${fields.map(f => `
        <div class="mapping-row">
          <span class="map-status-icon ${config.mappings[f] ? 'mapped' : 'unmapped'}">${config.mappings[f] ? '✓' : '!'}</span>
          <span class="mapping-field">${escapeHtml(f)}</span>
          <span class="mapping-arrow">&rarr;</span>
          <select class="mapping-select" data-field="${f}">
            <option value="">Don&rsquo;t save this field&hellip;</option>
            ${destFields.map(df => `<option value="${df}" ${config.mappings[f] === df ? 'selected' : ''}>${escapeHtml(df)}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    `, `
      <button class="btn btn-outline" id="sf-back">Back</button>
      <button class="btn btn-primary" id="sf-save">Save task</button>
    `);
    bindSubflowClose();
    document.getElementById('sf-back')?.addEventListener('click', () => renderSubflow('save', config, 1));
    panel.querySelectorAll('.mapping-select').forEach(sel => {
      sel.addEventListener('change', () => { config.mappings[sel.dataset.field] = sel.value; renderSubflow('save', config, 2); });
    });
    document.getElementById('sf-save')?.addEventListener('click', () => saveTaskConfig('save', config));
  }
}

// NOTIFY
function renderNotifySubflow(panel, config, subStep) {
  const channel = NOTIFY_CHANNELS.find(c => c.id === config.channelId);
  panel.innerHTML = `
    <div class="subflow-header">
      <h3>Notify</h3>
      <button class="icon-btn" id="subflow-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="subflow-body">
      <div class="field-group">
        <label>Channel</label>
        <div class="channel-grid">
          ${NOTIFY_CHANNELS.map(c => `
            <div class="channel-tile ${config.channelId === c.id ? 'selected' : ''}" data-channel="${c.id}">
              <div class="channel-icon" style="background:${c.color}">${c.initials}</div>
              <div class="channel-name">${escapeHtml(c.name)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${config.channelId ? `
        <div class="field-group">
          <label>Recipient</label>
          <select class="text-input" id="notify-recipient">
            ${NOTIFY_RECIPIENTS[config.channelId].map(r => `<option value="${escapeHtml(r)}" ${config.recipient === r ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label>Message template</label>
          <textarea class="textarea-large" id="notify-message" style="min-height:100px;" placeholder="e.g. Heads up — {{agent_name}} just flagged something that needs your review.">${escapeHtml(config.message || defaultNotifyMessage())}</textarea>
        </div>
        <div class="field-group">
          <label>Only notify when (optional)</label>
          <div class="field-hint">Leave blank to notify every time this task runs.</div>
          <input type="text" class="text-input" id="notify-condition" value="${escapeHtml(config.condition || '')}" placeholder="e.g. overall risk is High">
        </div>
      ` : `<p class="field-hint">Choose a channel to continue.</p>`}
    </div>
    <div class="subflow-footer">
      <button class="btn btn-outline" id="sf-cancel">Cancel</button>
      <button class="btn btn-primary" id="sf-save" ${config.channelId ? '' : 'disabled'}>Save task</button>
    </div>
  `;
  bindSubflowClose();
  document.querySelectorAll('.channel-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      config.channelId = tile.dataset.channel;
      config.recipient = NOTIFY_RECIPIENTS[config.channelId][0];
      renderNotifySubflow(panel, config, 0);
    });
  });
  document.getElementById('sf-cancel')?.addEventListener('click', closeSubflow);
  const recipientSel = document.getElementById('notify-recipient');
  if (recipientSel) recipientSel.addEventListener('change', e => config.recipient = e.target.value);
  const msgArea = document.getElementById('notify-message');
  if (msgArea) msgArea.addEventListener('input', e => config.message = e.target.value);
  const conditionInput = document.getElementById('notify-condition');
  if (conditionInput) conditionInput.addEventListener('input', e => config.condition = e.target.value);
  document.getElementById('sf-save')?.addEventListener('click', () => {
    if (!config.message) config.message = defaultNotifyMessage();
    saveTaskConfig('notify', config);
  });
}

function defaultNotifyMessage() {
  return `Heads up — ${state.name || 'your agent'} just completed a task and wanted to let you know.`;
}

// ---------------------------------------------------------------
// Step 7: Review
// ---------------------------------------------------------------

function renderReview() {
  const connectedList = Object.keys(state.connectors).filter(id => state.connectors[id]).map(id => findConnector(id));
  const model = LLM_MODELS.find(m => m.id === state.model);

  document.getElementById('review-content').innerHTML = `
    <div class="review-section">
      <div class="review-section-head"><h4>Name &amp; role</h4><button class="review-edit-link" data-goto="1">Edit</button></div>
      <div class="review-card">
        <strong>${escapeHtml(state.name || 'Untitled agent')}</strong>
        <div class="review-role">${escapeHtml(state.role || 'No description provided.')}</div>
      </div>
    </div>

    <div class="review-section">
      <div class="review-section-head"><h4>Guardrails</h4><button class="review-edit-link" data-goto="2">Edit</button></div>
      <div class="review-card">
        Tone: <strong>${escapeHtml(state.tone)}</strong> &middot; Voice: <strong>${escapeHtml(state.voice)}</strong> &middot; Caution: <strong>${CAUTION_LABELS[state.caution]}</strong>
        ${state.guardrailNotes ? `<div class="review-role">${escapeHtml(state.guardrailNotes)}</div>` : ''}
      </div>
    </div>

    <div class="review-section">
      <div class="review-section-head"><h4>Model</h4><button class="review-edit-link" data-goto="3">Edit</button></div>
      <div class="review-card">
        <strong>${escapeHtml(model ? model.name : 'Not selected')}</strong>
        ${model ? `<div class="review-role">${escapeHtml(model.version)}</div>` : ''}
      </div>
    </div>

    <div class="review-section">
      <div class="review-section-head"><h4>Data sources</h4><button class="review-edit-link" data-goto="4">Edit</button></div>
      <div class="review-card">
        ${connectedList.length
          ? `<div class="review-tags">${connectedList.map(c => `<span class="task-chip" style="color:${c.color};background:${c.color}1a;">${escapeHtml(c.name)}</span>`).join('')}</div>`
          : 'No data sources connected yet.'}
      </div>
    </div>

    <div class="review-section">
      <div class="review-section-head"><h4>Triggers</h4><button class="review-edit-link" data-goto="5">Edit</button></div>
      <div class="review-card">
        <div class="review-tags">${activeTriggerKeys().map(key => `<span class="task-chip" style="color:${TRIGGER_TYPES[key].color};background:${TRIGGER_TYPES[key].color}1a;">${TRIGGER_TYPES[key].label}</span>`).join('')}</div>
        <div class="review-role">${activeTriggerKeys().map(key => triggerSummaryText(key)).join(' &middot; ')}</div>
      </div>
    </div>

    <div class="review-section">
      <div class="review-section-head"><h4>Tasks (${state.tasks.length})</h4><button class="review-edit-link" data-goto="6">Edit</button></div>
      ${state.tasks.length ? state.tasks.map((task, i) => `
        <div class="review-card" style="margin-bottom:8px;display:flex;gap:10px;align-items:center;">
          <span class="task-order">${i + 1}</span>
          ${taskChipReview(task.type)}
          <span>${taskSummary(task)}</span>
        </div>
      `).join('') : `<div class="review-card">No tasks defined yet.</div>`}
    </div>
  `;

  document.querySelectorAll('.review-edit-link').forEach(btn => {
    btn.addEventListener('click', () => goToStep(Number(btn.dataset.goto)));
  });
}

function triggerSummaryText(key) {
  const cfg = state.triggers[key];
  switch (key) {
    case 'manual': return 'Anyone with access can run it manually';
    case 'slack': return `Slack: ${cfg.invocationPhrase || '@agent'} in ${cfg.channelPattern || 'a channel'}`;
    case 'email': return `Email to ${cfg.inboxAddress}`;
    case 'webhook': return `Webhook: ${cfg.url}`;
    case 'schedule': return `${cfg.frequency}${cfg.frequency !== 'Daily' ? ' on ' + cfg.day : ''} at ${cfg.time}`;
    default: return '';
  }
}

function taskChipReview(typeKey) {
  const t = TASK_TYPES[typeKey];
  return `<span class="task-chip ${t.key}">${t.label}</span>`;
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
if (document.getElementById('panel-0')) goToStep(0);
