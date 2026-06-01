import { fmtNum, fmtPct } from "../utils/format";
import type { SourceBreakdownRow, SourceByEmpRow, LeadFonte } from "../types";
import { useSortableData } from "../hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";

const FONTE_LABEL: Record<LeadFonte, string> = {
  meta: "Meta",
  google: "Google",
  google_proxy: "Google (proxy)",
  externo_placa: "Externo · Placa",
  externo_telefone: "Externo · Telefone",
  externo_passagem: "Externo · Passagem",
};

const FONTE_COLOR: Record<LeadFonte, string> = {
  meta: "#3b5998",
  google: "#D3601E",
  google_proxy: "#FFBC7D",
  externo_placa: "#805D47",
  externo_telefone: "#A88160",
  externo_passagem: "#7A7A7A",
};

const fonteLabel = (f: string) => FONTE_LABEL[f as LeadFonte] || f;
const fonteColor = (f: string) => FONTE_COLOR[f as LeadFonte] || "#7A7A7A";

function ConfiancaPill({ alta, media, baixa }: { alta: number; media: number; baixa: number }) {
  const total = alta + media + baixa;
  if (total === 0) return <span className="num-zero">—</span>;
  return (
    <div className="confianca-pills">
      {alta > 0 && (
        <span
          className="confianca-pill confianca-alta"
          title={`${alta} com sinal explícito (sub_origem ou match exato)`}
        >
          A {alta}
        </span>
      )}
      {media > 0 && (
        <span
          className="confianca-pill confianca-media"
          title={`${media} via padrão de naming (RZ -, search, ID)`}
        >
          M {media}
        </span>
      )}
      {baixa > 0 && (
        <span
          className="confianca-pill confianca-baixa"
          title={`${baixa} via proxy (sem campanha + sem sub_origem)`}
        >
          B {baixa}
        </span>
      )}
    </div>
  );
}

export function SourceView({
  breakdown,
  byEmp,
  periodLabel,
  onOpenFonte,
  onOpenFonteEmp,
}: {
  breakdown: SourceBreakdownRow[];
  byEmp: SourceByEmpRow[];
  periodLabel: string;
  onOpenFonte: (fonte: LeadFonte) => void;
  onOpenFonteEmp: (fonte: LeadFonte, empreendimento: string) => void;
}) {
  const totalLeads = breakdown.reduce((s, r) => s + (Number(r.leads) || 0), 0);

  const { sorted, sortConfig, requestSort } = useSortableData<SourceBreakdownRow>(breakdown, {
    key: "leads",
    direction: "desc",
  });

  // Agrupa por empreendimento → mapa de fonte→count
  const empMap = new Map<string, Map<string, SourceByEmpRow>>();
  for (const row of byEmp) {
    if (!empMap.has(row.empreendimento)) empMap.set(row.empreendimento, new Map());
    empMap.get(row.empreendimento)!.set(row.fonte, row);
  }
  const empsOrdered = Array.from(empMap.keys()).sort();
  const fontesOrdered = sorted.map((r) => r.fonte);

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Origem dos leads — atribuição via proxy</h3>
        <p className="card-subtitle">
          {periodLabel} · {fmtNum(totalLeads)} leads classificados por cruzamento de{" "}
          <code>campanha_deal</code>, <code>sub_origem</code> + padrões de naming. Sem campanha nem
          sub_origem externa → assume Google por proxy (Master Contact List + LP).
        </p>

        <div className="source-summary">
          {sorted.map((r) => {
            const pct = totalLeads ? (r.leads / totalLeads) * 100 : 0;
            return (
              <div
                key={r.fonte}
                className="source-summary-item"
                style={{ borderLeftColor: fonteColor(r.fonte) }}
              >
                <div className="source-label">{fonteLabel(r.fonte)}</div>
                <div className="source-value">{fmtNum(r.leads)}</div>
                <div className="source-pct">{fmtPct(pct)}</div>
                <div className="source-bar-bg">
                  <div
                    className="source-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: fonteColor(r.fonte),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <h4 className="sub-title">Funil por fonte</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableHeader<SourceBreakdownRow>
                  label="Fonte"
                  sortKey="fonte"
                  config={sortConfig}
                  onSort={requestSort}
                />
                <SortableHeader<SourceBreakdownRow>
                  label="Leads"
                  sortKey="leads"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="Contatos únicos"
                  sortKey="contatos_unicos"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                  title="Contatos distintos por e-mail (dedup) — mesmo e-mail pode gerar múltiplos deals"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="Qualif"
                  sortKey="qualificados"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="Agend"
                  sortKey="agendamentos"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="Visitas"
                  sortKey="visitas"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="Ganhos"
                  sortKey="ganhos"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="% L→Q"
                  sortKey="pct_qualif"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader<SourceBreakdownRow>
                  label="% L→V"
                  sortKey="pct_visita"
                  config={sortConfig}
                  onSort={requestSort}
                  align="right"
                />
                <th title="Confiança da classificação: Alta = sinal explícito, Média = padrão de naming, Baixa = proxy">
                  Confiança
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.fonte}>
                  <td className="emp">
                    <span
                      className="fonte-dot"
                      style={{ background: fonteColor(r.fonte) }}
                    />
                    {fonteLabel(r.fonte)}
                  </td>
                  <td
                    className="num clickable highlight"
                    onClick={() => onOpenFonte(r.fonte)}
                    title="Clique pra ver os leads dessa fonte"
                  >
                    {fmtNum(r.leads)}
                  </td>
                  <td
                    className="num"
                    title={
                      r.leads !== r.contatos_unicos
                        ? `${r.leads - r.contatos_unicos} deals duplicados (mesmo contato com múltiplas conversões)`
                        : "Sem duplicação por contato"
                    }
                  >
                    {fmtNum(r.contatos_unicos)}
                    {r.leads !== r.contatos_unicos && (
                      <span style={{ fontSize: 10, color: "var(--danger)", marginLeft: 4 }}>
                        (−{r.leads - r.contatos_unicos})
                      </span>
                    )}
                  </td>
                  <td className="num">{fmtNum(r.qualificados)}</td>
                  <td className="num">{fmtNum(r.agendamentos)}</td>
                  <td className="num">{fmtNum(r.visitas)}</td>
                  <td className="num">{fmtNum(r.ganhos)}</td>
                  <td className="num">{fmtPct(r.pct_qualif)}</td>
                  <td className="num">{fmtPct(r.pct_visita)}</td>
                  <td>
                    <ConfiancaPill
                      alta={Number(r.confianca_alta) || 0}
                      media={Number(r.confianca_media) || 0}
                      baixa={Number(r.confianca_baixa) || 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {empsOrdered.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Origem × empreendimento</h3>
          <p className="card-subtitle">
            Onde cada fonte mais entrega leads. Útil pra ver mix de aquisição por marca.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empreendimento</th>
                  {fontesOrdered.map((f) => (
                    <th key={f} className="num" style={{ minWidth: 80 }}>
                      <span className="fonte-dot" style={{ background: fonteColor(f) }} />
                      {fonteLabel(f)}
                    </th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {empsOrdered.map((emp) => {
                  const empData = empMap.get(emp)!;
                  const total = Array.from(empData.values()).reduce(
                    (s, r) => s + (Number(r.leads) || 0),
                    0
                  );
                  return (
                    <tr key={emp}>
                      <td className="emp">{emp}</td>
                      {fontesOrdered.map((f) => {
                        const row = empData.get(f);
                        return row ? (
                          <td
                            key={f}
                            className="num clickable"
                            onClick={() => onOpenFonteEmp(f, emp)}
                            title={`${fonteLabel(f)} × ${emp} — clique pra ver leads`}
                          >
                            {fmtNum(row.leads)}
                          </td>
                        ) : (
                          <td key={f} className="num">
                            <span className="num-zero">—</span>
                          </td>
                        );
                      })}
                      <td className="num highlight">{fmtNum(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
