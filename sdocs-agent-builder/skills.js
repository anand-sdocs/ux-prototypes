// Read-only skills library — groups the seeded SKILLS by which task type they
// attach to. Actually attaching a skill happens inside a task's subflow in
// the builder (builder.js), not here; this page is just the catalogue view.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function skillCardHtml(skill) {
  const detail = skill.taskType === 'analyze'
    ? `${skill.payload.playbook.length} categor${skill.payload.playbook.length === 1 ? 'y' : 'ies'}, ${skill.payload.playbook.reduce((sum, c) => sum + c.questions.length, 0)} questions`
    : skill.taskType === 'extract'
      ? `${skill.payload.schema.length} fields`
      : `Template: ${DOCUMENT_TEMPLATES.find(t => t.id === skill.payload.templateId).label}`;

  return `
    <div class="card" style="margin-bottom:12px;">
      <div class="card-head">
        <h3>${escapeHtml(skill.name)}</h3>
        <span class="task-chip ${skill.taskType}">${TASK_TYPES[skill.taskType].label}</span>
      </div>
      <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">${escapeHtml(skill.description)}</p>
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--text-muted);">
        <span>${escapeHtml(detail)}</span>
        <span>Used by ${skill.usedByAgents} agent${skill.usedByAgents === 1 ? '' : 's'}</span>
      </div>
    </div>
  `;
}

function renderSkills() {
  const order = ['extract', 'generate', 'analyze', 'save', 'notify'];
  const container = document.getElementById('skills-sections');
  container.innerHTML = order.map(taskType => {
    const skills = SKILLS.filter(s => s.taskType === taskType);
    if (!skills.length) return '';
    return `
      <div class="grid-2-even" style="margin-bottom:8px;">
        <div style="grid-column:1/-1;">
          <h3 style="font-size:14px;margin:18px 0 10px;">${TASK_TYPES[taskType].label} skills</h3>
        </div>
      </div>
      <div style="margin-bottom:20px;">${skills.map(skillCardHtml).join('')}</div>
    `;
  }).join('');
}

renderSkills();
