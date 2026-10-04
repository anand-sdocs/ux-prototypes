// Paragraph text across runs. PowerPoint splits text into runs (a:r) wherever formatting, spell-check or
// edit history changes, so "{{Opportunity.Account.Name}}" typed in PowerPoint can arrive as three runs.
// Everything here works on the paragraph's flat text and maps offsets back to runs, so a token keeps the
// formatting of the run it starts in. The Apex generator does the same.
import { NS, kids, kid } from './ooxml.js';

export const TOKEN_RE = /\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g;

/** Segments of a paragraph: runs and fields hold editable text; a:br is a fixed line break. */
function segments(p) {
  const out = [];
  for (const el of kids(p)) {
    if (el.namespaceURI !== NS.a) continue;
    if (el.localName === 'r' || el.localName === 'fld') {
      const t = kid(el, NS.a, 't');
      out.push({ el, t, text: t ? t.textContent : '', kind: el.localName });
    } else if (el.localName === 'br') out.push({ el, t: null, text: '\n', kind: 'br' });
  }
  return out;
}

export function paraText(p) { return segments(p).map((s) => s.text).join(''); }

/** All paragraphs in a shape or table cell's text bodies (sp > txBody, tc > txBody). */
export function paragraphs(el) { return Array.from(el.getElementsByTagNameNS(NS.a, 'p')); }

function newRun(p, likeRun) {
  const doc = p.ownerDocument;
  const r = doc.createElementNS(NS.a, 'a:r');
  const src = likeRun ? kid(likeRun, NS.a, 'rPr') : kid(p, NS.a, 'endParaRPr');
  if (src) {
    const rPr = doc.createElementNS(NS.a, 'a:rPr');
    for (const at of Array.from(src.attributes)) rPr.setAttribute(at.name, at.value);
    for (const c of kids(src)) rPr.appendChild(c.cloneNode(true));
    r.appendChild(rPr);
  }
  const t = doc.createElementNS(NS.a, 'a:t');
  r.appendChild(t);
  const end = kid(p, NS.a, 'endParaRPr');
  p.insertBefore(r, end);
  return { el: r, t, text: '', kind: 'r' };
}

/**
 * Replace text[start, end) with `text`. The inserted text lands in the run that holds `start`
 * (or the run just before it), so it takes that run's formatting. Runs emptied by the deletion are removed.
 */
export function spliceText(p, start, end, text) {
  let segs = segments(p);
  if (!segs.some((s) => s.kind === 'r')) { newRun(p, null); segs = segments(p); }
  let pos = 0;
  for (const s of segs) { s.a = pos; pos += s.text.length; s.b = pos; }
  const runs = segs.filter((s) => s.kind === 'r');
  // the run that receives the insertion: the one containing `start`, else the one ending at it, else the last
  const host = runs.find((s) => s.a <= start && start < s.b) || runs.filter((s) => s.b === start).pop() || runs[runs.length - 1];
  const hostOff = Math.min(start - host.a, host.text.length);
  // delete [start, end) across segments (offsets inside the host stay valid: deletion begins at `start`)
  const kill = [];
  for (const s of segs) {
    const from = Math.max(start, s.a), to = Math.min(end, s.b);
    if (to <= from) continue;
    if (s.kind === 'br') { kill.push(s); continue; }
    s.text = s.text.slice(0, from - s.a) + s.text.slice(to - s.a);
  }
  host.text = host.text.slice(0, hostOff) + text + host.text.slice(hostOff);
  for (const s of segs) {
    if (s.kind === 'br') continue;
    if (s.t) s.t.textContent = s.text;
    if (s !== host && s.kind === 'r' && s.text === '') kill.push(s);
  }
  for (const s of kill) s.el.parentNode.removeChild(s.el);
}

/** Set a paragraph's text by diffing against the current text (keeps formatting of untouched runs). */
export function setParaText(p, next) {
  const cur = paraText(p);
  if (cur === next) return false;
  let a = 0; while (a < cur.length && a < next.length && cur[a] === next[a]) a++;
  let b = 0; while (b < cur.length - a && b < next.length - a && cur[cur.length - 1 - b] === next[next.length - 1 - b]) b++;
  spliceText(p, a, cur.length - b, next.slice(a, next.length - b));
  return true;
}

export function findTokens(text) {
  const out = [];
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, path: m[1], fmt: m[2] || null, raw: m[0] });
  return out;
}
export function tokenText(path, fmt) { return fmt ? `{{${path} | ${fmt}}}` : `{{${path}}}`; }

/** Replace every token in the paragraph with resolve(path, fmt). Returns the number replaced. */
export function replaceTokens(p, resolve) {
  const toks = findTokens(paraText(p));
  for (let i = toks.length - 1; i >= 0; i--) {
    const t = toks[i];
    spliceText(p, t.start, t.end, resolve(t.path, t.fmt));
  }
  return toks.length;
}
