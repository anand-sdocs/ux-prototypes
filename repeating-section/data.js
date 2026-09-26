// Mock schema + records for the Repeating Section prototype.
// Primary object is Deal; related lists hang off it.

const DEAL_FIELDS = [
  { key: 'record_id', label: 'Deal.Record ID', type: 'number' },
  { key: 'name', label: 'Deal.Deal name', type: 'text' },
  { key: 'amount', label: 'Deal.Amount', type: 'currency' },
  { key: 'close_date', label: 'Deal.Close date', type: 'date' },
  { key: 'owner', label: 'Deal.Owner', type: 'text' },
  { key: 'company', label: 'Primary Company.Company name', type: 'text' },
  { key: 'street', label: 'Primary Company.Street Address', type: 'text' },
  { key: 'city', label: 'Primary Company.City', type: 'text' },
  { key: 'state', label: 'Primary Company.State/Region', type: 'text' },
  { key: 'postal', label: 'Primary Company.Postal Code', type: 'text' },
];

const RELATED_LISTS = [
  {
    key: 'line_items', label: 'Line Items', singular: 'Line Item', icon: 'box',
    description: 'Products and services on this deal',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'product_type', label: 'Product type', type: 'picklist', options: ['Hardware', 'Software', 'Service'] },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'product_image', label: 'Product image', type: 'image' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit_price', label: 'Unit price', type: 'currency' },
      { key: 'discount', label: 'Discount %', type: 'percent' },
      { key: 'net_price', label: 'Net price', type: 'currency' },
      { key: 'is_recurring', label: 'Is recurring', type: 'boolean' },
      { key: 'term_months', label: 'Term (months)', type: 'number' },
      { key: 'create_date', label: 'Create Date', type: 'date' },
    ],
  },
  {
    key: 'contact_roles', label: 'Contact Roles', singular: 'Contact Role', icon: 'users',
    description: 'People involved in the deal',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Role', type: 'picklist', options: ['Decision maker', 'Economic buyer', 'Technical buyer', 'Influencer'] },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'is_primary', label: 'Is primary', type: 'boolean' },
    ],
  },
  {
    key: 'milestones', label: 'Payment Milestones', singular: 'Milestone', icon: 'flag',
    description: 'Billing schedule for the deal',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'percent', label: 'Percent of total', type: 'percent' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'status', label: 'Status', type: 'picklist', options: ['Scheduled', 'Invoiced', 'Paid'] },
    ],
  },
  {
    key: 'quotes', label: 'Quotes', singular: 'Quote', icon: 'file',
    description: 'Earlier quotes on this deal',
    fields: [
      { key: 'number', label: 'Quote number', type: 'text' },
      { key: 'status', label: 'Status', type: 'picklist', options: ['Draft', 'Sent', 'Accepted', 'Expired'] },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'expires', label: 'Expires on', type: 'date' },
    ],
  },
];

function li(name, sku, type, desc, qty, unit, discount, recurring, term, date) {
  return {
    name, sku, product_type: type, description: desc, quantity: qty, unit_price: unit,
    discount, net_price: Math.round(qty * unit * (1 - discount / 100) * 100) / 100,
    is_recurring: recurring, term_months: term, create_date: date, product_image: null,
  };
}

const DEALS = [
  {
    id: 'DL-00412',
    label: 'Acme Corp — Platform expansion',
    record: {
      record_id: 412, name: 'Acme Corp — Platform expansion', amount: 38410, close_date: '2026-10-15',
      owner: 'Priya Raman', company: 'Acme Corporation', street: '500 Market Street', city: 'San Francisco',
      state: 'CA', postal: '94105',
    },
    lists: {
      line_items: [
        li('Edge Gateway X200', 'EGX-200', 'Hardware', 'Industrial-grade gateway with dual LTE failover and a fanless aluminium enclosure.', 4, 1850, 10, false, null, '2026-09-02'),
        li('Fleet Analytics Cloud', 'FAC-SEAT', 'Software', 'Real-time dashboards and alerts across every connected site.', 50, 38, 0, true, 12, '2026-09-02'),
        li('Onsite Installation', 'SRV-INST', 'Service', 'Two technicians for up to three days on site, including configuration and handover.', 1, 4200, 0, false, null, '2026-09-03'),
        li('Sensor Pack S12', 'SNS-S12', 'Hardware', 'Temperature, humidity and vibration sensors with a five-year battery.', 20, 145, 15, false, null, '2026-09-05'),
        li('Spare Mounting Kit', 'MNT-KIT', 'Hardware', '', 0, 60, 0, false, null, '2026-09-05'),
      ],
      contact_roles: [
        { name: 'Dana Whitfield', role: 'Decision maker', email: 'dana@acme.example', phone: '(415) 555-0142', is_primary: true },
        { name: 'Marco Ruiz', role: 'Technical buyer', email: 'marco@acme.example', phone: '(415) 555-0199', is_primary: false },
      ],
      milestones: [
        { name: 'Signature', due_date: '2026-10-15', percent: 50, amount: 19205, status: 'Scheduled' },
        { name: 'Go-live', due_date: '2026-12-01', percent: 50, amount: 19205, status: 'Scheduled' },
      ],
      quotes: [{ number: 'Q-1180', status: 'Expired', total: 41200, expires: '2026-08-30' }],
    },
  },
  {
    id: 'DL-00398',
    label: 'Globex — Annual renewal',
    record: {
      record_id: 398, name: 'Globex — Annual renewal', amount: 96120, close_date: '2026-11-01',
      owner: 'Sam Okafor', company: 'Globex International', street: '19 Harbour Road', city: 'Boston',
      state: 'MA', postal: '02110',
    },
    lists: {
      line_items: [
        li('Fleet Analytics Cloud', 'FAC-SEAT', 'Software', 'Real-time dashboards and alerts across every connected site.', 400, 36, 8, true, 12, '2026-08-20'),
        li('Advanced Alerting Add-on', 'FAC-ALRT', 'Software', 'Escalation policies, on-call rotations and SMS delivery.', 400, 6, 0, true, 12, '2026-08-20'),
        li('Premium Support', 'SUP-PREM', 'Service', '24/7 phone support with a four-hour response target.', 1, 14000, 0, true, 12, '2026-08-20'),
        li('Edge Gateway X200', 'EGX-200', 'Hardware', 'Industrial-grade gateway with dual LTE failover and a fanless aluminium enclosure.', 6, 1850, 12, false, null, '2026-08-21'),
        li('Data Retention Plus', 'FAC-RET', 'Software', 'Keeps raw telemetry for 36 months instead of 12.', 1, 4800, 0, true, 12, '2026-08-21'),
        li('Health Check', 'SRV-HC', 'Service', 'Quarterly configuration review by a solutions engineer.', 4, 900, 0, false, null, '2026-08-22'),
        li('Sensor Pack S12', 'SNS-S12', 'Hardware', 'Temperature, humidity and vibration sensors with a five-year battery.', 60, 145, 20, false, null, '2026-08-22'),
        li('Admin Training', 'SRV-TRN', 'Service', 'Half-day remote workshop for up to ten administrators.', 1, 1500, 100, false, null, '2026-08-23'),
      ],
      contact_roles: [
        { name: 'Helen Park', role: 'Economic buyer', email: 'hpark@globex.example', phone: '(617) 555-0110', is_primary: true },
        { name: 'Tom Becker', role: 'Influencer', email: 'tbecker@globex.example', phone: '', is_primary: false },
        { name: 'Aisha Noor', role: 'Technical buyer', email: 'anoor@globex.example', phone: '(617) 555-0187', is_primary: false },
      ],
      milestones: [
        { name: 'Annual invoice', due_date: '2026-11-01', percent: 100, amount: 96120, status: 'Scheduled' },
      ],
      quotes: [],
    },
  },
  {
    id: 'DL-00377',
    label: 'Initech — Pilot (no products yet)',
    record: {
      record_id: 377, name: 'Initech — Pilot', amount: 0, close_date: '2026-12-10',
      owner: 'Priya Raman', company: 'Initech LLC', street: '4120 Freidrich Lane', city: 'Austin',
      state: 'TX', postal: '78744',
    },
    lists: { line_items: [], contact_roles: [], milestones: [], quotes: [] },
  },
];

// Generated sample data: 3 records per related list, values derived from field types.
const SAMPLE = (() => {
  const record = {
    record_id: 1001, name: 'Sample Deal', amount: 25000, close_date: '2026-10-01', owner: 'Sample Owner',
    company: 'Sample Company', street: '123 Sample Street', city: 'Sample City', state: 'CA', postal: '00000',
  };
  const lists = {};
  RELATED_LISTS.forEach((l) => {
    lists[l.key] = [0, 1, 2].map((i) => {
      const item = {};
      l.fields.forEach((f) => {
        switch (f.type) {
          case 'text': item[f.key] = f.key === 'description' ? `Sample ${f.label.toLowerCase()} for ${l.singular.toLowerCase()} ${i + 1}.` : `Sample ${f.label} ${i + 1}`; break;
          case 'picklist': item[f.key] = f.options[i % f.options.length]; break;
          case 'number': item[f.key] = i + 1; break;
          case 'currency': item[f.key] = 1000 * (i + 1); break;
          case 'percent': item[f.key] = i * 5; break;
          case 'boolean': item[f.key] = i % 2 === 1; break;
          case 'date': item[f.key] = `2026-10-0${i + 1}`; break;
          case 'image': item[f.key] = null; break;
        }
      });
      return item;
    });
  });
  if (lists.line_items) lists.line_items.forEach((it, i) => { it.term_months = it.is_recurring ? 12 : null; });
  return { record, lists, sample: true };
})();
