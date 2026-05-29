import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const ds = process.env.META_BQ_DATASET || "bioma_meta";

const tables = [
  "meta_campaigns",
  "meta_adsets",
  "meta_ads",
  "meta_adcreatives",
  "meta_insights_daily",
  "ac_deals",
  "ac_deal_cf_meta",
  "ac_deal_cf_data",
];

const rows = [];
for (const t of tables) {
  try {
    const [r] = await bq.query({
      query: `
        SELECT
          COUNT(*) AS total_rows,
          MAX(synced_at) AS ultimo_sync
        FROM \`kondado-bioma.${ds}.${t}\`
      `,
      location: "southamerica-east1",
    });
    const r0 = r[0];
    const ts = r0.ultimo_sync?.value;
    const minutesAgo = ts
      ? Math.round((Date.now() - new Date(ts).getTime()) / 60000)
      : null;
    rows.push({
      tabela: t,
      total_rows: r0.total_rows,
      ultimo_sync: ts ? ts.slice(0, 19).replace("T", " ") + "Z" : "—",
      ha_minutos: minutesAgo == null ? "—" : minutesAgo,
    });
  } catch (e) {
    rows.push({ tabela: t, total_rows: "—", ultimo_sync: "ERRO", ha_minutos: e.message.slice(0, 30) });
  }
}
console.table(rows);

const [insightsRange] = await bq.query({
  query: `SELECT MIN(date_start) AS dt_min, MAX(date_start) AS dt_max FROM \`kondado-bioma.${ds}.meta_insights_daily\``,
  location: "southamerica-east1",
});
console.log("\nJanela de insights diarios Meta:");
console.table(insightsRange);
