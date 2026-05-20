import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  ExternalLink,
  Loader2,
  Shield,
  AlertTriangle,
  RefreshCw,
  Key,
  Wallet,
  BarChart3,
  Clock,
  Edit3,
} from 'lucide-react';
import { exchangeLinkedInCode, getLinkedInStatus, disconnectLinkedIn } from '@/lib/linkedin';
import { toast } from 'sonner';
import type { IntegrationData, IntegrationStatus } from './types';
import { INTEGRATION_META } from './providers';
import { getStatusBadge } from './statusBadge';
import { LinkedInConnectionModal } from './LinkedInConnectionModal';

export function Integrations() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([
    { provider: 'linkedin', status: 'disconnected' },
    { provider: 'salesforce', status: 'disconnected' },
    { provider: 'hubspot', status: 'disconnected' },
    { provider: 'slack', status: 'disconnected' },
  ]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedInModalMode, setLinkedInModalMode] = useState<'connect' | 'manage'>('connect');

  // Fetch LinkedIn status from server
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const liStatus = await getLinkedInStatus();
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === 'linkedin'
            ? {
                ...i,
                status: liStatus.status as IntegrationStatus,
                connected_at: liStatus.connected_at,
                expires_at: liStatus.expires_at,
                account_name: liStatus.account_name,
                account_id: liStatus.account_id,
                scopes: liStatus.scopes,
                selected_ad_account_id: liStatus.selected_ad_account_id,
                selected_ad_account_name: liStatus.selected_ad_account_name,
                selected_ad_account_currency: liStatus.selected_ad_account_currency,
              }
            : i
        )
      );
    } catch (err: any) {
      console.error('[Integrations] Erro ao buscar status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Check URL for OAuth callback code (redirect flow)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        setConnecting('linkedin');
        const result = await exchangeLinkedInCode(code);
        if (result) {
          toast.success('LinkedIn autorizado com sucesso!');
          await fetchStatus();
          // Open modal in selecting_account state
          setLinkedInModalMode('connect');
          setShowLinkedInModal(true);
        } else {
          toast.error('Falha no token exchange do LinkedIn.');
        }
        setConnecting(null);
      })();
    }
  }, [fetchStatus]);

  const handleConnect = async (provider: string) => {
    if (provider === 'linkedin') {
      setLinkedInModalMode('connect');
      setShowLinkedInModal(true);
      return;
    }
    // Others: simulate connection
    setConnecting(provider);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider
            ? { ...i, status: 'connected' as IntegrationStatus, account_name: `${INTEGRATION_META[provider]?.name} Account` }
            : i
        )
      );
      setConnecting(null);
      toast.success(`${INTEGRATION_META[provider]?.name} conectado com sucesso!`);
    }, 1500);
  };

  const handleManage = (provider: string) => {
    if (provider === 'linkedin') {
      setLinkedInModalMode('manage');
      setShowLinkedInModal(true);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setConnecting(provider);
    if (provider === 'linkedin') {
      const ok = await disconnectLinkedIn();
      if (ok) {
        toast.info('LinkedIn Ads desconectado.');
        await fetchStatus();
      } else {
        toast.error('Falha ao desconectar LinkedIn.');
      }
      setConnecting(null);
      return;
    }
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider
            ? { ...i, status: 'disconnected' as IntegrationStatus, account_name: undefined }
            : i
        )
      );
      setConnecting(null);
      toast.info(`${INTEGRATION_META[provider]?.name} desconectado.`);
    }, 800);
  };

  const linkedInData = integrations.find((i) => i.provider === 'linkedin');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hub de Integracoes</h2>
          <p className="text-slate-500 mt-1">
            Gerencie conexoes com servicos externos para potenciar suas campanhas ABM.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const meta = INTEGRATION_META[integration.provider];
          if (!meta) return null;

          const isLinkedIn = integration.provider === 'linkedin';
          const hasAdAccount = !!integration.selected_ad_account_id;
          const badge = getStatusBadge(integration.status, hasAdAccount);

          return (
            <div
              key={integration.provider}
              className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${
                isLinkedIn
                  ? integration.status === 'connected' && hasAdAccount
                    ? 'border-green-200 ring-1 ring-green-100'
                    : 'border-blue-200 ring-1 ring-blue-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-2">
                      <img
                        src={meta.icon}
                        alt={meta.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{meta.name}</h3>
                      {isLinkedIn && integration.status !== 'connected' && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          PRIORITARIO
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border ${badge.classes}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </div>
                </div>

                <p className="text-sm text-slate-500 mb-4 min-h-[40px]">{meta.description}</p>

                {/* Connected Info */}
                {integration.status === 'connected' && isLinkedIn && (
                  <div className={`${hasAdAccount ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'} border rounded-lg p-3 mb-4 space-y-1.5`}>
                    {hasAdAccount ? (
                      <>
                        <div className="flex items-center gap-2 text-xs text-green-700">
                          <Wallet className="w-3.5 h-3.5" />
                          <span className="font-semibold">Ad Account: {integration.selected_ad_account_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <Key className="w-3.5 h-3.5" />
                          <span>ID: {integration.selected_ad_account_id}</span>
                        </div>
                        {integration.selected_ad_account_currency && (
                          <div className="flex items-center gap-2 text-xs text-green-600">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Moeda: {integration.selected_ad_account_currency}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-medium">Nenhuma Ad Account selecionada. Clique em "Gerenciar Conexao" para selecionar.</span>
                      </div>
                    )}
                    {integration.expires_at && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Clock className="w-3.5 h-3.5" />
                        Token expira em {new Date(integration.expires_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                )}

                {integration.status === 'connected' && !isLinkedIn && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Shield className="w-3 h-3" />
                      <span className="font-medium">{integration.account_name}</span>
                    </div>
                  </div>
                )}

                {/* Permissions */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {isLinkedIn ? 'Scopes OAuth' : 'Permissoes'}
                  </p>
                  <ul className="space-y-1">
                    {meta.permissions.map((perm, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-600 flex items-center gap-2"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            integration.status === 'connected'
                              ? 'bg-green-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                {integration.status === 'connected' ? (
                  <div className="flex gap-2">
                    {isLinkedIn ? (
                      <button
                        onClick={() => handleManage(integration.provider)}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Gerenciar Conexao
                      </button>
                    ) : (
                      <button
                        onClick={() => window.open(meta.docsUrl, '_blank')}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Docs
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(integration.provider)}
                      disabled={connecting === integration.provider}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {connecting === integration.provider ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.provider)}
                    disabled={connecting === integration.provider}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all ${
                      isLinkedIn
                        ? 'bg-[#0077b5] text-white hover:bg-[#006097]'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {connecting === integration.provider ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Conectar {meta.name}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LinkedIn Connection Modal */}
      {showLinkedInModal && (
        <LinkedInConnectionModal
          mode={linkedInModalMode}
          currentStatus={linkedInData}
          onClose={() => setShowLinkedInModal(false)}
          onStatusRefresh={fetchStatus}
        />
      )}
    </div>
  );
}

