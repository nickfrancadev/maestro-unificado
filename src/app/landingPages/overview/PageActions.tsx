// PageActions — shared per-page action definitions + dropdown menu used by
// BOTH the table row and the card/grid view on the Landing Pages Overview
// screen. Keeping the action list in one place avoids duplicating the
// edit/duplicate/publish/analytics/archive/copy-url logic across renderers.
import React, { useEffect, useState } from 'react';
import {
  MoreVertical,
  Pencil,
  Copy,
  Link2,
  BarChart3,
  Archive,
  Globe,
  EyeOff,
} from 'lucide-react';
import type { LandingPage } from '../store/model';

export interface PageActionHandlers {
  onEdit: () => void;
  onDuplicate: () => void;
  onTogglePublish: () => void;
  onAnalytics: () => void;
  onArchive: () => void;
  onCopyUrl: () => void;
}

export interface PageActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/** Builds the ordered list of actions available for a landing page. Shared
 * source of truth for both the table row menu and the card menu. */
export function getPageActionItems(page: LandingPage, handlers: PageActionHandlers): PageActionItem[] {
  return [
    { label: 'Editar', icon: <Pencil className="w-4 h-4" />, onClick: handlers.onEdit },
    { label: 'Duplicar', icon: <Copy className="w-4 h-4" />, onClick: handlers.onDuplicate },
    {
      label: page.status === 'published' ? 'Despublicar' : 'Publicar',
      icon: page.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />,
      onClick: handlers.onTogglePublish,
    },
    { label: 'Ver analytics', icon: <BarChart3 className="w-4 h-4" />, onClick: handlers.onAnalytics },
    { label: 'Copiar URL', icon: <Link2 className="w-4 h-4" />, onClick: handlers.onCopyUrl },
    { label: 'Arquivar', icon: <Archive className="w-4 h-4" />, onClick: handlers.onArchive, danger: true },
  ];
}

export function PageActionsMenu({
  page,
  handlers,
  className,
  buttonClassName,
}: {
  page: LandingPage;
  handlers: PageActionHandlers;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const items = getPageActionItems(page, handlers);
  const lastIndex = items.length - 1;

  return (
    <div className={`relative ${className ?? ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          buttonClassName ??
          'p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded'
        }
        title="Ações"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {items.map((it, idx) => (
            <React.Fragment key={it.label}>
              {it.danger && idx === lastIndex && <div className="my-1 border-t border-slate-100" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  it.onClick();
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                  it.danger ? 'text-red-600' : 'text-slate-700'
                }`}
              >
                {it.icon}
                {it.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default PageActionsMenu;
