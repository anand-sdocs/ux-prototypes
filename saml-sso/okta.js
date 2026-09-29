const params = new URLSearchParams(location.search);
const flow = params.get('flow') || 'sp'; // sp | test
const main = document.getElementById('okta-main');

const USER_PICKER = OKTA_USERS.map(u => `<button type="button" class="link-btn" data-pick="${u.email}" style="font-size:12px;">${u.email}</button>`).join(' · ');

function usernameStep(prefill) {
  main.innerHTML = `
    <h2>Sign In</h2>
    ${flow === 'test' ? '<div class="callout callout-info" style="margin-top:0;"><div>S-Docs admin test: sign in as any user assigned to the S-Docs app.</div></div>' : ''}
    <form id="f">
      <label for="u">Username</label>
      <input type="email" id="u" value="${escapeHtml(prefill || '')}" required autofocus>
      <label class="okta-remember"><input type="checkbox" checked> Keep me signed in</label>
      <button class="okta-btn" type="submit">Next</button>
    </form>
    <p style="font-size:11.5px; color:#6e6e78; margin-top:14px; line-height:1.6;">Directory users: ${USER_PICKER}</p>
    <div class="okta-powered"><span class="okta-ring"></span> Powered by Okta</div>`;
  main.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { document.getElementById('u').value = b.dataset.pick; });
  document.getElementById('f').onsubmit = e => {
    e.preventDefault();
    const email = document.getElementById('u').value.trim().toLowerCase();
    // Simulated directory: anyone on the company domain exists in Okta.
    const user = OKTA_USERS.find(u => u.email === email)
      || (email.endsWith('@' + CUSTOMER.domain) ? { email } : null);
    if (!user) {
      main.querySelector('form').insertAdjacentHTML('afterbegin', '<div class="callout callout-danger" style="margin-top:0;"><div>Unable to sign in. This user isn\'t in the S-Docs Okta directory.</div></div>');
      return;
    }
    passwordStep(user);
  };
}

function passwordStep(user) {
  main.innerHTML = `
    <h2>Verify with your password</h2>
    <p style="text-align:center; font-size:13px; color:#6e6e78; margin:-8px 0 16px;">${escapeHtml(user.email)}</p>
    <form id="f">
      <label for="p">Password</label>
      <input type="password" id="p" value="••••••••" required autofocus>
      <button class="okta-btn" type="submit">Verify</button>
    </form>
    <p style="text-align:center; margin-top:14px;"><button class="link-btn" id="back" style="font-size:12.5px;">Back to sign in</button></p>`;
  document.getElementById('back').onclick = () => usernameStep(user.email);
  document.getElementById('f').onsubmit = e => { e.preventDefault(); pushStep(user); };
}

function pushStep(user) {
  main.innerHTML = `
    <div class="okta-push">
      <div class="phone"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg></div>
      <h2 style="margin-bottom:8px;">Get a push notification</h2>
      <p style="font-size:13px; color:#6e6e78; margin-bottom:18px;">Okta Verify push sent to Pixel 8. Approve it to continue.</p>
      <div class="spinner" style="width:22px;height:22px;border-width:3px;margin:0 auto;border-top-color:#1662dd;"></div>
    </div>`;
  setTimeout(() => postToAcs(user), 1700);
}

function postToAcs(user) {
  main.innerHTML = `
    <div style="text-align:center;">
      <h2 style="margin-bottom:8px;">Signing in to S-Docs&hellip;</h2>
      <p style="font-size:12.5px; color:#6e6e78; line-height:1.55;">Okta is posting a signed SAML response to<br><code>${escapeHtml(SP.acsUrl)}</code></p>
    </div>`;
  setTimeout(() => {
    location.href = `acs.html?flow=${flow}&email=${encodeURIComponent(user.email)}`;
  }, 1100);
}

renderToolbar('okta-signin.html', flow === 'test' ? 'Admin test sign-in' : 'Try jordan.kim@sdocs.com to see an Okta user with no S-Docs account');
usernameStep(params.get('login_hint'));
