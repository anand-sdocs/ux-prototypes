// Teams-proposal-autonomous prototype — a scripted, simulated Teams chat.
// No real Teams, S-Docs, or MCP calls are made; everything plays from schema.js data.
//
// Unlike the Claude prototype (user asks, agent offers to help), this one
// models an agent that's configured to *listen* — it noticed something in a
// monitored inbox and proactively reaches out, asking permission before it
// does anything on the rep's behalf.

const state = {
  turnInProgress: false,
  step: 'idle', // idle -> awaiting-confirm -> done
  activeChat: 'priya', // the rep isn't looking at the agent DM when this opens
  agentUnread: true,
  sources: Object.fromEntries(DATA_SOURCES.map(s => [s.key, s.checked])),
  sections: Object.fromEntries(CONTENT_SECTIONS.map(s => [s.key, s.checked])),
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

function renderChatList() {
  const rows = [
    { id: 'agent', name: AGENT.name, initials: AGENT.initials, preview: SCRIPT.toastPreview, time: TRIGGER_EMAIL.receivedAt, isAgent: true, unread: state.agentUnread, openable: true },
    ...OTHER_CHATS,
  ];
  document.getElementById('chat-list').innerHTML = rows.map(c => `
    <div class="teams-chat-row ${state.activeChat === c.id ? 'active' : ''} ${c.openable ? '' : 'is-static'}" data-chat-id="${c.id}">
      <div class="teams-chat-avatar ${c.isAgent ? 'bot' : ''}">${escapeHtml(c.initials)}</div>
      <div class="teams-chat-row-main">
        <div class="teams-chat-row-top"><span class="teams-chat-name ${c.unread ? 'unread' : ''}">${escapeHtml(c.name)}</span><span class="teams-chat-time">${escapeHtml(c.time)}</span></div>
        <div class="teams-chat-preview ${c.unread ? 'unread' : ''}">${escapeHtml(c.preview)}</div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.teams-chat-row[data-chat-id]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.chatId;
      const chat = rows.find(r => r.id === id);
      if (!chat || !chat.openable) return;
      if (id === 'agent') openAgentChat();
      else openPriyaChat();
    });
  });
}

function updateRailBadge() {
  const badge = document.getElementById('rail-badge');
  badge.style.display = state.agentUnread ? 'flex' : 'none';
}

// ---------------------------------------------------------------
// Thread header — swaps between a normal person header and the bot header
// depending on which chat is open.
// ---------------------------------------------------------------

function renderHeader() {
  const header = document.getElementById('thread-header');
  if (state.activeChat === 'agent') {
    header.innerHTML = `
      <div class="teams-bot-icon-lg">${escapeHtml(AGENT.initials)}</div>
      <div class="teams-thread-title-wrap">
        <div class="teams-thread-title">${escapeHtml(AGENT.name)} <span class="teams-bot-tag">Bot</span></div>
        <div class="teams-thread-subtitle">Monitors connected inboxes for proposal requests</div>
      </div>
    `;
  } else {
    const priya = OTHER_CHATS.find(c => c.id === 'priya');
    header.innerHTML = `
      <div class="teams-person-icon-lg">${escapeHtml(priya.initials)}<span class="teams-presence-dot"></span></div>
      <div class="teams-thread-title-wrap">
        <div class="teams-thread-title">${escapeHtml(priya.name)}</div>
        <div class="teams-thread-subtitle">Available</div>
      </div>
    `;
  }
}

// ---------------------------------------------------------------
// Thread rendering
// ---------------------------------------------------------------

function appendMessage(html, avatarInitials) {
  const thread = document.getElementById('thread');
  const row = document.createElement('div');
  row.className = 'teams-msg-row';
  row.innerHTML = `
    <div class="teams-msg-avatar">${escapeHtml(avatarInitials || AGENT.initials)}</div>
    <div class="teams-msg-body">${html}</div>
  `;
  thread.appendChild(row);
  scrollThreadToBottom();
  return row;
}

function agentCard(html) {
  return appendMessage(`<div class="teams-card">${html}</div>`);
}

function clearThread() {
  document.getElementById('thread').innerHTML = '';
}

// ---------------------------------------------------------------
// Priya's chat — ordinary work, unrelated to the proposal request. This is
// what the rep is looking at when the prototype opens.
// ---------------------------------------------------------------

function openPriyaChat() {
  state.activeChat = 'priya';
  renderChatList();
  renderHeader();
  renderPriyaThread();
}

function renderPriyaThread() {
  clearThread();
  const priya = OTHER_CHATS.find(c => c.id === 'priya');
  PRIYA_THREAD.forEach(m => {
    const isMe = m.from === 'me';
    appendMessage(
      `<div class="teams-plain-text">${escapeHtml(m.text)}<div class="teams-msg-time-inline">${escapeHtml(m.time)}</div></div>`,
      isMe ? CURRENT_USER.initials : priya.initials
    );
  });
}

// ---------------------------------------------------------------
// Boot — the rep opens Teams onto an ordinary chat, not the agent DM. A
// toast is what pulls their attention to what the agent noticed.
// ---------------------------------------------------------------

function boot() {
  renderChatList();
  renderHeader();
  renderPriyaThread();
  updateRailBadge();
  setTimeout(showToast, 1800);
}

function showToast() {
  if (state.activeChat === 'agent') return; // already looking at it
  const root = document.getElementById('toast-root');
  root.innerHTML = `
    <div class="teams-toast" id="agent-toast">
      <div class="teams-toast-head">
        <span class="teams-toast-app">Microsoft Teams</span>
        <button class="teams-toast-close" id="toast-close" title="Dismiss">&times;</button>
      </div>
      <div class="teams-toast-body">
        <div class="teams-toast-avatar">${escapeHtml(AGENT.initials)}</div>
        <div class="teams-toast-main">
          <div class="teams-toast-name">${escapeHtml(AGENT.name)}</div>
          <div class="teams-toast-preview">${escapeHtml(SCRIPT.toastPreview)}</div>
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
  const alreadyOpened = state.activeChat === 'agent';
  state.activeChat = 'agent';
  state.agentUnread = false;
  renderChatList();
  renderHeader();
  updateRailBadge();
  if (!alreadyOpened) {
    clearThread();
    setTimeout(renderNotifyCard, 400);
  }
}

function checkIconHtml() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
}

// ---------------------------------------------------------------
// Step 1 — proactive notification card, quoting what it saw.
// ---------------------------------------------------------------

function renderNotifyCard() {
  const row = agentCard(`
    <div class="teams-card-pad">
      <div class="teams-card-eyebrow">${escapeHtml(SCRIPT.notifyEyebrow)}</div>
      <p class="teams-card-lead">${mdInline(SCRIPT.notifyBody)}</p>
      <div class="teams-quote-block">
        <div class="teams-quote-head">
          <span class="teams-quote-from">${escapeHtml(TRIGGER_EMAIL.from)}</span>
          <span class="teams-quote-role">${escapeHtml(TRIGGER_EMAIL.fromTitle)}</span>
        </div>
        <div class="teams-quote-subject">${escapeHtml(TRIGGER_EMAIL.subject)}</div>
        <div class="teams-quote-snippet">${escapeHtml(TRIGGER_EMAIL.snippet)}</div>
        <div class="teams-quote-source">Email &middot; inbox monitored via connector &middot; ${escapeHtml(TRIGGER_EMAIL.receivedAt)}</div>
      </div>
      <div class="teams-card-actions">
        <button class="btn btn-primary btn-sm" id="notify-yes-btn">Yes, create it</button>
        <button class="btn btn-outline btn-sm" id="notify-no-btn">Not now</button>
      </div>
    </div>
  `);
  row.querySelector('#notify-yes-btn').addEventListener('click', () => {
    row.querySelector('#notify-yes-btn').disabled = true;
    row.querySelector('#notify-no-btn').disabled = true;
    renderConfirmCard();
  });
  row.querySelector('#notify-no-btn').addEventListener('click', () => {
    row.querySelector('#notify-yes-btn').disabled = true;
    row.querySelector('#notify-no-btn').disabled = true;
    appendMessage(`<div class="teams-plain-text">${mdInline(SCRIPT.declineReply)}</div>`);
  });
}

// ---------------------------------------------------------------
// Step 2 — confirm the account/opportunity match plus data sources and
// content sections, before touching anything.
// ---------------------------------------------------------------

function renderConfirmCard() {
  state.step = 'awaiting-confirm';
  const row = agentCard(`
    <div class="teams-card-pad">
      <p class="teams-card-lead">${mdInline(SCRIPT.confirmIntro)}</p>
      <div class="teams-match-row">
        <div class="teams-match-item"><span class="teams-match-label">Account</span><span class="teams-match-value">${escapeHtml(ACCOUNT.name)}</span></div>
        <div class="teams-match-item"><span class="teams-match-label">Opportunity</span><span class="teams-match-value">${escapeHtml(OPPORTUNITY.name)}</span></div>
        <div class="teams-match-item"><span class="teams-match-label">Stage</span><span class="teams-match-value">${escapeHtml(OPPORTUNITY.stage)}</span></div>
        <div class="teams-match-item"><span class="teams-match-label">Amount</span><span class="teams-match-value">${escapeHtml(formatCurrency(OPPORTUNITY.amount))}</span></div>
      </div>
      <div class="confirm-section">
        <div class="teams-card-eyebrow">Data sources to check</div>
        <div class="confirm-toggle-list" id="source-toggle-list">
          ${DATA_SOURCES.map(s => confirmToggleRow(s, state.sources[s.key])).join('')}
        </div>
      </div>
      <div class="confirm-section">
        <div class="teams-card-eyebrow">Sections to include</div>
        <div class="confirm-toggle-list" id="section-toggle-list">
          ${CONTENT_SECTIONS.map(s => confirmToggleRow(s, state.sections[s.key])).join('')}
        </div>
      </div>
      <div class="teams-card-actions">
        <button class="btn btn-primary btn-sm" id="go-ahead-btn">Looks good — go ahead</button>
      </div>
    </div>
  `);

  row.querySelectorAll('#source-toggle-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { state.sources[cb.dataset.key] = cb.checked; });
  });
  row.querySelectorAll('#section-toggle-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { state.sections[cb.dataset.key] = cb.checked; });
  });
  row.querySelector('#go-ahead-btn').addEventListener('click', () => {
    row.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = true);
    row.querySelector('#go-ahead-btn').disabled = true;
    runGenerateFlow();
  });
}

function confirmToggleRow(item, checked) {
  return `
    <label class="confirm-toggle-row ${item.locked ? 'locked' : ''}">
      <input type="checkbox" data-key="${item.key}" ${checked ? 'checked' : ''} ${item.locked ? 'disabled checked' : ''}>
      <div>
        <div class="confirm-toggle-label">${escapeHtml(item.label)}</div>
        <div class="confirm-toggle-detail">${escapeHtml(item.detail || '')}</div>
      </div>
    </label>
  `;
}

// ---------------------------------------------------------------
// Step 3 — run the tool-call chain, then render the proposal.
// ---------------------------------------------------------------

function runGenerateFlow() {
  appendMessage(`<div class="teams-plain-text">${mdInline(SCRIPT.workingIntro)}</div>`);
  const steps = buildToolSteps(state.sources);
  runGenerateSteps(steps, 0);
}

function runGenerateSteps(steps, index) {
  if (index >= steps.length) {
    renderProposalResult();
    return;
  }
  const step = steps[index];
  const row = appendMessage(`
    <div class="tool-step running" id="gen-step-${index}">
      <span class="tool-icon"><span class="spinner-sm"></span></span>
      <span>${escapeHtml(step.label)}</span>
      <span class="tool-name">${escapeHtml(step.tool)}</span>
    </div>
  `);
  setTimeout(() => {
    const el = row.querySelector(`#gen-step-${index}`);
    el.classList.remove('running');
    el.classList.add('done');
    el.querySelector('.tool-icon').innerHTML = checkIconHtml();
    runGenerateSteps(steps, index + 1);
  }, step.duration);
}

function renderProposalResult() {
  state.step = 'done';
  const proposal = buildProposal(state.sources, state.sections);
  const auditUrl = `audit.html?run=run-77004`;

  const sectionsHtml = proposal.sections.map(s => `
    <div class="proposal-section ${s.warning ? 'is-warning' : ''}">
      <div class="proposal-section-heading">${escapeHtml(s.heading)}</div>
      ${s.body ? `<p class="proposal-section-body">${escapeHtml(s.body)}</p>` : ''}
      ${s.list ? `<ul class="proposal-section-list">${s.list.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>` : ''}
      ${s.table ? `
        <table class="proposal-table">
          ${s.table.map(([k, v]) => `<tr><td class="pt-key">${escapeHtml(k)}</td><td class="pt-val">${escapeHtml(v)}</td></tr>`).join('')}
        </table>
        ${s.note ? `<div class="proposal-note">${escapeHtml(s.note)}</div>` : ''}
      ` : ''}
    </div>
  `).join('');

  appendMessage(`<div class="teams-plain-text">${mdInline(SCRIPT.doneIntro)}</div>`);
  const row = agentCard(`
    <div class="proposal-doc-head">
      <div class="proposal-doc-icon">SD</div>
      <div>
        <div class="proposal-doc-title">${escapeHtml(proposal.title)} &mdash; ${escapeHtml(proposal.client)}</div>
        <div class="proposal-doc-subtitle">${escapeHtml(proposal.opportunity)}</div>
      </div>
    </div>
    <div class="proposal-doc-body">${sectionsHtml}</div>
    <div class="proposal-doc-actions">
      <button class="btn btn-outline btn-sm" id="download-pdf-btn">Download PDF</button>
      <a class="btn btn-primary btn-sm" href="${auditUrl}" target="_blank" rel="noopener">View execution audit &rarr;</a>
    </div>
  `);

  row.querySelector('#download-pdf-btn').addEventListener('click', () => {
    alert('This is a prototype — no file is actually generated. See "View execution audit" for the full run detail.');
  });
}

document.addEventListener('DOMContentLoaded', boot);
