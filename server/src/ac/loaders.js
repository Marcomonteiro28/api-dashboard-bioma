import { BigQuery } from "@google-cloud/bigquery";
import { Readable } from "node:stream";
import { config } from "../config.js";
import { fetchAllPaginated } from "./client.js";
import { AC_TABLES } from "./schemas.js";

const bq = new BigQuery({ projectId: config.project });
const dataset = bq.dataset(config.ac.dataset);

const toFloat = (v) => {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const toInt = (v) => {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const toBool = (v) => {
  if (v == null) return null;
  return v === true || v === "1" || v === 1;
};
const toIso = (v) => (v ? new Date(v).toISOString() : null);

async function replaceAll(tableName, rows) {
  const schema = AC_TABLES[tableName];
  if (!schema) throw new Error(`Schema desconhecido: ${tableName}`);
  const table = dataset.table(tableName);

  if (rows.length === 0) {
    await bq.query({
      query: `CREATE OR REPLACE TABLE \`${config.project}.${config.ac.dataset}.${tableName}\` (${schema.map((c) => `${c.name} ${c.type}${c.mode === "REQUIRED" ? " NOT NULL" : ""}`).join(", ")})`,
      location: config.location,
    });
    return 0;
  }

  const ndjson = rows.map((r) => JSON.stringify(r)).join("\n");
  const writeStream = table.createWriteStream({
    sourceFormat: "NEWLINE_DELIMITED_JSON",
    writeDisposition: "WRITE_TRUNCATE",
    createDisposition: "CREATE_IF_NEEDED",
    schema: { fields: schema },
    location: config.location,
  });

  await new Promise((resolve, reject) => {
    writeStream.on("complete", (job) => {
      const errors = job?.status?.errors;
      if (errors && errors.length) {
        console.error(JSON.stringify({
          ts: new Date().toISOString(),
          kind: "bq.load_error",
          table: tableName,
          errors: errors.slice(0, 3),
        }));
        reject(new Error(`Load em ${tableName} falhou: ${errors[0]?.message || "erro desconhecido"}`));
      } else {
        resolve(job);
      }
    });
    writeStream.on("error", reject);
    Readable.from(ndjson).pipe(writeStream);
  });

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "bq.loaded",
    table: tableName,
    rows: rows.length,
  }));
  return rows.length;
}

export async function syncDealCustomFieldsMeta() {
  const now = new Date().toISOString();
  const raw = await fetchAllPaginated("/dealCustomFieldMeta", "dealCustomFieldMeta");
  const rows = raw.map((m) => ({
    id: String(m.id),
    field_label: m.fieldLabel ?? null,
    field_type: m.fieldType ?? null,
    is_required: toBool(m.isRequired),
    is_form_visible: toBool(m.isFormVisible),
    display_order: toInt(m.displayOrder),
    created_timestamp: toIso(m.createdTimestamp),
    updated_timestamp: toIso(m.updatedTimestamp),
    synced_at: now,
  }));
  return replaceAll("ac_deal_cf_meta", rows);
}

export async function syncDeals() {
  const now = new Date().toISOString();
  const raw = await fetchAllPaginated("/deals", "deals");
  const rows = raw.map((d) => ({
    id: String(d.id),
    title: d.title ?? null,
    value: toFloat(d.value) != null ? toFloat(d.value) / 100 : null,
    currency: d.currency ?? null,
    status: toInt(d.status),
    is_disabled: toBool(d.isDisabled),
    contact_id: d.contact ? String(d.contact) : null,
    organization_id: d.organization ? String(d.organization) : null,
    stage_id: d.stage ? String(d.stage) : null,
    pipeline_id: d.group ? String(d.group) : null,
    owner_id: d.owner ? String(d.owner) : null,
    created_timestamp: toIso(d.cdate),
    updated_timestamp: toIso(d.mdate),
    next_action_date: toIso(d.nextdate),
    next_contact_date: toIso(d.nextcontact),
    synced_at: now,
  }));
  return replaceAll("ac_deals", rows);
}

function normalizeFieldValue(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== "").join("||");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export async function syncDealCustomFieldsData() {
  const now = new Date().toISOString();
  const raw = await fetchAllPaginated("/dealCustomFieldData", "dealCustomFieldData");
  const rows = raw.map((cf) => ({
    id: String(cf.id),
    deal_id: cf.dealId ? String(cf.dealId) : null,
    custom_field_id: cf.customFieldId ? String(cf.customFieldId) : null,
    field_value: normalizeFieldValue(cf.fieldValue),
    created_timestamp: toIso(cf.createdTimestamp),
    updated_timestamp: toIso(cf.updatedTimestamp),
    synced_at: now,
  }));
  return replaceAll("ac_deal_cf_data", rows);
}
