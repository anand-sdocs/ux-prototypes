// Contract-playbook review — renders a mock contract + a weighted playbook
// scorecard against it. The score recomputes live as the playbook is edited.

let playbook = JSON.parse(JSON.stringify(PLAYBOOK));
let results = JSON.parse(JSON.stringify(ANALYSIS_RESULTS));
let pendingCategoryId = null;
let questionIdCounter = 1;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------

function allQuestions() {
  return playbook.flatMap(cat => cat.questions.map(q => ({ ...q, categoryId: cat.id, categoryName: cat.name })));
}

function computeScore() {
  let totalWeight = 0;
  let earnedWeight = 0;
  let favorableCount = 0;
  let unfavorableCount = 0;
  let pendingCount = 0;

  allQuestions().forEach(q => {
    const result = results[q.id];
    if (!result) { pendingCount++; return; }
    const weightValue = WEIGHT_VALUES[q.weight];
    totalWeight += weightValue;
    const favorable = result.answer === q.desiredAnswer;
    if (favorable) { earnedWeight += weightValue; favorableCount++; } else { unfavorableCount++; }
  });

  const pct = totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : null;
  return { pct, favorableCount, unfavorableCount, pendingCount };
}

function riskBandFor(pct) {
  return RISK_BANDS.find(b => pct >= b.min) || RISK_BANDS[RISK_BANDS.length - 1];
}

// ---------------------------------------------------------------
// Document pane
// ---------------------------------------------------------------

function renderDocPane() {
  const pane = document.getElementById('doc-pane');
  let html = `
    <div class="doc-meta-block">
      <h1>${escapeHtml(CONTRACT.title)}</h1>
      <div class="doc-meta-sub">
        Between ${escapeHtml(CONTRACT.parties)}<br>
        Effective ${escapeHtml(CONTRACT.effectiveDate)}
      </div>
    </div>
  `;
  let lastSection = null;
  CONTRACT.clauses.forEach(clause => {
    if (clause.section !== lastSection) {
      html += `<div class="clause-section-title">${escapeHtml(clause.section)}</div>`;
      lastSection = clause.section;
    }
    html += `
      <div class="clause-block" id="clause-${clause.id}">
        <h4>${escapeHtml(clause.heading)}</h4>
        <p>${escapeHtml(clause.text)}</p>
      </div>
    `;
  });
  pane.innerHTML = html;
}

function scrollToClause(clauseId) {
  document.querySelectorAll('.clause-block.highlight').forEach(el => el.classList.remove('highlight'));
  if (!clauseId) return;
  const el = document.getElementById(`clause-${clauseId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 2500);
}

// ---------------------------------------------------------------
// Score header + category list
// ---------------------------------------------------------------

function renderScoreHeader() {
  const { pct, favorableCount, unfavorableCount, pendingCount } = computeScore();
  const header = document.getElementById('score-header');
  if (pct == null) {
    header.innerHTML = `<div class="risk-score-note">No questions have been analyzed yet.</div>`;
    return;
  }
  const band = riskBandFor(pct);
  header.innerHTML = `
    <span class="risk-band-pill" style="background:${band.bg};color:${band.color};">${band.label}</span>
    <div class="risk-score-pct">${pct}% of weighted playbook criteria satisfied</div>
    <div class="risk-score-note">
      ${favorableCount} favorable &middot; ${unfavorableCount} flagged for review${pendingCount ? ` &middot; ${pendingCount} pending analysis` : ''}
    </div>
  `;

  document.getElementById('btn-reanalyze').style.display = pendingCount ? 'inline-flex' : 'none';
}

function renderCategoryList() {
  const container = document.getElementById('category-list');
  container.innerHTML = playbook.map(cat => {
    const tallies = cat.questions.reduce((acc, q) => {
      const r = results[q.id];
      if (!r) acc.pending++;
      else if (r.answer === q.desiredAnswer) acc.fav++;
      else acc.unfav++;
      return acc;
    }, { fav: 0, unfav: 0, pending: 0 });

    return `
      <div class="category-card" data-category="${cat.id}">
        <div class="category-head">
          <span class="category-name">${escapeHtml(cat.name)}</span>
          <span class="category-tally">${tallies.fav} ok${tallies.unfav ? `, ${tallies.unfav} flagged` : ''}${tallies.pending ? `, ${tallies.pending} pending` : ''}</span>
          <span class="chevron">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
        <div class="category-questions">
          ${cat.questions.map(q => renderQuestionRow(q)).join('')}
          <div class="add-question-row">
            <button class="add-question-link" data-add-question="${cat.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add question
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Open the first category by default.
  const first = container.querySelector('.category-card');
  if (first) first.classList.add('open');

  container.querySelectorAll('.category-head').forEach(head => {
    head.addEventListener('click', () => head.closest('.category-card').classList.toggle('open'));
  });
  container.querySelectorAll('[data-add-question]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuestionModal(btn.dataset.addQuestion);
    });
  });
  container.querySelectorAll('[data-cite]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      scrollToClause(btn.dataset.cite);
    });
  });
}

function renderQuestionRow(q) {
  const result = results[q.id];
  const favorable = result ? result.answer === q.desiredAnswer : null;
  const verdictClass = result == null ? 'pending' : (favorable ? 'favorable' : 'unfavorable');
  const verdictIcon = result == null ? '?' : (favorable ? '✓' : '!');

  return `
    <div class="question-row">
      <div class="question-row-head">
        <span class="verdict-icon ${verdictClass}">${verdictIcon}</span>
        <span class="question-text">${escapeHtml(q.text)}</span>
      </div>
      <div class="question-meta-row">
        <span class="weight-tag">${q.weight} weight</span>
        ${result
          ? `<span class="answer-tag ${verdictClass}">Answer: ${result.answer}${favorable ? '' : ` (wanted ${q.desiredAnswer})`}</span>`
          : `<span class="answer-tag pending">Pending analysis</span>`}
        ${result && result.clauseId ? `<button class="citation-link" data-cite="${result.clauseId}">View clause ${result.clauseId} →</button>` : ''}
      </div>
      ${result ? `<div class="excerpt-quote">&ldquo;${escapeHtml(result.excerpt)}&rdquo;</div>` : ''}
    </div>
  `;
}

// ---------------------------------------------------------------
// Re-analyze pending questions
// ---------------------------------------------------------------

document.getElementById('btn-reanalyze').addEventListener('click', () => {
  let count = 0;
  allQuestions().forEach(q => {
    if (!results[q.id]) {
      results[q.id] = { answer: q.desiredAnswer, clauseId: null, excerpt: 'No directly relevant clause found — treated as compliant by default. Review manually.' };
      count++;
    }
  });
  renderScoreHeader();
  renderCategoryList();
  showToast(`Re-analyzed the contract — ${count} new question${count === 1 ? '' : 's'} reviewed.`);
});

// ---------------------------------------------------------------
// Add-question modal
// ---------------------------------------------------------------

function openQuestionModal(categoryId) {
  pendingCategoryId = categoryId;
  document.getElementById('new-question-text').value = '';
  document.getElementById('new-question-desired').value = 'Yes';
  document.getElementById('new-question-weight').value = 'Medium';
  document.getElementById('question-modal').classList.add('show');
}
document.getElementById('question-modal-close').addEventListener('click', closeQuestionModal);
document.getElementById('question-modal-cancel').addEventListener('click', closeQuestionModal);
function closeQuestionModal() {
  document.getElementById('question-modal').classList.remove('show');
  pendingCategoryId = null;
}
document.getElementById('question-modal-save').addEventListener('click', () => {
  const text = document.getElementById('new-question-text').value.trim();
  if (!text || !pendingCategoryId) { showToast('Add a question first.'); return; }
  const cat = playbook.find(c => c.id === pendingCategoryId);
  cat.questions.push({
    id: `q-custom-${questionIdCounter++}`,
    text,
    desiredAnswer: document.getElementById('new-question-desired').value,
    weight: document.getElementById('new-question-weight').value,
  });
  closeQuestionModal();
  renderScoreHeader();
  renderCategoryList();
  renderPlaybookModalBody();
  showToast('Question added — click Re-analyze to review it against the contract.');
});

// ---------------------------------------------------------------
// Manage-playbook modal
// ---------------------------------------------------------------

document.getElementById('btn-manage-playbook').addEventListener('click', () => {
  renderPlaybookModalBody();
  document.getElementById('playbook-modal').classList.add('show');
});
document.getElementById('playbook-modal-close').addEventListener('click', closePlaybookModal);
document.getElementById('playbook-modal-done').addEventListener('click', closePlaybookModal);
function closePlaybookModal() {
  document.getElementById('playbook-modal').classList.remove('show');
}

function renderPlaybookModalBody() {
  const body = document.getElementById('playbook-modal-body');
  body.innerHTML = `
    <div id="playbook-category-rows"></div>
    <div class="field-group" style="margin-top:18px;">
      <label>Add a new category</label>
      <div style="display:flex;gap:8px;">
        <input type="text" class="text-input" id="new-category-name" placeholder="e.g. Data Privacy &amp; Security">
        <button class="btn btn-primary btn-sm" id="add-category-btn">Add</button>
      </div>
    </div>
  `;
  const rows = document.getElementById('playbook-category-rows');
  rows.innerHTML = playbook.map(cat => `
    <div class="field-row" style="align-items:center;margin-bottom:10px;">
      <div style="flex:1;font-size:13px;font-weight:600;">${escapeHtml(cat.name)}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-right:8px;">${cat.questions.length} question${cat.questions.length === 1 ? '' : 's'}</div>
      <button class="icon-btn" data-remove-category="${cat.id}" title="Remove category">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
  rows.querySelectorAll('[data-remove-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      playbook = playbook.filter(c => c.id !== btn.dataset.removeCategory);
      renderScoreHeader();
      renderCategoryList();
      renderPlaybookModalBody();
    });
  });
  document.getElementById('add-category-btn').addEventListener('click', () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) return;
    playbook.push({ id: `cat-custom-${Date.now()}`, name, questions: [] });
    renderCategoryList();
    renderPlaybookModalBody();
  });
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------

renderDocPane();
renderScoreHeader();
renderCategoryList();
