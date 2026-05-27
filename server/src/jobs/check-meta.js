import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const ds = process.env.META_BQ_DATASET || "bioma_meta";

const sql = `
  SELECT
    c.name AS campanha,
    c.effective_status AS status,
    ROUND(SUM(i.spend), 2) AS gasto_brl,
    SUM(i.impressions) AS impressoes,
    SUM(i.clicks) AS cliques,
    ROUND(SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.clicks),0)), 2) AS cpc_brl,
    ROUND(SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions),0)) * 100, 2) AS ctr_pct
  FROM \`kondado-bioma.${ds}.meta_insights_daily\` i
  JOIN \`kondado-bioma.${ds}.meta_campaigns\` c ON c.id = i.campaign_id
  WHERE i.date_start >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY c.name, c.effective_status
  ORDER BY gasto_brl DESC
  LIMIT 10
`;

const [rows] = await bq.query({ query: sql, location: "southamerica-east1" });
console.log("Top 10 campanhas Casa Vertical - ultimos 30 dias:");
console.table(rows);
