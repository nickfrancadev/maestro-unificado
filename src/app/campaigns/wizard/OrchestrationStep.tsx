import React, { useState, useCallback } from 'react';
import {
  Rocket,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Linkedin,
  X,
  Loader2,
  Shield,
  Target,
  Megaphone,
  DollarSign,
  Calendar,
  Zap,
  Eye,
  Building2,
  MapPin,
  Briefcase,
  Users,
  ImageIcon,
  CreditCard,
} from 'lucide-react';
import { TargetAccount, CampaignConfig, OBJECTIVE_MAP } from './types';
import type { CreativeData } from './types';
import type { TargetingData, FacetItem } from './SegmentationStep';
import { totalIncludes } from './segmentation/targeting';
import { buildLaunchPlan, validateLaunchPlan } from './launchPlan';
import type { AdSetPlan } from './launchPlan';
import { resolveTargetingForAccount } from './SegmentationStep';
import { campaignTypeLabel, ctaLabel, adAccountStatusLabel, plural } from '../labels';
import { fmtCurrency, fmtDate } from '../format';
import {
  runCampaignPipeline,
  saveCampaignToServer,
  checkAdAccountBilling,
} from '@/lib/linkedin';
import type {
  PipelineStep,
  CampaignPipelineParams,
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
  /** Empresas cujo conjunto ficou abaixo de 300 pessoas na Segmentação. */
  smallAudienceAdSets?: string[];
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
            {isRunning ? 'Criando Campanha...' : hasError ? 'Erro no Pipeline' : 'Campanha Criada!'}
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
                {step.status === 'running' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
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
                  step.status === 'running' ? 'text-blue-700' :
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

// ---- Confirmation Modal ----
function ConfirmLaunchModal({
  config,
  targetingData,
  adSetPlan,
  billingStatus,
  currency,
  onConfirm,
  onCancel,
}: {
  config: CampaignConfig;
  targetingData?: TargetingData;
  adSetPlan: AdSetPlan[];
  billingStatus?: BillingStatus | null;
  currency: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const objLabel = OBJECTIVE_MAP[config.objective]?.label || config.objective;
  const adSetAccounts = targetingData?.companies.included ?? [];
  const totalCriteria = targetingData ? totalIncludes(targetingData) : 0;
  // Cada conjunto leva a própria imagem; o template pode nem ter uma.
  const withImage = adSetPlan.filter((a) => !!a.creative.imageUrl).length;
  const hasImage = adSetPlan.length > 0 && withImage === adSetPlan.length;
  const hasBillingIssue = billingStatus && !billingStatus.has_billing;

  // Build dynamic step list based on what will actually run
  const pipelineSteps = [
    '1. Criar o grupo de campanhas no LinkedIn',
    `2. Criar ${plural(adSetAccounts.length, 'conjunto')} de anúncio, um por empresa, cada um com a sua segmentação`,
    '3. Enviar a imagem e criar o anúncio de cada empresa',
    config.autoActivate
      ? '4. Ativar os conjuntos'
      : '4. Deixar os conjuntos pausados, para você ativar quando quiser',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            Confirmar Lançamento
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Campanha:</span>
              <span className="font-medium text-slate-800">{config.campaignName}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Conjuntos de anúncio ({adSetAccounts.length})</span>
              <div className="mt-1.5 space-y-1">
                {adSetAccounts.map((acc, idx) => (
                  <div key={acc.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFE3DA] text-[#E54A26] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <span className="text-sm text-slate-700 truncate">{acc.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Objetivo:</span>
              <span className="font-medium text-slate-800">{objLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Orçamento por conjunto:</span>
              <span className="font-medium text-slate-800">
                {fmtCurrency(parseFloat(config.budgetAmount) || 0, currency)} ({config.budgetType === 'daily' ? 'por dia' : 'total'})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Orçamento somado:</span>
              <span className="font-medium text-slate-800">
                {fmtCurrency((parseFloat(config.budgetAmount) || 0) * adSetAccounts.length, currency)} ({config.budgetType === 'daily' ? 'por dia' : 'total'})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Critérios de segmentação:</span>
              <span className="font-medium text-slate-800">{totalCriteria}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Criativo:</span>
              <span className={`font-medium ${hasImage ? 'text-green-700' : 'text-amber-700'}`}>
                {hasImage
                  ? `Um anúncio por empresa, ${adSetPlan.length === 1 ? 'com imagem' : `todos os ${adSetPlan.length} com imagem`}`
                  : `${adSetPlan.length - withImage} sem imagem`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status após criação:</span>
              <span className={`font-medium ${config.autoActivate ? 'text-green-700' : 'text-amber-700'}`}>
                {config.autoActivate ? 'Ativa' : 'Pausada'}
              </span>
            </div>
          </div>

          {/* Billing warning */}
          {hasBillingIssue && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Atenção:</strong> a conta de anúncios está com status <strong>{adAccountStatusLabel(billingStatus?.account_status)}</strong>.
                {config.autoActivate
                  ? ' A ativação pode falhar sem faturamento configurado. Recomendamos criar pausada.'
                  : ' Configure um meio de pagamento antes de ativar.'}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            {pipelineSteps.map((step) => (
              <div key={step} className="flex items-center gap-2 text-sm text-blue-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                {step}
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 leading-relaxed flex items-start gap-2">
              <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Segurança:</strong> o acesso ao LinkedIn fica no servidor. Se algum passo falhar,
                dá para tentar de novo sem duplicar o que já foi criado.
              </span>
            </p>
          </div>
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
const FACET_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  companies: { label: 'Empresas-Alvo', icon: Building2 },
  locations: { label: 'Localização', icon: MapPin },
  seniorities: { label: 'Senioridade', icon: Users },
  jobFunctions: { label: 'Função / Área', icon: Briefcase },
  jobTitles: { label: 'Cargo', icon: Briefcase },
  yearsOfExperience: { label: 'Anos de Experiência', icon: Target },
};

// ---- Main Component ----
export function OrchestrationStep({
  selectedAccounts,
  onAccountsChange,
  onLaunch,
  targetingData,
  campaignConfig,
  linkedinStatus,
  creativeData,
  smallAudienceAdSets = [],
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
  const hasBillingIssue = billingStatus && !billingStatus.has_billing;

  // Check billing on mount if LinkedIn is ready
  React.useEffect(() => {
    if (isLinkedInReady && !billingStatus && !billingLoading) {
      setBillingLoading(true);
      checkAdAccountBilling()
        .then((status) => {
          setBillingStatus(status);
          console.log('[Billing] Status:', status);
        })
        .catch((err) => {
          console.error('[Billing] Error:', err);
          setBillingStatus({ has_billing: false, account_status: 'ERROR', error: err.message });
        })
        .finally(() => setBillingLoading(false));
    }
  }, [isLinkedInReady]);

  const objInfo = OBJECTIVE_MAP[campaignConfig.objective];
  const currency = linkedinStatus?.selected_ad_account_currency || 'BRL';

  // Um id por lançamento: o servidor deduplica por ele (ver buildLaunchPlan).
  // Fica estável durante a revisão para que "tentar de novo" após uma falha
  // retome os passos já feitos em vez de duplicar.
  const runIdRef = React.useRef(Date.now().toString(36));

  // O que vai ser publicado, já resolvido por empresa, e o que impede publicar.
  const adSetPlan = targetingData && creativeData ? buildLaunchPlan(campaignConfig, targetingData, creativeData) : [];
  const planIssues = validateLaunchPlan(adSetPlan);
  // O LinkedIn recusa conjunto com menos de 300 pessoas: trava aqui também.
  for (const id of smallAudienceAdSets) {
    if (!adSetPlan.some((a) => a.companyId === id)) continue;
    planIssues[id] = [...(planIssues[id] || []), 'Público abaixo de 300 pessoas: volte à Segmentação e amplie os filtros'];
  }
  const blockedAdSets = Object.keys(planIssues).length;
  const canPublish = isLinkedInReady && !isPipelineRunning && adSetPlan.length > 0 && blockedAdSets === 0;


  // --- Launch pipeline ---
  const handleConfirmLaunch = useCallback(async () => {
    setShowConfirmModal(false);

    if (!linkedinStatus || linkedinStatus.status !== 'connected') {
      return;
    }

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
      { action: 'create-campaign-group', label: `Criar grupo "${campaignConfig.campaignName}"`, status: 'pending' },
      ...plan.map((a, idx) => ({
        action: 'create-campaign' as const,
        label: `Conjunto ${idx + 1}: "${a.name}" (segmentação + anúncio)`,
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

      const params: CampaignPipelineParams = {
        campaign_id: adSet.id,
        ad_account_id: adAccountId,
        group_name: campaignConfig.campaignName,
        campaign_name: adSet.name,
        objective: campaignConfig.objective,
        targeting_criteria: adSet.criteria,
        budget_type: campaignConfig.budgetType,
        budget_amount: parseFloat(campaignConfig.budgetAmount) || 0,
        currency,
        start_date: campaignConfig.startDate,
        end_date: campaignConfig.endDate || undefined,
        auto_activate: campaignConfig.autoActivate,
        campaign_type: campaignConfig.campaignType,
        cost_type: campaignConfig.costType as 'CPM' | 'CPC' | 'CPV',
        bidding_strategy: campaignConfig.biddingStrategy,
        unit_cost: campaignConfig.biddingStrategy !== 'automated' && campaignConfig.unitCostAmount
          ? { amount: campaignConfig.unitCostAmount, currency_code: currency }
          : undefined,
        group_budget_amount: (parseFloat(campaignConfig.budgetAmount) || 0) * plan.length,
        image_url: adSet.creative.imageUrl || undefined,
        headline: adSet.creative.headline || undefined,
        description: adSet.creative.bodyText || undefined,
        cta: adSet.creative.cta || undefined,
        landing_page_url: adSet.creative.landingPageUrl || undefined,
        // O primeiro conjunto cria o grupo; os demais reaproveitam o mesmo.
        existing_campaign_group_id: campaignGroupId || undefined,
      };

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
          status: campaignConfig.autoActivate ? 'active' : 'paused',
          type: plan.length > 1 ? '1:Many' : '1:1',
          objective: campaignConfig.objective,
          campaign_group: campaignConfig.campaignName,
          budget_type: campaignConfig.budgetType,
          budget_amount: parseFloat(campaignConfig.budgetAmount) || 0,
          currency: currency,
          spent: 0,
          impressions: 0,
          clicks: 0,
          start_date: campaignConfig.startDate || null,
          end_date: campaignConfig.endDate || null,
          linkedin_campaign_group_id: campaignGroupId,
          linkedin_campaign_id: campStep?.result?.linkedin_campaign_id || null,
          bidding_strategy: campaignConfig.biddingStrategy,
          auto_activate: campaignConfig.autoActivate,
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

    if (allSuccess) {
      console.log(`[Launch] All ${plan.length} ad sets created successfully`);
    } else {
      console.error('[Launch] Some ad sets failed');
    }
  }, [linkedinStatus, targetingData, campaignConfig, creativeData, currency]);

  const handlePipelineClose = () => {
    setShowPipelineModal(false);
    if (pipelineSteps.every((s) => s.status === 'success')) {
      onLaunch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Revisão & Lançamento</h2>
          <p className="text-sm text-slate-500 mt-1">
            Revise todos os detalhes da campanha antes de publicar no LinkedIn.
          </p>
        </div>
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={!canPublish}
          className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
            canPublish
              ? 'bg-[#FF5F39] hover:bg-[#E54A26] text-white hover:shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isPipelineRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {isPipelineRunning ? 'Publicando…' : 'Publicar campanha'}
        </button>
      </div>

      {/* LinkedIn not ready banner */}
      {!isLinkedInReady && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {linkedinStatus?.status !== 'connected'
              ? 'Conecte o LinkedIn em Integrações antes de lançar campanhas.'
              : 'Selecione uma conta de anúncios na página de Integrações.'}
          </p>
        </div>
      )}

      {/* Problemas que travam a publicação */}
      {blockedAdSets > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            {blockedAdSets === adSetPlan.length && adSetPlan.length > 1 ? 'Todos os conjuntos' : plural(blockedAdSets, 'conjunto')} com pendência. Corrija nos cards abaixo para liberar a publicação.
          </p>
        </div>
      )}

      {/* Billing issue banner */}
      {hasBillingIssue && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            {billingStatus?.account_status === 'ERROR'
              ? 'Não foi possível verificar o faturamento da conta de anúncios agora.'
              : 'A conta de anúncios está sem meio de pagamento configurado.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Configuração da Campanha */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1ED] flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[#FF5F39]" />
            </div>
            <h3 className="font-semibold text-slate-800">Configuração</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase">Campanha</span>
              <span className="text-sm font-medium text-slate-800 text-right max-w-[60%] truncate">
                {campaignConfig.campaignName || '—'}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Conjuntos de anúncio ({targetingData?.companies.included.length ?? 0})</span>
              <div className="mt-1.5 space-y-1">
                {(targetingData?.companies.included ?? []).map((acc, idx) => (
                  <div key={acc.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFE3DA] text-[#E54A26] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <span className="text-sm text-slate-700 truncate">{acc.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Objetivo</span>
              <span className="text-sm font-medium text-slate-800">
                {objInfo?.label || campaignConfig.objective}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Formato</span>
              <span className="text-sm text-slate-700">
                {campaignTypeLabel(campaignConfig.campaignType)} · cobrança por {campaignConfig.costType}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Orçamento */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Orçamento & Agenda</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Por conjunto</span>
              <span className="text-sm font-medium text-slate-800">
                {fmtCurrency(parseFloat(campaignConfig.budgetAmount) || 0, currency)}
                <span className="text-xs text-slate-500 ml-1">
                  ({campaignConfig.budgetType === 'daily' ? 'por dia' : 'total'})
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Somando os {adSetPlan.length}</span>
              <span className="text-sm font-medium text-slate-800">
                {fmtCurrency((parseFloat(campaignConfig.budgetAmount) || 0) * adSetPlan.length, currency)}
                <span className="text-xs text-slate-500 ml-1">
                  ({campaignConfig.budgetType === 'daily' ? 'por dia' : 'total'})
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Início</span>
              <span className="text-sm text-slate-700">{campaignConfig.startDate ? fmtDate(campaignConfig.startDate) : '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Encerramento</span>
              <span className="text-sm text-slate-700">{campaignConfig.endDate ? fmtDate(campaignConfig.endDate) : 'Contínua'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Lance</span>
              <span className="text-sm text-slate-700">
                {campaignConfig.biddingStrategy === 'automated'
                  ? 'Automático'
                  : `Manual${campaignConfig.unitCostAmount ? ` · ${fmtCurrency(parseFloat(campaignConfig.unitCostAmount) || 0, currency)}` : ''}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Auto-ativar</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                campaignConfig.autoActivate
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {campaignConfig.autoActivate ? 'Sim, publica ativa' : 'Não, publica pausada'}
              </span>
            </div>
          </div>
        </div>

        {/* Conjuntos de anúncio: o que vai para o LinkedIn, empresa por empresa.
            Antes a Revisão mostrava só a segmentação padrão e o criativo do
            template, escondendo a personalização de cada empresa. */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Conjuntos de anúncio</h3>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full font-medium">
              {plural(adSetPlan.length, 'conjunto')} · um por empresa
            </span>
          </div>

          {adSetPlan.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Nenhuma empresa-alvo selecionada. Volte ao passo 2, Segmentação.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {adSetPlan.map((adSet, idx) => {
                const issues = planIssues[adSet.companyId] || [];
                const person = targetingData ? resolveTargetingForAccount(targetingData, adSet.companyId) : null;
                const facets = person
                  ? (Object.entries(person) as Array<[string, { included?: FacetItem[] }]>)
                      .filter(([, sel]) => sel?.included && sel.included.length > 0)
                      .map(([key, sel]) => ({
                        label: (FACET_LABELS[key] || { label: key }).label,
                        items: sel.included!.map((i) => i.label),
                      }))
                  : [];
                let host = '';
                try { host = new URL(adSet.creative.landingPageUrl).hostname.replace(/^www\./, ''); } catch { host = ''; }
                return (
                  <div
                    key={adSet.companyId}
                    className={`rounded-lg border p-4 flex flex-col sm:flex-row gap-4 ${issues.length ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="w-full sm:w-40 shrink-0">
                      {adSet.creative.imageUrl ? (
                        <img
                          src={adSet.creative.imageUrl}
                          alt={`Anúncio para ${adSet.companyName}`}
                          className="w-full aspect-[1.91/1] object-cover rounded-md border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="w-full aspect-[1.91/1] rounded-md border border-dashed border-slate-300 bg-white flex items-center justify-center text-xs text-slate-400">
                          Sem imagem
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-[#FFE3DA] text-[#E54A26] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <span className="text-sm font-semibold text-slate-800">{adSet.companyName}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${adSet.customTargeting ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-500 border border-slate-200'}`}>
                          {adSet.customTargeting ? 'Segmentação personalizada' : 'Segmentação padrão'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 break-words">{adSet.creative.headline || '—'}</p>
                      <p className="text-xs text-slate-600 line-clamp-2 break-words">{adSet.creative.bodyText || '—'}</p>
                      <p className="text-xs text-slate-500">
                        {ctaLabel(adSet.creative.cta)} · {host || adSet.creative.landingPageUrl || 'sem URL'}
                      </p>
                      {facets.length > 0 && (
                        <p className="text-xs text-slate-500 break-words">
                          {facets.map((f) => `${f.label}: ${f.items.slice(0, 3).join(', ')}${f.items.length > 3 ? ` +${f.items.length - 3}` : ''}`).join(' · ')}
                        </p>
                      )}
                      {issues.length > 0 && (
                        <ul className="text-xs text-red-700 space-y-0.5">
                          {issues.map((issue) => (
                            <li key={issue} className="flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
              {blockedAdSets > 0 && (
                <p className="text-xs text-slate-500">
                  Imagem, título, texto e URL se ajustam no passo 4, Criativos.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card: Faturamento */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Faturamento</h3>
          </div>

          {billingLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando status de faturamento...
            </div>
          ) : billingStatus ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  billingStatus.has_billing
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {adAccountStatusLabel(billingStatus.account_status)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase">Pagamento</span>
                {billingStatus.has_billing ? (
                  <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Configurado
                  </span>
                ) : (
                  <span className="text-xs font-medium text-red-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Não configurado
                  </span>
                )}
              </div>
              {billingStatus.account_name && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Conta</span>
                  <span className="text-sm text-slate-700 truncate max-w-[60%]">{billingStatus.account_name}</span>
                </div>
              )}
              {!billingStatus.has_billing && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <p className="text-xs text-red-700">
                    {billingStatus.serving_statuses?.includes('BILLING_HOLD')
                      ? <>A conta de anúncios está <strong>bloqueada por pagamento</strong> (sem meio de pagamento válido). Adicione um cartão no Campaign Manager do LinkedIn antes de ativar campanhas.</>
                      : billingStatus.serving_statuses && billingStatus.serving_statuses.length > 0
                      ? <>A conta de anúncios <strong>não pode veicular</strong> agora (estado no LinkedIn: {billingStatus.serving_statuses.join(', ')}). Resolva no Campaign Manager do LinkedIn antes de ativar campanhas.</>
                      : <>A conta de anúncios está com status <strong>{adAccountStatusLabel(billingStatus.account_status)}</strong>. Configure um meio de pagamento no Campaign Manager do LinkedIn antes de ativar campanhas.</>
                    }
                  </p>
                </div>
              )}
            </div>
          ) : !isLinkedInReady ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              LinkedIn não conectado: não dá para verificar o faturamento.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              Não foi possível verificar o faturamento.
            </div>
          )}
        </div>

        {/* Card: LinkedIn Connection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-[#0077b5]" />
            </div>
            <h3 className="font-semibold text-slate-800">LinkedIn Ads</h3>
          </div>

          {isLinkedInReady ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Pronto para publicar
                </p>
                <p className="text-xs text-green-600">
                  Conta de anúncios: {linkedinStatus?.selected_ad_account_name} · Moeda: {currency}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {linkedinStatus?.status !== 'connected'
                    ? 'LinkedIn não conectado'
                    : 'Nenhuma conta de anúncios selecionada'}
                </p>
                <p className="text-xs text-red-600">
                  Configure em Integrações antes de lançar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmLaunchModal
          config={campaignConfig}
          targetingData={targetingData}
          adSetPlan={adSetPlan}
          billingStatus={billingStatus}
          currency={currency}
          onConfirm={handleConfirmLaunch}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Pipeline Progress Modal */}
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