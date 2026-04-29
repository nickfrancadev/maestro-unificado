import { X } from 'lucide-react';

interface PlayActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playName: string;
  companyName: string;
}

export function PlayActionsModal({ isOpen, onClose, playName, companyName }: PlayActionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#212a46]">Configurações da Play</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Play</p>
            <p className="font-bold text-[#212a46]">{playName}</p>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Empresa</p>
            <p className="font-bold text-[#212a46]">{companyName}</p>
          </div>
          <button className="w-full py-2 px-4 bg-[#4a90e2] text-white rounded font-bold text-sm hover:bg-[#357abd] transition-colors">
            Editar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
