import { config } from "../config.js";

function requireAuth() {
  if (!config.ac.apiUrl) throw new Error("AC_API_URL nao definido no .env");
  if (!config.ac.token) throw new Error("AC_API_TOKEN nao definido no .env");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acFetch(path, qs = {}) {
  requireAuth();
  const url = new URL(config.ac.apiUrl + "/api/3" + path);
  for (const [k, v] of Object.entries(qs)) {
    if (v == null) continue;
    url.searchParams.set(k, String(v));
  }
  const start = Date.now();
  const res = await fetch(url.toString(), {
    headers: {
      "Api-Token": config.ac.token,
      Accept: "application/json",
    },
  });
  const durationMs = Date.now() - start;
  if (!res.ok) {
    const text = await res.text();
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "ac.error",
      status: res.status,
      path,
      durationMs,
      body: text.slice(0, 300),
    }));
    const e = new Error(`AC API ${res.status}: ${text.slice(0, 200)}`);
    e.statusCode = res.status;
    throw e;
  }
  const body = await res.json();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "ac.query",
    path,
    durationMs,
    total: body?.meta?.total,
  }));
  return body;
}

export async function fetchMe() {
  return acFetch("/users/me");
}

export async function fetchAllPaginated(path, dataKey, extraParams = {}) {
  const all = [];
  let offset = 0;
  const limit = config.ac.pageLimit;
  // Ordem estavel evita rows duplicados quando deals novos entram no AC durante a paginacao
  const params = { "orders[id]": "ASC", ...extraParams };
  while (true) {
    const body = await acFetch(path, { ...params, limit, offset });
    const items = body[dataKey] || [];
    all.push(...items);
    const total = parseInt(body.meta?.total || "0", 10);
    offset += items.length;
    if (items.length === 0 || offset >= total) break;
    await sleep(config.ac.rateLimitMs);
  }
  // Defense-in-depth: deduplica por id caso ordem nao estabilize 100%
  const seen = new Map();
  for (const item of all) {
    const id = String(item.id || "");
    if (id && !seen.has(id)) seen.set(id, item);
  }
  return [...seen.values()];
}
