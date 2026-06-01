import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import { parseDateRange, parseEmpsFilter } from "../lib/parseFilters.js";
import {
  buildMetaOverviewQuery,
  buildMetaByEmpQuery,
  buildTrackingCoverageQuery,
} from "../queries/metaOverview.js";

export const metaOverviewRouter = Router();

/**
 * Visão "Meta puro" — campanhas com gasto/impressões/cliques/CTR/CPC/CPM
 * sem depender de tracking AC.
 */
metaOverviewRouter.get("/api/meta/overview", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("meta_overview", { from, to, emps });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildMetaOverviewQuery({ from, to, emps });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * Resumo Meta por empreendimento (raw, sem cross com CRM).
 */
metaOverviewRouter.get("/api/meta/by-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("meta_by_emp", { from, to, emps });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildMetaByEmpQuery({ from, to, emps });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * Coverage do tracking AC — mostra quais empreendimentos têm
 * criativo_deal/campanha_deal preenchidos. Ajuda a explicar gaps no cross.
 */
metaOverviewRouter.get("/api/meta/tracking-coverage", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("tracking_cov", { from, to, emps });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildTrackingCoverageQuery({ from, to, emps });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});
