import { Filter } from "lucide-react";

export function FunilTab() {
  return (
    <div
      className="bg-white rounded-xl border border-[#d8d8d8] py-20 px-6 text-center"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div
        className="flex items-center justify-center rounded-2xl mx-auto mb-4"
        style={{ width: 64, height: 64, background: "#FFF5F3" }}
      >
        <Filter size={28} style={{ color: "#FF5F39" }} />
      </div>
      <p
        className="font-['Euclid_Circular_A',sans-serif] mb-1"
        style={{ fontSize: 18, fontWeight: 600, color: "#212A46" }}
      >
        Funil em breve
      </p>
      <p
        className="font-['Euclid_Circular_A',sans-serif]"
        style={{ fontSize: 14, color: "#9CA3AF" }}
      >
        A visão de funil será disponibilizada em uma próxima atualização.
      </p>
    </div>
  );
}
