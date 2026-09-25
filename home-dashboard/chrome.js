/**
 * Shared app chrome for every page in this prototype: signed-in session, the
 * prototype Admin/User toggle, header (workspace pill, nav, avatar menu),
 * switch-workspace modal and toast.
 *
 * A page calls AppChrome.init({ onChange }) and gets back helpers; onChange
 * runs whenever the role or workspace changes so the page can re-render.
 */
const AppChrome = (function () {
  const ROLE_KEY = "sdocs_home_dashboard_role";
  const $ = (id) => document.getElementById(id);

  // Seed a signed-in session so pages open directly (no sign-in step here).
  let session = getSession();
  if (!session || !session.currentWorkspaceId) {
    const s = LOGIN_SCENARIOS.multi;
    session = { ...s, currentWorkspaceId: s.workspaceIds[0] };
    setSession(session);
  }

  let role = (() => {
    try { return localStorage.getItem(ROLE_KEY) === "user" ? "user" : "admin"; } catch (e) { return "admin"; }
  })();

  let onChange = () => {};

  function renderHeader() {
    const ws = getWorkspaceById(session.currentWorkspaceId);
    $("avatar-btn").textContent = session.initials;
    $("dd-user-name").textContent = session.name;
    $("dd-user-email").textContent = session.email;
    $("header-ws-pill").innerHTML = `
      <span class="ws-avatar" style="background:${ws.color};">${workspaceInitial(ws)}</span>
      <span class="ws-pill-text"><span class="ws-pill-org" title="${ws.domain}">${ws.domain}</span></span>
      <svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
    `;
    $("dropdown-ws-block").innerHTML = `
      <span class="ws-avatar" style="background:${ws.color};">${workspaceInitial(ws)}</span>
      <span>
        <div class="dropdown-ws-org">${ws.domain}</div>
        <div class="dropdown-ws-role">${workspaceIdentifierLine(ws)}</div>
      </span>
    `;
    document.querySelectorAll("#role-toggle button").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.role === role));
  }

  function renderSwitcherModal() {
    const list = $("modal-workspace-list");
    list.innerHTML = "";
    session.workspaceIds.forEach((id) => {
      const ws = getWorkspaceById(id);
      const isCurrent = id === session.currentWorkspaceId;
      const card = document.createElement("button");
      card.className = "workspace-card" + (isCurrent ? " is-current" : "");
      card.innerHTML = `
        <div class="ws-avatar" style="background:${ws.color};">${workspaceInitial(ws)}</div>
        <div class="ws-info">
          <div class="ws-name-row"><span class="ws-domain-name">${ws.domain}</span></div>
          <div class="ws-meta-row"><div class="ws-meta-line ws-account-id">${workspaceIdentifierLine(ws)}</div></div>
        </div>
        ${isCurrent
          ? `<span class="current-tag"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>Current</span>`
          : `<svg class="ws-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>`}
      `;
      if (!isCurrent) {
        card.addEventListener("click", () => {
          session.currentWorkspaceId = id;
          setSession(session);
          renderHeader();
          $("switch-modal").classList.remove("open");
          onChange();
          showToast(`Switched to ${ws.domain}`);
        });
      }
      list.appendChild(card);
    });
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function init(opts = {}) {
    onChange = opts.onChange || onChange;

    $("role-toggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || btn.dataset.role === role) return;
      role = btn.dataset.role;
      try { localStorage.setItem(ROLE_KEY, role); } catch (err) { /* prototype convenience only */ }
      renderHeader();
      onChange();
    });

    const avatarBtn = $("avatar-btn");
    const userDropdown = $("user-dropdown");
    avatarBtn.addEventListener("click", (e) => { e.stopPropagation(); userDropdown.classList.toggle("open"); });
    document.addEventListener("click", (e) => {
      if (!userDropdown.contains(e.target) && e.target !== avatarBtn) userDropdown.classList.remove("open");
    });
    const openSwitch = () => { renderSwitcherModal(); $("switch-modal").classList.add("open"); };
    $("header-ws-pill").addEventListener("click", openSwitch);
    $("btn-switch-workspace").addEventListener("click", () => { userDropdown.classList.remove("open"); openSwitch(); });
    $("btn-sign-out").addEventListener("click", () => { userDropdown.classList.remove("open"); showToast("Sign out isn't wired up in this prototype"); });
    $("modal-close-x").addEventListener("click", () => $("switch-modal").classList.remove("open"));
    $("switch-modal").addEventListener("click", (e) => { if (e.target.id === "switch-modal") e.target.classList.remove("open"); });

    $("logo-home").addEventListener("click", () => { window.location.href = "index.html"; });
    document.querySelectorAll(".main-nav .nav-link").forEach((n) => {
      n.addEventListener("click", () => {
        if (n.classList.contains("active")) return;
        if (n.dataset.href) window.location.href = n.dataset.href;
        else showToast(`${n.textContent} isn't part of this prototype`);
      });
    });

    renderHeader();
    return { session, showToast, getRole: () => role };
  }

  return { init };
})();
