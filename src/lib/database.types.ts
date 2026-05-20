// Database types for Maestro ABM — Campanhas & Integrações

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: CampaignRow;
        Insert: CampaignInsert;
        Update: CampaignUpdate;
      };
      campaign_accounts: {
        Row: CampaignAccountRow;
        Insert: CampaignAccountInsert;
        Update: CampaignAccountUpdate;
      };
      target_accounts: {
        Row: TargetAccountRow;
        Insert: TargetAccountInsert;
        Update: TargetAccountUpdate;
      };
      integrations: {
        Row: IntegrationRow;
        Insert: IntegrationInsert;
        Update: IntegrationUpdate;
      };
      linkedin_ad_accounts: {
        Row: LinkedInAdAccountRow;
        Insert: LinkedInAdAccountInsert;
        Update: LinkedInAdAccountUpdate;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// =====================
// Campaigns
// =====================
export interface CampaignRow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  type: '1:1' | '1:Many';
  objective: string | null;
  campaign_group: string | null;
  budget_type: 'daily' | 'total';
  budget_amount: number;
  spent: number;
  impressions: number;
  clicks: number;
  bidding_strategy: 'cost_efficient' | 'standard' | 'aggressive';
  optimize_audience: boolean;
  linkedin_campaign_group_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignInsert = Omit<CampaignRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type CampaignUpdate = Partial<CampaignInsert>;

// =====================
// Campaign <-> Account (junction)
// =====================
export interface CampaignAccountRow {
  id: string;
  campaign_id: string;
  account_id: string;
  linkedin_campaign_id: string | null;
  linkedin_validation_status: 'pending' | 'validated' | 'failed';
  linkedin_organization_urn: string | null;
  linkedin_audience_size: number | null;
  linkedin_estimated_reach_min: number | null;
  linkedin_estimated_reach_max: number | null;
  linkedin_suggested_bid: number | null;
  bidding_override: string | null;
  creative_variant: 'generic' | 'named';
  creative_headline: string | null;
  creative_body: string | null;
  creative_cta: string | null;
  creative_image_url: string | null;
  targeting_seniorities: string[] | null;
  targeting_job_functions: string[] | null;
  targeting_job_titles: string[] | null;
  status: 'draft' | 'ready' | 'launching' | 'live' | 'paused' | 'error';
  error_message: string | null;
  created_at: string;
}

export type CampaignAccountInsert = Omit<CampaignAccountRow, 'id' | 'created_at'> & {
  id?: string;
};
export type CampaignAccountUpdate = Partial<CampaignAccountInsert>;

// =====================
// Target Accounts
// =====================
export interface TargetAccountRow {
  id: string;
  source: 'maestro_crm' | 'linkedin_manual';
  name: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  engagement: number | null;
  employees: number | null;
  active_plays: boolean;
  last_touch: string | null;
  linkedin_urn: string | null;
  buying_committee: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
}

export type TargetAccountInsert = Omit<TargetAccountRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type TargetAccountUpdate = Partial<TargetAccountInsert>;

// =====================
// Integrations (OAuth tokens & config)
// =====================
export interface IntegrationRow {
  id: string;
  provider: 'linkedin' | 'salesforce' | 'hubspot' | 'slack';
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  account_name: string | null;
  account_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationInsert = Omit<IntegrationRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type IntegrationUpdate = Partial<IntegrationInsert>;

// =====================
// LinkedIn Ad Accounts
// =====================
export interface LinkedInAdAccountRow {
  id: string;
  integration_id: string;
  linkedin_account_id: string;
  name: string;
  currency: string;
  status: 'ACTIVE' | 'DRAFT' | 'CANCELED';
  total_budget: number | null;
  created_at: string;
  updated_at: string;
}

export type LinkedInAdAccountInsert = Omit<LinkedInAdAccountRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type LinkedInAdAccountUpdate = Partial<LinkedInAdAccountInsert>;
