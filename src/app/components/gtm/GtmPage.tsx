import { useState } from "react";
import { Megaphone, LayoutGrid, PackagePlus, CalendarPlus, UserPlus, Database } from "lucide-react";
import { GtmProduto, GtmMomento, GtmPublico, GtmPitch, defaultProdutos, defaultMomentos, defaultPublicos } from "../gtmStore";
import { MatrixTab } from "./MatrixTab";
import { PitchGenerator } from "./PitchGenerator";
import { ProdutoDrawer, MomentoDrawer, PublicoDrawer } from "./GtmDrawers";
import { GestaoTab } from "./GestaoTab";

type Tab = "overview" | "gestao";

export function GtmPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [produtos, setProdutos] = useState<GtmProduto[]>(defaultProdutos);
  const [momentos, setMomentos] = useState<GtmMomento[]>(defaultMomentos);
  const [publicos, setPublicos] = useState<GtmPublico[]>(defaultPublicos);
  const [pitches, setPitches] = useState<GtmPitch[]>([]);
  
  const [showPitchGenerator, setShowPitchGenerator] = useState(false);
  
  const [editingProduto, setEditingProduto] = useState<GtmProduto | null>(null);
  const [editingMomento, setEditingMomento] = useState<GtmMomento | null>(null);
  const [editingPublico, setEditingPublico] = useState<GtmPublico | null>(null);

  const handleSaveProduto = (p: GtmProduto) => {
    setProdutos(prev => prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]);
  };
  const handleSaveMomento = (m: GtmMomento) => {
    setMomentos(prev => prev.some(x => x.id === m.id) ? prev.map(x => x.id === m.id ? m : x) : [...prev, m]);
  };
  const handleSavePublico = (p: GtmPublico) => {
    setPublicos(prev => prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]);
  };

  const handleLinkPitch = (produtoId: string, momentoId: string, publicoId: string) => {
    setProdutos(prev => prev.map(p => {
      if (p.id === produtoId) {
        const momentosIds = p.momentosIds?.includes(momentoId) ? p.momentosIds : [...(p.momentosIds || []), momentoId];
        const publicosIds = p.publicosIds?.includes(publicoId) ? p.publicosIds : [...(p.publicosIds || []), publicoId];
        return Object.assign({}, p, { momentosIds, publicosIds });
      }
      return p;
    }));
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Tipo,ID,Nome/Titulo\n"
      + produtos.map(p => `Produto,${p.id},${p.nome}`).join("\n") + "\n"
      + momentos.map(m => `Momento,${m.id},${m.titulo}`).join("\n") + "\n"
      + publicos.map(p => `Publico,${p.id},${p.nome}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gtm_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMatrixCSV = () => {
    const momentHeaders = momentos.map(m => `Momento: ${m.titulo}`).join(",");
    const publicoHeaders = publicos.map(p => `Público: ${p.nome}`).join(",");
    const header = `Produto,Tipo,${momentHeaders},${publicoHeaders}\n`;

    const rows = produtos.map(prod => {
      const rowData = [
        `"${prod.nome}"`,
        `"${prod.tipo}"`,
        ...momentos.map(m => prod.momentosIds?.includes(m.id) ? "Sim" : "-"),
        ...publicos.map(p => prod.publicosIds?.includes(p.id) ? "Sim" : "-")
      ];
      return rowData.join(",");
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gtm_matriz_cruzada.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-900 text-[#FF5F39]">
              <Megaphone size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Go to Market</h1>
              <p className="text-sm text-gray-500 mt-0.5">Visão integrada e gerador de abordagens com IA.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setEditingProduto({} as any)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
              <PackagePlus size={14} /> Novo Produto
            </button>
            <button onClick={() => setEditingMomento({} as any)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
              <CalendarPlus size={14} /> Novo Momento
            </button>
            <button onClick={() => setEditingPublico({} as any)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
              <UserPlus size={14} /> Novo Público
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button onClick={() => setShowPitchGenerator(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[#FF5F39] hover:bg-[#E04D2A] transition-colors shadow-sm">
              Gerar Pitch IA
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab("overview")} className={"flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 " + (activeTab === "overview" ? "border-[#FF5F39] text-[#FF5F39]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}>
            <LayoutGrid size={16} /> Matriz GTM
          </button>
          <button onClick={() => setActiveTab("gestao")} className={"flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 " + (activeTab === "gestao" ? "border-[#FF5F39] text-[#FF5F39]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}>
            <Database size={16} /> Gestão de Cadastros
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "overview" && <MatrixTab produtos={produtos} momentos={momentos} publicos={publicos} onExportCSV={exportMatrixCSV} />}
        {activeTab === "gestao" && (
          <GestaoTab 
            produtos={produtos} momentos={momentos} publicos={publicos}
            onEditProduto={setEditingProduto} onDeleteProduto={id => setProdutos(prev => prev.filter(x => x.id !== id))}
            onEditMomento={setEditingMomento} onDeleteMomento={id => setMomentos(prev => prev.filter(x => x.id !== id))}
            onEditPublico={setEditingPublico} onDeletePublico={id => setPublicos(prev => prev.filter(x => x.id !== id))}
            onExportCSV={exportCSV}
          />
        )}
      </div>

      {showPitchGenerator && <PitchGenerator produtos={produtos} momentos={momentos} publicos={publicos} onClose={() => setShowPitchGenerator(false)} onSave={p => setPitches(prev => [...prev, p])} onLink={handleLinkPitch} />}
      {editingProduto && <ProdutoDrawer onClose={() => setEditingProduto(null)} onSave={handleSaveProduto} produtos={produtos} momentos={momentos} publicos={publicos} initialData={editingProduto.id ? editingProduto : null} />}
      {editingMomento && <MomentoDrawer onClose={() => setEditingMomento(null)} onSave={handleSaveMomento} initialData={editingMomento.id ? editingMomento : null} />}
      {editingPublico && <PublicoDrawer onClose={() => setEditingPublico(null)} onSave={handleSavePublico} initialData={editingPublico.id ? editingPublico : null} />}
    </div>
  );
}