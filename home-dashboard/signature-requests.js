/**
 * Signature requests list, matching the current app's rendering. Supports a
 * status filter from the Filters menu or the URL (?filter=expiring-soon is
 * what the home page's "Expiring soon" card links to). Admins see every
 * request in the workspace; users see the ones they own.
 */
(function () {
  const chrome = AppChrome.init({ onChange: render });
  const session = chrome.session;
  const showToast = chrome.showToast;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const FILTERS = [
    { key: "expiring-soon", label: "Expiring soon", test: (r) => r.status === "sent" && r.expiresInDays != null && r.expiresInDays <= 7 },
    { key: "sent",          label: "Sent",          test: (r) => r.status === "sent" },
    { key: "completed",     label: "Completed",     test: (r) => r.status === "completed" },
    { key: "draft",         label: "Draft",         test: (r) => r.status === "draft" },
    { key: "expired",       label: "Expired",       test: (r) => r.status === "expired" },
  ];
  const STATUS_LABEL = { sent: "Sent", completed: "Completed", draft: "Draft", expired: "Expired" };

  const params = new URLSearchParams(window.location.search);
  const state = {
    filter: FILTERS.some((f) => f.key === params.get("filter")) ? params.get("filter") : null,
    query: "",
  };

  // Keep the filter in the URL so the view can be linked to and reloaded.
  function syncUrl() {
    const url = new URL(window.location.href);
    if (state.filter) url.searchParams.set("filter", state.filter);
    else url.searchParams.delete("filter");
    history.replaceState(null, "", url);
  }

  const ICON = {
    account: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="1"></rect><line x1="9" y1="7" x2="9" y2="7.01"></line><line x1="15" y1="7" x2="15" y2="7.01"></line><line x1="9" y1="12" x2="9" y2="12.01"></line><line x1="15" y1="12" x2="15" y2="12.01"></line><path d="M10 22v-4h4v4"></path></svg>',
    doc: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
    people: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"></circle><path d="M2 21v-1a6 6 0 0 1 12 0v1"></path><path d="M16 4a4 4 0 0 1 0 8"></path><path d="M22 21v-1a6 6 0 0 0-4-5.6"></path></svg>',
    warn: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    more: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>',
  };

  // Warning tag beside the status for open requests expiring within 7 days.
  function expiryTag(r) {
    if (r.status !== "sent" || r.expiresInDays == null || r.expiresInDays > 7) return "";
    const text = r.expiresInDays === 0 ? "Expires today"
      : r.expiresInDays === 1 ? "Expires tomorrow"
      : `Expires in ${r.expiresInDays} days`;
    return `<span class="expiry-tag ${r.expiresInDays <= 1 ? "urgent" : ""}">${ICON.warn}${text}</span>`;
  }

  function visibleRows() {
    let rows = chrome.getRole() === "admin"
      ? SIGNATURE_REQUESTS
      : SIGNATURE_REQUESTS.filter((r) => r.owner === session.name);
    const f = FILTERS.find((x) => x.key === state.filter);
    if (f) rows = rows.filter(f.test);
    // Expiring soon reads best soonest-first.
    if (state.filter === "expiring-soon") rows = [...rows].sort((a, b) => a.expiresInDays - b.expiresInDays);
    const q = state.query.trim().toLowerCase();
    if (q) rows = rows.filter((r) => `${r.name} ${r.account || ""} ${r.owner}`.toLowerCase().includes(q));
    return rows;
  }

  function renderFilters() {
    const f = FILTERS.find((x) => x.key === state.filter);
    $("btn-filters").classList.toggle("has-filter", !!f);
    $("filter-menu").innerHTML = `<div class="filter-menu-label">Status</div>` +
      [{ key: null, label: "All" }, ...FILTERS].map((x) => `
        <button class="filter-option ${state.filter === x.key ? "active" : ""}" role="menuitemradio" aria-checked="${state.filter === x.key}" data-key="${x.key || ""}">
          ${x.label}
          ${state.filter === x.key ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ""}
        </button>`).join("");
    const bar = $("active-filters");
    bar.hidden = !f;
    if (f) {
      bar.innerHTML = `
        <span class="filter-chip">Status: ${f.label}<button id="clear-filter" aria-label="Remove ${f.label} filter">&times;</button></span>
        <button class="link-btn" id="clear-all">Clear filters</button>`;
    }
  }

  function renderTable() {
    const rows = visibleRows();
    const tbody = $("sr-tbody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="sr-empty"><strong>No signature requests</strong>Nothing matches the current filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => `
      <tr data-i="${i}">
        <td><div class="sr-status">
          <span class="sr-pill ${r.status}">${STATUS_LABEL[r.status]}</span>
          ${expiryTag(r)}
        </div></td>
        <td>
          <div class="sr-title">${esc(r.name)}</div>
          ${r.account ? `<div class="sr-meta">
            <span>${ICON.account}${esc(r.account)}</span>
            <span>${ICON.doc}1 document</span>
            <span>${ICON.people}1 recipient</span>
          </div>` : ""}
        </td>
        <td class="muted">${esc(r.owner)}</td>
        <td class="muted">${r.last}</td>
        <td class="row-menu">${ICON.more}</td>
      </tr>`).join("");
    tbody.querySelectorAll("tr[data-i]").forEach((tr) =>
      tr.addEventListener("click", () => showToast(`Would open ${rows[tr.dataset.i].name}`)));
  }

  function render() {
    renderFilters();
    renderTable();
  }

  function setFilter(key) {
    state.filter = key || null;
    syncUrl();
    render();
  }

  const menu = $("filter-menu");
  $("btn-filters").addEventListener("click", (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle("open");
    $("btn-filters").setAttribute("aria-expanded", open);
  });
  menu.addEventListener("click", (e) => {
    const opt = e.target.closest(".filter-option");
    if (!opt) return;
    menu.classList.remove("open");
    setFilter(opt.dataset.key);
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) menu.classList.remove("open");
  });
  $("active-filters").addEventListener("click", (e) => {
    if (e.target.closest("#clear-filter, #clear-all")) setFilter(null);
  });
  $("sr-search").addEventListener("input", (e) => { state.query = e.target.value; renderTable(); });
  $("btn-add").addEventListener("click", () => showToast("New signature request isn't part of this prototype"));

  render();
})();
