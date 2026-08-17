// Mock data & scripted conversation for the claude-sales-proposal prototype.
// Everything here is canned — no real Claude, S-Docs, or MCP calls are made.

const CURRENT_USER = { name: 'Anand Narasimhan', initials: 'AN', email: 'anarasimhan@sdocs.com' };

const CONNECTOR = { name: 'S-Docs', color: '#da7756' };

const AGENT = { name: 'S-Docs Proposal Agent', short: 'Proposal Agent' };

// Past chats shown in the sidebar (decorative, not interactive)
const PAST_CHATS = [
  'Q3 renewal risk notes',
  'Redlines on MSA — Whitfield',
  'Summarize claims backlog',
];

// The account the sales rep asks about, and the opportunities under it —
// intentionally ambiguous so the agent has to ask which one before it can proceed.
const ACCOUNT = { id: 'acc-2231', name: 'Bramwell Insurance Group' };

const OPPORTUNITIES = [
  {
    id: 'opp-6631',
    name: 'Claims Automation — Phase 2 Expansion',
    stage: 'Proposal / Price Quote',
    amount: 86000,
    closeDate: '2026-09-30',
    owner: 'Anand Narasimhan',
    note: 'Follow-on to the Phase 1 rollout completed in June.',
  },
  {
    id: 'opp-6702',
    name: 'West Region Rollout',
    stage: 'Negotiation',
    amount: 142000,
    closeDate: '2026-10-15',
    owner: 'Priya Shah',
    note: 'New business unit — separate buying committee.',
  },
  {
    id: 'opp-6588',
    name: 'Core Platform Renewal',
    stage: 'Discovery',
    amount: 54000,
    closeDate: '2026-12-01',
    owner: 'Anand Narasimhan',
    note: 'Early-stage renewal conversation, terms not yet discussed.',
  },
];

// Confirmation card shown before the agent runs — data sources and content
// sections the rep can toggle. `locked: true` sections/sources are core to
// every proposal and shown as checked-but-fixed for context.
const DATA_SOURCES = [
  { key: 'salesforce', label: 'Salesforce', detail: 'Opportunity, account, and pricing fields', locked: true, checked: true },
  { key: 'email', label: 'Email', detail: 'Recent thread with the Bramwell buying team', locked: false, checked: true },
  { key: 'slack', label: 'Slack', detail: '#bramwell-deal — internal deal-team notes', locked: false, checked: true },
  { key: 'gdrive', label: 'Google Drive', detail: 'Approved rate card / pricing sheet', locked: false, checked: false },
];

const CONTENT_SECTIONS = [
  { key: 'execSummary', label: 'Executive summary', locked: true, checked: true },
  { key: 'scope', label: 'Scope & deliverables', locked: true, checked: true },
  { key: 'timeline', label: 'Timeline', locked: true, checked: true },
  { key: 'pricing', label: 'Pricing & terms', locked: true, checked: true },
  { key: 'caseStudies', label: 'Case studies / references', locked: false, checked: false },
  { key: 'nextSteps', label: 'Next steps', locked: true, checked: true },
];

// Scripted conversation copy.
const SCRIPT = {
  welcome: "Hi Anand, what are you working on today?",
  suggestion: 'Can you draft a sales proposal for Bramwell?',
  detectIntro: `I can put together a first draft of this. This connected tool can pull the account details straight from your CRM and other deal tools instead of you typing them in — want me to use it?`,
  useToolReply: "Great — let me look up the account first.",
  declineToolReply: "No problem — I'll leave it connected in case you want it for something else. Let me know if you'd like me to try this a different way.",
  disambiguationIntro: 'I found the account, but it has multiple open opportunities. Which one is this proposal for?',
  afterPick: (opp) => `Got it — I'll put together a proposal for **${opp.name}** (${formatCurrency(opp.amount)}, ${opp.stage}). Before I start, let's confirm a few things:`,
  confirmedEcho: "Looks good — go ahead.",
  workingIntro: "On it. Here's what I'm checking:",
  doneIntro: "Here's the draft proposal:",
};

function formatCurrency(n) {
  return '$' + n.toLocaleString('en-US');
}

// Tool-call steps run after confirmation. `sourceKey` ties a step to a
// DATA_SOURCES entry so it only runs if that source is checked.
function buildToolSteps(sources) {
  const steps = [
    { sourceKey: 'salesforce', tool: 'sdocs.search_crm', label: 'Pulling opportunity & account fields from Salesforce', duration: 1000 },
    { sourceKey: 'email', tool: 'sdocs.read_email_thread', label: 'Scanning the email thread with Bramwell', duration: 1100 },
    { sourceKey: 'slack', tool: 'sdocs.read_slack', label: 'Checking #bramwell-deal for deal-team notes', duration: 900 },
    { sourceKey: 'gdrive', tool: 'sdocs.read_drive_file', label: 'Checking Google Drive for the approved rate card', duration: 900 },
  ];
  const active = steps.filter(s => sources[s.sourceKey]);
  active.push({ sourceKey: null, tool: 'sdocs.reconcile_sources', label: 'Reconciling data across sources', duration: 1300 });
  active.push({ sourceKey: null, tool: 'sdocs.generate_document', label: 'Drafting the proposal document', duration: 1500 });
  return active;
}

// Builds the rendered proposal content based on which sections/sources were
// selected — small enough to keep inline rather than a separate data file.
function buildProposal(opp, sources, sections) {
  const usedRateCard = !!sources.gdrive;
  const discount = usedRateCard ? 0.08 : 0;
  const listPrice = opp.amount;
  const finalPrice = Math.round(listPrice * (1 - discount));

  const proposal = {
    title: 'Sales Proposal',
    client: ACCOUNT.name,
    opportunity: opp.name,
    sections: [],
  };

  if (sections.execSummary) {
    proposal.sections.push({
      key: 'execSummary',
      heading: 'Executive summary',
      body: `Bramwell Insurance Group is expanding its claims automation program beyond the initial East region rollout. This proposal covers ${opp.name.toLowerCase()}, extending the same automated intake, extraction, and policy-validation workflow to the remaining regional business units.`,
    });
  }
  if (sections.scope) {
    proposal.sections.push({
      key: 'scope',
      heading: 'Scope & deliverables',
      list: [
        'Configured claims-intake workflow for 2 additional regional business units',
        'CRM + email integrations extended to the new units',
        'Policy-validation ruleset carried over from Phase 1, with regional exception handling',
        'Admin training session for the expanded rollout',
      ],
    });
  }
  if (sections.timeline) {
    proposal.sections.push({
      key: 'timeline',
      heading: 'Timeline',
      body: `Kickoff targeted for early September, with go-live ahead of the ${new Date(opp.closeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} close date. Estimated implementation window: 6 weeks.`,
    });
  }
  if (sections.pricing) {
    proposal.sections.push({
      key: 'pricing',
      heading: 'Pricing & terms',
      table: [
        ['Phase 2 expansion (list price)', formatCurrency(listPrice)],
        ...(usedRateCard ? [['Approved rate-card discount', `-${Math.round(discount * 100)}%`]] : []),
        ['Total', formatCurrency(finalPrice)],
        ['Payment terms', '50% on signature, 50% on go-live, net-30'],
      ],
      note: usedRateCard
        ? 'Discount applied per the approved rate card on file in Google Drive.'
        : 'No approved rate card was checked, so this uses list pricing from the Salesforce opportunity — flag for review if a discount applies.',
    });
  }
  if (sections.caseStudies) {
    proposal.sections.push({
      key: 'caseStudies',
      heading: 'Case studies / references',
      body: 'No case-study library is connected yet, so this section could not be populated from a verified source. Recommend attaching one manually before sending.',
      warning: true,
    });
  }
  if (sections.nextSteps) {
    proposal.sections.push({
      key: 'nextSteps',
      heading: 'Next steps',
      list: [
        'Internal review by deal desk',
        'Share with Bramwell buying committee',
        'Schedule kickoff call pending signature',
      ],
    });
  }

  return proposal;
}

// ---------------------------------------------------------------
// Audit trail — rendered by audit.html. Mirrors the tool-call chain the
// chat prototype scripts in app.js (search_crm -> read_email -> read_slack
// -> reconcile -> generate -> notify), fully expanded with what would
// actually have been sent to the LLM and what came back at each step.
// ---------------------------------------------------------------

const TASK_TYPES = {
  extract: { key: 'extract', label: 'Extract', color: '#0176d3' },
  generate: { key: 'generate', label: 'Generate', color: '#7d3ac1' },
  notify: { key: 'notify', label: 'Notify', color: '#c62828' },
};

const STATUS_LABEL = { success: 'Success', error: 'Error', hitl: 'Needs review' };

const PROPOSAL_AGENT = {
  name: 'S-Docs Proposal Agent',
  role: 'Drafts client sales proposals by cross-referencing the CRM, email threads, and deal notes across platforms.',
};

const AUDIT_TRAILS = {
  'run-93041': {
    runId: 'run-93041',
    trigger: 'Claude (chat) — invoked by A. Narasimhan via MCP',
    status: 'success',
    startedAt: '2026-08-14 02:41 PM',
    totalDuration: '9.7s',
    steps: [
      {
        type: 'extract',
        label: 'Search CRM for account & opportunities',
        status: 'success',
        startedAt: '02:41:00 PM',
        duration: '1.9s',
        prompt: 'Search Salesforce for accounts matching "Bramwell", then list open opportunities on the matched account.',
        response: {
          kind: 'structured',
          content: {
            account: 'Bramwell Insurance Group (acc-2231)',
            open_opportunities: 3,
            selected_by_user: 'Claims Automation — Phase 2 Expansion (opp-6631)',
          },
        },
        decisions: [
          'Account name matched a single Salesforce account — no account-level disambiguation needed.',
          'That account had 3 open opportunities, so the agent paused and asked the rep which one this proposal was for before continuing.',
        ],
      },
      {
        type: 'generate',
        label: 'Draft the proposal',
        status: 'success',
        startedAt: '02:41:02 PM',
        duration: '5.4s',
        decisions: [
          'Checked the 3 data sources the rep confirmed (Salesforce, Email, Slack) per the order they were listed in the confirmation card.',
          'Google Drive was left unchecked by the rep, so pricing used the Salesforce opportunity amount at list price rather than an approved rate-card discount.',
          'The "Case studies / references" section was left unchecked by the rep and was skipped entirely — no source was queried for it.',
        ],
        sourceComparison: {
          dataElements: [
            {
              key: 'scope',
              label: 'Project scope',
              candidates: [
                { platform: 'Email', prompt: 'Summarize the agreed scope for the Phase 2 expansion from the email thread with Bramwell Insurance Group.', response: { kind: 'unstructured', content: '"We\'d like to extend the same claims workflow to the two remaining regional business units once Phase 1 proves out."' }, confidence: 90 },
                { platform: 'Salesforce', prompt: 'Pull the Opportunity description field for scope details.', response: { kind: 'unstructured', content: '"Phase 2 — claims automation expansion"' }, confidence: 58 },
              ],
              chosenPlatform: 'Email',
              chosenValue: 'Extend the claims-intake workflow to the two remaining regional business units',
              reason: 'The email thread had a more complete, recent scope description (90% vs. 58% confidence) than the terse Salesforce Opportunity description.',
            },
            {
              key: 'deliverables',
              label: 'Deliverables',
              candidates: [
                { platform: 'Slack', prompt: 'Check the #bramwell-deal Slack channel for any deliverables notes the deal team logged for Phase 2.', response: { kind: 'unstructured', content: '"Phase 2 deliverables: workflow config for both units, CRM + email integration extension, admin training"' }, confidence: 93 },
                { platform: 'Email', prompt: 'Check the email thread for any deliverables the client explicitly confirmed for Phase 2.', response: { kind: 'unstructured', content: '"Sounds right, as long as admin training is included for both units this time."' }, confidence: 80 },
              ],
              chosenPlatform: 'Slack',
              chosenValue: 'Configured intake workflow for 2 units, CRM + email integration extension, admin training',
              reason: 'The #bramwell-deal Slack channel had the most complete deliverables notes from the deal team, and the client email confirms the same set — no conflict to resolve.',
            },
            {
              key: 'pricing',
              label: 'Pricing',
              candidates: [
                { platform: 'Salesforce', prompt: 'Pull the Opportunity amount field for Claims Automation — Phase 2 Expansion.', response: { kind: 'structured', content: { amount: 86000, currency: 'USD' } }, confidence: 99 },
              ],
              chosenPlatform: 'Salesforce',
              chosenValue: '$86,000 (list price)',
              reason: 'Salesforce is the system of record for deal amounts. The rep did not check Google Drive for an approved rate card, so no discount was applied — this was flagged in the proposal for the rep to double-check before sending.',
            },
          ],
        },
      },
      {
        type: 'notify',
        label: 'Return proposal to Claude chat',
        status: 'success',
        startedAt: '02:41:08 PM',
        duration: '2.4s',
        prompt: 'Summarize the drafted proposal for the rep, flagging anything that used a fallback or default instead of a confirmed source.',
        response: {
          kind: 'unstructured',
          content: 'Proposal draft ready for Bramwell Insurance Group — Claims Automation Phase 2 Expansion. Heads up: pricing uses Salesforce list price since no approved rate card was checked, and the case-studies section was skipped since it wasn\'t selected.',
        },
        decisions: [
          'Called out the pricing fallback and the skipped section explicitly so the rep knows what to double-check before sending the proposal.',
        ],
      },
    ],
  },
};
