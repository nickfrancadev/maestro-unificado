import type { Block, ShowIf } from '../schema/blockTypes';
import type { AccountContext } from './resolveTokens';

export function mergeOverride(base: Block, override?: Partial<Block>): Block {
  if (!override) return base;
  return {
    ...base,
    ...override,
    props: { ...base.props, ...(override.props ?? {}) },
  };
}

export function isVisible(showIf: ShowIf | undefined, ctx: AccountContext | null): boolean {
  if (!showIf) return true;
  if (!ctx) return true;
  const key = showIf.field.replace(/^account\./, '') as keyof AccountContext;
  const actual = ctx[key];
  const eq = String(actual ?? '') === showIf.value;
  return showIf.op === '==' ? eq : !eq;
}

export function resolveBlocks(
  blocks: Block[],
  overridesForAccount: Record<string, Partial<Block>> | undefined,
  ctx: AccountContext | null,
): Block[] {
  return blocks
    .map((b) => mergeOverride(b, overridesForAccount?.[b.id]))
    .filter((b) => isVisible(b.showIf, ctx));
}
