import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type {
  CampaignRow,
  CampaignInsert,
  CampaignUpdate,
  CampaignAccountInsert,
} from './database.types';

// Mock data fallback
const MOCK_CAMPAIGNS: CampaignRow[] = [
  {
    id: '1',
    name: 'Q1 Enterprise Tech - Nvidia & Peers',
    status: 'active',
    type: '1:Many',
    objective: 'Brand Awareness',
    campaign_group: 'H1 2026 ICP',
    budget_type: 'daily',
    budget_amount: 500,
    spent: 14500,
    impressions: 12500,
    clicks: 3200,
    bidding_strategy: 'standard',
    optimize_audience: true,
    linkedin_campaign_group_id: null,
    start_date: '2026-01-15',
    end_date: '2026-02-28',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Snowflake Renewal - 1:1 Outreach',
    status: 'paused',
    type: '1:1',
    objective: 'Lead Generation',
    campaign_group: 'Renewals Q1',
    budget_type: 'daily',
    budget_amount: 200,
    spent: 2100,
    impressions: 850,
    clicks: 120,
    bidding_strategy: 'cost_efficient',
    optimize_audience: false,
    linkedin_campaign_group_id: null,
    start_date: '2026-02-01',
    end_date: '2026-03-15',
    created_at: '2026-01-28T10:00:00Z',
    updated_at: '2026-02-20T10:00:00Z',
  },
  {
    id: '3',
    name: 'Fintech Sector Expansion',
    status: 'draft',
    type: '1:Many',
    objective: null,
    campaign_group: null,
    budget_type: 'daily',
    budget_amount: 0,
    spent: 0,
    impressions: 0,
    clicks: 0,
    bidding_strategy: 'standard',
    optimize_audience: true,
    linkedin_campaign_group_id: null,
    start_date: null,
    end_date: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: '4',
    name: 'Revolut Upsell Campaign',
    status: 'completed',
    type: '1:1',
    objective: 'Engagement',
    campaign_group: 'Upsell H2',
    budget_type: 'total',
    budget_amount: 8000,
    spent: 7950,
    impressions: 4500,
    clicks: 890,
    bidding_strategy: 'aggressive',
    optimize_audience: true,
    linkedin_campaign_group_id: null,
    start_date: '2025-12-01',
    end_date: '2025-12-31',
    created_at: '2025-11-25T10:00:00Z',
    updated_at: '2025-12-31T10:00:00Z',
  },
];

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setCampaigns(MOCK_CAMPAIGNS);
      setUsingMock(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        setCampaigns(data as CampaignRow[]);
        setUsingMock(false);
      } else {
        setCampaigns(MOCK_CAMPAIGNS);
        setUsingMock(true);
      }
    } catch (err: any) {
      console.warn('[Maestro] Falha ao buscar campanhas, usando mock:', err.message);
      setCampaigns(MOCK_CAMPAIGNS);
      setUsingMock(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = async (campaign: CampaignInsert): Promise<CampaignRow | null> => {
    if (!isSupabaseConfigured) {
      const newCampaign: CampaignRow = {
        ...campaign,
        id: `mock-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as CampaignRow;
      setCampaigns((prev) => [newCampaign, ...prev]);
      return newCampaign;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('campaigns')
        .insert(campaign as any)
        .select()
        .single();

      if (dbError) throw dbError;
      await fetchCampaigns();
      return data as CampaignRow;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const updateCampaign = async (id: string, updates: CampaignUpdate): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
        )
      );
      return true;
    }

    try {
      const { error: dbError } = await supabase
        .from('campaigns')
        .update(updates as any)
        .eq('id', id);

      if (dbError) throw dbError;
      await fetchCampaigns();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteCampaign = async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      return true;
    }

    try {
      const { error: dbError } = await supabase.from('campaigns').delete().eq('id', id);
      if (dbError) throw dbError;
      await fetchCampaigns();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    usingMock,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
