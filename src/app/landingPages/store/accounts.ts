// Account adapter for landing pages — provides the accounts a page can be
// personalized for. Mirrors the mock account profiles used elsewhere in the
// app (see src/lib/mockCampaignData.ts's unexported MOCK_ACCOUNT_PROFILES)
// but ships its own inline list since that array isn't exported and lacks
// domain/logo fields needed here.
import type { AccountContext } from '../engine/resolveTokens';

export interface LpAccount {
  id: string;
  name: string;
  industry: string;
  domain: string;
  logo: string;
}

const ACCOUNTS: LpAccount[] = [
  { id: 'acc-techcorp', name: 'TechCorp Brasil', industry: 'Tecnologia', domain: 'techcorp.com.br', logo: '' },
  { id: 'acc-innovatech', name: 'Innovatech', industry: 'SaaS', domain: 'innovatech.com', logo: '' },
  { id: 'acc-datadriven', name: 'DataDriven Solutions', industry: 'Dados & Analytics', domain: 'datadriven.com', logo: '' },
  { id: 'acc-scaleup', name: 'ScaleUp Ventures', industry: 'Venture Capital', domain: 'scaleupventures.com', logo: '' },
  { id: 'acc-quantum', name: 'Quantum Bank', industry: 'Serviços Financeiros', domain: 'quantumbank.com', logo: '' },
];

export function listAccounts(): LpAccount[] {
  return ACCOUNTS;
}

export function toAccountContext(a: LpAccount | null): AccountContext | null {
  if (!a) return null;
  return {
    name: a.name,
    industry: a.industry,
    domain: a.domain,
    logo: a.logo,
  };
}
