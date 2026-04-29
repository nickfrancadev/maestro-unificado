import { useState, useMemo } from "react";
import {
  Building2,
  Users,
  Play,
  TrendingUp,
  Calendar,
  Target,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  XCircle,
  Cake,
  Mail,
  Phone,
  MessageSquare,
  Plus,
  ChevronRight,
  CalendarDays,
  CalendarClock,
  X,
  FileText,
  Copy,
  Edit3,
  Archive,
  ClipboardCheck,
  MessageCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

type TaskStatus = "overdue" | "pending" | "scheduled" | "done";
type TaskPriority = "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  account: string;
  type: string;
  time: string;
  priority: TaskPriority;
  status: TaskStatus;
  contact?: string;
  contactRole?: string;
  notes?: string;
  goal?: string;
  channel?: string;
}

/* ─── Touchpoint Drawer ─── */
function TouchpointDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionedContacts, setMentionedContacts] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [executionDate, setExecutionDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [channel, setChannel] = useState(task.channel || "Email");
  const [weight, setWeight] = useState("Médio");

  const isTask = task.type === "Interno";

  const availableContacts = [
    { id: "1", name: "João Silva", initials: "JS", color: "#4a90e2" },
    { id: "2", name: "Maria Santos", initials: "MS", color: "#ff9b83" },
    { id: "3", name: "Pedro Oliveira", initials: "PO", color: "#81c784" },
    { id: "4", name: "Ana Costa", initials: "AC", color: "#ba68c8" },
    { id: "5", name: "Carlos Mendes", initials: "CM", color: "#ff7043" },
  ];

  const filteredContacts = availableContacts.filter(c =>
    c.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNoteText(text);
    setCursorPosition(cursorPos);
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1) {
      const afterAt = textBeforeCursor.slice(lastAt + 1);
      if (!afterAt.includes(" ")) {
        setMentionSearch(afterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleSelectContact = (contact: typeof availableContacts[0]) => {
    const before = noteText.slice(0, cursorPosition);
    const after = noteText.slice(cursorPosition);
    const lastAt = before.lastIndexOf("@");
    setNoteText(noteText.slice(0, lastAt) + `@${contact.name} ` + after);
    setShowMentionDropdown(false);
    setMentionSearch("");
    if (!mentionedContacts.includes(contact.id)) {
      setMentionedContacts([...mentionedContacts, contact.id]);
    }
  };

  const typeStyle = isTask
    ? { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]", iconBg: "bg-[#81c784]" }
    : task.status === "overdue"
    ? { bg: "bg-[#ff9b83]", text: "text-white", iconBg: "bg-[#ff9b83]" }
    : { bg: "bg-[#c8e6c9]", text: "text-[#2e7d32]", iconBg: "bg-[#4a90e2]" };

  const mockSubtasks = [
    { id: "s1", title: "Preparar apresentação de slides", completed: true },
    { id: "s2", title: "Confirmar presença dos participantes", completed: false },
    { id: "s3", title: "Enviar agenda com antecedência", completed: false },
  ];

  const mockAttachments = [
    { id: "a1", name: "Proposta_Comercial_Q1.pdf", addedAt: "Adicionado em 18 Abr" },
  ];

  const mockInteractions = [
    { selected: true, name: task.contact || "Ana Costa", role: task.contactRole || "Head de Marketing", buyingFunction: "Influenciador" },
    { selected: false, name: "Roberto Maia", role: "VP Jurídico", buyingFunction: "Decisor" },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.18)" }} onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col" style={{ width: 806, background: "#edf2f5", boxShadow: "-4px 0 32px rgba(0,0,0,0.14)" }}>

        {/* Top bar — matches TouchpointDetails */}
        <div className="flex items-center justify-between px-6 py-3.5 flex-shrink-0" style={{ background: "#212a46" }}>
          <div className="flex items-center gap-2">
            <h2 className="text-white text-base font-bold">Em andamento</h2>
            {!isExpanded && <span className="text-xs text-white/60">(colapsado)</span>}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-white rounded text-white text-xs hover:bg-white/10 transition-colors">
              <Play className="w-3.5 h-3.5" />
              <span className="font-bold">Ir para a Play</span>
            </button>
            <button onClick={onClose} className="flex items-center justify-center rounded hover:bg-white/10 transition-colors ml-1" style={{ width: 28, height: 28 }}>
              <X size={16} style={{ color: "white" }} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ── Main details card ── */}
          <div className="bg-white rounded-lg p-4">
            {/* Header — always visible */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
              <button
                onClick={() => setIsExpanded(v => !v)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0 group"
                title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
              >
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform duration-300 group-hover:text-gray-900 ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div className={`w-[60px] h-[60px] ${typeStyle.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                {isTask
                  ? <ClipboardCheck className="w-8 h-8 text-white" strokeWidth={2} />
                  : <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
                }
              </div>

              <div className="flex-1">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold mb-1.5 ${typeStyle.bg} ${typeStyle.text}`}>
                  {isTask ? (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <path d="M9 14l2 2 4-4" />
                      </svg>
                      TAREFA INTERNA
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {task.type.toUpperCase()}
                    </>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#212a46]">{task.title}</h3>
              </div>

              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>

              {!isTask && (
                <div className="text-center flex-shrink-0 ml-2 px-2 py-1">
                  <div className="text-2xl font-bold text-[#212a46]">72</div>
                  <div className="text-[9px] text-gray-500">Score do Touch</div>
                </div>
              )}
            </div>

            {/* Expandable content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>

              {/* Descrição */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#212a46]">Descrição</h4>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffece4] text-black rounded text-xs font-bold hover:bg-[#ffd7c4] transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Pedir para A.I escrever
                  </button>
                </div>
                <div className="bg-[#f8faff] rounded-lg p-3 border-2 border-[#ebf0fc]">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {task.goal || `Touchpoint de ${task.type.toLowerCase()} com ${task.account}. Objetivo: avançar o relacionamento, identificar necessidades e alinhar próximos passos comerciais com o contato ${task.contact || "principal"}.`}
                  </p>
                </div>
              </div>

              {/* Subtarefas */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#212a46] mb-3">Subtarefas</h4>
                {mockSubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 mb-2">
                    <input type="checkbox" defaultChecked={subtask.completed} className="w-3.5 h-3.5 rounded border-gray-300" />
                    <span className={`text-sm ${subtask.completed ? "line-through text-gray-500" : "text-gray-800"}`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Nova subtarefa
                </button>
              </div>

              {/* Anexos */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#212a46] mb-3">📎 Anexos</h4>
                {mockAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg mb-2">
                    <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-xs text-gray-900">{att.name}</div>
                      <div className="text-[10px] text-gray-500">{att.addedAt}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">Evoluir</button>
                      <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">Download</button>
                    </div>
                  </div>
                ))}
                <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Adicionar um anexo</button>
              </div>

              {/* Notas e Histórico */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#212a46] mb-3">📝 Notas e Histórico</h4>
                <div className="space-y-2 mb-3">
                  {[
                    { initials: "JD", color: "#4a90e2", name: "João Silva", time: "Hoje às 14:30", text: "Cliente demonstrou interesse no produto premium. Agendada reunião de apresentação para próxima semana." },
                    { initials: "MS", color: "#ff9b83", name: "Maria Santos", time: "Ontem às 16:45", text: "Primeiro contato realizado via LinkedIn. Prospect abriu a mensagem mas ainda não respondeu." },
                  ].map((note, i) => (
                    <div key={i} className="bg-[#f8faff] rounded-lg p-3 border border-[#e3ecf7]">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold" style={{ backgroundColor: note.color }}>{note.initials}</div>
                          <span className="text-xs font-bold text-[#212a46]">{note.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{note.time}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
                {/* Add note */}
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#4a90e2] transition-colors">
                  <textarea
                    placeholder="Adicionar uma nova nota sobre esta ação... (use @ para mencionar contatos)"
                    className="w-full text-xs text-gray-800 bg-transparent border-none outline-none resize-none"
                    rows={3}
                    value={noteText}
                    onChange={handleNoteChange}
                  />
                  {showMentionDropdown && filteredContacts.length > 0 && (
                    <div className="absolute left-3 right-3 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button key={contact.id} onClick={() => handleSelectContact(contact)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f0f7ff] transition-colors text-left">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0" style={{ backgroundColor: contact.color }}>{contact.initials}</div>
                          <span className="text-xs text-gray-800">{contact.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {mentionedContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200">
                      <span className="text-[10px] text-gray-500 font-bold">MENCIONADOS:</span>
                      {mentionedContacts.map((cid) => {
                        const c = availableContacts.find(x => x.id === cid);
                        if (!c) return null;
                        return (
                          <div key={cid} className="flex items-center gap-1 px-2 py-0.5 bg-[#e3f2fd] rounded-full">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: c.color }}>{c.initials}</div>
                            <span className="text-[10px] text-[#212a46] font-medium">{c.name}</span>
                            <button onClick={() => setMentionedContacts(mentionedContacts.filter(id => id !== cid))} className="text-gray-500 hover:text-gray-700 text-xs">×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <span className="text-[10px] text-gray-500">💡 Use @ para mencionar contatos</span>
                    <button className="px-3 py-1.5 bg-[#4a90e2] text-white rounded text-xs font-bold hover:bg-[#3571de] transition-colors">Adicionar Nota</button>
                  </div>
                </div>
              </div>

              {/* Orçamento */}
              <div className="mb-0">
                <h4 className="text-sm font-bold text-[#212a46] mb-3">💰 Orçamento</h4>
                <div className="bg-[#fff8e1] rounded-lg p-3 border border-[#f5e8c8]">
                  <div className="text-[9px] text-gray-600 font-bold mb-1">ORÇAMENTO TOUCH</div>
                  <div className="text-xl font-bold text-[#212a46]">R$ 0,00</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Action buttons card ── */}
          <div className="bg-white rounded-lg p-4">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">DATA DE EXECUÇÃO</div>
                <input type="date" value={executionDate} onChange={e => setExecutionDate(e.target.value)} className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 bg-[#5cb85c] text-white rounded font-bold text-[11px] hover:bg-[#4cae4c] transition-colors">
                  {isTask ? "TAREFA EXECUTADA" : "TOUCHPOINT EXECUTADO"}
                </button>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">DATA DE FINALIZAÇÃO</div>
                <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 bg-[#3571de] text-white rounded font-bold text-[11px] hover:bg-[#2557b8] transition-colors">
                  {isTask ? "CONCLUIR TAREFA" : "CONCLUIR TOUCHPOINT"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {!isTask ? (
                <div>
                  <div className="text-[9px] text-gray-500 font-bold mb-2">CANAL</div>
                  <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>LinkedIn</option>
                    <option>Email</option>
                    <option>Telefone</option>
                    <option>WhatsApp</option>
                    <option>Presencial</option>
                  </select>
                </div>
              ) : (
                <div>
                  <div className="text-[9px] text-gray-500 font-bold mb-2">DEPENDÊNCIAS</div>
                  <select className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>1 de 3 selecionadas</option>
                  </select>
                </div>
              )}
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">RESPONSÁVEIS</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#ff9b83] flex items-center justify-center text-[10px] text-white font-bold">JS</div>
                  <button className="p-1 hover:bg-gray-100 rounded"><Plus className="w-4 h-4 text-gray-600" /></button>
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">PESO</div>
                <select value={weight} onChange={e => setWeight(e.target.value)} className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Muito Baixo</option>
                  <option>Baixo</option>
                  <option>Médio</option>
                  <option>Acima da média</option>
                  <option>Alto</option>
                  <option>Muito Alto</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Interações dos Contatos ── */}
          {!isTask && (
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[#212a46]">Interações dos Contatos</h4>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4a90e2] border border-[#4a90e2] rounded hover:bg-[#4a90e2] hover:text-white transition-colors font-medium">
                  <Edit3 className="w-3 h-3" /> Editar contatos
                </button>
              </div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left pb-2 pr-3 text-[9px] text-gray-500 font-bold w-8">INTEGRAÇÃO</th>
                      <th className="text-left pb-2 px-3 text-[9px] text-gray-500 font-bold">NOME</th>
                      <th className="text-left pb-2 px-3 text-[9px] text-gray-500 font-bold">CARGO</th>
                      <th className="text-left pb-2 px-3 text-[9px] text-gray-500 font-bold">FUNÇÃO DE COMPRA</th>
                      <th className="text-left pb-2 pl-3 text-[9px] text-gray-500 font-bold">TIMING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockInteractions.map((interaction, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-3">
                          <input type="checkbox" defaultChecked={interaction.selected} className="w-3.5 h-3.5 rounded border-gray-300" />
                        </td>
                        <td className="py-2 px-3 font-medium text-gray-900">{interaction.name}</td>
                        <td className="py-2 px-3 text-gray-700">{interaction.role}</td>
                        <td className="py-2 px-3">
                          <select defaultValue={interaction.buyingFunction} className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option>Influenciador</option>
                            <option>Decisor</option>
                            <option>Patrocinador</option>
                          </select>
                        </td>
                        <td className="py-2 pl-3">
                          <select className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option>Aguardando</option>
                            <option>Em andamento</option>
                            <option>Concluído</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="w-full py-2.5 bg-[#5cb85c] text-white rounded-lg font-bold text-sm hover:bg-[#4cae4c] transition-colors">
                Salvar alterações
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── HomePage ─── */
export function HomePage() {
  const [taskTab, setTaskTab] = useState<"hoje" | "semana" | "futuro">("hoje");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const engagementData = useMemo(() => [
    { id: "seg", name: "Seg", value: 45 },
    { id: "ter", name: "Ter", value: 52 },
    { id: "qua", name: "Qua", value: 48 },
    { id: "qui", name: "Qui", value: 68 },
    { id: "sex", name: "Sex", value: 71 },
    { id: "sab", name: "Sáb", value: 35 },
    { id: "dom", name: "Dom", value: 28 },
  ], []);

  const conversionData = useMemo(() => [
    { id: "lead", name: "Lead", value: 127 },
    { id: "qualificado", name: "Qualificado", value: 89 },
    { id: "proposta", name: "Proposta", value: 45 },
    { id: "negociacao", name: "Negociação", value: 23 },
    { id: "fechado", name: "Fechado", value: 12 },
  ], []);

  const touchpointData = useMemo(() => [
    { id: "email", name: "Email", value: 45, color: "#FF5F39" },
    { id: "linkedin", name: "LinkedIn", value: 32, color: "#0A66C2" },
    { id: "telefone", name: "Telefone", value: 18, color: "#10B981" },
    { id: "whatsapp", name: "WhatsApp", value: 28, color: "#25D366" },
  ], []);

  const statsCards = [
    { label: "Total de Contas", value: "127", icon: Building2, change: "+12%", trend: "up", comparison: "vs. mês passado" },
    { label: "Contatos Ativos", value: "1,842", icon: Users, change: "+8%", trend: "up", comparison: "vs. mês passado" },
    { label: "Plays Ativas", value: "34", icon: Play, change: "+5", trend: "up", comparison: "vs. mês passado" },
    { label: "Oportunidades", value: "R$ 2.4M", icon: Target, change: "+22%", trend: "up", comparison: "vs. mês passado" },
  ];

  const touchpointStats = [
    { label: "Touchpoints Criados", value: "1,247", icon: Plus, change: "+156", trend: "up", comparison: "este mês", color: "#3B82F6", bgColor: "#EFF6FF" },
    { label: "Executados", value: "892", icon: CheckCircle2, change: "71.5%", trend: "up", comparison: "taxa de execução", color: "#10B981", bgColor: "#F0FDF4" },
    { label: "Em Atraso", value: "43", icon: XCircle, change: "-12", trend: "down", comparison: "vs. semana passada", color: "#EF4444", bgColor: "#FEF2F2" },
    { label: "Programados", value: "312", icon: Clock, change: "+89", trend: "up", comparison: "próximos 7 dias", color: "#F59E0B", bgColor: "#FFFBEB" },
  ];

  const todayTasks: Task[] = [
    { id: "t1", title: "Follow-up Natura — Proposta Q1", account: "Natura", type: "Reunião", time: "14:00", priority: "high", status: "pending", contact: "Carlos Silva", contactRole: "CEO", channel: "Zoom" },
    { id: "t2", title: "Enviar contrato Magazine Luiza", account: "Magazine Luiza", type: "Documento", time: "16:00", priority: "high", status: "pending", contact: "Maria Santos", contactRole: "CMO", channel: "Email" },
    { id: "t3", title: "Reativar conta Stone (30 dias sem contato)", account: "Stone", type: "Outreach", time: "Atrasado 2 dias", priority: "high", status: "overdue", contact: "Rafael Torres", contactRole: "VP Sales", channel: "LinkedIn" },
    { id: "t4", title: "Demo de produto para iFood", account: "iFood", type: "Reunião", time: "11:00", priority: "medium", status: "pending", contact: "Fernanda Lima", contactRole: "Head de Produto", channel: "Google Meet" },
    { id: "t5", title: "Email de check-in — Ambev", account: "Ambev", type: "Email", time: "Atrasado 1 dia", priority: "medium", status: "overdue", contact: "João Faria", contactRole: "Diretor Comercial", channel: "Email" },
    { id: "t6", title: "Atualizar CRM com dados da call", account: "Bradesco", type: "Interno", time: "09:00", priority: "low", status: "pending", contact: "—", contactRole: "—", channel: "Interno" },
  ];

  const weekTasks: Task[] = [
    { id: "w1", title: "Call de descoberta — Nubank", account: "Nubank", type: "Reunião", time: "Amanhã, 10:00", priority: "medium", status: "scheduled", contact: "Ana Costa", contactRole: "Head de Parcerias", channel: "Zoom" },
    { id: "w2", title: "Review de proposta comercial BTG", account: "BTG Pactual", type: "Documento", time: "Quarta, 15:00", priority: "high", status: "scheduled", contact: "Pedro Alves", contactRole: "CFO", channel: "Email" },
    { id: "w3", title: "LinkedIn touch — Banco Inter", account: "Banco Inter", type: "Social", time: "Quinta, 09:00", priority: "low", status: "scheduled", contact: "Camila Ramos", contactRole: "Gerente de TI", channel: "LinkedIn" },
    { id: "w4", title: "Renovação de contrato — Itaú", account: "Itaú", type: "Documento", time: "Sexta, 17:00", priority: "high", status: "scheduled", contact: "Roberto Maia", contactRole: "VP Jurídico", channel: "Email" },
    { id: "w5", title: "Apresentação de QBR — Vivo", account: "Vivo", type: "Reunião", time: "Quinta, 14:00", priority: "medium", status: "scheduled", contact: "Luciana Braz", contactRole: "Diretora de Marketing", channel: "Presencial" },
    { id: "w6", title: "Sequência de email — PagSeguro", account: "PagSeguro", type: "Email", time: "Quarta, 08:00", priority: "medium", status: "scheduled", contact: "Marcos Pinto", contactRole: "Head de Growth", channel: "Email" },
  ];

  const futureTasks: Task[] = [
    { id: "f1", title: "Quarterly Business Review — Ambev", account: "Ambev", type: "Reunião", time: "20 Abr", priority: "high", status: "scheduled", contact: "João Faria", contactRole: "Diretor Comercial", channel: "Presencial" },
    { id: "f2", title: "Lançamento campanha awareness — Vivo", account: "Vivo", type: "Marketing", time: "25 Abr", priority: "medium", status: "scheduled", contact: "Luciana Braz", contactRole: "Diretora de Marketing", channel: "Email" },
    { id: "f3", title: "Onboarding novo contato — Bradesco", account: "Bradesco", type: "Onboarding", time: "1 Mai", priority: "medium", status: "scheduled", contact: "Thiago Neves", contactRole: "Analista Sênior", channel: "Zoom" },
    { id: "f4", title: "Renovação anual — Localiza", account: "Localiza", type: "Contrato", time: "5 Mai", priority: "high", status: "scheduled", contact: "Sandra Freitas", contactRole: "Gerente de Frota", channel: "Email" },
    { id: "f5", title: "Expansão de conta — Magazine Luiza", account: "Magazine Luiza", type: "Reunião", time: "12 Mai", priority: "low", status: "scheduled", contact: "Maria Santos", contactRole: "CMO", channel: "Google Meet" },
  ];

  const tasksByTab: Record<string, Task[]> = { hoje: todayTasks, semana: weekTasks, futuro: futureTasks };
  const currentTasks = tasksByTab[taskTab];
  const overdueCount = todayTasks.filter(t => t.status === "overdue").length;

  const needsAttention = [
    { name: "iFood", reason: "Sem interação há 45 dias", contacts: 19, lastValue: "R$ 180K", healthScore: 35 },
    { name: "PagSeguro", reason: "Email bounce - atualizar contatos", contacts: 12, lastValue: "R$ 95K", healthScore: 45 },
    { name: "Localiza", reason: "Play pausada há 15 dias", contacts: 8, lastValue: "R$ 210K", healthScore: 50 },
  ];

  const birthdays = [
    { name: "Carlos Silva", company: "Natura", position: "CEO", date: "Hoje" },
    { name: "Maria Santos", company: "Magazine Luiza", position: "CMO", date: "Amanhã" },
    { name: "João Oliveira", company: "Nubank", position: "VP Sales", date: "15 Mar" },
  ];

  const recentActivity = [
    { type: "email", text: "Email aberto por Ana Costa (Natura)", time: "5 min atrás", status: "success" },
    { type: "meeting", text: "Reunião concluída com Magazine Luiza", time: "1h atrás", status: "success" },
    { type: "call", text: "Chamada perdida de Roberto (iFood)", time: "2h atrás", status: "warning" },
    { type: "message", text: "Nova mensagem no LinkedIn - Nubank", time: "3h atrás", status: "info" },
  ];

  const getHealthColor = (score: number) => {
    if (score >= 70) return "#10B981";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const getPriorityColor = (priority: TaskPriority) => {
    if (priority === "high") return "#EF4444";
    if (priority === "medium") return "#F59E0B";
    return "#6B7280";
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    if (priority === "high") return "Alta";
    if (priority === "medium") return "Média";
    return "Baixa";
  };

  const getStatusIcon = (status: TaskStatus) => {
    if (status === "overdue") return <XCircle size={16} style={{ color: "#EF4444" }} />;
    if (status === "pending") return <Clock size={16} style={{ color: "#F59E0B" }} />;
    return <CheckCircle2 size={16} style={{ color: "#10B981" }} />;
  };

  const tabConfig = [
    {
      key: "hoje" as const,
      label: "Hoje",
      icon: <AlertCircle size={15} />,
      count: todayTasks.length,
      badge: overdueCount > 0 ? `${overdueCount} atrasada${overdueCount > 1 ? "s" : ""}` : null,
      badgeColor: "#EF4444",
      badgeBg: "#FEE2E2",
      activeColor: "#FF5F39",
    },
    {
      key: "semana" as const,
      label: "Esta Semana",
      icon: <CalendarDays size={15} />,
      count: weekTasks.length,
      badge: null,
      activeColor: "#3B82F6",
    },
    {
      key: "futuro" as const,
      label: "Futuro",
      icon: <CalendarClock size={15} />,
      count: futureTasks.length,
      badge: null,
      activeColor: "#8B5CF6",
    },
  ];

  const activeTabConfig = tabConfig.find(t => t.key === taskTab)!;

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#EEF0F5" }}>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-['Euclid_Circular_A',sans-serif] mb-1" style={{ fontSize: 28, fontWeight: 600, color: "#212A46" }}>
            Bem-vindo de volta, Vinicius! 👋
          </h1>
          <p className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 14, color: "#828282" }}>
            Quarta-feira, 22 de Abril de 2026 • Aqui está seu resumo do dia
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-5 border border-[#d8d8d8]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: "#FFF5F3" }}>
                  <stat.icon size={20} style={{ color: "#FF5F39" }} />
                </div>
                <div className="flex items-center gap-1">
                  {stat.trend === "up" ? <ArrowUp size={12} style={{ color: "#10B981" }} /> : <ArrowDown size={12} style={{ color: "#EF4444" }} />}
                  <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: stat.trend === "up" ? "#10B981" : "#EF4444", fontWeight: 600 }}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <p className="font-['Euclid_Circular_A',sans-serif] mb-1" style={{ fontSize: 13, color: "#828282" }}>{stat.label}</p>
              <p className="font-['Euclid_Circular_A',sans-serif] mb-1" style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}>{stat.value}</p>
              <p className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 11, color: "#9CA3AF" }}>{stat.comparison}</p>
            </div>
          ))}
        </div>

        {/* Touchpoint Stats */}
        <div className="bg-gradient-to-br from-[#FF5F39] to-[#FF8566] rounded-xl p-6 mb-6 border-2 border-[#FF5F39]">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={24} style={{ color: "white" }} />
            <h2 className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 20, fontWeight: 700, color: "white" }}>
              Status de Touchpoints
            </h2>
            <span className="ml-auto px-3 py-1 rounded-full font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.2)", color: "white" }}>
              Métrica Principal
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {touchpointStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg p-4" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: stat.bgColor }}>
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                  <div className="flex items-center gap-1">
                    {stat.trend === "up" ? <ArrowUp size={12} style={{ color: "#10B981" }} /> : <ArrowDown size={12} style={{ color: "#EF4444" }} />}
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>{stat.change}</span>
                  </div>
                </div>
                <p className="font-['Euclid_Circular_A',sans-serif] mb-1" style={{ fontSize: 12, color: "#828282" }}>{stat.label}</p>
                <p className="font-['Euclid_Circular_A',sans-serif] mb-1" style={{ fontSize: 28, fontWeight: 700, color: "#212A46" }}>{stat.value}</p>
                <p className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 10, color: "#9CA3AF" }}>{stat.comparison}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== TAREFAS ===== */}
        <div className="bg-white rounded-xl border border-[#d8d8d8] mb-6 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {/* Tab Bar */}
          <div className="flex items-stretch border-b border-[#E5E7EB]" style={{ background: "#F9FAFB" }}>
            {tabConfig.map((tab) => {
              const isActive = taskTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTaskTab(tab.key)}
                  className="relative flex items-center gap-2 px-7 py-4 transition-all"
                  style={{
                    borderBottom: isActive ? `2px solid ${tab.activeColor}` : "2px solid transparent",
                    background: isActive ? "white" : "transparent",
                    marginBottom: -1,
                  }}
                >
                  <span style={{ color: isActive ? tab.activeColor : "#9CA3AF" }}>{tab.icon}</span>
                  <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? "#212A46" : "#6B7280" }}>
                    {tab.label}
                  </span>
                  <span
                    className="flex items-center justify-center rounded-full font-['Euclid_Circular_A',sans-serif]"
                    style={{ minWidth: 22, height: 22, fontSize: 11, fontWeight: 600, background: isActive ? tab.activeColor : "#E5E7EB", color: isActive ? "white" : "#6B7280", paddingLeft: 6, paddingRight: 6 }}
                  >
                    {tab.count}
                  </span>
                  {tab.badge && (
                    <span className="px-2 py-0.5 rounded-full font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 10, fontWeight: 600, background: tab.badgeBg, color: tab.badgeColor }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            <div className="flex items-center px-6 gap-3">
              <button className="font-['Euclid_Circular_A',sans-serif] flex items-center gap-1 hover:text-[#FF5F39] transition-colors" style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="p-6">
            <div className="flex flex-col gap-2">
              {currentTasks.map((task) => (
                <div
                  key={task.id}
                  className="col-span-full flex items-center gap-0 rounded-lg transition-all cursor-pointer group overflow-hidden"
                  style={{
                    border: `1px solid ${task.status === "overdue" ? "#FCA5A5" : "#E5E7EB"}`,
                    background: task.status === "overdue" ? "#FFF5F5" : "white",
                  }}
                  onClick={() => setSelectedTask(task)}
                >
                  {/* Left accent bar — taskpoint=green, overdue=red, else blue */}
                  <div
                    className="w-1 self-stretch shrink-0"
                    style={{
                      background: task.type === "Interno"
                        ? "#81c784"
                        : task.status === "overdue"
                        ? "#EF4444"
                        : "#3571DE",
                    }}
                  />

                  {/* Item-type pill */}
                  <div
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 mx-3 my-2 rounded font-['Euclid_Circular_A',sans-serif]"
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                      background: task.type === "Interno" ? "#e8f5e9" : task.status === "overdue" ? "#FEE2E2" : "#EFF6FF",
                      color: task.type === "Interno" ? "#2e7d32" : task.status === "overdue" ? "#EF4444" : "#3571DE",
                    }}
                  >
                    {task.type === "Interno" ? (
                      <ClipboardCheck size={10} />
                    ) : (
                      <MessageCircle size={10} />
                    )}
                    {task.type === "Interno" ? "Taskpoint" : "Touchpoint"}
                  </div>

                  {/* Title */}
                  <p
                    className="font-['Euclid_Circular_A',sans-serif] flex-1 min-w-0 truncate group-hover:text-[#3571DE] transition-colors"
                    style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
                  >
                    {task.title}
                  </p>

                  {/* Channel badge */}
                  {task.channel && (
                    <span
                      className="shrink-0 px-2 py-0.5 rounded font-['Euclid_Circular_A',sans-serif] mx-1"
                      style={{ fontSize: 10, fontWeight: 600, background: "#F3F4F6", color: "#6B7280" }}
                    >
                      {task.channel}
                    </span>
                  )}

                  {/* Account badge */}
                  <span
                    className="shrink-0 px-2 py-0.5 rounded font-['Euclid_Circular_A',sans-serif] mx-1"
                    style={{ fontSize: 10, fontWeight: 600, background: "#F0F4FF", color: "#3571DE" }}
                  >
                    {task.account}
                  </span>

                  {/* Priority dot */}
                  <div className="shrink-0 flex items-center gap-1 px-2 mx-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: getPriorityColor(task.priority) }} />
                    <span
                      className="font-['Euclid_Circular_A',sans-serif]"
                      style={{ fontSize: 9, fontWeight: 700, color: getPriorityColor(task.priority), textTransform: "uppercase", letterSpacing: "0.03em" }}
                    >
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>

                  {/* Time */}
                  <span
                    className="shrink-0 font-['Euclid_Circular_A',sans-serif] px-3"
                    style={{
                      fontSize: 11,
                      color: task.status === "overdue" ? "#EF4444" : "#9CA3AF",
                      fontWeight: task.status === "overdue" ? 700 : 400,
                      minWidth: 100,
                      textAlign: "right",
                    }}
                  >
                    {task.status === "overdue" && "⚠ "}{task.time}
                  </span>

                  {/* Open hint */}
                  <ChevronRight size={14} style={{ color: "#D1D5DB" }} className="shrink-0 mr-3 group-hover:text-[#3571DE] transition-colors" />
                </div>
              ))}
            </div>

            {/* Summary bar */}
            <div className="mt-5 pt-4 flex items-center gap-6 border-t border-[#F3F4F6]">
              {taskTab === "hoje" && (
                <>
                  <div className="flex items-center gap-2">
                    <XCircle size={14} style={{ color: "#EF4444" }} />
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: "#6B7280" }}>
                      <span style={{ fontWeight: 600, color: "#EF4444" }}>{todayTasks.filter(t => t.status === "overdue").length}</span> em atraso
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: "#F59E0B" }} />
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: "#6B7280" }}>
                      <span style={{ fontWeight: 600, color: "#F59E0B" }}>{todayTasks.filter(t => t.status === "pending").length}</span> pendentes
                    </span>
                  </div>
                </>
              )}
              {taskTab === "semana" && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} style={{ color: "#3B82F6" }} />
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: "#6B7280" }}>
                      <span style={{ fontWeight: 600, color: "#3B82F6" }}>{weekTasks.length}</span> tarefas programadas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} style={{ color: "#EF4444" }} />
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: "#6B7280" }}>
                      <span style={{ fontWeight: 600, color: "#EF4444" }}>{weekTasks.filter(t => t.priority === "high").length}</span> de alta prioridade
                    </span>
                  </div>
                </>
              )}
              {taskTab === "futuro" && (
                <>
                  <div className="flex items-center gap-2">
                    <CalendarClock size={14} style={{ color: "#8B5CF6" }} />
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: "#6B7280" }}>
                      <span style={{ fontWeight: 600, color: "#8B5CF6" }}>{futureTasks.length}</span> tarefas planejadas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} style={{ color: "#EF4444" }} />
                    <span className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 12, color: "#6B7280" }}>
                      <span style={{ fontWeight: 600, color: "#EF4444" }}>{futureTasks.filter(t => t.priority === "high").length}</span> de alta prioridade
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Touchpoint Drawer */}
      {selectedTask && (
        <TouchpointDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}