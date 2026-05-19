import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, UserCircle2, Link2 } from "lucide-react";
import { createPortal } from "react-dom";

interface Contact {
  id: number;
  name: string;
  role: string;
  email: string;
}

interface OrgNode {
  contactId: number;
  children: OrgNode[];
}

interface OrgChartProps {
  contacts: Contact[];
  onEditContact?: (contact: Contact) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#FF5F39", "#212A46", "#4F7FFF", "#22C55E", "#A855F7",
  "#EF4444", "#F59E0B", "#06B6D4", "#EC4899", "#84CC16",
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ── Fixed-position portal dropdown ──────────────────────────────────────────

interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  align?: "center" | "right";
  minWidth?: number;
}

function DropdownPortal({ anchorRef, onClose, children, align = "center", minWidth = 200 }: DropdownPortalProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (anchorRef.current) {
      setRect(anchorRef.current.getBoundingClientRect());
    }
  }, [anchorRef]);

  if (!rect) return null;

  const top = rect.bottom + 6;
  let left: number;
  if (align === "right") {
    left = rect.right - minWidth;
  } else {
    left = rect.left + rect.width / 2 - minWidth / 2;
  }
  // Clamp to viewport
  left = Math.max(8, Math.min(left, window.innerWidth - minWidth - 8));

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
      />
      {/* Menu */}
      <div
        style={{
          position: "fixed",
          top,
          left,
          width: minWidth,
          zIndex: 9999,
          background: "white",
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

// ── OrgNodeCard ──────────────────────────────────────────────────────────────

interface OrgNodeCardProps {
  node: OrgNode;
  contacts: Contact[];
  depth: number;
  onAddChild: (parentId: number, childId: number) => void;
  onRemove: (contactId: number) => void;
  occupiedIds: Set<number>;
  isRoot?: boolean;
  onEditContact?: (contact: Contact) => void;
}

function OrgNodeCard({
  node,
  contacts,
  depth,
  onAddChild,
  onRemove,
  occupiedIds,
  isRoot = false,
  onEditContact,
}: OrgNodeCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const addBtnRef = useRef<HTMLButtonElement>(null);
  const removeBtnRef = useRef<HTMLButtonElement>(null);

  const contact = contacts.find((c) => c.id === node.contactId);
  if (!contact) return null;

  const availableToAdd = contacts.filter(
    (c) => !occupiedIds.has(c.id)
  );

  const hasChildren = node.children.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Connector from parent */}
      {!isRoot && (
        <div style={{ width: 2, height: 24, background: "#CBD5E0", flexShrink: 0 }} />
      )}

      {/* Card */}
      <div
        style={{
          background: "white",
          border: `2px solid ${depth === 0 ? "#FF5F39" : "#E2E8F0"}`,
          borderRadius: 12,
          padding: "12px 16px",
          minWidth: 160,
          maxWidth: 200,
          textAlign: "center",
          boxShadow: depth === 0 ? "0 4px 16px #FF5F3920" : "0 2px 8px #00000010",
          transition: "border-color 0.15s",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: avatarColor(contact.id),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 15,
            margin: "0 auto 8px",
            flexShrink: 0,
          }}
        >
          {getInitials(contact.name)}
        </div>

        <div
          onClick={() => onEditContact?.(contact)}
          style={{ fontWeight: 700, fontSize: 12, color: "#212A46", lineHeight: 1.3, marginBottom: 2, cursor: onEditContact ? "pointer" : "default" }}
        >
          {contact.name}
        </div>
        <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.3, marginBottom: 2 }}>
          {contact.role}
        </div>
        <div style={{ fontSize: 10, color: "#A0AEC0", lineHeight: 1.3 }}>
          {contact.email}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
          {/* Collapse toggle */}
          {hasChildren && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expandir" : "Recolher"}
              style={{
                background: "#F1F5F9", border: "none", borderRadius: 6,
                padding: "3px 6px", cursor: "pointer", color: "#6B7280",
                display: "flex", alignItems: "center", fontSize: 10, gap: 2,
              }}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {node.children.length}
            </button>
          )}

          {/* Add subordinate */}
          <button
            ref={addBtnRef}
            onClick={() => { setShowAddMenu((v) => !v); setShowConfirmRemove(false); }}
            title="Adicionar subordinado"
            style={{
              background: "#F1F5F9", border: "none", borderRadius: 6,
              padding: "3px 6px", cursor: "pointer", color: "#6B7280",
              display: "flex", alignItems: "center",
            }}
          >
            <Plus size={12} />
          </button>

          {showAddMenu && (
            <DropdownPortal anchorRef={addBtnRef} onClose={() => setShowAddMenu(false)} align="center" minWidth={220}>
              <div style={{ maxHeight: 240, overflowY: "auto", padding: "6px 0" }}>
                {availableToAdd.length === 0 ? (
                  <div style={{ padding: "12px 16px", fontSize: 12, color: "#9B9B9B", textAlign: "center" }}>
                    Todos os contatos já estão no organograma
                  </div>
                ) : (
                  availableToAdd.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onAddChild(node.contactId, c.id); setShowAddMenu(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "8px 14px",
                        background: "none", border: "none",
                        cursor: "pointer", textAlign: "left",
                        fontSize: 12, color: "#212A46",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div
                        style={{
                          width: 26, height: 26, borderRadius: "50%",
                          background: avatarColor(c.id), color: "white",
                          fontWeight: 700, fontSize: 10,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "#9B9B9B" }}>{c.role}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DropdownPortal>
          )}

          {/* Remove (non-root only) */}
          {!isRoot && (
            <>
              <button
                ref={removeBtnRef}
                onClick={() => { setShowConfirmRemove((v) => !v); setShowAddMenu(false); }}
                title="Remover do organograma"
                style={{
                  background: "#FEF2F2", border: "none", borderRadius: 6,
                  padding: "3px 6px", cursor: "pointer", color: "#EF4444",
                  display: "flex", alignItems: "center",
                }}
              >
                <Trash2 size={12} />
              </button>

              {showConfirmRemove && (
                <DropdownPortal anchorRef={removeBtnRef} onClose={() => setShowConfirmRemove(false)} align="right" minWidth={210}>
                  <div style={{ padding: "14px 16px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#212A46" }}>
                      Remover do organograma?
                    </p>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "#9B9B9B" }}>
                      Subordinados também serão removidos.
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => { onRemove(node.contactId); setShowConfirmRemove(false); }}
                        style={{ flex: 1, background: "#EF4444", color: "white", border: "none", borderRadius: 6, padding: "5px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        Remover
                      </button>
                      <button
                        onClick={() => setShowConfirmRemove(false)}
                        style={{ flex: 1, background: "#F1F5F9", color: "#6B7280", border: "none", borderRadius: 6, padding: "5px 0", fontSize: 12, cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </DropdownPortal>
              )}
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 2, height: 20, background: "#CBD5E0" }} />
          <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
            {node.children.map((child, i) => (
              <div
                key={child.contactId}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}
              >
                {/* Horizontal connector */}
                {node.children.length > 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: i === 0 ? "50%" : 0,
                      right: i === node.children.length - 1 ? "50%" : 0,
                      height: 2,
                      background: "#CBD5E0",
                    }}
                  />
                )}
                <div style={{ paddingLeft: i > 0 ? 16 : 0, paddingRight: i < node.children.length - 1 ? 16 : 0 }}>
                  <OrgNodeCard
                    node={child}
                    contacts={contacts}
                    depth={depth + 1}
                    onAddChild={onAddChild}
                    onRemove={onRemove}
                    occupiedIds={occupiedIds}
                    onEditContact={onEditContact}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOccupiedIds(nodes: OrgNode[]): Set<number> {
  const ids = new Set<number>();
  function traverse(n: OrgNode) {
    ids.add(n.contactId);
    n.children.forEach(traverse);
  }
  nodes.forEach(traverse);
  return ids;
}

function addChildToTree(nodes: OrgNode[], parentId: number, childId: number): OrgNode[] {
  return nodes.map((n) => {
    if (n.contactId === parentId) {
      return { ...n, children: [...n.children, { contactId: childId, children: [] }] };
    }
    return { ...n, children: addChildToTree(n.children, parentId, childId) };
  });
}

function removeFromTree(nodes: OrgNode[], contactId: number): OrgNode[] {
  return nodes
    .filter((n) => n.contactId !== contactId)
    .map((n) => ({ ...n, children: removeFromTree(n.children, contactId) }));
}

// ── OrgChart ─────────────────────────────────────────────────────────────────

export function OrgChart({ contacts, onEditContact }: OrgChartProps) {
  const [roots, setRoots] = useState<OrgNode[]>([]);
  const [showAddRootMenu, setShowAddRootMenu] = useState(false);
  const addRootBtnRef = useRef<HTMLButtonElement>(null);

  const occupiedIds = getOccupiedIds(roots);
  const availableRoots = contacts.filter((c) => !occupiedIds.has(c.id));

  const handleAddChild = useCallback((parentId: number, childId: number) => {
    setRoots((prev) => addChildToTree(prev, parentId, childId));
  }, []);

  const handleRemove = useCallback((contactId: number) => {
    setRoots((prev) => removeFromTree(prev, contactId));
  }, []);

  function handleAddRoot(contactId: number) {
    setRoots((prev) => [...prev, { contactId, children: [] }]);
    setShowAddRootMenu(false);
  }

  if (contacts.length === 0) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", color: "#9B9B9B", fontSize: 13 }}>
        <UserCircle2 size={40} style={{ color: "#CBD5E0", marginBottom: 12 }} />
        <p style={{ margin: 0 }}>Nenhum contato cadastrado para montar o organograma.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Sticky header ── */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #F1F5F9", background: "#F7F8FB", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 size={15} style={{ color: "#FF5F39" }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: "#212A46" }}>Organograma</span>
            <span style={{ fontSize: 11, color: "#9B9B9B", background: "#E2E8F0", borderRadius: 9999, padding: "1px 8px", fontWeight: 600 }}>
              {occupiedIds.size} contato{occupiedIds.size !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              ref={addRootBtnRef}
              onClick={() => setShowAddRootMenu((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: "#FF5F39", color: "white",
                border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700,
              }}
            >
              <Plus size={13} />
              Adicionar nó raiz
            </button>

            {showAddRootMenu && (
              <DropdownPortal
                anchorRef={addRootBtnRef}
                onClose={() => setShowAddRootMenu(false)}
                align="right"
                minWidth={230}
              >
                <div style={{ maxHeight: 280, overflowY: "auto", padding: "6px 0" }}>
                  {availableRoots.length === 0 ? (
                    <div style={{ padding: "12px 16px", fontSize: 12, color: "#9B9B9B", textAlign: "center" }}>
                      Todos os contatos já estão no organograma
                    </div>
                  ) : (
                    availableRoots.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleAddRoot(c.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", padding: "8px 14px",
                          background: "none", border: "none",
                          cursor: "pointer", textAlign: "left",
                          fontSize: 12, color: "#212A46",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: avatarColor(c.id),
                            color: "white", fontWeight: 700, fontSize: 10,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: "#9B9B9B" }}>{c.role}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </DropdownPortal>
            )}

            {roots.length > 0 && (
              <button
                onClick={() => setRoots([])}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  background: "#F1F5F9", color: "#6B7280",
                  border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                }}
              >
                Resetar
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "#9B9B9B" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={11} /> clique no card para adicionar subordinados
          </span>
          <span>•</span>
          <span>arraste para reorganizar (em breve)</span>
        </div>
      </div>

      {/* ── Scrollable tree area ── */}
      <div
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",
          padding: "32px 24px",
          minHeight: 200,
          maxHeight: 420,
        }}
      >
        {roots.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#9B9B9B", fontSize: 13 }}>
            Clique em "Adicionar nó raiz" para começar o organograma.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "nowrap", justifyContent: "center", minWidth: "max-content", margin: "0 auto" }}>
            {roots.map((root) => (
              <OrgNodeCard
                key={root.contactId}
                node={root}
                contacts={contacts}
                depth={0}
                onAddChild={handleAddChild}
                onRemove={handleRemove}
                occupiedIds={occupiedIds}
                isRoot
                onEditContact={onEditContact}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
