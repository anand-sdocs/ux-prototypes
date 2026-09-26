/* Repeating Section on real Editor.js 2.29.
 *
 * - Outer editor: the template. Tools: paragraph, header, list, table, image, page break,
 *   related list (legacy table widget), and `repeatingSection`.
 * - `repeatingSection` is a block tool that mounts a second Editor.js instance inside itself
 *   (one level only). Its saved data holds the inner editor's blocks under `content`.
 * - Conditions are a block tune (`condition`) available only in the inner editor.
 *   Saved under `block.tunes.condition`.
 * - Merge fields are a single sanitizer-friendly <span class="mf" data-*>.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const panel = $('#side-panel');
  const fieldPop = $('#field-pop');
  const miniPop = $('#mini-pop');
  const atPop = $('#at-pop');

  const EDITORS = new Map();   // holder element -> EditorJS instance
  const SECTIONS = new Map();  // outer block id -> RepeatingSection tool instance
  const COND = new Map();      // inner block id -> ConditionTune instance
  const FORMAT = new Map();    // block id -> FormatTune instance

  const state = {
    mode: 'edit',
    selected: null,            // { type: 'rs' | 'cond', id }
    panelView: null,           // null | 'json' | 'notes'
    savedRange: null,
    at: null,
    preview: { source: 'sample', recordId: DEALS[0].id, outlines: true },
  };
  let outer;

  // ---------------------------------------------------------------- icons
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;
  const ICON = {
    repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
    branch: svg('<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 5-8 3-11.5 7"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    x: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 'stroke-width="2.4"'),
    info: svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>'),
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
  const INDEX_FIELD = { key: '$index', label: 'Item number', type: 'number' };
  const POSITION_FIELD = { key: '$position', label: 'Item position', type: 'position' };
  const itemFields = (listKey) => { const l = listDef(listKey); return l ? [INDEX_FIELD, ...l.fields] : []; };
  const recordField = (key) => DEAL_FIELDS.find((f) => f.key === key);
  function fieldFor(scope, key, listKey) {
    if (scope === 'record') return recordField(key);
    if (scope === 'pos') return POSITION_FIELD;
    return itemFields(listKey).find((f) => f.key === key);
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
    if (NO_VALUE_OPS.has(rule.op)) return `${f.label} ${op}`;
    let v = rule.value === '' || rule.value == null ? '…' : rule.value;
    if (f.type === 'currency' && v !== '…') v = '$' + Number(v).toLocaleString();
    if (f.type === 'percent' && v !== '…') v = v + '%';
    return `${f.label} ${op} ${v}`;
  }

  // ---------------------------------------------------------------- values
  const isEmpty = (v) => v === null || v === undefined || v === '';
  // `format` attribute values, as used in picasso_stage (objectdata / objectvalue / rl columns), by datatype.
  // '' = default. Date patterns are Java-style (SimpleDateFormat).
  const DATE_PATTERNS = ['MM/dd/yyyy', 'MM-dd-yyyy', 'dd/MM/yyyy', 'MMM-dd-yyyy', 'MMMM dd, yyyy', 'EEEE, MMMM dd, yyyy', 'yyyy-MM-dd'];
  function javaDate(v, pattern) {
    const d = new Date(String(v).length <= 10 ? `${v}T00:00:00` : v);
    if (isNaN(d)) return String(v);
    const MON = d.toLocaleString('en-US', { month: 'long' }), DAY = d.toLocaleString('en-US', { weekday: 'long' });
    const pad = (n) => String(n).padStart(2, '0');
    const h12 = d.getHours() % 12 || 12;
    const map = { EEEE: DAY, MMMM: MON, MMM: MON.slice(0, 3), MM: pad(d.getMonth() + 1), dd: pad(d.getDate()), yyyy: d.getFullYear(), HH: pad(d.getHours()), h: h12, mm: pad(d.getMinutes()), ss: pad(d.getSeconds()), a: d.getHours() < 12 ? 'AM' : 'PM', z: 'EDT' };
    return pattern.replace(/EEEE|MMMM|MMM|MM|dd|yyyy|HH|mm|ss|h|a|z/g, (t) => map[t]);
  }
  const FORMATS = {
    currency: [['', 'Default'], ['Currency', 'Currency ($1,234.56)'], ['Currency rounded', 'Currency rounded ($1,235)']],
    number: [['', 'Default'], ['Number', 'Number (1,234)'], ['Plain text', 'Plain text (1234)'], ['Currency', 'Currency'], ['Currency rounded', 'Currency rounded']],
    percent: [['', 'Default'], ['Number', 'Number'], ['Plain text', 'Plain text']],
    date: [['', 'As stored (2026-09-25)'], ...DATE_PATTERNS.map((f) => [f, `${f}  →  ${javaDate('2026-09-25', f)}`])],
    boolean: [['', 'Default (true / false)'], ['Yes/No', 'Yes/No']],
    text: [['', 'Default'], ['None', 'None'], ['Image', 'Image (render URL as image)']],
    picklist: [['', 'Default'], ['None', 'None']],
    image: [['', 'Default']],
  };
  function formatValue(v, type, fmt) {
    const money = (n, dp) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    if (fmt === 'Currency') return money(v, 2);
    if (fmt === 'Currency rounded') return money(Math.round(v), 0);
    if (fmt === 'Number') return Number(v).toLocaleString('en-US');
    if (fmt === 'Plain text') return String(v);
    switch (type) {
      case 'currency': return money(v, 2);
      case 'percent': return v + '%';
      case 'number': return String(v);
      case 'date': return fmt ? javaDate(v, fmt) : v; // production prints unformatted dates as stored (NDA PDF: 2026-09-16)
      case 'boolean': return fmt === 'Yes/No' ? (v ? 'Yes' : 'No') : String(!!v);
      default: return String(v);
    }
  }
  const TYPE_COLORS = { Hardware: ['#dfe8ff', '#3552c7'], Software: ['#dcf5e8', '#1e7a4c'], Service: ['#fdebd6', '#a45a0b'] };
  function productImage(item, sample) {
    const [bg, fg] = sample ? ['#eceef2', '#9aa0aa'] : (TYPE_COLORS[item.product_type] || ['#eceef2', '#666']);
    const initials = sample ? 'IMG' : String(item.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="168" viewBox="0 0 224 168"><rect width="224" height="168" fill="${bg}"/><rect x="62" y="34" width="100" height="72" rx="10" fill="none" stroke="${fg}" stroke-width="5" opacity=".45"/><text x="112" y="82" font-family="Arial" font-size="30" font-weight="700" fill="${fg}" text-anchor="middle">${initials}</text><text x="112" y="140" font-family="Arial" font-size="15" fill="${fg}" text-anchor="middle" opacity=".8">${sample ? 'Sample image' : esc(item.product_type || '')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function staticImage() {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><rect width="320" height="120" rx="8" fill="#f1f3f6"/><path d="M130 80l24-28 18 20 12-12 26 20z" fill="#c7ccd4"/><circle cx="196" cy="42" r="8" fill="#c7ccd4"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  // ---------------------------------------------------------------- rule evaluation
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
    const v = rule.scope === 'record' ? record[rule.field] : rule.field === '$index' ? idx + 1 : item[rule.field];
    const numeric = ['number', 'currency', 'percent'].includes(f.type);
    const val = rule.value;
    switch (rule.op) {
      case 'empty': return isEmpty(v);
      case 'notempty': return !isEmpty(v);
      case 'true': return v === true;
      case 'false': return !v;
    }
    if (val === '' || val == null) return true;
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
    if (!rules?.length) return true;
    const fn = (r) => evalRule(r, item, idx, n, record, listKey);
    return match === 'any' ? rules.some(fn) : rules.every(fn);
  }
  function itemsFor(cfg, ctx) {
    const all = (ctx.lists[cfg.source] || []).slice();
    let items = all.filter((it) => evalRules(cfg.filters, cfg.filterMatch, it, 0, 1, ctx.record, cfg.source));
    const afterFilter = items.length;
    if (cfg.sort?.field) {
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

  // ---------------------------------------------------------------- data elements (mirrors picasso_stage.data_element)
  // Every merge field references a data element by id (sde-…) plus its apiName (datakey), as in production.
  function hashId(prefix, str, len = 8) {
    let h = 2166136261;
    for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return `${prefix}-${hex.slice(0, len)}-${hex[7]}`;
  }
  const API_NAMES = {
    record: { record_id: 'hs_object_id', name: 'dealname', amount: 'amount', close_date: 'closedate', owner: 'hubspot_owner_id', company: 'name', street: 'address', city: 'city', state: 'state', postal: 'zip' },
    line_items: { name: 'name', sku: 'hs_sku', product_type: 'hs_product_type', description: 'description', product_image: 'hs_images', quantity: 'quantity', unit_price: 'price', discount: 'discount', net_price: 'amount', is_recurring: 'hs_is_recurring', term_months: 'hs_term_in_months', create_date: 'createdate' },
    contact_roles: { name: 'fullname', role: 'hs_role', email: 'email', phone: 'phone', is_primary: 'hs_is_primary' },
  };
  // picasso_stage datatypes seen: string, number, currency, date, datetime, boolean, enumeration, image, decimal, phone_number
  const DATATYPE = { text: 'string', picklist: 'enumeration', number: 'number', currency: 'currency', percent: 'number', date: 'date', boolean: 'boolean', image: 'image' };
  const DE = new Map();        // `${scope}|${listKey}|${key}` -> data element
  const DE_BY_ID = new Map();  // sde-… -> { scope, key, listKey }
  function registerDE(scope, listKey, f) {
    const apiName = (API_NAMES[scope === 'record' ? 'record' : listKey] || {})[f.key] || f.key;
    const objectLabel = scope === 'record' ? (f.label.split('.')[0] === 'Deal' ? 'Deal' : 'Company') : listDef(listKey).singular;
    const id = hashId('sde', `${scope}:${listKey}:${f.key}`);
    const el = { id, apiName, objectLabel, label: f.label.includes('.') ? f.label.split('.').slice(1).join('.') : f.label, datatype: DATATYPE[f.type] || 'string' };
    DE.set(`${scope}|${listKey || ''}|${f.key}`, el);
    DE_BY_ID.set(id, { scope, key: f.key, listKey });
  }
  DEAL_FIELDS.forEach((f) => registerDE('record', '', f));
  RELATED_LISTS.forEach((l) => l.fields.forEach((f) => registerDE('item', l.key, f)));
  const deFor = (scope, key, listKey) => DE.get(`${scope}|${scope === 'record' ? '' : listKey || ''}|${key}`);
  const listKeyByName = (name) => RELATED_LISTS.find((l) => l.label === name)?.key || null;

  // ---------------------------------------------------------------- merge field chips
  function chipLabel(scope, key, listKey) {
    if (scope === 'record') { const f = recordField(key); return { f, label: f ? f.label : key }; }
    const l = listDef(listKey);
    const f = l && itemFields(listKey).find((x) => x.key === key);
    return { f, label: `${l ? l.singular : 'Item'}.${f ? f.label : key}` };
  }
  // Production tags:
  //   <objectdata>  merge field in a template   (becomes <objectvalue value="…"> in a generated document)
  //   <objectfield> signer field (signature / text / date) with profileid + fieldkey
  const FIELD_TAG = 'objectdata';
  const SIGNER_TAG = 'objectfield';
  const COMMENT_TAG = 'commentanchor'; // NEW: text-range comment anchor (no production equivalent yet)
  const fa = (el, k) => el.getAttribute(k) || '';
  function chipHTML(scope, key, opts = {}) {
    const listKey = scope === 'record' ? '' : opts.listKey;
    const { f, label } = chipLabel(scope, key, listKey);
    const de = key === '$index' ? null : deFor(scope, key, listKey);
    const attrs = [
      ['class', 'mention_tool_at'], ['contenteditable', 'false'],
      ['dataelementid', de?.id || ''], ['label', label], ['datatype', DATATYPE[f?.type] || 'string'],
      ['datakey', key === '$index' ? '$index' : (de?.apiName || key)], ['format', opts.format || ''],
    ];
    if (opts.fallback) attrs.push(['defaultvalue', opts.fallback]); // NEW attribute
    return `<${FIELD_TAG} ${attrs.map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}>${esc(label)}</${FIELD_TAG}>`;
  }
  function chipNode(scope, key, listKey) {
    const t = document.createElement('span');
    t.innerHTML = chipHTML(scope, key, { listKey });
    return t.firstChild;
  }
  function sectionOfNode(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const rs = el?.closest('.rs');
    return rs ? SECTIONS.get(rs.dataset.rs) : null;
  }
  // What a chip points at. Scope comes from the data element's object, not from a stored attribute.
  function chipMeta(ch) {
    const id = fa(ch, 'dataelementid');
    const hit = id && DE_BY_ID.get(id);
    if (hit) return { scope: hit.scope, key: hit.key, listKey: hit.listKey || '', format: fa(ch, 'format'), fallback: fa(ch, 'defaultvalue') };
    if (fa(ch, 'datakey') === '$index') return { scope: 'item', key: '$index', listKey: sectionOfNode(ch)?.cfg.source || '', format: fa(ch, 'format'), fallback: '' };
    return { scope: 'record', key: fa(ch, 'datakey'), listKey: '', format: fa(ch, 'format'), fallback: fa(ch, 'defaultvalue'), unknown: true };
  }
  function refreshChips(root) {
    $$(FIELD_TAG, root).forEach((ch) => {
      const m = chipMeta(ch);
      const sec = sectionOfNode(ch);
      const { f, label } = chipLabel(m.scope, m.key, m.listKey);
      const valid = !!f && !m.unknown && (m.scope === 'record' || (sec && sec.cfg.source === m.listKey));
      if (ch.textContent !== label) ch.textContent = label;
      if (fa(ch, 'label') !== label) ch.setAttribute('label', label);
      ch.toggleAttribute('data-invalid', !valid); // UI-only attribute: not whitelisted, so never saved
      ch.title = `${m.scope === 'item' ? 'Changes for each record in the repeat' : 'From the Deal'}${m.fallback ? ` · if empty: “${m.fallback}”` : ''}`;
    });
  }

  // HTML the sanitizer must keep in every block (declared on the textAlign tune, which every block has).
  const BROAD = {
    b: {}, strong: {}, i: {}, em: {}, u: {}, s: {}, strike: {}, br: {}, sub: {}, sup: {},
    a: { href: true, target: '_blank', rel: 'nofollow' },
    span: true, font: true,
    [FIELD_TAG]: { class: 'mention_tool_at', contenteditable: true, dataelementid: true, label: true, datatype: true, datakey: true, format: true, defaultvalue: true },
    [SIGNER_TAG]: { class: 'mention_tool_at', contenteditable: true, label: true, datatype: true, datakey: true, format: true, profileid: true, fieldkey: true, isrequired: true, style: true, dataelementid: true, setcurrentdate: true },
    [COMMENT_TAG]: { threadid: true },
  };

  // ---------------------------------------------------------------- template_field_configuration (rules)
  // Filters, sorts and visibility rules live in their own rows and are referenced by id, as in production.
  const TFC = new Map(); // id -> { id, type, name, config_json }
  const newTfcId = () => `stfc-${crypto.randomUUID()}`;
  const OP_TO_DB = {
    eq: 'EQUAL', neq: 'NOT_EQUAL', contains: 'CONTAINS', gt: 'GREATER_THAN', gte: 'GREATER_THAN_OR_EQUAL', lt: 'LESS_THAN', lte: 'LESS_THAN_OR_EQUAL',
    empty: 'IS_EMPTY', notempty: 'IS_NOT_EMPTY', before: 'LESS_THAN', after: 'GREATER_THAN', true: 'EQUAL', false: 'EQUAL',
    first: 'IS_FIRST', last: 'IS_LAST', notfirst: 'IS_NOT_FIRST', notlast: 'IS_NOT_LAST', odd: 'IS_ODD', even: 'IS_EVEN',
  };
  const DB_TO_OP = { EQUAL: 'eq', NOT_EQUAL: 'neq', CONTAINS: 'contains', DOES_NOT_CONTAIN: 'neq', STARTS_WITH: 'contains', GREATER_THAN: 'gt', GREATER_THAN_OR_EQUAL: 'gte', LESS_THAN: 'lt', LESS_THAN_OR_EQUAL: 'lte', IS_EMPTY: 'empty', IS_NOT_EMPTY: 'notempty', IS_FIRST: 'first', IS_LAST: 'last', IS_NOT_FIRST: 'notfirst', IS_NOT_LAST: 'notlast', IS_ODD: 'odd', IS_EVEN: 'even' };
  function operandFor(rule, listKey) {
    if (rule.scope === 'pos') return { type: 'loopPosition' };            // NEW operand type
    if (rule.field === '$index') return { type: 'loopIndex' };            // NEW operand type
    const de = deFor(rule.scope, rule.field, listKey);
    return { type: 'dataElement', label: chipLabel(rule.scope, rule.field, listKey).label, value: de?.id, apiName: de?.apiName, objectLabel: de?.objectLabel };
  }
  function rightFor(rule) {
    if (rule.op === 'true' || rule.op === 'false') return [{ type: 'expression', parts: [{ type: 'static', value: rule.op }] }];
    if (NO_VALUE_OPS.has(rule.op)) return [];
    return [{ type: 'expression', parts: [{ type: 'static', value: String(rule.value ?? '') }] }];
  }
  function withMatch(cfg) { return cfg; } // rules are additive (AND) only, as in production; no OR key is written
  function toVisibilityConfig(rules, match, listKey) {
    return withMatch({ type: 'expression', parts: rules.map((r) => ({ operator: OP_TO_DB[r.op], leftOperand: operandFor(r, listKey), rightOperand: rightFor(r) })) }, match);
  }
  function toFilterConfig(rules, match, listKey) {
    return withMatch({ type: 'expression', parts: rules.map((r) => { const o = operandFor(r, listKey); return { operator: OP_TO_DB[r.op], filterKey: { type: o.type, value: o.value, apiName: o.apiName }, filterValue: rightFor(r) }; }) }, match);
  }
  function toSortConfig(sort, listKey) {
    const de = deFor('item', sort.field, listKey);
    return { type: 'expression', parts: [{ type: 'dataElement', value: de?.id, apiName: de?.apiName, direction: sort.dir }] };
  }
  function ruleFromOperand(operand, operator, right, listKey) {
    const value = right?.[0]?.parts?.[0]?.value ?? '';
    if (operand?.type === 'loopPosition') return { scope: 'pos', field: '$position', op: DB_TO_OP[operator] || 'last', value: '' };
    if (operand?.type === 'loopIndex') return { scope: 'item', field: '$index', op: DB_TO_OP[operator] || 'eq', value };
    const hit = DE_BY_ID.get(operand?.value);
    if (!hit) return null;
    const f = fieldFor(hit.scope, hit.key, hit.listKey || listKey);
    let op = DB_TO_OP[operator] || 'eq';
    if (f?.type === 'boolean') op = value === 'false' ? 'false' : 'true';
    if (f?.type === 'date' && op === 'lt') op = 'before';
    if (f?.type === 'date' && op === 'gt') op = 'after';
    return { scope: hit.scope, field: hit.key, op, value: NO_VALUE_OPS.has(op) ? '' : value };
  }
  function fromVisibilityConfig(cfg, listKey) {
    return { match: 'all', rules: (cfg?.parts || []).map((p) => ruleFromOperand(p.leftOperand, p.operator, p.rightOperand, listKey)).filter(Boolean) };
  }
  function fromFilterConfig(cfg, listKey) {
    return { match: 'all', rules: (cfg?.parts || []).map((p) => ruleFromOperand(p.filterKey, p.operator, p.filterValue, listKey)).filter(Boolean) };
  }
  function fromSortConfig(cfg) {
    const p = cfg?.parts?.[0];
    const hit = p && DE_BY_ID.get(p.value);
    return hit ? { field: hit.key, dir: p.direction || 'asc' } : { field: '', dir: 'asc' };
  }
  function putTfc(id, type, config_json) { const rid = id || newTfcId(); TFC.set(rid, { id: rid, type, name: '', config_json }); return rid; }

  // ---------------------------------------------------------------- block format adapter (content_json <-> Editor.js plugins)
  // Stored shape: { id, time, tool, data, tunes, type }. Tables use production's cell-object format.
  const TABLE_PROPERTIES = { fontFamily: 'Arial', fontSize: '10', fontWeight: '400', lineHeight: '1', color: '#000000', headerFontFamily: 'Arial', headerFontSize: '10', headerFontWeight: '700', headerLineHeight: '1', headerColor: '#000000', padding: 8, spacing: 0, borderSize: '1', borderStyle: 'solid', borderColor: '#DBDBE2', fillColor: '#FFFFFF', altFillColor: '#FFFFFF', headerFillColor: '#FFFFFF', showHeader: true, border: 'allBorder', borderCollapse: '' };
  function tableToDb(d) {
    const rows = (d.content || []).map((r, ri) => r.map((c) => ({ content: c, colspan: 1, rowspan: 1, display: true, bgColor: 'rgb(255, 255, 255)', isBgColorCustomized: false, isHeader: !!d.withHeadings && ri === 0, color: '', fontSize: '', height: '37.2266px', textAlign: '', padding: '8px', verticalAlign: '' })));
    return { rows, colgroup: (rows[0] || []).map(() => ({ span: 1, width: '' })), properties: { ...TABLE_PROPERTIES, rowIndex: Math.max(0, rows.length - 1), columnIndex: Math.max(0, (rows[0]?.length || 1) - 1) } };
  }
  function tableFromDb(d) {
    const rows = d.rows || [];
    return { withHeadings: !!rows[0]?.[0]?.isHeader, content: rows.map((r) => r.map((c) => c.content || '')) };
  }
  function blockToDb(b) {
    let data = b.data;
    if (b.type === 'table') data = tableToDb(b.data);
    if (b.type === 'list') data = { style: b.data.style, styleType: b.data.style === 'ordered' ? 'decimal' : 'disc', items: b.data.items };
    return { id: b.id, time: 0, tool: b.type, data, tunes: b.tunes || {}, type: b.type };
  }
  function blockFromDb(cj) {
    const type = cj.type || cj.tool;
    return { id: cj.id, type, data: type === 'table' ? tableFromDb(cj.data) : cj.data, tunes: cj.tunes || {} };
  }

  // ---------------------------------------------------------------- tunes (production: textAlign + indentation)
  const ALIGN = new Map();   // block id -> TextAlignTune
  const INDENT = new Map();  // block id -> IndentationTune
  const LOCKED = new Set();  // block ids whose content_block row has is_locked = true
  class TextAlignTune {
    static get isTune() { return true; }
    static get sanitize() { return BROAD; }
    constructor({ data, block }) { this.block = block; this.value = typeof data === 'string' ? data : 'left'; if (block) ALIGN.set(block.id, this); }
    render() {
      return [['left', 'Align left', ICON.alignL], ['center', 'Align center', ICON.alignC], ['right', 'Align right', ICON.alignR], ['justify', 'Justify', ICON.alignJ]]
        .map(([a, t, i]) => ({ icon: i, title: t, toggle: 'align', isActive: this.value === a, closeOnActivate: true, onActivate: () => this.set(a) }));
    }
    wrap(content) { this.el = document.createElement('div'); this.el.className = 'fmt'; this.el.append(content); this.apply(); return this.el; }
    apply() { if (this.el) this.el.dataset.align = this.value; }
    set(v) { this.value = v; this.apply(); this.block?.dispatchChange(); }
    save() { return this.value; }
  }
  class IndentationTune {
    static get isTune() { return true; }
    constructor({ data, block }) { this.block = block; this.level = data?.indentLevel || 0; if (block) INDENT.set(block.id, this); }
    render() {
      return [
        { icon: svg('<line x1="4" y1="5" x2="20" y2="5"/><line x1="11" y1="10" x2="20" y2="10"/><line x1="11" y1="14" x2="20" y2="14"/><line x1="4" y1="19" x2="20" y2="19"/><path d="M4 9l3 3-3 3"/>'), title: 'Increase indent', closeOnActivate: true, onActivate: () => this.set(this.level + 1) },
        { icon: svg('<line x1="4" y1="5" x2="20" y2="5"/><line x1="11" y1="10" x2="20" y2="10"/><line x1="11" y1="14" x2="20" y2="14"/><line x1="4" y1="19" x2="20" y2="19"/><path d="M8 9l-3 3 3 3"/>'), title: 'Decrease indent', closeOnActivate: true, onActivate: () => this.set(this.level - 1) },
      ];
    }
    wrap(content) { this.el = document.createElement('div'); this.el.append(content); this.apply(); return this.el; }
    apply() { if (this.el) this.el.style.paddingLeft = this.level ? `${this.level * 24}px` : ''; }
    set(n) { this.level = Math.max(0, Math.min(8, n)); this.apply(); this.block?.dispatchChange(); }
    save() { return { indentLevel: this.level }; }
  }
  // Row-level lock (content_block.is_locked). Saves nothing into content_json.
  class LockTune {
    static get isTune() { return true; }
    constructor({ block }) { this.block = block; }
    render() {
      const on = LOCKED.has(this.block.id);
      return { icon: ICON.lock, title: on ? 'Unlock block' : 'Lock block', closeOnActivate: true, onActivate: () => { if (on) LOCKED.delete(this.block.id); else LOCKED.add(this.block.id); this.apply(); this.block.dispatchChange(); } };
    }
    wrap(content) { this.el = document.createElement('div'); this.el.className = 'lockwrap'; this.el.append(content); requestAnimationFrame(() => this.apply()); return this.el; }
    apply() { this.el?.classList.toggle('is-locked', LOCKED.has(this.block.id)); }
    save() { return undefined; }
  }

  // Show if… on blocks inside a Repeating Section. Stored as tunes.visibilityRuleId -> template_field_configuration
  // (type visibility_field), the same rule format production uses for content_block.template_visibility_rule_id.
  class ConditionTune {
    static get isTune() { return true; }
    constructor({ data, block }) {
      this.block = block;
      this.ruleId = typeof data === 'string' ? data : null;
      this.pending = this.ruleId ? TFC.get(this.ruleId)?.config_json : null; // parsed once the section is known
      this.data = { match: 'all', rules: [] };
      if (block) COND.set(block.id, this);
    }
    get id() { return this.block.id; }
    render() {
      const has = this.data.rules.length > 0;
      const items = [{
        icon: ICON.branch, title: has ? 'Edit condition' : 'Show if…', closeOnActivate: true,
        onActivate: () => { if (!this.data.rules.length) this.addDefault(); select('cond', this.id); },
      }];
      if (has) items.push({ icon: ICON.x, title: 'Remove condition', closeOnActivate: true, onActivate: () => this.clear() });
      return items;
    }
    wrap(content) {
      this.el = document.createElement('div');
      this.el.className = 'cw';
      this.el.innerHTML = `<div class="cond-head" contenteditable="false">${ICON.branch}<span class="cond-kw">Show if</span><span class="cond-summary"></span><button class="cond-btn" type="button" title="Remove condition, keep content">${ICON.x}</button></div><div class="cw-body"></div>`;
      this.el.querySelector('.cw-body').append(content);
      const head = this.el.querySelector('.cond-head');
      head.addEventListener('mousedown', (e) => e.preventDefault());
      head.addEventListener('click', (e) => {
        if (e.target.closest('.cond-btn')) { this.clear(); return; }
        select('cond', this.id);
      });
      if (this.pending) { this.data = fromVisibilityConfig(this.pending, null); this.pending = null; }
      this.update(false);
      return this.el;
    }
    section() { return sectionOfNode(this.el); }
    addDefault() {
      const src = this.section()?.cfg.source;
      this.data.rules.push(src ? newRule('cond', src) : { scope: 'pos', field: '$position', op: 'last', value: '' });
      this.update();
    }
    clear() {
      this.data.rules = [];
      this.update();
      if (state.selected?.type === 'cond' && state.selected.id === this.id) select(null);
      toast('Condition removed; the block now always shows');
    }
    update(dispatch = true) {
      if (!this.el) return;
      const on = this.data.rules.length > 0;
      this.el.classList.toggle('is-on', on);
      const src = this.section()?.cfg.source;
      this.el.querySelector('.cond-summary').textContent = this.data.rules.map((r) => ruleText(r, src)).join(this.data.match === 'any' ? ' or ' : ' and ');
      if (dispatch) this.block?.dispatchChange();
    }
    save() {
      if (!this.data.rules.length) return undefined;
      this.ruleId = putTfc(this.ruleId, 'visibility_field', toVisibilityConfig(this.data.rules, this.data.match, this.section()?.cfg.source));
      return this.ruleId;
    }
  }

  // ---------------------------------------------------------------- inline tool: Field
  class FieldInline {
    static get isInline() { return true; }
    static get title() { return 'Insert field'; }
    static get sanitize() { return { [FIELD_TAG]: BROAD[FIELD_TAG] }; }
    constructor({ api }) { this.api = api; }
    render() {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ce-inline-tool ejs-field-btn';
      b.innerHTML = `${TYPE_ICON.text.replace('<svg', '<svg width="13" height="13"')}Field`;
      return b;
    }
    surround(range) {
      const q = range.toString().trim();
      range.deleteContents();
      const t = document.createTextNode('@' + q);
      range.insertNode(t);
      this.api.inlineToolbar.close();
      placeCaret(t, t.length);
      startAt(t, 0);
    }
    checkState() { return false; }
  }

  // ---------------------------------------------------------------- simple block tools
  // Image: production data shape { file: { url, fileId, data, styles }, editorType, width, height, type }.
  class StaticImage {
    static get toolbox() { return { title: 'Image', icon: ICON.image }; }
    constructor({ data }) {
      this.data = data?.file ? data : {
        file: { url: staticImage(), fileId: '', data: { name: '', contentType: 'fromLink', fileName: '', dataElementId: '', dataElementLabel: '', dataKey: '' }, styles: { objectFit: 'fill', padding: '', margin: '', fillColor: '', borderColor: '', borderSize: '', isAspectRatioEnabled: true, aspectRatio: 2.67 } },
        editorType: 'body', width: '220px', height: '82px', type: 'image',
      };
    }
    render() { const d = document.createElement('div'); d.className = 'ejs-img'; d.innerHTML = `<img src="${this.data.file.url}" alt="" style="width:${this.data.width};height:${this.data.height}">`; return d; }
    save() { return this.data; }
  }
  class PageBreak {
    static get toolbox() { return { title: 'Page Break', icon: ICON.pagebreak }; }
    render() { const d = document.createElement('div'); d.className = 'ejs-pagebreak'; return d; }
    save() { return {}; }
  }
  // Existing Related List widget, production format (datasource / tableConfig.columnConfig / displayConfig.type = table|ol|ul).
  function relatedListTableData(listKey, cols) {
    const l = listDef(listKey);
    return {
      settings: {}, title: 'List', blockId: '', type: 'relatedList',
      datasource: { name: l.label, displayName: '', displayType: '', maxRecordsCount: 0, previewRecords: 5 },
      tableConfig: {
        properties: { border: '' },
        columnConfig: cols.map((k) => {
          const f = l.fields.find((x) => x.key === k);
          const de = deFor('item', k, listKey);
          const style = { bgColor: '', color: '', bold: false, italic: false, underline: false, fontSize: '' };
          return { label: f.label, dataType: DATATYPE[f.type], ...style, dataKey: f.label, width: '', dataConfig: { label: f.label, attribute: de.id, columnWidth: '', format: { currency: 'Currency', boolean: 'Yes/No', date: 'MM/dd/yyyy', number: 'Plain text' }[f.type] || 'None', autoSum: false, ...style }, aggregatorConfig: { ...style } };
        }),
      },
      filterBy: '', sort: '', isPreviewMode: false,
      displayConfig: { type: 'table', showHeader: true, headerFillColor: '#FFFFFF', bandedColor: false, altFillColor: '#FFFFFF', fillColor: '#FFFFFF', borderColor: '#000000', padding: 2, spacing: 0, borderSize: '1', borderStyle: 'solid' },
    };
  }
  class RelatedListLegacy {
    constructor({ data, block, readOnly }) {
      this.block = block;
      // Editor.js 2.29 composes toolbox-preset data by saving a throwaway read-only instance built from {} and
      // merging it with the preset. Return nothing for that instance so the preset (e.g. repeatingSection) wins.
      this.composing = readOnly && !data?.datasource;
      this.data = data?.datasource ? data : relatedListTableData('line_items', ['product_type', 'name', 'quantity', 'net_price', 'create_date']);
    }
    render() {
      const d = document.createElement('div');
      d.className = 'legacy-rl';
      d.title = 'Existing Related List widget (table)';
      const cols = this.data.tableConfig.columnConfig.map((c) => c.label);
      d.innerHTML = `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody><tr>${cols.map((c, i) => `<td class="${i === 0 ? 'lbl' : ''}">${i === 0 ? '' : esc(c)}</td>`).join('')}</tr></tbody></table>`;
      return d;
    }
    save() { return this.composing ? {} : { ...this.data, blockId: this.block?.id || this.data.blockId }; }
  }
  // One tool key, two toolbox entries: the existing table widget and the new repeating section
  // (a new displayConfig.type on the same relatedList block).
  class RelatedListTool {
    static get toolbox() {
      return [
        { title: 'Related Object', icon: ICON.related, data: { displayConfig: { type: 'table' } } },
        { title: 'Repeating Section', icon: ICON.repeat, data: { displayConfig: { type: 'repeatingSection' } } },
      ];
    }
    static get enableLineBreaks() { return true; }        // outer editor: don't split/create blocks on Enter
    static get sanitize() { return { blocks: BROAD }; }   // keep inline HTML in the nested blocks
    constructor(args) {
      return args.data?.displayConfig?.type === 'repeatingSection' ? new RepeatingSection(args) : new RelatedListLegacy(args);
    }
  }
  // Toolbox entry that swaps itself for a paragraph with a condition (2.29 can't insert tune data directly).
  class ConditionalText {
    static get toolbox() { return { title: 'Conditional text', icon: ICON.branch }; }
    constructor({ api, block }) { this.api = api; this.block = block; }
    render() { return document.createElement('div'); }
    rendered() {
      setTimeout(() => {
        const idx = this.api.blocks.getBlockIndex(this.block.id);
        const nb = this.api.blocks.insert('paragraph', { text: '' }, {}, idx, true, true);
        requestAnimationFrame(() => focusConditional(nb));
      }, 0);
    }
    save() { return {}; }
  }

  // ---------------------------------------------------------------- Repeating Section (relatedList, displayConfig.type = "repeatingSection")
  function defaultSection(source = null) {
    return {
      source, filters: [], filterMatch: 'all', sort: { field: '', dir: 'asc' }, limit: '',
      separator: 'none', zebra: false, zebraColor: '#f4f6fb', emptyMode: 'hide', emptyText: 'No items to show.',
    };
  }
  // relatedList data (+ referenced template_field_configuration rows) -> internal section model
  function sectionFromData(d) {
    const source = listKeyByName(d?.datasource?.name);
    const dc = d?.displayConfig || {};
    const filt = fromFilterConfig(TFC.get(d?.filterBy)?.config_json, source);
    return {
      ...defaultSection(source),
      filters: filt.rules, filterMatch: filt.match,
      sort: fromSortConfig(TFC.get(d?.sort)?.config_json),
      limit: d?.datasource?.maxRecordsCount ? String(d.datasource.maxRecordsCount) : '',
      separator: ['space', 'pagebreak'].includes(dc.separator) ? dc.separator : 'none', zebra: !!dc.bandedColor, zebraColor: dc.altFillColor || '#f4f6fb',
      emptyMode: dc.emptyState?.mode || 'hide', emptyText: dc.emptyState?.text || 'No items to show.',
    };
  }
  function sectionSummary(cfg) {
    const parts = [];
    if (cfg.filters.length) parts.push('where ' + cfg.filters.map((r) => ruleText(r, cfg.source)).join(cfg.filterMatch === 'any' ? ' or ' : ' and '));
    if (cfg.sort.field) parts.push(`by ${fieldFor('item', cfg.sort.field, cfg.source)?.label} ${cfg.sort.dir === 'desc' ? '↓' : '↑'}`);
    parts.push(cfg.limit ? `first ${cfg.limit}` : 'all records');
    const sep = { space: 'space between', pagebreak: 'page break between' }[cfg.separator];
    if (sep) parts.push(sep);
    return parts.join(' · ');
  }
  let rsCounter = 0;

  class RepeatingSection {
    constructor({ data, api, block }) {
      this.api = api;
      this.block = block;
      this.id = block?.id || `rs${++rsCounter}`;
      this.cfg = sectionFromData(data);
      this.filterId = data?.filterBy || null;
      this.sortId = data?.sort || null;
      this.content = { blocks: (data?.blocks || []).map(blockFromDb) };
      // Editor.js also constructs throwaway instances (no block) for the toolbox; don't register those.
      if (block) SECTIONS.set(this.id, this);
    }
    render() {
      const el = document.createElement('div');
      el.className = 'rs';
      el.dataset.rs = this.id;
      el.innerHTML = `
        <div class="rs-head">
          <span class="rs-tag">${ICON.repeat}<span class="rs-title"></span></span>
          <span class="rs-summary"></span>
          <span class="rs-actions">
            <button type="button" class="rs-btn" data-act="rs-settings" title="Section settings">${ICON.gear}</button>
            <button type="button" class="rs-btn" data-act="rs-delete" title="Delete section">${ICON.trash}</button>
          </span>
        </div>
        <div class="rs-picker"></div>
        <div class="rs-body"><div class="rs-holder"></div></div>
        <div class="rs-foot"><span>${ICON.repeat} End of repeat</span></div>
        <div class="rs-stack"></div><div class="rs-stack two"></div>`;
      this.el = el;
      // Keep the outer editor out of the inner one's business.
      const body = el.querySelector('.rs-body');
      ['keydown', 'keyup', 'keypress', 'paste', 'cut', 'copy', 'mousemove', 'mouseover', 'drop', 'dragover', 'dragstart', 'input', 'beforeinput']
        .forEach((ev) => body.addEventListener(ev, (e) => e.stopPropagation()));
      el.addEventListener('click', (e) => {
        if (body.contains(e.target)) return;
        const a = e.target.closest('[data-act]');
        if (a?.dataset.act === 'rs-delete') { this.remove(); return; }
        if (a?.dataset.act === 'rs-pick') { this.bind(a.dataset.list); return; }
        if (e.target.closest('.rs-head') || a?.dataset.act === 'rs-settings') select('rs', this.id);
      });
      this.updateChrome();
      if (this.cfg.source) this.mountInner();
      return el;
    }
    bind(source) {
      this.cfg.source = source;
      this.updateChrome();
      this.mountInner(true);
      state.selected = null;
      select('rs', this.id);
      this.block?.dispatchChange();
    }
    mountInner(focus) {
      if (this.inner) return;
      const holder = this.el.querySelector('.rs-holder');
      this.inner = new EditorJS({
        holder,
        tools: innerTools(),
        tunes: ['textAlign', 'indentation', 'visibilityRuleId', 'commentBlock'],
        data: this.content,
        minHeight: 0,
        placeholder: 'Type here, or press @ to add a field. This repeats for each record.',
        onReady: () => {
          EDITORS.set(holder, this.inner); // register only once the API (blocks, caret…) exists
          refreshChips(holder);
          COND.forEach((t) => { if (holder.contains(t.el)) t.update(false); });
          if (focus) this.inner.caret.setToFirstBlock('start');
          scheduleLayout();
        },
        onChange: () => { this.block?.dispatchChange(); scheduleJson(); scheduleLayout(); },
      });
    }
    updateChrome() {
      const el = this.el, cfg = this.cfg, l = listDef(cfg.source);
      el.classList.toggle('is-unbound', !l);
      el.querySelector('.rs-title').innerHTML = l ? `Repeat for each <b>${l.singular}</b>` : 'Repeating Section';
      el.querySelector('.rs-summary').textContent = l ? sectionSummary(cfg) : '';
      if (!l) {
        el.querySelector('.rs-picker').innerHTML = `
          <div class="rs-picker-title">What should this section repeat for?</div>
          <div class="rs-picker-sub">Pick a related list on Deal. Everything you put in this section repeats once per record in that list.</div>
          <div class="rs-picker-grid">${RELATED_LISTS.map((x) => `
            <button type="button" class="rs-pick" data-act="rs-pick" data-list="${x.key}">
              <span class="rs-pick-ico">${ICON[x.icon]}</span><span><b>${x.label}</b><small>${x.description}</small></span>
            </button>`).join('')}</div>`;
      }
      refreshChips(el);
      COND.forEach((t) => { if (t.el && el.contains(t.el)) t.update(false); });
    }
    changed() { this.updateChrome(); this.block?.dispatchChange(); }
    remove() {
      const idx = outer.blocks.getBlockIndex(this.id);
      if (state.selected?.id === this.id) select(null);
      outer.blocks.delete(idx);
      toast('Repeating Section deleted (Editor.js has no built-in undo)');
    }
    // Saved as a relatedList block (production shape) with a new display type and nested blocks.
    async save() {
      if (this.inner) await this.inner.isReady; // the nested editor's API only exists once it's ready
      const out = this.inner ? await this.inner.save() : this.content;
      const cfg = this.cfg, l = listDef(cfg.source);
      this.filterId = cfg.filters.length ? putTfc(this.filterId, 'related_data_filter', toFilterConfig(cfg.filters, cfg.filterMatch, cfg.source)) : null;
      this.sortId = cfg.sort.field ? putTfc(this.sortId, 'related_data_sort', toSortConfig(cfg.sort, cfg.source)) : null;
      return {
        settings: {}, title: l ? l.label : 'List', blockId: this.block?.id || this.id, type: 'relatedList',
        datasource: { name: l ? l.label : '', displayName: '', displayType: '', maxRecordsCount: Number(cfg.limit) || 0, previewRecords: 5 },
        tableConfig: { properties: { border: '' }, columnConfig: [] },
        filterBy: this.filterId || '', sort: this.sortId || '', isPreviewMode: false,
        displayConfig: {
          type: 'repeatingSection',                                  // NEW display type (existing: table | ol | ul)
          separator: cfg.separator,                                  // NEW: none | space | pagebreak
          bandedColor: cfg.zebra, altFillColor: cfg.zebraColor,      // existing keys, reused for alternate shading
          emptyState: { mode: cfg.emptyMode, text: cfg.emptyText },  // NEW
        },
        blocks: out.blocks.map(blockToDb),                           // NEW: the repeated content, same block format
      };
    }
    destroy() { this.inner?.destroy?.(); SECTIONS.delete(this.id); }
  }

  // ---------------------------------------------------------------- tool sets (keys match production tool names)
  const INLINE = ['bold', 'italic', 'link', 'field', 'comment'];
  function baseTools() {
    return {
      paragraph: { class: Paragraph, inlineToolbar: INLINE, config: { preserveBlank: true } },
      heading: { class: Header, inlineToolbar: INLINE, config: { levels: [1, 2, 3], defaultLevel: 2 }, tunes: ['textAlign', 'commentBlock'] }, // production headings carry textAlign only
      list: { class: List, inlineToolbar: INLINE, config: { defaultStyle: 'unordered' } },
      table: { class: Table, inlineToolbar: INLINE, config: { rows: 2, cols: 3 } },
      image: { class: StaticImage },
      pageBreak: { class: PageBreak },
      field: { class: FieldInline },
      comment: { class: CommentInline },
      textAlign: { class: TextAlignTune },
      indentation: { class: IndentationTune },
      commentBlock: { class: CommentTune },
    };
  }
  function outerTools() {
    return {
      ...baseTools(),
      lock: { class: LockTune },
      relatedList: { class: RelatedListTool, tunes: ['commentBlock'] },
    };
  }
  function innerTools() {
    return { ...baseTools(), conditionalText: { class: ConditionalText }, visibilityRuleId: { class: ConditionTune } };
  }

  // ---------------------------------------------------------------- seed template, stored as content_block rows
  const TEMPLATE = { id: 'st-9f3c1a7e-2', label: 'Quote', primary_object: 'DEAL', type: 'CONTENT_BLOCKS', format: 'pdf' };
  const SECTION = { id: 'sst-4be21c90-7', section_type: 'BODY', display_order: 0, template_id: TEMPLATE.id };
  const ROW_IDS = new Map();    // Editor.js block id -> content_block.id (scb-…)
  const ROW_RULES = new Map();  // Editor.js block id -> template_visibility_rule_id (row-level, passed through)
  const rowIdFor = (blockId) => { if (!ROW_IDS.has(blockId)) ROW_IDS.set(blockId, `scb-${crypto.randomUUID()}`); return ROW_IDS.get(blockId); };
  const ejsId = () => Math.random().toString(36).slice(2, 12).padEnd(10, 'x');

  function seedRows() {
    const r = (k, o) => chipHTML('record', k, o);
    const it = (k, o) => chipHTML('item', k, { listKey: 'line_items', ...o });
    const signer = (label, datatype, datakey, fieldkey, required) => `<${SIGNER_TAG} class="mention_tool_at" contenteditable="false" label="${label}" datatype="${datatype}" datakey="${datakey}" format="" profileid="sp-0000demo-1" fieldkey="${fieldkey}" isrequired="${required}" style="--field-placeholder-content: &quot;${label}&quot;; background-color: var(--Yellow-50, #FEFBE8); border-color: var(--Yellow-400, #FAC515);" dataelementid=""></${SIGNER_TAG}>`;
    const para = (text, extra = {}) => ({ tool: 'paragraph', data: { text }, tunes: { textAlign: 'left', indentation: { indentLevel: 0 }, ...extra } });
    const heading = (text, level, align = 'left') => ({ tool: 'heading', data: { text, level }, tunes: { textAlign: align } });

    // Rules referenced by id (template_field_configuration)
    const filterId = putTfc('stfc-2f6a8c41-19d3-4b8e-9a0c-5e7d21b3c8f4', 'related_data_filter', toFilterConfig([{ scope: 'item', field: 'quantity', op: 'gt', value: '0' }], 'all', 'line_items'));
    const sortId = putTfc('stfc-7c0e5b92-3a1f-4d6e-8b27-9f4c1a6d3e05', 'related_data_sort', toSortConfig({ field: 'net_price', dir: 'desc' }, 'line_items'));
    const hwRule = putTfc('stfc-a41d7e3b-6c28-4f95-b0e1-2d8c9f5a7b63', 'visibility_field', toVisibilityConfig([{ scope: 'item', field: 'product_type', op: 'eq', value: 'Hardware' }], 'all', 'line_items'));
    const recurRule = putTfc('stfc-5e9b2c6d-8f14-4a37-9c0d-1b7e3f6a2d48', 'visibility_field', toVisibilityConfig([{ scope: 'item', field: 'is_recurring', op: 'true', value: '' }], 'all', 'line_items'));
    const lastRule = putTfc('stfc-c83f1a5e-2d47-4b69-a0e8-6f9d2c1b5a74', 'visibility_field', toVisibilityConfig([{ scope: 'pos', field: '$position', op: 'last', value: '' }], 'all', 'line_items'));

    const inner = [
      heading(it('name'), 3),
      para(it('product_image')),
      para(it('description', { fallback: 'No description provided.' })),
      para(`SKU ${it('sku')} · Type ${it('product_type')}`),
      para(`Quantity ${it('quantity')} × ${it('unit_price')} · Discount ${it('discount')}`),
      para(`<i>Includes a <${COMMENT_TAG} threadid="sdc-Wq3HhX9kLm2P">3-year hardware warranty</${COMMENT_TAG}> with next-business-day replacement.</i>`, { visibilityRuleId: hwRule }),
      para(`Billed annually for ${it('term_months', { fallback: '12' })} months. Renews automatically unless cancelled 30 days before the end of the term.`, { visibilityRuleId: recurRule }),
      para(`<${COMMENT_TAG} threadid="sdc-Rt7VbN2qXc5J">Line total</${COMMENT_TAG}>: <b>${it('net_price')}</b>`),
      para('<span style="color: rgb(92, 99, 112); font-size: 11px;">All prices are in USD and exclude applicable taxes.</span>', { visibilityRuleId: lastRule }),
    ];
    const blocks = [
      heading(`Quote# ${r('record_id')}`, 1, 'center'),
      para(`For ${r('company')}`, { textAlign: 'center' }),
      { tool: 'table', data: tableToDb({ withHeadings: true, content: [[r('company'), ''], [`${r('street')}<br>${r('city')}<br>${r('state')} - ${r('postal')}`, '']] }), tunes: { textAlign: 'left' } },
      heading('Included Products', 2),
      { tool: 'relatedList', data: relatedListTableData('line_items', ['product_type', 'name', 'quantity', 'net_price', 'create_date']), tunes: {} },
      heading(`Product <${COMMENT_TAG} threadid="sdc-Kp4MzT8wQa1L">details</${COMMENT_TAG}>`, 2),
      {
        tool: 'relatedList', tunes: {},
        data: {
          settings: {}, title: 'Line Items', blockId: '', type: 'relatedList',
          datasource: { name: 'Line Items', displayName: '', displayType: '', maxRecordsCount: 0, previewRecords: 5 },
          tableConfig: { properties: { border: '' }, columnConfig: [] },
          filterBy: filterId, sort: sortId, isPreviewMode: false,
          displayConfig: { type: 'repeatingSection', separator: 'space', bandedColor: false, altFillColor: '#f4f6fb', emptyState: { mode: 'message', text: 'No products have been added to this deal yet.' } },
          blocks: inner.map((b) => ({ id: ejsId(), time: 0, ...b, type: b.tool })),
        },
      },
      { id: 'Tq9ZrM2xKd', tool: 'list', data: { style: 'ordered', styleType: 'decimal', items: [`Notice of Termination: by Customer (${r('company')}) or by S-Docs, for an amount not exceeding ${r('amount')}`, 'Special Clauses'] }, tunes: { textAlign: 'left', indentation: { indentLevel: 0 } } },
      { ...para('<span style="color: rgb(138, 144, 155);">Do not modify anything below this</span>'), locked: true },
      para(`<font style="font-size: 12pt;">Signature: ${signer('Signature', 'signature', 'field_signature', 'fid-100001', 'true')}</font>`),
      para(`<font style="font-size: 12pt;">Name: ${signer('Text', 'text', 'field_text', 'fid-100002', 'false')}</font>`),
      para(`<font style="font-size: 12pt;">Signed On: ${signer('Date', 'date', 'field_date', 'fid-100003', 'false')}</font>`),
    ];
    return blocks.map((b, i) => {
      const id = b.id || ejsId();
      const { locked, tool, data, tunes } = b;
      if (tool === 'relatedList') data.blockId = id;
      return {
        id: `scb-${crypto.randomUUID()}`, section_id: SECTION.id, sequence_number: i, label: null,
        is_locked: locked ? true : null, template_visibility_rule_id: null,
        content_json: { id, time: 0, tool, data, tunes, type: tool },
      };
    });
  }
  // content_block rows -> Editor.js data (and row metadata kept aside)
  function rowsToEditor(rows) {
    const blocks = [...rows].sort((a, b) => a.sequence_number - b.sequence_number).map((row) => {
      const b = blockFromDb(row.content_json);
      ROW_IDS.set(b.id, row.id);
      if (row.is_locked) LOCKED.add(b.id);
      if (row.template_visibility_rule_id) ROW_RULES.set(b.id, row.template_visibility_rule_id);
      return b;
    });
    return { blocks };
  }
  // Editor.js save() -> what gets persisted: content_block rows + the rule rows they reference.
  async function exportAll() {
    const saved = await outer.save();
    const content_block = saved.blocks.map((b, i) => ({
      id: rowIdFor(b.id), section_id: SECTION.id, sequence_number: i, label: null,
      is_locked: LOCKED.has(b.id) ? true : null, template_visibility_rule_id: ROW_RULES.get(b.id) || null,
      content_json: blockToDb(b),
    }));
    const used = new Set();
    const walk = (blocks) => blocks.forEach((cj) => {
      if (cj.tunes?.visibilityRuleId) used.add(cj.tunes.visibilityRuleId);
      if (cj.tool === 'relatedList') { if (cj.data.filterBy) used.add(cj.data.filterBy); if (cj.data.sort) used.add(cj.data.sort); walk(cj.data.blocks || []); }
    });
    walk(content_block.map((r) => r.content_json));
    content_block.forEach((r) => { if (r.template_visibility_rule_id) used.add(r.template_visibility_rule_id); });
    const template_field_configuration = [...used].map((id) => TFC.get(id)).filter(Boolean).map((t) => ({ ...t, template_id: TEMPLATE.id }));
    return { template: TEMPLATE, section: [SECTION], content_block, template_field_configuration, template_comment: commentRows(content_block), editorjs_version: saved.version };
  }

  // ---------------------------------------------------------------- selection + side panel
  function select(type, id) {
    if (state.selected?.type === type && state.selected?.id === id) return;
    state.selected = type ? { type, id } : null;
    $$('.rs.is-selected, .cw.is-selected').forEach((e) => e.classList.remove('is-selected'));
    if (type === 'rs') SECTIONS.get(id)?.el.classList.add('is-selected');
    if (type === 'cond') COND.get(id)?.el?.classList.add('is-selected');
    if (type && state.panelView !== 'block') state.panelView = null;
    if (type === 'rs') state.focusBlock = { editor: outer, id };
    if (type === 'cond') { const t = COND.get(id); const holder = t?.el?.closest('.codex-editor')?.parentElement; state.focusBlock = { editor: EDITORS.get(holder), id }; }
    scheduleJson();
    syncHeaderButtons();
    renderPanel();
  }

  function renderPanel() {
    if (state.mode !== 'edit' && !state.panelView) { panel.hidden = true; return; }
    if (state.panelView === 'notes') { panel.hidden = false; renderNotesPanel(); return; }
    if (state.panelView === 'block') { panel.hidden = false; renderBlockPanel(); return; }
    const s = state.selected;
    if (!s) { panel.hidden = true; return; }
    if (s.type === 'rs' && !SECTIONS.get(s.id)) { panel.hidden = true; return; }
    if (s.type === 'cond' && !COND.get(s.id)) { panel.hidden = true; return; }
    panel.hidden = false;
    if (s.type === 'rs') renderSectionPanel(SECTIONS.get(s.id));
    else renderCondPanel(COND.get(s.id));
  }

  function fieldOptions(fields, scope, selected) {
    return fields.map((f) => `<option value="${scope}:${f.key}" ${selected === `${scope}:${f.key}` ? 'selected' : ''}>${esc(f.label)}</option>`).join('');
  }
  function ruleRowHTML(rule, i, listKey, groups, match) {
    const f = fieldFor(rule.scope, rule.field, listKey);
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
    return `${i > 0 ? `<div class="rule-join">${match === 'any' ? 'or' : 'and'}</div>` : ''}
      <div class="rule" data-i="${i}">
        <select class="r-field" data-r="field">${fieldSel}</select>
        <button class="rule-x" data-act="rm-rule" data-i="${i}" title="Remove">${ICON.x}</button>
        <select class="r-op ${needsValue ? '' : 'wide'}" data-r="op">${opsFor(f?.type).map((o) => `<option value="${o[0]}" ${o[0] === rule.op ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>
        ${valueCtl}
      </div>`;
  }
  function statLine(cfg, condTune) {
    const ctxs = [{ name: 'Sample data', ctx: SAMPLE }, { name: DEALS[0].label.split(' — ')[0], ctx: DEALS[0] }];
    const l = listDef(cfg.source);
    return ctxs.map(({ name, ctx }) => {
      const r = itemsFor(cfg, ctx);
      if (!condTune) return `<b>${name}:</b> ${r.items.length} of ${r.total} ${l.label.toLowerCase()} shown`;
      const c = condTune.data;
      const hits = r.items.filter((it, i) => evalRules(c.rules, c.match, it, i, r.items.length, ctx.record, cfg.source)).length;
      return `<b>${name}:</b> shows for ${hits} of ${r.items.length} repeated ${l.label.toLowerCase()}`;
    }).join('<br>');
  }
  function newRule(kind, listKey) {
    const l = listDef(listKey);
    const f = kind === 'cond' ? (l.fields.find((x) => x.type === 'picklist') || l.fields[0]) : (l.fields.find((x) => x.type === 'number') || l.fields[0]);
    return { scope: 'item', field: f.key, op: opsFor(f.type)[0][0], value: '' };
  }

  function renderSectionPanel(sec) {
    const cfg = sec.cfg;
    const l = listDef(cfg.source);
    const head = (sub) => `<div class="sp-head"><div><div class="sp-title rs-c">${ICON.repeat}<span>Repeating Section</span></div><div class="sp-sub">${sub}</div></div><button class="bj-link" data-act="view-json" title="Show the JSON for this block">{ } JSON</button><button class="sp-close" data-act="panel-close">${ICON.x}</button></div>`;
    if (!l) {
      panel.innerHTML = `${head('Choose a related list to repeat over')}
        <div class="sp-scroll"><div class="sp-sec">
          <div class="sp-row"><label>Source</label><select data-k="source"><option value="">Select a related list</option>${RELATED_LISTS.map((x) => `<option value="${x.key}">${x.label}</option>`).join('')}</select></div>
        </div></div>`;
      return;
    }
    const seps = [['none', 'None'], ['space', 'Space'], ['pagebreak', 'Page break']]; // no divider: not something production renders
    const zebraColors = ['#f4f6fb', '#f6f6f6', '#fdf7ec', '#eef8f2', '#fbf0f7'];
    const groups = [{ label: `${l.singular} fields`, scope: 'item', fields: l.fields }, { label: 'Deal fields', scope: 'record', fields: DEAL_FIELDS }];
    panel.innerHTML = `${head(`Content repeats once for each ${l.singular.toLowerCase()}`)}
      <div class="sp-scroll">
        <div class="sp-sec">
          <div class="sp-sec-title">Data</div>
          <div class="sp-row"><label>Source</label><select data-k="source">${RELATED_LISTS.map((x) => `<option value="${x.key}" ${x.key === cfg.source ? 'selected' : ''}>${x.label}</option>`).join('')}</select></div>
          <div class="sp-row top"><label>Filter</label>
            <div class="rules">
              ${cfg.filters.map((r, i) => ruleRowHTML(r, i, cfg.source, groups, cfg.filterMatch)).join('')}
              <button class="link-btn" data-act="add-filter">+ Add filter</button>
            </div>
          </div>
          <div class="sp-row"><label>Sort</label>
            <div class="inline2">
              <select data-k="sortField"><option value="">None</option>${l.fields.filter((f) => f.type !== 'image').map((f) => `<option value="${f.key}" ${f.key === cfg.sort.field ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>
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
          <label class="radio"><input type="radio" name="empty-${sec.id}" data-k="emptyMode" value="hide" ${cfg.emptyMode === 'hide' ? 'checked' : ''}> Hide the section</label>
          <label class="radio"><input type="radio" name="empty-${sec.id}" data-k="emptyMode" value="message" ${cfg.emptyMode === 'message' ? 'checked' : ''}> Show a message</label>
          ${cfg.emptyMode === 'message' ? `<textarea class="sp-textarea" data-k="emptyText">${esc(cfg.emptyText)}</textarea>` : ''}
        </div>
        <div class="sp-sec">
          <div class="sp-sec-title">Conditional content</div>
          <div class="sp-hint">Show a block only for some ${l.label.toLowerCase()}: use <b>Conditional text</b> in the <b>+</b> menu, or <b>Show if…</b> in any block's ⋮ menu.</div>
          <button class="btn-outline btn-sm" data-act="add-cond-block">${ICON.branch.replace('<svg', '<svg width="14" height="14"')} Add conditional paragraph</button>
        </div>
        <div class="sp-sec">
          <div class="sp-sec-title">Fields</div>
          <div class="sp-hint">Click to insert at the cursor, or type <kbd>@</kbd> inside the section. Fields under <i>${l.singular} fields</i> change for each ${l.singular.toLowerCase()}; Deal fields are the same in every repeat.</div>
          <div class="field-list">${itemFields(cfg.source).map((f) => `<button class="field-btn" data-act="insert-field" data-scope="item" data-field="${f.key}"><span class="at-dot item">${typeIcon(f.type)}</span>${esc(f.label)}<span class="ft">${TYPE_NAME[f.type]}</span></button>`).join('')}</div>
          <div class="sp-subtitle">From the Deal</div>
          <div class="field-list">${DEAL_FIELDS.slice(0, 5).map((f) => `<button class="field-btn rec" data-act="insert-field" data-scope="record" data-field="${f.key}"><span class="at-dot record">${typeIcon(f.type)}</span>${esc(f.label)}<span class="ft">${TYPE_NAME[f.type]}</span></button>`).join('')}</div>
        </div>
      </div>`;
  }

  function renderCondPanel(tune) {
    const c = tune.data;
    const sec = tune.section();
    const l = listDef(sec?.cfg.source);
    const groups = [
      { label: 'Loop', scope: 'pos', fields: [POSITION_FIELD] },
      { label: l ? `${l.singular} fields` : 'Item fields', scope: 'item', fields: l ? itemFields(sec.cfg.source) : [] },
      { label: 'Deal fields', scope: 'record', fields: DEAL_FIELDS },
    ];
    panel.innerHTML = `
      <div class="sp-head">
        <div><div class="sp-title cond-c">${ICON.branch}<span>Show if</span></div>
        <div class="sp-sub">Show this block only for ${l ? l.label.toLowerCase() : 'items'} that match</div></div>
        <button class="bj-link" data-act="view-json" title="Show the JSON for this block">{ } JSON</button>
        <button class="sp-close" data-act="panel-close">${ICON.x}</button>
      </div>
      <div class="sp-scroll">
        <div class="sp-sec">
          <div class="sp-sec-title">Conditions</div>
          <div class="rules">
            ${c.rules.map((r, i) => ruleRowHTML(r, i, sec?.cfg.source, groups, c.match)).join('')}
            <button class="link-btn" data-act="add-cond-rule">+ Add condition</button>
          </div>
          ${l ? `<div class="sp-stat cond-s" id="sp-stat">${ICON.info}<div>${statLine(sec.cfg, tune)}</div></div>` : ''}
        </div>
        <div class="sp-sec">
          <div class="sp-sec-title">How this works in Editor.js</div>
          <div class="sp-hint" style="margin:0">Saved as the block tune <code>tunes.visibilityRuleId</code>. It points at a <code>template_field_configuration</code> row of type <code>visibility_field</code>, which uses the same expression format as production's row-level <code>template_visibility_rule_id</code>. It's also in the block's ⋮ menu (<i>Edit condition</i> / <i>Remove condition</i>).</div>
        </div>
      </div>
      <div class="sp-foot"><button class="btn-ghost-danger" data-act="cond-clear">Remove condition, keep content</button></div>`;
  }

  function currentTarget() {
    const s = state.selected;
    if (!s) return {};
    if (s.type === 'rs') { const sec = SECTIONS.get(s.id); return { sec, rules: sec.cfg.filters, listKey: sec.cfg.source }; }
    const tune = COND.get(s.id);
    return { tune, rules: tune.data.rules, listKey: tune.section()?.cfg.source };
  }
  function afterChange(rerender) {
    const { sec, tune } = currentTarget();
    if (sec) sec.changed(); else tune?.update();
    if (rerender) renderPanel();
    else {
      const box = $('#sp-stat', panel);
      if (box) box.querySelector('div').innerHTML = sec ? statLine(sec.cfg) : statLine(tune.section().cfg, tune);
    }
    scheduleJson();
  }

  panel.addEventListener('change', (e) => {
    const t = e.target;
    if (!state.selected) return;
    const { sec, tune, rules, listKey } = currentTarget();
    if (t.dataset.r) {
      const rule = rules[Number(t.closest('.rule').dataset.i)];
      if (t.dataset.r === 'field') {
        const [scope, field] = t.value.split(':');
        Object.assign(rule, { scope, field, op: opsFor(fieldFor(scope, field, listKey).type)[0][0], value: '' });
        afterChange(true);
      } else if (t.dataset.r === 'op') { rule.op = t.value; afterChange(true); }
      else { rule.value = t.value; afterChange(false); }
      return;
    }
    const k = t.dataset.k;
    if (!k) return;
    if (tune) { tune.data[k] = t.value; afterChange(true); return; }
    const cfg = sec.cfg;
    switch (k) {
      case 'source': {
        if (!sec.inner && t.value) { sec.bind(t.value); return; }
        cfg.source = t.value || null;
        const valid = new Set(itemFields(cfg.source).map((f) => f.key));
        cfg.filters = cfg.filters.filter((r) => r.scope !== 'item' || valid.has(r.field));
        if (!valid.has(cfg.sort.field)) cfg.sort.field = '';
        afterChange(true);
        const bad = $$(`${FIELD_TAG}[data-invalid]`, sec.el).length;
        if (bad) toast(`${bad} field${bad > 1 ? 's' : ''} in this section don't exist on ${listDef(cfg.source).label}, shown in red.`);
        return;
      }
      case 'filterMatch': cfg.filterMatch = t.value; afterChange(true); return;
      case 'sortField': cfg.sort.field = t.value; afterChange(true); return;
      case 'sortDir': cfg.sort.dir = t.value; afterChange(false); return;
      case 'limit': cfg.limit = t.value; afterChange(false); return;
      case 'zebra': cfg.zebra = t.checked; afterChange(true); return;
      case 'emptyMode': cfg.emptyMode = t.value; afterChange(true); return;
      case 'emptyText': cfg.emptyText = t.value; afterChange(false); return;
    }
  });
  panel.addEventListener('input', (e) => {
    const t = e.target;
    const { sec, rules } = currentTarget();
    if (t.dataset.r === 'value' && t.tagName === 'INPUT') { rules[Number(t.closest('.rule').dataset.i)].value = t.value; afterChange(false); }
    else if (sec && t.dataset.k === 'limit') { sec.cfg.limit = t.value; afterChange(false); }
    else if (sec && t.dataset.k === 'emptyText') { sec.cfg.emptyText = t.value; sec.block?.dispatchChange(); }
  });
  panel.addEventListener('mousedown', (e) => { if (e.target.closest('[data-act="insert-field"]')) e.preventDefault(); });
  panel.addEventListener('click', (e) => {
    const segBtn = e.target.closest('[data-seg] button');
    if (segBtn) { currentTarget().sec.cfg[segBtn.parentElement.dataset.seg] = segBtn.dataset.v; afterChange(true); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { sec, tune, rules, listKey } = currentTarget();
    switch (b.dataset.act) {
      case 'panel-close':
        if (state.panelView) { state.panelView = null; syncHeaderButtons(); renderPanel(); } else select(null);
        break;
      case 'add-filter': rules.push(newRule('filter', listKey)); afterChange(true); break;
      case 'add-cond-rule': rules.push(listKey ? newRule('cond', listKey) : { scope: 'pos', field: '$position', op: 'last', value: '' }); afterChange(true); break;
      case 'rm-rule': rules.splice(Number(b.dataset.i), 1); afterChange(true); break;
      case 'zebra-color': sec.cfg.zebraColor = b.dataset.c; afterChange(true); break;
      case 'insert-field': insertFieldFromPanel(sec, b.dataset.scope, b.dataset.field); break;
      case 'add-cond-block': addConditionalParagraph(sec); break;
      case 'cond-clear': tune.clear(); break;
      case 'view-json': openBlockJson(); break;
      case 'copy-block-json': navigator.clipboard?.writeText(JSON.stringify(JSON.parse(panel.dataset.blockJson || '{}'), null, 2)); toast('Block content_json copied'); break;
    }
  });

  // ---------------------------------------------------------------- caret + insertion helpers
  const hostOf = (node) => (node?.nodeType === 1 ? node : node?.parentElement)?.closest('[contenteditable="true"]');
  function placeCaret(node, offset = 0) {
    hostOf(node)?.focus({ preventScroll: true });
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    state.savedRange = r.cloneRange();
  }
  function restoreSelection() {
    const r = state.savedRange;
    if (!r || !$('#editor').contains(r.startContainer)) return false;
    hostOf(r.startContainer)?.focus({ preventScroll: true });
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }
  function insertChipAtRange(range, scope, key) {
    const sec = sectionOfNode(range.startContainer);
    const c = chipNode(scope, key, sec?.cfg.source);
    range.deleteContents();
    range.insertNode(c);
    const space = document.createTextNode(' ');
    c.after(space);
    placeCaret(space, 1);
    return c;
  }
  // Which editor + block the caret is in.
  function caretContext(node = state.savedRange?.startContainer) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const blockEl = el?.closest('.ce-block');
    if (!blockEl) return null;
    const holder = blockEl.closest('.codex-editor')?.parentElement;
    const editor = EDITORS.get(holder);
    return editor?.blocks ? { editor, id: blockEl.dataset.id, blockEl } : null;
  }
  async function insertFieldFromPanel(sec, scope, key) {
    await sec.inner?.isReady;
    let r = state.savedRange;
    if (!(r && sec.el.querySelector('.rs-holder').contains(r.startContainer) && hostOf(r.startContainer))) {
      const count = sec.inner.blocks.getBlocksCount();
      let blk = count ? sec.inner.blocks.getBlockByIndex(count - 1) : null;
      if (!blk || blk.name !== 'paragraph') blk = sec.inner.blocks.insert('paragraph', { text: '' }, {}, count, false);
      await new Promise((res) => requestAnimationFrame(res));
      const p = blk.holder.querySelector('.ce-paragraph');
      r = document.createRange();
      r.selectNodeContents(p);
      r.collapse(false);
    }
    const c = insertChipAtRange(r, scope, key);
    c.classList.add('flash');
    setTimeout(() => c.classList.remove('flash'), 900);
  }
  async function addConditionalParagraph(sec) {
    await sec.inner?.isReady;
    const ctx = caretContext();
    const idx = ctx && ctx.editor === sec.inner ? sec.inner.blocks.getBlockIndex(ctx.id) + 1 : sec.inner.blocks.getBlocksCount();
    const nb = sec.inner.blocks.insert('paragraph', { text: '' }, {}, idx, true);
    requestAnimationFrame(() => focusConditional(nb));
  }
  // Put the caret in a freshly inserted block, turn its condition on and open the panel.
  function focusConditional(nb) {
    const t = COND.get(nb.id);
    if (!t) return;
    t.addDefault();
    const p = nb.holder.querySelector('[contenteditable="true"]');
    if (p) placeCaret(p, 0);
    state.selected = null;
    select('cond', t.id);
    flash(t.el);
  }
  function flash(el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  // ---------------------------------------------------------------- document listeners (capture: they run before Editor.js)
  document.addEventListener('selectionchange', () => {
    if (state.mode !== 'edit') return;
    const sel = getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    if (!$('#editor').contains(node)) return;
    state.savedRange = sel.getRangeAt(0).cloneRange();
    updateToolbarState();
    updateAt();
    const el = node.nodeType === 1 ? node : node.parentElement;
    const cw = el.closest('.cw.is-on');
    const cwId = cw?.closest('.ce-block')?.dataset.id;
    const sec = sectionOfNode(el);
    if (cwId && COND.get(cwId)) select('cond', cwId);
    else if (sec) select('rs', sec.id);
    else if (!el.closest('.rs')) select(null);
    caretMovedForComments(el);
    const cc = caretContext(node);
    if (cc && (state.focusBlock?.id !== cc.id)) { state.focusBlock = { editor: cc.editor, id: cc.id }; scheduleJson(); }
  });

  document.addEventListener('click', (e) => {
    const ch = e.target.closest(`#editor ${FIELD_TAG}`);
    if (ch) { e.preventDefault(); openFieldPop(ch); return; }
    if (e.target.closest('#editor .legacy-rl')) toast('This is the existing Related List table widget. Use a Repeating Section for free-form layouts.');
  }, true);

  document.addEventListener('input', (e) => {
    if (state.mode !== 'edit' || state.at || !$('#editor').contains(e.target)) return;
    const sel = getSelection();
    const n = sel.anchorNode, o = sel.anchorOffset;
    if (n?.nodeType !== 3) return;
    const t = n.textContent;
    if (t[o - 1] === '@' && (o === 1 || /[\s (]/.test(t[o - 2]))) startAt(n, o - 1);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (state.at && handleAtKey(e)) { e.stopImmediatePropagation(); }
  }, true);

  // ---------------------------------------------------------------- @ mention picker
  function startAt(node, offset) {
    state.at = { node, offset, hl: 0, items: [] };
    updateAt();
  }
  function updateAt() {
    const a = state.at;
    if (!a) return;
    const sel = getSelection();
    if (!document.contains(a.node) || sel.anchorNode !== a.node || sel.anchorOffset <= a.offset || a.node.textContent[a.offset] !== '@') { closeAt(); return; }
    const q = a.node.textContent.slice(a.offset + 1, sel.anchorOffset);
    if (/\s{2}/.test(q) || q.length > 30) { closeAt(); return; }
    const sec = sectionOfNode(a.node);
    const l = listDef(sec?.cfg.source);
    const all = [];
    if (l) itemFields(sec.cfg.source).forEach((f) => all.push({ scope: 'item', f, label: `${l.singular}.${f.label}` }));
    DEAL_FIELDS.forEach((f) => all.push({ scope: 'record', f, label: f.label }));
    a.items = all.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));
    a.hl = Math.min(a.hl, Math.max(0, a.items.length - 1));
    atPop.innerHTML = a.items.length ? a.items.map((x, i) => `
      ${i === 0 && x.scope === 'item' ? '<div class="im-group">This repeat</div>' : ''}
      ${x.scope === 'record' && (i === 0 || a.items[i - 1].scope === 'item') ? `<div class="im-group">${l ? 'From the Deal' : 'Deal fields'}</div>` : ''}
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
    if ((e.key === 'Enter' || e.key === 'Tab') && a.items[a.hl]) { e.preventDefault(); chooseAt(a.hl); return true; }
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

  // ---------------------------------------------------------------- field popover
  let activeChip = null;
  function openFieldPop(ch) {
    closeAllPops();
    activeChip = ch;
    ch.setAttribute('data-active', ''); // UI-only; a class would break the exact class="mention_tool_at" whitelist
    const meta = chipMeta(ch);
    const scope = meta.scope;
    const sec = sectionOfNode(ch);
    const f = fieldFor(scope, meta.key, meta.listKey || sec?.cfg.source);
    const l = listDef(sec?.cfg.source);
    const fmts = FORMATS[f?.type] || FORMATS.text;
    fieldPop.innerHTML = `
      <div class="fp-head"><span class="at-dot ${scope}">${typeIcon(f?.type)}</span>${esc(ch.textContent)}</div>
      <span class="fp-scope">${scope === 'item' ? `Changes for each ${l ? l.singular.toLowerCase() : 'item'} in the repeat` : 'From the Deal (same value in every repeat)'}</span>
      ${f ? `<label class="fp-field"><span>Format</span><select data-fp="format">${fmts.map(([k, t]) => `<option value="${k}" ${fa(ch, 'format') === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}
      ${f?.type !== 'image' ? `<label class="fp-field"><span>If empty, show</span><input data-fp="defaultvalue" value="${esc(fa(ch, 'defaultvalue'))}" placeholder="Nothing (leave blank)"><div class="fp-help">Shown when this ${scope === 'item' ? l?.singular.toLowerCase() || 'item' : 'deal'} has no value.</div></label>` : ''}
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
    if (e.target.value || k === 'format') activeChip.setAttribute(k, e.target.value); else activeChip.removeAttribute(k); // format="" is always present in production
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
    activeChip?.removeAttribute('data-active');
    activeChip = null;
  }

  // ---------------------------------------------------------------- formatting toolbar
  const toolbar = $('#toolbar');
  toolbar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  const PALETTE = ['#181818', '#5c6370', '#9aa0a6', '#c0392b', '#d35400', '#b8860b', '#1e7a4c', '#0176d3', '#4460d6', '#8e44ad', '#c2185b', '#ffffff'];
  const HILITE = ['transparent', '#fff3a3', '#ffe0b2', '#ffcdd2', '#d7f5dd', '#d6ecff', '#e8dcff', '#f5f5f5'];

  toolbar.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cmd]');
    if (!b) return;
    if (!restoreSelection()) { toast('Click into the document first'); return; }
    const cmd = b.dataset.cmd;
    const ctx = caretContext();
    switch (cmd) {
      case 'foreColor':
      case 'hiliteColor': {
        const colors = cmd === 'foreColor' ? PALETTE : HILITE;
        openMini(b, `<div class="palette">${colors.map((c) => `<button data-color="${c}" title="${c}" style="background:${c === 'transparent' ? 'linear-gradient(135deg,#fff 45%,#e06666 45%,#e06666 55%,#fff 55%)' : c}"></button>`).join('')}</div>`, (el) => {
          const c = el.closest('[data-color]')?.dataset.color;
          if (!c) return false;
          restoreSelection();
          document.execCommand('styleWithCSS', false, true);
          document.execCommand(cmd, false, c);
          $(cmd === 'foreColor' ? '#sw-fore' : '#sw-hilite').setAttribute('stroke', c === 'transparent' ? '#ddd' : c);
          return true;
        });
        break;
      }
      case 'align':
        // Alignment is block-level: stored by the `format` tune, not as inline HTML.
        openMini(b, [['left', 'Left', ICON.alignL], ['center', 'Center', ICON.alignC], ['right', 'Right', ICON.alignR], ['justify', 'Justify', ICON.alignJ]]
          .map(([a, t, i]) => `<button class="mp-item" data-align="${a}">${i}${t}</button>`).join(''), (el) => {
          const a = el.closest('[data-align]')?.dataset.align;
          if (!a) return false;
          const t = ctx && ALIGN.get(ctx.id);
          if (t) t.set(a); else toast('This block type does not support alignment');
          return true;
        });
        break;
      case 'indent':
      case 'outdent': {
        const t = ctx && INDENT.get(ctx.id);
        if (t) t.set(t.level + (cmd === 'indent' ? 1 : -1));
        break;
      }
      case 'insertOrderedList':
      case 'insertUnorderedList': {
        if (!ctx) break;
        const style = cmd === 'insertOrderedList' ? 'ordered' : 'unordered';
        const blk = ctx.editor.blocks.getById(ctx.id);
        try {
          if (blk.name === 'list') {
            const saved = await blk.save();
            await ctx.editor.blocks.update(ctx.id, { ...saved.data, style });
          } else if (blk.name === 'paragraph' || blk.name === 'heading') {
            // blocks.convert() in 2.29 strips inline HTML (it sanitizes the exported string with the
            // target tool's per-field config), which would drop merge fields. Convert by hand instead.
            const saved = await blk.save();
            const tunes = { cond: COND.get(ctx.id)?.data, align: ALIGN.get(ctx.id)?.value, indent: INDENT.get(ctx.id)?.level };
            const idx = ctx.editor.blocks.getBlockIndex(ctx.id);
            const nb = ctx.editor.blocks.insert('list', { style, items: [saved.data.text] }, {}, idx, true, true);
            if (tunes.cond?.rules.length) { const t = COND.get(nb.id); t.data = JSON.parse(JSON.stringify(tunes.cond)); requestAnimationFrame(() => t.update()); }
            if (tunes.align) ALIGN.get(nb.id)?.set(tunes.align);
            if (tunes.indent) INDENT.get(nb.id)?.set(tunes.indent);
            requestAnimationFrame(() => refreshChips(nb.holder));
          } else toast(`Can't make a list from a ${blk.name} block`);
        } catch (err) { toast(`Can't make a list from a ${blk.name} block`); }
        break;
      }
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
      case 'comment': {
        const r = getSelection().rangeCount ? getSelection().getRangeAt(0) : null;
        if (r && !r.collapsed) startTextThread(r.cloneRange());
        else if (ctx) startBlockThread(ctx.id);
        break;
      }
      case 'table':
        if (ctx) ctx.editor.blocks.insert('table', { withHeadings: false, content: [['', '', ''], ['', '', '']] }, {}, ctx.editor.blocks.getBlockIndex(ctx.id) + 1, true);
        break;
      case 'image': {
        const sec = sectionOfNode(state.savedRange.startContainer);
        const l = listDef(sec?.cfg.source);
        const imgField = l && l.fields.find((f) => f.type === 'image');
        openMini(b, `
          <button class="mp-item" data-img="static">${ICON.upload}<span>Upload image<small>The same image in every document</small></span></button>
          ${imgField ? `<button class="mp-item" data-img="field"><span class="at-dot item">${ICON.image}</span><span>${l.singular}.${imgField.label}<small>A different image for each ${l.singular.toLowerCase()}</small></span></button>` : ''}`, (el) => {
          const k = el.closest('[data-img]')?.dataset.img;
          if (!k) return false;
          if (k === 'static') { if (ctx) ctx.editor.blocks.insert('image', {}, {}, ctx.editor.blocks.getBlockIndex(ctx.id) + 1, true); }
          else { restoreSelection(); insertChipAtRange(getSelection().getRangeAt(0), 'item', imgField.key); }
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
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('fontName', false, e.target.value);
  });
  $('#tb-size').addEventListener('change', (e) => {
    const px = e.target.value;
    if (!px || !restoreSelection()) return;
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    $$('#editor font[size="7"]').forEach((f) => {
      const s = document.createElement('span');
      s.style.fontSize = `${px}px`;
      s.append(...f.childNodes);
      f.replaceWith(s);
    });
  });

  function updateToolbarState() {
    ['bold', 'italic', 'underline', 'strikeThrough'].forEach((c) => {
      let on = false;
      try { on = document.queryCommandState(c); } catch (_) {}
      $(`[data-cmd="${c}"]`, toolbar)?.classList.toggle('active', on);
    });
    const r = state.savedRange;
    if (!r) return;
    const el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    const ctx = caretContext();
    const isList = ctx?.editor.blocks.getById(ctx.id)?.name === 'list';
    const listStyle = isList && ctx.blockEl.querySelector('.cdx-list--ordered') ? 'ordered' : 'unordered';
    $('[data-cmd="insertOrderedList"]', toolbar).classList.toggle('active', isList && listStyle === 'ordered');
    $('[data-cmd="insertUnorderedList"]', toolbar).classList.toggle('active', isList && listStyle === 'unordered');
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const fontSel = $('#tb-font');
    fontSel.value = [...fontSel.options].some((o) => o.value === fam) ? fam : '';
    const size = String(Math.round(parseFloat(cs.fontSize)));
    const sizeSel = $('#tb-size');
    sizeSel.value = [...sizeSel.options].some((o) => o.value === size) ? size : '';
    const pill = $('#tb-ctx');
    const cw = el.closest('.cw.is-on');
    const sec = sectionOfNode(el);
    if (sec?.cfg.source) {
      pill.hidden = false;
      pill.className = 'tb-ctx' + (cw ? ' cond' : '');
      pill.innerHTML = cw ? `${ICON.branch} Inside Show if · ${esc(cw.querySelector('.cond-summary').textContent)}` : `${ICON.repeat} Inside repeat · each ${listDef(sec.cfg.source).singular}`;
    } else pill.hidden = true;
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
  function closeAllPops() { miniPop.hidden = true; closeFieldPop(); }
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest(`.pop, [data-cmd], ${FIELD_TAG}`)) closeAllPops();
    if (state.at && !e.target.closest('.at-pop') && !$('#editor').contains(e.target)) closeAt();
  });
  $('#canvas').addEventListener('scroll', () => { miniPop.hidden = true; closeAt(); if (activeChip) positionFieldPop(activeChip); });

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }

  // ---------------------------------------------------------------- JSON + notes panels
  // Block JSON panel refreshes live (debounced) on selection and content changes.
  let blockJsonTimer;
  function scheduleJson() {
    if (state.panelView !== 'block') return;
    clearTimeout(blockJsonTimer);
    blockJsonTimer = setTimeout(renderBlockPanel, 200);
  }
  let showNested = false;
  async function renderBlockPanel() {
    if (state.panelView !== 'block') return;
    const fb = state.focusBlock;
    const head = (sub) => `<div class="sp-head"><div><div class="sp-title"><span>Block JSON</span></div><div class="sp-sub">${sub}</div></div><button class="sp-close" data-act="panel-close">${ICON.x}</button></div>`;
    if (!fb?.editor?.blocks) { panel.innerHTML = `${head('Click into any block to see its JSON')}<div class="sp-scroll"><div class="sp-hint" style="padding:16px">The panel follows the cursor and updates as you edit.</div></div>`; return; }
    const api = fb.editor.blocks.getById(fb.id);
    if (!api) { panel.innerHTML = `${head('Block no longer exists')}`; return; }
    const saved = await api.save();
    if (state.panelView !== 'block' || state.focusBlock !== fb) return;
    const cj = blockToDb({ id: fb.id, type: saved.tool, data: saved.data, tunes: saved.tunes });
    const nested = fb.editor !== outer;
    const index = fb.editor.blocks.getBlockIndex(fb.id);
    let parentLine = '', rowJson = null;
    if (nested) {
      const sec = [...SECTIONS.values()].find((x) => x.inner === fb.editor);
      parentLine = `Nested block: <code>relatedList</code> (repeatingSection, ${esc(listDef(sec?.cfg.source)?.label || '?')}) › <code>data.blocks[${index}]</code>. It's stored inside the parent's <code>content_json</code>, with no row of its own.`;
    } else {
      rowJson = { id: rowIdFor(fb.id), section_id: SECTION.id, sequence_number: index, label: null, is_locked: LOCKED.has(fb.id) ? true : null, template_visibility_rule_id: ROW_RULES.get(fb.id) || null };
      parentLine = `Top-level block: <code>content_block</code> row #${index}.`;
    }
    const collapse = isSection(cj) && !showNested;
    const shown = collapse ? { ...cj, data: { ...cj.data, blocks: `… ${cj.data.blocks.length} nested blocks (tick "Show nested blocks")` } } : cj;
    const refs = [cj.tunes?.visibilityRuleId, cj.data?.filterBy, cj.data?.sort, rowJson?.template_visibility_rule_id].filter(Boolean);
    const rules = refs.map((id) => TFC.get(id)).filter(Boolean);
    const threads = COMMENTS.threads.filter((t) => !t.draft && ((t.anchor.type === 'block' && t.anchor.blockId === fb.id) || marksFor(t.id).some((m) => m.closest('.ce-block')?.dataset.id === fb.id)));
    const scrollTop = $('.sp-scroll', panel)?.scrollTop || 0;
    panel.innerHTML = `${head(`<code>${esc(cj.tool)}</code>${cj.tool === 'relatedList' ? ` · ${esc(cj.data.displayConfig?.type || 'table')}` : ''} · id <code>${esc(cj.id)}</code>`)}
      <div class="sp-scroll">
        <div class="bj-sec"><div class="bj-note">${parentLine}</div>
          ${rowJson ? `<div class="bj-label">Row columns</div><pre class="json-view bj-pre">${highlightJson(rowJson)}</pre>` : ''}
          <div class="bj-label">content_json ${isSection(cj) ? `<label class="chk bj-toggle"><input type="checkbox" id="bj-nested" ${showNested ? 'checked' : ''}> Show nested blocks</label>` : ''}</div>
          <pre class="json-view bj-pre">${highlightJson(shown)}</pre>
        </div>
        ${rules.length ? `<div class="bj-sec"><div class="bj-label">Referenced template_field_configuration</div><pre class="json-view bj-pre">${highlightJson(rules.map((t) => ({ ...t, template_id: TEMPLATE.id })))}</pre></div>` : ''}
        ${threads.length ? `<div class="bj-sec"><div class="bj-label">Comment threads on this block</div><div class="bj-note">${threads.map((t) => `<code>${esc(t.id)}</code> · ${t.anchor.type === 'text' ? 'text' : 'block'} · ${t.messages.length} message${t.messages.length === 1 ? '' : 's'}${t.resolved ? ' · resolved' : ''}`).join('<br>')}</div></div>` : ''}
      </div>
      <div class="sp-foot"><span class="sp-sub" style="margin:0">${(JSON.stringify(cj).length / 1024).toFixed(1)} KB</span><button class="btn-outline btn-sm" data-act="copy-block-json">Copy content_json</button></div>`;
    $('.sp-scroll', panel).scrollTop = scrollTop;
    const nb = $('#bj-nested', panel);
    if (nb) nb.onchange = () => { showNested = nb.checked; renderBlockPanel(); };
    panel.dataset.blockJson = JSON.stringify(cj);
  }
  function highlightJson(obj) {
    return esc(JSON.stringify(obj, null, 2))
      .replace(/(&quot;(?:repeatingSection|visibilityRuleId|filterBy|sort|blocks|displayConfig|emptyState|separator|defaultvalue|match|loopPosition|loopIndex|anchor_type|inner_block_id)&quot;)/g, '<span class="h">$1</span>')
      .replace(/(&lt;\/?(?:objectdata|objectfield))/g, '<span class="t">$1</span>')
      .replace(/(&lt;\/?commentanchor)/g, '<span class="h">$1</span>')
      .replace(/^(\s*)(&quot;[^&]+?&quot;):/gm, '$1<span class="k">$2</span>:')
      .replace(/: (&quot;.*?&quot;)(,?)$/gm, ': <span class="s">$1</span>$2')
      .replace(/: (-?\d+(?:\.\d+)?|true|false|null)(,?)$/gm, ': <span class="n">$1</span>$2');
  }
  function renderNotesPanel() {
    panel.innerHTML = `
      <div class="sp-head"><div><div class="sp-title"><span>Build notes</span></div>
        <div class="sp-sub">Editor.js 2.29.1, saving the production content_json format</div></div>
        <button class="sp-close" data-act="panel-close">${ICON.x}</button></div>
      <div class="sp-scroll"><div class="notes">${NOTES_HTML}</div></div>`;
  }
  const NOTES_HTML = `
    <h4>Matches production (picasso_stage)</h4>
    <ul>
      <li><span class="tag-ok">same</span><b>One row per block.</b> Saved as <code>content_block</code> rows (<code>sequence_number</code>, <code>section_id</code>, <code>is_locked</code>, <code>template_visibility_rule_id</code>) with <code>content_json = {id, time, tool, data, tunes, type}</code>.</li>
      <li><span class="tag-ok">same</span><b>Tool names:</b> <code>paragraph</code>, <code>heading</code>, <code>list</code> (with <code>styleType</code>), <code>table</code> (cell objects plus <code>colgroup</code> and <code>properties</code>), <code>image</code>, <code>relatedList</code>.</li>
      <li><span class="tag-ok">same</span><b>Tunes:</b> <code>textAlign: "left"</code> and <code>indentation: {indentLevel}</code>.</li>
      <li><span class="tag-ok">same</span><b>Merge fields:</b> <code>&lt;objectdata class="mention_tool_at" dataelementid label datatype datakey format&gt;</code>. Signer fields: <code>&lt;objectfield … profileid fieldkey isrequired&gt;</code>.</li>
      <li><span class="tag-ok">same</span><b>Rules are rows:</b> filters, sorts and visibility are <code>template_field_configuration</code> rows (<code>related_data_filter</code>, <code>related_data_sort</code>, <code>visibility_field</code>) using the existing expression format.</li>
    </ul>
    <h4>Additions (need review)</h4>
    <ul>
      <li><span class="tag-work">new</span><b>Repeating section.</b> <code>relatedList</code> gets <code>displayConfig.type: "repeatingSection"</code> (existing values: table, ol, ul). It adds <code>data.blocks</code> (the repeated content), <code>displayConfig.separator</code> and <code>displayConfig.emptyState</code>.</li>
      <li><span class="tag-work">new</span><b>Conditions on repeated blocks.</b> The <code>tunes.visibilityRuleId</code> tune on a nested block points at a <code>visibility_field</code> row. It's needed because nested blocks have no row, so the <code>template_visibility_rule_id</code> column can't be used.</li>
      <li><span class="tag-work">new</span><b>Rule operands and operators.</b> Operands: <code>loopPosition</code>, <code>loopIndex</code>. Operators: <code>IS_FIRST</code>, <code>IS_LAST</code>, <code>IS_NOT_FIRST</code>, <code>IS_NOT_LAST</code>, <code>IS_ODD</code>, <code>IS_EVEN</code>, <code>IS_EMPTY</code>, <code>IS_NOT_EMPTY</code>. Rules stay AND-only, as production (decision D2).</li>
      <li><span class="tag-ok">same</span><b><code>format</code> values</b> come from production data: <code>Number</code>, <code>Plain text</code>, <code>Currency</code>, <code>Currency rounded</code>, <code>Yes/No</code>, <code>Image</code>, <code>None</code>, and Java date patterns like <code>MM/dd/yyyy</code>. <code>currency</code> and <code>enumeration</code> are datatypes of their own.</li>
      <li><span class="tag-work">new</span><b>Merge-field extras.</b> The <code>defaultvalue</code> attribute (fallback when empty), and <code>datakey="$index"</code> for the item number.</li>
      <li><span class="tag-work">new</span><b>Comments.</b> Text-range anchors are <code>&lt;commentanchor threadid&gt;</code> inside content_json. They need a <code>template_comment</code> table shaped like <code>document_comment</code>, plus <code>anchor_type</code> and <code>inner_block_id</code>.</li>
    </ul>
    <h4>Editor.js workarounds</h4>
    <ul>
      <li><span class="tag-work">work</span><b>One tool, two toolbox entries.</b> <code>relatedList</code>'s toolbox returns both "Related Object" (table) and "Repeating Section". The constructor returns the matching implementation based on <code>displayConfig.type</code>.</li>
      <li><span class="tag-work">work</span><b>Nested editor.</b> The section body stops <code>keydown</code>, <code>paste</code>, <code>mousemove</code> and <code>input</code> from bubbling up. The tool sets <code>enableLineBreaks</code>. The page editor's toolbars need <code>z-index: 10</code>.</li>
      <li><span class="tag-work">work</span><b>Sanitizer.</b> The <code>textAlign</code> tune (present on every block) whitelists the inline tags: objectdata, objectfield, commentanchor, span, font and so on. <code>class</code> is whitelisted only as the exact value <code>mention_tool_at</code>, so UI state uses <code>data-*</code> attributes, which are dropped on save.</li>
      <li><span class="tag-work">work</span><b>List buttons.</b> <code>blocks.convert()</code> strips inline HTML in 2.29, so paragraph-to-list conversion is done by hand.</li>
      <li><span class="tag-work">work</span><b>Adapter.</b> The official Table plugin stores <code>{withHeadings, content}</code>. An adapter converts to and from production's cell-object table format when saving and loading.</li>
    </ul>
    <h4>Open risks</h4>
    <ul>
      <li><span class="tag-risk">risk</span>No undo across the page and section editors. You can't drag blocks between them, and selecting across the edge doesn't work.</li>
      <li><span class="tag-ok">decided</span><b>Generated documents</b> expand each repeating section into separate <code>document_content_block</code> rows (see Saved JSON → Generated document). Each expanded row carries <code>generated_from: {block_id, item}</code> (decided).</li>
    </ul>
    `;

  function syncHeaderButtons() {
    $('#btn-notes').classList.toggle('on', state.panelView === 'notes');
    $('#btn-block-json').classList.toggle('on', state.panelView === 'block');
  }
  $('#btn-json').addEventListener('click', () => openJsonModal());
  function openBlockJson() { state.panelView = 'block'; syncHeaderButtons(); renderPanel(); }
  $('#btn-block-json').addEventListener('click', () => { if (state.panelView === 'block') { state.panelView = null; syncHeaderButtons(); renderPanel(); } else openBlockJson(); });

  // ---------------------------------------------------------------- document JSON modal (what gets persisted)
  const jm = { data: null, tab: 'rows' };
  async function openJsonModal() {
    jm.data = await exportAll();
    $('#json-modal').hidden = false;
    renderJsonModal();
  }
  function closeJsonModal() { $('#json-modal').hidden = true; }
  $('#jm-close').addEventListener('click', closeJsonModal);
  $('#json-modal').addEventListener('mousedown', (e) => { if (e.target.id === 'json-modal') closeJsonModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#json-modal').hidden) closeJsonModal(); });
  $('#jm-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    jm.tab = b.dataset.v;
    renderJsonModal();
  });
  $('#jm-wrap').addEventListener('change', (e) => $('#jm-body').classList.toggle('wrap', e.target.checked));
  const jmPayload = () => ({ rows: jm.data.content_block, tfc: jm.data.template_field_configuration, comments: jm.data.template_comment, generated: generateDocument(jm.data) }[jm.tab] || jm.data);
  $('#jm-copy').addEventListener('click', () => { navigator.clipboard?.writeText(JSON.stringify(jmPayload(), null, 2)); toast('JSON copied'); });
  $('#jm-download').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(jm.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'quote-template.picasso.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  const blocksOf = (data) => data.content_block.map((r) => r.content_json);
  const isSection = (cj) => cj.tool === 'relatedList' && cj.data?.displayConfig?.type === 'repeatingSection';
  function renderJsonModal() {
    const data = jm.data;
    $$('#jm-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === jm.tab));
    $('#jm-wrap-wrap').hidden = !['rows', 'tfc', 'comments', 'generated'].includes(jm.tab);
    const body = $('#jm-body');
    body.scrollTop = 0;
    const blocks = blocksOf(data);
    const all = allFieldRefs(blocks);
    const sections = blocks.filter(isSection);
    const innerCount = sections.reduce((n, b) => n + (b.data.blocks?.length || 0), 0);
    const condCount = sections.reduce((n, b) => n + (b.data.blocks?.filter((x) => x.tunes?.visibilityRuleId).length || 0), 0);
    $('#jm-foot').textContent = `${data.content_block.length} content_block rows · ${sections.length} repeating section${sections.length === 1 ? '' : 's'} (${innerCount} nested blocks, ${condCount} with Show if) · ${data.template_field_configuration.length} rule rows · ${data.template_comment.length} comment rows · ${all.length} field references`;
    const note = (html) => `<div class="fields-note">${html}</div>`;
    if (jm.tab === 'rows') body.innerHTML = note('<b>content_block</b> rows, the same shape as <code>picasso_stage.content_block</code>. Each row\'s <code>content_json</code> is one Editor.js block: <code>{id, time, tool, data, tunes, type}</code>.') + `<pre class="json-view">${highlightJson(data.content_block)}</pre>`;
    else if (jm.tab === 'tfc') body.innerHTML = note('<b>template_field_configuration</b> rows referenced by the blocks: <code>related_data_filter</code> / <code>related_data_sort</code> (from <code>relatedList.data.filterBy</code> / <code>.sort</code>) and <code>visibility_field</code> (from <code>tunes.visibilityRuleId</code>).') + `<pre class="json-view">${highlightJson(data.template_field_configuration)}</pre>`;
    else if (jm.tab === 'comments') body.innerHTML = note('Proposed <b>template_comment</b> rows, the same columns as <code>document_comment</code> (one row per message, grouped by <code>thread_id</code>) plus <code>anchor_type</code> and <code>inner_block_id</code>. Text comments also leave a <code>&lt;commentanchor threadid&gt;</code> in the block HTML.') + `<pre class="json-view">${highlightJson(data.template_comment)}</pre>`;
    else if (jm.tab === 'generated') {
      const g = generateDocument(data);
      body.innerHTML = note(`What generation would write for <b>${esc(g.recordLabel)}</b> (choose the record in Preview). Repeating sections are <b>expanded into separate <code>document_content_block</code> rows</b>: one set of blocks per record, with conditions already applied. Fields become <code>&lt;objectvalue value="…"&gt;</code>, comment anchors are removed, and each field gets a <code>document_merge_data</code> row. ${g.document_content_block.length} rows · ${g.document_merge_data.length} merge rows.`) + `<pre class="json-view">${highlightJson(g)}</pre>`;
    }
    else if (jm.tab === 'tree') body.innerHTML = `<div class="tree">${data.content_block.map((r) => treeRow(r.content_json, null, r)).join('')}</div>`;
    else if (jm.tab === 'changes') body.innerHTML = `<div class="notes" style="background:#fff;min-height:100%;padding:16px 22px">${NOTES_HTML}</div>`;
    else body.innerHTML = fieldsTable(all);
  }

  // Plain-text preview of block HTML, with fields shown as highlighted labels.
  function textOf(htmlStr) {
    const d = document.createElement('div');
    d.innerHTML = htmlStr || '';
    $$(FIELD_TAG, d).forEach((f) => { f.replaceWith(`⦃${chipMeta(f).scope}⦄${fa(f, 'label') || f.textContent.trim()}⦅`); });
    $$(SIGNER_TAG, d).forEach((f) => { f.replaceWith(`⦃signer⦄${fa(f, 'label')}⦅`); });
    return esc(d.textContent.replace(/\s+/g, ' ').trim())
      .replace(/⦃(item|record|signer)⦄(.*?)⦅/g, (_, sc, l) => `<i class="${sc === 'record' ? 'rec' : sc === 'signer' ? 'sig' : ''}">${l}</i>`);
  }
  function blockText(cj) {
    const d = cj.data || {};
    switch (cj.tool) {
      case 'paragraph': case 'heading': return textOf(d.text) || '<span style="color:#aab">(empty)</span>';
      case 'list': return d.items.map((i) => textOf(typeof i === 'string' ? i : i.content)).join(' &nbsp;·&nbsp; ');
      case 'table': return `${d.rows.length} × ${d.rows[0]?.length || 0} table: ${textOf(d.rows.flat().map((c) => c.content).join(' | '))}`;
      case 'image': return `Image ${esc(d.width || '')} × ${esc(d.height || '')}`;
      case 'relatedList': return `Related list (${esc(d.displayConfig?.type || 'table')}) · ${esc(d.datasource?.name)} · ${d.tableConfig?.columnConfig?.length || 0} columns`;
      default: return '';
    }
  }
  function ruleSummary(id) {
    const t = TFC.get(id);
    if (!t) return id;
    const parsed = t.type === 'related_data_sort' ? null : (t.type === 'visibility_field' ? fromVisibilityConfig(t.config_json) : fromFilterConfig(t.config_json));
    return parsed ? parsed.rules.map((r) => ruleText(r, DE_BY_ID.get(t.config_json.parts?.[0]?.leftOperand?.value || t.config_json.parts?.[0]?.filterKey?.value)?.listKey)).join(parsed.match === 'any' ? ' or ' : ' and ') : id;
  }
  function treeRow(cj, listKey, row) {
    const tunes = [];
    if (cj.tunes?.textAlign && cj.tunes.textAlign !== 'left') tunes.push(`<span class="tr-tune">textAlign ${esc(cj.tunes.textAlign)}</span>`);
    if (cj.tunes?.indentation?.indentLevel) tunes.push(`<span class="tr-tune">indent ${cj.tunes.indentation.indentLevel}</span>`);
    if (row?.is_locked) tunes.push('<span class="tr-tune">is_locked</span>');
    if (cj.tunes?.visibilityRuleId) tunes.push(`<span class="tr-tune cond">Show if ${esc(ruleSummary(cj.tunes.visibilityRuleId))}</span>`);
    const type = cj.tool === 'heading' ? `heading h${cj.data.level}` : cj.tool === 'list' ? `list ${cj.data.style}` : cj.tool;
    if (!isSection(cj)) return `<div class="tr"><span class="tr-type">${type}</span><span class="tr-text">${blockText(cj)}</span>${tunes.join('')}</div>`;
    const cfg = sectionFromData(cj.data);
    const l = listDef(cfg.source);
    return `<div class="tr"><span class="tr-type rs">relatedList · repeatingSection</span><span class="tr-text"><b>For each ${esc(l?.singular || '?')}</b> (datasource <code>${esc(cj.data.datasource.name)}</code>) · ${esc(sectionSummary(cfg))}</span></div>
      <div class="tr-meta">filterBy <code>${esc(cj.data.filterBy || '—')}</code> · sort <code>${esc(cj.data.sort || '—')}</code> · no records: ${cfg.emptyMode === 'message' ? `show “${esc(cfg.emptyText)}”` : 'hide the section'}</div>
      <div class="tr-children">${(cj.data.blocks || []).map((x) => treeRow(x, cfg.source)).join('') || '<div class="tr-meta">(empty)</div>'}</div>`;
  }
  function allFieldRefs(blocks) {
    const refs = [];
    const walk = (v, inRepeat) => {
      if (typeof v === 'string') {
        if (!v.includes(`<${FIELD_TAG}`) && !v.includes(`<${SIGNER_TAG}`)) return;
        const d = document.createElement('div');
        d.innerHTML = v;
        $$(FIELD_TAG, d).forEach((f) => { const m = chipMeta(f); refs.push({ kind: 'objectdata', scope: m.scope, dataelementid: fa(f, 'dataelementid'), datakey: fa(f, 'datakey'), datatype: fa(f, 'datatype'), format: fa(f, 'format'), defaultvalue: fa(f, 'defaultvalue'), label: fa(f, 'label'), inRepeat }); });
        $$(SIGNER_TAG, d).forEach((f) => refs.push({ kind: 'objectfield', scope: 'signer', dataelementid: fa(f, 'fieldkey'), datakey: fa(f, 'datakey'), datatype: fa(f, 'datatype'), format: fa(f, 'format'), defaultvalue: '', label: fa(f, 'label'), inRepeat }));
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, inRepeat));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, inRepeat || (k === 'blocks' && v.displayConfig?.type === 'repeatingSection')));
    };
    walk(blocks, false);
    return refs;
  }
  function fieldsTable(refs) {
    const groups = new Map();
    refs.forEach((r) => {
      const k = [r.kind, r.dataelementid, r.datakey, r.format, r.defaultvalue].join('|');
      if (!groups.has(k)) groups.set(k, { ...r, count: 0 });
      groups.get(k).count++;
    });
    const rows = [...groups.values()].sort((a, b) => (a.scope + a.label).localeCompare(b.scope + b.label));
    return `<div class="fields-note">Every <code>&lt;objectdata&gt;</code> merge field and <code>&lt;objectfield&gt;</code> signer field. There are ${refs.filter((r) => r.scope === 'record').length} Deal references and ${refs.filter((r) => r.scope === 'item').length} repeated-item references. An item field is recognised by its data element belonging to the section's datasource object, with no extra attribute needed.</div>
      <table class="fields-table"><thead><tr><th>Scope</th><th>tag</th><th>dataelementid / fieldkey</th><th>datakey</th><th>datatype</th><th>format</th><th>defaultvalue</th><th>label</th><th>Used</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td><span class="scope-pill ${r.scope}">${r.scope}</span></td><td><code>${r.kind}</code></td><td><code>${esc(r.dataelementid) || '—'}</code></td><td><code>${esc(r.datakey)}</code></td><td>${esc(r.datatype)}</td><td>${esc(r.format) || '<span style="color:#aab">""</span>'}</td><td>${esc(r.defaultvalue) || '<span style="color:#aab">—</span>'}</td><td>${esc(r.label)}</td><td>${r.count}×</td></tr>`).join('')}</tbody></table>`;
  }
  $('#btn-notes').addEventListener('click', () => { state.panelView = state.panelView === 'notes' ? null : 'notes'; syncHeaderButtons(); renderPanel(); });
  $('#rail-add').addEventListener('click', () => toast('Use the + next to any block (Editor.js toolbox)'));

  // ---------------------------------------------------------------- preview, rendered from the persisted rows
  const previewPage = $('#preview-page');
  function setMode(m) {
    state.mode = m;
    closeAllPops(); closeAt();
    const pv = m === 'preview';
    $('#toolbar').hidden = pv;
    $('#preview-bar').hidden = !pv;
    $('#page-wrap').hidden = pv;
    $('#comment-rail').hidden = pv || !cstate.visible;
    if (!pv) requestAnimationFrame(renderRail);
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
  async function renderPreview(simulateFetch) {
    const data = await exportAll();
    const fetchEl = $('#pv-fetch');
    clearTimeout(fetchTimer);
    if (!simulateFetch) { buildPreview(data); return; }
    fetchEl.classList.add('loading');
    fetchEl.lastElementChild.textContent = 'Fetching from HubSpot…';
    previewPage.innerHTML = `<div class="skeleton">${[70, 40, 90, 85, 60, 95, 50, 80, 88, 45].map((w) => `<div style="width:${w}%"></div>`).join('')}</div>`;
    fetchTimer = setTimeout(() => {
      fetchEl.classList.remove('loading');
      fetchEl.lastElementChild.textContent = 'Live · fetched just now';
      buildPreview(data);
    }, 650);
  }

  function buildPreview(data) {
    const ctx = state.preview.source === 'sample' ? SAMPLE : DEALS.find((d) => d.id === state.preview.recordId);
    const out = document.createElement('div');
    out.className = 'doc';
    out.appendChild(renderBlocks(blocksOf(data), ctx, null));
    out.classList.toggle('show-outlines', state.preview.outlines);
    previewPage.innerHTML = '';
    previewPage.appendChild(out);
  }

  function renderBlocks(blocks, ctx, itemCtx) {
    const frag = document.createDocumentFragment();
    blocks.forEach((cj) => {
      const ruleId = cj.tunes?.visibilityRuleId;
      const rule = ruleId && TFC.get(ruleId) ? fromVisibilityConfig(TFC.get(ruleId).config_json) : null;
      if (rule && itemCtx && !evalRules(rule.rules, rule.match, itemCtx.item, itemCtx.idx, itemCtx.n, ctx.record, itemCtx.listKey)) return;
      let el = renderBlock(cj, ctx, itemCtx);
      if (!el) return;
      if (el.style && cj.tunes?.textAlign && cj.tunes.textAlign !== 'left') el.style.textAlign = cj.tunes.textAlign;
      if (el.style && cj.tunes?.indentation?.indentLevel) el.style.paddingLeft = `${cj.tunes.indentation.indentLevel * 24}px`;
      if (!isSection(cj)) resolveChips(el, ctx, itemCtx);
      if (rule && itemCtx) { const w = document.createElement('div'); w.className = 'pv-cond'; w.appendChild(el); el = w; }
      frag.appendChild(el);
    });
    return frag;
  }
  function html(tag, inner, cls) { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = inner; return e; }
  function renderBlock(cj, ctx, itemCtx) {
    const d = cj.data;
    switch (cj.tool) {
      case 'paragraph': return html('p', d.text || '&nbsp;');
      case 'heading': return html(`h${d.level || 2}`, d.text);
      case 'list': return html(d.style === 'ordered' ? 'ol' : 'ul', d.items.map((i) => `<li>${typeof i === 'string' ? i : i.content}</li>`).join(''));
      case 'table': return html('table', `<tbody>${d.rows.map((row) => `<tr>${row.filter((c) => c.display !== false).map((c) => (c.isHeader ? `<th>${c.content}</th>` : `<td>${c.content}</td>`)).join('')}</tr>`).join('')}</tbody>`);
      case 'image': return html('p', `<img class="static-img" src="${d.file?.url}" alt="" style="width:${d.width};height:${d.height}">`);
      case 'pageBreak': return html('div', '', 'rs-sep-pagebreak');
      case 'relatedList': {
        if (isSection(cj)) return renderSection(cj.data, ctx);
        const listKey = listKeyByName(d.datasource?.name);
        const cols = d.tableConfig.columnConfig.map((c) => ({ label: c.label, key: DE_BY_ID.get(c.dataConfig.attribute)?.key, type: fieldFor('item', DE_BY_ID.get(c.dataConfig.attribute)?.key, listKey)?.type }));
        const rows = (ctx.lists[listKey] || []).slice(0, d.datasource.maxRecordsCount || 5);
        return html('div', `<table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${cols.map((c) => `<td class="lbl">${isEmpty(r[c.key]) ? '' : esc(formatValue(r[c.key], c.type))}</td>`).join('')}</tr>`).join('') : `<tr><td class="lbl" colspan="${cols.length}">&nbsp;</td></tr>`}</tbody></table>`, 'legacy-rl');
      }
      default: return null;
    }
  }
  function renderSection(data, ctx) {
    const cfg = sectionFromData(data);
    const l = listDef(cfg.source);
    if (!l) return null;
    const { items, total, filteredOut, limitedOut } = itemsFor(cfg, ctx);
    const wrap = document.createElement('div');
    wrap.className = 'rs-out';
    wrap.dataset.label = `Repeat · ${items.length} of ${total} ${l.label}`;
    if (!items.length) {
      if (cfg.emptyMode === 'message') wrap.innerHTML = `<p class="rs-empty">${esc(cfg.emptyText)}</p>`;
      else if (state.preview.outlines) wrap.innerHTML = `<p class="rs-empty" style="color:#aab">(Section hidden: no ${l.label.toLowerCase()})</p>`;
      else return null;
    }
    items.forEach((it, i) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'rs-item' + (cfg.zebra ? ' zebra' : '');
      itemEl.dataset.label = `${l.singular} ${i + 1}`;
      if (cfg.zebra && i % 2 === 1) itemEl.style.background = cfg.zebraColor;
      itemEl.appendChild(renderBlocks(data.blocks || [], ctx, { item: it, idx: i, n: items.length, listKey: cfg.source }));
      wrap.appendChild(itemEl);
      if (i < items.length - 1 && cfg.separator !== 'none') {
        const sep = document.createElement('div');
        sep.className = `rs-sep-${cfg.separator}`;
        wrap.appendChild(sep);
      }
    });
    if (filteredOut || limitedOut) {
      const bits = [];
      if (filteredOut) bits.push(`${filteredOut} hidden by filter (${cfg.filters.map((r) => ruleText(r, cfg.source)).join(cfg.filterMatch === 'any' ? ' or ' : ' and ')})`);
      if (limitedOut) bits.push(`${limitedOut} beyond the limit of ${cfg.limit}`);
      wrap.appendChild(html('div', esc(bits.join(' · ')), 'rs-note'));
    }
    return wrap;
  }
  // <objectdata> -> value (what production writes as <objectvalue value="…">); signer fields render blank, as in the PDF.
  function resolveChips(root, ctx, itemCtx) {
    $$(FIELD_TAG, root).forEach((ch) => {
      const m = chipMeta(ch);
      if (m.scope === 'item' && !itemCtx) { ch.remove(); return; }
      const f = m.scope === 'record' ? recordField(m.key) : fieldFor('item', m.key, itemCtx.listKey);
      if (!f) { ch.remove(); return; }
      const v = m.scope === 'record' ? ctx.record[m.key] : m.key === '$index' ? itemCtx.idx + 1 : itemCtx.item[m.key];
      if (f.type === 'image') {
        const img = document.createElement('img');
        img.className = 'pv-img';
        img.src = productImage(itemCtx?.item || {}, !!ctx.sample);
        ch.replaceWith(img);
        return;
      }
      const empty = isEmpty(v);
      const span = document.createElement('span');
      span.className = (m.scope === 'item' ? 'pv-val-item' : 'pv-val-rec') + (empty && m.fallback ? ' pv-fallback' : '');
      span.textContent = empty ? m.fallback : formatValue(v, f.type, m.format);
      ch.replaceWith(span);
    });
    $$(SIGNER_TAG, root).forEach((s) => { const e = document.createElement('span'); e.className = 'pv-signer'; s.replaceWith(e); });
    $$(COMMENT_TAG, root).forEach((m) => m.replaceWith(...m.childNodes)); // comments never reach the output
  }



  // ---------------------------------------------------------------- generated document (decision: expand into document_content_block rows)
  function previewCtx() { return state.preview.source === 'sample' ? SAMPLE : DEALS.find((d) => d.id === state.preview.recordId); }
  function generateDocument(data) {
    const ctx = previewCtx();
    const ids = { document_id: 'sd-preview-0000', document_version_id: 'dv-preview-0000', document_section_id: 'ds-preview-0000' };
    const rows = [], merge = [];
    const push = (cj, { itemCtx = null, is_locked = null, source = null } = {}) => {
      const id = `dcb-${crypto.randomUUID()}`;
      rows.push({
        id, ...ids, sequence_number: rows.length, label: null, is_locked, locked_in_template: !!is_locked,
        is_visible: null, document_visibility_rule_id: null, is_object_value_block: null,
        ...(source ? { generated_from: source } : {}),   // NEW (decided D5): provenance of expanded blocks
        content_json: resolveForDocument(cj, ctx, itemCtx, id, merge),
      });
    };
    const para = (text) => ({ id: ejsId(), time: 0, tool: 'paragraph', data: { text }, tunes: { textAlign: 'left', indentation: { indentLevel: 0 } }, type: 'paragraph' });
    data.content_block.forEach((r) => {
      const cj = r.content_json;
      if (!isSection(cj)) { push(cj, { is_locked: r.is_locked }); return; }
      const cfg = sectionFromData(cj.data);
      const { items } = itemsFor(cfg, ctx);
      if (!items.length) { if (cfg.emptyMode === 'message') push(para(esc(cfg.emptyText)), { source: { block_id: cj.id, item: null } }); return; }
      items.forEach((it, i) => {
        const itemCtx = { item: it, idx: i, n: items.length, listKey: cfg.source };
        const source = { block_id: cj.id, item: i + 1 };
        cj.data.blocks.forEach((b) => {
          const rule = b.tunes?.visibilityRuleId && TFC.get(b.tunes.visibilityRuleId);
          if (rule) { const v = fromVisibilityConfig(rule.config_json); if (!evalRules(v.rules, 'all', it, i, items.length, ctx.record, cfg.source)) return; }
          push({ ...b, id: ejsId() }, { itemCtx, source });
        });
        if (i < items.length - 1 && cfg.separator === 'space') push(para('&nbsp;'), { source });
        if (i < items.length - 1 && cfg.separator === 'pagebreak') push({ id: ejsId(), time: 0, tool: 'pageBreak', data: {}, tunes: {}, type: 'pageBreak' }, { source });
      });
    });
    return { recordLabel: ctx.sample ? 'Sample data' : `${ctx.label} (${ctx.id})`, document_content_block: rows, document_merge_data: merge };
  }
  // Template block -> document block: <objectdata> -> <objectvalue value>, drop comment anchors and nested-rule tunes.
  function resolveForDocument(cj, ctx, itemCtx, rowId, merge) {
    const out = JSON.parse(JSON.stringify(cj));
    if (out.tunes?.visibilityRuleId) delete out.tunes.visibilityRuleId;
    const fix = (str) => {
      if (typeof str !== 'string' || !/<(objectdata|objectfield|commentanchor)/.test(str)) return str;
      const d = document.createElement('div');
      d.innerHTML = str;
      $$(COMMENT_TAG, d).forEach((m) => m.replaceWith(...m.childNodes));
      $$(FIELD_TAG, d).forEach((ch) => {
        const m = chipMeta(ch);
        const f = m.scope === 'record' ? recordField(m.key) : fieldFor('item', m.key, itemCtx?.listKey);
        let v = m.scope === 'record' ? ctx.record[m.key] : m.key === '$index' ? itemCtx?.idx + 1 : itemCtx?.item[m.key];
        if (f?.type === 'image') v = `https://files.example.com/products/${encodeURIComponent(itemCtx?.item.sku || 'item')}.png`;
        const text = isEmpty(v) ? m.fallback : formatValue(v, f?.type, m.format);
        const ov = document.createElement('objectvalue');
        [...ch.attributes].forEach((a) => ov.setAttribute(a.name, a.value));
        ov.removeAttribute('data-invalid'); ov.removeAttribute('title');
        ov.setAttribute('value', isEmpty(v) ? '' : String(v));
        ov.textContent = text;
        ch.replaceWith(ov);
        merge.push({ id: `sdmd-${crypto.randomUUID()}`, content_block_id: rowId, data_element_id: fa(ch, 'dataelementid') || null, key: null, label: fa(ch, 'label'), data_type: fa(ch, 'datatype'), format: fa(ch, 'format'), field_key: null, profile_id: null });
      });
      $$(SIGNER_TAG, d).forEach((sf) => merge.push({ id: `sdmd-${crypto.randomUUID()}`, content_block_id: rowId, data_element_id: fa(sf, 'dataelementid') || null, key: null, label: fa(sf, 'label'), data_type: fa(sf, 'datatype'), format: fa(sf, 'format'), field_key: fa(sf, 'fieldkey'), profile_id: fa(sf, 'profileid'), is_required: fa(sf, 'isrequired') === 'true' }));
      return d.innerHTML;
    };
    const walk = (v) => (Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : fix(v));
    out.data = walk(out.data);
    return out;
  }

  // ---------------------------------------------------------------- comments (Word-style)
  // The template stores only anchors: <commentanchor threadid="sdc-…"> around text, or the block for block comments.
  // Messages are rows shaped like picasso_stage.document_comment (one row per message, grouped by thread_id).
  const PEOPLE = {
    'su-3a91c0de-7': { id: 'su-3a91c0de-7', name: 'Anand Narasimhan', initials: 'AN', color: '#0B4ED4' },
    'su-7be2f415-c': { id: 'su-7be2f415-c', name: 'Priya Shah', initials: 'PS', color: '#B23A55' },
    'su-c04d98a2-1': { id: 'su-c04d98a2-1', name: 'Marco Ruiz', initials: 'MR', color: '#0B6B60' },
  };
  const ME = PEOPLE['su-3a91c0de-7'];
  const U_PRIYA = 'su-7be2f415-c', U_MARCO = 'su-c04d98a2-1';
  const msgId = () => `sdc-${crypto.randomUUID()}`;
  const threadId = () => `sdc-${Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b % 57]).join('')}`;
  const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
  const COMMENTS = {
    threads: [
      { id: 'sdc-Wq3HhX9kLm2P', anchor: { type: 'text' }, quote: '3-year hardware warranty', resolved: false, messages: [
        { id: msgId(), author: U_PRIYA, at: minsAgo(180), text: 'Legal wants "limited" in front of warranty here. Can we confirm the wording with Product?', likes: [U_MARCO] },
        { id: msgId(), author: U_MARCO, at: minsAgo(95), text: 'Confirmed with Product: "limited 3-year hardware warranty". I\'ll update the copy.', likes: [] },
      ] },
      { id: 'sdc-Bn6YcD3vPs8H', anchor: { type: 'block', blockId: 'Tq9ZrM2xKd' }, quote: 'Notice of Termination: by Customer… Special Clauses', resolved: false, messages: [
        { id: msgId(), author: U_PRIYA, at: minsAgo(62), text: 'Our MSA uses 60 days\' notice. Should this clause reference it?', likes: [] },
      ] },
      { id: 'sdc-Rt7VbN2qXc5J', anchor: { type: 'text' }, quote: 'Line total', resolved: false, messages: [
        { id: msgId(), author: U_MARCO, at: minsAgo(21), text: 'Should this be tax-inclusive for EU customers?', likes: [] },
      ] },
      { id: 'sdc-Kp4MzT8wQa1L', anchor: { type: 'text' }, quote: 'details', resolved: true, resolvedBy: U_MARCO, resolvedAt: minsAgo(30), messages: [
        { id: msgId(), author: U_PRIYA, at: minsAgo(300), text: 'Rename this heading to "Products & services"?', likes: [] },
        { id: msgId(), author: U_MARCO, at: minsAgo(40), text: 'Keeping "Product details" to match the proposal template.', likes: [] },
      ] },
    ],
  };
  const cstate = { active: null, filter: 'open', visible: true };
  let commentSeq = 100;
  const thread = (id) => COMMENTS.threads.find((t) => t.id === id);
  const marksFor = (id) => $$(`#editor ${COMMENT_TAG}[threadid="${id}"]`);
  const blockHolder = (id) => $(`#editor .ce-block[data-id="${id}"]`);
  const CICON = {
    more: svg('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
    like: svg('<path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.5 20H7"/>'),
    send: svg('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>'),
    check: svg('<path d="M20 6L9 17l-5-5"/>'),
    bubble: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  };

  function relTime(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min ago`;
    if (m < 60 * 24) return `${Math.round(m / 60)} hr ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Wrap every text run the range touches (can span blocks) in <commentanchor threadid="id">.
  function wrapRange(range, id) {
    if (range.collapsed) return 0;
    const ca = range.commonAncestorContainer;
    const root = ca.nodeType === 1 ? ca : ca.parentElement;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (range.intersectsNode(n) && n.textContent.trim() !== '' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const wrapEl = (node) => {
      const m = document.createElement(COMMENT_TAG);
      m.setAttribute('threadid', id);
      node.parentNode.insertBefore(m, node);
      m.appendChild(node);
    };
    const doneFields = new Set();
    let count = 0;
    nodes.forEach((n) => {
      const field = n.parentElement.closest(FIELD_TAG);
      if (field) { if (!doneFields.has(field) && hostOf(field)) { doneFields.add(field); wrapEl(field); count++; } return; }
      if (!hostOf(n) || n.parentElement.closest(`[contenteditable="false"], ${COMMENT_TAG}`)) return;
      const start = n === range.startContainer ? range.startOffset : 0;
      const end = n === range.endContainer ? range.endOffset : n.length;
      if (start >= end) return;
      let t = n;
      if (end < t.length) t.splitText(end);
      if (start > 0) t = t.splitText(start);
      wrapEl(t);
      count++;
    });
    return count;
  }
  function unwrapMarks(id) {
    marksFor(id).forEach((m) => { const p = m.parentNode; m.replaceWith(...m.childNodes); p.normalize(); });
  }

  function startTextThread(range) {
    const id = threadId();
    if (!wrapRange(range, id)) { toast('Select some text in the document to comment on'); return; }
    const quote = marksFor(id).map((m) => m.textContent).join(' … ');
    COMMENTS.threads.push({ id, anchor: { type: 'text' }, quote, resolved: false, draft: true, messages: [] });
    getSelection().removeAllRanges();
    openThread(id, { focus: true });
  }
  function startBlockThread(blockId) {
    const existing = COMMENTS.threads.find((t) => t.anchor.type === 'block' && t.anchor.blockId === blockId && !t.resolved);
    if (existing) { openThread(existing.id, { focus: true }); return; }
    const holder = blockHolder(blockId);
    if (!holder) return;
    const content = holder.querySelector('.ce-block__content').cloneNode(true);
    $$('.cond-head, .rs-head, .rs-foot, .rs-picker', content).forEach((e) => e.remove());
    const quote = content.textContent.replace(/\s+/g, ' ').trim().slice(0, 120);
    const id = threadId();
    COMMENTS.threads.push({ id, anchor: { type: 'block', blockId }, quote, resolved: false, draft: true, messages: [] });
    openThread(id, { focus: true });
  }
  function openThread(id, { focus } = {}) {
    cstate.visible = true;
    const t = thread(id);
    if (t?.resolved && cstate.filter === 'open') cstate.filter = 'all';
    setActive(id);
    if (focus) requestAnimationFrame(() => $(`#cr-cards .cc[data-t="${id}"] textarea`)?.focus());
  }
  function setActive(id) {
    const prev = cstate.active && thread(cstate.active);
    if (prev && prev.id !== id && prev.draft) discardDraft(prev.id);
    if (cstate.active === id) return;
    cstate.active = id;
    renderRail();
  }
  function discardDraft(id) {
    unwrapMarks(id);
    COMMENTS.threads = COMMENTS.threads.filter((t) => t.id !== id);
    if (cstate.active === id) cstate.active = null;
  }
  // Caret moved in the document: select the thread under it (like Word), otherwise let go.
  function caretMovedForComments(el) {
    const m = el.closest(COMMENT_TAG);
    const t = m && thread(m.getAttribute('threadid'));
    if (t && !(t.resolved && cstate.filter === 'open')) { setActive(t.id); return; }
    const cur = cstate.active && thread(cstate.active);
    if (!cur || cur.draft) return;
    if (cur.anchor.type === 'block' && el.closest(`.ce-block[data-id="${cur.anchor.blockId}"]`)) return;
    setActive(null);
  }

  function visibleThreads() {
    return COMMENTS.threads.filter((t) => cstate.filter === 'all' || (cstate.filter === 'resolved' ? t.resolved : !t.resolved || t.id === cstate.active));
  }
  function syncAnchors() {
    $$(`#editor ${COMMENT_TAG}`).forEach((m) => {
      const t = thread(m.getAttribute('threadid'));
      m.classList.toggle('is-active', !!t && t.id === cstate.active);
      m.classList.toggle('is-resolved', !t || (t.resolved && t.id !== cstate.active));
    });
    $$('#editor .ce-block.has-cmt, #editor .ce-block.cmt-active').forEach((b) => b.classList.remove('has-cmt', 'cmt-active'));
    COMMENTS.threads.filter((t) => t.anchor.type === 'block' && !t.resolved).forEach((t) => {
      const h = blockHolder(t.anchor.blockId);
      if (!h) return;
      h.classList.add('has-cmt');
      h.classList.toggle('cmt-active', t.id === cstate.active);
    });
    const open = COMMENTS.threads.filter((t) => !t.resolved && !t.draft).length;
    $('#cmt-count').textContent = open || '';
  }

  function messageHTML(t, m, i) {
    const who = PEOPLE[m.author] || { name: m.author, initials: '?', color: '#888' };
    const liked = m.likes?.includes(ME.id);
    return `<div class="cm">
      <div class="cm-head">
        <span class="av" style="background:${who.color}">${who.initials}</span>
        <span class="cm-meta"><span class="cm-name">${esc(who.name)}</span><span class="cm-time">${relTime(m.at)}</span></span>
        ${i === 0 ? `<button class="cc-icon" data-ca="menu" title="More actions">${CICON.more}</button>` : ''}
        <button class="cc-icon ${liked ? 'liked' : ''}" data-ca="like" data-m="${m.id}" title="Like">${CICON.like}</button>
        <span class="cc-like-n">${m.likes?.length || ''}</span>
      </div>
      <div class="cm-text">${esc(m.text)}</div>
    </div>`;
  }
  function cardHTML(t, extraClass = '') {
    const active = t.id === cstate.active;
    const cls = `cc ${active ? 'is-active' : ''} ${t.resolved ? 'is-resolved' : ''} ${t._orphan ? 'is-orphan' : ''} ${extraClass}`;
    const banners = [
      t._orphan ? `<div class="cc-banner orphan">Text removed. This comment's text is no longer in the document.</div>` : '',
      t.resolved ? `<div class="cc-banner">${CICON.check.replace('<svg', '<svg width="13" height="13"')} Resolved by ${esc(PEOPLE[t.resolvedBy]?.name || 'someone')} · <button data-ca="reopen">Reopen</button></div>` : '',
    ].join('');
    const quote = active && t.quote ? `<div class="cc-quote" title="${esc(t.quote)}">${t.anchor.type === 'block' ? 'Block: ' : ''}${esc(t.quote)}</div>` : '';
    if (t.draft) {
      return `<div class="${cls}" data-t="${t.id}">${quote}
        <div class="cm-head"><span class="av" style="background:${ME.color}">${ME.initials}</span><span class="cm-meta"><span class="cm-name">${esc(ME.name)}</span></span></div>
        <div class="cc-compose"><textarea placeholder="Start a conversation" data-role="compose"></textarea></div>
        <div class="cc-actions"><button class="btn-text" data-ca="cancel">Cancel</button><button class="btn-primary" data-ca="post">Post</button></div>
      </div>`;
    }
    const msgs = active ? t.messages : t.messages.slice(0, 1);
    const more = !active && t.messages.length > 1 ? `<div class="cc-more">${t.messages.length - 1} ${t.messages.length === 2 ? 'reply' : 'replies'}</div>` : '';
    const reply = active && !t.resolved ? `
      <div class="cc-reply"><textarea rows="1" placeholder="Reply" data-role="reply"></textarea><button class="cc-send" data-ca="send" title="Send (Ctrl+Enter)" disabled>${CICON.send}</button></div>
      <div class="cc-foot"><button data-ca="resolve">${CICON.check} Resolve</button></div>` : '';
    return `<div class="${cls}" data-t="${t.id}">${banners}${quote}${msgs.map((m, i) => messageHTML(t, m, i)).join('')}${more}${reply}</div>`;
  }

  const rail = $('#comment-rail');
  const cards = $('#cr-cards');
  function isCompact() {
    return $('#canvas').clientWidth - 48 < 820 + 20 + 300;
  }
  function renderRail() {
    rail.hidden = state.mode !== 'edit' || !cstate.visible;
    $('#btn-comments').classList.toggle('on', cstate.visible);
    $('#cr-filter').value = cstate.filter;
    const compact = isCompact();
    rail.classList.toggle('compact', compact);
    COMMENTS.threads.forEach((t) => {
      t._orphan = t.anchor.type === 'text' ? !marksFor(t.id).length : !blockHolder(t.anchor.blockId);
    });
    const list = visibleThreads();
    if (compact) {
      const act = list.find((t) => t.id === cstate.active);
      cards.innerHTML = list.filter((t) => !t._orphan).map((t) => `<div class="cb ${t.id === cstate.active ? 'is-active' : ''}" data-t="${t.id}" title="${esc(t.messages[0]?.text || 'New comment')}">${CICON.bubble}${t.messages.length > 1 ? t.messages.length : ''}</div>`).join('')
        + (act ? cardHTML(act, 'floating') : '');
    } else {
      cards.innerHTML = list.length ? list.map((t) => cardHTML(t)).join('') : `<div class="cr-empty">No ${cstate.filter === 'resolved' ? 'resolved' : cstate.filter === 'open' ? 'open' : ''} comments. Select text and click the comment button in the toolbar.</div>`;
    }
    syncAnchors();
    layoutRail();
  }

  function anchorTop(t, base) {
    if (t.anchor.type === 'text') {
      const m = marksFor(t.id)[0];
      if (!m) return null;
      const b = m.closest('.ce-block');
      if (b) t.anchor.blockId = b.dataset.id; // keep the stored anchor pointing at the right block
      return m.getBoundingClientRect().top - base - 10;
    }
    const h = blockHolder(t.anchor.blockId);
    return h ? h.getBoundingClientRect().top - base : null;
  }
  function layoutRail() {
    if (rail.hidden) return;
    const base = cards.getBoundingClientRect().top;
    const GAP = 8;
    if (rail.classList.contains('compact')) {
      let last = -Infinity;
      $$('.cb', cards).map((el) => ({ el, top: anchorTop(thread(el.dataset.t), base) }))
        .sort((a, b) => a.top - b.top)
        .forEach(({ el, top }) => { const y = Math.max(top, last + 30); el.style.top = `${y}px`; last = y; });
      const f = $('.cc.floating', cards);
      if (f) f.style.top = `${Math.max(0, anchorTop(thread(f.dataset.t), base) ?? 0)}px`;
      cards.style.height = `${$('#page-wrap').offsetHeight}px`;
      return;
    }
    const items = $$('.cc', cards).map((el) => ({ el, t: thread(el.dataset.t) })).map((it) => ({ ...it, a: anchorTop(it.t, base), h: it.el.offsetHeight }));
    const placed = items.filter((i) => i.a != null).sort((x, y) => x.a - y.a);
    const orphans = items.filter((i) => i.a == null);
    const pos = [];
    placed.forEach((it, i) => { pos[i] = i === 0 ? Math.max(0, it.a) : Math.max(it.a, pos[i - 1] + placed[i - 1].h + GAP); });
    const k = placed.findIndex((i) => i.t.id === cstate.active);
    if (k >= 0) {
      // Word behaviour: the active card sits level with its text; others make room around it.
      pos[k] = Math.max(0, placed[k].a);
      for (let i = k - 1; i >= 0; i--) pos[i] = Math.min(pos[i], pos[i + 1] - placed[i].h - GAP);
      for (let i = k + 1; i < placed.length; i++) pos[i] = Math.max(placed[i].a, pos[i - 1] + placed[i - 1].h + GAP);
    }
    placed.forEach((it, i) => { it.el.style.top = `${pos[i]}px`; });
    let bottom = placed.length ? pos[placed.length - 1] + placed[placed.length - 1].h + GAP * 3 : 40;
    orphans.forEach((it) => { it.el.style.top = `${bottom}px`; bottom += it.h + GAP; });
    cards.style.height = `${Math.max(bottom, $('#page-wrap').offsetHeight)}px`;
  }
  let layoutRaf;
  function scheduleLayout() {
    cancelAnimationFrame(layoutRaf);
    layoutRaf = requestAnimationFrame(() => {
      // Anchors can appear/disappear with edits (orphans), so re-render when that changes.
      const orphanChanged = COMMENTS.threads.some((t) => (t.anchor.type === 'text' ? !marksFor(t.id).length : !blockHolder(t.anchor.blockId)) !== !!t._orphan);
      if (orphanChanged || rail.classList.contains('compact') !== isCompact()) renderRail(); else { syncAnchors(); layoutRail(); }
    });
  }
  new ResizeObserver(scheduleLayout).observe($('#editor'));
  new ResizeObserver(scheduleLayout).observe($('#canvas'));

  // Rail interactions
  cards.addEventListener('click', (e) => {
    const card = e.target.closest('.cc, .cb');
    if (!card) return;
    const t = thread(card.dataset.t);
    const act = e.target.closest('[data-ca]')?.dataset.ca;
    if (!act) {
      if (t.id !== cstate.active) {
        setActive(t.id);
        (marksFor(t.id)[0] || blockHolder(t.anchor.blockId))?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      return;
    }
    const text = card.querySelector('textarea')?.value.trim();
    switch (act) {
      case 'post':
        if (!text) { card.querySelector('textarea').focus(); return; }
        t.messages.push({ id: msgId(), author: ME.id, at: new Date().toISOString(), text, likes: [] });
        delete t.draft;
        renderRail();
        break;
      case 'cancel': discardDraft(t.id); renderRail(); break;
      case 'send':
        if (!text) return;
        t.messages.push({ id: msgId(), author: ME.id, at: new Date().toISOString(), text, likes: [] });
        renderRail();
        requestAnimationFrame(() => $(`#cr-cards .cc[data-t="${t.id}"] textarea`)?.focus());
        break;
      case 'like': {
        const m = t.messages.find((x) => x.id === e.target.closest('[data-m]').dataset.m);
        m.likes = m.likes?.includes(ME.id) ? m.likes.filter((x) => x !== ME.id) : [...(m.likes || []), ME.id];
        renderRail();
        break;
      }
      case 'resolve': resolveThread(t, true); break;
      case 'reopen': resolveThread(t, false); break;
      case 'menu':
        openMini(e.target.closest('[data-ca]'), `
          <button class="mp-item" data-cm="resolve">${CICON.check}<span>${t.resolved ? 'Reopen thread' : 'Resolve thread'}</span></button>
          <button class="mp-item" data-cm="link">${ICON.file}<span>Copy link to comment</span></button>
          <button class="mp-item" data-cm="delete" style="color:#b3261e">${ICON.trash}<span>Delete thread</span></button>`, (el) => {
          const c = el.closest('[data-cm]')?.dataset.cm;
          if (!c) return false;
          if (c === 'resolve') resolveThread(t, !t.resolved);
          if (c === 'link') { navigator.clipboard?.writeText(`${location.href.split('#')[0]}#comment=${t.id}`); toast('Link copied'); }
          if (c === 'delete') { unwrapMarks(t.id); COMMENTS.threads = COMMENTS.threads.filter((x) => x.id !== t.id); cstate.active = null; renderRail(); toast('Thread deleted'); }
          return true;
        });
        break;
    }
  });
  function resolveThread(t, resolved) {
    t.resolved = resolved;
    if (resolved) { t.resolvedBy = ME.id; t.resolvedAt = new Date().toISOString(); cstate.active = null; toast('Thread resolved. Switch the filter to Resolved to see it.'); }
    else { delete t.resolvedBy; delete t.resolvedAt; }
    renderRail();
  }
  cards.addEventListener('input', (e) => {
    const ta = e.target.closest('textarea');
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(160, ta.scrollHeight)}px`;
    const send = ta.parentElement.querySelector('.cc-send');
    if (send) send.disabled = !ta.value.trim();
    layoutRail();
  });
  cards.addEventListener('keydown', (e) => {
    const ta = e.target.closest('textarea');
    if (!ta) return;
    const card = ta.closest('.cc');
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); card.querySelector(ta.dataset.role === 'compose' ? '[data-ca="post"]' : '[data-ca="send"]')?.click(); }
    if (e.key === 'Escape') { e.preventDefault(); const t = thread(card.dataset.t); if (t.draft) { discardDraft(t.id); } else cstate.active = null; renderRail(); }
  });
  cards.addEventListener('mouseover', (e) => hoverThread(e.target.closest('.cc, .cb')?.dataset.t || null));
  cards.addEventListener('mouseleave', () => hoverThread(null));
  function hoverThread(id) {
    $$(`#editor ${COMMENT_TAG}.is-hover`).forEach((m) => m.classList.remove('is-hover'));
    $$('#editor .ce-block.cmt-hover').forEach((b) => b.classList.remove('cmt-hover'));
    if (!id) return;
    const t = thread(id);
    marksFor(id).forEach((m) => m.classList.add('is-hover'));
    if (t?.anchor.type === 'block') blockHolder(t.anchor.blockId)?.classList.add('cmt-hover');
  }
  $('#cr-filter').addEventListener('change', (e) => { cstate.filter = e.target.value; cstate.active = null; renderRail(); });
  $('#btn-comments').addEventListener('click', () => { cstate.visible = !cstate.visible; renderRail(); });
  window.addEventListener('resize', scheduleLayout);

  // Copy/cut inside the editor: drop comment anchors so pasting doesn't duplicate comment ids.
  ['copy', 'cut'].forEach((type) => document.addEventListener(type, (e) => {
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    const host = hostOf(sel.anchorNode);
    if (!host || !$('#editor').contains(host) || hostOf(sel.focusNode) !== host) return;
    const d = document.createElement('div');
    d.appendChild(sel.getRangeAt(0).cloneContents());
    if (!d.querySelector(COMMENT_TAG)) return;
    $$(COMMENT_TAG, d).forEach((m) => m.replaceWith(...m.childNodes));
    e.clipboardData.setData('text/html', d.innerHTML);
    e.clipboardData.setData('text/plain', sel.toString());
    e.preventDefault();
    if (type === 'cut') sel.getRangeAt(0).deleteContents();
  }, true));

  // Rows shaped like document_comment (proposed template_comment): one row per message.
  function commentRows(contentBlockRows) {
    const rowOf = (blockEl) => blockEl && ROW_IDS.get(blockEl.dataset.id);
    return COMMENTS.threads.filter((t) => !t.draft).flatMap((t) => {
      let outerBlock = null, innerBlock = null;
      const anchorEl = t.anchor.type === 'text' ? marksFor(t.id)[0] : blockHolder(t.anchor.blockId);
      if (anchorEl) {
        const blocks = [];
        for (let el = anchorEl; el; el = el.parentElement?.closest('.ce-block')) { const b = el.closest('.ce-block'); if (!b) break; blocks.push(b); el = b; }
        outerBlock = blocks[blocks.length - 1];
        innerBlock = blocks.length > 1 ? blocks[0] : null;
      }
      const content_block_id = rowOf(outerBlock) || null;
      return t.messages.map((m) => ({
        id: m.id, thread_id: t.id, comment_text: m.text,
        status: t.resolved ? 'RESOLVED' : 'UNRESOLVED', scope: 'PUBLIC', style: '',
        content_block_id, template_id: TEMPLATE.id,
        anchor_type: t.anchor.type === 'text' ? 'TEXT' : 'BLOCK',     // NEW column
        inner_block_id: innerBlock ? innerBlock.dataset.id : null,    // NEW column: block inside a repeating section
        is_deleted: false, created_by_id: m.author, created_date: m.at,
      }));
    });
  }

  // Inline tool (Editor.js inline toolbar) and block tune (⋮ menu).
  class CommentInline {
    static get isInline() { return true; }
    static get title() { return 'Comment'; }
    static get sanitize() { return { [COMMENT_TAG]: { threadid: true } }; }
    constructor({ api }) { this.api = api; }
    render() {
      this.btn = document.createElement('button');
      this.btn.type = 'button';
      this.btn.className = 'ce-inline-tool';
      this.btn.innerHTML = CICON.bubble.replace('<svg', '<svg width="16" height="16"');
      return this.btn;
    }
    surround(range) {
      const el = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      const m = el?.closest(COMMENT_TAG);
      this.api.inlineToolbar.close();
      if (m) openThread(m.getAttribute('threadid'));
      else startTextThread(range);
    }
    checkState() {
      const el = getSelection().anchorNode?.parentElement;
      const on = !!el?.closest(COMMENT_TAG);
      this.btn?.classList.toggle('ce-inline-tool--active', on);
      return on;
    }
  }
  class CommentTune {
    static get isTune() { return true; }
    constructor({ block }) { this.block = block; }
    render() {
      const has = COMMENTS.threads.some((t) => t.anchor.type === 'block' && t.anchor.blockId === this.block.id && !t.resolved);
      return { icon: CICON.bubble, title: has ? 'Open comment' : 'Comment on block', closeOnActivate: true, onActivate: () => startBlockThread(this.block.id) };
    }
    save() { return undefined; }
  }

  // ---------------------------------------------------------------- init
  outer = new EditorJS({
    holder: 'editor',
    tools: outerTools(),
    tunes: ['textAlign', 'indentation', 'lock', 'commentBlock'],
    data: rowsToEditor(seedRows()),
    minHeight: 80,
    placeholder: 'Start your template…',
    onReady: () => {
      EDITORS.set($('#editor'), outer);
      refreshChips($('#editor'));
      renderRail();
    },
    onChange: () => { scheduleJson(); scheduleLayout(); },
  });
  window.__outer = outer; // for debugging in the console
})();
