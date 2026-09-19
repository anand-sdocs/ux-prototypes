/* ==========================================================================
   Document Scenarios — builder + tester prototype.
   The preview panel renders the same card shape the MCP tools return, so the
   thing an administrator is really authoring is visible while they author it.
   ========================================================================== */

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const SLOTS = 8;

let scenarios = JSON.parse(JSON.stringify(SCENARIOS));
let current = scenarios[0];

/* ---------------------------------------------------------------- helpers */

const tplById = id => ORG.templates.find(t => t.id === id);
const tplsOf   = sc => (sc.templateIds || []).map(tplById).filter(Boolean);
const tplNames = sc => tplsOf(sc).map(t => t.name).join(', ');
/* Records x templates. The number that actually maps to runtime, licence
   consumption and how long the user waits. */
const docCount = (sc, n) => n * Math.max(1, tplsOf(sc).length);
const fieldsFor = obj => ORG.objects[obj] ? ORG.objects[obj].fields : {};
const labelOf = (obj, path) => (fieldsFor(obj)[path] || {}).label || path;
const typeOf  = (obj, path) => (fieldsFor(obj)[path] || {}).type || 'text';
const isNumeric = t => ['currency','percent','number','double','int'].includes(t);
const windowWords = w => (w || '').replace(/_/g, ' ').toLowerCase();

function fmt(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'currency') return '$' + Number(value).toLocaleString();
  if (type === 'percent')  return value + '%';
  if (type === 'boolean')  return value ? 'Yes' : 'No';
  if (type === 'date' || type === 'datetime') {
    const d = new Date(value);
    return isNaN(d) ? value : d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }
  return String(value);
}

/* The columns a scenario actually renders. Unmapped slots are dropped
   entirely rather than shown blank — which is what lets one widget serve a
   five-column renewals scenario and a three-column statement scenario. */
function columnsOf(s) {
  const cols = [];
  s.slots.forEach((path, i) => {
    if (!path) return;
    cols.push({
      key: i === 0 ? 'title' : 'cell' + (i + 1),
      path,
      header: labelOf(s.object, path),
      align: isNumeric(typeOf(s.object, path)) ? 'r' : ''
    });
  });
  return cols;
}

/* Resolve a scenario to rows. Mirrors the engine: filter, then map. */
function resolve(s) {
  let records = (RECORDS[s.object] || []).slice();

  if (s.resolverClass) {
    // Tier 2 stands in for Apex: ids only, display still declarative.
    records = records.filter((_, i) => i % 2 === 0);
  } else {
    if (s.extraFilter) {
      s.extraFilter.split(/\s+AND\s+/i).forEach(clause => {
        const m = clause.match(/(\w+(?:__c)?)\s*=\s*'?([^']+)'?/);
        if (!m) return;
        const [, f, raw] = m;
        const want = raw.trim() === 'true' ? true : raw.trim() === 'false' ? false : raw.trim();
        records = records.filter(r => r[f] === want);
      });
    }
    if (s.dateField && s.window) {
      // Any seeded date counts as "in window" for the prototype.
      records = records.filter(r => r[s.dateField]);
    }
  }
  return records.slice(0, s.maxRecords);
}

function criteriaOf(s) {
  if (s.resolverClass) return 'selected by ' + s.resolverClass;
  const parts = [];
  if (s.dateField && s.window) parts.push(labelOf(s.object, s.dateField) + ' ' + windowWords(s.window));
  if (s.extraFilter) parts.push(s.extraFilter);
  return parts.length ? parts.join(', ') : 'all ' + s.object;
}

/* ------------------------------------------------------------ the MCP card */

function renderCard(s, stage = 'review') {
  const rows = resolve(s);
  const cols = columnsOf(s);
  const n = rows.length;
  const tpls = tplsOf(s);
  const tplName = tpls.length ? tplNames(s) : 'document';
  const multi = tpls.length > 1;
  const docs = docCount(s, n);
  const crit = criteriaOf(s);
  const objLabel = ORG.objects[s.object]
    ? (n === 1 ? ORG.objects[s.object].label : ORG.objects[s.object].labelPlural) : s.object;
  const out = [];

  const badge = stage === 'running' ? ['info','Running']
              : stage === 'done'    ? ['success','Completed']
              : n === 0             ? ['warning','Nothing to generate']
              : ['info','Ready'];

  const headline = stage === 'running' ? `Generating ${docs} documents`
                 : stage === 'done'    ? `Generated ${docs} documents`
                 : n === 0             ? `Nothing matches ${s.name}`
                 : `${n} ${objLabel} — ${crit}`;

  out.push(`<div class="mc-head">
      <div><div class="mc-title">${esc(s.cardTitle || s.name)}</div>
      <div class="mc-sub">${esc(headline)}</div></div>
      <span class="mc-badge ${badge[0]}">${badge[1]}</span></div>`);

  if (stage === 'review' && n === 0) {
    out.push(callout('warning', 'Nothing to generate',
      s.emptyMessage || `No ${s.object} matched: ${crit}.`));
    return out.join('');
  }

  if (stage === 'running') {
    out.push(`<div><div class="mc-progress"><i style="width:45%"></i></div>
      <div class="mc-progress-label">${Math.floor(docs*0.45)} of ${docs} processed</div></div>`);
    out.push(callout('info', 'In progress', 'Still running. Call the check tool again in a few seconds.'));
  }

  if (s.blocks.callout && stage === 'review') {
    // Nobody should approve 36 documents believing they approved 12.
    out.push(callout('info', 'About to generate', multi
      ? `${n} records × ${tpls.length} templates = ${docs} documents (${tplName}). Review the list, then confirm.`
      : `${n} × ${tplName}. Review the list, then confirm.`));
  }
  if (stage === 'done') {
    out.push(callout('success', 'Done', `${tplName} — ${crit}`));
  }

  if (s.blocks.stats && stage !== 'running') {
    const stats = stage === 'done'
      ? [['Requested', docs], ['Generated', docs]]
      : (multi ? [['Records', n], ['Templates', tpls.length], ['Documents', docs]]
               : [['Records', n], ['Template', tplName]]).concat(
          s.dateField && s.window ? [['Window', windowWords(s.window)]] : []);
    out.push(`<div class="mc-stats">${stats.map(([l,v]) =>
      `<div class="mc-stat"><span>${esc(l)}</span><b>${esc(String(v))}</b></div>`).join('')}</div>`);
  }

  if (s.blocks.table && stage === 'review' && n) {
    out.push(`<div class="mc-table-wrap"><table class="mc-table"><thead><tr>${
      cols.map(c => `<th class="${c.align}">${esc(c.header)}</th>`).join('')
    }</tr></thead><tbody>${
      rows.map(r => `<tr>${cols.map(c =>
        `<td class="${c.align}">${esc(fmt(r[c.path], typeOf(s.object, c.path)))}</td>`).join('')}</tr>`).join('')
    }</tbody></table></div>`);
  }

  if (stage === 'done') {
    out.push('<div class="mc-sep"></div><div class="mc-eyebrow">DOCUMENTS</div>');
    rows.forEach(r => {
      const label = r[s.slots[0]] || 'Document';
      tpls.forEach(t => {
        out.push(`<div class="mc-doc"><b>${esc(t.name)}_${esc(String(label).slice(0,18))}.pdf</b>
          <div class="mc-doc-right"><span class="mc-badge success">Generated</span>
          <a class="mc-link">Open</a></div></div>`);
      });
    });
  }

  if (s.blocks.button && stage === 'review' && n) {
    out.push(`<div class="mc-actions"><button class="mc-btn">${
      esc(s.confirmLabel || (multi ? 'Generate ' + docs + ' documents' : 'Generate all ' + n))
    }</button></div>`);
  }
  if (stage === 'running') {
    out.push(`<div class="mc-actions"><button class="mc-btn">Check progress</button></div>`);
  }

  if (s.prompts.length && stage === 'review') {
    out.push(`<div class="mc-chips">${s.prompts.map(p =>
      `<button class="mc-chip" title="${esc(p.text)}">${esc(p.label || p.text)}</button>`).join('')}</div>`);
  }
  return out.join('');
}

const callout = (v, title, body) =>
  `<div class="mc-callout ${v}"><b>${esc(title)}</b>${esc(body)}</div>`;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ------------------------------------------------------------- list screen */

function renderList() {
  $('#scenario-tbody').innerHTML = scenarios.map(s => {
    const sel = s.resolverClass
      ? `<span class="pill pill-violet">Apex</span> <span class="sel-note">${esc(s.resolverClass)}</span>`
      : `<span class="sel-note">${esc(criteriaOf(s))}</span>`;
    return `<tr>
      <td><a class="link" data-open="${s.id}">${esc(s.name)}</a>
          <div class="mc-sub">${esc(s.description)}</div></td>
      <td>${esc(s.object)}</td>
      <td>${tplsOf(s).length ? esc(tplNames(s)) : '—'}</td>
      <td>${sel}</td>
      <td class="num">${tplsOf(s).length}</td>
      <td class="num">${columnsOf(s).length}</td>
      <td class="num">${s.prompts.length}</td>
      <td><span class="pill ${s.active ? 'pill-green' : 'pill-grey'}">${s.active ? 'Active' : 'Inactive'}</span></td>
      <td><a class="link" data-open="${s.id}">Edit</a></td>
    </tr>`;
  }).join('');

  $$('[data-open]').forEach(a => a.onclick = () => {
    current = scenarios.find(x => x.id === a.dataset.open);
    showTab('builder');
    loadBuilder();
  });
}

/* ---------------------------------------------------------------- builder */

function opt(v, label, sel) {
  return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(label)}</option>`;
}

function loadBuilder() {
  const s = current;
  $('#builder-title').textContent = s.name;
  $('#scenario-select').innerHTML = scenarios.map(x => opt(x.id, x.name, s.id)).join('');
  $('#f-name').value = s.name;
  $('#f-desc').value = s.description;
  $('#f-guidance').value = s.guidance;
  $('#f-active').checked = s.active;
  $('#f-filter').value = s.extraFilter;
  $('#f-resolver').value = s.resolverClass;
  $('#f-max').value = s.maxRecords;
  $('#f-maxdocs').value = s.maxDocuments;
  $('#f-cardtitle').value = s.cardTitle;
  $('#f-confirm').value = s.confirmLabel;
  $('#f-empty').value = s.emptyMessage;
  $('#f-override').checked = s.allowOverride;

  $('#f-object').innerHTML = Object.keys(ORG.objects).map(o => opt(o, o, s.object)).join('');
  renderTemplates();

  const dateFields = Object.entries(fieldsFor(s.object))
    .filter(([, f]) => f.type === 'date' || f.type === 'datetime');
  $('#f-datefield').innerHTML = opt('', '— none —', s.dateField)
    + dateFields.map(([p, f]) => opt(p, f.label, s.dateField)).join('');
  $('#f-window').innerHTML = opt('', '— none —', s.window)
    + ORG.windows.map(w => opt(w, windowWords(w), s.window)).join('');
  $('#f-sort').innerHTML = opt('', '— default —', s.sortField)
    + Object.entries(fieldsFor(s.object)).map(([p, f]) => opt(p, f.label, s.sortField)).join('');

  $$('#block-toggles input').forEach(i => i.checked = !!s.blocks[i.dataset.block]);
  $('#resolver-note').hidden = !s.resolverClass;

  renderSlots();
  renderPrompts();
  renderPreview();
}

/* Templates are a SET, in order. A scenario usually produces a pack of
   documents per record rather than one, and the order is the reading order. */
function renderTemplates() {
  const s = current;
  const host = $('#template-list');
  const attached = tplsOf(s);

  host.innerHTML = attached.length ? attached.map((t, i) => `
    <div class="tpl-row">
      <div class="tpl-order">${i + 1}</div>
      <div><div class="tpl-name">${esc(t.name)}</div>
           <div class="tpl-format">${esc(t.format)} · ${esc(t.object)}</div></div>
      <div>${i > 0 ? `<button class="btn btn-xs btn-neutral" data-up="${i}">↑ Move up</button>` : ''}</div>
      <button class="icon-x" data-rmtpl="${i}" title="Remove">&times;</button>
    </div>`).join('')
    : `<p class="tpl-empty">No templates attached. A scenario with no template can be
       previewed but not generated.</p>`;

  const available = ORG.templates.filter(t =>
    t.object === s.object && !(s.templateIds || []).includes(t.id));
  $('#f-add-template').innerHTML = available.length
    ? available.map(t => opt(t.id, `${t.name}  ·  ${t.format}`, '')).join('')
    : opt('', '— none left on this object —', '');
  $('#btn-add-template').disabled = !available.length;

  $$('[data-rmtpl]', host).forEach(b => b.onclick = () => {
    s.templateIds.splice(+b.dataset.rmtpl, 1);
    renderTemplates(); renderBudget(); renderPreview();
  });
  $$('[data-up]', host).forEach(b => b.onclick = () => {
    const i = +b.dataset.up;
    [s.templateIds[i-1], s.templateIds[i]] = [s.templateIds[i], s.templateIds[i-1]];
    renderTemplates(); renderPreview();
  });
  renderBudget();
}

/* Makes the multiplication visible while the admin is still choosing. */
function renderBudget() {
  const s = current;
  const n = resolve(s).length;
  const t = Math.max(1, tplsOf(s).length);
  const docs = n * t;
  const ceiling = s.maxDocuments || 200;
  const worst = (s.maxRecords || 50) * t;
  $('#budget').innerHTML = `<b>${n}</b> records × <b>${t}</b> template${t === 1 ? '' : 's'}
    = <b>${docs}</b> document${docs === 1 ? '' : 's'} now.
    At the record cap that is <span class="${worst > ceiling ? 'over' : ''}">${worst}</span>,
    capped at ${ceiling}.`;
}

function renderSlots() {
  const s = current;
  const paths = Object.keys(fieldsFor(s.object));
  $('#slots').innerHTML = Array.from({ length: SLOTS }, (_, i) => {
    const path = s.slots[i] || '';
    const title = i === 0;
    return `<div class="slot ${title ? 'is-title' : ''} ${path ? '' : 'is-empty'}">
      <div><div class="slot-n">${title ? 'Title' : 'Col ' + (i+1)}</div>
           <div class="slot-api">${title ? 'title' : 'cell' + (i+1)}</div></div>
      <div class="select-wrap">
        <select data-slot="${i}">
          ${opt('', title ? '— required —' : '— not used —', path)}
          ${paths.map(p => opt(p, p, path)).join('')}
        </select>
      </div>
      <div class="slot-header">
        ${path
          ? `<b>${esc(labelOf(s.object, path))}</b>
             <em class="derived">↳ from field label</em>`
          : `<em>column not rendered</em>`}
      </div>
    </div>`;
  }).join('');

  $$('#slots select').forEach(sel => sel.onchange = () => {
    current.slots[+sel.dataset.slot] = sel.value;
    renderSlots(); renderPreview();
  });
}

function renderPrompts() {
  const s = current;
  const host = $('#prompt-list');
  if (!s.prompts.length) {
    host.innerHTML = `<p class="prompt-empty">No prompts yet. Without them the scenario is still
      discoverable, but the model has no curated phrasing to learn from and the card has no chips.</p>`;
    return;
  }
  host.innerHTML = s.prompts.map((p, i) => `
    <div class="prompt-row">
      <input type="text" data-p="${i}" data-k="label" value="${esc(p.label)}" placeholder="Chip label">
      <input type="text" data-p="${i}" data-k="text" value="${esc(p.text)}" placeholder="The phrasing a user would say">
      <div class="select-wrap"><select data-p="${i}" data-k="window">
        ${opt('', '— scenario default —', p.window)}
        ${ORG.windows.map(w => opt(w, windowWords(w), p.window)).join('')}
      </select></div>
      <button class="icon-x" data-del="${i}" title="Remove">&times;</button>
    </div>`).join('');

  $$('[data-p]', host).forEach(el => el.oninput = el.onchange = () => {
    current.prompts[+el.dataset.p][el.dataset.k] = el.value;
    renderPreview();
  });
  $$('[data-del]', host).forEach(b => b.onclick = () => {
    current.prompts.splice(+b.dataset.del, 1); renderPrompts(); renderPreview();
  });
}

function renderPreview() {
  const s = current;
  const stage = $('.seg-btn.active', $('#surface-seg')) ? 'review' : 'review';
  const lead = s.prompts[0] ? s.prompts[0].text : `Run the ${s.name} scenario`;
  $('#chat-user').textContent = lead;
  $('#mcp-card').innerHTML = renderCard(s, stage);
  const cols = columnsOf(s);
  $('#preview-foot').innerHTML =
    `${cols.length} of 8 slots mapped. Headers derive from field labels, so relabelling a field
     in Setup keeps this card correct without touching the scenario.`;
}

/* ----------------------------------------------------------------- tester */

const STOP = new Set(['a','an','the','for','all','my','me','of','to','in','on','and','or','is','are',
  'please','can','you','i','want','need','get','give','send','out','this','that',
  'generate','create','make','produce','document','documents','doc','docs',
  // Words with no intent that nonetheless appear in scenario names. Without
  // these, "do the thing with the stuff" matched "Accounts with no signed NDA"
  // on the single token "with".
  'with','without','from','about','into','over','under','them','they','some',
  'any','what','which','when','where','who','how','there','their','have','has',
  'had','our','your','its','it','be','been','do','does','did','not','no','new',
  'thing','things','stuff','one','set','list','show','find','run','use','using']);

/* A single incidental overlap is not a match, and a near-tie is a question. */
const MIN_SCORE = 5, MIN_MARGIN = 3;

const tokenise = t => new Set((t || '').toLowerCase().split(/[^a-z0-9]+/)
  .filter(w => w.length >= 3 && !STOP.has(w))
  .map(w => w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w));

function overlap(hay, needles) {
  const words = tokenise(hay);
  return [...needles].filter(n => words.has(n)).length;
}

/* Mirrors MCPXScenarioCatalog.score — weighted by how deliberate the text is. */
function scoreAll(request) {
  const needles = tokenise(request);
  return scenarios.filter(s => s.active).map(s => {
    const parts = [
      ['name', 5, overlap(s.name, needles)],
      ['description', 3, overlap(s.description, needles)],
      ['guidance', 1, overlap(s.guidance, needles)],
      ['object', 1, overlap(s.object, needles)],
      ['prompts', 4, s.prompts.reduce((a, p) => a + overlap(p.text, needles), 0)]
    ];
    return { s, parts, score: parts.reduce((a, [, w, hits]) => a + w * hits, 0) };
  }).sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name));
}

let testerScenario = null;

function runTest(request) {
  const ranked = scoreAll(request);
  const top = ranked[0];
  const ambiguous = !top || top.score < MIN_SCORE
    || (ranked[1] && (top.score - ranked[1].score) < MIN_MARGIN);
  const max = Math.max(1, top ? top.score : 1);

  const verdict = ambiguous
    ? `<span class="pill pill-amber">No confident match</span>`
    : `<span class="pill pill-green">Matched</span>`;

  const explain = ambiguous
    ? `<p class="reason">Nothing cleared the confidence threshold (${MIN_SCORE}), or the top two were
       within ${MIN_MARGIN} points of each other. <code>run</code> returns the candidates as chips
       rather than guessing &mdash; so it converges on <code>discover</code> and the model cannot
       get stuck.</p>`
    : `<p class="reason">Resolved to <b>${esc(top.s.name)}</b> without a discovery round trip.
       <code>run</code> accepts free text, so only an ambiguous request costs the extra call.</p>`;

  $('#match-report').innerHTML = `
    <div class="match-block">
      <div class="match-head"><h3>Match</h3>${verdict}</div>
      ${explain}
      <table class="score-table">
        <thead><tr><th>Scenario</th><th>Score</th><th>Where it matched</th></tr></thead>
        <tbody>${ranked.map(r => `
          <tr class="${!ambiguous && r === top ? 'win' : ''}">
            <td>${esc(r.s.name)}</td>
            <td><i class="score-bar" style="width:${Math.round(r.score / max * 60)}px"></i>${r.score}</td>
            <td class="reason">${r.parts.filter(p => p[2]).map(p =>
              `${p[0]} ×${p[2]}`).join(', ') || '—'}</td>
          </tr>`).join('')}</tbody>
      </table>
      ${ambiguous ? '' : soqlFor(top.s)}
    </div>`;

  testerScenario = ambiguous ? null : top.s;
  $('#t-chat-user').textContent = request;
  renderTesterCard();
}

function soqlFor(s) {
  const cols = columnsOf(s);
  const sel = ['Id', ...cols.map(c => c.path)].join(', ');
  const where = [];
  if (s.resolverClass) where.push('Id IN :scopeIds');
  else {
    if (s.dateField && s.window) where.push(`${s.dateField} = ${s.window}`);
    if (s.extraFilter) where.push(`(${s.extraFilter})`);
  }
  const note = s.resolverClass
    ? `<span class="cm">// tier 2: ${esc(s.resolverClass)} chose the ids; this only fetches display values</span>\n`
    : `<span class="cm">// every field came from describe, never from input; window is whitelisted</span>\n`;
  return `<div class="soql-box">${note}<span class="kw">SELECT</span> ${esc(sel)}
<span class="kw">FROM</span> ${esc(s.object)}${where.length ? `
<span class="kw">WHERE</span> ${esc(where.join(' AND '))}` : ''}
<span class="kw">ORDER BY</span> ${esc(s.sortField || s.dateField || s.slots[0])}
<span class="kw">LIMIT</span> ${s.maxRecords}  <span class="cm">— runs in USER_MODE</span></div>`;
}

function renderTesterCard() {
  const stage = $('#t-stage-seg .seg-btn.active').dataset.stage;
  if (!testerScenario) {
    $('#t-mcp-card').innerHTML = `
      <div class="mc-head"><div><div class="mc-title">Which scenario did you mean?</div>
      <div class="mc-sub">More than one scenario could match.</div></div>
      <span class="mc-badge info">Needs a choice</span></div>
      ${callout('info','Pick a scenario','Call discover for full details, or run one of these directly.')}
      <div class="mc-chips">${scenarios.filter(s=>s.active).slice(0,5).map(s =>
        `<button class="mc-chip">${esc(s.name)}</button>`).join('')}</div>`;
    return;
  }
  $('#t-mcp-card').innerHTML = renderCard(testerScenario, stage);
}

/* ------------------------------------------------------------------- wire */

function showTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
}

$$('.tab').forEach(t => t.onclick = () => showTab(t.dataset.tab));

$('#scenario-select').onchange = e => {
  current = scenarios.find(s => s.id === e.target.value);
  loadBuilder();
};

const bind = (sel, key, prop = 'value') => {
  const el = $(sel);
  if (!el) return;          // a control that is not on the page must not break the page
  el.oninput = el.onchange = e => {
    current[key] = prop === 'checked' ? e.target.checked
                 : (e.target.type === 'number' ? +e.target.value : e.target.value);
    if (key === 'object') {
      current.slots = Array(SLOTS).fill('');
      current.dateField = ''; current.window = ''; current.extraFilter = '';
      const t = ORG.templates.find(x => x.object === current.object);
      current.templateIds = t ? [t.id] : [];
      loadBuilder();
      return;
    }
    if (key === 'name') $('#builder-title').textContent = e.target.value;
    if (key === 'resolverClass') $('#resolver-note').hidden = !e.target.value;
    if (['maxRecords','maxDocuments','extraFilter','dateField','window'].includes(key)) renderBudget();
    renderPreview();
  };
};
bind('#f-name','name'); bind('#f-desc','description'); bind('#f-guidance','guidance');
bind('#f-active','active','checked'); bind('#f-object','object');
bind('#f-datefield','dateField'); bind('#f-window','window');
bind('#f-override','allowOverride','checked'); bind('#f-filter','extraFilter');
bind('#f-resolver','resolverClass'); bind('#f-sort','sortField'); bind('#f-max','maxRecords');
bind('#f-maxdocs','maxDocuments');
bind('#f-cardtitle','cardTitle'); bind('#f-confirm','confirmLabel'); bind('#f-empty','emptyMessage');

$$('#block-toggles input').forEach(i => i.onchange = () => {
  current.blocks[i.dataset.block] = i.checked;
  renderPreview();
});

$('#btn-add-template').onclick = () => {
  const id = $('#f-add-template').value;
  if (!id) return;
  (current.templateIds = current.templateIds || []).push(id);
  renderTemplates(); renderPreview();
};

$('#btn-add-prompt').onclick = () => {
  current.prompts.push({ label:'New prompt', text:'', window:'' });
  renderPrompts(); renderPreview();
};

$('#btn-save').onclick = () => { renderList(); showTab('list'); };
$('#btn-new').onclick = () => {
  const s = { id:'a0S' + (scenarios.length+1), name:'New Scenario', active:false,
    description:'', guidance:'', object:'Opportunity', templateIds:['a0H01'],
    dateField:'', window:'', allowOverride:true, extraFilter:'', resolverClass:'',
    sortField:'', maxRecords:50, maxDocuments:200, documentAction:'',
    slots:['Name','','','','','','',''], cardTitle:'', confirmLabel:'', emptyMessage:'',
    blocks:{callout:true,stats:true,table:true,button:true}, prompts:[] };
  scenarios.push(s); current = s; showTab('builder'); loadBuilder();
};

$$('#surface-seg .seg-btn').forEach(b => b.onclick = () => {
  $$('#surface-seg .seg-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  $('#chat-frame').classList.toggle('slack', b.dataset.surface === 'slack');
});

$$('#t-stage-seg .seg-btn').forEach(b => b.onclick = () => {
  $$('#t-stage-seg .seg-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  renderTesterCard();
});

$('#btn-run').onclick = () => runTest($('#t-request').value);
$('#t-request').onkeydown = e => { if (e.key === 'Enter') runTest(e.target.value); };
$$('.try-chip').forEach(c => c.onclick = () => {
  $('#t-request').value = c.dataset.q; runTest(c.dataset.q);
});

$('#btn-docs').onclick = () => { $('#drawer').hidden = false; $('#drawer-scrim').hidden = false; };
const closeDrawer = () => { $('#drawer').hidden = true; $('#drawer-scrim').hidden = true; };
$('#drawer-close').onclick = closeDrawer;
$('#drawer-scrim').onclick = closeDrawer;

renderList();
loadBuilder();
$('#t-request').value = 'generate invoices for opportunities renewing this month';
runTest($('#t-request').value);
