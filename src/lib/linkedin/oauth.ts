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

// Só o servidor conhece o LINKEDIN_CLIENT_ID, então não existe URL de
// autorização válida montável no cliente. Falhar aqui é a única saída honesta:
// a versão antiga devolvia uma URL com client_id "CONFIGURE_NO_SERVIDOR" e o
// usuário caía numa tela do LinkedIn dizendo "The passed in client_id is
// invalid" — mensagem que aponta para o lugar errado quando a causa real é o
// backend inalcançável.
export async function getLinkedInAuthUrl(redirectUri?: string, state?: string): Promise<string> {
  const effectiveRedirect = redirectUri || LINKEDIN_REDIRECT_URI;

  let response: Response;
  try {
    response = await fetch(`${SERVER_BASE}/linkedin/auth-url`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        redirect_uri: effectiveRedirect,
        state: state || crypto.randomUUID(),
      }),
    });
  } catch (err: any) {
    throw new Error(
      `Não foi possível falar com o backend em ${SERVER_BASE}. ` +
        'Confira a configuração do Supabase e se a página está com a versão mais recente.',
    );
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err.error || `O servidor respondeu ${response.status} ao gerar a URL de autorização.`,
    );
  }

  const data = await response.json();
  if (!data.auth_url) {
    throw new Error('O servidor não retornou auth_url.');
  }
  return data.auth_url;
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
