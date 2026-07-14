// Seeds initial demo data (landing pages + events) into localStorage so the
// feature isn't empty on first load. Idempotent: only runs when there are no
// pages yet.
import { listPages, savePage } from './repo';
import { logEvent } from './tracking';
import { newLandingPage } from './model';
import { getTemplate } from '../templates/catalog';
import { createDefaultBrandKit, MOCK_BRAND_FIXTURE, type BrandKit } from '../../campaigns/wizard/brandKit';
import { listAccounts } from './accounts';

function seedBrandKit(): BrandKit {
  return { ...createDefaultBrandKit(), ...MOCK_BRAND_FIXTURE, status: 'defined', websiteUrl: '' };
}

export function ensureSeeded(): void {
  if (listPages().length > 0) return;

  const brandKit = seedBrandKit();
  const accounts = listAccounts();

  const microsite = getTemplate('microsite-1a1');
  const vertical = getTemplate('vertical');
  const demoInvite = getTemplate('demo-invite');

  const page1 = newLandingPage({
    name: 'TechCorp Brasil — Microsite 1:1',
    templateOrigin: microsite?.id ?? 'microsite-1a1',
    blocks: microsite?.buildBlocks() ?? [],
    brandKit,
  });
  page1.status = 'published';
  page1.links = { campaignIds: [], accountIds: [accounts[0].id] };

  const page2 = newLandingPage({
    name: 'Página por vertical — SaaS',
    templateOrigin: vertical?.id ?? 'vertical',
    blocks: vertical?.buildBlocks() ?? [],
    brandKit,
  });
  page2.status = 'published';
  page2.links = { campaignIds: [], accountIds: [accounts[1].id, accounts[2].id] };

  const page3 = newLandingPage({
    name: 'Quantum Bank — Convite para demonstração',
    templateOrigin: demoInvite?.id ?? 'demo-invite',
    blocks: demoInvite?.buildBlocks() ?? [],
    brandKit,
  });
  // page3 stays 'draft' (newLandingPage default)
  page3.links = { campaignIds: [], accountIds: [accounts[4].id] };

  savePage(page1);
  savePage(page2);
  savePage(page3);

  logEvent({ landingPageId: page1.id, accountId: accounts[0].id, type: 'page_view' });
  logEvent({ landingPageId: page1.id, accountId: accounts[0].id, type: 'scroll_depth', value: 75 });
  logEvent({ landingPageId: page1.id, accountId: accounts[0].id, type: 'cta_click' });
  logEvent({ landingPageId: page1.id, accountId: accounts[0].id, type: 'form_start' });
  logEvent({ landingPageId: page1.id, accountId: accounts[0].id, type: 'form_submit' });

  logEvent({ landingPageId: page2.id, accountId: accounts[1].id, type: 'page_view' });
  logEvent({ landingPageId: page2.id, accountId: accounts[1].id, type: 'scroll_depth', value: 50 });
  logEvent({ landingPageId: page2.id, accountId: accounts[2].id, type: 'page_view' });
  logEvent({ landingPageId: page2.id, accountId: accounts[2].id, type: 'cta_click' });
  logEvent({ landingPageId: page2.id, accountId: null, type: 'page_view' });
}
