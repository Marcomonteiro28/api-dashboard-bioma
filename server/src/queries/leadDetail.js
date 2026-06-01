import { config } from "../config.js";

const proj = config.project;
const crmDs = config.dataset;
const metaDs = config.meta.dataset;

export function buildLeadQuery({ dealId }) {
  const sql = `
    SELECT
      CAST(deal_id AS STRING) AS deal_id,
      CAST(contact_id AS STRING) AS contact_id,
      contact_email, contact_nome, contact_phone,
      empreendimento, linha_empreendimento, metragem_m2, prioridade,
      origem, sub_origem, gatilho_mql, sdr_responsavel,
      valor_deal, valor_esperado,
      stage_titulo_atual, pipeline_atual, deal_status,
      FORMAT_TIMESTAMP("%Y-%m-%d", deal_created_at) AS deal_created_at,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_entrada) AS dt_entrada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_qualificado) AS dt_qualificado,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_agendada) AS dt_visita_agendada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_confirmada) AS dt_visita_confirmada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_realizada) AS dt_visita_realizada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_negociacao) AS dt_negociacao,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_proposta) AS dt_proposta,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_fechamento) AS dt_fechamento
    FROM \`${proj}.${crmDs}.stg_crm_deals\`
    WHERE CAST(deal_id AS STRING) = @deal_id
    LIMIT 1
  `;
  return { sql, params: { deal_id: dealId }, types: { deal_id: "STRING" } };
}

/**
 * Lista os outros deals do MESMO contato (cross-base por e-mail/contact_id).
 * Util pra ver historico de conversoes do mesmo lead.
 */
export function buildOtherDealsQuery({ dealId }) {
  const sql = `
    WITH this_deal AS (
      SELECT CAST(contact_id AS STRING) AS contact_id
      FROM \`${proj}.${crmDs}.stg_crm_deals\`
      WHERE CAST(deal_id AS STRING) = @deal_id
      LIMIT 1
    )
    SELECT
      CAST(d.deal_id AS STRING) AS deal_id,
      d.empreendimento,
      d.pipeline_atual,
      d.stage_titulo_atual,
      d.deal_status,
      FORMAT_TIMESTAMP("%Y-%m-%d", d.deal_created_at) AS deal_created_at,
      d.valor_deal,
      d.is_qualificado,
      d.is_visita,
      d.is_ganho,
      ls.fonte
    FROM \`${proj}.${crmDs}.stg_crm_deals\` d
    JOIN this_deal td ON CAST(d.contact_id AS STRING) = td.contact_id
    LEFT JOIN \`${proj}.${metaDs}.vw_lead_source\` ls
      ON CAST(ls.deal_id AS STRING) = CAST(d.deal_id AS STRING)
    WHERE CAST(d.deal_id AS STRING) != @deal_id
    ORDER BY d.deal_created_at DESC
    LIMIT 20
  `;
  return { sql, params: { deal_id: dealId }, types: { deal_id: "STRING" } };
}

export function buildCreativeMatchQuery({ dealId }) {
  const sql = `
    SELECT
      lc.criativo_deal,
      lc.campanha_deal,
      lc.match_type,
      lc.matched_ad_id,
      lc.matched_campaign_id,
      lc.matched_campaign_name,
      ad.name AS ad_name,
      ad.effective_status AS ad_status,
      cr.name AS creative_name,
      cr.title AS creative_title,
      cr.body AS creative_body,
      cr.image_url AS creative_image_url,
      cr.thumbnail_url AS creative_thumbnail_url,
      cr.image_hash AS creative_image_hash,
      COALESCE(img.permalink_url, img.url) AS creative_image_url_hd,
      img.width AS creative_image_width,
      img.height AS creative_image_height,
      cr.link_url AS creative_link_url,
      cr.video_id AS creative_video_id,
      cr.call_to_action_type AS creative_cta
    FROM \`${proj}.${metaDs}.vw_lead_creative\` lc
    LEFT JOIN \`${proj}.${metaDs}.meta_ads\` ad ON ad.id = lc.matched_ad_id
    LEFT JOIN \`${proj}.${metaDs}.meta_adcreatives\` cr ON cr.id = ad.creative_id
    LEFT JOIN \`${proj}.${metaDs}.meta_adimages\` img ON img.hash = cr.image_hash
    WHERE lc.deal_id = @deal_id
    LIMIT 1
  `;
  return { sql, params: { deal_id: dealId }, types: { deal_id: "STRING" } };
}
