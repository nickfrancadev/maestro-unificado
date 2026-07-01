import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { SelectField } from './panelFields';

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

export function SpacerPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as SpacerProps;
  const set = (patch: Partial<SpacerProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <SelectField
        label="Altura"
        value={p.size ?? 'md'}
        options={[
          { value: 'sm', label: 'Pequena' },
          { value: 'md', label: 'Média' },
          { value: 'lg', label: 'Grande' },
          { value: 'xl', label: 'Extra grande' },
        ]}
        onChange={(v) => set({ size: v as SpacerProps['size'] })}
      />
    </div>
  );
}
