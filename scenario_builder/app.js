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

function renderCard(s, stage = 'review', opts = {}) {
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

  if (stage === 'review' && n === 0 && !opts.designing) {
    out.push(callout('warning', 'Nothing to generate',
      s.emptyMessage || `No ${s.object} matched: ${crit}.`));
    return out.join('');
  }

  if (stage === 'running') {
    out.push(`<div><div class="mc-progress"><i style="width:45%"></i></div>
      <div class="mc-progress-label">${Math.floor(docs*0.45)} of ${docs} processed</div></div>`);
    out.push(callout('info', 'In progress', 'Still running. Call the check tool again in a few seconds.'));
  }

  const signing = tpls.filter(t => t.esign);
  if (signing.length && stage === 'review' && n) {
    out.push(`<div class="mc-callout warning"><b>Goes out for signature</b>
      ${esc(signing.map(t => t.name).join(', '))} will be sent to
      <b>${esc(s.signerField || 'a recipient you have not chosen yet')}</b> on each of the
      ${n} record${n===1?'':'s'} below. This cannot be recalled.</div>`);
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

  if (s.blocks.table && stage === 'review' && (n || opts.designing)) {
    // A row button generates that record's whole pack. Bulk does every record.
    const perRow = (s.mode === 'record' || s.mode === 'both');
    const rowLabel = tpls.some(t => t.esign) ? 'Send' : 'Generate';
    const bodyRows = n
      ? rows.map(r => `<tr>${cols.map(c =>
          `<td class="${c.align}">${esc(fmt(r[c.path], typeOf(s.object, c.path)))}</td>`).join('')
          }${perRow ? `<td class="rowact"><button class="mc-rowbtn">${rowLabel}</button></td>` : ''}</tr>`).join('')
      : `<tr><td class="mc-empty" colspan="${(cols.length || 1) + (perRow ? 1 : 0)}">Nothing matches right now —
           the columns below are still what people will see when something does.</td></tr>`;
    out.push(`<div class="mc-table-wrap"><table class="mc-table"><thead><tr>${
      cols.map(c => `<th class="${c.align}">${esc(c.header)}</th>`).join('')
    }${perRow ? '<th></th>' : ''}</tr></thead><tbody>${bodyRows}</tbody></table></div>`);
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

  if (s.blocks.button && stage === 'review' && n && s.mode !== 'record') {
    const signingAll = tpls.some(t => t.esign);
    const label = s.confirmLabel
      || (signingAll ? `Send ${docs} for signature`
          : multi ? `Generate ${docs} documents` : `Generate all ${n}`);
    out.push(`<div class="mc-actions"><button class="mc-btn">${esc(label)}</button></div>`);
  }
  if (stage === 'running') {
    out.push(`<div class="mc-actions"><button class="mc-btn">Check progress</button></div>`);
  }

  const asks = tpls.flatMap(t => (t.inputs || []).filter(i => i.required));
  if (asks.length && stage === 'review' && n && s.mode !== 'bulk') {
    out.push(`<div class="mc-callout info"><b>Will ask you for</b>
      ${esc(asks.map(i => i.label).join(', '))} before generating.</div>`);
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
    openWizard(scenarios.find(x => x.id === a.dataset.open));
  });
}

/* ------------------------------------------------------------ shared bits */

/* Used by both the list screen and the wizard. */
function opt(v, label, sel) {
  return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(label)}</option>`;
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

$('#btn-new').onclick = () => {
  openWizard({ id:'a0S' + (scenarios.length + 1), name:'New Scenario', active:false,
    description:'', guidance:'', object:'', templateIds:[],
    dateField:'', window:'', allowOverride:true, findBy:'fields', conditions:[],
    extraFilter:'', resolverClass:'', sortField:'', maxRecords:50, maxDocuments:200,
    documentAction:'', slots:Array(SLOTS).fill(''), cardTitle:'', confirmLabel:'',
    emptyMessage:'', blocks:{callout:true,stats:true,table:true,button:true}, prompts:[] });
};

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
$('#t-request').value = 'generate invoices for opportunities renewing this month';
runTest($('#t-request').value);
