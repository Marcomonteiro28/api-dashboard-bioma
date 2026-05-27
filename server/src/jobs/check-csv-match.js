import { readFileSync } from "node:fs";
import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const PATH = "C:\\Users\\marco\\Downloads\\export (65).csv";
const text = readFileSync(PATH, "utf8");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const lines = [];
let buffer = "";
let inQuote = false;
for (const ch of text) {
  if (ch === '"') inQuote = !inQuote;
  if (ch === "\n" && !inQuote) {
    lines.push(buffer);
    buffer = "";
  } else {
    buffer += ch;
  }
}
if (buffer) lines.push(buffer);

const header = parseCsvLine(lines[0]);
const idxCamp = header.findIndex((h) => h.trim() === "Campanha do deal");
const idxCriat = header.findIndex((h) => h.trim() === "Criativo que gerou o deal");

const campsCsv = new Set();
const criatsCsv = new Set();
for (const l of lines.slice(1)) {
  if (!l.trim()) continue;
  const r = parseCsvLine(l);
  const c = (r[idxCamp] || "").trim();
  const cr = (r[idxCriat] || "").trim();
  if (c) campsCsv.add(c);
  if (cr) criatsCsv.add(cr);
}

console.log(`Valores únicos no CSV: ${campsCsv.size} campanhas, ${criatsCsv.size} criativos`);

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const [campsBq] = await bq.query({
  query: "SELECT DISTINCT name FROM `kondado-bioma.bioma_meta.meta_campaigns`",
  location: "southamerica-east1",
});
const [adsBq] = await bq.query({
  query: "SELECT DISTINCT name FROM `kondado-bioma.bioma_meta.meta_ads`",
  location: "southamerica-east1",
});
const [creBq] = await bq.query({
  query: "SELECT DISTINCT name FROM `kondado-bioma.bioma_meta.meta_adcreatives` WHERE name IS NOT NULL",
  location: "southamerica-east1",
});

const campsBqSet = new Set(campsBq.map((r) => r.name));
const adsBqSet = new Set(adsBq.map((r) => r.name));
const creBqSet = new Set(creBq.map((r) => r.name));

let campsMatch = 0;
for (const c of campsCsv) if (campsBqSet.has(c)) campsMatch++;
let criatAdsMatch = 0, criatCreMatch = 0, criatCampMatch = 0;
for (const c of criatsCsv) {
  if (adsBqSet.has(c)) criatAdsMatch++;
  else if (creBqSet.has(c)) criatCreMatch++;
  else if (campsBqSet.has(c)) criatCampMatch++;
}

console.log("\n== Match 'Campanha do deal' vs meta_campaigns.name ==");
console.table([
  { csv_unique: campsCsv.size, meta_unique: campsBqSet.size, match: campsMatch, pct: ((campsMatch / campsCsv.size) * 100).toFixed(1) + "%" },
]);

console.log("\n== Match 'Criativo que gerou o deal' vs meta ads/creatives/campaigns ==");
console.table([
  { csv_unique: criatsCsv.size, match_em_ads: criatAdsMatch, match_em_creatives: criatCreMatch, match_em_campaigns: criatCampMatch, total_match: criatAdsMatch + criatCreMatch + criatCampMatch, pct: (((criatAdsMatch + criatCreMatch + criatCampMatch) / criatsCsv.size) * 100).toFixed(1) + "%" },
]);

console.log("\n== Amostra de 'Criativo' do CSV que NÃO bateu em lugar nenhum (top 10) ==");
const naoBateu = [...criatsCsv].filter((c) => !adsBqSet.has(c) && !creBqSet.has(c) && !campsBqSet.has(c));
console.table(naoBateu.slice(0, 10).map((v) => ({ valor: v })));

console.log("\n== Amostra de 'Criativo' que BATEU em ads (top 10) ==");
const bateuAd = [...criatsCsv].filter((c) => adsBqSet.has(c));
console.table(bateuAd.slice(0, 10).map((v) => ({ valor: v })));
