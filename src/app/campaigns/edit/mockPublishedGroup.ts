// Grupo de demonstração para a tela de edição funcionar sem LinkedIn
// conectado (site publicado). É a mesma campanha de demonstração da lista:
// MOCK_CAMPAIGN dividida em um conjunto por empresa, com o orçamento diário
// repartido igual ao que a lista mostra.

import { MOCK_CAMPAIGN, MOCK_CAMPAIGN_ID, getMockAnalyticsByAccount } from '@/lib/mockCampaignData';
import { tsToIsoDate } from '../../../../supabase/functions/make-server-a4d5bbe0/campaignEditGuards';
import { NAME_SEPARATOR, personTargetingFromCriteria } from './publishedEdit';
import type { PublishedGroup } from './publishedEdit';

export const MOCK_EDIT_GROUP_ID = MOCK_CAMPAIGN_ID;

const BRASIL = 'urn:li:geo:106057199';
const NAMES: Record<string, string> = { [BRASIL]: 'Brasil' };

function mockCriteria(employerUrn: string, seniorities: string[]): any {
  return {
    include: {
      and: [
        { or: { 'urn:li:adTargetingFacet:employers': [employerUrn] } },
        { or: { 'urn:li:adTargetingFacet:locations': [BRASIL] } },
        { or: { 'urn:li:adTargetingFacet:seniorities': seniorities.map((s) => `urn:li:seniority:${s}`) } },
      ],
    },
  };
}

export function buildMockPublishedGroup(): PublishedGroup {
  const { accounts } = getMockAnalyticsByAccount('all');
  const total = Number(MOCK_CAMPAIGN.dailyBudget?.amount ?? 0);
  const perCompany = accounts.length > 0 ? Math.round((total / accounts.length) * 100) / 100 : total;
  const start = tsToIsoDate(MOCK_CAMPAIGN.runSchedule?.start ?? null);
  const end = tsToIsoDate(MOCK_CAMPAIGN.runSchedule?.end ?? null);
  return {
    id: MOCK_EDIT_GROUP_ID,
    isMock: true,
    name: MOCK_CAMPAIGN.name,
    status: MOCK_CAMPAIGN.status,
    adAccountName: 'Demonstração',
    currency: 'BRL',
    budgetType: 'daily',
    groupBudget: total,
    groupEndDate: '',
    objective: 'BRAND_AWARENESS',
    costType: MOCK_CAMPAIGN.costType,
    startDate: start,
    companies: accounts.map((a, i) => {
      const employerUrn = `urn:li:organization:${9000 + i}`;
      // Uma empresa com público próprio (inclui gerentes), para a
      // demonstração ter uma diferente das outras.
      const criteria = mockCriteria(employerUrn, i === 2 ? ['5', '6', '7', '8'] : ['6', '7', '8']);
      return {
        campaignId: `${MOCK_CAMPAIGN_ID}:${a.accountId}`,
        name: `${MOCK_CAMPAIGN.name}${NAME_SEPARATOR}${a.accountName}`,
        company: a.accountName,
        employer: { id: `${MOCK_CAMPAIGN_ID}:${a.accountId}`, label: a.accountName, urn: employerUrn },
        status: MOCK_CAMPAIGN.status,
        budget: perCompany,
        endDate: end,
        targeting: personTargetingFromCriteria(criteria, NAMES),
        criteria,
      };
    }),
  };
}
