// Shared types for the block registry. Split from registry.tsx so individual
// block files (schema/blocks/*.tsx) can import RenderContext without creating
// a circular dependency on registry.tsx itself.
import type * as React from 'react';
import type { AccountContext } from '../engine/resolveTokens';
import type { BrandKit } from '../../campaigns/wizard/brandKit';
import type { PageEvent } from '../store/tracking';
import type { Block, BlockType } from './blockTypes';
import type { SlotDef } from '../editor/slotStyle';

export interface EditingContext {
  selectedSlot: string | null;
  editingText: boolean;
  onSelectSlot: (slotId: string) => void;
  onEditText: (slotId: string, value: string) => void;
}

export interface RenderContext {
  ctx: AccountContext | null;
  brandKit: BrandKit;
  onEvent?: (type: PageEvent['type'], value?: number) => void;
  onFormSubmit?: (fields: Record<string, string>) => void;
  editing?: EditingContext;
}

export interface BlockDef {
  type: BlockType;
  label: string;
  group: 'estrutura' | 'conteudo' | 'conversao' | 'prova';
  defaults: () => Record<string, unknown>;
  tokens: string[];
  Render: React.FC<{ block: Block; ctx: RenderContext }>;
  Panel: React.FC<{ block: Block; onChange: (patch: Partial<Block>) => void }>;
  slots: SlotDef[];
}
