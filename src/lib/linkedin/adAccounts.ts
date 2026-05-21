// LinkedIn ad account discovery, selection, billing check, and creation.

import { SERVER_BASE, headers } from './client';

export interface LinkedInAdAccount {
  id: string;
  name: string;
  currency: string;
  status: string;
}

export async function fetchLinkedInAdAccounts(): Promise<LinkedInAdAccount[]> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/ad-accounts`, {
      headers: headers(),
    });

    if (!response.ok) {
      console.warn('[LinkedIn] Ad accounts fallback');
      return [];
    }

    const data = await response.json();
    return data.accounts || [];
  } catch (err: any) {
    console.error('[LinkedIn] Ad accounts erro:', err);
    return [];
  }
}

export async function selectLinkedInAdAccount(
  adAccountId: string,
  adAccountName: string,
  adAccountCurrency?: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/select-ad-account`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        ad_account_id: adAccountId,
        ad_account_name: adAccountName,
        ad_account_currency: adAccountCurrency || null,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[LinkedIn] Select ad account falhou:', err);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[LinkedIn] Select ad account erro:', err);
    return false;
  }
}

export interface BillingStatus {
  has_billing: boolean;
  account_status: string;
  serving_statuses?: string[];
  account_name?: string;
  account_id?: string;
  currency?: string;
  error?: string;
}

export async function checkAdAccountBilling(): Promise<BillingStatus> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/ad-account-billing`, {
      headers: headers(),
    });

    if (!response.ok) {
      const data = await response.json();
      console.warn('[LinkedIn] Billing check failed:', data);
      return { has_billing: false, account_status: 'UNKNOWN', error: data.error };
    }

    return await response.json();
  } catch (err: any) {
    console.error('[LinkedIn] Billing check erro:', err);
    return { has_billing: false, account_status: 'ERROR', error: err.message };
  }
}

export interface CreateAdAccountParams {
  name: string;
  currency: string;
  reference?: string; // urn:li:organization:XXXXX
}

export interface CreateAdAccountResult {
  success: boolean;
  ad_account_id?: string;
  name?: string;
  currency?: string;
  error?: string;
}

export async function createLinkedInAdAccount(
  params: CreateAdAccountParams,
): Promise<CreateAdAccountResult> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/create-ad-account`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[LinkedIn] Create ad account failed:', data);
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return data;
  } catch (err: any) {
    console.error('[LinkedIn] Create ad account erro:', err);
    return { success: false, error: err.message };
  }
}
