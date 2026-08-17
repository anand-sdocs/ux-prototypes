// Slack-agent-user prototype — a scripted, simulated Slack conversation.
// No real Slack, S-Docs, or MCP calls are made; everything plays from schema.js data.

const state = {
  connected: false,
  attachedFile: null,
  turnInProgress: false,
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function scrollThreadToBottom() {
  const thread = document.getElementById('thread');
  thread.scrollTop = thread.scrollHeight;
}

// ---------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------

function renderSidebar() {
  document.getElementById('channel-list').innerHTML = CHANNELS.map(c => `
    <div class="sidebar-item"><span class="hash">#</span> ${escapeHtml(c)}</div>
  `).join('');
  document.getElementById('dm-list').innerHTML = DMS.map(d => `
    <div class="sidebar-item"><span class="dm-dot"></span> ${escapeHtml(d)}</div>
  `).join('');
}

// ---------------------------------------------------------------
// Thread message rendering
// ---------------------------------------------------------------

function appendMessage({ from, html, sender }) {
  const thread = document.getElementById('thread');
  const row = document.createElement('div');
  row.className = 'msg-row';
  const avatarClass = from === 'agent' ? 'agent' : 'user';
  const avatarText = from === 'agent' ? AGENT.initials : CURRENT_USER.initials;
  const senderName = sender || (from === 'agent' ? AGENT.name : CURRENT_USER.name);
  row.innerHTML = `
    <div class="msg-avatar ${avatarClass}">${avatarText}</div>
    <div class="msg-body">
      <div class="msg-head"><span class="msg-sender">${escapeHtml(senderName)}</span><span class="msg-time">${nowTime()}</span></div>
      <div class="msg-text">${html}</div>
    </div>
  `;
  thread.appendChild(row);
  scrollThreadToBottom();
  return row;
}

function agentTextMessage(text, extraHtml) {
  return appendMessage({ from: 'agent', html: `${escapeHtml(text)}${extraHtml || ''}` });
}

// ---------------------------------------------------------------
// Boot sequence — welcome message with connect card
// ---------------------------------------------------------------

function boot() {
  renderSidebar();
  agentTextMessage(SCRIPT.welcome.text, `
    <div class="connect-card">
      <p>Connect your S-Docs account to let this agent read documents and check policies on your behalf.</p>
      <button class="btn btn-primary btn-sm" id="connect-btn">Connect to S-Docs</button>
    </div>
  `);
  document.getElementById('connect-btn').addEventListener('click', openConnectModal);
}

// ---------------------------------------------------------------
// Connect modal
// ---------------------------------------------------------------

function openConnectModal() {
  document.getElementById('connect-modal').classList.add('show');
}
document.getElementById('connect-cancel').addEventListener('click', () => {
  document.getElementById('connect-modal').classList.remove('show');
});
document.getElementById('connect-confirm').addEventListener('click', () => {
  document.getElementById('connect-modal').classList.remove('show');
  markConnected();
});

function markConnected() {
  state.connected = true;
  const pill = document.getElementById('connection-pill');
  pill.textContent = `● Connected as ${CURRENT_USER.email}`;
  pill.classList.remove('disconnected');
  pill.classList.add('connected');

  document.getElementById('composer-input').disabled = false;
  document.getElementById('composer-input').placeholder = 'Message Claims Intake Agent';
  document.getElementById('send-btn').disabled = false;

  agentTextMessage(SCRIPT.connected.text);
  showSuggestionChip();
}

function showSuggestionChip() {
  const attachments = document.getElementById('composer-attachments');
  attachments.innerHTML = `<span class="suggestion-chip" id="suggestion-chip">✨ ${escapeHtml(SCRIPT.suggestion)}</span>`;
  document.getElementById('suggestion-chip').addEventListener('click', () => {
    attachFile();
    document.getElementById('composer-input').value = 'Can you process this claim form?';
    sendMessage();
  });
}

// ---------------------------------------------------------------
// Composer
// ---------------------------------------------------------------

document.getElementById('attach-btn').addEventListener('click', () => {
  if (!state.connected) return;
  attachFile();
});

function attachFile() {
  state.attachedFile = ATTACHED_FILE;
  renderComposerAttachments();
}

function renderComposerAttachments() {
  const el = document.getElementById('composer-attachments');
  if (!state.attachedFile) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <span class="msg-file-chip">
      <span class="file-icon">PDF</span> ${escapeHtml(state.attachedFile.name)}
      <button class="composer-icon-btn" id="remove-attachment" style="padding:0 0 0 4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>
  `;
  document.getElementById('remove-attachment').addEventListener('click', (e) => {
    e.stopPropagation();
    state.attachedFile = null;
    renderComposerAttachments();
  });
}

document.getElementById('composer-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});
document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
  if (state.turnInProgress || !state.connected) return;
  const input = document.getElementById('composer-input');
  const text = input.value.trim();
  if (!text && !state.attachedFile) return;

  const fileHtml = state.attachedFile
    ? `<div class="msg-file-chip"><span class="file-icon">PDF</span> ${escapeHtml(state.attachedFile.name)} &middot; ${escapeHtml(state.attachedFile.size)}</div>`
    : '';
  appendMessage({ from: 'user', html: `${escapeHtml(text)}${fileHtml}` });

  const hadFile = !!state.attachedFile;
  input.value = '';
  state.attachedFile = null;
  renderComposerAttachments();

  runAgentTurn(hadFile);
}

// ---------------------------------------------------------------
// Agent turn — typing indicator -> MCP tool-call steps -> results card
// ---------------------------------------------------------------

function runAgentTurn(hasFile) {
  state.turnInProgress = true;
  setComposerEnabled(false);

  const typingRow = appendMessage({ from: 'agent', html: `<span class="typing-dots"><span></span><span></span><span></span></span>` });

  setTimeout(() => {
    typingRow.remove();
    if (!hasFile) {
      agentTextMessage("I'll need a claim form attached to process a claim — try attaching a PDF and asking again.");
      state.turnInProgress = false;
      setComposerEnabled(true);
      return;
    }
    runToolSteps(0);
  }, 900);
}

function runToolSteps(index) {
  if (index >= MCP_TOOL_STEPS.length) {
    renderResultsCard();
    state.turnInProgress = false;
    setComposerEnabled(true);
    return;
  }
  const step = MCP_TOOL_STEPS[index];
  const row = appendMessage({
    from: 'agent',
    html: `
      <div class="tool-step running" id="tool-step-${index}">
        <span class="tool-icon"><span class="spinner-sm"></span></span>
        <span>${escapeHtml(step.label)}</span>
        <span class="tool-name">${escapeHtml(step.tool)}</span>
      </div>
    `,
  });
  setTimeout(() => {
    const el = row.querySelector(`#tool-step-${index}`);
    el.classList.remove('running');
    el.classList.add('done');
    el.querySelector('.tool-icon').innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    `;
    runToolSteps(index + 1);
  }, step.duration);
}

function renderResultsCard() {
  const row = agentTextMessage("Here's what I found:", `
    <div class="results-card">
      <div class="results-card-head">
        <span class="rc-title">Extracted claim details</span>
        <span class="confidence-tag">${EXTRACTION_RESULT.confidence}% confidence</span>
      </div>
      <div class="results-card-body">
        ${EXTRACTION_RESULT.fields.map(f => `
          <div class="result-field-row"><span class="rf-label">${escapeHtml(f.label)}</span><span class="rf-value">${escapeHtml(f.value)}</span></div>
        `).join('')}
      </div>
      <div class="results-card-actions">
        <button class="btn btn-primary btn-sm" id="approve-btn">Save to Salesforce</button>
        <button class="btn btn-outline btn-sm" id="review-btn">Needs review</button>
      </div>
    </div>
  `);

  row.querySelector('#approve-btn').addEventListener('click', () => {
    row.querySelector('#approve-btn').disabled = true;
    row.querySelector('#review-btn').disabled = true;
    agentTextMessage('', `<span class="confirmation-banner">✓ Saved to Salesforce — Deal #48213</span>`);
  });
  row.querySelector('#review-btn').addEventListener('click', () => {
    row.querySelector('#approve-btn').disabled = true;
    row.querySelector('#review-btn').disabled = true;
    agentTextMessage("Flagged for manual review. You'll get a notification here once someone confirms it.");
  });
}

function setComposerEnabled(enabled) {
  document.getElementById('composer-input').disabled = !enabled || !state.connected;
  document.getElementById('send-btn').disabled = !enabled || !state.connected;
  document.getElementById('attach-btn').style.pointerEvents = enabled ? 'auto' : 'none';
}

document.addEventListener('DOMContentLoaded', boot);
