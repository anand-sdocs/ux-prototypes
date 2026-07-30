/**
 * Mock Salesforce Schema Definitions for the drawing prototype
 * Structuring fields with their API Names, Labels, Types, and Lookup relationships.
 */
const SALESFORCE_SCHEMA = {
  Opportunity: {
    label: "Opportunity",
    apiName: "Opportunity",
    fields: [
      { apiName: "Id", label: "Opportunity ID", type: "id" },
      { apiName: "IsDeleted", label: "Deleted", type: "boolean" },
      { apiName: "IsPrivate", label: "Private", type: "boolean" },
      { apiName: "Name", label: "Name", type: "string" },
      { apiName: "Description", label: "Description", type: "string" },
      { apiName: "StageName", label: "Stage", type: "picklist" },
      { apiName: "Amount", label: "Amount", type: "currency" },
      { apiName: "Probability", label: "Probability (%)", type: "percent" },
      { apiName: "ExpectedRevenue", label: "Expected Amount", type: "currency" },
      { apiName: "CloseDate", label: "Close Date", type: "date" },
      { apiName: "AccountId", label: "Account", type: "reference", referenceTo: "Account", relationshipName: "Account" },
      { apiName: "CampaignId", label: "Campaign", type: "reference", referenceTo: "Campaign", relationshipName: "Campaign" },
      { apiName: "OwnerId", label: "Owner", type: "reference", referenceTo: "User", relationshipName: "Owner" }
    ]
  },
  Account: {
    label: "Account",
    apiName: "Account",
    fields: [
      { apiName: "Id", label: "Account ID", type: "id" },
      { apiName: "Name", label: "Account Name", type: "string" },
      { apiName: "AccountNumber", label: "Account Number", type: "string" },
      { apiName: "Type", label: "Account Type", type: "picklist" },
      { apiName: "Industry", label: "Industry", type: "picklist" },
      { apiName: "AnnualRevenue", label: "Annual Revenue", type: "currency" },
      { apiName: "BillingCity", label: "Billing City", type: "string" },
      { apiName: "BillingState", label: "Billing State/Province", type: "string" },
      { apiName: "Phone", label: "Phone", type: "phone" },
      { apiName: "Website", label: "Website", type: "url" }
    ]
  },
  User: {
    label: "User",
    apiName: "User",
    fields: [
      { apiName: "Id", label: "User ID", type: "id" },
      { apiName: "FirstName", label: "First Name", type: "string" },
      { apiName: "LastName", label: "Last Name", type: "string" },
      { apiName: "Email", label: "Email", type: "email" },
      { apiName: "Username", label: "Username", type: "string" }
    ]
  }
};

const RUNTIME_FIELDS = [
  { apiName: "PageNumber", label: "Page Number", type: "number" },
  { apiName: "TotalPages", label: "Total Pages", type: "number" },
  { apiName: "CurrentDate", label: "Current Date", type: "date" },
  { apiName: "CurrentDateTime", label: "Current Date/Time", type: "date" }
];
