// Mock data model for the sdocs-agent-builder prototype.
// Everything here is static/seeded — no backend, no real integrations.

const TASK_TYPES = {
  extract: { key: 'extract', label: 'Extract', color: '#0176d3', icon: 'download' },
  generate: { key: 'generate', label: 'Generate', color: '#7d3ac1', icon: 'sparkles' },
  analyze: { key: 'analyze', label: 'Analyze', color: '#b8860b', icon: 'search' },
  save: { key: 'save', label: 'Save', color: '#2e7d32', icon: 'save' },
  notify: { key: 'notify', label: 'Notify', color: '#c62828', icon: 'bell' },
};

// Chart/visualization types a Generate task's document template can call for.
// Purely descriptive here — the builder shows these as a checklist next to a
// template's data elements so a builder can see (and toggle) what charts the
// generated document will include, without actually rendering real charts.
const VISUALIZATION_TYPES = {
  donut: { key: 'donut', label: 'Donut / pie chart', glyph: '◔' },
  area: { key: 'area', label: 'Area / fan chart', glyph: '📈' },
  bar: { key: 'bar', label: 'Bar chart', glyph: '📊' },
  table: { key: 'table', label: 'Data table', glyph: '▦' },
};

// Triggers are how an agent's task sequence gets kicked off. Manual is always
// available; the rest are additive — any enabled trigger starts the same flow.
const TRIGGER_TYPES = {
  manual: { key: 'manual', label: 'Manual', color: '#5e6670', letter: 'M', description: 'Anyone with access can trigger this agent from its page. Always on.' },
  slack: { key: 'slack', label: 'Slack', color: '#611f69', letter: 'S', description: 'Runs when someone messages or mentions this agent in Slack.' },
  email: { key: 'email', label: 'Email', color: '#c62828', letter: 'E', description: 'Runs when a matching email arrives at a dedicated inbox address.' },
  webhook: { key: 'webhook', label: 'Webhook', color: '#0176d3', letter: 'W', description: 'Runs when an external system posts to a generated webhook URL.' },
  schedule: { key: 'schedule', label: 'Schedule', color: '#2e7d32', letter: 'T', description: 'Runs automatically on a recurring schedule.' },
};

const SCHEDULE_FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMAIL_FILTER_TYPES = [
  { id: 'subject_contains', label: 'Subject contains' },
  { id: 'sender_domain', label: 'Sender domain is' },
];
const MOCK_WEBHOOK_PAYLOAD = `{
  "event": "document.received",
  "source": "external_system",
  "file_url": "https://files.example.com/claim_09912.pdf",
  "received_at": "2026-08-07T14:32:00Z"
}`;

// Models available to pick from in the builder's Model step. Mirrors what an
// admin has enabled in the admin console's LLM Models section — disabled
// models still show, but greyed out, so builders understand why they're
// unavailable rather than just not seeing them.
const LLM_MODELS = [
  { id: 'claude-opus-5', provider: 'Anthropic', name: 'Claude Opus 5', version: 'claude-opus-5', description: 'Most capable — best for complex analysis, playbooks, and long documents.', contextWindow: '500K tokens', enabled: true, default: false },
  { id: 'claude-sonnet-5', provider: 'Anthropic', name: 'Claude Sonnet 5', version: 'claude-sonnet-5', description: 'Balanced speed and capability. Recommended default for most agents.', contextWindow: '500K tokens', enabled: true, default: true },
  { id: 'claude-haiku-4-5', provider: 'Anthropic', name: 'Claude Haiku 4.5', version: 'claude-haiku-4-5-20251001', description: 'Fastest and cheapest — best for simple extraction or notification tasks.', contextWindow: '200K tokens', enabled: true, default: false },
  { id: 'gpt-5-1', provider: 'OpenAI', name: 'GPT-5.1', version: 'gpt-5.1', description: "OpenAI's frontier model.", contextWindow: '400K tokens', enabled: true, default: false },
  { id: 'gpt-5', provider: 'OpenAI', name: 'GPT-5', version: 'gpt-5', description: 'Disabled by your admin.', contextWindow: '400K tokens', enabled: false, default: false },
  { id: 'gpt-4o', provider: 'OpenAI', name: 'GPT-4o', version: 'gpt-4o-2024-11-20', description: 'Disabled by your admin.', contextWindow: '128K tokens', enabled: false, default: false },
  { id: 'gemini-2-5-pro', provider: 'Google', name: 'Gemini 2.5 Pro', version: 'gemini-2.5-pro', description: 'Large context window — good for very long documents.', contextWindow: '1M tokens', enabled: true, default: false },
  { id: 'gemini-2-5-flash', provider: 'Google', name: 'Gemini 2.5 Flash', version: 'gemini-2.5-flash', description: 'Disabled by your admin.', contextWindow: '1M tokens', enabled: false, default: false },
  { id: 'llama-4', provider: 'Meta', name: 'Llama 4', version: 'llama-4-maverick', description: 'Disabled by your admin.', contextWindow: '256K tokens', enabled: false, default: false },
  { id: 'mistral-large', provider: 'Mistral', name: 'Mistral Large', version: 'mistral-large-2411', description: 'Disabled by your admin.', contextWindow: '128K tokens', enabled: false, default: false },
  { id: 'custom-1', provider: 'Custom', name: 'Internal Fine-tune (Claims v3)', version: 'models.internal.sdocs.com/v3/claims-finetune', description: 'Self-hosted fine-tune, added by your admin via OAuth 2.0.', contextWindow: '32K tokens', enabled: true, default: false },
];

const CONNECTORS = [
  { id: 'gdrive', name: 'Google Drive', category: 'Storage', initials: 'GD', color: '#fff', logo: 'assets/logos/googledrive.svg' },
  { id: 'slack', name: 'Slack', category: 'Messaging', initials: 'SL', color: '#fff', logo: 'assets/logos/slack.svg' },
  { id: 'email', name: 'Email (Gmail/Outlook)', category: 'Messaging', initials: 'EM', color: '#fff', logo: 'assets/logos/gmail.svg' },
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', initials: 'SF', color: '#fff', logo: 'assets/logos/salesforce.svg' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', initials: 'HS', color: '#fff', logo: 'assets/logos/hubspot.svg' },
  { id: 'servicenow', name: 'ServiceNow', category: 'ITSM', initials: 'SN', color: '#fff', logo: 'assets/logos/servicenow.png' },
  { id: 'sheets', name: 'Google Sheets', category: 'Spreadsheet', initials: 'GS', color: '#fff', logo: 'assets/logos/googlesheets.svg' },
  { id: 'sharepoint', name: 'SharePoint', category: 'Storage', initials: 'SP', color: '#fff', logo: 'assets/logos/sharepoint.svg' },
  { id: 'databricks', name: 'Databricks', category: 'Data platform', initials: 'DB', color: '#fff', logo: 'assets/logos/databricks.svg' },
  { id: 'snowflake', name: 'Snowflake', category: 'Data platform', initials: 'SF', color: '#fff', logo: 'assets/logos/snowflake.svg' },
  { id: 'glean', name: 'Glean', category: 'Enterprise search', initials: 'GL', color: '#fff', logo: 'assets/logos/glean.png' },
  { id: 'sierra', name: 'Sierra', category: 'Customer support AI', initials: 'SI', color: '#fff', logo: 'assets/logos/sierra.png' },
];

const DESTINATION_PLATFORMS = [
  { id: 'salesforce', name: 'Salesforce', initials: 'SF', color: '#00a1e0', connected: true },
  { id: 'hubspot', name: 'HubSpot', initials: 'HS', color: '#ff7a59', connected: true },
  { id: 'servicenow', name: 'ServiceNow', initials: 'SN', color: '#81b5a1', connected: false },
  { id: 'sheets', name: 'Google Sheets', initials: 'GS', color: '#0f9d58', connected: true },
];

const NOTIFY_CHANNELS = [
  { id: 'email', name: 'Email', initials: 'EM', color: '#c62828' },
  { id: 'slack', name: 'Slack', initials: 'SL', color: '#611f69' },
  { id: 'teams', name: 'Microsoft Teams', initials: 'MT', color: '#5059c9' },
];

const NOTIFY_RECIPIENTS = {
  email: ['ops-team@acmecorp.com', 'deals-desk@acmecorp.com', 'you@acmecorp.com'],
  slack: ['#deal-approvals', '#ops-alerts', '#general', '#legal-review'],
  teams: ['Deal Desk', 'Operations', 'Compliance'],
};

// Analyze — playbook mode. A playbook is a set of categories, each holding
// weighted yes/no questions, authored here and handed to the agent to run
// against whatever document a task upstream provides (see contract-analyze
// for what running one of these against a real contract looks like).
const PLAYBOOK_WEIGHTS = ['Low', 'Medium', 'High'];
const DESIRED_ANSWERS = ['Yes', 'No'];

// Generate tasks always produce a document from an S-Docs template — not
// freeform content — so the flow starts from "which template" rather than
// "what kind of writing."
const DOCUMENT_TEMPLATES = [
  {
    id: 'sales_proposal',
    label: 'Sales Proposal',
    description: 'A proposal document for a prospective deal, pulling terms and pricing from the opportunity.',
    dataElements: [
      { key: 'prospect_name', label: 'Prospect / account name', suggestedPrompt: 'Look up the account name and primary contact on the opportunity.', sampleValue: 'Northwind Traders' },
      { key: 'deal_value', label: 'Proposed deal value', suggestedPrompt: 'Pull the opportunity amount and currency.', sampleValue: '$86,000 / yr' },
      { key: 'proposed_terms', label: 'Proposed terms', suggestedPrompt: 'Summarize the proposed pricing tier and contract length.', sampleValue: '24-month term, Enterprise tier, net-30' },
      { key: 'key_differentiators', label: 'Key differentiators', suggestedPrompt: "List 2–3 reasons this solution fits the prospect's stated needs.", sampleValue: 'Faster onboarding, dedicated CSM, SOC 2 Type II' },
    ],
  },
  {
    id: 'scorecard',
    label: 'Customer Review Scorecard',
    description: 'A quarterly or annual scorecard summarizing account health, usage, and risk.',
    dataElements: [
      { key: 'customer_name', label: 'Customer name', suggestedPrompt: 'Look up the account name.', sampleValue: 'Acme Logistics' },
      { key: 'review_period', label: 'Review period', suggestedPrompt: 'Use the current quarter.', sampleValue: 'Q3 2026' },
      { key: 'csat_score', label: 'CSAT / health score', suggestedPrompt: 'Pull the latest customer health score.', sampleValue: '4.6 / 5 (Healthy)' },
      { key: 'key_wins', label: 'Key wins this period', suggestedPrompt: 'Summarize recent support tickets and usage milestones into 2–3 wins.', sampleValue: 'Rolled out to 3 new teams, avg. ticket resolution down 30%' },
      { key: 'risk_areas', label: 'Risk areas', suggestedPrompt: 'Flag any open escalations or declining usage trends.', sampleValue: 'Seat utilization down 8% month-over-month' },
    ],
  },
  {
    id: 'investment_summary',
    label: 'Quarterly Investment Portfolio Review',
    description: 'A wealth-management client review — account holdings, fees, and allocation, illustrated with charts pulled from the portfolio system, custodian feed, and market data.',
    dataElements: [
      { key: 'household_name', label: 'Client / household name', suggestedPrompt: 'Look up the client or household name on file.', sampleValue: 'Robert & Linda Whitfield' },
      { key: 'total_aum', label: 'Total assets under management', suggestedPrompt: 'Sum the current market value across all accounts in the household.', sampleValue: '$3,220,000' },
      { key: 'account_holdings', label: 'Account holdings by fund', suggestedPrompt: 'List each account, its holdings by fund/ticker, and the amount invested in each.', sampleValue: 'Joint taxable: $1,850,000 across 4 funds; 2 IRAs: $1,370,000 across 3 funds' },
      { key: 'fee_summary', label: 'Fee summary', suggestedPrompt: 'Pull the expense ratio and advisory fee for each fund held, and compute the blended portfolio cost.', sampleValue: 'Blended total cost 1.37%' },
      { key: 'performance_returns', label: 'Annualized performance returns', suggestedPrompt: 'Pull 1yr, 3yr, 5yr, 10yr, and since-inception annualized returns for the household\'s model allocation.', sampleValue: '1yr 18.4%, 5yr 10.1%, 10yr 8.7%' },
      { key: 'risk_disclosures', label: 'Risk disclosures', suggestedPrompt: 'Pull the standard risk disclosure language for hypothetical performance illustrations.', sampleValue: 'Standard hypothetical-illustration risk disclosure (see appendix)' },
    ],
    visualizations: [
      { key: 'asset_mix_donut', type: 'donut', label: 'Asset mix donut chart', suggestedPrompt: 'Break down total AUM into equities, fixed income, and cash as a donut chart.', included: true },
      { key: 'sector_mix_donut', type: 'donut', label: 'Sector mix donut chart', suggestedPrompt: "Break down the equity sleeve by sector as a donut chart.", included: true },
      { key: 'growth_fan_chart', type: 'area', label: 'Hypothetical market value growth chart', suggestedPrompt: 'Plot a hypothetical market-value range (band) and mid-case projection (line) using historical benchmark returns.', included: true },
      { key: 'performance_table', type: 'table', label: 'Annualized returns table', suggestedPrompt: 'Render 1yr/3yr/5yr/10yr/since-inception annualized returns as a table.', included: true },
      { key: 'fee_bar_chart', type: 'bar', label: 'Fee comparison bar chart', suggestedPrompt: 'Chart each fund\'s total cost (expense ratio + advisory fee) side by side.', included: false },
    ],
  },
  {
    id: 'sow',
    label: 'Statement of Work',
    description: 'A scope, timeline, and payment terms document for a client engagement.',
    dataElements: [
      { key: 'client_name', label: 'Client name', suggestedPrompt: 'Look up the client / account name.', sampleValue: 'Bramwell Insurance Group' },
      { key: 'project_scope', label: 'Project scope', suggestedPrompt: 'Summarize the agreed scope from the sales notes.', sampleValue: 'Implementation of automated claims intake for 3 business units' },
      { key: 'deliverables', label: 'Deliverables', suggestedPrompt: 'List the deliverables agreed with the client.', sampleValue: 'Configured intake workflow, 2 integrations, admin training' },
      { key: 'timeline', label: 'Timeline', suggestedPrompt: 'Pull the target start and go-live dates.', sampleValue: 'Kickoff Sep 1 — go-live Nov 15' },
      { key: 'payment_terms', label: 'Payment terms', suggestedPrompt: 'Use the standard payment terms unless the contract says otherwise.', sampleValue: '50% on signature, 50% on go-live, net-30' },
    ],
  },
  {
    id: 'i140',
    label: 'I-140 Immigration Filing',
    description: 'An employer-sponsored immigrant petition filing packet for a named beneficiary.',
    dataElements: [
      { key: 'beneficiary_name', label: 'Beneficiary name', suggestedPrompt: 'Look up the employee/beneficiary full legal name.', sampleValue: 'Wei Zhang' },
      { key: 'petitioner_company', label: 'Petitioning company', suggestedPrompt: 'Use the sponsoring employer entity name.', sampleValue: 'Northstar Analytics, Inc.' },
      { key: 'job_title', label: 'Job title', suggestedPrompt: "Pull the beneficiary's offered job title.", sampleValue: 'Senior Data Engineer' },
      { key: 'priority_date', label: 'Priority date', suggestedPrompt: 'Use the labor certification filing date.', sampleValue: 'March 4, 2026' },
      { key: 'supporting_evidence', label: 'Supporting evidence', suggestedPrompt: 'List the supporting evidence on file (degree, experience letters, etc).', sampleValue: "Master's degree, 3 employer reference letters" },
    ],
  },
];

// Org-published templates — documents an operations team elsewhere in the
// company has already defined, surfaced through the Generate task's
// "Something else" search rather than the 6 built-in DOCUMENT_TEMPLATES
// above. Same shape as a DOCUMENT_TEMPLATES entry, plus `team` for
// provenance and `usedByCount` so search results feel like a real catalog.
const OPS_TEMPLATE_LIBRARY = [
  {
    id: 'ops-nda-cover-letter',
    label: 'NDA Cover Letter',
    description: 'A short cover letter accompanying a mutual or one-way NDA, summarizing scope and term.',
    team: 'Legal Ops',
    usedByCount: 14,
    dataElements: [
      { key: 'counterparty_name', label: 'Counterparty name', suggestedPrompt: 'Look up the other party\'s legal entity name.', sampleValue: 'Northwind Traders LLC' },
      { key: 'effective_date', label: 'Effective date', suggestedPrompt: 'Use today\'s date unless a specific effective date was negotiated.', sampleValue: 'August 14, 2026' },
      { key: 'confidentiality_term', label: 'Confidentiality term', suggestedPrompt: 'Pull the confidentiality survival period from the NDA.', sampleValue: '3 years from disclosure' },
      { key: 'governing_law', label: 'Governing law', suggestedPrompt: 'Use the standard governing-law clause unless the counterparty requested otherwise.', sampleValue: 'State of Delaware' },
    ],
  },
  {
    id: 'ops-renewal-notice',
    label: 'Renewal Notice',
    description: 'Notifies a customer their subscription is up for renewal, with term and price details.',
    team: 'Customer Success Ops',
    usedByCount: 62,
    dataElements: [
      { key: 'customer_name', label: 'Customer name', suggestedPrompt: 'Look up the account name.', sampleValue: 'Bramwell Insurance Group' },
      { key: 'renewal_date', label: 'Renewal date', suggestedPrompt: 'Pull the current contract end date.', sampleValue: 'October 1, 2026' },
      { key: 'term_length', label: 'Renewal term length', suggestedPrompt: 'Use the standard renewal term unless the account has a negotiated term.', sampleValue: '12 months' },
      { key: 'price_change', label: 'Price change', suggestedPrompt: 'Compare the renewal price to the current price and note any increase.', sampleValue: '+4% (standard annual uplift)' },
    ],
  },
  {
    id: 'ops-board-update',
    label: 'Board Update',
    description: 'A recurring one-pager for the board covering headline metrics, risks, and asks.',
    team: 'Executive Ops',
    usedByCount: 8,
    dataElements: [
      { key: 'reporting_period', label: 'Reporting period', suggestedPrompt: 'Use the current quarter.', sampleValue: 'Q3 2026' },
      { key: 'headline_metrics', label: 'Headline metrics', suggestedPrompt: 'Pull ARR, net new logos, and churn for the period.', sampleValue: 'ARR $18.2M (+6% QoQ), 14 new logos, 1.8% churn' },
      { key: 'key_risks', label: 'Key risks', suggestedPrompt: 'Summarize any risks flagged by department leads this period.', sampleValue: 'Hiring pace behind plan in Support' },
      { key: 'asks_from_board', label: 'Asks from the board', suggestedPrompt: 'List any decisions or approvals needed from the board this cycle.', sampleValue: 'Approve FY27 headcount plan' },
    ],
    visualizations: [
      { key: 'arr_trend_chart', type: 'area', label: 'ARR trend chart', suggestedPrompt: 'Plot ARR over the trailing 8 quarters.', included: true },
      { key: 'metrics_table', type: 'table', label: 'Headline metrics table', suggestedPrompt: 'Render ARR, new logos, and churn as a table.', included: true },
    ],
  },
  {
    id: 'ops-vendor-onboarding',
    label: 'Vendor Onboarding Packet',
    description: 'Intake packet for a new vendor — services, contract value, and insurance requirements.',
    team: 'Procurement Ops',
    usedByCount: 21,
    dataElements: [
      { key: 'vendor_name', label: 'Vendor name', suggestedPrompt: 'Look up the vendor\'s legal entity name.', sampleValue: 'Alderly Logistics, Inc.' },
      { key: 'services_provided', label: 'Services provided', suggestedPrompt: 'Summarize the services in scope from the vendor agreement.', sampleValue: 'Freight brokerage and warehousing' },
      { key: 'contract_value', label: 'Annual contract value', suggestedPrompt: 'Pull the total annual contract value.', sampleValue: '$340,000 / yr' },
      { key: 'insurance_requirements', label: 'Insurance requirements', suggestedPrompt: 'Use the standard insurance requirements unless the vendor category requires more.', sampleValue: '$2M general liability, $1M auto' },
    ],
  },
  {
    id: 'ops-claims-denial-letter',
    label: 'Claims Denial Letter',
    description: 'Notifies a policyholder a claim was denied, with reason and appeal instructions.',
    team: 'Claims Ops',
    usedByCount: 37,
    dataElements: [
      { key: 'claimant_name', label: 'Claimant name', suggestedPrompt: 'Look up the policyholder / claimant name.', sampleValue: 'Maria Alvarez' },
      { key: 'policy_number', label: 'Policy number', suggestedPrompt: 'Pull the policy number the claim was filed under.', sampleValue: 'POL-88213' },
      { key: 'denial_reason', label: 'Denial reason', suggestedPrompt: 'Pull the coded denial reason and translate it into plain language.', sampleValue: 'Loss occurred outside the covered policy period' },
      { key: 'appeal_instructions', label: 'Appeal instructions', suggestedPrompt: 'Use the standard appeal-rights language for this state.', sampleValue: 'Appeal within 60 days to the address on file' },
    ],
  },
  {
    id: 'ops-client-welcome-packet',
    label: 'Client Onboarding Welcome Packet',
    description: 'Welcomes a newly signed client and introduces their account team and kickoff timeline.',
    team: 'Onboarding Ops',
    usedByCount: 45,
    dataElements: [
      { key: 'client_name', label: 'Client name', suggestedPrompt: 'Look up the client / account name.', sampleValue: 'Northstar Analytics, Inc.' },
      { key: 'account_manager', label: 'Account manager', suggestedPrompt: 'Look up the assigned account manager.', sampleValue: 'Priya Shah' },
      { key: 'kickoff_date', label: 'Kickoff date', suggestedPrompt: 'Pull the scheduled kickoff call date.', sampleValue: 'September 3, 2026' },
      { key: 'key_contacts', label: 'Key contacts', suggestedPrompt: 'List the client-side contacts on file.', sampleValue: 'Jamie Lin (VP Ops), Sam Osei (IT lead)' },
    ],
  },
  {
    id: 'ops-termination-notice',
    label: 'Termination Notice',
    description: 'Formal notice of employment termination, with last day and severance terms.',
    team: 'HR Ops',
    usedByCount: 6,
    dataElements: [
      { key: 'employee_name', label: 'Employee name', suggestedPrompt: 'Look up the employee\'s full legal name.', sampleValue: 'Jordan Peele' },
      { key: 'last_day', label: 'Last day of employment', suggestedPrompt: 'Pull the effective termination date.', sampleValue: 'August 28, 2026' },
      { key: 'reason_code', label: 'Reason code', suggestedPrompt: 'Use the HR-approved reason code for this termination.', sampleValue: 'Position elimination' },
      { key: 'severance_terms', label: 'Severance terms', suggestedPrompt: 'Use the standard severance formula unless HR specified otherwise.', sampleValue: '4 weeks base pay, benefits through month-end' },
    ],
  },
];

// Default order S-Docs checks for each data element, before the user re-prioritizes.
const DEFAULT_SOURCE_PRIORITY = ['salesforce', 'email', 'gdrive', 'sheets', 'hubspot', 'servicenow', 'sharepoint', 'slack'];

const PLAYBOOK_FIELDS = [
  'deal_value', 'accuracy_score', 'claim_amount', 'contract_term_months',
  'risk_score', 'document_type', 'approval_status', 'days_outstanding',
];
const PLAYBOOK_OPERATORS = ['>', '>=', '<', '<=', '=', 'contains'];
const PLAYBOOK_ACTIONS = [
  'Require manual review', 'Auto-approve', 'Escalate to manager', 'Flag as high risk', 'Route to legal',
];

const EXTRACT_SAMPLE_SCHEMA = [
  { name: 'claimant_name', type: 'STRING', required: true },
  { name: 'policy_number', type: 'STRING', required: true },
  { name: 'claim_date', type: 'DATE', required: true },
  { name: 'claim_amount', type: 'CURRENCY', required: true },
  { name: 'incident_description', type: 'TEXT', required: false },
  { name: 'approval_status', type: 'ENUM', required: false },
];

// ---------------------------------------------------------------
// Skills — reusable, named building blocks for a task. A "Contract Review
// Skill" or "Invoice Extraction Skill" packages up the config an Analyze or
// Extract task would otherwise need authored from scratch, so an agent
// builder can attach one (or, for Analyze, several) instead of starting
// blank. Skills live independently of any one agent and are meant to be
// reused across many.
const SKILLS = [
  {
    id: 'skill-contract-review',
    name: 'Contract Review Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'Weighted playbook covering IP protection and termination for convenience. See it run against a sample contract in contract-analyze.',
    usedByAgents: 3,
    payload: {
      playbook: [
        {
          id: 'cat-ip-protection',
          name: 'IP Protection',
          questions: [
            { id: 'q-ip-1', text: 'Does the agreement include a clear IP assignment clause?', desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-ip-2', text: "Does the agreement protect the company's pre-existing IP from being assigned to the counterparty?", desiredAnswer: 'Yes', weight: 'High' },
          ],
        },
        {
          id: 'cat-termination',
          name: 'Termination for Convenience',
          questions: [
            { id: 'q-term-1', text: 'Can either party terminate for convenience with reasonable notice?', desiredAnswer: 'Yes', weight: 'Medium' },
            { id: 'q-term-2', text: 'Is there an early-termination fee or penalty?', desiredAnswer: 'No', weight: 'Medium' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-nda-review',
    name: 'NDA Review Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'A lighter playbook for one-way and mutual NDAs — confidentiality scope and term length.',
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-confidentiality',
          name: 'Confidentiality Scope',
          questions: [
            { id: 'q-nda-1', text: 'Is the definition of "Confidential Information" limited to information marked or identified as confidential?', desiredAnswer: 'No', weight: 'Medium' },
            { id: 'q-nda-2', text: 'Does the confidentiality obligation survive termination for at least 2 years?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
      ],
    },
  },
  // Regulated-industry skills — the Analyze step of a prebuilt industry
  // agent (see industry-agent-templates) points at one of these by name.
  {
    id: 'skill-aml-triage',
    name: 'AML Risk Triage Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'Weighted KYC/AML playbook — customer due diligence and transaction risk indicators, illustrative of a BSA/AML program.',
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-cdd',
          name: 'Customer Due Diligence',
          questions: [
            { id: 'q-aml-1', text: "Has the customer's identity been verified against a government-issued ID within the last 12 months?", desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-aml-2', text: 'Is the customer flagged on any sanctions or PEP watchlist?', desiredAnswer: 'No', weight: 'High' },
          ],
        },
        {
          id: 'cat-txn-risk',
          name: 'Transaction Risk',
          questions: [
            { id: 'q-aml-3', text: "Does the transaction amount exceed 3x the customer's average monthly volume?", desiredAnswer: 'No', weight: 'Medium' },
            { id: 'q-aml-4', text: 'Does the transaction involve a jurisdiction on the high-risk countries list?', desiredAnswer: 'No', weight: 'High' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-underwriting-risk',
    name: 'Underwriting Risk Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'Checks a loan file for documentation completeness and standard underwriting risk indicators.',
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-doc-completeness',
          name: 'Documentation Completeness',
          questions: [
            { id: 'q-uw-1', text: 'Is proof of income included and less than 90 days old?', desiredAnswer: 'Yes', weight: 'Medium' },
            { id: 'q-uw-2', text: 'Is a credit report on file for all applicants?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
        {
          id: 'cat-risk-indicators',
          name: 'Risk Indicators',
          questions: [
            { id: 'q-uw-3', text: 'Is the loan-to-value ratio at or below 80%?', desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-uw-4', text: 'Does the debt-to-income ratio exceed 43%?', desiredAnswer: 'No', weight: 'High' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-prior-auth-review',
    name: 'Prior Authorization Review Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'Checks a prior authorization request for medical necessity and payer policy compliance.',
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-medical-necessity',
          name: 'Medical Necessity',
          questions: [
            { id: 'q-pa-1', text: 'Does the clinical documentation support medical necessity for the requested service?', desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-pa-2', text: 'Have lower-cost treatments been attempted and documented first?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
        {
          id: 'cat-payer-policy',
          name: 'Payer Policy Compliance',
          questions: [
            { id: 'q-pa-3', text: "Is the requested service included in the payer's covered services list?", desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-pa-4', text: 'Does the request include the required CPT and ICD-10 codes?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-hipaa-baa-review',
    name: 'HIPAA BAA Review Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: "Reviews a vendor's Business Associate Agreement against standard HIPAA safeguard and breach-notification expectations.",
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-safeguards',
          name: 'Data Handling & Safeguards',
          questions: [
            { id: 'q-baa-1', text: 'Does the agreement require encryption of PHI at rest and in transit?', desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-baa-2', text: 'Does the vendor commit to using PHI only for permitted purposes under HIPAA?', desiredAnswer: 'Yes', weight: 'High' },
          ],
        },
        {
          id: 'cat-breach-notification',
          name: 'Breach Notification Obligations',
          questions: [
            { id: 'q-baa-3', text: 'Does the agreement require breach notification within 60 days?', desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-baa-4', text: 'Does the agreement specify subcontractor flow-down obligations for PHI handling?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-benefits-eligibility',
    name: 'Benefits Eligibility Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'Checks a benefits application against income, household, and program-specific eligibility criteria.',
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-income-household',
          name: 'Income & Household',
          questions: [
            { id: 'q-ben-1', text: "Is household income at or below the program's published threshold?", desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-ben-2', text: 'Is household size and composition documented and verified?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
        {
          id: 'cat-program-criteria',
          name: 'Program-Specific Criteria',
          questions: [
            { id: 'q-ben-3', text: "Does the applicant meet the program's residency requirement?", desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-ben-4', text: 'Are all required supporting documents (ID, proof of income) attached?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-foia-exemption',
    name: 'FOIA Exemption Review Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: 'Screens a public records request against common FOIA exemption categories before release.',
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-exemption-review',
          name: 'Exemption Review',
          questions: [
            { id: 'q-foia-1', text: 'Does the request involve records exempt under personal privacy provisions?', desiredAnswer: 'No', weight: 'High' },
            { id: 'q-foia-2', text: 'Does the request involve law enforcement records exempt from disclosure?', desiredAnswer: 'No', weight: 'High' },
            { id: 'q-foia-3', text: 'Can the requested records be located within the standard statutory response window?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-grant-compliance',
    name: 'Grant Compliance Review Skill',
    taskType: 'analyze',
    color: '#b8860b',
    description: "Checks a grantee's periodic report for reporting compliance and fund usage against the approved budget.",
    usedByAgents: 1,
    payload: {
      playbook: [
        {
          id: 'cat-reporting-compliance',
          name: 'Reporting Compliance',
          questions: [
            { id: 'q-grant-1', text: 'Was the required periodic performance report submitted on time?', desiredAnswer: 'Yes', weight: 'Medium' },
            { id: 'q-grant-2', text: 'Does the report include all required outcome metrics?', desiredAnswer: 'Yes', weight: 'Medium' },
          ],
        },
        {
          id: 'cat-fund-usage',
          name: 'Fund Usage Compliance',
          questions: [
            { id: 'q-grant-3', text: 'Do expenditures match the categories approved in the grant budget?', desiredAnswer: 'Yes', weight: 'High' },
            { id: 'q-grant-4', text: 'Is there any indication of funds used for an unallowable cost category?', desiredAnswer: 'No', weight: 'High' },
          ],
        },
      ],
    },
  },
  {
    id: 'skill-invoice-extraction',
    name: 'Invoice Extraction Skill',
    taskType: 'extract',
    color: '#0176d3',
    description: 'Pulls the standard fields off a vendor invoice: number, vendor, dates, amount, and line items.',
    usedByAgents: 5,
    payload: {
      schema: [
        { name: 'invoice_number', type: 'STRING', required: true },
        { name: 'vendor_name', type: 'STRING', required: true },
        { name: 'invoice_date', type: 'DATE', required: true },
        { name: 'due_date', type: 'DATE', required: true },
        { name: 'total_amount', type: 'CURRENCY', required: true },
        { name: 'line_items', type: 'TEXT', required: false },
      ],
    },
  },
  {
    id: 'skill-claims-intake',
    name: 'Claims Intake Extraction Skill',
    taskType: 'extract',
    color: '#0176d3',
    description: 'Pulls claimant, policy, and incident details off an inbound insurance claim form.',
    usedByAgents: 2,
    payload: {
      schema: EXTRACT_SAMPLE_SCHEMA.map(f => ({ ...f })),
    },
  },
  {
    id: 'skill-sales-proposal',
    name: 'Sales Proposal Generation Skill',
    taskType: 'generate',
    color: '#7d3ac1',
    description: 'Produces a Sales Proposal document, sourcing deal terms and differentiators from the CRM.',
    usedByAgents: 4,
    payload: { templateId: 'sales_proposal' },
  },
  {
    id: 'skill-sow',
    name: 'Statement of Work Generation Skill',
    taskType: 'generate',
    color: '#7d3ac1',
    description: 'Produces a Statement of Work covering scope, deliverables, timeline, and payment terms.',
    usedByAgents: 1,
    payload: { templateId: 'sow' },
  },
];

// ---- Home dashboard mock data ----

const AGENTS = [
  { id: 'a1', name: 'Renewal Deal Extractor', role: 'Extracts renewal terms from signed contracts and files them to Salesforce.', status: 'active', triggeredCount: 482, tasks: ['extract', 'save', 'notify'], lastRun: '12 min ago' },
  { id: 'a2', name: 'Claims Intake Assistant', role: 'Reads incoming claim forms, validates against policy, and flags exceptions.', status: 'active', triggeredCount: 371, tasks: ['extract', 'analyze', 'notify'], lastRun: '38 min ago' },
  { id: 'a3', name: 'Weekly Pipeline Summarizer', role: 'Generates a weekly summary of the renewal pipeline for the deal desk.', status: 'active', triggeredCount: 96, tasks: ['generate', 'notify'], lastRun: '3 hr ago' },
  { id: 'a4', name: 'Contract Risk Reviewer', role: 'Analyzes contract clauses against the legal playbook and routes exceptions.', status: 'paused', triggeredCount: 64, tasks: ['analyze', 'notify'], lastRun: '1 day ago' },
  { id: 'a5', name: 'Expense Approval Bot', role: 'Extracts expense report line items and checks them against spend thresholds.', status: 'active', triggeredCount: 58, tasks: ['extract', 'analyze', 'save'], lastRun: '5 hr ago' },
  { id: 'a6', name: 'Statement of Work Drafter', role: 'Drafts a client Statement of Work by cross-referencing the CRM, email threads, and deal notes across platforms.', status: 'active', triggeredCount: 27, tasks: ['generate', 'notify'], lastRun: '58 min ago' },
];

const ACTIONS_OVER_TIME = [18, 22, 19, 27, 31, 24, 29, 35, 33, 41, 38, 45, 40, 47];

const RECENT_ACTIONS = [
  { id: 'ac1', agentId: 'a1', stepType: 'extract', agent: 'Renewal Deal Extractor', task: 'extract', summary: 'Extracted 6 fields from Acme_Renewal_2026.pdf', time: '2 min ago', status: 'success' },
  { id: 'ac2', agentId: 'a2', stepType: 'analyze', agent: 'Claims Intake Assistant', task: 'analyze', summary: 'Flagged claim #48213 for review (accuracy 91%)', time: '9 min ago', status: 'hitl' },
  { id: 'ac3', agentId: 'a5', stepType: 'save', agent: 'Expense Approval Bot', task: 'save', summary: 'Saved 3 approved expense rows to Google Sheets', time: '14 min ago', status: 'success' },
  { id: 'ac4', agentId: 'a3', stepType: 'notify', agent: 'Weekly Pipeline Summarizer', task: 'notify', summary: 'Sent weekly summary to #deal-approvals', time: '22 min ago', status: 'success' },
  { id: 'ac5', agentId: 'a2', stepType: 'extract', agent: 'Claims Intake Assistant', task: 'extract', summary: 'Failed to parse incident_description on claim_09912.pdf', time: '31 min ago', status: 'error' },
  { id: 'ac6', agentId: 'a4', stepType: 'analyze', agent: 'Contract Risk Reviewer', task: 'analyze', summary: 'Routed contract to legal (risk_score 82)', time: '48 min ago', status: 'success' },
  { id: 'ac7', agentId: 'a6', stepType: 'generate', agent: 'Statement of Work Drafter', task: 'generate', summary: 'Drafted SOW for Bramwell Insurance Group — reconciled data across 3 platforms', time: '58 min ago', status: 'success' },
];

const ERRORS = [
  { id: 'e1', agent: 'Claims Intake Assistant', task: 'extract', message: 'Failed to parse incident_description — unsupported scan quality', time: '31 min ago', severity: 'high' },
  { id: 'e2', agent: 'Renewal Deal Extractor', task: 'save', message: 'Salesforce field mapping mismatch on renewal_term', time: '2 hr ago', severity: 'medium' },
  { id: 'e3', agent: 'Expense Approval Bot', task: 'notify', message: 'Slack channel #finance-ops not found', time: '5 hr ago', severity: 'low' },
  { id: 'e4', agent: 'Contract Risk Reviewer', task: 'analyze', message: 'Playbook rule referenced missing field risk_score', time: '1 day ago', severity: 'medium' },
];

const ERRORS_BY_TYPE = [
  { type: 'Extraction', count: 14 },
  { type: 'Field mapping', count: 9 },
  { type: 'Connector', count: 6 },
  { type: 'Playbook rule', count: 4 },
];

const HITL_REQUESTS = [
  { id: 'h1', agentId: 'a2', stepType: 'analyze', agent: 'Claims Intake Assistant', task: 'analyze', reason: 'Accuracy score 91% below 95% threshold', time: '9 min ago', status: 'pending' },
  { id: 'h2', agentId: 'a4', stepType: 'analyze', agent: 'Contract Risk Reviewer', task: 'analyze', reason: 'Contract term exceeds 36 months', time: '2 hr ago', status: 'confirmed' },
  { id: 'h3', agentId: 'a1', stepType: 'save', agent: 'Renewal Deal Extractor', task: 'save', reason: 'Deal value ($128,000) above auto-approve limit', time: '4 hr ago', status: 'confirmed' },
  { id: 'h4', agentId: 'a5', stepType: 'analyze', agent: 'Expense Approval Bot', task: 'analyze', reason: 'Expense category "Other" needs manual classification', time: '6 hr ago', status: 'rejected' },
];

// ---------------------------------------------------------------
// Audit trails — one detailed run per agent, mirroring that agent's task
// chain (see AGENTS[i].tasks). Each step records what was actually sent to
// the LLM, what came back, and the discrete decisions the agent made along
// the way. This is what the audit-trail view (audit.html) renders — the
// left-hand flow is this run's steps in order, the right-hand panel is one
// step's detail.
//
// Step shape:
//   { type, label, status, startedAt, duration,
//     prompt, response: { kind: 'structured'|'unstructured', content },
//     decisions: [ ... ],
//     sourceComparison?: { dataElements: [ { key, label, candidates: [
//       { platform, prompt, response, confidence } ], chosenPlatform,
//       chosenValue, reason } ] } }   // generate steps that reconcile
//                                     // conflicting data across platforms
//                                     // use sourceComparison instead of a
//                                     // single prompt/response.
// ---------------------------------------------------------------

const AUDIT_TRAILS = {
  a1: {
    runId: 'run-77210',
    agentId: 'a1',
    trigger: 'Schedule — Daily, 6:00 AM',
    status: 'success',
    startedAt: '2026-08-13 09:14 AM',
    totalDuration: '10.6s',
    steps: [
      {
        type: 'extract',
        label: 'Extract renewal terms',
        status: 'success',
        startedAt: '09:14:00 AM',
        duration: '6.1s',
        prompt: 'You are extracting structured data from a signed renewal contract PDF.\nDocument: Acme_Renewal_2026.pdf (14 pages)\n\nExtract the following fields exactly as they appear. If a field is not found, return null.\n\nFields:\n- renewal_term_months (integer)\n- annual_contract_value (currency)\n- effective_date (date)\n- auto_renew_clause (boolean)\n- signatory_name (string)\n- signatory_title (string)\n\nReturn valid JSON only.',
        response: {
          kind: 'structured',
          content: { renewal_term_months: 24, annual_contract_value: '$128,000', effective_date: '2026-09-01', auto_renew_clause: true, signatory_name: 'Denise Okafor', signatory_title: 'VP, Procurement' },
        },
        decisions: [
          'Matched the extraction schema (6/6 required fields found).',
          'Used OCR fallback for page 9 — the original text layer was image-only.',
          'Overall confidence 97%; no fields required manual review.',
        ],
      },
      {
        type: 'save',
        label: 'Save to Salesforce',
        status: 'success',
        startedAt: '09:14:06 AM',
        duration: '3.4s',
        prompt: 'Map the extracted renewal fields onto the Salesforce Opportunity object schema for Opportunity 006Dn000004aB3xY. Existing field API names: Renewal_Term_Months__c, Amount, Renewal_Effective_Date__c, Auto_Renew__c.\n\nExtracted data:\n{"renewal_term_months":24,"annual_contract_value":"$128,000","effective_date":"2026-09-01","auto_renew_clause":true}\n\nReturn the field mapping as JSON.',
        response: {
          kind: 'structured',
          content: { Renewal_Term_Months__c: 24, Amount: 128000, Renewal_Effective_Date__c: '2026-09-01', Auto_Renew__c: true },
        },
        decisions: [
          'Deal value $128,000 exceeds the $100,000 auto-approve limit — logged for human-in-the-loop review instead of marking the run fully complete.',
          'signatory_name and signatory_title had no mapped Salesforce field — left unmapped rather than guessing a target field.',
        ],
      },
      {
        type: 'notify',
        label: 'Notify deal desk',
        status: 'success',
        startedAt: '09:14:09 AM',
        duration: '1.1s',
        prompt: 'Draft a brief Slack message to #deal-approvals announcing that a renewal was auto-extracted and saved, and flag that it needs approval because the deal value exceeds the auto-approve threshold.',
        response: {
          kind: 'unstructured',
          content: 'Renewal saved for Acme Corp — 24mo term at $128,000/yr, effective 2026-09-01. This one\'s above the $100k auto-approve limit, so it needs a quick sign-off before it\'s marked complete. cc @deal-desk',
        },
        decisions: [
          'Routed to #deal-approvals per this notify task\'s configured channel.',
          'Included the approval flag because the prior save step marked this run as pending confirmation.',
        ],
      },
    ],
  },

  a2: {
    runId: 'run-48213',
    agentId: 'a2',
    trigger: 'Email — claims-intake@intake.sdocs.com',
    status: 'hitl',
    startedAt: '2026-08-13 08:52 AM',
    totalDuration: '9.8s',
    steps: [
      {
        type: 'extract',
        label: 'Extract claim details',
        status: 'success',
        startedAt: '08:52:00 AM',
        duration: '4.2s',
        prompt: 'Extract claim intake fields from the uploaded form (claim_48213.pdf) using the Claims Intake Extraction Skill schema: claimant_name, policy_number, claim_date, claim_amount, incident_description, approval_status.\n\nReturn valid JSON. Include a 0-100 confidence score per field.',
        response: {
          kind: 'structured',
          content: { claimant_name: 'Rosa Martins', policy_number: 'POL-88213', claim_date: '2026-08-12', claim_amount: '$4,250', incident_description: 'Rear-end collision, minor bumper damage', approval_status: null, confidence_incident_description: '83%' },
        },
        decisions: [
          'approval_status left null — field not present on this claim type, and it isn\'t required by the schema.',
          'incident_description confidence (83%) is below the 95% threshold this agent requires before analyze — passed through with a low-confidence flag rather than blocking.',
          'Retried once after an initial OCR failure on a related claim (claim_09912.pdf) earlier in the queue — see Recent errors.',
        ],
      },
      {
        type: 'analyze',
        label: 'Check against policy playbook',
        status: 'hitl',
        startedAt: '08:52:04 AM',
        duration: '4.9s',
        prompt: 'Evaluate claim #48213 against the Claims Intake playbook. Given the extracted fields:\n{"claim_amount":"$4,250","incident_description":"Rear-end collision, minor bumper damage","policy_number":"POL-88213"}\n\nAnswer each playbook question Yes/No with a brief rationale, then compute an overall accuracy/confidence score.',
        response: {
          kind: 'structured',
          content: { overall_accuracy: '91%', threshold_required: '95%', policy_match: 'Yes', coverage_active: 'Yes', result: 'Below threshold — routed to human review' },
        },
        decisions: [
          'Accuracy score 91% is below the 95% confirmation threshold configured for this agent — created a pending confirmation instead of auto-approving.',
          'Did not auto-file to the policy system; awaiting reviewer sign-off (see Human-in-the-loop).',
        ],
      },
      {
        type: 'notify',
        label: 'Notify claims reviewer',
        status: 'success',
        startedAt: '08:52:09 AM',
        duration: '0.7s',
        prompt: 'Draft a short notification to the claims review queue that claim #48213 needs manual review, including the reason.',
        response: {
          kind: 'unstructured',
          content: 'Claim #48213 (Rosa Martins) needs a quick look — extraction confidence came in at 91%, just under our 95% bar, mainly on the incident description field. Everything else checks out.',
        },
        decisions: [
          'Sent to the claims-review Slack channel per this agent\'s notify configuration.',
        ],
      },
    ],
  },

  a3: {
    runId: 'run-31940',
    agentId: 'a3',
    trigger: 'Schedule — Weekly, Monday 8:00 AM',
    status: 'success',
    startedAt: '2026-08-10 08:00 AM',
    totalDuration: '6.1s',
    steps: [
      {
        type: 'generate',
        label: 'Draft weekly pipeline summary',
        status: 'success',
        startedAt: '08:00:00 AM',
        duration: '5.5s',
        prompt: 'Summarize this week\'s renewal pipeline for the deal desk. Pull open renewal opportunities, total value, and any deals flagged for review from Salesforce. Produce a concise summary (120-180 words), first person, professional tone.',
        response: {
          kind: 'unstructured',
          content: 'This week: 14 renewals in motion, $612K total value. 3 deals closed (Acme Corp, Bramwell Insurance, Northwind Traders), 2 flagged for manual review due to deal size, 1 at risk of churn (Meridian Health, no response in 21 days). Overall pipeline is trending 8% ahead of last week.',
        },
        decisions: [
          'Pulled from Salesforce as the only connected data source for this task.',
          'Excluded 2 opportunities missing a close date from the "at risk" calculation to avoid a false positive.',
        ],
      },
      {
        type: 'notify',
        label: 'Post to #deal-approvals',
        status: 'success',
        startedAt: '08:00:06 AM',
        duration: '0.6s',
        prompt: 'Post the generated summary to #deal-approvals as a formatted Slack message.',
        response: {
          kind: 'unstructured',
          content: 'Posted verbatim to #deal-approvals with the weekly summary heading and a link back to the pipeline view.',
        },
        decisions: [
          'Delivered on schedule at 8:00 AM per the configured weekly trigger.',
        ],
      },
    ],
  },

  a4: {
    runId: 'run-90112',
    agentId: 'a4',
    trigger: 'Manual — triggered by A. Narasimhan',
    status: 'success',
    startedAt: '2026-08-12 03:20 PM',
    totalDuration: '8.4s',
    steps: [
      {
        type: 'analyze',
        label: 'Run legal playbook',
        status: 'success',
        startedAt: '03:20:00 PM',
        duration: '7.9s',
        prompt: 'Review this contract (NorthstarMSA_2026.pdf) against the Contract Review Skill playbook. Categories: IP Protection, Termination for Convenience. For each question, answer Yes/No with the supporting contract clause, then compute a weighted risk score (0-100, higher = riskier).',
        response: {
          kind: 'structured',
          content: { ip_protection: 'Pass (2/2)', termination_for_convenience: 'Fail (1/2) — early termination fee present', risk_score: 82 },
        },
        decisions: [
          'Risk score 82 exceeds the "Route to legal" rule threshold of 75 — routed automatically; this action type doesn\'t require human confirmation.',
          'Flagged the early-termination fee clause (Section 9.3) as the primary risk driver.',
        ],
      },
      {
        type: 'notify',
        label: 'Notify legal',
        status: 'success',
        startedAt: '03:20:08 PM',
        duration: '0.5s',
        prompt: 'Notify legal that this contract was routed for review, including the risk score and reason.',
        response: {
          kind: 'unstructured',
          content: 'Routing NorthstarMSA_2026.pdf to legal — risk score 82/100, driven by an early-termination fee in Section 9.3 that fails our termination-for-convenience check.',
        },
        decisions: [
          'Sent to #legal-review per this agent\'s notify configuration.',
        ],
      },
    ],
  },

  a5: {
    runId: 'run-55810',
    agentId: 'a5',
    trigger: 'Manual — triggered by A. Narasimhan',
    status: 'success',
    startedAt: '2026-08-13 04:05 AM',
    totalDuration: '6.6s',
    steps: [
      {
        type: 'extract',
        label: 'Extract expense line items',
        status: 'success',
        startedAt: '04:05:00 AM',
        duration: '3.0s',
        prompt: 'Extract line items from this expense report (expenses_aug_2026.csv): employee, category, amount, date, receipt_attached.',
        response: {
          kind: 'structured',
          content: { employee: 'Priya Shah', line_items: 3, total_amount: '$627.50', all_receipts_attached: true },
        },
        decisions: [
          'All 3 line items had receipts attached — no missing-documentation flags.',
        ],
      },
      {
        type: 'analyze',
        label: 'Check against spend thresholds',
        status: 'success',
        startedAt: '04:05:03 AM',
        duration: '2.1s',
        prompt: 'Check each expense line item against the spend policy thresholds: Travel <$500/trip, Meals <$100/day, Software requires pre-approval.',
        response: {
          kind: 'structured',
          content: { travel: 'Pass ($412.00 < $500)', meals: 'Pass ($86.50 < $100)', software: 'Flagged — requires pre-approval check' },
        },
        decisions: [
          'Software line item required a pre-approval lookup — verified against the pre-approved vendor list and cleared automatically (vendor: Figma).',
        ],
      },
      {
        type: 'save',
        label: 'Save approved rows to Google Sheets',
        status: 'success',
        startedAt: '04:05:05 AM',
        duration: '1.5s',
        prompt: 'Append the 3 approved expense rows to the "Aug 2026 Approvals" Google Sheet, matching the existing column headers.',
        response: {
          kind: 'structured',
          content: { sheet: 'Aug 2026 Approvals', rows_appended: 3 },
        },
        decisions: [
          'All 3 rows passed threshold checks, so none required a pending confirmation before saving.',
        ],
      },
    ],
  },

  a6: {
    runId: 'run-66301',
    agentId: 'a6',
    trigger: 'Manual — triggered by A. Narasimhan',
    status: 'success',
    startedAt: '2026-08-13 08:16 AM',
    totalDuration: '14.3s',
    steps: [
      {
        type: 'generate',
        label: 'Draft Statement of Work',
        status: 'success',
        startedAt: '08:16:00 AM',
        duration: '11.8s',
        decisions: [
          'Checked 3 connected platforms (Salesforce, Slack, Email) per the configured source priority before falling back to defaults.',
          'One field (timeline) required reconciling conflicting dates across sources — flagged as a judgment call, see below.',
          'One field (payment_terms) had no source data on any platform and used the standard default language instead of leaving it blank.',
        ],
        sourceComparison: {
          dataElements: [
            {
              key: 'client_name',
              label: 'Client name',
              candidates: [
                { platform: 'Salesforce', prompt: 'Look up the client/account name for Opportunity 006Dn0000091x2.', response: { kind: 'structured', content: { account_name: 'Bramwell Insurance Group' } }, confidence: 99 },
                { platform: 'Email', prompt: 'Search recent email threads for the client/account name mentioned in signed correspondence.', response: { kind: 'unstructured', content: '"...as discussed, Bramwell Insurance Group would like to proceed with the implementation..."' }, confidence: 92 },
              ],
              chosenPlatform: 'Salesforce',
              chosenValue: 'Bramwell Insurance Group',
              reason: 'Salesforce is the system of record for account names and had the highest-confidence match; Email agreed, so there was no conflict to resolve.',
            },
            {
              key: 'project_scope',
              label: 'Project scope',
              candidates: [
                { platform: 'Email', prompt: 'Summarize the agreed project scope from the sales email thread with Bramwell Insurance Group.', response: { kind: 'unstructured', content: '"We\'ll move forward with automating claims intake across all three regional business units, starting with East."' }, confidence: 88 },
                { platform: 'Salesforce', prompt: 'Pull the Opportunity description field for scope details.', response: { kind: 'unstructured', content: '"Claims automation — phase 1"' }, confidence: 61 },
              ],
              chosenPlatform: 'Email',
              chosenValue: 'Implementation of automated claims intake for 3 business units',
              reason: 'The email thread had the more complete and recent scope language (88% vs. 61% confidence); the Salesforce Opportunity description was too terse to use verbatim.',
            },
            {
              key: 'deliverables',
              label: 'Deliverables',
              candidates: [
                { platform: 'Slack', prompt: 'Check the #bramwell-deal Slack channel for any deliverables notes the deal team logged.', response: { kind: 'unstructured', content: '"Configured workflow, 2 integrations (email + CRM), admin training session"' }, confidence: 90 },
                { platform: 'Email', prompt: 'Check the email thread for any deliverables the client explicitly confirmed.', response: { kind: 'unstructured', content: '"Sounds good — just want to confirm the admin training is included."' }, confidence: 75 },
              ],
              chosenPlatform: 'Slack',
              chosenValue: 'Configured intake workflow, 2 integrations, admin training',
              reason: 'The #bramwell-deal Slack channel had the more complete deliverables notes from the deal team, and the client\'s email confirms the same deliverables — no conflict to resolve.',
            },
            {
              key: 'timeline',
              label: 'Timeline',
              candidates: [
                { platform: 'Salesforce', prompt: 'Pull the target start date and close date fields from the Opportunity.', response: { kind: 'structured', content: { expected_start: '2026-09-01', close_date: '2026-11-30' } }, confidence: 95 },
                { platform: 'Email', prompt: 'Check for any go-live date mentioned in email correspondence.', response: { kind: 'unstructured', content: '"targeting mid-November for go-live"' }, confidence: 70 },
              ],
              chosenPlatform: 'Salesforce + Email',
              chosenValue: 'Kickoff Sep 1 — go-live Nov 15',
              reason: 'Used Salesforce\'s structured start date, but Salesforce\'s "close date" (Nov 30) is a sales close date, not a go-live date — the agent used the email\'s more specific "mid-November" mention as the go-live estimate instead. This cross-source substitution is a judgment call worth a reviewer\'s second look.',
            },
            {
              key: 'payment_terms',
              label: 'Payment terms',
              candidates: [
                { platform: 'Salesforce', prompt: 'Look up the standard payment terms field on the Opportunity or Account.', response: { kind: 'structured', content: { payment_terms: null } }, confidence: 0 },
                { platform: 'Email', prompt: 'Check the email thread for any custom payment terms discussed.', response: { kind: 'unstructured', content: 'No mention of custom payment terms in the thread.' }, confidence: 0 },
              ],
              chosenPlatform: 'Default policy',
              chosenValue: '50% on signature, 50% on go-live, net-30',
              reason: 'No platform had payment terms on file for this account — fell back to the standard company-wide payment terms per the generate task\'s default instructions.',
            },
          ],
        },
      },
      {
        type: 'notify',
        label: 'Notify account owner',
        status: 'success',
        startedAt: '08:16:12 AM',
        duration: '2.5s',
        prompt: 'Draft a short notification that the SOW draft is ready for review, noting which fields need a second look.',
        response: {
          kind: 'unstructured',
          content: 'SOW draft for Bramwell Insurance Group is ready in your queue. One heads up: the go-live date was estimated from an email mention rather than a confirmed CRM date — worth double-checking before sending.',
        },
        decisions: [
          'Called out the timeline judgment call specifically so the reviewer knows which field to double-check before the document goes out.',
        ],
      },
    ],
  },
};
