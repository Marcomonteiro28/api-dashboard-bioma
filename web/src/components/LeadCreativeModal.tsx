import { useEffect, useState } from "react";
import { api } from "../api";
import type { LeadDetailResponse, MatchType } from "../types";

export interface LeadCreativeModalProps {
  dealId: string;
  onClose: () => void;
}

const STATUS_LABEL: Record<number, string> = { 0: "Aberto", 1: "Ganho", 2: "Perdido" };
const STATUS_CLASS: Record<number, string> = {
  0: "badge-aberto",
  1: "badge-ganho",
  2: "badge-perdido",
};

const matchTag = (m: MatchType | null) => {
  if (m === "AD_NAME") return <span className="match-tag ad">✓ ad correspondente</span>;
  if (m === "CAMPAIGN_NAME")
    return <span className="match-tag campaign">~ campanha correspondente</span>;
  return <span className="match-tag none">sem match Meta</span>;
};

export function LeadCreativeModal({ dealId, onClose }: LeadCreativeModalProps) {
  const [data, setData] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .leadDetail(dealId)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal lead-modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {data?.lead?.contact_nome || "Lead"}{" "}
              {data?.lead && (
                <span className={`badge ${STATUS_CLASS[data.lead.deal_status] || "badge-aberto"}`}>
                  {STATUS_LABEL[data.lead.deal_status] || "—"}
                </span>
              )}
            </h3>
            <p className="modal-subtitle">
              Deal #{dealId} · {data?.lead?.empreendimento || "—"}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body lead-modal-body">
          {loading && <div className="modal-loading">Carregando dados do lead...</div>}
          {error && (
            <div className="modal-loading" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
          {data && data.lead && (
            <div className="lead-split">
              <section className="lead-info">
                <h4 className="lead-section-title">Contato</h4>
                <dl className="lead-dl">
                  <dt>Nome</dt>
                  <dd>{data.lead.contact_nome || "—"}</dd>
                  <dt>Email</dt>
                  <dd>
                    {data.lead.contact_email ? (
                      <a href={`mailto:${data.lead.contact_email}`}>{data.lead.contact_email}</a>
                    ) : (
                      "—"
                    )}
                  </dd>
                  <dt>Telefone</dt>
                  <dd>{data.lead.contact_phone || "—"}</dd>
                  <dt>Prioridade</dt>
                  <dd>{data.lead.prioridade || "—"}</dd>
                  <dt>SDR</dt>
                  <dd>{data.lead.sdr_responsavel || "—"}</dd>
                </dl>

                <h4 className="lead-section-title">Empreendimento</h4>
                <dl className="lead-dl">
                  <dt>Nome</dt>
                  <dd>{data.lead.empreendimento}</dd>
                  <dt>Linha</dt>
                  <dd>{data.lead.linha_empreendimento || "—"}</dd>
                  <dt>Metragem</dt>
                  <dd>{data.lead.metragem_m2 || "—"}</dd>
                  <dt>Valor esperado</dt>
                  <dd>
                    {data.lead.valor_esperado
                      ? "R$ " + Math.round(data.lead.valor_esperado).toLocaleString("pt-BR")
                      : "—"}
                  </dd>
                </dl>

                <h4 className="lead-section-title">Pipeline atual</h4>
                <dl className="lead-dl">
                  <dt>Pipeline</dt>
                  <dd>{data.lead.pipeline_atual}</dd>
                  <dt>Estágio</dt>
                  <dd>{data.lead.stage_titulo_atual}</dd>
                </dl>

                <h4 className="lead-section-title">Timeline</h4>
                <ul className="lead-timeline">
                  {[
                    ["Entrada", data.lead.dt_entrada || data.lead.deal_created_at],
                    ["Qualificado", data.lead.dt_qualificado],
                    ["Visita agendada", data.lead.dt_visita_agendada],
                    ["Visita confirmada", data.lead.dt_visita_confirmada],
                    ["Visita realizada", data.lead.dt_visita_realizada],
                    ["Negociação", data.lead.dt_negociacao],
                    ["Proposta", data.lead.dt_proposta],
                    ["Fechamento", data.lead.dt_fechamento],
                  ]
                    .filter(([, d]) => !!d)
                    .map(([label, d]) => (
                      <li key={label} className="lead-timeline-row">
                        <span className="lead-timeline-dot" />
                        <span className="lead-timeline-label">{label}</span>
                        <span className="lead-timeline-date">{d}</span>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="lead-creative">
                <h4 className="lead-section-title">
                  Anúncio que trouxe o lead{" "}
                  {data.creative && matchTag(data.creative.match_type)}
                </h4>

                {!data.creative || data.creative.match_type === "NO_MATCH" ? (
                  <div className="creative-empty">
                    {data.creative?.criativo_deal ? (
                      <>
                        <p>
                          O CRM marcou esse lead com o criativo{" "}
                          <strong>"{data.creative.criativo_deal}"</strong>, mas não encontramos
                          esse nome em nenhum anúncio Meta atual.
                        </p>
                        <p className="creative-empty-hint">
                          Pode ser audience, lookalike ou criativo descontinuado.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>Esse lead não tem atribuição de criativo no CRM.</p>
                        <p className="creative-empty-hint">
                          Origem registrada: {data.lead.origem || "—"} /{" "}
                          {data.lead.sub_origem || "—"}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="creative-card">
                    {data.creative.creative_image_url ||
                    data.creative.creative_thumbnail_url ? (
                      <img
                        className="creative-image"
                        src={
                          data.creative.creative_image_url ||
                          data.creative.creative_thumbnail_url ||
                          ""
                        }
                        alt="Criativo"
                        loading="lazy"
                      />
                    ) : data.creative.creative_video_id ? (
                      <div className="creative-image creative-placeholder">🎬 Vídeo</div>
                    ) : (
                      <div className="creative-image creative-placeholder">Sem preview</div>
                    )}

                    {data.creative.creative_title && (
                      <div className="creative-title">{data.creative.creative_title}</div>
                    )}
                    {data.creative.creative_body && (
                      <div className="creative-body">{data.creative.creative_body}</div>
                    )}

                    <dl className="lead-dl creative-meta">
                      <dt>Anúncio</dt>
                      <dd>{data.creative.ad_name || "—"}</dd>
                      <dt>Campanha</dt>
                      <dd>
                        {data.creative.matched_campaign_name ||
                          data.creative.campanha_deal ||
                          "—"}
                      </dd>
                      <dt>Status anúncio</dt>
                      <dd>{data.creative.ad_status || "—"}</dd>
                      {data.creative.creative_cta && (
                        <>
                          <dt>CTA</dt>
                          <dd>{data.creative.creative_cta}</dd>
                        </>
                      )}
                      {data.creative.creative_link_url && (
                        <>
                          <dt>Link</dt>
                          <dd>
                            <a
                              href={data.creative.creative_link_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {data.creative.creative_link_url.slice(0, 50)}
                              {data.creative.creative_link_url.length > 50 && "…"}
                            </a>
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
