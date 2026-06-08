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
    WITH contact_tags_agg AS (
      SELECT
        ct.contact_id,
        STRING_AGG(DISTINCT t.name, '|' ORDER BY t.name) AS tags
      FROM ${tableRef("ac_contact_tags")} ct
      JOIN ${tableRef("ac_tags")} t ON t.id = ct.tag_id
      GROUP BY ct.contact_id
    ),
    contact_cf_pivot AS (
      -- Pivota custom fields de contato por perstag — recupera UTMs e first-touch
      -- atribuicao que estao no CONTATO (nao no deal). 200+ contatos com UTM real.
      SELECT
        d.contact_id,
        MAX(IF(m.perstag = 'UTM_SOURCE', d.field_value, NULL)) AS c_utm_source,
        MAX(IF(m.perstag = 'UTM_MEDIUM', d.field_value, NULL)) AS c_utm_medium,
        MAX(IF(m.perstag = 'UTM_CAMPAIGN', d.field_value, NULL)) AS c_utm_campaign,
        MAX(IF(m.perstag = 'UTM_CONTENT', d.field_value, NULL)) AS c_utm_content,
        MAX(IF(m.perstag = 'UTM_TERM', d.field_value, NULL)) AS c_utm_term,
        MAX(IF(m.perstag = 'FIRSTUTMMEDIUM', d.field_value, NULL)) AS c_first_utm_medium,
        MAX(IF(m.perstag = 'FIRST_UTM_CONTENT', d.field_value, NULL)) AS c_first_utm_content,
        MAX(IF(m.perstag = 'FIRSTUTMCAMPAIGN', d.field_value, NULL)) AS c_first_utm_campaign,
        MAX(IF(m.perstag = 'FIRST_UTM_SOURCE', d.field_value, NULL)) AS c_first_utm_source,
        MAX(IF(m.perstag = 'LANDING_PAGE', d.field_value, NULL)) AS c_landing_page,
        MAX(IF(m.perstag = 'FIRSTLANDINGPAGE', d.field_value, NULL)) AS c_first_landing_page,
        MAX(IF(m.perstag = 'GA_CLIENT_ID', d.field_value, NULL)) AS c_ga_client_id,
        MAX(IF(m.perstag = 'PRIMEIRO_EVENTO_CONVERSO', d.field_value, NULL)) AS c_primeiro_evento_conversao,
        MAX(IF(m.perstag = 'LTIMO_EVENTO_CONVERSO', d.field_value, NULL)) AS c_ultimo_evento_conversao,
        MAX(IF(m.perstag = 'QUANTIDADE_DE_CONVERSES', d.field_value, NULL)) AS c_quantidade_conversoes,
        MAX(IF(m.perstag = 'CONTACT_EMPREENDIMENTO', d.field_value, NULL)) AS c_empreendimento
      FROM ${tableRef("ac_contact_cf_data")} d
      JOIN ${tableRef("ac_contact_cf_meta")} m ON m.id = d.field_id
      GROUP BY d.contact_id
    ),
    master_list AS (
      -- Subscription na Master Contact List + form_id de qual LP veio
      SELECT
        cl.contact_id,
        MIN(cl.subscription_date) AS master_list_first_sub,
        MAX(cl.form_id) AS master_list_form_id
      FROM ${tableRef("ac_contact_lists")} cl
      JOIN ${tableRef("ac_lists")} l ON l.id = cl.list_id
      WHERE l.name = 'Master Contact List' AND cl.status = 1
      GROUP BY cl.contact_id
    ),
    cf_joined AS (
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
        -- Normaliza empreendimento: trata 'Sem Empreendimento' e '' como NULL,
        -- pega primeiro item se multi (campo separado por '||')
        NULLIF(NULLIF(
          SPLIT(MAX(IF(field_label = 'Empreendimento', field_value, NULL)), '||')[SAFE_OFFSET(0)],
          'Sem Empreendimento'
        ), '') AS empreendimento,
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
      cf.dt_fechamento,
      c.email AS contact_email,
      c.first_name AS contact_first_name,
      c.last_name AS contact_last_name,
      c.phone AS contact_phone,
      c.cdate AS contact_created_at,
      tags.tags AS contact_tags,
      ccf.c_utm_source AS contact_utm_source,
      ccf.c_utm_medium AS contact_utm_medium,
      ccf.c_utm_campaign AS contact_utm_campaign,
      ccf.c_utm_content AS contact_utm_content,
      ccf.c_utm_term AS contact_utm_term,
      ccf.c_first_utm_source AS contact_first_utm_source,
      ccf.c_first_utm_medium AS contact_first_utm_medium,
      ccf.c_first_utm_campaign AS contact_first_utm_campaign,
      ccf.c_first_utm_content AS contact_first_utm_content,
      ccf.c_landing_page AS contact_landing_page,
      ccf.c_first_landing_page AS contact_first_landing_page,
      ccf.c_ga_client_id AS contact_ga_client_id,
      ccf.c_primeiro_evento_conversao AS contact_primeiro_evento,
      ccf.c_ultimo_evento_conversao AS contact_ultimo_evento,
      ccf.c_quantidade_conversoes AS contact_qtd_conversoes,
      ccf.c_empreendimento AS contact_empreendimento_cf,
      ml.master_list_first_sub,
      ml.master_list_form_id
    FROM ${tableRef("ac_deals")} d
    LEFT JOIN cf_pivot cf ON cf.deal_id = d.id
    LEFT JOIN ${tableRef("ac_contacts")} c ON c.id = d.contact_id
    LEFT JOIN contact_tags_agg tags ON tags.contact_id = d.contact_id
    LEFT JOIN contact_cf_pivot ccf ON ccf.contact_id = d.contact_id
    LEFT JOIN master_list ml ON ml.contact_id = d.contact_id
    LEFT JOIN \`${config.project}.raw_data.activecampaign_pipelines\` p
      ON p.id = CAST(d.pipeline_id AS INT64)
    -- Alinha com stg_crm_deals (Kondado): incluem Pre Vendas + Vendas (todos
    -- status incluindo Aberto/Negociacao). Convite Evento e outros sao excluidos.
    -- Deals que VIERAM de Convite Evento mas migraram pra Pre Vendas/Vendas
    -- sao mantidos (filtro por pipeline atual, nao historico).
    WHERE p.title IN ('Pre Vendas', 'Vendas')
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

  // Classificador de fonte por lead. Ordem das regras (do mais confiavel
  // pro menos). Filosofia: NUNCA assumir Google sem evidencia — preferir
  // 'desconhecido' a chutar fonte errada.
  //  1. sub_origem explicito ('Meta ADS', 'Google ADS', 'Placa', 'Telefone', 'Passagem')
  //  2. Tag de contato 'facebook-lead-ads-integration*' -> Meta alta (FB lead form)
  //  3. UTM source/medium aponta pra Google ou Meta (ads server-side)
  //  4. campanha_deal bate com nome de campanha Meta ou Google ja sincronizado
  //  5. Padrao de naming: 'RZ -' = Meta, 'RZ |' = Google, ID 10-15 dig = Google,
  //     palavras 'search'/'pmax' = Google
  //  6. Tem campanha_deal mas nao bateu nada -> assume Meta (convencao predominante
  //     Bioma, 70%+ dos leads do periodo)
  //  7. Tag 'lead-lp-*' ou 'lead-site' -> Meta (site form)
  //  8. NENHUM sinal -> 'desconhecido' (NAO assume Google, evita falso positivo)
  vw_lead_source: `
    WITH gads_norm AS (
      SELECT ${NORM_FN("name")} AS gads_name FROM ${tableRef("gads_campaigns")}
      WHERE name IS NOT NULL
    ),
    meta_norm AS (
      SELECT ${NORM_FN("name")} AS meta_name FROM ${tableRef("meta_campaigns")}
      WHERE name IS NOT NULL
    ),
    stg_emp AS (
      -- Kondado's empreendimento + is_* flags (stage-based, mais correto que data-based)
      -- ATENCAO: stg_crm_deals tem deal_id duplicado (mesmo deal em multiplos
      -- empreendimentos), entao agregamos com ANY_VALUE/MAX pra evitar JOIN inflar.
      SELECT
        CAST(deal_id AS STRING) AS deal_id,
        ANY_VALUE(NULLIF(NULLIF(
          SPLIT(empreendimento, '||')[SAFE_OFFSET(0)],
          'Sem Empreendimento'
        ), '')) AS emp_stg,
        MAX(is_qualificado) AS stg_is_qualificado,
        MAX(is_agendamento) AS stg_is_agendamento,
        MAX(is_visita_confirmada) AS stg_is_visita_confirmada,
        MAX(is_visita) AS stg_is_visita,
        MAX(is_negociacao) AS stg_is_negociacao,
        MAX(is_proposta) AS stg_is_proposta,
        MAX(is_ganho) AS stg_is_ganho
      FROM \`${config.project}.${config.dataset}.stg_crm_deals\`
      GROUP BY deal_id
    )
    SELECT
      d.deal_id,
      d.contact_id,
      -- Empreendimento UNIFICADO em 4 niveis (do mais especifico pro mais generico):
      -- 1. Deal custom field (nossa extracao)
      -- 2. Contact custom field (Empreendimento setado no contato)
      -- 3. Tag FB lead ads (extracao via regex no nome do form)
      -- 4. stg_crm_deals (Kondado) como ultimo fallback — pega casos que nao bateram acima
      NULLIF(COALESCE(
        d.empreendimento,
        d.contact_empreendimento_cf,
        CASE
          WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)apinaj[ée]s') THEN 'Apinajés'
          WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)alto[_\\s]da[_\\s]lapa') THEN 'Alto da Lapa'
          WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)simpatia') THEN 'Simpatia'
          WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)fradique') THEN 'Fradique'
          WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)\\bjml\\b') THEN 'JML'
          ELSE NULL
        END,
        stg.emp_stg
      ), '') AS empreendimento,
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
      d.contact_tags,
      d.contact_utm_source,
      d.contact_utm_medium,
      d.contact_utm_campaign,
      d.contact_first_utm_medium,
      d.contact_first_utm_content,
      d.master_list_first_sub,
      d.master_list_form_id,
      -- is_* flags pelo Kondado (stage-based) — alinha com Funil tab
      stg.stg_is_qualificado AS is_qualificado,
      stg.stg_is_agendamento AS is_agendamento,
      stg.stg_is_visita_confirmada AS is_visita_confirmada,
      stg.stg_is_visita AS is_visita,
      stg.stg_is_negociacao AS is_negociacao,
      stg.stg_is_proposta AS is_proposta,
      stg.stg_is_ganho AS is_ganho,
      CASE
        -- 1. Sub-origem explicita (manualmente preenchida)
        WHEN d.sub_origem = 'Meta ADS' THEN 'meta'
        WHEN d.sub_origem = 'Google ADS' THEN 'google'
        WHEN d.sub_origem = 'Placa' THEN 'externo_placa'
        WHEN d.sub_origem = 'Telefone' THEN 'externo_telefone'
        WHEN d.sub_origem = 'Passagem' THEN 'externo_passagem'
        -- 2. Tag de FB lead ads integration (automacao quando lead converte em form FB)
        WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)facebook-lead-ads-integration') THEN 'meta'
        -- 3. UTM no CONTATO (sinal forte — first-touch ou last-touch)
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_utm_source,'')), r'(google|googleads|gads)') THEN 'google'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_utm_source,'')), r'(facebook|fb|instagram|ig|meta)') THEN 'meta'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_utm_medium,'')), r'(cpc|search|pmax|performance)') THEN 'google'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_utm_medium,'')), r'(paid_social|social_ads|fb-ads|paidsocial)') THEN 'meta'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_first_utm_medium,'')), r'(cpc|search|pmax|performance)') THEN 'google'
        -- 4. Match exato de campanha contact_utm_campaign com Meta/Google
        WHEN ${NORM_FN("d.contact_utm_campaign")} IN (SELECT gads_name FROM gads_norm) THEN 'google'
        WHEN ${NORM_FN("d.contact_utm_campaign")} IN (SELECT meta_name FROM meta_norm) THEN 'meta'
        -- 5. Match exato campanha_deal
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT gads_name FROM gads_norm) THEN 'google'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT meta_name FROM meta_norm) THEN 'meta'
        -- 6. Padrao de naming
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)^RZ\\s*\\|') THEN 'google'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)\\b(search|pmax)\\b') THEN 'google'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'^[0-9]{10,15}$') THEN 'google'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)^RZ\\s*-') THEN 'meta'
        -- 7. Tem campanha (assume Meta — convencao predominante)
        WHEN d.campanha_deal IS NOT NULL AND d.campanha_deal != '' THEN 'meta'
        -- 8. Tag de LP/site
        WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)lead-lp-|lead-site') THEN 'meta'
        -- 9. Sem nenhum sinal -> desconhecido (NAO chuta Google sem evidencia)
        ELSE 'desconhecido'
      END AS fonte,
      CASE
        -- Alta: sinal explicito (sub_origem, tag FB, UTM no contato, match exato)
        WHEN d.sub_origem IN ('Meta ADS','Google ADS','Placa','Telefone','Passagem') THEN 'alta'
        WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)facebook-lead-ads-integration') THEN 'alta'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_utm_source,'')), r'(google|googleads|gads|facebook|fb|instagram|ig|meta)') THEN 'alta'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_utm_medium,'')), r'(cpc|search|pmax|performance|paid_social|social_ads|fb-ads|paidsocial)') THEN 'alta'
        WHEN REGEXP_CONTAINS(LOWER(IFNULL(d.contact_first_utm_medium,'')), r'(cpc|search|pmax|performance)') THEN 'alta'
        WHEN ${NORM_FN("d.contact_utm_campaign")} IN (SELECT gads_name FROM gads_norm) THEN 'alta'
        WHEN ${NORM_FN("d.contact_utm_campaign")} IN (SELECT meta_name FROM meta_norm) THEN 'alta'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT gads_name FROM gads_norm) THEN 'alta'
        WHEN ${NORM_FN("d.campanha_deal")} IN (SELECT meta_name FROM meta_norm) THEN 'alta'
        -- Media: padrao naming ou campanha_deal sem match exato
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'(?i)^RZ\\s*[-|]|\\b(search|pmax)\\b') THEN 'media'
        WHEN REGEXP_CONTAINS(d.campanha_deal, r'^[0-9]{10,15}$') THEN 'media'
        WHEN d.campanha_deal IS NOT NULL THEN 'media'
        WHEN REGEXP_CONTAINS(d.contact_tags, r'(?i)lead-lp-|lead-site') THEN 'media'
        -- Baixa: sem evidencia
        ELSE 'baixa'
      END AS fonte_confianca
    FROM ${viewName("vw_ac_deals_enriched")} d
    LEFT JOIN stg_emp stg ON stg.deal_id = CAST(d.deal_id AS STRING)
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
