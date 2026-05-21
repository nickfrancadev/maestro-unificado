import { useState, useEffect, useCallback } from 'react';
import {
  getLinkedInStatus,
  disconnectLinkedIn,
  exchangeLinkedInCode,
} from './linkedin';
import type { LinkedInIntegrationStatus } from './linkedin';

// Simplified integration data for components
export interface IntegrationInfo {
  provider: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  account_name?: string;
  connected_at?: string;
  expires_at?: string;
}

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([
    { provider: 'linkedin', status: 'disconnected' },
    { provider: 'salesforce', status: 'disconnected' },
    { provider: 'hubspot', status: 'disconnected' },
    { provider: 'slack', status: 'disconnected' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const liStatus = await getLinkedInStatus();
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === 'linkedin'
            ? {
                ...i,
                status: liStatus.status as IntegrationInfo['status'],
                account_name: liStatus.account_name,
                connected_at: liStatus.connected_at,
                expires_at: liStatus.expires_at,
              }
            : i
        )
      );
    } catch (err: any) {
      console.warn('[useIntegrations] Erro ao buscar status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getIntegration = useCallback(
    (provider: string): IntegrationInfo | undefined => {
      return integrations.find((i) => i.provider === provider);
    },
    [integrations]
  );

  const connectProvider = useCallback(
    async (
      provider: string,
      tokenData: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        account_name?: string;
      }
    ): Promise<boolean> => {
      if (provider === 'linkedin') {
        // Token already stored server-side during OAuth
        await fetchIntegrations();
        return true;
      }
      // Mock for other providers
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider
            ? { ...i, status: 'connected', account_name: tokenData.account_name }
            : i
        )
      );
      return true;
    },
    [fetchIntegrations]
  );

  const disconnectProvider = useCallback(
    async (provider: string): Promise<boolean> => {
      if (provider === 'linkedin') {
        const ok = await disconnectLinkedIn();
        if (ok) {
          await fetchIntegrations();
        }
        return ok;
      }
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider
            ? { ...i, status: 'disconnected', account_name: undefined }
            : i
        )
      );
      return true;
    },
    [fetchIntegrations]
  );

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return {
    integrations,
    loading,
    error,
    usingMock: false,
    fetchIntegrations,
    getIntegration,
    connectProvider,
    disconnectProvider,
  };
}
