// Guided walkthrough: a scenario picker in the top bar and a step-by-step guide in the bottom right.
// Each step says what to do; the guide notices when it's done and moves on. "Show me" does it for you.
(() => {
  const { state, doc } = window.RS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------------------------------------------------------------- helpers used by the steps
  const firstRs = () => doc.querySelector('.rs');
  const rsId = () => firstRs()?.dataset.rs;
  const rsCfg = () => state.sections[rsId()];
  const conds = () => $$('.rs .cond', doc);
  const slot = () => doc.querySelector('[data-slot="rs"]');
  const selectedCond = () => state.selected?.type === 'cond' && state.conds[state.selected.id];
  const live = (id) => state.mode === 'preview' && state.preview.source === 'live' && state.preview.recordId === id;
  const lastBodyBlock = () => { const b = firstRs()?.querySelector('.rs-body'); return b?.lastElementChild; };
  const ensureEdit = () => { if (state.mode !== 'edit') window.RS.setMode('edit'); };
  const ensureRsSelected = () => { ensureEdit(); if (rsId() && !(state.selected?.type === 'rs')) window.RS.select('rs', rsId()); };
  const panelEl = (sel) => $(sel, window.RS.panel);

  let legacyClicked = false;
  doc.addEventListener('click', (e) => { if (e.target.closest('.legacy-rl')) legacyClicked = true; });

  // ---------------------------------------------------------------- scenarios
  const SCENARIOS = [
    {
      key: 'today',
      label: '1 · Today: the current editor',
      variant: 'today',
      hint: 'How related lists work now, before Repeating Sections.',
      steps: [
        {
          title: 'Today\'s template editor',
          body: `This is the <b>Quote</b> template on <b>Deal</b>, the way the editor works now: text, headings, lists, a table, pink <b>Deal merge fields</b>, a <b>Related List</b> table and signer fields.<br><br>Nothing here is new yet. The next two scenarios add the Repeating Section to this same template.`,
          action: 'Look around, then click <b>Next</b>.',
        },
        {
          title: 'The Related List widget',
          body: `Under <b>Included Products</b> is the Related List widget. It takes one related list (here, line items) and renders <b>one table row per record</b>, or one list item in list mode.<br><br>You choose the columns, a filter and a sort. That's all you can put in it.`,
          action: 'Click the table under <b>Included Products</b>.',
          target: () => doc.querySelector('.legacy-rl'),
          stay: true,
          done: () => legacyClicked,
          show: () => { doc.querySelector('.legacy-rl').scrollIntoView({ block: 'center', behavior: 'smooth' }); doc.querySelector('.legacy-rl').click(); },
        },
        {
          title: 'What you can insert today',
          body: `The <b>+</b> menu has text, headings, lists, images, tables and page breaks. For related data, <b>Related Object</b> (the table you just clicked) is the only choice.`,
          action: 'Click <b>+</b> in the left rail to open the block menu.',
          target: () => [$('#rail-add'), $('#bh-add')],
          stay: true,
          done: () => !window.RS.insertMenu.hidden,
          show: () => window.RS.openInsertMenuAt(doc.lastElementChild),
        },
        {
          title: 'Preview with sample data',
          body: `Preview fills in the merge fields and the Related List rows. Sample data uses made-up values.`,
          action: 'Click <b>Preview</b> in the top right.',
          target: () => $('#btn-preview'),
          done: () => state.mode === 'preview',
          show: () => window.RS.setMode('preview'),
        },
        {
          title: 'Preview with a live record',
          body: `Live preview fetches a real record. <b>Globex</b> has 8 line items; they all come out as table rows with the same columns.`,
          action: 'Switch to <b>Live record</b> and pick <b>Globex</b>.',
          target: () => [$('#pv-source'), $('#pv-record')],
          stay: true,
          done: () => live('DL-00398'),
          show: () => { window.RS.setMode('preview'); window.RS.setPreviewSource('live', 'DL-00398'); },
        },
        {
          title: 'What\'s missing today',
          body: `Things authors ask for that a table can't do:
            <ul>
              <li>A heading, image and paragraph <b>per product</b>, not just a row.</li>
              <li>Text that shows only for <b>some</b> items, like a warranty note for hardware only. Block visibility rules only look at Deal fields.</li>
              <li>Fallback text when a line item field is empty.</li>
              <li>Different content for the first or last item.</li>
            </ul>
            Next: build a <b>Repeating Section</b> in this same template.`,
          action: 'Click <b>Next scenario</b>.',
          enter: () => {},
        },
      ],
    },
    {
      key: 'build',
      label: '2 · Build a Repeating Section',
      variant: 'build',
      hint: 'Same template. Add a Repeating Section step by step.',
      steps: [
        {
          title: 'Start from today\'s template',
          body: `Same Quote template as before, now with the new blocks switched on. Under <b>Product details</b> there's an empty line where we'll add a section that repeats for every line item.<br><br>The Related List table stays as it is. The Repeating Section is an extra option, not a replacement.`,
          action: 'Click <b>Next</b>.',
          enter: () => slot()?.scrollIntoView({ block: 'center' }),
        },
        {
          title: 'Open the block menu',
          body: `Blocks are inserted with the same <b>+</b> as today: from the left rail, or the <b>+</b> that appears when you hover a line.`,
          action: 'Click the empty line under <b>Product details</b>, then click <b>+</b>.',
          target: () => [slot(), $('#rail-add')],
          done: () => !window.RS.insertMenu.hidden || !!firstRs(),
          show: () => { window.RS.caretInto(slot()); window.RS.openInsertMenuAt(slot()); },
        },
        {
          title: 'Insert a Repeating Section',
          body: `<b>Repeating Section</b> sits next to Related Object under <b>Related data</b>.`,
          action: 'Choose <b>Repeating Section</b>.',
          target: () => $('.im-item[data-k="repeat"]'),
          done: () => !!firstRs(),
          show: () => { window.RS.closeInsertMenu(); window.RS.insertBlock('repeat', slot() || doc.lastElementChild); },
        },
        {
          title: 'Choose what to repeat over',
          body: `A new section is set up in the panel first. A record can have dozens of related lists, so the list is <b>searchable</b> and grouped into standard and custom objects.<br><br>Everything you put in the section repeats <b>once per record</b> in the list you pick.`,
          action: 'In the panel, search for <b>line</b> and pick <b>Line Items</b>.',
          enter: ensureRsSelected,
          target: () => panelEl('.rl-opt[data-list="line_items"]') || panelEl('.rl-search'),
          done: () => !!rsCfg()?.source,
          show: () => { ensureRsSelected(); window.RS.setSectionSource(rsId(), 'line_items'); },
        },
        {
          title: 'Narrow the records, then Apply',
          body: `Before any content goes in, you can set <b>Filter</b>, <b>Sort</b> and <b>Limit</b>, like the Related List today. The grey box shows how many records come through on sample data and on a real deal. Rules are combined with AND.<br><br><b>Apply</b> unlocks the section for editing. You can change all of this later.`,
          action: 'Add a filter (for example <b>Quantity &gt; 0</b>) if you like, then click <b>Apply</b>.',
          enter: ensureRsSelected,
          target: () => [panelEl('[data-act="add-filter"]'), panelEl('[data-act="setup-apply"]')],
          done: () => !!rsCfg() && !rsCfg().setup,
          show: () => {
            const c = rsCfg();
            c.filters = [{ scope: 'item', field: 'quantity', op: 'gt', value: '0' }];
            c.sort = { field: 'net_price', dir: 'desc' };
            window.RS.applySection(rsId());
          },
        },
        {
          title: 'Add merge fields',
          body: `Inside the section you can type anything and use the whole formatting toolbar. Type <kbd>@</kbd> to insert a field.<br><br><b>Blue</b> fields change for each line item. <b>Pink</b> fields come from the Deal and are the same in every repeat.`,
          action: 'Click inside the section and type <b>@</b>, then choose <b>Line Item.Name</b>. Or click a field in the panel.',
          enter: ensureRsSelected,
          target: () => [firstRs()?.querySelector('.rs-body'), panelEl('.field-list')],
          done: () => !!doc.querySelector('.rs .mf-item'),
          show: () => { ensureRsSelected(); window.RS.insertFieldFromPanel('item', 'name'); window.RS.insertFieldFromPanel('item', 'net_price'); },
        },
        {
          title: 'Format a field, and set a fallback',
          body: `Click any field to set its <b>format</b> (currency, date and so on) and what to show <b>if it's empty</b>, like "No description provided."`,
          action: 'Click a blue field in the section.',
          target: () => doc.querySelector('.rs .mf-item'),
          stay: true,
          done: () => !window.RS.fieldPop.hidden,
          show: () => { const ch = doc.querySelector('.rs .mf-item'); if (ch) window.RS.openFieldPop(ch); },
        },
        {
          title: 'Add a Conditional Block',
          body: `Inside a Repeating Section the <b>+</b> menu adds <b>Conditional Block</b>: content that shows only for items that match.`,
          action: 'Hover a line inside the section, click <b>+</b> and choose <b>Conditional Block</b>.',
          target: () => firstRs()?.querySelector('.rs-body'),
          done: () => conds().length > 0,
          show: () => { ensureEdit(); window.RS.insertBlock('cond', lastBodyBlock()); },
        },
        {
          title: 'Set the condition',
          body: `Conditions can use the <b>line item's</b> fields, the <b>Deal's</b> fields, or the item's <b>position</b> (first, last, odd, even).`,
          action: 'Set <b>Product type equals Hardware</b>, then type a sentence inside the block.',
          enter: () => { const c = conds()[0]; if (c && !selectedCond()) window.RS.select('cond', c.dataset.cond); },
          target: () => [panelEl('.r-val'), conds()[0]?.querySelector('.cond-body')],
          done: () => {
            const c = conds()[0]; const cc = c && state.conds[c.dataset.cond];
            return !!cc && cc.rules.some((r) => r.value !== '' || ['empty', 'notempty', 'true', 'false', 'first', 'last', 'notfirst', 'notlast', 'odd', 'even'].includes(r.op));
          },
          show: () => {
            const c = conds()[0]; if (!c) return;
            const id = c.dataset.cond;
            state.conds[id].rules = [{ scope: 'item', field: 'product_type', op: 'eq', value: 'Hardware' }];
            c.querySelector('.cond-body').innerHTML = '<p><i>Includes a 3-year hardware warranty with next-business-day replacement.</i></p>';
            window.RS.updateCondChrome(id);
            window.RS.select('cond', id);
            window.RS.renderPanel();
          },
        },
        {
          title: 'Preview with sample data',
          body: `Preview repeats the section for each record. The dashed outlines mark each repeat. Turn them off with <b>Outline repeated items</b>.`,
          action: 'Click <b>Preview</b>.',
          target: () => $('#btn-preview'),
          done: () => state.mode === 'preview',
          show: () => window.RS.setMode('preview'),
        },
        {
          title: 'Try a deal with no line items',
          body: `<b>Initech</b> has no line items. By default the section is hidden. In the section settings you can show a message instead.<br><br>Also try <b>Acme</b>: the warranty note shows only on hardware items.`,
          action: 'Switch to <b>Live record</b> and pick <b>Initech</b>.',
          stay: true,
          target: () => [$('#pv-source'), $('#pv-record')],
          done: () => live('DL-00377'),
          show: () => { window.RS.setMode('preview'); window.RS.setPreviewSource('live', 'DL-00377'); },
        },
        {
          title: 'That\'s the flow',
          body: `Insert → pick the related list → filter and sort → add content and fields → add conditional blocks → preview.<br><br>Next: a finished template that uses every option, including item position and empty-state messages.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'explore',
      label: '3 · Explore a finished template',
      variant: 'full',
      hint: 'A fully built Repeating Section with every option in use.',
      steps: [
        {
          title: 'A finished Repeating Section',
          body: `Under <b>Product details</b>, a section repeats for each line item: product name, image, description, SKU and pricing, plus three conditional blocks.<br><br>The header sums up the settings in one line.`,
          action: 'Click the section\'s blue header.',
          enter: () => firstRs()?.scrollIntoView({ block: 'start' }),
          target: () => firstRs()?.querySelector('.rs-head'),
          done: () => state.selected?.type === 'rs',
          show: () => ensureRsSelected(),
        },
        {
          title: 'Data settings',
          body: `Only items with <b>Quantity &gt; 0</b>, sorted by <b>Net price</b>, highest first. The grey box shows what that means for sample data and for Acme.`,
          action: 'Set <b>Limit</b> to 3 and watch the counts change.',
          enter: ensureRsSelected,
          target: () => panelEl('[data-k="limit"]'),
          done: () => !!rsCfg()?.limit,
          show: () => { ensureRsSelected(); rsCfg().limit = '3'; window.RS.updateSectionChrome(rsId()); window.RS.renderPanel(); },
        },
        {
          title: 'Layout between items',
          body: `<b>Between items</b> adds space or a page break between repeats (one product per page, for example). <b>Shading</b> fills every other item.`,
          action: 'Turn on <b>Shade every other item</b>, or pick another option under Between items.',
          enter: ensureRsSelected,
          target: () => [panelEl('[data-k="zebra"]')?.closest('label'), panelEl('[data-seg="separator"]')],
          done: () => { const c = rsCfg(); return !!c && (c.zebra || c.separator !== 'divider'); },
          show: () => { ensureRsSelected(); rsCfg().zebra = true; window.RS.updateSectionChrome(rsId()); window.RS.renderPanel(); },
        },
        {
          title: 'Fields and fallbacks',
          body: `<b>Description</b> has a fallback: if a line item has no description, the document says "No description provided." instead of leaving a gap. Fields with a fallback are marked with a dot.`,
          action: 'Click the <b>Description</b> field.',
          target: () => doc.querySelector('.rs .mf[data-field="description"]'),
          stay: true,
          done: () => !window.RS.fieldPop.hidden,
          show: () => { const ch = doc.querySelector('.rs .mf[data-field="description"]'); ch.scrollIntoView({ block: 'center' }); window.RS.openFieldPop(ch); },
        },
        {
          title: 'Conditional blocks',
          body: `The amber blocks show only for matching items: the warranty note for <b>Hardware</b>, and the renewal terms for <b>recurring</b> items.`,
          action: 'Click the <b>Show if</b> header of a conditional block.',
          target: () => conds()[0]?.querySelector('.cond-head'),
          done: () => !!selectedCond(),
          show: () => { const c = conds()[0]; c.scrollIntoView({ block: 'center' }); window.RS.select('cond', c.dataset.cond); },
        },
        {
          title: 'Item position',
          body: `The last block uses <b>Item position is last</b>, so the tax note appears once, after the final item. Position also handles "before the first item" and odd/even.`,
          action: 'Click the last conditional block\'s header.',
          target: () => conds().at(-1)?.querySelector('.cond-head'),
          done: () => state.selected?.type === 'cond' && state.selected.id === conds().at(-1)?.dataset.cond,
          show: () => { const c = conds().at(-1); c.scrollIntoView({ block: 'center' }); window.RS.select('cond', c.dataset.cond); },
        },
        {
          title: 'Preview with sample data',
          body: `Sample data has three line items, so you can see the repeat without picking a record.`,
          action: 'Click <b>Preview</b>.',
          target: () => $('#btn-preview'),
          done: () => state.mode === 'preview',
          show: () => window.RS.setMode('preview'),
        },
        {
          title: 'A deal with more items',
          body: `<b>Globex</b> has 8 line items. Items removed by the filter or the limit are listed in a note under the section, only in preview.`,
          action: 'Switch to <b>Live record</b> and pick <b>Globex</b>.',
          target: () => [$('#pv-source'), $('#pv-record')],
          done: () => live('DL-00398'),
          show: () => { window.RS.setMode('preview'); window.RS.setPreviewSource('live', 'DL-00398'); },
        },
        {
          title: 'The empty state',
          body: `This section is set to <b>show a message</b> when there are no items, so Initech's quote says so instead of skipping the heading.`,
          action: 'Pick <b>Initech</b>.',
          stay: true,
          target: () => $('#pv-record'),
          done: () => live('DL-00377'),
          show: () => { window.RS.setMode('preview'); window.RS.setPreviewSource('live', 'DL-00377'); },
        },
        {
          title: 'Guardrail: changing the source',
          body: `If you point the section at a different list, fields it doesn't have turn <b>red</b> but keep their names, and a banner offers to <b>switch back</b> or <b>remove them</b>. Filters that no longer apply are dropped, so nothing breaks silently.`,
          action: 'Click <b>Back to editor</b>, click the section header, click <b>Change</b> next to the source and pick <b>Contact Roles</b>.',
          target: () => state.mode === 'preview' ? $('#pv-exit') : (panelEl('.rl-opt[data-list="contact_roles"]') || panelEl('[data-act="rl-change"]') || firstRs()?.querySelector('.rs-head')),
          done: () => state.mode === 'edit' && !!doc.querySelector('.rs .mf-invalid'),
          show: () => { ensureEdit(); window.RS.setSectionSource(rsId(), 'contact_roles'); },
        },
        {
          title: 'End of the walkthrough',
          body: `You've seen today's editor, building a section from scratch, and every option on a finished one.<br><br>For the saved JSON and how this maps to the real Editor.js blocks, open the <a href="../repeating-section-editorjs/index.html">Editor.js version</a>.`,
          action: 'Pick any scenario above to go again.',
        },
      ],
    },
  ];

  // ---------------------------------------------------------------- scenario bar
  const bar = document.createElement('div');
  bar.className = 'proto-toolbar';
  bar.innerHTML = `
    <span class="proto-toolbar-badge">Prototype</span>
    <label for="scenario-select">Scenario:</label>
    <select id="scenario-select">${SCENARIOS.map((s) => `<option value="${s.key}">${s.label}</option>`).join('')}</select>
    <span class="proto-toolbar-hint" id="scenario-hint"></span>
    <button class="proto-toolbar-btn" id="tour-restart">Restart</button>`;
  document.body.prepend(bar);

  // ---------------------------------------------------------------- guide widget
  const w = document.createElement('div');
  w.className = 'tour-guide-widget';
  w.innerHTML = `
    <div class="tour-header" id="tour-header">
      <div class="tour-badge">
        <svg class="tour-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <span>Guided walkthrough</span><span class="tour-count" id="tour-count"></span>
      </div>
      <button class="tour-close-btn" id="tour-min" title="Minimize or expand the guide">
        <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="tour-content">
      <div class="tour-scenario" id="tour-scenario"></div>
      <h4 class="tour-step-title" id="tour-title"></h4>
      <div class="tour-step-desc" id="tour-desc"></div>
      <div class="tour-action" id="tour-action"></div>
      <div class="tour-footer">
        <div class="tour-progress" id="tour-dots"></div>
        <div class="tour-nav-buttons">
          <button class="tour-btn tour-btn-link" id="tour-show">Show me</button>
          <button class="tour-btn tour-btn-secondary" id="tour-prev">Back</button>
          <button class="tour-btn tour-btn-primary" id="tour-next">Next</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(w);

  let scenario = SCENARIOS[0];
  let step = 0;
  let wasDone = false;
  let advanceTimer = null;
  let pulsed = [];

  const cur = () => scenario.steps[step];
  const nextScenario = () => SCENARIOS[SCENARIOS.indexOf(scenario) + 1];

  function startScenario(key, { reload = true } = {}) {
    scenario = SCENARIOS.find((s) => s.key === key) || SCENARIOS[0];
    $('#scenario-select').value = scenario.key;
    $('#scenario-hint').textContent = scenario.hint;
    const u = new URL(location.href);
    u.searchParams.set('scenario', scenario.key);
    history.replaceState(null, '', u);
    if (reload) window.RS.loadScenario(scenario.variant);
    legacyClicked = false;
    w.classList.remove('minimized');
    goTo(0);
  }

  function goTo(i) {
    clearTimeout(advanceTimer);
    step = Math.max(0, Math.min(scenario.steps.length - 1, i));
    const s = cur();
    s.enter?.();
    wasDone = !!s.done?.();
    render();
  }

  function render() {
    const s = cur();
    const n = scenario.steps.length;
    const done = !!s.done?.();
    const last = step === n - 1;
    $('#tour-count').textContent = `${step + 1}/${n}`;
    $('#tour-scenario').textContent = scenario.label.replace(/^\d+ · /, '');
    $('#tour-title').textContent = `Step ${step + 1}: ${s.title}`;
    $('#tour-desc').innerHTML = s.body;
    const a = $('#tour-action');
    a.innerHTML = `<span class="tour-action-ico">${done ? '✓' : '→'}</span><span>${done && s.done ? (s.stay ? 'Done. Have a look, then click <b>Next</b>.' : 'Done.') : s.action}</span>`;
    a.classList.toggle('is-done', done && !!s.done);
    $('#tour-dots').innerHTML = scenario.steps.map((_, j) => `<span class="step-dot ${j === step ? 'active' : ''} ${j < step ? 'past' : ''}" data-j="${j}" title="Step ${j + 1}"></span>`).join('');
    $('#tour-prev').disabled = step === 0;
    $('#tour-show').hidden = !s.show || done;
    const nx = nextScenario();
    const nextBtn = $('#tour-next');
    nextBtn.textContent = last ? (nx ? 'Next scenario →' : 'Start over') : 'Next';
    nextBtn.classList.toggle('tour-btn-ready', done && !!s.done && !last);
  }

  function tick() {
    const s = cur();
    // sit beside the settings panel rather than on top of it
    const p = window.RS.panel;
    w.style.right = `${(p.hidden ? 0 : p.offsetWidth) + 20}px`;
    // keep the highlight on whatever the step points at (targets come and go as the user works)
    const targets = (s.target ? [].concat(s.target()) : []).filter(Boolean);
    pulsed.filter((el) => !targets.includes(el)).forEach((el) => el.classList.remove('tour-pulse'));
    targets.forEach((el) => el.classList.add('tour-pulse'));
    pulsed = targets;
    if (!s.done) return;
    const done = !!s.done();
    if (done !== wasDone) {
      render();
      // move on by itself only when the user just finished the step, not when they came back to it
      if (done && !wasDone && !s.stay && step < scenario.steps.length - 1) {
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(() => { if (cur() === s && s.done()) goTo(step + 1); }, 1200);
      }
      wasDone = done;
    }
  }
  setInterval(tick, 300);

  $('#tour-next').addEventListener('click', () => {
    if (step < scenario.steps.length - 1) return goTo(step + 1);
    const nx = nextScenario();
    startScenario(nx ? nx.key : SCENARIOS[0].key);
  });
  $('#tour-prev').addEventListener('click', () => goTo(step - 1));
  $('#tour-show').addEventListener('click', () => { cur().show?.(); tick(); });
  $('#tour-dots').addEventListener('click', (e) => { const d = e.target.closest('[data-j]'); if (d) goTo(Number(d.dataset.j)); });
  $('#tour-min').addEventListener('click', () => w.classList.toggle('minimized'));
  $('#tour-header').addEventListener('dblclick', () => w.classList.toggle('minimized'));
  $('#scenario-select').addEventListener('change', (e) => startScenario(e.target.value));
  $('#tour-restart').addEventListener('click', () => startScenario(scenario.key));
  // keep clicks in the guide from stealing the editor's selection
  w.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

  const initial = new URL(location.href).searchParams.get('scenario');
  startScenario(SCENARIOS.some((s) => s.key === initial) ? initial : 'today');
})();
