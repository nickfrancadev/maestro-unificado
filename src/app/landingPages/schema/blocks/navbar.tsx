import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, ItemListEditor } from './panelFields';

interface NavLink { label: string; href: string }

export interface NavbarProps {
  logoText: string;
  links: NavLink[];
  ctaLabel: string;
  ctaHref: string;
}

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
  return (
    <nav className="flex items-center justify-between gap-4 border-b border-border/60 bg-white px-6 py-4">
      <span className="text-lg font-semibold" style={{ color: ctx.brandKit.colors.primary || undefined }}>
        {resolveTokens(p.logoText ?? '', ctx.ctx)}
      </span>
      <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
        {links.map((l, i) => (
          <a key={i} href={l.href} className="hover:text-slate-900">
            {resolveTokens(l.label ?? '', ctx.ctx)}
          </a>
        ))}
      </div>
      <a
        href={p.ctaHref}
        className="rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: ctx.brandKit.colors.primary || '#0F172A' }}
      >
        {resolveTokens(p.ctaLabel ?? '', ctx.ctx)}
      </a>
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
