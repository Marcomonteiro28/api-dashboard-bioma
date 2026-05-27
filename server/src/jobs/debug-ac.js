import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const ds = process.env.AC_BQ_DATASET || "bioma_meta";

const [r1] = await bq.query({
  query: `
    SELECT custom_field_id,
           COUNT(*) AS rows_total,
           COUNTIF(field_value IS NOT NULL AND field_value != '') AS nao_nulo
    FROM \`kondado-bioma.${ds}.ac_deal_cf_data\`
    WHERE custom_field_id IN ('14','15','2','27','28','29','33')
    GROUP BY custom_field_id
    ORDER BY rows_total DESC
  `,
  location: "southamerica-east1",
});
console.log("== Cobertura nos custom fields da API AC ==");
console.table(r1);

const [r2] = await bq.query({
  query: `
    SELECT
      COUNT(*) AS total_deals,
      COUNTIF(empreendimento IS NOT NULL) AS com_empreendimento,
      COUNTIF(criativo_deal IS NOT NULL) AS com_criativo,
      COUNTIF(campanha_deal IS NOT NULL) AS com_campanha,
      COUNTIF(dt_qualificado IS NOT NULL) AS com_qualif
    FROM \`kondado-bioma.${ds}.vw_ac_deals_enriched\`
  `,
  location: "southamerica-east1",
});
console.log("\n== vw_ac_deals_enriched - cobertura ==");
console.table(r2);

const [r3] = await bq.query({
  query: `
    SELECT id, field_label FROM \`kondado-bioma.${ds}.ac_deal_cf_meta\`
    WHERE id IN ('1','2','5','14','15','17','18','27','28','29','33','38','45','46','47')
    ORDER BY CAST(id AS INT64)
  `,
  location: "southamerica-east1",
});
console.log("\n== Mapeamento ID → Label dos custom fields usados ==");
console.table(r3);
