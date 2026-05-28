import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";
import { fetchAllPaginated } from "../ac/client.js";

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

// Aguardando retorno = stage 26
const STAGE = 26;
const STAGE_NAME = "01. Aguardando retorno";

console.log(`Investigando '${STAGE_NAME}' (stage_id=${STAGE})\n`);

const [bqRows] = await bq.query({
  query: `SELECT id, status, is_disabled, owner_id, contact_id, title, updated_timestamp
          FROM \`kondado-bioma.bioma_meta.ac_deals\`
          WHERE CAST(stage_id AS INT64) = ${STAGE}
            AND status = 0
            AND COALESCE(is_disabled, FALSE) = FALSE
          ORDER BY id`,
  location: "southamerica-east1",
});
console.log(`Minha sync: ${bqRows.length} deals\n`);

const apiDeals = await fetchAllPaginated("/deals", "deals", {
  "filters[stage]": STAGE,
  "filters[status]": 0,
});
console.log(`AC API com filters[stage,status]: ${apiDeals.length} deals\n`);

const bqIds = new Set(bqRows.map((r) => String(r.id)));
const apiIds = new Set(apiDeals.map((d) => String(d.id)));

const naMinhaNaoNoAC = [...bqIds].filter((id) => !apiIds.has(id));
const noACNaoNaMinha = [...apiIds].filter((id) => !bqIds.has(id));

console.log(`\nNa minha sync mas NAO no AC com filtro (${naMinhaNaoNoAC.length}):`);
const samples = bqRows.filter((r) => naMinhaNaoNoAC.includes(String(r.id))).slice(0, 10);
console.table(
  samples.map((r) => ({
    id: r.id,
    status: r.status,
    is_disabled: r.is_disabled,
    owner: r.owner_id,
    contact: r.contact_id,
    title: r.title?.slice(0, 40),
    updated: r.updated_timestamp?.value?.slice(0, 16),
  }))
);

if (samples[0]) {
  console.log(`\nBuscando deal ${samples[0].id} direto na API pra ver TODOS os campos:`);
  const d = await (await fetch(
    `${process.env.AC_API_URL}/api/3/deals/${samples[0].id}`,
    { headers: { "Api-Token": process.env.AC_API_TOKEN, Accept: "application/json" } }
  )).json();
  if (d.deal) {
    console.log(JSON.stringify({
      id: d.deal.id,
      title: d.deal.title?.slice(0, 40),
      stage: d.deal.stage,
      status: d.deal.status,
      isDisabled: d.deal.isDisabled,
      owner: d.deal.owner,
      group: d.deal.group,
      hidden: d.deal.hidden,
      shared: d.deal.shared,
    }, null, 2));
  } else {
    console.log("API retornou:", JSON.stringify(d).slice(0, 300));
  }
}

console.log(`\nNo AC mas NAO na minha sync (${noACNaoNaMinha.length}):`, noACNaoNaMinha.slice(0, 5));
