import { fmtNum } from "../utils/format";
import type { Estagio } from "../types";

interface Sums {
  leads: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  negociacoes: number;
  ganhos: number;
}

export function KpiGrid({
  cur,
  prev,
  onOpenStage,
}: {
  cur: Sums;
  prev: Sums;
  onOpenStage: (e: Estagio) => void;
}) {
  const cards: { label: string; value: number; prev: number; estagio: Estagio }[] = [
    { label: "Leads", value: cur.leads, prev: prev.leads, estagio: "leads" },
    { label: "Em Atendimento", value: cur.qualificados, prev: prev.qualificados, estagio: "qualificados" },
    {
      label: "Agendamentos",
      value: cur.agendamentos,
      prev: prev.agendamentos,
      estagio: "agendamentos",
    },
    { label: "Visitas realizadas", value: cur.visitas, prev: prev.visitas, estagio: "visitas" },
    {
      label: "Negociações",
      value: cur.negociacoes,
      prev: prev.negociacoes,
      estagio: "negociacoes",
    },
    { label: "Ganhos", value: cur.ganhos, prev: prev.ganhos, estagio: "ganhos" },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => {
        const d = c.prev ? ((c.value - c.prev) / c.prev) * 100 : null;
        const arrow = d == null ? "" : d > 0 ? "▲" : d < 0 ? "▼" : "";
        const klass = d == null ? "neutral" : d > 0 ? "up" : d < 0 ? "down" : "neutral";
        return (
          <div key={c.estagio} className="kpi-card" onClick={() => onOpenStage(c.estagio)}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmtNum(c.value)}</div>
            {d != null && (
              <div className={`kpi-delta ${klass}`}>
                {arrow} {Math.abs(d).toFixed(1)}% vs. anterior
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
