/**
 * Mock data for the home dashboard: metric series per time frame and the
 * activity feed. "Today" is pinned so the prototype reads the same every time.
 */

const TODAY = new Date(2026, 8, 25, 10, 30); // Sep 25 2026, 10:30

const PERIODS = {
  "7":    { label: "Last 7 days",  compare: "vs prior 7 days" },
  "15":   { label: "Last 15 days", compare: "vs prior 15 days" },
  "30":   { label: "Last 30 days", compare: "vs prior 30 days" },
  "90":   { label: "Last 90 days", compare: "vs prior 90 days" },
  "year": { label: "This year",    compare: "vs same period last year" },
};

// Small seeded PRNG so every period/role combination is stable across reloads.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashKey(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDay(d) { return `${MONTHS[d.getMonth()]} ${d.getDate()}`; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// Buckets for the chart: daily up to 30 days, weekly for 90, monthly for the year.
function buildBuckets(periodKey) {
  if (periodKey === "year") {
    return MONTHS.slice(0, TODAY.getMonth() + 1).map((m, i) => ({
      label: m,
      tipLabel: `${m} 2026${i === TODAY.getMonth() ? " (to date)" : ""}`,
      days: i === TODAY.getMonth() ? TODAY.getDate() : new Date(2026, i + 1, 0).getDate(),
      weekend: false,
    }));
  }
  const n = Number(periodKey);
  if (n === 90) {
    return Array.from({ length: 13 }, (_, i) => {
      const start = addDays(TODAY, -90 + i * 7 + 1);
      return { label: fmtDay(start), tipLabel: `Week of ${fmtDay(start)}`, days: 7, weekend: false };
    });
  }
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(TODAY, -(n - 1) + i);
    const dow = d.getDay();
    return { label: fmtDay(d), tipLabel: fmtDay(d), days: 1, weekend: dow === 0 || dow === 6 };
  });
}

// Per-day volume: an admin sees the whole workspace, a user sees only what they sent.
const DAILY_BASE = { admin: 46, user: 5 };

function generateSeries(role, periodKey, variant) {
  const rand = seeded(hashKey(`${role}|${periodKey}|${variant}`));
  const buckets = buildBuckets(periodKey);
  const base = DAILY_BASE[role] * (variant === "prior" ? 0.9 : 1);
  return buckets.map((b, i) => {
    const trend = 0.82 + 0.3 * (i / Math.max(1, buckets.length - 1)); // gentle rise, like the sketch
    const weekend = b.weekend ? 0.3 : 1;
    const sent = Math.max(0, Math.round(base * b.days * trend * weekend * (0.8 + rand() * 0.4)));
    // The most recent buckets are still in flight, so completion lags.
    const lag = i >= buckets.length - 2 && variant === "current" ? 0.55 + rand() * 0.15 : 0.74 + rand() * 0.14;
    return { ...b, sent, completed: Math.min(sent, Math.round(sent * lag)) };
  });
}

function summarize(series, role, periodKey, variant) {
  const rand = seeded(hashKey(`sum|${role}|${periodKey}|${variant}`));
  const sent = series.reduce((a, p) => a + p.sent, 0);
  const completed = series.reduce((a, p) => a + p.completed, 0);
  const expired = Math.round(sent * (0.025 + rand() * 0.03));
  const avgDays = 1.4 + rand() * 1.6; // average time from sent to completed
  return { sent, completed, expired, avgDays };
}

function getMetrics(role, periodKey) {
  const series = generateSeries(role, periodKey, "current");
  const prior = generateSeries(role, periodKey, "prior");
  return {
    series,
    current: summarize(series, role, periodKey, "current"),
    prior: summarize(prior, role, periodKey, "prior"),
  };
}

/* ---------------- Activity feed ---------------- */

// Category keys used by the admin filter chips.
const FEED_CATEGORIES = [
  { key: "signature", label: "Signature requests" },
  { key: "documents", label: "Documents" },
  { key: "templates", label: "Templates" },
  { key: "workflows", label: "Workflows" },
  { key: "system",    label: "System" },
  { key: "settings",  label: "Settings" },
];

// Which category each event type belongs to, and whether a non-admin sees that type at all.
const EVENT_TYPES = {
  viewed:          { category: "signature", userVisible: true },
  signed:          { category: "signature", userVisible: true },
  completed:       { category: "signature", userVisible: true },
  delegated:       { category: "signature", userVisible: true },
  generated:       { category: "documents", userVisible: true },
  shared:          { category: "documents", userVisible: false },
  published:       { category: "templates", userVisible: false },
  wf_requested:    { category: "workflows", userVisible: false },
  wf_completed:    { category: "workflows", userVisible: false },
  wf_failed:       { category: "workflows", userVisible: false },
  invite_accepted: { category: "system",    userVisible: false },
  expiry_changed:  { category: "settings",  userVisible: false },
  table_styles:    { category: "settings",  userVisible: false },
  redirect_changed:{ category: "settings",  userVisible: false },
  user_added:      { category: "settings",  userVisible: false },
  void_template:   { category: "settings",  userVisible: false },
  logo_updated:    { category: "settings",  userVisible: false },
  locale_updated:  { category: "settings",  userVisible: false },
};

// `mine` marks events on envelopes/documents the signed-in user owns; the
// user view shows only those, the admin view shows everything.
const FEED_EVENTS = [
  { h: 0.3,  type: "viewed",    mine: true,  envelope: "Quote -2026-09-25 -Security Solution Deployment - MediaFlow Productions", recipient: "Dana Whitfield" },
  { h: 0.8,  type: "wf_requested", record: "48213" },
  { h: 1.1,  type: "completed", mine: false, envelope: "Quote -2026-09-25 -Security Solution Deployment - MediaFlow Productions" },
  { h: 1.2,  type: "signed",    mine: false, envelope: "Quote -2026-09-25 -Security Solution Deployment - MediaFlow Productions", recipient: "Marcus Webb" },
  { h: 1.9,  type: "wf_completed", record: "48213" },
  { h: 2.4,  type: "generated", mine: true,  document: "Renewal Quote - Ocean Spray.pdf" },
  { h: 3.0,  type: "completed", mine: false, envelope: "NDA -2026-09-25 -S-Docs" },
  { h: 3.6,  type: "shared",    document: "Master Services Agreement - Beta Industries.pdf", user: "Shaun Bokhari", recipient: "Chris Garlotta", access: "Editor" },
  { h: 4.5,  type: "delegated", mine: true,  envelope: "default value testing", email: "legal@oceanspray.com" },
  { h: 5.2,  type: "wf_failed", record: "48190" },
  { h: 7.0,  type: "published", template: "Order Form v3" },
  { h: 9.5,  type: "viewed",    mine: true,  envelope: "default value testing", recipient: "Priya Shah" },
  { h: 22,   type: "invite_accepted", user: "Jordan Lee" },
  { h: 26,   type: "signed",    mine: true,  envelope: "Statement of Work - Northwind", recipient: "Elena Park" },
  { h: 27,   type: "completed", mine: true,  envelope: "Statement of Work - Northwind" },
  { h: 30,   type: "generated", mine: false, document: "NDA -2026-09-24 -S-Docs Inc.pdf" },
  { h: 33,   type: "wf_requested", record: "48177" },
  { h: 34,   type: "wf_completed", record: "48177" },
  { h: 44,   type: "shared",    document: "Pricing Sheet 2026.pdf", user: "Anand Narasimhan", recipient: "Jordan Lee", access: "Commenter" },
  { h: 50,   type: "viewed",    mine: true,  envelope: "Test W9", recipient: "Samuel Ortiz" },
  { h: 58,   type: "published", template: "template with inputs" },
  { h: 71,   type: "generated", mine: true,  document: "Invoice INV-2291 - Demo0001.pdf" },
  { h: 76,   type: "wf_failed", record: "48102" },
  { h: 80,   type: "delegated", mine: false, envelope: "NDA -2026-09-22 -S-Docs Inc", email: "ops@sdocsinc.com" },
  { h: 96,   type: "invite_accepted", user: "Chris Garlotta" },
  { h: 104,  type: "completed", mine: true,  envelope: "Test W9" },
  { h: 118,  type: "signed",    mine: true,  envelope: "Test W9", recipient: "Samuel Ortiz" },
  { h: 130,  type: "shared",    document: "Onboarding Packet.pdf", user: "Shaun Bokhari", recipient: "Anand Narasimhan", access: "Collaborator" },
  { h: 150,  type: "wf_completed", record: "48011" },
  { h: 160,  type: "viewed",    mine: true,  envelope: "NDA -2026-09-17 -S-Docs Inc", recipient: "Kevin Brandt" },
  // 7–15 days ago
  { h: 175,  type: "published", template: "Template 2" },
  { h: 190,  type: "generated", mine: true,  document: "Quote Q-1180 - MediaFlow.pdf" },
  { h: 205,  type: "completed", mine: true,  envelope: "NDA -2026-09-08 -S-Docs" },
  { h: 220,  type: "wf_failed", record: "47930" },
  { h: 236,  type: "delegated", mine: true,  envelope: "NDA -2026-09-17 -S-Docs Inc", email: "counsel@sdocsinc.com" },
  { h: 250,  type: "invite_accepted", user: "Priya Shah" },
  { h: 262,  type: "signed",    mine: false, envelope: "Partner Agreement - Contoso", recipient: "Luis Romero" },
  { h: 280,  type: "shared",    document: "Q3 Board Deck.pdf", user: "Chris Garlotta", recipient: "Shaun Bokhari", access: "Editor" },
  { h: 300,  type: "viewed",    mine: true,  envelope: "Test W9", recipient: "Samuel Ortiz" },
  { h: 318,  type: "published", template: "Template 1" },
  { h: 330,  type: "wf_requested", record: "47888" },
  { h: 346,  type: "generated", mine: true,  document: "W9 - Demo0001.pdf" },
  // Settings changes (admin only); `by` is who made the change
  { h: 6.1,  type: "expiry_changed",   from: "30 days", to: "14 days", by: "Shaun Bokhari" },
  { h: 18,   type: "user_added",       name: "Grace Kim", email: "grace.kim@acmecorp.com", role: "USER", by: "Anand Narasimhan" },
  { h: 40,   type: "redirect_changed", from: "https://acmecorp.com/thanks", to: "https://acmecorp.com/signed", by: "Anand Narasimhan" },
  { h: 64,   type: "table_styles",     by: "Chris Garlotta" },
  { h: 110,  type: "void_template",    by: "Shaun Bokhari" },
  { h: 140,  type: "user_added",       name: "Omar Haddad", email: "omar.haddad@acmecorp.com", role: "ADMIN", by: "Anand Narasimhan" },
  { h: 212,  type: "logo_updated",     by: "Anand Narasimhan" },
  { h: 290,  type: "locale_updated",   by: "Shaun Bokhari" },
];

/* ---------------- Signature requests ---------------- */

// Rows for the Signature requests list. `expiresInDays` is set on open (Sent)
// requests; the "Expiring soon" filter and the home card use <= 7 days.
const SIGNATURE_REQUESTS = [
  { status: "sent",      name: "default value testing", account: "Ocean Spray", owner: "Anand Narasimhan", last: "4 hour(s) ago", expiresInDays: 0 },
  { status: "completed", name: "Quote -2026-09-25 -Security Solution Deployment - MediaFlow Productions", account: "Security Solution Deployment - MediaFlow Productions", owner: "Shaun Bokhari", last: "1 hour(s) ago" },
  { status: "sent",      name: "NDA -2026-09-17 -S-Docs Inc", account: "S-Docs Inc", owner: "Shaun Bokhari", last: "6 day(s) ago", expiresInDays: 1 },
  { status: "sent",      name: "Renewal Quote - Ocean Spray", account: "Ocean Spray", owner: "Anand Narasimhan", last: "2 hour(s) ago", expiresInDays: 1 },
  { status: "completed", name: "NDA -2026-09-25 -S-Docs", account: "S-Docs 1", owner: "Shaun Bokhari", last: "3 hour(s) ago" },
  { status: "sent",      name: "Partner Agreement - Contoso", account: "Contoso", owner: "Chris Garlotta", last: "10 day(s) ago", expiresInDays: 2 },
  { status: "completed", name: "NDA -2026-09-24 -S-Docs Inc", account: "S-Docs", owner: "Shaun Bokhari", last: "1 day(s) ago" },
  { status: "sent",      name: "Master Services Agreement - Beta Industries", account: "Beta Industries", owner: "Shaun Bokhari", last: "5 day(s) ago", expiresInDays: 3 },
  { status: "completed", name: "NDA -2026-09-24 -S-Docs Inc", account: "S-Docs Inc 2.0", owner: "Shaun Bokhari", last: "1 day(s) ago" },
  { status: "sent",      name: "Statement of Work - Fabrikam", account: "Fabrikam", owner: "Anand Narasimhan", last: "3 day(s) ago", expiresInDays: 4 },
  { status: "completed", name: "NDA -2026-09-22 -S-Docs Inc", account: "S-Docs Inc 2.0", owner: "Shaun Bokhari", last: "3 day(s) ago" },
  { status: "sent",      name: "Order Form - MediaFlow Productions", account: "MediaFlow Productions", owner: "Chris Garlotta", last: "8 day(s) ago", expiresInDays: 5 },
  { status: "sent",      name: "Vendor Onboarding - Northwind", account: "Northwind", owner: "Shaun Bokhari", last: "9 day(s) ago", expiresInDays: 6 },
  { status: "sent",      name: "Test W9 - Demo0002", account: "Demo0002", owner: "Anand Narasimhan", last: "7 day(s) ago", expiresInDays: 6 },
  { status: "sent",      name: "Consulting Agreement - Tailspin Toys", account: "Tailspin Toys", owner: "Anand Narasimhan", last: "2 day(s) ago", expiresInDays: 21 },
  { status: "draft",     name: "Untitled Signature Request_2026-09-09 14:36:54", owner: "Shaun Bokhari", last: "16 day(s) ago" },
  { status: "completed", name: "NDA -2026-09-08 -S-Docs", account: "S-Docs 2.0", owner: "Shaun Bokhari", last: "17 day(s) ago" },
  { status: "expired",   name: "Quote Q-1102 - Wide World Importers", account: "Wide World Importers", owner: "Anand Narasimhan", last: "18 day(s) ago" },
  { status: "completed", name: "Test W9", account: "Demo0001", owner: "Shaun Bokhari", last: "25 day(s) ago" },
  { status: "expired",   name: "NDA -2026-08-29 -Litware", account: "Litware", owner: "Chris Garlotta", last: "27 day(s) ago" },
];
