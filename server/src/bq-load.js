import { Readable } from "node:stream";
import { config } from "./config.js";

export async function replaceTableLoad(table, schema, rows) {
  if (rows.length === 0) {
    const { BigQuery } = await import("@google-cloud/bigquery");
    const bq = new BigQuery({ projectId: config.project });
    await bq.query({
      query: `CREATE OR REPLACE TABLE \`${table.bigQuery.projectId}.${table.dataset.id}.${table.id}\` (${schema.map((c) => `${c.name} ${c.type}${c.mode === "REQUIRED" ? " NOT NULL" : ""}`).join(", ")})`,
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
        reject(new Error(`Load em ${table.id} falhou: ${errors[0]?.message || "erro desconhecido"}`));
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
    table: table.id,
    rows: rows.length,
  }));
  return rows.length;
}

export async function appendDateWindow(table, schema, rows, dateColumn, since, until) {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: config.project });
  const ds = table.dataset.id;
  await bq.query({
    query: `CREATE TABLE IF NOT EXISTS \`${config.project}.${ds}.${table.id}\` (${schema.map((c) => `${c.name} ${c.type}${c.mode === "REQUIRED" ? " NOT NULL" : ""}`).join(", ")})`,
    location: config.location,
  });
  await bq.query({
    query: `DELETE FROM \`${config.project}.${ds}.${table.id}\` WHERE ${dateColumn} BETWEEN @since AND @until`,
    params: { since, until },
    location: config.location,
  });
  if (rows.length === 0) return 0;
  const ndjson = rows.map((r) => JSON.stringify(r)).join("\n");
  const writeStream = table.createWriteStream({
    sourceFormat: "NEWLINE_DELIMITED_JSON",
    writeDisposition: "WRITE_APPEND",
    createDisposition: "CREATE_IF_NEEDED",
    schema: { fields: schema },
    location: config.location,
  });
  await new Promise((resolve, reject) => {
    writeStream.on("complete", (job) => {
      const errors = job?.status?.errors;
      if (errors && errors.length) reject(new Error(`Append em ${table.id} falhou: ${errors[0]?.message || "?"}`));
      else resolve(job);
    });
    writeStream.on("error", reject);
    Readable.from(ndjson).pipe(writeStream);
  });
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "bq.appended",
    table: table.id,
    rows: rows.length,
    window: `${since}..${until}`,
  }));
  return rows.length;
}
