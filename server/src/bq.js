import { BigQuery } from "@google-cloud/bigquery";
import { config } from "./config.js";

const bq = new BigQuery({ projectId: config.project });

const cache = new Map();

export async function runQuery(sql, params = {}, types = {}) {
  const start = Date.now();
  try {
    const [rows] = await bq.query({
      query: sql,
      params,
      types,
      location: config.location,
    });
    const durationMs = Date.now() - start;
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "bq.query",
      durationMs,
      rows: rows.length,
    }));
    return rows;
  } catch (err) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "bq.error",
      message: err.message,
      durationMs: Date.now() - start,
    }));
    const e = new Error("BigQuery falhou: " + err.message);
    e.statusCode = 500;
    throw e;
  }
}

export async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < config.cacheTtlMs) return hit.v;
  const v = await fn();
  cache.set(key, { v, t: Date.now() });
  return v;
}

export async function pingBq() {
  await bq.query({ query: "SELECT 1 AS ok", location: config.location });
}
