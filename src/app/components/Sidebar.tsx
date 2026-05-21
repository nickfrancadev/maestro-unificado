import {
  Home,
  User,
  Play,
  BarChart2,
  List,
  Rocket,
  HelpCircle,
  Settings,
  Building2,
  Users,
  FolderOpen,
  PieChart,
  FileText,
  MessageSquare,
  Megaphone,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AIAssistant } from "./AIAssistant";

interface SidebarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

const navItems = [
  { icon: Home, key: "home" },
  { icon: User, key: "person", active: true },
  { icon: Megaphone, key: "gtm" },
  { icon: Play, key: "plays" },
  { icon: BarChart2, key: "analytics" },
  { icon: Rocket, key: "marketplace" },
  { icon: Target, key: "campaigns" },
  { icon: Settings, key: "integrations" },
];

const audienceItems = [
  { label: "Contas", icon: Building2, key: "contas" },
  { label: "Contatos", icon: Users, key: "contatos" },
  { label: "Lista de contas", icon: List, key: "lista-contas" },
  { label: "Segmentos", icon: PieChart, key: "segmentos" },
];

export function Sidebar(_props: SidebarProps = {}) {
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname === "/" ? "home" : location.pathname.slice(1);

  return (
    <div className="flex h-full" style={{ minHeight: "100vh" }}>
      {/* Icon nav column */}
      <div
        className="flex flex-col items-center py-4 gap-1 shrink-0"
        style={{ width: 64, background: "#212A46" }}
      >
        {/* Logo */}
        <div className="mb-6 mt-1">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 44, height: 44, background: "#FF5F39" }}
          >
            <svg width="26" height="26" viewBox="2 6 46 49" fill="none">
              <path
                d="M48 6L48 38C48 43 44 47 39 47C34 47 30 43 30 38C30 33 34 29 39 29C41 29 43 30 44.5 31.5V13L20 19V46C20 51 16 55 11 55C6 55 2 51 2 46C2 41 6 37 11 37C13 37 15 38 16.5 39.5V6L48 6Z"
                fill="white"
              />
            </svg>
          </div>
        </div>

        {/* Nav icons */}
        <div className="flex flex-col gap-1 w-full items-center flex-1 justify-center">
          {navItems.map(({ icon: Icon, key }) => {
            const pageKey = key === "analytics" ? "dashboard" : key === "person" ? "contas" : key;
            const isActive = currentPage === pageKey;

            return (
              <button
                key={key}
                onClick={() => navigate(pageKey === "home" ? "/" : "/" + pageKey)}
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                  width: 44,
                  height: 44,
                  background: isActive ? "#FF5F39" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                }}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        {/* Bottom icons */}
        <div className="flex flex-col gap-1 items-center pb-2">
          {/* AI Assistant Button */}
          <button
            onClick={() => setShowAIAssistant(true)}
            className="relative flex items-center justify-center rounded-lg transition-colors hover:bg-white/10 mb-2"
            style={{ width: 44, height: 44, color: "white" }}
          >
            <MessageSquare size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF5F39] rounded-full border-2 border-[#212A46]" />
          </button>

          {/* PT/EN toggle */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-white" style={{ fontSize: 9, fontWeight: 600 }}>PT</span>
            <div
              className="rounded-full flex items-center px-0.5"
              style={{ width: 26, height: 14, background: "#FF5F39" }}
            >
              <div className="rounded-full bg-white" style={{ width: 10, height: 10, marginLeft: "auto" }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>EN</span>
          </div>
          <button
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, border: "2px solid rgba(255,255,255,0.5)", color: "white" }}
          >
            <HelpCircle size={18} />
          </button>
          <button
            className="flex items-center justify-center rounded-lg"
            style={{ width: 40, height: 40, color: "rgba(255,255,255,0.7)" }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Sub-navigation panel removed */}
      <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />
    </div>
  );
}