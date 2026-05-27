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
};

export const tbl = (name) => "`" + config.project + "." + config.dataset + "." + name + "`";
