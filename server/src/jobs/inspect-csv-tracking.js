import { readFileSync } from "node:fs";

const PATH = "C:\\Users\\marco\\Downloads\\export (65).csv";
const buf = readFileSync(PATH);

let text = buf.toString("utf8");
if (text.includes("�") || /Neg.cio/.test(text)) {
  text = buf.toString("latin1");
}

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
const rows = lines.slice(1).filter((l) => l.trim()).map(parseCsvLine);

console.log(`Linhas de dados: ${rows.length}`);
console.log(`Colunas: ${header.length}`);

const TRACKING_COLS = [
  "Origem",
  "Sub Origem",
  "Origem do deal",
  "Tipo de tráfego do deal",
  "Campanha do deal",
  "Criativo que gerou o deal",
  "Palavra-chave do deal",
  "Primeira origem do deal",
  "Primeiro criativo do deal",
  "Página de conversão",
  "Google Analytics Client ID do deal",
  "deal_first_utm_medium",
  "deal_first_utm_campaign",
  "deal_first_utm_term",
  "deal_first_landing_page",
  "deal_first_referrer",
  "utm_referrer",
  "lt_utm_source",
  "lt_utm_medium",
  "lt_utm_campaign",
  "lt_utm_content",
  "lt_utm_term",
  "lt_landing_page",
  "lt_referrer",
  "Origem Deal - Campanha",
  "Origem do Deal - Data",
];

const stats = [];
for (const col of TRACKING_COLS) {
  const idx = header.findIndex((h) => h.trim() === col);
  if (idx === -1) {
    stats.push({ campo: col, encontrado: "NÃO", filled: "-", pct: "-" });
    continue;
  }
  let filled = 0;
  for (const r of rows) {
    const v = (r[idx] || "").trim();
    if (v && v !== "-") filled++;
  }
  const pct = ((filled / rows.length) * 100).toFixed(1);
  stats.push({ campo: col, encontrado: "ok", filled, pct: pct + "%" });
}

console.log("\n== Cobertura por campo de tracking ==");
console.table(stats);

console.log("\n== Top 15 valores para cada campo com >0 filled ==");
for (const s of stats.filter((s) => typeof s.filled === "number" && s.filled > 0)) {
  const idx = header.findIndex((h) => h.trim() === s.campo);
  const valueCounts = {};
  for (const r of rows) {
    const v = (r[idx] || "").trim();
    if (!v) continue;
    valueCounts[v] = (valueCounts[v] || 0) + 1;
  }
  const top = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`\n--- ${s.campo} (${s.filled} deals) ---`);
  console.table(top.map(([v, c]) => ({ valor: v, qtd: c })));
}
