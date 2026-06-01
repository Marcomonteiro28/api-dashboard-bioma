import { config } from "../config.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cache do access token (validade 1h, renovamos com 5min de folga)
let _accessToken = null;
let _accessTokenExpiresAt = 0;

function requireConfig() {
  const cfg = config.gads;
  if (!cfg.developerToken) throw new Error("GADS_DEVELOPER_TOKEN não definido");
  if (!cfg.oauthClientId) throw new Error("GADS_OAUTH_CLIENT_ID não definido");
  if (!cfg.oauthClientSecret) throw new Error("GADS_OAUTH_CLIENT_SECRET não definido");
  if (!cfg.refreshToken) throw new Error("GADS_REFRESH_TOKEN não definido");
  if (!cfg.customerIds.length) throw new Error("GADS_CUSTOMER_IDS vazio (CSV de customer IDs sem hífens)");
}

async function refreshAccessToken() {
  requireConfig();
  const body = new URLSearchParams({
    client_id: config.gads.oauthClientId,
    client_secret: config.gads.oauthClientSecret,
    refresh_token: config.gads.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error_description || json?.error || `OAuth refresh ${res.status}`;
    const e = new Error(`Google OAuth refresh falhou: ${msg}`);
    e.statusCode = res.status;
    throw e;
  }
  _accessToken = json.access_token;
  // expires_in em segundos. Renova 5min antes de expirar.
  _accessTokenExpiresAt = Date.now() + (json.expires_in - 300) * 1000;
  return _accessToken;
}

async function getAccessToken() {
  if (_accessToken && Date.now() < _accessTokenExpiresAt) return _accessToken;
  return refreshAccessToken();
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Executa uma query GAQL no customer especificado.
 * Retorna array com todos os resultados (auto-paginação).
 */
export async function gaqlSearch(customerId, query) {
  requireConfig();
  const customer = customerId.replace(/-/g, "");
  const login = config.gads.loginCustomerId;
  const url = `https://googleads.googleapis.com/${config.gads.apiVersion}/customers/${customer}/googleAds:search`;

  const all = [];
  let pageToken = null;
  let attempt = 0;

  do {
    const accessToken = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": config.gads.developerToken,
      "Content-Type": "application/json",
    };
    if (login) headers["login-customer-id"] = login;

    const start = Date.now();
    // Em v20+ o pageSize foi removido (fixo em 10000 rows pelo Google).
    // Mandar pageSize causa erro PAGE_SIZE_NOT_SUPPORTED.
    const reqBody = { query };
    if (pageToken) reqBody.pageToken = pageToken;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
    });
    const durationMs = Date.now() - start;
    const json = await res.json();

    if (res.ok) {
      const rows = json.results || [];
      all.push(...rows);
      pageToken = json.nextPageToken || null;
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "gads.query",
        customer,
        durationMs,
        rows: rows.length,
        page: pageToken ? "next" : "last",
      }));
      attempt = 0; // reseta contador entre páginas
      if (pageToken && config.gads.rateLimitMs > 0) await sleep(config.gads.rateLimitMs);
      continue;
    }

    // Erro — checa retryability
    const err = json?.error || {};
    const retryable = RETRYABLE_STATUS.has(res.status);
    attempt++;
    const exhausted = attempt >= config.gads.retryMaxAttempts;

    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "gads.error",
      customer,
      status: res.status,
      message: err.message,
      details: err.details,
      durationMs,
      attempt,
      retrying: retryable && !exhausted,
    }));

    if (!retryable || exhausted) {
      const e = new Error(`Google Ads API ${res.status}: ${err.message || "erro desconhecido"}`);
      e.statusCode = res.status;
      e.gadsDetails = err.details;
      throw e;
    }

    const backoff = config.gads.retryBackoffMs * Math.pow(2, attempt - 1);
    await sleep(backoff);
  } while (pageToken !== null || attempt > 0);

  return all;
}

/** Lista os customer IDs configurados (já sem hífens) */
export function listCustomers() {
  return config.gads.customerIds;
}

/** Valida credenciais buscando metadata do customer principal */
export async function validateCredentials() {
  requireConfig();
  const first = config.gads.customerIds[0];
  const rows = await gaqlSearch(first, "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1");
  return rows[0]?.customer || null;
}
