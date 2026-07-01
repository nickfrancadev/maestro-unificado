// BlockRenderer — renders a LandingPage document to DOM. This is the single
// source of truth for WYSIWYG fidelity: the mobile preview and the public
// page render through this component (the editor canvas renders blocks
// itself via EditorCanvas/BlockShell, since it needs a per-block
// selection/reorder/hover-controls wrapper — but both paths apply the same
// `__block__` container style so what you see in the editor matches what
// ships to `/p/:slug`).
import type * as React from 'react';
import { REGISTRY } from '../schema/registry';
import type { RenderContext } from '../schema/registry';
import { resolveBlocks } from './resolveBlock';
import type { AccountContext } from './resolveTokens';
import type { LandingPage } from '../store/model';
import type { PageEvent } from '../store/tracking';
import type { SlotStyle } from '../editor/slotStyle';
import { resolveSlotStyle, slotStyleToCss } from '../editor/slotStyle';

/** Neutral/empty default for the block container style — see the matching
 * constant + comment in editor/EditorCanvas.tsx. */
const BLOCK_DEFAULT_STYLE: SlotStyle = {};

export interface BlockRendererProps {
  page: LandingPage;
  accountId?: string | null;
  ctx: AccountContext | null;
  onEvent?: (type: PageEvent['type'], value?: number) => void;
  onFormSubmit?: (fields: Record<string, string>) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ page, accountId, ctx, onEvent, onFormSubmit }) => {
  const overridesForAccount = accountId ? page.accountOverrides[accountId] : undefined;
  const resolved = resolveBlocks(page.blocks, overridesForAccount, ctx);
  const renderCtx: RenderContext = { ctx, brandKit: page.brandKit, onEvent, onFormSubmit };

  return (
    <div
      style={
        {
          fontFamily: page.brandKit.fontFamily,
          '--lp-primary': page.brandKit.colors.primary,
        } as React.CSSProperties
      }
    >
      {resolved.map((block) => {
        const def = REGISTRY[block.type];
        if (!def) return null;
        const Render = def.Render;
        const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
        const blockCss = slotStyleToCss('block', resolveSlotStyle(BLOCK_DEFAULT_STYLE, styles.__block__));
        return (
          <div key={block.id} style={blockCss}>
            <Render block={block} ctx={renderCtx} />
          </div>
        );
      })}
    </div>
  );
};

export default BlockRenderer;
