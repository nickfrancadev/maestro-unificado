import { useState } from "react";
import {
  Target,
  TrendingUp,
  Activity,
  CheckCircle2,
  ChevronDown,
  Play,
  Mail,
  Phone,
  Linkedin,
  MessageSquare,
  Calendar,
  Filter,
  ArrowUpDown,
  Users,
} from "lucide-react";

interface Task {
  id: string;
  touchpoint: string;
  play: string;
  channel: "email" | "call" | "linkedin" | "whatsapp" | "meeting";
  responsible: string;
  dueDate: string;
  status: "hoje" | "atrasado" | "andamento";
  playActive: boolean;
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"afazer" | "finalizadas">("afazer");
  const [filterCards, setFilterCards] = useState("all");
  const [filterResponsible, setFilterResponsible] = useState("all");
  const [onlyActivePlays, setOnlyActivePlays] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Mock data de taskpoints
  const tasksData: Task[] = [
    {
      id: "1",
      touchpoint: "Follow-up Proposta Comercial",
      play: "Campanha Q1 2024 - STAR BANK",
      channel: "email",
      responsible: "Ana Silva",
      dueDate: "13/03/2026 14:00",
      status: "hoje",
      playActive: true,
    },
    {
      id: "2",
      touchpoint: "Reunião de Alinhamento",
      play: "Partnership Q2 - Nubank",
      channel: "meeting",
      responsible: "Carlos Mendes",
      dueDate: "13/03/2026 16:00",
      status: "hoje",
      playActive: true,
    },
    {
      id: "3",
      touchpoint: "Conexão LinkedIn",
      play: "Expansion Regional - Natura",
      channel: "linkedin",
      responsible: "Beatriz Costa",
      dueDate: "12/03/2026 10:00",
      status: "atrasado",
      playActive: true,
    },
    {
      id: "4",
      touchpoint: "Email de Apresentação",
      play: "Reativação Leads - STAR BANK",
      channel: "email",
      responsible: "Ana Silva",
      dueDate: "11/03/2026 15:00",
      status: "atrasado",
      playActive: false,
    },
    {
      id: "5",
      touchpoint: "Ligação de Follow-up",
      play: "Upsell Premium - Natura",
      channel: "call",
      responsible: "Carlos Mendes",
      dueDate: "14/03/2026 09:00",
      status: "andamento",
      playActive: true,
    },
    {
      id: "6",
      touchpoint: "Mensagem WhatsApp",
      play: "Cross-sell Digital - Magazine Luiza",
      channel: "whatsapp",
      responsible: "Beatriz Costa",
      dueDate: "15/03/2026 11:00",
      status: "andamento",
      playActive: true,
    },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail size={16} style={{ color: "#6B7280" }} />;
      case "call":
        return <Phone size={16} style={{ color: "#6B7280" }} />;
      case "linkedin":
        return <Linkedin size={16} style={{ color: "#0A66C2" }} />;
      case "whatsapp":
        return <MessageSquare size={16} style={{ color: "#25D366" }} />;
      case "meeting":
        return <Calendar size={16} style={{ color: "#6B7280" }} />;
      default:
        return null;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "email":
        return "Email";
      case "call":
        return "Ligação";
      case "linkedin":
        return "LinkedIn";
      case "whatsapp":
        return "WhatsApp";
      case "meeting":
        return "Reunião";
      default:
        return channel;
    }
  };

  const filteredTasks = tasksData.filter(task => {
    if (activeTab === "finalizadas") return false; // Mock: sem taskpoints finalizadas
    if (onlyActivePlays && !task.playActive) return false;
    if (filterResponsible !== "all" && task.responsible !== filterResponsible) return false;
    return true;
  });

  const groupedTasks = {
    hoje: filteredTasks.filter(t => t.status === "hoje"),
    atrasado: filteredTasks.filter(t => t.status === "atrasado"),
    andamento: filteredTasks.filter(t => t.status === "andamento"),
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleGroupSelection = (tasks: Task[]) => {
    const taskIds = tasks.map(t => t.id);
    const allSelected = taskIds.every(id => selectedTasks.has(id));
    const newSelected = new Set(selectedTasks);
    
    if (allSelected) {
      taskIds.forEach(id => newSelected.delete(id));
    } else {
      taskIds.forEach(id => newSelected.add(id));
    }
    setSelectedTasks(newSelected);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#EEF0F5" }}>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="font-['Euclid_Circular_A',sans-serif] mb-1"
            style={{ fontSize: 28, fontWeight: 600, color: "#212A46" }}
          >
            Dashboard
          </h1>
          <p
            className="font-['Euclid_Circular_A',sans-serif]"
            style={{ fontSize: 14, color: "#828282" }}
          >
            Visão geral de métricas e taskpoints
          </p>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div
            className="bg-white rounded-xl p-5 border border-[#d8d8d8]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 40, height: 40, background: "#FFF5F3" }}
              >
                <Target size={20} style={{ color: "#FF5F39" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Touchpoints Criados
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  248
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-[#d8d8d8]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 40, height: 40, background: "#F0FDF4" }}
              >
                <CheckCircle2 size={20} style={{ color: "#10B981" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Touchpoints Executados
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  186
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-[#d8d8d8]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 40, height: 40, background: "#FEF2F2" }}
              >
                <Activity size={20} style={{ color: "#EF4444" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Em Atraso
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  12
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-[#d8d8d8]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 40, height: 40, background: "#EFF6FF" }}
              >
                <TrendingUp size={20} style={{ color: "#3B82F6" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Para Executar (Futuro)
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  50
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seção Minhas Taskpoints */}
        <div
          className="bg-white rounded-xl border border-[#d8d8d8] overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          {/* Header de Taskpoints */}
          <div className="p-6 border-b border-[#E5E7EB]">
            <h2
              className="font-['Euclid_Circular_A',sans-serif] mb-4"
              style={{ fontSize: 20, fontWeight: 600, color: "#212A46" }}
            >
              Minhas Taskpoints
            </h2>

            {/* Filtros */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <select
                  value={filterCards}
                  onChange={(e) => setFilterCards(e.target.value)}
                  className="pl-3 pr-8 py-2 rounded-lg border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif] appearance-none cursor-pointer"
                  style={{ fontSize: 13, color: "#6B7280", outline: "none" }}
                >
                  <option value="all">Todos cards</option>
                  <option value="active">Apenas ativos</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#6B7280" }} />
              </div>

              <div className="relative">
                <select
                  className="pl-3 pr-8 py-2 rounded-lg border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif] appearance-none cursor-pointer"
                  style={{ fontSize: 13, color: "#6B7280", outline: "none" }}
                >
                  <option>Ordenar por</option>
                  <option>Data</option>
                  <option>Responsável</option>
                  <option>Play</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#6B7280" }} />
              </div>

              <div className="relative">
                <select
                  value={filterResponsible}
                  onChange={(e) => setFilterResponsible(e.target.value)}
                  className="pl-3 pr-8 py-2 rounded-lg border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif] appearance-none cursor-pointer"
                  style={{ fontSize: 13, color: "#6B7280", outline: "none" }}
                >
                  <option value="all">Todas responsáveis</option>
                  <option value="Ana Silva">Ana Silva</option>
                  <option value="Carlos Mendes">Carlos Mendes</option>
                  <option value="Beatriz Costa">Beatriz Costa</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#6B7280" }} />
              </div>

              <button
                onClick={() => setOnlyActivePlays(!onlyActivePlays)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif] transition-all"
                style={{
                  fontSize: 13,
                  color: onlyActivePlays ? "#FF5F39" : "#6B7280",
                  background: onlyActivePlays ? "#FFF5F3" : "white",
                  borderColor: onlyActivePlays ? "#FF5F39" : "#d8d8d8",
                }}
              >
                <Filter size={16} />
                Somente Plays Ativas
              </button>
            </div>

            {/* Abas */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("afazer")}
                className="px-4 py-2 rounded-lg font-['Euclid_Circular_A',sans-serif] transition-all"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === "afazer" ? "#FF5F39" : "#6B7280",
                  background: activeTab === "afazer" ? "#FFF5F3" : "transparent",
                }}
              >
                A fazer ({filteredTasks.length})
              </button>
              <button
                onClick={() => setActiveTab("finalizadas")}
                className="px-4 py-2 rounded-lg font-['Euclid_Circular_A',sans-serif] transition-all"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === "finalizadas" ? "#FF5F39" : "#6B7280",
                  background: activeTab === "finalizadas" ? "#FFF5F3" : "transparent",
                }}
              >
                Finalizadas (0)
              </button>
            </div>
          </div>

          {/* Lista de Taskpoints */}
          {activeTab === "afazer" && (
            <div>
              {/* Hoje EM */}
              {groupedTasks.hoje.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-[#FFF5F3] border-b border-[#E5E7EB] flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupedTasks.hoje.every(t => selectedTasks.has(t.id))}
                      onChange={() => toggleGroupSelection(groupedTasks.hoje)}
                      className="w-4 h-4 rounded border-[#d8d8d8] cursor-pointer"
                    />
                    <span
                      className="font-['Euclid_Circular_A',sans-serif]"
                      style={{ fontSize: 12, fontWeight: 600, color: "#FF5F39" }}
                    >
                      Hoje EM ({groupedTasks.hoje.length})
                    </span>
                  </div>
                  {groupedTasks.hoje.map((task) => (
                    <div
                      key={task.id}
                      className="px-6 py-4 border-b border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors flex items-center gap-4"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="w-4 h-4 rounded border-[#d8d8d8] cursor-pointer shrink-0"
                      />
                      <div className="shrink-0">
                        <Play size={14} fill="#10B981" style={{ color: "#10B981" }} />
                      </div>
                      <div className="flex-1 grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr] gap-4 items-center">
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
                        >
                          {task.touchpoint}
                        </p>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.play}
                        </p>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(task.channel)}
                          <span
                            className="font-['Euclid_Circular_A',sans-serif]"
                            style={{ fontSize: 12, color: "#6B7280" }}
                          >
                            {getChannelLabel(task.channel)}
                          </span>
                        </div>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.responsible}
                        </p>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif]"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.dueDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Em atraso/SEM */}
              {groupedTasks.atrasado.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-[#FEF2F2] border-b border-[#E5E7EB] flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupedTasks.atrasado.every(t => selectedTasks.has(t.id))}
                      onChange={() => toggleGroupSelection(groupedTasks.atrasado)}
                      className="w-4 h-4 rounded border-[#d8d8d8] cursor-pointer"
                    />
                    <span
                      className="font-['Euclid_Circular_A',sans-serif]"
                      style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}
                    >
                      Em atraso/SEM ({groupedTasks.atrasado.length})
                    </span>
                  </div>
                  {groupedTasks.atrasado.map((task) => (
                    <div
                      key={task.id}
                      className="px-6 py-4 border-b border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors flex items-center gap-4"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="w-4 h-4 rounded border-[#d8d8d8] cursor-pointer shrink-0"
                      />
                      <div className="shrink-0">
                        <Play size={14} style={{ color: "#EF4444" }} />
                      </div>
                      <div className="flex-1 grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr] gap-4 items-center">
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
                        >
                          {task.touchpoint}
                        </p>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.play}
                        </p>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(task.channel)}
                          <span
                            className="font-['Euclid_Circular_A',sans-serif]"
                            style={{ fontSize: 12, color: "#6B7280" }}
                          >
                            {getChannelLabel(task.channel)}
                          </span>
                        </div>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.responsible}
                        </p>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif]"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.dueDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Em andamento (A) */}
              {groupedTasks.andamento.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-[#EFF6FF] border-b border-[#E5E7EB] flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupedTasks.andamento.every(t => selectedTasks.has(t.id))}
                      onChange={() => toggleGroupSelection(groupedTasks.andamento)}
                      className="w-4 h-4 rounded border-[#d8d8d8] cursor-pointer"
                    />
                    <span
                      className="font-['Euclid_Circular_A',sans-serif]"
                      style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6" }}
                    >
                      Em andamento (A) ({groupedTasks.andamento.length})
                    </span>
                  </div>
                  {groupedTasks.andamento.map((task) => (
                    <div
                      key={task.id}
                      className="px-6 py-4 border-b border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors flex items-center gap-4"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="w-4 h-4 rounded border-[#d8d8d8] cursor-pointer shrink-0"
                      />
                      <div className="shrink-0">
                        <Play size={14} style={{ color: "#3B82F6" }} />
                      </div>
                      <div className="flex-1 grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr] gap-4 items-center">
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
                        >
                          {task.touchpoint}
                        </p>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.play}
                        </p>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(task.channel)}
                          <span
                            className="font-['Euclid_Circular_A',sans-serif]"
                            style={{ fontSize: 12, color: "#6B7280" }}
                          >
                            {getChannelLabel(task.channel)}
                          </span>
                        </div>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif] truncate"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.responsible}
                        </p>
                        <p
                          className="font-['Euclid_Circular_A',sans-serif]"
                          style={{ fontSize: 13, color: "#6B7280" }}
                        >
                          {task.dueDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state para finalizadas */}
          {activeTab === "finalizadas" && (
            <div className="px-6 py-16 text-center">
              <CheckCircle2 size={48} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
              <p
                className="font-['Euclid_Circular_A',sans-serif] mb-1"
                style={{ fontSize: 16, fontWeight: 600, color: "#6B7280" }}
              >
                Nenhuma taskpoint finalizada
              </p>
              <p
                className="font-['Euclid_Circular_A',sans-serif]"
                style={{ fontSize: 14, color: "#9CA3AF" }}
              >
                As taskpoints concluídas aparecerão aqui
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
