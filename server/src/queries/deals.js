import { tbl, config } from "../config.js";
import { applySubOrigensFilter } from "./performance.js";

const VALID_FONTES = new Set([
  "meta",
  "google",
  "google_proxy",
  "externo_placa",
  "externo_telefone",
  "externo_passagem",
]);

export function isValidFonte(fonte) {
  return !fonte || VALID_FONTES.has(fonte);
}

const ESTAGIO_TO_FLAG = {
  leads: null,
  aguardando_retorno: "is_aguardando_retorno = 1",
  qualificados: "is_qualificado = 1",
  agendamentos: "is_agendamento = 1",
  transferidos: "is_transferido = 1",
  visitas_confirmadas: "is_visita_confirmada = 1",
  visitas: "is_visita = 1",
  negociacoes: "is_negociacao = 1",
  propostas: "is_proposta = 1",
  ganhos: "is_ganho = 1",
};

export function isValidEstagio(estagio) {
  return estagio === "" || Object.prototype.hasOwnProperty.call(ESTAGIO_TO_FLAG, estagio);
}

export function buildDealsQuery({ from, to, emps, statuses, estagio, limit, subOrigens, fonte }) {
  const conds = ["DATE(d.deal_created_at) BETWEEN @from AND @to"];
  const params = { from, to, limit };
  const types = { limit: "INT64" };

  if (emps) {
    conds.push("d.empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  if (statuses) {
    conds.push("CAST(d.deal_status AS INT64) IN UNNEST(@statuses)");
    params.statuses = statuses;
    types.statuses = ["INT64"];
  }
  // applySubOrigensFilter espera coluna `sub_origem` sem prefixo. Como o alias
  // d.sub_origem nao precisa de qualificacao no FROM principal, vamos passar o
  // condicional ja construido e ajustar.
  applySubOrigensFilter(conds, params, types, subOrigens);
  // Re-prefixa qualquer referencia generica a sub_origem com d.sub_origem
  for (let i = 0; i < conds.length; i++) {
    conds[i] = conds[i].replace(/\bsub_origem\b/g, "d.sub_origem");
  }
  const estagioCondition = ESTAGIO_TO_FLAG[estagio];
  if (estagioCondition) conds.push(`d.${estagioCondition}`);

  if (fonte) {
    conds.push("ls.fonte = @fonte");
    params.fonte = fonte;
    types.fonte = "STRING";
  }

  const sourceView =
    "`" + config.project + "." + config.meta.dataset + ".vw_lead_source`";

  const sql = `
    SELECT
      CAST(d.deal_id AS STRING) AS deal_id,
      CAST(d.contact_id AS STRING) AS contact_id,
      d.contact_email, d.contact_nome, d.contact_phone,
      d.empreendimento, d.linha_empreendimento,
      d.metragem_m2, d.prioridade,
      d.origem, d.sub_origem, d.gatilho_mql, d.sdr_responsavel,
      d.valor_deal, d.valor_esperado,
      d.stage_titulo_atual, d.pipeline_atual, d.deal_status,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.deal_created_at) AS deal_created_at,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_entrada) AS dt_entrada,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_qualificado) AS dt_qualificado,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_visita_agendada) AS dt_visita_agendada,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_visita_confirmada) AS dt_visita_confirmada,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_visita_realizada) AS dt_visita_realizada,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_negociacao) AS dt_negociacao,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_proposta) AS dt_proposta,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.dt_fechamento) AS dt_fechamento,
      d.is_aguardando_retorno, d.is_qualificado, d.is_agendamento, d.is_transferido,
      d.is_visita_confirmada, d.is_visita, d.is_negociacao, d.is_proposta, d.is_ganho,
      ls.fonte,
      ls.campanha_deal,
      ls.criativo_deal
    FROM ${tbl("stg_crm_deals")} d
    LEFT JOIN ${sourceView} ls ON CAST(ls.deal_id AS STRING) = CAST(d.deal_id AS STRING)
    WHERE ${conds.join(" AND ")}
    ORDER BY d.deal_created_at DESC, d.deal_id DESC
    LIMIT @limit
  `;

  return { sql, params, types };
}
