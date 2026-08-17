// Mock data for the agent-end-user prototype — an internal agent catalogue and
// a lightweight "run it" experience for people who aren't the ones building
// agents. Everything is static/seeded; no real agents run here.

const CURRENT_USER = { name: 'Anand Narasimhan', initials: 'AN', teamId: 'claims-ops', hasCreatorAccess: false };

const TEAMS = {
  'claims-ops': 'Claims Ops',
  'deal-desk': 'Deal Desk',
};

const TASK_TYPE_META = {
  extract: { label: 'Extract', color: '#0176d3' },
  generate: { label: 'Generate', color: '#7d3ac1' },
  analyze: { label: 'Analyze', color: '#b8860b' },
  save: { label: 'Save', color: '#2e7d32' },
  notify: { label: 'Notify', color: '#c62828' },
};

const AGENTS = [
  {
    id: 'a1',
    name: 'Claims Intake Agent',
    description: 'Reads incoming claim forms, extracts the details, checks them against policy, and saves approved claims to Salesforce.',
    creator: 'Priya Shah',
    creatorIsCurrentUser: false,
    teamId: 'claims-ops',
    visibility: 'Enterprise',
    taskTypes: ['extract', 'analyze', 'save', 'notify'],
    runsCount: 482,
  },
  {
    id: 'a2',
    name: 'Renewal Deal Extractor',
    description: 'Extracts renewal terms from signed contracts and files them to Salesforce.',
    creator: 'Marcus Webb',
    creatorIsCurrentUser: false,
    teamId: 'deal-desk',
    visibility: 'Enterprise',
    taskTypes: ['extract', 'save', 'notify'],
    runsCount: 371,
  },
  {
    id: 'a3',
    name: 'Expense Approval Bot',
    description: 'Extracts expense report line items and checks them against spend thresholds.',
    creator: 'Marcus Webb',
    creatorIsCurrentUser: false,
    teamId: 'deal-desk',
    visibility: 'Enterprise',
    taskTypes: ['extract', 'analyze', 'save'],
    runsCount: 58,
  },
  {
    id: 'a4',
    name: 'Weekly Pipeline Summarizer',
    description: 'Generates a weekly summary of the renewal pipeline and posts it to Slack every Monday.',
    creator: 'Priya Shah',
    creatorIsCurrentUser: false,
    teamId: 'claims-ops',
    visibility: 'Team',
    taskTypes: ['generate', 'notify'],
    runsCount: 96,
  },
  {
    id: 'a5',
    name: 'Contract Risk Reviewer',
    description: 'Analyzes contracts against our legal playbook and routes exceptions for review.',
    creator: 'Anand Narasimhan',
    creatorIsCurrentUser: true,
    teamId: 'claims-ops',
    visibility: 'Private',
    taskTypes: ['analyze', 'notify'],
    runsCount: 12,
  },
  {
    id: 'a6',
    name: 'Vendor Onboarding Assistant',
    description: 'Collects vendor intake documents and checks them against our compliance checklist.',
    creator: 'Anand Narasimhan',
    creatorIsCurrentUser: true,
    teamId: 'claims-ops',
    visibility: 'Team',
    taskTypes: ['extract', 'analyze', 'notify'],
    runsCount: 4,
  },
];

const RUN_STEPS_BY_AGENT = {
  a1: ['Reading claim_09912.pdf', 'Extracting claim fields', 'Validating against policy'],
  a2: ['Reading Acme_Renewal_2026.pdf', 'Extracting renewal terms', 'Saving to Salesforce'],
  a3: ['Reading expense_report.csv', 'Checking against spend thresholds', 'Saving approved rows'],
  a4: ['Gathering pipeline data', 'Drafting summary', 'Posting to Slack'],
  a5: ['Reading contract.pdf', 'Checking against legal playbook', 'Scoring risk'],
  a6: ['Reading vendor intake form', 'Checking compliance checklist', 'Flagging exceptions'],
};

const RUN_RESULT_BY_AGENT = {
  a1: 'Extracted 6 fields with 97% confidence. Saved to Salesforce as Claim #48213.',
  a2: 'Extracted renewal terms for Northwind Traders. Saved to Salesforce as Deal #48213.',
  a3: '3 of 4 expense lines auto-approved. 1 flagged for manual review (over threshold).',
  a4: 'Summary posted to #deal-approvals: 12 open deals, $1.2M in pipeline this week.',
  a5: 'Risk score: 63% (Medium Risk). 4 playbook questions flagged for review.',
  a6: 'Compliance check complete. 2 required documents missing — vendor notified.',
};
