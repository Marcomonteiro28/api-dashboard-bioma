import "dotenv/config";
import { fetchAllPaginated } from "../ac/client.js";

// Pega só 1 página pra ver os campos disponíveis
const sample = await fetchAllPaginated("/deals", "deals", { limit: 5 });
console.log("Total fields disponíveis:", Object.keys(sample[0] || {}).length);
console.log("Fields:");
console.log(Object.keys(sample[0] || {}).sort().join("\n"));

// Conta status=0 com filtros possíveis (deal.hidden, deal.shared, etc)
const allOpen = await fetchAllPaginated("/deals", "deals", {
  "filters[status]": 0,
  limit: 100,
});
console.log("\nTotal status=0 (abertos):", allOpen.length);

const byHidden = allOpen.reduce((acc, d) => {
  const key = `hidden=${d.hidden || 0} shared=${d.shared || 0}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
console.log("Distribuição por hidden/shared:");
console.table(byHidden);

const byStage = allOpen.reduce((acc, d) => {
  acc[d.stage] = (acc[d.stage] || 0) + 1;
  return acc;
}, {});
console.log("Distribuição por stage:");
console.table(byStage);
