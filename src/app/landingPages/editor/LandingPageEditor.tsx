// LandingPageEditor — route component for /landing-pages/:id/edit. Composes
// the 3-panel DnD editor: BlockLibrary (left) + EditorCanvas (center) +
// StylePanel (right), plus a top bar with undo/redo, autosave, a
// desktop/mobile viewport toggle, a preview-account switcher, and an
// "edit base vs personalize for {account}" mode toggle.
//
// Personalization write path (scope decision): when personalizing for an
// account, prop edits are written to `page.accountOverrides[accountId][blockId]`
// as a *shallow* `Partial<Block>` patch (only `props`/`showIf` as edited —
// mirrors the same `{ props: {...} }` patch shape every style/content edit
// emits). This is exactly what `resolveBlock.mergeOverride` expects
// (base block deep-merged with `override.props`), so no new merge logic was
// needed on the read side — BlockRenderer already applies overrides via
// `resolveBlocks`. Switching back to "editar base" writes to the base block
// list instead, leaving any existing override untouched (AC-5.6.3).
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowLeft, Undo2, Redo2, Monitor, Smartphone, Rocket, Check, Loader2 } from 'lucide-react';
import { getPage, savePage } from '../store/repo';
import type { LandingPage } from '../store/model';
import type { Block, BlockType } from '../schema/blockTypes';
import type { RenderContext } from '../schema/registry';
import { newBlock, REGISTRY } from '../schema/registry';
import { listAccounts, toAccountContext, type LpAccount } from '../store/accounts';
import { useEditorHistory } from './useEditorHistory';
import { BlockLibrary } from './BlockLibrary';
import { EditorCanvas, type ViewportMode, type CanvasSelection } from './EditorCanvas';
import { StylePanel } from './StylePanel';
import type { SlotStyle } from './slotStyle';
import { PublishDialog } from '../publish/PublishDialog';

const AUTOSAVE_DELAY_MS = 600;

type SaveStatus = 'idle' | 'pending' | 'saved';
type PersonalizationMode = 'base' | 'personalize';

/** A single selection: a slot within a block, or `'__block__'` for the
 * block's own container (background click, not a specific slot). Only one
 * block/slot pair can be selected at a time — mirrors the single
 * `editingText` boolean below (only one text slot can be in inline-edit
 * mode at once). Alias of `CanvasSelection` (same shape EditorCanvas expects). */
type Selection = CanvasSelection;

function NotFoundState() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-slate-900">Landing page não encontrada.</p>
      <button
        type="button"
        onClick={() => navigate('/landing-pages')}
        className="rounded-md bg-[#FF5F39] px-4 py-2 text-sm font-medium text-white hover:bg-[#E54A26]"
      >
        Voltar para a lista
      </button>
    </div>
  );
}

export function LandingPageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const initialPage = useMemo(() => (id ? getPage(id) : undefined), [id]);
  const history = useEditorHistory<LandingPage | null>(initialPage ?? null);
  const page = history.value;

  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingText, setEditingText] = useState(false);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [accounts, setAccounts] = useState<LpAccount[]>([]);
  const [previewAccountId, setPreviewAccountId] = useState<string>('');
  const [mode, setMode] = useState<PersonalizationMode>('base');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [publishOpen, setPublishOpen] = useState(false);

  useEffect(() => {
    setAccounts(listAccounts());
  }, []);

  // Personalizing requires a selected preview account; falling back to base
  // mode keeps the write path unambiguous if the account selector is cleared.
  useEffect(() => {
    if (!previewAccountId && mode === 'personalize') setMode('base');
  }, [previewAccountId, mode]);

  // --- Autosave -------------------------------------------------------
  // Debounced ~600ms after the document changes. Guards against setState /
  // save calls firing after unmount (route navigation away from the editor).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  useEffect(() => {
    if (!page) return;
    setSaveStatus('pending');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePage(page);
      if (mountedRef.current) setSaveStatus('saved');
      saveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!id || !page) return <NotFoundState />;

  const selectedBlock = page.blocks.find((b) => b.id === selection?.blockId) ?? null;
  const previewAccount = previewAccountId ? accounts.find((a) => a.id === previewAccountId) ?? null : null;
  const ctx = toAccountContext(previewAccount);
  const renderCtx: RenderContext = { ctx, brandKit: page.brandKit };
  const isPersonalizing = mode === 'personalize' && !!previewAccountId;
  // Canvas WYSIWYG parity with the public page: whenever a preview account
  // is selected (regardless of base/personalize mode toggle — the toggle
  // only controls the WRITE path), the canvas should render that account's
  // override-merged + visibility-resolved view, same as `/p/:slug?a=<id>`.
  // No preview account selected -> undefined -> canvas renders base blocks,
  // matching the public page with no `?a=`.
  const overridesForAccount = previewAccountId ? page.accountOverrides[previewAccountId] : undefined;

  const updatePage = (patch: Partial<LandingPage>) => {
    history.set({ ...page, ...patch });
  };

  const updateBlocks = (blocks: Block[]) => {
    history.set({ ...page, blocks });
  };

  const handleAddBlock = (type: BlockType, index?: number) => {
    const block = newBlock(type);
    const blocks = page.blocks.slice();
    const at = index ?? blocks.length;
    blocks.splice(at, 0, block);
    updateBlocks(blocks);
    setSelection({ blockId: block.id, slotId: '__block__' });
    setEditingText(false);
  };

  const handleRemove = (blockId: string) => {
    updateBlocks(page.blocks.filter((b) => b.id !== blockId));
    if (selection?.blockId === blockId) {
      setSelection(null);
      setEditingText(false);
    }
  };

  const handleDuplicate = (blockId: string) => {
    const idx = page.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const source = page.blocks[idx];
    const copy: Block = { ...newBlock(source.type), props: { ...source.props }, showIf: source.showIf };
    const blocks = page.blocks.slice();
    blocks.splice(idx + 1, 0, copy);
    updateBlocks(blocks);
    setSelection({ blockId: copy.id, slotId: '__block__' });
    setEditingText(false);
  };

  // Slot selection: clicking an unselected slot selects it. Clicking an
  // already-selected TEXT slot a second time promotes it into inline
  // contentEditable mode (the SlotText helper reacts to `editingText`).
  // Non-text slots (button/image) and the block container never enter
  // text-edit mode — a second click on those just re-selects (no-op).
  const handleSelectSlot = (blockId: string, slotId: string) => {
    const block = page.blocks.find((b) => b.id === blockId);
    const isTextSlot = slotId !== '__block__' && block && REGISTRY[block.type].slots.find((s) => s.id === slotId)?.kind === 'text';
    if (selection?.blockId === blockId && selection.slotId === slotId && isTextSlot) {
      setEditingText(true);
      return;
    }
    setSelection({ blockId, slotId });
    setEditingText(false);
  };

  // Writes the inline-edited text back to the block's content prop. Since a
  // text slot's id IS its content prop name (established during the slots
  // migration, e.g. hero's 'headline' slot <-> `props.headline`), this is a
  // direct `{ props: { [slotId]: value } }` patch through the existing
  // `handleChangeBlock` path — so it respects base-vs-personalize mode the
  // same way every StylePanel edit already does.
  const handleEditText = (blockId: string, slotId: string, value: string) => {
    const block = page.blocks.find((b) => b.id === blockId);
    if (block) {
      handleChangeBlock({ props: { ...block.props, [slotId]: value } }, block);
    }
    setEditingText(false);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const blocks = page.blocks.slice();
    const [moved] = blocks.splice(fromIndex, 1);
    const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
    blocks.splice(insertAt, 0, moved);
    updateBlocks(blocks);
  };

  // Writes a props/showIf patch either to the base block (editing mode) or
  // into page.accountOverrides[accountId][blockId] (personalize mode).
  // `target` defaults to the currently selected block (StylePanel edits), but
  // callers that already resolved a specific block (e.g. inline text edit)
  // may pass it explicitly — both write through the same base-vs-personalize
  // branch below.
  const handleChangeBlock = (patch: Partial<Block>, target: Block | null = selectedBlock) => {
    if (!target) return;
    if (isPersonalizing && previewAccountId) {
      const accountOverrides = { ...page.accountOverrides };
      const forAccount = { ...(accountOverrides[previewAccountId] ?? {}) };
      const existing = forAccount[target.id] ?? {};
      forAccount[target.id] = {
        ...existing,
        ...patch,
        props: { ...(existing.props ?? {}), ...(patch.props ?? {}) },
      };
      accountOverrides[previewAccountId] = forAccount;
      updatePage({ accountOverrides });
    } else {
      const blocks = page.blocks.map((b) =>
        b.id === target.id ? { ...b, ...patch, props: { ...b.props, ...(patch.props ?? {}) } } : b,
      );
      updateBlocks(blocks);
    }
  };

  // The StylePanel shown for a selected block should reflect what's actually
  // on screen: base props merged with the active account's override (when
  // personalizing), so authors edit "on top of" what they see rendered.
  const panelBlock: Block | null = (() => {
    if (!selectedBlock) return null;
    if (!isPersonalizing || !previewAccountId) return selectedBlock;
    const override = page.accountOverrides[previewAccountId]?.[selectedBlock.id];
    if (!override) return selectedBlock;
    return { ...selectedBlock, ...override, props: { ...selectedBlock.props, ...(override.props ?? {}) } };
  })();

  // Style edits: merge a SlotStyle patch into `props.styles[slotId]`,
  // preserving any other slots' styles already set on this block.
  const handleChangeStyle = (slotId: string, patch: Partial<SlotStyle>) => {
    if (!panelBlock) return;
    const styles = (panelBlock.props.styles ?? {}) as Record<string, SlotStyle>;
    handleChangeBlock({
      props: {
        ...panelBlock.props,
        styles: { ...styles, [slotId]: { ...(styles[slotId] ?? {}), ...patch } },
      },
    });
  };

  // Content edits from the StylePanel (button href, image url) — a plain
  // content-prop patch, same shape every inline text edit / former Panel
  // edit already used.
  const handleChangeContent = (prop: string, value: string) => {
    if (!panelBlock) return;
    handleChangeBlock({ props: { ...panelBlock.props, [prop]: value } });
  };

  const statusLabel = saveStatus === 'pending' ? 'Salvando…' : saveStatus === 'saved' ? 'Salvo' : '';

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/landing-pages')}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              title="Voltar"
            >
              <ArrowLeft className="size-4" />
            </button>
            <input
              value={page.name}
              onChange={(e) => updatePage({ name: e.target.value })}
              className="min-w-0 max-w-xs truncate rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={history.undo}
                disabled={!history.canUndo}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Desfazer"
              >
                <Undo2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={history.redo}
                disabled={!history.canRedo}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Refazer"
              >
                <Redo2 className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400" style={{ minWidth: 64 }}>
              {saveStatus === 'pending' && <Loader2 className="size-3.5 animate-spin" />}
              {saveStatus === 'saved' && <Check className="size-3.5 text-emerald-500" />}
              <span>{statusLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop/Mobile toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`rounded px-2 py-1 text-xs font-medium ${viewport === 'desktop' ? 'bg-[#FF5F39] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Desktop"
              >
                <Monitor className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`rounded px-2 py-1 text-xs font-medium ${viewport === 'mobile' ? 'bg-[#FF5F39] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Mobile"
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>

            {/* Preview account switcher */}
            <select
              value={previewAccountId}
              onChange={(e) => setPreviewAccountId(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
            >
              <option value="">Nenhuma conta (base)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Personalization mode toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => setMode('base')}
                className={`rounded px-2 py-1 text-xs font-medium ${mode === 'base' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Editar base
              </button>
              <button
                type="button"
                onClick={() => setMode('personalize')}
                disabled={!previewAccountId}
                title={!previewAccountId ? 'Selecione uma conta para personalizar' : undefined}
                className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-40 ${mode === 'personalize' && previewAccountId ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Personalizar{previewAccount ? ` para ${previewAccount.name}` : ''}
              </button>
            </div>

            {/* Publish */}
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#FF5F39] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#E54A26]"
              title={page.status === 'published' ? 'Gerenciar publicação' : 'Publicar'}
            >
              <Rocket className="size-3.5" />
              {page.status === 'published' ? 'Publicada' : 'Publicar'}
            </button>
          </div>
        </div>

        {/* 3 panels */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 shrink-0">
            <BlockLibrary onAdd={(type) => handleAddBlock(type)} />
          </div>
          <EditorCanvas
            blocks={page.blocks}
            selection={selection}
            editingText={editingText}
            renderCtx={renderCtx}
            viewport={viewport}
            overridesForAccount={overridesForAccount}
            onSelectSlot={handleSelectSlot}
            onEditText={handleEditText}
            onDeselect={() => { setSelection(null); setEditingText(false); }}
            onRemove={handleRemove}
            onDuplicate={handleDuplicate}
            onReorder={handleReorder}
            onInsert={(type, index) => handleAddBlock(type as BlockType, index)}
          />
          <div className="w-80 shrink-0">
            <StylePanel
              selection={selection}
              block={panelBlock}
              page={page}
              onChangeStyle={handleChangeStyle}
              onChangeContent={handleChangeContent}
              onChangePage={updatePage}
            />
          </div>
        </div>
      </div>

      <PublishDialog
        page={page}
        open={publishOpen}
        onOpenChange={setPublishOpen}
        onChanged={(updated) => {
          // PublishDialog already persists via savePage — mirror the change
          // into the in-memory document without creating a new undo step
          // (publish/unpublish is metadata, not a block edit) so the button
          // label and status badge reflect it immediately.
          history.replace(updated);
        }}
      />
    </DndProvider>
  );
}

export default LandingPageEditor;
