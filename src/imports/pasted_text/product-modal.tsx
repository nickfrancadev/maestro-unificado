import { X, Info, Star, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
}

export function ProductModal({ isOpen, onClose, productName }: ProductModalProps) {
  const [formData, setFormData] = useState({
    type: 'produto',
    name: productName || '',
    description: '',
    price: '',
    unit: '',
    status: 'ativo',
    retention: '',
    feedbacks: '',
    growth: '',
    demand: '',
  });

  const [historyRecords, setHistoryRecords] = useState([
    { id: 1, date: '23/01/2026', rating: 3.5, retention: 'media', feedbacks: 'positivo', growth: 'medio', demand: 'media' },
    { id: 2, date: '22/01/2026', rating: 2.8, retention: 'baixa', feedbacks: 'neutro', growth: 'baixo', demand: 'baixa' },
    { id: 3, date: '21/01/2026', rating: 4.2, retention: 'alta', feedbacks: 'positivo', growth: 'alto', demand: 'alta' },
  ]);

  // Função para calcular rating baseado nas métricas
  const calculateRating = (retention: string, feedbacks: string, growth: string, demand: string): number => {
    const metricToValue = (metric: string, type: 'retention' | 'feedbacks' | 'growth' | 'demand'): number => {
      if (type === 'retention' || type === 'growth' || type === 'demand') {
        if (metric === 'baixa' || metric === 'baixo') return 1;
        if (metric === 'media' || metric === 'medio') return 3;
        if (metric === 'alta' || metric === 'alto') return 5;
      } else if (type === 'feedbacks') {
        if (metric === 'negativo') return 1;
        if (metric === 'neutro') return 3;
        if (metric === 'positivo') return 5;
      }
      return 0;
    };

    const retentionValue = metricToValue(retention, 'retention');
    const feedbacksValue = metricToValue(feedbacks, 'feedbacks');
    const growthValue = metricToValue(growth, 'growth');
    const demandValue = metricToValue(demand, 'demand');

    const total = retentionValue + feedbacksValue + growthValue + demandValue;
    const average = total > 0 ? total / 4 : 0;
    
    return Math.round(average * 10) / 10; // Arredonda para 1 casa decimal
  };

  // Calcula o rating atual baseado nas seleções
  const currentRating = useMemo(() => {
    return calculateRating(formData.retention, formData.feedbacks, formData.growth, formData.demand);
  }, [formData.retention, formData.feedbacks, formData.growth, formData.demand]);

  // Prepara dados para o gráfico
  const chartData = useMemo(() => {
    return [...historyRecords].reverse().map(record => ({
      date: record.date,
      rating: record.rating,
    }));
  }, [historyRecords]);

  const handleDeleteRecord = (id: number) => {
    setHistoryRecords(prev => prev.filter(record => record.id !== id));
  };

  const handleSave = () => {
    console.log('Dados do produto:', formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[600px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#212a46]">Adicionar Produto/Serviço</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-semibold text-[#212a46] mb-3">
                Tipo
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="produto"
                    checked={formData.type === 'produto'}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-4 h-4 text-[#4a90e2] focus:ring-[#4a90e2]"
                  />
                  <span className="text-sm text-gray-700">Produto</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="servico"
                    checked={formData.type === 'servico'}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-4 h-4 text-[#4a90e2] focus:ring-[#4a90e2]"
                  />
                  <span className="text-sm text-gray-700">Serviço</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="treinamento"
                    checked={formData.type === 'treinamento'}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-4 h-4 text-[#4a90e2] focus:ring-[#4a90e2]"
                  />
                  <span className="text-sm text-gray-700">Treinamento</span>
                </label>
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome do produto/serviço"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-[#212a46] mb-2">
                Descrição <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o produto/serviço"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Preço e Unidade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#212a46] mb-2">
                  Preço <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#212a46] mb-2">
                  Unidade
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="unidade">Unidade</option>
                  <option value="hora">Hora</option>
                  <option value="mes">Mês</option>
                  <option value="ano">Ano</option>
                  <option value="projeto">Projeto</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-[#212a46] mb-3">
                Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="ativo"
                    checked={formData.status === 'ativo'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-4 h-4 text-[#4a90e2] focus:ring-[#4a90e2]"
                  />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="rascunho"
                    checked={formData.status === 'rascunho'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-4 h-4 text-[#4a90e2] focus:ring-[#4a90e2]"
                  />
                  <span className="text-sm text-gray-700">Rascunho</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inativo"
                    checked={formData.status === 'inativo'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-4 h-4 text-[#4a90e2] focus:ring-[#4a90e2]"
                  />
                  <span className="text-sm text-gray-700">Inativo</span>
                </label>
              </div>
            </div>

            {/* Editar Métricas de PM */}
            <div className="bg-[#f8f9fa] rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[#212a46]">
                Editar Métricas de PM
              </h3>

              {/* Grid de campos - 2x2 */}
              <div className="grid grid-cols-2 gap-4">
                {/* Retenção */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Retenção
                  </label>
                  <select
                    value={formData.retention}
                    onChange={(e) => setFormData(prev => ({ ...prev, retention: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent bg-white"
                  >
                    <option value="">selecione</option>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                {/* Feedbacks */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Feedbacks
                  </label>
                  <select
                    value={formData.feedbacks}
                    onChange={(e) => setFormData(prev => ({ ...prev, feedbacks: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent bg-white"
                  >
                    <option value="">selecione</option>
                    <option value="positivo">Positivo</option>
                    <option value="neutro">Neutro</option>
                    <option value="negativo">Negativo</option>
                  </select>
                </div>

                {/* Crescimento */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Crescimento
                  </label>
                  <select
                    value={formData.growth}
                    onChange={(e) => setFormData(prev => ({ ...prev, growth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent bg-white"
                  >
                    <option value="">selecione</option>
                    <option value="baixo">Baixo</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>

                {/* Demanda */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Demanda
                  </label>
                  <select
                    value={formData.demand}
                    onChange={(e) => setFormData(prev => ({ ...prev, demand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent bg-white"
                  >
                    <option value="">selecione</option>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-300" />

              {/* Rating Calculado */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Rating Calculado:</span>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-[#FFA000] text-[#FFA000]" />
                  <span className="text-sm font-semibold text-gray-900">{currentRating}/5.0</span>
                </div>
              </div>

              {/* Como funciona */}
              <div className="flex items-center justify-center gap-2 text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                <Info className="w-4 h-4" />
                <span className="text-xs">Como funciona</span>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-3 pt-2">
                {/* Salvar como um Novo Registro */}
                <button
                  onClick={handleSave}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-[#28a745] hover:bg-[#218838] rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar como um Novo Registro
                </button>

                {/* Salvar como uma Edição */}
                <button
                  onClick={handleSave}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-[#28a745] hover:bg-[#218838] rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar como uma Edição
                </button>

                {/* Cancelar */}
                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              </div>
            </div>

            {/* Informação de Preço */}
            <div className="text-sm font-semibold text-gray-800 pt-2">
              R$0.00/ mês
            </div>

            {/* Gráfico e Histórico de PMF */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
              {/* Título */}
              <h3 className="text-sm font-semibold text-[#212a46]">
                Evolução do Product Market-Fit
              </h3>

              {/* Gráfico */}
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#666' }}
                      stroke="#999"
                    />
                    <YAxis 
                      domain={[0, 5]} 
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11, fill: '#666' }}
                      stroke="#999"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#4a90e2" 
                      strokeWidth={2}
                      dot={{ fill: '#4a90e2', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Label da Tabela */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  PMF Rating
                </span>
              </div>

              {/* Tabela de Histórico */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Rating</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Retenção</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Feedbacks</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Crescimento</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Demanda</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historyRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 text-gray-700">{record.date}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-[#FFA000] text-[#FFA000]" />
                              <span className="font-medium text-gray-900">{record.rating}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{record.retention}</td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{record.feedbacks}</td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{record.growth}</td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{record.demand}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Deletar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}