import { Router } from "express";
import { config } from "../config.js";
import { syncDealCustomFieldsMeta, syncDeals, syncDealCustomFieldsData } from "../ac/loaders.js";
import {
  syncCampaigns,
  syncAdsets,
  syncAds,
  syncCreatives,
  syncAdImages,
  syncInsightsDaily,
} from "../meta/loaders.js";
import { applyViews } from "../meta/views.js";

export const jobsRouter = Router();

/**
 * Auth dos endpoints /jobs/*:
 *   - Em producao (Cloud Run) o Cloud Scheduler invoca com header
 *     Authorization: Bearer <id-token-OIDC-do-service-account>.
 *     Cloud Run valida o OIDC automaticamente quando configurado com
 *     --no-allow-unauthenticated. Aqui apenas adicionamos um shared-
 *     secret defensivo extra via header X-Internal-Job-Token, caso
 *     queiramos restringir mais ainda quem dispara os syncs.
 *   - Em dev local, basta nao definir INTERNAL_JOB_TOKEN e os jobs
 *     ficam abertos (mesmo padrao do servidor local).
 */
function requireInternal(req, res, next) {
  const token = config.internalJobToken;
  if (!token) return next();
  const provided = req.header("x-internal-job-token");
  if (provided !== token) {
    return res.status(403).json({ error: "Acesso negado ao job interno" });
  }
  next();
}

async function runSteps(label, steps) {
  const results = [];
  const t0 = Date.now();
  for (const [stepName, fn] of steps) {
    const tStep = Date.now();
    try {
      const rows = await fn();
      results.push({ step: stepName, rows, status: "ok", ms: Date.now() - tStep });
    } catch (err) {
      results.push({ step: stepName, status: "error", message: err.message, ms: Date.now() - tStep });
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "job.error",
        job: label,
        step: stepName,
        message: err.message,
      }));
      throw err;
    }
  }
  return { job: label, totalMs: Date.now() - t0, steps: results };
}

jobsRouter.post("/jobs/sync-ac", requireInternal, async (_req, res, next) => {
  try {
    const summary = await runSteps("ac", [
      ["deal_cf_meta", syncDealCustomFieldsMeta],
      ["deals", syncDeals],
      ["deal_cf_data", syncDealCustomFieldsData],
    ]);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/jobs/sync-meta", requireInternal, async (_req, res, next) => {
  try {
    const summary = await runSteps("meta", [
      ["campaigns", syncCampaigns],
      ["adsets", syncAdsets],
      ["ads", syncAds],
      ["creatives", syncCreatives],
      ["adimages", syncAdImages],
      ["insights_daily", syncInsightsDaily],
    ]);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/jobs/apply-views", requireInternal, async (_req, res, next) => {
  try {
    await applyViews();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/jobs/sync-all", requireInternal, async (_req, res, next) => {
  try {
    const ac = await runSteps("ac", [
      ["deal_cf_meta", syncDealCustomFieldsMeta],
      ["deals", syncDeals],
      ["deal_cf_data", syncDealCustomFieldsData],
    ]);
    const meta = await runSteps("meta", [
      ["campaigns", syncCampaigns],
      ["adsets", syncAdsets],
      ["ads", syncAds],
      ["creatives", syncCreatives],
      ["adimages", syncAdImages],
      ["insights_daily", syncInsightsDaily],
    ]);
    await applyViews();
    res.json({ ac, meta, views: { ok: true } });
  } catch (err) {
    next(err);
  }
});
