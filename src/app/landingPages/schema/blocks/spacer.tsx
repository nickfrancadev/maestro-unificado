import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';

export interface SpacerProps {
  size: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_PX: Record<SpacerProps['size'], number> = { sm: 16, md: 32, lg: 64, xl: 96 };

export function spacerDefaults(): SpacerProps {
  return { size: 'md' };
}

export function SpacerRender({ block }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as SpacerProps;
  const height = SIZE_PX[p.size] ?? SIZE_PX.md;
  return <div style={{ height }} aria-hidden="true" />;
}
