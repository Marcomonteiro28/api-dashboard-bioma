import { BigQuery } from "@google-cloud/bigquery";
import { config } from "../config.js";
import { fetchPaginated, adAccountPath } from "./client.js";
import {
  META_TABLES,
  CAMPAIGN_FIELDS,
  ADSET_FIELDS,
  AD_FIELDS,
  ADCREATIVE_FIELDS,
  INSIGHT_FIELDS,
} from "./schemas.js";

const bq = new BigQuery({ projectId: config.project });
const dataset = bq.dataset(config.meta.dataset);

const toFloat = (v) => (v == null || v === "" ? null : Number(v) / 1);
const toBudget = (v) => (v == null ? null : Number(v) / 100);
const toInt = (v) => (v == null || v === "" ? null : parseInt(v, 10));
const toIso = (v) => (v ? new Date(v).toISOString() : null);

async function ensureTable(tableName) {
  const schema = META_TABLES[tableName];
  if (!schema) throw new Error(`Schema desconhecido: ${tableName}`);
  const table = dataset.table(tableName);
  const [exists] = await table.exists();
  if (!exists) {
    await dataset.createTable(tableName, {
      schema,
      location: config.location,
    });
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "bq.table_created",
      table: tableName,
    }));
  }
}

async function replaceAll(tableName, rows) {
  await ensureTable(tableName);
  const table = dataset.table(tableName);
  await bq.query({
    query: `DELETE FROM \`${config.project}.${config.meta.dataset}.${tableName}\` WHERE TRUE`,
    location: config.location,
  });
  if (rows.length === 0) return 0;
  await table.insert(rows, { ignoreUnknownValues: false });
  return rows.length;
}

async function upsertInsights(rows) {
  const tableName = "meta_insights_daily";
  await ensureTable(tableName);
  if (rows.length === 0) return 0;

  const since = rows.reduce((min, r) => (r.date_start < min ? r.date_start : min), rows[0].date_start);
  const until = rows.reduce((max, r) => (r.date_start > max ? r.date_start : max), rows[0].date_start);
  await bq.query({
    query: `DELETE FROM \`${config.project}.${config.meta.dataset}.${tableName}\` WHERE date_start BETWEEN @since AND @until`,
    params: { since, until },
    location: config.location,
  });

  const table = dataset.table(tableName);
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await table.insert(rows.slice(i, i + CHUNK), { ignoreUnknownValues: false });
  }
  return rows.length;
}

export async function syncCampaigns() {
  const now = new Date().toISOString();
  const raw = await fetchPaginated(adAccountPath("/campaigns"), {
    fields: CAMPAIGN_FIELDS.join(","),
  });
  const rows = raw.map((c) => ({
    id: c.id,
    name: c.name ?? null,
    status: c.status ?? null,
    effective_status: c.effective_status ?? null,
    objective: c.objective ?? null,
    buying_type: c.buying_type ?? null,
    daily_budget: toBudget(c.daily_budget),
    lifetime_budget: toBudget(c.lifetime_budget),
    start_time: toIso(c.start_time),
    stop_time: toIso(c.stop_time),
    created_time: toIso(c.created_time),
    updated_time: toIso(c.updated_time),
    synced_at: now,
  }));
  return replaceAll("meta_campaigns", rows);
}

export async function syncAdsets() {
  const now = new Date().toISOString();
  const raw = await fetchPaginated(adAccountPath("/adsets"), {
    fields: ADSET_FIELDS.join(","),
  });
  const rows = raw.map((a) => ({
    id: a.id,
    campaign_id: a.campaign_id ?? null,
    name: a.name ?? null,
    status: a.status ?? null,
    effective_status: a.effective_status ?? null,
    optimization_goal: a.optimization_goal ?? null,
    billing_event: a.billing_event ?? null,
    daily_budget: toBudget(a.daily_budget),
    lifetime_budget: toBudget(a.lifetime_budget),
    start_time: toIso(a.start_time),
    end_time: toIso(a.end_time),
    created_time: toIso(a.created_time),
    updated_time: toIso(a.updated_time),
    synced_at: now,
  }));
  return replaceAll("meta_adsets", rows);
}

export async function syncAds() {
  const now = new Date().toISOString();
  const raw = await fetchPaginated(adAccountPath("/ads"), {
    fields: AD_FIELDS.join(","),
  });
  const rows = raw.map((a) => ({
    id: a.id,
    adset_id: a.adset_id ?? null,
    campaign_id: a.campaign_id ?? null,
    name: a.name ?? null,
    status: a.status ?? null,
    effective_status: a.effective_status ?? null,
    creative_id: a.creative?.id ?? null,
    created_time: toIso(a.created_time),
    updated_time: toIso(a.updated_time),
    synced_at: now,
  }));
  return replaceAll("meta_ads", rows);
}

export async function syncCreatives() {
  const now = new Date().toISOString();
  const raw = await fetchPaginated(adAccountPath("/adcreatives"), {
    fields: ADCREATIVE_FIELDS.join(","),
  });
  const rows = raw.map((c) => ({
    id: c.id,
    name: c.name ?? null,
    title: c.title ?? null,
    body: c.body ?? null,
    image_hash: c.image_hash ?? null,
    image_url: c.image_url ?? null,
    thumbnail_url: c.thumbnail_url ?? null,
    video_id: c.video_id ?? null,
    link_url: c.link_url ?? null,
    call_to_action_type: c.call_to_action_type ?? null,
    object_type: c.object_type ?? null,
    synced_at: now,
  }));
  return replaceAll("meta_adcreatives", rows);
}

export async function syncInsightsDaily() {
  const now = new Date().toISOString();
  const lookback = config.meta.insightsLookbackDays;
  const until = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - lookback);
  const since = sinceDate.toISOString().slice(0, 10);

  const raw = await fetchPaginated(adAccountPath("/insights"), {
    level: "ad",
    fields: INSIGHT_FIELDS.join(","),
    time_increment: 1,
    time_range: JSON.stringify({ since, until }),
  });

  const rows = raw.map((r) => ({
    date_start: r.date_start,
    ad_id: r.ad_id,
    adset_id: r.adset_id ?? null,
    campaign_id: r.campaign_id ?? null,
    account_id: r.account_id ?? null,
    impressions: toInt(r.impressions),
    reach: toInt(r.reach),
    clicks: toInt(r.clicks),
    spend: toFloat(r.spend),
    cpc: toFloat(r.cpc),
    cpm: toFloat(r.cpm),
    ctr: toFloat(r.ctr),
    frequency: toFloat(r.frequency),
    synced_at: now,
  }));

  return upsertInsights(rows);
}
