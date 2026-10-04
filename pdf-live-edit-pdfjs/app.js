/* =====================================================================
   PDF Live Edit on PDF.js — prototype behaviour
   ---------------------------------------------------------------------
   TWO LAYERS PER PAGE
     1. canvas   PDF.js draws the template PDF (template.pdf): headings,
                 labels, rules — everything printed, no field values.
     2. overlay  an HTML layer the exact size of the page. Every merge
                 field is an absolutely positioned box at the % position
                 CedarEngine stores, with its value as live text. All the
                 behaviour (click to edit, locks, history, clipping) lives
                 here; the canvas is never touched.
   Font sizes in the overlay are in PDF points: 1pt = page width / page
   width in points, so the overlay scales with the canvas at any zoom.
   Zooming resizes both at once; the canvas is redrawn sharp shortly after.

   EDITING IS INLINE. Click a highlighted value and it becomes an input
   right where it sits on the page. Enter, Tab or clicking away keeps the
   change; Esc puts it back. Only the data changes — never a field's
   position, size or existence.

   WHERE A CHANGE GOES is not asked while typing. It's asked once, in the
   Save review: each change is "this document only" unless its "Also
   update … in Salesforce" box is ticked.

   HISTORY LIVES ON THE FIELD. A field that has changed since the document
   was generated — or whose record changed in Salesforce since — shows a
   history mark beside it; clicking it shows that field's own timeline.
   The panel's Versions tab is only the list of PDF versions and who made
   each one.
   ===================================================================== */
import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

// The worker must be same-origin; in Salesforce it ships in the same static resource.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const TEMPLATE_URL = 'template.pdf';   // in Salesforce: a blob URL of the template's ContentVersion

(function () {
  'use strict';

  const D = window.LP_DATA;
  let PW = 612, PH = 792;              // page size in points, read from the PDF
  const PDF = { doc: null, pages: [] };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls) => `<svg class="sd-icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#${n}"></use></svg>`;
  const pct = (v, of) => (v / of * 100).toFixed(4) + '%';

  const docs = $('#lp-docs');
  const pop = $('#lp-pop');
  const panel = $('#lp-panel');

  /* ------------------------------------------------------------------
     State
     ------------------------------------------------------------------ */
  let S;
  function initialState() {
    const els = {};
    for (const [id, e] of Object.entries(D.ELEMENTS)) {
      els[id] = Object.assign({ id, lock: null, rule: null, override: null, drift: null }, e, { doc: e.doc, recordValue: e.recordValue });
    }
    return {
      user: 'rep',
      docState: 'generated',
      els,
      pending: new Map(),        // element id → { value, sync? }
      order: [],                 // element ids, most recent last (for undo)
      errors: new Map(),         // element id → message from Salesforce
      writeBack: new Set(),      // element ids ticked "Also update … in Salesforce" at save
      versions: JSON.parse(JSON.stringify(D.VERSIONS)),
      current: 2,
      zoom: 'fit',
      show: true,
      tab: 'changes',
      activePage: 1,
      edit: null,                // { pid, id } — the field being typed in
      hist: null                 // { pid, id } — the field whose history is open
    };
  }

  const PLACES = [];             // { pid, page, f }
  D.PAGES.forEach(pg => pg.fields.forEach((f, i) => PLACES.push({ pid: `p${pg.n}-${i}`, page: pg.n, f })));
  const placesOf = id => PLACES.filter(p => p.f.el === id);
  const pageOf = pid => PLACES.find(p => p.pid === pid);

  /* ------------------------------------------------------------------
     Values, formatting, permissions
     ------------------------------------------------------------------ */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function fmt(el, v) {
    if (v === null || v === undefined || v === '') return '';
    switch (el.type) {
      case 'date': {
        const [y, m, d] = String(v).split('-').map(Number);
        return `${MONTHS[m - 1]} ${d}, ${y}`;
      }
      case 'currency': return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'number': return Number(v).toLocaleString('en-US');
      case 'percent': return v + '%';
      default: return String(v);
    }
  }
  const same = (a, b) => String(a == null ? '' : a) === String(b == null ? '' : b);
  const shown = el => (S.pending.has(el.id) ? S.pending.get(el.id).value : el.doc);
  const isDrift = el => !same(el.doc, el.recordValue) && !el.override && el.record !== 'Runtime';
  const historyOf = id => S.versions.filter(v => v.changes.some(c => c.el === id));
  const hasHistory = el => historyOf(el.id).length > 0 || isDrift(el);

  /* Why a field can't be edited. `access` is the only kind that gets a lock
     on the page: the person could edit it with different permissions. The
     others are simply not editable values, and say so on hover. */
  function lockOf(el) {
    if (S.docState === 'sent') return { kind: 'sent', short: 'Locked while out for signature' };
    if (el.lock) return { kind: el.lock.kind, short: { formula: 'Formula — calculated by Salesforce', auto: 'Auto-number — set by Salesforce', system: 'Set by S-Docs when generated', user: 'Owner — change it on the record', compound: 'Compound name — change it on the Contact' }[el.lock.kind] };
    const rules = D.FLS[S.user] && D.FLS[S.user][el.record];
    if (rules === '*read' || (rules && rules[el.field] === 'read')) return { kind: 'access', short: 'You don’t have edit access to this field' };
    return null;
  }

  function recordIcon(rec) {
    return { Opportunity: 'bar-chart-square-02', Account: 'building-01', Contact: 'user-01', User: 'user-01', Runtime: 'sdocs-mark' }[rec] || 'database-01';
  }
  function recordPhrase(el) {
    const rec = D.RECORDS[el.record];
    return el.record === 'Opportunity' ? 'the Opportunity' : `${rec.object} “${rec.name}”`;
  }
  const nowStamp = () => {
    const d = new Date();
    return `Oct 4, 2026 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  /* ------------------------------------------------------------------
     Pages
     ------------------------------------------------------------------ */
  function geo(x, y, w, h) {
    return `left:${pct(x, PW)};top:${pct(y, PH)};` + (w ? `width:${pct(w, PW)};` : '') + (h ? `height:${pct(h, PH)};` : '');
  }

  /* Marks hug the end of the value's text: a lock for no access, a history
     button for a field with a past. They are never printed. placeMarks()
     moves them there after render; until then they sit at the box's edge. */
  const MARK = 10;   // pt
  function marksHTML(p, el, lock) {
    const f = p.f, y = f.y + (Math.min(f.h, 16) - MARK) / 2;
    let out = '';
    if (lock && lock.kind === 'access') {
      out += `<span class="lp-mark lp-mark--lock" data-for="${p.pid}" style="${geo(f.x + f.w, y, MARK, MARK)}" title="${esc(lock.short)}">${icon('lock-01')}</span>`;
    }
    if (hasHistory(el)) {
      const drift = isDrift(el) && !S.pending.has(el.id);
      out += `<button type="button" class="lp-mark lp-mark--hist${drift ? ' lp-mark--drift' : ''}" data-for="${p.pid}" style="${geo(f.x + f.w, y, MARK, MARK)}" data-hist="${p.pid}" ` +
        `aria-label="History of ${esc(el.label)}${drift ? ' — changed in Salesforce' : ''}" title="${drift ? 'Changed in Salesforce — see history' : 'See history'}">${icon('clock-rewind')}</button>`;
    }
    return out;
  }

  /* Put each field's marks just after the last character of its text (on the
     last line, if it wraps). Stored in % of the page, so zoom keeps them put. */
  function placeMarks(root) {
    const range = document.createRange();
    $$('.lp-page', root).forEach(page => {
      const pr = page.getBoundingClientRect();
      if (!pr.width) return;
      const byPid = new Map();
      $$('[data-for]', page).forEach(m => {
        if (!byPid.has(m.dataset.for)) byPid.set(m.dataset.for, []);
        byPid.get(m.dataset.for).push(m);
      });
      byPid.forEach((marks, pid) => {
        const field = page.querySelector(`.lp-f[data-pid="${pid}"]`);
        if (!field) return;
        const v = field.firstElementChild, box = v.getBoundingClientRect();
        let endX = box.left, midY = box.top + box.height / 2;
        if (v.textContent) {
          range.selectNodeContents(v);
          const rects = Array.from(range.getClientRects()).filter(r => r.bottom <= box.bottom + 1);
          const last = rects[rects.length - 1];
          if (last) { endX = Math.min(last.right, box.right); midY = last.top + last.height / 2; }
        }
        const size = pr.width * MARK / PW, gap = pr.width * 3 / PW;
        let x = endX + gap;
        marks.forEach(m => {
          m.style.left = ((x - pr.left) / pr.width * 100).toFixed(4) + '%';
          m.style.top = ((midY - size / 2 - pr.top) / pr.height * 100).toFixed(4) + '%';
          x += size + gap / 2;
        });
      });
    });
  }

  function fieldHTML(p, thumb) {
    const f = p.f, el = S.els[f.el], lock = lockOf(el), pend = S.pending.has(el.id);
    const value = fmt(el, shown(el));
    const cls = ['lp-f', f.b ? 'lp-f--b' : '', f.align === 'right' ? 'lp-f--right' : '', f.tone === 'muted' ? 'lp-f--muted' : ''].filter(Boolean).join(' ');
    const attrs = [`class="${cls}"`, `style="${geo(f.x, f.y, f.w, f.h)}--fs:${f.s}"`, `data-kind="${lock ? 'locked' : 'data'}"`, `data-el="${esc(el.id)}"`];
    if (pend) attrs.push('data-pending');
    else if (el.override) attrs.push('data-override');
    if (S.errors.has(el.id)) attrs.push('data-error');
    if (!thumb) {
      const chip = lock ? `${el.label} · ${lock.short}` : `${el.label}`;
      attrs.push(`data-pid="${p.pid}"`, `data-chip="${esc(chip)}"`);
      if (!lock) attrs.push('tabindex="0"', 'role="button"', `aria-label="Edit ${esc(el.label)}: ${esc(value || 'empty')}"`);
      else attrs.push(`aria-label="${esc(el.label)}: ${esc(value)}. ${esc(lock.short)}."`);
    }
    return `<div ${attrs.join(' ')}><span class="lp-f__v">${esc(value)}</span></div>` + (thumb ? '' : marksHTML(p, el, lock));
  }

  function signerHTML(p, thumb) {
    const f = p.f, sf = D.SIGNER_FIELDS[f.signer];
    const a11y = thumb ? '' : ` data-chip="${esc(sf.label)} · Signer ${sf.signer}, ${esc(sf.who)} — filled in when signing" aria-label="${esc(sf.label)}, signer ${sf.signer}, ${esc(sf.who)}. Filled in when signing."`;
    return `<div class="lp-sf" style="${geo(f.x, f.y, f.w, f.h)}"${a11y}>` +
      `<span class="sd-field-object sd-signer sd-signer--${sf.signer} sd-field-object--placed${sf.type === 'signature' ? ' sd-field-object--signature' : ''}">` +
      `<span class="sd-field-object__box"><span class="sd-field-object__mark" aria-hidden="true">${sf.signer}</span><span class="sd-field-object__tick" aria-hidden="true">✓</span>` +
      `<span class="sd-field-object__value sd-field-object__value--stand-in">${esc(sf.stand)}</span><span class="sd-field-object__error" aria-hidden="true">!</span></span></span></div>`;
  }

  /* The overlay for one page: only the fields. What's printed comes from the PDF. */
  function overlayHTML(pg, thumb) {
    const places = PLACES.filter(p => p.page === pg.n).sort((a, b) => (a.f.y - b.f.y) || (a.f.x - b.f.x));
    return places.map(p => (p.f.signer ? signerHTML(p, thumb) : fieldHTML(p, thumb))).join('');
  }

  /* A page shell: the PDF.js canvas and the overlay over it. Built once after
     the PDF loads; edits re-render the overlay only, never the canvas. */
  function shellHTML(n, thumb) {
    const size = `--pw:${PW};--ph:${PH};`;
    const head = thumb ? `<div class="lp-page" style="${size}" aria-hidden="true">`
      : `<div class="lp-page" id="page-${n}" data-page="${n}" style="${size}" role="group" aria-label="Page ${n} of ${PDF.pages.length}">`;
    return head + '<canvas class="lp-pdf" aria-hidden="true"></canvas><div class="lp-overlay"></div></div>';
  }

  const isClipped = v => v.scrollHeight > v.clientHeight + 1 || v.scrollWidth > v.clientWidth + 1;
  function markClipped(root) {
    $$('.lp-f', root).forEach(f => f.toggleAttribute('data-clipped', isClipped(f.firstElementChild)));
  }

  function renderPages() {
    if (!PDF.doc) return;
    D.PAGES.forEach(pg => { $(`#page-${pg.n} .lp-overlay`).innerHTML = overlayHTML(pg, false); });
    docs.toggleAttribute('data-show', S.show);
    markClipped(docs);
    placeMarks(docs);
  }

  function renderThumbs() {
    if (!PDF.doc) return;
    D.PAGES.forEach(pg => {
      const b = $(`#lp-thumbs [data-goto="${pg.n}"]`);
      const ids = new Set(PLACES.filter(p => p.page === pg.n && p.f.el).map(p => p.f.el));
      const changed = [...ids].filter(id => S.pending.has(id)).length;
      b.setAttribute('aria-label', `Page ${pg.n}` + (changed ? `, ${changed} unsaved change${changed > 1 ? 's' : ''}` : ''));
      if (S.activePage === pg.n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      $('.lp-overlay', b).innerHTML = overlayHTML(pg, true);
      $('.lp-thumb__badges', b).innerHTML = changed ? `<span class="lp-thumb__badge" title="${changed} unsaved change${changed > 1 ? 's' : ''}">${changed}</span>` : '';
    });
  }

  /* ---- PDF.js: load once, draw each page onto its canvas ---- */
  async function loadPdf() {
    docs.innerHTML = '<p class="lp-loading" role="status">Loading template.pdf with PDF.js…</p>';
    try {
      PDF.doc = await pdfjsLib.getDocument({ url: TEMPLATE_URL }).promise;
      for (let n = 1; n <= PDF.doc.numPages; n++) PDF.pages.push(await PDF.doc.getPage(n));
      const [x0, y0, x1, y1] = PDF.pages[0].view;          // PDF user space, in points
      PW = x1 - x0; PH = y1 - y0;
    } catch (err) {
      const fileUrl = location.protocol === 'file:';
      docs.innerHTML = alertHTML('error', fileUrl
        ? 'PDF.js can’t load a PDF from a file:// page. Open this prototype through the local server (the “ux-prototypes” preview) or GitHub Pages.'
        : `PDF.js couldn’t load ${esc(TEMPLATE_URL)}: ${esc(err.message)}`, null, 'alert');
      return false;
    }
    if (PDF.pages.length !== D.PAGES.length) console.warn(`template.pdf has ${PDF.pages.length} pages; the field layout expects ${D.PAGES.length}.`);
    docs.innerHTML = PDF.pages.map((_, i) => shellHTML(i + 1, false)).join('');
    $('#lp-thumbs').innerHTML = PDF.pages.map((_, i) =>
      `<li><button class="lp-thumb" type="button" data-goto="${i + 1}">${shellHTML(i + 1, true)}` +
      `<span class="lp-thumb__label">${i + 1}</span><span class="lp-thumb__badges"></span></button></li>`).join('');
    $('#lp-pdf-info').textContent = `PDF.js ${pdfjsLib.version} · ${TEMPLATE_URL} · ${PDF.pages.length} pages · ${PW}×${PH} pt`;
    return true;
  }

  /* Draw into a fresh canvas and swap it in when done, so a zoom never shows a
     blank page and two renders never fight over one canvas. */
  async function paint(shell, page, cssWidth) {
    const old = $('canvas.lp-pdf', shell);
    if (old._task) old._task.cancel();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: cssWidth / PW * ratio });
    const canvas = document.createElement('canvas');
    canvas.className = 'lp-pdf';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    old._task = task;
    try {
      await task.promise;
      if (old.isConnected) old.replaceWith(canvas);
    } catch (err) {
      if (err && err.name !== 'RenderingCancelledException') console.error(err);
    }
  }

  let paintTimer;
  function paintPages() {
    clearTimeout(paintTimer);
    paintTimer = setTimeout(() => {
      $$('.lp-page', docs).forEach((shell, i) => paint(shell, PDF.pages[i], shell.getBoundingClientRect().width));
    }, 120);
  }
  function paintThumbs() {
    $$('#lp-thumbs .lp-page').forEach((shell, i) => paint(shell, PDF.pages[i], shell.getBoundingClientRect().width));
  }

  function applyZoom() {
    const w = S.zoom === 'fit' ? Math.max(480, Math.min(docs.clientWidth - 96, 1100)) : 816 * Number(S.zoom);
    const prev = docs.style.getPropertyValue('--page-w');
    docs.style.setProperty('--page-w', Math.round(w) + 'px');
    const opt = $('#lp-zoom option[value="fit"]');
    if (opt) opt.textContent = `Fit (${Math.round(w / 816 * 100)}%)`;
    // The overlay is in % and points, so it follows at once; the canvas is redrawn sharp.
    if (PDF.doc && prev !== Math.round(w) + 'px') { placeMarks(docs); paintPages(); }
  }

  function trackActivePage() {
    const line = docs.getBoundingClientRect().top + docs.clientHeight * 0.35;
    let n = 1;
    $$('.lp-page', docs).forEach(pg => { if (pg.getBoundingClientRect().top <= line) n = Number(pg.dataset.page); });
    if (n === S.activePage) return;
    S.activePage = n;
    $$('.lp-thumb').forEach(t => { if (Number(t.dataset.goto) === n) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
  }

  /* ------------------------------------------------------------------
     Masthead, banner
     ------------------------------------------------------------------ */
  function renderMasthead() {
    const v = S.versions.find(x => x.n === S.current);
    const word = { generated: 'Generated', edited: 'Edited', refreshed: 'Refreshed from Salesforce' }[v.kind];
    $('#lp-stamp').textContent = `Version ${v.n} · ${word} by ${v.who} on ${v.when}`;
    const st = $('#lp-status');
    st.className = 'sd-badge-statuses ' + (S.docState === 'sent' ? 'sd-badge-statuses--signature-sent' : 'sd-badge-statuses--document-created');
    st.textContent = S.docState === 'sent' ? 'Sent' : 'Generated';
    const n = S.pending.size, locked = S.docState === 'sent';
    $('#lp-save').disabled = !n || locked;
    $('#lp-save').textContent = n ? `Save ${n} change${n > 1 ? 's' : ''}` : 'Save';
    $('#lp-discard').disabled = !n;
    $('#lp-refresh').disabled = locked;
    const c = $('#lp-change-count');
    c.hidden = !n;
    c.textContent = n;
  }

  function alertHTML(intent, html, actions, live) {
    const mod = intent === 'success' ? ' sd-alert--success' : intent === 'error' ? ' sd-alert--error' : '';
    return `<div class="sd-alert${mod}" role="${live || 'status'}">` +
      icon('alert-circle', 'sd-alert__icon sd-alert__icon--warning') + icon('check-circle', 'sd-alert__icon sd-alert__icon--success') + icon('x-circle', 'sd-alert__icon sd-alert__icon--error') +
      `<p class="sd-alert__text">${html}</p>` + (actions ? `<span class="lp-banner__act">${actions}</span>` : '') + '</div>';
  }
  const btn = (label, attrs, kind) => `<button class="sd-button${kind ? ' sd-button--' + kind : ''}" type="button" ${attrs || ''}>${label}</button>`;
  const link = (label, attrs) => `<button type="button" class="sd-text-link sd-text-link--medium" ${attrs || ''}><span class="sd-text-link__label">${label}</span></button>`;

  function renderBanner() {
    const b = $('#lp-banner');
    if (S.docState === 'sent') {
      b.innerHTML = alertHTML('warning', 'This document is out for signature, so its data can’t be changed here. To edit it, void the signature request from the S-Docs component on the Opportunity.');
      return;
    }
    const drift = Object.values(S.els).filter(el => isDrift(el) && !S.pending.has(el.id));
    if (!drift.length) { b.innerHTML = ''; return; }
    b.innerHTML = alertHTML('warning',
      `<strong>${drift.length} value${drift.length > 1 ? 's' : ''} changed in Salesforce</strong> after version ${S.current} was made (${drift.map(el => esc(el.label)).join(', ')}). They’re marked ${icon('clock-rewind', 'lp-inline-icon')} on the page.`,
      btn('Use Salesforce values', 'data-act="sync-all"', 'secondary'));
  }

  /* ------------------------------------------------------------------
     Side panel: Changes · Versions
     ------------------------------------------------------------------ */
  function renderPanel() {
    $$('.lp-side .sd-pill-tabs__item').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === S.tab)));
    panel.setAttribute('aria-labelledby', 'tab-' + S.tab);
    panel.innerHTML = S.tab === 'changes' ? changesTab() : versionsTab();
  }

  function diffHTML(from, to) {
    return `<div class="lp-diff"><span class="lp-diff__from">${esc(from) || '<em>empty</em>'}</span><span class="lp-diff__arrow" aria-label="changed to">→</span><span class="lp-diff__to">${esc(to) || '<em>empty</em>'}</span></div>`;
  }

  function changesTab() {
    if (!S.pending.size) {
      return '<p class="lp-empty"><strong>No unsaved changes</strong>Click any highlighted value on the page to change it.</p>';
    }
    let html = '';
    for (const id of S.order.slice().reverse()) {
      const p = S.pending.get(id);
      if (!p) continue;
      const el = S.els[id], pages = [...new Set(placesOf(id).map(x => x.page))];
      html += `<article class="lp-change"><div class="lp-change__top">` +
        `<span class="lp-change__label"><button type="button" data-goto-el="${esc(id)}">${esc(el.label)}</button></span>` +
        (p.sync ? '<span class="lp-tag lp-tag--record">Salesforce value</span>' : '') +
        (S.errors.has(id) ? `<span class="lp-tag lp-tag--error">${icon('x-circle')}Not accepted</span>` : '') +
        `<button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-undo="${esc(id)}" aria-label="Undo change to ${esc(el.label)}"><svg class="sd-icon-button__icon sd-icon" aria-hidden="true"><use href="#reverse-left"></use></svg></button></div>` +
        diffHTML(fmt(el, el.doc), fmt(el, p.value)) +
        `<span class="lp-change__where">Page ${pages.join(', ')}</span></article>`;
    }
    return html + '<p class="lp-note">When you save, you choose which changes also update Salesforce.</p>' +
      `<div>${btn('Discard all changes', 'data-act="discard"', 'tertiary')}</div>`;
  }

  function versionsTab() {
    const what = v => v.kind === 'generated' ? 'Generated from the template'
      : v.kind === 'refreshed' ? `Refreshed from Salesforce · ${v.changes.length} value${v.changes.length === 1 ? '' : 's'} updated`
      : `Edited ${v.changes.length} field${v.changes.length === 1 ? '' : 's'}`;
    return '<p class="lp-note">Each save is a new version of the PDF. For what changed in a field, use the history mark beside it on the page.</p><ol class="lp-versions">' +
      S.versions.map(v => {
        const current = v.n === S.current;
        return `<li class="sd-version-row lp-version"${current ? ' aria-current="true"' : ''}>` +
          `<div class="sd-version-row__version"><span class="sd-version-row-title">Version ${v.n}</span>` +
          (current ? '<span class="sd-badge-statuses sd-badge-statuses--out-of-credits">Current</span>' : '') +
          `<span class="lp-version__acts">` +
          `<button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-proto="Opens version ${v.n} of the PDF in the file preview." aria-label="Open version ${v.n}"><svg class="sd-icon-button__icon sd-icon" aria-hidden="true"><use href="#eye"></use></svg></button>` +
          `<button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-proto="Downloads version ${v.n} of the PDF." aria-label="Download version ${v.n}"><svg class="sd-icon-button__icon sd-icon" aria-hidden="true"><use href="#download-01"></use></svg></button>` +
          '</span></div>' +
          `<p class="lp-version__what">${esc(what(v))}</p>` +
          `<div class="sd-version-row__meta"><span class="sd-version-row__owner"><svg class="sd-icon sd-version-row__owner-icon" aria-hidden="true"><use href="#user-01"></use></svg>${esc(v.who)}</span><span class="sd-version-row__timestamp">${esc(v.when)}</span></div></li>`;
      }).join('') + '</ol>';
  }

  /* ------------------------------------------------------------------
     Inline editing
     ------------------------------------------------------------------ */
  function fieldNode(pid) { return docs.querySelector(`.lp-f[data-pid="${pid}"]`); }

  function controlHTML(el, v) {
    const val = v == null ? '' : String(v);
    if (el.type === 'picklist') {
      const opts = el.options.includes(val) ? el.options : [val].concat(el.options);
      return `<select class="lp-in" aria-label="${esc(el.label)}">${opts.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (el.type === 'textarea') return `<textarea class="lp-in" aria-label="${esc(el.label)}">${esc(val)}</textarea>`;
    const type = { date: 'date', email: 'email', phone: 'tel' }[el.type] || 'text';
    const mode = ['currency', 'number', 'percent'].includes(el.type) ? ' inputmode="decimal"' : '';
    return `<input class="lp-in" type="${type}"${mode} value="${esc(val)}" aria-label="${esc(el.label)}" autocomplete="off">`;
  }

  function startEdit(pid) {
    const node = fieldNode(pid);
    if (!node || node.dataset.kind !== 'data') return;
    closeHistory();
    const el = S.els[node.dataset.el];
    S.edit = { pid, id: el.id };
    node.setAttribute('data-editing', '');
    $$(`[data-for="${pid}"]`, docs).forEach(m => { m.hidden = true; });   // they'd point at the old text
    node.insertAdjacentHTML('beforeend', controlHTML(el, shown(el)) + '<span class="lp-inline-msg" hidden></span>');
    placesOf(el.id).forEach(p => { if (p.pid !== pid) { const n = fieldNode(p.pid); if (n) n.setAttribute('data-linked', ''); } });
    const input = $('.lp-in', node);
    input.focus();
    if (input.select && input.type !== 'date') input.select();
    preview();
  }

  function readInput(el, input) {
    let v = input.value;
    if (['currency', 'number', 'percent'].includes(el.type)) {
      const t = v.replace(/[$,%\s]/g, '');
      if (t === '') return { value: '' };
      const num = Number(t);
      if (!isFinite(num)) return { error: 'Enter a number' };
      if (el.field === 'Seats__c' && (num < 1 || !Number.isInteger(num))) return { error: 'Seats must be a whole number, 1 or more' };
      return { value: num };
    }
    if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { error: 'Enter an email like name@example.com' };
    if (el.type === 'text' || el.type === 'textarea') v = v.replace(/\s+$/, '');
    return { value: v };
  }

  /* The page shows the new value as it's typed, in every place it appears. */
  function preview() {
    if (!S.edit) return;
    const el = S.els[S.edit.id];
    const node = fieldNode(S.edit.pid);
    const input = $('.lp-in', node);
    const r = readInput(el, input);
    const text = fmt(el, r.error ? shown(el) : r.value);
    const clippedOn = new Set();
    placesOf(el.id).forEach(p => {
      const n = fieldNode(p.pid);
      if (!n) return;
      n.firstElementChild.textContent = text;
      const c = isClipped(n.firstElementChild);
      n.toggleAttribute('data-clipped', c);
      if (c) clippedOn.add(p.page);
    });
    const err = S.errors.get(el.id);
    if (r.error) say(node, r.error, 'error');
    else if (err) say(node, err, 'error');
    else if (clippedOn.size) say(node, `Too long — the end won’t show on page ${[...clippedOn].join(' and ')}`, 'warn');
    else say(node, '');
  }

  function say(node, msg, kind) {
    const m = $('.lp-inline-msg', node);
    if (!m) return;
    m.hidden = !msg;
    m.textContent = msg;
    m.dataset.kind = kind || '';
  }

  /* how: 'commit' keeps the value, 'cancel' puts it back. */
  function endEdit(how, then) {
    if (!S.edit || endEdit.busy) return;
    endEdit.busy = true;
    const { pid, id } = S.edit;
    const el = S.els[id];
    const node = fieldNode(pid);
    const input = node && $('.lp-in', node);
    let kept = false;
    if (how === 'commit' && input) {
      const r = readInput(el, input);
      if (r.error) {
        if (then === 'stay') { say(node, r.error, 'error'); endEdit.busy = false; return; }
        toast(`${el.label} wasn’t changed: ${r.error.toLowerCase()}.`, 'error');
      } else if (!same(r.value, shown(el))) {
        setPending(el, r.value);
        kept = true;
      }
    }
    S.edit = null;
    endEdit.busy = false;
    if (kept) S.errors.delete(id);
    renderAll();
    if (typeof then === 'function') then();
    else if (then !== 'none') { const n = fieldNode(pid); if (n) n.focus({ preventScroll: true }); }
  }

  function setPending(el, value, sync) {
    S.order = S.order.filter(x => x !== el.id);
    if (same(value, el.doc)) {
      S.pending.delete(el.id);
      S.writeBack.delete(el.id);
    } else {
      S.pending.set(el.id, { value, sync: !!sync || (same(value, el.recordValue) && (isDrift(el) || !!el.override)) });
      S.order.push(el.id);
    }
  }

  /* Tab / Shift+Tab: keep this change and move to the next editable field. */
  function editableOrder() {
    return D.PAGES.flatMap(pg => PLACES.filter(p => p.page === pg.n && p.f.el)
      .sort((a, b) => (a.f.y - b.f.y) || (a.f.x - b.f.x)))
      .filter(p => !lockOf(S.els[p.f.el]));
  }
  function moveEdit(from, step) {
    const list = editableOrder();
    const i = list.findIndex(p => p.pid === from);
    const next = list[i + step];
    endEdit('commit', () => {
      if (!next) return;
      const n = fieldNode(next.pid);
      n.scrollIntoView({ block: 'nearest' });
      startEdit(next.pid);
    });
  }

  function undo(id) {
    S.pending.delete(id);
    S.order = S.order.filter(x => x !== id);
    S.errors.delete(id);
    S.writeBack.delete(id);
  }

  /* ------------------------------------------------------------------
     Field history
     ------------------------------------------------------------------ */
  function openHistory(pid) {
    const p = pageOf(pid);
    const el = S.els[p.f.el];
    S.hist = { pid, id: el.id };
    const pend = S.pending.get(el.id);
    const tagFor = c => c.scope === 'doc' ? '<span class="lp-tag lp-tag--doc">This document only</span>'
      : c.scope === 'record' ? `<span class="lp-tag lp-tag--record">${icon(recordIcon(el.record))}Also updated ${esc(D.RECORDS[el.record].object)}</span>`
      : '<span class="lp-tag lp-tag--record">From Salesforce</span>';

    let items = '';
    if (pend) {
      items += `<li class="lp-tl__item lp-tl__item--now"><span class="lp-tl__when">Not saved yet</span>${diffHTML(fmt(el, el.doc), fmt(el, pend.value))}` +
        `<span>${link('Undo', `data-undo="${esc(el.id)}"`)}</span></li>`;
    }
    if (isDrift(el) && !pend) {
      items += `<li class="lp-tl__item lp-tl__item--drift"><span class="lp-tl__when">In Salesforce${el.drift ? ` · ${esc(el.drift.who)} · ${esc(el.drift.when)}` : ''}</span>` +
        diffHTML(fmt(el, el.doc), fmt(el, el.recordValue)) +
        `<span class="lp-tl__note">Changed on the ${esc(D.RECORDS[el.record].object)} after this version was made. ${link('Use this value', `data-use-sf="${esc(el.id)}"`)}</span></li>`;
    }
    let first = fmt(el, el.doc);
    for (const v of S.versions) {
      const c = v.changes.find(x => x.el === el.id);
      if (!c) continue;
      first = c.from;
      items += `<li class="lp-tl__item"><span class="lp-tl__when">Version ${v.n} · ${esc(v.who)} · ${esc(v.when)}</span>` +
        diffHTML(c.from, c.to) + `<span class="lp-tl__tags">${tagFor(c)}</span>` +
        (v.reason && v.kind === 'edited' ? `<span class="lp-tl__note">“${esc(v.reason)}”</span>` : '') + '</li>';
    }
    const v1 = S.versions[S.versions.length - 1];
    items += `<li class="lp-tl__item lp-tl__item--start"><span class="lp-tl__when">Version ${v1.n} · Generated · ${esc(v1.who)} · ${esc(v1.when)}</span><span class="lp-tl__value">${esc(first) || '—'}</span></li>`;

    pop.innerHTML = `<div class="lp-pop__head"><div class="lp-pop__titles"><h2 class="lp-pop__title" id="lp-pop-title">${esc(el.label)}</h2>` +
      `<p class="lp-pop__path">${icon(recordIcon(el.record))}${esc(el.record === 'Opportunity' ? 'Opportunity' : recordPhrase(el))}</p></div>` +
      '<button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-pop-close aria-label="Close history"><svg class="sd-icon-button__icon sd-icon" aria-hidden="true"><use href="#x-close"></use></svg></button></div>' +
      `<ol class="lp-tl">${items}</ol>`;
    pop.setAttribute('aria-labelledby', 'lp-pop-title');
    pop.hidden = false;
    placePop();
    $('[data-pop-close]', pop).focus();
  }

  function closeHistory(returnFocus) {
    if (!S.hist) return;
    const pid = S.hist.pid;
    S.hist = null;
    pop.hidden = true;
    pop.innerHTML = '';
    if (returnFocus) { const b = docs.querySelector(`[data-hist="${pid}"]`); if (b) b.focus(); }
  }

  function placePop() {
    if (!S.hist || pop.hidden) return;
    const anchor = docs.querySelector(`[data-hist="${S.hist.pid}"]`) || fieldNode(S.hist.pid);
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let left = r.right + 10;
    if (left + pw > vw - 8) left = Math.max(8, r.left - pw - 10);
    const top = Math.max(8, Math.min(r.top - 16, vh - ph - 64));   // 64: clear of the prototype bar
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  /* ------------------------------------------------------------------
     Save, refresh, discard
     ------------------------------------------------------------------ */
  function openSave() {
    endEdit('commit', 'none');
    closeHistory();
    const next = S.current + 1;
    const rows = S.order.filter(id => S.pending.has(id)).map(id => {
      const el = S.els[id], p = S.pending.get(id);
      const R = D.RECORDS[el.record];
      const choice = p.sync
        ? '<span class="lp-note">Already matches Salesforce.</span>'
        : `<label class="sd-checkbox lp-wb"><input class="sd-checkbox__input" type="checkbox" data-wb="${esc(id)}"${S.writeBack.has(id) ? ' checked' : ''}>` +
          `<span class="sd-checkbox__box" aria-hidden="true">${icon('check', 'sd-checkbox__check')}${icon('minus', 'sd-checkbox__minus')}</span>` +
          `<span>Also update ${esc(recordPhrase(el))} in Salesforce${el.record !== 'Opportunity' ? `<span class="lp-wb__sub">Everything else that uses this ${esc(R.object)} will see the change.</span>` : ''}</span></label>`;
      const err = S.errors.get(id);
      return `<li class="lp-save-row"><span class="lp-ver__item-label">${esc(el.label)}</span>${diffHTML(fmt(el, el.doc), fmt(el, p.value))}${choice}` +
        (err ? `<p class="lp-pop__error">${esc(err)}</p>` : '') + '</li>';
    }).join('');
    $('#lp-save-title').textContent = `Save as version ${next}`;
    $('#lp-save-go').textContent = `Save version ${next}`;
    $('#lp-save-body').innerHTML =
      `<p>The PDF is saved as version ${next}. Version ${S.current} stays in Versions. Changes stay in this document unless you tick a box.</p>` +
      `<ul class="lp-modal__list lp-modal__list--save">${rows}</ul>` +
      '<div class="sd-field sd-field--textarea"><label class="sd-field__label" for="lp-reason">Reason (optional)</label><div class="sd-field__col"><div class="sd-field__control"><textarea id="lp-reason" rows="2" placeholder="Shown in each changed field’s history"></textarea></div></div></div>' +
      '<div id="lp-save-err"></div>';
    $('#lp-save-dialog').showModal();
  }

  function doSave() {
    const go = $('#lp-save-go');
    go.setAttribute('aria-busy', 'true');
    go.textContent = 'Saving…';
    setTimeout(() => {
      go.removeAttribute('aria-busy');
      const rejected = [];
      for (const [id, p] of S.pending) {
        const el = S.els[id];
        if (S.writeBack.has(id) && el.rule && !el.rule.test(p.value)) rejected.push([el, el.rule.message]);
      }
      if (rejected.length) {
        rejected.forEach(([el, m]) => S.errors.set(el.id, m));
        $('#lp-save-err').innerHTML = alertHTML('error',
          `Salesforce didn’t accept ${rejected.length === 1 ? 'a change' : rejected.length + ' changes'}, so nothing was saved. ` +
          rejected.map(([el, m]) => `<strong>${esc(el.label)}:</strong> ${esc(m)} `).join('') +
          'Fix the value, or untick “Also update” to keep it in this document only.', null, 'alert');
        go.textContent = `Save version ${S.current + 1}`;
        renderAll();
        return;
      }
      const next = S.current + 1;
      const reason = ($('#lp-reason').value || '').trim();
      const changes = [], touched = new Set();
      for (const id of S.order) {
        const p = S.pending.get(id);
        if (!p) continue;
        const el = S.els[id];
        const scope = p.sync ? 'sync' : S.writeBack.has(id) ? 'record' : 'doc';
        changes.push({ el: id, from: fmt(el, el.doc), to: fmt(el, p.value), scope });
        el.doc = p.value;
        if (scope === 'record') { el.recordValue = p.value; el.override = null; touched.add(D.RECORDS[el.record].object); }
        else if (scope === 'sync') el.override = null;
        else el.override = next;
      }
      S.versions.unshift({ n: next, kind: 'edited', who: D.USERS[S.user].name, when: nowStamp(), reason, changes });
      S.current = next;
      S.pending.clear(); S.order = []; S.errors.clear(); S.writeBack.clear();
      $('#lp-save-dialog').close();
      renderAll();
      toast(`Saved as version ${next}.` + (touched.size ? ` Salesforce updated: ${[...touched].join(', ')}.` : ''), 'success');
    }, 900);
  }

  function openRefresh() {
    endEdit('cancel', 'none');
    closeHistory();
    const next = S.current + 1;
    const els = Object.values(S.els);
    const overrides = els.filter(el => el.override);
    const drift = els.filter(isDrift);
    const rows = list => '<ul class="lp-modal__list">' + list.map(el =>
      `<li><span class="lp-ver__item-label">${esc(el.label)}</span>${diffHTML(fmt(el, el.doc), fmt(el, el.recordValue))}</li>`).join('') + '</ul>';
    let body = `<p>S-Docs generates the document again from what Salesforce has now and saves it as version ${next}. Version ${S.current} stays in Versions.</p>`;
    if (overrides.length) body += `<section><h3>Values kept in this document only will be replaced <span>(${overrides.length})</span></h3>${rows(overrides)}</section>`;
    if (drift.length) body += `<section><h3>Values that changed in Salesforce <span>(${drift.length})</span></h3>${rows(drift)}</section>`;
    if (!overrides.length && !drift.length) body += '<p>Nothing has changed in Salesforce since this version, so the new version will look the same.</p>';
    if (S.pending.size) body += alertHTML('warning', `You have ${S.pending.size} unsaved change${S.pending.size > 1 ? 's' : ''}. Refreshing discards ${S.pending.size > 1 ? 'them' : 'it'}.`);
    $('#lp-refresh-body').innerHTML = body;
    $('#lp-refresh-go').textContent = `Refresh as version ${next}`;
    $('#lp-refresh-dialog').showModal();
  }

  function doRefresh() {
    const go = $('#lp-refresh-go');
    go.setAttribute('aria-busy', 'true');
    go.textContent = 'Generating…';
    setTimeout(() => {
      go.removeAttribute('aria-busy');
      const next = S.current + 1;
      const changes = [];
      for (const el of Object.values(S.els)) {
        if (el.record === 'Runtime') continue;
        if (!same(el.doc, el.recordValue)) changes.push({ el: el.id, from: fmt(el, el.doc), to: fmt(el, el.recordValue), scope: 'refresh' });
        el.doc = el.recordValue;
        el.override = null;
      }
      S.versions.unshift({ n: next, kind: 'refreshed', who: D.USERS[S.user].name, when: nowStamp(), reason: '', changes });
      S.current = next;
      S.pending.clear(); S.order = []; S.errors.clear(); S.writeBack.clear();
      $('#lp-refresh-dialog').close();
      renderAll();
      toast(`Version ${next} generated from Salesforce. ${changes.length} value${changes.length === 1 ? '' : 's'} updated.`, 'success');
    }, 900);
  }

  function discardAll() {
    endEdit('cancel', 'none');
    const keep = { pending: new Map(S.pending), order: S.order.slice() };
    const n = S.pending.size;
    S.pending.clear(); S.order = []; S.errors.clear(); S.writeBack.clear();
    renderAll();
    discardAll.last = keep;
    toast(`Discarded ${n} change${n > 1 ? 's' : ''}.`, 'success', btn('Undo', 'data-act="undo-discard"', 'tertiary'));
  }

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg, intent, actions) {
    const t = $('#lp-toast');
    t.innerHTML = alertHTML(intent || 'success', esc(msg), actions, intent === 'error' ? 'alert' : 'status');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.innerHTML = ''; }, 6000);
  }

  function renderAll() {
    renderPages();
    renderThumbs();
    renderMasthead();
    renderBanner();
    renderPanel();
    if (S.hist) placePop();
  }

  /* ------------------------------------------------------------------
     Events
     ------------------------------------------------------------------ */
  docs.addEventListener('mousedown', e => {
    // Clicking elsewhere on the page while typing keeps this change first, then
    // acts on what was clicked (the re-render would otherwise swallow the click).
    if (!S.edit || e.target.closest('.lp-f[data-editing]')) return;
    const f = e.target.closest('.lp-f[data-pid]');
    const h = e.target.closest('[data-hist]');
    e.preventDefault();
    endEdit('commit', 'none');
    if (h) openHistory(h.dataset.hist);
    else if (f) startEdit(f.dataset.pid);
  });
  docs.addEventListener('click', e => {
    const h = e.target.closest('[data-hist]');
    if (h) { e.stopPropagation(); if (S.hist && S.hist.pid === h.dataset.hist) closeHistory(); else openHistory(h.dataset.hist); return; }
    const f = e.target.closest('.lp-f[data-pid]');
    if (f && !f.hasAttribute('data-editing')) startEdit(f.dataset.pid);
  });
  docs.addEventListener('keydown', e => {
    const editing = e.target.classList && e.target.classList.contains('lp-in');
    if (editing) {
      if (e.key === 'Escape') { e.preventDefault(); endEdit('cancel'); }
      else if (e.key === 'Tab') { e.preventDefault(); moveEdit(S.edit.pid, e.shiftKey ? -1 : 1); }
      else if (e.key === 'Enter' && (e.target.tagName !== 'TEXTAREA' || e.metaKey || e.ctrlKey)) { e.preventDefault(); endEdit('commit', 'stay'); }
      return;
    }
    const f = e.target.closest('.lp-f[data-pid]');
    if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(f.dataset.pid); }
  });
  docs.addEventListener('input', e => { if (e.target.classList.contains('lp-in')) preview(); });
  docs.addEventListener('change', e => { if (e.target.classList.contains('lp-in')) preview(); });
  docs.addEventListener('focusout', e => {
    if (!e.target.classList || !e.target.classList.contains('lp-in')) return;
    // Clicking away keeps the change (Salesforce inline edit behaves the same way).
    setTimeout(() => { if (S.edit && !docs.querySelector('.lp-in:focus')) endEdit('commit', 'none'); }, 0);
  });
  docs.addEventListener('scroll', () => { placePop(); trackActivePage(); }, { passive: true });
  window.addEventListener('resize', () => { applyZoom(); placePop(); });
  new ResizeObserver(() => { if (S && S.zoom === 'fit') { applyZoom(); placePop(); } }).observe(docs);

  pop.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-pop-close')) return closeHistory(true);
    if (t.dataset.undo) { undo(t.dataset.undo); closeHistory(); renderAll(); return; }
    if (t.dataset.useSf) {
      const el = S.els[t.dataset.useSf];
      setPending(el, el.recordValue, true);
      closeHistory();
      renderAll();
    }
  });
  pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeHistory(true); } });
  document.addEventListener('mousedown', e => {
    if (!S.hist || pop.hidden) return;
    if (pop.contains(e.target) || e.target.closest('[data-hist]')) return;
    closeHistory();
  });

  $('#lp-thumbs').addEventListener('click', e => {
    const b = e.target.closest('[data-goto]');
    if (!b) return;
    $('#page-' + b.dataset.goto).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('.lp-side .sd-pill-tabs').addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    S.tab = t.dataset.tab;
    renderPanel();
  });
  panel.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.gotoEl) {
      const p = placesOf(t.dataset.gotoEl)[0];
      fieldNode(p.pid).scrollIntoView({ block: 'center' });
      startEdit(p.pid);
      return;
    }
    if (t.dataset.undo) { undo(t.dataset.undo); renderAll(); return; }
    if (t.dataset.act === 'discard') { discardAll(); return; }
    if (t.dataset.proto) toast('Prototype: ' + t.dataset.proto, 'success');
  });

  $('#lp-banner').addEventListener('click', e => {
    const t = e.target.closest('[data-act="sync-all"]');
    if (!t) return;
    Object.values(S.els).filter(el => isDrift(el) && !S.pending.has(el.id)).forEach(el => setPending(el, el.recordValue, true));
    S.tab = 'changes';
    renderAll();
  });

  $('#lp-highlight').addEventListener('change', e => { S.show = e.target.checked; docs.toggleAttribute('data-show', S.show); });
  $('#lp-zoom').addEventListener('change', e => { S.zoom = e.target.value; applyZoom(); placePop(); });
  $('#lp-save').addEventListener('click', openSave);
  $('#lp-discard').addEventListener('click', discardAll);
  $('#lp-refresh').addEventListener('click', openRefresh);
  $('#lp-save-go').addEventListener('click', doSave);
  $('#lp-refresh-go').addEventListener('click', doRefresh);
  $('#lp-save-body').addEventListener('change', e => {
    const id = e.target.dataset && e.target.dataset.wb;
    if (!id) return;
    if (e.target.checked) S.writeBack.add(id); else S.writeBack.delete(id);
    S.errors.delete(id);
  });
  $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $('#lp-toast').addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'undo-discard' && discardAll.last) {
      S.pending = discardAll.last.pending; S.order = discardAll.last.order; discardAll.last = null; renderAll();
    }
    $('#lp-toast').innerHTML = '';
  });

  // ⌘/Ctrl+Z undoes the most recent unsaved change, outside of text boxes.
  document.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    const id = S.order[S.order.length - 1];
    if (!id) return;
    e.preventDefault();
    const label = S.els[id].label;
    undo(id);
    renderAll();
    toast(`Undid the change to ${label}.`, 'success');
  });

  // Prototype controls
  $('#proto-user').addEventListener('click', e => {
    const b = e.target.closest('[data-user]');
    if (!b) return;
    endEdit('cancel', 'none');
    closeHistory();
    S.user = b.dataset.user;
    $$('#proto-user button').forEach(x => x.classList.toggle('active', x === b));
    const u = D.USERS[S.user];
    $('#sf-avatar').textContent = u.name.split(' ').map(w => w[0]).join('');
    $('#sf-avatar').title = u.name;
    for (const id of [...S.pending.keys()]) if (lockOf(S.els[id])) undo(id);
    renderAll();
    toast(`Now editing as ${u.name} (${u.role}). ${S.user === 'desk' ? 'Account and Contact fields are locked for this user; Discount is editable.' : 'Discount is locked for this user.'}`, 'success');
  });
  $('#proto-view').addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    endEdit('cancel', 'none');
    closeHistory();
    docs.dataset.view = b.dataset.view;
    $$('#proto-view button').forEach(x => x.classList.toggle('active', x === b));
  });
  $('#proto-state').addEventListener('click', e => {
    const b = e.target.closest('[data-state]');
    if (!b) return;
    endEdit('cancel', 'none');
    closeHistory();
    S.docState = b.dataset.state;
    $$('#proto-state button').forEach(x => x.classList.toggle('active', x === b));
    renderAll();
  });
  $('#proto-reset').addEventListener('click', () => {
    endEdit('cancel', 'none');
    closeHistory();
    S = initialState();
    $$('#proto-user button').forEach(x => x.classList.toggle('active', x.dataset.user === 'rep'));
    $$('#proto-state button').forEach(x => x.classList.toggle('active', x.dataset.state === 'generated'));
    $('#sf-avatar').textContent = 'PR';
    $('#lp-highlight').checked = true;
    $('#lp-zoom').value = 'fit';
    renderAll();
  });

  S = initialState();
  loadPdf().then(ok => {
    if (!ok) return;
    applyZoom();
    renderAll();
    paintPages();
    paintThumbs();
    trackActivePage();
  });
})();
