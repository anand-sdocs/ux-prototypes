/* =====================================================================
   PDF Live Edit — mock data
   ---------------------------------------------------------------------
   Everything here mirrors what the real feature would read:

   ELEMENTS   one entry per data element (Merge_Data__c.Data_Element_Id__c).
              The same element can be placed many times; every placement
              shares one value. `doc` is the value printed in the current
              version of the PDF (the CedarEngine snapshot), `record` is
              what Salesforce holds now. Values are raw (a date is
              YYYY-MM-DD, a currency is a number) and formatted for print.

   PAGES      the template's background (what PDF.js would draw) and the
              placements, in PDF points on a US Letter page (612 x 792).
              CedarEngine stores positions as percentages; app.js converts.

   VERSIONS   the S-Doc's version history: each saved edit is a new
              ContentVersion plus the list of changes that made it.
   ===================================================================== */

window.LP_DATA = (function () {

  const TODAY = '2026-10-04';

  const USERS = {
    rep:  { id: 'rep',  name: 'Priya Raman', role: 'Account executive' },
    desk: { id: 'desk', name: 'Jordan Lee',  role: 'Deal desk' }
  };

  /* Records the document draws from. `via` is the relationship path from the
     base object, which is what the editor shows as the field's source. */
  const RECORDS = {
    Opportunity: { object: 'Opportunity', name: 'PseudoCo – Enterprise Rollout', via: [] },
    Account:     { object: 'Account',     name: 'PseudoCo, Inc.',                via: ['Account'] },
    Contact:     { object: 'Contact',     name: 'Maya Chen',                     via: ['Primary Contact'] },
    User:        { object: 'User',        name: 'Anand Narasimhan',              via: ['Owner'] },
    Runtime:     { object: 'S-Docs',      name: 'Generation',                    via: [] }
  };

  /* Field-level security for the two people the prototype can switch between.
     Keyed by record, then field; anything not listed is editable. */
  const FLS = {
    rep:  { Opportunity: { Discount__c: 'read' } },
    desk: { Account: '*read', Contact: '*read' }
  };

  const ELEMENTS = {
    /* ---- Opportunity (base record) ---- */
    'Opportunity.Name':                 { record: 'Opportunity', field: 'Name',                label: 'Opportunity Name',   type: 'text',     doc: 'PseudoCo – Enterprise Rollout', recordValue: 'PseudoCo – Enterprise Rollout' },
    'Opportunity.Order_Number__c':      { record: 'Opportunity', field: 'Order_Number__c',     label: 'Order Number',       type: 'text',     doc: 'OF-20931', recordValue: 'OF-20931',
                                          lock: { kind: 'auto', reason: 'Auto-number fields are set by Salesforce and can’t be changed.' } },
    'Opportunity.StageName':            { record: 'Opportunity', field: 'StageName',           label: 'Stage',              type: 'picklist', doc: 'Proposal/Price Quote', recordValue: 'Proposal/Price Quote',
                                          options: ['Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation', 'Closed Won', 'Closed Lost'] },
    'Opportunity.CloseDate':            { record: 'Opportunity', field: 'CloseDate',           label: 'Close Date',         type: 'date',     doc: '2026-11-29', recordValue: '2026-11-29',
                                          rule: { message: 'Close Date can’t be in the past.', test: v => v >= TODAY } },
    'Opportunity.Plan__c':              { record: 'Opportunity', field: 'Plan__c',             label: 'Plan',               type: 'picklist', doc: 'Enterprise Platform', recordValue: 'Enterprise Platform',
                                          options: ['Team', 'Business', 'Enterprise Platform', 'Enterprise Platform + Premier Support'] },
    'Opportunity.Seats__c':             { record: 'Opportunity', field: 'Seats__c',            label: 'Seats',              type: 'number',   doc: 1200, recordValue: 1250,
                                          drift: { who: 'Anand Narasimhan', when: 'Oct 2, 2026 09:14' } },
    'Opportunity.Term_Months__c':       { record: 'Opportunity', field: 'Term_Months__c',      label: 'Term',               type: 'picklist', doc: '36 months', recordValue: '36 months',
                                          options: ['12 months', '24 months', '36 months', '48 months'] },
    'Opportunity.Amount':               { record: 'Opportunity', field: 'Amount',              label: 'Amount',             type: 'currency', doc: 184000, recordValue: 184000 },
    'Opportunity.Discount__c':          { record: 'Opportunity', field: 'Discount__c',         label: 'Discount',           type: 'percent',  doc: 8, recordValue: 8 },
    'Opportunity.ExpectedRevenue':      { record: 'Opportunity', field: 'ExpectedRevenue',     label: 'Expected Revenue',   type: 'currency', doc: 138000, recordValue: 138000,
                                          lock: { kind: 'formula', reason: 'Salesforce calculates this from Amount and Probability, so it can’t be typed over.' } },
    'Opportunity.Payment_Terms__c':     { record: 'Opportunity', field: 'Payment_Terms__c',    label: 'Payment Terms',      type: 'picklist', doc: 'Net 30', recordValue: 'Net 45',
                                          options: ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'], override: 2 },
    'Opportunity.Billing_Frequency__c': { record: 'Opportunity', field: 'Billing_Frequency__c', label: 'Billing Frequency', type: 'picklist', doc: 'Annually in advance', recordValue: 'Annually in advance',
                                          options: ['Monthly', 'Quarterly in advance', 'Annually in advance'] },
    'Opportunity.Special_Terms__c':     { record: 'Opportunity', field: 'Special_Terms__c',    label: 'Special Terms',      type: 'textarea',
                                          doc: 'Customer may add up to 150 seats at the contracted per-seat rate during the first 12 months of the term. Pricing excludes applicable taxes.',
                                          recordValue: 'Customer may add up to 150 seats at the contracted per-seat rate during the first 12 months of the term. Pricing excludes applicable taxes.' },

    /* ---- Owner (User, two hops away) ---- */
    'Opportunity.Owner.Name':           { record: 'User', field: 'Name', label: 'Opportunity Owner', type: 'text', doc: 'Anand Narasimhan', recordValue: 'Anand Narasimhan',
                                          lock: { kind: 'user', reason: 'The owner is a Salesforce user. Change the Opportunity Owner on the record instead of editing the user’s name.' } },

    /* ---- Account (related record, one hop) ---- */
    'Opportunity.AccountId.Name':          { record: 'Account', field: 'Name',              label: 'Account Name',     type: 'text', doc: 'PseudoCo, Inc.', recordValue: 'PseudoCo, Inc.' },
    'Opportunity.AccountId.BillingStreet': { record: 'Account', field: 'BillingStreet',     label: 'Billing Street',   type: 'text', doc: '2200 Mission College Blvd', recordValue: '2200 Mission College Blvd, Building 4',
                                             drift: { who: 'Dana Okafor', when: 'Oct 3, 2026 11:02' } },
    'Opportunity.AccountId.BillingCity':   { record: 'Account', field: 'BillingCity',       label: 'Billing City',     type: 'text', doc: 'Santa Clara', recordValue: 'Santa Clara' },
    'Opportunity.AccountId.BillingState':  { record: 'Account', field: 'BillingState',      label: 'Billing State',    type: 'text', doc: 'CA', recordValue: 'CA' },
    'Opportunity.AccountId.BillingPostalCode': { record: 'Account', field: 'BillingPostalCode', label: 'Billing Zip/Postal Code', type: 'text', doc: '95054', recordValue: '95054' },

    /* ---- Primary contact (custom lookup, one hop) ---- */
    'Opportunity.Primary_Contact__c.Name':  { record: 'Contact', field: 'Name',  label: 'Contact Name', type: 'text', doc: 'Maya Chen', recordValue: 'Maya Chen',
                                              lock: { kind: 'compound', reason: 'Name is made from First Name and Last Name, so it can’t be edited as one value. Change it on the Contact.' } },
    'Opportunity.Primary_Contact__c.Title': { record: 'Contact', field: 'Title', label: 'Title', type: 'text', doc: 'VP, IT Operations', recordValue: 'VP, IT Operations' },
    'Opportunity.Primary_Contact__c.Email': { record: 'Contact', field: 'Email', label: 'Email', type: 'email', doc: 'maya.chen@pseudoco.example', recordValue: 'maya.chen@pseudoco.example' },
    'Opportunity.Primary_Contact__c.Phone': { record: 'Contact', field: 'Phone', label: 'Phone', type: 'phone', doc: '(408) 555-0142', recordValue: '(408) 555-0142' },

    /* ---- Runtime values ---- */
    'Runtime.Date': { record: 'Runtime', field: 'Date', label: 'Generated Date', type: 'date', doc: '2026-09-28', recordValue: '2026-09-28',
                      lock: { kind: 'system', reason: 'S-Docs filled this in when the document was generated.' } }
  };

  /* Signer (INPUT) fields. They belong to e-signature, so Live Edit shows them
     where they sit and never lets anyone change them. */
  const SIGNER_FIELDS = {
    's1-sign':     { signer: 1, type: 'signature', label: 'Signature',  who: 'Maya Chen',        stand: 'Sign here' },
    's1-date':     { signer: 1, type: 'date',      label: 'Date signed', who: 'Maya Chen',       stand: 'Date' },
    's1-initials': { signer: 1, type: 'initials',  label: 'Initials',   who: 'Maya Chen',        stand: 'Initials' },
    's2-sign':     { signer: 2, type: 'signature', label: 'Signature',  who: 'Anand Narasimhan', stand: 'Sign here' },
    's2-date':     { signer: 2, type: 'date',      label: 'Date signed', who: 'Anand Narasimhan', stand: 'Date' }
  };

  /* ---- Page backgrounds and placements, in PDF points (612 x 792) ----
     bg items:  t  — text   { x, y, s, text, b?, tone?, align?, w? }   (y is the top of the line)
                r  — rule   { x, y, w }
                band        { x, y, w, h }
     fields:    { el, x, y, w, h, s, b?, align? }   or   { signer, x, y, w, h } */

  const L = 48, R = 564, W = 516;          // margins
  const LBL = 48, VAL = 170, VW = 394;     // label column, value column

  function footer(n) {
    return {
      bg: [
        { t: 'r', x: L, y: 744, w: W },
        { t: 't', x: L, y: 755, s: 7.5, tone: 'muted', text: 'Order Form ·' },
        { t: 't', x: R, y: 755, s: 7.5, tone: 'muted', align: 'right', text: `Page ${n} of 3` }
      ],
      fields: [{ el: 'Opportunity.Name', x: 96, y: 754, w: 280, h: 11, s: 7.5, tone: 'muted' }]
    };
  }

  function header() {
    return [
      { t: 't', x: L, y: 34, s: 11, b: true, tone: 'accent', text: 'LUMEN SYSTEMS' },
      { t: 't', x: R, y: 36, s: 7.5, tone: 'muted', align: 'right', text: 'Order Form' },
      { t: 'r', x: L, y: 56, w: W }
    ];
  }

  function row(label, y, el, extra) {
    return {
      bg: { t: 't', x: LBL, y: y + 2, s: 8.5, tone: 'muted', text: label },
      field: Object.assign({ el, x: VAL, y, w: VW, h: 14, s: 10 }, extra || {})
    };
  }

  function page(n, bg, fields) {
    const f = footer(n);
    return { n, bg: bg.concat(f.bg), fields: fields.concat(f.fields) };
  }

  /* ---------------- Page 1: customer and opportunity ---------------- */
  const p1rows = [
    row('Company', 166, 'Opportunity.AccountId.Name', { b: true }),
    row('Billing address', 190, 'Opportunity.AccountId.BillingStreet'),
    row('Primary contact', 238, 'Opportunity.Primary_Contact__c.Name'),
    row('Title', 262, 'Opportunity.Primary_Contact__c.Title'),
    row('Email', 286, 'Opportunity.Primary_Contact__c.Email', { w: 196 }),
    row('Opportunity', 352, 'Opportunity.Name'),
    row('Account executive', 376, 'Opportunity.Owner.Name'),
    row('Stage', 400, 'Opportunity.StageName', { w: 200 }),
    row('Offer valid until', 424, 'Opportunity.CloseDate', { w: 200 })
  ];

  const page1 = page(1,
    [
      { t: 't', x: L, y: 32, s: 15, b: true, tone: 'accent', text: 'LUMEN SYSTEMS' },
      { t: 't', x: R, y: 30, s: 7.5, tone: 'muted', align: 'right', text: '1 Market Street, Suite 900 · San Francisco, CA 94105' },
      { t: 't', x: R, y: 42, s: 7.5, tone: 'muted', align: 'right', text: 'lumensystems.example · (415) 555-0100' },
      { t: 'r', x: L, y: 62, w: W },
      { t: 't', x: L, y: 84, s: 24, b: true, text: 'Order Form' },
      { t: 't', x: 392, y: 82, s: 8.5, tone: 'muted', text: 'Order no.' },
      { t: 't', x: 392, y: 100, s: 8.5, tone: 'muted', text: 'Date' },
      { t: 't', x: L, y: 138, s: 10.5, b: true, tone: 'accent', text: 'CUSTOMER' },
      { t: 'r', x: L, y: 154, w: W },
      { t: 't', x: 372, y: 288, s: 8.5, tone: 'muted', text: 'Phone' },
      { t: 't', x: L, y: 324, s: 10.5, b: true, tone: 'accent', text: 'OPPORTUNITY' },
      { t: 'r', x: L, y: 340, w: W },
      { t: 'r', x: L, y: 470, w: W },
      { t: 't', x: L, y: 484, s: 8.5, w: W, tone: 'muted',
        text: 'This Order Form is governed by the Master Subscription Agreement between Lumen Systems, Inc. and the Customer named above. Capitalized terms that are not defined here have the meanings given to them in that agreement. If the two conflict, this Order Form controls for the subscription it describes.' }
    ].concat(p1rows.map(r => r.bg)),
    [
      { el: 'Opportunity.Order_Number__c', x: 450, y: 80, w: 114, h: 14, s: 10, align: 'right', b: true },
      { el: 'Runtime.Date', x: 450, y: 98, w: 114, h: 14, s: 10, align: 'right' },
      { el: 'Opportunity.AccountId.BillingCity', x: VAL, y: 208, w: 130, h: 14, s: 10 },
      { el: 'Opportunity.AccountId.BillingState', x: 304, y: 208, w: 34, h: 14, s: 10 },
      { el: 'Opportunity.AccountId.BillingPostalCode', x: 342, y: 208, w: 80, h: 14, s: 10 },
      { el: 'Opportunity.Primary_Contact__c.Phone', x: 410, y: 286, w: 154, h: 14, s: 10 }
    ].concat(p1rows.map(r => r.field))
  );

  /* ---------------- Page 2: commercial terms ---------------- */
  const page2 = page(2,
    header().concat([
      { t: 't', x: L, y: 76, s: 18, b: true, text: 'Commercial terms' },
      { t: 'band', x: L, y: 112, w: W, h: 20 },
      { t: 't', x: 56,  y: 118, s: 7.5, b: true, text: 'PLAN' },
      { t: 't', x: 290, y: 118, s: 7.5, b: true, text: 'SEATS' },
      { t: 't', x: 356, y: 118, s: 7.5, b: true, text: 'TERM' },
      { t: 't', x: 556, y: 118, s: 7.5, b: true, align: 'right', text: 'ANNUAL FEE' },
      { t: 'r', x: L, y: 164, w: W },
      { t: 't', x: 356, y: 180, s: 8.5, tone: 'muted', text: 'Discount' },
      { t: 't', x: 356, y: 200, s: 8.5, tone: 'muted', text: 'Expected revenue' },
      { t: 't', x: L, y: 240, s: 10.5, b: true, tone: 'accent', text: 'BILLING' },
      { t: 'r', x: L, y: 256, w: W },
      { t: 't', x: LBL, y: 270, s: 8.5, tone: 'muted', text: 'Payment terms' },
      { t: 't', x: LBL, y: 294, s: 8.5, tone: 'muted', text: 'Billing frequency' },
      { t: 't', x: L, y: 330, s: 10.5, b: true, tone: 'accent', text: 'SPECIAL TERMS' },
      { t: 'r', x: L, y: 346, w: W },
      { t: 'r', x: L, y: 416, w: W },
      { t: 't', x: L, y: 430, s: 8.5, w: W, tone: 'muted',
        text: 'Fees are invoiced on the billing frequency above and are due within the payment terms from the invoice date. All amounts are in US dollars. Seats can be added at any time and are prorated to the end of the current term; seats can’t be removed during a term.' },
      { t: 't', x: 392, y: 700, s: 8, tone: 'muted', text: 'Customer initials' }
    ]),
    [
      { el: 'Opportunity.Plan__c', x: 56, y: 142, w: 224, h: 14, s: 10, b: true },
      { el: 'Opportunity.Seats__c', x: 290, y: 142, w: 58, h: 14, s: 10 },
      { el: 'Opportunity.Term_Months__c', x: 356, y: 142, w: 100, h: 14, s: 10 },
      { el: 'Opportunity.Amount', x: 462, y: 142, w: 94, h: 14, s: 10, align: 'right', b: true },
      { el: 'Opportunity.Discount__c', x: 462, y: 178, w: 94, h: 14, s: 10, align: 'right' },
      { el: 'Opportunity.ExpectedRevenue', x: 462, y: 198, w: 94, h: 14, s: 10, align: 'right' },
      { el: 'Opportunity.Payment_Terms__c', x: VAL, y: 268, w: 200, h: 14, s: 10 },
      { el: 'Opportunity.Billing_Frequency__c', x: VAL, y: 292, w: 200, h: 14, s: 10 },
      { el: 'Opportunity.Special_Terms__c', x: L, y: 356, w: W, h: 40, s: 10, multi: true },
      { signer: 's1-initials', x: 470, y: 694, w: 94, h: 22 }
    ]
  );

  /* ---------------- Page 3: acceptance ---------------- */
  const C2 = 324;
  const page3 = page(3,
    header().concat([
      { t: 't', x: L, y: 76, s: 18, b: true, text: 'Acceptance' },
      { t: 't', x: L, y: 112, s: 9, w: W,
        text: 'By signing below, each party agrees to this Order Form, including the commercial terms on page 2, and to the Master Subscription Agreement. This Order Form takes effect on the date of the last signature, and the subscription term starts on that date.' },
      { t: 't', x: L,  y: 176, s: 8, b: true, tone: 'accent', text: 'CUSTOMER' },
      { t: 't', x: C2, y: 176, s: 8, b: true, tone: 'accent', text: 'PROVIDER' },
      { t: 't', x: C2, y: 194, s: 11, b: true, text: 'Lumen Systems, Inc.' },
      { t: 'r', x: L,  y: 278, w: 240 },
      { t: 'r', x: C2, y: 278, w: 240 },
      { t: 't', x: L,  y: 282, s: 7.5, tone: 'muted', text: 'Signature' },
      { t: 't', x: C2, y: 282, s: 7.5, tone: 'muted', text: 'Signature' },
      { t: 't', x: L,  y: 308, s: 8.5, tone: 'muted', text: 'Name' },
      { t: 't', x: C2, y: 308, s: 8.5, tone: 'muted', text: 'Name' },
      { t: 't', x: L,  y: 332, s: 8.5, tone: 'muted', text: 'Title' },
      { t: 't', x: C2, y: 332, s: 8.5, tone: 'muted', text: 'Title' },
      { t: 't', x: 386, y: 330, s: 10, text: 'Account Executive' },
      { t: 't', x: L,  y: 358, s: 8.5, tone: 'muted', text: 'Date' },
      { t: 't', x: C2, y: 358, s: 8.5, tone: 'muted', text: 'Date' }
    ]),
    [
      { el: 'Opportunity.AccountId.Name', x: L, y: 192, w: 240, h: 16, s: 11, b: true },
      { signer: 's1-sign', x: L,  y: 236, w: 240, h: 38 },
      { signer: 's2-sign', x: C2, y: 236, w: 240, h: 38 },
      { el: 'Opportunity.Primary_Contact__c.Name', x: 110, y: 306, w: 178, h: 14, s: 10 },
      { el: 'Opportunity.Owner.Name', x: 386, y: 306, w: 178, h: 14, s: 10 },
      { el: 'Opportunity.Primary_Contact__c.Title', x: 110, y: 330, w: 178, h: 14, s: 10 },
      { signer: 's1-date', x: 110, y: 352, w: 130, h: 20 },
      { signer: 's2-date', x: 386, y: 352, w: 130, h: 20 }
    ]
  );

  /* ---------------- Version history (audit) ---------------- */
  const VERSIONS = [
    {
      n: 2, kind: 'edited', who: 'Priya Raman', when: 'Oct 1, 2026 16:40',
      reason: 'Pricing call: customer asked for Net 30, and gave Maya’s new direct line.',
      changes: [
        { el: 'Opportunity.Payment_Terms__c', from: 'Net 45', to: 'Net 30', scope: 'doc' },
        { el: 'Opportunity.Primary_Contact__c.Phone', from: '(408) 555-0100', to: '(408) 555-0142', scope: 'record' }
      ]
    },
    {
      n: 1, kind: 'generated', who: 'Anand Narasimhan', when: 'Sep 28, 2026 10:12',
      reason: 'Generated from the Enterprise Order Form template.',
      changes: []
    }
  ];

  return {
    TODAY, USERS, RECORDS, FLS, ELEMENTS, SIGNER_FIELDS, VERSIONS,
    PAGES: [page1, page2, page3],
    DOC: {
      template: 'Enterprise Order Form',
      sdoc: 'SD-000482',
      file: 'PseudoCo – Enterprise Rollout – Enterprise Order Form – SD-000482.pdf'
    }
  };
})();
