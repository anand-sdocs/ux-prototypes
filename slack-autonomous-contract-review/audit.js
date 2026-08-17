// Audit trail view — one agent execution, rendered as a flow on the left and
// a detailed step-by-step audit panel on the right. All data comes from
// AUDIT_TRAILS in schema.js; nothing here calls a real LLM or backend.
// Adapted from the sdocs-agent-builder audit page, scoped to a single agent.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { runId: p.get('run'), stepType: p.get('step') };
}

let currentTrail = null;
let selectedStepIndex = 0;

function init() {
  const { runId, stepType } = getParams();
  const trail = AUDIT_TRAILS[runId] || AUDIT_TRAILS[Object.keys(AUDIT_TRAILS)[0]];

  currentTrail = trail;
  selectedStepIndex = Math.max(0, trail.steps.findIndex(s => s.type === stepType));
  if (selectedStepIndex < 0) selectedStepIndex = 0;

  renderHeading(trail);
  renderFlowCanvas(trail);
  renderDetailPanel(selectedStepIndex);
}

function statusPill(status) {
  return `<span class="hitl-status-tag ${status === 'error' ? 'rejected' : status === 'hitl' ? 'pending' : 'confirmed'}">${STATUS_LABEL[status] || status}</span>`;
}

function renderHeading(trail) {
  document.getElementById('audit-heading').innerHTML = `
    <div class="audit-heading-top">
      <div>
        <div class="audit-heading-eyebrow">Audit trail</div>
        <h1 class="audit-heading-title">${escapeHtml(REVIEW_AGENT.name)}</h1>
        <p class="audit-heading-role">${escapeHtml(REVIEW_AGENT.role)}</p>
      </div>
      <div class="audit-heading-actions">
        <button class="btn btn-outline btn-sm" id="btn-export-csv">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/></svg>
          Download CSV
        </button>
        <button class="btn btn-outline btn-sm" id="btn-export-pdf">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Download PDF
        </button>
      </div>
    </div>
    <div class="audit-meta-row">
      <div class="audit-meta-item"><span class="audit-meta-label">Run</span><span class="audit-meta-value">${escapeHtml(trail.runId)}</span></div>
      <div class="audit-meta-item"><span class="audit-meta-label">Trigger</span><span class="audit-meta-value">${escapeHtml(trail.trigger)}</span></div>
      <div class="audit-meta-item"><span class="audit-meta-label">Started</span><span class="audit-meta-value">${escapeHtml(trail.startedAt)}</span></div>
      <div class="audit-meta-item"><span class="audit-meta-label">Duration</span><span class="audit-meta-value">${escapeHtml(trail.totalDuration)}</span></div>
      <div class="audit-meta-item"><span class="audit-meta-label">Status</span><span class="audit-meta-value">${statusPill(trail.status)}</span></div>
    </div>
  `;
  document.getElementById('btn-export-csv').addEventListener('click', () => exportCsv(trail));
  document.getElementById('btn-export-pdf').addEventListener('click', () => exportPdf(trail));
}

function renderFlowCanvas(trail) {
  const canvas = document.getElementById('audit-flow-canvas');
  const triggerHtml = `
    <div class="audit-flow-trigger">
      <div class="flow-node-icon" style="background:#5e6670;">E</div>
      <div class="audit-flow-trigger-label">${escapeHtml(trail.trigger)}</div>
    </div>
    <div class="flow-trigger-down-line"></div>
  `;

  const stepsHtml = trail.steps.map((step, i) => {
    const t = TASK_TYPES[step.type];
    return `
      <div class="audit-flow-node ${i === selectedStepIndex ? 'selected' : ''}" data-index="${i}">
        <div class="flow-node-icon" style="background:${t.color}">${t.label[0]}</div>
        <div class="flow-node-body">
          <div class="flow-node-title">${escapeHtml(step.label)}</div>
          <div class="flow-node-desc">${t.label} &middot; ${escapeHtml(step.duration)}</div>
        </div>
        <span class="audit-flow-status-dot ${step.status}" title="${STATUS_LABEL[step.status] || step.status}"></span>
      </div>
      ${i < trail.steps.length - 1 ? '<div class="flow-trigger-down-line"></div>' : ''}
    `;
  }).join('');

  canvas.innerHTML = `<div class="audit-flow-inner">${triggerHtml}${stepsHtml}</div>`;

  canvas.querySelectorAll('.audit-flow-node').forEach(node => {
    node.addEventListener('click', () => {
      selectedStepIndex = Number(node.dataset.index);
      canvas.querySelectorAll('.audit-flow-node').forEach(n => n.classList.remove('selected'));
      node.classList.add('selected');
      renderDetailPanel(selectedStepIndex);
    });
  });
}

function responseBlock(response) {
  if (!response) return '';
  if (response.kind === 'structured') {
    const rows = Object.entries(response.content).map(([k, v]) => `
      <tr><td class="audit-kv-key">${escapeHtml(k)}</td><td class="audit-kv-val">${escapeHtml(v === null ? '—' : String(v))}</td></tr>
    `).join('');
    return `
      <div class="audit-response-kind structured">Structured</div>
      <table class="audit-kv-table"><tbody>${rows}</tbody></table>
    `;
  }
  return `
    <div class="audit-response-kind unstructured">Unstructured</div>
    <div class="audit-prose-block">${escapeHtml(response.content)}</div>
  `;
}

function decisionsBlock(decisions) {
  if (!decisions || !decisions.length) return '';
  return `
    <div class="audit-section">
      <div class="audit-section-title">Agent decisions</div>
      <ul class="audit-decisions-list">
        ${decisions.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function sourceComparisonBlock(sourceComparison) {
  return sourceComparison.dataElements.map(el => `
    <div class="audit-source-el">
      <div class="audit-source-el-head">
        <span class="audit-source-el-label">${escapeHtml(el.label)}</span>
        <span class="audit-source-chosen-badge">Chosen: ${escapeHtml(el.chosenPlatform)}</span>
      </div>
      <div class="audit-source-candidates">
        ${el.candidates.map(c => `
          <div class="audit-source-candidate ${c.platform === el.chosenPlatform || el.chosenPlatform.includes(c.platform) ? 'is-chosen' : ''}">
            <div class="audit-source-candidate-head">
              <span class="audit-platform-badge">${escapeHtml(c.platform)}</span>
              <span class="audit-confidence">${c.confidence}% confidence</span>
            </div>
            <div class="audit-subsection-label">Prompt sent to LLM</div>
            <pre class="audit-prompt-block audit-prompt-block-sm">${escapeHtml(c.prompt)}</pre>
            <div class="audit-subsection-label">Response returned</div>
            ${responseBlock(c.response)}
          </div>
        `).join('')}
      </div>
      <div class="audit-source-decision">
        <strong>Final value used:</strong> ${escapeHtml(el.chosenValue)}
        <div class="audit-source-decision-reason">${escapeHtml(el.reason)}</div>
      </div>
    </div>
  `).join('');
}

function renderDetailPanel(index) {
  const step = currentTrail.steps[index];
  const t = TASK_TYPES[step.type];
  const card = document.getElementById('audit-detail-card');

  const bodyHtml = step.sourceComparison
    ? `
      <div class="audit-section">
        <div class="audit-section-title">Sourced from multiple platforms</div>
        <p class="field-hint" style="margin-bottom:12px;">This task checks connected platforms in priority order for each data element, then reconciles conflicting values before assembling the document.</p>
        ${sourceComparisonBlock(step.sourceComparison)}
      </div>
      ${decisionsBlock(step.decisions)}
    `
    : `
      <div class="audit-section">
        <div class="audit-section-title">Prompt sent to LLM</div>
        <pre class="audit-prompt-block">${escapeHtml(step.prompt)}</pre>
      </div>
      <div class="audit-section">
        <div class="audit-section-title">Response returned</div>
        ${responseBlock(step.response)}
      </div>
      ${decisionsBlock(step.decisions)}
    `;

  card.innerHTML = `
    <div class="audit-detail-head">
      <div class="audit-detail-head-icon" style="background:${t.color}">${t.label[0]}</div>
      <div class="audit-detail-head-body">
        <div class="audit-detail-title">${escapeHtml(step.label)}</div>
        <div class="audit-detail-meta">${t.label} &middot; ${escapeHtml(step.startedAt || '')} &middot; ${escapeHtml(step.duration)} ${statusPill(step.status)}</div>
      </div>
    </div>
    <div class="audit-detail-body">${bodyHtml}</div>
  `;
}

// ---------------------------------------------------------------
// Export — CSV (real download) and PDF (print-to-PDF via a dedicated,
// fully-expanded printable render).
// ---------------------------------------------------------------

function csvCell(value) {
  const s = String(value == null ? '' : value).replace(/"/g, '""');
  return `"${s}"`;
}

function exportCsv(trail) {
  const rows = [['Step', 'Task type', 'Status', 'Started at', 'Duration', 'Prompt', 'Response type', 'Response', 'Decisions']];

  trail.steps.forEach(step => {
    if (step.sourceComparison) {
      step.sourceComparison.dataElements.forEach(el => {
        el.candidates.forEach(c => {
          rows.push([
            `${step.label} — ${el.label}`,
            step.type,
            step.status,
            step.startedAt || '',
            step.duration,
            `[${c.platform}] ${c.prompt}`,
            c.response.kind,
            c.response.kind === 'structured' ? JSON.stringify(c.response.content) : c.response.content,
            `Chosen: ${el.chosenPlatform} — ${el.chosenValue}. ${el.reason}`,
          ]);
        });
      });
      rows.push([step.label, step.type, step.status, step.startedAt || '', step.duration, '', '', '', (step.decisions || []).join(' | ')]);
    } else {
      rows.push([
        step.label,
        step.type,
        step.status,
        step.startedAt || '',
        step.duration,
        step.prompt || '',
        step.response ? step.response.kind : '',
        step.response ? (step.response.kind === 'structured' ? JSON.stringify(step.response.content) : step.response.content) : '',
        (step.decisions || []).join(' | '),
      ]);
    }
  });

  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-${trail.runId}-proposal-agent.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printResponseHtml(response) {
  if (!response) return '';
  if (response.kind === 'structured') {
    const rows = Object.entries(response.content).map(([k, v]) => `<tr><td class="pk">${escapeHtml(k)}</td><td class="pv">${escapeHtml(v === null ? '—' : String(v))}</td></tr>`).join('');
    return `<div class="p-tag">Structured response</div><table class="p-kv"><tbody>${rows}</tbody></table>`;
  }
  return `<div class="p-tag">Unstructured response</div><div class="p-prose">${escapeHtml(response.content)}</div>`;
}

function exportPdf(trail) {
  const doc = document.getElementById('audit-print-doc');

  const stepsHtml = trail.steps.map((step, i) => {
    const t = TASK_TYPES[step.type];
    const body = step.sourceComparison
      ? step.sourceComparison.dataElements.map(el => `
          <div class="p-el">
            <div class="p-el-head">${escapeHtml(el.label)} &mdash; chosen source: ${escapeHtml(el.chosenPlatform)}</div>
            ${el.candidates.map(c => `
              <div class="p-candidate">
                <div class="p-candidate-head">${escapeHtml(c.platform)} (${c.confidence}% confidence)</div>
                <div class="p-label">Prompt sent to LLM</div>
                <pre class="p-pre">${escapeHtml(c.prompt)}</pre>
                <div class="p-label">Response returned</div>
                ${printResponseHtml(c.response)}
              </div>
            `).join('')}
            <div class="p-final"><strong>Final value used:</strong> ${escapeHtml(el.chosenValue)}<br>${escapeHtml(el.reason)}</div>
          </div>
        `).join('')
      : `
        <div class="p-label">Prompt sent to LLM</div>
        <pre class="p-pre">${escapeHtml(step.prompt)}</pre>
        <div class="p-label">Response returned</div>
        ${printResponseHtml(step.response)}
      `;
    const decisions = (step.decisions || []).map(d => `<li>${escapeHtml(d)}</li>`).join('');
    return `
      <div class="p-step">
        <h3>${i + 1}. ${escapeHtml(step.label)} <span class="p-chip">${t.label}</span> <span class="p-chip p-status-${step.status}">${STATUS_LABEL[step.status] || step.status}</span></h3>
        <div class="p-step-meta">${escapeHtml(step.startedAt || '')} &middot; ${escapeHtml(step.duration)}</div>
        ${body}
        ${decisions ? `<div class="p-label">Agent decisions</div><ul class="p-decisions">${decisions}</ul>` : ''}
      </div>
    `;
  }).join('');

  doc.innerHTML = `
    <h1>Agent execution audit trail</h1>
    <div class="p-summary">
      <div><strong>Agent:</strong> ${escapeHtml(REVIEW_AGENT.name)}</div>
      <div><strong>Run:</strong> ${escapeHtml(trail.runId)}</div>
      <div><strong>Trigger:</strong> ${escapeHtml(trail.trigger)}</div>
      <div><strong>Started:</strong> ${escapeHtml(trail.startedAt)}</div>
      <div><strong>Duration:</strong> ${escapeHtml(trail.totalDuration)}</div>
      <div><strong>Status:</strong> ${STATUS_LABEL[trail.status] || trail.status}</div>
      <div><strong>Generated:</strong> for governance and compliance review</div>
    </div>
    ${stepsHtml}
  `;

  window.print();
}

document.addEventListener('DOMContentLoaded', init);
