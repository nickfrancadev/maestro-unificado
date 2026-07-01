// LandingPageEditor — route component for /landing-pages/:id/edit. Composes
// the 3-panel DnD editor: BlockLibrary (left) + EditorCanvas (center) +
// PropsPanel (right), plus a top bar with undo/redo, autosave, a
// desktop/mobile viewport toggle, a preview-account switcher, and an
// "edit base vs personalize for {account}" mode toggle.
//
// Personalization write path (scope decision): when personalizing for an
// account, prop edits are written to `page.accountOverrides[accountId][blockId]`
// as a *shallow* `Partial<Block>` patch (only `props`/`showIf` as edited —
// mirrors the same `{ props: {...} }` patch shape every block Panel already
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
import { newBlock } from '../schema/registry';
import { listAccounts, toAccountContext, type LpAccount } from '../store/accounts';
import { useEditorHistory } from './useEditorHistory';
import { BlockLibrary } from './BlockLibrary';
import { EditorCanvas, type ViewportMode } from './EditorCanvas';
import { PropsPanel } from './PropsPanel';
import { PublishDialog } from '../publish/PublishDialog';

const AUTOSAVE_DELAY_MS = 600;

type SaveStatus = 'idle' | 'pending' | 'saved';
type PersonalizationMode = 'base' | 'personalize';

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selectedBlock = page.blocks.find((b) => b.id === selectedId) ?? null;
  const previewAccount = previewAccountId ? accounts.find((a) => a.id === previewAccountId) ?? null : null;
  const ctx = toAccountContext(previewAccount);
  const renderCtx: RenderContext = { ctx, brandKit: page.brandKit };
  const isPersonalizing = mode === 'personalize' && !!previewAccountId;

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
    setSelectedId(block.id);
  };

  const handleRemove = (blockId: string) => {
    updateBlocks(page.blocks.filter((b) => b.id !== blockId));
    if (selectedId === blockId) setSelectedId(null);
  };

  const handleDuplicate = (blockId: string) => {
    const idx = page.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const source = page.blocks[idx];
    const copy: Block = { ...newBlock(source.type), props: { ...source.props }, showIf: source.showIf };
    const blocks = page.blocks.slice();
    blocks.splice(idx + 1, 0, copy);
    updateBlocks(blocks);
    setSelectedId(copy.id);
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
  const handleChangeBlock = (patch: Partial<Block>) => {
    if (!selectedBlock) return;
    if (isPersonalizing && previewAccountId) {
      const accountOverrides = { ...page.accountOverrides };
      const forAccount = { ...(accountOverrides[previewAccountId] ?? {}) };
      const existing = forAccount[selectedBlock.id] ?? {};
      forAccount[selectedBlock.id] = {
        ...existing,
        ...patch,
        props: { ...(existing.props ?? {}), ...(patch.props ?? {}) },
      };
      accountOverrides[previewAccountId] = forAccount;
      updatePage({ accountOverrides });
    } else {
      const blocks = page.blocks.map((b) =>
        b.id === selectedBlock.id ? { ...b, ...patch, props: { ...b.props, ...(patch.props ?? {}) } } : b,
      );
      updateBlocks(blocks);
    }
  };

  // The Panel shown for a selected block should reflect what's actually on
  // screen: base props merged with the active account's override (when
  // personalizing), so authors edit "on top of" what they see rendered.
  const panelBlock: Block | null = (() => {
    if (!selectedBlock) return null;
    if (!isPersonalizing || !previewAccountId) return selectedBlock;
    const override = page.accountOverrides[previewAccountId]?.[selectedBlock.id];
    if (!override) return selectedBlock;
    return { ...selectedBlock, ...override, props: { ...selectedBlock.props, ...(override.props ?? {}) } };
  })();

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
            selectedId={selectedId}
            renderCtx={renderCtx}
            viewport={viewport}
            onSelect={setSelectedId}
            onRemove={handleRemove}
            onDuplicate={handleDuplicate}
            onReorder={handleReorder}
            onInsert={(type, index) => handleAddBlock(type as BlockType, index)}
          />
          <div className="w-80 shrink-0">
            <PropsPanel
              page={page}
              selectedBlock={panelBlock}
              onChangePage={updatePage}
              onChangeBlock={handleChangeBlock}
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
