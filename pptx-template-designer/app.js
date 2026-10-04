// PowerPoint template designer prototype.
// The customer's .pptx is the design. @aiden0z/pptx-renderer draws it; our own layer of hotspots sits on top,
// mapped by the p:cNvPr shape IDs the renderer exposes. Edits never go through the renderer's model: text edits
// are spliced into the slide XML (ooxml.js / text.js) and everything structural is template JSON (template.js).
// Preview runs generate.js (the stand-in for the Apex generator) and renders its output with the same renderer.
import JSZip from 'jszip';
import { parseZip, buildPresentation, renderSlide, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';
import { Pkg, NS, parseXml, serializeXml, shapeElements, shapeById, shapeKind, cNvPr, attr, kids, desc, base64ToBytes, fixDuplicateIds } from './ooxml.js';
import { paragraphs, paraText, setParaText, spliceText, findTokens, tokenText, TOKEN_RE } from './text.js';
import { tagShapes, rangeToXml, paragraphAt } from './canvas-text.js';
import { emptyTemplate, slideCfg, shapeCfg, compact, OPS, checkSlide, slideTokens } from './template.js';
import { generate, chartData, selectRecords } from './generate.js';
import { columns, hasMerges, addColumn, removeColumn, moveColumn, setColumnField, setHeader, styleFlag, setStyleFlag, insertTable, EMU_PER_PX } from './table-ops.js';
import { applyExampleDesign } from './example.js';
import { FIELDS, SOURCES, RECORDS, BASE_OBJECT, fieldMeta, formatValue } from './data.js';
import { ASSETS } from './sample-assets.js';
import { startTour } from './tour.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icon = (n, cls = '') => `<svg class="sd-icon ${cls}" aria-hidden="true"><use href="#${n}"></use></svg>`;
const one = (key) => SOURCES[key].label.toLowerCase().replace(/^opportunity /, '').replace(/s$/, '');
const clone = (o) => JSON.parse(JSON.stringify(o));
const SAMPLE_NAME = 'fleet-proposal.pptx';

const st = {
  mode: 'design', fileName: '', pkg: null, tpl: null, designBytes: null,
  slides: [], pres: null, cur: 0, sel: null,
  recordIdx: 0,
  preview: null, stageHandle: null, thumbs: [], lastInput: null, busy: false
};
window.ptd = st;

/* ================================================================ loading */
async function loadDeck(bytes, name, { keepTemplate } = {}) {
  showLoading(true);
  try {
    const pkg = await Pkg.load(bytes, JSZip);
    const slides = await pkg.slides();
    if (!slides.length) throw new Error('This file has no slides.');
    let repaired = 0;
    for (const s of slides) repaired += fixDuplicateIds(await pkg.doc(s.part));
    if (repaired) console.info(`Gave ${repaired} shape(s) with duplicate IDs a new ID, as PowerPoint would on save.`);
    const prev = st.tpl;
    st.pkg = pkg; st.fileName = name; st.slides = slides;
    st.tpl = emptyTemplate(name, bytes.length, BASE_OBJECT);
    st.cur = 0; st.sel = null; st.mode = 'design'; st.preview = null; st.lastInput = null;
    let msg = '';
    if (keepTemplate && prev) msg = rematch(prev, st.tpl, slides, pkg);
    $('ptd-root').dataset.stage = 'design';
    $('ptd-title').textContent = name.replace(/\.pptx$/i, '');
    $('ptd-upload').hidden = true; $('ptd-work').hidden = false;
    await rebuild({ all: true });
    syncModeUi();
    resetHistory();
    renderProps();
    if (msg) toast(msg);
  } catch (e) {
    console.error(e);
    toast('That file couldn’t be read as a PowerPoint presentation. ' + (e.message || ''));
  } finally { showLoading(false); }
}

/** Carry bindings over to a re-uploaded deck: slides by sldId, shapes by ID, then by name. */
function rematch(prev, next, slides, pkg) {
  let kept = 0, moved = 0, lost = 0;
  const ids = new Set(slides.map((s) => s.sldId));
  for (const [sid, s] of Object.entries(prev.slides)) {
    if (!ids.has(sid)) { lost += 1 + Object.keys(s.shapes).length; continue; }
    const doc = pkg.docs.get(slides.find((x) => x.sldId === sid).part);
    const ns = slideCfg(next, sid, true);
    ns.repeat = s.repeat; ns.showIf = s.showIf;
    for (const [id, c] of Object.entries(s.shapes)) {
      let el = doc && shapeById(doc, id);
      let nid = id;
      if (!el && doc) { el = shapeElements(doc).find((x) => attr(cNvPr(x), 'name') === c.name); nid = el ? attr(cNvPr(el), 'id') : null; }
      if (!el) { lost++; continue; }
      ns.shapes[nid] = c; if (nid === id) kept++; else moved++;
    }
  }
  return `Re-uploaded. Bindings kept: ${kept}${moved ? `, re-matched by name: ${moved}` : ''}${lost ? `, lost (slide or shape removed): ${lost}` : ''}.`;
}

function showLoading(on) { $('ptd-loading').hidden = !on; }

/* ================================================================ model → views */
async function rebuild({ all, thumb } = {}) {
  // preload every slide doc so text edits and checks work on live XML
  for (const s of st.slides) await st.pkg.doc(s.part);
  st.designBytes = await st.pkg.save();
  const files = await parseZip(st.designBytes.buffer.slice(0), RECOMMENDED_ZIP_LIMITS);
  st.pres = buildPresentation(files);
  if (st.mode !== 'design') return;
  if (all) drawStrip(); else if (thumb != null) drawThumb(thumb);
  drawStage();
}
let refreshTimer = null;
/** Typing: redraw a moment after the last keystroke, and record the burst as one undo step. */
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { refreshTimer = null; commit(); rebuild({ thumb: st.cur }); }, 250);
}

/* ================================================================ undo / redo
   Every edit changes only two things: the slides' XML and the template JSON. History keeps a snapshot of both
   after each change (a burst of typing is one change), so undo and redo restore exactly what was there. */
const hist = { stack: [], at: -1 };
function snapshot() {
  return { tpl: JSON.stringify(st.tpl), slides: st.slides.map((s) => serializeXml(st.pkg.docs.get(s.part))) };
}
function sameSnap(a, b) { return !!a && !!b && a.tpl === b.tpl && a.slides.every((x, i) => x === b.slides[i]); }
function resetHistory() { hist.stack = [snapshot()]; hist.at = 0; syncUndo(); renderJson(); }
function commit() {
  if (!st.pkg || !hist.stack.length) return;
  const snap = snapshot();
  if (sameSnap(snap, hist.stack[hist.at])) return;
  hist.stack.splice(hist.at + 1);
  hist.stack.push(snap);
  if (hist.stack.length > 200) hist.stack.shift();
  hist.at = hist.stack.length - 1;
  syncUndo();
  renderJson();
}
async function travel(step) {
  if (st.mode !== 'design' || st.busy) return;
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; commit(); }   // finish a typing burst first
  const to = hist.at + step;
  if (to < 0 || to >= hist.stack.length) return;
  const from = hist.stack[hist.at], snap = hist.stack[to];
  hist.at = to;
  // go to the slide that changed, so the undo is visible
  let changedSlide = snap.slides.findIndex((x, i) => x !== from.slides[i]);
  if (changedSlide < 0) {
    const a = JSON.parse(from.tpl).slides, b = JSON.parse(snap.tpl).slides;
    changedSlide = st.slides.findIndex((s) => JSON.stringify(a[s.sldId] || null) !== JSON.stringify(b[s.sldId] || null));
  }
  st.tpl = JSON.parse(snap.tpl);
  st.slides.forEach((s, i) => st.pkg.putDoc(s.part, parseXml(snap.slides[i])));
  st.canvasSel = null; st.lastInput = null; st.repeatPending = null;
  if (changedSlide >= 0 && changedSlide !== st.cur) { st.cur = changedSlide; st.sel = null; }
  if (st.sel && !shapeById(slideDoc(), st.sel)) st.sel = null;
  await rebuild({ all: true });
  renderProps();
  syncUndo();
  renderJson();
  $('ptd-history-live').textContent = step < 0 ? 'Undone' : 'Redone';
}
function syncUndo() {
  const design = st.mode === 'design';
  $('ptd-undo').disabled = !design || hist.at <= 0;
  $('ptd-redo').disabled = !design || hist.at >= hist.stack.length - 1;
}
$('ptd-undo').addEventListener('click', () => travel(-1));
$('ptd-redo').addEventListener('click', () => travel(1));
document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  if (e.target.closest && e.target.closest('input, textarea, select')) return;   // the field's own text undo
  e.preventDefault();
  travel(k === 'y' || e.shiftKey ? 1 : -1);
});

function deck() {
  return st.mode === 'preview' && st.preview ? st.preview.pres : st.pres;
}
function slideDoc(i = st.cur) { return st.pkg.docs.get(st.slides[i].part); }

/* ---------------------------------------------------------------- slide strip */
function drawStrip() {
  st.thumbs.forEach((h) => h && h.dispose());
  st.thumbs = [];
  const strip = $('ptd-strip');
  const pres = deck();
  strip.innerHTML = pres.slides.map((_, i) => `<button class="ptd-thumb" type="button" data-slide="${i}" aria-current="${i === st.cur}" aria-label="Slide ${i + 1}">
      <span class="ptd-thumb__n">${i + 1}</span><span class="ptd-thumb__frame"></span><span class="ptd-thumb__tags"></span></button>`).join('');
  pres.slides.forEach((_, i) => drawThumb(i));
}
function drawThumb(i) {
  const pres = deck();
  const btn = $('ptd-strip').querySelector(`[data-slide="${i}"]`);
  if (!btn || !pres.slides[i]) return;
  const frame = btn.querySelector('.ptd-thumb__frame');
  if (st.thumbs[i]) st.thumbs[i].dispose();
  frame.innerHTML = '';
  const w = frame.clientWidth || 160;
  const scale = w / pres.width;
  frame.style.height = Math.round(pres.height * scale) + 'px';
  const wrap = document.createElement('div');
  wrap.className = 'ptd-thumb__scale';
  wrap.style.transform = `scale(${scale})`;
  const h = renderSlide(pres, pres.slides[i], { mediaUrlCache: mediaCache(pres) });
  wrap.appendChild(h.element);
  frame.appendChild(wrap);
  st.thumbs[i] = h;
  btn.querySelector('.ptd-thumb__tags').innerHTML = thumbTags(i);
  btn.classList.toggle('is-dropped', st.mode === 'design' && !!(slideCfg(st.tpl, st.slides[i].sldId) || {}).showIf);
}
function thumbTags(i) {
  if (st.mode === 'preview') {
    const m = st.preview.map[i];
    return `<span class="ptd-tag ptd-tag--muted">From slide ${m.from}${m.of > 1 ? ` · ${m.n} of ${m.of}` : ''}</span>`;
  }
  const cfg = slideCfg(st.tpl, st.slides[i].sldId) || { shapes: {} };
  const tags = [];
  if (cfg.repeat) tags.push(`<span class="ptd-tag">${icon('copy-05')}Per ${esc(one(cfg.repeat.source))}</span>`);
  if (cfg.showIf) tags.push(`<span class="ptd-tag ptd-tag--cond">${icon('eye-off')}Conditional</span>`);
  const n = slideTokens(slideDoc(i)).length + Object.values(cfg.shapes).filter((c) => c.image || c.table || c.chart).length;
  if (n) tags.push(`<span class="ptd-tag ptd-tag--muted">${n} binding${n > 1 ? 's' : ''}</span>`);
  return tags.join('');
}
const caches = new WeakMap();
function mediaCache(pres) { if (!caches.has(pres)) caches.set(pres, new Map()); return caches.get(pres); }

/* ---------------------------------------------------------------- stage */
function drawStage() {
  const pres = deck();
  if (st.stageHandle) st.stageHandle.dispose();
  const host = $('ptd-slide');
  host.innerHTML = '';
  st.stageHandle = renderSlide(pres, pres.slides[st.cur], { mediaUrlCache: mediaCache(pres) });
  host.appendChild(st.stageHandle.element);
  st.canvasSel = null;
  if (st.mode === 'design') { chipify(st.stageHandle.element); tagShapes(st.stageHandle.element, pres.slides[st.cur].nodes || []); }
  layoutStage();
  syncEditing();
  $('ptd-strip').querySelectorAll('.ptd-thumb').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.slide === st.cur)));
}
function layoutStage() {
  const pres = deck();
  if (!pres) return;
  const wrap = $('ptd-stage-wrap');
  const cs = getComputedStyle(wrap);
  const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const scale = Math.max(0.1, Math.min(w / pres.width, h / pres.height));
  st.scale = scale;
  const stage = $('ptd-stage');
  stage.style.width = Math.round(pres.width * scale) + 'px';
  stage.style.height = Math.round(pres.height * scale) + 'px';
  $('ptd-slide').style.transform = `scale(${scale})`;
  drawOverlay();
}
new ResizeObserver(() => { if (st.pres) layoutStage(); }).observe($('ptd-stage-wrap'));

/** Show {{tokens}} in the rendered text as labelled chips (design only; the file keeps the raw token). */
function chipify(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.includes('{{') && n.parentNode.namespaceURI === 'http://www.w3.org/1999/xhtml') hits.push(n);
  for (const n of hits) {
    const text = n.nodeValue, toks = findTokens(text);
    if (!toks.length) continue;
    const frag = document.createDocumentFragment();
    let at = 0;
    for (const t of toks) {
      frag.appendChild(document.createTextNode(text.slice(at, t.start)));
      const m = fieldMeta(t.path);
      const chip = document.createElement('span');
      chip.className = 'ptd-chip' + (m && m.source ? ' ptd-chip--list' : '');
      chip.textContent = m ? m.label : t.path;
      chip.title = (m ? m.label + ' · ' : '') + t.raw;
      chip.dataset.raw = t.raw;
      frag.appendChild(chip);
      at = t.end;
    }
    frag.appendChild(document.createTextNode(text.slice(at)));
    n.parentNode.replaceChild(frag, n);
  }
}

const KIND_LABEL = { text: 'Text box', shape: 'Shape', picture: 'Picture', table: 'Table', chart: 'Chart', group: 'Group', frame: 'Object' };
const KIND_ICON = { text: 'type-square', shape: 'square', picture: 'image-01', table: 'table', chart: 'bar-chart-square-02', group: 'layers-three-01', frame: 'square' };

/** A name people recognise: the shape's own name, unless PowerPoint or a generator gave it a generic one. */
function displayName(el) {
  const n = attr(cNvPr(el), 'name') || '';
  if (n && !/^(Text|TextBox|Text Box|Rectangle|Shape|Content Placeholder|Title|Subtitle|Picture|Google Shape|Freeform)\s*\d*$/i.test(n)) return n;
  const ph = el.getElementsByTagNameNS(NS.p, 'ph')[0];
  const t = ph && attr(ph, 'type');
  if (t === 'title' || t === 'ctrTitle') return 'Title';
  if (t === 'subTitle') return 'Subtitle';
  const txt = paragraphs(el).map(paraText).join(' ').replace(TOKEN_RE, (m, p) => '[' + ((fieldMeta(p) || {}).label || p) + ']').trim();
  if (txt) return '“' + (txt.length > 30 ? txt.slice(0, 29) + '…' : txt) + '”';
  return n || KIND_LABEL[shapeKind(el)];
}

function shapeInfo(id) {
  const el = shapeById(slideDoc(), id);
  if (!el) return null;
  const kind = shapeKind(el);
  const cfg = shapeCfg(st.tpl, st.slides[st.cur].sldId, id) || {};
  const tokens = paragraphs(el).reduce((n, p) => n + findTokens(paraText(p)).length, 0);
  return { el, kind, cfg, tokens, name: displayName(el), rawName: attr(cNvPr(el), 'name') || '' };
}

function drawOverlay() {
  const ov = $('ptd-overlay');
  ov.innerHTML = '';
  if (st.mode !== 'design') return;
  const pres = st.pres, s = st.scale;
  const nodes = pres.slides[st.cur].nodes || [];
  for (const node of nodes) {
    const info = shapeInfo(node.id);
    if (!info) continue;
    const badges = [];
    if (info.tokens) badges.push(['variable', '']);
    if (info.cfg.image) badges.push(['image-01', '']);
    if (info.cfg.table) badges.push(['table', '']);
    if (info.cfg.chart) badges.push(['bar-chart-square-02', '']);
    if (info.cfg.showIf) badges.push(['eye-off', ' ptd-hot__badge--cond']);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ptd-hot' + (badges.length ? ' is-bound' : '');
    b.dataset.id = node.id;
    b.dataset.kind = info.kind;
    b.setAttribute('aria-pressed', String(st.sel === node.id));
    b.setAttribute('aria-label', `${KIND_LABEL[info.kind]}: ${info.name}`);
    b.style.left = node.position.x * s + 'px';
    b.style.top = node.position.y * s + 'px';
    b.style.width = Math.max(8, node.size.w * s) + 'px';
    b.style.height = Math.max(8, node.size.h * s) + 'px';
    b.innerHTML = `<span class="ptd-hot__name">${esc(info.name)}</span>` +
      (badges.length ? `<span class="ptd-hot__badges">${badges.map(([i, c]) => `<span class="ptd-hot__badge${c}">${icon(i)}</span>`).join('')}</span>` : '');
    ov.appendChild(b);
  }
}

/* ================================================================ selection + navigation */
function select(id) {
  if (id !== st.sel) { const ds = getSelection(); if (ds) ds.removeAllRanges(); }
  st.sel = id; st.lastInput = null; st.canvasSel = null;
  $('ptd-overlay').querySelectorAll('.ptd-hot').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  syncEditing();
  renderProps();
}
/** The selected shape as drawn by the renderer. */
function selEl() { return st.sel ? $('ptd-slide').querySelector(`[data-ptd-id="${CSS.escape(st.sel)}"]`) : null; }
/**
 * Editing mode: while a text box or table is selected, its drawn text takes the mouse so words can be selected
 * on the slide. The hotspot layer stops taking clicks, and clicks elsewhere pick shapes by geometry (hitTest).
 */
function syncEditing() {
  const info = st.mode === 'design' && st.sel && shapeInfo(st.sel);
  const on = !!info && (info.kind === 'text' || info.kind === 'table');
  $('ptd-stage').classList.toggle('is-editing', on);
  $('ptd-slide').querySelectorAll('.ptd-editing').forEach((e) => e.classList.remove('ptd-editing'));
  const el = on && selEl();
  if (el) el.classList.add('ptd-editing');
}
/** Topmost shape under a viewport point, from the model's geometry. */
function hitTest(x, y) {
  const r = $('ptd-stage').getBoundingClientRect();
  const sx = (x - r.left) / st.scale, sy = (y - r.top) / st.scale;
  const nodes = (st.pres.slides[st.cur].nodes || []).slice().reverse();
  const n = nodes.find((n) => sx >= n.position.x && sx <= n.position.x + n.size.w && sy >= n.position.y && sy <= n.position.y + n.size.h && shapeInfo(n.id));
  return n ? n.id : null;
}
function goSlide(i) {
  const n = deck().slides.length;
  if (i < 0 || i >= n) return;
  st.cur = i; st.sel = null; st.lastInput = null;
  drawStage(); renderProps();
  const t = $('ptd-strip').querySelector(`[data-slide="${i}"]`);
  if (t) t.scrollIntoView({ block: 'nearest' });
}
$('ptd-strip').addEventListener('click', (e) => { const t = e.target.closest('[data-slide]'); if (t) goSlide(+t.dataset.slide); });
$('ptd-strip').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); goSlide(st.cur + (e.key === 'ArrowDown' ? 1 : -1));
    const t = $('ptd-strip').querySelector(`[data-slide="${st.cur}"]`); if (t) t.focus();
  }
});
$('ptd-overlay').addEventListener('click', (e) => { const h = e.target.closest('.ptd-hot'); select(h ? h.dataset.id : null); });
$('ptd-stage-wrap').addEventListener('click', (e) => {
  if (st.mode !== 'design' || e.target.closest('.ptd-hot')) return;
  const ds = getSelection();
  if (ds && !ds.isCollapsed) return;                       // the end of a drag-selection
  const el = selEl();
  if (el && el.contains(e.target)) { readCanvasSelection(); return; }   // a click in the text being edited
  const hit = hitTest(e.clientX, e.clientY);
  if (hit !== st.sel) select(hit);
});
/* text selected (or a caret placed) in the selected shape's drawn text */
document.addEventListener('selectionchange', () => readCanvasSelection());
function readCanvasSelection() {
  if (st.mode !== 'design' || !$('ptd-stage').classList.contains('is-editing')) return;
  const ds = getSelection();
  if (!ds || !ds.rangeCount) return;
  const r = ds.getRangeAt(0), el = selEl();
  if (!el || !el.contains(r.startContainer)) {
    if ($('ptd-slide').contains(r.startContainer)) { st.canvasSel = null; showSelNote(); }
    return;                                                // e.g. a click on a field button keeps the last selection
  }
  const hit = rangeToXml(el, paragraphs(shapeInfo(st.sel).el), r);
  st.canvasSel = hit ? Object.assign({ shapeId: st.sel }, hit) : (r.collapsed ? null : { shapeId: st.sel, unmapped: true });
  st.lastInput = null;
  showSelNote();
}
function selNoteText() {
  const info = st.sel && shapeInfo(st.sel);
  if (!info) return '';
  const cs = st.canvasSel;
  if (cs && cs.multi) return 'Select text inside one paragraph or cell.';
  if (cs && cs.unmapped) return 'That selection can’t be matched to the text. Select the words in the text below instead.';
  if (cs && !cs.collapsed) return `Selected “${cs.text}”. Click a field to replace it.`;
  if (info.kind === 'table') return cs ? `Cell “${paraText(cs.p) || 'empty'}”. Click a field to replace its text, or select some of the words.` : 'Click into a cell on the slide, then click a field to replace the cell’s text. Select words to replace just those.';
  return 'Click a field to replace all of this text box’s text. To replace only some words, select them on the slide or below first.';
}
function showSelNote() { const n = $('ptd-selnote'); if (n) n.textContent = selNoteText(); }
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && st.sel && !e.target.closest('input, textarea, select')) select(null);
  if ((e.key === 'PageDown' || e.key === 'PageUp') && st.pres && !e.target.closest('input, textarea, select')) { e.preventDefault(); goSlide(st.cur + (e.key === 'PageDown' ? 1 : -1)); }
});

/* ================================================================ properties panel */
function field(label, id, control, hint) {
  return `<div class="sd-field sd-signer"><label class="sd-field__label" for="${id}">${label}</label><div class="sd-field__col"><div class="sd-field__control">${control}</div>${hint ? `<p class="ptd-hint">${hint}</p>` : ''}</div></div>`;
}
function selectCtl(id, options, value, attrs = '') {
  return `<select id="${id}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select><span class="sd-field__affix sd-field__affix--chevron">${icon('chevron-down')}</span>`;
}
function toggle(id, options, value) {
  return `<fieldset class="sd-toggle" role="radiogroup" id="${id}">${options.map(([v, l]) => `<label class="sd-toggle-option"><input class="sd-toggle-option__input" type="radio" name="${id}" value="${esc(v)}"${v === value ? ' checked' : ''}><span class="sd-toggle-option__label">${esc(l)}</span></label>`).join('')}</fieldset>`;
}
const section = (title, body) => `<section class="screen-editor-config-related-list-section"><div class="sd-panel-subtitle"><h3 class="sd-panel-subtitle__label">${title}</h3></div><div class="screen-editor-config-related-list-controls">${body}</div></section>`;
const kv = (k, v) => `<div class="ptd-kv"><span>${k}</span><span>${v}</span></div>`;

/** Fields usable in this slide's scope: record fields, plus the repeat list's fields. */
function scopeFields(extraSource) {
  const out = FIELDS.map(([p, l, t]) => [p, l, t]);
  const cfg = slideCfg(st.tpl, st.slides[st.cur].sldId) || {};
  for (const key of new Set([cfg.repeat && cfg.repeat.source, extraSource].filter(Boolean))) {
    const s = SOURCES[key];
    for (const [f, l, t] of s.fields) out.push([s.prefix + '.' + f, `${l} (${one(key)})`, t]);
  }
  return out;
}

function condEditor(prefix, cond, fields) {
  const mode = cond ? 'when' : 'always';
  const body = cond ? `<div class="ptd-cond">
      ${field('Field', prefix + '-cf', selectCtl(prefix + '-cf', fields.map(([p, l]) => [p, l]), cond.field))}
      ${field('Condition', prefix + '-co', selectCtl(prefix + '-co', OPS, cond.op))}
      ${cond.op === 'blank' || cond.op === 'notblank' ? '' : field('Value', prefix + '-cv', `<input id="${prefix}-cv" type="text" value="${esc(cond.value)}">`)}
    </div>` : '';
  return field('Show', prefix + '-show', toggle(prefix + '-show', [['always', 'Always'], ['when', 'Only when…']], mode)) + body;
}
function bindCond(prefix, get, set) {
  const root = $('ptd-props');
  root.querySelectorAll(`input[name="${prefix}-show"]`).forEach((r) => r.addEventListener('change', () => {
    set(r.value === 'when' ? { field: 'Opportunity.Term_Years__c', op: 'gt', value: 1 } : null); changed();
  }));
  const f = $(prefix + '-cf'), o = $(prefix + '-co'), v = $(prefix + '-cv');
  if (f) f.addEventListener('change', () => {
    const c = get(); c.field = f.value;
    const m = fieldMeta(f.value);
    if (m && (m.type === 'image' || m.type === 'text') && (c.op === 'gt' || c.op === 'lt')) c.op = m.type === 'image' ? 'notblank' : 'eq';
    changed();
  });
  if (o) o.addEventListener('change', () => { get().op = o.value; changed(); });
  if (v) v.addEventListener('change', () => { get().value = v.value; changed(false); });
}

function paraEditor(el, id) {
  const ps = paragraphs(el);
  return ps.map((p, i) => `<div class="ptd-para">${ps.length > 1 ? `<span class="ptd-para__label">Paragraph ${i + 1}</span>` : ''}
    <textarea class="ptd-textarea" rows="${Math.min(5, Math.max(1, Math.ceil(paraText(p).length / 34)))}" data-para="${id}:${i}" aria-label="Paragraph ${i + 1}">${esc(paraText(p))}</textarea></div>`).join('');
}

function renderProps() {
  refreshFieldsPane();
  renderSlideBar();
  const props = $('ptd-props'), title = $('ptd-props-title');
  if (!st.pres) { props.innerHTML = ''; return; }
  if (st.mode === 'preview') return renderPreviewProps();
  const s = st.slides[st.cur];
  const sCfg = slideCfg(st.tpl, s.sldId) || {};
  if (!st.sel) {
    title.textContent = `Slide ${st.cur + 1}`;
    const doc = slideDoc();
    const issues = checkSlide(st.tpl, s.sldId, doc);
    const tokens = slideTokens(doc);
    const shapes = shapeElements(doc).filter((el) => el.parentNode.localName === 'spTree');
    props.innerHTML =
      section('Repeat', repeatControls(s, sCfg))
      + section('Visibility', condEditor('sc', sCfg.showIf, scopeFields()))
      + section('On this slide', `${kv('Merge fields', tokens.length)}${kv('Slide ID (stays fixed in PowerPoint)', esc(s.sldId))}
          ${issues.length ? `<ul class="ptd-issues">${issues.map((i) => `<li>${esc(i.msg)}</li>`).join('')}</ul>` : ''}
          <div class="sd-insert-panel__group"><ul class="sd-insert-panel__list">${shapes.map((el) => {
            const k = shapeKind(el), id = attr(cNvPr(el), 'id');
            return `<li class="sd-insert-panel__row"><button class="sd-objects-menu-item" type="button" data-pick="${esc(id)}"><span class="sd-objects-menu-item__content">${icon(KIND_ICON[k], 'sd-objects-menu-item__icon')}<span class="sd-objects-menu-item__label">${esc(displayName(el))}<span class="ptd-related-meta">${KIND_LABEL[k]}</span></span></span></button></li>`;
          }).join('')}</ul></div>
          <p class="ptd-hint">Click a shape on the slide, or pick it here.</p>`);
    wireRepeat(s, sCfg);
    bindCond('sc', () => slideCfg(st.tpl, s.sldId, true).showIf, (v) => { slideCfg(st.tpl, s.sldId, true).showIf = v; });
    props.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => select(b.dataset.pick)));
    return;
  }

  const info = shapeInfo(st.sel);
  if (!info) { st.sel = null; return renderProps(); }
  const { el, kind, name } = info;
  const id = st.sel;
  const cfg = () => shapeCfg(st.tpl, s.sldId, id, info.rawName, true);
  const c = info.cfg;
  title.textContent = name;
  let html = `<p class="ptd-hint ptd-props-meta">${KIND_LABEL[kind]} · shape ID ${esc(id)}${info.rawName && info.rawName !== name ? ` · named “${esc(info.rawName)}” in PowerPoint` : ''}</p>`;

  if (kind === 'text' || kind === 'table') html += `<p class="ptd-selnote" id="ptd-selnote" aria-live="polite">${esc(selNoteText())}</p>`;
  if (kind === 'text' || kind === 'shape') {
    html += section('Text', kind === 'text' ? paraEditor(el, id) + `<p class="ptd-hint">Type to edit. With the cursor in this text, a field goes in at the cursor or replaces the selected words. New text takes the formatting of the text around it.</p>` : '<p class="ptd-hint">This shape has no text.</p>');
  }
  if (kind === 'picture') {
    const imgFields = scopeFields().filter((f) => f[2] === 'image');
    const img = c.image;
    html += section('Picture', field('Picture comes from', 'p-img', selectCtl('p-img', [['', 'This picture (no change)'], ...imgFields.map(([p, l]) => [p, l])], img && img.field))
      + (img ? field('Fit', 'p-fit', toggle('p-fit', [['contain', 'Fit inside'], ['cover', 'Fill and crop']], img.fit || 'contain'),
        img.fit === 'cover' ? 'Fills the frame; the edges of the picture may be cropped.' : 'The whole picture shows, centred in the frame.') : '<p class="ptd-hint">Or drag an image field onto the picture.</p>'));
  }
  if (kind === 'table') html += tablePanel(el, id, c.table);
  if (kind === 'chart') {
    const ch = c.chart;
    const src = ch ? SOURCES[ch.source] : null;
    html += section('Chart data', field('Data comes from', 'p-csrc', selectCtl('p-csrc', [['', 'The chart’s own data (no change)'], ...Object.keys(SOURCES).map((k) => [k, SOURCES[k].label])], ch && ch.source))
      + (ch ? field('One bar per', 'p-ccat', selectCtl('p-ccat', src.fields.filter((f) => f[2] === 'text').map(([f, l]) => [f, l]), ch.category))
        + field('Value', 'p-cagg', toggle('p-cagg', [['sum', 'Sum of'], ['count', 'Count']], ch.agg))
        + (ch.agg === 'sum' ? field('Field', 'p-cval', selectCtl('p-cval', src.fields.filter((f) => ['number', 'currency', 'percent'].includes(f[2])).map(([f, l]) => [f, l]), ch.value)) : '')
        + field('Order', 'p-csort', toggle('p-csort', [['none', 'As listed'], ['desc', 'Largest first']], ch.sort || 'none'))
        + chartPreview(ch) : '<p class="ptd-hint">The chart keeps its look: colours, labels and axes come from PowerPoint. Only the numbers change.</p>'));
  }
  if (kind === 'group') html += section('Group', '<p class="ptd-hint">Select the slide to see what’s inside the group. Text inside groups can be edited in PowerPoint with {{fields}} typed in.</p>');
  html += section('Visibility', condEditor('shc', c.showIf, scopeFields(c.table && c.table.source)));
  props.innerHTML = html;

  // wiring
  props.querySelectorAll('[data-para]').forEach((ta) => ta.addEventListener('input', () => {
    const [sid, i] = ta.dataset.para.split(':');
    const target = paragraphs(shapeById(slideDoc(), sid))[+i];
    if (target && setParaText(target, ta.value)) scheduleRefresh();
  }));
  props.querySelectorAll('[data-cell]').forEach((inp) => inp.addEventListener('input', () => {
    const [sid, r, ci] = inp.dataset.cell.split(':').map(Number);
    const tr = desc(shapeById(slideDoc(), String(sid)), NS.a, 'tr')[r];
    const p = paragraphs(kids(tr, NS.a, 'tc')[ci])[0];
    if (p && setParaText(p, inp.value)) scheduleRefresh();
  }));
  const on = (pid, fn) => { const e = $(pid); if (e) e.addEventListener('change', fn); };
  on('p-img', (e) => { cfg().image = e.target.value ? { field: e.target.value, fit: (c.image && c.image.fit) || 'contain' } : null; changed(); });
  props.querySelectorAll('input[name="p-fit"]').forEach((r) => r.addEventListener('change', () => { cfg().image.fit = r.value; changed(); }));
  if (kind === 'table') wireTable(el, id, cfg);
  on('p-csrc', (e) => {
    const k = e.target.value, sf = k && SOURCES[k].fields;
    const money = sf.filter((f) => f[2] === 'currency');   // totals usually come last
    cfg().chart = k ? { source: k, category: sf.find((f) => f[2] === 'text')[0], value: (money[money.length - 1] || sf.find((f) => f[2] === 'number'))[0], agg: 'sum', sort: 'none' } : null;
    changed();
  });
  on('p-ccat', (e) => { cfg().chart.category = e.target.value; changed(); });
  on('p-cval', (e) => { cfg().chart.value = e.target.value; changed(); });
  props.querySelectorAll('input[name="p-cagg"]').forEach((r) => r.addEventListener('change', () => { cfg().chart.agg = r.value; changed(); }));
  props.querySelectorAll('input[name="p-csort"]').forEach((r) => r.addEventListener('change', () => { cfg().chart.sort = r.value; changed(); }));
  bindCond('shc', () => cfg().showIf, (v) => { cfg().showIf = v; });
}
function chartPreview(ch) {
  const rec = RECORDS[st.recordIdx];
  const { cats, vals } = chartData(rec, ch);
  const vt = ch.agg === 'count' ? 'number' : (fieldMeta(SOURCES[ch.source].prefix + '.' + ch.value) || {}).type;
  return `<div class="ptd-card"><strong>For ${esc(rec.fields['Opportunity.Account.Name'])}</strong>${cats.map((c, i) => kv(esc(c || '(blank)'), esc(formatValue(vals[i], vt)))).join('')}</div>`;
}
/** A binding changed: redraw what shows it. Text edits use scheduleRefresh instead. */
function changed(rerender = true) {
  commit();
  drawOverlay();
  drawThumb(st.cur);
  if (rerender) renderProps();
}

/* ================================================================ insert panel: fields and related lists */
function fieldButton(path, label, type) {
  const ic = type === 'image' ? 'image-01' : type === 'date' ? 'calendar' : ['number', 'currency', 'percent'].includes(type) ? 'hash-01' : 'type-square';
  return `<li class="sd-insert-panel__row"><button class="sd-objects-menu-item sd-objects-menu-item--variable" type="button" draggable="true" data-field="${esc(path)}" title="${esc(tokenText(path))}"><span class="sd-objects-menu-item__content">${icon(ic, 'sd-objects-menu-item__icon')}<span class="sd-objects-menu-item__label">${esc(label)}</span></span></button></li>`;
}
/** The related list whose fields make sense right now: the slide's repeat, else the selected related-list table. */
function fieldContext() {
  if (st.mode !== 'design' || !st.pres) return null;
  const cfg = slideCfg(st.tpl, st.slides[st.cur].sldId);
  if (cfg && cfg.repeat) return { key: cfg.repeat.source, why: 'slide' };
  const info = st.sel && shapeInfo(st.sel);
  if (info && info.cfg.table) return { key: info.cfg.table.source, why: 'table' };
  return null;
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function fieldsHtml(ctx) {
  const group = (label, items, gi, extra = '') => `<div class="sd-insert-panel__group">
    <button class="sd-section-header" type="button" aria-expanded="true" aria-controls="ptd-fg-${gi}"><span class="sd-section-header__label">${esc(label)}</span>${icon('chevron-right', 'sd-section-header__chevron')}</button>
    ${extra}<ul class="sd-insert-panel__list" id="ptd-fg-${gi}">${items.map(([p, l, t]) => fieldButton(p, l, t)).join('')}</ul></div>`;
  let html = '';
  if (ctx) {
    const src = SOURCES[ctx.key], what = one(ctx.key);
    const note = ctx.why === 'slide' ? `This slide repeats for each ${what}. These fields change from copy to copy.` : `For the table’s repeating row: one row per ${what}.`;
    html += `<div class="ptd-scope">${group(`${cap(what)} fields`, src.fields.map(([f, l, t]) => [src.prefix + '.' + f, l, t]), 'l', `<p class="ptd-scope__note">${esc(note)}</p>`)}</div>`;
  }
  const groups = [['Opportunity', FIELDS.filter((f) => f[0].split('.').length === 2 && f[0].startsWith('Opportunity.'))],
    ['Account', FIELDS.filter((f) => f[0].startsWith('Opportunity.Account.'))], ['Owner', FIELDS.filter((f) => f[0].startsWith('Opportunity.Owner.'))],
    ['Other', FIELDS.filter((f) => f[0].startsWith('System.'))]];
  html += groups.map(([label, items], gi) => group(label, items, gi)).join('');
  if (!ctx) {
    html += `<div class="ptd-pane-note"><span>Need fields from a related list, like line items? Make this slide repeat once per record, or add a related-list table.</span>
      <button class="sd-button sd-button--md sd-button--secondary" type="button" data-repeat-prompt>${icon('copy-05', 'sd-button__icon')}Repeat this slide for each…</button></div>`;
  }
  return html + '<p class="sd-insert-panel__empty" hidden>No fields match that search.</p>';
}
/** Re-draw Fields for the current slide and selection, keeping any search. */
function refreshFieldsPane() {
  const body = document.querySelector('[data-ptd-fill="fields"]');
  if (!body) return;
  const ctx = fieldContext(), sig = ctx ? ctx.key + ctx.why : '';
  if (body.dataset.ctx === sig && body.dataset.filled) return;
  body.dataset.ctx = sig; body.dataset.filled = '1';
  body.innerHTML = fieldsHtml(ctx);
  const q = body.closest('.sd-insert-panel__panel').querySelector('.sd-search-field__input');
  if (q && q.value) q.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------------------------------------------------------------- repeat this slide */
/** Right panel: Don't repeat / Repeat. Repeat asks for the related list; nothing repeats until one is chosen. */
function repeatControls(s, sCfg) {
  const key = sCfg.repeat && sCfg.repeat.source;
  const on = !!key || st.repeatPending === s.sldId;
  let html = field('This slide', 'p-rpt', toggle('p-rpt', [['no', 'Don’t repeat'], ['yes', 'Repeat']], on ? 'yes' : 'no'));
  if (!on) return html + '<p class="ptd-hint">Repeat makes one copy of this slide per related record, for example one slide per product.</p>';
  const rec = RECORDS[st.recordIdx];
  const n = key ? selectRecords(rec, key, sCfg.repeat).length : 0;
  return html + field('For each', 'p-repeat', selectCtl('p-repeat', [...(key ? [] : [['', 'Choose a related list…']]), ...Object.keys(SOURCES).map((k) => [k, cap(one(k))])], key || ''),
    key ? `One slide per ${esc(one(key))}: ${n} for ${esc(rec.fields['Opportunity.Account.Name'])} (sample). With none, the slide is left out. ${esc(cap(one(key)))} fields are now at the top of Fields.`
      : 'Choose which records get a slide each. Their fields then appear in Fields, next to the Opportunity’s.');
}
function wireRepeat(s, sCfg) {
  $('ptd-props').querySelectorAll('input[name="p-rpt"]').forEach((r) => r.addEventListener('change', () => {
    if (r.value === 'yes') {
      st.repeatPending = s.sldId;
      renderProps();
      const sel = $('p-repeat');
      if (sel) { sel.focus(); try { sel.showPicker(); } catch (err) { /* focus is enough where showPicker isn't allowed */ } }
    } else {
      st.repeatPending = null;
      if (sCfg.repeat) setRepeat(null); else renderProps();
    }
  }));
  const sel = $('p-repeat');
  if (sel) sel.addEventListener('change', () => { if (sel.value) { st.repeatPending = null; setRepeat(sel.value); } });
}
/** Above the slide: a status line while the slide repeats (and in Preview, where a copy came from). */
function renderSlideBar() {
  const bar = $('ptd-slidebar');
  if (!st.pres) return;
  if (st.mode === 'preview') {
    const m = st.preview && st.preview.map[st.cur];
    bar.hidden = !m || m.of < 2;
    bar.innerHTML = m ? `<span class="ptd-slidebar__name">Slide ${st.cur + 1}</span><span class="ptd-slidebar__status">From template slide ${m.from}, copy ${m.n} of ${m.of}</span>` : '';
    return;
  }
  const cfg = slideCfg(st.tpl, st.slides[st.cur].sldId) || {};
  const key = cfg.repeat && cfg.repeat.source;
  bar.hidden = !key;
  if (!key) { bar.innerHTML = ''; return; }
  const rec = RECORDS[st.recordIdx];
  bar.innerHTML = `<span class="ptd-slidebar__name">Slide ${st.cur + 1}</span>
    <span class="ptd-slidebar__status"><span class="ptd-tag">${icon('copy-05')}One slide per ${esc(one(key))}</span>${selectRecords(rec, key, cfg.repeat).length} for ${esc(rec.fields['Opportunity.Account.Name'])} (sample)</span>
    <button class="sd-text-link sd-text-link--semibold" type="button" data-repeat-prompt><span class="sd-text-link__label">Change</span></button>`;
}
function setRepeat(key) {
  const s = st.slides[st.cur];
  slideCfg(st.tpl, s.sldId, true).repeat = key ? { source: key } : null;
  changed();
  renderSlideBar();
  if (key) {
    openPane('fields');
    toast(`Slide ${st.cur + 1} now repeats for each ${one(key)}. ${cap(one(key))} fields are at the top of Fields: select text on the slide, then click one to replace it.`);
  }
}

function relatedHtml() {
  return '<div class="sd-insert-panel__group"><ul class="sd-insert-panel__list">' + Object.keys(SOURCES).map((k) => {
    const src = SOURCES[k];
    return `<li class="sd-insert-panel__row"><button class="sd-objects-menu-item" type="button" draggable="true" data-insert-list="${k}"><span class="sd-objects-menu-item__content">${icon('table', 'sd-objects-menu-item__icon')}<span class="sd-objects-menu-item__label">${esc(src.label)}<span class="ptd-related-meta">Table · ${src.defaults.length} columns to start</span></span></span></button></li>`;
  }).join('') + '</ul></div>';
}
function fillPanes() {
  refreshFieldsPane();
  const rel = document.querySelector('[data-ptd-fill="related"]');
  if (rel && !rel.dataset.filled) { rel.dataset.filled = '1'; rel.innerHTML = relatedHtml(); }
}
new MutationObserver((muts) => { if (muts.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches('[data-ptd-fill]') || n.querySelector('[data-ptd-fill]'))))) fillPanes(); })
  .observe(document.querySelector('.sd-insert-panel__panel'), { childList: true, subtree: true });
function openPane(name) {
  const b = document.querySelector(`[data-sd-open="${name}"]`);
  if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  fillPanes();
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-field]'); if (f) return insertField(f.dataset.field);
  const l = e.target.closest('[data-insert-list]'); if (l) return insertListTable(l.dataset.insertList);
  if (e.target.closest('[data-repeat-prompt]')) {
    if (st.sel) select(null);
    const yes = $('ptd-props').querySelector('input[name="p-rpt"][value="yes"]');
    const t = yes && (yes.checked ? $('p-repeat') : yes);
    if (t) { t.focus(); t.scrollIntoView({ block: 'nearest' }); }
  }
});

/* ================================================================ related-list tables */
const listFields = (key) => SOURCES[key].fields.filter((f) => f[2] !== 'image');
const fieldLabel = (key, f) => (SOURCES[key].fields.find((x) => x[0] === f) || [f, f])[1];

/** Where a new table goes: the first empty band at least two rows tall below the title, else under the title. Slide pixels. */
function freeSpot() {
  const pres = st.pres, W = pres.width, H = pres.height, NEED = 100, bottom = H * 0.88;
  const nodes = pres.slides[st.cur].nodes || [];
  const title = nodes.find((n) => n.placeholder && /title/i.test(n.placeholder.type || ''));
  const top = title ? title.position.y + title.size.h + 16 : 120;
  const others = nodes.filter((n) => n !== title && n.position.y + n.size.h > top && n.position.y < bottom && n.size.w < W * 0.98)
    .sort((a, b) => a.position.y - b.position.y);
  const x = title ? title.position.x : 48, w = title ? title.size.w : W - 96;
  let cursor = top;
  for (const n of others) {
    if (n.position.y - cursor >= NEED) break;
    cursor = Math.max(cursor, n.position.y + n.size.h + 16);
  }
  if (bottom - cursor >= NEED || others.every((n) => n.position.y - cursor >= NEED)) return { x, y: cursor, w, fits: true };
  return { x, y: top, w, fits: false };
}
async function insertListTable(key, at) {
  if (st.mode !== 'design') return toast('Switch back from Preview to edit the template.');
  const src = SOURCES[key];
  const spot = at ? { x: at.x, y: at.y, w: Math.min(st.pres.width * 0.8, st.pres.width - at.x - 40), fits: true } : freeSpot();
  const cols = src.defaults.map((f) => ({ label: fieldLabel(key, f), token: tokenText(src.prefix + '.' + f) }));
  const id = insertTable(slideDoc(), { x: spot.x * EMU_PER_PX, y: spot.y * EMU_PER_PX, cx: Math.max(200, spot.w) * EMU_PER_PX }, src.label, cols);
  shapeCfg(st.tpl, st.slides[st.cur].sldId, id, src.label, true).table = { source: key, row: 1, maxRows: 0, repeatHeader: true, ifEmpty: 'header' };
  commit();
  await rebuild({ thumb: st.cur });
  select(id);
  toast(spot.fits ? `Added a table of ${src.label.toLowerCase()}. Choose its columns and which records it shows on the right.`
    : 'Added the table over other content: there was no free space on this slide. Drag the related list onto the slide to place it, or move it in PowerPoint.');
}

function colsOf(el, t) { return columns(el, t, SOURCES[t.source].prefix); }

function tablePanel(el, id, t) {
  const rows = desc(el, NS.a, 'tr');
  const srcCtl = field('Rows come from', 'p-tsrc', selectCtl('p-tsrc', [['', 'Nothing (a fixed table)'], ...Object.keys(SOURCES).map((k) => [k, SOURCES[k].label])], t && t.source),
    t ? '' : 'Pick a related list to make a row repeat once per record. The row above it stays as the header.');
  const grid = section(t ? 'All cells' : 'Cells', `<table class="ptd-grid"><tbody>${rows.map((tr, r) => `<tr class="${t && +t.row === r ? 'is-repeat' : ''}"><th scope="row">${r + 1}</th>${kids(tr, NS.a, 'tc').map((tc, ci) => {
    const p = paragraphs(tc)[0];
    return `<td><input type="text" value="${esc(p ? paraText(p) : '')}" data-cell="${id}:${r}:${ci}" aria-label="Row ${r + 1}, column ${ci + 1}"></td>`;
  }).join('')}</tr>`).join('')}</tbody></table><p class="ptd-hint">${t ? 'The highlighted row repeats. Rows above it are headers; rows below come once, after the last record (for totals).' : 'Type in a cell, or click into one on the slide and pick a field.'}</p>`);
  if (!t) return section('Related list', srcCtl) + grid;

  const key = t.source, cols = colsOf(el, t), fields = listFields(key);
  const merged = hasMerges(el);
  const used = new Set(cols.map((c) => c.field));
  const colRows = cols.map((c, i) => `<li class="ptd-col">
      <span class="ptd-col__n">${i + 1}</span>
      ${t.row > 0 ? `<input class="ptd-col__head" type="text" value="${esc(c.header)}" data-colhead="${i}" aria-label="Column ${i + 1} heading">` : '<span></span>'}
      <span class="ptd-col__tools">
        <button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-colmove="${i}:-1" aria-label="Move column ${i + 1} left"${i ? '' : ' disabled'}>${icon('arrow-left', 'sd-icon-button__icon')}</button>
        <button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-colmove="${i}:1" aria-label="Move column ${i + 1} right"${i < cols.length - 1 ? '' : ' disabled'}>${icon('arrow-right', 'sd-icon-button__icon')}</button>
        <button class="sd-icon-button sd-icon-button--sm sd-icon-button--tertiary" type="button" data-coldel="${i}" aria-label="Remove column ${i + 1}"${cols.length > 1 ? '' : ' disabled'}>${icon('trash-01', 'sd-icon-button__icon')}</button>
      </span>
      <div class="sd-field__control ptd-col__field">${selectCtl('p-colf-' + i, [...(c.field ? [] : [['', `Other text: ${c.text || 'empty'}`]]), ...fields.map(([f, l]) => [f, l])], c.field || '', `data-colfield="${i}" aria-label="Column ${i + 1} field"`)}</div>
    </li>`).join('');
  const free = fields.filter(([f]) => !used.has(f));
  const columnsHtml = merged ? '<p class="ptd-hint">This table has merged cells, so its columns can only be changed in PowerPoint. You can still set which records it shows.</p>'
    : `<ol class="ptd-cols">${colRows}</ol>` + (free.length ? `<div class="ptd-pane-row"><div class="sd-field__control">${selectCtl('p-coladd', free.map(([f, l]) => [f, l]), free[0][0], 'aria-label="Field for the new column"')}</div><button class="sd-button sd-button--md sd-button--secondary" type="button" id="p-coladd-btn">${icon('plus', 'sd-button__icon')}Add column</button></div>` : '');

  const fl = t.filter;
  const filterHtml = field('Show', 'p-tfshow', toggle('p-tfshow', [['all', 'All records'], ['when', 'Only where…']], fl ? 'when' : 'all'))
    + (fl ? `<div class="ptd-cond">${field('Field', 'p-tff', selectCtl('p-tff', fields.map(([f, l]) => [f, l]), fl.field))}${field('Condition', 'p-tfo', selectCtl('p-tfo', OPS, fl.op))}${fl.op === 'blank' || fl.op === 'notblank' ? '' : field('Value', 'p-tfv', `<input id="p-tfv" type="text" value="${esc(fl.value)}">`)}</div>` : '');
  const sortHtml = field('Sort by', 'p-tsort', selectCtl('p-tsort', [['', 'As in Salesforce'], ...fields.map(([f, l]) => [f, l])], t.sort && t.sort.field))
    + (t.sort ? field('Order', 'p-tdir', toggle('p-tdir', [['asc', 'Ascending'], ['desc', 'Descending']], t.sort.dir || 'asc')) : '');
  const limitHtml = field('Limit', 'p-tlimit', `<input id="p-tlimit" type="number" min="1" step="1" value="${esc(t.limit || '')}" placeholder="All">`, 'The most records to show. Leave blank for all.');
  const count = selectRecords(RECORDS[st.recordIdx], key, t).length;

  return section('Related list', srcCtl + `<p class="ptd-hint">${count} of ${(RECORDS[st.recordIdx].lists[key] || []).length} ${esc(SOURCES[key].label.toLowerCase())} on the sample record ${esc(RECORDS[st.recordIdx].fields['Opportunity.Account.Name'])} match.</p>`)
    + section('Columns', columnsHtml)
    + section('Which records', filterHtml + sortHtml + limitHtml)
    + section('Layout', field('Rows per slide', 'p-tmax', `<input id="p-tmax" type="number" min="0" step="1" value="${esc(t.maxRows || '')}" placeholder="No limit">`, 'Past this many, the table continues on a copy of the slide.')
      + (t.row > 0 ? field('Heading on every slide', 'p-thead', toggle('p-thead', [['1', 'Yes'], ['0', 'No']], t.repeatHeader === false ? '0' : '1')) : '')
      + field('Header row style', 'p-tfirst', toggle('p-tfirst', [['1', 'On'], ['0', 'Off']], styleFlag(el, 'firstRow') ? '1' : '0'))
      + field('Banded rows', 'p-tband', toggle('p-tband', [['1', 'On'], ['0', 'Off']], styleFlag(el, 'bandRow') ? '1' : '0'), 'Colours come from the table’s PowerPoint style.'))
    + section('If there are no records', field('Then', 'p-tempty', selectCtl('p-tempty', [['header', 'Show the heading only'], ['hide', 'Hide the table'], ['slide', 'Leave out the slide']], t.ifEmpty || 'header')))
    + grid;
}

function wireTable(el, id, cfg) {
  const props = $('ptd-props');
  const on = (pid, ev, fn) => { const e = $(pid); if (e) e.addEventListener(ev, fn); };
  const t = () => cfg().table;
  const xmlChanged = () => { commit(); return rebuild({ thumb: st.cur }).then(() => { drawOverlay(); renderProps(); }); };
  const radios = (name, fn) => props.querySelectorAll(`input[name="${name}"]`).forEach((r) => r.addEventListener('change', () => fn(r.value)));
  on('p-tsrc', 'change', (e) => {
    const n = desc(el, NS.a, 'tr').length;
    cfg().table = e.target.value ? { source: e.target.value, row: Math.min(1, n - 1), maxRows: 0, repeatHeader: true, ifEmpty: 'header' } : null;
    changed();
  });
  if (!t()) return;
  const prefix = SOURCES[t().source].prefix;
  props.querySelectorAll('[data-colhead]').forEach((inp) => inp.addEventListener('input', () => { setHeader(el, t(), +inp.dataset.colhead, inp.value); scheduleRefresh(); }));
  props.querySelectorAll('[data-colfield]').forEach((sel) => sel.addEventListener('change', () => {
    const i = +sel.dataset.colfield, old = colsOf(el, t())[i];
    setColumnField(el, t(), prefix, i, sel.value, fieldLabel(t().source, sel.value), old.field ? fieldLabel(t().source, old.field) : null);
    xmlChanged();
  }));
  props.querySelectorAll('[data-colmove]').forEach((b) => b.addEventListener('click', () => { const [i, d] = b.dataset.colmove.split(':').map(Number); moveColumn(el, i, i + d); xmlChanged(); }));
  props.querySelectorAll('[data-coldel]').forEach((b) => b.addEventListener('click', () => { removeColumn(el, +b.dataset.coldel); xmlChanged(); }));
  on('p-coladd-btn', 'click', () => { const f = $('p-coladd').value; addColumn(el, t(), prefix, f, fieldLabel(t().source, f)); xmlChanged(); });
  radios('p-tfshow', (v) => { t().filter = v === 'when' ? { field: listFields(t().source)[0][0], op: 'gt', value: 0 } : null; changed(); });
  on('p-tff', 'change', (e) => { t().filter.field = e.target.value; changed(); });
  on('p-tfo', 'change', (e) => { t().filter.op = e.target.value; changed(); });
  on('p-tfv', 'change', (e) => { t().filter.value = e.target.value; changed(); });
  on('p-tsort', 'change', (e) => { t().sort = e.target.value ? { field: e.target.value, dir: (t().sort && t().sort.dir) || 'asc' } : null; changed(); });
  radios('p-tdir', (v) => { t().sort.dir = v; changed(false); });
  on('p-tlimit', 'change', (e) => { t().limit = Math.max(0, parseInt(e.target.value, 10) || 0) || null; changed(); });
  on('p-tmax', 'change', (e) => { t().maxRows = Math.max(0, parseInt(e.target.value, 10) || 0); changed(false); });
  radios('p-thead', (v) => { t().repeatHeader = v === '1'; changed(false); });
  radios('p-tfirst', (v) => { setStyleFlag(el, 'firstRow', v === '1'); xmlChanged(); });
  radios('p-tband', (v) => { setStyleFlag(el, 'bandRow', v === '1'); xmlChanged(); });
  on('p-tempty', 'change', (e) => { t().ifEmpty = e.target.value; changed(false); });
}

/* remember where the caret was in the panel's text, so clicking a field inserts there */
['focusin', 'keyup', 'mouseup', 'select', 'input'].forEach((ev) => $('ptd-props').addEventListener(ev, (e) => {
  const t = e.target;
  if (t.matches && t.matches('[data-para], [data-cell]')) {
    st.lastInput = { el: t, start: t.selectionStart, end: t.selectionEnd };
    if (st.canvasSel) { st.canvasSel = null; showSelNote(); }
  }
}));
function insertField(path) {
  if (st.mode !== 'design') return toast('Switch back from Preview to edit the template.');
  const m = fieldMeta(path);
  const info = st.sel && shapeInfo(st.sel);
  if (m && m.type === 'image') {
    if (info && info.kind === 'picture') { shapeCfg(st.tpl, st.slides[st.cur].sldId, st.sel, info.rawName, true).image = { field: path, fit: 'contain' }; changed(); return; }
    return toast('Image fields go on pictures. Select a picture on the slide first.');
  }
  const cs = st.canvasSel;
  if (cs && cs.shapeId === st.sel && info) {
    if (cs.multi) return toast('Select text inside one paragraph or cell, then click the field.');
    if (cs.unmapped) return toast('That selection couldn’t be matched to the text. Nothing was changed: select the words in the text on the right instead.');
    if (!cs.collapsed) spliceText(cs.p, cs.start, cs.end, tokenText(path));
    else if (info.kind === 'table') spliceText(cs.p, 0, paraText(cs.p).length, tokenText(path));
    else replaceAllText(info.el, path);
    return afterTextChange();
  }
  const li = st.lastInput;
  if (li && document.contains(li.el)) {
    const tok = tokenText(path);
    const v = li.el.value;
    li.el.value = v.slice(0, li.start) + tok + v.slice(li.end);
    const caret = li.start + tok.length;
    li.el.focus(); li.el.setSelectionRange(caret, caret);
    li.el.dispatchEvent(new Event('input', { bubbles: true }));
    st.lastInput = { el: li.el, start: caret, end: caret };
    return;
  }
  if (info && info.kind === 'text') { replaceAllText(info.el, path); return afterTextChange(); }
  if (info && info.kind === 'table') return toast('Click into a cell on the slide first, then click the field.');
  toast('Select a text box on the slide first, then click the field.');
}
/** The field replaces all of the shape's text, in the formatting of its first run; other paragraphs go. */
function replaceAllText(el, path) {
  const ps = paragraphs(el);
  spliceText(ps[0], 0, paraText(ps[0]).length, tokenText(path));
  ps.slice(1).forEach((p) => p.parentNode.removeChild(p));
}
function afterTextChange() {
  commit();
  st.canvasSel = null;
  const ds = getSelection(); if (ds) ds.removeAllRanges();
  rebuild({ thumb: st.cur }).then(renderProps);
}

/* drag a field onto a shape */
document.addEventListener('dragstart', (e) => {
  const l = e.target.closest && e.target.closest('[data-insert-list]');
  if (l) { e.dataTransfer.setData('application/x-sdocs-list', l.dataset.insertList); e.dataTransfer.effectAllowed = 'copy'; return; }
  const f = e.target.closest && e.target.closest('[data-field]'); if (!f) return;
  e.dataTransfer.setData('text/plain', tokenText(f.dataset.field));
  e.dataTransfer.setData('application/x-sdocs-field', f.dataset.field);
  e.dataTransfer.effectAllowed = 'copy';
});
const stageEl = $('ptd-stage');
function dropTarget(e) {
  if (st.mode !== 'design') return null;
  const id = hitTest(e.clientX, e.clientY);
  const info = id && shapeInfo(id);
  return info && ['text', 'picture', 'table'].includes(info.kind) ? Object.assign({ id }, info) : null;
}
function markDrop(id) { $('ptd-overlay').querySelectorAll('.ptd-hot').forEach((b) => b.classList.toggle('is-drop', b.dataset.id === id)); }
stageEl.addEventListener('dragover', (e) => {
  if (e.dataTransfer.types.includes('application/x-sdocs-list') && st.mode === 'design') { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; return; }
  if (!e.dataTransfer.types.includes('application/x-sdocs-field')) return;
  const t = dropTarget(e);
  markDrop(t && t.id);
  if (t) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
});
stageEl.addEventListener('dragleave', (e) => { if (!stageEl.contains(e.relatedTarget)) markDrop(null); });
stageEl.addEventListener('drop', (e) => {
  const list = e.dataTransfer.getData('application/x-sdocs-list');
  if (list) {
    e.preventDefault();
    const r = stageEl.getBoundingClientRect();
    insertListTable(list, { x: (e.clientX - r.left) / st.scale, y: (e.clientY - r.top) / st.scale });
    return;
  }
  const path = e.dataTransfer.getData('application/x-sdocs-field');
  const t = dropTarget(e);
  markDrop(null);
  if (!path || !t) return;
  e.preventDefault();
  if (t.id !== st.sel) select(t.id);
  const m = fieldMeta(path);
  if (t.kind === 'picture') {
    if (!m || m.type !== 'image') return toast('Only image fields can go on a picture.');
    shapeCfg(st.tpl, st.slides[st.cur].sldId, t.id, t.rawName, true).image = { field: path, fit: 'contain' }; changed();
    return;
  }
  if (m && m.type === 'image') return toast('Image fields go on pictures.');
  if (t.kind === 'text') { replaceAllText(t.el, path); return afterTextChange(); }
  const el = selEl();
  const p = el && paragraphAt(el, paragraphs(t.el), e.clientX, e.clientY);
  if (!p) return toast('Drop the field onto a cell.');
  spliceText(p, 0, paraText(p).length, tokenText(path));
  afterTextChange();
});

/* ================================================================ preview */
const resolveImage = async (key) => { const b64 = ASSETS.images[String(key).replace(/^img:/, '')]; return b64 ? base64ToBytes(b64) : null; };

async function runPreview() {
  const rec = RECORDS[st.recordIdx];
  const t0 = performance.now();
  const tpl = compact(clone(st.tpl));
  const res = await generate(st.designBytes, tpl, rec, { JSZip, resolveImage });
  const ms = Math.round(performance.now() - t0);
  const pres = buildPresentation(await parseZip(res.bytes.buffer.slice(0), RECOMMENDED_ZIP_LIMITS));
  const map = [];
  res.log.forEach((l, ti) => { for (let k = 0; k < l.out; k++) map.push({ from: ti + 1, n: k + 1, of: l.out }); });
  st.preview = { bytes: res.bytes, pres, log: res.log, warnings: res.warnings, media: res.mediaParts, ms, map, record: rec, templateSlides: res.log.length };
  st.cur = Math.min(st.cur, pres.slides.length - 1);
  $('ptd-banner-text').textContent = `Preview with sample data from ${rec.fields['Opportunity.Account.Name']}: the ${res.log.length} template slides become ${pres.slides.length}. Read only.`;
}
async function setMode(mode) {
  if (st.busy) return;
  st.busy = true;
  try {
    st.mode = mode; st.sel = null;
    if (mode === 'preview') { st.previewReturn = st.cur; st.cur = 0; await runPreview(); }
    else { st.cur = Math.min(st.previewReturn || 0, st.slides.length - 1); }
    syncModeUi();
    drawStrip(); drawStage(); renderProps();
  } finally { st.busy = false; }
}
function syncModeUi() {
  const pv = st.mode === 'preview';
  $('ptd-root').dataset.mode = st.mode;
  $('ptd-banner').hidden = !pv;
  $('ptd-record-wrap').hidden = !pv;
  $('ptd-preview').setAttribute('aria-pressed', String(pv));
  $('ptd-preview-label').textContent = pv ? 'Back to design' : 'Preview';
  if (hist.stack.length) syncUndo();
}
function renderPreviewProps() {
  const p = st.preview;
  $('ptd-props-title').textContent = 'Preview';
  $('ptd-props').innerHTML =
    section('Sample data', kv('Record', esc(p.record.label)) + kv('Slides', `${p.pres.slides.length} from ${p.templateSlides}`)
      + '<p class="ptd-hint">Preview shows how the template expands for one record. Documents are generated from the record later, in the generation flow.</p>'
      + (p.warnings.length ? `<ul class="ptd-issues">${p.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''))
    + section('Slide by slide', `<table class="ptd-log"><thead><tr><th scope="col">Template slide</th><th scope="col">Slides</th><th scope="col">Why</th></tr></thead><tbody>${p.log.map((l, i) => `<tr><td>${i + 1}</td><td>${l.out}</td><td>${esc(l.note || '')}</td></tr>`).join('')}</tbody></table>`);
}

/* ================================================================ masthead + upload */
$('ptd-preview').addEventListener('click', () => setMode(st.mode === 'preview' ? 'design' : 'preview'));
$('ptd-record').innerHTML = RECORDS.map((r, i) => `<option value="${i}">${esc(r.label)}</option>`).join('');
$('ptd-record').addEventListener('change', async (e) => { st.recordIdx = +e.target.value; if (st.mode === 'preview') { await runPreview(); drawStrip(); drawStage(); renderProps(); } });
$('ptd-template-download').addEventListener('click', () => download(st.designBytes, st.fileName.replace(/\.pptx$/i, '') + ' (template).pptx'));
$('ptd-publish').addEventListener('click', () => toast('In S-Docs, Publish saves the .pptx with its merge fields and the template JSON. This prototype doesn’t save anything.'));
async function loadExample(quiet) {
  await loadDeck(base64ToBytes(ASSETS.deck), SAMPLE_NAME);
  await applyExampleDesign(st.pkg, st.tpl);
  await rebuild({ all: true }); resetHistory(); renderProps();
  if (!quiet) toast('Loaded the finished design: fields, a related-list table, a repeating slide, a chart, pictures and conditions. Try Preview.');
}
$('ptd-example').addEventListener('click', () => {
  if (st.fileName !== SAMPLE_NAME) return toast('The finished example is for the sample proposal. Upload that deck first.');
  loadExample();
});
$('ptd-replace').addEventListener('click', () => { st.replacing = true; $('ptd-file').click(); });
$('ptd-choose').addEventListener('click', () => { st.replacing = false; $('ptd-file').click(); });
$('ptd-sample').addEventListener('click', () => loadDeck(base64ToBytes(ASSETS.deck), SAMPLE_NAME));
$('ptd-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (f) await openFile(f, st.replacing);
});
async function openFile(f, replacing) {
  if (!/\.pptx$/i.test(f.name)) return toast('Choose a PowerPoint .pptx file. Older .ppt files need to be saved as .pptx first.');
  await loadDeck(new Uint8Array(await f.arrayBuffer()), f.name, { keepTemplate: replacing });
  renderProps();
}
const drop = $('ptd-drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) openFile(f, false); });

/* template JSON drawer */
/** Fill the drawer from the current template. Called on open and after every change while it's open. */
function renderJson() {
  if ($('ptd-drawer').hidden || !st.pkg) return;
  const tpl = compact(clone(st.tpl));
  const rows = [];
  st.slides.forEach((s, i) => {
    const doc = slideDoc(i);
    const byShape = new Map();
    for (const t of slideTokens(doc)) {
      if (!byShape.has(t.shape)) byShape.set(t.shape, []);
      byShape.get(t.shape).push(tokenText(t.path, t.fmt));
    }
    for (const [id, toks] of byShape) {
      const el = shapeById(doc, id);
      rows.push(`<li><span>Slide ${i + 1} · ${esc(el ? displayName(el) : 'shape ' + id)}</span><span>${toks.map((t) => `<code>${esc(t)}</code>`).join(' ')}</span></li>`);
    }
  });
  const nSlides = Object.keys(tpl.slides).length, nFields = rows.reduce((a, r) => a + (r.match(/<code>/g) || []).length, 0);
  $('ptd-json').textContent = JSON.stringify(tpl, null, 2);
  $('ptd-json-fields').innerHTML = rows.length ? `<ul class="ptd-drawer__fields">${rows.join('')}</ul>` : '<p class="ptd-hint">No merge fields yet.</p>';
  $('ptd-drawer-sub').textContent = `${nSlides} slide${nSlides === 1 ? '' : 's'} with structural bindings · ${nFields} merge field${nFields === 1 ? '' : 's'} in the .pptx text`;
}
function openJson() { $('ptd-drawer').hidden = false; renderJson(); $('ptd-json-close').focus(); }
$('ptd-json-open').addEventListener('click', openJson);
$('ptd-json-close').addEventListener('click', () => { $('ptd-drawer').hidden = true; $('ptd-json-open').focus(); });
$('ptd-json-copy').addEventListener('click', () => { navigator.clipboard.writeText($('ptd-json').textContent).then(() => toast('Copied.'), () => toast('Copy isn’t allowed here; select the text instead.')); });

function download(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
let toastTimer = null;
function toast(msg) {
  const t = $('ptd-toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5200);
}

/* ================================================================ walkthrough hooks (tour.js) */
function resetToUpload() {
  $('ptd-drawer').hidden = true;
  Object.assign(st, { mode: 'design', pkg: null, tpl: null, pres: null, slides: [], cur: 0, sel: null, preview: null, fileName: '', canvasSel: null, lastInput: null, repeatPending: null });
  hist.stack = []; hist.at = -1;
  $('ptd-root').dataset.stage = 'upload';
  $('ptd-upload').hidden = false; $('ptd-work').hidden = true;
  $('ptd-title').textContent = 'New PowerPoint template';
  syncModeUi();
}
const shapeIdByName = (i, name) => { const el = shapeElements(slideDoc(i)).find((e) => displayName(e) === name || attr(cNvPr(e), 'name') === name); return el ? attr(cNvPr(el), 'id') : null; };
const paraTextsOf = (i, name) => { const id = shapeIdByName(i, name); return id ? paragraphs(shapeById(slideDoc(i), id)).map(paraText) : []; };
const api = {
  st,
  loaded: () => !!st.pkg,
  resetToUpload,
  loadSample: () => loadDeck(base64ToBytes(ASSETS.deck), SAMPLE_NAME),
  loadExample: () => loadExample(true),
  goSlide: (i) => { if (st.mode !== 'design') setMode('design'); goSlide(i); },
  openPane,
  hot: (name) => [...document.querySelectorAll('.ptd-hot')].find((b) => (b.getAttribute('aria-label') || '').endsWith(': ' + name)),
  selected: () => (st.sel && st.pkg && shapeInfo(st.sel) ? shapeInfo(st.sel).name : null),
  deselect: () => select(null),
  selectByName: (name) => { const id = shapeIdByName(st.cur, name); if (id) select(id); },
  paraTexts: paraTextsOf,
  textHas: (i, name, s) => paraTextsOf(i, name).join('\n').includes(s),
  /** "Show me": put a field in place of some words (or all the text) of a named shape. */
  replaceIn(i, name, literal, path) {
    if (st.cur !== i) goSlide(i);
    const id = shapeIdByName(i, name); if (!id) return;
    select(id);
    const el = shapeById(slideDoc(i), id);
    if (literal == null) { replaceAllText(el, path); return afterTextChange(); }
    for (const p of paragraphs(el)) {
      const at = paraText(p).indexOf(literal);
      if (at >= 0) { spliceText(p, at, at + literal.length, tokenText(path)); return afterTextChange(); }
    }
  },
  slide: (i) => (st.slides[i] ? slideCfg(st.tpl, st.slides[i].sldId) || {} : {}),
  shape: (i, name) => { const id = shapeIdByName(i, name); return id ? shapeCfg(st.tpl, st.slides[i].sldId, id) || {} : {}; },
  table: (i) => { const c = api.slide(i); const e = Object.entries(c.shapes || {}).find(([, v]) => v.table); return e ? { id: e[0], cfg: e[1].table } : null; },
  tableColumns: (i) => { const t = api.table(i); if (!t) return []; const el = shapeById(slideDoc(i), t.id); return colsOf(el, t.cfg).map((c) => c.field); },
  insertList: (key) => insertListTable(key),
  addColumn(field) {
    const t = api.table(st.cur); if (!t) return;
    if (st.sel !== t.id) select(t.id);
    addColumn(shapeById(slideDoc(), t.id), t.cfg, SOURCES[t.cfg.source].prefix, field, fieldLabel(t.cfg.source, field));
    commit(); rebuild({ thumb: st.cur }).then(() => { drawOverlay(); renderProps(); });
  },
  setTable(patch) { const t = api.table(st.cur); if (!t) return; if (st.sel !== t.id) select(t.id); Object.assign(t.cfg, patch); changed(); },
  repeatOn() { if (st.sel) select(null); st.repeatPending = st.slides[st.cur].sldId; renderProps(); },
  setRepeat: (key) => { if (st.sel) select(null); st.repeatPending = null; setRepeat(key); },
  setShapeCfg(name, patch) { const id = shapeIdByName(st.cur, name); if (!id) return; if (st.sel !== id) select(id); Object.assign(shapeCfg(st.tpl, st.slides[st.cur].sldId, id, attr(cNvPr(shapeById(slideDoc(), id)), 'name'), true), patch); changed(); },
  setSlideCfg(patch) { if (st.sel) select(null); Object.assign(slideCfg(st.tpl, st.slides[st.cur].sldId, true), patch); changed(); },
  setMode: (m) => setMode(m),
  setRecord: async (i) => { st.recordIdx = i; $('ptd-record').value = String(i); if (st.mode === 'preview') { await runPreview(); drawStrip(); drawStage(); renderProps(); } },
  jsonOpen: () => !$('ptd-drawer').hidden,
  openJson,
  closeJson: () => { $('ptd-drawer').hidden = true; }
};
window.ptdApi = api;
startTour(api);
