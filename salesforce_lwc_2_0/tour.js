// Guided walkthrough: a scenario picker in the top bar and a step-by-step guide in the bottom right.
// Each step says what to do; the guide notices when it's done and moves on. "Show me" does it for you.
// Same pattern as the Repeating Section prototype. Drives admin.js through window.LWC2.
(() => {
  const A = window.LWC2;
  const S = () => A.state;
  const $ = (s, r = document) => r.querySelector(s);
  const ed = () => A.editCfg();
  const opp = () => S().configs.Opportunity || [];
  let seedKeys = new Set();
  const newCfg = () => opp().find((c) => !seedKeys.has(c.key));
  const newKey = () => (S().edit && S().edit.isNew ? S().edit.cfg.key : (newCfg() || {}).key);
  const modalTitle = () => A.modalTitle();
  const rec = () => A.pvState('rec');
  const row = (field, op, value) => ({ subject: 'record', field, op, vtype: 'literal', value });

  const PERSONA = {
    bizadmin: { initials: 'PS', name: 'Priya Shah · Business admin', color: '#8b6fe8' },
    sfadmin: { initials: 'MD', name: 'Marco Diaz · Salesforce admin', color: '#0176d3' },
    rep: { initials: 'SR', name: 'Sam Rivera · Sales rep', color: '#2e844a' },
    flow: { initials: 'MD', name: 'Marco Diaz · Salesforce admin', color: '#0176d3' },
  };

  // ---------------------------------------------------------------- scenarios
  const SCENARIOS = [
    {
      key: 'bizadmin',
      label: '1 · Business admin: set up a configuration',
      hint: 'Priya decides which templates and actions mid-market reps get on an Opportunity.',
      steps: [
        {
          title: 'Meet Priya',
          body: `Priya Shah runs Sales Operations. She decides which documents the sales team can create, but she isn't a Salesforce admin and can't edit Lightning pages.<br><br>Her <b>S-Docs Configuration Manager</b> permission set gives her this <b>Document Configurations</b> tab, and nothing in Setup.<br><br>Her ask from sales leadership: mid-market reps need a proposal, an order form and an NDA they can send for signature.`,
          action: 'Click <b>Next</b>.',
        },
        {
          title: 'Configurations for Opportunity',
          body: `Each row is a configuration for <b>Opportunity</b>. S-Docs checks them <b>top to bottom</b> and uses the <b>first</b> one whose conditions match the record and the person viewing it.<br><br><b>Default</b> at the bottom catches everyone else. An object only shows on the left once it has a saved configuration.`,
          action: 'Look at the order, then click <b>Next</b>.',
          target: () => $('#ad-cfg-list'),
        },
        {
          title: 'Start a new configuration',
          body: `A configuration is three things: <b>when to show</b>, <b>which templates</b> and <b>which actions</b>.`,
          action: 'Click <b>New configuration</b>.',
          target: () => $('.ad-hactions [data-new]'),
          done: () => modalTitle() === 'New configuration' || !!(S().edit && S().edit.isNew),
          show: () => A.openNewConfig(),
        },
        {
          title: 'Name it and pick the object',
          body: `Every configuration belongs to one object. You can pick any object here; once you save, it appears in the left panel.`,
          action: 'Type <b>Mid-Market Deals</b>, keep <b>Opportunity</b>, and click <b>Continue</b>.',
          target: () => [$('#nc-name'), $('#ad-modal-foot [data-mb="1"]')],
          done: () => !!(S().edit && S().edit.isNew && S().view === 'edit'),
          show: () => A.createConfig('Mid-Market Deals'),
        },
        {
          title: 'When to show: deal size',
          body: `With no conditions, a configuration shows on every record for everyone. Conditions can test the Opportunity's fields, its parent records (like the Account), or the person viewing it: their profile, role, permission sets or groups.`,
          action: 'Click <b>Add a condition</b>, then set <b>Amount</b> · <b>is at least (≥)</b> · <b>25000</b>.',
          target: () => $('[data-c-add="cfg"]') || $('#ad-body .ad-crow'),
          done: () => !!ed() && ed().conditions.some((r) => r.field === 'Amount' && ['gte', 'gt'].includes(r.op) && +r.value > 0),
          show: () => A.setConditions([row('Amount', 'gte', '25000')]),
        },
        {
          title: 'Add an upper limit',
          body: `With two or more conditions you choose <b>all</b> or <b>any</b>. For anything more involved there's <b>advanced logic</b>, like <code>1 AND (2 OR 3)</code>.<br><br>The box under the conditions reads them back in plain words.`,
          action: 'Add a second condition: <b>Amount</b> · <b>is less than (&lt;)</b> · <b>100000</b>.',
          target: () => $('[data-c-add="cfg"]'),
          done: () => !!ed() && ed().conditions.some((r) => r.field === 'Amount' && ['lt', 'lte'].includes(r.op) && +r.value > 0),
          show: () => A.setConditions([row('Amount', 'gte', '25000'), row('Amount', 'lt', '100000')]),
        },
        {
          title: 'Choose the templates',
          body: `Templates show in the picker in this order. Use the arrows to reorder them.`,
          action: 'Click <b>Add templates</b> and pick <b>Proposal Template</b>, <b>Order Form</b> and <b>Non-Disclosure Agreement (NDA)</b>.',
          target: () => (modalTitle().startsWith('Add') ? $('#ad-modal-foot [data-mb="1"]') : $('[data-add-tpl]')),
          done: () => !!ed() && ed().templates.length >= 2 && !modalTitle(),
          show: () => { A.addTemplates(['t3', 't9', 't4']); },
        },
        {
          title: 'Choose the actions',
          body: `One list. Actions that work on several documents at once (Download, Email, Request signature, Refresh, Delete) also show on the toolbar; the rest show on each document.`,
          action: 'Tick <b>Email</b> and <b>Request signature</b>.',
          target: () => [$('[data-sa="email"]')?.closest('.ad-acard'), $('[data-sa="sign"]')?.closest('.ad-acard')],
          done: () => !!ed() && ed().actions.email.on && ed().actions.sign.on,
          show: () => A.setActions(['email', 'sign']),
        },
        {
          title: 'Try it in the preview',
          body: `The preview on the right is the real component, built from what you've chosen so far. The event log under it shows what the component tells the page.`,
          action: 'Tick a template in the preview, then click <b>Generate</b>.',
          target: () => $('#ad-preview [data-pv-gen]'),
          done: () => (S().genCount.ed || 0) > 0,
          show: () => { const c = ed(); if (c && c.templates[0]) A.pick('ed', [c.templates[0].key]); setTimeout(() => A.generate('ed'), 150); },
        },
        {
          title: 'Activate it',
          body: `Activating makes it live straight away. No page edit, no deploy.`,
          action: 'Click <b>Activate</b> in the top right.',
          target: () => $('[data-save="Active"]'),
          done: () => !!newCfg() && newCfg().status === 'Active' && S().view === 'list',
          show: () => A.save('Active'),
        },
        {
          title: 'Where did it land?',
          body: `A new configuration goes just above the <b>Default</b>, which puts Mid-Market Deals at <b>#6</b>, below <b>Sales — Standard</b>.<br><br>Let's check who actually gets it.`,
          action: 'Click <b>Test a record</b>.',
          target: () => $('.ad-hactions [data-go-test]'),
          done: () => S().view === 'test',
          show: () => A.goTest(0, 'u1'),
        },
        {
          title: 'Test: Sam on Initech',
          body: `<b>Initech – Partner Resale</b> is $45,000, right in the mid-market range.<br><br>Look at the result: <b>Sales — Standard</b> wins at #5. Sam is in the Sales_Team group and that configuration is checked first, so Mid-Market Deals is <b>never reached</b> for Sam.`,
          action: 'Pick <b>Initech – Partner Resale</b> and <b>Sam Rivera</b>.',
          target: () => [$('#tf-rec'), $('#tf-user')],
          stay: true,
          done: () => S().view === 'test' && S().test.rec === 3 && S().test.user === 'u2',
          show: () => A.goTest(3, 'u2'),
        },
        {
          title: 'Fix the order',
          body: `More specific configurations go higher. Mid-Market Deals is narrower than Sales — Standard, so it belongs above it.`,
          action: 'Go back to the list and drag <b>Mid-Market Deals</b> above <b>Sales — Standard</b> (or use <b>•••</b> › <b>Move up</b>).',
          target: () => (S().view === 'list' ? $(`.ad-cfg[data-cfg="${(newCfg() || {}).id}"]`) : $('.ad-hactions [data-back]')),
          done: () => { const k = newKey(); return !!k && A.indexOf(k) >= 0 && A.indexOf(k) < A.indexOf('sales_standard'); },
          show: () => A.moveAbove(newKey(), 'sales_standard'),
        },
        {
          title: 'Test again',
          body: `Same record, same person, new order.`,
          action: 'Click <b>Test a record</b> and pick <b>Initech</b> and <b>Sam Rivera</b> again.',
          target: () => (S().view === 'test' ? [$('#tf-rec'), $('#tf-user')] : $('.ad-hactions [data-go-test]')),
          done: () => S().view === 'test' && S().test.rec === 3 && S().test.user === 'u2' && (A.testWinner() || {}).key === newKey(),
          show: () => A.goTest(3, 'u2'),
        },
        {
          title: 'Troubleshoot with Builder details',
          body: `When a rep says "I don't see the order form", Priya can see what the component sees. <b>Builder details</b> is a switch on this page. It's <b>just for her</b>, and only people with S-Docs Configuration Manager can turn it on, so reps never see diagnostics.<br><br>There's no Mode to set in App Builder: this is the business admin's switch.`,
          action: 'Go back to the list and turn on <b>Builder details</b> at the top of the page.',
          target: () => (S().view === 'list' ? $('[data-bd-toggle]')?.closest('.ad-bd-toggle') : $('.ad-hactions [data-back]')),
          done: () => S().builderDetails,
          show: () => { A.goList(); A.setBuilderDetails(true); },
        },
        {
          title: 'See it on a record',
          body: `Under the S-Docs card Priya now sees which configuration was used, why the ones above it were skipped, and each condition with its real value. Sam opening the same record sees only the card.`,
          action: 'Click <b>Open a record</b> next to the switch.',
          target: () => $('[data-open-record]'),
          stay: true,
          done: () => S().view === 'record' && S().recv.user === 'u5',
          show: () => A.openRecordAs('u5', 3),
        },
        {
          title: 'That\'s Priya\'s part',
          body: `Conditions → templates → actions → preview → activate → test → reorder → troubleshoot.<br><br>Priya never touched a page layout. Next: Marco, the Salesforce admin, puts the component on the Opportunity page once and gives it a title. That's all he does.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'sfadmin',
      label: '2 · Salesforce admin: add it to the record page',
      hint: 'Marco adds S-Docs Documents to the Opportunity Record Page in Lightning App Builder.',
      steps: [
        {
          title: 'Meet Marco',
          body: `Marco Diaz is the Salesforce admin and owns the Opportunity record page. He adds the S-Docs component <b>once</b> and gives it a title. Priya's configurations decide everything else, so he isn't asked to change the page every time sales wants a new document.<br><br>This is the <b>Opportunity Record Page</b> in Lightning App Builder, with an empty slot in the right column.`,
          action: 'Click <b>Next</b>.',
        },
        {
          title: 'Find the component',
          body: `S-Docs ships one component for record pages: <b>S-Docs Documents</b>. It's the template picker and the documents list together; today those are two components.`,
          action: 'Type <b>S-Docs</b> in the Components search.',
          target: () => $('[data-lab-search]'),
          done: () => /s-?docs/i.test(S().lab.q) || S().lab.placed,
          show: () => A.labSet('q', 'S-Docs'),
        },
        {
          title: 'Add it to the page',
          body: `Drop it where reps will look for it, usually the right column.`,
          action: 'Drag <b>S-Docs Documents</b> into the empty slot in the right column, or click it.',
          target: () => [$('[data-lab-comp]'), $('[data-lab-drop]')],
          done: () => S().lab.placed,
          show: () => A.labPlace(),
        },
        {
          title: 'One property: Title',
          body: `That's the only setting. The component always uses the <b>first matching configuration</b> in Priya's priority order, so there's nothing for Marco to choose. Today's two components have around 18 properties between them; switch the prototype strip to <b>Today</b> to compare.`,
          action: 'Change <b>Title</b> to <b>Documents</b>.',
          target: () => $('#lab-title'),
          done: () => S().lab.title.trim() !== '' && S().lab.title !== 'S-Docs',
          show: () => A.labSet('title', 'Documents'),
        },
        {
          title: 'Preview as a rep',
          body: `The prototype strip above the canvas stands in for "who is looking at which record". The note under the card says which configuration applies.<br><br>For Sam on Initech it's <b>Mid-Market Deals</b>. Switch to Anand on PseudoCo and the same component shows <b>Enterprise Sales</b>, with no change to the page.`,
          action: 'In the prototype strip, preview as <b>Sam Rivera</b> on <b>Initech – Partner Resale</b>.',
          target: () => [...document.querySelectorAll('.lab-proto select')],
          stay: true,
          done: () => S().lab.user === 'u2' && S().lab.rec === 3,
          show: () => { A.labSet('user', 'u2'); A.labSet('rec', 3); },
        },
        {
          title: 'Save',
          body: `This page is already the org default for Opportunity, so saving makes it live.`,
          action: 'Click <b>Save</b>.',
          target: () => $('[data-lab-save]'),
          done: () => S().lab.saved,
          show: () => A.labSave(),
        },
        {
          title: 'That\'s Marco\'s part',
          body: `One component, one property, set once. From now on Priya changes what reps get, and troubleshoots it, without Marco.<br><br>Next: Sam, a sales rep, uses it.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'rep',
      label: '3 · Sales rep: generate and send for signature',
      hint: 'Sam generates an order form and proposal on an Opportunity and sends them for e-signature.',
      steps: [
        {
          title: 'Meet Sam',
          body: `Sam Rivera is an Account Executive working <b>Initech – Partner Resale</b> ($45,000).<br><br>The <b>Documents</b> card on the right is the component Marco added. Sam never sees configurations, only what <b>Mid-Market Deals</b> allows: a proposal, an order form and an NDA, plus Preview, Download, Email and Request signature.`,
          action: 'Click <b>Next</b>.',
          target: () => $('#rec-side .sd-card'),
        },
        {
          title: 'Pick templates',
          body: `The picker lists only the templates Priya chose, in her order.`,
          action: 'Open the picker and tick <b>Proposal Template</b> and <b>Order Form</b>.',
          target: () => $('#rec-side .sd-combo'),
          done: () => !!rec() && rec().picked.size >= 2,
          show: () => A.pick('rec', ['proposal', 'order_form']),
        },
        {
          title: 'Generate',
          body: `Both documents are created from this Opportunity's data.`,
          action: 'Click <b>Generate</b>.',
          target: () => $('#rec-side [data-pv-gen]'),
          done: () => (S().genCount.rec || 0) > 0,
          show: () => { if (!rec() || !rec().picked.size) A.pick('rec', ['proposal', 'order_form']); setTimeout(() => A.generate('rec'), 120); },
        },
        {
          title: 'Request a signature',
          body: `Toolbar actions apply to the documents you just generated. You can also send a single document from its <b>•••</b> menu.`,
          action: 'Click <b>Signature</b> on the Documents toolbar.',
          target: () => $('#rec-side [data-pv-act="sign"]'),
          done: () => modalTitle() === 'Request signature' || (!!rec() && rec().docs.some((d) => d.sig)),
          show: () => A.openSign('rec'),
        },
        {
          title: 'Send it',
          body: `Signers come from the Opportunity's contacts. The message goes out with the documents.`,
          action: 'Choose the signer and click <b>Send for signature</b>.',
          target: () => $('#ad-modal-foot [data-mb="1"]'),
          done: () => !!rec() && rec().docs.some((d) => d.sig),
          show: () => { if (modalTitle() !== 'Request signature') A.openSign('rec'); setTimeout(() => A.sendSign(), 200); },
        },
        {
          title: 'The customer signs',
          body: `Both rows now say <b>Out for signature</b>. When Dana signs they flip to <b>Signed</b>, and the component fires <b>signaturecompleted</b> as a platform event that triggers, flows or other systems can react to.<br><br>The prototype has Dana sign after a few seconds.`,
          action: 'Wait a few seconds, or click <b>Show me</b>.',
          target: () => $('#rec-side .sd-docs'),
          stay: true,
          done: () => !!rec() && rec().docs.some((d) => d.sig === 'signed'),
          show: () => A.completeSignature('rec'),
        },
        {
          title: 'That\'s Sam\'s part',
          body: `Pick → generate → send → signed, without leaving the Opportunity.<br><br>The event panel under the card shows every lifecycle event the component fired: <b>configurationresolved</b>, <b>generationstarted</b>, <b>documentgenerated</b>, <b>signaturerequested</b>, <b>signaturecompleted</b>. A custom component embedding S-Docs can listen for the same events.<br><br>Bonus: the same component in a screen flow.`,
          action: 'Click <b>Next scenario</b>.',
        },
      ],
    },
    {
      key: 'flow',
      label: '4 · Bonus: use it in a screen flow',
      hint: 'Marco adds S-Docs Documents to a screen in Flow Builder, maps the record and stores the outputs.',
      steps: [
        {
          title: 'A screen flow',
          body: `Marco is building <b>Close the Deal Paperwork</b>, a screen flow launched from a button on Opportunity. The S-Docs component goes on its <b>Generate paperwork</b> screen, the same component as on the record page.`,
          action: 'Click <b>Next</b>.',
        },
        {
          title: 'Open the screen',
          body: `Screen elements hold the components a person sees while the flow runs.`,
          action: 'Click the <b>Generate paperwork</b> screen element.',
          target: () => $('[data-fb-open]'),
          done: () => S().flow.open || S().flow.added,
          show: () => A.flowOpen(),
        },
        {
          title: 'Add the component',
          body: `S-Docs Documents is listed under <b>Custom (Managed)</b>.`,
          action: 'Drag <b>S-Docs Documents</b> onto the screen, or click it.',
          target: () => [$('[data-fb-comp]'), $('[data-fb-drop]')],
          done: () => S().flow.added,
          show: () => A.flowAdd(),
        },
        {
          title: 'Pass the record',
          body: `On a record page the component gets the record automatically. In a flow it doesn't, so map the flow's <b>recordId</b> variable to <b>Record ID</b>.`,
          action: 'In <b>Record ID</b>, pick <b>{!recordId}</b>.',
          target: () => $('.fb-res-pick') || $('#fb-rid'),
          done: () => S().flow.recordId === '{!recordId}',
          show: () => A.flowSet('recordId', '{!recordId}'),
        },
        {
          title: 'Store the outputs',
          body: `The component hands values back to the flow, so later elements can use them: attach the documents to a case, branch on whether anything was generated, and so on.`,
          action: 'Set <b>Generated document IDs</b> to <b>{!docIds}</b> (and <b>Last lifecycle event</b> to <b>{!lastEvent}</b> if you like).',
          target: () => [$('#fb-od'), $('#fb-oe')],
          done: () => !!S().flow.outDocs,
          show: () => { A.flowSet('outDocs', '{!docIds}'); A.flowSet('outEvent', '{!lastEvent}'); },
        },
        {
          title: 'Close the screen',
          body: `Record ID is required, so <b>Done</b> won't close the screen until it's set.`,
          action: 'Click <b>Done</b>.',
          target: () => $('[data-fb-done]'),
          done: () => !S().flow.open && S().flow.added,
          show: () => A.flowDone(),
        },
        {
          title: 'Debug the flow',
          body: `Debug runs the flow for real. Here it runs as <b>Sam Rivera</b> on <b>Initech – Partner Resale</b>.`,
          action: 'Click <b>Debug</b>.',
          target: () => $('[data-fb-debug]'),
          done: () => S().flow.debug,
          show: () => A.flowDebug(),
        },
        {
          title: 'Generate inside the flow',
          body: `Same card as on the record page. The component picked <b>Mid-Market Deals</b> on its own, by priority, exactly as on the record page.`,
          action: 'Pick a template and click <b>Generate</b>.',
          target: () => $('#fb-run-card .sd-combo'),
          done: () => (S().genCount.flowrun || 0) > 0,
          show: () => { A.pick('flowrun', ['proposal', 'order_form']); setTimeout(() => A.generate('flowrun'), 120); },
        },
        {
          title: 'Finish the screen',
          body: `When the person clicks <b>Next</b>, the component's outputs are stored in the flow variables. Debug details show <b>{!docIds}</b> filled in.`,
          action: 'Click <b>Next</b> on the flow screen.',
          target: () => $('[data-fb-next]'),
          done: () => S().flow.runDone,
          show: () => A.flowNext(),
        },
        {
          title: 'End of the walkthrough',
          body: `Three people, one component:
            <ul>
              <li><b>Priya</b> decides what shows, for whom, in S-Docs.</li>
              <li><b>Marco</b> places the component once, on a page or in a flow, and gives it a title.</li>
              <li><b>Sam</b> just generates and sends.</li>
            </ul>
            Pick any scenario above to go again.`,
          action: 'Click <b>Start over</b>, or pick a scenario.',
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
      <button class="tour-close-btn" id="tour-min" title="Minimize or expand the guide" aria-label="Minimize or expand the guide">
        <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="tour-content">
      <div class="tour-persona" id="tour-persona"></div>
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

  function startScenario(key) {
    scenario = SCENARIOS.find((s) => s.key === key) || SCENARIOS[0];
    $('#scenario-select').value = scenario.key;
    $('#scenario-hint').textContent = scenario.hint;
    const u = new URL(location.href);
    u.searchParams.set('scenario', scenario.key);
    history.replaceState(null, '', u);
    A.loadScenario(scenario.key);
    seedKeys = new Set(opp().map((c) => c.key));
    w.classList.remove('minimized');
    goTo(0);
  }

  function goTo(i) {
    clearTimeout(advanceTimer);
    step = Math.max(0, Math.min(scenario.steps.length - 1, i));
    const s = cur();
    if (s.enter) s.enter();
    wasDone = !!(s.done && s.done());
    render();
  }

  function render() {
    const s = cur();
    const n = scenario.steps.length;
    const done = !!(s.done && s.done());
    const last = step === n - 1;
    const P = PERSONA[scenario.key];
    $('#tour-count').textContent = `${step + 1}/${n}`;
    $('#tour-persona').innerHTML = `<span class="pc-av">${P.initials}</span><span>${P.name}</span>`;
    $('#tour-persona .pc-av').style.background = P.color;
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

  function place() {
    // sit beside whatever side panel the current view has, not on top of it
    const st = S();
    let right = 20;
    // App Builder: bottom-left, over the end of the component list, so the canvas slot and properties stay clear
    // Flow Builder dialogs: bottom-left too, clear of the properties, debug log and the screen's Next button
    const left = (st.view === 'lab' || (st.view === 'flow' && (st.flow.open || st.flow.debug))) && window.innerWidth >= 900;
    w.style.left = left ? '16px' : '';
    if (window.innerWidth < 900) right = 16;
    w.style.right = left ? 'auto' : `${right}px`;
  }

  function tick() {
    const s = cur();
    place();
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
  $('#tour-show').addEventListener('click', () => { const s = cur(); if (s.show) s.show(); setTimeout(tick, 50); });
  $('#tour-dots').addEventListener('click', (e) => { const d = e.target.closest('[data-j]'); if (d) goTo(Number(d.dataset.j)); });
  $('#tour-min').addEventListener('click', () => w.classList.toggle('minimized'));
  $('#tour-header').addEventListener('dblclick', () => w.classList.toggle('minimized'));
  $('#scenario-select').addEventListener('change', (e) => startScenario(e.target.value));
  $('#tour-restart').addEventListener('click', () => startScenario(scenario.key));
  // keep clicks in the guide from closing menus or stealing focus in the page
  w.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  w.addEventListener('click', (e) => e.stopPropagation());

  const initial = new URL(location.href).searchParams.get('scenario');
  startScenario(SCENARIOS.some((s) => s.key === initial) ? initial : 'bizadmin');
})();
