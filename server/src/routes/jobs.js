import { Router } from "express";
import { config } from "../config.js";
import {
  syncDealCustomFieldsMeta,
  syncDeals,
  syncDealCustomFieldsData,
  syncTags,
  syncContactTags,
  syncContacts,
  syncContactCustomFieldsMeta,
  syncContactCustomFieldsData,
  syncLists,
  syncContactLists,
} from "../ac/loaders.js";
import {
  syncCampaigns as syncMetaCampaigns,
  syncAdsets,
  syncAds as syncMetaAds,
  syncCreatives,
  syncAdImages,
  syncInsightsDaily as syncMetaInsights,
} from "../meta/loaders.js";
import {
  syncCustomers as syncGadsCustomers,
  syncCampaigns as syncGadsCampaigns,
  syncAdGroups as syncGadsAdGroups,
  syncAds as syncGadsAds,
  syncInsightsDaily as syncGadsInsights,
} from "../gads/loaders.js";
import { applyViews } from "../meta/views.js";
import { applyGadsViews } from "../gads/views.js";

export const jobsRouter = Router();

/**
 * Auth dos endpoints /jobs/*:
 *   - Em producao (Cloud Run) o Cloud Scheduler invoca com header
 *     Authorization: Bearer <id-token-OIDC-do-service-account>.
 *     Cloud Run valida o OIDC automaticamente quando configurado com
 *     --no-allow-unauthenticated. Aqui adicionamos um shared-secret
 *     defensivo via header X-Internal-Job-Token, caso queiramos
 *     restringir mais ainda quem dispara os syncs.
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
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "job.step",
        job: label,
        step: stepName,
        rows,
        ms: Date.now() - tStep,
      }));
    } catch (err) {
      results.push({ step: stepName, status: "error", message: err.message, ms: Date.now() - tStep });
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "job.error",
        job: label,
        step: stepName,
        message: err.message,
      }));
      // Em sync-all queremos continuar mesmo se uma fonte falhar
      if (label === "sync-all") continue;
      throw err;
    }
  }
  return { job: label, totalMs: Date.now() - t0, steps: results };
}

const AC_STEPS = [
  ["deal_cf_meta", syncDealCustomFieldsMeta],
  ["deals", syncDeals],
  ["deal_cf_data", syncDealCustomFieldsData],
  ["tags", syncTags],
  ["contact_tags", syncContactTags],
  ["contacts", syncContacts],
  ["contact_cf_meta", syncContactCustomFieldsMeta],
  ["contact_cf_data", syncContactCustomFieldsData],
  ["lists", syncLists],
  ["contact_lists", syncContactLists],
];

const META_STEPS = [
  ["campaigns", syncMetaCampaigns],
  ["adsets", syncAdsets],
  ["ads", syncMetaAds],
  ["creatives", syncCreatives],
  ["adimages", syncAdImages],
  ["insights_daily", syncMetaInsights],
];

const GADS_STEPS = [
  ["customers", syncGadsCustomers],
  ["campaigns", syncGadsCampaigns],
  ["ad_groups", syncGadsAdGroups],
  ["ads", syncGadsAds],
  ["insights_daily", syncGadsInsights],
];

jobsRouter.post("/jobs/sync-ac", requireInternal, async (_req, res, next) => {
  try {
    res.json(await runSteps("ac", AC_STEPS));
  } catch (err) { next(err); }
});

jobsRouter.post("/jobs/sync-meta", requireInternal, async (_req, res, next) => {
  try {
    res.json(await runSteps("meta", META_STEPS));
  } catch (err) { next(err); }
});

jobsRouter.post("/jobs/sync-gads", requireInternal, async (_req, res, next) => {
  try {
    res.json(await runSteps("gads", GADS_STEPS));
  } catch (err) { next(err); }
});

jobsRouter.post("/jobs/apply-views", requireInternal, async (_req, res, next) => {
  try {
    await applyViews();
    await applyGadsViews();
    res.json({ ok: true, applied: ["meta_views", "gads_views"] });
  } catch (err) { next(err); }
});

/**
 * Endpoint master pra Cloud Scheduler invocar 1x por dia (9h Brasilia).
 * Roda tudo em sequencia: AC -> Meta -> Google Ads -> apply views.
 * Resiliente: erro em uma fonte nao para as outras (continue no runSteps).
 */
jobsRouter.post("/jobs/sync-all", requireInternal, async (_req, res, next) => {
  try {
    const t0 = Date.now();
    const ac = await runSteps("sync-all", AC_STEPS);
    const meta = await runSteps("sync-all", META_STEPS);
    const gads = await runSteps("sync-all", GADS_STEPS);
    let viewsOk = true;
    let viewsErr = null;
    try {
      await applyViews();
      await applyGadsViews();
    } catch (err) {
      viewsOk = false;
      viewsErr = err.message;
    }
    res.json({
      ac,
      meta,
      gads,
      views: { ok: viewsOk, error: viewsErr },
      totalMs: Date.now() - t0,
    });
  } catch (err) { next(err); }
});
