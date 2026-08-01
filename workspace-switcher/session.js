/**
 * Shared "logged in" session state, persisted in localStorage so it survives
 * navigation between the sign-in, workspace-picker, and app pages of this
 * prototype. Stands in for a real auth session cookie / JWT.
 *
 * Shape: { email, name, initials, workspaceIds: string[], currentWorkspaceId }
 */
const SESSION_KEY = "sdocs_workspace_switcher_session";

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (e) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
