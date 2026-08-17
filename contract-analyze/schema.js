// Mock data for the contract-analyze prototype. Everything — the contract text,
// the playbook, and the analysis results — is static/seeded. No real document
// parsing or model calls happen here.

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

// Pre-baked analysis results, keyed by question id — this is what the agent
// "found" when it read the contract against the playbook above.
const ANALYSIS_RESULTS = {
  'ip-1': { answer: 'Yes', clauseId: '3.1', excerpt: 'Vendor hereby assigns all right, title, and interest in the Work Product to Customer.' },
  'ip-2': { answer: 'Yes', clauseId: '3.3', excerpt: "Customer grants Vendor a non-exclusive, worldwide, royalty-free license to use Customer's Background IP... for any purpose during and after the term of this Agreement." },
  'ip-3': { answer: 'Yes', clauseId: '3.2', excerpt: "Nothing in this Agreement shall be construed to assign or transfer either party's Background IP to the other party." },
  'term-1': { answer: 'Yes', clauseId: '8.1', excerpt: "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice." },
  'term-2': { answer: 'No', clauseId: '8.1', excerpt: 'A termination-for-convenience right exists, so termination does not require cause.' },
  'term-3': { answer: 'No', clauseId: '8.2', excerpt: 'Either party may terminate this Agreement immediately upon written notice if the other party materially breaches — no cure period is specified.' },
  'lol-1': { answer: 'Yes', clauseId: '9.1', excerpt: "Liability shall exceed the total fees paid by Customer in the twelve (12) months preceding the claim — capped." },
  'lol-2': { answer: 'Yes', clauseId: '9.1', excerpt: 'In no event shall either party be liable for indirect, incidental, consequential, special, or punitive damages.' },
  'conf-1': { answer: 'Yes', clauseId: '7.4', excerpt: 'The obligations of confidentiality... shall survive termination or expiration of this Agreement for a period of three (3) years.' },
  'conf-2': { answer: 'No', clauseId: '7.1', excerpt: 'Information disclosed by Vendor to Customer shall not be deemed Confidential Information under this Agreement — one-sided.' },
  'indem-1': { answer: 'Yes', clauseId: '10.1', excerpt: 'Vendor shall defend, indemnify, and hold harmless Customer against any third-party claims alleging that the Work Product infringes... intellectual property rights.' },
  'indem-2': { answer: 'Yes', clauseId: '10.2', excerpt: "Customer shall indemnify... Vendor against any and all claims... without limitation as to amount — uncapped." },
};

const RISK_BANDS = [
  { min: 80, label: 'Low Risk', color: '#2e7d32', bg: '#e8f5e9' },
  { min: 50, label: 'Medium Risk', color: '#b8860b', bg: '#fff8e1' },
  { min: 0, label: 'High Risk', color: '#c62828', bg: '#fdecea' },
];
