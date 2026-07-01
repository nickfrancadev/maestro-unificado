import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  LayoutTemplate,
  Bell,
  LayoutGrid,
  Rows3,
} from 'lucide-react';
import { toast } from 'sonner';
import { listPages, duplicatePage, savePage } from '../store/repo';
import type { LandingPage } from '../store/model';
import { listEvents, listAlerts } from '../store/tracking';
import { ensureSeeded } from '../store/seed';
import { listAccounts, type LpAccount } from '../store/accounts';
import { AlertsPanel } from '../alerts/AlertsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { LpThumbnail } from '../components/LpThumbnail';
import { PageActionsMenu, type PageActionHandlers } from './PageActions';

type StatusFilter = 'all' | LandingPage['status'];
type SortKey = 'recent' | 'visits' | 'engagement';
type ViewMode = 'cards' | 'list';

const VIEW_MODE_STORAGE_KEY = 'maestro.landingPages.viewMode';

function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const stored = window.localStorage?.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
}

interface PageMetrics {
  visits: number;
  ctaClicks: number;
  formSubmits: number;
  conversion: number; // %
}

function computeMetrics(landingPageId: string): PageMetrics {
  const events = listEvents(landingPageId);
  const visits = events.filter((e) => e.type === 'page_view').length;
  const ctaClicks = events.filter((e) => e.type === 'cta_click').length;
  const formSubmits = events.filter((e) => e.type === 'form_submit').length;
  const conversion = visits > 0 ? (formSubmits / visits) * 100 : 0;
  return { visits, ctaClicks, formSubmits, conversion };
}

const STATUS_LABEL: Record<LandingPage['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  archived: 'Arquivada',
};

const STATUS_STYLE: Record<LandingPage['status'], string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-green-50 text-green-700 border-green-200',
  archived: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function LandingPagesOverview() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [accounts, setAccounts] = useState<LpAccount[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [alertCount, setAlertCount] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());

  const reload = () => setPages(listPages());

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage?.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore persistence failures (e.g. storage disabled)
    }
  };

  useEffect(() => {
    ensureSeeded();
    setPages(listPages());
    setAccounts(listAccounts());
    setAlertCount(listAlerts().length);
  }, []);

  const accountsById = useMemo(() => {
    const map = new Map<string, LpAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const rows = useMemo(() => {
    return pages.map((page) => ({ page, metrics: computeMetrics(page.id) }));
  }, [pages]);

  const filteredRows = useMemo(() => {
    let list = rows.filter(({ page }) => {
      const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
      const matchesAccount = accountFilter === 'all' || page.links.accountIds.includes(accountFilter);
      const matchesSearch = page.name.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesAccount && matchesSearch;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'visits') return b.metrics.visits - a.metrics.visits;
      if (sort === 'engagement') return (b.metrics.ctaClicks + b.metrics.formSubmits) - (a.metrics.ctaClicks + a.metrics.formSubmits);
      return new Date(b.page.updatedAt).getTime() - new Date(a.page.updatedAt).getTime();
    });

    return list;
  }, [rows, statusFilter, accountFilter, search, sort]);

  const handleDuplicate = (id: string) => {
    const copy = duplicatePage(id);
    reload();
    toast.success(`Página duplicada como "${copy.name}".`);
  };

  const handleTogglePublish = (page: LandingPage) => {
    const nextStatus: LandingPage['status'] = page.status === 'published' ? 'draft' : 'published';
    savePage({ ...page, status: nextStatus });
    reload();
    toast.success(
      nextStatus === 'published'
        ? `"${page.name}" publicada com sucesso.`
        : `"${page.name}" despublicada.`,
    );
  };

  const handleArchive = (page: LandingPage) => {
    savePage({ ...page, status: 'archived' });
    reload();
    toast.success(`"${page.name}" arquivada.`);
  };

  const handleCopyUrl = (page: LandingPage) => {
    const url = `${window.location.origin}/p/${page.slug}`;
    navigator.clipboard?.writeText(url);
    toast.success('URL copiada para a área de transferência.');
  };

  const buildActionHandlers = (page: LandingPage): PageActionHandlers => ({
    onEdit: () => navigate(`/landing-pages/${page.id}/edit`),
    onDuplicate: () => handleDuplicate(page.id),
    onTogglePublish: () => handleTogglePublish(page),
    onAnalytics: () => navigate(`/landing-pages/${page.id}/analytics`),
    onArchive: () => handleArchive(page),
    onCopyUrl: () => handleCopyUrl(page),
  });

  const totalCount = pages.length;
  const publishedCount = pages.filter((p) => p.status === 'published').length;
  const draftCount = pages.filter((p) => p.status === 'draft').length;

  const openAlerts = () => {
    setAlertCount(listAlerts().length);
    setAlertsOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Landing Pages</h1>
          <p className="text-sm text-slate-500">
            {totalCount > 0
              ? `${totalCount} página${totalCount !== 1 ? 's' : ''} • ${publishedCount} publicada${publishedCount !== 1 ? 's' : ''} • ${draftCount} rascunho${draftCount !== 1 ? 's' : ''}`
              : 'Crie e gerencie landing pages personalizadas por conta.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alertCount > 0 && (
            <button
              onClick={openAlerts}
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#FFD0C2] text-[#E54A26] rounded-lg text-sm font-medium hover:bg-[#FFF1ED] transition-colors shadow-sm"
              title="Ver alertas de intenção"
            >
              <Bell className="w-4 h-4" />
              {alertCount} alerta{alertCount !== 1 ? 's' : ''}
            </button>
          )}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Alternar visualização">
            <button
              onClick={() => changeViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[#FFF1ED] text-[#E54A26]'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
              title="Visualização em cards"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => changeViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#FFF1ED] text-[#E54A26]'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
              title="Visualização em lista"
              aria-pressed={viewMode === 'list'}
            >
              <Rows3 className="w-4 h-4" />
              Lista
            </button>
          </div>
          <button
            onClick={() => navigate('/landing-pages/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5F39] text-white rounded-lg text-sm font-medium hover:bg-[#E54A26] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Landing Page
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar landing pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {([
            { key: 'all', label: 'Todas' },
            { key: 'draft', label: 'Rascunho' },
            { key: 'published', label: 'Publicada' },
            { key: 'archived', label: 'Arquivada' },
          ] as { key: StatusFilter; label: string }[]).map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === s.key
                  ? 'bg-[#FFF1ED] text-[#E54A26] border border-[#FFD0C2]'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
        >
          <option value="all">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
        >
          <option value="recent">Mais recentes</option>
          <option value="visits">Mais visitadas</option>
          <option value="engagement">Mais engajamento</option>
        </select>
      </div>

      {/* Cards / grid view (default) */}
      {viewMode === 'cards' && (
        filteredRows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRows.map(({ page, metrics }) => {
              const linkedAccounts = page.links.accountIds
                .map((id) => accountsById.get(id))
                .filter((a): a is LpAccount => Boolean(a));

              return (
                <div
                  key={page.id}
                  onClick={() => navigate(`/landing-pages/${page.id}/edit`)}
                  className="group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="relative">
                    <LpThumbnail page={page} height={150} />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PageActionsMenu
                        page={page}
                        handlers={buildActionHandlers(page)}
                        buttonClassName="p-1.5 bg-white/90 backdrop-blur text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg shadow-sm border border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 leading-snug">{page.name}</span>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLE[page.status]}`}>
                        {STATUS_LABEL[page.status]}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500 font-mono truncate">/p/{page.slug}</span>

                    {linkedAccounts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {linkedAccounts.slice(0, 2).map((a) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {a.name}
                          </span>
                        ))}
                        {linkedAccounts.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200">
                            +{linkedAccounts.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhuma conta vinculada</span>
                    )}

                    <div className="flex gap-4 pt-1">
                      <div className="text-xs">
                        <span className="text-slate-500 block">Visitas</span>
                        <span className="font-semibold text-slate-700">{metrics.visits.toLocaleString()}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-500 block">CTA</span>
                        <span className="font-semibold text-slate-700">{metrics.ctaClicks.toLocaleString()}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-500 block">Forms</span>
                        <span className="font-semibold text-slate-700">{metrics.formSubmits.toLocaleString()}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-500 block">Conv.</span>
                        <span className="font-semibold text-slate-700">{metrics.conversion.toFixed(1)}%</span>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 pt-1">Atualizada em {formatDate(page.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center text-slate-500">
            Nenhuma landing page encontrada com os filtros atuais.
          </div>
        )
      )}

      {/* Table / list view */}
      {viewMode === 'list' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Capa</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Página</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">URL</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contas vinculadas</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Métricas</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Atualizada em</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(({ page, metrics }) => {
                const linkedAccounts = page.links.accountIds
                  .map((id) => accountsById.get(id))
                  .filter((a): a is LpAccount => Boolean(a));

                return (
                  <tr
                    key={page.id}
                    className="hover:bg-slate-50 group transition-colors cursor-pointer"
                    onClick={() => navigate(`/landing-pages/${page.id}/analytics`)}
                  >
                    <td className="px-6 py-4">
                      <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                        <LpThumbnail page={page} height={64} className="rounded-lg" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center rounded-lg shrink-0"
                          style={{ width: 36, height: 36, background: '#FFF1ED', color: '#FF5F39' }}
                        >
                          <LayoutTemplate className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{page.name}</span>
                          <span className="text-xs text-slate-400">{page.templateOrigin ?? 'em branco'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLE[page.status]}`}>
                        {STATUS_LABEL[page.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 font-mono">/p/{page.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      {linkedAccounts.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {linkedAccounts.slice(0, 2).map((a) => (
                            <span
                              key={a.id}
                              className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {a.name}
                            </span>
                          ))}
                          {linkedAccounts.length > 2 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200">
                              +{linkedAccounts.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Nenhuma</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <div className="text-xs">
                          <span className="text-slate-500 block">Visitas</span>
                          <span className="font-semibold text-slate-700">{metrics.visits.toLocaleString()}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500 block">CTA</span>
                          <span className="font-semibold text-slate-700">{metrics.ctaClicks.toLocaleString()}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500 block">Forms</span>
                          <span className="font-semibold text-slate-700">{metrics.formSubmits.toLocaleString()}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500 block">Conv.</span>
                          <span className="font-semibold text-slate-700">{metrics.conversion.toFixed(1)}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{formatDate(page.updatedAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <PageActionsMenu page={page} handlers={buildActionHandlers(page)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma landing page encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#FF5F39]" />
              Alertas de intenção
            </DialogTitle>
            <DialogDescription>
              Contas com sinais de alta intenção nas suas landing pages.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <AlertsPanel bare />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LandingPagesOverview;
