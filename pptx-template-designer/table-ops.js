// Related-list tables in the slide XML: insert a new table, and add, remove, move and re-point its columns.
// A related-list table is an ordinary PowerPoint table (a:tbl in a p:graphicFrame), so it stays editable in
// PowerPoint. Rows above the repeating row are headers; the repeating row holds one {{List.Field}} per column.
import { NS, kids, kid, path, attr, shapeElements, cNvPr, desc, parseXml } from './ooxml.js';
import { paragraphs, paraText, spliceText, findTokens, tokenText } from './text.js';

export const EMU_PER_PX = 9525;
const ROW_H = 370840;                                   // 0.4" rows
const MEDIUM_STYLE_2_ACCENT_1 = '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}';   // PowerPoint's default table style

const tbl = (frame) => desc(frame, NS.a, 'tbl')[0];
const rows = (frame) => kids(tbl(frame), NS.a, 'tr');
const cells = (tr) => kids(tr, NS.a, 'tc');
const grid = (frame) => kids(kid(tbl(frame), NS.a, 'tblGrid'), NS.a, 'gridCol');
const ext = (frame) => path(frame, [NS.p, 'xfrm'], [NS.a, 'ext']);

function setCellText(tc, text) {
  const ps = paragraphs(tc);
  spliceText(ps[0], 0, paraText(ps[0]).length, text);
  ps.slice(1).forEach((p) => p.parentNode.removeChild(p));
}

/** Merged cells make column edits ambiguous; those tables are edited in PowerPoint. */
export function hasMerges(frame) {
  return desc(frame, NS.a, 'tc').some((tc) => attr(tc, 'gridSpan') || attr(tc, 'rowSpan') || attr(tc, 'hMerge') || attr(tc, 'vMerge'));
}

/** Columns as the designer shows them: header text, and the list field in the repeating row (or null for other text). */
export function columns(frame, t, prefix) {
  const rs = rows(frame);
  const head = t.row > 0 ? cells(rs[t.row - 1]) : [];
  return cells(rs[t.row]).map((tc, i) => {
    const text = paraText(paragraphs(tc)[0] || tc);
    const toks = findTokens(text);
    const only = toks.length === 1 && toks[0].start === 0 && toks[0].end === text.length && toks[0].path.startsWith(prefix + '.');
    return { header: head[i] ? paraText(paragraphs(head[i])[0]) : null, field: only ? toks[0].path.slice(prefix.length + 1) : null, fmt: only ? toks[0].fmt : null, text };
  });
}

/** Keep the table's total width; share it out in proportion to the current column widths. */
function refit(frame, widths) {
  const total = +attr(ext(frame), 'cx');
  const sum = widths.reduce((a, b) => a + b, 0) || 1;
  let used = 0;
  grid(frame).forEach((g, i, all) => {
    const w = i === all.length - 1 ? total - used : Math.round(widths[i] * total / sum);
    g.setAttribute('w', String(w)); used += w;
  });
}

export function addColumn(frame, t, prefix, field, label) {
  const g = grid(frame);
  const widths = g.map((x) => +attr(x, 'w'));
  const last = g[g.length - 1];
  last.parentNode.appendChild(last.cloneNode(true));
  rows(frame).forEach((tr, r) => {
    const cs = cells(tr);
    const tc = cs[cs.length - 1].cloneNode(true);
    tr.appendChild(tc);
    setCellText(tc, r === t.row ? tokenText(prefix + '.' + field) : r === t.row - 1 ? label : '');
  });
  refit(frame, widths.concat(widths.reduce((a, b) => a + b, 0) / widths.length));
}
export function removeColumn(frame, i) {
  const g = grid(frame);
  const widths = g.map((x) => +attr(x, 'w')).filter((_, k) => k !== i);
  g[i].parentNode.removeChild(g[i]);
  rows(frame).forEach((tr) => { const tc = cells(tr)[i]; tr.removeChild(tc); });
  refit(frame, widths);
}
export function moveColumn(frame, i, to) {
  const g = grid(frame);
  if (to < 0 || to >= g.length) return;
  const swap = (list, parent) => { const a = list[i], b = list[to]; if (to > i) parent.insertBefore(a, b.nextSibling); else parent.insertBefore(a, b); };
  swap(g, g[0].parentNode);
  rows(frame).forEach((tr) => swap(cells(tr), tr));
}
export function setColumnField(frame, t, prefix, i, field, label, oldLabel) {
  const rs = rows(frame);
  setCellText(cells(rs[t.row])[i], tokenText(prefix + '.' + field));
  if (t.row > 0) {
    const h = cells(rs[t.row - 1])[i];
    const cur = paraText(paragraphs(h)[0]);
    if (!cur || cur === oldLabel) setCellText(h, label);    // only rename headers nobody has edited
  }
}
export function setHeader(frame, t, i, text) {
  if (t.row > 0) setCellText(cells(rows(frame)[t.row - 1])[i], text);
}

/** PowerPoint's own table-style switches: header row and banded rows. */
export function styleFlag(frame, name) { return attr(kid(tbl(frame), NS.a, 'tblPr'), name) === '1'; }
export function setStyleFlag(frame, name, on) {
  const t = tbl(frame);
  let pr = kid(t, NS.a, 'tblPr');
  if (!pr) { pr = t.ownerDocument.createElementNS(NS.a, 'a:tblPr'); t.insertBefore(pr, t.firstChild); }
  if (on) pr.setAttribute(name, '1'); else pr.removeAttribute(name);
}

/**
 * Insert a new related-list table: one header row, one repeating row. Position and width in EMU.
 * Returns the new shape's id.
 */
export function insertTable(slideDoc, { x, y, cx }, name, cols) {
  const tree = path(slideDoc.documentElement, [NS.p, 'cSld'], [NS.p, 'spTree']);
  const ids = shapeElements(slideDoc).map((el) => +attr(cNvPr(el), 'id') || 0);
  const id = Math.max(1, ...ids) + 1;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const w = Math.floor(cx / cols.length);
  const cell = (text) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400" dirty="0"/><a:t>${esc(text)}</a:t></a:r></a:p></a:txBody><a:tcPr anchor="ctr"/></a:tc>`;
  const xml = `<p:graphicFrame xmlns:p="${NS.p}" xmlns:a="${NS.a}">`
    + `<p:nvGraphicFramePr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>`
    + `<p:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(cx)}" cy="${ROW_H * 2}"/></p:xfrm>`
    + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl>`
    + `<a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>${MEDIUM_STYLE_2_ACCENT_1}</a:tableStyleId></a:tblPr>`
    + `<a:tblGrid>${cols.map((_, i) => `<a:gridCol w="${i === cols.length - 1 ? Math.round(cx) - w * (cols.length - 1) : w}"/>`).join('')}</a:tblGrid>`
    + `<a:tr h="${ROW_H}">${cols.map((c) => cell(c.label)).join('')}</a:tr>`
    + `<a:tr h="${ROW_H}">${cols.map((c) => cell(c.token)).join('')}</a:tr>`
    + `</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
  const frag = parseXml(xml).documentElement;
  tree.appendChild(slideDoc.importNode(frag, true));
  return String(id);
}
