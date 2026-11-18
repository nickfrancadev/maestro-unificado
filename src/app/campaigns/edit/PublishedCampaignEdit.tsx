import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Loader2,
  Lock,
  PencilLine,
  RotateCcw,
  Users,
  XCircle,
} from 'lucide-react';
import { fetchPublishedGroupForEdit, getLinkedInStatus, updatePublishedCampaigns } from '@/lib/linkedin';
import { LinkedInLogo } from '@/app/components/LinkedInLogo';
import { StatusBadge } from '../CampaignList';
import { FacetCard, PERSON_FACET_CONFIG, smallAudienceSentence } from '../wizard/SegmentationStep';
import { useAudienceCount, audienceCheckFor, MIN_AUDIENCE } from '../wizard/segmentation/useAudienceCount';
import { createEmptyPersonTargeting, isSamePersonTargeting } from '../wizard/segmentation/targeting';
import type { PersonTargeting, TargetingData } from '../wizard/segmentation/types';
import { currencySymbol, fmtDate, fmtMoney } from '../format';
import { plural } from '../labels';
import { todayIso } from '../../../../supabase/functions/make-server-a4d5bbe0/campaignEditGuards';
import {
  MIN_BUDGET_PER_AD_SET,
  applySavedResults,
  audienceBlockers,
  buildEditDiff,
  buildUpdateRequest,
  commonEndDate,
  costTypeText,
  editErrors,
  editSpendStatement,
  groupFromEditData,
  hasErrors,
  initialEditState,
  objectiveLabel,
  parseBudget,
  periodDetail,
  stateAfterSave,
  targetingChanged,
  targetingSummary,
} from './publishedEdit';
import type { EditDiff, EditState, PublishedGroup, UpdateResponse } from './publishedEdit';
import type { UpdateRequest } from '../../../../supabase/functions/make-server-a4d5bbe0/campaignEditGuards';
import { MOCK_EDIT_GROUP_ID, buildMockPublishedGroup } from './mockPublishedGroup';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; group: PublishedGroup }
  | { kind: 'error'; title: string; detail: string; retry: boolean };

/**
 * Tela "Editar campanha publicada" (rota campaigns/:id/edit com id de grupo).
 * Um grupo no LinkedIn = uma campanha por empresa-alvo. Rascunhos continuam
 * abrindo no assistente (ver CampaignEditRoute).
 */
export function PublishedCampaignEdit() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('empresa') ?? undefined;
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'loading' });
    (async () => {
      // Sem LinkedIn conectado, a demonstração da lista continua editável.
      if (id === MOCK_EDIT_GROUP_ID) {
        if (alive) setLoad({ kind: 'ready', group: buildMockPublishedGroup() });
        return;
      }
      const status = await getLinkedInStatus();
      const connected = status?.status === 'connected' && !!status.selected_ad_account_id;
      if (!connected) {
        if (alive) setLoad({
          kind: 'error',
          title: 'Não encontramos esta campanha',
          detail: 'O LinkedIn não está conectado, então não dá para abrir uma campanha publicada. Conecte em Integrações e tente de novo.',
          retry: false,
        });
        return;
      }
      const res = await fetchPublishedGroupForEdit(id);
      if (!alive) return;
      if (res.ok) {
        setLoad({ kind: 'ready', group: groupFromEditData(res.data) });
      } else if (res.status === 404 || res.status === 400) {
        setLoad({
          kind: 'error',
          title: 'Campanha não encontrada',
          detail: 'Esta campanha não existe na conta de anúncios conectada, ou foi arquivada. Volte para a lista e escolha outra.',
          retry: false,
        });
      } else {
        setLoad({
          kind: 'error',
          title: 'Não foi possível carregar a campanha',
          detail: `O LinkedIn não respondeu (${res.error}). Nada foi alterado.`,
          retry: true,
        });
      }
    })();
    return () => { alive = false; };
  }, [id, attempt]);

  if (load.kind === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 text-slate-500 gap-2" role="status">
        <Loader2 className="w-5 h-5 animate-spin text-[#FF5F39]" /> Carregando a campanha do LinkedIn…
      </div>
    );
  }
  if (load.kind === 'error') {
    return <LoadError title={load.title} detail={load.detail} onRetry={load.retry ? () => setAttempt((n) => n + 1) : undefined} />;
  }
  return <EditForm key={load.group.id} initialGroup={load.group} focusId={focusId} />;
}

function LoadError({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-full bg-slate-50 p-8">
      <div role="alert" className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-6 text-center space-y-3">
        <div className="w-11 h-11 rounded-full bg-[#FFF1ED] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5 text-[#FF5F39]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{detail}</p>
        <div className="flex justify-center gap-2 pt-2">
          {onRetry && (
            <button onClick={onRetry} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg">
              Tentar de novo
            </button>
          )}
          <button onClick={() => navigate('/campaigns')} className="px-4 py-2 text-sm font-medium text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm">
            Voltar para campanhas
          </button>
        </div>
      </div>
    </div>
  );
}

type SaveOutcome = { response: UpdateResponse; request: UpdateRequest } | null;

function EditForm({ initialGroup, focusId }: { initialGroup: PublishedGroup; focusId?: string }) {
  const navigate = useNavigate();
  const today = useMemo(() => todayIso(), []);
  const [group, setGroup] = useState(initialGroup);
  const [state, setState] = useState<EditState>(() => initialEditState(initialGroup));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [openCompany, setOpenCompany] = useState<string | undefined>(focusId);
  const [allBudget, setAllBudget] = useState('');
  const [confirming, setConfirming] = useState<EditDiff | null>(null);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<SaveOutcome>(null);
  const [pendingLeave, setPendingLeave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusId && focusRef.current && typeof focusRef.current.scrollIntoView === 'function') {
      focusRef.current.scrollIntoView({ block: 'center' });
    }
  }, [focusId]);

  // Público por empresa: o mesmo cálculo da Segmentação. Cada empresa é um
  // conjunto com a própria segmentação (override), e a empresa é o employer.
  const targetingData = useMemo<TargetingData>(() => ({
    companies: { included: group.companies.map((c) => c.employer), excluded: [] },
    defaultTargeting: createEmptyPersonTargeting(),
    overrides: state.targeting,
  }), [group.companies, state.targeting]);
  const audience = useAudienceCount(targetingData);
  const audienceCheck = audienceCheckFor(audience, group.companies.map((c) => c.campaignId));

  const errors = editErrors(group, state, today);
  const diff = buildEditDiff(group, state);
  const blockers = audienceBlockers(group, state, audienceCheck.small);
  const changedTargeting = group.companies.some((c) => targetingChanged(group, state, c.campaignId));
  const audiencePending = changedTargeting && audienceCheck.pending;
  const showError = (key: string) => attemptedSave || !!touched[key];
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const money = (n: number) => fmtMoney(n, group.currency);
  const kind = group.budgetType === 'daily' ? 'diário' : 'total';
  const resultFor = (id: string) => outcome?.response.results?.find((r) => r.campaign_id === id);

  const setBudget = (id: string, value: string) =>
    setState((s) => ({ ...s, budgets: { ...s.budgets, [id]: value } }));
  const setTargeting = (id: string, pt: PersonTargeting) =>
    setState((s) => ({ ...s, targeting: { ...s.targeting, [id]: pt } }));

  const applyToAll = () => {
    if (Number.isNaN(parseBudget(allBudget))) {
      touch('allBudget');
      return;
    }
    setState((s) => ({ ...s, budgets: Object.fromEntries(group.companies.map((c) => [c.campaignId, allBudget.trim()])) }));
    group.companies.forEach((c) => touch(`budget:${c.campaignId}`));
  };

  const requestSave = () => {
    if (!diff.hasChanges || saving) return;
    setAttemptedSave(true);
    if (hasErrors(errors) || blockers.length > 0 || audiencePending) return;
    setConfirming(diff);
  };

  const doSave = async () => {
    setConfirming(null);
    setSaving(true);
    let request: UpdateRequest;
    try {
      request = buildUpdateRequest(group, state);
    } catch (err: any) {
      setOutcome({ request: { group_id: group.id, currency: group.currency, campaigns: [] }, response: { success: false, error: err.message } });
      setSaving(false);
      return;
    }
    let response: UpdateResponse;
    if (group.isMock) {
      // Demonstração: nada vai ao LinkedIn; todas as empresas "salvam".
      await new Promise((r) => setTimeout(r, 400));
      response = {
        success: true,
        group: request.group ? { success: true } : null,
        results: request.campaigns.map((c) => ({ campaign_id: c.campaign_id, success: true })),
      };
    } else {
      response = await updatePublishedCampaigns(request);
    }
    const saved = applySavedResults(group, request, response);
    setGroup(saved);
    setState((s) => stateAfterSave(s, saved));
    setOutcome({ request, response });
    setAttemptedSave(false);
    setSaving(false);
  };

  const discard = () => {
    setState(initialEditState(group));
    setTouched({});
    setAttemptedSave(false);
    setConfirmDiscard(false);
    setAllBudget('');
  };

  const leave = () => {
    if (diff.hasChanges) setPendingLeave(true);
    else navigate('/campaigns');
  };

  const endChanged = state.endDate !== commonEndDate(group);
  const footerProblem = blockers.length > 0
    ? `${smallAudienceSentence(blockers.map((b) => b.company))}. Amplie o público para salvar.`
    : audiencePending
      ? 'Calculando o público das empresas…'
      : attemptedSave && hasErrors(errors)
        ? 'Corrija os campos marcados para salvar.'
        : null;
  const saveEnabled = diff.hasChanges && !saving;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4 shadow-sm">
        <button onClick={leave} aria-label="Voltar para campanhas" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-800 truncate" title={`Editar campanha publicada · ${group.name}`}>
            <span className="text-slate-500 font-semibold">Editar campanha publicada · </span>
            {group.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
            <StatusBadge status={group.status} />
            <span className="inline-flex items-center gap-1.5">
              <LinkedInLogo size={12} />
              {group.adAccountName} · {group.currency}
            </span>
            <span>{plural(group.companies.length, 'empresa')}</span>
            {group.isMock && <span className="text-amber-700">Demonstração: as alterações não vão para o LinkedIn.</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {outcome && <SaveBanner outcome={outcome} group={group} />}

          {/* Nome do grupo */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle icon={<PencilLine className="w-4 h-4 text-[#FF5F39]" />} bg="bg-[#FFF1ED]" title="Nome do grupo" />
            <label htmlFor="group-name" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nome</label>
            <input
              id="group-name"
              value={state.groupName}
              onChange={(e) => setState((s) => ({ ...s, groupName: e.target.value }))}
              onBlur={() => touch('groupName')}
              aria-invalid={!!(errors.groupName && showError('groupName'))}
              className={`w-full p-2.5 text-sm border rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-[#FF5F39] ${errors.groupName && showError('groupName') ? 'border-red-300' : 'border-slate-200'}`}
            />
            {errors.groupName && showError('groupName') && <p className="text-xs text-red-600 mt-1">{errors.groupName}</p>}
            <p className="text-xs text-slate-500 mt-1.5">
              No LinkedIn, cada empresa aparece como “{state.groupName.trim() || '…'} — Empresa”. Mudar aqui renomeia o grupo e as {group.companies.length} campanhas.
            </p>
          </section>

          {/* Orçamento */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle icon={<DollarSign className="w-4 h-4 text-amber-600" />} bg="bg-amber-50" title={`Orçamento ${kind} por empresa`} />
            <p className="text-xs text-slate-500 mb-4">
              Cada empresa é uma campanha no LinkedIn com o próprio orçamento. O mínimo é {money(MIN_BUDGET_PER_AD_SET)} por empresa.
              {group.groupBudget != null && ' O teto do grupo acompanha a soma, para não cortar o gasto de nenhuma empresa.'}
            </p>

            <div className="flex flex-wrap items-end gap-2 mb-4">
              <div>
                <label htmlFor="all-budget" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Um valor para todas</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">{currencySymbol(group.currency)}</span>
                  <input
                    id="all-budget"
                    inputMode="decimal"
                    value={allBudget}
                    onChange={(e) => setAllBudget(e.target.value)}
                    onBlur={() => allBudget && touch('allBudget')}
                    placeholder="Ex.: 50"
                    className="w-40 p-2.5 pl-12 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-[#FF5F39]"
                  />
                </div>
              </div>
              <button onClick={applyToAll} className="px-3 py-2.5 text-sm font-medium text-[#E54A26] border border-[#FFD0C2] hover:bg-[#FFF1ED] rounded-lg">
                Aplicar a todas
              </button>
              {touched.allBudget && Number.isNaN(parseBudget(allBudget)) && (
                <p className="text-xs text-red-600 w-full">Informe um valor para aplicar a todas</p>
              )}
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {group.companies.map((c) => {
                const key = `budget:${c.campaignId}`;
                const err = errors.budgets[c.campaignId];
                const value = state.budgets[c.campaignId] ?? '';
                const changed = parseBudget(value) !== c.budget;
                return (
                  <div key={c.campaignId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <span className="flex-1 min-w-[10rem] text-sm text-slate-800">{c.company}</span>
                    {changed && !Number.isNaN(parseBudget(value)) && (
                      <span className="text-xs text-slate-500">antes {money(c.budget)}</span>
                    )}
                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 text-sm">{currencySymbol(group.currency)}</span>
                        <input
                          aria-label={`Orçamento ${kind} de ${c.company}`}
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => setBudget(c.campaignId, e.target.value)}
                          onBlur={() => touch(key)}
                          aria-invalid={!!(err && showError(key))}
                          className={`w-36 p-2 pl-12 text-sm border rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-[#FF5F39] ${err && showError(key) ? 'border-red-300' : changed ? 'border-[#FFB59F]' : 'border-slate-200'}`}
                        />
                      </div>
                      {err && showError(key) && <p className="text-xs text-red-600 mt-1">{err}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-[#212A46] mt-4 font-medium" data-testid="spend-statement">{editSpendStatement(group, state)}</p>
          </section>

          {/* Período */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle icon={<Calendar className="w-4 h-4 text-sky-600" />} bg="bg-sky-50" title="Período" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Início</span>
                <div className="flex items-center gap-2 p-2.5 text-sm border border-slate-100 bg-slate-50 rounded-lg text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  {group.startDate ? fmtDate(group.startDate) : '—'}
                </div>
                <p className="text-xs text-slate-400 mt-1">Não muda depois de publicada.</p>
              </div>
              <div>
                <label htmlFor="end-date" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Término</label>
                <div className="flex items-center gap-2">
                  <input
                    id="end-date"
                    type="date"
                    value={state.endDate}
                    min={today > group.startDate ? today : group.startDate}
                    onChange={(e) => setState((s) => ({ ...s, endDate: e.target.value }))}
                    onBlur={() => touch('endDate')}
                    aria-invalid={!!(errors.endDate && showError('endDate'))}
                    className={`flex-1 p-2 text-sm border rounded-lg bg-white text-slate-600 outline-none focus:ring-2 focus:ring-[#FF5F39] ${errors.endDate && showError('endDate') ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  {state.endDate && (
                    <button onClick={() => setState((s) => ({ ...s, endDate: '' }))} className="text-xs font-medium text-slate-500 hover:text-slate-700 shrink-0">
                      Sem término
                    </button>
                  )}
                </div>
                {errors.endDate && showError('endDate')
                  ? <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
                  : <p className="text-xs text-slate-400 mt-1">Opcional. Não pode ser antes de hoje nem antes do início.</p>}
                {!endChanged && state.endDate && state.endDate < today && (
                  <p className="text-xs text-amber-700 mt-1">Esta campanha terminou em {fmtDate(state.endDate)}. Escolha uma nova data para ela voltar a rodar.</p>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">{periodDetail(group.startDate, state.endDate)} Vale para todas as empresas do grupo.</p>
          </section>

          {/* Público por empresa */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle icon={<Users className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-50" title="Público por empresa" />
            <p className="text-xs text-slate-500 mb-4">
              As empresas do grupo são fixas. Você pode mudar quem, dentro de cada empresa, vê o anúncio. A empresa nunca sai do público: sem ela, o LinkedIn mostraria o anúncio para qualquer pessoa com os outros critérios.
            </p>
            <div className="space-y-2">
              {group.companies.map((c) => {
                const isOpen = openCompany === c.campaignId;
                const pt = state.targeting[c.campaignId] ?? c.targeting;
                const changed = !isSamePersonTargeting(c.targeting, pt);
                const a = audience.perAdSet.find((x) => x.id === c.campaignId);
                const small = audienceCheck.small.includes(c.campaignId);
                const blocking = small && changed;
                const r = resultFor(c.campaignId);
                return (
                  <div
                    key={c.campaignId}
                    ref={c.campaignId === focusId ? focusRef : undefined}
                    data-testid={`company-${c.campaignId}`}
                    className={`border rounded-lg ${blocking ? 'border-red-200' : isOpen ? 'border-[#FFB59F]' : 'border-slate-200'}`}
                  >
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => setOpenCompany(isOpen ? undefined : c.campaignId)}
                        aria-expanded={isOpen}
                        className="flex items-start gap-2 text-left flex-1 min-w-[14rem]"
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-900 flex items-center gap-2">
                            {c.company}
                            <StatusBadge status={c.status} />
                            {changed && <span className="text-[11px] font-medium text-[#E54A26]">público alterado</span>}
                          </span>
                          <span className="block text-xs text-slate-500 mt-0.5">{targetingSummary(pt)}</span>
                        </span>
                      </button>
                      <span className={`text-xs whitespace-nowrap ${small ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        {a ? (a.isPrivacyFloor ? `< ${MIN_AUDIENCE} pessoas` : `≈ ${a.count.toLocaleString('pt-BR')} pessoas`) : 'calculando…'}
                      </span>
                      <button
                        onClick={() => setOpenCompany(isOpen ? undefined : c.campaignId)}
                        className="text-xs font-medium text-[#E54A26] hover:text-[#FF5F39]"
                      >
                        {isOpen ? 'Fechar' : 'Editar público'}
                      </button>
                    </div>
                    {small && (
                      <p className={`px-4 pb-2 text-xs ${blocking ? 'text-red-600' : 'text-amber-700'}`}>
                        {blocking
                          ? `O público de ${c.company} está abaixo de ${MIN_AUDIENCE} pessoas. O LinkedIn recusa; amplie os critérios para salvar.`
                          : `O público de ${c.company} está abaixo de ${MIN_AUDIENCE} pessoas. Como ele não vai ser alterado, não impede salvar o resto.`}
                      </p>
                    )}
                    {r && <RowResult ok={r.success} error={r.error} />}
                    {isOpen && (
                      <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            Empresa: <strong className="font-semibold text-slate-800">{c.company}</strong>
                            <Lock className="w-3 h-3 text-slate-400" aria-label="travada" />
                          </span>
                          <button
                            onClick={() => setTargeting(c.campaignId, c.targeting)}
                            disabled={!changed}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Desfazer mudanças do público
                          </button>
                        </div>
                        {PERSON_FACET_CONFIG.map((f) => (
                          <FacetCard
                            key={f.key}
                            id={f.key}
                            icon={f.icon}
                            label={f.label}
                            description={f.description}
                            type={f.type}
                            options={f.options}
                            selection={pt[f.key]}
                            onSelectionChange={(sel) => setTargeting(c.campaignId, { ...pt, [f.key]: sel })}
                            defaultOpen={f.key === 'locations'}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* O que não dá para mudar */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle icon={<Lock className="w-4 h-4 text-slate-500" />} bg="bg-slate-100" title="O que não dá para mudar" />
            <ul className="space-y-3 text-sm">
              <Locked
                label="Objetivo e forma de cobrança"
                value={[objectiveLabel(group.objective), costTypeText(group.costType)].filter(Boolean).join(', ')}
                why="O LinkedIn fixa os dois quando a campanha é criada. Para outro objetivo, crie uma campanha nova."
              />
              <Locked
                label="Data de início"
                value={group.startDate ? fmtDate(group.startDate) : '—'}
                why="A campanha já foi publicada com esta data. Dá para mudar só o término."
              />
              <Locked
                label="Conta de anúncios"
                value={`${group.adAccountName} · ${group.currency}`}
                why="A campanha pertence a esta conta, e a moeda vem dela."
              />
              <Locked
                label="Empresas do grupo"
                value={group.companies.map((c) => c.company).join(', ')}
                why="Cada empresa é uma campanha no LinkedIn com público próprio. Para anunciar para outra empresa, crie outra campanha."
              />
              <Locked
                label="Anúncio publicado"
                value="Imagem, título e texto"
                why="O LinkedIn não deixa alterar um anúncio depois de publicado. Para trocar, é preciso pausar este e criar outro (ainda não dá para fazer por esta tela)."
              />
            </ul>
          </section>
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="bg-white border-t border-slate-200 px-8 py-4 flex justify-between items-center gap-4">
        {confirmDiscard ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Descartar as alterações?</span>
            <button onClick={discard} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Descartar</button>
            <button onClick={() => setConfirmDiscard(false)} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Continuar editando</button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={!diff.hasChanges || saving}
            className="px-6 py-2.5 rounded-lg border font-medium transition-colors border-slate-300 text-slate-700 hover:bg-slate-50 disabled:border-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed"
          >
            Descartar
          </button>
        )}
        <div className="flex items-center gap-3 min-w-0">
          <span role="status" className={`text-sm truncate ${footerProblem && (blockers.length > 0 || attemptedSave) ? 'text-red-600' : 'text-slate-500'}`}>
            {footerProblem ?? (diff.hasChanges ? `${plural(diff.companies.length, 'empresa')} com alterações` : 'Nenhuma alteração')}
          </span>
          <button
            onClick={requestSave}
            disabled={!saveEnabled}
            aria-disabled={!saveEnabled || blockers.length > 0}
            className={`px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-white shrink-0 ${
              saveEnabled && blockers.length === 0 ? 'bg-[#FF5F39] hover:bg-[#E54A26]' : 'bg-[#FF5F39]/40 cursor-not-allowed'
            }`}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmSave
          diff={confirming}
          group={group}
          spend={editSpendStatement(group, state)}
          spendBefore={editSpendStatement(group, initialEditState(group))}
          onCancel={() => setConfirming(null)}
          onConfirm={doSave}
        />
      )}

      {pendingLeave && (
        <Dialog title="Sair sem salvar?" onClose={() => setPendingLeave(false)}>
          <p className="text-sm text-slate-600">As alterações desta tela ainda não foram para o LinkedIn.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setPendingLeave(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Continuar editando</button>
            <button onClick={() => navigate('/campaigns')} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">Sair sem salvar</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function SectionTitle({ icon, bg, title }: { icon: React.ReactNode; bg: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
  );
}

function Locked({ label, value, why }: { label: string; value: string; why: string }) {
  return (
    <li className="flex gap-3">
      <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-slate-800"><span className="font-medium">{label}:</span> {value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{why}</p>
      </div>
    </li>
  );
}

function RowResult({ ok, error }: { ok: boolean; error?: string }) {
  return ok ? (
    <p className="px-4 pb-2 text-xs text-green-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Salvo no LinkedIn</p>
  ) : (
    <p className="px-4 pb-2 text-xs text-red-600 flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 mt-px shrink-0" /> Não foi salvo: {error || 'erro desconhecido'}. As alterações desta empresa continuam na tela para tentar de novo.</p>
  );
}

function SaveBanner({ outcome, group }: { outcome: NonNullable<SaveOutcome>; group: PublishedGroup }) {
  const { response, request } = outcome;
  const results = response.results ?? [];
  const okNames = results.filter((r) => r.success).map((r) => nameOf(group, r.campaign_id));
  const failNames = results.filter((r) => !r.success).map((r) => nameOf(group, r.campaign_id));
  if (results.length === 0) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Nada foi salvo. {response.error || 'O LinkedIn recusou as alterações.'}
      </div>
    );
  }
  if (failNames.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        {request.campaigns.length === 0 ? 'Grupo atualizado no LinkedIn.' : `Alterações salvas no LinkedIn para ${plural(okNames.length, 'empresa')}.`}
        {group.isMock && ' (Demonstração: nada foi enviado ao LinkedIn.)'}
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
      <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />
        {okNames.length > 0 ? `Salvo em parte: ${okNames.length} de ${results.length} empresas foram atualizadas.` : 'Nenhuma empresa foi atualizada.'}
      </p>
      {okNames.length > 0 && <p>Atualizadas no LinkedIn: {okNames.join(', ')}.</p>}
      <p>Não atualizadas: {failNames.join(', ')}. Elas continuam com os valores antigos no LinkedIn; as alterações delas seguem na tela para você tentar de novo.</p>
      {response.group && !response.group.success && <p>O grupo também não foi atualizado: {response.group.error}</p>}
    </div>
  );
}

function nameOf(group: PublishedGroup, id: string): string {
  return group.companies.find((c) => c.campaignId === id)?.company ?? id;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h3 id="edit-dialog-title" className="text-base font-bold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ConfirmSave({
  diff, group, spend, spendBefore, onCancel, onConfirm,
}: {
  diff: EditDiff;
  group: PublishedGroup;
  spend: string;
  spendBefore: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title={group.isMock ? 'Salvar alterações (demonstração)?' : 'Salvar estas alterações no LinkedIn?'} onClose={onCancel}>
      <p className="text-sm text-slate-600">
        Cada empresa é atualizada separadamente no LinkedIn. Se alguma falhar, as outras continuam salvas e a tela diz qual falhou.
      </p>
      {diff.group.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Grupo</p>
          <ChangeList changes={diff.group} />
        </div>
      )}
      {diff.companies.map((c) => (
        <div key={c.campaignId} data-testid={`diff-${c.campaignId}`}>
          <p className="text-sm font-semibold text-slate-800 mb-1">{c.company}</p>
          <ChangeList changes={c.changes} />
        </div>
      ))}
      <div className="rounded-lg bg-[#FFF1ED] border border-[#FFD0C2] p-3 text-sm text-[#212A46]">
        <p className="font-medium">{spend}</p>
        {spend !== spendBefore && <p className="text-xs text-slate-600 mt-1">Antes: {spendBefore}</p>}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Voltar e revisar</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm">
          {group.isMock ? 'Salvar' : 'Salvar no LinkedIn'}
        </button>
      </div>
    </Dialog>
  );
}

function ChangeList({ changes }: { changes: EditDiff['group'] }) {
  return (
    <ul className="text-sm text-slate-700 space-y-0.5">
      {changes.map((ch, i) => (
        <li key={i}>
          <span className="text-slate-500">{ch.label}:</span>{' '}
          {ch.from ? <><span className="line-through decoration-slate-400">{ch.from}</span> → <strong className="font-semibold">{ch.to}</strong></> : <strong className="font-semibold">{ch.to}</strong>}
        </li>
      ))}
    </ul>
  );
}
