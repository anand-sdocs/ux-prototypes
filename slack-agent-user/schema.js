// Mock data & scripted conversation for the slack-agent-user prototype.
// Everything here is canned — no real Slack, S-Docs, or MCP calls are made.

const WORKSPACE_NAME = 'Acme Corp';
const CURRENT_USER = { name: 'Anand Narasimhan', initials: 'AN', email: 'anarasimhan@sdocs.com' };

const AGENT = {
  name: 'Claims Intake Agent',
  subtitle: 'App · Claims Intake Assistant',
  initials: 'CI',
  color: '#0176d3',
};

const CHANNELS = ['general', 'claims-ops', 'deal-desk'];
const DMS = ['Priya Shah', 'Marcus Webb'];

const ATTACHED_FILE = { name: 'claim_09912.pdf', size: '1.8 MB' };

const MCP_TOOL_STEPS = [
  { tool: 'sdocs.read_file', label: 'Reading claim_09912.pdf', duration: 900 },
  { tool: 'sdocs.extract_fields', label: 'Extracting claim fields', duration: 1200 },
  { tool: 'sdocs.validate_policy', label: 'Validating against policy #PL-88213', duration: 1000 },
];

const EXTRACTION_RESULT = {
  confidence: 97,
  fields: [
    { label: 'Claimant name', value: 'Sarah Chen' },
    { label: 'Policy number', value: 'PL-88213' },
    { label: 'Claim date', value: 'Jul 29, 2026' },
    { label: 'Claim amount', value: '$4,280.00' },
    { label: 'Incident description', value: 'Water damage — burst pipe in unit 4B' },
    { label: 'Approval status', value: 'Pending review' },
  ],
};

// Scripted conversation timeline. Each entry is played back by app.js in order,
// gated behind user actions (connect, send message) where noted.
const SCRIPT = {
  welcome: {
    from: 'agent',
    text: "Hi! I'm the Claims Intake Agent. I can read incoming claim forms, extract the key fields, and check them against the policy on file. To get started, connect me to your S-Docs account.",
    showConnect: true,
  },
  connected: {
    from: 'agent',
    text: `Connected as ${CURRENT_USER.email}. Attach a claim form and I'll take it from there.`,
  },
  suggestion: 'Attach claim_09912.pdf and ask me to process it',
};
