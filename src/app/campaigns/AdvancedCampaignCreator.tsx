import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  Database, 
  Upload, 
  Image as ImageIcon, 
  Megaphone,
  Calendar,
  DollarSign,
  Users,
  Target
} from 'lucide-react';

type Step = 'campaign-details' | 'create-repo' | 'upload-content' | 'create-ad';

export function AdvancedCampaignCreator() {
  const navigate = useNavigate();
  const onCancel = () => navigate('/campaigns');
  const [currentStep, setCurrentStep] = useState<Step>('campaign-details');
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  
  // Data States
  const [campaignData, setCampaignData] = useState({
    name: '',
    budget: '',
    reach: '',
    audience: '',
    startDate: '',
    endDate: '',
    costType: 'CPC', // CPC or CPM
    costValue: ''
  });
  
  const [repoData, setRepoData] = useState({
    name: '',
    type: 'image'
  });

  const [contentData, setContentData] = useState({
    file: null as File | null,
    previewUrl: ''
  });
  
  const [generatedIds, setGeneratedIds] = useState({
    campaignId: '',
    repoId: '',
    contentId: '',
    adId: ''
  });

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'campaign-details', label: '1. Criar Campanha', icon: Megaphone },
    { id: 'create-repo', label: '2. Repositório', icon: Database },
    { id: 'upload-content', label: '3. Upload Objeto', icon: Upload },
    { id: 'create-ad', label: '4. Criar Anúncio', icon: Target },
  ];

  const handleNext = () => {
    // Simulate ID generation
    if (currentStep === 'campaign-details') {
      setGeneratedIds(prev => ({ ...prev, campaignId: `CMP-${Math.floor(Math.random() * 10000)}` }));
      setCompletedSteps(prev => [...prev, 'campaign-details']);
      setCurrentStep('create-repo');
    } else if (currentStep === 'create-repo') {
      setGeneratedIds(prev => ({ ...prev, repoId: `REPO-${Math.floor(Math.random() * 10000)}` }));
      setCompletedSteps(prev => [...prev, 'create-repo']);
      setCurrentStep('upload-content');
    } else if (currentStep === 'upload-content') {
      setGeneratedIds(prev => ({ ...prev, contentId: `CONT-${Math.floor(Math.random() * 10000)}` }));
      setCompletedSteps(prev => [...prev, 'upload-content']);
      setCurrentStep('create-ad');
    } else if (currentStep === 'create-ad') {
      setGeneratedIds(prev => ({ ...prev, adId: `AD-${Math.floor(Math.random() * 10000)}` }));
      setCompletedSteps(prev => [...prev, 'create-ad']);
      // Finish
      setTimeout(() => onCancel(), 1500); // Close after brief success show
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'campaign-details':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6">
                <h3 className="text-sm font-bold text-blue-800 mb-1">Passo 1: Definir Detalhes da Campanha</h3>
                <p className="text-xs text-blue-600">Preencha os dados fundamentais para gerar o ID da Campanha.</p>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Campanha</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ex: Q3 Awareness Campaign"
                      value={campaignData.name}
                      onChange={e => setCampaignData({...campaignData, name: e.target.value})}
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Total</label>
                   <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        className="w-full pl-9 px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="5000"
                        value={campaignData.budget}
                        onChange={e => setCampaignData({...campaignData, budget: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Alcance Estimado</label>
                   <div className="relative">
                      <Users className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        className="w-full pl-9 px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="10000"
                        value={campaignData.reach}
                        onChange={e => setCampaignData({...campaignData, reach: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                   <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={campaignData.startDate}
                      onChange={e => setCampaignData({...campaignData, startDate: e.target.value})}
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Data de Término</label>
                   <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={campaignData.endDate}
                      onChange={e => setCampaignData({...campaignData, endDate: e.target.value})}
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Audiência Alvo</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: CTOs em FinTech"
                      value={campaignData.audience}
                      onChange={e => setCampaignData({...campaignData, audience: e.target.value})}
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Modelo de Custo</label>
                   <div className="flex gap-2">
                      <select 
                        className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                        value={campaignData.costType}
                        onChange={e => setCampaignData({...campaignData, costType: e.target.value})}
                      >
                         <option value="CPC">CPC</option>
                         <option value="CPM">CPM</option>
                      </select>
                      <input 
                        type="number" 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="Valor (ex: 2.50)"
                        value={campaignData.costValue}
                        onChange={e => setCampaignData({...campaignData, costValue: e.target.value})}
                      />
                   </div>
                </div>
             </div>
          </div>
        );
      
      case 'create-repo':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg mb-6 flex items-center justify-between">
                <div>
                   <h3 className="text-sm font-bold text-emerald-800 mb-1">Campanha Criada com Sucesso!</h3>
                   <p className="text-xs text-emerald-600">ID da Campanha Gerado: <span className="font-mono bg-emerald-100 px-1 rounded">{generatedIds.campaignId}</span></p>
                </div>
                <Check className="w-5 h-5 text-emerald-600" />
             </div>

             <div className="border-t border-slate-100 pt-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Criar Repositório de Mídia</h3>
                
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Repositório</label>
                      <input 
                         type="text" 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                         placeholder="Ex: Creative Assets Q3"
                         value={repoData.name}
                         onChange={e => setRepoData({...repoData, name: e.target.value})}
                      />
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Conteúdo</label>
                      <div className="flex gap-4">
                         <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-all ${repoData.type === 'image' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input type="radio" name="repoType" className="hidden" checked={repoData.type === 'image'} onChange={() => setRepoData({...repoData, type: 'image'})} />
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-sm font-medium">Imagens</span>
                         </label>
                         <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-all ${repoData.type === 'video' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input type="radio" name="repoType" className="hidden" checked={repoData.type === 'video'} onChange={() => setRepoData({...repoData, type: 'video'})} />
                            <Database className="w-6 h-6" />
                            <span className="text-sm font-medium">Vídeos</span>
                         </label>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        );

      case 'upload-content':
         return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg mb-6 flex items-center justify-between">
                  <div>
                     <h3 className="text-sm font-bold text-emerald-800 mb-1">Repositório Criado!</h3>
                     <p className="text-xs text-emerald-600">Repo ID: <span className="font-mono bg-emerald-100 px-1 rounded">{generatedIds.repoId}</span></p>
                  </div>
                  <Check className="w-5 h-5 text-emerald-600" />
               </div>
  
               <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload de Objeto</h3>
                  
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer bg-white">
                     <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-4">
                        <Upload className="w-8 h-8" />
                     </div>
                     <p className="text-sm font-medium text-slate-900 mb-1">Clique para fazer upload ou arraste e solte</p>
                     <p className="text-xs text-slate-500">SVG, PNG, JPG ou GIF (max. 800x400px)</p>
                  </div>
               </div>
            </div>
          );

      case 'create-ad':
         return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                     <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Campaign ID</p>
                     <p className="font-mono text-emerald-700">{generatedIds.campaignId}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                     <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Content ID</p>
                     <p className="font-mono text-emerald-700">{generatedIds.contentId}</p>
                  </div>
               </div>
  
               <div className="border-t border-slate-100 pt-6 text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Finalizar Criação do Anúncio</h3>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">
                     Ao clicar em finalizar, o sistema irá vincular o <strong>Content ID</strong> ao <strong>Campaign ID</strong> e publicar o anúncio.
                  </p>
                  
                  <div className="flex justify-center">
                     <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg max-w-sm w-full text-left">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-4">
                           <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">Ad</div>
                           <div>
                              <p className="font-bold">Novo Anúncio</p>
                              <p className="text-xs text-slate-400">Preview</p>
                           </div>
                        </div>
                        <div className="h-32 bg-slate-800 rounded mb-3 flex items-center justify-center text-slate-500 text-xs">
                           Mídia Carregada
                        </div>
                        <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                     </div>
                  </div>
               </div>
            </div>
          );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden">
          
          {/* Sidebar Steps */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
             <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">Criar Campanha</h2>
                <p className="text-xs text-slate-500">Fluxo Avançado</p>
             </div>
             
             <div className="flex-1 space-y-1 relative">
                {/* Connecting Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 -z-10"></div>
                
                {steps.map((step, index) => {
                   const isActive = currentStep === step.id;
                   const isCompleted = completedSteps.includes(step.id);
                   
                   return (
                      <div key={step.id} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${isActive ? 'bg-white shadow-sm' : 'opacity-60'}`}>
                         <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 ${
                            isActive ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 
                            isCompleted ? 'border-green-500 bg-green-50 text-green-600' : 
                            'border-slate-200 bg-white text-slate-400'
                         }`}>
                            {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                         </div>
                         <div className="flex-1">
                            <span className={`block text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-slate-600'}`}>{step.label}</span>
                         </div>
                      </div>
                   );
                })}
             </div>

             <button onClick={onCancel} className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 px-2">
                <ArrowLeft className="w-4 h-4" /> Cancelar
             </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
             <div className="flex-1 p-8 overflow-y-auto">
                {renderStepContent()}
             </div>
             
             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={onCancel}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                   Cancelar
                </button>
                <button 
                  onClick={handleNext}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                >
                   {currentStep === 'create-ad' ? 'Finalizar e Publicar' : 'Próximo Passo'}
                </button>
             </div>
          </div>

       </div>
    </div>
  );
}
