// Mock data & scripted conversation for the claude-investment-proposal prototype.
// Everything here is canned — no real Claude, S-Docs, or MCP calls are made.
// Adapted from claude-sales-proposal, re-themed for a wealth-management
// quarterly investment review / client proposal flow.

const CURRENT_USER = { name: 'Anand Narasimhan', initials: 'AN', email: 'anarasimhan@sdocs.com' };

const CONNECTOR = { name: 'S-Docs', color: '#da7756' };

const AGENT = { name: 'S-Docs Investment Proposal Agent', short: 'Proposal Agent' };

// Past chats shown in the sidebar (decorative, not interactive)
const PAST_CHATS = [
  'Q2 rebalance notes — Whitfield',
  'Draft IPS update for Chen household',
  'Annual review compliance checklist',
];

// The household the advisor asks about, and the client records that match —
// intentionally ambiguous so the agent has to ask which one before it can proceed.
const SEARCH_TERM = 'Whitfield';

const HOUSEHOLDS = [
  {
    id: 'hh-4471',
    name: 'Robert & Linda Whitfield',
    type: 'Joint household',
    totalAUM: 3220000,
    accountCount: 3,
    advisor: 'Anand Narasimhan',
    lastReview: '2025-05-12',
    note: 'Primary household relationship — joint taxable account plus two IRAs.',
  },
  {
    id: 'hh-4483',
    name: 'Whitfield Family Trust',
    type: 'Trust account',
    totalAUM: 850000,
    accountCount: 1,
    advisor: 'Anand Narasimhan',
    lastReview: '2025-02-03',
    note: 'Irrevocable trust for the Whitfield grandchildren — separate investment mandate.',
  },
  {
    id: 'hh-4502',
    name: 'Daniel Whitfield',
    type: 'Individual',
    totalAUM: 210000,
    accountCount: 1,
    advisor: 'Priya Shah',
    lastReview: '2025-06-30',
    note: "Robert & Linda's son — managed by a different advisor on the team.",
  },
];

// Confirmation card shown before the agent runs — data sources and content
// sections the advisor can toggle. `locked: true` sections/sources are core
// to every review and shown as checked-but-fixed for context.
const DATA_SOURCES = [
  { key: 'portfolio', label: 'Portfolio management system', detail: 'Account holdings, allocations, and cost basis', locked: true, checked: true },
  { key: 'custodian', label: 'Custodian data feed', detail: 'Real-time positions and transaction history', locked: true, checked: true },
  { key: 'marketdata', label: 'Market data & benchmarks', detail: 'Historical index returns used for the performance illustration', locked: true, checked: true },
  { key: 'crm', label: 'CRM notes', detail: 'Recent meeting notes and stated risk tolerance', locked: false, checked: true },
  { key: 'email', label: 'Email', detail: 'Recent correspondence with the Whitfields', locked: false, checked: false },
];

const CONTENT_SECTIONS = [
  { key: 'coverLetter', label: 'Advisor cover letter', locked: true, checked: true },
  { key: 'accountSummary', label: 'Account summary & holdings', locked: true, checked: true },
  { key: 'feeSummary', label: 'Fee summary', locked: true, checked: true },
  { key: 'allocation', label: 'Allocation & performance', locked: true, checked: true },
  { key: 'lifeEvents', label: 'Recent life events / notes', locked: false, checked: false },
  { key: 'riskDisclosures', label: 'Risk disclosures', locked: true, checked: true },
];

// Scripted conversation copy.
const SCRIPT = {
  welcome: 'Hi Anand, what are you working on today?',
  suggestion: `Can you put together a quarterly investment review for the ${SEARCH_TERM} household?`,
  detectIntro: `I can put this together. This connected tool can pull holdings, cost basis, and market data straight from your portfolio system and custodian instead of you typing them in — want me to use it?`,
  useToolReply: 'Great — let me look up the client record first.',
  declineToolReply: "No problem — I'll leave it connected in case you want it for something else. Let me know if you'd like me to try this a different way.",
  disambiguationIntro: `I found a few client records matching "${SEARCH_TERM}" — which one is this review for?`,
  afterPick: (hh) => `Got it — I'll put together a quarterly review for **${hh.name}** (${formatCurrency(hh.totalAUM)} AUM, ${hh.accountCount} account${hh.accountCount === 1 ? '' : 's'}). Before I start, let's confirm a few things:`,
  confirmedEcho: 'Looks good — go ahead.',
  workingIntro: "On it. Here's what I'm checking:",
  doneIntro: "Here's the draft quarterly review:",
};

function formatCurrency(n, opts) {
  const decimals = opts && opts.decimals != null ? opts.decimals : 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPct(n, decimals) {
  return n.toFixed(decimals == null ? 1 : decimals) + '%';
}

// ---------------------------------------------------------------
// Portfolio data for the Whitfield joint household (hh-4471) — the only
// household with full mock data wired up, since it's the one the scripted
// flow always resolves to.
// ---------------------------------------------------------------

const PORTFOLIO_ACCOUNTS = [
  {
    key: 'joint',
    label: 'Joint taxable brokerage',
    value: 1850000,
    holdings: [
      { fund: 'Core US Equity Fund', ticker: 'CUSEF', amount: 650000 },
      { fund: 'International Equity Fund', ticker: 'INTLX', amount: 450000 },
      { fund: 'Municipal Bond Fund', ticker: 'MUNIX', amount: 550000 },
      { fund: 'Cash Reserve', ticker: 'CASHR', amount: 200000 },
    ],
  },
  {
    key: 'robertIra',
    label: "Robert's Traditional IRA",
    value: 780000,
    holdings: [
      { fund: 'Core US Equity Fund', ticker: 'CUSEF', amount: 420000 },
      { fund: 'Core Fixed Income Fund', ticker: 'CFIX', amount: 360000 },
    ],
  },
  {
    key: 'lindaRoth',
    label: "Linda's Roth IRA",
    value: 590000,
    holdings: [
      { fund: 'Growth Equity Fund', ticker: 'GRWEX', amount: 590000 },
    ],
  },
];

// Fee schedule — one row per fund held anywhere in the household, amounts
// rolled up across accounts.
const FEE_SCHEDULE = [
  { fund: 'Core US Equity Fund', ticker: 'CUSEF', amount: 1070000, expenseRatio: 0.45, advisoryFee: 1.00 },
  { fund: 'International Equity Fund', ticker: 'INTLX', amount: 450000, expenseRatio: 0.55, advisoryFee: 1.00 },
  { fund: 'Municipal Bond Fund', ticker: 'MUNIX', amount: 550000, expenseRatio: 0.35, advisoryFee: 1.00 },
  { fund: 'Core Fixed Income Fund', ticker: 'CFIX', amount: 360000, expenseRatio: 0.30, advisoryFee: 1.00 },
  { fund: 'Growth Equity Fund', ticker: 'GRWEX', amount: 590000, expenseRatio: 0.60, advisoryFee: 1.00 },
  { fund: 'Cash Reserve', ticker: 'CASHR', amount: 200000, expenseRatio: 0.10, advisoryFee: 0.00 },
];

// Household-level asset mix, rolled up from the holdings above.
const ASSET_MIX = [
  { label: 'US & international equity', value: 2110000, color: '#0f4c4c' },
  { label: 'Fixed income', value: 910000, color: '#2e8b8b' },
  { label: 'Cash & cash equivalents', value: 200000, color: '#bcd9d3' },
];

// Illustrative sector mix across the equity sleeve — not derived from the
// holdings above, shown as a representative model-portfolio breakdown.
const SECTOR_MIX = [
  { label: 'Technology', value: 22, color: '#0f4c4c' },
  { label: 'Financials', value: 15, color: '#1f6f6f' },
  { label: 'Health care', value: 13, color: '#2e8b8b' },
  { label: 'Industrials', value: 11, color: '#4aa6a0' },
  { label: 'Consumer discretionary', value: 10, color: '#78c2b8' },
  { label: 'Consumer staples', value: 8, color: '#a3d5c9' },
  { label: 'Energy', value: 7, color: '#c9a227' },
  { label: 'Communication services', value: 7, color: '#e0c25e' },
  { label: 'Utilities', value: 4, color: '#ecd899' },
  { label: 'Materials', value: 3, color: '#f3e6c4' },
];

const PERFORMANCE_RETURNS = [
  { period: '1 yr', value: 18.4 },
  { period: '3 yr', value: 9.2 },
  { period: '5 yr', value: 10.1 },
  { period: '10 yr', value: 8.7 },
  { period: 'Since inception', value: 8.9 },
];

// Hypothetical 13-year market-value illustration (ages 52–65, Robert's
// projected retirement), used to draw the fan chart in the proposal. Not
// investment advice — mirrors the "historical illustration" pages common in
// real advisor proposal tools.
const MARKET_GROWTH = {
  ages: [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65],
  low:  [3.10, 3.05, 2.95, 3.10, 3.30, 3.55, 3.80, 4.05, 4.30, 4.55, 4.85, 5.15, 5.50, 5.85],
  mid:  [3.22, 3.40, 3.55, 3.75, 4.00, 4.25, 4.55, 4.85, 5.20, 5.55, 5.90, 6.30, 6.70, 7.15],
  high: [3.35, 3.70, 3.95, 4.30, 4.65, 5.00, 5.40, 5.80, 6.25, 6.70, 7.20, 7.75, 8.30, 8.90],
};

// Tool-call steps run after confirmation. `sourceKey` ties a step to a
// DATA_SOURCES entry so it only runs if that source is checked.
function buildToolSteps(sources) {
  const steps = [
    { sourceKey: 'portfolio', tool: 'sdocs.search_portfolio_system', label: 'Pulling account holdings and cost basis from the portfolio system', duration: 1000 },
    { sourceKey: 'custodian', tool: 'sdocs.pull_custodian_positions', label: 'Confirming current positions with the custodian feed', duration: 1000 },
    { sourceKey: 'marketdata', tool: 'sdocs.pull_market_benchmarks', label: 'Pulling historical benchmark returns for the illustration', duration: 1100 },
    { sourceKey: 'crm', tool: 'sdocs.read_crm_notes', label: 'Checking CRM notes for stated risk tolerance and recent conversations', duration: 900 },
    { sourceKey: 'email', tool: 'sdocs.read_email_thread', label: 'Scanning recent email correspondence with the Whitfields', duration: 900 },
  ];
  const active = steps.filter(s => sources[s.sourceKey]);
  active.push({ sourceKey: null, tool: 'sdocs.reconcile_sources', label: 'Reconciling data across sources', duration: 1300 });
  active.push({ sourceKey: null, tool: 'sdocs.generate_document', label: 'Assembling the quarterly review document', duration: 1600 });
  return active;
}

// Builds the rendered proposal content based on which sections/sources were
// selected — small enough to keep inline rather than a separate data file.
function buildProposal(household, sources, sections) {
  const proposal = {
    client: household.name,
    period: 'Q2 2026',
    advisor: 'Anand Narasimhan',
    totalAUM: household.totalAUM,
    sections: [],
  };

  if (sections.coverLetter) {
    proposal.sections.push({
      key: 'coverLetter',
      heading: 'Advisor cover letter',
      body: `Dear Robert and Linda, after reviewing your household's accounts for Q2 2026, I'm pleased to share this quarterly investment review. Your portfolio remains diversified across equities, fixed income, and cash, consistent with the moderate-growth risk profile on file. Total assets under management across your three accounts are ${formatCurrency(household.totalAUM)}. I look forward to discussing this together at our next meeting.`,
    });
  }

  if (sections.accountSummary) {
    proposal.sections.push({
      key: 'accountSummary',
      heading: 'Account summary & holdings',
      accounts: PORTFOLIO_ACCOUNTS,
      totalValue: household.totalAUM,
    });
  }

  if (sections.feeSummary) {
    const totalAmount = FEE_SCHEDULE.reduce((s, f) => s + f.amount, 0);
    const blendedCost = FEE_SCHEDULE.reduce((s, f) => s + (f.expenseRatio + f.advisoryFee) * (f.amount / totalAmount), 0);
    proposal.sections.push({
      key: 'feeSummary',
      heading: 'Fee summary',
      rows: FEE_SCHEDULE,
      totalAmount,
      blendedCost,
    });
  }

  if (sections.allocation) {
    proposal.sections.push({
      key: 'allocation',
      heading: 'Allocation & performance',
      assetMix: ASSET_MIX,
      sectorMix: SECTOR_MIX,
      returns: PERFORMANCE_RETURNS,
      growth: MARKET_GROWTH,
      usedMarketData: !!sources.marketdata,
    });
  }

  if (sections.lifeEvents) {
    proposal.sections.push({
      key: 'lifeEvents',
      heading: 'Recent life events / notes',
      body: sources.crm
        ? "Per CRM notes from your March check-in: Robert plans to reduce his consulting hours starting next year, and you've discussed gifting a portion of the trust to your grandchildren's 529 plans. Both are worth revisiting at your next review."
        : 'CRM notes were not checked, so this section could not be populated from a verified source. Recommend confirming recent life events manually before sending.',
      warning: !sources.crm,
    });
  }

  if (sections.riskDisclosures) {
    proposal.sections.push({
      key: 'riskDisclosures',
      heading: 'Risk disclosures',
      body: 'This review includes hypothetical illustrations based on historical index returns. Past performance is not indicative of future results. All investments involve risk, including possible loss of principal. Please refer to the fund prospectuses for complete information on fees, expenses, and risks.',
    });
  }

  return proposal;
}

// ---------------------------------------------------------------
// Audit trail — rendered by audit.html. Mirrors the tool-call chain the
// chat prototype scripts in app.js (search portfolio system -> pull
// custodian positions -> pull benchmarks -> read CRM -> reconcile ->
// generate -> notify), fully expanded with what would actually have been
// sent to the LLM and what came back at each step.
// ---------------------------------------------------------------

const TASK_TYPES = {
  extract: { key: 'extract', label: 'Extract', color: '#0176d3' },
  generate: { key: 'generate', label: 'Generate', color: '#7d3ac1' },
  notify: { key: 'notify', label: 'Notify', color: '#c62828' },
};

const STATUS_LABEL = { success: 'Success', error: 'Error', hitl: 'Needs review' };

const PROPOSAL_AGENT = {
  name: 'S-Docs Investment Proposal Agent',
  role: 'Drafts quarterly client investment reviews by cross-referencing the portfolio system, custodian feed, market data, and CRM notes.',
};

const AUDIT_TRAILS = {
  'run-77102': {
    runId: 'run-77102',
    trigger: 'Claude (chat) — invoked by A. Narasimhan via MCP',
    status: 'success',
    startedAt: '2026-08-14 10:12 AM',
    totalDuration: '10.4s',
    steps: [
      {
        type: 'extract',
        label: 'Search portfolio system for client records',
        status: 'success',
        startedAt: '10:12:00 AM',
        duration: '2.1s',
        prompt: 'Search the portfolio system for client records matching "Whitfield", then list all matching households and accounts.',
        response: {
          kind: 'structured',
          content: {
            matches_found: 3,
            selected_by_user: 'Robert & Linda Whitfield (hh-4471)',
          },
        },
        decisions: [
          'The search matched 3 separate client records (a joint household, a family trust, and an individual account for the household\'s adult son) — the agent paused and asked the advisor which one this review was for before continuing.',
        ],
      },
      {
        type: 'generate',
        label: 'Draft the quarterly review',
        status: 'success',
        startedAt: '10:12:02 AM',
        duration: '5.9s',
        decisions: [
          'Checked the 4 data sources the advisor confirmed (Portfolio system, Custodian feed, Market data, CRM notes) per the order they were listed in the confirmation card.',
          'Email was left unchecked by the advisor, so recent correspondence was not queried.',
          'The "Recent life events / notes" section was included and populated from CRM notes since CRM was checked.',
        ],
        sourceComparison: {
          dataElements: [
            {
              key: 'holdings',
              label: 'Account holdings & cost basis',
              candidates: [
                { platform: 'Portfolio system', prompt: 'Pull current holdings, allocation, and cost basis for all accounts under household hh-4471.', response: { kind: 'structured', content: { accounts: 3, total_value: 3220000 } }, confidence: 98 },
                { platform: 'Custodian feed', prompt: 'Pull current positions for accounts under household hh-4471 to confirm against the portfolio system.', response: { kind: 'structured', content: { accounts: 3, total_value: 3221450 } }, confidence: 96 },
              ],
              chosenPlatform: 'Portfolio system',
              chosenValue: '$3,220,000 across 3 accounts',
              reason: 'The portfolio management system is the system of record for allocation and cost-basis reporting; the custodian feed\'s intraday total (which includes unsettled trades) was used only to confirm no material discrepancy.',
            },
            {
              key: 'performance',
              label: 'Performance illustration',
              candidates: [
                { platform: 'Market data & benchmarks', prompt: 'Pull historical annualized benchmark returns (1yr, 3yr, 5yr, 10yr, since inception) for the household\'s model allocation.', response: { kind: 'structured', content: { '1yr': 18.4, '3yr': 9.2, '5yr': 10.1, '10yr': 8.7 } }, confidence: 94 },
              ],
              chosenPlatform: 'Market data & benchmarks',
              chosenValue: '1yr 18.4%, 3yr 9.2%, 5yr 10.1%, 10yr 8.7%',
              reason: 'Market data & benchmarks is the only connected source for historical index returns, and is the standard basis for the hypothetical growth illustration.',
            },
            {
              key: 'lifeEvents',
              label: 'Recent life events / notes',
              candidates: [
                { platform: 'CRM notes', prompt: 'Summarize any recent life events or plans the Whitfields mentioned in meeting notes (e.g. retirement timeline, gifting plans).', response: { kind: 'unstructured', content: '"Robert mentioned reducing consulting hours starting next year. Discussed gifting a portion of the trust to grandchildren\'s 529 plans."' }, confidence: 88 },
              ],
              chosenPlatform: 'CRM notes',
              chosenValue: "Robert reducing consulting hours next year; discussing 529 gifting from the trust",
              reason: 'CRM notes were the only connected source with recent, dated meeting notes covering life events — nothing to reconcile against since email was not checked.',
            },
          ],
        },
      },
      {
        type: 'notify',
        label: 'Return quarterly review to Claude chat',
        status: 'success',
        startedAt: '10:12:08 AM',
        duration: '2.4s',
        prompt: 'Summarize the drafted quarterly review for the advisor, flagging anything that used a fallback or default instead of a confirmed source.',
        response: {
          kind: 'unstructured',
          content: 'Quarterly review draft ready for Robert & Linda Whitfield — Q2 2026. Everything was sourced from a connected system; no fallbacks were used since the advisor checked all core data sources.',
        },
        decisions: [
          'No fallback flags were needed this run — every included section had a connected source checked.',
        ],
      },
    ],
  },
};
