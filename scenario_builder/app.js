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

const usesDate = sc => sc.findBy ? (sc.findBy === 'date' || sc.findBy === 'both') : !!sc.dateField;
const usesConds = sc => sc.findBy ? (sc.findBy === 'fields' || sc.findBy === 'both') : !!sc.extraFilter;
const usesApex = sc => sc.findBy ? sc.findBy === 'apex' : !!sc.resolverClass;

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

  if (usesApex(s)) {
    // Tier 2 stands in for Apex: ids only, display still declarative.
    records = records.filter((_, i) => i % 2 === 0);
  } else {
    if (usesConds(s) && s.extraFilter) {
      s.extraFilter.split(/\s+AND\s+/i).forEach(clause => {
        const m = clause.match(/(\w+(?:__c)?)\s*=\s*'?([^']+)'?/);
        if (!m) return;
        const [, f, raw] = m;
        const want = raw.trim() === 'true' ? true : raw.trim() === 'false' ? false : raw.trim();
        records = records.filter(r => r[f] === want);
      });
    }
    if (usesDate(s) && s.dateField && s.window) {
      // Any seeded date counts as "in window" for the prototype.
      records = records.filter(r => r[s.dateField]);
    }
  }
  return records.slice(0, s.maxRecords);
}

function criteriaOf(s) {
  if (usesApex(s)) return 'chosen by ' + (s.resolverClass || 'Apex');
  const parts = [];
  if (usesDate(s) && s.dateField && s.window) {
    const wl = (ORG.windowLabels && ORG.windowLabels[s.window]) || windowWords(s.window);
    parts.push(labelOf(s.object, s.dateField) + ' ' + wl.toLowerCase());
  }
  (usesConds(s) ? (s.conditions || []) : []).forEach(c => {
    const l = labelOf(s.object, c.field);
    parts.push(c.op === 'is true' ? l
             : c.op === 'is false' ? 'not ' + l
             : `${l} ${c.op} ${c.value}`);
  });
  // Fall back to the raw predicate only for scenarios with no structured
  // conditions, which should not happen once everything goes through the wizard.
  if (!parts.length && s.extraFilter) parts.push(s.extraFilter);
  return parts.length ? parts.join(', ') : 'all ' + (ORG.objects[s.object]?.labelPlural || s.object);
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

  const signing = tpls.filter(t => t.esign);
  const badge = stage === 'running' ? ['info','Running']
              : stage === 'done'    ? ['success','Completed']
              : n === 0             ? ['warning','Nothing to generate']
              : ['info','Ready'];

  const doc = k => `${k} document${k === 1 ? '' : 's'}`;
  const headline = stage === 'running' ? `Generating ${doc(docs)}`
                 : stage === 'done'    ? `Generated ${doc(docs)}`
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

  if (signing.length && stage === 'review' && n) {
    const who = esc(s.signerField || 'a recipient you have not chosen yet');
    out.push(`<div class="mc-callout warning"><b>Goes out for signature</b>
      ${esc(signing.map(t => t.name).join(', '))} ${s.allowBulk
        ? `will be sent to <b>${who}</b> on each of the ${n} record${n===1?'':'s'} below`
        : `${signing.length === 1 ? 'is' : 'are'} sent to <b>${who}</b> for whichever row you choose`}.
      This cannot be recalled.</div>`);
  }

  if (s.blocks.callout && stage === 'review') {
    const verb = signing.length ? 'send' : 'generate';
    const each = multi ? `its ${tpls.length} documents (${tplName})` : `its ${tplName}`;
    out.push(s.allowBulk
      // Nobody should approve 36 documents believing they approved 12.
      ? callout('info', `About to ${verb}`, multi
          ? `${n} records × ${tpls.length} templates = ${docs} documents (${tplName}). Review the list, then confirm.`
          : `${n} × ${tplName}. Review the list, then confirm.`)
      : callout('info', 'Ready when you are',
          `Choose a row to ${verb} ${each}. Nothing happens until you do.`));
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
    const perRow = true;   // always available; bulk is the opt-in
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

  if (s.allowBulk && stage === 'review' && n) {
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
  if (asks.length && stage === 'review' && n) {
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
function scoreAll(request, draft) {
  const needles = tokenise(request);
  const pool = scenarios.filter(s => s.active);
  // The one being edited competes too, even though it is not saved or active yet.
  if (draft && !pool.some(x => x.id === draft.id)) pool.push(draft);
  return pool.map(s => {
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
let testerRequest = '';
let testerStage = 0;
let testerPath = 'row';   // 'row' | 'bulk'

/* The stages a run actually goes through differ by mode, so the tester follows
   the scenario rather than assuming everyone presses one big button. */
function stagesFor(sc) {
  if (!sc) return [{ k:'ask', label:'Asked' }];
  const asks = tplsOf(sc).flatMap(t => (t.inputs || []).filter(i => i.required));
  const signing = tplsOf(sc).some(t => t.esign);
  const stages = [{ k:'review', label:'Reviews the list' }];
  if (testerPath === 'row') {
    stages.push({ k:'pick', label:'Picks one row' });
    // Only the per-row path can be asked a question: the bulk API cannot
    // carry user inputs at all.
    if (asks.length) stages.push({ k:'ask', label:'Answers a question' });
  }
  stages.push({ k:'running', label: signing ? 'Sending' : 'Generating' });
  stages.push({ k:'done', label: signing ? 'Sent' : 'Done' });
  return stages;
}

function runTest(request, force) {
  testerRequest = request;
  const ranked = scoreAll(request, force);
  const top = ranked[0];
  const ambiguous = !top || top.score < MIN_SCORE
    || (ranked[1] && (top.score - ranked[1].score) < MIN_MARGIN);
  const winner = ambiguous ? null : top.s;
  // When previewing a scenario we show THAT scenario's experience even if
  // another would win the phrase — and say so, because that is the finding.
  testerScenario = force || winner;
  testerStage = 0;
  testerPath = 'row';
  renderDiagnosis(ranked, ambiguous, top, force, winner);
  renderConvo();
}

/* ---- right: why it did that */
function renderDiagnosis(ranked, ambiguous, top, force, winner) {
  const host = $('#t-diagnosis');
  if (!host) return;
  const max = Math.max(1, top ? top.score : 1);
  const sc = testerScenario;
  const me = force ? ranked.find(r => r.s.id === force.id) : null;
  const mine = force && winner && winner.id === force.id;
  const rank = me ? ranked.indexOf(me) + 1 : null;

  let verdict, why;
  if (!force) {
    verdict = ambiguous ? ['pill-amber', 'No confident match'] : ['pill-green', 'Matched'];
    why = ambiguous
      ? `Nothing cleared ${MIN_SCORE}, or the top two were within ${MIN_MARGIN}.`
      : `${esc(top.s.name)}, ahead by ${top.score - (ranked[1]?.score || 0)}.`;
  } else if (mine) {
    verdict = ['pill-green', 'This scenario wins'];
    why = `Scored ${me.score}, ahead of the next by ${me.score - (ranked[1]?.score || 0)}.`;
  } else if (!me || me.score === 0) {
    // The common case while drafting, and the one worth being plain about.
    verdict = ['pill-amber', 'Not matched yet'];
    why = `Nothing in this scenario's name, description, guidance or phrasings matches
           those words. Add a phrasing in step 2 that sounds like it.`;
  } else if (ambiguous) {
    verdict = ['pill-amber', 'Too close to call'];
    why = `This scored ${me.score} at rank ${rank}, but nothing cleared ${MIN_SCORE}
           by a clear margin, so the user would be asked to choose.`;
  } else {
    verdict = ['pill-amber', `Second to “${esc(winner.name)}”`];
    why = `This scored ${me.score}; “${esc(winner.name)}” scored ${top.score}.
           Add this wording as a phrasing so this scenario claims it.`;
  }
  host.innerHTML = `
    <div class="diag-box">
      <div class="diag-title">Match</div>
      <div class="try-verdict">
        <span class="pill ${verdict[0]}">${esc(verdict[1])}</span>
        <span class="reason">${why}</span>
      </div>
      <table class="score-table">
        <thead><tr><th>Scenario</th><th>Score</th><th>Matched on</th></tr></thead>
        <tbody>${ranked.map(r => `<tr class="${
            force ? (r.s.id === force.id ? (mine ? 'win' : 'self') : '')
                  : (!ambiguous && r === top ? 'win' : '')}">
          <td>${esc(r.s.name)}${force && r.s.id === force.id
            ? ' <span class="row-self">this one</span>' : ''}</td>
          <td><i class="score-bar" style="width:${Math.round(r.score / max * 40)}px"></i>${r.score}</td>
          <td class="reason">${r.parts.filter(p => p[2]).map(p => `${p[0]} ×${p[2]}`).join(', ') || '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    ${sc ? `<div class="diag-box">
      <div class="diag-title">How it runs</div>
      <div class="reason">
        Row by row: <b>always</b> &nbsp;·&nbsp; Bulk generate:
        <b>${sc.allowBulk ? 'allowed' : 'off'}</b><br>
        ${tplsOf(sc).length} template${tplsOf(sc).length === 1 ? '' : 's'} ×
        ${resolve(sc).length} record${resolve(sc).length === 1 ? '' : 's'}
        = ${resolve(sc).length * Math.max(1, tplsOf(sc).length)} documents
        ${tplsOf(sc).some(t => t.esign) ? '<br><b>Sends for signature</b> — needs its own confirmation.' : ''}
        ${tplsOf(sc).flatMap(t => (t.inputs || []).filter(i => i.required)).length
          ? `<br>Asks for: ${esc(tplsOf(sc).flatMap(t => (t.inputs || []).filter(i => i.required)).map(i => i.label).join(', '))}`
          : ''}
      </div>
    </div>
    <div class="diag-box">
      <div class="diag-title">Query</div>
      ${soqlFor(sc)}
    </div>` : ''}`;
}

/* ---- left: what the user sees, as a conversation */
function renderConvo() {
  const sc = testerScenario;
  const stages = stagesFor(sc);
  if (testerStage >= stages.length) testerStage = stages.length - 1;

  const pill = $('#t-mode-pill');
  if (sc && sc.allowBulk) {
    pill.innerHTML = `<button class="path-btn ${testerPath === 'row' ? 'on' : ''}" data-path="row">One row</button>
                      <button class="path-btn ${testerPath === 'bulk' ? 'on' : ''}" data-path="bulk">All at once</button>`;
    $$('[data-path]').forEach(b => b.onclick = () => {
      testerPath = b.dataset.path; testerStage = 0; renderConvo();
    });
  } else {
    pill.textContent = sc ? 'one row at a time' : '';
  }
  $('#t-stage-seg').innerHTML = stages.map((st, i) =>
    `<button class="seg-btn ${i === testerStage ? 'active' : ''}" data-stage="${i}">${st.label}</button>`).join('');
  $$('#t-stage-seg .seg-btn').forEach(b => b.onclick = () => {
    testerStage = +b.dataset.stage; renderConvo();
  });

  const turns = [`<div class="turn-user">${esc(testerRequest)}</div>`];

  if (!sc) {
    turns.push(`<div class="mcp-card">
      <div class="mc-head"><div><div class="mc-title">Which scenario did you mean?</div>
      <div class="mc-sub">More than one could match.</div></div>
      <span class="mc-badge info">Needs a choice</span></div>
      ${callout('info','Pick a scenario','Call discover for full details, or run one directly.')}
      <div class="mc-chips">${scenarios.filter(x => x.active).slice(0,5).map(x =>
        `<button class="mc-chip">${esc(x.name)}</button>`).join('')}</div></div>`);
    $('#t-convo').innerHTML = turns.join('');
    return;
  }

  const key = stages[testerStage].k;
  const idx = k => stages.findIndex(st => st.k === k);
  const reached = k => idx(k) !== -1 && testerStage >= idx(k);
  const asks = tplsOf(sc).flatMap(t => (t.inputs || []).filter(i => i.required));
  const signing = tplsOf(sc).some(t => t.esign);
  // Per-record runs act on ONE record, so the counts must shrink to match.
  const one = { ...sc, maxRecords: 1 };
  const scoped = reached('pick') ? one : sc;

  turns.push(`<div class="mcp-card">${renderCard(sc, 'review')}</div>`);

  if (reached('pick')) {
    const first = resolve(sc)[0];
    const label = first ? String(first[sc.slots[0]] ?? 'that record') : 'that record';
    turns.push(`<div class="turn-note">presses ${signing ? 'Send' : 'Generate'} on ${esc(label)}</div>`);
  }
  if (reached('ask') && asks.length) {
    turns.push(`<div class="turn-bot">Before I ${signing ? 'send' : 'generate'} that, what should
      <b>${esc(asks.map(i => i.label).join('</b> and <b>'))}</b> be?</div>`);
    turns.push(`<div class="turn-user">${esc(asks.map(i =>
      i.dataType === 'DateType' ? '30 September 2026' : 'Standard terms').join(', '))}</div>`);
  }
  if (key === 'running') {
    turns.push(`<div class="mcp-card">${renderCard(scoped, 'running')}</div>`);
  }
  if (key === 'done') {
    turns.push(`<div class="mcp-card">${renderCard(scoped, 'done')}</div>`);
  }
  $('#t-convo').innerHTML = turns.join('');
}

function soqlFor(s) {
  const cols = columnsOf(s);
  const sel = ['Id', ...cols.map(c => c.path)].join(', ');
  const where = [];
  if (usesApex(s)) where.push('Id IN :scopeIds');
  else {
    if (usesDate(s) && s.dateField && s.window) where.push(`${s.dateField} = ${s.window}`);
    if (usesConds(s) && s.extraFilter) where.push(`(${s.extraFilter})`);
  }
  const note = s.resolverClass
    ? `<span class="cm">// ${esc(s.resolverClass)} already chose the records;\n`
      + `// this only reads the mapped columns back</span>\n`
    : `<span class="cm">// built from config; never from user text</span>\n`;
  return `<div class="soql-box">${note}<span class="kw">SELECT</span> ${esc(sel)}
<span class="kw">FROM</span> ${esc(s.object)}${where.length ? `
<span class="kw">WHERE</span> ${esc(where.join(' AND '))}` : ''}
<span class="kw">LIMIT</span> ${s.maxRecords}  <span class="cm">— USER_MODE</span></div>`;
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

$('#btn-docs').onclick = () => { $('#drawer').hidden = false; $('#drawer-scrim').hidden = false; };
const closeDrawer = () => { $('#drawer').hidden = true; $('#drawer-scrim').hidden = true; };
$('#drawer-close').onclick = closeDrawer;
$('#drawer-scrim').onclick = closeDrawer;

renderList();
