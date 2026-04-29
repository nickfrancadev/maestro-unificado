import { X, MapPin, Target, TrendingUp, Users, MessageSquare, Calendar, FileText, Upload, Bell } from 'lucide-react';
import { useState } from 'react';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierName: string;
  dossierStatus: string;
}

export function DossierModal({ isOpen, onClose, dossierName, dossierStatus }: DossierModalProps) {
  const [formData, setFormData] = useState({
    location: '',
    opportunity: '',
    differentials: '',
    pitch: '',
    culture: '',
    events: '',
    phase: '',
    news: '',
    status: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Implementar lógica de salvar
    console.log('Dados do dossiê:', formData);
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
            <h2 className="text-lg font-bold text-[#212a46]">Dossiê de Conta</h2>
            <p className="text-sm text-gray-500 mt-0.5">{dossierName}</p>
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
          <div className="space-y-6">
            {/* Localização */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <MapPin className="w-4 h-4 text-[#4a90e2]" />
                Localização
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Ex: São Paulo - SP, Brasil"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
              />
            </div>

            {/* Oportunidade */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <Target className="w-4 h-4 text-[#4a90e2]" />
                Oportunidade
              </label>
              <textarea
                value={formData.opportunity}
                onChange={(e) => handleChange('opportunity', e.target.value)}
                placeholder="Descreva a oportunidade identificada..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Diferenciais */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <TrendingUp className="w-4 h-4 text-[#4a90e2]" />
                Diferenciais Competitivos
              </label>
              <textarea
                value={formData.differentials}
                onChange={(e) => handleChange('differentials', e.target.value)}
                placeholder="Quais são nossos diferenciais para esta conta?"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Pitch / Proposta de Valor */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <MessageSquare className="w-4 h-4 text-[#4a90e2]" />
                Pitch / Proposta de Valor
              </label>
              <textarea
                value={formData.pitch}
                onChange={(e) => handleChange('pitch', e.target.value)}
                placeholder="Qual é o pitch principal para esta conta?"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Cultura e Valores */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <Users className="w-4 h-4 text-[#4a90e2]" />
                Cultura e Valores
              </label>
              <textarea
                value={formData.culture}
                onChange={(e) => handleChange('culture', e.target.value)}
                placeholder="Informações sobre cultura organizacional da empresa..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Eventos e Datas Importantes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <Calendar className="w-4 h-4 text-[#4a90e2]" />
                Eventos e Datas Importantes
              </label>
              <textarea
                value={formData.events}
                onChange={(e) => handleChange('events', e.target.value)}
                placeholder="Ex: Evento anual em outubro, renovação de contrato em dezembro..."
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Fase */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                  <TrendingUp className="w-4 h-4 text-[#4a90e2]" />
                  Fase do Relacionamento
                </label>
                <select
                  value={formData.phase}
                  onChange={(e) => handleChange('phase', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="prospecção">Prospecção</option>
                  <option value="qualificação">Qualificação</option>
                  <option value="proposta">Proposta</option>
                  <option value="negociação">Negociação</option>
                  <option value="fechamento">Fechamento</option>
                  <option value="pós-venda">Pós-venda</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                  <Bell className="w-4 h-4 text-[#4a90e2]" />
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="ativo">Ativo</option>
                  <option value="em-pausa">Em Pausa</option>
                  <option value="aguardando">Aguardando Retorno</option>
                  <option value="prioridade">Prioridade Alta</option>
                </select>
              </div>
            </div>

            {/* Novidades */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <FileText className="w-4 h-4 text-[#4a90e2]" />
                Novidades e Notícias Recentes
              </label>
              <textarea
                value={formData.news}
                onChange={(e) => handleChange('news', e.target.value)}
                placeholder="Notícias, mudanças, anúncios relevantes sobre a conta..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Notas Adicionais */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <FileText className="w-4 h-4 text-[#4a90e2]" />
                Notas Adicionais
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Qualquer informação adicional relevante..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Anexos */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#212a46] mb-2">
                <Upload className="w-4 h-4 text-[#4a90e2]" />
                Anexos
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#4a90e2] transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-1">Clique para adicionar arquivos</p>
                <p className="text-xs text-gray-400">ou arraste e solte aqui</p>
              </div>
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
            Salvar Dossiê
          </button>
        </div>
      </div>
    </>
  );
}
