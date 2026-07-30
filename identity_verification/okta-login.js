document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || 'user@example.com';

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

    // Final submit: show loading, then redirect back to the e-sign flow
    form.style.display = 'none';
    loading.classList.add('show');

    setTimeout(() => {
      window.location.href = 'index.html?verified=oidc';
    }, 1400);
  });
});
