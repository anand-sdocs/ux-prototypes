// Claude-investment-proposal prototype — a scripted, simulated Claude.ai conversation.
// No real Claude, S-Docs, or MCP calls are made; everything plays from schema.js data.
// Adapted from claude-sales-proposal's app.js, re-themed for a wealth-management
// quarterly investment review flow with a richer, chart-heavy proposal preview.

const state = {
  turnInProgress: false,
  step: 'idle', // idle -> awaiting-hh -> awaiting-confirm -> done
  chosenHousehold: null,
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
      assistantText('Happy to help with anything else — another household review, a fee comparison, or a status check.');
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
  { tool: 'sdocs.search_portfolio_system', label: `Searching the portfolio system for client records matching "${SEARCH_TERM}"`, duration: 900 },
  { tool: 'sdocs.list_client_records', label: 'Checking matching households and accounts', duration: 1000 },
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
  state.step = 'awaiting-hh';
  const row = assistantText('', `
    <div class="claude-card disambiguation-card">
      <div class="claude-card-eyebrow">Multiple matches found</div>
      <p class="claude-card-lead">${escapeHtml(SCRIPT.disambiguationIntro)}</p>
      <div class="opp-list">
        ${HOUSEHOLDS.map(h => `
          <div class="opp-row" data-id="${h.id}">
            <div class="opp-row-main">
              <div class="opp-row-name">${escapeHtml(h.name)}</div>
              <div class="opp-row-meta">${escapeHtml(h.type)} &middot; ${escapeHtml(formatCurrency(h.totalAUM))} AUM &middot; ${h.accountCount} account${h.accountCount === 1 ? '' : 's'} &middot; advisor ${escapeHtml(h.advisor)}</div>
              <div class="opp-row-note">${escapeHtml(h.note)}</div>
            </div>
            <button class="btn btn-outline btn-sm opp-select-btn" data-id="${h.id}">Select</button>
          </div>
        `).join('')}
      </div>
    </div>
  `);
  row.querySelectorAll('.opp-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hh = HOUSEHOLDS.find(h => h.id === btn.dataset.id);
      row.querySelectorAll('.opp-select-btn').forEach(b => b.disabled = true);
      row.querySelector(`.opp-row[data-id="${hh.id}"]`).classList.add('is-chosen');
      pickHousehold(hh);
    });
  });
  state.turnInProgress = false; // waiting on the user to click, not typing
}

function pickHousehold(hh) {
  state.chosenHousehold = hh;
  state.turnInProgress = true;
  userText(hh.name);
  typingThen(() => {
    const html = mdInline(SCRIPT.afterPick(hh));
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
          <button class="btn btn-primary btn-sm" id="generate-btn">Looks good — generate review</button>
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

// ---------------------------------------------------------------
// Chart helpers — plain inline SVG, no charting library.
// ---------------------------------------------------------------

function donutChartSvg(items, opts) {
  const size = (opts && opts.size) || 150;
  const r = size / 2 - 12;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = items.reduce((s, it) => s + it.value, 0);
  let offset = 0;
  const segments = items.map(it => {
    const pct = it.value / total;
    const dash = pct * circumference;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="20"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})"></circle>`;
    offset += dash;
    return seg;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-chart-svg">${segments}</svg>`;
}

function chartLegend(items, opts) {
  const asPct = opts && opts.asPct;
  const total = items.reduce((s, it) => s + it.value, 0);
  return `
    <ul class="chart-legend">
      ${items.map(it => `
        <li><span class="chart-legend-dot" style="background:${it.color}"></span>
          <span class="chart-legend-label">${escapeHtml(it.label)}</span>
          <span class="chart-legend-value">${asPct ? formatPct(it.value) : formatPct(it.value / total * 100)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function growthFanChartSvg(growth) {
  const W = 520, H = 200, padL = 44, padR = 12, padT = 12, padB = 26;
  const n = growth.ages.length;
  const allVals = [...growth.low, ...growth.high];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const x = i => padL + (i / (n - 1)) * (W - padL - padR);
  const y = v => H - padB - ((v - min) / (max - min)) * (H - padT - padB);

  const highPts = growth.high.map((v, i) => `${x(i)},${y(v)}`);
  const lowPtsRev = growth.low.map((v, i) => `${x(i)},${y(v)}`).reverse();
  const bandPoints = [...highPts, ...lowPtsRev].join(' ');
  const midPoints = growth.mid.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = min + (i / yTicks) * (max - min);
    const yy = y(v);
    return `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" class="chart-grid-line"></line>
      <text x="${padL - 6}" y="${yy + 3}" class="chart-axis-label" text-anchor="end">$${v.toFixed(1)}M</text>`;
  }).join('');

  const xLabels = growth.ages.map((age, i) => (i % 2 === 0
    ? `<text x="${x(i)}" y="${H - 6}" class="chart-axis-label" text-anchor="middle">${age}</text>`
    : '')).join('');

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H}" class="growth-chart-svg" preserveAspectRatio="xMidYMid meet">
      ${gridLines}
      <polygon points="${bandPoints}" class="chart-band"></polygon>
      <polyline points="${midPoints}" class="chart-line"></polyline>
      ${xLabels}
    </svg>
  `;
}

// ---------------------------------------------------------------
// Section renderers — one per CONTENT_SECTIONS key.
// ---------------------------------------------------------------

function renderAccountSummarySection(s) {
  const rows = s.accounts.map(acc => `
    <tr class="account-summary-row">
      <td class="pt-key">${escapeHtml(acc.label)}</td>
      <td class="pt-val">${escapeHtml(formatCurrency(acc.value))}</td>
    </tr>
    ${acc.holdings.map(h => `
      <tr class="holding-row">
        <td class="pt-key holding-name">${escapeHtml(h.fund)} <span class="holding-ticker">${escapeHtml(h.ticker)}</span></td>
        <td class="pt-val holding-amount">${escapeHtml(formatCurrency(h.amount))}</td>
      </tr>
    `).join('')}
  `).join('');
  return `
    <table class="proposal-table account-summary-table">
      ${rows}
      <tr><td class="pt-key">Total household AUM</td><td class="pt-val">${escapeHtml(formatCurrency(s.totalValue))}</td></tr>
    </table>
  `;
}

function renderFeeSummarySection(s) {
  const rows = s.rows.map(f => `
    <tr>
      <td class="pt-key">${escapeHtml(f.fund)} <span class="holding-ticker">${escapeHtml(f.ticker)}</span></td>
      <td class="pt-val">${escapeHtml(formatCurrency(f.amount))}</td>
      <td class="pt-val">${formatPct(f.expenseRatio, 2)}</td>
      <td class="pt-val">${formatPct(f.advisoryFee, 2)}</td>
      <td class="pt-val">${formatPct(f.expenseRatio + f.advisoryFee, 2)}</td>
    </tr>
  `).join('');
  return `
    <table class="proposal-table fee-summary-table">
      <thead>
        <tr>
          <th>Fund</th><th>Amount</th><th>Expense ratio</th><th>Advisory fee</th><th>Total cost</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td class="pt-key">Portfolio blended total</td>
          <td class="pt-val">${escapeHtml(formatCurrency(s.totalAmount))}</td>
          <td></td><td></td>
          <td class="pt-val">${formatPct(s.blendedCost, 2)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderAllocationSection(s) {
  const returnsRows = s.returns.map(r => `<td>${formatPct(r.value)}</td>`).join('');
  const returnsHeads = s.returns.map(r => `<th>${escapeHtml(r.period)}</th>`).join('');
  return `
    <div class="chart-row">
      <div class="chart-box">
        <div class="chart-box-title">Asset mix</div>
        ${donutChartSvg(s.assetMix)}
        ${chartLegend(s.assetMix)}
      </div>
      <div class="chart-box">
        <div class="chart-box-title">Sector mix (equity sleeve)</div>
        ${donutChartSvg(s.sectorMix)}
        ${chartLegend(s.sectorMix, { asPct: true })}
      </div>
    </div>
    <div class="chart-box chart-box-wide">
      <div class="chart-box-title">Hypothetical market value illustration — ages ${s.growth.ages[0]}&ndash;${s.growth.ages[s.growth.ages.length - 1]}</div>
      ${growthFanChartSvg(s.growth)}
      <div class="chart-box-caption">Shaded band shows a hypothetical range of market outcomes based on historical index returns; the line shows the mid-case projection. Not a guarantee of future performance.${s.usedMarketData ? '' : ' Market data source was not checked, so this illustration uses default benchmark assumptions.'}</div>
    </div>
    <div class="chart-box">
      <div class="chart-box-title">Annualized returns</div>
      <table class="proposal-table returns-table">
        <thead><tr>${returnsHeads}</tr></thead>
        <tbody><tr>${returnsRows}</tr></tbody>
      </table>
    </div>
  `;
}

function renderProposalResult() {
  state.step = 'done';
  const proposal = buildProposal(state.chosenHousehold, state.sources, state.sections);
  const auditUrl = `audit.html?run=run-77102`;

  const sectionsHtml = proposal.sections.map(s => {
    let inner = '';
    if (s.key === 'accountSummary') inner = renderAccountSummarySection(s);
    else if (s.key === 'feeSummary') inner = renderFeeSummarySection(s);
    else if (s.key === 'allocation') inner = renderAllocationSection(s);
    else if (s.body) inner = `<p class="proposal-section-body">${escapeHtml(s.body)}</p>`;

    return `
      <div class="proposal-section ${s.warning ? 'is-warning' : ''}">
        <div class="proposal-section-heading">${escapeHtml(s.heading)}</div>
        ${inner}
      </div>
    `;
  }).join('');

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
              <div class="proposal-doc-title">Quarterly Investment Review &mdash; ${escapeHtml(proposal.client)}</div>
              <div class="proposal-doc-subtitle">${escapeHtml(proposal.period)} &middot; Prepared by ${escapeHtml(proposal.advisor)} &middot; ${escapeHtml(formatCurrency(proposal.totalAUM))} AUM</div>
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
