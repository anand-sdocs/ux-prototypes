// The template: the customer's own .pptx (kept byte-for-byte, except for {{tokens}} typed into text runs)
// plus this JSON, which S-Docs saves next to it and the Apex generator reads.
//
// Text merge fields live in the .pptx itself, so the deck can go back to PowerPoint for design changes and
// tokens survive. Everything structural (repeat a slide, repeat a table row, swap a picture, feed a chart,
// show/hide) lives here, keyed by IDs PowerPoint keeps stable across saves:
//   - slides by p:sldId/@id (PowerPoint renumbers slide part names on every save; it never renumbers sldId)
//   - shapes by p:cNvPr/@id within the slide (stable while the shape exists); the name is kept for re-matching
//
// Shape (v1):
// {
//   version: 1, baseObject: 'Opportunity', file: { name: 'fleet-proposal.pptx', bytes: 74367 },
//   slides: {
//     '260': {
//       repeat: { source: 'OpportunityLineItems' } | null,              // one copy of the slide per related record
//       showIf: { field: 'Opportunity.Term_Years__c', op: 'gt', value: 1 } | null,
//       shapes: {
//         '3': { name: 'Product image', image: { field: 'LineItem.Product2.Image__c', fit: 'cover' } },
//         '2': { name: 'Line items', table: { source: 'OpportunityLineItems', row: 1, maxRows: 6 } },
//         '7': { name: 'Spend chart', chart: { source: 'OpportunityLineItems', category: 'Product2.Family', value: 'TotalPrice', agg: 'sum' } },
//         '9': { name: 'Terms card', showIf: { ... } }
//       }
//     }
//   }
// }
// Table rows: the cells of `row` hold list tokens ({{LineItem.Quantity}}); rows above repeat on every
// continuation slide (headers), rows below appear once after the last record (totals).
// Paragraphs: a paragraph holding a list token outside any repeat is itself repeated, one per record (bullets).
import { shapeElements, cNvPr, attr } from './ooxml.js';
import { paragraphs, paraText, findTokens } from './text.js';
import { fieldMeta } from './data.js';

export const OPS = [['gt', 'is greater than'], ['lt', 'is less than'], ['eq', 'equals'], ['ne', 'does not equal'], ['notblank', 'is not blank'], ['blank', 'is blank']];

export function emptyTemplate(fileName, bytes, baseObject) {
  return { version: 1, baseObject, file: { name: fileName, bytes }, slides: {} };
}
export function slideCfg(tpl, sldId, create) {
  if (!tpl.slides[sldId] && create) tpl.slides[sldId] = { repeat: null, showIf: null, shapes: {} };
  return tpl.slides[sldId] || null;
}
export function shapeCfg(tpl, sldId, id, name, create) {
  const s = slideCfg(tpl, sldId, create);
  if (!s) return null;
  if (!s.shapes[id] && create) s.shapes[id] = { name };
  return s.shapes[id] || null;
}
/** Drop empty entries so the saved JSON only carries real bindings. */
export function compact(tpl) {
  for (const [sid, s] of Object.entries(tpl.slides)) {
    for (const [id, c] of Object.entries(s.shapes)) {
      if (!c.image && !c.table && !c.chart && !c.showIf) delete s.shapes[id];
    }
    if (!s.repeat && !s.showIf && !Object.keys(s.shapes).length) delete tpl.slides[sid];
  }
  return tpl;
}

export function evalCond(cond, getValue) {
  if (!cond || !cond.field) return true;
  const v = getValue(cond.field);
  const blank = v == null || v === '';
  switch (cond.op) {
    case 'blank': return blank;
    case 'notblank': return !blank;
    case 'gt': return !blank && Number(v) > Number(cond.value);
    case 'lt': return !blank && Number(v) < Number(cond.value);
    case 'eq': return String(v) === String(cond.value);
    case 'ne': return String(v) !== String(cond.value);
    default: return true;
  }
}

/** Every token in a slide, for the JSON drawer and for checks. */
export function slideTokens(slideDoc) {
  const out = [];
  for (const el of shapeElements(slideDoc)) {
    if (el.localName === 'grpSp') continue;
    const id = attr(cNvPr(el), 'id');
    for (const p of paragraphs(el)) for (const t of findTokens(paraText(p))) out.push({ shape: id, path: t.path, fmt: t.fmt });
  }
  return out;
}

/** Problems a designer should fix before publishing. */
export function checkSlide(tpl, sldId, slideDoc) {
  const issues = [];
  const cfg = tpl.slides[sldId] || { shapes: {} };
  for (const t of slideTokens(slideDoc)) {
    const m = fieldMeta(t.path);
    if (!m) { issues.push({ shape: t.shape, msg: `Unknown field {{${t.path}}}` }); continue; }
    const shapeCfg = cfg.shapes[t.shape] || {};
    if (m.source && shapeCfg.table && shapeCfg.table.source !== m.source) issues.push({ shape: t.shape, msg: `{{${t.path}}} is from a different list than this table` });
    if (m.source && cfg.repeat && cfg.repeat.source !== m.source && !shapeCfg.table) issues.push({ shape: t.shape, msg: `{{${t.path}}} is from a different list than the slide repeat` });
    if (m.source && !cfg.repeat && !shapeCfg.table) issues.push({ shape: t.shape, msg: `{{${t.path}}} is a related-list field but this slide doesn’t repeat, so its paragraph repeats once per record, like bullets` });
  }
  return issues;
}
