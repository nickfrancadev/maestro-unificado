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
  Factory,
  ImageIcon,
  CreditCard,
} from 'lucide-react';
import { TargetAccount, CampaignConfig, OBJECTIVE_MAP } from './types';
import type { CreativeData } from './types';
import type { TargetingData, FacetItem } from './SegmentationStep';
import { buildTargetingCriteria } from './SegmentationStep';
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
  creativeData,
  billingStatus,
  onConfirm,
  onCancel,
}: {
  config: CampaignConfig;
  targetingData?: TargetingData;
  creativeData?: CreativeData;
  billingStatus?: BillingStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const objLabel = OBJECTIVE_MAP[config.objective]?.label || config.objective;
  const totalCriteria = targetingData
    ? Object.values(targetingData).reduce((s, sel) => s + sel.included.length, 0)
    : 0;
  const validCampaigns = config.campaigns.filter(c => c.name.trim());
  const hasImage = !!creativeData?.imageUrl;
  const hasBillingIssue = billingStatus && !billingStatus.has_billing;

  // Build dynamic step list based on what will actually run
  const pipelineSteps = [
    '1. Criar Campaign Group no LinkedIn',
    '2. Criar Campanha com Targeting completo',
    ...(hasImage ? [
      '3. Upload de imagem para o LinkedIn',
      '4. Criar Ad Creative (Headline + CTA + Image)',
    ] : []),
    config.autoActivate
      ? `${hasImage ? '5' : '3'}. Ativar a campanha (ACTIVE)`
      : `${hasImage ? '5' : '3'}. Campanha criada como PAUSED`,
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
              <span className="text-slate-500">Grupo:</span>
              <span className="font-medium text-slate-800">{config.campaignGroupName}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Campanhas ({validCampaigns.length})</span>
              <div className="mt-1.5 space-y-1">
                {validCampaigns.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFE3DA] text-[#E54A26] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <span className="text-sm text-slate-700 truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Objetivo:</span>
              <span className="font-medium text-slate-800">{objLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Budget/campanha:</span>
              <span className="font-medium text-slate-800">
                ${config.budgetAmount} ({config.budgetType === 'daily' ? 'diário' : 'total'})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Critérios de segmentação:</span>
              <span className="font-medium text-slate-800">{totalCriteria}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Criativo:</span>
              <span className={`font-medium ${hasImage ? 'text-green-700' : 'text-amber-700'}`}>
                {hasImage ? 'Com imagem' : 'Sem imagem (somente campanha)'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status após criação:</span>
              <span className={`font-medium ${config.autoActivate ? 'text-green-700' : 'text-amber-700'}`}>
                {config.autoActivate ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* Billing warning */}
          {hasBillingIssue && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Atenção:</strong> A Ad Account tem status <strong>{billingStatus?.account_status}</strong>.
                {config.autoActivate
                  ? ' A ativação pode falhar sem faturamento configurado. Recomendamos criar como PAUSED.'
                  : ' Configure um meio de pagamento antes de ativar manualmente.'}
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
                <strong>Segurança:</strong> Tokens ficam no servidor. Cada passo é idempotente.
                Se falhar, pode ser retentado sem duplicação. Audit trail completo no KV store.
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
            Lançar Campanha
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
  industries: { label: 'Setor / Indústria', icon: Factory },
  companySizes: { label: 'Porte da Empresa', icon: Building2 },
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
  const hasCreativeImage = !!creativeData?.imageUrl;
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
  const currencySymbol = currency === 'BRL' ? 'R$' : '$';

  // Targeting summary
  const targetingSummary = targetingData
    ? Object.entries(targetingData)
        .filter(([, sel]) => sel.included.length > 0)
        .map(([key, sel]) => ({
          key,
          ...(FACET_LABELS[key] || { label: key, icon: Target }),
          count: sel.included.length,
          items: sel.included.slice(0, 5).map((i: FacetItem) => i.label),
          hasMore: sel.included.length > 5,
        }))
    : [];

  const totalCriteria = targetingSummary.reduce((s, f) => s + f.count, 0);

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

    // Filter only campaigns with names
    const validCampaigns = campaignConfig.campaigns.filter(c => c.name.trim());
    if (validCampaigns.length === 0) return;

    // Build targeting criteria from segmentação data
    const targetingCriteria = targetingData ? buildTargetingCriteria(targetingData) : { include: { and: [] } };

    setIsPipelineRunning(true);
    setShowPipelineModal(true);

    // Build pipeline steps for all campaigns:
    // 1x Create Campaign Group + Nx (Create Campaign + Upload Image + Create Creative + Activate)
    const allSteps: PipelineStep[] = [
      { action: 'create-campaign-group', label: `Criar Grupo "${campaignConfig.campaignGroupName}"`, status: 'pending' },
      ...validCampaigns.flatMap((c, idx) => [
        { action: 'create-campaign' as const, label: `Campanha ${idx + 1}: "${c.name}"`, status: 'pending' as const },
      ]),
    ];
    setPipelineSteps(allSteps);

    let campaignGroupId: string | null = null;
    let allSuccess = true;

    // Run the FIRST campaign through the full pipeline (creates the group)
    const firstCampaign = validCampaigns[0];
    const firstParams: CampaignPipelineParams = {
      campaign_id: firstCampaign.id,
      ad_account_id: adAccountId,
      group_name: campaignConfig.campaignGroupName,
      campaign_name: firstCampaign.name,
      objective: campaignConfig.objective,
      targeting_criteria: targetingCriteria,
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
      // Creative data from Step 3
      image_url: creativeData?.imageUrl || undefined,
      headline: creativeData?.headline || undefined,
      description: creativeData?.bodyText || undefined,
      cta: creativeData?.cta || undefined,
      landing_page_url: creativeData?.landingPageUrl || undefined,
    };

    const firstResult = await runCampaignPipeline(firstParams, (steps) => {
      // Map pipeline steps to our allSteps display
      const cgStep = steps.find(s => s.action === 'create-campaign-group');
      const campStep = steps.find(s => s.action === 'create-campaign');
      if (cgStep) allSteps[0] = { ...allSteps[0], status: cgStep.status, result: cgStep.result };
      if (campStep) allSteps[1] = { ...allSteps[1], status: campStep.status, result: campStep.result };
      setPipelineSteps([...allSteps]);
    });

    // Extract group ID for subsequent campaigns
    const cgResult = firstResult.steps.find(s => s.action === 'create-campaign-group');
    campaignGroupId = cgResult?.result?.campaign_group_id || null;

    if (firstResult.success) {
      // Save first campaign to KV
      const campStep = firstResult.steps.find(s => s.action === 'create-campaign');
      await saveCampaignToServer({
        id: firstCampaign.id,
        name: firstCampaign.name,
        status: campaignConfig.autoActivate ? 'active' : 'paused',
        type: validCampaigns.length > 1 ? '1:Many' : '1:1',
        objective: campaignConfig.objective,
        campaign_group: campaignConfig.campaignGroupName,
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

      // Run remaining campaigns (reuse the group ID)
      for (let i = 1; i < validCampaigns.length; i++) {
        const campaign = validCampaigns[i];
        const stepIdx = i + 1; // +1 because allSteps[0] is the group

        allSteps[stepIdx] = { ...allSteps[stepIdx], status: 'running' };
        setPipelineSteps([...allSteps]);

        const params: CampaignPipelineParams = {
          campaign_id: campaign.id,
          ad_account_id: adAccountId,
          group_name: campaignConfig.campaignGroupName,
          campaign_name: campaign.name,
          objective: campaignConfig.objective,
          targeting_criteria: targetingCriteria,
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
          // Reuse the group created by the first campaign
          existing_campaign_group_id: campaignGroupId!,
        };

        const result = await runCampaignPipeline(params, (steps) => {
          const campStep = steps.find(s => s.action === 'create-campaign');
          if (campStep) {
            allSteps[stepIdx] = { ...allSteps[stepIdx], status: campStep.status, result: campStep.result };
            setPipelineSteps([...allSteps]);
          }
        });

        if (result.success) {
          allSteps[stepIdx] = { ...allSteps[stepIdx], status: 'success' };
          const campStep = result.steps.find(s => s.action === 'create-campaign');
          await saveCampaignToServer({
            id: campaign.id,
            name: campaign.name,
            status: campaignConfig.autoActivate ? 'active' : 'paused',
            type: '1:Many',
            objective: campaignConfig.objective,
            campaign_group: campaignConfig.campaignGroupName,
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
          allSteps[stepIdx] = { ...allSteps[stepIdx], status: 'error', result: { success: false, error: 'Pipeline failed' } };
          allSuccess = false;
        }
        setPipelineSteps([...allSteps]);
      }
    } else {
      allSuccess = false;
      console.error('[Launch] First pipeline failed — skipping remaining campaigns');
    }

    setIsPipelineRunning(false);

    if (allSuccess) {
      console.log(`[Launch] All ${validCampaigns.length} campaigns created successfully`);
    } else {
      console.error('[Launch] Some campaigns failed');
    }
  }, [linkedinStatus, targetingData, campaignConfig, currency, selectedAccounts]);

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
          disabled={!isLinkedInReady || isPipelineRunning}
          className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
            isLinkedInReady && !isPipelineRunning
              ? 'bg-[#FF5F39] hover:bg-[#E54A26] text-white hover:shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isPipelineRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {isPipelineRunning ? 'Criando...' : 'Go Live'}
        </button>
      </div>

      {/* LinkedIn not ready banner */}
      {!isLinkedInReady && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {linkedinStatus?.status !== 'connected'
              ? 'Conecte o LinkedIn em Integrações antes de lançar campanhas.'
              : 'Selecione uma Ad Account na página de Integrações.'}
          </p>
        </div>
      )}

      {/* Billing issue banner */}
      {hasBillingIssue && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            {billingStatus?.account_status === 'ERROR'
              ? `Erro ao verificar faturamento: ${billingStatus.error}`
              : 'Ad Account sem faturamento configurado.'}
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
              <span className="text-xs font-semibold text-slate-500 uppercase">Grupo</span>
              <span className="text-sm font-medium text-slate-800 text-right max-w-[60%] truncate">
                {campaignConfig.campaignGroupName || '—'}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Campanhas ({campaignConfig.campaigns.filter(c => c.name.trim()).length})</span>
              <div className="mt-1.5 space-y-1">
                {campaignConfig.campaigns.filter(c => c.name.trim()).map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFE3DA] text-[#E54A26] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <span className="text-sm text-slate-700 truncate">{c.name}</span>
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
              <span className="text-xs font-semibold text-slate-500 uppercase">Tipo</span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {campaignConfig.campaignType} / {campaignConfig.costType}
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
              <span className="text-xs font-semibold text-slate-500 uppercase">Budget</span>
              <span className="text-sm font-medium text-slate-800">
                {currencySymbol}{campaignConfig.budgetAmount}
                <span className="text-xs text-slate-500 ml-1">
                  ({campaignConfig.budgetType === 'daily' ? 'diário' : 'total'})
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Início</span>
              <span className="text-sm text-slate-700">{campaignConfig.startDate || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Encerramento</span>
              <span className="text-sm text-slate-700">{campaignConfig.endDate || 'Contínua'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Bidding</span>
              <span className="text-sm text-slate-700">
                {campaignConfig.biddingStrategy === 'automated'
                  ? 'Automático'
                  : `Manual ${campaignConfig.unitCostAmount ? `${currencySymbol}${campaignConfig.unitCostAmount}` : ''}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Auto-ativar</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                campaignConfig.autoActivate
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {campaignConfig.autoActivate ? 'Sim (ACTIVE)' : 'Não (PAUSED)'}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Segmentação */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Segmentação</h3>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full font-medium">
              {totalCriteria} critérios
            </span>
          </div>

          {targetingSummary.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Nenhum critério de segmentação definido. Volte ao Step 2 para configurar.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {targetingSummary.map((facet) => {
                const Icon = facet.icon;
                return (
                  <div key={facet.key} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-600 uppercase">{facet.label}</span>
                      <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200 ml-auto">
                        {facet.count}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {facet.items.map((item: string, idx: number) => (
                        <p key={idx} className="text-xs text-slate-700 truncate">
                          {item}
                        </p>
                      ))}
                      {facet.hasMore && (
                        <p className="text-xs text-[#FF5F39] font-medium">
                          +{facet.count - 5} mais
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card: Criativo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Criativo</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Imagem</span>
              {hasCreativeImage ? (
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {creativeData?.imageFileName || 'Enviada'}
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Sem imagem
                </span>
              )}
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase">Headline</span>
              <span className="text-sm text-slate-700 text-right max-w-[60%] truncate">
                {creativeData?.headline || '—'}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase">CTA</span>
              <span className="text-sm text-slate-700">{creativeData?.cta || 'LEARN_MORE'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase">Landing Page</span>
              <span className="text-sm text-slate-700 text-right max-w-[60%] truncate">
                {creativeData?.landingPageUrl || '—'}
              </span>
            </div>
            {!hasCreativeImage && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs text-amber-700">
                  Campanha sera criada sem criativo. Volte ao Step 3 para fazer upload de uma imagem.
                </p>
              </div>
            )}
          </div>
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
                  {billingStatus.account_status}
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
                    Nao configurado
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
                      ? <>A Ad Account está em <strong>BILLING_HOLD</strong> (sem método de pagamento válido). Adicione um cartão no LinkedIn Campaign Manager antes de ativar campanhas.</>
                      : billingStatus.serving_statuses && billingStatus.serving_statuses.length > 0
                      ? <>A Ad Account não está <strong>RUNNABLE</strong> (estado atual: {billingStatus.serving_statuses.join(', ')}). Resolva no LinkedIn Campaign Manager antes de ativar campanhas.</>
                      : <>A Ad Account tem status <strong>{billingStatus.account_status}</strong>. Configure um meio de pagamento no LinkedIn Campaign Manager antes de ativar campanhas.</>
                    }
                  </p>
                </div>
              )}
            </div>
          ) : !isLinkedInReady ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              LinkedIn nao conectado — verificacao indisponivel.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              Nao foi possivel verificar o status de faturamento.
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
                  Ad Account: {linkedinStatus?.selected_ad_account_name} | Moeda: {currency}
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
                    : 'Nenhuma Ad Account selecionada'}
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
          creativeData={creativeData}
          billingStatus={billingStatus}
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