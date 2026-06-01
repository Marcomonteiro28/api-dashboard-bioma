import { BigQuery } from "@google-cloud/bigquery";
import { config } from "../config.js";
import { gaqlSearch, listCustomers } from "./client.js";
import { replaceTableLoad } from "../bq-load.js";
import {
  GADS_TABLES,
  GAQL_CUSTOMER,
  GAQL_CAMPAIGNS,
  GAQL_AD_GROUPS,
  GAQL_ADS,
  gaqlInsightsDaily,
} from "./schemas.js";

const bq = new BigQuery({ projectId: config.project });
const dataset = bq.dataset(config.gads.dataset);

const micros = (v) => (v == null ? null : Number(v) / 1_000_000);
const toFloat = (v) => (v == null || v === "" ? null : Number(v));
const toInt = (v) => (v == null || v === "" ? null : parseInt(v, 10));
const toStr = (v) => (v == null ? null : String(v));
// IDs do Google Ads vem como string em alguns campos (resource names) e como
// number em outros. Padronizamos pra string sempre.
const idStr = (v) => (v == null ? null : String(v));

async function syncForEachCustomer(fn) {
  const customers = listCustomers();
  const all = [];
  for (const cid of customers) {
    try {
      const rows = await fn(cid);
      all.push(...rows);
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "gads.customer_done",
        customer_id: cid,
        rows: rows.length,
      }));
    } catch (err) {
      // Loga e segue pros próximos customers — uma conta sem permissão não
      // deve matar o sync inteiro
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "gads.customer_failed",
        customer_id: cid,
        message: err.message,
        status: err.statusCode,
      }));
    }
  }
  return all;
}

export async function syncCustomers() {
  const now = new Date().toISOString();
  const rows = await syncForEachCustomer(async (cid) => {
    const raw = await gaqlSearch(cid, GAQL_CUSTOMER);
    return raw.map((r) => ({
      id: idStr(r.customer?.id) ?? cid,
      descriptive_name: toStr(r.customer?.descriptiveName),
      currency_code: toStr(r.customer?.currencyCode),
      time_zone: toStr(r.customer?.timeZone),
      manager: r.customer?.manager ?? null,
      test_account: r.customer?.testAccount ?? null,
      synced_at: now,
    }));
  });
  return replaceTableLoad(dataset.table("gads_customers"), GADS_TABLES.gads_customers, rows);
}

export async function syncCampaigns() {
  const now = new Date().toISOString();
  const rows = await syncForEachCustomer(async (cid) => {
    const raw = await gaqlSearch(cid, GAQL_CAMPAIGNS);
    return raw.map((r) => ({
      id: idStr(r.campaign?.id),
      customer_id: cid,
      name: toStr(r.campaign?.name),
      status: toStr(r.campaign?.status),
      serving_status: toStr(r.campaign?.servingStatus),
      advertising_channel_type: toStr(r.campaign?.advertisingChannelType),
      advertising_channel_sub_type: toStr(r.campaign?.advertisingChannelSubType),
      bidding_strategy_type: toStr(r.campaign?.biddingStrategyType),
      start_date: toStr(r.campaign?.startDate),
      end_date: toStr(r.campaign?.endDate),
      synced_at: now,
    })).filter((r) => r.id);
  });
  return replaceTableLoad(dataset.table("gads_campaigns"), GADS_TABLES.gads_campaigns, rows);
}

export async function syncAdGroups() {
  const now = new Date().toISOString();
  const rows = await syncForEachCustomer(async (cid) => {
    const raw = await gaqlSearch(cid, GAQL_AD_GROUPS);
    return raw.map((r) => {
      // ad_group.campaign vem como resource name "customers/{cid}/campaigns/{id}"
      const campResource = r.adGroup?.campaign;
      const campId = campResource ? campResource.split("/").pop() : null;
      return {
        id: idStr(r.adGroup?.id),
        customer_id: cid,
        campaign_id: idStr(campId),
        name: toStr(r.adGroup?.name),
        status: toStr(r.adGroup?.status),
        type: toStr(r.adGroup?.type),
        synced_at: now,
      };
    }).filter((r) => r.id);
  });
  return replaceTableLoad(dataset.table("gads_ad_groups"), GADS_TABLES.gads_ad_groups, rows);
}

export async function syncAds() {
  const now = new Date().toISOString();
  const rows = await syncForEachCustomer(async (cid) => {
    const raw = await gaqlSearch(cid, GAQL_ADS);
    return raw.map((r) => {
      const adGroupResource = r.adGroupAd?.adGroup;
      const adGroupId = adGroupResource ? adGroupResource.split("/").pop() : null;
      const finalUrls = r.adGroupAd?.ad?.finalUrls || [];
      return {
        id: idStr(r.adGroupAd?.ad?.id),
        customer_id: cid,
        ad_group_id: idStr(adGroupId),
        campaign_id: idStr(r.campaign?.id),
        name: toStr(r.adGroupAd?.ad?.name),
        status: toStr(r.adGroupAd?.status),
        type: toStr(r.adGroupAd?.ad?.type),
        final_url: finalUrls.length ? finalUrls[0] : null,
        synced_at: now,
      };
    }).filter((r) => r.id);
  });
  return replaceTableLoad(dataset.table("gads_ads"), GADS_TABLES.gads_ads, rows);
}

export async function syncInsightsDaily() {
  const now = new Date().toISOString();
  const lookback = config.gads.insightsLookbackDays;
  const until = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - lookback);
  const since = sinceDate.toISOString().slice(0, 10);

  const rows = await syncForEachCustomer(async (cid) => {
    const raw = await gaqlSearch(cid, gaqlInsightsDaily(since, until));
    return raw.map((r) => ({
      date: toStr(r.segments?.date),
      customer_id: cid,
      campaign_id: idStr(r.campaign?.id),
      ad_group_id: idStr(r.adGroup?.id),
      ad_id: idStr(r.adGroupAd?.ad?.id),
      impressions: toInt(r.metrics?.impressions),
      clicks: toInt(r.metrics?.clicks),
      cost_brl: micros(r.metrics?.costMicros),
      conversions: toFloat(r.metrics?.conversions),
      conversion_value_brl: toFloat(r.metrics?.conversionsValue),
      // CTR vem como decimal (0.05 = 5%), normaliza pra percentual
      ctr: r.metrics?.ctr != null ? Number(r.metrics.ctr) * 100 : null,
      avg_cpc_brl: micros(r.metrics?.averageCpc),
      avg_cpm_brl: micros(r.metrics?.averageCpm),
      synced_at: now,
    })).filter((r) => r.date && r.campaign_id);
  });
  return replaceTableLoad(
    dataset.table("gads_insights_daily"),
    GADS_TABLES.gads_insights_daily,
    rows
  );
}
