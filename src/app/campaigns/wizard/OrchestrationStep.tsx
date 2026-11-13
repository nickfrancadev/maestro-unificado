import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Linkedin,
  X,
  Loader2,
  Shield,
  Megaphone,
  CreditCard,
  ArrowRight,
  Users,
  ImageIcon,
} from 'lucide-react';
import { TargetAccount, CampaignConfig, OBJECTIVE_MAP, costTypeLabel } from './types';
import type { CreativeData } from './types';
import type { TargetingData, FacetItem } from './SegmentationStep';
import {
  buildLaunchPlan,
  validateLaunchPlan,
  buildPipelineParams,
  buildReviewChecklist,
  canPublishChecklist,
} from './launchPlan';
import type { AdSetPlan, ChecklistItem } from './launchPlan';
import { resolveTargetingForAccount } from './SegmentationStep';
import { audienceCheckFor, MIN_AUDIENCE } from './segmentation/useAudienceCount';
import type { AudienceState } from './segmentation/useAudienceCount';
import { campaignTypeLabel, ctaLabel, adAccountStatusLabel, plural } from '../labels';
import { fmtMoney, fmtDate, spendStatement } from '../format';
import {
  runCampaignPipeline,
  saveCampaignToServer,
  checkAdAccountBilling,
} from '@/lib/linkedin';
import type {
  PipelineStep,
  LinkedInIntegrationStatus,
  BillingStatus,
} from '@/lib/linkedin';

interface OrchestrationStepProps {
  selectedAccounts: TargetAccount[];
  onAccountsChange: (accounts: TargetAccount[]) => void;
  onLaunch: () => void;
  targetingData?: TargetingData;
  campaignConfig: CampaignConfig;
  linkedinStatus: LinkedInIntegrationStatus | null;
  creativeData?: CreativeData;
  /** Público por conjunto (useAudienceCount no wizard). Trava quem está abaixo de 300. */
  audience?: AudienceState;
  /** Leva ao passo que resolve uma pendência; companyId abre a empresa certa quando o passo sabe. */
  onGoToStep?: (step: number, companyId?: string) => void;
}

// ---- Pipeline Progress Modal ----
function PipelineProgressModal({
  steps,
  isRunning,
  hasError,
  onClose,
}: {
  steps: PipelineStep[];
  isRunning: boolean;
  hasError: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {isRunning ? 'Publicando a campanha…' : hasError ? 'Parte da campanha não foi criada' : 'Campanha publicada'}
          </h3>
          {!isRunning && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-3">
          {steps.map((step, idx) => (
            <div key={`${step.action}-${idx}`} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                {step.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {step.status === 'running' && <Loader2 className="w-5 h-5 text-[#FF5F39] animate-spin" />}
                {step.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                {step.status === 'pending' && (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs text-slate-400 font-bold">
                    {idx + 1}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <span className={`text-sm font-medium ${
                  step.status === 'success' ? 'text-green-700' :
                  step.status === 'running' ? 'text-[#E54A26]' :
                  step.status === 'error' ? 'text-red-700' :
                  'text-slate-500'
                }`}>
                  {step.label}
                </span>
                {step.status === 'error' && step.result?.error && (
                  <p className="text-xs text-red-500 mt-0.5 break-all">{step.result.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isRunning && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm"
            >
              {hasError ? 'Fechar' : 'Concluído'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Frase de gasto ----
// O orçamento é por empresa. Toda tela que mostra dinheiro escreve a conta
// (empresas × valor) e o teto por mês ou pelo período, para ninguém publicar
// dez empresas achando que vai gastar o valor de uma.
function SpendStatement({ config, adSets, currency, compact = false }: {
  config: CampaignConfig; adSets: number; currency: string; compact?: boolean;
}) {
  const perAdSet = parseFloat(config.budgetAmount) || 0;
  const s = spendStatement({
    perAdSet, adSets, budgetType: config.budgetType, currency,
    startDate: config.startDate, endDate: config.endDate,
  });
  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-slate-900 leading-snug`}>{s.headline}</p>
      {s.detail && <p className="text-xs text-slate-500 leading-relaxed">{s.detail}</p>}
      {currency !== 'BRL' && (
        <p className="text-xs text-amber-700 flex items-start gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Esta conta cobra em {currency}, não em reais.
        </p>
      )}
    </div>
  );
}

// ---- Confirmation Modal ----
function ConfirmLaunchModal({
  config,
  adSetPlan,
  billingStatus,
  currency,
  onConfirm,
  onCancel,
}: {
  config: CampaignConfig;
  adSetPlan: AdSetPlan[];
  billingStatus?: BillingStatus | null;
  currency: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const objLabel = OBJECTIVE_MAP[config.objective]?.label || config.objective;
  const hasBillingIssue = billingStatus && !billingStatus.has_billing;

  // Os passos que o lançamento realmente executa, nesta ordem.
  const pipelineSteps = [
    'Criar o grupo de campanhas no LinkedIn',
    `Criar ${plural(adSetPlan.length, 'conjunto')} de anúncio, um por empresa, cada um com a sua segmentação`,
    'Enviar a imagem e criar o anúncio de cada empresa',
    config.autoActivate
      ? 'Ativar os conjuntos: o gasto começa em seguida'
      : 'Deixar os conjuntos pausados, para você ativar quando quiser',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="confirm-launch-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 id="confirm-launch-title" className="text-lg font-bold text-slate-900">
            Publicar {config.campaignName ? `"${config.campaignName}"` : 'a campanha'}?
          </h3>
          <button onClick={onCancel} aria-label="Fechar" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#FFF1ED] border border-[#FFD0C2] rounded-xl p-4">
            <SpendStatement config={config} adSets={adSetPlan.length} currency={currency} compact />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Empresas</span>
              <span className="font-medium text-slate-800 text-right">{adSetPlan.map((a) => a.companyName).join(', ')}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Objetivo</span>
              <span className="font-medium text-slate-800 text-right">{objLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Cobrança</span>
              <span className="font-medium text-slate-800 text-right">{costTypeLabel(config)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Ao publicar</span>
              <span className={`font-medium ${config.autoActivate ? 'text-green-700' : 'text-slate-800'}`}>
                {config.autoActivate ? 'Ativa' : 'Pausada'}
              </span>
            </div>
          </div>

          {hasBillingIssue && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                A conta de anúncios está <strong>{adAccountStatusLabel(billingStatus?.account_status)}</strong> e sem meio de pagamento.
                {config.autoActivate
                  ? ' A ativação pode falhar. Recomendamos publicar pausada.'
                  : ' Configure o pagamento antes de ativar.'}
              </div>
            </div>
          )}

          <ol className="space-y-2">
            {pipelineSteps.map((step, idx) => (
              <li key={step} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#FFE3DA] text-[#E54A26] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <p className="text-xs text-slate-500 leading-relaxed flex items-start gap-2">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            Se algum passo falhar, dá para tentar de novo sem duplicar o que já foi criado.
          </p>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            Publicar campanha
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Facet label helper ----
const FACET_LABELS: Record<string, string> = {
  locations: 'Localização',
  seniorities: 'Senioridade',
  jobFunctions: 'Função',
  jobTitles: 'Cargo',
  yearsOfExperience: 'Experiência',
};

const CHECK_ICON: Record<ChecklistItem['status'], { icon: React.ElementType; className: string; label: string }> = {
  ok: { icon: CheckCircle2, className: 'text-green-600', label: 'Ok' },
  attention: { icon: AlertTriangle, className: 'text-amber-500', label: 'Atenção' },
  blocked: { icon: AlertCircle, className: 'text-red-600', label: 'Impede a publicação' },
};

// ---- Main Component ----
export function OrchestrationStep({
  onLaunch,
  targetingData,
  campaignConfig,
  linkedinStatus,
  creativeData,
  audience,
  onGoToStep,
}: OrchestrationStepProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Pipeline state
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  // Billing check state
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const isLinkedInReady = linkedinStatus?.status === 'connected' && !!linkedinStatus?.selected_ad_account_id;

  // Check billing on mount if LinkedIn is ready
  React.useEffect(() => {
    if (isLinkedInReady && !billingStatus && !billingLoading) {
      setBillingLoading(true);
      checkAdAccountBilling()
        .then(setBillingStatus)
        .catch((err) => {
          console.error('[Billing] Error:', err);
          setBillingStatus({ has_billing: false, account_status: 'ERROR', error: err.message });
        })
        .finally(() => setBillingLoading(false));
    }
  }, [isLinkedInReady]);

  const objInfo = OBJECTIVE_MAP[campaignConfig.objective];
  const currency = linkedinStatus?.selected_ad_account_currency || 'BRL';
  const perAdSet = parseFloat(campaignConfig.budgetAmount) || 0;

  // Um id por lançamento: o servidor deduplica por ele (ver buildLaunchPlan).
  // Fica estável durante a revisão para que "tentar de novo" após uma falha
  // retome os passos já feitos em vez de duplicar.
  const runIdRef = React.useRef(Date.now().toString(36));

  // O que vai ser publicado, já resolvido por empresa, e o que impede publicar.
  const adSetPlan = targetingData && creativeData ? buildLaunchPlan(campaignConfig, targetingData, creativeData) : [];
  const creativeIssues = validateLaunchPlan(adSetPlan);
  // O público vale para TODA empresa, personalizada ou não. Sem o cálculo
  // (wizard antigo), trata como pendente: não dá para publicar no escuro.
  const audienceCheck = audience
    ? audienceCheckFor(audience, adSetPlan.map((a) => a.companyId))
    : { small: [], pending: adSetPlan.length > 0 };
  const audienceById = new Map((audience?.perAdSet ?? []).map((a) => [a.id, a]));
  const checklist = buildReviewChecklist({
    config: campaignConfig,
    plan: adSetPlan,
    creativeIssues,
    audience: audienceCheck,
    linkedInReady: isLinkedInReady,
    hasBilling: billingStatus ? billingStatus.has_billing : null,
  });
  const blocking = checklist.filter((i) => i.blocking);
  const canPublish = !isPipelineRunning && canPublishChecklist(checklist);

  // --- Launch pipeline ---
  const handleConfirmLaunch = useCallback(async () => {
    setShowConfirmModal(false);

    if (!linkedinStatus || linkedinStatus.status !== 'connected') return;
    const adAccountId = linkedinStatus.selected_ad_account_id || '';
    if (!adAccountId) {
      console.error('[Launch] No ad account selected');
      return;
    }

    // Um conjunto de anúncio por empresa-alvo (modelo ABM do LinkedIn), cada um
    // com a sua segmentação e o seu criativo. Ver buildLaunchPlan.
    if (!targetingData || !creativeData) return;
    const plan = buildLaunchPlan(campaignConfig, targetingData, creativeData, { runId: runIdRef.current });
    if (plan.length === 0) return;

    setIsPipelineRunning(true);
    setShowPipelineModal(true);

    // 1x grupo de campanhas + Nx (conjunto com segmentação + imagem + anúncio + ativação)
    const allSteps: PipelineStep[] = [
      { action: 'create-campaign-group', label: `Criar o grupo "${campaignConfig.campaignName}"`, status: 'pending' },
      ...plan.map((a) => ({
        action: 'create-campaign' as const,
        label: `${a.companyName}: segmentação e anúncio`,
        status: 'pending' as const,
      })),
    ];
    setPipelineSteps(allSteps);

    let campaignGroupId: string | null = null;
    let allSuccess = true;

    for (let i = 0; i < plan.length; i++) {
      const adSet = plan[i];
      const stepIdx = i + 1; // allSteps[0] é o grupo

      if (i > 0 && !campaignGroupId) {
        allSteps[stepIdx] = {
          ...allSteps[stepIdx],
          status: 'error',
          result: { success: false, error: 'O grupo da campanha não foi criado.' },
        };
        allSuccess = false;
        continue;
      }

      allSteps[stepIdx] = { ...allSteps[stepIdx], status: 'running' };
      setPipelineSteps([...allSteps]);

      // O que vai ao servidor sai de uma função pura (testada): o "Ao
      // publicar: Pausada/Ativa" e a cobrança mostrados aqui são os enviados.
      const params = buildPipelineParams(adSet, plan, campaignConfig, {
        adAccountId, currency, campaignGroupId,
      });

      const result = await runCampaignPipeline(params, (steps) => {
        if (i === 0) {
          const cgStep = steps.find((s) => s.action === 'create-campaign-group');
          if (cgStep) allSteps[0] = { ...allSteps[0], status: cgStep.status, result: cgStep.result };
        }
        const failed = steps.find((s) => s.status === 'error');
        if (failed) allSteps[stepIdx] = { ...allSteps[stepIdx], status: 'error', result: failed.result };
        setPipelineSteps([...allSteps]);
      });

      if (i === 0) {
        const cgResult = result.steps.find((s) => s.action === 'create-campaign-group');
        campaignGroupId = cgResult?.result?.campaign_group_id || null;
      }

      if (result.success) {
        allSteps[stepIdx] = { ...allSteps[stepIdx], status: 'success' };
        const campStep = result.steps.find((s) => s.action === 'create-campaign');
        await saveCampaignToServer({
          id: adSet.id,
          name: adSet.name,
          status: params.auto_activate ? 'active' : 'paused',
          type: plan.length > 1 ? '1:Many' : '1:1',
          objective: campaignConfig.objective,
          campaign_group: campaignConfig.campaignName,
          budget_type: campaignConfig.budgetType,
          budget_amount: params.budget_amount,
          currency: currency,
          spent: 0,
          impressions: 0,
          clicks: 0,
          start_date: campaignConfig.startDate || null,
          end_date: campaignConfig.endDate || null,
          linkedin_campaign_group_id: campaignGroupId,
          linkedin_campaign_id: campStep?.result?.linkedin_campaign_id || null,
          bidding_strategy: params.bidding_strategy,
          auto_activate: params.auto_activate,
        });
      } else {
        const failed = result.steps.find((s) => s.status === 'error');
        allSteps[stepIdx] = {
          ...allSteps[stepIdx],
          status: 'error',
          result: failed?.result ?? { success: false, error: 'Falha ao criar o conjunto.' },
        };
        allSuccess = false;
      }
      setPipelineSteps([...allSteps]);
    }

    setIsPipelineRunning(false);
    if (!allSuccess) console.error('[Launch] Some ad sets failed');
  }, [linkedinStatus, targetingData, campaignConfig, creativeData, currency]);

  const handlePipelineClose = () => {
    setShowPipelineModal(false);
    if (pipelineSteps.every((s) => s.status === 'success')) {
      onLaunch();
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Revisão</h2>
        <p className="text-sm text-slate-500 mt-1">
          Confira cada anúncio como ele vai ao LinkedIn. A coluna da direita diz quanto você vai gastar e o que falta para publicar.
        </p>
      </div>

      {/* Conteúdo à esquerda, coluna fixa à direita com gasto, checklist e o
          botão de publicar (referência: revisão da Semrush e checklist de
          lançamento da Eventbrite). */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Um card por empresa: o anúncio e a segmentação que vão ao ar. */}
          <section aria-labelledby="review-adsets" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 id="review-adsets" className="font-semibold text-slate-800">Anúncios por empresa</h3>
              <span className="text-xs text-slate-500">{plural(adSetPlan.length, 'empresa')} · {plural(adSetPlan.length, 'conjunto')} de anúncio</span>
            </div>

            {adSetPlan.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Nenhuma empresa-alvo escolhida. Volte ao passo 2, Segmentação.</span>
              </div>
            ) : adSetPlan.map((adSet) => {
              const issues = creativeIssues[adSet.companyId] || [];
              const isSmall = audienceCheck.small.includes(adSet.companyId);
              const aud = audienceById.get(adSet.companyId);
              const person = targetingData ? resolveTargetingForAccount(targetingData, adSet.companyId) : null;
              const facets = person
                ? (Object.entries(person) as Array<[string, { included?: FacetItem[] }]>)
                    .filter(([, sel]) => sel?.included && sel.included.length > 0)
                    .map(([key, sel]) => ({
                      label: FACET_LABELS[key] || key,
                      items: sel.included!.map((i) => i.label),
                    }))
                : [];
              let host = '';
              try { host = new URL(adSet.creative.landingPageUrl).hostname.replace(/^www\./, ''); } catch { host = ''; }
              const blocked = issues.length > 0 || isSmall;
              return (
                <article
                  key={adSet.companyId}
                  aria-label={adSet.companyName}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row gap-4 ${blocked ? 'border-red-200' : 'border-slate-200'}`}
                >
                  <div className="w-full sm:w-48 shrink-0">
                    {adSet.creative.imageUrl ? (
                      <img
                        src={adSet.creative.imageUrl}
                        alt={`Anúncio para ${adSet.companyName}`}
                        className="w-full aspect-[1.91/1] object-cover rounded-md border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="w-full aspect-[1.91/1] rounded-md border border-dashed border-red-300 bg-red-50/50 flex flex-col items-center justify-center gap-1 text-xs text-red-600">
                        <ImageIcon className="w-4 h-4" />
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{adSet.companyName}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {adSet.customTargeting ? 'Segmentação própria' : 'Segmentação padrão'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 break-words">{adSet.creative.headline || <span className="text-red-600">Sem título</span>}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 break-words">{adSet.creative.bodyText || '—'}</p>
                    <p className="text-xs text-slate-500">
                      Botão "{ctaLabel(adSet.creative.cta)}" · leva para {host || 'URL inválida'}
                    </p>
                    {facets.length > 0 && (
                      <p className="text-xs text-slate-500 break-words">
                        {facets.map((f) => `${f.label}: ${f.items.slice(0, 3).join(', ')}${f.items.length > 3 ? ` +${f.items.length - 3}` : ''}`).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
                      <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${isSmall ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="w-3 h-3" />
                        {aud
                          ? aud.isPrivacyFloor ? `menos de ${MIN_AUDIENCE} pessoas` : `${aud.count.toLocaleString('pt-BR')} pessoas`
                          : 'calculando público…'}
                      </span>
                      <span className="text-slate-600">
                        {fmtMoney(perAdSet, currency)} {campaignConfig.budgetType === 'daily' ? 'por dia' : 'no total'}
                      </span>
                    </div>
                    {(issues.length > 0 || isSmall) && (
                      <ul className="text-xs text-red-700 space-y-0.5 pt-1">
                        {isSmall && (
                          <li className="flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            Público abaixo de {MIN_AUDIENCE} pessoas: o LinkedIn não aceita
                          </li>
                        )}
                        {issues.map((issue) => (
                          <li key={issue} className="flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Configuração */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFF1ED] flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-[#FF5F39]" />
                </div>
                <h3 className="font-semibold text-slate-800">Configuração</h3>
              </div>
              {onGoToStep && (
                <button onClick={() => onGoToStep(1)} className="text-xs font-medium text-[#E54A26] hover:underline cursor-pointer">
                  Editar
                </button>
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Campanha</dt>
                <dd className="font-medium text-slate-800 truncate" title={campaignConfig.campaignName}>{campaignConfig.campaignName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Objetivo</dt>
                <dd className="font-medium text-slate-800">{objInfo?.label || campaignConfig.objective}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Formato e cobrança</dt>
                <dd className="text-slate-700">{campaignTypeLabel(campaignConfig.campaignType)} · {costTypeLabel(campaignConfig)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Lance</dt>
                <dd className="text-slate-700">
                  {campaignConfig.biddingStrategy === 'automated'
                    ? 'Automático'
                    : `Manual${campaignConfig.unitCostAmount ? `, até ${fmtMoney(parseFloat(campaignConfig.unitCostAmount) || 0, currency)}` : ''}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Início</dt>
                <dd className="text-slate-700">{campaignConfig.startDate ? fmtDate(campaignConfig.startDate) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Encerramento</dt>
                <dd className="text-slate-700">{campaignConfig.endDate ? fmtDate(campaignConfig.endDate) : 'Sem data, até você pausar'}</dd>
              </div>
            </dl>
          </section>

          {/* Conta e faturamento */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Conta de anúncios</h3>
            </div>
            {isLinkedInReady ? (
              <p className="text-sm text-slate-700 flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                {linkedinStatus?.selected_ad_account_name || 'LinkedIn Ads'} · cobra em {currency}
              </p>
            ) : (
              <p className="text-sm text-red-700">
                {linkedinStatus?.status !== 'connected' ? 'LinkedIn não conectado.' : 'Nenhuma conta de anúncios escolhida.'}{' '}
                <Link to="/integrations" className="font-medium underline">Configurar em Integrações</Link>
              </p>
            )}
            {billingLoading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando o pagamento da conta…
              </p>
            ) : billingStatus && (
              billingStatus.has_billing ? (
                <p className="text-sm text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Pagamento configurado ({adAccountStatusLabel(billingStatus.account_status)})
                </p>
              ) : (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {billingStatus.account_status === 'ERROR'
                    ? 'Não foi possível verificar o pagamento da conta agora.'
                    : billingStatus.serving_statuses?.includes('BILLING_HOLD')
                      ? 'A conta está bloqueada por falta de pagamento. Adicione um cartão no Campaign Manager do LinkedIn antes de ativar.'
                      : `A conta está ${adAccountStatusLabel(billingStatus.account_status).toLowerCase()} e sem meio de pagamento. Configure no Campaign Manager do LinkedIn antes de ativar.`}
                </p>
              )
            )}
          </section>
        </div>

        {/* Coluna fixa: gasto, checklist e publicar */}
        <aside className="lg:sticky lg:top-0 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Gasto</p>
              <SpendStatement config={campaignConfig} adSets={adSetPlan.length} currency={currency} />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Antes de publicar</p>
              <ul className="space-y-2.5" aria-label="Checklist de publicação">
                {checklist.map((item) => {
                  const meta = CHECK_ICON[item.status];
                  const Icon = meta.icon;
                  return (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${meta.className}`} aria-label={meta.label} />
                      <div className="min-w-0">
                        <p className={item.status === 'blocked' ? 'text-slate-900' : 'text-slate-700'}>{item.label}</p>
                        {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
                        {item.fix && onGoToStep && (
                          <button
                            onClick={() => onGoToStep(item.fix!.step, item.fix!.companyId)}
                            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#E54A26] hover:text-[#FF5F39] hover:underline cursor-pointer"
                          >
                            {item.fix.label}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {item.id === 'linkedin' && item.status === 'blocked' && (
                          <Link to="/integrations" className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#E54A26] hover:underline">
                            Ir para Integrações
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              {/* Sai do mesmo campo que vai em auto_activate (buildPipelineParams). */}
              <p className="text-sm text-slate-600 flex items-center justify-between">
                <span>Ao publicar</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  campaignConfig.autoActivate ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {campaignConfig.autoActivate ? 'Ativa' : 'Pausada'}
                </span>
              </p>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!canPublish}
                className={`w-full px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all ${
                  canPublish
                    ? 'bg-[#FF5F39] hover:bg-[#E54A26] text-white hover:shadow-md'
                    : 'bg-[#FF5F39]/40 text-white cursor-not-allowed'
                }`}
              >
                {isPipelineRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {isPipelineRunning ? 'Publicando…' : 'Publicar campanha'}
              </button>
              {!canPublish && !isPipelineRunning && (
                <p className="text-xs text-slate-500 text-center">
                  {blocking.length > 0
                    ? `Resolva ${blocking.length === 1 ? 'o item marcado' : `os ${blocking.length} itens marcados`} acima para publicar.`
                    : ''}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showConfirmModal && (
        <ConfirmLaunchModal
          config={campaignConfig}
          adSetPlan={adSetPlan}
          billingStatus={billingStatus}
          currency={currency}
          onConfirm={handleConfirmLaunch}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {showPipelineModal && (
        <PipelineProgressModal
          steps={pipelineSteps}
          isRunning={isPipelineRunning}
          hasError={pipelineSteps.some((s) => s.status === 'error')}
          onClose={handlePipelineClose}
        />
      )}
    </div>
  );
}
