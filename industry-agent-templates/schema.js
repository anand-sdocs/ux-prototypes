// Mock data model for the industry-agent-templates prototype.
// Self-contained — narratively references sdocs-agent-builder's Skills
// library (same skill names/categories) but does not share code or state
// with it. Everything here is static/seeded; there is no backend.

const INDUSTRIES = [
  { id: 'financial-services', name: 'Financial Services', color: '#0176d3', letter: 'F' },
  { id: 'healthcare', name: 'Healthcare', color: '#2e7d32', letter: 'H' },
  { id: 'public-sector', name: 'Public Sector', color: '#7d3ac1', letter: 'P' },
  { id: 'legal-services', name: 'Legal Services', color: '#9c3848', letter: 'L' },
];

const TASK_TYPE_META = {
  extract: { label: 'Extract', color: '#0176d3' },
  generate: { label: 'Generate', color: '#7d3ac1' },
  analyze: { label: 'Analyze', color: '#b8860b' },
  save: { label: 'Save', color: '#2e7d32' },
  notify: { label: 'Notify', color: '#c62828' },
};

const CONNECTOR_META = {
  salesforce: { name: 'Salesforce', initials: 'SF', color: '#00a1e0' },
  slack: { name: 'Slack', initials: 'SL', color: '#611f69' },
  email: { name: 'Email (Gmail/Outlook)', initials: 'EM', color: '#c62828' },
  servicenow: { name: 'ServiceNow', initials: 'SN', color: '#81b5a1' },
  sheets: { name: 'Google Sheets', initials: 'GS', color: '#0f9d58' },
  gdrive: { name: 'Google Drive', initials: 'GD', color: '#0f9d58' },
};

const TRIGGER_META = {
  manual: { label: 'Manual', letter: 'M', color: '#5e6670' },
  slack: { label: 'Slack', letter: 'S', color: '#611f69' },
  email: { label: 'Email', letter: 'E', color: '#c62828' },
  webhook: { label: 'Webhook', letter: 'W', color: '#0176d3' },
  schedule: { label: 'Schedule', letter: 'T', color: '#2e7d32' },
};

// Each template's Analyze step (when present) names a skill that also
// exists in sdocs-agent-builder's shared Skills library — same categories
// and questions, kept in sync by hand since the two prototypes don't share
// code. See skillsLibraryLink() in app.js for the cross-link.
const TEMPLATES = [
  // ---------------- Financial Services ----------------
  {
    id: 'tmpl-aml-triage',
    industry: 'financial-services',
    name: 'KYC/AML Alert Triage Agent',
    tagline: 'Triages inbound AML alerts against a weighted risk playbook and routes anything that needs a human.',
    complianceTags: ['KYC', 'AML', 'BSA'],
    skillName: 'AML Risk Triage Skill',
    skillCategories: ['Customer Due Diligence', 'Transaction Risk'],
    suggestedTrigger: 'webhook',
    connectorsNeeded: ['salesforce', 'slack'],
    tasks: [
      { type: 'extract', summary: 'From the inbound alert &mdash; customer_id, transaction_id, transaction_amount, alert_type, alert_date' },
      { type: 'analyze', summary: 'AML Risk Triage Skill &mdash; Customer Due Diligence, Transaction Risk' },
      { type: 'notify', summary: 'Slack to #aml-compliance &mdash; only if risk is High', editable: { platform: 'slack', recipient: '#aml-compliance' } },
      { type: 'save', summary: 'Case disposition to Salesforce', editable: { platform: 'salesforce' } },
    ],
  },
  {
    id: 'tmpl-underwriting',
    industry: 'financial-services',
    name: 'Loan Document Underwriting Support Agent',
    tagline: 'Extracts loan file data and flags documentation gaps or risk indicators before it reaches an underwriter.',
    complianceTags: ['Reg B', 'TILA'],
    skillName: 'Underwriting Risk Skill',
    skillCategories: ['Documentation Completeness', 'Risk Indicators'],
    suggestedTrigger: 'email',
    connectorsNeeded: ['email', 'salesforce', 'sheets'],
    tasks: [
      { type: 'extract', summary: 'From the loan application &mdash; applicant_name, loan_amount, income, credit_score, ltv_ratio' },
      { type: 'analyze', summary: 'Underwriting Risk Skill &mdash; Documentation Completeness, Risk Indicators' },
      { type: 'notify', summary: 'Email to underwriting team &mdash; only if a risk indicator is flagged', editable: { platform: 'email', recipient: 'underwriting@acmecorp.com' } },
      { type: 'save', summary: 'Loan file to Salesforce', editable: { platform: 'salesforce' } },
    ],
  },
  {
    id: 'tmpl-reg-reporting',
    industry: 'financial-services',
    name: 'Regulatory Reporting Assistant',
    tagline: 'Compiles a periodic regulatory filing summary and routes it to compliance before the deadline.',
    complianceTags: ['SEC', 'FINRA'],
    skillName: null,
    skillCategories: [],
    suggestedTrigger: 'schedule',
    connectorsNeeded: ['salesforce', 'sheets', 'email'],
    tasks: [
      { type: 'generate', summary: 'Regulatory Filing Summary &mdash; positions, exceptions, and disclosures for the period' },
      { type: 'save', summary: 'Filing summary to Google Sheets compliance log', editable: { platform: 'sheets' } },
      { type: 'notify', summary: 'Email to compliance officer', editable: { platform: 'email', recipient: 'compliance@acmecorp.com' } },
    ],
  },

  // ---------------- Healthcare ----------------
  {
    id: 'tmpl-prior-auth',
    industry: 'healthcare',
    name: 'Prior Authorization Review Agent',
    tagline: 'Reviews an incoming PA request against medical necessity and payer policy before it reaches a care coordinator.',
    complianceTags: ['HIPAA', 'CMS'],
    skillName: 'Prior Authorization Review Skill',
    skillCategories: ['Medical Necessity', 'Payer Policy Compliance'],
    suggestedTrigger: 'email',
    connectorsNeeded: ['email', 'servicenow'],
    tasks: [
      { type: 'extract', summary: 'From clinical documentation &mdash; patient_id, procedure_code, diagnosis_code, clinical_notes, requested_service' },
      { type: 'analyze', summary: 'Prior Authorization Review Skill &mdash; Medical Necessity, Payer Policy Compliance' },
      { type: 'notify', summary: 'Slack to care coordinator &mdash; only if the request is flagged for review', editable: { platform: 'slack', recipient: '#care-coordination' } },
      { type: 'save', summary: 'Decision to ServiceNow case', editable: { platform: 'servicenow' } },
    ],
  },
  {
    id: 'tmpl-patient-intake',
    industry: 'healthcare',
    name: 'Patient Intake Extraction Agent',
    tagline: 'Pulls structured fields off every intake form submitted and flags anything incomplete before check-in.',
    complianceTags: ['HIPAA'],
    skillName: null,
    skillCategories: [],
    suggestedTrigger: 'webhook',
    connectorsNeeded: ['email', 'servicenow'],
    tasks: [
      { type: 'extract', summary: 'From the intake form &mdash; patient_name, date_of_birth, insurance_id, reason_for_visit, allergies' },
      { type: 'save', summary: 'Intake record to ServiceNow', editable: { platform: 'servicenow' } },
      { type: 'notify', summary: 'Slack to front desk &mdash; only if a required field is missing', editable: { platform: 'slack', recipient: '#front-desk' } },
    ],
  },
  {
    id: 'tmpl-hipaa-baa',
    industry: 'healthcare',
    name: 'HIPAA BAA / Vendor Compliance Review Agent',
    tagline: "Reviews a vendor's Business Associate Agreement against standard HIPAA safeguard expectations.",
    complianceTags: ['HIPAA'],
    skillName: 'HIPAA BAA Review Skill',
    skillCategories: ['Data Handling & Safeguards', 'Breach Notification Obligations'],
    suggestedTrigger: 'manual',
    connectorsNeeded: ['gdrive', 'slack'],
    tasks: [
      { type: 'analyze', summary: 'HIPAA BAA Review Skill &mdash; Data Handling & Safeguards, Breach Notification Obligations' },
      { type: 'notify', summary: 'Slack to privacy officer &mdash; only if a safeguard is missing', editable: { platform: 'slack', recipient: '#privacy-office' } },
      { type: 'save', summary: 'Review outcome to Google Sheets compliance tracker', editable: { platform: 'sheets' } },
    ],
  },

  // ---------------- Public Sector ----------------
  {
    id: 'tmpl-benefits-eligibility',
    industry: 'public-sector',
    name: 'Benefits Eligibility Determination Agent',
    tagline: 'Checks an incoming application against income, household, and program eligibility criteria.',
    complianceTags: ['Title 45 CFR'],
    skillName: 'Benefits Eligibility Skill',
    skillCategories: ['Income & Household', 'Program-Specific Criteria'],
    suggestedTrigger: 'webhook',
    connectorsNeeded: ['email', 'servicenow'],
    tasks: [
      { type: 'extract', summary: 'From the application &mdash; applicant_name, household_size, annual_income, program_requested, residency_state' },
      { type: 'analyze', summary: 'Benefits Eligibility Skill &mdash; Income & Household, Program-Specific Criteria' },
      { type: 'notify', summary: 'Email to caseworker &mdash; only if the case is borderline', editable: { platform: 'email', recipient: 'caseworkers@agency.gov' } },
      { type: 'save', summary: 'Determination to ServiceNow', editable: { platform: 'servicenow' } },
    ],
  },
  {
    id: 'tmpl-foia-triage',
    industry: 'public-sector',
    name: 'FOIA Request Triage Agent',
    tagline: 'Screens inbound public records requests against exemption criteria and logs them for response tracking.',
    complianceTags: ['FOIA'],
    skillName: 'FOIA Exemption Review Skill',
    skillCategories: ['Exemption Review'],
    suggestedTrigger: 'email',
    connectorsNeeded: ['email', 'sheets'],
    tasks: [
      { type: 'extract', summary: 'From the request email &mdash; requester_name, request_date, records_requested, department' },
      { type: 'analyze', summary: 'FOIA Exemption Review Skill &mdash; Exemption Review' },
      { type: 'save', summary: 'Request logged to Google Sheets tracker', editable: { platform: 'sheets' } },
      { type: 'notify', summary: 'Email to records officer', editable: { platform: 'email', recipient: 'records-officer@agency.gov' } },
    ],
  },
  {
    id: 'tmpl-grant-compliance',
    industry: 'public-sector',
    name: 'Grant Compliance Review Agent',
    tagline: "Reviews a grantee's periodic report against reporting compliance and approved fund usage.",
    complianceTags: ['2 CFR 200'],
    skillName: 'Grant Compliance Review Skill',
    skillCategories: ['Reporting Compliance', 'Fund Usage Compliance'],
    suggestedTrigger: 'schedule',
    connectorsNeeded: ['email', 'sheets'],
    tasks: [
      { type: 'analyze', summary: 'Grant Compliance Review Skill &mdash; Reporting Compliance, Fund Usage Compliance' },
      { type: 'notify', summary: 'Email to program officer &mdash; only if an issue is found', editable: { platform: 'email', recipient: 'program-officer@agency.gov' } },
      { type: 'save', summary: 'Review outcome to Google Sheets grants log', editable: { platform: 'sheets' } },
    ],
  },

  // ---------------- Legal Services ----------------
  {
    id: 'tmpl-resume-extractor',
    industry: 'legal-services',
    name: 'Resume Extractor Agent',
    tagline: 'Pulls structured candidate fields off every resume received and files them for review.',
    complianceTags: ['EEOC'],
    skillName: null,
    skillCategories: [],
    suggestedTrigger: 'email',
    connectorsNeeded: ['email', 'sheets'],
    tasks: [
      { type: 'extract', summary: 'From the resume &mdash; candidate_name, address, education, work_experience, skills' },
      { type: 'save', summary: 'Candidate record to Google Sheets tracker', editable: { platform: 'sheets' } },
      { type: 'notify', summary: 'Email to recruiting team &mdash; only if a required field is missing', editable: { platform: 'email', recipient: 'recruiting@lawfirm.com' } },
    ],
  },
  {
    id: 'tmpl-i140-prep',
    industry: 'legal-services',
    name: 'I-140 Preparation Agent',
    tagline: "Prepares an I-140 immigrant petition filing packet from the beneficiary's case data across your systems.",
    complianceTags: ['USCIS', 'Immigration'],
    skillName: null,
    skillCategories: [],
    suggestedTrigger: 'manual',
    connectorsNeeded: ['gdrive', 'salesforce', 'email'],
    tasks: [
      { type: 'generate', summary: 'I-140 Immigration Filing &mdash; beneficiary, petitioning company, job title, priority date, supporting evidence' },
      { type: 'save', summary: 'Filing packet to the case file in Salesforce', editable: { platform: 'salesforce' } },
      { type: 'notify', summary: 'Email to the reviewing attorney', editable: { platform: 'email', recipient: 'attorney-review@lawfirm.com' } },
    ],
  },
  {
    id: 'tmpl-passport-extractor',
    industry: 'legal-services',
    name: 'Passport Extractor Agent',
    tagline: 'Extracts identity fields off a passport page for the case file &mdash; and flags anything close to expiring.',
    complianceTags: ['Immigration'],
    skillName: null,
    skillCategories: [],
    suggestedTrigger: 'webhook',
    connectorsNeeded: ['email', 'gdrive'],
    tasks: [
      { type: 'extract', summary: 'From the passport page &mdash; legal_name, passport_number, citizenship, issue_date, expiration_date' },
      { type: 'save', summary: 'Identity record to the case file in Google Drive', editable: { platform: 'gdrive' } },
      { type: 'notify', summary: 'Email to paralegal &mdash; only if the passport expires within 6 months', editable: { platform: 'email', recipient: 'paralegal@lawfirm.com' } },
    ],
  },
];

// Seeded as already-activated, so the gallery shows what the post-activation
// state looks like without requiring the reviewer to activate something first.
const SEEDED_ACTIVATED = [
  { templateId: 'tmpl-prior-auth', activatedBy: 'Priya Shah', activatedAt: '3 days ago' },
];
