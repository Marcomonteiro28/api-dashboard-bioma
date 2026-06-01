import { fmtNum, fmtBRL, fmtPct } from "../utils/format";
import type { AttributionEmp } from "../types";
import { useSortableData } from "../hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";

const moneyOr = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  return n === 0 ? <span className="num-zero">—</span> : <span className="num-money">{fmtBRL(n)}</span>;
};
const pctOrDash = (v: number | null | undefined) =>
  v == null ? <span className="num-zero">—</span> : <>{fmtPct(Number(v))}</>;

export function AttributionEmpBlock({
  data,
  periodLabel,
}: {
  data: AttributionEmp[];
  periodLabel: string;
}) {
  const { sorted, sortConfig, requestSort } = useSortableData<AttributionEmp>(data, {
    key: "gasto_meta_brl",
    direction: "desc",
  });

  if (data.length === 0) return null;

  const totals = data.reduce(
    (acc, e) => {
      acc.gasto += Number(e.gasto_meta_brl) || 0;
      acc.leads += Number(e.leads) || 0;
      acc.impr += Number(e.impressoes) || 0;
      acc.cliques += Number(e.cliques) || 0;
      if (Number(e.gasto_meta_brl) > 0) acc.empsComInvest++;
      return acc;
    },
    { gasto: 0, leads: 0, impr: 0, cliques: 0, empsComInvest: 0 }
  );

  const cpl = totals.leads ? totals.gasto / totals.leads : null;
  const ctr = totals.impr ? (totals.cliques / totals.impr) * 100 : null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Atribuição Meta × CRM</h3>
      <p className="card-subtitle">
        {periodLabel} · gasto Meta cruzado com leads/qualificados/visitas do CRM por empreendimento
      </p>
      <div className="meta-kpi-strip">
        <div>
          <div className="meta-kpi-label">Gasto Meta no período</div>
          <div className="meta-kpi-value">{fmtBRL(totals.gasto)}</div>
          <div className="meta-kpi-sub">
            {fmtNum(totals.impr)} impressões · {fmtNum(totals.cliques)} cliques
          </div>
        </div>
        <div>
          <div className="meta-kpi-label">CPL global</div>
          <div className="meta-kpi-value">{cpl == null ? "—" : fmtBRL(cpl)}</div>
          <div className="meta-kpi-sub">{fmtNum(totals.leads)} leads vindos do CRM</div>
        </div>
        <div>
          <div className="meta-kpi-label">CTR global</div>
          <div className="meta-kpi-value">{ctr == null ? "—" : fmtPct(ctr)}</div>
          <div className="meta-kpi-sub">{totals.empsComInvest} empreendimento(s) com investimento</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader<AttributionEmp> label="Empreendimento" sortKey="empreendimento" config={sortConfig} onSort={requestSort} />
              <SortableHeader<AttributionEmp> label="Leads" sortKey="leads" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionEmp> label="Qualif" sortKey="qualificados" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionEmp> label="Visitas" sortKey="visitas" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionEmp> label="Gasto Meta" sortKey="gasto_meta_brl" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionEmp> label="CPL" sortKey="cpl_brl" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionEmp> label="CTR" sortKey="ctr_pct" config={sortConfig} onSort={requestSort} align="right" />
              <SortableHeader<AttributionEmp> label="CPC" sortKey="cpc_brl" config={sortConfig} onSort={requestSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.empreendimento}>
                <td className="emp">{e.empreendimento}</td>
                <td className="num">{fmtNum(e.leads)}</td>
                <td className="num">{fmtNum(e.qualificados)}</td>
                <td className="num">{fmtNum(e.visitas)}</td>
                <td className="num">{moneyOr(e.gasto_meta_brl)}</td>
                <td className="num">{moneyOr(e.cpl_brl)}</td>
                <td className="num">{pctOrDash(e.ctr_pct)}</td>
                <td className="num">{moneyOr(e.cpc_brl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
