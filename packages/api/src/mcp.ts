/** The scoped MCP endpoint of the Orbit server at `origin` (docs/mcp.md). */
export function mcpUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/mcp`
}

/** The MCP clients that docs/mcp.md documents. */
export type McpClient = 'Claude' | 'Codex' | 'Grok'

/**
 * The terminal commands that add the Orbit MCP server to each supported client, in the order docs/mcp.md shows them.
 * `signIn` is English; the web app shows its own translation, keyed by `client`.
 */
export function mcpClientCommands(url: string): { client: McpClient; command: string; signIn: string }[] {
  return [
    { client: 'Claude', command: `claude mcp add --scope user --transport http orbit ${url}`, signIn: 'Start Claude, enter /mcp, select orbit and authenticate.' },
    { client: 'Codex', command: `codex mcp add orbit --url ${url}\ncodex mcp login orbit`, signIn: 'The login command opens Orbit in your browser.' },
    { client: 'Grok', command: `grok mcp add --scope user --transport http orbit ${url}`, signIn: 'Start Grok, enter /mcps and authenticate.' },
  ]
}

/** An MCP client the signed-in person approved (`GET /api/v1/oauth/grants`). */
export type OAuthConnection = { id: string; client_name: string; workspace_name: string; project_names: string[]; all_projects: boolean; scope: string; created_at: number }
