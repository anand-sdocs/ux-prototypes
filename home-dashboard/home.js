/**
 * Home page: metrics + Sent/Completed chart over a selectable time frame, and a
 * recent-activity feed. Admins see the whole workspace and can filter the feed
 * by category; non-admins see their own requests only.
 */
(function () {
  const chrome = AppChrome.init({
    onChange: () => { state.categories.clear(); renderAll(); },
  });
  const session = chrome.session;
  const showToast = chrome.showToast;

  const state = {
    get role() { return chrome.getRole(); },
    period: "7",
    feedDays: 2,
    categories: new Set(), // empty = All
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtNum = (n) => n.toLocaleString("en-US");

  /* ---------------- Greeting ---------------- */

  function renderGreeting() {
    const first = session.name.split(" ")[0];
    $("greeting").textContent = `Hello ${first}`;
    $("greeting-sub").textContent = state.role === "admin"
      ? "Here's what's happening across your workspace."
      : "Here's what's happening with your signature requests.";
  }

  /* ---------------- KPI cards ---------------- */

  function pctChange(cur, prev) {
    if (!prev) return 0;
    return Math.round(((cur - prev) / prev) * 100);
  }

  // `higherIsBetter` decides the color: more expired or slower completion is bad.
  function deltaHtml(cur, prev, higherIsBetter) {
    const pct = pctChange(cur, prev);
    const compare = PERIODS[state.period].compare;
    if (pct === 0) return `<span class="delta-chip flat">0%</span>${compare}`;
    const good = (pct > 0) === higherIsBetter;
    return `<span class="delta-chip ${good ? "good" : "bad"}">${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%</span>${compare}`;
  }

  function fmtDuration(days) {
    if (days < 1) return `${Math.round(days * 24)}<small>hrs</small>`;
    return `${days.toFixed(1)}<small>days</small>`;
  }

  function renderKpis(metrics) {
    const { current: c, prior: p } = metrics;
    const cards = state.role === "admin"
      ? [
          { label: "Requests", value: fmtNum(c.sent), delta: deltaHtml(c.sent, p.sent, true) },
          { label: "Time to complete", value: fmtDuration(c.avgDays), delta: deltaHtml(c.avgDays, p.avgDays, false) },
          { label: "Expired", value: fmtNum(c.expired), delta: deltaHtml(c.expired, p.expired, false) },
        ]
      : [
          { label: "Sent", value: fmtNum(c.sent), delta: deltaHtml(c.sent, p.sent, true) },
          { label: "Completed", value: fmtNum(c.completed), delta: deltaHtml(c.completed, p.completed, true) },
          { label: "Expired", value: fmtNum(c.expired), delta: deltaHtml(c.expired, p.expired, false) },
        ];
    const expiring = expiringSoon();
    const urgent = expiring.filter((r) => r.expiresInDays <= 1).length;
    $("kpi-row").innerHTML = cards.map((k) => `
      <div class="kpi">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-delta">${k.delta}</div>
      </div>
    `).join("") + `
      <a class="kpi kpi-action" href="signature-requests.html?filter=expiring-soon" title="View in Signature requests">
        <div class="kpi-label">Expiring soon</div>
        <div class="kpi-value">${fmtNum(expiring.length)}</div>
        <div class="kpi-delta">
          ${urgent ? `<span class="delta-chip warn">${urgent} within a day</span>` : ""}in the next 7 days
          <svg class="kpi-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>
      </a>
    `;
  }

  function expiringSoon() {
    const rows = SIGNATURE_REQUESTS.filter((r) => r.expiresInDays != null && r.expiresInDays <= 7);
    return state.role === "admin" ? rows : rows.filter((r) => r.owner === session.name);
  }

  /* ---------------- Chart ---------------- */

  const SERIES = [
    { key: "sent", label: "Sent", color: "#0176d3" },
    { key: "completed", label: "Completed", color: "#2e7d32" },
  ];

  function niceMax(v) {
    if (v <= 5) return 5;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s * 4 >= v);
    return step * 4;
  }

  // Monotone cubic curve through the points: smooth, but never overshoots
  // between two values (so it can't dip below zero or above a peak).
  function smoothPath(pts) {
    const n = pts.length;
    if (n < 3) return "M" + pts.map((p) => p.join(",")).join(" L");
    const dx = [], slope = [];
    for (let i = 0; i < n - 1; i++) {
      dx[i] = pts[i + 1][0] - pts[i][0];
      slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
    }
    const t = [slope[0]];
    for (let i = 1; i < n - 1; i++) {
      t[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }
    t[n - 1] = slope[n - 2];
    for (let i = 0; i < n - 1; i++) {
      if (slope[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / slope[i], b = t[i + 1] / slope[i], h = a * a + b * b;
      if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * slope[i]; t[i + 1] = k * b * slope[i]; }
    }
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const c = dx[i] / 3;
      d += ` C${pts[i][0] + c},${pts[i][1] + c * t[i]} ${pts[i + 1][0] - c},${pts[i + 1][1] - c * t[i + 1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
    }
    return d;
  }

  let chartData = [];

  function renderChart(series) {
    chartData = series;
    const svg = $("chart");
    const W = svg.clientWidth || 800;
    const H = 240;
    const pad = { l: 40, r: 12, t: 12, b: 28 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const max = niceMax(Math.max(...series.map((p) => p.sent)));
    const x = (i) => pad.l + (series.length === 1 ? iw / 2 : (i / (series.length - 1)) * iw);
    const y = (v) => pad.t + ih - (v / max) * ih;

    let out = "";
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g;
      out += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="${g === 0 ? "#dddbda" : "#f1f0ef"}"/>`;
      out += `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmtNum(Math.round(v))}</text>`;
    }

    const maxLabels = Math.max(2, Math.floor(iw / 70));
    const every = Math.ceil(series.length / maxLabels);
    series.forEach((p, i) => {
      if ((series.length - 1 - i) % every === 0) {
        out += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${p.label}</text>`;
      }
    });

    // Light area under Sent, then both lines, as smooth curves.
    const curve = (key) => smoothPath(series.map((p, i) => [x(i), y(p[key])]));
    out += `<path d="${curve("sent")} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="#0176d3" opacity="0.06"/>`;
    SERIES.forEach((s) => {
      out += `<path d="${curve(s.key)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });

    out += `<g id="chart-hover" style="display:none">
      <line id="hover-line" y1="${pad.t}" y2="${pad.t + ih}" stroke="#b0adab" stroke-dasharray="3 3"/>
      ${SERIES.map((s) => `<circle id="hover-${s.key}" r="4" fill="#fff" stroke="${s.color}" stroke-width="2"/>`).join("")}
    </g>`;
    out += `<rect id="chart-hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>`;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = out;

    const hit = $("chart-hit");
    const hover = $("chart-hover");
    const tip = $("chart-tip");
    hit.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const i = Math.max(0, Math.min(series.length - 1, Math.round(((mx - pad.l) / iw) * (series.length - 1))));
      const p = series[i];
      hover.style.display = "";
      $("hover-line").setAttribute("x1", x(i));
      $("hover-line").setAttribute("x2", x(i));
      SERIES.forEach((s) => {
        $(`hover-${s.key}`).setAttribute("cx", x(i));
        $(`hover-${s.key}`).setAttribute("cy", y(p[s.key]));
      });
      tip.innerHTML = `<div class="tip-date">${p.tipLabel}</div>` + SERIES.map((s) =>
        `<div class="tip-row"><i style="background:${s.color}"></i>${s.label}<b>${fmtNum(p[s.key])}</b></div>`).join("");
      const wrap = $("chart-wrap").getBoundingClientRect();
      const left = rect.left - wrap.left + x(i);
      const flip = left + 150 > wrap.width;
      tip.style.left = `${flip ? left - tip.offsetWidth - 12 : left + 12}px`;
      tip.style.top = `${rect.top - wrap.top + y(p.sent) - 10}px`;
      tip.classList.add("show");
    });
    hit.addEventListener("mouseleave", () => {
      hover.style.display = "none";
      tip.classList.remove("show");
    });
  }

  /* ---------------- Activity feed ---------------- */

  const ICONS = {
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    check: '<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>',
    forward: '<polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    flow: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  };

  const b = (s) => `<b>${esc(s)}</b>`;

  // Sentence, icon and click target for each event type.
  const RENDER = {
    viewed:          (e) => ({ icon: "eye", tone: "blue", text: `${b(e.envelope)} viewed by ${b(e.recipient)}`, open: e.envelope }),
    signed:          (e) => ({ icon: "pen", tone: "green", text: `${b(e.envelope)} completed by ${b(e.recipient)}`, open: e.envelope }),
    completed:       (e) => ({ icon: "check", tone: "green", text: `${b(e.envelope)} completed`, open: e.envelope }),
    delegated:       (e) => ({ icon: "forward", tone: "amber", text: `${b(e.envelope)} delegated to ${b(e.email)}`, open: e.envelope }),
    generated:       (e) => ({ icon: "file", tone: "gray", text: `${b(e.document)} document generated`, open: e.document }),
    shared:          (e) => ({ icon: "share", tone: "purple", text: `${b(e.document)} was shared by ${b(e.user)} to ${b(e.recipient)} with <span class="access-pill">${esc(e.access)}</span>`, open: e.document }),
    published:       (e) => ({ icon: "layout", tone: "blue", text: `${b(e.template)} published`, open: e.template }),
    wf_requested:    (e) => ({ icon: "flow", tone: "gray", text: `Workflow request for ${b("Record#" + e.record)} requested`, open: `workflow for Record#${e.record}` }),
    wf_completed:    (e) => ({ icon: "flow", tone: "green", text: `Workflow request for ${b("Record#" + e.record)} completed`, open: `workflow for Record#${e.record}` }),
    wf_failed:       (e) => ({ icon: "alert", tone: "red", text: `Workflow request for ${b("Record#" + e.record)} failed`, open: `workflow for Record#${e.record}` }),
    invite_accepted: (e) => ({ icon: "userPlus", tone: "purple", text: `${b(e.user)} accepted invitation to workspace`, open: `${e.user}'s profile` }),
    expiry_changed:   (e) => ({ icon: "gear", tone: "gray", text: `Signature expiry modified from ${b(e.from)} to ${b(e.to)}`, open: "Signature settings" }),
    table_styles:     (e) => ({ icon: "gear", tone: "gray", text: "Table styles updated", open: "Table style settings" }),
    redirect_changed: (e) => ({ icon: "gear", tone: "gray", text: `Signature redirect modified from ${b(e.from)} to ${b(e.to)}`, open: "Signature settings" }),
    user_added:       (e) => ({ icon: "userPlus", tone: "blue", text: `New user ${b(e.name)} (${esc(e.email)}) added with role: <span class="access-pill role-${e.role.toLowerCase()}">${e.role}</span>`, open: "User management" }),
    void_template:    (e) => ({ icon: "gear", tone: "gray", text: "Void email template updated", open: "Email template settings" }),
    logo_updated:     (e) => ({ icon: "gear", tone: "gray", text: "Account logo updated", open: "Account settings" }),
    locale_updated:   (e) => ({ icon: "gear", tone: "gray", text: "Account locale updated", open: "Account settings" }),
  };

  // Matches the "3 day(s) ago" style used in the existing list views.
  function relTime(h) {
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} minute(s) ago`;
    if (h < 24) return `${Math.floor(h)} hour(s) ago`;
    return `${Math.floor(h / 24)} day(s) ago`;
  }

  function visibleEvents() {
    const inWindow = FEED_EVENTS.filter((e) => e.h < state.feedDays * 24);
    if (state.role === "user") {
      return inWindow.filter((e) => EVENT_TYPES[e.type].userVisible && e.mine);
    }
    return inWindow;
  }

  function renderChips(events) {
    const chipsEl = $("feed-chips");
    if (state.role !== "admin") {
      chipsEl.style.display = "none";
      return;
    }
    chipsEl.style.display = "";
    const counts = {};
    events.forEach((e) => { const c = EVENT_TYPES[e.type].category; counts[c] = (counts[c] || 0) + 1; });
    const all = state.categories.size === 0;
    chipsEl.innerHTML =
      `<button class="chip ${all ? "active" : ""}" data-cat="all">All <span class="count">${events.length}</span></button>` +
      FEED_CATEGORIES.map((c) =>
        `<button class="chip ${state.categories.has(c.key) ? "active" : ""}" data-cat="${c.key}" aria-pressed="${state.categories.has(c.key)}">${c.label} <span class="count">${counts[c.key] || 0}</span></button>`
      ).join("");
  }

  function renderFeed() {
    const events = visibleEvents();
    renderChips(events);
    const shown = state.role === "admin" && state.categories.size
      ? events.filter((e) => state.categories.has(EVENT_TYPES[e.type].category))
      : events;

    $("feed-caption").textContent = state.role === "admin"
      ? "Everything happening in this workspace"
      : "Activity on your requests and documents";

    const list = $("feed-list");
    if (!shown.length) {
      list.innerHTML = `<li class="feed-empty"><strong>No activity</strong>Nothing matches these filters in the last ${state.feedDays} days.</li>`;
      return;
    }
    const catLabel = Object.fromEntries(FEED_CATEGORIES.map((c) => [c.key, c.label]));
    list.innerHTML = shown.map((e, i) => {
      const r = RENDER[e.type](e);
      return `
        <li class="feed-item" data-i="${i}" tabindex="0">
          <span class="feed-icon ic-${r.tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[r.icon]}</svg></span>
          <div class="feed-body">
            <div class="feed-text">${r.text}</div>
            <div class="feed-meta">${relTime(e.h)}${e.by ? `<span class="dot">·</span>by ${esc(e.by)}` : ""}${state.role === "admin" ? `<span class="dot">·</span>${catLabel[EVENT_TYPES[e.type].category]}` : ""}</div>
          </div>
        </li>`;
    }).join("");
    list.querySelectorAll(".feed-item").forEach((li) => {
      const open = () => showToast(`Would open ${RENDER[shown[li.dataset.i].type](shown[li.dataset.i]).open}`);
      li.addEventListener("click", open);
      li.addEventListener("keydown", (ev) => { if (ev.key === "Enter") open(); });
    });
  }

  /* ---------------- Wiring ---------------- */

  function renderMetrics() {
    const m = getMetrics(state.role, state.period);
    renderKpis(m);
    renderChart(m.series);
  }

  function renderAll() {
    renderGreeting();
    renderMetrics();
    renderFeed();
  }

  $("period-select").addEventListener("change", (e) => { state.period = e.target.value; renderMetrics(); });
  $("feed-period").addEventListener("change", (e) => { state.feedDays = Number(e.target.value); renderFeed(); });

  $("feed-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const cat = chip.dataset.cat;
    if (cat === "all") state.categories.clear();
    else if (state.categories.has(cat)) state.categories.delete(cat);
    else state.categories.add(cat);
    // Selecting every category is the same as All.
    if (state.categories.size === FEED_CATEGORIES.length) state.categories.clear();
    renderFeed();
  });

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => renderChart(chartData), 120);
  });

  renderAll();
})();
