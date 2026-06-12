import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AccountFocusSwitcherProps {
  label: string;      // nome da empresa focada
  index: number;      // posição (0-based) entre as selecionadas
  total: number;      // nº de empresas selecionadas
  onPrev: () => void;
  onNext: () => void;
}

export function AccountFocusSwitcher({ label, index, total, onPrev, onNext }: AccountFocusSwitcherProps) {
  const disabled = total <= 1;
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2">
      <button
        onClick={onPrev}
        disabled={disabled}
        aria-label="Empresa anterior"
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="min-w-0 text-center">
        <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
        <p className="text-[10px] text-slate-400">{index + 1} / {total}</p>
      </div>
      <button
        onClick={onNext}
        disabled={disabled}
        aria-label="Próxima empresa"
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
