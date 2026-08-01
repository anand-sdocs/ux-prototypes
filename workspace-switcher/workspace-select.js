/**
 * Post-login workspace picker: shown only when the authenticated email
 * resolves to more than one customer_user record. Selecting a card commits
 * currentWorkspaceId to the session and drops the user into the app.
 */
(function () {
  const session = getSession();

  // No session, or this identity only has one workspace -- nothing to pick.
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  if (session.workspaceIds.length <= 1) {
    window.location.href = "app.html";
    return;
  }

  document.getElementById("picker-subtitle").innerHTML =
    `<strong>${session.email}</strong> is linked to ${session.workspaceIds.length} S-Docs workspaces. Select one to continue.`;

  const list = document.getElementById("workspace-list");
  session.workspaceIds.forEach((id) => {
    const ws = getWorkspaceById(id);
    if (!ws) return;

    const card = document.createElement("button");
    card.className = "workspace-card";
    card.innerHTML = `
      <div class="ws-avatar" style="background:${ws.color};">${ws.orgName.charAt(0)}</div>
      <div class="ws-info">
        <div class="ws-name-row">
          <span class="ws-org-name">${ws.orgName}</span>
        </div>
        <div class="ws-meta-row">
          <div class="ws-meta-line ws-account-id">${workspaceIdentifierLine(ws)}</div>
        </div>
      </div>
      <svg class="ws-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
    `;
    card.addEventListener("click", () => {
      session.currentWorkspaceId = id;
      setSession(session);
      window.location.href = "app.html";
    });
    list.appendChild(card);
  });

  document.getElementById("btn-sign-out").addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });
})();
