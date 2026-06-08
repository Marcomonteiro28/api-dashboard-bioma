export const META_TABLES = {
  meta_campaigns: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "account_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "effective_status", type: "STRING" },
    { name: "objective", type: "STRING" },
    { name: "buying_type", type: "STRING" },
    { name: "daily_budget", type: "FLOAT64" },
    { name: "lifetime_budget", type: "FLOAT64" },
    { name: "start_time", type: "TIMESTAMP" },
    { name: "stop_time", type: "TIMESTAMP" },
    { name: "created_time", type: "TIMESTAMP" },
    { name: "updated_time", type: "TIMESTAMP" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  meta_adsets: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "account_id", type: "STRING" },
    { name: "campaign_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "effective_status", type: "STRING" },
    { name: "optimization_goal", type: "STRING" },
    { name: "billing_event", type: "STRING" },
    { name: "daily_budget", type: "FLOAT64" },
    { name: "lifetime_budget", type: "FLOAT64" },
    { name: "start_time", type: "TIMESTAMP" },
    { name: "end_time", type: "TIMESTAMP" },
    { name: "created_time", type: "TIMESTAMP" },
    { name: "updated_time", type: "TIMESTAMP" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  meta_ads: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "account_id", type: "STRING" },
    { name: "adset_id", type: "STRING" },
    { name: "campaign_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "effective_status", type: "STRING" },
    { name: "creative_id", type: "STRING" },
    { name: "created_time", type: "TIMESTAMP" },
    { name: "updated_time", type: "TIMESTAMP" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  meta_adcreatives: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "account_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "title", type: "STRING" },
    { name: "body", type: "STRING" },
    { name: "image_hash", type: "STRING" },
    { name: "image_url", type: "STRING" },
    { name: "thumbnail_url", type: "STRING" },
    { name: "video_id", type: "STRING" },
    { name: "link_url", type: "STRING" },
    { name: "call_to_action_type", type: "STRING" },
    { name: "object_type", type: "STRING" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  meta_adimages: [
    { name: "hash", type: "STRING", mode: "REQUIRED" },
    { name: "account_id", type: "STRING" },
    { name: "id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "permalink_url", type: "STRING" },
    { name: "url", type: "STRING" },
    { name: "url_128", type: "STRING" },
    { name: "width", type: "INT64" },
    { name: "height", type: "INT64" },
    { name: "created_time", type: "TIMESTAMP" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
  meta_insights_daily: [
    { name: "date_start", type: "DATE", mode: "REQUIRED" },
    { name: "ad_id", type: "STRING", mode: "REQUIRED" },
    { name: "adset_id", type: "STRING" },
    { name: "campaign_id", type: "STRING" },
    { name: "account_id", type: "STRING" },
    { name: "impressions", type: "INT64" },
    { name: "reach", type: "INT64" },
    { name: "clicks", type: "INT64" },
    { name: "spend", type: "FLOAT64" },
    { name: "cpc", type: "FLOAT64" },
    { name: "cpm", type: "FLOAT64" },
    { name: "ctr", type: "FLOAT64" },
    { name: "frequency", type: "FLOAT64" },
    // Conversoes calculadas pelo Meta (mesmo "Results" do Business Manager).
    // Soma: lead + onsite_conversion.lead_grouped (lead form) + cobre as principais
    // acoes de conversao que o BM mostra como "Result" em campanhas de Lead Ads.
    { name: "conversions", type: "INT64" },
    { name: "cost_per_conversion", type: "FLOAT64" },
    { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
  ],
};

export const CAMPAIGN_FIELDS = [
  "id", "name", "status", "effective_status", "objective", "buying_type",
  "daily_budget", "lifetime_budget", "start_time", "stop_time",
  "created_time", "updated_time",
];

export const ADSET_FIELDS = [
  "id", "campaign_id", "name", "status", "effective_status",
  "optimization_goal", "billing_event", "daily_budget", "lifetime_budget",
  "start_time", "end_time", "created_time", "updated_time",
];

export const AD_FIELDS = [
  "id", "adset_id", "campaign_id", "name", "status", "effective_status",
  "creative", "created_time", "updated_time",
];

export const ADIMAGE_FIELDS = [
  "hash", "id", "name", "permalink_url", "url", "url_128", "width", "height", "created_time",
];

export const ADCREATIVE_FIELDS = [
  "id", "name", "title", "body", "image_hash", "image_url", "thumbnail_url",
  "video_id", "link_url", "call_to_action_type", "object_type",
  "object_story_spec", "effective_object_story_id",
];

export const INSIGHT_FIELDS = [
  "date_start", "ad_id", "adset_id", "campaign_id", "account_id",
  "impressions", "reach", "clicks", "spend", "cpc", "cpm", "ctr", "frequency",
  "actions",
];
