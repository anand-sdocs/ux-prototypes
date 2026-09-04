/* =========================================================
   In-App Support — Case Creation & Management
   UX prototype. All data, timings, and context passing are mocked.
   ========================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------------------------------------------------
   MOCK: the account, its orgs, and who is signed in
   --------------------------------------------------------- */
const ACCOUNT = { name: 'Northwind Traders', id: '0018Z00002LmKpQ' };

const INSTANCES = {
  prod: {
    key:'prod', orgName:'Northwind Traders (Production)', orgId:'00D8Z000001abcDEAP',
    instance:'NA152', env:'Production', compliance:'Commercial', gov:false,
    pkg:'4.62.1', pkgNs:'SDOC', pillClass:'', dotClass:''
  },
  sandbox: {
    key:'sandbox', orgName:'Northwind — UAT Sandbox', orgId:'00D5f000000XyzWEBS',
    instance:'CS88', env:'Sandbox', compliance:'Commercial', gov:false,
    pkg:'4.63.0 (beta 2)', pkgNs:'SDOC', pillClass:'is-sandbox', dotClass:'sandbox'
  },
  gov: {
    key:'gov', orgName:'Northwind Public Sector', orgId:'00DGV00000LmnPQEAG',
    instance:'USGOV1', env:'Production', compliance:'Government Cloud', gov:true,
    pkg:'4.61.4', pkgNs:'SDOC', pillClass:'is-gov', dotClass:'gov'
  },
  govplus: {
    key:'govplus', orgName:'Northwind Public Sector (GC+)', orgId:'00DGP00000RstUVEAG',
    instance:'GS0', env:'Production', compliance:'Government Cloud Plus', gov:true,
    pkg:'4.61.4', pkgNs:'SDOC', pillClass:'is-gov', dotClass:'gov'
  }
};

const USERS = [
  { id:'u1', name:'Anand Narasimhan', email:'anand@northwindtraders.com', role:'S-Docs Administrator', title:'Salesforce Platform Lead', color:'#0d3b66' },
  { id:'u2', name:'Dana Whitfield',   email:'dana@northwindtraders.com',  role:'S-Docs Administrator', title:'Revenue Operations',      color:'#7b3fa0' },
  { id:'u3', name:'Priya Raman',      email:'priya@northwindtraders.com', role:'Standard user',        title:'Contracts Manager',       color:'#0b827c' },
  { id:'u4', name:'Marco Ellis',      email:'marco@northwindtraders.com', role:'Standard user',        title:'Sales Operations',        color:'#b95000' },
  { id:'u5', name:'Jamie Cho',        email:'jamie@northwindtraders.com', role:'Standard user',        title:'Account Executive',       color:'#3a3fa8' },
  { id:'u6', name:'Lena Ortiz',       email:'lena@northwindtraders.com',  role:'Standard user',        title:'Legal Counsel',           color:'#8c2f5a' },
  { id:'u7', name:'Tom Becker',       email:'tom@northwindtraders.com',   role:'Standard user',        title:'Field Service Manager',   color:'#2e6b2e' }
];

const SUPPORT = {
  s1: { id:'s1', name:'Kiel VanTiem',  title:'Support Lead',              color:'#0b827c' },
  s2: { id:'s2', name:'Marisol Reyes', title:'Support Engineer',          color:'#0176d3' },
  s3: { id:'s3', name:'Dev Patel',     title:'Senior Support Engineer',   color:'#5867e8' }
};

const userById = id => USERS.find(u => u.id === id) || { name:'Unknown', email:'', color:'#8b8b8b' };

/* ---------------------------------------------------------
   MOCK: pickable org data (templates, records, users)
   --------------------------------------------------------- */
const TEMPLATES = [
  { id:'a0T8Z000001AbcD', name:'Master Services Agreement',      format:'HTML',       modified:'8/29/2026' },
  { id:'a0T8Z000001AbcE', name:'Invoice Template',               format:'PDF-UPLOAD', modified:'8/27/2026' },
  { id:'a0T8Z000001AbcF', name:'NDA — Mutual',                   format:'HTML',       modified:'8/26/2026' },
  { id:'a0T8Z000001AbcG', name:'Quote Summary',                  format:'HTML',       modified:'8/22/2026' },
  { id:'a0T8Z000001AbcH', name:'Onboarding Welcome Packet',      format:'DOCX',       modified:'8/19/2026' },
  { id:'a0T8Z000001AbcI', name:'Statement of Work',              format:'HTML',       modified:'8/18/2026' },
  { id:'a0T8Z000001AbcJ', name:'Annual Renewal Summary',         format:'PDF',        modified:'8/28/2026' },
  { id:'a0T8Z000001AbcK', name:'Quarterly Business Review Deck', format:'PPTX',       modified:'8/25/2026' },
  { id:'a0T8Z000001AbcL', name:'Commission Statement',           format:'XLSX',       modified:'8/21/2026' },
  { id:'a0T8Z000001AbcM', name:'Renewal Notice (2024)',          format:'HTML',       modified:'6/02/2026' }
];

const RECORDS = [
  { id:'0068Z00000QwErT', name:'Northwind — Q3 Platform Expansion', object:'Opportunity' },
  { id:'0068Z00000QwErU', name:'Contoso — Renewal FY27',            object:'Opportunity' },
  { id:'8008Z00000ZxCvB', name:'ORD-004182',                        object:'Order' },
  { id:'8008Z00000ZxCvC', name:'ORD-004199',                        object:'Order' },
  { id:'8008Z00000TyUiO', name:'00000318 — Northwind MSA',          object:'Contract' },
  { id:'0Q08Z00000PoIuY', name:'QUO-2291',                          object:'Quote' },
  { id:'a1B8Z000000SgNz', name:'SR-8841 — MSA countersign',         object:'Signature Request' },
  { id:'5008Z00000MnBvC', name:'00104772 — Doc generation error',    object:'Case (internal)' }
];

/* ---------------------------------------------------------
   MOCK: issue types
   --------------------------------------------------------- */
const ISSUE_TYPES = [
  { key:'docgen', label:'Document generation failure', short:'Doc generation',
    blurb:'A document won’t generate, errors out, or comes back empty.',
    color:'linear-gradient(135deg,#ba0517,#e0575f)',
    icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9.5" y1="17" x2="14.5" y2="12"/><line x1="9.5" y1="12" x2="14.5" y2="17"/>',
    fields:['templates','records','users','errortext','steps'],
    sub:'Generation errors are usually reproducible — the template and a real record get us there fastest.' },

  { key:'design', label:'Template design / formatting', short:'Template design',
    blurb:'The document generates, but it doesn’t look right.',
    color:'linear-gradient(135deg,#5867e8,#8b6fe8)',
    icon:'<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
    fields:['templates','records','expected','steps'],
    sub:'Tell us what you expected vs. what you got — a screenshot of both is ideal.' },

  { key:'esign', label:'E-signature / signing flow', short:'E-signature',
    blurb:'Sending, signing, or returning a signed document is failing.',
    color:'linear-gradient(135deg,#0b827c,#0aa1c9)',
    icon:'<path d="M3 17c3.5 0 4-9 7-9s2.5 9 6 9c2 0 3-1.5 3-1.5"/><line x1="3" y1="21" x2="21" y2="21"/>',
    fields:['esign','templates','users','errortext','steps'],
    sub:'Signature issues often live between S-Docs and the signer’s inbox — the more of the chain we have, the better.' },

  { key:'install', label:'Install, upgrade, or licensing', short:'Install / licensing',
    blurb:'Package install or upgrade fails, or licenses aren’t assigned.',
    color:'linear-gradient(135deg,#a56a00,#e0a33e)',
    icon:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    fields:['install','users'],
    sub:'We already see your current package version — tell us where you’re trying to get to.' },

  { key:'question', label:'General question / how-to', short:'How-to',
    blurb:'Not broken — you want to know how to do something.',
    color:'linear-gradient(135deg,#0176d3,#3ea0e8)',
    icon:'<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a3 3 0 0 1 5.6 1.2c0 2-2.8 2.4-2.8 4"/><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none"/>',
    fields:['templates'],
    sub:'Ask away. Point us at a template if your question is about a specific one.' },

  { key:'other', label:'Something else', short:'Other',
    blurb:'Doesn’t fit the categories above.',
    color:'linear-gradient(135deg,#5c5c5c,#8b8b8b)',
    icon:'<circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/>',
    fields:[],
    sub:'Describe it in your own words and we’ll route it.' }
];
const typeByKey = k => ISSUE_TYPES.find(t => t.key === k);

const PRIORITIES = [
  { key:'Critical', desc:'Production is down. No workaround.',          cls:'prio-critical' },
  { key:'High',     desc:'A core process is blocked for many users.',   cls:'prio-high' },
  { key:'Medium',   desc:'Broken, but there is a workaround.',          cls:'prio-medium' },
  { key:'Low',      desc:'Minor issue or a question.',                  cls:'prio-low' }
];
const prioCls = p => (PRIORITIES.find(x => x.key === p) || PRIORITIES[3]).cls;

const STATUS = {
  new:       { label:'New',                cls:'st-new' },
  triage:    { label:'In triage',          cls:'st-triage' },
  support:   { label:'With support',       cls:'st-support' },
  awaiting:  { label:'Awaiting your reply',cls:'st-awaiting' },
  escalated: { label:'Escalated',          cls:'st-escalated' },
  resolved:  { label:'Resolved',           cls:'st-resolved' },
  closed:    { label:'Closed',             cls:'st-closed' }
};
const isOpen = c => !['resolved','closed'].includes(c.status);

/* ---------------------------------------------------------
   MOCK: seeded cases
   --------------------------------------------------------- */
let CASE_SEQ = 10431;

const SEED_CASES = [
  {
    id:'c1', description:'Generating the MSA from an opportunity throws immediately and no document is created. It worked before the 4.62.1 upgrade on Aug 24. Blocking three deals that need paper this week.', num:'CS-10428', subject:'Master Services Agreement fails to generate — FIELD_INTEGRITY_EXCEPTION',
    type:'docgen', priority:'High', status:'awaiting', instance:'prod',
    requester:'u1', assignee:'s2', created:'Sep 2, 2026 9:14 AM', updated:'Sep 3, 2026 4:02 PM',
    unread:true, collaborators:['u3','u6'], gla:true,
    ctx:{ templates:['a0T8Z000001AbcD'], records:['0068Z00000QwErT','8008Z00000TyUiO'], users:['u3','u5'] },
    fields:{ errortext:'FIELD_INTEGRITY_EXCEPTION: invalid field Contract__r.Owner.Manager.Email for SObject Opportunity', steps:'1. Open the opportunity Northwind — Q3 Platform Expansion\n2. Click Generate Document\n3. Choose Master Services Agreement\n4. Error appears immediately, no document is created' },
    attachments:[{ name:'msa-generation-error.png', kind:'img', size:'284 KB' },{ name:'Loom — MSA generation error', kind:'vid', size:'1 min 12 s' }],
    timeline:[
      { kind:'created', who:{ type:'user', id:'u1' }, when:'Sep 2, 2026 9:14 AM' },
      { kind:'status', when:'Sep 2, 2026 9:16 AM', text:'Case routed to <b>Marisol Reyes</b> (Support Engineer) based on issue type and org.' },
      { kind:'support_reply', who:{ type:'support', id:'s2' }, when:'Sep 2, 2026 11:48 AM',
        body:'Thanks for the detail and the Loom — that saved us a round trip. I can see the exception is on a cross-object merge field that walks Owner → Manager. Reproducing in a sandbox now.' },
      { kind:'info_request', who:{ type:'support', id:'s2' }, when:'Sep 3, 2026 4:02 PM',
        body:'I can reproduce the failure, but only for some records. To narrow it down I need a couple of things:',
        items:['Does the Opportunity owner have a Manager populated in their user record?','One record where generation <b>succeeds</b>, so I can diff the two','Confirm whether this started after the 4.62.1 upgrade on Aug 24'] }
    ]
  },
  {
    id:'c2', description:'Envelopes show as Sent in S-Docs, but the signers say they never got an email. We have 40 renewal packets that have to go out this week and none of them are moving.', num:'CS-10419', subject:'Signers never receive the signing email for renewal packets',
    type:'esign', priority:'Critical', status:'escalated', instance:'prod',
    requester:'u2', assignee:'s3', created:'Aug 31, 2026 2:31 PM', updated:'Sep 3, 2026 10:20 AM',
    unread:false, collaborators:['u1'], gla:true,
    ctx:{ templates:['a0T8Z000001AbcJ'], records:['a1B8Z000000SgNz'], users:['u5','u6'] },
    fields:{ stage:'Signer never received the email', envelope:'a1B8Z000000SgNz', errortext:'', steps:'1. Send Annual Renewal Summary for signature\n2. Envelope shows Sent in S-Docs\n3. Signer reports no email after 30+ minutes' },
    attachments:[{ name:'envelope-status.png', kind:'img', size:'196 KB' }],
    timeline:[
      { kind:'created', who:{ type:'user', id:'u2' }, when:'Aug 31, 2026 2:31 PM' },
      { kind:'status', when:'Aug 31, 2026 2:33 PM', text:'Priority <b>Critical</b> — routed to <b>Dev Patel</b> (Senior Support Engineer).' },
      { kind:'support_reply', who:{ type:'support', id:'s3' }, when:'Aug 31, 2026 3:10 PM',
        body:'Confirmed on our side — the envelope is created but delivery is being suppressed. Checking whether the signer domain is on a bounce list.' },
      { kind:'customer_reply', who:{ type:'user', id:'u2' }, when:'Sep 1, 2026 8:40 AM',
        body:'Two of the three signers are at the same domain (contoso.com). The third one, at a gmail address, did receive it.' },
      { kind:'call_request', who:{ type:'user', id:'u1' }, when:'Sep 2, 2026 9:02 AM',
        body:'We have 40 renewals that need to go out this week. Can we get someone on a call?' },
      { kind:'status', when:'Sep 2, 2026 9:35 AM', text:'Live session requested. <b>Dev Patel</b> will reach out to arrange a time.' },
      { kind:'support_reply', who:{ type:'support', id:'s3' }, when:'Sep 3, 2026 10:20 AM',
        body:'We found it. Your org’s deliverability settings for the contoso.com domain were changed on Aug 28 and are blocking outbound. I’m escalating to engineering to confirm the fix, and I’ll send times for a call today.' }
    ]
  },
  {
    id:'c3', description:"The invoice generates fine, but on any order long enough to spill to a second page the line-item table breaks in the middle of a row and the column header doesn't repeat. Finance is rejecting them.", num:'CS-10402', subject:'Page break splits the line-item table mid-row on Invoice Template',
    type:'design', priority:'Medium', status:'support', instance:'sandbox',
    requester:'u3', assignee:'s2', created:'Aug 28, 2026 11:02 AM', updated:'Sep 1, 2026 1:15 PM',
    unread:false, collaborators:[], gla:false,
    ctx:{ templates:['a0T8Z000001AbcE'], records:['8008Z00000ZxCvB'], users:['u3'] },
    fields:{ expected:'Line-item table breaks between rows, with the header repeating on page 2.', actual:'Row 14 is split in half across the page break and the header does not repeat.', steps:'1. Generate Invoice Template for ORD-004182 (28 line items)\n2. Scroll to page 2 of the PDF' },
    attachments:[{ name:'invoice-page2-split.png', kind:'img', size:'412 KB' }],
    timeline:[
      { kind:'created', who:{ type:'user', id:'u3' }, when:'Aug 28, 2026 11:02 AM' },
      { kind:'support_reply', who:{ type:'support', id:'s2' }, when:'Aug 28, 2026 4:55 PM',
        body:'Reproduced. This is the table-splitting CSS in the PDF engine. There’s a template-side fix we can apply — writing it up with the exact markup change now.' },
      { kind:'status', when:'Sep 1, 2026 1:15 PM', text:'Linked to internal defect <b>SD-7742</b> — fix targeted for 4.63.' }
    ]
  },
  {
    id:'c4', description:'Upgrading the UAT sandbox from 4.62.1 to the 4.63.0 beta fails at install with a recompilation error. We need this sandbox on 4.63 before we can validate the production upgrade.', num:'CS-10387', subject:'Upgrade to 4.63.0 beta fails on managed package install',
    type:'install', priority:'High', status:'resolved', instance:'sandbox',
    requester:'u1', assignee:'s1', created:'Aug 24, 2026 8:20 AM', updated:'Aug 26, 2026 9:41 AM',
    unread:false, collaborators:['u2'], gla:true,
    ctx:{ templates:[], records:[], users:['u1'] },
    fields:{ targetver:'4.63.0 (latest)', installerr:'Your requested install failed. Please try this again.\nDependent class is invalid and needs recompilation: SDOC.SDTemplateController' },
    attachments:[],
    timeline:[
      { kind:'created', who:{ type:'user', id:'u1' }, when:'Aug 24, 2026 8:20 AM' },
      { kind:'support_reply', who:{ type:'support', id:'s1' }, when:'Aug 24, 2026 10:05 AM',
        body:'That recompilation error usually means a custom Apex class in your org references a removed S-Docs method. Can you run the install again with "Compile only the Apex in the package" selected?' },
      { kind:'customer_reply', who:{ type:'user', id:'u1' }, when:'Aug 25, 2026 3:22 PM',
        body:'That worked — install completed. We do have a trigger that calls an older S-Docs method; I’ll get that cleaned up.' },
      { kind:'resolved', who:{ type:'support', id:'s1' }, when:'Aug 26, 2026 9:41 AM',
        body:'Marking this resolved. For the record: the blocking class was a custom trigger calling SDTemplateController.getTemplateList(), which moved namespaces in 4.63. Reopen any time if the next upgrade hits the same wall.' }
    ]
  },
  {
    id:'c5', description:"Not a bug. On the Statement of Work template I want one section to appear only for the Enterprise record type. What's the right way to write that condition?", num:'CS-10361', subject:'How do I conditionally show a section based on record type?',
    type:'question', priority:'Low', status:'resolved', instance:'prod',
    requester:'u4', assignee:'s2', created:'Aug 19, 2026 1:44 PM', updated:'Aug 20, 2026 9:12 AM',
    unread:false, collaborators:[], gla:false,
    ctx:{ templates:['a0T8Z000001AbcI'], records:[], users:['u4'] },
    fields:{},
    attachments:[],
    timeline:[
      { kind:'created', who:{ type:'user', id:'u4' }, when:'Aug 19, 2026 1:44 PM' },
      { kind:'support_reply', who:{ type:'support', id:'s2' }, when:'Aug 20, 2026 9:12 AM',
        body:'You want a conditional block keyed on the record type developer name. Wrap the section in an IF on {{!RecordType.DeveloperName}} — I’ve pasted the exact snippet for your Statement of Work template below, drop it in and it will render only for the Enterprise record type.' },
      { kind:'resolved', who:{ type:'support', id:'s2' }, when:'Aug 20, 2026 9:12 AM', body:'Resolved as answered.' }
    ]
  },
  {
    id:'c6', description:'Bulk generating commission statements for the full sales roster stalls at about 40% and never finishes. Smaller batches complete without issue.', num:'CS-10355', subject:'Bulk generation job stalls at 40% for large batches',
    type:'other', priority:'Medium', status:'closed', instance:'prod',
    requester:'u2', assignee:'s3', created:'Aug 14, 2026 4:03 PM', updated:'Aug 22, 2026 11:30 AM',
    unread:false, collaborators:[], gla:false,
    ctx:{ templates:['a0T8Z000001AbcL'], records:[], users:['u2'] },
    fields:{},
    attachments:[],
    timeline:[
      { kind:'created', who:{ type:'user', id:'u2' }, when:'Aug 14, 2026 4:03 PM' },
      { kind:'support_reply', who:{ type:'support', id:'s3' }, when:'Aug 15, 2026 10:00 AM',
        body:'Batches over 200 records were hitting a governor limit in the job chain. We’ve raised your batch chunk configuration — please retry.' },
      { kind:'resolved', who:{ type:'support', id:'s3' }, when:'Aug 18, 2026 9:00 AM', body:'Retry succeeded on 480 records.' },
      { kind:'status', when:'Aug 22, 2026 11:30 AM', text:'Case <b>closed</b> automatically after 3 days with no further activity.' }
    ]
  }
];

/* ---------------------------------------------------------
   STATE
   --------------------------------------------------------- */
const initialState = () => ({
  view:'list',
  personaId:'u1',
  instanceKey:'prod',
  scope:'mine',
  filter:'all',
  search:'',
  cases: JSON.parse(JSON.stringify(SEED_CASES)),
  openCaseId:null,
  timelineDesc:false,
  composerOpen:false,
  wizStep:1,
  draft:null
});
let S = initialState();

const me = () => userById(S.personaId);
const inst = () => INSTANCES[S.instanceKey];
const isAdmin = () => me().role === 'S-Docs Administrator';
const caseById = id => S.cases.find(c => c.id === id);

const newDraft = () => ({
  type:null, subject:'', priority:'', description:'',
  templates:[], records:[], users:[], collaborators:[],
  errortext:'', steps:'', expected:'', actual:'', stage:'', envelope:'',
  targetver:'', installerr:'', gla:false, attachments:[]
});

/* ---------------------------------------------------------
   SMALL UI HELPERS
   --------------------------------------------------------- */
function toast(kind, html, ms = 4200) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + kind;
  el.innerHTML = `<div class="toast-body">${html}</div>
    <button class="toast-close" aria-label="Close">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 240); };
  el.querySelector('.toast-close').onclick = kill;
  $('#toast-region').appendChild(el);
  setTimeout(kill, ms);
}

function ico(path, size = 14, sw = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
const I = {
  check:'<polyline points="20 6 9 17 4 12"/>',
  alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info:'<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  msg:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  vid:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  people:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'
};
const avatarHtml = (name, color, cls = 'pav') =>
  `<span class="${cls}" style="background:${color}">${esc(name.split(' ').map(p => p[0]).join('').slice(0,2))}</span>`;

/* ---------------------------------------------------------
   MODALS
   --------------------------------------------------------- */
function openModal(html, opts = {}) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}">${html}</div>`;
  back.addEventListener('click', e => { if (e.target === back && !opts.sticky) closeModal(); });
  $('#modal-host').appendChild(back);
  return back;
}
const closeModal = () => $$('#modal-host .modal-backdrop').forEach(m => m.remove());

/* =========================================================
   MULTI-SELECT PICKER
   ========================================================= */
const PICKER_DEFS = {
  templates: {
    placeholder:'Search templates by name...',
    empty:'No templates match.',
    options: () => TEMPLATES.map(t => ({ id:t.id, label:t.name, sub:`${t.format} · modified ${t.modified}`, badge:t.format.replace('-UPLOAD','U').slice(0,4), tag:t.id })),
    key:'templates'
  },
  records: {
    placeholder:'Search records — opportunity, order, contract, quote...',
    empty:'No records match. You can paste a record Id instead.',
    options: () => RECORDS.map(r => ({ id:r.id, label:r.name, sub:`${r.object} · ${r.id}`, badge:r.object.slice(0,3).toUpperCase(), tag:r.id })),
    key:'records'
  },
  users: {
    placeholder:'Search users in your org...',
    empty:'No users match.',
    options: () => USERS.map(u => ({ id:u.id, label:u.name, sub:`${u.title} · ${u.email}`, avatar:u.color, tag:'' })),
    key:'users'
  },
  collaborators: {
    placeholder:'Add a colleague by name or email...',
    empty:'No users match.',
    options: () => USERS.filter(u => u.id !== S.personaId).map(u => ({ id:u.id, label:u.name, sub:`${u.title} · ${u.email}`, avatar:u.color, tag:'' })),
    key:'collaborators'
  }
};

function mountPicker(host) {
  const def = PICKER_DEFS[host.dataset.picker];
  host.innerHTML = `<div class="pk-wrap">
      <div class="pk-box"><input class="pk-input" type="text" placeholder="${esc(def.placeholder)}"></div>
      <div class="pk-menu" hidden></div>
    </div>`;
  const box = $('.pk-box', host), input = $('.pk-input', host), menu = $('.pk-menu', host);

  const selected = () => S.draft[def.key];

  function renderChips() {
    $$('.pk-chip', box).forEach(c => c.remove());
    const opts = def.options();
    selected().forEach(id => {
      const o = opts.find(x => x.id === id);
      if (!o) return;
      const chip = document.createElement('span');
      chip.className = 'pk-chip';
      chip.innerHTML = `${esc(o.label)}${o.tag ? `<span class="pkc-sub">${esc(o.tag)}</span>` : ''}<button class="pkc-x" title="Remove">&times;</button>`;
      chip.querySelector('.pkc-x').onclick = e => {
        e.stopPropagation();
        S.draft[def.key] = selected().filter(x => x !== id);
        renderChips(); renderMenu();
      };
      box.insertBefore(chip, input);
    });
    input.placeholder = selected().length ? 'Add another...' : def.placeholder;
  }

  function renderMenu() {
    const q = input.value.trim().toLowerCase();
    const list = def.options()
      .filter(o => !selected().includes(o.id))
      .filter(o => !q || (o.label + ' ' + o.sub).toLowerCase().includes(q))
      .slice(0, 8);
    if (!list.length) { menu.innerHTML = `<div class="pk-empty">${esc(def.empty)}</div>`; return; }
    menu.innerHTML = list.map(o => `
      <div class="pk-opt" data-id="${o.id}">
        ${o.avatar ? avatarHtml(o.label, o.avatar, 'pav') : `<span class="pk-opt-ico">${esc(o.badge || '')}</span>`}
        <span class="pk-opt-body"><b>${esc(o.label)}</b><span>${esc(o.sub)}</span></span>
      </div>`).join('');
    $$('.pk-opt', menu).forEach(el => el.onmousedown = e => {
      e.preventDefault();
      S.draft[def.key] = selected().concat(el.dataset.id);
      input.value = '';
      renderChips(); renderMenu();
      host.closest('.field')?.classList.remove('has-err');
    });
  }

  box.onclick = () => input.focus();
  input.onfocus = () => { box.classList.add('focused'); menu.hidden = false; renderMenu(); };
  input.onblur  = () => { box.classList.remove('focused'); setTimeout(() => { menu.hidden = true; }, 60); };
  input.oninput = renderMenu;
  input.onkeydown = e => {
    if (e.key === 'Backspace' && !input.value && selected().length) {
      S.draft[def.key] = selected().slice(0, -1); renderChips(); renderMenu();
    }
  };
  renderChips();
}

/* =========================================================
   VIEW: CASE LIST
   ========================================================= */
function visibleCases() {
  const myId = S.personaId;
  let list = S.cases.filter(c => {
    if (S.scope === 'account' && isAdmin()) return true;
    return c.requester === myId || (c.collaborators || []).includes(myId);
  });
  if (S.filter === 'open')     list = list.filter(isOpen);
  if (S.filter === 'needsyou') list = list.filter(c => c.status === 'awaiting');
  if (S.filter === 'closed')   list = list.filter(c => !isOpen(c));
  const q = S.search.trim().toLowerCase();
  if (q) {
    list = list.filter(c => {
      const tpl = (c.ctx.templates || []).map(id => (TEMPLATES.find(t => t.id === id) || {}).name || '').join(' ');
      return (c.num + ' ' + c.subject + ' ' + tpl + ' ' + typeByKey(c.type).label).toLowerCase().includes(q);
    });
  }
  return list;
}

function renderList() {
  const myId = S.personaId;
  const mine = S.cases.filter(c => c.requester === myId || (c.collaborators || []).includes(myId));
  const all  = S.cases;

  // scope switch
  $('#scope-switch').innerHTML = `
    <button class="scope-btn ${S.scope === 'mine' ? 'active' : ''}" data-scope="mine">
      My cases <span class="scope-count">${mine.length}</span>
    </button>
    <button class="scope-btn ${S.scope === 'account' ? 'active' : ''} ${isAdmin() ? '' : 'locked'}" data-scope="account"
      title="${isAdmin() ? 'Every case raised from any org owned by ' + ACCOUNT.name : 'Requires the S-Docs Administrator permission set'}">
      ${ico(I.people, 12)} All cases &mdash; ${esc(ACCOUNT.name)} <span class="scope-count">${all.length}</span>
    </button>`;
  $$('#scope-switch .scope-btn').forEach(b => b.onclick = () => {
    if (b.classList.contains('locked')) {
      toast('warning', `<b>Not available.</b> ${esc(me().name)} is a standard user &mdash; account-wide case visibility needs the S-Docs Administrator permission set.`);
      return;
    }
    S.scope = b.dataset.scope; renderList();
  });

  $('#ah-sub').innerHTML = S.scope === 'account'
    ? `Every case raised from any org owned by <b>${esc(ACCOUNT.name)}</b> &mdash; production and sandboxes together.`
    : `Cases you raised or were added to, from any of your orgs. We capture your environment automatically.`;

  // filters
  const counts = {
    all: (S.scope === 'account' && isAdmin() ? all : mine).length,
    open: (S.scope === 'account' && isAdmin() ? all : mine).filter(isOpen).length,
    needsyou: (S.scope === 'account' && isAdmin() ? all : mine).filter(c => c.status === 'awaiting').length,
    closed: (S.scope === 'account' && isAdmin() ? all : mine).filter(c => !isOpen(c)).length
  };
  const FILTERS = [
    ['needsyou','Needs your reply'], ['open','Open'], ['closed','Resolved &amp; closed'], ['all','All']
  ];
  $('#filter-row').innerHTML = FILTERS.map(([k, l]) =>
    `<button class="fchip ${S.filter === k ? 'active' : ''}" data-filter="${k}">${l} (${counts[k]})</button>`).join('');
  $$('#filter-row .fchip').forEach(b => b.onclick = () => { S.filter = b.dataset.filter; renderList(); });

  // awaiting banner
  const awaiting = (S.scope === 'account' && isAdmin() ? all : mine).filter(c => c.status === 'awaiting');
  $('#awaiting-banner').innerHTML = awaiting.length ? `
    <div class="banner banner-warn">
      <span class="banner-ico">${ico(I.alert, 15)}</span>
      <div class="banner-body">
        <b>${awaiting.length} case${awaiting.length > 1 ? 's are' : ' is'} waiting on you.</b>
        Support asked for more detail. Until you reply, the case sits still &mdash; this is the 24-hour gap email used to create.
        <div class="banner-act"><button class="link-btn" id="goto-awaiting">Open ${esc(awaiting[0].num)}</button></div>
      </div>
    </div>` : '';
  const ga = $('#goto-awaiting');
  if (ga) ga.onclick = () => openCase(awaiting[0].id);

  // table
  const accountScope = S.scope === 'account' && isAdmin();
  $('#case-thead').innerHTML = `<tr>
      <th>Case</th><th>Subject</th>${accountScope ? '<th>Raised by</th><th>Org</th>' : ''}
      <th>Priority</th><th>Status</th><th>Last update</th>
    </tr>`;

  const list = visibleCases();
  if (!list.length) {
    $('#case-tbody').innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <b>No cases here</b>Nothing matches this filter${S.search ? ' and search' : ''}.</div></td></tr>`;
  } else {
    $('#case-tbody').innerHTML = list.map(c => {
      const t = typeByKey(c.type);
      const ins = INSTANCES[c.instance];
      const tplNames = (c.ctx.templates || []).map(id => (TEMPLATES.find(x => x.id === id) || {}).name).filter(Boolean);
      const metaBits = [t.short].concat(tplNames.length ? [tplNames[0] + (tplNames.length > 1 ? ` +${tplNames.length - 1}` : '')] : []);
      return `<tr data-id="${c.id}" class="${c.status === 'awaiting' ? 'needs-you' : ''}">
        <td class="case-num">${esc(c.num)}</td>
        <td>
          <div class="case-subj">${c.unread ? '<span class="unread" title="Unread update"></span>' : ''}${esc(c.subject)}</div>
          <div class="case-meta">${metaBits.map(esc).join(' &middot; ')}</div>
        </td>
        ${accountScope ? `<td class="col-nowrap">${esc(userById(c.requester).name)}</td>
          <td><span class="env-tag"><i class="env-dot ${ins.dotClass}"></i>${esc(ins.env === 'Sandbox' ? 'Sandbox' : ins.compliance === 'Commercial' ? 'Production' : ins.compliance)}</span>
            <div class="case-meta">${esc(ins.orgName)}</div></td>` : ''}
        <td><span class="prio ${prioCls(c.priority)}"><i></i>${esc(c.priority)}</span></td>
        <td><span class="badge ${STATUS[c.status].cls}">${STATUS[c.status].label}</span></td>
        <td class="col-nowrap">${esc(c.updated)}</td>
      </tr>`;
    }).join('');
    $$('#case-tbody tr[data-id]').forEach(tr => tr.onclick = () => openCase(tr.dataset.id));
  }

  $('#list-foot').innerHTML = `${list.length} case${list.length === 1 ? '' : 's'} &middot; ${accountScope
    ? `account-wide view across ${new Set(S.cases.map(c => c.instance)).size} org${new Set(S.cases.map(c => c.instance)).size > 1 ? 's' : ''}`
    : `signed in as ${esc(me().name)} &middot; ${esc(me().role)}`}`;

  $('#bell-dot').hidden = !S.cases.some(c => c.unread);
  setView('list');
}

/* =========================================================
   VIEW: NEW CASE WIZARD
   ========================================================= */
function startNewCase() {
  S.draft = newDraft();
  S.wizStep = 1;
  renderWizard();
  setView('new');
}

function renderWizSteps() {
  const steps = ['Issue type', 'Details & context', 'Review', 'Submitted'];
  $('#wiz-steps').innerHTML = steps.map((label, i) => {
    const n = i + 1;
    const cls = S.wizStep === n ? 'active' : (S.wizStep > n ? 'done' : '');
    return `<div class="wstep ${cls}"><span class="wstep-num">${S.wizStep > n ? '&#10003;' : n}</span>${label}</div>
      ${n < steps.length ? '<span class="wstep-bar"></span>' : ''}`;
  }).join('');
}

function renderWizard() {
  renderWizSteps();
  [1,2,3,4].forEach(n => $('#wstep-' + n).hidden = S.wizStep !== n);
  $('#wiz-title').textContent = S.wizStep === 4 ? 'Case submitted' : 'New support case';

  if (S.wizStep === 1) renderTypeGrid();
  if (S.wizStep === 2) renderDetails();
  if (S.wizStep === 3) renderReview();
}

function renderTypeGrid() {
  $('#type-grid').innerHTML = ISSUE_TYPES.map(t => `
    <button class="type-card ${S.draft.type === t.key ? 'selected' : ''}" data-type="${t.key}">
      <span class="tc-ico" style="background:${t.color}">${ico(t.icon, 17)}</span>
      <span class="tc-body"><b>${esc(t.label)}</b><span>${esc(t.blurb)}</span></span>
    </button>`).join('');
  $$('#type-grid .type-card').forEach(b => b.onclick = () => {
    S.draft.type = b.dataset.type;
    S.wizStep = 2;
    renderWizard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function renderContextGrid(host) {
  const i = inst(), u = me();
  const complianceFlag = i.gov ? `<span class="ctx-flag">${esc(i.compliance)}</span>` : '<span class="ctx-flag prod">Commercial</span>';
  const items = [
    ['Organization', `${esc(i.orgName)}`, ''],
    ['Org Id', esc(i.orgId), 'mono'],
    ['Instance', `${esc(i.instance)} ${i.env === 'Sandbox' ? '<span class="ctx-flag sandbox">Sandbox</span>' : '<span class="ctx-flag prod">Production</span>'}`, ''],
    ['Compliance', complianceFlag, ''],
    ['S-Docs package', `${esc(i.pkg)}`, ''],
    ['Signed-in user', `${esc(u.name)}`, ''],
    ['Email', esc(u.email), ''],
    ['Account', `${esc(ACCOUNT.name)}`, '']
  ];
  host.innerHTML = items.map(([k, v, cls]) =>
    `<div class="ctx-item"><label>${k}</label><div class="ctx-val ${cls}">${v}</div></div>`).join('');
}

function renderDetails() {
  const t = typeByKey(S.draft.type);
  renderContextGrid($('#ctx-grid'));
  $('#type-chip').className = 'tbadge';
  $('#type-chip').innerHTML = `${esc(t.label)} &nbsp;<button class="link-btn" id="change-type" style="font-size:11px">Change</button>`;
  $('#change-type').onclick = () => { S.wizStep = 1; renderWizard(); };
  $('#detail-sub').textContent = t.sub;

  // conditional visibility
  const on = new Set(t.fields);
  $$('#wstep-2 .cond').forEach(el => { el.hidden = !on.has(el.dataset.cond); });
  // steps-to-reproduce is standard for anything but a question
  const stepsField = $('#wstep-2 [data-cond="steps"]');
  if (stepsField) stepsField.hidden = !on.has('steps');

  // priority
  $('#prio-row').innerHTML = PRIORITIES.map(p => `
    <button class="prio-opt ${S.draft.priority === p.key ? 'selected' : ''}" data-prio="${p.key}">
      <b><i style="background:${p.cls === 'prio-critical' ? '#ba0517' : p.cls === 'prio-high' ? '#e07000' : p.cls === 'prio-medium' ? '#0176d3' : '#a8b4c4'}"></i>${p.key}</b>
      <span>${esc(p.desc)}</span>
    </button>`).join('');
  $$('#prio-row .prio-opt').forEach(b => b.onclick = () => {
    S.draft.priority = b.dataset.prio;
    $('#prio-row').closest('.field').classList.remove('has-err');
    renderDetails();
  });

  // text inputs
  const bind = (sel, key) => {
    const el = $(sel); if (!el) return;
    el.value = S.draft[key] || '';
    el.oninput = () => { S.draft[key] = el.value; el.closest('.field').classList.remove('has-err'); };
  };
  bind('#f-subject','subject'); bind('#f-desc','description'); bind('#f-error','errortext');
  bind('#f-steps','steps'); bind('#f-expected','expected'); bind('#f-actual','actual');
  bind('#f-envelope','envelope'); bind('#f-installerr','installerr');
  const stage = $('#f-stage'); stage.value = S.draft.stage || '';
  stage.onchange = () => { S.draft.stage = stage.value; stage.closest('.field').classList.remove('has-err'); };
  const tv = $('#f-targetver'); tv.value = S.draft.targetver || '';
  tv.onchange = () => { S.draft.targetver = tv.value; tv.closest('.field').classList.remove('has-err'); };

  // pickers
  $$('#wstep-2 .picker').forEach(mountPicker);

  renderAttachments();
  renderGla();
}

function renderAttachments() {
  const host = $('#attach-list');
  host.innerHTML = S.draft.attachments.map((a, i) => `
    <div class="attach-item">
      <span class="att-ico ${a.kind === 'vid' ? 'vid' : ''}">${ico(a.kind === 'vid' ? I.vid : I.file, 15)}</span>
      <span class="att-meta"><b>${esc(a.name)}</b><span>${esc(a.size)}</span></span>
      <button class="icon-x" data-i="${i}" title="Remove">&times;</button>
    </div>`).join('');
  $$('#attach-list .icon-x').forEach(b => b.onclick = () => {
    S.draft.attachments.splice(+b.dataset.i, 1); renderAttachments();
  });
}

const FAKE_FILES = [
  { name:'generation-error.png', kind:'img', size:'284 KB' },
  { name:'invoice-page2.png',    kind:'img', size:'412 KB' },
  { name:'debug-log.txt',        kind:'img', size:'96 KB' },
  { name:'template-markup.html', kind:'img', size:'18 KB' }
];
let fakeFileIdx = 0;
function addFakeFile() {
  const f = FAKE_FILES[fakeFileIdx++ % FAKE_FILES.length];
  S.draft.attachments.push({ ...f });
  renderAttachments();
  toast('success', `<b>${esc(f.name)}</b> attached.`, 2400);
}

function renderGla() {
  const i = inst();
  const host = $('#gla-block');
  if (i.gov) {
    S.draft.gla = false;
    host.innerHTML = `
      <span class="sub-legend">Login access</span>
      <div class="gla-row gated">
        <span class="gla-pill">${esc(i.compliance)}</span>
        <div class="gla-body">
          <b>We won&rsquo;t ask you to grant login access</b>
          <p>Your org runs on <b>${esc(i.compliance)}</b> (instance <b>${esc(i.instance)}</b>), where login-access grants to external support are restricted. We detected that automatically, so this step is skipped &mdash; we&rsquo;ll troubleshoot from the templates, records, and logs you attach here.</p>
        </div>
      </div>`;
    return;
  }
  host.innerHTML = `
    <span class="sub-legend">Grant login access <span style="font-weight:400;color:var(--text-faint)">(optional)</span></span>
    <div class="gla-row">
      <button class="switch ${S.draft.gla ? 'on' : ''}" id="gla-switch" aria-label="Grant login access"></button>
      <div class="gla-body">
        <b>Let support log in as you to reproduce this</b>
        <p>Cuts out the back-and-forth &mdash; we can see the failure ourselves instead of asking you to describe it. Access is read-and-reproduce only, scoped to your user, and expires automatically.</p>
        ${S.draft.gla ? `<ol class="gla-steps">
            <li>We&rsquo;ll add a step-by-step prompt on the confirmation screen</li>
            <li>Grant expires <b>3 days</b> from submission</li>
            <li>You can revoke it any time from your personal settings</li>
          </ol>` : ''}
      </div>
    </div>`;
  $('#gla-switch').onclick = () => { S.draft.gla = !S.draft.gla; renderGla(); };
}

/* ---------- validation ---------- */
function validateDetails() {
  const t = typeByKey(S.draft.type);
  const on = new Set(t.fields);
  const rules = [
    ['subject', () => S.draft.subject.trim().length >= 6, 'Give us a one-line summary (at least 6 characters).'],
    ['priority', () => !!S.draft.priority, 'Pick a priority so we route this correctly.'],
    ['description', () => S.draft.description.trim().length >= 15, 'A sentence or two on what’s happening and what it blocks.'],
    ['templates', () => !on.has('templates') || S.draft.templates.length > 0, 'Select at least one template.'],
    ['records', () => !on.has('records') || S.draft.records.length > 0, 'Select at least one example record — this is what we reproduce against.'],
    ['users', () => !on.has('users') || S.draft.users.length > 0, 'Tell us who is affected, even if it’s you.'],
    ['steps', () => !on.has('steps') || S.draft.steps.trim().length >= 10, 'Steps to reproduce are what prevent a day of email back-and-forth.'],
    ['expected', () => !on.has('expected') || S.draft.expected.trim().length >= 5, 'Describe the expected output.'],
    ['actual', () => !on.has('expected') || S.draft.actual.trim().length >= 5, 'Describe what you’re getting instead.'],
    ['stage', () => !on.has('esign') || !!S.draft.stage, 'Pick the step where signing breaks.'],
    ['targetver', () => !on.has('install') || !!S.draft.targetver, 'Select the version you’re moving to.']
  ];
  // templates are optional for the question type
  if (S.draft.type === 'question') rules.splice(rules.findIndex(r => r[0] === 'templates'), 1);

  let first = null;
  $$('#wstep-2 .field').forEach(f => f.classList.remove('has-err'));
  rules.forEach(([key, test, msg]) => {
    const field = $(`#wstep-2 [data-req="${key}"]`);
    if (!field || field.hidden) return;
    if (!test()) {
      field.classList.add('has-err');
      const e = $('.field-err', field); if (e) e.textContent = msg;
      if (!first) first = field;
    }
  });
  if (first) {
    first.scrollIntoView({ behavior:'smooth', block:'center' });
    toast('error', '<b>Almost there.</b> A few required details are missing.');
    return false;
  }
  return true;
}

/* ---------- review ---------- */
function renderReview() {
  const d = S.draft, t = typeByKey(d.type), i = inst();
  const chipList = (ids, src, tagKey) => {
    if (!ids.length) return '<span class="rv muted">None selected</span>';
    return `<div class="rv-chips">${ids.map(id => {
      const o = src.find(x => x.id === id) || {};
      const label = o.name || o.label || id;
      const tag = tagKey ? (o[tagKey] || '') : '';
      return `<span class="rv-chip">${esc(label)}${tag ? `<span>${esc(tag)}</span>` : ''}</span>`;
    }).join('')}</div>`;
  };
  const row = (k, v, cls = '') => `<div class="rev-row"><span class="rk">${k}</span><span class="rv ${cls}">${v}</span></div>`;
  const val = v => (v && String(v).trim()) ? esc(v) : '<span class="rv muted">Not provided</span>';
  const on = new Set(t.fields);

  const ctxRows = [
    row('Organization', esc(i.orgName)),
    row('Org Id', esc(i.orgId), 'mono'),
    row('Instance / environment', `${esc(i.instance)} &middot; ${esc(i.env)} &middot; ${esc(i.compliance)}`),
    row('S-Docs package version', esc(i.pkg)),
    row('Reported by', `${esc(me().name)} &middot; ${esc(me().email)}`),
    row('Account', esc(ACCOUNT.name)),
    row('Login access', i.gov
      ? `<span class="rv muted">Not requested &mdash; ${esc(i.compliance)} org</span>`
      : (d.gla ? 'Granted for 3 days' : '<span class="rv muted">Not granted</span>'))
  ].join('');

  const detailRows = [
    row('Issue type', esc(t.label)),
    row('Priority', `<span class="prio ${prioCls(d.priority)}"><i></i>${esc(d.priority)}</span>`),
    row('Subject', esc(d.subject)),
    on.has('templates') || d.templates.length ? row('Affected template(s)', chipList(d.templates, TEMPLATES, 'id')) : '',
    on.has('records')   || d.records.length   ? row('Example record(s)', chipList(d.records, RECORDS, 'id')) : '',
    on.has('users')     || d.users.length     ? row('Affected user(s)', chipList(d.users, USERS)) : '',
    on.has('esign') ? row('Breaks at', val(d.stage)) + row('Envelope Id', val(d.envelope), 'mono') : '',
    on.has('install') ? row('Target version', val(d.targetver)) + row('Install error', val(d.installerr), 'mono') : '',
    row('Description', val(d.description)),
    on.has('errortext') ? row('Error message', val(d.errortext), 'mono') : '',
    on.has('expected') ? row('Expected output', val(d.expected)) + row('Actual output', val(d.actual)) : '',
    on.has('steps') ? row('Steps to reproduce', val(d.steps)) : ''
  ].filter(Boolean).join('');

  const extraRows = [
    row('Attachments', d.attachments.length
      ? `<div class="rv-chips">${d.attachments.map(a => `<span class="rv-chip">${esc(a.name)}<span>${esc(a.size)}</span></span>`).join('')}</div>`
      : '<span class="rv muted">None</span>'),
    row('Collaborators', d.collaborators.length
      ? chipList(d.collaborators, USERS)
      : '<span class="rv muted">Just you</span>')
  ].join('');

  $('#review-body').innerHTML = `
    <div class="banner banner-info">
      <span class="banner-ico">${ico(I.info, 15)}</span>
      <div class="banner-body">Everything below is submitted in one shot. Nothing here is a follow-up question support has to email you for.</div>
    </div>
    <div class="rev-section">
      <div class="rev-head">${ico(I.check, 12)} Detected context <span class="rev-edit">auto-captured</span></div>
      <div class="rev-rows">${ctxRows}</div>
    </div>
    <div class="rev-section">
      <div class="rev-head">${ico(I.file, 12)} Your report <button class="link-btn rev-edit" data-wiz="back-2">Edit</button></div>
      <div class="rev-rows">${detailRows}</div>
    </div>
    <div class="rev-section">
      <div class="rev-head">${ico(I.people, 12)} Attachments &amp; people <button class="link-btn rev-edit" data-wiz="back-2">Edit</button></div>
      <div class="rev-rows">${extraRows}</div>
    </div>`;
  $$('#review-body [data-wiz="back-2"]').forEach(b => b.onclick = () => { S.wizStep = 2; renderWizard(); });
}

/* ---------- submit ---------- */
function submitCase() {
  const steps = [
    'Validating submitted context',
    `Matching org ${inst().orgId} to an account`,
    `Linked to ${ACCOUNT.name} via active S-Docs license`,
    'Creating case and attaching context',
    'Routing to a support engineer'
  ];
  const back = openModal(`
    <h2>Submitting your case</h2>
    <p class="modal-sub">Creating the case and linking it to your account &mdash; no manual triage needed.</p>
    <div class="progress"><div class="progress-fill" id="pf"></div></div>
    <ul class="submit-log" id="slog"></ul>`, { sticky:true });

  let n = 0;
  const tick = () => {
    const log = $('#slog', back);
    if (n > 0) {
      const prev = log.children[n - 1];
      if (prev) prev.querySelector('.spinner')?.replaceWith(Object.assign(document.createElement('span'), {
        className:'tick', innerHTML:'<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>'
      }));
    }
    if (n >= steps.length) { setTimeout(() => { closeModal(); finalizeCase(); }, 380); return; }
    const li = document.createElement('li');
    li.innerHTML = `<span class="spinner"></span><b>${esc(steps[n])}</b>`;
    log.appendChild(li);
    $('#pf', back).style.width = Math.round(((n + 1) / steps.length) * 100) + '%';
    n++;
    setTimeout(tick, 520);
  };
  tick();
}

function finalizeCase() {
  const d = S.draft, t = typeByKey(d.type);
  const num = 'CS-' + (CASE_SEQ++);
  const now = 'Sep 4, 2026 10:12 AM';
  const c = {
    id:'c' + Date.now(), num, subject:d.subject, type:d.type, priority:d.priority,
    status:'new', instance:S.instanceKey, requester:S.personaId, assignee:null,
    created:now, updated:now, unread:false, collaborators:[...d.collaborators], gla:d.gla,
    ctx:{ templates:[...d.templates], records:[...d.records], users:[...d.users] },
    fields:{ errortext:d.errortext, steps:d.steps, expected:d.expected, actual:d.actual,
             stage:d.stage, envelope:d.envelope, targetver:d.targetver, installerr:d.installerr },
    attachments:[...d.attachments], description:d.description,
    timeline:[{ kind:'created', who:{ type:'user', id:S.personaId }, when:now }]
  };
  if (d.collaborators.length) {
    c.timeline.push({ kind:'status', when:now,
      text:`<b>${d.collaborators.map(id => esc(userById(id).name)).join(', ')}</b> added as collaborator${d.collaborators.length > 1 ? 's' : ''} and notified.` });
  }
  c.timeline.push({ kind:'status', when:now, text:`Case created and matched to <b>${esc(ACCOUNT.name)}</b> automatically. Routing to a support engineer.` });
  S.cases.unshift(c);
  S.openCaseId = c.id;
  S.wizStep = 4;
  renderWizSteps();
  [1,2,3,4].forEach(k => $('#wstep-' + k).hidden = k !== 4);
  $('#wiz-title').textContent = 'Case submitted';

  const i = inst();
  $('#success-card').innerHTML = `
    <div class="sc-ring">${ico(I.check, 26, 3)}</div>
    <h2>Case created</h2>
    <div class="sc-num">${esc(num)}</div>
    <p>We have your org, your environment, your templates and your records. No one has to email you to ask what &ldquo;broken&rdquo; means.</p>
    <div class="sc-facts">
      <div class="sc-fact"><label>Account matched</label><b>${esc(ACCOUNT.name)}</b></div>
      <div class="sc-fact"><label>Org</label><b>${esc(i.orgName)}</b></div>
      <div class="sc-fact"><label>Priority</label><b>${esc(d.priority)}</b></div>
      <div class="sc-fact"><label>Notified</label><b>${d.collaborators.length ? 'You + ' + d.collaborators.length : 'You'}</b></div>
    </div>
    ${d.gla && !i.gov ? `<div class="banner banner-warn" style="text-align:left;margin:20px auto 0;max-width:620px">
      <span class="banner-ico">${ico(I.alert, 15)}</span>
      <div class="banner-body"><b>One thing left for you.</b> You chose to grant login access. Open <b>Settings &rarr; Personal Information &rarr; Grant Account Login Access</b> and set <b>S-Docs Support</b> to 3 days. We&rsquo;ll remind you on the case if it isn&rsquo;t granted within an hour.</div>
    </div>` : ''}
    <div class="sc-actions">
      <button class="btn btn-neutral" data-nav="list">Back to cases</button>
      <button class="btn btn-brand" id="sc-open">Open ${esc(num)}</button>
    </div>`;
  $('#sc-open').onclick = () => openCase(c.id);
  $$('#success-card [data-nav="list"]').forEach(b => b.onclick = () => renderList());
  toast('success', `<b>${esc(num)} created.</b> Support has your full context.`);
  window.scrollTo({ top: 0, behavior:'smooth' });
}

/* =========================================================
   VIEW: CASE DETAIL
   ========================================================= */
function openCase(id) {
  S.openCaseId = id;
  S.composerOpen = false;
  const c = caseById(id);
  if (c) c.unread = false;
  renderCase();
  setView('case');
  window.scrollTo({ top: 0, behavior:'smooth' });
}

function renderCase() {
  const c = caseById(S.openCaseId);
  if (!c) return renderList();
  const t = typeByKey(c.type), i = INSTANCES[c.instance];

  /* header */
  $('#case-head').innerHTML = `
    <div class="case-topbar">
      <div class="ct-row1">
        <span class="ct-num">${esc(c.num)}</span>
        <span class="badge ${STATUS[c.status].cls}">${STATUS[c.status].label}</span>
        <span class="prio ${prioCls(c.priority)}"><i></i>${esc(c.priority)} priority</span>
        <span class="tbadge">${esc(t.label)}</span>
        <span class="env-tag" style="margin-left:auto"><i class="env-dot ${i.dotClass}"></i>${esc(i.orgName)}</span>
      </div>
      <div class="ct-row2">
        <h1>${esc(c.subject)}</h1>
        <div class="ct-actions">
          ${isOpen(c) ? `<button class="btn btn-neutral" id="btn-call">${ico(I.phone, 13)} Request a call</button>` : ''}
          <button class="btn btn-neutral" id="btn-email-preview">${ico('<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="3 6 12 13 21 6"/>', 13)} Notification preview</button>
          ${isOpen(c)
            ? `<button class="btn btn-danger" id="btn-close-case">Close case</button>`
            : `<button class="btn btn-neutral" id="btn-reopen">Reopen case</button>`}
        </div>
      </div>
    </div>`;
  $('#btn-call') && ($('#btn-call').onclick = () => requestCallModal(c));
  $('#btn-email-preview').onclick = () => emailPreview(c);
  $('#btn-close-case') && ($('#btn-close-case').onclick = () => closeCaseFlow(c));
  $('#btn-reopen') && ($('#btn-reopen').onclick = () => reopenCase(c));

  /* alert */
  const ask = [...c.timeline].reverse().find(e => e.kind === 'info_request');
  $('#case-alert').innerHTML = (c.status === 'awaiting' && ask) ? `
    <div class="banner banner-warn">
      <span class="banner-ico">${ico(I.alert, 15)}</span>
      <div class="banner-body">
        <b>Support is waiting on you.</b> ${esc(SUPPORT[ask.who.id].name)} asked for ${ask.items.length} specific thing${ask.items.length > 1 ? 's' : ''} on ${esc(ask.when)}. This case doesn&rsquo;t move until you reply.
        <div class="banner-act"><button class="link-btn" id="jump-reply">Reply now</button></div>
      </div>
    </div>` : '';
  $('#jump-reply') && ($('#jump-reply').onclick = () => { S.composerOpen = true; renderCase(); setTimeout(() => $('#comp-text')?.focus(), 60); });

  /* timeline */
  $('#timeline-sub').innerHTML = `${c.timeline.length} update${c.timeline.length === 1 ? '' : 's'} &middot; opened ${esc(c.created)} &middot; internal support notes are never shown here`;
  $('#btn-toggle-order').textContent = S.timelineDesc ? 'Oldest first' : 'Newest first';
  $('#btn-toggle-order').onclick = () => { S.timelineDesc = !S.timelineDesc; renderCase(); };

  const entries = S.timelineDesc ? [...c.timeline].reverse() : c.timeline;
  $('#timeline').innerHTML = entries.map(e => renderTimelineEntry(e, c)).join('');
  $$('#timeline .ask-reply').forEach(b => b.onclick = () => {
    S.composerOpen = true; renderCase(); setTimeout(() => $('#comp-text')?.focus(), 60);
  });
  $$('#timeline .tl-att').forEach(b => b.onclick = () =>
    toast('info', 'Prototype: attachments are not downloadable here.', 2600));

  renderComposer(c);
  renderRail(c);
}

function renderTimelineEntry(e, c) {
  const wrap = (dotCls, dotIco, head, body) =>
    `<div class="tl-item"><span class="tl-dot ${dotCls}">${ico(dotIco, 12, 2.4)}</span>
      <div class="tl-when">${esc(e.when)}</div>${head}${body}</div>`;

  if (e.kind === 'created') {
    const u = userById(e.who.id), i = INSTANCES[c.instance];
    const tplNames = (c.ctx.templates || []).map(id => (TEMPLATES.find(x => x.id === id) || {}).name).filter(Boolean);
    const recNames = (c.ctx.records || []).map(id => (RECORDS.find(x => x.id === id) || {}).name).filter(Boolean);
    const affected = (c.ctx.users || []).map(id => userById(id).name);
    const f = c.fields || {};
    const bits = [
      ['Org', `${esc(i.orgName)} · ${esc(i.instance)}`],
      ['Environment', `${esc(i.env)} · ${esc(i.compliance)}`],
      ['S-Docs version', esc(i.pkg)],
      ['Login access', i.gov ? 'N/A — ' + esc(i.compliance) : (c.gla ? 'Granted' : 'Not granted')],
      tplNames.length ? ['Templates', tplNames.map(esc).join(', ')] : null,
      recNames.length ? ['Example records', recNames.map(esc).join(', ')] : null,
      affected.length ? ['Affected users', affected.map(esc).join(', ')] : null,
      f.stage ? ['Breaks at', esc(f.stage)] : null,
      f.targetver ? ['Target version', esc(f.targetver)] : null
    ].filter(Boolean);

    const detailBlocks = [
      c.description ? `<p>${esc(c.description)}</p>` : '',
      f.errortext ? `<p><b>Error:</b><br><span style="font-family:var(--mono);font-size:11.5px">${esc(f.errortext)}</span></p>` : '',
      f.expected ? `<p><b>Expected:</b> ${esc(f.expected)}<br><b>Actual:</b> ${esc(f.actual || '')}</p>` : '',
      f.installerr ? `<p><b>Install error:</b><br><span style="font-family:var(--mono);font-size:11.5px">${esc(f.installerr)}</span></p>` : '',
      f.steps ? `<p><b>Steps to reproduce:</b><br>${esc(f.steps).replace(/\n/g, '<br>')}</p>` : ''
    ].join('');

    return wrap('brand', I.plus,
      `<div class="tl-who">${esc(u.name)} <span class="who-pill you">Raised the case</span></div>`,
      `<div class="tl-bubble you">
        ${detailBlocks || '<p class="tl-sys">Case submitted.</p>'}
        <div class="ctx-snapshot">${bits.map(([k, v]) => `<div><label>${k}</label><b>${v}</b></div>`).join('')}</div>
        ${(c.attachments || []).length ? `<div class="tl-attach">${c.attachments.map(a =>
          `<button class="tl-att">${ico(a.kind === 'vid' ? I.vid : I.file, 12)} ${esc(a.name)}</button>`).join('')}</div>` : ''}
      </div>`);
  }

  if (e.kind === 'support_reply' || e.kind === 'resolved') {
    const s = SUPPORT[e.who.id];
    return wrap(e.kind === 'resolved' ? 'green' : 'brand', e.kind === 'resolved' ? I.check : I.msg,
      `<div class="tl-who">${esc(s.name)} <span class="who-pill support">S-Docs Support &middot; ${esc(s.title)}</span></div>`,
      `<div class="tl-bubble support"><p>${esc(e.body)}</p></div>`);
  }

  if (e.kind === 'customer_reply' || e.kind === 'call_request') {
    const u = userById(e.who.id);
    const isCall = e.kind === 'call_request';
    return wrap(isCall ? 'violet' : 'grey', isCall ? I.phone : I.msg,
      `<div class="tl-who">${esc(u.name)} <span class="who-pill ${e.who.id === S.personaId ? 'you' : 'collab'}">${e.who.id === S.personaId ? 'You' : esc(u.title)}</span>${isCall ? ' <span class="who-pill">Requested a live session</span>' : ''}</div>`,
      `<div class="tl-bubble ${e.who.id === S.personaId ? 'you' : ''}"><p>${esc(e.body)}</p></div>`);
  }

  if (e.kind === 'info_request') {
    const s = SUPPORT[e.who.id];
    return wrap('amber', I.alert,
      `<div class="tl-who">${esc(s.name)} <span class="who-pill support">S-Docs Support</span></div>`,
      `<div class="tl-bubble ask">
        <div class="ask-title">${ico(I.alert, 13)} Support needs information from you</div>
        <p style="color:#6b4400;margin-bottom:7px">${esc(e.body)}</p>
        <ol class="ask-list">${e.items.map(x => `<li>${x}</li>`).join('')}</ol>
        <div class="ask-act"><button class="btn btn-brand btn-xs ask-reply">Reply with this information</button></div>
      </div>`);
  }

  return wrap('grey', I.info, '', `<div class="tl-sys">${e.text || esc(e.body || '')}</div>`);
}

function renderComposer(c) {
  const host = $('#composer');
  if (!isOpen(c)) {
    host.innerHTML = `<div class="closed-note">
      This case is <b>${STATUS[c.status].label.toLowerCase()}</b>. Replies are closed, but the full history stays here.
      ${c.status === 'resolved' ? 'If the problem comes back, reopen it and we pick up with all of this context intact.' : ''}
    </div>`;
    return;
  }
  const notified = [userById(c.requester).name].concat((c.collaborators || []).map(id => userById(id).name));
  if (!S.composerOpen) {
    host.innerHTML = `<div class="comp-collapsed">
        <button class="btn btn-brand" id="open-comp">${ico(I.msg, 13)} Post a reply</button>
        <span class="comp-note">Deliberately not a chat. Take your time &mdash; write one considered update, and everyone on the case sees it at once.</span>
      </div>`;
    $('#open-comp').onclick = () => { S.composerOpen = true; renderCase(); setTimeout(() => $('#comp-text')?.focus(), 50); };
    return;
  }
  host.innerHTML = `<div class="comp-open">
      <textarea id="comp-text" rows="5" placeholder="Answer support's questions, or add what changed since you opened the case..."></textarea>
      <div class="comp-vis">${ico(I.people, 13)} Visible to S-Docs Support and ${notified.length} ${notified.length === 1 ? 'person' : 'people'} on this case: <b>${notified.map(esc).join(', ')}</b>. Internal support notes are never shown to you, and yours are never public.</div>
      <div class="comp-bar">
        <button class="btn btn-neutral btn-xs" id="comp-attach">${ico(I.file, 12)} Attach</button>
        <span class="comp-note">Support is notified immediately. Email you get is a pointer back here &mdash; replies to it go nowhere.</span>
        <button class="btn btn-neutral" id="comp-cancel">Cancel</button>
        <button class="btn btn-brand" id="comp-send">Post reply</button>
      </div>
    </div>`;
  $('#comp-cancel').onclick = () => { S.composerOpen = false; renderCase(); };
  $('#comp-attach').onclick = () => toast('info', 'Prototype: file pickers are stubbed on the case timeline.', 2600);
  $('#comp-send').onclick = () => {
    const text = $('#comp-text').value.trim();
    if (text.length < 4) { toast('error', 'Write a reply first.'); return; }
    c.timeline.push({ kind:'customer_reply', who:{ type:'user', id:S.personaId }, when:'Sep 4, 2026 10:18 AM', body:text });
    c.updated = 'Sep 4, 2026 10:18 AM';
    if (c.status === 'awaiting') {
      c.status = 'support';
      c.timeline.push({ kind:'status', when:'Sep 4, 2026 10:18 AM',
        text:`Status moved to <b>With support</b>. ${esc(SUPPORT[c.assignee || 's2'].name)} notified.` });
    }
    S.composerOpen = false;
    renderCase();
    toast('success', '<b>Reply posted.</b> Support and your collaborators were notified.');
  };
}

function renderRail(c) {
  const i = INSTANCES[c.instance], t = typeByKey(c.type);
  const assignee = c.assignee ? SUPPORT[c.assignee] : null;
  const tplNames = (c.ctx.templates || []).map(id => (TEMPLATES.find(x => x.id === id) || {}).name).filter(Boolean);
  const recs = (c.ctx.records || []).map(id => RECORDS.find(x => x.id === id)).filter(Boolean);
  const affected = (c.ctx.users || []).map(id => userById(id));

  const railRow = (label, value, cls = '') => `<div class="rail-row"><label>${label}</label><div class="rv ${cls}">${value}</div></div>`;

  $('#case-rail').innerHTML = `
    <div class="rail-card">
      <div class="rail-head">${ico(I.info, 12)} Case details</div>
      <div class="rail-body">
        ${railRow('Status', `<span class="badge ${STATUS[c.status].cls}">${STATUS[c.status].label}</span>`)}
        ${railRow('Priority', `<span class="prio ${prioCls(c.priority)}"><i></i>${esc(c.priority)}</span>`)}
        ${railRow('Issue type', esc(t.label))}
        ${railRow('Support engineer', assignee
          ? `<div class="person">${avatarHtml(assignee.name, assignee.color)}<span class="person-body"><b>${esc(assignee.name)}</b><span>${esc(assignee.title)}</span></span></div>`
          : '<span class="rail-empty">Being routed now</span>')}
        ${railRow('Opened', esc(c.created))}
        ${railRow('Last update', esc(c.updated))}
      </div>
    </div>

    <div class="rail-card">
      <div class="rail-head">${ico(I.check, 12)} Context captured <span class="rail-act" style="color:var(--teal);font-weight:600">auto</span></div>
      <div class="rail-body">
        ${railRow('Organization', esc(i.orgName))}
        ${railRow('Org Id', esc(i.orgId), 'mono')}
        ${railRow('Instance', `${esc(i.instance)} &middot; ${esc(i.env)}`)}
        ${railRow('Compliance', esc(i.compliance))}
        ${railRow('S-Docs package', esc(i.pkg))}
        ${railRow('Login access', i.gov
          ? `<span class="rail-empty">Not applicable &mdash; ${esc(i.compliance)}</span>`
          : (c.gla ? 'Granted &middot; expires in 3 days' : '<span class="rail-empty">Not granted</span>'))}
      </div>
    </div>

    <div class="rail-card">
      <div class="rail-head">${ico(I.file, 12)} What it affects</div>
      <div class="rail-body">
        <div class="rail-row"><label>Templates</label>
          ${tplNames.length ? `<div class="rail-chips">${tplNames.map(n => `<span class="rail-chip">${esc(n)}</span>`).join('')}</div>` : '<div class="rail-empty">None specified</div>'}</div>
        <div class="rail-row"><label>Example records</label>
          ${recs.length ? `<div class="rail-chips">${recs.map(r => `<span class="rail-chip">${esc(r.name)}</span>`).join('')}</div>` : '<div class="rail-empty">None specified</div>'}</div>
        <div class="rail-row"><label>Affected users</label>
          ${affected.length ? `<div class="rail-list">${affected.map(u =>
            `<div class="person">${avatarHtml(u.name, u.color)}<span class="person-body"><b>${esc(u.name)}</b><span>${esc(u.title)}</span></span></div>`).join('')}</div>`
            : '<div class="rail-empty">None specified</div>'}</div>
      </div>
    </div>

    <div class="rail-card">
      <div class="rail-head">${ico(I.people, 12)} Collaborators
        ${isOpen(c) ? '<button class="link-btn rail-act" id="rail-add-collab">Add</button>' : ''}</div>
      <div class="rail-body">
        <div class="rail-list">
          <div class="person">${avatarHtml(userById(c.requester).name, userById(c.requester).color)}
            <span class="person-body"><b>${esc(userById(c.requester).name)}</b><span>Reporter</span></span></div>
          ${(c.collaborators || []).map(id => { const u = userById(id);
            return `<div class="person">${avatarHtml(u.name, u.color)}<span class="person-body"><b>${esc(u.name)}</b><span>${esc(u.title)}</span></span></div>`; }).join('')}
        </div>
        ${(c.collaborators || []).length ? '' : '<div class="rail-empty">No one else is following this case.</div>'}
      </div>
    </div>

    ${(c.attachments || []).length ? `<div class="rail-card">
      <div class="rail-head">${ico(I.file, 12)} Attachments</div>
      <div class="rail-body"><div class="rail-list">
        ${c.attachments.map(a => `<div class="attach-item" style="border:0;padding:4px 0">
          <span class="att-ico ${a.kind === 'vid' ? 'vid' : ''}">${ico(a.kind === 'vid' ? I.vid : I.file, 14)}</span>
          <span class="att-meta"><b>${esc(a.name)}</b><span>${esc(a.size)}</span></span></div>`).join('')}
      </div></div>
    </div>` : ''}`;

  $('#rail-add-collab') && ($('#rail-add-collab').onclick = () => addCollaboratorModal(c));
}

/* ---------- case actions ---------- */
function addCollaboratorModal(c) {
  const candidates = USERS.filter(u => u.id !== c.requester && !(c.collaborators || []).includes(u.id));
  const back = openModal(`
    <h2>Add collaborators</h2>
    <p class="modal-sub">They see every update on ${esc(c.num)} and get notified. They can reply too &mdash; so the case doesn&rsquo;t stall when you&rsquo;re out.</p>
    <div class="rail-list">${candidates.map(u => `
      <label class="person" style="cursor:pointer">
        <input type="checkbox" value="${u.id}" style="width:15px;height:15px;accent-color:var(--brand)">
        ${avatarHtml(u.name, u.color)}
        <span class="person-body"><b>${esc(u.name)}</b><span>${esc(u.title)} &middot; ${esc(u.email)}</span></span>
      </label>`).join('')}</div>
    <div class="modal-actions">
      <button class="btn btn-neutral" data-x>Cancel</button>
      <button class="btn btn-brand" id="ac-save">Add and notify</button>
    </div>`);
  $('[data-x]', back).onclick = closeModal;
  $('#ac-save', back).onclick = () => {
    const picked = $$('input:checked', back).map(i => i.value);
    if (!picked.length) { toast('error', 'Pick at least one person.'); return; }
    c.collaborators = (c.collaborators || []).concat(picked);
    c.timeline.push({ kind:'status', when:'Sep 4, 2026 10:20 AM',
      text:`<b>${picked.map(id => esc(userById(id).name)).join(', ')}</b> added as collaborator${picked.length > 1 ? 's' : ''} by ${esc(me().name)} and notified.` });
    c.updated = 'Sep 4, 2026 10:20 AM';
    closeModal(); renderCase();
    toast('success', `<b>${picked.length} collaborator${picked.length > 1 ? 's' : ''} added.</b> They were notified with a link back to this case.`);
  };
}

function requestCallModal(c) {
  const back = openModal(`
    <h2>Request a live session</h2>
    <p class="modal-sub">For when writing it down isn&rsquo;t moving fast enough. A senior engineer picks this up and reaches out to arrange a time &mdash; the request and their reply both land on ${esc(c.num)}, so nothing happens off to the side.</p>
    <div class="field" style="margin-bottom:14px">
      <label for="rc-why">Why does this need a call? <b class="req">*</b></label>
      <textarea id="rc-why" rows="3" placeholder="What's blocked, and what's the deadline"></textarea>
    </div>
    <div class="field">
      <label for="rc-when">When are you generally available?</label>
      <p class="field-hint">Rough windows are fine &mdash; we&rsquo;ll come back with specific times.</p>
      <input type="text" id="rc-when" placeholder="Weekday mornings ET, or after 2pm ET Thursday">
    </div>
    <div class="banner banner-info" style="margin:16px 0 0">
      <span class="banner-ico">${ico(I.clock, 15)}</span>
      <div class="banner-body">This does not change your case priority on its own. If production is down, set the priority to <b>Critical</b> as well.</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-neutral" data-x>Cancel</button>
      <button class="btn btn-brand" id="rc-send">Request session</button>
    </div>`);
  $('[data-x]', back).onclick = closeModal;
  $('#rc-send', back).onclick = () => {
    const why = $('#rc-why', back).value.trim();
    const when = $('#rc-when', back).value.trim();
    if (why.length < 8) { toast('error', 'Tell us briefly why a call is needed.'); return; }
    c.timeline.push({ kind:'call_request', who:{ type:'user', id:S.personaId }, when:'Sep 4, 2026 10:24 AM',
      body: why + (when ? `\n\nAvailability: ${when}` : '') });
    c.timeline.push({ kind:'status', when:'Sep 4, 2026 10:24 AM',
      text:`Live session requested. A senior support engineer will reach out on this case to arrange a time.` });
    c.updated = 'Sep 4, 2026 10:24 AM';
    closeModal(); renderCase();
    toast('success', '<b>Session requested.</b> A senior engineer will follow up on this case.');
  };
}

function closeCaseFlow(c) {
  const back = openModal(`
    <h2>Close ${esc(c.num)}?</h2>
    <p class="modal-sub">Closing tells support you don&rsquo;t need anything further. You can reopen it later and everything &mdash; context, timeline, attachments &mdash; comes back with it.</p>
    <div class="field">
      <label for="cc-why">Anything we should know? <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
      <textarea id="cc-why" rows="3" placeholder="e.g. we found the cause on our side"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-neutral" data-x>Keep it open</button>
      <button class="btn btn-danger" id="cc-go">Close case</button>
    </div>`);
  $('[data-x]', back).onclick = closeModal;
  $('#cc-go', back).onclick = () => {
    const why = $('#cc-why', back).value.trim();
    if (why) c.timeline.push({ kind:'customer_reply', who:{ type:'user', id:S.personaId }, when:'Sep 4, 2026 10:28 AM', body:why });
    c.timeline.push({ kind:'status', when:'Sep 4, 2026 10:28 AM', text:`Case <b>closed</b> by ${esc(me().name)}.` });
    c.status = 'closed'; c.updated = 'Sep 4, 2026 10:28 AM';
    closeModal(); renderCase();
    toast('success', `<b>${esc(c.num)} closed.</b>`);
  };
}

function reopenCase(c) {
  c.status = 'support';
  c.updated = 'Sep 4, 2026 10:30 AM';
  c.timeline.push({ kind:'status', when:'Sep 4, 2026 10:30 AM',
    text:`Case <b>reopened</b> by ${esc(me().name)}. All original context is still attached &mdash; nothing to re-explain.` });
  renderCase();
  toast('success', `<b>${esc(c.num)} reopened.</b> Support was notified.`);
}

/* ---------- notification email preview ---------- */
function emailPreview(c) {
  const target = c || S.cases.find(x => x.status === 'awaiting') || S.cases[0];
  const last = [...target.timeline].reverse().find(e => ['support_reply','info_request','resolved'].includes(e.kind));
  const who = last ? SUPPORT[last.who.id] : SUPPORT.s2;
  const blurbFull = last ? (last.body + (last.items ? '\n\n' + last.items.map(i => '• ' + i.replace(/<[^>]+>/g, '')).join('\n') : '')) : 'Support posted an update on your case.';
  const blurb = blurbFull.length > 260 ? blurbFull.slice(0, 260).trim() + '…' : blurbFull;
  const recips = [userById(target.requester)].concat((target.collaborators || []).map(id => userById(id)));

  openModal(`
    <h2>What the notification looks like</h2>
    <p class="modal-sub">Email becomes a pointer, not a channel. Enough to know something happened, not enough to reply in &mdash; which is how the thread stays on the case instead of scattering across inboxes.</p>
    <div class="email-mock">
      <div class="em-head">
        <div class="em-row"><span class="emk">From</span><span>S-Docs Support &lt;no-reply@s-docs.com&gt;</span></div>
        <div class="em-row"><span class="emk">To</span><span>${recips.map(r => esc(r.email)).join(', ')}</span></div>
        <div class="em-row"><span class="emk">Subject</span><span><b>[${esc(target.num)}] ${esc(who.name)} posted an update</b></span></div>
      </div>
      <div class="em-body">
        <div class="em-logo">S&#8209;Docs Support</div>
        <p><b>${esc(who.name)}</b> (${esc(who.title)}) posted an update on <b>${esc(target.num)}</b> &mdash; ${esc(target.subject)}.</p>
        <div class="em-quote">${esc(blurb).replace(/\n/g, '<br>')}</div>
        <a class="em-cta" href="#" onclick="return false">View and reply in Salesforce</a>
        <p style="font-size:11.5px;color:#5c5c5c">Opens the S-Docs Support tab in <b>${esc(INSTANCES[target.instance].orgName)}</b>, on this case.</p>
        <div class="em-foot">
          You&rsquo;re receiving this because you ${target.requester === S.personaId ? 'raised' : 'are a collaborator on'} this case.<br>
          <b>Replies to this address are not monitored.</b> Post your reply on the case so support, you, and your collaborators all see the same thread.
        </div>
      </div>
    </div>
    <div class="modal-actions"><button class="btn btn-neutral" data-x>Close</button></div>`, { wide:true });
  $('#modal-host [data-x]').onclick = closeModal;
}

/* =========================================================
   VIEW ROUTER + CHROME
   ========================================================= */
function setView(v) {
  S.view = v;
  $('#view-list').hidden = v !== 'list';
  $('#view-new').hidden  = v !== 'new';
  $('#view-case').hidden = v !== 'case';
}

function renderChrome() {
  const i = inst(), u = me();
  $('#org-pill').className = 'org-pill ' + i.pillClass;
  $('#org-pill-label').textContent = i.env === 'Sandbox' ? 'Sandbox' : (i.gov ? i.compliance : 'Production');
  $('#gh-avatar').textContent = u.name.split(' ').map(p => p[0]).join('').slice(0,2);
  $('#gh-avatar').style.background = u.color;
}

/* =========================================================
   DEMO BAR
   ========================================================= */
function renderDemo() {
  $('#demo-persona').innerHTML = [
    { id:'u1', label:'Anand · Admin' },
    { id:'u3', label:'Priya · Standard user' }
  ].map(p => `<button class="demo-chip ${S.personaId === p.id ? 'active' : ''}" data-persona="${p.id}">${p.label}</button>`).join('');
  $$('#demo-persona .demo-chip').forEach(b => b.onclick = () => {
    S.personaId = b.dataset.persona;
    if (!isAdmin()) S.scope = 'mine';
    renderChrome(); renderDemo(); renderList();
    toast('info', `Signed in as <b>${esc(me().name)}</b> &middot; ${esc(me().role)}`, 2800);
  });

  $('#demo-instance').innerHTML = Object.values(INSTANCES).map(i =>
    `<button class="demo-chip ${S.instanceKey === i.key ? 'active' : ''}" data-inst="${i.key}">${
      i.key === 'prod' ? 'Production' : i.key === 'sandbox' ? 'Sandbox' : i.key === 'gov' ? 'Gov Cloud' : 'Gov Cloud +'}</button>`).join('');
  $$('#demo-instance .demo-chip').forEach(b => b.onclick = () => {
    S.instanceKey = b.dataset.inst;
    renderChrome(); renderDemo();
    if (S.view === 'new' && S.wizStep === 2) renderDetails();
    if (S.view === 'list') renderList();
  });
  const i = inst();
  $('#demo-instance-note').innerHTML = i.gov
    ? `Instance <b>${esc(i.instance)}</b> is a <b>${esc(i.compliance)}</b> org &mdash; the intake form suppresses the grant-login-access ask entirely.`
    : `Instance <b>${esc(i.instance)}</b>, <b>${esc(i.env)}</b>, S-Docs <b>${esc(i.pkg)}</b> &mdash; all passed in from the org.`;

  $('#demo-jump').innerHTML = `
    <button class="demo-chip" data-jump="awaiting">Case awaiting your reply</button>
    <button class="demo-chip" data-jump="escalated">Escalated + call requested</button>
    <button class="demo-chip" data-jump="new">New case form</button>
    <button class="demo-chip" data-jump="email">Notification email</button>`;
  $$('#demo-jump .demo-chip').forEach(b => b.onclick = () => {
    const j = b.dataset.jump;
    if (j === 'awaiting')  { const c = S.cases.find(x => x.status === 'awaiting'); c ? openCase(c.id) : toast('warning', 'No case is awaiting a reply.'); }
    if (j === 'escalated') { const c = S.cases.find(x => x.status === 'escalated'); c ? openCase(c.id) : toast('warning', 'No escalated case.'); }
    if (j === 'new')       startNewCase();
    if (j === 'email')     emailPreview(null);
  });
}

/* =========================================================
   WIRING
   ========================================================= */
function wire() {
  // nav dropdown
  $('#tab-caret').onclick = () => {
    const dd = $('#nav-dropdown'), open = !dd.hidden;
    dd.hidden = open; $('#nav-scrim').hidden = open;
    $('#tab-caret').classList.toggle('open', !open);
  };
  $('#nav-scrim').onclick = () => {
    $('#nav-dropdown').hidden = true; $('#nav-scrim').hidden = true;
    $('#tab-caret').classList.remove('open');
  };
  $$('#nav-dropdown .nd-item').forEach(li => li.onclick = () => {
    $('#nav-dropdown').hidden = true; $('#nav-scrim').hidden = true; $('#tab-caret').classList.remove('open');
    if (!li.classList.contains('is-current')) toast('info', 'Prototype: only the <b>S-Docs Support</b> tab is built out.', 2800);
  });

  $('#btn-new-case').onclick = startNewCase;
  $('#btn-preview-email').onclick = () => emailPreview(null);
  $('#sf-bell').onclick = () => {
    const c = S.cases.find(x => x.unread) || S.cases.find(x => x.status === 'awaiting');
    c ? openCase(c.id) : toast('info', 'No unread case updates.', 2400);
  };

  $$('[data-nav="list"]').forEach(b => b.onclick = () => renderList());
  $$('[data-wiz="back"]').forEach(b => b.onclick = () => { S.wizStep = 1; renderWizard(); });
  $$('[data-wiz="back-2"]').forEach(b => b.onclick = () => { S.wizStep = 2; renderWizard(); });
  $$('[data-wiz="review"]').forEach(b => b.onclick = () => {
    if (!validateDetails()) return;
    S.wizStep = 3; renderWizard(); window.scrollTo({ top: 0, behavior:'smooth' });
  });
  $('#btn-submit-case').onclick = submitCase;

  // search
  let sT;
  $('#case-search').oninput = e => {
    clearTimeout(sT); const v = e.target.value;
    sT = setTimeout(() => { S.search = v; renderList(); $('#case-search').focus(); }, 200);
  };

  // dropzone
  const dz = $('#dropzone');
  dz.onclick = addFakeFile;
  dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addFakeFile(); } };
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', addFakeFile);

  $('#btn-add-link').onclick = () => {
    const v = $('#f-loom').value.trim();
    if (!/^https?:\/\//i.test(v)) { toast('error', 'Paste a full https:// recording link.'); return; }
    const isLoom = /loom\.com/i.test(v), isJam = /jam\.dev/i.test(v);
    S.draft.attachments.push({
      name: isLoom ? 'Loom — screen recording' : isJam ? 'Jam.dev — bug report' : 'Recording link',
      kind:'vid', size: v.length > 46 ? v.slice(0, 46) + '…' : v
    });
    $('#f-loom').value = '';
    renderAttachments();
    toast('success', 'Recording link attached.', 2400);
  };

  // demo bar
  $('#demo-toggle').onclick = () => $('#demo-bar').classList.toggle('collapsed');
  $('#demo-reset').onclick = () => {
    S = initialState(); CASE_SEQ = 10431;
    renderChrome(); renderDemo(); renderList();
    toast('info', 'Prototype reset.', 2200);
  };

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ---------- boot ---------- */
S.draft = newDraft();
wire();
renderChrome();
renderDemo();
renderList();
