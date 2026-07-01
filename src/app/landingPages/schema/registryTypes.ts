// Shared types for the block registry. Split from registry.tsx so individual
// block files (schema/blocks/*.tsx) can import RenderContext without creating
// a circular dependency on registry.tsx itself.
import type { AccountContext } from '../engine/resolveTokens';
import type { BrandKit } from '../../campaigns/wizard/brandKit';

export interface RenderContext {
  ctx: AccountContext | null;
  brandKit: BrandKit;
}
