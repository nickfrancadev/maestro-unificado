// PublicPage — the public-facing renderer for /p/:slug. Rendered with NO app
// chrome. Resolves the visiting account from ?a=, renders the published page
// via BlockRenderer, and logs tracking events (page_view, scroll_depth,
// cta_click/form_submit relayed from blocks), running intent evaluation after
// each meaningful event.
import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BlockRenderer } from '../engine/BlockRenderer';
import { getPageBySlug } from '../store/repo';
import { listAccounts, toAccountContext } from '../store/accounts';
import { logEvent, listEvents, saveAlert, type PageEvent } from '../store/tracking';
import { evaluateIntent } from '../alerts/rules';

const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

function NotFound() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', color: '#9B9B9B', fontSize: 18 }}>
      <div className="text-center">
        <p style={{ fontWeight: 700, color: '#212A46', fontSize: 22, marginBottom: 8 }}>Página não encontrada</p>
        <p>Esta landing page não está disponível.</p>
      </div>
    </div>
  );
}

export function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('a');

  const page = slug ? getPageBySlug(slug) : undefined;
  const isPublished = !!page && page.status === 'published';

  const account = accountId ? listAccounts().find((a) => a.id === accountId) ?? null : null;
  const ctx = toAccountContext(account);

  const viewLoggedRef = useRef(false);
  const scrollFiredRef = useRef<Set<number>>(new Set());

  // Log page_view once on mount (guards against StrictMode double-invoke).
  useEffect(() => {
    if (!isPublished || !page) return;
    if (viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    logEvent({ landingPageId: page.id, accountId: accountId ?? null, type: 'page_view' });
    // page_view is intentionally excluded from intent evaluation — see handleEvent/scroll handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublished, page?.id]);

  // Best-effort noindex meta tag.
  useEffect(() => {
    if (!isPublished || !page?.seo.noIndex) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [isPublished, page?.seo.noIndex]);

  const maybeEvaluateIntent = (pageId: string) => {
    if (!accountId) return;
    const evald = evaluateIntent(listEvents(pageId), accountId);
    if (evald.fired) saveAlert({ landingPageId: pageId, accountId, reason: evald.reason });
  };

  // Scroll depth tracking.
  useEffect(() => {
    if (!isPublished || !page) return;
    const pageId = page.id;

    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 100;

      for (const threshold of SCROLL_THRESHOLDS) {
        if (pct >= threshold && !scrollFiredRef.current.has(threshold)) {
          scrollFiredRef.current.add(threshold);
          logEvent({ landingPageId: pageId, accountId: accountId ?? null, type: 'scroll_depth', value: threshold });
          maybeEvaluateIntent(pageId);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublished, page?.id, accountId]);

  if (!page || !isPublished) {
    return <NotFound />;
  }

  const handleEvent = (type: PageEvent['type'], value?: number) => {
    logEvent({ landingPageId: page.id, accountId: accountId ?? null, type, value });
    if (type === 'cta_click' || type === 'form_submit') {
      maybeEvaluateIntent(page.id);
    }
  };

  return <BlockRenderer page={page} accountId={accountId ?? null} ctx={ctx} onEvent={handleEvent} />;
}

export default PublicPage;
