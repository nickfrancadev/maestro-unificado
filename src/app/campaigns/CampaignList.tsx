import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  PlayCircle,
  PauseCircle,
  Trash2,
  BarChart3,
  Loader2,
  Linkedin,
  Info,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  FileText,
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
import { MOCK_CAMPAIGN, MOCK_CAMPAIGN_ID, getMockAnalyticsByAccount } from '@/lib/mockCampaignData';
import { fmtCurrency, fmtOptional, fmtPct, fmtDate } from './format';
import { statusLabel, plural } from './labels';
import { listDrafts, deleteDraft, draftDailyTotal } from './drafts';
import type { CampaignDraft } from './drafts';

/**
 * Uma linha = um conjunto de anúncios no LinkedIn (no produto, uma empresa-alvo).
 * A tela agrupa essas linhas por grupo de campanhas: um lançamento do assistente.
 */
export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  type: string;
  budget: number;
  budgetCurrency: string;
  budgetType: 'daily' | 'total';
  startDate: number | null;
  endDate: number | null;
  /** URN do grupo de campanhas. null = agrupa pelo prefixo do nome. */
  campaignGroup: string | null;
  /** Linha da campanha de demonstração: ações só mudam o estado local. */
  isMock?: boolean;
  analytics?: CampaignAnalyticsSummary | null;
  analyticsLoading?: boolean;
  /** O resumo de performance não carregou: mostra "—" em vez de zeros falsos. */
  analyticsFailed?: boolean;
  actionLoading?: boolean;
  /** Última ação de pausar/ativar que falhou nesta empresa (fica na linha). */
  actionError?: string | null;
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
    campaignGroup: c.campaignGroup || null,
    analytics: undefined,
    analyticsLoading: false,
    actionLoading: false,
  };
}

/** Separador que o assistente usa entre a campanha e a empresa (buildLaunchPlan). */
export const GROUP_SEPARATOR = ' — ';

const MOCK_GROUP_URN = 'urn:li:sponsoredCampaignGroup:mock-abm-001';

/**
 * A campanha de demonstração vira o que o produto publica de verdade: um grupo
 * com um conjunto por empresa, nome "<campanha> — <empresa>", orçamento diário
 * dividido entre as empresas e a performance de cada uma.
 */
function buildMockRows(): CampaignRow[] {
  const { accounts } = getMockAnalyticsByAccount('all');
  const base = mapCampaignToRow(MOCK_CAMPAIGN, 'BRL');
  const perAdSet = accounts.length > 0 ? base.budget / accounts.length : base.budget;
  return accounts.map((a) => {
    const t = a.totals;
    return {
      ...base,
      id: `${MOCK_CAMPAIGN_ID}:${a.accountId}`,
      name: `${MOCK_CAMPAIGN.name}${GROUP_SEPARATOR}${a.accountName}`,
      campaignGroup: MOCK_GROUP_URN,
      budget: perAdSet,
      isMock: true,
      analytics: {
        impressions: t.impressions,
        clicks: t.clicks,
        ctr: t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(2) : '0',
        cost: t.costInLocalCurrency,
        currency: 'BRL',
      },
    };
  });
}

/** "Campanha X — Acme" → { prefix: "Campanha X", company: "Acme" }. Sem separador: prefix null. */
export function splitAdSetName(name: string): { prefix: string | null; company: string } {
  const i = name.lastIndexOf(GROUP_SEPARATOR);
  if (i <= 0) return { prefix: null, company: name };
  return { prefix: name.slice(0, i), company: name.slice(i + GROUP_SEPARATOR.length) };
}

export interface CompanyRow extends CampaignRow {
  /** Nome da empresa (o que vem depois de " — "), ou o nome inteiro. */
  company: string;
}

export interface CampaignGroup {
  key: string;
  name: string;
  children: CompanyRow[];
}

/**
 * Agrupa os conjuntos por grupo de campanhas. Com `campaignGroup`, ele manda;
 * sem ele (resposta antiga do servidor), agrupa pelo prefixo antes de " — ".
 * Mantém a ordem em que cada grupo aparece pela primeira vez.
 */
export function groupCampaigns(rows: CampaignRow[]): CampaignGroup[] {
  const byKey = new Map<string, CampaignRow[]>();
  for (const r of rows) {
    const { prefix } = splitAdSetName(r.name);
    const key = r.campaignGroup
      ? `group:${r.campaignGroup}`
      : prefix ? `name:${prefix}` : `id:${r.id}`;
    const list = byKey.get(key);
    if (list) list.push(r);
    else byKey.set(key, [r]);
  }
  return [...byKey.entries()].map(([key, list]) => {
    const prefixes = list.map(r => splitAdSetName(r.name).prefix);
    // Nome do grupo: o prefixo comum dos conjuntos. Se não houver um só
    // (conjunto criado fora do assistente), usa o primeiro prefixo ou nome.
    const name = prefixes.every(p => p && p === prefixes[0])
      ? prefixes[0]!
      : prefixes.find(Boolean) ?? list[0].name;
    const children = list.map(r => ({
      ...r,
      company: r.name.startsWith(name + GROUP_SEPARATOR)
        ? r.name.slice(name.length + GROUP_SEPARATOR.length)
        : r.name,
    }));
    return { key, name, children };
  });
}

// Prioridade do status do grupo: basta uma empresa ativa para o grupo estar no ar.
const STATUS_PRIORITY = ['Active', 'Paused', 'Draft', 'Completed', 'Canceled'];

export function aggregateStatus(statuses: string[]): string {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s;
  }
  return statuses[0] ?? '';
}

export interface GroupSummary {
  status: string;
  activeCount: number;
  pausedCount: number;
  companies: number;
  currency: string;
  dailyBudget: number;
  totalBudget: number;
  /** Soma do gasto conhecido; null quando nenhuma empresa tem o dado. */
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  /** CTR do grupo (cliques/impressões); null sem impressões. */
  ctr: number | null;
  /** Alguma empresa ficou sem dado: o total é parcial. */
  partial: boolean;
  loading: boolean;
  start: number | null;
  end: number | null;
  /** Alguma empresa não tem data de fim. */
  continuous: boolean;
}

export function summarizeGroup(children: CampaignRow[]): GroupSummary {
  let spend: number | null = null;
  let impressions: number | null = null;
  let clicks: number | null = null;
  let missing = false;
  let dailyBudget = 0;
  let totalBudget = 0;
  for (const c of children) {
    if (c.budgetType === 'daily') dailyBudget += c.budget;
    else totalBudget += c.budget;
    const a = c.analytics && !c.analyticsFailed ? c.analytics : null;
    if (a) {
      spend = (spend ?? 0) + a.cost;
      impressions = (impressions ?? 0) + a.impressions;
      clicks = (clicks ?? 0) + a.clicks;
    } else if (c.status !== 'Draft' && !c.analyticsLoading) {
      // Rascunho no LinkedIn nunca rodou: não ter dado não é falta de dado.
      missing = true;
    }
  }
  const starts = children.map(c => c.startDate).filter((n): n is number => n != null);
  const ends = children.map(c => c.endDate).filter((n): n is number => n != null);
  const statuses = children.map(c => c.status);
  return {
    status: aggregateStatus(statuses),
    activeCount: statuses.filter(s => s === 'Active').length,
    pausedCount: statuses.filter(s => s === 'Paused').length,
    companies: children.length,
    currency: children[0]?.budgetCurrency ?? 'USD',
    dailyBudget,
    totalBudget,
    spend,
    impressions,
    clicks,
    ctr: impressions && clicks != null ? (clicks / impressions) * 100 : null,
    partial: missing && spend != null,
    loading: children.some(c => c.analyticsLoading),
    start: starts.length ? Math.min(...starts) : null,
    end: ends.length ? Math.max(...ends) : null,
    continuous: children.length > 0 && children.some(c => c.endDate == null),
  };
}

/** Timestamp → "05/11/2026" no fuso do navegador. */
function fmtTs(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** "05/11/2026 – 05/12/2026", "Desde 05/11/2026 · contínua", "Contínua" ou "—". */
export function periodLabel(start: number | null, end: number | null, continuous = end == null): string {
  if (!start) return continuous ? 'Contínua' : '—';
  if (continuous || !end) return `Desde ${fmtTs(start)} · contínua`;
  return `${fmtTs(start)} – ${fmtTs(end)}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${fmtTs(d.getTime())} ${time}`;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Janela do resumo de performance (/linkedin/campaign-analytics-summary): últimos 90 dias. */
export const SUMMARY_WINDOW_DAYS = 90;

export interface BudgetUsage {
  /** Orçamento esperado no mesmo período do gasto. */
  base: number;
  /** Gasto / base em %, sem teto (pode passar de 100). */
  pct: number;
  /** Dias considerados quando o orçamento é diário. */
  days: number | null;
}

/**
 * Compara o gasto com o orçamento do MESMO período. O gasto vem do resumo dos
 * últimos 90 dias (ou da vida toda, na campanha de demonstração), então:
 * - orçamento total: compara direto com o total;
 * - orçamento diário: compara com diário × dias em que a campanha rodou dentro
 *   da janela do resumo — começa no maior entre (agora − janela) e o início da
 *   campanha, e termina no menor entre agora e o fim da campanha.
 * Antes o gasto de 90 dias era dividido pelo orçamento de UM dia e a barra
 * saturava em 100% para qualquer campanha com mais de um dia no ar.
 * `windowDays = null` = o gasto cobre a vida toda da campanha.
 */
export function budgetUsage(
  row: Pick<CampaignRow, 'budget' | 'budgetType' | 'startDate' | 'endDate'>,
  spent: number,
  windowDays: number | null = SUMMARY_WINDOW_DAYS,
  now = Date.now(),
): BudgetUsage | null {
  if (row.budget <= 0) return null;
  if (row.budgetType === 'total') {
    return { base: row.budget, pct: (spent / row.budget) * 100, days: null };
  }
  const windowStart = windowDays == null ? -Infinity : now - windowDays * DAY_MS;
  const from = row.startDate ? Math.max(row.startDate, windowStart) : windowStart;
  const to = row.endDate ? Math.min(row.endDate, now) : now;
  if (!Number.isFinite(from) || to <= from) return null;
  const days = Math.max(1, Math.ceil((to - from) / DAY_MS));
  const base = row.budget * days;
  return { base, pct: (spent / base) * 100, days };
}

/** Orçamento somado: "US$ 20,00/dia", "US$ 500,00 total" ou os dois. */
function budgetLabel(daily: number, total: number, currency: string): string {
  const parts: string[] = [];
  if (daily > 0) parts.push(`${fmtCurrency(daily, currency)}/dia`);
  if (total > 0) parts.push(`${fmtCurrency(total, currency)} total`);
  return parts.length ? parts.join(' + ') : '—';
}

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

function StatusBadge({ status, detail }: { status: string; detail?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(status)}`}>
      {statusLabel(status)}
      {detail && <span className="font-normal opacity-80">· {detail}</span>}
    </span>
  );
}

// Confirmação dentro da página: o window.confirm não funciona no visualizador
// de artefatos, e o produto também precisa de uma confirmação própria.
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
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400" aria-label="Fechar">
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

interface ConfirmState {
  type: 'pause' | 'activate' | 'delete';
  targets: CompanyRow[];
  groupName: string;
  /** Ação do grupo inteiro (Pausar todas / Ativar todas). */
  bulk: boolean;
}

const COLS = 9;

export function CampaignList() {
  const navigate = useNavigate();
  const onCreateCampaign = () => navigate('/campaigns/new');
  const onContinueDraft = (id: string) => navigate(`/campaigns/${id}/edit`);
  // A demonstração tem uma tela de analytics só; cada conjunto real tem a sua.
  const onViewPerformance = (row: CampaignRow) => navigate(`/campaigns/${row.isMock ? MOCK_CAMPAIGN_ID : row.id}`);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [loading, setLoading] = useState(true);
  /** Lista na tela, resumos de performance ainda chegando (cada linha tem o seu spinner). */
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [account, setAccount] = useState<{ name: string | null; currency: string }>({ name: null, currency: 'USD' });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['drafts']));
  const [confirmAction, setConfirmAction] = useState<ConfirmState | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setDrafts(listDrafts());
    try {
      const status = await getLinkedInStatus();
      const isConnected = status?.status === 'connected' && !!status.selected_ad_account_id;
      setLinkedinConnected(isConnected);

      const mockRows = buildMockRows();

      if (!isConnected) {
        // Sem LinkedIn conectado: só a campanha de demonstração.
        setAccount({ name: null, currency: 'BRL' });
        setCampaigns(mockRows);
        setSyncedAt(new Date());
        return;
      }

      const { campaigns: liCampaigns, currency, adAccountName } = await fetchLinkedInCampaigns();
      // Nome da conta: o da lista, senão o do status; o id só em último caso.
      // Nunca "Conta não definida" quando há uma conta selecionada.
      setAccount({
        name: adAccountName || status?.selected_ad_account_name || `Conta ${status?.selected_ad_account_id}`,
        currency: currency || status?.selected_ad_account_currency || 'USD',
      });
      // Rascunho no LinkedIn nunca rodou: não há resumo a buscar.
      const rows = liCampaigns.map(c => ({
        ...mapCampaignToRow(c, currency),
        analyticsLoading: c.status !== 'Draft',
      }));
      setCampaigns([...mockRows, ...rows]);
      // A tabela aparece já; gasto e impressões chegam linha a linha.
      setLoading(false);

      const toFetch = rows.filter(r => r.analyticsLoading);
      if (toFetch.length > 0) {
        setSyncing(true);
        const results = await Promise.allSettled(toFetch.map(row => fetchCampaignAnalyticsSummary(row.id)));
        const byId = new Map<string, CampaignAnalyticsSummary | null>();
        results.forEach((result, i) => {
          // Rejeitada ou com `error`: o resumo não carregou → "—", não zero.
          byId.set(toFetch[i].id, result.status === 'fulfilled' && !result.value.error ? result.value : null);
        });
        setCampaigns(prev => prev.map(r => {
          if (!byId.has(r.id)) return r;
          const summary = byId.get(r.id)!;
          return { ...r, analytics: summary, analyticsFailed: summary == null, analyticsLoading: false };
        }));
        setSyncing(false);
      }
      setSyncedAt(new Date());
    } catch (err) {
      console.error('[CampaignList] Erro ao carregar campanhas:', err);
      toast.error('Não foi possível carregar as campanhas do LinkedIn. Tente atualizar.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const patchRows = (ids: string[], patch: Partial<CampaignRow>) =>
    setCampaigns(prev => prev.map(c => ids.includes(c.id) ? { ...c, ...patch } : c));

  /** Pausa ou ativa UM conjunto. Nunca lança: devolve o erro para a linha. */
  const toggleOne = async (row: CampaignRow, kind: 'pause' | 'activate'): Promise<string | null> => {
    if (row.isMock) {
      await new Promise(r => setTimeout(r, 300));
      return null;
    }
    try {
      const params = { campaign_id: row.id, linkedin_campaign_id: row.id };
      const result = kind === 'pause' ? await pauseCampaign(params) : await activateCampaign(params);
      return result.success ? null : (result.error || 'erro desconhecido');
    } catch (err: any) {
      console.error('[CampaignList] Toggle status error:', err);
      return 'erro de rede';
    }
  };

  /**
   * Pausa/ativa uma empresa ou o grupo todo. O grupo é aplicado empresa por
   * empresa (a ação no grupo inteiro volta 400 no produto): cada falha fica na
   * linha da empresa, e as que deram certo continuam valendo.
   */
  const handleToggle = async (targets: CompanyRow[], kind: 'pause' | 'activate', groupName: string) => {
    setConfirmAction(null);
    patchRows(targets.map(t => t.id), { actionLoading: true, actionError: null });
    const newStatus = kind === 'pause' ? 'Paused' : 'Active';
    const verb = kind === 'pause' ? 'pausar' : 'ativar';

    const errors = await Promise.all(targets.map(async (t) => {
      const error = await toggleOne(t, kind);
      patchRows([t.id], error
        ? { actionLoading: false, actionError: `Não foi possível ${verb}: ${error}` }
        : { actionLoading: false, actionError: null, status: newStatus });
      return error;
    }));

    const failed = targets.filter((_, i) => errors[i]);
    const done = targets.length - failed.length;
    const doneLabel = kind === 'pause' ? 'pausada' : 'ativada';
    if (failed.length === 0) {
      toast.success(targets.length === 1
        ? `${targets[0].company} ${doneLabel}.`
        : `${plural(done, 'empresa')} de "${groupName}" ${doneLabel}s.`);
    } else if (done === 0) {
      toast.error(`Não foi possível ${verb} ${failed.map(f => f.company).join(', ')}. O motivo está na linha de cada empresa.`);
    } else {
      toast.warning(`${done} de ${targets.length} empresas ${doneLabel}s. Falhou: ${failed.map(f => f.company).join(', ')}.`);
    }
  };

  // Excluir (arquivar) um conjunto no LinkedIn.
  const handleDeleteCampaign = async (row: CompanyRow) => {
    setConfirmAction(null);
    patchRows([row.id], { actionLoading: true });
    try {
      const result = await archiveCampaign({ campaign_id: row.id, linkedin_campaign_id: row.id });
      if (result.success) {
        setCampaigns(prev => prev.filter(c => c.id !== row.id));
        toast.success(`${row.company} excluída (arquivada no LinkedIn).`);
      } else {
        patchRows([row.id], { actionLoading: false });
        toast.error(`Não foi possível excluir: ${result.error}`);
      }
    } catch (err: any) {
      patchRows([row.id], { actionLoading: false });
      toast.error('Erro de rede ao excluir. Tente de novo.');
      console.error('[CampaignList] Delete error:', err);
    }
  };

  const handleDeleteDraft = (id: string) => {
    try {
      deleteDraft(id);
      setDrafts(listDrafts());
      toast.success('Rascunho excluído.');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível excluir o rascunho.');
    } finally {
      setDraftToDelete(null);
    }
  };

  const toggleExpanded = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const groups = useMemo(
    () => groupCampaigns(campaigns).map(g => ({ ...g, summary: summarizeGroup(g.children) })),
    [campaigns],
  );

  const q = search.trim().toLowerCase();
  const filteredGroups = groups.filter(g => {
    const matchesFilter = filter === 'all' || g.summary.status.toLowerCase() === filter;
    const matchesSearch = !q || g.name.toLowerCase().includes(q) || g.children.some(c => c.company.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });
  const filteredDrafts = (filter === 'all' || filter === 'draft')
    ? drafts.filter(d => !q || d.name.toLowerCase().includes(q))
    : [];

  // Total da conta no rodapé: só a moeda da conta, e sem a demonstração
  // quando há conta real (somar demo com conta real distorce o total).
  const footerGroups = filteredGroups.filter(g =>
    g.summary.currency === account.currency && (!linkedinConnected || !g.children[0]?.isMock));
  const footer = footerGroups.length > 0 ? summarizeGroup(footerGroups.flatMap(g => g.children)) : null;

  const activeCount = groups.filter(g => g.summary.status === 'Active').length;
  const pausedCount = groups.filter(g => g.summary.status === 'Paused').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campanhas</h1>
          <p className="text-sm text-slate-500">
            {groups.length + drafts.length > 0
              ? [
                  plural(groups.length, 'campanha'),
                  plural(activeCount, 'ativa'),
                  plural(pausedCount, 'pausada'),
                  drafts.length > 0 ? plural(drafts.length, 'rascunho') : null,
                ].filter(Boolean).join(' · ')
              : 'Gerencie suas campanhas ABM ativas e passadas.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncing ? (
            <span className="text-xs text-slate-400 whitespace-nowrap">Sincronizando…</span>
          ) : syncedAt && !loading && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Sincronizado às {syncedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={loadCampaigns}
            disabled={loading || syncing}
            title="Atualizar"
            aria-label="Atualizar"
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading || syncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateCampaign}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5F39] text-white rounded-lg text-sm font-medium hover:bg-[#E54A26] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova campanha
          </button>
        </div>
      </div>

      {/* Aviso informativo, não ação primária: LinkedIn não conectado */}
      {linkedinConnected === false && !loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-slate-800">LinkedIn Ads não conectado</p>
            <p className="text-slate-600 mt-0.5">
              Você está vendo uma campanha de demonstração. Para ver as suas, conecte o LinkedIn Ads em{' '}
              <button onClick={() => navigate('/integrations')} className="font-semibold text-[#0A66C2] hover:underline">
                Integrações
              </button>.
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
            placeholder="Buscar por campanha ou empresa..."
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
            { key: 'draft', label: 'Rascunhos' },
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

      {/* Tabela: uma linha por campanha (grupo) que abre uma linha por empresa */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-semibold text-slate-500 uppercase">
                <th className="px-4 py-3 min-w-[240px]">Campanha</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Empresas</th>
                <th className="px-3 py-3 text-right">Orçamento</th>
                <th className="px-3 py-3 text-right" title="Últimos 90 dias">Gasto</th>
                <th className="px-3 py-3 text-right">Impressões</th>
                <th className="px-3 py-3 text-right">CTR</th>
                <th className="px-3 py-3">Período</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && [1, 2, 3].map(i => (
                <tr key={i}>
                  <td className="px-4 py-4"><div className="h-5 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  {Array.from({ length: COLS - 1 }).map((_, j) => (
                    <td key={j} className="px-3 py-4"><div className="h-5 w-16 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}

              {/* Rascunhos: ficam no navegador até publicar, numa linha própria */}
              {!loading && filteredDrafts.length > 0 && (
                <>
                  <tr className="bg-slate-50/60 hover:bg-slate-50">
                    <td className="px-4 py-3" colSpan={COLS}>
                      <button onClick={() => toggleExpanded('drafts')} className="flex items-center gap-2 font-semibold text-slate-800" aria-expanded={expanded.has('drafts')}>
                        {expanded.has('drafts') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <FileText className="w-4 h-4 text-slate-400" />
                        Rascunhos
                        <span className="text-xs font-normal text-slate-500">{plural(filteredDrafts.length, 'rascunho')} · ainda não publicados no LinkedIn</span>
                      </button>
                    </td>
                  </tr>
                  {expanded.has('drafts') && filteredDrafts.map(d => {
                    const { perAdSet, adSets, total } = draftDailyTotal(d);
                    const cfg = d.state.campaignConfig;
                    const confirming = draftToDelete === d.id;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70">
                        <td className="pl-12 pr-4 py-3">
                          <span className="font-medium text-slate-900 block truncate max-w-[280px]">{d.name}</span>
                          <span className="text-xs text-slate-400">Salvo em {fmtDateTime(d.savedAt)}</span>
                        </td>
                        <td className="px-3 py-3"><StatusBadge status="Draft" /></td>
                        <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap">{adSets > 0 ? plural(adSets, 'empresa') : '—'}</td>
                        <td className="px-3 py-3 text-right">
                          {perAdSet > 0 && adSets > 0 ? (
                            <span className="font-medium text-slate-900">
                              <span className="whitespace-nowrap">{fmtCurrency(total, account.currency)}{cfg.budgetType === 'total' ? ' total' : '/dia'}</span>
                              {' '}<span className="whitespace-nowrap">· {plural(adSets, 'empresa')}</span>
                            </span>
                          ) : <span className="text-slate-400">Sem orçamento</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-400" colSpan={3}>Não publicado</td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                          {cfg.startDate
                            ? cfg.endDate ? `${fmtDate(cfg.startDate)} – ${fmtDate(cfg.endDate)}` : `Desde ${fmtDate(cfg.startDate)} · contínua`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {confirming ? (
                            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5" role="alertdialog" aria-label="Confirmar exclusão do rascunho">
                              <span className="text-xs text-red-700">Excluir este rascunho? Não dá para desfazer.</span>
                              <button onClick={() => setDraftToDelete(null)} className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white rounded">
                                Cancelar
                              </button>
                              <button onClick={() => handleDeleteDraft(d.id)} className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded">
                                Excluir
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => onContinueDraft(d.id)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm"
                              >
                                Continuar
                              </button>
                              <button
                                onClick={() => setDraftToDelete(d.id)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}

              {!loading && filteredGroups.map((group) => {
                const s = group.summary;
                const isOpen = expanded.has(group.key);
                const isMockGroup = !!group.children[0]?.isMock;
                const money = (n: number) => fmtCurrency(n, s.currency);
                const busy = group.children.some(c => c.actionLoading);
                const pausable = group.children.filter(c => c.status === 'Active');
                const activatable = group.children.filter(c => c.status === 'Paused');
                const mixed = s.activeCount > 0 && s.activeCount < s.companies;
                return (
                  <React.Fragment key={group.key}>
                    <tr className={`hover:bg-slate-50 transition-colors ${isOpen ? 'bg-slate-50/60' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleExpanded(group.key)} className="flex items-start gap-2 text-left" aria-expanded={isOpen}>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
                          <span className="min-w-0">
                            <span className="font-semibold text-slate-900 block">{group.name}</span>
                            <span className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                              <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                              {isMockGroup ? 'Demonstração' : account.name} · {s.currency}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={s.status} detail={mixed ? `${s.activeCount} de ${s.companies}` : undefined} />
                          {busy && <Loader2 className="w-3.5 h-3.5 text-[#FF5F39] animate-spin" />}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap">{plural(s.companies, 'empresa')}</td>
                      <td className="px-3 py-3 text-right font-medium text-slate-900 whitespace-nowrap">{budgetLabel(s.dailyBudget, s.totalBudget, s.currency)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {s.loading && s.spend == null ? <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin inline" /> : (
                          <span className="font-medium text-slate-900" title={s.partial ? 'Soma só das empresas com dados' : 'Últimos 90 dias'}>
                            {fmtOptional(s.spend, money)}{s.partial && <span className="text-slate-400">*</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">{s.loading && s.impressions == null ? '' : fmtOptional(s.impressions)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{s.loading && s.ctr == null ? '' : fmtOptional(s.ctr, n => fmtPct(n))}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{periodLabel(s.start, s.end, s.continuous)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {pausable.length > 0 && (
                            <button
                              onClick={() => setConfirmAction({ type: 'pause', targets: pausable, groupName: group.name, bulk: true })}
                              disabled={busy}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-yellow-50 hover:border-yellow-200 rounded-lg disabled:opacity-40"
                            >
                              Pausar todas
                            </button>
                          )}
                          {activatable.length > 0 && (
                            <button
                              onClick={() => setConfirmAction({ type: 'activate', targets: activatable, groupName: group.name, bulk: true })}
                              disabled={busy}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-green-50 hover:border-green-200 rounded-lg disabled:opacity-40"
                            >
                              Ativar todas
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isOpen && group.children.map((row) => {
                      const a = row.analytics && !row.analyticsFailed ? row.analytics : null;
                      const ctr = a && a.impressions > 0 ? (a.clicks / a.impressions) * 100 : null;
                      const usage = a ? budgetUsage(row, a.cost, row.isMock ? null : SUMMARY_WINDOW_DAYS) : null;
                      const rowMoney = (n: number) => fmtCurrency(n, row.budgetCurrency);
                      return (
                        <tr key={row.id} className="bg-white hover:bg-slate-50/70">
                          <td className="pl-12 pr-4 py-2.5">
                            <span className="text-slate-800">{row.company}</span>
                            {row.actionError && <span className="block text-xs text-red-600 mt-0.5">{row.actionError}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={row.status} />
                              {row.actionLoading && <Loader2 className="w-3.5 h-3.5 text-[#FF5F39] animate-spin" />}
                            </div>
                          </td>
                          <td className="px-3 py-2.5" />
                          <td className="px-3 py-2.5 text-right text-slate-700 whitespace-nowrap">
                            {row.budget > 0 ? `${rowMoney(row.budget)}${row.budgetType === 'daily' ? '/dia' : ' total'}` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {row.analyticsLoading ? <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin inline" /> : (
                              <span
                                className="text-slate-700"
                                title={row.analyticsFailed
                                  ? 'Não foi possível carregar a performance'
                                  : usage ? `${fmtPct(usage.pct, 0)} do previsto${usage.days != null ? ` em ${plural(usage.days, 'dia')}` : ''}` : undefined}
                              >
                                {fmtOptional(a?.cost, rowMoney)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{row.analyticsLoading ? '' : fmtOptional(a?.impressions)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{row.analyticsLoading ? '' : fmtOptional(ctr, n => fmtPct(n))}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{periodLabel(row.startDate, row.endDate)}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {row.status === 'Active' ? (
                                <button
                                  onClick={() => setConfirmAction({ type: 'pause', targets: [row], groupName: group.name, bulk: false })}
                                  disabled={row.actionLoading}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-yellow-700 hover:bg-yellow-50 rounded disabled:opacity-40"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" /> Pausar
                                </button>
                              ) : row.status === 'Paused' ? (
                                <button
                                  onClick={() => setConfirmAction({ type: 'activate', targets: [row], groupName: group.name, bulk: false })}
                                  disabled={row.actionLoading}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-40"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" /> Ativar
                                </button>
                              ) : null}
                              <button
                                onClick={() => onViewPerformance(row)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-[#E54A26] hover:bg-[#FFF1ED] rounded"
                              >
                                <BarChart3 className="w-3.5 h-3.5" /> Analytics
                              </button>
                              {!row.isMock && (
                                <button
                                  onClick={() => setConfirmAction({ type: 'delete', targets: [row], groupName: group.name, bulk: false })}
                                  disabled={row.actionLoading}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                                  title="Excluir (arquivar no LinkedIn)"
                                  aria-label="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {!loading && filteredGroups.length === 0 && filteredDrafts.length === 0 && (
                <tr>
                  <td colSpan={COLS} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma campanha encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
            {!loading && footer && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-800">
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                    Total da conta{linkedinConnected && account.name ? ` · ${account.name}` : ''}
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right whitespace-nowrap">{plural(footer.companies, 'empresa')}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{budgetLabel(footer.dailyBudget, footer.totalBudget, footer.currency)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{fmtOptional(footer.spend, n => fmtCurrency(n, footer.currency))}</td>
                  <td className="px-3 py-3 text-right">{fmtOptional(footer.impressions)}</td>
                  <td className="px-3 py-3 text-right">{fmtOptional(footer.ctr, n => fmtPct(n))}</td>
                  <td className="px-3 py-3" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && groups.some(g => g.summary.partial) && (
          <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
            * Soma só das empresas com dados. As outras não carregaram; atualize para tentar de novo.
          </p>
        )}
      </div>

      {confirmAction && (() => {
        const { type, targets, groupName, bulk } = confirmAction;
        const who = bulk ? `as ${plural(targets.length, 'empresa')} de "${groupName}"` : `"${targets[0].company}" em "${groupName}"`;
        return (
          <ConfirmDialog
            title={type === 'delete' ? 'Excluir empresa da campanha' : type === 'pause' ? (bulk ? 'Pausar todas' : 'Pausar empresa') : (bulk ? 'Ativar todas' : 'Ativar empresa')}
            message={
              type === 'delete'
                ? `Excluir ${who}? O conjunto é arquivado no LinkedIn e não pode ser reativado.`
                : type === 'pause'
                ? `Pausar ${who}? Os anúncios deixam de aparecer até você ativar de novo.`
                : `Ativar ${who}? Os anúncios voltam a aparecer e a usar o orçamento.`
            }
            confirmLabel={type === 'delete' ? 'Excluir' : type === 'pause' ? 'Pausar' : 'Ativar'}
            confirmColor={type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FF5F39] hover:bg-[#E54A26]'}
            onConfirm={() => {
              if (type === 'delete') handleDeleteCampaign(targets[0]);
              else handleToggle(targets, type, groupName);
            }}
            onCancel={() => setConfirmAction(null)}
          />
        );
      })()}
    </div>
  );
}
