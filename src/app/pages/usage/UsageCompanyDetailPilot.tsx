/**
 * Detalhe do Cliente — LAYOUT PILOTO (`PILOT_COMPANY_ID` apenas).
 *
 * Segue a referência enviada pelo time de CS:
 *  - topo: mix de plays + card de saúde, com o funil na coluna direita
 *    (começando em Contatos — as contagens de cadastro moram no card "Conta");
 *  - meio: os mesmos 10 StatTiles (compartilhados via `MetricTiles`);
 *  - base: card "Conta" (agora com MRR, renovação, CSM, último contato, NPS e
 *    tickets — feedback Spina) ao lado da tabela de usuários;
 *  - novas seções (feedback Bernardo): interações dos e-mails de touchpoints
 *    atrasados e área de inputs qualitativos.
 *
 * A referência NÃO traz "Composição do score" nem "Evolução do score" — o
 * piloto segue a referência; se fizerem falta, é exatamente o que o teste com
 * uma conta única existe para descobrir.
 */
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, FlaskConical, Users } from 'lucide-react';
import type { Company } from './data/types';
import { periodSearch, usePeriodParam } from './usePeriodParam';
import { BUCKET_META, computeHealth } from './lib/health';
import {
  adoptionFunnel,
  computeMetrics,
  lastAccessAt,
  lastActivityAt,
  playTypeMix,
  previousPeriod,
  userStats,
} from './lib/selectors';
import {
  PLAYBOOK,
  antecedentSignals,
  bucketTenure,
  bucketTransition,
  daysToRenewal,
  formatTenure,
  journeyStage,
} from './lib/cs';
import { formatBRL, formatDaysAgo, formatNumber } from './lib/format';
import { PeriodFilter } from './components/PeriodFilter';
import { HealthScoreRing } from './components/HealthScoreRing';
import { SignalChips } from './components/SignalChips';
import { AdoptionFunnel } from './components/AdoptionFunnel';
import { PlayTypeMix } from './components/PlayTypeMix';
import { UsersTable } from './components/UsersTable';
import { MetricTiles } from './components/MetricTiles';
import { FactRow } from './components/FactRow';
import { CardHeader } from './components/CardHeader';
import { LateTpEmailsCard } from './components/LateTpEmailsCard';
import { QualitativeNotes } from './components/QualitativeNotes';

const NAVY = '#212A46';
const MUTED = '#64748B';

/** Chips do score + antecedentes num só colar, severidade primeiro. */
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function PilotBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 leading-none whitespace-nowrap"
      style={{ fontSize: 11, fontWeight: 600, color: '#6D28D9', borderColor: '#C4B5FD', background: '#F5F3FF' }}
      title="Novo layout em teste apenas nesta conta — as demais seguem no layout atual."
    >
      <FlaskConical size={12} aria-hidden="true" />
      layout piloto
    </span>
  );
}

export function UsageCompanyDetailPilot({ company }: { company: Company }) {
  const navigate = useNavigate();
  const [period, setPeriod] = usePeriodParam();

  const backHref = `/uso-clientes${periodSearch(period)}`;

  const data = useMemo(() => {
    const prev = previousPeriod(period);
    const health = computeHealth(company, period);
    return {
      health,
      prevHealth: computeHealth(company, prev),
      metrics: computeMetrics(company, period),
      prevMetrics: computeMetrics(company, prev),
      // A referência começa o funil em Contatos: as contagens de cadastro
      // (contas) moram no card "Conta", não numa barra que nunca varia.
      funnel: adoptionFunnel(company, period).filter((s) => s.stage !== 'Contas'),
      mix: playTypeMix(company, period),
      users: userStats(company, period),
      tenure: bucketTenure(company, period),
      antecedents: antecedentSignals(company, period),
      stage: journeyStage(company),
    };
  }, [company, period]);

  const { health, prevHealth, metrics: m, prevMetrics: p, funnel, mix, users } = data;
  const meta = BUCKET_META[health.bucket];
  const transition = bucketTransition(health, prevHealth);
  const tenureLabel = formatTenure(data.tenure);
  const playbook = PLAYBOOK[health.bucket];
  const renewalDays = daysToRenewal(company);

  return (
    <div className="flex-1 overflow-auto bg-[#edf2f5] p-6">
      <div className="max-w-[1600px] mx-auto space-y-4 font-['Euclid_Circular_A',sans-serif]">
        {/* breadcrumb + período */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Trilha de navegação" className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Link
                to={backHref}
                className="rounded transition-colors hover:text-[#212A46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
                style={{ fontSize: 13, fontWeight: 600, color: MUTED }}
              >
                Uso de Clientes
              </Link>
              <ChevronRight size={14} style={{ color: MUTED }} aria-hidden="true" />
              <span aria-current="page" style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                {company.name}
              </span>
            </span>
            <PilotBadge />
          </nav>

          <PeriodFilter period={period} onChange={setPeriod} />
        </div>

        {/*
         * FAIXAS 1+2 — saúde | mix à esquerda, funil na coluna da direita
         * acompanhando a altura inteira.
         *
         * A saúde vem PRIMEIRO: é a identidade da conta (nome, score, faixa,
         * ação sugerida) e o motivo de a página ter sido aberta. O mix é uma
         * das evidências, e evidência não abre a leitura.
         *
         * `items-stretch` no grid externo + `h-full` no funil: a borda de baixo
         * do funil cai EXATAMENTE onde cai a dos tiles. Antes o funil parava na
         * altura do próprio conteúdo e a coluna da direita terminava no meio da
         * página; e pôr o funil como terceira coluna da faixa de cima resolvia o
         * recorte mas esticava o card de mix, abrindo um vão embaixo dele.
         */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-stretch">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <section
                aria-label="Saúde do cliente"
                className="bg-white rounded-xl border border-[#d8d8d8] p-5 flex flex-col items-center justify-center gap-3 h-full"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <HealthScoreRing score={health.score} bucket={health.bucket} size={120} showLabel />
                <h1 className="text-center leading-tight" style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>
                  {company.name}
                </h1>

                {/* tempo no estado + estágio: "crítico há 3d" ≠ "há 60d" */}
                <p className="text-center" style={{ fontSize: 12, color: MUTED }}>
                  <span style={{ color: meta.color, fontWeight: 600 }}>
                    {meta.label}
                    {tenureLabel ? ` ${tenureLabel}` : ''}
                  </span>
                  {' · '}
                  {data.stage.label}
                  {transition && (
                    <>
                      {' · '}
                      <span style={{ fontWeight: 600, color: transition.dir === 'worsened' ? '#92400E' : MUTED }}>
                        {BUCKET_META[transition.from].label} → {BUCKET_META[transition.to].label} no período
                      </span>
                    </>
                  )}
                </p>

                <SignalChips
                  signals={[...health.signals, ...data.antecedents].sort(
                    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
                  )}
                  max={3}
                />

                <p className="text-center" style={{ fontSize: 11, color: MUTED }}>
                  Playbook: {playbook.label}
                </p>
              </section>

              <PlayTypeMix mix={mix} />
            </div>

            {/* os MESMOS 10 tiles do layout atual (fonte única: `MetricTiles`):
                5 colunas de mesma largura e, com `auto-rows-fr`, de mesma altura */}
            <section aria-label="Métricas do período">
              <MetricTiles m={m} p={p} />
            </section>
          </div>

          <AdoptionFunnel stages={funnel} />
        </div>

        {/* FAIXA 3 — Conta (enriquecida) + usuários */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-4 items-stretch">
          <section
            aria-label="Conta"
            className="bg-white rounded-xl border border-[#d8d8d8] p-5 h-full"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {/* mesmo cabeçalho dos demais blocos: título + subtítulo DENTRO do
                box (antes esta seção tinha h2 dentro e a de usuários, fora) */}
            <CardHeader title="Conta" subtitle="Contrato, dono e sinais fora do produto" />
            <FactRow label="Último acesso" value={formatDaysAgo(lastAccessAt(company))} pending />
            <FactRow label="Última atividade" value={formatDaysAgo(lastActivityAt(company))} />
            <FactRow label="Plano" value={company.plan} />
            <FactRow
              label="Usuários (ativos/total)"
              value={`${formatNumber(m.activeUsers)}/${formatNumber(company.users.length)}`}
            />
            <FactRow label="Assentos" value={formatNumber(company.seats)} />
            <FactRow label="MRR" value={formatBRL(company.mrr)} />
            <FactRow
              label="Renovação"
              value={renewalDays === null ? '—' : `em ${renewalDays}d`}
            />
            <FactRow label="CSM" value={company.csm ?? '—'} />
            <FactRow
              label="Último contato do CS"
              value={formatDaysAgo(company.lastCsContactAt ?? null)}
              pending
              pendingText="Registro de contato viria do CRM — integração pendente; valor de exemplo."
            />
            <FactRow
              label="NPS (última resposta)"
              value={typeof company.nps === 'number' ? String(company.nps) : 'Sem resposta'}
              pending
              pendingText="NPS ainda não integrado ao produto — valor de exemplo."
            />
            <FactRow
              label="Tickets abertos"
              value={formatNumber(company.openTickets ?? 0)}
              pending
              pendingText="Suporte ainda não integrado ao produto — valor de exemplo."
            />
            <p className="mt-3 inline-flex items-center gap-1.5" style={{ fontSize: 11, color: MUTED }}>
              <Users size={12} aria-hidden="true" />
              {formatNumber(company.accountsCount)} contas ·{' '}
              {formatNumber(company.contactsCount)} contatos
            </p>
          </section>

          {/* título DENTRO do card, como todos os outros blocos da página */}
          <section aria-label="Usuários" className="min-w-0">
            <UsersTable
              rows={users}
              title="Usuários"
              subtitle="Atividade por usuário no período"
            />
          </section>
        </div>

        {/* FAIXA 4 — novos dados (Bernardo): e-mails de touchpoints atrasados +
            inputs qualitativos, em duas colunas de mesma altura */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <LateTpEmailsCard company={company} period={period} />
          <QualitativeNotes companyId={company.id} />
        </div>

        <button
          type="button"
          onClick={() => navigate(backHref)}
          className="rounded-lg border border-[#d8d8d8] bg-white px-3 py-2 transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] focus-visible:ring-offset-2"
          style={{ fontSize: 13, fontWeight: 600, color: MUTED }}
        >
          ← Voltar ao portfólio
        </button>
      </div>
    </div>
  );
}
