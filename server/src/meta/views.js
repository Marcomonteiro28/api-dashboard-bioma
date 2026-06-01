import { BigQuery } from "@google-cloud/bigquery";
import { config } from "../config.js";

const bq = new BigQuery({ projectId: config.project });

function viewName(name) {
  return "`" + config.project + "." + config.meta.dataset + "." + name + "`";
}

function tableRef(name) {
  return "`" + config.project + "." + config.meta.dataset + "." + name + "`";
}

const EMPREENDIMENTO_CASE = `
  CASE
    WHEN REGEXP_CONTAINS(name, r'(?i)alto da lapa') THEN 'Alto da Lapa'
    WHEN REGEXP_CONTAINS(name, r'(?i)apinaj[ée]s|\\bcv\\b apinaj') THEN 'Apinajés'
    WHEN REGEXP_CONTAINS(name, r'(?i)simpatia') THEN 'Simpatia'
    WHEN REGEXP_CONTAINS(name, r'(?i)fradique') THEN 'Fradique'
    WHEN REGEXP_CONTAINS(name, r'(?i)\\bjml\\b') THEN 'JML'
    WHEN REGEXP_CONTAINS(name, r'(?i)\\bbioma\\b|\\bagrs\\b|institucional|lookalike|\\bcasa vertical\\b|\\bmor[áa]\\b') THEN '(Institucional)'
    ELSE NULL
  END
`;

const OBJETIVO_CASE = `
  CASE
    WHEN REGEXP_CONTAINS(name, r'(?i)\\bform\\b') THEN 'Form (Lead)'
    WHEN REGEXP_CONTAINS(name, r'(?i)thruplay|video') THEN 'Video / ThruPlays'
    WHEN REGEXP_CONTAINS(name, r'(?i)\\balc?cance\\b|\\breach\\b') THEN 'Alcance'
    WHEN REGEXP_CONTAINS(name, r'(?i)engaj|engage') THEN 'Engajamento'
    ELSE 'Outros'
  END
`;

const NORM_FN = (col) => `LOWER(REGEXP_REPLACE(NORMALIZE(${col}, NFD), r'\\p{Mn}', ''))`;

export const VIEWS = {
  vw_meta_campaign_attribution: `
    SELECT
      id AS campaign_id,
      name AS campaign_name,
      effective_status,
      objective,
      ${EMPREENDIMENTO_CASE} AS empreendimento,
      ${OBJETIVO_CASE} AS objetivo_parsed
    FROM ${tableRef("meta_campaigns")}
  `,

  vw_meta_spend_daily_emp: `
    SELECT
      i.date_start AS dt,
      a.empreendimento,
      a.objetivo_parsed,
      COUNT(DISTINCT i.campaign_id) AS campanhas_ativas,
      SUM(i.spend) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct
    FROM ${tableRef("meta_insights_daily")} i
    JOIN ${viewName("vw_meta_campaign_attribution")} a ON a.campaign_id = i.campaign_id
    WHERE a.empreendimento IS NOT NULL
    GROUP BY dt, a.empreendimento, a.objetivo_parsed
  `,

  vw_status_atual_live: `
    SELECT
      s.dealstages_title AS status,
      s.dealstages_order AS stage_rank,
      CASE WHEN p.title = 'Vendas' THEN 'vendas'
           WHEN p.title = 'Pre Vendas' THEN 'pre'
           ELSE LOWER(p.title) END AS funil,
      p.title AS pipeline,
      COUNT(*) AS qtd
    FROM ${tableRef("ac_deals")} d
    JOIN \`${config.project}.raw_data.activecampaign_pipelines_dealstages\` s
      ON s.dealstages_id = CAST(d.stage_id AS INT64)
    JOIN \`${config.project}.raw_data.activecampaign_pipelines\` p
      ON p.id = CAST(d.pipeline_id AS INT64)
    WHERE d.status = 0 AND COALESCE(d.is_disabled, FALSE) = FALSE
    GROUP BY status, stage_rank, funil, pipeline
  `,

  vw_meta_ads_norm: `
    SELECT
      id AS ad_id,
      adset_id,
      campaign_id,
      name AS ad_name,
      ${NORM_FN("name")} AS ad_name_norm,
      effective_status
    FROM ${tableRef("meta_ads")}
    WHERE name IS NOT NULL
  `,

  vw_ac_deals_enriched: `
    WITH cf_joined AS (
      SELECT
        cf.deal_id,
        m.field_label,
        cf.field_value
      FROM ${tableRef("ac_deal_cf_data")} cf
      JOIN ${tableRef("ac_deal_cf_meta")} m ON m.id = cf.custom_field_id
    ),
    cf_pivot AS (
      SELECT
        deal_id,
        MAX(IF(field_label = 'Empreendimento', field_value, NULL)) AS empreendimento,
        MAX(IF(field_label = 'Linha de Empreendimento', field_value, NULL)) AS linha_empreendimento,
        MAX(IF(field_label = 'Campanha do deal', field_value, NULL)) AS campanha_deal,
        MAX(IF(field_label = 'Criativo que gerou o deal', field_value, NULL)) AS criativo_deal,
        MAX(IF(field_label = 'Primeira origem do deal', field_value, NULL)) AS primeira_origem,
        MAX(IF(field_label = 'Primeiro criativo do deal', field_value, NULL)) AS primeiro_criativo,
        MAX(IF(field_label = 'Origem', field_value, NULL)) AS origem,
        MAX(IF(field_label = 'Sub Origem', field_value, NULL)) AS sub_origem,
        MAX(IF(field_label = 'Origem do deal', field_value, NULL)) AS origem_deal,
        MAX(IF(field_label = 'Tipo de trafego do deal', field_value, NULL)) AS tipo_trafego,
        MAX(IF(field_label = 'Pagina de conversao', field_value, NULL)) AS pagina_conversao,
        MAX(IF(field_label = 'Google Analytics Client ID do deal', field_value, NULL)) AS ga_client_id,
        MAX(IF(field_label = 'deal_first_utm_campaign', field_value, NULL)) AS deal_first_utm_campaign,
        MAX(IF(field_label = 'lt_utm_source', field_value, NULL)) AS lt_utm_source,
        MAX(IF(field_label = 'lt_utm_medium', field_value, NULL)) AS lt_utm_medium,
        MAX(IF(field_label = 'lt_utm_campaign', field_value, NULL)) AS lt_utm_campaign,
        MAX(IF(field_label = 'lt_utm_content', field_value, NULL)) AS lt_utm_content,
        MAX(IF(field_label = 'lt_utm_term', field_value, NULL)) AS lt_utm_term,
        MAX(IF(field_label = 'Origem Deal - Campanha', field_value, NULL)) AS origem_deal_campanha,
        MAX(IF(field_label = 'dt_entrada_entrada', SAFE_CAST(field_value AS TIMESTAMP), NULL)) AS dt_entrada_cf,
        MAX(IF(field_label = 'dt_entrada_qualificados', SAFE_CAST(field_value AS TIMESTAMP), NULL)) AS dt_qualificado,
        MAX(IF(field_label = 'dt_entrada_visita_agendada', SAFE_CAST(field_value AS TIMESTAMP), NULL)) AS dt_visita_agendada,
        MAX(IF(field_label = 'dt_entrada_visita_realizada', SAFE_CAST(field_value AS TIMESTAMP), NULL)) AS dt_visita_realizada,
        MAX(IF(field_label = 'dt_fechamento', SAFE_CAST(field_value AS TIMESTAMP), NULL)) AS dt_fechamento
      FROM cf_joined
      GROUP BY deal_id
    )
    SELECT
      d.id AS deal_id,
      d.title,
      d.value AS valor,
      d.status,
      d.contact_id,
      d.stage_id,
      d.pipeline_id,
      p.title AS pipeline_atual,
      d.created_timestamp AS dt_entrada,
      d.updated_timestamp AS dt_atualizacao,
      cf.empreendimento,
      cf.linha_empreendimento,
      cf.campanha_deal,
      cf.criativo_deal,
      cf.primeira_origem,
      cf.primeiro_criativo,
      cf.origem,
      cf.sub_origem,
      cf.origem_deal,
      cf.tipo_trafego,
      cf.pagina_conversao,
      cf.ga_client_id,
      cf.deal_first_utm_campaign,
      cf.lt_utm_source,
      cf.lt_utm_medium,
      cf.lt_utm_campaign,
      cf.lt_utm_content,
      cf.lt_utm_term,
      cf.origem_deal_campanha,
      cf.dt_qualificado,
      cf.dt_visita_agendada,
      cf.dt_visita_realizada,
      cf.dt_fechamento
    FROM ${tableRef("ac_deals")} d
    LEFT JOIN cf_pivot cf ON cf.deal_id = d.id
    LEFT JOIN \`${config.project}.raw_data.activecampaign_pipelines\` p
      ON p.id = CAST(d.pipeline_id AS INT64)
    -- Alinha com stg_crm_deals (Kondado):
    -- - Pre Vendas: todos os status
    -- - Vendas: apenas status 1 (ganho) e 2 (perdido) — exclui status 0 (negociacao)
    -- - Convite Evento e outros pipelines sao excluidos
    -- Deals que VIERAM de Convite Evento mas migraram pra Pre Vendas/Vendas
    -- sao mantidos (filtro por pipeline atual, nao historico).
    WHERE (p.title = 'Pre Vendas')
       OR (p.title = 'Vendas' AND d.status IN (1, 2))
  `,

  vw_lead_creative: `
    SELECT
      d.deal_id,
      d.empreendimento,
      d.status,
      d.campanha_deal,
      d.criativo_deal,
      ${NORM_FN("d.criativo_deal")} AS criativo_norm,
      ${NORM_FN("d.campanha_deal")} AS campanha_norm,
      d.dt_entrada,
      d.dt_qualificado,
      d.dt_visita_agendada,
      d.dt_visita_realizada,
      d.dt_fechamento,
      d.valor,
      a.ad_id AS matched_ad_id,
      a.campaign_id AS matched_campaign_id,
      c.name AS matched_campaign_name,
      CASE
        WHEN a.ad_id IS NOT NULL THEN 'AD_NAME'
        WHEN c.id IS NOT NULL THEN 'CAMPAIGN_NAME'
        ELSE 'NO_MATCH'
      END AS match_type
    FROM ${viewName("vw_ac_deals_enriched")} d
    LEFT JOIN ${viewName("vw_meta_ads_norm")} a
      ON a.ad_name_norm = ${NORM_FN("d.criativo_deal")}
    LEFT JOIN ${tableRef("meta_campaigns")} c
      ON ${NORM_FN("c.name")} = ${NORM_FN("d.campanha_deal")}
      AND a.ad_id IS NULL
    WHERE d.criativo_deal IS NOT NULL OR d.campanha_deal IS NOT NULL
  `,

  vw_creative_performance: `
    SELECT
      COALESCE(criativo_deal, '(sem criativo)') AS criativo,
      ANY_VALUE(matched_ad_id) AS ad_id,
      ANY_VALUE(matched_campaign_id) AS campaign_id,
      ANY_VALUE(match_type) AS match_type,
      empreendimento,
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT IF(dt_qualificado IS NOT NULL, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(dt_visita_agendada IS NOT NULL, deal_id, NULL)) AS agendamentos,
      COUNT(DISTINCT IF(dt_visita_realizada IS NOT NULL, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(status = 1, deal_id, NULL)) AS ganhos,
      COUNT(DISTINCT IF(status = 2, deal_id, NULL)) AS perdidos
    FROM ${viewName("vw_lead_creative")}
    GROUP BY criativo, empreendimento
  `,

  // Classificador de fonte por lead (proxy de atribuicao). Ordem das regras
  // (do mais confiavel pro menos):
  //  1. sub_origem explicito ('Meta ADS', 'Google ADS', 'Placa', 'Telefone', 'Passagem')
  //  2. campanha_deal bate com nome de campanha Meta ou Google ja sincronizado
  //  3. Padrao de naming: 'RZ -' = Meta, 'RZ |' = Google, ID 10-15 dig = Google,
  //     palavras 'search'/'pmax' = Google
  //  4. Tem campanha_deal mas nao bateu nada -> assume Meta (convencao predominante)
  //  5. Sem campanha + sem sub_origem externa -> proxy Google (Master Contact List + LP)
  vw_lead_source: `
    WITH gads_norm AS (
      SELECT ${NORM_FN("name")} AS gads_name FROM ${tableRef("gads_campaigns")}
      WHERE name IS NOT NULL
    ),
    meta_norm AS (
      SELECT ${NORM_FN("name")} AS meta_name FROM ${tableRef("meta_campaigns")}
      WHERE name IS NOT NULL
    )
    SELECT
      d.deal_id,
      d.empreendimento,
      d.status,
      d.dt_entrada,
      d.dt_qualificado,
      d.dt_visita_agendada,
      d.dt_visita_realizada,
      d.dt_fechamento,
      d.valor,
      d.campanha_deal,
      d.criativo_deal,
      d.sub_origem,
      d.origem,
      CASE
        WHEN d.sub_origem = 'Meta ADS' THEN 'meta'
        WHEN d.sub_origem = 'Google ADS' THEN 'google'
        WHEN d.sub_origem = 'Placa' THEN 'externo_placa'
        WHEN d.sub_origem = 'Telefone' THEN 'externo_telefone'
        WHEN d.sub_origem = 'Passagem' THEN 'externo_passagem'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT gads_name FROM gads_norm) THEN 'google'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT meta_name FROM meta_norm) THEN 'meta'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)^RZ\\s*\\|') THEN 'google'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)\\b(search|pmax)\\b') THEN 'google'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'^[0-9]{10,15}$') THEN 'google'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)^RZ\\s*-') THEN 'meta'
        WHEN d.campanha_deal IS NOT NULL AND d.campanha_deal != '' THEN 'meta'
        ELSE 'google_proxy'
      END AS fonte,
      CASE
        WHEN d.sub_origem IN ('Meta ADS','Google ADS','Placa','Telefone','Passagem') THEN 'alta'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT gads_name FROM gads_norm) THEN 'alta'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT meta_name FROM meta_norm) THEN 'alta'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)^RZ\\s*[-|]|\\b(search|pmax)\\b') THEN 'media'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'^[0-9]{10,15}$') THEN 'media'
        WHEN d.campanha_deal IS NOT NULL THEN 'media'
        ELSE 'baixa'
      END AS fonte_confianca
    FROM ${viewName("vw_ac_deals_enriched")} d
  `,
};

export async function applyViews() {
  for (const [name, body] of Object.entries(VIEWS)) {
    const sql = `CREATE OR REPLACE VIEW ${viewName(name)} AS ${body}`;
    await bq.query({ query: sql, location: config.location });
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "bq.view_applied",
      view: name,
    }));
  }
}
