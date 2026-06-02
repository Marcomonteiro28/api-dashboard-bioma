import { fmtNum, fmtPct } from "../utils/format";
import type { WeeklyLeadsRow } from "../types";
import { RichTooltip } from "./RichTooltip";

const fmtDate = (x: Date) =>
  `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;

/**
 * Calcula o range visivel da semana considerando o filtro [from, to].
 * Se a semana inteira (Mon-Sun) cai dentro do filtro, retorna ela toda.
 * Se for parcial (filtro corta a semana), retorna so o trecho visivel.
 */
function getVisibleWeekRange(
  weekStartIso: string,
  fromIso: string,
  toIso: string
): { start: Date; end: Date; daysInFilter: number; isPartial: boolean } {
  const weekStart = new Date(weekStartIso + "T00:00:00");
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const filterFrom = new Date(fromIso + "T00:00:00");
  const filterTo = new Date(toIso + "T00:00:00");

  const start = weekStart < filterFrom ? filterFrom : weekStart;
  const end = weekEnd > filterTo ? filterTo : weekEnd;
  const daysInFilter = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const isPartial = daysInFilter < 7;

  return { start, end, daysInFilter, isPartial };
}

function formatWeekLabel(
  weekStartIso: string,
  fromIso: string,
  toIso: string
): string {
  const { start, end, isPartial } = getVisibleWeekRange(weekStartIso, fromIso, toIso);
  if (!isPartial) return fmtDate(start);
  return `${fmtDate(start)}-${fmtDate(end)}`;
}

function formatWeekRange(
  weekStartIso: string,
  fromIso: string,
  toIso: string
): { range: string; isPartial: boolean; daysInFilter: number } {
  const { start, end, daysInFilter, isPartial } = getVisibleWeekRange(
    weekStartIso,
    fromIso,
    toIso
  );
  return {
    range: `${fmtDate(start)} → ${fmtDate(end)}`,
    isPartial,
    daysInFilter,
  };
}

export function WeeklyLeadsChart({
  data,
  periodLabel,
  from,
  to,
}: {
  data: WeeklyLeadsRow[];
  periodLabel: string;
  from: string;
  to: string;
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
          const pctQualifInLead = d.leads ? (d.qualificados / d.leads) * 100 : 0;
          const pctVisitInLead = d.leads ? (d.visitas / d.leads) * 100 : 0;
          const pctGanhoInLead = d.leads ? (d.ganhos / d.leads) * 100 : 0;
          const { range, isPartial, daysInFilter } = formatWeekRange(d.semana, from, to);
          const tooltipTitle = isPartial
            ? `${range} (${daysInFilter} dias visíveis · semana parcial)`
            : `Semana ${range}`;
          return (
            <RichTooltip
              key={d.semana}
              className="as-flex-item"
              title={tooltipTitle}
              rows={[
                {
                  label: "Leads entrada",
                  value: fmtNum(d.leads),
                  color: "var(--primary)",
                },
                {
                  label: "Qualificados",
                  value: `${fmtNum(d.qualificados)} (${fmtPct(pctQualifInLead)})`,
                  color: "var(--accent)",
                },
                {
                  label: "Visitas",
                  value: `${fmtNum(d.visitas)} (${fmtPct(pctVisitInLead)})`,
                },
                {
                  label: "Ganhos",
                  value: `${fmtNum(d.ganhos)} (${fmtPct(pctGanhoInLead)})`,
                  emphasis: true,
                },
              ]}
            >
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
                    style={{ height: `${pctQualifInLead}%` }}
                  />
                </div>
              </div>
              <div className="weekly-bar-label">{formatWeekLabel(d.semana, from, to)}</div>
            </RichTooltip>
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
