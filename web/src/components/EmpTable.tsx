import { fmtNum, fmtPct } from "../utils/format";
import type { PerformanceEmp, Estagio } from "../types";

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
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Performance por empreendimento</h3>
      <p className="card-subtitle">
        {periodLabel} · clique em qualquer número pra ver os deals · ordenado por volume de leads
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Empreendimento</th>
              <th className="num">Leads</th>
              <th className="num" title="Contatos únicos: leads agrupados por contact_id">
                Contatos
              </th>
              <th className="num">Qualif.</th>
              <th className="num">Agend.</th>
              <th className="num">Visitas</th>
              <th className="num">Negoc.</th>
              <th className="num">Prop.</th>
              <th className="num">% L→Q</th>
              <th className="num">% Q→A</th>
              <th className="num">% A→V</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}
                >
                  Sem dados no período selecionado.
                </td>
              </tr>
            )}
            {rows.map((e) => (
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
