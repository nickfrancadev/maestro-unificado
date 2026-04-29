import { FileText, Copy, Filter, Phone, Edit3, Settings, Rows, Columns } from 'lucide-react';
import { useState } from 'react';
import { PlayActionsModal } from '@/app/components/PlayActionsModal';
import { DossierModal } from '@/app/components/DossierModal';
import { ContactDossierModal } from '@/app/components/ContactDossierModal';
import { GTMModal } from '@/app/components/GTMModal';
import { ProductModal } from '@/app/components/ProductModal';

interface HeaderProps {
  layoutOrientation: 'vertical' | 'horizontal';
  onToggleOrientation: () => void;
}

export function Header({ layoutOrientation, onToggleOrientation }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isContactDossierModalOpen, setIsContactDossierModalOpen] = useState(false);
  const [isGTMModalOpen, setIsGTMModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white px-3 lg:px-6 py-2 lg:py-3 border-b border-gray-200">
        <div className="flex items-start justify-between">
          {/* Left - Title and Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base lg:text-lg font-bold text-[#212a46] mb-1 truncate">Envio de proposta</h1>
            <div className="text-[10px] lg:text-xs text-gray-600 mb-2 flex items-center gap-1">
              <span>🏛️</span>
              <span>STARK BANK</span>
            </div>
            
            {/* Badges */}
            <div className="flex gap-1.5 lg:gap-2 flex-wrap mb-2 lg:mb-3">
              <div 
                onClick={() => setIsDossierModalOpen(true)}
                className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="hidden lg:inline">Dossiê de conta: </span>
                <span className="text-[#ff9b83] font-medium">ODM ALERT</span>
              </div>
              <div 
                onClick={() => setIsContactDossierModalOpen(true)}
                className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="hidden lg:inline">Dossiê de contato: </span>
                <span className="text-[#ff9b83] font-medium">OPERATOR.CUR1</span>
              </div>
              <div 
                onClick={() => setIsGTMModalOpen(true)}
                className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] cursor-pointer hover:bg-gray-200 transition-colors hidden sm:block"
              >
                <span className="hidden lg:inline">GTM: </span>
                <span className="text-gray-800 font-medium">Consultoria Enterprise</span>
              </div>
              <div 
                onClick={() => setIsProductModalOpen(true)}
                className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 rounded text-[10px] lg:text-[11px] cursor-pointer hover:bg-gray-200 transition-colors hidden sm:block"
              >
                <span className="hidden lg:inline">Produto: </span>
                <span className="text-gray-800 font-medium">Maestro ABM</span>
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
                <div className="h-full bg-gradient-to-r from-[#dc3545] to-[#c82333]" style={{ width: '65%' }}></div>
              </div>
              <span className="text-[10px] lg:text-xs font-medium text-gray-700">65</span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-start gap-1.5 lg:gap-3 ml-2 lg:ml-6">
            {/* Toggle Layout Button - Hidden on mobile */}
            <button 
              onClick={onToggleOrientation}
              className="hidden"
              title={layoutOrientation === 'vertical' ? 'Mudar para layout horizontal' : 'Mudar para layout vertical'}
            >
              {layoutOrientation === 'vertical' ? (
                <Rows className="w-5 h-5" />
              ) : (
                <Columns className="w-5 h-5" />
              )}
            </button>

            {/* Menu Button */}
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
        playName="Envio de proposta"
        companyName="STARK BANK"
      />

      <DossierModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        dossierName="Dossiê de conta"
        dossierStatus="ODM ALERT"
      />

      <ContactDossierModal
        isOpen={isContactDossierModalOpen}
        onClose={() => setIsContactDossierModalOpen(false)}
        dossierName="OPERATOR.CUR1"
      />

      <GTMModal
        isOpen={isGTMModalOpen}
        onClose={() => setIsGTMModalOpen(false)}
        gtmName="Consultoria Enterprise"
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productName="Maestro ABM"
      />
    </>
  );
}