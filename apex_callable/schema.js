/**
 * Mock Salesforce Schema Definitions and Registered Apex Classes for the mockup
 */
const SALESFORCE_SCHEMA = {
  Opportunity: {
    label: "Opportunity",
    apiName: "Opportunity",
    fields: [
      { apiName: "Id", label: "Opportunity ID", type: "id" },
      { apiName: "Name", label: "Opportunity Name", type: "string" },
      { apiName: "AccountId", label: "Account ID", type: "reference", referenceTo: "Account", relationshipName: "Account" },
      { apiName: "Amount", label: "Amount", type: "currency" },
      { apiName: "CloseDate", label: "Close Date", type: "date" },
      { apiName: "StageName", label: "Stage", type: "picklist" },
      { apiName: "Probability", label: "Probability (%)", type: "percent" },
      { apiName: "Description", label: "Description", type: "string" },
      { apiName: "OwnerId", label: "Owner ID", type: "reference", referenceTo: "User", relationshipName: "Owner" }
    ]
  }
};

const MOCK_APEX_CLASSES = [
  {
    name: "GetAccountContactDetails",
    label: "GetAccountContactDetails",
    description: "Fetches details of the primary Contact for the parent Account including name, email, and address info.",
    inputs: [
      { name: "accountId", label: "Account ID", type: "id", required: true },
      { name: "includeInactive", label: "Include Inactive?", type: "boolean", required: false }
    ],
    outputs: [
      { apiName: "FirstName", label: "First Name", type: "string" },
      { apiName: "LastName", label: "Last Name", type: "string" },
      { apiName: "Email", label: "Email", type: "string" },
      { apiName: "Phone", label: "Phone", type: "string" }
    ],
    sampleResults: [
      { FirstName: "John", LastName: "Doe", Email: "johndoe@acme.com", Phone: "555-0199" },
      { FirstName: "Jane", LastName: "Smith", Email: "janesmith@acme.com", Phone: "555-0231" }
    ]
  },
  {
    name: "CalculateOpportunityScores",
    label: "CalculateOpportunityScores",
    description: "Calculates predictive scoring analytics based on amount, stage history, and ownership tenure.",
    inputs: [
      { name: "opportunityId", label: "Opportunity ID", type: "id", required: true },
      { name: "modelType", label: "Scoring Model", type: "string", required: false }
    ],
    outputs: [
      { apiName: "Score", label: "Predictive Score", type: "number" },
      { apiName: "ConfidenceLevel", label: "Confidence Level", type: "string" },
      { apiName: "LastCalculated", label: "Last Calculation Date", type: "date" }
    ],
    sampleResults: [
      { Score: "88.5", ConfidenceLevel: "HIGH", LastCalculated: "2026-06-03" }
    ]
  },
  {
    name: "GenerateCustomerPDFData",
    label: "GenerateCustomerPDFData",
    description: "Compiles aggregate customer metadata including lifetime value and active campaign stats.",
    inputs: [
      { name: "customerId", label: "Customer Account ID", type: "id", required: true },
      { name: "fiscalYear", label: "Fiscal Year", type: "number", required: true }
    ],
    outputs: [
      { apiName: "LifetimeValue", label: "Customer Lifetime Value", type: "currency" },
      { apiName: "ActiveCampaigns", label: "Active Campaigns Count", type: "number" },
      { apiName: "TierStatus", label: "Loyalty Tier", type: "string" }
    ],
    sampleResults: [
      { LifetimeValue: "$125,000.00", ActiveCampaigns: "4", TierStatus: "PLATINUM" }
    ]
  }
];
