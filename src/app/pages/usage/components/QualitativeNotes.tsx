/**
 * Área de inputs qualitativos (feedback Bernardo): o que a call disse e o
 * número não mostra. Lista + formulário; persistência via `lib/notes`
 * (localStorage, protótipo). As ações disparadas pelo botão do card também
 * caem aqui (`kind: 'action'`) — playbook e registro fecham o mesmo ciclo.
 */
import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { formatDaysAgo } from '../lib/format';
import {
  NOTE_KIND_LABEL,
  addNote,
  loadNotes,
  type QualiNote,
  type QualiNoteKind,
} from '../lib/notes';

const NAVY = '#212A46';
const MUTED = '#64748B';
const GRID = '#E2E8F0';
const ORANGE = '#FF5F39';

/** Tipos ofertados no formulário — 'action' só nasce do botão do card. */
const FORM_KINDS: QualiNoteKind[] = ['call', 'email', 'nps', 'risk', 'other'];

interface QualitativeNotesProps {
  companyId: string;
}

function KindChip({ kind }: { kind: QualiNoteKind }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 leading-none whitespace-nowrap"
      style={{ fontSize: 11, fontWeight: 500, color: MUTED, borderColor: '#CBD5E1', background: '#F8FAFC' }}
    >
      {NOTE_KIND_LABEL[kind]}
    </span>
  );
}

export function QualitativeNotes({ companyId }: QualitativeNotesProps) {
  const [notes, setNotes] = useState<QualiNote[]>(() => loadNotes(companyId));
  const [kind, setKind] = useState<QualiNoteKind>('call');
  const [text, setText] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setNotes(addNote(companyId, { author: 'Você', kind, text: trimmed }));
    setText('');
  }

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="mb-4 flex items-start gap-2">
        <MessageSquarePlus size={16} style={{ color: NAVY }} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
            Inputs qualitativos
          </h3>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            O contexto que os números não capturam — calls, verbatims, percepção de risco
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`quali-kind-${companyId}`}
            style={{ fontSize: 12, fontWeight: 600, color: MUTED }}
          >
            Tipo
          </label>
          <select
            id={`quali-kind-${companyId}`}
            value={kind}
            onChange={(e) => setKind(e.target.value as QualiNoteKind)}
            className="rounded-lg border border-[#d8d8d8] bg-white px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
            style={{ fontSize: 12, color: NAVY }}
          >
            {FORM_KINDS.map((k) => (
              <option key={k} value={k}>
                {NOTE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>

        <label htmlFor={`quali-text-${companyId}`} className="sr-only">
          Nova anotação qualitativa
        </label>
        <textarea
          id={`quali-text-${companyId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Ex.: na call de ontem o sponsor mencionou corte de orçamento no Q4…"
          className="w-full rounded-lg border border-[#d8d8d8] bg-white px-3 py-2 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
          style={{ fontSize: 13, color: NAVY }}
        />
        <div>
          <button
            type="submit"
            disabled={text.trim().length === 0}
            className="rounded-lg px-3 py-1.5 text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] focus-visible:ring-offset-2"
            style={{ background: ORANGE, fontSize: 12, fontWeight: 600 }}
          >
            Salvar anotação
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: MUTED }}>
          Nenhuma anotação ainda — a primeira call é um bom começo.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {notes.map((n) => (
            <li
              key={n.id}
              className="border-t py-2.5 flex flex-col gap-1"
              style={{ borderColor: GRID }}
            >
              <div className="flex items-center gap-2">
                <KindChip kind={n.kind} />
                <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{n.author}</span>
                <span className="tabular-nums" style={{ fontSize: 11, color: MUTED }}>
                  {formatDaysAgo(new Date(n.at))}
                </span>
              </div>
              <p style={{ fontSize: 13, color: NAVY }}>{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
