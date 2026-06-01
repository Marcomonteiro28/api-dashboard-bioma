import { useEffect, useState } from "react";
import { api } from "../api";
import type { Deal, DealsMeta } from "../types";

export interface DealsModalProps {
  title: string;
  subtitle: string;
  from: string;
  to: string;
  empreendimentos?: string[];
  allEmps: string[];
  status?: number[];
  subOrigens?: string[];
  allSubOrigens?: string[];
  estagio?: string;
  fonte?: string;
  onClose: () => void;
  onOpenLead?: (dealId: string) => void;
}

export function DealsModal(props: DealsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [meta, setMeta] = useState<DealsMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .deals({
        from: props.from,
        to: props.to,
        empreendimentos: props.empreendimentos,
        allEmps: props.allEmps,
        status: props.status,
        subOrigens: props.subOrigens,
        allSubOrigens: props.allSubOrigens,
        estagio: props.estagio,
        fonte: props.fonte,
        limit: 2000,
      })
      .then((r) => {
        if (cancelled) return;
        setDeals(r.data);
        setMeta(r.meta);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    props.from,
    props.to,
    props.empreendimentos,
    props.allEmps,
    props.status,
    props.subOrigens,
    props.allSubOrigens,
    props.estagio,
    props.fonte,
  ]);

  const statusBadge = (d: Deal) => {
    if (d.deal_status === 1) return <span className="badge badge-ganho">Ganho</span>;
    if (d.deal_status === 2) return <span className="badge badge-perdido">Perdido</span>;
    return <span className="badge badge-aberto">Aberto</span>;
  };
  const pipelineBadge = (p: string) =>
    p === "Vendas" ? (
      <span className="badge badge-vendas">Vendas</span>
    ) : (
      <span className="badge badge-pre">Pré-vendas</span>
    );
  const prioridadeBadge = (p: string | null) => {
    if (!p) return "—";
    const map: Record<string, string> = { Quente: "#c44536", Morno: "#d9822f", Frio: "#5b6e5b" };
    return (
      <span style={{ color: map[p] || "var(--text-soft)", fontWeight: 600 }}>{p}</span>
    );
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{props.title}</h3>
            <p className="modal-subtitle">{props.subtitle}</p>
          </div>
          <button className="modal-close" onClick={props.onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {loading && <div className="modal-loading">Carregando deals do BigQuery...</div>}
          {error && (
            <div className="modal-loading" style={{ color: "var(--danger)" }}>
              Erro: {error}
            </div>
          )}
          {!loading && !error && deals.length === 0 && (
            <div className="modal-loading">Nenhum deal encontrado nesse recorte.</div>
          )}
          {!loading && !error && deals.length > 0 && meta && (
            <>
              <div
                style={{
                  padding: "10px 16px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  background: "#f9fcf7",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {meta.count} deals · estágio: {meta.estagio}
              </div>
              {meta.count >= meta.limit && (
                <div
                  style={{
                    padding: "10px 16px",
                    background: "var(--warn-bg)",
                    borderBottom: "1px solid var(--warn-border)",
                    fontSize: 12,
                    color: "var(--warn-text)",
                  }}
                >
                  ⚠️ Resultado limitado a {meta.limit} deals. Refine o filtro pra ver outros.
                </div>
              )}
              <div style={{ padding: "0 16px 16px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      <th>Empreendimento</th>
                      <th>Fonte</th>
                      <th>Campanha</th>
                      <th>Metragem</th>
                      <th>Prioridade</th>
                      <th>Pipeline</th>
                      <th>Status atual</th>
                      <th>Deal status</th>
                      <th>SDR</th>
                      <th className="num">Valor</th>
                      <th className="num">Vlr esperado</th>
                      <th>Entrada</th>
                      <th>Qualif.</th>
                      <th>V. Agend.</th>
                      <th>V. Realiz.</th>
                      <th>Negoc.</th>
                      <th>Proposta</th>
                      <th>Fechamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => (
                      <tr
                        key={d.deal_id}
                        className={props.onOpenLead ? "deal-row-clickable" : undefined}
                        onClick={() => props.onOpenLead?.(d.deal_id)}
                        title={props.onOpenLead ? "Clique para ver lead + criativo" : undefined}
                      >
                        <td>{d.deal_id}</td>
                        <td>{d.contact_nome || "—"}</td>
                        <td>{d.contact_email || "—"}</td>
                        <td>{d.contact_phone || "—"}</td>
                        <td>
                          <strong>{d.empreendimento}</strong>
                        </td>
                        <td>
                          {d.fonte ? (
                            <span className={`fonte-tag fonte-${d.fonte}`}>{d.fonte}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={d.campanha_deal || ""}
                        >
                          {d.campanha_deal || "—"}
                        </td>
                        <td>{d.metragem_m2 || "—"}</td>
                        <td>{prioridadeBadge(d.prioridade)}</td>
                        <td>{pipelineBadge(d.pipeline_atual)}</td>
                        <td>{d.stage_titulo_atual || "—"}</td>
                        <td>{statusBadge(d)}</td>
                        <td>{d.sdr_responsavel || "—"}</td>
                        <td className="num">
                          {d.valor_deal ? "R$ " + Math.round(d.valor_deal).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="num">
                          {d.valor_esperado
                            ? "R$ " + Math.round(d.valor_esperado).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                        <td>{d.dt_entrada || d.deal_created_at || "—"}</td>
                        <td>{d.dt_qualificado || "—"}</td>
                        <td>{d.dt_visita_agendada || "—"}</td>
                        <td>{d.dt_visita_realizada || "—"}</td>
                        <td>{d.dt_negociacao || "—"}</td>
                        <td>{d.dt_proposta || "—"}</td>
                        <td>{d.dt_fechamento || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
