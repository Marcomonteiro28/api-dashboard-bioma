import { config } from "../config.js";

const BASE = "https://graph.facebook.com";

function requireToken() {
  if (!config.meta.accessToken) {
    throw new Error("META_ACCESS_TOKEN nao definido no .env");
  }
  if (!config.meta.adAccountId) {
    throw new Error("META_AD_ACCOUNT_ID nao definido no .env (formato: act_1234567890)");
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

async function metaFetch(url) {
  const start = Date.now();
  const res = await fetch(url);
  const durationMs = Date.now() - start;
  const body = await res.json();
  if (!res.ok) {
    const err = body?.error || {};
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "meta.error",
      status: res.status,
      code: err.code,
      type: err.type,
      message: err.message,
      durationMs,
    }));
    const e = new Error(`Meta API ${res.status}: ${err.message || "erro desconhecido"}`);
    e.statusCode = res.status;
    e.metaCode = err.code;
    throw e;
  }
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "meta.query",
    durationMs,
    rows: body.data?.length ?? 0,
  }));
  return body;
}

export async function fetchPaginated(path, params = {}) {
  requireToken();
  const all = [];
  let url = buildUrl(path, { ...params, limit: params.limit || 100 });
  while (url) {
    const body = await metaFetch(url);
    if (body.data) all.push(...body.data);
    url = body.paging?.next || null;
  }
  return all;
}

export async function fetchMe() {
  requireToken();
  return metaFetch(buildUrl("/me", { fields: "id,name" }));
}

export function adAccountPath(suffix = "") {
  requireToken();
  return `/${config.meta.adAccountId}${suffix}`;
}
