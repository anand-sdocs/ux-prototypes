// Sample Salesforce data for the prototype: three Opportunities with 5, 2 and 9 line items, so Preview shows
// a slide repeated per line item, a conditional slide dropping out, and a table continuing on extra slides.
// Image fields hold a key ("img:product-1") that the image resolver turns into bytes. In the package the
// resolver would read a ContentVersion, a Static Resource or a rich-text image.

export const BASE_OBJECT = 'Opportunity';

// [path, label, type]
export const FIELDS = [
  ['Opportunity.Name', 'Opportunity name', 'text'],
  ['Opportunity.Account.Name', 'Account name', 'text'],
  ['Opportunity.Account.Logo__c', 'Account logo', 'image'],
  ['Opportunity.Account.Fleet_Size__c', 'Fleet size', 'number'],
  ['Opportunity.Account.Depots__c', 'Depots', 'number'],
  ['Opportunity.Amount', 'Amount', 'currency'],
  ['Opportunity.CloseDate', 'Close date', 'date'],
  ['Opportunity.StageName', 'Stage', 'text'],
  ['Opportunity.Term_Years__c', 'Term (years)', 'number'],
  ['Opportunity.Line_Item_Count__c', 'Number of line items', 'number'],
  ['Opportunity.Owner.Name', 'Owner name', 'text'],
  ['Opportunity.Owner.Title', 'Owner title', 'text'],
  ['Opportunity.Owner.Email', 'Owner email', 'text'],
  ['Opportunity.Owner.Phone', 'Owner phone', 'text'],
  ['System.Today', 'Today', 'date']
];

export const SOURCES = {
  OpportunityLineItems: {
    label: 'Opportunity line items', prefix: 'LineItem',
    fields: [
      ['Product2.Name', 'Product', 'text'], ['Product2.Family', 'Product family', 'text'],
      ['Product2.Description', 'Product description', 'text'], ['Product2.Image__c', 'Product image', 'image'],
      ['Quantity', 'Quantity', 'number'], ['UnitPrice', 'Unit price', 'currency'], ['Discount', 'Discount', 'percent'],
      ['TotalPrice', 'Total price', 'currency']
    ],
    defaults: ['Product2.Name', 'Quantity', 'UnitPrice', 'TotalPrice']
  },
  OpportunityContactRoles: {
    label: 'Contact roles', prefix: 'ContactRole',
    fields: [['Contact.Name', 'Name', 'text'], ['Contact.Title', 'Title', 'text'], ['Role', 'Role', 'text'], ['Contact.Email', 'Email', 'text'], ['IsPrimary', 'Primary', 'text']],
    defaults: ['Contact.Name', 'Contact.Title', 'Role']
  }
};

const PRODUCTS = {
  tracker: { 'Product2.Name': 'Fleet Tracker', 'Product2.Family': 'Tracking', 'Product2.Image__c': 'img:product-1',
    'Product2.Description': 'Live GPS, geofencing and driver safety scores for every vehicle, with alerts sent to dispatch in seconds.' },
  router: { 'Product2.Name': 'Route Optimizer', 'Product2.Family': 'Planning', 'Product2.Image__c': 'img:product-2',
    'Product2.Description': 'Plans every depot\'s routes overnight around traffic, delivery windows and vehicle capacity.' },
  driver: { 'Product2.Name': 'Driver App', 'Product2.Family': 'Mobile', 'Product2.Image__c': 'img:product-3',
    'Product2.Description': 'Turn-by-turn routes, proof of delivery and vehicle checks on the driver\'s phone.' },
  analytics: { 'Product2.Name': 'Analytics Suite', 'Product2.Family': 'Analytics', 'Product2.Image__c': 'img:product-4',
    'Product2.Description': 'Fuel, idle time and on-time delivery dashboards for every depot and region.' },
  onboarding: { 'Product2.Name': 'Onboarding', 'Product2.Family': 'Services', 'Product2.Image__c': 'img:product-5',
    'Product2.Description': 'Project manager, installation crews and driver training for each depot.' },
  coldchain: { 'Product2.Name': 'Cold Chain Sensors', 'Product2.Family': 'Tracking', 'Product2.Image__c': 'img:product-6',
    'Product2.Description': 'Temperature and door sensors for refrigerated trailers, logged every minute.' },
  dashcam: { 'Product2.Name': 'Dash Cameras', 'Product2.Family': 'Tracking', 'Product2.Image__c': 'img:product-7',
    'Product2.Description': 'Road- and cab-facing cameras that upload clips of harsh braking and collisions.' },
  fuel: { 'Product2.Name': 'Fuel Card Integration', 'Product2.Family': 'Analytics', 'Product2.Image__c': 'img:product-8',
    'Product2.Description': 'Matches fuel card transactions to vehicles and flags purchases away from the route.' },
  support: { 'Product2.Name': 'Premium Support', 'Product2.Family': 'Services', 'Product2.Image__c': 'img:product-9',
    'Product2.Description': '24/7 phone support and a named technical account manager.' }
};
function item(p, qty, unit, disc) {
  return Object.assign({}, PRODUCTS[p], { Quantity: qty, UnitPrice: unit, Discount: disc, TotalPrice: Math.round(qty * unit * (1 - disc) * 100) / 100 });
}
const contact = (name, title, role, email, primary) => ({ 'Contact.Name': name, 'Contact.Title': title, Role: role, 'Contact.Email': email, IsPrimary: primary ? 'Yes' : 'No' });
const CONTACTS = {
  kestrel: [contact('Maya Okonkwo', 'VP Operations', 'Decision Maker', 'maya.okonkwo@kestrel.example', true), contact('Tom Brandt', 'Fleet Manager', 'Evaluator', 'tom.brandt@kestrel.example'),
    contact('Lena Fischer', 'IT Director', 'Technical Buyer', 'lena.fischer@kestrel.example')],
  orchard: [],
  meridian: [contact('Carlos Mendes', 'COO', 'Decision Maker', 'c.mendes@meridian.example', true), contact('Aisha Patel', 'Head of Procurement', 'Economic Buyer', 'a.patel@meridian.example'),
    contact('Grace Liu', 'Director of Logistics', 'Evaluator', 'g.liu@meridian.example'), contact('Ben Carter', 'Safety Lead', 'Influencer', 'b.carter@meridian.example')]
};
function record(id, f, items) {
  const amount = items.reduce((s, i) => s + i.TotalPrice, 0);
  return {
    id, label: f['Opportunity.Name'],
    fields: Object.assign({ 'Opportunity.Amount': amount, 'Opportunity.Line_Item_Count__c': items.length, 'System.Today': '2026-10-04' }, f),
    lists: { OpportunityLineItems: items, OpportunityContactRoles: CONTACTS[id] || [] }
  };
}

export const RECORDS = [
  record('kestrel', {
    'Opportunity.Name': 'Kestrel Logistics — Fleet modernization', 'Opportunity.Account.Name': 'Kestrel Logistics',
    'Opportunity.Account.Logo__c': 'img:logo-kestrel', 'Opportunity.Account.Fleet_Size__c': 1200, 'Opportunity.Account.Depots__c': 14,
    'Opportunity.CloseDate': '2026-11-30', 'Opportunity.StageName': 'Proposal', 'Opportunity.Term_Years__c': 3,
    'Opportunity.Owner.Name': 'Dana Whitfield', 'Opportunity.Owner.Title': 'Account Executive',
    'Opportunity.Owner.Email': 'dana.whitfield@halcyon.example', 'Opportunity.Owner.Phone': '+1 555 0100'
  }, [item('tracker', 1200, 180, 0.1), item('router', 14, 6500, 0), item('driver', 1500, 45, 0), item('analytics', 1, 42600, 0), item('onboarding', 1, 17000, 0)]),
  record('orchard', {
    'Opportunity.Name': 'Orchard Fresh Foods — Pilot', 'Opportunity.Account.Name': 'Orchard Fresh Foods',
    'Opportunity.Account.Logo__c': '',   // no logo on file: shows why the logo picture has a condition 'Opportunity.Account.Fleet_Size__c': 180, 'Opportunity.Account.Depots__c': 3,
    'Opportunity.CloseDate': '2026-12-15', 'Opportunity.StageName': 'Qualification', 'Opportunity.Term_Years__c': 1,
    'Opportunity.Owner.Name': 'Sam Okafor', 'Opportunity.Owner.Title': 'Account Manager',
    'Opportunity.Owner.Email': 'sam.okafor@halcyon.example', 'Opportunity.Owner.Phone': '+1 555 0142'
  }, [item('tracker', 180, 180, 0), item('driver', 200, 45, 0)]),
  record('meridian', {
    'Opportunity.Name': 'Meridian Freight — National rollout', 'Opportunity.Account.Name': 'Meridian Freight',
    'Opportunity.Account.Logo__c': 'img:logo-meridian', 'Opportunity.Account.Fleet_Size__c': 4800, 'Opportunity.Account.Depots__c': 41,
    'Opportunity.CloseDate': '2027-01-29', 'Opportunity.StageName': 'Negotiation', 'Opportunity.Term_Years__c': 5,
    'Opportunity.Owner.Name': 'Priya Raman', 'Opportunity.Owner.Title': 'Strategic Account Director',
    'Opportunity.Owner.Email': 'priya.raman@halcyon.example', 'Opportunity.Owner.Phone': '+1 555 0187'
  }, [item('tracker', 4800, 180, 0.15), item('coldchain', 900, 95, 0.05), item('dashcam', 4800, 120, 0.1), item('router', 41, 6500, 0.05),
    item('driver', 6000, 45, 0), item('analytics', 1, 98000, 0), item('fuel', 1, 36000, 0), item('onboarding', 1, 64000, 0), item('support', 1, 48000, 0)])
];

/* ------------------------------------------------------------------ field lookup + formatting */
export function fieldMeta(path) {
  const f = FIELDS.find((x) => x[0] === path);
  if (f) return { path, label: f[1], type: f[2] };
  for (const [key, src] of Object.entries(SOURCES)) {
    if (path.startsWith(src.prefix + '.')) {
      const sub = path.slice(src.prefix.length + 1);
      const g = src.fields.find((x) => x[0] === sub);
      if (g) return { path, label: g[1], type: g[2], source: key, prefix: src.prefix, sub };
    }
  }
  return null;
}
export function sourceForPrefix(prefix) {
  const k = Object.keys(SOURCES).find((s) => SOURCES[s].prefix === prefix);
  return k ? Object.assign({ key: k }, SOURCES[k]) : null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Formats a value. fmt is optional: '$#,##0', '$#,##0.00', '#,##0', '0%', 'd MMM yyyy', 'd MMMM yyyy'. */
export function formatValue(v, type, fmt) {
  if (v == null || v === '') return '';
  if (type === 'date') {
    const [y, m, d] = String(v).split('-').map(Number);
    const f = fmt || 'd MMM yyyy';
    const mon = f.includes('MMMM') ? MONTHS[m - 1] : MONTHS[m - 1].slice(0, 3);
    return `${d} ${mon} ${y}`;
  }
  if (type === 'currency') {
    const dec = fmt ? (fmt.includes('.00') ? 2 : 0) : 2;
    return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  if (type === 'percent') return Math.round(Number(v) * 100) + '%';
  if (type === 'number') return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return String(v);
}
/** Every way a value might already appear in an uploaded deck, with the format that produces it (for suggestions). */
export function formatVariants(v, type) {
  if (type === 'date') return [['d MMMM yyyy', formatValue(v, type, 'd MMMM yyyy')], ['d MMM yyyy', formatValue(v, type, 'd MMM yyyy')]];
  if (type === 'currency') return [['$#,##0.00', formatValue(v, type, '$#,##0.00')], ['$#,##0', formatValue(v, type, '$#,##0')]];
  if (type === 'image') return [];
  return [[null, formatValue(v, type)]];
}
