import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const ds = process.env.META_BQ_DATASET || "bioma_meta";

console.log("== Parser de empreendimento: cobertura ==");
const [c1] = await bq.query({
  query: `
    SELECT
      COALESCE(empreendimento, '(NAO IDENTIFICADO)') AS empreendimento,
      COUNT(*) AS qtd_campanhas
    FROM \`kondado-bioma.${ds}.vw_meta_campaign_attribution\`
    GROUP BY empreendimento
    ORDER BY qtd_campanhas DESC
  `,
  location: "southamerica-east1",
});
console.table(c1);

console.log("\n== Spend agregado por empreendimento (ultimos 30 dias) ==");
const [c2] = await bq.query({
  query: `
    SELECT
      empreendimento,
      ROUND(SUM(gasto_brl), 2) AS gasto_brl,
      SUM(impressoes) AS impressoes,
      SUM(cliques) AS cliques,
      ROUND(SAFE_DIVIDE(SUM(gasto_brl), NULLIF(SUM(cliques),0)), 2) AS cpc_brl
    FROM \`kondado-bioma.${ds}.vw_meta_spend_daily_emp\`
    WHERE dt >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY empreendimento
    ORDER BY gasto_brl DESC
  `,
  location: "southamerica-east1",
});
console.table(c2);

console.log("\n== Campanhas NAO identificadas (pra corrigir parser) ==");
const [c3] = await bq.query({
  query: `
    SELECT campaign_name, effective_status
    FROM \`kondado-bioma.${ds}.vw_meta_campaign_attribution\`
    WHERE empreendimento IS NULL
    LIMIT 15
  `,
  location: "southamerica-east1",
});
console.table(c3);
