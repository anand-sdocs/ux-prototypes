// The generator: template .pptx + template JSON + one record → a new .pptx.
// This is the JavaScript stand-in for the Apex generator. The designer runs it for Preview; the package would run the
// Apex port. Every step is a local edit of existing parts, in this order per slide:
//   1. drop the slide if its showIf is false
//   2. work out instances: one per related record (repeat), times one per table page (table maxRows)
//   3. clone the pristine slide part for every instance after the first (charts are cloned with it)
//   4. per instance: hide shapes, fill tables, swap pictures, feed charts, repeat bullet paragraphs, replace tokens
// Pictures are added once per distinct image and shared by every slide that shows it.
import { NS, REL, Pkg, kids, kid, path, desc, attr, shapeById, serializeXml, parseXml, imageInfo, relsPathFor } from './ooxml.js';
import { paragraphs, paraText, findTokens, replaceTokens } from './text.js';
import { evalCond } from './template.js';
import { SOURCES, fieldMeta, formatValue } from './data.js';

export async function generate(templateBytes, tpl, record, { JSZip, resolveImage }) {
  const pkg = await Pkg.load(templateBytes, JSZip);
  const ctx = { pkg, JSZip, resolveImage, record, media: new Map(), warnings: [], log: [] };
  const slides = await pkg.slides();
  ctx.nextSldId = Math.max(...slides.map((s) => +s.sldId)) + 1;

  for (const s of slides) {
    const cfg = tpl.slides[s.sldId] || { shapes: {} };
    const base = scopeFor(record, {});
    if (cfg.showIf && !evalCond(cfg.showIf, base.get)) {
      await removeSlide(pkg, s);
      ctx.log.push({ sldId: s.sldId, out: 0, note: 'hidden by its condition' });
      continue;
    }
    const instances = instancesFor(cfg, record);
    if (!instances.length) {
      await removeSlide(pkg, s);
      ctx.log.push({ sldId: s.sldId, out: 0, note: 'no related records' });
      continue;
    }
    const parts = [s.part];
    let anchor = s.el;
    for (let k = 1; k < instances.length; k++) {
      const c = await cloneSlide(ctx, s.part, anchor);
      parts.push(c.part); anchor = c.el;
    }
    for (let k = 0; k < instances.length; k++) await fillSlide(ctx, parts[k], cfg, instances[k]);
    ctx.log.push({ sldId: s.sldId, out: instances.length, note: instances.length > 1 ? describeInstances(cfg, instances) : '' });
  }
  // slide-number fields keep the template's cached text until PowerPoint recalculates; write the real numbers
  const final = await pkg.slides();
  for (let i = 0; i < final.length; i++) {
    const doc = await pkg.doc(final[i].part);
    for (const fld of desc(doc.documentElement, NS.a, 'fld')) {
      const t = kid(fld, NS.a, 't');
      if (attr(fld, 'type') === 'slidenum' && t) t.textContent = String(i + 1);
    }
  }
  const bytes = await pkg.save();
  return { bytes, log: ctx.log, warnings: ctx.warnings, mediaParts: ctx.media.size };
}

/* ------------------------------------------------------------------ data scope */
export function scopeFor(record, items) {
  const get = (p) => {
    const dot = p.indexOf('.');
    const prefix = p.slice(0, dot);
    if (items[prefix]) return items[prefix][p.slice(dot + 1)];
    return record.fields[p];
  };
  const text = (p, fmt) => {
    const m = fieldMeta(p);
    if (!m) return `{{${p}}}`;
    return formatValue(get(p), m.type, fmt);
  };
  return { record, items, get, text };
}

/**
 * The related records a table or repeat uses, after its filter, sort and limit
 * ({ filter: { field, op, value }, sort: { field, dir }, limit }; fields relative to the list, e.g. 'TotalPrice').
 */
export function selectRecords(record, source, opts = {}) {
  let list = (record.lists[source] || []).slice();
  if (opts.filter && opts.filter.field) list = list.filter((it) => evalCond(opts.filter, (f) => it[f]));
  if (opts.sort && opts.sort.field) {
    const f = opts.sort.field, dir = opts.sort.dir === 'desc' ? -1 : 1;
    list.sort((a, b) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * dir);
  }
  if (opts.limit > 0) list = list.slice(0, opts.limit);
  return list;
}

function instancesFor(cfg, record) {
  let scopes = [{ items: {} }];
  if (cfg.repeat) {
    const src = SOURCES[cfg.repeat.source];
    scopes = selectRecords(record, cfg.repeat.source, cfg.repeat).map((it, i, all) => ({ items: { [src.prefix]: it }, n: i + 1, of: all.length }));
  }
  // a related-list table set to "leave out the slide" when it has no records
  const tables = Object.values(cfg.shapes || {}).filter((c) => c.table);
  if (tables.some((c) => c.table.ifEmpty === 'slide' && !selectRecords(record, c.table.source, c.table).length)) return [];
  const paged = Object.entries(cfg.shapes || {}).find(([, c]) => c.table && c.table.maxRows > 0);
  const out = [];
  for (const sc of scopes) {
    if (!paged) { out.push(sc); continue; }
    const [id, c] = paged;
    const rows = selectRecords(record, c.table.source, c.table);
    const pages = Math.max(1, Math.ceil(rows.length / c.table.maxRows));
    for (let pg = 0; pg < pages; pg++) {
      out.push(Object.assign({}, sc, { page: { shape: id, rows: rows.slice(pg * c.table.maxRows, (pg + 1) * c.table.maxRows), first: pg === 0, last: pg === pages - 1, n: pg + 1, of: pages } }));
    }
  }
  return out;
}
function describeInstances(cfg, inst) {
  const parts = [];
  if (cfg.repeat) parts.push(`one per ${SOURCES[cfg.repeat.source].label.toLowerCase().replace(/s$/, '')}`);
  if (inst.some((i) => i.page && i.page.of > 1)) parts.push('table continued on extra slides');
  return parts.join(', ');
}

/* ------------------------------------------------------------------ slides */
async function removeSlide(pkg, s) {
  s.el.parentNode.removeChild(s.el);
  const prels = await pkg.rels('ppt/presentation.xml');
  const rel = kids(prels.documentElement).find((r) => attr(r, 'Id') === s.rId);
  if (rel) rel.parentNode.removeChild(rel);
  for (const r of await pkg.relList(s.part)) {
    if (r.type === REL.notesSlide || r.type === REL.chart) await removePart(pkg, r.part, true);
  }
  await removePart(pkg, s.part, false);
}
async function removePart(pkg, part, withTargets) {
  if (withTargets) {
    for (const r of await pkg.relList(part)) {
      if (!r.external && (r.type === REL.package || r.part.startsWith('ppt/charts/'))) await removePart(pkg, r.part, false);
    }
  }
  pkg.remove(part); pkg.remove(relsPathFor(part));
  await pkg.removeOverride(part);
}

/** Copy a part (and its content-type override) to the next free name with the same stem. */
async function clonePart(pkg, part) {
  const dir = part.slice(0, part.lastIndexOf('/'));
  const file = part.slice(part.lastIndexOf('/') + 1);
  const m = /^(.*?)(\d*)\.([a-z]+)$/i.exec(file);
  const to = pkg.nextPartName(dir, m[1], m[3]);
  const doc = pkg.docs.get(part);
  if (doc) pkg.putText(to, serializeXml(doc)); else pkg.putBytes(to, await pkg.bytes(part));
  const ct = await pkg.doc('[Content_Types].xml');
  const o = kids(ct.documentElement, NS.ct, 'Override').find((e) => attr(e, 'PartName') === '/' + part);
  if (o) await pkg.setOverride(to, attr(o, 'ContentType'));
  return to;
}

async function cloneSlide(ctx, part, afterEl) {
  const { pkg } = ctx;
  const to = await clonePart(pkg, part);
  const rels = await pkg.rels(part);
  const relsDoc = parseXml(serializeXml(rels));
  for (const r of kids(relsDoc.documentElement)) {
    const type = attr(r, 'Type');
    if (type === REL.notesSlide) { r.parentNode.removeChild(r); continue; }   // speaker notes stay on the first copy
    if (type === REL.chart) {
      const chart = (await pkg.relTarget(part, attr(r, 'Id'))).part;
      const copy = await clonePart(pkg, chart);
      const crels = await pkg.rels(chart);
      if (crels) {
        const crelsDoc = parseXml(serializeXml(crels));
        for (const cr of kids(crelsDoc.documentElement)) {
          if (attr(cr, 'TargetMode') === 'External') continue;
          const target = (await pkg.relTarget(chart, attr(cr, 'Id'))).part;
          const t2 = await clonePart(pkg, target);
          cr.setAttribute('Target', '/' + t2);
        }
        pkg.putDoc(relsPathFor(copy), crelsDoc);
      }
      r.setAttribute('Target', '/' + copy);
    }
  }
  pkg.putDoc(relsPathFor(to), relsDoc);
  const rId = await pkg.addRel('ppt/presentation.xml', REL.slide, to);
  const el = afterEl.ownerDocument.createElementNS(NS.p, 'p:sldId');
  el.setAttribute('id', String(ctx.nextSldId++));
  el.setAttributeNS(NS.r, 'r:id', rId);
  afterEl.parentNode.insertBefore(el, afterEl.nextSibling);
  return { part: to, el };
}

async function fillSlide(ctx, part, cfg, inst) {
  const { pkg } = ctx;
  const doc = await pkg.doc(part);
  const scope = scopeFor(ctx.record, inst.items);
  for (const [id, c] of Object.entries(cfg.shapes || {})) {
    const el = shapeById(doc, id);
    if (!el) { ctx.warnings.push(`Shape ${id} (${c.name || 'unnamed'}) is no longer on its slide`); continue; }
    if (c.showIf && !evalCond(c.showIf, scope.get)) { el.parentNode.removeChild(el); continue; }
    if (c.table) fillTable(el, c.table, scope, inst.page && inst.page.shape === id ? inst.page : null);
    if (c.image) await fillImage(ctx, part, el, c.image, scope);
    if (c.chart) await fillChart(ctx, part, el, c.chart, scope);
  }
  // remaining text: repeat bullet paragraphs that use a list outside any repeat, then replace tokens
  for (const p of paragraphs(doc.documentElement)) {
    if (!p.parentNode) continue;
    repeatParagraph(p, scope);
  }
  for (const p of paragraphs(doc.documentElement)) replaceTokens(p, scope.text);
}

/* ------------------------------------------------------------------ tables */
function fillTable(frame, t, scope, page) {
  const tbl = desc(frame, NS.a, 'tbl')[0];
  const rows = kids(tbl, NS.a, 'tr');
  const tmpl = rows[t.row];
  if (!tmpl) return;
  const src = SOURCES[t.source];
  const list = page ? page.rows : selectRecords(scope.record, t.source, t);
  if (!list.length && t.ifEmpty === 'hide') { frame.parentNode.removeChild(frame); return; }
  const rowH = +attr(tmpl, 'h') || 0;
  for (const it of list) {
    const tr = tmpl.cloneNode(true);
    const s = scopeFor(scope.record, Object.assign({}, scope.items, { [src.prefix]: it }));
    for (const p of paragraphs(tr)) replaceTokens(p, s.text);
    tbl.insertBefore(tr, tmpl);
  }
  tbl.removeChild(tmpl);
  let delta = (list.length - 1) * rowH;
  if (page && !page.last) {
    for (const tr of rows.slice(t.row + 1)) { delta -= +attr(tr, 'h') || 0; tbl.removeChild(tr); }
  }
  if (page && !page.first && t.repeatHeader === false) {
    for (const tr of rows.slice(0, t.row)) { delta -= +attr(tr, 'h') || 0; tbl.removeChild(tr); }
  }
  const ext = path(frame, [NS.p, 'xfrm'], [NS.a, 'ext']);
  if (ext) ext.setAttribute('cy', String(Math.max(0, +attr(ext, 'cy') + delta)));
}

/* ------------------------------------------------------------------ paragraphs */
function repeatParagraph(p, scope) {
  const toks = findTokens(paraText(p));
  const prefix = toks.map((t) => t.path.split('.')[0]).find((pre) => !scope.items[pre] && Object.values(SOURCES).some((s) => s.prefix === pre));
  if (!prefix) return;
  const key = Object.keys(SOURCES).find((k) => SOURCES[k].prefix === prefix);
  const list = scope.record.lists[key] || [];
  for (const it of list) {
    const q = p.cloneNode(true);
    const s = scopeFor(scope.record, Object.assign({}, scope.items, { [prefix]: it }));
    replaceTokens(q, s.text);
    p.parentNode.insertBefore(q, p);
  }
  const body = p.parentNode;
  if (list.length || kids(body, NS.a, 'p').length > 1) body.removeChild(p);
  else replaceTokens(p, () => '');
}

/* ------------------------------------------------------------------ pictures */
async function fillImage(ctx, part, el, img, scope) {
  const { pkg } = ctx;
  const key = scope.get(img.field);
  if (!key) return;
  let media = ctx.media.get(key);
  if (!media) {
    const bytes = await ctx.resolveImage(key);
    const info = bytes && imageInfo(bytes);
    if (!info) { ctx.warnings.push(`Image ${key} could not be loaded; the template picture was kept`); return; }
    const name = pkg.nextPartName('ppt/media', 'sdocs-image', info.ext);
    pkg.putBytes(name, bytes);
    await pkg.ensureDefault(info.ext, info.type);
    media = { part: name, info };
    ctx.media.set(key, media);
  }
  const rId = await pkg.addRel(part, REL.image, media.part);
  const blip = desc(el, NS.a, 'blip')[0];
  blip.setAttributeNS(NS.r, 'r:embed', rId);
  // fit the picture into the template frame
  const xfrm = path(el, [NS.p, 'spPr'], [NS.a, 'xfrm']);
  const off = kid(xfrm, NS.a, 'off'), ext = kid(xfrm, NS.a, 'ext');
  const fw = +attr(ext, 'cx'), fh = +attr(ext, 'cy');
  const { w: iw, h: ih } = media.info;
  const blipFill = blip.parentNode;
  const oldCrop = kid(blipFill, NS.a, 'srcRect');
  if (oldCrop) blipFill.removeChild(oldCrop);
  if (img.fit === 'contain') {
    const s = Math.min(fw / iw, fh / ih);
    const w = Math.round(iw * s), h = Math.round(ih * s);
    off.setAttribute('x', String(+attr(off, 'x') + Math.round((fw - w) / 2)));
    off.setAttribute('y', String(+attr(off, 'y') + Math.round((fh - h) / 2)));
    ext.setAttribute('cx', String(w)); ext.setAttribute('cy', String(h));
  } else {
    const ia = iw / ih, fa = fw / fh;
    const crop = blip.ownerDocument.createElementNS(NS.a, 'a:srcRect');
    if (ia > fa) { const c = Math.round((1 - fa / ia) / 2 * 100000); crop.setAttribute('l', String(c)); crop.setAttribute('r', String(c)); }
    else if (ia < fa) { const c = Math.round((1 - ia / fa) / 2 * 100000); crop.setAttribute('t', String(c)); crop.setAttribute('b', String(c)); }
    blipFill.insertBefore(crop, blip.nextSibling);
  }
}

/* ------------------------------------------------------------------ charts */
export function chartData(record, c) {
  const list = record.lists[c.source] || [];
  const order = [], sums = new Map();
  for (const it of list) {
    const k = String(it[c.category] ?? '');
    if (!sums.has(k)) { sums.set(k, 0); order.push(k); }
    sums.set(k, sums.get(k) + (c.agg === 'count' ? 1 : Number(it[c.value]) || 0));
  }
  let cats = order;
  if (c.sort === 'desc') cats = [...order].sort((a, b) => sums.get(b) - sums.get(a));
  return { cats, vals: cats.map((k) => Math.round(sums.get(k) * 100) / 100) };
}

async function fillChart(ctx, part, el, c, scope) {
  const { pkg } = ctx;
  const ref = desc(el, NS.c, 'chart')[0];
  const chartPart = (await pkg.relTarget(part, ref.getAttributeNS(NS.r, 'id'))).part;
  const doc = await pkg.doc(chartPart);
  const { cats, vals } = chartData(scope.record, c);
  const n = cats.length;
  const plot = desc(doc.documentElement, NS.c, 'plotArea')[0];
  const sers = desc(plot, NS.c, 'ser');
  sers.slice(1).forEach((s) => s.parentNode.removeChild(s));
  const ser = sers[0];
  // categories → strRef, values → numRef, both pointing at the regenerated embedded sheet
  let cat = kid(ser, NS.c, 'cat');
  if (!cat) { cat = doc.createElementNS(NS.c, 'c:cat'); ser.insertBefore(cat, kid(ser, NS.c, 'val')); }
  while (cat.firstChild) cat.removeChild(cat.firstChild);
  cat.appendChild(cacheRef(doc, 'strRef', `Sheet1!$A$2:$A$${n + 1}`, cats, null));
  const val = kid(ser, NS.c, 'val');
  const fc = desc(val, NS.c, 'formatCode')[0];
  const fmt = fc ? fc.textContent : 'General';
  while (val.firstChild) val.removeChild(val.firstChild);
  val.appendChild(cacheRef(doc, 'numRef', `Sheet1!$B$2:$B$${n + 1}`, vals, fmt));
  // drop per-point overrides past the new point count
  for (const dPt of kids(ser, NS.c, 'dPt')) { const idx = kid(dPt, NS.c, 'idx'); if (+attr(idx, 'val') >= n) ser.removeChild(dPt); }
  // the embedded workbook, so "Edit Data" in PowerPoint shows the generated numbers
  const seriesName = (desc(kid(ser, NS.c, 'tx') || doc.createElement('x'), NS.c, 'v')[0] || {}).textContent || 'Series 1';
  const wb = (await pkg.relList(chartPart)).find((r) => r.type === REL.package);
  if (wb) pkg.putBytes(wb.part, await buildXlsx(ctx.JSZip, seriesName, cats, vals));
}
function cacheRef(doc, kind, formula, values, formatCode) {
  const C = (n) => doc.createElementNS(NS.c, 'c:' + n);
  const ref = C(kind);
  const f = C('f'); f.textContent = formula; ref.appendChild(f);
  const cache = C(kind === 'strRef' ? 'strCache' : 'numCache');
  if (formatCode) { const fc = C('formatCode'); fc.textContent = formatCode; cache.appendChild(fc); }
  const cnt = C('ptCount'); cnt.setAttribute('val', String(values.length)); cache.appendChild(cnt);
  values.forEach((v, i) => { const pt = C('pt'); pt.setAttribute('idx', String(i)); const ve = C('v'); ve.textContent = String(v); pt.appendChild(ve); cache.appendChild(pt); });
  ref.appendChild(cache);
  return ref;
}
/** Minimal embedded workbook: A = categories, B = values. In Apex this is a small workbook writer. */
async function buildXlsx(JSZip, name, cats, vals) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const is = (r, t) => `<c r="${r}" t="inlineStr"><is><t>${esc(t)}</t></is></c>`;
  const rows = [`<row r="1">${is('A1', ' ')}${is('B1', name)}</row>`]
    .concat(cats.map((c, i) => `<row r="${i + 2}">${is('A' + (i + 2), c)}<c r="B${i + 2}"><v>${vals[i]}</v></c></row>`));
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData></worksheet>`);
  return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
