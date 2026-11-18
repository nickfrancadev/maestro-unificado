import { describe, it, expect } from 'vitest';
import {
  launchIdForDraft,
  startOrResumeLaunch,
  withGroup,
  withAdSet,
  summarizeResume,
  resumeSentences,
} from './launchProgress';
import { buildLaunchPlan } from './launchPlan';
import { createEmptyTargeting } from './SegmentationStep';
import { createDefaultCampaignConfig, createDefaultCreativeData } from './types';
import type { TargetingData } from './SegmentationStep';

function targeting(): TargetingData {
  const t = createEmptyTargeting();
  return { ...t, companies: { ...t.companies, included: [{ id: 'c1', label: 'Nubank' }, { id: 'c2', label: 'Itaú' }, { id: 'c3', label: 'XP' }] } } as TargetingData;
}
const config = { ...createDefaultCampaignConfig(), campaignName: 'Q4' };

describe('publicação idempotente por rascunho', () => {
  it('o id do lançamento é estável por rascunho (antes mudava a cada montagem da Revisão)', () => {
    const a = startOrResumeLaunch(undefined, 'draft-1');
    const b = startOrResumeLaunch(undefined, 'draft-1');
    expect(a.launchId).toBe(launchIdForDraft('draft-1'));
    expect(b.launchId).toBe(a.launchId);
  });

  it('republicar usa o lançamento salvo: mesma chave por empresa no servidor', () => {
    const saved = withGroup(startOrResumeLaunch(undefined, 'draft-1'), '555');
    const resumed = startOrResumeLaunch(saved, 'draft-1');
    expect(resumed).toBe(saved);
    const plan1 = buildLaunchPlan(config, targeting(), createDefaultCreativeData(), { runId: saved.launchId });
    const plan2 = buildLaunchPlan(config, targeting(), createDefaultCreativeData(), { runId: resumed.launchId });
    expect(plan2.map((a) => a.id)).toEqual(plan1.map((a) => a.id));
  });

  it('separa o que já foi publicado, o que parou no meio e o que falta', () => {
    let rec = withGroup(startOrResumeLaunch(undefined, 'draft-1'), '555');
    rec = withAdSet(rec, 'c1', { companyName: 'Nubank', linkedinCampaignId: '9001', done: true });
    rec = withAdSet(rec, 'c2', { companyName: 'Itaú', linkedinCampaignId: '9002', done: false });
    const plan = buildLaunchPlan(config, targeting(), createDefaultCreativeData(), { runId: rec.launchId });
    const s = summarizeResume(rec, plan);
    expect(s.resuming).toBe(true);
    expect(s.groupCreated).toBe(true);
    expect(s.done.map((a) => a.companyName)).toEqual(['Nubank']);
    expect(s.partial.map((a) => a.companyName)).toEqual(['Itaú']);
    expect(s.toCreate.map((a) => a.companyName)).toEqual(['XP']);
  });

  it('a confirmação diz o que será reaproveitado e o que será criado', () => {
    let rec = withGroup(startOrResumeLaunch(undefined, 'draft-1'), '555');
    rec = withAdSet(rec, 'c1', { companyName: 'Nubank', linkedinCampaignId: '9001', done: true });
    const plan = buildLaunchPlan(config, targeting(), createDefaultCreativeData(), { runId: rec.launchId });
    const text = resumeSentences(summarizeResume(rec, plan)).join(' ');
    expect(text).toContain('grupo da campanha já existe');
    expect(text).toContain('não serão criadas de novo: Nubank');
    expect(text).toContain('Serão criadas agora: Itaú, XP');
  });

  it('primeira publicação: nada a retomar e a confirmação não muda', () => {
    const plan = buildLaunchPlan(config, targeting(), createDefaultCreativeData(), { runId: 'x' });
    const s = summarizeResume(startOrResumeLaunch(undefined, 'draft-2'), plan);
    expect(s.resuming).toBe(false);
    expect(resumeSentences(s)).toEqual([]);
  });

  it('gravar a empresa não perde o conjunto já criado numa tentativa anterior', () => {
    let rec = withAdSet(startOrResumeLaunch(undefined, 'd'), 'c1', { companyName: 'Nubank', linkedinCampaignId: '9001', done: false });
    rec = withAdSet(rec, 'c1', { companyName: 'Nubank', done: true });
    expect(rec.adSets.c1).toEqual({ companyName: 'Nubank', linkedinCampaignId: '9001', done: true });
  });
});
