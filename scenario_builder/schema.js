/* ==========================================================================
   Mock org metadata + scenario records.
   Mirrors the real shape: Doc_Scenario__c, Doc_Scenario_Prompt__c, and the
   describe information the engine reads labels from.
   ========================================================================== */

const ORG = {
  objects: {
    Opportunity: {
      label: 'Opportunity', labelPlural: 'Opportunities',
      fields: {
        Name:            { label: 'Opportunity Name', type: 'text' },
        StageName:       { label: 'Stage', type: 'picklist' },
        Amount:          { label: 'Amount', type: 'currency' },
        CloseDate:       { label: 'Close Date', type: 'date' },
        Renewal_Date__c: { label: 'Renewal Date', type: 'date' },
        Probability:     { label: 'Probability (%)', type: 'percent' },
        'Account.Name':  { label: 'Account Name', type: 'text' },
        'Owner.Alias':   { label: 'Alias', type: 'text' }
      }
    },
    Account: {
      label: 'Account', labelPlural: 'Accounts',
      fields: {
        Name:           { label: 'Account Name', type: 'text' },
        Type:           { label: 'Account Type', type: 'picklist' },
        Industry:       { label: 'Industry', type: 'picklist' },
        AnnualRevenue:  { label: 'Annual Revenue', type: 'currency' },
        BillingCity:    { label: 'Billing City', type: 'text' },
        Pilot_Status__c:{ label: 'Pilot Status', type: 'picklist' },
        Pilot_Accepted_Date__c: { label: 'Pilot Accepted Date', type: 'date' },
        Active__c:      { label: 'Active', type: 'boolean' },
        'Owner.Alias':  { label: 'Alias', type: 'text' }
      }
    },
    Case: {
      label: 'Case', labelPlural: 'Cases',
      fields: {
        CaseNumber:  { label: 'Case Number', type: 'text' },
        Subject:     { label: 'Subject', type: 'text' },
        Status:      { label: 'Status', type: 'picklist' },
        Priority:    { label: 'Priority', type: 'picklist' },
        ClosedDate:  { label: 'Closed Date', type: 'datetime' },
        'Account.Name': { label: 'Account Name', type: 'text' },
        'Contact.Name': { label: 'Full Name', type: 'text' }
      }
    },
    Contact: {
      label: 'Contact', labelPlural: 'Contacts',
      fields: {
        Name:           { label: 'Full Name', type: 'text' },
        Title:          { label: 'Title', type: 'text' },
        Email:          { label: 'Email', type: 'email' },
        Cert_Expiry__c: { label: 'Certification Expiry', type: 'date' },
        'Account.Name': { label: 'Account Name', type: 'text' }
      }
    }
  },

  templates: [
    { id: 'a0H01', name: 'Invoice',          object: 'Opportunity', format: 'PDF' },
    { id: 'a0H02', name: 'Renewal Quote',    object: 'Opportunity', format: 'PDF' },
    { id: 'a0H03', name: 'Pilot Agreement',  object: 'Account',     format: 'PDF' },
    { id: 'a0H04', name: 'Statement',        object: 'Account',     format: 'PDF-UPLOAD' },
    { id: 'a0H05', name: 'NDA',              object: 'Account',     format: 'PDF' },
    { id: 'a0H06', name: 'Case Summary',     object: 'Case',        format: 'PDF' },
    { id: 'a0H07', name: 'Renewal Notice',   object: 'Contact',     format: 'PDF' }
  ],

  /* The whitelist. User text never reaches SOQL - it only picks from here. */
  windows: [
    'TODAY','YESTERDAY','TOMORROW','THIS_WEEK','LAST_WEEK','NEXT_WEEK',
    'THIS_MONTH','LAST_MONTH','NEXT_MONTH','THIS_QUARTER','LAST_QUARTER','NEXT_QUARTER',
    'THIS_YEAR','LAST_YEAR','NEXT_YEAR','LAST_7_DAYS','LAST_30_DAYS','LAST_90_DAYS',
    'NEXT_7_DAYS','NEXT_30_DAYS','NEXT_90_DAYS'
  ],

  documentActions: [
    { id: '', name: '— None —' },
    { id: 'act1', name: 'Email to primary contact' },
    { id: 'act2', name: 'Send for signature' },
    { id: 'act3', name: 'Combine into one PDF' }
  ]
};

/* Sample records, used by the tester to resolve a scenario to rows. */
const RECORDS = {
  Opportunity: [
    { Name:'Acme — Platform Renewal', StageName:'Negotiation', Amount:45000, Renewal_Date__c:'2026-09-30', Probability:70, 'Account.Name':'Acme Corp', 'Owner.Alias':'jdoe' },
    { Name:'Globex — Annual Renewal', StageName:'Proposal',   Amount:128000, Renewal_Date__c:'2026-09-14', Probability:55, 'Account.Name':'Globex', 'Owner.Alias':'mpat' },
    { Name:'Initech — Support Renewal', StageName:'Closed Won', Amount:22500, Renewal_Date__c:'2026-09-22', Probability:100, 'Account.Name':'Initech', 'Owner.Alias':'jdoe' },
    { Name:'Umbrella — Licence Renewal', StageName:'Negotiation', Amount:76000, Renewal_Date__c:'2026-09-08', Probability:60, 'Account.Name':'Umbrella Ltd', 'Owner.Alias':'skim' }
  ],
  Account: [
    { Name:'Acme Corp', Type:'Customer', Industry:'Manufacturing', AnnualRevenue:12000000, BillingCity:'Dayton', Pilot_Status__c:'Accepted', Pilot_Accepted_Date__c:'2026-09-15', Active__c:true, 'Owner.Alias':'jdoe' },
    { Name:'Globex', Type:'Customer', Industry:'Technology', AnnualRevenue:48000000, BillingCity:'Springfield', Pilot_Status__c:'Accepted', Pilot_Accepted_Date__c:'2026-09-16', Active__c:true, 'Owner.Alias':'mpat' },
    { Name:'Initech', Type:'Prospect', Industry:'Technology', AnnualRevenue:3000000, BillingCity:'Austin', Pilot_Status__c:'Pending', Pilot_Accepted_Date__c:null, Active__c:true, 'Owner.Alias':'jdoe' },
    { Name:'Umbrella Ltd', Type:'Customer', Industry:'Healthcare', AnnualRevenue:220000000, BillingCity:'Raccoon City', Pilot_Status__c:'Accepted', Pilot_Accepted_Date__c:'2026-09-17', Active__c:false, 'Owner.Alias':'skim' }
  ],
  Case: [
    { CaseNumber:'00001042', Subject:'Merge fields not resolving on PDF', Status:'Closed', Priority:'High', ClosedDate:'2026-09-16', 'Account.Name':'Acme Corp', 'Contact.Name':'Dana Reyes' },
    { CaseNumber:'00001048', Subject:'Signature request expired early', Status:'Closed', Priority:'Medium', ClosedDate:'2026-09-17', 'Account.Name':'Globex', 'Contact.Name':'Sam Okafor' },
    { CaseNumber:'00001051', Subject:'Batch job stuck in Queued', Status:'Closed', Priority:'Critical', ClosedDate:'2026-09-18', 'Account.Name':'Initech', 'Contact.Name':'Lee Zhang' }
  ],
  Contact: [
    { Name:'Dana Reyes', Title:'Operations Lead', Email:'dana@acme.example', Cert_Expiry__c:'2026-10-14', 'Account.Name':'Acme Corp' },
    { Name:'Sam Okafor', Title:'Compliance Officer', Email:'sam@globex.example', Cert_Expiry__c:'2026-10-27', 'Account.Name':'Globex' }
  ]
};

/* Scenario records as an administrator would have saved them. */
const SCENARIOS = [
  {
    id:'a0S01', name:'Renewals this month', active:true,
    description:'Invoices for opportunities whose renewal date falls this month.',
    guidance:'Use for renewals, expiring contracts or "what is up for renewal". The window may be changed to next month.',
    object:'Opportunity', templateIds:['a0H01','a0H02'],
    dateField:'Renewal_Date__c', window:'THIS_MONTH', allowOverride:true,
    extraFilter:'', resolverClass:'', sortField:'Renewal_Date__c', maxRecords:50, maxDocuments:200,
    documentAction:'',
    slots:['Name','Account.Name','Renewal_Date__c','Amount','StageName','','',''],
    cardTitle:'Renewals this month', confirmLabel:'', emptyMessage:'',
    blocks:{ callout:true, stats:true, table:true, button:true },
    prompts:[
      { label:'This month', text:'Generate invoices for opportunities renewing this month', window:'THIS_MONTH' },
      { label:'Next month', text:'Generate invoices for opportunities renewing next month', window:'NEXT_MONTH' }
    ]
  },
  {
    id:'a0S02', name:'Pilot NDAs this week', active:true,
    description:'Pilot agreements for accounts that accepted a pilot this week.',
    guidance:'Use for pilot paperwork, NDAs or onboarding documents for new pilot customers.',
    object:'Account', templateIds:['a0H03','a0H05'],
    dateField:'Pilot_Accepted_Date__c', window:'THIS_WEEK', allowOverride:true,
    extraFilter:"Pilot_Status__c = 'Accepted'", resolverClass:'', sortField:'', maxRecords:25, maxDocuments:200,
    documentAction:'act2',
    slots:['Name','Industry','Pilot_Accepted_Date__c','AnnualRevenue','Type','','',''],
    cardTitle:'Pilot agreements', confirmLabel:'Send all', emptyMessage:'',
    blocks:{ callout:true, stats:true, table:true, button:true },
    prompts:[
      { label:'Pilot paperwork', text:'Send the pilot paperwork out', window:'THIS_WEEK' }
    ]
  },
  {
    id:'a0S03', name:'Case closure summaries', active:true,
    description:'Summary documents for cases closed this week.',
    guidance:'Use for case summaries, closure reports or support wrap-ups. Note Case has no Name field.',
    object:'Case', templateIds:['a0H06'],
    dateField:'ClosedDate', window:'THIS_WEEK', allowOverride:true,
    extraFilter:"Status = 'Closed'", resolverClass:'', sortField:'', maxRecords:50, maxDocuments:200,
    documentAction:'',
    slots:['CaseNumber','Subject','ClosedDate','Priority','Status','Account.Name','',''],
    cardTitle:'Case closure summaries', confirmLabel:'', emptyMessage:'',
    blocks:{ callout:true, stats:false, table:true, button:true },
    prompts:[
      { label:'Weekly summaries', text:'Generate case summaries for cases closed this week', window:'THIS_WEEK' }
    ]
  },
  {
    id:'a0S04', name:'Quarterly statements', active:true,
    description:'Statements for active customer accounts. No date dimension.',
    guidance:'Use for statements or account summaries. This scenario has no date window at all.',
    object:'Account', templateIds:['a0H04'],
    dateField:'', window:'', allowOverride:false,
    extraFilter:"Type = 'Customer' AND Active__c = true", resolverClass:'', sortField:'Name', maxRecords:100, maxDocuments:200,
    documentAction:'',
    slots:['Name','Type','Industry','AnnualRevenue','BillingCity','','',''],
    cardTitle:'Quarterly statements', confirmLabel:'', emptyMessage:'No active customer accounts found.',
    blocks:{ callout:true, stats:true, table:true, button:true },
    prompts:[
      { label:'Statements', text:'Generate quarterly statements for active customers', window:'' }
    ]
  },
  {
    id:'a0S05', name:'Accounts with no signed NDA', active:true,
    description:'Accounts that have not signed an NDA in twelve months.',
    guidance:'An anti-join against generated documents. Cannot be expressed as a filter, so it uses Apex.',
    object:'Account', templateIds:['a0H05'],
    dateField:'', window:'', allowOverride:false,
    extraFilter:'', resolverClass:'UnsignedNdaResolver', sortField:'Name', maxRecords:50, maxDocuments:200,
    documentAction:'act2',
    slots:['Name','Industry','','AnnualRevenue','Type','','',''],
    cardTitle:'Missing NDAs', confirmLabel:'', emptyMessage:'',
    blocks:{ callout:true, stats:true, table:true, button:true },
    prompts:[]
  }
];
