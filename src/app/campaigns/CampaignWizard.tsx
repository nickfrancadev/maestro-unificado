import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams, useHref } from 'react-router-dom';
import {
  Settings2,
  PaintBucket,
  Palette,
  Check,
  ChevronRight,
  ArrowLeft,
  Crosshair,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { ConfigStep } from './wizard/ConfigStep';
import { BriefStep, createEmptyBriefDraft } from './wizard/BriefStep';
import { CreativeStep } from './wizard/CreativeStep';
import { OrchestrationStep } from './wizard/OrchestrationStep';
import { SegmentationStep, createEmptyTargeting, smallAudienceSentence } from './wizard/SegmentationStep';
import { canProceedFromStep, creativeIssues } from './wizard/wizardGates';
import type { TargetingData } from './wizard/SegmentationStep';
import { useAudienceCount, audienceCheckFor } from './wizard/segmentation/useAudienceCount';
import { TargetAccount, CampaignConfig, createDefaultCampaignConfig, MIN_BUDGET_PER_AD_SET } from './wizard/types';
import { CreativeData, createDefaultCreativeData } from './wizard/types';
import type { BriefDraft } from './wizard/BriefPane';
import { saveDraft, getDraft, deleteDraft, newDraftId, isDraftId } from './drafts';
import type { CampaignDraft, WizardDraftState } from './drafts';
import { getLinkedInStatus } from '@/lib/linkedin';
import type { LinkedInIntegrationStatus } from '@/lib/linkedin';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Configuração', icon: Settings2 },
  { id: 2, label: 'Segmentação', icon: Crosshair },
  { id: 3, label: 'Marca', icon: PaintBucket },
  { id: 4, label: 'Criativos', icon: Palette },
  { id: 5, label: 'Revisão', icon: Eye },
];
const TOTAL_STEPS = STEPS.length;

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** O que o rascunho guarda, sem o passo: base da comparação "tem alteração não salva?". */
function snapshotOf(s: Omit<WizardDraftState, 'step'>): string {
  const { campaignConfig, targetingData, creativeData, briefDraft, selectedAccounts } = s;
  return JSON.stringify({ campaignConfig, targetingData, creativeData, briefDraft, selectedAccounts });
}

export function CampaignWizard() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  // Prefixo do app no GitHub Pages ("/repo/"): tirado do href antes de navegar.
  const basePath = useHref('/').replace(/\/$/, '');

  // Reabrir um rascunho devolve o estado INTEIRO, inclusive segmentação e
  // criativo por empresa, e abre no passo em que o usuário parou. Lido uma vez,
  // no primeiro render, para não sobrescrever o que ele editar depois.
  const [boot] = useState(() => {
    const draft = isDraftId(routeId) ? getDraft(routeId) : null;
    return {
      draft,
      draftId: draft?.id ?? newDraftId(),
      missing: isDraftId(routeId) && !draft,
    };
  });
  const initial = boot.draft?.state;

  const [draftId, setDraftId] = useState(boot.draftId);
  const [openedFromDraft, setOpenedFromDraft] = useState(!!boot.draft);
  const [currentStep, setCurrentStep] = useState(() => Math.min(Math.max(initial?.step ?? 1, 1), TOTAL_STEPS));
  // Passo mais longe já alcançado: libera voltar a ele pelo stepper.
  const [maxStepReached, setMaxStepReached] = useState(currentStep);

  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>(() => initial?.campaignConfig ?? createDefaultCampaignConfig());
  const [creativeData, setCreativeData] = useState<CreativeData>(() => initial?.creativeData ?? createDefaultCreativeData());
  // Rascunho da marca (lifted from BriefStep). Vive aqui porque o BriefStep
  // desmonta ao trocar de passo, e sem isso toda edição ainda não enviada com
  // "Salvar marca" morria ao clicar em "Próximo passo".
  const [briefDraft, setBriefDraft] = useState<BriefDraft>(() => initial?.briefDraft ?? createEmptyBriefDraft());
  const [selectedAccounts, setSelectedAccounts] = useState<TargetAccount[]>(() => initial?.selectedAccounts ?? []);
  const [targetingData, setTargetingData] = useState<TargetingData>(() => initial?.targetingData ?? createEmptyTargeting());

  // Público por conjunto. Calculado aqui, e não só na Segmentação, porque
  // trava o avanço do passo 2 e a publicação na Revisão, inclusive quando o
  // rascunho reabre direto no passo 5 sem passar pela Segmentação.
  const audience = useAudienceCount(targetingData);
  const audienceCheck = audienceCheckFor(audience, targetingData.companies.included.map((c) => c.id));

  // Erros de campo obrigatório só depois de tentar avançar (ou de tocar o campo).
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>({});
  // Empresa a abrir na Segmentação quando a Revisão manda para lá.
  const [segmentationFocus, setSegmentationFocus] = useState<string | undefined>();
  const [creativeFocus, setCreativeFocus] = useState<string | undefined>();

  // ---- Rascunho: alterações não salvas ----
  const snapshot = useMemo(
    () => snapshotOf({ campaignConfig, targetingData, creativeData, briefDraft, selectedAccounts }),
    [campaignConfig, targetingData, creativeData, briefDraft, selectedAccounts],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(boot.draft ? new Date(boot.draft.savedAt) : null);
  const isDirty = snapshot !== savedSnapshot;
  // Depois de publicar (ou de decidir sair), sair não pede confirmação.
  const leavingRef = useRef(false);
  const [pendingLeave, setPendingLeave] = useState<{ to?: string; el?: HTMLElement } | null>(null);
  const wizardRootRef = useRef<HTMLDivElement>(null);

  const [linkedinStatus, setLinkedInStatus] = useState<LinkedInIntegrationStatus | null>(null);
  useEffect(() => {
    getLinkedInStatus().then(setLinkedInStatus);
  }, []);

  useEffect(() => {
    if (boot.missing) toast.error('Rascunho não encontrado neste navegador. Começando uma campanha nova.');
  }, [boot.missing]);

  function hydrate(d: CampaignDraft) {
    const s = d.state;
    setDraftId(d.id);
    setOpenedFromDraft(true);
    setCampaignConfig(s.campaignConfig);
    setTargetingData(s.targetingData);
    setCreativeData(s.creativeData);
    setBriefDraft(s.briefDraft);
    setSelectedAccounts(s.selectedAccounts);
    setCurrentStep(s.step);
    setMaxStepReached(s.step);
    setSavedSnapshot(snapshotOf(s));
    setLastSavedAt(new Date(d.savedAt));
  }

  // Outro rascunho aberto com o wizard já montado (o React Router reaproveita
  // o componente entre /new e /:id/edit): hidrata o novo por inteiro.
  useEffect(() => {
    if (!isDraftId(routeId) || routeId === draftId) return;
    const d = getDraft(routeId);
    if (d) hydrate(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  /** Grava o estado inteiro. Devolve false (e avisa) se o navegador recusar. */
  const persist = (step: number): boolean => {
    try {
      const saved = saveDraft(draftId, {
        campaignConfig, targetingData, creativeData, briefDraft, selectedAccounts, step,
      });
      setSavedSnapshot(snapshot);
      setLastSavedAt(new Date(saved.savedAt));
      // A URL passa a apontar para o rascunho: recarregar a página o reabre.
      if (routeId !== draftId) navigate(`/campaigns/${draftId}/edit`, { replace: true });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o rascunho.');
      return false;
    }
  };

  const canProceedFrom = (step: number) =>
    canProceedFromStep(step, { campaignConfig, targetingData, creativeData, audienceCheck });
  const canProceed = () => canProceedFrom(currentStep);

  /** Troca de passo salvando o rascunho (autosave). */
  const goToStep = (step: number) => {
    if (step === currentStep) return;
    persist(step);
    setCurrentStep(step);
    setMaxStepReached((m) => Math.max(m, step));
    if (step !== 2) setSegmentationFocus(undefined);
  };

  const handleNext = () => {
    if (currentStep >= TOTAL_STEPS) return;
    if (!canProceed()) {
      // O botão parece desabilitado mas continua clicável: o clique mostra o
      // erro no próprio campo, em vez de não fazer nada.
      setAttemptedSteps((a) => ({ ...a, [currentStep]: true }));
      return;
    }
    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  };

  // Stepper: volta a qualquer passo anterior e avança até o mais longe já
  // alcançado, desde que os passos do meio continuem válidos.
  const canJumpTo = (step: number) => {
    if (step < currentStep) return true;
    if (step > maxStepReached) return false;
    for (let s = currentStep; s < step; s++) if (!canProceedFrom(s)) return false;
    return true;
  };

  const handleGoToStepFromReview = (step: number, companyId?: string) => {
    if (step === 2) setSegmentationFocus(companyId);
    // "Ir para Criativos · Nubank" já abre o Nubank no editor.
    if (step === 4) setCreativeFocus(companyId);
    goToStep(step);
  };

  const handleSaveDraft = () => {
    if (persist(currentStep)) toast.success('Rascunho salvo');
  };

  // ---- Sair com alteração não salva: confirmação na própria tela ----
  // O destino é um caminho (link ou seta de voltar) ou o botão do menu que foi
  // clicado: o menu lateral navega por código, sem href, então a saída é
  // repetir o clique depois que o usuário decide.
  const requestLeave = useCallback((to: string) => {
    if (isDirty && !leavingRef.current) setPendingLeave({ to });
    else navigate(to);
  }, [isDirty, navigate]);

  // O BrowserRouter não tem bloqueio de navegação (useBlocker exige o data
  // router). Enquanto houver alteração não salva, intercepta antes do React:
  // links internos em qualquer lugar do app e botões fora do wizard (menu
  // lateral). Portais (toasts, menus suspensos) ficam fora do #root e passam.
  useEffect(() => {
    if (!isDirty) return;
    const onClick = (e: MouseEvent) => {
      if (leavingRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const appRoot = document.getElementById('root');
      const el = (e.target as Element | null)?.closest?.('a[href], button') as HTMLElement | null;
      if (!el || !appRoot?.contains(el)) return;
      if (el instanceof HTMLAnchorElement) {
        if (el.target === '_blank' || el.origin !== window.location.origin || el.pathname === window.location.pathname) return;
        e.preventDefault();
        e.stopPropagation();
        const path = basePath && el.pathname.startsWith(basePath) ? el.pathname.slice(basePath.length) || '/' : el.pathname;
        setPendingLeave({ to: `${path}${el.search}${el.hash}` });
        return;
      }
      if (wizardRootRef.current?.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingLeave({ el });
    };
    // Fechar a aba ou recarregar: aí só o aviso do próprio navegador é possível.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty, basePath]);

  const confirmLeave = (save: boolean) => {
    const target = pendingLeave;
    if (!target) return;
    if (save && !persist(currentStep)) return;
    setPendingLeave(null);
    leavingRef.current = true;
    if (target.to) navigate(target.to);
    else target.el?.click();
    // Botão que não navega (ex.: troca de idioma): o wizard segue montado e o
    // aviso volta a valer para a próxima saída.
    setTimeout(() => { leavingRef.current = false; }, 0);
  };

  const handleLaunch = () => {
    leavingRef.current = true;
    // Publicado, o rascunho deixa de existir: senão a lista mostraria a mesma
    // campanha duas vezes, no ar e como rascunho.
    try { deleteDraft(draftId); } catch { /* sem armazenamento: nada a apagar */ }
    const n = targetingData.companies.included.length;
    toast.success(`Campanha publicada: ${n} conjunto${n !== 1 ? 's' : ''} de anúncio no LinkedIn`, {
      description: `"${campaignConfig.campaignName}" está ${campaignConfig.autoActivate ? 'ativa' : 'pausada'}.`,
    });
    setTimeout(() => navigate('/campaigns'), 1500);
  };

  const getStepSummary = () => {
    // Com o botão desabilitado, a frase diz o que falta; liberado, resume o passo.
    if (currentStep === 1) {
      if (!campaignConfig.campaignName.trim()) return 'Nomeie a campanha';
      if (!(parseFloat(campaignConfig.budgetAmount) >= MIN_BUDGET_PER_AD_SET)) {
        return `Defina o orçamento por empresa (mínimo ${MIN_BUDGET_PER_AD_SET})`;
      }
      return 'Campanha configurada';
    }
    if (currentStep === 2) {
      const companies = targetingData.companies.included;
      const n = companies.length;
      const custom = Object.keys(targetingData.overrides).length;
      if (n === 0) return 'Escolha ao menos 1 empresa-alvo';
      if (audienceCheck.pending) return 'Calculando o público de cada empresa…';
      if (audienceCheck.small.length > 0) {
        const names = companies.filter((c) => audienceCheck.small.includes(c.id)).map((c) => c.label);
        return `${smallAudienceSentence(names)}: amplie a localização ou tire filtros`;
      }
      if (!canProceed()) return 'Defina a localização de cada empresa';
      return `${n} conjunto${n !== 1 ? 's' : ''} de anúncio${custom > 0 ? ` · ${custom} personalizado${custom !== 1 ? 's' : ''}` : ''}`;
    }
    if (currentStep === 3) {
      if (creativeData.brandKit?.voice?.trim()) return 'Marca definida';
      // Digitou mas não salvou: sem esta frase o botão fica desabilitado sem
      // explicação, já que o campo na tela *parece* preenchido.
      if (briefDraft.voice.trim()) return 'Salve a marca para continuar';
      return 'Defina o tom de voz da marca';
    }
    if (currentStep === 4 && !canProceed()) {
      if (!creativeData.landingPageUrl?.trim()) return 'Defina a URL de destino';
      if (!creativeData.cta) return 'Escolha o botão do anúncio';
      // Diz qual empresa e o que falta, em vez de uma frase genérica.
      const issues = creativeIssues({ campaignConfig, targetingData, creativeData });
      const [companyId, list] = Object.entries(issues)[0] ?? [];
      const company = targetingData.companies.included.find((c) => c.id === companyId);
      if (company && list?.length) {
        const more = Object.keys(issues).length - 1;
        return `${company.label}: ${list[0].charAt(0).toLowerCase()}${list[0].slice(1)}${more > 0 ? ` (e mais ${more})` : ''}`;
      }
      return 'Complete título, texto e imagem do template';
    }
    return '';
  };

  const draftName = campaignConfig.campaignName.trim() || 'Rascunho sem nome';
  const saveStatus = lastSavedAt
    ? isDirty ? 'Alterações não salvas' : `Rascunho salvo às ${fmtTime(lastSavedAt)}`
    : isDirty ? 'Ainda não salvo' : '';
  const stepSummary = getStepSummary();
  const nextEnabled = canProceed();

  return (
    <div ref={wizardRootRef} className="flex flex-col h-full bg-slate-50">
      {/* Wizard Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-6 shadow-sm">
        {/* O título encolhe com reticências (nome inteiro no title) e nunca
            invade o stepper. */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button
            onClick={() => requestLeave('/campaigns')}
            aria-label="Voltar para campanhas"
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2
            className="text-xl font-bold text-slate-800 truncate min-w-0"
            title={openedFromDraft ? `Editar rascunho · ${draftName}` : undefined}
          >
            {openedFromDraft ? (
              <>
                <span className="text-slate-500 font-semibold">Editar rascunho · </span>
                {draftName}
              </>
            ) : 'Nova campanha'}
          </h2>
        </div>

        {/* Stepper */}
        <nav aria-label="Passos da campanha" className="flex items-center gap-1 shrink-0">
          {STEPS.map((step, idx) => {
            const isCurrent = currentStep === step.id;
            const isDone = currentStep > step.id;
            const clickable = !isCurrent && canJumpTo(step.id);
            return (
              <div key={step.id} className="flex items-center gap-1">
                <button
                  onClick={() => clickable && goToStep(step.id)}
                  disabled={!clickable && !isCurrent}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center gap-1.5 ${clickable ? 'cursor-pointer' : 'cursor-default'} ${
                    isCurrent ? 'text-[#E54A26]' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                      isCurrent
                        ? 'border-[#FF5F39] bg-[#FF5F39] text-white'
                        : isDone
                          ? 'border-[#FF5F39] bg-[#FFF1ED] text-[#E54A26]'
                          : 'border-slate-300'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <span className={`hidden xl:block text-xs ${isCurrent ? 'font-semibold' : 'font-medium'}`}>{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 ${currentStep > idx + 1 ? 'bg-[#FF5F39]' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-3 flex-1 min-w-0">
          <span role="status" className="text-xs text-slate-500 truncate">
            {saveStatus}
          </span>
          <button
            onClick={handleSaveDraft}
            className="shrink-0 text-slate-600 hover:text-slate-800 font-medium text-sm px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Salvar rascunho
          </button>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Criativos (4) é um workspace de 3 colunas e ocupa a largura toda; a
            Revisão (5) tem uma coluna fixa à direita e precisa de mais espaço
            que os formulários dos outros passos. */}
        <div className={currentStep === 4 ? 'h-full' : currentStep === 5 ? 'max-w-7xl mx-auto' : 'max-w-6xl mx-auto h-full'}>
          {currentStep === 1 && (
            <ConfigStep
              config={campaignConfig}
              onChange={setCampaignConfig}
              linkedinStatus={linkedinStatus}
              adSetCount={targetingData.companies.included.length}
              showErrors={!!attemptedSteps[1]}
            />
          )}
          {currentStep === 2 && (
            <SegmentationStep
              data={targetingData}
              onChange={setTargetingData}
              audience={audience}
              initialActiveId={segmentationFocus}
            />
          )}
          {currentStep === 3 && (
            <BriefStep
              creativeData={creativeData}
              onCreativeChange={setCreativeData}
              draft={briefDraft}
              setDraft={setBriefDraft}
            />
          )}
          {currentStep === 4 && (
            <CreativeStep
              selectedAccounts={selectedAccounts}
              targetingData={targetingData}
              creativeData={creativeData}
              onCreativeChange={setCreativeData}
              onEditBrand={() => goToStep(3)}
              initialTarget={creativeFocus}
            />
          )}
          {currentStep === 5 && (
            <OrchestrationStep
              selectedAccounts={selectedAccounts}
              onAccountsChange={setSelectedAccounts}
              onLaunch={handleLaunch}
              targetingData={targetingData}
              campaignConfig={campaignConfig}
              linkedinStatus={linkedinStatus}
              creativeData={creativeData}
              audience={audience}
              onGoToStep={handleGoToStepFromReview}
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
          {stepSummary && (
            <span className="text-sm text-slate-500">
              {stepSummary}
            </span>
          )}
          {currentStep < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              aria-disabled={!nextEnabled}
              className={`px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-white ${
                nextEnabled ? 'bg-[#FF5F39] hover:bg-[#E54A26]' : 'bg-[#FF5F39]/40 cursor-not-allowed'
              }`}
            >
              Próximo passo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            // A publicação mora na coluna da direita da Revisão, junto do checklist.
            <span className="text-xs text-slate-400">Publique pela coluna da direita, depois de conferir o checklist.</span>
          )}
        </div>
      </div>

      {/* Sair com alteração não salva: confirmação na tela, não window.confirm */}
      {pendingLeave && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFF1ED] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#FF5F39]" />
              </div>
              <div>
                <h3 id="leave-title" className="text-base font-bold text-slate-900">Sair sem salvar?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Você tem alterações que ainda não foram salvas neste rascunho.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setPendingLeave(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Continuar editando
              </button>
              <button
                onClick={() => confirmLeave(false)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                Sair sem salvar
              </button>
              <button
                onClick={() => confirmLeave(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm"
              >
                Salvar e sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
