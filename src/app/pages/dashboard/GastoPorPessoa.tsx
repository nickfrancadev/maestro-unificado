interface PessoaGasto {
  pessoa: string;
  total: number;
}

// Paleta multicolor estilo Mixpanel
const BAR_COLORS = [
  "#6D5BD0",
  "#F2724F",
  "#7FD9C9",
  "#F2B33D",
  "#A4456A",
  "#7FB3F2",
  "#F2A86B",
  "#2E6B8A",
  "#52A373",
];

interface GastoPorPessoaProps {
  data: PessoaGasto[];
  totalGeral: number;
}

export function GastoPorPessoa({ data, totalGeral }: GastoPorPessoaProps) {
  const ordered = [...data].sort((a, b) => b.total - a.total);
  const max = ordered.length ? ordered[0].total : 1;

  return (
    <div className="bg-white rounded-xl border border-[#d8d8d8] p-5 flex flex-col">
      <div className="mb-4">
        <h3
          className="font-['Euclid_Circular_A',sans-serif]"
          style={{ fontSize: 14, fontWeight: 700, color: "#212A46" }}
        >
          Gasto por pessoa
        </h3>
        <p
          className="font-['Euclid_Circular_A',sans-serif]"
          style={{ fontSize: 11, color: "#9CA3AF" }}
        >
          Total{" "}
          <span style={{ fontWeight: 700, color: "#6B7280" }}>
            {totalGeral}
          </span>{" "}
          créditos no período
        </p>
      </div>

      {ordered.length === 0 ? (
        <p
          className="font-['Euclid_Circular_A',sans-serif] py-8 text-center"
          style={{ fontSize: 13, color: "#9CA3AF" }}
        >
          Sem dados no período.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((item, i) => (
            <div key={item.pessoa} className="flex items-center gap-3">
              <span
                className="font-['Euclid_Circular_A',sans-serif] truncate text-right shrink-0"
                style={{ fontSize: 12, color: "#4B5563", width: 96 }}
                title={item.pessoa}
              >
                {item.pessoa}
              </span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div
                  className="rounded-md transition-all"
                  style={{
                    height: 22,
                    width: `${Math.max((item.total / max) * 100, 4)}%`,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
                <span
                  className="font-['Euclid_Circular_A',sans-serif] tabular-nums shrink-0"
                  style={{ fontSize: 13, fontWeight: 700, color: "#212A46" }}
                >
                  {item.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
