import { NextResponse } from 'next/server';
import { pdClient } from '@/lib/pd-client';
import { SOCIAL_PLATFORMS, EXTERNAL_USER_ID } from '@/lib/social/config';

export const maxDuration = 15;

/**
 * GET /api/social/accounts
 * Returns: { accounts: { platform: string, connected: boolean, accountId?: string, name?: string }[] }
 * 
 * Lists all social platforms and their connection status.
 */
export async function GET() {
  try {
    const client = pdClient();
    
    // Fetch all connected accounts for this user
    const { data: connectedAccounts } = await client.accounts.list({
      externalUserId: EXTERNAL_USER_ID,
      includeCredentials: false,
    });

    // Map platform config to connection status
    const accounts = Object.values(SOCIAL_PLATFORMS).map((platform) => {
      const connected = connectedAccounts?.find(
        (acc) => acc.app?.nameSlug === platform.appSlug
      );
      return {
        platform: platform.id,
        name: platform.name,
        icon: platform.icon,
        color: platform.color,
        connected: !!connected,
        accountId: connected?.id || null,
        accountName: connected?.name || null,
      };
    });

    return NextResponse.json({ accounts });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Social] Accounts list error:', err.message);
    
    // Return all platforms as disconnected if SDK fails
    const accounts = Object.values(SOCIAL_PLATFORMS).map((platform) => ({
      platform: platform.id,
      name: platform.name,
      icon: platform.icon,
      color: platform.color,
      connected: false,
      accountId: null,
      accountName: null,
    }));
    
    return NextResponse.json({ accounts, error: err.message });
  }
}
