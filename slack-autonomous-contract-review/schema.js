// Mock data & scripted conversation for the slack-autonomous-contract-review
// prototype. Everything here is canned — no real Slack, S-Docs, or MCP calls
// are made. The contract, playbook, and baseline analysis results are
// reused verbatim from the contract-analyze prototype so the risk score
// here is computed the same way and is directly comparable.

const WORKSPACE_NAME = 'Acme Corp';
const CURRENT_USER = { name: 'Anand Narasimhan', initials: 'AN' };

const AGENT = { name: 'S-Docs Contract Review Agent', short: 'Contract Review Agent', initials: 'CR' };

const CHANNELS = ['deal-desk', 'legal-ops', 'general'];

// The channel the rep is actively in when the prototype opens — an
// ordinary conversation, unrelated to the redline that just came in.
const ACTIVE_CHANNEL = 'deal-desk';
const CHANNEL_THREAD = [
  { from: 'Marcus Webb', initials: 'MW', text: "Q3 pipeline's looking solid — we're at 118% of target with three weeks left.", time: '11:02 AM' },
  { from: 'Anand Narasimhan', initials: 'AN', text: 'Nice. Northwind is still the biggest swing factor for us this quarter.', time: '11:04 AM' },
  { from: 'Marcus Webb', initials: 'MW', text: "Agreed — let me know the second you hear back from their legal team.", time: '11:05 AM' },
];

// The email the agent is quoting as the reason it's reaching out.
const TRIGGER_EMAIL = {
  from: 'Jordan Ruiz',
  fromTitle: 'Senior Counsel, Northwind Traders',
  subject: 'Re: Master Services Agreement — redlines attached',
  snippet: '"Attached are our redlines to the MSA — a few changes to liability and termination we\'d like to discuss before we sign."',
  attachment: 'MSA_Northwind_v3_REDLINE.docx',
  receivedAt: '11:12 AM',
};

// ---------------------------------------------------------------
// Contract, playbook, and baseline results — reused verbatim from
// contract-analyze/schema.js.
// ---------------------------------------------------------------

const CONTRACT = {
  title: 'Master Services Agreement',
  parties: 'Northwind Traders, Inc. ("Customer") and Blueprint Digital Services, LLC ("Vendor")',
  effectiveDate: 'March 4, 2026',
  clauses: [
    { id: '3.1', section: '3. Intellectual Property', heading: '3.1 Ownership of Work Product', text: 'All work product, deliverables, and materials created by Vendor specifically for Customer under this Agreement ("Work Product") shall be owned exclusively by Customer upon full payment. Vendor hereby assigns all right, title, and interest in the Work Product to Customer.' },
    { id: '3.2', section: '3. Intellectual Property', heading: '3.2 Background IP', text: "Each party retains all right, title, and interest in its pre-existing intellectual property, tools, methodologies, and know-how (\"Background IP\"). Nothing in this Agreement shall be construed to assign or transfer either party's Background IP to the other party." },
    { id: '3.3', section: '3. Intellectual Property', heading: '3.3 License Grant', text: "Customer grants Vendor a non-exclusive, worldwide, royalty-free license to use Customer's Background IP, including proprietary data models and internal documentation, for any purpose during and after the term of this Agreement." },
    { id: '7.1', section: '7. Confidentiality', heading: '7.1 Definition of Confidential Information', text: '"Confidential Information" means all non-public information disclosed by Customer to Vendor in connection with this Agreement, including business plans, financials, and technical data. Information disclosed by Vendor to Customer shall not be deemed Confidential Information under this Agreement.' },
    { id: '7.4', section: '7. Confidentiality', heading: '7.4 Survival', text: 'The obligations of confidentiality under this Section shall survive termination or expiration of this Agreement for a period of three (3) years.' },
    { id: '8.1', section: '8. Term and Termination', heading: '8.1 Termination for Convenience', text: "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other party." },
    { id: '8.2', section: '8. Term and Termination', heading: '8.2 Termination for Cause', text: 'Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement.' },
    { id: '9.1', section: '9. Limitation of Liability', heading: '9.1 Limitation of Liability', text: "Except for breaches of confidentiality or indemnification obligations, neither party's aggregate liability arising out of this Agreement shall exceed the total fees paid by Customer in the twelve (12) months preceding the claim. In no event shall either party be liable for indirect, incidental, consequential, special, or punitive damages." },
    { id: '10.1', section: '10. Indemnification', heading: '10.1 Indemnification by Vendor', text: "Vendor shall defend, indemnify, and hold harmless Customer against any third-party claims alleging that the Work Product infringes such third party's intellectual property rights, and shall pay all damages, costs, and expenses finally awarded." },
    { id: '10.2', section: '10. Indemnification', heading: '10.2 Indemnification by Customer', text: "Customer shall indemnify, defend, and hold harmless Vendor against any and all claims, damages, liabilities, costs, and expenses arising from Customer's use of the Work Product, without limitation as to amount." },
  ],
};

const WEIGHT_VALUES = { Low: 1, Medium: 2, High: 3 };

const PLAYBOOK = [
  {
    id: 'ip',
    name: 'Intellectual Property Protection',
    questions: [
      { id: 'ip-1', text: 'Does the agreement include a clear IP assignment clause for work product?', desiredAnswer: 'Yes', weight: 'Medium' },
      { id: 'ip-2', text: "Does the agreement grant the counterparty any license to our pre-existing IP beyond what's necessary to perform the services?", desiredAnswer: 'No', weight: 'High' },
      { id: 'ip-3', text: 'Does the agreement include a carve-out protecting our pre-existing background IP from assignment?', desiredAnswer: 'Yes', weight: 'Low' },
    ],
  },
  {
    id: 'termination',
    name: 'Termination for Convenience',
    questions: [
      { id: 'term-1', text: "Can either party terminate this agreement for convenience with reasonable notice (e.g. 30-60 days)?", desiredAnswer: 'Yes', weight: 'Medium' },
      { id: 'term-2', text: 'Does termination require cause, i.e. is there no termination-for-convenience right at all?', desiredAnswer: 'No', weight: 'Medium' },
      { id: 'term-3', text: 'Is there a cure period before termination for breach takes effect?', desiredAnswer: 'Yes', weight: 'Low' },
    ],
  },
  {
    id: 'liability',
    name: 'Limitation of Liability',
    questions: [
      { id: 'lol-1', text: 'Is there a cap on liability tied to fees paid (e.g. 12 months of fees)?', desiredAnswer: 'Yes', weight: 'High' },
      { id: 'lol-2', text: 'Are indirect, consequential, or punitive damages excluded?', desiredAnswer: 'Yes', weight: 'Medium' },
    ],
  },
  {
    id: 'confidentiality',
    name: 'Confidentiality',
    questions: [
      { id: 'conf-1', text: 'Does the confidentiality obligation survive termination for a reasonable period (e.g. 2-5 years)?', desiredAnswer: 'Yes', weight: 'Low' },
      { id: 'conf-2', text: 'Is the definition of Confidential Information mutual, protecting both parties?', desiredAnswer: 'Yes', weight: 'Medium' },
    ],
  },
  {
    id: 'indemnification',
    name: 'Indemnification',
    questions: [
      { id: 'indem-1', text: 'Does the counterparty indemnify us for third-party IP infringement claims?', desiredAnswer: 'Yes', weight: 'Medium' },
      { id: 'indem-2', text: 'Is our indemnification obligation to the counterparty uncapped?', desiredAnswer: 'No', weight: 'High' },
    ],
  },
];

// The playbook results for the version we originally sent to Northwind —
// this is the same baseline used in contract-analyze.
const ORIGINAL_RESULTS = {
  'ip-1': { answer: 'Yes', clauseId: '3.1', excerpt: 'Vendor hereby assigns all right, title, and interest in the Work Product to Customer.' },
  'ip-2': { answer: 'Yes', clauseId: '3.3', excerpt: "Customer grants Vendor a non-exclusive, worldwide, royalty-free license to use Customer's Background IP... for any purpose during and after the term of this Agreement." },
  'ip-3': { answer: 'Yes', clauseId: '3.2', excerpt: "Nothing in this Agreement shall be construed to assign or transfer either party's Background IP to the other party." },
  'term-1': { answer: 'Yes', clauseId: '8.1', excerpt: "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice." },
  'term-2': { answer: 'No', clauseId: '8.1', excerpt: 'A termination-for-convenience right exists, so termination does not require cause.' },
  'term-3': { answer: 'No', clauseId: '8.2', excerpt: 'Either party may terminate this Agreement immediately upon written notice if the other party materially breaches — no cure period is specified.' },
  'lol-1': { answer: 'Yes', clauseId: '9.1', excerpt: "Liability shall not exceed the total fees paid by Customer in the twelve (12) months preceding the claim — capped." },
  'lol-2': { answer: 'Yes', clauseId: '9.1', excerpt: 'In no event shall either party be liable for indirect, incidental, consequential, special, or punitive damages.' },
  'conf-1': { answer: 'Yes', clauseId: '7.4', excerpt: 'The obligations of confidentiality... shall survive termination or expiration of this Agreement for a period of three (3) years.' },
  'conf-2': { answer: 'No', clauseId: '7.1', excerpt: 'Information disclosed by Vendor to Customer shall not be deemed Confidential Information under this Agreement — one-sided.' },
  'indem-1': { answer: 'Yes', clauseId: '10.1', excerpt: 'Vendor shall defend, indemnify, and hold harmless Customer against any third-party claims alleging that the Work Product infringes... intellectual property rights.' },
  'indem-2': { answer: 'Yes', clauseId: '10.2', excerpt: "Customer shall indemnify... Vendor against any and all claims... without limitation as to amount — uncapped." },
};

// The playbook results after Northwind's redline — only 4 questions changed
// (tied to 3 clause edits), everything else carries over from the original.
const REDLINE_RESULTS = {
  ...ORIGINAL_RESULTS,
  'term-1': { answer: 'No', clauseId: '8.1', excerpt: 'The termination-for-convenience clause (Section 8.1) was struck entirely in the redline — termination now requires cause.' },
  'term-2': { answer: 'Yes', clauseId: '8.1', excerpt: 'With the termination-for-convenience clause removed, termination now requires cause under the redline.' },
  'lol-1': { answer: 'No', clauseId: '9.1', excerpt: 'The liability cap tied to fees paid was struck. The redline\'s replacement language ties liability only to "damages required by applicable law" — effectively uncapped.' },
  'indem-2': { answer: 'No', clauseId: '10.2', excerpt: "The redline added a cap: \"Customer's indemnification obligation under this Section shall not exceed the fees paid in the twelve (12) months preceding the claim.\"" },
};

const RISK_BANDS = [
  { min: 80, label: 'Low Risk', color: '#2e7d32', bg: '#e8f5e9' },
  { min: 50, label: 'Medium Risk', color: '#b8860b', bg: '#fff8e1' },
  { min: 0, label: 'High Risk', color: '#c62828', bg: '#fdecea' },
];

// Computes the same weighted-satisfaction score contract-analyze uses.
function computeScore(results) {
  let totalWeight = 0;
  let earnedWeight = 0;
  let favorableCount = 0;
  let unfavorableCount = 0;
  PLAYBOOK.forEach(cat => {
    cat.questions.forEach(q => {
      const result = results[q.id];
      if (!result) return;
      const w = WEIGHT_VALUES[q.weight];
      totalWeight += w;
      const favorable = result.answer === q.desiredAnswer;
      if (favorable) { earnedWeight += w; favorableCount++; }
      else { unfavorableCount++; }
    });
  });
  const pct = totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const band = RISK_BANDS.find(b => pct >= b.min);
  return { pct, band, favorableCount, unfavorableCount };
}

// The 3 clause edits Northwind's redline made, in plain English, with the
// before/after verdict for each affected playbook question.
const KEY_CHANGES = [
  {
    clauseId: '8.1',
    heading: 'Termination for Convenience — Clause 8.1',
    description: 'The clause letting either party terminate with 60 days\' notice was struck entirely. Termination now requires cause.',
    impact: 'worse',
    affectedQuestions: ['term-1', 'term-2'],
  },
  {
    clauseId: '9.1',
    heading: 'Limitation of Liability — Clause 9.1',
    description: 'The cap tying liability to 12 months of fees paid was removed, leaving liability effectively uncapped.',
    impact: 'worse',
    affectedQuestions: ['lol-1'],
  },
  {
    clauseId: '10.2',
    heading: 'Indemnification by Customer — Clause 10.2',
    description: "Northwind added a cap to their own indemnification obligation to us, tied to 12 months of fees — this one's in our favor.",
    impact: 'better',
    affectedQuestions: ['indem-2'],
  },
];

function questionById(id) {
  for (const cat of PLAYBOOK) {
    const q = cat.questions.find(q => q.id === id);
    if (q) return q;
  }
  return null;
}

// ---------------------------------------------------------------
// Scripted conversation copy.
// ---------------------------------------------------------------

const SCRIPT = {
  toastPreview: "I noticed something on the Northwind deal...",
  notifyEyebrow: 'Redline received',
  notifyBody: `I noticed **${TRIGGER_EMAIL.from}** at **Northwind Traders** sent back the redlined **${CONTRACT.title}**. Want me to pull up what changed and score it against the legal playbook?`,
  declineReply: "No problem — I'll keep listening and let you know if anything else comes up on this account.",
  workingIntro: "On it. Here's what I'm checking:",
  doneIntro: "Here's what changed, and how it affects the risk score:",
  actionIntro: "This dropped the deal into High Risk territory. What would you like me to do?",
};

function formatPct(n) { return `${n}%`; }

function buildToolSteps() {
  return [
    { tool: 'sdocs.diff_documents', label: 'Comparing the redline to the version we sent', duration: 1100 },
    { tool: 'sdocs.extract_changes', label: 'Extracting changed clauses', duration: 1000 },
    { tool: 'sdocs.score_playbook', label: 'Scoring against the Legal Ops playbook', duration: 1400 },
  ];
}

// ---------------------------------------------------------------
// Audit trail — rendered by audit.html. Mirrors the tool-call chain the
// Slack prototype scripts in app.js, fully expanded with what would
// actually have been sent to the LLM and what came back at each step.
// ---------------------------------------------------------------

const TASK_TYPES = {
  extract: { key: 'extract', label: 'Extract', color: '#0176d3' },
  analyze: { key: 'analyze', label: 'Analyze', color: '#b8860b' },
  notify: { key: 'notify', label: 'Notify', color: '#c62828' },
};

const STATUS_LABEL = { success: 'Success', error: 'Error', hitl: 'Needs review' };

const REVIEW_AGENT = {
  name: 'S-Docs Contract Review Agent',
  role: 'Monitors deal threads for incoming redlines, diffs them against the sent version, and scores the result against the legal playbook.',
};

const AUDIT_TRAILS = {
  'run-51092': {
    runId: 'run-51092',
    trigger: 'Email listener — new message from Jordan Ruiz matched "redline received" intent',
    status: 'success',
    startedAt: '2026-08-14 11:12 AM',
    totalDuration: '11.4s',
    steps: [
      {
        type: 'extract',
        label: 'Detect redline in monitored inbox',
        status: 'success',
        startedAt: '11:12:00 AM',
        duration: '1.3s',
        prompt: 'Classify this incoming email: is the sender returning a redlined contract, and if so, which deal and document does it relate to?\n\nFrom: Jordan Ruiz <jruiz@northwindtraders.com>\nSubject: Re: Master Services Agreement — redlines attached\nAttachment: MSA_Northwind_v3_REDLINE.docx\nBody: "Attached are our redlines to the MSA — a few changes to liability and termination we\'d like to discuss before we sign."',
        response: {
          kind: 'structured',
          content: {
            is_redline: true,
            account_match: 'Northwind Traders, Inc.',
            document_match: 'Master Services Agreement (sent 2026-07-30)',
            confidence: 97,
          },
        },
        decisions: [
          'Matched the sender\'s domain and the attachment name to a single account and a single in-flight document — no disambiguation needed.',
          'Confidence (97%) was above the threshold to proactively notify the account owner in Slack rather than waiting for them to open the email.',
        ],
      },
      {
        type: 'extract',
        label: 'Diff redlined document against sent version',
        status: 'success',
        startedAt: '11:12:02 AM',
        duration: '2.1s',
        prompt: 'Compare MSA_Northwind_v3_REDLINE.docx against the version sent on 2026-07-30. List every clause with tracked changes.',
        response: {
          kind: 'structured',
          content: {
            clauses_changed: '8.1, 9.1, 10.2',
            clauses_unchanged: 7,
            change_summary: 'Termination-for-convenience struck; liability cap struck; indemnification cap added',
          },
        },
        decisions: [
          'Only clauses with tracked-change markup were flagged as changed — clauses with no edits were left out of the downstream scoring diff.',
        ],
      },
      {
        type: 'analyze',
        label: 'Score against the Legal Ops playbook',
        status: 'success',
        startedAt: '11:12:04 AM',
        duration: '5.6s',
        decisions: [
          'Re-scored all 12 playbook questions against the redlined text; only the 4 questions tied to the 3 changed clauses moved.',
          'Score dropped from 63% (Medium Risk) to 46% (High Risk) — enough to cross the Medium/High threshold, which is why the agent recommended flagging legal rather than just noting it.',
          'One of the three changes (the indemnification cap) is actually favorable to us — the agent surfaced it as a "better" change rather than folding it into the overall risk framing as pure bad news.',
        ],
        sourceComparison: {
          dataElements: [
            {
              key: 'termination',
              label: 'Termination for Convenience — Clause 8.1',
              candidates: [
                { platform: 'Original clause 8.1', prompt: 'Does either party retain the right to terminate for convenience with reasonable notice?', response: { kind: 'unstructured', content: "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice." }, confidence: 98 },
                { platform: 'Redlined clause 8.1', prompt: 'Re-check the same question against the redlined text of clause 8.1.', response: { kind: 'unstructured', content: 'The termination-for-convenience clause has been struck in its entirety. Only Section 8.2 (termination for cause) remains.' }, confidence: 96 },
              ],
              chosenPlatform: 'Redlined clause 8.1',
              chosenValue: 'Termination now requires cause — the convenience right is gone',
              reason: 'This flips two playbook questions at once (term-1 and term-2), both Medium weight — losing the convenience right removes our ability to exit the deal without cause.',
            },
            {
              key: 'liability',
              label: 'Limitation of Liability — Clause 9.1',
              candidates: [
                { platform: 'Original clause 9.1', prompt: 'Is liability capped at a fixed multiple of fees paid?', response: { kind: 'unstructured', content: "Liability shall not exceed the total fees paid by Customer in the twelve (12) months preceding the claim." }, confidence: 99 },
                { platform: 'Redlined clause 9.1', prompt: 'Re-check the same question against the redlined text of clause 9.1.', response: { kind: 'unstructured', content: 'The fee-based cap was struck. The replacement ties liability only to "damages required by applicable law" — no defined ceiling.' }, confidence: 94 },
              ],
              chosenPlatform: 'Redlined clause 9.1',
              chosenValue: 'Liability cap removed — effectively uncapped exposure',
              reason: 'This is the single highest-weight question in the playbook (High). Losing the cap is the largest individual contributor to the risk score drop.',
            },
            {
              key: 'indemnification',
              label: 'Indemnification by Customer — Clause 10.2',
              candidates: [
                { platform: 'Original clause 10.2', prompt: 'Is our indemnification obligation to the counterparty capped?', response: { kind: 'unstructured', content: "Customer shall indemnify... Vendor against any and all claims... without limitation as to amount." }, confidence: 97 },
                { platform: 'Redlined clause 10.2', prompt: 'Re-check the same question against the redlined text of clause 10.2.', response: { kind: 'unstructured', content: "Redline adds: \"Customer's indemnification obligation under this Section shall not exceed the fees paid in the twelve (12) months preceding the claim.\"" }, confidence: 95 },
              ],
              chosenPlatform: 'Redlined clause 10.2',
              chosenValue: 'Our indemnification obligation is now capped — favorable',
              reason: 'This is a High-weight question that moved in our favor, partially offsetting the liability and termination losses. Worth calling out so the rep doesn\'t read the redline as uniformly hostile.',
            },
          ],
        },
      },
      {
        type: 'notify',
        label: 'Message account owner in Slack',
        status: 'success',
        startedAt: '11:12:10 AM',
        duration: '1.1s',
        prompt: 'Draft a short Slack message to the account owner describing the redline and asking whether to proceed with a full review, including the relevant email snippet and attachment as evidence.',
        response: {
          kind: 'unstructured',
          content: "I noticed Jordan Ruiz at Northwind Traders sent back the redlined Master Services Agreement. Want me to pull up what changed and score it against the legal playbook?",
        },
        decisions: [
          'Included the quoted email and attachment name so the rep could verify the request before approving, rather than asking them to trust the classification blindly.',
        ],
      },
      {
        type: 'notify',
        label: 'Record human decision',
        status: 'success',
        startedAt: '11:12:34 AM',
        duration: '1.3s',
        prompt: 'Record the account owner\'s decision on how to proceed with the flagged redline, and draft the corresponding confirmation message.',
        response: {
          kind: 'structured',
          content: {
            decision: 'Flag for legal review',
            routed_to: '#legal-ops',
            reply_sent_to_customer: false,
          },
        },
        decisions: [
          'The agent took no customer-facing action on its own — it waited for the rep\'s explicit choice before routing anything to legal or replying to Northwind.',
        ],
      },
    ],
  },
};
