import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  useWhatsappNumber,
  setWhatsappNumber,
  onlyDigits,
  isValidBrPhone,
  formatBrPhone,
} from './whatsappNumber';
import { WhatsappGlyph } from './brand';

interface Props {
  /** Texto do aviso de remoção: o que deixa de funcionar sem o número. */
  removeImpact: string;
  /** Sem rótulo, sem Cancelar e com confirmação de remoção embutida: para popover. */
  compact?: boolean;
  autoFocus?: boolean;
  onDone?: () => void;
}

export function PhoneNumberField({ removeImpact, compact = false, autoFocus = false, onDone }: Props) {
  const saved = useWhatsappNumber();
  const [editing, setEditing] = useState(!saved);
  const [value, setValue] = useState(saved ? formatBrPhone(saved) : '');
  const [touched, setTouched] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Outra tela (Notificações ↔ MCP) pode ter mudado o número.
  useEffect(() => {
    setEditing(!saved);
    setValue(saved ? formatBrPhone(saved) : '');
    setTouched(false);
  }, [saved]);

  const digits = onlyDigits(value);
  const valid = isValidBrPhone(digits);
  const showError = touched && digits.length > 0 && !valid;

  const save = () => {
    setTouched(true);
    if (!valid) return;
    setWhatsappNumber(digits);
    toast.success(saved ? 'Número atualizado' : 'Número salvo');
    onDone?.();
  };

  const startEdit = () => {
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  if (saved && !editing) {
    return (
      <>
        <div
          className={`flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 ${compact ? 'flex-wrap items-center' : 'items-center'}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
            <WhatsappGlyph className="h-[18px] w-[18px] text-[#1DA851]" />
          </span>
          <div className={compact ? 'min-w-0 flex-1 basis-[150px]' : 'min-w-0 flex-1'}>
            <div className="whitespace-nowrap text-[15px] font-semibold text-[#212A46] tabular-nums">+55 {formatBrPhone(saved)}</div>
            {!compact && <div className="text-xs text-slate-400">Usado nos avisos e na conversa com a Maestro</div>}
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Pencil className="h-4 w-4" /> Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Remover
          </button>
        </div>

        {/* Dentro de um popover, um diálogo em portal fecharia o popover: confirma ali mesmo. */}
        {compact && confirmRemove && (
          <div role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[13px] font-semibold text-red-800">Remover seu número?</p>
            <p className="mt-0.5 text-xs text-red-700/80">{removeImpact}</p>
            <div className="mt-2.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="h-8 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setWhatsappNumber(null);
                  toast('Número removido');
                  onDone?.();
                }}
                className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
              >
                Remover número
              </button>
            </div>
          </div>
        )}

        <AlertDialog open={!compact && confirmRemove} onOpenChange={setConfirmRemove}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover seu número?</AlertDialogTitle>
              <AlertDialogDescription>{removeImpact} Você pode cadastrar de novo quando quiser.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setWhatsappNumber(null);
                  toast('Número removido');
                  onDone?.();
                }}
              >
                Remover número
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label
        htmlFor="wa-number"
        className={compact ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-[#212A46]'}
      >
        Número do WhatsApp
      </label>
      <div className="flex gap-2">
        <div
          className={`flex h-11 min-w-0 items-center flex-1 rounded-lg border bg-white transition-colors focus-within:ring-2 ${
            showError
              ? 'border-red-300 focus-within:ring-red-100'
              : 'border-slate-200 focus-within:border-[#212A46]/40 focus-within:ring-[#212A46]/10'
          }`}
        >
          <span className="flex h-full items-center gap-1.5 border-r border-slate-200 px-3 text-sm text-slate-500">
            <span aria-hidden>🇧🇷</span> +55
          </span>
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            id="wa-number"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 91234-5678"
            value={value}
            onChange={(e) => setValue(formatBrPhone(onlyDigits(e.target.value)))}
            onBlur={() => setTouched(true)}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[#212A46] tabular-nums outline-none placeholder:text-slate-300"
            aria-invalid={showError}
            aria-describedby="wa-number-help"
          />
        </div>
        <button
          type="submit"
          disabled={!digits}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#212A46] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2d3960] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Salvar
        </button>
        {saved && !compact && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
        )}
      </div>
      <p id="wa-number-help" className={`mt-1.5 text-xs ${showError ? 'text-red-600' : 'text-slate-400'}`}>
        {showError ? 'Confira o número: DDD + celular, com 10 ou 11 dígitos.' : 'Use o celular com WhatsApp, com DDD.'}
      </p>
    </form>
  );
}
