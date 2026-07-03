// BlockLibrary — left panel of the editor. Lists every REGISTRY block type
// grouped by `.group` (estrutura/conteudo/conversao/prova). Each entry is
// draggable (react-dnd `NEW_BLOCK` type carrying the block type) so it can be
// dropped onto EditorCanvas; clicking an entry also appends it to the end of
// the document as a quicker, drag-free path to the same result.
import * as React from 'react';
import { useDrag } from 'react-dnd';
import {
  Plus,
  Menu,
  Megaphone,
  Building2,
  LayoutGrid,
  Type,
  Image,
  Quote,
  BarChart3,
  MousePointerClick,
  TextCursorInput,
  HelpCircle,
  PanelBottom,
  MoveVertical,
  Code2,
  Square,
  type LucideIcon,
} from 'lucide-react';
import { REGISTRY } from '../schema/registry';
import type { BlockType } from '../schema/blockTypes';

export const NEW_BLOCK_DND_TYPE = 'NEW_BLOCK';

export interface NewBlockDragItem {
  blockType: BlockType;
}

const GROUP_LABEL: Record<string, string> = {
  estrutura: 'Estrutura',
  conteudo: 'Conteúdo',
  conversao: 'Conversão',
  prova: 'Prova social',
};

const GROUP_ORDER = ['estrutura', 'conteudo', 'conversao', 'prova'];

// Local-only icon mapping for the block library UI. Not part of the block
// registry/schema — purely a visual affordance so each block button reads
// like an icon-first builder (Framer-style) instead of plain text.
const BLOCK_ICON: Record<BlockType, LucideIcon> = {
  navbar: Menu,
  hero: Megaphone,
  logos: Building2,
  features: LayoutGrid,
  richtext: Type,
  media: Image,
  testimonial: Quote,
  stats: BarChart3,
  cta: MousePointerClick,
  form: TextCursorInput,
  faq: HelpCircle,
  footer: PanelBottom,
  spacer: MoveVertical,
  embed: Code2,
};

function LibraryItem({ type, onAdd }: { type: BlockType; onAdd: (type: BlockType) => void }) {
  const def = REGISTRY[type];
  const Icon = BLOCK_ICON[type] ?? Square;
  const [{ isDragging }, drag] = useDrag(() => ({
    type: NEW_BLOCK_DND_TYPE,
    item: { blockType: type } satisfies NewBlockDragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [type]);

  return (
    <button
      ref={drag as unknown as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={() => onAdd(type)}
      className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition-colors hover:border-[#FF5F39] hover:bg-[#FFF6F3] active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      title={`Adicionar bloco ${def.label}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-slate-400" />
        <span className="truncate">{def.label}</span>
      </span>
      <Plus className="size-3.5 shrink-0 text-slate-400" />
    </button>
  );
}

export function BlockLibrary({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const byGroup = React.useMemo(() => {
    const map = new Map<string, BlockType[]>();
    (Object.keys(REGISTRY) as BlockType[]).forEach((type) => {
      const group = REGISTRY[type].group;
      const list = map.get(group) ?? [];
      list.push(type);
      map.set(group, list);
    });
    return map;
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 border-r border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <h2 className="text-sm font-semibold text-slate-900">Blocos</h2>
        <p className="text-xs text-slate-500">Arraste para o canvas ou clique para adicionar.</p>
      </div>
      <div className="flex-1 space-y-5 px-3 py-4">
        {GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => (
          <div key={group} className="space-y-2">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {GROUP_LABEL[group] ?? group}
            </h3>
            <div className="space-y-1.5">
              {byGroup.get(group)!.map((type) => (
                <LibraryItem key={type} type={type} onAdd={onAdd} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlockLibrary;
