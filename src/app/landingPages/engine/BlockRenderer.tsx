// BlockRenderer — renders a LandingPage document to DOM. This is the single
// source of truth for WYSIWYG fidelity: the editor canvas, the mobile
// preview, and the public page all render through this same component.
import type * as React from 'react';
import { REGISTRY } from '../schema/registry';
import type { RenderContext } from '../schema/registry';
import { resolveBlocks } from './resolveBlock';
import type { AccountContext } from './resolveTokens';
import type { LandingPage } from '../store/model';
import type { PageEvent } from '../store/tracking';

export interface BlockRendererProps {
  page: LandingPage;
  accountId?: string | null;
  ctx: AccountContext | null;
  onEvent?: (type: PageEvent['type'], value?: number) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ page, accountId, ctx }) => {
  const overridesForAccount = accountId ? page.accountOverrides[accountId] : undefined;
  const resolved = resolveBlocks(page.blocks, overridesForAccount, ctx);
  const renderCtx: RenderContext = { ctx, brandKit: page.brandKit };

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
        return <Render key={block.id} block={block} ctx={renderCtx} />;
      })}
    </div>
  );
};

export default BlockRenderer;
