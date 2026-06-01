import { fmtNum, fmtBRL, fmtPct } from "../utils/format";
import type { GadsCampaignRow, GadsByEmpRow } from "../types";
import { useSortableData } from "../hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";

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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="num-zero">—</span>;
  const s = status.toUpperCase();
  const cls = s === "ENABLED" ? "ad" : s === "PAUSED" ? "campaign" : "none";
  return <span className={`match-tag ${cls}`}>{s}</span>;
}

function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return <span className="num-zero">—</span>;
  return <span className="match-tag campaign">{channel}</span>;
}

export function GoogleAdsView({
  campaigns,
  byEmp,
  periodLabel,
}: {
  campaigns: GadsCampaignRow[];
  byEmp: GadsByEmpRow[];
  periodLabel: string;
}) {
  const empSorter = useSortableData<GadsByEmpRow>(byEmp, {
    key: "gasto_brl",
    direction: "desc",
  });
  const campSorter = useSortableData<GadsCampaignRow>(campaigns, {
    key: "gasto_brl",
    direction: "desc",
  });

  const totals = byEmp.reduce(
    (acc, r) => {
      acc.gasto += Number(r.gasto_brl) || 0;
      acc.impr += Number(r.impressoes) || 0;
      acc.cliques += Number(r.cliques) || 0;
      acc.conv += Number(r.conversoes) || 0;
      acc.conv_val += Number(r.conversion_value_brl) || 0;
      return acc;
    },
    { gasto: 0, impr: 0, cliques: 0, conv: 0, conv_val: 0 }
  );

  const ctr = totals.impr ? (totals.cliques / totals.impr) * 100 : null;
  const cpc = totals.cliques ? totals.gasto / totals.cliques : null;
  const cpa = totals.conv ? totals.gasto / totals.conv : null;

  const empty = campaigns.length === 0 && byEmp.length === 0;

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Google Ads — visão direta da plataforma</h3>
        <p className="card-subtitle">
          {periodLabel} · dados crus do Google Ads (campanhas search/display/youtube/pmax)
        </p>

        <div className="meta-kpi-strip">
          <div>
            <div className="meta-kpi-label">Gasto Google Ads</div>
            <div className="meta-kpi-value">{fmtBRL(totals.gasto)}</div>
            <div className="meta-kpi-sub">{byEmp.length} empreendimento(s) com investimento</div>
          </div>
          <div>
            <div className="meta-kpi-label">Impressões</div>
            <div className="meta-kpi-value">{fmtNum(totals.impr)}</div>
            <div className="meta-kpi-sub">CTR {ctr == null ? "—" : fmtPct(ctr)}</div>
          </div>
          <div>
            <div className="meta-kpi-label">Cliques</div>
            <div className="meta-kpi-value">{fmtNum(totals.cliques)}</div>
            <div className="meta-kpi-sub">CPC {cpc == null ? "—" : fmtBRL(cpc)}</div>
          </div>
          <div>
            <div className="meta-kpi-label">Conversões (GAds)</div>
            <div className="meta-kpi-value">{fmtNum(totals.conv)}</div>
            <div className="meta-kpi-sub">
              CPA {cpa == null ? "—" : fmtBRL(cpa)} · valor {fmtBRL(totals.conv_val)}
            </div>
          </div>
        </div>

        {empty && (
          <div className="diag" style={{ marginTop: 12 }}>
            <div className="diag-title">Google Ads ainda não configurado</div>
            <ul className="diag-list">
              <li>
                Pegar developer token, OAuth client (id/secret), refresh token, e customer IDs
              </li>
              <li>
                Configurar no <code>.env</code> local ou no Secret Manager (produção)
              </li>
              <li>
                Rodar <code>npm run sync:gads</code> pra puxar dados pro BigQuery
              </li>
              <li>
                Convenção de nome das campanhas precisa ser confirmada pra atribuir empreendimento
                (parser hoje retorna NULL exceto pra nomes do Meta)
              </li>
            </ul>
          </div>
        )}

        {byEmp.length > 0 && (
          <>
            <h4 className="sub-title">Por empreendimento (Google Ads)</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortableHeader<GadsByEmpRow>
                      label="Empreendimento"
                      sortKey="empreendimento"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="Campanhas"
                      sortKey="campanhas_ativas"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="Gasto"
                      sortKey="gasto_brl"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="Impr."
                      sortKey="impressoes"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="Cliques"
                      sortKey="cliques"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="Conv."
                      sortKey="conversoes"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="CTR"
                      sortKey="ctr_pct"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="CPC"
                      sortKey="cpc_brl"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                    <SortableHeader<GadsByEmpRow>
                      label="CPA"
                      sortKey="cpa_brl"
                      config={empSorter.sortConfig}
                      onSort={empSorter.requestSort}
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody>
                  {empSorter.sorted.map((e) => (
                    <tr key={e.empreendimento || "(sem)"}>
                      <td className="emp">{e.empreendimento || "(sem)"}</td>
                      <td className="num">{fmtNum(e.campanhas_ativas)}</td>
                      <td className="num">{moneyOr(e.gasto_brl)}</td>
                      <td className="num">{fmtNum(e.impressoes)}</td>
                      <td className="num">{fmtNum(e.cliques)}</td>
                      <td className="num">{fmtNum(e.conversoes)}</td>
                      <td className="num">{pctOrDash(e.ctr_pct)}</td>
                      <td className="num">{moneyOr(e.cpc_brl)}</td>
                      <td className="num">{moneyOr(e.cpa_brl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {campaigns.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Campanhas Google Ads — detalhe individual</h3>
          <p className="card-subtitle">
            {campaigns.length} campanhas no período · clique nos headers pra ordenar
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader<GadsCampaignRow>
                    label="Campanha"
                    sortKey="campaign_name"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="Canal"
                    sortKey="channel"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="Empreend."
                    sortKey="empreendimento"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="Status"
                    sortKey="status"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="Gasto"
                    sortKey="gasto_brl"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                    align="right"
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="Cliques"
                    sortKey="cliques"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                    align="right"
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="Conv."
                    sortKey="conversoes"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                    align="right"
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="CTR"
                    sortKey="ctr_pct"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                    align="right"
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="CPC"
                    sortKey="cpc_brl"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                    align="right"
                  />
                  <SortableHeader<GadsCampaignRow>
                    label="CPA"
                    sortKey="cpa_brl"
                    config={campSorter.sortConfig}
                    onSort={campSorter.requestSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {campSorter.sorted.map((c) => (
                  <tr key={c.campaign_id}>
                    <td className="creative-name">
                      <strong>{c.campaign_name}</strong>
                    </td>
                    <td>
                      <ChannelBadge channel={c.channel} />
                    </td>
                    <td>{c.empreendimento || "—"}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="num">{moneyOr(c.gasto_brl)}</td>
                    <td className="num">{fmtNum(c.cliques)}</td>
                    <td className="num">{fmtNum(c.conversoes)}</td>
                    <td className="num">{pctOrDash(c.ctr_pct)}</td>
                    <td className="num">{moneyOr(c.cpc_brl)}</td>
                    <td className="num">{moneyOr(c.cpa_brl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
