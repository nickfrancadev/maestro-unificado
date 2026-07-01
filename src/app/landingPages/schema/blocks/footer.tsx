import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { SlotText } from './slots';

interface FooterLink { label: string; href: string }

export interface FooterProps {
  companyText: string;
  links: FooterLink[];
}

const FOOTER_COMPANY_TEXT_STYLE: SlotStyle = { fontSize: 14, color: '#64748B' };

export function footerDefaults(): FooterProps {
  return {
    companyText: '© {{account.name}} · Todos os direitos reservados',
    links: [
      { label: 'Privacidade', href: '#' },
      { label: 'Termos', href: '#' },
    ],
  };
}

export function FooterRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as FooterProps;
  const links = p.links ?? [];
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  return (
    <footer className="flex flex-col items-center justify-between gap-3 border-t border-border/60 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:px-12">
      <SlotText
        slotId="companyText"
        as="span"
        value={p.companyText ?? ''}
        ctx={ctx}
        defaultStyle={FOOTER_COMPANY_TEXT_STYLE}
        styleOverride={styles.companyText}
      />
      <div className="flex items-center gap-4">
        {links.map((l, i) => (
          <a key={i} href={l.href} className="hover:text-slate-700">
            {resolveTokens(l.label ?? '', ctx.ctx)}
          </a>
        ))}
      </div>
    </footer>
  );
}
