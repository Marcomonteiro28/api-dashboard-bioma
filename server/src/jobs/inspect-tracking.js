import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const project = process.env.GCP_PROJECT_ID;

console.log("== Datasets no projeto ==");
const [datasets] = await bq.getDatasets();
console.table(datasets.map(d => ({ id: d.id })));

const inspectDataset = async (ds) => {
  console.log(`\n== Tabelas em ${ds} ==`);
  try {
    const [tables] = await bq.dataset(ds).getTables();
    console.table(tables.map(t => ({ table: t.id, type: t.metadata?.type })).slice(0, 40));
  } catch (e) {
    console.log(`  (sem acesso: ${e.message.split("\n")[0]})`);
  }
};

await inspectDataset("crm_marts");
await inspectDataset("raw_data");

console.log("\n== Colunas de stg_crm_deals (search utm/ad/click) ==");
const [cols] = await bq.query({
  query: `
    SELECT column_name, data_type
    FROM \`${project}.crm_marts.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'stg_crm_deals'
    ORDER BY ordinal_position
  `,
  location: "southamerica-east1"
});
console.table(cols);

console.log("\n== Procura tabelas com colunas tipo utm/fbclid/campaign em raw_data ==");
try {
  const [utm] = await bq.query({
    query: `
      SELECT table_name, column_name, data_type
      FROM \`${project}.raw_data.INFORMATION_SCHEMA.COLUMNS\`
      WHERE LOWER(column_name) LIKE '%utm%'
         OR LOWER(column_name) LIKE '%fbclid%'
         OR LOWER(column_name) LIKE '%gclid%'
         OR LOWER(column_name) LIKE '%ad_id%'
         OR LOWER(column_name) LIKE '%creative%'
         OR LOWER(column_name) LIKE '%source%'
         OR LOWER(column_name) LIKE '%origin%'
      ORDER BY table_name, column_name
      LIMIT 50
    `,
    location: "southamerica-east1"
  });
  console.table(utm);
} catch (e) {
  console.log(`  (raw_data inacessivel: ${e.message.split("\n")[0]})`);
}

console.log("\n== Sample de origem/sub_origem em stg_crm_deals ==");
const [origens] = await bq.query({
  query: `
    SELECT origem, sub_origem, COUNT(*) AS qtd
    FROM \`${project}.crm_marts.stg_crm_deals\`
    GROUP BY origem, sub_origem
    ORDER BY qtd DESC
    LIMIT 20
  `,
  location: "southamerica-east1"
});
console.table(origens);
