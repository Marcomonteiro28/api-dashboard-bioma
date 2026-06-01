import { fmtNum, fmtBRL, fmtPct } from "../utils/format";
import type { AttributionCreative, MatchType } from "../types";
import { useSortableData } from "../hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";

const tagFor = (m: MatchType) => {
  if (m === "AD_NAME")
    return (
      <span className="match-tag ad" title="Bate com nome de anúncio no Meta">
        ✓ AD
      </span>
    );
  if (m === "CAMPAIGN_NAME")
    return (
      <span className="match-tag campaign" title="Bate com nome de campanha (não individual)">
        ~ CAMP
      </span>
    );
  return (
    <span
      className="match-tag none"
      title="Sem match no Meta — audience, lookalike ou criativo descontinuado"
    >
      —
    </span>
  );
};

const moneyOr = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  return n === 0 ? <span className="num-zero">—</span> : <span className="num-money">{fmtBRL(n)}</span>;
};

export function CreativeAttributionBlock({
  data,
  periodLabel,
}: {
  data: AttributionCreative[];
  periodLabel: string;
}) {
  // Limita a 20 antes de ordenar pra performance — pega top 20 por leads e
  // ai aplica o sort cliente. Se quiser sortar a lista completa, mover slice
  // pra depois do sort.
  const top = data.slice(0, 20);
  const { sorted, sortConfig, requestSort } = useSortableData<AttributionCreative>(top, {
    key: "leads",
    direction: "desc",
  });

  if (data.length === 0) return null;

  const totalDeals = data.reduce((s, c) => s + (Number(c.leads) || 0), 0);
  const adsBateu = data.filter((c) => c.match_type === "AD_NAME").length;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Top criativos × leads (atribuição AC × Meta)</h3>
      <p className="card-subtitle">
        {periodLabel} · {data.length} criativos · {totalDeals} deals taggeados · {adsBateu} bateram
        com Meta ads · gasto disponível apenas onde houve match · clique nos headers pra ordenar
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader<AttributionCreative> label="Criativo · emp · match" sortKey="criativo" config={sortConfig} onSort={requestSort} />
              <SortableHeader<AttributionCreative> label="Leads" sortKey="leads" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="Qualif" sortKey="qualificados" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="Agend" sortKey="agendamentos" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="Visitas" sortKey="visitas" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="Gasto Meta" sortKey="gasto_brl" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="CPL" sortKey="cpl_brl" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="CPQ" sortKey="cpq_brl" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionCreative> label="CTR" sortKey="ctr_pct" config={sortConfig} onSort={requestSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={i} className="creative-row">
                <td className="creative-name">
                  {c.criativo}
                  <small>
                    {c.empreendimento || "—"} · {tagFor(c.match_type)}
                  </small>
                </td>
                <td className="num">{fmtNum(c.leads)}</td>
                <td className="num">{fmtNum(c.qualificados)}</td>
                <td className="num">{fmtNum(c.agendamentos)}</td>
                <td className="num">{fmtNum(c.visitas)}</td>
                <td className="num">{moneyOr(c.gasto_brl)}</td>
                <td className="num">{moneyOr(c.cpl_brl)}</td>
                <td className="num">{moneyOr(c.cpq_brl)}</td>
                <td className="num">
                  {c.ctr_pct != null && Number(c.ctr_pct) > 0 ? (
                    fmtPct(Number(c.ctr_pct))
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
