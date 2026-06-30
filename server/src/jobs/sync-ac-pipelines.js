import "dotenv/config";
import { syncPipelines, syncStages } from "../ac/loaders.js";

// Carga avulsa só de pipelines (dealGroups) e etapas (dealStages) do AC -> BQ.
// Usado pra criar/atualizar ac_pipelines e ac_stages sem refazer o sync inteiro.
// Uso: node server/src/jobs/sync-ac-pipelines.js
async function main() {
  const p = await syncPipelines();
  console.log(JSON.stringify({ ts: new Date().toISOString(), kind: "sync.step", step: "pipelines", rows: p }));
  const s = await syncStages();
  console.log(JSON.stringify({ ts: new Date().toISOString(), kind: "sync.step", step: "stages", rows: s }));
}

main().catch((err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), kind: "sync.fatal", message: err.message }));
  process.exit(1);
});
