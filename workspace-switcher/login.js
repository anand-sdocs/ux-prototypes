/**
 * Sign-in screen logic.
 *
 * Flow: user clicks Google or Microsoft -> we simulate an OAuth round trip
 * -> the "IdP" hands back an email -> that email is looked up against
 * customer_user records. If it resolves to more than one workspace, send
 * the user to the picker; if only one, skip straight into the app (the
 * common case, and the one that must not regress when we add the picker).
 */
(function () {
  const scenarioSelect = document.getElementById("scenario-select");
  const loginStatus = document.getElementById("login-status");
  const loginStatusText = document.getElementById("login-status-text");
  const btnGoogle = document.getElementById("btn-google");
  const btnMicrosoft = document.getElementById("btn-microsoft");

  clearSession();

  function signIn(providerLabel) {
    const scenario = LOGIN_SCENARIOS[scenarioSelect.value];

    btnGoogle.disabled = true;
    btnMicrosoft.disabled = true;
    loginStatus.classList.add("show");
    loginStatusText.textContent = `Signing you in with ${providerLabel}…`;

    setTimeout(() => {
      setSession({
        email: scenario.email,
        name: scenario.name,
        initials: scenario.initials,
        workspaceIds: scenario.workspaceIds,
        currentWorkspaceId: scenario.workspaceIds.length === 1 ? scenario.workspaceIds[0] : null,
      });

      if (scenario.workspaceIds.length > 1) {
        loginStatusText.textContent = `${scenario.email} is linked to ${scenario.workspaceIds.length} workspaces…`;
        setTimeout(() => { window.location.href = "workspace-select.html"; }, 500);
      } else {
        window.location.href = "app.html";
      }
    }, 700);
  }

  btnGoogle.addEventListener("click", () => signIn("Google"));
  btnMicrosoft.addEventListener("click", () => signIn("Microsoft"));
})();
