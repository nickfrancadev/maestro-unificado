// Creation selector — /landing-pages/new. Three paths (AI / template / blank)
// that all end by creating a draft LandingPage in the repo and navigating
// into the editor.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, LayoutTemplate, FileText, Loader2, ArrowRight } from 'lucide-react';
import { TEMPLATES } from '../templates/catalog';
import { composePage, type AiBrief } from './composer';
import { newLandingPage } from '../store/model';
import { savePage } from '../store/repo';
import { newBlock } from '../schema/registry';
import { createDefaultBrandKit, MOCK_BRAND_FIXTURE, type BrandKit } from '../../campaigns/wizard/brandKit';
import { AiBriefForm, type AiBriefSubmission } from './AiBriefForm';

type Mode = 'choose' | 'ai' | 'template';

function buildBrandKit(): BrandKit {
  return {
    ...createDefaultBrandKit(),
    ...MOCK_BRAND_FIXTURE,
    status: 'defined',
    websiteUrl: '',
  };
}

export function CreateSelector() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('choose');
  const [generating, setGenerating] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (aiTimerRef.current !== null) {
        window.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, []);

  const goToEditor = (id: string) => navigate(`/landing-pages/${id}/edit`);

  const handleBlank = () => {
    const page = newLandingPage({
      name: 'Nova Landing Page',
      templateOrigin: 'blank',
      blocks: [newBlock('navbar'), newBlock('footer')],
      brandKit: buildBrandKit(),
    });
    savePage(page);
    goToEditor(page.id);
  };

  const handleTemplate = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const page = newLandingPage({
      name: template.name,
      templateOrigin: template.id,
      blocks: template.buildBlocks(),
      brandKit: buildBrandKit(),
    });
    savePage(page);
    goToEditor(page.id);
  };

  const handleAiSubmit = ({ brief, pageName }: AiBriefSubmission) => {
    setGenerating(true);
    // Simulated "AI generation" delay — composePage itself is instantaneous
    // and deterministic; the spinner just sells the async feel.
    aiTimerRef.current = window.setTimeout(() => {
      aiTimerRef.current = null;
      const blocks = composePage(brief);
      const page = newLandingPage({
        name: pageName,
        templateOrigin: 'ai',
        blocks,
        brandKit: buildBrandKit(),
      });
      savePage(page);
      goToEditor(page.id);
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (mode === 'choose' ? navigate('/landing-pages') : setMode('choose'))}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          disabled={generating}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nova Landing Page</h1>
          <p className="text-sm text-slate-500">
            {mode === 'choose' && 'Escolha como você quer começar.'}
            {mode === 'ai' && 'Gerar com IA — responda um briefing guiado.'}
            {mode === 'template' && 'Escolha um template para começar.'}
          </p>
        </div>
      </div>

      {mode === 'choose' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <button
            onClick={() => setMode('ai')}
            className="relative text-left p-6 rounded-xl border-2 border-[#FF5F39] bg-gradient-to-br from-[#FFF1ED] to-white shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[#FF5F39] text-white">
              Recomendado
            </span>
            <div
              className="flex items-center justify-center rounded-lg mb-4"
              style={{ width: 40, height: 40, background: '#FF5F39', color: 'white' }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Gerar com IA</h2>
            <p className="text-sm text-slate-600">
              Responda um briefing guiado (objetivo, conta, mensagem) e deixe a IA montar a página com base no seu
              brand kit.
            </p>
          </button>

          <button
            onClick={() => setMode('template')}
            className="text-left p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div
              className="flex items-center justify-center rounded-lg mb-4"
              style={{ width: 40, height: 40, background: '#FFF1ED', color: '#FF5F39' }}
            >
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Começar de um template</h2>
            <p className="text-sm text-slate-600">
              Escolha entre modelos prontos para microsite 1:1, vertical, POC ou convite de demonstração.
            </p>
          </button>

          <button
            onClick={handleBlank}
            className="text-left p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div
              className="flex items-center justify-center rounded-lg mb-4"
              style={{ width: 40, height: 40, background: '#F1F5F9', color: '#475569' }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Começar em branco</h2>
            <p className="text-sm text-slate-600">
              Comece só com navbar e rodapé e monte a página do zero, bloco a bloco.
            </p>
          </button>
        </div>
      )}

      {mode === 'template' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplate(template.id)}
              className="text-left p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-[#FF5F39] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#FF5F39] transition-colors" />
              </div>
              <p className="text-sm text-slate-600 mb-3">{template.useCase}</p>
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {mode === 'ai' && !generating && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <AiBriefForm onSubmit={handleAiSubmit} onCancel={() => setMode('choose')} submitting={generating} />
        </div>
      )}

      {mode === 'ai' && generating && (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 text-[#FF5F39] animate-spin" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Gerando sua landing page…</p>
            <p className="text-xs text-slate-500 mt-1">
              Aplicando o brand kit e personalizando os blocos com base no briefing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateSelector;
