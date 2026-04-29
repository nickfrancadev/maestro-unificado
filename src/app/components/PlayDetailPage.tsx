import { useState } from "react";
import {
  ArrowLeft, Building2, Users, Package, Wrench, GraduationCap,
  Calendar, Target, Plus, Clock, Megaphone, Star, Zap,
  CheckCircle2, Circle, ChevronDown, ChevronRight,
} from "lucide-react";
import { GtmProduto, GtmPublico, GtmMomento } from "./gtmStore";

/* ─── Types ─────────────────────────────────────────────── */
export interface PlayContaData {
  id: string;
  name: string;
  segment: string;
  initials: string;
  color: string;
  healthScore: number;
}

export interface PlayDossieContaData {
  id: string;
  name: string;
  segment?: string;
}

export interface PlayDossieContatoData {
  id: string;
  name: string;
  role?: string;
  company?: string;
}

export interface NewPlayData {
  id: string;
  name: string;
  type: string;
  objective: string;
  status: "active";
  createdAt: string;
  contas: PlayContaData[];
  dossiêsContas: PlayDossieContaData[];
  dossiêsContatos: PlayDossieContatoData[];
  produto: GtmProduto | null;
  publicos: GtmPublico[];
  momentos: GtmMomento[];
  withAI?: boolean;
}

interface PlayDetailPageProps {
  play: NewPlayData;
  onBack: () => void;
}

/* ─── Helpers ────────────────────────────────────────────── */
const healthColor = (s: number) => s >= 80 ? "#10B981" : s >= 60 ? "#F59E0B" : "#EF4444";

const typeColors: Record<string, { bg: string; color: string }> = {
  "Pre-play":   { bg: "#EDE9FE", color: "#7C3AED" },
  "Sales-play": { bg: "#DCFCE7", color: "#166534" },
  "CS-play":    { bg: "#FEF9C3", color: "#854D0E" },
};

const TipoIcon = ({ tipo }: { tipo: string }) => {
  if (tipo === "Produto") return <Package size={13} />;
  if (tipo === "Serviço") return <Wrench size={13} />;
  return <GraduationCap size={13} />;
};

/* ─── Component ──────────────────────────────────────────── */
export function PlayDetailPage({ play, onBack }: PlayDetailPageProps) {
  const [dossieTab, setDossieTab] = useState<"contas" | "contatos">("contas");
  const typeStyle = typeColors[play.type] ?? { bg: "#F3F4F6", color: "#374151" };

  return (
    <div style={{ background: "#EEF0F5", minHeight: "100vh", fontFamily: "'Euclid Circular A', 'Inria Sans', sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "white", borderBottom: "1px solid #E5E7EB",
        padding: "14px 32px", display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "#6B7280", padding: "6px 10px", borderRadius: 8,
          }}
        >
          <ArrowLeft size={16} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Voltar</span>
        </button>

        <div style={{ width: 1, height: 20, background: "#E5E7EB" }} />

        {/* breadcrumb */}
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Plays</span>
        <ChevronRight size={13} color="#D1D5DB" />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>{play.name}</span>

        <div style={{ flex: 1 }} />

        {/* status chip */}
        <span style={{
          padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
          background: "#DCFCE7", color: "#166534",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
          Ativa
        </span>

        {/* type badge */}
        <span style={{
          padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
          background: typeStyle.bg, color: typeStyle.color,
        }}>
          {play.type}
        </span>
      </div>

      <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Play title + meta ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#212A46", marginBottom: 6 }}>
            {play.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Target size={13} color="#9CA3AF" />
            <span style={{ fontSize: 13, color: "#6B7280" }}>{play.objective}</span>
            <span style={{ color: "#D1D5DB" }}>•</span>
            <Clock size={13} color="#9CA3AF" />
            <span style={{ fontSize: 13, color: "#6B7280" }}>Criada em {play.createdAt}</span>
          </div>
        </div>

        {/* ── 3-column summary ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Contas */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFF5F3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={15} color="#FF5F39" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contas</span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#FF5F39" }}>{play.contas.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {play.contas.map((conta) => (
                <div key={conta.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                    background: conta.color, display: "flex", alignItems: "center",
                    justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700,
                  }}>
                    {conta.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#212A46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conta.name}</p>
                    <p style={{ fontSize: 10, color: "#9CA3AF" }}>{conta.segment}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 32, height: 3, borderRadius: 9999, background: "#F3F4F6", overflow: "hidden" }}>
                      <div style={{ width: `${conta.healthScore}%`, height: "100%", background: healthColor(conta.healthScore), borderRadius: 9999 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: healthColor(conta.healthScore) }}>{conta.healthScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Produto */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={15} color="#3571DE" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Produto / Serviço</span>
            </div>
            {play.produto ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 9999, fontSize: 10,
                    background: play.produto.tipo === "Produto" ? "#DCFCE7" : play.produto.tipo === "Serviço" ? "#FFEDD5" : "#DBEAFE",
                    color: play.produto.tipo === "Produto" ? "#166534" : play.produto.tipo === "Serviço" ? "#FF5F39" : "#1e40af",
                  }}>
                    <TipoIcon tipo={play.produto.tipo} />
                    {play.produto.tipo}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#212A46", marginBottom: 4 }}>{play.produto.nome}</p>
                <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, marginBottom: 8 }}>{play.produto.descricao}</p>
                <div style={{ display: "flex", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, color: "#9CA3AF" }}>Preço</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#212A46" }}>R$ {play.produto.preco.toLocaleString("pt-BR")}/{play.produto.unidade}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: "#9CA3AF" }}>PMF Rating</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Star size={11} color="#F59E0B" fill="#F59E0B" />
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#212A46" }}>{play.produto.pmfRating.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhum produto selecionado</p>
            )}
          </div>

          {/* Públicos + Momentos */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Megaphone size={15} color="#10B981" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>GTM</span>
            </div>
            {play.publicos.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Públicos</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {play.publicos.map((pub) => (
                    <span key={pub.id} style={{
                      padding: "3px 9px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
                      background: "#EFF6FF", color: "#3571DE",
                    }}>
                      {pub.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {play.momentos.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Momentos de Mercado</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {play.momentos.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={11} color="#FF5F39" />
                      <span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{m.titulo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: Dossiês + Touchpoints ── */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>

          {/* Dossiês */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", alignSelf: "start" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Dossiês</p>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", marginBottom: 14 }}>
              {(["contas", "contatos"] as const).map((tab) => {
                const isActive = dossieTab === tab;
                const count = tab === "contas" ? play.dossiêsContas.length : play.dossiêsContatos.length;
                return (
                  <button
                    key={tab}
                    onClick={() => setDossieTab(tab)}
                    style={{
                      padding: "7px 14px", fontSize: 11, fontWeight: 700,
                      color: isActive ? "#FF6D4A" : "#6B7280",
                      background: "transparent", border: "none",
                      borderBottom: isActive ? "2px solid #FF5F39" : "2px solid transparent",
                      marginBottom: -2, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {tab === "contas" ? <Building2 size={11} /> : <Users size={11} />}
                    {tab === "contas" ? "Contas" : "Contatos"}
                    {count > 0 && (
                      <span style={{
                        background: "#FF5F39", color: "white", fontSize: 9,
                        fontWeight: 700, borderRadius: 9999, padding: "1px 5px",
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {dossieTab === "contas"
                ? play.dossiêsContas.map((d) => (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 8, background: "#FFF5F3", border: "1px solid #FFE4DC",
                  }}>
                    <Building2 size={13} color="#FF5F39" />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>{d.name}</p>
                      {d.segment && <p style={{ fontSize: 10, color: "#9CA3AF" }}>{d.segment}</p>}
                    </div>
                  </div>
                ))
                : play.dossiêsContatos.map((d) => (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE",
                  }}>
                    <Users size={13} color="#3571DE" />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>{d.name}</p>
                      {d.role && d.company && <p style={{ fontSize: 10, color: "#9CA3AF" }}>{d.role} · {d.company}</p>}
                    </div>
                  </div>
                ))
              }
              {(dossieTab === "contas" ? play.dossiêsContas : play.dossiêsContatos).length === 0 && (
                <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>Nenhum dossiê vinculado</p>
              )}
            </div>
          </div>

          {/* Touchpoints — empty state */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0F4FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={15} color="#3571DE" />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Touchpoints</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF" }}>0 touchpoints cadastrados</p>
                </div>
              </div>
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: "#3571DE", color: "white",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                <Plus size={13} />
                Adicionar Touchpoint
              </button>
            </div>

            {/* Empty illustration */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "48px 32px", borderRadius: 10,
              border: "2px dashed #E5E7EB", background: "#FAFAFA",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: "#F3F4F6",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
              }}>
                <Circle size={28} color="#D1D5DB" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nenhum touchpoint ainda</p>
              <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
                Adicione o primeiro touchpoint para começar a executar esta play.
              </p>
              <button style={{
                marginTop: 16, display: "flex", alignItems: "center", gap: 6,
                padding: "9px 20px", borderRadius: 8,
                border: "1.5px dashed #D1D5DB", background: "transparent",
                color: "#6B7280", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                <Plus size={13} />
                Adicionar primeiro touchpoint
              </button>
            </div>

            {/* Progress bar placeholder */}
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "#F3F4F6", overflow: "hidden" }}>
                <div style={{ width: "0%", height: "100%", background: "#10B981", borderRadius: 9999 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>0%</span>
              <span style={{ fontSize: 11, color: "#D1D5DB" }}>0 / 0 concluídos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}