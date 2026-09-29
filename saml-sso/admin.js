let state = loadState();

const ICON = {
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  cert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="13" rx="2"/><circle cx="12" cy="17" r="3"/><path d="m10.5 19.5-1 3 2.5-1 2.5 1-1-3M7 8h10M7 11h6"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
  lock: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.5"/></svg>',
  upload: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>'
};

const IDPS = [
  { type: 'okta', label: 'Okta', color: '#1662dd', mark: 'O' },
  { type: 'entra', label: 'Microsoft Entra ID', color: '#0078d4', mark: 'E' },
  { type: 'google', label: 'Google Workspace', color: '#34a853', mark: 'G' },
  { type: 'other', label: 'Other SAML 2.0', color: '#5d5a5f', mark: '•' }
];

const STEPS = ['S-Docs details', 'Identity provider', 'Domains & access', 'Test & enable'];

let ui = { idpType: 'okta', idpTab: 'url', parsed: null, newDomain: '', pendingDomain: null };

function persist() { saveState(state); updateToolbarState(); }

function render() {
  document.getElementById('header-slot').replaceWith(renderAppHeader('Settings'));
  renderInto();
}

function renderInto() {
  const pill = document.getElementById('status-pill');
  const actions = document.getElementById('title-actions');
  actions.innerHTML = '';
  const map = {
    none: ['pill-muted', 'Not configured'],
    setup: ['pill-warn', 'Setup in progress'],
    enabled: ['pill-success', 'Enabled'],
    disabled: ['pill-muted', 'Disabled']
  };
  const [cls, txt] = map[state.status];
  pill.innerHTML = `<span class="pill ${cls}">${txt}</span>`;
  updateToolbarState();

  const content = document.getElementById('content');
  if (state.status === 'none') content.innerHTML = emptyView();
  else if (state.status === 'setup') content.innerHTML = wizardView();
  else if (state.status === 'enabled') content.innerHTML = enabledView();
  else content.innerHTML = disabledView();

  bind();
}

/* ---------------- Empty / disabled ---------------- */

function emptyView() {
  return `
  <section class="section">
    <div class="section-head">
      <h3>SAML single sign-on</h3>
      <p>Let your team sign in to S-Docs with your company identity provider, like Okta or Microsoft Entra ID.</p>
    </div>
    <div class="card empty">
      <div class="icon-ring">${ICON.lock}</div>
      <h4>Set up SAML SSO for ${escapeHtml(CUSTOMER.name)}</h4>
      <p>S-Docs generates a signing certificate and SAML metadata for your account. You add S-Docs as an app in your identity provider, then paste its details back here.</p>
      <div class="feature-list">
        <span>${ICON.check} SP- and IdP-initiated sign-in</span>
        <span>${ICON.check} Matches users by email</span>
        <span>${ICON.check} Works with any SAML 2.0 IdP</span>
      </div>
      <button class="btn btn-primary" data-action="start">Set up SSO</button>
      <p style="margin:16px auto 0; font-size:12px;">About 10 minutes. You'll need admin access to your identity provider.</p>
    </div>
  </section>`;
}

function disabledView() {
  return `
  <section class="section">
    <div class="section-head">
      <h3>SAML single sign-on</h3>
      <p>SSO is turned off. Users sign in with Google or Microsoft.</p>
    </div>
    <div class="card empty">
      <div class="icon-ring">${ICON.lock}</div>
      <h4>SSO is disabled</h4>
      <p>Your Okta connection and certificate are saved. Turning SSO back on restores the same configuration, so nothing needs to change in your identity provider.</p>
      <button class="btn btn-primary" data-action="reenable">Turn SSO back on</button>
      <button class="btn" data-action="start-over" style="margin-left:6px;">Start over</button>
    </div>
  </section>`;
}

/* ---------------- Wizard ---------------- */

function stepperHtml() {
  return `<div class="stepper">${STEPS.map((label, i) => {
    const n = i + 1;
    const cls = n < state.step ? 'done' : n === state.step ? 'active' : '';
    return `<div class="step ${cls}"><span class="num">${n < state.step ? ICON.check : n}</span><span class="txt">${label}</span>${n < STEPS.length ? '<span class="line"></span>' : ''}</div>`;
  }).join('')}</div>`;
}

function wizardView() {
  const body = [step1, step2, step3, step4][state.step - 1]();
  return `
  <section class="section stacked">
    <div class="section-head">
      <h3>Set up SAML SSO</h3>
      <p>Step ${state.step} of ${STEPS.length}. You can leave and come back; progress is saved.</p>
      <button class="link-btn push" data-action="cancel-setup">Cancel setup</button>
    </div>
    <div>
      ${stepperHtml()}
      ${body}
    </div>
  </section>`;
}

function readonly(label, sub, value) {
  return `<div class="row"><div class="label">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</div>
    <div class="readonly-field"><span class="value">${escapeHtml(value)}</span><button class="btn btn-icon" data-copy="${escapeHtml(value)}" title="Copy">${ICON.copy}</button></div></div>`;
}

function certBlock(cert) {
  const days = Math.round((new Date(cert.expiresAt) - Date.now()) / 86400000);
  return `<div class="cert">
    <div class="cert-icon">${ICON.cert}</div>
    <div class="cert-meta"><strong>${escapeHtml(cert.subject)}</strong><br>
      Self-signed X.509 · ${cert.algorithm} · Expires ${fmtDate(cert.expiresAt)} (${days} days)<br>
      <span class="mono">SHA-256 ${cert.fingerprint.slice(0, 47)}…</span></div>
    <span class="pill pill-success">Active</span>
  </div>`;
}

function step1() {
  if (!state.cert) {
    return `<div class="card">
      <h4>Generate your S-Docs signing certificate</h4>
      <p class="lead">S-Docs creates a certificate and private key unique to your account. The private key never leaves S-Docs; your identity provider only gets the public certificate, inside the SAML metadata.</p>
      <button class="btn btn-primary" data-action="gen-cert">${ICON.cert} Generate certificate</button>
    </div>`;
  }
  return `<div class="card">
    <h4>Add S-Docs to your identity provider</h4>
    <p class="lead">Download the metadata file and import it into your identity provider, or copy the values below into its SAML app settings.</p>
    ${certBlock(state.cert)}
    <div class="download-row">
      <button class="btn btn-primary" data-action="dl-metadata">${ICON.download} Download SAML metadata (.xml)</button>
      <button class="btn" data-action="dl-cert">${ICON.download} Download certificate (.pem)</button>
      <button class="btn" data-copy="${SP.entityId}">${ICON.copy} Copy metadata URL</button>
    </div>
    <div style="margin-top:18px;">
      ${readonly('Entity ID', 'Audience URI in Okta', SP.entityId)}
      ${readonly('ACS URL', 'Single sign-on URL in Okta', SP.acsUrl)}
      ${readonly('Name ID format', null, 'EmailAddress')}
      ${readonly('Application username', null, 'Email')}
    </div>
    <div class="callout callout-info">${ICON.info}<div><strong>In Okta:</strong>
      <ol>
        <li>Go to <em>Applications &rarr; Create App Integration &rarr; SAML 2.0</em> and name it <em>S-Docs</em>.</li>
        <li>Paste the <em>ACS URL</em> into <em>Single sign-on URL</em> and the <em>Entity ID</em> into <em>Audience URI</em>.</li>
        <li>Set <em>Name ID format</em> to <em>EmailAddress</em> and <em>Application username</em> to <em>Email</em>.</li>
        <li>Under <em>SAML Signing Certificates</em>, upload the S-Docs certificate so Okta can verify signed requests.</li>
        <li>Assign the people or groups who should use S-Docs, then copy Okta's <em>Metadata URL</em> for the next step.</li>
      </ol></div></div>
    <div class="wizard-footer">
      <span></span>
      <button class="btn btn-primary" data-action="next">I've added S-Docs to my IdP &rarr;</button>
    </div>
  </div>`;
}

function step2() {
  const tiles = IDPS.map(i => `<div class="idp-tile ${ui.idpType === i.type ? 'selected' : ''}" data-idp="${i.type}">
    <div class="mark" style="background:${i.color}">${i.mark}</div>${i.label}</div>`).join('');
  const tabs = [['url', 'Metadata URL'], ['upload', 'Upload metadata XML'], ['manual', 'Enter manually']]
    .map(([k, l]) => `<button class="${ui.idpTab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('');
  const label = IDPS.find(i => i.type === ui.idpType).label;

  let tabBody = '';
  if (ui.idpTab === 'url') {
    tabBody = `<div class="row"><label>${label} metadata URL</label>
      <div><input class="input" id="md-url" value="${ui.idpType === 'okta' ? OKTA.metadataUrl : ''}" placeholder="https://…/metadata">
      <div style="margin-top:8px;"><button class="btn btn-sm" data-action="fetch-md">Fetch metadata</button></div></div></div>`;
  } else if (ui.idpTab === 'upload') {
    tabBody = `<div class="dropzone" data-action="upload-md">${ICON.upload}<br>Drop your IdP metadata XML here, or <strong style="color:var(--primary)">browse</strong><br><span style="font-size:12px">e.g. okta-metadata.xml</span></div>`;
  } else {
    tabBody = `
      <div class="row"><label>IdP entity ID <span class="sub">Issuer</span></label><input class="input" id="m-entity" value="${OKTA.entityId}"></div>
      <div class="row"><label>IdP SSO URL <span class="sub">HTTP-Redirect or POST</span></label><input class="input" id="m-sso" value="${OKTA.ssoUrl}"></div>
      <div class="row"><label>IdP signing certificate <span class="sub">PEM (X.509)</span></label><textarea class="textarea" id="m-cert">-----BEGIN CERTIFICATE-----
MIIDqDCCApCgAwIBAgIGAZK3xW1PMA0GCSqGSIb3DQEBCwUAMIGUMQswCQYDVQQG…
-----END CERTIFICATE-----</textarea></div>
      <div style="text-align:right;"><button class="btn btn-sm" data-action="save-manual">Validate details</button></div>`;
  }

  const parsed = ui.parsed ? `<div class="parsed">
      <div style="font-weight:600; color:var(--success); margin-bottom:6px;">${ICON.check} Identity provider details found (${escapeHtml(ui.parsed.source)})</div>
      <div class="kv"><span>IdP entity ID</span><span>${escapeHtml(ui.parsed.entityId)}</span></div>
      <div class="kv"><span>SSO URL</span><span>${escapeHtml(ui.parsed.ssoUrl)}</span></div>
      <div class="kv"><span>Signing certificate</span><span>SHA-256 ${escapeHtml(ui.parsed.certFingerprint.slice(0, 35))}… · expires ${fmtDate(ui.parsed.certExpires)}</span></div>
    </div>` : '';

  return `<div class="card">
    <h4>Connect your identity provider</h4>
    <p class="lead">Tell S-Docs where to send users to sign in and how to verify the responses it gets back.</p>
    <div class="idp-tiles">${tiles}</div>
    <div class="tabs">${tabs}</div>
    ${tabBody}
    ${parsed}
    <div class="wizard-footer">
      <button class="btn" data-action="back">&larr; Back</button>
      <button class="btn btn-primary" data-action="next" ${ui.parsed || state.idp ? '' : 'disabled'}>Continue &rarr;</button>
    </div>
  </div>`;
}

function step3() {
  const domains = state.domains.map((d, i) => `<div class="domain-item">
      <span class="name">@${escapeHtml(d.name)}</span>
      ${d.verified ? '<span class="pill pill-success">Verified</span>' : '<span class="pill pill-warn">Pending verification</span>'}
      ${d.verified ? '' : `<button class="btn btn-sm" data-verify="${i}">Check DNS</button>`}
      ${state.domains.length > 1 ? `<button class="btn btn-icon" data-remove-domain="${i}" title="Remove">${ICON.x}</button>` : ''}
    </div>`).join('');
  const pending = ui.pendingDomain != null && state.domains[ui.pendingDomain] && !state.domains[ui.pendingDomain].verified
    ? `<div class="callout callout-warn">${ICON.warn}<div>Add this DNS TXT record to <strong>${escapeHtml(state.domains[ui.pendingDomain].name)}</strong> to prove your company owns it, then click <em>Check DNS</em>.
        <div class="txt-record">sdocs-verification=${escapeHtml(state.domains[ui.pendingDomain].token)}</div></div></div>` : '';

  return `<div class="card">
    <h4>Email domains</h4>
    <p class="lead">Users whose work email is on these domains can use SSO. Domains must be verified so no other S-Docs account can claim them.</p>
    <div class="domain-list">${domains}</div>
    <div class="add-domain"><input class="input" id="new-domain" placeholder="e.g. sdocs.co.uk" style="max-width:280px;"><button class="btn" data-action="add-domain">Add domain</button></div>
    ${pending}
  </div>
  <div class="card">
    <h4>Matching users</h4>
    <p class="lead">S-Docs reads the email from the SAML assertion's Name ID and looks for a user with that email in ${escapeHtml(CUSTOMER.name)}.</p>
    <label class="radio-card ${state.unmatched === 'deny' ? 'selected' : ''}">
      <input type="radio" name="unmatched" value="deny" ${state.unmatched === 'deny' ? 'checked' : ''}>
      <div><strong>Only let in existing users</strong><span>If no S-Docs user has that email, sign-in is blocked and the person is asked to contact an admin. Add people from Settings &rarr; Users first.</span></div>
    </label>
    <label class="radio-card disabled">
      <input type="radio" name="unmatched" value="jit" disabled>
      <div><strong>Create an account automatically <span class="pill pill-info" style="margin-left:4px;">Coming later</span></strong><span>Just-in-time provisioning: add a new User on first sign-in from a verified domain.</span></div>
    </label>
  </div>
  <div class="card">
    <h4>Sign-in options</h4>
    <div class="toggle-row">
      <div class="text"><strong>Allow sign-in from your identity provider's dashboard</strong><span>IdP-initiated SSO. Lets people open S-Docs from the Okta tile. S-Docs still checks the signature, audience, and time window on every response.</span></div>
      <label class="switch"><input type="checkbox" id="idp-initiated" ${state.idpInitiated ? 'checked' : ''}><span class="slider"></span></label>
    </div>
    <div class="wizard-footer">
      <button class="btn" data-action="back">&larr; Back</button>
      <button class="btn btn-primary" data-action="next" ${state.domains.some(d => d.verified) ? '' : 'disabled'}>Continue &rarr;</button>
    </div>
  </div>`;
}

function step4() {
  const params = new URLSearchParams(location.search);
  const testEmail = params.get('email');
  const testResult = params.get('test');
  let result = '';
  if (testResult) {
    const user = SDOCS_USERS.find(u => u.email === testEmail);
    const passed = testResult === 'ok' && user;
    result = `<div class="callout ${passed ? 'callout-success' : 'callout-danger'}">${passed ? ICON.check : ICON.x}<div>
      ${passed ? `<strong>Test passed.</strong> Okta signed in <strong>${escapeHtml(testEmail)}</strong> and S-Docs matched it to <strong>${escapeHtml(user.name)}</strong> (${user.role}).`
               : `<strong>Test failed.</strong> ${escapeHtml(testEmail || 'The user')} signed in to Okta, but there's no S-Docs user with that email. Add them in Settings &rarr; Users, or test with a different account.`}
    </div></div>
    <ul class="checklist">
      <li class="ok"><span class="ic">${ICON.check}</span>Response signed by Okta's certificate<span class="detail">RSA-SHA256</span></li>
      <li class="ok"><span class="ic">${ICON.check}</span>Audience matches S-Docs entity ID<span class="detail">${CUSTOMER.id}</span></li>
      <li class="ok"><span class="ic">${ICON.check}</span>Assertion within time window<span class="detail">NotOnOrAfter +5m</span></li>
      <li class="ok"><span class="ic">${ICON.check}</span>Email on a verified domain<span class="detail">@${CUSTOMER.domain}</span></li>
      <li class="${user ? 'ok' : 'fail'}"><span class="ic">${user ? ICON.check : ICON.x}</span>Matched to an S-Docs user<span class="detail">${escapeHtml(testEmail || '')}</span></li>
    </ul>`;
    if (passed && !state.tested) { state.tested = true; persist(); }
  }

  return `<div class="card">
    <h4>Test the connection</h4>
    <p class="lead">Sign in through Okta once as a real user. S-Docs checks the response but doesn't turn SSO on until you click <em>Enable SSO</em>.</p>
    <button class="btn" data-action="run-test">Run test sign-in with Okta &nearr;</button>
    ${result}
  </div>
  <div class="card">
    <h4>Review</h4>
    <div class="kv-list">
      <div class="kv"><span>Identity provider</span><span>${escapeHtml(state.idp ? state.idp.label : '—')}</span></div>
      <div class="kv"><span>Domains</span><span>${state.domains.filter(d => d.verified).map(d => '@' + escapeHtml(d.name)).join(', ')}</span></div>
      <div class="kv"><span>Unmatched emails</span><span>Blocked</span></div>
      <div class="kv"><span>IdP-initiated</span><span>${state.idpInitiated ? 'Allowed' : 'Off'}</span></div>
      <div class="kv"><span>Other sign-in</span><span>Google and Microsoft stay available. You can require SSO after it's on.</span></div>
    </div>
    <div class="wizard-footer">
      <button class="btn" data-action="back">&larr; Back</button>
      <button class="btn btn-primary" data-action="enable" ${state.tested ? '' : 'disabled'} title="${state.tested ? '' : 'Run a successful test first'}">Enable SSO</button>
    </div>
  </div>`;
}

/* ---------------- Enabled ---------------- */

function enabledView() {
  const certDays = Math.round((new Date(state.cert.expiresAt) - Date.now()) / 86400000);
  const logs = state.logins.length ? state.logins.map(l => `<tr>
      <td>${escapeHtml(l.email)}</td><td>${escapeHtml(l.flow)}</td>
      <td>${l.result === 'Success' ? '<span class="pill pill-success">Success</span>' : `<span class="pill pill-danger">${escapeHtml(l.result)}</span>`}</td>
      <td style="color:var(--text-muted)">${fmtDateTime(l.at)}</td></tr>`).join('')
    : '<tr><td colspan="4" style="color:var(--text-muted)">No SSO sign-ins yet.</td></tr>';

  document.getElementById('title-actions').innerHTML = `<a class="btn" href="login.html" target="_blank">Open sign-in page &nearr;</a>`;

  return `
  <section class="section stacked">
    <div class="section-head">
      <h3>Connection</h3>
      <p>People on your verified domains can sign in through ${escapeHtml(state.idp.label)}.</p>
    </div>
    <div class="summary-grid">
      <div class="card summary-card">
        <h5>Identity provider <span class="pill pill-success">Connected</span></h5>
        <div class="kv-list">
          <div class="kv"><span>Provider</span><span>${escapeHtml(state.idp.label)}</span></div>
          <div class="kv"><span>Entity ID</span><span class="mono">${escapeHtml(state.idp.entityId)}</span></div>
          <div class="kv"><span>SSO URL</span><span class="mono">${escapeHtml(state.idp.ssoUrl)}</span></div>
          <div class="kv"><span>Cert expires</span><span>${fmtDate(state.idp.certExpires)}</span></div>
        </div>
        <div class="download-row"><button class="btn btn-sm" data-action="edit-idp">Update IdP details</button></div>
      </div>
      <div class="card summary-card">
        <h5>S-Docs service provider</h5>
        <div class="kv-list">
          <div class="kv"><span>Entity ID</span><span class="mono">${escapeHtml(SP.entityId)}</span></div>
          <div class="kv"><span>ACS URL</span><span class="mono">${escapeHtml(SP.acsUrl)}</span></div>
          <div class="kv"><span>Certificate</span><span>Expires ${fmtDate(state.cert.expiresAt)} ${certDays < 60 ? '<span class="pill pill-warn">Rotate soon</span>' : `(${certDays} days)`}</span></div>
        </div>
        <div class="download-row">
          <button class="btn btn-sm" data-action="dl-metadata">${ICON.download} Metadata</button>
          <button class="btn btn-sm" data-action="dl-cert">${ICON.download} Certificate</button>
          <button class="btn btn-sm" data-action="rotate">Rotate certificate</button>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h3>Access</h3>
      <p>Who can use SSO and how strictly it's enforced.</p>
    </div>
    <div class="card">
      <div class="toggle-row">
        <div class="text"><strong>Require SSO for ${state.domains.filter(d => d.verified).map(d => '@' + escapeHtml(d.name)).join(', ')}</strong><span>Turns off Google and Microsoft sign-in for these domains. Account admins can still use a recovery sign-in link, so a broken IdP never locks you out.</span></div>
        <label class="switch"><input type="checkbox" id="require-sso" ${state.requireSso ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div class="text"><strong>Allow sign-in from the ${escapeHtml(state.idp.label)} dashboard</strong><span>IdP-initiated SSO from the app tile.</span></div>
        <label class="switch"><input type="checkbox" id="idp-initiated-2" ${state.idpInitiated ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div class="text"><strong>Unmatched emails</strong><span>Blocked. Only people who already have an S-Docs user can sign in.</span></div>
        <span class="pill pill-muted">Existing users only</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h3>Recent SSO sign-ins</h3>
      <p>The last few attempts, including ones S-Docs blocked.</p>
    </div>
    <div class="card" style="padding:6px 12px;">
      <table class="log"><thead><tr><th>User</th><th>Flow</th><th>Result</th><th>When</th></tr></thead><tbody>${logs}</tbody></table>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h3>Turn off SSO</h3>
      <p>Users go back to signing in with Google or Microsoft.</p>
    </div>
    <div class="card" style="display:flex; align-items:center; gap:16px;">
      <div style="flex:1; font-size:13px; color:var(--text-muted);">Your configuration is kept, so you can turn SSO back on without changing anything in Okta.</div>
      <button class="btn btn-danger" data-action="disable">Disable SSO</button>
    </div>
  </section>`;
}

/* ---------------- Events ---------------- */

function openModal(title, body, confirmLabel, onConfirm, danger) {
  const m = document.getElementById('modal');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  const btn = document.getElementById('modal-confirm');
  btn.textContent = confirmLabel;
  btn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  btn.onclick = () => { m.classList.remove('open'); onConfirm(); };
  document.getElementById('modal-cancel').onclick = () => m.classList.remove('open');
  m.classList.add('open');
}

function bind() {
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(b.dataset.copy));
  document.querySelectorAll('[data-idp]').forEach(t => t.onclick = () => { ui.idpType = t.dataset.idp; ui.parsed = null; renderInto(); });
  document.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { ui.idpTab = t.dataset.tab; renderInto(); });
  document.querySelectorAll('[data-verify]').forEach(b => b.onclick = () => {
    b.innerHTML = '<span class="spinner"></span>';
    setTimeout(() => { state.domains[+b.dataset.verify].verified = true; ui.pendingDomain = null; persist(); renderInto(); toast('Domain verified'); }, 1100);
  });
  document.querySelectorAll('[data-remove-domain]').forEach(b => b.onclick = () => { state.domains.splice(+b.dataset.removeDomain, 1); ui.pendingDomain = null; persist(); renderInto(); });
  document.querySelectorAll('input[name=unmatched]').forEach(r => r.onchange = () => { state.unmatched = r.value; persist(); renderInto(); });

  const idpInit = document.getElementById('idp-initiated') || document.getElementById('idp-initiated-2');
  if (idpInit) idpInit.onchange = () => { state.idpInitiated = idpInit.checked; persist(); toast(idpInit.checked ? 'IdP-initiated sign-in allowed' : 'IdP-initiated sign-in turned off'); };

  const req = document.getElementById('require-sso');
  if (req) req.onchange = () => {
    if (req.checked) {
      req.checked = false;
      openModal('Require SSO?', `Google and Microsoft sign-in will stop working for everyone on your verified domains. Make sure everyone who needs S-Docs is assigned to the S-Docs app in ${escapeHtml(state.idp.label)}.`, 'Require SSO', () => { state.requireSso = true; persist(); renderInto(); toast('SSO is now required'); });
    } else { state.requireSso = false; persist(); toast('SSO is optional again'); }
  };

  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', e => {
    const a = el.dataset.action;
    if (el.disabled) return;
    if (a === 'start') { state.status = 'setup'; state.step = 1; persist(); renderInto(); }
    if (a === 'start-over') { resetState(); state = loadState(); state.status = 'setup'; persist(); renderInto(); }
    if (a === 'reenable') { state.status = 'enabled'; persist(); renderInto(); toast('SSO turned back on'); }
    if (a === 'cancel-setup') openModal('Cancel SSO setup?', 'Your generated certificate and any IdP details are discarded. Nothing changes for your users.', 'Cancel setup', () => { resetState(); state = loadState(); history.replaceState(null, '', 'admin.html'); renderInto(); }, true);
    if (a === 'gen-cert') {
      el.innerHTML = '<span class="spinner"></span> Generating…';
      setTimeout(() => { state.cert = generateCert(); persist(); renderInto(); toast('Certificate generated'); }, 900);
    }
    if (a === 'dl-metadata') { downloadFile(`sdocs-saml-metadata-${CUSTOMER.id}.xml`, spMetadataXml(state.cert), 'application/samlmetadata+xml'); toast('Metadata downloaded'); }
    if (a === 'dl-cert') { downloadFile(`sdocs-saml-${CUSTOMER.id}.pem`, certPem(state.cert), 'application/x-pem-file'); toast('Certificate downloaded'); }
    if (a === 'next') {
      if (state.step === 2 && ui.parsed) state.idp = Object.assign({ type: ui.idpType, label: IDPS.find(i => i.type === ui.idpType).label }, ui.parsed);
      state.step = Math.min(4, state.step + 1); persist(); history.replaceState(null, '', 'admin.html'); renderInto(); window.scrollTo(0, 0);
    }
    if (a === 'back') { state.step = Math.max(1, state.step - 1); persist(); history.replaceState(null, '', 'admin.html'); renderInto(); }
    if (a === 'fetch-md') {
      el.innerHTML = '<span class="spinner"></span> Fetching…';
      setTimeout(() => { ui.parsed = { entityId: OKTA.entityId, ssoUrl: OKTA.ssoUrl, certFingerprint: OKTA.certFingerprint, certExpires: OKTA.certExpires, source: 'Metadata URL' }; renderInto(); }, 900);
    }
    if (a === 'upload-md') { ui.parsed = { entityId: OKTA.entityId, ssoUrl: OKTA.ssoUrl, certFingerprint: OKTA.certFingerprint, certExpires: OKTA.certExpires, source: 'okta-metadata.xml' }; renderInto(); }
    if (a === 'save-manual') {
      ui.parsed = { entityId: document.getElementById('m-entity').value, ssoUrl: document.getElementById('m-sso').value, certFingerprint: OKTA.certFingerprint, certExpires: OKTA.certExpires, source: 'entered manually' };
      renderInto();
    }
    if (a === 'add-domain') {
      const v = (document.getElementById('new-domain').value || '').trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v)) { toast('Enter a domain like example.com'); return; }
      if (state.domains.some(d => d.name === v)) { toast('Domain already added'); return; }
      state.domains.push({ name: v, verified: false, token: `${CUSTOMER.id}-${randomHex(6).join('').toLowerCase()}` }); ui.pendingDomain = state.domains.length - 1; persist(); renderInto();
    }
    if (a === 'run-test') location.href = 'okta-signin.html?flow=test';
    if (a === 'enable') {
      openModal('Enable SSO?', `People on ${state.domains.filter(d => d.verified).map(d => '@' + escapeHtml(d.name)).join(', ')} will see <strong>Sign in with SSO</strong> on the S-Docs sign-in page. Google and Microsoft sign-in keep working until you choose to require SSO.`, 'Enable SSO', () => {
        state.status = 'enabled'; persist(); history.replaceState(null, '', 'admin.html'); renderInto(); toast('SSO enabled');
      });
    }
    if (a === 'edit-idp') { state.status = 'setup'; state.step = 2; ui.parsed = Object.assign({}, state.idp); persist(); renderInto(); }
    if (a === 'rotate') openModal('Rotate certificate?', 'S-Docs creates a new certificate. Both certificates are accepted for 30 days so you can download the new metadata and update Okta without downtime.', 'Generate new certificate', () => {
      state.cert = generateCert(); persist(); renderInto(); toast('New certificate generated. Update Okta within 30 days.');
    });
    if (a === 'disable') openModal('Disable SSO?', 'Users sign in with Google or Microsoft instead. If SSO is required, anyone without a Google or Microsoft account on the same email will be unable to sign in until you turn SSO back on.', 'Disable SSO', () => {
      state.status = 'disabled'; state.requireSso = false; persist(); renderInto(); toast('SSO disabled');
    }, true);
  }));
}

renderToolbar('admin.html', 'Account admin, Enterprise plan', { stateControls: true });
render();
if (window.matchMedia('(max-width: 900px)').matches) {
  const nav = document.querySelector('.settings-nav');
  const active = nav.querySelector('a.active');
  nav.scrollLeft = active.offsetLeft - 16;
}
