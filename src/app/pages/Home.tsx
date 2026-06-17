import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Zap, 
  Snowflake,
  Filter,
  Edit2,
  Plus,
  Target,
  DollarSign,
  Calendar,
  Users,
  BarChart3,
  Activity,
  Mail,
  Phone,
  Linkedin,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Play as PlayIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { InternoTab } from './dashboard/InternoTab';
import { FunilTab } from './dashboard/FunilTab';

type DashboardTab = 'estrategico' | 'funil' | 'interno';

const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: 'estrategico', label: 'Estratégico' },
  { id: 'funil', label: 'Funil' },
  { id: 'interno', label: 'Interno' },
];

// Mock Data
const temperatureData = [
  { id: 'hot', name: 'Hot', value: 12, color: '#ef4444' },
  { id: 'warm', name: 'Warm', value: 8, color: '#f59e0b' },
  { id: 'cold', name: 'Cold', value: 5, color: '#3b82f6' }
];

const topEngagedAccounts = [
  { name: 'Tech Corp', score: 9.2, trend: 'up', touchpoints: 24 },
  { name: 'Global Solutions', score: 8.7, trend: 'up', touchpoints: 18 },
  { name: 'Innovation Labs', score: 8.5, trend: 'stable', touchpoints: 15 },
  { name: 'Digital Ventures', score: 8.1, trend: 'up', touchpoints: 12 },
  { name: 'Future Systems', score: 7.8, trend: 'down', touchpoints: 10 }
];

const atRiskAccounts = [
  { name: 'Legacy Co', score: 3.2, trend: 'down', touchpoints: 2 },
  { name: 'Old Industries', score: 3.8, trend: 'down', touchpoints: 3 },
  { name: 'Stale Partners', score: 4.1, trend: 'stable', touchpoints: 4 },
  { name: 'Quiet Corp', score: 4.5, trend: 'down', touchpoints: 5 },
  { name: 'Silent Group', score: 4.7, trend: 'stable', touchpoints: 6 }
];

const touchpointsTimelineData = [
  { date: 'Sem 1', executados: 12, planejados: 15 },
  { date: 'Sem 2', executados: 18, planejados: 20 },
  { date: 'Sem 3', executados: 15, planejados: 18 },
  { date: 'Sem 4', executados: 22, planejados: 22 }
];

const touchpointsByChannel = [
  { channel: 'LinkedIn', count: 28, score: 7.8 },
  { channel: 'Email', count: 22, score: 6.5 },
  { channel: 'Telefone', count: 12, score: 8.2 },
  { channel: 'WhatsApp', count: 8, score: 7.1 },
  { channel: 'Presencial', count: 5, score: 9.1 }
];

const touchpointsByType = [
  { type: 'Autoridade', count: 24, score: 8.5 },
  { type: 'Atenção', count: 31, score: 7.2 },
  { type: 'Afinidade', count: 20, score: 7.8 }
];

interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
}

interface OKR {
  id: string;
  objective: string;
  period: string;
  status: 'on-track' | 'at-risk' | 'off-track';
  progress: number;
  keyResults: KeyResult[];
}

const mockOKRs: OKR[] = [
  {
    id: '1',
    objective: 'Aumentar engajamento das contas em 30%',
    period: 'Q1 2026',
    status: 'on-track',
    progress: 82,
    keyResults: [
      { id: 'kr1', description: 'Executar 50 touchpoints/mês', target: 50, current: 38, unit: 'touchpoints' },
      { id: 'kr2', description: 'Score médio acima de 7.0', target: 7.0, current: 6.8, unit: 'score' },
      { id: 'kr3', description: '80% contas em Hot/Warm', target: 20, current: 20, unit: 'contas' }
    ]
  }
];

type PeriodFilter = 'week' | 'month' | 'quarter' | 'year' | 'custom';

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

const mockTasks: Task[] = [
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

export function Home() {
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('estrategico');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('month');
  const [showOKRModal, setShowOKRModal] = useState(false);
  const [editingOKR, setEditingOKR] = useState<OKR | null>(null);
  const [okrs, setOKRs] = useState<OKR[]>(mockOKRs);
  const [activeTab, setActiveTab] = useState<"afazer" | "finalizadas">("afazer");
  const [filterResponsible, setFilterResponsible] = useState("all");
  const [onlyActivePlays, setOnlyActivePlays] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const handleEditOKR = (okr: OKR) => {
    setEditingOKR(okr);
    setShowOKRModal(true);
  };

  const handleAddOKR = () => {
    setEditingOKR(null);
    setShowOKRModal(true);
  };

  const getStatusColor = (status: OKR['status']) => {
    switch (status) {
      case 'on-track': return 'bg-green-500';
      case 'at-risk': return 'bg-yellow-500';
      case 'off-track': return 'bg-red-500';
    }
  };

  const getStatusIcon = (status: OKR['status']) => {
    switch (status) {
      case 'on-track': return '🟢';
      case 'at-risk': return '🟡';
      case 'off-track': return '🔴';
    }
  };

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

  const filteredTasks = mockTasks.filter(task => {
    if (activeTab === "finalizadas") return false;
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
    <div className="flex-1 overflow-auto bg-[#edf2f5] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#212a46]">Dashboard</h1>
            <p className="text-sm text-gray-600">Visão geral de temperatura, engajamento e performance</p>
          </div>
          <div className="flex items-center gap-2">
            {dashboardTab === 'interno' ? (
              <div className="relative">
                <select
                  defaultValue="30"
                  className="appearance-none pl-4 pr-9 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none"
                >
                  <option value="30">Últimos 30 dias</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            ) : (
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Calendar className="w-4 h-4" />
                Última atualização: Hoje
              </button>
            )}
          </div>
        </div>

        {/* Abas do Dashboard */}
        <div className="flex items-center gap-6 border-b border-gray-200">
          {DASHBOARD_TABS.map((tab) => {
            const isActive = dashboardTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDashboardTab(tab.id)}
                className="relative pb-3 text-sm font-semibold transition-colors"
                style={{ color: isActive ? '#FF5F39' : '#828282' }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                    style={{ background: '#FF5F39' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {dashboardTab === 'funil' && <FunilTab />}

        {dashboardTab === 'interno' && <InternoTab />}

        {dashboardTab === 'estrategico' && (
        <>
        {/* Temperatura & Engajamento */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#212a46]">Temperatura & Engajamento das Contas</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold">Hot: {temperatureData[0].value}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold">Warm: {temperatureData[1].value}</span>
              </div>
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-bold">Cold: {temperatureData[2].value}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Gráfico de Pizza */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={temperatureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {temperatureData.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Contas Engajadas */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Top 5 Mais Engajadas
              </h3>
              <div className="space-y-2">
                {topEngagedAccounts.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-gray-900">{account.name}</div>
                      <div className="text-[10px] text-gray-600">{account.touchpoints} touchpoints</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-700">{account.score}</span>
                      {account.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                      {account.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 5 Em Risco */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Top 5 Em Risco
              </h3>
              <div className="space-y-2">
                {atRiskAccounts.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-gray-900">{account.name}</div>
                      <div className="text-[10px] text-gray-600">{account.touchpoints} touchpoints</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-700">{account.score}</span>
                      {account.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                      {account.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Touchpoints Executados */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#212a46]">Touchpoints Executados</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as PeriodFilter)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Última Semana</option>
                <option value="month">Último Mês</option>
                <option value="quarter">Último Trimestre</option>
                <option value="year">Último Ano</option>
                <option value="custom">Período Customizado</option>
              </select>
              <select
                value={filterResponsible}
                onChange={(e) => setFilterResponsible(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">Todas responsáveis</option>
                <option value="Ana Silva">Ana Silva</option>
                <option value="Carlos Mendes">Carlos Mendes</option>
                <option value="Beatriz Costa">Beatriz Costa</option>
              </select>
              <button
                onClick={() => setOnlyActivePlays(!onlyActivePlays)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all"
                style={{
                  background: onlyActivePlays ? "#FFF5F3" : "white",
                  color: onlyActivePlays ? "#FF5F39" : "#6B7280",
                  borderColor: onlyActivePlays ? "#FF5F39" : "#d8d8d8",
                }}
              >
                <Filter size={14} />
                Somente Plays Ativas
              </button>
            </div>
          </div>

          {/* Métricas Rápidas */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-[10px] font-bold text-gray-600 mb-1">TOTAL EXECUTADOS</div>
              <div className="text-2xl font-bold text-blue-700">67</div>
              <div className="text-[10px] text-gray-600 mt-1">+12% vs período anterior</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-[10px] font-bold text-gray-600 mb-1">EM ATRASO</div>
              <div className="text-2xl font-bold text-red-700">8</div>
              <div className="text-[10px] text-gray-600 mt-1">Requer atenção urgente</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-[10px] font-bold text-gray-600 mb-1">AGENDADOS</div>
              <div className="text-2xl font-bold text-green-700">34</div>
              <div className="text-[10px] text-gray-600 mt-1">Próximos 7 dias</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-[10px] font-bold text-gray-600 mb-1">SCORE MÉDIO</div>
              <div className="text-2xl font-bold text-purple-700">7.6</div>
              <div className="text-[10px] text-gray-600 mt-1">+0.4 vs período anterior</div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Linha do Tempo */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4">Evolução ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={touchpointsTimelineData}>
                  <CartesianGrid key="lc-grid" strokeDasharray="3 3" />
                  <XAxis key="lc-xaxis" dataKey="date" style={{ fontSize: '11px' }} />
                  <YAxis key="lc-yaxis" style={{ fontSize: '11px' }} />
                  <Tooltip key="lc-tooltip" />
                  <Line key="line-executados" type="monotone" dataKey="executados" stroke="#3b82f6" strokeWidth={2} name="Executados" />
                  <Line key="line-planejados" type="monotone" dataKey="planejados" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Planejados" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Por Canal */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4">Touchpoints por Canal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={touchpointsByChannel}>
                  <CartesianGrid key="bc1-grid" strokeDasharray="3 3" />
                  <XAxis key="bc1-xaxis" dataKey="channel" style={{ fontSize: '11px' }} />
                  <YAxis key="bc1-yaxis" style={{ fontSize: '11px' }} />
                  <Tooltip key="bc1-tooltip" />
                  <Bar key="bar-channel-count" dataKey="count" fill="#3b82f6" name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Por Tipo */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Touchpoints por Tipo</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={touchpointsByType} layout="vertical">
                <CartesianGrid key="bc2-grid" strokeDasharray="3 3" />
                <XAxis key="bc2-xaxis" type="number" style={{ fontSize: '11px' }} />
                <YAxis key="bc2-yaxis" type="category" dataKey="type" style={{ fontSize: '11px' }} />
                <Tooltip key="bc2-tooltip" />
                <Bar key="bar-type-count" dataKey="count" fill="#10b981" name="Qtd. Touchpoints" />
                <Bar key="bar-type-score" dataKey="score" fill="#f59e0b" name="Score Médio" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Abas de Taskpoints */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab("afazer")}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === "afazer" ? "#FFF5F3" : "transparent",
                color: activeTab === "afazer" ? "#FF5F39" : "#6B7280",
              }}
            >
              A fazer ({filteredTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("finalizadas")}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === "finalizadas" ? "#FFF5F3" : "transparent",
                color: activeTab === "finalizadas" ? "#FF5F39" : "#6B7280",
              }}
            >
              Finalizadas (0)
            </button>
          </div>

          {/* Lista de Taskpoints/Touchpoints */}
          {activeTab === "afazer" && (
            <div className="space-y-4">
              {/* Hoje EM */}
              {groupedTasks.hoje.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF5F3] rounded-t-lg">
                    <input
                      type="checkbox"
                      checked={groupedTasks.hoje.every(t => selectedTasks.has(t.id))}
                      onChange={() => toggleGroupSelection(groupedTasks.hoje)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold" style={{ color: "#FF5F39" }}>
                      Hoje EM ({groupedTasks.hoje.length})
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                    {groupedTasks.hoje.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 cursor-pointer shrink-0"
                        />
                        <PlayIcon size={14} fill="#10B981" style={{ color: "#10B981" }} className="shrink-0" />
                        <div className="flex-1 grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr] gap-3 items-center text-sm">
                          <span className="font-semibold text-gray-900 truncate">{task.touchpoint}</span>
                          <span className="text-gray-600 truncate">{task.play}</span>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(task.channel)}
                            <span className="text-xs text-gray-600">{getChannelLabel(task.channel)}</span>
                          </div>
                          <span className="text-gray-600 truncate">{task.responsible}</span>
                          <span className="text-gray-600">{task.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Em atraso/SEM */}
              {groupedTasks.atrasado.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#FEF2F2] rounded-t-lg">
                    <input
                      type="checkbox"
                      checked={groupedTasks.atrasado.every(t => selectedTasks.has(t.id))}
                      onChange={() => toggleGroupSelection(groupedTasks.atrasado)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold" style={{ color: "#EF4444" }}>
                      Em atraso/SEM ({groupedTasks.atrasado.length})
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                    {groupedTasks.atrasado.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 cursor-pointer shrink-0"
                        />
                        <PlayIcon size={14} style={{ color: "#EF4444" }} className="shrink-0" />
                        <div className="flex-1 grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr] gap-3 items-center text-sm">
                          <span className="font-semibold text-gray-900 truncate">{task.touchpoint}</span>
                          <span className="text-gray-600 truncate">{task.play}</span>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(task.channel)}
                            <span className="text-xs text-gray-600">{getChannelLabel(task.channel)}</span>
                          </div>
                          <span className="text-gray-600 truncate">{task.responsible}</span>
                          <span className="text-gray-600">{task.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Em andamento (A) */}
              {groupedTasks.andamento.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#EFF6FF] rounded-t-lg">
                    <input
                      type="checkbox"
                      checked={groupedTasks.andamento.every(t => selectedTasks.has(t.id))}
                      onChange={() => toggleGroupSelection(groupedTasks.andamento)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold" style={{ color: "#3B82F6" }}>
                      Em andamento (A) ({groupedTasks.andamento.length})
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                    {groupedTasks.andamento.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 cursor-pointer shrink-0"
                        />
                        <PlayIcon size={14} style={{ color: "#3B82F6" }} className="shrink-0" />
                        <div className="flex-1 grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr] gap-3 items-center text-sm">
                          <span className="font-semibold text-gray-900 truncate">{task.touchpoint}</span>
                          <span className="text-gray-600 truncate">{task.play}</span>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(task.channel)}
                            <span className="text-xs text-gray-600">{getChannelLabel(task.channel)}</span>
                          </div>
                          <span className="text-gray-600 truncate">{task.responsible}</span>
                          <span className="text-gray-600">{task.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state finalizadas */}
          {activeTab === "finalizadas" && (
            <div className="py-16 text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "#D1D5DB" }} />
              <p className="text-gray-600 font-semibold mb-1">Nenhuma taskpoint finalizada</p>
              <p className="text-sm text-gray-500">As taskpoints concluídas aparecerão aqui</p>
            </div>
          )}
        </div>

        {/* Analytics Avançado */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#212a46] mb-6">Analytics Avançado</h2>
          
          <div className="grid grid-cols-3 gap-6">
            {/* Efetividade por Canal */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-700">Canal Mais Efetivo</h3>
              </div>
              <div className="text-2xl font-bold text-blue-700 mb-1">Presencial</div>
              <div className="text-xs text-gray-600">Score médio: 9.1 | 5 touchpoints</div>
              <div className="mt-3 text-[10px] text-gray-500">
                LinkedIn em segundo com score 7.8
              </div>
            </div>

            {/* Performance por Responsável */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-bold text-gray-700">Top Performer</h3>
              </div>
              <div className="text-2xl font-bold text-green-700 mb-1">João Silva</div>
              <div className="text-xs text-gray-600">28 touchpoints | Score: 8.2</div>
              <div className="mt-3 text-[10px] text-gray-500">
                94% taxa de execução no prazo
              </div>
            </div>

            {/* Gaps de Atenção */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-700">Contas sem Touch</h3>
              </div>
              <div className="text-2xl font-bold text-orange-700 mb-1">7 contas</div>
              <div className="text-xs text-gray-600">Há mais de 15 dias sem contato</div>
              <div className="mt-3 text-[10px] text-gray-500">
                3 delas são contas de alto valor
              </div>
            </div>
          </div>
        </div>

        {/* OKRs & Budget */}
        <div className="grid grid-cols-2 gap-6">
          {/* OKRs */}
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-[#212a46]">OKRs & Metas</h2>
              </div>
              <button
                onClick={handleAddOKR}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo OKR
              </button>
            </div>

            {okrs.map((okr) => (
              <div key={okr.id} className="mb-6 last:mb-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500">{okr.period}</span>
                      <span className="text-lg">{getStatusIcon(okr.status)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#212a46] mb-2">{okr.objective}</h3>
                  </div>
                  <button
                    onClick={() => handleEditOKR(okr)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Progresso Geral</span>
                    <span className="text-xs font-bold text-gray-900">{okr.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStatusColor(okr.status)} transition-all duration-300`}
                      style={{ width: `${okr.progress}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                <div className="space-y-2">
                  {okr.keyResults.map((kr) => {
                    const krProgress = (kr.current / kr.target) * 100;
                    return (
                      <div key={kr.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700">{kr.description}</span>
                          <span className="text-xs font-bold text-gray-900">
                            {kr.current}/{kr.target} {kr.unit}
                          </span>
                        </div>
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${Math.min(krProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Budget Overview */}
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-[#212a46]">Budget Overview</h2>
            </div>

            {/* Budget Principal */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Orçamento Total</span>
                <span className="text-sm font-bold text-gray-900">R$ 45.000 / R$ 60.000</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-green-500" style={{ width: '75%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">75% utilizado</span>
                <span className="text-xs text-green-600 font-medium">R$ 15.000 disponível</span>
              </div>
            </div>

            {/* Top Investimentos */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">Top 5 Investimentos</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-xs font-medium text-gray-900">Tech Corp</span>
                  <span className="text-xs font-bold text-green-700">R$ 12.000</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-xs font-medium text-gray-900">Global Solutions</span>
                  <span className="text-xs font-bold text-green-700">R$ 8.500</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-xs font-medium text-gray-900">Innovation Labs</span>
                  <span className="text-xs font-bold text-green-700">R$ 7.200</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-xs font-medium text-gray-900">Digital Ventures</span>
                  <span className="text-xs font-bold text-green-700">R$ 6.800</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-xs font-medium text-gray-900">Future Systems</span>
                  <span className="text-xs font-bold text-green-700">R$ 5.500</span>
                </div>
              </div>
            </div>

            {/* Alerta */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-lg">⚠️</div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-yellow-900 mb-1">Atenção ao Budget</div>
                  <div className="text-[10px] text-yellow-800">
                    Com o ritmo atual, você atingirá 90% do orçamento em 2 semanas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* OKR Modal */}
      {showOKRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#212a46]">
                {editingOKR ? 'Editar OKR' : 'Novo OKR'}
              </h2>
              <button
                onClick={() => setShowOKRModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <span className="text-2xl text-gray-600">×</span>
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Objetivo</label>
                <input
                  type="text"
                  defaultValue={editingOKR?.objective}
                  placeholder="Ex: Aumentar engajamento das contas em 30%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Período</label>
                  <input
                    type="text"
                    defaultValue={editingOKR?.period}
                    placeholder="Ex: Q1 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select
                    defaultValue={editingOKR?.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="on-track">On Track 🟢</option>
                    <option value="at-risk">At Risk 🟡</option>
                    <option value="off-track">Off Track 🔴</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Key Results</label>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 border border-gray-300 rounded-lg">
                      <input
                        type="text"
                        placeholder={`Descrição do KR ${i}`}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="Meta"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input
                          type="number"
                          placeholder="Atual"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          placeholder="Unidade"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOKRModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors"
                >
                  {editingOKR ? 'Salvar Alterações' : 'Criar OKR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}