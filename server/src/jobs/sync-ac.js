import "dotenv/config";
import { fetchMe } from "../ac/client.js";
import {
  syncDealCustomFieldsMeta,
  syncDeals,
  syncDealCustomFieldsData,
  syncTags,
  syncContactTags,
} from "../ac/loaders.js";

async function step(name, fn) {
  const start = Date.now();
  try {
    const rows = await fn();
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "sync.step",
      step: name,
      rows,
      durationMs: Date.now() - start,
      status: "ok",
    }));
    return rows;
  } catch (err) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "sync.step",
      step: name,
      durationMs: Date.now() - start,
      status: "error",
      message: err.message,
    }));
    throw err;
  }
}

async function main() {
  const t0 = Date.now();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.start",
    job: "ac",
  }));

  const me = await step("validate-token", () => fetchMe());
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.token_ok",
    user: me.user?.username,
    email: me.user?.email,
  }));

  await step("deal_cf_meta", syncDealCustomFieldsMeta);
  await step("deals", syncDeals);
  await step("deal_cf_data", syncDealCustomFieldsData);
  await step("tags", syncTags);
  await step("contact_tags", syncContactTags);

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.complete",
    job: "ac",
    totalDurationMs: Date.now() - t0,
  }));
}

main().catch((err) => {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.fatal",
    message: err.message,
  }));
  process.exit(1);
});
