import "dotenv/config";
import { fetchMe } from "../meta/client.js";
import {
  syncCampaigns,
  syncAdsets,
  syncAds,
  syncCreatives,
  syncAdImages,
  syncInsightsDaily,
} from "../meta/loaders.js";

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
      metaCode: err.metaCode,
    }));
    throw err;
  }
}

async function main() {
  const t0 = Date.now();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.start",
    job: "meta",
  }));

  const me = await step("validate-token", () => fetchMe());
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.token_ok",
    user: me.name,
    id: me.id,
  }));

  await step("campaigns", syncCampaigns);
  await step("adsets", syncAdsets);
  await step("ads", syncAds);
  await step("creatives", syncCreatives);
  await step("adimages", syncAdImages);
  await step("insights_daily", syncInsightsDaily);

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.complete",
    job: "meta",
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
