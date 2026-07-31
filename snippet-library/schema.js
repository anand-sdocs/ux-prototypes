/**
 * Mock primary data source (Deal) schema and the reusable Snippet library
 * for the Snippet insertion + field-mapping UX mockup.
 */

const PRIMARY_SOURCE = {
  label: "Deal",
  apiName: "Deal__c"
};

const DEAL_FIELDS = [
  { apiName: "Name", label: "Deal Name", type: "string" },
  { apiName: "Amount", label: "Amount", type: "currency" },
  { apiName: "CloseDate", label: "Close Date", type: "date" },
  { apiName: "StageName", label: "Stage", type: "picklist" },
  { apiName: "OwnerName", label: "Deal Owner", type: "string" },
  { apiName: "Account.Name", label: "Account Name", type: "string" },
  { apiName: "Account.BillingStreet", label: "Billing Street", type: "string" },
  { apiName: "Account.BillingCity", label: "Billing City", type: "string" },
  { apiName: "Account.BillingState", label: "Billing State", type: "string" },
  { apiName: "Account.BillingPostalCode", label: "Billing Postal Code", type: "string" },
  { apiName: "Account.BillingCountry", label: "Billing Country", type: "string" },
  { apiName: "PrimaryContact.Name", label: "Primary Contact Name", type: "string" },
  { apiName: "PrimaryContact.Email", label: "Primary Contact Email", type: "string" },
  { apiName: "PrimaryContact.Phone", label: "Primary Contact Phone", type: "string" },
  { apiName: "PaymentTermsDays", label: "Payment Terms (Days)", type: "number" },
  { apiName: "InvoiceDate", label: "Invoice Date", type: "date" }
];

// A snippet is a reusable, preformatted block of content with {{ }} input
// placeholders. When inserted into a template, each placeholder must be
// mapped to a field on the template's primary data source.
const SNIPPETS = [
  {
    id: "customer_address",
    name: "Customer Address",
    description: "Preformatted mailing address block for the customer account.",
    category: "Address",
    lines: [
      "{{Company Name}}",
      "{{Street}}",
      "{{City}}, {{State}} {{Zip}}",
      "{{Country}}"
    ],
    inputs: [
      { name: "Company Name", required: true },
      { name: "Street", required: true },
      { name: "City", required: true },
      { name: "State", required: true },
      { name: "Zip", required: true },
      { name: "Country", required: false }
    ]
  },
  {
    id: "signature_block",
    name: "Signature Block",
    description: "Signature line with signer name, title, and date.",
    category: "Signature",
    lines: [
      "Signed by: {{Signer Name}}",
      "Title: {{Signer Title}}",
      "Date: {{Signature Date}}"
    ],
    inputs: [
      { name: "Signer Name", required: true },
      { name: "Signer Title", required: false },
      { name: "Signature Date", required: true }
    ]
  },
  {
    id: "payment_terms",
    name: "Payment Terms",
    description: "Standard payment terms paragraph referencing the deal amount and due date.",
    category: "Legal",
    lines: [
      "Payment of {{Amount}} is due within {{Payment Terms Days}} days of {{Invoice Date}}."
    ],
    inputs: [
      { name: "Amount", required: true },
      { name: "Payment Terms Days", required: true },
      { name: "Invoice Date", required: true }
    ]
  }
];
