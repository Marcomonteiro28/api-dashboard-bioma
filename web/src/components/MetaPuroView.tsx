import { fmtNum, fmtBRL, fmtPct } from "../utils/format";
import type { MetaCampaignRow, MetaByEmpRow, TrackingCoverageRow } from "../types";
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
  const cls = s === "ACTIVE" ? "ad" : s === "PAUSED" ? "campaign" : "none";
  return <span className={`match-tag ${cls}`}>{s}</span>;
}

export function MetaPuroView({
  campaigns,
  byEmp,
  coverage,
  periodLabel,
}: {
  campaigns: MetaCampaignRow[];
  byEmp: MetaByEmpRow[];
  coverage: TrackingCoverageRow[];
  periodLabel: string;
}) {
  const totals = byEmp.reduce(
    (acc, r) => {
      acc.gasto += Number(r.gasto_brl) || 0;
      acc.impr += Number(r.impressoes) || 0;
      acc.cliques += Number(r.cliques) || 0;
      acc.reach += Number(r.reach) || 0;
      return acc;
    },
    { gasto: 0, impr: 0, cliques: 0, reach: 0 }
  );
  const ctr = totals.impr ? (totals.cliques / totals.impr) * 100 : null;
  const cpc = totals.cliques ? totals.gasto / totals.cliques : null;
  const cpm = totals.impr ? (totals.gasto / totals.impr) * 1000 : null;

  const empSorter = useSortableData<MetaByEmpRow>(byEmp, {
    key: "gasto_brl",
    direction: "desc",
  });
  const campSorter = useSortableData<MetaCampaignRow>(campaigns, {
    key: "gasto_brl",
    direction: "desc",
  });

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Meta Ads — visão direta da plataforma</h3>
        <p className="card-subtitle">
          {periodLabel} · dados crus do Meta sem JOIN com CRM · útil quando o tracking AC
          (criativo_deal, campanha_deal, UTMs) não está 100% preenchido
        </p>

        <div className="meta-kpi-strip">
          <div>
            <div className="meta-kpi-label">Gasto total Meta</div>
            <div className="meta-kpi-value">{fmtBRL(totals.gasto)}</div>
            <div className="meta-kpi-sub">{byEmp.length} empreendimento(s) com investimento</div>
          </div>
          <div>
            <div className="meta-kpi-label">Impressões</div>
            <div className="meta-kpi-value">{fmtNum(totals.impr)}</div>
            <div className="meta-kpi-sub">{fmtNum(totals.reach)} alcance único</div>
          </div>
          <div>
            <div className="meta-kpi-label">Cliques</div>
            <div className="meta-kpi-value">{fmtNum(totals.cliques)}</div>
            <div className="meta-kpi-sub">CTR {ctr == null ? "—" : fmtPct(ctr)}</div>
          </div>
          <div>
            <div className="meta-kpi-label">Custo médio</div>
            <div className="meta-kpi-value">{cpc == null ? "—" : fmtBRL(cpc)}</div>
            <div className="meta-kpi-sub">CPC · CPM {cpm == null ? "—" : fmtBRL(cpm)}</div>
          </div>
        </div>

        <h4 className="sub-title">Por empreendimento (Meta puro)</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableHeader<MetaByEmpRow>
                  label="Empreendimento"
                  sortKey="empreendimento"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                />
                <SortableHeader<MetaByEmpRow>
                  label="Campanhas"
                  sortKey="campanhas_ativas"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="Gasto"
                  sortKey="gasto_brl"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="Impr."
                  sortKey="impressoes"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="Cliques"
                  sortKey="cliques"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="Alcance"
                  sortKey="reach"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="CTR"
                  sortKey="ctr_pct"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="CPC"
                  sortKey="cpc_brl"
                  config={empSorter.sortConfig}
                  onSort={empSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaByEmpRow>
                  label="CPM"
                  sortKey="cpm_brl"
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
                  <td className="num">{fmtNum(e.reach)}</td>
                  <td className="num">{pctOrDash(e.ctr_pct)}</td>
                  <td className="num">{moneyOr(e.cpc_brl)}</td>
                  <td className="num">{moneyOr(e.cpm_brl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Campanhas Meta — detalhe individual</h3>
        <p className="card-subtitle">
          {campaigns.length} campanhas no período · ordenado por gasto · clique nos headers pra reordenar
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableHeader<MetaCampaignRow>
                  label="Campanha"
                  sortKey="campaign_name"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                />
                <SortableHeader<MetaCampaignRow>
                  label="Empreend."
                  sortKey="empreendimento"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                />
                <SortableHeader<MetaCampaignRow>
                  label="Objetivo"
                  sortKey="objetivo_parsed"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                />
                <SortableHeader<MetaCampaignRow>
                  label="Status"
                  sortKey="effective_status"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                />
                <SortableHeader<MetaCampaignRow>
                  label="Gasto"
                  sortKey="gasto_brl"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaCampaignRow>
                  label="Impr."
                  sortKey="impressoes"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaCampaignRow>
                  label="Cliques"
                  sortKey="cliques"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaCampaignRow>
                  label="CTR"
                  sortKey="ctr_pct"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaCampaignRow>
                  label="CPC"
                  sortKey="cpc_brl"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaCampaignRow>
                  label="Freq."
                  sortKey="frequencia"
                  config={campSorter.sortConfig}
                  onSort={campSorter.requestSort}
                  align="right"
                />
                <SortableHeader<MetaCampaignRow>
                  label="Dias"
                  sortKey="dias_ativos"
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
                  <td>{c.empreendimento || "—"}</td>
                  <td>{c.objetivo_parsed || "—"}</td>
                  <td>
                    <StatusBadge status={c.effective_status} />
                  </td>
                  <td className="num">{moneyOr(c.gasto_brl)}</td>
                  <td className="num">{fmtNum(c.impressoes)}</td>
                  <td className="num">{fmtNum(c.cliques)}</td>
                  <td className="num">{pctOrDash(c.ctr_pct)}</td>
                  <td className="num">{moneyOr(c.cpc_brl)}</td>
                  <td className="num">
                    {c.frequencia ? c.frequencia.toFixed(1) : <span className="num-zero">—</span>}
                  </td>
                  <td className="num">{fmtNum(c.dias_ativos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TrackingCoverageBlock data={coverage} />
    </>
  );
}

function TrackingCoverageBlock({ data }: { data: TrackingCoverageRow[] }) {
  const { sorted, sortConfig, requestSort } = useSortableData<TrackingCoverageRow>(data, {
    key: "leads_total",
    direction: "desc",
  });

  if (data.length === 0) return null;

  const tot = data.reduce(
    (a, r) => {
      a.total += Number(r.leads_total) || 0;
      a.criativo += Number(r.com_criativo) || 0;
      a.campanha += Number(r.com_campanha) || 0;
      a.sub_origem += Number(r.com_sub_origem) || 0;
      a.utm += Number(r.com_utm) || 0;
      return a;
    },
    { total: 0, criativo: 0, campanha: 0, sub_origem: 0, utm: 0 }
  );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Coverage do tracking AC</h3>
      <p className="card-subtitle">
        Quantos leads tem cada campo de atribuição preenchido. Lacunas aqui explicam por que a visão
        "Cross com CRM" subestima o impacto do Meta.
      </p>

      <div className="meta-kpi-strip">
        <div>
          <div className="meta-kpi-label">Leads no período</div>
          <div className="meta-kpi-value">{fmtNum(tot.total)}</div>
          <div className="meta-kpi-sub">total no AC</div>
        </div>
        <div>
          <div className="meta-kpi-label">Com criativo</div>
          <div className="meta-kpi-value">
            {tot.total ? fmtPct((tot.criativo / tot.total) * 100) : "—"}
          </div>
          <div className="meta-kpi-sub">
            {fmtNum(tot.criativo)} / {fmtNum(tot.total)}
          </div>
        </div>
        <div>
          <div className="meta-kpi-label">Com campanha</div>
          <div className="meta-kpi-value">
            {tot.total ? fmtPct((tot.campanha / tot.total) * 100) : "—"}
          </div>
          <div className="meta-kpi-sub">
            {fmtNum(tot.campanha)} / {fmtNum(tot.total)}
          </div>
        </div>
        <div>
          <div className="meta-kpi-label">Com sub-origem</div>
          <div className="meta-kpi-value">
            {tot.total ? fmtPct((tot.sub_origem / tot.total) * 100) : "—"}
          </div>
          <div className="meta-kpi-sub">
            {fmtNum(tot.sub_origem)} / {fmtNum(tot.total)}
          </div>
        </div>
        <div>
          <div className="meta-kpi-label">Com UTM</div>
          <div className="meta-kpi-value">
            {tot.total ? fmtPct((tot.utm / tot.total) * 100) : "—"}
          </div>
          <div className="meta-kpi-sub">
            {fmtNum(tot.utm)} / {fmtNum(tot.total)}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader<TrackingCoverageRow>
                label="Empreendimento"
                sortKey="empreendimento"
                config={sortConfig}
                onSort={requestSort}
              />
              <SortableHeader<TrackingCoverageRow>
                label="Leads"
                sortKey="leads_total"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<TrackingCoverageRow>
                label="Criativo"
                sortKey="com_criativo"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<TrackingCoverageRow>
                label="Campanha"
                sortKey="com_campanha"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<TrackingCoverageRow>
                label="Sub-origem"
                sortKey="com_sub_origem"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<TrackingCoverageRow>
                label="UTM"
                sortKey="com_utm"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <th className="num">% criativo</th>
              <th className="num">% campanha</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const pctC = r.leads_total ? (r.com_criativo / r.leads_total) * 100 : 0;
              const pctK = r.leads_total ? (r.com_campanha / r.leads_total) * 100 : 0;
              return (
                <tr key={r.empreendimento}>
                  <td className="emp">{r.empreendimento}</td>
                  <td className="num">{fmtNum(r.leads_total)}</td>
                  <td className="num">{fmtNum(r.com_criativo)}</td>
                  <td className="num">{fmtNum(r.com_campanha)}</td>
                  <td className="num">{fmtNum(r.com_sub_origem)}</td>
                  <td className="num">{fmtNum(r.com_utm)}</td>
                  <td className="num">
                    <span className={pctC < 50 ? "num-zero" : ""}>{fmtPct(pctC)}</span>
                  </td>
                  <td className="num">
                    <span className={pctK < 50 ? "num-zero" : ""}>{fmtPct(pctK)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
