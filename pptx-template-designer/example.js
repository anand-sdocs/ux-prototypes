// The finished design for the sample deck: what a designer ends up with after binding the uploaded
// "Fleet modernization proposal". Used by "Load finished example" in the designer and by the node tests.
// Shapes are found by name, the same way the designer re-matches bindings after a re-upload.
import { NS, shapeElements, cNvPr, attr } from './ooxml.js';
import { paragraphs, setParaText } from './text.js';
import { slideCfg, shapeCfg } from './template.js';
import { insertTable } from './table-ops.js';

export async function applyExampleDesign(pkg, tpl) {
  const slides = await pkg.slides();
  const S = async (i) => ({ sldId: slides[i].sldId, doc: await pkg.doc(slides[i].part) });
  const find = (doc, name) => shapeElements(doc).find((el) => attr(cNvPr(el), 'name') === name);
  const idOf = (el) => attr(cNvPr(el), 'id');
  const text = (el, ...lines) => paragraphs(el).forEach((p, i) => { if (lines[i] != null) setParaText(p, lines[i]); });
  const titleOf = (doc) => shapeElements(doc).find((el) => Array.from(el.getElementsByTagNameNS(NS.p, 'ph')).some((ph) => attr(ph, 'type') === 'title'));

  // 1 Title
  let s = await S(0);
  text(shapeElements(s.doc)[1], 'Prepared for {{Opportunity.Account.Name}}');
  text(find(s.doc, 'Prepared by'), '{{Opportunity.Owner.Name}} · {{Opportunity.Owner.Title}} · {{System.Today | d MMMM yyyy}}');
  const logo = shapeCfg(tpl, s.sldId, idOf(find(s.doc, 'Customer logo')), 'Customer logo', true);
  logo.image = { field: 'Opportunity.Account.Logo__c', fit: 'contain' };
  logo.showIf = { field: 'Opportunity.Account.Logo__c', op: 'notblank' };   // no placeholder logo when the account has none

  // 2 Executive summary
  s = await S(1);
  text(find(s.doc, 'Stat value 1'), '{{Opportunity.Amount | $#,##0}}');
  text(find(s.doc, 'Stat value 2'), '{{Opportunity.Line_Item_Count__c}}');
  text(find(s.doc, 'Stat value 3'), '{{Opportunity.CloseDate}}');
  text(find(s.doc, 'Summary'), '{{Opportunity.Account.Name}} runs {{Opportunity.Account.Fleet_Size__c}} vehicles across {{Opportunity.Account.Depots__c}} depots. This proposal replaces three separate tracking tools with one platform, cuts route planning time and gives operations one view of the fleet.');
  text(find(s.doc, 'Owner note'), '{{Opportunity.Owner.Name}} will be your main contact through rollout.');

  // 3 Investment summary: a related-list table, inserted the way the designer's Related lists pane does it
  s = await S(2);
  const tok = (f) => `{{LineItem.${f}}}`;
  const tableId = insertTable(s.doc, { x: 548640, y: 1463040, cx: 11064240 }, 'Line items', [
    { label: 'Solution', token: tok('Product2.Name') }, { label: 'Qty', token: tok('Quantity') }, { label: 'Unit price', token: tok('UnitPrice') },
    { label: 'Discount', token: tok('Discount') }, { label: 'Total', token: tok('TotalPrice') }]);
  shapeCfg(tpl, s.sldId, tableId, 'Line items', true).table = { source: 'OpportunityLineItems', row: 1, maxRows: 6, repeatHeader: true, ifEmpty: 'header', sort: { field: 'TotalPrice', dir: 'desc' } };

  // 4 Chart
  s = await S(3);
  shapeCfg(tpl, s.sldId, idOf(find(s.doc, 'Spend chart')), 'Spend chart', true).chart = { source: 'OpportunityLineItems', category: 'Product2.Family', value: 'TotalPrice', agg: 'sum', sort: 'desc' };

  // narrative text has to be rewritten by hand: suggestions only find literal values
  text(find(s.doc, 'Callout text'), 'Where the investment goes', 'Fleet Tracker covers all {{Opportunity.Account.Fleet_Size__c}} vehicles from day one. Analytics and services scale with adoption.');

  // 5 Product spotlight: one slide per line item
  s = await S(4);
  slideCfg(tpl, s.sldId, true).repeat = { source: 'OpportunityLineItems' };
  text(titleOf(s.doc), '{{LineItem.Product2.Name}}');
  text(find(s.doc, 'Product description'), '{{LineItem.Product2.Description}}');
  text(find(s.doc, 'Product figures'), 'Quantity  {{LineItem.Quantity}}', 'Line total  {{LineItem.TotalPrice}}');
  shapeCfg(tpl, s.sldId, idOf(find(s.doc, 'Product image')), 'Product image', true).image = { field: 'LineItem.Product2.Image__c', fit: 'cover' };

  // 6 Multi-year terms: only for terms over one year
  s = await S(5);
  slideCfg(tpl, s.sldId, true).showIf = { field: 'Opportunity.Term_Years__c', op: 'gt', value: 1 };
  text(find(s.doc, 'Terms text'), '{{Opportunity.Term_Years__c}}-year commitment, 10% discount on Fleet Tracker');

  // 7 Next steps
  s = await S(6);
  text(find(s.doc, 'Contact text'), null, '{{Opportunity.Owner.Name}}', '{{Opportunity.Owner.Title}}', '{{Opportunity.Owner.Email}}', '{{Opportunity.Owner.Phone}}');
  text(find(s.doc, 'Step 3 text'), null, 'Contract signature by {{Opportunity.CloseDate | d MMMM yyyy}}');
  return tpl;
}
