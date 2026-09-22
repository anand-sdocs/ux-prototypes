// Home dashboard rendering — all data comes from schema.js mock data.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function taskChip(taskKey) {
  const t = TASK_TYPES[taskKey];
  if (!t) return '';
  return `<span class="task-chip ${t.key}">${t.label}</span>`;
}

function renderStats() {
  const totalRuns = AGENTS.reduce((sum, a) => sum + a.triggeredCount, 0);
  const pendingHitl = HITL_REQUESTS.filter(h => h.status === 'pending').length;
  const openErrors = ERRORS.length;
  const activeAgents = AGENTS.filter(a => a.status === 'active').length;

  const stats = [
    { label: 'Actions this month', value: totalRuns.toLocaleString(), delta: '+12% vs last month', down: false },
    { label: 'Active agents', value: `${activeAgents} / ${AGENTS.length}`, delta: '1 paused', down: false },
    { label: 'Errors (7d)', value: openErrors, delta: `${ERRORS_BY_TYPE[0].count} extraction-related`, down: true },
    { label: 'Pending confirmations', value: pendingHitl, delta: 'needs your review', down: pendingHitl > 0 },
  ];

  document.getElementById('stat-row').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-delta ${s.down ? 'down' : ''}">${s.delta}</div>
    </div>
  `).join('');
}

function renderActionsChart() {
  const data = ACTIONS_OVER_TIME;
  const w = 560, h = 160, pad = 24;
  const max = Math.max(...data);
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const pathD = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaD = `${pathD} L${points[points.length - 1][0]},${h - pad} L${points[0][0]},${h - pad} Z`;

  const dots = points.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#0176d3">${i === points.length - 1 ? '' : ''}</circle>`).join('');

  document.getElementById('actions-chart').innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Agentic actions over the last 14 days">
      <defs>
        <linearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0176d3" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#0176d3" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#dddbda" stroke-width="1" />
      <path d="${areaD}" fill="url(#areaFade)" />
      <path d="${pathD}" fill="none" stroke="#0176d3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      <text x="${pad}" y="${h - 4}" class="chart-axis-label">14 days ago</text>
      <text x="${w - pad}" y="${h - 4}" class="chart-axis-label" text-anchor="end">Today</text>
    </svg>
  `;
}

function renderErrorsBarChart() {
  const max = Math.max(...ERRORS_BY_TYPE.map(e => e.count));
  document.getElementById('errors-bar-chart').innerHTML = ERRORS_BY_TYPE.map(e => `
    <div class="bar-row">
      <span class="bar-label">${escapeHtml(e.type)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(e.count / max) * 100}%"></div></div>
      <span class="bar-count">${e.count}</span>
    </div>
  `).join('');
}

function auditHref(agentId, stepType) {
  if (!agentId || !AUDIT_TRAILS[agentId]) return null;
  return `audit-canvas.html?agent=${encodeURIComponent(agentId)}&step=${encodeURIComponent(stepType || '')}`;
}

function renderRecentActions() {
  document.getElementById('recent-actions-list').innerHTML = RECENT_ACTIONS.map(a => {
    const href = auditHref(a.agentId, a.stepType);
    return `
    <div class="list-row ${href ? 'list-row-clickable' : ''}" ${href ? `data-href="${href}" tabindex="0" role="link"` : ''}>
      <span class="status-dot ${a.status}"></span>
      <div class="list-main">
        <div class="list-title">${escapeHtml(a.agent)}</div>
        <div class="list-sub">${escapeHtml(a.summary)}</div>
      </div>
      ${taskChip(a.task)}
      <span class="list-time">${escapeHtml(a.time)}</span>
      ${href ? `<svg class="list-row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
    </div>
  `;
  }).join('');
  bindClickableRows('recent-actions-list');
}

function renderErrorsList() {
  document.getElementById('error-count-label').textContent = `${ERRORS.length} in the last 7 days`;
  document.getElementById('errors-list').innerHTML = ERRORS.map(e => {
    const href = auditHref(e.agentId, e.stepType);
    return `
    <div class="list-row ${href ? 'list-row-clickable' : ''}" ${href ? `data-href="${href}" tabindex="0" role="link"` : ''}>
      <span class="severity-tag ${e.severity}">${e.severity}</span>
      <div class="list-main">
        <div class="list-title">${escapeHtml(e.agent)}</div>
        <div class="list-sub">${escapeHtml(e.message)}</div>
      </div>
      <span class="list-time">${escapeHtml(e.time)}</span>
      ${href ? `<svg class="list-row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
    </div>
  `;
  }).join('');
  bindClickableRows('errors-list');
}

function renderHitlList() {
  document.getElementById('hitl-list').innerHTML = HITL_REQUESTS.map(h => {
    const href = auditHref(h.agentId, h.stepType);
    return `
    <div class="list-row ${href ? 'list-row-clickable' : ''}" ${href ? `data-href="${href}" tabindex="0" role="link"` : ''}>
      <span class="status-dot ${h.status}"></span>
      <div class="list-main">
        <div class="list-title">${escapeHtml(h.agent)}</div>
        <div class="list-sub">${escapeHtml(h.reason)}</div>
      </div>
      <span class="hitl-status-tag ${h.status}">${h.status}</span>
      <span class="list-time">${escapeHtml(h.time)}</span>
      ${href ? `<svg class="list-row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
    </div>
  `;
  }).join('');
  bindClickableRows('hitl-list');
}

function bindClickableRows(containerId) {
  document.querySelectorAll(`#${containerId} .list-row-clickable`).forEach(row => {
    row.addEventListener('click', () => { window.location.href = row.dataset.href; });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = row.dataset.href; }
    });
  });
}

function renderTopAgents() {
  const sorted = [...AGENTS].sort((a, b) => b.triggeredCount - a.triggeredCount);
  document.getElementById('top-agents-list').innerHTML = sorted.map(a => `
    <div class="agent-row">
      <div class="agent-avatar">${escapeHtml(a.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</div>
      <div class="agent-main">
        <div class="agent-name">${escapeHtml(a.name)}</div>
        <div class="agent-meta">
          <span class="status-pill ${a.status}">${a.status}</span>
          ${a.tasks.map(taskChip).join('')}
        </div>
      </div>
      <div>
        <div class="agent-count">${a.triggeredCount}</div>
        <div class="agent-count-label">runs</div>
      </div>
    </div>
  `).join('');
}

function init() {
  renderStats();
  renderActionsChart();
  renderErrorsBarChart();
  renderRecentActions();
  renderErrorsList();
  renderHitlList();
  renderTopAgents();

  const dropdown = document.getElementById('build-agent-dropdown');
  document.getElementById('btn-build-agent').addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', init);
