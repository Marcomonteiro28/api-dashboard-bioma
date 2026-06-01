import { fmtNum, fmtPct } from "../utils/format";
import type { PerformanceEmp, Estagio } from "../types";
import { useSortableData } from "../hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";
import { ExportButton } from "./ExportButton";

interface EmpRow {
  empreendimento: string;
  leads: number;
  contatos_unicos: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  negociacoes: number;
  propostas: number;
  pct_qualif: number;
  pct_qualif_agend: number;
  pct_agend_visit: number;
  dups: number;
}

export function buildEmpRows(data: PerformanceEmp[]): EmpRow[] {
  return data
    .map((e) => {
      const leads = Number(e.leads) || 0;
      const qualif = Number(e.qualificados) || 0;
      const agend = Number(e.agendamentos) || 0;
      const visit = Number(e.visitas) || 0;
      return {
        empreendimento: e.empreendimento,
        leads,
        contatos_unicos: Number(e.contatos_unicos) || 0,
        qualificados: qualif,
        agendamentos: agend,
        visitas: visit,
        negociacoes: Number(e.negociacoes) || 0,
        propostas: Number(e.propostas) || 0,
        pct_qualif: leads ? (qualif / leads) * 100 : 0,
        pct_qualif_agend: qualif ? (agend / qualif) * 100 : 0,
        pct_agend_visit: agend ? (visit / agend) * 100 : 0,
        dups: leads - (Number(e.contatos_unicos) || 0),
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

export function EmpTable({
  rows,
  periodLabel,
  onOpenCell,
}: {
  rows: EmpRow[];
  periodLabel: string;
  onOpenCell: (emp: string, estagio: Estagio) => void;
}) {
  const { sorted, sortConfig, requestSort } = useSortableData<EmpRow>(rows, {
    key: "leads",
    direction: "desc",
  });

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header-row">
        <div>
          <h3 className="card-title">Performance por empreendimento</h3>
          <p className="card-subtitle">
            {periodLabel} · clique em qualquer número pra ver os deals · clique nos headers pra ordenar
          </p>
        </div>
        <ExportButton
          rows={sorted}
          filename="performance-por-empreendimento"
          columns={[
            { key: "empreendimento", label: "Empreendimento" },
            { key: "leads", label: "Leads" },
            { key: "contatos_unicos", label: "Contatos únicos" },
            { key: "qualificados", label: "Qualificados" },
            { key: "agendamentos", label: "Agendamentos" },
            { key: "visitas", label: "Visitas" },
            { key: "negociacoes", label: "Negociações" },
            { key: "propostas", label: "Propostas" },
            { key: "pct_qualif", label: "% L→Q", format: (v) => (v as number).toFixed(1) },
            { key: "pct_qualif_agend", label: "% Q→A", format: (v) => (v as number).toFixed(1) },
            { key: "pct_agend_visit", label: "% A→V", format: (v) => (v as number).toFixed(1) },
          ]}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader<EmpRow>
                label="Empreendimento"
                sortKey="empreendimento"
                config={sortConfig}
                onSort={requestSort}
              />
              <SortableHeader<EmpRow>
                label="Leads"
                sortKey="leads"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="Contatos"
                sortKey="contatos_unicos"
                config={sortConfig}
                onSort={requestSort}
                align="right"
                title="Contatos únicos: leads agrupados por contact_id"
              />
              <SortableHeader<EmpRow>
                label="Qualif."
                sortKey="qualificados"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="Agend."
                sortKey="agendamentos"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="Visitas"
                sortKey="visitas"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="Negoc."
                sortKey="negociacoes"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="Prop."
                sortKey="propostas"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="% L→Q"
                sortKey="pct_qualif"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="% Q→A"
                sortKey="pct_qualif_agend"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader<EmpRow>
                label="% A→V"
                sortKey="pct_agend_visit"
                config={sortConfig}
                onSort={requestSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}
                >
                  Sem dados no período selecionado.
                </td>
              </tr>
            )}
            {sorted.map((e) => (
              <tr key={e.empreendimento}>
                <td className="emp">{e.empreendimento}</td>
                <td
                  className="num clickable"
                  onClick={() => onOpenCell(e.empreendimento, "leads")}
                >
                  {fmtNum(e.leads)}
                </td>
                <td
                  className="num"
                  title={
                    e.dups > 0
                      ? `${e.dups} deals duplicados (mesmo contato)`
                      : "Sem duplicação"
                  }
                >
                  {fmtNum(e.contatos_unicos)}
                  {e.dups > 0 && (
                    <span style={{ fontSize: 10, color: "var(--danger)", marginLeft: 4 }}>
                      (−{e.dups})
                    </span>
                  )}
                </td>
                <td
                  className="num clickable"
                  onClick={() => onOpenCell(e.empreendimento, "qualificados")}
                >
                  {fmtNum(e.qualificados)}
                </td>
                <td
                  className="num clickable"
                  onClick={() => onOpenCell(e.empreendimento, "agendamentos")}
                >
                  {fmtNum(e.agendamentos)}
                </td>
                <td
                  className="num clickable highlight"
                  onClick={() => onOpenCell(e.empreendimento, "visitas")}
                >
                  {fmtNum(e.visitas)}
                </td>
                <td
                  className="num clickable"
                  onClick={() => onOpenCell(e.empreendimento, "negociacoes")}
                >
                  {fmtNum(e.negociacoes)}
                </td>
                <td
                  className="num clickable"
                  onClick={() => onOpenCell(e.empreendimento, "propostas")}
                >
                  {fmtNum(e.propostas)}
                </td>
                <td className="num">{fmtPct(e.pct_qualif)}</td>
                <td className="num">{fmtPct(e.pct_qualif_agend)}</td>
                <td className="num">{fmtPct(e.pct_agend_visit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
