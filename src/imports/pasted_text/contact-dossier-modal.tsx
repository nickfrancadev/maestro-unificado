import { X, User, Briefcase, MapPin, FileText, TrendingUp, Users, Plus, Download, Trash2, Edit3 } from 'lucide-react';
import { useState } from 'react';

interface ContactDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierName: string;
}

export function ContactDossierModal({ isOpen, onClose, dossierName }: ContactDossierModalProps) {
  const [selectedContact, setSelectedContact] = useState(0);
  
  const [formData, setFormData] = useState({
    position: '',
    buyingRole: '',
    city: '',
    experience: '',
    news: '',
    painHypothesis: '',
    projectInvolvement: '',
  });

  // Mock data de contatos
  const contacts = [
    { name: 'Ana Silva', role: 'CEO', color: '#ff9b83' },
    { name: 'Carlos Santos', role: 'CTO', color: '#4a90e2' },
    { name: 'Marina Costa', role: 'CFO', color: '#c8e6c9' },
    { name: 'João Oliveira', role: 'COO', color: '#ffd700' },
  ];

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Dados do dossiê de contato:', formData);
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
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[1000px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#212a46]">Marketing</h2>
              <p className="text-sm text-gray-500 mt-0.5">{dossierName}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Excluir dossiê
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-6 text-xs text-gray-500 mb-4">
            <div>
              <span className="font-semibold">Tipo de dossiê:</span> Sale
            </div>
            <div>
              <span className="font-semibold">Criado em:</span> 15/01/2026
            </div>
            <div>
              <span className="font-semibold">Atualizado em:</span> 23/01/2026
            </div>
          </div>

          {/* Carrossel de Contatos */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
              Contatos
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {contacts.map((contact, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedContact(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedContact === index
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedContact === index ? contact.color : undefined,
                  }}
                >
                  {contact.name}
                </button>
              ))}
              <button className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Formulário */}
          <div className="space-y-5">
            {/* Cargo */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#4a90e2]" />
                  Cargo
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="Ex: Diretor de Tecnologia"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
              />
            </div>

            {/* Função de Compra */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#4a90e2]" />
                  Função de Compra
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <select
                value={formData.buyingRole}
                onChange={(e) => handleChange('buyingRole', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="decisor">Decisor</option>
                <option value="influenciador">Influenciador</option>
                <option value="usuario">Usuário Final</option>
                <option value="aprovador">Aprovador</option>
                <option value="bloqueador">Bloqueador</option>
                <option value="campeao">Campeão</option>
              </select>
            </div>

            {/* Cidade que reside */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#4a90e2]" />
                  Cidade que reside
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
              />
            </div>

            {/* Experiência profissional */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4a90e2]" />
                  Experiência profissional
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleChange('experience', e.target.value)}
                placeholder="Resumo da trajetória profissional, empresas anteriores, especializações..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Novidades/Informações relevantes */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#4a90e2]" />
                  Novidades/Informações relevantes
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <textarea
                value={formData.news}
                onChange={(e) => handleChange('news', e.target.value)}
                placeholder="Posts recentes em redes sociais, mudanças de cargo, eventos..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Hipótese da principal dor */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#4a90e2]" />
                  Hipótese da principal dor atrelada ao KPI
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <textarea
                value={formData.painHypothesis}
                onChange={(e) => handleChange('painHypothesis', e.target.value)}
                placeholder="Qual a principal dor ou desafio que este contato enfrenta?"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>

            {/* Envolvimento no projeto */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#212a46] mb-2">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4a90e2]" />
                  Envolvimento no projeto
                </span>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </label>
              <textarea
                value={formData.projectInvolvement}
                onChange={(e) => handleChange('projectInvolvement', e.target.value)}
                placeholder="Como este contato está envolvido no projeto?"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Add Contatos
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Exportar as
            </button>
          </div>
          
          <div className="flex items-center gap-3">
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
      </div>
    </>
  );
}
