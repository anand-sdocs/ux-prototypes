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
        StageName:       { label: 'Stage', type: 'picklist',
                           values: ['Prospecting','Qualification','Proposal','Negotiation','Closed Won','Closed Lost'] },
        Amount:          { label: 'Amount', type: 'currency' },
        CloseDate:       { label: 'Close Date', type: 'date' },
        Renewal_Date__c: { label: 'Renewal Date', type: 'date' },
        Probability:     { label: 'Probability (%)', type: 'percent' },
        IsClosed:        { label: 'Closed', type: 'boolean' },
        IsWon:           { label: 'Won', type: 'boolean' },
        'Account.Name':  { label: 'Account Name', type: 'text' },
        'Owner.Alias':   { label: 'Alias', type: 'text' }
      }
    },
    Account: {
      label: 'Account', labelPlural: 'Accounts',
      fields: {
        Name:           { label: 'Account Name', type: 'text' },
        Type:           { label: 'Account Type', type: 'picklist',
                          values: ['Customer','Prospect','Partner','Reseller'] },
        Industry:       { label: 'Industry', type: 'picklist',
                          values: ['Manufacturing','Technology','Healthcare','Finance','Retail'] },
        AnnualRevenue:  { label: 'Annual Revenue', type: 'currency' },
        BillingCity:    { label: 'Billing City', type: 'text' },
        Pilot_Status__c:{ label: 'Pilot Status', type: 'picklist',
                          values: ['Not started','Pending','Accepted','Declined'] },
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
        Status:      { label: 'Status', type: 'picklist',
                       values: ['New','Working','Escalated','Closed'] },
        Priority:    { label: 'Priority', type: 'picklist',
                       values: ['Low','Medium','High','Critical'] },
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

  /* inputs mirror Data_Element__c where Type__c = 'UserInput'; required comes
     from Merge_Data__c.Is_Required__c. esign mirrors E_Signature_Solution__c. */
  templates: [
    { id: 'a0H01', name: 'Invoice',          object: 'Opportunity', format: 'PDF' },
    { id: 'a0H02', name: 'Renewal Quote',    object: 'Opportunity', format: 'PDF',
      inputs: [
        { apiName:'Effective_Date', label:'Effective Date', dataType:'DateType',   required:true  },
        { apiName:'Discount_Note',  label:'Discount Note',  dataType:'StringType', required:false }
      ] },
    { id: 'a0H03', name: 'Pilot Agreement',  object: 'Account',     format: 'PDF', esign: true },
    { id: 'a0H04', name: 'Statement',        object: 'Account',     format: 'PDF-UPLOAD' },
    { id: 'a0H05', name: 'NDA',              object: 'Account',     format: 'PDF', esign: true },
    { id: 'a0H06', name: 'Case Summary',     object: 'Case',        format: 'PDF' },
    { id: 'a0H07', name: 'Renewal Notice',   object: 'Contact',     format: 'PDF',
      inputs: [{ apiName:'Expiry_Note', label:'Expiry Note', dataType:'StringType', required:true }] }
  ],

  /* Fields that could carry a signer's email, per object. */
  signerFields: {
    Account:     [{ path:'Owner.Email', label:'Account Owner' }, { path:'Primary_Contact_Email__c', label:'Primary Contact' }],
    Opportunity: [{ path:'Owner.Email', label:'Opportunity Owner' }],
    Contact:     [{ path:'Email', label:'The contact themselves' }],
    Case:        [{ path:'Contact.Email', label:'Case Contact' }]
  },

  /* The whitelist. User text never reaches SOQL - it only picks from here. */
  windows: [
    'TODAY','YESTERDAY','TOMORROW','THIS_WEEK','LAST_WEEK','NEXT_WEEK',
    'THIS_MONTH','LAST_MONTH','NEXT_MONTH','THIS_QUARTER','LAST_QUARTER','NEXT_QUARTER',
    'THIS_YEAR','LAST_YEAR','NEXT_YEAR','LAST_7_DAYS','LAST_30_DAYS','LAST_90_DAYS',
    'NEXT_7_DAYS','NEXT_30_DAYS','NEXT_90_DAYS'
  ],

  /* Friendly labels for the date literals. The whitelist is unchanged - this
     is only how it reads in the UI. */
  windowLabels: {
    TODAY:'Today', YESTERDAY:'Yesterday', TOMORROW:'Tomorrow',
    THIS_WEEK:'This week', LAST_WEEK:'Last week', NEXT_WEEK:'Next week',
    THIS_MONTH:'This month', LAST_MONTH:'Last month', NEXT_MONTH:'Next month',
    THIS_QUARTER:'This quarter', LAST_QUARTER:'Last quarter', NEXT_QUARTER:'Next quarter',
    THIS_YEAR:'This year', LAST_YEAR:'Last year', NEXT_YEAR:'Next year',
    LAST_7_DAYS:'In the last 7 days', LAST_30_DAYS:'In the last 30 days',
    LAST_90_DAYS:'In the last 90 days', NEXT_7_DAYS:'In the next 7 days',
    NEXT_30_DAYS:'In the next 30 days', NEXT_90_DAYS:'In the next 90 days'
  },

  /* Salesforce Lightning Design System standard icons, v2.24.3.
     Paths and background colours taken from the published package; the sprite
     cannot be referenced cross-origin, so they are inlined. */
  objectMeta: {
    Opportunity: { icon:'opportunity', colour:'#ff5d2d', desc:'Deals and renewals',
      viewBox:'0 0 1000 1000', path:'M711 690H289c-10 0-19 9-19 19v1c0 33 27 60 60 60h340c33 0 60-27 60-60v-1c0-10-9-19-19-19zm49-410a60 60 0 0 0-39 106c-17 39-56 66-102 64-53-3-96-46-99-99 0-9 0-17 2-25a60 60 0 0 0-22-116 60 60 0 0 0-22 116c2 8 2 16 2 25-3 53-46 96-99 99-46 3-86-25-102-64a60 60 0 0 0-39-106c-33 0-60 27-60 60s27 60 60 60l28 214c1 9 9 16 19 16h426c9 0 17-7 19-16l28-214c33 0 60-27 60-60s-27-60-60-60z' },
    Account: { icon:'account', colour:'#5867e8', desc:'Companies you do business with',
      viewBox:'0 0 100 100', path:'M79 51.1c.1-2.1-1.4-2.7-2-2.7H55.2c-1.9 0-2.2 2-2.2 2.2V74h26zM64 67.9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm10 10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zM59 40.3V28.7c.1-2.1-1.4-2.7-2-2.7H23.2c-1.9 0-2.2 2-2.2 2.2V74h26V44.7s0-2.4 2.2-2.4h7.9c1.1 0 1.9-1.2 1.9-2zM32 66.9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.3a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm11 30.7a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.3a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm0-10.2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2zm11 0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2z' },
    Case: { icon:'case', colour:'#ff538a', desc:'Support requests',
      viewBox:'0 0 1000 1000', path:'M380 290h40c6 0 10-4 10-10v-30h140v30c0 6 4 10 10 10h40c6 0 10-4 10-10v-30c0-33-27-60-60-60H430c-33 0-60 27-60 60v30c0 6 4 10 10 10zm360 60H260c-33 0-60 27-60 60v320c0 33 27 60 60 60h480c33 0 60-27 60-60V410c0-33-27-60-60-60z' },
    Contact: { icon:'contact', colour:'#9602c7', desc:'People at your accounts',
      viewBox:'0 0 1000 1000', path:'M740 290H260c-33 0-60 27-60 60v290c0 33 27 60 60 60h480c33 0 60-27 60-60V350c0-33-27-60-60-60zM486 630H314c-19 0-34-21-34-41 1-30 32-48 65-63 23-10 26-19 26-29s-6-19-14-26a68 68 0 0 1-21-50c0-38 23-70 63-70s63 32 63 70c0 20-7 38-21 50-8 7-14 16-14 26s3 19 26 28c33 14 64 34 65 64 2 20-13 41-32 41zm234-70c0 11-9 20-20 20h-90c-11 0-20-9-20-20v-30c0-11 9-20 20-20h90c11 0 20 9 20 20v30zm0-110c0 11-9 20-20 20H550c-11 0-20-9-20-20v-30c0-11 9-20 20-20h150c11 0 20 9 20 20v30z' }
  },

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
    { Name:'Acme — Platform Renewal', IsClosed:false, IsWon:false, StageName:'Negotiation', Amount:45000, Renewal_Date__c:'2026-09-30', Probability:70, 'Account.Name':'Acme Corp', 'Owner.Alias':'jdoe' },
    { Name:'Globex — Annual Renewal', IsClosed:false, IsWon:false, StageName:'Proposal',   Amount:128000, Renewal_Date__c:'2026-09-14', Probability:55, 'Account.Name':'Globex', 'Owner.Alias':'mpat' },
    { Name:'Initech — Support Renewal', IsClosed:true, IsWon:true, StageName:'Closed Won', Amount:22500, Renewal_Date__c:'2026-09-22', Probability:100, 'Account.Name':'Initech', 'Owner.Alias':'jdoe' },
    { Name:'Umbrella — Licence Renewal', IsClosed:false, IsWon:false, StageName:'Negotiation', Amount:76000, Renewal_Date__c:'2026-09-08', Probability:60, 'Account.Name':'Umbrella Ltd', 'Owner.Alias':'skim' }
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
    /* "Open deals" is one scenario with several names, not several scenarios.
       The filter is a single boolean; the vocabulary is what makes it findable. */
    id:'a0S06', name:'Open deals', active:true, allowBulk:true, signerField:'',
    description:'Documents for opportunities that are still open.',
    guidance:'Use for open deals, live opportunities, the pipeline, deals in flight, or anything still being worked. Not for closed or won business.',
    object:'Opportunity', templateIds:['a0H02'],
    dateField:'', window:'', allowOverride:false,
    conditions:[{field:'IsClosed', op:'is false', value:''}], findBy:'fields',
    extraFilter:'IsClosed = false', resolverClass:'', sortField:'Amount', maxRecords:50, maxDocuments:200,
    documentAction:'',
    slots:['Name','Account.Name','StageName','Amount','Probability','','',''],
    cardTitle:'Open deals', confirmLabel:'', emptyMessage:'',
    blocks:{ callout:true, stats:true, table:true, button:true },
    prompts:[
      { label:'Open deals', text:'Generate quotes for all open deals', window:'' },
      { label:'Pipeline',   text:'Documents for everything in the pipeline', window:'' },
      { label:'In flight',  text:'Quotes for deals still in flight', window:'' }
    ]
  },
  {
    id:'a0S01', allowBulk:true, signerField:'', name:'Renewals this month', active:true,
    description:'Invoices for opportunities whose renewal date falls this month.',
    guidance:'Use for renewals, expiring contracts or "what is up for renewal". The window may be changed to next month.',
    object:'Opportunity', templateIds:['a0H01','a0H02'],
    dateField:'Renewal_Date__c', window:'THIS_MONTH', allowOverride:true,
    conditions:[], findBy:'date',
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
    id:'a0S02', allowBulk:false, signerField:'Primary_Contact_Email__c', name:'Pilot NDAs this week', active:true,
    description:'Pilot agreements for accounts that accepted a pilot this week.',
    guidance:'Use for pilot paperwork, NDAs or onboarding documents for new pilot customers.',
    object:'Account', templateIds:['a0H03','a0H05'],
    dateField:'Pilot_Accepted_Date__c', window:'THIS_WEEK', allowOverride:true,
    conditions:[{field:'Pilot_Status__c', op:'is', value:'Accepted'}], findBy:'both',
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
    id:'a0S03', allowBulk:true, signerField:'', name:'Case closure summaries', active:true,
    description:'Summary documents for cases closed this week.',
    guidance:'Use for case summaries, closure reports or support wrap-ups. Note Case has no Name field.',
    object:'Case', templateIds:['a0H06'],
    dateField:'ClosedDate', window:'THIS_WEEK', allowOverride:true,
    conditions:[{field:'Status', op:'is', value:'Closed'}], findBy:'both',
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
    id:'a0S04', allowBulk:true, signerField:'', name:'Quarterly statements', active:true,
    description:'Statements for active customer accounts. No date dimension.',
    guidance:'Use for statements or account summaries. This scenario has no date window at all.',
    object:'Account', templateIds:['a0H04'],
    dateField:'', window:'', allowOverride:false,
    conditions:[{field:'Type', op:'is', value:'Customer'},{field:'Active__c', op:'is true', value:''}], findBy:'fields',
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
    id:'a0S05', allowBulk:true, signerField:'', name:'Accounts with no signed NDA', active:true,
    description:'Accounts that have not signed an NDA in twelve months.',
    guidance:'An anti-join against generated documents. Cannot be expressed as a filter, so it uses Apex.',
    object:'Account', templateIds:['a0H05'],
    dateField:'', window:'', allowOverride:false,
    conditions:[], findBy:'apex',
    extraFilter:'', resolverClass:'UnsignedNdaResolver', sortField:'Name', maxRecords:50, maxDocuments:200,
    documentAction:'act2',
    slots:['Name','Industry','','AnnualRevenue','Type','','',''],
    cardTitle:'Missing NDAs', confirmLabel:'', emptyMessage:'',
    blocks:{ callout:true, stats:true, table:true, button:true },
    prompts:[]
  }
];
