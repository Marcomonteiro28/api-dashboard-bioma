import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

const [r] = await bq.query({
  query: `
    SELECT lc.deal_id, cr.image_hash,
           SUBSTR(cr.image_url, 1, 50) AS image_url,
           SUBSTR(img.permalink_url, 1, 50) AS permalink_url,
           img.width, img.height
    FROM \`kondado-bioma.bioma_meta.vw_lead_creative\` lc
    JOIN \`kondado-bioma.bioma_meta.meta_ads\` ad ON ad.id = lc.matched_ad_id
    JOIN \`kondado-bioma.bioma_meta.meta_adcreatives\` cr ON cr.id = ad.creative_id
    LEFT JOIN \`kondado-bioma.bioma_meta.meta_adimages\` img ON img.hash = cr.image_hash
    WHERE cr.image_hash IS NOT NULL
    ORDER BY lc.dt_entrada DESC
    LIMIT 5
  `,
  location: "southamerica-east1",
});
console.table(r);

// Stats globais
const [stats] = await bq.query({
  query: `
    SELECT
      COUNT(*) AS total_creatives,
      COUNTIF(image_hash IS NOT NULL) AS com_image_hash,
      COUNTIF(image_url IS NOT NULL) AS com_image_url
    FROM \`kondado-bioma.bioma_meta.meta_adcreatives\`
  `,
  location: "southamerica-east1",
});
console.log("\nCobertura nos criativos:");
console.table(stats);

const [matches] = await bq.query({
  query: `
    SELECT
      COUNT(*) AS total_com_hash,
      COUNTIF(img.permalink_url IS NOT NULL) AS com_hd
    FROM \`kondado-bioma.bioma_meta.meta_adcreatives\` cr
    LEFT JOIN \`kondado-bioma.bioma_meta.meta_adimages\` img ON img.hash = cr.image_hash
    WHERE cr.image_hash IS NOT NULL
  `,
  location: "southamerica-east1",
});
console.log("\nMatch creative.hash -> adimages:");
console.table(matches);
