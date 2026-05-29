import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const from = "2026-04-29";
const to = "2026-05-29";

const [r1] = await bq.query({
  query: `
    SELECT COUNT(DISTINCT deal_id) AS distinct_deals, COUNT(*) AS total_rows
    FROM \`kondado-bioma.crm_marts.stg_crm_deals\`
    WHERE DATE(deal_created_at) BETWEEN '${from}' AND '${to}'
  `,
  location: "southamerica-east1",
});
console.log("Totais no range:");
console.table(r1);

const [r2] = await bq.query({
  query: `
    SELECT deal_id, COUNT(*) AS qtd, STRING_AGG(empreendimento) AS empreendimentos
    FROM \`kondado-bioma.crm_marts.stg_crm_deals\`
    WHERE DATE(deal_created_at) BETWEEN '${from}' AND '${to}'
    GROUP BY deal_id
    HAVING COUNT(*) > 1
    LIMIT 10
  `,
  location: "southamerica-east1",
});
console.log("\nDeals duplicados:");
console.table(r2);

const [r3] = await bq.query({
  query: `
    SELECT
      COALESCE(sub_origem, '(NULL/vazio)') AS sub_origem,
      COUNT(DISTINCT deal_id) AS qtd
    FROM \`kondado-bioma.crm_marts.stg_crm_deals\`
    WHERE DATE(deal_created_at) BETWEEN '${from}' AND '${to}'
    GROUP BY sub_origem
    ORDER BY qtd DESC
  `,
  location: "southamerica-east1",
});
console.log("\nDistribuicao sub_origem nos ultimos 30 dias:");
console.table(r3);

const [r4] = await bq.query({
  query: `
    SELECT empreendimento, COUNT(DISTINCT deal_id) AS distinct_leads, COUNT(*) AS rows
    FROM \`kondado-bioma.crm_marts.stg_crm_deals\`
    WHERE DATE(deal_created_at) BETWEEN '${from}' AND '${to}'
    GROUP BY empreendimento
    ORDER BY distinct_leads DESC
  `,
  location: "southamerica-east1",
});
console.log("\nPor empreendimento:");
console.table(r4);
const somaSum = r4.reduce((s, r) => s + Number(r.distinct_leads), 0);
console.log(`\nSUM(per-emp leads): ${somaSum}`);
