import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  MousePointerClick,
  TrendingUp,
  Heart,
  Share2,
  MessageCircle,
  UserPlus,
  Target,
  Zap,
  Eye,
  Megaphone,
  Loader2,
  Info,
  AlertCircle,
  Trash2,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { fetchCampaignAnalyticsFull, fetchLinkedInCampaigns, fetchCampaignComments, archiveCampaign, aggregateAccounts } from '@/lib/linkedin';
import type { CampaignAnalyticsFull, LinkedInCampaign, CampaignComment, CampaignCommentsResponse, CampaignAnalyticsByAccount } from '@/lib/linkedin';
import { isMockCampaign, MOCK_CAMPAIGN, getMockAnalyticsFull, getMockComments, getMockAnalyticsByAccount, getMockCommentsByAccount } from '@/lib/mockCampaignData';
import { AccountAdPreview } from './AccountAdPreview';
import { AccountFocusSwitcher } from './AccountFocusSwitcher';
import { fmtCurrency, fmtNum, fmtDateLabel } from './format';
import { AccountComparisonChart } from './AccountComparisonChart';
import { AccountPerformanceTable } from './AccountPerformanceTable';
import { AccountDetailPanel } from './AccountDetailPanel';


const DATE_RANGES = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'all', label: 'Tudo' },
];

function fmtTimestamp(ts: number | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return `há ${Math.floor(days / 30)} mês${Math.floor(days / 30) > 1 ? 'es' : ''}`;
}

function avatarColor(name: string | null): string {
  if (!name) return 'bg-slate-400';
  const colors = ['bg-[#FF5F39]','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-purple-500','bg-cyan-500','bg-orange-500'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Active': return 'bg-green-50 text-green-700 border-green-200';
    case 'Paused': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Completed': return 'bg-purple-50 text-purple-700 border-purple-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

// Delta badge component
function DeltaBadge({ value }: { value: string | null | undefined }) {
  if (value === null || value === undefined) return null;
  const n = parseFloat(value);
  const isUp = n >= 0;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {isUp ? '+' : ''}{value}%
    </span>
  );
}

// Skeleton card
function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse ${className}`}><div className="h-4 w-20 bg-slate-100 rounded mb-3" /><div className="h-7 w-24 bg-slate-100 rounded" /></div>;
}

export function CampaignAnalytics() {
  const navigate = useNavigate();
  const { id: campaignId = '' } = useParams<{ id: string }>();
  const onBack = () => navigate('/campaigns');
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CampaignAnalyticsFull | null>(null);
  const [campaign, setCampaign] = useState<LinkedInCampaign | null>(null);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [commentsData, setCommentsData] = useState<CampaignCommentsResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [byAccount, setByAccount] = useState<CampaignAnalyticsByAccount | null>(null);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const gradientId = React.useId();
  const impressionsGradient = `gi-${gradientId}`;
  const clicksGradient = `gc-${gradientId}`;

  // Load campaign metadata
  useEffect(() => {
    if (isMockCampaign(campaignId)) {
      setCampaign(MOCK_CAMPAIGN);
      return;
    }
    fetchLinkedInCampaigns().then(({ campaigns }) => {
      const found = campaigns.find(c => c.id === campaignId);
      if (found) setCampaign(found);
    });
  }, [campaignId]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      if (isMockCampaign(campaignId)) {
        await new Promise(r => setTimeout(r, 400));
        const byAcc = getMockAnalyticsByAccount(dateRange);
        setByAccount(byAcc);
        setData(getMockAnalyticsFull(dateRange));
      } else {
        setByAccount(null);
        const result = await fetchCampaignAnalyticsFull(campaignId, dateRange);
        setData(result);
      }
    } catch (err) {
      console.error('[CampaignAnalytics] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, dateRange]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const openDetail = useCallback((accountId: string) => {
    setDetailAccountId(prev => (prev === accountId ? null : accountId)); // toggle: clicar na linha aberta fecha
    setFocusedAccountId(accountId); // coluna direita (anúncio + comentários) acompanha
  }, []);
  const closeDetail = useCallback(() => setDetailAccountId(null), []);

  // Handle delete (archive)
  const handleDelete = async () => {
    if (isMockCampaign(campaignId)) return;
    setDeleteLoading(true);
    try {
      const result = await archiveCampaign({ campaign_id: campaignId, linkedin_campaign_id: campaignId });
      if (result.success) {
        toast.success(`Campanha "${campaignName}" excluída (arquivada) com sucesso.`);
        onBack();
      } else {
        toast.error(`Erro ao excluir campanha: ${result.error}`);
      }
    } catch (err: any) {
      toast.error('Erro de rede ao excluir campanha.');
      console.error('[CampaignAnalytics] Delete error:', err);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const campaignName = campaign?.name || `Campaign ${campaignId}`;
  const statusLabel = campaign?.status || 'Unknown';
  const startDate = campaign?.runSchedule?.start || null;
  const endDate = campaign?.runSchedule?.end || null;
  const currency = data?.currency || 'BRL';
  const selectedRangeLabel = DATE_RANGES.find(r => r.key === dateRange)?.label || '30 dias';

  const accounts = byAccount?.accounts ?? [];
  // Sem filtro de seleção: o agregado considera sempre TODAS as empresas.
  const selectedAccounts = accounts;
  const allAccountIds = React.useMemo(() => new Set(accounts.map(a => a.accountId)), [accounts]);

  // Empresa em foco na coluna direita: sempre uma das empresas, na ordem original.
  const focusedAccount = React.useMemo(() => {
    if (selectedAccounts.length === 0) return null;
    return selectedAccounts.find(a => a.accountId === focusedAccountId) ?? selectedAccounts[0];
  }, [selectedAccounts, focusedAccountId]);

  const focusedIndex = focusedAccount ? selectedAccounts.findIndex(a => a.accountId === focusedAccount.accountId) : -1;

  const focusPrev = useCallback(() => {
    setFocusedAccountId(() => {
      if (selectedAccounts.length === 0) return null;
      const i = selectedAccounts.findIndex(a => a.accountId === (focusedAccount?.accountId));
      const prev = (i - 1 + selectedAccounts.length) % selectedAccounts.length;
      return selectedAccounts[prev].accountId;
    });
  }, [selectedAccounts, focusedAccount]);

  const focusNext = useCallback(() => {
    setFocusedAccountId(() => {
      if (selectedAccounts.length === 0) return null;
      const i = selectedAccounts.findIndex(a => a.accountId === (focusedAccount?.accountId));
      const next = (i + 1) % selectedAccounts.length;
      return selectedAccounts[next].accountId;
    });
  }, [selectedAccounts, focusedAccount]);

  // O colorIndex estável da empresa focada (ordem original em accounts)
  const focusedColorIndex = focusedAccount ? accounts.findIndex(a => a.accountId === focusedAccount.accountId) : 0;

  const detailAccount = React.useMemo(
    () => accounts.find(a => a.accountId === detailAccountId) ?? null,
    [accounts, detailAccountId],
  );
  const detailColorIndex = detailAccount ? accounts.findIndex(a => a.accountId === detailAccount.accountId) : 0;

  // Load comments (by focused account in mock path)
  useEffect(() => {
    setCommentsLoading(true);
    if (isMockCampaign(campaignId)) {
      const accId = focusedAccount?.accountId;
      const t = setTimeout(() => {
        setCommentsData(accId ? getMockCommentsByAccount(accId) : getMockComments());
        setCommentsLoading(false);
      }, 250);
      return () => clearTimeout(t);
    }
    fetchCampaignComments(campaignId).then(d => {
      setCommentsData(d);
      setCommentsLoading(false);
    }).catch(() => setCommentsLoading(false));
  }, [campaignId, focusedAccount?.accountId]);

  // View do dashboard: agregado de TODAS as empresas quando há dados por empresa.
  const d: CampaignAnalyticsFull | null = React.useMemo(() => {
    if (!byAccount || loading) return data;
    const agg = aggregateAccounts(selectedAccounts, byAccount.currency);
    return { ...agg, delta: data?.delta ?? {} };
  }, [byAccount, data, selectedAccounts, loading]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaignName}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(statusLabel)}`}>
                {statusLabel}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {fmtTimestamp(startDate)} — {endDate ? fmtTimestamp(endDate) : 'em andamento'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              {selectedRangeLabel}
            </button>
            {dateDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 w-36">
                {DATE_RANGES.map(r => (
                  <button
                    key={r.key}
                    onClick={() => { setDateRange(r.key); setDateDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${dateRange === r.key ? 'text-[#E54A26] font-semibold bg-[#FFF1ED]' : 'text-slate-700'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isMockCampaign(campaignId) && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 shadow-sm transition-colors"
              title="Excluir campanha"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN (65%) */}
        <div className="lg:w-[65%] space-y-6">

        {!isDesktop && detailAccount ? (
          <AccountDetailPanel
            account={detailAccount}
            colorIndex={detailColorIndex}
            currency={currency}
            variant="fullscreen"
            onBack={closeDetail}
          />
        ) : (
          <>

          {/* Section 1 — KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={<DollarSign className="w-4 h-4 text-[#FF5F39]" />} label="Total Spend" value={fmtCurrency(d?.costInLocalCurrency || 0, currency)} delta={d?.delta?.cost} />
              <MetricCard icon={<Eye className="w-4 h-4 text-blue-600" />} label="Impressões" value={fmtNum(d?.impressions || 0)} delta={d?.delta?.impressions} />
              <MetricCard icon={<MousePointerClick className="w-4 h-4 text-purple-600" />} label="Clicks" value={fmtNum(d?.clicks || 0)} delta={d?.delta?.clicks} />
              <MetricCard icon={<TrendingUp className="w-4 h-4 text-green-600" />} label="CTR" value={`${d?.ctr || '0'}%`} delta={null} />
            </div>
          )}

          {/* Tabela comparativa — sobe pra logo abaixo dos KPIs (coração da comparação) */}
          {byAccount && (loading
            ? <SkeletonCard className="h-64" />
            : <AccountPerformanceTable
                accounts={accounts}
                onOpenDetail={openDetail}
                expandedId={isDesktop ? detailAccountId : null}
                expandInline={isDesktop}
                currency={currency}
              />
          )}

          {/* Section 2 — Chart */}
          {byAccount ? (
            <AccountComparisonChart accounts={accounts} selectedIds={allAccountIds} currency={currency} loading={loading} />
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800">Engajamento ao longo do tempo</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-[#FF5F39]" /> Impressões</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Clicks</div>
                </div>
              </div>
              <div className="h-[260px] w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
                ) : d && d.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.timeSeries.map(t => ({ ...t, dateLabel: fmtDateLabel(t.date) }))}>
                      <defs>
                        <linearGradient id={impressionsGradient} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={clicksGradient} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="impressions" name="Impressões" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill={`url(#${impressionsGradient})`} />
                      <Area yAxisId="right" type="monotone" dataKey="clicks" name="Clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill={`url(#${clicksGradient})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Sem dados para o período selecionado</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Métricas agregadas — soma das empresas selecionadas, não por empresa */}
          {byAccount && !loading && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-700">Métricas agregadas</h3>
              <p className="text-xs text-slate-400">Soma das empresas selecionadas — não é por empresa.</p>
            </div>
          )}

          {/* Section 3 — Custo e Eficiência */}
          {loading ? (
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SmallCard label="CPC" value={`${currency === 'BRL' ? 'R$' : '$'}${d?.cpc || '0'}`} sub="Custo por clique" delta={null} />
              <SmallCard label="CPM" value={`${currency === 'BRL' ? 'R$' : '$'}${d?.cpm || '0'}`} sub="Custo por mil impressões" delta={null} />
              <SmallCard label="Engagement Rate" value={`${d?.engagementRate || '0'}%`} sub="(clicks+likes+comments+shares+follows)/impressions" delta={null} />
            </div>
          )}

          {/* Section 4 — Engajamento Social */}
          {loading ? (
            <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <IconCard icon={<Heart className="w-4 h-4 text-rose-500" />} label="Likes" value={fmtNum(d?.likes || 0)} delta={d?.delta?.likes} />
              <IconCard icon={<Share2 className="w-4 h-4 text-blue-500" />} label="Shares" value={fmtNum(d?.shares || 0)} delta={d?.delta?.shares} />
              <IconCard icon={<MessageCircle className="w-4 h-4 text-amber-500" />} label="Comments" value={fmtNum(d?.comments || 0)} delta={d?.delta?.comments} />
              <IconCard icon={<UserPlus className="w-4 h-4 text-green-500" />} label="Follows" value={fmtNum(d?.follows || 0)} delta={d?.delta?.follows} />
            </div>
          )}

          {/* Section 5 — Conversões */}
          {loading ? (
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SmallCard label="Conversões Totais" value={String(d?.externalWebsiteConversions ?? '—')} sub="externalWebsiteConversions" delta={d?.delta?.conversions} />
                <SmallCard label="Pós-Clique" value={String(d?.externalWebsitePostClickConversions ?? '—')} sub={`Taxa: ${d?.postClickConvRate || '0'}%`} delta={null} />
                <SmallCard label="Pós-Visualização" value={String(d?.externalWebsitePostViewConversions ?? '—')} sub="Post-view conversions" delta={null} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SmallCard label="Leads (One-Click)" value={String(d?.oneClickLeads ?? '—')} sub="Requer Lead Gen Form" delta={d?.delta?.oneClickLeads} tooltip="Requer configuração de Lead Gen Form no LinkedIn Campaign Manager" />
                <SmallCard label="CPL" value={d?.cpl ? `${currency === 'BRL' ? 'R$' : '$'}${d.cpl}` : '—'} sub="Custo por lead" delta={null} />
              </div>
            </>
          )}

          {/* Section 6 — Alcance e Virais */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4">{[1,2].map(i => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Users className="w-4 h-4 text-[#FF5F39]" /> Alcance e Virais
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Alcance Estimado</p>
                    <p className="text-lg font-bold text-slate-900">{fmtNum(d?.approximateMemberReach || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Impressões Virais</p>
                    <p className="text-lg font-bold text-slate-900">{fmtNum(d?.viralImpressions || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Megaphone className="w-4 h-4 text-purple-500" /> Amplificação Viral
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Amplificação</p>
                    <p className="text-lg font-bold text-slate-900">{d?.viralAmplification || '0'}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Viral Clicks</p>
                    <p className="text-lg font-bold text-slate-900">{fmtNum(d?.viralClicks || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          </>
        )}
        </div>

        {/* RIGHT COLUMN (35%) — Ad Preview + Comments */}
        <div className="lg:w-[35%] space-y-6">
          {byAccount && focusedAccount && (
            <div className="sticky top-6 space-y-6">
              <AccountFocusSwitcher
                label={focusedAccount.accountName}
                index={focusedIndex}
                total={selectedAccounts.length}
                onPrev={focusPrev}
                onNext={focusNext}
              />
              <AccountAdPreview
                creative={focusedAccount.creative}
                accountName={focusedAccount.accountName}
                industry={focusedAccount.industry}
                colorIndex={focusedColorIndex}
              />
              <CommentsCard
                commentsData={commentsData}
                commentsLoading={commentsLoading}
                headerSuffix={focusedAccount.accountName}
              />
            </div>
          )}
          {!byAccount && (
            <CommentsCard
              commentsData={commentsData}
              commentsLoading={commentsLoading}
              headerSuffix={null}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Excluir Campanha</h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">
                Deseja excluir a campanha <strong>"{campaignName}"</strong>? A campanha será arquivada no LinkedIn e não poderá ser reativada. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function MetricCard({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string | null | undefined }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="p-1.5 bg-slate-50 rounded-lg">{icon}</div>
        <DeltaBadge value={delta} />
      </div>
      <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SmallCard({ label, value, sub, delta, tooltip }: { label: string; value: string; sub: string; delta?: string | null; tooltip?: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-1">
        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
          {label}
          {tooltip && <span title={tooltip}><Info className="w-3 h-3 text-slate-400 cursor-help" /></span>}
        </p>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function IconCard({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta?: string | null }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {delta !== undefined && <div className="mt-1"><DeltaBadge value={delta} /></div>}
    </div>
  );
}

function CommentsCard({ commentsData, commentsLoading, headerSuffix }: {
  commentsData: CampaignCommentsResponse | null;
  commentsLoading: boolean;
  headerSuffix: string | null;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${headerSuffix === null ? 'sticky top-6' : ''}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-slate-500" />
          Comentários{headerSuffix ? ` · ${headerSuffix}` : ''} {commentsData && !commentsLoading ? `(${commentsData.total})` : ''}
        </h3>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {commentsLoading ? (
          <div className="p-5 space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : commentsData?.error && commentsData.total === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Não foi possível carregar comentários.</p>
            <p className="text-xs text-slate-400 mt-1">{commentsData.error}</p>
          </div>
        ) : commentsData && commentsData.comments.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Nenhum comentário neste anúncio ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {commentsData?.comments
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: CampaignComment }) {
  const name = comment.author_name || 'LinkedIn Member';
  return (
    <div className={`relative px-5 py-4 ${comment.is_reply ? 'pl-10' : ''}`}>
      {comment.is_reply && <div className="absolute left-7 top-0 bottom-0 w-px bg-slate-200" />}
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full ${avatarColor(comment.author_name)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
          {initials(comment.author_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
            <span className="text-[10px] text-slate-400">{relativeTime(comment.created_at)}</span>
          </div>
          {comment.author_title && (
            <p className="text-[11px] text-slate-400 truncate">{comment.author_title}</p>
          )}
          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{comment.text}</p>
          {comment.likes_count > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
              <Heart className="w-3 h-3" /> {comment.likes_count}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}