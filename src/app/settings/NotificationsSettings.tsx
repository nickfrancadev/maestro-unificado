import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowRight, Pencil, Plus } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { PhoneNumberField } from './PhoneNumberField';
import { useWhatsappNumber, formatBrPhone } from './whatsappNumber';
import { WhatsappGlyph } from './brand';

// E-mail do login. No produto vem de `user.email`, editado em Meu Perfil; aqui é fixo.
const LOGIN_EMAIL = 'ana.souza@suaempresa.com.br';

// Chaves iguais às do usuário no produto (notifications.component.ts).
type Key =
  | 'notification_touchpoint_responsible'
  | 'notification_touchpoint_overdue_24hs'
  | 'notification_touchpoint_overdue_notended'
  | 'notification_week_report';

const EVENTS: { key: Key; title: string; hint: string; whatsapp: boolean }[] = [
  {
    key: 'notification_touchpoint_responsible',
    title: 'Touchpoint atribuído a você',
    hint: 'Quando alguém te coloca como responsável por um touchpoint.',
    whatsapp: true,
  },
  {
    key: 'notification_touchpoint_overdue_24hs',
    title: 'Touchpoint vence amanhã',
    hint: 'Um lembrete 1 dia antes do prazo, para dar tempo de agir.',
    whatsapp: true,
  },
  {
    key: 'notification_touchpoint_overdue_notended',
    title: 'Touchpoint vencido sem finalização',
    hint: 'O prazo passou e o touchpoint ainda está aberto.',
    whatsapp: true,
  },
  {
    key: 'notification_week_report',
    title: 'Report semanal',
    hint: 'Resumo da semana das suas plays e contas, toda segunda-feira.',
    whatsapp: false,
  },
];

type Prefs = Record<Key, boolean>;

const REMOVE_IMPACT = 'Os avisos por WhatsApp param, e você não conseguirá mais conversar com a Maestro pelo WhatsApp.';

const switchClass =
  'h-6 w-11 data-[state=checked]:bg-[#3571DE] data-[state=unchecked]:bg-slate-200 [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[calc(100%+2px)] [&>span]:translate-x-0.5 [&>span]:shadow-sm';

export function NotificationsSettings() {
  const phone = useWhatsappNumber();

  const [email, setEmail] = useState<Prefs>({
    notification_touchpoint_responsible: true,
    notification_touchpoint_overdue_24hs: true,
    notification_touchpoint_overdue_notended: true,
    notification_week_report: true,
  });
  const [wa, setWa] = useState<Prefs>({
    notification_touchpoint_responsible: true,
    notification_touchpoint_overdue_24hs: true,
    notification_touchpoint_overdue_notended: false,
    notification_week_report: false,
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const touch = () => setSavedAt(Date.now());

  const COLS = 'grid-cols-[1fr_190px_190px]';

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <header className="flex items-start justify-between gap-6 border-b border-slate-100 px-8 pb-5 pt-7">
        <div>
          <h2 className="text-[22px] font-semibold text-[#212A46]">Notificações</h2>
          <p className="mt-1 text-sm text-slate-500">Escolha o que a Maestro te avisa e por qual canal.</p>
        </div>
        <span
          className={`mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400 transition-opacity ${savedAt ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Alterações salvas
        </span>
      </header>

      <div className="px-8 py-6">
        <div
          role="table"
          aria-label="Preferências de notificação"
          className="relative overflow-hidden rounded-xl border border-slate-200"
        >
          {/* Cabeçalho */}
          <div role="row" className={`grid ${COLS} items-center bg-slate-50/80 px-5 py-3`}>
            <div role="columnheader" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Aviso
            </div>
            <div role="columnheader" className="flex min-w-0 flex-col items-center gap-0.5 px-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#212A46]">
                <Mail className="h-4 w-4 text-[#FF5F39]" /> E-mail
              </span>
              <EmailBadge />
            </div>
            <div role="columnheader" className="flex min-w-0 flex-col items-center gap-0.5 px-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#212A46]">
                <WhatsappGlyph className="h-4 w-4 text-[#1DA851]" /> WhatsApp
              </span>
              <NumberPopover phone={phone} />
            </div>
          </div>

          {EVENTS.map((ev) => (
            <div role="row" key={ev.key} className={`grid ${COLS} items-center border-t border-slate-100 px-5 py-4`}>
              <div role="cell" className="pr-4">
                <div className="text-[15px] font-medium text-[#212A46]">{ev.title}</div>
                <div className="mt-0.5 text-[13px] text-slate-500">{ev.hint}</div>
              </div>
              <div role="cell" className="flex justify-center">
                <Switch
                  className={switchClass}
                  checked={email[ev.key]}
                  onCheckedChange={(v) => {
                    setEmail((p) => ({ ...p, [ev.key]: v }));
                    touch();
                  }}
                  aria-label={`${ev.title} por e-mail`}
                />
              </div>
              <div role="cell" className="flex justify-center">
                {ev.whatsapp ? (
                  phone ? (
                    <Switch
                      className={switchClass}
                      checked={wa[ev.key]}
                      onCheckedChange={(v) => {
                        setWa((p) => ({ ...p, [ev.key]: v }));
                        touch();
                      }}
                      aria-label={`${ev.title} por WhatsApp`}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Switch
                            className={switchClass}
                            checked={false}
                            disabled
                            aria-label={`${ev.title} por WhatsApp (cadastre um número)`}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Cadastre seu número no topo desta coluna</TooltipContent>
                    </Tooltip>
                  )
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="text-xs text-slate-300">
                        Só e-mail
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>O report semanal chega só por e-mail</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>

        <Link
          to="../mcp"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#212A46] hover:text-[#FF5F39]"
        >
          <WhatsappGlyph className="h-4 w-4 text-[#1DA851]" />
          Com o seu número, você também pode conversar com a Maestro pelo WhatsApp
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/** E-mail do login, só para conferir. Editado em Meu Perfil. */
function EmailBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="../meu-perfil"
          className="inline-flex max-w-full items-center truncate text-[11px] text-slate-500 hover:text-[#212A46]"
        >
          <span className="truncate">{LOGIN_EMAIL}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-center">
        É o e-mail do seu login, cadastrado em Meu Perfil. Para trocar, clique e vá até lá.
      </TooltipContent>
    </Tooltip>
  );
}

/** O número fica no cabeçalho da coluna do WhatsApp, editável num popover. */
function NumberPopover({ phone }: { phone: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {phone ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] text-slate-500 tabular-nums hover:bg-slate-100 hover:text-[#212A46]"
          >
            +55 {formatBrPhone(phone)} <Pencil className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            className="mt-0.5 inline-flex h-7 items-center gap-1 rounded-full bg-[#FF5F39] px-2.5 text-[11px] font-semibold text-white hover:bg-[#e94f2b]"
          >
            <Plus className="h-3 w-3" /> Cadastrar número
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-5">
        <div className="mb-1 text-sm font-semibold text-[#212A46]">
          {phone ? 'Seu WhatsApp' : 'Cadastre seu WhatsApp'}
        </div>
        <p className="mb-3 text-xs leading-snug text-slate-500">
          Os avisos marcados nesta coluna chegam neste número. Ele também serve para conversar com a Maestro pelo
          WhatsApp.
        </p>
        <PhoneNumberField compact autoFocus={!phone} removeImpact={REMOVE_IMPACT} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
