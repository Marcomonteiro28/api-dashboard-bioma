import { fmtNum, fmtPct } from "../utils/format";

interface FunnelStage {
  name: string;
  count: number;
}

export function Funnel({ stages, periodLabel }: { stages: FunnelStage[]; periodLabel: string }) {
  const maxLeads = stages[0]?.count || 1;
  return (
    <div className="card">
      <h3 className="card-title">Funil de conversão</h3>
      <p className="card-subtitle">Cumulativo · {periodLabel}</p>
      {stages.map((s, i) => {
        const pct = maxLeads ? (s.count / maxLeads) * 100 : 0;
        const prevStage = i > 0 ? stages[i - 1].count : null;
        const conv = prevStage ? (s.count / prevStage) * 100 : 100;
        return (
          <div key={s.name} className="funnel-row">
            <div className="funnel-head">
              <span className="stage-name">{s.name}</span>
              <span>
                {fmtNum(s.count)} <span style={{ color: "#94a394" }}>({fmtPct(pct)})</span>
              </span>
            </div>
            <div className="funnel-bar-bg">
              <div className="funnel-bar" style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
            {i > 0 && (
              <div className="funnel-conv">↓ {fmtPct(conv)} do estágio anterior</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
