(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const doc = $('#doc');
  const panel = $('#side-panel');
  const pageWrap = $('#page-wrap');
  const handle = $('#block-handle');
  const insertMenu = $('#insert-menu');
  const fieldPop = $('#field-pop');
  const miniPop = $('#mini-pop');
  const atPop = $('#at-pop');

  const state = {
    sections: {},
    conds: {},
    uid: 0,
    mode: 'edit',
    selected: null,          // { type: 'rs' | 'cond', id }
    savedRange: null,
    handleTarget: null,
    at: null,                // active @-mention: { node, offset, items, hl }
    preview: { source: 'sample', recordId: DEALS[0].id, outlines: true },
  };
  const uid = (p) => `${p}${++state.uid}`;

  // ---------------------------------------------------------------- icons
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;
  const ICON = {
    repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
    branch: svg('<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 5-8 3-11.5 7"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    x: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 'stroke-width="2.4"'),
    info: svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>'),
    text: svg('<path d="M5 7V5h14v2"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="9" y1="19" x2="15" y2="19"/>'),
    heading: svg('<path d="M6 4v16M18 4v16M6 12h12"/>', 'stroke-width="2.4"'),
    list: svg('<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>'),
    table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="4" x2="12" y2="20"/>'),
    related: svg('<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="8" height="6" rx="1"/><rect x="14" y="16" width="8" height="6" rx="1"/><path d="M12 8v4M6 16v-2h12v2"/>'),
    pagebreak: svg('<path d="M5 3v5h14V3M5 21v-5h14v5"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/>'),
    box: svg('<path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>'),
    users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>'),
    flag: svg('<path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5"/>'),
    file: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
    upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><line x1="12" y1="3" x2="12" y2="15"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0"/>'),
    alignL: svg('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="14" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="4" y1="18" x2="14" y2="18"/>'),
    alignC: svg('<line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="7" y1="18" x2="17" y2="18"/>'),
    alignR: svg('<line x1="4" y1="6" x2="20" y2="6"/><line x1="10" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="10" y1="18" x2="20" y2="18"/>'),
    alignJ: svg('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="4" y1="18" x2="20" y2="18"/>'),
  };
  const TYPE_ICON = {
    text: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h8M12 8v9"/>'),
    picklist: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10l4 4 4-4"/>'),
    number: svg('<line x1="5" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="19" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>'),
    currency: svg('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
    percent: svg('<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
    date: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    boolean: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>'),
    image: ICON.image,
    position: svg('<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><path d="M3 5l1.5-1v4M3 8h3" stroke-width="1.4"/>'),
  };
  const typeIcon = (t) => TYPE_ICON[t] || TYPE_ICON.text;
  const TYPE_NAME = { text: 'Text', picklist: 'Picklist', number: 'Number', currency: 'Currency', percent: 'Percent', date: 'Date', boolean: 'Checkbox', image: 'Image', position: 'Position' };

  // ---------------------------------------------------------------- schema helpers
  const listDef = (key) => RELATED_LISTS.find((l) => l.key === key);
  const INDEX_FIELD = { key: '$index', label: 'Item number', type: 'number', meta: true };
  const POSITION_FIELD = { key: '$position', label: 'Item position', type: 'position' };
  const itemFields = (listKey) => { const l = listDef(listKey); return l ? [INDEX_FIELD, ...l.fields] : []; };
  const recordField = (key) => DEAL_FIELDS.find((f) => f.key === key);
  function fieldFor(scope, key, listKey) {
    if (scope === 'record') return recordField(key);
    if (scope === 'pos') return POSITION_FIELD;
    return itemFields(listKey).find((f) => f.key === key);
  }
  function fieldLabel(scope, key, listKey) {
    const f = fieldFor(scope, key, listKey);
    if (!f) return key;
    if (scope === 'record') return f.label;
    return f.label;
  }

  const OPS = {
    text: [['eq', 'equals'], ['neq', 'does not equal'], ['contains', 'contains'], ['empty', 'is empty'], ['notempty', 'is not empty']],
    picklist: [['eq', 'equals'], ['neq', 'does not equal'], ['empty', 'is empty'], ['notempty', 'is not empty']],
    number: [['gt', '>'], ['gte', '≥'], ['eq', '='], ['neq', '≠'], ['lt', '<'], ['lte', '≤'], ['empty', 'is empty']],
    boolean: [['true', 'is true'], ['false', 'is false']],
    date: [['before', 'is before'], ['after', 'is after'], ['empty', 'is empty']],
    image: [['notempty', 'is set'], ['empty', 'is empty']],
    position: [['first', 'is first'], ['last', 'is last'], ['notfirst', 'is not first'], ['notlast', 'is not last'], ['odd', 'is odd (1st, 3rd…)'], ['even', 'is even (2nd, 4th…)']],
  };
  const opsFor = (type) => OPS[type === 'currency' || type === 'percent' ? 'number' : type] || OPS.text;
  const NO_VALUE_OPS = new Set(['empty', 'notempty', 'true', 'false', 'first', 'last', 'notfirst', 'notlast', 'odd', 'even']);

  function ruleText(rule, listKey) {
    const f = fieldFor(rule.scope, rule.field, listKey);
    if (!f) return '(missing field)';
    const op = (opsFor(f.type).find((o) => o[0] === rule.op) || ['', rule.op])[1];
    const name = rule.scope === 'record' ? f.label : f.label;
    if (NO_VALUE_OPS.has(rule.op)) return `${name} ${op}`;
    let v = rule.value === '' || rule.value == null ? '…' : rule.value;
    if (f.type === 'currency' && v !== '…') v = '$' + Number(v).toLocaleString();
    if (f.type === 'percent' && v !== '…') v = v + '%';
    return `${name} ${op} ${v}`;
  }

  // ---------------------------------------------------------------- values + formatting
  const isEmpty = (v) => v === null || v === undefined || v === '';
  const FORMATS = {
    currency: [['', '$1,234.56'], ['round', '$1,235'], ['words', 'USD 1,234.56']],
    date: [['', 'Sep 25, 2026'], ['long', 'September 25, 2026'], ['iso', '2026-09-25'], ['us', '09/25/2026']],
    text: [['', 'As entered'], ['upper', 'UPPERCASE'], ['title', 'Title Case']],
    picklist: [['', 'As entered'], ['upper', 'UPPERCASE']],
    number: [['', '1,234'], ['plain', '1234']],
    percent: [['', '12%'], ['decimal', '12.0%']],
    boolean: [['', 'Yes / No'], ['check', '☑ / ☐'], ['truefalse', 'True / False']],
    image: [['', 'Original size'], ['small', 'Small (80px)'], ['large', 'Large (160px)']],
  };
  function formatValue(v, type, fmt) {
    switch (type) {
      case 'currency':
        if (fmt === 'round') return '$' + Math.round(v).toLocaleString('en-US');
        if (fmt === 'words') return 'USD ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'percent': return fmt === 'decimal' ? Number(v).toFixed(1) + '%' : v + '%';
      case 'number': return fmt === 'plain' ? String(v) : Number(v).toLocaleString('en-US');
      case 'date': {
        const d = new Date(v + 'T00:00:00');
        if (fmt === 'iso') return v;
        if (fmt === 'us') return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        return d.toLocaleDateString('en-US', { month: fmt === 'long' ? 'long' : 'short', day: 'numeric', year: 'numeric' });
      }
      case 'boolean':
        if (fmt === 'check') return v ? '☑' : '☐';
        if (fmt === 'truefalse') return v ? 'True' : 'False';
        return v ? 'Yes' : 'No';
      default: {
        const s = String(v);
        if (fmt === 'upper') return s.toUpperCase();
        if (fmt === 'title') return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
        return s;
      }
    }
  }
  const TYPE_COLORS = { Hardware: ['#dfe8ff', '#3552c7'], Software: ['#dcf5e8', '#1e7a4c'], Service: ['#fdebd6', '#a45a0b'] };
  function productImage(item, sample) {
    const [bg, fg] = sample ? ['#eceef2', '#9aa0aa'] : (TYPE_COLORS[item.product_type] || ['#eceef2', '#666']);
    const initials = sample ? 'IMG' : String(item.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="168" viewBox="0 0 224 168"><rect width="224" height="168" fill="${bg}"/><rect x="62" y="34" width="100" height="72" rx="10" fill="none" stroke="${fg}" stroke-width="5" opacity=".45"/><text x="112" y="82" font-family="Arial" font-size="30" font-weight="700" fill="${fg}" text-anchor="middle">${initials}</text><text x="112" y="140" font-family="Arial" font-size="15" fill="${fg}" text-anchor="middle" opacity=".8">${sample ? 'Sample image' : esc(item.product_type || '')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  // ---------------------------------------------------------------- rule evaluation
  function valueOf(rule, item, idx, record) {
    if (rule.scope === 'record') return record[rule.field];
    if (rule.field === '$index') return idx + 1;
    return item[rule.field];
  }
  function evalRule(rule, item, idx, n, record, listKey) {
    if (rule.scope === 'pos') {
      switch (rule.op) {
        case 'first': return idx === 0;
        case 'last': return idx === n - 1;
        case 'notfirst': return idx !== 0;
        case 'notlast': return idx !== n - 1;
        case 'odd': return (idx + 1) % 2 === 1;
        case 'even': return (idx + 1) % 2 === 0;
      }
      return true;
    }
    const f = fieldFor(rule.scope, rule.field, listKey);
    if (!f) return true;
    const v = valueOf(rule, item, idx, record);
    const numeric = ['number', 'currency', 'percent'].includes(f.type);
    const val = rule.value;
    switch (rule.op) {
      case 'empty': return isEmpty(v);
      case 'notempty': return !isEmpty(v);
      case 'true': return v === true;
      case 'false': return !v;
    }
    if (val === '' || val == null) return true; // incomplete rule: don't hide anything
    switch (rule.op) {
      case 'eq': return numeric ? Number(v) === Number(val) : String(v ?? '').toLowerCase() === String(val).toLowerCase();
      case 'neq': return numeric ? Number(v) !== Number(val) : String(v ?? '').toLowerCase() !== String(val).toLowerCase();
      case 'contains': return String(v ?? '').toLowerCase().includes(String(val).toLowerCase());
      case 'gt': return Number(v) > Number(val);
      case 'gte': return Number(v) >= Number(val);
      case 'lt': return Number(v) < Number(val);
      case 'lte': return Number(v) <= Number(val);
      case 'before': return !isEmpty(v) && v < val;
      case 'after': return !isEmpty(v) && v > val;
    }
    return true;
  }
  function evalRules(rules, match, item, idx, n, record, listKey) {
    if (!rules.length) return true;
    const fn = (r) => evalRule(r, item, idx, n, record, listKey);
    return match === 'any' ? rules.some(fn) : rules.every(fn);
  }
  function itemsFor(cfg, ctx) {
    const all = (ctx.lists[cfg.source] || []).slice();
    let items = all.filter((it) => evalRules(cfg.filters, cfg.filterMatch, it, 0, 1, ctx.record, cfg.source));
    const afterFilter = items.length;
    if (cfg.sort.field) {
      const f = fieldFor('item', cfg.sort.field, cfg.source);
      const numeric = f && ['number', 'currency', 'percent'].includes(f.type);
      items.sort((a, b) => {
        const x = a[cfg.sort.field], y = b[cfg.sort.field];
        const c = numeric ? (Number(x) || 0) - (Number(y) || 0) : String(x ?? '').localeCompare(String(y ?? ''));
        return cfg.sort.dir === 'desc' ? -c : c;
      });
    }
    if (cfg.limit) items = items.slice(0, Number(cfg.limit));
    return { items, total: all.length, filteredOut: all.length - afterFilter, limitedOut: afterFilter - items.length };
  }

  // ---------------------------------------------------------------- building blocks
  function chipEl(scope, key, opts = {}) {
    const s = document.createElement('span');
    s.className = `mf mf-${scope}`;
    s.contentEditable = 'false';
    s.dataset.scope = scope;
    s.dataset.field = key;
    s.dataset.fallback = opts.fallback || '';
    s.dataset.format = opts.format || '';
    s.innerHTML = '<span class="mf-ico"></span><span class="mf-label"></span>';
    return s;
  }
  const chip = (scope, key, opts) => chipEl(scope, key, opts).outerHTML;

  function refreshChips(root = doc) {
    $$('.mf', root).forEach((ch) => {
      const scope = ch.dataset.scope, key = ch.dataset.field;
      let f, label;
      if (scope === 'record') { f = recordField(key); label = f ? f.label : key; }
      else {
        const rs = ch.closest('.rs');
        const src = rs && state.sections[rs.dataset.rs]?.source;
        const l = listDef(src);
        f = l && itemFields(src).find((x) => x.key === key);
        label = `${l ? l.singular : 'Item'}.${f ? f.label : key}`;
        if (!f) label += ' (not on ' + (l ? l.label : 'this list') + ')';
      }
      ch.classList.toggle('mf-invalid', !f);
      ch.classList.toggle('mf-image', f?.type === 'image');
      ch.classList.toggle('has-fallback', !!ch.dataset.fallback);
      ch.querySelector('.mf-ico').innerHTML = typeIcon(f?.type);
      ch.querySelector('.mf-label').textContent = label;
      ch.title = ch.dataset.fallback ? `If empty, shows “${ch.dataset.fallback}”` : 'Click to format or set a fallback';
    });
  }

  function defaultSection(source = null) {
    return {
      source, filters: [], filterMatch: 'all', sort: { field: '', dir: 'asc' }, limit: '',
      separator: 'none', zebra: false, zebraColor: '#f4f6fb', emptyMode: 'hide', emptyText: 'No items to show.',
    };
  }

  function sectionEl(id) {
    const el = document.createElement('div');
    el.className = 'rs';
    el.dataset.rs = id;
    el.contentEditable = 'false';
    el.innerHTML = `
      <div class="rs-head">
        <span class="rs-tag">${ICON.repeat}<span class="rs-title"></span></span>
        <span class="rs-summary"></span>
        <span class="rs-actions">
          <button class="rs-btn" data-act="rs-settings" title="Section settings">${ICON.gear}</button>
          <button class="rs-btn" data-act="rs-delete" title="Delete section">${ICON.trash}</button>
        </span>
      </div>
      <div class="rs-picker"></div>
      <div class="rs-body" contenteditable="true"><p><br></p></div>
      <div class="rs-foot"><span>${ICON.repeat} End of repeat</span></div>
      <div class="rs-stack"></div><div class="rs-stack two"></div>`;
    return el;
  }

  function sectionSummary(cfg) {
    const parts = [];
    if (cfg.filters.length) parts.push('where ' + cfg.filters.map((r) => ruleText(r, cfg.source)).join(cfg.filterMatch === 'any' ? ' or ' : ' and '));
    if (cfg.sort.field) parts.push(`by ${fieldLabel('item', cfg.sort.field, cfg.source)} ${cfg.sort.dir === 'desc' ? '↓' : '↑'}`);
    parts.push(cfg.limit ? `first ${cfg.limit}` : 'all records');
    const sep = { divider: 'divider between', space: 'space between', pagebreak: 'page break between' }[cfg.separator];
    if (sep) parts.push(sep);
    return parts.join(' · ');
  }

  function updateSectionChrome(id) {
    const el = doc.querySelector(`[data-rs="${id}"]`);
    if (!el) return;
    const cfg = state.sections[id];
    const l = listDef(cfg.source);
    el.classList.toggle('is-unbound', !l);
    el.querySelector('.rs-title').innerHTML = l ? `Repeat for each <b>${l.singular}</b>` : 'Repeating Section';
    el.querySelector('.rs-summary').textContent = l ? sectionSummary(cfg) : '';
    if (!l) {
      el.querySelector('.rs-picker').innerHTML = `
        <div class="rs-picker-title">What should this section repeat for?</div>
        <div class="rs-picker-sub">Pick a related list on Deal. Everything you put in this section repeats once per record in that list.</div>
        <div class="rs-picker-grid">
          ${RELATED_LISTS.map((x) => `
            <button class="rs-pick" data-act="rs-pick" data-list="${x.key}">
              <span class="rs-pick-ico">${ICON[x.icon]}</span>
              <span><b>${x.label}</b><small>${x.description}</small></span>
            </button>`).join('')}
        </div>`;
    }
    refreshChips(el);
    $$('.cond', el).forEach((c) => updateCondChrome(c.dataset.cond));
  }

  function condEl(id) {
    const el = document.createElement('div');
    el.className = 'cond';
    el.dataset.cond = id;
    el.contentEditable = 'false';
    el.innerHTML = `
      <div class="cond-head">${ICON.branch}<span class="cond-kw">Show if</span><span class="cond-summary"></span>
        <button class="cond-btn" data-act="cond-delete" title="Remove condition (keep nothing)">${ICON.x}</button>
      </div>
      <div class="cond-body" contenteditable="true"><p><br></p></div>`;
    return el;
  }
  function sectionOf(el) {
    const rs = el?.closest?.('.rs');
    return rs ? { el: rs, id: rs.dataset.rs, cfg: state.sections[rs.dataset.rs] } : null;
  }
  function updateCondChrome(id) {
    const el = doc.querySelector(`[data-cond="${id}"]`);
    if (!el) return;
    const c = state.conds[id];
    const src = sectionOf(el)?.cfg?.source;
    el.classList.toggle('is-empty', !c.rules.length);
    el.querySelector('.cond-summary').textContent = c.rules.length
      ? c.rules.map((r) => ruleText(r, src)).join(c.match === 'any' ? ' or ' : ' and ')
      : 'Click to add a condition…';
  }

  // ---------------------------------------------------------------- seed document
  function seed() {
    const rsId = uid('rs');
    state.sections[rsId] = {
      ...defaultSection('line_items'),
      filters: [{ scope: 'item', field: 'quantity', op: 'gt', value: '0' }],
      sort: { field: 'net_price', dir: 'desc' },
      separator: 'divider',
      emptyMode: 'message',
      emptyText: 'No products have been added to this deal yet.',
    };
    const c1 = uid('c'), c2 = uid('c'), c3 = uid('c');
    state.conds[c1] = { match: 'all', rules: [{ scope: 'item', field: 'product_type', op: 'eq', value: 'Hardware' }] };
    state.conds[c2] = { match: 'all', rules: [{ scope: 'item', field: 'is_recurring', op: 'true', value: '' }] };
    state.conds[c3] = { match: 'all', rules: [{ scope: 'pos', field: '$position', op: 'last', value: '' }] };

    const lockLine = (t) => `<div class="locked-line" contenteditable="false"><span>${t}</span>${ICON.lock}</div>`;
    const sig = (label, icon = 'text') => `<span class="sig-tag" contenteditable="false">${TYPE_ICON[icon].replace('<svg', '<svg width="11" height="11"')}${label}</span>`;

    doc.innerHTML = `
      <h1>Quote# ${chip('record', 'record_id')}</h1>
      <p class="center">For ${chip('record', 'company')}</p>
      <table class="co-table"><tbody>
        <tr><th>${chip('record', 'company')}</th><th></th></tr>
        <tr><td>${chip('record', 'street')}<br>${chip('record', 'city')}<br>${chip('record', 'state')} - ${chip('record', 'postal')}</td><td></td></tr>
      </tbody></table>
      <h2>Included Products</h2>
      <div class="legacy-rl" contenteditable="false" title="Existing Related List widget (table)">
        <table><thead><tr><th>Product type</th><th>Name</th><th>Quantity</th><th>Net price</th><th>Create Date</th></tr></thead>
        <tbody><tr><td class="lbl"></td><td>Name</td><td>Quantity</td><td>Net price</td><td>Create Date</td></tr></tbody></table>
      </div>
      <h2>Product details</h2>
      <div id="seed-rs"></div>
      <ol>
        <li>Notice of Termination
          <ol><li>By Customer ( ${chip('record', 'company')} )</li><li>By S-Docs</li><li>Amount not exceeding ${chip('record', 'amount')}</li></ol>
        </li>
        <li>Special Clauses</li>
      </ol>
      <p><br></p>
      ${lockLine('Do not modify anything below this')}
      <p><br></p>
      <p>${sig('Signature', 'picklist')}</p>
      <p>${sig('Text')} ${sig('Signature Date', 'date')}</p>
      <p>${sig('Signature', 'picklist')}</p>
      <p><br></p>`;

    const rs = sectionEl(rsId);
    $('#seed-rs', doc).replaceWith(rs);
    const body = rs.querySelector('.rs-body');
    body.innerHTML = `
      <h3>${chip('item', 'name')}</h3>
      <div class="media-row">
        ${chip('item', 'product_image')}
        <div>
          <p>${chip('item', 'description', { fallback: 'No description provided.' })}</p>
          <p><span style="color:#5c6370">SKU</span> ${chip('item', 'sku')} &nbsp;·&nbsp; <span style="color:#5c6370">Type</span> ${chip('item', 'product_type')}</p>
          <p>Quantity ${chip('item', 'quantity')} × ${chip('item', 'unit_price')} &nbsp;·&nbsp; Discount ${chip('item', 'discount')}</p>
        </div>
      </div>`;
    const mkCond = (id, html) => { const c = condEl(id); c.querySelector('.cond-body').innerHTML = html; return c; };
    body.appendChild(mkCond(c1, `<p><i>Includes a 3-year hardware warranty with next-business-day replacement.</i></p>`));
    body.appendChild(mkCond(c2, `<p>Billed annually for ${chip('item', 'term_months', { fallback: '12' })} months. Renews automatically unless cancelled 30 days before the end of the term.</p>`));
    const total = document.createElement('p');
    total.innerHTML = `Line total: <b>${chip('item', 'net_price')}</b>`;
    body.appendChild(total);
    body.appendChild(mkCond(c3, `<p style="color:#5c6370;font-size:11px">All prices are in USD and exclude applicable taxes.</p>`));

    updateSectionChrome(rsId);
    refreshChips();
  }

  // ---------------------------------------------------------------- selection + panel
  function select(type, id) {
    if (state.selected?.type === type && state.selected?.id === id) return;
    state.selected = type ? { type, id } : null;
    $$('.rs.is-selected, .cond.is-selected', doc).forEach((e) => e.classList.remove('is-selected'));
    if (type === 'rs') doc.querySelector(`[data-rs="${id}"]`)?.classList.add('is-selected');
    if (type === 'cond') doc.querySelector(`[data-cond="${id}"]`)?.classList.add('is-selected');
    renderPanel();
  }

  function renderPanel() {
    const s = state.selected;
    if (!s || state.mode !== 'edit') { panel.hidden = true; return; }
    panel.hidden = false;
    if (s.type === 'rs') renderSectionPanel(s.id);
    else renderCondPanel(s.id);
  }

  function fieldOptions(fields, scope, selected, withPlaceholder) {
    return (withPlaceholder ? `<option value="">${withPlaceholder}</option>` : '') +
      fields.map((f) => `<option value="${scope}:${f.key}" ${selected === `${scope}:${f.key}` ? 'selected' : ''}>${esc(f.label)}</option>`).join('');
  }

  function ruleRowHTML(rule, i, listKey, groups, kind) {
    const f = fieldFor(rule.scope, rule.field, listKey);
    const ops = opsFor(f?.type);
    const cur = `${rule.scope}:${rule.field}`;
    const fieldSel = groups.map((g) => g.fields.length ? `<optgroup label="${esc(g.label)}">${fieldOptions(g.fields, g.scope, cur)}</optgroup>` : '').join('');
    const needsValue = !NO_VALUE_OPS.has(rule.op);
    let valueCtl = '';
    if (needsValue) {
      if (f?.type === 'picklist') {
        valueCtl = `<select class="r-val" data-r="value"><option value="">Choose…</option>${f.options.map((o) => `<option ${o === rule.value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      } else {
        const t = f?.type === 'date' ? 'date' : ['number', 'currency', 'percent'].includes(f?.type) ? 'number' : 'text';
        valueCtl = `<input class="r-val" data-r="value" type="${t}" value="${esc(rule.value)}" placeholder="Value">`;
      }
    }
    return `
      ${i > 0 ? `<div class="rule-join">${kind === 'filter' ? (state.sections[state.selected.id].filterMatch === 'any' ? 'or' : 'and') : (state.conds[state.selected.id].match === 'any' ? 'or' : 'and')}</div>` : ''}
      <div class="rule" data-i="${i}">
        <select class="r-field" data-r="field">${fieldSel}</select>
        <button class="rule-x" data-act="rm-rule" data-i="${i}" title="Remove">${ICON.x}</button>
        <select class="r-op ${needsValue ? '' : 'wide'}" data-r="op">${ops.map((o) => `<option value="${o[0]}" ${o[0] === rule.op ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>
        ${valueCtl}
      </div>`;
  }

  function statLine(cfg, forCond) {
    // Show how the settings play out on sample data and on the first live record.
    const ctxs = [{ name: 'Sample data', ctx: SAMPLE }, { name: DEALS[0].label.split(' — ')[0], ctx: DEALS[0] }];
    return ctxs.map(({ name, ctx }) => {
      const r = itemsFor(cfg, ctx);
      const l = listDef(cfg.source);
      if (!forCond) return `<b>${name}:</b> ${r.items.length} of ${r.total} ${r.total === 1 ? l.singular.toLowerCase() : l.label.toLowerCase()} shown`;
      const c = state.conds[forCond];
      const hits = r.items.filter((it, i) => evalRules(c.rules, c.match, it, i, r.items.length, ctx.record, cfg.source)).length;
      return `<b>${name}:</b> shows for ${hits} of ${r.items.length} repeated ${l.label.toLowerCase()}`;
    }).join('<br>');
  }

  function renderSectionPanel(id) {
    const cfg = state.sections[id];
    const l = listDef(cfg.source);
    if (!l) {
      panel.innerHTML = `
        <div class="sp-head"><div><div class="sp-title rs-c">${ICON.repeat}<span>Repeating Section</span></div>
        <div class="sp-sub">Choose a related list to repeat over</div></div>
        <button class="sp-close" data-act="panel-close">${ICON.x}</button></div>
        <div class="sp-scroll"><div class="sp-sec">
          <div class="sp-row"><label>Source</label><select data-k="source"><option value="">Select a related list</option>${RELATED_LISTS.map((x) => `<option value="${x.key}">${x.label}</option>`).join('')}</select></div>
          <div class="sp-hint" style="margin-top:6px">A Repeating Section is like the Related List table, but free-form: add headings, paragraphs, images, fields and conditional blocks. They repeat once per related record.</div>
        </div></div>`;
      return;
    }
    const fields = l.fields;
    const filterRules = cfg.filters.map((r, i) => ruleRowHTML(r, i, cfg.source, [{ label: `${l.singular} fields`, scope: 'item', fields }, { label: 'Deal fields', scope: 'record', fields: DEAL_FIELDS }], 'filter')).join('');
    const seps = [['none', 'None'], ['divider', 'Divider'], ['space', 'Space'], ['pagebreak', 'Page break']];
    const zebraColors = ['#f4f6fb', '#f6f6f6', '#fdf7ec', '#eef8f2', '#fbf0f7'];
    panel.innerHTML = `
      <div class="sp-head">
        <div><div class="sp-title rs-c">${ICON.repeat}<span>Repeating Section</span></div>
        <div class="sp-sub">Content repeats once for each ${l.singular.toLowerCase()}</div></div>
        <button class="sp-close" data-act="panel-close">${ICON.x}</button>
      </div>
      <div class="sp-scroll">
        <div class="sp-sec">
          <div class="sp-sec-title">Data</div>
          <div class="sp-row"><label>Source</label><select data-k="source">${RELATED_LISTS.map((x) => `<option value="${x.key}" ${x.key === cfg.source ? 'selected' : ''}>${x.label}</option>`).join('')}</select></div>
          <div class="sp-row top"><label>Filter</label>
            <div class="rules">
              ${cfg.filters.length > 1 ? `<div class="match-row">Include records matching <select data-k="filterMatch"><option value="all" ${cfg.filterMatch === 'all' ? 'selected' : ''}>all</option><option value="any" ${cfg.filterMatch === 'any' ? 'selected' : ''}>any</option></select> of these</div>` : ''}
              ${filterRules}
              <button class="link-btn" data-act="add-filter">+ Add filter</button>
            </div>
          </div>
          <div class="sp-row"><label>Sort</label>
            <div class="inline2">
              <select data-k="sortField"><option value="">None</option>${fields.filter((f) => f.type !== 'image').map((f) => `<option value="${f.key}" ${f.key === cfg.sort.field ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>
              <select data-k="sortDir" ${cfg.sort.field ? '' : 'disabled'}><option value="asc" ${cfg.sort.dir === 'asc' ? 'selected' : ''}>Ascending</option><option value="desc" ${cfg.sort.dir === 'desc' ? 'selected' : ''}>Descending</option></select>
            </div>
          </div>
          <div class="sp-row"><label>Limit</label><input type="number" min="1" data-k="limit" value="${esc(cfg.limit)}" placeholder="All records"></div>
          <div class="sp-stat" id="sp-stat">${ICON.info}<div>${statLine(cfg)}</div></div>
        </div>

        <div class="sp-sec">
          <div class="sp-sec-title">Layout</div>
          <div class="sp-row top"><label>Between items</label>
            <div class="seg-full" data-seg="separator">${seps.map(([k, t]) => `<button data-v="${k}" class="${cfg.separator === k ? 'on' : ''}">${t}</button>`).join('')}</div>
          </div>
          <div class="sp-row top"><label>Shading</label>
            <div>
              <label class="chk"><input type="checkbox" data-k="zebra" ${cfg.zebra ? 'checked' : ''}> Shade every other item</label>
              ${cfg.zebra ? `<div class="swatches">${zebraColors.map((c) => `<button data-act="zebra-color" data-c="${c}" style="background:${c}" class="${cfg.zebraColor === c ? 'on' : ''}"></button>`).join('')}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="sp-sec">
          <div class="sp-sec-title">When there are no ${l.label.toLowerCase()}</div>
          <label class="radio"><input type="radio" name="empty-${id}" data-k="emptyMode" value="hide" ${cfg.emptyMode === 'hide' ? 'checked' : ''}> Hide the section</label>
          <label class="radio"><input type="radio" name="empty-${id}" data-k="emptyMode" value="message" ${cfg.emptyMode === 'message' ? 'checked' : ''}> Show a message</label>
          ${cfg.emptyMode === 'message' ? `<textarea class="sp-textarea" data-k="emptyText">${esc(cfg.emptyText)}</textarea>` : ''}
        </div>

        <div class="sp-sec">
          <div class="sp-sec-title">Fields</div>
          <div class="sp-hint">Click to insert at the cursor, or type <kbd>@</kbd> inside the section. Blue fields change for each ${l.singular.toLowerCase()}; pink fields come from the Deal.</div>
          <div class="field-list">
            ${itemFields(cfg.source).map((f) => `<button class="field-btn" data-act="insert-field" data-scope="item" data-field="${f.key}"><span class="at-dot item">${typeIcon(f.type)}</span>${esc(f.label)}<span class="ft">${TYPE_NAME[f.type]}</span></button>`).join('')}
          </div>
          <div class="sp-subtitle">From the Deal</div>
          <div class="field-list">
            ${DEAL_FIELDS.slice(0, 5).map((f) => `<button class="field-btn rec" data-act="insert-field" data-scope="record" data-field="${f.key}"><span class="at-dot record">${typeIcon(f.type)}</span>${esc(f.label)}<span class="ft">${TYPE_NAME[f.type]}</span></button>`).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderCondPanel(id) {
    const c = state.conds[id];
    const condNode = doc.querySelector(`[data-cond="${id}"]`);
    const sec = sectionOf(condNode);
    const l = listDef(sec?.cfg?.source);
    const groups = [
      { label: 'Loop', scope: 'pos', fields: [POSITION_FIELD] },
      { label: l ? `${l.singular} fields` : 'Item fields', scope: 'item', fields: l ? itemFields(sec.cfg.source) : [] },
      { label: 'Deal fields', scope: 'record', fields: DEAL_FIELDS },
    ];
    panel.innerHTML = `
      <div class="sp-head">
        <div><div class="sp-title cond-c">${ICON.branch}<span>Conditional Block</span></div>
        <div class="sp-sub">Show this content only for ${l ? l.label.toLowerCase() : 'items'} that match</div></div>
        <button class="sp-close" data-act="panel-close">${ICON.x}</button>
      </div>
      <div class="sp-scroll">
        <div class="sp-sec">
          <div class="sp-sec-title">Conditions</div>
          ${c.rules.length > 1 ? `<div class="match-row">Show when <select data-k="match"><option value="all" ${c.match === 'all' ? 'selected' : ''}>all</option><option value="any" ${c.match === 'any' ? 'selected' : ''}>any</option></select> of these are true</div>` : ''}
          <div class="rules">
            ${c.rules.map((r, i) => ruleRowHTML(r, i, sec?.cfg?.source, groups, 'cond')).join('')}
            <button class="link-btn" data-act="add-cond-rule">+ Add condition</button>
          </div>
          ${!c.rules.length ? `<div class="sp-hint" style="margin-top:8px">With no conditions, the content always shows.</div>` : ''}
          ${l ? `<div class="sp-stat cond-s" id="sp-stat">${ICON.info}<div>${statLine(sec.cfg, id)}</div></div>` : ''}
        </div>
        <div class="sp-sec">
          <div class="sp-sec-title">Tips</div>
          <div class="sp-hint" style="margin:0">Use <b>Item position</b> for content that depends on where the item falls, like a note after the last item, or a heading before the first.<br><br>For dividers between items or shading every other item, use the parent section's <a href="#" data-act="goto-section" class="link-btn" style="padding:0">Layout settings</a>.</div>
        </div>
      </div>
      <div class="sp-foot">
        <button class="btn-ghost-danger" data-act="cond-unwrap">Remove condition, keep content</button>
      </div>`;
  }

  function refreshStat() {
    const s = state.selected;
    const box = $('#sp-stat', panel);
    if (!s || !box) return;
    if (s.type === 'rs') box.querySelector('div').innerHTML = statLine(state.sections[s.id]);
    else { const sec = sectionOf(doc.querySelector(`[data-cond="${s.id}"]`)); if (sec) box.querySelector('div').innerHTML = statLine(sec.cfg, s.id); }
  }

  function afterConfigChange(rerender) {
    const s = state.selected;
    if (s.type === 'rs') updateSectionChrome(s.id);
    else updateCondChrome(s.id);
    if (rerender) renderPanel(); else refreshStat();
  }

  function newRule(kind, listKey) {
    const l = listDef(listKey);
    if (kind === 'cond') {
      const f = l.fields.find((x) => x.type === 'picklist') || l.fields[0];
      return { scope: 'item', field: f.key, op: opsFor(f.type)[0][0], value: '' };
    }
    const f = l.fields.find((x) => x.type === 'number') || l.fields[0];
    return { scope: 'item', field: f.key, op: opsFor(f.type)[0][0], value: '' };
  }
  function currentRules() {
    const s = state.selected;
    return s.type === 'rs' ? state.sections[s.id].filters : state.conds[s.id].rules;
  }

  panel.addEventListener('change', (e) => {
    const t = e.target;
    const s = state.selected;
    if (!s) return;
    if (t.dataset.r) {
      const i = Number(t.closest('.rule').dataset.i);
      const rule = currentRules()[i];
      const listKey = s.type === 'rs' ? state.sections[s.id].source : sectionOf(doc.querySelector(`[data-cond="${s.id}"]`))?.cfg?.source;
      if (t.dataset.r === 'field') {
        const [scope, field] = t.value.split(':');
        rule.scope = scope; rule.field = field;
        const f = fieldFor(scope, field, listKey);
        rule.op = opsFor(f.type)[0][0]; rule.value = '';
        afterConfigChange(true);
      } else if (t.dataset.r === 'op') {
        rule.op = t.value;
        afterConfigChange(true);
      } else {
        rule.value = t.value;
        afterConfigChange(false);
      }
      return;
    }
    const k = t.dataset.k;
    if (!k) return;
    if (s.type === 'cond') {
      state.conds[s.id][k] = t.value;
      afterConfigChange(true);
      return;
    }
    const cfg = state.sections[s.id];
    switch (k) {
      case 'source': {
        cfg.source = t.value || null;
        const valid = new Set(itemFields(cfg.source).map((f) => f.key));
        cfg.filters = cfg.filters.filter((r) => r.scope !== 'item' || valid.has(r.field));
        if (!valid.has(cfg.sort.field)) cfg.sort.field = '';
        afterConfigChange(true);
        const bad = $$('.mf-invalid', doc.querySelector(`[data-rs="${s.id}"]`)).length;
        if (bad) toast(`${bad} field${bad > 1 ? 's' : ''} in this section don't exist on ${listDef(cfg.source).label} — shown in red.`);
        return;
      }
      case 'filterMatch': cfg.filterMatch = t.value; afterConfigChange(true); return;
      case 'sortField': cfg.sort.field = t.value; afterConfigChange(true); return;
      case 'sortDir': cfg.sort.dir = t.value; afterConfigChange(false); return;
      case 'limit': cfg.limit = t.value; afterConfigChange(false); return;
      case 'zebra': cfg.zebra = t.checked; afterConfigChange(true); return;
      case 'emptyMode': cfg.emptyMode = t.value; afterConfigChange(true); return;
      case 'emptyText': cfg.emptyText = t.value; return;
    }
  });
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.r === 'value' && t.tagName === 'INPUT') {
      const i = Number(t.closest('.rule').dataset.i);
      currentRules()[i].value = t.value;
      afterConfigChange(false);
    } else if (t.dataset.k === 'limit' && state.selected?.type === 'rs') {
      state.sections[state.selected.id].limit = t.value;
      afterConfigChange(false);
    } else if (t.dataset.k === 'emptyText' && state.selected?.type === 'rs') {
      state.sections[state.selected.id].emptyText = t.value;
    }
  });
  panel.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-act="insert-field"]')) e.preventDefault(); // keep the caret in the document
  });
  panel.addEventListener('click', (e) => {
    const segBtn = e.target.closest('[data-seg] button');
    if (segBtn) {
      state.sections[state.selected.id][segBtn.parentElement.dataset.seg] = segBtn.dataset.v;
      afterConfigChange(true);
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const s = state.selected;
    switch (b.dataset.act) {
      case 'panel-close': select(null); break;
      case 'add-filter': { const cfg = state.sections[s.id]; cfg.filters.push(newRule('filter', cfg.source)); afterConfigChange(true); break; }
      case 'add-cond-rule': {
        const src = sectionOf(doc.querySelector(`[data-cond="${s.id}"]`))?.cfg?.source;
        state.conds[s.id].rules.push(src ? newRule('cond', src) : { scope: 'record', field: 'amount', op: 'gt', value: '' });
        afterConfigChange(true); break;
      }
      case 'rm-rule': currentRules().splice(Number(b.dataset.i), 1); afterConfigChange(true); break;
      case 'zebra-color': state.sections[s.id].zebraColor = b.dataset.c; afterConfigChange(true); break;
      case 'insert-field': insertFieldFromPanel(b.dataset.scope, b.dataset.field); break;
      case 'goto-section': { e.preventDefault(); const sec = sectionOf(doc.querySelector(`[data-cond="${s.id}"]`)); if (sec) select('rs', sec.id); break; }
      case 'cond-unwrap': unwrapCond(s.id); break;
    }
  });

  // ---------------------------------------------------------------- caret helpers
  const hostOf = (node) => (node?.nodeType === 1 ? node : node?.parentElement)?.closest('[contenteditable="true"]');
  function placeCaret(node, offset = 0) {
    const host = hostOf(node);
    host?.focus({ preventScroll: true });
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    state.savedRange = r.cloneRange();
  }
  function caretInto(block) {
    // put caret at start of the first text-ish spot in block
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const t = walker.nextNode();
    if (t) placeCaret(t, 0); else placeCaret(block, 0);
  }
  function restoreSelection() {
    const r = state.savedRange;
    if (!r || !doc.contains(r.startContainer)) return false;
    hostOf(r.startContainer)?.focus({ preventScroll: true });
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }
  function blockOf(node) {
    let el = node?.nodeType === 1 ? node : node?.parentElement;
    while (el && el !== doc) {
      const p = el.parentElement;
      if (p === doc || p?.classList.contains('rs-body') || p?.classList.contains('cond-body')) return el;
      el = p;
    }
    return null;
  }
  function rangeIsEmptyBefore(block, r) {
    const pre = document.createRange();
    pre.selectNodeContents(block);
    pre.setEnd(r.startContainer, r.startOffset);
    return pre.toString().replace(/​/g, '').length === 0 && !pre.cloneContents().querySelector('.mf,img,.sig-tag');
  }
  function rangeIsEmptyAfter(block, r) {
    const post = document.createRange();
    post.selectNodeContents(block);
    post.setStart(r.endContainer, r.endOffset);
    return post.toString().replace(/​/g, '').length === 0 && !post.cloneContents().querySelector('.mf,img,.sig-tag');
  }

  // ---------------------------------------------------------------- inserting fields
  function insertChipAtRange(range, scope, key) {
    const c = chipEl(scope, key);
    range.deleteContents();
    range.insertNode(c);
    const space = document.createTextNode(' ');
    c.after(space);
    refreshChips(c.closest('.rs') || doc);
    placeCaret(space, 1);
    return c;
  }
  function insertFieldFromPanel(scope, key) {
    const s = state.selected;
    const secEl = doc.querySelector(`[data-rs="${s.type === 'rs' ? s.id : sectionOf(doc.querySelector(`[data-cond="${s.id}"]`))?.id}"]`);
    let r = state.savedRange;
    const bodyOk = r && secEl && secEl.querySelector('.rs-body').contains(r.startContainer);
    if (!bodyOk) {
      // drop it at the end of the section body
      const body = secEl.querySelector('.rs-body');
      let last = body.lastElementChild;
      if (!last || last.matches('.cond, .media-row, table')) { last = document.createElement('p'); body.appendChild(last); }
      if (last.lastChild?.nodeName === 'BR') last.lastChild.remove();
      r = document.createRange();
      r.selectNodeContents(last);
      r.collapse(false);
    }
    const c = insertChipAtRange(r, scope, key);
    c.classList.add('flash');
    setTimeout(() => c.classList.remove('flash'), 900);
  }

  // ---------------------------------------------------------------- document events
  document.addEventListener('selectionchange', () => {
    if (state.mode !== 'edit') return;
    const sel = getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    if (!doc.contains(node)) return;
    state.savedRange = sel.getRangeAt(0).cloneRange();
    updateToolbarState();
    updateAt();
    const el = node.nodeType === 1 ? node : node.parentElement;
    const cond = el.closest('.cond');
    const rs = el.closest('.rs');
    if (cond) select('cond', cond.dataset.cond);
    else if (rs) select('rs', rs.dataset.rs);
    else select(null);
  });

  doc.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      e.preventDefault();
      const rsEl = act.closest('.rs');
      switch (act.dataset.act) {
        case 'rs-settings': select('rs', rsEl.dataset.rs); return;
        case 'rs-delete': deleteSection(rsEl); return;
        case 'rs-pick': {
          const id = rsEl.dataset.rs;
          state.sections[id].source = act.dataset.list;
          updateSectionChrome(id);
          state.selected = null;
          select('rs', id);
          caretInto(rsEl.querySelector('.rs-body').firstElementChild);
          return;
        }
        case 'cond-delete': deleteCond(act.closest('.cond')); return;
      }
    }
    const ch = e.target.closest('.mf');
    if (ch) { openFieldPop(ch); return; }
    const head = e.target.closest('.rs-head');
    if (head) { select('rs', head.parentElement.dataset.rs); return; }
    const chead = e.target.closest('.cond-head');
    if (chead) { select('cond', chead.parentElement.dataset.cond); return; }
    const leg = e.target.closest('.legacy-rl');
    if (leg) toast('This is the existing Related List table widget. Insert a Repeating Section for free-form layouts.');
  });

  doc.addEventListener('keydown', (e) => {
    if (state.at && handleAtKey(e)) return;
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const sel = getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return;
    const r = sel.getRangeAt(0);
    const host = hostOf(r.startContainer);
    const block = blockOf(r.startContainer);
    if (!block) return;
    const guarded = '.rs, .cond, .legacy-rl, .locked-line';
    if (e.key === 'Backspace' && rangeIsEmptyBefore(block, r)) {
      const prev = block.previousElementSibling;
      if (!prev && host !== doc) { e.preventDefault(); return; }
      if (prev?.matches(guarded)) {
        e.preventDefault();
        if (prev.matches('.rs')) select('rs', prev.dataset.rs);
        if (prev.matches('.cond')) select('cond', prev.dataset.cond);
        flash(prev);
      }
    }
    if (e.key === 'Delete' && rangeIsEmptyAfter(block, r)) {
      const next = block.nextElementSibling;
      if (!next && host !== doc) { e.preventDefault(); return; }
      if (next?.matches(guarded)) { e.preventDefault(); flash(next); }
    }
  });

  doc.addEventListener('input', () => {
    if (state.at) return;
    const sel = getSelection();
    const n = sel.anchorNode, o = sel.anchorOffset;
    if (n?.nodeType !== 3) return;
    const t = n.textContent;
    if (t[o - 1] === '@' && (o === 1 || /[\s (]/.test(t[o - 2]))) startAt();
  });

  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  // ---------------------------------------------------------------- delete / undo
  let undo = null;
  function deleteSection(rsEl) {
    undo = { el: rsEl, parent: rsEl.parentElement, next: rsEl.nextSibling };
    rsEl.remove();
    select(null);
    toast('Repeating Section deleted', 'Undo', () => {
      undo.parent.insertBefore(undo.el, undo.next);
      select('rs', undo.el.dataset.rs);
    });
  }
  function deleteCond(cEl) {
    undo = { el: cEl, parent: cEl.parentElement, next: cEl.nextSibling };
    cEl.remove();
    select(null);
    toast('Conditional block deleted', 'Undo', () => { undo.parent.insertBefore(undo.el, undo.next); select('cond', undo.el.dataset.cond); });
  }
  function unwrapCond(id) {
    const cEl = doc.querySelector(`[data-cond="${id}"]`);
    const body = cEl.querySelector(':scope > .cond-body');
    const kids = [...body.childNodes];
    cEl.replaceWith(...kids);
    select(null);
    toast('Condition removed; its content now always shows');
  }

  let toastTimer;
  function toast(msg, actionLabel, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button>${actionLabel}</button>` : ''}`;
    t.hidden = false;
    if (actionLabel) t.querySelector('button').onclick = () => { action(); t.hidden = true; };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
  }

  // ---------------------------------------------------------------- block handle + insert menu
  pageWrap.addEventListener('mousemove', (e) => {
    if (!insertMenu.hidden) return;
    if (e.target.closest('.block-handle')) return;
    const b = blockOf(e.target);
    if (!b) return;
    showHandleFor(b);
  });
  pageWrap.addEventListener('mouseleave', () => { if (insertMenu.hidden) handle.classList.remove('show'); });

  function showHandleFor(b) {
    state.handleTarget = b;
    const wr = pageWrap.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const top = b.matches('.rs') ? br.top - wr.top + 5 : br.top - wr.top - 2;
    handle.style.top = `${top}px`;
    handle.style.left = `${Math.max(4, br.left - wr.left - 50)}px`;
    handle.classList.add('show');
  }

  const BLOCKS = [
    { k: 'text', label: 'Text', icon: ICON.text },
    { k: 'heading', label: 'Heading', icon: ICON.heading },
    { k: 'list', label: 'List', icon: ICON.list },
    { k: 'image', label: 'Image', icon: ICON.image },
    { k: 'table', label: 'Table', icon: ICON.table },
    { k: 'related', label: 'Related Object', icon: ICON.related, desc: 'Table of related records', outsideOnly: true },
    { k: 'repeat', label: 'Repeating Section', icon: ICON.repeat, desc: 'Repeat any content for each related record', badge: 'New', feat: 'feat', outsideOnly: true },
    { k: 'cond', label: 'Conditional Block', icon: ICON.branch, desc: 'Show only when fields match', feat: 'feat-cond', insideOnly: true },
    { k: 'field', label: 'Field', icon: TYPE_ICON.text, desc: 'Insert a merge field (or type @)', insideOnly: true },
    { k: 'pagebreak', label: 'Page Break', icon: ICON.pagebreak },
  ];

  function openInsertMenu(anchorRect, target) {
    state.handleTarget = target;
    const inside = !!target.parentElement?.closest('.rs-body');
    insertMenu.dataset.inside = inside ? '1' : '';
    insertMenu.innerHTML = `
      <div class="im-search">${ICON.search}<input type="text" placeholder="Filter" id="im-filter"></div>
      <div class="im-list" id="im-list"></div>`;
    renderInsertList('');
    insertMenu.hidden = false;
    const h = insertMenu.offsetHeight;
    let top = anchorRect.bottom + 4;
    if (top + h > innerHeight - 10) top = Math.max(10, anchorRect.top - h - 4);
    insertMenu.style.top = `${top}px`;
    insertMenu.style.left = `${anchorRect.left}px`;
    const f = $('#im-filter');
    f.focus();
    f.addEventListener('input', () => renderInsertList(f.value));
    f.addEventListener('keydown', (e) => {
      const items = $$('.im-item', insertMenu);
      let i = items.findIndex((x) => x.classList.contains('hl'));
      if (e.key === 'ArrowDown') { e.preventDefault(); i = Math.min(items.length - 1, i + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); i = Math.max(0, i - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); items[i]?.click(); return; }
      else if (e.key === 'Escape') { closeInsertMenu(); return; }
      else return;
      items.forEach((x, j) => x.classList.toggle('hl', j === i));
      items[i]?.scrollIntoView({ block: 'nearest' });
    });
  }
  function renderInsertList(q) {
    const inside = !!insertMenu.dataset.inside;
    const list = BLOCKS.filter((b) => (inside ? !b.outsideOnly : !b.insideOnly) && b.label.toLowerCase().includes(q.toLowerCase()));
    $('#im-list').innerHTML = list.length ? list.map((b, i) => `
      ${inside && b.k === 'cond' ? `<div class="im-sep"></div><div class="im-group">Inside this repeat</div>` : ''}
      ${!inside && b.k === 'related' ? `<div class="im-sep"></div><div class="im-group">Related data</div>` : ''}
      <button class="im-item ${b.feat || ''} ${i === 0 ? 'hl' : ''}" data-k="${b.k}">
        <span class="im-ico">${b.icon}</span>
        <span class="im-text"><b>${b.label}</b>${b.desc ? `<small>${b.desc}</small>` : ''}</span>
        ${b.badge ? `<span class="im-badge">${b.badge}</span>` : ''}
      </button>`).join('') : '<div class="im-empty">No matching blocks</div>';
  }
  function closeInsertMenu() { insertMenu.hidden = true; }

  $('#bh-add').addEventListener('click', (e) => {
    e.stopPropagation();
    openInsertMenu(e.currentTarget.getBoundingClientRect(), state.handleTarget);
  });
  $('#rail-add').addEventListener('click', (e) => {
    e.stopPropagation();
    const r = state.savedRange;
    const target = (r && blockOf(r.startContainer)) || doc.lastElementChild;
    const rr = e.currentTarget.getBoundingClientRect();
    openInsertMenu({ left: rr.right + 8, top: rr.top, bottom: rr.top }, target);
  });
  insertMenu.addEventListener('click', (e) => {
    const b = e.target.closest('.im-item');
    if (!b) return;
    closeInsertMenu();
    insertBlock(b.dataset.k, state.handleTarget);
  });

  function insertBlock(kind, target) {
    const after = (el) => { target.after(el); return el; };
    const html = (h) => { const t = document.createElement('div'); t.innerHTML = h.trim(); return t.firstElementChild; };
    let el;
    switch (kind) {
      case 'text': el = after(html('<p><br></p>')); caretInto(el); break;
      case 'heading': el = after(html('<h2><br></h2>')); caretInto(el); break;
      case 'list': el = after(html('<ul><li><br></li></ul>')); caretInto(el.firstElementChild); break;
      case 'image': el = after(html(`<p><img class="static-img" src="${staticImage()}" alt="Image"></p>`)); break;
      case 'table': el = after(html('<table><tbody><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table>')); caretInto(el.querySelector('td')); break;
      case 'pagebreak': el = after(html('<div class="page-break" contenteditable="false"></div>')); break;
      case 'related': el = after(html(doc.querySelector('.legacy-rl')?.outerHTML || '<p>Related list</p>')); break;
      case 'field': {
        const p = target.matches('p, h1, h2, h3, li') ? target : after(html('<p><br></p>'));
        if (p.lastChild?.nodeName === 'BR') p.lastChild.remove();
        const r = document.createRange(); r.selectNodeContents(p); r.collapse(false);
        placeCaret(r.startContainer, r.startOffset);
        const t = document.createTextNode('@'); r.insertNode(t); placeCaret(t, 1);
        startAt();
        return;
      }
      case 'repeat': {
        const id = uid('rs');
        state.sections[id] = defaultSection();
        el = after(sectionEl(id));
        if (!el.nextElementSibling) el.after(html('<p><br></p>'));
        updateSectionChrome(id);
        state.selected = null;
        select('rs', id);
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        flash(el);
        break;
      }
      case 'cond': {
        const id = uid('c');
        state.conds[id] = { match: 'all', rules: [] };
        const sec = sectionOf(target);
        if (sec?.cfg?.source) state.conds[id].rules.push(newRule('cond', sec.cfg.source));
        el = after(condEl(id));
        updateCondChrome(id);
        state.selected = null;
        select('cond', id);
        caretInto(el.querySelector('.cond-body p'));
        flash(el);
        break;
      }
    }
    handle.classList.remove('show');
  }
  function staticImage() {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><rect width="320" height="120" rx="8" fill="#f1f3f6"/><path d="M130 80l24-28 18 20 12-12 26 20z" fill="#c7ccd4"/><circle cx="196" cy="42" r="8" fill="#c7ccd4"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  // ---------------------------------------------------------------- field popover
  let activeChip = null;
  function openFieldPop(ch) {
    closeAllPops();
    activeChip = ch;
    ch.classList.add('is-active');
    const scope = ch.dataset.scope;
    const sec = sectionOf(ch);
    const f = fieldFor(scope, ch.dataset.field, sec?.cfg?.source);
    const l = listDef(sec?.cfg?.source);
    const fmts = FORMATS[f?.type] || FORMATS.text;
    fieldPop.innerHTML = `
      <div class="fp-head"><span class="at-dot ${scope}">${typeIcon(f?.type)}</span>${esc(ch.querySelector('.mf-label').textContent)}</div>
      <span class="fp-scope">${scope === 'item' ? `Changes for each ${l ? l.singular.toLowerCase() : 'item'} in the repeat` : 'From the Deal (same value in every repeat)'}</span>
      ${f ? `<label class="fp-field"><span>Format</span><select data-fp="format">${fmts.map(([k, t]) => `<option value="${k}" ${ch.dataset.format === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}
      ${f?.type !== 'image' ? `<label class="fp-field"><span>If empty, show</span><input data-fp="fallback" value="${esc(ch.dataset.fallback)}" placeholder="Nothing (leave blank)"><div class="fp-help">Shown when this ${scope === 'item' ? l?.singular.toLowerCase() || 'item' : 'deal'} has no value.</div></label>` : ''}
      <div class="fp-actions"><button class="btn-ghost-danger" data-act="fp-remove">Remove field</button><button class="btn-primary" data-act="fp-done">Done</button></div>`;
    fieldPop.hidden = false;
    positionFieldPop(ch);
  }
  function positionFieldPop(ch) {
    const r = ch.getBoundingClientRect();
    let top = r.bottom + 6;
    if (top + fieldPop.offsetHeight > innerHeight - 10) top = r.top - fieldPop.offsetHeight - 6;
    fieldPop.style.top = `${top}px`;
    fieldPop.style.left = `${Math.min(r.left, innerWidth - 316)}px`;
  }
  fieldPop.addEventListener('input', (e) => {
    const k = e.target.dataset.fp;
    if (!k || !activeChip) return;
    activeChip.dataset[k] = e.target.value;
    refreshChips(activeChip.parentElement);
  });
  fieldPop.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'fp-remove') activeChip.remove();
    closeFieldPop();
  });
  function closeFieldPop() {
    fieldPop.hidden = true;
    activeChip?.classList.remove('is-active');
    activeChip = null;
  }

  // ---------------------------------------------------------------- @ mention picker
  function startAt() {
    const sel = getSelection();
    const node = sel.anchorNode;
    if (node?.nodeType !== 3) return;
    state.at = { node, offset: sel.anchorOffset - 1, hl: 0, items: [] };
    updateAt();
  }
  function atContext() {
    const sec = sectionOf(state.at.node.parentElement);
    const src = sec?.cfg?.source;
    const l = listDef(src);
    const items = [];
    if (l) itemFields(src).forEach((f) => items.push({ scope: 'item', f, label: `${l.singular}.${f.label}` }));
    DEAL_FIELDS.forEach((f) => items.push({ scope: 'record', f, label: f.label }));
    return items;
  }
  function updateAt() {
    const a = state.at;
    if (!a) return;
    const sel = getSelection();
    if (!doc.contains(a.node) || sel.anchorNode !== a.node || sel.anchorOffset <= a.offset || a.node.textContent[a.offset] !== '@') { closeAt(); return; }
    const q = a.node.textContent.slice(a.offset + 1, sel.anchorOffset);
    if (/\s{2}/.test(q) || q.length > 30) { closeAt(); return; }
    a.items = atContext().filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));
    a.hl = Math.min(a.hl, Math.max(0, a.items.length - 1));
    const inRepeat = a.items.some((x) => x.scope === 'item');
    atPop.innerHTML = a.items.length ? a.items.map((x, i) => `
      ${i === 0 && x.scope === 'item' ? '<div class="im-group">This repeat</div>' : ''}
      ${x.scope === 'record' && (i === 0 || a.items[i - 1].scope === 'item') ? `<div class="im-group">${inRepeat ? 'From the Deal' : 'Deal fields'}</div>` : ''}
      <button class="at-item ${i === a.hl ? 'hl' : ''}" data-i="${i}"><span class="at-dot ${x.scope}">${typeIcon(x.f.type)}</span>${esc(x.label)}<span class="at-type">${TYPE_NAME[x.f.type]}</span></button>`).join('')
      : '<div class="im-empty">No matching fields</div>';
    const r = sel.getRangeAt(0).getBoundingClientRect();
    atPop.hidden = false;
    let top = r.bottom + 6;
    if (top + atPop.offsetHeight > innerHeight - 10) top = r.top - atPop.offsetHeight - 6;
    atPop.style.top = `${top}px`;
    atPop.style.left = `${r.left}px`;
    atPop.querySelector('.at-item.hl')?.scrollIntoView({ block: 'nearest' });
  }
  function handleAtKey(e) {
    const a = state.at;
    if (e.key === 'ArrowDown') { a.hl = Math.min(a.items.length - 1, a.hl + 1); updateAt(); e.preventDefault(); return true; }
    if (e.key === 'ArrowUp') { a.hl = Math.max(0, a.hl - 1); updateAt(); e.preventDefault(); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { if (a.items[a.hl]) { e.preventDefault(); chooseAt(a.hl); return true; } }
    if (e.key === 'Escape') { closeAt(); e.preventDefault(); return true; }
    return false;
  }
  function chooseAt(i) {
    const a = state.at;
    const x = a.items[i];
    const sel = getSelection();
    const r = document.createRange();
    r.setStart(a.node, a.offset);
    r.setEnd(a.node, sel.anchorNode === a.node ? sel.anchorOffset : a.offset + 1);
    closeAt();
    insertChipAtRange(r, x.scope, x.f.key);
  }
  function closeAt() { state.at = null; atPop.hidden = true; }
  atPop.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const b = e.target.closest('.at-item');
    if (b) chooseAt(Number(b.dataset.i));
  });

  // ---------------------------------------------------------------- formatting toolbar
  document.execCommand('styleWithCSS', false, true);
  const toolbar = $('#toolbar');
  toolbar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

  const PALETTE = ['#181818', '#5c6370', '#9aa0a6', '#c0392b', '#d35400', '#b8860b', '#1e7a4c', '#0176d3', '#4460d6', '#8e44ad', '#c2185b', '#ffffff'];
  const HILITE = ['transparent', '#fff3a3', '#ffe0b2', '#ffcdd2', '#d7f5dd', '#d6ecff', '#e8dcff', '#f5f5f5'];

  toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]');
    if (!b) return;
    if (!restoreSelection()) { toast('Click into the document first'); return; }
    const cmd = b.dataset.cmd;
    switch (cmd) {
      case 'foreColor':
      case 'hiliteColor': {
        const colors = cmd === 'foreColor' ? PALETTE : HILITE;
        openMini(b, `<div class="palette">${colors.map((c) => `<button data-color="${c}" title="${c}" style="background:${c === 'transparent' ? 'linear-gradient(135deg,#fff 45%,#e06666 45%,#e06666 55%,#fff 55%)' : c}"></button>`).join('')}</div>`, (el) => {
          const c = el.closest('[data-color]')?.dataset.color;
          if (!c) return false;
          restoreSelection();
          document.execCommand(cmd, false, c);
          $(cmd === 'foreColor' ? '#sw-fore' : '#sw-hilite').setAttribute('stroke', c === 'transparent' ? '#ddd' : c);
          return true;
        });
        break;
      }
      case 'align':
        openMini(b, [['justifyLeft', 'Left', ICON.alignL], ['justifyCenter', 'Center', ICON.alignC], ['justifyRight', 'Right', ICON.alignR], ['justifyFull', 'Justify', ICON.alignJ]]
          .map(([c, t, i]) => `<button class="mp-item" data-align="${c}">${i}${t}</button>`).join(''), (el) => {
          const c = el.closest('[data-align]')?.dataset.align;
          if (!c) return false;
          restoreSelection(); document.execCommand(c); return true;
        });
        break;
      case 'link':
        openMini(b, `<div class="mp-row"><input id="mp-link" placeholder="https://"><button class="btn-primary" data-link>Apply</button></div>`, (el) => {
          if (!el.closest('[data-link]')) return false;
          const url = $('#mp-link').value.trim();
          restoreSelection();
          if (url) document.execCommand('createLink', false, url);
          return true;
        });
        setTimeout(() => $('#mp-link')?.focus(), 0);
        break;
      case 'table':
        document.execCommand('insertHTML', false, '<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>');
        break;
      case 'image': {
        const sec = sectionOf(state.savedRange.startContainer.parentElement || state.savedRange.startContainer);
        const l = listDef(sec?.cfg?.source);
        const imgField = l && l.fields.find((f) => f.type === 'image');
        openMini(b, `
          <button class="mp-item" data-img="static">${ICON.upload}<span>Upload image<small>The same image in every document</small></span></button>
          ${imgField ? `<button class="mp-item" data-img="field"><span class="at-dot item">${ICON.image}</span><span>${l.singular}.${imgField.label}<small>A different image for each ${l.singular.toLowerCase()}</small></span></button>` : ''}`, (el) => {
          const k = el.closest('[data-img]')?.dataset.img;
          if (!k) return false;
          restoreSelection();
          if (k === 'static') document.execCommand('insertHTML', false, `<img class="static-img" src="${staticImage()}" alt="Image">`);
          else insertChipAtRange(getSelection().getRangeAt(0), 'item', imgField.key);
          return true;
        });
        break;
      }
      default:
        document.execCommand(cmd, false, null);
    }
    updateToolbarState();
  });

  $('#tb-font').addEventListener('change', (e) => {
    if (!e.target.value || !restoreSelection()) return;
    document.execCommand('fontName', false, e.target.value);
  });
  $('#tb-size').addEventListener('change', (e) => {
    const px = e.target.value;
    if (!px || !restoreSelection()) return;
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    $$('font[size="7"]', doc).forEach((f) => {
      const s = document.createElement('span');
      s.style.fontSize = `${px}px`;
      s.append(...f.childNodes);
      f.replaceWith(s);
    });
    document.execCommand('styleWithCSS', false, true);
  });

  function updateToolbarState() {
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertOrderedList', 'insertUnorderedList'].forEach((c) => {
      let on = false;
      try { on = document.queryCommandState(c); } catch (_) {}
      $(`[data-cmd="${c}"]`, toolbar)?.classList.toggle('active', on);
    });
    const r = state.savedRange;
    if (!r) return;
    const el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const fontSel = $('#tb-font');
    fontSel.value = [...fontSel.options].some((o) => o.value === fam) ? fam : '';
    const size = String(Math.round(parseFloat(cs.fontSize)));
    const sizeSel = $('#tb-size');
    sizeSel.value = [...sizeSel.options].some((o) => o.value === size) ? size : '';
    // context pill
    const ctx = $('#tb-ctx');
    const cond = el.closest('.cond');
    const sec = sectionOf(el);
    if (sec?.cfg?.source) {
      const l = listDef(sec.cfg.source);
      ctx.hidden = false;
      ctx.className = 'tb-ctx' + (cond ? ' cond' : '');
      ctx.innerHTML = cond ? `${ICON.branch} Inside Show if · ${esc(cond.querySelector('.cond-summary').textContent)}` : `${ICON.repeat} Inside repeat · each ${l.singular}`;
    } else ctx.hidden = true;
  }

  let miniHandler = null;
  function openMini(anchor, html, onClick) {
    closeAllPops();
    miniPop.innerHTML = html;
    miniPop.hidden = false;
    const r = anchor.getBoundingClientRect();
    miniPop.style.top = `${r.bottom + 6}px`;
    miniPop.style.left = `${Math.min(r.left, innerWidth - miniPop.offsetWidth - 10)}px`;
    miniHandler = onClick;
  }
  miniPop.addEventListener('mousedown', (e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
  miniPop.addEventListener('click', (e) => { if (miniHandler && miniHandler(e.target)) { miniPop.hidden = true; updateToolbarState(); } });
  miniPop.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('[data-link]', miniPop)?.click(); });

  function closeAllPops() {
    miniPop.hidden = true;
    closeFieldPop();
    closeInsertMenu();
  }
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.pop, .block-handle, [data-cmd], #rail-add, .mf')) closeAllPops();
    if (!e.target.closest('.at-pop')) { if (state.at && !doc.contains(e.target)) closeAt(); }
  });
  $('#canvas').addEventListener('scroll', () => {
    miniPop.hidden = true;
    closeInsertMenu();
    closeAt();
    handle.classList.remove('show');
    if (activeChip) positionFieldPop(activeChip);
  });

  // ---------------------------------------------------------------- preview
  const previewPage = $('#preview-page');
  function setMode(m) {
    state.mode = m;
    closeAllPops(); closeAt();
    const pv = m === 'preview';
    $('#toolbar').hidden = pv;
    $('#preview-bar').hidden = !pv;
    $('#page-wrap').hidden = pv;
    $('#preview-wrap').hidden = !pv;
    $('#btn-preview').classList.toggle('on', pv);
    $('#btn-preview span').textContent = pv ? 'Exit preview' : 'Preview';
    renderPanel();
    if (pv) { syncPreviewBar(); renderPreview(state.preview.source === 'live'); }
  }
  $('#btn-preview').addEventListener('click', () => setMode(state.mode === 'edit' ? 'preview' : 'edit'));
  $('#pv-exit').addEventListener('click', () => setMode('edit'));
  $('#pv-source').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.preview.source = b.dataset.v;
    syncPreviewBar();
    renderPreview(b.dataset.v === 'live');
  });
  $('#pv-record').innerHTML = DEALS.map((d) => `<option value="${d.id}">${esc(d.label)} · ${d.id} (${d.lists.line_items.length} line items)</option>`).join('');
  $('#pv-record').addEventListener('change', (e) => { state.preview.recordId = e.target.value; renderPreview(true); });
  $('#pv-outlines').addEventListener('change', (e) => { state.preview.outlines = e.target.checked; previewPage.querySelector('.doc')?.classList.toggle('show-outlines', e.target.checked); });

  function syncPreviewBar() {
    const live = state.preview.source === 'live';
    $$('#pv-source button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.preview.source));
    $('#pv-record-wrap').hidden = !live;
    $('#pv-note').hidden = live;
    $('#pv-record').value = state.preview.recordId;
  }

  let fetchTimer;
  function renderPreview(simulateFetch) {
    const fetchEl = $('#pv-fetch');
    clearTimeout(fetchTimer);
    if (simulateFetch) {
      fetchEl.classList.add('loading');
      fetchEl.lastElementChild.textContent = 'Fetching from Salesforce…';
      previewPage.innerHTML = `<div class="skeleton">${[70, 40, 90, 85, 60, 95, 50, 80, 88, 45].map((w) => `<div style="width:${w}%"></div>`).join('')}</div>`;
      fetchTimer = setTimeout(() => {
        fetchEl.classList.remove('loading');
        fetchEl.lastElementChild.textContent = 'Live · fetched just now';
        buildPreview();
      }, 650);
    } else buildPreview();
  }

  function buildPreview() {
    const ctx = state.preview.source === 'sample' ? SAMPLE : DEALS.find((d) => d.id === state.preview.recordId);
    const out = doc.cloneNode(true);
    out.removeAttribute('id');
    out.removeAttribute('contenteditable');
    $$('[contenteditable]', out).forEach((e) => e.removeAttribute('contenteditable'));
    $$('.is-selected, .flash, .is-active', out).forEach((e) => e.classList.remove('is-selected', 'flash', 'is-active'));

    $$('.rs', out).forEach((rsEl) => {
      const cfg = state.sections[rsEl.dataset.rs];
      const l = listDef(cfg?.source);
      if (!l) { rsEl.remove(); return; }
      const { items, total, filteredOut, limitedOut } = itemsFor(cfg, ctx);
      const wrap = document.createElement('div');
      wrap.className = 'rs-out';
      wrap.dataset.label = `Repeat · ${items.length} of ${total} ${l.label}`;
      const body = rsEl.querySelector('.rs-body');
      if (!items.length) {
        if (cfg.emptyMode === 'message') wrap.innerHTML = `<p class="rs-empty">${esc(cfg.emptyText)}</p>`;
        else { wrap.innerHTML = ''; wrap.style.display = state.preview.outlines ? '' : 'none'; wrap.classList.add('rs-hidden'); wrap.innerHTML = `<p class="rs-empty" style="color:#aab">(Section hidden: no ${l.label.toLowerCase()})</p>`; }
      }
      items.forEach((it, i) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'rs-item';
        itemEl.dataset.label = `${l.singular} ${i + 1}`;
        if (cfg.zebra && i % 2 === 1) { itemEl.style.background = cfg.zebraColor; }
        if (cfg.zebra) itemEl.classList.add('zebra');
        const b = body.cloneNode(true);
        $$('.cond', b).reverse().forEach((c) => {
          const cc = state.conds[c.dataset.cond];
          const ok = !cc || evalRules(cc.rules, cc.match, it, i, items.length, ctx.record, cfg.source);
          if (ok) {
            const holder = document.createElement('div');
            holder.className = 'pv-cond';
            holder.append(...c.querySelector(':scope > .cond-body').childNodes);
            c.replaceWith(holder);
          } else c.remove();
        });
        resolveChips(b, ctx, it, i, cfg.source);
        itemEl.append(...b.childNodes);
        wrap.appendChild(itemEl);
        if (i < items.length - 1 && cfg.separator !== 'none') {
          const sep = document.createElement(cfg.separator === 'divider' ? 'hr' : 'div');
          sep.className = `rs-sep-${cfg.separator}`;
          wrap.appendChild(sep);
        }
      });
      if (filteredOut || limitedOut) {
        const note = document.createElement('div');
        note.className = 'rs-note';
        const bits = [];
        if (filteredOut) bits.push(`${filteredOut} hidden by filter (${cfg.filters.map((r) => ruleText(r, cfg.source)).join(cfg.filterMatch === 'any' ? ' or ' : ' and ')})`);
        if (limitedOut) bits.push(`${limitedOut} beyond the limit of ${cfg.limit}`);
        note.textContent = bits.join(' · ');
        wrap.appendChild(note);
      }
      rsEl.replaceWith(wrap);
    });

    // Existing Related List table widget
    $$('.legacy-rl', out).forEach((t) => {
      const rows = (ctx.lists.line_items || []).slice(0, 5);
      t.querySelector('tbody').innerHTML = rows.length
        ? rows.map((r) => `<tr><td class="lbl">${esc(r.product_type)}</td><td class="lbl">${esc(r.name)}</td><td class="lbl">${r.quantity}</td><td class="lbl">${formatValue(r.net_price, 'currency')}</td><td class="lbl">${formatValue(r.create_date, 'date')}</td></tr>`).join('')
        : '<tr><td class="lbl" colspan="5">&nbsp;</td></tr>';
    });

    resolveChips(out, ctx, null, 0, null);
    $$('.locked-line svg', out).forEach((s) => s.remove());
    out.classList.toggle('show-outlines', state.preview.outlines);
    previewPage.innerHTML = '';
    previewPage.appendChild(out);
  }

  function resolveChips(root, ctx, item, idx, listKey) {
    $$('.mf', root).forEach((ch) => {
      const scope = ch.dataset.scope, key = ch.dataset.field;
      if (scope === 'item' && !item) { ch.remove(); return; }
      const f = scope === 'record' ? recordField(key) : fieldFor('item', key, listKey);
      if (!f) { ch.replaceWith(document.createTextNode('')); return; }
      const v = scope === 'record' ? ctx.record[key] : key === '$index' ? idx + 1 : item[key];
      if (f.type === 'image') {
        const img = document.createElement('img');
        img.className = 'pv-img';
        img.src = productImage(item || {}, !!ctx.sample);
        if (ch.dataset.format === 'small') { img.style.width = '80px'; img.style.height = '60px'; }
        if (ch.dataset.format === 'large') { img.style.width = '160px'; img.style.height = '120px'; }
        ch.replaceWith(img);
        return;
      }
      const empty = isEmpty(v);
      const span = document.createElement('span');
      span.className = (scope === 'item' ? 'pv-val-item' : 'pv-val-rec') + (empty && ch.dataset.fallback ? ' pv-fallback' : '');
      span.textContent = empty ? ch.dataset.fallback || '' : formatValue(v, f.type, ch.dataset.format);
      if (empty && ch.dataset.fallback) span.title = 'Fallback text (field was empty)';
      ch.replaceWith(span);
    });
  }

  // ---------------------------------------------------------------- init
  seed();
  // Start with the caret nowhere; nudge the user toward the seeded section.
  setTimeout(() => {
    const rs = doc.querySelector('.rs');
    if (rs) select('rs', rs.dataset.rs);
  }, 50);
})();
