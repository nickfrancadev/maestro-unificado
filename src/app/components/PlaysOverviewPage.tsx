import { useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  ChevronDown,
  Calendar,
  Target,
  Activity,
  AlertCircle,
} from "lucide-react";
import { CreatePlayWizard } from "./CreatePlayWizard";
import { NewPlayData } from "./PlayDetailPage";

interface PlayItem {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  type: "1-to-few" | "pre-play" | "sales-play" | "cs-play";
  progress: number;
  nextTouchpoint: string;
  touchpointsTotal: number;
  touchpointsCompleted: number;
  temperature: "hot" | "warm" | "cold";
}

interface AccountPlay {
  id: string;
  name: string;
  logo?: string;
  healthScore: number;
  playsActive: number;
  playsTotal: number;
  plays: PlayItem[];
  segment: string;
  lastActivity: string;
}

interface PlaysOverviewPageProps {
  onSelectPlay?: (accountId: string, playId: string) => void;
  onOpenNewPlay?: (play: NewPlayData) => void;
}

export function PlaysOverviewPage({ onSelectPlay, onOpenNewPlay }: PlaysOverviewPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused" | "completed">("all");
  const [filterType, setFilterType] = useState<"all" | "1-to-few" | "pre-play" | "sales-play" | "cs-play">("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set(["1", "2", "3"]));
  const [wizardOpen, setWizardOpen] = useState(false);

  // Mock data - empresas com suas plays
  const accountsData: AccountPlay[] = [
    {
      id: "1",
      name: "STAR BANK",
      healthScore: 85,
      playsActive: 4,
      playsTotal: 6,
      segment: "Financeiro",
      lastActivity: "Há 2 horas",
      plays: [
        {
          id: "p1",
          name: "Envio de proposta",
          status: "active",
          type: "sales-play",
          progress: 65,
          nextTouchpoint: "Email - Amanhã 14:00",
          touchpointsTotal: 4,
          touchpointsCompleted: 1,
          temperature: "hot",
        },
        {
          id: "p-linkedin-ads",
          name: "Aquecimento ABM com LinkedIn Ads",
          status: "active",
          type: "sales-play",
          progress: 35,
          nextTouchpoint: "LinkedIn Ad - 22 Jan",
          touchpointsTotal: 4,
          touchpointsCompleted: 2,
          temperature: "warm",
        },
        {
          id: "p2",
          name: "Reativação Leads Antigos",
          status: "active",
          type: "sales-play",
          progress: 40,
          nextTouchpoint: "LinkedIn - Hoje 16:00",
          touchpointsTotal: 10,
          touchpointsCompleted: 4,
          temperature: "warm",
        },
        {
          id: "p3",
          name: "Follow-up Proposta Enterprise",
          status: "active",
          type: "sales-play",
          progress: 80,
          nextTouchpoint: "Reunião - 15 Mar",
          touchpointsTotal: 8,
          touchpointsCompleted: 6,
          temperature: "hot",
        },
        {
          id: "p4",
          name: "Nurturing - Base Instalada",
          status: "paused",
          type: "sales-play",
          progress: 25,
          nextTouchpoint: "-",
          touchpointsTotal: 15,
          touchpointsCompleted: 4,
          temperature: "cold",
        },
        {
          id: "p5",
          name: "Onboarding Novos Clientes",
          status: "completed",
          type: "sales-play",
          progress: 100,
          nextTouchpoint: "-",
          touchpointsTotal: 6,
          touchpointsCompleted: 6,
          temperature: "warm",
        },
      ],
    },
    {
      id: "2",
      name: "Natura",
      healthScore: 72,
      playsActive: 2,
      playsTotal: 3,
      segment: "Varejo",
      lastActivity: "Há 1 dia",
      plays: [
        {
          id: "p6",
          name: "Expansão Regional - Sul",
          status: "active",
          type: "sales-play",
          progress: 55,
          nextTouchpoint: "Call - Hoje 15:00",
          touchpointsTotal: 9,
          touchpointsCompleted: 5,
          temperature: "warm",
        },
        {
          id: "p7",
          name: "Upsell Premium Services",
          status: "active",
          type: "sales-play",
          progress: 30,
          nextTouchpoint: "Email - 14 Mar",
          touchpointsTotal: 7,
          touchpointsCompleted: 2,
          temperature: "warm",
        },
        {
          id: "p8",
          name: "Pesquisa de Satisfação",
          status: "completed",
          type: "sales-play",
          progress: 100,
          nextTouchpoint: "-",
          touchpointsTotal: 4,
          touchpointsCompleted: 4,
          temperature: "warm",
        },
      ],
    },
    {
      id: "3",
      name: "Magazine Luiza",
      healthScore: 68,
      playsActive: 1,
      playsTotal: 2,
      segment: "E-commerce",
      lastActivity: "Há 3 dias",
      plays: [
        {
          id: "p9",
          name: "Cross-sell Digital Solutions",
          status: "active",
          type: "sales-play",
          progress: 45,
          nextTouchpoint: "Reunião - 16 Mar",
          touchpointsTotal: 11,
          touchpointsCompleted: 5,
          temperature: "cold",
        },
        {
          id: "p10",
          name: "Renewal 2024",
          status: "paused",
          type: "sales-play",
          progress: 20,
          nextTouchpoint: "-",
          touchpointsTotal: 8,
          touchpointsCompleted: 2,
          temperature: "cold",
        },
      ],
    },
    {
      id: "4",
      name: "Nubank",
      healthScore: 92,
      playsActive: 4,
      playsTotal: 4,
      segment: "Fintech",
      lastActivity: "Há 30 min",
      plays: [
        {
          id: "p11",
          name: "Partnership Q2 2024",
          status: "active",
          type: "sales-play",
          progress: 75,
          nextTouchpoint: "Call - Hoje 17:00",
          touchpointsTotal: 10,
          touchpointsCompleted: 7,
          temperature: "hot",
        },
        {
          id: "p12",
          name: "Product Demo - New Features",
          status: "active",
          type: "sales-play",
          progress: 60,
          nextTouchpoint: "Demo - Amanhã 10:00",
          touchpointsTotal: 5,
          touchpointsCompleted: 3,
          temperature: "hot",
        },
        {
          id: "p13",
          name: "Executive Alignment",
          status: "active",
          type: "sales-play",
          progress: 50,
          nextTouchpoint: "Email - 13 Mar",
          touchpointsTotal: 6,
          touchpointsCompleted: 3,
          temperature: "warm",
        },
        {
          id: "p14",
          name: "Technical Integration",
          status: "active",
          type: "sales-play",
          progress: 35,
          nextTouchpoint: "Workshop - 18 Mar",
          touchpointsTotal: 12,
          touchpointsCompleted: 4,
          temperature: "warm",
        },
      ],
    },
    {
      id: "5",
      name: "iFood",
      healthScore: 58,
      playsActive: 1,
      playsTotal: 3,
      segment: "Delivery",
      lastActivity: "Há 5 dias",
      plays: [
        {
          id: "p15",
          name: "Re-engagement Campaign",
          status: "active",
          type: "sales-play",
          progress: 15,
          nextTouchpoint: "Email - Hoje 18:00",
          touchpointsTotal: 14,
          touchpointsCompleted: 2,
          temperature: "cold",
        },
        {
          id: "p16",
          name: "Account Review 2023",
          status: "completed",
          type: "sales-play",
          progress: 100,
          nextTouchpoint: "-",
          touchpointsTotal: 3,
          touchpointsCompleted: 3,
          temperature: "warm",
        },
        {
          id: "p17",
          name: "Expansion Proposal",
          status: "paused",
          type: "sales-play",
          progress: 10,
          nextTouchpoint: "-",
          touchpointsTotal: 9,
          touchpointsCompleted: 1,
          temperature: "cold",
        },
      ],
    },
  ];

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "paused":
        return "#F59E0B";
      case "completed":
        return "#6B7280";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play size={14} fill="#10B981" style={{ color: "#10B981" }} />;
      case "paused":
        return <Pause size={14} style={{ color: "#F59E0B" }} />;
      case "completed":
        return <CheckCircle2 size={14} style={{ color: "#6B7280" }} />;
      default:
        return null;
    }
  };

  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case "hot":
        return "#EF4444";
      case "warm":
        return "#F59E0B";
      case "cold":
        return "#3B82F6";
      default:
        return "#9CA3AF";
    }
  };

  const getTemperatureLabel = (temp: string) => {
    switch (temp) {
      case "hot":
        return "Quente";
      case "warm":
        return "Morna";
      case "cold":
        return "Fria";
      default:
        return "-";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  };

  // Filtrar por status e busca
  const filteredAccounts = accountsData.map(account => {
    const filteredPlays = account.plays.filter(play => {
      const matchesStatus = filterStatus === "all" || play.status === filterStatus;
      const matchesType = filterType === "all" || play.type === filterType;
      const matchesSearch = 
        play.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });

    return { ...account, plays: filteredPlays };
  }).filter(account => account.plays.length > 0);

  // Calcular métricas gerais
  const totalPlays = accountsData.reduce((sum, acc) => sum + acc.playsTotal, 0);
  const activePlays = accountsData.reduce((sum, acc) => sum + acc.playsActive, 0);
  const totalTouchpoints = accountsData.reduce((sum, acc) => 
    sum + acc.plays.reduce((pSum, play) => pSum + play.touchpointsTotal, 0), 0
  );
  const completedTouchpoints = accountsData.reduce((sum, acc) => 
    sum + acc.plays.reduce((pSum, play) => pSum + play.touchpointsCompleted, 0), 0
  );
  const executionRate = Math.round((completedTouchpoints / totalTouchpoints) * 100);

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#EEF0F5" }}>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="font-['Euclid_Circular_A',sans-serif] mb-1"
            style={{ fontSize: 28, fontWeight: 600, color: "#212A46" }}
          >
            Gestão de Plays
          </h1>
          <p
            className="font-['Euclid_Circular_A',sans-serif]"
            style={{ fontSize: 14, color: "#828282" }}
          >
            Organize e acompanhe todas as plays ativas por conta
          </p>
        </div>

        {/* Métricas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className="bg-white rounded-xl p-5 border border-[#d8d8d8]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 40, height: 40, background: "#FFF5F3" }}
              >
                <Activity size={20} style={{ color: "#FF5F39" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Total de Plays
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  {totalPlays}
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
                <Play size={20} style={{ color: "#10B981" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Plays Ativas
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  {activePlays}
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
                <Target size={20} style={{ color: "#3B82F6" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Touchpoints
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  {completedTouchpoints}/{totalTouchpoints}
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
                style={{ width: 40, height: 40, background: "#FFF7ED" }}
              >
                <TrendingUp size={20} style={{ color: "#F59E0B" }} />
              </div>
              <div>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 11, color: "#828282" }}
                >
                  Taxa de Execução
                </p>
                <p
                  className="font-['Euclid_Circular_A',sans-serif]"
                  style={{ fontSize: 24, fontWeight: 700, color: "#212A46" }}
                >
                  {executionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              size={18}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}
            />
            <input
              type="text"
              placeholder="Buscar por conta ou play..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
              style={{ fontSize: 14, color: "#212A46", outline: "none" }}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-['Euclid_Circular_A',sans-serif] transition-all"
              style={{
                fontSize: 13,
                fontWeight: 600,
                background: filterStatus !== "all" ? "#FFF5F3" : "white",
                color: filterStatus !== "all" ? "#FF5F39" : "#6B7280",
                border: `1px solid ${filterStatus !== "all" ? "#FF5F39" : "#d8d8d8"}`,
              }}
            >
              <Filter size={14} />
              {filterStatus === "all" ? "Status" : filterStatus === "active" ? "Ativas" : filterStatus === "paused" ? "Pausadas" : "Concluídas"}
              <ChevronDown size={14} style={{ transform: statusDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            {statusDropdownOpen && (
              <div
                className="absolute top-full mt-1 left-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 overflow-hidden"
                style={{ minWidth: 160 }}
              >
                {[
                  { value: "all",       label: "Todas",       dot: "#9CA3AF" },
                  { value: "active",    label: "Ativas",      dot: "#10B981" },
                  { value: "paused",    label: "Pausadas",    dot: "#F59E0B" },
                  { value: "completed", label: "Concluídas",  dot: "#6B7280" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterStatus(opt.value as typeof filterStatus); setStatusDropdownOpen(false); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left font-['Euclid_Circular_A',sans-serif] hover:bg-[#F9FAFB] transition-colors"
                    style={{
                      fontSize: 13,
                      fontWeight: filterStatus === opt.value ? 700 : 500,
                      color: filterStatus === opt.value ? "#212A46" : "#6B7280",
                      background: filterStatus === opt.value ? "#F9FAFB" : "transparent",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.dot, flexShrink: 0, display: "inline-block" }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-['Euclid_Circular_A',sans-serif] transition-all"
              style={{
                fontSize: 13,
                fontWeight: 600,
                background: filterType !== "all" ? "#FFF5F3" : "white",
                color: filterType !== "all" ? "#FF5F39" : "#6B7280",
                border: `1px solid ${filterType !== "all" ? "#FF5F39" : "#d8d8d8"}`,
              }}
            >
              <Filter size={14} />
              {filterType === "all" ? "Tipo" : filterType === "1-to-few" ? "1-to-few" : filterType === "pre-play" ? "Pre-play" : filterType === "sales-play" ? "Sales-play" : "CS-play"}
              <ChevronDown size={14} style={{ transform: typeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            {typeDropdownOpen && (
              <div
                className="absolute top-full mt-1 left-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 overflow-hidden"
                style={{ minWidth: 160 }}
              >
                {[
                  { value: "all",        label: "Todos",       dot: "#9CA3AF" },
                  { value: "1-to-few",   label: "1-to-few",    dot: "#3B82F6" },
                  { value: "pre-play",   label: "Pre-play",    dot: "#8B5CF6" },
                  { value: "sales-play", label: "Sales-play",  dot: "#10B981" },
                  { value: "cs-play",    label: "CS-play",     dot: "#F59E0B" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterType(opt.value as typeof filterType); setTypeDropdownOpen(false); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left font-['Euclid_Circular_A',sans-serif] hover:bg-[#F9FAFB] transition-colors"
                    style={{
                      fontSize: 13,
                      fontWeight: filterType === opt.value ? 700 : 500,
                      color: filterType === opt.value ? "#212A46" : "#6B7280",
                      background: filterType === opt.value ? "#F9FAFB" : "transparent",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.dot, flexShrink: 0, display: "inline-block" }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="px-5 py-2.5 rounded-lg font-['Euclid_Circular_A',sans-serif] flex items-center gap-2 transition-all"
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: "#FF5F39",
              color: "white",
              border: "none",
            }}
            onClick={() => setWizardOpen(true)}
          >
            <Plus size={18} />
            Nova Play
          </button>
        </div>

        {/* Grid de Contas */}
        <div className="space-y-0">
          {filteredAccounts.map((account) => {
            const isExpanded = expandedAccounts.has(account.id);
            const activePlaysCount = account.plays.filter(p => p.status === "active").length;

            return (
              <div
                key={account.id}
                className="bg-transparent border-b border-[#E5E7EB] last:border-b-0"
              >
                {/* Header da Conta */}
                <div
                  className="py-4 px-6 cursor-pointer hover:bg-white/50 transition-colors"
                  onClick={() => toggleAccount(account.id)}
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Left - Logo e Nome */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                      <div
                        className="flex items-center justify-center rounded-lg shrink-0"
                        style={{ width: 44, height: 44, background: "#FF5F39", color: "white", fontSize: 14, fontWeight: 700 }}
                      >
                        {account.name.substring(0, 2)}
                      </div>
                      <div>
                        <h3
                          className="font-['Euclid_Circular_A',sans-serif] mb-0.5"
                          style={{ fontSize: 15, fontWeight: 600, color: "#212A46" }}
                        >
                          {account.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-full font-['Euclid_Circular_A',sans-serif]"
                            style={{ fontSize: 10, fontWeight: 600, background: "#F3F4F6", color: "#6B7280" }}
                          >
                            {account.segment}
                          </span>
                          <span
                            className="font-['Euclid_Circular_A',sans-serif]"
                            style={{ fontSize: 11, color: "#9CA3AF" }}
                          >
                            •
                          </span>
                          <span
                            className="font-['Euclid_Circular_A',sans-serif]"
                            style={{ fontSize: 11, color: "#9CA3AF" }}
                          >
                            {account.lastActivity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle - Stats */}
                    <div className="flex items-center gap-6 flex-1">
                      <div className="flex items-center gap-2">
                        <Play size={16} style={{ color: "#10B981" }} />
                        <span
                          className="font-['Euclid_Circular_A',sans-serif]"
                          style={{ fontSize: 14, color: "#212A46", fontWeight: 600 }}
                        >
                          {account.playsActive}/{account.playsTotal}
                        </span>
                        <span
                          className="font-['Euclid_Circular_A',sans-serif]"
                          style={{ fontSize: 12, color: "#828282" }}
                        >
                          plays
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="font-['Euclid_Circular_A',sans-serif]"
                          style={{ fontSize: 11, color: "#828282" }}
                        >
                          Health
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-20 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "#F3F4F6" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${account.healthScore}%`,
                                background: getHealthColor(account.healthScore),
                              }}
                            />
                          </div>
                          <span
                            className="font-['Euclid_Circular_A',sans-serif] w-6 text-right"
                            style={{ fontSize: 12, fontWeight: 600, color: getHealthColor(account.healthScore) }}
                          >
                            {account.healthScore}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right - Expand Icon */}
                    <ChevronDown
                      size={20}
                      style={{
                        color: "#6B7280",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  </div>
                </div>

                {/* Lista de Plays Expandida */}
                {isExpanded && (
                  <div className="bg-white/30">
                    {account.plays.map((play, index) => (
                      <div
                        key={play.id}
                        className="py-3 px-6 pl-20 hover:bg-white/60 transition-colors cursor-pointer border-t border-[#E5E7EB]/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlay?.(account.id, play.id);
                        }}
                      >
                        <div className="flex items-center justify-between gap-6">
                          {/* Left - Nome e Status */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="shrink-0">
                              {getStatusIcon(play.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4
                                className="font-['Euclid_Circular_A',sans-serif] mb-0.5 truncate"
                                style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
                              >
                                {play.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span
                                  className="px-2 py-0.5 rounded-full font-['Euclid_Circular_A',sans-serif]"
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 600,
                                    background: `${getTemperatureColor(play.temperature)}20`,
                                    color: getTemperatureColor(play.temperature),
                                  }}
                                >
                                  🌡️ {getTemperatureLabel(play.temperature)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Middle - Progress */}
                          <div className="flex items-center gap-3 w-48">
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ background: "#F3F4F6" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${play.progress}%`,
                                  background: getStatusColor(play.status),
                                }}
                              />
                            </div>
                            <span
                              className="font-['Euclid_Circular_A',sans-serif] w-10 text-right"
                              style={{ fontSize: 12, fontWeight: 600, color: "#FF5F39" }}
                            >
                              {play.progress}%
                            </span>
                          </div>

                          {/* Right - Touchpoints e Próximo */}
                          <div className="flex items-center gap-4 min-w-[280px]">
                            <span
                              className="font-['Euclid_Circular_A',sans-serif]"
                              style={{ fontSize: 11, color: "#6B7280" }}
                            >
                              {play.touchpointsCompleted}/{play.touchpointsTotal} touchpoints
                            </span>
                            {play.nextTouchpoint !== "-" && (
                              <>
                                <span style={{ color: "#D1D5DB" }}>•</span>
                                <div className="flex items-center gap-1.5">
                                  <Clock size={11} style={{ color: "#9CA3AF" }} />
                                  <span
                                    className="font-['Euclid_Circular_A',sans-serif]"
                                    style={{ fontSize: 11, color: "#6B7280" }}
                                  >
                                    {play.nextTouchpoint}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Botão Nova Play */}
                    <div className="py-2 px-6 pl-20 border-t border-[#E5E7EB]/50">
                      <button
                        className="py-2 px-4 rounded-lg font-['Euclid_Circular_A',sans-serif] border border-dashed border-[#d8d8d8] hover:border-[#FF5F39] hover:bg-[#FFF5F3] transition-all flex items-center gap-2"
                        style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Plus size={14} />
                        Nova Play
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredAccounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle size={48} style={{ color: "#D1D5DB", marginBottom: 16 }} />
            <p
              className="font-['Euclid_Circular_A',sans-serif] mb-2"
              style={{ fontSize: 16, fontWeight: 600, color: "#6B7280" }}
            >
              Nenhuma play encontrada
            </p>
            <p
              className="font-['Euclid_Circular_A',sans-serif]"
              style={{ fontSize: 14, color: "#9CA3AF" }}
            >
              Tente ajustar os filtros ou busca
            </p>
          </div>
        )}
      </div>
      <CreatePlayWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreatePlay={(play) => {
          setWizardOpen(false);
          onOpenNewPlay?.(play);
        }}
      />
    </div>
  );
}