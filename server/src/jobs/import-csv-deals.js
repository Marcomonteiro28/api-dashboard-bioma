import { readFileSync } from "node:fs";
import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const CSV_PATH = process.argv[2] || "C:\\Users\\marco\\Downloads\\export (65).csv";
const TABLE = "crm_deals_csv";
const SCHEMA = [
  { name: "deal_id", type: "STRING", mode: "REQUIRED" },
  { name: "deal_title", type: "STRING" },
  { name: "status", type: "STRING" },
  { name: "valor", type: "FLOAT64" },
  { name: "empreendimento", type: "STRING" },
  { name: "linha_empreendimento", type: "STRING" },
  { name: "origem", type: "STRING" },
  { name: "sub_origem", type: "STRING" },
  { name: "origem_deal", type: "STRING" },
  { name: "campanha_deal", type: "STRING" },
  { name: "criativo_deal", type: "STRING" },
  { name: "palavra_chave", type: "STRING" },
  { name: "primeira_origem", type: "STRING" },
  { name: "primeiro_criativo", type: "STRING" },
  { name: "pagina_conversao", type: "STRING" },
  { name: "ga_client_id", type: "STRING" },
  { name: "lt_utm_source", type: "STRING" },
  { name: "lt_utm_medium", type: "STRING" },
  { name: "lt_utm_campaign", type: "STRING" },
  { name: "lt_utm_content", type: "STRING" },
  { name: "lt_utm_term", type: "STRING" },
  { name: "deal_first_utm_campaign", type: "STRING" },
  { name: "deal_first_utm_term", type: "STRING" },
  { name: "deal_first_landing_page", type: "STRING" },
  { name: "deal_first_referrer", type: "STRING" },
  { name: "origem_deal_campanha", type: "STRING" },
  { name: "origem_deal_data", type: "TIMESTAMP" },
  { name: "dt_criacao", type: "TIMESTAMP" },
  { name: "dt_atualizacao", type: "TIMESTAMP" },
  { name: "dt_entrada", type: "TIMESTAMP" },
  { name: "dt_qualificado", type: "TIMESTAMP" },
  { name: "dt_visita_agendada", type: "TIMESTAMP" },
  { name: "dt_visita_realizada", type: "TIMESTAMP" },
  { name: "dt_fechamento", type: "TIMESTAMP" },
  { name: "imported_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

const CSV_TO_COL = {
  "ID do Negócio": "deal_id",
  "Título": "deal_title",
  "Status": "status",
  "Valor": "valor",
  "Empreendimento": "empreendimento",
  "Linha de Empreendimento": "linha_empreendimento",
  "Origem": "origem",
  "Sub Origem": "sub_origem",
  "Origem do deal": "origem_deal",
  "Campanha do deal": "campanha_deal",
  "Criativo que gerou o deal": "criativo_deal",
  "Palavra-chave do deal": "palavra_chave",
  "Primeira origem do deal": "primeira_origem",
  "Primeiro criativo do deal": "primeiro_criativo",
  "Página de conversão": "pagina_conversao",
  "Google Analytics Client ID do deal": "ga_client_id",
  "lt_utm_source": "lt_utm_source",
  "lt_utm_medium": "lt_utm_medium",
  "lt_utm_campaign": "lt_utm_campaign",
  "lt_utm_content": "lt_utm_content",
  "lt_utm_term": "lt_utm_term",
  "deal_first_utm_campaign": "deal_first_utm_campaign",
  "deal_first_utm_term": "deal_first_utm_term",
  "deal_first_landing_page": "deal_first_landing_page",
  "deal_first_referrer": "deal_first_referrer",
  "Origem Deal - Campanha": "origem_deal_campanha",
  "Origem do Deal - Data": "origem_deal_data",
  "Criação": "dt_criacao",
  "Atualizaram": "dt_atualizacao",
  "dt_entrada_entrada": "dt_entrada",
  "dt_entrada_qualificados": "dt_qualificado",
  "dt_entrada_visita_agendada": "dt_visita_agendada",
  "dt_entrada_visita_realizada": "dt_visita_realizada",
  "dt_fechamento": "dt_fechamento",
};

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

function splitCsv(text) {
  const lines = [];
  let buffer = "";
  let inQuote = false;
  for (const ch of text) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "\n" && !inQuote) {
      lines.push(buffer);
      buffer = "";
    } else if (ch !== "\r") {
      buffer += ch;
    }
  }
  if (buffer) lines.push(buffer);
  return lines;
}

function parseMoney(v) {
  if (!v) return null;
  const cleaned = v.replace(/R\$/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  if (!v || !v.trim()) return null;
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, mm, dd, yyyy, hh = "00", mi = "00"] = m;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

async function main() {
  const text = readFileSync(CSV_PATH, "utf8");
  const lines = splitCsv(text);
  const header = parseCsvLine(lines[0]).map((h) => h.trim());

  const colIdx = {};
  for (const [csvCol, bqCol] of Object.entries(CSV_TO_COL)) {
    const idx = header.findIndex((h) => h === csvCol);
    if (idx === -1) {
      console.warn(`[warn] coluna CSV nao encontrada: "${csvCol}"`);
      continue;
    }
    colIdx[bqCol] = idx;
  }

  const importedAt = new Date().toISOString();
  const rows = [];
  for (const l of lines.slice(1)) {
    if (!l.trim()) continue;
    const r = parseCsvLine(l);
    const row = { imported_at: importedAt };
    for (const [bqCol, idx] of Object.entries(colIdx)) {
      const raw = (r[idx] || "").trim();
      if (!raw) { row[bqCol] = null; continue; }
      if (bqCol === "valor") row[bqCol] = parseMoney(raw);
      else if (bqCol.startsWith("dt_") || bqCol === "origem_deal_data" || bqCol === "dt_criacao" || bqCol === "dt_atualizacao") {
        row[bqCol] = parseDate(raw);
      }
      else row[bqCol] = raw;
    }
    if (row.deal_id) rows.push(row);
  }

  console.log(`Parsed ${rows.length} rows from CSV.`);

  const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
  const dataset = bq.dataset(process.env.META_BQ_DATASET || "bioma_meta");
  const table = dataset.table(TABLE);

  const [exists] = await table.exists();
  if (!exists) {
    await dataset.createTable(TABLE, { schema: SCHEMA, location: process.env.BQ_LOCATION });
    console.log(`Tabela ${TABLE} criada.`);
  }

  await bq.query({
    query: `DELETE FROM \`${process.env.GCP_PROJECT_ID}.${process.env.META_BQ_DATASET || "bioma_meta"}.${TABLE}\` WHERE TRUE`,
    location: process.env.BQ_LOCATION,
  });
  console.log(`Limpa tabela antes do reimport.`);

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await table.insert(rows.slice(i, i + CHUNK), { ignoreUnknownValues: false });
    console.log(`Inseridos ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log("Import concluido.");
}

main().catch((e) => { console.error(e); process.exit(1); });
