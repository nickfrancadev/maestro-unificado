import React, { useState, useMemo, ChangeEvent } from "react";
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
  ArrowUpDown,
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
  Search,
  UserCircle2,
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

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
    { id: "s1", title: "Preparar apresentação de slides", completed: true, assignee: 'João Silva', dueDate: '2026-04-18' },
    { id: "s2", title: "Confirmar presença dos participantes", completed: false, assignee: 'Maria Santos', dueDate: '2026-04-19' },
    { id: "s3", title: "Enviar agenda com antecedência", completed: false, assignee: 'Pedro Costa', dueDate: '2026-04-20' },
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
                      TASKPOINT INTERNA
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

              {/* Subtaskpoints */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#212a46] mb-3">Subtaskpoints</h4>
                {mockSubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                    <input type="checkbox" defaultChecked={subtask.completed} className="w-3.5 h-3.5 rounded border-gray-300 accent-[#4a90e2]" />
                    <div className="flex-1 flex flex-col">
                      <span className={`text-sm ${subtask.completed ? "line-through text-gray-500" : "text-gray-800"}`}>
                        {subtask.title}
                      </span>
                      {(subtask.assignee || subtask.dueDate) && (
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                          {subtask.assignee && (
                            <span className="flex items-center gap-1">
                              <UserCircle2 className="w-3 h-3" />
                              {subtask.assignee}
                            </span>
                          )}
                          {subtask.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {subtask.dueDate.split('-').reverse().join('/')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Nova subtaskpoint
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
                  {isTask ? "TASKPOINT EXECUTADA" : "TOUCHPOINT EXECUTADO"}
                </button>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">DATA DE FINALIZAÇÃO</div>
                <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 bg-[#3571de] text-white rounded font-bold text-[11px] hover:bg-[#2557b8] transition-colors">
                  {isTask ? "CONCLUIR TASKPOINT" : "CONCLUIR TOUCHPOINT"}
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Responsabilidades filters
  const [respTipoFilter, setRespTipoFilter] = useState("all");
  const [respContaFilter, setRespContaFilter] = useState("");
  const [respPlayFilter, setRespPlayFilter] = useState("");
  const [respStatusFilter, setRespStatusFilter] = useState("all");
  const [respDateFilter, setRespDateFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "status", direction: "asc" });

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

  const mockResponsabilidades = useMemo(() => [
    { id: "r1", tipo: "Touchpoint", titulo: "Follow-up Natura — Proposta Q1", dataExecucao: "22/04/2026", dataConclusao: "22/04/2026", conta: "Natura", play: "Vendas Q1", diasDiferenca: 0, status: "No prazo" },
    { id: "r2", tipo: "Taskpoint", titulo: "Preparar contrato STAR BANK", dataExecucao: "20/04/2026", dataConclusao: "", conta: "STAR BANK", play: "Expansão Enterprise", diasDiferenca: -2, status: "Atrasado 2 dias" },
    { id: "r3", tipo: "Subtaskpoint", titulo: "Enviar link do Zoom para Call", dataExecucao: "23/04/2026", dataConclusao: "", conta: "iFood", play: "Onboarding", diasDiferenca: 1, status: "Adiantado 1 dia" },
    { id: "r4", tipo: "Touchpoint", titulo: "Email de check-in — Ambev", dataExecucao: "21/04/2026", dataConclusao: "", conta: "Ambev", play: "Manutenção", diasDiferenca: -1, status: "Atrasado 1 dia" },
    { id: "r5", tipo: "Taskpoint", titulo: "Revisar proposta Magazine Luiza", dataExecucao: "25/04/2026", dataConclusao: "", conta: "Magazine Luiza", play: "Upsell Q2", diasDiferenca: 3, status: "Adiantado 3 dias" },
    { id: "r6", tipo: "Subtaskpoint", titulo: "Confirmar RSVP evento", dataExecucao: "22/04/2026", dataConclusao: "22/04/2026", conta: "Nubank", play: "Partnership", diasDiferenca: 0, status: "No prazo" },
    { id: "r7", tipo: "Touchpoint", titulo: "LinkedIn touch — Banco Inter", dataExecucao: "19/04/2026", dataConclusao: "", conta: "Banco Inter", play: "Outreach Social", diasDiferenca: -3, status: "Atrasado 3 dias" },
  ], []);

  const filteredResponsabilidades = useMemo(() => {
    return mockResponsabilidades.filter(item => {
      const matchesTipo = respTipoFilter === "all" || item.tipo === respTipoFilter;
      const matchesConta = item.conta.toLowerCase().includes(respContaFilter.toLowerCase());
      const matchesPlay = item.play.toLowerCase().includes(respPlayFilter.toLowerCase());
      const matchesDate = item.dataExecucao.includes(respDateFilter) || (item.dataConclusao || "").includes(respDateFilter);
      
      let matchesStatus = true;
      if (respStatusFilter === "atrasado") matchesStatus = item.status === "Atrasado" || item.status.includes("Atrasado");
      else if (respStatusFilter === "adiantado") matchesStatus = item.status === "Adiantado" || item.status.includes("Adiantado");
      else if (respStatusFilter === "no-prazo") matchesStatus = item.status === "No prazo" || item.status.includes("No prazo");

      return matchesTipo && matchesConta && matchesPlay && matchesDate && matchesStatus;
    });
  }, [mockResponsabilidades, respTipoFilter, respContaFilter, respPlayFilter, respStatusFilter, respDateFilter]);

  const sortedResponsabilidades = useMemo(() => {
    let sortableItems = [...filteredResponsabilidades];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (sortConfig.key === "dataExecucao") {
          const [dayA, monthA, yearA] = (aValue as string).split("/");
          const [dayB, monthB, yearB] = (bValue as string).split("/");
          aValue = new Date(`${yearA}-${monthA}-${dayA}`).getTime();
          bValue = new Date(`${yearB}-${monthB}-${dayB}`).getTime();
        } else if (sortConfig.key === "status") {
          aValue = a.diasDiferenca;
          bValue = b.diasDiferenca;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredResponsabilidades, sortConfig]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="opacity-50" />;
    return sortConfig.direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const getStatusColor = (dias: number) => {
    if (dias < 0) return "#EF4444";
    if (dias > 0) return "#3B82F6";
    return "#10B981";
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  };

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

        {/* ===== RESPONSABILIDADES ===== */}
        <div className="bg-white rounded-xl border border-[#d8d8d8] mb-6 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="font-['Euclid_Circular_A',sans-serif]" style={{ fontSize: 20, fontWeight: 700, color: "#212A46" }}>
              Responsabilidades
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#828282] font-medium">
                Mostrando {sortedResponsabilidades.length} itens
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-['Euclid_Circular_A',sans-serif]">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#828282] uppercase tracking-wider">
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#FF5F39] transition-colors"
                      onClick={() => handleSort("tipo")}
                    >
                      <span>Tipo / Título</span>
                      {getSortIcon("tipo")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#828282] uppercase tracking-wider">
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#FF5F39] transition-colors"
                      onClick={() => handleSort("dataExecucao")}
                    >
                      <span>Execução / Conclusão</span>
                      {getSortIcon("dataExecucao")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#828282] uppercase tracking-wider">
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#FF5F39] transition-colors"
                      onClick={() => handleSort("conta")}
                    >
                      <span>Conta</span>
                      {getSortIcon("conta")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#828282] uppercase tracking-wider">
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#FF5F39] transition-colors"
                      onClick={() => handleSort("play")}
                    >
                      <span>Play</span>
                      {getSortIcon("play")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#828282] uppercase tracking-wider">
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#FF5F39] transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      <span>Status</span>
                      {getSortIcon("status")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {sortedResponsabilidades.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTask({
                      id: item.id,
                      title: item.titulo,
                      account: item.conta,
                      type: item.tipo === "Touchpoint" ? "LinkedIn" : "Interno",
                      time: item.dataExecucao,
                      priority: "medium",
                      status: item.diasDiferenca < 0 ? "overdue" : "pending"
                    })}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.tipo === "Taskpoint" ? "bg-amber-500" : item.tipo === "Touchpoint" ? "bg-blue-500" : "bg-purple-500"
                        }`} />
                        <div>
                          <p className="text-[10px] font-bold text-[#828282] uppercase mb-0.5">{item.tipo}</p>
                          <p className="text-sm font-semibold text-[#212A46] group-hover:text-[#FF5F39] transition-colors">{item.titulo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs text-[#212A46] font-medium">
                          <Calendar size={12} className="text-[#828282]" />
                          Exec: {item.dataExecucao}
                        </div>
                        {item.dataConclusao ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] mt-1">
                            <CheckCircle2 size={11} />
                            Conc: {item.dataConclusao}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#828282] mt-1">
                            <Clock size={11} />
                            Pendente
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-[#F0F4FF] text-[#3571DE] text-xs font-bold">
                        {item.conta}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#212A46] font-medium border-b border-dotted border-[#d8d8d8]">
                        {item.play}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ 
                          background: `${getStatusColor(item.diasDiferenca)}15`,
                          color: getStatusColor(item.diasDiferenca)
                        }}
                      >
                        {item.diasDiferenca < 0 ? <AlertCircle size={12} /> : item.diasDiferenca > 0 ? <TrendingUp size={12} /> : <CheckCircle2 size={12} />}
                        {item.status}
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedResponsabilidades.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <Search size={32} />
                        <p className="text-sm font-medium">Nenhum item encontrado com os filtros aplicados</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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