import { BigQuery } from "@google-cloud/bigquery";
import { config } from "../config.js";
import { fetchPaginated, adAccountPath, listAccounts } from "./client.js";
import { replaceTableLoad } from "../bq-load.js";
import {
  META_TABLES,
  CAMPAIGN_FIELDS,
  ADSET_FIELDS,
  AD_FIELDS,
  ADCREATIVE_FIELDS,
  ADIMAGE_FIELDS,
  INSIGHT_FIELDS,
} from "./schemas.js";

const bq = new BigQuery({ projectId: config.project });
const dataset = bq.dataset(config.meta.dataset);

const toFloat = (v) => (v == null || v === "" ? null : Number(v) / 1);
const toBudget = (v) => (v == null ? null : Number(v) / 100);
const toInt = (v) => (v == null || v === "" ? null : parseInt(v, 10));
const toIso = (v) => (v ? new Date(v).toISOString() : null);

async function syncForEachAccount(fn) {
  const accounts = listAccounts();
  const all = [];
  for (const acc of accounts) {
    const rows = await fn(acc);
    all.push(...rows);
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "meta.account_done",
      account_id: acc,
      rows: rows.length,
    }));
  }
  return all;
}

export async function syncCampaigns() {
  const now = new Date().toISOString();
  const rows = await syncForEachAccount(async (acc) => {
    const raw = await fetchPaginated(adAccountPath(acc, "/campaigns"), {
      fields: CAMPAIGN_FIELDS.join(","),
    });
    return raw.map((c) => ({
      id: c.id,
      account_id: acc,
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
  });
  return replaceTableLoad(dataset.table("meta_campaigns"), META_TABLES.meta_campaigns, rows);
}

export async function syncAdsets() {
  const now = new Date().toISOString();
  const rows = await syncForEachAccount(async (acc) => {
    const raw = await fetchPaginated(adAccountPath(acc, "/adsets"), {
      fields: ADSET_FIELDS.join(","),
    });
    return raw.map((a) => ({
      id: a.id,
      account_id: acc,
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
  });
  return replaceTableLoad(dataset.table("meta_adsets"), META_TABLES.meta_adsets, rows);
}

export async function syncAds() {
  const now = new Date().toISOString();
  const rows = await syncForEachAccount(async (acc) => {
    const raw = await fetchPaginated(adAccountPath(acc, "/ads"), {
      fields: AD_FIELDS.join(","),
    });
    return raw.map((a) => ({
      id: a.id,
      account_id: acc,
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
  });
  return replaceTableLoad(dataset.table("meta_ads"), META_TABLES.meta_ads, rows);
}

export async function syncCreatives() {
  const now = new Date().toISOString();
  const rows = await syncForEachAccount(async (acc) => {
    const raw = await fetchPaginated(adAccountPath(acc, "/adcreatives"), {
      fields: ADCREATIVE_FIELDS.join(","),
    });
    return raw.map((c) => {
      // image_hash pode estar na raiz OU em object_story_spec.link_data/photo_data/video_data
      const oss = c.object_story_spec || {};
      const nestedHash =
        oss?.link_data?.image_hash ||
        oss?.photo_data?.image_hash ||
        oss?.video_data?.image_hash ||
        oss?.link_data?.child_attachments?.[0]?.image_hash ||
        null;
      return {
        id: c.id,
        account_id: acc,
        name: c.name ?? null,
        title: c.title ?? null,
        body: c.body ?? null,
        image_hash: c.image_hash ?? nestedHash,
        image_url: c.image_url ?? null,
        thumbnail_url: c.thumbnail_url ?? null,
        video_id: c.video_id ?? oss?.video_data?.video_id ?? null,
        link_url: c.link_url ?? oss?.link_data?.link ?? null,
        call_to_action_type:
          c.call_to_action_type ?? oss?.link_data?.call_to_action?.type ?? null,
        object_type: c.object_type ?? null,
        synced_at: now,
      };
    });
  });
  return replaceTableLoad(dataset.table("meta_adcreatives"), META_TABLES.meta_adcreatives, rows);
}

export async function syncAdImages() {
  const now = new Date().toISOString();
  const rows = await syncForEachAccount(async (acc) => {
    const raw = await fetchPaginated(adAccountPath(acc, "/adimages"), {
      fields: ADIMAGE_FIELDS.join(","),
    });
    return raw.map((img) => ({
      hash: img.hash,
      account_id: acc,
      id: img.id ?? null,
      name: img.name ?? null,
      permalink_url: img.permalink_url ?? null,
      url: img.url ?? null,
      url_128: img.url_128 ?? null,
      width: toInt(img.width),
      height: toInt(img.height),
      created_time: toIso(img.created_time),
      synced_at: now,
    })).filter((r) => r.hash);
  });
  // Dedup por hash (mesma imagem pode estar em multiplas contas)
  const seen = new Map();
  for (const r of rows) if (!seen.has(r.hash)) seen.set(r.hash, r);
  return replaceTableLoad(dataset.table("meta_adimages"), META_TABLES.meta_adimages, [...seen.values()]);
}

export async function syncInsightsDaily() {
  const now = new Date().toISOString();
  const lookback = config.meta.insightsLookbackDays;
  const until = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - lookback);
  const since = sinceDate.toISOString().slice(0, 10);

  const rows = await syncForEachAccount(async (acc) => {
    const raw = await fetchPaginated(adAccountPath(acc, "/insights"), {
      level: "ad",
      fields: INSIGHT_FIELDS.join(","),
      time_increment: 1,
      time_range: JSON.stringify({ since, until }),
    });
    return raw.map((r) => {
      // Conta apenas o action_type "lead" — supertipo agregado do Meta que ja
      // inclui Lead Forms (onsite_conversion.lead_grouped) E LP via pixel
      // (offsite_conversion.fb_pixel_lead). Somar os tres infla 2x: validado em
      // 25-29/mai onde lead=66 == onsite(63) + offsite(3). Esse e o numero que
      // o Business Manager mostra como "Resultados" para campanhas de leads.
      const actions = Array.isArray(r.actions) ? r.actions : [];
      let conversions = 0;
      for (const a of actions) {
        if (a.action_type === "lead") {
          conversions += parseInt(a.value || 0, 10);
        }
      }
      const spend = toFloat(r.spend) || 0;
      const cost_per_conversion = conversions > 0 ? spend / conversions : null;
      return {
        date_start: r.date_start,
        ad_id: r.ad_id,
        adset_id: r.adset_id ?? null,
        campaign_id: r.campaign_id ?? null,
        account_id: r.account_id ?? acc.replace("act_", ""),
        impressions: toInt(r.impressions),
        reach: toInt(r.reach),
        clicks: toInt(r.clicks),
        spend: toFloat(r.spend),
        cpc: toFloat(r.cpc),
        cpm: toFloat(r.cpm),
        ctr: toFloat(r.ctr),
        frequency: toFloat(r.frequency),
        conversions: conversions || null,
        cost_per_conversion,
        synced_at: now,
      };
    });
  });

  return replaceTableLoad(dataset.table("meta_insights_daily"), META_TABLES.meta_insights_daily, rows);
}
