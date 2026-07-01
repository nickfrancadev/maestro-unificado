// EditorCanvas — center panel. Renders the resolved document through the
// SAME `BlockRenderer` used by the public page (WYSIWYG), but wraps each
// block in a selection/reorder/hover-controls shell so authors can select,
// duplicate, remove, reorder (drag handle + up/down buttons) and drop new
// blocks from the library at a specific position.
//
// Scope decision: inline `contentEditable` text editing was judged too risky
// to do robustly in the time available — BlockRenderer's Render components
// are shared with the read-only public page and were not designed to host
// contentEditable regions safely (no selection/caret preservation across
// re-renders, no per-field mapping back to props). Instead the canvas is
// selection-only: clicking a block selects it and the right-hand PropsPanel
// (already backed by each block's typed Panel) is the editing surface. This
// keeps the canvas simple and correct rather than partially working.
import * as React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { REGISTRY } from '../schema/registry';
import type { RenderContext } from '../schema/registry';
import type { Block } from '../schema/blockTypes';
import { NEW_BLOCK_DND_TYPE, type NewBlockDragItem } from './BlockLibrary';

const EXISTING_BLOCK_DND_TYPE = 'EXISTING_BLOCK';

interface ExistingBlockDragItem {
  index: number;
  id: string;
}

export type ViewportMode = 'desktop' | 'mobile';

function DropIndicator() {
  return <div className="mx-3 h-1 rounded-full bg-[#FF5F39]" />;
}

function BlockShell({
  block,
  index,
  total,
  selected,
  renderCtx,
  onSelect,
  onRemove,
  onDuplicate,
  onMove,
  onReorderDrop,
}: {
  block: Block;
  index: number;
  total: number;
  selected: boolean;
  renderCtx: RenderContext;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: -1 | 1) => void;
  onReorderDrop: (fromIndex: number, toIndex: number) => void;
}) {
  const def = REGISTRY[block.type];
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: EXISTING_BLOCK_DND_TYPE,
    item: { index, id: block.id } satisfies ExistingBlockDragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [index, block.id]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: [EXISTING_BLOCK_DND_TYPE, NEW_BLOCK_DND_TYPE],
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    drop: (item: ExistingBlockDragItem | NewBlockDragItem, monitor) => {
      if (monitor.didDrop()) return;
      if ('index' in item) {
        if (item.index === index) return;
        onReorderDrop(item.index, index);
      }
      // NEW_BLOCK drops are handled by the parent's onDropNewBlock via a
      // separate hook below (see NewBlockDropZone) — existing-block shell
      // only needs to react to reorder drags landing directly on it.
    },
  }), [index, onReorderDrop]);

  drag(drop(ref));

  if (!def) return null;
  const Render = def.Render;

  return (
    <div
      ref={ref}
      className="group relative"
      style={{ opacity: isDragging ? 0.35 : 1, outline: isOver ? '2px dashed #FF5F39' : undefined }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-colors ${
          selected ? 'ring-2 ring-[#FF5F39] ring-inset' : 'ring-1 ring-transparent group-hover:ring-slate-300 ring-inset'
        }`}
      />
      <div className="pointer-events-none absolute -top-3 left-3 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1 py-1 shadow-sm">
          <span className="cursor-grab px-1 text-slate-400" title="Arrastar para reordenar">
            <GripVertical className="size-3.5" />
          </span>
          <span className="px-1.5 text-[11px] font-medium text-slate-500">{def.label}</span>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            title="Mover para cima"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onMove(-1); }}
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            title="Mover para baixo"
            disabled={index === total - 1}
            onClick={(e) => { e.stopPropagation(); onMove(1); }}
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            title="Duplicar bloco"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-red-500 hover:bg-red-50"
            title="Remover bloco"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <Render block={block} ctx={renderCtx} />
    </div>
  );
}

/** A thin dropzone rendered between blocks (and at the very end) that only
 * accepts NEW_BLOCK drags from the library and inserts at that position. */
function InsertZone({ index, onDropNewBlock }: { index: number; onDropNewBlock: (type: string, index: number) => void }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: NEW_BLOCK_DND_TYPE,
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    drop: (item: NewBlockDragItem) => {
      onDropNewBlock(item.blockType, index);
    },
  }), [index, onDropNewBlock]);

  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} className="relative h-3">
      {canDrop && isOver && <DropIndicator />}
    </div>
  );
}

export interface EditorCanvasProps {
  blocks: Block[];
  selectedId: string | null;
  renderCtx: RenderContext;
  viewport: ViewportMode;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onInsert: (type: string, index: number) => void;
}

export function EditorCanvas({
  blocks,
  selectedId,
  renderCtx,
  viewport,
  onSelect,
  onRemove,
  onDuplicate,
  onReorder,
  onInsert,
}: EditorCanvasProps) {
  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    onReorder(index, to);
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-slate-100" onClick={() => onSelect(null)}>
      <div className="flex justify-center px-6 py-8">
        <div
          className="w-full bg-white shadow-sm transition-[max-width] duration-200"
          style={{ maxWidth: viewport === 'mobile' ? 390 : 1120 }}
        >
          {blocks.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 text-sm text-slate-400">
              <p>Arraste um bloco da biblioteca para começar.</p>
            </div>
          )}
          <InsertZone index={0} onDropNewBlock={onInsert} />
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              <BlockShell
                block={block}
                index={index}
                total={blocks.length}
                selected={block.id === selectedId}
                renderCtx={renderCtx}
                onSelect={() => onSelect(block.id)}
                onRemove={() => onRemove(block.id)}
                onDuplicate={() => onDuplicate(block.id)}
                onMove={(delta) => move(index, delta)}
                onReorderDrop={onReorder}
              />
              <InsertZone index={index + 1} onDropNewBlock={onInsert} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EditorCanvas;
