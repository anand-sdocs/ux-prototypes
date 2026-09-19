/* ==========================================================================
   Scenario wizard.
   The admin never sees SOQL, never sees a slot index, and never types a field
   API name. Conditions are built the way list-view filters are built, and the
   card is edited by clicking the card.
   ========================================================================== */

const STEPS = [
  { key:'name',    label:'Name it',         hint:'What to call it',        title:'Name this scenario',
    blurb:'A scenario is a saved answer to "which records should get which document".' },
  { key:'words',   label:'How people ask',  hint:'The words they use',     title:'How will people ask for this?',
    blurb:'The same records go by several names — open deals, the pipeline, deals in flight. List the ones your people actually say; that is what the assistant matches against.' },
  { key:'records', label:'Choose records',  hint:'Which ones to include',  title:'Which records should get documents?',
    blurb:'Pick the kind of record, then narrow it down. No formulas — choose from what your org already has.' },

  { key:'docs',    label:'Choose documents',hint:'What to generate',       title:'Which documents should they get?',
    blurb:'Every matching record gets one document per template you pick. Order is the order they generate in.' },
  { key:'card',    label:'Design the card', hint:'What people see',        title:'Design what people see',
    blurb:'This card appears before anything is generated, so people can check the list first.' },

  { key:'review',  label:'Review',          hint:'Check and activate',     title:'Review and activate',
    blurb:'Everything below is configuration. Activating takes effect immediately — nothing is deployed.' }
];

/* Operators offered per field type. Phrased as an admin would say them. */
const OPS = {
  text:     ['is','is not','contains','starts with'],
  email:    ['is','is not','contains'],
  picklist: ['is','is not'],
  currency: ['is','is greater than','is less than'],
  percent:  ['is','is greater than','is less than'],
  number:   ['is','is greater than','is less than'],
  boolean:  ['is true','is false'],
  date:     ['is within','is before','is after'],
  datetime: ['is within','is before','is after']
};
const opsFor = t => OPS[t] || OPS.text;
const needsValue = op => op !== 'is true' && op !== 'is false';

let wiz = { step: 0, s: null, popOpen: null };

/* ------------------------------------------------------------------ helpers */

const inputsOf  = sc => tplsOf(sc).flatMap(t => (t.inputs || []).map(i => ({ ...i, tpl: t.name })));
const reqInputs = sc => inputsOf(sc).filter(i => i.required);
const esignOf   = sc => tplsOf(sc).filter(t => t.esign);

const MODES = [
  { k:'bulk',   b:'All at once',       d:'One button generates for every matching record.' },
  { k:'record', b:'One record at a time', d:'Each row gets its own button. Useful when someone picks and chooses.' },
  { k:'both',   b:'Both',              d:'A button per row, and one to do the lot.' }
];

const winLabel = w => (ORG.windowLabels && ORG.windowLabels[w]) || windowWords(w);

/* Conditions -> SOQL. Generated, never typed. Shown only on request. */
function condsToSoql(sc) {
  return (sc.conditions || []).map(c => {
    const t = typeOf(sc.object, c.field);
    const quote = v => ['currency','percent','number','boolean'].includes(t) ? v : `'${v}'`;
    switch (c.op) {
      case 'is':              return `${c.field} = ${quote(c.value)}`;
      case 'is not':          return `${c.field} != ${quote(c.value)}`;
      case 'contains':        return `${c.field} LIKE '%${c.value}%'`;
      case 'starts with':     return `${c.field} LIKE '${c.value}%'`;
      case 'is greater than': return `${c.field} > ${c.value}`;
      case 'is less than':    return `${c.field} < ${c.value}`;
      case 'is true':         return `${c.field} = true`;
      case 'is false':        return `${c.field} = false`;
      case 'is before':       return `${c.field} < ${c.value || 'TODAY'}`;
      case 'is after':        return `${c.field} > ${c.value || 'TODAY'}`;
      default:                return '';
    }
  }).filter(Boolean).join(' AND ');
}

/* Keep the underlying record in the shape the engine expects. */
function syncScenario(sc) {
  sc.extraFilter = (sc.findBy === 'fields' || sc.findBy === 'both') ? condsToSoql(sc) : '';
  if (sc.findBy !== 'date' && sc.findBy !== 'both') { sc.dateField = ''; sc.window = ''; }
  if (sc.findBy !== 'apex') sc.resolverClass = '';
}

/* Plain-English sentence for the review step and the scenario list. */
function describeSelection(sc) {
  if (sc.findBy === 'apex') return `chosen by the ${sc.resolverClass || 'Apex'} class`;
  const bits = [];
  if (sc.dateField && sc.window)
    bits.push(`${labelOf(sc.object, sc.dateField)} is within ${winLabel(sc.window).toLowerCase()}`);
  (sc.conditions || []).forEach(c => {
    const l = labelOf(sc.object, c.field);
    bits.push(needsValue(c.op) ? `${l} ${c.op} ${c.value}` : `${l} ${c.op.replace('is ','is ')}`);
  });
  return bits.length ? bits.join(' and ') : 'every record';
}

/* ------------------------------------------------------------------- render */

function wizRender() {
  const st = STEPS[wiz.step];
  $('#wiz-rail').innerHTML = STEPS.map((s, i) => `
    <div class="rail-item ${i === wiz.step ? 'active' : ''} ${i < wiz.step ? 'done' : ''}" data-go="${i}">
      <div class="rail-num">${i < wiz.step ? '✓' : i + 1}</div>
      <div class="rail-text"><b>${s.label}</b><span>${s.hint}</span></div>
    </div>`).join('');
  $$('[data-go]').forEach(el => el.onclick = () => { wiz.step = +el.dataset.go; wizRender(); });

  $('#wiz-step-of').textContent = `Step ${wiz.step + 1} of ${STEPS.length}`;
  $('#wiz-title').textContent = st.title;
  $('#wiz-blurb').textContent = st.blurb;
  $$('.wiz-step').forEach(p => p.hidden = p.dataset.step !== st.key);
  $('#wiz-back').style.visibility = wiz.step === 0 ? 'hidden' : 'visible';
  $('#wiz-next').textContent = wiz.step === STEPS.length - 1 ? 'Save scenario' : 'Next';

  ({ name:stepName, records:stepRecords, docs:stepDocs,
     card:stepCard, words:stepWords, review:stepReview })[st.key]();
  wizSide();
}

/* 1 ------------------------------------------------------------------- name */
function stepName() {
  const s = wiz.s;
  $('#w-name').value = s.name === 'New Scenario' ? '' : s.name;
  $('#w-desc').value = s.description;
}

/* 2 ---------------------------------------------------------------- records */
const FIND_CHOICES = [
  { k:'date',   b:'By date',        d:'Records where a date falls in a time period — renewals this month, cases closed last week.' },
  { k:'fields', b:'By field values',d:'Records matching conditions you choose — active customers, accepted pilots.' },
  { k:'both',   b:'Both',           d:'A date period and field conditions together.' },
  { k:'apex',   b:'Something else', d:'A set a filter cannot describe. Needs a developer, once.' }
];

function stepRecords() {
  const s = wiz.s;
  $('#w-objects').innerHTML = Object.keys(ORG.objects).map(o => {
    const m = (ORG.objectMeta || {})[o] || {};
    return `<button class="obj-tile ${s.object === o ? 'sel' : ''}" data-obj="${o}">
      <span class="obj-ico" style="background:${m.colour || '#8b8b8b'}">${esc((ORG.objects[o].label||o)[0])}</span>
      <span><b>${esc(ORG.objects[o].labelPlural || o)}</b><span>${esc(m.desc || o)}</span></span>
    </button>`;
  }).join('');
  $$('[data-obj]').forEach(b => b.onclick = () => {
    if (s.object !== b.dataset.obj) {
      s.object = b.dataset.obj;
      s.conditions = []; s.dateField = ''; s.window = '';
      s.slots = Array(SLOTS).fill('');
      const first = Object.keys(fieldsFor(s.object))[0];
      s.slots[0] = first || '';
      s.templateIds = [];
    }
    syncScenario(s); wizRender();
  });

  $('#w-find-wrap').hidden = !s.object;
  if (!s.object) return;

  $('#w-findby').innerHTML = FIND_CHOICES.map(c =>
    `<button class="choice ${s.findBy === c.k ? 'sel' : ''}" data-find="${c.k}">
       <b>${c.b}</b><span>${c.d}</span></button>`).join('');
  $$('[data-find]').forEach(b => b.onclick = () => {
    s.findBy = b.dataset.find;
    if ((s.findBy === 'date' || s.findBy === 'both') && !s.dateField) {
      const d = Object.entries(fieldsFor(s.object)).find(([, f]) => f.type === 'date' || f.type === 'datetime');
      if (d) { s.dateField = d[0]; s.window = 'THIS_MONTH'; }
    }
    syncScenario(s); wizRender();
  });

  const useDate = s.findBy === 'date' || s.findBy === 'both';
  const useCond = s.findBy === 'fields' || s.findBy === 'both';
  $('#w-date-block').hidden = !useDate;
  $('#w-cond-block').hidden = !useCond;
  $('#w-apex-block').hidden = s.findBy !== 'apex';

  if (useDate) {
    const dates = Object.entries(fieldsFor(s.object)).filter(([, f]) => f.type === 'date' || f.type === 'datetime');
    $('#w-datefield').innerHTML = dates.length
      ? dates.map(([p, f]) => opt(p, f.label, s.dateField)).join('')
      : opt('', 'This object has no date fields', '');
    $('#w-window').innerHTML = ORG.windows.map(w => opt(w, winLabel(w), s.window)).join('');
    $('#w-override').checked = s.allowOverride;
    $('#w-datefield').onchange = e => { s.dateField = e.target.value; wizRender(); };
    $('#w-window').onchange   = e => { s.window = e.target.value; wizRender(); };
    $('#w-override').onchange = e => { s.allowOverride = e.target.checked; };
  }
  if (useCond) renderConditions();
  if (s.findBy === 'apex') {
    $('#w-resolver').value = s.resolverClass;
    $('#w-resolver').oninput = e => { s.resolverClass = e.target.value; syncScenario(s); wizSide(); };
  }

  const soql = buildSoqlPreview(s);
  $('#w-soql').innerHTML = soql;
  $('#w-soql-peek').hidden = !s.object;
}

function renderConditions() {
  const s = wiz.s;
  const host = $('#w-conditions');
  const flds = Object.entries(fieldsFor(s.object)).filter(([, f]) => f.type !== 'date' && f.type !== 'datetime');

  host.innerHTML = (s.conditions || []).map((c, i) => {
    const t = typeOf(s.object, c.field);
    const f = fieldsFor(s.object)[c.field] || {};
    const valueCtl = !needsValue(c.op) ? ''
      : (f.values
        ? `<div class="select-wrap grow"><select data-c="${i}" data-k="value">
             ${f.values.map(v => opt(v, v, c.value)).join('')}</select></div>`
        : `<input class="cond-val" data-c="${i}" data-k="value" value="${esc(c.value)}" placeholder="Value">`);
    return `<div class="cond-row">
      <div class="select-wrap grow"><select data-c="${i}" data-k="field">
        ${flds.map(([p, fd]) => opt(p, fd.label, c.field)).join('')}</select></div>
      <div class="select-wrap" style="flex:0 0 140px"><select data-c="${i}" data-k="op">
        ${opsFor(t).map(o => opt(o, o, c.op)).join('')}</select></div>
      ${valueCtl}
      <button class="icon-x" data-delc="${i}" title="Remove">&times;</button>
    </div>`;
  }).join('') || `<p class="field-help">No conditions yet — every ${esc(s.object)} would match.</p>`;

  $$('[data-c]', host).forEach(el => el.onchange = el.oninput = () => {
    const c = s.conditions[+el.dataset.c];
    c[el.dataset.k] = el.value;
    if (el.dataset.k === 'field') {
      const t = typeOf(s.object, c.field);
      if (!opsFor(t).includes(c.op)) c.op = opsFor(t)[0];
      const fv = (fieldsFor(s.object)[c.field] || {}).values;
      c.value = fv ? fv[0] : '';
    }
    syncScenario(s); renderConditions(); wizSide(); $('#w-soql').innerHTML = buildSoqlPreview(s);
  });
  $$('[data-delc]', host).forEach(b => b.onclick = () => {
    s.conditions.splice(+b.dataset.delc, 1);
    syncScenario(s); renderConditions(); wizSide(); $('#w-soql').innerHTML = buildSoqlPreview(s);
  });
}

function buildSoqlPreview(s) {
  const cols = columnsOf(s);
  const where = [];
  if (s.findBy === 'apex') where.push('Id IN :scopeIds');
  else {
    if (s.dateField && s.window) where.push(`${s.dateField} = ${s.window}`);
    const f = condsToSoql(s);
    if (f) where.push(`(${f})`);
  }
  return `<span class="cm">// generated from your choices — you never write this</span>
<span class="kw">SELECT</span> ${esc(['Id', ...cols.map(c => c.path)].join(', '))}
<span class="kw">FROM</span> ${esc(s.object)}${where.length ? `
<span class="kw">WHERE</span> ${esc(where.join(' AND '))}` : ''}
<span class="kw">LIMIT</span> ${s.maxRecords}  <span class="cm">— runs as the person asking</span>`;
}

/* 3 ------------------------------------------------------------------- docs */
function stepDocs() {
  const s = wiz.s;
  const chosen = tplsOf(s);
  $('#w-tpl-chosen').innerHTML = chosen.length ? chosen.map((t, i) => `
    <div class="chosen-row">
      <div class="chosen-n">${i + 1}</div>
      <div class="grow"><b>${esc(t.name)}</b><span class="tpl-badges">
        ${(t.inputs || []).length ? '<span class="tpl-badge input">NEEDS INPUT</span>' : ''}
        ${t.esign ? '<span class="tpl-badge esign">E-SIGNATURE</span>' : ''}
      </span><em>${esc(t.format)}</em></div>
      ${i > 0 ? `<button class="btn btn-xs btn-neutral" data-tup="${i}">Move up</button>` : ''}
      <button class="icon-x" data-trm="${i}" title="Remove">&times;</button>
    </div>`).join('')
    : `<p class="field-help">Nothing chosen yet. Pick at least one below.</p>`;

  renderTemplateExtras();
  renderMode();

  const avail = ORG.templates.filter(t => t.object === s.object && !(s.templateIds || []).includes(t.id));
  $('#w-tpl-available').innerHTML = avail.length
    ? avail.map(t => `<button class="tpl-card" data-tadd="${t.id}"><b>+ ${esc(t.name)}</b><span>${esc(t.format)}</span></button>`).join('')
    : `<p class="field-help">No other templates are built on ${esc(s.object)}.</p>`;

  $$('[data-tadd]').forEach(b => b.onclick = () => {
    (s.templateIds = s.templateIds || []).push(b.dataset.tadd); stepDocs(); wizSide();
  });
  $$('[data-trm]').forEach(b => b.onclick = () => {
    s.templateIds.splice(+b.dataset.trm, 1); stepDocs(); wizSide();
  });
  $$('[data-tup]').forEach(b => b.onclick = () => {
    const i = +b.dataset.tup;
    [s.templateIds[i-1], s.templateIds[i]] = [s.templateIds[i], s.templateIds[i-1]];
    stepDocs();
  });

  const n = resolve(s).length, t = Math.max(1, chosen.length), docs = n * t;
  const ceiling = s.maxDocuments || 200;
  const worst = (s.maxRecords || 50) * t;
  $('#w-budget').className = 'budget-banner' + (worst > ceiling ? ' warn' : '');
  $('#w-budget').innerHTML = chosen.length
    ? `Right now that is <b>${n}</b> record${n===1?'':'s'} × <b>${t}</b> template${t===1?'':'s'}
       = <b>${docs}</b> document${docs===1?'':'s'}.
       ${worst > ceiling ? `If the list grew to its limit that would be ${worst}, above your cap of ${ceiling}.`
                         : `At most it could be ${worst}.`}`
    : 'Pick a template to see how many documents this would produce.';
  $('#w-maxdocs').value = ceiling;
  $('#w-maxdocs').oninput = e => { s.maxDocuments = +e.target.value; stepDocs(); };
}

/* Runtime inputs and e-signature are properties of the TEMPLATE, so they are
   configured next to the template that brought them. */
function renderTemplateExtras() {
  const s = wiz.s;
  const host = $('#w-tpl-extras');
  const ins = inputsOf(s);
  const signing = esignOf(s);
  const blocks = [];

  if (ins.length) {
    const bulkOnly = s.mode === 'bulk';
    blocks.push(`<div class="extra-block ${bulkOnly ? 'warn' : ''}">
      <div class="extra-head">${bulkOnly ? '⚠ ' : ''}This template asks for information when it runs</div>
      ${ins.map(i => `<div class="input-item">
          <span>${esc(i.label)}</span>
          <span class="ii-type">${esc(i.dataType.replace('Type','').toLowerCase())}</span>
          ${i.required ? '<span class="ii-req">REQUIRED</span>' : ''}
          <span class="ii-type">from ${esc(i.tpl)}</span>
        </div>`).join('')}
      <div class="extra-note">${bulkOnly
        ? `These cannot be collected during an all-at-once run yet — the values would have to
           be the same for every record, and the generation API has no way to carry them.
           Switch to <b>one record at a time</b>, or drop this template.`
        : `When someone runs this for a record, the assistant will ask for these before generating.`}
      </div></div>`);
  }

  if (signing.length) {
    const opts = (ORG.signerFields[s.object] || []);
    blocks.push(`<div class="extra-block ${s.signerField ? '' : 'warn'}">
      <div class="extra-head">${s.signerField ? '' : '⚠ '}${esc(signing.map(t => t.name).join(', '))}
        ${signing.length === 1 ? 'is sent for signature' : 'are sent for signature'}</div>
      <div class="extra-note">Sending leaves your org and cannot be taken back, so people will see
        exactly who receives each document and confirm that separately — never as part of
        &ldquo;generate everything&rdquo;.</div>
      <div class="signer-row">
        <label>Who signs?</label>
        <div class="select-wrap"><select id="w-signer">
          ${opt('', '— choose a recipient —', s.signerField)}
          ${opts.map(o => opt(o.path, `${o.label} (${o.path})`, s.signerField)).join('')}
        </select></div>
      </div></div>`);
  }
  host.innerHTML = blocks.join('');
  const sel = $('#w-signer');
  if (sel) sel.onchange = e => { s.signerField = e.target.value; renderTemplateExtras(); };
}

function renderMode() {
  const s = wiz.s;
  s.mode = s.mode || 'bulk';
  $('#w-mode').innerHTML = MODES.map(m =>
    `<button class="choice ${s.mode === m.k ? 'sel' : ''}" data-mode="${m.k}">
       <b>${m.b}</b><span>${m.d}</span></button>`).join('');
  $$('[data-mode]').forEach(b => b.onclick = () => { s.mode = b.dataset.mode; stepDocs(); });

  const ins = reqInputs(s);
  const warn = $('#w-mode-warn');
  if (ins.length && s.mode === 'bulk') {
    warn.innerHTML = `<div class="mode-warn amber">All-at-once runs cannot collect
      ${esc(ins.map(i => i.label).join(', '))}. Those values will be left blank on every document.</div>`;
  } else if (ins.length) {
    warn.innerHTML = `<div class="mode-warn ok">Per-record runs can collect
      ${esc(ins.map(i => i.label).join(', '))} in the conversation.</div>`;
  } else warn.innerHTML = '';
}

/* 4 ------------------------------------------------------------------- card */
const BLOCKS = [
  { k:'callout', b:'Summary line',   d:'What is about to happen' },
  { k:'stats',   b:'Key figures',    d:'Records, templates, documents' },
  { k:'table',   b:'The list',       d:'The records themselves' },
  { k:'button',  b:'Confirm button', d:'Nothing generates without it' }
];

function stepCard() {
  const s = wiz.s;
  $('#w-blocks').innerHTML = BLOCKS.map(b => `
    <label class="block-toggle">
      <input type="checkbox" data-blk="${b.k}" ${s.blocks[b.k] ? 'checked' : ''}>
      <span class="switch"></span>
      <span><b>${b.b}</b><span class="bt-desc">${b.d}</span></span>
    </label>`).join('');
  $$('[data-blk]').forEach(i => i.onchange = () => { s.blocks[i.dataset.blk] = i.checked; stepCard(); });

  $('#w-cardtitle').value = s.cardTitle;
  $('#w-confirm').value = s.confirmLabel;
  $('#w-cardtitle').oninput = e => { s.cardTitle = e.target.value; drawDesigner(); };
  $('#w-confirm').oninput  = e => { s.confirmLabel = e.target.value; drawDesigner(); };
  drawDesigner();
}

function drawDesigner() {
  const s = wiz.s;
  $('#w-card').innerHTML = renderCard(s, 'review', { designing: true });
  const used = columnsOf(s).length;
  $('#w-colcount').textContent = `${used} of ${SLOTS} columns used. Click a heading on the card to change it.`;

  // The card IS the editor: headings are the controls.
  const ths = $$('#w-card .mc-table th');
  ths.forEach((th, i) => {
    th.classList.add('editable');
    th.onclick = e => { e.stopPropagation(); openColPicker(th, i); };
  });
  if (used < SLOTS && ths.length) {
    const tr = ths[0].parentNode;
    const add = document.createElement('th');
    add.className = 'th-add';
    add.textContent = '+ Column';
    add.onclick = e => { e.stopPropagation(); openColPicker(add, -1); };
    tr.appendChild(add);
  }
}

/* Field picker. Shows labels; API names are secondary and never typed. */
function openColPicker(anchor, colIndex) {
  closeColPicker();
  const s = wiz.s;
  const cols = columnsOf(s);
  const currentPath = colIndex >= 0 ? cols[colIndex].path : null;
  const used = new Set(cols.map(c => c.path));

  const pop = document.createElement('div');
  pop.className = 'col-pop';
  const entries = Object.entries(fieldsFor(s.object));
  const groups = {
    'Fields on this record': entries.filter(([p]) => !p.includes('.')),
    'From a related record': entries.filter(([p]) => p.includes('.'))
  };
  const list = Object.entries(groups).filter(([, v]) => v.length).map(([g, v]) => `
    <div class="cp-group">${g}</div>
    ${v.map(([p, f]) => `<div class="cp-item ${p === currentPath ? 'cur' : ''} ${used.has(p) && p !== currentPath ? 'used' : ''}"
        data-pick="${esc(p)}"><span>${esc(f.label)}</span><em>${esc(p)}</em></div>`).join('')}`).join('');

  pop.innerHTML = `<input class="search" placeholder="Search fields..." autofocus>
    <div class="col-pop-list">${list}</div>
    <div class="col-pop-foot">
      ${colIndex >= 0 ? '<button class="btn btn-xs btn-neutral" data-remove="1">Remove column</button>' : '<span></span>'}
      <button class="btn btn-xs btn-neutral" data-close="1">Close</button>
    </div>`;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.min(r.left + window.scrollX, window.innerWidth - 305) + 'px';
  pop.style.top  = (r.bottom + window.scrollY + 4) + 'px';
  wiz.popOpen = pop;

  const slotIndex = colIndex >= 0
    ? s.slots.findIndex(p => p === currentPath)
    : s.slots.findIndex(p => !p);

  pop.querySelector('.search').oninput = e => {
    const q = e.target.value.toLowerCase();
    $$('.cp-item', pop).forEach(it => {
      it.style.display = it.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
  $$('[data-pick]', pop).forEach(it => it.onclick = () => {
    if (slotIndex >= 0) s.slots[slotIndex] = it.dataset.pick;
    closeColPicker(); drawDesigner(); wizSide();
  });
  const rm = pop.querySelector('[data-remove]');
  if (rm) rm.onclick = () => {
    if (slotIndex === 0) { alert('The first column is the record’s name and cannot be removed.'); return; }
    if (slotIndex >= 0) s.slots[slotIndex] = '';
    closeColPicker(); drawDesigner(); wizSide();
  };
  pop.querySelector('[data-close]').onclick = closeColPicker;
  pop.querySelector('.search').focus();
  setTimeout(() => document.addEventListener('click', closeColPicker, { once:true }), 0);
  pop.onclick = e => e.stopPropagation();
}
function closeColPicker() { if (wiz.popOpen) { wiz.popOpen.remove(); wiz.popOpen = null; } }

/* 5 ------------------------------------------------------------------ words */
function stepWords() {
  const s = wiz.s;
  const hasWindow = !!(s.dateField && s.window);
  $('#w-guidance').value = s.guidance;
  $('#w-guidance').oninput = e => { s.guidance = e.target.value; };
  const host = $('#w-prompts');
  host.innerHTML = (s.prompts || []).map((p, i) => `
    <div class="prompt-row">
      <input type="text" data-wp="${i}" data-k="label" value="${esc(p.label)}" placeholder="Button label">
      <input type="text" data-wp="${i}" data-k="text" value="${esc(p.text)}" placeholder="“Generate invoices for opportunities renewing this month”">
      ${hasWindow
        ? `<div class="select-wrap"><select data-wp="${i}" data-k="window">
             ${opt('', 'Default period', p.window)}
             ${ORG.windows.map(w => opt(w, winLabel(w), p.window)).join('')}
           </select></div>`
        : `<span class="field-help nowrap">Set a date filter to pin a period</span>`}
      <button class="icon-x" data-delwp="${i}" title="Remove">&times;</button>
    </div>`).join('') || `<p class="field-help">None yet. Even one helps the assistant pick this scenario.</p>`;
  $$('[data-wp]', host).forEach(el => el.oninput = el.onchange = () => {
    s.prompts[+el.dataset.wp][el.dataset.k] = el.value;
  });
  $$('[data-delwp]', host).forEach(b => b.onclick = () => {
    s.prompts.splice(+b.dataset.delwp, 1); stepWords();
  });
}

/* 6 ----------------------------------------------------------------- review */
function stepReview() {
  const s = wiz.s;
  const n = resolve(s).length, t = Math.max(1, tplsOf(s).length);
  const warn = [];
  if (!tplsOf(s).length) warn.push('No templates chosen — this scenario cannot generate anything yet.');
  if (!(s.prompts || []).length) warn.push('No example phrasings — the assistant may not pick this scenario reliably.');
  if (!s.guidance) warn.push('No guidance written.');
  if (esignOf(s).length && !s.signerField)
    warn.push('Documents are sent for signature but no recipient is chosen — this cannot be activated.');
  if (reqInputs(s).length && s.mode === 'bulk')
    warn.push(`All-at-once runs cannot collect ${reqInputs(s).map(i => i.label).join(', ')}.`);

  $('#w-summary').innerHTML = `
    <div class="sum-line">When someone asks for <b>${esc(s.name || 'this scenario')}</b>,</div>
    <div class="sum-line">we find <b>${esc(ORG.objects[s.object]?.labelPlural || s.object)}</b>
      where ${esc(describeSelection(s))},</div>
    <div class="sum-line">and generate <b>${esc(tplNames(s) || 'no templates yet')}</b> for each one.</div>
    <div class="sum-line">Right now that is <b>${n} record${n===1?'':'s'}</b> → <b>${n*t} document${n*t===1?'':'s'}</b>,
      run <b>${esc((MODES.find(m => m.k === s.mode) || MODES[0]).b.toLowerCase())}</b>.</div>
    ${esignOf(s).length ? `<div class="sum-line">Then sent for signature to
      <b>${esc(s.signerField || 'nobody yet')}</b>.</div>` : ''}
    ${warn.map(w => `<div class="sum-warn">⚠ ${esc(w)}</div>`).join('')}`;

  $('#w-active').checked = s.active;
  $('#w-active').onchange = e => { s.active = e.target.checked; };
  $('#w-try').value = (s.prompts[0] || {}).text || '';
  $('#w-try-run').onclick = () => {
    const q = $('#w-try').value;
    const ranked = scoreAll(q);
    const top = ranked[0];
    const hit = top && top.s.id === s.id && top.score >= MIN_SCORE
      && (!ranked[1] || (top.score - ranked[1].score) >= MIN_MARGIN);
    $('#w-try-out').innerHTML = `<div class="try-verdict">
      <span class="pill ${hit ? 'pill-green' : 'pill-amber'}">${hit ? 'This scenario wins' : 'Not a confident match'}</span>
      <span class="reason">${hit
        ? `Scored ${top.score}, ahead of the next by ${top.score - (ranked[1]?.score || 0)}.`
        : `Best match was “${esc(top ? top.s.name : 'none')}” at ${top ? top.score : 0}. Add a phrasing closer to this.`}</span></div>`;
  };
}

/* ------------------------------------------------------------- side preview */
function wizSide() {
  const s = wiz.s;
  const key = STEPS[wiz.step].key;
  const label = $('#wiz-side-label');
  const body = $('#wiz-side-body');

  if (key === 'card' || key === 'words') {
    label.textContent = key === 'card' ? 'Reference' : 'Buttons people will see';
    body.innerHTML = key === 'card'
      ? `<div class="side-box"><div class="side-sub">Column headings come from your org's field labels.
           Rename a field in Setup and this card follows, with no change here.</div></div>`
      : `<div class="side-box"><div class="mc-chips">${(s.prompts || []).map(p =>
           `<button class="mc-chip">${esc(p.label || p.text || 'Untitled')}</button>`).join('')
           || '<span class="side-empty">No phrasings yet.</span>'}</div></div>`;
    return;
  }

  const rows = resolve(s);
  const t = Math.max(1, tplsOf(s).length);
  label.textContent = 'Matching now';
  body.innerHTML = `<div class="side-box">
    <div class="side-count">${rows.length}<span>${esc(ORG.objects[s.object]?.labelPlural || 'records')}</span></div>
    <div class="side-sub">${esc(describeSelection(s))}</div>
    ${tplsOf(s).length ? `<div class="side-sub"><b>${rows.length * t}</b> documents at ${t} template${t===1?'':'s'} each.</div>` : ''}
    <div class="side-list">${rows.slice(0, 6).map(r => {
      const c = columnsOf(s);
      return `<div class="side-rec"><span style="color:var(--text)">${esc(String(r[c[0]?.path] ?? '—'))}</span>
        <span>${esc(c[1] ? String(fmt(r[c[1].path], typeOf(s.object, c[1].path))) : '')}</span></div>`;
    }).join('') || '<span class="side-empty">Nothing matches yet.</span>'}</div>
  </div>`;
}

/* -------------------------------------------------------------------- wiring */
function openWizard(scenario) {
  wiz.s = scenario;
  wiz.s.findBy = wiz.s.findBy || (wiz.s.resolverClass ? 'apex'
    : wiz.s.dateField ? ((wiz.s.conditions || []).length ? 'both' : 'date')
    : (wiz.s.conditions || []).length ? 'fields' : 'fields');
  wiz.s.conditions = wiz.s.conditions || [];
  wiz.step = 0;
  showTab('builder');
  wizRender();
}

$('#wiz-next').onclick = () => {
  if (wiz.step < STEPS.length - 1) { wiz.step++; wizRender(); }
  else {
    syncScenario(wiz.s);
    if (!scenarios.includes(wiz.s)) scenarios.push(wiz.s);
    renderList(); showTab('list');
  }
};
$('#wiz-back').onclick = () => { if (wiz.step) { wiz.step--; wizRender(); } };
$('#wiz-cancel').onclick = () => { renderList(); showTab('list'); };
$('#w-name').oninput = e => { wiz.s.name = e.target.value; };
$('#w-desc').oninput = e => { wiz.s.description = e.target.value; };
$('#w-add-cond').onclick = () => {
  const s = wiz.s;
  const first = Object.entries(fieldsFor(s.object))
    .find(([, f]) => f.type !== 'date' && f.type !== 'datetime');
  if (!first) return;
  const t = first[1].type;
  s.conditions.push({ field:first[0], op:opsFor(t)[0], value:first[1].values ? first[1].values[0] : '' });
  syncScenario(s); renderConditions(); wizSide(); $('#w-soql').innerHTML = buildSoqlPreview(s);
};
$('#w-add-prompt').onclick = () => {
  wiz.s.prompts.push({ label:'', text:'', window:'' }); stepWords();
};

openWizard(scenarios[0]);
