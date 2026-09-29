const card = document.getElementById('card');

const G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 35 24 35c-6.1 0-11.1-3.4-13.6-8.4l-6.6 5.1C7.5 39.6 15.1 44 24 44c11 0 20-8.9 20-20 0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l6-6C34.5 5.7 29.5 4 24 4 15.9 4 8.9 8.5 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-1.8 13.8-4.9l-6.4-5.4C29.4 35.5 26.9 36 24 36c-5.4 0-9.9-2.6-11.4-6.6l-6.6 5.1C8.9 39.5 15.9 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.6 4.6-4.7 6l6.4 5.4C40.6 36.5 44 30.9 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>';
const MS_ICON = '<svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f25022" d="M0 0h11v11H0z"/><path fill="#00a4ef" d="M12 0h11v11H12z"/><path fill="#7fba00" d="M0 12h11v11H0z"/><path fill="#ffb900" d="M12 12h11v11H12z"/></svg>';
const KEY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const BACK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';

function header() {
  return `<div class="logo">${LOGO_SVG}<span class="logo-word">s-docs</span></div>`;
}

function errorCallout(html) {
  return `<div class="callout callout-danger" style="text-align:left;"><div>${html}</div></div>`;
}

function mainView(notice) {
  card.innerHTML = `${header()}
    <h1>Sign in to S-Docs</h1>
    <p class="sub">Use your work account to continue</p>
    ${notice || ''}
    <button class="auth-btn" id="btn-google">${G_ICON} Continue with Google</button>
    <button class="auth-btn" id="btn-ms">${MS_ICON} Continue with Microsoft</button>
    <div class="divider">or</div>
    <button class="auth-btn" id="btn-sso">${KEY_ICON} Sign in with SSO</button>
    <p class="auth-foot">By continuing you agree to the S-Docs Terms and Privacy Policy.</p>`;
  document.getElementById('btn-sso').onclick = () => ssoView();
  document.getElementById('btn-google').onclick = () => { location.href = 'home.html?via=google&email=anarasimhan%40sdocs.com'; };
  document.getElementById('btn-ms').onclick = () => { location.href = 'home.html?via=microsoft&email=anarasimhan%40sdocs.com'; };
}

function ssoView(prefill, error) {
  card.innerHTML = `
    <button class="link-btn back-link" id="back">${BACK} Back</button>
    ${header()}
    <h1>Sign in with SSO</h1>
    <p class="sub">Enter your work email and we'll send you to your company's sign-in page.</p>
    ${error || ''}
    <form id="sso-form">
      <label class="field-label" for="email">Work email</label>
      <input class="input" id="email" type="email" placeholder="you@company.com" value="${escapeHtml(prefill || '')}" required autofocus>
      <button class="auth-btn primary" type="submit">Continue</button>
    </form>`;
  document.getElementById('back').onclick = () => mainView();
  document.getElementById('sso-form').onsubmit = e => {
    e.preventDefault();
    discover(document.getElementById('email').value.trim().toLowerCase());
  };
}

function discover(email) {
  const domain = email.split('@')[1] || '';
  if (!END_USER_SSO.domains.includes(domain)) {
    ssoView(email, errorCallout(`SSO isn't set up for <strong>@${escapeHtml(domain)}</strong>. Sign in with Google or Microsoft, or ask your S-Docs admin to turn on SSO.`));
    return;
  }
  card.innerHTML = `${header()}
    <div style="text-align:center; padding:12px 0 6px;">
      <div class="spinner" style="width:28px;height:28px;border-width:3px;margin:0 auto 18px;"></div>
      <h1 style="font-size:17px;">Redirecting to ${END_USER_SSO.idpLabel}&hellip;</h1>
    </div>`;
  setTimeout(() => { location.href = `okta-signin.html?flow=sp&login_hint=${encodeURIComponent(email)}`; }, 1200);
}

const ERRORS = {
  no_account: email => `We couldn't find an S-Docs account for <strong>${escapeHtml(email)}</strong>. Ask your S-Docs admin to add you, then try again.`,
  sso_not_configured: email => `SSO isn't set up for <strong>@${escapeHtml(email.split('@')[1] || '')}</strong>. Sign in with Google or Microsoft instead.`,
  default: () => `We couldn't sign you in with SSO. Try again, or contact your S-Docs admin.`
};

renderToolbar('login.html', 'SP-initiated: user starts at S-Docs. Try jordan.kim@sdocs.com for a user without an S-Docs account');
const params = new URLSearchParams(location.search);
const err = params.get('error');
if (err) {
  mainView(errorCallout((ERRORS[err] || ERRORS.default)(params.get('email') || '')));
  history.replaceState(null, '', 'login.html');
} else if (params.get('signed_out')) {
  mainView('<div class="callout callout-success" style="text-align:left;"><div>You\'re signed out of S-Docs.</div></div>');
} else {
  mainView();
}
