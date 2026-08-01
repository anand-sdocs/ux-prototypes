/**
 * Mock data for the workspace-switcher prototype.
 *
 * Models the real customer / user / customer_user shape: a single login
 * identity (email) can be linked to more than one customer record (tenant),
 * e.g. a production org and its sandbox, or two unrelated customers.
 */

const WORKSPACES = [
  {
    id: "acme-prod",
    orgName: "Acme Corp",
    accountId: "sc-4a1e6c92-8b3d-4f77-9e21-1c7a5d3f9b04",
    platformId: "00D5f000000TZ3EAM",
    color: "#0176d3",
  },
  {
    id: "acme-sandbox",
    orgName: "Acme Corp",
    accountId: "sc-7d2f3a18-5c9e-4b62-8a45-9e0d2c1f6a77",
    platformId: "00D5f000000TZ3FBM",
    color: "#0176d3",
  },
  {
    id: "beta-prod",
    orgName: "Beta Industries",
    accountId: "sc-1f9b8e34-2a6d-4c81-b7f3-6e4a9d2c5b18",
    platformId: "00D8h000000RXY2EAG",
    color: "#e07b17",
  },
  {
    id: "singleton-prod",
    orgName: "Singleton Inc",
    accountId: "sc-9c3e7a21-4d8b-4f56-a123-8b2e6f1d9c40",
    platformId: "00D2k000000QWN9EAO",
    color: "#5c2d91",
  },
];

// Two demo identities, selectable from the prototype-control bar on the
// sign-in screen, so both the multi-workspace and single-workspace paths
// (skip the picker, go straight into the app) can be shown.
const LOGIN_SCENARIOS = {
  multi: {
    email: "anarasimhan@sdocs.com",
    name: "Anand Narasimhan",
    initials: "A",
    workspaceIds: ["acme-prod", "acme-sandbox", "beta-prod"],
  },
  single: {
    email: "jordan.lee@singletoninc.com",
    name: "Jordan Lee",
    initials: "J",
    workspaceIds: ["singleton-prod"],
  },
};

function getWorkspaceById(id) {
  return WORKSPACES.find((w) => w.id === id) || null;
}

// Shared markup for the identifying line shown on a workspace card -- the
// account id is what actually distinguishes two customer records that
// otherwise share an org name (e.g. a sandbox and its production org).
function workspaceIdentifierLine(ws) {
  return `${ws.accountId} (Platform Id: ${ws.platformId})`;
}
