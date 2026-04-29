import { useState } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  MoreVertical,
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
  type: "email" | "linkedin" | "telefone" | "whatsapp" | "reuniao" | "tarefa";
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

export function PlaysTab({ account }: { account: AccountDetail }) {
  const [expandedPlay, setExpandedPlay] = useState<string | null>("play-1");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
      startDate: "01 Mar 2026",
      nextAction: undefined,
      nextActionDate: undefined,
      steps: [
        { id: "s1", order: 1, type: "email",    title: "Email de reativação",             daysAfterPrevious: 0,  status: "concluido", contact: "Carlos Silva" },
        { id: "s2", order: 2, type: "linkedin", title: "Curtida e comentário em post",     daysAfterPrevious: 2,  status: "concluido", contact: "Carlos Silva" },
        { id: "s3", order: 3, type: "whatsapp", title: "Mensagem direta WhatsApp",         daysAfterPrevious: 5,  status: "concluido", contact: "Carlos Silva" },
        { id: "s4", order: 4, type: "email",    title: "Email com case de sucesso",        daysAfterPrevious: 8,  status: "concluido", contact: "Carlos Silva" },
        { id: "s5", order: 5, type: "telefone", title: "Ligação final de reativação",      daysAfterPrevious: 12, status: "concluido", contact: "Carlos Silva" },
      ],
    },
  ];

  return (
    <div style={{ padding: 24, background: "#F8FAFC", minHeight: 300 }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#212A46" }}>
          Plays desta conta <span style={{ fontWeight: 400, color: "#6B7280" }}>({mockPlays.length})</span>
        </span>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "#FF5F39", color: "white",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
          onClick={() => setWizardOpen(true)}
        >
          <Plus size={13} /> Adicionar Play
        </button>
      </div>

      {/* ── Play cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mockPlays.map((play) => {
          const isExpanded = expandedPlay === play.id;
          const ss = statusStyle(play.status);
          const progress = Math.round((play.touchpointsDone / play.touchpointsTotal) * 100);

          return (
            <div key={play.id} style={{ background: "white", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden" }}>

              {/* Card header */}
              <div
                style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}
                onClick={() => setExpandedPlay(isExpanded ? null : play.id)}
              >
                {/* Expand chevron */}
                <div style={{ marginTop: 2, color: "#9CA3AF", flexShrink: 0 }}>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                {/* Play icon */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: play.status === "ativa" ? "#FFF5F3" : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {play.status === "ativa"
                    ? <Play size={16} style={{ color: "#FF5F39" }} />
                    : play.status === "pausada"
                    ? <Pause size={16} style={{ color: "#D97706" }} />
                    : <CheckCircle2 size={16} style={{ color: "#6B7280" }} />
                  }
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#212A46" }}>{play.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: ss.bg, color: ss.color }}>
                      {ss.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, lineHeight: 1.4 }}>{play.description}</p>

                  {/* Progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: "#F3F4F6", borderRadius: 9999, overflow: "hidden" }}>
                      <div style={{ width: `${progress}%`, height: "100%", background: play.status === "pausada" ? "#D97706" : "#10B981", borderRadius: 9999, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#6B7280", flexShrink: 0 }}>
                      {play.touchpointsDone}/{play.touchpointsTotal} touchpoints
                    </span>
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6B7280", fontSize: 11 }}>
                    <Users size={12} />
                    <span>{play.contactsEnrolled} contato{play.contactsEnrolled !== 1 ? "s" : ""}</span>
                  </div>
                  {play.nextActionDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#3B82F6" }}>
                      <Clock size={12} />
                      <span>{play.nextActionDate}</span>
                    </div>
                  )}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === play.id ? null : play.id); }}
                      style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF" }}
                    >
                      <MoreVertical size={15} />
                    </button>
                    {openMenu === play.id && (
                      <div
                        style={{ position: "absolute", right: 0, top: 28, background: "white", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, minWidth: 160 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {[
                          play.status === "ativa" ? "Pausar Play" : "Reativar Play",
                          "Ver no Módulo de Plays",
                          "Adicionar contato",
                          "Duplicar Play",
                          "Remover da conta",
                        ].map((item, i) => (
                          <button
                            key={i}
                            onClick={() => setOpenMenu(null)}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 12, color: i === 4 ? "#EF4444" : "#374151", background: "none", border: "none", cursor: "pointer", borderBottom: i < 4 ? "1px solid #F3F4F6" : "none" }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: objective + steps */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #F3F4F6", padding: "14px 16px 16px 64px" }}>

                  {/* Objective */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <Target size={13} style={{ color: "#FF5F39" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Objetivo:</span>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>{play.objective}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>Início: {play.startDate}</span>
                    {play.touchpointsLate > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#EF4444", background: "#FEF2F2", padding: "2px 8px", borderRadius: 9999, marginLeft: 6 }}>
                        <AlertCircle size={10} /> {play.touchpointsLate} em atraso
                      </span>
                    )}
                  </div>

                  {/* Next action callout */}
                  {play.nextAction && (
                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <TrendingUp size={13} style={{ color: "#3B82F6" }} />
                      <span style={{ fontSize: 11, color: "#1E40AF", fontWeight: 600 }}>Próxima ação:</span>
                      <span style={{ fontSize: 11, color: "#1E40AF" }}>{play.nextAction}</span>
                      <span style={{ fontSize: 11, color: "#93C5FD", marginLeft: "auto" }}>{play.nextActionDate}</span>
                    </div>
                  )}

                  {/* Steps timeline */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {play.steps.map((step, idx) => {
                      const ch = channelColor(step.type);
                      const isLast = idx === play.steps.length - 1;
                      return (
                        <div key={step.id} style={{ display: "flex", gap: 10, position: "relative" }}>
                          {/* Timeline line */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 20 }}>
                            <div style={{ marginTop: 10 }}>{stepStatusIcon(step.status)}</div>
                            {!isLast && <div style={{ width: 2, flex: 1, background: "#E5E7EB", margin: "4px 0" }} />}
                          </div>

                          {/* Step content */}
                          <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10, paddingTop: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              {/* Channel badge */}
                              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 9999, background: ch.bg, color: ch.color }}>
                                {channelIcon(step.type)} {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: step.status === "em_andamento" ? 700 : 500, color: step.status === "pendente" ? "#9CA3AF" : "#212A46" }}>
                                {step.title}
                              </span>
                              {step.contact && (
                                <span style={{ fontSize: 10, color: "#9CA3AF" }}>→ {step.contact}</span>
                              )}
                              {step.daysAfterPrevious > 0 && (
                                <span style={{ fontSize: 10, color: "#C4C9D4", marginLeft: "auto" }}>
                                  D+{step.daysAfterPrevious}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CreatePlayWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreatePlay={(play) => {
          console.log("Play adicionada à conta:", play);
          setWizardOpen(false);
        }}
      />
    </div>
  );
}