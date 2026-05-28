import { config } from "../config.js";

const BASE = "https://graph.facebook.com";

function requireToken() {
  if (!config.meta.accessToken) {
    throw new Error("META_ACCESS_TOKEN nao definido no .env");
  }
  if (!config.meta.adAccountIds.length) {
    throw new Error("META_AD_ACCOUNT_ID(S) nao definido no .env (formato: act_1234567890, separado por virgula se multiplas)");
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE}/${config.meta.apiVersion}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  url.searchParams.set("access_token", config.meta.accessToken);
  return url.toString();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE_META_CODES = new Set([4, 17, 32, 613, 80004]);

async function metaFetch(url) {
  let attempt = 0;
  while (true) {
    attempt++;
    const start = Date.now();
    const res = await fetch(url);
    const durationMs = Date.now() - start;
    const body = await res.json();
    if (res.ok) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "meta.query",
        durationMs,
        rows: body.data?.length ?? 0,
        attempt,
      }));
      return body;
    }
    const err = body?.error || {};
    const retryable = RETRYABLE_META_CODES.has(err.code) || res.status === 429 || res.status >= 500;
    const exhausted = attempt >= config.meta.retryMaxAttempts;
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "meta.error",
      status: res.status,
      code: err.code,
      type: err.type,
      message: err.message,
      durationMs,
      attempt,
      retrying: retryable && !exhausted,
    }));
    if (!retryable || exhausted) {
      const e = new Error(`Meta API ${res.status}: ${err.message || "erro desconhecido"}`);
      e.statusCode = res.status;
      e.metaCode = err.code;
      throw e;
    }
    const backoff = config.meta.retryBackoffMs * Math.pow(2, attempt - 1);
    await sleep(backoff);
  }
}

export async function fetchPaginated(path, params = {}) {
  requireToken();
  const all = [];
  let url = buildUrl(path, { ...params, limit: params.limit || 100 });
  while (url) {
    const body = await metaFetch(url);
    if (body.data) all.push(...body.data);
    url = body.paging?.next || null;
    if (url && config.meta.rateLimitMs > 0) await sleep(config.meta.rateLimitMs);
  }
  return all;
}

export async function fetchMe() {
  requireToken();
  return metaFetch(buildUrl("/me", { fields: "id,name" }));
}

export function adAccountPath(accountId, suffix = "") {
  return `/${accountId}${suffix}`;
}

export function listAccounts() {
  return config.meta.adAccountIds;
}
