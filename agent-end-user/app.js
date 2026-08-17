// End-user agent catalogue — browse, run, and (if permitted) clone agents.
// Runs are scripted/mocked; cloning and "create agent" hand off to the
// power-user builder prototype rather than duplicating that flow here.

let clonedAgents = [];

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

function taskChips(taskTypes) {
  return taskTypes.map(k => {
    const t = TASK_TYPE_META[k];
    return `<span class="mini-task-chip" style="color:${t.color};background:${t.color}1a;">${t.label}</span>`;
  }).join('');
}

function allAgents() {
  return [...AGENTS, ...clonedAgents];
}

function matchesSearch(agent, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return agent.name.toLowerCase().includes(q) || agent.description.toLowerCase().includes(q);
}

// ---------------------------------------------------------------
// Access banner
// ---------------------------------------------------------------

function renderAccessBanner() {
  const el = document.getElementById('access-banner');
  if (CURRENT_USER.hasCreatorAccess) {
    el.innerHTML = `
      <div class="access-banner granted">
        <div class="access-text"><strong>You have creator access.</strong> Build your own agent, or clone one from the catalogue below to customize.</div>
        <a class="btn btn-primary btn-sm" href="../sdocs-agent-builder/index.html">+ Build an agent</a>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="access-banner">
        <div class="access-text"><strong>You don't have creator access yet.</strong> You can run any agent below, but building your own requires access from your workspace admin.</div>
        <button class="btn btn-outline btn-sm" id="btn-request-access">Request creator access</button>
      </div>
    `;
    document.getElementById('btn-request-access').addEventListener('click', () => {
      showToast('Request sent to your workspace admin.');
    });
  }
}

// ---------------------------------------------------------------
// Catalogue rendering
// ---------------------------------------------------------------

function agentCardHtml(agent) {
  const canClone = CURRENT_USER.hasCreatorAccess && !agent.creatorIsCurrentUser;
  return `
    <div class="agent-card" data-agent="${agent.id}">
      <div class="agent-card-head">
        <div class="agent-name">${escapeHtml(agent.name)}</div>
        <span class="visibility-tag ${agent.visibility}">${agent.visibility}</span>
      </div>
      <div class="agent-desc">${escapeHtml(agent.description)}</div>
      <div class="task-chip-row">${taskChips(agent.taskTypes)}</div>
      <div class="agent-meta-row">
        <span>${agent.creatorIsCurrentUser ? 'Created by you' : `By ${escapeHtml(agent.creator)}`}</span>
        <span>&middot;</span>
        <span>${agent.runsCount} runs</span>
      </div>
      <div class="agent-card-actions">
        <button class="btn btn-primary btn-sm" data-run="${agent.id}">Run</button>
        ${!agent.creatorIsCurrentUser ? `<button class="btn btn-outline btn-sm" data-clone="${agent.id}" ${canClone ? '' : 'disabled'} title="${canClone ? '' : 'Requires creator access'}">Clone to customize</button>` : ''}
      </div>
    </div>
  `;
}

function renderCatalogue() {
  const query = document.getElementById('search-input').value.trim();
  const agents = allAgents().filter(a => matchesSearch(a, query));

  const mine = agents.filter(a => a.creatorIsCurrentUser);
  const team = agents.filter(a => !a.creatorIsCurrentUser && a.visibility === 'Team' && a.teamId === CURRENT_USER.teamId);
  const enterprise = agents.filter(a => !a.creatorIsCurrentUser && a.visibility === 'Enterprise');

  document.getElementById('team-sub').textContent = `From ${TEAMS[CURRENT_USER.teamId]}`;

  renderGrid('my-agents-grid', mine, "You haven't created any agents yet.");
  renderGrid('team-agents-grid', team, 'No agents have been shared with your team yet.');
  renderGrid('enterprise-agents-grid', enterprise, 'No enterprise agents match your search.');

  bindCardActions();
}

function renderGrid(elementId, agents, emptyText) {
  const el = document.getElementById(elementId);
  el.innerHTML = agents.length ? agents.map(agentCardHtml).join('') : `<div class="empty-note">${escapeHtml(emptyText)}</div>`;
}

function bindCardActions() {
  document.querySelectorAll('[data-run]').forEach(btn => {
    btn.addEventListener('click', () => openRunModal(btn.dataset.run));
  });
  document.querySelectorAll('[data-clone]:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => cloneAgent(btn.dataset.clone));
  });
  document.querySelectorAll('[data-clone]:disabled').forEach(btn => {
    btn.addEventListener('click', () => showToast('Cloning requires creator access — request it above.'));
  });
}

function cloneAgent(agentId) {
  const source = allAgents().find(a => a.id === agentId);
  const clone = { ...source, id: `clone-${Date.now()}`, name: `${source.name} (Copy)`, creator: CURRENT_USER.name, creatorIsCurrentUser: true, visibility: 'Private', runsCount: 0 };
  clonedAgents.push(clone);
  renderCatalogue();
  showToast(`Cloned "${source.name}" into My agents.`);
}

// ---------------------------------------------------------------
// Run modal
// ---------------------------------------------------------------

function openRunModal(agentId) {
  const agent = allAgents().find(a => a.id === agentId);
  document.getElementById('run-modal-title').textContent = agent.name;
  document.getElementById('run-modal').classList.add('show');
  runSteps(agent, 0);
}

function runSteps(agent, index) {
  const steps = RUN_STEPS_BY_AGENT[agent.id] || RUN_STEPS_BY_AGENT.a1;
  const body = document.getElementById('run-modal-body');

  if (index === 0) body.innerHTML = '';
  if (index < steps.length) {
    const row = document.createElement('div');
    row.className = 'run-step running';
    row.innerHTML = `<span class="run-step-icon"><span class="spinner-sm"></span></span><span>${escapeHtml(steps[index])}</span>`;
    body.appendChild(row);
    setTimeout(() => {
      row.classList.remove('running');
      row.classList.add('done');
      row.querySelector('.run-step-icon').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
      runSteps(agent, index + 1);
    }, 700);
  } else {
    const result = RUN_RESULT_BY_AGENT[agent.id] || 'Run completed successfully.';
    const card = document.createElement('div');
    card.className = 'run-result-card';
    card.innerHTML = `<div class="run-result-label">✓ Complete</div><p>${escapeHtml(result)}</p>`;
    body.appendChild(card);
  }
}

document.getElementById('run-modal-close').addEventListener('click', closeRunModal);
document.getElementById('run-modal-done').addEventListener('click', closeRunModal);
function closeRunModal() {
  document.getElementById('run-modal').classList.remove('show');
}

// ---------------------------------------------------------------
// Access scenario toggle (prototype control)
// ---------------------------------------------------------------

document.getElementById('access-select').addEventListener('change', (e) => {
  CURRENT_USER.hasCreatorAccess = e.target.value === 'yes';
  renderAccessBanner();
  renderCatalogue();
});

document.getElementById('search-input').addEventListener('input', renderCatalogue);

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------

document.getElementById('access-select').value = CURRENT_USER.hasCreatorAccess ? 'yes' : 'no';
renderAccessBanner();
renderCatalogue();
