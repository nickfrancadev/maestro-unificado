import { useState } from 'react';
import { Copy, Check, ExternalLink, KeyRound, Eye, ShieldCheck, ListChecks, Mic, Puzzle } from 'lucide-react';
import { toast } from 'sonner';
import { LLM_CLIENTS, MCP_URL } from './llmClients';
import { MCP_TOTAL, MCP_COUNTS } from './mcpTools';
import { McpToolsSheet } from './McpToolsSheet';
import { PhoneNumberField } from './PhoneNumberField';
import { useWhatsappNumber, formatBrPhone } from './whatsappNumber';
import { WhatsappGlyph } from './brand';

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* sem permissão de clipboard: o texto continua selecionável */
    }
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
  };
  return { copied, copy };
}

export function McpSettings() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsWa, setToolsWa] = useState(false);
  const openTools = (wa: boolean) => {
    setToolsWa(wa);
    setToolsOpen(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/70 bg-white px-8 py-7">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="max-w-[640px]">
            <h2 className="text-[22px] font-semibold text-[#212A46]">MCP</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
              Use a Maestro de dentro da IA que você já usa, ou pelo seu WhatsApp. Pergunte como estão suas contas,
              crie touchpoints e peça o resumo da semana sem abrir a plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openTools(false)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-[#212A46] hover:border-[#212A46]/30 hover:bg-slate-50"
          >
            <ListChecks className="h-4 w-4 text-[#FF5F39]" />
            Ver o que dá para fazer
            <span className="rounded-full bg-slate-100 px-1.5 text-xs font-medium text-slate-500">{MCP_TOTAL}</span>
          </button>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 @2xl:grid-cols-3">
          {[
            { icon: KeyRound, title: 'Entra com o seu login', text: 'Você autoriza uma vez, sem senha nova nem chave para guardar.' },
            { icon: Eye, title: 'Vê só o que você vê', text: 'A IA enxerga as mesmas contas e plays que você tem acesso na Maestro.' },
            { icon: ShieldCheck, title: 'Confirma antes de mudar', text: 'Para criar ou alterar algo, a IA mostra o que vai fazer e pede seu ok.' },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-xl bg-slate-50 p-4">
              <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FF5F39]" />
              <div>
                <div className="text-sm font-semibold text-[#212A46]">{title}</div>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ConnectLlm />
      <WhatsappMcp onOpenTools={() => openTools(true)} />

      <McpToolsSheet open={toolsOpen} onOpenChange={setToolsOpen} whatsappOnly={toolsWa} />
    </div>
  );
}

function ConnectLlm() {
  const [selected, setSelected] = useState(LLM_CLIENTS[0].id);
  const { copied, copy } = useCopy();
  const client = LLM_CLIENTS.find((c) => c.id === selected)!;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <header className="border-b border-slate-100 px-8 pb-5 pt-7">
        <h3 className="text-lg font-semibold text-[#212A46]">Conecte a Maestro na sua IA</h3>
        <p className="mt-1 text-sm text-slate-500">Escolha a IA que você usa e siga os passos. Leva menos de 2 minutos.</p>
      </header>

      <div className="px-8 py-6">
        <div role="radiogroup" aria-label="Escolha sua IA" className="grid grid-cols-4 gap-2.5 @4xl:grid-cols-7">
          {LLM_CLIENTS.map((c) => {
            const active = c.id === selected;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(c.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border px-2 pb-3 pt-4 text-center transition-all ${
                  active
                    ? 'border-[#FF5F39] bg-[#FF5F39]/[0.04] ring-1 ring-[#FF5F39]'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center">
                  {c.logo ? (
                    <img src={c.logo} alt="" className="h-8 w-8 object-contain" />
                  ) : (
                    <Puzzle className="h-7 w-7 text-slate-400" />
                  )}
                </span>
                <span className="text-[13px] font-semibold leading-tight text-[#212A46]">{c.name}</span>
                <span className="text-[11px] leading-tight text-slate-400">{c.surface}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 rounded-xl border border-slate-200 p-6 @3xl:grid-cols-[1fr_minmax(0,360px)]">
          <div>
            <div className="flex items-center gap-2.5">
              {client.logo && <img src={client.logo} alt="" className="h-6 w-6" />}
              <h4 className="text-base font-semibold text-[#212A46]">Como conectar no {client.name}</h4>
            </div>
            <ol className="mt-4 space-y-3">
              {client.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#212A46] text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-snug">{s}</span>
                </li>
              ))}
            </ol>
            {client.note && <p className="mt-4 text-[13px] text-slate-500">{client.note}</p>}
          </div>

          <div className="space-y-4">
            {client.command ? (
              <CopyBox label="Comando" value={client.command} id={`cmd-${client.id}`} copied={copied} onCopy={copy} mono />
            ) : null}
            <CopyBox label="Endereço do servidor" value={MCP_URL} id="url" copied={copied} onCopy={copy} mono />
            {client.action && (
              <a
                href={client.action.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#212A46] text-sm font-semibold text-white hover:bg-[#2d3960]"
              >
                {client.action.label}
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyBox({
  label,
  value,
  id,
  copied,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  id: string;
  copied: string | null;
  onCopy: (v: string, id: string) => void;
  mono?: boolean;
}) {
  const isCopied = copied === id;
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-slate-500">{label}</div>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <code
          className={`flex-1 select-all break-words px-3 py-2.5 text-[12.5px] leading-snug text-[#212A46] ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => onCopy(value, id)}
          className="flex w-[84px] shrink-0 items-center justify-center gap-1.5 border-l border-slate-200 bg-white text-xs font-semibold text-[#212A46] hover:bg-slate-50"
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {isCopied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

function WhatsappMcp({ onOpenTools }: { onOpenTools: () => void }) {
  const phone = useWhatsappNumber();

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <header className="border-b border-slate-100 px-8 pb-5 pt-7">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[#212A46]">
          Converse com a Maestro pelo WhatsApp
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Sem instalar nada: mande uma mensagem de texto ou um áudio e a Maestro responde na hora.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 px-8 py-7 @3xl:grid-cols-[1fr_320px]">
        <div>
          <ol className="space-y-4">
            {[
              { title: 'Cadastre seu número', text: 'Só este número consegue falar com a sua conta da Maestro.' },
              {
                title: 'Mande uma mensagem para a Maestro',
                text: 'Por texto ou por áudio, do jeito que você falaria com alguém do time.',
              },
              {
                title: 'A Maestro responde',
                text: 'Pergunte sobre contas, contatos, dossiês e resultados, e cadastre contatos e contas novas. Para criar plays e touchpoints, use a IA conectada acima.',
              },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    i === 0 && phone ? 'bg-emerald-500 text-white' : 'bg-[#212A46] text-white'
                  }`}
                >
                  {i === 0 && phone ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <div className="pt-0.5">
                  <div className="text-sm font-semibold text-[#212A46]">{s.title}</div>
                  <p className="mt-0.5 text-[13px] text-slate-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 max-w-[520px]">
            <PhoneNumberField removeImpact="Você não conseguirá mais conversar com a Maestro pelo WhatsApp, e os avisos por WhatsApp das Notificações param." />
          </div>

          {phone && (
            <div className="mt-4 flex max-w-[520px] items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
                <WhatsappGlyph className="h-[18px] w-[18px] text-white" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-900">Tudo pronto</div>
                <p className="text-[13px] text-emerald-800/80">Mande um “oi” para a Maestro para começar.</p>
              </div>
              <button
                type="button"
                onClick={() => toast('No produto, abre a conversa com a Maestro no WhatsApp.')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1DA851] px-3.5 text-sm font-semibold text-white hover:bg-[#178a43]"
              >
                Abrir conversa <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenTools}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#212A46] hover:text-[#FF5F39]"
          >
            <ListChecks className="h-4 w-4 text-[#FF5F39]" />
            Ver o que funciona pelo WhatsApp ({MCP_COUNTS.whatsapp} de {MCP_TOTAL})
          </button>
        </div>

        <ChatPreview phone={phone} />
      </div>
    </section>
  );
}

function ChatPreview({ phone }: { phone: string | null }) {
  return (
    <figure aria-label="Exemplo de conversa com a Maestro no WhatsApp" className="w-full max-w-[360px] self-start overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex items-center gap-2.5 bg-[#075E54] px-4 py-3 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#212A46]">
          <svg width="14" height="14" viewBox="2 6 46 49" fill="none" aria-hidden>
            <path
              d="M48 6L48 38C48 43 44 47 39 47C34 47 30 43 30 38C30 33 34 29 39 29C41 29 43 30 44.5 31.5V13L20 19V46C20 51 16 55 11 55C6 55 2 51 2 46C2 41 6 37 11 37C13 37 15 38 16.5 39.5V6L48 6Z"
              fill="#FF5F39"
            />
          </svg>
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Maestro</div>
          <div className="text-[11px] text-white/70">{phone ? `falando com +55 ${formatBrPhone(phone)}` : 'conta comercial'}</div>
        </div>
      </div>
      <div className="space-y-2.5 bg-[#EFE7DE] px-3 py-4 text-[13px]">
        <Bubble me>Quais contas estão esfriando?</Bubble>
        <Bubble>
          3 contas sem interação há mais de 30 dias:
          <br />• Ambev, 42 dias
          <br />• Natura, 35 dias
          <br />• iFood, 31 dias
        </Bubble>
        <Bubble me audio />
        <Bubble>
          Entendi: cadastrar <b>Felipe Gonzalez</b>, gerente de marketing, na conta <b>Ambev</b>. Posso salvar?
        </Bubble>
        <Bubble me>Pode</Bubble>
        <Bubble>Feito ✅ O Felipe já está na conta da Ambev.</Bubble>
      </div>
      <figcaption className="bg-white px-4 py-2.5 text-center text-[11px] text-slate-400">Exemplo de conversa</figcaption>
    </figure>
  );
}

function Bubble({ me, audio, children }: { me?: boolean; audio?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 leading-snug text-slate-800 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
          me ? 'rounded-tr-sm bg-[#D9FDD3]' : 'rounded-tl-sm bg-white'
        }`}
      >
        {audio ? (
          <span className="flex items-center gap-2 py-0.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DA851]">
              <Mic className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="flex h-4 items-end gap-[2px]" aria-hidden>
              {[5, 9, 14, 8, 12, 16, 10, 6, 13, 9, 15, 7, 11, 5, 9, 12, 6, 10].map((h, i) => (
                <span key={i} className="w-[2px] rounded-full bg-slate-400" style={{ height: h }} />
              ))}
            </span>
            <span className="text-[11px] text-slate-500">0:07</span>
            <span className="sr-only">Áudio: cadastra o Felipe Gonzalez, gerente de marketing da Ambev</span>
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
