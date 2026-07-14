// LpThumbnail — a true WYSIWYG mini-preview "cover" for a LandingPage.
// Renders the real page through BlockRenderer (the same renderer used by the
// editor canvas and the public page) at a large fixed design width, then
// scales it down with a CSS transform so it fits a small cover box. This
// keeps the thumbnail pixel-faithful to the real page instead of relying on
// a hand-maintained illustration or a static image asset.
//
// Scale method: a ResizeObserver watches the outer (container) box and
// recomputes `scale = measuredWidth / DESIGN_WIDTH` whenever the container is
// resized (e.g. responsive grid reflow). This is more robust than a single
// hard-coded scale factor because card widths vary across breakpoints and
// surfaces (overview table cell vs. template gallery card). The inner wrapper
// is rendered at `DESIGN_WIDTH` px and transformed with
// `scale(...) ` / `transform-origin: top left`, so the top of the page (hero,
// navbar, etc.) is what shows through the clipped viewport — exactly what a
// "cover" thumbnail should show.
import * as React from 'react';
import { ImageOff } from 'lucide-react';
import { BlockRenderer } from '../engine/BlockRenderer';
import type { LandingPage } from '../store/model';

const DESIGN_WIDTH = 1120;

export interface LpThumbnailProps {
  page: LandingPage;
  className?: string;
  height?: number;
}

export const LpThumbnail: React.FC<LpThumbnailProps> = ({ page, className, height = 160 }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0.28);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const update = (width: number) => {
      if (width > 0) setScale(width / DESIGN_WIDTH);
    };
    update(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasContent = page.blocks && page.blocks.length > 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-t-lg border border-slate-200 bg-slate-50 ${className ?? ''}`}
      style={{ height }}
    >
      {hasContent ? (
        <div
          style={{
            width: DESIGN_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <BlockRenderer page={page} accountId={null} ctx={null} />
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
          <ImageOff className="h-5 w-5" />
          <span className="text-xs">Sem conteúdo</span>
        </div>
      )}
    </div>
  );
};

export default LpThumbnail;
