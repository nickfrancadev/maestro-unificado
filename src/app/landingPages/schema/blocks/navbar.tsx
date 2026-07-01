import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, ItemListEditor } from './panelFields';
import { SlotText, SlotButton } from './slots';

interface NavLink { label: string; href: string }

export interface NavbarProps {
  logoText: string;
  links: NavLink[];
  ctaLabel: string;
  ctaHref: string;
}

const NAVBAR_LOGO_TEXT_STYLE_BASE: SlotStyle = { fontSize: 18, fontWeight: 'semibold' };

export function navbarDefaults(): NavbarProps {
  return {
    logoText: '{{account.name}}',
    links: [
      { label: 'Produto', href: '#produto' },
      { label: 'Clientes', href: '#clientes' },
    ],
    ctaLabel: 'Falar com vendas',
    ctaHref: '#contato',
  };
}

export function NavbarRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as NavbarProps;
  const links = p.links ?? [];
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  const logoTextStyle: SlotStyle = { ...NAVBAR_LOGO_TEXT_STYLE_BASE, color: ctx.brandKit.colors.primary || undefined };
  const ctaStyle: SlotStyle = { bgColor: ctx.brandKit.colors.primary || '#0F172A', textColor: '#FFFFFF', radius: 6 };
  return (
    <nav className="flex items-center justify-between gap-4 border-b border-border/60 bg-white px-6 py-4">
      <SlotText
        slotId="logoText"
        as="span"
        value={p.logoText ?? ''}
        ctx={ctx}
        defaultStyle={logoTextStyle}
        styleOverride={styles.logoText}
      />
      <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
        {links.map((l, i) => (
          <a key={i} href={l.href} className="hover:text-slate-900">
            {resolveTokens(l.label ?? '', ctx.ctx)}
          </a>
        ))}
      </div>
      <SlotButton
        slotId="cta"
        className="px-4 py-2 text-sm font-medium"
        label={p.ctaLabel ?? ''}
        href={p.ctaHref}
        ctx={ctx}
        defaultStyle={ctaStyle}
        styleOverride={styles.cta}
      />
    </nav>
  );
}

export function NavbarPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as NavbarProps;
  const set = (patch: Partial<NavbarProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Texto do logo" value={p.logoText} onChange={(v) => set({ logoText: v })} />
      <ItemListEditor
        label="Links de navegação"
        items={p.links ?? []}
        makeItem={() => ({ label: 'Novo link', href: '#' })}
        onChange={(links) => set({ links: links as NavLink[] })}
        renderItem={(item, update) => (
          <>
            <TextField label="Texto" value={item.label as string} onChange={(v) => update({ label: v })} />
            <TextField label="Link" value={item.href as string} onChange={(v) => update({ href: v })} />
          </>
        )}
      />
      <TextField label="Texto do botão" value={p.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
      <TextField label="Link do botão" value={p.ctaHref} onChange={(v) => set({ ctaHref: v })} />
    </div>
  );
}
