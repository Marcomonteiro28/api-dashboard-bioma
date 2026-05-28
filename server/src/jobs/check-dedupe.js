import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const [r] = await bq.query({
  query: `
    SELECT COUNT(*) AS total_rows, COUNT(DISTINCT id) AS distinct_ids
    FROM \`kondado-bioma.bioma_meta.ac_deals\`
  `,
  location: "southamerica-east1",
});
console.log("Conta:");
console.table(r);

const [r2] = await bq.query({
  query: `SELECT * FROM \`kondado-bioma.bioma_meta.vw_status_atual_live\` ORDER BY pipeline, stage_rank`,
  location: "southamerica-east1",
});
console.log("\nStatus live:");
console.table(r2);
