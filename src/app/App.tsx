import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./AppLayout";
import { HomePage } from "./components/HomePage";
import { AccountsPage } from "./components/AccountsPage";
import { Home } from "./pages/Home";
import { Marketplace } from "./pages/Marketplace";
import { PlaysCanvas } from "./pages/PlaysCanvas";
import { GtmPage } from "./components/GtmPage";
import { PlaysOverviewPage } from "./components/PlaysOverviewPage";
import { TouchpointManagerPage } from "./components/TouchpointManagerPage";
import { NewPlayData } from "./components/PlayDetailPage";
import { Integrations } from "./integrations/Integrations";
import { LinkedInOAuthCallback } from "./integrations/LinkedInOAuthCallback";
import { CampaignList } from "./campaigns/CampaignList";
import { CampaignWizard } from "./campaigns/CampaignWizard";
import { CampaignAnalytics } from "./campaigns/CampaignAnalytics";
import { AdvancedCampaignCreator } from "./campaigns/AdvancedCampaignCreator";

function PlaysRoute() {
  const location = useLocation();
  const incoming = (location.state as { accountId?: string; playId?: string } | null) ?? null;
  const [selectedPlay, setSelectedPlay] = useState<{ accountId: string; playId: string } | null>(
    incoming?.accountId && incoming?.playId
      ? { accountId: incoming.accountId, playId: incoming.playId }
      : null
  );
  const [newPlay, setNewPlay] = useState<NewPlayData | null>(null);

  const handleSelectPlay = (accountId: string, playId: string) =>
    setSelectedPlay({ accountId, playId });
  const handleOpenNewPlay = (play: NewPlayData) => setNewPlay(play);
  const handleBack = () => { setSelectedPlay(null); setNewPlay(null); };

  if (newPlay) return <TouchpointManagerPage newPlayData={newPlay} onBack={handleBack} />;
  if (selectedPlay)
    return (
      <TouchpointManagerPage
        accountId={selectedPlay.accountId}
        playId={selectedPlay.playId}
        onBack={handleBack}
      />
    );
  return <PlaysOverviewPage onSelectPlay={handleSelectPlay} onOpenNewPlay={handleOpenNewPlay} />;
}

function ContasRoute() {
  const navigate = useNavigate();
  return (
    <AccountsPage
      onOpenPlay={(accountId: string, playId: string) =>
        navigate("/plays", { state: { accountId, playId } })
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
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/auth/linkedin/callback" element={<LinkedInOAuthCallback />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="contas" element={<ContasRoute />} />
          <Route path="dashboard" element={<Home />} />
          <Route path="plays" element={<PlaysRoute />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
