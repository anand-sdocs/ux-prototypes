// Slack-autonomous-contract-review prototype — a scripted, simulated Slack
// workspace. No real Slack, S-Docs, or MCP calls are made; everything plays
// from schema.js data.
//
// The idea: the agent is working in the background while the rep is doing
// something else entirely. It notices a redline came back, and interrupts
// with a notification — but it never acts on its own. Every step past that
// point is presented for the human to confirm.

const state = {
  activeView: 'channel', // 'channel' | 'agent'
  agentUnread: true,
  turnInProgress: false,
  step: 'idle', // idle -> awaiting-review -> showing-results -> done
  breakdownOpen: false,
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function mdInline(str) {
  return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
    <div class="sidebar-item ${state.activeView === 'channel' && c === ACTIVE_CHANNEL ? 'active' : ''} ${c === ACTIVE_CHANNEL ? '' : 'is-static'}" data-channel="${c}">
      <span class="hash">#</span> ${escapeHtml(c)}
    </div>
  `).join('');

  document.getElementById('app-list').innerHTML = `
    <div class="sidebar-item ${state.activeView === 'agent' ? 'active' : ''}" data-agent="1">
      <span class="agent-bot-icon">${escapeHtml(AGENT.initials)}</span>
      <span class="sidebar-item-label ${state.agentUnread ? 'unread' : ''}">${escapeHtml(AGENT.name)}</span>
      ${state.agentUnread ? '<span class="unread-badge">1</span>' : ''}
    </div>
  `;

  const channelRow = document.querySelector(`.sidebar-item[data-channel="${ACTIVE_CHANNEL}"]`);
  if (channelRow) channelRow.addEventListener('click', openChannel);
  document.querySelector('.sidebar-item[data-agent]').addEventListener('click', openAgentChat);
}

// ---------------------------------------------------------------
// Header — swaps between a channel header and the bot DM header.
// ---------------------------------------------------------------

function renderHeader() {
  const header = document.getElementById('thread-header');
  if (state.activeView === 'agent') {
    header.innerHTML = `
      <div class="agent-icon-lg">${escapeHtml(AGENT.initials)}</div>
      <div>
        <div class="thread-title">${escapeHtml(AGENT.name)} <span class="bot-tag">Bot</span></div>
        <div class="thread-subtitle">Monitors deal threads for redlines and contract changes</div>
      </div>
    `;
  } else {
    header.innerHTML = `
      <div class="channel-icon-lg">#</div>
      <div>
        <div class="thread-title">${escapeHtml(ACTIVE_CHANNEL)}</div>
        <div class="thread-subtitle">4 members</div>
      </div>
    `;
  }
}

// ---------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------

function appendMessage({ avatarClass, avatarText, sender, html }) {
  const thread = document.getElementById('thread');
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-avatar ${avatarClass}">${escapeHtml(avatarText)}</div>
    <div class="msg-body">
      ${sender ? `<div class="msg-head"><span class="msg-sender">${escapeHtml(sender)}</span></div>` : ''}
      <div class="msg-text">${html}</div>
    </div>
  `;
  thread.appendChild(row);
  scrollThreadToBottom();
  return row;
}

function agentMessage(html) {
  return appendMessage({ avatarClass: 'agent', avatarText: AGENT.initials, sender: AGENT.name, html });
}

function agentCard(html) {
  return agentMessage(`<div class="slack-card">${html}</div>`);
}

function clearThread() {
  document.getElementById('thread').innerHTML = '';
}

// ---------------------------------------------------------------
// Channel view — ordinary work, unrelated to the redline. This is what the
// rep is looking at when the prototype opens.
// ---------------------------------------------------------------

function openChannel() {
  state.activeView = 'channel';
  renderSidebar();
  renderHeader();
  renderChannelThread();
}

function renderChannelThread() {
  clearThread();
  CHANNEL_THREAD.forEach(m => {
    appendMessage({ avatarClass: 'user', avatarText: m.initials, sender: m.from, html: `${escapeHtml(m.text)}<span class="msg-time-inline">${escapeHtml(m.time)}</span>` });
  });
}

// ---------------------------------------------------------------
// Boot — the rep is in #deal-desk, not the agent DM, when this opens.
// ---------------------------------------------------------------

function boot() {
  renderSidebar();
  renderHeader();
  renderChannelThread();
  setTimeout(showToast, 1800);
}

function checkIconHtml() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
}

function showToast() {
  if (state.activeView === 'agent') return;
  const root = document.getElementById('toast-root');
  root.innerHTML = `
    <div class="slack-toast" id="agent-toast">
      <div class="slack-toast-head">
        <span class="slack-toast-app">Slack &middot; Acme Corp</span>
        <button class="slack-toast-close" id="toast-close" title="Dismiss">&times;</button>
      </div>
      <div class="slack-toast-body">
        <div class="slack-toast-avatar">${escapeHtml(AGENT.initials)}</div>
        <div class="slack-toast-main">
          <div class="slack-toast-name">${escapeHtml(AGENT.name)}</div>
          <div class="slack-toast-preview">${escapeHtml(SCRIPT.toastPreview)}</div>
        </div>
      </div>
    </div>
  `;
  const toastEl = document.getElementById('agent-toast');
  requestAnimationFrame(() => toastEl.classList.add('show'));
  toastEl.addEventListener('click', (e) => {
    if (e.target.id === 'toast-close') return;
    dismissToast();
    openAgentChat();
  });
  document.getElementById('toast-close').addEventListener('click', (e) => {
    e.stopPropagation();
    dismissToast();
  });
}

function dismissToast() {
  const toastEl = document.getElementById('agent-toast');
  if (!toastEl) return;
  toastEl.classList.remove('show');
  setTimeout(() => { document.getElementById('toast-root').innerHTML = ''; }, 200);
}

function openAgentChat() {
  const alreadyOpened = state.activeView === 'agent';
  state.activeView = 'agent';
  state.agentUnread = false;
  renderSidebar();
  renderHeader();
  if (!alreadyOpened) {
    clearThread();
    setTimeout(renderNotifyCard, 400);
  }
}

// ---------------------------------------------------------------
// Step 1 — proactive notification card, quoting what it saw.
// ---------------------------------------------------------------

function renderNotifyCard() {
  state.step = 'awaiting-review';
  const row = agentCard(`
    <div class="slack-card-eyebrow">${escapeHtml(SCRIPT.notifyEyebrow)}</div>
    <p class="slack-card-lead">${mdInline(SCRIPT.notifyBody)}</p>
    <div class="slack-quote-block">
      <div class="slack-quote-head">
        <span class="slack-quote-from">${escapeHtml(TRIGGER_EMAIL.from)}</span>
        <span class="slack-quote-role">${escapeHtml(TRIGGER_EMAIL.fromTitle)}</span>
      </div>
      <div class="slack-quote-subject">${escapeHtml(TRIGGER_EMAIL.subject)}</div>
      <div class="slack-quote-snippet">${escapeHtml(TRIGGER_EMAIL.snippet)}</div>
      <div class="slack-attachment-chip"><span class="file-icon">DOC</span> ${escapeHtml(TRIGGER_EMAIL.attachment)}</div>
      <div class="slack-quote-source">Email &middot; inbox monitored via connector &middot; ${escapeHtml(TRIGGER_EMAIL.receivedAt)}</div>
    </div>
    <div class="slack-card-actions">
      <button class="btn btn-primary btn-sm" id="review-yes-btn">Yes, review it</button>
      <button class="btn btn-outline btn-sm" id="review-no-btn">Not now</button>
    </div>
  `);
  row.querySelector('#review-yes-btn').addEventListener('click', () => {
    row.querySelector('#review-yes-btn').disabled = true;
    row.querySelector('#review-no-btn').disabled = true;
    runReviewFlow();
  });
  row.querySelector('#review-no-btn').addEventListener('click', () => {
    row.querySelector('#review-yes-btn').disabled = true;
    row.querySelector('#review-no-btn').disabled = true;
    agentMessage(`<span class="slack-plain-text">${mdInline(SCRIPT.declineReply)}</span>`);
  });
}

// ---------------------------------------------------------------
// Step 2 — run the diff/score tool-call chain.
// ---------------------------------------------------------------

function runReviewFlow() {
  agentMessage(`<span class="slack-plain-text">${mdInline(SCRIPT.workingIntro)}</span>`);
  const steps = buildToolSteps();
  runToolSteps(steps, 0);
}

function runToolSteps(steps, index) {
  if (index >= steps.length) {
    renderResultsCard();
    return;
  }
  const step = steps[index];
  const row = agentMessage(`
    <div class="tool-step running" id="tool-step-${index}">
      <span class="tool-icon"><span class="spinner-sm"></span></span>
      <span>${escapeHtml(step.label)}</span>
      <span class="tool-name">${escapeHtml(step.tool)}</span>
    </div>
  `);
  setTimeout(() => {
    const el = row.querySelector(`#tool-step-${index}`);
    el.classList.remove('running');
    el.classList.add('done');
    el.querySelector('.tool-icon').innerHTML = checkIconHtml();
    runToolSteps(steps, index + 1);
  }, step.duration);
}

// ---------------------------------------------------------------
// Step 3 — results: risk score, key changes, full playbook breakdown,
// and the human-in-the-loop action buttons.
// ---------------------------------------------------------------

function verdictIconHtml(favorable) {
  return favorable
    ? `<span class="verdict-icon favorable">${checkIconHtml()}</span>`
    : `<span class="verdict-icon unfavorable"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>`;
}

function renderKeyChangeCard(change) {
  const questions = change.affectedQuestions.map(id => questionById(id));
  return `
    <div class="key-change-row ${change.impact}">
      <div class="key-change-icon">${change.impact === 'worse'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>'}</div>
      <div class="key-change-body">
        <div class="key-change-heading">${escapeHtml(change.heading)}</div>
        <div class="key-change-desc">${escapeHtml(change.description)}</div>
        <div class="key-change-weights">${questions.map(q => `<span class="weight-tag">${escapeHtml(q.weight)}</span>`).join('')}</div>
      </div>
    </div>
  `;
}

function renderCategoryBreakdown() {
  return PLAYBOOK.map(cat => {
    const results = cat.questions.map(q => ({ q, r: REDLINE_RESULTS[q.id] }));
    const favorableCount = results.filter(({ q, r }) => r && r.answer === q.desiredAnswer).length;
    const unfavorableCount = results.length - favorableCount;
    return `
      <div class="category-card">
        <div class="category-head">
          <span class="category-name">${escapeHtml(cat.name)}</span>
          <span class="category-tally">${favorableCount} favorable &middot; ${unfavorableCount} flagged</span>
        </div>
        <div class="category-questions">
          ${results.map(({ q, r }) => {
            const favorable = r.answer === q.desiredAnswer;
            const clause = CONTRACT.clauses.find(c => c.id === r.clauseId);
            return `
              <div class="question-row">
                <div class="question-row-head">
                  ${verdictIconHtml(favorable)}
                  <span class="question-text">${escapeHtml(q.text)}</span>
                </div>
                <div class="question-meta-row">
                  <span class="weight-tag">${escapeHtml(q.weight)}</span>
                  <span class="answer-tag ${favorable ? 'favorable' : 'unfavorable'}">${escapeHtml(r.answer)}</span>
                  ${clause ? `<span class="clause-ref">Clause ${escapeHtml(clause.id)}</span>` : ''}
                </div>
                <div class="excerpt-quote">${escapeHtml(r.excerpt)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderResultsCard() {
  state.step = 'showing-results';
  const before = computeScore(ORIGINAL_RESULTS);
  const after = computeScore(REDLINE_RESULTS);
  const auditUrl = 'audit.html?run=run-51092';

  const row = agentCard(`
    <div class="results-header">
      <div class="results-header-title">${escapeHtml(CONTRACT.title)} &mdash; Northwind Traders</div>
      <div class="score-shift-row">
        <div class="score-shift-item">
          <span class="score-shift-label">Before redline</span>
          <span class="risk-band-pill" style="background:${before.band.bg};color:${before.band.color};">${escapeHtml(before.band.label)}</span>
          <span class="risk-score-pct">${formatPct(before.pct)}</span>
        </div>
        <div class="score-shift-arrow">&rarr;</div>
        <div class="score-shift-item">
          <span class="score-shift-label">After redline</span>
          <span class="risk-band-pill" style="background:${after.band.bg};color:${after.band.color};">${escapeHtml(after.band.label)}</span>
          <span class="risk-score-pct">${formatPct(after.pct)}</span>
        </div>
      </div>
      <div class="risk-score-note">${after.favorableCount} favorable &middot; ${after.unfavorableCount} flagged for review &middot; scored against the Legal Ops playbook</div>
    </div>

    <div class="slack-section-title">Key changes</div>
    <div class="key-change-list">
      ${KEY_CHANGES.map(renderKeyChangeCard).join('')}
    </div>

    <button class="breakdown-toggle-btn" id="breakdown-toggle">Show full playbook breakdown</button>
    <div class="category-breakdown" id="category-breakdown" style="display:none;">
      ${renderCategoryBreakdown()}
    </div>

    <div class="slack-card-divider"></div>
    <p class="slack-card-lead">${mdInline(SCRIPT.actionIntro)}</p>
    <div class="slack-card-actions">
      <button class="btn btn-primary btn-sm" id="flag-legal-btn">Flag for legal review</button>
      <button class="btn btn-outline btn-sm" id="no-action-btn">No action needed</button>
    </div>
    <div class="results-footer">
      <a class="audit-link" href="${auditUrl}" target="_blank" rel="noopener">View execution audit &rarr;</a>
    </div>
  `);

  row.querySelector('#breakdown-toggle').addEventListener('click', () => {
    state.breakdownOpen = !state.breakdownOpen;
    const el = row.querySelector('#category-breakdown');
    el.style.display = state.breakdownOpen ? 'block' : 'none';
    row.querySelector('#breakdown-toggle').textContent = state.breakdownOpen ? 'Hide full playbook breakdown' : 'Show full playbook breakdown';
    scrollThreadToBottom();
  });

  row.querySelector('#flag-legal-btn').addEventListener('click', () => {
    row.querySelector('#flag-legal-btn').disabled = true;
    row.querySelector('#no-action-btn').disabled = true;
    state.step = 'done';
    agentMessage(`<span class="slack-plain-text">Done — I've flagged this for legal review in <strong>#legal-ops</strong> and attached the before/after analysis. I won't reply to Northwind until legal signs off.</span>`);
  });
  row.querySelector('#no-action-btn').addEventListener('click', () => {
    row.querySelector('#flag-legal-btn').disabled = true;
    row.querySelector('#no-action-btn').disabled = true;
    state.step = 'done';
    agentMessage(`<span class="slack-plain-text">Understood — I won't take any further action on this. Let me know if you'd like me to loop in legal later.</span>`);
  });
}

document.addEventListener('DOMContentLoaded', boot);
