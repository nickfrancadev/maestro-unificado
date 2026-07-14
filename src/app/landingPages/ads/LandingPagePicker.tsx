// Searchable selector for existing landing pages, used to bind an ad's
// destination URL to a page created in the Landing Pages product instead of
// a hand-typed link. Deliberately simple (search input + list) to match
// CreativeStep's existing plain-Tailwind styling rather than pulling in the
// shadcn Popover/Command combo, which fights with the wizard's scroll
// containers.
import { useMemo, useState } from 'react';
import { Search, CheckCircle2, FileText } from 'lucide-react';
import type { LandingPage } from '../store/model';
import { listPages } from '../store/repo';

const STATUS_META: Record<LandingPage['status'], { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'text-slate-500 bg-slate-100' },
  published: { label: 'Publicada', color: 'text-emerald-700 bg-emerald-50' },
  archived: { label: 'Arquivada', color: 'text-amber-700 bg-amber-50' },
};

interface LandingPagePickerProps {
  /** Currently selected page id, if any (best-effort — value is the LP id). */
  value?: string;
  onSelect: (page: LandingPage) => void;
}

export function LandingPagePicker({ value, onSelect }: LandingPagePickerProps) {
  const [query, setQuery] = useState('');
  // Re-read on every render — localStorage-backed repo, cheap, and keeps the
  // list fresh after navigating back from "Criar LP a partir desta campanha".
  const pages = listPages();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [pages, query]);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar landing page por nome ou slug…"
          className="w-full text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-slate-400">
            {pages.length === 0
              ? 'Nenhuma landing page criada ainda.'
              : 'Nenhuma landing page encontrada para essa busca.'}
          </div>
        )}
        {filtered.map((page) => {
          const meta = STATUS_META[page.status];
          const selected = value === page.id;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelect(page)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-b-0 transition-colors ${
                selected ? 'bg-[#FFF1ED]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="w-7 h-7 rounded-md bg-[#FFE3DA] flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-[#FF5F39]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{page.name}</div>
                <div className="text-[11px] text-slate-500 truncate">/p/{page.slug}</div>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${meta.color}`}>
                {meta.label}
              </span>
              {selected && <CheckCircle2 className="w-4 h-4 text-[#FF5F39] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LandingPagePicker;
