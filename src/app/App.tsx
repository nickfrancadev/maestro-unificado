import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { AccountsPage } from "./components/AccountsPage";
import { HomePage } from "./components/HomePage";
import { Home } from "./pages/Home";
import { Marketplace } from "./pages/Marketplace";
import { PlaysCanvas } from "./pages/PlaysCanvas";
import { TouchpointManagerPage } from "./components/TouchpointManagerPage";
import { PlaysOverviewPage } from "./components/PlaysOverviewPage";
import { GtmPage } from "./components/GtmPage";
import { NewPlayData } from "./components/PlayDetailPage";

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [selectedPlay, setSelectedPlay] = useState<{ accountId: string; playId: string } | null>(null);
  const [newPlay, setNewPlay] = useState<NewPlayData | null>(null);

  const handleSelectPlay = (accountId: string, playId: string) => {
    setSelectedPlay({ accountId, playId });
    setActivePage("play-details");
  };

  const handleBackToPlays = () => {
    setSelectedPlay(null);
    setNewPlay(null);
    setActivePage("plays");
  };

  const handleOpenNewPlay = (play: NewPlayData) => {
    setNewPlay(play);
    setActivePage("new-play");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#EEF0F5" }}>
      {/* Sidebar */}
      <div className="flex h-full shrink-0" style={{ zIndex: 10 }}>
        <Sidebar activePage={["play-details", "new-play"].includes(activePage) ? "plays" : activePage} onNavigate={setActivePage} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {activePage === "home" && <HomePage />}
        {activePage === "contas" && <AccountsPage onOpenPlay={handleSelectPlay} />}
        {activePage === "dashboard" && <Home />}
        {activePage === "plays" && <PlaysOverviewPage onSelectPlay={handleSelectPlay} onOpenNewPlay={handleOpenNewPlay} />}
        {activePage === "play-details" && selectedPlay && (
          <TouchpointManagerPage
            accountId={selectedPlay.accountId}
            playId={selectedPlay.playId}
            onBack={handleBackToPlays}
          />
        )}
        {activePage === "new-play" && newPlay && (
          <TouchpointManagerPage
            newPlayData={newPlay}
            onBack={handleBackToPlays}
          />
        )}
        {activePage === "marketplace" && <Marketplace />}
        {activePage === "canvas" && <PlaysCanvas />}
        {activePage === "gtm" && <GtmPage />}
        {!["home", "contas", "dashboard", "plays", "play-details", "new-play", "marketplace", "canvas", "gtm"].includes(activePage) && (
          <div className="flex items-center justify-center h-full" style={{ color: "#9B9B9B", fontSize: 18 }}>
            <div className="text-center">
              <p style={{ fontWeight: 700, color: "#212A46", fontSize: 22, marginBottom: 8 }}>
                {activePage === "contatos" && "Contatos"}
                {activePage === "lista-contas" && "Lista de Contas"}
                {activePage === "dossies-contas" && "Dossiês de Contas"}
                {activePage === "dossies-contatos" && "Dossiês de Contatos"}
                {activePage === "segmentos" && "Segmentos"}
                {!["contatos","lista-contas","dossies-contas","dossies-contatos","segmentos"].includes(activePage) && "Página"}
              </p>
              <p>Esta tela será implementada em breve.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}