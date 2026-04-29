import { X, Upload, Plus } from 'lucide-react';
import { useState } from 'react';

interface GTMModalProps {
  isOpen: boolean;
  onClose: () => void;
  gtmName: string;
}

export function GTMModal({ isOpen, onClose, gtmName }: GTMModalProps) {
  const [formData, setFormData] = useState({
    relationshipType: '',
    recurrenceProfile: '',
    mainChallenges: '',
    mainMotivations: '',
    howTheyThinkProblem: '',
    howTheyResearch: '',
    howTheyDecide: '',
    selectedCampaign: '',
  });

  const [charCounts, setCharCounts] = useState({
    relationshipType: 0,
    recurrenceProfile: 0,
    mainChallenges: 0,
    mainMotivations: 0,
    howTheyThinkProblem: 0,
    howTheyResearch: 0,
    howTheyDecide: 0,
  });

  if (!isOpen) return null;

  const handleChange = (field: string, value: string, maxLength?: number) => {
    if (maxLength && value.length > maxLength) return;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (maxLength) {
      setCharCounts(prev => ({ ...prev, [field]: value.length }));
    }
  };

  const handleSave = () => {
    console.log('Dados do GTM:', formData);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[900px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-[#212a46]">Informações do Público</h2>
            <p className="text-sm text-gray-500 mt-0.5">{gtmName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Seção: Informações de Classificação */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#212a46] mb-4 pb-2 border-b border-gray-200">
              Informações de Classificação
            </h3>
            
            {/* Tipo de Relacionamento */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Tipo de Relacionamento/Cliente
              </label>
              <textarea
                value={formData.relationshipType}
                onChange={(e) => handleChange('relationshipType', e.target.value, 100)}
                placeholder="Descreva o tipo de relacionamento ou perfil do cliente..."
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.relationshipType}/100
              </div>
            </div>

            {/* Perfil de Recorrência */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Perfil de Recorrência
              </label>
              <textarea
                value={formData.recurrenceProfile}
                onChange={(e) => handleChange('recurrenceProfile', e.target.value, 200)}
                placeholder="Descreva o perfil de recorrência do cliente..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.recurrenceProfile}/200
              </div>
            </div>
          </div>

          {/* Seção: Desafios e Motivações */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#212a46] mb-4 pb-2 border-b border-gray-200">
              Desafios e Motivações
            </h3>
            
            {/* Principais Desafios */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Principais Desafios
              </label>
              <textarea
                value={formData.mainChallenges}
                onChange={(e) => handleChange('mainChallenges', e.target.value, 500)}
                placeholder="Quais são os principais desafios enfrentados por este público?"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.mainChallenges}/500
              </div>
            </div>

            {/* Principais Motivações */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Principais Motivações
              </label>
              <textarea
                value={formData.mainMotivations}
                onChange={(e) => handleChange('mainMotivations', e.target.value, 500)}
                placeholder="O que motiva este público a buscar soluções?"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.mainMotivations}/500
              </div>
            </div>
          </div>

          {/* Seção: Jornada de Compra */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#212a46] mb-2 pb-2 border-b border-gray-200">
              Jornada de Compra <span className="text-xs font-normal text-gray-500">(Opcional)</span>
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Ajude-nos a entender melhor como esse público pensa, pesquisa e decide suas compras.
            </p>
            
            {/* Como pensam o problema */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Como pensam o problema?
              </label>
              <textarea
                value={formData.howTheyThinkProblem}
                onChange={(e) => handleChange('howTheyThinkProblem', e.target.value, 200)}
                placeholder="Como este público enxerga e pensa sobre o problema?"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.howTheyThinkProblem}/200
              </div>
            </div>

            {/* Como pesquisam soluções */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Como pesquisam soluções?
              </label>
              <textarea
                value={formData.howTheyResearch}
                onChange={(e) => handleChange('howTheyResearch', e.target.value, 200)}
                placeholder="Onde e como buscam informações sobre soluções?"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.howTheyResearch}/200
              </div>
            </div>

            {/* Como decidem comprar */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Como decidem comprar?
              </label>
              <textarea
                value={formData.howTheyDecide}
                onChange={(e) => handleChange('howTheyDecide', e.target.value, 200)}
                placeholder="Quais fatores influenciam a decisão de compra?"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.howTheyDecide}/200
              </div>
            </div>
          </div>

          {/* Seção: Canais */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#212a46] mb-4 pb-2 border-b border-gray-200">
              Canais
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Produtos
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#4a90e2] transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Arraste e solte produtos aqui</p>
                <p className="text-xs text-gray-500">ou clique para selecionar</p>
                <button className="mt-3 px-4 py-2 text-sm font-medium text-[#4a90e2] hover:text-[#3a79c0] transition-colors">
                  Selecionar Produtos
                </button>
              </div>
            </div>
          </div>

          {/* Seção: Campanhas GTM */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#212a46] mb-4 pb-2 border-b border-gray-200">
              Campanhas GTM
            </h3>
            
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-[#212a46] mb-2">
                  Selecione uma Campanha
                </label>
                <select
                  value={formData.selectedCampaign}
                  onChange={(e) => setFormData(prev => ({ ...prev, selectedCampaign: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                >
                  <option value="">Selecione uma campanha...</option>
                  <option value="campanha1">Campanha Q1 2026</option>
                  <option value="campanha2">Campanha Enterprise</option>
                  <option value="campanha3">Campanha ABM</option>
                </select>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#4a90e2] hover:bg-[#3a79c0] rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Criar Nova Campanha
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4a90e2] hover:bg-[#3a79c0] rounded-lg transition-colors"
          >
            Salvar Público
          </button>
        </div>
      </div>
    </>
  );
}
