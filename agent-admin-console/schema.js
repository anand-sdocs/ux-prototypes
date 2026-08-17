// Mock data for the agent-admin-console prototype — a standard RBAC model
// (roles x permission areas, each set to No access / Can view / Can manage),
// a connector allowlist, an audit log, and a policy-alerts feed. Everything
// is static/seeded and edits only persist in memory for this session.

const PERMISSION_AREAS = [
  'Agent Building',
  'Connector Management',
  'Catalogue Publishing',
  'User & Role Management',
  'Audit & Compliance',
];

const PERMISSION_LEVELS = ['No access', 'Can view', 'Can manage'];

const ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    system: true,
    permissions: {
      'Agent Building': 'Can manage',
      'Connector Management': 'Can manage',
      'Catalogue Publishing': 'Can manage',
      'User & Role Management': 'Can manage',
      'Audit & Compliance': 'Can manage',
    },
  },
  {
    id: 'creator',
    name: 'Creator',
    system: true,
    permissions: {
      'Agent Building': 'Can manage',
      'Connector Management': 'Can view',
      'Catalogue Publishing': 'Can manage',
      'User & Role Management': 'No access',
      'Audit & Compliance': 'No access',
    },
  },
  {
    id: 'standard',
    name: 'Standard User',
    system: true,
    permissions: {
      'Agent Building': 'No access',
      'Connector Management': 'No access',
      'Catalogue Publishing': 'No access',
      'User & Role Management': 'No access',
      'Audit & Compliance': 'No access',
    },
  },
  {
    id: 'auditor',
    name: 'Auditor',
    system: true,
    permissions: {
      'Agent Building': 'No access',
      'Connector Management': 'Can view',
      'Catalogue Publishing': 'No access',
      'User & Role Management': 'Can view',
      'Audit & Compliance': 'Can manage',
    },
  },
];

const MEMBERS = [
  { id: 'm1', name: 'Anand Narasimhan', initials: 'AN', email: 'anarasimhan@sdocs.com', team: 'Claims Ops', roleId: 'standard' },
  { id: 'm2', name: 'Priya Shah', initials: 'PS', email: 'pshah@sdocs.com', team: 'Claims Ops', roleId: 'creator' },
  { id: 'm3', name: 'Marcus Webb', initials: 'MW', email: 'mwebb@sdocs.com', team: 'Deal Desk', roleId: 'creator' },
  { id: 'm4', name: 'Jordan Lee', initials: 'JL', email: 'jlee@sdocs.com', team: 'Deal Desk', roleId: 'standard' },
  { id: 'm5', name: 'Sasha Kim', initials: 'SK', email: 'skim@sdocs.com', team: 'Legal', roleId: 'auditor' },
  { id: 'm6', name: 'Dana Ortiz', initials: 'DO', email: 'dortiz@sdocs.com', team: 'IT', roleId: 'admin' },
];

const CONNECTOR_POLICY = [
  { id: 'gdrive', name: 'Google Drive', initials: 'GD', color: '#0f9d58', allowed: true },
  { id: 'slack', name: 'Slack', initials: 'SL', color: '#611f69', allowed: true },
  { id: 'email', name: 'Email (Gmail/Outlook)', initials: 'EM', color: '#c62828', allowed: true },
  { id: 'salesforce', name: 'Salesforce', initials: 'SF', color: '#00a1e0', allowed: true },
  { id: 'hubspot', name: 'HubSpot', initials: 'HS', color: '#ff7a59', allowed: false },
  { id: 'servicenow', name: 'ServiceNow', initials: 'SN', color: '#81b5a1', allowed: false },
  { id: 'sheets', name: 'Google Sheets', initials: 'GS', color: '#0f9d58', allowed: true },
  { id: 'sharepoint', name: 'SharePoint', initials: 'SP', color: '#036c70', allowed: false },
];

const AUDIT_LOG = [
  { time: '2026-08-08 09:14', actor: 'Dana Ortiz', action: 'Changed role', detail: 'Marcus Webb: Standard User → Creator', type: 'role' },
  { time: '2026-08-07 16:02', actor: 'Priya Shah', action: 'Published agent', detail: 'Claims Intake Agent → Enterprise catalogue', type: 'agent' },
  { time: '2026-08-07 11:40', actor: 'Jordan Lee', action: 'Blocked connection attempt', detail: 'Attempted to connect ServiceNow — not on the allowlist', type: 'policy' },
  { time: '2026-08-06 14:55', actor: 'Marcus Webb', action: 'Connected data source', detail: 'Salesforce (personal OAuth)', type: 'connector' },
  { time: '2026-08-06 10:20', actor: 'Dana Ortiz', action: 'Updated connector policy', detail: 'Disallowed SharePoint org-wide', type: 'policy' },
  { time: '2026-08-05 17:33', actor: 'Anand Narasimhan', action: 'Requested creator access', detail: 'Pending review', type: 'role' },
  { time: '2026-08-05 09:02', actor: 'Priya Shah', action: 'Created agent', detail: 'Weekly Pipeline Summarizer', type: 'agent' },
  { time: '2026-08-04 13:18', actor: 'Sasha Kim', action: 'Viewed audit log', detail: 'Exported last 30 days', type: 'policy' },
  { time: '2026-08-03 08:47', actor: 'Marcus Webb', action: 'Blocked connection attempt', detail: 'Attempted to connect HubSpot — not on the allowlist', type: 'policy' },
  { time: '2026-08-01 15:12', actor: 'Dana Ortiz', action: 'Created role', detail: 'Auditor', type: 'role' },
];

// Frontier models available org-wide. "enabled" controls whether builders can
// select this model in the agent builder's Model step. One model per provider
// family is marked default; builders can still pick any enabled model.
const LLM_MODELS = [
  { id: 'claude-opus-5', provider: 'Anthropic', providerColor: '#d97757', initials: 'AN', name: 'Claude Opus 5', version: 'claude-opus-5', contextWindow: '500K tokens', enabled: true, default: false },
  { id: 'claude-sonnet-5', provider: 'Anthropic', providerColor: '#d97757', initials: 'AN', name: 'Claude Sonnet 5', version: 'claude-sonnet-5', contextWindow: '500K tokens', enabled: true, default: true },
  { id: 'claude-haiku-4-5', provider: 'Anthropic', providerColor: '#d97757', initials: 'AN', name: 'Claude Haiku 4.5', version: 'claude-haiku-4-5-20251001', contextWindow: '200K tokens', enabled: true, default: false },
  { id: 'gpt-5-1', provider: 'OpenAI', providerColor: '#10a37f', initials: 'AI', name: 'GPT-5.1', version: 'gpt-5.1', contextWindow: '400K tokens', enabled: true, default: false },
  { id: 'gpt-5', provider: 'OpenAI', providerColor: '#10a37f', initials: 'AI', name: 'GPT-5', version: 'gpt-5', contextWindow: '400K tokens', enabled: false, default: false },
  { id: 'gpt-4o', provider: 'OpenAI', providerColor: '#10a37f', initials: 'AI', name: 'GPT-4o', version: 'gpt-4o-2024-11-20', contextWindow: '128K tokens', enabled: false, default: false },
  { id: 'gemini-2-5-pro', provider: 'Google', providerColor: '#4285f4', initials: 'GG', name: 'Gemini 2.5 Pro', version: 'gemini-2.5-pro', contextWindow: '1M tokens', enabled: true, default: false },
  { id: 'gemini-2-5-flash', provider: 'Google', providerColor: '#4285f4', initials: 'GG', name: 'Gemini 2.5 Flash', version: 'gemini-2.5-flash', contextWindow: '1M tokens', enabled: false, default: false },
  { id: 'llama-4', provider: 'Meta', providerColor: '#0064e0', initials: 'META', name: 'Llama 4', version: 'llama-4-maverick', contextWindow: '256K tokens', enabled: false, default: false },
  { id: 'mistral-large', provider: 'Mistral', providerColor: '#fa520f', initials: 'MI', name: 'Mistral Large', version: 'mistral-large-2411', contextWindow: '128K tokens', enabled: false, default: false },
];

// Admin-added custom / self-hosted models. Auth method is either a static API
// key or a lightweight OAuth 2.0 / OpenID Connect handshake against the
// model's own identity provider.
const CUSTOM_MODELS = [
  {
    id: 'custom-1',
    name: 'Internal Fine-tune (Claims v3)',
    endpoint: 'https://models.internal.sdocs.com/v3/claims-finetune',
    authType: 'oauth2',
    status: 'connected',
    clientId: 'sdocs-agent-platform',
    authUrl: 'https://auth.internal.sdocs.com/oauth2/authorize',
    tokenUrl: 'https://auth.internal.sdocs.com/oauth2/token',
    scopes: 'model.invoke model.read',
    enabled: true,
  },
];

let customModelIdCounter = 1;

const ALERTS = [
  { id: 'al1', severity: 'warning', title: 'Blocked connector attempt', detail: 'Jordan Lee attempted to connect ServiceNow, which is not on the organization allowlist.', time: '11:40 AM', reviewed: false },
  { id: 'al2', severity: 'warning', title: 'Blocked connector attempt', detail: 'Marcus Webb attempted to connect HubSpot, which is not on the organization allowlist.', time: 'Aug 3', reviewed: false },
  { id: 'al3', severity: 'info', title: 'New agent published enterprise-wide', detail: 'Priya Shah published "Claims Intake Agent" to the enterprise catalogue.', time: 'Aug 7', reviewed: true },
  { id: 'al4', severity: 'info', title: 'Creator access requested', detail: 'Anand Narasimhan requested creator access. Review in User & Role Management.', time: 'Aug 5', reviewed: false },
  { id: 'al5', severity: 'warning', title: 'Role change', detail: 'Marcus Webb was granted the Creator role by Dana Ortiz.', time: 'Aug 8', reviewed: true },
];
