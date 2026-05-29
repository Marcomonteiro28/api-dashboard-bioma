import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import {
  parseDateRange,
  parseEmpsFilter,
  parseStatusFilter,
  parseSubOrigensFilter,
} from "../lib/parseFilters.js";
import { buildAttributionQuery, buildMetaSpendDailyQuery } from "../queries/attribution.js";

export const attributionRouter = Router();

attributionRouter.get("/api/attribution-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const subOrigens = parseSubOrigensFilter(req);
    const key = makeCacheKey("attrib", { from, to, emps, statuses, subOrigens });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildAttributionQuery({
        from,
        to,
        emps,
        statuses,
        subOrigens,
      });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});

attributionRouter.get("/api/meta/spend-daily", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("meta_spend_daily", { from, to, emps });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildMetaSpendDailyQuery({ from, to, emps });
      return runQuery(sql, params, types);
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
