// Maestro-side campaign records (KV-persisted by the Edge Function).
// These are the local "ABM" representations that wrap LinkedIn campaign IDs
// with extra metadata (objective, type, group). Independent from the read
// models returned by the LinkedIn analytics endpoints.

import { SERVER_BASE, headers } from './client';

export interface MaestroCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  type: '1:1' | '1:Many';
  objective: string;
  campaign_group: string;
  budget_type: 'daily' | 'total';
  budget_amount: number;
  currency: string;
  spent: number;
  impressions: number;
  clicks: number;
  start_date: string | null;
  end_date: string | null;
  linkedin_campaign_group_id: string | null;
  linkedin_campaign_id: string | null;
  bidding_strategy: string;
  auto_activate: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchCampaignsFromServer(): Promise<MaestroCampaign[]> {
  try {
    const response = await fetch(`${SERVER_BASE}/campaigns`, {
      headers: headers(),
    });
    if (!response.ok) {
      console.warn('[Campaigns] Fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.campaigns || [];
  } catch (err: any) {
    console.error('[Campaigns] Fetch erro:', err);
    return [];
  }
}

export async function saveCampaignToServer(
  campaign: Partial<MaestroCampaign>,
): Promise<{ success: boolean; id?: string }> {
  try {
    const response = await fetch(`${SERVER_BASE}/campaigns`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(campaign),
    });
    if (!response.ok) {
      const err = await response.json();
      console.error('[Campaigns] Save failed:', err);
      return { success: false };
    }
    const data = await response.json();
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Campaigns] Save erro:', err);
    return { success: false };
  }
}

export async function deleteCampaignFromServer(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_BASE}/campaigns/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    return response.ok;
  } catch (err: any) {
    console.error('[Campaigns] Delete erro:', err);
    return false;
  }
}
