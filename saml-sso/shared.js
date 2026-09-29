// Shared state + helpers for the SAML SSO prototype.
// State lives in localStorage so the admin setup and the end-user flow line up.

const SSO_KEY = 'sdocs-saml-sso-proto';

const CUSTOMER = {
  id: 'cus_8f3a2c',
  name: 'S-Docs',
  website: 'https://www.sdocs.com/',
  domain: 'sdocs.com'
};

// Paths mirror Spring Security SAML2 defaults so engineering can map them 1:1.
const SP = {
  entityId: `https://auth.sdocs.com/saml2/service-provider-metadata/${CUSTOMER.id}`,
  acsUrl: `https://auth.sdocs.com/login/saml2/sso/${CUSTOMER.id}`,
  loginUrl: `https://auth.sdocs.com/saml2/authenticate/${CUSTOMER.id}`,
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
};

const OKTA = {
  org: 'sdocs',
  entityId: 'http://www.okta.com/exk9x2sdocs1A2b3C4d5',
  ssoUrl: 'https://sdocs.okta.com/app/sdocs_sdocs_1/exk9x2sdocs1A2b3C4d5/sso/saml',
  metadataUrl: 'https://sdocs.okta.com/app/exk9x2sdocs1A2b3C4d5/sso/saml/metadata',
  certFingerprint: '4E:1A:9C:77:03:B2:5D:E8:61:0F:AA:3C:91:D4:2B:7E:C0:58:16:9F:E3:44:0A:D2:8B:71:5C:36:F9:02:BE:17',
  certExpires: '2036-04-11T12:00:00Z'
};

// Fixed SSO config for the end-user pages; independent of the admin prototype's state.
const END_USER_SSO = { idpLabel: 'Okta', domains: [CUSTOMER.domain] };

// Users that "exist" in the S-Docs user table for this customer.
const SDOCS_USERS = [
  { email: 'anarasimhan@sdocs.com', name: 'Anand Narasimhan', role: 'Admin' },
  { email: 'priya.shah@sdocs.com', name: 'Priya Shah', role: 'User' },
  { email: 'marcus.lee@sdocs.com', name: 'Marcus Lee', role: 'User' }
];

// Okta directory users (the IdP side). One of them has no S-Docs account.
const OKTA_USERS = [
  { email: 'anarasimhan@sdocs.com', first: 'Anand', last: 'Narasimhan', password: 'demo' },
  { email: 'priya.shah@sdocs.com', first: 'Priya', last: 'Shah', password: 'demo' },
  { email: 'jordan.kim@sdocs.com', first: 'Jordan', last: 'Kim', password: 'demo' }
];

function defaultState() {
  return {
    status: 'none', // none | setup | enabled | disabled
    step: 1,
    cert: null,
    idp: null,
    domains: [{ name: CUSTOMER.domain, verified: true }],
    unmatched: 'deny',
    idpInitiated: true,
    requireSso: false,
    tested: false,
    logins: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SSO_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* storage unavailable; fall back to defaults */ }
  return defaultState();
}

function saveState(state) {
  try { localStorage.setItem(SSO_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function resetState() {
  try { localStorage.removeItem(SSO_KEY); } catch (e) { /* ignore */ }
}

function seedEnabledState() {
  const s = defaultState();
  s.status = 'enabled';
  s.step = 4;
  s.cert = generateCert();
  s.idp = { type: 'okta', label: 'Okta', entityId: OKTA.entityId, ssoUrl: OKTA.ssoUrl, certFingerprint: OKTA.certFingerprint, certExpires: OKTA.certExpires, source: 'Metadata URL' };
  s.tested = true;
  s.logins = [
    { email: 'priya.shah@sdocs.com', flow: 'SP-initiated', result: 'Success', at: minutesAgo(42) },
    { email: 'jordan.kim@sdocs.com', flow: 'IdP-initiated', result: 'Denied — no matching user', at: minutesAgo(180) },
    { email: 'anarasimhan@sdocs.com', flow: 'SP-initiated', result: 'Success', at: minutesAgo(1440) }
  ];
  saveState(s);
  return s;
}

function minutesAgo(m) { return new Date(Date.now() - m * 60000).toISOString(); }

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(arr) : arr.forEach((_, i) => { arr[i] = Math.floor(Math.random() * 256); });
  return Array.from(arr, b => b.toString(16).padStart(2, '0').toUpperCase());
}

function randomBase64(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function generateCert() {
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 3);
  const body = 'MIIDpDCCAoygAwIBAgIGAY' + randomBase64(1180);
  return {
    subject: `CN=S-Docs SAML SP (${CUSTOMER.id}), O=S-Docs`,
    serial: randomHex(8).join(':'),
    fingerprint: randomHex(32).join(':'),
    algorithm: 'RSA 2048 · SHA-256',
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    body
  };
}

function certPem(cert) {
  const lines = cert.body.match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`;
}

function spMetadataXml(cert) {
  const x509 = cert.body.match(/.{1,64}/g).join('\n          ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${SP.entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>
          ${x509}
          </ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>
          ${x509}
          </ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>${SP.nameIdFormat}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${SP.acsUrl}" index="1" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>
`;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(text) {
  const done = () => toast('Copied to clipboard');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, done);
  } else {
    done();
  }
}

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const LOGO_SVG = `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
  <polygon points="9,2 18,6.5 9,11" fill="#e8583a"/>
  <polygon points="4,9 15,14.5 4,20" fill="#8e6bd6"/>
  <polygon points="15,9.5 24,14 15,18" fill="#f2b21b"/>
  <polygon points="4,20 15,14.5 15,26.5 4,31" fill="#2f86d6"/>
  <polygon points="15,18 28,12.5 28,24.5 15,30" fill="#7a9b47"/>
</svg>`;

const PAGES = [
  { href: 'admin.html', label: 'Admin: SSO settings' },
  { href: 'login.html', label: 'End user: S-Docs sign-in' },
  { href: 'okta-dashboard.html', label: 'End user: Okta dashboard' }
];

function renderToolbar(current, hint, opts = {}) {
  const bar = document.createElement('div');
  bar.className = 'proto-toolbar';
  const links = PAGES.map(p => `<a href="${p.href}" class="${p.href === current ? 'current' : ''}">${p.label}</a>`).join('');
  bar.innerHTML = `
    <span class="proto-badge">Prototype</span>
    ${links}
    <span class="hint">${hint || ''}</span>
    <span class="spacer"></span>
    ${opts.stateControls ? `
      <span class="hint" id="proto-state"></span>
      <button id="proto-seed" title="Jump to a fully configured Okta connection">Use configured SSO</button>
      <button id="proto-reset" title="Clear prototype state">Reset</button>` : ''}`;
  document.body.prepend(bar);
  if (opts.stateControls) {
    bar.querySelector('#proto-seed').addEventListener('click', () => { seedEnabledState(); location.reload(); });
    bar.querySelector('#proto-reset').addEventListener('click', () => { resetState(); location.href = location.pathname; });
    updateToolbarState();
  }
}

function updateToolbarState() {
  const el = document.getElementById('proto-state');
  if (!el) return;
  const s = loadState();
  const text = { enabled: 'SSO enabled', setup: 'SSO setup in progress', disabled: 'SSO disabled', none: 'SSO not configured' }[s.status];
  el.textContent = `State: ${text}${s.status === 'enabled' && s.requireSso ? ' (required)' : ''}`;
}

function renderAppHeader(activeNav, initial = 'A') {
  const header = document.createElement('header');
  header.className = 'app-header';
  const nav = ['Signature requests', 'Documents', 'Templates', 'Settings']
    .map(n => `<span class="${n === activeNav ? 'active' : ''}">${n}</span>`).join('');
  header.innerHTML = `
    <div class="logo">${LOGO_SVG}<span class="logo-word">s-docs</span><span class="badge-enterprise">ENTERPRISE</span></div>
    <nav class="main-nav">${nav}</nav>
    <div class="header-right">
      <span>&#9432; help &#8964;</span>
      <div class="avatar">${escapeHtml(initial)}</div>
    </div>`;
  return header;
}
