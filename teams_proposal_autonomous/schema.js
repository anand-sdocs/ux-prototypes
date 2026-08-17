// Mock data & scripted conversation for the teams-sales-proposal prototype.
// Everything here is canned — no real Teams, S-Docs, or MCP calls are made.

const CURRENT_USER = { name: 'Anand Narasimhan', initials: 'AN', email: 'anarasimhan@sdocs.com' };

const AGENT = { name: 'S-Docs Proposal Agent', short: 'Proposal Agent', initials: 'SD' };

// Decorative chats shown above/below the agent DM in the sidebar. The rep
// starts on the "priya" chat — ordinary work, not looking at the agent DM at
// all — so the toast notification is what pulls their attention over.
const OTHER_CHATS = [
  { id: 'priya', name: 'Priya Shah', initials: 'PS', preview: 'Sent you the redlined MSA', time: '10:41 AM', openable: true },
  { id: 'dealdesk', name: 'Deal Desk', initials: 'DD', preview: 'Marcus: approved, go ahead', time: 'Yesterday', openable: false },
  { id: 'west', name: 'Sales — West Region', initials: 'SW', preview: 'Quarterly numbers are in 📊', time: 'Mon', openable: false },
];

// The chat the rep is looking at when the prototype boots — an ordinary
// conversation, unrelated to the proposal request.
const PRIYA_THREAD = [
  { from: 'them', text: "Hey — just sent over the redlined MSA for the Meridian renewal. Can you take a look before EOD?", time: '10:41 AM' },
  { from: 'me', text: "On it, thanks for the quick turnaround!", time: '10:44 AM' },
];

// The email the agent is quoting as the reason it's reaching out — this is
// what it was "listening" for. The agent never shows the rep's full inbox,
// just the one message relevant to the task it's suggesting.
const TRIGGER_EMAIL = {
  from: 'Elena Vaughn',
  fromTitle: 'Director of Operations, Meridian Logistics',
  subject: 'Pallet-tracking rollout — proposal request',
  snippet: '"...could you send over a formal proposal for the pallet-tracking rollout at the Denver DC? We\'d like to review it with our ops team by Friday."',
  receivedAt: '9:02 AM',
};

const ACCOUNT = { id: 'acc-4410', name: 'Meridian Logistics' };

const OPPORTUNITY = {
  id: 'opp-7742',
  name: 'Pallet Tracking Rollout — Denver DC',
  stage: 'Qualification',
  amount: 64000,
  closeDate: '2026-10-15',
  owner: 'Anand Narasimhan',
};

// Confirmation card shown before the agent runs — data sources and content
// sections the rep can toggle. `locked: true` sources/sections are core to
// every proposal and shown as checked-but-fixed for context.
const DATA_SOURCES = [
  { key: 'salesforce', label: 'Salesforce', detail: 'Opportunity, account, and pricing fields', locked: true, checked: true },
  { key: 'email', label: 'Email', detail: 'Elena\'s request thread', locked: true, checked: true },
  { key: 'teamsChannel', label: 'Teams channel', detail: '#meridian-account — internal deal notes', locked: false, checked: true },
  { key: 'sharepoint', label: 'SharePoint', detail: 'Approved rate card / pricing sheet', locked: false, checked: false },
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
  toastPreview: "I noticed something you might want to act on...",
  notifyEyebrow: 'New request detected',
  notifyBody: `I noticed an email from **${TRIGGER_EMAIL.from}** at **${ACCOUNT.name}** asking for a proposal on the pallet-tracking rollout. Want me to put one together?`,
  confirmIntro: `Here's what I found — take a look before I start:`,
  declineReply: "No problem — I'll keep listening and let you know if anything else comes up on this account.",
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
    { sourceKey: 'email', tool: 'sdocs.read_email_thread', label: "Re-reading Elena's email thread", duration: 1000 },
    { sourceKey: 'teamsChannel', tool: 'sdocs.read_teams_channel', label: 'Checking #meridian-account for deal-team notes', duration: 900 },
    { sourceKey: 'sharepoint', tool: 'sdocs.read_sharepoint_file', label: 'Checking SharePoint for the approved rate card', duration: 900 },
  ];
  const active = steps.filter(s => sources[s.sourceKey]);
  active.push({ sourceKey: null, tool: 'sdocs.reconcile_sources', label: 'Reconciling data across sources', duration: 1300 });
  active.push({ sourceKey: null, tool: 'sdocs.generate_document', label: 'Drafting the proposal document', duration: 1500 });
  return active;
}

// Builds the rendered proposal content based on which sections/sources were
// selected — small enough to keep inline rather than a separate data file.
function buildProposal(sources, sections) {
  const usedRateCard = !!sources.sharepoint;
  const discount = usedRateCard ? 0.06 : 0;
  const listPrice = OPPORTUNITY.amount;
  const finalPrice = Math.round(listPrice * (1 - discount));

  const proposal = {
    title: 'Sales Proposal',
    client: ACCOUNT.name,
    opportunity: OPPORTUNITY.name,
    sections: [],
  };

  if (sections.execSummary) {
    proposal.sections.push({
      key: 'execSummary',
      heading: 'Executive summary',
      body: 'Meridian Logistics is looking to modernize pallet tracking at the Denver distribution center. This proposal covers an RFID-based tracking rollout — tagging, dock-door scanners, and real-time visibility into the warehouse management system — based on the scope Elena outlined in her request.',
    });
  }
  if (sections.scope) {
    proposal.sections.push({
      key: 'scope',
      heading: 'Scope & deliverables',
      list: [
        'RFID tagging for all outbound pallets at the Denver DC',
        'Dock-door scanner installation across 6 bays',
        'Real-time tracking dashboard integrated with the existing WMS',
        'Admin training session for the ops team',
      ],
    });
  }
  if (sections.timeline) {
    proposal.sections.push({
      key: 'timeline',
      heading: 'Timeline',
      body: `Kickoff targeted for early September, with go-live ahead of the ${new Date(OPPORTUNITY.closeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} close date. Estimated implementation window: 5 weeks.`,
    });
  }
  if (sections.pricing) {
    proposal.sections.push({
      key: 'pricing',
      heading: 'Pricing & terms',
      table: [
        ['Pallet tracking rollout (list price)', formatCurrency(listPrice)],
        ...(usedRateCard ? [['Approved rate-card discount', `-${Math.round(discount * 100)}%`]] : []),
        ['Total', formatCurrency(finalPrice)],
        ['Payment terms', '50% on signature, 50% on go-live, net-30'],
      ],
      note: usedRateCard
        ? 'Discount applied per the approved rate card on file in SharePoint.'
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
        'Reply to Elena with the proposal attached',
        'Schedule a walkthrough call with the Meridian ops team',
      ],
    });
  }

  return proposal;
}

// ---------------------------------------------------------------
// Audit trail — rendered by audit.html. Mirrors the tool-call chain the
// Teams prototype scripts in app.js, fully expanded with what would
// actually have been sent to the LLM and what came back at each step.
// ---------------------------------------------------------------

const TASK_TYPES = {
  extract: { key: 'extract', label: 'Extract', color: '#5b5fc7' },
  generate: { key: 'generate', label: 'Generate', color: '#7d3ac1' },
  notify: { key: 'notify', label: 'Notify', color: '#c62828' },
};

const STATUS_LABEL = { success: 'Success', error: 'Error', hitl: 'Needs review' };

const PROPOSAL_AGENT = {
  name: 'S-Docs Proposal Agent',
  role: 'Monitors connected inboxes for proposal requests, confirms with the account owner in Teams, then drafts the proposal.',
};

const AUDIT_TRAILS = {
  'run-77004': {
    runId: 'run-77004',
    trigger: 'Email listener — new message from Elena Vaughn matched "proposal request" intent',
    status: 'success',
    startedAt: '2026-08-14 09:03 AM',
    totalDuration: '10.1s',
    steps: [
      {
        type: 'extract',
        label: 'Detect proposal request in monitored inbox',
        status: 'success',
        startedAt: '09:03:00 AM',
        duration: '1.2s',
        prompt: 'Classify this incoming email: is the sender asking for a sales proposal, and if so, which account and topic does it relate to?\n\nFrom: Elena Vaughn <evaughn@meridianlogistics.com>\nSubject: Pallet-tracking rollout — proposal request\nBody: "...could you send over a formal proposal for the pallet-tracking rollout at the Denver DC? We\'d like to review it with our ops team by Friday."',
        response: {
          kind: 'structured',
          content: {
            is_proposal_request: true,
            account_match: 'Meridian Logistics (acc-4410)',
            opportunity_match: 'Pallet Tracking Rollout — Denver DC (opp-7742)',
            confidence: 96,
          },
        },
        decisions: [
          'Matched the sender\'s domain and named account to a single Salesforce account and a single open opportunity — no disambiguation needed.',
          'Confidence (96%) was above the threshold to proactively notify the account owner in Teams rather than waiting for them to read the email.',
        ],
      },
      {
        type: 'notify',
        label: 'Message account owner in Teams',
        status: 'success',
        startedAt: '09:03:01 AM',
        duration: '1.0s',
        prompt: 'Draft a short Teams message to the account owner describing the detected request and asking whether to proceed, including the relevant email snippet as evidence.',
        response: {
          kind: 'unstructured',
          content: SCRIPT_NOTIFY_MESSAGE_PLACEHOLDER(),
        },
        decisions: [
          'Included the quoted email snippet so the rep could verify the request before approving, rather than asking them to trust the classification blindly.',
        ],
      },
      {
        type: 'generate',
        label: 'Draft the proposal',
        status: 'success',
        startedAt: '09:04:32 AM',
        duration: '5.6s',
        decisions: [
          'Checked the 3 data sources the rep confirmed (Salesforce, Email, Teams channel) per the order they were listed in the confirmation card.',
          'SharePoint was left unchecked by the rep, so pricing used the Salesforce opportunity amount at list price rather than an approved rate-card discount.',
          'The "Case studies / references" section was left unchecked by the rep and was skipped entirely — no source was queried for it.',
        ],
        sourceComparison: {
          dataElements: [
            {
              key: 'scope',
              label: 'Project scope',
              candidates: [
                { platform: 'Email', prompt: "Extract the scope of work Elena Vaughn described in her request.", response: { kind: 'unstructured', content: '"...proposal for the pallet-tracking rollout at the Denver DC"' }, confidence: 91 },
                { platform: 'Salesforce', prompt: 'Pull the Opportunity description field for scope details.', response: { kind: 'unstructured', content: '"Pallet tracking — Denver DC, early-stage"' }, confidence: 55 },
              ],
              chosenPlatform: 'Email',
              chosenValue: 'RFID-based pallet tracking rollout at the Denver distribution center',
              reason: 'The email had the clearer, more specific scope description (91% vs. 55% confidence) direct from the customer, so it took priority over the terse Salesforce description.',
            },
            {
              key: 'deliverables',
              label: 'Deliverables',
              candidates: [
                { platform: 'Teams channel', prompt: 'Check #meridian-account for any deliverables notes the deal team has logged for this opportunity.', response: { kind: 'unstructured', content: '"Scope for Meridian: RFID tags, 6 dock-door scanners, WMS integration, admin training — confirmed on last call"' }, confidence: 94 },
                { platform: 'Email', prompt: 'Check the email thread for any deliverables the client explicitly asked for.', response: { kind: 'unstructured', content: 'No specific deliverables list — the email only asks for a formal proposal.' }, confidence: 40 },
              ],
              chosenPlatform: 'Teams channel',
              chosenValue: 'RFID tagging, 6 dock-door scanners, WMS dashboard integration, admin training',
              reason: 'The #meridian-account Teams channel had a complete, recently-confirmed deliverables list from the deal team; the email itself didn\'t specify deliverables.',
            },
            {
              key: 'pricing',
              label: 'Pricing',
              candidates: [
                { platform: 'Salesforce', prompt: 'Pull the Opportunity amount field for Pallet Tracking Rollout — Denver DC.', response: { kind: 'structured', content: { amount: 64000, currency: 'USD' } }, confidence: 99 },
              ],
              chosenPlatform: 'Salesforce',
              chosenValue: '$64,000 (list price)',
              reason: 'Salesforce is the system of record for deal amounts. The rep did not check SharePoint for an approved rate card, so no discount was applied — this was flagged in the proposal for the rep to double-check before sending.',
            },
          ],
        },
      },
      {
        type: 'notify',
        label: 'Return proposal to Teams',
        status: 'success',
        startedAt: '09:04:38 AM',
        duration: '2.3s',
        prompt: 'Summarize the drafted proposal for the rep in Teams, flagging anything that used a fallback or default instead of a confirmed source.',
        response: {
          kind: 'unstructured',
          content: 'Proposal draft ready for Meridian Logistics — Pallet Tracking Rollout. Heads up: pricing uses Salesforce list price since no approved rate card was checked, and the case-studies section was skipped since it wasn\'t selected.',
        },
        decisions: [
          'Called out the pricing fallback and the skipped section explicitly so the rep knows what to double-check before replying to Elena.',
        ],
      },
    ],
  },
};

// Small helper so the audit step above can reuse the exact notify copy
// without duplicating the string (SCRIPT is defined earlier in this file).
function SCRIPT_NOTIFY_MESSAGE_PLACEHOLDER() {
  return `I noticed an email from Elena Vaughn at Meridian Logistics asking for a proposal on the pallet-tracking rollout. Want me to put one together? Here's the relevant line from her email: "...could you send over a formal proposal for the pallet-tracking rollout at the Denver DC? We'd like to review it with our ops team by Friday."`;
}
