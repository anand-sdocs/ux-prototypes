// Guided walkthrough: a scenario picker in a bar across the top and a step-by-step guide in the canvas corner.
// Each step says what to do; the guide notices when it's done and moves on. "Show me" does it for you.
// Same pattern as the Repeating Section and LWC 2.0 prototypes. Drives app.js through the api it passes in.
export function startTour(A) {
  const $ = (s) => document.querySelector(s);
  const st = A.st;
  const label = (input) => (input ? input.closest('label') || input : null);
  const field = (path) => $(`[data-field="${path}"]`) || $('[data-sd-open="fields"]');
  const pick = (sel, fallback) => () => $(sel) || (fallback && fallback());

  const SCENARIOS = [
    {
      key: 'upload',
      label: '1 · Upload a PowerPoint as the base',
      hint: 'Priya starts a template from the proposal deck her team already uses.',
      setup: () => A.resetToUpload(),
      steps: [
        {
          title: 'Meet Priya',
          body: `Priya Shah runs Sales Operations at Halcyon. Her team's best proposal is a PowerPoint deck that reps copy and edit by hand for every deal.<br><br>She wants S-Docs to fill it in from the <b>Opportunity</b> instead, so she starts a new <b>PowerPoint template</b>.`,
          action: 'Click <b>Next</b>.',
        },
        {
          title: 'Upload the deck',
          body: `The template starts from the team's own .pptx. Nothing is converted or rebuilt: the file stays exactly as designed, and S-Docs adds merge fields and rules on top of it.`,
          action: 'Click <b>Use the sample proposal</b>. (With a real deck you would click <b>Choose a .pptx</b>.)',
          target: () => $('#ptd-sample'),
          done: () => A.loaded(),
          show: () => A.loadSample(),
        },
        {
          title: 'The slides, as designed',
          body: `The slides are drawn in the browser from the file itself: its theme, fonts, pictures and charts. The strip on the left lists every slide.`,
          action: 'Click slide <b>2</b> in the strip.',
          target: () => $('[data-slide="1"]'),
          done: () => A.loaded() && st.cur === 1,
          show: () => A.goSlide(1),
        },
        {
          title: 'Every shape can be selected',
          body: `Hover over the slide to see its shapes. Selecting one shows what can be done with it on the right: text gets merge fields, pictures can come from a field, tables from a related list.`,
          action: 'Click the <b>$412,500</b> box.',
          target: () => A.hot('Stat value 1'),
          done: () => A.selected() === 'Stat value 1',
          show: () => A.selectByName('Stat value 1'),
          stay: true,
        },
        {
          title: 'That’s the base',
          body: `The deck is now the base of the template, unchanged. Next, Priya replaces Kestrel Logistics' values with merge fields.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'fields',
      label: '2 · Add merge fields',
      hint: 'Priya replaces the values the deck was written with by fields from the Opportunity.',
      setup: async () => { await A.loadSample(); A.goSlide(1); },
      steps: [
        {
          title: 'Replace a whole value',
          body: `The amount on this slide was typed in for Kestrel Logistics. Click a text box, then a field, and the field replaces all of its text, keeping its font, size and colour.`,
          action: 'Click the <b>$412,500</b> box, open <b>Fields</b> on the far left, and click <b>Amount</b>.',
          target: () => (A.selected() === 'Stat value 1' ? field('Opportunity.Amount') : A.hot('Stat value 1')),
          done: () => A.textHas(1, 'Stat value 1', '{{Opportunity.Amount'),
          show: () => A.replaceIn(1, 'Stat value 1', null, 'Opportunity.Amount'),
        },
        {
          title: 'Replace just some words',
          body: `In the paragraph under the cards, only the company name should change. Select words on the slide (or in the text on the right), then click a field: only the selection is replaced.`,
          action: 'Click the paragraph, select <b>Kestrel Logistics</b>, then click <b>Account name</b>.',
          target: () => (A.selected() === 'Summary' ? field('Opportunity.Account.Name') : A.hot('Summary')),
          done: () => A.textHas(1, 'Summary', '{{Opportunity.Account.Name}} runs'),
          show: () => A.replaceIn(1, 'Summary', 'Kestrel Logistics', 'Opportunity.Account.Name'),
        },
        {
          title: 'One more',
          body: `On the slide, a field shows as a chip with its name. A name too long for its box ends in “…”; hover over it for the full name.`,
          action: 'In the last line, select <b>Dana Whitfield</b> and click <b>Owner name</b>.',
          target: () => (A.selected() === 'Owner note' ? field('Opportunity.Owner.Name') : A.hot('Owner note')),
          done: () => A.textHas(1, 'Owner note', '{{Opportunity.Owner.Name}}'),
          show: () => A.replaceIn(1, 'Owner note', 'Dana Whitfield', 'Opportunity.Owner.Name'),
        },
        {
          title: 'Fields live in the file',
          body: `Merge fields are typed into the .pptx's own text, so the template can go back to PowerPoint for design changes and keep them. Everything else is saved beside it as JSON. Both update as you work.<br><br>Made a mistake? Undo and redo are next to <b>Preview</b>, or press ⌘Z.`,
          action: 'Click <b>Template JSON</b> in the top bar.',
          target: () => $('#ptd-json-open'),
          done: () => A.jsonOpen(),
          show: () => A.openJson(),
          stay: true,
        },
      ],
    },
    {
      key: 'related',
      label: '3 · Add a related list to an empty slide',
      hint: 'Priya adds the Opportunity’s line items as a table on the Investment summary slide.',
      setup: async () => { await A.loadSample(); A.goSlide(0); },
      steps: [
        {
          title: 'An empty slide',
          body: `The <b>Investment summary</b> slide has a title and a note, but no table: the products are different on every deal.`,
          action: 'Click slide <b>3</b> in the strip.',
          target: () => $('[data-slide="2"]'),
          done: () => st.cur === 2,
          show: () => A.goSlide(2),
        },
        {
          title: 'Add the line items',
          body: `A related list goes on a slide as a real PowerPoint table: a heading row, then one row per record. It stays editable in PowerPoint.`,
          action: 'Open <b>Related lists</b> on the far left, then click <b>Opportunity line items</b> (or drag it onto the slide).',
          target: () => $('[data-insert-list="OpportunityLineItems"]') || $('[data-sd-open="related"]'),
          done: () => !!A.table(2),
          show: () => { A.goSlide(2); A.insertList('OpportunityLineItems'); },
        },
        {
          title: 'Add a column',
          body: `The table starts with four columns. On the right you can rename their headings, reorder them, remove them, or add more.`,
          action: 'Under <b>Columns</b>, pick <b>Discount</b> and click <b>Add column</b>.',
          target: () => [$('#p-coladd'), $('#p-coladd-btn')],
          done: () => A.tableColumns(2).includes('Discount'),
          show: () => A.addColumn('Discount'),
        },
        {
          title: 'Biggest items first',
          body: `<b>Which records</b> decides what the table shows: a filter, a sort order and a limit.`,
          action: 'Set <b>Sort by</b> to <b>Total price</b>, then choose <b>Descending</b>.',
          target: () => [$('#p-tsort'), $('#p-tdir')],
          done: () => { const t = A.table(2); return !!t && !!t.cfg.sort && t.cfg.sort.field === 'TotalPrice' && t.cfg.sort.dir === 'desc'; },
          show: () => A.setTable({ sort: { field: 'TotalPrice', dir: 'desc' } }),
        },
        {
          title: 'Long lists',
          body: `A slide only fits so many rows. Past the limit, the table continues on a copy of the slide, with its heading repeated.`,
          action: 'Under <b>Layout</b>, set <b>Rows per slide</b> to <b>6</b>.',
          target: () => $('#p-tmax'),
          done: () => { const t = A.table(2); return !!t && t.cfg.maxRows === 6; },
          show: () => A.setTable({ maxRows: 6 }),
        },
        {
          title: 'Done',
          body: `Kestrel has 5 line items, so they fit on one slide. Meridian Freight has 9, so in Preview this slide becomes two. With no line items, <b>If there are no records</b> decides: keep the heading, hide the table, or leave out the slide.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'repeat',
      label: '4 · Add a repeating slide',
      hint: 'Priya turns the one-product slide into one slide per line item.',
      setup: async () => { await A.loadSample(); A.goSlide(0); },
      steps: [
        {
          title: 'A slide about one product',
          body: `Slide 5 describes <b>Fleet Tracker</b>, one of Kestrel's line items. Priya wants one slide like it for every line item on the deal.`,
          action: 'Click slide <b>5</b> in the strip.',
          target: () => $('[data-slide="4"]'),
          done: () => st.cur === 4,
          show: () => A.goSlide(4),
        },
        {
          title: 'Turn on Repeat',
          body: `With no shape selected, the right panel shows the slide's own settings.`,
          action: 'Under <b>Repeat</b>, click <b>Repeat</b>.',
          target: () => label($('input[name="p-rpt"][value="yes"]')),
          done: () => st.repeatPending === (st.slides[4] || {}).sldId || !!A.slide(4).repeat,
          show: () => A.repeatOn(),
        },
        {
          title: 'Choose the related list',
          body: `Nothing repeats until a list is chosen.`,
          action: 'In <b>For each</b>, choose <b>Line item</b>.',
          target: () => $('#p-repeat'),
          done: () => (A.slide(4).repeat || {}).source === 'OpportunityLineItems',
          show: () => A.setRepeat('OpportunityLineItems'),
        },
        {
          title: 'Line item fields',
          body: `<b>Line item fields</b> are now at the top of Fields, above the Opportunity's. Each copy of the slide fills them from its own line item.`,
          action: 'Click the title (<b>Fleet Tracker</b>), then <b>Product</b> under Line item fields.',
          target: () => (A.selected() === 'Title' ? field('LineItem.Product2.Name') : A.hot('Title')),
          done: () => A.textHas(4, 'Title', '{{LineItem.Product2.Name}}'),
          show: () => A.replaceIn(4, 'Title', null, 'LineItem.Product2.Name'),
        },
        {
          title: 'Keep the labels',
          body: `Only the number after “Quantity” should change.`,
          action: 'Click the figures box, select <b>1,200</b>, then click <b>Quantity</b>.',
          target: () => (A.selected() === 'Product figures' ? field('LineItem.Quantity') : A.hot('Product figures')),
          done: () => A.textHas(4, 'Product figures', 'Quantity  {{LineItem.Quantity}}'),
          show: () => A.replaceIn(4, 'Product figures', '1,200', 'LineItem.Quantity'),
        },
        {
          title: 'The picture',
          body: `Pictures can come from an image field. The frame stays where it is; the picture is fitted or cropped to it.`,
          action: 'Click the picture, then in <b>Picture comes from</b> choose <b>Product image (line item)</b>.',
          target: () => (A.selected() === 'Product image' ? $('#p-img') : A.hot('Product image')),
          done: () => (A.shape(4, 'Product image').image || {}).field === 'LineItem.Product2.Image__c',
          show: () => A.setShapeCfg('Product image', { image: { field: 'LineItem.Product2.Image__c', fit: 'cover' } }),
        },
        {
          title: 'Done',
          body: `Kestrel has 5 line items, so this slide becomes 5 slides. With none, it's left out.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'slidecond',
      label: '5 · Show a whole slide only when…',
      hint: 'The multi-year terms slide should only appear on multi-year deals.',
      setup: async () => { await A.loadSample(); A.goSlide(0); },
      steps: [
        {
          title: 'A slide for some deals',
          body: `Slide 6 describes multi-year terms. On a one-year deal it shouldn't appear at all.`,
          action: 'Click slide <b>6</b> in the strip.',
          target: () => $('[data-slide="5"]'),
          done: () => st.cur === 5,
          show: () => A.goSlide(5),
        },
        {
          title: 'Only when…',
          body: `With no shape selected, <b>Visibility</b> on the right applies to the whole slide.`,
          action: 'Under <b>Visibility</b>, click <b>Only when…</b>, and check it reads <b>Term (years)</b> · <b>is greater than</b> · <b>1</b>.',
          target: () => $('#sc-show') || $('#sc-cf'),
          done: () => { const c = A.slide(5).showIf; return !!c && c.field === 'Opportunity.Term_Years__c' && c.op === 'gt' && +c.value === 1; },
          show: () => A.setSlideCfg({ showIf: { field: 'Opportunity.Term_Years__c', op: 'gt', value: 1 } }),
        },
        {
          title: 'What it does',
          body: `When the rule is false for a record, generation leaves this slide out of the PowerPoint completely: it isn't hidden, it isn't there. The strip marks it <b>Conditional</b>.<br><br>Orchard Fresh Foods has a one-year term, so its proposal will have no slide 6.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'elemcond',
      label: '6 · Show one element only when…',
      hint: 'The customer logo should only appear when the account has one on file.',
      setup: async () => { await A.loadSample(); A.goSlide(0); A.setShapeCfg('Customer logo', { image: { field: 'Opportunity.Account.Logo__c', fit: 'contain' } }); A.deselect(); },
      steps: [
        {
          title: 'The customer logo',
          body: `On the title slide, the grey <b>LOGO</b> box already takes its picture from the Account's logo. But some accounts have no logo on file, and then the grey placeholder would show.`,
          action: 'Click the <b>LOGO</b> picture.',
          target: () => A.hot('Customer logo'),
          done: () => A.selected() === 'Customer logo',
          show: () => A.selectByName('Customer logo'),
        },
        {
          title: 'Only when there is a logo',
          body: `Any shape can have a condition. The rule can test the record's fields, including image fields.`,
          action: 'Under <b>Visibility</b>, click <b>Only when…</b>, then set <b>Account logo</b> · <b>is not blank</b>.',
          target: () => [$('#shc-show'), $('#shc-cf'), $('#shc-co')].filter(Boolean),
          done: () => { const c = A.shape(0, 'Customer logo').showIf; return !!c && c.field === 'Opportunity.Account.Logo__c' && c.op === 'notblank'; },
          show: () => A.setShapeCfg('Customer logo', { showIf: { field: 'Opportunity.Account.Logo__c', op: 'notblank' } }),
        },
        {
          title: 'What it does',
          body: `When the rule is false, generation removes the picture from that slide. Slides have no automatic layout, so nothing moves up to fill the space: conditions work best on self-contained pieces like a logo, a badge or a callout.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'preview',
      label: '7 · Preview the finished template',
      hint: 'Everything from scenarios 2 to 6, checked against three sample Opportunities.',
      setup: () => A.loadExample(),
      steps: [
        {
          title: 'The finished template',
          body: `This is Priya's finished template: merge fields, the line-items table, the repeating product slide, the conditional slide and logo, and a chart fed from the line items.`,
          action: 'Click <b>Preview</b>.',
          target: () => $('#ptd-preview'),
          done: () => st.mode === 'preview',
          show: () => A.setMode('preview'),
        },
        {
          title: 'A big deal',
          body: `Preview shows how the template expands for one sample record. It's read-only.`,
          action: 'Pick <b>Meridian Freight</b> as the sample record.',
          target: () => $('#ptd-record'),
          done: () => st.mode === 'preview' && st.recordIdx === 2 && !!st.preview && st.preview.record.id === 'meridian',
          show: () => A.setRecord(2),
          stay: true,
          after: '9 line items: the investment table runs onto a second slide, and the product slide becomes nine.',
        },
        {
          title: 'A small deal',
          body: `Meridian's 7 template slides became 16.`,
          action: 'Now pick <b>Orchard Fresh Foods</b>.',
          target: () => $('#ptd-record'),
          done: () => st.mode === 'preview' && st.recordIdx === 1 && !!st.preview && st.preview.record.id === 'orchard',
          show: () => A.setRecord(1),
          stay: true,
        },
        {
          title: 'End of the walkthrough',
          body: `Orchard has a one-year term and no logo, so the multi-year slide is gone and there's no placeholder logo.<br><br>Preview only shows how the template expands. Documents are generated from records later, in the generation flow.`,
          action: 'Pick any scenario above to go again.',
        },
      ],
    },
  ];

  // ---------------------------------------------------------------- scenario bar
  document.body.classList.add('has-tour');
  const bar = document.createElement('div');
  bar.className = 'proto-toolbar';
  bar.innerHTML = `
    <span class="proto-toolbar-badge">Prototype</span>
    <label for="scenario-select">Scenario</label>
    <span class="sd-field__control proto-toolbar-select"><select id="scenario-select">${SCENARIOS.map((s) => `<option value="${s.key}">${s.label}</option>`).join('')}</select><span class="sd-field__affix sd-field__affix--chevron"><svg class="sd-icon" aria-hidden="true"><use href="#chevron-down"></use></svg></span></span>
    <span class="proto-toolbar-hint" id="scenario-hint"></span>
    <button class="sd-button sd-button--md sd-button--secondary" type="button" id="tour-restart">Restart</button>`;
  document.body.prepend(bar);

  // ---------------------------------------------------------------- guide widget
  const w = document.createElement('section');
  w.className = 'tour-guide';
  w.setAttribute('aria-label', 'Guided walkthrough');
  w.innerHTML = `
    <div class="tour-guide__head" id="tour-head">
      <span class="tour-guide__badge">Guided walkthrough <span id="tour-count"></span></span>
      <button class="tour-guide__min" type="button" id="tour-min" aria-label="Minimise or expand the guide" aria-expanded="true"><svg class="sd-icon" aria-hidden="true"><use href="#chevron-down"></use></svg></button>
    </div>
    <div class="tour-guide__body">
      <div class="tour-guide__persona"><span class="tour-guide__avatar">PS</span><span>Priya Shah · Sales Ops</span></div>
      <h2 class="tour-guide__title" id="tour-title"></h2>
      <div class="tour-guide__desc" id="tour-desc"></div>
      <div class="tour-guide__action" id="tour-action" aria-live="polite"></div>
      <div class="tour-guide__foot">
        <div class="tour-guide__dots" id="tour-dots"></div>
        <div class="tour-guide__nav">
          <button class="sd-button sd-button--md sd-button--tertiary" type="button" id="tour-show">Show me</button>
          <button class="sd-button sd-button--md sd-button--secondary" type="button" id="tour-prev">Back</button>
          <button class="sd-button sd-button--md" type="button" id="tour-next">Next</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(w);

  let scenario = SCENARIOS[0], step = 0, wasDone = false, advanceTimer = null, pulsed = [], busy = false;
  const cur = () => scenario.steps[step];
  const nextScenario = () => SCENARIOS[SCENARIOS.indexOf(scenario) + 1];

  async function startScenario(key) {
    scenario = SCENARIOS.find((s) => s.key === key) || SCENARIOS[0];
    $('#scenario-select').value = scenario.key;
    $('#scenario-hint').textContent = scenario.hint;
    const u = new URL(location.href);
    u.search = '';
    u.searchParams.set('scenario', scenario.key);
    history.replaceState(null, '', u);
    w.classList.remove('is-min');
    A.closeJson();
    busy = true;
    try { if (scenario.setup) await scenario.setup(); } finally { busy = false; }
    goTo(0);
  }

  function goTo(i) {
    clearTimeout(advanceTimer);
    step = Math.max(0, Math.min(scenario.steps.length - 1, i));
    wasDone = isDone();
    render();
  }
  function isDone() { const s = cur(); try { return !!(s.done && s.done()); } catch (e) { return false; } }

  function render() {
    const s = cur(), n = scenario.steps.length, done = isDone(), last = step === n - 1;
    $('#tour-count').textContent = `${step + 1}/${n}`;
    $('#tour-title').textContent = `Step ${step + 1}: ${s.title}`;
    $('#tour-desc').innerHTML = s.body;
    const a = $('#tour-action');
    a.innerHTML = `<span class="tour-guide__ico" aria-hidden="true">${done && s.done ? '✓' : '→'}</span><span>${done && s.done ? (s.after || (s.stay ? 'Done. Have a look, then click <b>Next</b>.' : 'Done.')) : s.action}</span>`;
    a.classList.toggle('is-done', done && !!s.done);
    $('#tour-dots').innerHTML = scenario.steps.map((_, j) => `<button type="button" class="tour-guide__dot${j === step ? ' is-active' : ''}${j < step ? ' is-past' : ''}" data-j="${j}" aria-label="Step ${j + 1}"></button>`).join('');
    $('#tour-prev').disabled = step === 0;
    $('#tour-show').hidden = !s.show || done;
    const nx = nextScenario();
    $('#tour-next').textContent = last ? (nx ? 'Next scenario →' : 'Start over') : 'Next';
  }

  /** Sit in the bottom-right corner of the canvas, clear of the panels on either side. */
  function place() {
    const c = document.querySelector('.ptd-canvas');
    const r = c && c.getBoundingClientRect();
    const inCanvas = r && r.width >= 400 && window.innerWidth >= 900;
    if (inCanvas) { w.style.right = `${Math.round(window.innerWidth - r.right + 16)}px`; w.style.left = 'auto'; }
    else { w.style.right = ''; w.style.left = ''; }
    // keep a band free under the slide for the guide, so it never covers what a step asks you to click
    const band = inCanvas ? `${w.offsetHeight + 16}px` : '0px';
    if (document.body.style.getPropertyValue('--tour-band') !== band) document.body.style.setProperty('--tour-band', band);
  }

  function tick() {
    if (busy) return;
    const s = cur();
    place();
    let targets = [];
    try { targets = (s.target ? [].concat(s.target()) : []).filter(Boolean); } catch (e) { targets = []; }
    pulsed.filter((el) => !targets.includes(el)).forEach((el) => el.classList.remove('tour-pulse'));
    targets.forEach((el) => el.classList.add('tour-pulse'));
    pulsed = targets;
    if (!s.done) return;
    const done = isDone();
    if (done !== wasDone) {
      render();
      if (done && !wasDone && !s.stay && step < scenario.steps.length - 1) {
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(() => { if (cur() === s && isDone()) goTo(step + 1); }, 1200);
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
  $('#tour-show').addEventListener('click', async () => { const s = cur(); if (s.show) await s.show(); setTimeout(tick, 60); });
  $('#tour-dots').addEventListener('click', (e) => { const d = e.target.closest('[data-j]'); if (d) goTo(Number(d.dataset.j)); });
  const toggleMin = () => { w.classList.toggle('is-min'); $('#tour-min').setAttribute('aria-expanded', String(!w.classList.contains('is-min'))); };
  $('#tour-min').addEventListener('click', toggleMin);
  $('#tour-head').addEventListener('dblclick', toggleMin);
  $('#scenario-select').addEventListener('change', (e) => startScenario(e.target.value));
  $('#tour-restart').addEventListener('click', () => startScenario(scenario.key));
  // keep clicks in the guide from taking focus or a text selection away from the page
  w.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

  const initial = new URL(location.href).searchParams.get('scenario');
  startScenario(SCENARIOS.some((s) => s.key === initial) ? initial : 'upload');
}
