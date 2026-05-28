import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

const [cols] = await bq.query({
  query: `
    SELECT column_name FROM \`kondado-bioma.raw_data.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'activecampaign_pipelines_dealstages'
    ORDER BY ordinal_position
  `,
  location: "southamerica-east1",
});
console.log("Colunas dealstages:");
console.table(cols);

const [sample] = await bq.query({
  query: `SELECT dealstages_id, dealstages_title, pipeline_id, dealstages_order FROM \`kondado-bioma.raw_data.activecampaign_pipelines_dealstages\` ORDER BY pipeline_id, dealstages_order`,
  location: "southamerica-east1",
});
console.log("\nTodos os stages:");
console.table(sample);

const [pipelines] = await bq.query({
  query: `SELECT * FROM \`kondado-bioma.raw_data.activecampaign_pipelines\` ORDER BY id`,
  location: "southamerica-east1",
});
console.log("\nPipelines:");
console.table(pipelines);
