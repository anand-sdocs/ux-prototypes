/**
 * Mock data for the "create a snippet" mockup: built-in runtime variables
 * always available to any template/snippet, plus the data-type options
 * offered when a user defines their own custom variable.
 */

const RUNTIME_FIELDS = [
  { apiName: "CompanyName", label: "Company name", type: "text" },
  { apiName: "Date", label: "Date", type: "date" },
  { apiName: "Datetime", label: "Datetime", type: "datetime" },
  { apiName: "CurrentUserEmail", label: "Current user's email", type: "text" }
];

const DATA_TYPES = [
  { value: "text", label: "Text", icon: "T" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "number", label: "Number", icon: "#" },
  { value: "image", label: "Image", icon: "🖼" }
];

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "text", label: "T" },
  { key: "number", label: "#" },
  { key: "date", label: "📅" }
];
