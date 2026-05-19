import { useState } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  ChevronDown,
  ChevronRight,
  Plus,
  Target,
  Mail,
  Phone,
  Linkedin,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { AccountDetail } from "./AccountDetailPage";
import { CreatePlayWizard } from "./CreatePlayWizard";

interface PlayStep {
  id: string;
  order: number;
  type: "email" | "linkedin" | "telefone" | "whatsapp" | "reuniao" | "taskpoint";
  title: string;
  daysAfterPrevious: number;
  status: "concluido" | "em_andamento" | "pendente";
  contact?: string;
}

interface PlayItem {
  id: string;
  name: string;
  description: string;
  status: "ativa" | "pausada" | "concluida";
  objective: string;
  touchpointsTotal: number;
  touchpointsDone: number;
  touchpointsLate: number;
  contactsEnrolled: number;
  startDate: string;
  nextAction?: string;
  nextActionDate?: string;
  steps: PlayStep[];
}

const channelIcon = (type: PlayStep["type"]) => {
  const props = { size: 13 };
  switch (type) {
    case "email":      return <Mail {...props} />;
    case "linkedin":   return <Linkedin {...props} />;
    case "telefone":   return <Phone {...props} />;
    case "whatsapp":   return <MessageSquare {...props} />;
    case "reuniao":    return <Calendar {...props} />;
    default:           return <CheckCircle2 {...props} />;
  }
};

const channelColor = (type: PlayStep["type"]) => {
  switch (type) {
    case "email":    return { bg: "#EFF6FF", color: "#3B82F6" };
    case "linkedin": return { bg: "#E0F0FF", color: "#0A66C2" };
    case "telefone": return { bg: "#F0FDF4", color: "#10B981" };
    case "whatsapp": return { bg: "#ECFDF5", color: "#25D366" };
    case "reuniao":  return { bg: "#FEF3C7", color: "#D97706" };
    default:         return { bg: "#F3F4F6", color: "#6B7280" };
  }
};

const statusStyle = (status: PlayItem["status"]) => {
  switch (status) {
    case "ativa":     return { bg: "#F0FDF4", color: "#10B981", label: "Ativa" };
    case "pausada":   return { bg: "#FEF3C7", color: "#D97706", label: "Pausada" };
    case "concluida": return { bg: "#F3F4F6", color: "#6B7280", label: "Concluída" };
  }
};

const stepStatusIcon = (status: PlayStep["status"]) => {
  switch (status) {
    case "concluido":   return <CheckCircle2 size={15} style={{ color: "#10B981" }} />;
    case "em_andamento": return <Clock size={15} style={{ color: "#F59E0B" }} />;
    default:            return <div style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid #D1D5DB" }} />;
  }
};

export function PlaysTab({ account, onOpenPlay }: { account: AccountDetail; onOpenPlay?: (accountId: string, playId: string) => void }) {
  const [wizardOpen, setWizardOpen] = useState(false);

  const mockPlays: PlayItem[] = [
    {
      id: "play-1",
      name: "Onboarding Enterprise",
      description: "Sequência de boas-vindas e ativação para contas Enterprise recém-fechadas.",
      status: "ativa",
      objective: "Engajamento inicial e ativação",
      touchpointsTotal: 8,
      touchpointsDone: 5,
      touchpointsLate: 1,
      contactsEnrolled: 3,
      startDate: "10 Abr 2026",
      nextAction: "Email de follow-up semana 2",
      nextActionDate: "24 Abr 2026",
      steps: [
        { id: "s1", order: 1, type: "email",    title: "Email de boas-vindas",         daysAfterPrevious: 0,  status: "concluido",    contact: "Carlos Silva" },
        { id: "s2", order: 2, type: "linkedin", title: "Conexão no LinkedIn",           daysAfterPrevious: 1,  status: "concluido",    contact: "Carlos Silva" },
        { id: "s3", order: 3, type: "telefone", title: "Ligação de check-in",           daysAfterPrevious: 3,  status: "concluido",    contact: "Maria Santos" },
        { id: "s4", order: 4, type: "email",    title: "Envio de materiais de apoio",   daysAfterPrevious: 5,  status: "concluido",    contact: "Carlos Silva" },
        { id: "s5", order: 5, type: "reuniao",  title: "Reunião de onboarding",         daysAfterPrevious: 7,  status: "concluido",    contact: "Maria Santos" },
        { id: "s6", order: 6, type: "email",    title: "Email de follow-up semana 2",   daysAfterPrevious: 14, status: "em_andamento", contact: "Carlos Silva" },
        { id: "s7", order: 7, type: "whatsapp", title: "Mensagem de engajamento",       daysAfterPrevious: 17, status: "pendente",     contact: "Maria Santos" },
        { id: "s8", order: 8, type: "reuniao",  title: "QBR de 30 dias",                daysAfterPrevious: 30, status: "pendente",     contact: "Carlos Silva" },
      ],
    },
    {
      id: "play-2",
      name: "Expansão de Conta",
      description: "Play de upsell focada em aumentar o ARR de contas com alto potencial de expansão.",
      status: "ativa",
      objective: "Aumento de receita (upsell / cross-sell)",
      touchpointsTotal: 6,
      touchpointsDone: 2,
      touchpointsLate: 0,
      contactsEnrolled: 2,
      startDate: "15 Abr 2026",
      nextAction: "Apresentação de novos módulos",
      nextActionDate: "25 Abr 2026",
      steps: [
        { id: "s1", order: 1, type: "email",    title: "Email de oportunidade identificada", daysAfterPrevious: 0,  status: "concluido",    contact: "Carlos Silva" },
        { id: "s2", order: 2, type: "linkedin", title: "Mensagem LinkedIn executivo",         daysAfterPrevious: 2,  status: "concluido",    contact: "Maria Santos" },
        { id: "s3", order: 3, type: "reuniao",  title: "Apresentação de novos módulos",       daysAfterPrevious: 10, status: "em_andamento", contact: "Carlos Silva" },
        { id: "s4", order: 4, type: "email",    title: "Envio de proposta comercial",         daysAfterPrevious: 12, status: "pendente",     contact: "Carlos Silva" },
        { id: "s5", order: 5, type: "telefone", title: "Negociação e contorno de objeções",   daysAfterPrevious: 17, status: "pendente",     contact: "Maria Santos" },
        { id: "s6", order: 6, type: "reuniao",  title: "Fechamento e assinatura",             daysAfterPrevious: 21, status: "pendente",     contact: "Carlos Silva" },
      ],
    },
    {
      id: "play-3",
      name: "Reativação de Contato Inativo",
      description: "Sequência para reengajar contatos sem interação há mais de 30 dias.",
      status: "pausada",
      objective: "Reengajamento de contatos frios",
      touchpointsTotal: 5,
      touchpointsDone: 5,
      touchpointsLate: 0,
      contactsEnrolled: 1,
      startDate: "01 Fev 2026",
      steps: [
        { id: "s1", order: 1, type: "email",    title: "Email de sondagem de interesse",   daysAfterPrevious: 0,  status: "concluido", contact: "João Oliveira" },
        { id: "s2", order: 2, type: "linkedin", title: "Mensagem com artigo relevante",    daysAfterPrevious: 4,  status: "concluido", contact: "João Oliveira" },
        { id: "s3", order: 3, type: "email",    title: "Email com convite para evento",    daysAfterPrevious: 14, status: "concluido", contact: "João Oliveira" },
        { id: "s4", order: 4, type: "telefone", title: "Ligação para follow-up de convite",daysAfterPrevious: 16, status: "concluido", contact: "João Oliveira" },
        { id: "s5", order: 5, type: "email",    title: "Email de encerramento da play",    daysAfterPrevious: 30, status: "concluido", contact: "João Oliveira" },
      ],
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#F7F8FB" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#212A46", margin: 0 }}>Plays</h2>
          <p style={{ fontSize: 13, color: "#9B9B9B", margin: "4px 0 0 0" }}>
            {mockPlays.length} plays cadastradas para esta conta
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
            background: "#FF5F39", fontSize: 13, fontWeight: 700, color: "white", border: "none", cursor: "pointer",
          }}
        >
          <Plus size={14} />
          Nova Play
        </button>
      </div>

      {/* Plays List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {mockPlays.map((play) => {
          const st = statusStyle(play.status);
          const progress = Math.round((play.touchpointsDone / play.touchpointsTotal) * 100);

          return (
            <div key={play.id} style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Top Row: Title, Status, and Action */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#212A46", margin: 0 }}>{play.name}</h3>
                    <span style={{ background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700 }}>
                      {st.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{play.description}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button 
                    onClick={() => onOpenPlay?.(account.id.toString(), play.id)}
                    style={{ padding: "8px 16px", borderRadius: 6, background: "transparent", border: "1px solid #CBD5E0", color: "#4A5568", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }} 
                    onMouseEnter={e => e.currentTarget.style.background = "#F7F8FB"} 
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    Abrir Play
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Middle Row: Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, background: "#F9FAFB", padding: "12px 16px", borderRadius: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>Objetivo</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Target size={14} color="#6B7280" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{play.objective}</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>Contatos</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={14} color="#6B7280" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{play.contactsEnrolled} inscritos</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>Progresso</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Zap size={14} color={progress === 100 ? "#10B981" : "#FF5F39"} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{play.touchpointsDone} de {play.touchpointsTotal} touchpoints</span>
                  </div>
                </div>
                {play.nextAction && (
                  <div>
                    <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>Próxima Ação</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <TrendingUp size={14} color="#3B82F6" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{play.nextActionDate}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
{wizardOpen && (
  <CreatePlayWizard onClose={() => setWizardOpen(false)} />
)}
</div>
);
}
