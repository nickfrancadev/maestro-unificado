import { GtmProduto, GtmMomento, GtmPublico } from "../gtmStore";
import { Edit2, Trash2, Download, Package, Calendar, Users } from "lucide-react";
import { isAfter, isBefore, parseISO, startOfDay, endOfDay } from "date-fns";

export function GestaoTab({
  produtos,
  momentos,
  publicos,
  onEditProduto,
  onDeleteProduto,
  onEditMomento,
  onDeleteMomento,
  onEditPublico,
  onDeletePublico,
  onExportCSV
}: {
  produtos: GtmProduto[];
  momentos: GtmMomento[];
  publicos: GtmPublico[];
  onEditProduto: (p: GtmProduto) => void;
  onDeleteProduto: (id: string) => void;
  onEditMomento: (m: GtmMomento) => void;
  onDeleteMomento: (id: string) => void;
  onEditPublico: (p: GtmPublico) => void;
  onDeletePublico: (id: string) => void;
  onExportCSV: () => void;
}) {
  const today = new Date();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Gestão de Cadastros</h3>
          <p className="text-sm text-gray-500">Gerencie todos os dados que alimentam sua Matriz GTM e Pitches.</p>
        </div>
        <button onClick={onExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm">
          <Download size={16} /> Exportar Dados (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Produtos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-1 bg-gray-50/50 rounded-t-xl shrink-0">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Produtos / Serviços</h3>
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{produtos.length}</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">O que sua empresa oferece ao mercado.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {produtos.map(p => (
              <div key={p.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                  <p className="text-xs text-gray-500 truncate">{p.tipo}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onEditProduto(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Editar"><Edit2 size={14} /></button>
                  <button onClick={() => onDeleteProduto(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Excluir"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {produtos.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Nenhum produto cadastrado.</p>}
          </div>
        </div>

        {/* Momentos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-1 bg-gray-50/50 rounded-t-xl shrink-0">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-[#FF5F39]" />
              <h3 className="text-lg font-bold text-gray-900">Momentos de Mercado</h3>
              <span className="ml-auto bg-orange-100 text-[#FF5F39] text-xs font-bold px-2 py-0.5 rounded-full">{momentos.length}</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">Gatilhos temporais que geram oportunidades.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {momentos.map(m => {
              const start = startOfDay(parseISO(m.dataInicio));
              const end = endOfDay(parseISO(m.dataFim));
              const isActive = (isAfter(today, start) || today.getTime() === start.getTime()) && isBefore(today, end);
              const isPast = isAfter(today, end);
              
              let statusText = "Futuro";
              let statusColor = "bg-blue-100 text-blue-700";
              if (isActive) {
                statusText = "Ativo Agora";
                statusColor = "bg-orange-100 text-[#FF5F39]";
              } else if (isPast) {
                statusText = "Concluído";
                statusColor = "bg-gray-100 text-gray-600";
              }

              return (
                <div key={m.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.titulo}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${statusColor}`}>{statusText}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{m.dataInicio.split('-').reverse().join('/')} até {m.dataFim.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => onEditMomento(m)} className="p-1.5 text-gray-400 hover:text-[#FF5F39] rounded-md hover:bg-orange-50 transition-colors" title="Editar"><Edit2 size={14} /></button>
                    <button onClick={() => onDeleteMomento(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Excluir"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
            {momentos.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Nenhum momento cadastrado.</p>}
          </div>
        </div>

        {/* Públicos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-1 bg-gray-50/50 rounded-t-xl shrink-0">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">Públicos / Personas</h3>
              <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{publicos.length}</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">Quem influencia ou decide a compra.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {publicos.map(p => (
              <div key={p.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                  <p className="text-xs text-gray-500 truncate">{p.classificacao}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onEditPublico(p)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors" title="Editar"><Edit2 size={14} /></button>
                  <button onClick={() => onDeletePublico(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Excluir"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {publicos.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Nenhum público cadastrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}