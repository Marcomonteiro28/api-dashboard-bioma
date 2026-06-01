import { fmtNum, fmtBRL, fmtPct } from "../utils/format";
import type { MediaPagaByEmpRow } from "../types";
import { useSortableData } from "../hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";
import { ExportButton } from "./ExportButton";

const moneyOr = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  return n === 0 ? (
    <span className="num-zero">—</span>
  ) : (
    <span className="num-money">{fmtBRL(n)}</span>
  );
};

const pctOrDash = (v: number | null | undefined) =>
  v == null ? <span className="num-zero">—</span> : <>{fmtPct(Number(v))}</>;

function platformPill(
  metaValue: number,
  gadsValue: number,
  total: number,
  formatter: (v: number) => string
) {
  if (total === 0) return <span className="num-zero">—</span>;
  const metaPct = (metaValue / total) * 100;
  const gadsPct = (gadsValue / total) * 100;
  return (
    <div className="platform-split">
      <span className="platform-meta" title={`Meta: ${formatter(metaValue)} (${metaPct.toFixed(0)}%)`}>
        M {fmtPct(metaPct)}
      </span>
      <span
        className="platform-gads"
        title={`Google: ${formatter(gadsValue)} (${gadsPct.toFixed(0)}%)`}
      >
        G {fmtPct(gadsPct)}
      </span>
    </div>
  );
}

export function MediaPagaCompletaView({
  byEmp,
  periodLabel,
}: {
  byEmp: MediaPagaByEmpRow[];
  periodLabel: string;
}) {
  const { sorted, sortConfig, requestSort } = useSortableData<MediaPagaByEmpRow>(byEmp, {
    key: "gasto_total_brl",
    direction: "desc",
  });

  const totals = byEmp.reduce(
    (acc, r) => {
      acc.gasto_meta += Number(r.gasto_meta_brl) || 0;
      acc.gasto_gads += Number(r.gasto_gads_brl) || 0;
      acc.impr_meta += Number(r.impr_meta) || 0;
      acc.impr_gads += Number(r.impr_gads) || 0;
      acc.cliques_meta += Number(r.cliques_meta) || 0;
      acc.cliques_gads += Number(r.cliques_gads) || 0;
      acc.conv_gads += Number(r.conv_gads) || 0;
      return acc;
    },
    {
      gasto_meta: 0,
      gasto_gads: 0,
      impr_meta: 0,
      impr_gads: 0,
      cliques_meta: 0,
      cliques_gads: 0,
      conv_gads: 0,
    }
  );

  const gastoTotal = totals.gasto_meta + totals.gasto_gads;
  const imprTotal = totals.impr_meta + totals.impr_gads;
  const cliquesTotal = totals.cliques_meta + totals.cliques_gads;
  const ctr = imprTotal ? (cliquesTotal / imprTotal) * 100 : null;
  const cpc = cliquesTotal ? gastoTotal / cliquesTotal : null;
  const cpm = imprTotal ? (gastoTotal / imprTotal) * 1000 : null;

  const showEmptyMsg = byEmp.length === 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header-row">
        <div>
          <h3 className="card-title">Mídia paga completa — Meta + Google Ads</h3>
          <p className="card-subtitle">
            {periodLabel} · KPIs somados das duas plataformas + breakdown por empreendimento
          </p>
        </div>
        <ExportButton
          rows={sorted}
          filename="midia-paga-completa"
          columns={[
            { key: "empreendimento", label: "Empreendimento" },
            { key: "gasto_total_brl", label: "Gasto total (R$)" },
            { key: "gasto_meta_brl", label: "Gasto Meta (R$)" },
            { key: "gasto_gads_brl", label: "Gasto Google (R$)" },
            { key: "impr_total", label: "Impressões total" },
            { key: "cliques_total", label: "Cliques total" },
            { key: "ctr_total_pct", label: "CTR (%)" },
            { key: "cpc_total_brl", label: "CPC (R$)" },
            { key: "conv_gads", label: "Conversões GAds" },
          ]}
        />
      </div>

      <div className="meta-kpi-strip">
        <div>
          <div className="meta-kpi-label">Gasto total mídia</div>
          <div className="meta-kpi-value">{fmtBRL(gastoTotal)}</div>
          <div className="meta-kpi-sub">
            Meta {fmtBRL(totals.gasto_meta)} · Google {fmtBRL(totals.gasto_gads)}
          </div>
        </div>
        <div>
          <div className="meta-kpi-label">Impressões</div>
          <div className="meta-kpi-value">{fmtNum(imprTotal)}</div>
          <div className="meta-kpi-sub">
            CPM médio {cpm == null ? "—" : fmtBRL(cpm)}
          </div>
        </div>
        <div>
          <div className="meta-kpi-label">Cliques</div>
          <div className="meta-kpi-value">{fmtNum(cliquesTotal)}</div>
          <div className="meta-kpi-sub">CTR {ctr == null ? "—" : fmtPct(ctr)}</div>
        </div>
        <div>
          <div className="meta-kpi-label">CPC médio</div>
          <div className="meta-kpi-value">{cpc == null ? "—" : fmtBRL(cpc)}</div>
          <div className="meta-kpi-sub">{fmtNum(totals.conv_gads)} conversões (GAds)</div>
        </div>
      </div>

      {showEmptyMsg && (
        <div className="diag" style={{ marginTop: 12 }}>
          <div className="diag-title">Sem dados Google Ads ainda</div>
          <ul className="diag-list">
            <li>
              Configurar Google Ads no <code>.env</code> / Secret Manager (developer token, OAuth,
              customer IDs) e rodar <code>npm run sync:gads</code>
            </li>
            <li>
              Enquanto Google Ads não sincronizou, o gasto total aqui mostra apenas dados do Meta.
            </li>
          </ul>
        </div>
      )}

      <h4 className="sub-title">Por empreendimento (Meta + Google somados)</h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader<MediaPagaByEmpRow>
                label="Empreendimento"
                sortKey="empreendimento"
                config={sortConfig}
                onSort={requestSort}
              />
              <SortableHeader<MediaPagaByEmpRow>
                label="Gasto total"
                sortKey="gasto_total_brl"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <th>Split gasto</th>
              <SortableHeader<MediaPagaByEmpRow>
                label="Impr. total"
                sortKey="impr_total"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<MediaPagaByEmpRow>
                label="Cliques total"
                sortKey="cliques_total"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<MediaPagaByEmpRow>
                label="CTR"
                sortKey="ctr_total_pct"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<MediaPagaByEmpRow>
                label="CPC"
                sortKey="cpc_total_brl"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<MediaPagaByEmpRow>
                label="Conv. GAds"
                sortKey="conv_gads"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.empreendimento}>
                <td className="emp">{r.empreendimento}</td>
                <td className="num">{moneyOr(r.gasto_total_brl)}</td>
                <td>
                  {platformPill(
                    Number(r.gasto_meta_brl) || 0,
                    Number(r.gasto_gads_brl) || 0,
                    Number(r.gasto_total_brl) || 0,
                    (n) => fmtBRL(n)
                  )}
                </td>
                <td className="num">{fmtNum(r.impr_total)}</td>
                <td className="num">{fmtNum(r.cliques_total)}</td>
                <td className="num">{pctOrDash(r.ctr_total_pct)}</td>
                <td className="num">{moneyOr(r.cpc_total_brl)}</td>
                <td className="num">{fmtNum(r.conv_gads)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                  Sem dados de mídia paga no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
