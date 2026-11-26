import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Zap, ShieldCheck, MessageSquareText } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { MCP_GROUPS, MCP_TOTAL, MCP_COUNTS, type McpKind } from './mcpTools';
import { WhatsappGlyph } from './brand';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

type KindFilter = 'todas' | McpKind;

export const KIND_META: Record<McpKind, { label: string; plural: string; icon: typeof Eye; tag: string; hint: string }> = {
  consulta: {
    label: 'Consulta',
    plural: 'Consultas',
    icon: Eye,
    tag: 'bg-sky-50 text-sky-700',
    hint: 'Só olha os seus dados. Nada muda na Maestro.',
  },
  acao: {
    label: 'Ação',
    plural: 'Ações',
    icon: Zap,
    tag: 'bg-amber-50 text-amber-700',
    hint: 'Cria, muda ou exclui algo. A IA sempre pede seu ok antes.',
  },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Abre já filtrado no que funciona pelo WhatsApp. */
  whatsappOnly?: boolean;
}

export function McpToolsSheet({ open, onOpenChange, whatsappOnly = false }: Props) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('todas');
  const [onlyWa, setOnlyWa] = useState(whatsappOnly);

  useEffect(() => {
    if (open) setOnlyWa(whatsappOnly);
  }, [open, whatsappOnly]);

  const groups = useMemo(() => {
    const q = norm(query.trim());
    return MCP_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          (kind === 'todas' || i.kind === kind) &&
          (!onlyWa || i.whatsapp) &&
          (!q || norm(`${i.title} ${i.description} ${i.example} ${g.title}`).includes(q)),
      ),
    })).filter((g) => g.items.length);
  }, [query, kind, onlyWa]);

  const found = groups.reduce((n, g) => n + g.items.length, 0);
  const segments: { id: KindFilter; label: string; count: number }[] = [
    { id: 'todas', label: 'Tudo', count: MCP_TOTAL },
    { id: 'consulta', label: 'Consultas', count: MCP_COUNTS.consulta },
    { id: 'acao', label: 'Ações', count: MCP_COUNTS.acao },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[640px]">
        <SheetHeader className="border-b border-slate-100 px-7 pb-5 pt-7">
          <SheetTitle className="text-xl font-semibold text-[#212A46]">O que dá para fazer com a Maestro</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed text-slate-500">
            São {MCP_TOTAL} coisas que a sua IA consegue fazer na Maestro por você. Não precisa decorar nada: peça do
            seu jeito, por texto ou por áudio.
          </SheetDescription>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {(['consulta', 'acao'] as const).map((k) => {
              const m = KIND_META[k];
              const Icon = m.icon;
              return (
                <div key={k} className="flex gap-2.5 rounded-xl bg-slate-50 p-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${m.tag}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[13px] leading-snug text-slate-600">
                    <b className="font-semibold text-[#212A46]">{m.plural}.</b> {m.hint}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-[#212A46]/40 focus-within:ring-2 focus-within:ring-[#212A46]/10">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar, por exemplo: touchpoint, resumo, arquivar"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label="Buscar no que dá para fazer"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div role="radiogroup" aria-label="Tipo" className="inline-flex rounded-lg bg-slate-100 p-1">
              {segments.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === s.id}
                  onClick={() => setKind(s.id)}
                  className={`h-8 rounded-md px-3 text-[13px] font-medium transition-colors ${
                    kind === s.id ? 'bg-white text-[#212A46] shadow-sm' : 'text-slate-500 hover:text-[#212A46]'
                  }`}
                >
                  {s.label} <span className="ml-0.5 text-slate-400">{s.count}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={onlyWa}
              onClick={() => setOnlyWa((v) => !v)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                onlyWa
                  ? 'border-[#1DA851] bg-[#25D366]/10 text-[#14833f]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <WhatsappGlyph className="h-3.5 w-3.5" />
              Funciona no WhatsApp
            </button>
          </div>

          {onlyWa && (
            <p className="mt-3 flex gap-2 rounded-lg bg-[#25D366]/10 px-3 py-2 text-[13px] leading-snug text-[#14633a]">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              No WhatsApp dá para fazer todas as consultas e cadastrar contatos e contas. As outras ações ficam para a IA
              que você conectar.
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {found === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Nada encontrado{query ? ` para “${query}”` : ''}. Tente outra palavra ou tire um filtro.
            </p>
          )}
          <div className="space-y-8">
            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <section key={g.id} aria-labelledby={`mcp-g-${g.id}`}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#212A46]/[0.06]">
                      <Icon className="h-4 w-4 text-[#212A46]" />
                    </span>
                    <h3 id={`mcp-g-${g.id}`} className="text-[15px] font-semibold text-[#212A46]">
                      {g.title}
                    </h3>
                    <span className="text-xs text-slate-400">{g.items.length}</span>
                  </div>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {g.items.map((item) => {
                      const m = KIND_META[item.kind];
                      const KIcon = m.icon;
                      return (
                        <li key={item.tool} className="px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-[#212A46]">{item.title}</div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {item.whatsapp && !onlyWa && (
                                <span title="Funciona também pelo WhatsApp" className="text-[#1DA851]">
                                  <WhatsappGlyph className="h-3.5 w-3.5" />
                                  <span className="sr-only">Funciona também pelo WhatsApp</span>
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.tag}`}>
                                <KIcon className="h-3 w-3" /> {m.label}
                              </span>
                            </div>
                          </div>
                          <p className="mt-0.5 text-[13px] text-slate-600">{item.description}</p>
                          <p className="mt-2 inline-block rounded-lg rounded-tl-sm bg-slate-100 px-3 py-1.5 text-[13px] text-slate-500">
                            “{item.example}”
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <p className="mt-8 flex gap-2 border-t border-slate-100 pt-5 text-[13px] leading-snug text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            As ações só aparecem para quem tem perfil de Administrador, Editor ou Agência na Maestro. Quem tem perfil de
            leitura usa só as consultas.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
