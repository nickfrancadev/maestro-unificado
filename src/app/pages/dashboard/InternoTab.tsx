import {
  Building2,
  User,
  FileText,
  Play,
  CheckCircle2,
  MousePointerClick,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useCountUp } from "./useCountUp";
import { ConsumoHistorico } from "./ConsumoHistorico";

interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: typeof Building2;
  /** cor de destaque do número e do ícone (padrão: laranja do projeto) */
  accent?: string;
}

const ORANGE = "#FF5F39";
const RED = "#EF4444";

const stats: StatCard[] = [
  { id: "contas", label: "Contas cadastradas", value: 34, icon: Building2 },
  { id: "contatos", label: "Contatos cadastrados", value: 95, icon: User },
  { id: "dossies", label: "Dossiês criados", value: 56, icon: FileText },
  { id: "plays-criados", label: "Plays criados", value: 35, icon: Play },
  {
    id: "plays-finalizados",
    label: "Plays finalizados",
    value: 0,
    icon: CheckCircle2,
  },
  {
    id: "tp-criados",
    label: "Touchpoints criados",
    value: 421,
    icon: MousePointerClick,
  },
  {
    id: "tp-finalizados",
    label: "Touchpoints finalizados",
    value: 17,
    icon: Check,
  },
  {
    id: "tp-atrasados",
    label: "Touchpoints atrasados",
    value: 331,
    icon: AlertTriangle,
    accent: RED,
  },
];

function StatCardItem({ stat }: { stat: StatCard }) {
  const animated = useCountUp(stat.value);
  const Icon = stat.icon;
  const accent = stat.accent ?? ORANGE;
  const isAlert = stat.accent === RED;

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] flex flex-col gap-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: 40,
            height: 40,
            background: isAlert ? "#FEF2F2" : "#FFF5F3",
          }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
        <p
          className="font-['Euclid_Circular_A',sans-serif] leading-tight"
          style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}
        >
          {stat.label}
        </p>
      </div>
      <p
        className="font-['Euclid_Circular_A',sans-serif] tabular-nums"
        style={{
          fontSize: 40,
          fontWeight: 700,
          color: isAlert ? RED : "#212A46",
          lineHeight: 1,
        }}
      >
        {animated}
      </p>
    </div>
  );
}

export function InternoTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCardItem key={stat.id} stat={stat} />
        ))}
      </div>
      <ConsumoHistorico />
    </div>
  );
}
