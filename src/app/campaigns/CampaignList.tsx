import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  PlayCircle, 
  PauseCircle, 
  Pencil, 
  Trash2, 
  BarChart3, 
  Calendar,
  Wallet,
  Loader2,
  Linkedin,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  fetchLinkedInCampaigns, 
  fetchCampaignAnalyticsSummary, 
  getLinkedInStatus,
  activateCampaign,
  pauseCampaign,
  archiveCampaign,
} from '@/lib/linkedin';
import type { LinkedInCampaign, CampaignAnalyticsSummary } from '@/lib/linkedin';
import { MOCK_CAMPAIGN, MOCK_CAMPAIGN_SUMMARY, MOCK_CAMPAIGN_ID, isMockCampaign } from '@/lib/mockCampaignData';

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  type: string;
  budget: number;
  budgetCurrency: string;
  budgetType: 'daily' | 'total';
  startDate: number | null;
  endDate: number | null;
  analytics?: CampaignAnalyticsSummary | null;
  analyticsLoading?: boolean;
  actionLoading?: boolean;
}

function mapCampaignToRow(c: LinkedInCampaign, currency: string): CampaignRow {
  const budget = c.totalBudget || c.dailyBudget;
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    type: c.type,
    budget: budget ? parseFloat(budget.amount) : 0,
    budgetCurrency: budget?.currency || currency,
    budgetType: c.totalBudget ? 'total' : 'daily',
    startDate: c.runSchedule?.start || null,
    endDate: c.runSchedule?.end || null,
    analytics: undefined,
    analyticsLoading: false,
    actionLoading: false,
  };
}

function formatDate(ts: number | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === 'BRL' ? 'R$' : '$';
  return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getDaysActive(startTs: number | null): number | null {
  if (!startTs) return null;
  const diff = Date.now() - startTs;
  if (diff < 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Confirmation Dialog
function ConfirmDialog({ 
  title, message, confirmLabel, confirmColor, onConfirm, onCancel 
}: { 
  title: string; message: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm ${confirmColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CampaignList() {
  const navigate = useNavigate();
  const onCreateCampaign = () => navigate('/campaigns/new');
  const onEditCampaign = (id: string) => navigate(`/campaigns/${id}/edit`);
  const onViewPerformance = (id: string) => navigate(`/campaigns/${id}`);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'pause' | 'activate' | 'delete';
    campaign: CampaignRow;
  } | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const status = await getLinkedInStatus();
      const isConnected = status?.status === 'connected' && !!status.selected_ad_account_id;
      setLinkedinConnected(isConnected);

      // Always create mock campaign row
      const mockRow: CampaignRow = mapCampaignToRow(MOCK_CAMPAIGN, 'BRL');
      mockRow.analytics = MOCK_CAMPAIGN_SUMMARY;
      mockRow.analyticsLoading = false;

      if (!isConnected) {
        // Show only mock campaign when LinkedIn is not connected
        setCampaigns([mockRow]);
        setLoading(false);
        return;
      }

      const { campaigns: liCampaigns, currency } = await fetchLinkedInCampaigns();
      const rows = liCampaigns.map(c => mapCampaignToRow(c, currency));
      // Prepend mock campaign
      const allRows = [mockRow, ...rows];
      setCampaigns(allRows);

      const toFetch = rows.filter(r => r.status === 'Active' || r.status === 'Paused');
      if (toFetch.length > 0) {
        setCampaigns(prev => prev.map(r =>
          toFetch.some(t => t.id === r.id) ? { ...r, analyticsLoading: true } : r
        ));

        const results = await Promise.allSettled(
          toFetch.map(async (row) => {
            const summary = await fetchCampaignAnalyticsSummary(row.id);
            return { id: row.id, summary };
          })
        );

        setCampaigns(prev => {
          const updated = [...prev];
          for (const result of results) {
            if (result.status === 'fulfilled') {
              const idx = updated.findIndex(r => r.id === result.value.id);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], analytics: result.value.summary, analyticsLoading: false };
              }
            }
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('[CampaignList] Erro ao carregar campanhas:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Handle pause/activate
  const handleToggleStatus = async (campaign: CampaignRow) => {
    setConfirmAction(null);
    
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, actionLoading: true } : c));

    const isPausing = campaign.status === 'Active';
    
    try {
      const result = isPausing
        ? await pauseCampaign({ campaign_id: campaign.id, linkedin_campaign_id: campaign.id })
        : await activateCampaign({ campaign_id: campaign.id, linkedin_campaign_id: campaign.id });

      if (result.success) {
        const newStatus = isPausing ? 'Paused' : 'Active';
        setCampaigns(prev => prev.map(c => 
          c.id === campaign.id ? { ...c, status: newStatus, actionLoading: false } : c
        ));
        toast.success(isPausing 
          ? `Campanha "${campaign.name}" pausada com sucesso.`
          : `Campanha "${campaign.name}" ativada com sucesso.`
        );
      } else {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, actionLoading: false } : c));
        toast.error(`Erro ao ${isPausing ? 'pausar' : 'ativar'} campanha: ${result.error}`);
      }
    } catch (err: any) {
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, actionLoading: false } : c));
      toast.error(`Erro de rede ao ${isPausing ? 'pausar' : 'ativar'} campanha.`);
      console.error('[CampaignList] Toggle status error:', err);
    }
  };

  // Handle delete (archive)
  const handleDeleteCampaign = async (campaign: CampaignRow) => {
    setConfirmAction(null);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, actionLoading: true } : c));

    try {
      const result = await archiveCampaign({ campaign_id: campaign.id, linkedin_campaign_id: campaign.id });
      if (result.success) {
        setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
        toast.success(`Campanha "${campaign.name}" excluída (arquivada) com sucesso.`);
      } else {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, actionLoading: false } : c));
        toast.error(`Erro ao excluir campanha: ${result.error}`);
      }
    } catch (err: any) {
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, actionLoading: false } : c));
      toast.error('Erro de rede ao excluir campanha.');
      console.error('[CampaignList] Delete error:', err);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const statusLower = c.status.toLowerCase();
    const matchesFilter = filter === 'all' || statusLower === filter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-50 text-green-700 border-green-200';
      case 'Paused': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Completed': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Canceled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Summary counters
  const activeCount = campaigns.filter(c => c.status === 'Active').length;
  const pausedCount = campaigns.filter(c => c.status === 'Paused').length;
  const totalSpend = campaigns.reduce((s, c) => s + (c.analytics?.cost || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campanhas</h1>
          <p className="text-sm text-slate-500">
            {campaigns.length > 0 
              ? `${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} • ${activeCount} ativa${activeCount !== 1 ? 's' : ''} • ${pausedCount} pausada${pausedCount !== 1 ? 's' : ''}`
              : 'Gerencie suas campanhas ABM ativas e passadas.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadCampaigns}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={onCreateCampaign}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5F39] text-white rounded-lg text-sm font-medium hover:bg-[#E54A26] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Campanha
          </button>
        </div>
      </div>

      {/* Banner: LinkedIn not connected */}
      {linkedinConnected === false && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">LinkedIn Ads não conectado</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Conecte o LinkedIn Ads nas <span className="font-semibold">Integrações</span> para ver suas campanhas reais.
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar campanhas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'active', label: 'Ativas' },
            { key: 'paused', label: 'Pausadas' },
            { key: 'draft', label: 'Rascunho' },
            { key: 'completed', label: 'Concluídas' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === s.key 
                  ? 'bg-[#FFF1ED] text-[#E54A26] border border-[#FFD0C2]' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Campanha</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Orçamento / Gasto</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Performance</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Período</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <>
                  {[1,2,3].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-5 w-48 bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-5 w-32 bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded animate-pulse ml-auto"></div></td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && filteredCampaigns.map((campaign) => {
                const daysActive = getDaysActive(campaign.startDate);
                const spent = campaign.analytics?.cost || 0;
                const budgetPct = campaign.budget > 0 ? Math.min((spent / campaign.budget) * 100, 100) : 0;

                return (
                  <tr key={campaign.id} className="hover:bg-slate-50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{campaign.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0077b5] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            <Linkedin className="w-2.5 h-2.5" />
                            LinkedIn
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                        {campaign.actionLoading && (
                          <Loader2 className="w-3.5 h-3.5 text-[#FF5F39] animate-spin" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm font-medium text-slate-900">
                          <Wallet className="w-3.5 h-3.5 text-slate-400" />
                          {formatCurrency(campaign.budget, campaign.budgetCurrency)}
                          <span className="text-xs text-slate-400 font-normal ml-1">
                            ({campaign.budgetType === 'daily' ? '/dia' : 'total'})
                          </span>
                        </div>
                        {campaign.budget > 0 && (
                          <>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#FF5F39] rounded-full" 
                                style={{ width: `${budgetPct}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-500">
                              {budgetPct.toFixed(0)}% consumido
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {campaign.status === 'Draft' ? (
                        <span className="text-xs text-slate-400 italic">Sem dados</span>
                      ) : campaign.analyticsLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Carregando...
                        </div>
                      ) : campaign.analytics ? (
                        <div className="space-y-1">
                          <div className="flex gap-4">
                            <div className="text-xs">
                              <span className="text-slate-500 block">Impr.</span>
                              <span className="font-semibold text-slate-700">{campaign.analytics.impressions.toLocaleString()}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-slate-500 block">Clicks</span>
                              <span className="font-semibold text-slate-700">{campaign.analytics.clicks.toLocaleString()}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-slate-500 block">CTR</span>
                              <span className="font-semibold text-slate-700">{campaign.analytics.ctr}%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem dados</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(campaign.startDate)}
                        </div>
                        {campaign.endDate && (
                          <div className="text-xs text-slate-500 pl-6">
                            até {formatDate(campaign.endDate)}
                          </div>
                        )}
                        {daysActive !== null && campaign.status !== 'Draft' && (
                          <div className="text-xs text-slate-400 pl-6">
                            {daysActive} dias ativa
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {campaign.status === 'Active' ? (
                          <button 
                            onClick={() => setConfirmAction({ type: 'pause', campaign })}
                            disabled={campaign.actionLoading}
                            className="p-1.5 text-slate-500 hover:text-yellow-600 hover:bg-yellow-50 rounded disabled:opacity-40" 
                            title="Pausar"
                          >
                            <PauseCircle className="w-4 h-4" />
                          </button>
                        ) : campaign.status === 'Paused' ? (
                          <button 
                            onClick={() => setConfirmAction({ type: 'activate', campaign })}
                            disabled={campaign.actionLoading}
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-40" 
                            title="Ativar"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button 
                          onClick={() => onViewPerformance(campaign.id)}
                          className="p-1.5 text-slate-500 hover:text-[#FF5F39] hover:bg-[#FFF1ED] rounded" 
                          title="Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        {!isMockCampaign(campaign.id) && (
                          <button 
                            onClick={() => setConfirmAction({ type: 'delete', campaign })}
                            disabled={campaign.actionLoading}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40" 
                            title="Excluir (Arquivar)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma campanha encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === 'delete' ? 'Excluir Campanha'
            : confirmAction.type === 'pause' ? 'Pausar Campanha'
            : 'Ativar Campanha'
          }
          message={
            confirmAction.type === 'delete'
              ? `Deseja excluir a campanha "${confirmAction.campaign.name}"? A campanha será arquivada no LinkedIn e não poderá ser reativada. Esta ação não pode ser desfeita.`
              : confirmAction.type === 'pause'
              ? `Deseja pausar a campanha "${confirmAction.campaign.name}"? A campanha deixará de exibir anúncios até ser reativada.`
              : `Deseja ativar a campanha "${confirmAction.campaign.name}"? A campanha começará a exibir anúncios e consumir orçamento.`
          }
          confirmLabel={
            confirmAction.type === 'delete' ? 'Excluir'
            : confirmAction.type === 'pause' ? 'Pausar'
            : 'Ativar'
          }
          confirmColor={
            confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700'
            : confirmAction.type === 'pause' ? 'bg-yellow-600 hover:bg-yellow-700'
            : 'bg-green-600 hover:bg-green-700'
          }
          onConfirm={() => {
            if (confirmAction.type === 'delete') {
              handleDeleteCampaign(confirmAction.campaign);
            } else {
              handleToggleStatus(confirmAction.campaign);
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}