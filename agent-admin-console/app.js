// Admin console — RBAC roles/permissions, connector allowlist, audit log,
// and policy alerts. All edits are in-memory for this session only; this
// prototype doesn't read or write state in any of the other prototypes.

let activeSection = 'roles';
let roleIdCounter = 1;

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

function levelClass(level) {
  return `level-${level.replace(/\s+/g, '-')}`;
}

// ---------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    activeSection = item.dataset.section;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    renderMain();
  });
});

function renderMain() {
  const main = document.getElementById('admin-main');
  if (activeSection === 'roles') main.innerHTML = rolesSectionHtml();
  if (activeSection === 'connectors') main.innerHTML = connectorsSectionHtml();
  if (activeSection === 'llm') main.innerHTML = llmSectionHtml();
  if (activeSection === 'audit') main.innerHTML = auditSectionHtml();
  if (activeSection === 'alerts') main.innerHTML = alertsSectionHtml();
  bindSectionEvents();
  renderAlertsBadge();
}

function renderAlertsBadge() {
  const unreviewed = ALERTS.filter(a => !a.reviewed).length;
  const badge = document.getElementById('alerts-badge');
  badge.textContent = unreviewed || '';
  badge.style.display = unreviewed ? 'inline-flex' : 'none';
}

// ---------------------------------------------------------------
// Roles & Permissions
// ---------------------------------------------------------------

function rolesSectionHtml() {
  return `
    <div class="admin-main-heading">
      <h1>Roles &amp; Permissions</h1>
      <p>Fine-grained, role-based access control. Each role grants a level of access &mdash; No access, Can view, or Can manage &mdash; per area of the platform. Assign roles to members below.</p>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Roles</h3>
        <span class="card-sub">${ROLES.length} roles</span>
      </div>
      <div class="perm-table-wrap">
        <table class="perm-table">
          <thead>
            <tr>
              <th>Role</th>
              ${PERMISSION_AREAS.map(a => `<th>${escapeHtml(a)}</th>`).join('')}
              <th></th>
            </tr>
          </thead>
          <tbody id="perm-table-body">
            ${ROLES.map(roleRowHtml).join('')}
          </tbody>
        </table>
      </div>
      <div class="add-role-row">
        <input type="text" class="text-input" id="new-role-name" placeholder="New role name, e.g. Contractor" style="flex:1;">
        <button class="btn btn-primary btn-sm" id="add-role-btn">Add role</button>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Members</h3>
        <span class="card-sub">${MEMBERS.length} people</span>
      </div>
      <div id="members-list">${MEMBERS.map(memberRowHtml).join('')}</div>
    </div>
  `;
}

function roleRowHtml(role) {
  return `
    <tr data-role-row="${role.id}">
      <td>
        <div class="role-name-cell">
          ${escapeHtml(role.name)}
          ${role.system ? `<span class="system-role-tag">Built-in</span>` : ''}
        </div>
      </td>
      ${PERMISSION_AREAS.map(area => `
        <td>
          <select class="perm-select ${levelClass(role.permissions[area])}" data-role="${role.id}" data-area="${escapeHtml(area)}">
            ${PERMISSION_LEVELS.map(l => `<option value="${l}" ${role.permissions[area] === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </td>
      `).join('')}
      <td>
        ${role.system ? '' : `<button class="icon-btn" data-remove-role="${role.id}" title="Remove role"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`}
      </td>
    </tr>
  `;
}

function memberRowHtml(member) {
  return `
    <div class="member-row">
      <div class="member-avatar">${escapeHtml(member.initials)}</div>
      <div class="member-info">
        <div class="member-name">${escapeHtml(member.name)}</div>
        <div class="member-meta">${escapeHtml(member.email)} &middot; ${escapeHtml(member.team)}</div>
      </div>
      <select class="role-select" data-member="${member.id}">
        ${ROLES.map(r => `<option value="${r.id}" ${member.roleId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
      </select>
    </div>
  `;
}

// ---------------------------------------------------------------
// Connector Policy
// ---------------------------------------------------------------

function connectorsSectionHtml() {
  return `
    <div class="admin-main-heading">
      <h1>Connector Policy</h1>
      <p>Only allowlisted systems can be connected by anyone in the organization &mdash; including inside agents they build themselves. Attempts to connect anything else are blocked and logged.</p>
    </div>
    <div class="card">
      <div class="card-head">
        <h3>Allowed connectors</h3>
        <span class="card-sub">${CONNECTOR_POLICY.filter(c => c.allowed).length} of ${CONNECTOR_POLICY.length} allowed</span>
      </div>
      <div id="connector-policy-list">${CONNECTOR_POLICY.map(connectorRowHtml).join('')}</div>
    </div>
  `;
}

function connectorRowHtml(c) {
  return `
    <div class="connector-policy-row">
      <span class="connector-icon-sm" style="background:${c.color}">${c.initials}</span>
      <span class="connector-policy-name">${escapeHtml(c.name)}</span>
      <span class="allow-tag ${c.allowed ? 'allowed' : 'blocked'}">${c.allowed ? 'Allowed' : 'Blocked'}</span>
      <button class="policy-toggle ${c.allowed ? 'on' : ''}" data-connector-toggle="${c.id}"></button>
    </div>
  `;
}

// ---------------------------------------------------------------
// LLM Models
// ---------------------------------------------------------------

let pendingAuthType = 'api_key';
let editingCustomModelId = null;
let pendingOAuthContext = null; // { forId, isNew, draft } while the consent modal is open

function llmSectionHtml() {
  const providers = [...new Set(LLM_MODELS.map(m => m.provider))];
  return `
    <div class="admin-main-heading">
      <h1>LLM Models</h1>
      <p>Control which large language models are available to agent builders. Enabled models can be selected as an agent's model in the builder; disabled ones are hidden there.</p>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Frontier models</h3>
        <span class="card-sub">${LLM_MODELS.filter(m => m.enabled).length} of ${LLM_MODELS.length} enabled</span>
      </div>
      ${providers.map(provider => `
        <div class="llm-provider-group">
          <div class="llm-provider-label">${escapeHtml(provider)}</div>
          ${LLM_MODELS.filter(m => m.provider === provider).map(modelRowHtml).join('')}
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Custom &amp; self-hosted models</h3>
        <span class="card-sub">${CUSTOM_MODELS.length} configured</span>
      </div>
      <div id="custom-models-list">${CUSTOM_MODELS.map(customModelRowHtml).join('')}</div>
      <div class="add-custom-model-row">
        <button class="btn btn-primary btn-sm" id="add-custom-model-btn">+ Add custom model</button>
      </div>
    </div>
  `;
}

function modelRowHtml(m) {
  return `
    <div class="model-row">
      <span class="model-icon-sm" style="background:${m.providerColor}">${m.initials}</span>
      <div class="model-info">
        <div class="model-name-row">
          <span class="model-name">${escapeHtml(m.name)}</span>
          ${m.default ? '<span class="default-model-tag">Default</span>' : ''}
        </div>
        <div class="model-version">${escapeHtml(m.version)}</div>
      </div>
      <span class="model-context">${escapeHtml(m.contextWindow)}</span>
      <button class="policy-toggle ${m.enabled ? 'on' : ''}" data-model-toggle="${m.id}"></button>
    </div>
  `;
}

function customModelRowHtml(m) {
  const authLabel = { api_key: 'API key', oauth2: 'OAuth 2.0', oidc: 'OpenID Connect' }[m.authType];
  return `
    <div class="custom-model-row">
      <span class="custom-model-icon">${escapeHtml(m.name.slice(0, 2).toUpperCase())}</span>
      <div class="model-info">
        <div class="model-name-row"><span class="model-name">${escapeHtml(m.name)}</span></div>
        <div class="custom-model-endpoint">${escapeHtml(m.endpoint)}</div>
      </div>
      <span class="auth-type-tag">${authLabel}</span>
      ${m.authType !== 'api_key' ? `<span class="conn-status-tag ${m.status}">${m.status === 'connected' ? 'Connected' : 'Not connected'}</span>` : ''}
      <button class="policy-toggle ${m.enabled ? 'on' : ''}" data-custom-model-toggle="${m.id}" title="Enable for agent builders"></button>
      <button class="icon-btn" data-remove-custom-model="${m.id}" title="Remove model">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
}

function openCustomModelModal() {
  editingCustomModelId = null;
  pendingAuthType = 'api_key';
  document.getElementById('cm-name').value = '';
  document.getElementById('cm-endpoint').value = '';
  document.getElementById('cm-api-key').value = '';
  document.getElementById('cm-client-id').value = '';
  document.getElementById('cm-client-secret').value = '';
  document.getElementById('cm-auth-url').value = '';
  document.getElementById('cm-token-url').value = '';
  document.getElementById('cm-scopes').value = 'model.invoke model.read';
  document.getElementById('cm-test-result').textContent = '';
  syncAuthFieldVisibility();
  document.querySelectorAll('#cm-auth-select .chip-option').forEach(c => c.classList.toggle('selected', c.dataset.value === 'api_key'));
  document.getElementById('custom-model-modal').classList.add('show');
}

function syncAuthFieldVisibility() {
  document.getElementById('cm-apikey-fields').style.display = pendingAuthType === 'api_key' ? '' : 'none';
  document.getElementById('cm-oauth-fields').style.display = pendingAuthType === 'api_key' ? 'none' : '';
  document.getElementById('cm-token-url-group').style.display = pendingAuthType === 'oidc' ? 'none' : '';
}

document.querySelectorAll('#cm-auth-select .chip-option').forEach(chip => {
  chip.addEventListener('click', () => {
    pendingAuthType = chip.dataset.value;
    document.querySelectorAll('#cm-auth-select .chip-option').forEach(c => c.classList.toggle('selected', c === chip));
    syncAuthFieldVisibility();
  });
});

document.getElementById('custom-model-cancel')?.addEventListener('click', () => {
  document.getElementById('custom-model-modal').classList.remove('show');
});

document.getElementById('cm-test-connection')?.addEventListener('click', () => {
  const name = document.getElementById('cm-name').value.trim() || 'this model';
  const authUrl = document.getElementById('cm-auth-url').value.trim() || 'auth.example.com';
  pendingOAuthContext = { fromModal: true };
  openOAuthConsent(name, authUrl, pendingAuthType);
});

document.getElementById('custom-model-save')?.addEventListener('click', () => {
  const name = document.getElementById('cm-name').value.trim();
  const endpoint = document.getElementById('cm-endpoint').value.trim();
  if (!name || !endpoint) { showToast('Name and endpoint are required.'); return; }
  const model = {
    id: `custom-${customModelIdCounter++}`,
    name,
    endpoint,
    authType: pendingAuthType,
    status: pendingAuthType === 'api_key' ? 'connected' : (document.getElementById('cm-test-result').textContent ? 'connected' : 'not_connected'),
    clientId: document.getElementById('cm-client-id').value.trim(),
    authUrl: document.getElementById('cm-auth-url').value.trim(),
    tokenUrl: document.getElementById('cm-token-url').value.trim(),
    scopes: document.getElementById('cm-scopes').value.trim(),
    enabled: true,
  };
  CUSTOM_MODELS.push(model);
  document.getElementById('custom-model-modal').classList.remove('show');
  AUDIT_LOG.unshift({ time: 'Just now', actor: 'You', action: 'Added custom model', detail: `${model.name} (${{ api_key: 'API key', oauth2: 'OAuth 2.0', oidc: 'OpenID Connect' }[model.authType]})`, type: 'policy' });
  renderMain();
  showToast(`"${model.name}" added and enabled for agent builders.`);
});

function openOAuthConsent(modelName, authUrl, authType) {
  let host;
  try { host = new URL(authUrl.includes('://') ? authUrl : `https://${authUrl}`).host; } catch (e) { host = authUrl; }
  document.getElementById('oauth-consent-host').textContent = host;
  document.getElementById('oauth-consent-model-name').textContent = 'S-Docs Agent Platform';
  const scopesText = document.getElementById('cm-scopes')?.value.trim() || 'model.invoke model.read';
  const label = authType === 'oidc' ? 'OpenID Connect' : 'OAuth 2.0';
  document.getElementById('oauth-scope-list').innerHTML = `
    <div>&#10003; Invoke this model on the org's behalf</div>
    <div>&#10003; ${escapeHtml(scopesText)}</div>
    <div style="color:var(--text-muted);">via ${label}</div>
  `;
  document.getElementById('oauth-consent-modal').classList.add('show');
}

document.getElementById('oauth-consent-deny')?.addEventListener('click', () => {
  document.getElementById('oauth-consent-modal').classList.remove('show');
  pendingOAuthContext = null;
});

document.getElementById('oauth-consent-allow')?.addEventListener('click', () => {
  document.getElementById('oauth-consent-modal').classList.remove('show');
  if (pendingOAuthContext?.fromModal) {
    document.getElementById('cm-test-result').textContent = '✓ Connection verified';
  }
  pendingOAuthContext = null;
});

// ---------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------

function auditSectionHtml() {
  return `
    <div class="admin-main-heading">
      <h1>Audit Log</h1>
      <p>A record of access changes, connections, and policy-relevant activity across the platform.</p>
    </div>
    <div class="card">
      <table class="audit-table">
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th><th>Type</th></tr></thead>
        <tbody>
          ${AUDIT_LOG.map(row => `
            <tr>
              <td class="audit-time">${escapeHtml(row.time)}</td>
              <td>${escapeHtml(row.actor)}</td>
              <td>${escapeHtml(row.action)}</td>
              <td>${escapeHtml(row.detail)}</td>
              <td><span class="audit-type-tag ${row.type}">${row.type}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------

function alertsSectionHtml() {
  return `
    <div class="admin-main-heading">
      <h1>Alerts</h1>
      <p>Policy-relevant events that may need a follow-up &mdash; blocked connections, new enterprise-wide publishes, and access requests.</p>
    </div>
    <div class="card">
      <div id="alerts-list">${ALERTS.map(alertCardHtml).join('')}</div>
    </div>
  `;
}

function alertCardHtml(alert) {
  return `
    <div class="alert-card ${alert.reviewed ? '' : 'unreviewed'}" data-alert-row="${alert.id}">
      <span class="alert-icon ${alert.severity}">${alert.severity === 'warning' ? '!' : 'i'}</span>
      <div class="alert-body">
        <div class="alert-title">${escapeHtml(alert.title)}</div>
        <div class="alert-detail">${escapeHtml(alert.detail)}</div>
        <div class="alert-time">${escapeHtml(alert.time)}</div>
      </div>
      <div class="alert-actions">
        ${alert.reviewed
          ? `<span class="card-sub">Reviewed</span>`
          : `<button class="btn btn-outline btn-sm" data-mark-reviewed="${alert.id}">Mark reviewed</button>`}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------
// Event binding (re-bound after every render)
// ---------------------------------------------------------------

function bindSectionEvents() {
  document.querySelectorAll('.perm-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const role = ROLES.find(r => r.id === sel.dataset.role);
      role.permissions[sel.dataset.area] = sel.value;
      sel.className = `perm-select ${levelClass(sel.value)}`;
      showToast(`${role.name}: ${sel.dataset.area} set to "${sel.value}".`);
    });
  });
  document.querySelectorAll('[data-remove-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const roleId = btn.dataset.removeRole;
      const inUse = MEMBERS.some(m => m.roleId === roleId);
      if (inUse) { showToast('Reassign members off this role before removing it.'); return; }
      const idx = ROLES.findIndex(r => r.id === roleId);
      ROLES.splice(idx, 1);
      renderMain();
    });
  });
  document.getElementById('add-role-btn')?.addEventListener('click', () => {
    const name = document.getElementById('new-role-name').value.trim();
    if (!name) return;
    const blank = {};
    PERMISSION_AREAS.forEach(a => { blank[a] = 'No access'; });
    ROLES.push({ id: `role-custom-${roleIdCounter++}`, name, system: false, permissions: blank });
    renderMain();
    showToast(`Role "${name}" created — set its permissions above.`);
  });
  document.querySelectorAll('[data-member]').forEach(sel => {
    sel.addEventListener('change', () => {
      const member = MEMBERS.find(m => m.id === sel.dataset.member);
      const newRole = ROLES.find(r => r.id === sel.value);
      AUDIT_LOG.unshift({ time: 'Just now', actor: 'You', action: 'Changed role', detail: `${member.name}: ${ROLES.find(r => r.id === member.roleId).name} → ${newRole.name}`, type: 'role' });
      member.roleId = sel.value;
      showToast(`${member.name} is now ${newRole.name}.`);
    });
  });
  document.querySelectorAll('[data-connector-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = CONNECTOR_POLICY.find(x => x.id === btn.dataset.connectorToggle);
      c.allowed = !c.allowed;
      AUDIT_LOG.unshift({ time: 'Just now', actor: 'You', action: 'Updated connector policy', detail: `${c.allowed ? 'Allowed' : 'Disallowed'} ${c.name} org-wide`, type: 'policy' });
      renderMain();
    });
  });
  document.querySelectorAll('[data-model-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = LLM_MODELS.find(x => x.id === btn.dataset.modelToggle);
      m.enabled = !m.enabled;
      AUDIT_LOG.unshift({ time: 'Just now', actor: 'You', action: 'Updated LLM policy', detail: `${m.enabled ? 'Enabled' : 'Disabled'} ${m.name} for agent builders`, type: 'policy' });
      renderMain();
    });
  });
  document.querySelectorAll('[data-custom-model-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = CUSTOM_MODELS.find(x => x.id === btn.dataset.customModelToggle);
      m.enabled = !m.enabled;
      AUDIT_LOG.unshift({ time: 'Just now', actor: 'You', action: 'Updated LLM policy', detail: `${m.enabled ? 'Enabled' : 'Disabled'} ${m.name} for agent builders`, type: 'policy' });
      renderMain();
    });
  });
  document.querySelectorAll('[data-remove-custom-model]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = CUSTOM_MODELS.findIndex(x => x.id === btn.dataset.removeCustomModel);
      const [removed] = CUSTOM_MODELS.splice(idx, 1);
      AUDIT_LOG.unshift({ time: 'Just now', actor: 'You', action: 'Removed custom model', detail: removed.name, type: 'policy' });
      renderMain();
      showToast(`"${removed.name}" removed.`);
    });
  });
  document.getElementById('add-custom-model-btn')?.addEventListener('click', openCustomModelModal);
  document.querySelectorAll('[data-mark-reviewed]').forEach(btn => {
    btn.addEventListener('click', () => {
      const alert = ALERTS.find(a => a.id === btn.dataset.markReviewed);
      alert.reviewed = true;
      renderMain();
    });
  });
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------

renderMain();
