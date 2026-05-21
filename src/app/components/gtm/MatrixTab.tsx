import { GtmProduto, GtmMomento, GtmPublico } from "../gtmStore";
import { Check, Download } from "lucide-react";

export function MatrixTab({
  produtos,
  momentos,
  publicos,
  onExportCSV
}: {
  produtos: GtmProduto[];
  momentos: GtmMomento[];
  publicos: GtmPublico[];
  onExportCSV?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Matriz de Relacionamento GTM</h3>
          <p className="text-sm text-gray-500 mt-1">Visão geral do alinhamento entre Produtos, Momentos e Públicos-Alvo.</p>
        </div>
        {onExportCSV && (
          <button onClick={onExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm">
            <Download size={16} /> Exportar Matriz (CSV)
          </button>
        )}
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr>
              <th className="px-5 py-4 bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky left-0 z-10 w-64 min-w-[250px]">Produto / Serviço</th>
              {momentos.map(m => (
                <th key={m.id} className="px-4 py-4 bg-[#f8fafc] text-[#3571de] font-semibold border-b border-gray-200 border-l border-gray-100 text-center min-w-[140px]">
                  <div className="line-clamp-2" title={m.titulo}>{m.titulo}</div>
                </th>
              ))}
              {publicos.map(p => (
                <th key={p.id} className="px-4 py-4 bg-[#fff7f5] text-[#FF5F39] font-semibold border-b border-gray-200 border-l border-gray-100 text-center min-w-[140px]">
                  <div className="line-clamp-2" title={p.nome}>{p.nome}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {produtos.map(prod => (
              <tr key={prod.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-5 py-4 bg-white sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                  <p className="font-semibold text-gray-900">{prod.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{prod.tipo}</p>
                </td>
                {momentos.map(m => {
                  const linked = prod.momentosIds?.includes(m.id);
                  return (
                    <td key={m.id} className="px-4 py-4 text-center border-l border-gray-50">
                      {linked ? (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                          <Check size={14} className="text-blue-600" />
                        </div>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                  );
                })}
                {publicos.map(p => {
                  const linked = prod.publicosIds?.includes(p.id);
                  return (
                    <td key={p.id} className="px-4 py-4 text-center border-l border-gray-50">
                      {linked ? (
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                          <Check size={14} className="text-orange-600" />
                        </div>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}