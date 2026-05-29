import { fmtNum } from "../utils/format";
import type { WeeklyLeadsRow } from "../types";

function formatWeekLabel(iso: string): string {
  // iso = "2026-05-25" (segunda-feira)
  const d = new Date(iso + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export function WeeklyLeadsChart({
  data,
  periodLabel,
}: {
  data: WeeklyLeadsRow[];
  periodLabel: string;
}) {
  if (data.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Entrada semanal de leads</h3>
        <p className="card-subtitle">Sem dados no período.</p>
      </div>
    );
  }

  const maxLeads = Math.max(1, ...data.map((d) => d.leads));
  const totalLeads = data.reduce((s, d) => s + d.leads, 0);
  const totalQualif = data.reduce((s, d) => s + d.qualificados, 0);
  const totalVisitas = data.reduce((s, d) => s + d.visitas, 0);
  const mediaSemanal = Math.round(totalLeads / data.length);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Entrada semanal de leads</h3>
      <p className="card-subtitle">
        {periodLabel} · {data.length} semanas · média {fmtNum(mediaSemanal)} leads/semana · total{" "}
        {fmtNum(totalLeads)} leads ({fmtNum(totalQualif)} qualif, {fmtNum(totalVisitas)} visitas)
      </p>

      <div className="weekly-chart">
        {data.map((d) => {
          const pctLeads = (d.leads / maxLeads) * 100;
          const pctQualif = d.leads ? (d.qualificados / d.leads) * 100 : 0;
          return (
            <div key={d.semana} className="weekly-bar-wrap" title={`Semana de ${d.semana}`}>
              <div className="weekly-bar-numbers">
                <span className="weekly-bar-leads">{fmtNum(d.leads)}</span>
                {d.qualificados > 0 && (
                  <span className="weekly-bar-qualif">{fmtNum(d.qualificados)}</span>
                )}
              </div>
              <div className="weekly-bar-stack">
                <div className="weekly-bar-leads-fill" style={{ height: `${pctLeads}%` }}>
                  <div
                    className="weekly-bar-qualif-fill"
                    style={{ height: `${pctQualif}%` }}
                  />
                </div>
              </div>
              <div className="weekly-bar-label">{formatWeekLabel(d.semana)}</div>
            </div>
          );
        })}
      </div>

      <div className="weekly-legend">
        <span className="weekly-legend-item">
          <span className="weekly-legend-dot leads" /> Leads (entrada)
        </span>
        <span className="weekly-legend-item">
          <span className="weekly-legend-dot qualif" /> Qualificados (sub-segmento dos leads)
        </span>
      </div>
    </div>
  );
}
