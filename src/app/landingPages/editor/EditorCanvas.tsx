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
import { GripVertical, Copy, Trash2, ChevronUp, ChevronDown, EyeOff } from 'lucide-react';
import { REGISTRY } from '../schema/registry';
import type { RenderContext } from '../schema/registry';
import type { Block } from '../schema/blockTypes';
import { mergeOverride, isVisible } from '../engine/resolveBlock';
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
  resolvedBlock,
  hiddenForAccount,
  index,
  total,
  selected,
  renderCtx,
  onSelect,
  onRemove,
  onDuplicate,
  onMove,
  onReorderDrop,
  onInsertDrop,
}: {
  /** Base block (from page.blocks) — selection/reorder/remove/duplicate all
   * target this id so the account-resolved view never leaks into the base
   * document. */
  block: Block;
  /** Override-merged block for the currently selected preview account (or
   * the same as `block` when no preview account is selected). This is what
   * actually gets rendered, so the canvas matches the public page. */
  resolvedBlock: Block;
  /** True when `showIf` hides this block for the selected preview account.
   * The editor still renders it (dimmed + tagged) so authors can select and
   * edit it, unlike the public page which omits it entirely. */
  hiddenForAccount: boolean;
  index: number;
  total: number;
  selected: boolean;
  renderCtx: RenderContext;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: -1 | 1) => void;
  onReorderDrop: (fromIndex: number, toIndex: number) => void;
  onInsertDrop: (type: string, index: number) => void;
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
        // Existing-block reorder: dropped directly on this shell.
        if (item.index === index) return;
        onReorderDrop(item.index, index);
        return;
      }
      // NEW_BLOCK dropped on the block's body (not the thin InsertZone
      // strip). Insert it adjacent to this block, choosing before/after
      // based on pointer position relative to the shell's vertical
      // midpoint — same technique used for reorder drop targets.
      const clientOffset = monitor.getClientOffset();
      const bounds = ref.current?.getBoundingClientRect();
      let targetIndex = index;
      if (clientOffset && bounds) {
        const midY = (bounds.top + bounds.bottom) / 2;
        targetIndex = clientOffset.y > midY ? index + 1 : index;
      }
      onInsertDrop(item.blockType, targetIndex);
    },
  }), [index, onReorderDrop, onInsertDrop]);

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
      {hiddenForAccount && (
        <div className="pointer-events-none absolute -top-3 right-3 z-20 flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 shadow-sm">
          <EyeOff className="size-3" />
          Oculto para este segmento
        </div>
      )}
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
      <div style={hiddenForAccount ? { opacity: 0.4 } : undefined}>
        <Render block={resolvedBlock} ctx={renderCtx} />
      </div>
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
  /** Overrides for the currently selected preview account
   * (`page.accountOverrides[previewAccountId]`), or undefined when no
   * preview account is selected (base/default mode — matches the public
   * page with no `?a=`). Same shape `resolveBlocks` consumes. */
  overridesForAccount?: Record<string, Partial<Block>>;
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
  overridesForAccount,
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

  // Account-resolved view for WYSIWYG parity with the public page: each base
  // block gets merged with its override for the selected preview account
  // (same `mergeOverride` the public renderer uses via `resolveBlocks`).
  // Selection/reorder/remove/duplicate always key off the BASE block's id —
  // only the rendered *content* below reflects the resolved/merged version.
  const resolvedBlocks = React.useMemo(
    () => blocks.map((b) => mergeOverride(b, overridesForAccount?.[b.id])),
    [blocks, overridesForAccount],
  );

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
                resolvedBlock={resolvedBlocks[index]}
                hiddenForAccount={!isVisible(block.showIf, renderCtx.ctx)}
                index={index}
                total={blocks.length}
                selected={block.id === selectedId}
                renderCtx={renderCtx}
                onSelect={() => onSelect(block.id)}
                onRemove={() => onRemove(block.id)}
                onDuplicate={() => onDuplicate(block.id)}
                onMove={(delta) => move(index, delta)}
                onReorderDrop={onReorder}
                onInsertDrop={onInsert}
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
