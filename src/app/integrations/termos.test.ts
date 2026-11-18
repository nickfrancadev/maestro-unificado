import { describe, it, expect } from 'vitest';

// Lê o fonte das telas: roda em `node` (arquivo .ts), onde import.meta.url é file://.
const load = (name: string) => import(/* @vite-ignore */ name);

describe('termos: "Conta de anúncios", nunca "Ad Account"', () => {
  it('nenhuma tela de LinkedIn Ads escreve "Ad Account" para o usuário', async () => {
    const fs = await load('node:fs');
    const root = new URL('../../../', import.meta.url).pathname;
    const files = [
      'src/app/integrations/Integrations.tsx',
      'src/app/integrations/LinkedInConnectionModal.tsx',
      'src/app/integrations/statusBadge.tsx',
      'src/app/campaigns/CampaignList.tsx',
      'src/app/campaigns/CampaignAnalytics.tsx',
      'src/app/campaigns/wizard/ConfigStep.tsx',
      'src/app/campaigns/wizard/OrchestrationStep.tsx',
    ];
    for (const f of files) {
      const text = String(fs.readFileSync(root + f, 'utf8'))
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');
      expect(text, f).not.toMatch(/Ad Accounts?\b/);
    }
  });
});
