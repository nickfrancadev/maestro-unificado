import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Settings2,
  Palette,
  Check,
  ChevronRight,
  ArrowLeft,
  Crosshair,
  Eye,
} from 'lucide-react';
import { ConfigStep } from './wizard/ConfigStep';
import { CreativeStep } from './wizard/CreativeStep';
import { OrchestrationStep } from './wizard/OrchestrationStep';
import { SegmentationStep, createEmptyTargeting, resolveTargetingForAccount } from './wizard/SegmentationStep';
import type { TargetingData } from './wizard/SegmentationStep';
import { TargetAccount, CampaignConfig, createDefaultCampaignConfig } from './wizard/types';
import { CreativeData, createDefaultCreativeData } from './wizard/types';
import { getLinkedInStatus } from '@/lib/linkedin';
import type { LinkedInIntegrationStatus } from '@/lib/linkedin';
import { toast } from 'sonner';

export function CampaignWizard() {
  const navigate = useNavigate();
  const { id: editingCampaignId } = useParams<{ id?: string }>();
  const onCancel = () => navigate('/campaigns');
  // TODO: when editingCampaignId is present, hydrate wizard state from the campaign
  void editingCampaignId;

  const [currentStep, setCurrentStep] = useState(1);
  const [draftSaved, setDraftSaved] = useState(false);

  // Campaign config state (lifted from OrchestrationStep)
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>(createDefaultCampaignConfig());

  // Creative data state (lifted from CreativeStep)
  const [creativeData, setCreativeData] = useState<CreativeData>(createDefaultCreativeData());

  // Shared campaign state
  const [selectedAccounts, setSelectedAccounts] = useState<TargetAccount[]>([]);
  const [targetingData, setTargetingData] = useState<TargetingData>(createEmptyTargeting());

  // LinkedIn status (fetched once, shared across steps)
  const [linkedinStatus, setLinkedInStatus] = useState<LinkedInIntegrationStatus | null>(null);

  useEffect(() => {
    getLinkedInStatus().then(setLinkedInStatus);
  }, []);

  const steps = [
    { id: 1, label: 'Configuração', icon: Settings2 },
    { id: 2, label: 'Segmentação', icon: Crosshair },
    { id: 3, label: 'Criativo', icon: Palette },
    { id: 4, label: 'Revisão & Lançamento', icon: Eye },
  ];

  const totalSteps = steps.length;

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const saveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleLaunch = () => {
    const accountCount = targetingData.companies.included.length;
    toast.success(
      `${accountCount} conjunto${accountCount !== 1 ? 's' : ''} de anúncio criado${accountCount !== 1 ? 's' : ''} no LinkedIn!`,
      {
        description: `Campanha "${campaignConfig.campaignName}" sincronizada com o LinkedIn Ads.`,
      }
    );
    setTimeout(() => onCancel(), 1500);
  };

  const canProceed = () => {
    if (currentStep === 1) {
      // Config step: require a campaign name
      return !!campaignConfig.campaignName.trim();
    }
    if (currentStep === 2) {
      // Segmentação: >=1 empresa-alvo E cada conjunto efetivo com >=1 localização.
      const accounts = targetingData.companies.included;
      if (accounts.length === 0) return false;
      return accounts.every((acc) => {
        const person = resolveTargetingForAccount(targetingData, acc.id);
        return person.locations.included.length > 0;
      });
    }
    if (currentStep === 3) {
      // Criativo: URL/CTA always required at template level. Each target
      // company must have either (a) full override (headline+body+image)
      // or (b) the template fully filled to fall back on.
      const urlAndCtaOk = !!(creativeData.landingPageUrl?.trim() && creativeData.cta);
      if (!urlAndCtaOk) return false;
      const templateComplete = !!(
        creativeData.bodyText?.trim() &&
        creativeData.headline?.trim() &&
        creativeData.imageUrl
      );
      const companies = targetingData.companies?.included || [];
      if (companies.length === 0) return templateComplete;
      const allCompaniesFullyOverridden = companies.every((c) => {
        const o = creativeData.overrides?.[c.id];
        return !!(o?.headline?.trim() && o?.bodyText?.trim() && o?.imageUrl);
      });
      return templateComplete || allCompaniesFullyOverridden;
    }
    // Review is always valid
    return true;
  };

  const getStepSummary = () => {
    if (currentStep === 1) {
      return campaignConfig.campaignName.trim() ? 'Campanha nomeada' : 'Nomeie a campanha';
    }
    if (currentStep === 2) {
      const n = targetingData.companies.included.length;
      const custom = Object.keys(targetingData.overrides).length;
      if (n === 0) return 'Selecione ao menos 1 conta';
      return `${n} conjunto${n !== 1 ? 's' : ''} de anúncio${custom > 0 ? ` · ${custom} personalizado${custom !== 1 ? 's' : ''}` : ''}`;
    }
    return '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Wizard Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-800">Nova Campanha</h2>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-1">
              <button
                onClick={() => {
                  // Allow clicking completed steps to go back
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                className={`flex items-center gap-1.5 ${
                  step.id < currentStep ? 'cursor-pointer' : 'cursor-default'
                } ${
                  currentStep === step.id
                    ? 'text-blue-600'
                    : currentStep > step.id
                      ? 'text-green-600'
                      : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors
                  ${
                    currentStep === step.id
                      ? 'border-blue-600 bg-blue-50'
                      : currentStep > step.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-300'
                  }
                `}
                >
                  {currentStep > step.id ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="font-medium hidden xl:block text-xs">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`w-6 h-0.5 ${
                    currentStep > idx + 1 ? 'bg-green-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-sm text-green-600 font-medium transition-opacity ${
              draftSaved ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Rascunho salvo!
          </span>
          <button
            onClick={saveDraft}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Salvar Rascunho
          </button>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto h-full">
          {currentStep === 1 && (
            <ConfigStep
              config={campaignConfig}
              onChange={setCampaignConfig}
              linkedinStatus={linkedinStatus}
            />
          )}
          {currentStep === 2 && (
            <SegmentationStep
              data={targetingData}
              onChange={setTargetingData}
            />
          )}
          {currentStep === 3 && (
            <CreativeStep
              selectedAccounts={selectedAccounts}
              targetingData={targetingData}
              creativeData={creativeData}
              onCreativeChange={setCreativeData}
            />
          )}
          {currentStep === 4 && (
            <OrchestrationStep
              selectedAccounts={selectedAccounts}
              onAccountsChange={setSelectedAccounts}
              onLaunch={handleLaunch}
              targetingData={targetingData}
              campaignConfig={campaignConfig}
              linkedinStatus={linkedinStatus}
              creativeData={creativeData}
            />
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white border-t border-slate-200 px-8 py-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`px-6 py-2.5 rounded-lg border font-medium transition-colors ${
            currentStep === 1
              ? 'border-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Voltar
        </button>

        <div className="flex items-center gap-3">
          {getStepSummary() && (
            <span className="text-sm text-slate-500">
              {getStepSummary()}
            </span>
          )}
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 ${
                !canProceed()
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Próximo Passo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            // No button here — the Go Live is inside OrchestrationStep
            <span className="text-xs text-slate-400">Use o botão "Go Live" acima para lançar.</span>
          )}
        </div>
      </div>
    </div>
  );
}