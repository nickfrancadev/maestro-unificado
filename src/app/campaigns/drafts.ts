// Rascunhos de campanha LinkedIn Ads.
//
// O protótipo guarda no navegador (localStorage). No produto, este módulo é o
// lugar da chamada à API de rascunhos: o contrato (o que se salva e o que volta)
// é o mesmo. A regra que importa para o time: o rascunho guarda o estado INTEIRO
// do assistente — inclusive a segmentação por empresa, os textos sobre a imagem,
// a imagem de cada empresa e o brief — e reabrir devolve exatamente isso.
import type { TargetingData } from './wizard/SegmentationStep';
import type { CampaignConfig, CreativeData, TargetAccount } from './wizard/types';
import type { BriefDraft } from './wizard/BriefPane';

export interface WizardDraftState {
  campaignConfig: CampaignConfig;
  targetingData: TargetingData;
  creativeData: CreativeData;
  briefDraft: BriefDraft;
  selectedAccounts: TargetAccount[];
  /** Passo em que o usuário parou, para reabrir no mesmo lugar. */
  step: number;
}

export interface CampaignDraft {
  id: string;
  name: string;
  savedAt: string; // ISO
  state: WizardDraftState;
}

const KEY = 'maestro.linkedinAds.drafts.v1';

function readAll(): CampaignDraft[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list: CampaignDraft[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sem armazenamento (aba anônima, cota cheia): quem chamou recebe o erro
    // pelo retorno de saveDraft e avisa o usuário.
    throw new Error('Não foi possível salvar o rascunho neste navegador.');
  }
}

export function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isDraftId(id: string | undefined): id is string {
  return !!id && id.startsWith('draft-');
}

/** Cria ou atualiza o rascunho com este id. */
export function saveDraft(id: string, state: WizardDraftState): CampaignDraft {
  const draft: CampaignDraft = {
    id,
    name: state.campaignConfig.campaignName.trim() || 'Rascunho sem nome',
    savedAt: new Date().toISOString(),
    state,
  };
  const others = readAll().filter((d) => d.id !== id);
  writeAll([draft, ...others]);
  return draft;
}

export function listDrafts(): CampaignDraft[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getDraft(id: string): CampaignDraft | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function deleteDraft(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}

/** Orçamento diário somado do rascunho: valor por conjunto × número de empresas. */
export function draftDailyTotal(d: CampaignDraft): { perAdSet: number; adSets: number; total: number } {
  const perAdSet = parseFloat(d.state.campaignConfig.budgetAmount) || 0;
  const adSets = d.state.targetingData.companies.included.length;
  return { perAdSet, adSets, total: perAdSet * adSets };
}
