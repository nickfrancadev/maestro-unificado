import { Sparkles, Settings, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { PlayActionsModal } from './PlayActionsModal';
import { DossierModal } from './DossierModal';
import { ContactDossierModal } from './ContactDossierModal';
import { GTMModal } from './GTMModal';
import { ProductModal } from './ProductModal';

interface TouchpointHeaderProps {
  layoutOrientation: 'vertical' | 'horizontal';
  onToggleOrientation: () => void;
  onToggleAI?: () => void;
  isAIOpen?: boolean;
  accountName?: string;
  onBack?: () => void;
  playName?: string;
  dossierContaName?: string;
  dossierContatoName?: string;
  produtoName?: string;
  gtmName?: string;
  isEmpty?: boolean;
}

export function TouchpointHeader({
  layoutOrientation, onToggleOrientation, onToggleAI, isAIOpen,
  accountName, onBack,
  playName, dossierContaName, dossierContatoName, produtoName, gtmName, isEmpty,
}: TouchpointHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isContactDossierModalOpen, setIsContactDossierModalOpen] = useState(false);
  const [isGTMModalOpen, setIsGTMModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const resolvedPlayName = playName || "Envio de proposta";
  const resolvedAccountName = accountName || "STARK BANK";
  const resolvedDossierConta = dossierContaName || "ODM ALERT";
  const resolvedDossierContato = dossierContatoName || "OPERATOR.CUR1";
  const resolvedGtm = gtmName || "Consultoria Enterprise";
  const resolvedProduto = produtoName || "Maestro ABM";

  return (
    <>
      <div className="bg-white px-3 lg:px-6 py-2 lg:py-3 border-b border-gray-200">
        <div className="flex items-start justify-between">
          {/* Left - Title and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Voltar para Plays"
                >
                  <ArrowLeft size={18} style={{ color: "#6B7280" }} />
                </button>
              )}
              <h1 className="text-base lg:text-lg font-bold text-[#212a46] truncate">{resolvedPlayName}</h1>
            </div>
            <div className="text-[10px] lg:text-xs text-gray-600 mb-2 flex items-center gap-1" style={{ marginLeft: onBack ? "34px" : "0" }}>
              <span>🏛️</span>
              <span>{resolvedAccountName}</span>
            </div>
            
            {/* Badges */}
            <div className="flex gap-1.5 lg:gap-2 flex-wrap mb-2 lg:mb-3">
              <div 
                onClick={() => dossierContaName ? setIsDossierModalOpen(true) : undefined}
                className={`px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] transition-colors ${dossierContaName ? 'cursor-pointer hover:bg-gray-200' : 'opacity-40 cursor-default'}`}
              >
                <span className="hidden lg:inline">Dossiê de conta: </span>
                <span className="text-[#ff9b83] font-medium">{dossierContaName || (isEmpty ? "—" : resolvedDossierConta)}</span>
              </div>
              <div 
                onClick={() => dossierContatoName ? setIsContactDossierModalOpen(true) : undefined}
                className={`px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] transition-colors ${dossierContatoName ? 'cursor-pointer hover:bg-gray-200' : 'opacity-40 cursor-default'}`}
              >
                <span className="hidden lg:inline">Dossiê de contato: </span>
                <span className="text-[#ff9b83] font-medium">{dossierContatoName || (isEmpty ? "—" : resolvedDossierContato)}</span>
              </div>
              <div 
                onClick={() => gtmName ? setIsGTMModalOpen(true) : undefined}
                className={`px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] transition-colors hidden sm:block ${gtmName ? 'cursor-pointer hover:bg-gray-200' : 'opacity-40 cursor-default'}`}
              >
                <span className="hidden lg:inline">GTM: </span>
                <span className="text-gray-800 font-medium">{gtmName || (isEmpty ? "—" : resolvedGtm)}</span>
              </div>
              <div 
                onClick={() => produtoName ? setIsProductModalOpen(true) : undefined}
                className={`px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] transition-colors hidden sm:block ${produtoName ? 'cursor-pointer hover:bg-gray-200' : 'opacity-40 cursor-default'}`}
              >
                <span className="hidden lg:inline">Produto: </span>
                <span className="text-gray-800 font-medium">{produtoName || (isEmpty ? "—" : resolvedProduto)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 lg:gap-3">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
                <path d="M12 12l3.5-3.5"/>
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
              </svg>
              <div className="flex-1 h-1.5 lg:h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#dc3545] to-[#c82333]" style={{ width: isEmpty ? '0%' : '65%' }}></div>
              </div>
              <span className="text-[10px] lg:text-xs font-medium text-gray-700">{isEmpty ? '0' : '65'}</span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-start gap-1.5 lg:gap-3 ml-2 lg:ml-6">
            {/* AI Button */}
            <button
              onClick={onToggleAI}
              className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-semibold text-xs ${
                isAIOpen
                  ? 'bg-gradient-to-r from-[#FF5F39] to-[#ff9b83] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-[#212a46] hover:text-white'
              }`}
              title="Assistente de IA"
            >
              <Sparkles className="w-4 h-4" />
              IA
            </button>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-[#354566] text-white rounded hover:bg-[#2d3e5f] transition-colors"
              title="Configurações da Play"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <PlayActionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        playName={resolvedPlayName}
        companyName={resolvedAccountName}
      />

      <DossierModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        dossierName="Dossiê de conta"
        dossierStatus={resolvedDossierConta}
      />

      <ContactDossierModal
        isOpen={isContactDossierModalOpen}
        onClose={() => setIsContactDossierModalOpen(false)}
        dossierName={resolvedDossierContato}
      />

      <GTMModal
        isOpen={isGTMModalOpen}
        onClose={() => setIsGTMModalOpen(false)}
        gtmName={resolvedGtm}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productName={resolvedProduto}
      />
    </>
  );
}
