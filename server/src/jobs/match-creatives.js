import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

const [r] = await bq.query({
  query: `
    WITH valores AS (
      SELECT DISTINCT custom_field_text_value AS criativo
      FROM \`kondado-bioma.raw_data.activecampaign_deals_custom_fields_data\`
      WHERE custom_field_id = 15
        AND custom_field_text_value IS NOT NULL
        AND custom_field_text_value != ''
    )
    SELECT
      v.criativo,
      CASE
        WHEN c.id IS NOT NULL THEN 'CAMPAIGN'
        WHEN a.id IS NOT NULL THEN 'AD'
        WHEN cr.id IS NOT NULL THEN 'CREATIVE'
        ELSE 'NAO ENCONTRADO'
      END AS match_em
    FROM valores v
    LEFT JOIN \`kondado-bioma.bioma_meta.meta_campaigns\` c   ON c.name  = v.criativo
    LEFT JOIN \`kondado-bioma.bioma_meta.meta_ads\` a         ON a.name  = v.criativo
    LEFT JOIN \`kondado-bioma.bioma_meta.meta_adcreatives\` cr ON cr.name = v.criativo
    ORDER BY match_em, v.criativo
  `,
  location: "southamerica-east1",
});

const stats = r.reduce((acc, row) => {
  acc[row.match_em] = (acc[row.match_em] || 0) + 1;
  return acc;
}, {});
console.log("Cobertura de match dos 146 valores em Criativo do deal:");
console.table(stats);

console.log("\nPrimeiros 10 NÃO encontrados:");
console.table(r.filter((x) => x.match_em === "NAO ENCONTRADO").slice(0, 10));

console.log("\nPrimeiros 10 que bateram:");
console.table(r.filter((x) => x.match_em !== "NAO ENCONTRADO").slice(0, 10));
