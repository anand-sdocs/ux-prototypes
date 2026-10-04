// Text selected on the rendered slide → a paragraph and character range in the slide XML.
// The renderer draws each shape as an absolutely positioned element at the model's position and size, then
// text body › one block per paragraph › one span per run (table cells: td › one block per paragraph).
// It doesn't tag elements with shape IDs, so shapes are matched by geometry in model order, and paragraphs by
// text. Merge-field chips (chipify in app.js) show a label but stand for their full {{token}}; a selection
// that starts or ends inside a chip snaps to the whole chip.
import { paraText } from './text.js';

const near = (css, v) => Math.abs(parseFloat(css) - v) < 1.5;

/** Tag rendered shape elements with data-ptd-id. Layout and master shapes are drawn first and match nothing. */
export function tagShapes(root, nodes) {
  let k = 0;
  for (const el of root.children) {
    const s = el.style;
    for (let j = k; j < nodes.length; j++) {
      const n = nodes[j];
      if (near(s.left, n.position.x) && near(s.top, n.position.y) && near(s.width, n.size.w) && near(s.height, n.size.h)) {
        el.dataset.ptdId = n.id; k = j + 1; break;
      }
    }
  }
}

/** Paragraph blocks inside a rendered shape, in document order. */
export function paragraphEls(shapeEl) {
  return Array.from(shapeEl.querySelectorAll('div')).filter((d) => d.childNodes.length && !d.querySelector('div, table, svg')
    && Array.from(d.children).every((c) => c.tagName === 'SPAN' || c.tagName === 'BR'));
}

/** Text pieces of a paragraph block with the XML text each stands for. */
function segments(pEl) {
  const out = [];
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) out.push({ node: c, raw: c.nodeValue });
      else if (c.classList && c.classList.contains('ptd-chip')) out.push({ node: c, raw: c.dataset.raw, chip: true });
      else if (c.tagName === 'BR') { if (pEl.childNodes.length > 1) out.push({ node: c, raw: '\n', br: true }); }
      else if (c.nodeType === 1) walk(c);
    }
  };
  walk(pEl);
  return out;
}
const rawText = (pEl) => segments(pEl).map((s) => s.raw).join('');

/** Character offset in the paragraph's XML text of a DOM boundary point. */
function rawOffset(pEl, container, offset, isEnd) {
  let acc = 0;
  const at = document.createRange();
  at.setStart(container, offset);
  for (const s of segments(pEl)) {
    if (s.chip && s.node.contains(container)) return acc + (isEnd ? s.raw.length : 0);
    if (s.node === container) return acc + offset;
    const endOfSeg = s.chip || s.br ? [s.node.parentNode, Array.prototype.indexOf.call(s.node.parentNode.childNodes, s.node) + 1] : [s.node, s.node.nodeValue.length];
    if (at.comparePoint(endOfSeg[0], endOfSeg[1]) <= 0) acc += s.raw.length; else return acc;
  }
  return acc;
}

/**
 * Character map from drawn text to XML text. The renderer doesn't draw text character for character: it turns
 * repeated spaces into non-breaking spaces and may draw tabs as spaces. Whitespace matches whitespace, and extra
 * whitespace on either side is skipped. Returns m (m[k] = XML offset of drawn offset k) or null.
 */
const isWs = (c) => /\s|\u00a0/.test(c);
function charMap(dom, xml) {
  const m = new Array(dom.length + 1);
  let i = 0, j = 0;
  while (i < dom.length || j < xml.length) {
    const a = dom[i], b = xml[j];
    if (i < dom.length && j < xml.length && (a === b || (isWs(a) && isWs(b)))) { m[i++] = j++; continue; }
    if (i < dom.length && isWs(a)) { m[i++] = j; continue; }
    if (j < xml.length && isWs(b)) { j++; continue; }
    return null;
  }
  m[dom.length] = xml.length;
  return m;
}
/** Pair rendered paragraph blocks with XML paragraphs. A bullet or number may be drawn as a short prefix. */
function align(shapeEl, xmlParas) {
  const map = new Map();
  let j = 0;
  for (const el of paragraphEls(shapeEl)) {
    const raw = rawText(el);
    found: for (let k = j; k < xmlParas.length; k++) {
      const x = paraText(xmlParas[k]);
      for (let shift = 0; shift <= Math.min(6, raw.length); shift++) {
        const cm = charMap(raw.slice(shift), x);
        if (cm) { map.set(el, { p: xmlParas[k], shift, cm }); j = k + 1; break found; }
        if (!x) break;
      }
    }
  }
  return map;
}

/**
 * Where a DOM range sits in the XML: { p, start, end, collapsed, text }, { multi: true } when it spans paragraphs,
 * or null when it isn't in this shape's text.
 */
export function rangeToXml(shapeEl, xmlParas, range) {
  const blocks = new Set(paragraphEls(shapeEl));
  const up = (n) => { for (let x = n; x && x !== shapeEl; x = x.parentNode) if (blocks.has(x)) return x; return null; };
  const pa = up(range.startContainer);
  let pb = up(range.endContainer);
  if (!pa || !pb) return null;
  const m = align(shapeEl, xmlParas).get(pa);
  if (!m) return null;
  const len = paraText(m.p).length;
  const clamp = (v) => { const k = Math.max(0, Math.min(m.cm.length - 1, v - m.shift)); return Math.min(len, m.cm[k]); };
  const start = clamp(rawOffset(pa, range.startContainer, range.startOffset, false));
  let end;
  if (pa !== pb) {
    // a triple-click selects a paragraph and ends at the start of the next one
    if (rawOffset(pb, range.endContainer, range.endOffset, true) !== 0) return { multi: true };
    end = len; pb = pa;
  } else end = range.collapsed ? start : clamp(rawOffset(pa, range.endContainer, range.endOffset, true));
  // like a word processor, leave the spaces around a selected phrase alone
  const text = paraText(m.p);
  let a = start, b = end;
  while (a < b && /\s/.test(text[a])) a++;
  while (b > a && /\s/.test(text[b - 1])) b--;
  if (a === b) { a = start; b = end; }
  return { p: m.p, start: a, end: b, collapsed: a === b, text: text.slice(a, b) };
}

/** The XML paragraph drawn under a point (for drops onto a table cell). */
export function paragraphAt(shapeEl, xmlParas, x, y) {
  const map = align(shapeEl, xmlParas);
  for (const el of paragraphEls(shapeEl)) {
    const cell = el.closest('td') || el;
    const r = cell.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && map.has(el)) return map.get(el).p;
  }
  return null;
}
