/* =========================================================================
   S-Docs Lightning Web Component 2.0 — prototype behaviour
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------- data ----------------------------------- */
  // `out` is the document name the template produces for this record.
  const TEMPLATES = [
    { id: 't1',  name: 'Statement of Work',                desc: 'Scope, deliverables and milestones for a new engagement.',        out: 'PseudoCo Statement of Work',              fmt: 'PDF',  esign: true,  fav: true },
    { id: 't2',  name: 'New Customer Onboarding Kit',      desc: 'Welcome pack, account setup checklist and support contacts.',     out: 'PseudoCo Onboarding Kit',                 fmt: 'PDF',  esign: false, fav: true },
    { id: 't3',  name: 'Proposal Template',                desc: 'Executive summary, pricing and terms for a new opportunity.',     out: 'PseudoCo Proposal',                       fmt: 'PDF',  esign: false, fav: true },
    { id: 't4',  name: 'Non-Disclosure Agreement (NDA)',   desc: 'Mutual confidentiality agreement on standard paper.',             out: 'PseudoCo Non-Disclosure Agreement (NDA)', fmt: 'PDF',  esign: true,  fav: false },
    { id: 't5',  name: 'Vendor Terms Agreement',           desc: 'Master vendor terms, SLAs and payment schedule.',                 out: 'Vendor Terms Agreement – PseudoCo',  fmt: 'PDF',  esign: true,  fav: false },
    { id: 't6',  name: 'Service Invoice',                  desc: 'Itemised invoice with line items pulled from the opportunity.',   out: 'Service Invoice',                         fmt: 'XLS',  esign: false, fav: false },
    { id: 't7',  name: 'Sales Contract',                   desc: 'Standard order agreement for direct enterprise sales.',           out: 'PseudoCo Sales Contract',                 fmt: 'PDF',  esign: true,  fav: false },
    { id: 't8',  name: 'Employment Contract',              desc: 'Offer terms, compensation and start date for a new hire.',        out: 'Employment Contract',                     fmt: 'DOCX', esign: true,  fav: false },
    { id: 't9',  name: 'Order Form',                       desc: 'Products, quantities and net pricing for signature.',             out: 'PseudoCo Order Form',                     fmt: 'PDF',  esign: true,  fav: false },
    { id: 't10', name: 'Master Services Agreement',        desc: 'Umbrella agreement governing all future statements of work.',     out: 'PseudoCo Master Services Agreement',      fmt: 'PDF',  esign: true,  fav: false },
    { id: 't11', name: 'Data Processing Addendum',         desc: 'GDPR / CCPA processing terms and sub-processor list.',            out: 'PseudoCo Data Processing Addendum',       fmt: 'PDF',  esign: true,  fav: false },
    { id: 't12', name: 'Renewal Quote',                    desc: 'Uplift pricing and term options for an expiring subscription.',   out: 'PseudoCo Renewal Quote',                  fmt: 'PDF',  esign: false, fav: false },
    { id: 't13', name: 'Change Order',                     desc: 'Amendment to scope, price or term on an executed contract.',      out: 'PseudoCo Change Order',                   fmt: 'PDF',  esign: true,  fav: false },
    { id: 't14', name: 'Security Questionnaire',           desc: 'Standard responses to customer security due diligence.',          out: 'Security Questionnaire',                  fmt: 'XLS',  esign: false, fav: false },
    { id: 't15', name: 'Mutual NDA (Counterparty Paper)',  desc: 'Redline-ready NDA for when the customer supplies the form.',      out: 'Mutual NDA – Counterparty Paper',    fmt: 'DOCX', esign: false, fav: false },
    { id: 't16', name: 'W-9 Request',                      desc: 'Taxpayer identification request for vendor onboarding.',          out: 'W-9 Request',                             fmt: 'PDF',  esign: true,  fav: false },
    { id: 't17', name: 'Termination Notice',               desc: 'Notice of non-renewal or termination for convenience.',           out: 'Termination Notice',                      fmt: 'DOCX', esign: true,  fav: false },
    { id: 't18', name: 'Welcome Letter',                   desc: 'Signed welcome note from the account executive.',                 out: 'PseudoCo Welcome Letter',                 fmt: 'PDF',  esign: false, fav: false }
  ];

  /* ----------------------------- state ---------------------------------- */
  const state = {
    dropMode: 'flat',        // 'flat' | 'fav'
    dropOpen: false,
    query: '',
    picked: new Set(),       // template ids chosen in the dropdown
    favs: new Set(TEMPLATES.filter(t => t.fav).map(t => t.id)),
    docs: [],                // generated documents
    selected: new Set(),     // selected document ids
    menuDocId: null,
    modal: null,
    seq: 0
  };

  /* ----------------------------- helpers -------------------------------- */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tpl = id => TEMPLATES.find(t => t.id === id);
  const doc = id => state.docs.find(d => d.id === id);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function stamp(d) {
    d = d || new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${hh}:${mm}`;
  }

  const starSvg = on =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon class="${on ? 'on' : 'off'}" points="12,2.6 14.9,8.8 21.6,9.7 16.7,14.4 17.9,21.1 12,17.9 6.1,21.1 7.3,14.4 2.4,9.7 9.1,8.8"/></svg>`;

  /* ----------------------------- elements ------------------------------- */
  const el = {
    combo:      $('#sd-combo'),
    comboValue: $('#sd-combo-value'),
    drop:       $('#sd-drop'),
    dropList:   $('#sd-drop-list'),
    dropFoot:   $('#sd-drop-foot'),
    dropCount:  $('#sd-drop-count'),
    clearSel:   $('#sd-clear-sel'),
    search:     $('#sd-search'),
    generate:   $('#sd-generate'),
    genLabel:   $('#sd-generate-label'),
    empty:      $('#sd-empty'),
    docs:       $('#sd-docs'),
    rows:       $('#sd-rows'),
    selectAll:  $('#sd-select-all'),
    actions:    $('#sd-actions'),
    menu:       $('#sd-menu'),
    backdrop:   $('#sd-backdrop'),
    modal:      $('#sd-modal'),
    modalTitle: $('#sd-modal-title'),
    modalBody:  $('#sd-modal-body'),
    modalSend:  $('#sd-modal-send'),
    toasts:     $('#sd-toast-stack')
  };

  /* =======================================================================
     TOASTS
     ======================================================================= */
  const ICON_OK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12.5 9.5 18 20 6.5"/></svg>';
  const ICON_INFO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none"/></svg>';

  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'sd-toast' + (kind ? ' ' + kind : '');
    t.innerHTML = (kind === 'info' ? ICON_INFO : ICON_OK) + '<span>' + esc(msg) + '</span>';
    el.toasts.appendChild(t);
    setTimeout(() => {
      t.classList.add('leaving');
      setTimeout(() => t.remove(), 200);
    }, 3200);
  }

  /* =======================================================================
     TEMPLATE DROPDOWN
     ======================================================================= */
  function matches(t) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
  }

  function optionHtml(t, withStar) {
    const picked = state.picked.has(t.id);
    const fav = state.favs.has(t.id);
    const control = withStar
      ? `<button class="sd-star" data-star="${t.id}" title="${fav ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${fav}">${starSvg(fav)}</button>`
      : `<label class="sd-check-wrap"><input type="checkbox" data-pick="${t.id}" ${picked ? 'checked' : ''}><span class="sd-check"></span></label>`;
    return `
      <div class="sd-opt${picked ? ' is-selected' : ''}" data-opt="${t.id}" role="option" aria-selected="${picked}">
        ${control}
        <span class="sd-opt-text">
          <span class="sd-opt-name">${esc(t.name)}</span>
          <span class="sd-opt-desc">${esc(t.desc)}</span>
        </span>
      </div>`;
  }

  function renderDrop() {
    const visible = TEMPLATES.filter(matches);

    if (!visible.length) {
      el.dropList.innerHTML = '<p class="sd-empty-opt">No templates match &ldquo;' + esc(state.query) + '&rdquo;</p>';
    } else if (state.dropMode === 'fav') {
      // Favorites are a shortcut at the top; "All Templates" still lists the whole
      // library beneath it, so its count matches the full template count in the design.
      const favs = visible.filter(t => state.favs.has(t.id));
      let html = '';
      if (favs.length) {
        html += `<div class="sd-group">Favorites (${favs.length})</div>` + favs.map(t => optionHtml(t, true)).join('');
      }
      html += `<div class="sd-group">All Templates (${visible.length})</div>` + visible.map(t => optionHtml(t, true)).join('');
      el.dropList.innerHTML = html;
    } else {
      el.dropList.innerHTML = visible.map(t => optionHtml(t, false)).join('');
    }

    const n = state.picked.size;
    el.dropFoot.hidden = n === 0;
    el.dropCount.textContent = n + ' template' + (n === 1 ? '' : 's') + ' selected';
  }

  function renderCombo() {
    const n = state.picked.size;
    if (n === 0) {
      el.comboValue.innerHTML = '<span class="sd-combo-placeholder">Select</span>';
    } else if (n === 1) {
      const t = tpl(Array.from(state.picked)[0]);
      const fav = state.favs.has(t.id);
      if (state.dropMode === 'fav') {
        el.comboValue.innerHTML =
          `<span class="sd-star" aria-hidden="true">${starSvg(fav)}</span>` +
          `<span class="sd-combo-text"><span class="l1">${esc(t.name)}</span><span class="l2">${esc(t.desc)}</span></span>`;
      } else {
        el.comboValue.innerHTML = `<span class="sd-combo-text"><span class="l1">${esc(t.name)}</span></span>`;
      }
    } else {
      el.comboValue.innerHTML = `<span class="sd-combo-text"><span class="l1">${n} templates selected</span></span>`;
    }
    el.generate.disabled = n === 0 || el.generate.classList.contains('is-busy');
  }

  function openDrop() {
    state.dropOpen = true;
    el.drop.hidden = false;
    el.combo.classList.add('open');
    el.combo.setAttribute('aria-expanded', 'true');
    renderDrop();
    setTimeout(() => el.search.focus(), 10);
  }

  function closeDrop() {
    state.dropOpen = false;
    el.drop.hidden = true;
    el.combo.classList.remove('open');
    el.combo.setAttribute('aria-expanded', 'false');
    state.query = '';
    el.search.value = '';
  }

  el.combo.addEventListener('click', () => (state.dropOpen ? closeDrop() : openDrop()));

  el.search.addEventListener('input', e => {
    state.query = e.target.value.trim();
    renderDrop();
  });

  el.dropList.addEventListener('click', e => {
    // Stop here: re-rendering the list detaches the clicked node, so by the time the
    // document-level outside-click handler ran it would no longer find .sd-combo-wrap
    // above the target and would close the dropdown after a single pick.
    e.stopPropagation();

    const star = e.target.closest('[data-star]');
    if (star) {
      const id = star.dataset.star;
      if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
      renderDrop();
      renderCombo();
      return;
    }
    const opt = e.target.closest('[data-opt]');
    if (!opt) return;
    const id = opt.dataset.opt;
    if (state.picked.has(id)) state.picked.delete(id); else state.picked.add(id);
    renderDrop();
    renderCombo();
  });

  el.clearSel.addEventListener('click', e => {
    e.stopPropagation();
    state.picked.clear();
    renderDrop();
    renderCombo();
  });

  document.addEventListener('click', e => {
    if (state.dropOpen && !e.target.closest('.sd-combo-wrap')) closeDrop();
  });

  /* =======================================================================
     GENERATE
     ======================================================================= */
  el.generate.addEventListener('click', () => {
    if (el.generate.disabled) return;
    const chosen = Array.from(state.picked).map(tpl);
    if (!chosen.length) return;

    closeDrop();

    el.generate.classList.add('is-busy');
    el.generate.disabled = true;
    el.genLabel.textContent = 'Generating…';

    el.empty.hidden = true;
    el.docs.hidden = false;

    // Queue a placeholder row per chosen template, then resolve them in turn.
    const pending = chosen.map(t => {
      const d = {
        id: 'd' + (++state.seq),
        name: t.out,
        fmt: t.fmt,
        esign: t.esign,
        when: '',
        status: 'generating'
      };
      state.docs.unshift(d);
      return d;
    });

    state.picked.clear();
    renderCombo();
    renderRows();

    pending.forEach((d, i) => {
      setTimeout(() => {
        d.status = 'ready';
        d.when = stamp();
        renderRows();

        if (i === pending.length - 1) {
          el.generate.classList.remove('is-busy');
          el.genLabel.textContent = 'Generate';
          renderCombo();
          toast(pending.length === 1
            ? '“' + pending[0].name + '” was generated.'
            : pending.length + ' documents were generated.');
        }
      }, 900 + i * 750);
    });
  });

  /* =======================================================================
     DOCUMENT ROWS
     ======================================================================= */
  function renderRows() {
    el.rows.innerHTML = state.docs.map(d => {
      if (d.status === 'generating') {
        return `
          <li class="sd-row is-generating" data-row="${d.id}">
            <span class="sd-row-spinner" aria-hidden="true"></span>
            <span class="sd-row-text">
              <span class="sd-row-name">${esc(d.name)}</span>
              <span class="sd-row-meta"><span class="sd-generating-meta">Generating…</span></span>
            </span>
          </li>`;
      }
      const sel = state.selected.has(d.id);
      return `
        <li class="sd-row${sel ? ' is-selected' : ''}" data-row="${d.id}">
          <label class="sd-check-wrap"><input type="checkbox" data-doc="${d.id}" ${sel ? 'checked' : ''} aria-label="Select ${esc(d.name)}"><span class="sd-check"></span></label>
          <span class="sd-row-text">
            <span class="sd-row-name">${esc(d.name)}</span>
            <span class="sd-row-meta">
              <span>${esc(d.when)}</span>
              <span>${esc(d.fmt)}</span>
              ${d.esign ? '<span class="esign">E-Sign Enabled</span>' : ''}
            </span>
          </span>
          <button class="sd-kebab" data-kebab="${d.id}" aria-label="More actions for ${esc(d.name)}" aria-haspopup="menu">&bull;&bull;&bull;</button>
        </li>`;
    }).join('');

    syncSelection();
  }

  function readyDocs() { return state.docs.filter(d => d.status === 'ready'); }

  function syncSelection() {
    // drop selections for rows that no longer exist
    Array.from(state.selected).forEach(id => { if (!doc(id)) state.selected.delete(id); });

    const ready = readyDocs();
    const n = state.selected.size;

    el.selectAll.checked = ready.length > 0 && n === ready.length;
    el.selectAll.indeterminate = n > 0 && n < ready.length;
    el.selectAll.disabled = ready.length === 0;

    $$('.sd-act', el.actions).forEach(b => { b.disabled = n === 0; });
  }

  el.rows.addEventListener('change', e => {
    const cb = e.target.closest('[data-doc]');
    if (!cb) return;
    const id = cb.dataset.doc;
    if (cb.checked) state.selected.add(id); else state.selected.delete(id);
    const row = cb.closest('.sd-row');
    if (row) row.classList.toggle('is-selected', cb.checked);
    syncSelection();
  });

  el.selectAll.addEventListener('change', () => {
    state.selected.clear();
    if (el.selectAll.checked) readyDocs().forEach(d => state.selected.add(d.id));
    renderRows();
  });

  /* =======================================================================
     ROW “…” MENU
     ======================================================================= */
  function openMenu(btn, docId) {
    state.menuDocId = docId;
    el.menu.hidden = false;
    btn.classList.add('open');

    const r = btn.getBoundingClientRect();
    const mw = el.menu.offsetWidth;
    const mh = el.menu.offsetHeight;

    // Prefer dropping down-left of the kebab; flip up if it would run off-screen.
    let left = r.right + window.scrollX - mw + 6;
    let top = r.bottom + window.scrollY + 4;
    if (left < 8) left = 8;
    if (r.bottom + mh + 12 > window.innerHeight) {
      top = r.top + window.scrollY - mh - 4;
      if (top < window.scrollY + 8) top = window.scrollY + 8;
    }
    el.menu.style.left = left + 'px';
    el.menu.style.top = top + 'px';
  }

  function closeMenu() {
    el.menu.hidden = true;
    state.menuDocId = null;
    $$('.sd-kebab.open').forEach(b => b.classList.remove('open'));
  }

  el.rows.addEventListener('click', e => {
    const k = e.target.closest('[data-kebab]');
    if (!k) return;
    e.stopPropagation();
    const id = k.dataset.kebab;
    if (state.menuDocId === id) { closeMenu(); return; }
    closeMenu();
    openMenu(k, id);
  });

  document.addEventListener('click', e => {
    if (!el.menu.hidden && !e.target.closest('#sd-menu') && !e.target.closest('[data-kebab]')) closeMenu();
  });
  window.addEventListener('scroll', () => { if (!el.menu.hidden) closeMenu(); }, true);
  window.addEventListener('resize', () => { if (!el.menu.hidden) closeMenu(); });

  el.menu.addEventListener('click', e => {
    const item = e.target.closest('[data-menu]');
    if (!item) return;
    const action = item.dataset.menu;
    const d = doc(state.menuDocId);
    closeMenu();
    if (!d) return;
    runAction(action, [d]);
  });

  /* =======================================================================
     TOOLBAR ACTIONS
     ======================================================================= */
  el.actions.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const docs = readyDocs().filter(d => state.selected.has(d.id));
    if (!docs.length) return;
    runAction(b.dataset.act, docs, b);
  });

  function runAction(action, docs, btn) {
    const names = docs.map(d => d.name);
    const label = docs.length === 1 ? '“' + names[0] + '”' : docs.length + ' documents';

    switch (action) {
      case 'sign':
        openModal('sign', docs);
        break;

      case 'email':
        openModal('email', docs);
        break;

      case 'download':
        toast(docs.length === 1
          ? 'Downloading ' + label + '.'
          : 'Downloading ' + label + ' as a ZIP archive.');
        break;

      case 'refresh': {
        if (btn) btn.classList.add('is-spinning');
        toast('Refreshing ' + label + '…', 'info');
        const ids = docs.map(d => d.id);
        setTimeout(() => {
          ids.forEach(id => { const d = doc(id); if (d) d.when = stamp(); });
          renderRows();
          if (btn) btn.classList.remove('is-spinning');
          toast(docs.length === 1 ? label + ' is up to date.' : label + ' are up to date.');
        }, 1100);
        break;
      }

      case 'preview':
        toast('Opening a preview of ' + label + '.', 'info');
        break;

      case 'edit':
        toast('Opening ' + label + ' in the S-Docs editor.', 'info');
        break;

      case 'versions':
        toast('Showing version history for ' + label + '.', 'info');
        break;

      case 'delete': {
        const ids = docs.map(d => d.id);
        state.docs = state.docs.filter(d => !ids.includes(d.id));
        ids.forEach(id => state.selected.delete(id));
        renderRows();
        if (!state.docs.length) { el.docs.hidden = true; el.empty.hidden = false; }
        toast(label + ' deleted.');
        break;
      }
    }
  }

  /* =======================================================================
     MODALS (Request signature / Email)
     ======================================================================= */
  function docListHtml(docs) {
    return `
      <div class="m-docs">
        <div class="m-docs-title">${docs.length} document${docs.length === 1 ? '' : 's'}</div>
        ${docs.map(d => `<div class="m-doc"><span class="fmt ${d.fmt.toLowerCase()}">${esc(d.fmt)}</span>${esc(d.name)}</div>`).join('')}
      </div>`;
  }

  function openModal(kind, docs) {
    state.modal = { kind: kind, docs: docs };
    const many = docs.length > 1;

    if (kind === 'sign') {
      const noEsign = docs.filter(d => !d.esign);
      el.modalTitle.textContent = 'Request signature';
      el.modalBody.innerHTML =
        docListHtml(docs) +
        (noEsign.length
          ? `<p class="m-note" style="margin-bottom:14px;color:#a56a00">${noEsign.length === 1 ? '“' + esc(noEsign[0].name) + '” is not' : esc(String(noEsign.length)) + ' of these are not'} E-Sign Enabled and will be attached for reference only.</p>`
          : '') +
        `<div class="mf"><label for="m-signer">Signer</label>
           <select id="m-signer">
             <option>Dana Whitfield &lt;dana.whitfield@pseudoco.com&gt; — Signatory</option>
             <option>Marcus Reyes &lt;marcus.reyes@pseudoco.com&gt; — Legal Counsel</option>
             <option>Priya Anand &lt;priya.anand@pseudoco.com&gt; — Procurement</option>
           </select></div>
         <div class="mf"><label for="m-cc">Copy (optional)</label>
           <input id="m-cc" type="text" placeholder="name@example.com" value="anarasimhan@sdocs.com"></div>
         <div class="mf"><label for="m-msg">Message to signer</label>
           <textarea id="m-msg">Hi Dana — please review and sign the attached. Happy to walk through anything before you do.</textarea></div>`;
      el.modalSend.textContent = 'Send for signature';
    } else {
      el.modalTitle.textContent = many ? 'Email documents' : 'Email document';
      el.modalBody.innerHTML =
        docListHtml(docs) +
        `<div class="mf"><label for="m-to">To</label>
           <input id="m-to" type="text" value="dana.whitfield@pseudoco.com"></div>
         <div class="mf"><label for="m-subject">Subject</label>
           <input id="m-subject" type="text" value="${esc(many ? 'PseudoCo — Enterprise Rollout documents' : docs[0].name)}"></div>
         <div class="mf"><label for="m-body">Message</label>
           <textarea id="m-body">Hi Dana — ${many ? 'the documents we discussed are' : 'the document we discussed is'} attached. Let me know if anything needs adjusting.</textarea></div>
         <p class="m-note">Sent from S-Docs and logged to the Activity timeline on this opportunity.</p>`;
      el.modalSend.textContent = 'Send email';
    }

    el.backdrop.hidden = false;
    el.modal.hidden = false;
  }

  function closeModal() {
    el.backdrop.hidden = true;
    el.modal.hidden = true;
    state.modal = null;
  }

  el.modalSend.addEventListener('click', () => {
    if (!state.modal) return;
    const { kind, docs } = state.modal;
    const label = docs.length === 1 ? '“' + docs[0].name + '”' : docs.length + ' documents';
    closeModal();
    if (kind === 'sign') {
      toast('Signature request sent for ' + label + '.');
    } else {
      toast(label + (docs.length === 1 ? ' was' : ' were') + ' emailed to dana.whitfield@pseudoco.com.');
    }
  });

  $('#sd-modal-cancel').addEventListener('click', closeModal);
  $('#sd-modal-x').addEventListener('click', closeModal);
  el.backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!el.modal.hidden) { closeModal(); return; }
    if (!el.menu.hidden) { closeMenu(); return; }
    if (state.dropOpen) closeDrop();
  });

  /* =======================================================================
     PROTOTYPE CONTROLS
     ======================================================================= */
  $('#proto-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    $$('#proto-seg button').forEach(x => x.classList.toggle('active', x === b));
    state.dropMode = b.dataset.mode;
    renderCombo();
    if (state.dropOpen) renderDrop();
  });

  $('#proto-reset').addEventListener('click', () => {
    closeMenu();
    closeModal();
    closeDrop();
    state.picked.clear();
    state.selected.clear();
    state.docs = [];
    state.seq = 0;
    state.favs = new Set(TEMPLATES.filter(t => t.fav).map(t => t.id));
    el.generate.classList.remove('is-busy');
    el.genLabel.textContent = 'Generate';
    el.docs.hidden = true;
    el.empty.hidden = false;
    renderRows();
    renderCombo();
    toast('Prototype reset to the initial state.', 'info');
  });

  /* ----------------------------- boot ----------------------------------- */
  renderCombo();
  renderRows();
})();
