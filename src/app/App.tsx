import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./AppLayout";
import { HomePage } from "./components/HomePage";
import { AccountsPage } from "./components/AccountsPage";
import { Home } from "./pages/Home";
import { Marketplace } from "./pages/Marketplace";
import { PlaysCanvas } from "./pages/PlaysCanvas";
import { GtmPage } from "./components/gtm/GtmPage";
import { PlaysOverviewPage } from "./components/PlaysOverviewPage";
import { TouchpointManagerPage } from "./components/TouchpointManagerPage";
import { NewPlayData } from "./components/PlayDetailPage";
import { Integrations } from "./integrations/Integrations";
import { LinkedInOAuthCallback } from "./integrations/LinkedInOAuthCallback";
import { AdsPipelineDocs } from "./pages/AdsPipelineDocs";
import { CampaignList } from "./campaigns/CampaignList";
import { CampaignWizard } from "./campaigns/CampaignWizard";
import { CampaignAnalytics } from "./campaigns/CampaignAnalytics";
import { AdvancedCampaignCreator } from "./campaigns/AdvancedCampaignCreator";
import { UsagePortfolio } from "./pages/usage/UsagePortfolio";
import { UsageCompanyDetail } from "./pages/usage/UsageCompanyDetail";
import { LandingPagesOverview } from "./landingPages/overview/LandingPagesOverview";
import { CreateSelector } from "./landingPages/create/CreateSelector";
import { LandingPageEditor } from "./landingPages/editor/LandingPageEditor";
import { PublicPage } from "./landingPages/public/PublicPage";
import { LandingPageAnalytics } from "./landingPages/analytics/LandingPageAnalytics";

function PlaysRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state as { accountId?: string; playId?: string; newPlay?: NewPlayData } | null) ?? null;
  const [newPlay, setNewPlay] = useState<NewPlayData | null>(incoming?.newPlay ?? null);

  const handleSelectPlay = (_accountId: string, playId: string) =>
    navigate(`/plays/${playId}`);
  const handleOpenNewPlay = (play: NewPlayData) => setNewPlay(play);

  if (newPlay)
    return <TouchpointManagerPage newPlayData={newPlay} onBack={() => setNewPlay(null)} />;
  return <PlaysOverviewPage onSelectPlay={handleSelectPlay} onOpenNewPlay={handleOpenNewPlay} />;
}

function PlayDetailRoute() {
  const navigate = useNavigate();
  const { playId } = useParams<{ playId: string }>();
  return (
    <TouchpointManagerPage
      playId={playId}
      onBack={() => navigate('/plays')}
    />
  );
}

function ContasRoute() {
  const navigate = useNavigate();
  return (
    <AccountsPage
      onOpenPlay={(_accountId: string, playId: string) =>
        navigate(`/plays/${playId}`)
      }
    />
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full" style={{ color: "#9B9B9B", fontSize: 18 }}>
      <div className="text-center">
        <p style={{ fontWeight: 700, color: "#212A46", fontSize: 22, marginBottom: 8 }}>{title}</p>
        <p>Esta tela será implementada em breve.</p>
      </div>
    </div>
  );
}

export default function App() {
  // No GitHub Pages o app é servido de um subdiretório; o Vite injeta esse
  // caminho em BASE_URL. O BrowserRouter espera o basename sem a barra final
  // ('/maestro-unificado'), e sem basename nenhum quando servido da raiz.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <BrowserRouter basename={basename}>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/auth/linkedin/callback" element={<LinkedInOAuthCallback />} />
        <Route path="/docs/ads" element={<AdsPipelineDocs />} />
        <Route path="/p/:slug" element={<PublicPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="contas" element={<ContasRoute />} />
          <Route path="dashboard" element={<Home />} />
          <Route path="plays" element={<PlaysRoute />} />
          <Route path="plays/:playId" element={<PlayDetailRoute />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="canvas" element={<PlaysCanvas />} />
          <Route path="gtm" element={<GtmPage />} />
          <Route path="contatos" element={<Placeholder title="Contatos" />} />
          <Route path="lista-contas" element={<Placeholder title="Lista de Contas" />} />
          <Route path="segmentos" element={<Placeholder title="Segmentos" />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="campaigns/new" element={<CampaignWizard />} />
          <Route path="campaigns/new/advanced" element={<AdvancedCampaignCreator />} />
          <Route path="campaigns/:id/edit" element={<CampaignWizard />} />
          <Route path="campaigns/:id" element={<CampaignAnalytics />} />
          <Route path="landing-pages" element={<LandingPagesOverview />} />
          <Route path="landing-pages/new" element={<CreateSelector />} />
          <Route path="landing-pages/:id/edit" element={<LandingPageEditor />} />
          <Route path="landing-pages/:id/analytics" element={<LandingPageAnalytics />} />
          <Route path="uso-clientes" element={<UsagePortfolio />} />
          <Route path="uso-clientes/:companyId" element={<UsageCompanyDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
