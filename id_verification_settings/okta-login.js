document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const appName = params.get('app') || 'S-Docs E-Signature';
  const email = params.get('email') || 'anarasimhan@sdocs.com';
  const scopes = params.get('scopes') || 'profile email openid';

  document.getElementById('idp-app-name').textContent = appName;
  document.getElementById('idp-scope-note').textContent = `Requested access: ${scopes}`;

  const usernameInput = document.getElementById('idp-username');
  const passwordGroup = document.getElementById('idp-password-group');
  const passwordInput = document.getElementById('idp-password');
  const submitBtn = document.getElementById('idp-submit-btn');
  const title = document.getElementById('idp-title');
  const form = document.getElementById('idp-form');
  const loading = document.getElementById('idp-loading');

  usernameInput.value = email;

  let stage = 'username';

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (stage === 'username') {
      stage = 'password';
      passwordGroup.style.display = 'block';
      passwordInput.value = '••••••••••';
      title.textContent = 'Verify with your password';
      submitBtn.textContent = 'Sign In';
      setTimeout(() => passwordInput.focus(), 100);
      return;
    }

    // Final submit: show loading, then hand off to the redirect URI with a mock auth result.
    form.style.display = 'none';
    loading.classList.add('show');

    setTimeout(() => {
      const forward = new URLSearchParams(window.location.search);
      window.location.href = `connection-success.html?${forward.toString()}`;
    }, 1400);
  });
});
