import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Curated Google Fonts the IA composer recognizes well. Grouped by tone so
// the user can pick a vibe without scrolling through 1500 options.
const FONT_OPTIONS: { label: string; family: string; group: string }[] = [
  { group: 'Sans-serif moderna', family: 'Inter', label: 'Inter' },
  { group: 'Sans-serif moderna', family: 'Roboto', label: 'Roboto' },
  { group: 'Sans-serif moderna', family: 'Poppins', label: 'Poppins' },
  { group: 'Sans-serif moderna', family: 'Montserrat', label: 'Montserrat' },
  { group: 'Sans-serif moderna', family: 'DM Sans', label: 'DM Sans' },
  { group: 'Sans-serif moderna', family: 'Work Sans', label: 'Work Sans' },
  { group: 'Sans-serif geométrica', family: 'Manrope', label: 'Manrope' },
  { group: 'Sans-serif geométrica', family: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { group: 'Sans-serif geométrica', family: 'Space Grotesk', label: 'Space Grotesk' },
  { group: 'Serif clássica', family: 'Playfair Display', label: 'Playfair Display' },
  { group: 'Serif clássica', family: 'Lora', label: 'Lora' },
  { group: 'Serif clássica', family: 'Merriweather', label: 'Merriweather' },
  { group: 'Display / impacto', family: 'Bebas Neue', label: 'Bebas Neue' },
  { group: 'Display / impacto', family: 'Oswald', label: 'Oswald' },
  { group: 'Display / impacto', family: 'Archivo Black', label: 'Archivo Black' },
];

export function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groups = Array.from(new Set(FONT_OPTIONS.map((f) => f.group)));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Fonte</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-slate-200 rounded hover:border-slate-300 focus:ring-1 focus:ring-[#FF5F39] outline-none"
      >
        <span style={{ fontFamily: `"${value}", sans-serif` }} className="truncate">{value}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 sticky top-0">
                {g}
              </div>
              {FONT_OPTIONS.filter((f) => f.group === g).map((f) => {
                const isActive = f.family === value;
                return (
                  <button
                    key={f.family}
                    type="button"
                    onClick={() => { onChange(f.family); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-base transition-colors ${
                      isActive ? 'bg-[#FFF1ED] text-[#212A46]' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                    style={{ fontFamily: `"${f.family}", sans-serif` }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
