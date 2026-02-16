import { PipedreamClient } from '@pipedream/sdk';

let _pd: PipedreamClient | undefined;

export function pdClient(): PipedreamClient {
  if (_pd) return _pd;
  _pd = new PipedreamClient();
  return _pd;
}

/**
 * Generate headers for authenticating with Pipedream's remote MCP server.
 * These headers tell Pipedream which project/user to scope tools for.
 */
export const pdHeaders = async (externalUserId: string) => {
  const accessToken = await pdClient().rawAccessToken;

  return {
    Authorization: `Bearer ${accessToken}`,
    'x-pd-project-id': process.env.PIPEDREAM_PROJECT_ID || '',
    'x-pd-environment': process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development',
    'x-pd-external-user-id': externalUserId,
    'x-pd-tool-mode': 'full-config',
    'x-pd-app-discovery': 'true',
  };
};
