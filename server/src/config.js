import "dotenv/config";

const required = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`ERRO: variável ${name} não definida no .env`);
    process.exit(1);
  }
  return v;
};

const splitCsv = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  project: required("GCP_PROJECT_ID"),
  dataset: process.env.BQ_DATASET || "crm_marts",
  location: process.env.BQ_LOCATION || "southamerica-east1",
  allowedOrigins: process.env.ALLOWED_ORIGIN
    ? splitCsv(process.env.ALLOWED_ORIGIN)
    : ["http://localhost:5173", "http://localhost:3001"],
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || "600000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "120", 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  meta: {
    apiVersion: process.env.META_API_VERSION || "v20.0",
    accessToken: process.env.META_ACCESS_TOKEN || null,
    adAccountIds: (() => {
      const multi = process.env.META_AD_ACCOUNT_IDS;
      const single = process.env.META_AD_ACCOUNT_ID;
      if (multi) return multi.split(",").map((s) => s.trim()).filter(Boolean);
      if (single) return [single];
      return [];
    })(),
    insightsLookbackDays: parseInt(process.env.META_INSIGHTS_LOOKBACK_DAYS || "30", 10),
    dataset: process.env.META_BQ_DATASET || process.env.BQ_DATASET || "crm_marts",
  },
  ac: {
    apiUrl: (process.env.AC_API_URL || "").replace(/\/+$/, ""),
    token: process.env.AC_API_TOKEN || null,
    dataset: process.env.AC_BQ_DATASET || process.env.META_BQ_DATASET || "bioma_meta",
    pageLimit: parseInt(process.env.AC_PAGE_LIMIT || "100", 10),
    rateLimitMs: parseInt(process.env.AC_RATE_LIMIT_MS || "250", 10),
  },
};

export const tbl = (name) => "`" + config.project + "." + config.dataset + "." + name + "`";
