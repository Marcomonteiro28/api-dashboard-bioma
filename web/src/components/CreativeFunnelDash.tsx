import { fmtNum, fmtBRL, fmtPct } from "../utils/format";
import type { CreativeFunnelRow, MatchType } from "../types";

const tagFor = (m: MatchType) => {
  if (m === "AD_NAME") return <span className="match-tag ad">✓ AD</span>;
  if (m === "CAMPAIGN_NAME") return <span className="match-tag campaign">~ CAMP</span>;
  return <span className="match-tag none">—</span>;
};

function progressionBar(pct: number, max = 100) {
  const clamped = Math.max(0, Math.min(max, pct));
  return (
    <div className="cf-bar">
      <div className="cf-bar-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function CreativeFunnelDash({
  data,
  periodLabel,
  minLeads,
}: {
  data: CreativeFunnelRow[];
  periodLabel: string;
  minLeads: number;
}) {
  if (data.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Criativos que mais avançam no funil</h3>
        <p className="card-subtitle">
          Nenhum criativo com {minLeads}+ leads no período. Aumente o range ou diminua o min_leads.
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...data.map((d) => d.progression_score || 0));

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Criativos que mais avançam no funil</h3>
      <p className="card-subtitle">
        {periodLabel} · mínimo {minLeads} leads por criativo · score ponderado{" "}
        <code style={{ background: "var(--primary-pale)", padding: "1px 6px", borderRadius: 4 }}>
          (visitas × 3 + agendamentos) ÷ leads × 100
        </code>{" "}
        — mede progressão real no funil, não só volume de entrada
      </p>
      <div className="table-wrap">
        <table className="cf-table">
          <thead>
            <tr>
              <th>Criativo</th>
              <th className="num">Leads</th>
              <th className="num">% Qualif</th>
              <th className="num">% Q→A</th>
              <th className="num">% A→V</th>
              <th className="num">% Ganho</th>
              <th>Score</th>
              <th className="num">Gasto</th>
              <th className="num">Custo/visita</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={i}>
                <td className="creative-name">
                  <span className="cf-rank">#{i + 1}</span>{" "}
                  <strong>{c.criativo || "(sem nome)"}</strong>
                  <small>
                    {c.empreendimento || "—"} · {tagFor(c.match_type)}
                  </small>
                </td>
                <td className="num highlight">{fmtNum(c.leads)}</td>
                <td className="num">{fmtPct(c.pct_qualif)}</td>
                <td className="num">{fmtPct(c.pct_qualif_agend)}</td>
                <td className="num">{fmtPct(c.pct_agend_visit)}</td>
                <td className="num">{fmtPct(c.pct_ganho)}</td>
                <td className="cf-score-cell">
                  <div className="cf-score-row">
                    <span className="cf-score-val">{c.progression_score?.toFixed(1)}</span>
                    {progressionBar((c.progression_score / maxScore) * 100)}
                  </div>
                </td>
                <td className="num">
                  {c.gasto_brl > 0 ? (
                    <span className="num-money">{fmtBRL(c.gasto_brl)}</span>
                  ) : (
                    <span className="num-zero">—</span>
                  )}
                </td>
                <td className="num">
                  {c.custo_por_visita_brl ? (
                    <span className="num-money">{fmtBRL(c.custo_por_visita_brl)}</span>
                  ) : (
                    <span className="num-zero">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
