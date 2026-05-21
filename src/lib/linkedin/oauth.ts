// LinkedIn OAuth flow + integration status.

import { SERVER_BASE, LINKEDIN_REDIRECT_URI, headers } from './client';

export interface LinkedInIntegrationStatus {
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  provider: string;
  connected_at?: string;
  expires_at?: string;
  scopes?: string[];
  account_name?: string;
  account_id?: string;
  selected_ad_account_id?: string;
  selected_ad_account_name?: string;
  selected_ad_account_currency?: string;
  error?: string;
}

export async function getLinkedInAuthUrl(redirectUri?: string, state?: string): Promise<string> {
  const effectiveRedirect = redirectUri || LINKEDIN_REDIRECT_URI;

  console.log('[LinkedIn] Using redirect_uri:', effectiveRedirect);
  console.log('[LinkedIn] Current window.location.origin:', window.location.origin);

  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/auth-url`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        redirect_uri: effectiveRedirect,
        state: state || crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[LinkedIn] Erro ao gerar auth URL:', err);
      return buildFallbackAuthUrl(effectiveRedirect, state);
    }

    const data = await response.json();
    return data.auth_url;
  } catch (err: any) {
    console.error('[LinkedIn] Falha na chamada auth-url:', err);
    return buildFallbackAuthUrl(effectiveRedirect, state);
  }
}

function buildFallbackAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'CONFIGURE_NO_SERVIDOR',
    redirect_uri: redirectUri,
    scope: 'r_ads r_ads_reporting rw_ads r_organization_social',
    state: state || crypto.randomUUID(),
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri?: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
} | null> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/oauth-callback`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri || LINKEDIN_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[LinkedIn] Token exchange falhou:', err);
      return null;
    }

    return await response.json();
  } catch (err: any) {
    console.error('[LinkedIn] Token exchange erro:', err);
    return null;
  }
}

export async function getLinkedInStatus(): Promise<LinkedInIntegrationStatus> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/status`, {
      headers: headers(),
    });

    if (!response.ok) {
      return { status: 'disconnected', provider: 'linkedin' };
    }

    return await response.json();
  } catch (err: any) {
    console.error('[LinkedIn] Status check falhou:', err);
    return { status: 'error', provider: 'linkedin', error: err.message };
  }
}

export async function disconnectLinkedIn(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/disconnect`, {
      method: 'POST',
      headers: headers(),
    });
    return response.ok;
  } catch (err: any) {
    console.error('[LinkedIn] Disconnect falhou:', err);
    return false;
  }
}
