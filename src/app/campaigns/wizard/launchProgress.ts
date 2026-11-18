// Publicação idempotente por rascunho.
//
// Antes, o id do lançamento nascia a cada vez que a Revisão montava: voltar a
// um passo para corrigir e publicar de novo criava outro grupo e outros
// conjuntos no LinkedIn, além dos que a primeira tentativa já tinha criado.
//
// Agora o rascunho guarda o lançamento: um id estável (derivado do rascunho)
// e o que já foi criado — o grupo e, por empresa, o conjunto. Republicar
// continua de onde parou: reaproveita o grupo, pula a empresa que já foi
// publicada por inteiro e retoma a que parou no meio (o servidor deduplica
// cada passo pela mesma chave). A confirmação mostra isso antes de publicar.
import type { AdSetPlan } from './launchPlan';

export interface LaunchAdSetProgress {
  companyName: string;
  /** Conjunto (campanha) criado no LinkedIn. */
  linkedinCampaignId?: string | null;
  /** Todos os passos da empresa deram certo (conjunto, imagem, anúncio, ativação). */
  done: boolean;
}

export interface LaunchRecord {
  /** Chave de idempotência no servidor: a mesma em toda tentativa deste rascunho. */
  launchId: string;
  startedAt: string;
  /** Grupo de campanhas criado no LinkedIn (id). */
  groupId?: string | null;
  /** Por id da empresa. */
  adSets: Record<string, LaunchAdSetProgress>;
}

/** Id estável do lançamento de um rascunho. */
export function launchIdForDraft(draftId: string): string {
  return `launch-${draftId}`;
}

/** O lançamento a usar agora: o salvo no rascunho, ou um novo. */
export function startOrResumeLaunch(saved: LaunchRecord | undefined | null, draftId: string, now = new Date()): LaunchRecord {
  if (saved?.launchId) return saved;
  return { launchId: launchIdForDraft(draftId), startedAt: now.toISOString(), groupId: null, adSets: {} };
}

export function withGroup(record: LaunchRecord, groupId: string | null | undefined): LaunchRecord {
  if (!groupId || record.groupId === groupId) return record;
  return { ...record, groupId };
}

export function withAdSet(record: LaunchRecord, companyId: string, progress: LaunchAdSetProgress): LaunchRecord {
  return { ...record, adSets: { ...record.adSets, [companyId]: { ...record.adSets[companyId], ...progress } } };
}

export interface ResumeSummary {
  /** Há algo criado numa tentativa anterior. */
  resuming: boolean;
  groupCreated: boolean;
  /** Empresas publicadas por inteiro: não são tocadas de novo. */
  done: AdSetPlan[];
  /** Empresas com o conjunto criado mas algum passo depois dele falhou: retoma. */
  partial: AdSetPlan[];
  /** Empresas que ainda não têm nada no LinkedIn. */
  toCreate: AdSetPlan[];
}

export function summarizeResume(record: LaunchRecord | null | undefined, plan: AdSetPlan[]): ResumeSummary {
  const done: AdSetPlan[] = [];
  const partial: AdSetPlan[] = [];
  const toCreate: AdSetPlan[] = [];
  for (const a of plan) {
    const p = record?.adSets[a.companyId];
    if (p?.done) done.push(a);
    else if (p?.linkedinCampaignId) partial.push(a);
    else toCreate.push(a);
  }
  const groupCreated = !!record?.groupId;
  return { resuming: groupCreated || done.length > 0 || partial.length > 0, groupCreated, done, partial, toCreate };
}

/** Frases da confirmação quando há uma tentativa anterior. Vazio = primeira publicação. */
export function resumeSentences(summary: ResumeSummary): string[] {
  if (!summary.resuming) return [];
  const names = (list: AdSetPlan[]) => list.map((a) => a.companyName).join(', ');
  const out: string[] = [];
  if (summary.groupCreated) out.push('O grupo da campanha já existe no LinkedIn e será reaproveitado.');
  if (summary.done.length) out.push(`Já publicadas, não serão criadas de novo: ${names(summary.done)}.`);
  if (summary.partial.length) out.push(`Retoma de onde parou, sem duplicar o conjunto: ${names(summary.partial)}.`);
  if (summary.toCreate.length) out.push(`Serão criadas agora: ${names(summary.toCreate)}.`);
  if (summary.done.length || summary.partial.length) {
    out.push('O que já foi criado não muda: correções de segmentação ou orçamento nessas empresas não são reenviadas.');
  }
  return out;
}
