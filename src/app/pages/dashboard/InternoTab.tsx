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
import { PlaysDashboard } from "./internal/PlaysDashboard";

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
const INK = "#212A46";
const INK_MUTED = "#6B7280";
const BORDER = "#E5E7EB";

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

/**
 * Contador da operação.
 *
 * Mais compacto do que era: agora divide a aba com o Dashboard de plays, que é
 * o bloco que responde "como estamos indo". Estes números são o inventário —
 * contexto, não manchete —, então passaram a caber em quatro colunas sem virar
 * uma parede de dígitos de 40px.
 */
function StatCardItem({ stat }: { stat: StatCard }) {
  const animated = useCountUp(stat.value);
  const Icon = stat.icon;
  const accent = stat.accent ?? ORANGE;
  const isAlert = stat.accent === RED;

  return (
    <div
      className="bg-white rounded-xl p-4 border flex items-center gap-3"
      style={{ borderColor: BORDER, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{
          width: 36,
          height: 36,
          background: isAlert ? "#FEF2F2" : "#FFF1ED",
        }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p
          className="font-['Euclid_Circular_A',sans-serif] tabular-nums leading-none"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: isAlert ? RED : INK,
          }}
        >
          {animated}
        </p>
        <p
          className="font-['Euclid_Circular_A',sans-serif] leading-tight mt-1 truncate"
          style={{ fontSize: 12, fontWeight: 500, color: INK_MUTED }}
          title={stat.label}
        >
          {stat.label}
        </p>
      </div>
    </div>
  );
}

/**
 * Aba "Interno" do Dashboard.
 *
 * Três blocos, do mais acionável para o mais estático:
 *  1. Dashboard de plays — os dados de `/admin/health` do produto real
 *  2. Operação — o inventário da conta (contas, contatos, dossiês, plays, TPs)
 *  3. Consumo de IA — o histórico de créditos do time
 */
export function InternoTab() {
  return (
    <div className="space-y-8">
      <PlaysDashboard />

      <section className="space-y-4">
        <div>
          <h2
            className="font-['Euclid_Circular_A',sans-serif]"
            style={{ fontSize: 20, fontWeight: 700, color: INK }}
          >
            Operação
          </h2>
          <p
            className="font-['Euclid_Circular_A',sans-serif] mt-0.5"
            style={{ fontSize: 13, color: INK_MUTED }}
          >
            O que já está cadastrado e em andamento na conta
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCardItem key={stat.id} stat={stat} />
          ))}
        </div>
      </section>

      <ConsumoHistorico />
    </div>
  );
}
