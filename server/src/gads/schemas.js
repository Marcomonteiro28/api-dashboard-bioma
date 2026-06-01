export const GADS_TABLES = {
  gads_customers: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "descriptive_name", type: "STRING" },
    { name: "currency_code", type: "STRING" },
    { name: "time_zone", type: "STRING" },
    { name: "manager", type: "BOOL" },
    { name: "test_account", type: "BOOL" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  gads_campaigns: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "customer_id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "serving_status", type: "STRING" },
    { name: "advertising_channel_type", type: "STRING" },
    { name: "advertising_channel_sub_type", type: "STRING" },
    { name: "bidding_strategy_type", type: "STRING" },
    { name: "start_date", type: "DATE" },
    { name: "end_date", type: "DATE" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  gads_ad_groups: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "customer_id", type: "STRING", mode: "REQUIRED" },
    { name: "campaign_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "type", type: "STRING" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  gads_ads: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "customer_id", type: "STRING", mode: "REQUIRED" },
    { name: "ad_group_id", type: "STRING" },
    { name: "campaign_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "type", type: "STRING" },
    { name: "final_url", type: "STRING" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  gads_insights_daily: [
    { name: "date", type: "DATE", mode: "REQUIRED" },
    { name: "customer_id", type: "STRING", mode: "REQUIRED" },
    { name: "campaign_id", type: "STRING", mode: "REQUIRED" },
    { name: "ad_group_id", type: "STRING" },
    { name: "ad_id", type: "STRING" },
    { name: "impressions", type: "INT64" },
    { name: "clicks", type: "INT64" },
    { name: "cost_brl", type: "FLOAT64" },
    { name: "conversions", type: "FLOAT64" },
    { name: "conversion_value_brl", type: "FLOAT64" },
    { name: "ctr", type: "FLOAT64" },
    { name: "avg_cpc_brl", type: "FLOAT64" },
    { name: "avg_cpm_brl", type: "FLOAT64" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
};

// GAQL queries — cada uma com fields mínimos pro nosso schema
export const GAQL_CUSTOMER = `
  SELECT
    customer.id,
    customer.descriptive_name,
    customer.currency_code,
    customer.time_zone,
    customer.manager,
    customer.test_account
  FROM customer
`;

export const GAQL_CAMPAIGNS = `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    campaign.serving_status,
    campaign.advertising_channel_type,
    campaign.advertising_channel_sub_type,
    campaign.bidding_strategy_type,
    campaign.start_date,
    campaign.end_date
  FROM campaign
`;

export const GAQL_AD_GROUPS = `
  SELECT
    ad_group.id,
    ad_group.name,
    ad_group.status,
    ad_group.type,
    ad_group.campaign
  FROM ad_group
`;

export const GAQL_ADS = `
  SELECT
    ad_group_ad.ad.id,
    ad_group_ad.ad.name,
    ad_group_ad.ad.type,
    ad_group_ad.ad.final_urls,
    ad_group_ad.status,
    ad_group_ad.ad_group,
    campaign.id
  FROM ad_group_ad
`;

// Insights diários no nível de ad (granularidade máxima útil).
// segments.date força agregação por dia. cost_micros precisa ser dividido por 1M.
export function gaqlInsightsDaily(since, until) {
  return `
    SELECT
      segments.date,
      campaign.id,
      ad_group.id,
      ad_group_ad.ad.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${since}' AND '${until}'
  `;
}
