// Claude-sales-proposal prototype — a scripted, simulated Claude.ai conversation.
// No real Claude, S-Docs, or MCP calls are made; everything plays from schema.js data.

const state = {
  turnInProgress: false,
  step: 'idle', // idle -> awaiting-opp -> awaiting-confirm -> done
  chosenOpp: null,
  sources: Object.fromEntries(DATA_SOURCES.map(s => [s.key, s.checked])),
  sections: Object.fromEntries(CONTENT_SECTIONS.map(s => [s.key, s.checked])),
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// Minimal **bold** markdown support for scripted copy.
function mdInline(str) {
  return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
  document.getElementById('past-chat-list').innerHTML = PAST_CHATS.map(c => `
    <div class="claude-sidebar-item">${escapeHtml(c)}</div>
  `).join('');
}

// ---------------------------------------------------------------
// Thread rendering
// ---------------------------------------------------------------

function appendMessage({ from, html }) {
  const thread = document.getElementById('thread');
  const row = document.createElement('div');
  row.className = `claude-msg-row ${from}`;
  if (from === 'assistant') {
    row.innerHTML = `
      <div class="claude-msg-avatar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z" fill="currentColor"/></svg>
      </div>
      <div class="claude-msg-body">
        <div class="claude-msg-text">${html}</div>
      </div>
    `;
  } else {
    row.innerHTML = `<div class="claude-msg-bubble">${html}</div>`;
  }
  thread.appendChild(row);
  scrollThreadToBottom();
  return row;
}

function assistantText(text, extraHtml) {
  return appendMessage({ from: 'assistant', html: `${mdInline(text)}${extraHtml || ''}` });
}

function userText(text) {
  return appendMessage({ from: 'user', html: escapeHtml(text) });
}

// ---------------------------------------------------------------
// Boot — welcome message with a suggestion chip
// ---------------------------------------------------------------

function boot() {
  renderSidebar();
  assistantText(SCRIPT.welcome);
  composerInput.value = SCRIPT.suggestion;
  composerInput.dispatchEvent(new Event('input'));
  composerInput.focus();
}

// ---------------------------------------------------------------
// Composer
// ---------------------------------------------------------------

const composerInput = document.getElementById('composer-input');
const sendBtn = document.getElementById('send-btn');

composerInput.addEventListener('input', () => {
  sendBtn.disabled = !composerInput.value.trim() || state.turnInProgress;
  composerInput.style.height = 'auto';
  composerInput.style.height = Math.min(composerInput.scrollHeight, 160) + 'px';
});
composerInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    trySend();
  }
});
sendBtn.addEventListener('click', trySend);

function trySend() {
  const text = composerInput.value.trim();
  if (!text || state.turnInProgress) return;
  composerInput.value = '';
  composerInput.style.height = 'auto';
  sendBtn.disabled = true;
  sendUserMessage(text);
}

function setComposerEnabled(enabled) {
  composerInput.disabled = !enabled;
  sendBtn.disabled = !enabled || !composerInput.value.trim();
}

// ---------------------------------------------------------------
// Scripted turn — only the first message drives the demo; anything typed
// after the flow completes gets a short generic reply.
// ---------------------------------------------------------------

function sendUserMessage(text) {
  userText(text);
  state.turnInProgress = true;
  setComposerEnabled(false);

  if (state.step === 'idle') {
    runDetectAndSearch();
  } else if (state.step === 'done') {
    typingThen(() => {
      assistantText("Happy to help with anything else — another proposal, an SOW, or a status check.");
      state.turnInProgress = false;
      setComposerEnabled(true);
    }, 700);
  } else {
    // Mid-flow free text is ignored in this scripted prototype — nudge back to the open card.
    typingThen(() => {
      assistantText("Let's finish up the step above first, then I'll keep going.");
      state.turnInProgress = false;
      setComposerEnabled(true);
    }, 500);
  }
}

function typingThen(fn, delay) {
  const typingRow = appendMessage({ from: 'assistant', html: `<div class="claude-msg-avatar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z" fill="currentColor"/></svg></div><div class="claude-msg-body"><div class="claude-msg-text"><span class="claude-typing-dots"><span></span><span></span><span></span></span></div></div>` });
  setTimeout(() => {
    typingRow.remove();
    fn();
  }, delay);
}

// ---------------------------------------------------------------
// Step 1 — read the request, notice a connected tool fits, and ask before
// using it (rather than assuming it upfront).
// ---------------------------------------------------------------

function runDetectAndSearch() {
  state.step = 'awaiting-tool-confirm';
  typingThen(() => {
    renderToolDetectionCard();
  }, 900);
}

function renderToolDetectionCard() {
  const row = assistantText('', `
    <div class="claude-card tool-detect-card">
      <div class="tool-detect-head">
        <div class="tool-detect-icon">SD</div>
        <div>
          <div class="tool-detect-name">${escapeHtml(AGENT.name)}</div>
          <div class="tool-detect-sub">Connected via MCP &middot; ${escapeHtml(CONNECTOR.name)}</div>
        </div>
      </div>
      <p class="claude-card-lead" style="margin-top:10px;">${mdInline(SCRIPT.detectIntro)}</p>
      <div class="tool-detect-actions">
        <button class="btn btn-primary btn-sm" id="use-tool-btn">Use ${escapeHtml(AGENT.short)}</button>
        <button class="btn btn-outline btn-sm" id="decline-tool-btn">Not now</button>
      </div>
    </div>
  `);
  row.querySelector('#use-tool-btn').addEventListener('click', () => {
    row.querySelector('#use-tool-btn').disabled = true;
    row.querySelector('#decline-tool-btn').disabled = true;
    onUseTool();
  });
  row.querySelector('#decline-tool-btn').addEventListener('click', () => {
    row.querySelector('#use-tool-btn').disabled = true;
    row.querySelector('#decline-tool-btn').disabled = true;
    onDeclineTool();
  });
  state.turnInProgress = false; // waiting on the user to click, not typing
}

function onUseTool() {
  state.turnInProgress = true;
  typingThen(() => {
    const row = assistantText(SCRIPT.useToolReply);
    runLookupSteps(row, 0);
  }, 700);
}

function onDeclineTool() {
  state.step = 'idle';
  typingThen(() => {
    assistantText(SCRIPT.declineToolReply);
    state.turnInProgress = false;
    setComposerEnabled(true);
  }, 600);
}

const LOOKUP_STEPS = [
  { tool: 'sdocs.search_crm', label: `Searching Salesforce for accounts matching "Bramwell"`, duration: 900 },
  { tool: 'sdocs.list_opportunities', label: `Checking open opportunities for ${ACCOUNT.name}`, duration: 1000 },
];

function runLookupSteps(anchorRow, index) {
  if (index >= LOOKUP_STEPS.length) {
    renderDisambiguationCard();
    return;
  }
  const step = LOOKUP_STEPS[index];
  const stepRow = appendMessage({
    from: 'assistant',
    html: `
      <div class="claude-msg-avatar" style="visibility:hidden;"></div>
      <div class="claude-msg-body">
        <div class="tool-step running" id="lookup-step-${index}">
          <span class="tool-icon"><span class="spinner-sm"></span></span>
          <span>${escapeHtml(step.label)}</span>
          <span class="tool-name">${escapeHtml(step.tool)}</span>
        </div>
      </div>
    `,
  });
  setTimeout(() => {
    const el = stepRow.querySelector(`#lookup-step-${index}`);
    el.classList.remove('running');
    el.classList.add('done');
    el.querySelector('.tool-icon').innerHTML = checkIconHtml();
    runLookupSteps(anchorRow, index + 1);
  }, step.duration);
}

function checkIconHtml() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
}

// ---------------------------------------------------------------
// Step 2 — "Multiple matches found" disambiguation card.
// ---------------------------------------------------------------

function renderDisambiguationCard() {
  state.step = 'awaiting-opp';
  const row = assistantText('', `
    <div class="claude-card disambiguation-card">
      <div class="claude-card-eyebrow">Multiple matches found</div>
      <p class="claude-card-lead">${escapeHtml(SCRIPT.disambiguationIntro)}</p>
      <div class="opp-list">
        ${OPPORTUNITIES.map(o => `
          <div class="opp-row" data-id="${o.id}">
            <div class="opp-row-main">
              <div class="opp-row-name">${escapeHtml(o.name)}</div>
              <div class="opp-row-meta">${escapeHtml(o.stage)} &middot; ${escapeHtml(formatCurrency(o.amount))} &middot; closes ${escapeHtml(o.closeDate)}</div>
              <div class="opp-row-note">${escapeHtml(o.note)}</div>
            </div>
            <button class="btn btn-outline btn-sm opp-select-btn" data-id="${o.id}">Select</button>
          </div>
        `).join('')}
      </div>
    </div>
  `);
  row.querySelectorAll('.opp-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const opp = OPPORTUNITIES.find(o => o.id === btn.dataset.id);
      row.querySelectorAll('.opp-select-btn').forEach(b => b.disabled = true);
      row.querySelector(`.opp-row[data-id="${opp.id}"]`).classList.add('is-chosen');
      pickOpportunity(opp);
    });
  });
  state.turnInProgress = false; // waiting on the user to click, not typing
}

function pickOpportunity(opp) {
  state.chosenOpp = opp;
  state.turnInProgress = true;
  userText(opp.name);
  typingThen(() => {
    const html = mdInline(SCRIPT.afterPick(opp));
    assistantText('', html);
    renderConfirmationCard();
  }, 800);
}

// ---------------------------------------------------------------
// Step 3 — combined confirmation card: data sources + content sections.
// ---------------------------------------------------------------

function renderConfirmationCard() {
  state.step = 'awaiting-confirm';
  const row = appendMessage({
    from: 'assistant',
    html: `
      <div class="claude-msg-avatar" style="visibility:hidden;"></div>
      <div class="claude-msg-body">
        <div class="claude-card confirm-card">
          <div class="confirm-section">
            <div class="claude-card-eyebrow">Data sources to check</div>
            <div class="confirm-toggle-list" id="source-toggle-list">
              ${DATA_SOURCES.map(s => confirmToggleRow(s, state.sources[s.key])).join('')}
            </div>
          </div>
          <div class="confirm-section">
            <div class="claude-card-eyebrow">Sections to include</div>
            <div class="confirm-toggle-list" id="section-toggle-list">
              ${CONTENT_SECTIONS.map(s => confirmToggleRow(s, state.sections[s.key])).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="generate-btn">Looks good — generate proposal</button>
        </div>
      </div>
    `,
  });

  row.querySelectorAll('#source-toggle-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { state.sources[cb.dataset.key] = cb.checked; });
  });
  row.querySelectorAll('#section-toggle-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { state.sections[cb.dataset.key] = cb.checked; });
  });
  row.querySelector('#generate-btn').addEventListener('click', () => {
    row.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = true);
    row.querySelector('#generate-btn').disabled = true;
    confirmAndGenerate();
  });

  state.turnInProgress = false;
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
// Step 4 — run the tool-call chain, then render the proposal.
// ---------------------------------------------------------------

function confirmAndGenerate() {
  state.turnInProgress = true;
  userText(SCRIPT.confirmedEcho);
  typingThen(() => {
    assistantText(SCRIPT.workingIntro);
    const steps = buildToolSteps(state.sources);
    runGenerateSteps(steps, 0);
  }, 700);
}

function runGenerateSteps(steps, index) {
  if (index >= steps.length) {
    renderProposalResult();
    return;
  }
  const step = steps[index];
  const stepRow = appendMessage({
    from: 'assistant',
    html: `
      <div class="claude-msg-avatar" style="visibility:hidden;"></div>
      <div class="claude-msg-body">
        <div class="tool-step running" id="gen-step-${index}">
          <span class="tool-icon"><span class="spinner-sm"></span></span>
          <span>${escapeHtml(step.label)}</span>
          <span class="tool-name">${escapeHtml(step.tool)}</span>
        </div>
      </div>
    `,
  });
  setTimeout(() => {
    const el = stepRow.querySelector(`#gen-step-${index}`);
    el.classList.remove('running');
    el.classList.add('done');
    el.querySelector('.tool-icon').innerHTML = checkIconHtml();
    runGenerateSteps(steps, index + 1);
  }, step.duration);
}

function renderProposalResult() {
  state.step = 'done';
  const proposal = buildProposal(state.chosenOpp, state.sources, state.sections);
  const auditUrl = `audit.html?run=run-93041`;

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

  const row = appendMessage({
    from: 'assistant',
    html: `
      <div class="claude-msg-avatar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z" fill="currentColor"/></svg>
      </div>
      <div class="claude-msg-body">
        <div class="claude-msg-text">${mdInline(SCRIPT.doneIntro)}</div>
        <div class="claude-card proposal-card">
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
        </div>
      </div>
    `,
  });

  row.querySelector('#download-pdf-btn').addEventListener('click', () => {
    alert('This is a prototype — no file is actually generated. See "View execution audit" for the full run detail.');
  });

  state.turnInProgress = false;
  setComposerEnabled(true);
}

document.addEventListener('DOMContentLoaded', boot);
