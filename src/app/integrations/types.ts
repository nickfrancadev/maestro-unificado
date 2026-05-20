// Types shared across the integrations UI.

export type IntegrationStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export interface IntegrationData {
  provider: string;
  status: IntegrationStatus;
  connected_at?: string;
  expires_at?: string;
  account_name?: string;
  account_id?: string;
  scopes?: string[];
  selected_ad_account_id?: string;
  selected_ad_account_name?: string;
  selected_ad_account_currency?: string;
}

export interface IntegrationMeta {
  name: string;
  description: string;
  icon: string;
  permissions: string[];
  docsUrl: string;
}
