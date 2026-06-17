import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Check, Users, Sparkles, Coins, Zap, Calendar } from "lucide-react";
import { RangeCalendar } from "./RangeCalendar";
import { GastoPorPessoa } from "./GastoPorPessoa";

interface ConsumoEntry {
  id: string;
  /** ISO date-time, ex: "2026-06-16T16:21" */
  datetime: string;
  pessoa: string;
  acao: string;
  creditos: number;
}

const ORANGE = "#FF5F39";
const RED = "#B91C1C";

// Mock: histórico de consumo de IA do time
const consumoData: ConsumoEntry[] = [
  { id: "1", datetime: "2026-06-16T16:21", pessoa: "Ana Silva", acao: "Recomendação de Contato no Dossiê com IA: 1 contato", creditos: 30 },
  { id: "2", datetime: "2026-06-16T16:18", pessoa: "Carlos Mendes", acao: "Recomendação de Contato no Dossiê com IA: 1 contato", creditos: 30 },
  { id: "3", datetime: "2026-06-16T16:15", pessoa: "Ana Silva", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
  { id: "4", datetime: "2026-06-16T16:15", pessoa: "Beatriz Costa", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
  { id: "5", datetime: "2026-06-16T16:15", pessoa: "Beatriz Costa", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
  { id: "6", datetime: "2026-06-16T16:15", pessoa: "Carlos Mendes", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
  { id: "7", datetime: "2026-06-16T16:14", pessoa: "Ana Silva", acao: "Enriquecimento de Leads com ICP por Domínio de 1 domínio", creditos: 2 },
  { id: "8", datetime: "2026-06-16T15:56", pessoa: "Carlos Mendes", acao: "Recomendação de Contato no Dossiê com IA: 1 contato", creditos: 30 },
  { id: "9", datetime: "2026-06-16T15:53", pessoa: "Beatriz Costa", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
  { id: "10", datetime: "2026-06-15T11:42", pessoa: "Ana Silva", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
  { id: "11", datetime: "2026-06-14T09:30", pessoa: "Carlos Mendes", acao: "Recomendação de Contato no Dossiê com IA: 1 contato", creditos: 30 },
  { id: "12", datetime: "2026-06-10T14:05", pessoa: "Beatriz Costa", acao: "Enriquecimento de Leads com ICP por Domínio de 1 domínio", creditos: 2 },
  { id: "13", datetime: "2026-06-03T08:50", pessoa: "Ana Silva", acao: "Recomendação de Contato no Dossiê com IA: 1 contato", creditos: 30 },
  { id: "14", datetime: "2026-05-28T17:12", pessoa: "Carlos Mendes", acao: "Enriquecimento de Leads com ICP de 1 contato", creditos: 7 },
];

const equipe = Array.from(new Set(consumoData.map((e) => e.pessoa))).sort();

type Periodo = "custom" | "hoje" | "ontem" | "7d" | "30d" | "3m" | "6m";

const PERIODO_OPCOES: { id: Periodo; label: string }[] = [
  { id: "custom", label: "Personalizado" },
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
];

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "2026-06-16T16:21" -> "16 jun 2026 - 16:21" para exibição */
function formatDateTime(iso: string) {
  const [date, time] = iso.split("T");
  const [, m, d] = date.split("-");
  return `${d} ${MESES[Number(m) - 1]} ${date.slice(0, 4)} - ${time}`;
}

/** "2026-06-17" -> "May 18, 2026" (formato curto do tooltip) */
function formatRangeLabel(iso: string) {
  const EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-");
  return `${EN[Number(m) - 1]} ${Number(d)}, ${y}`;
}

/** "2026-06-17" -> "17 jun, 2026" (label curto do segmento custom aplicado) */
function formatCustomLabel(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}, ${y}`;
}

/** Data de referência fixa (mock): hoje é 17 jun 2026 */
const HOJE = "2026-06-17";

/** Subtrai dias de uma data ISO (yyyy-mm-dd), via UTC para evitar timezone. */
function subDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) - days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Subtrai meses de uma data ISO, mantendo o dia. */
function subMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 - months, d));
  return date.toISOString().slice(0, 10);
}

/** Retorna [start, end] (ISO yyyy-mm-dd) para o período selecionado. */
function rangeForPeriodo(
  periodo: Exclude<Periodo, "custom">
): [string, string] {
  switch (periodo) {
    case "hoje":
      return [HOJE, HOJE];
    case "ontem": {
      const y = subDays(HOJE, 1);
      return [y, y];
    }
    case "7d":
      return [subDays(HOJE, 6), HOJE];
    case "30d":
      return [subDays(HOJE, 29), HOJE];
    case "3m":
      return [subMonths(HOJE, 3), HOJE];
    case "6m":
      return [subMonths(HOJE, 6), HOJE];
  }
}

export function ConsumoHistorico() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [customStart, setCustomStart] = useState("2026-06-01");
  const [customEnd, setCustomEnd] = useState(HOJE);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(
    new Set(equipe)
  );
  const [peopleOpen, setPeopleOpen] = useState(false);
  const peopleRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const customRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de pessoas ao clicar fora
  useEffect(() => {
    if (!peopleOpen) return;
    const handler = (e: MouseEvent) => {
      if (peopleRef.current && !peopleRef.current.contains(e.target as Node)) {
        setPeopleOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [peopleOpen]);

  // Fecha o calendário ao clicar fora
  useEffect(() => {
    if (!calendarOpen) return;
    const handler = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calendarOpen]);

  const [rangeStart, rangeEnd] =
    periodo === "custom"
      ? [customStart, customEnd]
      : rangeForPeriodo(periodo);

  const filtered = useMemo(() => {
    return consumoData.filter((e) => {
      const day = e.datetime.split("T")[0];
      if (day < rangeStart || day > rangeEnd) return false;
      if (!selectedPeople.has(e.pessoa)) return false;
      return true;
    });
  }, [rangeStart, rangeEnd, selectedPeople]);

  const totalCreditos = filtered.reduce((sum, e) => sum + e.creditos, 0);
  const totalAcoes = filtered.length;

  // Gasto agregado por pessoa (para o gráfico de barras)
  const gastoPorPessoa = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      map.set(e.pessoa, (map.get(e.pessoa) ?? 0) + e.creditos);
    }
    return Array.from(map, ([pessoa, total]) => ({ pessoa, total }));
  }, [filtered]);

  const togglePerson = (pessoa: string) => {
    setSelectedPeople((prev) => {
      const next = new Set(prev);
      if (next.has(pessoa)) next.delete(pessoa);
      else next.add(pessoa);
      return next;
    });
  };

  const allSelected = selectedPeople.size === equipe.length;
  const peopleLabel = allSelected
    ? "Todas as pessoas"
    : selectedPeople.size === 0
    ? "Nenhuma pessoa"
    : selectedPeople.size === 1
    ? Array.from(selectedPeople)[0]
    : `${selectedPeople.size} pessoas`;

  return (
    <div
      className="bg-white rounded-xl border border-[#d8d8d8] overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      {/* Header + filtros */}
      <div className="p-6 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="flex items-center gap-2.5">
            <span
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{ width: 36, height: 36, background: "#FFF5F3" }}
            >
              <Sparkles size={18} style={{ color: ORANGE }} />
            </span>
            <span
              className="font-['Euclid_Circular_A',sans-serif]"
              style={{ fontSize: 20, fontWeight: 700, color: "#212A46" }}
            >
              Histórico de Uso - IA
            </span>
          </h2>

          {/* Total consolidado */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2.5 px-4 py-2 rounded-lg"
              style={{ background: "#FFF5F3" }}
            >
              <Coins size={22} style={{ color: ORANGE }} />
              <div className="leading-tight">
                <p
                  className="font-['Euclid_Circular_A',sans-serif] tabular-nums"
                  style={{ fontSize: 22, fontWeight: 700, color: "#212A46" }}
                >
                  {totalCreditos}
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  créditos no período
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-2.5 px-4 py-2 rounded-lg"
              style={{ background: "#F3F4F6" }}
            >
              <Zap size={22} style={{ color: "#6B7280" }} />
              <div className="leading-tight">
                <p
                  className="font-['Euclid_Circular_A',sans-serif] tabular-nums"
                  style={{ fontSize: 22, fontWeight: 700, color: "#212A46" }}
                >
                  {totalAcoes}
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  {totalAcoes === 1 ? "ação" : "ações"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Período — segmented control estilo Mixpanel */}
          <div className="relative" ref={customRef}>
            <div className="inline-flex items-center rounded-lg border border-[#d8d8d8] overflow-hidden bg-white">
              {PERIODO_OPCOES.map((opt, i) => {
                const isActive = periodo === opt.id;
                const isCustom = opt.id === "custom";
                // range exibido no tooltip deste bloquinho
                const [tipStart, tipEnd] = isCustom
                  ? [customStart, customEnd]
                  : rangeForPeriodo(opt.id);

                return (
                  <div key={opt.id} className="relative group/seg">
                    <button
                      onClick={() => {
                        if (isCustom) {
                          setPeriodo("custom");
                          setCalendarOpen((o) => !o);
                        } else {
                          setPeriodo(opt.id);
                          setCalendarOpen(false);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 font-['Euclid_Circular_A',sans-serif] transition-colors whitespace-nowrap"
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#6D5BD0" : "#6B7280",
                        background: isActive ? "#EFEDFB" : "transparent",
                        borderLeft: i === 0 ? "none" : "1px solid #ECECEF",
                      }}
                    >
                      {isCustom && <Calendar size={15} />}
                      {isCustom && periodo === "custom"
                        ? `${formatCustomLabel(customStart)} — ${formatCustomLabel(customEnd)}`
                        : opt.label}
                    </button>

                    {/* Tooltip do range deste bloquinho, exatamente acima dele */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -top-9 z-20 px-3 py-1.5 rounded-md font-['Euclid_Circular_A',sans-serif] whitespace-nowrap opacity-0 group-hover/seg:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: "#2D2D33", fontSize: 12 }}
                    >
                      <span style={{ color: "#fff", fontWeight: 600 }}>
                        {formatRangeLabel(tipStart)} – {formatRangeLabel(tipEnd)}
                      </span>{" "}
                      <span style={{ color: "#9CA3AF" }}>(GMT-3)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Popover de calendário (modo Personalizado) */}
            {periodo === "custom" && calendarOpen && (
              <div className="absolute left-0 top-full mt-2 z-30">
                <RangeCalendar
                  initialStart={customStart}
                  initialEnd={customEnd}
                  onApply={(start, end) => {
                    setCustomStart(start);
                    setCustomEnd(end);
                    setCalendarOpen(false);
                  }}
                  onCancel={() => setCalendarOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Pessoa do time (multi-seleção) */}
          <div className="relative" ref={peopleRef}>
            <button
              onClick={() => setPeopleOpen((o) => !o)}
              className="flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif] cursor-pointer transition-colors hover:bg-gray-50"
              style={{ fontSize: 13, color: "#6B7280" }}
            >
              <Users size={16} style={{ color: "#6B7280" }} />
              {peopleLabel}
              <ChevronDown size={16} style={{ color: "#6B7280" }} />
            </button>

            {peopleOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg border border-[#d8d8d8] py-1 min-w-[220px]"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
              >
                {/* Selecionar todos */}
                <button
                  onClick={() =>
                    setSelectedPeople(
                      allSelected ? new Set() : new Set(equipe)
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  style={{ fontSize: 13, color: "#212A46" }}
                >
                  <span
                    className="flex items-center justify-center rounded shrink-0"
                    style={{
                      width: 18,
                      height: 18,
                      border: `1.5px solid ${allSelected ? ORANGE : "#d8d8d8"}`,
                      background: allSelected ? ORANGE : "white",
                    }}
                  >
                    {allSelected && <Check size={12} color="white" />}
                  </span>
                  <span style={{ fontWeight: 600 }}>Todas as pessoas</span>
                </button>
                <div className="h-px bg-[#E5E7EB] my-1" />
                {equipe.map((pessoa) => {
                  const checked = selectedPeople.has(pessoa);
                  return (
                    <button
                      key={pessoa}
                      onClick={() => togglePerson(pessoa)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      style={{ fontSize: 13, color: "#212A46" }}
                    >
                      <span
                        className="flex items-center justify-center rounded shrink-0"
                        style={{
                          width: 18,
                          height: 18,
                          border: `1.5px solid ${checked ? ORANGE : "#d8d8d8"}`,
                          background: checked ? ORANGE : "white",
                        }}
                      >
                        {checked && <Check size={12} color="white" />}
                      </span>
                      {pessoa}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo: tabela (esquerda) + gráfico por pessoa (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 p-6">
      {/* Tabela — viewport de ~8 linhas com rolagem interna e cabeçalho fixo */}
      <div className="overflow-hidden bg-white rounded-xl border border-[#d8d8d8]">
        <div className="overflow-y-auto" style={{ maxHeight: 8 * 49 + 41 }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#E5E7EB]">
              {["Data", "Nome", "Ação", "Créditos"].map((col, i) => (
                <th
                  key={col}
                  className="px-5 py-3 font-['Euclid_Circular_A',sans-serif] bg-white"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    textAlign: i === 3 ? "right" : "left",
                    whiteSpace: "nowrap",
                    boxShadow: "inset 0 -1px 0 #E5E7EB",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 14, color: "#9CA3AF" }}
                >
                  Nenhum consumo no período / pessoas selecionadas.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[#F1F1F4] hover:bg-[#FAFAFA] transition-colors"
                >
                  <td
                    className="px-5 py-4 font-['Euclid_Circular_A',sans-serif]"
                    style={{ fontSize: 13, fontWeight: 600, color: "#212A46", whiteSpace: "nowrap" }}
                  >
                    {formatDateTime(entry.datetime)}
                  </td>
                  <td
                    className="px-5 py-4 font-['Euclid_Circular_A',sans-serif]"
                    style={{ fontSize: 13, color: "#212A46", whiteSpace: "nowrap" }}
                  >
                    {entry.pessoa}
                  </td>
                  <td
                    className="px-5 py-4 font-['Euclid_Circular_A',sans-serif]"
                    style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
                  >
                    {entry.acao}
                  </td>
                  <td
                    className="px-5 py-4 font-['Euclid_Circular_A',sans-serif] tabular-nums text-right"
                    style={{ fontSize: 13, fontWeight: 700, color: RED, whiteSpace: "nowrap" }}
                  >
                    - {entry.creditos}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

        {/* Gráfico de barras: gasto por pessoa */}
        <GastoPorPessoa data={gastoPorPessoa} totalGeral={totalCreditos} />
      </div>
    </div>
  );
}
