import { describe, it, expect } from 'vitest';
import { statusAfterToggle, activationParams } from './CampaignList';
import {
  resolveCampaignGroupUrn,
  effectiveCampaignStatus,
} from '../../../supabase/functions/make-server-a4d5bbe0/publishRules';

describe('Ativar na lista ativa o grupo junto', () => {
  it('a lista manda o grupo da linha para o servidor', () => {
    expect(activationParams({ id: '987', campaignGroup: 'urn:li:sponsoredCampaignGroup:55' })).toEqual({
      campaign_id: '987', linkedin_campaign_id: '987', campaign_group_id: 'urn:li:sponsoredCampaignGroup:55',
    });
  });

  it('o servidor acha o grupo: tela > registro do conjunto > registro do grupo > LinkedIn', () => {
    expect(resolveCampaignGroupUrn({ fromRequest: '55', fromCampaignRecord: '66' })).toBe('urn:li:sponsoredCampaignGroup:55');
    expect(resolveCampaignGroupUrn({ fromCampaignRecord: '66', fromLinkedIn: 'urn:li:sponsoredCampaignGroup:77' })).toBe('urn:li:sponsoredCampaignGroup:66');
    expect(resolveCampaignGroupUrn({ fromGroupRecord: 'urn:li:sponsoredCampaignGroup:88' })).toBe('urn:li:sponsoredCampaignGroup:88');
    // Antes: a lista mandava o id do LinkedIn como chave e nada era achado.
    expect(resolveCampaignGroupUrn({ fromLinkedIn: 'urn:li:sponsoredCampaignGroup:77' })).toBe('urn:li:sponsoredCampaignGroup:77');
    expect(resolveCampaignGroupUrn({})).toBeNull();
  });

  it('conjunto ativo em grupo pausado aparece como pausado (não entrega)', () => {
    expect(effectiveCampaignStatus('ACTIVE', 'PAUSED')).toBe('PAUSED');
    expect(effectiveCampaignStatus('ACTIVE', 'ACTIVE')).toBe('ACTIVE');
    expect(effectiveCampaignStatus('ACTIVE', null)).toBe('ACTIVE');
    expect(effectiveCampaignStatus('PAUSED', 'ACTIVE')).toBe('PAUSED');
  });

  it('a linha mostra o status real devolvido pelo servidor, não o pedido', () => {
    expect(statusAfterToggle('activate', 'ACTIVE')).toBe('Active');
    expect(statusAfterToggle('activate', 'PAUSED')).toBe('Paused');
    expect(statusAfterToggle('pause', undefined)).toBe('Paused');
  });
});
