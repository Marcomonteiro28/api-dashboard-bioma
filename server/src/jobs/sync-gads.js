import "dotenv/config";
import { validateCredentials } from "../gads/client.js";
import {
  syncCustomers,
  syncCampaigns,
  syncAdGroups,
  syncAds,
  syncInsightsDaily,
} from "../gads/loaders.js";
import { applyGadsViews } from "../gads/views.js";

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
      statusCode: err.statusCode,
    }));
    throw err;
  }
}

async function main() {
  const t0 = Date.now();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.start",
    job: "gads",
  }));

  const customer = await step("validate-credentials", () => validateCredentials());
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.credentials_ok",
    customer_id: customer?.id,
    customer_name: customer?.descriptiveName,
  }));

  await step("customers", syncCustomers);
  await step("campaigns", syncCampaigns);
  await step("ad_groups", syncAdGroups);
  await step("ads", syncAds);
  await step("insights_daily", syncInsightsDaily);
  await step("apply_views", applyGadsViews);

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.complete",
    job: "gads",
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
