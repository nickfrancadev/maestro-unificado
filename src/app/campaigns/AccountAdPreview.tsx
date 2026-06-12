import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { AccountCreative } from '@/lib/linkedin';
import { ctaLabel, creativeFallbackGradient } from './accountAnalytics';

interface AccountAdPreviewProps {
  creative: AccountCreative;
  accountName: string;
  industry: string | null;
  colorIndex: number;
}

export function AccountAdPreview({ creative, accountName, industry, colorIndex }: AccountAdPreviewProps) {
  const variantLabel = creative.variant === 'named' ? 'Personalizado' : 'Genérico';
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{accountName}</p>
          {industry && <p className="text-[11px] text-slate-400 truncate">{industry}</p>}
        </div>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          creative.variant === 'named'
            ? 'bg-[#FFF1ED] text-[#E54A26] border-[#FF5F39]/30'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {variantLabel}
        </span>
      </div>

      {/* Imagem do anúncio (proporção de link do LinkedIn 1.91:1) */}
      <div className="relative w-full aspect-[1.91/1] bg-slate-100">
        {creative.imageUrl ? (
          <img
            src={creative.imageUrl}
            alt={`Criativo do anúncio para ${accountName}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: creativeFallbackGradient(colorIndex) }}
            aria-label={`Pré-visualização do anúncio de ${accountName}`}
            role="img"
          >
            <ImageIcon className="w-8 h-8 text-white/70" />
          </div>
        )}
      </div>

      <div className="p-5 space-y-2">
        <h4 className="text-sm font-bold text-slate-900 leading-snug">{creative.headline}</h4>
        <p className="text-xs text-slate-500 line-clamp-2" title={creative.body}>{creative.body}</p>
        <div className="pt-1">
          <span className="inline-flex items-center text-xs font-semibold text-[#E54A26] border border-[#FF5F39]/40 rounded-md px-3 py-1.5">
            {ctaLabel(creative.cta)}
          </span>
        </div>
      </div>
    </div>
  );
}
