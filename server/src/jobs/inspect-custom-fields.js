import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const project = process.env.GCP_PROJECT_ID;

console.log("== Custom fields de DEAL no AC ==");
const [dealFields] = await bq.query({
  query: `
    SELECT *
    FROM \`${project}.raw_data.activecampaign_deals_custom_fields_meta\`
    ORDER BY id
  `,
  location: "southamerica-east1"
});
console.table(dealFields);

console.log("\n== Custom fields de CONTACT no AC ==");
const [contactFields] = await bq.query({
  query: `
    SELECT *
    FROM \`${project}.raw_data.activecampaign_contacts_custom_fields_meta\`
    ORDER BY id
  `,
  location: "southamerica-east1"
});
console.table(contactFields);
