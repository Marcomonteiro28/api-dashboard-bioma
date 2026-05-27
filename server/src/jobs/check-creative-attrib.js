import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

console.log("== Cobertura de match no vw_lead_creative ==");
const [c1] = await bq.query({
  query: `
    SELECT match_type, COUNT(DISTINCT deal_id) AS deals
    FROM \`kondado-bioma.bioma_meta.vw_lead_creative\`
    GROUP BY match_type
    ORDER BY deals DESC
  `,
  location: "southamerica-east1",
});
console.table(c1);

console.log("\n== Top 15 criativos por leads ==");
const [c2] = await bq.query({
  query: `
    SELECT
      criativo,
      empreendimento,
      match_type,
      SUM(leads) AS leads,
      SUM(qualificados) AS qualif,
      SUM(visitas) AS visitas,
      SUM(ganhos) AS ganhos
    FROM \`kondado-bioma.bioma_meta.vw_creative_performance\`
    WHERE criativo != '(sem criativo)'
    GROUP BY criativo, empreendimento, match_type
    ORDER BY leads DESC
    LIMIT 15
  `,
  location: "southamerica-east1",
});
console.table(c2);
