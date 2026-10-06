/* =========================================================================
   S-Docs Cards — business-admin prototype behaviour
   Views: list (per object, ordered) · editor (6-step wizard + live preview) · test.
   ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------- helpers ------------------------------- */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let seq = 0;
  const uid = p => p + '-' + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'c_$1').slice(0, 60);
  const isBlank = v => v == null || v === '' || (Array.isArray(v) && !v.length);
  const toList = v => Array.isArray(v) ? v.slice() : String(v == null ? '' : v).split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const lc = v => String(v == null ? '' : v).toLowerCase();
  const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
  const TODAY = '2026-10-02';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
  const pad = n => String(n).padStart(2, '0');
  const stamp = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const clock = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

  /* -------------------------------- icons -------------------------------- */
  const P = {
    eye: '<path d="M1.6 12S5.3 5.5 12 5.5 22.4 12 22.4 12 18.7 18.5 12 18.5 1.6 12 1.6 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A10 10 0 0 1 12 5.5c6.7 0 10.4 6.5 10.4 6.5a17 17 0 0 1-3.1 3.8"/><path d="M6.4 6.5A17 17 0 0 0 1.6 12S5.3 18.5 12 18.5a9.6 9.6 0 0 0 4.4-1"/>',
    edit: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    versions: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><polyline points="3.5 4 3.5 9 8.5 9"/><polyline points="12 7.5 12 12 15 13.8"/>',
    sign: '<path d="M3 18c3.5 0 4-12 7.5-12 2 0 2 3.2 0 7.2C8.8 16.4 6.6 18 4.5 18c3 0 5-1.4 7-3.6"/><path d="M13 14.5c1.6 0 2.6-.8 3.6-.8.9 0 1 .9 2 .9.8 0 1.6-.4 2.4-1.1"/><line x1="3" y1="21" x2="21" y2="21"/>',
    email: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><polyline points="3 7 12 13.5 21 7"/>',
    download: '<path d="M6.5 18a4.5 4.5 0 0 1-.3-9 6 6 0 0 1 11.5 1.3A3.8 3.8 0 0 1 17.5 18"/><polyline points="9.5 13.5 12 16 14.5 13.5"/><line x1="12" y1="9.5" x2="12" y2="16"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><polyline points="20.5 4 20.5 9.5 15 9.5"/>',
    trash: '<polyline points="4 6.5 20 6.5"/><path d="M9 6.5V4.5h6v2"/><path d="M6.5 6.5 7.5 20h9l1-13.5"/>',
    inperson: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><polyline points="15.5 11 17.5 13 21.5 9"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    check: '<polyline points="4 12.5 9.5 18 20 6.5"/>',
    alert: '<path d="M10.3 3.9 1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13.5"/><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.6" r=".9" fill="currentColor" stroke="none"/>',
    up: '<polyline points="6 15 12 9 18 15"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    top: '<line x1="5" y1="4" x2="19" y2="4"/><polyline points="7 14 12 9 17 14"/><line x1="12" y1="9" x2="12" y2="20"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.5V3"/><line x1="7.5" y1="14.5" x2="16.5" y2="14.5"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    code: '<polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/><line x1="13.5" y1="5" x2="10.5" y2="19"/>',
    shield: '<path d="M12 2.8 4 6v5.5c0 4.7 3.3 8.6 8 9.7 4.7-1.1 8-5 8-9.7V6Z"/><polyline points="8.5 12 11 14.5 15.5 9.5"/>',
    form: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="14" y2="13"/><line x1="7" y1="17" x2="11" y2="17"/>',
    sliders: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2.2" fill="currentColor"/><circle cx="15" cy="12" r="2.2" fill="currentColor"/><circle cx="7" cy="18" r="2.2" fill="currentColor"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.3-6 8-6s7 2 8 6"/>',
    record: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    flowscreen: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/><polyline points="9 11 11 13 15 9"/>',
    puzzle: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    layers: '<polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 12.5 12 17.5 21 12.5"/>',
    file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8Z"/><polyline points="14 3 14 8 19 8"/>',
    cursor: '<path d="M5 3l14 7-6 2-2 6Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    power: '<path d="M12 3v9"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    grip: '<circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/>'
  };
  const ic = (name, size, sw) => `<svg width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  const starSvg = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon class="${on ? 'on' : 'off'}" points="12,2.6 14.9,8.8 21.6,9.7 16.7,14.4 17.9,21.1 12,17.9 6.1,21.1 7.3,14.4 2.4,9.7 9.1,8.8"/></svg>`;
  const CARET = '<svg class="sd-combo-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
  const LOGO = '<svg class="sd-logo" viewBox="0 0 100 100" aria-hidden="true"><polygon points="6,6 40,6 54,30 40,54 6,54 20,30" fill="#f2793c"/><polygon points="56,48 56,18 76,4 96,18 96,48 76,34" fill="#8b6fe8"/><rect x="6" y="58" width="40" height="36" rx="4" fill="#2f8fe0"/><rect x="54" y="58" width="42" height="36" rx="4" fill="#6fbf73"/></svg>';

  /* =======================================================================
     CATALOG (what the org has)
     ======================================================================= */
  const OBJECTS = {
    Opportunity: { label: 'Opportunity', color: '#fcb95b' },
    Account:     { label: 'Account',     color: '#5867e8' },
    Quote:       { label: 'Quote',       color: '#2e844a' },
    Case:        { label: 'Case',        color: '#f2793c' },
    Contract:    { label: 'Contract',    color: '#8b6fe8' },
    Order:       { label: 'Order',       color: '#06a59a' },
    Lead:        { label: 'Lead',        color: '#e3066a' },
    Project__c:  { label: 'Project',     color: '#3ba755' },
    Invoice__c:  { label: 'Invoice',     color: '#0b827c' }
  };
  const OBJ = k => OBJECTS[k] || { label: k, color: '#8b93a1' };
  const ALL_OBJECTS = Object.keys(OBJECTS);
  // The left rail lists only objects that have at least one saved S-Docs Card.
  const railObjects = () => ALL_OBJECTS.filter(o => (state.configs[o] || []).length);
  const objOptions = () => ALL_OBJECTS.slice().sort((a, b) => OBJ(a).label.localeCompare(OBJ(b).label)).map(o => [o, OBJ(o).label + (o.endsWith('__c') ? ' (custom)' : '')]);

  const PICK = {
    region: ['North America', 'EMEA', 'APAC', 'LATAM'],
    industry: ['Technology', 'Manufacturing', 'Retail', 'Healthcare', 'Financial Services']
  };
  const FIELDS = {
    Opportunity: [
      { p: 'Name', l: 'Opportunity Name', t: 'text' },
      { p: 'Amount', l: 'Amount', t: 'currency' },
      { p: 'Type', l: 'Type', t: 'picklist', o: ['New Business', 'Renewal', 'Upsell', 'Partner Resale'] },
      { p: 'StageName', l: 'Stage', t: 'picklist', o: ['Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'] },
      { p: 'CloseDate', l: 'Close Date', t: 'date' },
      { p: 'Probability', l: 'Probability (%)', t: 'percent' },
      { p: 'LeadSource', l: 'Lead Source', t: 'picklist', o: ['Web', 'Partner Referral', 'Trade Show', 'Outbound'] },
      { p: 'OwnerId', l: 'Owner ID', t: 'id' },
      { p: 'Account.Industry', l: 'Account › Industry', t: 'picklist', o: PICK.industry },
      { p: 'Account.Type', l: 'Account › Type', t: 'picklist', o: ['Customer', 'Prospect', 'Partner'] },
      { p: 'Account.BillingCountry', l: 'Account › Billing Country', t: 'text' },
      { p: 'Owner.Region__c', l: 'Owner › Region', t: 'picklist', o: PICK.region }
    ],
    Account: [
      { p: 'Name', l: 'Account Name', t: 'text' },
      { p: 'Type', l: 'Type', t: 'picklist', o: ['Customer', 'Prospect', 'Partner'] },
      { p: 'Rating', l: 'Rating', t: 'picklist', o: ['Hot', 'Warm', 'Cold'] },
      { p: 'Industry', l: 'Industry', t: 'picklist', o: PICK.industry },
      { p: 'AnnualRevenue', l: 'Annual Revenue', t: 'currency' },
      { p: 'BillingCountry', l: 'Billing Country', t: 'text' },
      { p: 'Owner.Region__c', l: 'Owner › Region', t: 'picklist', o: PICK.region }
    ],
    Quote: [
      { p: 'Name', l: 'Quote Name', t: 'text' },
      { p: 'Status', l: 'Status', t: 'picklist', o: ['Draft', 'Needs Review', 'Approved', 'Rejected'] },
      { p: 'GrandTotal', l: 'Grand Total', t: 'currency' },
      { p: 'Discount', l: 'Discount (%)', t: 'percent' },
      { p: 'ExpirationDate', l: 'Expiration Date', t: 'date' },
      { p: 'Opportunity.Type', l: 'Opportunity › Type', t: 'picklist', o: ['New Business', 'Renewal', 'Upsell', 'Partner Resale'] }
    ],
    Case: [
      { p: 'Subject', l: 'Subject', t: 'text' },
      { p: 'Status', l: 'Status', t: 'picklist', o: ['New', 'Working', 'Escalated', 'Closed'] },
      { p: 'Priority', l: 'Priority', t: 'picklist', o: ['Low', 'Medium', 'High'] },
      { p: 'Origin', l: 'Case Origin', t: 'picklist', o: ['Phone', 'Email', 'Web'] },
      { p: 'Account.Rating', l: 'Account › Rating', t: 'picklist', o: ['Hot', 'Warm', 'Cold'] }
    ],
    Contract: [
      { p: 'Status', l: 'Status', t: 'picklist', o: ['Draft', 'In Approval', 'Activated'] },
      { p: 'StartDate', l: 'Start Date', t: 'date' },
      { p: 'ContractTerm', l: 'Contract Term (months)', t: 'number' },
      { p: 'Account.Industry', l: 'Account › Industry', t: 'picklist', o: PICK.industry }
    ]
  };
  const GENERIC_FIELDS = [{ p: 'Name', l: 'Name', t: 'text' }, { p: 'Status__c', l: 'Status', t: 'picklist', o: ['Open', 'Closed'] }];
  const fieldsOf = obj => FIELDS[obj] || GENERIC_FIELDS;
  const USER_FIELDS = [
    { p: 'Department', l: 'Department', t: 'text' },
    { p: 'Title', l: 'Title', t: 'text' },
    { p: 'Region__c', l: 'Region', t: 'picklist', o: PICK.region },
    { p: 'LanguageLocaleKey', l: 'Language', t: 'picklist', o: ['en_US', 'de', 'fr', 'ja'] },
    { p: 'Id', l: 'User ID', t: 'id' },
    { p: 'Manager.Department', l: 'Manager › Department', t: 'text' }
  ];
  const DIRECTORY = {
    profile: ['System Administrator', 'Sales User', 'Service User', 'Partner Community User', 'Customer Community User'],
    role: ['VP_Sales', 'Sales_Manager', 'Account_Executive', 'Deal_Desk_Analyst', 'Partner_Manager', 'Support_Agent'],
    permset: ['Deal_Desk', 'Legal_Reviewer', 'Pricing_Approver', 'SDocs_User'],
    custperm: ['Approve_Discounts', 'View_Margin', 'Send_Unsigned_Contracts'],
    group: ['Sales_Team', 'EMEA_Sales', 'Legal', 'Partner_Ops', 'Support']
  };
  const APEX = {
    condition: ['TerritoryEligibility', 'CreditCheckCondition'],
    before: ['PricingSnapshot', 'ResolveSigner', 'TaxCalculator'],
    after: ['SyncToERP', 'NotifyDealDesk', 'ArchiveToSharePoint']
  };
  const FLOWS = {
    before: ['Calc_Uplift', 'Get_Approved_Discount', 'Lookup_Tax_Region'],
    after: ['Log_Proposal_Sent', 'Create_Followup_Task', 'Notify_Account_Team']
  };
  const EMAIL_TEMPLATES = ['Proposal cover email', 'Standard document email', 'Renewal notice', 'Case update'];
  const CONTACTS = ['Dana Whitfield — Signatory', 'Marcus Reyes — Legal Counsel', 'Priya Anand — Procurement'];

  const LIB = {
    Opportunity: [
      { id: 't1',  name: 'Statement of Work', desc: 'Scope, deliverables and milestones for a new engagement.', out: 'PseudoCo Statement of Work', fmt: 'PDF', esign: true },
      { id: 't2',  name: 'New Customer Onboarding Kit', desc: 'Welcome pack, account setup checklist and support contacts.', out: 'PseudoCo Onboarding Kit', fmt: 'PDF' },
      { id: 't3',  name: 'Proposal Template', desc: 'Executive summary, pricing and terms for a new opportunity.', out: 'PseudoCo Proposal', fmt: 'PDF' },
      { id: 't4',  name: 'Non-Disclosure Agreement (NDA)', desc: 'Mutual confidentiality agreement on standard paper.', out: 'PseudoCo Non-Disclosure Agreement (NDA)', fmt: 'PDF', esign: true },
      { id: 't5',  name: 'Vendor Terms Agreement', desc: 'Master vendor terms, SLAs and payment schedule.', out: 'Vendor Terms Agreement – PseudoCo', fmt: 'PDF', esign: true },
      { id: 't6',  name: 'Service Invoice', desc: 'Itemised invoice with line items pulled from the opportunity.', out: 'Service Invoice', fmt: 'XLS' },
      { id: 't7',  name: 'Sales Contract', desc: 'Standard order agreement for direct enterprise sales.', out: 'PseudoCo Sales Contract', fmt: 'PDF', esign: true },
      { id: 't9',  name: 'Order Form', desc: 'Products, quantities and net pricing for signature.', out: 'PseudoCo Order Form', fmt: 'PDF', esign: true },
      { id: 't10', name: 'Master Services Agreement', desc: 'Umbrella agreement governing all future statements of work.', out: 'PseudoCo Master Services Agreement', fmt: 'PDF', esign: true },
      { id: 't11', name: 'Data Processing Addendum', desc: 'GDPR / CCPA processing terms and sub-processor list.', out: 'PseudoCo Data Processing Addendum', fmt: 'PDF', esign: true },
      { id: 't12', name: 'Renewal Quote', desc: 'Uplift pricing and term options for an expiring subscription.', out: 'PseudoCo Renewal Quote', fmt: 'PDF' },
      { id: 't13', name: 'Change Order', desc: 'Amendment to scope, price or term on an executed contract.', out: 'PseudoCo Change Order', fmt: 'PDF', esign: true },
      { id: 't14', name: 'Security Questionnaire', desc: 'Standard responses to customer security due diligence.', out: 'Security Questionnaire', fmt: 'XLS' },
      { id: 't15', name: 'Mutual NDA (Counterparty Paper)', desc: 'Redline-ready NDA for when the customer supplies the form.', out: 'Mutual NDA – Counterparty Paper', fmt: 'DOCX' },
      { id: 't18', name: 'Welcome Letter', desc: 'Signed welcome note from the account executive.', out: 'PseudoCo Welcome Letter', fmt: 'PDF' }
    ],
    Account: [
      { id: 'a1', name: 'Account Plan', desc: 'Goals, stakeholders and whitespace for the year.', fmt: 'PDF' },
      { id: 'a2', name: 'Customer Welcome Letter', desc: 'A short welcome from the account team.', fmt: 'PDF' },
      { id: 'a3', name: 'Credit Application', desc: 'Trade references and credit terms request.', fmt: 'DOCX', esign: true },
      { id: 'a4', name: 'Annual Account Statement', desc: 'Every invoice and payment this year.', fmt: 'XLS' }
    ],
    Quote: [
      { id: 'q1', name: 'Quote PDF', desc: 'Standard customer-facing quote.', fmt: 'PDF', esign: true },
      { id: 'q2', name: 'Quote — Multi-currency', desc: 'Quote with a currency table per region.', fmt: 'PDF', esign: true },
      { id: 'q3', name: 'Price Sheet', desc: 'Line-item pricing export.', fmt: 'XLS' },
      { id: 'q4', name: 'Discount Approval Memo', desc: 'Justification for discounts over policy.', fmt: 'DOCX' }
    ],
    Case: [
      { id: 'c1', name: 'Case Summary', desc: 'Timeline and resolution notes.', fmt: 'PDF' },
      { id: 'c2', name: 'RMA Form', desc: 'Return merchandise authorisation.', fmt: 'PDF', esign: true },
      { id: 'c3', name: 'Service Report', desc: 'On-site visit report.', fmt: 'DOCX' }
    ],
    Contract: [
      { id: 'k1', name: 'Contract Summary', desc: 'Key terms on one page.', fmt: 'PDF' },
      { id: 'k2', name: 'Contract Amendment', desc: 'Changes to an activated contract.', fmt: 'DOCX', esign: true }
    ]
  };
  const libTpl = (obj, tid) => (LIB[obj] || []).find(t => t.id === tid);

  const ACTIONS = [
    { k: 'preview',  l: 'Preview',           d: 'Open the document in a viewer.',              icon: 'eye',      surface: 'menu' },
    { k: 'download', l: 'Download',          d: 'One file, or a ZIP when several are picked.', icon: 'download', surface: 'both', settings: true },
    { k: 'edit',     l: 'Edit',              d: 'Live-edit the generated document.',           icon: 'edit',     surface: 'menu', settings: true },
    { k: 'refresh',  l: 'Refresh',           d: 'Regenerate with the latest record data.',     icon: 'refresh',  surface: 'both' },
    { k: 'versions', l: 'Versions',          d: 'See and restore earlier versions.',           icon: 'versions', surface: 'menu' },
    { k: 'delete',   l: 'Delete',            d: 'Remove the document from the record.',        icon: 'trash',    surface: 'menu', settings: true },
    { k: 'email',    l: 'Email',             d: 'Send documents from S-Docs.',                 icon: 'email',    surface: 'both', settings: true },
    { k: 'sign',     l: 'Request signature', d: 'Send documents out for e-signature.',         icon: 'sign',     surface: 'both', settings: true, short: 'Signature' },
    { k: 'inperson', l: 'Sign in person',    d: 'Hand the device to a signer who is present.', icon: 'inperson', surface: 'menu', short: 'In person' }
  ];
  const ACTION_DEFAULTS = {
    download: { format: 'original', zip: true },
    edit: { formats: ['PDF', 'DOCX'], newVersion: true },
    delete: { deleteFile: true },
    email: { template: 'Standard document email', to: 'Account.Billing_Contact__r.Email', cc: '', lockTo: false, lockSubject: false, lockBody: false, logActivity: true },
    sign: { signerSource: 'contactRoles', signerFields: '', expires: 30, reminder: 3, reorder: true }
  };
  const PLACEMENTS = [
    { k: 'record',     l: 'Record page',        icon: 'record' },
    { k: 'experience', l: 'Experience Cloud',   icon: 'globe' },
    { k: 'flow',       l: 'Screen flow',        icon: 'flowscreen' },
    { k: 'embedded',   l: 'Embedded in an LWC', icon: 'puzzle' }
  ];
  const PL = Object.fromEntries(PLACEMENTS.map(p => [p.k, p]));
  const STEP_TYPES = {
    validation: { l: 'Validation',   icon: 'shield' },
    prompt:     { l: 'Ask the user', icon: 'form' },
    apex:       { l: 'Apex',         icon: 'code' },
    flow:       { l: 'Flow',         icon: 'bolt' }
  };
  const INPUT_TYPES = ['Text', 'Long text', 'Number', 'Currency', 'Percent', 'Date', 'Checkbox', 'Picklist', 'Record lookup', 'Contact'];

  /* ---------------------------- sample records ---------------------------- */
  const RECORDS = {
    Opportunity: [
      { Id: '0065g00000PsCoA1', Name: 'PseudoCo – Enterprise Rollout', Amount: 184000, Type: 'New Business', StageName: 'Proposal/Price Quote', CloseDate: '2026-11-29', Probability: 75, LeadSource: 'Partner Referral', OwnerId: 'u1', 'Account.Industry': 'Technology', 'Account.Type': 'Customer', 'Account.BillingCountry': 'United States', 'Owner.Region__c': 'North America' },
      { Id: '0065g00000AcmRn2', Name: 'Acme – 2027 Renewal', Amount: 62000, Type: 'Renewal', StageName: 'Negotiation/Review', CloseDate: '2026-12-15', Probability: 90, LeadSource: 'Outbound', OwnerId: 'u2', 'Account.Industry': 'Manufacturing', 'Account.Type': 'Customer', 'Account.BillingCountry': 'Germany', 'Owner.Region__c': 'EMEA' },
      { Id: '0065g00000GlxSt3', Name: 'Globex – Starter Pack', Amount: 18000, Type: 'New Business', StageName: 'Qualification', CloseDate: '', Probability: 10, LeadSource: 'Web', OwnerId: 'u2', 'Account.Industry': 'Retail', 'Account.Type': 'Prospect', 'Account.BillingCountry': 'United States', 'Owner.Region__c': 'North America' },
      { Id: '0065g00000IntPr4', Name: 'Initech – Partner Resale', Amount: 45000, Type: 'Partner Resale', StageName: 'Proposal/Price Quote', CloseDate: '2026-10-30', Probability: 60, LeadSource: 'Partner Referral', OwnerId: 'u2', 'Account.Industry': 'Technology', 'Account.Type': 'Partner', 'Account.BillingCountry': 'Canada', 'Owner.Region__c': 'North America' }
    ],
    Account: [
      { Id: '0015g00000PsCo01', Name: 'PseudoCo, Inc.', Type: 'Customer', Rating: 'Hot', Industry: 'Technology', AnnualRevenue: 52000000, BillingCountry: 'United States', 'Owner.Region__c': 'North America' },
      { Id: '0015g00000Glx002', Name: 'Globex Retail', Type: 'Prospect', Rating: 'Warm', Industry: 'Retail', AnnualRevenue: 4000000, BillingCountry: 'United States', 'Owner.Region__c': 'North America' }
    ],
    Quote: [
      { Id: '0Q05g00000Q00412', Name: 'Q-00412 PseudoCo Enterprise', Status: 'Draft', GrandTotal: 184000, Discount: 12, ExpirationDate: '2026-12-01', 'Opportunity.Type': 'New Business' },
      { Id: '0Q05g00000Q00398', Name: 'Q-00398 Acme Renewal', Status: 'Approved', GrandTotal: 62000, Discount: 3, ExpirationDate: '2026-12-10', 'Opportunity.Type': 'Renewal' }
    ],
    Case: [
      { Id: '5005g00000C12045', Name: '00012045 – Login outage', Subject: 'Login outage', Status: 'Escalated', Priority: 'High', Origin: 'Web', 'Account.Rating': 'Hot' },
      { Id: '5005g00000C12051', Name: '00012051 – Invoice copy', Subject: 'Invoice copy', Status: 'New', Priority: 'Low', Origin: 'Email', 'Account.Rating': 'Warm' }
    ],
    Contract: [
      { Id: '8005g00000K00187', Name: '00000187 – PseudoCo MSA', Status: 'Activated', StartDate: '2026-01-01', ContractTerm: 36, 'Account.Industry': 'Technology' }
    ]
  };
  const recordsOf = obj => RECORDS[obj] || [{ Id: 'a0X000000000001', Name: 'Sample ' + OBJ(obj).label, Status__c: 'Open' }];

  const USERS = [
    { id: 'u1', name: 'Anand Narasimhan', title: 'VP, Enterprise Sales', cfgManager: true, profile: 'Sales User', role: 'VP_Sales', permsets: ['Deal_Desk', 'SDocs_User'], custperms: ['Approve_Discounts'], groups: ['Sales_Team'],
      f: { Department: 'Sales', Title: 'VP, Enterprise Sales', Region__c: 'North America', LanguageLocaleKey: 'en_US', Id: 'u1', 'Manager.Department': 'Executive' } },
    { id: 'u2', name: 'Sam Rivera', title: 'Account Executive', profile: 'Sales User', role: 'Account_Executive', permsets: ['SDocs_User'], custperms: [], groups: ['Sales_Team', 'EMEA_Sales'],
      f: { Department: 'Sales', Title: 'Account Executive', Region__c: 'EMEA', LanguageLocaleKey: 'de', Id: 'u2', 'Manager.Department': 'Sales' } },
    { id: 'u3', name: 'Pat Lee', title: 'Partner rep, Initech', profile: 'Partner Community User', role: '', permsets: [], custperms: [], groups: [],
      f: { Department: 'Partner', Title: 'Partner Sales Rep', Region__c: 'North America', LanguageLocaleKey: 'en_US', Id: 'u3', 'Manager.Department': '' } },
    { id: 'u5', name: 'Priya Shah', title: 'Sales Operations Manager', cfgManager: true, profile: 'Sales User', role: 'Sales_Manager', permsets: ['SDocs_User', 'SDocs_Card_Manager'], custperms: ['SDocs_Card_Manager'], groups: [],
      f: { Department: 'Sales Operations', Title: 'Sales Operations Manager', Region__c: 'North America', LanguageLocaleKey: 'en_US', Id: 'u5', 'Manager.Department': 'Sales' } },
    { id: 'u4', name: 'Jordan Kim', title: 'Support Agent', profile: 'Service User', role: 'Support_Agent', permsets: ['SDocs_User'], custperms: [], groups: ['Support'],
      f: { Department: 'Support', Title: 'Support Agent', Region__c: 'APAC', LanguageLocaleKey: 'en_US', Id: 'u4', 'Manager.Department': 'Support' } }
  ];
  const userById = id => USERS.find(u => u.id === id) || USERS[0];

  /* =======================================================================
     SEED S-DOCS CARDS
     ======================================================================= */
  function mkActions(onKeys, over) {
    const a = {};
    ACTIONS.forEach(x => {
      a[x.k] = { on: onKeys.includes(x.k), surface: x.surface, who: 'all', confirm: x.k === 'delete', settings: clone(ACTION_DEFAULTS[x.k] || {}) };
    });
    Object.keys(over || {}).forEach(k => Object.assign(a[k], over[k]));
    return a;
  }
  const T = (tid, key, extra) => Object.assign({ tid, key, featured: false, pre: false, auto: false, group: '', rules: [] }, extra || {});
  const R = (field, op, value, extra) => Object.assign({ subject: 'record', field, op, vtype: 'literal', value: value == null ? '' : value }, extra || {});
  function mkConfig(p) {
    return Object.assign({
      id: uid('cfg'), key: '', name: '', desc: '', object: 'Opportunity', status: 'Draft',
      placements: [], from: '', to: '', runAs: 'user',
      logic: 'all', customLogic: '', conditions: [],
      picker: 'flat', multi: true, favorites: false, regenerate: false, autoPolicy: 'off',
      templates: [], actions: mkActions(['preview', 'download']),
      afterGen: 'stay', output: 'separate', combinedName: '', listScope: 'config', publishPE: false,
      steps: [], inputs: [], modified: 'Sep 24, 2026', modifiedBy: 'Anand Narasimhan'
    }, p);
  }
  const step = p => Object.assign({ id: uid('st'), phase: 'before', appliesTo: 'all', tkeys: [], onError: 'stop', runMode: 'sync' }, p);
  const input = p => Object.assign({ key: '', label: '', type: 'Text', options: '', required: false, defType: 'none', def: '', host: false, help: '' }, p);

  /* Phase 1 (MVP): an S-Docs Card is when-to-show + templates + actions, nothing else.
     The advanced wizard and the richer seed data stay in this file for later phases. */
  const PHASE1 = true;
  const PHASE1_OVERRIDES = {
    renewal_desk: { name: 'Renewals', desc: 'Renewal opportunities get renewal quotes and change orders.' },
    partner_portal: { desc: 'Partner users can only create order forms and proposals.' },
    q4_promo: { desc: 'Seasonal promotion — not live yet.', conditions: [R('CloseDate', 'gt', '2026-09-30'), R('Owner.Region__c', 'eq', 'North America')] }
  };
  function toPhase1(c) {
    Object.assign(c, { placements: [], from: '', to: '', runAs: 'user', picker: 'flat', favorites: false, regenerate: false,
      autoPolicy: 'off', afterGen: 'stay', output: 'separate', combinedName: '', publishPE: false, steps: [], inputs: [] }, PHASE1_OVERRIDES[c.key] || {});
    c.templates.forEach(t => { t.rules = []; t.featured = false; t.auto = false; t.group = ''; });
    Object.keys(c.actions).forEach(k => { const a = c.actions[k]; a.who = 'all'; a.surface = ['download', 'refresh', 'delete', 'email', 'sign'].includes(k) ? 'both' : 'menu'; });
    return c;
  }
  function seed() {
    const data = seedFull();
    if (PHASE1) Object.values(data).forEach(list => list.forEach(toPhase1));
    return data;
  }
  function seedFull() {
    return {
      Opportunity: [
        mkConfig({
          key: 'renewal_desk', name: 'Renewal Desk', status: 'Active', modified: 'Sep 29, 2026',
          desc: 'Used inside the custom Renewal Desk component the customer-success team works from.',
          placements: ['embedded'],
          conditions: [R('Type', 'eq', 'Renewal')],
          templates: [T('t12', 'renewal_quote', { pre: true }), T('t13', 'change_order', { rules: [R('StageName', 'eq', 'Closed Won')] }), T('t9', 'order_form')],
          actions: mkActions(['preview', 'download', 'email', 'refresh']),
          steps: [step({ type: 'flow', name: 'Calculate renewal uplift', flow: 'Calc_Uplift', appliesTo: 'some', tkeys: ['renewal_quote'],
            inMap: [{ v: 'opportunityId', src: 'record.Id' }], outMap: [{ input: 'uplift_pct', v: 'upliftPercent' }] })],
          inputs: [input({ key: 'uplift_pct', label: 'Renewal uplift %', type: 'Percent', required: true })]
        }),
        mkConfig({
          key: 'partner_portal', name: 'Partner Portal', status: 'Active', modified: 'Sep 18, 2026',
          desc: 'Partners on the reseller site can only create order forms and proposals.',
          placements: ['experience'], runAs: 'system',
          conditions: [{ subject: 'profile', op: 'in', value: ['Partner Community User'] }],
          picker: 'fav', templates: [T('t9', 'order_form', { featured: true }), T('t3', 'proposal')],
          actions: mkActions(['preview', 'download']), afterGen: 'preview'
        }),
        mkConfig({
          key: 'enterprise_sales', name: 'Enterprise Sales', status: 'Active', modified: 'Sep 30, 2026',
          desc: 'Large new-business deals worked by the deal desk or sales leadership.',
          placements: ['record'], logic: 'custom', customLogic: '1 AND 2 AND (3 OR 4)',
          conditions: [R('Amount', 'gte', '100000'), R('Type', 'eq', 'New Business'), { subject: 'permset', op: 'has', value: 'Deal_Desk' }, { subject: 'role', op: 'in', value: ['VP_Sales'] }],
          picker: 'fav', multi: true, favorites: true, afterGen: 'preview', publishPE: true,
          templates: [T('t3', 'proposal', { featured: true, pre: true }), T('t10', 'msa', { featured: true }), T('t4', 'nda'), T('t1', 'sow'), T('t9', 'order_form'), T('t11', 'dpa', { rules: [R('Account.BillingCountry', 'ne', 'United States')] })],
          actions: mkActions(['preview', 'download', 'edit', 'refresh', 'versions', 'delete', 'email', 'sign'], {
            delete: { who: 'creator' },
            email: { settings: Object.assign(clone(ACTION_DEFAULTS.email), { template: 'Proposal cover email' }) }
          }),
          steps: [
            step({ type: 'validation', name: 'Close date is set', logic: 'all', conditions: [R('CloseDate', 'nblank')], severity: 'block', message: 'Set a Close Date on {!Name} before generating a proposal.' }),
            step({ type: 'prompt', name: 'Ask for discount and signer', title: 'Before we generate', intro: 'Confirm the approved discount and who will sign.', inputKeys: ['discount_pct', 'signer'] }),
            step({ type: 'apex', name: 'Snapshot pricing', cls: 'PricingSnapshot', sets: ['pricing_tier'], params: '{ "priceBook": "Enterprise" }' }),
            step({ type: 'flow', phase: 'after', name: 'Log proposal sent', flow: 'Log_Proposal_Sent', runMode: 'async', onError: 'warn',
              inMap: [{ v: 'recordId', src: 'record.Id' }, { v: 'documentIds', src: 'context.documentIds' }], outMap: [] })
          ],
          inputs: [
            input({ key: 'discount_pct', label: 'Approved discount %', type: 'Percent', required: true, defType: 'literal', def: '0', help: 'Off list price, as approved by the deal desk.' }),
            input({ key: 'signer', label: 'Customer signer', type: 'Contact', required: true }),
            input({ key: 'pricing_tier', label: 'Pricing tier', type: 'Text' })
          ]
        }),
        mkConfig({
          key: 'q4_promo', name: 'Q4 Promo Pricing', status: 'Draft', modified: 'Oct 1, 2026',
          desc: 'Seasonal promotion — not live yet.', from: '2026-10-01', to: '2026-12-31',
          conditions: [{ subject: 'formula', op: 'true', formula: 'AND(MONTH(CloseDate) >= 10, Amount < 100000)' }, R('Owner.Region__c', 'eq', 'North America')],
          templates: [T('t3', 'proposal', { featured: true }), T('t12', 'renewal_quote')],
          actions: mkActions(['preview', 'download', 'email'])
        }),
        mkConfig({
          key: 'sales_standard', name: 'Sales — Standard', status: 'Active', modified: 'Aug 12, 2026',
          desc: 'Everyday documents for the sales team.',
          conditions: [{ subject: 'group', op: 'member', value: 'Sales_Team' }],
          templates: [T('t3', 'proposal', { pre: true }), T('t4', 'nda'), T('t1', 'sow'), T('t7', 'sales_contract')],
          actions: mkActions(['preview', 'download', 'email', 'sign', 'refresh']),
          steps: [step({ type: 'validation', name: 'Amount is set', logic: 'all', conditions: [R('Amount', 'nblank')], severity: 'warn', message: 'This opportunity has no Amount, so pricing tables will be empty.' })]
        }),
        mkConfig({
          key: 'opp_default', name: 'Default', status: 'Active', modified: 'Jun 3, 2026',
          desc: 'Everyone else gets the standard proposal.', logic: 'always',
          templates: [T('t3', 'proposal')], actions: mkActions(['preview', 'download'])
        })
      ],
      Account: [
        mkConfig({ object: 'Account', key: 'key_accounts', name: 'Key Accounts', status: 'Active',
          conditions: [R('Rating', 'eq', 'Hot'), R('Type', 'eq', 'Customer')],
          templates: [T('a1', 'account_plan', { featured: true }), T('a4', 'annual_statement')], actions: mkActions(['preview', 'download', 'email']) }),
        mkConfig({ object: 'Account', key: 'account_default', name: 'Default', status: 'Active', logic: 'always',
          templates: [T('a2', 'welcome_letter')] })
      ],
      Quote: [
        mkConfig({ object: 'Quote', key: 'discounted_quotes', name: 'Discounted Quotes', status: 'Active', logic: 'custom', customLogic: '1 AND 2',
          conditions: [R('Discount', 'gt', '10'), { subject: 'custperm', op: 'has', value: 'Approve_Discounts' }],
          templates: [T('q1', 'quote_pdf', { pre: true }), T('q4', 'discount_memo')], actions: mkActions(['preview', 'download', 'email', 'sign']) }),
        mkConfig({ object: 'Quote', key: 'renewal_quotes', name: 'Renewal Quotes', status: 'Active',
          conditions: [R('Opportunity.Type', 'eq', 'Renewal')],
          templates: [T('q1', 'quote_pdf'), T('q3', 'price_sheet')], actions: mkActions(['preview', 'download', 'email']) }),
        mkConfig({ object: 'Quote', key: 'quote_default', name: 'Default', status: 'Active', logic: 'always', templates: [T('q1', 'quote_pdf')] })
      ],
      Case: [
        mkConfig({ object: 'Case', key: 'escalations', name: 'Escalations', status: 'Active',
          conditions: [R('Status', 'eq', 'Escalated')],
          templates: [T('c1', 'case_summary', { pre: true }), T('c2', 'rma_form')], actions: mkActions(['preview', 'download', 'email', 'sign']) })
      ],
      Contract: []
    };
  }

  /* =======================================================================
     CONDITIONS — types, operators, text, evaluation
     ======================================================================= */
  const SUBJECTS = [
    { k: 'record', l: 'Record field', g: 'Record' },
    { k: 'user', l: 'User field', g: 'Running user' },
    { k: 'profile', l: 'Profile', g: 'Running user' },
    { k: 'role', l: 'Role', g: 'Running user' },
    { k: 'permset', l: 'Permission set', g: 'Running user' },
    { k: 'custperm', l: 'Custom permission', g: 'Running user' },
    { k: 'group', l: 'Public group', g: 'Running user' },
    { k: 'formula', l: 'Formula', g: 'Advanced' },
    { k: 'apex', l: 'Apex class', g: 'Advanced' }
  ];
  const NUMERIC = ['currency', 'number', 'percent'];
  const OPS_BY_TYPE = {
    text: ['eq', 'ne', 'contains', 'ncontains', 'starts', 'in', 'nin', 'blank', 'nblank'],
    picklist: ['eq', 'ne', 'in', 'nin', 'blank', 'nblank'],
    id: ['eq', 'ne', 'blank', 'nblank'],
    currency: ['gte', 'gt', 'lte', 'lt', 'eq', 'ne', 'blank', 'nblank'],
    number: ['gte', 'gt', 'lte', 'lt', 'eq', 'ne', 'blank', 'nblank'],
    percent: ['gte', 'gt', 'lte', 'lt', 'eq', 'ne', 'blank', 'nblank'],
    date: ['eq', 'lt', 'gt', 'blank', 'nblank'],
    profile: ['in', 'nin'], role: ['in', 'nin'],
    permset: ['has', 'nhas'], custperm: ['has', 'nhas'],
    group: ['member', 'nmember'],
    formula: ['true'], apex: ['true']
  };
  const REF_OPS = ['eq', 'ne', 'lt', 'gt', 'lte', 'gte'];
  function opLabel(op, t) {
    if (NUMERIC.includes(t)) {
      const m = { gte: 'is at least (≥)', gt: 'is greater than (>)', lte: 'is at most (≤)', lt: 'is less than (<)', eq: 'equals (=)', ne: 'does not equal (≠)' };
      if (m[op]) return m[op];
    }
    if (t === 'date') { const m = { eq: 'is on', lt: 'is before', gt: 'is after' }; if (m[op]) return m[op]; }
    return ({ eq: 'equals', ne: 'does not equal', contains: 'contains', ncontains: 'does not contain', starts: 'starts with',
      in: 'is one of', nin: 'is not one of', blank: 'is blank', nblank: 'is not blank', has: 'has', nhas: 'does not have',
      member: 'is a member of', nmember: 'is not a member of', true: 'is true' })[op] || op;
  }
  function opShort(op, t) {
    if (NUMERIC.includes(t)) { const m = { gte: '≥', gt: '>', lte: '≤', lt: '<', eq: '=', ne: '≠' }; if (m[op]) return m[op]; }
    if (t === 'date') { const m = { eq: 'is', lt: 'is before', gt: 'is after' }; if (m[op]) return m[op]; }
    return ({ eq: 'is', ne: 'is not', contains: 'contains', ncontains: "doesn't contain", starts: 'starts with', in: 'is one of', nin: 'is not one of', blank: 'is blank', nblank: 'is set' })[op] || op;
  }
  function fieldDef(r, obj) {
    if (r.subject === 'record') return fieldsOf(obj).find(f => f.p === r.field);
    if (r.subject === 'user') return USER_FIELDS.find(f => f.p === r.field);
    return null;
  }
  function rowType(r, obj) {
    if (r.subject === 'record' || r.subject === 'user') { const f = fieldDef(r, obj); return f ? f.t : 'text'; }
    return r.subject;
  }
  const opsFor = (r, obj) => OPS_BY_TYPE[rowType(r, obj)] || OPS_BY_TYPE.text;

  function defaultRow(subject, obj) {
    switch (subject) {
      case 'record': { const fl = fieldsOf(obj); const f = fl[1] || fl[0]; return { subject, field: f.p, op: OPS_BY_TYPE[f.t][0], vtype: 'literal', value: '' }; }
      case 'user': { const f = USER_FIELDS[0]; return { subject, field: f.p, op: OPS_BY_TYPE[f.t][0], vtype: 'literal', value: '' }; }
      case 'profile': case 'role': return { subject, op: 'in', value: [] };
      case 'permset': case 'custperm': return { subject, op: 'has', value: DIRECTORY[subject][0] };
      case 'group': return { subject, op: 'member', value: DIRECTORY.group[0] };
      case 'formula': return { subject, op: 'true', formula: '' };
      case 'apex': return { subject, op: 'true', cls: APEX.condition[0] };
    }
    return { subject: 'record', field: 'Name', op: 'eq', vtype: 'literal', value: '' };
  }
  function rowComplete(r) {
    if (r.subject === 'formula') return !!String(r.formula || '').trim();
    if (r.subject === 'apex') return !!r.cls;
    if (r.op === 'blank' || r.op === 'nblank') return true;
    return !isBlank(Array.isArray(r.value) ? r.value : String(r.value == null ? '' : r.value).trim());
  }
  function fmtVal(v, t) {
    if (isBlank(v)) return '';
    if (Array.isArray(v)) return v.join(', ');
    if (t === 'currency') return '$' + Number(v).toLocaleString('en-US');
    if (t === 'percent') return v + '%';
    if (t === 'number') return Number(v).toLocaleString('en-US');
    if (t === 'date') return fmtDate(v);
    return String(v);
  }
  function rowParts(r, obj) {
    const t = rowType(r, obj);
    const list = v => toList(v).join(', ') || '…';
    switch (r.subject) {
      case 'record': case 'user': {
        const f = fieldDef(r, obj);
        const s = (r.subject === 'user' ? 'User › ' : '') + (f ? f.l : r.field);
        let v = '';
        if (r.op !== 'blank' && r.op !== 'nblank') {
          if (r.vtype === 'record') { const g = fieldsOf(obj).find(x => x.p === r.value); v = OBJ(obj).label + ' › ' + (g ? g.l : r.value || '…'); }
          else if (r.vtype === 'user') { const g = USER_FIELDS.find(x => x.p === r.value); v = 'User › ' + (g ? g.l : r.value || '…'); }
          else v = (r.op === 'in' || r.op === 'nin') ? list(r.value) : (fmtVal(r.value, t) || '…');
        }
        return { s, o: opShort(r.op, t), v };
      }
      case 'profile': return { s: "User's profile", o: r.op === 'in' ? 'is one of' : 'is not one of', v: list(r.value) };
      case 'role': return { s: "User's role", o: r.op === 'in' ? 'is one of' : 'is not one of', v: list(r.value) };
      case 'permset': return { s: 'User', o: r.op === 'has' ? 'has permission set' : "doesn't have permission set", v: r.value || '…' };
      case 'custperm': return { s: 'User', o: r.op === 'has' ? 'has custom permission' : "doesn't have custom permission", v: r.value || '…' };
      case 'group': return { s: 'User', o: r.op === 'member' ? 'is in group' : 'is not in group', v: r.value || '…' };
      case 'formula': return { s: 'Formula', o: '', v: r.formula || '…' };
      case 'apex': return { s: 'Apex', o: '', v: (r.cls || '…') + ' returns true' };
    }
    return { s: '?', o: '', v: '' };
  }
  const rowText = (r, obj) => { const p = rowParts(r, obj); return [p.s, p.o, p.v].filter(Boolean).join(' '); };
  const rowChip = (r, obj, n) => { const p = rowParts(r, obj); return `<span class="ad-cchip">${n ? `<span class="n">${n}</span>` : ''}<b>${esc(p.s)}</b> ${esc(p.o)}${p.v ? ' <b>' + esc(p.v) + '</b>' : ''}</span>`; };

  /* ---- custom logic: tiny recursive-descent parser (no eval) ---- */
  function parseLogic(str, n) {
    const src = String(str || '').trim();
    if (!src) return { ok: false, error: 'Enter the logic, for example 1 AND (2 OR 3).' };
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '(' || ch === ')') { toks.push(ch); i++; continue; }
      const m = /^(\d+|AND|OR|NOT)/i.exec(src.slice(i));
      if (!m) return { ok: false, error: `“${src.slice(i).split(/\s/)[0]}” isn't a row number, AND, OR, NOT or a parenthesis.` };
      toks.push(/^\d+$/.test(m[1]) ? Number(m[1]) : m[1].toUpperCase());
      i += m[1].length;
    }
    let p = 0;
    const used = new Set();
    const expr = () => { let a = term(); while (toks[p] === 'OR') { p++; a = { op: 'OR', a, b: term() }; } return a; };
    const term = () => { let a = factor(); while (toks[p] === 'AND') { p++; a = { op: 'AND', a, b: factor() }; } return a; };
    const factor = () => {
      const t = toks[p];
      if (t === 'NOT') { p++; return { op: 'NOT', a: factor() }; }
      if (t === '(') { p++; const e = expr(); if (toks[p] !== ')') throw new Error('A parenthesis is never closed.'); p++; return { op: '()', a: e }; }
      if (typeof t === 'number') { p++; if (t < 1 || t > n) throw new Error(`There is no condition ${t}.`); used.add(t); return { op: 'ROW', n: t }; }
      throw new Error(t === undefined ? 'The logic ends too early.' : `“${t}” is in the wrong place.`);
    };
    try {
      const ast = expr();
      if (p < toks.length) throw new Error(`“${toks[p]}” is in the wrong place — join conditions with AND or OR.`);
      const unused = [];
      for (let k = 1; k <= n; k++) if (!used.has(k)) unused.push(k);
      if (unused.length) return { ok: false, ast, error: `Condition${unused.length > 1 ? 's' : ''} ${unused.join(', ')} ${unused.length > 1 ? "aren't" : "isn't"} used.` };
      return { ok: true, ast };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  function evalAst(a, v) {
    switch (a.op) {
      case 'ROW': return v[a.n - 1];
      case 'AND': return evalAst(a.a, v) && evalAst(a.b, v);
      case 'OR': return evalAst(a.a, v) || evalAst(a.b, v);
      case 'NOT': return !evalAst(a.a, v);
      case '()': return evalAst(a.a, v);
    }
    return false;
  }
  function astOut(a, leaf, lop, paren) {
    switch (a.op) {
      case 'ROW': return leaf(a.n);
      case 'AND': case 'OR': return astOut(a.a, leaf, lop, paren) + lop(a.op) + astOut(a.b, leaf, lop, paren);
      case 'NOT': return lop('NOT', true) + astOut(a.a, leaf, lop, paren);
      case '()': return paren('(') + astOut(a.a, leaf, lop, paren) + paren(')');
    }
    return '';
  }
  function condSummaryHtml(logic, custom, rows, obj) {
    if (logic === 'always') return 'Applies to <b>every record and every user</b>, as long as the scope (where it runs, keys, dates) fits.';
    if (!rows.length) return '<span class="ad-logic-msg bad">No conditions yet — add one, or choose Always.</span>';
    const lop = (op, pre) => `<span class="ad-lop">${op}</span>${pre ? ' ' : ''}`;
    if (logic === 'custom') {
      const pr = parseLogic(custom, rows.length);
      if (pr.ok) return 'Applies when ' + astOut(pr.ast, n => rowChip(rows[n - 1], obj, n), op => ' ' + lop(op) + ' ', ch => `<span class="ad-paren">${ch}</span>`);
      return rows.map((r, i) => rowChip(r, obj, i + 1)).join(' ') + `<div class="ad-logic-msg bad">${ic('alert', 13, 2)} Fix the custom logic to see how these combine.</div>`;
    }
    const j = ' ' + lop(logic === 'any' ? 'OR' : 'AND') + ' ';
    return 'Applies when ' + rows.map((r, i) => rowChip(r, obj, i + 1)).join(j);
  }
  function condSummaryText(logic, custom, rows, obj) {
    if (logic === 'always') return 'Always';
    if (!rows.length) return 'No conditions';
    if (logic === 'custom') {
      const pr = parseLogic(custom, rows.length);
      if (pr.ok) return astOut(pr.ast, n => rowText(rows[n - 1], obj), op => ` ${op} `, ch => ch);
      return rows.map(r => rowText(r, obj)).join('; ') + ' (logic needs fixing)';
    }
    return rows.map(r => rowText(r, obj)).join(logic === 'any' ? ' OR ' : ' AND ');
  }

  function compare(t, op, a, b) {
    const blank = isBlank(a);
    if (op === 'blank') return blank;
    if (op === 'nblank') return !blank;
    if (op === 'in' || op === 'nin') { const L = toList(b).map(lc); const r = !blank && L.includes(lc(a)); return op === 'in' ? r : !r; }
    if (blank) return op === 'ne' || op === 'ncontains';
    if (NUMERIC.includes(t)) {
      const x = Number(a), y = Number(b);
      return ({ eq: x === y, ne: x !== y, lt: x < y, gt: x > y, lte: x <= y, gte: x >= y })[op];
    }
    if (t === 'date') { const x = String(a), y = String(b); return ({ eq: x === y, ne: x !== y, lt: x < y, gt: x > y })[op]; }
    const x = lc(a), y = lc(b);
    return ({ eq: x === y, ne: x !== y, contains: x.includes(y), ncontains: !x.includes(y), starts: x.startsWith(y) })[op];
  }
  function evalRow(r, obj, rec, user) {
    const t = rowType(r, obj);
    switch (r.subject) {
      case 'record': case 'user': {
        const actual = r.subject === 'record' ? rec[r.field] : user.f[r.field];
        let target = r.value;
        if (r.vtype === 'record') target = rec[r.value];
        else if (r.vtype === 'user') target = user.f[r.value];
        const pass = !!compare(t, r.op, actual, target);
        return { pass, actual: 'is ' + (isBlank(actual) ? 'blank' : fmtVal(actual, t)) };
      }
      case 'profile': { const L = toList(r.value); const hit = L.includes(user.profile); return { pass: r.op === 'in' ? hit : !hit, actual: 'profile is ' + user.profile }; }
      case 'role': { const L = toList(r.value); const hit = !!user.role && L.includes(user.role); return { pass: r.op === 'in' ? hit : !hit, actual: 'role is ' + (user.role || 'none') }; }
      case 'permset': { const has = user.permsets.includes(r.value); return { pass: r.op === 'has' ? has : !has, actual: has ? 'has it' : "doesn't have it" }; }
      case 'custperm': { const has = user.custperms.includes(r.value); return { pass: r.op === 'has' ? has : !has, actual: has ? 'has it' : "doesn't have it" }; }
      case 'group': { const m = user.groups.includes(r.value); return { pass: r.op === 'member' ? m : !m, actual: m ? 'is a member' : 'is not a member' }; }
      case 'formula': return { pass: true, actual: 'evaluated on the server (simulated as true here)' };
      case 'apex': return { pass: true, actual: (r.cls || 'class') + ' runs on the server (simulated as true here)' };
    }
    return { pass: false, actual: '' };
  }
  function evalConditions(logic, custom, rows, obj, rec, user) {
    if (logic === 'always') return { pass: true, rows: [] };
    const res = rows.map((r, i) => Object.assign({ n: i + 1, text: rowText(r, obj) }, evalRow(r, obj, rec, user)));
    if (!rows.length) return { pass: false, rows: res, note: 'No conditions are set.' };
    const vals = res.map(x => x.pass);
    if (logic === 'any') return { pass: vals.some(Boolean), rows: res, note: 'Any condition must be true.' };
    if (logic === 'custom') {
      const pr = parseLogic(custom, rows.length);
      if (!pr.ok) return { pass: false, rows: res, note: 'Custom logic is invalid: ' + pr.error };
      return { pass: evalAst(pr.ast, vals), rows: res, note: 'Logic: ' + custom };
    }
    return { pass: vals.every(Boolean), rows: res, note: 'All conditions must be true.' };
  }

  /* =======================================================================
     RESOLUTION — first match by priority wins
     ======================================================================= */
  const isOpenScope = c => c.logic === 'always' && !c.placements.length && !c.from && !c.to;
  const isOpenFallback = c => c.status === 'Active' && isOpenScope(c);
  const placeList = ks => ks.map(k => PL[k].l).join(' or ');

  function scopeCheck(c, ctx) {
    if (c.status === 'Draft') return { ok: false, reason: 'Draft — not live yet.' };
    if (c.status !== 'Active') return { ok: false, reason: 'Inactive.' };
    if (c.from && TODAY < c.from) return { ok: false, reason: `Starts on ${fmtDate(c.from)}.` };
    if (c.to && TODAY > c.to) return { ok: false, reason: `Ended on ${fmtDate(c.to)}.` };
    if (c.placements.length && !c.placements.includes(ctx.placement)) return { ok: false, reason: `Runs only on ${placeList(c.placements)} — this is ${PL[ctx.placement].l.toLowerCase()}.` };
    return { ok: true };
  }
  function resolve(list, obj, ctx) {
    const trace = [];
    let winner = null;
    list.forEach((c, i) => {
      const base = { cfg: c, prio: i + 1 };
      if (winner) { trace.push(Object.assign(base, { outcome: 'unevaluated', why: `Not checked — #${winner.prio} ${winner.cfg.name} already matched.` })); return; }
      const sc = scopeCheck(c, ctx);
      if (!sc.ok) { trace.push(Object.assign(base, { outcome: 'skip', why: sc.reason })); return; }
      const ev = evalConditions(c.logic, c.customLogic, c.conditions, obj, ctx.rec, ctx.user);
      const t = Object.assign(base, { outcome: ev.pass ? 'win' : 'fail', why: ev.pass ? (c.logic === 'always' ? 'Always applies.' : 'Conditions met.') : 'Conditions not met.', rows: ev.rows, note: ev.note });
      trace.push(t);
      if (ev.pass) winner = t;
    });
    return { trace, winner };
  }
  function reachFlags(list) {
    let blocker = null;
    return list.map((c, i) => {
      const f = { fallback: isOpenFallback(c), unreachable: !!blocker && c.status === 'Active', blocker };
      if (isOpenFallback(c) && !blocker) blocker = { c, i };
      return f;
    });
  }
  function insertIndex(list, pos) {
    if (pos === 'top') return 0;
    if (pos === 'bottom') return list.length;
    const f = list.findIndex(isOpenFallback);
    return f >= 0 ? f : list.length;
  }
  // The list as it would be with the editor's unsaved draft in place.
  function effectiveList(obj) {
    const list = (state.configs[obj] || []).slice();
    const E = state.edit;
    if (!E || E.cfg.object !== obj) return list;
    if (E.isNew) list.splice(insertIndex(list, E.pos), 0, E.cfg);
    else { const i = list.findIndex(x => x.id === E.cfg.id); if (i >= 0) list[i] = E.cfg; }
    return list;
  }

  /* =======================================================================
     STATE
     ======================================================================= */
  const freshLab = placed => ({ object: 'Opportunity', mode: 'new', title: 'S-Docs', user: 'u1', rec: 0, placed, q: '', saved: false });
  const freshFlow = () => ({ open: false, added: false, q: '', recordId: '', title: 'S-Docs', outDocs: '', outEvent: '', debug: false, runDone: false, saved: false });
  const state = {
    configs: seed(),
    view: 'list',
    object: 'Opportunity',
    edit: null,
    test: { object: 'Opportunity', rec: 0, user: 'u1', placement: 'record' },
    pv: {},
    lab: freshLab(true),
    recv: { rec: 3, user: 'u2' },
    flow: freshFlow(),
    genCount: {},
    builderDetails: false, // per person: the business admin's own troubleshooting switch
    persona: null,
    modal: null,
    events: []
  };
  const app = $('#ad-app');

  /* =======================================================================
     SHARED UI: toast, menu, modal, events log
     ======================================================================= */
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'sd-toast' + (kind ? ' ' + kind : '');
    t.innerHTML = ic(kind === 'err' ? 'alert' : kind === 'info' ? 'info' : 'check', 16, 2.2) + '<span>' + esc(msg) + '</span>';
    $('#ad-toasts').appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 200); }, 3400);
  }

  const menuEl = $('#ad-menu');
  let menuHandler = null, menuAnchor = null;
  function openMenu(anchor, items, onPick) {
    closeMenu();
    menuAnchor = anchor;
    menuHandler = onPick;
    menuEl.innerHTML = items.map(it => it === '-' ? '<div class="sd-menu-sep"></div>'
      : `<button class="sd-menu-item" role="menuitem" data-mi="${it.k}" ${it.disabled ? 'disabled' : ''} ${it.danger ? 'data-menu="delete"' : ''}>${ic(it.icon, 16)} ${esc(it.l)}</button>`).join('');
    menuEl.hidden = false;
    anchor.classList.add('open');
    const r = anchor.getBoundingClientRect();
    const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    let left = r.right + window.scrollX - mw;
    let top = r.bottom + window.scrollY + 4;
    if (left < 8) left = 8;
    if (r.bottom + mh + 12 > window.innerHeight) top = Math.max(window.scrollY + 8, r.top + window.scrollY - mh - 4);
    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';
  }
  function closeMenu() {
    menuEl.hidden = true;
    if (menuAnchor) menuAnchor.classList.remove('open');
    menuAnchor = null; menuHandler = null;
  }
  menuEl.addEventListener('click', e => {
    const b = e.target.closest('[data-mi]');
    if (!b || b.disabled) return;
    const fn = menuHandler;
    closeMenu();
    if (fn) fn(b.dataset.mi);
  });

  const modalEl = $('#ad-modal'), backdrop = $('#ad-backdrop');
  function openModal(opts) {
    return new Promise(res => {
      state.modal = Object.assign({ rows: [], draft: {} }, opts, { resolve: res });
      $('#ad-modal-title').textContent = opts.title;
      modalEl.classList.toggle('ad-wide', !!opts.wide);
      renderModalBody();
      $('#ad-modal-foot').innerHTML = opts.buttons.map((b, i) =>
        `<button class="ad-btn ${b.kind === 'primary' ? 'ad-btn-primary' : ''} ${b.kind === 'danger' ? 'ad-btn-danger' : ''}" data-mb="${i}">${esc(b.label)}</button>`).join('');
      backdrop.hidden = false;
      modalEl.hidden = false;
      setTimeout(() => { const f = modalEl.querySelector('.sd-modal-body input:not([type=checkbox]):not([type=radio]), .sd-modal-body select, .sd-modal-body textarea'); if (f) f.focus(); }, 30);
    });
  }
  function renderModalBody() {
    if (!state.modal) return;
    $('#ad-modal-body').innerHTML = state.modal.render();
    if (state.modal.after) state.modal.after();
  }
  function closeModal(value) {
    if (!state.modal) return;
    const m = state.modal;
    state.modal = null;
    modalEl.hidden = true;
    backdrop.hidden = true;
    m.resolve(value === undefined ? null : value);
  }
  $('#ad-modal-foot').addEventListener('click', e => {
    const b = e.target.closest('[data-mb]');
    if (!b || !state.modal) return;
    const def = state.modal.buttons[+b.dataset.mb];
    if (def.validate) { const err = def.validate(); if (err) { toast(err, 'err'); return; } }
    closeModal(def.value);
  });
  $('#ad-modal-x').addEventListener('click', () => closeModal(null));
  backdrop.addEventListener('click', () => closeModal(null));
  const confirmModal = (title, html, okLabel, danger) => openModal({
    title, render: () => `<p class="ad-validation-box">${html}</p>`,
    buttons: [{ label: 'Cancel', value: false }, { label: okLabel, kind: danger ? 'danger' : 'primary', value: true }]
  });

  const EV_CH = {
    cardresolved: 'DOM · LMS · Flow', generationstarted: 'DOM · LMS', generationblocked: 'DOM · LMS · Flow',
    generationcancelled: 'DOM · LMS', documentgenerated: 'DOM · LMS · Flow', generationcompleted: 'DOM · LMS · Flow',
    afterstepcompleted: 'LMS', emailsent: 'DOM · LMS · Flow', signaturerequested: 'DOM · LMS · Flow', signaturecompleted: 'Platform event',
    documentdeleted: 'DOM · LMS', documentrefreshed: 'DOM · LMS', actioninvoked: 'DOM · LMS'
  };
  function emit(name, detail, c) {
    let ch = EV_CH[name] || 'DOM · LMS';
    if (c && c.publishPE && name !== 'cardresolved') ch += ' · Platform event';
    state.events.unshift({ t: clock(), name, ch, detail: detail || '' });
    state.events = state.events.slice(0, 40);
    $$('[data-evlog]').forEach(el => { el.innerHTML = evLogInner(); });
  }
  const evLogHtml = () => `<div class="ad-evlog" data-evlog>${evLogInner()}</div>`;
  function evLogInner() {
    return `<div class="ad-evlog-title"><span>Lifecycle events</span><button data-ev-clear>Clear</button></div>` +
      (state.events.length
        ? state.events.map(e => `<div class="ev"><span class="t">${e.t}</span><span><span class="n">${esc(e.name)}</span> <span class="ch">${esc(e.ch)}</span>${e.detail ? ' ' + esc(e.detail) : ''}</span></div>`).join('')
        : '<div class="empty">Click Generate in the preview to see the events the component fires.</div>');
  }

  /* ------------------------------ small parts ------------------------------ */
  const statusPill = s => `<span class="ad-pill ${s.toLowerCase()}">${esc(s)}</span>`;
  const objDot = o => `<span class="ad-obj-dot" data-color="${esc(o)}">${esc(OBJ(o).label[0])}</span>`;
  function paintDots(root) { $$('.ad-obj-dot[data-color]', root).forEach(d => { d.style.background = OBJ(d.dataset.color).color; }); }
  const tplName = (c, t) => { const L = libTpl(c.object, t.tid); return L ? L.name : t.key; };
  const actionsOn = c => ACTIONS.filter(a => c.actions[a.k].on);
  const sel = (opts, value, attrs) => `<select class="ad-select" ${attrs || ''}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const sw = (checked, attrs, disabled) => `<label class="ad-switch"><input type="checkbox" ${attrs} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="ad-switch-track"></span></label>`;
  const seg = (items, active, attr) => `<div class="ad-seg" role="group">${items.map(([k, l]) => `<button type="button" ${attr}="${k}" class="${k === active ? 'active' : ''}" aria-pressed="${k === active}">${esc(l)}</button>`).join('')}</div>`;
  const mseg = (field, items, active) => `<div class="ad-seg" role="group">${items.map(([k, l]) => `<button type="button" data-m-seg="${field}" data-segv="${k}" class="${k === active ? 'active' : ''}" aria-pressed="${k === active}">${esc(l)}</button>`).join('')}</div>`;
  const head = (title, sub) => `<div class="ad-body-head"><div><h2>${esc(title)}</h2><p>${sub}</p></div></div>`;

  /* =======================================================================
     VIEW: LIST
     ======================================================================= */
  function renderList() {
    const rail = railObjects();
    if (!rail.includes(state.object)) state.object = rail[0] || 'Opportunity';
    const obj = state.object;
    const list = state.configs[obj] || [];
    const flags = reachFlags(list);
    const active = list.filter(c => c.status === 'Active').length;
    const label = OBJ(obj).label;
    app.innerHTML = `
      <section class="sf-card ad-header">
        <div class="ad-hicon">${ic('sliders', 20, 2)}</div>
        <div class="ad-htitle">
          <div class="ad-eyebrow">S-Docs</div>
          <h1>S-Docs Cards</h1>
          <div class="ad-hsub">Decide which templates, actions and steps people get on each record — no page layout changes needed.</div>
        </div>
        <div class="ad-hactions">
          <div class="ad-bd-toggle" title="Shows which S-Docs Card applied and why, under the S-Docs Card on record pages. Only you see it.">${sw(state.builderDetails, 'data-bd-toggle aria-label="Builder details on record pages"')}<span><b>Builder details</b><small>On record pages, just for you</small></span></div>
          ${state.builderDetails ? `<button class="ad-btn ad-btn-sm" data-open-record title="Opens Initech – Partner Resale as you">${ic('record', 14)} Open a record</button>` : ''}
          <button class="ad-btn" data-go-test>${ic('flask', 15)} Test a record</button>
          <button class="ad-btn" data-go-lab>${ic('record', 15)} See it in App Builder</button>
          <button class="ad-btn ad-btn-primary" data-new>${ic('plus', 15, 2.2)} New S-Docs Card</button>
        </div>
      </section>
      <div class="ad-list-layout">
        <nav class="sf-card ad-objects" aria-label="Objects">
          <div class="ad-objects-title">Objects</div>
          ${rail.map(o => `<button class="ad-obj${o === obj ? ' active' : ''}" data-obj="${o}" aria-current="${o === obj}">${objDot(o)}<span class="ad-obj-name">${esc(OBJ(o).label)}</span><span class="ad-obj-count">${(state.configs[o] || []).length}</span></button>`).join('')}
          <div class="ad-objects-foot">An object appears here once it has a saved S-Docs Card.</div>
        </nav>
        <section class="sf-card ad-main">
          <div class="ad-main-head">
            <h2>${esc(label)} S-Docs Cards<span>${list.length} total · ${active} active</span></h2>
          </div>
          ${list.length ? `
            <div class="ad-note">${ic('info', 16)}<div>Checked <b>top to bottom</b>. People get the <b>first S-Docs Card</b> whose conditions match the record and the person viewing it — so put specific ones first and a catch-all <b>Default</b> last. Drag rows to change the order.</div></div>
            <ol class="ad-cfg-list" id="ad-cfg-list">${list.map((c, i) => cfgRow(c, i, flags[i])).join('')}</ol>
            ${list.some(isOpenFallback) ? '' : `<div class="ad-note warn ad-mx">${ic('alert', 16)}<div>No <b>Default</b> S-Docs Card. A ${esc(label.toLowerCase())} that matches none of these shows <b>no templates</b>. Add one with <b>Always</b> at the bottom if everyone should get something.</div></div>`}
          ` : `
            <div class="ad-empty">
              <h3>No S-Docs Cards for ${esc(label)} yet</h3>
              <p>Until you add one, the S-Docs component on ${esc(label.toLowerCase())} records shows no templates. Start with a <b>Default</b> that applies to everyone, then add more specific ones above it.</p>
              <button class="ad-btn ad-btn-primary" data-new>${ic('plus', 15, 2.2)} New S-Docs Card</button>
            </div>`}
        </section>
      </div>`;
    paintDots(app);
  }

  function cfgRow(c, i, f) {
    const off = c.status !== 'Active';
    const scope = c.placements.map(p => `<span class="ad-chip">${ic(PL[p].icon, 12)} ${PL[p].l}</span>`);
    if (c.runAs === 'system') scope.push(`<span class="ad-chip">${ic('lock', 12)} Runs as system</span>`);
    if (c.from || c.to) scope.push(`<span class="ad-chip">${ic('calendar', 12)} ${esc(fmtDate(c.from) || '…')} – ${esc(fmtDate(c.to) || '…')}</span>`);
    const why = f.unreachable ? `#${f.blocker.i + 1} ${f.blocker.c.name} always matches first` : '';
    return `
      <li class="ad-cfg${off ? ' is-off' : ''}" draggable="true" data-cfg="${c.id}">
        <span class="ad-drag" title="Drag to reorder" aria-hidden="true">${ic('grip', 14)}</span>
        <span class="ad-prio" title="Priority ${i + 1}">${i + 1}</span>
        <div class="ad-cfg-main">
          <div class="ad-cfg-top">
            <span class="ad-cfg-name">${esc(c.name)}</span>${statusPill(c.status)}
            ${f.fallback ? '<span class="ad-pill fallback">Default · catches everything</span>' : ''}
            ${f.unreachable ? `<span class="ad-pill unreachable" title="${esc(why)}">${ic('alert', 11, 2.2)} Never reached</span>` : ''}
          </div>
          ${scope.length ? `<div class="ad-cfg-scope">${scope.join('')}</div>` : ''}
          <div class="ad-cfg-when"><b>When:</b> ${esc(condSummaryText(c.logic, c.customLogic, c.conditions, c.object))}</div>
        </div>
        <div class="ad-cfg-counts">
          <span title="Templates">${ic('file', 14)} <b>${c.templates.length}</b> templates</span>
          <span title="Actions">${ic('cursor', 14)} <b>${actionsOn(c).length}</b> actions</span>
          ${c.steps.length ? `<span title="Steps">${ic('layers', 14)} <b>${c.steps.length}</b> steps</span>` : ''}
        </div>
        <button class="sd-kebab" data-kebab="${c.id}" aria-label="More actions for ${esc(c.name)}" aria-haspopup="menu">&bull;&bull;&bull;</button>
      </li>`;
  }

  function cfgMenu(btn, id) {
    const list = state.configs[state.object];
    const i = list.findIndex(c => c.id === id);
    const c = list[i];
    openMenu(btn, [
      { k: 'edit', l: 'Edit', icon: 'edit' },
      { k: 'test', l: 'Test with a record', icon: 'flask' },
      { k: 'dup', l: 'Duplicate', icon: 'copy' },
      '-',
      { k: 'top', l: 'Move to top', icon: 'top', disabled: i === 0 },
      { k: 'up', l: 'Move up', icon: 'up', disabled: i === 0 },
      { k: 'down', l: 'Move down', icon: 'down', disabled: i === list.length - 1 },
      '-',
      c.status === 'Active' ? { k: 'deact', l: 'Deactivate', icon: 'power' } : { k: 'act', l: 'Activate', icon: 'power' },
      { k: 'del', l: 'Delete', icon: 'trash', danger: true }
    ], async k => {
      if (k === 'edit') openEditor(id);
      else if (k === 'test') { state.test.object = state.object; state.test.rec = 0; state.view = 'test'; render(); }
      else if (k === 'dup') {
        const d = clone(c); d.id = uid('cfg'); d.name = c.name + ' (copy)'; d.key = uniqueKey(c.object, c.key + '_copy'); d.status = 'Draft';
        d.steps.forEach(s => { s.id = uid('st'); });
        list.splice(i + 1, 0, d); renderList(); toast(`Duplicated as a draft at priority ${i + 2}.`);
      }
      else if (k === 'top') moveTo(id, 0);
      else if (k === 'up') moveTo(id, i - 1);
      else if (k === 'down') moveTo(id, i + 1);
      else if (k === 'act') {
        const errs = validate(c).filter(x => x.level === 'err');
        if (errs.length) { toast(`“${c.name}” has ${plural(errs.length, 'issue')} — open it to fix before activating.`, 'err'); return; }
        c.status = 'Active'; renderList(); toast(`“${c.name}” is active.`);
      }
      else if (k === 'deact') { c.status = 'Inactive'; renderList(); toast(`“${c.name}” is inactive and will be skipped.`, 'info'); }
      else if (k === 'del') {
        const ok = await confirmModal('Delete S-Docs Card?', `Delete <b>${esc(c.name)}</b>? Records it matched will fall through to the next S-Docs Card in the list.`, 'Delete', true);
        if (ok) { list.splice(i, 1); renderList(); toast(`“${c.name}” deleted.`); }
      }
    });
  }
  function uniqueKey(obj, base) {
    const keys = new Set((state.configs[obj] || []).map(c => c.key));
    let k = base, n = 2;
    while (keys.has(k)) k = base + '_' + (n++);
    return k;
  }
  function moveTo(id, to) {
    const list = state.configs[state.object];
    const from = list.findIndex(c => c.id === id);
    if (from < 0 || to < 0 || to >= list.length || from === to) return;
    const [c] = list.splice(from, 1);
    list.splice(to, 0, c);
    renderList();
    toast(`“${c.name}” is now priority ${to + 1}.`);
  }

  /* ---- drag to reorder ---- */
  let dragId = null;
  app.addEventListener('dragstart', e => {
    const li = e.target.closest && e.target.closest('.ad-cfg');
    if (!li) return;
    dragId = li.dataset.cfg;
    li.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  app.addEventListener('dragover', e => {
    const li = e.target.closest && e.target.closest('.ad-cfg');
    if (!li || !dragId) return;
    e.preventDefault();
    const r = li.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    $$('.ad-cfg').forEach(x => x.classList.remove('drop-before', 'drop-after'));
    if (li.dataset.cfg !== dragId) li.classList.add(before ? 'drop-before' : 'drop-after');
  });
  app.addEventListener('drop', e => {
    const li = e.target.closest && e.target.closest('.ad-cfg');
    if (!li || !dragId) return;
    e.preventDefault();
    const before = li.classList.contains('drop-before');
    const list = state.configs[state.object];
    const from = list.findIndex(c => c.id === dragId);
    let to = list.findIndex(c => c.id === li.dataset.cfg);
    if (from < 0 || to < 0 || dragId === li.dataset.cfg) return;
    if (!before) to++;
    if (from < to) to--;
    dragId = null;
    moveTo(list[from].id, to);
  });
  let dragComp = null;
  document.addEventListener('dragstart', e => {
    const c = e.target.closest && e.target.closest('[data-lab-comp], [data-fb-comp]');
    if (!c) return;
    dragComp = c.hasAttribute('data-fb-comp') ? 'flow' : 'lab';
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'S-Docs Card');
  });
  document.addEventListener('dragover', e => {
    const d = e.target.closest && e.target.closest('[data-lab-drop], [data-fb-drop]');
    if (!d || !dragComp) return;
    e.preventDefault();
    d.classList.add('is-over');
  });
  document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('[data-lab-drop], [data-fb-drop]'); if (d) d.classList.remove('is-over'); });
  document.addEventListener('drop', e => {
    const d = e.target.closest && e.target.closest('[data-lab-drop], [data-fb-drop]');
    if (!d || !dragComp) return;
    e.preventDefault();
    if (dragComp === 'lab' && d.hasAttribute('data-lab-drop')) window.LWC2.labPlace();
    if (dragComp === 'flow' && d.hasAttribute('data-fb-drop')) flowAdd();
    dragComp = null;
  });
  document.addEventListener('dragend', () => { dragComp = null; });
  app.addEventListener('dragend', () => {
    dragId = null;
    $$('.ad-cfg').forEach(x => x.classList.remove('is-dragging', 'drop-before', 'drop-after'));
  });

  /* ---- new S-Docs Card / add object ---- */
  async function newConfigModal() {
    const draft = { name: '', object: state.object, from: '', pos: 'fallback' };
    const posOpts = () => {
      const list = state.configs[draft.object] || [];
      const hasFb = list.some(isOpenFallback);
      return [
        hasFb ? ['fallback', 'Just above the Default (recommended)'] : ['bottom', 'At the bottom'],
        ['top', 'At the top — checked first'],
        ...(hasFb ? [['bottom', 'At the very bottom (below the Default)']] : [])
      ];
    };
    const ok = await openModal({
      title: 'New S-Docs Card', draft,
      render: () => `
        <div class="mf"><label for="nc-name">Name</label><input id="nc-name" data-m="name" value="${esc(draft.name)}" placeholder="e.g. EMEA Contracts"></div>
        <div class="mf"><label for="nc-obj">Object</label>${sel(objOptions(), draft.object, 'id="nc-obj" data-m="object"')}
          <p class="m-note">Each S-Docs Card belongs to one object. If the object already has S-Docs Cards, it's added just above its Default; you can drag it later.</p></div>`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Continue', kind: 'primary', value: true, validate: () => draft.name.trim() ? null : 'Give the S-Docs Card a name.' }]
    });
    if (!ok) return;
    let cfg;
    const src = draft.from && (state.configs[draft.object] || []).find(c => c.id === draft.from);
    if (src) { cfg = clone(src); cfg.id = uid('cfg'); cfg.steps.forEach(s => { s.id = uid('st'); }); }
    else {
      cfg = mkConfig({ object: draft.object, logic: 'always' });
    }
    Object.assign(cfg, { name: draft.name.trim(), key: uniqueKey(draft.object, slug(draft.name)), status: 'Draft' });
    state.object = draft.object;
    state.edit = { cfg, isNew: true, pos: 'fallback', step: 0, mode: 'simple', dirty: true, keyTouched: false };
    state.pv.ed = null;
    state.view = 'edit';
    render();
  }
  /* =======================================================================
     VIEW: EDITOR
     ======================================================================= */
  const STEPS = ['Basics & scope', 'Who & when', 'Templates', 'Actions', 'Before & after', 'Review & activate'];

  function openEditor(id) {
    const orig = (state.configs[state.object] || []).find(c => c.id === id);
    if (!orig) return;
    state.edit = { cfg: clone(orig), origId: orig.id, isNew: false, step: 0, mode: 'simple', dirty: false, keyTouched: true };
    state.pv.ed = null;
    state.view = 'edit';
    render();
    window.scrollTo(0, 0);
  }
  const markDirty = () => { if (state.edit) state.edit.dirty = true; };

  function renderEditor() {
    const E = state.edit, c = E.cfg;
    const list = effectiveList(c.object);
    const prio = list.findIndex(x => x.id === c.id) + 1;
    const errs = validate(c).filter(x => x.level === 'err').length;
    const simple = E.mode !== 'advanced';
    app.innerHTML = `
      <section class="sf-card ad-header">
        <div class="ad-hicon">${ic('sliders', 20, 2)}</div>
        <div class="ad-htitle">
          <div class="ad-eyebrow"><a href="#" data-back>S-Docs Cards</a> › ${esc(OBJ(c.object).label)}${simple ? '' : ` · <button class="ad-link" data-mode="simple">${ic('back', 12, 2.2)} Simple view</button>`}</div>
          <h1><span id="ad-ed-title">${esc(c.name || 'Untitled S-Docs Card')}</span>${statusPill(c.status)}<span class="ad-chip">Priority ${prio} of ${list.length}</span></h1>
        </div>
        <div class="ad-hactions">
          <button class="ad-btn" data-back>Cancel</button>
          <button class="ad-btn" data-ed-test>${ic('flask', 15)} Test</button>
          ${c.status === 'Active'
            ? `<button class="ad-btn" data-save="Inactive">Deactivate</button><button class="ad-btn ad-btn-primary" data-save="Active">Save changes</button>`
            : `<button class="ad-btn" data-save="${c.status}">Save as ${c.status.toLowerCase()}</button><button class="ad-btn ad-btn-primary" data-save="Active" title="${errs ? plural(errs, 'issue') + ' to fix first' : ''}">Activate</button>`}
        </div>
      </section>
      <div class="ad-editor${simple ? ' is-simple' : ''}">
        ${simple ? '' : '<nav class="sf-card ad-steps" aria-label="S-Docs Card steps"><ol id="ad-stepper"></ol></nav>'}
        <section class="${simple ? 'ad-sbody' : 'sf-card ad-body'}" id="ad-body"></section>
        <aside class="ad-preview" id="ad-preview" aria-label="Live preview"></aside>
      </div>`;
    renderStepper();
    renderStepBody();
    renderPreview();
  }

  function renderStepper() {
    const el = $('#ad-stepper');
    if (!el) return;
    const E = state.edit, c = E.cfg;
    const v = validate(c);
    const errAt = i => v.filter(x => x.step === i && x.level === 'err').length;
    const allErr = v.filter(x => x.level === 'err').length, allWarn = v.filter(x => x.level === 'warn').length;
    const before = c.steps.filter(s => s.phase === 'before').length, after = c.steps.length - before;
    const subs = [
      c.placements.length ? c.placements.map(p => PL[p].l).join(', ') : 'Anywhere',
      c.logic === 'always' ? 'Always' : plural(c.conditions.length, 'condition') + (c.logic === 'custom' ? ' · custom logic' : c.logic === 'any' ? ' · any' : ' · all'),
      plural(c.templates.length, 'template'),
      `${actionsOn(c).length} of ${ACTIONS.length} on`,
      `${before} before · ${after} after`,
      allErr ? plural(allErr, 'issue') + ' to fix' : allWarn ? plural(allWarn, 'warning') : 'Ready to activate'
    ];
    el.innerHTML = STEPS.map((l, i) => {
      const err = i === 5 ? allErr : errAt(i);
      const done = !err && i !== E.step && (i < E.step || !E.isNew);
      return `<li><button class="ad-stepbtn${i === E.step ? ' active' : ''}${done ? ' done' : ''}${err ? ' has-err' : ''}" data-step-go="${i}" aria-current="${i === E.step ? 'step' : 'false'}">
        <span class="ad-stepnum">${err ? '!' : done ? ic('check', 12, 3) : i + 1}</span>
        <span><span class="ad-steplbl">${esc(l)}</span><span class="ad-stepsub">${esc(err && i !== 5 ? plural(err, 'issue') : subs[i])}</span></span></button></li>`;
    }).join('');
  }

  function renderStepBody() {
    const el = $('#ad-body');
    if (!el) return;
    const E = state.edit, c = E.cfg;
    if (E.mode !== 'advanced') { el.innerHTML = simpleBody(c); paintDots(el); updateWhenLive(); return; }
    const bodies = [stepBasics, stepWhen, stepTemplates, stepActions, stepSteps, stepReview];
    const prev = E.step > 0 ? `<button class="ad-btn" data-step-go="${E.step - 1}">${ic('back', 14)} ${esc(STEPS[E.step - 1])}</button>` : '<span></span>';
    const next = E.step < 5 ? `<button class="ad-btn" data-step-go="${E.step + 1}">Next: ${esc(STEPS[E.step + 1])}</button>` : `<button class="ad-btn" data-ed-test>${ic('flask', 15)} Test with a record</button>`;
    el.innerHTML = bodies[E.step](c) + `<div class="ad-body-foot">${prev}${next}</div>`;
    paintDots(el);
    if (E.step === 1) updateWhenLive();
  }
  function refreshLive() { renderStepper(); renderPreview(); }


  /* =======================================================================
     SIMPLE EDITOR — when to show · which templates · which actions
     ======================================================================= */
  // Actions that make sense on several documents at once also show on the toolbar.
  const BULK = ['download', 'refresh', 'delete', 'email', 'sign'];
  const actionWhere = k => BULK.includes(k) ? 'Toolbar and each document' : 'Each document';
  function advancedInUse(c) {
    const out = [];
    if (c.placements.length) out.push('Runs only on ' + placeList(c.placements));
    if (c.from || c.to) out.push(`Active ${fmtDate(c.from) || '…'} – ${fmtDate(c.to) || '…'}`);
    if (c.runAs === 'system') out.push('Generates as system');
    const b = c.steps.filter(s => s.phase === 'before').length, a = c.steps.length - b;
    if (b) out.push(plural(b, 'step') + ' before generating');
    if (a) out.push(plural(a, 'step') + ' after generating');
    if (c.inputs.length) out.push(plural(c.inputs.length, 'generation input'));
    if (c.picker !== 'flat') out.push(c.picker === 'fav' ? 'Favorites on top' : 'Grouped picker');
    const rules = c.templates.filter(t => t.rules.length).length;
    if (rules) out.push(plural(rules, 'template rule'));
    const limited = actionsOn(c).filter(x => c.actions[x.k].who !== 'all');
    if (limited.length) out.push(limited.map(x => x.l).join(', ') + ' limited to some people');
    if (c.afterGen !== 'stay') out.push('Opens ' + ({ preview: 'a preview', email: 'the email editor', sign: 'the signature request' })[c.afterGen] + ' after generating');
    if (c.output === 'combine') out.push('Combines into one PDF');
    return out;
  }
  function simpleBody(c) {
    const E = state.edit, label = OBJ(c.object).label;
    const v = validate(c).filter(x => x.level === 'err');
    const issues = E.showIssues && v.length ? `<div class="ad-note err ad-issues">${ic('alert', 16)}<div><b>Fix ${plural(v.length, 'issue')} before activating</b><ul>${v.map(x =>
      `<li>${esc(x.msg)}${!PHASE1 && (x.step >= 4 || x.step === 0 && !/name/i.test(x.msg)) ? ` <button class="ad-link" data-adv-step="${x.step}">Fix in advanced settings</button>` : ''}</li>`).join('')}</ul></div></div>` : '';
    const rows = c.conditions;
    const custom = c.logic === 'custom';
    const when = c.logic === 'always' || !rows.length
      ? `<div class="ad-empty-when">${ic('info', 16)}<span>No conditions, so it shows on <b>every ${esc(label.toLowerCase())} record</b> for <b>everyone</b>.</span></div>
         <button class="ad-btn ad-btn-sm" data-c-add="cfg">${ic('plus', 14, 2.2)} Add a condition</button>`
      : `<div class="ad-when-line">Show when ${custom ? '<b>the logic below</b> is true' : `${sel([['all', 'all'], ['any', 'any']], c.logic, 'class="ad-select ad-inline-sel" data-f="logic" data-rr aria-label="All or any"')} of these are true`}</div>
         ${condBuilder('cfg', rows, c.object)}
         ${custom ? `<div class="ad-logic-row"><label for="f-logic">Advanced logic</label><input id="f-logic" class="ad-input" data-f="customLogic" value="${esc(c.customLogic)}" placeholder="1 AND (2 OR 3)" spellcheck="false"><span class="ad-logic-msg" id="ad-logic-msg"></span></div>` : ''}
         <div class="ad-when-foot">${rows.length > 1 || custom ? `<button class="ad-link" data-simple-logic="${custom ? 'all' : 'custom'}">${custom ? 'Use all / any instead' : 'Use advanced logic, like 1 AND (2 OR 3)'}</button>` : ''}</div>
         <div class="ad-summary" id="ad-cond-summary"></div>`;
    const tpls = c.templates.map((t, i) => {
      const L = libTpl(c.object, t.tid) || { name: t.key, desc: '', fmt: 'PDF' };
      return `<li data-ti="${i}">
        <span class="ad-tl-order"><button class="ad-icon-btn" data-t-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ic('up', 14, 2.2)}</button><button class="ad-icon-btn" data-t-move="1" ${i === c.templates.length - 1 ? 'disabled' : ''} aria-label="Move down">${ic('down', 14, 2.2)}</button></span>
        <span class="ad-fmt ${L.fmt.toLowerCase()}">${esc(L.fmt)}</span>
        <span class="ad-tl-name">${esc(L.name)}<small>${esc(L.desc)}</small></span>
        ${t.rules.length ? '<span class="ad-chip" title="Set in advanced settings">has a rule</span>' : ''}
        <button class="ad-icon-btn is-danger" data-t-del aria-label="Remove ${esc(L.name)}">${ic('trash', 15)}</button></li>`;
    }).join('');
    const adv = advancedInUse(c);
    return `${issues}
      <section class="sf-card ad-block ad-namebar">
        <div class="ad-field"><label for="f-name">Name</label><input id="f-name" class="ad-input" data-f="name" value="${esc(c.name)}" placeholder="e.g. Enterprise Sales"></div>
        <div class="ad-field"><span class="ad-flabel">Object</span><div class="ad-readonly">${objDot(c.object)} ${esc(label)}</div></div>
      </section>

      <section class="sf-card ad-block">
        <div class="ad-block-head"><span class="ad-block-num">1</span><div><h2>When to show</h2><p>Test fields on the ${esc(label.toLowerCase())}, its parent records, or the person viewing it.</p></div></div>
        ${when}
      </section>

      <section class="sf-card ad-block">
        <div class="ad-block-head"><span class="ad-block-num">2</span><div><h2>Templates</h2><p>What people can generate. They appear in this order.</p></div></div>
        ${c.templates.length ? `<ul class="ad-tlist">${tpls}</ul>` : `<div class="ad-empty-when">${ic('alert', 16)}<span>No templates yet.</span></div>`}
        <div class="ad-gap-top"><button class="ad-btn ad-btn-sm" data-add-tpl>${ic('plus', 14, 2.2)} Add templates</button></div>
      </section>

      <section class="sf-card ad-block">
        <div class="ad-block-head"><span class="ad-block-num">3</span><div><h2>Actions</h2><p>What people can do with the documents they generate.</p></div></div>
        <div class="ad-agrid">${ACTIONS.map(a => { const on = c.actions[a.k].on; return `<label class="ad-acard${on ? ' on' : ''}"><input type="checkbox" data-sa="${a.k}" ${on ? 'checked' : ''}><span class="sd-check"></span><span class="ad-act-ic">${ic(a.icon, 15)}</span><span class="ad-acard-t"><b>${esc(a.l)}</b><small>${actionWhere(a.k)}</small></span></label>`; }).join('')}</div>
      </section>

      ${PHASE1 ? '' : `<section class="ad-more">
        <div><b>Advanced settings</b><span>${adv.length ? 'In use: ' + adv.map(esc).join(' · ') : 'Where it runs, steps before and after generating, prompts, picker style and more. Most S-Docs Cards don’t need them.'}</span></div>
        <button class="ad-btn" data-mode="advanced">${ic('gear', 14)} Advanced settings</button>
      </section>`}`;
  }

  /* ---------------------------- step 1: basics ---------------------------- */
  function stepBasics(c) {
    const E = state.edit;
    const list = effectiveList(c.object);
    const ecOnly = c.placements.length === 1 && c.placements[0] === 'experience';
    return head('Basics & scope', 'Name the S-Docs Card and decide where it can run. Scope is checked before any conditions, so it is the cheapest way to narrow things down.') + `
      <div class="ad-section"><div class="ad-grid2">
        <div class="ad-field"><label for="f-name">Name<span class="ad-req">*</span></label><input id="f-name" class="ad-input" data-f="name" value="${esc(c.name)}" placeholder="e.g. Enterprise Sales"></div>
        <div class="ad-field"><label for="f-key">Card key<span class="ad-req">*</span></label><input id="f-key" class="ad-input mono" data-f="key" value="${esc(c.key)}">
          <div class="ad-fhint">Developers use this to pin an S-Docs Card from their own component. Keep it stable once live.</div></div>
        <div class="ad-field ad-span2"><label for="f-desc">Description</label><textarea id="f-desc" class="ad-textarea" data-f="desc" placeholder="Who is this for, and who owns it?">${esc(c.desc)}</textarea></div>
        <div class="ad-field"><span class="ad-flabel">Object</span><div class="ad-readonly">${objDot(c.object)} ${esc(OBJ(c.object).label)} <span class="ad-fhint">${ic('lock', 12)} Set when created</span></div></div>
        <div class="ad-field"><span class="ad-flabel">Priority</span><div class="ad-readonly"><span class="ad-prio">${list.findIndex(x => x.id === c.id) + 1}</span> of ${list.length} ${esc(OBJ(c.object).label)} S-Docs Cards</div>
          <div class="ad-fhint">${E.isNew ? 'Placed where you chose. ' : ''}Change the order on the S-Docs Cards list.</div></div>
      </div></div>

      <div class="ad-section"><h3>Where it runs</h3>
        <p class="ad-help">Leave everything unselected to allow it anywhere the S-Docs component is placed.</p>
        <div class="ad-chipchecks">${PLACEMENTS.map(p => { const on = c.placements.includes(p.k); return `<label class="ad-chipcheck${on ? ' on' : ''}"><input type="checkbox" data-place="${p.k}" ${on ? 'checked' : ''}>${ic(p.icon, 15)} ${esc(p.l)}</label>`; }).join('')}</div>
        <div class="ad-grid2 ad-gap-top">
          <div class="ad-field"><span class="ad-flabel">Active between</span><div class="ad-daterange"><input type="date" class="ad-input" data-f="from" value="${esc(c.from)}" aria-label="Start date"><span>to</span><input type="date" class="ad-input" data-f="to" value="${esc(c.to)}" aria-label="End date"></div>
            <div class="ad-fhint">Optional. Outside these dates the S-Docs Card is skipped.</div></div>
        </div>
      </div>

      <div class="ad-section"><h3>Generate documents as</h3>
        <div class="ad-radios">
          <label class="ad-radio${c.runAs === 'user' ? ' on' : ''}"><input type="radio" name="runas" data-runas="user" ${c.runAs === 'user' ? 'checked' : ''}><span><b>The person using the component</b><span>Generation respects their record access and field-level security. Recommended.</span></span></label>
          <label class="ad-radio${c.runAs === 'system' ? ' on' : ''}${ecOnly ? '' : ' is-disabled'}"><input type="radio" name="runas" data-runas="system" ${c.runAs === 'system' ? 'checked' : ''} ${ecOnly ? '' : 'disabled'}><span><b>System (Experience Cloud only)</b><span>For partner and guest users who can't see every merged field. ${ecOnly ? '' : 'Available when <b>Experience Cloud</b> is the only place it runs.'}</span></span></label>
        </div>
      </div>`;
  }

  /* -------------------------- step 2: who & when -------------------------- */
  function stepWhen(c) {
    return head('Who & when', 'Conditions decide whether this S-Docs Card applies to the record and the person viewing it. If they fail, S-Docs moves on to the next S-Docs Card in the list.') + `
      <div class="ad-section"><h3>Applies when</h3>
        ${seg([['always', 'Always'], ['all', 'All conditions are true'], ['any', 'Any condition is true'], ['custom', 'Custom logic']], c.logic, 'data-logic')}
      </div>
      ${c.logic === 'always'
        ? `<div class="ad-note ad-gap-top">${ic('info', 16)}<div><b>Always</b> matches every record and user. Use it for a catch-all <b>Default</b> at the bottom of the list — anything below it will never be reached. Scope from the previous step still applies.</div></div>`
        : `<div class="ad-section"><h3>Conditions</h3>
            <p class="ad-help">Test record and parent-record fields, the running user and their profile, role, permission sets and groups — or use a formula or an Apex class for anything else.</p>
            ${condBuilder('cfg', c.conditions, c.object)}
            ${c.logic === 'custom' ? `<div class="ad-logic-row"><label for="f-logic">Logic</label><input id="f-logic" class="ad-input" data-f="customLogic" value="${esc(c.customLogic)}" placeholder="1 AND (2 OR 3)" spellcheck="false"><span class="ad-logic-msg" id="ad-logic-msg"></span></div>` : ''}
          </div>`}
      <div class="ad-summary" id="ad-cond-summary"></div>`;
  }
  function updateWhenLive() {
    const c = state.edit.cfg;
    const sum = $('#ad-cond-summary');
    if (sum) sum.innerHTML = '<div class="ad-summary-title">In plain words</div>' + condSummaryHtml(c.logic, c.customLogic, c.conditions, c.object);
    const msg = $('#ad-logic-msg');
    if (msg) {
      const r = parseLogic(c.customLogic, c.conditions.length);
      msg.className = 'ad-logic-msg ' + (r.ok ? 'ok' : 'bad');
      msg.innerHTML = r.ok ? ic('check', 13, 2.4) + ' Looks good' : ic('alert', 13, 2) + ' ' + esc(r.error);
      const inp = $('#f-logic');
      if (inp) inp.classList.toggle('is-bad', !r.ok);
    }
  }

  /* ---- condition builder (shared by config, template rules, validation steps) ---- */
  function condBuilder(scope, rows, obj) {
    return `<div class="ad-crows">${rows.map((r, i) => condRow(scope, r, i, obj)).join('')}</div>
      <div class="ad-gap-top"><button class="ad-btn ad-btn-sm" data-c-add="${scope}">${ic('plus', 14, 2.2)} Add condition</button></div>`;
  }
  function subjectSelect(v) {
    const groups = {};
    // The simple editor keeps to fields and people; formulas and Apex live in advanced settings.
    const simple = state.edit && state.edit.mode !== 'advanced';
    SUBJECTS.filter(s => !simple || s.g !== 'Advanced' || s.k === v).forEach(s => { (groups[s.g] = groups[s.g] || []).push(s); });
    return `<select class="ad-select c-subject" data-c="subject" aria-label="What to test">${Object.keys(groups).map(g => `<optgroup label="${g}">${groups[g].map(s => `<option value="${s.k}" ${s.k === v ? 'selected' : ''}>${s.l}</option>`).join('')}</optgroup>`).join('')}</select>`;
  }
  function condRow(scope, r, i, obj) {
    const t = rowType(r, obj);
    const hasField = r.subject === 'record' || r.subject === 'user';
    let a = `<span class="ad-crow-num">${i + 1}</span>${subjectSelect(r.subject)}`;
    let b = '';
    if (hasField) {
      const fl = r.subject === 'record' ? fieldsOf(obj) : USER_FIELDS;
      a += `<select class="ad-select c-field" data-c="field" aria-label="Field">${fl.map(f => `<option value="${f.p}" ${f.p === r.field ? 'selected' : ''}>${esc(f.l)}</option>`).join('')}</select>`;
    }
    if (r.subject === 'formula') {
      b = `<textarea class="ad-textarea mono c-value" data-c="formula" rows="2" spellcheck="false" placeholder='AND(Amount > 100000, ISPICKVAL(Type, "New Business"))' aria-label="Formula">${esc(r.formula || '')}</textarea>`;
    } else if (r.subject === 'apex') {
      b = `<select class="ad-select c-value" data-c="cls" aria-label="Apex class">${APEX.condition.map(x => `<option ${x === r.cls ? 'selected' : ''}>${x}</option>`).join('')}</select>` +
        `<span class="ad-crow-dash">implements <span class="ad-code">SDOC.CardCondition</span></span>`;
    } else {
      const ops = opsFor(r, obj);
      b = `<select class="ad-select c-op" data-c="op" aria-label="Operator">${ops.map(o => `<option value="${o}" ${o === r.op ? 'selected' : ''}>${esc(opLabel(o, t))}</option>`).join('')}</select>` + valueControl(r, obj, t);
    }
    const del = `<button class="ad-icon-btn is-danger c-del" data-c-del aria-label="Remove condition ${i + 1}">${ic('trash', 15)}</button>`;
    // Field rows read as two lines: what is tested, then how it is compared.
    return hasField
      ? `<div class="ad-crow" data-scope="${scope}" data-i="${i}"><div class="ad-crow-line">${a}${del}</div><div class="ad-crow-line sub">${b}</div></div>`
      : `<div class="ad-crow" data-scope="${scope}" data-i="${i}"><div class="ad-crow-line">${a}${b}${del}</div></div>`;
  }
  function valueControl(r, obj, t) {
    if (r.op === 'blank' || r.op === 'nblank') return '<span class="ad-crow-dash">No value needed</span>';
    if (r.subject === 'profile' || r.subject === 'role') {
      const L = toList(r.value);
      const rest = DIRECTORY[r.subject].filter(x => !L.includes(x));
      return `<div class="ad-pills c-value">${L.map((v, j) => `<span class="ad-pillv">${esc(v)}<button data-pill-x="${j}" aria-label="Remove ${esc(v)}">${ic('x', 11, 2.6)}</button></span>`).join('')}
        ${rest.length ? `<select data-c="addpill" aria-label="Add ${r.subject}"><option value="">${L.length ? '+ Add' : 'Choose…'}</option>${rest.map(x => `<option>${esc(x)}</option>`).join('')}</select>` : ''}</div>`;
    }
    if (['permset', 'custperm', 'group'].includes(r.subject)) {
      return `<select class="ad-select c-value" data-c="value" aria-label="Value">${DIRECTORY[r.subject].map(x => `<option ${x === r.value ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    }
    let h = '';
    if (REF_OPS.includes(r.op)) {
      h += `<select class="ad-select c-vtype" data-c="vtype" aria-label="Compare to">${[['literal', 'a value'], ['record', 'a record field'], ['user', 'a user field']].map(([k, l]) => `<option value="${k}" ${k === (r.vtype || 'literal') ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    }
    if (r.vtype === 'record' || r.vtype === 'user') {
      const fl = r.vtype === 'record' ? fieldsOf(obj) : USER_FIELDS;
      return h + `<select class="ad-select c-value" data-c="value" aria-label="Field to compare">${['', ...fl.map(f => f.p)].map(p => { const f = fl.find(x => x.p === p); return `<option value="${p}" ${p === r.value ? 'selected' : ''}>${f ? esc(f.l) : 'Choose a field…'}</option>`; }).join('')}</select>`;
    }
    const f = fieldDef(r, obj);
    const v = Array.isArray(r.value) ? r.value.join('; ') : (r.value == null ? '' : r.value);
    if (r.op === 'in' || r.op === 'nin') return h + `<input class="ad-input c-value" data-c="value" value="${esc(v)}" placeholder="${f && f.o ? esc(f.o.slice(0, 2).join('; ')) : 'Value; Value'}" aria-label="Values, separated by semicolons">`;
    if (t === 'picklist' && f && f.o) return h + `<select class="ad-select c-value" data-c="value" aria-label="Value"><option value="">Choose…</option>${f.o.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (t === 'date') return h + `<input type="date" class="ad-input c-value" data-c="value" value="${esc(v)}" aria-label="Date">`;
    if (NUMERIC.includes(t)) return h + `<input type="number" class="ad-input c-value" data-c="value" value="${esc(v)}" placeholder="${t === 'percent' ? '%' : '0'}" aria-label="Number">`;
    return h + `<input class="ad-input c-value" data-c="value" value="${esc(v)}" placeholder="Value" aria-label="Value">`;
  }
  const rowsFor = scope => scope === 'cfg' ? state.edit.cfg.conditions : (state.modal ? state.modal.rows : []);
  const objForRows = () => state.edit ? state.edit.cfg.object : state.object;
  function rerenderRows(scope) {
    if (scope === 'cfg') { markDirty(); renderStepBody(); refreshLive(); }
    else renderModalBody();
  }
  function liveRows(scope) {
    if (scope === 'cfg') { markDirty(); updateWhenLive(); refreshLive(); }
    else if (state.modal && state.modal.after) state.modal.after();
  }

  /* --------------------------- step 3: templates --------------------------- */
  function stepTemplates(c) {
    const grouped = c.picker === 'grouped', auto = c.autoPolicy !== 'off';
    const rows = c.templates.map((t, i) => {
      const L = libTpl(c.object, t.tid) || { name: t.key, desc: '', fmt: 'PDF' };
      return `<tr data-ti="${i}">
        <td><div class="ad-tactions"><button class="ad-icon-btn" data-t-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ic('up', 14, 2.2)}</button><button class="ad-icon-btn" data-t-move="1" ${i === c.templates.length - 1 ? 'disabled' : ''} aria-label="Move down">${ic('down', 14, 2.2)}</button></div></td>
        <td><div class="ad-tname"><span class="ad-fmt ${L.fmt.toLowerCase()}">${esc(L.fmt)}</span>${esc(L.name)}</div><div class="ad-tdesc">Key <span class="ad-code">${esc(t.key)}</span></div></td>
        ${grouped ? `<td><input class="ad-input" data-t="group" value="${esc(t.group)}" placeholder="e.g. Contracts" aria-label="Group"></td>` : ''}
        <td class="c-center"><button class="ad-starbtn" data-t-star aria-pressed="${t.featured}" title="${t.featured ? 'Featured — pinned to the top for everyone' : 'Feature this template'}">${starSvg(t.featured)}</button></td>
        <td class="c-center"><label class="sd-check-wrap" title="Checked when the picker opens"><input type="checkbox" data-t="pre" ${t.pre ? 'checked' : ''} aria-label="Preselected"><span class="sd-check"></span></label></td>
        ${auto ? `<td class="c-center"><label class="sd-check-wrap"><input type="checkbox" data-t="auto" ${t.auto ? 'checked' : ''} aria-label="Auto-generate"><span class="sd-check"></span></label></td>` : ''}
        <td><button class="ad-rulebtn${t.rules.length ? ' has' : ''}" data-t-rules>${t.rules.length ? esc(t.rules.map(r => rowText(r, c.object)).join(' AND ')) : 'Always'}</button></td>
        <td><button class="ad-icon-btn is-danger" data-t-del aria-label="Remove ${esc(L.name)}">${ic('trash', 15)}</button></td>
      </tr>`;
    }).join('');
    return head('Templates', 'Choose the templates people can generate here, and how the picker shows them.') + `
      <div class="ad-section"><h3>Picker</h3>
        ${seg([['flat', 'Flat list'], ['fav', 'Favorites on top'], ['grouped', 'Grouped']], c.picker, 'data-picker')}
        <div class="ad-toggles ad-gap-top">
          <div class="ad-toggle-row"><span><b>Pick several at once</b><span class="d">Generate more than one template in a single click.</span></span>${sw(c.multi, 'data-f="multi"')}</div>
          <div class="ad-toggle-row"><span><b>Let people star favorites</b><span class="d">Their own stars, stored per user. Featured templates are always on top.</span></span>${sw(c.favorites, 'data-f="favorites"')}</div>
          <div class="ad-toggle-row"><span><b>Allow generating the same template again</b><span class="d">Otherwise a template is greyed out once the record already has its document.</span></span>${sw(c.regenerate, 'data-f="regenerate"')}</div>
          <div class="ad-toggle-row"><span><b>Auto-generate</b><span class="d">Generate the checked templates without anyone clicking.</span></span>${sel([['off', 'Off'], ['once', 'Once per record'], ['load', 'Every time the page loads']], c.autoPolicy, 'data-f="autoPolicy" data-rr')}</div>
        </div>
        ${c.autoPolicy === 'load' ? `<div class="ad-note warn ad-gap-top">${ic('alert', 16)}<div>Generating on every page load can create a lot of documents and use generation limits. <b>Once per record</b> is usually enough.</div></div>` : ''}
      </div>
      <div class="ad-section"><h3>Templates offered <span class="ad-chip">${c.templates.length}</span></h3>
        <p class="ad-help">Featured templates are pinned to the top for everyone. A rule hides a template unless the record and user match it.</p>
        ${c.templates.length ? `<div class="ad-table-wrap"><table class="ad-table">
          <thead><tr><th></th><th>Template</th>${grouped ? '<th>Group</th>' : ''}<th class="c-center">Featured</th><th class="c-center">Preselected</th>${auto ? '<th class="c-center">Auto</th>' : ''}<th>Shown when</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>`
        : `<div class="ad-note warn">${ic('alert', 16)}<div>No templates yet. People who match this S-Docs Card would see an empty picker.</div></div>`}
        <div class="ad-gap-top"><button class="ad-btn" data-add-tpl>${ic('plus', 15, 2.2)} Add templates</button></div>
      </div>`;
  }
  async function addTemplatesModal() {
    const c = state.edit.cfg;
    const lib = LIB[c.object] || [];
    const added = new Set(c.templates.map(t => t.tid));
    const draft = { q: '', sel: [] };
    const listHtml = () => {
      const q = draft.q.toLowerCase();
      const vis = lib.filter(t => !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
      if (!vis.length) return `<p class="sd-empty-opt">${lib.length ? 'No templates match.' : 'No templates are built on this object yet.'}</p>`;
      return vis.map(t => {
        const on = draft.sel.includes(t.id), was = added.has(t.id);
        return `<label class="sd-opt${on ? ' is-selected' : ''}${was ? ' is-added' : ''}"><span class="sd-check-wrap"><input type="checkbox" data-tpick="${t.id}" ${on || was ? 'checked' : ''} ${was ? 'disabled' : ''}><span class="sd-check"></span></span>
          <span class="sd-opt-text"><span class="sd-opt-name">${esc(t.name)} <span class="ad-fmt ${t.fmt.toLowerCase()}">${t.fmt}</span></span><span class="sd-opt-desc">${was ? 'Already added' : esc(t.desc)}</span></span></label>`;
      }).join('');
    };
    const ok = await openModal({
      title: `Add ${OBJ(c.object).label} templates`, draft, wide: true,
      render: () => `<div class="sd-search ad-tsearch">${ic('search', 15, 2)}<input type="text" data-tsearch placeholder="Search templates" value="${esc(draft.q)}" aria-label="Search templates"></div><div class="ad-tpick" id="ad-tpick">${listHtml()}</div>`,
      after: () => {},
      relist: () => { const el = $('#ad-tpick'); if (el) el.innerHTML = listHtml(); },
      buttons: [{ label: 'Cancel', value: false }, { label: 'Add selected', kind: 'primary', value: true, validate: () => draft.sel.length ? null : 'Pick at least one template.' }]
    });
    if (!ok) return;
    const keys = new Set(c.templates.map(t => t.key));
    draft.sel.forEach(id => {
      const L = libTpl(c.object, id);
      let k = slug(L.name.replace(/\(.*?\)/g, '')).slice(0, 30) || id, n = 2;
      const base = k;
      while (keys.has(k)) k = base + '_' + (n++);
      keys.add(k);
      c.templates.push(T(id, k));
    });
    markDirty(); renderStepBody(); refreshLive();
    toast(`${plural(draft.sel.length, 'template')} added.`);
  }
  async function templateRulesModal(i) {
    const c = state.edit.cfg, t = c.templates[i];
    const rows = clone(t.rules);
    const ok = await openModal({
      title: `When to show “${tplName(c, t)}”`, rows, wide: true,
      render: () => `<p class="ad-prompt-intro">The template only appears in the picker when <b>all</b> of these are true. Leave it empty to always show it.</p>
        ${condBuilder('modal', rows, c.object)}<div class="ad-summary" id="ad-m-summary"></div>`,
      after: () => { const s = $('#ad-m-summary'); if (s) s.innerHTML = '<div class="ad-summary-title">In plain words</div>' + (rows.length ? 'Shown when ' + rows.map((r, j) => rowChip(r, c.object, j + 1)).join(' <span class="ad-lop">AND</span> ') : 'Always shown.'); },
      buttons: [{ label: 'Cancel', value: false }, { label: 'Save rule', kind: 'primary', value: true, validate: () => rows.every(rowComplete) ? null : 'Finish or remove the incomplete condition.' }]
    });
    if (!ok) return;
    t.rules = rows;
    markDirty(); renderStepBody(); refreshLive();
  }

  /* ---------------------------- step 4: actions ---------------------------- */
  function stepActions(c) {
    const rows = ACTIONS.map(a => {
      const s = c.actions[a.k];
      return `<tr class="${s.on ? '' : 'is-off'}" data-ak="${a.k}">
        <td>${sw(s.on, `data-a="on" aria-label="${esc(a.l)} on or off"`)}</td>
        <td><div class="ad-tname"><span class="ad-act-ic">${ic(a.icon, 15)}</span><span>${esc(a.l)}<div class="ad-tdesc">${esc(a.d)}</div></span></div></td>
        <td>${sel([['both', 'Toolbar + menu'], ['menu', 'Menu only'], ['toolbar', 'Toolbar only']], s.surface, `data-a="surface" aria-label="Where ${esc(a.l)} shows" ${s.on ? '' : 'disabled'}`)}</td>
        <td>${sel([['all', 'Everyone'], ['creator', 'Doc creator'], ['owner', 'Record owner']], s.who, `data-a="who" aria-label="Who can use ${esc(a.l)}" ${s.on ? '' : 'disabled'}`)}</td>
        <td>${a.settings ? `<button class="ad-btn ad-btn-sm" data-a-settings="${a.k}" ${s.on ? '' : 'disabled'}>${ic('gear', 13)} Settings</button>` : ''}</td>
      </tr>`;
    }).join('');
    return head('Actions', 'Choose what people can do with generated documents. Turned-off actions are hidden, not just disabled.') + `
      <div class="ad-section">
        <div class="ad-table-wrap"><table class="ad-table">
          <thead><tr><th>On</th><th>Action</th><th>Shows in</th><th>Who can use it</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>
      </div>
      <div class="ad-section"><h3>After generating</h3>
        <div class="ad-grid2">
          <div class="ad-field"><label for="f-after">Then</label>${sel([['stay', 'Stay on the documents list'], ['preview', 'Open a preview'], ['email', 'Open the email editor'], ['sign', 'Open the signature request']], c.afterGen, 'id="f-after" data-f="afterGen"')}</div>
          <div class="ad-field"><label for="f-scope">Documents list shows</label>${sel([['config', "Documents from this S-Docs Card's templates"], ['all', 'Every S-Docs document on the record']], c.listScope, 'id="f-scope" data-f="listScope"')}</div>
          <div class="ad-field"><span class="ad-flabel">Output</span>${seg([['separate', 'One file per template'], ['combine', 'Combine into one PDF']], c.output, 'data-output')}</div>
          ${c.output === 'combine' ? `<div class="ad-field"><label for="f-cname">Combined file name</label><input id="f-cname" class="ad-input" data-f="combinedName" value="${esc(c.combinedName)}" placeholder="{!Name} – Document Pack"></div>` : '<div></div>'}
        </div>
        <div class="ad-toggles ad-gap-top">
          <div class="ad-toggle-row"><span><b>Publish platform events</b><span class="d">The component always fires events to the page and to flows. Turn this on so triggers, flows and outside systems can react too (uses platform event limits).</span></span>${sw(c.publishPE, 'data-f="publishPE"')}</div>
        </div>
      </div>`;
  }
  async function actionSettingsModal(k) {
    const c = state.edit.cfg, a = ACTIONS.find(x => x.k === k);
    const draft = clone(c.actions[k].settings);
    const tog = (key, label, d) => `<div class="ad-toggle-row"><span><b>${label}</b>${d ? `<span class="d">${d}</span>` : ''}</span>${sw(draft[key], `data-m="${key}"`)}</div>`;
    const bodies = {
      email: () => `
        <div class="mf"><label>Email template</label>${sel(EMAIL_TEMPLATES, draft.template, 'data-m="template"')}</div>
        <div class="ad-mf-row"><div class="mf"><label>Default “To”</label><input class="mono" data-m="to" value="${esc(draft.to)}" placeholder="Field path, e.g. Account.Billing_Contact__r.Email"></div>
        <div class="mf"><label>Always copy</label><input data-m="cc" value="${esc(draft.cc)}" placeholder="name@example.com"></div></div>
        <div class="ad-toggles">${tog('lockTo', 'Lock recipients')}${tog('lockSubject', 'Lock the subject')}${tog('lockBody', 'Lock the message body')}${tog('logActivity', 'Log the email to the record’s activity timeline')}</div>`,
      sign: () => `
        <div class="mf"><label>Signers come from</label>${sel([['contactRoles', 'Contact roles on the record'], ['field', 'Fields on the record'], ['manual', 'Chosen by the sender']], draft.signerSource, 'data-m="signerSource" data-rr')}</div>
        ${draft.signerSource === 'field' ? `<div class="mf"><label>Signer fields</label><input class="mono" data-m="signerFields" value="${esc(draft.signerFields)}" placeholder="Account.Primary_Contact__c; Owner"></div>` : ''}
        <div class="ad-mf-row"><div class="mf"><label>Request expires after (days)</label><input type="number" data-m="expires" value="${esc(draft.expires)}"></div>
        <div class="mf"><label>Remind every (days)</label><input type="number" data-m="reminder" value="${esc(draft.reminder)}"></div></div>
        <div class="ad-toggles">${tog('reorder', 'Let the sender change the signing order')}</div>`,
      download: () => `
        <div class="mf"><label>Format</label>${sel([['original', 'As generated'], ['pdf', 'Always PDF']], draft.format, 'data-m="format"')}</div>
        <div class="ad-toggles">${tog('zip', 'Download several documents as one ZIP')}</div>`,
      edit: () => `
        <div class="mf"><label>Formats people can edit</label><div class="ad-checklist">${['PDF', 'DOCX', 'HTML'].map(f => `<label><input type="checkbox" data-m-check="formats" value="${f}" ${draft.formats.includes(f) ? 'checked' : ''}> ${f}</label>`).join('')}</div></div>
        <div class="ad-toggles">${tog('newVersion', 'Save each edit as a new version')}</div>`,
      delete: () => `<div class="ad-toggles">${tog('deleteFile', 'Also delete the file', 'Otherwise the file stays in Files after the document is removed from the list.')}</div>`
    };
    const ok = await openModal({
      title: a.l + ' settings', draft, render: bodies[k],
      buttons: [{ label: 'Cancel', value: false }, { label: 'Save', kind: 'primary', value: true }]
    });
    if (!ok) return;
    c.actions[k].settings = draft;
    markDirty(); refreshLive();
    toast(a.l + ' settings saved.');
  }

  /* ------------------------ step 5: before & after ------------------------ */
  function inputSources(c, inp) {
    const s = [];
    if (inp.defType !== 'none' && String(inp.def || '').trim()) s.push(['default', inp.defType === 'literal' ? 'Default' : 'Field default']);
    if (inp.host) s.push(['host', 'Host component']);
    c.steps.forEach(st => {
      if (st.phase !== 'before') return;
      if (st.type === 'prompt' && (st.inputKeys || []).includes(inp.key)) s.push(['prompt', 'Asked: ' + st.name]);
      if (st.type === 'apex' && (st.sets || []).includes(inp.key)) s.push(['apex', 'Apex: ' + st.cls]);
      if (st.type === 'flow' && (st.outMap || []).some(m => m.input === inp.key)) s.push(['flow', 'Flow: ' + st.flow]);
    });
    return s;
  }
  function stepDesc(c, s) {
    const tn = k => { const t = c.templates.find(x => x.key === k); return t ? tplName(c, t) : k; };
    switch (s.type) {
      case 'validation': return 'Continues only if ' + esc(condSummaryText(s.logic || 'all', '', s.conditions || [], c.object)) + '. Otherwise shows: “' + esc(s.message || '') + '”';
      case 'prompt': { const L = (s.inputKeys || []).map(k => { const i = c.inputs.find(x => x.key === k); return i ? i.label : k; }); return L.length ? 'Asks the person generating for ' + esc(L.join(', ')) + '.' : 'Asks for nothing yet — pick inputs.'; }
      case 'apex': return 'Runs <span class="ad-code">' + esc(s.cls || '…') + '</span>' + ((s.sets || []).length ? ', which sets ' + s.sets.map(k => `<span class="ad-code">${esc(k)}</span>`).join(' ') : '') + '.';
      case 'flow': return 'Runs flow <span class="ad-code">' + esc(s.flow || '…') + '</span>' + ((s.outMap || []).length ? ', which sets ' + s.outMap.map(m => `<span class="ad-code">${esc(m.input)}</span>`).join(' ') : '') + '.';
    }
    return '' + (s.appliesTo === 'some' ? ' Only for ' + s.tkeys.map(tn).join(', ') : '');
  }
  function stepCard(c, s, i, n) {
    const tn = k => { const t = c.templates.find(x => x.key === k); return t ? tplName(c, t) : k; };
    const chips = [`<span class="ad-chip">${STEP_TYPES[s.type].l}</span>`,
      `<span class="ad-chip">${s.appliesTo === 'some' ? 'Only: ' + esc(s.tkeys.map(tn).join(', ') || 'none') : 'All templates'}</span>`];
    if (s.type === 'validation') chips.push(`<span class="ad-chip">${s.severity === 'warn' ? 'Warns if false' : 'Blocks if false'}</span>`);
    else if (s.type === 'prompt') chips.push('<span class="ad-chip">Cancel stops generation</span>');
    else chips.push(`<span class="ad-chip">${({ stop: 'Stops on error', warn: 'Warns on error', ignore: 'Ignores errors' })[s.onError]}</span>`);
    if (s.phase === 'after') chips.push(`<span class="ad-chip">${s.runMode === 'async' ? 'Runs in background' : 'Runs right away'}</span>`);
    return `<div class="ad-scard" data-step="${s.id}">
      <span class="ad-sicon ${s.type}">${ic(STEP_TYPES[s.type].icon, 16, 2)}</span>
      <div><div class="ad-sname">${esc(s.name)}</div><div class="ad-smeta">${chips.join('')}</div><div class="ad-sdesc">${stepDesc(c, s)}</div></div>
      <div class="ad-tactions">
        <button class="ad-icon-btn" data-s-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ic('up', 14, 2.2)}</button>
        <button class="ad-icon-btn" data-s-move="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">${ic('down', 14, 2.2)}</button>
        <button class="ad-icon-btn" data-s-edit aria-label="Edit ${esc(s.name)}">${ic('edit', 14)}</button>
        <button class="ad-icon-btn is-danger" data-s-del aria-label="Remove ${esc(s.name)}">${ic('trash', 14)}</button>
      </div></div>`;
  }
  function stepSteps(c) {
    const before = c.steps.filter(s => s.phase === 'before'), after = c.steps.filter(s => s.phase === 'after');
    const addBtns = (phase, types) => `<div class="ad-addstep">${types.map(t => `<button class="ad-btn ad-btn-sm" data-add-step="${phase}:${t}">${ic(STEP_TYPES[t].icon, 14)} ${STEP_TYPES[t].l}</button>`).join('')}</div>`;
    const inRows = c.inputs.map((inp, i) => {
      const src = inputSources(c, inp);
      const def = inp.defType === 'none' || !inp.def ? '—' : inp.defType === 'literal' ? esc(inp.def) : `<span class="ad-code">${esc(inp.def)}</span>`;
      return `<tr data-ii="${i}">
        <td><span class="ad-code">{{input.${esc(inp.key)}}}</span></td>
        <td><b>${esc(inp.label)}</b>${inp.help ? `<div class="ad-tdesc">${esc(inp.help)}</div>` : ''}</td>
        <td>${esc(inp.type)}</td>
        <td class="c-center">${inp.required ? ic('check', 14, 2.6) : ''}</td>
        <td>${def}</td>
        <td>${src.length ? src.map(([k, l]) => `<span class="ad-src ${k}">${esc(l)}</span>`).join('') : `<span class="ad-src ${inp.required ? 'none' : 'default'}">${inp.required ? 'No source' : 'Optional'}</span>`}</td>
        <td><div class="ad-tactions"><button class="ad-icon-btn" data-i-edit aria-label="Edit ${esc(inp.key)}">${ic('edit', 14)}</button><button class="ad-icon-btn is-danger" data-i-del aria-label="Remove ${esc(inp.key)}">${ic('trash', 14)}</button></div></td>
      </tr>`;
    }).join('');
    return head('Before & after generation', 'Steps run in order every time someone clicks Generate. Before-steps can stop generation or feed values into the documents; after-steps react to what was created.') + `
      <div class="ad-section"><div class="ad-pipe">
        <div class="ad-pnode"><span class="dot">${ic('cursor', 14, 2)}</span> Someone clicks Generate</div>
        <div class="ad-plane"><div class="ad-plane-label">Before generating · ${before.length}</div>
          ${before.map((s, i) => stepCard(c, s, i, before.length)).join('')}
          ${addBtns('before', ['validation', 'prompt', 'apex', 'flow'])}</div>
        <div class="ad-pnode gen"><span class="dot">${ic('file', 14, 2)}</span> Generate documents <span class="ad-chip">inputs are merged into the templates</span></div>
        <div class="ad-plane"><div class="ad-plane-label">After generating · ${after.length}</div>
          ${after.map((s, i) => stepCard(c, s, i, after.length)).join('')}
          ${addBtns('after', ['apex', 'flow'])}</div>
        <div class="ad-pnode"><span class="dot">${ic('flag', 14, 2)}</span> Done — lifecycle events fire</div>
      </div></div>
      <div class="ad-section"><h3>Generation inputs <span class="ad-chip">${c.inputs.length}</span></h3>
        <p class="ad-help">Named values templates can merge, like <span class="ad-code">{{input.discount_pct}}</span>. A default, the host component, a prompt, Apex or a flow fills them in — later sources win.</p>
        ${c.inputs.length ? `<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Merge field</th><th>Label</th><th>Type</th><th class="c-center">Required</th><th>Default</th><th>Filled by</th><th></th></tr></thead><tbody>${inRows}</tbody></table></div>`
          : '<p class="ad-help">No inputs yet. Add one when a template needs a value that isn’t on the record.</p>'}
        <div class="ad-gap-top"><button class="ad-btn" data-add-input>${ic('plus', 15, 2.2)} Add input</button></div>
      </div>`;
  }
  async function stepModal(s, isNew) {
    const c = state.edit.cfg;
    const draft = clone(s);
    const rows = draft.conditions || [];
    const sources = () => ['record.Id', ...fieldsOf(c.object).map(f => 'record.' + f.p), ...c.inputs.map(i => 'input.' + i.key), 'context.userId', 'context.cardKey', 'context.placement', ...(draft.phase === 'after' ? ['context.documentIds'] : [])];
    const common = () => `
      <div class="mf"><label>Name</label><input data-m="name" value="${esc(draft.name)}"></div>
      <div class="mf"><label>Runs for</label>${sel([['all', 'Every template'], ['some', 'Only selected templates']], draft.appliesTo, 'data-m="appliesTo" data-rr')}
        ${draft.appliesTo === 'some' ? `<div class="ad-checklist ad-gap-top">${c.templates.map(t => `<label><input type="checkbox" data-m-check="tkeys" value="${esc(t.key)}" ${draft.tkeys.includes(t.key) ? 'checked' : ''}> ${esc(tplName(c, t))}</label>`).join('') || '<span class="m-note">Add templates first.</span>'}</div>` : ''}</div>`;
    const onErr = () => `<div class="mf"><label>If it fails</label>${sel([['stop', 'Stop generation and show the error'], ['warn', 'Warn and continue'], ['ignore', 'Continue silently']], draft.onError, 'data-m="onError"')}</div>`;
    const runMode = () => draft.phase === 'after' ? `<div class="mf"><label>Run</label>${mseg('runMode', [['sync', 'Right away — the person waits'], ['async', 'In the background']], draft.runMode)}</div>` : '';
    const mapRows = (kind) => (draft[kind] || []).map((m, i) => kind === 'inMap'
      ? `<div class="ad-mapping"><input class="ad-input mono" data-map="inMap" data-mi="${i}" data-mk="v" value="${esc(m.v)}" placeholder="flow variable"><span class="arrow">←</span>${sel(sources(), m.src, `data-map="inMap" data-mi="${i}" data-mk="src"`)}<button class="ad-icon-btn is-danger" data-map-del="inMap:${i}" aria-label="Remove">${ic('x', 14, 2.2)}</button></div>`
      : `<div class="ad-mapping">${sel(c.inputs.map(x => [x.key, 'input.' + x.key]), m.input, `data-map="outMap" data-mi="${i}" data-mk="input"`)}<span class="arrow">←</span><input class="ad-input mono" data-map="outMap" data-mi="${i}" data-mk="v" value="${esc(m.v)}" placeholder="flow output variable"><button class="ad-icon-btn is-danger" data-map-del="outMap:${i}" aria-label="Remove">${ic('x', 14, 2.2)}</button></div>`).join('');
    const bodies = {
      validation: () => common() + `
        <div class="mf"><label>Generation continues when</label>${mseg('logic', [['all', 'All are true'], ['any', 'Any is true']], draft.logic || 'all')}</div>
        ${condBuilder('modal', rows, c.object)}
        <div class="mf ad-gap-top"><label>Message when it fails</label><input data-m="message" value="${esc(draft.message || '')}" placeholder="Set a Close Date on {!Name} before generating.">
          <p class="m-note">Merge record fields with {!FieldName}.</p></div>
        <div class="mf"><label>When it fails</label>${mseg('severity', [['block', 'Block generation'], ['warn', 'Warn, but let them continue']], draft.severity || 'block')}</div>`,
      prompt: () => common() + `
        <div class="ad-mf-row"><div class="mf"><label>Prompt title</label><input data-m="title" value="${esc(draft.title || '')}"></div>
        <div class="mf"><label>Helper text</label><input data-m="intro" value="${esc(draft.intro || '')}"></div></div>
        <div class="mf"><label>Ask for these inputs</label>
          ${c.inputs.length ? `<div class="ad-checklist">${c.inputs.map(x => `<label><input type="checkbox" data-m-check="inputKeys" value="${esc(x.key)}" ${(draft.inputKeys || []).includes(x.key) ? 'checked' : ''}> ${esc(x.label)} <span class="ad-code">${esc(x.key)}</span></label>`).join('')}</div>` : '<p class="m-note">Add generation inputs first (below the steps), then pick them here.</p>'}</div>`,
      apex: () => common() + `
        <div class="mf"><label>Apex class</label>${sel(APEX[draft.phase], draft.cls, 'data-m="cls"')}
          <p class="m-note">Only classes that implement <span class="ad-code">SDOC.${draft.phase === 'before' ? 'BeforeGenerateHandler' : 'AfterGenerateHandler'}</span> are listed.</p></div>
        ${draft.phase === 'before' && c.inputs.length ? `<div class="mf"><label>Sets these inputs</label><div class="ad-checklist">${c.inputs.map(x => `<label><input type="checkbox" data-m-check="sets" value="${esc(x.key)}" ${(draft.sets || []).includes(x.key) ? 'checked' : ''}> ${esc(x.label)} <span class="ad-code">${esc(x.key)}</span></label>`).join('')}</div></div>` : ''}
        <div class="mf"><label>Parameters (JSON)</label><textarea class="mono" data-m="params" rows="3" spellcheck="false">${esc(draft.params || '')}</textarea></div>
        ${onErr()}${runMode()}`,
      flow: () => common() + `
        <div class="mf"><label>Flow</label>${sel(FLOWS[draft.phase], draft.flow, 'data-m="flow"')}
          <p class="m-note">Active autolaunched flows only.</p></div>
        <div class="mf"><label>Flow inputs</label>${mapRows('inMap')}<button class="ad-btn ad-btn-sm" data-map-add="inMap">${ic('plus', 13, 2.2)} Map an input</button></div>
        ${draft.phase === 'before' ? `<div class="mf"><label>Flow outputs → generation inputs</label>${c.inputs.length ? mapRows('outMap') + `<button class="ad-btn ad-btn-sm" data-map-add="outMap">${ic('plus', 13, 2.2)} Map an output</button>` : '<p class="m-note">Add generation inputs first.</p>'}</div>` : ''}
        ${onErr()}${runMode()}`
    };
    const ok = await openModal({
      title: (isNew ? 'Add ' : 'Edit ') + STEP_TYPES[draft.type].l.toLowerCase() + ' step', draft, rows, wide: true,
      render: bodies[draft.type],
      buttons: [{ label: 'Cancel', value: false }, { label: isNew ? 'Add step' : 'Save step', kind: 'primary', value: true, validate: () => {
        if (!draft.name.trim()) return 'Give the step a name.';
        if (draft.type === 'validation' && !rows.length) return 'Add at least one condition.';
        if (draft.type === 'validation' && !rows.every(rowComplete)) return 'Finish or remove the incomplete condition.';
        return null;
      } }]
    });
    if (!ok) return;
    if (draft.type === 'validation') draft.conditions = rows;
    const i = c.steps.findIndex(x => x.id === draft.id);
    if (i >= 0) c.steps[i] = draft; else c.steps.push(draft);
    markDirty(); renderStepBody(); refreshLive();
    toast(isNew ? `Step “${draft.name}” added.` : `Step “${draft.name}” saved.`);
  }
  function newStep(phase, type) {
    const c = state.edit.cfg;
    const base = { phase, type, name: '' };
    if (type === 'validation') Object.assign(base, { name: 'Check before generating', logic: 'all', conditions: [defaultRow('record', c.object)], severity: 'block', message: '' });
    if (type === 'prompt') Object.assign(base, { name: 'Ask before generating', title: 'Before we generate', intro: '', inputKeys: [] });
    if (type === 'apex') Object.assign(base, { name: phase === 'before' ? 'Prepare data' : 'Post-process documents', cls: APEX[phase][0], sets: [], params: '' });
    if (type === 'flow') Object.assign(base, { name: phase === 'before' ? 'Calculate values' : 'Follow-up flow', flow: FLOWS[phase][0], inMap: [{ v: 'recordId', src: 'record.Id' }], outMap: [], runMode: phase === 'after' ? 'async' : 'sync' });
    return step(base);
  }
  async function inputModal(i) {
    const c = state.edit.cfg;
    const isNew = i == null;
    const draft = isNew ? input({}) : clone(c.inputs[i]);
    const oldKey = draft.key;
    const ok = await openModal({
      title: isNew ? 'Add generation input' : 'Edit input', draft,
      render: () => `
        <div class="ad-mf-row"><div class="mf"><label>Label</label><input data-m="label" value="${esc(draft.label)}" placeholder="Approved discount %"></div>
        <div class="mf"><label>Key</label><input class="mono" data-m="key" value="${esc(draft.key)}" placeholder="discount_pct"><p class="m-note">Templates merge it as {{input.${esc(draft.key || 'key')}}}.</p></div></div>
        <div class="ad-mf-row"><div class="mf"><label>Type</label>${sel(INPUT_TYPES, draft.type, 'data-m="type" data-rr')}</div>
        ${draft.type === 'Picklist' ? `<div class="mf"><label>Options</label><input data-m="options" value="${esc(draft.options)}" placeholder="Option A; Option B"></div>` : '<div></div>'}</div>
        <div class="ad-mf-row"><div class="mf"><label>Default</label>${sel([['none', 'No default'], ['literal', 'A fixed value'], ['record', 'A record field'], ['user', 'A user field']], draft.defType, 'data-m="defType" data-rr')}</div>
        <div class="mf"><label>&nbsp;</label>${draft.defType === 'none' ? '<input disabled placeholder="—">'
          : draft.defType === 'literal' ? `<input data-m="def" value="${esc(draft.def)}">`
          : sel(['', ...(draft.defType === 'record' ? fieldsOf(c.object) : USER_FIELDS).map(f => f.p)], draft.def, 'data-m="def"')}</div></div>
        <div class="mf"><label>Help text</label><input data-m="help" value="${esc(draft.help)}"></div>
        <div class="ad-toggles">
          <div class="ad-toggle-row"><span><b>Required</b><span class="d">Generation won't start until it has a value.</span></span>${sw(draft.required, 'data-m="required"')}</div>
          <div class="ad-toggle-row"><span><b>Host can set it</b><span class="d">Lets a custom component or screen flow that embeds S-Docs pass this value in.</span></span>${sw(draft.host, 'data-m="host"')}</div>
        </div>`,
      buttons: [{ label: 'Cancel', value: false }, { label: isNew ? 'Add input' : 'Save input', kind: 'primary', value: true, validate: () => {
        if (!draft.label.trim()) return 'Give the input a label.';
        if (!/^[a-z][a-z0-9_]*$/.test(draft.key)) return 'The key must start with a letter and use lowercase letters, numbers and underscores.';
        if (c.inputs.some((x, j) => j !== i && x.key === draft.key)) return 'Another input already uses that key.';
        return null;
      } }]
    });
    if (!ok) return;
    if (isNew) c.inputs.push(draft);
    else {
      c.inputs[i] = draft;
      if (oldKey !== draft.key) c.steps.forEach(s => {
        ['inputKeys', 'sets'].forEach(f => { if (s[f]) s[f] = s[f].map(k => k === oldKey ? draft.key : k); });
        (s.outMap || []).forEach(m => { if (m.input === oldKey) m.input = draft.key; });
      });
    }
    markDirty(); renderStepBody(); refreshLive();
  }

  /* ---------------------------- step 6: review ---------------------------- */
  function validate(c) {
    const out = [];
    const add = (stepI, level, msg) => out.push({ step: stepI, level, msg });
    if (!String(c.name || '').trim()) add(0, 'err', 'Give the S-Docs Card a name.');
    if (!/^[a-z][a-z0-9_]*$/.test(c.key || '')) add(0, 'err', 'The key must start with a letter and use only lowercase letters, numbers and underscores.');
    else if ((state.configs[c.object] || []).some(x => x.id !== c.id && x.key === c.key)) add(0, 'err', `Another ${OBJ(c.object).label} S-Docs Card already uses the key “${c.key}”.`);
    if (c.runAs === 'system' && !(c.placements.length === 1 && c.placements[0] === 'experience')) add(0, 'err', 'Generating as system is only allowed when Experience Cloud is the only place it runs.');
    if (c.from && c.to && c.to < c.from) add(0, 'err', 'The end date is before the start date.');
    if (c.logic !== 'always') {
      if (!c.conditions.length) add(1, 'err', 'Add at least one condition, or choose Always.');
      c.conditions.forEach((r, i) => { if (!rowComplete(r)) add(1, 'err', `Condition ${i + 1} is missing a value.`); });
      if (c.logic === 'custom' && c.conditions.length) { const pr = parseLogic(c.customLogic, c.conditions.length); if (!pr.ok) add(1, 'err', 'Custom logic: ' + pr.error); }
    }
    if (!c.templates.length) add(2, 'err', 'Add at least one template.');
    c.templates.forEach(t => { if (t.rules.some(r => !rowComplete(r))) add(2, 'warn', `A rule on “${tplName(c, t)}” is incomplete.`); });
    if (!actionsOn(c).length) add(3, 'warn', 'No actions are on, so people can generate documents but not open or send them.');
    c.steps.forEach(s => {
      if (s.type === 'validation' && !(s.conditions || []).length) add(4, 'err', `Validation “${s.name}” has no condition.`);
      if (s.type === 'prompt' && !(s.inputKeys || []).length) add(4, 'warn', `“${s.name}” doesn't ask for any inputs.`);
      if (s.appliesTo === 'some' && !s.tkeys.some(k => c.templates.some(t => t.key === k))) add(4, 'err', `“${s.name}” runs for selected templates, but none of them are offered.`);
    });
    c.inputs.forEach(inp => { if (inp.required && !inputSources(c, inp).length) add(4, 'err', `Required input “${inp.key}” has no source. Give it a default, ask for it, or set it from a step.`); });
    const list = effectiveList(c.object);
    const i = list.findIndex(x => x.id === c.id);
    for (let j = 0; j < i; j++) if (isOpenFallback(list[j])) { add(5, 'warn', `#${j + 1} “${list[j].name}” always matches first, so this S-Docs Card will never be used. Move it above “${list[j].name}” on the list.`); break; }
    if (isOpenScope(c) && i >= 0 && i < list.length - 1) add(5, 'warn', `This S-Docs Card always matches, so the ${plural(list.length - 1 - i, 'S-Docs Card')} below it will never be used.`);
    return out;
  }
  function stepReview(c) {
    const v = validate(c);
    const items = [];
    STEPS.slice(0, 5).forEach((l, i) => {
      const mine = v.filter(x => x.step === i);
      if (!mine.length) items.push(`<li class="ok">${ic('check', 15, 2.6)}<span><b>${esc(l)}</b> looks good.</span></li>`);
      mine.forEach(x => items.push(`<li class="${x.level}">${ic('alert', 15, 2)}<span>${esc(x.msg)}<button class="ad-link" data-step-go="${i}">Fix in ${esc(l)}</button></span></li>`));
    });
    v.filter(x => x.step === 5).forEach(x => items.push(`<li class="warn">${ic('alert', 15, 2)}<span>${esc(x.msg)}</span></li>`));
    const errs = v.filter(x => x.level === 'err').length;
    const before = c.steps.filter(s => s.phase === 'before'), after = c.steps.filter(s => s.phase === 'after');
    return head('Review & activate', errs ? `Fix ${plural(errs, 'issue')} before you can activate.` : 'Everything checks out. Test it with a real record and person, then activate.') + `
      <div class="ad-section"><ul class="ad-checks">${items.join('')}</ul></div>
      <div class="ad-section"><h3>Summary</h3><div class="ad-rsum">
        <div class="ad-rcard"><h4>Scope <button class="ad-link" data-step-go="0">Edit</button></h4><ul>
          <li>${c.placements.length ? 'Runs on ' + esc(placeList(c.placements)) : 'Runs anywhere'}</li>
          ${c.from || c.to ? `<li>${esc(fmtDate(c.from) || '…')} – ${esc(fmtDate(c.to) || '…')}</li>` : ''}
          <li>Generates as ${c.runAs === 'system' ? '<b>system</b>' : 'the running user'}</li></ul></div>
        <div class="ad-rcard"><h4>Templates <button class="ad-link" data-step-go="2">Edit</button></h4><ul>${c.templates.map(t => `<li>${t.featured ? '★ ' : ''}${esc(tplName(c, t))}${t.rules.length ? ' <span class="ad-chip">rule</span>' : ''}</li>`).join('') || '<li>None</li>'}</ul></div>
        <div class="ad-rcard wide"><h4>Applies when <button class="ad-link" data-step-go="1">Edit</button></h4><p>${condSummaryHtml(c.logic, c.customLogic, c.conditions, c.object)}</p></div>
        <div class="ad-rcard"><h4>Actions <button class="ad-link" data-step-go="3">Edit</button></h4><ul>${actionsOn(c).map(a => `<li>${esc(a.l)}${c.actions[a.k].who !== 'all' ? ` <span class="ad-chip">${c.actions[a.k].who === 'creator' ? 'creator only' : 'owner only'}</span>` : ''}</li>`).join('') || '<li>None</li>'}</ul></div>
        <div class="ad-rcard"><h4>Steps <button class="ad-link" data-step-go="4">Edit</button></h4><ul>
          ${before.map(s => `<li>Before · ${esc(s.name)}</li>`).join('')}${after.map(s => `<li>After · ${esc(s.name)}</li>`).join('')}
          ${c.steps.length ? '' : '<li>None</li>'}${c.inputs.length ? `<li>${plural(c.inputs.length, 'input')}: ${c.inputs.map(x => `<span class="ad-code">${esc(x.key)}</span>`).join(' ')}</li>` : ''}</ul></div>
      </div></div>`;
  }

  async function saveEdit(status) {
    const E = state.edit, c = E.cfg;
    if (status === 'Active') {
      const errs = validate(c).filter(x => x.level === 'err');
      if (errs.length && E.mode !== 'advanced') { E.showIssues = true; renderEditor(); window.scrollTo(0, 0); toast(`Fix ${plural(errs.length, 'issue')} before activating.`, 'err'); return; }
      if (errs.length) { E.step = 5; renderEditor(); toast(`Fix ${plural(errs.length, 'issue')} before activating.`, 'err'); return; }
    }
    if (!String(c.name).trim() || !/^[a-z][a-z0-9_]*$/.test(c.key)) { E.step = 0; E.showIssues = true; renderEditor(); toast('Give it a name and a valid key first.', 'err'); return; }
    const wasActive = c.status === 'Active';
    c.status = status;
    c.modified = 'Oct 2, 2026';
    const list = state.configs[c.object];
    let prio;
    if (E.isNew) { prio = insertIndex(list, E.pos); list.splice(prio, 0, c); }
    else { prio = list.findIndex(x => x.id === E.origId); list[prio] = c; }
    state.edit = null;
    state.view = 'list';
    state.object = c.object;
    render();
    window.scrollTo(0, 0);
    toast(status === 'Active' ? (wasActive ? `“${c.name}” saved. Changes are live.` : `“${c.name}” is active at priority ${prio + 1}.`)
      : status === 'Inactive' ? `“${c.name}” deactivated.` : `“${c.name}” saved as a draft.`);
  }
  async function leaveEditor() {
    if (state.edit && state.edit.dirty) {
      const ok = await confirmModal('Discard changes?', 'You have unsaved changes to this S-Docs Card.', 'Discard changes', true);
      if (!ok) return;
    }
    state.edit = null;
    state.view = 'list';
    render();
  }

  /* =======================================================================
     LIVE PREVIEW (the real S-Docs card, driven by an S-Docs Card)
     ======================================================================= */
  function visibleTemplates(c, rec, user) {
    const shown = [], hidden = [];
    c.templates.forEach(t => {
      if (!t.rules.length || evalConditions('all', '', t.rules, c.object, rec, user).pass) shown.push(t);
      else hidden.push(t);
    });
    return { shown, hidden };
  }
  function docFrom(c, t, when, status, rec) {
    const L = libTpl(c.object, t.tid) || {};
    // Sample output names say "PseudoCo"; use the record's account instead.
    const acct = rec && rec.Name ? String(rec.Name).split(/[–,]/)[0].trim() : 'PseudoCo';
    return { id: uid('doc'), key: t.key, name: String(L.out || L.name || t.key).replace(/PseudoCo/g, acct), fmt: L.fmt || 'PDF', esign: !!L.esign, when: when || '', status: status || 'ready' };
  }
  function pvState(ns, c, rec, user) {
    const sig = c.id + '|' + c.templates.map(t => t.key + (t.pre ? '*' : '') + t.rules.length).join(',') + '|' + rec.Id + '|' + user.id + '|' + c.multi;
    let p = state.pv[ns];
    if (!p || p.sig !== sig) {
      const vis = visibleTemplates(c, rec, user).shown;
      let picked = vis.filter(t => t.pre).map(t => t.key);
      if (!c.multi) picked = picked.slice(0, 1);
      const live = ['lab', 'rec', 'flowrun'].includes(ns);
      p = state.pv[ns] = { sig, picked: new Set(picked), favs: new Set(), open: !live, lastBatch: [], menuFor: null, busy: false,
        docs: ['rec', 'flowrun'].includes(ns) ? [] : vis[0] ? [docFrom(c, vis[0], 'Sep 30, 2026 14:05', 'ready', rec)] : [] };
    }
    return p;
  }
  function cardHtml(ns, c, rec, user, opts) {
    opts = opts || {};
    const p = pvState(ns, c, rec, user);
    const { shown, hidden } = visibleTemplates(c, rec, user);
    const L = t => libTpl(c.object, t.tid) || { name: t.key, desc: '' };
    const isFav = t => t.featured || p.favs.has(t.key);
    const opt = (t, mode) => {
      const picked = p.picked.has(t.key);
      const control = mode === 'star'
        ? `<button class="sd-star" data-pv-star="${t.key}" data-ns="${ns}" title="${t.featured ? 'Featured by your admin' : isFav(t) ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${isFav(t)}" ${!c.favorites || t.featured ? 'disabled' : ''}>${starSvg(isFav(t))}</button>`
        : `<span class="sd-check-wrap"><input type="checkbox" tabindex="-1" ${picked ? 'checked' : ''} aria-hidden="true"><span class="sd-check"></span></span>`;
      return `<div class="sd-opt${picked ? ' is-selected' : ''}" data-pv-opt="${t.key}" data-ns="${ns}" role="option" aria-selected="${picked}">${control}<span class="sd-opt-text"><span class="sd-opt-name">${esc(L(t).name)}</span><span class="sd-opt-desc">${esc(L(t).desc)}</span></span></div>`;
    };
    let list;
    if (!shown.length) list = '<p class="sd-empty-opt">No templates are available on this record.</p>';
    else if (c.picker === 'fav') {
      const favs = shown.filter(isFav);
      list = (favs.length ? `<div class="sd-group">Favorites (${favs.length})</div>` + favs.map(t => opt(t, 'star')).join('') : '') +
        `<div class="sd-group">All Templates (${shown.length})</div>` + shown.map(t => opt(t, 'star')).join('');
    } else if (c.picker === 'grouped') {
      const groups = {};
      shown.forEach(t => { const g = t.group || 'Other'; (groups[g] = groups[g] || []).push(t); });
      list = Object.keys(groups).map(g => `<div class="sd-group">${esc(g)} (${groups[g].length})</div>` + groups[g].map(t => opt(t, 'check')).join('')).join('');
    } else list = shown.map(t => opt(t, 'check')).join('');

    const pickedT = shown.filter(t => p.picked.has(t.key));
    const comboVal = !pickedT.length ? '<span class="sd-combo-placeholder">Select</span>'
      : pickedT.length === 1 ? `<span class="sd-combo-text"><span class="l1">${esc(L(pickedT[0]).name)}</span></span>`
      : `<span class="sd-combo-text"><span class="l1">${pickedT.length} templates selected</span></span>`;

    const acts = actionsOn(c);
    const bar = acts.filter(a => c.actions[a.k].surface !== 'menu');
    const menu = acts.filter(a => c.actions[a.k].surface !== 'toolbar');
    const who = a => ({ creator: 'creator only', owner: 'owner only' })[c.actions[a.k].who] || '';
    const row = d => d.status === 'generating'
      ? `<li class="sd-row is-generating"><span class="sd-row-spinner" aria-hidden="true"></span><span class="sd-row-text"><span class="sd-row-name">${esc(d.name)}</span><span class="sd-row-meta"><span class="sd-generating-meta">Generating…</span></span></span></li>`
      : `<li class="sd-row"><span class="sd-row-text"><span class="sd-row-name">${esc(d.name)}</span><span class="sd-row-meta"><span>${esc(d.when)}</span><span>${esc(d.fmt)}</span>${d.sig === 'sent' ? '<span class="ad-sig sent">Out for signature</span>' : d.sig === 'signed' ? '<span class="ad-sig signed">✓ Signed</span>' : d.esign && c.actions.sign.on ? '<span class="esign">E-Sign Enabled</span>' : ''}</span></span>
          ${menu.length ? `<button class="sd-kebab${p.menuFor === d.id ? ' open' : ''}" data-pv-kebab="${d.id}" data-ns="${ns}" aria-label="More actions for ${esc(d.name)}" aria-expanded="${p.menuFor === d.id}">&bull;&bull;&bull;</button>` : ''}</li>` +
        (p.menuFor === d.id ? `<li class="ad-pv-menu-li"><div class="ad-pv-menu" role="menu">${menu.map(a => `<button class="sd-menu-item" data-pv-act="${a.k}" data-doc="${d.id}" data-ns="${ns}" ${a.k === 'delete' ? 'data-menu="delete"' : ''}>${ic(a.icon, 16)} ${esc(a.l)}${who(a) ? ` <span class="ad-who">· ${who(a)}</span>` : ''}</button>`).join('')}</div></li>` : '');
    const docs = p.docs.length
      ? `<section class="sd-docs"><div class="sd-docs-bar"><span class="sd-docs-title">Documents</span>${bar.length ? `<div class="sd-actions">${bar.map(a => `<button class="sd-act" data-pv-act="${a.k}" data-ns="${ns}">${ic(a.icon, 14)} ${esc(a.short || a.l)}</button>`).join('')}</div>` : ''}</div><ul class="sd-rows">${p.docs.map(row).join('')}</ul></section>`
      : '<p class="sd-empty">Your generated documents will appear here</p>';

    return `<article class="sd-card">
      <header class="sd-head">${LOGO}<h2>${esc(opts.title || 'S-Docs')}</h2></header>
      ${opts.show === 'docs' ? '' : `<div class="sd-gen"><span class="sd-gen-label">Generate a document</span>
        <div class="sd-gen-row">
          <div class="sd-combo-wrap"><button class="sd-combo${p.open ? ' open' : ''}" data-pv-combo data-ns="${ns}" aria-expanded="${p.open}"><span class="sd-combo-value">${comboVal}</span>${CARET}</button></div>
          <button class="sd-generate${p.busy ? ' is-busy' : ''}" data-pv-gen data-ns="${ns}" ${!pickedT.length || p.busy ? 'disabled' : ''}><span class="sd-gen-spinner" aria-hidden="true"></span><span>${p.busy ? 'Generating…' : 'Generate'}</span></button>
        </div>
        ${p.open ? `<div class="sd-drop"><div class="sd-drop-list" role="listbox" aria-multiselectable="${c.multi}">${list}</div>
          ${pickedT.length ? `<div class="sd-drop-foot"><span>${plural(pickedT.length, 'template')} selected</span><span>${c.multi ? '' : 'One at a time'}</span></div>` : ''}
          ${hidden.length ? `<div class="ad-pv-hidden">${ic('eyeoff', 12)} Hidden on this record by a rule: ${hidden.map(t => esc(L(t).name)).join(', ')}</div>` : ''}</div>` : ''}
      </div>`}
      ${opts.show === 'gen' ? '' : docs}
      ${opts.details || ''}
    </article>`;
  }
  function flowSummary(c) {
    const before = c.steps.filter(s => s.phase === 'before'), after = c.steps.filter(s => s.phase === 'after');
    const afterTxt = ({ stay: 'stays on the list', preview: 'opens a preview', email: 'opens the email editor', sign: 'opens the signature request' })[c.afterGen];
    return `<div class="ad-pv-flow"><b>On Generate:</b> ${before.length ? before.map(s => esc(s.name)).join(' → ') + ' → ' : ''}<b>generate</b>${after.length ? ' → ' + after.map(s => esc(s.name) + (s.runMode === 'async' ? ' (background)' : '')).join(' → ') : ''}. Then it ${afterTxt}.</div>`;
  }
  function renderPreview() {
    const el = $('#ad-preview');
    if (!el || !state.edit) return;
    const c = state.edit.cfg;
    const rec = recordsOf(c.object)[0], user = USERS[0];
    el.innerHTML = `
      <div class="ad-pv-head"><b>Live preview</b><span class="ad-chip">${ic('eye', 12)} What people see</span></div>
      <div class="ad-pv-ctx">As <b>${esc(user.name)}</b> on <b>${esc(rec.Name)}</b>. Click <b>Generate</b> to try it.</div>
      <div>${cardHtml('ed', c, rec, user)}</div>
      <div class="ad-pv-side">${PHASE1 ? '' : flowSummary(c)}${evLogHtml()}</div>`;
  }
  function pvCtx(ns) {
    if (ns === 'rec') { const rec = recordsOf('Opportunity')[state.recv.rec], user = userById(state.recv.user); return { c: pageResolve(rec, user), rec, user, rerender: renderRecordSide }; }
    if (ns === 'flowrun') { const r = flowResolve(); return { c: r.c, rec: r.rec, user: r.user, rerender: () => { renderFlowRun(); if (state.flow.debug) { const d = $('.fb-dlog'); if (d) renderFlow(); } } }; }
    if (ns === 'lab') { const r = labResolve(); return { c: r.c, rec: r.rec, user: r.user, rerender: renderLabCanvas }; }
    if (ns === 'ed') { const c = state.edit.cfg; return { c, rec: recordsOf(c.object)[0], user: USERS[0], rerender: renderPreview }; }
    const T_ = state.test, rec = recordsOf(T_.object)[T_.rec] || recordsOf(T_.object)[0], user = userById(T_.user);
    const res = resolve(testList(), T_.object, { rec, user, placement: T_.placement });
    return { c: res.winner && res.winner.cfg, rec, user, rerender: renderTestPreview };
  }
  const mergeMsg = (msg, rec) => String(msg || '').replace(/\{!([\w.]+)\}/g, (_, f) => rec[f] != null ? rec[f] : '');
  const SAMPLE_OUT = { pricing_tier: 'Enterprise — Tier 2', uplift_pct: '7' };

  async function pvGenerate(ns) {
    const { c, rec, user, rerender } = pvCtx(ns);
    if (!c) return;
    const p = pvState(ns, c, rec, user);
    const picked = visibleTemplates(c, rec, user).shown.filter(t => p.picked.has(t.key));
    if (!picked.length || p.busy) return;
    const keys = picked.map(t => t.key);
    const applies = s => s.appliesTo !== 'some' || s.tkeys.some(k => keys.includes(k));
    const values = {};
    c.inputs.forEach(i => {
      if (i.defType === 'literal') values[i.key] = i.def;
      else if (i.defType === 'record') values[i.key] = rec[i.def] != null ? rec[i.def] : '';
      else if (i.defType === 'user') values[i.key] = user.f[i.def] != null ? user.f[i.def] : '';
    });
    emit('cardresolved', `${c.key} (#${effectiveList(c.object).findIndex(x => x.id === c.id) + 1})`, c);

    for (const s of c.steps.filter(x => x.phase === 'before' && applies(x))) {
      if (s.type === 'validation') {
        const ev = evalConditions(s.logic || 'all', '', s.conditions, c.object, rec, user);
        if (ev.pass) continue;
        const msg = esc(mergeMsg(s.message, rec)) || 'This record isn’t ready for these documents.';
        if (s.severity === 'warn') {
          const go = await openModal({ title: 'Before you generate', render: () => `<div class="ad-validation-box">${ic('alert', 18, 2)}<span>${msg}</span></div>`,
            buttons: [{ label: 'Cancel', value: false }, { label: 'Generate anyway', kind: 'primary', value: true }] });
          if (!go) { emit('generationblocked', `warned by “${s.name}”, cancelled`, c); return; }
        } else {
          emit('generationblocked', `blocked by “${s.name}”`, c);
          await openModal({ title: 'Can’t generate yet', render: () => `<div class="ad-validation-box">${ic('alert', 18, 2)}<span>${msg}</span></div>`, buttons: [{ label: 'OK', kind: 'primary', value: true }] });
          return;
        }
      } else if (s.type === 'prompt') {
        const fields = (s.inputKeys || []).map(k => c.inputs.find(i => i.key === k)).filter(Boolean);
        if (!fields.length) continue;
        const draft = {};
        fields.forEach(f => { draft[f.key] = values[f.key] != null ? values[f.key] : (f.type === 'Checkbox' ? false : ''); });
        const ok = await openModal({
          title: s.title || 'Before we generate', draft,
          render: () => `${s.intro ? `<p class="ad-prompt-intro">${esc(s.intro)}</p>` : ''}` + fields.map(f => {
            const lab = `<label>${esc(f.label)}${f.required ? ' <span class="ad-req">*</span>' : ''}</label>`;
            let ctl;
            if (f.type === 'Contact') ctl = sel([['', 'Choose a contact…'], ...CONTACTS.map(x => [x, x])], draft[f.key], `data-m="${f.key}"`);
            else if (f.type === 'Picklist') ctl = sel([['', 'Choose…'], ...toList(f.options).map(x => [x, x])], draft[f.key], `data-m="${f.key}"`);
            else if (f.type === 'Checkbox') ctl = sw(draft[f.key], `data-m="${f.key}"`);
            else if (f.type === 'Long text') ctl = `<textarea data-m="${f.key}">${esc(draft[f.key])}</textarea>`;
            else ctl = `<input ${['Number', 'Currency', 'Percent'].includes(f.type) ? 'type="number"' : f.type === 'Date' ? 'type="date"' : ''} data-m="${f.key}" value="${esc(draft[f.key])}">`;
            return `<div class="mf">${lab}${ctl}${f.help ? `<p class="m-note">${esc(f.help)}</p>` : ''}</div>`;
          }).join(''),
          buttons: [{ label: 'Cancel', value: false }, { label: 'Continue', kind: 'primary', value: true, validate: () => {
            const miss = fields.filter(f => f.required && isBlank(draft[f.key]));
            return miss.length ? 'Fill in ' + miss.map(f => f.label).join(', ') + '.' : null;
          } }]
        });
        if (!ok) { emit('generationcancelled', `at “${s.name}”`, c); return; }
        Object.assign(values, draft);
      } else {
        toast(s.type === 'apex' ? `Running ${s.cls}…` : `Running flow ${s.flow}…`, 'info');
        await wait(650);
        (s.type === 'apex' ? (s.sets || []) : (s.outMap || []).map(m => m.input)).forEach(k => { values[k] = SAMPLE_OUT[k] || 'calculated'; });
      }
    }
    const missing = c.inputs.filter(i => i.required && isBlank(values[i.key]));
    if (missing.length) {
      emit('generationblocked', 'missing ' + missing.map(i => i.key).join(', '), c);
      await openModal({ title: 'Can’t generate yet', render: () => `<div class="ad-validation-box">${ic('alert', 18, 2)}<span>Required input${missing.length > 1 ? 's' : ''} ${missing.map(i => `<b>${esc(i.label)}</b>`).join(', ')} ${missing.length > 1 ? 'have' : 'has'} no value. Nothing in this S-Docs Card fills ${missing.length > 1 ? 'them' : 'it'} in for this template.</span></div>`, buttons: [{ label: 'OK', kind: 'primary', value: true }] });
      return;
    }
    const shownInputs = Object.keys(values).filter(k => !isBlank(values[k]));
    emit('generationstarted', `${plural(picked.length, 'template')}${shownInputs.length ? ' · inputs: ' + shownInputs.map(k => `${k}=${values[k]}`).join(', ') : ''}`, c);
    p.busy = true;
    p.open = false;
    p.menuFor = null;
    const pending = picked.map(t => docFrom(c, t, '', 'generating', rec));
    p.docs = pending.concat(p.docs);
    p.picked.clear();
    rerender();
    for (const d of pending) {
      await wait(700);
      d.status = 'ready';
      d.when = stamp();
      emit('documentgenerated', `“${d.name}”`, c);
      rerender();
    }
    p.busy = false;
    p.lastBatch = pending.map(d => d.id);
    state.genCount[ns] = (state.genCount[ns] || 0) + 1;
    emit('generationcompleted', `${plural(pending.length, 'document')}, 0 failed`, c);
    rerender();
    const then = ({ preview: 'Opening a preview…', email: 'Opening the email editor…', sign: 'Opening the signature request…' })[c.afterGen];
    toast(pending.length === 1 ? `“${pending[0].name}” was generated.` + (then ? ' ' + then : '') : `${pending.length} documents were generated.` + (then ? ' ' + then : ''));
    for (const s of c.steps.filter(x => x.phase === 'after' && applies(x))) {
      if (s.runMode === 'async') { setTimeout(() => emit('afterstepcompleted', `“${s.name}” (background)`, c), 1400); }
      else { toast(`Running ${s.type === 'apex' ? s.cls : 'flow ' + s.flow}…`, 'info'); await wait(500); emit('afterstepcompleted', `“${s.name}”`, c); }
    }
  }
  function pvAction(ns, k, docId) {
    const { c, rec, user, rerender } = pvCtx(ns);
    if (!c) return;
    const p = pvState(ns, c, rec, user);
    const a = ACTIONS.find(x => x.k === k);
    const d = p.docs.find(x => x.id === docId) || p.docs.find(x => x.status === 'ready');
    p.menuFor = null;
    if (!d) { rerender(); return; }
    if (k === 'sign' && ['rec', 'flowrun'].includes(ns)) {
      const batch = docId ? [d] : p.lastBatch.map(id => p.docs.find(x => x.id === id)).filter(x => x && x.status === 'ready' && !x.sig);
      if (!batch.length) { rerender(); toast('Generate a document first, or pick one from its menu.', 'info'); return; }
      rerender();
      signModal(ns, batch);
      return;
    }
    const w = c.actions[k].who;
    if (w === 'creator' || w === 'owner') toast(`${a.l} is limited to the ${w === 'creator' ? 'document creator' : 'record owner'}; other people don't see it.`, 'info');
    if (k === 'delete') { p.docs = p.docs.filter(x => x.id !== d.id); emit('documentdeleted', `“${d.name}”`, c); toast(`“${d.name}” deleted (preview).`); }
    else {
      const map = { email: 'emailsent', sign: 'signaturerequested', refresh: 'documentrefreshed' };
      emit(map[k] || 'actioninvoked', map[k] ? `“${d.name}”` : `${k} · “${d.name}”`, c);
      if (!w || w === 'all') toast(`${a.l}: “${d.name}” (preview).`, 'info');
    }
    rerender();
  }

  /* =======================================================================
     VIEW: TEST
     ======================================================================= */
  function renderTest() {
    const T_ = state.test, E = state.edit;
    if (E) T_.object = E.cfg.object;
    const obj = T_.object, recs = recordsOf(obj);
    if (T_.rec >= recs.length) T_.rec = 0;
    app.innerHTML = `
      <section class="sf-card ad-header">
        <div class="ad-hicon">${ic('flask', 20, 2)}</div>
        <div class="ad-htitle">
          <div class="ad-eyebrow"><a href="#" data-back>${E ? 'Back to ' + esc(E.cfg.name || 'editing') : 'S-Docs Cards'}</a></div>
          <h1>Which S-Docs Card applies?</h1>
          <div class="ad-hsub">Pick a record and a person. S-Docs checks S-Docs Cards from the top and stops at the first match.</div>
        </div>
        <div class="ad-hactions"><button class="ad-btn" data-back>${ic('back', 14)} ${E ? 'Back to editing' : 'Back to S-Docs Cards'}</button></div>
      </section>
      ${E ? `<div class="ad-note ad-gap-top">${ic('info', 16)}<div>Testing with your <b>unsaved changes</b> to <b>${esc(E.cfg.name)}</b>${E.cfg.status !== 'Active' ? ` — treated as <b>Active</b> here so you can see where it would land` : ''}.</div></div>` : ''}
      <div class="ad-test">
        <div>
          <section class="sf-card ad-test-controls">
            <div class="ad-grid-ctl">
              <div class="ad-field"><label for="tf-obj">Object</label>${sel(railObjects().map(o => [o, OBJ(o).label]), obj, `id="tf-obj" data-tf="object" ${E ? 'disabled' : ''}`)}</div>
              <div class="ad-field"><label for="tf-rec">Record</label>${sel(recs.map((r, i) => [i, r.Name]), T_.rec, 'id="tf-rec" data-tf="rec"')}</div>
              <div class="ad-field"><label for="tf-user">Run as</label>${sel(USERS.map(u => [u.id, u.name + ' — ' + u.title]), T_.user, 'id="tf-user" data-tf="user"')}</div>
              ${PHASE1 ? '' : `<div class="ad-field"><label for="tf-pl">Where it runs</label>${sel(PLACEMENTS.map(p => [p.k, p.l]), T_.placement, 'id="tf-pl" data-tf="placement"')}</div>`}
            </div>
            <div class="ad-recsum" id="ad-recsum"></div>
          </section>
          <section class="sf-card ad-trace-card" id="ad-trace"></section>
        </div>
        <aside class="ad-test-pv" id="ad-test-pv" aria-label="Result preview"></aside>
      </div>`;
    updateTest(true);
  }
  function testList() {
    const E = state.edit;
    const list = effectiveList(state.test.object);
    if (!E) return list;
    return list.map(c => c.id === E.cfg.id && c.status !== 'Active' ? Object.assign({}, c, { status: 'Active' }) : c);
  }
  function updateTest(emitResolved) {
    const T_ = state.test, obj = T_.object;
    const rec = recordsOf(obj)[T_.rec] || recordsOf(obj)[0], user = userById(T_.user);
    const res = resolve(testList(), obj, { rec, user, placement: T_.placement });
    const fl = fieldsOf(obj);
    $('#ad-recsum').innerHTML = fl.slice(0, 7).map(f => `<span>${esc(f.l)}: <b>${esc(isBlank(rec[f.p]) ? '—' : fmtVal(rec[f.p], f.t))}</b></span>`).join('') +
      `<span>Profile: <b>${esc(user.profile)}</b></span><span>Role: <b>${esc(user.role || '—')}</b></span><span>Permission sets: <b>${esc(user.permsets.join(', ') || '—')}</b></span><span>Groups: <b>${esc(user.groups.join(', ') || '—')}</b></span>`;
    const w = res.winner;
    const label = { win: 'Wins', fail: 'Conditions not met', skip: 'Skipped', unevaluated: 'Not checked' };
    $('#ad-trace').innerHTML = `
      <div class="ad-trace-head"><h2>Evaluation order</h2>
        ${w ? `<span class="ad-outcome win">${ic('check', 12, 2.8)} #${w.prio} ${esc(w.cfg.name)} wins</span>` : '<span class="ad-outcome fail">No S-Docs Card matches — no templates are shown</span>'}</div>
      <ol class="ad-trace">${res.trace.map(t => `
        <li class="ad-tr is-${t.outcome}">
          <span class="ad-prio">${t.prio}</span>
          <div>
            <div class="ad-tr-top"><span class="ad-tr-name">${esc(t.cfg.name)}</span>${t.cfg.status !== 'Active' ? statusPill(t.cfg.status) : ''}
              <span class="ad-outcome ${t.outcome}">${t.outcome === 'win' ? ic('check', 11, 3) + ' ' : ''}${label[t.outcome]}</span>
              ${state.edit ? '' : `<button class="ad-link" data-edit-cfg="${t.cfg.id}">Open</button>`}</div>
            <div class="ad-tr-why">${esc(t.why)}</div>
            ${t.rows && t.rows.length ? `<ul class="ad-tr-rows">${t.rows.map(r => `<li class="${r.pass ? 'pass' : 'fail'}"><span class="mk">${ic(r.pass ? 'check' : 'x', 11, 3)}</span><span><b>${r.n}.</b> ${esc(r.text)} <span class="act">— ${esc(r.actual)}</span></span></li>`).join('')}</ul>${t.cfg.logic === 'custom' ? `<div class="ad-tr-logic">${esc(t.note)}</div>` : ''}` : ''}
          </div>
        </li>`).join('') || '<li class="ad-empty"><p>No S-Docs Cards for this object.</p></li>'}</ol>`;
    renderTestPreview();
    if (emitResolved) emit('cardresolved', w ? `${w.cfg.key} (#${w.prio}) for ${user.name} on ${rec.Name}` : `none for ${user.name} on ${rec.Name}`, w && w.cfg);
  }
  function renderTestPreview() {
    const el = $('#ad-test-pv');
    if (!el) return;
    const { c, rec, user } = pvCtx('test');
    el.innerHTML = `<div class="ad-pv-head"><b>What ${esc(user.name.split(' ')[0])} sees</b>${c ? `<span class="ad-chip">${esc(c.name)}</span>` : ''}</div>` +
      (c ? cardHtml('test', c, rec, user) + (PHASE1 ? '' : flowSummary(c))
        : `<div class="ad-pv-none"><b>No document options here</b>No S-Docs Card matches this record, person and placement, so the component shows an empty state. Add a <b>Default</b> S-Docs Card if everyone should get something.</div>`) +
      evLogHtml();
  }


  /* =======================================================================
     VIEW: LIGHTNING APP BUILDER (simulated)
     ======================================================================= */
  function labResolve() {
    const L = state.lab, obj = L.object;
    const recs = recordsOf(obj), rec = recs[L.rec] || recs[0], user = userById(L.user);
    const res = resolve(state.configs[obj] || [], obj, { rec, user, placement: 'record' });
    return res.winner ? { c: res.winner.cfg, rec, user, prio: res.winner.prio } : { c: null, rec, user, why: `No S-Docs Card matches ${user.name} on ${rec.Name}, so the component shows an empty state.` };
  }
  const labInfo = t => `<span class="lab-i" title="${esc(t)}">${ic('info', 13)}</span>`;

  function renderLab() {
    const L = state.lab, label = OBJ(L.object).label;
    app.innerHTML = `
      <div class="lab">
        <div class="lab-top">
          <button data-lab-exit aria-label="Back to S-Docs Cards">${ic('back', 16, 2)}</button>
          <span>${ic('layers', 15)} Lightning App Builder</span>
          <button class="lab-pages" data-lab-pages aria-haspopup="menu">${ic('file', 14)} Pages ${ic('down', 12, 2.4)}</button>
          <span class="lab-page-name">${esc(label)} Record Page</span>
          <span class="lab-top-help">${ic('info', 14)} Help</span>
        </div>
        <div class="lab-tools">
          <span class="lab-tgroup"><button disabled aria-label="Undo">↶</button><button disabled aria-label="Redo">↷</button></span>
          <span class="lab-tgroup"><button aria-label="Cut">${ic('x', 13)}</button><button aria-label="Copy">${ic('copy', 13)}</button><button disabled aria-label="Paste">${ic('file', 13)}</button></span>
          <select class="lab-sel" aria-label="Form factor"><option>Desktop</option><option>Phone</option></select>
          <select class="lab-sel" aria-label="Zoom"><option>Shrink To View</option><option>100%</option></select>
          <span class="lab-tgroup"><button aria-label="Refresh">${ic('refresh', 13)}</button></span>
          <div class="lab-tools-right"><button class="sf-btn">Analyze</button><button class="sf-btn">Activation...</button><button class="sf-btn sf-btn-brand" data-lab-save>Save</button></div>
        </div>
        <div class="lab-body">
          <aside class="lab-palette" aria-label="Components">
            <div class="lab-tabs"><button class="active">Components</button><button>Fields</button></div>
            <div class="lab-search">${ic('search', 14, 2)}<input type="text" data-lab-search value="${esc(L.q)}" placeholder="Search..." aria-label="Search components"></div>
            <div id="lab-pal">${labPaletteHtml()}</div>
            <div class="lab-appx">Get more on AppExchange</div>
          </aside>
          <main class="lab-canvas" id="lab-canvas"></main>
          <aside class="lab-props" id="lab-props" aria-label="Properties"></aside>
        </div>
      </div>`;
    renderLabCanvas();
    renderLabProps();
  }
  function labPaletteHtml() {
    const L = state.lab, q = lc(L.q);
    const std = ['Accordion', 'Action Launcher', 'Actions & Recommendations', 'Activities', 'Chatter', 'Flow', 'Highlights Panel', 'Path', 'Record Detail', 'Related List - Single', 'Rich Text', 'Tabs'];
    const custom = [
      `<button class="lab-comp${L.mode === 'new' && L.placed ? ' active' : ''}" draggable="true" data-lab-comp="new"><span class="lab-comp-ic sd">${LOGO}</span>S-Docs Card<span class="lab-new">2.0</span></button>`,
      `<button class="lab-comp${L.mode === 'legacy' ? ' active' : ''}" data-lab-mode="legacy"><span class="lab-comp-ic sd">${LOGO}</span>Generate Documents (S-Docs)<span class="lab-old">today</span></button>`,
      `<button class="lab-comp${L.mode === 'legacy' ? ' active' : ''}" data-lab-mode="legacy"><span class="lab-comp-ic sd">${LOGO}</span>Documents (S-Docs)<span class="lab-old">today</span></button>`
    ].filter((h, i) => !q || lc(['S-Docs Card', 'Generate Documents (S-Docs)', 'Documents (S-Docs)'][i]).includes(q));
    const stdF = std.filter(n => !q || lc(n).includes(q));
    return (custom.length ? `<div class="lab-group">${ic('down', 12, 2.4)} Custom - Managed (${custom.length})</div>${custom.join('')}` : '') +
      (stdF.length ? `<div class="lab-group">${ic('down', 12, 2.4)} Standard (${q ? stdF.length : 62})</div>${stdF.map(n => `<div class="lab-comp lab-comp-std"><span class="lab-comp-ic">${esc(n[0])}</span>${esc(n)}</div>`).join('')}` : '') ||
      '<p class="lab-hint fb-pad">No components match.</p>';
  }
  function renderLabCanvas() {
    const el = $('#lab-canvas');
    if (!el) return;
    const L = state.lab, r = labResolve(), rec = r.rec;
    const label = OBJ(L.object).label;
    const fl = fieldsOf(L.object).filter(f => f.p !== 'Name').slice(0, 4);
    let side;
    if (L.mode === 'new' && !L.placed) {
      side = '<div class="lab-drop" data-lab-drop><b>Add a component here</b><span>Drag S-Docs Card from the left, or click it.</span></div>';
    } else if (L.mode === 'new') {
      const empty = `<article class="sd-card"><header class="sd-head">${LOGO}<h2>${esc(L.title || 'S-Docs')}</h2></header><p class="sd-empty">No document options are available here.</p></article>`;
      const card = r.c ? cardHtml('lab', r.c, rec, r.user, { title: L.title }) : empty;
      side = `<div class="lab-selected"><span class="lab-tag">S-Docs Card</span><span class="lab-handle">${ic('sliders', 12, 2)}${ic('trash', 12, 2)}</span><span class="lab-dot t"></span><span class="lab-dot b"></span>${card}</div>
        <div class="lab-resolved${r.c ? '' : ' warn'}">${ic(r.c ? 'info' : 'alert', 15, 2)}<span>${r.c
          ? `For <b>${esc(r.user.name)}</b> on <b>${esc(rec.Name)}</b> the first matching S-Docs Card is <b>#${r.prio} ${esc(r.c.name)}</b>. Your business admin decides this in S-Docs Cards; there's nothing to set here.`
          : esc(r.why)}</span></div>`;
    } else {
      side = `<div class="lab-selected"><span class="lab-tag">Generate Documents (S-Docs)</span><span class="lab-handle">${ic('sliders', 12, 2)}${ic('trash', 12, 2)}</span><span class="lab-dot t"></span><span class="lab-dot b"></span>
          <div class="lab-legacy-card"><div class="lab-legacy-head">${LOGO}<h3>Templates to Generate</h3><button class="lab-pill-btn">Generate</button></div>
            <div class="lab-tile"><span class="ad-fmt pdf">PDF</span>SimpleMergeFieldReplacements</div><span class="lab-viewall">View All</span></div></div>
        <div class="lab-legacy-card lab-gap"><div class="lab-legacy-head">${LOGO}<h3>Generated Documents</h3></div></div>
        <div class="lab-resolved warn">${ic('alert', 15, 2)}<span>Today every page shows the same hard-coded templates to everyone. Changing them means editing and re-activating this Lightning page.</span></div>`;
    }
    const strip = `<div class="lab-proto" aria-label="Prototype controls">
        <span class="proto-label">Prototype</span>
        <div class="proto-seg">${[['new', 'S-Docs 2.0'], ['legacy', 'Today']].map(([k, l]) => `<button data-lab-mode="${k}" class="${L.mode === k ? 'active' : ''}" aria-pressed="${L.mode === k}">${l}</button>`).join('')}</div>
        ${L.mode === 'new' ? `<label>Preview as <select data-lab="user">${USERS.map(u => `<option value="${u.id}" ${u.id === L.user ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
        <label>on <select data-lab="rec">${recordsOf(L.object).map((x, i) => `<option value="${i}" ${i === L.rec ? 'selected' : ''}>${esc(x.Name)}</option>`).join('')}</select></label>` : ''}
      </div>`;
    el.innerHTML = strip + `
      <div class="lab-page">
        <div class="lab-region"><div class="lab-cardish">
          <div class="lab-hl-top"><span class="hl-icon">${ic('record', 16, 2)}</span><div><div class="hl-eyebrow">${esc(label)}</div><div class="lab-hl-name">${esc(rec.Name)}</div></div>
            <div class="lab-hl-btns"><span>+ Follow</span><span>Edit</span><span>S-Docs</span><span>New Case</span></div></div>
          <div class="lab-hl-fields">${fl.map(f => `<span>${esc(f.l)}<b>${esc(isBlank(rec[f.p]) ? '—' : fmtVal(rec[f.p], f.t))}</b></span>`).join('')}</div>
        </div></div>
        ${L.object === 'Opportunity' ? `<div class="lab-region"><div class="hl-path lab-path">${['Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed'].map(s => `<div class="path-step${s === rec.StageName ? ' current' : ''}"><span>${esc(s)}</span></div>`).join('')}</div></div>` : ''}
        <div class="lab-cols">
          <div class="lab-region"><div class="lab-cardish">
            <div class="rec-tabs"><button class="rec-tab active">Activity</button><button class="rec-tab">Details</button><button class="rec-tab">Chatter</button></div>
            <div class="lab-ph w80"></div><div class="lab-ph w60"></div><div class="lab-ph w40"></div><div class="lab-ph w80"></div><div class="lab-ph w60"></div>
          </div></div>
          <div class="lab-region lab-side">${side}</div>
        </div>
      </div>`;
  }

  // Diagnostics shown under the card for card managers who turned Builder details on.
  function builderDetailsFor(obj, rec, user) {
    const list = state.configs[obj] || [];
    const rowsHtml = rows => rows.length ? `<ul class="ad-tr-rows">${rows.map(x => `<li class="${x.pass ? 'pass' : 'fail'}"><span class="mk">${ic(x.pass ? 'check' : 'x', 11, 3)}</span><span><b>${x.n}.</b> ${esc(x.text)} <span class="act">— ${esc(x.actual)}</span></span></li>`).join('')}</ul>` : '';
    const res = resolve(list, obj, { rec, user, placement: 'record' });
    const w = res.winner;
    const head = w ? `<b>#${w.prio} ${esc(w.cfg.name)}</b> · first match · ${list.length} checked` : '<b>No S-Docs Card matched</b>';
    const body = `<div class="sd-bd-verdict ${w ? 'ok' : 'no'}">${ic(w ? 'check' : 'x', 12, 3)} ${esc(user.name)} on ${esc(rec.Name)}</div>` +
      `<ol class="sd-bd-trace">${res.trace.filter(t => t.outcome !== 'unevaluated').map(t => `<li class="${t.outcome}"><span class="p">${t.prio}</span><span><b>${esc(t.cfg.name)}</b> — ${esc(t.outcome === 'win' ? 'used' : t.outcome === 'skip' ? t.why.replace(/\.$/, '').toLowerCase() : 'conditions not met')}${t.outcome !== 'skip' && t.rows && t.rows.length ? rowsHtml(t.rows) : ''}</span></li>`).join('')}</ol>`;
    return `<details class="sd-builder" open><summary>${ic('flask', 13, 2)} Builder details <span>${head}</span></summary>${body}
      <div class="sd-bd-foot">${ic('lock', 11, 2)} Only you see this, because you turned on Builder details in S-Docs Cards.</div></details>`;
  }
  function renderLabProps() {
    const el = $('#lab-props');
    if (!el) return;
    const L = state.lab;
    if (L.mode === 'legacy') {
      el.innerHTML = `<div class="lab-crumb"><a href="#">Page</a> › Generate Documents (S-D...</div>
        <div class="lab-props-body">
          <div class="lab-f"><label>Title ${labInfo('Card title')}</label><input type="text" value="Templates to Generate" disabled></div>
          <div class="lab-f"><label>Template IDs or Names ${labInfo('Comma-separated')}</label><input type="text" value="SimpleMergeFieldReplacements" disabled></div>
          <div class="lab-f"><label>Template Name ${labInfo('One template')}</label><input type="text" value="" disabled></div>
          ${[['Notify User', true], ['Open Preview', false], ['Reuse Template for Multiple Documents', true], ['Allow Users to Select Templates', true], ['System Mode Generation (Experience Cloud)', false]].map(([l, on]) => `<label class="lab-check"><input type="checkbox" ${on ? 'checked' : ''} disabled> ${esc(l)}</label>`).join('')}
          <div class="lab-sec"><div class="lab-sec-h">${ic('down', 12, 2.4)} Set Component Visibility</div><div class="lab-f"><span class="lab-l">Filters</span><button class="sf-btn">+ Add Filter</button></div></div>
        </div>`;
      return;
    }
    if (!L.placed) {
      el.innerHTML = `<div class="lab-crumb">Page</div><div class="lab-props-body">
        <div class="lab-f"><label>Label</label><input type="text" value="${esc(OBJ(L.object).label)} Record Page" disabled></div>
        <div class="lab-f"><label>API Name</label><input type="text" value="${esc(L.object)}_Record_Page" disabled></div>
        <div class="lab-f"><label>Page Type</label><input type="text" value="Record Page" disabled></div>
        <div class="lab-f"><label>Object</label><input type="text" value="${esc(OBJ(L.object).label)}" disabled></div>
        <div class="lab-f"><label>Template</label><input type="text" value="Header and Right Sidebar" disabled></div></div>`;
      return;
    }
    // One design property. Which S-Docs Card applies, and everything else, is the business admin's.
    el.innerHTML = `<div class="lab-crumb"><a href="#">Page</a> › S-Docs Card</div>
      <div class="lab-props-body">
        <div class="lab-f"><label for="lab-title">Title ${labInfo('Heading shown on the card. Templates and actions come from S-Docs Cards, managed by your business admin.')}</label><input type="text" id="lab-title" data-lab="title" value="${esc(L.title)}"></div>
        <div class="lab-sec"><div class="lab-sec-h">${ic('down', 12, 2.4)} Set Component Visibility</div><div class="lab-f"><span class="lab-l">Filters</span><button class="sf-btn">+ Add Filter</button></div></div>
      </div>`;
  }
  function renderLabCfgs() {}


  /* =======================================================================
     E-SIGNATURE (record page and screen flow)
     ======================================================================= */
  let sigTimer = null;
  async function signModal(ns, docs) {
    const { c } = pvCtx(ns);
    const draft = { signer: CONTACTS[0], cc: '', msg: 'Hi Dana — please review and sign the attached. Happy to walk through anything first.' };
    const ok = await openModal({
      title: 'Request signature', draft,
      render: () => `<div class="m-docs"><div class="m-docs-title">${plural(docs.length, 'document')}</div>${docs.map(d => `<div class="m-doc"><span class="fmt ${d.fmt.toLowerCase()}">${esc(d.fmt)}</span>${esc(d.name)}</div>`).join('')}</div>
        <div class="mf"><label for="sg-signer">Signer</label>${sel(CONTACTS, draft.signer, 'id="sg-signer" data-m="signer"')}</div>
        <div class="mf"><label for="sg-cc">Copy (optional)</label><input id="sg-cc" data-m="cc" value="" placeholder="name@example.com"></div>
        <div class="mf"><label for="sg-msg">Message to signer</label><textarea id="sg-msg" data-m="msg">${esc(draft.msg)}</textarea></div>`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Send for signature', kind: 'primary', value: true }]
    });
    if (!ok) return;
    const who = String(draft.signer).split(' — ')[0];
    docs.forEach(d => { d.sig = 'sent'; d.signer = who; });
    emit('signaturerequested', `${plural(docs.length, 'document')} to ${who}`, c);
    toast(`Sent to ${who} for signature.`);
    pvCtx(ns).rerender();
    clearTimeout(sigTimer);
    sigTimer = setTimeout(() => completeSignature(ns), 9000);
  }
  function completeSignature(ns) {
    clearTimeout(sigTimer);
    const p = state.pv[ns];
    if (!p) return;
    const sent = p.docs.filter(d => d.sig === 'sent');
    if (!sent.length) return;
    sent.forEach(d => { d.sig = 'signed'; });
    emit('signaturecompleted', `${sent.map(d => '“' + d.name + '”').join(', ')} signed by ${sent[0].signer}`);
    toast(`${sent[0].signer} signed ${sent.length === 1 ? '“' + sent[0].name + '”' : plural(sent.length, 'document')}.`);
    const ctx = pvCtx(ns);
    if (ctx.rerender) ctx.rerender();
  }

  /* =======================================================================
     VIEW: LIGHTNING RECORD PAGE (end user)
     ======================================================================= */
  // What the record page's S-Docs component resolves to, using the page's App Builder settings.
  function pageResolve(rec, user) {
    const r = resolve(state.configs.Opportunity || [], 'Opportunity', { rec, user, placement: 'record' });
    return r.winner ? r.winner.cfg : null;
  }
  function renderRecord() {
    const R_ = state.recv, rec = recordsOf('Opportunity')[R_.rec], owner = userById(rec.OwnerId);
    const stages = ['Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won'];
    const si = stages.indexOf(rec.StageName);
    const fl = fieldsOf('Opportunity').filter(f => !['Name', 'OwnerId'].includes(f.p));
    const pairs = [];
    for (let i = 0; i < fl.length; i += 2) pairs.push(fl.slice(i, i + 2));
    const val = f => isBlank(rec[f.p]) ? '—' : fmtVal(rec[f.p], f.t);
    app.innerHTML = `
      <section class="hl-panel">
        <div class="hl-top">
          <div class="hl-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg></div>
          <div class="hl-title"><span class="hl-eyebrow">Opportunity</span><h1>${esc(rec.Name)}</h1></div>
          <div class="hl-actions"><button class="sf-btn">Edit</button><button class="sf-btn">Delete</button><button class="sf-btn">Clone</button></div>
        </div>
        <div class="hl-fields">
          <div class="hl-field"><span>Account Name</span><b><a href="#">${esc(String(rec.Name).split('–')[0].trim())}</a></b></div>
          <div class="hl-field"><span>Close Date</span><b>${esc(fmtDate(rec.CloseDate) || '—')}</b></div>
          <div class="hl-field"><span>Amount</span><b>${esc(fmtVal(rec.Amount, 'currency'))}</b></div>
          <div class="hl-field"><span>Opportunity Owner</span><b><a href="#">${esc(owner.name)}</a></b></div>
        </div>
        <div class="hl-path" role="list">${stages.map((x, i) => `<div class="path-step${i < si ? ' done' : i === si ? ' current' : ''}" role="listitem"><span>${esc(x)}</span></div>`).join('')}<button class="path-cta">Mark Stage as Complete</button></div>
      </section>
      <div class="record-grid">
        <div class="col-main"><div class="sf-card">
          <div class="rec-tabs"><button class="rec-tab">Related</button><button class="rec-tab active">Details</button><button class="rec-tab">News</button></div>
          <div class="rec-detail">${pairs.map(pr => `<div class="det-row">${pr.map(f => `<div class="det-f"><span>${esc(f.l)}</span><b>${esc(val(f))}</b></div>`).join('')}</div>`).join('')}</div>
        </div></div>
        <div class="col-side">
          <div id="rec-side"></div>
          <div class="rv-proto"><div class="rv-proto-h">Prototype · events the component fires</div>${evLogHtml()}</div>
        </div>
      </div>`;
    renderRecordSide();
  }
  function renderRecordSide() {
    const el = $('#rec-side');
    if (!el) return;
    const { c, rec, user } = pvCtx('rec');
    const title = state.lab.title || 'S-Docs';
    const details = user.cfgManager && state.builderDetails ? builderDetailsFor('Opportunity', rec, user) : '';
    el.innerHTML = c ? cardHtml('rec', c, rec, user, { title, details })
      : `<article class="sd-card"><header class="sd-head">${LOGO}<h2>${esc(title)}</h2></header><p class="sd-empty">No document options are available here.</p>${details}</article>`;
  }

  /* =======================================================================
     VIEW: FLOW BUILDER (simulated) — the component on a screen-flow screen
     ======================================================================= */
  const FLOW_REC = 3, FLOW_USER = 'u2';
  function flowResolve() {
    const F = state.flow, rec = recordsOf('Opportunity')[FLOW_REC], user = userById(FLOW_USER);
    if (!F.recordId) return { c: null, rec, user, why: 'S-Docs needs a record. Set Record ID to {!recordId} on the component.' };
    const r = resolve(state.configs.Opportunity || [], 'Opportunity', { rec, user, placement: 'flow' });
    return r.winner ? { c: r.winner.cfg, rec, user } : { c: null, rec, user, why: 'No S-Docs Card matches.' };
  }
  const FB_COMPONENTS = [
    { g: 'Input', items: ['Checkbox', 'Currency', 'Date', 'Lookup', 'Number', 'Picklist', 'Text'] },
    { g: 'Display', items: ['Display Image', 'Display Text', 'Section'] },
    { g: 'Custom (Managed)', items: ['S-Docs Card'] }
  ];
  function renderFlow() {
    const F = state.flow;
    app.innerHTML = `
      <div class="fb">
        <div class="fb-top">
          <button data-fb-exit aria-label="Back to S-Docs Cards">${ic('back', 16, 2)}</button>
          <span class="fb-brand">${ic('layers', 15)} Flow Builder</span>
          <span class="fb-name">Close the Deal Paperwork <small>Screen Flow · Version 1 · ${F.saved ? 'Saved' : 'Unsaved changes'}</small></span>
          <span class="fb-top-r"><button class="sf-btn" data-fb-debug>Debug</button><button class="sf-btn">Save As New Version</button><button class="sf-btn sf-btn-brand" data-fb-save>Save</button><button class="sf-btn">Activate</button></span>
        </div>
        <div class="fb-body">
          <aside class="fb-toolbox" aria-label="Toolbox">
            <div class="fb-tb-h">Toolbox</div>
            <div class="fb-tb-sub">Manager</div>
            <div class="fb-res-g">Variables</div>
            <div class="fb-res"><b>recordId</b><small>Text · Available for input</small></div>
            <div class="fb-res"><b>docIds</b><small>Text · Collection</small></div>
            <div class="fb-res"><b>lastEvent</b><small>Text</small></div>
          </aside>
          <main class="fb-canvas"><div class="fb-flow">
            <div class="fb-node"><span class="fb-ico start">${ic('flag', 15, 2)}</span><div><b>Screen Flow</b><small>Start · launched from an Opportunity button</small></div></div>
            <div class="fb-line"></div>
            <button class="fb-node is-el" data-fb-open><span class="fb-ico screen">${ic('flowscreen', 15, 2)}</span><div><b>Generate paperwork</b><small>Screen${F.added ? ' · S-Docs Card' : ' · empty'}</small></div></button>
            <div class="fb-line"></div>
            <div class="fb-node"><span class="fb-ico end">${ic('x', 13, 3)}</span><div><b>End</b></div></div>
          </div></main>
        </div>
      </div>
      ${F.open ? flowEditorHtml() : ''}${F.debug ? flowDebugHtml() : ''}`;
    if (F.debug) renderFlowRun();
  }
  function flowPaletteHtml() {
    const F = state.flow, q = lc(F.q);
    return FB_COMPONENTS.map(g => {
      const items = g.items.filter(n => !q || lc(n).includes(q));
      if (!items.length) return '';
      return `<div class="lab-group">${ic('down', 12, 2.4)} ${esc(g.g)}</div>` + items.map(n => n === 'S-Docs Card'
        ? `<button class="lab-comp" draggable="true" data-fb-comp><span class="lab-comp-ic sd">${LOGO}</span>S-Docs Card</button>`
        : `<div class="lab-comp lab-comp-std"><span class="lab-comp-ic">${esc(n[0])}</span>${esc(n)}</div>`).join('');
    }).join('') || '<p class="lab-hint fb-pad">No components match.</p>';
  }
  function flowEditorHtml() {
    const F = state.flow;
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    const props = F.added ? `
        <div class="fb-props-h">S-Docs Card</div>
        <div class="lab-f"><label>API Name</label><input type="text" value="sdocsDocuments" disabled></div>
        <div class="lab-f"><label for="fb-rid">Record ID <span class="ad-req">*</span> ${labInfo('Screen flows don’t pass a record automatically. Map the flow’s recordId variable here.')}</label>
          <div class="lab-search-input"><input type="text" id="fb-rid" data-fb="recordId" value="${esc(F.recordId)}" placeholder="Search resources...">${ic('search', 15, 2)}</div>
          ${F.recordId ? '' : '<button class="fb-res-pick" data-fb-res="{!recordId}">{!recordId} <small>Variable · Text</small></button>'}</div>
        <div class="lab-f"><label for="fb-title">Title</label><input type="text" id="fb-title" data-fb="title" value="${esc(F.title)}"></div>
        <div class="lab-sec"><div class="lab-sec-h">${ic('down', 12, 2.4)} Store Output Values</div>
          <div class="lab-f"><label for="fb-od">Generated document IDs</label><select id="fb-od" data-fb="outDocs">${opt('', 'Not stored', F.outDocs)}${opt('{!docIds}', '{!docIds}', F.outDocs)}</select></div>
          <div class="lab-f"><label for="fb-oe">Last lifecycle event</label><select id="fb-oe" data-fb="outEvent">${opt('', 'Not stored', F.outEvent)}${opt('{!lastEvent}', '{!lastEvent}', F.outEvent)}</select></div>
        </div>`
      : `<div class="fb-props-h">Screen Properties</div>
        <div class="lab-f"><label>Label</label><input type="text" value="Generate paperwork" disabled></div>
        <div class="lab-f"><label>API Name</label><input type="text" value="Generate_paperwork" disabled></div>`;
    return `<div class="fb-overlay"><div class="fb-sed" role="dialog" aria-modal="true" aria-label="Edit Screen">
      <div class="fb-sed-head"><h2>Edit Screen</h2><button class="sd-modal-x" data-fb-close aria-label="Close">${ic('x', 16, 2)}</button></div>
      <div class="fb-sed-body">
        <aside class="fb-sed-pal"><div class="lab-tabs"><button class="active">Components</button><button>Fields</button></div>
          <div class="lab-search">${ic('search', 14, 2)}<input type="text" data-fb-search value="${esc(F.q)}" placeholder="Search components..." aria-label="Search components"></div>
          <div id="fb-pal">${flowPaletteHtml()}</div></aside>
        <section class="fb-sed-canvas"><div class="fb-screen">
          <div class="fb-screen-h">Generate paperwork</div>
          <div class="fb-screen-b">${F.added
            ? `<div class="lab-selected fb-sel"><span class="lab-tag">S-Docs Card</span><div class="fb-ph">${LOGO}<div><b>${esc(F.title || 'S-Docs')}</b><small>Record: ${esc(F.recordId || 'not set')} · S-Docs Card: first match, set by your business admin</small><small>The card renders when the flow runs.</small></div></div></div>`
            : '<div class="lab-drop" data-fb-drop><b>Add a component here</b><span>Drag S-Docs Card from the left, or click it.</span></div>'}</div>
          <div class="fb-screen-f"><span class="fb-fbtn">Previous</span><span class="fb-fbtn primary">Next</span></div>
        </div></section>
        <aside class="fb-sed-props">${props}</aside>
      </div>
      <div class="fb-sed-foot"><button class="sf-btn" data-fb-close>Cancel</button><button class="sf-btn sf-btn-brand" data-fb-done>Done</button></div>
    </div></div>`;
  }
  function flowDebugHtml() {
    const F = state.flow, r = flowResolve(), p = state.pv.flowrun;
    const ids = p ? p.docs.filter(d => d.status === 'ready').map(d => d.id.replace('doc-', '069')) : [];
    const lastEv = (state.events[0] || {}).name || '';
    return `<div class="fb-overlay"><div class="fb-debug" role="dialog" aria-modal="true" aria-label="Debug flow">
      <div class="fb-sed-head"><h2>Debug: Close the Deal Paperwork</h2><button class="sd-modal-x" data-fb-close-debug aria-label="Close">${ic('x', 16, 2)}</button></div>
      <div class="fb-debug-body">
        <section class="fb-run"><div class="fb-screen">
          <div class="fb-screen-h">Generate paperwork</div>
          <div class="fb-screen-b" id="fb-run-card"></div>
          <div class="fb-screen-f"><button class="fb-fbtn" disabled>Previous</button><button class="fb-fbtn primary" data-fb-next ${F.runDone ? 'disabled' : ''}>${F.runDone ? 'Finished' : 'Next'}</button></div>
        </div></section>
        <aside class="fb-dlog"><div class="fb-dlog-h">Debug details</div>
          <div class="fb-dstep"><b>Run as</b> ${esc(r.user.name)}</div>
          <div class="fb-dstep"><b>Input</b> recordId = <code>${esc(r.rec.Id)}</code> (${esc(r.rec.Name)})</div>
          <div class="fb-dstep"><b>SCREEN</b> Generate paperwork — ${F.runDone ? 'completed' : 'waiting for the person running the flow'}</div>
          ${F.runDone ? `
            <div class="fb-dstep"><b>Output</b> ${F.outDocs ? `${esc(F.outDocs)} = <code>[${ids.map(esc).join(', ') || 'empty'}]</code>` : 'Generated document IDs not stored'}</div>
            <div class="fb-dstep"><b>Output</b> ${F.outEvent ? `${esc(F.outEvent)} = <code>${esc(lastEv)}</code>` : 'Last lifecycle event not stored'}</div>
            <div class="fb-dstep"><b>END</b> The flow finished.</div>` : ''}
        </aside>
      </div></div></div>`;
  }
  function renderFlowRun() {
    const el = $('#fb-run-card');
    if (!el) return;
    const F = state.flow, r = flowResolve();
    el.innerHTML = r.c ? cardHtml('flowrun', r.c, r.rec, r.user, { title: F.title })
      : `<div class="ad-note err">${ic('alert', 16)}<div>${esc(r.why)}</div></div>`;
  }
  function flowAdd() { const F = state.flow; F.added = true; F.saved = false; renderFlow(); }

  /* =======================================================================
     WALKTHROUGH HOOKS (used by tour.js)
     ======================================================================= */
  const PERSONAS = {
    bizadmin: { initials: 'PS', name: 'Priya Shah', role: 'Sales Ops · business admin', color: '#8b6fe8' },
    sfadmin: { initials: 'MD', name: 'Marco Diaz', role: 'Salesforce admin', color: '#0176d3' },
    rep: { initials: 'SR', name: 'Sam Rivera', role: 'Account Executive', color: '#2e844a' }
  };
  function midMarket() {
    return toPhase1(mkConfig({
      key: 'mid_market_deals', name: 'Mid-Market Deals', status: 'Active', modified: 'Oct 2, 2026',
      desc: 'Mid-size deals get a proposal, order form and NDA, ready to sign.',
      conditions: [R('Amount', 'gte', '25000'), R('Amount', 'lt', '100000')],
      templates: [T('t3', 'proposal', { pre: true }), T('t9', 'order_form'), T('t4', 'nda')],
      actions: mkActions(['preview', 'download', 'email', 'sign'])
    }));
  }
  function paintChrome() {
    const v = state.view;
    document.body.classList.toggle('is-flow', v === 'flow');
    const nav = $('#app-name'), tabs = $('#app-tabs');
    if (nav && tabs) {
      const sales = v === 'record';
      nav.textContent = sales ? 'Sales' : 'S-Docs';
      const list = sales ? ['Home', 'Accounts', 'Opportunities', 'Contacts', 'Reports'] : ['Home', 'S-Docs Templates', 'Documents', 'S-Docs Cards', 'Settings'];
      const act = sales ? 'Opportunities' : 'S-Docs Cards';
      tabs.innerHTML = list.map(t => `<div class="nav-tab${t === act ? ' active' : ''}">${esc(t)}</div>`).join('');
    }
    const chip = $('#persona-chip'), P_ = state.persona;
    if (chip) {
      chip.hidden = !P_;
      if (P_) chip.innerHTML = `<span class="pc-av" data-c="${P_.color}">${esc(P_.initials)}</span><span><b>${esc(P_.name)}</b><small>${esc(P_.role)}</small></span>`;
      const av = chip.querySelector('.pc-av'); if (av) av.style.background = P_.color;
    }
  }
  function createConfig(name, object) {
    const cfg = mkConfig({ object, logic: 'always' });
    Object.assign(cfg, { name: name.trim(), key: uniqueKey(object, slug(name)), status: 'Draft' });
    state.object = object;
    state.edit = { cfg, isNew: true, pos: 'fallback', step: 0, mode: 'simple', dirty: true, keyTouched: false };
    state.pv.ed = null;
    state.view = 'edit';
    render();
  }
  const findCfg = key => (state.configs.Opportunity || []).find(c => c.key === key);
  window.LWC2 = {
    state,
    loadScenario(key) {
      closeModal(null);
      clearTimeout(sigTimer);
      state.configs = seed();
      if (key !== 'bizadmin') { const L_ = state.configs.Opportunity; L_.splice(L_.findIndex(c => c.key === 'sales_standard'), 0, midMarket()); }
      Object.assign(state, { edit: null, pv: {}, events: [], genCount: {}, builderDetails: false, object: 'Opportunity', recv: { rec: 3, user: 'u2' }, flow: freshFlow() });
      state.test = { object: 'Opportunity', rec: 0, user: 'u1', placement: 'record' };
      state.lab = freshLab(key !== 'sfadmin');
      if (key === 'rep' || key === 'flow') state.lab.title = 'Documents';
      state.persona = PERSONAS[key === 'flow' ? 'sfadmin' : key] || null;
      state.view = { bizadmin: 'list', sfadmin: 'lab', rep: 'record', flow: 'flow' }[key] || 'list';
      render();
      window.scrollTo(0, 0);
    },
    // business admin
    openNewConfig: newConfigModal,
    createConfig: name => { closeModal(null); createConfig(name, 'Opportunity'); },
    editCfg: () => state.edit && state.edit.cfg,
    setConditions(rows) { const c = state.edit.cfg; c.conditions = rows; c.logic = rows.length ? 'all' : 'always'; markDirty(); renderStepBody(); refreshLive(); },
    addTemplates(tids) { closeModal(null); const c = state.edit.cfg; tids.forEach(id => { if (!c.templates.some(t => t.tid === id)) { const L_ = libTpl(c.object, id); c.templates.push(T(id, slug(L_.name.replace(/\(.*?\)/g, '')).slice(0, 30))); } }); markDirty(); renderStepBody(); refreshLive(); },
    setActions(keys) { const c = state.edit.cfg; keys.forEach(k => { c.actions[k].on = true; c.actions[k].surface = BULK.includes(k) ? 'both' : 'menu'; }); markDirty(); renderStepBody(); refreshLive(); },
    generate: ns => pvGenerate(ns),
    save: status => saveEdit(status),
    findCfg,
    indexOf: key => (state.configs.Opportunity || []).findIndex(c => c.key === key),
    moveAbove(key, otherKey) { state.object = 'Opportunity'; const L_ = state.configs.Opportunity; const c = findCfg(key); if (!c) return; if (state.view !== 'list') { state.edit = null; state.view = 'list'; render(); } moveTo(c.id, L_.findIndex(x => x.key === otherKey) - (L_.indexOf(c) < L_.findIndex(x => x.key === otherKey) ? 1 : 0)); },
    goList() { state.edit = null; state.view = 'list'; state.object = 'Opportunity'; render(); },
    goTest(rec, user) { Object.assign(state.test, { object: 'Opportunity', rec, user }); state.pv.test = null; state.view = 'test'; render(); },
    testWinner() { const T_ = state.test, rec = recordsOf(T_.object)[T_.rec], user = userById(T_.user); const r = resolve(testList(), T_.object, { rec, user, placement: 'record' }); return r.winner && r.winner.cfg; },
    // salesforce admin
    labPlace() { state.lab.placed = true; state.pv.lab = null; renderLab(); },
    labSet(k, v) { state.lab[k] = v; state.pv.lab = null; if (k === 'q') renderLab(); else { renderLabProps(); renderLabCanvas(); } },
    setBuilderDetails(v) { state.builderDetails = !!v; if (state.view === 'list') renderList(); },
    openRecordAs(user, recIdx) { state.recv = { rec: recIdx, user }; state.pv.rec = null; state.view = 'record'; render(); window.scrollTo(0, 0); },
    labSave() { state.lab.saved = true; toast(`${OBJ(state.lab.object).label} Record Page saved. It's already the org default, so reps see it now.`); },
    // sales rep
    pvState: ns => state.pv[ns],
    pick(ns, keys) { const { c, rec, user, rerender } = pvCtx(ns); const p = pvState(ns, c, rec, user); p.picked = new Set(keys); p.open = true; rerender(); },
    openSign(ns) { pvAction(ns, 'sign'); },
    sendSign() { const b = $('#ad-modal-foot [data-mb="1"]'); if (state.modal && $('#ad-modal-title').textContent === 'Request signature' && b) b.click(); },
    completeSignature,
    modalTitle: () => state.modal ? $('#ad-modal-title').textContent : '',
    // flow
    flowSet(k, v) { state.flow[k] = v; if (k === 'q') { const pl = $('#fb-pal'); if (pl) pl.innerHTML = flowPaletteHtml(); } else renderFlow(); },
    flowOpen() { state.flow.open = true; renderFlow(); },
    flowAdd: () => { state.flow.open = true; flowAdd(); },
    flowDone() { const F = state.flow; if (F.added && !F.recordId) { toast('Record ID is required on S-Docs Card.', 'err'); return; } F.open = false; renderFlow(); },
    flowDebug() { const F = state.flow; F.open = false; F.debug = true; F.runDone = false; state.pv.flowrun = null; renderFlow(); },
    flowNext() { state.flow.runDone = true; renderFlow(); }
  };

  /* =======================================================================
     ROOT RENDER + EVENTS
     ======================================================================= */
  function render() {
    closeMenu();
    document.body.classList.toggle('is-lab', state.view === 'lab');
    paintChrome();
    if (state.view === 'lab') renderLab();
    else if (state.view === 'record') renderRecord();
    else if (state.view === 'flow') renderFlow();
    else if (state.view === 'edit') renderEditor();
    else if (state.view === 'test') renderTest();
    else renderList();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const q = s => t.closest(s);
    let el;

    if ((el = q('[data-ev-clear]'))) { state.events = []; $$('[data-evlog]').forEach(x => { x.innerHTML = evLogInner(); }); return; }

    /* ---- live preview ---- */
    if ((el = q('[data-pv-star]'))) {
      e.stopPropagation();
      const { c, rec, user, rerender } = pvCtx(el.dataset.ns);
      const p = pvState(el.dataset.ns, c, rec, user);
      const k = el.dataset.pvStar;
      if (p.favs.has(k)) p.favs.delete(k); else p.favs.add(k);
      rerender(); return;
    }
    if ((el = q('[data-pv-opt]'))) {
      const { c, rec, user, rerender } = pvCtx(el.dataset.ns);
      const p = pvState(el.dataset.ns, c, rec, user);
      const k = el.dataset.pvOpt;
      if (p.picked.has(k)) p.picked.delete(k);
      else { if (!c.multi) p.picked.clear(); p.picked.add(k); }
      rerender(); return;
    }
    if ((el = q('[data-pv-combo]'))) {
      const { c, rec, user, rerender } = pvCtx(el.dataset.ns);
      const p = pvState(el.dataset.ns, c, rec, user);
      p.open = !p.open; rerender(); return;
    }
    if ((el = q('[data-pv-gen]'))) { pvGenerate(el.dataset.ns); return; }
    if ((el = q('[data-pv-kebab]'))) {
      const { c, rec, user, rerender } = pvCtx(el.dataset.ns);
      const p = pvState(el.dataset.ns, c, rec, user);
      p.menuFor = p.menuFor === el.dataset.pvKebab ? null : el.dataset.pvKebab;
      rerender(); return;
    }
    if ((el = q('[data-pv-act]'))) { pvAction(el.dataset.ns, el.dataset.pvAct, el.dataset.doc); return; }

    /* ---- condition builder ---- */
    if ((el = q('[data-c-add]'))) { const scope = el.dataset.cAdd; rowsFor(scope).push(defaultRow('record', objForRows())); if (scope === 'cfg' && state.edit.cfg.logic === 'always') state.edit.cfg.logic = 'all'; rerenderRows(scope); return; }
    if ((el = q('[data-c-del]'))) {
      const row = el.closest('.ad-crow'), scope = row.dataset.scope, rows = rowsFor(scope);
      rows.splice(+row.dataset.i, 1);
      if (scope === 'cfg') { const c = state.edit.cfg; if (!rows.length) c.logic = 'always'; else if (c.logic === 'custom') c.customLogic = rows.map((_, i) => i + 1).join(' AND '); }
      rerenderRows(scope); return;
    }
    if ((el = q('[data-mode]'))) { state.edit.mode = el.dataset.mode; if (el.dataset.mode === 'advanced') state.edit.step = 0; renderEditor(); window.scrollTo(0, 0); return; }
    if ((el = q('[data-adv-step]'))) { state.edit.mode = 'advanced'; state.edit.step = +el.dataset.advStep; renderEditor(); window.scrollTo(0, 0); return; }
    if ((el = q('[data-simple-logic]'))) {
      const c = state.edit.cfg, prev = c.logic;
      c.logic = el.dataset.simpleLogic;
      if (c.logic === 'custom') c.customLogic = c.conditions.map((_, i) => i + 1).join(prev === 'any' ? ' OR ' : ' AND ');
      markDirty(); renderStepBody(); refreshLive(); return;
    }
    if ((el = q('[data-pill-x]'))) {
      e.preventDefault();
      const row = el.closest('.ad-crow'); const r = rowsFor(row.dataset.scope)[+row.dataset.i];
      const L = toList(r.value); L.splice(+el.dataset.pillX, 1); r.value = L; rerenderRows(row.dataset.scope); return;
    }

    /* ---- modal: segmented choices & mappings ---- */
    if (state.modal && (el = q('#ad-modal [data-m-seg]'))) { state.modal.draft[el.dataset.mSeg] = el.dataset.segv; renderModalBody(); return; }
    if ((el = q('[data-map-add]'))) {
      const d = state.modal.draft, k = el.dataset.mapAdd;
      d[k] = d[k] || [];
      d[k].push(k === 'inMap' ? { v: '', src: 'record.Id' } : { input: (state.edit.cfg.inputs[0] || {}).key || '', v: '' });
      renderModalBody(); return;
    }
    if ((el = q('[data-map-del]'))) { const [k, i] = el.dataset.mapDel.split(':'); state.modal.draft[k].splice(+i, 1); renderModalBody(); return; }

    /* ---- record page: close the template picker on an outside click ---- */
    if (state.view === 'record' && state.pv.rec && state.pv.rec.open && !q('.sd-gen')) { state.pv.rec.open = false; renderRecordSide(); }

    /* ---- flow builder ---- */
    if ((el = q('[data-fb-exit]'))) { state.view = 'list'; render(); return; }
    if ((el = q('[data-fb-open]'))) { window.LWC2.flowOpen(); return; }
    if ((el = q('[data-fb-comp]'))) { if (!state.flow.added) flowAdd(); return; }
    if ((el = q('[data-fb-drop]'))) { toast('Drag S-Docs Card here from the components list, or click it there.', 'info'); return; }
    if ((el = q('[data-fb-res]'))) { state.flow.recordId = el.dataset.fbRes; renderFlow(); return; }
    if ((el = q('[data-fb-close]'))) { state.flow.open = false; renderFlow(); return; }
    if ((el = q('[data-fb-done]'))) { window.LWC2.flowDone(); return; }
    if ((el = q('[data-fb-save]'))) { state.flow.saved = true; renderFlow(); toast('Flow saved.'); return; }
    if ((el = q('[data-fb-debug]'))) { if (!state.flow.added) { toast('Add S-Docs Card to the screen first.', 'info'); return; } window.LWC2.flowDebug(); return; }
    if ((el = q('[data-fb-close-debug]'))) { state.flow.debug = false; renderFlow(); return; }
    if ((el = q('[data-fb-next]'))) { window.LWC2.flowNext(); return; }

    /* ---- app builder ---- */
    if ((el = q('[data-go-lab]'))) { state.lab.object = (RECORDS[state.object] ? state.object : 'Opportunity'); state.lab.rec = 0; state.pv.lab = null; state.view = 'lab'; render(); window.scrollTo(0, 0); return; }
    if ((el = q('[data-lab-exit]')) || (el = q('[data-lab-manage]'))) { state.object = state.lab.object; state.view = 'list'; render(); return; }
    if ((el = q('[data-lab-mode]'))) { state.lab.mode = el.dataset.labMode; renderLab(); return; }
    if ((el = q('[data-lab-save]'))) { window.LWC2.labSave(); return; }
    if ((el = q('[data-lab-comp]'))) { if (!state.lab.placed) window.LWC2.labPlace(); else { state.lab.mode = 'new'; renderLab(); } return; }
    if ((el = q('[data-lab-drop]'))) { toast('Drag S-Docs Card here from the Components list, or click it there.', 'info'); return; }
    if ((el = q('[data-lab-pages]'))) {
      e.stopPropagation();
      if (menuAnchor === el) { closeMenu(); return; }
      openMenu(el, Object.keys(RECORDS).map(o => ({ k: o, l: OBJ(o).label + ' Record Page', icon: 'record' })), k => { Object.assign(state.lab, { object: k, rec: 0 }); state.pv.lab = null; renderLab(); });
      return;
    }

    /* ---- list ---- */
    if ((el = q('[data-open-record]'))) { window.LWC2.openRecordAs('u5', 3); return; }
    if ((el = q('[data-go-test]'))) { state.test.object = state.object; state.test.rec = 0; state.view = 'test'; render(); return; }
    if ((el = q('[data-new]'))) { newConfigModal(); return; }
    if ((el = q('[data-obj]'))) { state.object = el.dataset.obj; renderList(); return; }
    if ((el = q('[data-kebab]'))) { e.stopPropagation(); if (menuAnchor === el) { closeMenu(); return; } cfgMenu(el, el.dataset.kebab); return; }
    if ((el = q('.ad-cfg')) && !q('.ad-drag')) { openEditor(el.dataset.cfg); return; }
    if ((el = q('[data-edit-cfg]'))) { state.object = state.test.object; openEditor(el.dataset.editCfg); return; }

    /* ---- editor chrome ---- */
    if ((el = q('[data-back]'))) {
      e.preventDefault();
      if (state.view === 'test') { state.view = state.edit ? 'edit' : 'list'; render(); }
      else leaveEditor();
      return;
    }
    if ((el = q('[data-ed-test]'))) { state.test.rec = 0; state.test.placement = (state.edit.cfg.placements[0] || 'record'); state.view = 'test'; render(); window.scrollTo(0, 0); return; }
    if ((el = q('[data-save]'))) { saveEdit(el.dataset.save); return; }
    if ((el = q('[data-step-go]'))) { state.edit.step = +el.dataset.stepGo; renderStepBody(); renderStepper(); $('#ad-body').scrollIntoView({ block: 'nearest' }); return; }

    /* ---- step 2 ---- */
    if ((el = q('[data-logic]'))) {
      const c = state.edit.cfg, k = el.dataset.logic;
      c.logic = k;
      if (k !== 'always' && !c.conditions.length) c.conditions.push(defaultRow('record', c.object));
      if (k === 'custom' && !c.customLogic.trim()) c.customLogic = c.conditions.map((_, i) => i + 1).join(' AND ');
      markDirty(); renderStepBody(); refreshLive(); return;
    }

    /* ---- step 3 ---- */
    if ((el = q('[data-picker]'))) { state.edit.cfg.picker = el.dataset.picker; markDirty(); renderStepBody(); refreshLive(); return; }
    if ((el = q('[data-add-tpl]'))) { addTemplatesModal(); return; }
    const ti = q('[data-ti]');
    if (ti) {
      const c = state.edit.cfg, i = +ti.dataset.ti;
      if ((el = q('[data-t-move]'))) { const j = i + (+el.dataset.tMove); const [x] = c.templates.splice(i, 1); c.templates.splice(j, 0, x); markDirty(); renderStepBody(); refreshLive(); return; }
      if ((el = q('[data-t-star]'))) { c.templates[i].featured = !c.templates[i].featured; markDirty(); renderStepBody(); refreshLive(); return; }
      if ((el = q('[data-t-rules]'))) { templateRulesModal(i); return; }
      if ((el = q('[data-t-del]'))) {
        const [x] = c.templates.splice(i, 1);
        c.steps.forEach(s => { s.tkeys = s.tkeys.filter(k => k !== x.key); });
        markDirty(); renderStepBody(); refreshLive(); toast(`“${tplName(c, x)}” removed.`); return;
      }
    }

    /* ---- step 4 ---- */
    if ((el = q('[data-a-settings]'))) { actionSettingsModal(el.dataset.aSettings); return; }
    if ((el = q('[data-output]'))) { state.edit.cfg.output = el.dataset.output; markDirty(); renderStepBody(); refreshLive(); return; }

    /* ---- step 5 ---- */
    if ((el = q('[data-add-step]'))) { const [ph, ty] = el.dataset.addStep.split(':'); stepModal(newStep(ph, ty), true); return; }
    const sc = q('[data-step]');
    if (sc && state.edit) {
      const c = state.edit.cfg, s = c.steps.find(x => x.id === sc.dataset.step);
      if ((el = q('[data-s-edit]'))) { stepModal(s, false); return; }
      if ((el = q('[data-s-del]'))) { c.steps = c.steps.filter(x => x !== s); markDirty(); renderStepBody(); refreshLive(); toast(`Step “${s.name}” removed.`); return; }
      if ((el = q('[data-s-move]'))) {
        const same = c.steps.filter(x => x.phase === s.phase);
        const j = same.indexOf(s) + (+el.dataset.sMove);
        const other = same[j];
        if (other) { const a = c.steps.indexOf(s), b = c.steps.indexOf(other); c.steps[a] = other; c.steps[b] = s; }
        markDirty(); renderStepBody(); refreshLive(); return;
      }
    }
    if ((el = q('[data-add-input]'))) { inputModal(null); return; }
    const ii = q('[data-ii]');
    if (ii) {
      const c = state.edit.cfg, i = +ii.dataset.ii;
      if ((el = q('[data-i-edit]'))) { inputModal(i); return; }
      if ((el = q('[data-i-del]'))) {
        const k = c.inputs[i].key;
        c.inputs.splice(i, 1);
        c.steps.forEach(s => { ['inputKeys', 'sets'].forEach(f => { if (s[f]) s[f] = s[f].filter(x => x !== k); }); if (s.outMap) s.outMap = s.outMap.filter(m => m.input !== k); });
        markDirty(); renderStepBody(); refreshLive(); return;
      }
    }

    if (!menuEl.hidden && !q('#ad-menu')) closeMenu();
  });

  /* ---- field changes ---- */
  function onConfigField(el, isChange) {
    const c = state.edit.cfg, f = el.dataset.f;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (f === 'key') state.edit.keyTouched = true;
    c[f] = v;
    if (f === 'name') {
      if (!state.edit.keyTouched && state.edit.isNew) { c.key = uniqueKey(c.object, slug(v) || 'config'); const k = $('#f-key'); if (k) k.value = c.key; }
      const tt = $('#ad-ed-title'); if (tt) tt.textContent = v || 'Untitled S-Docs Card';
    }
    markDirty();
    if (f === 'customLogic') updateWhenLive();
    if (isChange && el.hasAttribute('data-rr')) renderStepBody();
    refreshLive();
  }
  function onCondField(el, isChange) {
    const row = el.closest('.ad-crow');
    const scope = row.dataset.scope, rows = rowsFor(scope), i = +row.dataset.i, obj = objForRows();
    const r = rows[i], k = el.dataset.c;
    if (k === 'value' || k === 'formula' || k === 'cls') {
      r[k] = el.value;
      if (isChange && el.tagName === 'SELECT') rerenderRows(scope); else liveRows(scope);
      return;
    }
    if (!isChange) return;
    if (k === 'subject') rows[i] = defaultRow(el.value, obj);
    else if (k === 'field') {
      const oldT = rowType(r, obj);
      r.field = el.value;
      const f = fieldDef(r, obj);
      if (oldT !== rowType(r, obj) || !opsFor(r, obj).includes(r.op)) { r.op = opsFor(r, obj)[0]; r.value = ''; r.vtype = 'literal'; }
      else if (f && f.o && r.vtype === 'literal' && !Array.isArray(r.value) && r.value && !f.o.includes(r.value) && r.op !== 'in' && r.op !== 'nin') r.value = '';
    }
    else if (k === 'op') { const wasList = r.op === 'in' || r.op === 'nin'; r.op = el.value; if (!REF_OPS.includes(r.op)) r.vtype = 'literal'; if (wasList !== (r.op === 'in' || r.op === 'nin') && r.subject !== 'profile' && r.subject !== 'role') r.value = ''; }
    else if (k === 'vtype') { r.vtype = el.value; r.value = ''; }
    else if (k === 'addpill') { if (el.value) { const L = toList(r.value); if (!L.includes(el.value)) L.push(el.value); r.value = L; } }
    rerenderRows(scope);
  }
  function onModalField(el, isChange) {
    const d = state.modal.draft;
    if (el.dataset.m) {
      const f = el.dataset.m;
      d[f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      if (f === 'key') { const n = $('#ad-modal .m-note'); }
      if (isChange && el.hasAttribute('data-rr')) renderModalBody();
      return;
    }
    if (el.dataset.mCheck) {
      const f = el.dataset.mCheck;
      d[f] = d[f] || [];
      if (el.checked) { if (!d[f].includes(el.value)) d[f].push(el.value); } else d[f] = d[f].filter(x => x !== el.value);
      return;
    }
    if (el.dataset.map) { d[el.dataset.map][+el.dataset.mi][el.dataset.mk] = el.value; return; }
    if (el.hasAttribute('data-tsearch')) { d.q = el.value; state.modal.relist(); return; }
    if (el.dataset.tpick) { if (el.checked) d.sel.push(el.dataset.tpick); else d.sel = d.sel.filter(x => x !== el.dataset.tpick); state.modal.relist(); }
  }
  function onTestField(el, isChange) {
    const T_ = state.test, f = el.dataset.tf;
    if (!isChange) return;
    if (f === 'object') { T_.object = el.value; T_.rec = 0; }
    else if (f === 'rec') T_.rec = +el.value;
    else T_[f] = el.value;
    state.pv.test = null;
    if (f === 'object') renderTest(); else updateTest(true);
  }
  function routeField(e, isChange) {
    const el = e.target;
    if (!el.closest) return;
    if (el.closest('.ad-crow') && el.dataset.c) { onCondField(el, isChange); return; }
    if (state.modal && el.closest('#ad-modal')) { onModalField(el, isChange); return; }
    if (el.dataset.tf) { onTestField(el, isChange); return; }
    if (el.hasAttribute && el.hasAttribute('data-bd-toggle')) {
      if (!isChange) return;
      state.builderDetails = el.checked;
      renderList();
      toast(el.checked ? 'Builder details are on. You’ll see why each S-Docs Card applies under the S-Docs Card on record pages; nobody else will.' : 'Builder details are off.', 'info');
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-lab-search')) { if (!isChange) { state.lab.q = el.value; const pl = $('#lab-pal'); if (pl) pl.innerHTML = labPaletteHtml(); } return; }
    if (el.hasAttribute && el.hasAttribute('data-fb-search')) { if (!isChange) { state.flow.q = el.value; const pl = $('#fb-pal'); if (pl) pl.innerHTML = flowPaletteHtml(); } return; }
    if (el.dataset && el.dataset.fb) {
      const F = state.flow, f = el.dataset.fb;
      if (el.tagName === 'SELECT' ? !isChange : isChange) return;
      F[f] = el.value; F.saved = false;
      if (el.tagName === 'SELECT' || f === 'recordId' && el.value === '{!recordId}') { const id = el.id; renderFlow(); const n = id && document.getElementById(id); if (n && n.tagName !== 'SELECT') n.focus(); }
      return;
    }
    if (el.dataset.lab) {
      const L = state.lab, f = el.dataset.lab;
      if (!isChange && el.tagName !== 'INPUT') return;
      if (el.type === 'radio' && !el.checked) return;
      L[f] = f === 'rec' ? +el.value : el.value;
      state.pv.lab = null;
      renderLabCanvas();
      return;
    }
    if (!state.edit) return;
    const c = state.edit.cfg;
    if (el.dataset.f) { if (isChange || el.type !== 'checkbox') onConfigField(el, isChange); return; }
    if (!isChange) return;
    if (el.dataset.place) {
      const k = el.dataset.place;
      c.placements = PLACEMENTS.map(p => p.k).filter(x => x === k ? el.checked : c.placements.includes(x));
      if (c.runAs === 'system' && !(c.placements.length === 1 && c.placements[0] === 'experience')) { c.runAs = 'user'; toast('Switched back to generating as the running user — system mode is for Experience Cloud only.', 'info'); }
      markDirty(); renderStepBody(); refreshLive(); return;
    }
    if (el.dataset.sa) {
      const s = c.actions[el.dataset.sa];
      s.on = el.checked;
      if (s.on) s.surface = BULK.includes(el.dataset.sa) ? 'both' : 'menu';
      markDirty(); renderStepBody(); refreshLive(); return;
    }
    if (el.dataset.runas) { c.runAs = el.dataset.runas; markDirty(); renderStepBody(); refreshLive(); return; }
    const tr = el.closest('[data-ti]');
    if (tr && el.dataset.t) {
      const t = c.templates[+tr.dataset.ti];
      if (el.dataset.t === 'pre') { t.pre = el.checked; if (t.pre && !c.multi) c.templates.forEach(x => { if (x !== t) x.pre = false; }); renderStepBody(); }
      else t[el.dataset.t] = el.type === 'checkbox' ? el.checked : el.value;
      markDirty(); refreshLive(); return;
    }
    const ar = el.closest('[data-ak]');
    if (ar && el.dataset.a) {
      const s = c.actions[ar.dataset.ak];
      s[el.dataset.a] = el.type === 'checkbox' ? el.checked : el.value;
      markDirty(); renderStepBody(); refreshLive();
    }
  }
  document.addEventListener('input', e => routeField(e, false));
  document.addEventListener('change', e => routeField(e, true));
  // Template "group" text inputs commit on input without a full re-render.
  document.addEventListener('input', e => {
    const el = e.target;
    if (!state.edit || !el.closest || el.dataset.t !== 'group') return;
    const tr = el.closest('[data-ti]');
    state.edit.cfg.templates[+tr.dataset.ti].group = el.value;
    markDirty(); renderPreview();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (state.modal) { closeModal(null); return; }
    if (!menuEl.hidden) closeMenu();
  });
  window.addEventListener('resize', closeMenu);

  render();
})();
