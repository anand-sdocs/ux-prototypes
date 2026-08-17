// "Build with AI" — a scripted, two-pane conversational builder.
// The conversation is canned (no real model), but every piece of state it
// writes into — connectors, triggers, tasks, guardrails — is the exact same
// `state` object and rendering/config code the manual wizard (builder.js) uses.
// Clicking a node in the left-pane canvas opens the same subflow modals.

const DEMO_PROMPT = "Build a claims intake agent that reads incoming claim forms from email, extracts the claim details, checks them against our policy playbook, and saves approved claims to Salesforce — notifying our #claims-ops Slack channel either way.";

let connectingId = null; // which connector THIS page most recently opened the modal for
let openMiniCards = {}; // taskId -> { row, refresh() } for chat mini-cards still visible

function scrollChatToBottom() {
  const thread = document.getElementById('ai-chat-thread');
  thread.scrollTop = thread.scrollHeight;
}

function appendAssistantMessage(html) {
  const thread = document.getElementById('ai-chat-thread');
  const row = document.createElement('div');
  row.className = 'ai-msg-row assistant';
  row.innerHTML = `<div class="ai-msg-avatar">✨</div><div class="ai-msg-bubble">${html}</div>`;
  thread.appendChild(row);
  scrollChatToBottom();
  return row;
}

function appendUserMessage(text) {
  const thread = document.getElementById('ai-chat-thread');
  const row = document.createElement('div');
  row.className = 'ai-msg-row user';
  row.innerHTML = `<div class="ai-msg-avatar">${CURRENT_USER_INITIALS}</div><div class="ai-msg-bubble">${escapeHtml(text)}</div>`;
  thread.appendChild(row);
  scrollChatToBottom();
}

const CURRENT_USER_INITIALS = 'AN';

function showTypingThen(callback, delay) {
  const row = appendAssistantMessage(`<span class="ai-typing-dots"><span></span><span></span><span></span></span>`);
  setTimeout(() => {
    row.remove();
    callback();
  }, delay || 900);
}

function setComposer(enabled, placeholder, value) {
  const input = document.getElementById('ai-composer-input');
  const btn = document.getElementById('ai-send-btn');
  input.disabled = !enabled;
  btn.disabled = !enabled;
  input.placeholder = placeholder || (enabled ? "Type a reply…" : "Use the options above to continue");
  if (value != null) input.value = value;
}

// ---------------------------------------------------------------
// Left pane — live summary + the shared flow canvas
// ---------------------------------------------------------------

function renderAiSummary() {
  const stack = document.getElementById('ai-summary-stack');
  const cards = [];

  cards.push(state.name
    ? `<div class="ai-summary-card"><div class="ai-summary-label">Name &amp; role</div><div class="ai-summary-value">${escapeHtml(state.name)}</div><div class="ai-summary-sub">${escapeHtml(state.role)}</div></div>`
    : `<div class="ai-summary-card pending">Name &amp; role — not set yet</div>`);

  const connected = Object.keys(state.connectors).filter(id => state.connectors[id]);
  cards.push(connected.length
    ? `<div class="ai-summary-card"><div class="ai-summary-label">Data sources</div><div class="review-tags">${connected.map(id => { const c = CONNECTORS.find(x => x.id === id); return `<span class="task-chip" style="color:${c.color};background:${c.color}1a;">${escapeHtml(c.name)}</span>`; }).join('')}</div></div>`
    : `<div class="ai-summary-card pending">Data sources — not connected yet</div>`);

  const activeTriggers = activeTriggerKeys();
  cards.push(`<div class="ai-summary-card"><div class="ai-summary-label">Triggers</div><div class="review-tags">${activeTriggers.map(key => `<span class="task-chip" style="color:${TRIGGER_TYPES[key].color};background:${TRIGGER_TYPES[key].color}1a;">${TRIGGER_TYPES[key].label}</span>`).join('')}</div></div>`);

  cards.push(`<div class="ai-summary-card"><div class="ai-summary-label">Guardrails</div><div class="ai-summary-value">${escapeHtml(state.tone)} tone &middot; ${escapeHtml(state.voice)}</div></div>`);

  stack.innerHTML = cards.join('');
}

function refreshOpenMiniCards() {
  Object.values(openMiniCards).forEach(entry => entry.refresh());
}
onFlowCanvasUpdate = () => { renderAiSummary(); refreshOpenMiniCards(); };

// ---------------------------------------------------------------
// Conversation script
// ---------------------------------------------------------------

function initConversation() {
  renderAiSummary();
  renderFlowCanvas();

  appendAssistantMessage(`Hi! Tell me what you'd like this agent to do, and I'll start building it on the left as we go.`);
  setComposer(true, "Describe the agent you want…", DEMO_PROMPT);

  document.getElementById('ai-send-btn').addEventListener('click', handleFirstSend);
  document.getElementById('ai-composer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFirstSend(); }
  });
}

function handleFirstSend() {
  const input = document.getElementById('ai-composer-input');
  const text = input.value.trim();
  if (!text) return;
  appendUserMessage(text);
  setComposer(false, null, '');

  showTypingThen(() => {
    draftFromPrompt(text);
    // draftFromPrompt marks mentioned connectors as already-connected (fine for
    // the manual wizard's single-shot NL entry) — here we want to actually walk
    // through connecting them, so treat them as suggestions instead.
    const suggestedConnectors = Object.keys(state.connectors).filter(id => state.connectors[id]);
    state.connectors = {};
    renderAiSummary();
    renderFlowCanvas();
    appendAssistantMessage(`Got it — I'll call this the <strong>${escapeHtml(state.name)}</strong>. Here's how I understand its role:<br>${escapeHtml(state.role)}`);
    setTimeout(() => stepDataSources(suggestedConnectors), 600);
  }, 1100);
}

function stepDataSources(suggested) {
  showTypingThen(() => {
    const row = appendAssistantMessage(`
      Based on that, this agent will need access to: ${suggested.map(id => `<strong>${escapeHtml(CONNECTORS.find(c => c.id === id).name)}</strong>`).join(', ')}. Connect them now, or skip and do it later.
      <div class="ai-inline-connect-row" id="ai-connect-row"></div>
      <div class="ai-quick-replies"><button class="ai-quick-reply" id="ai-continue-sources">Continue</button></div>
    `);
    renderConnectRow(row, suggested);
    document.getElementById('ai-continue-sources').addEventListener('click', () => {
      disableQuickReplies(row);
      appendUserMessage('Continue');
      setTimeout(stepTriggers, 500);
    });
  });
}

function renderConnectRow(row, ids) {
  const container = row.querySelector('#ai-connect-row');
  container.innerHTML = ids.map(id => {
    const c = CONNECTORS.find(x => x.id === id);
    const isConnected = !!state.connectors[id];
    return `
      <button class="ai-inline-connect-btn ${isConnected ? 'connected' : ''}" data-connect="${id}" ${isConnected ? 'disabled' : ''}>
        <span class="mini-connector-icon ${c.logo ? 'has-logo' : ''}" style="background:${c.color}">${connectorIconInner(c)}</span>
        ${isConnected ? `✓ Connected to ${escapeHtml(c.name)}` : `Connect ${escapeHtml(c.name)}`}
      </button>
    `;
  }).join('');
  container.querySelectorAll('[data-connect]').forEach(btn => {
    btn.addEventListener('click', () => {
      connectingId = btn.dataset.connect;
      openConnectorModal(connectingId);
    });
  });
}

document.getElementById('connector-modal-confirm').addEventListener('click', () => {
  if (!connectingId) return;
  renderAiSummary();
  const row = [...document.querySelectorAll('#ai-connect-row')].pop();
  if (row) {
    const c = CONNECTORS.find(x => x.id === connectingId);
    const btn = row.querySelector(`[data-connect="${connectingId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('connected');
      btn.innerHTML = `<span class="mini-connector-icon ${c.logo ? 'has-logo' : ''}" style="background:${c.color}">${connectorIconInner(c)}</span> ✓ Connected to ${escapeHtml(c.name)}`;
    }
  }
  connectingId = null;
});

function stepTriggers() {
  const mentionsEmailTrigger = state.triggers.email.enabled;
  showTypingThen(() => {
    const row = appendAssistantMessage(`
      How should this agent start? <strong>Manual</strong> is always available.
      ${mentionsEmailTrigger ? `Since it reads incoming email, I've also turned on the <strong>Email</strong> trigger — sound good?` : `Want to add anything else, like a schedule or Slack mention?`}
      <div class="ai-quick-replies">
        <button class="ai-quick-reply" data-choice="keep">Yes, that works</button>
        <button class="ai-quick-reply" data-choice="schedule">Also add a weekly schedule</button>
      </div>
    `);
    row.querySelectorAll('.ai-quick-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        disableQuickReplies(row);
        appendUserMessage(btn.textContent);
        if (btn.dataset.choice === 'schedule') {
          state.triggers.schedule.enabled = true;
          state.triggers.schedule.frequency = 'Weekly';
          state.triggers.schedule.day = 'Monday';
          renderFlowCanvas();
        }
        setTimeout(stepGuardrails, 500);
      });
    });
  });
}

function stepGuardrails() {
  showTypingThen(() => {
    const row = appendAssistantMessage(`
      I'll keep the tone <strong>Professional</strong> and write in first person by default. Want to adjust that?
      <div class="ai-quick-replies">
        <button class="ai-quick-reply" data-choice="keep">Keep it professional</button>
        <button class="ai-quick-reply" data-choice="friendly">Make it more friendly</button>
      </div>
    `);
    row.querySelectorAll('.ai-quick-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        disableQuickReplies(row);
        appendUserMessage(btn.textContent);
        if (btn.dataset.choice === 'friendly') state.tone = 'Friendly';
        renderAiSummary();
        setTimeout(() => stepTask(0), 500);
      });
    });
  });
}

function stepTask(index) {
  if (index >= state.tasks.length) { stepFinish(); return; }
  const task = state.tasks[index];
  const t = TASK_TYPES[task.type];

  showTypingThen(() => {
    const row = appendAssistantMessage(`
      Next, ${/^[aeiou]/i.test(t.label) ? 'an' : 'a'} <strong>${t.label}</strong> step:
      <div class="ai-task-mini-card" id="mini-card-${task.id}">
        <div class="ai-task-mini-head">
          <div class="task-icon" style="background:${t.color}">${t.label[0]}</div>
          <div>
            <div class="ai-task-mini-title">${t.label}</div>
            <div class="ai-task-mini-detail" id="mini-detail-${task.id}">${taskSummary(task)}</div>
          </div>
        </div>
        <div class="ai-task-mini-actions">
          <button class="ai-quick-reply" id="mini-configure-${task.id}">Configure details</button>
          <button class="ai-quick-reply" id="mini-good-${task.id}">Looks good</button>
        </div>
      </div>
    `);

    openMiniCards[task.id] = {
      row,
      refresh() {
        const detailEl = document.getElementById(`mini-detail-${task.id}`);
        if (detailEl) detailEl.innerHTML = taskSummary(task);
      },
    };

    document.getElementById(`mini-configure-${task.id}`).addEventListener('click', () => {
      openSubflow(task.type, task.id);
    });
    document.getElementById(`mini-good-${task.id}`).addEventListener('click', () => {
      document.getElementById(`mini-configure-${task.id}`).disabled = true;
      document.getElementById(`mini-good-${task.id}`).disabled = true;
      delete openMiniCards[task.id];
      appendUserMessage('Looks good');
      setTimeout(() => stepTask(index + 1), 500);
    });
  });
}

function stepFinish() {
  showTypingThen(() => {
    appendAssistantMessage(`
      That's your <strong>${escapeHtml(state.name)}</strong>, ready to go. Take a look on the left &mdash; you can still tweak anything by clicking it &mdash; then create it when you're happy.
    `);
    document.getElementById('ai-create-header-slot').innerHTML = `<button class="btn btn-primary" id="btn-create-agent">Create agent</button>`;
    document.getElementById('btn-create-agent').addEventListener('click', createAgent);
  });
}

function disableQuickReplies(row) {
  row.querySelectorAll('.ai-quick-reply').forEach(b => b.disabled = true);
}

document.getElementById('btn-exit').addEventListener('click', () => { window.location.href = 'index.html'; });

document.addEventListener('DOMContentLoaded', initConversation);
