// Problem Details messages, keyed by the server's stable `code`. A code the server words in
// several ways holds one entry per wording; `problemMessage` picks the entry whose English text
// matches the server `detail`, so unknown wordings still show the server text.
export default {
  authentication_required: {
    session: 'A valid session is required.',
    invitedAccountExists: 'The invited account already exists. Sign in to accept this invitation.',
  },
  authentication_throttled: 'Too many authentication attempts were made. Try again later.',
  http_error: 'The server could not complete the request.',
  internal_error: 'An unexpected error occurred. Use the request ID when contacting support.',
  invalid_credentials: {
    login: 'Email or password is incorrect.',
    currentPassword: 'Current password is incorrect.',
  },
  invalid_display_name: 'Display name cannot be empty.',
  invalid_password: {
    length: 'Password must contain between 12 and 128 characters.',
    common: 'Choose a password that is not commonly used.',
  },
  invalid_recovery_token: 'The recovery token is invalid or expired.',
  invalid_registration: 'Email, display name, and a valid password are required.',
  invalid_request: {
    body: 'The request body is not valid for this endpoint.',
    query: 'The request query is not valid for this endpoint.',
  },
  invalid_setup_token: 'The setup token is invalid or expired.',
  invalid_workspace_name: 'Workspace names must contain between 1 and 200 characters.',
  invitation_email_mismatch: 'Sign in with the account matching the invitation email.',
  invitation_not_found: 'The invitation is invalid, expired, or no longer pending.',
  invitation_registration_throttled: 'Too many invitation registration attempts were made. Try again later.',
  setup_unavailable: 'This installation has already been initialized.',
  workspace_action_forbidden: 'Your workspace role does not permit this action.',
  workspace_conflict: 'The workspace operation conflicts with its current state.',
  workspace_resource_not_found: 'The requested workspace resource was not found.',
} as const
