// Node tests: text splicing, then the finished example design generated for every sample record.
// Writes out/<record>.pptx and out/template.pptx for structural validation and for opening in PowerPoint.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { setXmlImpl, parseXml, NS, Pkg, fixDuplicateIds } from '../ooxml.js';
import { paraText, spliceText, setParaText, replaceTokens } from '../text.js';
import { emptyTemplate, compact } from '../template.js';
import { applyExampleDesign } from '../example.js';
import { generate } from '../generate.js';
import { RECORDS } from '../data.js';

setXmlImpl(DOMParser, XMLSerializer);
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });

/* text splicing across runs */
const P = (xml) => parseXml(`<a:p xmlns:a="${NS.a}">${xml}</a:p>`).documentElement;
const R = (t, b) => `<a:r><a:rPr${b ? ' b="1"' : ''}/><a:t>${t}</a:t></a:r>`;
{
  const p = P(R('Hello {{Opp') + R('ortunity.Na', true) + R('me}} there'));
  assert.equal(paraText(p), 'Hello {{Opportunity.Name}} there');
  replaceTokens(p, (f) => (f === 'Opportunity.Name' ? 'ACME' : '?'));
  assert.equal(paraText(p), 'Hello ACME there');
  assert.equal(p.getElementsByTagNameNS(NS.a, 'r').length, 2, 'emptied middle run removed');
}
{
  const p = P(R('Prepared for ') + R('Kestrel Logistics', true));
  setParaText(p, 'Prepared for {{Opportunity.Account.Name}}');
  const runs = p.getElementsByTagNameNS(NS.a, 'r');
  assert.equal(runs[1].getElementsByTagNameNS(NS.a, 't')[0].textContent, '{{Opportunity.Account.Name}}');
  assert.equal(runs[1].getElementsByTagNameNS(NS.a, 'rPr')[0].getAttribute('b'), '1', 'token keeps the bold run');
}
{
  const p = P(`<a:endParaRPr sz="1400"/>`);
  spliceText(p, 0, 0, '{{X}}');
  assert.equal(paraText(p), '{{X}}');
}
console.log('text: ok');

/* example design → generate per record */
const tplBytes = fs.readFileSync(path.join(here, '../sample/fleet-proposal.pptx'));
const pkg = await Pkg.load(tplBytes, JSZip);
let repaired = 0;
for (const s of await pkg.slides()) repaired += fixDuplicateIds(await pkg.doc(s.part));
const tpl = emptyTemplate('fleet-proposal.pptx', tplBytes.length, 'Opportunity');
await applyExampleDesign(pkg, tpl);
compact(tpl);
const designed = await pkg.save();
fs.writeFileSync(path.join(out, 'template.pptx'), designed);
fs.writeFileSync(path.join(out, 'template.json'), JSON.stringify(tpl, null, 2));

const imgDir = path.join(here, '../sample/images');
const resolveImage = async (key) => {
  const f = path.join(imgDir, key.replace(/^img:/, '') + '.png');
  return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null;
};
const expectSlides = { kestrel: 1 + 1 + 1 + 1 + 5 + 1 + 1, orchard: 1 + 1 + 1 + 1 + 2 + 0 + 1, meridian: 1 + 1 + 2 + 1 + 9 + 1 + 1 };
for (const rec of RECORDS) {
  const t0 = Date.now();
  const res = await generate(designed, tpl, rec, { JSZip, resolveImage });
  const file = path.join(out, rec.id + '.pptx');
  fs.writeFileSync(file, res.bytes);
  const g = await Pkg.load(res.bytes, JSZip);
  const slides = await g.slides();
  assert.equal(slides.length, expectSlides[rec.id], `${rec.id}: slide count`);
  const all = (await Promise.all(slides.map((s) => g.text(s.part)))).join('\n');
  assert.ok(!/\{\{/.test(all), `${rec.id}: no tokens left`);
  assert.ok(all.includes(rec.fields['Opportunity.Account.Name']), `${rec.id}: account name merged`);
  console.log(`${rec.id}: ${slides.length} slides, ${res.mediaParts} images added, ${res.bytes.length} bytes, ${Date.now() - t0} ms` + (res.warnings.length ? ' warnings: ' + res.warnings.join('; ') : ''));
}
console.log('generate: ok');

/* related-list table: insert, edit columns, filter / sort / limit, empty behaviour */
{
  const { insertTable, columns, addColumn, removeColumn, moveColumn, setColumnField, EMU_PER_PX } = await import('../table-ops.js');
  const { shapeById } = await import('../ooxml.js');
  const pkg3 = await Pkg.load(tplBytes, JSZip);
  for (const s of await pkg3.slides()) fixDuplicateIds(await pkg3.doc(s.part));
  const tpl3 = emptyTemplate('fleet-proposal.pptx', tplBytes.length, 'Opportunity');
  const s6 = (await pkg3.slides())[5];                       // "Multi-year terms": room under the card
  const doc = await pkg3.doc(s6.part);
  const tok = (f) => `{{ContactRole.${f}}}`;
  const id = insertTable(doc, { x: 58 * EMU_PER_PX, y: 420 * EMU_PER_PX, cx: 1162 * EMU_PER_PX }, 'Contact roles',
    [{ label: 'Name', token: tok('Contact.Name') }, { label: 'Title', token: tok('Contact.Title') }, { label: 'Role', token: tok('Role') }]);
  const t = { source: 'OpportunityContactRoles', row: 1, maxRows: 0, repeatHeader: true, ifEmpty: 'slide', sort: { field: 'Contact.Name', dir: 'asc' }, limit: 3 };
  tpl3.slides[s6.sldId] = { repeat: null, showIf: null, shapes: { [id]: { name: 'Contact roles', table: t } } };
  const frame = shapeById(doc, id);
  addColumn(frame, t, 'ContactRole', 'Contact.Email', 'Email');
  moveColumn(frame, 3, 0);                                   // Email first
  removeColumn(frame, 2);                                    // drop Title
  setColumnField(frame, t, 'ContactRole', 2, 'IsPrimary', 'Primary', 'Role');
  const cols = columns(frame, t, 'ContactRole').map((c) => `${c.header}=${c.field}`);
  assert.deepEqual(cols, ['Email=Contact.Email', 'Name=Contact.Name', 'Primary=IsPrimary']);
  const widths = Array.from(frame.getElementsByTagNameNS(NS.a, 'gridCol')).reduce((a, g) => a + +g.getAttribute('w'), 0);
  assert.equal(widths, 1162 * EMU_PER_PX, 'columns still fill the table width');
  const b3 = await pkg3.save();
  fs.writeFileSync(path.join(out, 'table-template.pptx'), b3);
  for (const rec of RECORDS) {
    const res = await generate(b3, tpl3, rec, { JSZip, resolveImage });
    fs.writeFileSync(path.join(out, `table-${rec.id}.pptx`), res.bytes);
    const g = await Pkg.load(res.bytes, JSZip);
    const all = (await Promise.all((await g.slides()).map((x) => g.text(x.part)))).join('\n');
    const people = rec.lists.OpportunityContactRoles.map((c) => c['Contact.Name']).sort().slice(0, 3);
    for (const n of people) assert.ok(all.includes(n), `${rec.id}: ${n} listed`);
    const extra = rec.lists.OpportunityContactRoles.map((c) => c['Contact.Name']).sort().slice(3);
    for (const n of extra) assert.ok(!all.includes(n), `${rec.id}: ${n} cut by the limit`);
    if (!people.length) assert.ok(!all.includes('Multi-year'), `${rec.id}: slide left out with no contact roles`);
    console.log(`table ${rec.id}: ${people.length ? people.join(', ') : 'no contact roles, slide left out'}`);
  }
}
