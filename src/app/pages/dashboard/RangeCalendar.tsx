import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ORANGE = "#FF5F39";
const ORANGE_SOFT = "#FFE9E3";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface RangeCalendarProps {
  initialStart: string; // yyyy-mm-dd
  initialEnd: string;
  onApply: (start: string, end: string) => void;
  onCancel: () => void;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function firstWeekday(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

export function RangeCalendar({
  initialStart,
  initialEnd,
  onApply,
  onCancel,
}: RangeCalendarProps) {
  const [start, setStart] = useState<string | null>(initialStart);
  const [end, setEnd] = useState<string | null>(initialEnd);
  // mês exibido: parte do início selecionado
  const [viewY, setViewY] = useState(Number(initialStart.slice(0, 4)));
  const [viewM, setViewM] = useState(Number(initialStart.slice(5, 7)) - 1);

  const handleDayClick = (iso: string) => {
    // Se não há início, ou já existe um range completo, recomeça a seleção
    if (!start || (start && end)) {
      setStart(iso);
      setEnd(null);
      return;
    }
    // Há início mas não fim
    if (iso < start) {
      setEnd(start);
      setStart(iso);
    } else {
      setEnd(iso);
    }
  };

  const prevMonth = () => {
    if (viewM === 0) {
      setViewM(11);
      setViewY((y) => y - 1);
    } else {
      setViewM((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewM === 11) {
      setViewM(0);
      setViewY((y) => y + 1);
    } else {
      setViewM((m) => m + 1);
    }
  };

  const total = daysInMonth(viewY, viewM);
  const offset = firstWeekday(viewY, viewM);
  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => toISO(viewY, viewM, i + 1)),
  ];

  const rangeEnd = end ?? start;

  return (
    <div
      className="bg-white rounded-xl border border-[#d8d8d8] p-4"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 300 }}
    >
      {/* Navegação de mês */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} style={{ color: "#6B7280" }} />
        </button>
        <span
          className="font-['Euclid_Circular_A',sans-serif]"
          style={{ fontSize: 14, fontWeight: 600, color: "#212A46" }}
        >
          {MONTH_NAMES[viewM]} {viewY}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} style={{ color: "#6B7280" }} />
        </button>
      </div>

      {/* Cabeçalho de dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center font-['Euclid_Circular_A',sans-serif]"
            style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`empty-${i}`} />;
          const isStart = iso === start;
          const isEnd = iso === rangeEnd;
          const inRange =
            start && rangeEnd && iso >= start && iso <= rangeEnd;
          const isEndpoint = isStart || isEnd;

          return (
            <button
              key={iso}
              onClick={() => handleDayClick(iso)}
              className="aspect-square flex items-center justify-center font-['Euclid_Circular_A',sans-serif] transition-colors"
              style={{
                fontSize: 13,
                borderRadius: isEndpoint ? 8 : 6,
                fontWeight: isEndpoint ? 700 : 400,
                color: isEndpoint ? "white" : inRange ? "#212A46" : "#4B5563",
                background: isEndpoint
                  ? ORANGE
                  : inRange
                  ? ORANGE_SOFT
                  : "transparent",
              }}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#E5E7EB]">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg font-['Euclid_Circular_A',sans-serif] transition-colors hover:bg-gray-100"
          style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}
        >
          Cancelar
        </button>
        <button
          disabled={!start}
          onClick={() => start && onApply(start, end ?? start)}
          className="px-4 py-1.5 rounded-lg font-['Euclid_Circular_A',sans-serif] transition-opacity"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            background: ORANGE,
            opacity: start ? 1 : 0.5,
            cursor: start ? "pointer" : "not-allowed",
          }}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
