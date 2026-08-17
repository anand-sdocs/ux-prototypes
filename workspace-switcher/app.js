/**
 * Main app shell (Templates screen) + the workspace switcher reachable from
 * the avatar menu in the top-right, matching the existing S-Docs app chrome.
 */
(function () {
  const session = getSession();
  if (!session || !session.currentWorkspaceId) {
    window.location.href = "index.html";
    return;
  }

  // Mock template rows -- static content, unaffected by which workspace is
  // active. In the real app this list would be re-fetched per tenant.
  const TEMPLATES = [
    { status: "draft", name: "Untitled Document", meta: ["1 signer profile"], category: "Template", owner: "Anand Narasimhan", last: "16 hour(s) ago" },
    { status: "published", name: "Template no inputs", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Anand Narasimhan", last: "16 hour(s) ago" },
    { status: "draft", name: "Untitled Document", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Shaun Bokhari", last: "1 day(s) ago" },
    { status: "draft", name: "Untitled Document", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Shaun Bokhari", last: "2 day(s) ago" },
    { status: "published", name: "template with inputs", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Anand Narasimhan", last: "15 day(s) ago" },
    { status: "draft", name: "Untitled Document", meta: ["Contact", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Shaun Bokhari", last: "15 day(s) ago" },
    { status: "draft", name: "Untitled Document", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "PDF Template", owner: "Chris Garlotta", last: "18 day(s) ago" },
    { status: "draft", name: "Untitled Document", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Chris Garlotta", last: "18 day(s) ago" },
    { status: "published", name: "Template 2", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Anand Narasimhan", last: "23 day(s) ago" },
    { status: "published", name: "Template 1", meta: ["Company", "S-Docs for HubSpot", "1 signer profile"], category: "Template", owner: "Anand Narasimhan", last: "23 day(s) ago" },
  ];

  const headerWsPill = document.getElementById("header-ws-pill");
  const avatarBtn = document.getElementById("avatar-btn");
  const userDropdown = document.getElementById("user-dropdown");
  const ddUserName = document.getElementById("dd-user-name");
  const ddUserEmail = document.getElementById("dd-user-email");
  const dropdownWsBlock = document.getElementById("dropdown-ws-block");
  const switchModal = document.getElementById("switch-modal");
  const modalWorkspaceList = document.getElementById("modal-workspace-list");
  const toast = document.getElementById("toast");

  function renderChrome() {
    const ws = getWorkspaceById(session.currentWorkspaceId);

    avatarBtn.textContent = session.initials;
    ddUserName.textContent = session.name;
    ddUserEmail.textContent = session.email;

    headerWsPill.innerHTML = `
      <span class="ws-avatar" style="background:${ws.color};">${workspaceInitial(ws)}</span>
      <span class="ws-pill-text">
        <span class="ws-pill-org" title="${ws.domain}">${ws.domain}</span>
      </span>
      <svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
    `;

    dropdownWsBlock.innerHTML = `
      <span class="ws-avatar" style="background:${ws.color};">${workspaceInitial(ws)}</span>
      <span>
        <div class="dropdown-ws-org">${ws.domain}</div>
        <div class="dropdown-ws-role">${workspaceIdentifierLine(ws)}</div>
      </span>
    `;
  }

  function renderTemplates() {
    const tbody = document.getElementById("templates-tbody");
    tbody.innerHTML = TEMPLATES.map((t) => `
      <tr>
        <td><span class="status-pill ${t.status}">${t.status === "published" ? "Published" : "Draft"}</span></td>
        <td>
          <div class="tpl-title">${t.name}</div>
          <div class="tpl-meta">${t.meta.map((m) => `<span>${m}</span>`).join("")}</div>
        </td>
        <td>${t.category}</td>
        <td>${t.owner}</td>
        <td>${t.last}</td>
        <td class="row-menu">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
        </td>
      </tr>
    `).join("");
  }

  function renderSwitcherModal() {
    modalWorkspaceList.innerHTML = "";
    session.workspaceIds.forEach((id) => {
      const ws = getWorkspaceById(id);
      if (!ws) return;
      const isCurrent = id === session.currentWorkspaceId;

      const card = document.createElement("button");
      card.className = "workspace-card" + (isCurrent ? " is-current" : "");
      card.innerHTML = `
        <div class="ws-avatar" style="background:${ws.color};">${workspaceInitial(ws)}</div>
        <div class="ws-info">
          <div class="ws-name-row">
            <span class="ws-domain-name">${ws.domain}</span>
          </div>
          <div class="ws-meta-row">
            <div class="ws-meta-line ws-account-id">${workspaceIdentifierLine(ws)}</div>
          </div>
        </div>
        ${isCurrent
          ? `<span class="current-tag"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>Current</span>`
          : `<svg class="ws-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>`
        }
      `;
      if (!isCurrent) {
        card.addEventListener("click", () => switchWorkspace(id));
      }
      modalWorkspaceList.appendChild(card);
    });
  }

  function switchWorkspace(id) {
    session.currentWorkspaceId = id;
    setSession(session);
    renderChrome();
    renderSwitcherModal();
    closeSwitchModal();
    closeDropdown();
    const ws = getWorkspaceById(id);
    showToast(`Switched to ${ws.domain}`);
  }

  function openDropdown() { userDropdown.classList.add("open"); }
  function closeDropdown() { userDropdown.classList.remove("open"); }
  function openSwitchModal() { renderSwitcherModal(); switchModal.classList.add("open"); }
  function closeSwitchModal() { switchModal.classList.remove("open"); }

  avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("open");
  });
  headerWsPill.addEventListener("click", () => openSwitchModal());
  document.addEventListener("click", (e) => {
    if (!userDropdown.contains(e.target) && e.target !== avatarBtn) closeDropdown();
  });

  document.getElementById("btn-switch-workspace").addEventListener("click", () => {
    closeDropdown();
    openSwitchModal();
  });
  document.getElementById("btn-about-me").addEventListener("click", () => {
    closeDropdown();
    showToast(`Signed in as ${session.name} (${session.email})`);
  });
  document.getElementById("btn-sign-out").addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });

  document.getElementById("modal-close-x").addEventListener("click", closeSwitchModal);
  switchModal.addEventListener("click", (e) => { if (e.target === switchModal) closeSwitchModal(); });

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  renderChrome();
  renderTemplates();
})();
