import { useState } from "react";
import { X, FileText, Check, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountDossier {
  id: number;
  title: string;
  date: string;
  author: string;
}

interface SegmentCreateModalProps {
  accountName?: string;
  accountDossiers?: AccountDossier[];
  onClose: () => void;
  onSave?: (data: { titulo: string; descricao: string; linkedDossierId: number | null }) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #CBD5E0",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  color: "#212A46",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "none",
  resize: "none",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export function SegmentCreateModal({
  accountName,
  accountDossiers = [],
  onClose,
  onSave,
}: SegmentCreateModalProps) {
  // Step 1: título + descrição | Step 2: vincular dossiê
  const [step, setStep] = useState<1 | 2>(1);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const MAX_DESC = 150;

  const [linkedDossierId, setLinkedDossierId] = useState<number | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);

  const canContinue = titulo.trim().length > 0;

  const handleSave = () => {
    onSave?.({ titulo: titulo.trim(), descricao, linkedDossierId });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(33,42,70,0.4)",
          zIndex: 1100, backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 520, maxWidth: "95vw",
          background: "white", borderRadius: 16, zIndex: 1200,
          boxShadow: "0 24px 64px rgba(33,42,70,0.22)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "#F7F8FB", border: "none", borderRadius: 8,
            cursor: "pointer", padding: 6, display: "flex",
            color: "#6B7280", boxShadow: "none", zIndex: 1,
          }}
        >
          <X size={16} />
        </button>

        {/* ── Step indicators ── */}
        <div style={{ display: "flex", gap: 6, padding: "22px 28px 0", alignItems: "center" }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                height: 4, borderRadius: 99, flex: 1,
                background: s <= step ? "#FF5F39" : "#E2E8F0",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {/* ════════════ STEP 1 ════════════ */}
        {step === 1 && (
          <div style={{ padding: "28px 28px 24px" }}>
            <h2 style={{ margin: "0 0 28px", fontSize: 20, fontWeight: 700, color: "#212A46", lineHeight: 1.3 }}>
              Dê um título para o seu novo segmento
            </h2>

            {/* Título */}
            <div style={{ marginBottom: 24 }}>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título"
                style={inputStyle}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && canContinue && setStep(2)}
              />
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#212A46", marginBottom: 8 }}>
                Descrição
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.slice(0, MAX_DESC))}
                placeholder="Descrição"
                rows={4}
                style={{ ...inputStyle, minHeight: 100 }}
              />
              <p style={{ margin: "4px 0 0", textAlign: "right", fontSize: 12, color: "#9B9B9B" }}>
                {descricao.length}/{MAX_DESC}
              </p>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 28px", borderRadius: 8, border: "1px solid #CBD5E0",
                  background: "white", fontSize: 14, fontWeight: 600, color: "#6B7280",
                  cursor: "pointer", boxShadow: "none",
                }}
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canContinue}
                style={{
                  padding: "10px 36px", borderRadius: 8, border: "none",
                  background: canContinue ? "#4B5563" : "#D1D5DB",
                  color: "white", fontSize: 14, fontWeight: 600,
                  cursor: canContinue ? "pointer" : "not-allowed",
                  boxShadow: "none", transition: "background 0.15s",
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 2 ════════════ */}
        {step === 2 && (
          <div style={{ padding: "28px 28px 24px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {accountName ? `Conta: ${accountName}` : "Novo segmento"}
            </p>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#212A46" }}>
              {titulo}
            </h2>
            {descricao && (
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6B7280" }}>{descricao}</p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "#F1F5F9", margin: "20px 0" }} />

            {/* Vincular Dossiê de Conta */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: "#EFF6FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FileText size={14} style={{ color: "#2563EB" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#212A46" }}>
                    Vincular Dossiê de Conta
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>
                    Opcional — associe um dossiê de conta a este segmento
                  </p>
                </div>
              </div>

              {/* Dossier selector */}
              {accountDossiers.length === 0 ? (
                /* No dossiers available */
                <div style={{
                  border: "1.5px dashed #CBD5E0", borderRadius: 10, padding: "18px 16px",
                  textAlign: "center", color: "#9B9B9B", fontSize: 13,
                }}>
                  Nenhum dossiê de conta disponível
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  {/* Trigger */}
                  <button
                    type="button"
                    onClick={() => setDossierOpen((o) => !o)}
                    style={{
                      ...inputStyle,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", textAlign: "left", resize: "none", padding: "10px 14px",
                      border: `1px solid ${dossierOpen ? "#FF5F39" : "#CBD5E0"}`,
                    }}
                  >
                    <span style={{ color: linkedDossierId ? "#212A46" : "#9B9B9B", fontSize: 14 }}>
                      {linkedDossierId
                        ? accountDossiers.find((d) => d.id === linkedDossierId)?.title
                        : "Selecionar dossiê"}
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        color: "#9B9B9B", flexShrink: 0,
                        transform: dossierOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.15s",
                      }}
                    />
                  </button>

                  {dossierOpen && (
                    <>
                      <div onClick={() => setDossierOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                        background: "white", border: "1px solid #E2E8F0", borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(33,42,70,0.12)", overflow: "hidden",
                      }}>
                        {/* None option */}
                        <div
                          onClick={() => { setLinkedDossierId(null); setDossierOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                            cursor: "pointer", borderBottom: "1px solid #F1F5F9",
                            background: linkedDossierId === null ? "#FFF4F1" : "transparent",
                          }}
                          onMouseEnter={(e) => { if (linkedDossierId !== null) e.currentTarget.style.background = "#FAFBFD"; }}
                          onMouseLeave={(e) => { if (linkedDossierId !== null) e.currentTarget.style.background = "transparent"; }}
                        >
                          <span style={{ flex: 1, fontSize: 13, color: "#9B9B9B", fontStyle: "italic" }}>
                            Nenhum
                          </span>
                          {linkedDossierId === null && <Check size={13} style={{ color: "#FF5F39" }} />}
                        </div>

                        {accountDossiers.map((d) => {
                          const selected = linkedDossierId === d.id;
                          return (
                            <div
                              key={d.id}
                              onClick={() => { setLinkedDossierId(d.id); setDossierOpen(false); }}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                                cursor: "pointer", background: selected ? "#FFF4F1" : "transparent",
                                borderBottom: "1px solid #F8FAFC", transition: "background 0.1s",
                              }}
                              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "#FAFBFD"; }}
                              onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                            >
                              <div style={{
                                width: 30, height: 30, borderRadius: 8, background: "#EFF6FF",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                <FileText size={13} style={{ color: "#2563EB" }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#212A46", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {d.title}
                                </p>
                                <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>
                                  por {d.author} · {d.date}
                                </p>
                              </div>
                              {selected && <Check size={14} style={{ color: "#FF5F39", flexShrink: 0 }} />}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "10px 28px", borderRadius: 8, border: "1px solid #CBD5E0",
                  background: "white", fontSize: 14, fontWeight: 600, color: "#6B7280",
                  cursor: "pointer", boxShadow: "none",
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "10px 36px", borderRadius: 8, border: "none",
                  background: "#FF5F39", color: "white",
                  fontSize: 14, fontWeight: 700,
                  cursor: "pointer", boxShadow: "none",
                }}
              >
                Criar segmento
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
